/**
 * Audiences that may no longer hold a sellable tier.
 *
 * WHY THESE ASSERTIONS
 *
 * The catalogue holds the content centre twice: correctly, as eighteen
 * `plan_addon` records across the six audiences Eric named, and incorrectly as
 * three `plan_tier:content:*` rungs that the ruling replaced but nobody
 * removed. Solo $79, Studio $199 and Agency $499, inactive, with no Stripe
 * price — indistinguishable, to anyone tidying the catalogue, from three tiers
 * waiting to be switched on.
 *
 * So what is pinned here is that the refusal is keyed on the audience rather
 * than on the rows, because the rows are the thing that might be edited; that
 * an unknown audience is not treated as retired, which would deny the whole
 * catalogue the moment a new audience is added; and that the reason says what
 * to do instead, since an administrator who is only told "no" will reasonably
 * conclude the catalogue is broken.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  retiredTierAudience,
  sellableAudiences,
  RETIRED_TIER_AUDIENCES,
} from '../supabase/functions/server/retiredAudiences.ts';

const ALL = [
  'vendor', 'subcontractor', 'advertiser', 'customer',
  'content', 'property_manager', 'landlord', 'condo_association',
  'investor', 'condo_manager',
];

test('content may no longer hold a tier', () => {
  const verdict = retiredTierAudience('content');
  assert.equal(verdict.retired, true);
  assert.ok(verdict.reason.length > 0, 'a refusal with no reason is a bug report waiting to happen');
});

test('the reason names the add-on to use instead', () => {
  // An administrator told only "no" concludes the catalogue is broken and goes
  // looking for the bug. The three add-on ids are the answer to their question.
  const { reason } = retiredTierAudience('content');
  for (const id of ['content-solo', 'content-studio', 'content-agency']) {
    assert.match(reason, new RegExp(id), id);
  }
  assert.match(reason, /add-on/i);
});

test('every audience that still sells a tier is allowed', () => {
  for (const audience of ALL.filter((a) => a !== 'content')) {
    assert.equal(retiredTierAudience(audience).retired, false, audience);
    assert.equal(retiredTierAudience(audience).reason, '', audience);
  }
});

test('an unknown audience is not retired', () => {
  // Deliberately NOT fail-closed, and the distinction matters: this guard's job
  // is to withdraw one named product, not to vet audiences. `readAudience`
  // already rejects anything outside the union, before this is reached. Reading
  // "unknown" as "retired" here would refuse every audience added in future
  // until somebody found this file.
  for (const odd of ['territory_owner', 'franchisee', '', '   ']) {
    assert.equal(retiredTierAudience(odd).retired, false, JSON.stringify(odd));
  }
});

test('nothing inherited from Object counts as retired', () => {
  // `RETIRED_TIER_AUDIENCES` is a plain object, so a bare `map[key]` lookup
  // would answer for 'constructor', 'toString' and '__proto__' — and a request
  // to POST /plan-tiers/constructor would be refused with the content-centre
  // sentence, which is a confusing way to learn about prototype chains.
  for (const key of ['constructor', 'toString', 'hasOwnProperty', '__proto__', 'valueOf']) {
    assert.equal(retiredTierAudience(key).retired, false, key);
  }
});

test('a non-string audience does not throw', () => {
  for (const bad of [null, undefined, 0, {}, [], true] as any[]) {
    assert.equal(retiredTierAudience(bad).retired, false, String(bad));
  }
});

test('sellableAudiences drops content and keeps the rest in order', () => {
  const left = sellableAudiences(ALL);
  assert.equal(left.length, ALL.length - 1);
  assert.ok(!left.includes('content'));
  assert.deepEqual(left.slice(0, 4), ['vendor', 'subcontractor', 'advertiser', 'customer']);
});

test('sellableAudiences survives a missing list', () => {
  assert.deepEqual(sellableAudiences(null as any), []);
  assert.deepEqual(sellableAudiences([]), []);
});

test('content is the only retirement, so adding one is a deliberate act', () => {
  // If this fails, something was retired without a test saying why. The point of
  // the assertion is that withdrawing an audience stops a product being sold,
  // which is Eric's decision and not a tidy-up.
  assert.deepEqual(Object.keys(RETIRED_TIER_AUDIENCES), ['content']);
});
