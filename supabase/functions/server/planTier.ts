/**
 * Subscription tiers, and what a given account is actually entitled to.
 *
 * WHY THIS IS A SEPARATE FILE FROM THE ROUTES
 *
 * Because the two questions it answers — "may this tier be sold?" and "what
 * does this account get right now?" — are pure functions of their input, and
 * both are the kind of thing that is quietly wrong rather than loudly wrong.
 * A tier that can be bought without a price behind it takes somebody's money
 * for nothing. A lapsed trial that resolves to full access gives the product
 * away. Neither throws; both are testable here for free, and the route file
 * imports Hono so a node test cannot load it.
 *
 * WHAT THIS IS NOT
 *
 * Not `plan:` records, which are the bespoke hour-allotment plans the AI plan
 * builder writes, with their own credits ledger in `entitlements.tsx`. Not
 * `subscription:` either — condo associations and hour transfers already use
 * that prefix. These are the published tiers a portal sells from, and they live
 * under `plan_tier:`.
 *
 * THE CATALOGUE STARTS EMPTY, ON PURPOSE
 *
 * No seeded tiers and no invented prices. Two hardcoded price ladders already
 * exist in this codebase — one in `DealsOffersSection`, another in
 * `PropertyAIStudio` — and a third written here would be the copy that
 * disagrees. Nothing is on sale until somebody publishes a tier and attaches a
 * real Stripe price to it.
 */

/** Which portal a tier is sold into. One catalogue per audience. */
export type Audience =
  | 'vendor' | 'subcontractor' | 'advertiser' | 'customer'
  | 'content' | 'property_manager' | 'landlord' | 'condo_association';

export const AUDIENCES: Audience[] = [
  'vendor', 'subcontractor', 'advertiser', 'customer',
  'content', 'property_manager', 'landlord', 'condo_association',
];

export interface PlanTier {
  id: string;
  audience: Audience;
  name: string;
  blurb?: string;
  /** What the buyer is told they get. Display only; `limits` is what is enforced. */
  features: string[];
  /**
   * The numbers the app actually enforces — catalogue size, deals live at
   * once, quotes per month. Separate from `features` because a bullet point
   * nobody enforces is marketing, and a limit nobody displays is a surprise.
   */
  limits: Record<string, number>;
  /**
   * The LIVE Stripe Price this bills against.
   *
   * Created in Stripe and stored here; never generated, never guessed — see
   * `isPurchasable`.
   */
  stripePriceId?: string;
  /**
   * The TEST-mode Stripe Price, kept separately and deliberately.
   *
   * A test price and a live price are different objects on different Stripe
   * accounts, and one cannot be charged with the other's key. Storing them in
   * the same field would mean a tier tested in the morning and switched live
   * in the afternoon quietly carrying a price id that the live key cannot
   * find — the checkout would fail for every customer, at the moment it
   * mattered, with an error from Stripe rather than from us.
   *
   * Two fields, and the server picks by the mode of the key it is holding.
   */
  stripePriceIdTest?: string;
  /** Display price in cents, for showing a figure without asking Stripe. */
  priceCents?: number;
  interval?: 'month' | 'year';
  sortOrder?: number;
  /** A tier can be withdrawn from sale without being deleted. */
  active?: boolean;
}

/** The free floor. Every audience has one and it is never bought. */
export const FREE_LEVEL = 'free';

/**
 * May this tier be offered for money?
 *
 * Fail closed. A tier with no Stripe price cannot be bought, because a checkout
 * built from an invented price is money taken against nothing — there would be
 * no subscription in Stripe to renew, cancel or refund, and the webhook that
 * grants access would never fire.
 *
 * A zero price is also refused. A free tier is the floor and is granted, not
 * purchased; offering it through checkout creates a Stripe subscription that
 * bills nothing and complicates every later question about who is paying.
 */
export type StripeMode = 'live' | 'test';

/**
 * The price id for the mode the server is actually operating in.
 *
 * Never falls back to the other mode. A test price charged with a live key
 * does not exist as far as Stripe is concerned, so falling back would turn a
 * configuration mistake into a failed checkout in front of a customer instead
 * of a refusal we can explain.
 */
export function priceIdFor(
  tier: Partial<PlanTier> | null | undefined,
  mode: StripeMode,
): string {
  const id = mode === 'test' ? tier?.stripePriceIdTest : tier?.stripePriceId;
  return String(id || '').trim();
}

export function isPurchasable(
  tier: Partial<PlanTier> | null | undefined,
  mode: StripeMode = 'live',
): boolean {
  if (!tier || tier.active === false) return false;
  if (!priceIdFor(tier, mode)) return false;
  return Number(tier.priceCents ?? 0) > 0;
}

/** Why a tier cannot be sold, in words a person can act on. */
export function notPurchasableReason(
  tier: Partial<PlanTier> | null | undefined,
  mode: StripeMode = 'live',
): string | null {
  if (!tier) return 'That plan does not exist.';
  if (tier.active === false) return 'That plan is not currently offered.';
  if (!priceIdFor(tier, mode)) {
    // Naming the mode matters: the commonest version of this is a tier that
    // HAS a price, in the other mode, which reads as a contradiction unless
    // the message says which one is missing.
    const other: StripeMode = mode === 'test' ? 'live' : 'test';
    const hasOther = Boolean(priceIdFor(tier, other));
    return hasOther
      ? `That plan has a ${other}-mode Stripe price but no ${mode}-mode one, and this `
        + `server is using a ${mode} key. Create the ${mode} price before selling it.`
      : 'That plan has no Stripe price attached yet, so it cannot be bought. '
        + 'Create the price in Stripe and add its id to the plan.';
  }
  if (!(Number(tier.priceCents ?? 0) > 0)) {
    return 'That plan has no price set. A free tier is granted rather than purchased.';
  }
  return null;
}

/**
 * A tier as a customer may see it — never a Stripe price id, in either mode.
 *
 * `purchasable` is resolved against the mode the server is in, so a portal
 * cannot offer a button that its own checkout would refuse.
 */
export function publicTier(
  tier: PlanTier,
  mode: StripeMode = 'live',
): Omit<PlanTier, 'stripePriceId' | 'stripePriceIdTest'> & { purchasable: boolean } {
  const { stripePriceId: _live, stripePriceIdTest: _test, ...rest } = tier;
  return { ...rest, purchasable: isPurchasable(tier, mode) };
}

/* ── what an account actually has ────────────────────────────────────────── */

export interface FeatureGrant {
  email?: string;
  portalType?: string;
  level?: string;
  status?: string;
  trialStart?: string;
  trialEnd?: string;
  /** Set once a subscription is paying for this grant. */
  tierId?: string;
  stripeSubscriptionId?: string;
}

export interface Entitlement {
  /** The tier id they are on, or `free`. */
  level: string;
  /** Where it came from, so a portal can say "trial ends Friday" honestly. */
  source: 'subscription' | 'trial' | 'free';
  /** When a trial runs out. Null for a subscription or the free floor. */
  trialEndsAt: string | null;
  /** True while a trial is running, so the UI can count down rather than surprise. */
  inTrial: boolean;
}

/**
 * What this account is entitled to, right now.
 *
 * ORDER MATTERS AND IT IS NOT ARBITRARY
 *
 * A paying subscription outranks a trial: somebody who bought during their
 * trial has paid, and dropping them to the free floor the day the trial clock
 * runs out would cut off a customer who is giving us money.
 *
 * A trial outranks free only while it is actually running. An expired trial is
 * free access, and that is the whole point of the expiry — a grant whose
 * `trialEnd` has passed but which still reports full access is the product
 * being given away by a date comparison nobody wrote.
 *
 * `status` is checked before the clock. A grant revoked by hand is revoked
 * whatever its dates say.
 */
export function resolveEntitlement(
  grant: FeatureGrant | null | undefined,
  now: Date = new Date(),
): Entitlement {
  const free: Entitlement = { level: FREE_LEVEL, source: 'free', trialEndsAt: null, inTrial: false };
  if (!grant) return free;

  const status = String(grant.status || '').toLowerCase();
  if (status && status !== 'active') return free;

  // Paying beats everything below it.
  const tierId = String(grant.tierId || '').trim();
  if (tierId && String(grant.stripeSubscriptionId || '').trim()) {
    return { level: tierId, source: 'subscription', trialEndsAt: null, inTrial: false };
  }

  /**
   * Is this a trial grant at all?
   *
   * `trialStart` is what says so, not `trialEnd`. The difference matters: a
   * trial whose end date is missing or unreadable is a BROKEN trial and must
   * fall to free, while a grant with no trial fields at all is a deliberate
   * open-ended one — staff, and comped accounts — and must be honoured.
   *
   * Keying off `trialEnd` alone conflates them, and it conflates them in the
   * expensive direction: one bad write of an empty end date would turn a
   * ninety-day trial into permanent free access, silently, for as long as
   * nobody looked.
   */
  const isTrialGrant = Boolean(
    String(grant.trialStart || '').trim() || String(grant.trialEnd || '').trim(),
  );

  if (isTrialGrant) {
    const end = new Date(String(grant.trialEnd || '').trim());
    // A trial we cannot date is a trial we cannot honour.
    if (!Number.isFinite(end.getTime())) return free;
    if (end.getTime() > now.getTime()) {
      return {
        level: String(grant.level || 'full'),
        source: 'trial',
        trialEndsAt: end.toISOString(),
        inTrial: true,
      };
    }
    return free;
  }

  // A grant with a level and no trial window and no subscription is an
  // open-ended manual grant — used for staff and for comped accounts.
  const level = String(grant.level || '').trim();
  return level
    ? { level, source: 'subscription', trialEndsAt: null, inTrial: false }
    : free;
}

/**
 * Is this account allowed one more of something?
 *
 * Returns true when no limit is published for that key, because an unmetered
 * feature is one nobody has decided to meter — refusing by default would
 * silently disable features the moment a tier forgot to list one.
 */
export function withinLimit(
  tier: PlanTier | null | undefined,
  key: string,
  currentCount: number,
): boolean {
  const limit = tier?.limits?.[key];
  if (limit === undefined || limit === null) return true;
  if (!Number.isFinite(Number(limit))) return true;
  return Number(currentCount) < Number(limit);
}
