/**
 * Whether a plan can actually be bought.
 *
 * The fixtures here are not invented. They are the two states that were live
 * in production on 2026-10-17 and that no screen reported:
 *
 *   plan_tier:content:studio   superseded 2026-09-29, note says do not
 *                              reactivate, priced 19900, no Stripe price
 *   plan_addon:vendor:content-studio
 *                              active:false, priced 19900, a Stripe TEST
 *                              price and no live price
 *   plan_tier:vendor:preferred active, live Stripe price — the one shape that
 *                              does work, kept here so a change that breaks
 *                              sellability fails loudly
 *
 * A predicate about whether money can be charged is exactly the code that
 * looks obviously right and has a hole in it, so both the refusals and the
 * acceptances are asserted.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readinessOf, priceIdFor, hasAmount, isSuperseded, summarise,
  type SellableRecord,
} from '../supabase/functions/server/pricingReadiness.ts';

/* ── the real records ─────────────────────────────────────────────────── */

const SUPERSEDED_TIER: SellableRecord = {
  id: 'studio',
  name: 'Studio',
  active: false,
  priceCents: 19900,
  interval: 'month',
  stripePriceId: null,
  stripePriceIdTest: null,
  supersededNote: 'Superseded 2026-09-29. … Do not reactivate.',
  supersededByAddOn: 'content-studio',
};

const TEST_PRICED_ADDON: SellableRecord = {
  id: 'content-studio',
  name: 'Content Centre — Studio',
  active: false,
  priceCents: 19900,
  interval: 'month',
  stripePriceId: null,
  stripePriceIdTest: 'price_1ULBAwEufRAAXCAlC79v6Pdw',
};

const UNPRICED_ADDON: SellableRecord = {
  id: 'content-studio',
  name: 'Content Centre — Studio',
  active: false,
  priceCents: 19900,
  interval: 'month',
  stripePriceId: null,
  stripePriceIdTest: null,
};

const SELLABLE_TIER: SellableRecord = {
  id: 'preferred',
  name: 'Professional',
  active: true,
  priceCents: 9900,
  interval: 'month',
  stripePriceId: 'price_1UIIbNEufRAAXCAlB6titwyx',
};

/* ── the shape that works ─────────────────────────────────────────────── */

test('an active tier with a live price is sellable, with no complaints', () => {
  const verdict = readinessOf(SELLABLE_TIER, 'live');
  assert.equal(verdict.sellable, true);
  assert.deepEqual(verdict.reasons, []);
  assert.equal(verdict.superseded, false);
  assert.equal(verdict.priceId, 'price_1UIIbNEufRAAXCAlB6titwyx');
});

test('the same tier is NOT sellable in test mode, because it has no test price', () => {
  // The two modes are separate answers. Conflating them is how a rehearsal
  // ends up charging somebody real money.
  const verdict = readinessOf(SELLABLE_TIER, 'test');
  assert.equal(verdict.sellable, false);
  assert.ok(verdict.reasons.includes('No Stripe test price.'));
});

/* ── failure one: the superseded tier ─────────────────────────────────── */

test('a superseded tier is flagged superseded, not merely unsellable', () => {
  const verdict = readinessOf(SUPERSEDED_TIER, 'live');
  assert.equal(verdict.sellable, false);
  assert.equal(verdict.superseded, true);
});

test('the superseded reason names its replacement and says not to reactivate', () => {
  // This is the sentence whose absence let a task file ask for Stripe prices
  // on three tiers their own records forbade reviving.
  const [first] = readinessOf(SUPERSEDED_TIER, 'live').reasons;
  assert.match(first, /content-studio/);
  assert.match(first, /[Dd]o not reactivate/);
});

test('superseded is reported first, before the switched-off and price noise', () => {
  const reasons = readinessOf(SUPERSEDED_TIER, 'live').reasons;
  assert.match(reasons[0], /Superseded/);
});

/* ── failure two: priced in cents, no Stripe price ────────────────────── */

test('an add-on with cents but no Stripe price is refused for the price, not the amount', () => {
  const verdict = readinessOf(UNPRICED_ADDON, 'live');
  assert.equal(verdict.sellable, false);
  assert.ok(verdict.reasons.includes('No Stripe live price.'));
  // It HAS an amount — 19900 — so that must not be among the complaints.
  assert.ok(!verdict.reasons.includes('No price set.'));
});

test('a test price does not make something sellable live', () => {
  // The exact state of the three vendor content add-ons: rehearsed, not sold.
  const live = readinessOf(TEST_PRICED_ADDON, 'live');
  assert.equal(live.sellable, false);
  assert.ok(live.reasons.includes('No Stripe live price.'));
  assert.equal(live.priceId, null);
});

test('that same add-on needs only switching on to be sellable in test', () => {
  const verdict = readinessOf(TEST_PRICED_ADDON, 'test');
  assert.deepEqual(verdict.reasons, ['Switched off.']);
  assert.equal(verdict.priceId, 'price_1ULBAwEufRAAXCAlC79v6Pdw');
});

/* ── both halves of the invariant ─────────────────────────────────────── */

test('switched on with no price is caught — a plan a customer cannot buy', () => {
  const verdict = readinessOf(
    { active: true, priceCents: 19900, interval: 'month', stripePriceId: null },
    'live',
  );
  assert.equal(verdict.sellable, false);
  assert.ok(verdict.reasons.includes('No Stripe live price.'));
});

test('a price with nothing switched on is caught — money left on the table', () => {
  const verdict = readinessOf(
    { active: false, priceCents: 19900, interval: 'month', stripePriceId: 'price_x' },
    'live',
  );
  assert.equal(verdict.sellable, false);
  assert.deepEqual(verdict.reasons, ['Switched off.']);
});

test('every reason is collected, not just the first', () => {
  const verdict = readinessOf({ active: false }, 'live');
  assert.ok(verdict.reasons.length >= 2, `expected several, got ${JSON.stringify(verdict.reasons)}`);
  assert.ok(verdict.reasons.includes('Switched off.'));
  assert.ok(verdict.reasons.includes('No price set.'));
});

/* ── cohorts price by band ────────────────────────────────────────────── */

test('a cohort priced only by bands counts as having an amount', () => {
  const cohort: SellableRecord = {
    active: true, priceCents: null, interval: 'month',
    stripePriceId: 'price_c', bands: [{ priceCents: 0 }, { priceCents: 14900 }],
  };
  assert.equal(hasAmount(cohort), true);
  assert.equal(readinessOf(cohort, 'live').sellable, true);
});

test('bands that are all zero are not an amount', () => {
  // Free may well be deliberate, but it is indistinguishable from a field
  // nobody filled in, so it is reported rather than guessed at.
  assert.equal(hasAmount({ bands: [{ priceCents: 0 }, { priceCents: 0 }] }), false);
  assert.equal(hasAmount({ bands: [] }), false);
  assert.equal(hasAmount({ priceCents: 0 }), false);
});

/* ── the interval, which Stripe refuses in front of the customer ──────── */

test('a missing interval is only complained about once there is an amount', () => {
  assert.ok(readinessOf({ active: true, priceCents: 9900, stripePriceId: 'p' }, 'live')
    .reasons.includes('No billing interval.'));
  // Nothing priced yet: naming the interval would be noise.
  assert.ok(!readinessOf({ active: true }, 'live').reasons.includes('No billing interval.'));
});

/* ── shapes that arrive from a JSON column ────────────────────────────── */

test('a missing record is refused rather than throwing', () => {
  for (const nothing of [null, undefined]) {
    const verdict = readinessOf(nothing, 'live');
    assert.equal(verdict.sellable, false);
    assert.equal(verdict.priceId, null);
  }
});

test('a blank or whitespace Stripe id is no id at all', () => {
  assert.equal(priceIdFor({ stripePriceId: '   ' }, 'live'), null);
  assert.equal(priceIdFor({ stripePriceId: '' }, 'live'), null);
  assert.equal(priceIdFor({}, 'live'), null);
});

test('a whitespace-only superseded note does not retire a record', () => {
  assert.equal(isSuperseded({ supersededNote: '   ' }), false);
  assert.equal(isSuperseded({ supersededNote: 'replaced' }), true);
  assert.equal(isSuperseded({}), false);
});

/* ── the summary a heading shows ──────────────────────────────────────── */

test('superseded records are counted apart, not as failures', () => {
  // "3 of 24 sellable" reads like a fault when some of the 24 are history.
  const counts = summarise([SELLABLE_TIER, SUPERSEDED_TIER, UNPRICED_ADDON], 'live');
  assert.deepEqual(counts, { sellable: 1, blocked: 1, superseded: 1, total: 3 });
});

test('an empty catalogue summarises to zeroes rather than throwing', () => {
  assert.deepEqual(summarise([], 'live'), { sellable: 0, blocked: 0, superseded: 0, total: 0 });
});
