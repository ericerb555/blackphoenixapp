/**
 * Phoenix Exchange — the logo review queue.
 *
 * Staff only, and deliberately NOT in App's public route list. Every route
 * behind it refuses a non-staff caller server-side, so this screen's job is to
 * explain rather than to protect: a colleague who opens it by accident should
 * learn why they cannot use it instead of filing a bug about an empty page.
 *
 * WHY A SEPARATE QUEUE FROM DEALS
 *
 * Reviewing a deal is reading words; reviewing a logo is looking at an image,
 * and the two want different screens. A row of text with a thumbnail wedged
 * into it makes the image too small to judge, and the thing being judged here
 * is almost entirely visual.
 *
 * WHAT WE ARE ACTUALLY CHECKING, AND WHAT WE ARE NOT
 *
 * The claim flow already proved control of the listed phone or email, so the
 * question here is not "do they own this business" — it is "is this image fit
 * to appear on our directory": is it a logo at all, is it this business's, is
 * it something nobody should be shown.
 *
 * It is NOT a trademark check and this screen does not pretend to be one. What
 * the platform offers is proof of control plus a human look, which is the same
 * standard everything else published by a tenant is held to.
 *
 * TURNING ONE DOWN REQUIRES A REASON
 *
 * Enforced on the server, not merely asked for here. "Not accepted" with no
 * explanation produces the identical image uploaded again an hour later.
 *
 * SPACING NOTE: `p-*` and `m-*` compute to 0px application-wide — see the
 * comment on the reset in `globals.css`.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Loader2, AlertCircle, ChevronLeft, ShieldCheck, Check, X, ImageIcon,
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';
import { EXCHANGE_CSS } from './exchangeStyles';
import { BROWSE_CSS } from './exchangeBrowseStyles';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface Waiting {
  orgId: string;
  slug: string;
  name: string;
  claimed: boolean;
  submittedAt: string | null;
  url: string | null;
}

function when(value: string | null): string {
  if (!value) return '';
  const at = Date.parse(value);
  if (!Number.isFinite(at)) return '';
  return new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ExchangeLogoReview() {
  const [waiting, setWaiting] = useState<Waiting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refused, setRefused] = useState(false);
  const [reasons, setReasons] = useState<Record<string, string>>({});
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

      const res = await fetch(`${SERVER}/exchange/logo-review`, { headers: { Authorization: auth } });
      const payload = await res.json().catch(() => ({}));
      // 403 is not an error to apologise for — it is the gate doing its job.
      if (res.status === 403) { setRefused(true); return; }
      if (!res.ok || !payload?.success) {
        setError(payload?.error || 'We could not read the queue.');
        return;
      }
      setWaiting(Array.isArray(payload.waiting) ? payload.waiting : []);
    } catch {
      setError('We could not reach the Exchange just now.');
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  useEffect(() => { void load(); }, [load]);

  const decide = useCallback(async (orgId: string, decision: 'approved' | 'rejected') => {
    setDeciding(orgId);
    setError(null);
    try {
      const auth = await authHeader();
      if (!auth) return;
      const res = await fetch(`${SERVER}/exchange/logo-review/${encodeURIComponent(orgId)}/decide`, {
        method: 'POST',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason: reasons[orgId] ?? '' }),
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
  }, [authHeader, reasons, load]);

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
                <div className="bpx-card-title">Logos waiting for review</div>
                <div className="bpxb-section-tag">
                  Nothing goes on a listing until somebody here says so
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
              This queue decides what appears on a business's listing, so it is
              kept to staff. If you need it, ask an administrator.
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

        {!loading && !refused && !error && waiting.length === 0 && (
          <div className="bpx-empty">
            <ImageIcon size={26} color="#9ca3af" />
            <div className="bpx-card-title">Nothing waiting</div>
            <div className="bpx-desc" style={{ maxWidth: 440 }}>
              A logo arrives here when a business that has claimed its listing
              uploads one.
            </div>
          </div>
        )}

        {!loading && !refused && !error && waiting.length > 0 && (
          <div className="bpxb-section">
            <div className="bpxb-section-head">
              <div className="bpxb-section-name">Waiting</div>
              {/* Oldest first, which is what the route orders by. A queue that
                  showed the newest first would never reach the oldest. */}
              <div className="bpxb-section-tag">{waiting.length} · oldest first</div>
            </div>

            {waiting.map((row) => (
              <div key={row.orgId} className="bpx-card">
                <div className="bpx-card-body bpxb-logo-row">
                  {/* Big enough to judge. The whole decision is visual, and a
                      thumbnail would make it a guess. */}
                  <div className="bpxb-logo-frame" data-empty={!row.url} style={{ width: 120, height: 120 }}>
                    {row.url
                      ? <img src={row.url} alt={`Logo submitted by ${row.name}`} />
                      : <ImageIcon size={26} color="#6b7280" />}
                  </div>

                  <div className="bpxb-logo-words">
                    <a
                      className="bpxb-biz-name"
                      href={`/exchange-listing?slug=${encodeURIComponent(row.slug)}`}
                      style={{ color: 'inherit', textDecoration: 'none' }}
                    >
                      {row.name}
                    </a>
                    <div className="bpxb-note">
                      Uploaded {when(row.submittedAt) || 'recently'}
                      {/* A claim that has lapsed since the upload is the one
                          thing that stops this being approvable, and the
                          server refuses it too. */}
                      {!row.claimed && ' · this listing is no longer claimed'}
                    </div>

                    <label className="bpxb-note" style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      Why, if you are turning it down
                      <input
                        type="text"
                        value={reasons[row.orgId] ?? ''}
                        maxLength={300}
                        placeholder="They will read this, so make it actionable"
                        onChange={(e) => setReasons((r) => ({ ...r, [row.orgId]: e.target.value }))}
                        style={{
                          width: '100%', minHeight: 40, padding: '0 12px', borderRadius: 11,
                          background: 'var(--bpx-raised)', color: 'var(--bpx-text)',
                          border: '1px solid var(--bpx-line)', fontSize: 13.5, fontFamily: 'inherit',
                        }}
                      />
                    </label>

                    <div className="bpxb-logo-acts">
                      <button
                        type="button"
                        className="bpx-btn bpx-btn-primary"
                        disabled={deciding === row.orgId || !row.claimed}
                        onClick={() => void decide(row.orgId, 'approved')}
                      >
                        {deciding === row.orgId
                          ? <Loader2 size={15} className="animate-spin" />
                          : <Check size={15} />}
                        Put it on the listing
                      </button>
                      <button
                        type="button"
                        className="bpx-btn"
                        disabled={deciding === row.orgId}
                        onClick={() => void decide(row.orgId, 'rejected')}
                      >
                        <X size={15} /> Turn it down
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bpxb-note">
          This is a look at an image, not a trademark check. The claim behind
          each listing already proved control of its phone or email.
        </div>
      </div>
    </div>
  );
}
