/**
 * Hot Products Radar — trend research → supplier matching → scoring → export.
 *
 * A modular product-discovery engine that scans connected suppliers for
 * fast-rising products, scores them with a transparent 5-factor composite,
 * matches every product to real supplier/source options, filters out
 * oversaturated / low-margin items, and exports a clean ranked list (JSON/CSV)
 * ready to plug into the store's import flow.
 *
 * Pipeline modules:
 *   trend research  → this file (Zendrop + CJ scans)
 *   scoring         → ./product-scoring.tsx
 *   exporter        → ./product-exporter.tsx
 *   supplier match  → SOURCING_CHANNELS + buildSourcingMap (below)
 *
 * Routes:
 *   GET  /hot-products/discover      (admin) scan + score + filter + cache
 *   POST /hot-products/import        (admin) import selected ids / top N
 *   GET  /hot-products               (public) cached ranked list (filterable)
 *   GET  /hot-products/export        (admin) download JSON or CSV
 *   POST /hot-products/daily-top10   (admin) generate + auto-save daily top 10
 *   GET  /hot-products/daily-top10   (admin) read a saved daily list
 *   POST /hot-products/source-analysis   (admin) AI "where to source it"
 *   POST /hot-products/search-everywhere (admin) AI universal product research
 */
import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import OpenAI from "npm:openai@4";
import * as kv from "./kv_store.tsx";
import { zendropFetch, extractProducts, normalize, loadServerConfig, resolveKey, num } from "./zendrop.tsx";
import {
  resolveKey as cjResolveKey,
  scanCatalog as cjScanCatalog,
  importCandidates as cjImportCandidates,
  type CjCandidate,
} from "./cjdropshipping.tsx";
import { isAdultProduct } from "./content-filter.tsx";
import {
  scoreProduct,
  applyFilters,
  parseFilterQuery,
  type ProductFilters,
} from "./product-scoring.tsx";
import { toExportRows, toCSV } from "./product-exporter.tsx";

const hotProductsRouter = new Hono();

const CACHE_KEY = "hot_products:latest";
const DAILY_PREFIX = "hot_products:daily:"; // + YYYY-MM-DD
const NEW_WINDOW_DAYS = 14;

// ── Universal sourcing engine (supplier matching) ──────────────────────────
type ChannelType =
  | "dropshipping" | "marketplace" | "wholesale" | "retail"
  | "industrial" | "print-on-demand" | "digital" | "handmade" | "meta-search";

interface SourcingChannel {
  key: string;
  label: string;
  type: ChannelType;
  envKey?: string; // if the env var is present the channel is "connected"
  search: (q: string) => string;
}

const SOURCING_CHANNELS: SourcingChannel[] = [
  { key: "zendrop", label: "Zendrop", type: "dropshipping", envKey: "ZENDROP_API_KEY", search: (q) => `https://app.zendrop.com/product-sourcing?search=${q}` },
  { key: "cj", label: "CJdropshipping", type: "dropshipping", envKey: "CJ_API_KEY", search: (q) => `https://cjdropshipping.com/list/search?searchText=${q}` },
  { key: "spocket", label: "Spocket", type: "dropshipping", search: (q) => `https://app.spocket.co/search?query=${q}` },
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

function isNewByCreatedAt(raw: any): boolean {
  const createdAt = raw?.created_at || raw?.createdAt || raw?.published_at;
  if (!createdAt) return false;
  return (Date.now() - new Date(createdAt).getTime()) / 86400000 <= NEW_WINDOW_DAYS;
}

// A single unified candidate emitted by the scan+score step.
interface RankedProduct {
  id: string;
  sku: string;
  name: string;
  image: string;
  category: string;
  cost: number;
  retail: number;
  profit: number;
  marginPct: number;
  finalScore: number;
  trendingScore: number; // alias of finalScore for legacy UI
  breakdown: Record<string, number>;
  shippingDays: number;
  competitionRisk: "low" | "medium" | "high";
  estGrowthPct: number;
  isTrending: boolean;
  isNew: boolean;
  source: string;
  sourceLabel: string;
  providerProductId: string;
  importable: boolean;
  primarySourceUrl: string;
  sourcing: ReturnType<typeof buildSourcingMap>;
  cjCandidate?: CjCandidate;
}

/** Build a fully scored RankedProduct from normalized fields + demand signals. */
function buildRanked(args: {
  id: string; sku: string; name: string; image: string; category: string;
  cost: number; source: string; sourceLabel: string; providerProductId: string;
  signals: any; isTrending: boolean; isNew: boolean; targetMarginPct: number;
  cjCandidate?: CjCandidate;
}): RankedProduct {
  const sourcing = buildSourcingMap(args.name);
  const connectedSourceCount = sourcing.filter((s) => s.availability === "connected").length;
  const scored = scoreProduct({
    cost: args.cost,
    targetMarginPct: args.targetMarginPct,
    signals: args.signals,
    source: args.source,
    availableSourceCount: sourcing.length,
    connectedSourceCount,
  });
  const primary = sourcing.find((s) => s.label.toLowerCase().includes(args.source.toLowerCase()));
  return {
    id: args.id, sku: args.sku, name: args.name, image: args.image, category: args.category,
    cost: args.cost, retail: scored.retail, profit: scored.profit, marginPct: scored.marginPct,
    finalScore: scored.finalScore, trendingScore: scored.finalScore, breakdown: scored.breakdown,
    shippingDays: scored.shippingDays, competitionRisk: scored.competitionRisk, estGrowthPct: scored.estGrowthPct,
    isTrending: args.isTrending, isNew: args.isNew,
    source: args.source, sourceLabel: args.sourceLabel, providerProductId: args.providerProductId,
    importable: true, primarySourceUrl: primary?.url || sourcing[0]?.url || "", sourcing,
    cjCandidate: args.cjCandidate,
  };
}

// ── Scan step: gather + score candidates from every connected supplier ──────
async function scanAllSuppliers(opts: {
  zendropKey: string | null;
  cjKey: string | null;
  scanLimit: number;
  keyword: string;
  targetMarginPct: number;
}): Promise<{ ranked: RankedProduct[]; errors: string[]; trendingCount: number }> {
  const ranked: RankedProduct[] = [];
  const errors: string[] = [];
  let trendingCount = 0;

  // ── Zendrop ───────────────────────────────────────────────────────────────
  if (opts.zendropKey) {
    try {
      const trendingRes = await zendropFetch(opts.zendropKey, "get_catalog_trending_products", { filters: {} });
      const trendingRaw = trendingRes.ok ? extractProducts(trendingRes.data) : [];
      const trendingIds = new Set(trendingRaw.map((r: any) => String(r?.id)));
      trendingCount = trendingRaw.length;

      const catalogRaw: any[] = [];
      for (let page = 1; catalogRaw.length < opts.scanLimit && page <= 20; page++) {
        const res = await zendropFetch(opts.zendropKey, "get_catalog_products", { limit: 50, page });
        if (!res.ok) break;
        const pageProducts = extractProducts(res.data);
        if (pageProducts.length === 0) break;
        catalogRaw.push(...pageProducts);
      }
      if (!trendingRes.ok && catalogRaw.length === 0) errors.push(`Zendrop scan failed: ${trendingRes.error || "no products"}`);

      const merged = new Map<string, any>();
      for (const r of [...trendingRaw, ...catalogRaw]) {
        const id = String(r?.id ?? "");
        if (id && !merged.has(id) && !isAdultProduct(r)) merged.set(id, r);
      }
      for (const raw of merged.values()) {
        const id = String(raw.id);
        const isTrending = trendingIds.has(id);
        const createdAt = raw.created_at || raw.createdAt || raw.published_at;
        const ageDays = createdAt ? Math.max(0, (Date.now() - new Date(createdAt).getTime()) / 86400000) : 999;
        const signals = {
          rating: num(raw.rating ?? raw.average_rating), reviews: num(raw.review_count ?? raw.reviews ?? raw.ratings_count),
          sales: num(raw.sales ?? raw.orders ?? raw.sold_count ?? raw.order_count),
          price: num(raw.price ?? raw.cost ?? raw.wholesale_price), ageDays, isTrending,
        };
        const images: string[] = [];
        if (Array.isArray(raw.images)) for (const im of raw.images) images.push(typeof im === "string" ? im : (im?.url || im?.src || ""));
        if (raw.image) images.push(typeof raw.image === "string" ? raw.image : (raw.image?.url || ""));
        ranked.push(buildRanked({
          id: `zendrop_${id}`, sku: String(raw.sku ?? `ZD-${id}`), name: String(raw.name ?? raw.title ?? "Untitled Product"),
          image: images.filter(Boolean)[0] || "", category: String(raw.category ?? raw.product_type ?? "General"),
          cost: num(raw.cost ?? raw.price ?? raw.wholesale_price), source: "zendrop", sourceLabel: "Zendrop",
          providerProductId: id, signals, isTrending, isNew: isNewByCreatedAt(raw), targetMarginPct: opts.targetMarginPct,
        }));
      }
    } catch (e) {
      errors.push(`Zendrop scan error: ${e}`);
    }
  }

  // ── CJ Dropshipping ─────────────────────────────────────────────────────────
  if (opts.cjKey) {
    try {
      const pageSize = 50;
      const pages = Math.max(1, Math.ceil(opts.scanLimit / pageSize));
      const seen = new Set<string>();
      for (let page = 1; page <= Math.min(pages, 10) && ranked.filter((r) => r.source === "cjdropshipping").length < opts.scanLimit; page++) {
        const batch = await cjScanCatalog(opts.cjKey, { pageNum: page, pageSize, keyword: opts.keyword });
        if (batch.length === 0) break;
        for (const cand of batch) {
          if (seen.has(cand.sku)) continue;
          seen.add(cand.sku);
          if (isAdultProduct({ name: cand.name, description: cand.description, category: cand.category })) continue;
          const ageDays = cand.createdAt ? Math.max(0, (Date.now() - new Date(cand.createdAt).getTime()) / 86400000) : 999;
          const signals = { rating: cand.rating, reviews: 0, sales: 0, price: cand.cost, ageDays, isTrending: false };
          ranked.push(buildRanked({
            id: `cj_${cand.sku}`, sku: cand.sku, name: cand.name, image: cand.images[0] || "",
            category: cand.category, cost: cand.cost, source: "cjdropshipping", sourceLabel: "CJdropshipping",
            providerProductId: cand.pid, signals, isTrending: false,
            isNew: cand.createdAt ? isNewByCreatedAt({ created_at: cand.createdAt }) : false,
            targetMarginPct: opts.targetMarginPct, cjCandidate: cand,
          }));
        }
      }
    } catch (e) {
      errors.push(`CJ scan error: ${e}`);
    }
  }

  ranked.sort((a, b) => b.finalScore - a.finalScore);
  return { ranked, errors, trendingCount };
}

// ── GET /hot-products/discover — scan, score, filter, cache ─────────────────
hotProductsRouter.get("/make-server-3eae23a6/hot-products/discover", async (c) => {
  try {
    const admin = await requireAdmin(c);
    if (!admin.ok) return c.json({ success: false, error: admin.error }, admin.status);

    const zendropKey = resolveKey(c.req.query("apiKey") || undefined);
    const cjKey = cjResolveKey(c.req.query("cjApiKey") || undefined);
    if (!zendropKey && !cjKey) {
      return c.json({ success: false, error: "No supplier connected. Add a Zendrop or CJ API key first." }, 400);
    }

    const scanLimit = Math.min(300, Math.max(20, Number(c.req.query("scan")) || 150));
    const keyword = String(c.req.query("keyword") || "").trim();
    const filters: ProductFilters = parseFilterQuery((k) => c.req.query(k) ?? undefined);
    const targetMarginPct = filters.minMarginPct != null ? filters.minMarginPct : 60;

    const { ranked, errors, trendingCount } = await scanAllSuppliers({ zendropKey, cjKey, scanLimit, keyword, targetMarginPct });
    if (ranked.length === 0) {
      return c.json({ success: false, error: `No products found. ${errors.join(" ") || ""}`.trim() }, 502);
    }

    const filtered = applyFilters(ranked, filters);
    const cache = {
      scannedAt: new Date().toISOString(),
      count: filtered.length,
      totalScanned: ranked.length,
      filters,
      products: filtered,
    };
    await kv.set(CACHE_KEY, cache);

    return c.json({ success: true, ...cache, trendingCount, errors });
  } catch (err) {
    console.log(`Error discovering hot products: ${err}`);
    return c.json({ success: false, error: `Failed to discover hot products: ${err}` }, 500);
  }
});

// ── POST /hot-products/import — import winners into the store (multi-source) ─
hotProductsRouter.post("/make-server-3eae23a6/hot-products/import", async (c) => {
  try {
    const admin = await requireAdmin(c);
    if (!admin.ok) return c.json({ success: false, error: admin.error }, admin.status);

    const body = await c.req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids) ? body.ids.map(String) : [];
    const topN = Number(body?.top) || 0;

    const cache = (await kv.get(CACHE_KEY)) as any;
    if (!cache?.products?.length) return c.json({ success: false, error: "No scan cached. Run Discover first." }, 400);

    let chosen: any[] = [];
    if (ids.length) chosen = cache.products.filter((p: any) => ids.includes(String(p.id)));
    else if (topN > 0) chosen = cache.products.slice(0, topN);
    else return c.json({ success: false, error: "Provide ids[] or top N to import." }, 400);
    if (chosen.length === 0) return c.json({ success: false, error: "No matching products to import." }, 400);

    const nowIso = new Date().toISOString();
    let imported = 0;
    const errors: string[] = [];

    // ── CJ candidates: persist via the CJ importer ────────────────────────────
    const cjChosen = chosen.filter((p) => p.source === "cjdropshipping" && p.cjCandidate);
    if (cjChosen.length) {
      const cjKey = cjResolveKey(body?.cjApiKey);
      if (!cjKey) errors.push("Skipped CJ products: no CJ_API_KEY configured.");
      else {
        try {
          const cands: CjCandidate[] = cjChosen.map((p) => p.cjCandidate);
          const featuredSkus = new Set<string>();
          const extraBySku: Record<string, Record<string, unknown>> = {};
          for (const p of cjChosen) {
            extraBySku[p.sku] = {
              isNew: p.isNew, trendingScore: p.finalScore, hotAddedAt: nowIso,
              badge: p.isTrending ? "🔥 HOT" : p.isNew ? "NEW" : undefined,
            };
            if (p.isTrending) featuredSkus.add(p.sku);
          }
          const res = await cjImportCandidates(cjKey, cands, { featuredSkus, extraBySku });
          imported += res.imported;
          if (res.blocked) errors.push(`${res.blocked} CJ product(s) filtered by content screening.`);
        } catch (e) {
          errors.push(`CJ import failed: ${e}`);
        }
      }
    }

    // ── Zendrop candidates: re-pull detail then write store records ────────────
    const zdChosen = chosen.filter((p) => p.source === "zendrop");
    if (zdChosen.length) {
      const apiKey = resolveKey(body?.apiKey);
      if (!apiKey) errors.push("Skipped Zendrop products: no Zendrop API key configured.");
      else {
        const { markupType, markupValue } = await loadServerConfig();
        const wantIds = new Set(zdChosen.map((p) => String(p.providerProductId)));
        const detailMap = new Map<string, any>();
        const trendingRes = await zendropFetch(apiKey, "get_catalog_trending_products", { filters: {} });
        for (const r of (trendingRes.ok ? extractProducts(trendingRes.data) : [])) detailMap.set(String(r?.id), r);
        for (let page = 1; page <= 20; page++) {
          if ([...wantIds].every((id) => detailMap.has(id))) break;
          const res = await zendropFetch(apiKey, "get_catalog_products", { limit: 50, page });
          if (!res.ok) break;
          const pageProducts = extractProducts(res.data);
          if (pageProducts.length === 0) break;
          for (const r of pageProducts) detailMap.set(String(r?.id), r);
        }
        const writes: Promise<void>[] = [];
        for (const cand of zdChosen) {
          const raw = detailMap.get(String(cand.providerProductId)) || cand;
          const p = normalize(raw, markupType, markupValue);
          if (!p.name) continue;
          if (isAdultProduct(raw) || isAdultProduct(p)) continue;
          const storeId = `zendrop_${p.sku}`;
          const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || storeId;
          writes.push(kv.set(`product_${storeId}`, {
            id: storeId, vendorId: "zendrop", vendorName: "Zendrop",
            name: p.name, description: p.description, category: p.category, price: p.price,
            compare_at_price: p.price ? +(p.price * 1.3).toFixed(2) : undefined,
            cost_price: p.cost, inventoryQuantity: p.stock, trackInventory: true,
            images: p.images, primaryImage: p.images[0] || cand.image || "",
            isActive: true, isFeatured: cand.isTrending, isNew: cand.isNew,
            trendingScore: cand.finalScore, hotAddedAt: nowIso,
            badge: cand.isTrending ? "🔥 HOT" : cand.isNew ? "NEW" : undefined,
            slug, sku: p.sku, rating: p.rating, viewCount: 0, orderCount: 0,
            source: "zendrop", providerProductId: p.providerProductId, createdAt: nowIso, updatedAt: nowIso,
          }));
          writes.push(kv.set(`dropshipper_inventory:${p.sku}`, JSON.stringify(p)));
          imported++;
        }
        await Promise.all(writes);
      }
    }

    return c.json({ success: true, imported, requested: chosen.length, errors });
  } catch (err) {
    console.log(`Error importing hot products: ${err}`);
    return c.json({ success: false, error: `Failed to import hot products: ${err}` }, 500);
  }
});

// ── GET /hot-products — public cached ranked list (filterable) ──────────────
hotProductsRouter.get("/make-server-3eae23a6/hot-products", async (c) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(c.req.query("limit")) || 20));
    const filters: ProductFilters = parseFilterQuery((k) => c.req.query(k) ?? undefined);
    const cache = (await kv.get(CACHE_KEY)) as any;
    const all = (cache?.products || []) as any[];
    const products = applyFilters(all, filters).slice(0, limit);
    return c.json({ success: true, scannedAt: cache?.scannedAt || null, products });
  } catch (err) {
    console.log(`Error reading hot products cache: ${err}`);
    return c.json({ success: false, error: `Failed to read hot products: ${err}`, products: [] }, 500);
  }
});

// ── GET /hot-products/export — download ranked list as JSON or CSV ──────────
hotProductsRouter.get("/make-server-3eae23a6/hot-products/export", async (c) => {
  try {
    const admin = await requireAdmin(c);
    if (!admin.ok) return c.json({ success: false, error: admin.error }, admin.status);

    const format = (c.req.query("format") || "json").toLowerCase();
    const limit = Math.min(500, Math.max(1, Number(c.req.query("limit")) || 100));
    const filters: ProductFilters = parseFilterQuery((k) => c.req.query(k) ?? undefined);
    const cache = (await kv.get(CACHE_KEY)) as any;
    if (!cache?.products?.length) return c.json({ success: false, error: "No scan cached. Run Discover first." }, 400);

    const products = applyFilters(cache.products as any[], filters).slice(0, limit);
    const rows = toExportRows(products);

    if (format === "csv") {
      return new Response(toCSV(rows), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="hot-products-${Date.now()}.csv"`,
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
    return c.json({ success: true, scannedAt: cache.scannedAt, count: rows.length, rows });
  } catch (err) {
    console.log(`Error exporting hot products: ${err}`);
    return c.json({ success: false, error: `Failed to export hot products: ${err}` }, 500);
  }
});

// ── POST /hot-products/daily-top10 — generate + auto-save the daily top 10 ──
// Scans fresh, ranks, keeps the top 10, and stores under a dated key so a cron
// / scheduler (or a manual click) builds a persistent daily leaderboard.
hotProductsRouter.post("/make-server-3eae23a6/hot-products/daily-top10", async (c) => {
  try {
    const admin = await requireAdmin(c);
    if (!admin.ok) return c.json({ success: false, error: admin.error }, admin.status);

    const body = await c.req.json().catch(() => ({}));
    const zendropKey = resolveKey(body?.apiKey);
    const cjKey = cjResolveKey(body?.cjApiKey);
    if (!zendropKey && !cjKey) return c.json({ success: false, error: "No supplier connected." }, 400);

    const filters: ProductFilters = body?.filters || {};
    const targetMarginPct = filters.minMarginPct != null ? filters.minMarginPct : 60;
    const { ranked, errors } = await scanAllSuppliers({
      zendropKey, cjKey, scanLimit: 200, keyword: String(body?.keyword || ""), targetMarginPct,
    });

    const top10 = applyFilters(ranked, filters).slice(0, 10);
    const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const record = { date, generatedAt: new Date().toISOString(), count: top10.length, products: top10, exportRows: toExportRows(top10) };
    await kv.set(`${DAILY_PREFIX}${date}`, record);
    await kv.set(`${DAILY_PREFIX}latest`, record);

    return c.json({ success: true, ...record, errors });
  } catch (err) {
    console.log(`Error generating daily top 10: ${err}`);
    return c.json({ success: false, error: `Failed to generate daily top 10: ${err}` }, 500);
  }
});

// ── GET /hot-products/daily-top10 — read a saved daily list (?date=YYYY-MM-DD)
hotProductsRouter.get("/make-server-3eae23a6/hot-products/daily-top10", async (c) => {
  try {
    const admin = await requireAdmin(c);
    if (!admin.ok) return c.json({ success: false, error: admin.error }, admin.status);
    const date = String(c.req.query("date") || "latest").trim();
    const record = (await kv.get(`${DAILY_PREFIX}${date}`)) as any;
    if (!record) return c.json({ success: false, error: `No daily list saved for "${date}".` }, 404);
    return c.json({ success: true, ...record });
  } catch (err) {
    console.log(`Error reading daily top 10: ${err}`);
    return c.json({ success: false, error: `Failed to read daily top 10: ${err}` }, 500);
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
    if (!openaiKey) return c.json({ success: true, name, analysis: null, sourcing, connectedChannels: connected });

    const openai = new OpenAI({ apiKey: openaiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are an elite product-sourcing analyst for an ecommerce brand. Given a product, determine the best way to source it and where. Respond ONLY with JSON." },
        { role: "user", content: `Analyze sourcing for this product.\nName: ${name}\nCategory: ${category || "unknown"}\nKnown cost: ${cost || "unknown"}\n\nReturn JSON with keys: productType (one of physical, digital, print-on-demand, wholesale, handmade, service), bestChannel (short phrase), recommendation (1-2 sentences), dropshippersLikely (array of supplier names likely to carry it, e.g. Zendrop, CJdropshipping, Spocket, AliExpress), retailLikely (array of retailers), estUnitCostRange (e.g. "$4-$9"), estRetailRange (e.g. "$19-$29"), marginNote (short), logisticsNote (short), risks (array of short strings).` },
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
        { role: "user", content: `${queryClause} ${typeClause}\n\nReturn JSON: { "products": [ { "name": string, "category": string, "productType": one of [physical, digital, print-on-demand, wholesale, handmade, service], "whyTrending": short sentence, "demandScore": number 0-100, "estUnitCost": string like "$4-$9", "estRetail": string like "$19-$29", "audience": short phrase, "bestChannel": short phrase, "dropshippersLikely": array of supplier names, "sourceHint": short phrase } ] }. Provide exactly ${count} products. Be specific and realistic.` },
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
