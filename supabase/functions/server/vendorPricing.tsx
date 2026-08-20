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
const PREFIX = "/make-server-3eae23a6";

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

// `stableUnit()` lived here — a hash used to give each fabricated vendor price a
// small "stable per-material variation so vendors don't all land on identical
// round numbers". It is deleted rather than left unused: it was the primitive
// that made invented prices look plausible, and a plausible invented price on a
// customer's quote is the whole problem. Prices now come from vendor catalogues
// or from a contractor typing one.

function materialKeyFor(body: { materialId?: string; materialName?: string }): string {
  const raw = (body.materialId || body.materialName || "unknown").toString();
  return raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "unknown";
}

/**
 * Compare a material across vendors — from real prices only.
 *
 * WHAT THIS USED TO DO
 *
 * `priceForVendor()` manufactured a price for every vendor:
 * `basePrice × vendor.factor × (0.96 + jitter)`, with in-stock decided by a hash
 * and a SKU assembled from the material key. Worse, it **persisted** each
 * invention to `vendor_price:` storage, where it then sat next to genuine
 * contractor-entered prices, distinguishable only by a `source` field nothing
 * downstream checked.
 *
 * Materials Center presented those rows as alternatives with a savings figure.
 * Selecting one wrote the invented price and the invented SKU onto a quote line,
 * and creating purchase orders sent that line to a real supplier. A hash of the
 * material name became a customer's quote and then somebody's order.
 *
 * WHAT IT DOES NOW
 *
 * Two real sources, and nothing else:
 *   • `vendor_catalog:` — lines a vendor actually published;
 *   • `vendor_price:` records with source "contractor" — prices somebody typed.
 *
 * Estimates are neither generated nor stored. No match is reported as no match,
 * which is the honest answer and the one that keeps a fabricated figure off a
 * customer's quote.
 */
vendorPricingRouter.post(`${PREFIX}/vendor-pricing/compare`, async (c) => {
  try {
    const body = await c.req.json();
    const materialName = (body.materialName || body.description || "").toString().trim();
    const materialKey = materialKeyFor(body);
    const needle = materialName.toLowerCase();

    const results: any[] = [];

    // 1. Published vendor catalogue lines matching the material.
    if (needle.length >= 2) {
      const items = ((await kv.getByPrefix("vendor_catalog:")) as any[] || []).filter(Boolean);
      const vendors = ((await kv.getByPrefix("vendor:")) as any[] || []).filter(Boolean);
      const nameOf = new Map(vendors.map((v: any) => [String(v.id), String(v.name || "")]));
      for (const i of items) {
        if (i?.isActive === false) continue;
        const hay = `${i?.name || ""} ${i?.sku || ""} ${i?.category || ""}`.toLowerCase();
        if (!hay.includes(needle)) continue;
        results.push({
          vendorName: nameOf.get(String(i.vendorId)) || String(i.vendorId || ""),
          vendorKey: String(i.vendorId || ""),
          productName: String(i.name || materialName),
          price: Number(i.price || 0),
          sku: String(i.sku || ""), // the vendor's own, or blank — never generated
          inStock: i.availability ? !/out of stock/i.test(String(i.availability)) : null,
          delivery: String(i.availability || ""),
          source: "catalog",
        });
      }
    }

    // 2. Prices a contractor entered by hand for this material.
    const overrides = ((await kv.getByPrefix(`vendor_price:${materialKey}:`)) as any[] || []).filter(Boolean);
    for (const rec of overrides) {
      if (String(rec?.source || "") !== "contractor") continue; // stored estimates are not evidence
      results.push({
        vendorName: rec.vendorName,
        vendorKey: rec.vendorKey,
        productName: rec.materialName || materialName,
        price: Number(rec.price || 0),
        sku: String(rec.sku || ""),
        inStock: rec.inStock ?? null,
        delivery: rec.delivery || "",
        source: "contractor",
      });
    }

    results.sort((a, b) => a.price - b.price);
    return c.json({
      success: true,
      materialKey,
      data: results,
      reason: results.length ? "" : "No vendor has published a price for this material, and none has been entered by hand.",
    });
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
