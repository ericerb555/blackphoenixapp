/**
 * Phoenix Exchange — a business publishing a deal.
 *
 * Reachable only by somebody holding a granted claim on a listing, which the
 * server decides. The screen asks rather than assumes: it loads what you have
 * claimed and says plainly when that is nothing.
 *
 * WHAT THIS SCREEN IS CAREFUL TO SAY
 *
 * That a deal is reviewed before anybody sees it. A business that submits one
 * and then watches nothing happen will assume the feature is broken, so the
 * waiting is named as a step rather than left as a silence. And when a deal is
 * turned down the reason is shown, because "rejected" with no explanation just
 * produces the same deal submitted again.
 *
 * WHY AN APPROVED DEAL CANNOT BE EDITED HERE
 *
 * It can only be withdrawn and submitted again. That is deliberate and the
 * server enforces it: if a business could edit after approval, what residents
 * see would not be what a person reviewed, and the review would be a formality
 * anybody could walk past.
 *
 * SPACING NOTE: `p-*` and `m-*` compute to 0px application-wide — see the
 * comment on the reset in `globals.css`.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Loader2, AlertCircle, ChevronLeft, Store, Tag, Send, Undo2, Building2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EXCHANGE_CSS } from './exchangeStyles';
import { BROWSE_CSS } from './exchangeBrowseStyles';
import ExchangeLogoPanel from '../components/exchange/ExchangeLogoPanel';
import { API_BASE_URL } from '../lib/apiConfig';

const SERVER = `${API_BASE_URL}/make-server-3eae23a6`;

interface Listing { id: string; slug: string; name: string; claimed: boolean }
interface Deal {
  id: string;
  orgId: string;
  title: string;
  body: string;
  startsAt: string;
  endsAt: string;
  state: string;
  live: boolean;
  decisionNote: string | null;
}

const STATE_WORDS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Waiting for review',
  approved: 'Approved',
  rejected: 'Not approved',
  withdrawn: 'Withdrawn',
};

function when(value: string): string {
  const at = Date.parse(value);
  if (!Number.isFinite(at)) return '';
  return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Today and a fortnight out, as the date inputs want them. */
function isoDay(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export default function ExchangeBusinessDeals() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [orgId, setOrgId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [startsAt, setStartsAt] = useState(isoDay(0));
  const [endsAt, setEndsAt] = useState(isoDay(14));
  const [sending, setSending] = useState(false);
  const [said, setSaid] = useState<{ ok: boolean; text: string } | null>(null);

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

      const res = await fetch(`${SERVER}/exchange/business/deals`, { headers: { Authorization: auth } });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) {
        setError(payload?.error || 'We could not read your deals.');
        return;
      }
      const mine: Listing[] = Array.isArray(payload.listings) ? payload.listings : [];
      setListings(mine);
      setDeals(Array.isArray(payload.deals) ? payload.deals : []);
      setOrgId((current) => current || (mine[0]?.id ?? ''));
    } catch {
      setError('We could not reach the Exchange just now.');
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  useEffect(() => { void load(); }, [load]);

  const submit = useCallback(async () => {
    setSending(true);
    setSaid(null);
    try {
      const auth = await authHeader();
      if (!auth) { setSaid({ ok: false, text: 'Sign in first.' }); return; }

      const res = await fetch(`${SERVER}/exchange/business/deals`, {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId,
          title,
          body,
          // The date inputs give a day; a deal runs to the END of its last day,
          // not to midnight at the start of it.
          startsAt: new Date(`${startsAt}T00:00:00`).toISOString(),
          endsAt: new Date(`${endsAt}T23:59:59`).toISOString(),
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) {
        setSaid({ ok: false, text: payload?.error || 'That did not save.' });
        return;
      }
      setTitle('');
      setBody('');
      setSaid({ ok: true, text: 'Sent for review. Nobody sees it until it is approved.' });
      await load();
    } catch {
      setSaid({ ok: false, text: 'We could not reach the Exchange just now.' });
    } finally {
      setSending(false);
    }
  }, [authHeader, orgId, title, body, startsAt, endsAt, load]);

  const move = useCallback(async (id: string, to: string) => {
    try {
      const auth = await authHeader();
      if (!auth) return;
      const res = await fetch(`${SERVER}/exchange/business/deals/${encodeURIComponent(id)}/move`, {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to }),
      });
      if (res.ok) await load();
    } catch {
      /* the list is reloaded on the next action */
    }
  }, [authHeader, load]);

  const nameFor = useMemo(() => {
    const byId = new Map(listings.map((l) => [l.id, l.name]));
    return (id: string) => byId.get(id) ?? 'your business';
  }, [listings]);

  const canSubmit = orgId && title.trim().length >= 3 && body.trim().length >= 3 && !sending;

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
              <div className="bpx-mark"><Tag size={23} color="#fff" /></div>
              <div style={{ minWidth: 0 }}>
                <div className="bpx-card-title">Your deals</div>
                <div className="bpxb-section-tag">
                  Offers for residents who follow you
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
            <Store size={26} color="#9ca3af" />
            <div className="bpx-card-title">Sign in to publish a deal</div>
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

        {/*
          No claim, no deals — and said as a next step rather than a refusal,
          because claiming is exactly what we want this person to go and do.
        */}
        {!loading && signedIn && !error && listings.length === 0 && (
          <div className="bpx-empty">
            <Building2 size={26} color="#9ca3af" />
            <div className="bpx-card-title">Claim your listing first</div>
            <div className="bpx-desc" style={{ maxWidth: 460 }}>
              Only a claimed business can publish a deal — a listing compiled
              from public records has nobody standing behind it. Claiming takes
              a couple of minutes and is free.
            </div>
            <a className="bpx-btn bpx-btn-primary" href="/exchange">Find your listing</a>
          </div>
        )}

        {!loading && signedIn && !error && listings.length > 0 && (
          <>
            {/*
              Above the deal form on purpose. A business that has just claimed
              its listing wants the visible thing first, and a logo is the only
              reward claiming currently offers; a deal is work they may never
              get round to.
            */}
            <ExchangeLogoPanel orgId={orgId} auth={authHeader} />

            <div className="bpxb-section">
              <div className="bpxb-section-head">
                <div className="bpxb-section-name">A new deal</div>
                <div className="bpxb-section-tag">reviewed before anybody sees it</div>
              </div>

              <div className="bpxb-form">
                {listings.length > 1 && (
                  <label>
                    Which business
                    <select
                      value={orgId}
                      onChange={(e) => setOrgId(e.target.value)}
                      style={{
                        padding: '10px 13px', borderRadius: 11, fontSize: 14,
                        background: 'var(--bpx-raised)', color: 'var(--bpx-text)',
                        border: '1px solid var(--bpx-line)',
                      }}
                    >
                      {listings.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                  </label>
                )}

                <label>
                  What is the offer
                  <input
                    type="text"
                    value={title}
                    maxLength={120}
                    placeholder="Ten percent off boots"
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>

                <label>
                  The detail
                  <textarea
                    value={body}
                    maxLength={2000}
                    placeholder="For anyone who found us on the Exchange. Mention it at the till."
                    onChange={(e) => setBody(e.target.value)}
                  />
                </label>

                <div className="bpxb-form-row">
                  <label>
                    Starts
                    <input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
                  </label>
                  <label>
                    Ends
                    <input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
                  </label>
                </div>

                <button
                  className="bpx-btn bpx-btn-primary"
                  disabled={!canSubmit}
                  onClick={() => void submit()}
                >
                  {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  Send for review
                </button>

                {said && <div className={said.ok ? 'bpxb-said' : 'bpxb-failed'}>{said.text}</div>}

                <div className="bpxb-note">
                  Every deal is read by a person before it appears. That is how
                  residents can trust what they see here, and it usually takes
                  less than a day.
                </div>
              </div>
            </div>

            <div className="bpxb-section">
              <div className="bpxb-section-head">
                <div className="bpxb-section-name">Everything you have sent</div>
                <div className="bpxb-section-tag">{deals.length}</div>
              </div>

              {deals.length === 0 ? (
                <div className="bpxb-note">Nothing yet.</div>
              ) : (
                <div className="bpx-list">
                  {deals.map((deal) => (
                    <div key={deal.id} className="bpx-card">
                      <div className="bpx-card-body bpxb-deal">
                        <div className="bpxb-biz-top">
                          <div style={{ minWidth: 0 }}>
                            <div className="bpxb-deal-title">{deal.title}</div>
                            <div className="bpxb-deal-when">
                              {nameFor(deal.orgId)} · {when(deal.startsAt)} to {when(deal.endsAt)}
                            </div>
                          </div>
                          <div className="bpx-tags">
                            <span className="bpxb-deal-state" data-state={deal.state}>
                              {STATE_WORDS[deal.state] ?? deal.state}
                            </span>
                            {deal.live && <span className="bpx-pill bpxb-pill-claimed">On now</span>}
                          </div>
                        </div>

                        <div className="bpxb-deal-body">{deal.body}</div>

                        {/* Why it was turned down, so it can be fixed rather
                            than guessed at and sent again unchanged. */}
                        {deal.state === 'rejected' && deal.decisionNote && (
                          <div className="bpxb-note">Reason given: {deal.decisionNote}</div>
                        )}

                        {(deal.state === 'draft' || deal.state === 'submitted' || deal.state === 'approved') && (
                          <div className="bpxb-contact">
                            {deal.state === 'draft' && (
                              <button className="bpx-btn" onClick={() => void move(deal.id, 'submitted')}>
                                <Send size={13} /> Send for review
                              </button>
                            )}
                            <button className="bpx-btn" onClick={() => void move(deal.id, 'withdrawn')}>
                              <Undo2 size={13} /> Withdraw
                            </button>
                          </div>
                        )}

                        {deal.state === 'approved' && (
                          <div className="bpxb-note">
                            To change an approved deal, withdraw it and send a
                            new one. That way what residents see has always been
                            through a review.
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
