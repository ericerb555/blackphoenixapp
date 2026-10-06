/**
 * Letting the catalogue overrule the shipped price list.
 *
 * WHY THESE ASSERTIONS
 *
 * This decides the figures on a public pricing page, and every way it can fail
 * is silent — a wrong price looks exactly like a right one.
 *
 * The sharpest hazard is a name collision. The shipped plans are
 * starter / professional / enterprise; the catalogue ladder is
 * basic / advanced / professional. "Professional" is in both and means
 * DIFFERENT RUNGS — middle in the catalogue, top in the config. Mapping by name
 * would price the top plan at the middle rung, publicly, with nothing to see.
 *
 * The second hazard is the empty catalogue, which is today's state: anything
 * that treats "no tier published" as "price zero" turns a paid plan into a free
 * one on a page anybody can read.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyCatalogue, applyCatalogueToAll, audiencesFor, foundingRatio,
  RUNG_FOR_TIER, AUDIENCE_FOR_CATEGORY,
  type PricedPlan, type CatalogueTier,
} from '../src/app/config/catalogueBridge.ts';

const plan = (over: Partial<PricedPlan> = {}): PricedPlan => ({
  id: 'vendor-pro',
  category: 'vendor',
  tier: 'professional',
  regularPrice: 199,
  foundingPrice: 139,
  ...over,
});

const catalogue = (tiers: Record<string, CatalogueTier[]>) => tiers;

// ─── The collision ──────────────────────────────────────────────────────────

test('"professional" in the config maps to "advanced" in the catalogue', () => {
  // The whole reason this module exists. Config professional is the MIDDLE
  // plan; catalogue professional is the TOP rung. Mapping by name would show
  // the top rung's price on the middle plan.
  assert.equal(RUNG_FOR_TIER.professional, 'advanced');
  assert.equal(RUNG_FOR_TIER.enterprise, 'professional');
  assert.equal(RUNG_FOR_TIER.starter, 'basic');
});

test('the config top plan takes the catalogue TOP rung, not the one sharing its name', () => {
  const tiers = catalogue({
    vendor: [
      { id: 'basic', priceCents: 4900 },
      { id: 'advanced', priceCents: 11600 },
      { id: 'professional', priceCents: 43900 },
    ],
  });
  const enterprise = applyCatalogue(plan({ tier: 'enterprise', regularPrice: 399, foundingPrice: 279 }), tiers);
  assert.equal(enterprise.plan.regularPrice, 439, 'enterprise must take the catalogue professional rung');

  const professional = applyCatalogue(plan({ tier: 'professional' }), tiers);
  assert.equal(professional.plan.regularPrice, 116, 'config professional must take the advanced rung');
  assert.notEqual(professional.plan.regularPrice, 439);
});

// ─── The empty catalogue, which is today ────────────────────────────────────

test('an empty catalogue changes nothing at all', () => {
  const original = plan();
  const { plan: result, fromCatalogue } = applyCatalogue(original, {});
  assert.equal(fromCatalogue, false);
  assert.deepEqual(result, original);
});

test('a missing tier, a withdrawn one, and a zero price all leave the plan alone', () => {
  // Treating any of these as a price would publish a free plan.
  for (const tiers of [
    catalogue({ vendor: [] }),
    catalogue({ vendor: [{ id: 'advanced', priceCents: 0 }] }),
    catalogue({ vendor: [{ id: 'advanced', priceCents: 11600, active: false }] }),
    catalogue({ vendor: [{ id: 'basic', priceCents: 4900 }] }),
  ]) {
    const { plan: result, fromCatalogue } = applyCatalogue(plan(), tiers);
    assert.equal(fromCatalogue, false, JSON.stringify(tiers));
    assert.equal(result.regularPrice, 199);
  }
});

test('a category with no agreed audience keeps its shipped prices', () => {
  // construction and demolition look like customer sub-categories rather than
  // audiences, and territory-owner has no agreed ladder because no market
  // comparable was found. "Nobody has decided" must not mean "free".
  for (const category of ['construction', 'demolition', 'territory-owner']) {
    const { fromCatalogue, plan: result } = applyCatalogue(
      plan({ category }),
      catalogue({ vendor: [{ id: 'advanced', priceCents: 11600 }] }),
    );
    assert.equal(fromCatalogue, false, category);
    assert.equal(result.regularPrice, 199);
    assert.equal(AUDIENCE_FOR_CATEGORY[category], undefined);
  }
});

// ─── The founding price ─────────────────────────────────────────────────────

test('the founding discount keeps each plan’s own ratio, not a flat 30%', () => {
  // Several shipped plans are not exactly 30% off. Recomputing at 30% would
  // silently re-price those; the ratio preserves what each plan always had.
  const odd = plan({ regularPrice: 200, foundingPrice: 150 }); // 25% off
  assert.equal(foundingRatio(odd), 0.75);
  const { plan: result } = applyCatalogue(odd, catalogue({ vendor: [{ id: 'advanced', priceCents: 40000 }] }));
  assert.equal(result.regularPrice, 400);
  assert.equal(result.foundingPrice, 300, 'the 25% discount is preserved, not reset to 30%');
});

test('a nonsense founding price falls back to the usual discount rather than zero', () => {
  assert.equal(foundingRatio(plan({ regularPrice: 0, foundingPrice: 0 })), 0.7);
  assert.equal(foundingRatio(plan({ regularPrice: 100, foundingPrice: 0 })), 0.7);
  // And never more than the regular price.
  assert.ok(foundingRatio(plan({ regularPrice: 100, foundingPrice: 500 })) <= 1);
});

// ─── Across a whole list ────────────────────────────────────────────────────

test('only the plans the catalogue speaks for are changed, and it says how many', () => {
  const plans = [
    plan({ id: 'v-start', tier: 'starter', regularPrice: 99, foundingPrice: 69 }),
    plan({ id: 'v-pro', tier: 'professional' }),
    plan({ id: 'c-start', category: 'customer', tier: 'starter', regularPrice: 29, foundingPrice: 20 }),
    plan({ id: 'x-start', category: 'construction', tier: 'starter', regularPrice: 49, foundingPrice: 34 }),
  ];
  const { plans: out, fromCatalogue } = applyCatalogueToAll(plans, catalogue({
    vendor: [{ id: 'basic', priceCents: 4900 }],
  }));
  assert.equal(fromCatalogue, 1);
  assert.equal(out[0].regularPrice, 49, 'the vendor starter took the catalogue price');
  assert.equal(out[1].regularPrice, 199, 'no advanced tier published, so unchanged');
  assert.equal(out[2].regularPrice, 29, 'no customer tiers published');
  assert.equal(out[3].regularPrice, 49, 'construction has no audience');
});

test('only the audiences actually needed are fetched', () => {
  const wanted = audiencesFor([
    plan({ category: 'vendor' }),
    plan({ category: 'vendor' }),
    plan({ category: 'customer' }),
    plan({ category: 'construction' }),
  ]);
  assert.deepEqual(wanted.sort(), ['customer', 'vendor']);
});

test('every mapped audience is one the catalogue could answer for', () => {
  // A typo here means a page quietly never finds its prices.
  const known = ['customer', 'vendor', 'subcontractor', 'advertiser', 'investor', 'property_manager', 'condo_association', 'condo_manager', 'content'];
  for (const audience of Object.values(AUDIENCE_FOR_CATEGORY)) {
    assert.ok(known.includes(audience), `${audience} is not a catalogue audience`);
  }
});
