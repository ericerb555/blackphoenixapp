/**
 * HotProductsRadar — advanced, cross-market trending-product discovery + sourcing.
 *
 * Three tabs:
 *  - Discover: scan the connected supplier (Zendrop) for hot best-sellers, score
 *    them, and one-click import winners into the live store. Every row shows a full
 *    SOURCING MAP — where you can get the product (which dropshippers carry it, plus
 *    retail/wholesale/POD/digital deep-links) and an on-demand AI sourcing analysis.
 *  - Search Everywhere: AI-powered universal product research across ANY category
 *    and type (physical, digital, print-on-demand, wholesale, handmade). Each result
 *    carries a sourcing map and can be sent straight to Product Page Pilot.
 *  - Live Store: manage which live products are Featured.
 */
import { useState, useCallback, useEffect } from 'react';
import {
  Flame, RefreshCw, Loader2, TrendingUp, Sparkles, Rocket, CheckSquare, Square,
  Star, Store, Zap, Globe, Search, ExternalLink, ChevronDown, MapPin, Wand2,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { authedHeadersOrAnon } from "../utils/authHeaders";
import { supabase } from '../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface SourcingEntry { key: string; label: string; type: string; availability: 'connected' | 'search'; url: string; }

interface HotProduct {
  id: string;
  sku: string;
  name: string;
  image: string;
  category: string;
  cost: number;
  trendingScore: number;
  isTrending: boolean;
  isNew: boolean;
  signals: { rating: number; reviews: number; sales: number; price: number; ageDays: number };
  /** Null when nothing can measure it — render as "no data", never as zero. */
  growthPct: number | null;
  signalQuality?: { score: number; have: string[]; missing: string[]; basis: string };
  productType?: string;
  source?: string;
  sourceLabel?: string;
  inNetwork?: boolean;
  sourcing?: SourcingEntry[];
}

interface EverywhereProduct {
  id: string;
  name: string;
  category: string;
  productType: string;
  whyTrending: string;
  demandScore: number;
  estUnitCost: string;
  estRetail: string;
  audience: string;
  bestChannel: string;
  dropshippersLikely: string[];
  sourceHint: string;
  sourcing: SourcingEntry[];
}

interface LiveProduct {
  id: string; name: string; image: string; category: string; price: number;
  isFeatured: boolean; trendingScore?: number; rating?: number; reviews?: number;
}

type Tab = 'discover' | 'everywhere' | 'live';

async function adminToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

function scoreColor(s: number) {
  if (s >= 75) return '#ef4444';
  if (s >= 55) return '#ea580c';
  if (s >= 35) return '#eab308';
  return '#a1a1aa';
}

// Parse a "$12–$29" / "$29" style string into a representative number.
function parsePrice(s?: string): number {
  if (!s) return 0;
  const nums = String(s).match(/[\d.]+/g);
  if (!nums || !nums.length) return 0;
  const vals = nums.map(Number).filter(n => !isNaN(n));
  if (!vals.length) return 0;
  return vals[vals.length - 1]; // upper bound of a range = likely retail
}

const TYPE_META: Record<string, { label: string; color: string }> = {
  dropshipping: { label: 'Dropshipping', color: '#ea580c' },
  marketplace: { label: 'Marketplace', color: '#3b82f6' },
  wholesale: { label: 'Wholesale', color: '#8b5cf6' },
  retail: { label: 'Retail', color: '#22c55e' },
  industrial: { label: 'Industrial', color: '#6b7280' },
  'print-on-demand': { label: 'Print-on-Demand', color: '#ec4899' },
  digital: { label: 'Digital', color: '#06b6d4' },
  handmade: { label: 'Handmade', color: '#f59e0b' },
  'meta-search': { label: 'Meta-Search', color: '#a1a1aa' },
  physical: { label: 'Physical', color: '#22c55e' },
  service: { label: 'Service', color: '#14b8a6' },
};

function typeChip(type: string) {
  const m = TYPE_META[type] || TYPE_META['meta-search'];
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: `${m.color}22`, color: m.color }}>
      {m.label}
    </span>
  );
}

// ── Sourcing panel — "where can I get this" ─────────────────────────────────
function SourcingPanel({ product }: { product: { name: string; category?: string; cost?: number; sourcing?: SourcingEntry[] } }) {
  const [open, setOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  const sourcing = product.sourcing || [];
  const connected = sourcing.filter(s => s.availability === 'connected');

  const groups = sourcing.reduce((acc: Record<string, SourcingEntry[]>, s) => {
    (acc[s.type] = acc[s.type] || []).push(s); return acc;
  }, {});

  const analyze = useCallback(async () => {
    setAnalyzing(true);
    try {
      const token = await adminToken();
      const res = await fetch(`${SERVER}/hot-products/source-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || publicAnonKey}` },
        body: JSON.stringify({ name: product.name, category: product.category, cost: product.cost }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `Analysis failed (${res.status})`);
      setAnalysis(data.analysis);
      if (!data.analysis) toast.info('Showing sourcing links (AI analysis unavailable).');
    } catch (err: any) {
      toast.error(err.message || 'Sourcing analysis failed.');
    } finally { setAnalyzing(false); }
  }, [product]);

  return (
    <div className="mt-2">
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 text-[11px] font-bold text-orange-400 hover:text-orange-300">
        <MapPin className="w-3 h-3" /> Where to get it
        {connected.length > 0 && <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[9px]">{connected.length} connected</span>}
        <ChevronDown className={`w-3 h-3 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-2 rounded-xl p-3 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {Object.entries(groups).map(([type, entries]) => (
            <div key={type}>
              <div className="mb-1">{typeChip(type)}</div>
              <div className="flex flex-wrap gap-1.5">
                {entries.map(s => (
                  <a key={s.key} href={s.url} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition hover:brightness-125"
                    style={{ background: s.availability === 'connected' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)', color: s.availability === 'connected' ? '#34d399' : '#d4d4d8' }}>
                    {s.label}
                    {s.availability === 'connected' && <span className="text-[8px] px-1 rounded bg-emerald-500/30">API</span>}
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </a>
                ))}
              </div>
            </div>
          ))}

          <div className="pt-1 border-t border-white/5">
            {!analysis ? (
              <button onClick={analyze} disabled={analyzing} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white disabled:opacity-50" style={{ background: '#7c3aed' }}>
                {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} Analyze sourcing (AI)
              </button>
            ) : (
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2">
                  {typeChip(analysis.productType || 'physical')}
                  <span className="text-gray-300 font-semibold">Best: {analysis.bestChannel}</span>
                </div>
                <p className="text-gray-400">{analysis.recommendation}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-500">
                  {analysis.estUnitCostRange && <span><DollarSign className="w-2.5 h-2.5 inline" /> Cost {analysis.estUnitCostRange}</span>}
                  {analysis.estRetailRange && <span>Sell {analysis.estRetailRange}</span>}
                </div>
                {analysis.marginNote && <p className="text-gray-500">💰 {analysis.marginNote}</p>}
                {analysis.logisticsNote && <p className="text-gray-500">🚚 {analysis.logisticsNote}</p>}
                {Array.isArray(analysis.dropshippersLikely) && analysis.dropshippersLikely.length > 0 && (
                  <p className="text-gray-400">Likely on: <span className="text-orange-300">{analysis.dropshippersLikely.join(', ')}</span></p>
                )}
                {Array.isArray(analysis.risks) && analysis.risks.length > 0 && (
                  <p className="text-amber-400/80">⚠ {analysis.risks.join(' · ')}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HotProductsRadar() {
  const [tab, setTab] = useState<Tab>('discover');

  // ── Discover state ──────────────────────────────────────────────
  const [products, setProducts] = useState<HotProduct[]>([]);
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // ── Search Everywhere state ──────────────────────────────────────
  const [query, setQuery] = useState('');
  const [everywhereType, setEverywhereType] = useState('all');
  const [everywhere, setEverywhere] = useState<EverywhereProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchedFor, setSearchedFor] = useState('');

  // ── Live Store state ────────────────────────────────────────────
  const [live, setLive] = useState<LiveProduct[]>([]);
  const [loadingLive, setLoadingLive] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [featuringPopular, setFeaturingPopular] = useState(false);

  const discover = useCallback(async () => {
    setScanning(true);
    try {
      const token = await adminToken();
      if (!token) { toast.error('Sign in as an admin to scan for hot products.'); return; }
      const res = await fetch(`${SERVER}/hot-products/discover?scan=150`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `Scan failed (${res.status})`);
      setProducts(data.products || []);
      setScannedAt(data.scannedAt || null);
      setSelected(new Set());
      toast.success(`Scanned ${data.count} products · ${data.trendingCount} in the best-seller feed.`);
    } catch (err: any) {
      console.error('Hot products discover failed:', err);
      toast.error(err.message || 'Could not scan for hot products.');
    } finally { setScanning(false); }
  }, []);

  const searchEverywhere = useCallback(async () => {
    setSearching(true);
    try {
      const token = await adminToken();
      if (!token) { toast.error('Sign in as an admin to search.'); return; }
      const res = await fetch(`${SERVER}/hot-products/search-everywhere`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: query.trim(), type: everywhereType, count: 12 }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `Search failed (${res.status})`);
      setEverywhere(data.products || []);
      setSearchedFor(query.trim() || 'hottest cross-category winners');
      toast.success(`Found ${data.count} product opportunities.`);
    } catch (err: any) {
      console.error('Search everywhere failed:', err);
      toast.error(err.message || 'Universal search failed.');
    } finally { setSearching(false); }
  }, [query, everywhereType]);

  // Seed a discovered idea into Product Page Pilot and navigate there.
  const sendToPagePilot = useCallback((p: EverywhereProduct) => {
    try {
      localStorage.setItem('pagePilotSeed', JSON.stringify({
        id: p.id,
        name: p.name,
        description: p.whyTrending || '',
        price: parsePrice(p.estRetail),
        category: p.category || 'General',
        badge: p.productType && p.productType !== 'physical' ? p.productType : undefined,
      }));
      toast.success('Sent to Product Page Pilot.');
      (window as any).__navigateApp?.('product-page-pilot');
    } catch {
      toast.error('Could not open Product Page Pilot.');
    }
  }, []);

  const runImport = useCallback(async (payload: { ids?: string[]; top?: number }) => {
    setImporting(true);
    try {
      const token = await adminToken();
      if (!token) { toast.error('Sign in as an admin to import.'); return; }
      const res = await fetch(`${SERVER}/hot-products/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `Import failed (${res.status})`);
      toast.success(`Imported ${data.imported} product${data.imported !== 1 ? 's' : ''} into your live store.`);
      setSelected(new Set());
      loadLive();
    } catch (err: any) {
      console.error('Hot products import failed:', err);
      toast.error(err.message || 'Could not import products.');
    } finally { setImporting(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLive = useCallback(async () => {
    setLoadingLive(true);
    try {
      const res = await fetch(`${SERVER}/products?isActive=true&limit=200`, { headers: await authedHeadersOrAnon(publicAnonKey) });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `Failed to load live products (${res.status})`);
      const items: LiveProduct[] = (data.products || []).map((p: any) => ({
        id: p.id,
        name: p.name || p.title || 'Untitled',
        image: p.primaryImage || p.images?.[0] || p.image || '',
        category: p.category || 'General',
        price: Number(p.price) || 0,
        isFeatured: !!p.isFeatured,
        trendingScore: typeof p.trendingScore === 'number' ? p.trendingScore : undefined,
        rating: p.rating,
        reviews: p.reviews || p.reviewCount,
      }));
      items.sort((a, b) => {
        if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
        return (b.trendingScore || 0) - (a.trendingScore || 0);
      });
      setLive(items);
    } catch (err: any) {
      console.error('Load live products failed:', err);
      toast.error(err.message || 'Could not load live products.');
    } finally { setLoadingLive(false); }
  }, []);

  const setFeatured = useCallback(async (id: string, isFeatured: boolean) => {
    setSavingId(id);
    setLive(prev => prev.map(p => (p.id === id ? { ...p, isFeatured } : p)));
    try {
      const token = await adminToken();
      const res = await fetch(`${SERVER}/products/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || publicAnonKey}` },
        body: JSON.stringify({ isFeatured }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `Update failed (${res.status})`);
      toast.success(isFeatured ? 'Added to Featured Products.' : 'Removed from Featured.');
    } catch (err: any) {
      console.error('Set featured failed:', err);
      toast.error(err.message || 'Could not update featured status.');
      setLive(prev => prev.map(p => (p.id === id ? { ...p, isFeatured: !isFeatured } : p)));
    } finally { setSavingId(null); }
  }, []);

  const featurePopular = useCallback(async (topN = 8) => {
    setFeaturingPopular(true);
    try {
      const ranked = [...live].filter(p => !p.isFeatured).sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0)).slice(0, topN);
      if (ranked.length === 0) { toast.info('Top items are already featured.'); return; }
      for (const p of ranked) { await setFeatured(p.id, true); }
      toast.success(`Featured the ${ranked.length} most popular product${ranked.length !== 1 ? 's' : ''}.`);
    } finally { setFeaturingPopular(false); }
  }, [live, setFeatured]);

  useEffect(() => {
    if (tab === 'live' && live.length === 0 && !loadingLive) loadLive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const toggle = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allSelected = products.length > 0 && selected.size === products.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(products.map(p => p.id)));
  const featuredCount = live.filter(p => p.isFeatured).length;

  const tabBtn = (t: Tab, icon: any, label: string, extra?: any) => {
    const Icon = icon;
    return (
      <button onClick={() => setTab(t)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${tab === t ? 'text-white' : 'text-gray-400'}`} style={{ background: tab === t ? '#ea580c' : 'rgba(255,255,255,0.05)' }}>
        <Icon className="w-4 h-4" /> {label} {extra}
      </button>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Flame className="w-6 h-6 text-orange-400" />
          <div>
            <h3 className="text-lg font-black text-white">Hot Products Radar</h3>
            <p className="text-xs text-gray-500">Discover trending winners anywhere, see exactly where to source them, and feature your best live products.</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {tabBtn('discover', Flame, 'Discover')}
        {tabBtn('everywhere', Globe, 'Search Everywhere')}
        {tabBtn('live', Store, 'Live Store', live.length > 0 && <span className="opacity-70">({live.length})</span>)}
      </div>

      {/* ── DISCOVER TAB ─────────────────────────────────────────── */}
      {tab === 'discover' && (
        <>
          <div className="flex items-center gap-2">
            <button onClick={discover} disabled={scanning} className="px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-2" style={{ background: '#ea580c' }}>
              {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} {scanning ? 'Scanning…' : 'Scan for hot products'}
            </button>
            <button onClick={() => runImport({ top: 10 })} disabled={importing || products.length === 0} className="px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-2 disabled:opacity-40" style={{ background: '#ef4444' }}>
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />} Import top 10
            </button>
          </div>

          {scannedAt && <p className="text-[11px] text-gray-600">Last scan: {new Date(scannedAt).toLocaleString()}</p>}

          {products.length === 0 ? (
            <div className="rounded-2xl p-12 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <TrendingUp className="w-10 h-10 text-orange-400/50 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Run a scan to surface the hottest trending products from your supplier, each with a full sourcing map. Want products beyond your supplier's catalog? Try <button onClick={() => setTab('everywhere')} className="text-orange-400 font-bold">Search Everywhere</button>.</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <button onClick={toggleAll} className="flex items-center gap-2 text-xs text-gray-300">
                  {allSelected ? <CheckSquare className="w-4 h-4 text-orange-400" /> : <Square className="w-4 h-4" />} Select all ({products.length})
                </button>
                {selected.size > 0 && (
                  <button onClick={() => runImport({ ids: [...selected] })} disabled={importing} className="px-3 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1.5" style={{ background: '#ef4444' }}>
                    {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />} Import {selected.size} selected
                  </button>
                )}
              </div>
              <div className="divide-y divide-white/5">
                {products.map((p, i) => (
                  <div key={p.id} className="px-4 py-3 hover:bg-white/5 transition">
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggle(p.id)}>{selected.has(p.id) ? <CheckSquare className="w-4 h-4 text-orange-400" /> : <Square className="w-4 h-4 text-gray-600" />}</button>
                      <span className="text-xs text-gray-600 w-5 text-right">{i + 1}</span>
                      <div className="w-11 h-11 rounded-lg overflow-hidden bg-white/5 shrink-0">
                        {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-600"><Sparkles className="w-4 h-4" /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-white font-semibold truncate">{p.name}</span>
                          {p.isTrending && <span className="px-1.5 py-0.5 rounded text-[9px] font-black text-white shrink-0" style={{ background: '#ef4444' }}>🔥 HOT</span>}
                          {p.isNew && <span className="px-1.5 py-0.5 rounded text-[9px] font-black text-white shrink-0" style={{ background: '#3b82f6' }}>NEW</span>}
                          {p.sourceLabel && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 bg-emerald-500/15 text-emerald-400">✓ {p.sourceLabel}</span>}
                        </div>
                        <p className="text-[11px] text-gray-500 truncate">
                          {p.category} · ${Number(p.cost || 0).toFixed(2)} cost · {p.signals.reviews} reviews
                          {p.signals.rating > 0 && <> · <Star className="w-2.5 h-2.5 inline text-yellow-400 fill-yellow-400" /> {p.signals.rating.toFixed(1)}</>}
                        </p>
                      </div>
                      {/* Growth, only when growth is known.

                          This showed a green "+180%" on every row. The number
                          behind it was arithmetic on a boolean and a review
                          count — no source of growth data is connected to this
                          app — and rendered in emerald with an upward arrow it
                          was indistinguishable from a measurement. A confident
                          fake number eventually drives a real buying decision,
                          and that costs money in stock and ad spend.

                          Now it appears when there are two readings to compare
                          and says "no data" otherwise, which is the truth. */}
                      <div className="text-right shrink-0">
                        {typeof p.growthPct === 'number' ? (
                          <>
                            <div className={`flex items-center gap-1 text-[11px] font-bold justify-end ${
                              p.growthPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              <TrendingUp className="w-3 h-3" />
                              {p.growthPct >= 0 ? '+' : ''}{p.growthPct}%
                            </div>
                            <div className="text-[10px] text-gray-600">growth</div>
                          </>
                        ) : (
                          <>
                            <div className="text-[11px] font-bold text-gray-600 justify-end">—</div>
                            <div className="text-[10px] text-gray-600" title="No demand history is connected, so growth cannot be measured.">no data</div>
                          </>
                        )}
                      </div>
                      <div className="w-14 text-center shrink-0">
                        <div className="text-lg font-black" style={{ color: scoreColor(p.trendingScore) }}>{p.trendingScore}</div>
                        <div className="text-[9px] text-gray-600 uppercase tracking-wide">score</div>
                      </div>
                      <button onClick={() => runImport({ ids: [p.id] })} disabled={importing} className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white shrink-0" style={{ background: '#ea580c' }}>Add</button>
                    </div>
                    <div className="pl-14"><SourcingPanel product={{ name: p.name, category: p.category, cost: p.cost, sourcing: p.sourcing }} /></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── SEARCH EVERYWHERE TAB ────────────────────────────────── */}
      {tab === 'everywhere' && (
        <>
          <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)' }}>
            <div className="flex items-center gap-2 text-purple-300"><Globe className="w-4 h-4" /><span className="text-sm font-bold">Universal AI product research</span></div>
            <p className="text-[11px] text-gray-400">Search the entire market — physical goods, digital products, print-on-demand, wholesale, handmade. Not limited to your connected supplier.</p>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') searchEverywhere(); }}
                  placeholder="e.g. eco kitchen gadgets, digital planners, custom hoodies… (blank = hottest overall)"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>
              <select value={everywhereType} onChange={e => setEverywhereType(e.target.value)} className="px-3 py-2.5 rounded-xl text-sm text-white" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <option value="all">All types</option>
                <option value="physical">Physical</option>
                <option value="digital">Digital</option>
                <option value="print-on-demand">Print-on-Demand</option>
                <option value="wholesale">Wholesale</option>
                <option value="handmade">Handmade</option>
              </select>
              <button onClick={searchEverywhere} disabled={searching} className="px-4 py-2.5 rounded-xl text-sm font-bold text-white flex items-center gap-2 disabled:opacity-50" style={{ background: '#7c3aed' }}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} {searching ? 'Searching…' : 'Search everywhere'}
              </button>
            </div>
          </div>

          {everywhere.length === 0 ? (
            <div className="rounded-2xl p-12 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <Globe className="w-10 h-10 text-purple-400/50 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Search anything — the AI surfaces trending opportunities across every channel with a full sourcing map for each.</p>
            </div>
          ) : (
            <>
              <p className="text-[11px] text-gray-600">Showing opportunities for: <span className="text-gray-400">{searchedFor}</span></p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {everywhere.map((p) => (
                  <div key={p.id} className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-white font-bold">{p.name}</span>
                          {typeChip(p.productType)}
                        </div>
                        <p className="text-[11px] text-gray-500">{p.category}{p.audience && <> · for {p.audience}</>}</p>
                      </div>
                      <div className="text-center shrink-0">
                        <div className="text-lg font-black" style={{ color: scoreColor(p.demandScore) }}>{p.demandScore}</div>
                        <div className="text-[9px] text-gray-600 uppercase">demand</div>
                      </div>
                    </div>
                    {p.whyTrending && <p className="text-[11px] text-gray-400 mt-2">{p.whyTrending}</p>}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-gray-500">
                      {p.estUnitCost && <span><DollarSign className="w-2.5 h-2.5 inline" /> Cost {p.estUnitCost}</span>}
                      {p.estRetail && <span>Sell {p.estRetail}</span>}
                      {p.bestChannel && <span className="text-orange-300">Best: {p.bestChannel}</span>}
                    </div>
                    {p.dropshippersLikely.length > 0 && (
                      <p className="text-[11px] text-gray-400 mt-1">On: <span className="text-orange-300">{p.dropshippersLikely.join(', ')}</span></p>
                    )}
                    <SourcingPanel product={{ name: p.name, category: p.category, sourcing: p.sourcing }} />
                    <button onClick={() => sendToPagePilot(p)} className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white" style={{ background: 'linear-gradient(90deg,#ea580c,#dc2626)' }}>
                      <Rocket className="w-3 h-3" /> Send to Page Pilot
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ── LIVE STORE TAB ───────────────────────────────────────── */}
      {tab === 'live' && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={loadLive} disabled={loadingLive} className="px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.08)' }}>
              {loadingLive ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Refresh
            </button>
            <button onClick={() => featurePopular(8)} disabled={featuringPopular || live.length === 0} className="px-4 py-2 rounded-xl text-sm font-bold text-white flex items-center gap-2 disabled:opacity-40" style={{ background: '#ea580c' }}>
              {featuringPopular ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Feature popular items
            </button>
            <span className="text-[11px] text-gray-500">{featuredCount} featured · {live.length} live</span>
          </div>

          {loadingLive && live.length === 0 ? (
            <div className="rounded-2xl p-12 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <Loader2 className="w-8 h-8 text-orange-400/60 mx-auto mb-3 animate-spin" />
              <p className="text-sm text-gray-400">Loading your live products…</p>
            </div>
          ) : live.length === 0 ? (
            <div className="rounded-2xl p-12 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <Store className="w-10 h-10 text-orange-400/50 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No products are live in your store yet. Import some from the Discover tab.</p>
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="divide-y divide-white/5">
                {live.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition">
                    <div className="w-11 h-11 rounded-lg overflow-hidden bg-white/5 shrink-0">
                      {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-600"><Sparkles className="w-4 h-4" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white font-semibold truncate">{p.name}</span>
                        {p.isFeatured && <span className="px-1.5 py-0.5 rounded text-[9px] font-black text-white shrink-0" style={{ background: '#ea580c' }}>★ FEATURED</span>}
                      </div>
                      <p className="text-[11px] text-gray-500 truncate">
                        {p.category} · ${p.price.toFixed(2)}
                        {typeof p.trendingScore === 'number' && <> · score {p.trendingScore}</>}
                        {p.reviews ? <> · {p.reviews} reviews</> : null}
                      </p>
                    </div>
                    {typeof p.trendingScore === 'number' && (
                      <div className="w-12 text-center shrink-0">
                        <div className="text-base font-black" style={{ color: scoreColor(p.trendingScore) }}>{p.trendingScore}</div>
                        <div className="text-[9px] text-gray-600 uppercase tracking-wide">score</div>
                      </div>
                    )}
                    <button onClick={() => setFeatured(p.id, !p.isFeatured)} disabled={savingId === p.id} title={p.isFeatured ? 'Remove from Featured' : 'Add to Featured'} className="px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 disabled:opacity-50" style={{ background: p.isFeatured ? 'rgba(234,88,12,0.15)' : 'rgba(255,255,255,0.06)', color: p.isFeatured ? '#fb923c' : '#d4d4d8' }}>
                      {savingId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className={`w-3.5 h-3.5 ${p.isFeatured ? 'fill-orange-400 text-orange-400' : ''}`} />}
                      {p.isFeatured ? 'Featured' : 'Feature'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
