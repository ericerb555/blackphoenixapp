import { useState, useEffect } from 'react';
import { Tag, Plus, X, Copy, Check, TrendingUp, DollarSign, Zap, Users, Search, ToggleLeft, ToggleRight, Edit3, Trash2, Calendar, Hash, Percent, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { projectId } from '../utils/supabase/info';
import { authedHeaders } from '../utils/authHeaders';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

export interface Coupon {
  id: string;
  code: string;
  description: string;
  type: 'percent' | 'fixed' | 'freeShipping' | 'bogo';
  value: number;
  minOrder: number;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
  categories: string[];
  source: 'manual' | 'flash' | 'cart-recovery' | 'affiliate' | 'loyalty';
  redemptions: { date: string; order: number; email: string }[];
}

function randomCode(prefix = '') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const slug = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return prefix ? `${prefix}-${slug}` : slug;
}

function seed(): Coupon[] {
  const now = new Date();
  const future = new Date(now.getTime() + 30 * 86400000).toISOString();
  const past = new Date(now.getTime() - 5 * 86400000).toISOString();
  return [
    {
      id: 'c1', code: 'WELCOME10', description: 'New customer 10% off', type: 'percent', value: 10,
      minOrder: 0, maxUses: null, usedCount: 47, active: true, expiresAt: future,
      createdAt: new Date(now.getTime() - 90 * 86400000).toISOString(), categories: [], source: 'manual',
      redemptions: [
        { date: 'Jul 9, 2026', order: 89.99, email: 'jess@gmail.com' },
        { date: 'Jul 8, 2026', order: 134.50, email: 'derek@yahoo.com' },
        { date: 'Jul 7, 2026', order: 54.99, email: 'mia@hotmail.com' },
      ],
    },
    {
      id: 'c2', code: 'COMEBACK10', description: 'Abandoned cart recovery — 10% off', type: 'percent', value: 10,
      minOrder: 25, maxUses: 500, usedCount: 18, active: true, expiresAt: future,
      createdAt: new Date(now.getTime() - 14 * 86400000).toISOString(), categories: [], source: 'cart-recovery',
      redemptions: [{ date: 'Jul 8, 2026', order: 119.97, email: 'samantha@hotmail.com' }],
    },
    {
      id: 'c3', code: 'LASTCHANCE15', description: 'Abandoned cart final chance — 15% off', type: 'percent', value: 15,
      minOrder: 25, maxUses: 500, usedCount: 7, active: true, expiresAt: future,
      createdAt: new Date(now.getTime() - 14 * 86400000).toISOString(), categories: [], source: 'cart-recovery',
      redemptions: [],
    },
    {
      id: 'c4', code: 'SUMMER25', description: 'Summer flash sale — $25 off $100+', type: 'fixed', value: 25,
      minOrder: 100, maxUses: 200, usedCount: 89, active: false, expiresAt: past,
      createdAt: new Date(now.getTime() - 30 * 86400000).toISOString(), categories: [], source: 'flash',
      redemptions: [
        { date: 'Jul 4, 2026', order: 149.99, email: 'troy@gmail.com' },
        { date: 'Jul 3, 2026', order: 189.50, email: 'brianna@gmail.com' },
      ],
    },
    {
      id: 'c5', code: 'FREESHIP', description: 'Free shipping on any order', type: 'freeShipping', value: 0,
      minOrder: 50, maxUses: null, usedCount: 113, active: true, expiresAt: null,
      createdAt: new Date(now.getTime() - 60 * 86400000).toISOString(), categories: [], source: 'manual',
      redemptions: [],
    },
    {
      id: 'c6', code: 'VIP20', description: 'VIP loyalty member exclusive', type: 'percent', value: 20,
      minOrder: 0, maxUses: 100, usedCount: 22, active: true, expiresAt: future,
      createdAt: new Date(now.getTime() - 7 * 86400000).toISOString(), categories: [], source: 'loyalty',
      redemptions: [],
    },
  ];
}

const TYPE_CONFIG = {
  percent:     { label: '% Off',         icon: Percent,    color: '#818cf8' },
  fixed:       { label: '$ Off',         icon: DollarSign, color: '#4ade80' },
  freeShipping:{ label: 'Free Shipping', icon: Zap,        color: '#60a5fa' },
  bogo:        { label: 'BOGO',          icon: Tag,        color: '#f472b6' },
};

const SOURCE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  manual:        { label: 'Manual',        color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
  flash:         { label: 'Flash Sale',    color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
  'cart-recovery':{ label: 'Cart Recovery', color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
  affiliate:     { label: 'Affiliate',     color: '#fb923c', bg: 'rgba(249,115,22,0.1)' },
  loyalty:       { label: 'Loyalty',       color: '#c084fc', bg: 'rgba(192,132,252,0.1)' },
};

const EMPTY_FORM = {
  code: '', description: '', type: 'percent' as Coupon['type'],
  value: 10, minOrder: 0, maxUses: '', expiresAt: '', source: 'manual' as Coupon['source'],
};

function isExpired(c: Coupon) { return !!c.expiresAt && new Date(c.expiresAt) < new Date(); }
function daysLeft(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  const d = Math.ceil(diff / 86400000);
  return d <= 0 ? 'Expired' : d === 1 ? '1 day left' : `${d} days left`;
}

type Tab = 'codes' | 'analytics';
type FilterType = 'all' | 'active' | 'inactive' | 'expired';

export default function CouponManager() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [tab, setTab] = useState<Tab>('codes');
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function loadCoupons() {
    try {
      const res = await fetch(`${SERVER}/coupons`, { headers: await authedHeaders() });
      const json = await res.json();
      if (json.success) {
        if (json.coupons.length === 0) {
          // First run: seed default coupons then reload.
          await Promise.all(seed().map(async c => fetch(`${SERVER}/coupons`, { method: 'POST', headers: await authedHeaders(), body: JSON.stringify(c) })));
          const rr = await fetch(`${SERVER}/coupons`, { headers: await authedHeaders() });
          const rj = await rr.json();
          if (rj.success) setCoupons(rj.coupons);
        } else {
          setCoupons(json.coupons);
        }
      } else console.error('Failed to load coupons:', json.error);
    } catch (err) { console.error('Network error loading coupons:', err); toast.error('Could not load coupons'); }
  }

  useEffect(() => { loadCoupons(); }, []);

  function copyCode(code: string, id: string) {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedId(id);
    toast.success(`Copied ${code}`);
    setTimeout(() => setCopiedId(null), 1800);
  }

  async function toggleActive(id: string) {
    const target = coupons.find(c => c.id === id);
    if (!target) return;
    const next = !target.active;
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, active: next } : c));
    try {
      await fetch(`${SERVER}/coupons/${id}`, { method: 'PUT', headers: await authedHeaders(), body: JSON.stringify({ active: next }) });
    } catch (err) { console.error('Failed to toggle coupon:', err); }
  }

  async function deleteCoupon(id: string) {
    setCoupons(prev => prev.filter(c => c.id !== id));
    toast('Coupon deleted');
    try {
      await fetch(`${SERVER}/coupons/${id}`, { method: 'DELETE', headers: await authedHeaders() });
    } catch (err) { console.error('Failed to delete coupon:', err); }
  }

  function openCreate() {
    setForm({ ...EMPTY_FORM, code: randomCode() });
    setEditingId(null);
    setShowCreate(true);
  }

  function openEdit(c: Coupon) {
    setForm({
      code: c.code, description: c.description, type: c.type, value: c.value,
      minOrder: c.minOrder, maxUses: c.maxUses?.toString() ?? '', expiresAt: c.expiresAt?.slice(0, 10) ?? '',
      source: c.source,
    });
    setEditingId(c.id);
    setShowCreate(true);
  }

  async function submitForm() {
    if (!form.code.trim()) { toast.error('Code is required'); return; }
    if (form.type !== 'freeShipping' && form.type !== 'bogo' && !form.value) { toast.error('Enter a discount value'); return; }
    const payload = {
      code: form.code.trim().toUpperCase(), description: form.description,
      type: form.type, value: Number(form.value), minOrder: Number(form.minOrder),
      maxUses: form.maxUses ? Number(form.maxUses) : null,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      source: form.source,
    };
    try {
      if (editingId) {
        const res = await fetch(`${SERVER}/coupons/${editingId}`, { method: 'PUT', headers: await authedHeaders(), body: JSON.stringify(payload) });
        const json = await res.json();
        if (json.success) { setCoupons(prev => prev.map(c => c.id === editingId ? json.coupon : c)); toast.success('Coupon updated'); }
        else { toast.error(json.error || 'Update failed'); return; }
      } else {
        const res = await fetch(`${SERVER}/coupons`, { method: 'POST', headers: await authedHeaders(), body: JSON.stringify(payload) });
        const json = await res.json();
        if (json.success) { setCoupons(prev => [json.coupon, ...prev]); toast.success('Coupon created!'); }
        else { toast.error(json.error || 'Create failed'); return; }
      }
      setShowCreate(false);
    } catch (err) { console.error('Failed to save coupon:', err); toast.error('Network error saving coupon'); }
  }

  const visible = coupons.filter(c => {
    if (filter === 'active' && (!c.active || isExpired(c))) return false;
    if (filter === 'inactive' && c.active) return false;
    if (filter === 'expired' && !isExpired(c)) return false;
    if (search && !c.code.toLowerCase().includes(search.toLowerCase()) && !c.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalRedemptions = coupons.reduce((s, c) => s + c.usedCount, 0);
  const totalSaved = coupons.reduce((s, c) => {
    if (c.type === 'percent') return s + c.redemptions.reduce((r, red) => r + red.order * (c.value / 100), 0);
    if (c.type === 'fixed') return s + c.usedCount * c.value;
    return s;
  }, 0);
  const activeCodes = coupons.filter(c => c.active && !isExpired(c)).length;
  const topCoupon = [...coupons].sort((a, b) => b.usedCount - a.usedCount)[0];

  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-6" style={{ background: '#0a0a0a', color: 'white', fontFamily: 'Inter, sans-serif' }}>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black">Coupon Manager</h1>
            <p className="text-gray-500 text-sm mt-1">Create and track promo codes across all your campaigns</p>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-sm text-white hover:brightness-110 transition"
            style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>
            <Plus className="w-4 h-4" /> New Code
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Active Codes', value: activeCodes, icon: Tag, color: '#4ade80' },
            { label: 'Total Redemptions', value: totalRedemptions, icon: Users, color: '#60a5fa' },
            { label: 'Discount Given', value: `$${totalSaved.toFixed(0)}`, icon: DollarSign, color: '#f87171' },
            { label: 'Top Code', value: topCoupon?.code ?? '—', icon: TrendingUp, color: '#fbbf24' },
          ].map(k => (
            <div key={k.label} className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <k.icon className="w-5 h-5 mb-2" style={{ color: k.color }} />
              <p className="text-xl font-black text-white truncate">{k.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 rounded-xl" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
          {([['codes','Promo Codes'], ['analytics','Analytics']] as [Tab,string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2.5 rounded-lg text-sm font-black transition"
              style={tab === t ? { background: '#ea580c', color: 'white' } : { color: '#6b7280' }}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'analytics' && (
          <div className="space-y-4">
            <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="font-black text-white mb-4">Redemptions by Code</h3>
              <div className="space-y-3">
                {[...coupons].sort((a,b) => b.usedCount - a.usedCount).map(c => {
                  const max = Math.max(...coupons.map(x => x.usedCount), 1);
                  const tc = TYPE_CONFIG[c.type];
                  return (
                    <div key={c.id} className="flex items-center gap-3">
                      <span className="text-xs font-black text-white w-28 truncate">{c.code}</span>
                      <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ background: '#1a1a1a' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${(c.usedCount/max)*100}%`, background: tc.color }} />
                      </div>
                      <span className="text-xs font-black text-gray-400 w-6 text-right">{c.usedCount}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="font-black text-white mb-4">By Source</h3>
              <div className="space-y-2">
                {Object.entries(SOURCE_BADGE).map(([src, cfg]) => {
                  const count = coupons.filter(c => c.source === src).length;
                  const uses = coupons.filter(c => c.source === src).reduce((s,c) => s+c.usedCount, 0);
                  if (!count) return null;
                  return (
                    <div key={src} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                      <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-500">{count} code{count > 1 ? 's' : ''}</span>
                        <span className="text-sm font-black text-white">{uses} uses</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab === 'codes' && (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)' }}>
                <Search className="w-4 h-4 text-gray-600" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search codes…"
                  className="bg-transparent flex-1 text-sm text-white placeholder-gray-600 focus:outline-none" />
              </div>
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                {(['all','active','inactive','expired'] as FilterType[]).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className="px-3 py-1.5 rounded-lg text-xs font-black capitalize transition"
                    style={filter === f ? { background: '#ea580c', color: 'white' } : { color: '#6b7280' }}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {visible.length === 0 && (
              <div className="text-center py-12 rounded-2xl" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                <Tag className="w-10 h-10 text-gray-700 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No codes match this filter</p>
              </div>
            )}

            <div className="space-y-3">
              {visible.map(c => {
                const tc = TYPE_CONFIG[c.type];
                const src = SOURCE_BADGE[c.source];
                const exp = isExpired(c);
                const usagePct = c.maxUses ? Math.min((c.usedCount / c.maxUses) * 100, 100) : null;
                const isExpanded = expandedId === c.id;
                return (
                  <div key={c.id} className="rounded-2xl overflow-hidden" style={{ background: '#111', border: `1px solid ${exp ? 'rgba(107,114,128,0.2)' : c.active ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)'}` }}>
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Code block */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)' }}>
                              <span className="font-black text-white tracking-widest text-sm">{c.code}</span>
                              <button onClick={() => copyCode(c.code, c.id)} className="text-gray-600 hover:text-orange-400 transition">
                                {copiedId === c.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: src.bg, color: src.color }}>{src.label}</span>
                            {exp && <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(107,114,128,0.12)', color: '#9ca3af' }}>Expired</span>}
                          </div>
                          <p className="text-xs text-gray-500 mb-2">{c.description || '—'}</p>
                          <div className="flex flex-wrap gap-3 text-[10px] text-gray-600">
                            <span className="flex items-center gap-1" style={{ color: tc.color }}>
                              <tc.icon className="w-3 h-3" />
                              {c.type === 'percent' ? `${c.value}% off` : c.type === 'fixed' ? `$${c.value} off` : c.type === 'freeShipping' ? 'Free shipping' : 'Buy 1 Get 1'}
                            </span>
                            {c.minOrder > 0 && <span>Min ${c.minOrder}</span>}
                            {c.expiresAt && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{daysLeft(c.expiresAt)}</span>}
                            <span className="flex items-center gap-1"><Hash className="w-3 h-3" />{c.usedCount}{c.maxUses ? `/${c.maxUses}` : ''} uses</span>
                          </div>
                          {usagePct !== null && (
                            <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: '#1a1a1a' }}>
                              <div className="h-full rounded-full transition-all" style={{ width: `${usagePct}%`, background: usagePct >= 90 ? '#f87171' : '#4ade80' }} />
                            </div>
                          )}
                        </div>
                        {/* Controls */}
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <button onClick={() => toggleActive(c.id)} className="transition">
                            {c.active && !exp
                              ? <ToggleRight className="w-8 h-8 text-green-400" />
                              : <ToggleLeft className="w-8 h-8 text-gray-700" />}
                          </button>
                          <div className="flex gap-1">
                            <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-gray-600 hover:text-white transition" style={{ background: 'rgba(255,255,255,0.05)' }}>
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteCoupon(c.id)} className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 transition" style={{ background: 'rgba(255,255,255,0.05)' }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {c.redemptions.length > 0 && (
                            <button onClick={() => setExpandedId(isExpanded ? null : c.id)}
                              className="text-[10px] font-black text-orange-400 hover:text-orange-300 transition">
                              {isExpanded ? 'Hide' : `${c.redemptions.length} uses ↓`}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <AnimatePresence>
                      {isExpanded && c.redemptions.length > 0 && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          style={{ overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <div className="px-4 py-3 space-y-2">
                            <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Recent Redemptions</p>
                            {c.redemptions.map((r, i) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">{r.email}</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-gray-600">{r.date}</span>
                                  <span className="font-black text-white">${r.order.toFixed(2)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)' }}>
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-md rounded-3xl overflow-hidden"
              style={{ background: '#111', border: '1px solid rgba(234,88,12,0.2)' }}>
              <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                <h3 className="font-black text-white">{editingId ? 'Edit Coupon' : 'New Promo Code'}</h3>
                <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
                {/* Code field */}
                <div>
                  <label className="text-xs font-black text-gray-500 block mb-1.5">Promo Code *</label>
                  <div className="flex gap-2">
                    <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                      placeholder="e.g. SUMMER20"
                      className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white font-black tracking-widest placeholder-gray-700 focus:outline-none focus:border-orange-500/50" />
                    <button onClick={() => setForm(p => ({ ...p, code: randomCode() }))}
                      className="px-3 py-2.5 rounded-xl text-xs font-black text-gray-400 hover:text-white transition"
                      style={{ background: '#0a0a0a', border: '1px solid #2a2a2a' }}>Random</button>
                  </div>
                </div>
                {/* Description */}
                <div>
                  <label className="text-xs font-black text-gray-500 block mb-1.5">Description</label>
                  <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="e.g. New customer welcome discount"
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-orange-500/50" />
                </div>
                {/* Discount type */}
                <div>
                  <label className="text-xs font-black text-gray-500 block mb-1.5">Discount Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(TYPE_CONFIG) as [Coupon['type'], typeof TYPE_CONFIG[keyof typeof TYPE_CONFIG]][]).map(([t, cfg]) => (
                      <button key={t} onClick={() => setForm(p => ({ ...p, type: t }))}
                        className="flex items-center gap-2 p-3 rounded-xl text-sm font-black transition"
                        style={{ background: form.type === t ? 'rgba(234,88,12,0.15)' : '#0d0d0d', border: `1px solid ${form.type === t ? 'rgba(234,88,12,0.4)' : 'rgba(255,255,255,0.07)'}`, color: form.type === t ? cfg.color : '#6b7280' }}>
                        <cfg.icon className="w-4 h-4" /> {cfg.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Value */}
                {form.type !== 'freeShipping' && form.type !== 'bogo' && (
                  <div>
                    <label className="text-xs font-black text-gray-500 block mb-1.5">{form.type === 'percent' ? 'Percent Off' : 'Amount Off ($)'}</label>
                    <input type="number" min="1" max={form.type === 'percent' ? 100 : 9999}
                      value={form.value} onChange={e => setForm(p => ({ ...p, value: Number(e.target.value) }))}
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50" />
                  </div>
                )}
                {/* Min order / max uses */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black text-gray-500 block mb-1.5">Min Order ($)</label>
                    <input type="number" min="0" value={form.minOrder} onChange={e => setForm(p => ({ ...p, minOrder: Number(e.target.value) }))}
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50" />
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-500 block mb-1.5">Max Uses</label>
                    <input type="number" min="0" value={form.maxUses} placeholder="Unlimited"
                      onChange={e => setForm(p => ({ ...p, maxUses: e.target.value }))}
                      className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-orange-500/50" />
                  </div>
                </div>
                {/* Expiry */}
                <div>
                  <label className="text-xs font-black text-gray-500 block mb-1.5">Expiry Date (optional)</label>
                  <input type="date" value={form.expiresAt} onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50"
                    style={{ colorScheme: 'dark' }} />
                </div>
                {/* Source */}
                <div>
                  <label className="text-xs font-black text-gray-500 block mb-1.5">Campaign Source</label>
                  <select value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value as Coupon['source'] }))}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-orange-500/50">
                    {Object.entries(SOURCE_BADGE).map(([src, cfg]) => <option key={src} value={src}>{cfg.label}</option>)}
                  </select>
                </div>
                <button onClick={submitForm}
                  className="w-full py-3 rounded-xl font-black text-sm text-white hover:brightness-110 transition"
                  style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>
                  {editingId ? 'Save Changes' : 'Create Coupon'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
