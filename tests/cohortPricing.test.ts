/**
 * What a cohort charges, and what it reports earning.
 *
 * This is the logic the whole consolidation was chosen for — pricing by seat
 * count through bands and a scaling curve — and it previously lived inline in
 * an HTTP handler where nothing could test it. Three of these tests cover
 * faults that produced a WRONG PRICE rather than an error, which is the one
 * kind of failure a customer finds on their statement rather than on screen.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bandFor, priceFor, spotsRemaining, isFull, monthlyRevenueOf, type Cohort,
} from '../supabase/functions/server/cohortPricing.ts';

const banded = (over: Partial<Cohort> = {}): Cohort => ({
  id: 'coh-1',
  basePrice: 100,
  pricingTiers: [
    { name: 'small', minUsers: 0, maxUsers: 9, priceMultiplier: 1 },
    { name: 'mid', minUsers: 10, maxUsers: 49, priceMultiplier: 0.9 },
    { name: 'large', minUsers: 50, maxUsers: 100000, priceMultiplier: 0.75 },
  ],
  ...over,
});

// ── Bands ─────────────────────────────────────────────────────────────────

test('a seat count lands in its band, and the boundaries belong to the lower one', () => {
  assert.equal(bandFor(banded(), 1)?.name, 'small');
  assert.equal(bandFor(banded(), 9)?.name, 'small', '9 is the top of small');
  assert.equal(bandFor(banded(), 10)?.name, 'mid', '10 is the bottom of mid');
  assert.equal(bandFor(banded(), 49)?.name, 'mid');
  assert.equal(bandFor(banded(), 50)?.name, 'large');
});

test('bands entered out of order are still read smallest first', () => {
  const jumbled = banded({
    pricingTiers: [
      { name: 'large', minUsers: 50, maxUsers: 100000, priceMultiplier: 0.75 },
      { name: 'small', minUsers: 0, maxUsers: 9, priceMultiplier: 1 },
      { name: 'mid', minUsers: 10, maxUsers: 49, priceMultiplier: 0.9 },
    ],
  });
  assert.equal(bandFor(jumbled, 5)?.name, 'small');
  assert.equal(bandFor(jumbled, 30)?.name, 'mid');
});

test('no bands, or a count past every band, yields none rather than throwing', () => {
  assert.equal(bandFor({ basePrice: 50 }, 10), null);
  assert.equal(bandFor(null, 10), null);
  assert.equal(bandFor(banded(), 999999), null, 'past the last ceiling');
});

// ── Price ─────────────────────────────────────────────────────────────────

test('the band multiplier is applied to the base price', () => {
  assert.equal(priceFor(banded(), 5).price, 100);
  assert.equal(priceFor(banded(), 20).price, 90);
  assert.equal(priceFor(banded(), 80).price, 75);
});

test('with no band the base price stands', () => {
  assert.equal(priceFor({ basePrice: 149 }, 12).price, 149);
});

/**
 * Fault 1. `Math.max(cohort.priceFloor, …)` with no floor configured is
 * `Math.max(undefined, …)` — NaN. Every cohort without an explicit floor and
 * ceiling priced at NaN, which reaches a customer as a blank or a zero.
 */
test('A COHORT WITH NO FLOOR OR CEILING STILL PRICES — it used to return NaN', () => {
  const result = priceFor({ basePrice: 199 }, 1);
  assert.equal(Number.isFinite(result.price), true);
  assert.equal(result.price, 199);
});

test('a missing base price is zero, not NaN', () => {
  assert.equal(priceFor({}, 10).price, 0);
  assert.equal(priceFor(null, 10).price, 0);
  assert.equal(priceFor({ basePrice: 'nonsense' as any }, 10).price, 0);
});

/**
 * Fault 2. `log10(seats/1000)` is negative below a thousand seats and
 * -Infinity at zero, so the logarithmic curve REDUCED the price as an account
 * got smaller — inverting it for the small accounts that are most of this
 * business.
 */
test('LOGARITHMIC SCALING NEVER REDUCES THE PRICE BELOW ITS THRESHOLD', () => {
  const scaled = banded({ autoScaling: true, scalingStrategy: 'logarithmic', scalingMultiplier: 0.5 });
  const plain = banded();

  // Compared against the same seat count unscaled, so the band's own
  // multiplier is not mistaken for the curve.
  for (const seats of [0, 1, 100, 999, 1000]) {
    assert.equal(
      priceFor(scaled, seats).price,
      priceFor(plain, seats).price,
      `${seats} seats: the curve must not discount below its threshold`,
    );
  }
  assert.ok(Number.isFinite(priceFor(scaled, 0).price), 'zero seats must not be -Infinity');
  assert.ok(
    priceFor(scaled, 10000).price > priceFor(plain, 10000).price,
    'above the threshold it still scales up',
  );
});

test('linear and exponential scaling add rather than subtract', () => {
  const linear = banded({ autoScaling: true, scalingStrategy: 'linear', scalingMultiplier: 1 });
  assert.ok(priceFor(linear, 50).price >= 75);
  const exponential = banded({ autoScaling: true, scalingStrategy: 'exponential', scalingMultiplier: 2 });
  assert.ok(priceFor(exponential, 50).price >= 75);
});

test('scaling is off unless it is switched on', () => {
  assert.equal(priceFor(banded({ scalingStrategy: 'linear', scalingMultiplier: 5 }), 80).price, 75);
  assert.equal(priceFor(banded(), 80).scalingApplied, false);
});

test('the ceiling caps and the floor lifts, and each says which happened', () => {
  const capped = priceFor(banded({ priceCeiling: 80 }), 5);
  assert.equal(capped.price, 80);
  assert.equal(capped.clampedBy, 'ceiling');

  const lifted = priceFor(banded({ priceFloor: 90 }), 80);
  assert.equal(lifted.price, 90);
  assert.equal(lifted.clampedBy, 'floor');
});

/**
 * Fault 3. A floor above a ceiling silently returned the ceiling — a figure
 * lower than the least somebody deliberately said they would accept.
 */
test('A FLOOR ABOVE THE CEILING WINS — it is the least we said we would take', () => {
  const result = priceFor(banded({ priceFloor: 120, priceCeiling: 80 }), 5);
  assert.equal(result.price, 120);
  assert.equal(result.clampedBy, 'floor');
});

test('a price is rounded to whole cents', () => {
  const odd = priceFor({ basePrice: 33.333 }, 1);
  assert.equal(odd.price, 33.33);
});

// ── Spots ─────────────────────────────────────────────────────────────────

/**
 * Null and zero are different answers: null is "sell as many as you like",
 * zero is "this one is full". A screen confusing them either refuses an
 * uncapped cohort or oversells a capped one.
 */
test('AN UNCAPPED COHORT REPORTS NULL, NOT ZERO', () => {
  assert.equal(spotsRemaining({ id: 'c' }), null);
  assert.equal(isFull({ id: 'c' }), false, 'uncapped is never full');
});

test('spots count down, and never below zero', () => {
  assert.equal(spotsRemaining({ id: 'c', maxSpots: 10, activeSubscribers: 3 }), 7);
  assert.equal(spotsRemaining({ id: 'c', maxSpots: 10, activeSubscribers: 10 }), 0);
  assert.equal(spotsRemaining({ id: 'c', maxSpots: 10, activeSubscribers: 14 }), 0, 'oversold is full, not negative');
  assert.equal(isFull({ id: 'c', maxSpots: 10, activeSubscribers: 10 }), true);
});

// ── Revenue, derived ──────────────────────────────────────────────────────

/**
 * The stored `monthlyRevenue` field is what this replaces. A figure written by
 * hand drifts from what is actually being paid, silently.
 */
test('revenue is summed from the memberships, priced at each one\'s size', () => {
  const cohort = banded({ id: 'coh-1' });
  const revenue = monthlyRevenueOf(cohort, [
    { cohortId: 'coh-1', status: 'active', seats: 5 },   // 100
    { cohortId: 'coh-1', status: 'active', seats: 20 },  // 90
    { cohortId: 'coh-1', status: 'active', seats: 80 },  // 75
  ]);
  assert.equal(revenue, 265);
});

test('a trial earns nothing, and a cancelled membership earns nothing', () => {
  const cohort = banded({ id: 'coh-1' });
  assert.equal(monthlyRevenueOf(cohort, [{ cohortId: 'coh-1', status: 'trialing', seats: 5 }]), 0);
  assert.equal(monthlyRevenueOf(cohort, [{ cohortId: 'coh-1', status: 'cancelled', seats: 5 }]), 0);
});

test('another cohort\'s memberships are not counted', () => {
  const cohort = banded({ id: 'coh-1' });
  assert.equal(monthlyRevenueOf(cohort, [{ cohortId: 'coh-2', status: 'active', seats: 5 }]), 0);
});

test('no memberships is zero revenue, not a stored figure', () => {
  assert.equal(monthlyRevenueOf(banded(), []), 0);
  assert.equal(monthlyRevenueOf(banded({ id: undefined }), [{ cohortId: 'coh-1', status: 'active' }]), 0);
});
