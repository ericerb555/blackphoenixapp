/**
 * What an hour costs, as opposed to what it pays.
 *
 * WHY THESE ARE WORTH WRITING
 *
 * Burden is the kind of arithmetic that is wrong for years without anybody
 * noticing, because every symptom — thin margins, jobs that priced well and
 * earned badly — has a dozen other explanations. There is no screen on which
 * a 30% burden applied twice looks different from a healthy margin.
 *
 * So the properties below are pinned rather than described:
 *
 *   absent means ZERO, so this is inert until a real rate is stored
 *   a blended rate REPLACES the components, it does not stack on them
 *   a burdened figure is never fed back in — there is no function to do it
 *   rounding happens once, on the product, not on the rate
 *
 * The third is the one that costs money. `quoteMargins.ts` exists because two
 * modules disagreed about whether a rate was 10 or 0.10 and shipped 40%
 * overhead on every repriced quote; a burden applied twice is the same fault
 * with a different name.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  burdenOf, burdenedRate, burdenedLabor, burdenOnSubtotal, describeBurden,
  burdenFor, hasBurdenOverride,
} from '../supabase/functions/server/laborBurden.ts';
import { applyMargins } from '../supabase/functions/server/quoteMargins.ts';
import { normalizeQuoteDoc } from '../supabase/functions/server/quoteDoc.ts';
import { resolveBurden } from '../supabase/functions/server/pricingDefaults.ts';

/* ── inert until configured, which is what makes it safe to ship ─────────── */

test('no settings at all means no burden, and therefore no change', () => {
  const b = burdenOf(null);
  assert.equal(b.rate, 0);
  assert.equal(b.factor, 1);
  assert.equal(b.configured, false);
  assert.equal(b.source, 'unset');
  // A wage comes through as itself.
  assert.equal(burdenedRate(70, b), 70);
  assert.equal(burdenedLabor(70, 40, b).cost, 2800);
});

test('an empty settings object is the same as none', () => {
  const b = burdenOf({});
  assert.equal(b.configured, false);
  assert.equal(burdenedLabor(50, 10, b).cost, 500);
});

test('nothing is invented when only some components are known', () => {
  // Comp alone, which is how a company that has just read its policy starts.
  const b = burdenOf({ workersCompPercent: 9 });
  assert.equal(b.rate, 0.09);
  assert.equal(b.payrollTax, 0);
  assert.equal(b.benefits, 0);
});

/* ── the components, and the blended rate that replaces them ─────────────── */

test('the components add up, and a $70 wage costs $94.50 at 35%', () => {
  const b = burdenOf({
    payrollTaxPercent: 12,
    workersCompPercent: 9,
    liabilityPercent: 4,
    benefitsPercent: 10,
  });
  assert.equal(Math.round(b.rate * 100) / 100, 0.35);
  assert.equal(burdenedRate(70, b), 94.5);
});

test('a blended rate REPLACES the components rather than stacking on them', () => {
  const b = burdenOf({
    burdenPercent: 30,
    payrollTaxPercent: 12,
    workersCompPercent: 9,
    liabilityPercent: 4,
    benefitsPercent: 10,
  });
  // 30%, not 65%. Summing both is how a company doubles what it thinks it pays.
  assert.equal(b.rate, 0.3);
  assert.equal(b.source, 'blended');
  assert.equal(burdenedRate(100, b), 130);
});

test('a rate reads the same written as 35 or as 0.35', () => {
  assert.equal(burdenOf({ burdenPercent: 35 }).rate, burdenOf({ burdenPercent: 0.35 }).rate);
});

test('an absurd rate is capped rather than pricing a job at thirty times labour', () => {
  // 3500 typed where 35 was meant.
  assert.equal(burdenOf({ burdenPercent: 3500 }).rate, 1);
  // And four plausible components that add to an implausible total.
  assert.equal(burdenOf({
    payrollTaxPercent: 40, workersCompPercent: 40,
    liabilityPercent: 40, benefitsPercent: 40,
  }).rate, 1);
});

test('a negative or nonsense rate contributes nothing', () => {
  assert.equal(burdenOf({ burdenPercent: -10 }).rate, 0);
  assert.equal(burdenOf({ workersCompPercent: NaN as any }).rate, 0);
  assert.equal(burdenOf({ benefitsPercent: '' as any }).rate, 0);
});

/* ── the line, and where the rounding happens ────────────────────────────── */

test('a labour line reports its cost, its burden and its wage separately', () => {
  const b = burdenOf({ burdenPercent: 35 });
  const line = burdenedLabor(70, 40, b);
  assert.equal(line.unburdened, 2800);
  assert.equal(line.cost, 3780);
  assert.equal(line.burden, 980);
  // The wage is reported as the wage. It is never overwritten with the cost.
  assert.equal(line.wage, 70);
});

test('rounding happens once, on the product', () => {
  // A rate that does not round cleanly: 37.33 at 27.5% is 47.59575 an hour.
  const b = burdenOf({ burdenPercent: 27.5 });
  const line = burdenedLabor(37.33, 160, b);
  // 37.33 × 160 × 1.275 = 7615.32.
  assert.equal(line.cost, 7615.32);
  // Rounding the RATE first gives 47.60 × 160 = 7616.00 — 68c of drift on a
  // single line, small and visible and wrong in a column somebody adds up.
  assert.equal(Math.round(37.33 * 1.275 * 100) / 100 * 160, 7616);
  assert.notEqual(line.cost, 7616);
});

test('zero hours or a zero wage costs nothing, and does not throw', () => {
  const b = burdenOf({ burdenPercent: 35 });
  assert.equal(burdenedLabor(70, 0, b).cost, 0);
  assert.equal(burdenedLabor(0, 40, b).cost, 0);
  assert.equal(burdenedLabor(undefined, undefined, b).cost, 0);
  assert.equal(burdenedRate(0, b), 0);
});

/* ── what the existing quotes are missing ────────────────────────────────── */

test('the burden on an unburdened subtotal is reportable without changing it', () => {
  const b = burdenOf({ burdenPercent: 35 });
  /*
    Sherry Ducharme's quote, as stored: 8,336.50 of labour at a bare wage.

    8336.5 x 0.35 is exactly 2917.775 — a half cent. It comes out 2917.77
    rather than 2917.78 because Math.round(n * 100) / 100 is what every money
    figure in this codebase uses, and the double nearest 2917.775 sits
    fractionally below it. Pinned deliberately: a module that rounded its
    half-cents the other way would disagree with every total around it, and
    that is a worse fault than the half cent.
  */
  assert.equal(burdenOnSubtotal(8336.5, b), 2917.77);
  // Reporting it does not alter the stored figure in any way.
  assert.equal(burdenOnSubtotal(0, b), 0);
});

/* ── the interaction that actually costs money ───────────────────────────── */

test('margin on a burdened base is larger than margin on a wage', () => {
  const b = burdenOf({ burdenPercent: 35 });
  const labourAtWage = 6000;
  const labourAtCost = burdenedLabor(60, 100, b).cost; // 6000 of wage → 8100

  const thin = applyMargins({
    materialsSubtotal: 4000, laborSubtotal: labourAtWage,
    additionalCostsSubtotal: 0, creditsSubtotal: 0,
    overheadPercent: 0.1, profitPercent: 0.1, contingencyPercent: 0.05,
    taxRatePercent: 0,
  });
  const true_ = applyMargins({
    materialsSubtotal: 4000, laborSubtotal: labourAtCost,
    additionalCostsSubtotal: 0, creditsSubtotal: 0,
    overheadPercent: 0.1, profitPercent: 0.1, contingencyPercent: 0.05,
    taxRatePercent: 0,
  });

  assert.equal(labourAtCost, 8100);
  assert.equal(thin.totalCost, 12500);
  assert.equal(true_.totalCost, 15125);
  // $2,625 on a ten-thousand-dollar job — and the 25% margin was "earned"
  // on a cost base that was short by the burden, which is the quiet version
  // of the same loss.
  assert.equal(Math.round((true_.totalCost - thin.totalCost) * 100) / 100, 2625);
});

/* ── saying what it is made of ───────────────────────────────────────────── */

test('an unconfigured burden describes itself as nothing at all', () => {
  assert.equal(describeBurden(burdenOf({})), '');
});

test('the components are named so a reader can disagree with one of them', () => {
  const b = burdenOf({ payrollTaxPercent: 12, workersCompPercent: 9 });
  assert.equal(describeBurden(b), "12% payroll tax + 9% workers' comp");
  assert.equal(describeBurden(burdenOf({ burdenPercent: 30 })), '30% labour burden');
});

/* ── the per-quote override, and absent versus zero ──────────────────────── */

test('a quote with no opinion inherits the company rate', () => {
  const settings = { burdenPercent: 35 };
  const b = burdenFor({ id: 'q1' }, settings);
  assert.equal(b.rate, 0.35);
  assert.equal(b.overridden, false);
  assert.equal(b.source, 'blended');
});

test('a quote with its own number keeps it, whatever the company says', () => {
  const b = burdenFor({ laborBurdenPercent: 42 }, { burdenPercent: 35 });
  assert.equal(b.rate, 0.42);
  assert.equal(b.overridden, true);
  assert.equal(b.source, 'quote');
  assert.equal(burdenedRate(100, b), 142);
});

test('a deliberate ZERO on a quote is an override, not an absence', () => {
  // The case that makes `|| 0` wrong everywhere else in this file's story:
  // this job carries no burden on purpose and must not regain one when
  // somebody edits the company settings.
  const b = burdenFor({ laborBurdenPercent: 0 }, { burdenPercent: 35 });
  assert.equal(b.rate, 0);
  assert.equal(b.overridden, true);
  assert.equal(b.configured, true);
  assert.equal(burdenedLabor(70, 40, b).cost, 2800);
});

test('absent, null and empty all mean inherit', () => {
  const settings = { burdenPercent: 35 };
  for (const raw of [undefined, null, '']) {
    const b = burdenFor({ laborBurdenPercent: raw }, settings);
    assert.equal(b.rate, 0.35, `${JSON.stringify(raw)} must inherit`);
    assert.equal(b.overridden, false);
  }
  assert.equal(hasBurdenOverride(0), true);
  assert.equal(hasBurdenOverride(null), false);
  assert.equal(hasBurdenOverride(''), false);
  assert.equal(hasBurdenOverride(-1), false);
});

test('a quote override is capped like any other rate', () => {
  assert.equal(burdenFor({ laborBurdenPercent: 3500 }, null).rate, 1);
});

test('with no company rate and no override, nothing happens at all', () => {
  const b = burdenFor({}, {});
  assert.equal(b.rate, 0);
  assert.equal(b.configured, false);
  assert.equal(b.overridden, false);
});

/* ── and it has to survive being saved ───────────────────────────────────── */

test('the per-quote burden survives storage, and absent stays absent', () => {
  assert.equal(normalizeQuoteDoc({ id: 'q' }).laborBurdenPercent, null);
  assert.equal(normalizeQuoteDoc({ id: 'q', laborBurdenPercent: 42 }).laborBurdenPercent, 42);
  // The one that would have broken inheritance for every quote ever saved.
  assert.equal(normalizeQuoteDoc({ id: 'q', laborBurdenPercent: 0 }).laborBurdenPercent, 0);
  assert.equal(normalizeQuoteDoc({ id: 'q', laborBurdenPercent: '' }).laborBurdenPercent, null);
  assert.equal(normalizeQuoteDoc({ id: 'q', laborBurdenPercent: 'abc' }).laborBurdenPercent, null);
});

test('a saved quote resolves to the same burden it had before saving', () => {
  const settings = { burdenPercent: 35 };
  const quote = { id: 'q', laborBurdenPercent: 18 };
  assert.equal(burdenFor(normalizeQuoteDoc(quote), settings).rate, burdenFor(quote, settings).rate);
});

/* ── the company setting, which has no standard to fall back on ──────────── */

test('nothing stored means no burden — not a plausible default', () => {
  assert.deepEqual(resolveBurden(null, null), {});
  assert.equal(burdenOf(resolveBurden(null, null)).rate, 0);
  // The whole reason burden is absent from STANDARD_PRICING: a sensible-looking
  // 30% would have added a third to the cost of every job in the system.
  assert.equal(burdenOf(resolveBurden({ config: {} }, {})).rate, 0);
});

test('the rates screen can hold it, and the settings screen overrides it', () => {
  const fromRates = resolveBurden(null, { profitSettings: { burdenPercent: 28 } });
  assert.equal(burdenOf(fromRates).rate, 0.28);

  const both = resolveBurden(
    { config: { burden: { burdenPercent: 35 } } },
    { profitSettings: { burdenPercent: 28 } },
  );
  assert.equal(burdenOf(both).rate, 0.35);
});

test('the four components survive the trip out of storage', () => {
  const b = burdenOf(resolveBurden({
    config: { burden: { payrollTaxPercent: 12, workersCompPercent: 9, liabilityPercent: 4, benefitsPercent: 10 } },
  }, null));
  assert.equal(Math.round(b.rate * 100) / 100, 0.35);
  assert.equal(describeBurden(b), "12% payroll tax + 9% workers' comp + 4% liability + 10% benefits");
});

test('a company rate and a quote override resolve together', () => {
  const settings = resolveBurden({ config: { burden: { burdenPercent: 35 } } }, null);
  assert.equal(burdenFor({}, settings).rate, 0.35);
  assert.equal(burdenFor({ laborBurdenPercent: 18 }, settings).rate, 0.18);
  assert.equal(burdenFor({ laborBurdenPercent: 0 }, settings).rate, 0);
});
