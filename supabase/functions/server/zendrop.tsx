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

const PREFIX = "/make-server-57095a78";
const PROVIDER_ID = "zendrop";
const INVENTORY_KEY_PREFIX = "dropshipper_inventory";
const CONFIG_KEY = "bp_zendrop_config"; // server-side mirror of settings

// Zendrop API candidate endpoints (Zendrop has versioned its API over time).
// We try each until one responds successfully.
const PRODUCT_ENDPOINTS = [
  "https://api.zendrop.com/v1/products",
  "https://api.zendrop.com/api/v1/products",
];

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
 * Call Zendrop, trying each candidate endpoint. Returns { ok, status, data, url, error }.
 */
async function zendropFetch(
  apiKey: string,
  query: string,
): Promise<{ ok: boolean; status: number; data: any; url: string; error?: string }> {
  let lastStatus = 0;
  let lastError = "";
  for (const base of PRODUCT_ENDPOINTS) {
    const url = `${base}${query}`;
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      lastStatus = res.status;
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return { ok: true, status: res.status, data, url };
      }
      // 401/403 means the key is the problem — stop trying other paths.
      if (res.status === 401 || res.status === 403) {
        const body = await res.text().catch(() => "");
        return { ok: false, status: res.status, data: null, url, error: body || `HTTP ${res.status}` };
      }
      lastError = await res.text().catch(() => `HTTP ${res.status}`);
    } catch (e) {
      lastError = String(e);
    }
  }
  return { ok: false, status: lastStatus, data: null, url: PRODUCT_ENDPOINTS[0], error: lastError };
}

/**
 * Pull a product array out of whatever shape Zendrop returns.
 */
function extractProducts(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  return data.data || data.products || data.items || data.results || [];
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

  // Try to request best-sellers first; fall back to a plain limited list.
  let result = await zendropFetch(apiKey, `?limit=${limit}&sort=best_selling`);
  if (!result.ok) result = await zendropFetch(apiKey, `?limit=${limit}`);
  if (!result.ok) {
    throw new Error(`Zendrop product fetch failed (HTTP ${result.status}): ${result.error || "no response"}`);
  }

  const raw = extractProducts(result.data);
  const normalized = raw
    .map((r) => normalize(r, markupType, markupValue))
    .filter((p) => p.name && p.cost >= 0);

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

    // Verify by requesting a single product.
    const verify = await zendropFetch(apiKey, `?limit=1`);
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
