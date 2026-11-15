/**
 * What a deposit on a quote is, decided on the server.
 *
 * Two screens used to compute this in the browser and post the figure, on a
 * route that charged whatever arrived. So what is pinned here is that the
 * number comes from the stored quote and from nowhere else:
 *
 *   - an explicit schedule draw beats the percentage, because it is the figure
 *     the customer was actually shown
 *   - a deposit already paid is not chargeable again by reloading
 *   - a zero deposit means no deposit, not "fall back to 30%"
 *   - an unpriceable quote is refused rather than guessed at
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quoteDepositPrice, QUOTE_DEPOSIT_RATE } from '../supabase/functions/server/quoteDepositPrice.ts';

test('with no schedule, it is the agreed total times the rate', () => {
  const d = quoteDepositPrice({ totalCost: 1000 });
  assert.equal(d.amount, 300);
  assert.equal(d.basis, 'percentage');
  assert.equal(QUOTE_DEPOSIT_RATE, 0.3);
});

test('the agreed total wins over the computed one', () => {
  // quoteTotal puts agreedTotal ahead of totalCost; a discounted job must not
  // be deposited against the pre-discount price.
  const d = quoteDepositPrice({ totalCost: 1000, agreedTotal: 800 });
  assert.equal(d.amount, 240, 'charged a deposit on a price the customer is not paying');
});

test('an explicit deposit draw beats the percentage', () => {
  const d = quoteDepositPrice({
    totalCost: 1000,
    paymentSchedule: [{ type: 'deposit', amount: 450, status: 'pending' }],
  });
  assert.equal(d.amount, 450);
  assert.equal(d.basis, 'schedule', 'the schedule is what the customer was shown');
});

test('a deposit already paid cannot be charged again by reloading', () => {
  const d = quoteDepositPrice({
    totalCost: 1000,
    paymentSchedule: [{ type: 'deposit', amount: 450, status: 'paid' }],
  });
  // Falls through to the percentage only because the paid draw is ignored —
  // the important part is that 450 is not charged a second time.
  assert.notEqual(d.amount, 450);
});

test('a zero deposit means no deposit, not thirty percent', () => {
  const d = quoteDepositPrice({
    totalCost: 1000,
    paymentSchedule: [{ type: 'deposit', amount: 0, status: 'pending' }],
  });
  assert.equal(d.amount, 0);
  assert.ok(d.error, 'it should say so rather than charging 300');
  assert.match(d.error, /does not ask for a deposit/);
});

test('phase and balance draws are not deposits', () => {
  const d = quoteDepositPrice({
    totalCost: 1000,
    paymentSchedule: [{ type: 'phase', amount: 700, status: 'pending' }, { type: 'balance', amount: 300 }],
  });
  assert.equal(d.amount, 300, 'should use the percentage, not a phase draw');
  assert.equal(d.basis, 'percentage');
});

test('an unpriceable quote is refused, never guessed at', () => {
  for (const q of [{}, { totalCost: 0 }, { total: null }, null, undefined, 'nope']) {
    const d = quoteDepositPrice(q as any);
    assert.equal(d.amount, 0, `${JSON.stringify(q)} produced a chargeable deposit`);
    assert.ok(d.error);
  }
});

test('rounding lands on whole cents', () => {
  const d = quoteDepositPrice({ totalCost: 333.33 });
  assert.equal(d.amount, 100, '333.33 * 0.30 = 99.999 -> 100.00');
  assert.equal(Math.round(d.amount * 100), d.amount * 100);
});
