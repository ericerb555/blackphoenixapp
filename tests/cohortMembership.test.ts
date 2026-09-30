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
  cohortIdForTier, membershipFromGrant, membershipsFromGrants, monthlyRecurringCents,
  unattachedTrials,
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

// ── Monthly recurring revenue ─────────────────────────────────────────────

/**
 * The figure this replaces was wrong in a way that could only grow.
 *
 * The territory screen summed `amount` across every `subscription:` record
 * marked active. Those are written by `/subscriptions/checkout`, which runs
 * Stripe in `mode: 'payment'` — it bills ONCE, and nothing renews or closes
 * the record. So every one-off sale ever made counted as recurring revenue
 * forever: the number could never come down, and a territory owner was told
 * their monthly income included a sale made once, a year ago.
 */
const cohorts: Record<string, { basePrice: number }> = {
  'cohort-tier-studio': { basePrice: 149 },
  'cohort-tier-agency': { basePrice: 499 },
};
const lookup = (id: string) => cohorts[id] ?? null;

test('MRR sums only the paying memberships', () => {
  const total = monthlyRecurringCents([
    paying({ email: 'a@x.com' }),
    paying({ email: 'b@x.com', tierId: 'agency' }),
  ], lookup);
  assert.equal(total, 64800, '$149 + $499');
});

test('A ONE-OFF SALE IS NOT RECURRING REVENUE', () => {
  // A grant with no subscription behind it — what a `mode: 'payment'` sale
  // leaves. It must contribute nothing.
  const total = monthlyRecurringCents([
    paying({ email: 'a@x.com' }),
    { email: 'oneoff@x.com', status: 'active', tierId: 'agency' },
  ], lookup);
  assert.equal(total, 14900, 'only the real subscription counts');
});

test('trials, arrears and cancellations contribute nothing', () => {
  const total = monthlyRecurringCents([
    paying({ email: 'pays@x.com' }),
    paying({ email: 'trial@x.com', lastSubscriptionStatus: 'trialing' }),
    paying({ email: 'behind@x.com', lastSubscriptionStatus: 'past_due' }),
    paying({ email: 'gone@x.com', lastSubscriptionStatus: 'canceled' }),
    paying({ email: 'revoked@x.com', status: 'revoked' }),
  ], lookup);
  assert.equal(total, 14900);
});

test('seats multiply the figure', () => {
  assert.equal(monthlyRecurringCents([paying({ seats: 4 })], lookup), 59600);
});

/**
 * A territory owner must see their own roster and nobody else's. Getting this
 * wrong would show one owner the whole platform's income.
 */
test('SCOPED TO THE GIVEN ACCOUNTS, AND NOBODY ELSE', () => {
  const grants = [
    paying({ email: 'mine@x.com' }),
    paying({ email: 'theirs@x.com', tierId: 'agency' }),
  ];
  assert.equal(monthlyRecurringCents(grants, lookup, { emails: new Set(['mine@x.com']) }), 14900);
  assert.equal(monthlyRecurringCents(grants, lookup, { emails: new Set() }), 0, 'an empty roster earns nothing');
  assert.equal(monthlyRecurringCents(grants, lookup), 64800, 'no set means the whole platform');
});

test('the email match is case-insensitive', () => {
  const total = monthlyRecurringCents(
    [paying({ email: 'Mixed@Example.COM' })],
    lookup,
    { emails: new Set(['mixed@example.com']) },
  );
  assert.equal(total, 14900);
});

/**
 * A membership pointing at a cohort that does not exist must contribute
 * nothing rather than throw or guess a price.
 */
test('a missing or priceless cohort contributes nothing', () => {
  assert.equal(monthlyRecurringCents([paying({ tierId: 'ghost' })], lookup), 0);
  assert.equal(monthlyRecurringCents([paying()], () => ({ basePrice: 0 })), 0);
  assert.equal(monthlyRecurringCents([paying()], () => null), 0);
  assert.equal(monthlyRecurringCents([paying()], () => ({ basePrice: NaN })), 0);
});

test('an empty or broken grant list is zero, not a crash', () => {
  assert.equal(monthlyRecurringCents([], lookup), 0);
  assert.equal(monthlyRecurringCents([null, undefined], lookup), 0);
});

test('an odd price converts to whole cents without drift', () => {
  assert.equal(monthlyRecurringCents([paying()], () => ({ basePrice: 33.33 })), 3333);
});

// ── Trials, which are not a rung of the ladder ────────────────────────────

/**
 * Eric's rule: "a trial is use of all componats then it moves to tiers upon
 * completion." A trial is not a tier, so it carries no tierId and belongs to
 * no cohort — correct, not a gap. But seven of the eight live accounts are
 * trials, so a screen counting only cohort members reports ONE across the
 * whole platform while eight are served. That reads as a bug and invites the
 * wrong fix. These pin the separate count that prevents it.
 */
const trial = (over = {}) => ({
  email: 't@example.com', status: 'active',
  trialStart: '2026-09-01T00:00:00.000Z', trialEnd: '2026-12-01T00:00:00.000Z',
  ...over,
});

test('A TRIAL WITH NO TIER IS COUNTED HERE, because nothing else counts it', () => {
  assert.equal(unattachedTrials([trial()], NOW), 1);
});

test('the eight live accounts read as one subscriber and seven trials', () => {
  const grants = [paying({ email: 'pays@x' }), ...Array.from({ length: 7 }, (_, i) => trial({ email: `t${i}@x` }))];
  assert.equal(unattachedTrials(grants, NOW), 7);
  assert.equal(membershipsFromGrants(grants, NOW).filter((m) => m.status === 'active').length, 1);
});

/**
 * A trial that DOES name a cohort is already inside that cohort's member
 * count, so counting it here too would double it.
 */
test('a trial that already belongs to a cohort is NOT double-counted', () => {
  assert.equal(unattachedTrials([trial({ tierId: 'studio' })], NOW), 0);
});

test('a paying subscriber is not a trial', () => {
  assert.equal(unattachedTrials([paying()], NOW), 0);
});

test('an expired trial has stopped, so it is not in flight', () => {
  assert.equal(unattachedTrials([trial({ trialEnd: '2026-06-01T00:00:00.000Z' })], NOW), 0);
});

test('a revoked trial is not counted', () => {
  assert.equal(unattachedTrials([trial({ status: 'revoked' })], NOW), 0);
});

test('empty and broken lists are zero, not a crash', () => {
  assert.equal(unattachedTrials([], NOW), 0);
  assert.equal(unattachedTrials([null, undefined], NOW), 0);
});

// ── Arrears, now that the webhook produces this state ─────────────────────

/**
 * Until 29 Sep this state could not arise from real data: the Stripe webhook
 * cleared `tierId` the moment a subscription went `past_due`, so an account in
 * arrears had no tier and belonged to no cohort. That also dropped its limits
 * to the free backstop and stopped its on-call the same second, while the
 * fifteen-day grace period still let it log in — a door with nothing behind it.
 *
 * Eric's decision was to keep everything until day 15, so the webhook now
 * keeps the tier through arrears and the freeze is what ends access. These pin
 * the two halves that have to stay true together: still a member, never money.
 */
test('AN ACCOUNT IN ARREARS KEEPS ITS COHORT BUT EARNS NOTHING', () => {
  const cohort = cohortFromTier({ id: 'studio', name: 'Studio', priceCents: 14900, active: true });
  const owing = paying({ email: 'behind@x.com', lastSubscriptionStatus: 'past_due' });

  const m = membershipFromGrant(owing, NOW);
  assert.equal(m.cohortId, 'cohort-tier-studio', 'still in the cohort — they are still being served');
  assert.equal(m.status, 'past_due');

  assert.equal(monthlyRevenueOf(cohort, [m]), 0, 'and contributes nothing to revenue');
});

test('the member count includes them, the paying count does not', () => {
  const grants = [
    paying({ email: 'pays@x.com' }),
    paying({ email: 'behind@x.com', lastSubscriptionStatus: 'past_due' }),
  ];
  const memberships = membershipsFromGrants(grants, NOW);
  assert.equal(memberships.length, 2, 'both are members');
  assert.equal(memberships.filter((m) => m.status === 'active').length, 1, 'one is paying');
  assert.equal(monthlyRecurringCents(grants, () => ({ basePrice: 149 })), 14900, 'MRR counts one');
});

/**
 * A cancellation is not arrears. The webhook still clears the tier for
 * terminal states, and this is the assertion that keeps the two apart.
 */
test('a cancelled subscription still leaves the cohort', () => {
  const m = membershipFromGrant(paying({ lastSubscriptionStatus: 'canceled' }), NOW);
  assert.equal(m.status, 'inactive');
  assert.equal(monthlyRecurringCents([paying({ lastSubscriptionStatus: 'canceled' })], () => ({ basePrice: 149 })), 0);
});
