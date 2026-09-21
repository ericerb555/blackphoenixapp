/**
 * discounts — what the plan gives, plus what an administrator granted.
 *
 * TWO REQUIREMENTS, BOTH ERIC'S
 *
 * "we need to make sure that match whatever subscription or plan is being paid
 * for" — so the plan half is read from the tier the payment actually granted,
 * never from a separate membership record and never from the browser.
 *
 * "i would like to be able and give admin the abilty to allow discounts and
 * aditionall discounts if nessacary or needed at anytime" — so the other half
 * is grants: records an administrator creates whenever one is needed, more than
 * one at a time, independent of any quote.
 *
 * ADDITIVE, AND CAPPED BY WHAT IS BEING DISCOUNTED
 *
 * Eric's decisions. A 10% plan discount and a 5% grant make 15%, which is what
 * "additional" plainly means. A cap is the guard against several well-meant
 * grants stacking into work sold below cost — without one, three people each
 * doing a reasonable thing can do it and nothing objects.
 *
 * The ceiling is not one number, because the economics differ:
 *
 *   quoted work            20%
 *   subscription fees      30% for the first ten of each portal, lifetime;
 *                          otherwise the standard cap
 *
 * `capFor` is the only place that decides which applies.
 *
 * WHY THIS FILE IS PURE
 *
 * It decides money. No `Deno`, no storage, no clock of its own — `now` is
 * always passed in — so every rule below is pinned by assertions in
 * `tests/discounts.test.ts` rather than described in a comment. The storage and
 * routing half lives elsewhere and calls in here.
 */

/**
 * The most anybody can be discounted ON QUOTED WORK, however many sources
 * agree.
 *
 * Eric set both the figure and its scope: additive, 20%, and "the 20% cap is
 * on quote pricing". So it governs what comes off a quote or a contract job,
 * which is where a stacked discount can sell work below what it costs to
 * deliver.
 *
 * It is deliberately NOT a general discount ceiling. A subscription fee is a
 * different question with different economics, and nothing about a plan price
 * has been decided here — which is why the name says `QUOTE`, so this cannot
 * be reached for by somebody reasonably assuming it applies to everything.
 *
 * Not a suggestion and not per-customer: a ceiling the arithmetic cannot be
 * argued past. If a job genuinely warrants more, that is a price change
 * somebody decides deliberately rather than an accumulation nobody noticed.
 */
export const QUOTE_DISCOUNT_CAP_PERCENT = 20;

/**
 * The founding offer: the first ten subscribers to any portal.
 *
 * Eric: "we will give up to 30% lifetime subscription fees to the first 10 of
 * every portal subscriptions."
 *
 * Every portal, not one of them. UP TO 30%, so it is a ceiling an
 * administrator works within rather than a rate everybody automatically gets.
 * And on the SUBSCRIPTION FEE — what they pay to be on the platform — which is
 * a different question from what comes off a quote, and carries a different
 * ceiling because the economics are different. A subscription costs almost
 * nothing more to serve; a job discounted too far is delivered at a loss.
 *
 * LIFETIME is the part that needs care. It means for as long as the
 * subscription lives, not for as long as the person exists: it survives
 * renewals and price rises, and it ends when they stop subscribing. A grant
 * expressing it therefore carries no expiry date, and the thing that ends it
 * is the subscription lapsing — which the entitlement already knows.
 *
 * Ten seats per portal, counted per portal. The eleventh vendor is not a
 * founding vendor even if only three advertisers have signed up.
 */
export const FOUNDING_SEATS_PER_PORTAL = 10;
export const FOUNDING_SUBSCRIPTION_CAP_PERCENT = 30;

/**
 * What a subscription fee may be discounted by outside the founding seats.
 *
 * ASSUMED, NOT DECIDED. Eric set the founding ceiling and said nothing about
 * everybody else, so this matches the quoted-work cap as the conservative
 * reading. Being wrong in this direction is recoverable — an administrator can
 * grant more — while being wrong the other way has already been given away.
 * Its own constant so confirming it is a one-line edit.
 */
export const SUBSCRIPTION_CAP_PERCENT = 20;

/**
 * What is being discounted. The ceiling depends on it.
 *
 *   'quote'        work we deliver — 20%
 *   'subscription' the fee to be on the platform — 30% for the first ten of
 *                  each portal, otherwise the standard cap
 */
export type DiscountContext = 'quote' | 'subscription';

/**
 * The ceiling for this context.
 *
 * A subscriber whose seat number is unknown gets the standard cap rather than
 * the founding one. Not knowing whether somebody is among the first ten is not
 * evidence that they are, and the cheap failure is the one that gives away
 * less — a genuine founding subscriber who resolves low can be topped up with
 * a grant, while 30% handed to the fiftieth cannot be taken back.
 */
export function capFor(
  context: DiscountContext,
  opts: { seatNumber?: number | null } = {},
): number {
  if (context !== 'subscription') return QUOTE_DISCOUNT_CAP_PERCENT;

  const seat = Number(opts.seatNumber);
  const founding = Number.isFinite(seat) && seat >= 1 && seat <= FOUNDING_SEATS_PER_PORTAL;
  return founding ? FOUNDING_SUBSCRIPTION_CAP_PERCENT : SUBSCRIPTION_CAP_PERCENT;
}

/**
 * Is this subscriber one of a portal's founding ten?
 *
 * Seat numbers are per portal, so the count that matters is how many came
 * before them in THAT portal. Kept here, pure, so the rule is asserted rather
 * than reimplemented wherever a seat is worked out.
 */
export function isFoundingSeat(seatNumber: number | null | undefined): boolean {
  const seat = Number(seatNumber);
  return Number.isFinite(seat) && seat >= 1 && seat <= FOUNDING_SEATS_PER_PORTAL;
}
export type DiscountScope = 'customer' | 'job' | 'quote';

/** A discount an administrator granted. Withdrawn, never deleted. */
export interface DiscountGrant {
  id: string;
  percent: number;
  scope: DiscountScope;
  /** The customer's email, the job id, or the quote id — per `scope`. */
  scopeId: string;
  reason?: string;
  grantedBy?: string;
  grantedAt?: string;
  startsAt?: string;
  expiresAt?: string;
  revokedAt?: string;
  revokedBy?: string;
}

/** What a discount is being resolved against. */
export interface DiscountTarget {
  customerEmail?: string | null;
  jobId?: string | null;
  quoteId?: string | null;
}

export interface DiscountComponent {
  source: 'plan' | 'grant';
  percent: number;
  why: string;
  grantId?: string;
}

export interface ResolvedDiscount {
  /** What to actually apply, after the cap. */
  percent: number;
  /** True when the sources added up to more than the cap allows. */
  capped: boolean;
  /** What they added up to before the cap — worth showing an administrator. */
  requestedPercent: number;
  components: DiscountComponent[];
}

/** A percentage from anywhere, bounded to something a discount can be. */
function readPercent(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  // A discount over 100% would pay the customer to take the work, and a
  // negative one is a surcharge wearing the wrong name. Neither is this.
  return Math.min(100, n);
}

const when = (raw: unknown): number | null => {
  if (!raw) return null;
  const t = Date.parse(String(raw));
  return Number.isFinite(t) ? t : null;
};

/**
 * Does this grant apply, right now, to this target?
 *
 * A grant has to clear three separate things, and each one is a way a discount
 * could otherwise outlive its reason:
 *
 * It must not be revoked. It must be inside its window — a grant that has not
 * started yet is not a discount, and one that expired last month is the case
 * this whole check exists for. And it must be aimed at this target: a grant
 * made for one job does not follow the customer to the next one.
 *
 * An unparseable date fails the check rather than passing it. A date nobody can
 * read is not evidence that a discount is still live, and defaulting the other
 * way turns a typo into an open-ended giveaway.
 */
export function grantApplies(
  grant: DiscountGrant | null | undefined,
  target: DiscountTarget,
  now: Date,
): boolean {
  if (!grant) return false;
  if (grant.revokedAt) return false;
  if (readPercent(grant.percent) <= 0) return false;

  const at = now.getTime();

  if (grant.startsAt) {
    const starts = when(grant.startsAt);
    if (starts === null || at < starts) return false;
  }
  if (grant.expiresAt) {
    const expires = when(grant.expiresAt);
    if (expires === null || at >= expires) return false;
  }

  const scopeId = String(grant.scopeId || '').trim().toLowerCase();
  if (!scopeId) return false;

  if (grant.scope === 'customer') {
    return scopeId === String(target.customerEmail || '').trim().toLowerCase();
  }
  if (grant.scope === 'job') {
    return scopeId === String(target.jobId || '').trim().toLowerCase();
  }
  if (grant.scope === 'quote') {
    return scopeId === String(target.quoteId || '').trim().toLowerCase();
  }
  // An unrecognised scope is not a licence to discount everything.
  return false;
}

/**
 * The discount to apply: the plan's, plus every grant that applies, capped.
 *
 * Returns the components as well as the figure, because an administrator
 * looking at 20% needs to know it came from a plan and two grants rather than
 * from one mistake — and because `requestedPercent` above the cap is the signal
 * that grants are piling up faster than anybody is retiring them.
 *
 * Grants add to each other as well as to the plan. That follows from additive:
 * two 10% grants on one job are 20%, not 10%, and the cap is what stops the
 * third from mattering.
 */
export function resolveDiscount(
  planPercent: number | null | undefined,
  grants: DiscountGrant[] | null | undefined,
  target: DiscountTarget,
  now: Date,
  cap: number = QUOTE_DISCOUNT_CAP_PERCENT,
): ResolvedDiscount {
  const components: DiscountComponent[] = [];

  const plan = readPercent(planPercent);
  if (plan > 0) {
    components.push({ source: 'plan', percent: plan, why: 'Included with the plan' });
  }

  for (const grant of grants || []) {
    if (!grantApplies(grant, target, now)) continue;
    components.push({
      source: 'grant',
      percent: readPercent(grant.percent),
      why: String(grant.reason || '').trim() || 'Granted by an administrator',
      grantId: grant.id,
    });
  }

  const requestedPercent = Math.round(
    components.reduce((sum, c) => sum + c.percent, 0) * 100,
  ) / 100;

  const ceiling = readPercent(cap);
  const percent = Math.min(requestedPercent, ceiling);

  return {
    percent,
    capped: requestedPercent > ceiling,
    requestedPercent,
    components,
  };
}

/**
 * The money off, in cents, for a subtotal.
 *
 * Rounded to the cent here rather than wherever a total is assembled, so the
 * figure shown to a customer and the figure billed cannot differ by a rounding
 * decision made twice.
 */
export function discountCents(subtotalCents: number, percent: number): number {
  const base = Number(subtotalCents);
  if (!Number.isFinite(base) || base <= 0) return 0;
  const pct = readPercent(percent);
  if (pct <= 0) return 0;
  return Math.min(Math.round(base * (pct / 100)), Math.round(base));
}
