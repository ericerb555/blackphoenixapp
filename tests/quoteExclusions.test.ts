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
  excludedCostOf, includedShareOf, directCostOf, includedCostOf, rowBaselineOf,
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
 * THE SHARE CAN EXCEED 1, AND MUST.
 *
 * This test originally asserted the opposite, when the rule was only about
 * unticking and could therefore only ever subtract. The rule is now "the
 * lines decide", which has to work in both directions: add a row in the
 * editor, or raise a unit price, and the stored total is too LOW. Capping at
 * 1 would print the new line and not charge for it — the money-losing
 * direction, and just as wrong as the other one.
 */
test('the share rises when the lines come to more than the stored total', () => {
  // Lines come to 3,574.50; the quote claims a direct cost of 1,000.
  const q = sarah({ materialsSubtotal: 1000, laborSubtotal: 0, preTaxTotal: 1000, totalCost: 1000 });
  const share = includedShareOf(q);
  assert.ok(share > 1, 'the stored total is stale and low');
  assert.equal(round2(1000 * share), 3574.5, 'and scales to what the lines actually come to');
});

/**
 * The ordinary case, and the one that must not move: a quote whose stored
 * figures already agree with its lines prices bit-for-bit as it always has.
 */
test('a quote that agrees with itself is left exactly alone', () => {
  assert.equal(includedShareOf(sarah()), 1);
});

test('soft costs are excludable as well', () => {
  const q = sarah({
    additionalCosts: [{ description: 'Dumpster', amount: 600, included: false }],
    additionalCostsSubtotal: 600,
  });
  assert.equal(excludedCostOf(q), 600);
});

/* ── a labour burden is cost with no line of its own ─────────────────────── */
/**
 * Eric, 2026-11-19: "the view pdf in the quote editor is $10,827.13 not the
 * 13,345.11 its suppose to be why this is getting out of control how
 * manytimes its taken to fix this"
 *
 * Q-2026-0006, exactly as the editor reads it. Nothing on it is unticked and
 * nothing is hidden from the total, so the share must be 1 — but
 * `includedShareOf` divided the line rows ($10,410.70) by stored `directCost`
 * ($12,831.83), which carries a $2,421.13 labour burden that has no row and
 * never will. 81.13% of the quote, and $2,517.98 off the bottom of the page.
 *
 * The figures are his, from `pipeline_wr-1794354679347` on 2026-11-19.
 */
const jason = (over: Record<string, unknown> = {}) => ({
  materials: [
    { name: "Shower pan", quantity: 1, unitCost: 1350, totalCost: 1350 },
    { name: "Vanity", quantity: 1, unitCost: 540, totalCost: 594 },
    { name: "Debris haul", quantity: 1, unitCost: 420, totalCost: 420 },
    { name: "Sundries", quantity: 1, unitCost: 526.55, totalCost: 579.2 },
  ],
  labor: [
    { role: "Plumber", hours: 1, hourlyRate: 1625, totalCost: 1625 },
    { role: "Waterproofing", hours: 24, hourlyRate: 80.5, totalCost: 1932 },
    { role: "Carpenter", hours: 65, hourlyRate: 51.69, totalCost: 3360.5 },
  ],
  additionalCosts: [
    { name: "Building Permit", amount: 200 },
    { name: "Disposal Fee", amount: 350 },
  ],
  materialsSubtotal: 2943.2,
  laborSubtotal: 6917.5,
  additionalCostsSubtotal: 550,
  // materials + (labour + burden) + soft costs, per `quoteMargins.ts`.
  laborBurdenAmount: 2421.13,
  directCost: 12831.83,
  overheadAmount: 0,
  profitAmount: 320.8,
  contingencyAmount: 192.48,
  preTaxTotal: 13345.11,
  totalCost: 13345.11,
  taxAmount: 0,
  ...over,
});

test("a labour burden is not work that was removed", () => {
  // The rows come to the subtotals exactly — nothing has moved.
  assert.equal(includedCostOf(jason()), 10410.7);
  assert.equal(rowBaselineOf(jason()), 10410.7);
  assert.equal(excludedCostOf(jason()), 0);
  assert.equal(includedShareOf(jason()), 1);
  // The number on Eric's screen, and the one that belongs there.
  assert.equal(round2(13345.11 * includedShareOf(jason())), 13345.11);
  assert.notEqual(round2(13345.11 * includedShareOf(jason())), 10827.13);
});

test("direct cost still carries the burden, because the markup sits on it", () => {
  // `directCostOf` must NOT change: `customerPricingOf` derives the markup
  // from the gap between it and the stored total, and the burden is cost.
  assert.equal(directCostOf(jason()), 12831.83);
});

test("unticking a line still removes it, burden and all", () => {
  // The $1,625 plumber comes off. The burden rides down with it, which is
  // the point of a share: less labour is less payroll tax, not the same.
  const q = jason();
  (q.labor[0] as any).included = false;
  assert.equal(excludedCostOf(q), 1625);
  assert.equal(includedCostOf(q), 8785.7);
  const share = includedShareOf(q);
  assert.equal(round2(share), 0.84);
  assert.ok(round2(13345.11 * share) < 13345.11);
});

test("a burden with no subtotals stored is still not an exclusion", () => {
  // The subtotals are the preferred reference; this is the fallback path,
  // where `directCost` is all there is and the burden has to come back off.
  const q = jason({
    materialsSubtotal: undefined, laborSubtotal: undefined,
    additionalCostsSubtotal: undefined,
  });
  assert.equal(rowBaselineOf(q), 10410.7);
  assert.equal(includedShareOf(q), 1);
});
