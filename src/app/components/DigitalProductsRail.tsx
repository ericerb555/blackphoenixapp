/**
 * Digital Products rail — surfaces the digital catalog inside the physical
 * store so the two storefronts are actually connected.
 *
 * Reads the live catalog from GET /marketplace/products (visible items only)
 * and links each card to its own page at /digital-product?id=<id>. There is no
 * placeholder content: if the catalog is empty or unreachable the rail renders
 * nothing at all rather than showing invented products.
 */
import { useState, useEffect } from 'react';
import { Download, ArrowRight, Star } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { authedHeadersOrAnon } from "../utils/authHeaders";

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface RailProduct {
  id: string;
  title: string;
  subtitle: string;
  price: number; // cents
  originalPrice?: number;
  rating?: number;
  reviews?: number;
  badge?: string;
  coverImage?: string;
  fileTypes?: string[];
  sortOrder?: number;
}

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

interface Props {
  limit?: number;
  title?: string;
  subtitle?: string;
  /**
   * 'rail'  — compact promo strip on the home view.
   * 'shelf' — sits inside the main product grid alongside the physical category
   *           shelves, so digital products are browsed like everything else.
   *           Each card carries its own button.
   */
  layout?: 'rail' | 'shelf';
}

export default function DigitalProductsRail({
  limit = 4,
  title = 'Guides, Templates & Calculators',
  subtitle = 'Instant digital downloads — no shipping, no waiting',
  layout = 'rail',
}: Props) {
  const [products, setProducts] = useState<RailProduct[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`${SERVER}/marketplace/products`, {
          headers: await authedHeadersOrAnon(publicAnonKey),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || `Digital catalog unavailable (${res.status}).`);
        const all: RailProduct[] = data?.products || [];
        if (mounted) {
          setProducts([...all].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).slice(0, limit));
        }
      } catch (err) {
        // A rail is supplementary — log it and stay out of the shopper's way.
        console.error('[DigitalProductsRail] could not load the digital catalog:', err);
      }
    })();
    return () => { mounted = false; };
  }, [limit]);

  if (products.length === 0) return null;

  const go = (path: string) => (window as any).__navigateApp?.(path);

  if (layout === 'shelf') {
    return (
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-1 h-6 rounded-full" style={{ background: 'linear-gradient(180deg, #a78bfa, #7c3aed)' }} />
          <h2 className="text-lg font-black text-white">Digital Downloads</h2>
          <span className="text-xs text-gray-600">({products.length})</span>
          <button onClick={() => go('/digital-products')}
            className="ml-auto flex items-center gap-1 text-xs font-bold text-violet-300 hover:text-white transition">
            See all <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(p => (
            <div key={p.id} className="rounded-2xl overflow-hidden flex flex-col"
              style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}>
              {p.coverImage ? (
                <div className="aspect-square w-full overflow-hidden bg-[#0A0A0A]">
                  <img src={p.coverImage} alt={p.title} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-square w-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #16121f 0%, #0A0A0A 100%)' }}>
                  <Download className="w-9 h-9 text-violet-400/60" />
                </div>
              )}
              <div className="p-3.5 flex flex-col flex-1">
                <span className="text-[10px] font-black tracking-wide text-violet-300 uppercase">
                  {p.badge || 'Instant download'}
                </span>
                <p className="text-sm font-bold text-white leading-snug line-clamp-2 mt-0.5">{p.title}</p>
                <p className="text-[11px] text-gray-500 line-clamp-2 mt-1">{p.subtitle}</p>
                <div className="flex items-center justify-between mt-2.5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base font-black text-white">{fmt(p.price)}</span>
                    {p.originalPrice && p.originalPrice > p.price && (
                      <span className="text-[11px] text-gray-600 line-through">{fmt(p.originalPrice)}</span>
                    )}
                  </div>
                  {typeof p.rating === 'number' && p.rating > 0 && (
                    <span className="flex items-center gap-1 text-[11px] text-gray-500">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {p.rating}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => go(`/digital-product?id=${encodeURIComponent(p.id)}`)}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-black text-xs text-white transition hover:brightness-110"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', minHeight: 40 }}
                >
                  <Download className="w-3.5 h-3.5" /> View &amp; Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="max-w-screen-xl mx-auto px-4 py-6">
      <div className="flex items-end justify-between gap-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-1 h-7 rounded-full" style={{ background: 'linear-gradient(180deg, #a78bfa, #7c3aed)' }} />
          <div>
            <h2 className="text-xl font-black text-white leading-none">{title}</h2>
            <p className="text-[11px] text-gray-600 mt-0.5">{subtitle}</p>
          </div>
        </div>
        <button onClick={() => go('/store')}
          className="flex items-center gap-1.5 text-xs font-bold text-violet-300 hover:text-white transition flex-shrink-0">
          All digital products <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {products.map(p => (
          <button
            key={p.id}
            onClick={() => go(`/digital-product?id=${encodeURIComponent(p.id)}`)}
            className="text-left rounded-2xl overflow-hidden transition hover:-translate-y-0.5"
            style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {p.coverImage ? (
              <div className="aspect-[16/9] w-full overflow-hidden bg-[#0A0A0A]">
                <img src={p.coverImage} alt={p.title} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="aspect-[16/9] w-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #16121f 0%, #0A0A0A 100%)' }}>
                <Download className="w-7 h-7 text-violet-400/60" />
              </div>
            )}
            <div className="p-4">
              {p.badge && (
                <span className="text-[10px] font-black tracking-wide text-violet-300">{p.badge}</span>
              )}
              <p className="text-sm font-bold text-white leading-snug line-clamp-2">{p.title}</p>
              <p className="text-[11px] text-gray-500 line-clamp-2 mt-1">{p.subtitle}</p>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base font-black text-white">{fmt(p.price)}</span>
                  {p.originalPrice && p.originalPrice > p.price && (
                    <span className="text-[11px] text-gray-600 line-through">{fmt(p.originalPrice)}</span>
                  )}
                </div>
                {typeof p.rating === 'number' && p.rating > 0 && (
                  <span className="flex items-center gap-1 text-[11px] text-gray-500">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {p.rating}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
