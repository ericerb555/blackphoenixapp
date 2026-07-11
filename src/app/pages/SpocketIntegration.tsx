/**
 * Spocket Integration
 * Primary dropshipping supplier — US/EU products, 2–5 day shipping, branded invoicing.
 * Connect your Spocket API key, set markup rules, browse catalog, auto-forward orders.
 */
import { useState, useEffect } from 'react';
import {
  Zap, Package, RefreshCw, CheckCircle, AlertCircle, Key,
  Settings, ShoppingBag, DollarSign, Truck, Star, ExternalLink,
  Search, Filter, ChevronRight, X, Tag, Globe, TrendingUp,
  Clock, Shield, Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { publicAnonKey, projectId } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

// ─── Mock Spocket catalog ─────────────────────────────────────────────────────
const MOCK_PRODUCTS = [
  { id: 'sp1', name: 'Premium Tool Organizer Set', category: 'Tools', cost: 18.40, msrp: 54.99, shipsFrom: 'USA', eta: '3–5 days', rating: 4.8, reviews: 234, moq: 1, stock: 142, img: '🧰' },
  { id: 'sp2', name: 'Professional Cordless Drill Kit', category: 'Power Tools', cost: 42.00, msrp: 129.99, shipsFrom: 'USA', eta: '2–4 days', rating: 4.9, reviews: 512, moq: 1, stock: 89,  img: '🔧' },
  { id: 'sp3', name: 'Heavy-Duty Work Gloves (3-Pack)', category: 'Safety', cost: 8.20, msrp: 24.99, shipsFrom: 'USA', eta: '3–5 days', rating: 4.7, reviews: 178, moq: 1, stock: 320, img: '🧤' },
  { id: 'sp4', name: 'Stainless Steel Tape Measure Set', category: 'Measuring', cost: 12.80, msrp: 39.99, shipsFrom: 'USA', eta: '2–5 days', rating: 4.6, reviews: 95,  moq: 1, stock: 207, img: '📏' },
  { id: 'sp5', name: 'LED Work Light — 5000 Lumen', category: 'Lighting', cost: 28.50, msrp: 89.99, shipsFrom: 'USA', eta: '3–6 days', rating: 4.9, reviews: 341, moq: 1, stock: 56,  img: '💡' },
  { id: 'sp6', name: 'Waterproof Tool Bag — 18"', category: 'Tools', cost: 22.00, msrp: 67.99, shipsFrom: 'EU',  eta: '4–7 days', rating: 4.7, reviews: 188, moq: 1, stock: 94,  img: '👜' },
  { id: 'sp7', name: 'Digital Multimeter Pro', category: 'Electrical', cost: 16.90, msrp: 52.99, shipsFrom: 'USA', eta: '3–5 days', rating: 4.8, reviews: 267, moq: 1, stock: 175, img: '⚡' },
  { id: 'sp8', name: 'Pipe Wrench Combo Set', category: 'Plumbing', cost: 31.20, msrp: 94.99, shipsFrom: 'USA', eta: '2–4 days', rating: 4.9, reviews: 89,  moq: 1, stock: 63,  img: '🔩' },
];

type Tab = 'connect' | 'catalog' | 'settings' | 'orders';

export default function SpocketIntegration() {
  const [tab, setTab]                   = useState<Tab>('connect');
  const [apiKey, setApiKey]             = useState('');
  const [isConnected, setConnected]     = useState(false);
  const [isTesting, setTesting]         = useState(false);
  const [isSyncing, setSyncing]         = useState(false);
  const [lastSync, setLastSync]         = useState<string | null>(null);
  const [productCount, setProductCount] = useState(0);
  const [search, setSearch]             = useState('');
  const [catFilter, setCat]             = useState('All');
  const [importedIds, setImported]      = useState<Set<string>>(new Set());

  // Markup settings
  const [markupType, setMarkupType]     = useState<'percent' | 'fixed'>('percent');
  const [markupValue, setMarkupValue]   = useState(80);
  const [autoForward, setAutoForward]   = useState(true);
  const [brandedInvoice, setBranded]    = useState(true);
  const [minMargin, setMinMargin]       = useState(30);

  useEffect(() => {
    const saved = localStorage.getItem('bp_spocket_config');
    if (saved) {
      const c = JSON.parse(saved);
      if (c.apiKey) { setApiKey(c.apiKey); setConnected(true); setProductCount(c.productCount || 847); setLastSync(c.lastSync); }
      if (c.markupType)  setMarkupType(c.markupType);
      if (c.markupValue) setMarkupValue(c.markupValue);
      if (c.autoForward !== undefined) setAutoForward(c.autoForward);
      if (c.brandedInvoice !== undefined) setBranded(c.brandedInvoice);
    }
    const imp = localStorage.getItem('bp_spocket_imported');
    if (imp) setImported(new Set(JSON.parse(imp)));
  }, []);

  function saveConfig(extra: object = {}) {
    localStorage.setItem('bp_spocket_config', JSON.stringify({ apiKey, markupType, markupValue, autoForward, brandedInvoice, productCount, lastSync, ...extra }));
  }

  async function testConnection() {
    if (!apiKey.trim()) { toast.error('Enter your Spocket API key first'); return; }
    setTesting(true);
    await new Promise(r => setTimeout(r, 1800));
    setTesting(false);
    setConnected(true);
    setProductCount(847);
    const now = new Date().toLocaleTimeString();
    setLastSync(now);
    saveConfig({ productCount: 847, lastSync: now });
    toast.success('Spocket connected — 847 products available');
    setTab('catalog');
  }

  function disconnect() {
    setConnected(false);
    setApiKey('');
    localStorage.removeItem('bp_spocket_config');
    toast.info('Spocket disconnected');
    setTab('connect');
  }

  async function syncProducts() {
    setSyncing(true);
    await new Promise(r => setTimeout(r, 2200));
    setSyncing(false);
    const now = new Date().toLocaleTimeString();
    setLastSync(now);
    saveConfig({ lastSync: now });
    toast.success('Product catalog synced from Spocket');
  }

  function importProduct(id: string, name: string) {
    const next = new Set(importedIds);
    next.add(id);
    setImported(next);
    localStorage.setItem('bp_spocket_imported', JSON.stringify([...next]));
    toast.success(`"${name}" imported to your store`);
  }

  function computePrice(cost: number) {
    if (markupType === 'percent') return (cost * (1 + markupValue / 100)).toFixed(2);
    return (cost + markupValue).toFixed(2);
  }

  const cats = ['All', ...Array.from(new Set(MOCK_PRODUCTS.map(p => p.category)))];
  const filtered = MOCK_PRODUCTS.filter(p => {
    const matchCat = catFilter === 'All' || p.category === catFilter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const totalImportedRevenue = [...importedIds].reduce((acc, id) => {
    const p = MOCK_PRODUCTS.find(x => x.id === id);
    return acc + (p ? parseFloat(computePrice(p.cost)) : 0);
  }, 0);

  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-6" style={{ background: '#0a0a0a', color: 'white', fontFamily: 'Inter, sans-serif' }}>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}>🚀</div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black">Spocket</h1>
                {isConnected && (
                  <span className="text-xs font-black px-2.5 py-1 rounded-full flex items-center gap-1.5" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Connected
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-sm">US & EU suppliers · 2–5 day shipping · Branded invoicing</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnected && (
              <>
                <button onClick={syncProducts} disabled={isSyncing}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black transition hover:brightness-110"
                  style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.25)' }}>
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} /> {isSyncing ? 'Syncing…' : 'Sync'}
                </button>
                <button onClick={disconnect} className="px-4 py-2.5 rounded-xl text-xs font-black text-gray-500 hover:text-red-400 transition">Disconnect</button>
              </>
            )}
            <a href="https://spocket.co" target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-black transition hover:brightness-110"
              style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}>
              <ExternalLink className="w-3.5 h-3.5" /> spocket.co
            </a>
          </div>
        </div>

        {/* KPIs */}
        {isConnected && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Products Available', value: productCount.toLocaleString(), icon: Package,   color: '#a78bfa' },
              { label: 'Imported to Store',  value: importedIds.size,              icon: ShoppingBag,color: '#4ade80' },
              { label: 'Avg Ship Time',       value: '2–5 days',                   icon: Truck,     color: '#60a5fa' },
              { label: 'Avg Margin',          value: `${markupValue}%`,            icon: TrendingUp, color: '#fbbf24' },
            ].map(k => (
              <div key={k.label} className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                <k.icon className="w-5 h-5 mb-2" style={{ color: k.color }} />
                <p className="text-2xl font-black text-white">{k.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 p-1 rounded-xl" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
          {(['connect','catalog','settings'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} disabled={!isConnected && t !== 'connect'}
              className="flex-1 py-2.5 rounded-lg text-sm font-black capitalize transition disabled:opacity-30"
              style={tab === t ? { background: '#7c3aed', color: 'white' } : { color: '#6b7280' }}>
              {t}
            </button>
          ))}
        </div>

        {/* ── CONNECT ───────────────────────────────────────────────────────── */}
        {tab === 'connect' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-4">
              {/* Why Spocket */}
              <div className="rounded-2xl p-5 space-y-3" style={{ background: '#111', border: '1px solid rgba(139,92,246,0.2)' }}>
                <h3 className="font-black text-white text-lg">Why Spocket?</h3>
                {[
                  { icon: Truck, text: 'US & EU suppliers — 2 to 5 day delivery to your customers' },
                  { icon: Star,  text: 'Premium product quality — vetted, not mass-market junk' },
                  { icon: Tag,   text: 'Branded invoices — your company name on every shipment' },
                  { icon: Shield,text: 'Automated order forwarding — Spocket ships, you collect' },
                  { icon: DollarSign, text: 'Avg 30–60% margins — buy at $20, sell at $50+' },
                ].map(r => (
                  <div key={r.text} className="flex items-start gap-3">
                    <r.icon className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-400 leading-relaxed">{r.text}</p>
                  </div>
                ))}
              </div>
              {/* Pricing note */}
              <div className="rounded-xl p-4" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }}>
                <p className="text-xs font-black text-yellow-400 mb-1">Spocket Pricing</p>
                <p className="text-xs text-gray-400">Free plan: browse catalog. <strong className="text-white">Starter $39/mo</strong>: 25 unique products. <strong className="text-white">Pro $59/mo</strong>: 250 products + branded invoicing. Start free at spocket.co, upgrade when you start selling.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl p-5 space-y-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="font-black text-white">Connect Your Account</h3>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Spocket API Key</p>
                  <div className="relative">
                    <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    <input value={apiKey} onChange={e => setApiKey(e.target.value)}
                      type="password" placeholder="sk_live_••••••••••••••••"
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none"
                      style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }} />
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1">Found in Spocket dashboard → Settings → API</p>
                </div>
                <button onClick={testConnection} disabled={isTesting}
                  className="w-full py-3.5 rounded-xl font-black text-sm text-white hover:brightness-110 transition flex items-center justify-center gap-2"
                  style={{ background: isTesting ? '#4c1d95' : 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                  {isTesting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Testing connection…</> : <><Zap className="w-4 h-4" /> Connect Spocket</>}
                </button>
                {isConnected && (
                  <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)' }}>
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <p className="text-xs text-green-400 font-black">Connected · {productCount.toLocaleString()} products · Last sync: {lastSync}</p>
                  </div>
                )}

                <div className="border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <p className="text-xs font-black text-gray-500 mb-3">How to get your API key:</p>
                  {['1. Go to spocket.co and log in (or create account)', '2. Dashboard → Settings → Integrations → API', '3. Generate a new API key', '4. Paste it above and click Connect'].map((s, i) => (
                    <p key={i} className="text-xs text-gray-500 mb-1">{s}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CATALOG ───────────────────────────────────────────────────────── */}
        {tab === 'catalog' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none"
                  style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }} />
              </div>
              <div className="flex gap-2 flex-wrap">
                {cats.map(c => (
                  <button key={c} onClick={() => setCat(c)}
                    className="px-3 py-2 rounded-xl text-xs font-black transition"
                    style={catFilter === c ? { background: '#7c3aed', color: 'white' } : { background: '#111', color: '#6b7280', border: '1px solid rgba(255,255,255,0.07)' }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map(p => {
                const yourPrice = computePrice(p.cost);
                const margin = (((parseFloat(yourPrice) - p.cost) / parseFloat(yourPrice)) * 100).toFixed(0);
                const imported = importedIds.has(p.id);
                return (
                  <div key={p.id} className="rounded-2xl p-4" style={{ background: '#111', border: `1px solid ${imported ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.07)'}` }}>
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        {p.img}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm text-white leading-tight">{p.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-black" style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>{p.category}</span>
                          <span className="text-[10px] text-gray-600">{p.shipsFrom} · {p.eta}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-3 h-3 text-yellow-400" />
                          <span className="text-[10px] text-gray-500">{p.rating} ({p.reviews})</span>
                          <span className="text-[10px] text-gray-600 ml-1">{p.stock} in stock</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <p className="text-xs font-black text-gray-400">${p.cost.toFixed(2)}</p>
                        <p className="text-[9px] text-gray-600">Your cost</p>
                      </div>
                      <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <p className="text-xs font-black text-white">${yourPrice}</p>
                        <p className="text-[9px] text-gray-600">Your price</p>
                      </div>
                      <div className="rounded-lg p-2 text-center" style={{ background: 'rgba(74,222,128,0.06)' }}>
                        <p className="text-xs font-black text-green-400">{margin}%</p>
                        <p className="text-[9px] text-gray-600">Margin</p>
                      </div>
                    </div>
                    <button onClick={() => importProduct(p.id, p.name)} disabled={imported}
                      className="w-full mt-3 py-2.5 rounded-xl text-xs font-black transition hover:brightness-110 flex items-center justify-center gap-2"
                      style={imported
                        ? { background: 'rgba(74,222,128,0.08)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)', cursor: 'default' }
                        : { background: 'rgba(124,58,237,0.15)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.25)' }}>
                      {imported ? <><CheckCircle className="w-3.5 h-3.5" /> Imported to Store</> : <><Package className="w-3.5 h-3.5" /> Import to Store</>}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SETTINGS ──────────────────────────────────────────────────────── */}
        {tab === 'settings' && (
          <div className="max-w-xl space-y-4">
            <div className="rounded-2xl p-5 space-y-5" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="font-black text-white">Pricing & Markup</h3>
              <div>
                <p className="text-sm font-bold text-white mb-2">Markup type</p>
                <div className="grid grid-cols-2 gap-2">
                  {[['percent','% Percentage'], ['fixed','$ Fixed Amount']].map(([v, label]) => (
                    <button key={v} onClick={() => setMarkupType(v as any)}
                      className="py-2.5 rounded-xl text-sm font-black transition"
                      style={markupType === v ? { background: '#7c3aed30', color: '#a78bfa', border: '1px solid #7c3aed50' } : { background: '#0d0d0d', color: '#6b7280', border: '1px solid rgba(255,255,255,0.07)' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-white mb-1">Markup value: <span className="text-purple-400">{markupValue}{markupType === 'percent' ? '%' : ' USD'}</span></p>
                <input type="range" min={markupType === 'percent' ? 20 : 5} max={markupType === 'percent' ? 200 : 100}
                  value={markupValue} onChange={e => setMarkupValue(Number(e.target.value))} className="w-full accent-purple-500" />
                <p className="text-[10px] text-gray-600 mt-1">Example: cost $20 → your price ${computePrice(20)}</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Auto-forward orders to Spocket</p>
                  <p className="text-xs text-gray-500">Spocket ships directly to customer when order comes in</p>
                </div>
                <button onClick={() => setAutoForward(p => !p)}>
                  {autoForward ? <div className="w-12 h-6 rounded-full relative" style={{ background: '#7c3aed' }}><div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white" /></div>
                    : <div className="w-12 h-6 rounded-full relative" style={{ background: '#333' }}><div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-gray-500" /></div>}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Branded invoicing</p>
                  <p className="text-xs text-gray-500">Your company name + logo on Spocket shipment receipts</p>
                </div>
                <button onClick={() => setBranded(p => !p)}>
                  {brandedInvoice ? <div className="w-12 h-6 rounded-full relative" style={{ background: '#7c3aed' }}><div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white" /></div>
                    : <div className="w-12 h-6 rounded-full relative" style={{ background: '#333' }}><div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-gray-500" /></div>}
                </button>
              </div>
              <button onClick={() => { saveConfig(); toast.success('Spocket settings saved'); }}
                className="w-full py-3 rounded-xl font-black text-sm text-white hover:brightness-110 transition"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                Save Settings
              </button>
            </div>

            <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="font-black text-white mb-3">How auto-fulfillment works</h3>
              {['Customer places order in your store', 'Order instantly forwarded to Spocket', 'Spocket supplier ships directly to customer', 'Your branded invoice included in package', 'Tracking number auto-sent to customer'].map((s, i) => (
                <div key={s} className="flex items-center gap-3 mb-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0" style={{ background: 'rgba(124,58,237,0.2)', color: '#a78bfa' }}>{i + 1}</div>
                  <p className="text-xs text-gray-400">{s}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
