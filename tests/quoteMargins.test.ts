/**
 * What a quote totals once overhead, profit, contingency and tax go on.
 *
 * WHY THIS FILE EXISTS
 *
 * The worst pricing fault this project has had lived in the handoff between
 * `repriceEstimate` and the assembler: the first emitted PERCENTAGES out of
 * the company's settings — `overheadPercentage: 10` — and the second read the
 * same fields as FRACTIONS and clamped them at 0.4. So 10 became 0.4, and
 * every repriced quote carried 40% overhead and 40% profit instead of 10% and
 * 15%, putting a representative job at 1.88x direct cost rather than 1.35x.
 *
 * Unit tests on either side would both have passed, and did: each module did
 * what it believed it should. The contract between them was the only thing
 * wrong, and nothing tested it — in part because the arithmetic lived in a
 * `.tsx` file the test runner cannot load, so the one calculation deciding
 * what a customer is charged was the one that could not be tested. It now
 * lives in `quoteMargins.ts` and these assertions run the real repricer into
 * it.
 *
 * The figures are asserted to the penny on purpose. A test that allowed a
 * range would have allowed the bug.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyMargins, pickFraction } from '../supabase/functions/server/quoteMargins.ts';
import { repriceEstimate } from '../supabase/functions/server/repriceEstimate.ts';
import { resolvePricing, STANDARD_PRICING } from '../supabase/functions/server/pricingDefaults.ts';

/** Eric's rates and margins, exactly as production holds them. */
const SAVED_RATES = {
  laborRates: [{ id: 'carpentry', category: 'Carpentry', hourlyRate: 70, visible: true }],
  profitSettings: {
    laborMarkup: 15,
    materialsMarkup: 20,
    overheadPercentage: 10,
    targetProfitMargin: 20,
  },
};

/**
 * A takeoff priced by the real repricer, then totalled by the real margin
 * arithmetic — the two halves whose disagreement was the bug.
 *
 * The material is deliberately one nothing sells and the standard book does
 * not list, so its price stays the model's and the markup is the only thing
 * acting on it. That keeps the arithmetic below checkable by hand.
 */
function quoteWith(settings: any) {
  const { estimate } = repriceEstimate(
    {
      materials: [{ name: 'Bespoke walnut panel', quantity: 2, unit: 'each', unitCost: 100, category: 'General' }],
      labor: [{ role: 'Carpentry', trade: 'carpentry', hours: 10, hourlyRate: 60 }],
      overheadPercent: 0.10,
      profitPercent: 0.10,
      contingencyPercent: 0.05,
    },
    { catalog: [], rates: SAVED_RATES.laborRates, settings, ratesAreStandard: false, settingsAreStandard: false },
  );

  const materialsSubtotal = estimate.materials.reduce((s: number, m: any) => s + (Number(m.totalCost) || 0), 0);
  const laborSubtotal = estimate.labor.reduce((s: number, l: any) => s + (Number(l.totalCost) || 0), 0);

  return {
    materialsSubtotal,
    laborSubtotal,
    margins: applyMargins({
      materialsSubtotal,
      laborSubtotal,
      additionalCostsSubtotal: 0,
      creditsSubtotal: 0,
      overheadPercent: estimate.overheadPercent,
      profitPercent: estimate.profitPercent,
      contingencyPercent: 0.05,
      taxRatePercent: estimate.taxRatePercent,
    }),
  };
}

test("the company's own margins reach the total at the right magnitude", () => {
  const { settings } = resolvePricing(null, SAVED_RATES);
  const { materialsSubtotal, laborSubtotal, margins: m } = quoteWith(settings);

  assert.equal(materialsSubtotal, 240, '2 x $100 plus his 20% markup');
  assert.equal(laborSubtotal, 805, '10h at his $70 rate plus his 15% labour markup');
  assert.equal(m.directCost, 1045);

  // THE TWO ASSERTIONS THAT WOULD HAVE FAILED. Both were 0.4.
  assert.equal(m.overheadPercent, 0.10, 'his 10%, not the clamp ceiling');
  assert.equal(m.profitPercent, 0.20, 'his 20%, not the clamp ceiling');

  assert.equal(m.overheadAmount, 104.5);
  assert.equal(m.profitAmount, 209);
  assert.equal(m.contingencyAmount, 52.25);
  assert.equal(m.preTaxTotal, 1410.75);

  // New Hampshire has no sales tax. This was 8% on every repriced quote.
  assert.equal(m.taxRate, 0);
  assert.equal(m.taxAmount, 0);

  assert.equal(m.totalCost, 1410.75);
  // The ratio is what a person would notice, so it is asserted directly.
  assert.equal(Number((m.totalCost / m.directCost).toFixed(2)), 1.35);
});

test('the standards land at their stated magnitude too', () => {
  // With nothing saved, the standard markups apply — as 30%, 0% and 15%, not
  // as three clamped ceilings.
  const { materialsSubtotal, laborSubtotal, margins: m } = quoteWith(STANDARD_PRICING);

  assert.equal(materialsSubtotal, 260, '2 x $100 plus the standard 30%');
  assert.equal(laborSubtotal, 700, 'the standard labour markup is 0%');
  assert.equal(m.overheadPercent, 0.10);
  assert.equal(m.profitPercent, 0.15);
  assert.equal(m.taxRate, 0, 'STANDARD_PRICING.taxRate is 0 on purpose');
  // 960 direct, plus 96 overhead, 144 profit and 48 contingency.
  assert.equal(m.directCost, 960);
  assert.equal(m.totalCost, 1248);
});

test('a real tax rate is applied to materials only, at its real size', () => {
  // A job in Massachusetts, set deliberately. As a percentage rather than a
  // fraction it would have clamped to 15%.
  const { settings } = resolvePricing({ config: { taxRate: 6.25 } }, SAVED_RATES);
  const { margins: m } = quoteWith(settings);

  assert.equal(m.taxRate, 0.0625);
  assert.equal(m.taxableMaterials, 240);
  assert.equal(m.taxAmount, 15, '6.25% of the materials, and nothing on the labour');
  assert.equal(m.totalCost, 1425.75);
});

test('margins deliberately set to zero stay zero', () => {
  // `Number(x) || fallback` was the original and zero is falsy, so a company
  // that had set no markup had the default put back silently.
  const { settings } = resolvePricing(null, {
    profitSettings: { materialsMarkup: 0, laborMarkup: 0, overheadPercentage: 0, targetProfitMargin: 0 },
  });
  const { materialsSubtotal, margins: m } = quoteWith(settings);

  assert.equal(materialsSubtotal, 200, 'no markup means no markup');
  assert.equal(m.overheadPercent, 0);
  assert.equal(m.profitPercent, 0);
  assert.equal(m.contingencyAmount, 45, "the model's 5% is untouched — the company holds no setting for it");
  assert.equal(m.totalCost, 945);
});

/* ── the arithmetic on its own ────────────────────────────────────────────── */

test('customer-supplied material is taken off the materials, not the total', () => {
  // Their own flooring: no markup, no tax, and overhead and profit must not be
  // calculated on material we did not provide.
  const m = applyMargins({
    materialsSubtotal: 1000,
    laborSubtotal: 1000,
    additionalCostsSubtotal: 0,
    creditsSubtotal: 200,
    overheadPercent: 0.10,
    profitPercent: 0.10,
    contingencyPercent: 0,
    taxRatePercent: 0.0625,
  });

  assert.equal(m.taxableMaterials, 800, 'the credit comes off before tax');
  assert.equal(m.taxAmount, 50);
  assert.equal(m.totalCost, 2250, '2000 + 200 overhead/profit + 50 tax - 200 credit');
});

test('a credit larger than the work is left visible rather than rounded away', () => {
  // Somebody has to look at it and decide, which they cannot do if it reads
  // as "nothing to pay".
  const m = applyMargins({
    materialsSubtotal: 100,
    laborSubtotal: 0,
    additionalCostsSubtotal: 0,
    creditsSubtotal: 500,
    overheadPercent: 0,
    profitPercent: 0,
    contingencyPercent: 0,
    taxRatePercent: 0,
  });
  assert.equal(m.totalCost, -400);
  assert.equal(m.taxableMaterials, 0, 'never negative, whatever the credit');
});

test('absent and zero are different answers', () => {
  assert.equal(pickFraction(undefined, 0.10, 0.4), 0.10, 'absent takes the default');
  assert.equal(pickFraction(null, 0.10, 0.4), 0.10);
  // `Number('')` is 0, so this one used to come back as a deliberate nought
  // per cent — silently removing a margin rather than applying the default.
  assert.equal(pickFraction('', 0.10, 0.4), 0.10, 'an empty field is absent, not zero');
  assert.equal(pickFraction(0, 0.10, 0.4), 0, 'zero is a decision');
  assert.equal(pickFraction('0', 0.10, 0.4), 0, 'and so is zero sent as a string');
  assert.equal(pickFraction(0.2, 0.10, 0.4), 0.2);
});

test('the ceiling still guards against nonsense', () => {
  // The ceiling is why the percent/fraction mix-up stayed invisible, but it is
  // also the only thing between a model returning 10 and a 1000% markup.
  assert.equal(pickFraction(10, 0.10, 0.4), 0.4);
  assert.equal(pickFraction(-5, 0.10, 0.4), 0, 'a negative margin is not a discount');
  // Not a number at all, so the default applies rather than the ceiling —
  // nonsense should fall back to the sane figure, not to the maximum.
  assert.equal(pickFraction(Number.NaN, 0.10, 0.4), 0.10);
  assert.equal(pickFraction(Infinity, 0.10, 0.4), 0.10);
  assert.equal(pickFraction('not a number', 0.10, 0.4), 0.10);
});
