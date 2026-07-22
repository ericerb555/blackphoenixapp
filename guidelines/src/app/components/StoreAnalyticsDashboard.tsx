/**
 * StoreAnalyticsDashboard — Ecommerce store sales breakdown & financials
 * Revenue · Orders · Products · Customers · Profit & Loss · Payouts
 */
import { useState } from 'react';
import {
  DollarSign, ShoppingCart, Package, Users, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, BarChart3, Calendar, Download,
  Star, RefreshCw, Eye, CreditCard, Truck, Tag, Award,
  ChevronDown, ChevronUp, Minus,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { toast } from 'sonner@2.0.3';

// ── Demo Data ──────────────────────────────────────────────────────────────────

const REVENUE_DATA = [
  { month: 'Jan', revenue: 4200, orders: 38, profit: 1680 },
  { month: 'Feb', revenue: 5800, orders: 52, profit: 2320 },
  { month: 'Mar', revenue: 7100, orders: 64, profit: 2840 },
  { month: 'Apr', revenue: 6400, orders: 58, profit: 2560 },
  { month: 'May', revenue: 9200, orders: 84, profit: 3680 },
  { month: 'Jun', revenue: 11400, orders: 103, profit: 4560 },
  { month: 'Jul', revenue: 13800, orders: 124, profit: 5520 },
];

const DAILY_DATA = [
  { day: 'Mon', revenue: 420, orders: 4 },
  { day: 'Tue', revenue: 680, orders: 6 },
  { day: 'Wed', revenue: 520, orders: 5 },
  { day: 'Thu', revenue: 890, orders: 8 },
  { day: 'Fri', revenue: 1240, orders: 11 },
  { day: 'Sat', revenue: 1580, orders: 14 },
  { day: 'Sun', revenue: 980, orders: 9 },
];

const TOP_PRODUCTS = [
  { id: 'p1', name: 'Wireless Noise-Cancelling Earbuds', category: 'Electronics', unitsSold: 142, revenue: 5538, profit: 2215, margin: 40, trend: 'up', trendPct: 28, image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=80&q=80' },
  { id: 'p2', name: 'Stanley Tumbler 40oz', category: 'Kitchen', unitsSold: 218, revenue: 3924, profit: 1570, margin: 40, trend: 'up', trendPct: 89, image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=80&q=80' },
  { id: 'p3', name: 'LED Strip Lights 50ft', category: 'Electronics', unitsSold: 189, revenue: 4536, profit: 1814, margin: 40, trend: 'up', trendPct: 44, image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=80&q=80' },
  { id: 'p4', name: 'Vitamin C Gummies 60ct', category: 'Health', unitsSold: 324, revenue: 5184, profit: 2074, margin: 40, trend: 'up', trendPct: 61, image: 'https://images.unsplash.com/photo-1550572017-4fcdbb59cc32?w=80&q=80' },
  { id: 'p5', name: 'Cordless Spin Scrubber', category: 'Home', unitsSold: 97, revenue: 3298, profit: 1319, margin: 40, trend: 'up', trendPct: 33, image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=80&q=80' },
  { id: 'p6', name: 'Mini Waffle Maker', category: 'Kitchen', unitsSold: 267, revenue: 3738, profit: 1495, margin: 40, trend: 'up', trendPct: 115, image: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=80&q=80' },
];

const RECENT_ORDERS = [
  { id: '#8842', customer: 'Sarah M.', product: 'Wireless Earbuds', amount: 39, status: 'delivered', date: 'Today 2:14pm', supplier: 'Doba' },
  { id: '#8841', customer: 'James K.', product: 'Stanley Tumbler', amount: 18, status: 'shipped', date: 'Today 11:30am', supplier: 'CJ Dropshipping' },
  { id: '#8840', customer: 'Maria L.', product: 'LED Strip Lights', amount: 24, status: 'processing', date: 'Today 9:48am', supplier: 'Doba' },
  { id: '#8839', customer: 'David R.', product: 'Vitamin Gummies', amount: 16, status: 'delivered', date: 'Yesterday', supplier: 'Spocket' },
  { id: '#8838', customer: 'Ashley T.', product: 'Mini Waffle Maker', amount: 14, status: 'delivered', date: 'Yesterday', supplier: 'CJ Dropshipping' },
  { id: '#8837', customer: 'Chris P.', product: 'Spin Scrubber', amount: 34, status: 'shipped', date: '2 days ago', supplier: 'Doba' },
];

const CATEGORY_DATA = [
  { name: 'Electronics', value: 38, color: '#3b82f6' },
  { name: 'Kitchen', value: 24, color: '#f97316' },
  { name: 'Health & Beauty', value: 19, color: '#a855f7' },
  { name: 'Home & Garden', value: 12, color: '#22c55e' },
  { name: 'Other', value: 7, color: '#6b7280' },
];

const FINANCIALS = {
  grossRevenue: 13800,
  productCost: 6900,
  grossProfit: 6900,
  platformFees: 414,
  paymentFees: 276,
  adSpend: 690,
  netProfit: 5520,
  margin: 40,
  pendingPayout: 4280,
  lastPayout: 3840,
};

type DashTab = 'overview' | 'products' | 'orders' | 'financials' | 'customers';

function statBadge(trend: string, pct: number) {
  if (trend === 'up') return <span className="flex items-center gap-0.5 text-green-400 text-xs font-bold"><ArrowUpRight className="w-3 h-3" />+{pct}%</span>;
  if (trend === 'down') return <span className="flex items-center gap-0.5 text-red-400 text-xs font-bold"><ArrowDownRight className="w-3 h-3" />-{pct}%</span>;
  return <span className="flex items-center gap-0.5 text-gray-500 text-xs font-bold"><Minus className="w-3 h-3" />{pct}%</span>;
}

function orderBadge(status: string) {
  if (status === 'delivered') return 'bg-green-500/20 text-green-400 border-green-500/30';
  if (status === 'shipped') return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  if (status === 'processing') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}

export default function StoreAnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<DashTab>('overview');
  const [dateRange, setDateRange] = useState('30d');
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const tabs: { id: DashTab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'financials', label: 'Financials', icon: DollarSign },
    { id: 'customers', label: 'Customers', icon: Users },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-orange-400" /> Store Analytics & Financials
          </h2>
          <p className="text-gray-400 text-sm mt-0.5">Sales breakdown · Revenue · Profit & Loss · Order tracking</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Date range */}
          <div className="flex gap-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-1">
            {['7d', '30d', '90d', '1y'].map(r => (
              <button key={r} onClick={() => setDateRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${dateRange === r ? 'bg-orange-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                {r}
              </button>
            ))}
          </div>
          <button onClick={() => toast.success('Report exported!')}
            className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-xl text-sm transition">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: '$13,800', sub: 'This month', trend: 'up', pct: 21, icon: DollarSign, color: 'text-green-400 bg-green-500/10 border-green-500/20' },
          { label: 'Total Orders', value: '124', sub: 'This month', trend: 'up', pct: 18, icon: ShoppingCart, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
          { label: 'Net Profit', value: '$5,520', sub: '40% margin', trend: 'up', pct: 24, icon: TrendingUp, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
          { label: 'Pending Payout', value: '$4,280', sub: 'Next: Thu', trend: 'up', pct: 11, icon: CreditCard, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
        ].map((k, i) => {
          const Icon = k.icon;
          return (
            <div key={i} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-5 hover:border-orange-500/20 transition">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-3 ${k.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-black text-white">{k.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
                </div>
                {statBadge(k.trend, k.pct)}
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
          {/* Revenue chart */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-white">Revenue & Profit</h3>
                <p className="text-xs text-gray-500 mt-0.5">Monthly breakdown</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-500" /> Revenue</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500" /> Profit</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={REVENUE_DATA}>
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
                <YAxis key="ya1" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip key="tt1" contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => [`$${v.toLocaleString()}`, '']} />
                <Area key="area-revenue" type="monotone" dataKey="revenue" stroke="#ea580c" fill="url(#rev)" strokeWidth={2} name="Revenue" />
                <Area key="area-profit" type="monotone" dataKey="profit" stroke="#22c55e" fill="url(#prof)" strokeWidth={2} name="Profit" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily revenue this week */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
              <h3 className="font-bold text-white mb-4">This Week — Daily Sales</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={DAILY_DATA}>
                  <CartesianGrid key="cg2" strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis key="xa2" dataKey="day" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis key="ya2" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip key="tt2" contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, fontSize: 12 }}
                    formatter={(v: any) => [`$${v}`, 'Revenue']} />
                  <Bar key="bar-revenue" dataKey="revenue" fill="#ea580c" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Category breakdown */}
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
              <h3 className="font-bold text-white mb-4">Revenue by Category</h3>
              <div className="flex items-center gap-6">
                <PieChart width={140} height={140}>
                  <Pie data={CATEGORY_DATA} cx={70} cy={70} innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={2}>
                    {CATEGORY_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
                <div className="flex-1 space-y-2.5">
                  {CATEGORY_DATA.map(cat => (
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
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Avg Order Value', value: '$111', icon: ShoppingCart },
              { label: 'Return Rate', value: '1.8%', icon: RefreshCw },
              { label: 'Customer LTV', value: '$284', icon: Users },
              { label: 'Top Supplier', value: 'Doba', icon: Truck },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4 flex items-center gap-3">
                  <Icon className="w-5 h-5 text-orange-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-black text-white">{s.value}</p>
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
          <p className="text-sm text-gray-400">{TOP_PRODUCTS.length} products · sorted by revenue</p>
          {TOP_PRODUCTS.sort((a,b) => b.revenue - a.revenue).map(product => {
            const expanded = expandedProduct === product.id;
            return (
              <div key={product.id} className="bg-[#1A1A1A] border border-[#2A2A2A] hover:border-orange-500/20 rounded-2xl overflow-hidden transition">
                <div className="flex items-center gap-4 px-5 py-4 cursor-pointer" onClick={() => setExpandedProduct(expanded ? null : product.id)}>
                  <img src={product.image} alt={product.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm truncate">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.category} · {product.unitsSold} units sold</p>
                  </div>
                  <div className="flex items-center gap-6 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-bold text-white">${product.revenue.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">Revenue</p>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-sm font-bold text-green-400">${product.profit.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">Profit</p>
                    </div>
                    <div className="text-right hidden md:block">
                      <p className="text-sm font-bold text-white">{product.margin}%</p>
                      <p className="text-xs text-gray-500">Margin</p>
                    </div>
                    {statBadge(product.trend, product.trendPct)}
                    {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>
                {expanded && (
                  <div className="border-t border-[#2A2A2A] px-5 py-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {[
                        { label: 'Units Sold', value: product.unitsSold },
                        { label: 'Total Revenue', value: `$${product.revenue.toLocaleString()}` },
                        { label: 'Net Profit', value: `$${product.profit.toLocaleString()}` },
                        { label: 'Profit Margin', value: `${product.margin}%` },
                      ].map((m, i) => (
                        <div key={i} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-3">
                          <p className="text-sm font-bold text-white">{m.value}</p>
                          <p className="text-xs text-gray-500">{m.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => toast.success('Opening Creator Studio with this product…')}
                        className="px-4 py-2 bg-orange-600/20 border border-orange-500/30 text-orange-400 hover:bg-orange-600/30 rounded-lg text-xs font-bold transition">
                        🎬 Create Video
                      </button>
                      <button onClick={() => toast.success('Product report exported!')}
                        className="px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400 hover:text-white rounded-lg text-xs font-bold transition">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── ORDERS ───────────────────────────────────────────────────────────── */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">124 orders this month · {RECENT_ORDERS.filter(o => o.status === 'processing').length} processing</p>
          </div>
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A]">
                  {['Order', 'Customer', 'Product', 'Amount', 'Supplier', 'Status', 'Date'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RECENT_ORDERS.map((order, i) => (
                  <tr key={order.id} className={`border-b border-[#0A0A0A] hover:bg-[#0A0A0A]/50 transition ${i % 2 === 0 ? '' : 'bg-[#0A0A0A]/20'}`}>
                    <td className="px-5 py-3 font-mono text-xs text-orange-400 font-bold">{order.id}</td>
                    <td className="px-5 py-3 text-white">{order.customer}</td>
                    <td className="px-5 py-3 text-gray-300 truncate max-w-[140px]">{order.product}</td>
                    <td className="px-5 py-3 font-bold text-white">${order.amount}</td>
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
          </div>
        </div>
      )}

      {/* ── FINANCIALS ───────────────────────────────────────────────────────── */}
      {activeTab === 'financials' && (
        <div className="space-y-6">
          {/* P&L Summary */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
            <h3 className="font-bold text-white mb-5 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-orange-400" /> Profit & Loss — This Month
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Gross Revenue', value: FINANCIALS.grossRevenue, color: 'text-white', bg: '', sign: '' },
                { label: 'Product Cost (COGS)', value: -FINANCIALS.productCost, color: 'text-red-400', bg: '', sign: '−' },
                { label: 'Gross Profit', value: FINANCIALS.grossProfit, color: 'text-green-400', bg: 'border-t border-[#2A2A2A] pt-3', sign: '' },
                { label: 'Platform Fees (3%)', value: -FINANCIALS.platformFees, color: 'text-red-400', bg: '', sign: '−' },
                { label: 'Payment Processing (2%)', value: -FINANCIALS.paymentFees, color: 'text-red-400', bg: '', sign: '−' },
                { label: 'Ad Spend', value: -FINANCIALS.adSpend, color: 'text-red-400', bg: '', sign: '−' },
                { label: 'Net Profit', value: FINANCIALS.netProfit, color: 'text-orange-400 text-lg font-black', bg: 'border-t border-orange-500/30 pt-3 mt-2', sign: '' },
              ].map((row, i) => (
                <div key={i} className={`flex items-center justify-between ${row.bg}`}>
                  <p className="text-sm text-gray-300">{row.label}</p>
                  <p className={`font-bold text-sm ${row.color}`}>
                    {row.sign}${Math.abs(row.value).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-[#2A2A2A] flex items-center justify-between">
              <p className="text-sm text-gray-400">Net Profit Margin</p>
              <p className="text-xl font-black text-orange-400">{FINANCIALS.margin}%</p>
            </div>
          </div>

          {/* Payout info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-gradient-to-br from-orange-600/10 to-orange-700/5 border border-orange-500/20 rounded-2xl p-6">
              <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2">Pending Payout</p>
              <p className="text-4xl font-black text-white">${FINANCIALS.pendingPayout.toLocaleString()}</p>
              <p className="text-sm text-gray-400 mt-2">Estimated Thursday · Direct deposit</p>
              <div className="mt-4 h-2 rounded-full overflow-hidden bg-[#1A1A1A]">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: '72%' }} />
              </div>
              <p className="text-xs text-gray-500 mt-1">72% of this month's profit cleared</p>
            </div>

            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Last Payout</p>
              <p className="text-4xl font-black text-white">${FINANCIALS.lastPayout.toLocaleString()}</p>
              <p className="text-sm text-gray-400 mt-2">Received June 30 · Direct deposit</p>
              <div className="mt-4 space-y-2">
                {[
                  { label: 'Doba orders', amount: 2240 },
                  { label: 'Spocket orders', amount: 890 },
                  { label: 'CJ Dropshipping', amount: 710 },
                ].map((s, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-500">{s.label}</span>
                    <span className="text-white font-semibold">${s.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Monthly trend */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
            <h3 className="font-bold text-white mb-4">Profit Trend — Last 7 Months</h3>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={REVENUE_DATA}>
                <CartesianGrid key="cg3" strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis key="xa3" dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis key="ya3" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip key="tt3" contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => [`$${v}`, 'Net Profit']} />
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
              { label: 'Total Customers', value: '342', trend: '+14%', icon: Users },
              { label: 'Returning Customers', value: '28%', trend: '+3%', icon: RefreshCw },
              { label: 'Avg Lifetime Value', value: '$284', trend: '+$22', icon: DollarSign },
              { label: 'Avg Rating', value: '4.7★', trend: '+0.2', icon: Star },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-4">
                  <Icon className="w-5 h-5 text-orange-400 mb-3" />
                  <p className="text-xl font-black text-white">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className="text-xs text-green-400 font-semibold mt-1">{s.trend} vs last month</p>
                </div>
              );
            })}
          </div>

          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6">
            <h3 className="font-bold text-white mb-4">Top Customers by Spend</h3>
            <div className="space-y-3">
              {[
                { name: 'Sarah M.', orders: 8, total: 312, badge: '🏆 VIP' },
                { name: 'James K.', orders: 6, total: 248, badge: '⭐ Loyal' },
                { name: 'Maria L.', orders: 5, total: 186, badge: '⭐ Loyal' },
                { name: 'David R.', orders: 4, total: 142, badge: '' },
                { name: 'Ashley T.', orders: 3, total: 98, badge: '' },
              ].map((c, i) => (
                <div key={i} className="flex items-center gap-4 py-2 border-b border-[#2A2A2A] last:border-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">{c.name}</p>
                      {c.badge && <span className="text-xs">{c.badge}</span>}
                    </div>
                    <p className="text-xs text-gray-500">{c.orders} orders</p>
                  </div>
                  <p className="font-bold text-orange-400">${c.total}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
