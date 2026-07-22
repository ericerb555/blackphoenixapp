/**
 * Zendrop Integration
 * US-based dropshipper — real API connection, catalog import, auto-fulfillment.
 * API docs: https://developers.zendrop.com
 */
import { useState, useEffect, useMemo } from 'react';
import {
  Zap, Package, RefreshCw, CheckCircle, AlertCircle, Key,
  Settings, ShoppingBag, DollarSign, Truck, Star, ExternalLink,
  Search, TrendingUp, Globe, Tag, Shield, Clock, Box, Info,
  Copy, Eye, EyeOff, ArrowRight, BarChart2, Boxes,
} from 'lucide-react';
import { toast } from 'sonner';
import { publicAnonKey, projectId } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ZendropProduct {
  id: string;
  name: string;
  category: string;
  cost: number;
  msrp: number;
  shipsFrom: string;
  eta: string;
  rating: number;
  reviews: number;
  stock: number;
  img: string;
  sku: string;
  description: string;
}

type Tab = 'connect' | 'catalog' | 'orders' | 'settings';

// ─── Mock catalog (used until real API is connected) ──────────────────────────

const MOCK_PRODUCTS: ZendropProduct[] = [
  { id: 'zd1',  name: 'Magnetic Tool Holder Strip — 18"',     category: 'Organization', cost: 9.80,  msrp: 29.99, shipsFrom: 'USA', eta: '3–5 days', rating: 4.8, reviews: 412, stock: 580, img: '🧲', sku: 'ZD-ORG-001', description: 'Heavy-duty magnetic strip for garage and workshop tool organization.' },
  { id: 'zd2',  name: 'Foldable Work Sawhorse (2-Pack)',       category: 'Tools',        cost: 34.50, msrp: 99.99, shipsFrom: 'USA', eta: '4–6 days', rating: 4.7, reviews: 189, stock: 73,  img: '🪚', sku: 'ZD-TLS-002', description: 'Adjustable steel folding sawhorses, 1,000 lb capacity each.' },
  { id: 'zd3',  name: 'Heavy Duty Drop Cloth (9×12 ft)',       category: 'Painting',     cost: 7.20,  msrp: 22.99, shipsFrom: 'USA', eta: '3–5 days', rating: 4.6, reviews: 267, stock: 840, img: '🎨', sku: 'ZD-PNT-003', description: 'Canvas drop cloth, ideal for home painting and renovation projects.' },
  { id: 'zd4',  name: 'Adjustable Pipe Clamp Set (6 pc)',      category: 'Plumbing',     cost: 14.90, msrp: 44.99, shipsFrom: 'USA', eta: '3–6 days', rating: 4.9, reviews: 94,  stock: 215, img: '🔩', sku: 'ZD-PLM-004', description: 'Stainless adjustable clamps for pipes 1/2" to 2".' },
  { id: 'zd5',  name: 'Pro Caulking Gun — Drip-Free',          category: 'Sealing',      cost: 11.40, msrp: 34.99, shipsFrom: 'USA', eta: '2–4 days', rating: 4.8, reviews: 328, stock: 394, img: '🔫', sku: 'ZD-SLG-005', description: 'Smooth-rod professional caulking gun with built-in cutter and nozzle piercer.' },
  { id: 'zd6',  name: 'Hex Allen Key Set — 30 Piece',          category: 'Hand Tools',   cost: 8.60,  msrp: 26.99, shipsFrom: 'USA', eta: '3–5 days', rating: 4.7, reviews: 512, stock: 677, img: '🔑', sku: 'ZD-HND-006', description: 'SAE and metric hex keys in chrome vanadium steel with organizer case.' },
  { id: 'zd7',  name: 'Jobsite Radio — Bluetooth + AM/FM',     category: 'Electronics',  cost: 38.20, msrp: 114.99, shipsFrom: 'USA', eta: '4–7 days', rating: 4.8, reviews: 143, stock: 58,  img: '📻', sku: 'ZD-ELT-007', description: 'Weatherproof job site radio with Bluetooth 5.0, USB charging, and 10hr battery.' },
  { id: 'zd8',  name: 'Retractable Extension Cord — 50 ft',    category: 'Electrical',   cost: 26.80, msrp: 79.99, shipsFrom: 'USA', eta: '3–5 days', rating: 4.9, reviews: 221, stock: 120, img: '🔌', sku: 'ZD-ELC-008', description: '14AWG retractable cord reel with 3-outlet head, auto-rewind.' },
  { id: 'zd9',  name: 'Laser Level — Self-Leveling 360°',      category: 'Measuring',    cost: 42.00, msrp: 124.99, shipsFrom: 'USA', eta: '3–5 days', rating: 4.9, reviews: 304, stock: 88,  img: '📏', sku: 'ZD-MSR-009', description: 'Cross-line laser level, ±4° self-leveling range, 50-ft range with tripod.' },
  { id: 'zd10', name: 'Work Light LED — 5000 Lumen Tripod',    category: 'Lighting',     cost: 31.50, msrp: 94.99, shipsFrom: 'USA', eta: '4–6 days', rating: 4.8, reviews: 167, stock: 143, img: '💡', sku: 'ZD-LGT-010', description: '5000-lumen LED work light on adjustable tripod stand, IP44 weather resistant.' },
  { id: 'zd11', name: 'Knee Pads — Construction Grade (Pair)', category: 'Safety',       cost: 13.20, msrp: 39.99, shipsFrom: 'USA', eta: '2–4 days', rating: 4.7, reviews: 289, stock: 530, img: '🦺', sku: 'ZD-SFT-011', description: 'Heavy-duty gel knee pads with hard shell cap and adjustable straps.' },
  { id: 'zd12', name: 'Paint Sprayer — HVLP 700W',             category: 'Painting',     cost: 48.90, msrp: 149.99, shipsFrom: 'USA', eta: '4–7 days', rating: 4.6, reviews: 211, stock: 62,  img: '🖌️', sku: 'ZD-PNT-012', description: '700W HVLP sprayer with 3 spray patterns, 500ml/min flow, includes cleaning kit.' },
];

const MOCK_ORDERS = [
  { id: 'ZO-001', customer: 'Sarah Mitchell', product: 'Magnetic Tool Holder Strip — 18"', status: 'shipped', orderDate: '2026-07-08', tracking: 'USPS9261290100830090', total: 29.99 },
  { id: 'ZO-002', customer: 'Tom Harrington', product: 'Retractable Extension Cord — 50 ft', status: 'delivered', orderDate: '2026-07-05', tracking: 'UPS1Z999AA10123456784', total: 79.99 },
  { id: 'ZO-003', customer: 'Linda Beaumont', product: 'Pro Caulking Gun — Drip-Free', status: 'processing', orderDate: '2026-07-11', tracking: '', total: 34.99 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadConfig() {
  try {
    const config = JSON.parse(localStorage.getItem('bp_zendrop_config') || 'null') || {};
    // Do not retain supplier credentials in browser storage. A legacy saved key
    // is removed; future syncs use the server-side ZENDROP_API_KEY secret.
    if (config.apiKey) {
      const { apiKey: _removed, ...safeConfig } = config;
      localStorage.setItem('bp_zendrop_config', JSON.stringify(safeConfig));
      return safeConfig;
    }
    return config;
  } catch { return {}; }
}

function loadImported(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem('bp_zendrop_imported') || '[]')); } catch { return new Set(); }
}

const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  processing: { label: 'Processing', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  shipped:    { label: 'Shipped',    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  delivered:  { label: 'Delivered',  color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  failed:     { label: 'Failed',     color: 'text-red-400 bg-red-500/10 border-red-500/20' },
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ZendropIntegration() {
  const cfg = loadConfig();

  const [tab, setTab]             = useState<Tab>('connect');
  const [apiKey, setApiKey]       = useState(cfg.apiKey || '');
  const [storeId, setStoreId]     = useState(cfg.storeId || '');
  const [showKey, setShowKey]     = useState(false);
  const [isConnected, setConnected] = useState(false);
  const [isTesting, setTesting]   = useState(false);
  const [isSyncing, setSyncing]   = useState(false);
  const [lastSync, setLastSync]   = useState<string | null>(cfg.lastSync || null);
  const [productCount, setProductCount] = useState(cfg.productCount || 0);
  const [search, setSearch]       = useState('');
  const [catFilter, setCat]       = useState('All');
  const [importedIds, setImported] = useState<Set<string>>(loadImported);
  const [apiError, setApiError]   = useState('');

  // Real products pulled from store inventory (what actually went live)
  const [liveProducts, setLiveProducts] = useState<ZendropProduct[]>([]);
  const [loadingLive, setLoadingLive]   = useState(false);

  // Settings
  const [markupType, setMarkupType]   = useState<'percent' | 'fixed'>(cfg.markupType || 'percent');
  const [markupValue, setMarkupValue] = useState<number>(cfg.markupValue || 75);
  const [autoFulfill, setAutoFulfill] = useState<boolean>(cfg.autoFulfill !== false);
  const [usWarehouse, setUsWarehouse] = useState<boolean>(cfg.usWarehouse !== false);

  function saveConfig(extra: object = {}) {
    const data = { storeId, markupType, markupValue, autoFulfill, usWarehouse, productCount, lastSync, ...extra };
    localStorage.setItem('bp_zendrop_config', JSON.stringify(data));
  }

  async function adminHeaders(contentType = false): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Sign in as the platform owner or an administrator to manage Zendrop.');
    return {
      Authorization: `Bearer ${session.access_token}`,
      ...(contentType ? { 'Content-Type': 'application/json' } : {}),
    };
  }

  async function testConnection(opts: { silent?: boolean } = {}) {
    // No manual key needed — the server falls back to the ZENDROP_API_KEY
    // secret. Only pass a UI key if the user actually typed one.
    const { silent = false } = opts;
    setTesting(true);
    setApiError('');

    try {
      // Verify + auto-import top products server-side (Zendrop blocks browser CORS,
      // so all Zendrop API calls run on our Supabase Edge Function).
      const res = await fetch(`${SERVER}/zendrop/verify`, {
        method: 'POST',
        headers: await adminHeaders(true),
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          storeId: storeId.trim(),
          markupType,
          markupValue,
          autoImport: true,
          limit: 25,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        const msg = data.error || `Connection failed (HTTP ${res.status}). Check your API key.`;
        console.error('[Zendrop] Verify failed:', msg, data);
        setApiError(msg);
        if (!silent) toast.error('Could not connect to Zendrop.');
        return;
      }

      const count = data.productCount || data.imported || 0;
      const now = new Date().toLocaleString();
      setConnected(true);
      setProductCount(count);
      setLastSync(now);
      saveConfig({ productCount: count, lastSync: now });

      if (data.imported > 0) {
        toast.success(`Zendrop connected & live — ${data.imported} top products imported to your store.`);
      } else if (!silent) {
        toast.success(`Zendrop connected — ${count.toLocaleString()} products available. Use "Sync Catalog" to import.`);
      }
      loadLiveProducts();
      if (!silent) setTab('catalog');
    } catch (e: any) {
      const msg = `Could not reach the server to connect Zendrop: ${e?.message || e}`;
      console.error('[Zendrop] Verify request error:', e);
      setApiError(msg);
      if (!silent) toast.error('Could not connect to Zendrop. Please try again.');
    } finally {
      setTesting(false);
    }
  }

  async function loadLiveProducts() {
    setLoadingLive(true);
    try {
      // Published products are served from the same canonical catalog used by
      // the public storefront. Supplier inventory stays admin-only.
      const res = await fetch(`${SERVER}/products?isActive=true&limit=100`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const data = await res.json().catch(() => ({}));
      const items = (data.products || []) as any[];
      const mapped: ZendropProduct[] = items
        .filter(p => String(p.providerId || p.source || p._dropshipper?.providerId || '').toLowerCase() === 'zendrop')
        .map(p => ({
          id: String(p.id || p.providerProductId || p.sku),
          name: p.name || 'Untitled Product',
          category: p.category || 'General',
          cost: Number(p.costPrice ?? p.cost ?? 0),
          msrp: Number(p.price ?? p.costPrice ?? p.cost ?? 0),
          shipsFrom: 'USA',
          eta: '3–5 days',
          rating: Number(p.rating ?? 0),
          reviews: 0,
          stock: Number(p.inventoryQuantity ?? p.stock ?? 0),
          img: p.primaryImage || (p.images && p.images[0]) || '📦',
          sku: p.sku || '',
          description: p.description || '',
        }));
      setLiveProducts(mapped);
      // Mark all live products as "in store" so cards show the imported state
      if (mapped.length > 0) {
        setImported(new Set(mapped.map(m => m.id)));
      }
    } catch (e) {
      console.error('[Zendrop] Failed to load live inventory:', e);
    } finally {
      setLoadingLive(false);
    }
  }

  // Load real imported products whenever connected / viewing the catalog
  useEffect(() => {
    if (isConnected) loadLiveProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  // Auto-connect on load using the server-side ZENDROP_API_KEY secret. This is
  // what makes the store "go live automatically" — if Zendrop isn't connected
  // yet, we verify + auto-import silently. Checks server status first so we
  // don't re-import on every visit.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${SERVER}/zendrop/status`, {
          headers: await adminHeaders(),
        });
        const status = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (status.connected && (status.productsInStore || 0) > 0) {
          // Already live — just reflect state and show the imported products.
          setConnected(true);
          setProductCount(status.productCount || status.productsInStore || 0);
          loadLiveProducts();
          return;
        }
        // Not live yet — try to connect + import using the server secret.
        await testConnection({ silent: true });
      } catch (e) {
        console.log('[Zendrop] Auto-connect check skipped:', e);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function disconnect() {
    setConnected(false);
    setApiKey('');
    setApiError('');
    localStorage.removeItem('bp_zendrop_config');
    toast.info('Zendrop disconnected.');
    setTab('connect');
  }

  async function syncProducts() {
    setSyncing(true);
    try {
      const res = await fetch(`${SERVER}/zendrop/sync`, {
        method: 'POST',
        headers: await adminHeaders(true),
        body: JSON.stringify({ apiKey, limit: 25 }),
      });
      const data = await res.json().catch(() => ({}));
      const now = new Date().toLocaleString();
      setLastSync(now);
      saveConfig({ lastSync: now });
      if (res.ok && data.success) {
        toast.success(`Synced — ${data.imported} top products refreshed in your store.`);
        loadLiveProducts();
      } else {
        console.error('[Zendrop] Sync failed:', data);
        toast.error(data.error || 'Zendrop sync failed. Check your API key.');
      }
    } catch (e: any) {
      console.error('[Zendrop] Sync request error:', e);
      toast.error(`Could not reach the server to sync: ${e?.message || e}`);
    } finally {
      setSyncing(false);
    }
  }

  function importProduct(p: ZendropProduct) {
    // Zendrop sync already publishes every imported item to the canonical store
    // catalog. This control only records the merchant's acknowledgement in the UI.
    setImported(previous => new Set(previous).add(p.id));
    localStorage.setItem('bp_zendrop_imported', JSON.stringify([...new Set([...importedIds, p.id])]));
    toast.success(`"${p.name}" is already live in your store catalog.`);
  }

  function computePrice(cost: number): string {
    if (markupType === 'percent') return (cost * (1 + markupValue / 100)).toFixed(2);
    return (cost + markupValue).toFixed(2);
  }

  function copyKey() {
    navigator.clipboard.writeText(apiKey);
    toast.success('API key copied.');
  }

  // Show real imported products once they exist; otherwise the sample catalog.
  const showingLive = liveProducts.length > 0;
  const sourceProducts = showingLive ? liveProducts : MOCK_PRODUCTS;

  const cats = ['All', ...Array.from(new Set(sourceProducts.map(p => p.category)))];
  const filtered = useMemo(() => sourceProducts.filter(p => {
    if (catFilter !== 'All' && p.category !== catFilter) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.category.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [catFilter, search, sourceProducts]);

  const totalRevenue = [...importedIds].length * 45; // rough estimate

  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ background: '#0a0a0a', color: 'white' }}>
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
              style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>⚡</div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl font-black text-white">Zendrop</h1>
                {isConnected ? (
                  <span className="text-xs font-black px-2.5 py-1 rounded-full flex items-center gap-1.5"
                    style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Live
                  </span>
                ) : (
                  <span className="text-xs font-black px-2.5 py-1 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#6b7280', border: '1px solid rgba(255,255,255,0.08)' }}>
                    Not Connected
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-sm">US-based fulfillment · Auto-fulfillment API · 1M+ products</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isConnected && (
              <>
                <button onClick={syncProducts} disabled={isSyncing}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition hover:brightness-110 disabled:opacity-50"
                  style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing…' : 'Sync Catalog'}
                </button>
                <button onClick={disconnect} className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:text-red-400 transition">
                  Disconnect
                </button>
              </>
            )}
            <a href="https://zendrop.com" target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition hover:brightness-110"
              style={{ background: 'rgba(255,255,255,0.04)', color: '#6b7280', border: '1px solid rgba(255,255,255,0.07)' }}>
              <ExternalLink className="w-3.5 h-3.5" /> zendrop.com
            </a>
          </div>
        </div>

        {/* KPIs */}
        {isConnected && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Products Available', value: productCount.toLocaleString(), icon: Package,    color: '#34d399' },
              { label: 'Imported to Store',  value: importedIds.size.toString(),  icon: ShoppingBag, color: '#60a5fa' },
              { label: 'Avg Ship Time',       value: '3–5 days',                  icon: Truck,       color: '#a78bfa' },
              { label: 'Markup Setting',      value: `${markupValue}${markupType === 'percent' ? '%' : ' USD'}`, icon: TrendingUp, color: '#fbbf24' },
            ].map(k => (
              <div key={k.label} className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                <k.icon className="w-4 h-4 mb-2" style={{ color: k.color }} />
                <p className="text-xl font-black text-white">{k.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
          {([
            { key: 'connect', label: 'Connect' },
            { key: 'catalog', label: `Catalog${importedIds.size > 0 ? ` (${importedIds.size})` : ''}` },
            { key: 'orders', label: 'Orders' },
            { key: 'settings', label: 'Settings' },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key as Tab)}
              disabled={!isConnected && t.key !== 'connect'}
              className="flex-1 py-2 rounded-lg text-sm font-bold capitalize transition disabled:opacity-30"
              style={tab === t.key ? { background: '#059669', color: 'white' } : { color: '#6b7280' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── CONNECT ───────────────────────────────────────────────────────── */}
        {tab === 'connect' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Left: Why Zendrop */}
            <div className="space-y-4">
              <div className="rounded-2xl p-5 space-y-3" style={{ background: '#111', border: '1px solid rgba(16,185,129,0.2)' }}>
                <h3 className="font-black text-white text-lg">Why Zendrop?</h3>
                {[
                  { icon: Globe,      text: 'US fulfillment centers — fastest domestic delivery times' },
                  { icon: Zap,        text: 'Automated order forwarding — zero manual work after setup' },
                  { icon: Package,    text: '1M+ products across home, tools, lifestyle, and more' },
                  { icon: Shield,     text: 'Real-time order tracking on every shipment' },
                  { icon: DollarSign, text: 'Average 40–70% margins with competitive wholesale pricing' },
                ].map(r => (
                  <div key={r.text} className="flex items-start gap-3">
                    <r.icon className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-400 leading-relaxed">{r.text}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)' }}>
                <p className="text-xs font-black text-yellow-400">Zendrop Plans</p>
                <div className="space-y-1 text-xs text-gray-400">
                  <p><strong className="text-white">Free:</strong> 25 products, manual fulfillment</p>
                  <p><strong className="text-white">Pro $49/mo:</strong> unlimited + auto-fulfillment</p>
                  <p><strong className="text-white">Plus $79/mo:</strong> custom branding + analytics</p>
                </div>
              </div>

              <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-xs font-black text-gray-500 mb-3 uppercase tracking-wide">Zendrop vs Spocket</p>
                <div className="space-y-2">
                  {[
                    { label: 'Best for',     zd: 'High volume, tools, home goods', sp: 'Premium goods, EU products' },
                    { label: 'Ship speed',   zd: '3–5 days (US)',                  sp: '2–5 days (US/EU)' },
                    { label: 'Catalog',      zd: '1M+ products',                   sp: '~500K products' },
                    { label: 'Branding',     zd: 'Plus plan only',                 sp: 'Pro plan' },
                  ].map(r => (
                    <div key={r.label} className="grid grid-cols-3 gap-2 text-[10px] py-1.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                      <p className="text-gray-600 font-bold">{r.label}</p>
                      <p className="text-emerald-400">{r.zd}</p>
                      <p className="text-purple-400">{r.sp}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-600 mt-2">💡 Use both — different strengths, no conflict.</p>
              </div>
            </div>

            {/* Right: Connect form */}
            <div className="space-y-4">
              <div className="rounded-2xl p-5 space-y-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                <h3 className="font-black text-white">Connect Your Account</h3>

                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Zendrop API Key <span className="text-gray-700">*required</span></p>
                  <div className="relative flex items-center" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
                    <Key className="absolute left-3.5 w-4 h-4 text-gray-600" />
                    <input
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      type={showKey ? 'text' : 'password'}
                      placeholder="zdp_live_••••••••••••••••"
                      className="flex-1 pl-10 pr-20 py-3 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none"
                    />
                    <div className="absolute right-2 flex gap-1">
                      {apiKey && (
                        <button onClick={copyKey} className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 transition">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => setShowKey(v => !v)} className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 transition">
                        {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1">Zendrop Dashboard → Settings → API Access → Generate Key</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1.5">Store ID <span className="text-gray-700">(optional)</span></p>
                  <input
                    value={storeId}
                    onChange={e => setStoreId(e.target.value)}
                    placeholder="Your Zendrop Store ID"
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none"
                    style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                </div>

                {apiError && (
                  <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300">{apiError}</p>
                  </div>
                )}

                <button
                  onClick={() => testConnection()}
                  disabled={isTesting}
                  className="w-full py-3.5 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 transition hover:brightness-110 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
                >
                  {isTesting
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Connecting…</>
                    : isConnected
                      ? <><CheckCircle className="w-4 h-4" /> Reconnect</>
                      : <><Zap className="w-4 h-4" /> Connect Zendrop</>
                  }
                </button>

                {isConnected && (
                  <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)' }}>
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-green-400 font-bold">Connected · {productCount.toLocaleString()} products</p>
                      {lastSync && <p className="text-[10px] text-green-600">Last synced: {lastSync}</p>}
                    </div>
                  </div>
                )}

                {/* How to get API key */}
                <div className="border-t pt-4 space-y-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <p className="text-xs font-bold text-gray-500">How to get your API key:</p>
                  {[
                    '1. Go to zendrop.com → Log in to your account',
                    '2. Click your avatar → Settings → API Access',
                    '3. Click "Generate API Key" → copy it',
                    '4. Paste above and click Connect',
                  ].map(s => <p key={s} className="text-xs text-gray-600">{s}</p>)}
                  <a href="https://zendrop.com" target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-400 transition mt-1">
                    Get started at zendrop.com <ArrowRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CATALOG ───────────────────────────────────────────────────────── */}
        {tab === 'catalog' && (
          <div className="space-y-4">
            {/* Search + filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search Zendrop products…"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none"
                  style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {cats.map(c => (
                  <button key={c} onClick={() => setCat(c)}
                    className="px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap"
                    style={catFilter === c
                      ? { background: '#059669', color: 'white' }
                      : { background: '#111', color: '#6b7280', border: '1px solid rgba(255,255,255,0.07)' }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {showingLive ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1.5 px-2 py-1 rounded-full font-bold"
                  style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Live in your store
                </span>
                <span className="text-gray-600">{filtered.length} products imported from Zendrop{loadingLive ? ' · refreshing…' : ''}</span>
              </div>
            ) : (
              <p className="text-xs text-gray-600">
                {loadingLive ? 'Loading your imported products…' : `Sample catalog · ${filtered.length} products · click Connect or Sync to import your real Zendrop top products`}
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map(p => {
                const yourPrice = computePrice(p.cost);
                const margin = (((parseFloat(yourPrice) - p.cost) / parseFloat(yourPrice)) * 100).toFixed(0);
                const imported = importedIds.has(p.id);

                return (
                  <div key={p.id} className="rounded-2xl p-4 transition"
                    style={{ background: '#111', border: `1px solid ${imported ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.07)'}` }}>
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {typeof p.img === 'string' && /^https?:\/\//.test(p.img)
                          ? <img src={p.img} alt={p.name} className="w-full h-full object-cover" />
                          : p.img}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-white leading-tight truncate">{p.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                            style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399' }}>{p.category}</span>
                          <span className="text-[10px] text-gray-600">{p.shipsFrom} · {p.eta}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-3 h-3 text-yellow-400" />
                          <span className="text-[10px] text-gray-500">{p.rating} ({p.reviews} reviews)</span>
                          <span className="text-[10px] text-gray-600 ml-1">{p.stock} in stock</span>
                        </div>
                        <p className="text-[10px] text-gray-600 mt-1">SKU: {p.sku}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {[
                        { label: 'Your cost', value: `$${p.cost.toFixed(2)}`, color: 'text-gray-400' },
                        { label: 'Your price', value: `$${yourPrice}`, color: 'text-white' },
                        { label: 'Margin', value: `${margin}%`, color: 'text-emerald-400' },
                      ].map(c => (
                        <div key={c.label} className="rounded-lg p-2 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <p className={`text-xs font-bold ${c.color}`}>{c.value}</p>
                          <p className="text-[9px] text-gray-600">{c.label}</p>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => importProduct(p)}
                      disabled={imported}
                      className="w-full mt-3 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                      style={imported
                        ? { background: 'rgba(74,222,128,0.06)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)', cursor: 'default' }
                        : { background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)', cursor: 'pointer' }}>
                      {imported
                        ? <><CheckCircle className="w-3.5 h-3.5" /> In Your Store</>
                        : <><Package className="w-3.5 h-3.5" /> Import to Store</>}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ORDERS ────────────────────────────────────────────────────────── */}
        {tab === 'orders' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">{MOCK_ORDERS.length} orders routed through Zendrop</p>
              <button className="text-xs text-emerald-400 hover:text-emerald-300 transition">Export CSV</button>
            </div>

            {MOCK_ORDERS.map(o => {
              const st = ORDER_STATUS[o.status] || ORDER_STATUS.processing;
              return (
                <div key={o.id} className="rounded-2xl p-4" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-white text-sm">{o.customer}</p>
                        <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{o.product}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">Ordered {o.orderDate} · Order {o.id}</p>
                    </div>
                    <p className="font-bold text-white text-sm flex-shrink-0">${o.total}</p>
                  </div>
                  {o.tracking && (
                    <div className="mt-3 flex items-center gap-2 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <Truck className="w-3.5 h-3.5 text-gray-500" />
                      <p className="text-[10px] text-gray-500 font-mono">{o.tracking}</p>
                      <button onClick={() => { navigator.clipboard.writeText(o.tracking); toast.success('Tracking copied!'); }}
                        className="ml-auto">
                        <Copy className="w-3 h-3 text-gray-600 hover:text-gray-300 transition" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="rounded-xl p-4 flex gap-2.5" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)' }}>
              <Info className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-400">When auto-fulfillment is on, orders from your store are automatically forwarded to Zendrop. You never touch the order — Zendrop picks, packs, and ships directly to your customer.</p>
            </div>
          </div>
        )}

        {/* ── SETTINGS ──────────────────────────────────────────────────────── */}
        {tab === 'settings' && (
          <div className="max-w-lg space-y-4">
            <div className="rounded-2xl p-5 space-y-5" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="font-black text-white">Pricing & Markup</h3>

              <div className="grid grid-cols-2 gap-2">
                {[['percent', '% Percentage markup'], ['fixed', '$ Fixed amount added']] .map(([v, label]) => (
                  <button key={v} onClick={() => setMarkupType(v as any)}
                    className="py-2.5 rounded-xl text-xs font-bold transition"
                    style={markupType === v
                      ? { background: 'rgba(5,150,105,0.2)', color: '#34d399', border: '1px solid rgba(5,150,105,0.4)' }
                      : { background: '#0d0d0d', color: '#6b7280', border: '1px solid rgba(255,255,255,0.07)' }}>
                    {label}
                  </button>
                ))}
              </div>

              <div>
                <p className="text-sm font-bold text-white mb-2">
                  Markup: <span className="text-emerald-400">{markupValue}{markupType === 'percent' ? '%' : ' USD'}</span>
                </p>
                <input type="range"
                  min={markupType === 'percent' ? 20 : 5}
                  max={markupType === 'percent' ? 200 : 100}
                  value={markupValue}
                  onChange={e => setMarkupValue(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <p className="text-[10px] text-gray-600 mt-1">
                  Example: $15 cost → <strong className="text-white">${computePrice(15)}</strong> your price
                </p>
              </div>

              {[
                { label: 'Auto-fulfillment', sub: 'Orders sent to Zendrop automatically on purchase', state: autoFulfill, set: setAutoFulfill },
                { label: 'Prioritize US warehouse', sub: 'Always ship from US stock first for fastest delivery', state: usWarehouse, set: setUsWarehouse },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-white">{s.label}</p>
                    <p className="text-xs text-gray-500">{s.sub}</p>
                  </div>
                  <button onClick={() => s.set(v => !v)}>
                    <div className="w-11 h-6 rounded-full relative transition-colors" style={{ background: s.state ? '#059669' : '#333' }}>
                      <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" style={{ left: s.state ? 'calc(100% - 20px)' : '4px' }} />
                    </div>
                  </button>
                </div>
              ))}

              <button
                onClick={() => { saveConfig(); toast.success('Zendrop settings saved.'); }}
                className="w-full py-3 rounded-xl font-black text-sm text-white transition hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}>
                Save Settings
              </button>
            </div>

            {/* Auto-fulfillment flow */}
            <div className="rounded-2xl p-5" style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              <h3 className="font-black text-white mb-4">Auto-Fulfillment Flow</h3>
              {[
                'Customer places order in your store',
                'Order forwarded to Zendrop API automatically',
                'Zendrop picks, packs & ships from US warehouse',
                'Tracking number emailed to customer',
                'You keep the margin — zero manual work required',
              ].map((s, i) => (
                <div key={s} className="flex items-center gap-3 mb-3 last:mb-0">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                    style={{ background: 'rgba(5,150,105,0.15)', color: '#34d399', border: '1px solid rgba(5,150,105,0.2)' }}>
                    {i + 1}
                  </div>
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
