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
  addOnsForTier, publicAddOn, monthlyFigure, type PlanAddOn,
  selectableAddOns, holdsAddOn, paysForAddOn, heldAddOnIds, ON_CALL_ADD_ON_ID,
  addOnQuantity, addOnMonthlyCents, bandForUnits, addOnCharge,
  tierViewOfCohort, cohortTotalCents, pricedViewFor, priceIdOfAddOn,
  ON_CALL_ANSWERED_ADD_ON_ID, holdsOnCallFeature,
  type PlanTier,
} from '../supabase/functions/server/planTier.ts';
import { cohortFromTier } from '../supabase/functions/server/cohortPricing.ts';

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

/* ── which extras a checkout may bill for ────────────────────────────────── */

/**
 * The posted list is a list the customer can edit. These pin the four ways a
 * ticked extra must not become a Stripe line item, because each of them bills
 * somebody for something they are not entitled to or cannot use.
 */

test('an extra that is offered and priced is selectable', () => {
  const { chosen, refused } = selectableAddOns([addOn()], tier(), ['extra-products']);
  assert.deepEqual(chosen.map(a => a.id), ['extra-products']);
  assert.equal(refused.length, 0);
});

test('an id nobody offers is refused rather than ignored', () => {
  const { chosen, refused } = selectableAddOns([addOn()], tier(), ['on-call']);
  assert.equal(chosen.length, 0);
  assert.equal(refused[0].id, 'on-call');
});

test('an extra restricted to another tier cannot be bought on this one', () => {
  const only = addOn({ availableOn: ['preferred'] });
  const { chosen, refused } = selectableAddOns([only], tier({ id: 'listed' }), ['extra-products']);
  assert.equal(chosen.length, 0);
  assert.match(refused[0].reason, /not offered on this plan/);
});

test('an extra the tier already includes is refused, not charged for', () => {
  const t = tier({ includedAddOns: ['extra-products'] });
  const { chosen, refused } = selectableAddOns([addOn()], t, ['extra-products']);
  assert.equal(chosen.length, 0, 'billing for something the plan grants is the visible failure');
  assert.match(refused[0].reason, /already included/);
});

test('an extra with no price in the mode we are in is refused, and says so', () => {
  const liveOnly = addOn({ stripePriceId: 'price_live', stripePriceIdTest: undefined });
  const { chosen, refused } = selectableAddOns([liveOnly], tier(), ['extra-products'], 'test');
  assert.equal(chosen.length, 0, 'a rehearsal must not quietly build a cheaper checkout');
  assert.match(refused[0].reason, /test/);
});

test('the same extra ticked twice bills once', () => {
  const { chosen } = selectableAddOns([addOn()], tier(), ['extra-products', 'extra-products']);
  assert.equal(chosen.length, 1);
});

/* ── and what an account holds once it has paid ──────────────────────────── */

const paid = (over: Record<string, any> = {}) => ({
  email: 'a@b.com', portalType: 'vendor', status: 'active',
  tierId: 'listed', stripeSubscriptionId: 'sub_1', ...over,
});

test('an extra bought alongside the subscription is held', () => {
  assert.ok(holdsAddOn(ON_CALL_ADD_ON_ID, paid({ addOnIds: ['on-call'] }), tier()));
});

test('an extra the tier includes is held without ever being bought', () => {
  const t = tier({ includedAddOns: ['on-call'] });
  assert.ok(holdsAddOn(ON_CALL_ADD_ON_ID, paid(), t),
    'the dearest plan is the one most likely to bundle on-call');
});

test('a cancelled subscription holds nothing, whatever ids are left on the grant', () => {
  const cancelled = paid({ tierId: undefined, stripeSubscriptionId: undefined, addOnIds: ['on-call'] });
  assert.ok(!holdsAddOn(ON_CALL_ADD_ON_ID, cancelled, tier()),
    'we would still be answering emergencies for an account that stopped paying');
});

test('no grant at all holds nothing', () => {
  assert.ok(!holdsAddOn(ON_CALL_ADD_ON_ID, null, tier()));
  assert.ok(!holdsAddOn('', paid({ addOnIds: [''] }), tier()));
});

/* ── priced per unit, because a block is not a house ─────────────────────── */

/**
 * On-call is priced on the call, the hours worked and the number of units
 * covered. The third is the subscription, and the failure it invites is
 * quiet: a flat quantity of one bills a hundred-and-twenty-unit association
 * the same as a four-unit house, and the invoice looks perfectly normal.
 */

test('an ordinary add-on is billed once, whatever the portfolio', () => {
  assert.equal(addOnQuantity(addOn(), 120), 1);
});

test('a per-unit add-on is billed for the units covered', () => {
  assert.equal(addOnQuantity(addOn({ perUnit: true }), 120), 120);
});

test('a per-unit add-on with nothing recorded still bills the minimum', () => {
  assert.equal(addOnQuantity(addOn({ perUnit: true }), 0), 1,
    'they can still ring us tonight, and Stripe refuses a quantity of zero');
});

test('a nonsense unit count cannot produce a nonsense bill', () => {
  for (const units of [-5, NaN, Infinity, undefined as any]) {
    assert.equal(addOnQuantity(addOn({ perUnit: true }), units), 1);
  }
});

test('the monthly figure multiplies, so nobody is shown a per-unit price as the total', () => {
  const perUnit = addOn({ perUnit: true, priceCents: 400 });
  assert.equal(addOnMonthlyCents(perUnit, 120), 48000, '$4 a unit across 120 units is $480');
  assert.equal(addOnMonthlyCents(perUnit, 0), 400, 'the floor of one unit');
  assert.equal(addOnMonthlyCents(addOn({ priceCents: 4900 }), 120), 4900, 'flat stays flat');
});

/* ── a flat fee whose number depends on size ─────────────────────────────── */

/**
 * Eric's model for on-call: the flat rate is determined by size. Not one price
 * for everybody, and not a price multiplied by a unit count — a flat monthly
 * fee, with which fee decided by how much is covered.
 *
 * The failures here all produce a perfectly normal-looking invoice for the
 * wrong amount, which is why the picking is pinned rather than trusted.
 */

const banded = (over: Partial<PlanAddOn> = {}): PlanAddOn => addOn({
  id: 'on-call',
  name: 'On-call',
  priceCents: 0,
  sizeBands: [
    { id: 'small', label: 'Up to 25 units', upToUnits: 25, priceCents: 75000, stripePriceId: 'price_small' },
    { id: 'medium', label: '26–100 units', upToUnits: 100, priceCents: 125000, stripePriceId: 'price_medium' },
    { id: 'large', label: '101+ units', priceCents: 250000, stripePriceId: 'price_large' },
  ],
  ...over,
});

test('an account lands in the smallest band that still covers it', () => {
  assert.equal(bandForUnits(banded(), 4)?.id, 'small');
  assert.equal(bandForUnits(banded(), 25)?.id, 'small', 'the ceiling is inclusive');
  assert.equal(bandForUnits(banded(), 26)?.id, 'medium');
  assert.equal(bandForUnits(banded(), 100)?.id, 'medium');
});

test('anything above every ceiling falls to the open-ended band', () => {
  assert.equal(bandForUnits(banded(), 120)?.id, 'large');
  assert.equal(bandForUnits(banded(), 100000)?.id, 'large');
});

test('bands typed out of order are still read smallest first', () => {
  const jumbled = banded({
    sizeBands: [
      { id: 'large', priceCents: 250000, stripePriceId: 'p3' },
      { id: 'medium', upToUnits: 100, priceCents: 125000, stripePriceId: 'p2' },
      { id: 'small', upToUnits: 25, priceCents: 75000, stripePriceId: 'p1' },
    ],
  });
  assert.equal(bandForUnits(jumbled, 4)?.id, 'small',
    'out of order, a four-unit house would be billed at the hundred-unit rate');
});

test('an account with nothing recorded is billed in the smallest band', () => {
  assert.equal(bandForUnits(banded(), 0)?.id, 'small',
    'they have bought the service and can ring tonight');
});

test('with no open-ended band, a very large account matches nothing rather than guessing', () => {
  const capped = banded({
    sizeBands: [{ id: 'small', upToUnits: 25, priceCents: 75000, stripePriceId: 'p1' }],
  });
  assert.equal(bandForUnits(capped, 900), null);
});

test('an add-on with no bands is not banded', () => {
  assert.equal(bandForUnits(addOn(), 50), null);
});

/* ── and one answer for all three shapes ─────────────────────────────────── */

test('a banded add-on charges the band price, once', () => {
  const charge = addOnCharge(banded(), 60);
  assert.equal(charge.shape, 'banded');
  assert.equal(charge.priceId, 'price_medium');
  assert.equal(charge.quantity, 1, 'a flat fee is billed once, not per unit');
  assert.equal(charge.monthlyCents, 125000);
});

test('a per-unit add-on charges its price times the units', () => {
  const charge = addOnCharge(addOn({ perUnit: true, priceCents: 400 }), 120);
  assert.equal(charge.shape, 'per-unit');
  assert.equal(charge.quantity, 120);
  assert.equal(charge.monthlyCents, 48000);
});

test('an ordinary add-on is unaffected by how big the customer is', () => {
  const charge = addOnCharge(addOn({ priceCents: 2000 }), 500);
  assert.equal(charge.shape, 'flat');
  assert.equal(charge.quantity, 1);
  assert.equal(charge.monthlyCents, 2000);
});

test('a band with no price in this mode yields no price id, so the sale is refused', () => {
  const charge = addOnCharge(banded(), 4, 'test');
  assert.equal(charge.priceId, '', 'a rehearsal must not quietly bill the live price');
});

/* ── the sizes we quote for rather than publish ──────────────────────────── */

/**
 * Say the prices that are set, and let anybody outside them ask. The failure
 * this guards against is a wording one with real money behind it: somebody
 * holding a hundred and fifty doors reads "not available" and goes elsewhere.
 * They read "tell us and we will price it" and get in touch.
 */

const quoted = () => addOn({
  id: 'on-call',
  priceCents: 0,
  sizeBands: [
    { id: 'small', label: 'Up to 25 units', upToUnits: 25, priceCents: 75000, stripePriceId: 'price_small' },
    { id: 'large', label: '26+ units', quoteOnly: true },
  ],
});

test('a published size is charged as normal', () => {
  const charge = addOnCharge(quoted(), 10);
  assert.equal(charge.shape, 'banded');
  assert.equal(charge.priceId, 'price_small');
  assert.equal(charge.monthlyCents, 75000);
});

test('a size we quote for reports itself as a quote, not as a missing price', () => {
  const charge = addOnCharge(quoted(), 150);
  assert.equal(charge.shape, 'quote',
    'a band awaiting a quote and one missing its price must never look the same');
  assert.equal(charge.priceId, '');
  assert.equal(charge.monthlyCents, 0);
  assert.equal(charge.band?.id, 'large');
});

test('a quote band is still the band they fall into, so we know what to price', () => {
  assert.equal(bandForUnits(quoted(), 26)?.id, 'large');
  assert.equal(bandForUnits(quoted(), 25)?.id, 'small');
});

test('a priced band with no Stripe price is a fault, and stays distinguishable from a quote', () => {
  const broken = addOn({
    sizeBands: [{ id: 'small', upToUnits: 25, priceCents: 75000 }],
  });
  const charge = addOnCharge(broken, 10);
  assert.equal(charge.shape, 'banded', 'it is priced, so it is not a quote');
  assert.equal(charge.priceId, '', 'and it cannot be sold, which the caller must report differently');
});

/* ── two on-call products, and only one of them means we answer ─────────── */

/**
 * The software and the service are sold separately: an account can buy the
 * rotas, set up its own people, and never want us near the phone. Asking the
 * wrong id would have us turning out for somebody who never paid us to — and
 * charging them our callout for the privilege.
 */

test('the two on-call products have different ids', () => {
  assert.notEqual(ON_CALL_ADD_ON_ID, ON_CALL_ANSWERED_ADD_ON_ID);
});

test('the software alone does not mean Black Phoenix answers', () => {
  const grant = paid({ addOnIds: [ON_CALL_ADD_ON_ID] });
  assert.ok(holdsOnCallFeature(grant, tier()), 'they can use the rotas');
  assert.ok(!holdsAddOn(ON_CALL_ANSWERED_ADD_ON_ID, grant, tier()),
    'but we are not the ones turning out');
});

test('paying us to answer also gets the rota screen', () => {
  const grant = paid({ addOnIds: [ON_CALL_ANSWERED_ADD_ON_ID] });
  assert.ok(holdsOnCallFeature(grant, tier()),
    'refusing the screen to the customer paying more would be absurd');
  assert.ok(holdsAddOn(ON_CALL_ANSWERED_ADD_ON_ID, grant, tier()));
});

test('neither product means no on-call at all', () => {
  assert.ok(!holdsOnCallFeature(paid({ addOnIds: ['extra-products'] }), tier()));
  assert.ok(!holdsOnCallFeature(paid(), tier()));
});

test('a tier that includes on-call grants the feature without a purchase', () => {
  assert.ok(holdsOnCallFeature(paid(), tier({ includedAddOns: [ON_CALL_ADD_ON_ID] })));
});

test('a cancelled subscription holds neither', () => {
  const cancelled = paid({
    tierId: undefined, stripeSubscriptionId: undefined,
    addOnIds: [ON_CALL_ADD_ON_ID, ON_CALL_ANSWERED_ADD_ON_ID],
  });
  assert.ok(!holdsOnCallFeature(cancelled, tier()));
});

/* ── a trial grants breadth; a purchase grants persistence ───────────────── */

/**
 * Eric's rule: every add-on is included in the free trial, and they "add up"
 * only if the subscriber keeps them afterwards.
 *
 * The trap this pins shut is the obvious implementation — seeding the trial's
 * add-ons onto `addOnIds`. That field means PAID FOR: the Stripe webhook
 * writes it and a conversion would bill from it, so a trial that filled it in
 * would invoice somebody for extras they never chose. Left empty, conversion
 * bills only what was picked, which is the direction a mistake involving money
 * should fail in.
 *
 * So three states that must never collapse into each other: a trial holds
 * everything and owns nothing, a subscription holds what it bought, and
 * anything else holds nothing at all.
 */
const trialling = (over: Record<string, any> = {}) => ({
  email: 'a@b.com', portalType: 'content', status: 'active',
  level: 'full', trialEnd: future, ...over,
});

test('a running trial holds add-ons it never bought', () => {
  assert.ok(holdsAddOn('extra-products', trialling(), tier()));
  assert.ok(holdsAddOn('anything-at-all', trialling(), tier()),
    'the trial includes the lot, so the subscriber can find out what they want');
  // The on-call exception is deliberately not asserted here — it has its own
  // block below, so deleting the exception breaks a test that explains why it
  // exists rather than one that merely counts add-ons.
});

test('a trial owns nothing, so conversion has nothing to bill for', () => {
  const grant = trialling();
  assert.ok(!paysForAddOn(ON_CALL_ADD_ON_ID, grant, tier()),
    'billing for what a trial merely included is charging for what was never chosen');
  assert.deepEqual(heldAddOnIds(grant, tier()), [],
    'nothing is recorded on the grant, so there is no trial residue to clean up');
});

test('an EXPIRED trial holds nothing — the whole point of the clock', () => {
  const lapsed = trialling({ trialEnd: past });
  assert.ok(!holdsAddOn(ON_CALL_ADD_ON_ID, lapsed, tier()),
    'an expired trial that still holds everything is the product given away by a date comparison');
});

test('a revoked trial holds nothing however far off its end date is', () => {
  for (const status of ['revoked', 'suspended', 'cancelled']) {
    assert.ok(!holdsAddOn(ON_CALL_ADD_ON_ID, trialling({ status }), tier()),
      `a grant revoked by hand is revoked, and ${status} is not a running trial`);
  }
});

test('trial breadth never leaks into what is being paid for', () => {
  // The two questions asked of one paying account, so the difference is visible:
  // bought on-call, did not buy anything else.
  const grant = paid({ addOnIds: ['on-call'] });
  assert.ok(paysForAddOn(ON_CALL_ADD_ON_ID, grant, tier()));
  assert.ok(!paysForAddOn('something-else', grant, tier()));
  assert.ok(!holdsAddOn('something-else', grant, tier()),
    'a subscription is not a trial: it holds what it bought and no more');
});

test('a tier-included extra counts as paid for, not merely held', () => {
  const t = tier({ includedAddOns: ['on-call'] });
  assert.ok(paysForAddOn(ON_CALL_ADD_ON_ID, paid(), t),
    'included free by the tier still persists past a trial — nothing extra to keep');
});

/* ── the one thing a trial does not include ──────────────────────────────── */

/**
 * Eric's decision, made when the consequence was put to him: neither on-call
 * product is included in a free trial.
 *
 * The "everything is included" rule was written for software, where a model
 * call or a seat costs cents and costs nobody their night. On-call puts Black
 * Phoenix on an emergency line around the clock. The cost is people, not
 * compute — and emergency cover is a promise, so a trialist would discover it
 * had lapsed at the worst possible moment.
 *
 * Pinned because the natural "simplification" of `holdsAddOn` is to delete the
 * exception and return true for the whole trial, which reads tidier and would
 * silently put us back on somebody's emergency line.
 */
test('a trial does not include on-call, answered or not', () => {
  for (const id of [ON_CALL_ADD_ON_ID, ON_CALL_ANSWERED_ADD_ON_ID]) {
    assert.ok(!holdsAddOn(id, trialling(), tier()),
      `a trial must not staff an emergency line — ${id}`);
  }
  assert.ok(!holdsOnCallFeature(trialling(), tier()),
    'the combined check must agree, since it is what gates the rota screen');
});

test('a trial still includes everything else', () => {
  assert.ok(holdsAddOn('extra-products', trialling(), tier()),
    'the exception is narrow on purpose and must not spread');
});

test('paying for on-call outranks the trial clock, so nobody is stranded', () => {
  // Bought during a trial: resolveEntitlement ranks the subscription above the
  // trial, so the exclusion never reaches an account that actually paid.
  const bought = paid({ trialEnd: future, addOnIds: ['on-call-answered'] });
  assert.ok(holdsAddOn(ON_CALL_ANSWERED_ADD_ON_ID, bought, tier()),
    'paying for something must never leave somebody worse off than not paying');
});

/**
 * The figure a portal is allowed to SHOW.
 *
 * `subscriptionTotalCents` answers what a tier plus extras costs.
 * `monthlyFigure` answers what an account should be told it pays, and the two
 * differ for everybody who is not on a paid tier. The trialist is the case it
 * exists for: they hold every add-on, record none, and have no tier, so
 * tier-plus-extras computes to zero — and "$0/mo" is the wrong number to teach
 * somebody about the day their clock stops.
 */
test('a paying subscriber gets the tier plus what they hold', () => {
  const figure = monthlyFigure('subscription', baseTier(), [addOn()]);
  assert.equal(figure.cents, 9900);
  assert.equal(figure.basis, 'subscription');
});

test('A TRIALIST GETS NO FIGURE, NOT ZERO — zero is a promise we would break', () => {
  const figure = monthlyFigure('trial', null, []);
  assert.equal(figure.cents, null, 'null, so a panel cannot render it as $0.00');
  assert.equal(figure.basis, 'trial');
});

test('a trialist holding extras still gets no figure — they owe nothing yet', () => {
  const figure = monthlyFigure('trial', null, [addOn(), addOn({ id: 'another' })]);
  assert.equal(figure.cents, null);
  assert.equal(figure.basis, 'trial');
});

test('the free floor reports free, which is a different sentence from a trial', () => {
  assert.deepEqual(monthlyFigure('free', null, []), { cents: null, basis: 'free' });
  assert.deepEqual(monthlyFigure(null, null, []), { cents: null, basis: 'free' });
  assert.deepEqual(monthlyFigure(undefined, null, []), { cents: null, basis: 'free' });
});

/**
 * A cancelled subscription leaves its tier id behind on the grant.
 * `resolveEntitlement` is what decides it is no longer a subscription, and the
 * figure has to follow that judgement rather than the leftover record.
 */
test('a subscription source with no tier resolved yields no figure', () => {
  const figure = monthlyFigure('subscription', null, [addOn()]);
  assert.equal(figure.cents, null, 'no tier means nothing to price against');
  assert.equal(figure.basis, 'free');
});

test('an included add-on does not inflate the figure shown', () => {
  const tier = baseTier({ includedAddOns: ['extra-products'] });
  assert.equal(monthlyFigure('subscription', tier, [addOn()]).cents, 7900);
});

test('an add-on not available on the tier is not charged for', () => {
  const elsewhere = addOn({ availableOn: ['some-other-tier'] });
  assert.equal(monthlyFigure('subscription', baseTier(), [elsewhere]).cents, 7900);
});

test('nothing held is just the tier price', () => {
  assert.equal(monthlyFigure('subscription', baseTier(), []).cents, 7900);
});

// ── The same money, resolved through the cohort ───────────────────────────

/**
 * The migration's promise is that nobody's invoice changes. These are that
 * promise as assertions.
 *
 * Cohorts price by seat count through bands, which `plan_tier` cannot do —
 * that is the whole reason for the move. But a tier migrates as ONE band at
 * multiplier 1, so until somebody deliberately adds banding, the cohort must
 * charge exactly what the tier charged. Rewriting priced logic during a
 * migration is how a customer gets the wrong invoice; these say it did not
 * happen.
 */
const studio: Partial<PlanTier> = {
  id: 'studio',
  name: 'Studio',
  priceCents: 14900,
  includedAddOns: ['reels'],
  discountPercent: 10,
  active: true,
};

const extras: Array<Partial<PlanAddOn>> = [
  { id: 'reels', name: 'Reels', priceCents: 4900 },          // included — free
  { id: 'renders', name: 'Renders', priceCents: 2500 },      // extra
  { id: 'agency-only', name: 'Agency', priceCents: 9900, availableOn: ['agency'] }, // not offered
];

test('A MIGRATED COHORT CHARGES EXACTLY WHAT THE TIER CHARGED', () => {
  const cohort = cohortFromTier(studio);
  assert.equal(
    cohortTotalCents(cohort, 1, extras),
    subscriptionTotalCents(studio, extras),
    'the migration must not move anybody\'s bill',
  );
  // And the figure itself: base 14900 + renders 2500. Reels is included and
  // the agency add-on is not offered on this tier, so neither is charged.
  assert.equal(cohortTotalCents(cohort, 1, extras), 17400);
});

test('the included add-on stays free after migration', () => {
  const cohort = cohortFromTier(studio);
  assert.equal(cohortTotalCents(cohort, 1, [{ id: 'reels', priceCents: 4900 }]), 14900);
});

/**
 * `availableOn` lists TIER ids. If the adapter handed over the cohort's own
 * id, every restricted add-on would look unavailable and be silently dropped
 * from the total — an undercharge that nothing would report.
 */
test('AVAILABILITY RESOLVES AGAINST THE SOURCE TIER ID, NOT THE COHORT ID', () => {
  const cohort = cohortFromTier(studio);
  assert.equal(tierViewOfCohort(cohort).id, 'studio');
  assert.notEqual(tierViewOfCohort(cohort).id, cohort.id);

  const offered: Partial<PlanAddOn> = { id: 'studio-only', priceCents: 1000, availableOn: ['studio'] };
  assert.equal(cohortTotalCents(cohort, 1, [offered]), 15900, 'must still be charged');
});

test('the included list and the contract discount survive the migration', () => {
  const view = tierViewOfCohort(cohortFromTier(studio));
  assert.deepEqual(view.includedAddOns, ['reels']);
  assert.equal(view.discountPercent, 10);
});

test('a tier with no included add-ons migrates to an empty list, not undefined', () => {
  const view = tierViewOfCohort(cohortFromTier({ id: 'basic', priceCents: 1000 }));
  assert.deepEqual(view.includedAddOns, []);
  assert.equal(view.discountPercent, 0);
});

/**
 * Banding is the capability the move was for, so it has to actually work once
 * somebody adds it — and it must apply to the BASE only, never to the extras.
 */
test('a banded cohort discounts the base and leaves the add-ons alone', () => {
  const banded = {
    ...cohortFromTier(studio),
    pricingTiers: [
      { minUsers: 0, maxUsers: 9, priceMultiplier: 1 },
      { minUsers: 10, maxUsers: 99999, priceMultiplier: 0.5 },
    ],
  };
  assert.equal(cohortTotalCents(banded, 1, extras), 17400, 'small: full base + renders');
  // Base halves to 7450; renders stays at 2500.
  assert.equal(cohortTotalCents(banded, 20, extras), 9950);
});

test('a cohort with no price and no active flag sells nothing, rather than NaN', () => {
  // A tier with no `active` flag migrates as inactive — fail closed, because an
  // unmarked tier is not one somebody said was sellable. So the add-on is
  // refused and the total is zero. The point of the test is that it is a
  // number at all: this returned NaN before the base price was guarded.
  const total = cohortTotalCents(cohortFromTier({ id: 'x' }), 1, [{ id: 'renders', priceCents: 2500 }]);
  assert.equal(total, 0);
  assert.equal(Number.isFinite(total), true);

  // Marked active, the add-on is charged and the missing base is zero.
  const live = cohortTotalCents(cohortFromTier({ id: 'x', active: true }), 1, [{ id: 'renders', priceCents: 2500 }]);
  assert.equal(live, 2500);
});

test('a missing cohort prices at nothing instead of throwing', () => {
  assert.equal(cohortTotalCents(null, 1, []), 0);
  assert.equal(tierViewOfCohort(null).priceCents, 0);
});

/**
 * Cohorts carry a price in whole currency units and tiers carry cents. A
 * rounding slip between them is a per-customer, per-month error that nobody
 * would spot on one invoice.
 */
test('the dollars-to-cents conversion round-trips an odd price exactly', () => {
  const odd = cohortFromTier({ id: 'odd', priceCents: 3333 });
  assert.equal(odd.basePrice, 33.33);
  assert.equal(cohortTotalCents(odd, 1, []), 3333);
});

// ── Which record prices the account ───────────────────────────────────────

/**
 * The consolidation is mid-flight: cohorts are the intended system of record
 * and today there are none. These pin the changeover so that no subscriber
 * sees a wrong figure — or worse, a believable $0 — on either side of it.
 */
test('with no cohort, the tier prices the account', () => {
  const view = pricedViewFor(studio, null);
  assert.equal(view.pricedBy, 'tier');
  assert.equal(subscriptionTotalCents(view.tier, []), 14900);
});

test('with a cohort, the cohort prices it — AT THE SAME FIGURE', () => {
  const view = pricedViewFor(studio, cohortFromTier(studio));
  assert.equal(view.pricedBy, 'cohort');
  assert.equal(
    subscriptionTotalCents(view.tier, extras),
    subscriptionTotalCents(studio, extras),
    'the changeover must not move anybody\'s bill',
  );
});

/**
 * The failure that would be believed. A half-migrated or empty cohort must
 * not reprice a paying subscriber to nothing.
 */
test('A PRICELESS COHORT FALLS BACK TO THE TIER, NEVER TO ZERO', () => {
  for (const broken of [{ id: 'c' }, { id: 'c', basePrice: 0 }, { id: 'c', basePrice: NaN }]) {
    const view = pricedViewFor(studio, broken as any);
    assert.equal(view.pricedBy, 'tier', JSON.stringify(broken));
    assert.equal(subscriptionTotalCents(view.tier, []), 14900);
  }
});

test('with neither, the total is zero rather than a crash', () => {
  const view = pricedViewFor(null, null);
  assert.equal(view.pricedBy, 'tier');
  assert.equal(subscriptionTotalCents(view.tier, []), 0);
});

test('seats reach the cohort, so a banded cohort prices by size', () => {
  const banded = {
    ...cohortFromTier(studio),
    pricingTiers: [
      { minUsers: 0, maxUsers: 9, priceMultiplier: 1 },
      { minUsers: 10, maxUsers: 99999, priceMultiplier: 0.5 },
    ],
  };
  assert.equal(subscriptionTotalCents(pricedViewFor(studio, banded, 1).tier, []), 14900);
  assert.equal(subscriptionTotalCents(pricedViewFor(studio, banded, 20).tier, []), 7450);
});

/**
 * A trialist has no tier and no cohort, and must still be told there is no
 * figure rather than shown a zero. `monthlyFigure` owns that judgement; this
 * checks the changeover did not route around it.
 */
test('a trialist still gets no figure, whichever record is in play', () => {
  assert.equal(monthlyFigure('trial', pricedViewFor(studio, cohortFromTier(studio)).tier, []).cents, null);
  assert.equal(monthlyFigure('trial', pricedViewFor(studio, null).tier, []).basis, 'trial');
});

/**
 * Every field `addOnAvailableOn` reads must survive the cohort adapter.
 *
 * FOUND BY A DRY RUN AGAINST THE SIX REAL TIERS, not by these tests — the
 * synthetic tier above is active, monthly and single-audience, so it could
 * not expose any of this. All three failures below are silent: the adapter
 * does not error on a missing field, it just answers differently.
 */
const withdrawn: Partial<PlanTier> = { ...studio, active: false };
const onCall: Partial<PlanAddOn> = { id: 'on-call', priceCents: 9900 };

test('A WITHDRAWN TIER REFUSES ADD-ONS THROUGH THE COHORT TOO', () => {
  // The three content tiers are all active:false in production. Without
  // `active` on the view, each priced $99 HIGHER through the cohort than
  // through the tier — an overcharge for an add-on the tier had refused.
  assert.equal(subscriptionTotalCents(withdrawn, [onCall]), 14900, 'the tier refuses it');
  assert.equal(cohortTotalCents(cohortFromTier(withdrawn), 1, [onCall]), 14900, 'so must the cohort');
});

test('an active tier still charges for the add-on', () => {
  assert.equal(cohortTotalCents(cohortFromTier(studio), 1, [onCall]), 24800);
});

/**
 * The check is `addOn.audience && tier.audience && they differ`. With no
 * audience on the cohort's side it short-circuits and refuses nothing, so an
 * add-on from another portal would be charged — and would look like an
 * ordinary line on the invoice.
 */
test('AN ADD-ON FROM ANOTHER AUDIENCE IS NOT SOLD ON THIS COHORT', () => {
  const contentTier: Partial<PlanTier> = { ...studio, audience: 'content' };
  const vendorAddOn: Partial<PlanAddOn> = { id: 'vendor-thing', priceCents: 5000, audience: 'vendor' };
  assert.equal(tierViewOfCohort(cohortFromTier(contentTier)).audience, 'content');
  assert.equal(
    cohortTotalCents(cohortFromTier(contentTier), 1, [vendorAddOn]),
    14900,
    'a vendor add-on must not be charged on a content cohort',
  );
});

/**
 * Stripe requires every recurring line on one subscription to share an
 * interval, so a mismatch is refused by Stripe in front of the customer.
 */
test('the billing interval travels, so a mismatched add-on is refused', () => {
  const monthly: Partial<PlanTier> = { ...studio, interval: 'month' };
  const weekly: Partial<PlanAddOn> = { id: 'weekly', priceCents: 1000, interval: 'week' };
  assert.equal(tierViewOfCohort(cohortFromTier(monthly)).interval, 'month');
  assert.equal(cohortTotalCents(cohortFromTier(monthly), 1, [weekly]), 14900, 'not charged');
});

/**
 * The general form of the bug, so a field added to `addOnAvailableOn` later
 * cannot be forgotten here without something failing.
 */
test('THE COHORT VIEW AGREES WITH THE TIER ON EVERY COMBINATION', () => {
  const addOn: Partial<PlanAddOn> = { id: 'x', priceCents: 9900, audience: 'content', interval: 'month' };
  for (const active of [true, false]) {
    for (const audience of ['content', 'vendor'] as const) {
      for (const interval of ['month', 'year'] as const) {
        const t: Partial<PlanTier> = { id: 'studio', priceCents: 14900, includedAddOns: [], active, audience, interval };
        assert.equal(
          cohortTotalCents(cohortFromTier(t), 1, [addOn]),
          subscriptionTotalCents(t, [addOn]),
          `active=${active} audience=${audience} interval=${interval}`,
        );
      }
    }
  }
});

// ── Finding the Stripe line behind an add-on ──────────────────────────────

/**
 * A subscription line is matched by PRICE when a ladder rung has to be ended,
 * because the grant records add-on ids and never Stripe item ids. That makes
 * these the input to a DELETE against live billing, so the mode separation is
 * the assertion that matters: a rehearsal must never be able to match, and
 * therefore cancel, a real line.
 */
const bandedAddOn: Partial<PlanAddOn> = {
  id: 'on-call',
  stripePriceId: 'price_live_flat',
  stripePriceIdTest: 'price_test_flat',
  sizeBands: [
    { id: 'small', stripePriceId: 'price_live_small', stripePriceIdTest: 'price_test_small' },
    { id: 'large', stripePriceId: 'price_live_large', stripePriceIdTest: 'price_test_large' },
  ] as any,
};

test('A TEST-MODE LOOKUP NEVER RETURNS A LIVE PRICE', () => {
  const test = priceIdOfAddOn(bandedAddOn, 'test');
  assert.deepEqual(test.sort(), ['price_test_flat', 'price_test_large', 'price_test_small']);
  assert.equal(test.some((p) => p.includes('live')), false, 'a rehearsal must not reach a real line');
});

test('a live lookup returns only live prices', () => {
  const live = priceIdOfAddOn(bandedAddOn, 'live');
  assert.deepEqual(live.sort(), ['price_live_flat', 'price_live_large', 'price_live_small']);
  assert.equal(live.some((p) => p.includes('test')), false);
});

test('every band is included, because the account sits on one of them', () => {
  assert.equal(priceIdOfAddOn(bandedAddOn, 'live').length, 3);
});

test('a flat add-on yields its single price', () => {
  assert.deepEqual(priceIdOfAddOn({ id: 'x', stripePriceId: 'price_1' }, 'live'), ['price_1']);
});

test('live is the default, so a forgotten argument cannot silently mean test', () => {
  assert.deepEqual(priceIdOfAddOn({ id: 'x', stripePriceId: 'price_1', stripePriceIdTest: 'price_t' }),
    ['price_1']);
});

/**
 * An empty list means "match nothing", which makes the removal a no-op. That
 * is the right failure: an add-on with no price in this mode has no line here
 * to end, and guessing one would end somebody else's.
 */
test('an add-on with no price in this mode matches nothing', () => {
  assert.deepEqual(priceIdOfAddOn({ id: 'x', stripePriceId: 'price_1' }, 'test'), []);
  assert.deepEqual(priceIdOfAddOn(null, 'live'), []);
  assert.deepEqual(priceIdOfAddOn({ id: 'x' }, 'live'), []);
});

test('duplicate prices across bands collapse to one', () => {
  const shared: Partial<PlanAddOn> = {
    id: 'x',
    stripePriceId: 'price_1',
    sizeBands: [{ id: 'a', stripePriceId: 'price_1' }, { id: 'b', stripePriceId: 'price_1' }] as any,
  };
  assert.deepEqual(priceIdOfAddOn(shared, 'live'), ['price_1']);
});
