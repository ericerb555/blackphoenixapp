/**
 * Which margins a quote is actually built with.
 *
 * WHY THIS FILE EXISTS
 *
 * The company's markups can be saved in two places that do not agree on field
 * names, and on 2026-10-07 production had the one nothing read. Eric saved his
 * rates and his margins together on the labour rates screen on 27 September —
 * 20% on materials, 15% on labour, 20% target profit — and every quote built
 * from a written description used the STANDARD 30% / 0% / 15% instead, because
 * the reader looked only at `pricing_config:global` and the rates screen
 * writes `labor_rates:global`.
 *
 * It was invisible because both numbers are plausible. A quote priced with the
 * wrong markup does not look wrong; it looks like a quote.
 *
 * The names are the whole trap, so they are asserted explicitly:
 *
 *   rates screen         pricing settings
 *   materialsMarkup  ->  materialMarkup     (plural vs singular)
 *   targetProfitMargin -> profitMargin      (different word entirely)
 *   laborMarkup      ->  laborMarkup        (the only one that matches)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolvePricing,
  STANDARD_PRICING,
} from '../supabase/functions/server/pricingDefaults.ts';

/** Exactly what production held on 2026-10-07. */
const SAVED_RATES_RECORD = {
  laborRates: [{ id: 'carpentry', category: 'Carpentry', hourlyRate: 70, visible: true }],
  profitSettings: {
    laborMarkup: 15,
    materialsMarkup: 20,
    overheadPercentage: 10,
    targetProfitMargin: 20,
  },
};

test('with nothing saved anywhere, the standards are used and said to be', () => {
  const { settings, usingStandards } = resolvePricing(null, null);
  assert.equal(usingStandards, true);
  assert.equal(settings.materialMarkup, STANDARD_PRICING.materialMarkup);
  assert.equal(settings.profitMargin, STANDARD_PRICING.profitMargin);
});

test("the margins saved on the rates screen are the ones used", () => {
  // The exact failure this fixes: these four values were sitting in production
  // and every description-built quote ignored them.
  const { settings, usingStandards } = resolvePricing(null, SAVED_RATES_RECORD);

  assert.equal(usingStandards, false, 'his own figures are not "standards"');
  assert.equal(settings.materialMarkup, 20, 'was 30 — the standard — while he had set 20');
  assert.equal(settings.laborMarkup, 15, 'was 0 while he had set 15');
  assert.equal(settings.profitMargin, 20, 'was 15 while he had set 20');
  assert.equal(settings.overheadPercentage, 10);
});

test('the per-category material markups still come from the standards', () => {
  // The rates screen has no field for these, so they must not be wiped out by
  // a record that simply does not mention them.
  const { settings } = resolvePricing(null, SAVED_RATES_RECORD);
  assert.deepEqual(settings.materialMarkupByCategory, STANDARD_PRICING.materialMarkupByCategory);
});

test('the dedicated settings record wins, field by field', () => {
  // Both saved, disagreeing. The pricing settings screen is the one built for
  // the purpose, so it takes precedence — but only where it has an opinion.
  const { settings } = resolvePricing(
    { config: { materialMarkup: 42 } },
    SAVED_RATES_RECORD,
  );

  assert.equal(settings.materialMarkup, 42, 'the dedicated record wins');
  assert.equal(settings.laborMarkup, 15, 'and does not wipe out what it says nothing about');
  assert.equal(settings.profitMargin, 20);
});

test('zero is a decision, not a missing value', () => {
  // "No labour markup" is a thing Eric is allowed to mean. Treating 0 as unset
  // would silently restore a markup he had deliberately removed.
  const { settings } = resolvePricing(null, {
    profitSettings: { laborMarkup: 0, materialsMarkup: 0 },
  });
  assert.equal(settings.laborMarkup, 0);
  assert.equal(settings.materialMarkup, 0);
});

test('nonsense is ignored rather than priced with', () => {
  // A negative markup or a string from an older client must not become a
  // margin. Each field falls back on its own, so one bad value does not
  // discard the good ones next to it.
  const { settings } = resolvePricing(null, {
    profitSettings: {
      materialsMarkup: -5,
      laborMarkup: 'fifteen',
      targetProfitMargin: 20,
    },
  });

  assert.equal(settings.materialMarkup, STANDARD_PRICING.materialMarkup);
  assert.equal(settings.laborMarkup, STANDARD_PRICING.laborMarkup);
  assert.equal(settings.profitMargin, 20, 'the one usable value is still used');
});

test('an empty profitSettings object does not count as settings', () => {
  // The same reasoning the existing code applies to an empty `config`: an
  // empty record is not a decision, and treating it as one would price every
  // job at zero markup while reporting that these were the company's figures.
  const { settings, usingStandards } = resolvePricing(null, { profitSettings: {} });
  assert.equal(usingStandards, true);
  assert.equal(settings.materialMarkup, STANDARD_PRICING.materialMarkup);
});

test('an empty config with real rates-screen margins still uses the margins', () => {
  const { settings, usingStandards } = resolvePricing({ config: {} }, SAVED_RATES_RECORD);
  assert.equal(usingStandards, false);
  assert.equal(settings.materialMarkup, 20);
});

test('calling it with one argument behaves exactly as it always did', () => {
  // Every existing caller passes one argument. None of them may change
  // behaviour because a second parameter was added.
  const { settings, usingStandards } = resolvePricing({ config: { materialMarkup: 25 } });
  assert.equal(usingStandards, false);
  assert.equal(settings.materialMarkup, 25);
  assert.equal(settings.profitMargin, STANDARD_PRICING.profitMargin);
});
