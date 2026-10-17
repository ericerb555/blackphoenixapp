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
  BadgeCheck, AlertCircle, ArrowUpRight, Tag,
} from 'lucide-react';
import { publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';
import SaveBusinessButton from '../components/exchange/SaveBusinessButton';
import FollowBusinessButton from '../components/exchange/FollowBusinessButton';
import { useSavedBusinesses } from '../lib/exchangeSaved';
import { useFollowedBusinesses } from '../lib/exchangeFollow';
import { EXCHANGE_CSS } from './exchangeStyles';
import { LISTING_CSS } from './exchangeListingStyles';
import { API_BASE_URL } from '../lib/apiConfig';

const SERVER = `${API_BASE_URL}/make-server-3eae23a6`;

interface ListingCategory { slug: string; name: string; section_slug?: string }

interface Listing {
  id: string;
  slug: string;
  name: string;
  claimed: boolean;
  /* Null unless the owner uploaded one AND a person approved it AND the claim
     still stands. The server decides all three; this screen only draws it. */
  logo: string | null;
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

  /* Whether this one is already on the resident's shelf, so the button does
     not invite them to keep something they have already kept. */
  const { savedIds, note: noteSaved } = useSavedBusinesses();
  const { followedIds, note: noteFollowed } = useFollowedBusinesses();
  const [listing, setListing] = useState<Listing | null>(null);
  /* What this business has on right now. Approved and inside its dates — the
     server decides both, so this page cannot show something unreviewed. */
  const [deals, setDeals] = useState<{
    id: string; title: string; body: string; startsAt: string; endsAt: string;
  }[]>([]);
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
          setDeals(Array.isArray(body.deals) ? body.deals : []);
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
          <div className="bpxl-mark" data-logo={!!listing.logo} aria-hidden="true">
            {/* The logo if there is one, and the generic mark otherwise. A map
                and a directory made entirely of the generic one still has to
                look finished, because on launch day that is exactly what they
                are: 18 of 1,108 listings are claimed. */}
            {listing.logo
              ? <img src={listing.logo} alt="" />
              : <Building2 className="w-7 h-7" />}
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
              {/*
                Saving sits beside the badges rather than among "Get in touch"
                below, because those are actions that reach the business and
                this one reaches nobody but the person pressing it.

                It was missing entirely until now, which made the account
                page's own words — "there is a save button on every listing" —
                untrue on the one screen where somebody would look for it.
              */}
              <SaveBusinessButton
                orgId={listing.id}
                name={listing.name}
                initiallySaved={savedIds.has(listing.id)}
                onChange={(saved) => noteSaved(listing.id, saved)}
              />
              {/*
                Offered only on a claimed listing. An unclaimed one is compiled
                from public records and can never publish a deal, so inviting
                somebody to hear from it would be promising something that
                cannot arrive.
              */}
              {listing.claimed && (
                <FollowBusinessButton
                  orgId={listing.id}
                  name={listing.name}
                  initiallyFollowing={followedIds.has(listing.id)}
                  onChange={(f) => noteFollowed(listing.id, f)}
                />
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
        {/*
          What they have on, directly under the name.

          Above everything else because it is the only perishable thing on the
          page — the phone number will be the same next week and the offer will
          not. Shown to signed-out visitors too: a deal nobody could see until
          they made an account would be a strange thing to have asked a
          business to write.
        */}
        {deals.length > 0 && (
          <section className="bpxl-deals">
            <h2 className="bpxl-h2">
              <Tag className="w-4 h-4" style={{ display: 'inline', marginRight: 6 }} />
              On at the moment
            </h2>
            {deals.map((deal) => (
              <div key={deal.id} className="bpxl-deal">
                <div className="bpxl-deal-title">{deal.title}</div>
                <div className="bpxl-deal-body">{deal.body}</div>
                <div className="bpxl-deal-until">
                  Until {new Date(deal.endsAt).toLocaleDateString(undefined, {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </div>
              </div>
            ))}
          </section>
        )}

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
