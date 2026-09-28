/**
 * Which accounts count as revenue.
 *
 * This is the join that was MISSING: `cohorts.tsx` read `grant.cohortId` and
 * nothing had ever written that field, so every cohort's revenue and
 * subscriber count derived to zero. These tests pin the rule that replaces it
 * — the cohort is derived from the `tierId` the grant already carries — and,
 * more importantly, pin which statuses become money. Counting a trial or an
 * account in arrears as revenue is the fabricated-P&L failure arrived at
 * politely: the figure looks defensible and is still wrong.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cohortIdForTier, membershipFromGrant, membershipsFromGrants,
} from '../supabase/functions/server/cohortMembership.ts';
import { cohortFromTier, monthlyRevenueOf } from '../supabase/functions/server/cohortPricing.ts';

const NOW = new Date('2026-09-28T12:00:00.000Z');
const paying = (over = {}) => ({
  email: 'a@example.com',
  status: 'active',
  tierId: 'studio',
  stripeSubscriptionId: 'sub_123',
  ...over,
});

// ── The id must match the migration's, or nothing joins ───────────────────

/**
 * If these two ever disagree, every figure silently returns to zero — which
 * is exactly the failure being fixed, and it would look like "no sales yet".
 */
test('THE DERIVED ID MATCHES THE ONE THE MIGRATION WRITES', () => {
  const cohort = cohortFromTier({ id: 'studio', name: 'Studio', priceCents: 14900 });
  assert.equal(cohortIdForTier('studio'), cohort.id);
});

test('no tier means no cohort, rather than a cohort called undefined', () => {
  assert.equal(cohortIdForTier(''), null);
  assert.equal(cohortIdForTier(null), null);
  assert.equal(cohortIdForTier(undefined), null);
  assert.equal(cohortIdForTier('  '), null);
});

test('a tier id is trimmed before it is used as a key', () => {
  assert.equal(cohortIdForTier('  studio  '), 'cohort-tier-studio');
});

// ── What counts as paying ─────────────────────────────────────────────────

test('a paying subscription is active, in its tier cohort', () => {
  const m = membershipFromGrant(paying(), NOW);
  assert.equal(m.cohortId, 'cohort-tier-studio');
  assert.equal(m.status, 'active');
  assert.equal(m.seats, 1);
});

/**
 * A tier id with no Stripe subscription behind it is somebody who was given a
 * tier, not somebody paying for one.
 */
test('a tier with no subscription behind it is NOT revenue', () => {
  const m = membershipFromGrant(paying({ stripeSubscriptionId: '' }), NOW);
  assert.equal(m.cohortId, 'cohort-tier-studio', 'still a member of the cohort');
  assert.notEqual(m.status, 'active', 'but not counted as money');
});

test('A REVOKED GRANT IS INACTIVE WHATEVER STRIPE SAYS', () => {
  assert.equal(membershipFromGrant(paying({ status: 'revoked' }), NOW).status, 'inactive');
  assert.equal(membershipFromGrant(paying({ status: 'suspended' }), NOW).status, 'inactive');
});

// ── Arrears ───────────────────────────────────────────────────────────────

/**
 * An account fifteen days into the grace period still has access — that is
 * deliberate, and `resolveEntitlement` handles it. But access is not income.
 * Counting a past-due account as revenue reports money that failed to arrive.
 */
test('PAST DUE IS A MEMBER BUT NOT REVENUE', () => {
  for (const s of ['past_due', 'unpaid', 'PAST_DUE']) {
    const m = membershipFromGrant(paying({ lastSubscriptionStatus: s }), NOW);
    assert.equal(m.cohortId, 'cohort-tier-studio', `${s} is still in the cohort`);
    assert.equal(m.status, 'past_due', `${s} must not count as money`);
  }
});

test('a cancelled subscription stops counting', () => {
  for (const s of ['canceled', 'cancelled', 'incomplete_expired']) {
    assert.equal(membershipFromGrant(paying({ lastSubscriptionStatus: s }), NOW).status, 'inactive', s);
  }
});

test('an explicitly active Stripe status is active', () => {
  assert.equal(membershipFromGrant(paying({ lastSubscriptionStatus: 'active' }), NOW).status, 'active');
});

// ── Trials ────────────────────────────────────────────────────────────────

test('A RUNNING TRIAL IS A MEMBER, NEVER REVENUE', () => {
  const m = membershipFromGrant({
    email: 't@example.com', status: 'active', tierId: 'studio',
    trialStart: '2026-09-01T00:00:00.000Z', trialEnd: '2026-12-01T00:00:00.000Z',
  }, NOW);
  assert.equal(m.cohortId, 'cohort-tier-studio');
  assert.equal(m.status, 'trialing');
});

test('an expired trial is nobody\'s paying member', () => {
  const m = membershipFromGrant({
    status: 'active', tierId: 'studio',
    trialStart: '2026-01-01T00:00:00.000Z', trialEnd: '2026-06-01T00:00:00.000Z',
  }, NOW);
  assert.equal(m.status, 'inactive');
});

/**
 * A trial with an unreadable end date is a BROKEN trial. It must not resolve
 * to anything that earns, and it must not resolve to open-ended access.
 */
test('a trial with a missing or unreadable end date does not count', () => {
  for (const trialEnd of ['', 'not a date', undefined]) {
    const m = membershipFromGrant({
      status: 'active', tierId: 'studio', trialStart: '2026-09-01T00:00:00.000Z', trialEnd,
    } as any, NOW);
    assert.equal(m.status, 'inactive', `trialEnd=${String(trialEnd)}`);
  }
});

/**
 * A subscription taken out with a Stripe-side trial is a real subscription
 * that has not billed yet. It is not the same thing as our own trial grant,
 * and neither one is money.
 */
test('a Stripe-side trialing subscription is a member, not revenue', () => {
  assert.equal(membershipFromGrant(paying({ lastSubscriptionStatus: 'trialing' }), NOW).status, 'trialing');
});

// ── Comped, staff, and grants with nothing on them ────────────────────────

test('a comped account on a tier is a member that pays nothing', () => {
  const m = membershipFromGrant({ status: 'active', tierId: 'studio' }, NOW);
  assert.equal(m.cohortId, 'cohort-tier-studio');
  assert.equal(m.status, 'trialing', 'a member, but never counted as revenue');
});

test('a grant with no tier at all belongs to no cohort', () => {
  const m = membershipFromGrant({ status: 'active', trialStart: '2026-09-01T00:00:00.000Z' }, NOW);
  assert.equal(m.cohortId, null);
});

test('a missing grant resolves to nothing rather than throwing', () => {
  assert.equal(membershipFromGrant(null).cohortId, null);
  assert.equal(membershipFromGrant(undefined).status, 'inactive');
});

// ── Seats ─────────────────────────────────────────────────────────────────

test('seats default to one and never go below it', () => {
  assert.equal(membershipFromGrant(paying(), NOW).seats, 1);
  assert.equal(membershipFromGrant(paying({ seats: 12 }), NOW).seats, 12);
  assert.equal(membershipFromGrant(paying({ seats: 0 }), NOW).seats, 1, 'zero seats is not a thing');
  assert.equal(membershipFromGrant(paying({ seats: -4 }), NOW).seats, 1);
  assert.equal(membershipFromGrant(paying({ seats: 'lots' } as any), NOW).seats, 1);
  assert.equal(membershipFromGrant(paying({ seats: 3.7 }), NOW).seats, 3, 'whole seats only');
});

// ── The list, and what it adds up to ──────────────────────────────────────

test('grants with no cohort are dropped from the list entirely', () => {
  const list = membershipsFromGrants([
    paying(),
    { status: 'active', trialStart: '2026-09-01T00:00:00.000Z' }, // no tier
    null,
    paying({ tierId: 'agency' }),
  ], NOW);
  assert.equal(list.length, 2);
  assert.deepEqual(list.map((m) => m.cohortId), ['cohort-tier-studio', 'cohort-tier-agency']);
});

/**
 * The whole point, end to end: a migrated tier, four real grants, and a
 * revenue figure that counts only the one that is actually paying.
 */
test('REVENUE COUNTS THE PAYING ACCOUNT AND NOTHING ELSE', () => {
  const cohort = cohortFromTier({ id: 'studio', name: 'Studio', priceCents: 14900, active: true });
  const memberships = membershipsFromGrants([
    paying({ email: 'pays@example.com' }),
    paying({ email: 'behind@example.com', lastSubscriptionStatus: 'past_due' }),
    paying({ email: 'gone@example.com', status: 'revoked' }),
    { status: 'active', tierId: 'studio', trialStart: '2026-09-01T00:00:00.000Z', trialEnd: '2026-12-01T00:00:00.000Z' },
  ], NOW);

  assert.equal(memberships.length, 4, 'all four belong to the cohort');
  assert.equal(monthlyRevenueOf(cohort, memberships), 149, 'only one of them is money');
});
