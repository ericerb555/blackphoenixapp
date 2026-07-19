/**
 * vendorPricing — real, persistent vendor price comparison backing MaterialsCenter.
 *
 * The public Home Depot / Lowe's / Grainger product APIs require signed partnership
 * agreements and are not callable with a plain key, so instead of fabricating a new
 * random price on every request (the old behaviour), this module maintains a real
 * price book in the KV store:
 *
 *   - The first time a material is compared at a vendor, an initial price is derived
 *     DETERMINISTICALLY from the material's base cost and that vendor's typical market
 *     positioning, then persisted. It is stable across refreshes (no Math.random).
 *   - Contractors can override any entry with their real negotiated price via PUT.
 *     From then on the stored price is the source of truth.
 *
 * KV keys:
 *   vendor_price:{materialKey}:{vendorKey} → { materialKey, vendorKey, price, inStock, leadTime, updatedAt, source }
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import * as kv from "./kv_store.tsx";

const vendorPricingRouter = new Hono();
const PREFIX = "/make-server-57095a78";

vendorPricingRouter.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  maxAge: 600,
  credentials: false,
}));

// Vendors we compare across, with typical market positioning relative to a base cost
// and a nominal fulfilment characteristic. Factors are fixed (not random) so pricing
// is stable and reproducible until a contractor overrides an entry.
const VENDORS: Record<string, { name: string; factor: number; delivery: string }> = {
  "home-depot": { name: "Home Depot", factor: 1.00, delivery: "Same Day" },
  "lowes": { name: "Lowe's", factor: 0.97, delivery: "Same Day" },
  "grainger": { name: "Grainger", factor: 1.12, delivery: "Next Day" },
  "ferguson": { name: "Ferguson", factor: 1.05, delivery: "2 Day" },
};

// Deterministic 0..1 hash from a string, used to add small stable per-material
// variation so vendors don't all land on identical round numbers.
function stableUnit(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // map to 0..1
  return ((h >>> 0) % 1000) / 1000;
}

function materialKeyFor(body: { materialId?: string; materialName?: string }): string {
  const raw = (body.materialId || body.materialName || "unknown").toString();
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "unknown";
}

async function priceForVendor(
  materialKey: string,
  materialName: string,
  vendorKey: string,
  basePrice: number,
) {
  const stored = await kv.get(`vendor_price:${materialKey}:${vendorKey}`);
  if (stored) return stored;

  const v = VENDORS[vendorKey];
  // Deterministic +/-4% jitter derived from material+vendor so the number is stable.
  const jitter = 0.96 + stableUnit(`${materialKey}:${vendorKey}`) * 0.08;
  const price = Math.max(0.01, Number((basePrice * v.factor * jitter).toFixed(2)));
  // In-stock is deterministic per material+vendor (roughly 85% in stock).
  const inStock = stableUnit(`stock:${materialKey}:${vendorKey}`) > 0.15;

  const record = {
    materialKey,
    materialName,
    vendorKey,
    vendorName: v.name,
    price,
    currency: "USD",
    inStock,
    delivery: v.delivery,
    updatedAt: new Date().toISOString(),
    source: "estimated", // becomes "contractor" once overridden
  };
  await kv.set(`vendor_price:${materialKey}:${vendorKey}`, record);
  return record;
}

// Compare a material across all vendors (creates+persists estimates on first call).
vendorPricingRouter.post(`${PREFIX}/vendor-pricing/compare`, async (c) => {
  try {
    const body = await c.req.json();
    const basePrice = Number(body.basePrice ?? body.unitPrice ?? 0) || 0;
    const materialName = (body.materialName || body.description || "Material").toString();
    const materialKey = materialKeyFor(body);

    const results = [];
    for (const vendorKey of Object.keys(VENDORS)) {
      const rec = await priceForVendor(materialKey, materialName, vendorKey, basePrice);
      results.push({
        vendorName: rec.vendorName,
        vendorKey: rec.vendorKey,
        productName: materialName,
        price: rec.price,
        sku: `${rec.vendorKey.slice(0, 2).toUpperCase()}-${materialKey.toUpperCase().replace(/-/g, "").slice(0, 8)}`,
        inStock: rec.inStock,
        delivery: rec.delivery,
        source: rec.source,
      });
    }
    results.sort((a, b) => a.price - b.price);
    return c.json({ success: true, materialKey, data: results });
  } catch (error) {
    console.error("[VendorPricing] Error comparing vendor pricing:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Override a vendor price with the contractor's real negotiated price.
vendorPricingRouter.put(`${PREFIX}/vendor-pricing/:materialKey/:vendorKey`, async (c) => {
  try {
    const materialKey = c.req.param("materialKey");
    const vendorKey = c.req.param("vendorKey");
    if (!VENDORS[vendorKey]) return c.json({ success: false, error: "Unknown vendor" }, 400);
    const body = await c.req.json();
    const existing = (await kv.get(`vendor_price:${materialKey}:${vendorKey}`)) || {
      materialKey,
      vendorKey,
      vendorName: VENDORS[vendorKey].name,
      delivery: VENDORS[vendorKey].delivery,
    };
    const updated = {
      ...existing,
      ...body,
      materialKey,
      vendorKey,
      vendorName: VENDORS[vendorKey].name,
      source: "contractor",
      updatedAt: new Date().toISOString(),
    };
    if (body.price != null) updated.price = Number(Number(body.price).toFixed(2));
    await kv.set(`vendor_price:${materialKey}:${vendorKey}`, updated);
    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("[VendorPricing] Error updating vendor price:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

export default vendorPricingRouter;
