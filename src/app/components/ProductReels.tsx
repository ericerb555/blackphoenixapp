/**
 * ProductReels — a horizontal rail of short product videos ("reels") shown on
 * the public storefront home page. Reels are managed in the Content Center and
 * read here from the public /store-content/reels endpoint. Tapping a reel opens
 * a full-screen vertical player; the CTA jumps the shopper to that product.
 */
import { useEffect, useRef, useState } from 'react';
import { Play, X, ShoppingBag, Volume2, VolumeX } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { authedHeadersOrAnon } from "../utils/authHeaders";

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface Reel {
  id: string;
  title: string;
  videoUrl: string;
  posterUrl?: string;
  productId?: string | null;
  productName?: string;
  ctaText?: string;
}

export function ProductReels({ onShopProduct }: { onShopProduct?: (productId: string) => void }) {
  const [reels, setReels] = useState<Reel[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${SERVER}/store-content/reels`, {
          headers: await authedHeadersOrAnon(publicAnonKey),
        });
        const data = await res.json().catch(() => null);
        if (!cancelled && res.ok && data?.success) setReels(data.reels || []);
      } catch (err) {
        console.error('[ProductReels] Failed to load reels:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Lock body scroll while the player is open.
  useEffect(() => {
    if (active !== null) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [active]);

  if (reels.length === 0) return null;

  const current = active !== null ? reels[active] : null;

  return (
    <section className="max-w-screen-xl mx-auto px-4 pt-8 pb-2">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-1 h-7 rounded-full" style={{ background: 'linear-gradient(180deg, #ea580c, #f97316)' }} />
        <div>
          <h2 className="text-xl font-black text-white leading-none">Watch & Shop</h2>
          <p className="text-[11px] text-gray-600 mt-0.5">See our products in action</p>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
        {reels.map((r, i) => (
          <button
            key={r.id}
            onClick={() => { setActive(i); setMuted(true); }}
            className="relative flex-shrink-0 rounded-2xl overflow-hidden group"
            style={{ width: 150, height: 260, background: '#111' }}
          >
            {r.posterUrl ? (
              <img src={r.posterUrl} alt={r.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition" />
            ) : (
              <video src={r.videoUrl} muted playsInline preload="metadata" className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.75))' }} />
            <div className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
              <Play className="w-4 h-4 text-white fill-white" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-2.5 text-left">
              <p className="text-[12px] font-bold text-white leading-tight line-clamp-2">{r.title}</p>
              {r.productName ? <p className="text-[10px] text-orange-300 mt-0.5 truncate">{r.productName}</p> : null}
            </div>
          </button>
        ))}
      </div>

      {/* Full-screen vertical player */}
      {current && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.92)' }} onClick={() => setActive(null)}>
          <div className="relative" style={{ width: 'min(420px, 92vw)', height: 'min(88vh, 760px)' }} onClick={(e) => e.stopPropagation()}>
            <video
              ref={videoRef}
              src={current.videoUrl}
              poster={current.posterUrl || undefined}
              autoPlay
              loop
              muted={muted}
              playsInline
              controls={false}
              className="w-full h-full object-contain rounded-2xl bg-black"
            />
            {/* Controls */}
            <button onClick={() => setActive(null)} className="absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
              <X className="w-5 h-5 text-white" />
            </button>
            <button onClick={() => setMuted(m => !m)} className="absolute top-3 left-3 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
              {muted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
            </button>
            {/* Bottom info + CTA */}
            <div className="absolute bottom-0 left-0 right-0 p-4" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,0.85), transparent)' }}>
              <p className="text-white font-black text-lg leading-tight mb-1">{current.title}</p>
              {current.productName ? <p className="text-orange-300 text-sm mb-3">{current.productName}</p> : null}
              {current.productId ? (
                <button
                  onClick={() => { onShopProduct?.(current.productId!); setActive(null); }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-white"
                  style={{ background: '#ea580c' }}
                >
                  <ShoppingBag className="w-4 h-4" /> {current.ctaText || 'Shop now'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default ProductReels;
