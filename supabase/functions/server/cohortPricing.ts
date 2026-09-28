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
