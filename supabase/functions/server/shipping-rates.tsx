/**
 * Live shipping-rate puller for dropship products.
 *
 * Zendrop's public catalog feed (get_catalog_products / trending) does NOT
 * include a per-item shipping cost. Zendrop's developer surface is an MCP
 * JSON-RPC server, though, so the set of callable tools is DISCOVERABLE at
 * runtime via `tools/list`. This module:
 *
 *   1. lists the available MCP tools and finds any shipping-rate tool,
 *   2. calls it per product to get a real per-item shipping cost, and
 *   3. writes that cost back onto the stored product as `shippingCost`
 *      (the same field the pricing desk reads to compute landed cost/profit).
 *
 * If Zendrop's account/plan doesn't expose a shipping tool, the refresh reports
 * that clearly so the owner knows to keep entering shipping manually — we never
 * fabricate a number.
 *
 * Routes (admin only):
 *   GET  /make-server-3eae23a6/shipping-rates/tools    → discovered MCP tool names
 *   POST /make-server-3eae23a6/shipping-rates/refresh  → pull + persist live shipping
 */
import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import * as kv from "./kv_store.tsx";
import { resolveKey, num } from "./zendrop.tsx";
import { invalidateProductsCache } from "./ecommerce-products.tsx";

const shippingRatesRouter = new Hono();
const PREFIX = "/make-server-3eae23a6";
const MCP_ENDPOINT = "https://app.zendrop.com/mcp/v1";

async function requireAdmin(c: any) {
  const accessToken = c.req.header("Authorization")?.split(" ")[1];
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const { data: { user }, error } = await supabase.auth.getUser(accessToken ?? "");
  if (error || !user?.id) return { ok: false, error: `Authorization error while pulling shipping rates: ${error?.message || "no user"}`, status: 401 };
  const perms = (await kv.get(`user_permissions:${user.id}`)) as any;
  const role = perms?.role || user.user_metadata?.role;
  if (role !== "admin" && role !== "owner" && role !== "super_admin") {
    return { ok: false, error: "Administrator access is required to refresh shipping rates.", status: 403 };
  }
  return { ok: true };
}

/** Raw JSON-RPC 2.0 call to Zendrop's MCP endpoint (handles SSE-wrapped replies). */
async function mcp(apiKey: string, method: string, params: Record<string, unknown> = {}) {
  try {
    const res = await fetch(MCP_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
    });
    const text = await res.text().catch(() => "");
    const jsonText = text.includes("data:")
      ? text.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("")
      : text;
    let data: any = null;
    try { data = jsonText ? JSON.parse(jsonText) : null; } catch { /* non-json */ }
    if (!res.ok || data?.error) {
      return { ok: false, status: res.status, data, error: data?.error?.message || text.slice(0, 200) || `HTTP ${res.status}` };
    }
    return { ok: true, status: res.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: null, error: String(e) };
  }
}

/** Unwrap an MCP envelope ({result}, {content:[{text}]}) into a plain JS value. */
function unwrapMcp(data: any): any {
  if (data == null) return null;
  if (typeof data === "string") { try { return unwrapMcp(JSON.parse(data)); } catch { return data; } }
  if (Array.isArray(data)) return data;
  if (typeof data !== "object") return data;
  if (data.result !== undefined && data.result !== null) return unwrapMcp(data.result);
  if (Array.isArray(data.content)) {
    for (const part of data.content) {
      const txt = typeof part === "string" ? part : part?.text;
      if (txt) { const inner = unwrapMcp(txt); if (inner != null) return inner; }
    }
  }
  return data;
}

/**
 * Deep-search a response for a per-item shipping cost. Looks for numeric values
 * on keys that name a shipping fee/rate/cost/price, including nested objects
 * that carry { amount | price | cost | rate | value }.
 */
function findShippingAmount(node: any, depth = 0): number | null {
  if (node == null || depth > 6) return null;
  if (Array.isArray(node)) {
    for (const item of node) { const v = findShippingAmount(item, depth + 1); if (v != null) return v; }
    return null;
  }
  if (typeof node !== "object") return null;
  const shipKey = /(^|_)(ship|shipping|freight|fulfil)/i;
  const costKey = /(amount|price|cost|rate|fee|value|total)/i;
  for (const [key, val] of Object.entries(node)) {
    if (shipKey.test(key)) {
      if (typeof val === "number" && Number.isFinite(val) && val >= 0) return val;
      if (typeof val === "string" && val.trim() !== "" && Number.isFinite(Number(val))) return Number(val);
      if (val && typeof val === "object" && !Array.isArray(val)) {
        for (const [k2, v2] of Object.entries(val as any)) {
          if (costKey.test(k2) && (typeof v2 === "number" || (typeof v2 === "string" && Number.isFinite(Number(v2))))) {
            return Number(v2);
          }
        }
      }
    }
  }
  // Recurse into children as a fallback.
  for (const val of Object.values(node)) {
    if (val && typeof val === "object") { const v = findShippingAmount(val, depth + 1); if (v != null) return v; }
  }
  return null;
}

/** Discover MCP tool names, returning those that look shipping-related first. */
async function discoverTools(apiKey: string): Promise<{ all: string[]; shipping: string[]; error?: string }> {
  const res = await mcp(apiKey, "tools/list", {});
  if (!res.ok) return { all: [], shipping: [], error: res.error };
  const tools = res.data?.result?.tools || res.data?.tools || [];
  const all: string[] = Array.isArray(tools) ? tools.map((t: any) => String(t?.name || "")).filter(Boolean) : [];
  const shipping = all.filter((n) => /ship|freight|rate|fulfil|delivery/i.test(n));
  return { all, shipping };
}

/** Try each candidate tool for one product; return the first real shipping cost.
 *  Works for both dedicated shipping-rate tools AND product-detail tools that
 *  carry a shipping figure somewhere inside their payload. */
async function fetchLiveShipping(apiKey: string, tools: string[], product: any): Promise<number | null> {
  const productId = String(product.providerProductId || product.sku || product.id || "");
  const sku = String(product.sku || "");
  const variantId = String(product.variantId || product.providerVariantId || sku || "");
  // Zendrop tools ignore unknown args, so pass every id + a FULL US destination
  // address (real rate quotes usually require a zip/state, not just a country).
  const args = {
    product_id: productId, productId, id: productId, sku,
    variant_id: variantId, variantId, quantity: 1, qty: 1,
    destination_country: "US", country: "US", country_code: "US", destination: "US",
    address: { country: "US", country_code: "US", state: "CA", province: "CA", city: "Los Angeles", zip: "90001", postal_code: "90001" },
    shipping_address: { country: "US", state: "CA", city: "Los Angeles", zip: "90001" },
    zip: "90001", postal_code: "90001", state: "CA", province: "CA", city: "Los Angeles",
  } as Record<string, unknown>;
  for (const tool of tools) {
    const res = await mcp(apiKey, "tools/call", { name: tool, arguments: args });
    if (!res.ok) continue;
    const payload = unwrapMcp(res.data);
    const amount = findShippingAmount(payload);
    if (amount != null && amount >= 0) return Math.round(amount * 100) / 100;
  }
  return null;
}

/** GET tools — surface what Zendrop actually exposes (helps confirm capability). */
shippingRatesRouter.get(`${PREFIX}/shipping-rates/tools`, async (c) => {
  const admin = await requireAdmin(c);
  if (!admin.ok) return c.json({ success: false, error: admin.error }, admin.status);
  const apiKey = resolveKey();
  if (!apiKey) return c.json({ success: false, error: "No ZENDROP_API_KEY configured." }, 400);
  const discovered = await discoverTools(apiKey);
  return c.json({ success: true, ...discovered, hasShippingTool: discovered.shipping.length > 0 });
});

/**
 * POST refresh — pull live per-item shipping for every Zendrop product and
 * persist it as `shippingCost`. Body/query: { limit?: number }.
 */
shippingRatesRouter.post(`${PREFIX}/shipping-rates/refresh`, async (c) => {
  try {
    const admin = await requireAdmin(c);
    if (!admin.ok) return c.json({ success: false, error: admin.error }, admin.status);

    const apiKey = resolveKey();
    if (!apiKey) return c.json({ success: false, error: "No ZENDROP_API_KEY configured — connect Zendrop first." }, 400);

    const body = await c.req.json().catch(() => ({} as any));
    const limit = Math.max(1, Math.min(500, num(body.limit ?? c.req.query("limit"), 250)));

    const { all, shipping, error: toolErr } = await discoverTools(apiKey);
    if (toolErr) return c.json({ success: false, error: `Could not list Zendrop tools: ${toolErr}` }, 502);

    // Prefer dedicated shipping tools, but also fall back to product-detail /
    // quote / order tools — Zendrop frequently returns the shipping figure
    // nested inside a product or quote payload rather than in a "shipping" tool.
    const detailTools = all.filter((n) => /product|item|detail|get|quote|estimate|order|checkout|calc/i.test(n) && !shipping.includes(n));
    const candidateTools = [...shipping, ...detailTools];
    if (candidateTools.length === 0) {
      return c.json({
        success: false,
        noShippingTool: true,
        availableTools: all,
        error: "Zendrop's API exposes no tools we can query for shipping. Keep entering shipping manually on the pricing page, or ask Zendrop to enable shipping-rate/product API access.",
      }, 200);
    }

    // Collect Zendrop store products from both KV prefixes, keyed to their key.
    const canonical = ((await kv.getByPrefix("product_")) || []) as any[];
    const live = ((await kv.getByPrefix("live_product_")) || []) as any[];
    const targets: { key: string; product: any }[] = [];
    for (const p of canonical) if (p && (p.source === "zendrop" || p.vendorId === "zendrop")) targets.push({ key: `product_${p.id}`, product: p });
    for (const p of live) if (p && (p.source === "zendrop" || p.vendorId === "zendrop")) targets.push({ key: `live_product_${p.id}`, product: p });

    const slice = targets.slice(0, limit);
    let updated = 0, missing = 0;
    const sample: { name: string; shippingCost: number }[] = [];
    for (const { key, product } of slice) {
      const cost = await fetchLiveShipping(apiKey, candidateTools, product);
      if (cost == null) { missing += 1; continue; }
      product.shippingCost = cost;
      product.shippingUpdatedAt = new Date().toISOString();
      await kv.set(key, product);
      updated += 1;
      if (sample.length < 5) sample.push({ name: product.name, shippingCost: cost });
    }
    if (updated > 0) invalidateProductsCache();

    return c.json({
      success: true,
      usedShippingTool: shipping.length > 0,
      shippingTools: shipping,
      candidateTools,
      availableTools: all,
      scanned: slice.length,
      updated,
      missing,
      sample,
      note: updated === 0
        ? "Queried Zendrop but couldn't find a shipping figure in any response. See availableTools — if there's no shipping/quote tool, Zendrop isn't exposing this on your plan."
        : undefined,
    });
  } catch (err) {
    console.log(`[shipping-rates] refresh error: ${err}`);
    return c.json({ success: false, error: `Failed to refresh shipping rates: ${err}` }, 500);
  }
});

export default shippingRatesRouter;
