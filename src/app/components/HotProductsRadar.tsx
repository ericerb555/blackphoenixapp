/**
 * HotProductsRadar — Kalodata-style trending-product discovery dashboard.
 * Scans the connected supplier (Zendrop) for the hottest / newest best-sellers,
 * scores each by a composite "trending score", and lets an admin one-click
 * import the winners straight into the live store. Lives in the Content Center.
 *
 * Two tabs:
 *  - Discover: scan the supplier and import trending products into the store.
 *  - Live Store: see everything currently live in the storefront and toggle
 *    which items are Featured (Kalodata "popular" → featured products). Includes
 *    a one-click "Feature popular items" that features the highest-scoring live
 *    products automatically.
 */
import { useState, useCallback, useEffect } from 'react';
import { Flame, RefreshCw, Loader2, TrendingUp, Sparkles, Rocket, CheckSquare, Square, Star, Store, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

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
  signals: { rating: number; reviews: number; sales: number; price: number; ageDays: number; estGrowthPct: number };
}

interface LiveProduct {
  id: string;
  name: string;
  image: string;
  category: string;
  price: number;
  isFeatured: boolean;
  trendingScore?: number;
  rating?: number;
  reviews?: number;
}

type Tab = 'discover' | 'live';

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

export default function HotProductsRadar() {
  const [tab, setTab] = useState<Tab>('discover');

  // ── Discover state ──────────────────────────────────────────────
  const [products, setProducts] = useState<HotProduct[]>([]);
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
      // Reflect the new live items immediately.
      loadLive();
    } catch (err: any) {
      console.error('Hot products import failed:', err);
      toast.error(err.message || 'Could not import products.');
    } finally { setImporting(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load what's currently live in the storefront.
  const loadLive = useCallback(async () => {
    setLoadingLive(true);
    try {
      const res = await fetch(`${SERVER}/products?isActive=true&limit=200`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
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
      // Featured first, then by trending score.
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

  // Toggle a single product's featured flag.
  const setFeatured = useCallback(async (id: string, isFeatured: boolean) => {
    setSavingId(id);
    // Optimistic update.
    setLive(prev => prev.map(p => (p.id === id ? { ...p, isFeatured } : p)));
    try {
      const token = await adminToken();
      const res = await fetch(`${SERVER}/products/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || publicAnonKey}`,
        },
        body: JSON.stringify({ isFeatured }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `Update failed (${res.status})`);
      toast.success(isFeatured ? 'Added to Featured Products.' : 'Removed from Featured.');
    } catch (err: any) {
      console.error('Set featured failed:', err);
      toast.error(err.message || 'Could not update featured status.');
      // Roll back on failure.
      setLive(prev => prev.map(p => (p.id === id ? { ...p, isFeatured: !isFeatured } : p)));
    } finally { setSavingId(null); }
  }, []);

  // Feature the top N most popular (highest trending score) live products.
  const featurePopular = useCallback(async (topN = 8) => {
    setFeaturingPopular(true);
    try {
      const ranked = [...live]
        .filter(p => !p.isFeatured)
        .sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0))
        .slice(0, topN);
      if (ranked.length === 0) { toast.info('Top items are already featured.'); return; }
      for (const p of ranked) {
        // eslint-disable-next-line no-await-in-loop
        await setFeatured(p.id, true);
      }
      toast.success(`Featured the ${ranked.length} most popular product${ranked.length !== 1 ? 's' : ''}.`);
    } finally { setFeaturingPopular(false); }
  }, [live, setFeatured]);

  // Load live products when switching to the Live tab (once).
  useEffect(() => {
    if (tab === 'live' && live.length === 0 && !loadingLive) loadLive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const toggle = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allSelected = products.length > 0 && selected.size === products.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(products.map(p => p.id)));

  const featuredCount = live.filter(p => p.isFeatured).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Flame className="w-6 h-6 text-orange-400" />
          <div>
            <h3 className="text-lg font-black text-white">Hot Products Radar</h3>
            <p className="text-xs text-gray-500">Discover trending best-sellers and feature your most popular live products.</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTab('discover')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${tab === 'discover' ? 'text-white' : 'text-gray-400'}`}
          style={{ background: tab === 'discover' ? '#ea580c' : 'rgba(255,255,255,0.05)' }}
        >
          <Flame className="w-4 h-4" /> Discover
        </button>
        <button
          onClick={() => setTab('live')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${tab === 'live' ? 'text-white' : 'text-gray-400'}`}
          style={{ background: tab === 'live' ? '#ea580c' : 'rgba(255,255,255,0.05)' }}
        >
          <Store className="w-4 h-4" /> Live Store {live.length > 0 && <span className="opacity-70">({live.length})</span>}
        </button>
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
              <p className="text-sm text-gray-400">Run a scan to surface the hottest trending products from your supplier, ranked by demand and growth.</p>
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
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition">
                    <button onClick={() => toggle(p.id)}>{selected.has(p.id) ? <CheckSquare className="w-4 h-4 text-orange-400" /> : <Square className="w-4 h-4 text-gray-600" />}</button>
                    <span className="text-xs text-gray-600 w-5 text-right">{i + 1}</span>
                    <div className="w-11 h-11 rounded-lg overflow-hidden bg-white/5 shrink-0">
                      {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-600"><Sparkles className="w-4 h-4" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white font-semibold truncate">{p.name}</span>
                        {p.isTrending && <span className="px-1.5 py-0.5 rounded text-[9px] font-black text-white shrink-0" style={{ background: '#ef4444' }}>🔥 HOT</span>}
                        {p.isNew && <span className="px-1.5 py-0.5 rounded text-[9px] font-black text-white shrink-0" style={{ background: '#3b82f6' }}>NEW</span>}
                      </div>
                      <p className="text-[11px] text-gray-500 truncate">
                        {p.category} · ${Number(p.cost || 0).toFixed(2)} cost · {p.signals.reviews} reviews
                        {p.signals.rating > 0 && <> · <Star className="w-2.5 h-2.5 inline text-yellow-400 fill-yellow-400" /> {p.signals.rating.toFixed(1)}</>}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-emerald-400 text-[11px] font-bold justify-end"><TrendingUp className="w-3 h-3" /> +{p.signals.estGrowthPct}%</div>
                      <div className="text-[10px] text-gray-600">growth</div>
                    </div>
                    <div className="w-14 text-center shrink-0">
                      <div className="text-lg font-black" style={{ color: scoreColor(p.trendingScore) }}>{p.trendingScore}</div>
                      <div className="text-[9px] text-gray-600 uppercase tracking-wide">score</div>
                    </div>
                    <button onClick={() => runImport({ ids: [p.id] })} disabled={importing} className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white shrink-0" style={{ background: '#ea580c' }}>Add</button>
                  </div>
                ))}
              </div>
            </div>
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
                    <button
                      onClick={() => setFeatured(p.id, !p.isFeatured)}
                      disabled={savingId === p.id}
                      title={p.isFeatured ? 'Remove from Featured' : 'Add to Featured'}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                      style={{
                        background: p.isFeatured ? 'rgba(234,88,12,0.15)' : 'rgba(255,255,255,0.06)',
                        color: p.isFeatured ? '#fb923c' : '#d4d4d8',
                      }}
                    >
                      {savingId === p.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Star className={`w-3.5 h-3.5 ${p.isFeatured ? 'fill-orange-400 text-orange-400' : ''}`} />}
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
