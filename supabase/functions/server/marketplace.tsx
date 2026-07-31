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
import * as kv from "./kv_store.tsx";

const router = new Hono();
const PREFIX = "/make-server-3eae23a6";
const PRODUCT_PREFIX = "marketplace_product:";
const PRODUCT_INDEX = "marketplace_product_index";
const ORDER_PREFIX = "store_order:";

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
