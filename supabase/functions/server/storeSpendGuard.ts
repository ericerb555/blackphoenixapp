/**
 * storeSpendGuard.ts — the money ceiling on a fulfilment sweep.
 *
 * WHY THIS EXISTS, WHICH IS NOT A FLATTERING STORY
 *
 * `maxSpendPerTick` has been declared since the autonomy clock was built. Its
 * comment reads *"Hard stop on money committed to suppliers in one tick, in
 * dollars"*. It is validated on write, bounded at $100,000, reported by
 * `GET /store/autonomy/status` under `ceilings`, and handed to every job on its
 * context.
 *
 * **No job ever read it.** The fulfilment sweep honoured `maxOrdersPerTick` and
 * ignored the money entirely, so the dollar ceiling was decoration — a number
 * somebody could set, see echoed back, and reasonably believe was a hard stop.
 * Twenty-five orders a tick was the only real limit, whatever they cost.
 *
 * Found on 2026-10-07 while checking the guardrails on the one job that spends
 * money, before it was switched on rather than after. `fulfil` is still off and
 * has never run against a live CJ account, so nothing was ever overspent — but
 * the moment CJ is reactivated, switching it on is the obvious next step, and
 * that is precisely when a decorative guardrail costs real money.
 *
 * WHAT A SWEEP IS ALLOWED TO COMMIT
 *
 * Our own cost, not what the customer paid. The two differ by the whole margin,
 * and a ceiling that counted revenue would stop a sweep at roughly half the
 * money it was told to allow. `dropshipper_inventory:{sku}` records `cost` and
 * `shippingCost` per SKU, so the real figure is knowable before anything is
 * forwarded.
 *
 * WHEN THE COST IS NOT KNOWN
 *
 * The item's sale price stands in. That OVER-states what we pay, so the ceiling
 * binds sooner than it strictly needs to — which is the right direction to be
 * wrong in for a spend guard, and much better than treating an unknown cost as
 * zero. An unknown cost counted as nothing is how a sweep spends its way past a
 * limit while reporting that it stayed inside one.
 */

export interface SpendLine {
  sku: string;
  quantity: number;
  /** What the customer paid per unit. The fallback, not the figure. */
  price?: number;
}

/** What `dropshipper_inventory:{sku}` holds about what we pay. */
export interface SupplierCost {
  cost?: number;
  shippingCost?: number;
}

const money = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const whole = (v: unknown) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 1;
};

/**
 * What one order would commit to the supplier.
 *
 * Returns the figure and whether any line had to fall back to its sale price,
 * because a caller reporting a spend total should be able to say how much of it
 * was estimated.
 */
export function orderSpend(
  lines: SpendLine[],
  costs: Record<string, SupplierCost | undefined>,
): { dollars: number; estimatedLines: number } {
  let dollars = 0;
  let estimatedLines = 0;

  for (const line of Array.isArray(lines) ? lines : []) {
    const sku = String(line?.sku || '');
    const quantity = whole(line?.quantity);
    const known = sku ? costs[sku] : undefined;
    const unitCost = money(known?.cost);

    if (unitCost > 0) {
      // Shipping is per order line rather than per unit on CJ's records.
      dollars += unitCost * quantity + money(known?.shippingCost);
      continue;
    }

    estimatedLines += 1;
    dollars += money(line?.price) * quantity;
  }

  return { dollars: Math.round(dollars * 100) / 100, estimatedLines };
}

export interface SpendDecision {
  /** May this order be forwarded? */
  allowed: boolean;
  /** The running total if it is. */
  spentAfter: number;
  /** Why not, for the heartbeat rather than the customer. */
  reason?: string;
}

/**
 * May the sweep commit this order, given what it has already committed?
 *
 * A ceiling of zero or less means "no ceiling", matching how
 * `normaliseSettings` treats an unset figure — it substitutes the default
 * rather than zero, so a zero reaching here is a caller that meant "unlimited"
 * and must not be read as "spend nothing".
 *
 * An order that would breach the ceiling on its own is REFUSED rather than
 * allowed through as a special case. The alternative — letting the first order
 * exceed the limit because nothing has been spent yet — is how a $5,000 order
 * passes a $2,000 ceiling. It is deferred to a person instead, which is the
 * right answer for a single purchase larger than the whole tick's budget.
 */
export function maySpend(
  spentSoFar: number,
  orderDollars: number,
  ceiling: number,
): SpendDecision {
  const spent = money(spentSoFar);
  const order = money(orderDollars);
  const cap = money(ceiling);

  if (cap <= 0) return { allowed: true, spentAfter: spent + order };

  if (order > cap) {
    return {
      allowed: false,
      spentAfter: spent,
      reason: `this order alone commits $${order.toFixed(2)}, which is more than the whole tick's ceiling of $${cap.toFixed(2)} — it needs a person`,
    };
  }

  if (spent + order > cap) {
    return {
      allowed: false,
      spentAfter: spent,
      reason: `$${spent.toFixed(2)} already committed this tick; another $${order.toFixed(2)} would pass the $${cap.toFixed(2)} ceiling`,
    };
  }

  return { allowed: true, spentAfter: Math.round((spent + order) * 100) / 100 };
}
