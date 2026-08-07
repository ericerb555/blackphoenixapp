/**
 * FeaturedDealsReels — shown at the top of the Deals & Reels tab in every portal.
 * Displays active platform deals and featured reels so portal members can see
 * what's being advertised on the platform (the marketing value prop).
 */
import { useState, useEffect } from 'react';
import { Play, Tag, ExternalLink, Star, Clock, ChevronRight, Percent, Gift, Video } from 'lucide-react';

const SERVER = 'https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-3eae23a6';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsenN2end3Y2RvcG5hd3Rpd3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NTczMTIsImV4cCI6MjA4NTEzMzMxMn0.HcaTHZrVUG1qWfHnKr7ItKOHrDhDWoDaPFG46O1lu6o';

// No placeholder deals or reels. A portal member only ever sees offers the
// owner actually published in Deal Publisher and reels that were approved —
// showing invented businesses and promo codes to a real client is worse than
// showing an honest empty state.

function discountBadgeColor(type: string) {
  if (type === 'percent') return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
  if (type === 'dollar') return 'bg-green-500/20 text-green-400 border border-green-500/30';
  return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
}

interface Props {
  portalType?: string; // e.g. 'territory', 'vendor', 'subcontractor', 'customer' etc.
}

export default function FeaturedDealsReels({ portalType }: Props = {}) {
  const [reels, setReels] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingReel, setPlayingReel] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [reelsSection, setReelsSection] = useState<'featured' | 'all'>('featured');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    // Approved, featured reels published by the owner.
    const reelsReq = fetch(`${SERVER}/public/reels`, {
      headers: { Authorization: `Bearer ${ANON_KEY}` }
    }).then(r => r.json()).then(data => {
      const serverReels = (data.reels || []).filter((r: any) => r.featured && r.approved);
      if (!cancelled) setReels(serverReels);
    }).catch(err => { console.error('[FeaturedDealsReels] reels load failed:', err); });

    // Load portal-targeted deals from owner's Deal Publisher
    const url = new URL(`${SERVER}/portal-deals`);
    if (portalType) url.searchParams.set('portal', portalType);
    const dealsReq = fetch(url.toString(), {
      headers: { Authorization: `Bearer ${ANON_KEY}` }
    }).then(r => r.json()).then(data => {
      const serverDeals = (data.deals || []).filter((d: any) => d.active !== false);
      if (!cancelled) {
        const normalized = serverDeals.map((d: any) => ({
          id: d.id,
          title: d.title,
          business: d.createdBy || 'Black Phoenix',
          discount: d.discountType === 'percent' ? `${d.discountValue}% OFF`
            : d.discountType === 'flat' ? `$${d.discountValue} OFF`
            : d.discountType === 'free' ? 'FREE'
            : d.discountValue || 'DEAL',
          code: d.promoCode || '',
          expires: d.expiresAt ? new Date(d.expiresAt).toLocaleDateString() : '',
          type: d.discountType === 'percent' ? 'percent' : d.discountType === 'flat' ? 'dollar' : 'free-service',
          category: '',
          description: d.description || '',
          imageUrl: d.imageUrl || '',
        }));
        setDeals(normalized);
      }
    }).catch(err => { console.error('[FeaturedDealsReels] deals load failed:', err); });

    Promise.allSettled([reelsReq, dealsReq]).then(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [portalType]);

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  function getEmbedUrl(reel: any) {
    if (reel.embedUrl) return reel.embedUrl;
    if (reel.url?.includes('youtube') || reel.url?.includes('youtu.be')) {
      const match = reel.url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (match) return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
    }
    return reel.url;
  }

  function getThumbnail(reel: any) {
    if (reel.thumbnailUrl) return reel.thumbnailUrl;
    if (reel.url?.includes('youtube') || reel.url?.includes('youtu.be')) {
      const match = reel.url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (match) return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
    }
    return null;
  }

  return (
    <div className="space-y-8">
      {/* ── FEATURED DEALS ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-orange-400" /> Active Featured Deals
          </h3>
          <span className="text-xs text-gray-500">
            {loading ? 'Loading…' : `${deals.length} offer${deals.length !== 1 ? 's' : ''} live now`}
          </span>
        </div>
        {!loading && deals.length === 0 && (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-8 text-center">
            <Tag className="w-8 h-8 text-gray-700 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No active offers right now. Check back soon.</p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {deals.map(deal => (
            <div key={deal.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden hover:border-orange-500/30 transition group">
              {/* Colored top bar */}
              <div className="h-1.5 bg-gradient-to-r from-orange-600 to-red-600" />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className={`text-sm font-black px-2.5 py-1 rounded-lg ${discountBadgeColor(deal.type)}`}>
                    {deal.discount}
                  </span>
                  <span className="text-xs text-gray-600 bg-[#2A2A2A] px-2 py-0.5 rounded-full">{deal.category}</span>
                </div>
                <h4 className="font-bold text-white text-sm mb-1 line-clamp-2">{deal.title}</h4>
                <p className="text-gray-500 text-xs mb-3">{deal.business}</p>

                {deal.code && (
                  <button onClick={() => copyCode(deal.code)}
                    className="w-full flex items-center justify-between bg-[#0A0A0A] border border-[#2A2A2A] hover:border-orange-500/40 rounded-lg px-3 py-2 transition group/code">
                    <span className="text-orange-400 font-mono text-xs font-bold">{deal.code}</span>
                    <span className="text-xs text-gray-500 group-hover/code:text-orange-400 transition">
                      {copiedCode === deal.code ? '✓ Copied!' : 'Copy code'}
                    </span>
                  </button>
                )}

                <div className="flex items-center gap-1 mt-2.5">
                  <Clock className="w-3 h-3 text-gray-600" />
                  <span className="text-xs text-gray-600">Expires {deal.expires}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FEATURED REELS ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Video className="w-5 h-5 text-blue-400" /> Featured Reels
          </h3>
          <span className="text-xs text-gray-500">
            {loading ? 'Loading…' : `${reels.length} reel${reels.length !== 1 ? 's' : ''} live`}
          </span>
        </div>
        {!loading && reels.length === 0 && (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-8 text-center">
            <Video className="w-8 h-8 text-gray-700 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No featured reels published yet.</p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reels.map(reel => {
            const thumb = getThumbnail(reel);
            const isPlaying = playingReel === reel.id;
            const embedUrl = getEmbedUrl(reel);
            return (
              <div key={reel.id} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden hover:border-blue-500/30 transition group">
                {/* Video area */}
                <div className="relative aspect-video bg-[#0A0A0A]">
                  {isPlaying && embedUrl ? (
                    <iframe
                      src={embedUrl}
                      className="w-full h-full"
                      allowFullScreen
                      allow="autoplay; encrypted-media"
                      title={reel.title}
                    />
                  ) : (
                    <>
                      {thumb ? (
                        <img src={thumb} alt={reel.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-900/40 to-purple-900/40 flex items-center justify-center">
                          <Video className="w-12 h-12 text-blue-400/50" />
                        </div>
                      )}
                      {/* Play overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setPlayingReel(reel.id)}
                          className="w-14 h-14 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition transform hover:scale-110">
                          <Play className="w-6 h-6 text-white fill-white ml-1" />
                        </button>
                      </div>
                      {/* Platform badge */}
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded text-xs text-gray-300 capitalize">
                        {reel.platform || 'video'}
                      </div>
                      <div className="absolute top-2 right-2 px-2 py-0.5 bg-orange-500 rounded text-xs text-white font-bold">
                        Featured
                      </div>
                    </>
                  )}
                </div>
                {/* Info */}
                <div className="p-3">
                  <h4 className="font-semibold text-white text-sm truncate">{reel.title}</h4>
                  <p className="text-gray-500 text-xs mt-0.5">{(reel as any).business || (reel as any).addedBy || 'Black Phoenix'}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button onClick={() => setPlayingReel(isPlaying ? null : reel.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-xs font-semibold transition">
                      {isPlaying ? '⏹ Stop' : '▶ Play'}
                    </button>
                    {(reel as any).url && (
                      <a href={(reel as any).url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition">
                        <ExternalLink className="w-3 h-3" /> Original
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#2A2A2A]" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[#0A0A0A] px-4 text-xs text-gray-500 font-semibold uppercase tracking-widest">
            Create Your Own Deals & Reels Below
          </span>
        </div>
      </div>
    </div>
  );
}
