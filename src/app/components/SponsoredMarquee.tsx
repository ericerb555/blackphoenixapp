/**
 * SponsoredMarquee — single unified scrolling strip.
 * Combines partner logos, sponsor cards, and promotional text pills
 * into one continuous marquee. Replaces LogoMarquee + AdvertisingMarquee
 * on the landing page.
 */
import { useState, useEffect } from 'react';
import { Star, ExternalLink, Megaphone } from 'lucide-react';
import { fetchAds, recordImpression, recordClick } from '../lib/adTracking';

interface Sponsor {
  id: string;
  name: string;
  imageUrl: string;
  linkUrl?: string;
  tier?: 'gold' | 'silver' | 'bronze';
  tagline?: string;
}

interface AdPill {
  id: string;
  title: string;
  content: string;
  linkUrl?: string;
  emoji?: string;
  /** Present only on a server-served paid ad; house copy has none. */
  creativeId?: string;
}

const DEFAULT_SPONSORS: Sponsor[] = [
  { id: 's1', name: 'DeWalt',          imageUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=160&h=60&fit=crop', tier: 'gold',   tagline: 'Trusted Tools' },
  { id: 's2', name: 'Home Depot',      imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=160&h=60&fit=crop', tier: 'gold',   tagline: 'Building Materials' },
  { id: 's3', name: 'Milwaukee Tool',  imageUrl: 'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=160&h=60&fit=crop', tier: 'silver', tagline: 'Pro Equipment' },
  { id: 's4', name: 'Sherwin-Williams',imageUrl: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=160&h=60&fit=crop', tier: 'silver', tagline: 'Premium Paints' },
  { id: 's5', name: "Lowe's",          imageUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=160&h=60&fit=crop', tier: 'bronze', tagline: 'Home Improvement' },
  { id: 's6', name: 'Makita',          imageUrl: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=160&h=60&fit=crop', tier: 'bronze', tagline: 'Power Tools' },
];

const DEFAULT_PILLS: AdPill[] = [
  { id: 'p1', emoji: '🏠', title: 'Free Quote',        content: 'Get a free estimate on any project' },
  { id: 'p2', emoji: '⚡', title: 'Same-Day Service',  content: 'Emergency repairs — available 24/7' },
  { id: 'p3', emoji: '💰', title: 'Subscriber Savings',content: 'Save 15% with a monthly plan' },
  { id: 'p4', emoji: '🔨', title: 'Certified Crews',   content: 'Licensed, insured & background-checked' },
  { id: 'p5', emoji: '⭐', title: '5-Star Rated',      content: 'Trusted by hundreds of local homeowners' },
];

const TIER_BORDER: Record<string, string> = {
  gold:   'border-yellow-500/50',
  silver: 'border-gray-400/30',
  bronze: 'border-orange-700/30',
};

interface SponsoredMarqueeProps {
  onNavigate?: (page: string) => void;
  speed?: number;
}

export default function SponsoredMarquee({ onNavigate, speed = 40 }: SponsoredMarqueeProps) {
  const [sponsors, setSponsors] = useState<Sponsor[]>(DEFAULT_SPONSORS);
  const [pills, setPills] = useState<AdPill[]>(DEFAULT_PILLS);

  useEffect(() => {
    // Load saved sponsors
    try {
      const saved = localStorage.getItem('sponsored_partners');
      if (saved) { const p = JSON.parse(saved); if (p.length) setSponsors(p); }
    } catch {}

    // Paid ads now come from the server rather than localStorage. Ads written
    // into browser storage were only ever visible to the one browser that wrote
    // them, which is why no advertiser could run anything — and why nothing was
    // ever counted.
    let cancelled = false;
    void (async () => {
      const ads = await fetchAds('marquee', 12);
      if (cancelled || !ads.length) return;
      setPills(ads.map((a) => ({
        id: a.id, creativeId: a.id, title: a.title, content: a.content, linkUrl: a.linkUrl, emoji: '📢',
      })));
      // One impression per creative per page session — see adTracking. A marquee
      // re-renders constantly, and counting renders would over-bill.
      for (const a of ads) recordImpression(a.id);
    })();

    // Legacy localStorage ads still render if present, so nothing a browser
    // already holds disappears; they simply carry no creative id and are not
    // counted, because there is no advertiser to attribute them to.
    try {
      const saved = localStorage.getItem('advertisements');
      if (saved) {
        const all = JSON.parse(saved);
        const marqueeAds = all.filter((a: any) => a.isActive && a.type === 'marquee');
        if (marqueeAds.length) {
          setPills((current) => current.some((p) => p.creativeId) ? current : marqueeAds.map((a: any) => ({
            id: a.id, title: a.title, content: a.content, linkUrl: a.linkUrl, emoji: '📢',
          })));
        }
      }
    } catch {}

    const refresh = () => {
      try {
        const s = localStorage.getItem('sponsored_partners');
        if (s) { const p = JSON.parse(s); if (p.length) setSponsors(p); }
      } catch {}
    };
    window.addEventListener('sponsorsUpdated', refresh);
    window.addEventListener('partnerLogosUpdated', refresh);
    return () => {
      cancelled = true;
      window.removeEventListener('sponsorsUpdated', refresh);
      window.removeEventListener('partnerLogosUpdated', refresh);
    };
  }, []);

  const go = (page: string) =>
    onNavigate ? onNavigate(page) : (window.location.href = `/${page}`);

  // Build the unified item list: interleave sponsors and pills
  const items: { type: 'sponsor'; data: Sponsor } | { type: 'pill'; data: AdPill } | { type: 'cta' }[] = [];
  const maxLen = Math.max(sponsors.length, pills.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < sponsors.length) items.push({ type: 'sponsor', data: sponsors[i] } as any);
    if (i < pills.length)   items.push({ type: 'pill',    data: pills[i] }    as any);
  }
  // Add a "become a sponsor" CTA card in the middle
  items.splice(Math.floor(items.length / 2), 0, { type: 'cta' } as any);

  // Quadruple for seamless loop
  const looped = [...items, ...items, ...items, ...items];

  return (
    <section className="w-full bg-[#0D0D0D] border-y border-[#1E1E1E] py-5">
      {/* Label row */}
      <div className="flex items-center justify-between px-4 sm:px-8 mb-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
          <span className="text-[13px] font-bold uppercase tracking-widest text-gray-500">
            Sponsored Partners &amp; Offers
          </span>
        </div>
        <button
          onClick={() => go('signup')}
          className="flex items-center gap-1 text-[13px] font-semibold text-orange-400 hover:text-orange-300 transition-colors"
        >
          Advertise Here <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {/* Scrolling strip */}
      <div className="relative overflow-hidden">
        <div
          className="flex items-center gap-4"
          style={{ animation: `unified-scroll ${speed}s linear infinite`, width: 'max-content' }}
        >
          {looped.map((item, i) => {
            if ((item as any).type === 'sponsor') {
              const s: Sponsor = (item as any).data;
              const border = TIER_BORDER[s.tier || 'bronze'];
              return (
                <div
                  key={`sp-${i}`}
                  className={`flex-shrink-0 flex flex-col items-center justify-center gap-1 w-32 h-[72px] rounded-xl border ${border} bg-[#1A1A1A] px-2`}
                >
                  <img src={s.imageUrl} alt={s.name} className="w-full h-8 object-cover rounded-md opacity-75" />
                  <span className="text-[12px] text-gray-500 font-medium truncate w-full text-center">{s.name}</span>
                  {s.tier === 'gold' && (
                    <span className="text-[12px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 font-bold leading-none">★ Gold</span>
                  )}
                </div>
              );
            }

            if ((item as any).type === 'pill') {
              const p: AdPill = (item as any).data;
              // Only a server-served ad has a creative id, and only those are
              // clickable and counted. The built-in default pills are house
              // copy, not somebody's paid placement.
              const isPaid = Boolean(p.creativeId);
              const Tag: any = isPaid && p.linkUrl ? 'a' : 'div';
              return (
                <Tag
                  key={`pl-${i}`}
                  {...(isPaid && p.linkUrl
                    ? {
                        href: p.linkUrl,
                        target: '_blank',
                        rel: 'noopener noreferrer sponsored',
                        onClick: () => recordClick(p.creativeId!),
                      }
                    : {})}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 h-[72px] rounded-xl border border-orange-500/20 bg-orange-500/5 min-w-[180px] max-w-[240px] ${
                    isPaid && p.linkUrl ? 'cursor-pointer transition hover:border-orange-500/50' : ''
                  }`}
                >
                  {p.emoji && <span className="text-xl flex-shrink-0">{p.emoji}</span>}
                  <div className="min-w-0">
                    <p className="text-white text-xs font-bold leading-tight truncate">{p.title}</p>
                    <p className="text-gray-500 text-[13px] leading-tight line-clamp-2">{p.content}</p>
                  </div>
                </Tag>
              );
            }

            // CTA card
            return (
              <button
                key={`cta-${i}`}
                onClick={() => go('signup')}
                className="flex-shrink-0 flex items-center gap-2 px-5 h-[72px] rounded-xl border border-orange-500/40 bg-gradient-to-r from-orange-600/20 to-red-600/10 hover:from-orange-600/30 hover:to-red-600/20 transition-all min-w-[200px]"
              >
                <Megaphone className="w-5 h-5 text-orange-400 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-white text-xs font-bold leading-tight">Your Brand Here</p>
                  <p className="text-orange-400 text-[13px]">First 6 months free →</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Fade edges */}
        <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#0D0D0D] to-transparent pointer-events-none z-10" />
        <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#0D0D0D] to-transparent pointer-events-none z-10" />
      </div>

      <style>{`
        @keyframes unified-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-25%); }
        }
      `}</style>
    </section>
  );
}
