/**
 * What to do when a supplier's cost or stock moves under a listed product.
 *
 * WHY THIS IS ITS OWN FILE
 *
 * Because it decides whether something comes off sale and whether a price
 * changes, and both of those are wrong in expensive, quiet ways: a product
 * delisted on a transient API error is revenue nobody notices stopping, and a
 * product left listed below cost is a sale that loses money every time it
 * succeeds. Neither announces itself. So the decision is separated from the
 * fetching and the writing, and it is tested.
 *
 * THE RULES, IN ORDER
 *
 *   1. CJ said nothing          → change nothing. Unknown is not zero.
 *   2. Stock is zero            → off sale. Refusing a sale is always safe.
 *   3. Stock returned, and it   → back on sale, if the margin still holds.
 *      came off for stock
 *   4. Margin below the floor   → raise the price if the rise is inside the
 *                                 agreed band; otherwise off sale and ask.
 *   5. Cost fell                → change nothing. Lowering a price is a
 *                                 revenue decision, not arithmetic.
 *
 * WHY STOCK IS AUTOMATIC IN BOTH DIRECTIONS AND PRICE IS NOT
 *
 * The plan's guardrail is that delisting is automatic and relisting is a
 * decision. That is about PRICE. Coming back into stock is the same product at
 * the same price that was already approved, so holding it off sale until
 * somebody notices would just lose sales to a clerical gap. A price change is
 * different: it alters what a customer is charged, so it is bounded by a band
 * the owner sets, and anything outside the band stops and asks.
 */

export interface CataloguePolicy {
  /** Has somebody actually chosen these numbers? */
  configured: boolean;
  /**
   * The least margin a listing may carry, as a fraction of the selling price:
   * (price - cost - shipping) / price.
   */
  marginFloor: number;
  /**
   * How far the price may be raised in one automatic step, as a fraction of
   * the current price. Zero means "never re-price automatically, always ask".
   */
  repriceBand: number;
  updatedAt?: string;
  updatedBy?: string;
}

export const POLICY_DEFAULTS: CataloguePolicy = {
  // Deliberately NOT configured. The job asks the owner to choose rather than
  // acting on a figure nobody picked — a margin floor invented by a developer
  // is a pricing decision taken by the wrong person.
  configured: false,
  marginFloor: 0.35,
  repriceBand: 0.1,
};

export const MARGIN_FLOOR_MAX = 0.9;
export const REPRICE_BAND_MAX = 0.5;

export function normalisePolicy(stored: unknown): CataloguePolicy {
  const s = (stored && typeof stored === 'object' ? stored : {}) as Record<string, unknown>;
  const floor = Number(s.marginFloor);
  const band = Number(s.repriceBand);
  return {
    configured: s.configured === true,
    marginFloor: Number.isFinite(floor) && floor > 0 && floor < MARGIN_FLOOR_MAX
      ? floor
      : POLICY_DEFAULTS.marginFloor,
    // A band of exactly 0 is meaningful — "always ask" — so it is allowed
    // through where the floor is not.
    repriceBand: Number.isFinite(band) && band >= 0 && band <= REPRICE_BAND_MAX
      ? band
      : POLICY_DEFAULTS.repriceBand,
    updatedAt: typeof s.updatedAt === 'string' ? s.updatedAt : undefined,
    updatedBy: typeof s.updatedBy === 'string' ? s.updatedBy : undefined,
  };
}

export interface ListingState {
  price: number;
  /** What we currently believe CJ charges. */
  cost: number;
  shipping?: number;
  isActive: boolean;
  /** Why it is currently off sale, when the machine took it off. */
  offSaleReason?: string;
}

export interface SupplierFacts {
  /** Null means CJ would not say. Never treat it as zero. */
  cost: number | null;
  stock: number | null;
}

export type CatalogueAction =
  | { kind: 'none'; why: string }
  | { kind: 'delist'; why: string; reason: 'out-of-stock' | 'margin' }
  | { kind: 'relist'; why: string }
  | { kind: 'reprice'; why: string; newPrice: number; marginAfter: number }
  | { kind: 'ask'; why: string; neededPrice: number; marginNow: number };

/** Margin as a fraction of the selling price. */
export function marginOf(price: number, cost: number, shipping = 0): number {
  if (!(price > 0)) return 0;
  return (price - cost - shipping) / price;
}

/** The lowest price that clears the floor, rounded up to the cent. */
export function priceForFloor(cost: number, shipping: number, floor: number): number {
  const denom = 1 - floor;
  if (!(denom > 0)) return Infinity;
  return Math.ceil(((cost + shipping) / denom) * 100) / 100;
}

/**
 * Decide what happens to one listing.
 *
 * Returns a single action. The caller applies it and records why — the `why` is
 * written into the run record, because "the price changed" without a reason is
 * the thing that makes an autonomous system frightening to own.
 */
export function decideListing(
  listing: ListingState,
  facts: SupplierFacts,
  policy: CataloguePolicy,
): CatalogueAction {
  const shipping = Number(listing.shipping || 0);

  // 1. CJ told us nothing we can act on.
  if (facts.stock === null && facts.cost === null) {
    return { kind: 'none', why: 'CJ did not answer for this product, so nothing was changed.' };
  }

  // 2. Genuinely out of stock.
  if (facts.stock === 0) {
    if (!listing.isActive) return { kind: 'none', why: 'Out of stock and already off sale.' };
    return { kind: 'delist', reason: 'out-of-stock', why: 'CJ reports no stock.' };
  }

  const cost = facts.cost ?? listing.cost;
  const marginNow = marginOf(listing.price, cost, shipping);

  // 3. Back in stock, and it was the machine that took it off for stock.
  if ((facts.stock ?? 0) > 0 && !listing.isActive && listing.offSaleReason === 'out-of-stock') {
    if (marginNow >= policy.marginFloor) {
      return { kind: 'relist', why: `Back in stock at CJ with ${(marginNow * 100).toFixed(1)}% margin.` };
    }
    return {
      kind: 'none',
      why: `Back in stock, but the margin is ${(marginNow * 100).toFixed(1)}% against a floor of ${(policy.marginFloor * 100).toFixed(0)}%, so it stays off sale.`,
    };
  }

  // Nothing further to decide about something a person took off sale.
  if (!listing.isActive) {
    return { kind: 'none', why: 'Off sale, and not by this job — left alone.' };
  }

  // 4. The margin has gone below the floor.
  if (marginNow < policy.marginFloor) {
    const needed = priceForFloor(cost, shipping, policy.marginFloor);
    const rise = listing.price > 0 ? needed / listing.price - 1 : Infinity;
    if (Number.isFinite(rise) && rise <= policy.repriceBand && policy.repriceBand > 0) {
      return {
        kind: 'reprice',
        newPrice: needed,
        marginAfter: marginOf(needed, cost, shipping),
        why: `CJ's cost moved to ${cost.toFixed(2)}, leaving ${(marginNow * 100).toFixed(1)}% margin. Raised to ${needed.toFixed(2)}, a ${(rise * 100).toFixed(1)}% rise, inside the ${(policy.repriceBand * 100).toFixed(0)}% band.`,
      };
    }
    return {
      kind: 'ask',
      neededPrice: needed,
      marginNow,
      why: `CJ's cost moved to ${cost.toFixed(2)}, leaving ${(marginNow * 100).toFixed(1)}% margin. Restoring the floor needs ${needed.toFixed(2)}, a ${Number.isFinite(rise) ? `${(rise * 100).toFixed(1)}%` : 'an impossible'} rise — outside the ${(policy.repriceBand * 100).toFixed(0)}% band.`,
    };
  }

  // 5. Healthy. A cost that FELL is left alone on purpose: cutting a price is a
  //    revenue decision and this job does not get to make it.
  return {
    kind: 'none',
    why: `Margin ${(marginNow * 100).toFixed(1)}% is at or above the ${(policy.marginFloor * 100).toFixed(0)}% floor.`,
  };
}
