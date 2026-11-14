/**
 * Tips, and who they belong to.
 *
 * Eric's answer decides what these tests are for: the tip goes to the crew who
 * did the job, which makes it their money passing through the business. So the
 * behaviours pinned here are all about not losing it:
 *
 *   - a tip whose crew we cannot name is UNATTRIBUTED, never company income
 *   - the same person recorded twice is one person, not a double share
 *   - a split adds back up to the whole, to the cent
 *   - an absurd tip is refused, never quietly charged as a different number
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readTipAmount, crewFromJob, tipRecord, splitTip, MAX_TIP,
} from '../supabase/functions/server/tips.ts';

/* ── what we will take ───────────────────────────────────────────────────── */

test('a sensible tip is taken, rounded to the cent', () => {
  assert.equal(readTipAmount(20).amount, 20);
  assert.equal(readTipAmount('15.5').amount, 15.5);
  assert.equal(readTipAmount(10.129).amount, 10.13, 'Stripe is charged in cents');
});

test('no tip is not an error — it is the usual case', () => {
  for (const none of [0, '', null, undefined, 'abc', -5]) {
    const read = readTipAmount(none);
    assert.equal(read.amount, 0);
    assert.equal(read.error, undefined);
  }
});

test('an absurd tip is refused, not clamped to the ceiling', () => {
  const read = readTipAmount(MAX_TIP + 1);
  assert.equal(read.amount, 0, 'charging a different number than somebody chose is worse than refusing');
  assert.ok(read.error?.includes('call us'));
});

/* ── who it is for ───────────────────────────────────────────────────────── */

test('the crew comes off the fields the job already uses to decide who may read it', () => {
  const crew = crewFromJob({ assignedToEmail: 'Dan@bp.com' });
  assert.equal(crew.length, 1);
  assert.equal(crew[0].email, 'dan@bp.com', 'emails are matched lowercase');
});

test('a scheduler who set a list gets a list', () => {
  const crew = crewFromJob({
    schedule: { assignedTo: [{ name: 'Dan', email: 'dan@bp.com' }, { name: 'Mike', email: 'mike@bp.com' }] },
  });
  assert.equal(crew.length, 2);
  assert.deepEqual(crew.map((c) => c.name), ['Dan', 'Mike']);
});

test('a scheduler who set one name gets one person, email or not', () => {
  assert.deepEqual(crewFromJob({ schedule: { assignedTo: 'Dan Reilly' } }), [{ name: 'Dan Reilly', email: '' }]);
  assert.deepEqual(crewFromJob({ schedule: { assignedTo: 'dan@bp.com' } }), [{ name: 'dan@bp.com', email: 'dan@bp.com' }]);
});

test('the same person recorded twice is one person, not a double share', () => {
  const crew = crewFromJob({
    assignedToEmail: 'dan@bp.com',
    assigned_technician_email: 'DAN@bp.com',
    schedule: { assignedTo: [{ name: 'Dan', email: 'dan@bp.com' }] },
  });
  assert.equal(crew.length, 1);
  assert.equal(crew[0].name, 'Dan', 'the better name wins over the email');
});

test('a job with nobody on it names nobody — it does not invent a crew', () => {
  assert.deepEqual(crewFromJob({}), []);
  assert.deepEqual(crewFromJob(null), []);
  assert.deepEqual(crewFromJob({ schedule: { assignedTo: '   ' } }), []);
});

/* ── the record ──────────────────────────────────────────────────────────── */

test('a tip with no crew is unattributed and owed — never company income', () => {
  const rec = tipRecord({
    id: 'tip_1', amount: 40, customerEmail: 'Jane@example.com', paymentId: 'pay_1',
    crew: [], now: '2026-11-14T12:00:00.000Z',
  });
  assert.equal(rec.unattributed, true, 'a tip we cannot place must be visible as unplaced');
  assert.equal(rec.status, 'owed');
  assert.equal(rec.paidOutAt, null);
  assert.equal(rec.customerEmail, 'jane@example.com');
});

test('a tip with a crew is attributed and still owed until somebody pays it out', () => {
  const rec = tipRecord({
    id: 'tip_2', amount: 60, customerEmail: 'jane@example.com', paymentId: 'pay_2',
    workRequestId: 'wr_9', crew: [{ name: 'Dan', email: 'dan@bp.com' }], now: '2026-11-14T12:00:00.000Z',
  });
  assert.equal(rec.unattributed, false);
  assert.equal(rec.status, 'owed');
  assert.equal(rec.workRequestId, 'wr_9');
});

/* ── the split ───────────────────────────────────────────────────────────── */

test('an even split is even', () => {
  const parts = splitTip(60, [{ name: 'A', email: '' }, { name: 'B', email: '' }]);
  assert.deepEqual(parts.map((p) => p.amount), [30, 30]);
});

test('an uneven split still adds back up to the whole, to the cent', () => {
  for (const [amount, heads] of [[10, 3], [20, 3], [0.05, 3], [99.99, 7]] as Array<[number, number]>) {
    const crew = Array.from({ length: heads }, (_, i) => ({ name: `P${i}`, email: '' }));
    const parts = splitTip(amount, crew);
    const total = parts.reduce((s, p) => s + p.amount, 0);
    assert.equal(Math.round(total * 100), Math.round(amount * 100), `${amount} across ${heads} lost money`);
  }
});

test('ten dollars across three is 3.34, 3.33, 3.33 — the odd cent goes somewhere', () => {
  const crew = [{ name: 'A', email: '' }, { name: 'B', email: '' }, { name: 'C', email: '' }];
  assert.deepEqual(splitTip(10, crew).map((p) => p.amount), [3.34, 3.33, 3.33]);
});

test('nobody to split between means no split, not a crash', () => {
  assert.deepEqual(splitTip(50, []), []);
  assert.deepEqual(splitTip(0, [{ name: 'A', email: '' }]), []);
});
