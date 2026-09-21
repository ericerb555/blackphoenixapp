/**
 * Subscription tiers, and what an account is entitled to.
 *
 * WHY THESE ASSERTIONS
 *
 * Both questions here fail quietly rather than loudly. A tier sold without a
 * Stripe price behind it takes money for a subscription that does not exist in
 * Stripe — nothing to renew, nothing to cancel, and the webhook that grants
 * access never fires. A lapsed trial that resolves to full access gives the
 * product away by a date comparison nobody wrote.
 *
 * Neither throws. Neither shows up on a screen as an error. So they are pinned
 * here, where they run for free on every change.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isPurchasable, notPurchasableReason, publicTier, resolveEntitlement,
  withinLimit, FREE_LEVEL, AUDIENCES,
  type PlanTier,
} from '../supabase/functions/server/planTier.ts';

const tier = (over: Partial<PlanTier> = {}): PlanTier => ({
  id: 'listed',
  audience: 'vendor',
  name: 'Listed',
  features: ['250 catalogue products'],
  limits: { products: 250, deals: 3 },
  stripePriceId: 'price_123',
  priceCents: 2900,
  interval: 'month',
  ...over,
});

// ── may this be sold? ──────────────────────────────────────────────────────

test('a tier with a real Stripe price and a real price is purchasable', () => {
  assert.ok(isPurchasable(tier()));
});

test('no Stripe price id means it cannot be bought, whatever else is set', () => {
  assert.ok(!isPurchasable(tier({ stripePriceId: undefined })));
  assert.ok(!isPurchasable(tier({ stripePriceId: '' })));
  assert.ok(!isPurchasable(tier({ stripePriceId: '   ' })));
});

test('a zero or missing price is refused — free is granted, not purchased', () => {
  assert.ok(!isPurchasable(tier({ priceCents: 0 })));
  assert.ok(!isPurchasable(tier({ priceCents: undefined })));
});

test('a withdrawn tier cannot be bought even though it is fully configured', () => {
  assert.ok(!isPurchasable(tier({ active: false })));
});

test('nothing at all is not purchasable', () => {
  assert.ok(!isPurchasable(null));
  assert.ok(!isPurchasable(undefined));
});

test('the refusal says what to actually do about it', () => {
  assert.match(notPurchasableReason(tier({ stripePriceId: '' }))!, /Stripe/);
  assert.match(notPurchasableReason(tier({ stripePriceId: '' }))!, /create the price/i);
  assert.match(notPurchasableReason(tier({ priceCents: 0 }))!, /granted rather than purchased/);
  assert.equal(notPurchasableReason(tier()), null, 'a sellable tier has no complaint');
});

// ── what a customer is allowed to see ──────────────────────────────────────

test('the Stripe price id never reaches the customer', () => {
  const shown = publicTier(tier());
  assert.ok(!('stripePriceId' in shown), 'the price id is internal plumbing');
  assert.equal(shown.purchasable, true);
  assert.equal(shown.name, 'Listed');
});

// ── what an account actually has ───────────────────────────────────────────

const NOW = new Date('2026-09-21T12:00:00Z');
const future = '2026-12-01T00:00:00Z';
const past = '2026-06-01T00:00:00Z';

test('no grant at all is the free floor', () => {
  const e = resolveEntitlement(null, NOW);
  assert.equal(e.level, FREE_LEVEL);
  assert.equal(e.source, 'free');
  assert.equal(e.inTrial, false);
});

test('a running trial gives its level and says when it ends', () => {
  const e = resolveEntitlement({ level: 'full', status: 'active', trialEnd: future }, NOW);
  assert.equal(e.level, 'full');
  assert.equal(e.source, 'trial');
  assert.equal(e.inTrial, true);
  assert.equal(e.trialEndsAt, new Date(future).toISOString());
});

test('AN EXPIRED TRIAL IS FREE — this is the one that gives the product away', () => {
  const e = resolveEntitlement({ level: 'full', status: 'active', trialEnd: past }, NOW);
  assert.equal(e.level, FREE_LEVEL);
  assert.equal(e.source, 'free');
  assert.equal(e.inTrial, false);
});

test('a paying subscription outranks the trial clock', () => {
  // Somebody who bought during their trial has paid. Dropping them to free the
  // day the trial expires would cut off a paying customer.
  const e = resolveEntitlement({
    level: 'full', status: 'active', trialEnd: past,
    tierId: 'listed', stripeSubscriptionId: 'sub_123',
  }, NOW);
  assert.equal(e.level, 'listed');
  assert.equal(e.source, 'subscription');
  assert.equal(e.inTrial, false);
});

test('a tier id with no subscription behind it is not a subscription', () => {
  // Half-written state must not confer paid access.
  const e = resolveEntitlement({ level: 'full', status: 'active', tierId: 'listed', trialEnd: past }, NOW);
  assert.equal(e.level, FREE_LEVEL);
});

test('a revoked grant is revoked whatever its dates say', () => {
  for (const status of ['revoked', 'cancelled', 'suspended', 'paused']) {
    const e = resolveEntitlement({ level: 'full', status, trialEnd: future }, NOW);
    assert.equal(e.level, FREE_LEVEL, `status ${status} should not grant access`);
  }
});

test('an unparseable trial date is not an open-ended licence', () => {
  for (const bad of ['soon', 'not-a-date', '2026-13-45T99:99:99Z']) {
    const e = resolveEntitlement({ level: 'full', status: 'active', trialEnd: bad }, NOW);
    assert.equal(e.level, FREE_LEVEL, `${JSON.stringify(bad)} should not grant access`);
  }
});

/**
 * The distinction that had to be made precise: a BROKEN trial versus a
 * deliberate open-ended grant. Keying off `trialEnd` alone conflates them, and
 * in the expensive direction — one bad write of an empty end date would turn a
 * 90-day trial into permanent free access.
 */
test('a trial whose end date went missing falls to free, not to full', () => {
  const e = resolveEntitlement({
    level: 'full', status: 'active',
    trialStart: '2026-06-01T00:00:00Z', trialEnd: '',
  }, NOW);
  assert.equal(e.level, FREE_LEVEL, 'trialStart present means this WAS a trial, and it is now broken');
});

test('a manual open-ended grant still works — staff and comped accounts', () => {
  // No trialStart and no trialEnd: never was a trial, so it is deliberate.
  const e = resolveEntitlement({ level: 'full', status: 'active' }, NOW);
  assert.equal(e.level, 'full');
  assert.equal(e.source, 'subscription');
});

test('a grant with no level and no dates is free, not full', () => {
  assert.equal(resolveEntitlement({ status: 'active' }, NOW).level, FREE_LEVEL);
});

test('the boundary: a trial ending exactly now has ended', () => {
  const e = resolveEntitlement({ level: 'full', status: 'active', trialEnd: NOW.toISOString() }, NOW);
  assert.equal(e.level, FREE_LEVEL, 'not strictly in the future means over');
});

// ── limits ─────────────────────────────────────────────────────────────────

test('under the limit is allowed, at the limit is not', () => {
  assert.ok(withinLimit(tier(), 'deals', 2));
  assert.ok(!withinLimit(tier(), 'deals', 3), '3 of 3 used means no more');
  assert.ok(!withinLimit(tier(), 'deals', 99));
});

test('an unmetered key is allowed rather than refused', () => {
  // A tier that forgot to list a limit should not silently disable the feature.
  assert.ok(withinLimit(tier(), 'somethingNobodyMetered', 1000));
  assert.ok(withinLimit(null, 'deals', 1000));
});

test('every audience the code offers is a real one', () => {
  assert.ok(AUDIENCES.includes('vendor'));
  assert.equal(new Set(AUDIENCES).size, AUDIENCES.length, 'no duplicates');
});
