/**
 * CampaignPromoStrip — surfaces published "Product Page Pilot" campaign pages
 * as promoted banners inside the storefront. Clicking a tile opens the advertorial
 * campaign page. Renders nothing when there are no published campaigns.
 */
import { useEffect, useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { publicAnonKey, projectId } from '../utils/supabase/info';
import { ImageWithFallback } from './figma/ImageWithFallback';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

export function CampaignPromoStrip() {
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${SERVER}/page-pilot/list`, {
          headers: { Authorization: `Bearer ${publicAnonKey}`, apikey: publicAnonKey },
        });
        if (!res.ok) return;
        const data = await res.json();
        setCampaigns((data.campaigns || []).filter((c: any) => c.status === 'published').sort((a: any, b: any) => (a.slot || 99) - (b.slot || 99)));
      } catch (_) { /* silent — promo strip is best-effort */ }
    })();
  }, []);

  if (!campaigns.length) return null;

  const open = (slug: string) => (window as any).__navigateApp?.(`campaign?slug=${encodeURIComponent(slug)}`);

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-orange-400" />
        <h2 className="text-sm font-bold text-white uppercase tracking-wide">Featured Collections</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {campaigns.map((c) => {
          const accent = c.accent || '#ea580c';
          const hero = c.products?.[0]?.image;
          return (
            <button key={c.id} onClick={() => open(c.slug)}
              className="group relative text-left rounded-2xl overflow-hidden border border-white/10 min-h-[132px] hover:border-white/25 transition">
              {hero && <ImageWithFallback src={hero} alt={c.title} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-50 group-hover:scale-105 transition" />}
              <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accent}dd, #000000aa)` }} />
              <div className="relative p-4 flex flex-col h-full justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">{c.content?.heroTagline || 'Featured'}</span>
                  <h3 className="text-white font-black text-lg leading-tight mt-1 line-clamp-2">{c.content?.headline || c.title}</h3>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-white/80">{(c.products || []).length} product{(c.products || []).length !== 1 ? 's' : ''}</span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-white/15 px-3 py-1.5 rounded-full group-hover:bg-white/25 transition">
                    Shop <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
