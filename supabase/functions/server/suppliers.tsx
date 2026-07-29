/**
 * suppliers — server routes backing SupplierManagementHub.tsx.
 *
 * Persists the supplier directory and purchase orders so they survive refreshes
 * and sync across devices. On first read, seeds a small realistic starter set
 * (idempotent) so the hub isn't empty; everything is editable and persisted.
 *
 * KV keys:
 *   supplier:{id}        → supplier record
 *   purchase_order:{id}  → purchase order record
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import * as kv from "./kv_store.tsx";

const suppliersRouter = new Hono();
const PREFIX = "/make-server-3eae23a6";

suppliersRouter.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  maxAge: 600,
  credentials: false,
}));

const SEED_SUPPLIERS = [
  { id: "SUP-001", name: "HD Supply Co", category: "General Hardware", status: "active", rating: 4.8, totalOrders: 127, totalSpend: 45000, lastOrder: "2026-03-12", contact: "sales@hdsupply.com" },
  { id: "SUP-002", name: "Ferguson Plumbing", category: "Plumbing Supplies", status: "active", rating: 4.6, totalOrders: 89, totalSpend: 32000, lastOrder: "2026-03-11", contact: "orders@ferguson.com" },
  { id: "SUP-003", name: "Grainger Industrial", category: "Industrial Equipment", status: "pending", rating: 4.9, totalOrders: 64, totalSpend: 28000, lastOrder: "2026-03-08", contact: "service@grainger.com" },
];

const SEED_PURCHASE_ORDERS = [
  { id: "PO-001", supplier: "HD Supply Co", items: 12, total: 2450, status: "pending", orderDate: "2026-03-13", expectedDelivery: "2026-03-18" },
  { id: "PO-002", supplier: "Ferguson Plumbing", items: 8, total: 1875, status: "approved", orderDate: "2026-03-12", expectedDelivery: "2026-03-16" },
  { id: "PO-003", supplier: "Grainger Industrial", items: 5, total: 3200, status: "delivered", orderDate: "2026-03-08", expectedDelivery: "2026-03-13" },
];

// ── Suppliers ───────────────────────────────────────────────────────────────
suppliersRouter.get(`${PREFIX}/suppliers`, async (c) => {
  try {
    let suppliers = await kv.getByPrefix("supplier:");
    if (!suppliers || suppliers.length === 0) {
      await kv.mset(SEED_SUPPLIERS.map((s) => ({ key: `supplier:${s.id}`, value: s })));
      suppliers = SEED_SUPPLIERS;
    }
    return c.json({ suppliers });
  } catch (error) {
    console.error("[Suppliers] Error fetching suppliers:", error);
    return c.json({ error: "Failed to load suppliers", details: String(error) }, 500);
  }
});

suppliersRouter.post(`${PREFIX}/suppliers`, async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || `SUP-${Date.now()}`;
    const record = { rating: 0, totalOrders: 0, totalSpend: 0, status: "active", ...body, id };
    await kv.set(`supplier:${id}`, record);
    return c.json({ success: true, supplier: record });
  } catch (error) {
    console.error("[Suppliers] Error creating supplier:", error);
    return c.json({ error: "Failed to create supplier", details: String(error) }, 500);
  }
});

suppliersRouter.put(`${PREFIX}/suppliers/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const existing = await kv.get(`supplier:${id}`);
    if (!existing) return c.json({ error: "Supplier not found" }, 404);
    const updated = { ...existing, ...body, id };
    await kv.set(`supplier:${id}`, updated);
    return c.json({ success: true, supplier: updated });
  } catch (error) {
    console.error("[Suppliers] Error updating supplier:", error);
    return c.json({ error: "Failed to update supplier", details: String(error) }, 500);
  }
});

suppliersRouter.delete(`${PREFIX}/suppliers/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`supplier:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error("[Suppliers] Error deleting supplier:", error);
    return c.json({ error: "Failed to delete supplier", details: String(error) }, 500);
  }
});

// ── Purchase Orders ─────────────────────────────────────────────────────────
// A single rich PO record backs two consumers:
//   - PurchaseOrders.tsx expects the rich shape under `orders`.
//   - SupplierManagementHub.tsx expects a light summary under `purchaseOrders`.
// toLight() maps a rich (or already-light) record to the summary shape.
function toLight(po: any) {
  return {
    id: po.id,
    supplier: po.supplier ?? po.vendor ?? "",
    items: Array.isArray(po.items) ? po.items.length : (po.items ?? 0),
    total: po.total ?? 0,
    status: po.status ?? "pending",
    orderDate: po.orderDate ?? po.date ?? "",
    expectedDelivery: po.expectedDelivery ?? po.dueDate ?? "",
  };
}

suppliersRouter.get(`${PREFIX}/purchase-orders`, async (c) => {
  try {
    let orders = await kv.getByPrefix("purchase_order:");
    if (!orders || orders.length === 0) {
      await kv.mset(SEED_PURCHASE_ORDERS.map((p) => ({ key: `purchase_order:${p.id}`, value: p })));
      orders = SEED_PURCHASE_ORDERS;
    }
    return c.json({ orders, purchaseOrders: orders.map(toLight) });
  } catch (error) {
    console.error("[Suppliers] Error fetching purchase orders:", error);
    return c.json({ error: "Failed to load purchase orders", details: String(error) }, 500);
  }
});

suppliersRouter.post(`${PREFIX}/purchase-orders`, async (c) => {
  try {
    const body = await c.req.json();
    const id = body.id || `PO-${Date.now()}`;
    const record = { status: "pending", orderDate: new Date().toISOString().slice(0, 10), ...body, id };
    await kv.set(`purchase_order:${id}`, record);
    return c.json({ success: true, purchaseOrder: record, order: record });
  } catch (error) {
    console.error("[Suppliers] Error creating purchase order:", error);
    return c.json({ error: "Failed to create purchase order", details: String(error) }, 500);
  }
});

// Update just the status of a purchase order (used by PurchaseOrders.tsx).
suppliersRouter.patch(`${PREFIX}/purchase-orders/:id/status`, async (c) => {
  try {
    const id = c.req.param("id");
    const { status } = await c.req.json();
    const existing = await kv.get(`purchase_order:${id}`);
    if (!existing) return c.json({ error: "Purchase order not found" }, 404);
    const updated = { ...existing, status, id };
    await kv.set(`purchase_order:${id}`, updated);
    return c.json({ success: true, order: updated });
  } catch (error) {
    console.error("[Suppliers] Error updating purchase order status:", error);
    return c.json({ error: "Failed to update status", details: String(error) }, 500);
  }
});

suppliersRouter.put(`${PREFIX}/purchase-orders/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const existing = await kv.get(`purchase_order:${id}`);
    if (!existing) return c.json({ error: "Purchase order not found" }, 404);
    const updated = { ...existing, ...body, id };
    await kv.set(`purchase_order:${id}`, updated);
    return c.json({ success: true, purchaseOrder: updated });
  } catch (error) {
    console.error("[Suppliers] Error updating purchase order:", error);
    return c.json({ error: "Failed to update purchase order", details: String(error) }, 500);
  }
});

suppliersRouter.delete(`${PREFIX}/purchase-orders/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`purchase_order:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.error("[Suppliers] Error deleting purchase order:", error);
    return c.json({ error: "Failed to delete purchase order", details: String(error) }, 500);
  }
});

export default suppliersRouter;
