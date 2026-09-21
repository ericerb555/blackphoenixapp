/**
 * DiscountGrants — who has been given a discount, why, and when it ends.
 *
 * WHY A SCREEN RATHER THAN JUST THE ROUTES
 *
 * Because the thing worth seeing is not any one grant, it is the shape of all
 * of them together: how many are open-ended, how many were given months ago and
 * never revisited, whether they are piling up faster than anybody retires them.
 * A discount handed out at a reasonable moment becomes unreasonable by being
 * forgotten, and forgetting is the normal case when nothing displays it.
 *
 * WHAT IT SHOWS THAT A LIST USUALLY HIDES
 *
 * Revoked and expired grants stay visible. They are the history that explains
 * why an invoice from last quarter looks the way it does, and hiding them would
 * leave somebody staring at a rate with no record of where it came from.
 *
 * Open-ended grants are called out, because a discount with no end date is a
 * price change that never went through pricing.
 *
 * WHAT IT DOES NOT DO
 *
 * Decide who may grant. The routes do that, and this screen surfaces their
 * refusal rather than second-guessing it — a hidden button is not a check, and
 * a screen that hides the form from a non-administrator would still have to be
 * refused by the server to mean anything.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from '../hooks/useNavigate';
import {
  ChevronLeft, Search, Percent, Loader2, RefreshCw, Plus,
  AlertTriangle, Ban, Clock, CheckCircle2, X,
} from 'lucide-react';
import { projectId } from '../utils/supabase/info';
import { authedHeaders } from '../utils/authHeaders';
import { toast } from 'sonner';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

/** Mirrors the server's caps so the form can warn before somebody saves. */
const QUOTE_CAP = 20;
const FOUNDING_CAP = 30;

interface Grant {
  id: string;
  percent: number;
  scope: 'customer' | 'job' | 'quote';
  scopeId: string;
  reason?: string;
  grantedBy?: string;
  grantedAt?: string;
  startsAt?: string;
  expiresAt?: string;
  revokedAt?: string;
  revokedBy?: string;
  live?: boolean;
  openEnded?: boolean;
}

/**
 * What state a grant is in, as one word.
 *
 * Revoked, expired, not yet started and live are four different facts and the
 * screen needs to tell them apart — "not live" would collapse a grant somebody
 * deliberately withdrew with one that simply has not begun.
 */
function standing(g: Grant): { label: string; tone: string; icon: any } {
  if (g.revokedAt) return { label: 'revoked', tone: 'bg-red-500/10 text-red-400 border-red-500/20', icon: Ban };
  if (g.expiresAt && Date.parse(g.expiresAt) <= Date.now()) {
    return { label: 'expired', tone: 'bg-gray-500/10 text-gray-400 border-gray-500/20', icon: Clock };
  }
  if (g.startsAt && Date.parse(g.startsAt) > Date.now()) {
    return { label: 'not yet', tone: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Clock };
  }
  return { label: 'live', tone: 'bg-green-500/10 text-green-400 border-green-500/20', icon: CheckCircle2 };
}

const day = (iso?: string) => (iso ? String(iso).slice(0, 10) : '');

export default function DiscountGrants() {
  const navigate = useNavigate();
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    scope: 'customer' as Grant['scope'],
    scopeId: '',
    percent: '',
    reason: '',
    startsAt: '',
    expiresAt: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/discount-grants`, { headers: await authedHeaders() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Could not load grants (${res.status}).`);
      setGrants(Array.isArray(json.grants) ? json.grants : []);
    } catch (e: any) {
      toast.error(e?.message || 'Could not load grants.');
      setGrants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    setBusy('new');
    try {
      const res = await fetch(`${SERVER}/discount-grants`, {
        method: 'POST',
        headers: await authedHeaders(),
        body: JSON.stringify({
          scope: form.scope,
          scopeId: form.scopeId.trim(),
          percent: Number(form.percent),
          reason: form.reason.trim(),
          startsAt: form.startsAt || undefined,
          expiresAt: form.expiresAt || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      // The server's refusal is the real one — including "only an administrator
      // can grant a discount" — so it is shown rather than pre-empted.
      if (!res.ok) { toast.error(json?.error || `Could not grant (${res.status}).`); return; }
      toast.success(`${json.grant.percent}% granted. ${json.note || ''}`, { duration: 8000 });
      setShowForm(false);
      setForm({ scope: 'customer', scopeId: '', percent: '', reason: '', startsAt: '', expiresAt: '' });
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not grant that discount.');
    } finally {
      setBusy(null);
    }
  };

  const revoke = async (g: Grant) => {
    setBusy(g.id);
    try {
      const res = await fetch(`${SERVER}/discount-grants/${encodeURIComponent(g.id)}`, {
        method: 'DELETE',
        headers: await authedHeaders(),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(json?.error || `Could not revoke (${res.status}).`); return; }
      toast.success(json.note || 'Withdrawn.');
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not revoke that grant.');
    } finally {
      setBusy(null);
    }
  };

  const q = query.trim().toLowerCase();
  const shown = q
    ? grants.filter(g => `${g.scopeId} ${g.reason} ${g.grantedBy} ${g.percent}`.toLowerCase().includes(q))
    : grants;

  const liveOnes = grants.filter(g => standing(g).label === 'live');
  const openEnded = liveOnes.filter(g => !g.expiresAt);

  const pct = Number(form.percent);
  const overQuoteCap = Number.isFinite(pct) && pct > QUOTE_CAP;

  const input = 'w-full rounded-lg border border-white/10 bg-[#111] px-3 py-2 text-sm text-white '
    + 'placeholder:text-gray-600 focus:border-orange-500 focus:outline-none';
  const label = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500';

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <div className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('unified-dashboard')}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="flex items-center gap-2 text-xl font-bold">
              <Percent className="w-5 h-5 text-orange-400" /> Discount grants
            </h1>
            <p className="text-xs text-gray-500">
              What has been given away, to whom, why, and when it stops.
            </p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-orange-500"
          >
            <Plus className="w-3.5 h-3.5" /> Grant a discount
          </button>
          <button
            onClick={() => void load()}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition"
            title="Reload"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* ── What is actually running ─────────────────────────────────
            The count that matters is not how many grants exist but how many
            are live and never end, because those are the ones nobody will
            think about again. */}
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-[#111] p-3">
            <p className="text-2xl font-bold">{liveOnes.length}</p>
            <p className="text-[11px] text-gray-500">live right now</p>
          </div>
          <div className={`rounded-lg border p-3 ${
            openEnded.length > 0 ? 'border-amber-500/30 bg-amber-500/5' : 'border-white/10 bg-[#111]'
          }`}>
            <p className={`text-2xl font-bold ${openEnded.length > 0 ? 'text-amber-400' : ''}`}>
              {openEnded.length}
            </p>
            <p className="text-[11px] text-gray-500">
              with no end date — a discount that never ends is a price change
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-[#111] p-3">
            <p className="text-2xl font-bold">{grants.length}</p>
            <p className="text-[11px] text-gray-500">on record, including withdrawn</p>
          </div>
        </div>

        {showForm && (
          <div className="mb-4 rounded-xl border border-orange-500/30 bg-[#111] p-4">
            <p className="mb-3 text-sm font-bold">Grant a discount</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <span className={label}>Applies to</span>
                <select
                  className={input}
                  value={form.scope}
                  onChange={e => setForm({ ...form, scope: e.target.value as Grant['scope'] })}
                >
                  <option value="customer">a customer</option>
                  <option value="job">one job</option>
                  <option value="quote">one quote</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <span className={label}>
                  {form.scope === 'customer' ? 'Their email' : form.scope === 'job' ? 'Job id' : 'Quote id'}
                </span>
                <input
                  className={input}
                  value={form.scopeId}
                  placeholder={form.scope === 'customer' ? 'wanda@example.com' : 'job_…'}
                  onChange={e => setForm({ ...form, scopeId: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <span className={label}>Percent off</span>
                <input
                  className={input}
                  inputMode="decimal"
                  value={form.percent}
                  placeholder="5"
                  onChange={e => setForm({ ...form, percent: e.target.value })}
                />
              </div>
              <div>
                <span className={label}>Starts (optional)</span>
                <input
                  type="date"
                  className={input}
                  value={form.startsAt}
                  onChange={e => setForm({ ...form, startsAt: e.target.value })}
                />
              </div>
              <div>
                <span className={label}>Ends (blank = lifetime)</span>
                <input
                  type="date"
                  className={input}
                  value={form.expiresAt}
                  onChange={e => setForm({ ...form, expiresAt: e.target.value })}
                />
              </div>
            </div>

            {overQuoteCap && (
              <p className="mt-2 flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-300">
                <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                <span>
                  Discounts on quoted work are capped at {QUOTE_CAP}% once every source is
                  added together, so this will not be felt in full there. Up to {FOUNDING_CAP}%
                  is reachable on a subscription fee for one of a portal's first ten subscribers.
                </span>
              </p>
            )}

            <div className="mt-3">
              <span className={label}>Why — required</span>
              <input
                className={input}
                value={form.reason}
                placeholder="Goodwill after the delay on the Mill Lane job"
                onChange={e => setForm({ ...form, reason: e.target.value })}
              />
              <p className="mt-1.5 text-[11px] text-gray-600">
                This is the only thing that tells a good decision from a mistake when
                somebody reads it back in six months.
              </p>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={create}
                disabled={busy !== null || !form.scopeId.trim() || !form.reason.trim() || !(Number(form.percent) > 0)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-orange-500 disabled:opacity-50"
              >
                {busy === 'new' ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Granting…</> : 'Grant it'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-gray-300 transition hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Email, job, reason, who granted it…"
            className={`${input} pl-9`}
          />
        </div>

        {loading ? (
          <p className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </p>
        ) : shown.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-[#111] p-6 text-sm text-gray-400">
            {query ? 'Nothing matches that.' : 'No discounts have been granted.'}
          </div>
        ) : (
          <div className="space-y-2">
            {shown.map(g => {
              const st = standing(g);
              const Icon = st.icon;
              return (
                <div key={g.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-white/10 bg-[#111] p-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-bold text-orange-400">{g.percent}%</span>
                      <span className="text-sm text-gray-300">
                        {g.scope === 'customer' ? '' : `${g.scope} `}{g.scopeId}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${st.tone}`}>
                        <Icon className="w-3 h-3" /> {st.label}
                      </span>
                      {st.label === 'live' && !g.expiresAt && (
                        <span className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                          NO END DATE
                        </span>
                      )}
                    </p>
                    {g.reason && <p className="mt-0.5 text-xs text-gray-400">{g.reason}</p>}
                    <p className="mt-1 text-[11px] text-gray-600">
                      {g.grantedBy ? `${g.grantedBy}` : 'unknown'}
                      {g.grantedAt ? ` · ${day(g.grantedAt)}` : ''}
                      {g.startsAt ? ` · from ${day(g.startsAt)}` : ''}
                      {g.expiresAt ? ` · until ${day(g.expiresAt)}` : ''}
                      {g.revokedAt ? ` · withdrawn ${day(g.revokedAt)} by ${g.revokedBy || 'unknown'}` : ''}
                    </p>
                  </div>
                  {!g.revokedAt && (
                    <button
                      onClick={() => revoke(g)}
                      disabled={busy !== null}
                      className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-gray-300 transition hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
                    >
                      {busy === g.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <><X className="w-3 h-3" /> Withdraw</>}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-4 text-[11px] text-gray-600">
          Withdrawing stops a grant applying from now on and keeps the record — it is
          what explains an invoice from last quarter. A customer's total is the plan
          they pay for plus every live grant aimed at them, capped at {QUOTE_CAP}% on
          quoted work.
        </p>
      </div>
    </div>
  );
}
