/**
 * What of a quote is ours, sliced per phase and per kind of cost.
 *
 * Two things can go wrong here and both are expensive.
 *
 * The first is LEAKAGE: markup is internal, and a figure that reaches a
 * customer's PDF tells them exactly what margin they are paying. The
 * assembler guards that by not computing it at all for a customer copy;
 * `quoteToPdfDocument` is where that is asserted.
 *
 * The second is DISAGREEMENT: the per-section figures have to add back up to
 * the quote's own margin, or the office copy and the "how this quote was
 * built" panel state two different profits for the same job and nobody knows
 * which to believe. That is what most of this file pins down.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { asFraction, markupRatesOf, markupOn, hasMarkup, describeRates } from '../src/app/lib/quoteMarkup.ts';

/* ── the unit confusion that once shipped 40% overhead ───────────────────── */

test('a fraction is read as a fraction', () => {
  assert.equal(asFraction(0.1), 0.1);
  assert.equal(asFraction(0.05), 0.05);
});

test('a percentage is read as a percentage', () => {
  assert.equal(asFraction(10), 0.1);
  assert.equal(asFraction(5), 0.05);
  assert.equal(asFraction(25), 0.25);
});

test('absent, empty and nonsense are all zero, never a default', () => {
  for (const v of [undefined, null, '', 'abc', NaN, -5]) {
    assert.equal(asFraction(v), 0, `${JSON.stringify(v)} should be 0`);
  }
});

/**
 * A hand-built quote has no margins on it. `applyMargins` would default a
 * missing rate to 10/10/5 when PRICING a job, but reporting that default
 * back as fact would invent profit that was never charged.
 */
test('a quote with no rates has no markup, not the default markup', () => {
  const rates = markupRatesOf({});
  assert.equal(rates.total, 0);
  assert.equal(hasMarkup(rates), false);
});

/* ── apportionment ───────────────────────────────────────────────────────── */

const quote = { overheadPercent: 0.10, profitPercent: 0.10, contingencyPercent: 0.05 };

test('the three rates sum to what a dollar of direct cost carries', () => {
  const rates = markupRatesOf(quote);
  assert.equal(Math.round(rates.total * 100) / 100, 0.25);
});

test('a section carries its own direct cost times the rate', () => {
  const rates = markupRatesOf(quote);
  const materials = markupOn(480, rates);
  assert.equal(materials.overhead, 48);
  assert.equal(materials.profit, 48);
  assert.equal(materials.contingency, 24);
  assert.equal(materials.total, 120);
});

/**
 * THE PROPERTY THAT MATTERS. Slice the phase any way you like and the parts
 * must come back to the whole, or the document contradicts itself.
 */
test('the sections add back up to the phase', () => {
  const rates = markupRatesOf(quote);
  const sections = [480, 1320];
  const summed = sections.reduce((t, s) => t + markupOn(s, rates).total, 0);
  const whole = markupOn(sections.reduce((a, b) => a + b, 0), rates).total;
  assert.equal(Math.round(summed * 100) / 100, whole);
});

test('the printed parts add up to the printed total', () => {
  const rates = markupRatesOf({ overheadPercent: 7, profitPercent: 11, contingencyPercent: 3 });
  // An amount chosen to round awkwardly in every component.
  const share = markupOn(1333.33, rates);
  assert.equal(
    Math.round((share.overhead + share.profit + share.contingency) * 100) / 100,
    share.total,
  );
});

test('no markup on nothing', () => {
  assert.equal(markupOn(0, markupRatesOf(quote)).total, 0);
});

test('the label names the rates a person reasons about', () => {
  assert.equal(describeRates(markupRatesOf(quote)), '10% overhead + 10% profit + 5% contingency');
  // A rate that is zero is not worth a word.
  assert.equal(describeRates(markupRatesOf({ profitPercent: 0.15 })), '15% profit');
  assert.equal(describeRates(markupRatesOf({})), '');
});

/* ── what the quote editor recalculates when you touch a line ────────────── */

/**
 * `recalculateTotals` in the editor is a `.tsx` the test runner cannot load,
 * so what is asserted here is the CONTRACT it is built from: `asFraction`
 * feeding `applyMargins`, every rate passed explicitly.
 *
 * That composition is the whole fix. The editor used to total a quote as
 * materials + labour + tax - credits, with no overhead, profit or
 * contingency — so editing one quantity on a generated quote quietly removed
 * about a quarter of the price. These pin both directions: the margin comes
 * back when the quote has one, and none is conjured when it does not.
 */
import { applyMargins } from '../supabase/functions/server/quoteMargins.ts';

const recalc = (q: any) => applyMargins({
  materialsSubtotal: q.materialsSubtotal,
  laborSubtotal: q.laborSubtotal,
  additionalCostsSubtotal: q.additionalCostsSubtotal ?? 0,
  creditsSubtotal: q.creditsSubtotal ?? 0,
  overheadPercent: asFraction(q.overheadPercent),
  profitPercent: asFraction(q.profitPercent),
  contingencyPercent: asFraction(q.contingencyPercent),
  taxRatePercent: asFraction(q.taxRate),
});

const generated = {
  materialsSubtotal: 4000, laborSubtotal: 6000,
  overheadPercent: 0.10, profitPercent: 0.10, contingencyPercent: 0.05,
  taxRate: 0.08,
};

test('editing a generated quote keeps its overhead, profit and contingency', () => {
  const out = recalc(generated);
  assert.equal(out.overheadAmount, 1000);
  assert.equal(out.profitAmount, 1000);
  assert.equal(out.contingencyAmount, 500);
  // 10000 direct + 2500 margin + 320 tax on materials.
  assert.equal(out.totalCost, 12820);
});

test('the old arithmetic was short by exactly the margin', () => {
  const old = generated.materialsSubtotal + generated.laborSubtotal
    + generated.materialsSubtotal * generated.taxRate;
  assert.equal(old, 10320);
  assert.equal(recalc(generated).totalCost - old, 2500);
});

/**
 * The other direction, and the reason every rate is passed explicitly rather
 * than left out. `applyMargins` defaults an ABSENT rate to 10/10/5, which is
 * right when pricing a new job and wrong here — a hand-built quote would gain
 * a quarter the first time somebody corrected a line.
 */
test('editing a quote that never had margins invents none', () => {
  const handBuilt = { materialsSubtotal: 4000, laborSubtotal: 6000, taxRate: 0.08 };
  const out = recalc(handBuilt);
  assert.equal(out.overheadAmount, 0);
  assert.equal(out.profitAmount, 0);
  assert.equal(out.contingencyAmount, 0);
  assert.equal(out.totalCost, 10320, 'identical to the old arithmetic');
});

test('a rate stored as a percent gives the same total as one stored as a fraction', () => {
  const asPercents = {
    materialsSubtotal: 4000, laborSubtotal: 6000,
    overheadPercent: 10, profitPercent: 10, contingencyPercent: 5, taxRate: 8,
  };
  assert.equal(recalc(asPercents).totalCost, recalc(generated).totalCost);
});

test('soft costs carry margin too', () => {
  const withPermits = { ...generated, additionalCostsSubtotal: 1000 };
  const out = recalc(withPermits);
  assert.equal(out.directCost, 11000);
  // The extra 1000 of direct cost carries the same 25%.
  assert.equal(out.overheadAmount + out.profitAmount + out.contingencyAmount, 2750);
});
