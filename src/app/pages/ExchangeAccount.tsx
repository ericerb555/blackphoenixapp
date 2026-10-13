/**
 * Phoenix Exchange — a resident's own account.
 *
 * The businesses they kept, and the record of who they got in touch with.
 * Deliberately two short lists rather than a dashboard: this is somebody's
 * own shelf, and the Exchange is free for them for ever, so there is nothing
 * here to upsell and no reason to pad it.
 *
 * WHAT IT PROMISES, IN WRITING
 *
 * The page says plainly that a business is never told who saved it or who
 * looked. That sentence is not decoration — it is the rule the server is built
 * to keep and the tests hold, and printing it where residents can read it is
 * the point of having it.
 *
 * WHY THE HISTORY IS NOT A LIST OF EVERYTHING
 *
 * The lead ledger records a view of every listing page. A history built from
 * all of it would be a list of everything somebody had so much as glanced at,
 * which is surveillance wearing the costume of a feature. The server drops
 * views and keeps actions — rang, opened a website, asked for a quote.
 *
 * SPACING NOTE: `p-*` and `m-*` compute to 0px application-wide — see the
 * comment on the reset in `globals.css`. Named classes and inline styles only.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Loader2, AlertCircle, ChevronLeft, Phone, Globe, Building2,
  Store, Bookmark, BookmarkX, History, LogIn, ShieldCheck, Tag, Bell,
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';
import { EXCHANGE_CSS } from './exchangeStyles';
import { BROWSE_CSS } from './exchangeBrowseStyles';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface Business {
  id: string;
  slug: string;
  name: string;
  claimed: boolean;
  phone: string | null;
  website: string | null;
  savedAt?: string;
}

interface Deal {
  id: string;
  title: string;
  body: string;
  startsAt: string;
  endsAt: string;
  business: Business;
}

interface Enquiry {
  id: string;
  what: string;
  at: string;
  business: Business;
}

/** A date as a person says it, not as a database stores it. */
function when(value: string): string {
  const at = Date.parse(value);
  if (!Number.isFinite(at)) return '';
  return new Date(at).toLocaleDateString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function ExchangeAccount() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [saved, setSaved] = useState<Business[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [following, setFollowing] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const authHeader = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? `Bearer ${session.access_token}` : null;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = await authHeader();
      if (!auth) { setSignedIn(false); setLoading(false); return; }
      setSignedIn(true);

      const [savedRes, enquiryRes, dealRes, followRes] = await Promise.all([
        fetch(`${SERVER}/exchange/me/saved`, { headers: { Authorization: auth } }),
        fetch(`${SERVER}/exchange/me/enquiries`, { headers: { Authorization: auth } }),
        fetch(`${SERVER}/exchange/me/deals`, { headers: { Authorization: auth } }),
        fetch(`${SERVER}/exchange/me/following`, { headers: { Authorization: auth } }),
      ]);
      const savedBody = await savedRes.json().catch(() => ({}));
      const enquiryBody = await enquiryRes.json().catch(() => ({}));
      const dealBody = await dealRes.json().catch(() => ({}));
      const followBody = await followRes.json().catch(() => ({}));

      // Reported rather than swallowed: "you have saved nothing" is a lie with
      // consequences if the truth is that the read failed.
      if (!savedRes.ok || !savedBody?.success) {
        setError(savedBody?.error || 'We could not read your saved businesses.');
        return;
      }
      setSaved(Array.isArray(savedBody.saved) ? savedBody.saved : []);
      setEnquiries(
        enquiryRes.ok && enquiryBody?.success && Array.isArray(enquiryBody.enquiries)
          ? enquiryBody.enquiries
          : [],
      );
      setDeals(
        dealRes.ok && dealBody?.success && Array.isArray(dealBody.deals) ? dealBody.deals : [],
      );
      setFollowing(
        followRes.ok && followBody?.success && Array.isArray(followBody.following)
          ? followBody.following
          : [],
      );
    } catch {
      setError('We could not reach the Exchange just now.');
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  useEffect(() => { void load(); }, [load]);

  const unsave = useCallback(async (orgId: string) => {
    setRemoving(orgId);
    try {
      const auth = await authHeader();
      if (!auth) return;
      const res = await fetch(`${SERVER}/exchange/me/saved/${encodeURIComponent(orgId)}`, {
        method: 'DELETE',
        headers: { Authorization: auth },
      });
      if (res.ok) setSaved((list) => list.filter((b) => b.id !== orgId));
    } catch {
      /* leaving it on the shelf is the safe failure */
    } finally {
      setRemoving(null);
    }
  }, [authHeader]);

  const listingHref = (slug: string) => `/exchange-listing?slug=${encodeURIComponent(slug)}`;

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
                <div className="bpx-card-title">Your Exchange</div>
                <div className="bpxb-section-tag">
                  The places you kept, and who you got in touch with
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

        {!loading && signedIn === false && (
          <div className="bpx-empty">
            <LogIn size={26} color="#9ca3af" />
            <div className="bpx-card-title">Sign in to see your Exchange</div>
            <div className="bpx-desc" style={{ maxWidth: 460 }}>
              Browsing the Exchange never needs an account, and it never will.
              An account only exists so that the businesses you keep and the
              people you contacted are still here next time.
            </div>
            <a className="bpx-btn bpx-btn-primary" href="/login">Sign in</a>
          </div>
        )}

        {!loading && signedIn && error && (
          <div className="bpx-empty">
            <AlertCircle size={26} color="#fca5a5" />
            <div className="bpx-card-title">{error}</div>
            <button className="bpx-btn" onClick={() => void load()}>Try again</button>
          </div>
        )}

        {!loading && signedIn && !error && (
          <>
            {/*
              Deals first, because it is the only part of this page that can
              have changed since the last visit. Saved businesses and history
              are the same as they were; an offer that ends on Friday is not.
            */}
            <div className="bpxb-section">
              <div className="bpxb-section-head">
                <div className="bpxb-section-name">
                  <Tag size={15} style={{ display: 'inline', marginRight: 6 }} />
                  Deals from places you follow
                </div>
                <div className="bpxb-section-tag">
                  {deals.length === 0 ? 'nothing on' : `${deals.length} on now`}
                </div>
              </div>

              {deals.length === 0 ? (
                <div className="bpxb-note">
                  {following.length === 0
                    ? 'Nothing here yet. On a claimed business\u2019s listing there is a "Get their deals" button — anything they run shows up here.'
                    : 'None of the businesses you follow has a deal on at the moment.'}
                </div>
              ) : (
                <div className="bpx-list">
                  {deals.map((deal) => (
                    <div key={deal.id} className="bpx-card">
                      <div className="bpx-card-body bpxb-deal">
                        <div className="bpxb-deal-title">{deal.title}</div>
                        <div className="bpxb-deal-body">{deal.body}</div>
                        <div className="bpxb-deal-when">
                          {deal.business.name} · until {when(deal.endsAt)}
                        </div>
                        <div className="bpxb-contact">
                          <a href={listingHref(deal.business.slug)}>
                            <Building2 size={13} /> {deal.business.name}
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── following ─────────────────────────────────────────────── */}
            {following.length > 0 && (
              <div className="bpxb-section">
                <div className="bpxb-section-head">
                  <div className="bpxb-section-name">
                    <Bell size={15} style={{ display: 'inline', marginRight: 6 }} />
                    Businesses you hear from
                  </div>
                  <div className="bpxb-section-tag">{following.length}</div>
                </div>
                <div className="bpxb-note">
                  {following.map((b) => b.name).join(' · ')}
                </div>
                <div className="bpxb-note">
                  To stop hearing from one, open its listing and press the
                  button again. None of them is ever told who follows it.
                </div>
              </div>
            )}

            {/* ── saved ─────────────────────────────────────────────────── */}
            <div className="bpxb-section">
              <div className="bpxb-section-head">
                <div className="bpxb-section-name">
                  <Bookmark size={15} style={{ display: 'inline', marginRight: 6 }} />
                  Saved businesses
                </div>
                <div className="bpxb-section-tag">
                  {saved.length === 0 ? 'nothing yet' : `${saved.length} kept`}
                </div>
              </div>

              {saved.length === 0 ? (
                <div className="bpxb-note">
                  Nothing saved yet. There is a save button on every listing —
                  it is a note to yourself, and the business is never told.
                </div>
              ) : (
                <div className="bpx-list">
                  {saved.map((biz) => (
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
                            {biz.savedAt && (
                              <div className="bpxb-note">Saved {when(biz.savedAt)}</div>
                            )}
                          </div>
                          <button
                            className="bpx-btn"
                            onClick={() => void unsave(biz.id)}
                            disabled={removing === biz.id}
                            aria-label={`Remove ${biz.name} from your saved businesses`}
                          >
                            {removing === biz.id
                              ? <Loader2 size={14} className="animate-spin" />
                              : <BookmarkX size={14} />}
                            Remove
                          </button>
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── history ───────────────────────────────────────────────── */}
            <div className="bpxb-section">
              <div className="bpxb-section-head">
                <div className="bpxb-section-name">
                  <History size={15} style={{ display: 'inline', marginRight: 6 }} />
                  Who you contacted
                </div>
                <div className="bpxb-section-tag">
                  {enquiries.length === 0 ? 'nothing yet' : `${enquiries.length} so far`}
                </div>
              </div>

              {enquiries.length === 0 ? (
                <div className="bpxb-note">
                  Nothing yet. When you ring a business from the Exchange, open
                  their website or ask for a quote, it appears here so you can
                  find them again.
                </div>
              ) : (
                <div className="bpx-list">
                  {enquiries.map((e) => (
                    <div key={e.id} className="bpx-card">
                      <div className="bpx-card-body bpxb-biz">
                        <div className="bpxb-biz-top">
                          <div style={{ minWidth: 0 }}>
                            <a
                              className="bpxb-biz-name"
                              href={listingHref(e.business.slug)}
                              style={{ color: 'inherit', textDecoration: 'none', display: 'block' }}
                            >
                              {e.business.name}
                            </a>
                            <div className="bpxb-note">{e.what} · {when(e.at)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/*
              The promise, where the people it is about can read it. The server
              is built to keep this and tests hold it; saying so out loud is
              the whole reason for having written it that way.
            */}
            <div className="bpxb-note" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <ShieldCheck size={14} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                This page is yours alone. A business can be told how many people
                saved it or got in touch — never who. We do not sell your details,
                and nobody is contacted on your behalf.
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
