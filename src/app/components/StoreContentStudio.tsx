/**
 * StoreContentStudio — the Content Center ⇄ Store bridge.
 *
 * Two tabs:
 *  - Product Posts: pick live store products, auto-compose a post, and push it
 *    OUT to email (via the Email Center) or save it as a social post record.
 *  - Store Reels: add/manage short product videos that play on the storefront
 *    "Watch & Shop" rail (content -> store).
 */
import { useCallback, useEffect, useState } from 'react';
import {
  ShoppingBag, Film, Plus, Trash2, Loader2, RefreshCw, Send, Save, Copy,
  CheckSquare, Square, Video, Link2, Eye, EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';
import { consumeContentProduct } from '../lib/contentHandoff';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface LiveProduct {
  id: string;
  name: string;
  image: string;
  price: number;
  category: string;
  description?: string;
}

interface Reel {
  id: string;
  title: string;
  videoUrl: string;
  posterUrl?: string;
  productId?: string | null;
  productName?: string;
  ctaText?: string;
  active?: boolean;
}

type Tab = 'posts' | 'reels';

async function adminToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export default function StoreContentStudio() {
  const [tab, setTab] = useState<Tab>('posts');
  const [products, setProducts] = useState<LiveProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [handoffId, setHandoffId] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      // Load BOTH catalogs so posts/reels can feature physical AND digital
      // products. Physical prices are dollars; digital (/marketplace) are cents.
      const [physRes, digiRes] = await Promise.allSettled([
        fetch(`${SERVER}/products?isActive=true&limit=200`, { headers: { Authorization: `Bearer ${publicAnonKey}` } }),
        fetch(`${SERVER}/marketplace/products`, { headers: { Authorization: `Bearer ${publicAnonKey}` } }),
      ]);
      const merged: LiveProduct[] = [];
      if (physRes.status === 'fulfilled' && physRes.value.ok) {
        const data = await physRes.value.json().catch(() => null);
        if (data?.products) merged.push(...data.products.map((p: any) => ({
          id: p.id,
          name: p.name || p.title || 'Untitled',
          image: p.primaryImage || p.images?.[0] || p.image || '',
          price: Number(p.price) || 0,
          category: p.category || 'General',
          description: p.description || '',
        })));
      }
      if (digiRes.status === 'fulfilled' && digiRes.value.ok) {
        const data = await digiRes.value.json().catch(() => null);
        const arr = Array.isArray(data?.products) ? data.products : [];
        merged.push(...arr.filter((p: any) => p?.visible !== false).map((p: any) => ({
          id: p.id,
          name: p.title || p.name || 'Untitled',
          image: p.coverImage || p.images?.[0] || p.image || '',
          price: typeof p.price === 'number' ? p.price / 100 : 0,
          category: p.category || 'digital',
          description: p.subtitle || p.description || '',
        })));
      }
      if (merged.length === 0 && physRes.status === 'rejected' && digiRes.status === 'rejected') {
        throw new Error('Could not reach either product catalog.');
      }
      setProducts(merged);
    } catch (err: any) {
      console.error('[StoreContentStudio] load products:', err);
      toast.error(err.message || 'Could not load live products.');
    } finally { setLoadingProducts(false); }
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  // A product was routed here from the Content Center's product picker.
  useEffect(() => {
    const p = consumeContentProduct('store-content');
    if (p) { setTab('posts'); setHandoffId(p.id); }
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link2 className="w-6 h-6 text-orange-400" />
        <div>
          <h3 className="text-lg font-black text-white">Store Content Studio</h3>
          <p className="text-xs text-gray-500">Compose posts from live products and run product reels in your store.</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => setTab('posts')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${tab === 'posts' ? 'text-white' : 'text-gray-400'}`} style={{ background: tab === 'posts' ? '#ea580c' : 'rgba(255,255,255,0.05)' }}>
          <ShoppingBag className="w-4 h-4" /> Product Posts
        </button>
        <button onClick={() => setTab('reels')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${tab === 'reels' ? 'text-white' : 'text-gray-400'}`} style={{ background: tab === 'reels' ? '#ea580c' : 'rgba(255,255,255,0.05)' }}>
          <Film className="w-4 h-4" /> Store Reels
        </button>
      </div>

      {tab === 'posts'
        ? <ProductPosts products={products} loading={loadingProducts} reload={loadProducts} initialSelectedId={handoffId} />
        : <StoreReels products={products} />}
    </div>
  );
}

// ── PRODUCT POSTS ────────────────────────────────────────────────────────
function ProductPosts({ products, loading, reload, initialSelectedId }: { products: LiveProduct[]; loading: boolean; reload: () => void; initialSelectedId?: string | null }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [recipients, setRecipients] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  // Pre-select a product handed off from the Content Center product picker.
  useEffect(() => {
    if (initialSelectedId) setSelected(new Set([initialSelectedId]));
  }, [initialSelectedId]);

  const toggle = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // Build a ready-to-send post from the picked products.
  const compose = () => {
    const picked = products.filter(p => selected.has(p.id));
    if (picked.length === 0) { toast.error('Pick at least one product first.'); return; }
    const t = title || (picked.length === 1 ? `Check out ${picked[0].name}` : `${picked.length} products you'll love`);
    const lines = picked.map(p => `• ${p.name} — $${p.price.toFixed(2)}${p.description ? `\n  ${p.description.slice(0, 120)}` : ''}`);
    const composed = `${t}\n\n${lines.join('\n\n')}\n\nShop now at theblackphoenixcompany.com`;
    setTitle(t);
    setBody(composed);
    toast.success('Post composed from your products.');
  };

  const htmlBody = () => {
    const picked = products.filter(p => selected.has(p.id));
    const cards = picked.map(p => `
      <div style="border:1px solid #eee;border-radius:12px;overflow:hidden;margin:12px 0">
        ${p.image ? `<img src="${p.image}" alt="${p.name}" style="width:100%;max-height:260px;object-fit:cover" />` : ''}
        <div style="padding:12px">
          <div style="font-weight:bold;font-size:16px">${p.name}</div>
          <div style="color:#ea580c;font-weight:bold;margin-top:4px">$${p.price.toFixed(2)}</div>
          ${p.description ? `<div style="color:#555;font-size:13px;margin-top:6px">${p.description.slice(0, 160)}</div>` : ''}
        </div>
      </div>`).join('');
    return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <h1 style="color:#ea580c">${title || 'New from The Black Phoenix Company'}</h1>
      <p style="white-space:pre-wrap;color:#333">${body.replace(/</g, '&lt;')}</p>
      ${cards}
      <a href="https://www.theblackphoenixcompany.com" style="display:inline-block;margin-top:12px;padding:12px 24px;background:#ea580c;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">Shop Now →</a>
    </div>`;
  };

  const sendEmail = async () => {
    if (!recipients.trim()) { toast.error('Enter at least one recipient email.'); return; }
    if (!body.trim()) { toast.error('Compose the post first.'); return; }
    setBusy('email');
    try {
      const res = await fetch(`${SERVER}/email-center/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({
          to: recipients.split(',').map(s => s.trim()).filter(Boolean),
          subject: title || 'New from The Black Phoenix Company',
          html: htmlBody(),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `Send failed (${res.status})`);
      toast.success('Email sent (and logged in the Email Center).');
    } catch (err: any) {
      console.error('[ProductPosts] email:', err);
      toast.error(err.message || 'Could not send email.');
    } finally { setBusy(null); }
  };

  const saveSocial = async () => {
    if (!body.trim()) { toast.error('Compose the post first.'); return; }
    setBusy('social');
    try {
      const token = await adminToken();
      const res = await fetch(`${SERVER}/store-content/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || publicAnonKey}` },
        body: JSON.stringify({
          title: title || 'Untitled post',
          postBody: body,
          productIds: [...selected],
          channels: ['social'],
          status: 'ready',
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `Save failed (${res.status})`);
      toast.success('Saved as a social post — ready to schedule.');
    } catch (err: any) {
      console.error('[ProductPosts] social:', err);
      toast.error(err.message || 'Could not save post.');
    } finally { setBusy(null); }
  };

  const copyText = async () => {
    if (!body.trim()) { toast.error('Compose the post first.'); return; }
    try { await navigator.clipboard.writeText(body); toast.success('Post copied to clipboard.'); }
    catch { toast.error('Could not copy.'); }
  };

  return (
    <div className="grid md:grid-cols-2 gap-5">
      {/* Product picker */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <span className="text-sm font-bold text-white">Pick products ({selected.size})</span>
          <button onClick={reload} className="text-gray-400 hover:text-white"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
        <div className="max-h-[420px] overflow-y-auto divide-y divide-white/5">
          {products.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">{loading ? 'Loading…' : 'No live products yet.'}</div>
          ) : products.map(p => (
            <button key={p.id} onClick={() => toggle(p.id)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 text-left">
              {selected.has(p.id) ? <CheckSquare className="w-4 h-4 text-orange-400 shrink-0" /> : <Square className="w-4 h-4 text-gray-600 shrink-0" />}
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/5 shrink-0">{p.image && <img src={p.image} alt={p.name} className="w-full h-full object-cover" />}</div>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white truncate">{p.name}</div>
                <div className="text-[11px] text-gray-500">${p.price.toFixed(2)} · {p.category}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={compose} disabled={selected.size === 0} className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40" style={{ background: '#ea580c' }}>
            Compose post from {selected.size || ''} product{selected.size !== 1 ? 's' : ''}
          </button>
        </div>
      </div>

      {/* Composer + push-out */}
      <div className="space-y-3">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Post title / email subject"
          className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#ea580c]" />
        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Your post text (or click Compose to auto-fill from products)"
          className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#ea580c] min-h-[180px]" />
        <input value={recipients} onChange={e => setRecipients(e.target.value)} placeholder="Email recipients (comma-separated) — for Send as Email"
          className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#ea580c]" />
        <div className="grid grid-cols-3 gap-2">
          <button onClick={sendEmail} disabled={busy === 'email'} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-50" style={{ background: '#ea580c' }}>
            {busy === 'email' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Email
          </button>
          <button onClick={saveSocial} disabled={busy === 'social'} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-50" style={{ background: 'rgba(255,255,255,0.1)' }}>
            {busy === 'social' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Social
          </button>
          <button onClick={copyText} className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <Copy className="w-4 h-4" /> Copy
          </button>
        </div>
      </div>
    </div>
  );
}

// ── STORE REELS ──────────────────────────────────────────────────────────
function StoreReels({ products }: { products: LiveProduct[] }) {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Reel>({ id: '', title: '', videoUrl: '', posterUrl: '', productId: '', ctaText: 'Shop now', active: true });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await adminToken();
      const res = await fetch(`${SERVER}/store-content/reels/all`, { headers: { Authorization: `Bearer ${token || publicAnonKey}` } });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `Failed (${res.status})`);
      setReels(data.reels || []);
    } catch (err: any) {
      console.error('[StoreReels] load:', err);
      toast.error(err.message || 'Could not load reels.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.videoUrl.trim()) { toast.error('A video URL is required.'); return; }
    setSaving(true);
    try {
      const token = await adminToken();
      const linked = products.find(p => p.id === form.productId);
      const res = await fetch(`${SERVER}/store-content/reels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || publicAnonKey}` },
        body: JSON.stringify({ ...form, productName: linked?.name || '', posterUrl: form.posterUrl || linked?.image || '' }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `Save failed (${res.status})`);
      toast.success('Reel saved. It will show on the store "Watch & Shop" rail.');
      setForm({ id: '', title: '', videoUrl: '', posterUrl: '', productId: '', ctaText: 'Shop now', active: true });
      load();
    } catch (err: any) {
      console.error('[StoreReels] save:', err);
      toast.error(err.message || 'Could not save reel.');
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this reel?')) return;
    try {
      const token = await adminToken();
      const res = await fetch(`${SERVER}/store-content/reels/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token || publicAnonKey}` } });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `Delete failed (${res.status})`);
      toast.success('Reel deleted.');
      load();
    } catch (err: any) { toast.error(err.message || 'Could not delete reel.'); }
  };

  const toggleActive = async (r: Reel) => {
    try {
      const token = await adminToken();
      await fetch(`${SERVER}/store-content/reels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || publicAnonKey}` },
        body: JSON.stringify({ ...r, active: !r.active }),
      });
      load();
    } catch { toast.error('Could not update reel.'); }
  };

  const inputCls = 'w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[#ea580c]';

  return (
    <div className="grid md:grid-cols-2 gap-5">
      {/* Add reel */}
      <div className="rounded-2xl p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2 text-white font-bold text-sm"><Plus className="w-4 h-4 text-orange-400" /> New reel</div>
        <input className={inputCls} placeholder="Reel title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        <input className={inputCls} placeholder="Video URL (.mp4 / hosted video link)" value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })} />
        <input className={inputCls} placeholder="Poster image URL (optional — defaults to product image)" value={form.posterUrl} onChange={e => setForm({ ...form, posterUrl: e.target.value })} />
        <select className={inputCls} value={form.productId || ''} onChange={e => setForm({ ...form, productId: e.target.value })}>
          <option value="">Link a product (optional)</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input className={inputCls} placeholder="CTA text" value={form.ctaText} onChange={e => setForm({ ...form, ctaText: e.target.value })} />
        <button onClick={save} disabled={saving} className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: '#ea580c' }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />} Save reel
        </button>
      </div>

      {/* Existing reels */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <span className="text-sm font-bold text-white">Reels ({reels.length})</span>
          <button onClick={load} className="text-gray-400 hover:text-white"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
        <div className="max-h-[420px] overflow-y-auto divide-y divide-white/5">
          {reels.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">{loading ? 'Loading…' : 'No reels yet.'}</div>
          ) : reels.map(r => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="w-10 h-14 rounded-lg overflow-hidden bg-black shrink-0">
                {r.posterUrl ? <img src={r.posterUrl} alt={r.title} className="w-full h-full object-cover" /> : <video src={r.videoUrl} muted className="w-full h-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white truncate">{r.title}</div>
                <div className="text-[11px] text-gray-500 truncate">{r.productName || 'No product linked'}</div>
              </div>
              <button onClick={() => toggleActive(r)} title={r.active ? 'Hide from store' : 'Show on store'} className="text-gray-400 hover:text-white">
                {r.active ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button onClick={() => remove(r.id)} className="text-gray-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
