/**
 * CampaignPage — public-facing AI advertorial / campaign landing page.
 *
 * Serves one published "Product Page Pilot" campaign as a focused, high-converting
 * funnel around a small set of products. Reached at `campaign?slug=<slug>` from the
 * storefront promo tiles, and reused by the admin for live preview via `previewCampaign`.
 */
import { useEffect, useState } from 'react';
import {
  Star, Check, ShoppingBag, ShieldCheck, Truck, RefreshCcw, ChevronRight, Loader2,
} from 'lucide-react';
import { publicAnonKey, projectId } from '../utils/supabase/info';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface CampaignProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  category?: string;
  rating?: number;
  reviews?: number;
  badge?: string;
}

interface CampaignContent {
  headline?: string;
  subheadline?: string;
  heroTagline?: string;
  ctaLabel?: string;
  benefits?: { title: string; body: string }[];
  story?: string;
  socialProof?: { quote: string; author: string }[];
  faq?: { q: string; a: string }[];
  urgency?: string;
  closingPitch?: string;
}

export interface Campaign {
  id: string;
  slug: string;
  title: string;
  accent?: string;
  products: CampaignProduct[];
  content: CampaignContent;
}

function getSlugFromUrl(): string {
  try {
    const qs = new URLSearchParams(window.location.search);
    const fromQuery = qs.get('slug');
    if (fromQuery) return fromQuery;
    const hash = window.location.hash || '';
    const m = /slug=([^&]+)/.exec(hash);
    if (m) return decodeURIComponent(m[1]);
  } catch (_) { /* ignore */ }
  return '';
}

export default function CampaignPage({ previewCampaign }: { previewCampaign?: Campaign } = {}) {
  const [campaign, setCampaign] = useState<Campaign | null>(previewCampaign || null);
  const [loading, setLoading] = useState(!previewCampaign);
  const [error, setError] = useState('');

  useEffect(() => {
    if (previewCampaign) { setCampaign(previewCampaign); setLoading(false); return; }
    const slug = getSlugFromUrl();
    if (!slug) { setError('No campaign specified.'); setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(`${SERVER}/page-pilot/by-slug/${encodeURIComponent(slug)}`, {
          headers: { Authorization: `Bearer ${publicAnonKey}`, apikey: publicAnonKey },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
        setCampaign(data.campaign);
      } catch (err: any) {
        console.error('[CampaignPage] failed to load campaign:', err);
        setError(err?.message || 'Failed to load this campaign page.');
      } finally {
        setLoading(false);
      }
    })();
  }, [previewCampaign]);

  // Fire-and-forget click tracking, and stash attribution so a resulting purchase
  // (which happens after a Stripe redirect) can be credited back to this campaign.
  const trackClick = () => {
    if (previewCampaign || !campaign) return;
    try {
      localStorage.setItem('pagePilotAttribution', JSON.stringify({ campaignId: campaign.id, slug: campaign.slug, ts: Date.now() }));
      fetch(`${SERVER}/page-pilot/track/${campaign.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${publicAnonKey}`, apikey: publicAnonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'click' }),
      }).catch(() => {});
    } catch (_) { /* ignore */ }
  };

  // Generic CTA → open the storefront.
  const goToStore = () => { trackClick(); (window as any).__navigateApp?.('public-store'); };

  // "Buy in place" — deep-link a specific product straight into the store cart.
  const shopProduct = (id: string) => { trackClick(); (window as any).__navigateApp?.(`public-store?add=${encodeURIComponent(id)}`); };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white/70">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading campaign…
      </div>
    );
  }
  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center text-center px-6">
        <p className="text-white/80 mb-4">{error || 'Campaign not found.'}</p>
        <button onClick={goToStore} className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#ea580c] to-[#dc2626] text-white font-medium">
          Visit the store
        </button>
      </div>
    );
  }

  const c = campaign.content || {};

  // Art direction chosen per product by /page-pilot/generate. Every campaign
  // used to render in this one layout with a single orange accent, so a camera,
  // a bridal dress and a Christmas tree all looked identical. The design block
  // drives palette, typography and layout; older campaigns generated before it
  // existed fall back to the previous look rather than breaking.
  const design = (c as any).design || {};
  const pal = design.palette || {};
  const accent = pal.accent || campaign.accent || '#ea580c';
  const accentDeep = pal.accentDeep || '#dc2626';
  const ground = pal.ground || '#ffffff';
  const surface = pal.surface || '#fafafa';
  const ink = pal.ink || '#171717';
  const archetype: string = design.archetype || 'editorial';
  const heroStyle: string = design.hero || 'split';

  // Typeface families per direction. These are stacks rather than webfonts —
  // the page must render the same offline and inside an email preview.
  const FAMILY: Record<string, string> = {
    serif: 'Iowan Old Style, Palatino, Georgia, serif',
    grotesk: 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
    condensed: '"Haettenschweiler", "Arial Narrow", Impact, ui-sans-serif, sans-serif',
    mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  };
  const displayFamily = FAMILY[design.display as string] || FAMILY.grotesk;

  // How loud the hero type is, by archetype. `bold` shouts, `luxe` whispers.
  const HEADLINE: Record<string, string> = {
    editorial: 'text-4xl md:text-5xl font-bold leading-tight tracking-tight',
    bold: 'text-5xl md:text-7xl font-black leading-[0.95] tracking-tighter uppercase',
    demo: 'text-3xl md:text-4xl font-bold leading-snug tracking-tight',
    story: 'text-4xl md:text-5xl font-semibold leading-tight',
    luxe: 'text-4xl md:text-5xl font-light leading-tight tracking-wide',
  };
  const headlineClass = HEADLINE[archetype] || HEADLINE.editorial;

  const softAccent = `${accent}1f`;
  const primary = campaign.products?.[0];
  // With a single featured product, the hero/closing CTA adds it straight to cart;
  // multi-product pages send shoppers to the store to choose.
  const primaryCta = () => (campaign.products.length === 1 && primary ? shopProduct(primary.id) : goToStore());

  // Hero composition varies by direction: `centered` and `stacked` put the copy
  // over/above the image, `split` keeps the classic two-column.
  const stackedHero = heroStyle === 'centered' || heroStyle === 'stacked';
  const fullBleed = heroStyle === 'full-bleed';

  const heroCopy = (
    <div className={stackedHero ? 'text-center max-w-3xl mx-auto' : ''}>
      {c.heroTagline && (
        <span className="inline-block text-xs font-bold tracking-widest uppercase mb-4 px-3 py-1 rounded-full"
              style={{ background: softAccent, color: accent }}>
          {c.heroTagline}
        </span>
      )}
      <h1 className={`${headlineClass} mb-4`} style={{ fontFamily: displayFamily, color: ink }}>
        {c.headline || campaign.title}
      </h1>
      {c.subheadline && (
        <p className="text-lg mb-6" style={{ color: `${ink}b0` }}>{c.subheadline}</p>
      )}
      {/* The five-star row is claim-like, so it is shown only where the direction
          is overtly promotional — a luxe or editorial page asserting "loved by
          thousands" with no data reads as cheap. */}
      {(archetype === 'bold' || archetype === 'demo') && (
        <div className={`flex items-center gap-1 mb-6 ${stackedHero ? 'justify-center' : ''}`}>
          {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" style={{ color: accent }} />)}
        </div>
      )}
      <button onClick={primaryCta}
        className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-white font-semibold shadow-lg hover:opacity-90 transition"
        style={{ background: `linear-gradient(90deg, ${accent}, ${accentDeep})` }}>
        <ShoppingBag className="w-5 h-5" /> {c.ctaLabel || 'Shop Now'}
      </button>
      {c.urgency && <p className="mt-3 text-sm font-medium" style={{ color: accent }}>{c.urgency}</p>}
    </div>
  );

  const heroImage = primary && (
    <ImageWithFallback
      src={primary.image}
      alt={primary.name}
      className={`w-full object-cover ${fullBleed ? 'aspect-[16/9] md:aspect-[21/9]' : 'rounded-2xl shadow-2xl aspect-square'}`}
    />
  );

  return (
    <div className="min-h-screen" style={{ background: ground, color: ink }}>
      {/* Hero */}
      {fullBleed ? (
        <section className="relative overflow-hidden">
          {heroImage}
          <div className="max-w-5xl mx-auto px-6 py-12 md:py-16">{heroCopy}</div>
        </section>
      ) : (
        <section className="relative overflow-hidden"
                 style={{ background: `linear-gradient(135deg, ${accent}14, ${ground} 60%)` }}>
          <div className={`max-w-5xl mx-auto px-6 py-16 md:py-24 ${
            stackedHero ? 'space-y-10' : 'grid md:grid-cols-2 gap-10 items-center'}`}>
            {heroCopy}
            {primary && <div className="relative">{heroImage}</div>}
          </div>
        </section>
      )}

      {/* Trust bar */}
      <div style={{ background: surface, borderTop: `1px solid ${ink}12`, borderBottom: `1px solid ${ink}12` }}>
        <div className="max-w-5xl mx-auto px-6 py-4 grid grid-cols-3 gap-4 text-center text-sm" style={{ color: `${ink}a0` }}>
          <div className="flex items-center justify-center gap-2"><Truck className="w-4 h-4" style={{ color: accent }} /> Fast shipping</div>
          <div className="flex items-center justify-center gap-2"><ShieldCheck className="w-4 h-4" style={{ color: accent }} /> Secure checkout</div>
          <div className="flex items-center justify-center gap-2"><RefreshCcw className="w-4 h-4" style={{ color: accent }} /> Easy returns</div>
        </div>
      </div>

      {/* Benefits — laid out per direction rather than always three centred circles */}
      {!!(c.benefits && c.benefits.length) && (
        <section className="max-w-5xl mx-auto px-6 py-16">
          <div className={archetype === 'demo' || archetype === 'story'
            ? 'space-y-5 max-w-3xl mx-auto'
            : 'grid md:grid-cols-3 gap-8'}>
            {c.benefits.map((b, i) => {
              const inline = archetype === 'demo' || archetype === 'story';
              return (
                <div key={i} className={inline ? 'flex gap-4 items-start' : 'text-center'}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${inline ? '' : 'mx-auto mb-4'}`}
                       style={{ background: softAccent }}>
                    <Check className="w-6 h-6" style={{ color: accent }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2" style={{ fontFamily: displayFamily, color: ink }}>{b.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: `${ink}b0` }}>{b.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Worth knowing — the entertaining half. Only true, checkable facts;
          the generator is told never to invent statistics. */}
      {!!((c as any).funFacts && (c as any).funFacts.length) && (
        <section className="py-14" style={{ background: surface }}>
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-xs font-bold tracking-widest uppercase mb-5" style={{ color: accent }}>
              Worth knowing
            </h2>
            <ul className="space-y-3">
              {(c as any).funFacts.map((f: string, i: number) => (
                <li key={i} className="flex gap-3 items-start">
                  <span className="font-bold tabular-nums shrink-0" style={{ color: accent }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-lg leading-relaxed" style={{ color: `${ink}d0` }}>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Advertorial story */}
      {c.story && (
        <section className="py-16" style={{ background: ground }}>
          <div className="max-w-3xl mx-auto px-6">
            {c.story.split('\n\n').map((para, i) => (
              <p key={i} className="leading-relaxed mb-4 text-lg"
                 style={{ color: `${ink}c8`, fontFamily: design.display === 'serif' ? displayFamily : undefined }}>
                {para}
              </p>
            ))}
          </div>
        </section>
      )}

      {/* Featured products */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold mb-8 text-center">Featured in this collection</h2>
        <div className={`grid gap-6 ${campaign.products.length === 1 ? 'max-w-sm mx-auto' : campaign.products.length === 2 ? 'sm:grid-cols-2 max-w-2xl mx-auto' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
          {campaign.products.map((p) => (
            <div key={p.id} className="rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-xl transition group">
              <div className="relative aspect-square overflow-hidden bg-neutral-100">
                <ImageWithFallback src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                {p.badge && <span className="absolute top-3 left-3 px-2 py-1 text-xs font-bold rounded text-white" style={{ background: accent }}>{p.badge}</span>}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-sm mb-1 line-clamp-2">{p.name}</h3>
                {typeof p.rating === 'number' && (
                  <div className="flex items-center gap-1 mb-2 text-xs text-neutral-500">
                    <Star className="w-3.5 h-3.5 fill-current" style={{ color: accent }} /> {p.rating}
                    {p.reviews ? ` (${p.reviews})` : ''}
                  </div>
                )}
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="font-bold text-lg">${p.price}</span>
                  {p.originalPrice && <span className="text-sm text-neutral-400 line-through">${p.originalPrice}</span>}
                </div>
                <button onClick={() => shopProduct(p.id)} className="w-full py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition" style={{ background: `linear-gradient(90deg, ${accent}, #dc2626)` }}>
                  Add to cart
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof */}
      {!!(c.socialProof && c.socialProof.length) && (
        <section className="py-16" style={{ background: surface }}>
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-2xl font-bold mb-8 text-center"
                style={{ fontFamily: displayFamily, color: ink }}>What customers are saying</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {c.socialProof.map((t, i) => (
                <div key={i} className="rounded-2xl p-6"
                     style={{ background: ground, border: `1px solid ${ink}18` }}>
                  <div className="flex gap-1 mb-3">
                    {[...Array(5)].map((_, s) => <Star key={s} className="w-4 h-4 fill-current" style={{ color: accent }} />)}
                  </div>
                  <p className="italic mb-4" style={{ color: `${ink}c8` }}>“{t.quote}”</p>
                  <p className="text-sm font-semibold" style={{ color: `${ink}90` }}>— {t.author}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      {!!(c.faq && c.faq.length) && (
        <section className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="text-2xl font-bold mb-8 text-center"
              style={{ fontFamily: displayFamily, color: ink }}>Frequently asked</h2>
          <div className="space-y-4">
            {c.faq.map((f, i) => (
              <details key={i} className="group rounded-xl p-4" style={{ border: `1px solid ${ink}20` }}>
                <summary className="flex items-center justify-between cursor-pointer font-semibold list-none"
                         style={{ color: ink }}>
                  {f.q}
                  <ChevronRight className="w-5 h-5 transition group-open:rotate-90" style={{ color: `${ink}70` }} />
                </summary>
                <p className="mt-3 leading-relaxed" style={{ color: `${ink}b0` }}>{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Closing CTA */}
      <section className="py-16" style={{ background: `linear-gradient(135deg, ${accent}, #dc2626)` }}>
        <div className="max-w-2xl mx-auto px-6 text-center text-white">
          {c.closingPitch && <p className="text-lg mb-6 opacity-95">{c.closingPitch}</p>}
          <button onClick={primaryCta} className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white font-bold text-lg hover:opacity-90 transition" style={{ color: accent }}>
            <ShoppingBag className="w-5 h-5" /> {c.ctaLabel || 'Shop Now'}
          </button>
          {c.urgency && <p className="mt-4 text-sm opacity-90">{c.urgency}</p>}
        </div>
      </section>
    </div>
  );
}
