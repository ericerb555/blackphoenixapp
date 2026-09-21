/**
 * What the plan gives, plus what an administrator granted, capped.
 *
 * WHY THESE ASSERTIONS
 *
 * This decides money in the direction that costs the company rather than the
 * customer, so every rule that keeps it bounded is pinned here.
 *
 * The system it replaces failed silently in both directions at once — it fell
 * back to a `localStorage` value the customer owned, and it looked for a
 * membership record nothing ever wrote — so a paying subscriber got nothing
 * while anyone editing one browser value took 15% off the margin. Neither
 * showed up as an error. The lesson is that discount arithmetic needs
 * assertions rather than a comment saying what it does.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveDiscount, grantApplies, discountCents, capFor,
  QUOTE_DISCOUNT_CAP_PERCENT, FOUNDING_SUBSCRIPTION_CAP_PERCENT,
  FOUNDING_SEATS_PER_PORTAL, SUBSCRIPTION_CAP_PERCENT, isFoundingSeat,
  type DiscountGrant,
} from '../supabase/functions/server/discounts.ts';

const NOW = new Date('2026-09-21T12:00:00.000Z');
const TARGET = { customerEmail: 'wanda@example.com', jobId: 'job_1', quoteId: 'quote_1' };

const grant = (over: Partial<DiscountGrant> = {}): DiscountGrant => ({
  id: 'dg_1',
  percent: 5,
  scope: 'customer',
  scopeId: 'wanda@example.com',
  reason: 'Long-standing customer',
  grantedBy: 'staff@example.com',
  ...over,
});

/* ── additive, which is what "additional" means ──────────────────────────── */

test('the plan alone', () => {
  const r = resolveDiscount(10, [], TARGET, NOW);
  assert.equal(r.percent, 10);
  assert.equal(r.capped, false);
  assert.deepEqual(r.components.map(c => c.source), ['plan']);
});

test('ADDITIVE: a plan discount and a grant add together', () => {
  const r = resolveDiscount(10, [grant({ percent: 5 })], TARGET, NOW);
  assert.equal(r.percent, 15);
  assert.equal(r.components.length, 2);
});

test('grants add to each other as well as to the plan', () => {
  const r = resolveDiscount(5, [
    grant({ id: 'a', percent: 5 }),
    grant({ id: 'b', percent: 5 }),
  ], TARGET, NOW);
  assert.equal(r.percent, 15);
});

test('a grant with no plan behind it still applies', () => {
  const r = resolveDiscount(0, [grant({ percent: 7 })], TARGET, NOW);
  assert.equal(r.percent, 7);
});

/* ── the cap, which is the guard ─────────────────────────────────────────── */

test('THE CAP: stacked discounts cannot exceed 20%', () => {
  const r = resolveDiscount(15, [
    grant({ id: 'a', percent: 10 }),
    grant({ id: 'b', percent: 10 }),
  ], TARGET, NOW);
  assert.equal(r.percent, 20, 'three well-meant sources cannot sell the job below cost');
  assert.equal(r.capped, true);
  assert.equal(r.requestedPercent, 35, 'what they asked for is still reported');
});

test('the cap is 20 and it is the default', () => {
  assert.equal(QUOTE_DISCOUNT_CAP_PERCENT, 20);
  assert.equal(resolveDiscount(50, [], TARGET, NOW).percent, 20);
});

test('exactly at the cap is not reported as capped', () => {
  const r = resolveDiscount(20, [], TARGET, NOW);
  assert.equal(r.percent, 20);
  assert.equal(r.capped, false);
});

/* ── a grant has to earn its place ───────────────────────────────────────── */

test('a revoked grant does not apply', () => {
  assert.ok(!grantApplies(grant({ revokedAt: '2026-09-01T00:00:00Z' }), TARGET, NOW));
  assert.equal(resolveDiscount(0, [grant({ revokedAt: '2026-09-01T00:00:00Z' })], TARGET, NOW).percent, 0);
});

test('AN EXPIRED GRANT DOES NOT APPLY — this is the one that outlives its reason', () => {
  assert.ok(!grantApplies(grant({ expiresAt: '2026-09-20T00:00:00Z' }), TARGET, NOW));
});

test('a grant that has not started yet does not apply', () => {
  assert.ok(!grantApplies(grant({ startsAt: '2026-10-01T00:00:00Z' }), TARGET, NOW));
});

test('a grant inside its window applies', () => {
  assert.ok(grantApplies(
    grant({ startsAt: '2026-09-01T00:00:00Z', expiresAt: '2026-10-01T00:00:00Z' }), TARGET, NOW));
});

test('the boundary: a grant expiring exactly now has expired', () => {
  assert.ok(!grantApplies(grant({ expiresAt: NOW.toISOString() }), TARGET, NOW));
});

test('an unreadable date fails closed rather than open', () => {
  // A date nobody can parse is not evidence a discount is still live, and
  // defaulting the other way turns a typo into an open-ended giveaway.
  assert.ok(!grantApplies(grant({ expiresAt: 'whenever' }), TARGET, NOW));
  assert.ok(!grantApplies(grant({ startsAt: 'soon' }), TARGET, NOW));
});

test('a zero or negative grant is not a discount', () => {
  assert.ok(!grantApplies(grant({ percent: 0 }), TARGET, NOW));
  assert.ok(!grantApplies(grant({ percent: -10 }), TARGET, NOW));
});

/* ── scope: a grant does not wander ──────────────────────────────────────── */

test("A JOB GRANT DOES NOT FOLLOW THE CUSTOMER TO THE NEXT JOB", () => {
  const g = grant({ scope: 'job', scopeId: 'job_1' });
  assert.ok(grantApplies(g, TARGET, NOW));
  assert.ok(!grantApplies(g, { ...TARGET, jobId: 'job_2' }, NOW));
});

test('a quote grant applies to that quote only', () => {
  const g = grant({ scope: 'quote', scopeId: 'quote_1' });
  assert.ok(grantApplies(g, TARGET, NOW));
  assert.ok(!grantApplies(g, { ...TARGET, quoteId: 'quote_2' }, NOW));
});

test('a customer grant matches regardless of letter case', () => {
  assert.ok(grantApplies(grant({ scopeId: 'WANDA@Example.com' }), TARGET, NOW));
});

test('a grant with no scopeId matches nothing', () => {
  assert.ok(!grantApplies(grant({ scopeId: '' }), TARGET, NOW));
});

test('an unrecognised scope is not a licence to discount everything', () => {
  assert.ok(!grantApplies(grant({ scope: 'everything' as any }), TARGET, NOW));
});

test('a customer grant does not apply to a different customer', () => {
  assert.ok(!grantApplies(grant(), { ...TARGET, customerEmail: 'someone@else.com' }, NOW));
});

/* ── nothing resolves to nothing ─────────────────────────────────────────── */

test('no plan and no grants is zero, not a default', () => {
  const r = resolveDiscount(null, null, TARGET, NOW);
  assert.equal(r.percent, 0);
  assert.deepEqual(r.components, []);
});

test('a nonsense plan percentage contributes nothing', () => {
  assert.equal(resolveDiscount(Number.NaN, [], TARGET, NOW).percent, 0);
  assert.equal(resolveDiscount(-30, [], TARGET, NOW).percent, 0);
});

/* ── the money ───────────────────────────────────────────────────────────── */

test('the cash discount is rounded once, here', () => {
  assert.equal(discountCents(10000, 15), 1500);
  assert.equal(discountCents(999, 10), 100);
});

test('a discount never exceeds the subtotal', () => {
  assert.equal(discountCents(5000, 100), 5000);
});

test('nothing off nothing', () => {
  assert.equal(discountCents(0, 20), 0);
  assert.equal(discountCents(10000, 0), 0);
  assert.equal(discountCents(-100, 20), 0);
});

/* ── the ceiling depends on what is being discounted ─────────────────────── */

test('quoted work is capped at 20%', () => {
  assert.equal(capFor('quote'), 20);
  assert.equal(QUOTE_DISCOUNT_CAP_PERCENT, 20);
});

test('THE FIRST TEN OF EVERY PORTAL may have up to 30% off the subscription', () => {
  assert.equal(capFor('subscription', { seatNumber: 1 }), 30);
  assert.equal(capFor('subscription', { seatNumber: 10 }), 30);
  assert.equal(FOUNDING_SUBSCRIPTION_CAP_PERCENT, 30);
  assert.equal(FOUNDING_SEATS_PER_PORTAL, 10);
});

test('THE ELEVENTH DOES NOT — the founding offer is a promise to ten', () => {
  assert.equal(capFor('subscription', { seatNumber: 11 }), SUBSCRIPTION_CAP_PERCENT);
  assert.equal(capFor('subscription', { seatNumber: 50 }), SUBSCRIPTION_CAP_PERCENT);
  assert.ok(!isFoundingSeat(11));
});

test('seats are counted per portal, so the tenth of each portal is founding', () => {
  // The eleventh vendor is not founding even if only three advertisers have
  // signed up. The function takes a seat number precisely so the counting
  // happens per portal, where the caller knows the portal.
  for (const seat of [1, 5, 10]) assert.ok(isFoundingSeat(seat));
  for (const seat of [0, 11, 999]) assert.ok(!isFoundingSeat(seat));
});

test('an unknown seat gets the standard cap, not the founding one', () => {
  // Not knowing whether somebody is among the first ten is not evidence that
  // they are. A genuine founding subscriber who resolves low can be topped up
  // with a grant; 30% handed to the fiftieth cannot be taken back.
  assert.equal(capFor('subscription', {}), SUBSCRIPTION_CAP_PERCENT);
  assert.equal(capFor('subscription', { seatNumber: null }), SUBSCRIPTION_CAP_PERCENT);
  assert.equal(capFor('subscription', { seatNumber: Number.NaN }), SUBSCRIPTION_CAP_PERCENT);
  assert.ok(!isFoundingSeat(undefined));
  assert.ok(!isFoundingSeat(null));
});

test('UP TO 30%, not automatically 30% — it is a ceiling, not a rate', () => {
  // Nobody receives the founding discount by existing. It bounds what may be
  // given; what is actually given is the plan's percentage plus grants.
  const nothingGranted = resolveDiscount(0, [], TARGET, NOW, capFor('subscription', { seatNumber: 2 }));
  assert.equal(nothingGranted.percent, 0);

  const granted = resolveDiscount(0, [grant({ percent: 30 })], TARGET, NOW, capFor('subscription', { seatNumber: 2 }));
  assert.equal(granted.percent, 30);
});

test('a founding subscriber may reach 30 where quoted work stops at 20', () => {
  const grants = [grant({ id: 'a', percent: 20 }), grant({ id: 'b', percent: 20 })];
  const fee = resolveDiscount(0, grants, TARGET, NOW, capFor('subscription', { seatNumber: 3 }));
  const job = resolveDiscount(0, grants, TARGET, NOW, capFor('quote'));
  assert.equal(fee.percent, 30);
  assert.equal(job.percent, 20);
  assert.ok(fee.capped && job.capped, "both were asked for more than they may give");
});

test('LIFETIME means no expiry date, so it survives renewals', () => {
  // A lifetime grant carries no expiresAt. What ends it is the subscription
  // lapsing, which the entitlement knows about — not a date on the grant.
  const lifetime = grant({ percent: 30, expiresAt: undefined, reason: 'Founding subscriber' });
  assert.ok(grantApplies(lifetime, TARGET, NOW));
  assert.ok(grantApplies(lifetime, TARGET, new Date('2030-01-01T00:00:00Z')));
});
