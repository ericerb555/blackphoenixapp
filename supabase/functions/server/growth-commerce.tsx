import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";
import { recordEntitlementEvent } from "./entitlements.tsx";

const router = new Hono();

// ─── Flash Sales ────────────────────────────────────────────────────────────
// Business-wide list of flash sale campaigns (shared, non-user-scoped).
const FLASH_KEY = "flash_sales:default";

router.get("/make-server-3eae23a6/flash-sales", async (c) => {
  try {
    const sales = await kv.get(FLASH_KEY);
    return c.json({ success: true, sales: Array.isArray(sales) ? sales : [] });
  } catch (err) {
    console.log("Error loading flash sales:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

router.post("/make-server-3eae23a6/flash-sales", async (c) => {
  try {
    const { sales } = await c.req.json();
    if (!Array.isArray(sales)) {
      return c.json({ success: false, error: "sales array is required" }, 400);
    }
    await kv.set(FLASH_KEY, sales);
    return c.json({ success: true });
  } catch (err) {
    console.log("Error saving flash sales:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

// ─── Affiliate Program ──────────────────────────────────────────────────────
// One record per affiliate, keyed by email.
const affiliateKey = (email: string) => `affiliate:${email.toLowerCase()}`;

// Attribute a completed sale to an affiliate when the order carries their
// referral code. Shared by the order-create handler and the demo seed route so
// both exercise the exact same logic. Returns the updated affiliate or null.
async function attributeAffiliateSale(order: any) {
  const refCode = String(
    order?.affiliateCode || order?.refCode || order?.ref || order?.referralCode || ""
  ).trim().toUpperCase();
  if (!refCode) return null;
  const affiliates = (await kv.getByPrefix("affiliate:")) || [];
  const match = affiliates.find(
    (a: any) => String(a?.code || "").trim().toUpperCase() === refCode
  );
  if (!match || !order?.id) return null;
  const attributionKey = `affiliate_attribution:${String(match.email).toLowerCase()}:${order.id}`;
  const priorAttribution = await kv.get(attributionKey);
  if (priorAttribution) return match;
  const revenue = Number(order.total ?? order.amount ?? order.subtotal) || 0;
  const COMMISSION_RATE = 0.10; // 10% store credit per referred sale
  const credit = Math.round(revenue * COMMISSION_RATE * 100) / 100;
  match.conversions = (Number(match.conversions) || 0) + 1;
  match.pendingCredit = Math.round(((Number(match.pendingCredit) || 0) + credit) * 100) / 100;
  match.history = Array.isArray(match.history) ? match.history : [];
  match.history.unshift({
    id: `sale-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: "sale",
    description: `${order.customer_name || order.customer_email || "A customer"} made a $${revenue.toFixed(2)} purchase`,
    credit,
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  });
  await kv.set(`affiliate:${String(match.email).toLowerCase()}`, match);
  await kv.set(attributionKey, { orderId: order.id, affiliateEmail: match.email, credit, createdAt: new Date().toISOString() });
  if (match.planId) await recordEntitlementEvent({
    planId: match.planId, sourceType: 'adjustment', sourceId: `affiliate:${order.id}`,
    creditDelta: credit, feature: 'affiliate_credit', featureQuantity: credit, note: `Affiliate credit for order ${order.id}`,
  });
  console.log(`✅ Attributed order ${order.id} ($${revenue}) to affiliate ${match.email} via code ${refCode} (+$${credit} credit)`);
  return match;
}

router.get("/make-server-3eae23a6/affiliates/:email", async (c) => {
  try {
    const email = decodeURIComponent(c.req.param("email"));
    const stats = await kv.get(affiliateKey(email));
    return c.json({ success: true, stats: stats || null });
  } catch (err) {
    console.log("Error loading affiliate stats:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

router.post("/make-server-3eae23a6/affiliates/:email", async (c) => {
  try {
    const email = decodeURIComponent(c.req.param("email"));
    const { stats } = await c.req.json();
    if (!stats || typeof stats !== "object") {
      return c.json({ success: false, error: "stats object is required" }, 400);
    }
    await kv.set(affiliateKey(email), stats);
    return c.json({ success: true });
  } catch (err) {
    console.log("Error saving affiliate stats:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

// ─── TEMPORARY: purge the affiliate attribution demo data ──────────────────────
// GET endpoint that removes the test affiliate and the demo orders created while
// verifying attribution end-to-end. Remove this route once cleanup is confirmed.
router.get("/make-server-3eae23a6/dev/purge-affiliate-demo", async (c) => {
  try {
    const removed: string[] = [];

    // Delete the test affiliate record.
    const testEmail = "affiliate.tester@example.com";
    if (await kv.get(affiliateKey(testEmail))) {
      await kv.del(affiliateKey(testEmail));
      removed.push(affiliateKey(testEmail));
    }

    // Delete every demo order (ids were prefixed BP-DEMO- / source "Affiliate Demo").
    const orders = (await kv.getByPrefix("store_order:")) || [];
    for (const o of orders) {
      const isDemo = String(o?.id || "").startsWith("BP-DEMO-") || o?.source === "Affiliate Demo";
      if (isDemo) {
        await kv.del(`store_order:${o.id}`);
        removed.push(`store_order:${o.id}`);
      }
    }

    return c.json({ success: true, removed, count: removed.length });
  } catch (err) {
    console.log("Error purging affiliate demo data:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

// ─── Loyalty Program ────────────────────────────────────────────────────────
// One loyalty account per customer, keyed by email.
const loyaltyKey = (email: string) => `loyalty:${email.toLowerCase()}`;

router.get("/make-server-3eae23a6/loyalty/:email", async (c) => {
  try {
    const email = decodeURIComponent(c.req.param("email"));
    const account = await kv.get(loyaltyKey(email));
    return c.json({ success: true, account: account || null });
  } catch (err) {
    console.log("Error loading loyalty account:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

router.post("/make-server-3eae23a6/loyalty/:email", async (c) => {
  try {
    const email = decodeURIComponent(c.req.param("email"));
    const { account, event } = await c.req.json();
    if (!account || typeof account !== "object") {
      return c.json({ success: false, error: "account object is required" }, 400);
    }
    const eventKey = event?.id ? `loyalty_event:${email.toLowerCase()}:${event.id}` : null;
    if (eventKey && await kv.get(eventKey)) return c.json({ success: true, duplicate: true });
    await kv.set(loyaltyKey(email), account);
    if (event?.planId && event?.id) {
      await recordEntitlementEvent({ planId: event.planId, sourceType: 'adjustment', sourceId: `loyalty:${event.id}`, creditDelta: event.type === 'redeem' ? -Math.abs(Number(event.creditAmount || 0)) : Math.abs(Number(event.creditAmount || 0)), feature: event.type === 'redeem' ? 'loyalty_redeemed' : 'loyalty_earned', featureQuantity: Math.abs(Number(event.creditAmount || 0)), note: event.note || `Loyalty ${event.type || 'activity'}` });
      await kv.set(eventKey, { id: event.id, type: event.type || 'earn', creditAmount: Number(event.creditAmount || 0), planId: event.planId, createdAt: new Date().toISOString() });
    }
    return c.json({ success: true });
  } catch (err) {
    console.log("Error saving loyalty account:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

// ─── Store Orders ───────────────────────────────────────────────────────────
// Orders are stored one-per-key. A Stripe webhook (or manual creation) writes
// them; the Order Manager lists and updates fulfillment.
const ORDER_PREFIX = "store_order:";

router.get("/make-server-3eae23a6/store/orders", async (c) => {
  try {
    const orders = await kv.getByPrefix(ORDER_PREFIX);
    const sorted = (orders || []).sort((a: any, b: any) =>
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    return c.json({ orders: sorted });
  } catch (err) {
    console.log("Error fetching store orders:", err);
    return c.json({ error: String(err) }, 500);
  }
});

router.post("/make-server-3eae23a6/store/orders", async (c) => {
  try {
    const { order } = await c.req.json();
    if (!order || typeof order !== "object") {
      return c.json({ error: "order object is required" }, 400);
    }
    const id = order.id || `BP-${Date.now()}`;
    const record = { ...order, id, created_at: order.created_at || new Date().toISOString() };
    await kv.set(`${ORDER_PREFIX}${id}`, record);

    // Attribute the sale to an ambassador if the order used their promo code.
    // This is what makes influencer referral counts & revenue real instead of static.
    try {
      const code = String(order.promoCode || order.discountCode || "").trim().toUpperCase();
      if (code) {
        const influencers = (await kv.get("influencer_ambassadors:default")) || [];
        if (Array.isArray(influencers)) {
          const idx = influencers.findIndex(
            (a: any) => String(a.promoCode || "").trim().toUpperCase() === code
          );
          if (idx >= 0) {
            const revenue = Number(order.total ?? order.amount ?? order.subtotal) || 0;
            influencers[idx].referrals = (Number(influencers[idx].referrals) || 0) + 1;
            influencers[idx].revenue = Math.round(((Number(influencers[idx].revenue) || 0) + revenue) * 100) / 100;
            influencers[idx].lastReferralAt = new Date().toISOString();
            await kv.set("influencer_ambassadors:default", influencers);
            console.log(`✅ Attributed order ${id} ($${revenue}) to ambassador ${influencers[idx].name} via code ${code}`);
          }
        }
      }
    } catch (attrErr) {
      console.log("Referral attribution error (order still saved):", attrErr);
    }

    // Attribute the sale to an affiliate if the order used their referral code.
    // Mirrors the influencer flow — makes affiliate sales/credit real, not seeded.
    try {
      await attributeAffiliateSale(record);
    } catch (affErr) {
      console.log("Affiliate attribution error (order still saved):", affErr);
    }

    return c.json(record);
  } catch (err) {
    console.log("Error creating store order:", err);
    return c.json({ error: String(err) }, 500);
  }
});

router.patch("/make-server-3eae23a6/store/orders/:orderId", async (c) => {
  try {
    const orderId = c.req.param("orderId");
    const body = await c.req.json();
    const existing = await kv.get(`${ORDER_PREFIX}${orderId}`);
    if (!existing) {
      return c.json({ error: "Order not found" }, 404);
    }
    const updated = { ...existing, ...body, id: orderId, updated_at: new Date().toISOString() };
    await kv.set(`${ORDER_PREFIX}${orderId}`, updated);
    return c.json(updated);
  } catch (err) {
    console.log("Error updating store order:", err);
    return c.json({ error: String(err) }, 500);
  }
});

export default router;
