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
  interval?: BillingInterval;
  /**
   * Add-ons this tier includes at no extra cost.
   *
   * How a ladder steps without inventing a separate product at each rung:
   * the top tier includes what the ones below it pay extra for. An included
   * add-on is offered whether or not it has a Stripe price, because nothing
   * is being charged for it.
   */
  includedAddOns?: string[];
  /**
   * Percent off contract work for somebody on this tier.
   *
   * Here rather than in a table of tier-to-percentage, which is what this
   * replaces, so it is set per portal AND per tier and edited beside the
   * price it belongs with. What a subscriber actually receives is this plus
   * any grants an administrator has made, capped — see `discounts.ts`.
   */
  discountPercent?: number;
  /** Display only — 'Most Popular', 'Best Value'. */
  badge?: string;
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
  tier: Partial<Sellable> | null | undefined,
  mode: StripeMode,
): string {
  const id = mode === 'test' ? tier?.stripePriceIdTest : tier?.stripePriceId;
  return String(id || '').trim();
}

export function isPurchasable(
  tier: Partial<Sellable> | null | undefined,
  mode: StripeMode = 'live',
): boolean {
  if (!tier || tier.active === false) return false;
  if (!priceIdFor(tier, mode)) return false;
  return Number(tier.priceCents ?? 0) > 0;
}

/** Why a tier cannot be sold, in words a person can act on. */
export function notPurchasableReason(
  tier: Partial<Sellable> | null | undefined,
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

/**
 * How often something recurs.
 *
 * `week` exists because the advertiser weekly plans do. Stripe accepts it as a
 * recurring interval, so it costs nothing to carry and its absence would mean
 * that ladder could never move into the catalogue.
 */
export type BillingInterval = 'week' | 'month' | 'year';

const INTERVALS: BillingInterval[] = ['week', 'month', 'year'];

/**
 * An interval from untrusted input, defaulting to monthly.
 *
 * One reader, used by every route that accepts one. The version this replaces
 * was written inline as `raw === 'year' ? 'year' : 'month'` in three places,
 * which silently turned a weekly price into a monthly one — the kind of bug
 * that bills a quarter of what it should and reports nothing.
 */
export function readInterval(raw: unknown): BillingInterval {
  const asked = String(raw ?? '').trim().toLowerCase() as BillingInterval;
  return INTERVALS.includes(asked) ? asked : 'month';
}

/**
 * The part of a record that decides whether money can be taken for it.
 *
 * Shared by tiers and add-ons because the question is identical for both: is it
 * offered, does Stripe have a price for the mode we are in, and is that price
 * above zero. Generalised rather than duplicated so the two can never drift —
 * an add-on sold without a Stripe price fails exactly the way a tier does.
 */
export interface Sellable {
  stripePriceId?: string;
  stripePriceIdTest?: string;
  priceCents?: number;
  interval?: BillingInterval;
  active?: boolean;
}

/**
 * Something sold alongside a tier rather than instead of one.
 *
 * WHY THESE ARE THEIR OWN RECORDS
 *
 * Eric's decision, and it is what the prices were already telling us: $39, $79
 * and $159 are *base* prices, and most of what the older ladders charged for is
 * extras. So what somebody pays is the tier plus whatever they chose, and the
 * extras need somewhere to live that is not a field on one tier.
 *
 * They are separate records because the same add-on is normally offered on
 * several tiers, and often included free on the top one. Holding it inside a
 * tier would mean three copies of one product with three Stripe prices, and
 * three places to forget to change.
 *
 * Each carries its own Stripe Price. That is not a design choice so much as how
 * Stripe works: a subscription is made of line items, each pointing at a Price,
 * and there is no way to bill a total.
 */
export interface PlanAddOn extends Sellable {
  id: string;
  audience: Audience;
  name: string;
  blurb?: string;
  /** What the buyer is told this extra gets them. */
  features: string[];
  /**
   * The ceilings this raises when it is on. Merged over the tier's own limits,
   * so an add-on that grants 500 more products is `{ products: 500 }` as a
   * delta, not an absolute.
   */
  limits: Record<string, number>;
  /**
   * Which tiers this may be bought on. Absent or empty means every tier for
   * this audience — the common case, and the one that does not need thinking
   * about when a new tier is published.
   */
  availableOn?: string[];
  /**
   * Billed once per unit covered rather than once per subscription.
   *
   * On-call is the case this exists for: a four-unit house and a
   * hundred-and-twenty-unit block do not cost the same to cover, so the price
   * is per unit and the quantity is the count. The count comes from the
   * platform own records, never from the customer — see unitsCovered.
   *
   * priceCents is therefore the price PER UNIT for these, which is why
   * anything displaying it has to say so.
   */
  perUnit?: boolean;
  /**
   * A flat monthly fee whose NUMBER depends on the size of what it covers.
   *
   * On-call is the case this exists for. Eric's rule is that the flat rate is
   * determined by size — so it is not one price for everybody, and it is not
   * a price multiplied by a unit count either. It is a flat fee per month,
   * and which flat fee applies is decided by how many units the account
   * actually covers.
   *
   * Each band carries its own Stripe price, because Stripe bills a
   * subscription item against a Price object and there is no way to bill a
   * number we worked out. The band is chosen ON THE SERVER from a count the
   * server made — see `unitsCovered`. A band the customer picks is a
   * discount the customer grants themselves.
   */
  sizeBands?: SizeBand[];
  sortOrder?: number;
}

/**
 * One rung of a size-banded price.
 *
 * `upToUnits` is the TOP of the band, inclusive. Exactly one band should
 * omit it — the open-ended top band — or the largest customers fall through
 * every rung and cannot be billed at all.
 */
export interface SizeBand extends Sellable {
  id: string;
  /** Shown on an invoice: "Up to 25 units". */
  label?: string;
  /** Inclusive ceiling. Absent or zero means no ceiling — the top band. */
  upToUnits?: number;
}

/**
 * May this add-on be bought on this tier?
 *
 * The interval check is the one that is easy to miss and expensive to get
 * wrong. Stripe requires every recurring line item on one subscription to share
 * an interval, so offering a weekly add-on against a monthly tier builds a
 * checkout session Stripe refuses outright — in front of the customer, with
 * Stripe's wording rather than ours. Refusing to offer it is the honest version
 * of the same answer.
 */
export function addOnAvailableOn(
  addOn: Partial<PlanAddOn> | null | undefined,
  tier: Partial<PlanTier> | null | undefined,
): boolean {
  if (!addOn || !tier) return false;
  if (addOn.active === false || tier.active === false) return false;
  if (addOn.audience && tier.audience && addOn.audience !== tier.audience) return false;
  if (readInterval(addOn.interval) !== readInterval(tier.interval)) return false;
  const only = addOn.availableOn;
  if (Array.isArray(only) && only.length > 0) return only.includes(String(tier.id || ''));
  return true;
}

/** Is this add-on already part of the tier at no extra cost? */
export function addOnIncludedIn(
  addOnId: string,
  tier: Partial<PlanTier> | null | undefined,
): boolean {
  const included = tier?.includedAddOns;
  return Array.isArray(included) && included.includes(String(addOnId || ''));
}

/**
 * What a subscription actually costs, in cents.
 *
 * Computed here, from records the server owns, and never from a figure the
 * browser sends. A posted total is a number the customer can edit.
 *
 * An add-on the tier already includes adds nothing — that is what including it
 * means — and one that is not available on this tier is not counted at all
 * rather than quietly charged for.
 */
export function subscriptionTotalCents(
  tier: Partial<PlanTier> | null | undefined,
  chosen: Array<Partial<PlanAddOn>> = [],
): number {
  let total = Math.max(0, Number(tier?.priceCents ?? 0) || 0);
  for (const addOn of chosen) {
    if (!addOnAvailableOn(addOn, tier)) continue;
    if (addOnIncludedIn(String(addOn?.id || ''), tier)) continue;
    total += Math.max(0, Number(addOn?.priceCents ?? 0) || 0);
  }
  return total;
}

/**
 * The add-ons to show against one tier, each marked as included or extra.
 *
 * `purchasable` is resolved against the server's Stripe mode for the same
 * reason it is on a tier: a portal must not offer a button its own checkout
 * would refuse. An included add-on is offered whether or not it has a Stripe
 * price, because nothing is being charged for it.
 */
export function addOnsForTier(
  addOns: PlanAddOn[],
  tier: Partial<PlanTier> | null | undefined,
  mode: StripeMode = 'live',
): Array<Omit<PlanAddOn, 'stripePriceId' | 'stripePriceIdTest'> & {
  purchasable: boolean;
  included: boolean;
}> {
  return (addOns || [])
    .filter((a) => addOnAvailableOn(a, tier))
    .map((a) => {
      const included = addOnIncludedIn(a.id, tier);
      const { stripePriceId: _l, stripePriceIdTest: _t, ...rest } = a;
      return { ...rest, included, purchasable: included || isPurchasable(a, mode) };
    })
    .filter((a) => a.purchasable)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.name.localeCompare(b.name));
}

/**
 * The add-ons a checkout may actually bill for, decided here rather than taken
 * from the request.
 *
 * WHY THE POSTED LIST IS NOT THE ANSWER
 *
 * The browser sends which extras somebody ticked. Believed as sent, that is a
 * list a customer can edit — into an add-on offered on a dearer tier, one that
 * has been retired, or one belonging to a different portal entirely. So the
 * ids are used only to look records up, and every record is then held against
 * the same three questions the catalogue asks: is it offered on this tier, is
 * the tier already giving it away, and does Stripe have a price for it in the
 * mode this server is in.
 *
 * WHY REFUSALS COME BACK RATHER THAN BEING DROPPED
 *
 * Because the commonest one is honest and needs saying. An add-on with a live
 * price and no test price is invisible during a rehearsal, and silently
 * building a cheaper checkout teaches you that the rehearsal passed. The caller
 * gets both lists and can say so.
 *
 * An add-on the tier includes is refused with a reason that is good news, and
 * deliberately not billed: charging for something the plan already grants is
 * the one failure here a customer would notice on their statement.
 */
export function selectableAddOns(
  addOns: PlanAddOn[],
  tier: Partial<PlanTier> | null | undefined,
  wanted: string[] = [],
  mode: StripeMode = 'live',
): { chosen: PlanAddOn[]; refused: Array<{ id: string; reason: string }> } {
  const chosen: PlanAddOn[] = [];
  const refused: Array<{ id: string; reason: string }> = [];
  const byId = new Map((addOns || []).filter(Boolean).map((a) => [String(a.id), a]));

  // De-duplicated, because a list sent twice must not bill twice.
  for (const id of [...new Set((wanted || []).map((w) => String(w || '').trim()).filter(Boolean))]) {
    const addOn = byId.get(id);
    if (!addOn) { refused.push({ id, reason: 'No such extra.' }); continue; }
    if (!addOnAvailableOn(addOn, tier)) {
      refused.push({ id, reason: `${addOn.name} is not offered on this plan.` });
      continue;
    }
    if (addOnIncludedIn(id, tier)) {
      refused.push({ id, reason: `${addOn.name} is already included in this plan.` });
      continue;
    }
    const why = notPurchasableReason(addOn, mode);
    if (why) { refused.push({ id, reason: why }); continue; }
    chosen.push(addOn);
  }
  return { chosen, refused };
}

/**
 * The canonical id of the on-call add-on.
 *
 * On-call is sold per portal audience, so there is one record per audience —
 * but they share this id, because the question asked of a grant is always
 * "does this account have on-call", never "which audience's version". Naming it
 * once means a typo cannot make a paid account look unpaid.
 */
export const ON_CALL_ADD_ON_ID = 'on-call';

/**
 * Which extras this account actually holds.
 *
 * Two ways to hold one, and both count: bought alongside the subscription, or
 * included in the tier at no extra cost. Missing the second would mean the
 * dearest plan — the one most likely to bundle on-call — behaving as though it
 * had never paid for it.
 *
 * Read from the grant the webhook wrote, so it reflects the subscription that
 * is actually being paid for rather than anything a browser remembers.
 */
export function heldAddOnIds(
  grant: FeatureGrant | null | undefined,
  tier: Partial<PlanTier> | null | undefined,
): string[] {
  const bought = Array.isArray(grant?.addOnIds)
    ? grant!.addOnIds!.map((a) => String(a || '').trim()).filter(Boolean)
    : [];
  const included = Array.isArray(tier?.includedAddOns)
    ? tier!.includedAddOns!.map((a) => String(a || '').trim()).filter(Boolean)
    : [];
  return [...new Set([...bought, ...included])];
}

/**
 * Does this account hold this extra, right now?
 *
 * Gated on the entitlement rather than on the grant's fields alone: a
 * cancelled subscription leaves its add-on ids behind on the record, and
 * reading those without asking whether anything is still being paid for would
 * keep answering emergency calls for an account that stopped paying months
 * ago. `resolveEntitlement` is the single place that judgement lives.
 */
export function holdsAddOn(
  addOnId: string,
  grant: FeatureGrant | null | undefined,
  tier: Partial<PlanTier> | null | undefined,
): boolean {
  const id = String(addOnId || '').trim();
  if (!id) return false;
  if (resolveEntitlement(grant).source !== 'subscription') return false;
  return heldAddOnIds(grant, tier).includes(id);
}

/**
 * How many of this add-on to bill for.
 *
 * One, for everything sold per subscription. For a per-unit add-on it is the
 * number of units covered — a four-unit house and a hundred-and-twenty-unit
 * block do not cost the same to keep an on-call rota for.
 *
 * The floor of one is deliberate and is not a count. Stripe refuses a
 * quantity of zero on a subscription item, and an account that has bought
 * on-call before recording a single property still owes the minimum: they
 * can ring us tonight. Callers that display this should say when it was a
 * floor rather than a measurement.
 */
export function addOnQuantity(
  addOn: Partial<PlanAddOn> | null | undefined,
  unitsCovered = 0,
): number {
  if (!addOn?.perUnit) return 1;
  const units = Math.floor(Number(unitsCovered));
  return Number.isFinite(units) && units > 0 ? units : 1;
}

/**
 * What this add-on costs per month, given what it covers.
 *
 * Separate from `priceCents`, which for a per-unit add-on is the price of ONE
 * unit. Anything showing a customer a figure has to use this, or it shows a
 * hundred-unit association a four-dollar subscription.
 */
export function addOnMonthlyCents(
  addOn: Partial<PlanAddOn> | null | undefined,
  unitsCovered = 0,
): number {
  const each = Math.max(0, Number(addOn?.priceCents ?? 0) || 0);
  return each * addOnQuantity(addOn, unitsCovered);
}

/**
 * Which size band an account of this size falls into.
 *
 * The smallest band that still covers them. Sorted here rather than trusting
 * the order they were entered in, because a band list typed out of order
 * would silently bill a four-unit house at the hundred-unit rate — and the
 * invoice would look entirely normal.
 *
 * A band with no ceiling is the top one and is used only when nothing else
 * fits. Without one, an account larger than every ceiling matches nothing,
 * and "nothing" for a paying customer means they cannot buy the service they
 * are asking for.
 */
export function bandForUnits(
  addOn: Partial<PlanAddOn> | null | undefined,
  units = 0,
): SizeBand | null {
  const bands = (addOn?.sizeBands || []).filter(Boolean);
  if (bands.length === 0) return null;

  const covered = Math.max(0, Math.floor(Number(units)) || 0);
  const capped = bands
    .filter((b) => Number(b.upToUnits) > 0)
    .sort((a, b) => Number(a.upToUnits) - Number(b.upToUnits));

  // A count of zero still has to land somewhere: they have bought the
  // service and can ring tonight, so they belong in the smallest band.
  const wanted = covered > 0 ? covered : 1;
  const fits = capped.find((b) => wanted <= Number(b.upToUnits));
  if (fits) return fits;

  return bands.find((b) => !(Number(b.upToUnits) > 0)) || null;
}

/**
 * What is actually charged for this add-on, and against which Stripe price.
 *
 * One answer for the three shapes an add-on can take — flat, per unit, or
 * size-banded — so that no caller has to know which it is holding. A checkout
 * that worked this out for itself would be the place the three disagree.
 */
export function addOnCharge(
  addOn: Partial<PlanAddOn> | null | undefined,
  units = 0,
  mode: StripeMode = 'live',
): {
  priceId: string;
  quantity: number;
  monthlyCents: number;
  band: SizeBand | null;
  shape: 'flat' | 'per-unit' | 'banded';
} {
  const band = bandForUnits(addOn, units);
  if (band) {
    return {
      priceId: priceIdFor(band, mode),
      quantity: 1,
      monthlyCents: Math.max(0, Number(band.priceCents ?? 0) || 0),
      band,
      shape: 'banded',
    };
  }
  const quantity = addOnQuantity(addOn, units);
  return {
    priceId: priceIdFor(addOn, mode),
    quantity,
    monthlyCents: addOnMonthlyCents(addOn, units),
    band: null,
    shape: addOn?.perUnit ? 'per-unit' : 'flat',
  };
}

/** An add-on as a customer may see it — never a Stripe price id. */
export function publicAddOn(
  addOn: PlanAddOn,
  mode: StripeMode = 'live',
): Omit<PlanAddOn, 'stripePriceId' | 'stripePriceIdTest'> & { purchasable: boolean } {
  const { stripePriceId: _live, stripePriceIdTest: _test, ...rest } = addOn;
  return { ...rest, purchasable: isPurchasable(addOn, mode) };
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
  /**
   * The extras that subscription carries, written by the Stripe webhook from
   * the metadata the checkout set.
   *
   * Recorded on the grant rather than re-read from Stripe on every question,
   * because the questions are asked in places that must answer fast and offline
   * — "do we answer this emergency" among them. The webhook clears it the same
   * way it clears the tier when a subscription ends.
   */
  addOnIds?: string[];
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
 * Everything on a stored tier that points at Stripe.
 *
 * Kept as its own shape because these fields are the server's, never the
 * client's: the list route strips the price ids before anybody sees them, so a
 * caller editing a tier has no way to send them back and must not be asked to.
 */
export interface StripeLinkage {
  stripePriceId?: string;
  stripePriceIdTest?: string;
  stripeProductId?: string;
  stripeProductIdTest?: string;
  /** What the attached Stripe price actually charges, in cents. */
  stripePriceCents?: number;
  stripePriceCreatedAt?: string;
}

/**
 * Carry a tier's Stripe linkage across an edit, dropping any price whose
 * amount the edit has just contradicted.
 *
 * TWO FAILURES THIS PREVENTS, BOTH SILENT
 *
 * The first is losing the linkage entirely. A tier built from a request body
 * carries no price ids, so writing one straight over the stored record unsells
 * the plan — and nothing reports it, because saving succeeded. Editing a
 * blurb would take a plan off sale, and the first sign would be a vendor
 * pressing Subscribe.
 *
 * The second is keeping a linkage that has gone wrong. A Stripe Price is
 * immutable: its amount is fixed when it is created and editing the figure
 * here does nothing to it. So a tier whose price is raised from $39 to $49
 * while still pointing at the old Price would advertise $49 and charge $39 —
 * the same mismatch the attach route refuses outright, arriving through the
 * side door of an edit.
 *
 * So the price is detached, and only the price. The Stripe object is untouched
 * and anybody already subscribed keeps billing at the figure they agreed to;
 * the plan simply stops being buyable until a replacement price is created.
 *
 * With nothing stored, nothing is carried and nothing is detached — a new tier
 * has no linkage to lose.
 */
export function carryStripeLinkage(
  existing: (StripeLinkage & { priceCents?: number }) | null | undefined,
  wantedCents: number | undefined,
): { linkage: StripeLinkage; detached: StripeMode[] } {
  if (!existing) return { linkage: {}, detached: [] };

  const linkage: StripeLinkage = {
    stripePriceId: existing.stripePriceId,
    stripePriceIdTest: existing.stripePriceIdTest,
    stripeProductId: existing.stripeProductId,
    stripeProductIdTest: existing.stripeProductIdTest,
    stripePriceCents: existing.stripePriceCents,
    stripePriceCreatedAt: existing.stripePriceCreatedAt,
  };

  const wanted = Number(wantedCents ?? 0);
  // An unreadable amount is not a reason to unsell a plan. Leave it alone and
  // let the save fail on its own terms if it is going to.
  if (!Number.isFinite(wanted)) return { linkage, detached: [] };

  // What Stripe charges, if it was recorded when the price was attached;
  // otherwise what the plan said at that moment, which is the same number
  // unless somebody forced a mismatch through.
  const charged = Number(existing.stripePriceCents ?? existing.priceCents ?? wanted);
  if (!Number.isFinite(charged) || charged === wanted) return { linkage, detached: [] };

  const detached: StripeMode[] = [];
  if (linkage.stripePriceId) { linkage.stripePriceId = undefined; detached.push('live'); }
  if (linkage.stripePriceIdTest) { linkage.stripePriceIdTest = undefined; detached.push('test'); }
  // Only meaningful alongside a price, and stale the moment one is dropped.
  if (detached.length) {
    linkage.stripePriceCents = undefined;
    linkage.stripePriceCreatedAt = undefined;
  }
  return { linkage, detached };
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

  const ceiling = Number(limit);
  if (!Number.isFinite(ceiling)) return true;

  /**
   * ZERO MEANS UNLIMITED.
   *
   * That is the convention everything else in the system already uses — the
   * tier editor says "0 means unlimited" under the limits, the drafting
   * assistant is told the same, and the vendor tiers are written that way:
   * Stocked and Preferred both carry `products: 0` and sell themselves as
   * "Unlimited catalogue products".
   *
   * Read literally, `count < 0` is false for every count, so this function
   * would have refused EVERYTHING for exactly the tiers that promise no
   * limit. Enforcement built on that would have locked out the
   * best-paying vendors on their first product, while leaving the cheapest
   * tier working — the precise opposite of what the ladder sells.
   *
   * A negative ceiling is treated the same way. It cannot mean "minus three
   * products", and the only other reading is a sentinel for no limit.
   */
  if (ceiling <= 0) return true;

  return Number(currentCount) < ceiling;
}
