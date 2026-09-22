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
  isPurchasable, notPurchasableReason, publicTier, resolveEntitlement, priceIdFor,
  withinLimit, carryStripeLinkage, FREE_LEVEL, AUDIENCES,
  readInterval, addOnAvailableOn, addOnIncludedIn, subscriptionTotalCents,
  addOnsForTier, publicAddOn, type PlanAddOn,
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

// ── test mode and live mode are different prices ───────────────────────────
//
// The failure this guards against: a tier rehearsed in test mode and then
// switched live, quietly carrying a price id the live key cannot find. The
// checkout would fail for every customer, at the moment it mattered, with an
// error from Stripe rather than from us.

test('a tier with only a test price is not sellable on live', () => {
  const t = tier({ stripePriceId: undefined, stripePriceIdTest: 'price_test_1' });
  assert.ok(isPurchasable(t, 'test'));
  assert.ok(!isPurchasable(t, 'live'), 'a test price cannot be charged with a live key');
});

test('a tier with only a live price is not sellable in test mode', () => {
  const t = tier({ stripePriceId: 'price_live_1', stripePriceIdTest: undefined });
  assert.ok(isPurchasable(t, 'live'));
  assert.ok(!isPurchasable(t, 'test'));
});

test('the price id never falls back to the other mode', () => {
  const t = tier({ stripePriceId: 'price_live_1', stripePriceIdTest: 'price_test_1' });
  assert.equal(priceIdFor(t, 'live'), 'price_live_1');
  assert.equal(priceIdFor(t, 'test'), 'price_test_1');
  assert.equal(priceIdFor(tier({ stripePriceId: undefined, stripePriceIdTest: undefined }), 'test'), '');
});

test('the refusal names WHICH mode is missing, because that is the confusing case', () => {
  const onlyLive = tier({ stripePriceIdTest: undefined });
  const why = notPurchasableReason(onlyLive, 'test')!;
  assert.match(why, /test-mode/);
  assert.match(why, /live-mode/, 'it should say the other one exists, or the message reads as a contradiction');
});

test('neither price id reaches a customer, in either mode', () => {
  const t = tier({ stripePriceId: 'price_live_1', stripePriceIdTest: 'price_test_1' });
  for (const mode of ['live', 'test'] as const) {
    const shown = JSON.stringify(publicTier(t, mode));
    assert.ok(!shown.includes('price_live_1'), 'the live price id leaked');
    assert.ok(!shown.includes('price_test_1'), 'the test price id leaked');
  }
});

/**
 * ── Carrying the Stripe linkage across an edit ────────────────────────────
 *
 * This decides whether a plan can be bought, and both ways of getting it wrong
 * report nothing. Dropping the linkage takes a plan off sale silently, so
 * editing a blurb would unsell it and the first sign would be a vendor pressing
 * Subscribe. Keeping a linkage the edit has contradicted is worse: a Stripe
 * Price is immutable, so a plan raised to $49 while still pointing at the $39
 * Price advertises one figure and charges another.
 */
const attached = {
  stripePriceId: 'price_live_abc',
  stripePriceIdTest: 'price_test_abc',
  stripeProductId: 'prod_abc',
  stripePriceCents: 3900,
  priceCents: 3900,
};

test('an unchanged amount keeps every Stripe field', () => {
  const { linkage, detached } = carryStripeLinkage(attached, 3900);
  assert.equal(linkage.stripePriceId, 'price_live_abc');
  assert.equal(linkage.stripePriceIdTest, 'price_test_abc');
  assert.equal(linkage.stripeProductId, 'prod_abc');
  assert.deepEqual(detached, []);
});

test('EDITING A NAME DOES NOT UNSELL THE PLAN — the caller sends no price ids', () => {
  // The edit path in full: readTier built a tier from the body, which carries
  // no Stripe fields because the list route strips them. Nothing may be lost.
  const { linkage, detached } = carryStripeLinkage(attached, attached.priceCents);
  assert.equal(linkage.stripePriceId, 'price_live_abc');
  assert.deepEqual(detached, []);
});

test('a changed amount detaches both prices — neither can charge the new figure', () => {
  const { linkage, detached } = carryStripeLinkage(attached, 4900);
  assert.equal(linkage.stripePriceId, undefined);
  assert.equal(linkage.stripePriceIdTest, undefined);
  assert.deepEqual([...detached].sort(), ['live', 'test']);
});

test('the recorded Stripe amount is forgotten once a price is detached', () => {
  const { linkage } = carryStripeLinkage(attached, 4900);
  assert.equal(linkage.stripePriceCents, undefined,
    'a stale amount would let the next edit compare against a price that is gone');
});

test('the product id survives — a Stripe product outlives its prices', () => {
  const { linkage } = carryStripeLinkage(attached, 4900);
  assert.equal(linkage.stripeProductId, 'prod_abc');
});

test('only the mode that had a price is detached', () => {
  const { detached } = carryStripeLinkage(
    { stripePriceIdTest: 'price_test_x', stripePriceCents: 7900 }, 8900);
  assert.deepEqual(detached, ['test']);
});

test('a tier that does not exist yet carries nothing and loses nothing', () => {
  const { linkage, detached } = carryStripeLinkage(null, 3900);
  assert.deepEqual(linkage, {});
  assert.deepEqual(detached, []);
});

test('nothing is detached when no price was ever attached', () => {
  const { detached } = carryStripeLinkage({ priceCents: 3900 }, 9900);
  assert.deepEqual(detached, []);
});

test('it follows what Stripe charges, not what the plan last said', () => {
  // A mismatch forced through the attach route: the plan says 3900 while the
  // Price charges 4900. Saving 4900 brings the plan INTO line with Stripe, so
  // the price must survive — detaching here would punish the fix.
  const forced = { stripePriceId: 'price_x', stripePriceCents: 4900, priceCents: 3900 };
  const { linkage, detached } = carryStripeLinkage(forced, 4900);
  assert.equal(linkage.stripePriceId, 'price_x');
  assert.deepEqual(detached, []);
});

test('an unreadable amount does not unsell anything', () => {
  const { linkage, detached } = carryStripeLinkage(attached, Number.NaN);
  assert.equal(linkage.stripePriceId, 'price_live_abc');
  assert.deepEqual(detached, []);
});

/**
 * ── Base tier plus add-ons ────────────────────────────────────────────────
 *
 * Eric's decision: $39 / $79 / $159 are base prices and most of the extras are
 * add-ons. So what somebody pays is the tier plus what they chose, and that sum
 * is computed on the server from records the server owns. A total posted by a
 * browser is a number the customer can edit, which is why it is never trusted
 * and why the arithmetic is pinned here.
 */
const baseTier = (over: Partial<PlanTier> = {}): PlanTier => tier({
  id: 'stocked', name: 'Stocked', priceCents: 7900, interval: 'month',
  ...over,
});

const addOn = (over: Partial<PlanAddOn> = {}): PlanAddOn => ({
  id: 'extra-products', audience: 'vendor', name: '500 more products',
  features: [], limits: { products: 500 }, priceCents: 2000, interval: 'month',
  stripePriceId: 'price_addon_live', active: true,
  ...over,
});

test('an interval is read, not guessed — week survives', () => {
  assert.equal(readInterval('week'), 'week');
  assert.equal(readInterval('year'), 'year');
  assert.equal(readInterval('month'), 'month');
  assert.equal(readInterval('WEEK'), 'week');
  assert.equal(readInterval(undefined), 'month', 'the safe default');
  assert.equal(readInterval('fortnight'), 'month', 'nonsense is not carried through');
});

test('the base price alone when nothing is added', () => {
  assert.equal(subscriptionTotalCents(baseTier(), []), 7900);
});

test('an add-on is added to the base', () => {
  assert.equal(subscriptionTotalCents(baseTier(), [addOn()]), 9900);
});

test('AN INCLUDED ADD-ON IS FREE — that is what including it means', () => {
  const t = baseTier({ includedAddOns: ['extra-products'] });
  assert.equal(subscriptionTotalCents(t, [addOn()]), 7900);
});

test('an add-on for another tier is not charged for', () => {
  const only = addOn({ availableOn: ['preferred'] });
  assert.equal(subscriptionTotalCents(baseTier(), [only]), 7900);
  assert.ok(!addOnAvailableOn(only, baseTier()));
});

test('an add-on listed for this tier is available', () => {
  assert.ok(addOnAvailableOn(addOn({ availableOn: ['stocked'] }), baseTier()));
});

test('no availableOn means every tier, which is the common case', () => {
  assert.ok(addOnAvailableOn(addOn({ availableOn: [] }), baseTier()));
  assert.ok(addOnAvailableOn(addOn({ availableOn: undefined }), baseTier()));
});

test('A WEEKLY ADD-ON IS REFUSED ON A MONTHLY TIER — Stripe would reject it', () => {
  // Every recurring line item on one subscription must share an interval.
  // Offering this would build a checkout session Stripe refuses in front of
  // the customer, in its words rather than ours.
  assert.ok(!addOnAvailableOn(addOn({ interval: 'week' }), baseTier()));
  assert.equal(subscriptionTotalCents(baseTier(), [addOn({ interval: 'week' })]), 7900);
});

test('a withdrawn add-on is neither offered nor charged for', () => {
  assert.ok(!addOnAvailableOn(addOn({ active: false }), baseTier()));
  assert.equal(subscriptionTotalCents(baseTier(), [addOn({ active: false })]), 7900);
});

test('an add-on for another audience never crosses over', () => {
  assert.ok(!addOnAvailableOn(addOn({ audience: 'customer' }), baseTier()));
});

test('a negative price cannot discount the base', () => {
  assert.equal(subscriptionTotalCents(baseTier(), [addOn({ priceCents: -5000 })]), 7900);
});

test('several add-ons sum', () => {
  const total = subscriptionTotalCents(baseTier(), [
    addOn(),
    addOn({ id: 'priority-routing', priceCents: 1500 }),
    addOn({ id: 'extra-seat', priceCents: 900 }),
  ]);
  assert.equal(total, 7900 + 2000 + 1500 + 900);
});

test('the add-on list hides what cannot be sold, and marks what is included', () => {
  const t = baseTier({ includedAddOns: ['priority-routing'] });
  const shown = addOnsForTier([
    addOn(),
    addOn({ id: 'priority-routing', stripePriceId: undefined }),
    addOn({ id: 'no-price', stripePriceId: undefined }),
    addOn({ id: 'other-tier', availableOn: ['preferred'] }),
  ], t, 'live');

  const ids = shown.map(a => a.id).sort();
  assert.deepEqual(ids, ['extra-products', 'priority-routing'],
    'no-price has no Stripe price and other-tier is not offered here');
  assert.ok(shown.find(a => a.id === 'priority-routing')!.included,
    'included without a Stripe price is still offered — nothing is charged');
  assert.ok(!shown.find(a => a.id === 'extra-products')!.included);
});

test('an add-on never carries its Stripe price id to a customer', () => {
  const shown = addOnsForTier([addOn()], baseTier());
  assert.ok(!('stripePriceId' in shown[0]));
  assert.ok(!('stripePriceIdTest' in shown[0]));
  const one = publicAddOn(addOn());
  assert.ok(!('stripePriceId' in one));
  assert.equal(one.purchasable, true);
});

test('addOnIncludedIn is false for a tier that includes nothing', () => {
  assert.ok(!addOnIncludedIn('extra-products', baseTier()));
  assert.ok(!addOnIncludedIn('extra-products', null));
});

/**
 * ── Zero means unlimited ──────────────────────────────────────────────────
 *
 * The convention is stated in the tier editor, in the assistant prompt, and
 * in the vendor tiers themselves — Stocked and Preferred carry `products: 0`
 * and advertise "Unlimited catalogue products". It was stated everywhere
 * except in the function that decides, which read it literally as a ceiling
 * of nothing.
 *
 * That is the expensive direction of wrong: the tiers promising no limit are
 * the ones people pay most for, so enforcement would have refused their
 * first product while the cheapest tier carried on working.
 */
test('ZERO MEANS UNLIMITED — the tiers that promise no limit are the dear ones', () => {
  const unlimited = tier({ limits: { products: 0 } });
  assert.ok(withinLimit(unlimited, 'products', 0));
  assert.ok(withinLimit(unlimited, 'products', 250));
  assert.ok(withinLimit(unlimited, 'products', 100000));
});

test('a real ceiling still holds', () => {
  const listed = tier({ limits: { products: 250 } });
  assert.ok(withinLimit(listed, 'products', 249));
  assert.ok(!withinLimit(listed, 'products', 250), 'at the limit is not under it');
  assert.ok(!withinLimit(listed, 'products', 9999));
});

test('a negative ceiling cannot mean minus three products', () => {
  assert.ok(withinLimit(tier({ limits: { products: -3 } }), 'products', 500));
});
