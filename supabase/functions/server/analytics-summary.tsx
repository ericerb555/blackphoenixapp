/**
 * analytics-summary — aggregates real business data for the analytics dashboards.
 *
 * Everything here is computed from actual KV records (store orders, leads,
 * subscriptions, ratings, gift cards, abandoned carts, SMS campaigns), replacing
 * the Math.random / hardcoded generators that previously fed the dashboards.
 *
 * GET /analytics/summary  → { success, kpis, revenueByMonth, revenueByWeekday,
 *                             sources, topProducts, activity }
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import * as kv from "./kv_store.tsx";

const router = new Hono();
const PREFIX = "/make-server-57095a78";

router.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  maxAge: 600,
  credentials: false,
}));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function orderTotal(o: any): number {
  return num(o?.total ?? o?.amount ?? o?.subtotal);
}
function orderDate(o: any): Date {
  return new Date(o?.created_at || o?.createdAt || o?.date || 0);
}
function isPaidOrder(o: any): boolean {
  const s = String(o?.payment_status ?? o?.status ?? "").toLowerCase();
  // Treat legacy orders with no explicit status as counted.
  return s === "" || ["paid", "completed", "succeeded", "fulfilled"].includes(s);
}
function relTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  if (diff < 0 || isNaN(diff)) return "just now";
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

router.get(`${PREFIX}/analytics/summary`, async (c) => {
  try {
    const [orders, leads, subscriptions, ratings, giftcards, carts, smsCampaigns] = await Promise.all([
      kv.getByPrefix("store_order:"),
      kv.getByPrefix("lead:"),
      kv.getByPrefix("subscription:"),
      kv.getByPrefix("rating:"),
      kv.getByPrefix("giftcard:"),
      kv.getByPrefix("abandoned_cart:"),
      kv.getByPrefix("sms_campaign:"),
    ]);

    const O = (orders || []).filter(isPaidOrder);
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    // ── Revenue this month & last month ──────────────────────────────────────
    let revThisMonth = 0, revLastMonth = 0, ordersThisMonth = 0;
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;
    for (const o of O) {
      const d = orderDate(o);
      if (d.getFullYear() === thisYear && d.getMonth() === thisMonth) { revThisMonth += orderTotal(o); ordersThisMonth++; }
      else if (d.getFullYear() === lastMonthYear && d.getMonth() === lastMonth) revLastMonth += orderTotal(o);
    }
    const revChange = revLastMonth > 0 ? Math.round(((revThisMonth - revLastMonth) / revLastMonth) * 100) : 0;

    const totalOrders = O.length;
    const totalRevenue = O.reduce((s, o) => s + orderTotal(o), 0);
    const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // ── Leads ────────────────────────────────────────────────────────────────
    const activeLeads = (leads || []).filter((l: any) => {
      const s = String(l?.status ?? "").toLowerCase();
      return s !== "won" && s !== "lost" && s !== "closed";
    }).length;

    // ── Reviews / ratings ──────────────────────────────────────────────────────
    const ratingVals = (ratings || []).map((r: any) => num(r?.rating ?? r?.stars ?? r?.score)).filter(v => v > 0);
    const reviewScore = ratingVals.length ? (ratingVals.reduce((s, v) => s + v, 0) / ratingVals.length) : 0;

    // ── Subscriptions & MRR ────────────────────────────────────────────────────
    const activeSubs = (subscriptions || []).filter((s: any) => String(s?.status ?? "active").toLowerCase() === "active");
    const mrr = activeSubs.reduce((s: number, sub: any) => s + num(sub?.monthlyPrice ?? sub?.price ?? sub?.amount), 0);

    // ── Cart recovery ──────────────────────────────────────────────────────────
    const cartArr = carts || [];
    const recoveredCarts = cartArr.filter((x: any) => x?.recovered || String(x?.status ?? "").toLowerCase() === "recovered").length;
    const recoveryRate = cartArr.length ? Math.round((recoveredCarts / cartArr.length) * 100) : 0;

    // ── Gift card redemptions ──────────────────────────────────────────────────
    const giftRedemptions = (giftcards || []).filter((g: any) => g?.redeemed || num(g?.redeemedAmount) > 0).length;

    const kpis = {
      revenueThisMonth: Math.round(revThisMonth),
      revenueChange: revChange,
      totalOrders,
      activeLeads,
      avgOrderValue: Math.round(aov * 100) / 100,
      recoveryRate,
      giftRedemptions,
      reviewScore: Math.round(reviewScore * 10) / 10,
      reviewCount: ratingVals.length,
      subscriptions: activeSubs.length,
      mrr: Math.round(mrr),
    };

    // ── Revenue by month (last 7 months) ────────────────────────────────────────
    const monthBuckets: { key: string; month: string; revenue: number; orders: number; leads: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - i, 1);
      monthBuckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, month: MONTHS[d.getMonth()], revenue: 0, orders: 0, leads: 0 });
    }
    const bucketIdx: Record<string, number> = {};
    monthBuckets.forEach((b, i) => { bucketIdx[b.key] = i; });
    for (const o of O) {
      const d = orderDate(o);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      if (k in bucketIdx) { monthBuckets[bucketIdx[k]].revenue += orderTotal(o); monthBuckets[bucketIdx[k]].orders++; }
    }
    for (const l of (leads || [])) {
      const d = new Date(l?.createdAt || l?.created_at || 0);
      const k = `${d.getFullYear()}-${d.getMonth()}`;
      if (k in bucketIdx) monthBuckets[bucketIdx[k]].leads++;
    }
    const revenueByMonth = monthBuckets.map(b => ({ month: b.month, revenue: Math.round(b.revenue), orders: b.orders, leads: b.leads }));

    // ── Revenue by weekday (last 7 days) ────────────────────────────────────────
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dayMap: Record<string, number> = {};
    WEEKDAYS.forEach(d => { dayMap[d] = 0; });
    for (const o of O) {
      const d = orderDate(o);
      if (d >= weekAgo) dayMap[WEEKDAYS[d.getDay()]] += orderTotal(o);
    }
    // Order Mon..Sun for display.
    const weekdayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const revenueByWeekday = weekdayOrder.map(d => ({ day: d, revenue: Math.round(dayMap[d]) }));

    // ── Sources (revenue share by order source) ─────────────────────────────────
    const sourceTotals: Record<string, number> = {};
    for (const o of O) {
      const src = String(o?.source || "Online Store");
      sourceTotals[src] = (sourceTotals[src] || 0) + orderTotal(o);
    }
    const palette = ["#ea580c", "#60a5fa", "#34d399", "#f472b6", "#fbbf24", "#a78bfa", "#6b7280"];
    const sourceEntries = Object.entries(sourceTotals).sort((a, b) => b[1] - a[1]);
    const srcTotal = sourceEntries.reduce((s, [, v]) => s + v, 0) || 1;
    const sources = sourceEntries.slice(0, 7).map(([name, v], i) => ({
      name, value: Math.round((v / srcTotal) * 100), color: palette[i % palette.length],
    }));

    // ── Top products (aggregate order line items) ────────────────────────────────
    const prodMap: Record<string, { revenue: number; units: number }> = {};
    for (const o of O) {
      const items = Array.isArray(o?.items) ? o.items : [];
      for (const it of items) {
        const name = String(it?.name || it?.title || "Item");
        const qty = num(it?.qty ?? it?.quantity ?? 1) || 1;
        const price = num(it?.price ?? it?.unit_amount);
        if (!prodMap[name]) prodMap[name] = { revenue: 0, units: 0 };
        prodMap[name].revenue += price * qty;
        prodMap[name].units += qty;
      }
    }
    const topProducts = Object.entries(prodMap)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 6)
      .map(([name, v]) => ({ name, revenue: Math.round(v.revenue), units: v.units }));

    // ── Recent activity (real events, newest first) ──────────────────────────────
    const events: { type: string; text: string; date: string; ts: number }[] = [];
    for (const o of O) {
      const d = orderDate(o);
      const who = o?.customer_name || o?.customer_email || "A customer";
      events.push({ type: "order", text: `${who} placed a $${orderTotal(o).toFixed(2)} order`, date: d.toISOString(), ts: d.getTime() });
    }
    for (const l of (leads || [])) {
      const d = new Date(l?.createdAt || l?.created_at || 0);
      events.push({ type: "lead", text: `New lead — ${l?.name || l?.email || "unknown"}${l?.source ? ` (${l.source})` : ""}`, date: d.toISOString(), ts: d.getTime() });
    }
    for (const r of (ratings || [])) {
      const d = new Date(r?.createdAt || r?.created_at || 0);
      const stars = num(r?.rating ?? r?.stars ?? r?.score);
      events.push({ type: "review", text: `${r?.name || r?.customer || "A customer"} left a ${stars}-star review`, date: d.toISOString(), ts: d.getTime() });
    }
    for (const s of activeSubs) {
      const d = new Date(s?.createdAt || s?.created_at || s?.renewedAt || 0);
      events.push({ type: "subscription", text: `Subscription active — ${s?.customerName || s?.email || s?.plan || "customer"}`, date: d.toISOString(), ts: d.getTime() });
    }
    for (const camp of (smsCampaigns || [])) {
      if (String(camp?.status ?? "").toLowerCase() !== "sent") continue;
      const d = new Date(camp?.sentAt || camp?.createdAt || 0);
      events.push({ type: "sms", text: `SMS campaign sent — ${num(camp?.sentTo)} contacts reached`, date: d.toISOString(), ts: d.getTime() });
    }
    const activity = events
      .filter(e => e.ts > 0)
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 12)
      .map(e => ({ type: e.type, text: e.text, time: relTime(new Date(e.ts)) }));

    return c.json({
      success: true,
      kpis,
      revenueByMonth,
      revenueByWeekday,
      sources,
      topProducts,
      activity,
    });
  } catch (error) {
    console.error("[AnalyticsSummary] Error building summary:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

export default router;
