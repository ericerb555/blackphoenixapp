/**
 * Can this be bought, and if not, why not?
 *
 * WHY THIS EXISTS
 *
 * Because twice this week the answer was "no" and nothing said so.
 *
 * Three `plan_tier:content:*` records sat `active: false` for three weeks
 * carrying their own note — "NOT SELLABLE until a Stripe price is created" —
 * and the only place that fact was written down was inside the record. Of the
 * 18 add-ons that replaced them, 3 have a Stripe test price and 15 have no
 * price at all, which is the real reason the content centre cannot be bought.
 * Neither is a bug. Both are states no screen reported.
 *
 * THE RULE
 *
 *   A record may be sold only when it is switched on AND a Stripe price
 *   exists for the mode being sold.
 *
 * Both halves matter and they fail differently. `active: true` with no price
 * is a plan a customer can click and not buy. A price with `active: false` is
 * money left on the table. Neither is visible from a list of names.
 *
 * WHY IT IS PURE, AND HERE
 *
 * No Deno imports, no `kv`, no network — so `node --test` runs it directly and
 * the two real failures above are fixtures rather than anecdotes. A predicate
 * about whether something can be charged for is exactly the code that must not
 * be verified by looking at it.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * It does not ask Stripe whether the price id still exists. That is a network
 * call per record and a different question — "has someone archived this in the
 * Stripe dashboard" — which belongs to a reconciliation job, not to a screen
 * that must render in one request. This answers only what our own records say.
 */

/** The two Stripe worlds. A record can be sellable in one and not the other. */
export type PriceMode = 'test' | 'live';

/**
 * The shape every sellable record shares. Tiers, add-ons and cohorts differ in
 * plenty of ways, but not in these fields, and this module only needs these.
 */
export interface SellableRecord {
  id?: string;
  name?: string;
  active?: boolean;
  /** The amount, in cents. Cohorts may price by band instead — see `bands`. */
  priceCents?: number | null;
  interval?: string | null;
  stripePriceId?: string | null;
  stripePriceIdTest?: string | null;
  /** Present on a record that has been replaced and must not be revived. */
  supersededNote?: string | null;
  supersededByAddOn?: string | null;
  /** A cohort prices by seat count through bands rather than a flat figure. */
  bands?: Array<{ priceCents?: number | null }> | null;
}

export interface Readiness {
  /** Can a customer buy this right now, in this mode? */
  sellable: boolean;
  /** Why not, in plain sentences. Empty when sellable. */
  reasons: string[];
  /**
   * Superseded records are a category of their own: not broken, not fixable,
   * and specifically not to be made sellable. Flagged separately so a screen
   * can show them as history rather than as a problem to solve.
   */
  superseded: boolean;
  /** The price id that would be charged, or null. */
  priceId: string | null;
}

/** The id Stripe would charge in this mode. */
export function priceIdFor(record: SellableRecord | null | undefined, mode: PriceMode): string | null {
  if (!record) return null;
  const raw = mode === 'test' ? record.stripePriceIdTest : record.stripePriceId;
  const value = String(raw ?? '').trim();
  return value ? value : null;
}

/**
 * Does this record carry a price at all?
 *
 * A cohort with bands has no flat `priceCents` and is still priced, so bands
 * count. A band priced at zero does not: free is a decision somebody makes
 * deliberately, and we cannot tell it apart from a field nobody filled in, so
 * it is reported rather than assumed either way.
 */
export function hasAmount(record: SellableRecord | null | undefined): boolean {
  if (!record) return false;
  const flat = Number(record.priceCents ?? 0);
  if (Number.isFinite(flat) && flat > 0) return true;
  const bands = Array.isArray(record.bands) ? record.bands : [];
  return bands.some((b) => {
    const cents = Number(b?.priceCents ?? 0);
    return Number.isFinite(cents) && cents > 0;
  });
}

/** Has this record been replaced by something else? */
export function isSuperseded(record: SellableRecord | null | undefined): boolean {
  if (!record) return false;
  return Boolean(
    String(record.supersededNote ?? '').trim() ||
    String(record.supersededByAddOn ?? '').trim(),
  );
}

/**
 * The whole verdict for one record in one mode.
 *
 * Every reason is collected rather than returning on the first, because "it is
 * switched off" and "it has no price" are two jobs and a screen that reveals
 * them one at a time wastes a round trip of somebody's attention each time.
 */
export function readinessOf(
  record: SellableRecord | null | undefined,
  mode: PriceMode = 'live',
): Readiness {
  const superseded = isSuperseded(record);
  const priceId = priceIdFor(record, mode);
  const reasons: string[] = [];

  if (!record) {
    return { sellable: false, reasons: ['There is no such record.'], superseded: false, priceId: null };
  }

  // Said first and said plainly. A superseded record is not a to-do item, and
  // the last time one was treated as one, a task file asked for prices to be
  // created against three tiers whose own notes forbade it.
  if (superseded) {
    reasons.push(
      record.supersededByAddOn
        ? `Superseded — replaced by "${record.supersededByAddOn}". Do not reactivate.`
        : 'Superseded — replaced by something else. Do not reactivate.',
    );
  }

  if (!record.active) reasons.push('Switched off.');
  if (!hasAmount(record)) reasons.push('No price set.');
  if (!priceId) reasons.push(`No Stripe ${mode} price.`);

  // The interval only matters once there is something to charge. Stripe
  // refuses a subscription whose recurring lines disagree about interval, and
  // it does so in front of the customer.
  if (hasAmount(record) && !String(record.interval ?? '').trim()) {
    reasons.push('No billing interval.');
  }

  return { sellable: reasons.length === 0, reasons, superseded, priceId };
}

/**
 * A one-line summary for a heading.
 *
 * Superseded records are excluded from the denominator rather than counted as
 * failures: "3 of 24 sellable" reads like something is broken when 3 of those
 * 24 are deliberately retired history.
 */
export function summarise(
  records: Array<SellableRecord | null | undefined>,
  mode: PriceMode = 'live',
): { sellable: number; blocked: number; superseded: number; total: number } {
  let sellable = 0;
  let blocked = 0;
  let superseded = 0;

  for (const record of records) {
    const verdict = readinessOf(record, mode);
    if (verdict.superseded) superseded += 1;
    else if (verdict.sellable) sellable += 1;
    else blocked += 1;
  }

  return { sellable, blocked, superseded, total: records.length };
}
