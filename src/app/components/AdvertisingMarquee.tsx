import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { adFrequencyController } from '../utils/adFrequencyController';

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
 * These ads are read from localStorage, so the server-side `safeUrl()` that
 * guards the advertising API never sees them. Without this check a stored
 * `javascript:` scheme reached `window.location.href` and executed — an
 * advertiser-supplied field running as the person viewing the page.
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

  useEffect(() => {
    loadAdvertisements();
    
    // Reload ads every 30 seconds
    const interval = setInterval(loadAdvertisements, 30000);
    return () => clearInterval(interval);
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

  const loadAdvertisements = () => {
    try {
      const saved = localStorage.getItem('advertisements');
      if (saved) {
        const allAds: Advertisement[] = JSON.parse(saved);
        
        // Filter ads for this placement and check subscription/frequency limits
        const relevantAds = allAds
          .filter(ad => {
            if (!ad.isActive || ad.type !== 'marquee') return false;
            if (!ad.placement || !Array.isArray(ad.placement)) return false;
            if (!ad.placement.includes(placement)) return false;
            
            // Check if ad can be displayed based on subscription
            const { allowed } = adFrequencyController.canDisplayAd(ad.id);
            if (!allowed) {
              console.log(`Ad ${ad.id} (${ad.title}) blocked by frequency controller`);
              return false;
            }
            
            return true;
          })
          .sort((a, b) => b.priority - a.priority);
        
        setAdvertisements(relevantAds);
        
        // Track impressions
        if (relevantAds.length > 0) {
          relevantAds.forEach(ad => {
            window.dispatchEvent(new CustomEvent('adImpression', {
              detail: { adId: ad.id, placement }
            }));
          });
        }
      }
    } catch (error) {
      console.error('Error loading marquee advertisements:', error);
      // Clear corrupted data
      localStorage.removeItem('advertisements');
    }
  };

  const handleAdClick = (ad: Advertisement) => {
    // Track click
    try {
      const saved = localStorage.getItem('advertisements');
      if (saved) {
        const allAds: Advertisement[] = JSON.parse(saved);
        const updatedAds = allAds.map(a => 
          a.id === ad.id 
            ? { ...a, clickCount: (a.clickCount || 0) + 1 }
            : a
        );
        localStorage.setItem('advertisements', JSON.stringify(updatedAds));
      }
    } catch (error) {
      console.error('Error tracking ad click:', error);
    }
    
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