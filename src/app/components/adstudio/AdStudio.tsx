/**
 * AdStudio — the one-stop ad creation engine for the Content Center.
 *
 * A single flow that creates marketing creative from BOTH sources:
 *   1. Ecommerce products (pulled from the store / dropshipper catalog), and
 *   2. App / service promos (free-form offers for the platform itself).
 *
 * It generates copy (AI-backed with a client-side template fallback), renders a
 * live preview across ad formats/themes, and then lets the user export the HTML,
 * save it to the Content Library, or push it to the social scheduler.
 *
 * Self-contained on purpose: it reuses the proven format/theme vocabulary from
 * the standalone Ad Creator without coupling to that page, so neither can break
 * the other.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Megaphone, Package, Sparkles, ShoppingBag, Wand2, RefreshCw,
  Copy, Save, Send, Image as ImageIcon, Smartphone, Mail, Layout,
  Monitor, CheckCircle, Tag, Loader2, Store, Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;
const AUTH = { Authorization: `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' };

// ─── Formats & themes (shared vocabulary with Ad Creator) ───────────────────────
type AdFormat = 'social_square' | 'social_story' | 'email_banner' | 'promo_card' | 'wide_banner';
type AdTheme = 'dark' | 'orange' | 'violet' | 'teal' | 'green' | 'slate';

const FORMAT_OPTS: { id: AdFormat; label: string; icon: any; w: number; h: number; desc: string }[] = [
  { id: 'social_square', label: 'Social Square', icon: ImageIcon, w: 400, h: 400, desc: 'Instagram / Facebook post' },
  { id: 'social_story', label: 'Social Story', icon: Smartphone, w: 320, h: 568, desc: 'IG / FB / TikTok story' },
  { id: 'email_banner', label: 'Email Banner', icon: Mail, w: 600, h: 200, desc: 'Email header' },
  { id: 'promo_card', label: 'Promo Card', icon: Layout, w: 400, h: 240, desc: 'Website / blog embed' },
  { id: 'wide_banner', label: 'Wide Banner', icon: Monitor, w: 728, h: 180, desc: 'Leaderboard banner' },
];

const THEMES: { id: AdTheme; label: string; bg: string; accent: string; text: string; sub: string; border: string }[] = [
  { id: 'dark',   label: 'Dark',   bg: '#0A0A0A', accent: '#ea580c', text: '#ffffff', sub: '#9ca3af', border: '#2A2A2A' },
  { id: 'orange', label: 'Orange', bg: '#ea580c', accent: '#ffffff', text: '#ffffff', sub: '#fed7aa', border: '#c2410c' },
  { id: 'violet', label: 'Violet', bg: '#1e1b4b', accent: '#8b5cf6', text: '#ffffff', sub: '#a5b4fc', border: '#312e81' },
  { id: 'teal',   label: 'Teal',   bg: '#0f172a', accent: '#14b8a6', text: '#ffffff', sub: '#7dd3fc', border: '#1e293b' },
  { id: 'green',  label: 'Green',  bg: '#052e16', accent: '#22c55e', text: '#ffffff', sub: '#86efac', border: '#14532d' },
  { id: 'slate',  label: 'Slate',  bg: '#f8fafc', accent: '#ea580c', text: '#0f172a', sub: '#475569', border: '#e2e8f0' },
];

const CTA_OPTIONS = [
  'Shop Now', 'Get Instant Access', 'Buy Now', 'Learn More',
  'Book a Quote', 'Get Started', 'Claim Offer', 'Contact Us',
];

// ─── Types ──────────────────────────────────────────────────────────────────
type SourceMode = 'product' | 'promo';

interface AdProduct {
  id: string;
  title: string;
  subtitle?: string;
  price?: number;      // dollars
  originalPrice?: number;
  image?: string;
  badge?: string;
  features?: string[];
}

interface Draft {
  headline: string;
  tagline: string;
  cta: string;
  price: string;    // display string, e.g. "$49"
  badge: string;
  features: string[];
}

function money(v?: number) {
  if (v === undefined || v === null || isNaN(v)) return '';
  return `$${Number(v).toFixed(Number.isInteger(v) ? 0 : 2)}`;
}

// Client-side copy fallback so the studio always works, even with no AI backend.
function templateCopy(name: string, desc: string): { headline: string; tagline: string } {
  const headlines = [
    name,
    `Introducing: ${name}`,
    `New: ${name}`,
    `Don't Miss ${name}`,
  ];
  const taglines = [
    desc || 'Quality you can count on — from Black Phoenix.',
    'Limited-time offer. Act now.',
    `${desc || name} — built for you.`,
    'Trusted service. Real results.',
  ];
  return {
    headline: headlines[Math.floor(Math.random() * headlines.length)],
    tagline: taglines[Math.floor(Math.random() * taglines.length)],
  };
}

// ─── Live preview ─────────────────────────────────────────────────────────────
function AdPreview({
  format, theme, draft, image,
}: {
  format: typeof FORMAT_OPTS[0];
  theme: typeof THEMES[0];
  draft: Draft;
  image?: string;
}) {
  const scale = Math.min(1, 520 / format.w);
  const isBanner = format.id === 'email_banner' || format.id === 'wide_banner';
  const isStory = format.h > format.w;

  return (
    <div
      style={{ transform: `scale(${scale})`, transformOrigin: 'top center', width: format.w, height: format.h }}
      className="relative overflow-hidden rounded-2xl shadow-2xl flex-shrink-0"
    >
      <div
        style={{ background: theme.bg, borderColor: theme.border, width: format.w, height: format.h }}
        className={`w-full h-full border-2 flex ${isBanner ? 'flex-row items-center gap-4 px-5' : 'flex-col p-5'} relative`}
      >
        {/* Optional product/AI image */}
        {image && !isBanner && (
          <div className="w-full h-28 rounded-xl overflow-hidden mb-3 flex-shrink-0">
            <img src={image} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        {image && isBanner && (
          <div style={{ width: 72, height: 72 }} className="rounded-xl overflow-hidden flex-shrink-0">
            <img src={image} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className={`flex flex-col ${isBanner ? 'flex-1 min-w-0' : 'flex-1'} justify-center`}>
          {draft.badge && (
            <div
              style={{ background: theme.accent, color: theme.id === 'orange' ? theme.bg : '#fff' }}
              className="inline-block self-start text-[11px] font-black px-2.5 py-1 rounded-full mb-2"
            >
              {draft.badge}
            </div>
          )}
          <p style={{ color: theme.text, fontSize: isStory ? 24 : isBanner ? 20 : 18, lineHeight: 1.15 }} className="font-black">
            {draft.headline || 'Your headline here'}
          </p>
          <p style={{ color: theme.sub, fontSize: isBanner ? 12 : 13 }} className="mt-1.5 leading-snug line-clamp-2">
            {draft.tagline || 'Your supporting tagline goes here.'}
          </p>

          {!isBanner && draft.features.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {draft.features.slice(0, 3).map((f, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <CheckCircle style={{ color: theme.accent, minWidth: 13 }} className="w-3.5 h-3.5 mt-0.5" />
                  <p style={{ color: theme.sub, fontSize: 11 }} className="leading-snug line-clamp-1">{f}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`flex items-center ${isBanner ? 'gap-3 flex-shrink-0' : 'justify-between mt-4'}`}>
          {draft.price && (
            <p style={{ color: theme.accent, fontSize: isStory ? 30 : 24 }} className="font-black">{draft.price}</p>
          )}
          <div
            style={{ background: theme.accent, color: theme.id === 'orange' ? theme.bg : '#fff', fontSize: isStory ? 14 : 12 }}
            className="font-black px-4 py-2 rounded-lg whitespace-nowrap"
          >
            {draft.cta}
          </div>
        </div>

        <p style={{ color: theme.sub, fontSize: 9 }} className="absolute bottom-1.5 left-5 font-semibold uppercase tracking-wider opacity-70">
          Black Phoenix
        </p>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export interface AdStudioSavedAd {
  title: string;
  content_body: string;
  html: string;
  image?: string;
  source: string;
  format: string;
  theme: string;
  productId: string | null;
}

export default function AdStudio({
  onNavigate,
  onSaveToLibrary,
}: {
  onNavigate?: (page: string) => void;
  // When provided, the parent persists the ad into the real Content Library
  // (user-scoped storage + KV server) instead of the local-only fallback.
  onSaveToLibrary?: (ad: AdStudioSavedAd) => void;
}) {
  const [mode, setMode] = useState<SourceMode>('product');
  const [products, setProducts] = useState<AdProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [formatId, setFormatId] = useState<AdFormat>('social_square');
  const [themeId, setThemeId] = useState<AdTheme>('dark');

  const [draft, setDraft] = useState<Draft>({
    headline: '', tagline: '', cta: 'Shop Now', price: '', badge: '', features: [],
  });
  const [image, setImage] = useState<string | undefined>(undefined);
  const [generating, setGenerating] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);

  const format = useMemo(() => FORMAT_OPTS.find(f => f.id === formatId)!, [formatId]);
  const theme = useMemo(() => THEMES.find(t => t.id === themeId)!, [themeId]);
  const selectedProduct = useMemo(() => products.find(p => p.id === selectedId), [products, selectedId]);

  // Load ecommerce products from the store (with graceful fallbacks).
  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const normalize = (raw: any): AdProduct => ({
        id: String(raw.id ?? raw.product_id ?? raw.sku ?? Math.random()),
        title: raw.title || raw.name || raw.productName || 'Untitled product',
        subtitle: raw.subtitle || raw.description || raw.short_description || '',
        price: typeof raw.price === 'number' ? raw.price : parseFloat(raw.price) || undefined,
        originalPrice: typeof raw.originalPrice === 'number' ? raw.originalPrice
          : typeof raw.compare_at_price === 'number' ? raw.compare_at_price : undefined,
        image: raw.image || raw.imageUrl || raw.thumbnail || (Array.isArray(raw.images) ? raw.images[0] : undefined),
        badge: raw.badge,
        features: Array.isArray(raw.features) ? raw.features : [],
      });

      // Try the product-ad catalog first, then the general products endpoint.
      let list: any[] = [];
      for (const url of [`${SERVER}/product-ads/available-products`, `${SERVER}/products`]) {
        try {
          const res = await fetch(url, { headers: AUTH });
          if (!res.ok) continue;
          const json = await res.json();
          const arr = Array.isArray(json) ? json : (json.products || json.data || json.items || []);
          if (Array.isArray(arr) && arr.length > 0) { list = arr; break; }
        } catch { /* try next */ }
      }

      if (list.length > 0) {
        setProducts(list.map(normalize));
      } else {
        // Fallback: locally staged marketing products, if any.
        try {
          const local = JSON.parse(localStorage.getItem('bp_mkt_products') || '[]');
          setProducts((Array.isArray(local) ? local : []).map(normalize));
        } catch {
          setProducts([]);
        }
      }
    } catch (err) {
      console.error('[AdStudio] Failed to load products:', err);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => { if (mode === 'product') loadProducts(); }, [mode, loadProducts]);

  // When a product is selected, seed the draft from it.
  useEffect(() => {
    if (!selectedProduct) return;
    setDraft(d => ({
      ...d,
      headline: selectedProduct.title,
      tagline: selectedProduct.subtitle || d.tagline,
      price: money(selectedProduct.price),
      badge: selectedProduct.badge || d.badge,
      features: selectedProduct.features && selectedProduct.features.length ? selectedProduct.features : d.features,
    }));
    setImage(selectedProduct.image);
  }, [selectedProduct]);

  // ── AI copy generation (backend, with client fallback) ──
  const generateCopy = async () => {
    const name = draft.headline || selectedProduct?.title || 'this offer';
    const desc = draft.tagline || selectedProduct?.subtitle || '';
    setGenerating(true);
    try {
      const res = await fetch(`${SERVER}/marketing-assets/generate-description`, {
        method: 'POST',
        headers: AUTH,
        body: JSON.stringify({
          productName: name,
          productDescription: desc,
          tone: 'persuasive',
          context: mode === 'promo' ? 'service_promo' : 'ecommerce_product',
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const headline = json.headline || json.title || name;
        const tagline = json.tagline || json.description || json.copy || desc;
        setDraft(d => ({ ...d, headline, tagline }));
        toast.success('AI copy generated');
        return;
      }
      throw new Error(`Server ${res.status}`);
    } catch (err) {
      // Graceful fallback — never leave the user stuck.
      const c = templateCopy(name, desc);
      setDraft(d => ({ ...d, ...c }));
      toast.info('Generated copy (offline template)');
    } finally {
      setGenerating(false);
    }
  };

  // ── AI image generation (optional) ──
  const generateImage = async () => {
    setGeneratingImage(true);
    try {
      const res = await fetch(`${SERVER}/marketing-assets/generate`, {
        method: 'POST',
        headers: AUTH,
        body: JSON.stringify({
          productId: selectedId || undefined,
          productName: draft.headline || selectedProduct?.title || 'Featured offer',
          productDescription: draft.tagline || '',
          assetType: 'social-ad',
          platforms: ['instagram'],
          customPrompt: `${draft.headline}. ${draft.tagline}`,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const url = json.url || json.imageUrl || json.asset?.url || (Array.isArray(json.assets) ? json.assets[0]?.url : undefined);
        if (url) { setImage(url); toast.success('AI image generated'); return; }
      }
      throw new Error('no image');
    } catch {
      toast.error('Image generation unavailable right now — you can still publish without one.');
    } finally {
      setGeneratingImage(false);
    }
  };

  // ── Output actions ──
  const buildHtml = () => {
    return `<!-- Black Phoenix Ad (${format.label}) -->
<div style="width:${format.w}px;height:${format.h}px;background:${theme.bg};color:${theme.text};border:2px solid ${theme.border};border-radius:16px;padding:20px;box-sizing:border-box;font-family:system-ui,sans-serif;">
  ${draft.badge ? `<span style="background:${theme.accent};color:#fff;font-weight:800;font-size:11px;padding:4px 10px;border-radius:999px;">${draft.badge}</span>` : ''}
  <h2 style="margin:8px 0 4px;font-size:20px;font-weight:900;">${draft.headline}</h2>
  <p style="margin:0;color:${theme.sub};font-size:13px;">${draft.tagline}</p>
  <div style="margin-top:16px;display:flex;align-items:center;justify-content:space-between;">
    ${draft.price ? `<span style="color:${theme.accent};font-weight:900;font-size:24px;">${draft.price}</span>` : ''}
    <span style="background:${theme.accent};color:#fff;font-weight:800;font-size:12px;padding:8px 16px;border-radius:8px;">${draft.cta}</span>
  </div>
</div>`;
  };

  const copyHtml = async () => {
    try {
      await navigator.clipboard.writeText(buildHtml());
      toast.success('Ad HTML copied to clipboard');
    } catch {
      toast.error('Could not copy to clipboard');
    }
  };

  const saveToLibrary = () => {
    try {
      const ad: AdStudioSavedAd = {
        title: draft.headline || 'Untitled ad',
        content_body: [draft.headline, draft.tagline, draft.price, draft.cta].filter(Boolean).join('\n'),
        html: buildHtml(),
        image,
        source: mode,
        format: format.id,
        theme: theme.id,
        productId: selectedId || null,
      };
      // Preferred path: persist into the real Content Library via the parent.
      if (onSaveToLibrary) {
        onSaveToLibrary(ad);
        toast.success('Saved to Content Library');
        return;
      }
      // Standalone fallback (no parent): keep a local copy.
      const items = JSON.parse(localStorage.getItem('contentCenterItems') || '[]');
      localStorage.setItem(
        'contentCenterItems',
        JSON.stringify([{ id: `ad-${Date.now()}`, type: 'ad', status: 'ready', createdAt: new Date().toISOString(), ...ad }, ...(Array.isArray(items) ? items : [])])
      );
      toast.success('Saved to Content Library');
    } catch (err) {
      console.error('[AdStudio] save error', err);
      toast.error('Could not save to library');
    }
  };

  const sendToScheduler = () => {
    // Save to the library first, then queue a draft post in the same store the
    // Social Scheduler reads (`social_scheduled_posts`), so it actually appears there.
    saveToLibrary();
    try {
      const saved = JSON.parse(localStorage.getItem('social_scheduled_posts') || '[]');
      const post = {
        id: `ad_${Date.now()}`,
        content: [draft.headline, draft.tagline, draft.cta].filter(Boolean).join(' — '),
        media_urls: image ? [image] : [],
        media_type: image ? 'image' : 'text',
        platforms: ['facebook', 'instagram'],
        scheduled_date: '',
        status: 'draft',
        created_at: new Date().toISOString(),
      };
      localStorage.setItem('social_scheduled_posts', JSON.stringify([post, ...(Array.isArray(saved) ? saved : [])]));
    } catch (err) {
      console.error('[AdStudio] scheduler queue error', err);
    }
    toast.success('Ad saved — opening the Social Scheduler…');
    // Deep-link back into the Content Center scheduler tab.
    if (onNavigate) onNavigate('enterprise-content-center?tab=social-scheduler');
  };

  const canPublish = draft.headline.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#ea580c] to-orange-700 flex items-center justify-center">
          <Megaphone className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Ad Studio</h2>
          <p className="text-sm text-gray-400">One place to create ads for your store products and your app/services.</p>
        </div>
      </div>

      {/* Source toggle */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setMode('product')}
          className={`p-4 rounded-xl border text-left transition ${mode === 'product' ? 'border-[#ea580c] bg-[#ea580c]/10' : 'border-[#2A2A2A] bg-[#141414] hover:border-gray-600'}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <ShoppingBag className={`w-5 h-5 ${mode === 'product' ? 'text-[#ea580c]' : 'text-gray-400'}`} />
            <span className="font-semibold text-white">Ecommerce Product</span>
          </div>
          <p className="text-xs text-gray-400">Advertise a product from your store / dropship catalog.</p>
        </button>
        <button
          onClick={() => setMode('promo')}
          className={`p-4 rounded-xl border text-left transition ${mode === 'promo' ? 'border-[#ea580c] bg-[#ea580c]/10' : 'border-[#2A2A2A] bg-[#141414] hover:border-gray-600'}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Building2 className={`w-5 h-5 ${mode === 'promo' ? 'text-[#ea580c]' : 'text-gray-400'}`} />
            <span className="font-semibold text-white">App / Service Promo</span>
          </div>
          <p className="text-xs text-gray-400">Promote your platform, services, or a special offer.</p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: configuration */}
        <div className="space-y-5">
          {/* Product picker */}
          {mode === 'product' && (
            <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white flex items-center gap-2"><Store className="w-4 h-4 text-[#ea580c]" /> Choose a product</h3>
                <button onClick={loadProducts} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingProducts ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>
              {loadingProducts ? (
                <div className="py-8 text-center text-gray-500 text-sm flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading products…
                </div>
              ) : products.length === 0 ? (
                <div className="py-6 text-center text-sm text-gray-500">
                  No store products found yet. Import products in the Online Store, or switch to <button onClick={() => setMode('promo')} className="text-[#ea580c] underline">App / Service Promo</button>.
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {products.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition ${selectedId === p.id ? 'border-[#ea580c] bg-[#ea580c]/10' : 'border-[#2A2A2A] hover:border-gray-600'}`}
                    >
                      <div className="w-11 h-11 rounded-lg bg-[#0A0A0A] overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-gray-600" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white font-medium truncate">{p.title}</p>
                        <p className="text-xs text-gray-500 truncate">{p.subtitle}</p>
                      </div>
                      {p.price !== undefined && <span className="text-sm font-bold text-[#ea580c]">{money(p.price)}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Copy editor */}
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-2"><Wand2 className="w-4 h-4 text-[#ea580c]" /> Ad copy</h3>
              <button
                onClick={generateCopy}
                disabled={generating}
                className="text-xs bg-[#ea580c] hover:bg-orange-600 disabled:opacity-60 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5"
              >
                {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                AI Generate
              </button>
            </div>
            <Field label="Headline" value={draft.headline} onChange={v => setDraft(d => ({ ...d, headline: v }))} placeholder={mode === 'promo' ? 'e.g. Full-Service Property Care' : 'Product name'} />
            <Field label="Tagline" value={draft.tagline} onChange={v => setDraft(d => ({ ...d, tagline: v }))} placeholder="Supporting line" textarea />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price / Offer" value={draft.price} onChange={v => setDraft(d => ({ ...d, price: v }))} placeholder="$49 or Free Quote" />
              <Field label="Badge" value={draft.badge} onChange={v => setDraft(d => ({ ...d, badge: v }))} placeholder="e.g. 20% OFF" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Call to action</label>
              <select
                value={draft.cta}
                onChange={e => setDraft(d => ({ ...d, cta: e.target.value }))}
                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:border-[#ea580c] outline-none"
              >
                {CTA_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Format + theme */}
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-white">Format & style</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FORMAT_OPTS.map(f => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFormatId(f.id)}
                    className={`p-2.5 rounded-lg border text-left transition ${formatId === f.id ? 'border-[#ea580c] bg-[#ea580c]/10' : 'border-[#2A2A2A] hover:border-gray-600'}`}
                  >
                    <Icon className={`w-4 h-4 mb-1 ${formatId === f.id ? 'text-[#ea580c]' : 'text-gray-400'}`} />
                    <p className="text-xs font-medium text-white">{f.label}</p>
                    <p className="text-[10px] text-gray-500">{f.w}×{f.h}</p>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {THEMES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setThemeId(t.id)}
                  title={t.label}
                  className={`w-8 h-8 rounded-lg border-2 transition ${themeId === t.id ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ background: t.bg }}
                >
                  <span className="block w-3 h-3 rounded-full mx-auto" style={{ background: t.accent }} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: preview + actions */}
        <div className="space-y-4">
          <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2"><ImageIcon className="w-4 h-4 text-[#ea580c]" /> Live preview</h3>
              <button
                onClick={generateImage}
                disabled={generatingImage}
                className="text-xs text-gray-300 hover:text-white border border-[#2A2A2A] hover:border-gray-500 px-3 py-1.5 rounded-lg flex items-center gap-1.5 disabled:opacity-60"
              >
                {generatingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                AI Image
              </button>
            </div>
            <div className="flex justify-center overflow-hidden" style={{ minHeight: Math.min(format.h, format.h * Math.min(1, 520 / format.w)) + 8 }}>
              <AdPreview format={format} theme={theme} draft={draft} image={image} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button onClick={copyHtml} disabled={!canPublish} className="flex items-center justify-center gap-2 bg-[#141414] border border-[#2A2A2A] hover:border-gray-500 disabled:opacity-50 text-white text-sm font-semibold px-3 py-2.5 rounded-lg">
              <Copy className="w-4 h-4" /> Copy HTML
            </button>
            <button onClick={saveToLibrary} disabled={!canPublish} className="flex items-center justify-center gap-2 bg-[#141414] border border-[#2A2A2A] hover:border-gray-500 disabled:opacity-50 text-white text-sm font-semibold px-3 py-2.5 rounded-lg">
              <Save className="w-4 h-4" /> Save to Library
            </button>
            <button onClick={sendToScheduler} disabled={!canPublish} className="flex items-center justify-center gap-2 bg-[#ea580c] hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold px-3 py-2.5 rounded-lg">
              <Send className="w-4 h-4" /> Schedule
            </button>
          </div>
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" /> Saved ads appear in your Content Library and can be scheduled to social or email.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, textarea }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean;
}) {
  return (
    <div>
      <label className="text-xs text-gray-400 mb-1 block">{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:border-[#ea580c] outline-none resize-none"
        />
      ) : (
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:border-[#ea580c] outline-none"
        />
      )}
    </div>
  );
}
