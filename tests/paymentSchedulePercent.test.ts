/**
 * Typing a payment plan in percentages, and still summing to the contract.
 *
 * Eric, 2026-11-20: "can we please fix the payement scheduler to allo me
 * create the payment schedule to percentages and then let me add when they are
 * do like deposit second payment and final. i should be able to write next the
 * the second payment when it do like when the roof is completed or after frame
 * inspection exc"
 *
 * The label and the trigger were already editable free text, so "second
 * payment" / "after frame inspection" needed nothing. The share was read-only,
 * which is what these cover — plus the rule the top of `paymentSchedule.ts`
 * says cannot bend: THE DRAWS MUST SUM TO THE CONTRACT TOTAL, EXACTLY.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  amountForPercent, percentOfTotal, balanceDraws, scheduleTotal, type Draw,
} from '../src/app/lib/paymentSchedule.ts';

const draw = (over: Partial<Draw> = {}): Draw => ({
  id: 'd1',
  type: 'phase',
  phase: null,
  label: 'Payment',
  amount: 0,
  trigger: '',
  status: 'pending',
  ...over,
});

/* ── a percentage becomes money ──────────────────────────────────────────── */

test('a third of a contract is money, to the cent', () => {
  assert.equal(amountForPercent(13345.11, 33.33), 4447.93);
  assert.equal(amountForPercent(10000, 30), 3000);
  assert.equal(amountForPercent(10000, 2.5), 250);
});

test('a percentage is clamped, not trusted', () => {
  // A pasted "150" must not bill half again as much as the job is worth.
  assert.equal(amountForPercent(10000, 150), 10000);
  assert.equal(amountForPercent(10000, -20), 0);
});

test('nonsense is zero rather than NaN', () => {
  // `Number('') === 0` but `Number('abc')` is NaN, and a NaN amount renders
  // as an empty payment that still saves.
  assert.equal(amountForPercent(10000, Number('abc')), 0);
  assert.equal(amountForPercent(10000, undefined as any), 0);
  assert.equal(amountForPercent(0, 50), 0);
});

test('the share reads back as the share, to two places', () => {
  assert.equal(percentOfTotal(3000, 10000), 30);
  assert.equal(percentOfTotal(4447.93, 13345.11), 33.33);
  // No contract total yet is 0%, not a division by zero.
  assert.equal(percentOfTotal(500, 0), 0);
});

test('typing a percent and reading it back is stable', () => {
  const total = 13345.11;
  for (const pct of [10, 25, 30, 33.33, 35, 50, 65, 100]) {
    const amount = amountForPercent(total, pct);
    assert.equal(percentOfTotal(amount, total), pct,
      `${pct}% of ${total} came back as ${percentOfTotal(amount, total)}%`);
  }
});

/* ── and the schedule still foots ────────────────────────────────────────── */

test('three equal thirds leave a cent, and balancing takes it', () => {
  const total = 13345.11;
  const draws = [
    draw({ id: 'a', label: 'Deposit', amount: amountForPercent(total, 33.33) }),
    draw({ id: 'b', label: 'Second payment', amount: amountForPercent(total, 33.33) }),
    draw({ id: 'c', label: 'Final', amount: amountForPercent(total, 33.33) }),
  ];
  // 99.99% of the job: the gap the top of the file says customers find.
  assert.notEqual(scheduleTotal(draws), total);

  const balanced = balanceDraws(draws, total);
  assert.ok(balanced, 'a gap must be balanceable');
  assert.equal(scheduleTotal(balanced!.draws), total);
  assert.equal(balanced!.movedOnto.id, 'c', 'the difference goes on the last one');
});

test('a schedule that already foots is left alone', () => {
  const draws = [
    draw({ id: 'a', amount: 3000 }),
    draw({ id: 'b', amount: 7000 }),
  ];
  assert.equal(balanceDraws(draws, 10000), null);
});

test('an invoiced draw never moves', () => {
  // It is a document already sent. The difference goes on the last PENDING one.
  const draws = [
    draw({ id: 'a', label: 'Deposit', amount: 3000, status: 'paid' }),
    draw({ id: 'b', label: 'Second', amount: 3000, status: 'pending' }),
    draw({ id: 'c', label: 'Final', amount: 3000, status: 'invoiced' }),
  ];
  const balanced = balanceDraws(draws, 10000);
  assert.ok(balanced);
  assert.equal(balanced!.movedOnto.id, 'b');
  assert.equal(balanced!.draws.find((d) => d.id === 'a')!.amount, 3000);
  assert.equal(balanced!.draws.find((d) => d.id === 'c')!.amount, 3000);
  assert.equal(balanced!.draws.find((d) => d.id === 'b')!.amount, 4000);
  assert.equal(scheduleTotal(balanced!.draws), 10000);
});

test('nothing pending means nothing to balance', () => {
  const draws = [draw({ id: 'a', amount: 3000, status: 'paid' })];
  assert.equal(balanceDraws(draws, 10000), null);
});

test('a gap too big for the last payment is refused, not made negative', () => {
  // Over-billed by 5,000 with only 1,000 pending on the last draw: taking the
  // difference there would bill minus four thousand dollars.
  const draws = [
    draw({ id: 'a', amount: 14000, status: 'pending' }),
    draw({ id: 'b', amount: 1000, status: 'pending' }),
  ];
  assert.equal(balanceDraws(draws, 10000), null);
});

test('balancing downwards works too, and reports the direction', () => {
  const draws = [
    draw({ id: 'a', amount: 6000 }),
    draw({ id: 'b', amount: 5000 }),
  ];
  const balanced = balanceDraws(draws, 10000);
  assert.ok(balanced);
  assert.equal(balanced!.by, -1000);
  assert.equal(balanced!.draws.find((d) => d.id === 'b')!.amount, 4000);
  assert.equal(scheduleTotal(balanced!.draws), 10000);
});

test('a deposit, a milestone payment and a final, in his own words', () => {
  const total = 24000;
  const draws = [
    draw({ id: 'a', label: 'Deposit', amount: amountForPercent(total, 30), trigger: 'On signing' }),
    draw({ id: 'b', label: 'Second payment', amount: amountForPercent(total, 40), trigger: 'After frame inspection' }),
    draw({ id: 'c', label: 'Final', amount: amountForPercent(total, 30), trigger: 'When the roof is completed' }),
  ];
  assert.equal(scheduleTotal(draws), total, '30/40/30 of 24,000 divides exactly');
  assert.equal(balanceDraws(draws, total), null, 'nothing to fix');
  // The trigger is the half that makes a percentage defensible.
  assert.equal(draws[1].trigger, 'After frame inspection');
});
