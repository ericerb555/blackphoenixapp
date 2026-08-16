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
import { Search, RefreshCw, Loader2, Save, Package, Percent, CheckCircle2, Images, Plus, Trash2, Star, X, Truck, ShieldCheck, ShieldOff, Sparkles, Wand2, AlertTriangle } from 'lucide-react';
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
  /**
   * 'draft'  — imported from a supplier, priced by formula, not on the
   *            storefront yet. Waiting for the owner to set a price.
   * 'live'   — published and for sale.
   *
   * Products that predate staging carry no value; they were already for sale,
   * so they are treated as live.
   */
  storeStatus: 'draft' | 'live';
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

/**
 * Profit guardrail — the store must never sell at a loss. Every saved price has
 * to clear the landed cost (cost + supplier shipping) by at least this margin,
 * so each sale captures a positive profit. Returns an error string or null.
 */
const MIN_PROFIT_MARGIN_PCT = 5; // require the price to beat landed cost by >=5%
const profitError = (d: Draft): string | null => {
  const landed = money(d.cost) + money(d.shipping);
  const price = money(d.price);
  if (landed <= 0) return null; // no known cost yet — nothing to compare against
  const floor = Math.round(landed * (1 + MIN_PROFIT_MARGIN_PCT / 100) * 100) / 100;
  if (price < floor) {
    return `Price $${price.toFixed(2)} is below the minimum profitable price of $${floor.toFixed(2)} (landed cost $${landed.toFixed(2)} + ${MIN_PROFIT_MARGIN_PCT}% margin).`;
  }
  return null;
};

export default function ProductCatalogAdmin({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [refreshingShip, setRefreshingShip] = useState(false);
  const [syncingStore, setSyncingStore] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [query, setQuery] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [globalMarkup, setGlobalMarkup] = useState('');
  const [imagesOpen, setImagesOpen] = useState<string | null>(null);
  const [filterEnabled, setFilterEnabled] = useState(true);
  const [filterBusy, setFilterBusy] = useState(false);
  const [blocked, setBlocked] = useState<any[]>([]);
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [blockedBusyId, setBlockedBusyId] = useState<string | null>(null);

  // Row selection for the AI pricing agent.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // AI pricing modal + its options.
  const [aiOpen, setAiOpen] = useState(false);
  const [aiRunning, setAiRunning] = useState(false);
  const [aiStrategy, setAiStrategy] = useState<'value' | 'competitive' | 'premium'>('competitive');
  const [aiMinMargin, setAiMinMargin] = useState('25');
  const [aiMaxMarkup, setAiMaxMarkup] = useState('400');
  const [aiEstimateShipping, setAiEstimateShipping] = useState(true);

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
          storeStatus: p.storeStatus === 'draft' ? 'draft' : 'live',
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
      if (data.updated === 0) {
        // Queried Zendrop but found no shipping figure — surface what it exposed
        // so we know whether the capability exists at all.
        console.warn('[ProductCatalogAdmin] shipping refresh found nothing. Zendrop tools:', data.availableTools, data);
        toast.error(
          `${data.note || 'Zendrop returned no shipping figure.'}${Array.isArray(data.availableTools) && data.availableTools.length ? ` Tools seen: ${data.availableTools.slice(0, 8).join(', ')}` : ''}`,
          { duration: 10000 },
        );
        return;
      }
      toast.success(`Pulled live shipping for ${data.updated} item${data.updated !== 1 ? 's' : ''}${data.missing ? ` · ${data.missing} had no rate` : ''}.`);
      await load();
    } catch (err: any) {
      console.error('[ProductCatalogAdmin] refreshLiveShipping:', err);
      toast.error(err.message || 'Could not refresh live shipping.');
    } finally { setRefreshingShip(false); }
  }, [load]);

  /**
   * Sync to store — pull the latest catalog from every enabled dropshipper
   * (CJ, etc.) into the live store, then reload the price desk.
   *
   * The importer writes each product one row at a time, so a large batch can
   * exceed Postgres' statement timeout and return 500 *after* some rows have
   * already landed. That is a partial success, not a no-op — so we reload the
   * catalog on failure too and tell the owner to re-run rather than leaving
   * them staring at a stale grid.
   */
  /**
   * Publish staged products to the storefront.
   *
   * Distinct from "Pull from suppliers" below, which brings products IN as
   * drafts. This is the step that puts them on sale, once the owner has set a
   * price — the whole point of staging.
   *
   * Saves any unsaved price edits first. Publishing a product while an edited
   * price is still sitting in the grid would put the OLD price on the
   * storefront, which is the one outcome staging exists to prevent.
   */
  const publishDrafts = useCallback(async (ids?: string[]) => {
    setPublishing(true);
    try {
      if (Object.keys(drafts).length) {
        toast.error('Save your price changes before publishing.');
        return;
      }
      const token = await adminToken();
      const res = await fetch(`${SERVER}/cj/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || publicAnonKey}` },
        body: JSON.stringify(ids?.length ? { ids } : {}),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        toast.error(data?.error || `Publish failed (${res.status})`);
        return;
      }
      await load();
      if (data.skipped) {
        toast.warning(
          `Published ${data.published}. Skipped ${data.skipped} with no price set.`,
          { duration: 8000 },
        );
      } else if (data.published === 0) {
        toast.info('Nothing to publish — no staged products.');
      } else {
        toast.success(`Published ${data.published} product${data.published === 1 ? '' : 's'} to the store.`);
      }
    } catch (err: any) {
      console.error('[ProductCatalogAdmin] publishDrafts:', err);
      toast.error(err.message || 'Could not publish to the store.');
    } finally {
      setPublishing(false);
    }
  }, [drafts, load]);

  const syncToStore = useCallback(async () => {
    setSyncingStore(true);
    try {
      const token = await adminToken();
      const res = await fetch(`${SERVER}/dropshipper/sync-inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || publicAnonKey}` },
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        const msg = data?.error || data?.errors?.join(', ') || `Sync failed (${res.status})`;
        await load();
        // A timeout means rows were still being written when Postgres cut it off.
        if (/timeout/i.test(msg)) {
          toast.error('Supplier sync timed out part-way through. Some products were imported — run it again to pull the rest.', { duration: 9000 });
        } else {
          toast.error(msg);
        }
        return;
      }

      await load();
      toast.success(`Synced ${data.synced ?? 0} product${data.synced === 1 ? '' : 's'} to the store.`);
    } catch (err: any) {
      console.error('[ProductCatalogAdmin] syncToStore:', err);
      await load();
      toast.error(err.message || 'Could not sync products to the store.');
    } finally {
      setSyncingStore(false);
    }
  }, [load]);

  // ── Adult-content filter controls ──────────────────────────────────────────
  const loadFilter = useCallback(async () => {
    try {
      const token = await adminToken();
      const headers = { Authorization: `Bearer ${token || publicAnonKey}` };
      const [cfgRes, blkRes] = await Promise.all([
        fetch(`${SERVER}/content-filter/config`, { headers }),
        fetch(`${SERVER}/content-filter/blocked`, { headers }),
      ]);
      const cfg = await cfgRes.json().catch(() => null);
      const blk = await blkRes.json().catch(() => null);
      if (cfg?.success) setFilterEnabled(cfg.enabled !== false);
      if (blk?.success) setBlocked(Array.isArray(blk.blocked) ? blk.blocked : []);
    } catch (err) {
      console.error('[ProductCatalogAdmin] loadFilter:', err);
    }
  }, []);

  useEffect(() => { loadFilter(); }, [loadFilter]);

  const toggleFilter = useCallback(async () => {
    setFilterBusy(true);
    try {
      const token = await adminToken();
      const next = !filterEnabled;
      const res = await fetch(`${SERVER}/content-filter/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || publicAnonKey}` },
        body: JSON.stringify({ enabled: next }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `Could not update filter (${res.status})`);
      setFilterEnabled(data.enabled !== false);
      toast.success(`Adult-product filter turned ${data.enabled !== false ? 'ON' : 'OFF'}.`);
    } catch (err: any) {
      console.error('[ProductCatalogAdmin] toggleFilter:', err);
      toast.error(err.message || 'Could not update the filter.');
    } finally { setFilterBusy(false); }
  }, [filterEnabled]);

  const allowBlocked = useCallback(async (id: string) => {
    setBlockedBusyId(id);
    try {
      const token = await adminToken();
      const res = await fetch(`${SERVER}/content-filter/blocked/${encodeURIComponent(id)}/allow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token || publicAnonKey}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `Could not move product (${res.status})`);
      setBlocked(prev => prev.filter(b => String(b.id) !== String(id)));
      toast.success('Moved into the store.');
      await load();
    } catch (err: any) {
      console.error('[ProductCatalogAdmin] allowBlocked:', err);
      toast.error(err.message || 'Could not move the product.');
    } finally { setBlockedBusyId(null); }
  }, [load]);

  const dismissBlocked = useCallback(async (id: string) => {
    setBlockedBusyId(id);
    try {
      const token = await adminToken();
      const res = await fetch(`${SERVER}/content-filter/blocked/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token || publicAnonKey}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `Could not dismiss product (${res.status})`);
      setBlocked(prev => prev.filter(b => String(b.id) !== String(id)));
      toast.success('Dismissed.');
    } catch (err: any) {
      console.error('[ProductCatalogAdmin] dismissBlocked:', err);
      toast.error(err.message || 'Could not dismiss the product.');
    } finally { setBlockedBusyId(null); }
  }, []);

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
    const profitErr = profitError(d);
    if (profitErr) { toast.error(profitErr); return; }
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
    // Block the whole batch if any row would sell at a loss — safer than silently
    // skipping, so the owner sees exactly which products need a higher price.
    const unprofitable = dirty.filter(p => profitError(valOf(p)));
    if (unprofitable.length > 0) {
      const names = unprofitable.slice(0, 3).map(p => `"${p.name}"`).join(', ');
      toast.error(`${unprofitable.length} product${unprofitable.length !== 1 ? 's' : ''} priced at or below cost (${names}${unprofitable.length > 3 ? '…' : ''}). Raise the price to keep a positive profit before saving.`);
      return;
    }
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

  // ── AI pricing: selection + run ─────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const visibleIds = useMemo(() => filtered.map(p => p.id), [filtered]);
  const selectedCount = useMemo(() => visibleIds.filter(id => selected.has(id)).length, [visibleIds, selected]);
  // Counted across the whole catalog, not just what the current filter shows —
  // it answers "how much is waiting to go on sale", which a filter shouldn't change.
  const draftCount = useMemo(() => products.filter(p => p.storeStatus === 'draft').length, [products]);
  const allSelected = visibleIds.length > 0 && selectedCount === visibleIds.length;
  const toggleSelectAll = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) { for (const id of visibleIds) next.delete(id); }
      else { for (const id of visibleIds) next.add(id); }
      return next;
    });
  };

  const runAiPricing = async () => {
    // Target the selected visible rows, or all visible rows when none are ticked.
    const targets = selectedCount > 0 ? filtered.filter(p => selected.has(p.id)) : filtered;
    const items = targets
      .map(p => { const d = valOf(p); return { id: p.id, name: p.name, category: p.category, cost: d.cost, shipping: d.shipping, currentPrice: d.price }; })
      .filter(i => i.cost > 0);
    if (items.length === 0) { toast.error('No priceable items (each needs a cost greater than $0).'); return; }

    setAiRunning(true);
    try {
      const token = await adminToken();
      const res = await fetch(`${SERVER}/store-ai-pricing/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || publicAnonKey}` },
        body: JSON.stringify({
          items,
          strategy: aiStrategy,
          minMarginPct: Number(aiMinMargin) || 0,
          maxMarkupPct: Number(aiMaxMarkup) || 400,
          estimateShipping: aiEstimateShipping,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `AI pricing failed (${res.status})`);
      const suggestions: any[] = Array.isArray(data.suggestions) ? data.suggestions : [];
      if (suggestions.length === 0) { toast('The AI returned no suggestions to apply.'); return; }
      // Write suggestions into the row drafts so the owner can review before saving.
      setDrafts(prev => {
        const next = { ...prev };
        for (const s of suggestions) {
          const p = products.find(x => x.id === s.id);
          if (!p) continue;
          const base = next[s.id] ?? { price: p.price, cost: p.cost, shipping: p.shipping, images: p.images };
          next[s.id] = {
            ...base,
            price: Number(s.suggestedPrice) || base.price,
            shipping: aiEstimateShipping && Number.isFinite(Number(s.suggestedShipping)) ? Number(s.suggestedShipping) : base.shipping,
          };
        }
        return next;
      });
      setAiOpen(false);
      toast.success(`AI priced ${suggestions.length} item${suggestions.length !== 1 ? 's' : ''}. Review the highlighted rows, then Save.`);
    } catch (err: any) {
      console.error('[ProductCatalogAdmin] runAiPricing:', err);
      toast.error(err.message || 'Could not generate AI prices.');
    } finally { setAiRunning(false); }
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
        <button onClick={() => setAiOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#ea580c)' }}
          title="Let AI suggest market prices (and estimate shipping) for the selected or visible items">
          <Sparkles className="w-4 h-4" /> AI price{selectedCount > 0 ? ` (${selectedCount})` : ''}
        </button>
        <button onClick={syncToStore} disabled={syncingStore}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
          title="Pull the latest products from every connected supplier. They arrive staged — price them here, then publish.">
          {syncingStore ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4 text-orange-400" />} Pull from suppliers
        </button>
        {/* Publishing is the deliberate step staging exists to create, so it is
            styled as the primary action and states how many are waiting. */}
        <button onClick={() => publishDrafts(selectedCount > 0 ? Array.from(selected) : undefined)}
          disabled={publishing || (draftCount === 0 && selectedCount === 0)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
          style={{ background: draftCount > 0 ? 'rgba(22,163,74,0.9)' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
          title="Put staged products on the storefront at the prices shown here">
          {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
          {selectedCount > 0 ? `Publish ${selectedCount} selected` : `Publish to store${draftCount ? ` (${draftCount})` : ''}`}
        </button>
        <button onClick={refreshLiveShipping} disabled={refreshingShip}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
          title="Pull real-time per-item shipping from the supplier">
          {refreshingShip ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4 text-orange-400" />} Live shipping
        </button>
        <button onClick={toggleFilter} disabled={filterBusy}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold disabled:opacity-40"
          style={filterEnabled
            ? { background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(16,185,129,0.4)', color: '#34d399' }
            : { background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }}
          title="Block adult / sexual-wellness products from auto-posting to your store">
          {filterBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : filterEnabled ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
          Adult filter: {filterEnabled ? 'On' : 'Off'}
        </button>
        <button onClick={() => setBlockedOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
          title="Review products the filter blocked">
          Blocked ({blocked.length})
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
      <div className="hidden md:grid grid-cols-[28px_1fr_92px_92px_92px_92px_120px_92px] gap-3 px-3 text-[11px] font-bold uppercase tracking-wide text-gray-500">
        <span className="flex items-center">
          <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
            className="w-4 h-4 accent-orange-500 cursor-pointer" title="Select all visible" />
        </span>
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
          const belowFloor = !!profitError(d);
          const dirty = isDirty(p);
          const gallery = d.images;
          const galleryOpen = imagesOpen === p.id;
          return (
            <div key={p.id} className="rounded-2xl overflow-hidden"
              style={{ background: dirty ? 'rgba(234,88,12,0.08)' : 'rgba(255,255,255,0.035)', border: `1px solid ${dirty ? 'rgba(234,88,12,0.35)' : 'rgba(255,255,255,0.08)'}` }}>
            <div className="grid grid-cols-2 md:grid-cols-[28px_1fr_92px_92px_92px_92px_120px_92px] gap-3 items-center p-3">
              {/* Select */}
              <div className="hidden md:flex items-center">
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)}
                  className="w-4 h-4 accent-orange-500 cursor-pointer" title="Select for AI pricing" />
              </div>
              {/* Product */}
              <div className="col-span-2 md:col-span-1 flex items-center gap-3 min-w-0">
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)}
                  className="w-4 h-4 accent-orange-500 cursor-pointer md:hidden shrink-0" title="Select for AI pricing" />
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
                  <div className="text-sm text-white truncate flex items-center gap-2">
                    <span className="truncate">{p.name}</span>
                    {/* Only staged products are badged. Live is the norm, and
                        badging every row would bury the few that need action. */}
                    {p.storeStatus === 'draft' && (
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(234,179,8,0.15)', color: '#facc15', border: '1px solid rgba(234,179,8,0.35)' }}
                        title="Staged — not on the storefront yet. Set a price, then publish.">
                        Staged
                      </span>
                    )}
                  </div>
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
                <div className={`text-sm font-black ${belowFloor ? 'text-red-400' : profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {profit >= 0 ? '+' : '−'}{usd(Math.abs(profit))} <span className="text-[11px] font-semibold opacity-80">({margin.toFixed(0)}%)</span>
                </div>
                {belowFloor && (
                  <div className="text-[10px] font-bold text-red-400 flex items-center gap-1 mt-0.5">
                    <AlertTriangle className="w-3 h-3" /> Below min profit
                  </div>
                )}
              </div>
              {/* Save */}
              <div className="col-span-2 md:col-span-1 flex md:justify-end">
                <button onClick={() => saveOne(p)} disabled={!dirty || savingId === p.id || belowFloor}
                  title={belowFloor ? 'Raise the price above the landed cost to keep a positive profit before saving.' : ''}
                  className="flex items-center justify-center gap-1.5 w-full md:w-auto px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-40"
                  style={{ background: dirty && !belowFloor ? '#ea580c' : 'rgba(255,255,255,0.08)' }}>
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

      {/* AI pricing modal */}
      {aiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => !aiRunning && setAiOpen(false)}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.12)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7c3aed,#ea580c)' }}>
                <Wand2 className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-white font-black">AI pricing agent</h2>
                <p className="text-[11px] text-gray-500">
                  {selectedCount > 0 ? `${selectedCount} selected item${selectedCount !== 1 ? 's' : ''}` : `All ${filtered.length} visible item${filtered.length !== 1 ? 's' : ''}`} · items with $0 cost are skipped
                </p>
              </div>
              <button onClick={() => !aiRunning && setAiOpen(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-4 space-y-4">
              {/* Strategy */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Pricing strategy</label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {([
                    { k: 'value', t: 'Value', d: 'Lowest' },
                    { k: 'competitive', t: 'Competitive', d: 'Market' },
                    { k: 'premium', t: 'Premium', d: 'Higher' },
                  ] as const).map(o => (
                    <button key={o.k} onClick={() => setAiStrategy(o.k)}
                      className="rounded-xl px-2 py-2 text-center transition-colors"
                      style={{
                        background: aiStrategy === o.k ? 'rgba(234,88,12,0.15)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${aiStrategy === o.k ? '#ea580c' : 'rgba(255,255,255,0.08)'}`,
                      }}>
                      <div className={`text-sm font-bold ${aiStrategy === o.k ? 'text-orange-400' : 'text-white'}`}>{o.t}</div>
                      <div className="text-[10px] text-gray-500">{o.d}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Guardrails */}
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Min margin %</span>
                  <input type="number" value={aiMinMargin} onChange={e => setAiMinMargin(e.target.value)} min="0"
                    className="w-full mt-1.5 px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-sm focus:outline-none focus:border-[#ea580c]" />
                  <span className="text-[10px] text-gray-500">Never price below this profit.</span>
                </label>
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Max markup %</span>
                  <input type="number" value={aiMaxMarkup} onChange={e => setAiMaxMarkup(e.target.value)} min="0"
                    className="w-full mt-1.5 px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-sm focus:outline-none focus:border-[#ea580c]" />
                  <span className="text-[10px] text-gray-500">Never price above this.</span>
                </label>
              </div>

              {/* Shipping estimate toggle */}
              <button onClick={() => setAiEstimateShipping(v => !v)}
                className="w-full flex items-center gap-3 rounded-xl p-3 text-left"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="w-9 h-5 rounded-full relative transition-colors shrink-0" style={{ background: aiEstimateShipping ? '#ea580c' : 'rgba(255,255,255,0.15)' }}>
                  <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: aiEstimateShipping ? '18px' : '2px' }} />
                </div>
                <div className="flex-1">
                  <div className="text-sm text-white font-bold flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-orange-400" /> Also estimate shipping cost</div>
                  <div className="text-[11px] text-gray-500">Fills in a realistic per-item shipping cost where the supplier gave none.</div>
                </div>
              </button>

              <p className="text-[11px] text-gray-500">Suggestions are written into the rows for you to review — nothing is charged or published until you hit <b className="text-gray-300">Save</b>.</p>
            </div>

            <div className="flex gap-2 p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <button onClick={() => setAiOpen(false)} disabled={aiRunning}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-300 disabled:opacity-40" style={{ background: 'rgba(255,255,255,0.06)' }}>
                Cancel
              </button>
              <button onClick={runAiPricing} disabled={aiRunning}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#ea580c)' }}>
                {aiRunning ? <><Loader2 className="w-4 h-4 animate-spin" /> Pricing…</> : <><Sparkles className="w-4 h-4" /> Generate prices</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blocked products review */}
      {blockedOpen && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4" onClick={() => setBlockedOpen(false)}>
          <div className="w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl max-h-[85dvh] flex flex-col overflow-hidden" style={{ background: '#0f0f0f', border: '1px solid rgba(255,255,255,0.1)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Blocked products ({blocked.length})</h3>
              </div>
              <button onClick={() => setBlockedOpen(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 overflow-y-auto overscroll-contain space-y-2">
              {blocked.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">Nothing has been blocked. Adult / sexual-wellness products the filter catches will appear here for review.</p>
              ) : blocked.map((b) => (
                <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <img src={b.primaryImage || (Array.isArray(b.images) ? b.images[0] : '') || ''} alt={b.name || 'Blocked product'}
                    className="w-14 h-14 rounded-lg object-cover flex-shrink-0 bg-black/30" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white truncate">{b.name || 'Untitled'}</p>
                    <p className="text-xs text-gray-500 truncate">{b.category || 'General'} · {b.source || 'unknown'}{b.price != null ? ` · $${Number(b.price).toFixed(2)}` : ''}</p>
                  </div>
                  <button onClick={() => allowBlocked(String(b.id))} disabled={blockedBusyId === String(b.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-40 flex-shrink-0"
                    style={{ background: 'rgba(16,185,129,0.9)' }} title="Move into store">
                    {blockedBusyId === String(b.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Move to store
                  </button>
                  <button onClick={() => dismissBlocked(String(b.id))} disabled={blockedBusyId === String(b.id)}
                    className="p-2 rounded-lg text-gray-500 hover:text-red-400 disabled:opacity-40 flex-shrink-0" title="Dismiss permanently">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
