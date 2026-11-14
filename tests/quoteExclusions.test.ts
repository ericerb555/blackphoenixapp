/**
 * Taking a line OFF a quote, and the total following it.
 *
 * Eric, in the quote editor: "when i am in quote editor i hit view pdf" —
 * "THE LINE ITEMS DONT TOTAL THE TOTAL LINE!"
 *
 * Reproduced on his own Q-2026-0002 on 2026-11-14. Untouched, the document
 * is exact: sixteen lines summing to 12,666.13 under a total of 12,666.13.
 * Untick one $1,050 line and the column drops to 11,616.13 while the total
 * stays at 12,666.13 — because every total on that document is a STORED
 * figure, written when the quote was priced and never rewritten when a line
 * is taken off. `preTaxTotalOf` hands back the stored number whenever it has
 * one.
 *
 * Which is the dangerous direction. It is not only that the column fails to
 * add up; it is that the customer is being billed for work that was removed.
 *
 * WHY A SHARE AND NOT A SUBTRACTION
 *
 * The stored total is direct cost plus overhead, profit and contingency. A
 * line that leaves takes its share of all four with it. Subtracting only its
 * raw cost would leave the margin it carried sitting on everything else,
 * quietly raising the markup on the rest of the job.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  excludedCostOf, includedShareOf, directCostOf,
} from '../supabase/functions/server/quoteCustomerPrice.ts';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Q-2026-0002's shape: the figures are his. */
const sarah = (over: Record<string, unknown> = {}) => ({
  materials: [
    { name: '2x4 Lumber', quantity: 25, unitCost: 4.38, totalCost: 109.5 },
    { name: 'Custom Benches', quantity: 3, unitCost: 350, totalCost: 1050 },
  ],
  labor: [
    { role: 'Carpenter', hours: 30, hourlyRate: 80.5, totalCost: 2415 },
  ],
  materialsSubtotal: 1159.5,
  laborSubtotal: 2415,
  preTaxTotal: 3574.5,
  totalCost: 3574.5,
  ...over,
});

/* ── nothing excluded changes nothing ────────────────────────────────────── */

test('a quote nobody has edited is untouched', () => {
  assert.equal(excludedCostOf(sarah()), 0);
  assert.equal(includedShareOf(sarah()), 1);
});

test('an empty or absent quote does not divide by zero', () => {
  assert.equal(includedShareOf({}), 1);
  assert.equal(includedShareOf(null), 1);
  assert.equal(excludedCostOf(null), 0);
});

/* ── unticking ───────────────────────────────────────────────────────────── */

test('an unticked line is counted as excluded', () => {
  const q = sarah();
  (q.materials[1] as any).included = false;
  assert.equal(excludedCostOf(q), 1050);
});

/**
 * The arithmetic the document now does: stored total times the share of
 * direct cost that remains.
 */
test('the total drops by exactly the line that was removed', () => {
  const q = sarah();
  (q.materials[1] as any).included = false;
  const share = includedShareOf(q);
  assert.equal(round2(3574.5 * share), round2(3574.5 - 1050));
});

/**
 * HIDING IS NOT REMOVING. `visible: false` withholds a line's detail and
 * keeps its money — the two flags mean opposite things about what is owed,
 * and conflating them would quietly discount every quote with a hidden line.
 */
test('a hidden line still costs what it costs', () => {
  const q = sarah();
  (q.materials[1] as any).visible = false;
  assert.equal(excludedCostOf(q), 0);
  assert.equal(includedShareOf(q), 1);
});

test('labour can be unticked too, by its own fields', () => {
  const q = sarah();
  (q.labor[0] as any).included = false;
  assert.equal(excludedCostOf(q), 2415);
});

test('a line with no stored total falls back to quantity times rate', () => {
  const q = sarah({
    materials: [{ name: 'x', quantity: 4, unitCost: 25, included: false }],
    materialsSubtotal: 100, laborSubtotal: 0, preTaxTotal: 100, totalCost: 100,
    labor: [],
  });
  assert.equal(excludedCostOf(q), 100);
});

/**
 * The margin leaves with the line. On a quote carrying markup, the share is
 * taken against DIRECT cost, so the excluded line's overhead and profit go
 * with it rather than being redistributed onto the rest of the job.
 */
test('removing a third of the cost removes a third of the marked-up total', () => {
  const q = sarah({
    materials: [{ name: 'a', quantity: 1, unitCost: 1000, totalCost: 1000 }],
    labor: [{ role: 'b', hours: 1, hourlyRate: 2000, totalCost: 2000, included: false }],
    materialsSubtotal: 1000, laborSubtotal: 2000,
    // Direct 3000, marked up to 3600.
    preTaxTotal: 3600, totalCost: 3600,
  });
  assert.equal(directCostOf(q), 3000);
  assert.equal(excludedCostOf(q), 2000);
  assert.equal(round2(3600 * includedShareOf(q)), 1200,
    'the remaining third of the cost keeps its own third of the markup');
});

/* ── the edges ───────────────────────────────────────────────────────────── */

test('everything unticked is a quote with nothing on it, not a negative one', () => {
  const q = sarah();
  (q.materials[0] as any).included = false;
  (q.materials[1] as any).included = false;
  (q.labor[0] as any).included = false;
  assert.equal(includedShareOf(q), 0);
  assert.ok(round2(3574.5 * includedShareOf(q)) >= 0);
});

/**
 * A stored subtotal that does not match the lines must not produce a share
 * above 1 — that would inflate the total rather than reduce it, turning a
 * data inconsistency into an overcharge.
 */
test('the share never exceeds 1', () => {
  const q = sarah({ materialsSubtotal: 1, laborSubtotal: 0, preTaxTotal: 1, totalCost: 1 });
  assert.ok(includedShareOf(q) <= 1);
});

test('soft costs are excludable as well', () => {
  const q = sarah({
    additionalCosts: [{ description: 'Dumpster', amount: 600, included: false }],
    additionalCostsSubtotal: 600,
  });
  assert.equal(excludedCostOf(q), 600);
});
