/**
 * ProductCatalogAdmin — the store owner's price desk.
 *
 * Lists every catalog product (active + inactive) and lets the owner:
 *   • edit any single product's cost, per-item supplier SHIPPING cost, and price,
 *     with a per-row Save button;
 *   • see the landed cost (cost + shipping), profit, and margin % per item,
 *     computed live so the true profit-after-shipping is always visible;
 *   • see/set the markup % (derived from cost → price) per row;
 *   • apply a global markup % across all visible products in one click
 *     (price = cost × (1 + markup%)), then Save All;
 *   • filter by supplier to review a single vendor's economics;
 *   • pull LIVE per-item shipping from the supplier (Zendrop) in one click.
 *
 * Saves go to PUT /products/:id which persists back to the product's own KV
 * key (product_ or live_product_). Field names: `price`, `cost_price`, and
 * `shippingCost` (per-item supplier shipping).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, Loader2, Save, Package, Percent, CheckCircle2, Images, Plus, Trash2, Star, X, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface CatalogProduct {
  id: string;
  name: string;
  image: string;
  images: string[];
  price: number;
  cost: number;
  shipping: number;
  supplier: string;
  category: string;
  isActive: boolean;
}

// Draft edits per product id — only what the owner has touched.
interface Draft { price: number; cost: number; shipping: number; images: string[]; }

async function adminToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

const money = (n: number) => (Number.isFinite(n) ? n : 0);
const usd = (n: number) => `$${money(n).toFixed(2)}`;
const markupOf = (price: number, cost: number) =>
  cost > 0 ? Math.round(((price - cost) / cost) * 100) : 0;
const priceFromMarkup = (cost: number, markupPct: number) =>
  Math.round(cost * (1 + markupPct / 100) * 100) / 100;

export default function ProductCatalogAdmin({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [refreshingShip, setRefreshingShip] = useState(false);
  const [query, setQuery] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [globalMarkup, setGlobalMarkup] = useState('');
  const [imagesOpen, setImagesOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/products?limit=500`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `Failed to load products (${res.status})`);
      const mapped: CatalogProduct[] = (data.products || []).map((p: any) => {
        const images: string[] = Array.from(new Set([
          p.primaryImage,
          ...(Array.isArray(p.images) ? p.images : []),
          p.image, p.imageUrl,
        ].filter((u: any): u is string => typeof u === 'string' && u.trim() !== '')));
        return {
          id: p.id,
          name: p.name || p.title || 'Untitled',
          image: images[0] || '',
          images,
          price: money(Number(p.price)),
          cost: money(Number(p.cost_price)),
          shipping: money(Number(p.shippingCost ?? p.shipping_cost ?? 0)),
          supplier: p.vendorName || p.sourceLabel || p.source || 'Unknown supplier',
          category: p.category || 'General',
          isActive: p.isActive !== false,
        };
      });
      mapped.sort((a, b) => a.name.localeCompare(b.name));
      setProducts(mapped);
      setDrafts({});
    } catch (err: any) {
      console.error('[ProductCatalogAdmin] load:', err);
      toast.error(err.message || 'Could not load the catalog.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Pull real-time per-item shipping from the supplier, then reload the catalog.
  const refreshLiveShipping = useCallback(async () => {
    setRefreshingShip(true);
    try {
      const token = await adminToken();
      const res = await fetch(`${SERVER}/shipping-rates/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || publicAnonKey}` },
        body: JSON.stringify({ limit: 500 }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || `Shipping refresh failed (${res.status})`);
      if (data?.noShippingTool) {
        toast.error(data.error || "Supplier didn't expose a live shipping rate — enter shipping manually.", { duration: 8000 });
        return;
      }
      if (!data?.success) throw new Error(data?.error || 'Shipping refresh failed.');
      toast.success(`Pulled live shipping for ${data.updated} item${data.updated !== 1 ? 's' : ''}${data.missing ? ` · ${data.missing} had no rate` : ''}.`);
      await load();
    } catch (err: any) {
      console.error('[ProductCatalogAdmin] refreshLiveShipping:', err);
      toast.error(err.message || 'Could not refresh live shipping.');
    } finally { setRefreshingShip(false); }
  }, [load]);

  // Current (possibly-edited) value for a product.
  const valOf = useCallback((p: CatalogProduct): Draft => drafts[p.id] ?? { price: p.price, cost: p.cost, shipping: p.shipping, images: p.images }, [drafts]);
  const isDirty = useCallback((p: CatalogProduct) => {
    const d = drafts[p.id];
    return !!d && (d.price !== p.price || d.cost !== p.cost || d.shipping !== p.shipping || JSON.stringify(d.images) !== JSON.stringify(p.images));
  }, [drafts]);

  const setDraft = (id: string, patch: Partial<Draft>) => {
    setDrafts(prev => {
      const p = products.find(x => x.id === id);
      const base = prev[id] ?? { price: p?.price ?? 0, cost: p?.cost ?? 0, shipping: p?.shipping ?? 0, images: p?.images ?? [] };
      return { ...prev, [id]: { ...base, ...patch } };
    });
  };

  // Image gallery helpers (operate on the product's draft images list).
  const addImage = (p: CatalogProduct, url: string) => {
    const clean = url.trim();
    if (!clean) return;
    const cur = valOf(p).images;
    if (cur.includes(clean)) { toast('That image is already added.'); return; }
    setDraft(p.id, { images: [...cur, clean] });
  };
  const removeImage = (p: CatalogProduct, i: number) => {
    const cur = valOf(p).images;
    setDraft(p.id, { images: cur.filter((_, idx) => idx !== i) });
  };
  const makePrimary = (p: CatalogProduct, i: number) => {
    const cur = valOf(p).images;
    if (i <= 0) return;
    const next = [cur[i], ...cur.filter((_, idx) => idx !== i)];
    setDraft(p.id, { images: next });
  };

  const suppliers = useMemo(() => Array.from(new Set(products.map(p => p.supplier))).sort(), [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(p => {
      if (supplierFilter && p.supplier !== supplierFilter) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.supplier.toLowerCase().includes(q);
    });
  }, [products, query, supplierFilter]);

  const dirtyCount = useMemo(() => products.filter(isDirty).length, [products, isDirty]);

  // Profit summary across the currently-visible products (using draft values).
  const totals = useMemo(() => {
    let profit = 0, revenue = 0;
    for (const p of filtered) {
      const d = valOf(p);
      profit += d.price - (d.cost + d.shipping);
      revenue += d.price;
    }
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return { profit, revenue, margin, count: filtered.length };
  }, [filtered, valOf]);

  const applyGlobalMarkup = () => {
    const m = Number(globalMarkup);
    if (!Number.isFinite(m)) { toast.error('Enter a markup percentage first.'); return; }
    let applied = 0;
    setDrafts(prev => {
      const next = { ...prev };
      for (const p of filtered) {
        const baseCost = prev[p.id]?.cost ?? p.cost;
        if (baseCost > 0) {
          next[p.id] = { cost: baseCost, shipping: prev[p.id]?.shipping ?? p.shipping, price: priceFromMarkup(baseCost, m), images: prev[p.id]?.images ?? p.images };
          applied += 1;
        }
      }
      return next;
    });
    toast.success(`Applied ${m}% markup to ${applied} product${applied !== 1 ? 's' : ''}. Review, then Save.`);
  };

  const buildBody = (d: Draft) => JSON.stringify({ price: Number(d.price), cost_price: Number(d.cost), shippingCost: Number(d.shipping), images: d.images, primaryImage: d.images[0] || '' });

  const saveOne = async (p: CatalogProduct) => {
    const d = valOf(p);
    if (!(d.price >= 0)) { toast.error('Price must be a positive number.'); return; }
    setSavingId(p.id);
    try {
      const token = await adminToken();
      const res = await fetch(`${SERVER}/products/${encodeURIComponent(p.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || publicAnonKey}` },
        body: buildBody(d),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `Save failed (${res.status})`);
      // Commit locally so the row shows saved values and clears dirty state.
      setProducts(prev => prev.map(x => x.id === p.id ? { ...x, price: Number(d.price), cost: Number(d.cost), shipping: Number(d.shipping), images: d.images, image: d.images[0] || '' } : x));
      setDrafts(prev => { const n = { ...prev }; delete n[p.id]; return n; });
      toast.success(`Saved "${p.name}".`);
    } catch (err: any) {
      console.error('[ProductCatalogAdmin] saveOne:', err);
      toast.error(err.message || 'Could not save this product.');
    } finally { setSavingId(null); }
  };

  const saveAll = async () => {
    const dirty = products.filter(isDirty);
    if (dirty.length === 0) { toast('Nothing to save yet.'); return; }
    setSavingAll(true);
    const token = await adminToken();
    let ok = 0, fail = 0;
    for (const p of dirty) {
      const d = valOf(p);
      try {
        const res = await fetch(`${SERVER}/products/${encodeURIComponent(p.id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || publicAnonKey}` },
          body: buildBody(d),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) throw new Error(data?.error);
        setProducts(prev => prev.map(x => x.id === p.id ? { ...x, price: Number(d.price), cost: Number(d.cost), shipping: Number(d.shipping), images: d.images, image: d.images[0] || '' } : x));
        setDrafts(prev => { const n = { ...prev }; delete n[p.id]; return n; });
        ok += 1;
      } catch { fail += 1; }
    }
    setSavingAll(false);
    if (fail === 0) toast.success(`Saved ${ok} product${ok !== 1 ? 's' : ''}.`);
    else toast.error(`Saved ${ok}, failed ${fail}. Check console/network and retry.`);
  };

  const inputCls = 'w-24 px-2 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c]';

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Package className="w-6 h-6 text-orange-400" />
        <div className="flex-1">
          <h1 className="text-xl font-black text-white">Product Catalog — Pricing</h1>
          <p className="text-xs text-gray-500">Landed cost = cost + supplier shipping. Profit = price − landed cost.</p>
        </div>
        {onNavigate && (
          <button onClick={() => onNavigate('public-store')} className="text-sm text-gray-400 hover:text-white">View store →</button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products or suppliers…"
            className="w-full pl-9 pr-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#ea580c]" />
        </div>
        <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)}
          className="px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-sm focus:outline-none focus:border-[#ea580c] max-w-[180px]">
          <option value="">All suppliers</option>
          {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Percent className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input value={globalMarkup} onChange={e => setGlobalMarkup(e.target.value)} placeholder="Markup %" inputMode="decimal"
              className="w-28 pl-8 pr-2 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#ea580c]" />
          </div>
          <button onClick={applyGlobalMarkup} className="px-3 py-2 rounded-xl text-sm font-bold text-white" style={{ background: 'rgba(234,88,12,0.9)' }}>
            Apply to {query || supplierFilter ? 'results' : 'all'}
          </button>
        </div>
        <button onClick={refreshLiveShipping} disabled={refreshingShip}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
          title="Pull real-time per-item shipping from the supplier">
          {refreshingShip ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4 text-orange-400" />} Live shipping
        </button>
        <button onClick={load} disabled={loading} className="p-2 rounded-xl text-gray-400 hover:text-white" title="Reload">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <button onClick={saveAll} disabled={savingAll || dirtyCount === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{ background: '#ea580c' }}>
          {savingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save all{dirtyCount ? ` (${dirtyCount})` : ''}
        </button>
      </div>

      {/* Profit summary for the current view */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: supplierFilter ? `${supplierFilter} items` : 'Products shown', value: String(totals.count) },
          { label: 'Total revenue (if all sell)', value: usd(totals.revenue) },
          { label: 'Total profit', value: usd(totals.profit), accent: totals.profit >= 0 },
          { label: 'Blended margin', value: `${totals.margin.toFixed(1)}%`, accent: totals.margin >= 0 },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-[11px] uppercase tracking-wide text-gray-500">{s.label}</div>
            <div className={`text-lg font-black ${s.accent === false ? 'text-red-400' : s.accent === true ? 'text-emerald-400' : 'text-white'}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Header row (desktop) */}
      <div className="hidden md:grid grid-cols-[1fr_92px_92px_92px_92px_120px_92px] gap-3 px-3 text-[11px] font-bold uppercase tracking-wide text-gray-500">
        <span>Product</span><span>Cost ($)</span><span>Ship ($)</span><span>Price ($)</span><span>Markup %</span><span>Landed / Profit</span><span className="text-right">Save</span>
      </div>

      {/* Rows */}
      <div className="space-y-2">
        {loading && products.length === 0 ? (
          <div className="py-16 text-center text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading catalog…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-500">No products found.</div>
        ) : filtered.map(p => {
          const d = valOf(p);
          const mk = markupOf(d.price, d.cost);
          const landed = money(d.cost + d.shipping);
          const profit = money(d.price - landed);
          const margin = d.price > 0 ? (profit / d.price) * 100 : 0;
          const dirty = isDirty(p);
          const gallery = d.images;
          const galleryOpen = imagesOpen === p.id;
          return (
            <div key={p.id} className="rounded-2xl overflow-hidden"
              style={{ background: dirty ? 'rgba(234,88,12,0.08)' : 'rgba(255,255,255,0.035)', border: `1px solid ${dirty ? 'rgba(234,88,12,0.35)' : 'rgba(255,255,255,0.08)'}` }}>
            <div className="grid grid-cols-2 md:grid-cols-[1fr_92px_92px_92px_92px_120px_92px] gap-3 items-center p-3">
              {/* Product */}
              <div className="col-span-2 md:col-span-1 flex items-center gap-3 min-w-0">
                <button onClick={() => setImagesOpen(galleryOpen ? null : p.id)}
                  className="relative w-11 h-11 rounded-lg overflow-hidden bg-white/5 shrink-0 group" title="Manage images">
                  {gallery[0] ? <img src={gallery[0]} alt={p.name} className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-gray-600 m-3" />}
                  <span className="absolute inset-0 hidden group-hover:flex items-center justify-center bg-black/50">
                    <Images className="w-4 h-4 text-white" />
                  </span>
                  {gallery.length > 1 && (
                    <span className="absolute bottom-0.5 right-0.5 px-1 rounded text-[9px] font-bold text-white" style={{ background: 'rgba(0,0,0,0.7)' }}>{gallery.length}</span>
                  )}
                </button>
                <div className="min-w-0">
                  <div className="text-sm text-white truncate">{p.name}</div>
                  <div className="text-[11px] text-gray-500 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-gray-400"><Truck className="w-3 h-3 text-orange-400/80" />{p.supplier}</span>
                    <span>· {p.category}{!p.isActive && ' · hidden'}</span>
                    <button onClick={() => setImagesOpen(galleryOpen ? null : p.id)} className="text-orange-400/80 hover:text-orange-400 inline-flex items-center gap-1">
                      <Images className="w-3 h-3" /> {gallery.length}
                    </button>
                  </div>
                </div>
              </div>
              {/* Cost */}
              <label className="flex items-center gap-1 md:block">
                <span className="text-[11px] text-gray-500 md:hidden">Cost</span>
                <input type="number" step="0.01" min="0" value={d.cost}
                  onChange={e => setDraft(p.id, { cost: Number(e.target.value) })} className={inputCls} />
              </label>
              {/* Shipping */}
              <label className="flex items-center gap-1 md:block">
                <span className="text-[11px] text-gray-500 md:hidden">Ship</span>
                <input type="number" step="0.01" min="0" value={d.shipping}
                  onChange={e => setDraft(p.id, { shipping: Number(e.target.value) })} className={inputCls} title="Supplier shipping cost per item" />
              </label>
              {/* Price */}
              <label className="flex items-center gap-1 md:block">
                <span className="text-[11px] text-gray-500 md:hidden">Price</span>
                <input type="number" step="0.01" min="0" value={d.price}
                  onChange={e => setDraft(p.id, { price: Number(e.target.value) })}
                  className={`${inputCls} font-bold`} />
              </label>
              {/* Markup */}
              <label className="flex items-center gap-1 md:block">
                <span className="text-[11px] text-gray-500 md:hidden">Markup %</span>
                <input type="number" step="1" value={mk}
                  onChange={e => setDraft(p.id, { price: priceFromMarkup(d.cost, Number(e.target.value)) })}
                  className={inputCls} disabled={d.cost <= 0} title={d.cost <= 0 ? 'Set a cost to use markup' : ''} />
              </label>
              {/* Landed / Profit (derived, read-only) */}
              <div className="col-span-2 md:col-span-1">
                <div className="text-[11px] text-gray-500 md:hidden uppercase tracking-wide mb-0.5">Landed / Profit</div>
                <div className="text-xs text-gray-400">Landed <span className="text-gray-200 font-semibold">{usd(landed)}</span></div>
                <div className={`text-sm font-black ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {profit >= 0 ? '+' : '−'}{usd(Math.abs(profit))} <span className="text-[11px] font-semibold opacity-80">({margin.toFixed(0)}%)</span>
                </div>
              </div>
              {/* Save */}
              <div className="col-span-2 md:col-span-1 flex md:justify-end">
                <button onClick={() => saveOne(p)} disabled={!dirty || savingId === p.id}
                  className="flex items-center justify-center gap-1.5 w-full md:w-auto px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-40"
                  style={{ background: dirty ? '#ea580c' : 'rgba(255,255,255,0.08)' }}>
                  {savingId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : dirty ? <Save className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  {savingId === p.id ? 'Saving' : dirty ? 'Save' : 'Saved'}
                </button>
              </div>
            </div>

            {/* Image gallery editor */}
            {galleryOpen && (
              <div className="px-3 pb-3 pt-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 flex items-center gap-1.5">
                    <Images className="w-3.5 h-3.5 text-orange-400" /> Product images — first is the main photo
                  </p>
                  <button onClick={() => setImagesOpen(null)} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
                </div>

                {gallery.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {gallery.map((src, i) => (
                      <div key={`${src}-${i}`} className="relative w-20 h-20 rounded-lg overflow-hidden group"
                        style={{ border: i === 0 ? '2px solid #ea580c' : '1px solid rgba(255,255,255,0.12)' }}>
                        <img src={src} alt={`${p.name} ${i + 1}`} className="w-full h-full object-cover" />
                        {i === 0 && <span className="absolute top-0 left-0 px-1 py-0.5 text-[9px] font-black text-white" style={{ background: '#ea580c' }}>MAIN</span>}
                        <div className="absolute inset-0 hidden group-hover:flex items-center justify-center gap-1.5 bg-black/60">
                          {i !== 0 && (
                            <button onClick={() => makePrimary(p, i)} title="Make main image"
                              className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white"><Star className="w-3.5 h-3.5" /></button>
                          )}
                          <button onClick={() => removeImage(p, i)} title="Remove"
                            className="w-7 h-7 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center text-white"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 mb-3">No images yet — paste an image URL below.</p>
                )}

                <form className="flex gap-2" onSubmit={e => {
                  e.preventDefault();
                  const input = e.currentTarget.elements.namedItem('imgurl') as HTMLInputElement;
                  addImage(p, input.value);
                  input.value = '';
                }}>
                  <input name="imgurl" placeholder="Paste image URL (https://…)"
                    className="flex-1 px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#ea580c]" />
                  <button type="submit" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-white" style={{ background: '#ea580c' }}>
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </form>
                <p className="text-[11px] text-gray-500 mt-2">Add as many photos as you like, then hit <b className="text-gray-300">Save</b> on this row. Hover a photo to remove it or set it as the main image.</p>
              </div>
            )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
