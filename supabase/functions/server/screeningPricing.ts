/**
 * What a screening costs, who pays it, and when we refuse to charge at all.
 *
 * WHY THIS IS NOT A `plan_addon` RECORD
 *
 * `plan-catalog.tsx` publishes `plan_tier:` and `plan_addon:` records, and both
 * are recurring subscription shapes. A screening fee is neither: it is charged
 * once, per applicant, and it has a cost of goods behind it. Forcing it into an
 * add-on would misuse that shape and put a per-use price where every reader
 * expects a monthly one.
 *
 * What is borrowed from that file is the principle it states about itself: *no
 * seeded tiers, no invented prices.* So this starts empty, and **an empty price
 * means nothing is charged** — a screening ordered today behaves exactly as it
 * did before this file existed. Nothing goes on sale until somebody publishes a
 * figure.
 *
 * WHY THE PAYER IS A SETTING AND NOT A DECISION MADE HERE
 *
 * Application and screening fees are regulated, the rules differ by state, and
 * Massachusetts — where Black Phoenix operates — is among the strictest about
 * charging a residential applicant anything at all. That question needs a
 * lawyer, not a model and not a guess buried in a module. See the blocking list
 * in `tasks/tenant-screening.md`.
 *
 * So the law is not encoded here. What is encoded is a mechanism that is safe
 * whichever way the answer goes, and a default that fails in the harmless
 * direction:
 *
 *   - **Landlord-paid is the default**, because a business paying its own
 *     supplier is lawful everywhere. It is what happens when nothing is
 *     configured.
 *   - **Applicant-paid never happens by accident.** It requires an explicit
 *     setting, and it requires knowing which state the property is in — because
 *     a per-state rule cannot be applied to an unknown state. An unknown state
 *     resolves to the landlord, never to the applicant.
 *
 * WHY THERE IS AN UPPER BOUND ON THE PRICE
 *
 * Because a figure typed with the decimal point in the wrong place would charge
 * somebody five thousand dollars for a credit check, and a bound is cheaper
 * than a refund and an apology.
 */

export type ScreeningPayer = 'landlord' | 'applicant';

export interface ScreeningPricing {
  /** What we charge. Absent, zero or negative means nothing is charged. */
  priceCents?: number | null;
  /** What the agency charges us, so the margin per order is computable. */
  costCents?: number | null;
  /** Who pays when a state has no entry of its own. Defaults to the landlord. */
  defaultPayer?: ScreeningPayer | null;
  /** Per-state overrides, keyed by two-letter code. */
  payerByState?: Record<string, ScreeningPayer> | null;
  /** A switch to stop charging without deleting the figures. */
  enabled?: boolean | null;
}

/** Anything above this is treated as a mistake rather than a price. */
export const SCREENING_MAX_PRICE_CENTS = 20_000;

export type ChargeRefusal =
  | 'no_pricing'
  | 'disabled'
  | 'unpriced'
  | 'price_out_of_bounds';

/**
 * One flat shape rather than a discriminated union, and not by preference.
 *
 * `tsconfig.server.json` is not strict, so narrowing a union on a boolean
 * discriminant does not work there — `if (d.charge) … else d.reason` reports
 * `reason` as missing. The same thing happened to the submission caps in
 * `screeningLink.ts`, which answered it by returning a nullable refusal.
 *
 * Here every field is always present instead, because this value carries both
 * halves of the answer at once: when nothing is charged the reason says why and
 * the amounts are zero, and when something is charged the reason is null. A
 * caller cannot read a field that is not there, and nothing has to be narrowed.
 */
export interface ChargeDecision {
  charge: boolean;
  reason: ChargeRefusal | null;
  payer: ScreeningPayer | null;
  amountCents: number;
  costCents: number;
}

const NO_CHARGE = (reason: ChargeRefusal): ChargeDecision =>
  ({ charge: false, reason, payer: null, amountCents: 0, costCents: 0 });

/**
 * Who pays for a screening on a property in this state.
 *
 * Falls back to the landlord in every uncertain case, including an unreadable
 * state and a configured value that is not one of the two payers. The failure
 * direction is the point: getting this wrong towards the landlord costs Black
 * Phoenix a fee it could have passed on, and getting it wrong towards the
 * applicant is an unlawful charge to a member of the public.
 */
export function payerFor(
  pricing: ScreeningPricing | null | undefined,
  state: string | null | undefined,
): ScreeningPayer {
  const code = String(state ?? '').trim().toUpperCase();
  const overrides = pricing?.payerByState ?? {};
  const forState = code ? overrides[code] : undefined;
  if (forState === 'landlord' || forState === 'applicant') return forState;

  const fallback = pricing?.defaultPayer;
  // An unknown state can never resolve to the applicant: a per-state rule
  // cannot be applied to a state nobody recorded.
  if (fallback === 'applicant' && code) return 'applicant';
  return 'landlord';
}

/**
 * Whether this screening is charged for, and if so to whom and how much.
 *
 * A refusal is not an error. `unpriced` is the ordinary state of this system
 * until somebody publishes a price, and the caller's correct response is to
 * carry on and order the screening for nothing — which is what it did before
 * there was any such thing as a price.
 */
export function chargeFor(
  pricing: ScreeningPricing | null | undefined,
  state: string | null | undefined,
): ChargeDecision {
  if (!pricing) return NO_CHARGE('no_pricing');
  if (pricing.enabled === false) return NO_CHARGE('disabled');

  const price = Number(pricing.priceCents ?? 0);
  if (!Number.isFinite(price) || price <= 0) return NO_CHARGE('unpriced');
  if (!Number.isInteger(price) || price > SCREENING_MAX_PRICE_CENTS) {
    return NO_CHARGE('price_out_of_bounds');
  }

  const rawCost = Number(pricing.costCents ?? 0);
  const cost = Number.isFinite(rawCost) && rawCost > 0 ? Math.round(rawCost) : 0;

  return { charge: true, reason: null, payer: payerFor(pricing, state), amountCents: price, costCents: cost };
}

export function chargeRefusalMessage(reason: ChargeRefusal): string {
  switch (reason) {
    case 'no_pricing':
    case 'unpriced':
      return 'No screening fee is configured, so this screening is being ordered at no charge.';
    case 'disabled':
      return 'Screening fees are switched off, so this screening is being ordered at no charge.';
    case 'price_out_of_bounds':
      return `The configured screening fee is not a usable amount (over $${(SCREENING_MAX_PRICE_CENTS / 100).toFixed(2)}), so nothing has been charged. Correct it in the screening settings.`;
  }
}

/**
 * The margin on a set of orders, in cents.
 *
 * Counts only what was actually paid. An order that was never charged
 * contributes nothing to either side rather than appearing as a free sale with
 * a cost attached, which would show the business losing money on work it
 * deliberately gave away.
 */
export function marginOf(orders: ReadonlyArray<{ status?: string; priceCents?: number | null; costCents?: number | null; paidAt?: string | null }>) {
  let revenue = 0;
  let cost = 0;
  let paid = 0;
  for (const o of orders ?? []) {
    if (!o?.paidAt) continue;
    const price = Number(o.priceCents ?? 0);
    if (!Number.isFinite(price) || price <= 0) continue;
    paid += 1;
    revenue += Math.round(price);
    const c = Number(o.costCents ?? 0);
    if (Number.isFinite(c) && c > 0) cost += Math.round(c);
  }
  return { paidOrders: paid, revenueCents: revenue, costCents: cost, marginCents: revenue - cost };
}
