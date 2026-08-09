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

// Private bucket for the actual deliverables (the PDF/DOCX/XLSX a buyer paid
// for). Separate from covers because covers are safe to hand out and these are
// not — a download URL is only ever minted after a paid order is verified.
const FILE_BUCKET = "make-3eae23a6-product-files";
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const DOWNLOAD_TTL = 60 * 10; // 10 minutes — long enough to download, short enough not to be shareable

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

async function ensureFileBucket(): Promise<void> {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some((b) => b.name === FILE_BUCKET)) {
      const { error } = await supabase.storage.createBucket(FILE_BUCKET, { public: false });
      if (error && (error as any).statusCode !== "409" && !/already exists/i.test(error.message || "")) {
        console.log("Failed to create marketplace product-file bucket:", error);
      }
    }
  } catch (err) {
    console.log("Error ensuring marketplace product-file bucket:", err);
  }
}

/**
 * Storage paths are secrets — anyone holding one could be handed a signed URL.
 * The public catalog therefore never ships the `files` array; it ships only the
 * counts and formats a shopper legitimately needs to see before buying.
 */
function stripFiles(product: any): any {
  const files = Array.isArray(product?.files) ? product.files : [];
  const { files: _omit, ...rest } = product || {};
  return {
    ...rest,
    fileCount: files.length,
    downloadable: files.length > 0,
    fileSizeBytes: files.reduce((sum: number, f: any) => sum + (Number(f?.size) || 0), 0),
  };
}

/**
 * Has this email actually paid for this product?
 *
 * Entitlement is derived from the `store_order:` records the Stripe completion
 * handler marks `paid` — never from anything the client sends. (The storefront
 * also keeps a localStorage list, but that is a UI convenience only and is not
 * trusted here.)
 */
async function findPaidOrder(email: string, productId: string): Promise<any | null> {
  const normalised = String(email || "").trim().toLowerCase();
  if (!normalised || !productId) return null;
  const orders = ((await kv.getByPrefix(ORDER_PREFIX)) as any[]) || [];
  return orders.find((o) => {
    if (String(o?.customer_email || o?.customer?.email || "").trim().toLowerCase() !== normalised) return false;
    if (o?.payment_status !== "paid") return false;
    return (Array.isArray(o?.items) ? o.items : []).some(
      (i: any) => String(i?.id ?? i?.productId ?? "") === String(productId),
    );
  }) || null;
}

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
    if (!admin) products = products.map(stripFiles);
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
    const QUALITY_DIRECTIVE =
      "Masterpiece, award-winning commercial cover art, ultra-detailed, professional studio-grade lighting, high dynamic range, crisp focus, cohesive color grading, clean balanced composition, premium marketing aesthetic. No watermark, no logo, no gibberish text, no borders.";
    const prompt = custom
      ? `${custom} ${QUALITY_DIRECTIVE}`
      : [
          `Professional digital product cover art for a ${category} titled "${title}".`,
          description ? `The product is about: ${description}.` : "",
          style ? `Visual style: ${style}.` : "Visual style: modern, premium, clean, bold typography-friendly composition with a strong focal point.",
          "Suitable as an e-commerce hero thumbnail, high contrast, centered subject, square framing.",
          QUALITY_DIRECTIVE,
        ].filter(Boolean).join(" ");

    // Top-tier: try gpt-image-1 (highest fidelity) first, fall back to DALL·E 3
    // HD/vivid if the org isn't verified. Both return b64 so we can persist.
    async function genImage(): Promise<{ b64: string; revised: string }> {
      const primary = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-image-1", prompt, n: 1, size: "1024x1024", quality: "high" }),
      });
      if (primary.ok) {
        const d = await primary.json();
        const b = d?.data?.[0]?.b64_json;
        if (b) return { b64: b, revised: d?.data?.[0]?.revised_prompt || prompt };
      } else {
        console.log("gpt-image-1 failed, falling back to dall-e-3 HD:", await primary.text());
      }
      const fb = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "dall-e-3", prompt, n: 1, size: "1024x1024", quality: "hd", style: "vivid", response_format: "b64_json" }),
      });
      if (!fb.ok) throw new Error(await fb.text());
      const d = await fb.json();
      const b = d?.data?.[0]?.b64_json;
      if (!b) throw new Error("AI returned no image data.");
      return { b64: b, revised: d?.data?.[0]?.revised_prompt || prompt };
    }

    let b64: string, revisedPrompt: string;
    try {
      const out = await genImage();
      b64 = out.b64;
      revisedPrompt = out.revised;
    } catch (err) {
      console.log("OpenAI image generation failed:", err);
      return c.json({ error: `AI image generation failed: ${String(err)}` }, 502);
    }

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

// ─── Product files (the deliverable) ─────────────────────────────────────────

// Attach a downloadable file to a product. Admin action.
router.post(`${PREFIX}/marketplace/products/:id/files`, async (c) => {
  try {
    const id = c.req.param("id");
    const product = (await kv.get(`${PRODUCT_PREFIX}${id}`)) as any;
    if (!product) return c.json({ error: "Product not found. Save the product before attaching files." }, 404);

    const form = await c.req.formData();
    const file = form.get("file") as File | null;
    if (!file) return c.json({ error: "No file was provided." }, 400);
    if (file.size > MAX_FILE_SIZE) {
      return c.json({ error: `That file is ${(file.size / 1024 / 1024).toFixed(1)}MB — the limit is ${MAX_FILE_SIZE / 1024 / 1024}MB.` }, 400);
    }

    await ensureFileBucket();

    const fileId = `f_${crypto.randomUUID()}`;
    const safe = String(file.name || "download").replace(/[^\w.\- ]+/g, "_").slice(0, 120) || "download";
    const path = `${id}/${fileId}-${safe}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(FILE_BUCKET)
      .upload(path, bytes, { contentType: file.type || "application/octet-stream", upsert: false });
    if (uploadError) return c.json({ error: `Storage upload failed: ${uploadError.message}` }, 500);

    const record = {
      id: fileId,
      name: file.name,
      label: String(form.get("label") || file.name).slice(0, 200),
      path,
      size: file.size,
      mime: file.type || "application/octet-stream",
      uploadedAt: new Date().toISOString(),
    };
    product.files = [...(Array.isArray(product.files) ? product.files : []), record];
    await kv.set(`${PRODUCT_PREFIX}${id}`, product);
    return c.json({ success: true, file: record, files: product.files });
  } catch (err) {
    console.log("Error attaching marketplace product file:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// Remove an attached file. Admin action.
router.delete(`${PREFIX}/marketplace/products/:id/files/:fileId`, async (c) => {
  try {
    const id = c.req.param("id");
    const fileId = c.req.param("fileId");
    const product = (await kv.get(`${PRODUCT_PREFIX}${id}`)) as any;
    if (!product) return c.json({ error: "Product not found." }, 404);
    const files = Array.isArray(product.files) ? product.files : [];
    const target = files.find((f: any) => f?.id === fileId);
    if (!target) return c.json({ error: "That file is not attached to this product." }, 404);

    const { error } = await supabase.storage.from(FILE_BUCKET).remove([target.path]);
    // Dropping the metadata while the object survives (or vice versa) leaves a
    // broken entry, so surface the failure instead of half-deleting.
    if (error) return c.json({ error: `Could not remove the stored file: ${error.message}` }, 500);

    product.files = files.filter((f: any) => f?.id !== fileId);
    await kv.set(`${PRODUCT_PREFIX}${id}`, product);
    return c.json({ success: true, files: product.files });
  } catch (err) {
    console.log("Error removing marketplace product file:", err);
    return c.json({ error: String(err) }, 500);
  }
});

/**
 * Which products has this email paid for? Powers the "My Purchases" lookup so a
 * buyer can re-download from any device, not just the browser they bought on.
 */
router.get(`${PREFIX}/marketplace/entitlements`, async (c) => {
  try {
    const email = String(c.req.query("email") || "").trim().toLowerCase();
    if (!email) return c.json({ error: "An email is required to look up purchases." }, 400);
    const orders = ((await kv.getByPrefix(ORDER_PREFIX)) as any[]) || [];
    const productIds = new Set<string>();
    for (const o of orders) {
      if (String(o?.customer_email || o?.customer?.email || "").trim().toLowerCase() !== email) continue;
      if (o?.payment_status !== "paid") continue;
      for (const i of Array.isArray(o.items) ? o.items : []) {
        const pid = String(i?.id ?? i?.productId ?? "");
        if (pid) productIds.add(pid);
      }
    }
    return c.json({ success: true, productIds: [...productIds] });
  } catch (err) {
    console.log("Error loading marketplace entitlements:", err);
    return c.json({ error: String(err) }, 500);
  }
});

/**
 * Mint short-lived signed download URLs — but only for an email with a verified
 * paid order for this product. A 403 here is the whole point of the endpoint.
 */
router.get(`${PREFIX}/marketplace/products/:id/download`, async (c) => {
  try {
    const id = c.req.param("id");
    const email = String(c.req.query("email") || "").trim().toLowerCase();
    if (!email) return c.json({ error: "Enter the email you purchased with." }, 400);

    const product = (await kv.get(`${PRODUCT_PREFIX}${id}`)) as any;
    if (!product) return c.json({ error: "Product not found." }, 404);

    const order = await findPaidOrder(email, id);
    if (!order) {
      return c.json({
        error: "We could not find a completed purchase of this product under that email. If you just paid, give it a moment and try again — otherwise check the address you used at checkout.",
      }, 403);
    }

    const files = Array.isArray(product.files) ? product.files : [];
    if (files.length === 0) {
      return c.json({
        error: "Your purchase is confirmed, but no file has been attached to this product yet. Contact support and we will send it to you directly.",
        entitled: true,
      }, 409);
    }

    const downloads = [];
    for (const f of files) {
      const { data, error } = await supabase.storage
        .from(FILE_BUCKET)
        .createSignedUrl(f.path, DOWNLOAD_TTL, { download: f.name });
      if (error) {
        console.log(`Could not sign product file ${f.path}: ${error.message}`);
        continue;
      }
      downloads.push({ id: f.id, name: f.name, label: f.label || f.name, size: f.size, mime: f.mime, url: data.signedUrl });
    }
    if (downloads.length === 0) {
      return c.json({ error: "The files for this product could not be prepared for download. Please contact support.", entitled: true }, 500);
    }

    return c.json({ success: true, entitled: true, orderId: order.id, expiresInSeconds: DOWNLOAD_TTL, downloads });
  } catch (err) {
    console.log("Error preparing marketplace download:", err);
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
