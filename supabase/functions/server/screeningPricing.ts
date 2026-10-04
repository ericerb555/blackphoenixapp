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

/* ── the New Hampshire refund ─────────────────────────────────────────────── */

/**
 * What must go back to an applicant who was not rented to.
 *
 * `RSA 540-A:3 VIII`: where an application fee was collected from an applicant
 * and the unit is not rented to them, anything beyond the actual cost of the
 * documented background and credit check — plus reasonable administrative costs
 * — must be returned within thirty days.
 *
 * WHY `retainedAdminCents` IS A SETTING AND DEFAULTS TO ZERO
 *
 * The statute permits retaining "reasonable administrative costs", and whether
 * Black Phoenix's own fee counts as that is a genuine question for a
 * Massachusetts-and-New-Hampshire lawyer rather than something this file should
 * decide. Zero is the conservative reading: refund the whole markup. If the
 * answer comes back that the fee qualifies, the number goes up and this
 * function needs no edit. The code takes no view on the law.
 *
 * WHY SILENCE IS NOT A REJECTION
 *
 * The duty turns on the unit not being rented to them, and an undecided
 * application does not establish that. So this returns nothing while the
 * decision is absent. Refunding early hands money back to somebody about to be
 * approved; the answer to a stale application is to tell a person about it, not
 * to guess. See `staleUndecided` below.
 */
export function refundDue(
  order: {
    payer?: string | null;
    paidAt?: string | null;
    decision?: string | null;
    priceCents?: number | null;
    costCents?: number | null;
    refundedAt?: string | null;
  } | null | undefined,
  retainedAdminCents = 0,
): number {
  if (!order) return 0;
  // Only money an APPLICANT paid can be owed back to them.
  if (String(order.payer ?? '') !== 'applicant') return 0;
  if (!order.paidAt) return 0;
  // Never twice.
  if (order.refundedAt) return 0;
  // Only on a recorded rejection. Silence is not one.
  if (String(order.decision ?? '').toLowerCase() !== 'rejected') return 0;

  const price = Number(order.priceCents ?? 0);
  if (!Number.isFinite(price) || price <= 0) return 0;

  const cost = Number(order.costCents ?? 0);
  const keptCost = Number.isFinite(cost) && cost > 0 ? Math.round(cost) : 0;
  const admin = Number(retainedAdminCents);
  const keptAdmin = Number.isFinite(admin) && admin > 0 ? Math.round(admin) : 0;

  // Retaining more than was taken would be a negative refund.
  const owed = Math.round(price) - keptCost - keptAdmin;
  return owed > 0 ? owed : 0;
}

/**
 * Applicant-paid orders that have been paid for and never decided.
 *
 * The companion to the rule above. These are the ones where a refund may well
 * be owed and the system cannot know it, so they are surfaced rather than
 * resolved — a landlord who has taken somebody's money and not answered them
 * is the person who has to act, and the thirty-day clock is already running
 * from the day the fee was received.
 */
export function staleUndecided<T extends { payer?: string | null; paidAt?: string | null; decision?: string | null; refundedAt?: string | null }>(
  orders: readonly T[] | null | undefined,
  afterDays: number,
  nowMs: number = Date.now(),
): T[] {
  const cutoff = nowMs - afterDays * 24 * 60 * 60 * 1000;
  return (orders ?? []).filter((o) => {
    if (!o || String(o.payer ?? '') !== 'applicant') return false;
    if (!o.paidAt || o.refundedAt) return false;
    if (String(o.decision ?? '').trim()) return false;
    const paid = Date.parse(String(o.paidAt));
    return Number.isFinite(paid) && paid <= cutoff;
  });
}

/**
 * The margin on a set of orders, in cents.
 *
 * Counts only what was actually paid. An order that was never charged
 * contributes nothing to either side rather than appearing as a free sale with
 * a cost attached, which would show the business losing money on work it
 * deliberately gave away.
 */
export function marginOf(orders: ReadonlyArray<{ status?: string; priceCents?: number | null; costCents?: number | null; paidAt?: string | null; refundedAt?: string | null; refundCents?: number | null }>) {
  let revenue = 0;
  let cost = 0;
  let paid = 0;
  let refunded = 0;
  for (const o of orders ?? []) {
    if (!o?.paidAt) continue;
    const price = Number(o.priceCents ?? 0);
    if (!Number.isFinite(price) || price <= 0) continue;
    paid += 1;
    revenue += Math.round(price);
    const c = Number(o.costCents ?? 0);
    if (Number.isFinite(c) && c > 0) cost += Math.round(c);
    // Money given back under RSA 540-A:3 VIII is not revenue. Counting the
    // gross and ignoring the refunds would overstate New Hampshire earnings by
    // exactly the markup on every applicant who was turned down — which is
    // most of them.
    const r = Number(o.refundCents ?? 0);
    if (o.refundedAt && Number.isFinite(r) && r > 0) refunded += Math.round(r);
  }
  return {
    paidOrders: paid,
    revenueCents: revenue,
    refundedCents: refunded,
    costCents: cost,
    marginCents: revenue - refunded - cost,
  };
}
