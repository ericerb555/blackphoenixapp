/**
 * CJdropshipping Integration Module
 *
 * Unlike Zendrop (whose MCP endpoint exposes NO create-order tool and requires a
 * connected sales channel), CJdropshipping has a plain REST API that accepts an
 * order directly — POST /shopping/order/createOrderV2 → data.orderId — so a
 * paid store order can be forwarded to a real supplier with a single call.
 *
 * Docs: https://developers.cjdropshipping.com/en/api/introduction.html
 *
 * Auth flow:
 *   POST /authentication/getAccessToken { apiKey } → data.accessToken (valid days)
 *   Then send header `CJ-Access-Token: <token>` on every subsequent call.
 *   QPS is limited to 1, so calls are serialized where it matters.
 *
 * The browser cannot call CJ directly (CORS + secret), so every CJ call happens
 * here, server-side, using the CJ_API_KEY secret (or a key passed in the body).
 */
import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";
import * as config from "./dropshipper-config.tsx";
import { screenAndQuarantine } from "./content-filter.tsx";

const cjRouter = new Hono();

const PREFIX = "/make-server-3eae23a6";
const PROVIDER_ID = "cjdropshipping";
const INVENTORY_KEY_PREFIX = "dropshipper_inventory";
const TOKEN_KEY = "cj:access_token"; // KV cache of the CJ access token
const API_BASE = "https://developers.cjdropshipping.com/api2.0/v1";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve the CJ API key. Prefer an explicit body key, else the CJ_API_KEY
 * secret. The CJ key format is `CJUserNum@api@…`.
 */
export function resolveKey(bodyKey?: string): string | null {
  const key = (bodyKey && bodyKey.trim()) || Deno.env.get("CJ_API_KEY") || "";
  return key.trim() || null;
}

function num(v: any, fallback = 0): number {
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// In-memory token cache to avoid re-authenticating on every call within a warm
// isolate. Persisted copy lives in KV so it survives cold starts.
let memToken: { token: string; expiresAt: number } | null = null;

interface CachedToken {
  token: string;
  expiresAt: number; // epoch ms
}

async function loadCachedToken(): Promise<CachedToken | null> {
  if (memToken && memToken.expiresAt > Date.now() + 60_000) return memToken;
  try {
    const raw = await kv.get(TOKEN_KEY);
    if (!raw) return null;
    const parsed: CachedToken = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (parsed?.token && parsed.expiresAt > Date.now() + 60_000) {
      memToken = parsed;
      return parsed;
    }
  } catch {
    // fall through to re-auth
  }
  return null;
}

async function storeCachedToken(token: string, expiresAt: number): Promise<void> {
  memToken = { token, expiresAt };
  try {
    await kv.set(TOKEN_KEY, JSON.stringify(memToken));
  } catch {
    // non-fatal: token still cached in memory
  }
}

/**
 * Get a valid CJ access token, authenticating if needed. `force` bypasses the
 * cache (used when a call returns an auth error).
 */
export async function getAccessToken(apiKey: string, force = false): Promise<string> {
  if (!force) {
    const cached = await loadCachedToken();
    if (cached) return cached.token;
  }

  const res = await fetch(`${API_BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
  });

  const text = await res.text().catch(() => "");
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`CJ auth returned non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }

  // CJ envelope: { code: 200, result: true, message, data: { accessToken, accessTokenExpiryDate } }
  const token = data?.data?.accessToken;
  if (!res.ok || !token) {
    const msg = data?.message || text.slice(0, 200) || `HTTP ${res.status}`;
    throw new Error(`CJ authentication failed: ${msg}`);
  }

  // Token is valid for ~15 days; expiry field is a date/string. Default to 12
  // days to stay comfortably inside the window.
  let expiresAt = Date.now() + 12 * 24 * 60 * 60 * 1000;
  const expRaw = data?.data?.accessTokenExpiryDate;
  const parsed = expRaw ? Date.parse(String(expRaw)) : NaN;
  if (Number.isFinite(parsed)) expiresAt = parsed;

  await storeCachedToken(token, expiresAt);
  return token;
}

/**
 * Authenticated CJ request. Re-auths once on an auth failure. `apiKey` is used
 * to (re)mint the access token; `path` is relative to API_BASE.
 */
async function cjFetch(
  apiKey: string,
  path: string,
  init: { method?: string; query?: Record<string, any>; body?: any } = {},
  _retried = false,
): Promise<any> {
  const token = await getAccessToken(apiKey);

  let url = `${API_BASE}${path}`;
  if (init.query) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(init.query)) {
      if (v !== undefined && v !== null) qs.append(k, String(v));
    }
    const s = qs.toString();
    if (s) url += `?${s}`;
  }

  const res = await fetch(url, {
    method: init.method || "GET",
    headers: {
      "CJ-Access-Token": token,
      "Content-Type": "application/json",
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  const text = await res.text().catch(() => "");
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`CJ ${path} returned non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`);
  }

  // CJ signals an expired/invalid token via code 1600xx or a message about the
  // access token. Re-auth once and retry.
  const looksLikeAuthError =
    res.status === 401 ||
    data?.code === 1600100 ||
    /access[- ]?token/i.test(String(data?.message || ""));
  if (looksLikeAuthError && !_retried) {
    await getAccessToken(apiKey, true); // force refresh
    return cjFetch(apiKey, path, init, true);
  }

  if (!res.ok || (data?.result === false && data?.code !== 200)) {
    const msg = data?.message || text.slice(0, 200) || `HTTP ${res.status}`;
    throw new Error(`CJ ${path} failed: ${msg}`);
  }

  return data;
}

// ---------------------------------------------------------------------------
// Address normalization
//
// CJ's createOrderV2 wants structured shipping fields. Our store currently
// stores the address as either a structured object OR a single free-text
// string, so accept both and best-effort parse the US free-text form
// "Street, City, ST 12345".
// ---------------------------------------------------------------------------

export interface CjAddress {
  shippingCountryCode: string;
  shippingCountry: string;
  shippingProvince: string;
  shippingCity: string;
  shippingAddress: string;
  shippingCustomerName: string;
  shippingZip: string;
  shippingPhone: string;
}

function parseUsFreeText(raw: string): Partial<CjAddress> {
  // Best-effort: "123 Main St, Springfield, IL 62704"
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const out: Partial<CjAddress> = {};
  if (parts.length >= 1) out.shippingAddress = parts[0];
  if (parts.length >= 2) out.shippingCity = parts[1];
  if (parts.length >= 3) {
    const m = parts[2].match(/([A-Za-z]{2})\s*(\d{5}(?:-\d{4})?)?/);
    if (m) {
      out.shippingProvince = (m[1] || "").toUpperCase();
      if (m[2]) out.shippingZip = m[2];
    }
  }
  // A trailing zip that wasn't after the state
  if (!out.shippingZip) {
    const zip = raw.match(/\b(\d{5}(?:-\d{4})?)\b/);
    if (zip) out.shippingZip = zip[1];
  }
  return out;
}

export function normalizeAddress(
  address: any,
  customerName?: string,
  customerPhone?: string,
): CjAddress {
  const a = address || {};
  let base: Partial<CjAddress> = {};

  if (typeof a === "string") {
    base = parseUsFreeText(a);
  } else if (typeof a === "object") {
    base = {
      shippingAddress: a.address || a.street || a.line1 || a.address1 || "",
      shippingCity: a.city || "",
      shippingProvince: (a.state || a.province || a.region || "").toString(),
      shippingZip: (a.zip || a.zipCode || a.postalCode || a.postal_code || "").toString(),
      shippingCountry: a.country || "United States",
      shippingCountryCode: (a.countryCode || a.country_code || "US").toString(),
      shippingCustomerName: a.name || a.recipient || a.fullName || "",
      shippingPhone: (a.phone || a.phoneNumber || "").toString(),
    };
  }

  const countryCode = (base.shippingCountryCode || "US").toUpperCase().slice(0, 2);
  return {
    shippingCountryCode: countryCode,
    shippingCountry: base.shippingCountry || (countryCode === "US" ? "United States" : ""),
    shippingProvince: base.shippingProvince || "",
    shippingCity: base.shippingCity || "",
    shippingAddress: base.shippingAddress || "",
    shippingCustomerName: base.shippingCustomerName || customerName || "",
    shippingZip: base.shippingZip || "",
    shippingPhone: base.shippingPhone || customerPhone || "",
  };
}

function assertAddressComplete(addr: CjAddress): void {
  const missing: string[] = [];
  if (!addr.shippingCustomerName) missing.push("recipient name");
  if (!addr.shippingAddress) missing.push("street address");
  if (!addr.shippingCity) missing.push("city");
  if (!addr.shippingProvince) missing.push("state/province");
  if (!addr.shippingZip) missing.push("zip/postal code");
  if (!addr.shippingCountryCode) missing.push("country");
  if (missing.length) {
    throw new Error(
      `CJ order needs a complete shipping address; missing: ${missing.join(", ")}. ` +
        `Capture structured address fields at checkout for reliable fulfillment.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Order creation
// ---------------------------------------------------------------------------

export interface CjOrderInput {
  orderId: string;
  items: { sku: string; quantity: number; price?: number; providerProductId?: string; vid?: string }[];
  shippingAddress: any;
  customerName?: string;
  customerPhone?: string;
}

/**
 * Resolve a CJ variant id (vid) for an ordered item. The vid is what
 * createOrderV2 needs. Prefer an explicit vid on the item, then the inventory
 * record, then a live variant lookup by product id.
 */
async function resolveVid(apiKey: string, item: CjOrderInput["items"][number]): Promise<string> {
  if (item.vid) return String(item.vid);

  // Inventory record may carry a stored vid.
  try {
    const raw = await kv.get(`${INVENTORY_KEY_PREFIX}:${item.sku}`);
    if (raw) {
      const rec = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (rec?.vid) return String(rec.vid);
      if (!item.providerProductId && rec?.providerProductId) item.providerProductId = String(rec.providerProductId);
    }
  } catch {
    // fall through to live lookup
  }

  const pid = item.providerProductId;
  if (!pid) {
    throw new Error(`No CJ variant id or product id available for item ${item.sku}.`);
  }

  const data = await cjFetch(apiKey, "/product/variant/query", { query: { pid } });
  const variants: any[] = Array.isArray(data?.data) ? data.data : data?.data?.list || [];
  const first = variants[0];
  const vid = first?.vid || first?.variantId;
  if (!vid) {
    throw new Error(`CJ returned no variants for product ${pid} (item ${item.sku}).`);
  }
  return String(vid);
}

/**
 * Forward a paid store order to CJdropshipping. Returns the CJ order id.
 */
export async function submitCJOrder(
  bodyKey: string | undefined,
  input: CjOrderInput,
): Promise<{ providerOrderId: string }> {
  const apiKey = resolveKey(bodyKey);
  if (!apiKey) {
    throw new Error("No CJ_API_KEY secret configured, so the order cannot be sent to CJdropshipping.");
  }

  const addr = normalizeAddress(input.shippingAddress, input.customerName, input.customerPhone);
  assertAddressComplete(addr);

  // Build CJ line items. Each needs { vid, quantity }.
  const products: { vid: string; quantity: number }[] = [];
  for (const item of input.items) {
    const vid = await resolveVid(apiKey, item);
    products.push({ vid, quantity: num(item.quantity, 1) || 1 });
  }
  if (products.length === 0) {
    throw new Error("CJ order has no resolvable line items.");
  }

  const body = {
    orderNumber: input.orderId,
    shippingZip: addr.shippingZip,
    shippingCountryCode: addr.shippingCountryCode,
    shippingCountry: addr.shippingCountry,
    shippingProvince: addr.shippingProvince,
    shippingCity: addr.shippingCity,
    shippingAddress: addr.shippingAddress,
    shippingCustomerName: addr.shippingCustomerName,
    shippingPhone: addr.shippingPhone,
    remark: `Store order ${input.orderId}`,
    fromCountryCode: "CN",
    logisticName: "CJPacket Ordinary",
    houseNumber: "",
    products,
  };

  const data = await cjFetch(apiKey, "/shopping/order/createOrderV2", {
    method: "POST",
    body,
  });

  const providerOrderId = data?.data?.orderId || data?.data?.orderNum || data?.data;
  if (!providerOrderId || typeof providerOrderId === "object") {
    throw new Error(
      `CJ accepted the request but returned no order id, so it cannot be tracked: ${JSON.stringify(data).slice(0, 300)}`,
    );
  }
  return { providerOrderId: String(providerOrderId) };
}

// ---------------------------------------------------------------------------
// Provider registration + product sync
// ---------------------------------------------------------------------------

async function registerProvider(apiKey: string): Promise<void> {
  await config.saveProvider({
    id: PROVIDER_ID,
    name: "CJdropshipping",
    apiUrl: API_BASE,
    apiKey,
    enabled: true,
    syncInventory: true,
    autoForwardOrders: true,
    syncInterval: 360,
    settings: {
      markupPercentage: 30,
      fulfillmentTime: 7,
      shippingMethods: ["standard"],
    },
  } as any);
  await config.setEnabled(true);
}

function pickImages(p: any): string[] {
  const imgs: string[] = [];
  const push = (v: any) => {
    if (typeof v === "string" && v.startsWith("http")) imgs.push(v);
  };
  push(p?.productImage);
  push(p?.bigImage);
  if (Array.isArray(p?.productImageSet)) p.productImageSet.forEach(push);
  if (Array.isArray(p?.images)) p.images.forEach(push);
  return [...new Set(imgs)];
}

/**
 * Pull products from CJ and write them into the SAME store inventory the public
 * store reads (`product_` prefix) plus the dropshipper inventory
 * (`dropshipper_inventory:` prefix) used for order forwarding.
 */
export async function importProducts(apiKey: string, limit: number): Promise<{ imported: number; blocked: number }> {
  const pageSize = Math.min(50, Math.max(1, limit));
  const data = await cjFetch(apiKey, "/product/list", {
    query: { pageNum: 1, pageSize },
  });

  const list: any[] = data?.data?.list || data?.data?.content || [];
  const nowIso = new Date().toISOString();
  const writes: Promise<void>[] = [];
  let imported = 0;
  let blocked = 0;

  for (const p of list.slice(0, limit)) {
    const pid = String(p?.pid || p?.productId || p?.id || "");
    if (!pid) continue;
    const sku = String(p?.productSku || p?.sku || pid);
    const name = String(p?.productNameEn || p?.productName || p?.nameEn || "").trim();
    if (!name) continue;

    const cost = num(p?.sellPrice ?? p?.price ?? 0);
    const price = +(cost * 1.3).toFixed(2) || cost;
    const images = pickImages(p);

    // Resolve the first variant vid so a future order can be placed without an
    // extra lookup. Best-effort — a missing vid just means it's resolved lazily
    // at order time.
    let vid: string | undefined;
    try {
      const vres = await cjFetch(apiKey, "/product/variant/query", { query: { pid } });
      const variants: any[] = Array.isArray(vres?.data) ? vres.data : vres?.data?.list || [];
      vid = variants[0]?.vid ? String(variants[0].vid) : undefined;
    } catch {
      // leave vid undefined
    }

    const inventoryRecord = {
      sku,
      name,
      description: String(p?.description || p?.productNameEn || ""),
      category: String(p?.categoryName || p?.category || "General"),
      price,
      cost,
      shippingCost: 0,
      stock: num(p?.listedNum ?? 100, 100),
      images,
      rating: 4.6,
      providerId: PROVIDER_ID,
      providerProductId: pid,
      vid,
    };

    const storeId = `cj_${sku}`;
    const slug =
      name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || storeId;
    const storeProduct = {
      id: storeId,
      vendorId: PROVIDER_ID,
      vendorName: "CJdropshipping",
      name,
      description: inventoryRecord.description,
      category: inventoryRecord.category,
      price,
      compare_at_price: price ? +(price * 1.3).toFixed(2) : undefined,
      cost_price: cost,
      shippingCost: 0,
      inventoryQuantity: inventoryRecord.stock,
      trackInventory: true,
      images,
      primaryImage: images[0] || "",
      isActive: true,
      isFeatured: false,
      slug,
      sku,
      rating: 4.6,
      viewCount: 0,
      orderCount: 0,
      source: PROVIDER_ID,
      providerProductId: pid,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    if (await screenAndQuarantine(storeProduct, PROVIDER_ID)) {
      blocked += 1;
      continue;
    }

    writes.push(kv.set(`${INVENTORY_KEY_PREFIX}:${sku}`, JSON.stringify(inventoryRecord)));
    writes.push(kv.set(`product_${storeId}`, storeProduct));
    imported += 1;
  }

  await Promise.all(writes);
  await config.updateLastSync();
  return { imported, blocked };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * Verify the CJ key authenticates, register CJ as a provider, and import a
 * first batch of products. Body: { apiKey?, limit? }
 */
cjRouter.post(`${PREFIX}/cj/verify`, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const apiKey = resolveKey(body?.apiKey);
    if (!apiKey) {
      return c.json({ success: false, error: "No CJ_API_KEY secret configured. Add it in Supabase secrets." }, 400);
    }

    // Force a fresh auth so we validate the actual key, not a cached token.
    const token = await getAccessToken(apiKey, true);
    await registerProvider(apiKey);

    const limit = Math.min(50, Math.max(1, num(body?.limit, 20)));
    const { imported, blocked } = await importProducts(apiKey, limit);

    return c.json({
      success: true,
      tokenOk: Boolean(token),
      provider: PROVIDER_ID,
      imported,
      blocked,
      message: `CJdropshipping connected. Imported ${imported} products${blocked ? `, ${blocked} blocked by content filter` : ""}.`,
    });
  } catch (error) {
    console.log(`[CJ] verify error: ${error}`);
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

/**
 * Re-sync products (assumes provider already registered). Body: { apiKey?, limit? }
 */
cjRouter.post(`${PREFIX}/cj/sync`, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const apiKey = resolveKey(body?.apiKey);
    if (!apiKey) {
      return c.json({ success: false, error: "No CJ_API_KEY secret configured." }, 400);
    }
    const limit = Math.min(50, Math.max(1, num(body?.limit, 20)));
    const { imported, blocked } = await importProducts(apiKey, limit);
    return c.json({ success: true, imported, blocked });
  } catch (error) {
    console.log(`[CJ] sync error: ${error}`);
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

/**
 * Report whether CJ is configured and connected.
 */
cjRouter.get(`${PREFIX}/cj/status`, async (c) => {
  try {
    const apiKey = resolveKey();
    const provider = await config.getProvider(PROVIDER_ID);
    return c.json({
      success: true,
      hasSecret: Boolean(apiKey),
      registered: Boolean(provider),
      autoForwardOrders: provider?.autoForwardOrders ?? false,
      lastSync: await config.getLastSync(),
    });
  } catch (error) {
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

/**
 * Diagnostics: confirm the secret is present and the key authenticates.
 */
cjRouter.get(`${PREFIX}/cj/debug`, async (c) => {
  const apiKey = resolveKey();
  if (!apiKey) {
    return c.json({ success: false, hasSecret: false, tokenOk: false, error: "No CJ_API_KEY secret configured." });
  }
  try {
    const token = await getAccessToken(apiKey, true);
    return c.json({
      success: true,
      hasSecret: true,
      tokenOk: Boolean(token),
      apiBase: API_BASE,
      message: "CJ_API_KEY authenticates successfully.",
    });
  } catch (error) {
    return c.json({
      success: false,
      hasSecret: true,
      tokenOk: false,
      error: String((error as any)?.message || error),
    });
  }
});

export { cjRouter };
export default cjRouter;
