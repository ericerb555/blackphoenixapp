/**
 * What survives being saved.
 *
 * WHAT WAS WRONG
 *
 * `normalizeQuoteDoc` rebuilds a quote field by field, so anything it does not
 * name is dropped silently. The money was not named: materials, labour, every
 * subtotal, the tax, `totalCost`, and all six margin fields went in and did not
 * come out.
 *
 * MEASURED 2026-11-11 — the saved company rates are 15/20/10/20 and
 * `quote-generator.tsx` has stamped margins through `applyMargins` since 9
 * October, yet not one quote in production carried `overheadAmount`,
 * `profitAmount`, `contingencyAmount` or `preTaxTotal`. Every quote this
 * company has sent was priced at cost.
 *
 * It also explains `total` drifting from `totalCost`: `total` was on the list
 * and `totalCost` was not, so creation kept the legacy spelling and discarded
 * the maintained one.
 *
 * The whitelist itself is right and stays — a field added to a record later
 * should be absent by default rather than stored by default. What it needed
 * was the money on it, and an assertion per field so the eighth instance of
 * this does not happen quietly.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeQuoteDoc } from '../supabase/functions/server/quoteDoc.ts';
import { applyMargins } from '../supabase/functions/server/quoteMargins.ts';
import { quoteTotal } from '../supabase/functions/server/quoteTotal.ts';

/** A quote exactly as `quote-generator.tsx` emits one. */
const margins = applyMargins({
  materialsSubtotal: 4000,
  laborSubtotal: 6000,
  additionalCostsSubtotal: 125,
  creditsSubtotal: 0,
  overheadPercent: 0.1,
  profitPercent: 0.1,
  contingencyPercent: 0.05,
  taxRatePercent: 0.0875,
});

const generated = {
  id: 'q-1',
  number: 'Q-2026-0100',
  clientName: 'Jane Homeowner',
  pricingBasis: 'estimator',
  taxRate: 0.0875,
  materials: [{ name: 'Lumber', quantity: 100, unitCost: 25, totalCost: 2500, phase: 'Framing' }],
  labor: [{ role: 'Carpenter', hours: 60, hourlyRate: 70, totalCost: 4200, phase: 'Framing' }],
  additionalCosts: [{ id: 'a1', name: 'Skip hire', amount: 125, phase: 'Strip out' }],
  materialsSubtotal: 4000,
  laborSubtotal: 6000,
  additionalCostsSubtotal: 125,
  ...margins,
};

test('the line items survive being saved', () => {
  const doc = normalizeQuoteDoc(generated);
  assert.equal(doc.materials.length, 1);
  assert.equal(doc.labor.length, 1);
  assert.equal(doc.additionalCosts.length, 1);
  assert.equal(doc.materials[0].totalCost, 2500);
  assert.equal(doc.labor[0].hourlyRate, 70);
});

test('every subtotal survives being saved', () => {
  const doc = normalizeQuoteDoc(generated);
  assert.equal(doc.materialsSubtotal, 4000);
  assert.equal(doc.laborSubtotal, 6000);
  assert.equal(doc.additionalCostsSubtotal, 125);
  assert.equal(doc.taxAmount, margins.taxAmount);
});

test('the margin survives being saved — the whole point', () => {
  const doc = normalizeQuoteDoc(generated);
  assert.equal(doc.overheadPercent, 0.1);
  assert.equal(doc.profitPercent, 0.1);
  assert.equal(doc.contingencyPercent, 0.05);
  assert.equal(doc.overheadAmount, margins.overheadAmount);
  assert.equal(doc.profitAmount, margins.profitAmount);
  assert.equal(doc.contingencyAmount, margins.contingencyAmount);
  assert.equal(doc.directCost, margins.directCost);
  assert.equal(doc.preTaxTotal, margins.preTaxTotal);
});

test('both totals survive, and they agree on the way in', () => {
  const doc = normalizeQuoteDoc({ ...generated, total: margins.totalCost });
  assert.equal(doc.totalCost, margins.totalCost);
  assert.equal(doc.total, margins.totalCost);
  assert.equal(quoteTotal(doc), margins.totalCost);
});

test('a saved quote still prices the same as the one that was generated', () => {
  const doc = normalizeQuoteDoc(generated);
  const resaved = normalizeQuoteDoc(doc);
  // Saving twice must not shave anything off — the shape is now a fixed point.
  assert.deepEqual(
    [resaved.materialsSubtotal, resaved.laborSubtotal, resaved.preTaxTotal, resaved.totalCost],
    [doc.materialsSubtotal, doc.laborSubtotal, doc.preTaxTotal, doc.totalCost],
  );
});

test('what the customer signed for survives being saved', () => {
  const signed = {
    ...generated,
    agreedTotal: 11750,
    agreedAt: '2026-11-11T23:00:00.000Z',
    agreedDiscount: { percent: 10, amount: 750, appliesTo: 'labour', labourShown: 7500, components: [] },
  };
  const doc = normalizeQuoteDoc(signed);
  assert.equal(doc.agreedTotal, 11750);
  assert.equal(doc.agreedAt, '2026-11-11T23:00:00.000Z');
  assert.equal(doc.agreedDiscount.amount, 750);
  // And it is what every downstream figure is taken from.
  assert.equal(quoteTotal(doc), 11750);
});

test('absent margin stays absent — no default is invented on save', () => {
  const handBuilt = {
    id: 'q-2',
    materials: [{ name: 'Lumber', totalCost: 500 }],
    labor: [],
    materialsSubtotal: 500,
    laborSubtotal: 0,
    totalCost: 500,
  };
  const doc = normalizeQuoteDoc(handBuilt);
  assert.equal(doc.overheadPercent, 0);
  assert.equal(doc.profitAmount, 0);
  assert.equal(doc.contingencyAmount, 0);
  assert.equal(doc.totalCost, 500);
});

test('the whitelist is still a whitelist', () => {
  // The property that makes this file worth having: a field nobody has decided
  // to store does not get stored just because a caller sent it.
  const doc: any = normalizeQuoteDoc({ ...generated, ourCost: 2100, margin: 0.42 });
  assert.equal(doc.ourCost, undefined);
  assert.equal(doc.margin, undefined);
});
