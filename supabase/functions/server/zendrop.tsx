/**
 * Zendrop Integration Module
 * Real Zendrop API connection: verify credentials, pull top products, and
 * import them into the SAME inventory the public store reads
 * (`dropshipper_inventory:` KV prefix, via the dropshipper module).
 *
 * Docs: https://developers.zendrop.com
 *
 * The browser cannot call Zendrop directly (CORS), so all Zendrop API calls
 * happen here, server-side, using the ZENDROP_API_KEY secret (or a key passed
 * in the request body as a fallback).
 */
import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";
import * as config from "./dropshipper-config.tsx";

const zendropRouter = new Hono();

const PREFIX = "/make-server-3eae23a6";
const PROVIDER_ID = "zendrop";
const INVENTORY_KEY_PREFIX = "dropshipper_inventory";
const CONFIG_KEY = "bp_zendrop_config"; // server-side mirror of settings

// Zendrop's developer API is an MCP-style JSON endpoint: a single POST URL that
// takes an { action, ...params } body and returns JSON. The old REST paths under
// api.zendrop.com/v1/products do NOT exist — that host serves the marketing site
// and returns HTML 200, which is why earlier syncs always imported 0 products.
// Docs: https://support.zendrop.com/en/articles/14461568-zendrop-mcp-developer-documentation
const MCP_ENDPOINT = "https://app.zendrop.com/mcp/v1";

interface NormalizedProduct {
  providerId: string;
  providerProductId: string;
  sku: string;
  name: string;
  description: string;
  price: number;   // your sell price (after markup)
  cost: number;    // wholesale cost from Zendrop
  stock: number;
  images: string[];
  category: string;
  rating: number;
  lastSynced: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function resolveKey(bodyKey?: string): string | null {
  const key = (bodyKey && bodyKey.trim()) || Deno.env.get("ZENDROP_API_KEY") || "";
  return key.trim() || null;
}

function num(v: any, fallback = 0): number {
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function applyMarkup(cost: number, markupType: string, markupValue: number): number {
  if (!cost) return 0;
  if (markupType === "fixed") return +(cost + markupValue).toFixed(2);
  return +(cost * (1 + markupValue / 100)).toFixed(2); // percent (default)
}

/**
 * Call the Zendrop MCP endpoint with an { action, ...params } body.
 * Returns { ok, status, data, url, error }. The response body is parsed as JSON;
 * a non-JSON body (e.g. an HTML error page) is surfaced as an error rather than
 * being silently treated as "no products".
 */
async function zendropFetch(
  apiKey: string,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; status: number; data: any; url: string; error?: string }> {
  const url = MCP_ENDPOINT;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ action, ...params }),
    });
    const text = await res.text().catch(() => "");
    let data: any = {};
    let parsed = true;
    try { data = text ? JSON.parse(text) : {}; } catch { parsed = false; }

    if (!res.ok) {
      const msg = (parsed && (data.error || data.message)) || text.slice(0, 300) || `HTTP ${res.status}`;
      return { ok: false, status: res.status, data: null, url, error: msg };
    }
    if (!parsed) {
      // A 200 with a non-JSON body means we did not reach the JSON API.
      return { ok: false, status: res.status, data: null, url, error: `Zendrop returned a non-JSON response (got ${text.slice(0, 80)}…). Confirm the API token is a Zendrop MCP access token.` };
    }
    return { ok: true, status: res.status, data, url };
  } catch (e) {
    return { ok: false, status: 0, data: null, url, error: String(e) };
  }
}

/**
 * Pull a product array out of whatever shape the Zendrop MCP response uses.
 * MCP servers commonly wrap the real payload in a JSON-RPC-style envelope
 * (`result`, or `content: [{ type: "text", text: "<json string>" }]`), so we
 * unwrap those before looking for the products array.
 */
function extractProducts(data: any): any[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === "string") {
    try { return extractProducts(JSON.parse(data)); } catch { return []; }
  }
  if (typeof data !== "object") return [];

  // MCP tool-call envelope: { content: [{ type: "text", text: "<json>" }] }
  if (Array.isArray(data.content)) {
    for (const part of data.content) {
      const txt = typeof part === "string" ? part : part?.text;
      if (txt) {
        const inner = extractProducts(txt);
        if (inner.length) return inner;
      }
    }
  }

  const candidate =
    data.products ||
    data.result?.products ||
    data.result?.data?.products ||
    data.data?.products ||
    data.result ||
    data.data ||
    data.items ||
    data.results;

  if (Array.isArray(candidate)) return candidate;
  // If the unwrapped candidate is itself an object with a products array, recurse once.
  if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) {
    if (Array.isArray(candidate.products)) return candidate.products;
  }
  return [];
}

function extractCount(data: any, fallbackLen: number): number {
  if (!data || typeof data !== "object") return fallbackLen;
  return num(data.total ?? data.count ?? data.total_count ?? data.meta?.total, fallbackLen);
}

/**
 * Map a raw Zendrop product to our inventory shape, applying markup.
 */
function normalize(raw: any, markupType: string, markupValue: number): NormalizedProduct {
  const cost = num(raw.cost ?? raw.price ?? raw.wholesale_price ?? raw.variants?.[0]?.cost ?? raw.variants?.[0]?.price);
  const images: string[] = [];
  if (Array.isArray(raw.images)) {
    for (const im of raw.images) images.push(typeof im === "string" ? im : (im?.url || im?.src || ""));
  }
  if (raw.image) images.push(typeof raw.image === "string" ? raw.image : (raw.image.url || raw.image.src || ""));
  if (raw.thumbnail) images.push(raw.thumbnail);
  const cleanImages = images.filter(Boolean);

  const id = String(raw.id ?? raw.product_id ?? raw._id ?? raw.sku ?? crypto.randomUUID());
  const sku = String(raw.sku ?? raw.variants?.[0]?.sku ?? `ZD-${id}`);

  return {
    providerId: PROVIDER_ID,
    providerProductId: id,
    sku,
    name: String(raw.name ?? raw.title ?? "Untitled Product"),
    description: String(raw.description ?? raw.body_html ?? "").replace(/<[^>]+>/g, "").slice(0, 2000),
    price: applyMarkup(cost, markupType, markupValue),
    cost,
    stock: num(raw.stock ?? raw.inventory ?? raw.quantity ?? raw.variants?.[0]?.inventory_quantity, 100),
    images: cleanImages,
    category: String(raw.category ?? raw.product_type ?? raw.tags?.[0] ?? "General"),
    rating: num(raw.rating ?? raw.average_rating, 0),
    lastSynced: new Date().toISOString(),
  };
}

async function loadServerConfig(): Promise<{ markupType: string; markupValue: number; storeId?: string; lastSync?: string; productCount?: number }> {
  try {
    const raw = await kv.get(CONFIG_KEY);
    const parsed = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : {};
    return {
      markupType: parsed.markupType || "percent",
      markupValue: num(parsed.markupValue, 75),
      storeId: parsed.storeId,
      lastSync: parsed.lastSync,
      productCount: parsed.productCount,
    };
  } catch {
    return { markupType: "percent", markupValue: 75 };
  }
}

async function saveServerConfig(patch: Record<string, unknown>): Promise<void> {
  const current = await loadServerConfig();
  await kv.set(CONFIG_KEY, JSON.stringify({ ...current, ...patch }));
}

/**
 * Register Zendrop as an enabled dropshipper provider so order-forwarding and
 * the store's inventory reader both recognize it.
 */
async function registerProvider(apiKey: string, markupType: string, markupValue: number, storeId?: string) {
  await config.saveProvider({
    id: PROVIDER_ID,
    name: "Zendrop",
    apiUrl: "https://api.zendrop.com/v1",
    apiKey,
    enabled: true,
    syncInventory: true,
    autoForwardOrders: true,
    syncInterval: 360,
    settings: {
      markupPercentage: markupType === "percent" ? markupValue : undefined,
      fulfillmentTime: 5,
      shippingMethods: ["standard"],
    },
  } as any);
  await config.setEnabled(true);
  if (storeId) await saveServerConfig({ storeId });
}

/**
 * Pull top products from Zendrop and write them into store inventory.
 */
async function importTopProducts(apiKey: string, limit: number): Promise<{ imported: number; sample: NormalizedProduct[]; endpoint: string }> {
  const { markupType, markupValue } = await loadServerConfig();

  // Pull trending catalog products from the Zendrop MCP API.
  const result = await zendropFetch(apiKey, "get_catalog_trending_products", { filters: {} });
  if (!result.ok) {
    throw new Error(`Zendrop product fetch failed (HTTP ${result.status}): ${result.error || "no response"}`);
  }

  const raw = extractProducts(result.data).slice(0, limit);
  const normalized = raw
    .map((r) => normalize(r, markupType, markupValue))
    .filter((p) => p.name);

  const nowIso = new Date().toISOString();
  const writes: Promise<void>[] = [];
  for (const p of normalized) {
    // 1) Dropshipper inventory record — used by the dropshipper module for
    //    order-forwarding, sync tracking, and the Zendrop page's own catalog view.
    writes.push(kv.set(`${INVENTORY_KEY_PREFIX}:${p.sku}`, JSON.stringify(p)));

    // 2) Storefront product record — THIS is what the public store actually
    //    renders (GET /products reads the `store_product:` prefix). Without this
    //    write, imported Zendrop items would never appear in the live store.
    const storeId = `zendrop_${p.sku}`;
    const slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || storeId;
    const storeProduct = {
      id: storeId,
      vendorId: PROVIDER_ID,
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
      primaryImage: p.images[0] || "",
      isActive: true,
      isFeatured: false,
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
    writes.push(kv.set(`store_product:${storeId}`, storeProduct));
  }
  await Promise.all(writes);

  await config.updateLastSync();
  await saveServerConfig({ lastSync: new Date().toLocaleString(), productCount: extractCount(result.data, normalized.length) });

  return { imported: normalized.length, sample: normalized.slice(0, 3), endpoint: result.url };
}

// ─── Routes ─────────────────────────────────────────────────────────────────

/**
 * POST /zendrop/verify
 * Verifies the API key, registers Zendrop as a live provider, and AUTO-IMPORTS
 * the top products so the store goes live in one step.
 * Body: { apiKey?, storeId?, markupType?, markupValue?, autoImport?, limit? }
 */
zendropRouter.post(`${PREFIX}/zendrop/verify`, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const apiKey = resolveKey(body.apiKey);
    if (!apiKey) {
      return c.json({
        success: false,
        error: "No Zendrop API key available. Add the ZENDROP_API_KEY secret or provide a key.",
      }, 400);
    }

    // Persist markup settings first so the auto-import prices correctly.
    if (body.markupType || body.markupValue != null) {
      await saveServerConfig({
        markupType: body.markupType || "percent",
        markupValue: num(body.markupValue, 75),
      });
    }

    // Verify by requesting trending catalog products.
    const verify = await zendropFetch(apiKey, "get_catalog_trending_products", { filters: {} });
    if (!verify.ok) {
      console.log(`[Zendrop] Verify failed: HTTP ${verify.status} — ${verify.error}`);
      return c.json({
        success: false,
        error: `Zendrop rejected the connection (HTTP ${verify.status}). ${verify.status === 401 || verify.status === 403 ? "Check your API key." : verify.error || ""}`,
      }, 400);
    }

    const cfg = await loadServerConfig();
    await registerProvider(apiKey, cfg.markupType, cfg.markupValue, body.storeId);

    // Auto-import top products so the store goes live immediately.
    let importResult = { imported: 0, sample: [] as NormalizedProduct[], endpoint: "" };
    const autoImport = body.autoImport !== false;
    if (autoImport) {
      try {
        importResult = await importTopProducts(apiKey, num(body.limit, 25));
      } catch (e) {
        console.log(`[Zendrop] Auto-import after verify failed: ${e}`);
      }
    }

    const productCount = extractCount(verify.data, importResult.imported);
    return c.json({
      success: true,
      connected: true,
      productCount,
      imported: importResult.imported,
      live: importResult.imported > 0,
      sample: importResult.sample,
      endpoint: importResult.endpoint || verify.url,
    });
  } catch (error) {
    console.log(`[Zendrop] Verify error: ${error}`);
    return c.json({ success: false, error: `Zendrop verify error: ${error}` }, 500);
  }
});

/**
 * POST /zendrop/sync
 * Re-pulls the top products from Zendrop into store inventory.
 * Body: { apiKey?, limit? }
 */
zendropRouter.post(`${PREFIX}/zendrop/sync`, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const apiKey = resolveKey(body.apiKey);
    if (!apiKey) {
      return c.json({ success: false, error: "No Zendrop API key available." }, 400);
    }
    const result = await importTopProducts(apiKey, num(body.limit, 25));
    return c.json({ success: true, imported: result.imported, sample: result.sample, endpoint: result.endpoint });
  } catch (error) {
    console.log(`[Zendrop] Sync error: ${error}`);
    return c.json({ success: false, error: `Zendrop sync error: ${error}` }, 500);
  }
});

/**
 * Fetch the top (best-selling) Zendrop products, normalized, WITHOUT importing.
 */
async function fetchTopProducts(apiKey: string, limit: number): Promise<{ products: NormalizedProduct[]; endpoint: string }> {
  const { markupType, markupValue } = await loadServerConfig();
  const result = await zendropFetch(apiKey, "get_catalog_trending_products", { filters: {} });
  if (!result.ok) {
    throw new Error(`Zendrop product fetch failed (HTTP ${result.status}): ${result.error || "no response"}`);
  }
  const raw = extractProducts(result.data).slice(0, limit);
  const products = raw
    .map((r) => normalize(r, markupType, markupValue))
    .filter((p) => p.name);
  return { products, endpoint: result.url };
}

/**
 * GET /zendrop/top-products?limit=25
 * Returns real best-selling Zendrop products for display (does NOT publish).
 */
zendropRouter.get(`${PREFIX}/zendrop/top-products`, async (c) => {
  try {
    const apiKey = resolveKey();
    if (!apiKey) {
      return c.json({ success: false, error: "No Zendrop API key configured.", products: [] }, 400);
    }
    const limit = num(c.req.query("limit"), 25);
    const { products, endpoint } = await fetchTopProducts(apiKey, limit);
    const enriched = products.map((p, i) => ({
      ...p,
      rank: i + 1,
      margin: p.price > 0 ? Math.round(((p.price - p.cost) / p.price) * 100) : 0,
      profitPerUnit: +(p.price - p.cost).toFixed(2),
    }));
    return c.json({ success: true, products: enriched, endpoint });
  } catch (error) {
    console.log(`[Zendrop] top-products error: ${error}`);
    return c.json({ success: false, error: `${error}`, products: [] }, 500);
  }
});

/**
 * POST /zendrop/publish-to-store
 * Takes a Zendrop product (full object, or { sku } to look up from imported
 * inventory), optionally generates AI-enhanced marketing copy, and writes it
 * into the LIVE store catalog (`store_product:` — what the public store reads).
 * Body: { product?, sku?, generateInfo?: boolean }
 */
zendropRouter.post(`${PREFIX}/zendrop/publish-to-store`, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    let source: NormalizedProduct | null = body.product && typeof body.product === "object" ? body.product : null;

    if (!source && body.sku) {
      const raw = await kv.get(`${INVENTORY_KEY_PREFIX}:${body.sku}`);
      source = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null;
    }
    if (!source || !source.name) {
      return c.json({ success: false, error: "No product provided. Pass a product object or a known sku." }, 400);
    }

    let name = source.name;
    let description = source.description || "";
    let tags: string[] = [];

    if (body.generateInfo !== false) {
      const openaiKey = Deno.env.get("OPENAI_API_KEY");
      if (openaiKey) {
        try {
          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: "You are an expert e-commerce copywriter. Respond with valid JSON only, no markdown fences." },
                { role: "user", content: `Write store-ready product info for this dropshipping product.\n\nName: ${source.name}\nCategory: ${source.category}\nCurrent description: ${source.description?.slice(0, 500) || "(none)"}\nSell price: $${source.price}\n\nRespond ONLY with strict JSON: {"name":"<catchy retail product title, max 8 words>","description":"<2 short persuasive paragraphs, SEO-friendly, ends with a call to action>","tags":["<5-7 relevant keywords>"]}` },
              ],
              temperature: 0.7,
              max_tokens: 500,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            const rawTxt = (data.choices?.[0]?.message?.content || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
            const parsed = JSON.parse(rawTxt);
            name = parsed.name || name;
            description = parsed.description || description;
            tags = Array.isArray(parsed.tags) ? parsed.tags : [];
          }
        } catch (e) {
          console.log(`[Zendrop] AI copy generation failed, using original: ${e}`);
        }
      }
    }

    const now = new Date().toISOString();
    const id = `prod_zd_${source.sku || source.providerProductId || crypto.randomUUID()}`;
    const product = {
      id, name, description,
      category: source.category || "General",
      price: source.price,
      compare_at_price: source.price > 0 ? +(source.price * 1.3).toFixed(2) : undefined,
      cost_price: source.cost,
      images: source.images || [],
      primaryImage: source.images?.[0] || "",
      inventoryQuantity: source.stock ?? 100,
      trackInventory: false,
      isActive: true,
      isFeatured: false,
      vendorId: PROVIDER_ID,
      vendorName: "Zendrop",
      source: "zendrop",
      sku: source.sku,
      tags,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      viewCount: 0,
      orderCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await kv.set(`store_product:${id}`, product);
    return c.json({ success: true, product });
  } catch (error) {
    console.log(`[Zendrop] publish-to-store error: ${error}`);
    return c.json({ success: false, error: `${error}` }, 500);
  }
});

/**
 * GET /zendrop/status — quick connection + inventory snapshot.
 */
zendropRouter.get(`${PREFIX}/zendrop/status`, async (c) => {
  try {
    const provider = await config.getProvider(PROVIDER_ID);
    const cfg = await loadServerConfig();
    const inventory = await kv.getByPrefix(INVENTORY_KEY_PREFIX);
    return c.json({
      success: true,
      connected: !!provider?.enabled,
      productsInStore: inventory.length,
      lastSync: cfg.lastSync || null,
      productCount: cfg.productCount || 0,
    });
  } catch (error) {
    console.log(`[Zendrop] Status error: ${error}`);
    return c.json({ success: false, error: `Zendrop status error: ${error}` }, 500);
  }
});

export { zendropRouter };
export default zendropRouter;
