/**
 * What a cohort costs at a given size.
 *
 * WHY THIS WAS PULLED OUT OF THE ROUTE
 *
 * This is the reason cohorts was chosen as the money spine: a cohort prices by
 * SEAT COUNT, through bands and an optional scaling curve, which `plan_tier`
 * cannot do. It is the most valuable logic in the system and it lived inline
 * in an HTTP handler in a `.tsx`, where the node test runner cannot reach it.
 *
 * Moving it here is not tidying. The inline version has three faults that
 * produce a WRONG PRICE rather than an error, and a wrong price is the one
 * failure a customer notices on their statement:
 *
 *   1. `Math.max(cohort.priceFloor, …)` with no floor configured is
 *      `Math.max(undefined, …)` — NaN. Every cohort without an explicit floor
 *      and ceiling priced at NaN.
 *   2. `Math.log10(userCount / 1000)` is negative below a thousand seats and
 *      `-Infinity` at zero, so the logarithmic strategy inverted the price for
 *      every small account — the common case for this business.
 *   3. A floor above the ceiling silently returned the ceiling, which is lower
 *      than the floor somebody deliberately set.
 *
 * All three are fixed here, where they can be tested. Nothing about the
 * intended model changed.
 */

export interface PricingBand {
  minUsers: number;
  maxUsers: number;
  priceMultiplier: number;
  name?: string;
}

/**
 * Turn an existing plan tier into a cohort, carrying nothing that was not
 * already true.
 *
 * WHY THIS IS A PURE FUNCTION AND NOT A LOOP IN A ROUTE
 *
 * Because of what happened the last time cohorts were seeded. A route once
 * wrote twelve invented cohorts into production — "Vendor Starter, 1,247
 * subscribers, $61,103 a month", close to a million dollars of monthly
 * revenue that had never been earned — onto the screen the company reads its
 * own P&L from, refreshing every sixty seconds to look live. That route is
 * now a 410.
 *
 * So this migration is written to be READ before it is run, and tested. The
 * rules it follows:
 *
 *   - The price comes from the tier. Nothing is repriced.
 *   - Both Stripe price ids travel with it, so the cohort bills against
 *     exactly what the tier already billed against.
 *   - NO subscriber count, revenue, churn or LTV is written. Not zero as a
 *     placeholder — absent, so that anything reporting money has to derive it
 *     from real memberships and cannot pick up a number somebody seeded.
 *   - One band covering every seat count, because a flat tier is a cohort
 *     with no banding. Bands are added afterwards, deliberately, by a person.
 *   - `sourceTierId` records where it came from, so the migration can be
 *     re-run without duplicating and the pair can be reconciled later when
 *     the tier collapses into the cohort.
 */
export function cohortFromTier(tier: {
  id?: string;
  name?: string;
  blurb?: string;
  audience?: string;
  priceCents?: number;
  interval?: string;
  active?: boolean;
  features?: string[];
  limits?: Record<string, number>;
  stripePriceId?: string;
  stripePriceIdTest?: string;
  includedAddOns?: string[];
  discountPercent?: number;
}): Cohort & Record<string, unknown> {
  const tierId = String(tier?.id ?? '').trim();
  return {
    id: `cohort-tier-${tierId}`,
    name: String(tier?.name ?? tierId),
    blurb: tier?.blurb,
    audience: tier?.audience,
    category: tier?.audience,
    // Cohorts price in whole currency units; tiers store cents.
    basePrice: Math.max(0, Number(tier?.priceCents ?? 0) || 0) / 100,
    interval: tier?.interval ?? 'month',
    status: tier?.active ? 'active' : 'inactive',
    features: Array.isArray(tier?.features) ? tier.features : [],
    limits: tier?.limits ?? {},
    stripePriceId: tier?.stripePriceId,
    stripePriceIdTest: tier?.stripePriceIdTest,
    /**
     * These two carry or the migration overcharges people.
     *
     * `includedAddOns` is how the ladder steps: the top tier includes what
     * the rungs below pay extra for. A cohort that forgot it would start
     * billing a top-tier customer for something their tier already covers —
     * a real charge on a real card, caused by a migration that looked
     * lossless. `discountPercent` is the same failure pointing the other
     * way: losing it quietly raises the price of every contract that
     * subscriber signs.
     */
    includedAddOns: Array.isArray(tier?.includedAddOns) ? tier.includedAddOns : [],
    discountPercent: Number(tier?.discountPercent ?? 0) || 0,
    /** A flat tier is one band over every size. Banding is added by a person. */
    pricingTiers: [{ minUsers: 0, maxUsers: Number.MAX_SAFE_INTEGER, priceMultiplier: 1, name: 'all' }],
    sourceTierId: tierId,
    migratedAt: new Date().toISOString(),
  };
}

export interface Cohort {
  id?: string;
  name?: string;
  basePrice?: number;
  pricingTiers?: PricingBand[];
  autoScaling?: boolean;
  scalingStrategy?: 'linear' | 'exponential' | 'logarithmic' | string;
  scalingMultiplier?: number;
  priceFloor?: number;
  priceCeiling?: number;
  maxSpots?: number;
  activeSubscribers?: number;
  /** Extras this cohort covers at no charge. Same meaning as on a tier. */
  includedAddOns?: string[];
  /** Percent off contract work for a subscriber. Same meaning as on a tier. */
  discountPercent?: number;
  /** The tier this cohort was migrated from, when it was. */
  sourceTierId?: string;
  /**
   * These three are read by `addOnAvailableOn` through `tierViewOfCohort`.
   * They are on the interface rather than left to `Record<string, unknown>`
   * so that dropping one is a type error rather than a silent mispricing.
   */
  status?: string;
  audience?: string;
  interval?: string;
}

/** A number, or the fallback when it is missing or nonsense. */
const num = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * The band a given seat count falls into, or null.
 *
 * Bands are read in ascending order rather than in the order they were typed,
 * so a cohort whose bands were entered out of sequence still prices correctly.
 * Both ends are inclusive, matching what the route did.
 */
export function bandFor(cohort: Cohort | null | undefined, userCount: number): PricingBand | null {
  const seats = Math.max(0, num(userCount));
  const bands = Array.isArray(cohort?.pricingTiers) ? [...cohort!.pricingTiers!] : [];
  if (bands.length === 0) return null;

  return bands
    .filter((b) => b && Number.isFinite(Number(b.minUsers)))
    .sort((a, b) => num(a.minUsers) - num(b.minUsers))
    .find((b) => seats >= num(b.minUsers) && seats <= num(b.maxUsers, Infinity)) || null;
}

export interface PriceResult {
  /** The figure to charge. Always a real number. */
  price: number;
  band: PricingBand | null;
  scalingApplied: boolean;
  /** Set when the price was pulled up to a floor or down to a ceiling. */
  clampedBy?: 'floor' | 'ceiling';
}

/**
 * What to charge a cohort of this size.
 *
 * Every missing field falls back rather than poisoning the arithmetic: no base
 * price is zero, no band is the base price, no floor is no floor. The one
 * thing this will never return is NaN, because a NaN price reaches a customer
 * as a blank or a zero and nobody notices until the month closes.
 */
export function priceFor(cohort: Cohort | null | undefined, userCount: number): PriceResult {
  const seats = Math.max(0, num(userCount));
  const base = Math.max(0, num(cohort?.basePrice));
  const band = bandFor(cohort, seats);

  let price = band ? base * num(band.priceMultiplier, 1) : base;

  const scalingApplied = Boolean(cohort?.autoScaling);
  if (scalingApplied) {
    const multiplier = num(cohort?.scalingMultiplier, 1);
    switch (cohort?.scalingStrategy) {
      case 'linear':
        price *= 1 + (seats / 100_000) * multiplier;
        break;
      case 'exponential':
        price *= Math.pow(multiplier, seats / 50_000);
        break;
      case 'logarithmic':
        /**
         * Guarded at a thousand seats. Below that `log10(seats/1000)` is
         * negative — and `-Infinity` at zero — so the original curve REDUCED
         * the price as an account got smaller, and inverted it entirely for
         * the small accounts that are most of this business. Scaling is meant
         * to add above the threshold, never subtract below it.
         */
        if (seats > 1000) price *= 1 + Math.log10(seats / 1000) * multiplier;
        break;
      default:
        break;
    }
  }

  if (!Number.isFinite(price) || price < 0) price = base;

  // A floor above a ceiling is a misconfiguration; the floor is what somebody
  // deliberately set as the least they will accept, so it wins.
  const floor = cohort?.priceFloor === undefined ? null : Math.max(0, num(cohort.priceFloor));
  const ceiling = cohort?.priceCeiling === undefined ? null : Math.max(0, num(cohort.priceCeiling));

  let clampedBy: 'floor' | 'ceiling' | undefined;
  if (ceiling !== null && price > ceiling && !(floor !== null && floor > ceiling)) {
    price = ceiling;
    clampedBy = 'ceiling';
  }
  if (floor !== null && price < floor) {
    price = floor;
    clampedBy = 'floor';
  }

  return { price: Math.round(price * 100) / 100, band, scalingApplied, clampedBy };
}

/**
 * How many places are left, or null when the cohort is not capped.
 *
 * Null and zero are different answers and must not be confused: null is "sell
 * as many as you like", zero is "this one is full". A screen that treats them
 * the same either refuses an uncapped cohort or oversells a capped one.
 */
export function spotsRemaining(cohort: Cohort | null | undefined): number | null {
  if (cohort?.maxSpots === undefined || cohort.maxSpots === null) return null;
  const cap = Math.max(0, num(cohort.maxSpots));
  const taken = Math.max(0, num(cohort.activeSubscribers));
  return Math.max(0, cap - taken);
}

export const isFull = (cohort: Cohort | null | undefined): boolean => spotsRemaining(cohort) === 0;

/**
 * The monthly revenue of a cohort, COMPUTED from its memberships.
 *
 * Deliberately a function of the memberships rather than a field on the
 * record. The cohort currently stores `monthlyRevenue` and a separate route
 * writes it by hand — so the figure is whatever was last typed, and it drifts
 * from what is actually being paid without anything announcing it.
 *
 * Money that is reported has to be derived from the records that represent it.
 * This is what the stored field is replaced by.
 */
export function monthlyRevenueOf(
  cohort: Cohort | null | undefined,
  memberships: Array<{ cohortId?: string; status?: string; seats?: number }>,
): number {
  const id = String(cohort?.id ?? '');
  if (!id) return 0;

  const belongsHere = (m: { cohortId?: string }) => String(m?.cohortId ?? '') === id;

  /**
   * Only what is actually being paid for. A trial is breadth without revenue —
   * counting one would report money that has not been charged — and a
   * cancelled membership leaves its record behind, so an absent status is
   * treated as active and anything else is not.
   */
  const isPaying = (m: { status?: string }) =>
    String(m?.status ?? 'active').toLowerCase() === 'active';

  const total = (memberships || [])
    .filter((m) => belongsHere(m) && isPaying(m))
    .reduce((sum, m) => sum + priceFor(cohort, num(m?.seats, 1)).price, 0);

  return Math.round(total * 100) / 100;
}


/**
 * A cohort record with every derived money figure removed.
 *
 * WHY THIS IS A FUNCTION AND NOT A LINE IN ONE HANDLER
 *
 * Because there turned out to be FOUR ways to write a cohort, and closing one
 * of them is not closing the hole. `POST /cohorts` was fixed first, and
 * `PUT /cohorts/:id` still did `{ ...existing, ...updates }` with nothing
 * removed — so an edit could write `monthlyRevenue: 999999` even though the
 * create route refused it. `bulk-update` had the same shape.
 *
 * These five fields describe what a cohort EARNS, and that is a fact about
 * the memberships pointing at it, not a property somebody types. They are
 * derived on read by `withDerivedFigures`. Stripping them on every write means
 * there is no field for a fabricated number to live in, whichever door it
 * arrives through.
 */
export const withoutMoneyFigures = (body: any): Record<string, any> => {
  const {
    monthlyRevenue: _mr, activeSubscribers: _as, churnRate: _cr,
    conversionRate: _cv, averageLTV: _ltv,
    // Written only by the retired `update-subscribers` route, which computed
    // revenue from a subscriber count the caller supplied.
    foundingMemberCount: _fmc, foundingMemberRevenue: _fmr,
    ...described
  } = body ?? {};
  return described;
};
