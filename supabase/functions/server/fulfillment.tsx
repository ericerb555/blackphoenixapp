/**
 * Fulfillment router — order tracking timeline, automatic customer
 * email/SMS on status changes, and live stock sync.
 *
 * - PUT  /fulfillment/orders/:id   (admin) update status/tracking, log a
 *        timeline event, and notify the customer by email + SMS.
 * - GET  /fulfillment/track         (public) customer order tracking lookup
 *        by order number + email.
 * - POST /fulfillment/sync-stock    (admin) refresh product inventory counts.
 */
import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import * as kv from "./kv_store.tsx";

const fulfillmentRouter = new Hono();

const COMPANY = Deno.env.get("COMPANY_NAME") || "The Black Phoenix Company";

// ── Notification senders ──────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey || !to) return { sent: false, reason: "no api key or recipient" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `${COMPANY} <onboarding@resend.dev>`, to: [to], subject, html }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { sent: false, reason: `Resend error: ${JSON.stringify(data)}` };
    return { sent: true, id: data.id };
  } catch (err) {
    return { sent: false, reason: `Resend exception: ${err}` };
  }
}

async function sendSMS(to: string, body: string) {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_PHONE_NUMBER");
  if (!sid || !token || !from || !to) return { sent: false, reason: "missing twilio config or recipient" };
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${btoa(`${sid}:${token}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { sent: false, reason: `Twilio error: ${JSON.stringify(data)}` };
    return { sent: true, sid: data.sid };
  } catch (err) {
    return { sent: false, reason: `Twilio exception: ${err}` };
  }
}

// Customer-friendly copy per status.
function statusCopy(status: string, order: any, tracking?: string, carrier?: string) {
  const num = order.orderNumber || order.id;
  switch (status) {
    case "processing":
      return { subject: `Order ${num} is being prepared`, line: `Good news! We're preparing order ${num} for shipment.` };
    case "shipped":
      return {
        subject: `Order ${num} has shipped 📦`,
        line: `Your order ${num} is on its way!${tracking ? ` Tracking${carrier ? ` (${carrier})` : ""}: ${tracking}` : ""}`,
      };
    case "delivered":
      return { subject: `Order ${num} delivered ✅`, line: `Your order ${num} has been delivered. Enjoy!` };
    case "cancelled":
      return { subject: `Order ${num} cancelled`, line: `Order ${num} has been cancelled. If this is unexpected, please contact us.` };
    default:
      return { subject: `Update on order ${num}`, line: `There's an update on your order ${num}: ${status}.` };
  }
}

async function requireAdmin(c: any) {
  const accessToken = c.req.header("Authorization")?.split(" ")[1];
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const { data: { user }, error } = await supabase.auth.getUser(accessToken ?? "");
  if (error || !user?.id) return { ok: false, error: `Authorization error: ${error?.message || "no user"}`, status: 401 };
  const perms = (await kv.get(`user_permissions:${user.id}`)) as any;
  const role = perms?.role || user.user_metadata?.role;
  if (role !== "admin" && role !== "owner" && role !== "super_admin") return { ok: false, error: "Administrator access is required.", status: 403 };
  return { ok: true };
}

// ── GET /fulfillment/orders — admin list of all orders ───────────────────
fulfillmentRouter.get("/make-server-3eae23a6/fulfillment/orders", async (c) => {
  try {
    const admin = await requireAdmin(c);
    if (!admin.ok) return c.json({ success: false, error: admin.error }, admin.status);
    const all = ((await kv.getByPrefix("order_")) as any[]) || [];
    const orders = all
      .filter((o: any) => o && o.id && o.orderNumber)
      .map((o: any) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        status: o.status,
        total: o.total,
        trackingNumber: o.trackingNumber || null,
        carrier: o.carrier || null,
        createdAt: o.createdAt,
        itemCount: (o.items || []).length,
      }))
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ success: true, orders });
  } catch (err) {
    console.log(`Error listing orders for fulfillment: ${err}`);
    return c.json({ success: false, error: `Failed to list orders: ${err}` }, 500);
  }
});

// ── PUT /fulfillment/orders/:id — update + notify ─────────────────────────
fulfillmentRouter.put("/make-server-3eae23a6/fulfillment/orders/:id", async (c) => {
  try {
    const admin = await requireAdmin(c);
    if (!admin.ok) return c.json({ success: false, error: admin.error }, admin.status);

    const id = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));
    const { status, trackingNumber, carrier, notify = true } = body;

    const order: any = await kv.get(`order_${id}`);
    if (!order) return c.json({ success: false, error: `Order ${id} not found` }, 404);

    const now = new Date().toISOString();
    if (status) order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (carrier) order.carrier = carrier;
    if (status === "shipped") order.shippedAt = now;
    if (status === "delivered") order.deliveredAt = now;
    order.updatedAt = now;
    await kv.set(`order_${id}`, order);

    // Append a tracking timeline event.
    const timelineKey = `order_tracking:${id}`;
    const timeline = ((await kv.get(timelineKey)) as any[]) || [];
    timeline.push({ status: status || order.status, trackingNumber: order.trackingNumber, carrier: order.carrier, at: now });
    await kv.set(timelineKey, timeline);

    // Notify the customer.
    let notifications: any = { email: null, sms: null };
    if (notify && status) {
      const copy = statusCopy(status, order, order.trackingNumber, order.carrier);
      const html = `<div style="font-family:sans-serif;max-width:520px">
        <h2 style="color:#ea580c">${COMPANY}</h2>
        <p>Hi ${order.customerName || "there"},</p>
        <p>${copy.line}</p>
        ${order.trackingNumber ? `<p style="background:#f4f4f4;padding:12px;border-radius:8px"><strong>Tracking:</strong> ${order.trackingNumber}${order.carrier ? ` (${order.carrier})` : ""}</p>` : ""}
        <p style="color:#888;font-size:12px">Order ${order.orderNumber || id}</p>
      </div>`;
      if (order.customerEmail) notifications.email = await sendEmail(order.customerEmail, copy.subject, html);
      const phone = order.shippingAddress?.phone || order.customerPhone;
      if (phone) notifications.sms = await sendSMS(phone, `${COMPANY}: ${copy.line}`);
    }

    return c.json({ success: true, order, timeline, notifications });
  } catch (err) {
    console.log(`Error updating fulfillment for order: ${err}`);
    return c.json({ success: false, error: `Failed to update fulfillment: ${err}` }, 500);
  }
});

// ── GET /fulfillment/track?order=..&email=.. — public tracking ────────────
fulfillmentRouter.get("/make-server-3eae23a6/fulfillment/track", async (c) => {
  try {
    const orderQuery = (c.req.query("order") || "").trim();
    const email = (c.req.query("email") || "").trim().toLowerCase();
    if (!orderQuery || !email) return c.json({ success: false, error: "Order number and email are required." }, 400);

    // Look up the order by number or id.
    const all = ((await kv.getByPrefix("order_")) as any[]) || [];
    const order = all.find((o: any) =>
      o && (String(o.orderNumber).toLowerCase() === orderQuery.toLowerCase() || String(o.id).toLowerCase() === orderQuery.toLowerCase())
    );
    if (!order || String(order.customerEmail || "").toLowerCase() !== email) {
      // Don't disclose whether the order exists — same message either way.
      return c.json({ success: false, error: "No order found matching that number and email." }, 404);
    }

    const timeline = ((await kv.get(`order_tracking:${order.id}`)) as any[]) || [];
    return c.json({
      success: true,
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        trackingNumber: order.trackingNumber || null,
        carrier: order.carrier || null,
        total: order.total,
        createdAt: order.createdAt,
        shippedAt: order.shippedAt || null,
        deliveredAt: order.deliveredAt || null,
        items: (order.items || []).map((i: any) => ({ name: i.name || i.productName, quantity: i.quantity })),
      },
      timeline,
    });
  } catch (err) {
    console.log(`Error looking up order tracking: ${err}`);
    return c.json({ success: false, error: `Failed to look up order: ${err}` }, 500);
  }
});

// ── POST /fulfillment/sync-stock — refresh inventory counts ───────────────
// Accepts an optional { updates: [{ id, inventoryQuantity }] } to set counts
// directly, otherwise reports current stock levels for admin review.
fulfillmentRouter.post("/make-server-3eae23a6/fulfillment/sync-stock", async (c) => {
  try {
    const admin = await requireAdmin(c);
    if (!admin.ok) return c.json({ success: false, error: admin.error }, admin.status);

    const body = await c.req.json().catch(() => ({}));
    const updates: Array<{ id: string; inventoryQuantity: number }> = Array.isArray(body?.updates) ? body.updates : [];

    let updated = 0;
    for (const u of updates) {
      const key = `product_${u.id}`;
      const product: any = await kv.get(key);
      if (product) {
        product.inventoryQuantity = Math.max(0, Number(u.inventoryQuantity) || 0);
        product.stock = product.inventoryQuantity;
        product.inStock = product.inventoryQuantity > 0;
        product.updatedAt = new Date().toISOString();
        await kv.set(key, product);
        updated++;
      }
    }

    // Return a low-stock report so the admin sees what needs restocking.
    const products = ((await kv.getByPrefix("product_")) as any[]) || [];
    const lowStock = products
      .filter((p: any) => p && typeof (p.inventoryQuantity ?? p.stock) === "number")
      .map((p: any) => ({ id: p.id, name: p.name, inventoryQuantity: p.inventoryQuantity ?? p.stock }))
      .filter((p: any) => p.inventoryQuantity <= 10)
      .sort((a: any, b: any) => a.inventoryQuantity - b.inventoryQuantity);

    return c.json({ success: true, updated, lowStock, totalProducts: products.length });
  } catch (err) {
    console.log(`Error syncing stock: ${err}`);
    return c.json({ success: false, error: `Failed to sync stock: ${err}` }, 500);
  }
});

export default fulfillmentRouter;
