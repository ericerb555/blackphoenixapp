/**
 * Refunding an invoice or a deposit.
 *
 * This moves real money back to a real card, so what is pinned here is the
 * arithmetic nobody should have to re-derive under pressure:
 *
 *   - a partial refund never silently takes money off the crew's gratuity
 *   - nothing can be refunded twice, and the cap is what was CAPTURED
 *   - asking for too much is refused, never quietly clamped
 *   - a refunded tip does not make a settled invoice look underpaid
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { refundableOf, planRefund, invoiceAfterRefund } from '../supabase/functions/server/refundMath.ts';

const paid = (over: Record<string, any> = {}) => ({
  status: 'paid', amount: 200, tip: 20, ...over,
});

/* ── what is left ────────────────────────────────────────────────────────── */

test('a fresh payment has all of it refundable, counted separately', () => {
  const r = refundableOf(paid());
  assert.equal(r.principal, 200);
  assert.equal(r.tip, 20);
  assert.equal(r.total, 220);
});

test('past refunds come off what remains', () => {
  const r = refundableOf(paid({ refunds: [{ principal: 50 }, { principal: 25, tip: 5 }] }));
  assert.equal(r.principal, 125);
  assert.equal(r.tip, 15);
  assert.equal(r.refundedPrincipal, 75);
  assert.equal(r.refundedTip, 5);
});

test('a payment with no tip is simply a principal', () => {
  const r = refundableOf({ status: 'paid', amount: 99.5 });
  assert.equal(r.tip, 0);
  assert.equal(r.total, 99.5);
});

/* ── the tip is not the company's money ──────────────────────────────────── */

test('a partial refund comes out of the job, never the gratuity', () => {
  const plan = planRefund(paid(), { amount: 50 });
  assert.equal(plan.principal, 50);
  assert.equal(plan.tip, 0, 'a partial refund took money off what the crew is owed');
});

test('refunding more than the job amount is refused unless the tip is named', () => {
  const refused = planRefund(paid(), { amount: 210 });
  assert.ok(refused.error, 'it should refuse rather than reach into the tip');
  assert.match(refused.error!, /gratuity is held separately/);

  const allowed = planRefund(paid(), { amount: 210, includeTip: true });
  assert.equal(allowed.principal, 200);
  assert.equal(allowed.tip, 10, 'the tip is reached only after the principal is exhausted');
});

test('refunding everything takes the tip with it', () => {
  const plan = planRefund(paid());
  assert.equal(plan.principal, 200);
  assert.equal(plan.tip, 20, 'reversing a payment in full must not leave the gratuity charged');
  assert.equal(plan.total, 220);
});

/* ── nothing twice, and nothing beyond what was captured ─────────────────── */

test('a deposit can only give back the deposit', () => {
  // 30% of a 1,000 job was captured. The invoice total is irrelevant here.
  const plan = planRefund({ status: 'paid', amount: 300 }, { amount: 1000 });
  assert.ok(plan.error);
  assert.match(plan.error!, /more than the refundable job amount \(300\.00\)/);
});

test('an already fully refunded payment refuses politely', () => {
  const plan = planRefund(paid({ refunds: [{ principal: 200, tip: 20 }] }));
  assert.ok(plan.error);
  assert.match(plan.error!, /already been fully refunded/);
});

test('only a captured payment can be refunded', () => {
  for (const status of ['pending_confirmation', 'processing', 'failed', '']) {
    const plan = planRefund(paid({ status }));
    assert.ok(plan.error, `status "${status}" should not be refundable`);
  }
});

test('too much, and nonsense, are both refused rather than clamped', () => {
  assert.ok(planRefund(paid(), { amount: -5 }).error);
  assert.ok(planRefund(paid(), { amount: 9999, includeTip: true }).error);
  // Refused, not silently reduced to what was available.
  assert.equal(planRefund(paid(), { amount: 9999, includeTip: true }).total, 0);
});

/* ── what it does to the invoice ─────────────────────────────────────────── */

test('a refunded job amount reopens the balance and the status', () => {
  const after = invoiceAfterRefund({ total_amount: 200, paid_amount: 200, status: 'paid' }, 50);
  assert.equal(after!.paid_amount, 150);
  assert.equal(after!.balance_due, 50);
  assert.equal(after!.status, 'partial');
  assert.equal(after!.paidAt, null, 'a reopened invoice must not still read as settled on a date');
});

test('a full refund puts the invoice back to sent, not draft', () => {
  const after = invoiceAfterRefund({ total_amount: 200, paid_amount: 200, status: 'paid' }, 200);
  assert.equal(after!.paid_amount, 0);
  assert.equal(after!.balance_due, 200);
  assert.equal(after!.status, 'sent', 'it was issued and the customer saw it');
});

test('both spellings of every field are written', () => {
  const after = invoiceAfterRefund({ total_amount: 100, paid_amount: 100 }, 40)!;
  assert.equal(after.paid_amount, after.paidAmount);
  assert.equal(after.balance_due, after.balanceDue);
});

test('a refunded tip does not move the invoice at all', () => {
  // The caller passes only the principal. A tip-only refund passes zero.
  assert.equal(invoiceAfterRefund({ total_amount: 200, paid_amount: 200 }, 0), null);
});

test('no invoice, or a zero refund, changes nothing', () => {
  assert.equal(invoiceAfterRefund(null, 50), null);
  assert.equal(invoiceAfterRefund(undefined, 50), null);
});

test('a deposit refund leaves the rest of the invoice still owed', () => {
  const after = invoiceAfterRefund({ total_amount: 1000, paid_amount: 300, status: 'partial' }, 300)!;
  assert.equal(after.paid_amount, 0);
  assert.equal(after.balance_due, 1000);
  assert.equal(after.status, 'sent');
});
