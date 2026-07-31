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
import OpenAI from "npm:openai@4";
import * as kv from "./kv_store.tsx";
import { zendropFetch, extractProducts, normalize, loadServerConfig, resolveKey, num } from "./zendrop.tsx";
import { isAdultProduct } from "./content-filter.tsx";

const hotProductsRouter = new Hono();

const CACHE_KEY = "hot_products:latest";
const NEW_WINDOW_DAYS = 14; // products imported within this window are flagged "new"

// ── Universal sourcing engine ─────────────────────────────────────────────
// For ANY product name we build a "where to get it" map: connected suppliers
// (those with real API keys in this environment) plus deep-links into every
// major sourcing channel across dropshipping, marketplace, wholesale, retail,
// industrial, print-on-demand, digital, and handmade.
type ChannelType =
  | "dropshipping" | "marketplace" | "wholesale" | "retail"
  | "industrial" | "print-on-demand" | "digital" | "handmade" | "meta-search";

interface SourcingChannel {
  key: string;
  label: string;
  type: ChannelType;
  envKey?: string; // if the env var is present the channel is "connected"
  search: (q: string) => string; // builds a deep-link search URL for the product
}

const SOURCING_CHANNELS: SourcingChannel[] = [
  { key: "zendrop", label: "Zendrop", type: "dropshipping", envKey: "ZENDROP_API_KEY", search: (q) => `https://app.zendrop.com/product-sourcing?search=${q}` },
  { key: "spocket", label: "Spocket", type: "dropshipping", search: (q) => `https://app.spocket.co/search?query=${q}` },
  { key: "cj", label: "CJdropshipping", type: "dropshipping", search: (q) => `https://cjdropshipping.com/list/search?searchText=${q}` },
  { key: "autods", label: "AutoDS", type: "dropshipping", search: (q) => `https://platform.autods.com/marketplace?search=${q}` },
  { key: "doba", label: "Doba", type: "dropshipping", search: (q) => `https://www.doba.com/search?keyword=${q}` },
  { key: "aliexpress", label: "AliExpress", type: "marketplace", search: (q) => `https://www.aliexpress.com/wholesale?SearchText=${q}` },
  { key: "alibaba", label: "Alibaba", type: "wholesale", search: (q) => `https://www.alibaba.com/trade/search?SearchText=${q}` },
  { key: "temu", label: "Temu", type: "marketplace", search: (q) => `https://www.temu.com/search_result.html?search_key=${q}` },
  { key: "amazon", label: "Amazon", type: "marketplace", search: (q) => `https://www.amazon.com/s?k=${q}` },
  { key: "walmart", label: "Walmart", type: "retail", search: (q) => `https://www.walmart.com/search?q=${q}` },
  { key: "home-depot", label: "The Home Depot", type: "retail", envKey: "HOME_DEPOT_API_KEY", search: (q) => `https://www.homedepot.com/s/${q}` },
  { key: "lowes", label: "Lowe's", type: "retail", envKey: "LOWES_API_KEY", search: (q) => `https://www.lowes.com/search?searchTerm=${q}` },
  { key: "grainger", label: "Grainger", type: "industrial", envKey: "GRAINGER_API_KEY", search: (q) => `https://www.grainger.com/search?searchQuery=${q}` },
  { key: "printful", label: "Printful", type: "print-on-demand", search: (q) => `https://www.printful.com/custom-products?search=${q}` },
  { key: "printify", label: "Printify", type: "print-on-demand", search: (q) => `https://printify.com/app/products?search=${q}` },
  { key: "etsy", label: "Etsy", type: "handmade", search: (q) => `https://www.etsy.com/search?q=${q}` },
  { key: "gumroad", label: "Gumroad", type: "digital", search: (q) => `https://gumroad.com/discover?query=${q}` },
  { key: "google-shopping", label: "Google Shopping", type: "meta-search", search: (q) => `https://www.google.com/search?tbm=shop&q=${q}` },
];

function buildSourcingMap(name: string) {
  const q = encodeURIComponent(String(name || "").trim().slice(0, 120));
  return SOURCING_CHANNELS.map((ch) => ({
    key: ch.key,
    label: ch.label,
    type: ch.type,
    availability: (ch.envKey && Deno.env.get(ch.envKey)) ? "connected" : "search",
    url: ch.search(q),
  }));
}

function connectedChannels(): string[] {
  return SOURCING_CHANNELS.filter((ch) => ch.envKey && Deno.env.get(ch.envKey)).map((ch) => ch.label);
}

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

    // Merge + dedupe by id, dropping any adult / sexual-wellness products.
    const mergedMap = new Map<string, any>();
    for (const r of [...trendingRaw, ...catalogRaw]) {
      const id = String(r?.id ?? "");
      if (id && !mergedMap.has(id) && !isAdultProduct(r)) mergedMap.set(id, r);
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
          productType: "physical",
          source: "zendrop",
          sourceLabel: "Zendrop",
          inNetwork: true,
          importable: true,
          sourcing: buildSourcingMap(String(raw.name ?? raw.title ?? "")),
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
      // Never import adult / sexual-wellness products into the store.
      if (isAdultProduct(raw) || isAdultProduct(p)) continue;
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

// ── POST /hot-products/source-analysis — AI "where to get it" intelligence ──
hotProductsRouter.post("/make-server-3eae23a6/hot-products/source-analysis", async (c) => {
  try {
    const admin = await requireAdmin(c);
    if (!admin.ok) return c.json({ success: false, error: admin.error }, admin.status);

    const body = await c.req.json().catch(() => ({}));
    const name = String(body?.name || "").trim();
    if (!name) return c.json({ success: false, error: "Provide a product name to analyze." }, 400);
    const category = String(body?.category || "");
    const cost = num(body?.cost, 0);

    const sourcing = buildSourcingMap(name);
    const connected = connectedChannels();

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      // Graceful fallback: sourcing links only, no AI narrative.
      return c.json({ success: true, name, analysis: null, sourcing, connectedChannels: connected });
    }

    const openai = new OpenAI({ apiKey: openaiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are an elite product-sourcing analyst for an ecommerce brand. Given a product, determine the best way to source it and where. Respond ONLY with JSON." },
        {
          role: "user",
          content: `Analyze sourcing for this product.\nName: ${name}\nCategory: ${category || "unknown"}\nKnown cost: ${cost || "unknown"}\n\nReturn JSON with keys: productType (one of physical, digital, print-on-demand, wholesale, handmade, service), bestChannel (short phrase), recommendation (1-2 sentences), dropshippersLikely (array of supplier names likely to carry it, e.g. Zendrop, CJdropshipping, Spocket, AliExpress), retailLikely (array of retailers), estUnitCostRange (e.g. "$4-$9"), estRetailRange (e.g. "$19-$29"), marginNote (short), logisticsNote (short), risks (array of short strings).`,
        },
      ],
    });
    let analysis: any = null;
    try { analysis = JSON.parse(completion.choices?.[0]?.message?.content || "{}"); } catch { analysis = null; }

    return c.json({ success: true, name, analysis, sourcing, connectedChannels: connected });
  } catch (err) {
    console.log(`Error analyzing product sourcing: ${err}`);
    return c.json({ success: false, error: `Failed to analyze sourcing: ${err}` }, 500);
  }
});

// ── POST /hot-products/search-everywhere — universal AI product research ────
hotProductsRouter.post("/make-server-3eae23a6/hot-products/search-everywhere", async (c) => {
  try {
    const admin = await requireAdmin(c);
    if (!admin.ok) return c.json({ success: false, error: admin.error }, admin.status);

    const body = await c.req.json().catch(() => ({}));
    const query = String(body?.query || "").trim();
    const type = String(body?.type || "all");
    const count = Math.min(20, Math.max(4, Number(body?.count) || 12));
    const connected = connectedChannels();

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return c.json({ success: false, error: "AI search requires an OpenAI API key." }, 400);

    const typeClause = type && type !== "all"
      ? `Focus only on products of type: ${type}.`
      : "Include a diverse mix of product types (physical, digital, print-on-demand, wholesale, handmade).";
    const queryClause = query
      ? `The user is researching: "${query}".`
      : "The user wants the hottest trending product opportunities across all categories right now.";

    const openai = new OpenAI({ apiKey: openaiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a world-class ecommerce product researcher who scouts trending, high-demand products across every channel on earth. Respond ONLY with JSON." },
        {
          role: "user",
          content: `${queryClause} ${typeClause}\n\nReturn JSON: { "products": [ { "name": string, "category": string, "productType": one of [physical, digital, print-on-demand, wholesale, handmade, service], "whyTrending": short sentence, "demandScore": number 0-100, "estUnitCost": string like "$4-$9", "estRetail": string like "$19-$29", "audience": short phrase, "bestChannel": short phrase, "dropshippersLikely": array of supplier names, "sourceHint": short phrase } ] }. Provide exactly ${count} products. Be specific and realistic.`,
        },
      ],
    });

    let parsed: any = {};
    try { parsed = JSON.parse(completion.choices?.[0]?.message?.content || "{}"); } catch { parsed = {}; }
    const rawProducts: any[] = Array.isArray(parsed?.products) ? parsed.products : [];

    const products = rawProducts.slice(0, count).map((p: any, i: number) => {
      const name = String(p.name || `Opportunity ${i + 1}`);
      return {
        id: `ai_${Date.now()}_${i}`,
        name,
        category: String(p.category || "General"),
        productType: String(p.productType || "physical"),
        whyTrending: String(p.whyTrending || ""),
        demandScore: Math.max(0, Math.min(100, Math.round(num(p.demandScore, 60)))),
        estUnitCost: String(p.estUnitCost || ""),
        estRetail: String(p.estRetail || p.estPrice || ""),
        audience: String(p.audience || ""),
        bestChannel: String(p.bestChannel || ""),
        dropshippersLikely: Array.isArray(p.dropshippersLikely) ? p.dropshippersLikely.map(String) : [],
        sourceHint: String(p.sourceHint || ""),
        sourcing: buildSourcingMap(name),
      };
    });

    return c.json({ success: true, query, type, count: products.length, products, connectedChannels: connected });
  } catch (err) {
    console.log(`Error in universal product search: ${err}`);
    return c.json({ success: false, error: `Universal search failed: ${err}` }, 500);
  }
});

export default hotProductsRouter;
