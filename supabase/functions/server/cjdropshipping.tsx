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
 * CJ enforces a hard global QPS limit of 1 request/second across the whole
 * API. Exceeding it returns HTTP 429 / code 1600200 with a null payload —
 * which, before this gate existed, silently degraded batch imports: variant
 * lookups failed, products were written without a `vid`, and stock came back
 * unknown for most of the catalog.
 *
 * Every CJ call is serialized through this promise chain so at most one is in
 * flight per interval, no matter how many callers there are.
 */
const CJ_MIN_INTERVAL_MS = 1100;
let cjGate: Promise<void> = Promise.resolve();
let cjLastCallAt = 0;

function cjThrottle(): Promise<void> {
  const next = cjGate.then(async () => {
    const wait = CJ_MIN_INTERVAL_MS - (Date.now() - cjLastCallAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    cjLastCallAt = Date.now();
  });
  // Keep the chain alive even if a link rejects, so one failure can't wedge
  // every subsequent CJ call.
  cjGate = next.catch(() => {});
  return next;
}

/**
 * Authenticated CJ request. Re-auths once on an auth failure, and backs off and
 * retries when the QPS limiter trips. `apiKey` is used to (re)mint the access
 * token; `path` is relative to API_BASE.
 */
async function cjFetch(
  apiKey: string,
  path: string,
  init: { method?: string; query?: Record<string, any>; body?: any } = {},
  _retried = false,
  _rateRetries = 0,
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

  await cjThrottle();

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

  // QPS limiter tripped despite the gate (concurrent isolates share the quota).
  // Back off and retry — this returns data:null, so treating it as a real
  // response is what previously produced phantom "no stock" results.
  const rateLimited = res.status === 429 || data?.code === 1600200;
  if (rateLimited && _rateRetries < 3) {
    await new Promise((r) => setTimeout(r, CJ_MIN_INTERVAL_MS * (_rateRetries + 1)));
    return cjFetch(apiKey, path, init, _retried, _rateRetries + 1);
  }

  // CJ signals an expired/invalid token via code 1600xx or a message about the
  // access token. Re-auth once and retry.
  const looksLikeAuthError =
    res.status === 401 ||
    data?.code === 1600100 ||
    /access[- ]?token/i.test(String(data?.message || ""));
  if (looksLikeAuthError && !_retried) {
    await getAccessToken(apiKey, true); // force refresh
    return cjFetch(apiKey, path, init, true, _rateRetries);
  }

  if (!res.ok || (data?.result === false && data?.code !== 200)) {
    const msg = data?.message || text.slice(0, 200) || `HTTP ${res.status}`;
    throw new Error(`CJ ${path} failed: ${msg}`);
  }

  return data;
}

/**
 * Real sellable stock for a variant.
 *
 * `/product/list` exposes `listedNum`, which is how many times sellers have
 * listed the product — NOT inventory. It reads 0 for most of the catalog even
 * when CJ is holding thousands of units, so mapping it to stock marked live
 * products as out of stock and blocked their sales.
 *
 * Actual inventory lives behind `/product/stock/queryByVid`, which returns one
 * row per warehouse/area, e.g.
 *   [{ areaEn: "China Warehouse", totalInventoryNum: 8099,
 *      cjInventoryNum: 0, factoryInventoryNum: 8099 }]
 *
 * We sum `totalInventoryNum` across areas: CJ-held and factory-backed units are
 * both fulfillable, they just ship on different timelines.
 *
 * Returns null when the figure genuinely can't be determined (transient CJ
 * error, or no rows) so the caller can decide rather than record a false zero.
 */
async function fetchVariantStock(apiKey: string, vid: string): Promise<number | null> {
  try {
    const res = await cjFetch(apiKey, "/product/stock/queryByVid", { query: { vid } });
    const rows: any[] = Array.isArray(res?.data) ? res.data : res?.data?.list || [];
    if (!rows.length) return null;
    const total = rows.reduce(
      (sum, r) => sum + num(r?.totalInventoryNum ?? r?.storageNum ?? 0, 0),
      0,
    );
    return Number.isFinite(total) ? total : null;
  } catch {
    return null;
  }
}

/**
 * Stock to persist for an imported product. A known figure (including a real
 * 0) is used as-is. When CJ won't tell us, fall back to the historical
 * optimistic default rather than 0 — the storefront gates purchases on
 * `inventoryQuantity > 0`, so a transient API failure must not silently pull
 * the whole catalog off sale.
 */
const STOCK_UNKNOWN_FALLBACK = 100;

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
/** A read-only trend candidate from the CJ catalog (scored without importing). */
export interface CjCandidate {
  pid: string; sku: string; name: string; description: string; category: string;
  cost: number; suggestedPrice: number; images: string[]; stock: number; rating: number; createdAt?: string;
}

function toCjCandidate(p: any): CjCandidate | null {
  const pid = String(p?.pid || p?.productId || p?.id || "");
  if (!pid) return null;
  const name = String(p?.productNameEn || p?.productName || p?.nameEn || "").trim();
  if (!name) return null;
  const cost = num(p?.sellPrice ?? p?.price ?? 0);
  return {
    pid, sku: String(p?.productSku || p?.sku || pid), name,
    description: String(p?.description || p?.productNameEn || ""),
    category: String(p?.categoryName || p?.category || "General"),
    cost, suggestedPrice: +(cost * 1.3).toFixed(2) || cost,
    // Scan-time placeholder only. `/product/list` carries no inventory figure,
    // so real stock is resolved per-variant at import (see fetchVariantStock).
    // Never persist this value.
    images: pickImages(p), stock: 0, rating: 4.6,
    createdAt: p?.createTime || p?.createdAt || undefined,
  };
}

/** Read-only scan of the CJ catalog for trend discovery (writes nothing). */
export async function scanCatalog(
  apiKey: string,
  opts?: { pageNum?: number; pageSize?: number; keyword?: string },
): Promise<CjCandidate[]> {
  const pageSize = Math.min(50, Math.max(1, opts?.pageSize ?? 50));
  const pageNum = Math.max(1, Math.floor(opts?.pageNum ?? 1));
  const keyword = (opts?.keyword || "").trim();
  const query: Record<string, unknown> = { pageNum, pageSize };
  if (keyword) query.productNameEn = keyword;
  const data = await cjFetch(apiKey, "/product/list", { query });
  const list: any[] = data?.data?.list || data?.data?.content || [];
  return list.map(toCjCandidate).filter((c): c is CjCandidate => c != null);
}

/** Persist already-scanned CJ candidates into the store (content-screened). */
export async function importCandidates(
  apiKey: string,
  candidates: CjCandidate[],
  opts?: { featuredSkus?: Set<string>; extraBySku?: Record<string, Record<string, unknown>> },
): Promise<{ imported: number; blocked: number }> {
  const nowIso = new Date().toISOString();
  const writes: Promise<void>[] = [];
  let imported = 0;
  let blocked = 0;
  for (const cand of candidates) {
    let vid: string | undefined;
    try {
      const vres = await cjFetch(apiKey, "/product/variant/query", { query: { pid: cand.pid } });
      const variants: any[] = Array.isArray(vres?.data) ? vres.data : vres?.data?.list || [];
      vid = variants[0]?.vid ? String(variants[0].vid) : undefined;
    } catch { /* lazy at order time */ }
    // `cand.stock` is a scan-time placeholder (see toCjCandidate) — replace it
    // with CJ's real per-variant inventory before anything is persisted.
    const liveStock = vid ? await fetchVariantStock(apiKey, vid) : null;
    const stock = liveStock ?? STOCK_UNKNOWN_FALLBACK;
    const inventoryRecord = {
      sku: cand.sku, name: cand.name, description: cand.description, category: cand.category,
      price: cand.suggestedPrice, cost: cand.cost, shippingCost: 0, stock,
      images: cand.images, rating: cand.rating, providerId: PROVIDER_ID, providerProductId: cand.pid, vid,
    };
    const storeId = `cj_${cand.sku}`;
    const slug = cand.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || storeId;
    const extra = opts?.extraBySku?.[cand.sku] || {};
    const storeProduct = {
      id: storeId, vendorId: PROVIDER_ID, vendorName: "CJdropshipping",
      name: cand.name, description: cand.description, category: cand.category,
      price: cand.suggestedPrice, compare_at_price: cand.suggestedPrice ? +(cand.suggestedPrice * 1.3).toFixed(2) : undefined,
      cost_price: cand.cost, shippingCost: 0, inventoryQuantity: stock, trackInventory: true,
      images: cand.images, primaryImage: cand.images[0] || "",
      // Imports land staged, not live. The price they arrive with is a formula
      // (cost x 1.3), and publishing that straight to the storefront means the
      // operator's own pricing decision happens after the product is already
      // for sale. `isActive: false` keeps it off the storefront — which already
      // filters on that field — until it is published from the price desk.
      isActive: false, storeStatus: "draft",
      isFeatured: opts?.featuredSkus?.has(cand.sku) || false,
      slug, sku: cand.sku, rating: cand.rating, viewCount: 0, orderCount: 0,
      source: PROVIDER_ID, providerProductId: cand.pid, createdAt: nowIso, updatedAt: nowIso, ...extra,
    };
    if (await screenAndQuarantine(storeProduct, PROVIDER_ID)) { blocked += 1; continue; }
    writes.push(kv.set(`${INVENTORY_KEY_PREFIX}:${cand.sku}`, JSON.stringify(inventoryRecord)));
    writes.push(kv.set(`product_${storeId}`, storeProduct));
    imported += 1;
  }
  await Promise.all(writes);
  if (imported) await config.updateLastSync();
  return { imported, blocked };
}

export async function importProducts(
  apiKey: string,
  limit: number,
  opts?: { pageNum?: number; keyword?: string },
): Promise<{ imported: number; blocked: number }> {
  const pageSize = Math.min(50, Math.max(1, limit));
  const pageNum = Math.max(1, Math.floor(opts?.pageNum ?? 1));
  const keyword = (opts?.keyword || "").trim();
  const query: Record<string, unknown> = { pageNum, pageSize };
  // CJ's /product/list accepts a productNameEn keyword filter for search.
  if (keyword) query.productNameEn = keyword;
  const data = await cjFetch(apiKey, "/product/list", { query });

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

    // Real inventory, not `listedNum`. Needs the vid, so it piggybacks on the
    // variant lookup above; without one we can't ask, so fall back.
    const liveStock = vid ? await fetchVariantStock(apiKey, vid) : null;
    const stock = liveStock ?? STOCK_UNKNOWN_FALLBACK;

    const inventoryRecord = {
      sku,
      name,
      description: String(p?.description || p?.productNameEn || ""),
      category: String(p?.categoryName || p?.category || "General"),
      price,
      cost,
      shippingCost: 0,
      stock,
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
      // Staged, not live — see the note at the other import site.
      isActive: false,
      storeStatus: "draft",
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
 * Import ADDITIONAL products on demand — a specific catalog page and/or a
 * keyword search — so the owner can keep adding more CJ products beyond the
 * initial batch. Body: { apiKey?, limit?, pageNum?, keyword? }
 */
cjRouter.post(`${PREFIX}/cj/import-more`, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const apiKey = resolveKey(body?.apiKey);
    if (!apiKey) {
      return c.json({ success: false, error: "No CJ_API_KEY secret configured." }, 400);
    }
    const limit = Math.min(50, Math.max(1, num(body?.limit, 20)));
    const pageNum = Math.max(1, num(body?.pageNum, 1));
    const keyword = typeof body?.keyword === "string" ? body.keyword : "";
    const { imported, blocked } = await importProducts(apiKey, limit, { pageNum, keyword });
    return c.json({ success: true, imported, blocked, pageNum, keyword });
  } catch (error) {
    console.log(`[CJ] import-more error: ${error}`);
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
/**
 * Read-only trial of the detail-enrichment pass.
 *
 * The catalog was imported from `/product/list`, which carries one thumbnail and
 * a bare title — the stored "description" on almost every product is its own
 * name repeated back. That is thin material for a reel, which needs several
 * visuals and something true to say.
 *
 * `/product/query` returns the full record: `productImageSet` (the real product
 * photography) plus a genuine description. `pickImages` already knows how to
 * read that field; it has simply never been handed one.
 *
 * This route fetches the detail for a few products and reports what WOULD
 * change. It writes nothing — the point is to see the gain on real records
 * before touching a live catalog.
 */
cjRouter.get(`${PREFIX}/cj/enrich-preview`, async (c) => {
  const apiKey = resolveKey();
  if (!apiKey) return c.json({ success: false, error: "No CJ_API_KEY secret configured." }, 400);

  const limit = Math.min(5, Math.max(1, Number(c.req.query("limit")) || 3));

  try {
    const all = ((await kv.getByPrefix("product_cj_")) || []) as any[];
    const sample = all.filter((p) => p?.providerProductId).slice(0, limit);
    if (!sample.length) {
      return c.json({ success: false, error: "No CJ products with a providerProductId to preview." }, 404);
    }

    const results: any[] = [];
    for (const p of sample) {
      const before = {
        images: Array.isArray(p.images) ? p.images.length : 0,
        description: String(p.description || ""),
      };
      try {
        const detail = await cjFetch(apiKey, "/product/query", {
          query: { pid: String(p.providerProductId) },
        });
        const d = detail?.data || {};
        const images = pickImages(d);
        const description = String(d?.description || d?.productDescEn || "");
        results.push({
          sku: p.sku,
          name: p.name,
          before,
          after: { images: images.length, description },
          gain: {
            images: images.length - before.images,
            // The stored description is usually the title verbatim, so "longer"
            // is not the same as "real". Report whether it actually differs.
            descriptionIsNew: description.length > 0 && description.trim() !== before.description.trim(),
            descriptionChars: description.length,
          },
          sampleImages: images.slice(0, 6),
        });
      } catch (err: any) {
        results.push({ sku: p.sku, name: p.name, before, error: String(err?.message || err) });
      }
    }

    const ok = results.filter((r) => !r.error);
    return c.json({
      success: true,
      wroteAnything: false,
      previewed: results.length,
      totals: {
        imagesBefore: ok.reduce((n, r) => n + r.before.images, 0),
        imagesAfter: ok.reduce((n, r) => n + r.after.images, 0),
        descriptionsGained: ok.filter((r) => r.gain.descriptionIsNew).length,
      },
      results,
    });
  } catch (err: any) {
    return c.json({ success: false, error: String(err?.message || err) }, 500);
  }
});

/**
 * CJ returns descriptions as HTML. Fed to a copywriter as-is, the markup is
 * noise competing with the words for attention, so reduce it to plain text
 * while keeping the line structure that separates one spec from the next.
 */
function htmlToText(html: string): string {
  return String(html || "")
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/\s*(p|div|li|tr|h[1-6])\s*>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n").map((l) => l.trim()).join("\n")
    .trim();
}

/**
 * Enrich stored CJ products from the detail endpoint — the write counterpart to
 * /cj/enrich-preview, which measured the gain first.
 *
 * Batched via limit/offset rather than sweeping all 120 in one request: at the
 * one-per-second rate CJ enforces, the whole catalog would sit close to the
 * function's wall-clock limit, and a timeout partway through leaves you unable
 * to tell which products were already done. Small batches are resumable.
 *
 * Merges rather than replaces. A product that already has good data must not
 * come out worse because a supplier response was thin — every field keeps the
 * better of the two values.
 */
cjRouter.post(`${PREFIX}/cj/enrich`, async (c) => {
  const apiKey = resolveKey();
  if (!apiKey) return c.json({ success: false, error: "No CJ_API_KEY secret configured." }, 400);

  const body = await c.req.json().catch(() => ({} as any));
  const limit = Math.min(30, Math.max(1, Number(body.limit) || 20));
  const offset = Math.max(0, Number(body.offset) || 0);

  try {
    const all = ((await kv.getByPrefix("product_cj_")) || []) as any[];
    // Stable order, so offset means the same thing across calls.
    const ordered = all
      .filter((p) => p?.providerProductId && p?.id)
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const batch = ordered.slice(offset, offset + limit);

    const changed: any[] = [];
    const failed: any[] = [];
    let imagesAdded = 0;
    let descriptionsFilled = 0;

    for (const p of batch) {
      try {
        const detail = await cjFetch(apiKey, "/product/query", {
          query: { pid: String(p.providerProductId) },
        });
        const d = detail?.data || {};

        const existing: string[] = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
        const incoming = pickImages(d);
        // Existing first so the image the storefront already shows stays the
        // lead; append only URLs not already present.
        const merged = [...existing];
        for (const url of incoming) if (!merged.includes(url)) merged.push(url);

        const storedDesc = String(p.description || "").trim();
        const incomingDesc = htmlToText(d?.description || d?.productDescEn || "");
        // The stored description is typically the product's own name. Take the
        // supplier's only when it actually says more than that.
        const descIsBetter =
          incomingDesc.length > 40 &&
          incomingDesc.toLowerCase() !== storedDesc.toLowerCase() &&
          incomingDesc.length > storedDesc.length;

        const addedHere = merged.length - existing.length;
        if (addedHere === 0 && !descIsBetter) continue;

        const updated = {
          ...p,
          images: merged,
          primaryImage: p.primaryImage || merged[0] || "",
          description: descIsBetter ? incomingDesc : p.description,
          enrichedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await kv.set(`product_${p.id}`, updated);

        imagesAdded += addedHere;
        if (descIsBetter) descriptionsFilled++;
        changed.push({
          sku: p.sku,
          name: p.name,
          images: `${existing.length} -> ${merged.length}`,
          descriptionChars: descIsBetter ? incomingDesc.length : 0,
        });
      } catch (err: any) {
        // One bad product must not abandon the rest of the batch.
        failed.push({ sku: p.sku, error: String(err?.message || err).slice(0, 200) });
      }
    }

    const nextOffset = offset + batch.length;
    return c.json({
      success: true,
      total: ordered.length,
      processed: batch.length,
      offset,
      nextOffset: nextOffset < ordered.length ? nextOffset : null,
      remaining: Math.max(0, ordered.length - nextOffset),
      updated: changed.length,
      unchanged: batch.length - changed.length - failed.length,
      imagesAdded,
      descriptionsFilled,
      failed,
      changed,
    });
  } catch (err: any) {
    return c.json({ success: false, error: String(err?.message || err) }, 500);
  }
});

/**
 * Publish staged products to the storefront — the "sync to store" step.
 *
 * Imports arrive as drafts so the operator sets a price before anything is for
 * sale. This is the gate that ends that: it flips `isActive` on, which is the
 * field the storefront already filters by.
 *
 * Pass `ids` to publish a chosen set, or omit it to publish every draft. A
 * product that was deliberately taken off sale is not a draft — it is live with
 * `isActive` turned off and no `storeStatus`, so publishing all drafts will not
 * quietly put it back on the shelf.
 */
cjRouter.post(`${PREFIX}/cj/publish`, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({} as any));
    const ids: string[] | null = Array.isArray(body?.ids) && body.ids.length
      ? body.ids.map((x: any) => String(x))
      : null;

    const all = ((await kv.getByPrefix("product_")) || []) as any[];
    const targets = all.filter((p: any) => {
      if (!p?.id) return false;
      if (ids) return ids.includes(String(p.id));
      return p.storeStatus === "draft";
    });

    const published: any[] = [];
    const skipped: any[] = [];
    for (const p of targets) {
      // Refuse to publish something with no sellable price. A zero-priced
      // product on the storefront is worse than one that is still staged.
      const price = Number(p.price);
      if (!Number.isFinite(price) || price <= 0) {
        skipped.push({ id: p.id, name: p.name, reason: "No price set." });
        continue;
      }
      await kv.set(`product_${p.id}`, {
        ...p,
        isActive: true,
        storeStatus: "live",
        publishedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      published.push({ id: p.id, name: p.name, price });
    }

    return c.json({
      success: true,
      published: published.length,
      skipped: skipped.length,
      skippedDetail: skipped,
      publishedDetail: published.slice(0, 50),
    });
  } catch (error) {
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

/**
 * Import across several CJ pages in one call.
 *
 * `/cj/import-more` takes a single page, and CJ caps a page at 50, so filling a
 * catalog meant driving pagination by hand from the client. This walks the
 * pages server-side. Everything it brings in lands staged, like any other
 * import.
 */
cjRouter.post(`${PREFIX}/cj/import-bulk`, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({} as any));
    const apiKey = resolveKey(body?.apiKey);
    if (!apiKey) return c.json({ success: false, error: "No CJ_API_KEY secret configured." }, 400);

    const perPage = Math.min(50, Math.max(1, num(body?.perPage, 50)));
    // Bounded per call so the request finishes inside the function's wall clock
    // at CJ's one-per-second rate; call again with a later startPage to go on.
    const pages = Math.min(6, Math.max(1, num(body?.pages, 3)));
    const startPage = Math.max(1, num(body?.startPage, 1));
    const keyword = typeof body?.keyword === "string" ? body.keyword : "";

    let imported = 0;
    let blocked = 0;
    const perPageResults: any[] = [];
    for (let i = 0; i < pages; i++) {
      const pageNum = startPage + i;
      try {
        const r = await importProducts(apiKey, perPage, { pageNum, keyword });
        imported += r.imported;
        blocked += r.blocked;
        perPageResults.push({ pageNum, imported: r.imported, blocked: r.blocked });
        // CJ has run out of results — stop rather than burn the remaining pages.
        if (!r.imported && !r.blocked) break;
      } catch (err: any) {
        perPageResults.push({ pageNum, error: String(err?.message || err).slice(0, 200) });
        break;
      }
    }

    return c.json({
      success: true,
      imported,
      blocked,
      keyword,
      startPage,
      nextStartPage: startPage + perPageResults.length,
      perPageResults,
      note: "Imported products are staged as drafts. Set prices, then publish from the price desk.",
    });
  } catch (error) {
    return c.json({ success: false, error: String((error as any)?.message || error) }, 500);
  }
});

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
