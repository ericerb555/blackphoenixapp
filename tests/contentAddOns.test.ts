/**
 * The content centre authored as add-ons.
 *
 * These pin what a seed would write to production before it writes it. The
 * last time records were seeded into this system a route invented twelve
 * cohorts with a million dollars of revenue nobody had earned; the rule since
 * then is that a migration carries only what is already true and is readable
 * before it is run. Same rule here.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTENT_RUNGS, CONTENT_AUDIENCES, CONTENT_GROUP,
  contentAddOn, contentAddOnPlan, addOnKey, wouldOverwriteEdits,
} from '../supabase/functions/server/contentAddOns.ts';
import { effectiveLimits } from '../supabase/functions/server/effectiveLimits.ts';
import { applicableAddOns, supersededIds } from '../supabase/functions/server/addOnGroups.ts';

// ── What gets written ─────────────────────────────────────────────────────

test('three rungs across six audiences is eighteen records', () => {
  const plan = contentAddOnPlan();
  assert.equal(plan.length, 18);
  assert.equal(new Set(plan.map((p) => p.key)).size, 18, 'every key distinct');
});

test('the audiences are the six Eric named, and customer is NOT among them', () => {
  assert.deepEqual([...CONTENT_AUDIENCES].sort(), [
    'advertiser', 'condo_association', 'landlord',
    'property_manager', 'subcontractor', 'vendor',
  ]);
  assert.equal(CONTENT_AUDIENCES.includes('customer' as any), false);
});

test('keys follow the shape the catalogue is read by', () => {
  // The route reads `plan_addon:{audience}:` by prefix, so the audience has to
  // be the middle segment or the record is invisible to it.
  assert.equal(addOnKey('vendor', 'content-solo'), 'plan_addon:vendor:content-solo');
  assert.ok(contentAddOnPlan().every((p) => p.key.startsWith(`plan_addon:${p.audience}:`)));
});

test('prices are carried from the tiers, not reinvented', () => {
  const by = (id: string) => CONTENT_RUNGS.find((r) => r.id === id)!;
  assert.equal(by('content-solo').priceCents, 7900);
  assert.equal(by('content-studio').priceCents, 19900);
  assert.equal(by('content-agency').priceCents, 49900);
});

/**
 * Fail closed. An add-on with no Stripe price cannot be bought, and the three
 * tiers this replaces already carried `active: false` with a note saying so.
 */
test('NOTHING IS SELLABLE ON ARRIVAL — no price, not active', () => {
  for (const { record } of contentAddOnPlan()) {
    assert.equal(record.active, false);
    assert.equal('stripePriceId' in record, false, 'a price id must never be invented');
    assert.equal('stripePriceIdTest' in record, false);
  }
});

test('each record names its own audience', () => {
  for (const { audience, record } of contentAddOnPlan()) {
    assert.equal(record.audience, audience);
  }
});

test('a narrower audience list writes fewer records', () => {
  assert.equal(contentAddOnPlan(['vendor']).length, 3);
  assert.equal(contentAddOnPlan([]).length, 0);
});

// ── The ladder ────────────────────────────────────────────────────────────

test('all three share a group and rank upward', () => {
  const rungs = CONTENT_RUNGS.map((r) => contentAddOn(r, 'vendor'));
  assert.ok(rungs.every((r) => r.group === CONTENT_GROUP));
  assert.deepEqual(rungs.map((r) => r.groupRank), [1, 2, 3]);
});

test('BUYING A RUNG REPLACES THE OTHERS, using the records as written', () => {
  const catalogue = CONTENT_RUNGS.map((r) => contentAddOn(r, 'vendor')) as any[];
  const studio = catalogue.find((a) => a.id === 'content-studio');
  assert.deepEqual(supersededIds(studio, catalogue, ['content-solo']), ['content-solo']);
});

test('holding two rungs collapses to the higher before limits are counted', () => {
  const catalogue = CONTENT_RUNGS.map((r) => contentAddOn(r, 'vendor')) as any[];
  const kept = applicableAddOns(catalogue);
  assert.equal(kept.length, 1);
  assert.equal(kept[0].id, 'content-agency');
});

// ── What it is actually worth ─────────────────────────────────────────────

/**
 * The free backstop is 300 model calls and 10 renders. A rung that did not
 * beat that would be a charge for nothing, which is exactly what this would
 * have been before `effectiveLimits` existed.
 */
const rung = (id: string) => contentAddOn(CONTENT_RUNGS.find((r) => r.id === id)!, 'vendor') as any;

test('EVERY RUNG BEATS THE FREE BACKSTOP OF 300 CALLS AND 10 RENDERS', () => {
  const listed = { deals: 3, products: 250, bidQuotesPerMonth: 10 }; // publishes no AI keys
  for (const id of ['content-solo', 'content-studio', 'content-agency']) {
    const out = effectiveLimits(listed, [rung(id)]);
    assert.ok(Number(out.aiCallsPerMonth) > 300, `${id} model calls`);
    assert.ok(Number(out.rendersPerMonth) > 10, `${id} renders`);
  }
});

test('the rungs rise: Solo under Studio under Agency', () => {
  const calls = ['content-solo', 'content-studio', 'content-agency']
    .map((id) => Number(effectiveLimits({}, [rung(id)]).aiCallsPerMonth));
  assert.deepEqual(calls, [600, 1500, 5000]);
  assert.ok(calls[0] < calls[1] && calls[1] < calls[2]);
});

/**
 * The Agency tier published NO `reelsPerMonth` key and sold "unlimited reels"
 * in its features — which worked only because `withinLimit` reads an absent
 * key as unmetered. As a delta that reading inverts: a key the add-on does not
 * publish is one it says nothing about, so the buyer would fall back to their
 * own plan's ceiling. Unlimited has to be said out loud.
 */
test('AGENCY SAYS UNLIMITED REELS OUT LOUD, rather than by omission', () => {
  const agency = rung('content-agency');
  assert.equal(agency.limits.reelsPerMonth, 0, '0 is how this system spells unlimited');

  // Against a plan that caps reels, Agency must lift the cap rather than add to it.
  const out = effectiveLimits({ reelsPerMonth: 4 }, [agency]);
  assert.equal(out.reelsPerMonth, 0, 'not 4, and not 4 + something');
});

test('Solo and Studio publish real reel ceilings', () => {
  assert.equal(rung('content-solo').limits.reelsPerMonth, 5);
  assert.equal(rung('content-studio').limits.reelsPerMonth, 20);
});

test('the buyer\'s own plan limits are left alone', () => {
  const preferred = { products: 0, deals: 0, alertRadiusMiles: 50 };
  const out = effectiveLimits(preferred, [rung('content-studio')]);
  assert.equal(out.products, 0, 'unlimited products stay unlimited');
  assert.equal(out.alertRadiusMiles, 50);
});

// ── Re-running the seed ───────────────────────────────────────────────────

/**
 * The failure to avoid: running the seed again after the Stripe prices exist,
 * wiping them, and leaving three rungs nobody can buy — which is the exact
 * state this whole exercise began from.
 */
test('A RECORD CARRYING A STRIPE PRICE IS NEVER OVERWRITTEN', () => {
  assert.equal(wouldOverwriteEdits({ id: 'content-solo', stripePriceId: 'price_live_1' }), true);
  assert.equal(wouldOverwriteEdits({ id: 'content-solo', stripePriceIdTest: 'price_test_1' }), true);
});

test('a record whose price somebody changed is left alone', () => {
  assert.equal(wouldOverwriteEdits({ id: 'content-solo', priceCents: 9900 }), true, 'edited from 7900');
  assert.equal(wouldOverwriteEdits({ id: 'content-solo', priceCents: 7900 }), false, 'untouched');
});

test('an absent record is not an edit, so a first run writes', () => {
  assert.equal(wouldOverwriteEdits(null), false);
  assert.equal(wouldOverwriteEdits(undefined), false);
});

test('a blank Stripe id does not count as a linkage', () => {
  assert.equal(wouldOverwriteEdits({ id: 'content-solo', stripePriceId: '', priceCents: 7900 }), false);
  assert.equal(wouldOverwriteEdits({ id: 'content-solo', stripePriceId: '   ', priceCents: 7900 }), false);
});

test('the plan is stable across runs, so a second run writes the same thing', () => {
  assert.deepEqual(contentAddOnPlan(), contentAddOnPlan());
});
