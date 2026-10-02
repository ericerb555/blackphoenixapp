/**
 * Phoenix Exchange — the claim review queue.
 *
 * WHY THIS SCREEN EXISTS AT ALL
 *
 * Not as a feature, but as the other half of a decision. A listing that can
 * only reach one factor category — a business with a phone number and no
 * website, which is much of a compiled directory — is neither granted nor
 * refused automatically. Eric chose that deliberately: granting on one fact
 * means whoever can receive one text gets the business, and refusing means
 * those businesses can never join at all.
 *
 * That choice is only honest if somebody looks. A review queue nobody can open
 * is auto-granting with extra steps, or auto-refusing with a record that says
 * a person considered it. So this screen is the promise being kept.
 *
 * WHAT A REVIEWER IS ACTUALLY SHOWN
 *
 * The failures as much as the passes. Five burned attempts on a phone code and
 * one clean pass on a domain are completely different stories, and a queue
 * that showed only "1 factor proven" would flatten them into the same row.
 *
 * Contact details are shown MASKED, exactly as they are to the claimant. The
 * registry contact is not always the public one, and a reviewer needs to know
 * *which* number received a code, not what the number is.
 *
 * WHY GRANT IS SOMETIMES DISABLED RATHER THAN HIDDEN
 *
 * A listing somebody still holds cannot be granted to a challenger in one
 * action — Eric's rule is suspend first, then they prove it the ordinary way.
 * The button stays visible and says why, because a control that vanishes reads
 * as a bug, and the reviewer needs to learn the two-step rule rather than
 * wonder where the option went.
 *
 * SPACING NOTE: `p-*` and `m-*` compute to 0px application-wide — see the
 * comment on the reset in `globals.css`. This screen names its own classes,
 * the same way the other Exchange pages do.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShieldQuestion, Loader2, AlertCircle, CheckCircle2, XCircle, Clock,
  Phone, Globe, BadgeCheck, Building2, Mail, Lock, RefreshCw, ArrowUpRight,
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';
import { EXCHANGE_CSS } from './exchangeStyles';
import { REVIEW_CSS } from './exchangeReviewStyles';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface Attempt {
  factor: string;
  category: string;
  satisfied: boolean;
  burned: boolean;
  tries: number;
  target: string | null;
}

interface QueueClaim {
  id: string;
  state: string;
  isDispute: boolean;
  openedAt: string;
  reason: string;
  business: {
    id: string | null;
    slug: string | null;
    name: string;
    phone: string | null;
    website: string | null;
    claimState: string | null;
    listingSource: string | null;
    licenceState: string | null;
  };
  claimant: { email: string | null };
  proven: string[];
  attempts: Attempt[];
  dispute: { decidesAfter: string | null; ready: boolean } | null;
}

type Filter = 'all' | 'needs_review' | 'disputed';

/** How a factor reads to somebody who did not write the engine. */
const FACTOR_LABELS: Record<string, string> = {
  phone_code: 'Code to the record phone',
  email_code: 'Code to the record email',
  domain_email: 'Email at their own domain',
  dns_token: 'DNS record on their domain',
  postal_code: 'Code posted to the premises',
  licence_match: 'Licence record',
  documents: 'Documents',
};

/** Whole days, rounded down, because "0 days" is clearer than "0.4 days". */
function daysSince(iso: string): number {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return 0;
  return Math.max(Math.floor((Date.now() - at) / 86_400_000), 0);
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return null;
  return Math.ceil((at - Date.now()) / 86_400_000);
}

export default function ExchangeClaimReview() {
  const [claims, setClaims] = useState<QueueClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  // Per-claim local state, so one case in flight never blanks the others.
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [said, setSaid] = useState<Record<string, { ok: boolean; text: string }>>({});

  const authHeader = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return `Bearer ${session?.access_token || publicAnonKey}`;
    } catch {
      return `Bearer ${publicAnonKey}`;
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${SERVER}/exchange/review/claims`, {
        headers: { Authorization: await authHeader() },
      });
      const body = await res.json().catch(() => ({}));

      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (!res.ok || !body?.success) {
        setError(body?.error || 'We could not load the queue.');
        return;
      }
      setForbidden(false);
      setClaims(Array.isArray(body.claims) ? body.claims : []);
    } catch {
      setError('We could not reach the Exchange just now.');
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  useEffect(() => { void load(); }, [load]);

  const decide = useCallback(async (claim: QueueClaim, action: 'grant' | 'refuse') => {
    const note = (notes[claim.id] || '').trim();
    // Mirrors the server rather than trusting it to be the only check: a
    // refusal nobody explained is unanswerable by the person refused.
    if (action === 'refuse' && !note) {
      setSaid((s) => ({ ...s, [claim.id]: { ok: false, text: 'Say why it was refused.' } }));
      return;
    }

    setBusy((b) => ({ ...b, [claim.id]: true }));
    setSaid((s) => ({ ...s, [claim.id]: { ok: true, text: '' } }));
    try {
      const res = await fetch(`${SERVER}/exchange/review/claims/${claim.id}/decide`, {
        method: 'POST',
        headers: { Authorization: await authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        setSaid((s) => ({ ...s, [claim.id]: { ok: false, text: body?.error || 'That did not go through.' } }));
        return;
      }
      // Drop it from the list rather than re-fetching everything: the decision
      // is made and the reviewer's place in a long queue is worth keeping.
      setClaims((list) => list.filter((row) => row.id !== claim.id));
    } catch {
      setSaid((s) => ({ ...s, [claim.id]: { ok: false, text: 'We could not reach the server.' } }));
    } finally {
      setBusy((b) => ({ ...b, [claim.id]: false }));
    }
  }, [authHeader, notes]);

  const suspend = useCallback(async (claim: QueueClaim) => {
    const note = (notes[claim.id] || '').trim();
    if (!note) {
      setSaid((s) => ({ ...s, [claim.id]: { ok: false, text: 'Say why it is being suspended.' } }));
      return;
    }
    if (!claim.business.id) return;

    setBusy((b) => ({ ...b, [claim.id]: true }));
    try {
      const res = await fetch(`${SERVER}/exchange/review/listing/${claim.business.id}/suspend`, {
        method: 'POST',
        headers: { Authorization: await authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.success) {
        setSaid((s) => ({ ...s, [claim.id]: { ok: false, text: body?.error || 'That did not go through.' } }));
        return;
      }
      // Suspending moves the dispute back to `open`, so it leaves this queue
      // and the claimant finishes proving it themselves. Reload rather than
      // guess at the new state.
      setSaid((s) => ({ ...s, [claim.id]: { ok: true, text: 'Suspended. The claimant can now finish verifying it.' } }));
      await load();
    } catch {
      setSaid((s) => ({ ...s, [claim.id]: { ok: false, text: 'We could not reach the server.' } }));
    } finally {
      setBusy((b) => ({ ...b, [claim.id]: false }));
    }
  }, [authHeader, notes, load]);

  const shown = useMemo(
    () => claims.filter((c) => filter === 'all' || c.state === filter),
    [claims, filter],
  );

  const counts = useMemo(() => ({
    all: claims.length,
    needs_review: claims.filter((c) => c.state === 'needs_review').length,
    disputed: claims.filter((c) => c.state === 'disputed').length,
  }), [claims]);

  // The oldest wait, which is the number that says whether this queue is being
  // worked or merely exists.
  const oldest = useMemo(
    () => claims.reduce((worst, c) => Math.max(worst, daysSince(c.openedAt)), 0),
    [claims],
  );

  if (forbidden) {
    return (
      <div className="bpx">
        <style>{EXCHANGE_CSS}</style>
        <div className="bpx-center">
          <div className="bpx-panel">
            <Lock size={28} color="#9ca3af" />
            <div className="bpx-card-title">Company access is required</div>
            <div className="bpx-desc">
              Claim reviews decide who controls a business's public listing, so
              only Black Phoenix staff can open this queue.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bpx">
      <style>{EXCHANGE_CSS}</style>
      <style>{REVIEW_CSS}</style>

      <div className="bpx-shell">
        <div className="bpx-masthead">
          <div className="bpx-masthead-row">
            <div className="bpx-brand">
              <div className="bpx-mark"><ShieldQuestion size={23} color="#fff" /></div>
              <div style={{ minWidth: 0 }}>
                <div className="bpx-card-title">Claim review</div>
                <div className="bpxr-sub">
                  {loading ? 'Loading…'
                    : claims.length === 0 ? 'Nothing is waiting.'
                    : `${claims.length} waiting · oldest ${oldest} day${oldest === 1 ? '' : 's'}`}
                </div>
              </div>
            </div>
            <button className="bpx-btn" onClick={() => void load()} disabled={loading}>
              <RefreshCw size={15} /> Refresh
            </button>
          </div>
        </div>

        <div className="bpx-row">
          {([
            ['all', `All (${counts.all})`],
            ['needs_review', `Needs a person (${counts.needs_review})`],
            ['disputed', `Disputes (${counts.disputed})`],
          ] as [Filter, string][]).map(([key, label]) => (
            <button
              key={key}
              className="bpx-chip"
              data-on={filter === key}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="bpx-empty">
            <Loader2 size={24} className="animate-spin" color="#9ca3af" />
            <div className="bpx-desc">Reading the queue…</div>
          </div>
        )}

        {!loading && error && (
          <div className="bpx-empty">
            <AlertCircle size={26} color="#fca5a5" />
            <div className="bpx-card-title">{error}</div>
            <button className="bpx-btn" onClick={() => void load()}>Try again</button>
          </div>
        )}

        {!loading && !error && shown.length === 0 && (
          <div className="bpx-empty">
            <CheckCircle2 size={26} color="#86efac" />
            <div className="bpx-card-title">Nothing waiting on a person</div>
            <div className="bpx-desc">
              Claims arrive here when a listing can only prove one kind of
              control, or when somebody claims a listing another account already
              holds.
            </div>
          </div>
        )}

        {!loading && !error && shown.length > 0 && (
          <div className="bpxr-queue">
            {shown.map((claim) => {
              const waiting = daysSince(claim.openedAt);
              const left = daysUntil(claim.dispute?.decidesAfter ?? null);
              const stillHeld = claim.business.claimState === 'claimed';
              const working = Boolean(busy[claim.id]);
              const outcome = said[claim.id];

              return (
                <div key={claim.id} className="bpx-card" data-dispute={claim.isDispute}>
                  <div className="bpx-card-body bpxr-case">

                    <div className="bpxr-head">
                      <div style={{ minWidth: 0 }}>
                        <div className="bpxr-name">{claim.business.name}</div>
                        <div className="bpxr-sub">
                          Waiting {waiting} day{waiting === 1 ? '' : 's'}
                          {claim.claimant.email ? ` · asked for by ${claim.claimant.email}` : ''}
                        </div>
                      </div>
                      <div className="bpxr-flags">
                        <span className={`bpx-pill ${claim.isDispute ? 'bpxr-pill-dispute' : 'bpxr-pill-review'}`}>
                          {claim.isDispute ? 'Dispute' : 'Needs a person'}
                        </span>
                        {claim.dispute && (
                          <span className={`bpx-pill ${claim.dispute.ready ? 'bpxr-pill-ready' : 'bpxr-pill-waiting'}`}>
                            <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />
                            {claim.dispute.ready
                              ? 'Owner had their 7 days'
                              : `${Math.max(left ?? 0, 0)} day${left === 1 ? '' : 's'} left`}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bpxr-why">{claim.reason}</div>

                    <div className="bpxr-facts">
                      <div className="bpxr-fact">
                        <div className="bpxr-fact-label"><Phone size={10} style={{ display: 'inline', marginRight: 4 }} />Phone on record</div>
                        <div className="bpxr-fact-value" data-empty={!claim.business.phone}>
                          {claim.business.phone || 'none'}
                        </div>
                      </div>
                      <div className="bpxr-fact">
                        <div className="bpxr-fact-label"><Globe size={10} style={{ display: 'inline', marginRight: 4 }} />Website on record</div>
                        <div className="bpxr-fact-value" data-empty={!claim.business.website}>
                          {claim.business.website || 'none'}
                        </div>
                      </div>
                      <div className="bpxr-fact">
                        <div className="bpxr-fact-label"><Building2 size={10} style={{ display: 'inline', marginRight: 4 }} />Where the listing came from</div>
                        <div className="bpxr-fact-value">
                          {claim.business.listingSource || 'unknown'}
                          {stillHeld ? ' · currently claimed' : ' · unclaimed'}
                        </div>
                      </div>
                      <div className="bpxr-fact">
                        <div className="bpxr-fact-label"><BadgeCheck size={10} style={{ display: 'inline', marginRight: 4 }} />Licence state</div>
                        <div className="bpxr-fact-value" data-empty={!claim.business.licenceState}>
                          {claim.business.licenceState || 'none on record'}
                        </div>
                      </div>
                    </div>

                    <div className="bpxr-evidence">
                      <div className="bpxr-fact-label">What was attempted</div>
                      {claim.attempts.length === 0 && (
                        <div className="bpxr-blocked">Nothing was attempted. Treat with care.</div>
                      )}
                      {claim.attempts.map((a, i) => (
                        <div
                          key={`${a.factor}-${i}`}
                          className="bpxr-attempt"
                          data-ok={a.satisfied}
                          data-burned={a.burned}
                        >
                          <span className="bpxr-attempt-factor">
                            {FACTOR_LABELS[a.factor] || a.factor}
                          </span>
                          <span className="bpxr-attempt-meta">
                            {a.category}
                            {a.target ? ` · ${a.target}` : ''}
                            {a.tries > 0 ? ` · ${a.tries} attempt${a.tries === 1 ? '' : 's'}` : ''}
                          </span>
                          <span
                            className="bpxr-attempt-verdict"
                            data-ok={a.satisfied}
                            data-burned={a.burned && !a.satisfied}
                            data-open={!a.satisfied && !a.burned}
                          >
                            {a.satisfied ? 'proven' : a.burned ? 'burned' : 'unanswered'}
                          </span>
                        </div>
                      ))}
                    </div>

                    {claim.business.slug && (
                      <a
                        className="bpx-btn"
                        href={`?page=exchange-listing&slug=${encodeURIComponent(claim.business.slug)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ alignSelf: 'flex-start' }}
                      >
                        See the public listing <ArrowUpRight size={14} />
                      </a>
                    )}

                    <div className="bpxr-decide">
                      <textarea
                        className="bpxr-note"
                        placeholder={
                          claim.isDispute
                            ? 'What did you establish? Required to refuse or to suspend.'
                            : 'What did you establish? Required to refuse.'
                        }
                        value={notes[claim.id] || ''}
                        onChange={(e) => setNotes((n) => ({ ...n, [claim.id]: e.target.value }))}
                      />

                      <div className="bpxr-actions">
                        <button
                          className="bpx-btn bpx-btn-primary"
                          disabled={working || stillHeld}
                          onClick={() => void decide(claim, 'grant')}
                        >
                          {working ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                          Grant the listing
                        </button>

                        <button
                          className="bpx-btn bpxr-btn-refuse"
                          disabled={working}
                          onClick={() => void decide(claim, 'refuse')}
                        >
                          <XCircle size={15} /> Refuse
                        </button>

                        {stillHeld && claim.business.id && (
                          <button
                            className="bpx-btn"
                            disabled={working}
                            onClick={() => void suspend(claim)}
                          >
                            <Lock size={15} /> Set back to unclaimed
                          </button>
                        )}
                      </div>

                      {stillHeld && (
                        <div className="bpxr-blocked">
                          This listing is still held by its current owner, so it cannot
                          be granted here. Set it back to unclaimed first — the owner is
                          told — and the claimant then finishes verifying it the ordinary
                          way. Nothing moves a business from one owner to another in a
                          single step.
                        </div>
                      )}

                      {outcome?.text && (
                        <div className={outcome.ok ? 'bpxr-said' : 'bpxr-failed'}>
                          {outcome.text}
                        </div>
                      )}

                      {!claim.isDispute && (
                        <div className="bpxr-blocked">
                          Granting also starts the six-month trial, and tells the
                          public-record contact that the listing has been claimed.
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="bpxr-blocked">
          <Mail size={12} style={{ display: 'inline', marginRight: 5 }} />
          A business replying "this was not me" to a claim notification belongs here
          too: find their listing, set it back to unclaimed, and say why.
        </div>
      </div>
    </div>
  );
}
