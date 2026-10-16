/**
 * The chargeback clock, and what each reason code actually calls for.
 *
 * WHY THESE EXIST
 *
 * A dispute not answered inside its window is lost by default, however good the
 * evidence was. So the rules worth pinning are the ones that decide whether
 * somebody is told in time:
 *
 *   dueState           seconds vs milliseconds, and "no deadline" vs "plenty
 *                      of time", which must never read the same
 *   readDisputeEvent   never throws on a payload from a card network, and never
 *                      invents a company
 *   canMove            a dispute cannot reach `won` without being submitted
 *
 * The seconds/milliseconds one is not hypothetical: Stripe sends `due_by` in
 * SECONDS. Reading it as milliseconds puts every deadline in 1970 and makes
 * every dispute look overdue, which looks like a crisis rather than a bug.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readDisputeEvent, dueState, evidenceFor, isOpen, nextStates, canMove,
} from '../supabase/functions/server/disputes.ts';

const NOW = Date.parse('2026-10-16T12:00:00Z');
const inDays = (n: number) => Math.floor((NOW + n * 86_400_000) / 1000);

const stripeDispute = (over: Record<string, any> = {}) => ({
  id: 'dp_1',
  charge: 'ch_1',
  payment_intent: 'pi_1',
  amount: 48000,
  currency: 'USD',
  reason: 'product_not_received',
  status: 'needs_response',
  livemode: true,
  evidence_details: { due_by: inDays(10), submission_count: 0 },
  ...over,
});

/* ── the clock ──────────────────────────────────────────────────────────── */

test('due_by is read as SECONDS, not milliseconds', () => {
  // The whole reason this is pinned: a milliseconds reading dates every
  // deadline to 1970 and reports every dispute overdue.
  const record = readDisputeEvent(stripeDispute(), { companyId: 'bpb-8544' });
  assert.equal(record?.evidenceDueBy, new Date(inDays(10) * 1000).toISOString());
  assert.equal(dueState(record!.evidenceDueBy, NOW).urgency, 'ok');
});

test('two days left is critical, not soon', () => {
  // Deliberately pessimistic about the last stretch: assembling evidence needs
  // a person to find photographs and decide which argument to make.
  assert.equal(dueState(new Date(NOW + 2 * 86_400_000).toISOString(), NOW).urgency, 'critical');
  assert.equal(dueState(new Date(NOW + 4 * 86_400_000).toISOString(), NOW).urgency, 'soon');
  assert.equal(dueState(new Date(NOW + 9 * 86_400_000).toISOString(), NOW).urgency, 'ok');
});

test('due today is critical and says so', () => {
  const state = dueState(new Date(NOW + 3 * 3_600_000).toISOString(), NOW);
  assert.equal(state.urgency, 'critical');
  assert.match(state.why, /Due today/);
});

test('past the window is overdue, with a negative day count', () => {
  const state = dueState(new Date(NOW - 86_400_000).toISOString(), NOW);
  assert.equal(state.urgency, 'overdue');
  assert.ok(state.daysLeft !== null && state.daysLeft < 0);
});

test('no deadline is "none", which must not read as time in hand', () => {
  // A won, lost or enquiry-stage dispute needs no response. Reporting that as
  // `ok` would put it in a queue looking like something with days to spare.
  const state = dueState(null, NOW);
  assert.equal(state.urgency, 'none');
  assert.equal(state.daysLeft, null);
  assert.notEqual(state.urgency, 'ok');
});

test('an unreadable deadline is treated as critical, not absent', () => {
  // The safe direction: treating it as absent is how a real deadline is missed.
  const state = dueState('not a date', NOW);
  assert.equal(state.urgency, 'critical');
  assert.match(state.why, /could not be read/);
});

/* ── reading what a card network sent ───────────────────────────────────── */

test('a dispute with no id is refused rather than stored keyless', () => {
  assert.equal(readDisputeEvent({}, { companyId: 'x' }), null);
  assert.equal(readDisputeEvent(null, { companyId: 'x' }), null);
});

test('a payload missing almost everything still produces a record', () => {
  // A webhook that throws loses the event, and Stripe's retries run out while
  // the clock does not stop.
  const record = readDisputeEvent({ id: 'dp_sparse' }, { companyId: 'bpb-8544' });
  assert.equal(record?.id, 'dp_sparse');
  assert.equal(record?.amountMinor, 0);
  assert.equal(record?.currency, 'usd');
  assert.equal(record?.reason, 'general');
  assert.equal(record?.evidenceDueBy, null);
});

test('currency is stored lowercase, amount stays in minor units', () => {
  const record = readDisputeEvent(stripeDispute(), { companyId: 'bpb-8544' });
  assert.equal(record?.currency, 'usd');
  // Never converted in storage: 48000 is $480.00 and the conversion belongs
  // where it is displayed, once.
  assert.equal(record?.amountMinor, 48000);
});

test('no company means `unattributed`, never a default', () => {
  // Filing a dispute under a default company would put one business's money and
  // one business's documents against another's chargeback.
  const record = readDisputeEvent(stripeDispute(), {});
  assert.equal(record?.companyId, null);
  assert.equal(record?.state, 'unattributed');
});

test('an attributed dispute starts at received', () => {
  const record = readDisputeEvent(stripeDispute(), { companyId: 'bpb-8544' });
  assert.equal(record?.companyId, 'bpb-8544');
  assert.equal(record?.state, 'received');
});

test('a blank company id is treated as no company', () => {
  assert.equal(readDisputeEvent(stripeDispute(), { companyId: '   ' })?.state, 'unattributed');
});

test('which secret verified the delivery is recorded', () => {
  // It is how the company was attributed, so it is the audit trail for that
  // attribution being right.
  const record = readDisputeEvent(stripeDispute(), {
    companyId: 'bpb-8544',
    verifiedBy: 'STRIPE_WEBHOOK_SECRET_SERVICES',
  });
  assert.equal(record?.verifiedBy, 'STRIPE_WEBHOOK_SECRET_SERVICES');
});

test('livemode false is preserved, so test deliveries are distinguishable', () => {
  assert.equal(readDisputeEvent(stripeDispute({ livemode: false }), { companyId: 'x' })?.liveMode, false);
  // Absent means live — the safer reading for money.
  assert.equal(readDisputeEvent({ id: 'dp_x' }, { companyId: 'x' })?.liveMode, true);
});

/* ── the argument each reason turns on ──────────────────────────────────── */

test('each reason asks for the evidence that actually answers it', () => {
  assert.match(evidenceFor('product_not_received').wants.join(' '), /delivery|completion/i);
  assert.match(evidenceFor('product_unacceptable').wants.join(' '), /scope|signed/i);
  assert.match(evidenceFor('unrecognized').wants.join(' '), /statement|receipt/i);
  assert.match(evidenceFor('duplicate').wants.join(' '), /both receipts/i);
  assert.match(evidenceFor('subscription_canceled').wants.join(' '), /cancellation/i);
  assert.match(evidenceFor('credit_not_processed').wants.join(' '), /refund/i);
});

test('not-received and not-as-described ask for different things', () => {
  // The point of the whole function. Submitting a delivery receipt against a
  // not-as-described dispute is a lost dispute with paperwork attached.
  const received = evidenceFor('product_not_received').wants.join(' ');
  const unacceptable = evidenceFor('product_unacceptable').wants.join(' ');
  assert.notEqual(received, unacceptable);
  assert.match(received, /tracking|delivery/i);
  assert.match(unacceptable, /scope/i);
});

test('an unknown reason still gets an ask, and admits it is generic', () => {
  const ask = evidenceFor('some_new_code_stripe_added');
  assert.ok(ask.wants.length > 0);
  assert.match(ask.argument, /do not have a specific argument|Read it in Stripe/i);
});

test('every reason has a non-empty argument and at least two asks', () => {
  for (const reason of [
    'product_not_received', 'product_unacceptable', 'unrecognized', 'fraudulent',
    'duplicate', 'subscription_canceled', 'credit_not_processed', 'general', '',
  ]) {
    const ask = evidenceFor(reason);
    assert.ok(ask.argument.length > 10, `${reason} needs an argument`);
    assert.ok(ask.wants.length >= 2, `${reason} needs asks`);
  }
});

/* ── the state machine ──────────────────────────────────────────────────── */

test('a dispute cannot reach won without being submitted', () => {
  // How a queue starts lying about what has been done.
  assert.equal(canMove('received', 'won'), false);
  assert.equal(canMove('gathering', 'won'), false);
  assert.equal(canMove('drafted', 'won'), false);
  assert.equal(canMove('submitted', 'won'), true);
});

test('an unattributed dispute can only become attributed', () => {
  assert.deepEqual(nextStates('unattributed'), ['received']);
});

test('a draft can go back for more evidence', () => {
  assert.equal(canMove('drafted', 'gathering'), true);
});

test('terminal states are terminal', () => {
  for (const state of ['won', 'lost', 'closed'] as const) {
    assert.deepEqual(nextStates(state), []);
  }
});

test('open means ours to act on, and submitted is not', () => {
  assert.ok(isOpen('received'));
  assert.ok(isOpen('gathering'));
  assert.ok(isOpen('drafted'));
  assert.ok(isOpen('unattributed'));
  // Waiting on the network, not on us.
  assert.equal(isOpen('submitted'), false);
  assert.equal(isOpen('won'), false);
  assert.equal(isOpen('lost'), false);
});
