/**
 * Which jobs the board should be shouting about.
 *
 * The expensive failure here is not a missed flag, it is a wrong one: a rail
 * full of false alarms gets ignored, and then the real alarm is missed too. So
 * most of what is asserted below is what does NOT fire.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  attentionFor, attentionCounts, ATTENTION_DAYS,
} from '../src/app/lib/pipelineAttention.ts';

const NOW = new Date('2026-09-26T12:00:00.000Z');
const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(NOW.getTime() - days * DAY).toISOString();
const ids = (item: any) => attentionFor(item, NOW).map((f) => f.id);

/** A job with an owner and nothing wrong, as a base to break one thing at a time. */
const healthy = {
  stage: 'quote-draft',
  assignedTo: 'Carlos',
  createdDate: ago(1),
};

test('a job raised yesterday, owned, is not flagged', () => {
  assert.deepEqual(ids(healthy), []);
});

test('the thresholds are the ones that were agreed', () => {
  assert.equal(ATTENTION_DAYS.unquoted, 2);
  assert.equal(ATTENTION_DAYS.draftNotSent, 3);
  assert.equal(ATTENTION_DAYS.sentNoAnswer, 7);
  assert.equal(ATTENTION_DAYS.approvedNoContract, 3);
  assert.equal(ATTENTION_DAYS.signedNotInvoiced, 2);
});

/* ── ownership ───────────────────────────────────────────────────────────── */

test('a job with nobody assigned is flagged immediately', () => {
  assert.ok(ids({ ...healthy, assignedTo: '' }).includes('unowned'));
  assert.ok(ids({ ...healthy, assignedTo: '   ' }).includes('unowned'), 'whitespace is not an owner');
  assert.ok(ids({ ...healthy, assignedTo: undefined }).includes('unowned'));
});

/* ── not quoted ──────────────────────────────────────────────────────────── */

test('an unquoted job is left alone for two days, then flagged', () => {
  assert.equal(ids({ ...healthy, createdDate: ago(1) }).includes('unquoted'), false);
  assert.ok(ids({ ...healthy, createdDate: ago(2) }).includes('unquoted'));
});

test('an unquoted job becomes urgent once it is properly old', () => {
  const [flag] = attentionFor({ ...healthy, createdDate: ago(30) }, NOW).filter((f) => f.id === 'unquoted');
  assert.equal(flag.severity, 'urgent');
  assert.match(flag.reason, /30 days/);
});

test('a job that HAS a quote is not also "not quoted"', () => {
  const item = { ...healthy, createdDate: ago(30), quote: { generatedAt: ago(1) } };
  assert.equal(ids(item).includes('unquoted'), false);
});

/* ── quoted, not sent ────────────────────────────────────────────────────── */

test('a quote sits for three days before it is chased', () => {
  const two = { ...healthy, quote: { generatedAt: ago(2) } };
  const three = { ...healthy, quote: { generatedAt: ago(3) } };
  assert.equal(ids(two).includes('not-sent'), false);
  assert.ok(ids(three).includes('not-sent'));
});

test('a quote with no date of its own ages from when the job was raised', () => {
  const item = { ...healthy, createdDate: ago(9), quote: {} };
  assert.ok(ids(item).includes('not-sent'));
});

test('a sent quote is never "not sent"', () => {
  const item = { ...healthy, quote: { generatedAt: ago(30), sentAt: ago(1) } };
  assert.equal(ids(item).includes('not-sent'), false);
});

/* ── sent, no answer ─────────────────────────────────────────────────────── */

test('a sent quote gets a week before it counts as unanswered', () => {
  const six = { ...healthy, stage: 'quote-sent', quote: { sentAt: ago(6) } };
  const seven = { ...healthy, stage: 'quote-sent', quote: { sentAt: ago(7) } };
  assert.equal(ids(six).includes('no-answer'), false);
  assert.ok(ids(seven).includes('no-answer'));
});

test('an answered quote is not chased, approved or rejected', () => {
  const approved = { ...healthy, stage: 'quote-sent', quote: { sentAt: ago(40), approvedAt: ago(1) } };
  const rejected = { ...healthy, stage: 'quote-sent', quote: { sentAt: ago(40), rejectedAt: ago(1) } };
  assert.equal(ids(approved).includes('no-answer'), false);
  assert.equal(ids(rejected).includes('no-answer'), false);
});

test('whether the customer opened it changes what the card says', () => {
  const seen = attentionFor(
    { ...healthy, stage: 'quote-sent', quote: { sentAt: ago(10), customerViewedAt: ago(9) } }, NOW,
  ).find((f) => f.id === 'no-answer');
  const unseen = attentionFor(
    { ...healthy, stage: 'quote-sent', quote: { sentAt: ago(10) } }, NOW,
  ).find((f) => f.id === 'no-answer');
  assert.match(seen!.reason, /Seen by the customer/);
  assert.match(unseen!.reason, /not opened/);
});

/* ── approved, no contract ───────────────────────────────────────────────── */

test('an approved quote wants a contract within three days', () => {
  const base = { ...healthy, stage: 'quote-approved' };
  assert.equal(ids({ ...base, quote: { approvedAt: ago(2) } }).includes('no-contract'), false);
  assert.ok(ids({ ...base, quote: { approvedAt: ago(3) } }).includes('no-contract'));
});

test('once a contract exists the flag stops', () => {
  const item = { ...healthy, stage: 'quote-approved', quote: { approvedAt: ago(30) }, contract: { id: 'c1' } };
  assert.equal(ids(item).includes('no-contract'), false);
});

/* ── signed, not invoiced ────────────────────────────────────────────────── */

test('a signed contract wants an invoice within two days', () => {
  const base = { ...healthy, stage: 'contract' };
  assert.equal(ids({ ...base, contract: { signedDate: ago(1) } }).includes('not-invoiced'), false);
  assert.ok(ids({ ...base, contract: { signedDate: ago(2) } }).includes('not-invoiced'));
});

test('a job already at invoice or payment is not chased for invoicing', () => {
  for (const stage of ['invoice', 'payment']) {
    const item = { ...healthy, stage, contract: { signedDate: ago(60) } };
    assert.equal(ids(item).includes('not-invoiced'), false, `${stage} should not be chased`);
  }
});

test('an unsigned contract is not chased for invoicing', () => {
  const item = { ...healthy, stage: 'contract', contract: { status: 'sent' } };
  assert.equal(ids(item).includes('not-invoiced'), false);
});

/* ── money ───────────────────────────────────────────────────────────────── */

test('an invoice past its due date is overdue', () => {
  const item = { ...healthy, stage: 'invoice', invoice: { dueDate: ago(5) } };
  const flag = attentionFor(item, NOW).find((f) => f.id === 'overdue');
  assert.ok(flag);
  assert.equal(flag!.severity, 'urgent');
  assert.match(flag!.reason, /5 days past due/);
});

test('an invoice that is paid, or not yet due, is not overdue', () => {
  const paid = { ...healthy, stage: 'invoice', invoice: { dueDate: ago(5), status: 'paid' } };
  const paidAt = { ...healthy, stage: 'invoice', invoice: { dueDate: ago(5), paidAt: ago(4) } };
  const future = { ...healthy, stage: 'invoice', invoice: { dueDate: ago(-5) } };
  assert.equal(ids(paid).includes('overdue'), false);
  assert.equal(ids(paidAt).includes('overdue'), false);
  assert.equal(ids(future).includes('overdue'), false);
});

/* ── refusing to guess ───────────────────────────────────────────────────── */

test('a missing or unreadable date produces no flag rather than a false one', () => {
  assert.deepEqual(ids({ stage: 'quote-draft', assignedTo: 'Carlos' }), [],
    'no createdDate means we cannot say it is old');
  assert.deepEqual(ids({ stage: 'quote-draft', assignedTo: 'Carlos', createdDate: 'not a date' }), []);
  assert.deepEqual(attentionFor(null, NOW), []);
  assert.deepEqual(attentionFor(undefined, NOW), []);
});

test('the worst problem is listed first', () => {
  const item = { stage: 'quote-draft', assignedTo: '', quote: { generatedAt: ago(10) } };
  const [first] = attentionFor(item, NOW);
  assert.equal(first.severity, 'urgent', 'an unsent quote outranks an unassigned owner');
});

/* ── the rail ────────────────────────────────────────────────────────────── */

test('the rail counts each flag across the board, worst first', () => {
  const counts = attentionCounts([
    { stage: 'quote-draft', assignedTo: '', createdDate: ago(10) },
    { stage: 'quote-draft', assignedTo: '', createdDate: ago(10) },
    { stage: 'invoice', assignedTo: 'Carlos', invoice: { dueDate: ago(2) } },
  ], NOW);
  const byId = Object.fromEntries(counts.map((c) => [c.id, c.count]));
  assert.equal(byId.unowned, 2);
  assert.equal(byId.unquoted, 2);
  assert.equal(byId.overdue, 1);
  assert.equal(counts[0].severity, 'urgent', 'urgent flags lead the rail');
});

test('a clean board produces an empty rail', () => {
  assert.deepEqual(attentionCounts([healthy], NOW), []);
  assert.deepEqual(attentionCounts([], NOW), []);
});
