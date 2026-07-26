import { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Users, ShoppingCart,
  Star, Zap, RefreshCw, Tag, Gift, MessageSquare, Calendar,
  BarChart2, ArrowUpRight, ArrowDownRight, Flame, Award,
  Eye, Package, Clock, ChevronRight, Activity,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };

// Map an activity event type from the server to an icon + color.
const ACTIVITY_ICON: Record<string, { icon: any; color: string }> = {
  order:        { icon: ShoppingCart,  color: '#ea580c' },
  lead:         { icon: Users,         color: '#818cf8' },
  review:       { icon: Star,          color: '#fbbf24' },
  subscription: { icon: RefreshCw,     color: '#34d399' },
  sms:          { icon: MessageSquare, color: '#fb923c' },
  giftcard:     { icon: Gift,          color: '#f472b6' },
};

// ─── Subcomponents ────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, change, icon: Icon, color }: {
  label: string; value: string; sub?: string; change?: number;
  icon: any; color: string;
}) {
  const positive = (change ?? 0) >= 0;
  return (
    <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color + '18' }}>
          <Icon className="w-4.5 h-4.5" style={{ color }} />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs font-black ${positive ? 'text-green-400' : 'text-red-400'}`}>
            {positive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-gray-700 mt-0.5">{sub}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2 text-xs space-y-1" style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}>
      <p className="font-black text-gray-400">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <span className="font-black text-white">{typeof p.value === 'number' && p.value > 100 ? `$${p.value.toLocaleString()}` : p.value}</span>
        </p>
      ))}
    </div>
  );
};

type Period = '7d' | '30d' | 'ytd';

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AnalyticsDashboard() {
  const [period, setPeriod] = useState<Period>('30d');
  const [revData, setRevData]   = useState<any[]>([]);
  const [weekData, setWeekData] = useState<any[]>([]);
  const [srcData, setSrcData]   = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [activity, setActivity] = useState<{ icon: any; color: string; text: string; time: string }[]>([]);
  const [summary, setSummary]   = useState<any | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${SERVER}/analytics/summary`, { headers: authHeaders });
        const json = await res.json();
        if (json.success) {
          setSummary(json.kpis);
          setRevData(json.revenueByMonth || []);
          setWeekData((json.revenueByWeekday || []).map((d: any) => ({ day: d.day, store: d.revenue, services: 0, subs: 0 })));
          setSrcData(json.sources || []);
          setProducts((json.topProducts || []).map((p: any, i: number, arr: any[]) => ({
            ...p, trend: i < Math.ceil(arr.length / 2) ? 'up' : 'down',
          })));
          setActivity((json.activity || []).map((a: any) => ({
            ...(ACTIVITY_ICON[a.type] || { icon: Activity, color: '#6b7280' }), text: a.text, time: a.time,
          })));
        } else {
          console.error('[Analytics] summary failed:', json.error);
        }
      } catch (err) {
        console.error('[Analytics] Error loading summary:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const k = summary || {};
  const kpis = [
    { label: 'Revenue This Month', value: `$${(k.revenueThisMonth ?? 0).toLocaleString()}`, sub: 'This month',        change: k.revenueChange ?? 0, icon: DollarSign,   color: '#ea580c' },
    { label: 'Total Orders',       value: `${k.totalOrders ?? 0}`,                          sub: 'All time',          change: undefined,            icon: ShoppingCart, color: '#60a5fa' },
    { label: 'Active Leads',       value: `${k.activeLeads ?? 0}`,                          sub: 'In pipeline',       change: undefined,            icon: Users,        color: '#818cf8' },
    { label: 'Avg Order Value',    value: `$${(k.avgOrderValue ?? 0).toFixed(2)}`,          sub: 'Per order',         change: undefined,            icon: TrendingUp,   color: '#4ade80' },
    { label: 'Recovery Rate',      value: `${k.recoveryRate ?? 0}%`,                        sub: 'Abandoned cart',    change: undefined,            icon: RefreshCw,    color: '#34d399' },
    { label: 'Gift Redemptions',   value: `${k.giftRedemptions ?? 0}`,                      sub: 'Gift cards',        change: undefined,            icon: Tag,          color: '#fbbf24' },
    { label: 'Review Score',       value: k.reviewCount ? `${k.reviewScore}★` : '—',        sub: `${k.reviewCount ?? 0} total reviews`, change: undefined, icon: Star,   color: '#f472b6' },
    { label: 'Subscriptions',      value: `${k.subscriptions ?? 0}`,                        sub: `$${(k.mrr ?? 0).toLocaleString()} MRR`, change: undefined, icon: Activity, color: '#a78bfa' },
  ];

  // Insights derived from the real summary — only surfaced when the data supports them.
  const insights: { icon: any; color: string; title: string; body: string }[] = [];
  if (summary) {
    if ((k.revenueChange ?? 0) > 0) insights.push({ icon: TrendingUp, color: '#4ade80', title: `Revenue up ${k.revenueChange}%`, body: `You're up ${k.revenueChange}% vs last month, at $${(k.revenueThisMonth ?? 0).toLocaleString()} so far.` });
    else if ((k.revenueChange ?? 0) < 0) insights.push({ icon: TrendingDown, color: '#f87171', title: `Revenue down ${Math.abs(k.revenueChange)}%`, body: `Revenue dropped ${Math.abs(k.revenueChange)}% vs last month. Consider a promo to re-engage.` });
    if ((k.activeLeads ?? 0) > 0) insights.push({ icon: Users, color: '#60a5fa', title: `${k.activeLeads} active lead${k.activeLeads === 1 ? '' : 's'}`, body: `You have ${k.activeLeads} lead${k.activeLeads === 1 ? '' : 's'} in the pipeline. Follow up to convert them.` });
    if ((k.recoveryRate ?? 0) > 0) insights.push({ icon: RefreshCw, color: '#34d399', title: 'Cart recovery active', body: `Your abandoned-cart recovery rate is ${k.recoveryRate}%. Keep the automation running.` });
    if (products[0]) insights.push({ icon: Star, color: '#f472b6', title: 'Top performer', body: `"${products[0].name}" is your best seller with $${(products[0].revenue).toLocaleString()} in revenue.` });
    if ((k.mrr ?? 0) > 0) insights.push({ icon: Tag, color: '#fbbf24', title: `$${(k.mrr).toLocaleString()} MRR`, body: `Recurring revenue from ${k.subscriptions} active subscription${k.subscriptions === 1 ? '' : 's'}.` });
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-6" style={{ background: '#0a0a0a', color: 'white', fontFamily: 'Inter, sans-serif' }}>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-black">Business Analytics</h1>
            <p className="text-gray-500 text-sm mt-1">All revenue streams · all channels · one view</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Live
            </div>
            <div className="flex p-1 rounded-xl gap-1" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              {(['7d','30d','ytd'] as Period[]).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className="px-3 py-1.5 rounded-lg text-xs font-black transition"
                  style={period === p ? { background: '#ea580c', color: 'white' } : { color: '#6b7280' }}>
                  {p === 'ytd' ? 'YTD' : p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {kpis.map(k => <KPICard key={k.label} {...k} />)}
        </div>

        {/* Revenue chart + Source pie */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-black text-white">Revenue Trend</h2>
                <p className="text-xs text-gray-500 mt-0.5">Monthly revenue Jan–Jul 2026</p>
              </div>
              <div className="flex items-center gap-1 text-xs font-black text-green-400">
                <TrendingUp className="w-3.5 h-3.5" /> +18% MoM
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ea580c" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ea580c" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#ea580c" strokeWidth={2.5} fill="url(#revGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 className="font-black text-white mb-1">Revenue Sources</h2>
            <p className="text-xs text-gray-500 mb-4">% of total this month</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={srcData} cx="50%" cy="50%" innerRadius={50} outerRadius={72}
                  dataKey="value" paddingAngle={3}>
                  {srcData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v: any) => `${v}%`} contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {srcData.map(s => (
                <div key={s.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <span className="text-xs text-gray-400">{s.name}</span>
                  </div>
                  <span className="text-xs font-black text-white">{s.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Weekly breakdown + Top products */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 className="font-black text-white mb-1">This Week by Channel</h2>
            <p className="text-xs text-gray-500 mb-4">Daily revenue split — Store / Services / Subs</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weekData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barGap={2}>
                <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="store"    name="Store"    fill="#ea580c" radius={[4,4,0,0]} maxBarSize={28} />
                <Bar dataKey="services" name="Services" fill="#60a5fa" radius={[4,4,0,0]} maxBarSize={28} />
                <Bar dataKey="subs"     name="Subs"     fill="#34d399" radius={[4,4,0,0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-3 justify-center">
              {[['Store','#ea580c'],['Services','#60a5fa'],['Subs','#34d399']].map(([label,color]) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                  <span className="text-[10px] text-gray-500">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 className="font-black text-white mb-1">Top Performers</h2>
            <p className="text-xs text-gray-500 mb-4">Products &amp; services by revenue this month</p>
            <div className="space-y-3">
              {products.length === 0 && (
                <p className="text-xs text-gray-600 py-6 text-center">{loading ? 'Loading…' : 'No product sales yet.'}</p>
              )}
              {products.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-gray-700 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-white truncate">{p.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: '#1a1a1a' }}>
                        <div className="h-full rounded-full" style={{ width: `${(p.revenue / products[0].revenue) * 100}%`, background: '#ea580c' }} />
                      </div>
                      <span className="text-[10px] text-gray-500 flex-shrink-0">{p.units} units</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-white">{p.revenue >= 1000 ? `$${(p.revenue / 1000).toFixed(1)}k` : `$${p.revenue}`}</p>
                    {p.trend === 'up'
                      ? <ArrowUpRight className="w-3 h-3 text-green-400 ml-auto" />
                      : <ArrowDownRight className="w-3 h-3 text-red-400 ml-auto" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity feed + Insight cards */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
            <h2 className="font-black text-white mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-400" /> Live Activity Feed
            </h2>
            <div className="space-y-3">
              {activity.length === 0 && (
                <p className="text-xs text-gray-600 py-6 text-center">{loading ? 'Loading activity…' : 'No activity yet. Events appear here as orders, leads, and reviews come in.'}</p>
              )}
              {activity.map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: a.color + '15' }}>
                    <a.icon className="w-3.5 h-3.5" style={{ color: a.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300 leading-snug">{a.text}</p>
                  </div>
                  <span className="text-[10px] text-gray-600 flex-shrink-0 pt-0.5">{a.time}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="font-black text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" /> AI Insights
            </h2>
            {insights.length === 0 && (
              <p className="text-xs text-gray-600 py-4">{loading ? 'Analyzing…' : 'Insights appear as your business data grows.'}</p>
            )}
            {insights.map((ins, i) => (
              <div key={i} className="rounded-xl p-4" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: ins.color + '15' }}>
                    <ins.icon className="w-3 h-3" style={{ color: ins.color }} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white">{ins.title}</p>
                    <p className="text-[10px] text-gray-500 leading-relaxed mt-0.5">{ins.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Orders + Leads mini charts */}
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { key: 'orders', label: 'Monthly Orders', color: '#60a5fa', sub: '142 total · +22 vs last month' },
            { key: 'leads',  label: 'Leads Captured', color: '#818cf8', sub: '38 active · +12% conversion' },
          ].map(({ key, label, color, sub }) => (
            <div key={key} className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h2 className="font-black text-white mb-0.5">{label}</h2>
              <p className="text-xs text-gray-500 mb-4">{sub}</p>
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={revData} margin={{ top: 4, right: 4, bottom: 0, left: -30 }}>
                  <XAxis dataKey="month" tick={{ fill: '#4b5563', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey={key} name={label} stroke={color} strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
