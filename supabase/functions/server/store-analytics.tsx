// Store Analytics API — aggregates REAL order data from the KV store into the
// shapes the StoreAnalyticsDashboard and ShopIntelligenceSuite need.
//
// All numbers here are derived from actual orders (`order_*` and `store_order:*`
// KV records). Where a value cannot be sourced from real data (e.g. per-item
// product cost when the item didn't record one), we estimate with a documented
// assumption (DEFAULT_MARGIN) rather than fabricate.
import { Hono } from 'npm:hono';
import * as kv from './kv_store.tsx';

const app = new Hono();

// When an order item has no cost basis recorded, assume this gross margin so the
// P&L still renders. Real cost data (item.cost / item.cost_price) overrides this.
const DEFAULT_MARGIN = 0.4;

const CATEGORY_COLORS = ['#3b82f6', '#f97316', '#a855f7', '#22c55e', '#eab308', '#ec4899', '#6b7280'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function num(v: any): number {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Seed/demo orders (created while verifying attribution) must never count toward
// real analytics — they made the dashboard contradict itself ($0 "this month"
// KPIs next to a non-zero P&L). Identified by the BP-DEMO- id prefix or the
// "Affiliate Demo" source, matching the /dev/purge-affiliate-demo cleanup.
function isDemoOrder(o: any): boolean {
  const id = String(o?.id || o?.orderNumber || o?.orderId || '');
  return id.startsWith('BP-DEMO-') || o?.source === 'Affiliate Demo' || o?.demo === true;
}

// Collect every order record, deduped by id, tolerating the two storage schemas.
async function loadAllOrders(): Promise<any[]> {
  const [a, b] = await Promise.all([
    kv.getByPrefix('order_').catch(() => []),
    kv.getByPrefix('store_order:').catch(() => []),
  ]);
  const byId = new Map<string, any>();
  for (const o of [...(a || []), ...(b || [])]) {
    if (!o || typeof o !== 'object') continue;
    if (isDemoOrder(o)) continue;
    const id = o.id || o.orderNumber || o.orderId;
    if (!id) continue;
    if (!byId.has(id)) byId.set(id, o);
  }
  return Array.from(byId.values());
}

function orderTotal(o: any): number {
  return num(o.total ?? o.amount ?? o.subtotal);
}
function orderItems(o: any): any[] {
  return Array.isArray(o.items) ? o.items : [];
}
function orderDate(o: any): Date {
  const d = new Date(o.createdAt || o.created_at || o.date || 0);
  return isNaN(d.getTime()) ? new Date(0) : d;
}
function itemRevenue(it: any): number {
  return num(it.subtotal ?? num(it.price) * num(it.quantity || 1));
}
function itemCost(it: any): number {
  const c = num(it.cost ?? it.cost_price ?? it.costPrice);
  if (c > 0) return c * num(it.quantity || 1);
  return itemRevenue(it) * (1 - DEFAULT_MARGIN);
}

// GET /analytics/store — full dashboard payload from real orders.
app.get('/store', async (c) => {
  try {
    const orders = await loadAllOrders();
    const now = new Date();

    if (orders.length === 0) {
      return c.json({ success: true, hasData: false, orderCount: 0 });
    }

    // Revenue by month (last 7 months incl. current)
    const monthBuckets: { key: string; label: string; revenue: number; orders: number; profit: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthBuckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH_NAMES[d.getMonth()], revenue: 0, orders: 0, profit: 0 });
    }
    const monthIndex = new Map(monthBuckets.map((m, i) => [m.key, i]));

    // Daily (current week, Mon–Sun)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    startOfWeek.setHours(0, 0, 0, 0);
    const daily = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({ day, revenue: 0, orders: 0 }));

    const productAgg = new Map<string, any>();
    const categoryAgg = new Map<string, number>();
    const customerAgg = new Map<string, { name: string; orders: number; total: number; firstAt: number }>();
    const supplierAgg = new Map<string, number>();
    let ratingSum = 0, ratingCount = 0, cancelledOrders = 0;
    let priorMonthRevenue = 0, priorMonthOrders = 0, priorMonthProfit = 0, thisMonthProfit = 0;
    const unitsThisMonth = new Map<string, number>();
    const unitsPriorMonth = new Map<string, number>();
    let grossRevenue = 0, productCost = 0, thisMonthRevenue = 0, thisMonthOrders = 0, pendingPayout = 0;
    const thisMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
    const pm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const priorMonthKey = `${pm.getFullYear()}-${pm.getMonth()}`;

    for (const o of orders) {
      const total = orderTotal(o);
      const d = orderDate(o);
      const mKey = `${d.getFullYear()}-${d.getMonth()}`;
      grossRevenue += total;
      if (mKey === thisMonthKey) { thisMonthRevenue += total; thisMonthOrders += 1; }

      const payStatus = String(o.paymentStatus || o.payment_status || '').toLowerCase();
      const fStatus = String(o.status || o.fulfillment_status || '').toLowerCase();
      if (payStatus === 'paid' && (fStatus === 'processing' || fStatus === 'pending' || fStatus === 'unfulfilled')) {
        pendingPayout += total;
      }

      const custKey = String(o.customerEmail || o.customer_email || o.customerName || '').toLowerCase();
      if (custKey) {
        const cur = customerAgg.get(custKey) || {
          name: o.customerName || o.customerEmail || 'Customer', orders: 0, total: 0, firstAt: d.getTime(),
        };
        cur.orders += 1;
        cur.total += total;
        cur.firstAt = Math.min(cur.firstAt, d.getTime());
        customerAgg.set(custKey, cur);
      }
      const rating = num(o.rating ?? o.reviewRating);
      if (rating > 0) { ratingSum += rating; ratingCount += 1; }
      if (fStatus === 'cancelled' || fStatus === 'canceled' || fStatus === 'returned' || fStatus === 'refunded') cancelledOrders += 1;
      if (mKey === priorMonthKey) { priorMonthRevenue += total; priorMonthOrders += 1; }

      if (monthIndex.has(mKey)) {
        const idx = monthIndex.get(mKey)!;
        monthBuckets[idx].revenue += total;
        monthBuckets[idx].orders += 1;
      }
      if (d >= startOfWeek) {
        const dayIdx = (d.getDay() + 6) % 7;
        if (daily[dayIdx]) { daily[dayIdx].revenue += total; daily[dayIdx].orders += 1; }
      }

      for (const it of orderItems(o)) {
        const rev = itemRevenue(it);
        const cost = itemCost(it);
        productCost += cost;
        if (monthIndex.has(mKey)) monthBuckets[monthIndex.get(mKey)!].profit += (rev - cost);
        if (mKey === thisMonthKey) thisMonthProfit += (rev - cost);
        else if (mKey === priorMonthKey) priorMonthProfit += (rev - cost);
        const vend = it.vendorName || it.supplier || o.supplier;
        if (vend) supplierAgg.set(String(vend), (supplierAgg.get(String(vend)) || 0) + rev);

        const pid = it.productId || it.id || it.productName || 'unknown';
        const q = num(it.quantity || 1);
        const existing = productAgg.get(pid) || {
          id: pid, name: it.productName || it.name || 'Product',
          category: it.category || 'Other', image: it.productImage || it.image || '',
          unitsSold: 0, revenue: 0, profit: 0,
        };
        existing.unitsSold += q;
        existing.revenue += rev;
        existing.profit += (rev - cost);
        if (!existing.image && (it.productImage || it.image)) existing.image = it.productImage || it.image;
        productAgg.set(pid, existing);

        categoryAgg.set(it.category || 'Other', (categoryAgg.get(it.category || 'Other') || 0) + rev);
        if (mKey === thisMonthKey) unitsThisMonth.set(pid, (unitsThisMonth.get(pid) || 0) + q);
        else if (mKey === priorMonthKey) unitsPriorMonth.set(pid, (unitsPriorMonth.get(pid) || 0) + q);
      }
    }

    const topProducts = Array.from(productAgg.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)
      .map(p => {
        const cur = unitsThisMonth.get(p.id) || 0;
        const prev = unitsPriorMonth.get(p.id) || 0;
        let trend: 'up' | 'down' | 'flat' = 'flat';
        let trendPct = 0;
        if (prev > 0) { trendPct = Math.round(((cur - prev) / prev) * 100); trend = trendPct > 0 ? 'up' : trendPct < 0 ? 'down' : 'flat'; }
        else if (cur > 0) { trend = 'up'; trendPct = 100; }
        return {
          id: p.id, name: p.name, category: p.category,
          unitsSold: p.unitsSold, revenue: Math.round(p.revenue), profit: Math.round(p.profit),
          margin: p.revenue > 0 ? Math.round((p.profit / p.revenue) * 100) : 0,
          trend, trendPct: Math.abs(trendPct), image: p.image,
        };
      });

    const recentOrders = [...orders]
      .sort((a, b) => orderDate(b).getTime() - orderDate(a).getTime())
      .slice(0, 8)
      .map(o => {
        const items = orderItems(o);
        return {
          id: o.orderNumber || o.id,
          customer: o.customerName || o.customerEmail || 'Customer',
          product: items[0]?.productName || items[0]?.name || `${items.length} item(s)`,
          amount: Math.round(orderTotal(o)),
          status: String(o.status || o.fulfillment_status || 'pending').toLowerCase(),
          date: orderDate(o).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          supplier: items[0]?.vendorName || o.supplier || '—',
        };
      });

    const catEntries = Array.from(categoryAgg.entries()).sort((a, b) => b[1] - a[1]);
    const catTotal = catEntries.reduce((s, [, v]) => s + v, 0) || 1;
    const categoryData = catEntries.slice(0, 6).map(([name, value], i) => ({
      name, value: Math.round((value / catTotal) * 100), color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));

    const grossProfit = grossRevenue - productCost;
    const paymentFees = grossRevenue * 0.029 + orders.length * 0.3;
    const netProfit = grossProfit - paymentFees;
    const financials = {
      grossRevenue: Math.round(grossRevenue),
      productCost: Math.round(productCost),
      grossProfit: Math.round(grossProfit),
      platformFees: 0,
      paymentFees: Math.round(paymentFees),
      adSpend: 0,
      netProfit: Math.round(netProfit),
      margin: grossRevenue > 0 ? Math.round((netProfit / grossRevenue) * 100) : 0,
      pendingPayout: Math.round(pendingPayout),
      lastPayout: 0,
    };

    // Month-over-month deltas. null when there is no prior month to compare to —
    // the UI renders nothing rather than inventing a percentage.
    const delta = (cur: number, prev: number): number | null =>
      prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;

    const customers = Array.from(customerAgg.values());
    const returningCount = customers.filter(x => x.orders > 1).length;
    const avgOrderValue = orders.length > 0 ? grossRevenue / orders.length : 0;
    const supplierEntries = Array.from(supplierAgg.entries()).sort((a, b) => b[1] - a[1]);

    const quickStats = {
      avgOrderValue: Math.round(avgOrderValue),
      returnRate: orders.length > 0 ? Math.round((cancelledOrders / orders.length) * 1000) / 10 : 0,
      customerLtv: customers.length > 0 ? Math.round(grossRevenue / customers.length) : 0,
      topSupplier: supplierEntries[0]?.[0] || null,
    };

    const customerStats = {
      totalCustomers: customers.length,
      returningPct: customers.length > 0 ? Math.round((returningCount / customers.length) * 100) : 0,
      avgLifetimeValue: quickStats.customerLtv,
      // null when no order carries a rating — better than showing a made-up score.
      avgRating: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null,
      ratingCount,
    };

    const topCustomers = customers
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
      .map(x => ({ name: x.name, orders: x.orders, total: Math.round(x.total) }));

    return c.json({
      success: true,
      hasData: true,
      quickStats,
      customerStats,
      topCustomers,
      supplierRevenue: supplierEntries.slice(0, 6).map(([name, amount]) => ({ name, amount: Math.round(amount) })),
      deltas: {
        revenue: delta(thisMonthRevenue, priorMonthRevenue),
        orders: delta(thisMonthOrders, priorMonthOrders),
        profit: delta(thisMonthProfit, priorMonthProfit),
      },
      orderCount: orders.length,
      kpis: {
        totalRevenue: Math.round(thisMonthRevenue),
        totalOrders: thisMonthOrders,
        netProfit: financials.netProfit,
        margin: financials.margin,
        pendingPayout: financials.pendingPayout,
      },
      revenueByMonth: monthBuckets.map(m => ({ month: m.label, revenue: Math.round(m.revenue), orders: m.orders, profit: Math.round(m.profit) })),
      dailyThisWeek: daily,
      topProducts,
      recentOrders,
      categoryData,
      financials,
    });
  } catch (error: any) {
    console.error('Error building store analytics:', error);
    return c.json({ success: false, error: error.message || 'Failed to build store analytics' }, 500);
  }
});

export default app;
