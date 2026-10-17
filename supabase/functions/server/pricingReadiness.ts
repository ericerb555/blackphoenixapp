/**
 * Can this be bought, and if not, why not — for a SCREEN rather than a sale.
 *
 * WHY THIS IS NOT A SECOND OPINION
 *
 * `planTier.ts` already answers "may this be sold" with `isPurchasable()` and
 * `notPurchasableReason()`, and those are what the write path, the checkout
 * path and the public catalogue use. This module delegates to them and does
 * not reimplement them.
 *
 * It was written the other way round first — a standalone predicate with its
 * own active/price/id checks — and that was a mistake worth recording, because
 * the two versions already disagreed. `isPurchasable` treats `active:
 * undefined` as sellable, grandfathering records written before the field
 * existed; the copy treated a missing field as switched off. No record in the
 * catalogue currently omits `active`, so nothing broke, but a screen and a
 * checkout disagreeing about whether a plan is on sale is the kind of fault
 * that surfaces as a customer complaint rather than as a failing test.
 *
 * WHAT IT ADDS, AND WHY THAT BELONGS HERE INSTEAD
 *
 * One thing: **superseded records**. Nothing else in the codebase reads
 * `supersededNote` or `supersededByAddOn`, and the distinction does not belong
 * in `isPurchasable` — a superseded record is not sellable, and `isPurchasable`
 * already says so for other reasons. What a screen needs, and a checkout does
 * not, is the difference between *not yet* and *never again*:
 *
 *   plan_addon:…:content-studio   no Stripe price   → create one
 *   plan_tier:content:studio      superseded        → leave it alone for ever
 *
 * Those look identical in a list of names and the correct action on one is the
 * opposite of the other. Three weeks of "not sellable" and a task file that
 * asked for prices to be created against records whose own notes forbade it
 * came out of exactly that confusion.
 *
 * RELATED BUT DIFFERENT: `retiredAudiences.ts`
 *
 * That refuses writes to, and public reads of, a whole retired AUDIENCE
 * (`content`). This is per RECORD. Both are needed: the audience guard stops a
 * phantom portal being published, and this explains a single row to whoever is
 * looking at it.
 *
 * Pure — no Deno imports, so `node --test` runs it.
 */

import {
  isPurchasable, notPurchasableReason, priceIdFor,
  type StripeMode, type Sellable,
} from './planTier.ts';

/** The two Stripe worlds. Re-exported so callers need only one import. */
export type PriceMode = StripeMode;

/**
 * What this module reads. `Sellable` plus the two superseded markers and the
 * cohort band list, neither of which `planTier.ts` knows about.
 */
export interface SellableRecord extends Sellable {
  id?: string;
  name?: string;
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
   * Retired on purpose: not broken, not fixable, and specifically not to be
   * made sellable. Separate from `sellable` so a screen can show it as history
   * rather than as work outstanding.
   */
  superseded: boolean;
  /** The price id that would be charged, or null. */
  priceId: string | null;
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
 * Does a cohort carry a price in its bands?
 *
 * Only cohorts do; tiers and add-ons use the flat `priceCents` that
 * `isPurchasable` already checks. A band at zero does not count: free may be
 * deliberate, but it is indistinguishable from a field nobody filled in, so it
 * is reported rather than assumed either way.
 */
export function hasBandedPrice(record: SellableRecord | null | undefined): boolean {
  const bands = Array.isArray(record?.bands) ? record!.bands! : [];
  return bands.some((b) => {
    const cents = Number(b?.priceCents ?? 0);
    return Number.isFinite(cents) && cents > 0;
  });
}

/**
 * The verdict for one record in one mode.
 *
 * `isPurchasable` decides sellability; this adds the superseded flag and
 * converts the single reason string into the list a screen renders. The list
 * stays a list because a cohort can be refused for a banded-price reason that
 * `notPurchasableReason` has no vocabulary for.
 */
export function readinessOf(
  record: SellableRecord | null | undefined,
  mode: PriceMode = 'live',
): Readiness {
  if (!record) {
    return { sellable: false, reasons: ['There is no such record.'], superseded: false, priceId: null };
  }

  const superseded = isSuperseded(record);
  // Upstream returns '' for absent; this module's contract is null, so the
  // boundary is normalised here rather than leaving two spellings of "none".
  const priceId = priceIdFor(record, mode) || null;
  const reasons: string[] = [];

  // Said first and said plainly. The last time a superseded record was read as
  // an outstanding task, a plan nobody could reach was nearly put on sale.
  if (superseded) {
    reasons.push(
      record.supersededByAddOn
        ? `Superseded — replaced by "${record.supersededByAddOn}". Do not reactivate.`
        : 'Superseded — replaced by something else. Do not reactivate.',
    );
  }

  /*
   * A cohort priced only by bands has no flat `priceCents`, so `isPurchasable`
   * would refuse it for having no price — correctly, by its own lights, since
   * it has never known about bands. Asking it about a banded cohort would
   * produce a reason that is wrong rather than merely unhelpful, so the banded
   * case is answered here and the flat case is delegated.
   */
  const banded = hasBandedPrice(record);

  if (banded) {
    if (record.active === false) reasons.push('That plan is not currently offered.');
    if (!priceId) reasons.push(`No Stripe ${mode} price.`);
  } else if (!isPurchasable(record, mode)) {
    const why = notPurchasableReason(record, mode);
    if (why) reasons.push(why);
  }

  return { sellable: reasons.length === 0, reasons, superseded, priceId };
}

/**
 * A one-line summary for a heading.
 *
 * Superseded records are counted apart rather than as failures: "3 of 24
 * sellable" reads like a fault when some of the 24 are deliberately retired.
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

/*
 * `priceIdFor` is deliberately NOT re-exported. It returns '' for absent while
 * `Readiness.priceId` is null for absent, and one name with two spellings of
 * "no price" is how a falsy check becomes a bug. Import it from `planTier.ts`,
 * which owns it.
 */
export { isPurchasable };
