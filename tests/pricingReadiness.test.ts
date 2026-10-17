/**
 * Whether a plan can actually be bought, for a screen.
 *
 * The fixtures are not invented. They are states that were live in production
 * on 2026-10-17 and that no screen reported:
 *
 *   plan_tier:content:studio   superseded 2026-09-29, note says do not
 *                              reactivate, priced 19900, no Stripe price
 *   plan_addon:vendor:content-studio
 *                              active:false, priced 19900, a Stripe TEST
 *                              price and no live price
 *   plan_tier:vendor:preferred active, live Stripe price — the shape that does
 *                              work, kept so a change breaking sellability
 *                              fails loudly
 *
 * THE MOST IMPORTANT TEST IN HERE
 *
 * `agrees with isPurchasable`. This module delegates to `planTier.ts` rather
 * than deciding for itself, because the first version of it did decide for
 * itself and the two already disagreed about `active: undefined`. A screen and
 * a checkout disagreeing about whether a plan is on sale surfaces as a
 * customer complaint, not as a failing test — so it is pinned here as one.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readinessOf, hasBandedPrice, isSuperseded, summarise,
  type SellableRecord,
} from '../supabase/functions/server/pricingReadiness.ts';
// `priceIdFor` comes from its owner: it returns '' for absent, where this
// module reports null, and the two spellings must not be confused.
import { isPurchasable, priceIdFor } from '../supabase/functions/server/planTier.ts';

/* ── the real records ─────────────────────────────────────────────────── */

const SUPERSEDED_TIER: SellableRecord = {
  id: 'studio',
  name: 'Studio',
  active: false,
  priceCents: 19900,
  interval: 'month',
  supersededNote: 'Superseded 2026-09-29. … Do not reactivate.',
  supersededByAddOn: 'content-studio',
};

const TEST_PRICED_ADDON: SellableRecord = {
  id: 'content-studio',
  name: 'Content Centre — Studio',
  active: false,
  priceCents: 19900,
  interval: 'month',
  stripePriceIdTest: 'price_1ULBAwEufRAAXCAlC79v6Pdw',
};

const UNPRICED_ADDON: SellableRecord = {
  id: 'content-solo',
  name: 'Content Centre — Solo',
  active: true,
  priceCents: 7900,
  interval: 'month',
};

const SELLABLE_TIER: SellableRecord = {
  id: 'preferred',
  name: 'Professional',
  active: true,
  priceCents: 9900,
  interval: 'month',
  stripePriceId: 'price_1UIIbNEufRAAXCAlB6titwyx',
};

/* ── the one that must never drift ────────────────────────────────────── */

test('agrees with isPurchasable on every non-superseded, non-banded record', () => {
  const records: SellableRecord[] = [
    SELLABLE_TIER,
    TEST_PRICED_ADDON,
    UNPRICED_ADDON,
    { active: true, priceCents: 9900, stripePriceId: 'p', interval: 'month' },
    { active: false, priceCents: 9900, stripePriceId: 'p', interval: 'month' },
    { active: true, priceCents: 0, stripePriceId: 'p', interval: 'month' },
    { active: true, priceCents: 9900, interval: 'month' },
    // The case the two versions actually disagreed about. `isPurchasable`
    // grandfathers a missing `active`; the standalone copy called it switched
    // off. Whatever the answer is, both must give the same one.
    { priceCents: 9900, stripePriceId: 'p', interval: 'month' },
    {},
  ];

  for (const mode of ['live', 'test'] as const) {
    for (const record of records) {
      assert.equal(
        readinessOf(record, mode).sellable,
        isPurchasable(record, mode),
        `disagreed in ${mode} mode on ${JSON.stringify(record)}`,
      );
    }
  }
});

test('a missing active field is sellable, matching the grandfathering upstream', () => {
  // Pinned explicitly, because this is the behaviour the duplicate got wrong.
  const grandfathered: SellableRecord = { priceCents: 9900, stripePriceId: 'p', interval: 'month' };
  assert.equal(isPurchasable(grandfathered, 'live'), true);
  assert.equal(readinessOf(grandfathered, 'live').sellable, true);
});

/* ── the shape that works ─────────────────────────────────────────────── */

test('an active tier with a live price is sellable, with no complaints', () => {
  const verdict = readinessOf(SELLABLE_TIER, 'live');
  assert.equal(verdict.sellable, true);
  assert.deepEqual(verdict.reasons, []);
  assert.equal(verdict.superseded, false);
  assert.equal(verdict.priceId, 'price_1UIIbNEufRAAXCAlB6titwyx');
});

test('the same tier is not sellable in test mode, and the reason names the mode', () => {
  // The two Stripe worlds are separate answers; conflating them is how a
  // rehearsal charges somebody real money.
  const verdict = readinessOf(SELLABLE_TIER, 'test');
  assert.equal(verdict.sellable, false);
  assert.match(verdict.reasons.join(' '), /test/);
  assert.equal(verdict.priceId, null);
  assert.equal(priceIdFor(SELLABLE_TIER, 'test'), '', 'upstream spells absent as an empty string');
});

/* ── superseded: the one thing this module adds ───────────────────────── */

test('a superseded tier is flagged superseded, not merely unsellable', () => {
  const verdict = readinessOf(SUPERSEDED_TIER, 'live');
  assert.equal(verdict.sellable, false);
  assert.equal(verdict.superseded, true);
});

test('the superseded reason names its replacement and says not to reactivate', () => {
  // The sentence whose absence let a task file ask for Stripe prices on three
  // tiers their own records forbade reviving.
  const [first] = readinessOf(SUPERSEDED_TIER, 'live').reasons;
  assert.match(first, /content-studio/);
  assert.match(first, /[Dd]o not reactivate/);
});

test('superseded is reported before anything else', () => {
  assert.match(readinessOf(SUPERSEDED_TIER, 'live').reasons[0], /Superseded/);
});

test('a superseded record with no named replacement still says do not reactivate', () => {
  const verdict = readinessOf({ supersededNote: 'replaced', active: true }, 'live');
  assert.equal(verdict.superseded, true);
  assert.match(verdict.reasons[0], /[Dd]o not reactivate/);
});

test('isSuperseded ignores whitespace-only markers', () => {
  assert.equal(isSuperseded({ supersededNote: '   ' }), false);
  assert.equal(isSuperseded({ supersededByAddOn: '  ' }), false);
  assert.equal(isSuperseded({ supersededNote: 'replaced' }), true);
  assert.equal(isSuperseded({}), false);
  assert.equal(isSuperseded(null), false);
});

/* ── priced but unsellable, the state 15 add-ons are in ───────────────── */

test('an active add-on priced in cents with no Stripe price is refused', () => {
  const verdict = readinessOf(UNPRICED_ADDON, 'live');
  assert.equal(verdict.sellable, false);
  assert.match(verdict.reasons.join(' '), /Stripe/);
  assert.equal(verdict.priceId, null);
  assert.equal(isPurchasable(UNPRICED_ADDON, 'live'), false);
});

test('a test price is reported as a test price, not as a live one', () => {
  assert.equal(priceIdFor(TEST_PRICED_ADDON, 'test'), 'price_1ULBAwEufRAAXCAlC79v6Pdw');
  assert.equal(priceIdFor(TEST_PRICED_ADDON, 'live'), '');
  // …and this module normalises that to null.
  assert.equal(readinessOf(TEST_PRICED_ADDON, 'live').priceId, null);
});

/* ── cohorts price by band, which planTier.ts knows nothing about ─────── */

test('a cohort priced only by bands is sellable with a price id', () => {
  const cohort: SellableRecord = {
    active: true, interval: 'month',
    stripePriceId: 'price_c', bands: [{ priceCents: 0 }, { priceCents: 14900 }],
  };
  assert.equal(hasBandedPrice(cohort), true);
  assert.equal(readinessOf(cohort, 'live').sellable, true);
});

test('a banded cohort is not refused for having no flat price', () => {
  // Delegating this one would produce "no price set", which is wrong rather
  // than merely unhelpful — the price is in the bands.
  const cohort: SellableRecord = {
    active: true, interval: 'month', stripePriceId: 'price_c',
    bands: [{ priceCents: 14900 }],
  };
  assert.ok(!readinessOf(cohort, 'live').reasons.some((r) => /no price set/i.test(r)));
});

test('a banded cohort still needs a Stripe price and to be switched on', () => {
  const off = readinessOf({ active: false, bands: [{ priceCents: 14900 }], stripePriceId: 'p' }, 'live');
  assert.equal(off.sellable, false);
  assert.ok(off.reasons.some((r) => /not currently offered/i.test(r)));

  const unpriced = readinessOf({ active: true, bands: [{ priceCents: 14900 }] }, 'live');
  assert.equal(unpriced.sellable, false);
  assert.ok(unpriced.reasons.some((r) => /Stripe/i.test(r)));
});

test('bands that are all zero are not a price', () => {
  // Free may be deliberate, but it cannot be told apart from a field nobody
  // filled in, so it is reported rather than guessed at.
  assert.equal(hasBandedPrice({ bands: [{ priceCents: 0 }, { priceCents: 0 }] }), false);
  assert.equal(hasBandedPrice({ bands: [] }), false);
  assert.equal(hasBandedPrice({}), false);
  assert.equal(hasBandedPrice(null), false);
});

/* ── shapes that arrive from a JSON column ────────────────────────────── */

test('a missing record is refused rather than throwing', () => {
  for (const nothing of [null, undefined]) {
    const verdict = readinessOf(nothing, 'live');
    assert.equal(verdict.sellable, false);
    assert.equal(verdict.priceId, null);
    assert.equal(verdict.reasons.length, 1);
  }
});

test('a blank or whitespace Stripe id is no id at all', () => {
  assert.equal(priceIdFor({ stripePriceId: '   ' }, 'live'), '');
  assert.equal(priceIdFor({}, 'live'), '');
  // What a caller of THIS module sees.
  assert.equal(readinessOf({ stripePriceId: '   ', active: true, priceCents: 100 }, 'live').priceId, null);
});

/* ── the summary a heading shows ──────────────────────────────────────── */

test('superseded records are counted apart, not as failures', () => {
  // "1 of 3 sellable" reads like a fault when one of the 3 is history.
  const counts = summarise([SELLABLE_TIER, SUPERSEDED_TIER, UNPRICED_ADDON], 'live');
  assert.deepEqual(counts, { sellable: 1, blocked: 1, superseded: 1, total: 3 });
});

test('an empty catalogue summarises to zeroes rather than throwing', () => {
  assert.deepEqual(summarise([], 'live'), { sellable: 0, blocked: 0, superseded: 0, total: 0 });
});

test('the summary counts every record exactly once', () => {
  const records = [SELLABLE_TIER, SUPERSEDED_TIER, UNPRICED_ADDON, TEST_PRICED_ADDON, null];
  const { sellable, blocked, superseded, total } = summarise(records, 'live');
  assert.equal(sellable + blocked + superseded, total);
  assert.equal(total, records.length);
});
