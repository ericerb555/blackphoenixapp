/**
 * HeroSideReels — vertical product reels flanking the "Built for the Every Day"
 * hero, one column on each side.
 *
 * Reels come from the same public /store-content/reels endpoint the Watch & Shop
 * rail uses, so anything published in the Content Center appears here too. There
 * is no filler: with fewer than two reels published, nothing renders and the hero
 * keeps its original centred layout.
 *
 * They autoplay muted and looping (the only way browsers permit autoplay) and
 * are decorative-but-shoppable: clicking one jumps the shopper to that product.
 * Hidden below `lg` so they never crowd the headline on phones and tablets.
 */
import { useEffect, useRef, useState } from 'react';
import { Play, ShoppingBag } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

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

interface Props {
  /** Which edge of the hero this column sits on. */
  side: 'left' | 'right';
  /** How many reels to stack in the column. */
  count?: number;
  /** Jump the shopper to the product this reel features. */
  onShopProduct?: (productId: string) => void;
}

/**
 * Shared across both columns so the two sides don't fetch the endpoint twice on
 * every mount, and so left/right can slice a single ordered list without
 * showing the same reel twice.
 */
let reelsPromise: Promise<Reel[]> | null = null;

function loadReels(): Promise<Reel[]> {
  if (!reelsPromise) {
    reelsPromise = (async () => {
      try {
        const res = await fetch(`${SERVER}/store-content/reels`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) throw new Error(data?.error || `Reels unavailable (${res.status}).`);
        return Array.isArray(data.reels) ? data.reels : [];
      } catch (err) {
        // Hero decoration — log it and let the hero render without the columns.
        console.error('[HeroSideReels] could not load reels:', err);
        reelsPromise = null; // allow a retry on the next mount
        return [];
      }
    })();
  }
  return reelsPromise;
}

function ReelTile({ reel, onShopProduct }: { reel: Reel; onShopProduct?: (id: string) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playable, setPlayable] = useState(true);

  // Only play while on screen — a hero with four looping videos otherwise
  // burns battery and bandwidth for a shopper who has scrolled past it.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void el.play().catch(() => setPlayable(false));
        else el.pause();
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const clickable = Boolean(reel.productId && onShopProduct);

  return (
    <div
      onClick={() => { if (clickable) onShopProduct!(reel.productId!); }}
      className={`group relative rounded-2xl overflow-hidden ${clickable ? 'cursor-pointer' : ''}`}
      style={{ aspectRatio: '9 / 16', background: '#0d0d0d', border: '1px solid rgba(234,88,12,0.18)' }}
    >
      {playable ? (
        <video
          ref={videoRef}
          src={reel.videoUrl}
          poster={reel.posterUrl}
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setPlayable(false)}
          className="w-full h-full object-cover"
        />
      ) : reel.posterUrl ? (
        // The video failed; the poster still sells the product.
        <img src={reel.posterUrl} alt={reel.title} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Play className="w-7 h-7 text-orange-500/40" />
        </div>
      )}

      {/* Legibility scrim + label */}
      <div className="absolute inset-x-0 bottom-0 pt-8 pb-2.5 px-2.5"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>
        <p className="text-[11px] font-bold text-white leading-snug line-clamp-2">{reel.title}</p>
        {clickable && (
          <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-black text-orange-400 opacity-0 group-hover:opacity-100 transition">
            <ShoppingBag className="w-2.5 h-2.5" /> {reel.ctaText || 'Shop this'}
          </span>
        )}
      </div>
    </div>
  );
}

export default function HeroSideReels({ side, count = 2, onShopProduct }: Props) {
  const [reels, setReels] = useState<Reel[]>([]);

  useEffect(() => {
    let cancelled = false;
    void loadReels().then((all) => { if (!cancelled) setReels(all); });
    return () => { cancelled = true; };
  }, []);

  // Both columns need real content, otherwise the hero looks lopsided. Split the
  // list so the two sides never show the same reel.
  if (reels.length < 2) return null;
  const half = Math.floor(reels.length / 2);
  const mine = (side === 'left' ? reels.slice(0, half) : reels.slice(half)).slice(0, count);
  if (mine.length === 0) return null;

  return (
    <div
      aria-hidden={false}
      className="hidden lg:flex flex-col gap-3 w-[clamp(120px,11vw,170px)] flex-shrink-0"
      style={{ alignSelf: 'center' }}
    >
      {mine.map((reel) => (
        <ReelTile key={reel.id} reel={reel} onShopProduct={onShopProduct} />
      ))}
    </div>
  );
}
