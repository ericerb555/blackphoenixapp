/**
 * A Stripe Price for a maintenance plan, minted once and reused.
 *
 * Eric: "use stripe price ids instead of raw dallor amounts. replace every raw
 * amount in checkout flow with a stripe price id."
 *
 * WHERE THAT IS RIGHT, AND THIS IS THE PLACE
 *
 * `maintenance-plans/:id/subscribe` opens a `mode: subscription` checkout with
 * an inline `price_data[recurring]` block — a brand new ad-hoc price on every
 * attempt. For a RECURRING charge that is the wrong shape:
 *
 *   · the amount Stripe will bill every month afterwards is defined by a price
 *     object nobody can find in the dashboard, named only inside a checkout
 *     session that has long since expired;
 *   · changing a plan's monthly figure silently changes what the NEXT checkout
 *     creates, with nothing recording that the two differ;
 *   · and reporting in Stripe cannot group by price, because every subscriber
 *     is on their own anonymous one.
 *
 * With a stored Price id, the plan's billing figure lives in Stripe as an
 * object with a history, the dashboard can group subscribers by it, and a
 * price change is a deliberate new Price rather than a quiet drift.
 *
 * WHY THE PRICE IS PER PLAN AND PER INTERVAL
 *
 * A maintenance plan here is bespoke — its own name, its own monthly total for
 * one customer. So "the catalogue" is one Price per plan, which is exactly
 * Stripe's own model for subscriptions. Monthly and annual are different
 * recurring intervals and therefore different Price objects; they are cached
 * under separate keys for that reason.
 *
 * AND WHY IT IS CACHED RATHER THAN CREATED EACH TIME
 *
 * Creating one per checkout attempt would litter the account with duplicates
 * and lose the grouping that is the point of doing this. The id is stored on
 * the plan and reused; it is only re-minted when the figure or the interval
 * actually changes, which is recorded alongside it so the staleness check does
 * not depend on reading Stripe back.
 */

export interface PlanPriceCache {
  /** The Stripe Price id in use. */
  id: string;
  /** The dollar figure it was created for, so a change can be detected. */
  amount: number;
  /** `month` or `year`. A different interval is a different Price. */
  interval: string;
  createdAt: string;
}

/** Where a plan keeps its Price ids, keyed by interval. */
export interface PlanPrices {
  month?: PlanPriceCache;
  year?: PlanPriceCache;
}

const cents = (n: unknown): number => Math.round((Number(n) || 0) * 100);

/**
 * Whether the cached Price still describes what we intend to charge.
 *
 * Compared in CENTS. Comparing dollars as floats is how 49.99 stops equalling
 * 49.99 and a new Price gets minted on every single checkout.
 */
export function priceIsCurrent(
  cached: PlanPriceCache | undefined | null,
  amount: number,
  interval: string,
): boolean {
  if (!cached?.id) return false;
  if (String(cached.interval) !== String(interval)) return false;
  return cents(cached.amount) === cents(amount);
}

/**
 * The Price id to put on the checkout, creating one only if needed.
 *
 * `createPrice` is injected so this is testable without Stripe — the decision
 * of WHETHER to create is the part worth pinning, and it is the part that goes
 * wrong.
 */
export async function ensurePlanPrice(
  plan: { id?: string; planName?: string; stripePrices?: PlanPrices },
  amount: number,
  interval: string,
  createPrice: (input: { amount: number; interval: string; productName: string }) => Promise<string>,
): Promise<{ priceId: string; prices: PlanPrices; created: boolean }> {
  const key = interval === 'year' ? 'year' : 'month';
  const existing = plan?.stripePrices?.[key];

  if (priceIsCurrent(existing, amount, interval)) {
    return { priceId: existing!.id, prices: plan.stripePrices || {}, created: false };
  }

  const productName = `${plan?.planName || 'Maintenance Plan'}${key === 'year' ? ' (annual)' : ''}`;
  const priceId = await createPrice({ amount, interval: key, productName });
  if (!priceId) throw new Error('Stripe did not return a price id.');

  return {
    priceId,
    prices: {
      ...(plan?.stripePrices || {}),
      [key]: {
        id: priceId,
        amount: Math.round((Number(amount) || 0) * 100) / 100,
        interval: key,
        createdAt: new Date().toISOString(),
      },
    },
    created: true,
  };
}
