/**
 * Whether a listed product comes off sale, and whether its price moves.
 *
 * Both failures here are quiet and expensive. A product delisted on a transient
 * supplier error is revenue nobody notices stopping; a product left listed
 * below cost loses money every time it sells. So the boundary cases are
 * asserted rather than reasoned about.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalisePolicy, decideListing, marginOf, priceForFloor,
  POLICY_DEFAULTS, MARGIN_FLOOR_MAX, REPRICE_BAND_MAX,
} from '../supabase/functions/server/storeCataloguePolicy.ts';

const POLICY = normalisePolicy({ configured: true, marginFloor: 0.35, repriceBand: 0.1 });
const LIVE = { price: 20, cost: 8, shipping: 2, isActive: true };

// ── The policy record ───────────────────────────────────────────────────────

test('a policy nobody set is not configured, whatever numbers it carries', () => {
  assert.equal(normalisePolicy(undefined).configured, false);
  assert.equal(normalisePolicy({}).configured, false);
  assert.equal(normalisePolicy({ marginFloor: 0.4 }).configured, false);
  // Only an explicit true counts, so a half-written record cannot start
  // changing prices.
  assert.equal(normalisePolicy({ configured: 'yes' }).configured, false);
  assert.equal(normalisePolicy({ configured: true }).configured, true);
});

test('out-of-range figures fall back instead of through', () => {
  assert.equal(normalisePolicy({ marginFloor: 0 }).marginFloor, POLICY_DEFAULTS.marginFloor);
  assert.equal(normalisePolicy({ marginFloor: -1 }).marginFloor, POLICY_DEFAULTS.marginFloor);
  assert.equal(normalisePolicy({ marginFloor: MARGIN_FLOOR_MAX }).marginFloor, POLICY_DEFAULTS.marginFloor);
  assert.equal(normalisePolicy({ repriceBand: REPRICE_BAND_MAX + 0.1 }).repriceBand, POLICY_DEFAULTS.repriceBand);
  assert.equal(normalisePolicy({ repriceBand: -0.1 }).repriceBand, POLICY_DEFAULTS.repriceBand);
});

test('a band of exactly zero is kept — it means "always ask"', () => {
  // Distinct from "unset". Somebody who wants no automatic re-pricing must be
  // able to say so without it being read as a missing value.
  assert.equal(normalisePolicy({ configured: true, repriceBand: 0 }).repriceBand, 0);
});

// ── Arithmetic ──────────────────────────────────────────────────────────────

test('margin is a share of the selling price, with shipping counted as cost', () => {
  assert.equal(marginOf(20, 8, 2), 0.5);
  assert.equal(marginOf(10, 10, 0), 0);
  assert.equal(marginOf(0, 5, 0), 0);
  assert.ok(marginOf(10, 12, 0) < 0, 'selling below cost must read as a negative margin');
});

test('the price that clears the floor is rounded up, never down', () => {
  // Rounding down would leave the listing a fraction under the floor, which is
  // the one direction that defeats the point of having one.
  assert.equal(priceForFloor(8, 2, 0.35), 15.39);
  assert.ok(marginOf(priceForFloor(8, 2, 0.35), 8, 2) >= 0.35);
  assert.equal(priceForFloor(10, 0, 0.5), 20);
});

// ── Unknown is not zero ─────────────────────────────────────────────────────

test('CJ saying nothing changes nothing', () => {
  const action = decideListing(LIVE, { cost: null, stock: null }, POLICY);
  assert.equal(action.kind, 'none');
  assert.match(action.why, /did not answer/);
});

test('a transient failure cannot empty the catalogue', () => {
  // The expensive mistake: reading "unknown" as "no stock" and delisting
  // everything on one bad afternoon at CJ.
  for (const facts of [{ cost: null, stock: null }, { cost: 8, stock: null }]) {
    assert.notEqual(decideListing(LIVE, facts, POLICY).kind, 'delist');
  }
});

// ── Stock ───────────────────────────────────────────────────────────────────

test('no stock comes off sale', () => {
  const action = decideListing(LIVE, { cost: 8, stock: 0 }, POLICY);
  assert.equal(action.kind, 'delist');
  assert.equal(action.kind === 'delist' && action.reason, 'out-of-stock');
});

test('already off sale and still out of stock does nothing', () => {
  const action = decideListing({ ...LIVE, isActive: false, offSaleReason: 'out-of-stock' }, { cost: 8, stock: 0 }, POLICY);
  assert.equal(action.kind, 'none');
});

test('back in stock returns to sale when the margin still holds', () => {
  const off = { ...LIVE, isActive: false, offSaleReason: 'out-of-stock' };
  assert.equal(decideListing(off, { cost: 8, stock: 5 }, POLICY).kind, 'relist');
});

test('back in stock stays off sale if the margin no longer holds', () => {
  const off = { ...LIVE, isActive: false, offSaleReason: 'out-of-stock' };
  const action = decideListing(off, { cost: 17, stock: 5 }, POLICY);
  assert.equal(action.kind, 'none');
  assert.match(action.why, /stays off sale/);
});

test('something a person took off sale is never relisted by the job', () => {
  // No offSaleReason means the machine did not do it, so the machine does not
  // undo it. Overriding a human decision silently is worse than a lost sale.
  const off = { ...LIVE, isActive: false };
  assert.equal(decideListing(off, { cost: 8, stock: 50 }, POLICY).kind, 'none');
  const off2 = { ...LIVE, isActive: false, offSaleReason: 'withdrawn by owner' };
  assert.equal(decideListing(off2, { cost: 8, stock: 50 }, POLICY).kind, 'none');
});

// ── Cost drift ──────────────────────────────────────────────────────────────

test('a healthy margin is left alone', () => {
  assert.equal(decideListing(LIVE, { cost: 8, stock: 10 }, POLICY).kind, 'none');
});

test('a cost rise inside the band re-prices to exactly clear the floor', () => {
  // cost 11 + shipping 2 at a 35% floor needs 20.00; the current price is 20,
  // so nudge it just above.
  const action = decideListing(LIVE, { cost: 11.5, stock: 10 }, POLICY);
  assert.equal(action.kind, 'reprice');
  if (action.kind === 'reprice') {
    assert.ok(action.newPrice > LIVE.price);
    assert.ok(action.marginAfter >= POLICY.marginFloor, 'the new price must clear the floor');
    assert.ok(action.newPrice / LIVE.price - 1 <= POLICY.repriceBand + 1e-9, 'and stay inside the band');
  }
});

test('a cost rise outside the band stops and asks', () => {
  const action = decideListing(LIVE, { cost: 16, stock: 10 }, POLICY);
  assert.equal(action.kind, 'ask');
  if (action.kind === 'ask') {
    assert.ok(action.neededPrice > LIVE.price * (1 + POLICY.repriceBand));
    assert.ok(action.marginNow < POLICY.marginFloor);
  }
});

test('a band of zero always asks, never re-prices', () => {
  const alwaysAsk = normalisePolicy({ configured: true, marginFloor: 0.35, repriceBand: 0 });
  const action = decideListing(LIVE, { cost: 13.1, stock: 10 }, alwaysAsk);
  assert.equal(action.kind, 'ask');
});

test('selling below cost is caught, not merely noted', () => {
  const action = decideListing({ ...LIVE, price: 9 }, { cost: 12, stock: 10 }, POLICY);
  assert.ok(action.kind === 'ask' || action.kind === 'reprice', `expected an intervention, got ${action.kind}`);
});

test('a cost that FELL does not cut the price', () => {
  // Lowering a price is a revenue decision. The job does not get to make it,
  // even though the arithmetic would allow it.
  const action = decideListing(LIVE, { cost: 2, stock: 10 }, POLICY);
  assert.equal(action.kind, 'none');
});

test('stock takes precedence over margin', () => {
  // Nothing can be sold at any price with no stock, so the stock answer wins
  // and the margin question waits until it is back.
  const action = decideListing(LIVE, { cost: 19, stock: 0 }, POLICY);
  assert.equal(action.kind, 'delist');
  assert.equal(action.kind === 'delist' && action.reason, 'out-of-stock');
});
