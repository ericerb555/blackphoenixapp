/**
 * StoreAnalyticsDashboard — Ecommerce store sales breakdown & financials
 * Revenue · Orders · Products · Customers · Profit & Loss · Payouts
 *
 * Every figure on this screen comes from GET /analytics/store, which aggregates
 * real order records. There is no sample or placeholder data: before the first
 * order exists the dashboard shows an empty state, and any metric the server
 * can't source (a rating nobody left, a month-over-month delta with no prior
 * month) renders as "—" rather than an invented number.
 */
import { useState, useEffect, useMemo } from 'react';
import {
  DollarSign, ShoppingCart, Package, Users, TrendingUp,
  ArrowUpRight, ArrowDownRight, BarChart3, Download,
  Star, RefreshCw, CreditCard, Truck,
  ChevronDown, ChevronUp, Minus, AlertCircle,
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { authedHeadersOrAnon } from "../utils/authHeaders";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { toast } from 'sonner@2.0.3';

type DashTab = 'overview' | 'products' | 'orders' | 'financials' | 'customers';

interface MonthPoint { month: string; revenue: number; orders: number; profit: number }
interface DayPoint { day: string; revenue: number; orders: number }
interface ProductRow {
  id: string; name: string; category: string; unitsSold: number;
  revenue: number; profit: number; margin: number;
  trend: 'up' | 'down' | 'flat'; trendPct: number; image?: string;
}
interface OrderRow {
  id: string; customer: string; product: string; amount: number;
  status: string; date: string; supplier: string;
}
interface CategorySlice { name: string; value: number; color: string }
interface Financials {
  grossRevenue: number; productCost: number; grossProfit: number;
  platformFees: number; paymentFees: number; adSpend: number;
  netProfit: number; margin: number; pendingPayout: number; lastPayout: number;
}
interface StorePayload {
  orderCount: number;
  kpis: { totalRevenue: number; totalOrders: number; netProfit: number; margin: number; pendingPayout: number };
  revenueByMonth: MonthPoint[];
  dailyThisWeek: DayPoint[];
  topProducts: ProductRow[];
  recentOrders: OrderRow[];
  categoryData: CategorySlice[];
  financials: Financials;
  quickStats: { avgOrderValue: number; returnRate: number; customerLtv: number; topSupplier: string | null };
  customerStats: { totalCustomers: number; returningPct: number; avgLifetimeValue: number; avgRating: number | null; ratingCount: number };
  topCustomers: { name: string; orders: number; total: number }[];
  supplierRevenue: { name: string; amount: number }[];
  deltas: { revenue: number | null; orders: number | null; profit: number | null };
}

const fmt = (n: number) => `$${Math.round(n || 0).toLocaleString()}`;

/** Month-over-month badge. Renders nothing when there's no prior month to compare. */
function deltaBadge(pct: number | null) {
  if (pct === null || pct === undefined) return <span className="text-xs text-gray-600">—</span>;
  if (pct > 0) return <span className="flex items-center gap-0.5 text-green-400 text-xs font-bold"><ArrowUpRight className="w-3 h-3" />+{pct}%</span>;
  if (pct < 0) return <span className="flex items-center gap-0.5 text-red-400 text-xs font-bold"><ArrowDownRight className="w-3 h-3" />{pct}%</span>;
  return <span className="flex items-center gap-0.5 text-gray-500 text-xs font-bold"><Minus className="w-3 h-3" />0%</span>;
}

function trendBadge(trend: string, pct: number) {
  if (trend === 'up') return <span className="flex items-center gap-0.5 text-green-400 text-xs font-bold"><ArrowUpRight className="w-3 h-3" />+{pct}%</span>;
  if (trend === 'down') return <span className="flex items-center gap-0.5 text-red-400 text-xs font-bold"><ArrowDownRight className="w-3 h-3" />-{pct}%</span>;
  return <span className="flex items-center gap-0.5 text-gray-500 text-xs font-bold"><Minus className="w-3 h-3" />{pct}%</span>;
}

function orderBadge(status: string) {
  if (status === 'delivered') return 'bg-green-500/20 text-green-400 border-green-500/30';
  if (status === 'shipped') return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  if (status === 'processing') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  if (status === 'cancelled' || status === 'refunded') return 'bg-red-500/20 text-red-400 border-red-500/30';
  return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map(r => r.map(esc).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function StoreAnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<DashTab>('overview');
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StorePayload | null>(null);

  useEffect(() => { loadAnalytics(); }, []);

  async function loadAnalytics() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/analytics/store`, {
        headers: await authedHeadersOrAnon(publicAnonKey),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.success === false) {
        throw new Error(body.error || `Server responded ${res.status}`);
      }
      setData(body.hasData ? (body as StorePayload) : null);
    } catch (e: any) {
      console.error('Store analytics load failed:', e);
      setError(e?.message || 'Could not load store analytics.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const sortedProducts = useMemo(
    () => [...(data?.topProducts || [])].sort((a, b) => b.revenue - a.revenue),
    [data],
  );

  function exportOverview() {
    if (!data) return;
    const rows: (string | number)[][] = [
      ['Store analytics export', new Date().toLocaleString()],
      [],
      ['Month', 'Revenue', 'Orders', 'Profit'],
      ...data.revenueByMonth.map(m => [m.month, m.revenue, m.orders, m.profit]),
      [],
      ['Product', 'Category', 'Units', 'Revenue', 'Profit', 'Margin %'],
      ...sortedProducts.map(p => [p.name, p.category, p.unitsSold, p.revenue, p.profit, p.margin]),
    ];
    downloadCsv(`store-analytics-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast.success('Analytics exported');
  }

  function exportProduct(p: ProductRow) {
    downloadCsv(`product-${p.id}.csv`, [
      ['Product', 'Category', 'Units sold', 'Revenue', 'Profit', 'Margin %'],
      [p.name, p.category, p.unitsSold, p.revenue, p.profit, p.margin],
    ]);
    toast.success('Product report exported');
  }

  const kpiCards = data ? [
    { label: 'Total Revenue', value: fmt(data.kpis.totalRevenue), sub: 'This month', delta: data.deltas.revenue, icon: DollarSign, color: 'text-green-400 bg-green-500/10 border-green-500/20' },
    { label: 'Total Orders', value: String(data.kpis.totalOrders), sub: 'This month', delta: data.deltas.orders, icon: ShoppingCart, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    { label: 'Net Profit', value: fmt(data.kpis.netProfit), sub: `${data.kpis.margin}% margin`, delta: data.deltas.profit, icon: TrendingUp, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
    { label: 'Pending Payout', value: fmt(data.kpis.pendingPayout), sub: 'Paid, awaiting fulfillment', delta: null, icon: CreditCard, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  ] : [];

  const tabs: { id: DashTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'financials', label: 'Financials', icon: DollarSign },
    { id: 'customers', label: 'Customers', icon: Users },
  ];

  const header = (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-orange-400" /> Store Analytics &amp; Financials
        </h2>
        <p className="text-gray-400 text-sm mt-0.5">Sales breakdown · Revenue · Profit &amp; Loss · Order tracking</p>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={loadAnalytics} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-xl text-sm transition disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
        <button onClick={exportOverview} disabled={!data}
          className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-xl text-sm transition disabled:opacity-40">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        {header}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-12 text-center text-gray-400 text-sm">
          Loading store analytics…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        {header}
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-sm text-red-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-200">Couldn't load store analytics</p>
            <p className="mt-1">{error}</p>
            <button onClick={loadAnalytics} className="mt-3 px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg text-xs font-bold text-red-200 hover:bg-red-500/30 transition">
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        {header}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-12 text-center">
          <ShoppingCart className="w-10 h-10 text-gray-600 mx-auto mb-4" />
          <p className="text-white font-bold">No orders yet</p>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            Revenue, profit &amp; loss, product performance and customer figures all populate
            automatically from your store's orders. Nothing is shown here until the first order
            comes in.
          </p>
        </div>
      </div>
    );
  }

  const { financials, quickStats, customerStats } = data;

  return (
    <div className="space-y-6">
      {header}

      <p className="text-xs text-gray-500">
        Derived from {data.orderCount.toLocaleString()} order{data.orderCount === 1 ? '' : 's'}.
      </p>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpiCards.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 hover:border-orange-500/20 transition">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-3 ${k.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-black text-white">{k.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
                </div>
                {deltaBadge(k.delta)}
              </div>
              <p className="text-xs text-gray-600 mt-1">{k.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap text-sm font-semibold transition flex-shrink-0 ${
                activeTab === tab.id ? 'bg-orange-600 text-white' : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white'
              }`}>
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-white">Revenue &amp; Profit</h3>
                <p className="text-xs text-gray-500 mt-0.5">Last 7 months</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-500" /> Revenue</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500" /> Profit</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.revenueByMonth}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="prof" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid key="cg1" strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis key="xa1" dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis key="ya1" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip key="tt1" contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => [`$${Number(v).toLocaleString()}`, '']} />
                <Area key="area-revenue" type="monotone" dataKey="revenue" stroke="#ea580c" fill="url(#rev)" strokeWidth={2} name="Revenue" />
                <Area key="area-profit" type="monotone" dataKey="profit" stroke="#22c55e" fill="url(#prof)" strokeWidth={2} name="Profit" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
              <h3 className="font-bold text-white mb-4">This Week — Daily Sales</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={data.dailyThisWeek}>
                  <CartesianGrid key="cg2" strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis key="xa2" dataKey="day" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis key="ya2" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip key="tt2" contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any) => [`$${v}`, 'Revenue']} />
                  <Bar key="bar-revenue" dataKey="revenue" fill="#ea580c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
              <h3 className="font-bold text-white mb-4">Revenue by Category</h3>
              {data.categoryData.length === 0 ? (
                <p className="text-sm text-gray-500 py-10 text-center">No categorised line items yet.</p>
              ) : (
                <div className="flex items-center gap-6">
                  <PieChart width={140} height={140}>
                    <Pie data={data.categoryData} cx={70} cy={70} innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={2}>
                      {data.categoryData.map((entry) => (
                        <Cell key={`cell-${entry.name}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                  <div className="flex-1 space-y-2.5">
                    {data.categoryData.map(cat => (
                      <div key={cat.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                          <span className="text-xs text-gray-300">{cat.name}</span>
                        </div>
                        <span className="text-xs font-bold text-white">{cat.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick stats — all derived server-side from orders */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Avg Order Value', value: fmt(quickStats.avgOrderValue), icon: ShoppingCart },
              { label: 'Cancelled / Refunded', value: `${quickStats.returnRate}%`, icon: RefreshCw },
              { label: 'Revenue per Customer', value: fmt(quickStats.customerLtv), icon: Users },
              { label: 'Top Supplier', value: quickStats.topSupplier || '—', icon: Truck },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 flex items-center gap-3">
                  <Icon className="w-5 h-5 text-orange-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white truncate">{s.value}</p>
                    <p className="text-xs text-gray-500">{s.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── PRODUCTS ─────────────────────────────────────────────────────────── */}
      {activeTab === 'products' && (
        <div className="space-y-3">
          {sortedProducts.length === 0 ? (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-10 text-center text-sm text-gray-500">
              No product-level line items recorded on your orders yet.
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-400">{sortedProducts.length} products · sorted by revenue</p>
              {sortedProducts.map(product => {
                const expanded = expandedProduct === product.id;
                return (
                  <div key={product.id} className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/20 rounded-2xl overflow-hidden transition">
                    <div className="flex items-center gap-4 px-5 py-4 cursor-pointer" onClick={() => setExpandedProduct(expanded ? null : product.id)}>
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-[#0A0A0A] border border-[#2A2A2A] flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-gray-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm truncate">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.category} · {product.unitsSold} units sold</p>
                      </div>
                      <div className="flex items-center gap-6 flex-shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-sm font-bold text-white">{fmt(product.revenue)}</p>
                          <p className="text-xs text-gray-500">Revenue</p>
                        </div>
                        <div className="text-right hidden md:block">
                          <p className="text-sm font-bold text-green-400">{fmt(product.profit)}</p>
                          <p className="text-xs text-gray-500">Profit</p>
                        </div>
                        <div className="text-right hidden md:block">
                          <p className="text-sm font-bold text-white">{product.margin}%</p>
                          <p className="text-xs text-gray-500">Margin</p>
                        </div>
                        {trendBadge(product.trend, product.trendPct)}
                        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </div>
                    {expanded && (
                      <div className="border-t border-[#2A2A2A] px-5 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          {[
                            { label: 'Units Sold', value: String(product.unitsSold) },
                            { label: 'Total Revenue', value: fmt(product.revenue) },
                            { label: 'Net Profit', value: fmt(product.profit) },
                            { label: 'Profit Margin', value: `${product.margin}%` },
                          ].map((m) => (
                            <div key={m.label} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-3">
                              <p className="text-sm font-bold text-white">{m.value}</p>
                              <p className="text-xs text-gray-500">{m.label}</p>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => exportProduct(product)}
                          className="flex items-center gap-2 px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-lg text-xs font-bold transition">
                          <Download className="w-3.5 h-3.5" /> Export product report
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ── ORDERS ───────────────────────────────────────────────────────────── */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            {data.kpis.totalOrders} order{data.kpis.totalOrders === 1 ? '' : 's'} this month ·
            {' '}{data.recentOrders.filter(o => o.status === 'processing').length} processing
          </p>
          {data.recentOrders.length === 0 ? (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-10 text-center text-sm text-gray-500">
              No orders recorded yet.
            </div>
          ) : (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2A2A2A]">
                    {['Order', 'Customer', 'Product', 'Amount', 'Supplier', 'Status', 'Date'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((order, i) => (
                    <tr key={order.id} className={`border-b border-[#0A0A0A] hover:bg-[#0A0A0A]/50 transition ${i % 2 === 0 ? '' : 'bg-[#0A0A0A]/20'}`}>
                      <td className="px-5 py-3 font-mono text-xs text-orange-400 font-bold">{order.id}</td>
                      <td className="px-5 py-3 text-white">{order.customer}</td>
                      <td className="px-5 py-3 text-gray-300 truncate max-w-[140px]">{order.product}</td>
                      <td className="px-5 py-3 font-bold text-white">{fmt(order.amount)}</td>
                      <td className="px-5 py-3 text-gray-400 text-xs">{order.supplier}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${orderBadge(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs">{order.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="px-5 py-3 text-xs text-gray-600 border-t border-[#2A2A2A]">
                Showing the {data.recentOrders.length} most recent orders.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── FINANCIALS ───────────────────────────────────────────────────────── */}
      {activeTab === 'financials' && (
        <div className="space-y-6">
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
            <h3 className="font-bold text-white mb-5 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-orange-400" /> Profit &amp; Loss — All Recorded Orders
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Gross Revenue', value: financials.grossRevenue, color: 'text-white', bg: '', sign: '' },
                { label: 'Product Cost (COGS)', value: -financials.productCost, color: 'text-red-400', bg: '', sign: '−' },
                { label: 'Gross Profit', value: financials.grossProfit, color: 'text-green-400', bg: 'border-t border-[#2A2A2A] pt-3', sign: '' },
                { label: 'Platform Fees', value: -financials.platformFees, color: 'text-red-400', bg: '', sign: '−' },
                { label: 'Payment Processing', value: -financials.paymentFees, color: 'text-red-400', bg: '', sign: '−' },
                { label: 'Ad Spend', value: -financials.adSpend, color: 'text-red-400', bg: '', sign: '−' },
                { label: 'Net Profit', value: financials.netProfit, color: 'text-orange-400 text-lg font-black', bg: 'border-t border-orange-500/30 pt-3 mt-2', sign: '' },
              ].map((row) => (
                <div key={row.label} className={`flex items-center justify-between ${row.bg}`}>
                  <p className="text-sm text-gray-300">{row.label}</p>
                  <p className={`font-bold text-sm ${row.color}`}>
                    {row.sign}{fmt(Math.abs(row.value))}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-[#2A2A2A] flex items-center justify-between">
              <p className="text-sm text-gray-400">Net Profit Margin</p>
              <p className="text-xl font-black text-orange-400">{financials.margin}%</p>
            </div>
            <p className="text-xs text-gray-600 mt-3">
              Where an order line didn't record a cost basis, COGS is estimated at a 40% gross
              margin. Payment processing uses 2.9% + $0.30 per order.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-gradient-to-br from-orange-600/10 to-orange-700/5 border border-orange-500/20 rounded-2xl p-6">
              <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">Pending Payout</p>
              <p className="text-4xl font-black text-white">{fmt(financials.pendingPayout)}</p>
              <p className="text-sm text-gray-400 mt-2">Paid orders not yet fulfilled</p>
            </div>

            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Revenue by Supplier</p>
              {data.supplierRevenue.length === 0 ? (
                <p className="text-sm text-gray-500">No supplier recorded on any order line.</p>
              ) : (
                <div className="space-y-2">
                  {data.supplierRevenue.map(s => (
                    <div key={s.name} className="flex justify-between text-sm">
                      <span className="text-gray-500">{s.name}</span>
                      <span className="text-white font-semibold">{fmt(s.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
            <h3 className="font-bold text-white mb-4">Profit Trend — Last 7 Months</h3>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={data.revenueByMonth}>
                <CartesianGrid key="cg3" strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis key="xa3" dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis key="ya3" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip key="tt3" contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => [`$${Number(v).toLocaleString()}`, 'Net Profit']} />
                <Line key="line-profit" type="monotone" dataKey="profit" stroke="#ea580c" strokeWidth={2.5} dot={{ fill: '#ea580c', strokeWidth: 0, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── CUSTOMERS ────────────────────────────────────────────────────────── */}
      {activeTab === 'customers' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Customers', value: String(customerStats.totalCustomers), note: 'Distinct buyers', icon: Users },
              { label: 'Returning Customers', value: `${customerStats.returningPct}%`, note: 'More than one order', icon: RefreshCw },
              { label: 'Revenue per Customer', value: fmt(customerStats.avgLifetimeValue), note: 'Lifetime to date', icon: DollarSign },
              {
                label: 'Avg Rating',
                value: customerStats.avgRating === null ? '—' : `${customerStats.avgRating}★`,
                note: customerStats.avgRating === null ? 'No ratings recorded' : `${customerStats.ratingCount} rated orders`,
                icon: Star,
              },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                  <Icon className="w-5 h-5 text-orange-400 mb-3" />
                  <p className="text-xl font-black text-white">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className="text-xs text-gray-600 mt-1">{s.note}</p>
                </div>
              );
            })}
          </div>

          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
            <h3 className="font-bold text-white mb-4">Top Customers by Spend</h3>
            {data.topCustomers.length === 0 ? (
              <p className="text-sm text-gray-500">No customer details recorded on your orders yet.</p>
            ) : (
              <div className="space-y-3">
                {data.topCustomers.map((c) => (
                  <div key={c.name} className="flex items-center gap-4 py-2 border-b border-[#2A2A2A] last:border-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.orders} order{c.orders === 1 ? '' : 's'}</p>
                    </div>
                    <p className="font-bold text-orange-400">{fmt(c.total)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
