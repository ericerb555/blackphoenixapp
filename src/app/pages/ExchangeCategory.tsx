/**
 * Phoenix Exchange — the businesses in one category.
 *
 * The middle of the funnel: the directory sends a resident here, and this page
 * sends them to a listing. It is also where the demand ledger earns its keep,
 * because every view of this page is a row — and the rows with no results are
 * the valuable ones.
 *
 * THE EMPTY STATE IS THE MOST IMPORTANT PART OF THIS FILE
 *
 * On launch day most categories have nobody in them. An empty category is the
 * single most damaging moment in a young directory: it tells a resident the
 * whole thing is useless, and they do not come back to check whether it filled
 * up.
 *
 * So the empty state asks the question out loud — "who were you looking for?"
 * — and posts it to `/exchange/missing`. That turns the worst moment into the
 * most useful row in the database: a named business a real person wanted in a
 * named town. That route existed with no caller until now, which meant the gap
 * was invisible to us as well as unhelpful to them.
 *
 * LISTED AND CLAIMED LOOK DIFFERENT, ON PURPOSE
 *
 * A resident deserves to know whether anybody stands behind the details they
 * are about to ring. A claimed listing says so; a compiled one says it is from
 * public records and offers the owner a way to take it over. The quiet
 * treatment has to read as deliberate rather than half-built, because most of
 * the directory is in it at the start.
 *
 * CONTACT DETAILS ARE SIMPLY SHOWN. Hiding a phone number behind a form is the
 * most resented thing the lead-resale sites do, and copying it would undo the
 * whole positioning. The listing page counts the tap; this page just shows it.
 *
 * SPACING NOTE: `p-*` and `m-*` compute to 0px application-wide — see the
 * comment on the reset in `globals.css`. This page names its own classes.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Loader2, AlertCircle, ChevronLeft, Phone, Globe, BadgeCheck,
  Building2, Store, Send, MapPin,
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';
import { EXCHANGE_CSS } from './exchangeStyles';
import { BROWSE_CSS } from './exchangeBrowseStyles';
import { readTown, townName } from '../lib/exchangeTowns';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface Listing {
  id: string;
  slug: string;
  name: string;
  claimed: boolean;
  source: string | null;
  phone: string | null;
  website: string | null;
  categories: { slug: string; name: string }[];
  credentials: {
    licenceVerified: boolean;
    insuranceInDate: boolean;
    licenceState: string | null;
  };
}

interface CategoryInfo {
  id: string;
  slug: string;
  name: string;
  section_slug: string;
  parent_id: string | null;
}

export default function ExchangeCategory() {
  const slug = useMemo(
    () => new URLSearchParams(window.location.search).get('slug') || '',
    [],
  );
  const town = useMemo(() => readTown(), []);
  const currentTown = useMemo(() => townName(town), [town]);

  const [category, setCategory] = useState<CategoryInfo | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [missing, setMissing] = useState('');
  const [sending, setSending] = useState(false);
  const [said, setSaid] = useState<{ ok: boolean; text: string } | null>(null);

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
      if (!slug) { setError('No category was named.'); setLoading(false); return; }
      try {
        const query = town ? `?territory=${encodeURIComponent(town)}` : '';
        const res = await fetch(
          `${SERVER}/exchange/category/${encodeURIComponent(slug)}${query}`,
          { headers: { Authorization: await authHeader() } },
        );
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok || !body?.success) {
          setError(body?.error || 'We could not find that category.');
        } else {
          setCategory(body.category ?? null);
          setListings(Array.isArray(body.listings) ? body.listings : []);
        }
      } catch {
        if (!cancelled) setError('We could not reach the Exchange just now.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [slug, town, authHeader]);

  const tellUs = useCallback(async () => {
    const phrase = missing.trim();
    if (!phrase) return;

    setSending(true);
    setSaid(null);
    try {
      const res = await fetch(`${SERVER}/exchange/missing`, {
        method: 'POST',
        headers: { Authorization: await authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phrase,
          territory: town || null,
          surface: `category:${slug}`,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        setSaid({ ok: false, text: body?.error || 'We could not record that.' });
        return;
      }
      setMissing('');
      setSaid({ ok: true, text: 'Thank you — that is on our list to go and find.' });
    } catch {
      setSaid({ ok: false, text: 'We could not reach the Exchange just now.' });
    } finally {
      setSending(false);
    }
  }, [missing, town, slug, authHeader]);

  const listingHref = (s: string) => `/exchange-listing?slug=${encodeURIComponent(s)}`;

  return (
    <div className="bpx">
      <style>{EXCHANGE_CSS}</style>
      <style>{BROWSE_CSS}</style>

      <div className="bpx-shell">
        <a className="bpxb-crumb" href="/exchange">
          <ChevronLeft size={14} /> All of Phoenix Exchange
        </a>

        <div className="bpx-masthead">
          <div className="bpx-masthead-row">
            <div className="bpx-brand">
              <div className="bpx-mark"><Store size={23} color="#fff" /></div>
              <div style={{ minWidth: 0 }}>
                <div className="bpx-card-title">
                  {loading ? 'Loading…' : category?.name || 'Category'}
                </div>
                <div className="bpxb-section-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={12} /> {currentTown}
                  {!loading && !error && ` · ${listings.length} ${listings.length === 1 ? 'business' : 'businesses'}`}
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="bpx-empty">
            <Loader2 size={24} className="animate-spin" color="#9ca3af" />
            <div className="bpx-desc">Looking…</div>
          </div>
        )}

        {!loading && error && (
          <div className="bpx-empty">
            <AlertCircle size={26} color="#fca5a5" />
            <div className="bpx-card-title">{error}</div>
            <a className="bpx-btn" href="/exchange">Back to the directory</a>
          </div>
        )}

        {!loading && !error && listings.length > 0 && (
          <div className="bpx-list">
            {listings.map((biz) => (
              <div key={biz.id} className="bpx-card">
                <div className="bpx-card-body bpxb-biz" data-claimed={biz.claimed}>
                  <div className="bpxb-biz-top">
                    <div style={{ minWidth: 0 }}>
                      <a
                        className="bpxb-biz-name"
                        href={listingHref(biz.slug)}
                        style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}
                      >
                        {biz.name}
                      </a>
                      {biz.categories.length > 0 && (
                        <div className="bpxb-note">
                          {biz.categories.map((c) => c.name).join(' · ')}
                        </div>
                      )}
                    </div>
                    <div className="bpx-tags">
                      {biz.credentials.licenceVerified && (
                        <span className="bpx-pill bpxb-pill-claimed">
                          <BadgeCheck size={11} style={{ display: 'inline', marginRight: 3 }} />
                          Licence verified
                        </span>
                      )}
                      <span className={`bpx-pill ${biz.claimed ? 'bpxb-pill-claimed' : 'bpxb-pill-listed'}`}>
                        {biz.claimed ? 'Claimed' : 'Public record'}
                      </span>
                    </div>
                  </div>

                  <div className="bpxb-contact">
                    {biz.phone && (
                      <a href={`tel:${biz.phone.replace(/[^\d+]/g, '')}`}>
                        <Phone size={13} /> {biz.phone}
                      </a>
                    )}
                    {biz.website && (
                      <a href={biz.website} target="_blank" rel="noopener noreferrer nofollow ugc">
                        <Globe size={13} /> Website
                      </a>
                    )}
                    <a href={listingHref(biz.slug)}>
                      <Building2 size={13} /> Full listing
                    </a>
                  </div>

                  {!biz.claimed && (
                    <div className="bpxb-note">
                      Compiled from public records. Nobody has claimed this listing
                      yet, so only what the record holds is shown.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && listings.length > 0 && (
          /* ODbL: compiled listings carry OpenStreetMap data, and the credit
             is a licence term. */
          <div className="bpxb-note">
            Compiled listings include data from {'© OpenStreetMap contributors'}.
          </div>
        )}
        {/*
          The empty state. Deliberately not a shrug: it says plainly that we
          have nobody, and asks who they wanted — which is the row that becomes
          a recruitment call.
        */}
        {!loading && !error && listings.length === 0 && (
          <div className="bpx-empty">
            <Store size={26} color="#9ca3af" />
            <div className="bpx-card-title">
              Nobody here yet{category ? ` for ${category.name.toLowerCase()}` : ''}
            </div>
            <div className="bpx-desc" style={{ maxWidth: 440 }}>
              We are building this directory town by town, and this category has
              no one in it {town ? `in ${currentTown}` : 'yet'}. If you know who
              should be here, tell us and we will go and find them.
            </div>

            <div className="bpxb-missing">
              <input
                type="text"
                placeholder="Who were you looking for?"
                value={missing}
                maxLength={300}
                onChange={(e) => setMissing(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void tellUs(); }}
              />
              <button
                className="bpx-btn bpx-btn-primary"
                disabled={sending || !missing.trim()}
                onClick={() => void tellUs()}
              >
                {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                Tell us who is missing
              </button>
              {said && (
                <div className={said.ok ? 'bpxb-said' : 'bpxb-failed'}>{said.text}</div>
              )}
              <div className="bpxb-note">
                We use this to decide who to approach next. It is not published
                anywhere and nobody is contacted on your behalf.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
