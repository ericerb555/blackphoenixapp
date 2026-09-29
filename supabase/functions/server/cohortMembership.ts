/**
 * Which cohort an account belongs to, and whether it is paying.
 *
 * WHY THIS DERIVES RATHER THAN STORES
 *
 * The plan said `feature_grant` should GAIN a `cohortId` field and that the
 * eight live grants should be backfilled with it. Writing this turned that
 * around, because the join already exists and nobody had noticed:
 *
 *   - a paying grant carries `tierId`
 *   - `cohortFromTier` derives a cohort's id as `cohort-tier-{tierId}`
 *
 * So the cohort an account belongs to is a FUNCTION of what the grant already
 * says, not a new fact to record. Deriving it means no write against eight
 * live paying accounts, nothing to keep in step when a subscription changes
 * tier, and no way for a stored `cohortId` to disagree with the `tierId`
 * sitting next to it. The Stripe webhook needs no change either: it already
 * writes the only field this reads.
 *
 * `cohorts.tsx` read `g.cohortId` off the grant, and NOTHING has ever written
 * that field — so every cohort's revenue and subscriber count derived to zero.
 * This is the piece that was missing.
 *
 * WHY A TRIAL IS NOT 'ACTIVE'
 *
 * A trial belongs to its cohort — it is real breadth and should be visible as
 * a member — but it is not paying, and `monthlyRevenueOf` counts anything
 * marked `active`. Reporting trials as revenue is the same failure as the
 * fabricated P&L, arrived at politely: the number would be defensible-looking
 * and still wrong. Trials resolve to `trialing`, which that function excludes.
 */

/** The cohort id a plan tier migrates to. Must match `cohortFromTier`. */
export const cohortIdForTier = (tierId: unknown): string | null => {
  const id = String(tierId ?? '').trim();
  return id ? `cohort-tier-${id}` : null;
};

/**
 * What a grant looks like to the cohort figures.
 *
 * `active` is the only value that becomes revenue. Everything else is a
 * member who is not currently paying, for one of several reasons worth
 * telling apart when somebody asks why a figure moved.
 */
export type MembershipStatus = 'active' | 'trialing' | 'past_due' | 'inactive';

export interface Membership {
  cohortId: string | null;
  status: MembershipStatus;
  seats: number;
  email?: string;
}

interface GrantLike {
  email?: string;
  status?: string;
  tierId?: string;
  stripeSubscriptionId?: string;
  lastSubscriptionStatus?: string;
  trialStart?: string;
  trialEnd?: string;
  seats?: number;
}

/** A finite positive seat count, defaulting to the one account the grant is for. */
const seatsOf = (grant: GrantLike): number => {
  const n = Number(grant?.seats);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
};

/**
 * Turn one `feature_grant` into a cohort membership.
 *
 * THE ORDER HERE MATCHES `resolveEntitlement`, DELIBERATELY
 *
 * That function already decides what an account may USE, and it puts a paying
 * subscription above a trial and a revoked grant above both. If this function
 * disagreed with it, an account could be billed as a member of one cohort
 * while being served as something else. So: revoked first, then paying, then
 * trial, then nothing.
 *
 * The one place it goes further is arrears. `resolveEntitlement` does not care
 * about `lastSubscriptionStatus`, because somebody behind on payment still has
 * access during the fifteen-day grace period. Revenue does care: an account
 * Stripe has marked `past_due` or `unpaid` is not money in, and counting it
 * would report income that failed to arrive.
 */
export function membershipFromGrant(
  grant: GrantLike | null | undefined,
  now: Date = new Date(),
): Membership {
  const none: Membership = { cohortId: null, status: 'inactive', seats: 1 };
  if (!grant) return none;

  const email = String(grant.email ?? '') || undefined;
  const seats = seatsOf(grant);
  const cohortId = cohortIdForTier(grant.tierId);

  // A grant revoked by hand is revoked whatever its dates or Stripe say.
  const status = String(grant.status ?? '').toLowerCase();
  if (status && status !== 'active') {
    return { cohortId, status: 'inactive', seats, email };
  }

  const paying = Boolean(cohortId) && Boolean(String(grant.stripeSubscriptionId ?? '').trim());
  if (paying) {
    /**
     * Stripe's word for the subscription is what decides whether this is
     * money. `trialing` appears here for a subscription taken out with a
     * Stripe-side trial — it is a real subscription that has not billed yet,
     * so it is a member and not yet revenue.
     */
    const stripeStatus = String(grant.lastSubscriptionStatus ?? '').toLowerCase();
    if (stripeStatus === 'past_due' || stripeStatus === 'unpaid') {
      return { cohortId, status: 'past_due', seats, email };
    }
    if (stripeStatus === 'trialing') {
      return { cohortId, status: 'trialing', seats, email };
    }
    if (stripeStatus === 'canceled' || stripeStatus === 'cancelled' || stripeStatus === 'incomplete_expired') {
      return { cohortId, status: 'inactive', seats, email };
    }
    return { cohortId, status: 'active', seats, email };
  }

  /**
   * A trial, and whether it is still running.
   *
   * `trialStart` is what says this is a trial at all — the same rule
   * `resolveEntitlement` uses, and for the same reason. A grant with no trial
   * fields is an open-ended comped or staff account, not a broken trial, and
   * an expired trial is nobody's member.
   */
  if (String(grant.trialStart ?? '').trim()) {
    const ends = Date.parse(String(grant.trialEnd ?? ''));
    const running = Number.isFinite(ends) && ends > now.getTime();
    return { cohortId, status: running ? 'trialing' : 'inactive', seats, email };
  }

  /**
   * No subscription and no trial. A comped account genuinely belongs to its
   * cohort — somebody put a tier on it — but it pays nothing, so it counts as
   * a member and not as revenue.
   */
  return { cohortId, status: cohortId ? 'trialing' : 'inactive', seats, email };
}

/** Every grant as a membership, keeping only those that name a cohort. */
export const membershipsFromGrants = (
  grants: Array<GrantLike | null | undefined>,
  now: Date = new Date(),
): Membership[] =>
  (grants || [])
    .map((g) => membershipFromGrant(g, now))
    .filter((m) => m.cohortId !== null);

/**
 * Monthly recurring revenue for a named set of accounts.
 *
 * WHAT THIS REPLACES, AND WHY THE OLD FIGURE WAS WRONG
 *
 * The territory screen summed `amount` across every `subscription:` record
 * whose status read `active`. Those records are written by
 * `/subscriptions/checkout`, which runs Stripe in `mode: 'payment'` — it bills
 * ONCE. The `renewalDate` and `autoRenew: true` they carry are acted on by
 * nothing; nothing renews them and nothing ever marks them finished.
 *
 * So every one-off sale ever made was being counted as recurring revenue, in
 * perpetuity. The figure could only climb, and no cancellation, refund or
 * lapse could bring it down. A territory owner reading it was told their
 * monthly income included sales made once, a year ago.
 *
 * Recurring revenue means a subscription Stripe will bill again. That is what
 * a cohort membership is, which is why this counts those instead.
 *
 * Only `active` counts. A trial, an account in arrears and a cancelled
 * subscription are all excluded, for the reasons set out on
 * `membershipFromGrant` — none of them is money arriving next month.
 */
export function monthlyRecurringCents(
  grants: Array<Record<string, any> | null | undefined>,
  cohortById: (id: string) => { basePrice?: number } | null | undefined,
  options: { emails?: Set<string> | null; now?: Date } = {},
): number {
  const { emails = null, now = new Date() } = options;

  let total = 0;
  for (const grant of grants || []) {
    if (!grant) continue;

    // Scoped by account when a set is given — a territory owner sees their own
    // roster and nobody else's. No set means the whole platform.
    if (emails) {
      const email = String(grant.email ?? '').toLowerCase();
      if (!email || !emails.has(email)) continue;
    }

    const membership = membershipFromGrant(grant, now);
    if (membership.status !== 'active' || !membership.cohortId) continue;

    const cohort = cohortById(membership.cohortId);
    if (!cohort) continue;

    const price = Number(cohort.basePrice ?? 0);
    if (!Number.isFinite(price) || price <= 0) continue;
    total += Math.round(price * 100) * membership.seats;
  }
  return total;
}
