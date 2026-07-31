/**
 * ProductPagePilot — PagePilot-style AI campaign/advertorial page builder.
 *
 * The store has a FIXED number of campaign slots. Each slot holds one AI-generated
 * advertorial landing page featuring a capped number of products, so every page is
 * a tight funnel. Operators generate a page from selected store products, edit the
 * copy, assign it to an open slot, and publish it to the storefront.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Sparkles, Loader2, Plus, Trash2, Eye, ExternalLink, LayoutGrid, Wand2,
  CheckCircle2, XCircle, Save, ArrowLeft, ShoppingBag, RefreshCw,
} from 'lucide-react';
import { publicAnonKey, projectId } from '../utils/supabase/info';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import CampaignPage, { type Campaign } from './CampaignPage';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface StoreProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  category?: string;
  rating?: number;
  reviews?: number;
  badge?: string;
}

const authHeaders = { Authorization: `Bearer ${publicAnonKey}`, apikey: publicAnonKey, 'Content-Type': 'application/json' };

export default function ProductPagePilot() {
  const [config, setConfig] = useState({ maxSlots: 6, maxProducts: 4 });
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Builder state
  const [selected, setSelected] = useState<Record<string, StoreProduct>>({});
  const [title, setTitle] = useState('');
  const [angle, setAngle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [accent, setAccent] = useState('#ea580c');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  const [preview, setPreview] = useState<Campaign | null>(null);
  const [busyId, setBusyId] = useState('');

  const selectedList = useMemo(() => Object.values(selected), [selected]);
  const atCap = selectedList.length >= config.maxProducts;

  async function loadAll() {
    setLoading(true);
    try {
      const [cfgRes, prodRes, listRes, slotRes] = await Promise.all([
        fetch(`${SERVER}/page-pilot/config`, { headers: authHeaders }),
        fetch(`${SERVER}/products?isActive=true&limit=100`, { headers: authHeaders }),
        fetch(`${SERVER}/page-pilot/list`, { headers: authHeaders }),
        fetch(`${SERVER}/page-pilot/slots`, { headers: authHeaders }),
      ]);
      if (cfgRes.ok) setConfig(await cfgRes.json());
      if (prodRes.ok) {
        const d = await prodRes.json();
        const items = (d.products || d.inventory || []).map((p: any) => ({
          id: p.id || p.sku,
          name: p.name || p.title,
          description: p.description || '',
          price: Number(p.price) || Number(p.retailPrice) || 0,
          originalPrice: p.originalPrice || p.compare_at_price || p.msrp || undefined,
          image: p.primaryImage || p.images?.[0] || p.image || p.imageUrl || '',
          images: Array.isArray(p.images) ? p.images : undefined,
          category: p.category || 'General',
          rating: p.rating || undefined,
          reviews: p.reviews || p.reviewCount || undefined,
          badge: p.badge || undefined,
        })).filter((p: StoreProduct) => p.id && p.name);
        setProducts(items);
      }
      if (listRes.ok) setCampaigns((await listRes.json()).campaigns || []);
      if (slotRes.ok) setSlots((await slotRes.json()).slots || []);
    } catch (err) {
      console.error('[ProductPagePilot] load failed:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  // Auto-fill seed — other tools (e.g. Auto-Product Pilot) can drop a product into
  // localStorage and navigate here to spin up a campaign in one click.
  useEffect(() => {
    try {
      const raw = localStorage.getItem('pagePilotSeed');
      if (!raw) return;
      localStorage.removeItem('pagePilotSeed');
      const seed = JSON.parse(raw);
      const items = (Array.isArray(seed) ? seed : [seed]).slice(0, config.maxProducts);
      const map: Record<string, StoreProduct> = {};
      items.forEach((p: any) => {
        const id = String(p.id ?? p.sku ?? '');
        if (!id) return;
        map[id] = {
          id,
          name: p.name || p.title || 'Product',
          description: p.description || '',
          price: Number(p.price) || Number(p.retailPrice) || 0,
          originalPrice: p.originalPrice || p.compare_at_price || p.msrp || undefined,
          image: p.image || p.primaryImage || p.images?.[0] || p.imageUrl || '',
          images: Array.isArray(p.images) ? p.images : undefined,
          category: p.category || 'General',
          rating: p.rating || undefined,
          reviews: p.reviews || p.reviewCount || undefined,
          badge: p.badge || undefined,
        };
      });
      if (Object.keys(map).length) {
        setSelected(map);
        setTitle(items[0]?.name ? String(items[0].name) : '');
        setGenError('Product loaded from Auto-Product Pilot — review and generate your page.');
      }
    } catch (_) { /* ignore malformed seed */ }
  }, [config.maxProducts]);

  function toggleProduct(p: StoreProduct) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[p.id]) { delete next[p.id]; return next; }
      if (Object.keys(next).length >= config.maxProducts) return prev;
      next[p.id] = p;
      return next;
    });
  }

  async function generate() {
    setGenError('');
    if (!selectedList.length) { setGenError('Select at least one product.'); return; }
    setGenerating(true);
    try {
      const res = await fetch(`${SERVER}/page-pilot/generate`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ title, angle, sourceUrl, accent, products: selectedList }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setSelected({}); setTitle(''); setAngle(''); setSourceUrl('');
      await loadAll();
      setPreview(data.campaign);
    } catch (err: any) {
      setGenError(err?.message || 'Failed to generate the page.');
    } finally {
      setGenerating(false);
    }
  }

  async function updateCampaign(id: string, patch: any) {
    setBusyId(id);
    try {
      const res = await fetch(`${SERVER}/page-pilot/${id}`, {
        method: 'PUT', headers: authHeaders, body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Update failed'); return; }
      await loadAll();
    } catch (err: any) {
      alert(err?.message || 'Update failed');
    } finally {
      setBusyId('');
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this campaign page? This frees its slot.')) return;
    setBusyId(id);
    try {
      await fetch(`${SERVER}/page-pilot/${id}`, { method: 'DELETE', headers: authHeaders });
      await loadAll();
    } finally { setBusyId(''); }
  }

  const openSlots = slots.filter((s) => !s.campaign).map((s) => s.slot);

  // Performance signal: click-through rate = CTA clicks / page views.
  const ctr = (c: any) => ((c.views || 0) > 0 ? (c.clicks || 0) / c.views : 0);
  const published = campaigns.filter((c: any) => c.status === 'published');
  const slotsFull = openSlots.length === 0 && campaigns.some((c: any) => c.slot);
  // When every slot is taken, flag the weakest published page to retire. Rank by
  // attributed revenue first (what actually matters), then CTR as a tie-breaker.
  // Needs a few views before we judge it, so brand-new pages aren't punished.
  const worst = slotsFull
    ? [...published]
        .filter((c: any) => (c.views || 0) >= 5)
        .sort((a: any, b: any) => (a.revenue || 0) - (b.revenue || 0) || ctr(a) - ctr(b) || (a.clicks || 0) - (b.clicks || 0))[0] || null
    : null;
  const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;

  // ── Live preview overlay ──────────────────────────────────────────────
  if (preview) {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-[#141414] border-b border-[#2A2A2A]">
          <button onClick={() => setPreview(null)} className="flex items-center gap-2 text-white/80 hover:text-white text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Page Pilot
          </button>
          <span className="text-xs text-white/50">Live preview — {preview.title}</span>
        </div>
        <CampaignPage previewCampaign={preview} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 md:p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ea580c] to-[#dc2626] flex items-center justify-center">
                <Wand2 className="w-5 h-5" />
              </div>
              <h1 className="text-2xl font-bold">Product Page Pilot</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#ea580c]/20 text-[#fb923c] font-semibold">AI</span>
            </div>
            <p className="text-white/60 text-sm max-w-2xl">
              Generate high-converting advertorial landing pages from your store products. The store has{' '}
              <strong className="text-white">{config.maxSlots} campaign slots</strong>, each featuring up to{' '}
              <strong className="text-white">{config.maxProducts} products</strong> — keep them fresh by retiring the weakest.
            </p>
          </div>
          <button onClick={loadAll} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#2A2A2A] text-sm hover:bg-[#222]">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Slot map */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3 text-sm text-white/70"><LayoutGrid className="w-4 h-4" /> Store slots</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {slots.map((s) => (
              <div key={s.slot} className={`rounded-xl border p-3 text-center ${s.campaign ? 'border-[#ea580c]/40 bg-[#ea580c]/5' : 'border-dashed border-[#2A2A2A] bg-[#0F0F0F]'}`}>
                <div className="text-xs text-white/40 mb-1">Slot {s.slot}</div>
                {s.campaign ? (
                  <>
                    <div className="text-sm font-medium truncate">{s.campaign.title}</div>
                    <div className={`text-[10px] mt-1 ${s.campaign.status === 'published' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {s.campaign.status === 'published' ? 'Published' : 'Draft'}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-white/30">Open</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Builder */}
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#141414] p-5 mb-10">
          <div className="flex items-center gap-2 mb-4"><Sparkles className="w-4 h-4 text-[#fb923c]" /><h2 className="font-semibold">Build a new campaign page</h2></div>

          <div className="grid md:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs text-white/50 mb-1">Campaign name (optional)</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Summer Deck Refresh"
                className="w-full px-3 py-2 rounded-lg bg-[#0F0F0F] border border-[#2A2A2A] text-sm focus:border-[#ea580c] outline-none" />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Angle / hook (optional)</label>
              <input value={angle} onChange={(e) => setAngle(e.target.value)} placeholder="e.g. The upgrade every homeowner regrets not buying sooner"
                className="w-full px-3 py-2 rounded-lg bg-[#0F0F0F] border border-[#2A2A2A] text-sm focus:border-[#ea580c] outline-none" />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Inspiration URL (optional)</label>
              <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…"
                className="w-full px-3 py-2 rounded-lg bg-[#0F0F0F] border border-[#2A2A2A] text-sm focus:border-[#ea580c] outline-none" />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1">Accent color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="w-10 h-9 rounded bg-transparent border border-[#2A2A2A]" />
                <span className="text-sm text-white/60">{accent}</span>
              </div>
            </div>
          </div>

          {/* Product picker */}
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-white/50">Pick products ({selectedList.length}/{config.maxProducts})</label>
            {atCap && <span className="text-[10px] text-amber-400">Max reached — deselect one to swap</span>}
          </div>
          {loading ? (
            <div className="py-8 text-center text-white/40"><Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading products…</div>
          ) : products.length === 0 ? (
            <p className="text-sm text-white/40 py-4">No active store products found. Add products in the store first.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 max-h-72 overflow-y-auto pr-1">
              {products.map((p) => {
                const on = !!selected[p.id];
                const disabled = !on && atCap;
                return (
                  <button key={p.id} onClick={() => toggleProduct(p)} disabled={disabled}
                    className={`text-left rounded-xl border overflow-hidden transition ${on ? 'border-[#ea580c] ring-1 ring-[#ea580c]' : 'border-[#2A2A2A] hover:border-[#444]'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
                    <div className="relative aspect-square bg-[#0F0F0F]">
                      <ImageWithFallback src={p.image} alt={p.name} className="w-full h-full object-cover" />
                      {on && <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#ea580c] flex items-center justify-center"><CheckCircle2 className="w-3.5 h-3.5" /></span>}
                    </div>
                    <div className="p-2">
                      <div className="text-xs font-medium truncate">{p.name}</div>
                      <div className="text-[11px] text-white/50">${p.price}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {genError && <p className="text-sm text-red-400 mt-3">{genError}</p>}

          <button onClick={generate} disabled={generating || !selectedList.length}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#ea580c] to-[#dc2626] font-semibold disabled:opacity-50">
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</> : <><Sparkles className="w-4 h-4" /> Generate page with AI</>}
          </button>
        </div>

        {/* All-slots-full nudge with lowest performer */}
        {slotsFull && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 mb-5 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <LayoutGrid className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-sm">
              <p className="font-medium text-amber-200">All {config.maxSlots} slots are full.</p>
              {worst ? (
                <p className="text-amber-200/80 mt-0.5">
                  Lowest performer: <strong className="text-white">{worst.title}</strong> — {money(worst.revenue)} revenue
                  ({worst.orders || 0} orders · {(ctr(worst) * 100).toFixed(1)}% CTR). Retire it to free Slot {worst.slot} for a fresh campaign.
                </p>
              ) : (
                <p className="text-amber-200/80 mt-0.5">Give your pages a few views, then retire the weakest to make room for new campaigns.</p>
              )}
            </div>
          </div>
        )}

        {/* Existing campaigns */}
        <h2 className="font-semibold mb-4">Your campaign pages ({campaigns.length})</h2>
        {campaigns.length === 0 ? (
          <p className="text-sm text-white/40">No campaign pages yet — build one above.</p>
        ) : (
          <div className="space-y-3">
            {campaigns.map((cp: any) => {
              const publicUrl = `campaign?slug=${encodeURIComponent(cp.slug)}`;
              return (
                <div key={cp.id} className={`rounded-xl border bg-[#141414] p-4 flex flex-wrap items-center gap-4 ${worst && worst.id === cp.id ? 'border-amber-500/50 ring-1 ring-amber-500/30' : 'border-[#2A2A2A]'}`}>
                  <div className="flex -space-x-2">
                    {(cp.products || []).slice(0, 3).map((p: any) => (
                      <div key={p.id} className="w-11 h-11 rounded-lg overflow-hidden border-2 border-[#141414] bg-[#0F0F0F]">
                        <ImageWithFallback src={p.image} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{cp.title}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${cp.status === 'published' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                        {cp.status}
                      </span>
                      {cp.slot && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70">Slot {cp.slot}</span>}
                    </div>
                    <div className="text-xs text-white/40 mt-0.5">
                      {(cp.products || []).length} products · {cp.views || 0} views · {cp.clicks || 0} clicks · {((ctr(cp)) * 100).toFixed(1)}% CTR
                      · <span className="text-emerald-400/80">{cp.orders || 0} orders · {money(cp.revenue)}</span>
                      {worst && worst.id === cp.id && <span className="text-amber-400 font-medium"> · retire candidate</span>}
                    </div>
                  </div>

                  {/* Slot assignment */}
                  <select value={cp.slot ?? ''} disabled={busyId === cp.id}
                    onChange={(e) => updateCampaign(cp.id, { slot: e.target.value === '' ? null : Number(e.target.value) })}
                    className="px-2 py-1.5 rounded-lg bg-[#0F0F0F] border border-[#2A2A2A] text-sm">
                    <option value="">No slot</option>
                    {Array.from({ length: config.maxSlots }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n} disabled={!openSlots.includes(n) && cp.slot !== n}>
                        Slot {n}{!openSlots.includes(n) && cp.slot !== n ? ' (taken)' : ''}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2">
                    <button title="Preview" onClick={() => setPreview(cp)} className="p-2 rounded-lg bg-[#1a1a1a] border border-[#2A2A2A] hover:bg-[#222]"><Eye className="w-4 h-4" /></button>
                    <button title="Open public page" onClick={() => (window as any).__navigateApp?.(publicUrl)} className="p-2 rounded-lg bg-[#1a1a1a] border border-[#2A2A2A] hover:bg-[#222]"><ExternalLink className="w-4 h-4" /></button>
                    {cp.status === 'published' ? (
                      <button onClick={() => updateCampaign(cp.id, { status: 'draft' })} disabled={busyId === cp.id}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#2A2A2A] text-sm hover:bg-[#222]">
                        <XCircle className="w-4 h-4" /> Unpublish
                      </button>
                    ) : (
                      <button onClick={() => updateCampaign(cp.id, { status: 'published' })} disabled={busyId === cp.id}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-sm font-medium disabled:opacity-50">
                        {busyId === cp.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />} Publish
                      </button>
                    )}
                    <button title="Delete" onClick={() => remove(cp.id)} disabled={busyId === cp.id} className="p-2 rounded-lg bg-[#1a1a1a] border border-[#2A2A2A] hover:bg-red-500/10 hover:border-red-500/40"><Trash2 className="w-4 h-4 text-red-400" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
