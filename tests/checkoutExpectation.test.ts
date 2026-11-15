/**
 * The gate between "Stripe says this was paid" and "this account now has it".
 *
 * These are written as the attacks and the accidents they exist to stop, not as
 * coverage of the branches: a completed-but-unpaid session, a session nobody
 * recorded, a cheap session pointed at an expensive tier, the right amount in
 * the wrong currency, and a test-mode event aimed at a live expectation.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  type CheckoutExpectation,
  expectationFrom,
  expectationKey,
  heldPaymentKey,
  invoicePriceIds,
  priceIdsFromParams,
  verifyRenewalPrices,
  verifySessionPayment,
} from '../supabase/functions/server/checkoutExpectation.ts';

const expectation = (over: Partial<CheckoutExpectation> = {}): CheckoutExpectation => ({
  sessionId: 'cs_live_1',
  kind: 'portal_plan',
  subject: 'pro',
  email: 'buyer@example.com',
  account: 'services',
  livemode: true,
  currency: 'usd',
  subtotalCents: 3900,
  totalCents: 3900,
  priceIds: ['price_tier_pro'],
  createdAt: '2026-11-15T00:00:00.000Z',
  ...over,
});

const session = (over: Record<string, unknown> = {}) => ({
  id: 'cs_live_1',
  object: 'checkout_session',
  livemode: true,
  status: 'complete',
  payment_status: 'paid',
  currency: 'usd',
  amount_subtotal: 3900,
  amount_total: 3900,
  ...over,
});

test('a paid session for the price we recorded is allowed through', () => {
  const v = verifySessionPayment(session(), expectation(), { kind: 'portal_plan', subject: 'pro' });
  assert.equal(v.ok, true);
  // Every check must actually have run. A pass with an empty list would mean
  // the gate waved it through rather than cleared it.
  for (const name of ['expectation-exists', 'session-id', 'kind', 'subject', 'livemode', 'payment-status', 'currency', 'amount']) {
    assert.ok(v.checked.includes(name), `expected the gate to check ${name}`);
  }
});

test('COMPLETED BUT UNPAID grants nothing', () => {
  // The hole this was built for: Stripe sends checkout.session.completed for a
  // session whose payment is still outstanding, and the grant was written.
  const v = verifySessionPayment(
    session({ payment_status: 'unpaid' }),
    expectation(),
    { kind: 'portal_plan', subject: 'pro' },
  );
  assert.equal(v.ok, false);
  assert.equal(v.code, 'not-paid');
});

test('a session this server never opened grants nothing', () => {
  const v = verifySessionPayment(session(), null, { kind: 'portal_plan', subject: 'pro' });
  assert.equal(v.ok, false);
  assert.equal(v.code, 'no-expectation');
  // Named in the refusal, because this is the one a person has to go and find.
  assert.match(v.reason, /cs_live_1/);
});

test('paying the cheap tier does not buy the dear one', () => {
  const v = verifySessionPayment(
    session(),
    expectation({ subject: 'starter', subtotalCents: 900, totalCents: 900 }),
    { kind: 'portal_plan', subject: 'enterprise' },
  );
  assert.equal(v.ok, false);
  assert.equal(v.code, 'wrong-subject');
});

test('one flow cannot provision another', () => {
  const v = verifySessionPayment(
    session(),
    expectation({ kind: 'maintenance_invoice' }),
    { kind: 'portal_plan', subject: 'pro' },
  );
  assert.equal(v.ok, false);
  assert.equal(v.code, 'wrong-kind');
});

test('short payment is refused with both figures', () => {
  const v = verifySessionPayment(
    session({ amount_subtotal: 100, amount_total: 100 }),
    expectation(),
    { kind: 'portal_plan', subject: 'pro' },
  );
  assert.equal(v.ok, false);
  assert.equal(v.code, 'short-paid');
  assert.equal(v.paidCents, 100);
  assert.equal(v.expectedCents, 3900);
  assert.match(v.reason, /1\.00.*39\.00/);
});

test('the same number in another currency is refused', () => {
  const v = verifySessionPayment(
    session({ currency: 'jpy' }),
    expectation(),
    { kind: 'portal_plan', subject: 'pro' },
  );
  assert.equal(v.ok, false);
  assert.equal(v.code, 'wrong-currency');
});

test('a test-mode event cannot satisfy a live expectation', () => {
  const v = verifySessionPayment(
    session({ livemode: false }),
    expectation({ livemode: true }),
    { kind: 'portal_plan', subject: 'pro' },
  );
  assert.equal(v.ok, false);
  assert.equal(v.code, 'wrong-mode');
});

test('a mismatched session id is refused even when everything else lines up', () => {
  const v = verifySessionPayment(
    session({ id: 'cs_live_someone_elses' }),
    expectation(),
    { kind: 'portal_plan', subject: 'pro' },
  );
  assert.equal(v.ok, false);
  assert.equal(v.code, 'session-mismatch');
});

test('paying MORE than we asked is allowed', () => {
  // Tax lands in amount_total, not the subtotal, but a quantity or an upward
  // adjustment should never lock a paying customer out of what they bought.
  const v = verifySessionPayment(
    session({ amount_subtotal: 7800, amount_total: 8200 }),
    expectation(),
    { kind: 'portal_plan', subject: 'pro' },
  );
  assert.equal(v.ok, true);
});

test('a discounted total still passes, because the subtotal is what is checked', () => {
  // A promotion code we issued reduces amount_total. Checking the total would
  // refuse our own coupon; checking the subtotal holds the line items to our
  // prices and lets the discount be a discount.
  const v = verifySessionPayment(
    session({ amount_subtotal: 3900, amount_total: 3000 }),
    expectation(),
    { kind: 'portal_plan', subject: 'pro' },
  );
  assert.equal(v.ok, true);
});

test('no amount anywhere is a refusal, not a pass', () => {
  const v = verifySessionPayment(
    session({ amount_subtotal: null, amount_total: null }),
    expectation(),
    { kind: 'portal_plan', subject: 'pro' },
  );
  assert.equal(v.ok, false);
  assert.equal(v.code, 'no-amount');
});

test('a free thing may complete with no payment required', () => {
  const v = verifySessionPayment(
    session({ payment_status: 'no_payment_required', amount_subtotal: 0, amount_total: 0 }),
    expectation({ subtotalCents: 0, totalCents: 0 }),
    { kind: 'portal_plan', subject: 'pro' },
  );
  assert.equal(v.ok, true);
});

test('no payment required on something we priced is refused', () => {
  const v = verifySessionPayment(
    session({ payment_status: 'no_payment_required', amount_subtotal: 0, amount_total: 0 }),
    expectation(),
    { kind: 'portal_plan', subject: 'pro' },
  );
  assert.equal(v.ok, false);
  assert.equal(v.code, 'not-paid');
});

test('price ids come out of the params in line-item order', () => {
  const params = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': 'price_tier',
    'line_items[0][quantity]': '1',
    'line_items[2][price]': 'price_oncall',
    'line_items[1][price]': 'price_extra',
  });
  // Insertion order is not line-item order, and the array is evidence.
  assert.deepEqual(priceIdsFromParams(params), ['price_tier', 'price_extra', 'price_oncall']);
});

test('an inline-priced session records no price ids rather than a wrong one', () => {
  const params = new URLSearchParams({
    'line_items[0][price_data][unit_amount]': '12500',
    'line_items[0][quantity]': '1',
  });
  assert.deepEqual(priceIdsFromParams(params), []);
});

test('the expectation reads the figures off the session Stripe returned', () => {
  const rec = expectationFrom({
    session: {
      id: 'cs_live_9',
      livemode: true,
      currency: 'USD',
      amount_subtotal: 12500,
      amount_total: 13200,
    },
    kind: 'maintenance_plan',
    subject: 'PLAN-7',
    email: 'Owner@Example.com ',
    account: 'services',
    priceIds: ['price_plan_7'],
  });
  assert.equal(rec.sessionId, 'cs_live_9');
  assert.equal(rec.subtotalCents, 12500);
  assert.equal(rec.totalCents, 13200);
  assert.equal(rec.currency, 'usd');
  assert.equal(rec.email, 'owner@example.com');
  assert.equal(rec.livemode, true);
});

test('a session with no livemode flag is recorded as LIVE', () => {
  // Fail dangerous-side-up: a missing flag read as test would let the
  // rehearsal exception satisfy an expectation that was a real charge.
  const rec = expectationFrom({
    session: { id: 'cs_1', amount_subtotal: 100 },
    kind: 'property_ai',
    subject: 'starter',
    account: 'services',
  });
  assert.equal(rec.livemode, true);
});

test('keys are stable and namespaced', () => {
  assert.equal(expectationKey('cs_live_1'), 'checkout_expectation:cs_live_1');
  assert.equal(heldPaymentKey('cs_live_1'), 'payment_held:cs_live_1');
});

test('a renewal billed on a price we sold is fine', () => {
  const invoice = { lines: { data: [{ price: { id: 'price_plan_7' } }] } };
  const v = verifyRenewalPrices(invoice, ['price_plan_7', 'price_plan_7_annual']);
  assert.equal(v.ok, true);
  assert.deepEqual(v.checked, ['price-ids']);
});

test('a renewal billed on a price nobody sold is reported', () => {
  const invoice = { lines: { data: [{ price: { id: 'price_from_the_dashboard' } }] } };
  const v = verifyRenewalPrices(invoice, ['price_plan_7']);
  assert.equal(v.ok, false);
  assert.match(v.reason, /price_from_the_dashboard/);
});

test('nothing to compare is reported as nothing, not as a pass', () => {
  const v = verifyRenewalPrices({ lines: { data: [] } }, ['price_plan_7']);
  assert.equal(v.ok, true);
  // The empty list is the signal: the caller can tell a real check from a skip.
  assert.deepEqual(v.checked, []);
});

test('legacy invoice lines name their price under plan', () => {
  const invoice = { lines: { data: [{ plan: { id: 'price_old' } }] } };
  assert.deepEqual(invoicePriceIds(invoice), ['price_old']);
});

test('a session with no subtotal records null, not zero', () => {
  // `Number(null)` is 0 and finite. Recorded as zero, this expectation would be
  // satisfied by any payment at all, because every amount is at least nothing.
  const rec = expectationFrom({
    session: { id: 'cs_live_1', livemode: true, currency: 'usd', amount_subtotal: null, amount_total: null },
    kind: 'portal_plan',
    subject: 'pro',
    account: 'services',
  });
  assert.equal(rec.subtotalCents, null);
  assert.equal(rec.totalCents, null);

  const v = verifySessionPayment(session({ amount_subtotal: 1, amount_total: 1 }), rec, {
    kind: 'portal_plan',
    subject: 'pro',
  });
  assert.equal(v.ok, false);
  assert.equal(v.code, 'no-amount');
});

test('a free session recorded as zero still passes on zero', () => {
  // The flip side: a real zero must stay a real zero, or nothing free can ever
  // be provisioned.
  const rec = expectationFrom({
    session: { id: 'cs_live_1', livemode: true, currency: 'usd', amount_subtotal: 0, amount_total: 0 },
    kind: 'portal_plan',
    subject: 'free',
    account: 'services',
  });
  assert.equal(rec.subtotalCents, 0);
  const v = verifySessionPayment(
    session({ payment_status: 'no_payment_required', amount_subtotal: 0, amount_total: 0 }),
    rec,
    { kind: 'portal_plan', subject: 'free' },
  );
  assert.equal(v.ok, true);
});
