/**
 * Hot Products Radar — Kalodata-style trending discovery + fast import.
 *
 * Finds the hottest / newest best-selling products from the connected
 * supplier (Zendrop), scores them by a composite "trending score", caches the
 * ranked list, and lets an admin one-click import the winners straight into
 * the live store (product_ prefix) so they show up ASAP.
 *
 * - GET  /hot-products/discover  (admin) scan + score + cache ranked list.
 * - POST /hot-products/import    (admin) import selected ids / top N to store.
 * - GET  /hot-products           (public) cached ranked list for storefront rail.
 */
import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import * as kv from "./kv_store.tsx";
import { zendropFetch, extractProducts, normalize, loadServerConfig, resolveKey, num } from "./zendrop.tsx";

const hotProductsRouter = new Hono();

const CACHE_KEY = "hot_products:latest";
const NEW_WINDOW_DAYS = 14; // products imported within this window are flagged "new"

async function requireAdmin(c: any) {
  const accessToken = c.req.header("Authorization")?.split(" ")[1];
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const { data: { user }, error } = await supabase.auth.getUser(accessToken ?? "");
  if (error || !user?.id) return { ok: false, error: `Authorization error: ${error?.message || "no user"}`, status: 401 };
  const perms = (await kv.get(`user_permissions:${user.id}`)) as any;
  const role = perms?.role || user.user_metadata?.role;
  if (role !== "admin" && role !== "owner" && role !== "super_admin") return { ok: false, error: "Administrator access is required.", status: 403 };
  return { ok: true };
}

/**
 * Composite trending score (0–100), Kalodata-inspired. We don't have live TikTok
 * sales telemetry, so we derive velocity from the signals Zendrop exposes:
 *  • trending membership (Zendrop's own best-seller feed) — strongest signal
 *  • rating & review depth — social proof / demand
 *  • sales / order counts if present in the payload
 *  • catalog recency (newer listings = fresher opportunity)
 *  • price sweet-spot (impulse-buy range converts fastest)
 */
function trendingScore(raw: any, isTrending: boolean): { score: number; signals: any } {
  const rating = num(raw.rating ?? raw.average_rating, 0);
  const reviews = num(raw.review_count ?? raw.reviews ?? raw.ratings_count, 0);
  const sales = num(raw.sales ?? raw.orders ?? raw.sold_count ?? raw.order_count, 0);
  const price = num(raw.price ?? raw.cost ?? raw.wholesale_price, 0);
  const createdAt = raw.created_at || raw.createdAt || raw.published_at;
  const ageDays = createdAt ? Math.max(0, (Date.now() - new Date(createdAt).getTime()) / 86400000) : 999;

  let score = 0;
  // Trending membership: the single strongest signal.
  if (isTrending) score += 40;
  // Social proof.
  score += Math.min(20, rating * 4); // up to 20 at 5★
  score += Math.min(15, Math.log10(reviews + 1) * 6); // diminishing returns
  // Sales velocity if provided.
  score += Math.min(15, Math.log10(sales + 1) * 5);
  // Freshness — newer catalog listings score higher (decays over ~60 days).
  score += Math.max(0, 10 * (1 - Math.min(ageDays, 60) / 60));
  // Price sweet spot ($8–$45 impulse range).
  if (price >= 8 && price <= 45) score += 10;
  else if (price > 45 && price <= 90) score += 5;

  const growthPct = Math.round((isTrending ? 120 : 20) + Math.min(200, Math.log10(sales + reviews + 1) * 60) + (rating * 8));

  return {
    score: Math.round(Math.min(100, score)),
    signals: {
      rating, reviews, sales, price,
      ageDays: Math.round(ageDays),
      isTrending,
      estGrowthPct: growthPct, // Kalodata-style "growth" indicator
    },
  };
}

function isNewByCreatedAt(raw: any): boolean {
  const createdAt = raw.created_at || raw.createdAt || raw.published_at;
  if (!createdAt) return false;
  return (Date.now() - new Date(createdAt).getTime()) / 86400000 <= NEW_WINDOW_DAYS;
}

// ── GET /hot-products/discover — scan, score, cache ───────────────────────
hotProductsRouter.get("/make-server-3eae23a6/hot-products/discover", async (c) => {
  try {
    const admin = await requireAdmin(c);
    if (!admin.ok) return c.json({ success: false, error: admin.error }, admin.status);

    const apiKey = resolveKey(c.req.query("apiKey") || undefined);
    if (!apiKey) return c.json({ success: false, error: "No Zendrop API key configured. Connect Zendrop first." }, 400);

    const scanLimit = Math.min(300, Math.max(20, Number(c.req.query("scan")) || 150));

    // Trending feed (best-sellers) + broad catalog pages for fresh candidates.
    const trendingRes = await zendropFetch(apiKey, "get_catalog_trending_products", { filters: {} });
    const trendingRaw = trendingRes.ok ? extractProducts(trendingRes.data) : [];
    const trendingIds = new Set(trendingRaw.map((r: any) => String(r?.id)));

    const catalogRaw: any[] = [];
    for (let page = 1; catalogRaw.length < scanLimit && page <= 20; page++) {
      const res = await zendropFetch(apiKey, "get_catalog_products", { limit: 50, page });
      if (!res.ok) break;
      const pageProducts = extractProducts(res.data);
      if (pageProducts.length === 0) break;
      catalogRaw.push(...pageProducts);
    }

    if (!trendingRes.ok && catalogRaw.length === 0) {
      return c.json({ success: false, error: `Zendrop scan failed: ${trendingRes.error || "no products returned"}` }, 502);
    }

    // Merge + dedupe by id.
    const mergedMap = new Map<string, any>();
    for (const r of [...trendingRaw, ...catalogRaw]) {
      const id = String(r?.id ?? "");
      if (id && !mergedMap.has(id)) mergedMap.set(id, r);
    }

    const ranked = [...mergedMap.values()]
      .map((raw) => {
        const id = String(raw.id);
        const isTrending = trendingIds.has(id);
        const { score, signals } = trendingScore(raw, isTrending);
        const images: string[] = [];
        if (Array.isArray(raw.images)) for (const im of raw.images) images.push(typeof im === "string" ? im : (im?.url || im?.src || ""));
        if (raw.image) images.push(typeof raw.image === "string" ? raw.image : (raw.image?.url || ""));
        return {
          id,
          sku: String(raw.sku ?? `ZD-${id}`),
          name: String(raw.name ?? raw.title ?? "Untitled Product"),
          image: images.filter(Boolean)[0] || "",
          category: String(raw.category ?? raw.product_type ?? "General"),
          cost: num(raw.cost ?? raw.price ?? raw.wholesale_price),
          trendingScore: score,
          isTrending,
          isNew: isNewByCreatedAt(raw),
          signals,
        };
      })
      .sort((a, b) => b.trendingScore - a.trendingScore);

    const cache = { scannedAt: new Date().toISOString(), count: ranked.length, products: ranked };
    await kv.set(CACHE_KEY, cache);

    return c.json({ success: true, ...cache, trendingCount: trendingRaw.length });
  } catch (err) {
    console.log(`Error discovering hot products: ${err}`);
    return c.json({ success: false, error: `Failed to discover hot products: ${err}` }, 500);
  }
});

// ── POST /hot-products/import — import winners into the store ──────────────
hotProductsRouter.post("/make-server-3eae23a6/hot-products/import", async (c) => {
  try {
    const admin = await requireAdmin(c);
    if (!admin.ok) return c.json({ success: false, error: admin.error }, admin.status);

    const body = await c.req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids) ? body.ids.map(String) : [];
    const topN = Number(body?.top) || 0;

    const apiKey = resolveKey(body?.apiKey);
    if (!apiKey) return c.json({ success: false, error: "No Zendrop API key configured." }, 400);

    const cache = (await kv.get(CACHE_KEY)) as any;
    if (!cache?.products?.length) return c.json({ success: false, error: "No scan cached. Run Discover first." }, 400);

    // Decide which cached candidates to import.
    let chosen: any[] = [];
    if (ids.length) chosen = cache.products.filter((p: any) => ids.includes(String(p.id)));
    else if (topN > 0) chosen = cache.products.slice(0, topN);
    else return c.json({ success: false, error: "Provide ids[] or top N to import." }, 400);

    if (chosen.length === 0) return c.json({ success: false, error: "No matching products to import." }, 400);

    const { markupType, markupValue } = await loadServerConfig();
    const chosenIds = new Set(chosen.map((p: any) => String(p.id)));

    // Re-pull full detail via a fresh catalog scan so descriptions/images are
    // complete, then match against the chosen ids.
    const detailMap = new Map<string, any>();
    const trendingRes = await zendropFetch(apiKey, "get_catalog_trending_products", { filters: {} });
    for (const r of (trendingRes.ok ? extractProducts(trendingRes.data) : [])) detailMap.set(String(r?.id), r);
    for (let page = 1; page <= 20 && detailMap.size < cache.products.length; page++) {
      const res = await zendropFetch(apiKey, "get_catalog_products", { limit: 50, page });
      if (!res.ok) break;
      const pageProducts = extractProducts(res.data);
      if (pageProducts.length === 0) break;
      for (const r of pageProducts) detailMap.set(String(r?.id), r);
      // Stop early once we have detail for everything we plan to import.
      if ([...chosenIds].every((id) => detailMap.has(id))) break;
    }

    const nowIso = new Date().toISOString();
    const writes: Promise<void>[] = [];
    let imported = 0;
    for (const cand of chosen) {
      const raw = detailMap.get(String(cand.id)) || cand;
      const p = normalize(raw, markupType, markupValue);
      if (!p.name) continue;
      const storeId = `zendrop_${p.sku}`;
      const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || storeId;
      const storeProduct = {
        id: storeId,
        vendorId: "zendrop",
        vendorName: "Zendrop",
        name: p.name,
        description: p.description,
        category: p.category,
        price: p.price,
        compare_at_price: p.price ? +(p.price * 1.3).toFixed(2) : undefined,
        cost_price: p.cost,
        inventoryQuantity: p.stock,
        trackInventory: true,
        images: p.images,
        primaryImage: p.images[0] || cand.image || "",
        isActive: true,
        isFeatured: cand.isTrending,
        isNew: cand.isNew,
        trendingScore: cand.trendingScore,
        hotAddedAt: nowIso,
        badge: cand.isTrending ? "🔥 HOT" : cand.isNew ? "NEW" : undefined,
        slug,
        sku: p.sku,
        rating: p.rating,
        viewCount: 0,
        orderCount: 0,
        source: "zendrop",
        providerProductId: p.providerProductId,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      writes.push(kv.set(`product_${storeId}`, storeProduct));
      writes.push(kv.set(`dropshipper_inventory:${p.sku}`, JSON.stringify(p)));
      imported++;
    }
    await Promise.all(writes);

    return c.json({ success: true, imported, requested: chosen.length });
  } catch (err) {
    console.log(`Error importing hot products: ${err}`);
    return c.json({ success: false, error: `Failed to import hot products: ${err}` }, 500);
  }
});

// ── GET /hot-products — public cached ranked list for storefront rail ─────
hotProductsRouter.get("/make-server-3eae23a6/hot-products", async (c) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(c.req.query("limit")) || 20));
    const cache = (await kv.get(CACHE_KEY)) as any;
    const products = (cache?.products || []).slice(0, limit);
    return c.json({ success: true, scannedAt: cache?.scannedAt || null, products });
  } catch (err) {
    console.log(`Error reading hot products cache: ${err}`);
    return c.json({ success: false, error: `Failed to read hot products: ${err}`, products: [] }, 500);
  }
});

export default hotProductsRouter;
