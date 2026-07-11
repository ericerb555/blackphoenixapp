/**
 * Zendrop Integration
 * Secondary dropshipping supplier — US-based, fast fulfillment, auto-fulfillment API.
 * Specializes in home goods, tools, lifestyle products. Strong customer support.
 */
import { useState, useEffect } from 'react';
import {
  Zap, Package, RefreshCw, CheckCircle, AlertCircle, Key,
  Settings, ShoppingBag, DollarSign, Truck, Star, ExternalLink,
  Search, TrendingUp, Globe, Tag, Shield, Clock, Box, Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { publicAnonKey, projectId } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

// ─── Mock Zendrop catalog ─────────────────────────────────────────────────────
const MOCK_PRODUCTS = [
  { id: 'zd1', name: 'Magnetic Tool Holder Strip — 18"', category: 'Organization',  cost: 9.80,  msrp: 29.99, shipsFrom: 'USA', eta: '3–5 days', rating: 4.8, reviews: 412, stock: 580, img: '🧲' },
  { id: 'zd2', name: 'Foldable Work Sawhorse (2-Pack)', category: 'Tools',          cost: 34.50, msrp: 99.99, shipsFrom: 'USA', eta: '4–6 days', rating: 4.7, reviews: 189, stock: 73,  img: '🪚' },
  { id: 'zd3', name: 'Heavy Duty Drop Cloth (9x12 ft)', category: 'Painting',      cost: 7.20,  msrp: 22.99, shipsFrom: 'USA', eta: '3–5 days', rating: 4.6, reviews: 267, stock: 840, img: '🎨' },
  { id: 'zd4', name: 'Adjustable Pipe Clamp Set (6 pc)', category: 'Plumbing',     cost: 14.90, msrp: 44.99, shipsFrom: 'USA', eta: '3–6 days', rating: 4.9, reviews: 94,  stock: 215, img: '🔩' },
  { id: 'zd5', name: 'Pro Caulking Gun — Drip-Free',   category: 'Sealing',        cost: 11.40, msrp: 34.99, shipsFrom: 'USA', eta: '2–4 days', rating: 4.8, reviews: 328, stock: 394, img: '🔫' },
  { id: 'zd6', name: 'Hex Allen Key Set — 30 Piece',   category: 'Hand Tools',     cost: 8.60,  msrp: 26.99, shipsFrom: 'USA', eta: '3–5 days', rating: 4.7, reviews: 512, stock: 677, img: '🔑' },
  { id: 'zd7', name: 'Jobsite Radio — Bluetooth + AM/FM', category: 'Electronics', cost: 38.20, msrp: 114.99,shipsFrom: 'USA', eta: '4–7 days', rating: 4.8, reviews: 143, stock: 58,  img: '📻' },
  { id: 'zd8', name: 'Retractable Extension Cord — 50 ft', category: 'Electrical', cost: 26.80, msrp: 79.99, shipsFrom: 'USA', eta: '3–5 days', rating: 4.9, reviews: 221, stock: 120, img: '🔌' },
];

type Tab = 'connect' | 'catalog' | 'settings';

export default function ZendropIntegration() {
  const [tab, setTab]                   = useState<Tab>('connect');
  const [apiKey, setApiKey]             = useState('');
  const [storeId, setStoreId]           = useState('');
  const [isConnected, setConnected]     = useState(false);
  const [isTesting, setTesting]         = useState(false);
  const [isSyncing, setSyncing]         = useState(false);
  const [lastSync, setLastSync]         = useState<string | null>(null);
  const [productCount, setProductCount] = useState(0);
  const [search, setSearch]             = useState('');
  const [catFilter, setCat]             = useState('All');
  const [importedIds, setImported]      = useState<Set<string>>(new Set());

  // Markup
  const [markupType, setMarkupType]     = useState<'percent' | 'fixed'>('percent');
  const [markupValue, setMarkupValue]   = useState(75);
  const [autoFulfill, setAutoFulfill]   = useState(true);
  const [usWarehouse, setUsWarehouse]   = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('bp_zendrop_config');
    if (saved) {
      const c = JSON.parse(saved);
      if (c.apiKey) { setApiKey(c.apiKey); setConnected(true); setProductCount(c.productCount || 1240); setLastSync(c.lastSync); setStoreId(c.storeId || ''); }
      if (c.markupType)  setMarkupType(c.markupType);
      if (c.markupValue) setMarkupValue(c.markupValue);
      if (c.autoFulfill !== undefined) setAutoFulfill(c.autoFulfill);
    }
    const imp = localStorage.getItem('bp_zendrop_imported');
    if (imp) setImported(new Set(JSON.parse(imp)));
  }, []);

  function saveConfig(extra: object = {}) {
    localStorage.setItem('bp_zendrop_config', JSON.stringify({ apiKey, storeId, markupType, markupValue, autoFulfill, usWarehouse, productCount, lastSync, ...extra }));
  }

  async function testConnection() {
    if (!apiKey.trim()) { toast.error('Enter your Zendrop API key first'); return; }
    setTesting(true);
    await new Promise(r => setTimeout(r, 1600));
    setTesting(false);
    setConnected(true);
    setProductCount(1240);
    const now = new Date().toLocaleTimeString();
    setLastSync(now);
    saveConfig({ productCount: 1240, lastSync: now });
    toast.success('Zendrop connected — 1,240 products available');
    setTab('catalog');
  }

  function disconnect() {
    setConnected(false);
    setApiKey('');
    localStorage.removeItem('bp_zendrop_config');
    toast.info('Zendrop disconnected');
    setTab('connect');
  }

  async function syncProducts() {
    setSyncing(true);
    await new Promise(r => setTimeout(r, 1800));
    setSyncing(false);
    const now = new Date().toLocaleTimeString();
    setLastSync(now);
    saveConfig({ lastSync: now });
    toast.success('Zendrop catalog synced');
  }

  function importProduct(id: string, name: string) {
    const next = new Set(importedIds);
    next.add(id);
    setImported(next);
    localStorage.setItem('bp_zendrop_imported', JSON.stringify([...next]));
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

  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-6" style={{ background: '#0a0a0a', color: 'white', fontFamily: 'Inter, sans-serif' }}>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>⚡</div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black">Zendrop</h1>
                {isConnected && (
                  <span className="text-xs font-black px-2.5 py-1 rounded-full flex items-center gap-1.5" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Connected
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-sm">US-based fulfillment · Fast shipping · Auto-fulfillment API</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnected && (
              <>
                <button onClick={syncProducts} disabled={isSyncing}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black transition hover:brightness-110"
                  style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}>
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} /> {isSyncing ? 'Syncing…' : 'Sync'}
                </button>
                <button onClick={disconnect} className="px-4 py-2.5 rounded-xl text-xs font-black text-gray-500 hover:text-red-400 transition">Disconnect</button>
              </>
            )}
            <a href="https://zendrop.com" target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-black transition hover:brightness-110"
              style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af' }}>
              <ExternalLink className="w-3.5 h-3.5" /> zendrop.com
            </a>
          </div>
        </div>

        {/* KPIs */}
        {isConnected && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Products Available', value: productCount.toLocaleString(), icon: Package,    color: '#34d399' },
              { label: 'Imported to Store',  value: importedIds.size,              icon: ShoppingBag, color: '#4ade80' },
              { label: 'Avg Ship Time',       value: '3–5 days',                   icon: Truck,      color: '#60a5fa' },
              { label: 'Current Markup',      value: `${markupValue}%`,            icon: TrendingUp,  color: '#fbbf24' },
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
              style={tab === t ? { background: '#059669', color: 'white' } : { color: '#6b7280' }}>
              {t}
            </button>
          ))}
        </div>

        {/* ── CONNECT ───────────────────────────────────────────────────────── */}
        {tab === 'connect' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="rounded-2xl p-5 space-y-3" style={{ background: '#111', border: '1px solid rgba(16,185,129,0.2)' }}>
                <h3 className="font-black text-white text-lg">Why Zendrop?</h3>
                {[
                  { icon: Globe,     text: 'US-based fulfillment center — fastest domestic delivery' },
                  { icon: Zap,       text: 'Automated order fulfillment — zero manual work after setup' },
                  { icon: Package,   text: '1M+ products across home, tools, lifestyle categories' },
                  { icon: Shield,    text: 'Reliable tracking — every order has real-time status' },
                  { icon: DollarSign,text: 'Avg 40–70% margins — competitive wholesale pricing' },
                ].map(r => (
                  <div key={r.text} className="flex items-start gap-3">
                    <r.icon className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-400 leading-relaxed">{r.text}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }}>
                <p className="text-xs font-black text-yellow-400">Zendrop Pricing</p>
                <p className="text-xs text-gray-400"><strong className="text-white">Free plan:</strong> 25 products, manual fulfillment. <strong className="text-white">Pro $49/mo:</strong> unlimited products + auto-fulfillment. <strong className="text-white">Plus $79/mo:</strong> custom branding + analytics. Start free at zendrop.com.</p>
              </div>

              {/* vs Spocket comparison */}
              <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-xs font-black text-gray-500 mb-3">Zendrop vs Spocket — Use both</p>
                <div className="space-y-2">
                  {[
                    { label: 'Best for…',      zendrop: 'High volume, tools, home goods', spocket: 'Premium goods, EU products' },
                    { label: 'Ship speed',      zendrop: '3–5 days US',                   spocket: '2–5 days US/EU' },
                    { label: 'Catalog size',    zendrop: '1M+ products',                  spocket: '~500K products' },
                    { label: 'Branding',        zendrop: 'Plus plan only',                spocket: 'Pro plan included' },
                  ].map(r => (
                    <div key={r.label} className="grid grid-cols-3 gap-2 text-[10px] py-1.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                      <p className="text-gray-600 font-black">{r.label}</p>
                      <p className="text-emerald-400">{r.zendrop}</p>
                      <p className="text-purple-400">{r.spocket}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl p-5 space-y-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="font-black text-white">Connect Your Account</h3>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Zendrop API Key</p>
                  <div className="relative">
                    <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                    <input value={apiKey} onChange={e => setApiKey(e.target.value)}
                      type="password" placeholder="zdp_live_••••••••••••••••"
                      className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none"
                      style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }} />
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1">Found in Zendrop dashboard → API Access</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Store ID (optional)</p>
                  <input value={storeId} onChange={e => setStoreId(e.target.value)}
                    placeholder="Your Zendrop Store ID"
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none"
                    style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }} />
                </div>
                <button onClick={testConnection} disabled={isTesting}
                  className="w-full py-3.5 rounded-xl font-black text-sm text-white hover:brightness-110 transition flex items-center justify-center gap-2"
                  style={{ background: isTesting ? '#065f46' : 'linear-gradient(135deg, #059669, #047857)' }}>
                  {isTesting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Testing connection…</> : <><Zap className="w-4 h-4" /> Connect Zendrop</>}
                </button>
                {isConnected && (
                  <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)' }}>
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <p className="text-xs text-green-400 font-black">Connected · {productCount.toLocaleString()} products · Synced: {lastSync}</p>
                  </div>
                )}

                <div className="border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <p className="text-xs font-black text-gray-500 mb-2">How to get your API key:</p>
                  {['1. Go to zendrop.com → Log in', '2. Dashboard → Settings → API Access', '3. Click "Generate API Key"', '4. Paste it above → Connect'].map((s, i) => (
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
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Zendrop products…"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none"
                  style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }} />
              </div>
              <div className="flex gap-2 flex-wrap">
                {cats.map(c => (
                  <button key={c} onClick={() => setCat(c)}
                    className="px-3 py-2 rounded-xl text-xs font-black transition"
                    style={catFilter === c ? { background: '#059669', color: 'white' } : { background: '#111', color: '#6b7280', border: '1px solid rgba(255,255,255,0.07)' }}>
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
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-black" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>{p.category}</span>
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
                        : { background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}>
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
              <div className="grid grid-cols-2 gap-2">
                {[['percent','% Percentage'], ['fixed','$ Fixed Amount']].map(([v, label]) => (
                  <button key={v} onClick={() => setMarkupType(v as any)}
                    className="py-2.5 rounded-xl text-sm font-black transition"
                    style={markupType === v ? { background: '#05966930', color: '#34d399', border: '1px solid #05966950' } : { background: '#0d0d0d', color: '#6b7280', border: '1px solid rgba(255,255,255,0.07)' }}>
                    {label}
                  </button>
                ))}
              </div>
              <div>
                <p className="text-sm font-bold text-white mb-1">Markup: <span className="text-emerald-400">{markupValue}{markupType === 'percent' ? '%' : ' USD'}</span></p>
                <input type="range" min={markupType === 'percent' ? 20 : 5} max={markupType === 'percent' ? 200 : 100}
                  value={markupValue} onChange={e => setMarkupValue(Number(e.target.value))} className="w-full accent-emerald-500" />
                <p className="text-[10px] text-gray-600 mt-1">Example: cost $15 → your price ${computePrice(15)}</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Auto-fulfillment</p>
                  <p className="text-xs text-gray-500">Orders sent to Zendrop automatically for fulfillment</p>
                </div>
                <button onClick={() => setAutoFulfill(p => !p)}>
                  {autoFulfill ? <div className="w-12 h-6 rounded-full relative" style={{ background: '#059669' }}><div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white" /></div>
                    : <div className="w-12 h-6 rounded-full relative" style={{ background: '#333' }}><div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-gray-500" /></div>}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Prioritize US warehouse</p>
                  <p className="text-xs text-gray-500">Always fulfill from US stock first for fastest delivery</p>
                </div>
                <button onClick={() => setUsWarehouse(p => !p)}>
                  {usWarehouse ? <div className="w-12 h-6 rounded-full relative" style={{ background: '#059669' }}><div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white" /></div>
                    : <div className="w-12 h-6 rounded-full relative" style={{ background: '#333' }}><div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-gray-500" /></div>}
                </button>
              </div>
              <button onClick={() => { saveConfig(); toast.success('Zendrop settings saved'); }}
                className="w-full py-3 rounded-xl font-black text-sm text-white hover:brightness-110 transition"
                style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
                Save Settings
              </button>
            </div>

            <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="font-black text-white mb-3">Auto-fulfillment flow</h3>
              {['Customer orders from your store', 'Order forwarded to Zendrop API automatically', 'Zendrop picks, packs, ships from US warehouse', 'Tracking number sent to customer via email', 'You keep the margin — zero touch required'].map((s, i) => (
                <div key={s} className="flex items-center gap-3 mb-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0" style={{ background: 'rgba(5,150,105,0.2)', color: '#34d399' }}>{i + 1}</div>
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
