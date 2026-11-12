/**
 * Whose percentages price a generated quote.
 *
 * WHY THIS FILE EXISTS
 *
 * The estimator prompt asks the model for `overheadPercent`, `profitPercent`
 * and `contingencyPercent` along with the line items — so a language model was
 * choosing the company's profit margin, and when it left them out a hardcoded
 * 10/10/5 did. Neither ever read what the company charges.
 *
 * MEASURED 2026-11-12: all three quotes in production carried no margin fields
 * at all and went out at direct cost. Two faults stacked — the save dropped
 * them, fixed in quoteDoc.ts, and the figures being dropped were invented
 * rather than Eric's, which is what these assert.
 *
 * The rule has one subtlety and it is the usual one: ZERO IS AN ANSWER. New
 * Hampshire has no sales tax, `taxRate: 0` is a decision, and reading it as a
 * gap reaches past it to the model's habitual 8% on every quote in a state
 * that charges none.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { asRate, marginRatesFor } from '../supabase/functions/server/quoteRates.ts';

/** Eric's saved settings, as percentages, the way the server stores them. */
const ERIC = {
  overheadPercentage: 15,
  profitMargin: 20,
  contingencyPercentage: 10,
  taxRate: 0,
};

/** What the model habitually returns, as fractions. */
const MODEL = {
  overheadPercent: 0.10,
  profitPercent: 0.10,
  contingencyPercent: 0.05,
  taxRatePercent: 0.08,
};

/* ── the conversion ──────────────────────────────────────────────────────── */

test('a stored percentage becomes a fraction', () => {
  assert.equal(asRate(15), 0.15);
  assert.equal(asRate(100), 1);
  assert.equal(asRate(0), 0);
});

test('nothing stored is undefined, not zero', () => {
  // The distinction the whole module turns on: a gap falls through to the
  // model, a stored zero does not.
  assert.equal(asRate(undefined), undefined);
  assert.equal(asRate(null), undefined);
  assert.equal(asRate(''), undefined);
  assert.equal(asRate('nonsense'), undefined);
  assert.equal(asRate(-5), undefined);
});

/* ── whose number wins ───────────────────────────────────────────────────── */

test("the company's rates beat the model's", () => {
  const r = marginRatesFor(ERIC, MODEL);
  assert.equal(r.overheadPercent, 0.15);
  assert.equal(r.profitPercent, 0.20);
  assert.equal(r.contingencyPercent, 0.10);
  assert.equal(r.source, 'company');
});

test('a stored zero tax is honoured, not replaced by the model’s 8%', () => {
  // The case that matters: New Hampshire charges no sales tax. `||` here would
  // put 8% on every quote in a state that has none.
  const r = marginRatesFor(ERIC, MODEL);
  assert.equal(r.taxRatePercent, 0);
  assert.notEqual(r.taxRatePercent, 0.08);
});

test('a company that has configured nothing falls through to the model', () => {
  const r = marginRatesFor({}, MODEL);
  assert.equal(r.overheadPercent, 0.10);
  assert.equal(r.profitPercent, 0.10);
  assert.equal(r.contingencyPercent, 0.05);
  assert.equal(r.taxRatePercent, 0.08);
  assert.equal(r.source, 'model');
});

test('settings fill in field by field rather than all or nothing', () => {
  // A company with a profit figure and nothing else keeps its profit and takes
  // the model's view on the rest.
  const r = marginRatesFor({ profitMargin: 20 }, MODEL);
  assert.equal(r.profitPercent, 0.20);
  assert.equal(r.overheadPercent, 0.10);
  assert.equal(r.source, 'company');
});

test('neither side having an answer is reported as neither', () => {
  const r = marginRatesFor(null, {});
  assert.equal(r.overheadPercent, undefined);
  assert.equal(r.source, 'none');
  // applyMargins treats absent as its own default; this module does not invent.
});

test('a model returning rubbish is ignored rather than priced with', () => {
  const r = marginRatesFor({}, { profitPercent: 'lots', overheadPercent: -1 });
  assert.equal(r.profitPercent, undefined);
  assert.equal(r.overheadPercent, undefined);
});

test('a company zero contingency means nought, not "unset"', () => {
  // Deliberately no contingency is a decision, and must not pick up the
  // model's 5% because it looked like a gap.
  const r = marginRatesFor({ ...ERIC, contingencyPercentage: 0 }, MODEL);
  assert.equal(r.contingencyPercent, 0);
});

/* ── what it comes to ────────────────────────────────────────────────────── */

test("Eric's rates put a $10,000 job at $14,500 rather than $12,500", () => {
  // Rounded to the cent, as applyMargins does — 0.10 + 0.10 + 0.05 is not
  // exactly 0.25 in binary floating point, and money arithmetic that forgets
  // that is its own genre of bug.
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const r = marginRatesFor(ERIC, MODEL);
  const direct = 10000;
  const withEric = round2(direct * (1 + r.overheadPercent! + r.profitPercent! + r.contingencyPercent!));
  const withModel = round2(direct * (1 + 0.10 + 0.10 + 0.05));
  assert.equal(withEric, 14500);
  assert.equal(withModel, 12500);
  // Two thousand dollars a job, decided by whoever's number got read.
  assert.equal(round2(withEric - withModel), 2000);
});
