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
import { screenAndQuarantine } from "./content-filter.tsx";

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
  shippingCost: number; // per-item shipping cost, when Zendrop provides it
  stock: number;
  images: string[];
  category: string;
  rating: number;
  lastSynced: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Raised when Zendrop cannot accept an order via API (no create-order tool /
 * no connected store). This is a permanent platform limitation, so the forward
 * layer flags the order for MANUAL fulfillment rather than logging a repeating
 * hard error and endlessly retrying something that can never succeed remotely.
 */
export class ZendropManualFulfillmentError extends Error {
  readonly code = "ZENDROP_MANUAL_REQUIRED";
  constructor(message: string) {
    super(message);
    this.name = "ZendropManualFulfillmentError";
  }
}

export function resolveKey(bodyKey?: string): string | null {
  const key = (bodyKey && bodyKey.trim()) || Deno.env.get("ZENDROP_API_KEY") || "";
  return key.trim() || null;
}

export function num(v: any, fallback = 0): number {
  const n = typeof v === "string" ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function applyMarkup(cost: number, markupType: string, markupValue: number): number {
  if (!cost) return 0;
  if (markupType === "fixed") return +(cost + markupValue).toFixed(2);
  return +(cost * (1 + markupValue / 100)).toFixed(2); // percent (default)
}

/**
 * Low-level JSON-RPC 2.0 call to the Zendrop MCP endpoint.
 *
 * Zendrop's MCP endpoint is a STRICT JSON-RPC 2.0 server. It rejects any body
 * that isn't shaped like { jsonrpc: "2.0", id, method, params } — sending
 * { action, ... } gets `-32600 Invalid Request: Invalid JSON-RPC version`.
 * Standard MCP methods: "tools/list" (discover tools) and "tools/call"
 * (invoke a tool with { name, arguments }).
 */
async function mcpCall(
  apiKey: string,
  method: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; status: number; data: any; url: string; error?: string }> {
  const url = MCP_ENDPOINT;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // MCP servers frequently require accepting the SSE stream content type.
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
    });
    const text = await res.text().catch(() => "");
    // Some MCP servers reply as an SSE stream ("data: {json}\n\n"); unwrap it.
    const jsonText = text.includes("data:")
      ? text.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("")
      : text;
    let data: any = {};
    let parsed = true;
    try { data = jsonText ? JSON.parse(jsonText) : {}; } catch { parsed = false; }

    if (!res.ok) {
      const msg = (parsed && (data.error?.message || data.error || data.message)) || text.slice(0, 300) || `HTTP ${res.status}`;
      return { ok: false, status: res.status, data: null, url, error: typeof msg === "string" ? msg : JSON.stringify(msg) };
    }
    if (!parsed) {
      return { ok: false, status: res.status, data: null, url, error: `Zendrop returned a non-JSON response (got ${text.slice(0, 120)}…). Confirm the API token is a Zendrop MCP access token.` };
    }
    // JSON-RPC error object in a 200 response.
    if (data && data.error) {
      const em = data.error?.message || JSON.stringify(data.error);
      return { ok: false, status: res.status, data, url, error: `Zendrop MCP error: ${em}` };
    }
    return { ok: true, status: res.status, data, url };
  } catch (e) {
    return { ok: false, status: 0, data: null, url, error: String(e) };
  }
}

/**
 * Invoke a Zendrop MCP tool by name via tools/call.
 * `action` is the MCP tool name; `params` becomes the tool's `arguments`.
 * Kept as a thin wrapper so existing call sites (verify/sync/top-products)
 * don't need to change.
 */
export async function zendropFetch(
  apiKey: string,
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; status: number; data: any; url: string; error?: string }> {
  return mcpCall(apiKey, "tools/call", { name: action, arguments: params });
}

// ─── Order submission (MCP) ─────────────────────────────────────────────────
//
// Zendrop publishes no REST order endpoint, and its developer docs list only
// catalog tools. Rather than hardcode a guessed tool name, discover it at
// runtime from tools/list and adapt the arguments to the tool's own schema.

interface McpTool { name: string; description?: string; inputSchema?: any; }

let toolCache: { tools: McpTool[]; at: number } | null = null;
const TOOL_CACHE_MS = 10 * 60 * 1000;

export async function listZendropTools(apiKey: string, force = false): Promise<{ tools: McpTool[]; error?: string }> {
  if (!force && toolCache && Date.now() - toolCache.at < TOOL_CACHE_MS) return { tools: toolCache.tools };
  const res = await mcpCall(apiKey, "tools/list", {});
  if (!res.ok) return { tools: [], error: res.error || `tools/list failed (HTTP ${res.status}).` };
  const raw = res.data?.result?.tools ?? res.data?.tools ?? [];
  const tools: McpTool[] = Array.isArray(raw)
    ? raw.filter((t: any) => t && typeof t.name === "string")
        .map((t: any) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema ?? t.input_schema }))
    : [];
  toolCache = { tools, at: Date.now() };
  return { tools };
}

// NOTE: only tools that CREATE a brand-new order from external data belong
// here. `fulfill_order` is deliberately NOT in this list: despite the name it
// does not create an order — its schema is { store_id, order_ids, confirmed }
// and it only dispatches orders that ALREADY exist inside a connected Zendrop
// store. Matching it made us call it with line_items/shipping_address, which it
// silently ignores, and surfaced Zendrop's "Insufficient scope: orders:write"
// as if a token toggle would fix a structural mismatch. Keep it out.
const ORDER_TOOL_PATTERNS: RegExp[] = [
  /^create_order$/i,
  /^place_order$/i,
  /^submit_order$/i,
  /^create_orders?$/i,
  /^order_create$/i,
  /^(create|place|submit)_.*order/i,
  /^(create|place|submit).*order/i,
];

/** Most specific match wins, so `create_order` beats `create_order_draft`. */
export function pickOrderTool(tools: McpTool[]): McpTool | null {
  for (const pattern of ORDER_TOOL_PATTERNS) {
    const hit = tools.find((t) => pattern.test(t.name));
    if (hit) return hit;
  }
  return null;
}

export interface ZendropOrderInput {
  orderId: string;
  items: Array<{ sku: string; quantity: number; price?: number }>;
  shippingAddress?: any;
}

/**
 * Build the tool arguments, sending only keys the tool's own inputSchema
 * declares. Sending undeclared keys is what most MCP servers reject outright,
 * and the schema is the only trustworthy description of this tool.
 */
export function buildOrderArguments(tool: McpTool, order: ZendropOrderInput): Record<string, unknown> {
  const properties = tool.inputSchema?.properties;
  const lineItems = order.items.map((it) => ({
    sku: it.sku,
    variant_id: it.sku,
    quantity: it.quantity,
    ...(it.price !== undefined ? { price: it.price } : {}),
  }));

  // No schema to go on — send the most conventional shape and let the server
  // tell us what it dislikes, which surfaces as an actionable error.
  if (!properties || typeof properties !== "object") {
    return { line_items: lineItems, shipping_address: order.shippingAddress, external_id: order.orderId };
  }

  const args: Record<string, unknown> = {};
  const put = (aliases: string[], value: unknown) => {
    if (value === undefined) return;
    const key = aliases.find((a) => a in properties);
    if (key) args[key] = value;
  };

  put(["line_items", "lineItems", "items", "products", "order_items"], lineItems);
  put(["shipping_address", "shippingAddress", "address", "destination", "shipping"], order.shippingAddress);
  put(["external_id", "externalId", "reference", "reference_id", "order_id", "orderId", "external_order_id"], order.orderId);
  return args;
}

// ─── Product linking (add_my_product / import_my_product) ───────────────────
//
// Prerequisite for any Zendrop fulfillment: the products a customer buys must
// exist in the user's own Zendrop account ("my products"), not just the shared
// catalog. These tools import a catalog product into the account and return a
// "my product" id we store on the inventory record so we never re-import.

const PRODUCT_LINK_PATTERNS: RegExp[] = [
  /^import_my_product$/i,
  /^add_my_product$/i,
  /^link_my_product$/i,
  /^(import|add|link)_my_product/i,
];

export function pickProductLinkTool(tools: McpTool[]): McpTool | null {
  for (const pattern of PRODUCT_LINK_PATTERNS) {
    const hit = tools.find((t) => pattern.test(t.name));
    if (hit) return hit;
  }
  return null;
}

export interface ZendropLinkInput {
  providerProductId: string; // Zendrop CATALOG product id
  sku?: string;
  name?: string;
  price?: number;
  variantId?: string;
}

/** As with orders, only send keys the tool's own inputSchema declares. */
export function buildLinkArguments(tool: McpTool, p: ZendropLinkInput): Record<string, unknown> {
  const numId = (v?: string) =>
    v != null && /^\d+$/.test(String(v)) ? Number(v) : v;

  const properties = tool.inputSchema?.properties;
  if (!properties || typeof properties !== "object") {
    return { product_id: numId(p.providerProductId), variant_id: numId(p.variantId ?? p.providerProductId) };
  }

  const args: Record<string, unknown> = {};
  const put = (aliases: string[], value: unknown) => {
    if (value === undefined || value === null || value === "") return;
    const key = aliases.find((a) => a in properties);
    if (key) args[key] = value;
  };

  put(["catalog_product_id", "product_id", "productId", "id", "source_product_id"], numId(p.providerProductId));
  put(["variant_id", "variantId", "catalog_variant_id"], p.variantId ? numId(p.variantId) : undefined);
  put(["sku"], p.sku);
  put(["name", "title"], p.name);
  put(["price", "sell_price", "retail_price"], p.price);
  return args;
}

/**
 * Import ONE catalog product into the user's Zendrop account. Returns the
 * "my product" id on success. Best-effort by contract: callers should not let a
 * link failure abort a whole order — it just means fulfillment stays manual.
 */
export async function linkProductToZendrop(
  apiKey: string,
  p: ZendropLinkInput,
): Promise<{ linked: boolean; tool?: string; myProductId?: string; raw?: any; error?: string }> {
  const { tools, error } = await listZendropTools(apiKey);
  if (error) return { linked: false, error };
  const tool = pickProductLinkTool(tools);
  if (!tool) {
    return { linked: false, error: `This Zendrop token exposes no product-import tool. Available: ${tools.map((t) => t.name).join(", ")}.` };
  }
  const args = buildLinkArguments(tool, p);
  const res = await zendropFetch(apiKey, tool.name, args);
  if (!res.ok) return { linked: false, tool: tool.name, error: res.error || `HTTP ${res.status}` };
  if (res.data?.result?.isError) {
    return { linked: false, tool: tool.name, error: JSON.stringify(res.data.result?.content ?? res.data.result).slice(0, 300) };
  }
  const myProductId = extractOrderId(res.data) ?? undefined; // walks id/product_id/etc.
  return { linked: true, tool: tool.name, myProductId, raw: res.data };
}

/** Unwrap Zendrop's MCP envelope (structuredContent, or content[].text JSON). */
export function unwrapStructured(data: any): any {
  const sc = data?.result?.structuredContent;
  if (sc && typeof sc === "object") return sc;
  const content = data?.result?.content;
  if (Array.isArray(content)) {
    for (const part of content) {
      const txt = typeof part === "string" ? part : part?.text;
      if (txt) { try { return JSON.parse(txt); } catch { /* not json */ } }
    }
  }
  return data?.result ?? data;
}

/** The numeric internal store id `fulfill_order` needs, or null if none exists. */
export async function resolveZendropStoreId(apiKey: string): Promise<number | null> {
  const res = await zendropFetch(apiKey, "get_stores", {});
  if (!res.ok) return null;
  const structured = unwrapStructured(res.data);
  const stores = Array.isArray(structured?.stores) ? structured.stores : Array.isArray(structured) ? structured : [];
  const first = stores.find((s: any) => s && s.id != null);
  return first ? Number(first.id) : null;
}

/** Walk an arbitrary MCP response looking for something that names the order. */
export function extractOrderId(data: any, depth = 0, seen = new Set<any>()): string | null {
  if (data == null || depth > 6) return null;
  if (typeof data === "string") {
    const trimmed = data.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try { return extractOrderId(JSON.parse(trimmed), depth + 1, seen); } catch { return null; }
    }
    return null;
  }
  if (typeof data !== "object") return null;
  if (seen.has(data)) return null;
  seen.add(data);

  if (Array.isArray(data)) {
    for (const entry of data) {
      const found = extractOrderId(entry, depth + 1, seen);
      if (found) return found;
    }
    return null;
  }

  for (const key of ["order_id", "orderId", "id", "order_number", "orderNumber", "number"]) {
    const value = (data as any)[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  for (const key of ["result", "order", "data", "content", "structuredContent"]) {
    if (key in data) {
      const found = extractOrderId((data as any)[key], depth + 1, seen);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Send a paid order to Zendrop. Throws with an actionable message rather than
 * returning a soft failure, because a silent failure here is exactly what left
 * paid orders stranded at "pending".
 */
export async function submitZendropOrder(
  apiKey: string | undefined,
  order: ZendropOrderInput,
): Promise<{ providerOrderId: string; tool: string; sentArguments: Record<string, unknown>; raw: any }> {
  // The provider record may predate the secret (or have been saved without a
  // key), so fall back to the environment rather than failing needlessly.
  const key = (apiKey && apiKey.trim()) || resolveKey() || "";
  if (!key) throw new Error("No Zendrop API key is configured (set the ZENDROP_API_KEY secret).");

  const { tools, error } = await listZendropTools(key);
  if (error) throw new Error(`Could not list Zendrop MCP tools, so the order could not be submitted: ${error}`);

  const tool = pickOrderTool(tools);
  if (!tool) {
    const hasFulfill = tools.some((t) => /fulfill_order/i.test(t.name));
    const names = tools.map((t) => t.name).join(", ") || "(none returned)";
    // Zendrop's MCP has no create-order tool — orders can only be FULFILLED
    // (fulfill_order) once they already live inside a connected Zendrop store.
    // A standalone store's order cannot be injected through this API. This is a
    // PLATFORM LIMITATION, not a transient failure, so raise a typed error the
    // forward layer treats as "needs manual fulfillment" instead of a repeating
    // hard error that keeps re-alerting the operator.
    if (hasFulfill) {
      throw new ZendropManualFulfillmentError(
        `Products were imported into your Zendrop account, but Zendrop's API cannot place this order remotely — ` +
        `it only fulfills orders that already exist in a connected Zendrop store. Fulfill it once in the Zendrop ` +
        `dashboard (the products are linked and ready), or connect a sales channel Zendrop syncs so future orders ` +
        `flow in automatically.`,
      );
    }
    throw new Error(
      `Zendrop's MCP token does not expose an order-creation tool. Available tools: ${names}. ` +
      `Regenerate the access token at app.zendrop.com/mcp/v1 with order write access enabled.`,
    );
  }

  const sentArguments = buildOrderArguments(tool, order);
  const res = await zendropFetch(key, tool.name, sentArguments);
  if (!res.ok) {
    throw new Error(`Zendrop rejected the order via "${tool.name}": ${res.error || `HTTP ${res.status}`}`);
  }
  // MCP reports tool-level failure as a 200 with result.isError.
  if (res.data?.result?.isError) {
    const detail = JSON.stringify(res.data.result?.content ?? res.data.result).slice(0, 400);
    throw new Error(`Zendrop tool "${tool.name}" returned an error: ${detail}`);
  }

  const providerOrderId = extractOrderId(res.data);
  if (!providerOrderId) {
    throw new Error(
      `Zendrop accepted the "${tool.name}" call but returned no order id, so the order cannot be tracked. ` +
      `Response: ${JSON.stringify(res.data).slice(0, 400)}`,
    );
  }
  return { providerOrderId, tool: tool.name, sentArguments, raw: res.data };
}

/**
 * Pull a product array out of whatever shape the Zendrop MCP response uses.
 * MCP servers commonly wrap the real payload in a JSON-RPC-style envelope
 * (`result`, or `content: [{ type: "text", text: "<json string>" }]`), so we
 * unwrap those before looking for the products array.
 */
export function extractProducts(data: any): any[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === "string") {
    try { return extractProducts(JSON.parse(data)); } catch { return []; }
  }
  if (typeof data !== "object") return [];

  // JSON-RPC 2.0 wrapper: { jsonrpc, id, result: {...} } → unwrap result first.
  if (data.result !== undefined && data.result !== null) {
    const fromResult = extractProducts(data.result);
    if (fromResult.length) return fromResult;
  }

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
export function normalize(raw: any, markupType: string, markupValue: number): NormalizedProduct {
  const cost = num(raw.cost ?? raw.price ?? raw.wholesale_price ?? raw.variants?.[0]?.cost ?? raw.variants?.[0]?.price);
  // Capture a per-item shipping cost if the feed happens to include one.
  const shippingCost = num(raw.shipping_cost ?? raw.shipping_price ?? raw.shipping_fee ?? raw.shipping ?? raw.variants?.[0]?.shipping_cost ?? raw.variants?.[0]?.shipping_price ?? 0);
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
    shippingCost,
    stock: num(raw.stock ?? raw.inventory ?? raw.quantity ?? raw.variants?.[0]?.inventory_quantity, 100),
    images: cleanImages,
    category: String(raw.category ?? raw.product_type ?? raw.tags?.[0] ?? "General"),
    rating: num(raw.rating ?? raw.average_rating, 0),
    lastSynced: new Date().toISOString(),
  };
}

export async function loadServerConfig(): Promise<{ markupType: string; markupValue: number; storeId?: string; lastSync?: string; productCount?: number }> {
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
export async function importTopProducts(apiKey: string, limit: number): Promise<{ imported: number; sample: NormalizedProduct[]; endpoint: string }> {
  const { markupType, markupValue } = await loadServerConfig();

  // Pull TWO Zendrop feeds and merge them:
  //  • get_catalog_trending_products → the best sellers (small set, ~5). These
  //    get flagged isFeatured so they surface as "Top Sellers" in the store.
  //  • get_catalog_products          → the broad catalog (supports a limit), so
  //    the store has real inventory volume, not just the 5 trending items.
  const trendingRes = await zendropFetch(apiKey, "get_catalog_trending_products", { filters: {} });

  // Zendrop caps a single get_catalog_products call at ~60, so page through
  // until we've collected `limit` products (or run out / hit a safety cap).
  const catalogRaw: any[] = [];
  const PAGE_SIZE = 50;
  let lastCatalogErr: string | undefined;
  let lastCatalogUrl = "";
  let catalogOk = false;
  for (let page = 1; catalogRaw.length < limit && page <= 20; page++) {
    const res = await zendropFetch(apiKey, "get_catalog_products", { limit: PAGE_SIZE, page });
    lastCatalogUrl = res.url;
    if (!res.ok) { lastCatalogErr = res.error; break; }
    catalogOk = true;
    const pageProducts = extractProducts(res.data);
    if (pageProducts.length === 0) break; // no more pages
    catalogRaw.push(...pageProducts);
  }

  if (!trendingRes.ok && !catalogOk) {
    const err = lastCatalogErr || trendingRes.error || "no response";
    throw new Error(`Zendrop product fetch failed: ${err}`);
  }

  // Best-selling ids (for featured flagging).
  const trendingRaw = trendingRes.ok ? extractProducts(trendingRes.data) : [];
  const trendingIds = new Set(trendingRaw.map((r: any) => String(r?.id)));

  // Merge trending + catalog, dedupe by product id, cap at `limit`.
  const mergedMap = new Map<string, any>();
  for (const r of [...trendingRaw, ...catalogRaw]) {
    const id = String(r?.id ?? "");
    if (id && !mergedMap.has(id)) mergedMap.set(id, r);
  }
  const raw = [...mergedMap.values()].slice(0, limit);

  const normalized = raw
    .map((r) => normalize(r, markupType, markupValue))
    .filter((p) => p.name);

  const nowIso = new Date().toISOString();
  const writes: Promise<void>[] = [];
  let blockedCount = 0;
  let importedCount = 0;
  for (const p of normalized) {
    const isFeatured = trendingIds.has(String(p.providerProductId));

    // Storefront product record. The public store's GET /products reads the
    // `product_` prefix (same as canonical vendor products), so imported
    // Zendrop items MUST be written there to appear in the live store.
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
      shippingCost: p.shippingCost,
      inventoryQuantity: p.stock,
      trackInventory: true,
      images: p.images,
      primaryImage: p.images[0] || "",
      isActive: true,
      isFeatured,
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

    // Adult/sexual-wellness guard: if the owner's filter is on and this looks
    // like an adult product (and isn't owner-allowed), quarantine it for review
    // instead of publishing it to the store — and skip both writes.
    if (await screenAndQuarantine(storeProduct, "zendrop")) {
      blockedCount += 1;
      continue;
    }

    // Dropshipper inventory record — used by the dropshipper module for
    // order-forwarding, sync tracking, and the Zendrop page's catalog view.
    writes.push(kv.set(`${INVENTORY_KEY_PREFIX}:${p.sku}`, JSON.stringify(p)));
    writes.push(kv.set(`product_${storeId}`, storeProduct));
    importedCount += 1;
  }
  await Promise.all(writes);

  await config.updateLastSync();
  await saveServerConfig({ lastSync: new Date().toLocaleString(), productCount: importedCount });

  const endpoint = lastCatalogUrl || trendingRes.url;
  return { imported: importedCount, blocked: blockedCount, sample: normalized.slice(0, 3), endpoint };
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
        importResult = await importTopProducts(apiKey, num(body.limit, 100));
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
    const result = await importTopProducts(apiKey, num(body.limit, 100));
    return c.json({ success: true, imported: result.imported, sample: result.sample, endpoint: result.endpoint });
  } catch (error) {
    console.log(`[Zendrop] Sync error: ${error}`);
    return c.json({ success: false, error: `Zendrop sync error: ${error}` }, 500);
  }
});

/**
 * POST /zendrop/import-more
 * Import ADDITIONAL Zendrop products on demand. importTopProducts pages through
 * the catalog up to `limit` and de-dupes on write, so requesting a larger batch
 * pulls in more of the catalog. Body: { apiKey?, limit? }
 */
zendropRouter.post(`${PREFIX}/zendrop/import-more`, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const apiKey = resolveKey(body.apiKey);
    if (!apiKey) {
      return c.json({ success: false, error: "No Zendrop API key available." }, 400);
    }
    const limit = Math.min(500, Math.max(1, num(body.limit, 50)));
    const result = await importTopProducts(apiKey, limit);
    return c.json({ success: true, imported: result.imported, sample: result.sample, endpoint: result.endpoint });
  } catch (error) {
    console.log(`[Zendrop] import-more error: ${error}`);
    return c.json({ success: false, error: `Zendrop import-more error: ${error}` }, 500);
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
 * into the LIVE store catalog (`product_` — what the public store reads).
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
      shippingCost: (source as any).shippingCost ?? 0,
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

    // Write under the `product_` prefix — that's what the public store's
    // GET /products actually reads. (`store_product:` was a dead prefix nothing
    // renders, which is why the "Send to store" button appeared to do nothing.)
    await kv.set(`product_${id}`, product);
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

/**
 * Load one imported inventory record by its supplier SKU.
 */
async function getInventoryRecord(sku: string): Promise<any | null> {
  const raw = await kv.get(`${INVENTORY_KEY_PREFIX}:${sku}`);
  return raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null;
}

/**
 * Import a product into the user's Zendrop account so it's ready to fulfill.
 * Idempotent: if we already stored a myProductId for this SKU, we skip the call.
 * Body: { sku? } | { providerProductId?, sku?, name?, price?, variantId?, force? }
 */
export async function linkInventoryProduct(
  apiKey: string,
  input: { sku?: string; providerProductId?: string; name?: string; price?: number; variantId?: string; force?: boolean },
): Promise<{ success: boolean; linked?: boolean; skipped?: boolean; myProductId?: string; tool?: string; error?: string }> {
  let record: any = null;
  if (input.sku) record = await getInventoryRecord(input.sku);

  const providerProductId = String(input.providerProductId || record?.providerProductId || "");
  if (!providerProductId) {
    return { success: false, error: "No Zendrop catalog product id available to import (pass providerProductId or a known sku)." };
  }

  // Already linked — nothing to do unless forced.
  if (!input.force && record?.zendropMyProductId) {
    return { success: true, skipped: true, myProductId: String(record.zendropMyProductId) };
  }

  const result = await linkProductToZendrop(apiKey, {
    providerProductId,
    sku: input.sku || record?.sku,
    name: input.name || record?.name,
    price: input.price ?? record?.price,
    variantId: input.variantId,
  });

  if (!result.linked) return { success: false, error: result.error, tool: result.tool };

  // Persist the returned my-product id on the inventory record so order
  // forwarding can reference it and we never re-import.
  if (record && result.myProductId) {
    record.zendropMyProductId = result.myProductId;
    record.zendropLinkedAt = new Date().toISOString();
    await kv.set(`${INVENTORY_KEY_PREFIX}:${record.sku}`, JSON.stringify(record));
  }

  return { success: true, linked: true, myProductId: result.myProductId, tool: result.tool };
}

/**
 * POST /zendrop/link-product — import one product into the Zendrop account.
 * Body: { sku } or { providerProductId, name?, price?, variantId? }
 */
zendropRouter.post(`${PREFIX}/zendrop/link-product`, async (c) => {
  try {
    const apiKey = resolveKey();
    if (!apiKey) return c.json({ success: false, error: "No ZENDROP_API_KEY configured." }, 400);
    const body = await c.req.json().catch(() => ({}));
    const result = await linkInventoryProduct(apiKey, body);
    return c.json(result, result.success ? 200 : 502);
  } catch (error: any) {
    console.log(`[Zendrop] link-product error: ${error?.message || error}`);
    return c.json({ success: false, error: error?.message || String(error) }, 500);
  }
});

/**
 * POST /zendrop/link-all — import every not-yet-linked inventory product.
 */
zendropRouter.post(`${PREFIX}/zendrop/link-all`, async (c) => {
  try {
    const apiKey = resolveKey();
    if (!apiKey) return c.json({ success: false, error: "No ZENDROP_API_KEY configured." }, 400);
    const inventory = await kv.getByPrefix(INVENTORY_KEY_PREFIX);
    let linked = 0, skipped = 0, failed = 0;
    const errors: string[] = [];
    for (const raw of inventory as any[]) {
      const p = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!p?.sku) continue;
      const r = await linkInventoryProduct(apiKey, { sku: p.sku });
      if (!r.success) { failed += 1; if (errors.length < 5) errors.push(`${p.sku}: ${r.error}`); }
      else if (r.skipped) skipped += 1;
      else linked += 1;
    }
    return c.json({ success: true, linked, skipped, failed, total: (inventory as any[]).length, errors });
  } catch (error: any) {
    console.log(`[Zendrop] link-all error: ${error?.message || error}`);
    return c.json({ success: false, error: error?.message || String(error) }, 500);
  }
});

/**
 * GET /zendrop/debug
 * Flexible diagnostic probe (all via GET so it works without POST access):
 *   ?probe=list              → MCP tools/list, returns available tool names
 *   ?tool=<name>&args=<json> → tools/call with the given tool + JSON arguments
 *   (default)                → get_catalog_trending_products with { filters: {} }
 * Reports the RAW response shape so we can see exactly why extraction returns
 * 0 products (wrong tool name, envelope key, auth error, etc.).
 */
zendropRouter.get(`${PREFIX}/zendrop/debug`, async (c) => {
  try {
    const apiKey = resolveKey();
    if (!apiKey) {
      return c.json({ success: false, error: "No ZENDROP_API_KEY configured" }, 400);
    }

    const probe = c.req.query("probe");
    const tool = c.req.query("tool");
    let argsObj: Record<string, unknown> = {};
    const argsRaw = c.req.query("args");
    if (argsRaw) { try { argsObj = JSON.parse(argsRaw); } catch { /* ignore */ } }

    let result;
    if (probe === "list") {
      result = await mcpCall(apiKey, "tools/list", {});
    } else if (tool) {
      result = await zendropFetch(apiKey, tool, argsObj);
    } else {
      result = await zendropFetch(apiKey, "get_catalog_trending_products", { filters: {} });
    }

    const data = result.data;
    const extracted = extractProducts(data);
    const firstProduct = extracted[0] || null;

    // Surface MCP tool names when listing.
    const toolNames = Array.isArray(data?.result?.tools)
      ? data.result.tools.map((t: any) => t?.name)
      : undefined;

    // When asked, surface a single tool's FULL input schema so we can wire
    // against Zendrop's real contract instead of guessing argument shapes.
    const schemaFor = c.req.query("schema");
    let toolSchema: any = undefined;
    if (probe === "list" && schemaFor && Array.isArray(data?.result?.tools)) {
      const hit = data.result.tools.find((t: any) => t?.name === schemaFor);
      toolSchema = hit ? { name: hit.name, description: hit.description, inputSchema: hit.inputSchema ?? hit.input_schema } : null;
    }

    return c.json({
      success: true,
      mode: probe === "list" ? "tools/list" : tool ? `tools/call:${tool}` : "tools/call:get_catalog_trending_products",
      httpStatus: result.status,
      fetchOk: result.ok,
      fetchError: result.error || null,
      parsedAsJson: data != null && typeof data === "object",
      topLevelKeys: data && typeof data === "object" ? Object.keys(data) : [],
      toolNames,
      toolSchema,
      extractedProductCount: extracted.length,
      firstProductKeys: firstProduct && typeof firstProduct === "object" ? Object.keys(firstProduct) : [],
      firstProduct,
      textPreview: typeof data === "string"
        ? data.slice(0, 800)
        : JSON.stringify(data).slice(0, 800),
    });
  } catch (error) {
    console.log(`[Zendrop] Debug error: ${error}`);
    return c.json({ success: false, error: `Zendrop debug error: ${error}` }, 500);
  }
});

/**
 * Which MCP tool will an order actually be sent to?
 *
 * Order submission discovers the tool at runtime, so this exposes the choice
 * and its input schema for diagnosis without pushing a real order through.
 */
zendropRouter.get(`${PREFIX}/zendrop/order-tool`, async (c) => {
  try {
    const apiKey = resolveKey();
    if (!apiKey) return c.json({ success: false, error: "No ZENDROP_API_KEY configured" }, 400);

    const { tools, error } = await listZendropTools(apiKey, c.req.query("refresh") === "1");
    if (error) return c.json({ success: false, error, tools: [] }, 502);

    const picked = pickOrderTool(tools);
    return c.json({
      success: true,
      orderToolFound: Boolean(picked),
      orderTool: picked ? { name: picked.name, description: picked.description, inputSchema: picked.inputSchema } : null,
      availableTools: tools.map((t) => t.name),
      message: picked
        ? `Orders will be submitted via the "${picked.name}" MCP tool.`
        : `This MCP token exposes no order-creation tool, so orders cannot be sent to Zendrop. Regenerate the token at app.zendrop.com/mcp/v1 with order write access enabled.`,
    });
  } catch (error: any) {
    console.log(`[zendrop/order-tool] error: ${error?.message || error}`);
    return c.json({ success: false, error: error?.message || String(error) }, 500);
  }
});

export { zendropRouter };
export default zendropRouter;
