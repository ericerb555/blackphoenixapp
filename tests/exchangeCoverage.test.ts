/**
 * What a business covers, and who gets shown a job.
 *
 * WHY THESE ASSERTIONS
 *
 * Three rules in here decide whether the Exchange feels like it understands
 * the question or like a mailing list, and each has a tempting wrong version.
 *
 * A BUSINESS HOLDS CATEGORIES, A REQUEST NAMES A SERVICE. The tempting wrong
 * version is exact matching, which would mean a roofer who holds "Roofing"
 * never sees a request for "roof repair". Nobody would report that as a bug —
 * they would just quietly get no work and cancel.
 *
 * NO COORDINATES MEANS NO MATCH. The tempting wrong version is treating an
 * unknown location as "matches everything", because it makes the early,
 * sparse directory look busy. It would bury customers in quotes from
 * companies two states away.
 *
 * TEN IS THE CEILING AT ANY PRICE. The tempting wrong version is letting a
 * paid allowance climb past it, which defeats the thing the limit exists for.
 *
 * The allowance numbers are also pinned so that a change to them is a
 * deliberate act with a failing test attached, rather than a constant someone
 * nudged.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  distanceMiles,
  covers,
  coversCategory,
  coversDistance,
  explainCoverage,
  matchingOrgs,
  allowanceFor,
  allowanceState,
  canAddCategory,
  normalisePhrase,
  INCLUDED_CATEGORIES,
  MAX_CATEGORIES,
  type OrgCoverage,
  type RequestTarget,
} from '../supabase/functions/server/exchangeCoverage.ts';

// Real places, so the distances mean something: the three launch towns.
const PELHAM = { lat: 42.7362, lng: -71.3273 };
const SALEM = { lat: 42.7884, lng: -71.2009 };
const MANCHESTER = { lat: 42.9956, lng: -71.4548 };

const ROOFING = 'cat-roofing';
const ROOF_REPAIR = 'svc-roof-repair';
const PLUMBING = 'cat-plumbing';

const org = (over: Partial<OrgCoverage> = {}): OrgCoverage => ({
  orgId: 'org-1',
  categoryIds: [ROOFING],
  serviceLat: PELHAM.lat,
  serviceLng: PELHAM.lng,
  serviceRadiusMiles: 35,
  ...over,
});

const target = (over: Partial<RequestTarget> = {}): RequestTarget => ({
  categoryId: ROOF_REPAIR,
  parentCategoryId: ROOFING,
  lat: SALEM.lat,
  lng: SALEM.lng,
  ...over,
});

// ── distance ─────────────────────────────────────────────────────────────────

test('Pelham to Salem is about seven miles', () => {
  const miles = distanceMiles(PELHAM, SALEM);
  assert.ok(miles !== null && miles > 5 && miles < 9, `got ${miles}`);
});

test('Pelham to Manchester is about twenty', () => {
  const miles = distanceMiles(PELHAM, MANCHESTER);
  assert.ok(miles !== null && miles > 17 && miles < 24, `got ${miles}`);
});

test('a point to itself is zero, not NaN', () => {
  // acos of a hair above 1 returns NaN, which would read as "no distance
  // known" for a business standing on the job.
  assert.equal(distanceMiles(SALEM, { ...SALEM }), 0);
});

test('an unknown end is null, never a very large number', () => {
  for (const bad of [
    { lat: null, lng: null },
    { lat: 42, lng: undefined },
    { lat: NaN, lng: -71 },
    { lat: 200, lng: -71 },
    { lat: 42, lng: 999 },
  ]) {
    assert.equal(distanceMiles(bad as any, SALEM), null, JSON.stringify(bad));
    assert.equal(distanceMiles(SALEM, bad as any), null, JSON.stringify(bad));
  }
});

// ── the category rule ────────────────────────────────────────────────────────

test('holding the parent category matches a request for one of its services', () => {
  // The whole point. A roofer holds "Roofing" and must see "roof repair".
  assert.equal(coversCategory(org({ categoryIds: [ROOFING] }), target()), true);
});

test('holding the exact category matches too', () => {
  assert.equal(
    coversCategory(org({ categoryIds: [ROOF_REPAIR] }), target()),
    true,
  );
});

test('a category they do not hold does not match', () => {
  assert.equal(coversCategory(org({ categoryIds: [PLUMBING] }), target()), false);
});

test('holding nothing matches nothing', () => {
  assert.equal(coversCategory(org({ categoryIds: [] }), target()), false);
});

test('an unresolved request matches nobody', () => {
  // It goes to the demand ledger and to Black Phoenix's "might be ours"
  // queue instead, which is a deliberate path, not this one.
  assert.equal(coversCategory(org(), target({ categoryId: null })), false);
});

// ── the distance rule, and failing closed ────────────────────────────────────

test('inside the radius covers, outside does not', () => {
  assert.equal(coversDistance(org({ serviceRadiusMiles: 35 }), target()), true);
  assert.equal(coversDistance(org({ serviceRadiusMiles: 3 }), target()), false);
});

test('a business with no location matches nothing', () => {
  const nowhere = org({ serviceLat: null, serviceLng: null });
  assert.equal(coversDistance(nowhere, target()), false);
  assert.equal(covers(nowhere, target()), false, 'unknown is not everywhere');
});

test('a business with no declared radius matches nothing', () => {
  // An undeclared radius is not an infinite one.
  for (const radius of [null, undefined, 0, -5]) {
    assert.equal(
      coversDistance(org({ serviceRadiusMiles: radius as any }), target()),
      false,
      `radius ${radius}`,
    );
  }
});

test('a request with no location matches nothing', () => {
  assert.equal(coversDistance(org(), target({ lat: null, lng: null })), false);
});

test('covers needs both halves', () => {
  assert.equal(covers(org(), target()), true);
  assert.equal(covers(org({ categoryIds: [PLUMBING] }), target()), false);
  assert.equal(covers(org({ serviceRadiusMiles: 1 }), target()), false);
});

// ── why somebody did not match ───────────────────────────────────────────────

test('the miss reason is specific enough to act on', () => {
  assert.equal(explainCoverage(org(), target()), 'covered');
  assert.equal(explainCoverage(org(), target({ categoryId: null })), 'unresolved_request');
  assert.equal(explainCoverage(org({ categoryIds: [PLUMBING] }), target()), 'category');
  assert.equal(explainCoverage(org({ serviceRadiusMiles: null }), target()), 'no_radius');
  assert.equal(
    explainCoverage(org({ serviceLat: null, serviceLng: null }), target()),
    'no_location',
  );
  assert.equal(explainCoverage(org({ serviceRadiusMiles: 2 }), target()), 'out_of_range');
});

// ── ordering ─────────────────────────────────────────────────────────────────

test('matches come back nearest first', () => {
  const near = org({ orgId: 'salem', serviceLat: SALEM.lat, serviceLng: SALEM.lng });
  const mid = org({ orgId: 'pelham' });
  const far = org({
    orgId: 'manchester',
    serviceLat: MANCHESTER.lat,
    serviceLng: MANCHESTER.lng,
    serviceRadiusMiles: 40,
  });
  const out = matchingOrgs([far, mid, near], target());
  assert.deepEqual(out.map((o) => o.orgId), ['salem', 'pelham', 'manchester']);
});

test('non-matching businesses are left out rather than sorted last', () => {
  const out = matchingOrgs([org({ orgId: 'wrong-trade', categoryIds: [PLUMBING] })], target());
  assert.deepEqual(out, []);
});

// ── the allowance ────────────────────────────────────────────────────────────

test('five included, ten the ceiling', () => {
  assert.equal(INCLUDED_CATEGORIES, 5);
  assert.equal(MAX_CATEGORIES, 10);
});

test('the default allowance is the included five', () => {
  assert.equal(allowanceFor({ categoryAllowance: null }), 5);
  assert.equal(allowanceFor({} as any), 5);
});

test('a bought allowance is honoured up to the ceiling and no further', () => {
  assert.equal(allowanceFor({ categoryAllowance: 8 }), 8);
  assert.equal(allowanceFor({ categoryAllowance: 10 }), 10);
  // Nobody holds eleven at any price.
  assert.equal(allowanceFor({ categoryAllowance: 25 }), 10);
  assert.equal(allowanceFor({ categoryAllowance: -3 }), 0);
});

test('the operator is exempt, and only the operator', () => {
  assert.equal(allowanceFor({ type: 'operator', categoryAllowance: 5 }), Infinity);
  assert.equal(allowanceFor({ type: 'subcontractor', categoryAllowance: 5 }), 5);
  assert.equal(allowanceFor({ type: 'vendor', categoryAllowance: 5 }), 5);
});

test('the state the portal shows during the trial', () => {
  // A contractor holding fifteen on a default allowance should see the whole
  // truth from day one, not discover it at month six.
  const over = allowanceState({ categoryAllowance: 5 }, 15);
  assert.equal(over.held, 15);
  assert.equal(over.allowance, 5);
  assert.equal(over.remaining, 0);
  assert.equal(over.purchasable, 5);
  assert.equal(over.atCeiling, false);

  const maxed = allowanceState({ categoryAllowance: 10 }, 10);
  assert.equal(maxed.remaining, 0);
  assert.equal(maxed.purchasable, 0);
  assert.equal(maxed.atCeiling, true);

  const room = allowanceState({ categoryAllowance: 5 }, 2);
  assert.equal(room.remaining, 3);
});

test('adding a category is refused for the right reason', () => {
  assert.equal(canAddCategory({ categoryAllowance: 5 }, 2, false), 'ok');
  assert.equal(canAddCategory({ categoryAllowance: 5 }, 5, false), 'allowance_reached');
  assert.equal(canAddCategory({ categoryAllowance: 10 }, 10, false), 'ceiling_reached');
  assert.equal(canAddCategory({ type: 'operator' }, 40, false), 'ok');
});

test('a service leaf can never be held, however much room there is', () => {
  assert.equal(canAddCategory({ categoryAllowance: 10 }, 0, true), 'not_a_category');
  assert.equal(canAddCategory({ type: 'operator' }, 0, true), 'not_a_category');
});

// ── phrases ──────────────────────────────────────────────────────────────────

test('phrase normalisation matches what the SQL index is built on', () => {
  // lower-cased, whitespace collapsed, trimmed, empty becomes null — the same
  // four steps as exchange_normalise_phrase(). If these drift, a lookup
  // misses an alias sitting right there in the table.
  assert.equal(normalisePhrase('  Leaky   FAUCET '), 'leaky faucet');
  assert.equal(normalisePhrase('Roof\tRepair\n'), 'roof repair');
  assert.equal(normalisePhrase('   '), null);
  assert.equal(normalisePhrase(''), null);
  assert.equal(normalisePhrase(null), null);
  assert.equal(normalisePhrase(42 as any), null);
});
