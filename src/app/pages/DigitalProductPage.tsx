/**
 * Digital Product Page — a real, shareable page for a single digital product.
 *
 * Deep-linked as /digital-product?id=<productId>. Every digital product added in
 * Marketplace Admin gets one automatically; the storefront links each card here.
 *
 * Two things this page does that the storefront drawer could not:
 *   1. It has its own URL, so a product can be linked from an email, an ad, or
 *      the physical store.
 *   2. It delivers the file. Ownership is checked SERVER-SIDE against a paid
 *      Stripe order (GET /marketplace/products/:id/download), so the download
 *      button either produces a real signed file link or an honest explanation —
 *      it never pretends.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart, Star, BookOpen, FileText, Calculator, BarChart3, Wrench, Layers,
  CheckCircle, Download, Shield, Package, ArrowLeft, Lock, Loader2, Link2,
  AlertCircle, Tag, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { useStoreConfig, effectiveUnitPrice } from '../hooks/useStoreConfig';
import UnifiedCheckout from '../components/UnifiedCheckout';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const PURCHASED_KEY = 'bp_mkt_purchased';
const BUYER_EMAIL_KEY = 'bp_mkt_buyer_email';

type ProductCategory = 'ebook' | 'template' | 'calculator' | 'ai_report' | 'maintenance' | 'bundle';

interface Product {
  id: string;
  category: ProductCategory;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  price: number; // cents
  originalPrice?: number;
  pricingModel: 'one_time' | 'subscription';
  audience: string[];
  rating: number;
  reviews: number;
  badge?: string;
  preview?: string;
  fileTypes: string[];
  pages?: number;
  deliveryMethod: 'download' | 'generated' | 'interactive';
  coverImage?: string;
  // Set by the server for the public catalog — counts only, never storage paths.
  downloadable?: boolean;
  fileCount?: number;
}

interface DownloadLink { id: string; name: string; label: string; size: number; mime: string; url: string; }

const CAT_CONFIG: Record<ProductCategory, { label: string; icon: any; color: string; bg: string }> = {
  ebook:       { label: 'Ebook',       icon: BookOpen,   color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
  template:    { label: 'Template',    icon: FileText,   color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' },
  calculator:  { label: 'Calculator',  icon: Calculator, color: 'text-lime-400',   bg: 'bg-lime-500/10 border-lime-500/20' },
  ai_report:   { label: 'AI Report',   icon: BarChart3,  color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
  maintenance: { label: 'Maintenance', icon: Wrench,     color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20' },
  bundle:      { label: 'Bundle',      icon: Layers,     color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
};

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function formatFileSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function readPurchased(): Set<string> {
  try {
    const raw = localStorage.getItem(PURCHASED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

interface Props { onNavigate?: (page: string) => void; }

export default function DigitalProductPage({ onNavigate }: Props) {
  const go = (page: string) => (onNavigate ? onNavigate(page) : (window as any).__navigateApp?.(page));

  const [productId, setProductId] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [qty, setQty] = useState(1);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Download / entitlement
  const [buyerEmail, setBuyerEmail] = useState(() => localStorage.getItem(BUYER_EMAIL_KEY) || '');
  const [downloads, setDownloads] = useState<DownloadLink[] | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const likelyOwned = product ? readPurchased().has(product.id) : false;

  const { activeDiscounts } = useStoreConfig();

  // Read the id from the URL, and re-read it when the app navigates in place.
  useEffect(() => {
    const sync = () => {
      const params = new URLSearchParams(window.location.search);
      setProductId(params.get('id') || params.get('product') || '');
    };
    sync();
    window.addEventListener('app:navigate', sync);
    window.addEventListener('popstate', sync);
    return () => {
      window.removeEventListener('app:navigate', sync);
      window.removeEventListener('popstate', sync);
    };
  }, []);

  useEffect(() => {
    if (!productId) { setLoading(false); setError(null); setProduct(null); return; }
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      setDownloads(null);
      setAccessError(null);
      try {
        const res = await fetch(`${SERVER}/marketplace/products`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || `Could not load the catalog (${res.status}).`);
        const all: Product[] = data?.products || [];
        const found = all.find(p => String(p.id) === productId);
        if (!mounted) return;
        if (!found) {
          setProduct(null);
          setError('That product is no longer available in the store.');
          return;
        }
        setProduct(found);
        setRelated(all.filter(p => p.id !== found.id && p.category === found.category).slice(0, 3));
      } catch (err: any) {
        console.error('[DigitalProductPage] load failed:', err);
        if (mounted) setError(err?.message || 'Could not load this product.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, [productId]);

  // Ask the server whether this email owns the product, and if so mint links.
  const requestDownload = useCallback(async (email: string) => {
    if (!product) return;
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { setAccessError('Enter the email you purchased with.'); return; }
    setCheckingAccess(true);
    setAccessError(null);
    try {
      const res = await fetch(
        `${SERVER}/marketplace/products/${encodeURIComponent(product.id)}/download?email=${encodeURIComponent(trimmed)}`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } },
      );
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Could not verify your purchase (${res.status}).`);
      }
      setDownloads(data.downloads || []);
      localStorage.setItem(BUYER_EMAIL_KEY, trimmed);
    } catch (err: any) {
      console.error('[DigitalProductPage] download request failed:', err);
      setDownloads(null);
      setAccessError(err?.message || 'Could not verify your purchase.');
    } finally {
      setCheckingAccess(false);
    }
  }, [product]);

  // Returning from a successful Stripe checkout — confirm the payment, then the
  // download panel below can verify entitlement against the now-paid order.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') !== 'success') return;
    const sessionId = params.get('session_id');
    if (!sessionId || sessionId.includes('{')) return;
    (async () => {
      try {
        const res = await fetch(`${SERVER}/marketplace/checkout/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
          body: JSON.stringify({ sessionId }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.paid) {
          toast.error(data?.error || 'We could not confirm that payment. Please contact support with your Stripe receipt.');
          return;
        }
        const order = data.order || {};
        const ids = (Array.isArray(order.items) ? order.items : []).map((i: any) => String(i.id));
        try {
          const merged = new Set([...readPurchased(), ...ids]);
          localStorage.setItem(PURCHASED_KEY, JSON.stringify([...merged]));
        } catch { /* non-fatal */ }
        const email = order.customer_email || '';
        if (email) { setBuyerEmail(email); void requestDownload(email); }
        toast.success('Payment confirmed — your download is ready below.');
      } catch (err: any) {
        console.error('[DigitalProductPage] checkout confirmation failed:', err);
        toast.error(err?.message || 'Could not confirm the payment.');
      }
    })();
  }, [requestDownload]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Product link copied.');
    } catch {
      toast.error('Your browser blocked clipboard access — copy the URL from the address bar.');
    }
  };

  // ── States ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading product…</p>
        </div>
      </div>
    );
  }

  if (!productId) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">No product selected</h1>
          <p className="text-gray-400 text-sm mb-6">
            This page shows a single digital product. Pick one from the store.
          </p>
          <button onClick={() => go('/store')}
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-semibold transition">
            Browse the store
          </button>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Product unavailable</h1>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <button onClick={() => go('/store')}
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-semibold transition">
            Back to the store
          </button>
        </div>
      </div>
    );
  }

  const cat = CAT_CONFIG[product.category] || CAT_CONFIG.ebook;
  const CatIcon = cat.icon;
  const ep = effectiveUnitPrice(product, activeDiscounts);
  const onSale = ep.price < product.price;
  const lineCents = ep.price * qty;

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Breadcrumb */}
      <div className="border-b border-[#1A1A1A]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <button onClick={() => go('/store')}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition">
            <ArrowLeft className="w-4 h-4" /> All digital products
          </button>
          <button onClick={copyLink}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition">
            <Link2 className="w-4 h-4" /> Copy link
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10 items-start">
        {/* ── Main column ─────────────────────────────────────────────── */}
        <div className="space-y-8 min-w-0">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${cat.bg} ${cat.color}`}>
                <CatIcon className="w-3.5 h-3.5" /> {cat.label}
              </span>
              {product.badge && (
                <span className="px-2 py-0.5 bg-orange-500/20 border border-orange-500/30 text-orange-300 text-xs font-bold rounded">
                  {product.badge}
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white leading-tight">{product.title}</h1>
            <p className="text-lg text-gray-400 mt-2">{product.subtitle}</p>
            <div className="flex items-center gap-2 mt-4">
              <span className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} className={`w-4 h-4 ${i <= Math.round(product.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`} />
                ))}
              </span>
              <span className="text-sm text-gray-400">{product.rating} ({product.reviews} reviews)</span>
            </div>
          </div>

          {product.coverImage && (
            <img src={product.coverImage} alt={product.title}
              className="w-full max-h-80 object-cover rounded-2xl border border-[#2A2A2A]" />
          )}

          <div>
            <h2 className="text-lg font-bold text-white mb-3">About this product</h2>
            <p className="text-gray-300 leading-relaxed">{product.description}</p>
          </div>

          {product.preview && (
            <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Free preview</p>
              <p className="text-gray-300 italic leading-relaxed">"{product.preview}"</p>
            </div>
          )}

          {product.features?.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-4">What's included</h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {product.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              product.pages ? ['Length', `${product.pages} pages`] : null,
              ['Format', (product.fileTypes || []).join(', ') || '—'],
              ['Delivery', product.deliveryMethod],
              ['Audience', (product.audience || []).slice(0, 2).join(', ') || '—'],
            ].filter(Boolean).map(([label, value]: any) => (
              <div key={label} className="bg-[#111] border border-[#2A2A2A] rounded-xl p-3">
                <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                <p className="text-sm font-medium text-white capitalize break-words">{value}</p>
              </div>
            ))}
          </div>

          {/* ── Download / access panel ─────────────────────────────── */}
          <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <Download className="w-4 h-4 text-green-400" />
              <h2 className="text-base font-bold text-white">Already bought this?</h2>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Enter the email you checked out with and we'll verify the purchase with Stripe and
              hand you a fresh download link.
              {likelyOwned && <span className="text-green-400"> This browser shows a past purchase of this product.</span>}
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={buyerEmail}
                onChange={e => setBuyerEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void requestDownload(buyerEmail); }}
                placeholder="you@example.com"
                className="flex-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600"
              />
              <button
                onClick={() => void requestDownload(buyerEmail)}
                disabled={checkingAccess}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition flex items-center justify-center gap-2"
              >
                {checkingAccess ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {checkingAccess ? 'Checking…' : 'Get my download'}
              </button>
            </div>

            {accessError && (
              <p className="mt-3 text-sm text-red-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {accessError}
              </p>
            )}

            {downloads && downloads.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-gray-500 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> These links expire in 10 minutes — come back any time for new ones.
                </p>
                {downloads.map(d => (
                  <a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-green-600/10 border border-green-500/30 hover:bg-green-600/20 rounded-lg px-4 py-3 transition">
                    <Download className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-semibold truncate">{d.label}</p>
                      {d.size ? <p className="text-xs text-gray-400">{formatFileSize(d.size)}</p> : null}
                    </div>
                    <span className="text-xs font-bold text-green-400">Download</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {related.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-4">More {cat.label.toLowerCase()}s</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {related.map(r => (
                  <button key={r.id} onClick={() => go(`/digital-product?id=${encodeURIComponent(r.id)}`)}
                    className="text-left bg-[#111] border border-[#2A2A2A] hover:border-orange-500/50 rounded-xl p-4 transition">
                    <p className="text-sm font-bold text-white leading-snug line-clamp-2">{r.title}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{r.subtitle}</p>
                    <p className="text-sm font-bold text-orange-400 mt-2">{fmt(r.price)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Buy box ─────────────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-6 bg-[#111] border border-[#2A2A2A] rounded-2xl p-6 space-y-5">
          <div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-4xl font-black text-white">{fmt(ep.price)}</span>
              {(onSale || product.originalPrice) && (
                <span className="text-lg text-gray-500 line-through">{fmt(product.originalPrice || product.price)}</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {product.pricingModel === 'subscription' ? 'per month' : 'one-time purchase'}
            </p>
            {ep.promoName && (
              <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-bold rounded">
                <Tag className="w-3 h-3" /> {ep.promoName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-400">Quantity</label>
            <input type="number" min={1} max={99} value={qty}
              onChange={e => setQty(Math.max(1, Math.min(99, parseInt(e.target.value, 10) || 1)))}
              className="w-20 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white" />
          </div>

          <button onClick={() => setCheckoutOpen(true)}
            className="w-full py-3.5 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold transition flex items-center justify-center gap-2">
            <ShoppingCart className="w-5 h-5" /> Buy now — {fmt(lineCents)}
          </button>

          <button onClick={() => go('/store')}
            className="w-full py-2.5 bg-[#1A1A1A] hover:bg-[#222] border border-[#2A2A2A] text-gray-300 rounded-xl text-sm font-semibold transition">
            Add more from the store
          </button>

          <div className="space-y-2.5 pt-2 border-t border-[#2A2A2A]">
            {[
              product.downloadable
                ? ['Instant download', `${product.fileCount} file${product.fileCount === 1 ? '' : 's'} available the moment payment clears`]
                : ['Delivered after purchase', 'You will receive this product by email once your payment clears'],
              ['Secure checkout', 'Card payment handled by Stripe'],
              ['30-day guarantee', 'Full refund if it is not what you needed'],
            ].map(([t, d]: any) => (
              <div key={t} className="flex items-start gap-2 text-xs text-gray-400">
                <Shield className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                <div><p className="text-white font-medium">{t}</p><p>{d}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <UnifiedCheckout
        open={checkoutOpen}
        items={[{ id: product.id, name: product.title, price: ep.price / 100, quantity: qty }]}
        subtotal={lineCents / 100}
        requireShipping={false}
        submitLabel={amt => `Complete Purchase — $${amt.toFixed(2)}`}
        initialCustomer={{ name: '', email: buyerEmail }}
        onClose={() => setCheckoutOpen(false)}
        onSubmit={async customer => {
          setBuyerEmail(customer.email);
          const back = `${window.location.origin}/digital-product?id=${encodeURIComponent(product.id)}`;
          try {
            const res = await fetch(`${SERVER}/marketplace/checkout`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
              body: JSON.stringify({
                // Dollars — the server converts to Stripe's cents.
                items: [{ id: product.id, title: product.title, price: ep.price / 100, qty }],
                email: customer.email,
                name: customer.name,
                successUrl: `${back}&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
                cancelUrl: `${back}&checkout=cancelled`,
              }),
            });
            const data = await res.json().catch(() => null);
            if (res.ok && data?.url) return { url: data.url };
            const reason = data?.error || `Checkout could not be started (${res.status}).`;
            console.error('[DigitalProductPage] checkout failed:', reason);
            return { error: reason };
          } catch (err: any) {
            console.error('[DigitalProductPage] checkout request threw:', err);
            return { error: err?.message || 'Could not reach the payment processor. Nothing was charged.' };
          }
        }}
      />
    </div>
  );
}
