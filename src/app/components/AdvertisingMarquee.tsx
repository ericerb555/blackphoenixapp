import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { adFrequencyController } from '../utils/adFrequencyController';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const AD_API = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

/**
 * WHERE THESE ADS COME FROM, AND WHERE THEY USED TO COME FROM
 *
 * They come from the server now. They used to come from `localStorage`, and
 * the only thing that ever WROTE that key was this component's own click
 * handler, incrementing a count on ads nobody could create. So every marquee
 * on every portal has rendered nothing, for everybody, since it was built —
 * while `advertising.tsx` kept campaigns, creatives, an approval queue and
 * impression counters that nothing ever asked for, and the advertiser portal
 * reported on figures nothing incremented.
 *
 * That is the entire change here. Nothing about how this looks has moved: the
 * rotation, the dismissal, the scrolling variant and every class name are as
 * they were, per the standing rule about not restyling the portals.
 *
 * THE TWO VOCABULARIES, WHICH ARE NOT THE SAME
 *
 * Callers say where they are — `portal-header`, `customer-portal`,
 * `territory-portal`. The server sells four inventories: `marquee`, `banner`,
 * `reel` and `exchange`. An advertiser buys "the marquee", which the server's
 * own note calls "a marquee on nineteen surfaces" — so every portal position
 * asks for that one, and a caller naming a real inventory gets it directly.
 *
 * This matters in the direction nobody would notice. Without the mapping,
 * `serve?placement=portal-header` matches nothing, the marquee keeps rendering
 * nothing, and it looks exactly like it did before — which is how this gets
 * reported as connected when it is not.
 */
const SERVER_INVENTORY = ['marquee', 'banner', 'reel', 'exchange'];

function inventoryFor(placement: string): string {
  return SERVER_INVENTORY.includes(placement) ? placement : 'marquee';
}

/** Report what was shown or clicked. Never allowed to break the page. */
function reportAdEvents(events: { creativeId: string; kind: 'impression' | 'click' }[]) {
  if (!events.length) return;
  void fetch(`${AD_API}/advertising/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
    body: JSON.stringify({ events }),
  }).catch(() => {
    /* An uncounted impression is a far smaller problem than a portal that
       throws while drawing its own header. */
  });
}

interface Advertisement {
  id: string;
  type: string;
  title: string;
  content: string;
  linkUrl?: string;
  placement: string[];
  isActive: boolean;
  priority: number;
  clickCount?: number;
}

interface AdvertisingMarqueeProps {
  placement?: string;
  dismissible?: boolean;
  /**
   * Scroll the ads continuously instead of fading between them.
   *
   * Off by default on purpose. Every portal already renders this component as a
   * rotating banner, and changing that for all of them is a redesign of screens
   * nobody asked to have redesigned. Phoenix Exchange opts in; the portals are
   * untouched.
   */
  scroll?: boolean;
}

/**
 * Only http and https may become a link target.
 *
 * The server sanitises these on the way in and again on the way out, so this
 * is the third check rather than the only one. It stays because it is the last
 * one before the value reaches a browser: without it a stored `javascript:`
 * scheme reached `window.location.href` and executed — an advertiser-supplied
 * field running as the person viewing the page.
 *
 * It also still guards a case the server cannot: anything already sitting in a
 * viewer's open tab from before this component started asking the server.
 */
function safeAdUrl(raw: unknown): string {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

export default function AdvertisingMarquee({
  placement = 'subcontractor-portal',
  dismissible = false,
  scroll = false,
}: AdvertisingMarqueeProps) {
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);

  /** Creatives already counted, so rotation and refetching do not re-count. */
  const counted = useRef<Set<string>>(new Set());

  useEffect(() => {
    void loadAdvertisements();

    // Reload ads every 30 seconds
    const interval = setInterval(() => { void loadAdvertisements(); }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placement]);

  useEffect(() => {
    // Rotate through ads every 8 seconds
    if (advertisements.length > 1) {
      const rotateInterval = setInterval(() => {
        setCurrentAdIndex(prev => (prev + 1) % advertisements.length);
      }, 8000);
      return () => clearInterval(rotateInterval);
    }
  }, [advertisements]);

  const loadAdvertisements = useCallback(async () => {
    try {
      const res = await fetch(
        `${AD_API}/advertising/serve?placement=${encodeURIComponent(inventoryFor(placement))}&limit=12`,
        { headers: { Authorization: `Bearer ${publicAnonKey}` } },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success || !Array.isArray(body.ads)) return;

      /*
       * The server has already decided what is live: approved by an
       * administrator, switched on by its author, and inside its campaign’s
       * dates. What is left to decide here is the only thing the browser
       * knows — how often this viewer has already been shown it.
       */
      const relevantAds: Advertisement[] = body.ads
        .filter((ad: any) => adFrequencyController.canDisplayAd(String(ad?.id ?? '')).allowed)
        .map((ad: any) => ({
          id: String(ad.id),
          type: 'marquee',
          title: String(ad.title ?? ''),
          content: String(ad.content ?? ''),
          linkUrl: ad.linkUrl ?? undefined,
          placement: [placement],
          isActive: true,
          priority: 0,
        }));

      setAdvertisements(relevantAds);

      /*
       * Two impressions, to two different counters, and both are wanted.
       *
       * The CustomEvent is what `adFrequencyController` listens for, and is how
       * this viewer’s own frequency cap is kept. The server call is what the
       * advertiser is billed and reported on. Dropping either one quietly
       * breaks something a long way from here.
       */
      const fresh = relevantAds.filter((ad) => !counted.current.has(ad.id));
      for (const ad of fresh) counted.current.add(ad.id);

      for (const ad of relevantAds) {
        window.dispatchEvent(new CustomEvent('adImpression', {
          detail: { adId: ad.id, placement },
        }));
      }
      reportAdEvents(fresh.map((ad) => ({ creativeId: ad.id, kind: 'impression' as const })));
    } catch {
      /* A portal header is not the place to report that an advertisement could
         not be fetched. It shows nothing, exactly as it did before. */
    }
  }, [placement]);

  const handleAdClick = (ad: Advertisement) => {
    /* Counted where the advertiser can see it. This used to increment a number
       inside this browser’s own localStorage, which nobody could ever read and
       which was the only thing that ever wrote that key. */
    reportAdEvents([{ creativeId: ad.id, kind: 'click' }]);
    
    // Navigate. Anything that is not http(s) is discarded rather than followed —
    // see safeAdUrl. A rejected link simply does nothing.
    const target = safeAdUrl(ad.linkUrl);
    if (target) window.open(target, '_blank', 'noopener,noreferrer');
  };

  if (isDismissed || advertisements.length === 0) {
    return null;
  }

  const currentAd = advertisements[currentAdIndex];

  // ── scrolling variant ──────────────────────────────────────────────────────
  // Opt-in only. The rotating branch below is untouched, so every existing
  // caller renders exactly what it rendered before.
  //
  // Spacing is set in real CSS rather than p-*/py-* utilities: the global reset
  // is deliberately unlayered (see globals.css), which leaves those utilities
  // inert. Class selectors beat the bare `*`, so these rules apply.
  if (scroll) {
    // Duplicated so the tail of the list meets its own head and the loop has no
    // visible seam. Translating by -50% lands exactly one copy along.
    const reel = [...advertisements, ...advertisements];
    const seconds = Math.max(18, advertisements.length * 9);

    return (
      <div className="bp-admarquee relative text-white overflow-hidden">
        <style>{`
          .bp-admarquee {
            background: linear-gradient(90deg,#ea580c,#dc4a08,#ea580c);
            padding-block: 7px;
          }
          .bp-admarquee-track {
            display: flex;
            align-items: center;
            gap: 40px;
            width: max-content;
            animation: bp-admarquee-scroll ${seconds}s linear infinite;
          }
          .bp-admarquee:hover .bp-admarquee-track { animation-play-state: paused; }
          .bp-admarquee-item {
            display: inline-flex; align-items: center; gap: 8px;
            font-size: 13px; white-space: nowrap;
          }
          .bp-admarquee-dot { opacity: .5; }
          /* Only the scrolling variant's control — the rotating one the portals
             render is left exactly as it was. */
          .bp-admarquee-x { padding: 6px; }
          @media (pointer: coarse) {
            .bp-admarquee-x { width: 44px; height: 44px; display: grid; place-items: center; }
          }
          @keyframes bp-admarquee-scroll {
            from { transform: translateX(0); }
            to   { transform: translateX(-50%); }
          }
          /* Someone who asked not to see motion gets a static strip, not a
             stopped animation that has scrolled to an arbitrary position. */
          @media (prefers-reduced-motion: reduce) {
            .bp-admarquee-track { animation: none; }
          }
        `}</style>

        <div className="bp-admarquee-track">
          {reel.map((ad, i) => (
            <span
              key={`${ad.id}-${i}`}
              className="bp-admarquee-item"
              onClick={() => ad.linkUrl && handleAdClick(ad)}
              style={{ cursor: safeAdUrl(ad.linkUrl) ? 'pointer' : 'default' }}
            >
              <span style={{ fontWeight: 700 }}>{ad.title}</span>
              <span style={{ opacity: 0.9 }}>{ad.content}</span>
              {safeAdUrl(ad.linkUrl) && (
                <span style={{ textDecoration: 'underline', fontWeight: 600 }}>Learn More →</span>
              )}
              <span className="bp-admarquee-dot">•</span>
            </span>
          ))}
        </div>

        {dismissible && (
          <button
            onClick={(e) => { e.stopPropagation(); setIsDismissed(true); }}
            className="bp-admarquee-x absolute top-1/2 -translate-y-1/2 right-4 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-r from-[#ea580c] via-[#dc4a08] to-[#ea580c] text-white overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentAd.id}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          transition={{ duration: 0.5 }}
          className="py-1.5 px-4"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-center">
            <div 
              className={`text-center ${currentAd.linkUrl ? 'cursor-pointer' : ''}`}
              onClick={() => currentAd.linkUrl && handleAdClick(currentAd)}
            >
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span className="font-bold text-sm">{currentAd.title}</span>
                <span className="text-white/90 text-sm">{currentAd.content}</span>
                {currentAd.linkUrl && (
                  <span className="underline font-semibold text-sm">Learn More →</span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dismiss Button */}
      {dismissible && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsDismissed(true);
          }}
          className="absolute top-1/2 -translate-y-1/2 right-4 p-1.5 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Progress Indicator for Multiple Ads */}
      {advertisements.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20">
          <motion.div
            key={currentAdIndex}
            className="h-full bg-white"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 8, ease: 'linear' }}
          />
        </div>
      )}
    </div>
  );
}