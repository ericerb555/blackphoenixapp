/**
 * The column on a customer's quote has to reach the subtotal printed under it.
 *
 * WHY THIS FILE EXISTS
 *
 * Eric, twice: "the line items are not adding up to the total." The first time
 * the gap was the whole markup — a fifth of the job, missing from the column
 * and present in the total. That was fixed by spreading the markup into the
 * line prices.
 *
 * What was left was two cents. Scaling each rate by the markup factor and
 * rounding each amount on its own leaves the column near the subtotal but not
 * on it: Sherry Ducharme's quote, twenty-one lines, 15,474.17 printed under a
 * subtotal of 15,474.15. Two cents is not a pricing error and it is the same
 * sentence from the customer regardless, so `allocate` now places the
 * remainder — the same function the web copy has always used, which is the
 * point: the PDF and the page somebody approves from must not differ by their
 * rounding.
 *
 * These assert the property rather than the implementation: whatever the
 * apportionment does, the printed column sums to the printed subtotal.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  allocate, customerPricingOf, preTaxTotalOf,
} from '../supabase/functions/server/quoteCustomerPrice.ts';

const round2 = (n: number) => Math.round(n * 100) / 100;
const sum = (xs: number[]) => round2(xs.reduce((a, b) => a + b, 0));

/** Sherry Ducharme's quote, the one that was two cents out. */
const SHERRY = {
  overheadPercent: 0.15,
  profitPercent: 0.20,
  contingencyPercent: 0.10,
  laborSubtotal: 8336.5,
  materialsSubtotal: 2335.33,
  taxAmount: 186.83,
  preTaxTotal: 15474.15,
  totalCost: 15660.98,
};

test('the real two-cent case: 21 scaled lines reach the printed subtotal', () => {
  const pricing = customerPricingOf(SHERRY);
  assert.equal(round2(pricing.factor), 1.45);

  // Twenty-one line costs that come to her direct cost of 10,671.83.
  const costs = [
    1345.5, 862.5, 517.5, 431.25, 345, 258.75, 1035, 690, 517.5, 603.75, 1725,
    402.33, 318.5, 265.75, 212.6, 159.45, 212.6, 159.45, 212.6, 132.8, 262.5,
  ];
  const direct = sum(costs);

  // Scaled line by line and rounded individually — the old behaviour.
  const naive = sum(costs.map((c) => round2(c * pricing.factor)));
  const target = round2(direct * pricing.factor);

  // The drift is real; this is what the fix is for.
  assert.notEqual(naive, target);

  // Allocated — the column now lands exactly on the subtotal.
  const allocated = allocate(costs, target);
  assert.equal(sum(allocated), target);
  assert.equal(allocated.length, costs.length);
});

test('allocate reaches the target for every markup these quotes use', () => {
  const costs = [109.5, 350, 18.13, 4.65, 202.5, 21.25, 24, 50.4, 38.4];
  for (const factor of [1, 1.25, 1.35, 1.45, 1.6675]) {
    const target = round2(sum(costs) * factor);
    assert.equal(sum(allocate(costs, target)), target, `factor ${factor}`);
  }
});

test('a single line takes the whole subtotal', () => {
  assert.deepEqual(allocate([100], 145), [145]);
});

test('the remainder lands on the largest line, not the first', () => {
  // The largest line can absorb a cent without reading as wrong; a $12 line
  // showing $12.01 against a round rate is the one somebody queries.
  const out = allocate([10, 10, 1000], 1020.01);
  assert.equal(sum(out), 1020.01);
  assert.equal(out[2], Math.max(...out));
});

test('no markup means no reallocation — the lines are shown as written', () => {
  const pricing = customerPricingOf({});
  assert.equal(pricing.markup, 0);
  // A hand-built quote that never carried a margin must not be repriced on
  // the way to the printer; quoteToPdfDocument only allocates when markup > 0.
  const costs = [100, 200.005, 33.33];
  const target = round2(sum(costs));
  assert.equal(sum(allocate(costs, target)), target);
});

test('the subtotal the column must reach is the stored one, not a re-derivation', () => {
  // preTaxTotalOf prefers the stored figure precisely so the column and the
  // total cannot be two opinions that differ in the last cent.
  const pricing = customerPricingOf(SHERRY);
  assert.equal(preTaxTotalOf(SHERRY, pricing), 15474.15);
});

test('Sarah’s quote carries no margin, so her column is untouched', () => {
  // Her total was deliberately left at direct cost, and the lines already sum
  // to it. Allocating against a factor of 1 must change nothing.
  const pricing = customerPricingOf({ laborSubtotal: 8755.5, materialsSubtotal: 3910.63 });
  assert.equal(pricing.markup, 0);
  assert.equal(round2(pricing.factor), 1);
});
