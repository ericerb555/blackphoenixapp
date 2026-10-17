/**
 * Phoenix Exchange — the deal review queue.
 *
 * Staff only, and deliberately NOT in App's public route list. Every route
 * behind it refuses a non-staff caller server-side, so this screen's job is to
 * explain rather than to protect: a colleague who opens it by accident should
 * learn why they cannot use it instead of filing a bug about an empty page.
 *
 * WHY THIS QUEUE EXISTS AT ALL
 *
 * Eric's standing rule: anything a tenant publishes that reaches other people
 * is approved before it goes live. A deal is the first thing in the Exchange a
 * business writes in its own words and shows to residents, so it is the first
 * thing that rule applies to here.
 *
 * TURNING SOMETHING DOWN REQUIRES A REASON
 *
 * Enforced on the server, not just asked for here. A rejection with no
 * explanation produces the identical deal submitted again an hour later, which
 * wastes the business's time and ours.
 *
 * SPACING NOTE: `p-*` and `m-*` compute to 0px application-wide — see the
 * comment on the reset in `globals.css`.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Loader2, AlertCircle, ChevronLeft, ShieldCheck, Check, X, Building2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EXCHANGE_CSS } from './exchangeStyles';
import { BROWSE_CSS } from './exchangeBrowseStyles';
import { API_BASE_URL } from '../lib/apiConfig';

const SERVER = `${API_BASE_URL}/make-server-3eae23a6`;

interface QueuedDeal {
  id: string;
  title: string;
  body: string;
  startsAt: string;
  endsAt: string;
  state: string;
  live: boolean;
  submittedAt: string | null;
  decisionNote: string | null;
  business: { id: string; slug: string; name: string; claimed: boolean } | null;
}

function when(value: string | null): string {
  if (!value) return '';
  const at = Date.parse(value);
  if (!Number.isFinite(at)) return '';
  return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ExchangeDealReview() {
  const [deals, setDeals] = useState<QueuedDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refused, setRefused] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [deciding, setDeciding] = useState<string | null>(null);

  const authHeader = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ? `Bearer ${session.access_token}` : null;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRefused(false);
    try {
      const auth = await authHeader();
      if (!auth) { setRefused(true); return; }

      const res = await fetch(`${SERVER}/exchange/deal-review`, { headers: { Authorization: auth } });
      const payload = await res.json().catch(() => ({}));
      // 403 is not an error to apologise for — it is the gate doing its job.
      if (res.status === 403) { setRefused(true); return; }
      if (!res.ok || !payload?.success) {
        setError(payload?.error || 'We could not read the queue.');
        return;
      }
      setDeals(Array.isArray(payload.deals) ? payload.deals : []);
    } catch {
      setError('We could not reach the Exchange just now.');
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  useEffect(() => { void load(); }, [load]);

  const decide = useCallback(async (id: string, to: 'approved' | 'rejected') => {
    setDeciding(id);
    try {
      const auth = await authHeader();
      if (!auth) return;
      const res = await fetch(`${SERVER}/exchange/deal-review/${encodeURIComponent(id)}/decide`, {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, note: notes[id] ?? '' }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) {
        setError(payload?.error || 'That did not go through.');
        return;
      }
      await load();
    } catch {
      setError('We could not reach the Exchange just now.');
    } finally {
      setDeciding(null);
    }
  }, [authHeader, notes, load]);

  const waiting = deals.filter((d) => d.state === 'submitted');
  const decided = deals.filter((d) => d.state !== 'submitted');

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
              <div className="bpx-mark"><ShieldCheck size={23} color="#fff" /></div>
              <div style={{ minWidth: 0 }}>
                <div className="bpx-card-title">Deals waiting for review</div>
                <div className="bpxb-section-tag">
                  Nothing reaches a resident until somebody here says so
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

        {!loading && refused && (
          <div className="bpx-empty">
            <ShieldCheck size={26} color="#9ca3af" />
            <div className="bpx-card-title">Company access is required</div>
            <div className="bpx-desc" style={{ maxWidth: 440 }}>
              This queue decides what residents see, so it is kept to staff. If
              you need it, ask an administrator.
            </div>
          </div>
        )}

        {!loading && !refused && error && (
          <div className="bpx-empty">
            <AlertCircle size={26} color="#fca5a5" />
            <div className="bpx-card-title">{error}</div>
            <button className="bpx-btn" onClick={() => void load()}>Try again</button>
          </div>
        )}

        {!loading && !refused && !error && (
          <>
            <div className="bpxb-section">
              <div className="bpxb-section-head">
                <div className="bpxb-section-name">Waiting</div>
                <div className="bpxb-section-tag">
                  {waiting.length === 0 ? 'nothing waiting' : `${waiting.length}`}
                </div>
              </div>

              {waiting.length === 0 ? (
                <div className="bpxb-note">Nothing to look at. Businesses have sent nothing new.</div>
              ) : (
                <div className="bpx-list">
                  {waiting.map((deal) => (
                    <div key={deal.id} className="bpx-card">
                      <div className="bpx-card-body bpxb-deal">
                        <div className="bpxb-biz-top">
                          <div style={{ minWidth: 0 }}>
                            <div className="bpxb-deal-title">{deal.title}</div>
                            <div className="bpxb-deal-when">
                              {deal.business?.name ?? 'Unknown business'} ·
                              {' '}runs {when(deal.startsAt)} to {when(deal.endsAt)} ·
                              {' '}sent {when(deal.submittedAt)}
                            </div>
                          </div>
                          {deal.business && (
                            <a className="bpx-btn" href={`/exchange-listing?slug=${encodeURIComponent(deal.business.slug)}`}>
                              <Building2 size={13} /> Listing
                            </a>
                          )}
                        </div>

                        <div className="bpxb-deal-body">{deal.body}</div>

                        <div className="bpxb-form">
                          <input
                            type="text"
                            placeholder="If you turn it down, say why — they will see this"
                            value={notes[deal.id] ?? ''}
                            maxLength={500}
                            onChange={(e) => setNotes((n) => ({ ...n, [deal.id]: e.target.value }))}
                          />
                          <div className="bpxb-contact">
                            <button
                              className="bpx-btn bpx-btn-primary"
                              disabled={deciding === deal.id}
                              onClick={() => void decide(deal.id, 'approved')}
                            >
                              {deciding === deal.id
                                ? <Loader2 size={13} className="animate-spin" />
                                : <Check size={13} />}
                              Approve
                            </button>
                            <button
                              className="bpx-btn"
                              disabled={deciding === deal.id || !(notes[deal.id] ?? '').trim()}
                              onClick={() => void decide(deal.id, 'rejected')}
                              title={(notes[deal.id] ?? '').trim()
                                ? 'Turn it down'
                                : 'Say why first — a rejection with no reason just comes back'}
                            >
                              <X size={13} /> Turn it down
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {decided.length > 0 && (
              <div className="bpxb-section">
                <div className="bpxb-section-head">
                  <div className="bpxb-section-name">Already decided</div>
                  <div className="bpxb-section-tag">{decided.length}</div>
                </div>
                <div className="bpx-list">
                  {decided.map((deal) => (
                    <div key={deal.id} className="bpx-card">
                      <div className="bpx-card-body bpxb-deal">
                        <div className="bpxb-biz-top">
                          <div style={{ minWidth: 0 }}>
                            <div className="bpxb-deal-title">{deal.title}</div>
                            <div className="bpxb-deal-when">
                              {deal.business?.name ?? 'Unknown business'} · until {when(deal.endsAt)}
                            </div>
                          </div>
                          <div className="bpx-tags">
                            <span className="bpxb-deal-state" data-state={deal.state}>
                              {deal.state === 'approved' ? 'Approved' : 'Not approved'}
                            </span>
                            {deal.live && <span className="bpx-pill bpxb-pill-claimed">On now</span>}
                          </div>
                        </div>
                        {deal.decisionNote && (
                          <div className="bpxb-note">Reason given: {deal.decisionNote}</div>
                        )}
                        {/* An approved deal can still be pulled down — that is
                            what you need when something turns out to be wrong
                            after the fact. */}
                        {deal.state === 'approved' && (
                          <div className="bpxb-form">
                            <input
                              type="text"
                              placeholder="Say why you are pulling it down"
                              value={notes[deal.id] ?? ''}
                              maxLength={500}
                              onChange={(e) => setNotes((n) => ({ ...n, [deal.id]: e.target.value }))}
                            />
                            <div className="bpxb-contact">
                              <button
                                className="bpx-btn"
                                disabled={deciding === deal.id || !(notes[deal.id] ?? '').trim()}
                                onClick={() => void decide(deal.id, 'rejected')}
                              >
                                <X size={13} /> Pull it down
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
