/**
 * Phoenix Exchange — a business's public page.
 *
 * The most important page on the platform, and the reason to build it before
 * the home page. It is what a search engine indexes, what a business puts on
 * their van, where a searcher turns into a lead, and the page a business
 * judges the product by when deciding whether to claim their listing.
 * Everything else — search, the map, the sections — only exists to deliver
 * somebody here.
 *
 * THREE STATES, AND THE SPARSE ONE MATTERS MOST
 *
 *   LISTED      compiled from public records, nobody has claimed it. Name,
 *               category, phone, website. Nothing else, because nothing else
 *               can be trusted before an owner stands behind it.
 *   CLAIMED     the owner proved control. Verified badges, and the contact
 *               details are theirs to correct.
 *   SUBSCRIBED  placement and promotion on top, which arrive in a later
 *               phase. Rendered the same as claimed for now.
 *
 * The listed state has to look DELIBERATE rather than broken. On launch day
 * most of the directory is in it, and a page that reads as half-built says
 * the whole platform is half-built. So the sparse version says plainly what
 * it is — a public-record listing — and offers the owner a way to take it
 * over, which is the recruitment funnel.
 *
 * WHY THE CONTACT DETAILS ARE SIMPLY SHOWN
 *
 * Hiding a phone number behind a form is the most resented thing the
 * lead-resale sites do. Nothing here is withheld to force a funnel: the
 * number is on the page. Tapping it tells the server, which is how the lead
 * is counted without taking anything away from the visitor.
 *
 * SPACING NOTE: `p-*` and `m-*` compute to 0px application-wide — see the
 * comment on the reset in `globals.css`. This page names its own classes, the
 * same way `BidRoom.tsx` does.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MapPin, Phone, Globe, ShieldCheck, Loader2, Building2,
  BadgeCheck, AlertCircle, ArrowUpRight,
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';
import { EXCHANGE_CSS } from './exchangeStyles';
import { LISTING_CSS } from './exchangeListingStyles';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface ListingCategory { slug: string; name: string; section_slug?: string }

interface Listing {
  id: string;
  slug: string;
  name: string;
  claimed: boolean;
  source: string | null;
  phone: string | null;
  website: string | null;
  location: { lat: number; lng: number } | null;
  categories: ListingCategory[];
  credentials: {
    licenceVerified: boolean;
    insuranceInDate: boolean;
    licenceState: string | null;
  };
}

export default function ExchangeListing() {
  const slug = useMemo(
    () => new URLSearchParams(window.location.search).get('slug') || '',
    [],
  );

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  /**
   * The session is used when there is one and not required when there is
   * not. These pages are for people who have not signed up — that is the
   * whole point of them being indexable.
   */
  const authHeader = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return `Bearer ${session?.access_token || publicAnonKey}`;
    } catch {
      return `Bearer ${publicAnonKey}`;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!slug) { setError('No business was named.'); setLoading(false); return; }
      try {
        const res = await fetch(`${SERVER}/exchange/listing/${encodeURIComponent(slug)}`, {
          headers: { Authorization: await authHeader() },
        });
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok || !body?.success) {
          setError(body?.error || 'We could not find that business.');
        } else {
          setListing(body.listing);
        }
      } catch {
        if (!cancelled) setError('We could not reach the Exchange just now.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [slug, authHeader]);

  /**
   * Tell the server a contact happened. Fire and forget: a lead that is not
   * recorded costs a row, and a lead that fails to open the phone app
   * because recording failed costs the customer.
   */
  const tellServer = useCallback(async (kind: 'revealed' | 'called' | 'website') => {
    try {
      await fetch(`${SERVER}/exchange/listing/${encodeURIComponent(slug)}/contact`, {
        method: 'POST',
        headers: { Authorization: await authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, surface: 'profile' }),
      });
    } catch { /* never block the visitor on this */ }
  }, [slug, authHeader]);

  if (loading) {
    return (
      <div className="bpx bpxl">
        <style>{EXCHANGE_CSS}{LISTING_CSS}</style>
        <div className="bpxl-centre">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="bpx bpxl">
        <style>{EXCHANGE_CSS}{LISTING_CSS}</style>
        <div className="bpxl-centre bpxl-stack">
          <AlertCircle className="w-7 h-7" />
          <p className="bpxl-lede">{error || 'We could not find that business.'}</p>
          <a className="bpxl-btn bpxl-btn-ghost" href="/bid-room">Back to the Exchange</a>
        </div>
      </div>
    );
  }

  const { credentials } = listing;
  const trade = listing.categories[0]?.name ?? 'Local business';

  return (
    <div className="bpx bpxl">
      <style>{EXCHANGE_CSS}{LISTING_CSS}</style>

      <div className="bpxl-shell">
        <header className="bpxl-head">
          <div className="bpxl-mark" aria-hidden="true">
            {/* Until a logo is uploaded, the category's own mark. A map and a
                directory made entirely of these still has to look finished,
                because on launch day that is exactly what they are. */}
            <Building2 className="w-7 h-7" />
          </div>

          <div className="bpxl-headtext">
            <h1 className="bpxl-name">{listing.name}</h1>
            <p className="bpxl-trade">{trade}</p>

            <div className="bpxl-badges">
              {credentials.licenceVerified && (
                <span className="bpxl-badge bpxl-badge-good">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Licence verified{credentials.licenceState ? ` · ${credentials.licenceState}` : ''}
                </span>
              )}
              {credentials.insuranceInDate && (
                <span className="bpxl-badge bpxl-badge-good">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  Insured
                </span>
              )}
              {!listing.claimed && (
                <span className="bpxl-badge bpxl-badge-quiet">Public record listing</span>
              )}
            </div>
          </div>
        </header>

        {/*
          The sparse state, said out loud.

          A listed business has no description, no hours and no photographs
          because none of that has been stood behind by an owner. Saying so
          is what makes the page read as deliberate instead of unfinished —
          and it is where the recruitment funnel starts.
        */}
        {!listing.claimed && (
          <section className="bpxl-claim">
            <div>
              <h2 className="bpxl-claim-title">Is this your business?</h2>
              <p className="bpxl-claim-body">
                This listing was compiled from public records, so it only shows what
                those records say. Claim it to add your logo, photographs, hours and
                deals — and to see the people who have been looking for you.
              </p>
            </div>
            {/* Phase 3 landed, so this is a real link. It opens a page that explains
                what claiming involves and asks for a sign-in — it does NOT start
                anything on arrival, because starting a claim on a listing somebody
                already holds emails the current owner. */}
            <a className="bpxl-btn" href={`/exchange-claim?slug=${encodeURIComponent(slug)}`}>
              Claim this listing
            </a>
          </section>
        )}

        <section className="bpxl-contact">
          <h2 className="bpxl-h2">Get in touch</h2>

          <div className="bpxl-rows">
            {listing.phone ? (
              <a
                className="bpxl-row"
                href={`tel:${listing.phone.replace(/\D/g, '')}`}
                onClick={() => { setRevealed(true); void tellServer('called'); }}
              >
                <Phone className="w-4 h-4" />
                <span className="bpxl-row-value">{listing.phone}</span>
                <ArrowUpRight className="w-4 h-4 bpxl-row-go" />
              </a>
            ) : (
              <div className="bpxl-row bpxl-row-empty">
                <Phone className="w-4 h-4" />
                <span className="bpxl-row-value">No phone number on record</span>
              </div>
            )}

            {listing.website && (
              <a
                className="bpxl-row"
                href={listing.website}
                target="_blank"
                /* A member's site must not be able to reach back into this
                   page, and a spammy or hacked domain must not drag the
                   Exchange's own search ranking down with it. */
                rel="noopener noreferrer nofollow ugc"
                onClick={() => void tellServer('website')}
              >
                <Globe className="w-4 h-4" />
                <span className="bpxl-row-value">{prettyHost(listing.website)}</span>
                <ArrowUpRight className="w-4 h-4 bpxl-row-go" />
              </a>
            )}

            {listing.location && (
              <div className="bpxl-row bpxl-row-empty">
                <MapPin className="w-4 h-4" />
                <span className="bpxl-row-value">
                  {listing.location.lat.toFixed(3)}, {listing.location.lng.toFixed(3)}
                </span>
              </div>
            )}
          </div>

          {revealed && (
            <p className="bpxl-note">
              We never sell your details on, and this business was not charged for
              your call.
            </p>
          )}
        </section>

        {listing.categories.length > 0 && (
          <section className="bpxl-cats">
            <h2 className="bpxl-h2">What they do</h2>
            <div className="bpxl-chips">
              {/* Category pages are the next piece of phase 2. Inert until
                  they exist, for the same reason as the claim button. */}
              {listing.categories.map((category) => (
                <span key={category.slug} className="bpxl-chip">{category.name}</span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/** `https://suttonroofing.com/about` reads better as `suttonroofing.com`. */
function prettyHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
