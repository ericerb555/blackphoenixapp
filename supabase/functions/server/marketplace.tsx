/**
 * Marketplace Module
 *
 * Business-wide digital product catalog powering the Digital Storefront,
 * Marketplace Admin, Ad Creator, and Property Marketplace. Products are the
 * source of truth here; the frontends cache to localStorage only as a fallback.
 *
 * KV keys:
 *   marketplace_product:{id}   → product record (stored as sent by admin)
 *   marketplace_product_index  → string[] of product ids
 *   store_order:{id}           → order record (shared with growth-commerce)
 *
 * Checkout (Stripe) lives in index.tsx on the TBPCO e-commerce account; this
 * module owns the catalog and reads back the orders it records.
 */
import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const router = new Hono();
const PREFIX = "/make-server-3eae23a6";
const PRODUCT_PREFIX = "marketplace_product:";
const PRODUCT_INDEX = "marketplace_product_index";
const ORDER_PREFIX = "store_order:";

// Private storage bucket for AI-generated digital-product cover images. Buckets
// are private, so we hand the frontend freshly-signed URLs (see signCover).
const COVER_BUCKET = "make-3eae23a6-marketplace";
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function ensureCoverBucket(): Promise<void> {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some((b) => b.name === COVER_BUCKET)) {
      const { error } = await supabase.storage.createBucket(COVER_BUCKET, { public: false });
      if (error && (error as any).statusCode !== "409" && !/already exists/i.test(error.message || "")) {
        console.log("Failed to create marketplace cover bucket:", error);
      }
    }
  } catch (err) {
    console.log("Error ensuring marketplace cover bucket:", err);
  }
}
ensureCoverBucket();

// Signed URLs expire, so we never trust a stored coverImage URL — we re-sign the
// stored storage path on read. Products without a generated cover are untouched.
async function signCover(product: any): Promise<any> {
  const path = product?.coverImagePath;
  if (!path) return product;
  try {
    const { data, error } = await supabase.storage.from(COVER_BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);
    if (error || !data?.signedUrl) return product;
    return { ...product, coverImage: data.signedUrl };
  } catch {
    return product;
  }
}

async function getAllProducts(): Promise<any[]> {
  const ids = ((await kv.get(PRODUCT_INDEX)) as string[] | null) || [];
  if (ids.length === 0) return [];
  const rows = await kv.mget(ids.map((i) => `${PRODUCT_PREFIX}${i}`));
  return (rows as any[]).filter(Boolean);
}

async function saveProduct(p: any): Promise<void> {
  await kv.set(`${PRODUCT_PREFIX}${p.id}`, p);
  const ids = ((await kv.get(PRODUCT_INDEX)) as string[] | null) || [];
  if (!ids.includes(p.id)) {
    ids.push(p.id);
    await kv.set(PRODUCT_INDEX, ids);
  }
}

// ─── Products ─────────────────────────────────────────────────────────────────

// GET catalog. ?admin=true returns everything (incl. hidden); otherwise only visible.
router.get(`${PREFIX}/marketplace/products`, async (c) => {
  try {
    const admin = c.req.query("admin") === "true";
    let products = await getAllProducts();
    if (!admin) products = products.filter((p) => p.visible !== false);
    products.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    // Re-sign any AI-generated cover images so their URLs are always fresh.
    products = await Promise.all(products.map(signCover));
    return c.json({ products });
  } catch (err) {
    console.log("Error loading marketplace products:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// Seed / bulk replace the catalog.
router.post(`${PREFIX}/marketplace/products/seed`, async (c) => {
  try {
    const { products } = await c.req.json();
    if (!Array.isArray(products)) {
      return c.json({ error: "products array is required" }, 400);
    }
    const ids: string[] = [];
    for (const p of products) {
      const id = p.id || `prod-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const record = { ...p, id };
      await kv.set(`${PRODUCT_PREFIX}${id}`, record);
      ids.push(id);
    }
    await kv.set(PRODUCT_INDEX, ids);
    return c.json({ seeded: ids.length });
  } catch (err) {
    console.log("Error seeding marketplace products:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// ─── AI cover-image generation ──────────────────────────────────────────────
// Generate a cover image for a digital product with OpenAI, persist it to
// private storage, and (if a productId is given) attach it to the product.
// Returns { url, path }. The URL is a short-lived signed URL for immediate
// preview; the durable reference is `path`, which the catalog re-signs on read.
router.post(`${PREFIX}/marketplace/generate-image`, async (c) => {
  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return c.json({ error: "AI image generation is not configured (OPENAI_API_KEY missing)." }, 500);

    const body = await c.req.json().catch(() => ({}));
    const productId = body.productId ? String(body.productId) : "";
    const title = String(body.title || "").trim();
    const category = String(body.category || "digital product").trim();
    const description = String(body.description || body.subtitle || "").trim();
    const style = String(body.style || "").trim();
    const custom = String(body.prompt || "").trim();

    if (!custom && !title) return c.json({ error: "A product title or a custom prompt is required." }, 400);

    // A cover for a DIGITAL product: no physical mockup, clean marketable art.
    const prompt = custom || [
      `Professional digital product cover art for a ${category} titled "${title}".`,
      description ? `The product is about: ${description}.` : "",
      style ? `Visual style: ${style}.` : "Visual style: modern, premium, clean, bold typography-friendly composition with strong focal point.",
      "Suitable as an e-commerce thumbnail, high contrast, no watermark, no gibberish text, centered subject, square framing.",
    ].filter(Boolean).join(" ");

    // Request raw bytes (b64) so we can persist them — hosted URLs expire.
    const aiRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "dall-e-3", prompt, n: 1, size: "1024x1024", quality: "standard", response_format: "b64_json" }),
    });
    if (!aiRes.ok) {
      const err = await aiRes.text();
      console.log("OpenAI image generation failed:", err);
      return c.json({ error: `AI image generation failed: ${err}` }, 502);
    }
    const aiData = await aiRes.json();
    const b64 = aiData?.data?.[0]?.b64_json;
    const revisedPrompt = aiData?.data?.[0]?.revised_prompt || prompt;
    if (!b64) return c.json({ error: "AI returned no image data." }, 502);

    // Decode base64 → bytes and upload to the private bucket.
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
    const path = `covers/${productId || "unassigned"}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
    const { error: upErr } = await supabase.storage.from(COVER_BUCKET).upload(path, bytes, { contentType: "image/png", upsert: true });
    if (upErr) {
      console.log("Cover image upload failed:", upErr);
      return c.json({ error: `Could not store the generated image: ${upErr.message}` }, 500);
    }
    const { data: signed } = await supabase.storage.from(COVER_BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);
    const url = signed?.signedUrl || "";

    // Attach to the product record when one was supplied.
    if (productId) {
      const existing = (await kv.get(`${PRODUCT_PREFIX}${productId}`)) as any;
      if (existing) {
        await kv.set(`${PRODUCT_PREFIX}${productId}`, { ...existing, coverImage: url, coverImagePath: path, updatedAt: new Date().toISOString() });
      }
    }

    return c.json({ success: true, url, path, prompt: revisedPrompt });
  } catch (err) {
    console.log("Error generating marketplace cover image:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// Create a product.
router.post(`${PREFIX}/marketplace/products`, async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || `prod-${Date.now()}`;
    const record = { ...body, id };
    await saveProduct(record);
    return c.json(record);
  } catch (err) {
    console.log("Error creating marketplace product:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// Update a product (merges partial over existing).
router.put(`${PREFIX}/marketplace/products/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const existing = (await kv.get(`${PRODUCT_PREFIX}${id}`)) as any;
    if (!existing) return c.json({ error: "Product not found" }, 404);
    const updated = { ...existing, ...body, id };
    await kv.set(`${PRODUCT_PREFIX}${id}`, updated);
    return c.json(updated);
  } catch (err) {
    console.log("Error updating marketplace product:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// Delete a product.
router.delete(`${PREFIX}/marketplace/products/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`${PRODUCT_PREFIX}${id}`);
    const ids = ((await kv.get(PRODUCT_INDEX)) as string[] | null) || [];
    await kv.set(PRODUCT_INDEX, ids.filter((x) => x !== id));
    return c.json({ success: true });
  } catch (err) {
    console.log("Error deleting marketplace product:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// ─── Orders ───────────────────────────────────────────────────────────────────

router.get(`${PREFIX}/marketplace/orders`, async (c) => {
  try {
    const orders = (await kv.getByPrefix(ORDER_PREFIX)) || [];
    orders.sort((a: any, b: any) =>
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    return c.json({ orders });
  } catch (err) {
    console.log("Error loading marketplace orders:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// NOTE: Checkout for the marketplace lives in index.tsx
// (POST /marketplace/checkout) and uses the TBPCO e-commerce Stripe account so
// every storefront purchase bills the same account as the rest of the store.
// It records the pending order under the same `store_order:` prefix this module
// reads from, so purchases still appear in GET /marketplace/orders above.

export default router;
