/**
 * useStoreConfig — loads the storefront's live merchandising configuration from
 * the same backend the admin panels write to, so the boosters and promotions the
 * owner configures in the Content Center actually take effect for shoppers.
 *
 *   GET /store-boosters      → free shipping, urgency, cart upsell, scarcity, free gift
 *   GET /promotions-engine   → scheduled discounts + volume/tiered pricing
 *
 * Both are public reads (anon key). Everything degrades gracefully: if the
 * server is unreachable the hook returns sensible disabled defaults so the
 * storefront still renders.
 */
import { useEffect, useState } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

export interface BoostersConfig {
  freeShipping: { enabled: boolean; threshold: number; message: string; unlockedMessage: string };
  urgency: { enabled: boolean; minutes: number; message: string };
  cartUpsell: { enabled: boolean; heading: string; maxItems: number };
  stockScarcity: { enabled: boolean; threshold: number; message: string };
  freeGift: { enabled: boolean; threshold: number; productName: string; message: string };
}

export interface ScheduledDiscount {
  id: string;
  name: string;
  scope: 'all' | 'category';
  category?: string;
  discountType: 'percent' | 'fixed';
  value: number;
  startsAt?: string;
  endsAt?: string;
  active: boolean;
}

export interface VolumeTier { minQty: number; discountPercent: number; }

export interface PromotionsConfig {
  scheduledDiscounts: ScheduledDiscount[];
  volumePricing: { enabled: boolean; tiers: VolumeTier[] };
}

const DEFAULT_BOOSTERS: BoostersConfig = {
  freeShipping: { enabled: false, threshold: 0, message: '', unlockedMessage: '' },
  urgency: { enabled: false, minutes: 15, message: '' },
  cartUpsell: { enabled: false, heading: 'Frequently bought together', maxItems: 4 },
  stockScarcity: { enabled: false, threshold: 0, message: '' },
  freeGift: { enabled: false, threshold: 0, productName: '', message: '' },
};

const DEFAULT_PROMOTIONS: PromotionsConfig = {
  scheduledDiscounts: [],
  volumePricing: { enabled: false, tiers: [] },
};

export function useStoreConfig() {
  const [boosters, setBoosters] = useState<BoostersConfig>(DEFAULT_BOOSTERS);
  const [promotions, setPromotions] = useState<PromotionsConfig>(DEFAULT_PROMOTIONS);
  const [activeDiscounts, setActiveDiscounts] = useState<ScheduledDiscount[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${publicAnonKey}` };
    (async () => {
      try {
        const [bRes, pRes] = await Promise.all([
          fetch(`${SERVER}/store-boosters`, { headers }),
          fetch(`${SERVER}/promotions-engine`, { headers }),
        ]);
        if (bRes.ok) {
          const b = await bRes.json();
          if (b?.config) setBoosters({ ...DEFAULT_BOOSTERS, ...b.config });
        }
        if (pRes.ok) {
          const p = await pRes.json();
          if (p?.config) setPromotions({ ...DEFAULT_PROMOTIONS, ...p.config });
          if (Array.isArray(p?.activeDiscounts)) setActiveDiscounts(p.activeDiscounts);
        }
      } catch (err) {
        console.log(`useStoreConfig: failed to load storefront config, using defaults: ${err}`);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  return { boosters, promotions, activeDiscounts, loaded };
}

// ─── Pricing helpers ──────────────────────────────────────────────────────────

/**
 * Apply the best currently-active scheduled discount to a product's unit price.
 * Returns the effective price (cents), the price before discount, and the name
 * of the promotion that won (for a badge). Prices never go below 0.
 */
export function effectiveUnitPrice(
  product: { price: number; category?: string },
  activeDiscounts: ScheduledDiscount[],
): { price: number; original: number; promoName?: string } {
  let best = product.price;
  let promoName: string | undefined;
  for (const d of activeDiscounts) {
    if (d.scope === 'category' && d.category && d.category !== product.category) continue;
    const discounted = d.discountType === 'percent'
      ? Math.round(product.price * (1 - d.value / 100))
      : product.price - Math.round(d.value * 100); // fixed value stored in dollars
    const clamped = Math.max(0, discounted);
    if (clamped < best) { best = clamped; promoName = d.name; }
  }
  return { price: best, original: product.price, promoName };
}

/** Highest-qualifying volume-pricing discount percent for a given quantity. */
export function volumeDiscountPercent(qty: number, promotions: PromotionsConfig): number {
  if (!promotions.volumePricing?.enabled) return 0;
  let pct = 0;
  for (const tier of promotions.volumePricing.tiers || []) {
    if (qty >= tier.minQty && tier.discountPercent > pct) pct = tier.discountPercent;
  }
  return pct;
}

/** Effective line total (cents) for a cart line, combining scheduled + volume discounts. */
export function lineTotal(
  product: { price: number; category?: string },
  qty: number,
  activeDiscounts: ScheduledDiscount[],
  promotions: PromotionsConfig,
): number {
  const { price } = effectiveUnitPrice(product, activeDiscounts);
  const vPct = volumeDiscountPercent(qty, promotions);
  const unit = Math.round(price * (1 - vPct / 100));
  return unit * qty;
}
