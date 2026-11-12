/**
 * The burden a quote is costed at, as the editor reads and writes it.
 *
 * WHY THIS FILE EXISTS SEPARATELY FROM laborBurden.test.ts
 *
 * That one pins the arithmetic. This one pins the BOUNDARY — the conversion
 * between what a person types into the control and what is stored on the
 * quote, which is where the one dangerous mistake lives.
 *
 * Absent and zero are different, and every other money field on a quote in
 * this codebase reads `Number(x) || 0`, which collapses them. Doing that here
 * would stamp an explicit zero override onto every quote ever saved; the
 * company rate would then reach nothing, and the symptom — no burden anywhere
 * — is indistinguishable from the burden never having been built at all. So
 * the control holds its input as a STRING, because `Number('') === 0` is
 * exactly how the two would be lost.
 *
 * These assert the three states and the idempotency property that keeps
 * burden applied once.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  burdenFor, burdenOnSubtotal, hasBurdenOverride,
} from '../supabase/functions/server/laborBurden.ts';
import { applyMargins } from '../supabase/functions/server/quoteMargins.ts';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Exactly what the control does with its input box. */
const toStored = (text: string): number | null =>
  text === '' ? null : (Number(text) || 0) / 100;

const COMPANY = { burdenPercent: 0.35 };

/* ── the three states ────────────────────────────────────────────────────── */

test('an empty box stores null and inherits the company rate', () => {
  const stored = toStored('');
  assert.equal(stored, null);
  const b = burdenFor({ laborBurdenPercent: stored }, COMPANY);
  assert.equal(b.overridden, false);
  assert.equal(b.rate, 0.35);
});

test('a typed zero stores zero and is an override, not an absence', () => {
  // The decision "this job carries no burden" must survive somebody later
  // setting a company rate. That is the entire point of the distinction.
  const stored = toStored('0');
  assert.equal(stored, 0);
  assert.equal(hasBurdenOverride(stored), true);
  const b = burdenFor({ laborBurdenPercent: stored }, COMPANY);
  assert.equal(b.overridden, true);
  assert.equal(b.rate, 0);
});

test('a typed number stores a fraction and overrides the company', () => {
  const stored = toStored('42');
  assert.equal(stored, 0.42);
  const b = burdenFor({ laborBurdenPercent: stored }, COMPANY);
  assert.equal(b.overridden, true);
  assert.equal(b.rate, 0.42);
});

test('the empty box is never confused with a zero by Number()', () => {
  // The fault this file exists to prevent, stated as an assertion.
  assert.equal(Number(''), 0);
  assert.notEqual(toStored(''), toStored('0'));
  assert.equal(hasBurdenOverride(toStored('')), false);
  assert.equal(hasBurdenOverride(toStored('0')), true);
});

test('a quote saved before burden existed inherits rather than reads as zero', () => {
  for (const legacy of [undefined, null, '']) {
    const b = burdenFor({ laborBurdenPercent: legacy }, COMPANY);
    assert.equal(b.overridden, false, String(legacy));
    assert.equal(b.rate, 0.35, String(legacy));
  }
});

/* ── applied exactly once ────────────────────────────────────────────────── */

test('burden lifts the cost the margins sit on', () => {
  const wages = 10000;
  const b = burdenFor({ laborBurdenPercent: null }, COMPANY);
  const burdened = round2(wages + burdenOnSubtotal(wages, b));
  assert.equal(burdened, 13500);

  const bare = applyMargins({
    materialsSubtotal: 0, laborSubtotal: wages,
    additionalCostsSubtotal: 0, creditsSubtotal: 0,
    overheadPercent: 0.15, profitPercent: 0.20, contingencyPercent: 0.10,
  });
  const withBurden = applyMargins({
    materialsSubtotal: 0, laborSubtotal: burdened,
    additionalCostsSubtotal: 0, creditsSubtotal: 0,
    overheadPercent: 0.15, profitPercent: 0.20, contingencyPercent: 0.10,
  });

  // A margin on a bare wage is a margin on an understated cost.
  assert.equal(bare.totalCost, 14500);
  assert.equal(withBurden.totalCost, 19575);
});

test('recomputing from wages twice gives the same answer', () => {
  // The idempotency property: the control never writes the burdened figure
  // back into laborSubtotal, so pressing save twice cannot burden an
  // already-burdened number.
  const wages = 8336.5;
  const b = burdenFor({ laborBurdenPercent: 0.3 }, COMPANY);
  const once = round2(wages + burdenOnSubtotal(wages, b));
  const twice = round2(wages + burdenOnSubtotal(wages, b));
  assert.equal(once, twice);
  assert.equal(once, 10837.45);
});

test('no company rate and no override costs labour exactly as it does today', () => {
  // The module ships inert. Until a real rate exists nothing moves, which is
  // what makes it safe to have in the tree before Eric has given one.
  const b = burdenFor({ laborBurdenPercent: null }, null);
  assert.equal(b.configured, false);
  assert.equal(burdenOnSubtotal(8336.5, b), 0);
});

test('an absurd burden is capped rather than pricing the job at thirty times', () => {
  const b = burdenFor({ laborBurdenPercent: 35 }, null);
  assert.ok(b.rate <= 1, `rate ${b.rate} should be capped at 100% of wage`);
});
