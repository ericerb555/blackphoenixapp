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
