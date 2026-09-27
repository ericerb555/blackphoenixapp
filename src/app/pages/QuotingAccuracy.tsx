/**
 * Quoting accuracy — what the finished jobs say about how we price.
 *
 * WHAT THIS SCREEN IS FOR
 *
 * Every job that has been invoiced and paid is measured: hours actually booked
 * against hours quoted, and what the work cost against what it was billed at.
 * Where a trade is consistently wrong, the rates used to quote it are corrected
 * toward what the crews really achieve. Under-quoting is the expensive
 * direction — a rate that is too low loses money on every job priced with it,
 * quietly, until somebody compares.
 *
 * WHY THE COVERAGE IS AT THE TOP AND NOT IN A CORNER
 *
 * A loop with four finished jobs behind it has learned nothing yet. Putting the
 * count first is what stops this screen being read as a verdict when it is
 * still an anecdote — the report this replaced showed every finished job at
 * 100% margin because costs it did not have were written down as zero, and it
 * looked populated and healthy the whole time.
 *
 * WHAT MOVES BY ITSELF AND WHAT DOES NOT
 *
 * A book figure nobody chose is corrected automatically. A rate somebody set
 * themselves is never touched — those appear under "yours to decide" with the
 * evidence, and stay as they are until a person says otherwise. Every automatic
 * correction can be put back.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft, TrendingUp, TrendingDown, RefreshCw, Undo2, AlertTriangle,
  CheckCircle2, Info, Loader2, Gauge,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface Props {
  onNavigate?: (path: string) => void;
}

const pct = (n: number) => `${n > 0 ? '+' : ''}${Math.round(n * 10) / 10}%`;
const money = (n: number | null) =>
  n === null || !Number.isFinite(n) ? '—' : `$${Math.round(n).toLocaleString()}`;

export default function QuotingAccuracy({ onNavigate }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [denied, setDenied] = useState(false);
  const [reverting, setReverting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setDenied(true); return; }
      const res = await fetch(`${SERVER}/labor-tasks/learning`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.status === 403 || res.status === 401) { setDenied(true); return; }
      const body = await res.json();
      if (!res.ok || body?.success === false) throw new Error(body?.error || 'Could not load this.');
      setDenied(false);
      setData(body);
    } catch (error: any) {
      toast.error(error?.message || 'Could not load this.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const runPass = async () => {
    setRunning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sign in again.');
      const res = await fetch(`${SERVER}/labor-tasks/learn`, {
        method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.success === false) throw new Error(body?.error || 'The pass did not run.');
      const n = (body.applied || []).length;
      toast.success(n === 0
        ? 'Nothing has changed since the last pass.'
        : `${n} rate${n === 1 ? '' : 's'} corrected from the finished jobs.`);
      await load();
    } catch (error: any) {
      toast.error(error?.message || 'The pass did not run.');
    } finally {
      setRunning(false);
    }
  };

  const revert = async (taskId: string) => {
    setReverting(taskId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sign in again.');
      const res = await fetch(`${SERVER}/labor-tasks/measured/revert`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.success === false) throw new Error(body?.error || 'Could not undo that.');
      toast.success('Put back.');
      await load();
    } catch (error: any) {
      toast.error(error?.message || 'Could not undo that.');
    } finally {
      setReverting(null);
    }
  };

  if (denied) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] p-6 text-white">
        <div className="mx-auto max-w-2xl rounded-xl border border-[#2A2A2A] bg-[#111] p-10 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-amber-400" />
          <p className="font-semibold">Administrator access is required</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
            These figures decide what customers are quoted, so they are not shown to
            accounts that cannot change them.
          </p>
        </div>
      </div>
    );
  }

  const coverage = data?.coverage || {};
  const variance: any[] = data?.variance || [];
  const measured: any[] = data?.measured || [];
  const pending: any[] = data?.pending || [];
  const heldBack: any[] = data?.heldBack || [];
  const unmatched: any[] = data?.unmatchedTrades || [];
  const jobs: any[] = data?.jobs || [];

  const worst = [...jobs]
    .filter((j) => j.margin?.percent !== null && j.margin?.percent !== undefined)
    .sort((a, b) => a.margin.percent - b.margin.percent);
  const widest = variance.length
    ? Math.max(...variance.map((v) => Math.abs(v.variancePercent)), 10)
    : 10;

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('/owners-dashboard')}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-sm text-gray-300 transition hover:bg-white/5"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold">Quoting accuracy</h1>
              <p className="mt-0.5 text-sm text-gray-400">
                What the finished jobs say about the hours we quote.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={runPass}
            disabled={running || loading}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-500 disabled:opacity-50"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Run a pass now
          </button>
        </div>

        {loading ? (
          <div className="rounded-xl border border-[#2A2A2A] bg-[#111] p-10 text-center text-gray-400">
            <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />
            Measuring every finished job…
          </div>
        ) : (
          <>
            {/*
              The coverage first, deliberately. Everything below is an average,
              and an average of three jobs is not a finding.
            */}
            <section className="rounded-xl border border-[#2A2A2A] bg-[#111] p-5">
              <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-gray-400">
                <Gauge className="h-3.5 w-3.5" /> What this is built on
              </p>
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  ['Finished and paid', coverage.finishedAndPaid ?? 0, 'jobs measured'],
                  ['Labour measured', coverage.withMeasuredLabour ?? 0, 'had time booked and priced'],
                  ['Materials measured', coverage.withMeasuredMaterials ?? 0, 'had a purchase order'],
                  ['Usable for learning', coverage.usableForLearning ?? 0, 'quoted hours to compare'],
                ].map(([label, value, note]) => (
                  <div key={String(label)} className="rounded-lg border border-[#2A2A2A] bg-black/30 p-3">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums">{String(value)}</p>
                    <p className="mt-0.5 text-[11px] leading-4 text-gray-500">{note}</p>
                  </div>
                ))}
              </div>
              {(coverage.usableForLearning ?? 0) < 5 && (
                <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-500/5 p-3 text-xs leading-5 text-amber-200">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Not enough finished jobs yet to correct anything. A trade needs five
                  before a pattern counts as more than an anecdote, and nothing below
                  will change a rate until then.
                </p>
              )}
              {data?.averageMargin !== null && data?.averageMargin !== undefined && (
                <p className="mt-3 text-sm text-gray-400">
                  Average margin across jobs with complete costs:{' '}
                  <span className="font-bold text-white">{pct(data.averageMargin)}</span>
                </p>
              )}
            </section>

            {/* Where the quoting is off, by trade. */}
            <section className="rounded-xl border border-[#2A2A2A] bg-[#111] p-5">
              <h2 className="text-lg font-bold">Where the quoting is off</h2>
              <p className="mt-1 mb-4 text-sm text-gray-400">
                By trade, not by job — one job that ran over might just mean it rained.
              </p>
              {variance.length === 0 ? (
                <p className="rounded-lg border border-[#2A2A2A] bg-black/30 p-6 text-center text-sm text-gray-500">
                  No finished job yet has both measured hours and a quoted figure to
                  compare them against.
                </p>
              ) : (
                <ul className="space-y-2">
                  {variance.map((v) => {
                    const over = v.variancePercent > 0;
                    const width = Math.min(100, (Math.abs(v.variancePercent) / widest) * 100);
                    return (
                      <li key={v.key} className="rounded-lg border border-[#2A2A2A] bg-black/30 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="flex items-center gap-2 font-semibold">
                            {over ? <TrendingUp className="h-4 w-4 text-red-400" />
                                  : <TrendingDown className="h-4 w-4 text-cyan-400" />}
                            {v.label}
                          </span>
                          <span className={`font-bold tabular-nums ${over ? 'text-red-400' : 'text-cyan-400'}`}>
                            {pct(v.variancePercent)}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                          <div
                            className={`h-full rounded-full ${over ? 'bg-red-500' : 'bg-cyan-500'}`}
                            style={{ width: `${width}%` }}
                          />
                        </div>
                        <p className="mt-2 text-[11px] leading-4 text-gray-500">
                          {v.actualHours}h taken against {v.quotedHours}h quoted, across {v.jobs} job
                          {v.jobs === 1 ? '' : 's'}.
                          {!v.confident && ' Not enough jobs yet to act on.'}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* What has already moved by itself. */}
            {(measured.length > 0 || pending.length > 0) && (
              <section className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] p-5">
                <h2 className="flex items-center gap-2 text-lg font-bold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Corrected automatically
                </h2>
                <p className="mt-1 mb-4 text-sm text-gray-400">
                  Book figures nobody chose, moved to what the work actually takes. Each
                  one can be put back.
                </p>
                {pending.length > 0 && (
                  <p className="mb-3 rounded-lg bg-amber-500/10 p-3 text-xs leading-5 text-amber-200">
                    {pending.length} more would change on the next pass. Press “Run a pass
                    now” to apply them.
                  </p>
                )}
                <ul className="space-y-2">
                  {measured.map((m) => (
                    <li key={m.taskId} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[#2A2A2A] bg-black/30 p-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{m.taskId}</p>
                        <p className="mt-0.5 text-sm tabular-nums text-gray-300">
                          {m.previousHoursPerUnit}h → <span className="font-bold text-emerald-300">{m.hoursPerUnit}h</span> per unit
                        </p>
                        <p className="mt-1 text-[11px] leading-4 text-gray-500">{m.because}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => revert(m.taskId)}
                        disabled={reverting === m.taskId}
                        className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-xs font-bold text-gray-300 transition hover:bg-white/5 disabled:opacity-40"
                      >
                        {reverting === m.taskId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
                        Put back
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Rates somebody set. Never moved, only shown. */}
            {heldBack.length > 0 && (
              <section className="rounded-xl border border-[#2A2A2A] bg-[#111] p-5">
                <h2 className="text-lg font-bold">Yours to decide</h2>
                <p className="mt-1 mb-4 text-sm text-gray-400">
                  You set these yourself, so nothing has touched them. Here is what the
                  finished jobs say about them.
                </p>
                <ul className="space-y-2">
                  {heldBack.map((h) => (
                    <li key={h.taskId} className="rounded-lg border border-[#2A2A2A] bg-black/30 p-3">
                      <p className="font-semibold">{h.name || h.taskId}</p>
                      <p className="mt-0.5 text-sm tabular-nums text-gray-300">
                        yours {h.currentHoursPerUnit}h — measured suggests{' '}
                        <span className="font-bold text-amber-300">{h.suggestedHoursPerUnit}h</span> per unit
                      </p>
                      <p className="mt-1 text-[11px] leading-4 text-gray-500">{h.because}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Measured work with nothing in the catalogue to correct. */}
            {unmatched.length > 0 && (
              <section className="rounded-xl border border-amber-500/25 bg-amber-500/[0.04] p-5">
                <h2 className="flex items-center gap-2 text-lg font-bold">
                  <AlertTriangle className="h-4 w-4 text-amber-400" /> Measured, but nothing to correct
                </h2>
                <p className="mt-1 mb-3 text-sm text-gray-400">
                  These trades have enough finished jobs to learn from, but no labour task
                  in the catalogue carries that trade — so nothing was changed rather than
                  something being guessed at.
                </p>
                <ul className="space-y-1.5">
                  {unmatched.map((u) => (
                    <li key={u.key} className="rounded-lg bg-black/30 px-3 py-2 text-sm">
                      <span className="font-semibold">{u.key}</span>
                      <span className="ml-2 text-gray-400">
                        {u.jobs} jobs, {pct(u.variancePercent)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Every finished job, worst margin first. */}
            <section className="rounded-xl border border-[#2A2A2A] bg-[#111] p-5">
              <h2 className="text-lg font-bold">Finished jobs, worst margin first</h2>
              <p className="mt-1 mb-4 text-sm text-gray-400">
                What was billed against what it cost us — vendor invoices and our own pay
                rates, not what the customer was charged for materials.
              </p>
              {jobs.length === 0 ? (
                <p className="rounded-lg border border-[#2A2A2A] bg-black/30 p-6 text-center text-sm text-gray-500">
                  No job has been invoiced and paid yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead>
                      <tr className="border-b border-[#2A2A2A] text-left text-xs uppercase tracking-wide text-gray-500">
                        <th className="pb-2 pr-3 font-semibold">Job</th>
                        <th className="pb-2 pr-3 text-right font-semibold">Billed</th>
                        <th className="pb-2 pr-3 text-right font-semibold">Cost</th>
                        <th className="pb-2 pr-3 text-right font-semibold">Margin</th>
                        <th className="pb-2 font-semibold">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2A2A2A]">
                      {[...worst, ...jobs.filter((j) => j.margin?.percent === null)].map((j) => (
                        <tr key={j.id}>
                          <td className="py-3 pr-3">
                            <p className="font-semibold">{j.title}</p>
                            <p className="text-xs text-gray-500">{j.customer || '—'}</p>
                          </td>
                          <td className="py-3 pr-3 text-right tabular-nums">{money(j.billed)}</td>
                          <td className="py-3 pr-3 text-right tabular-nums">{money(j.actual?.total ?? null)}</td>
                          <td className={`py-3 pr-3 text-right font-bold tabular-nums ${
                            j.margin?.percent === null || j.margin?.percent === undefined ? 'text-gray-500'
                              : j.margin.percent < 0 ? 'text-red-400' : 'text-emerald-400'
                          }`}>
                            {j.margin?.percent === null || j.margin?.percent === undefined
                              ? 'not enough data'
                              : pct(j.margin.percent)}
                          </td>
                          <td className="py-3 text-xs leading-4 text-gray-500">
                            {(j.gaps || []).join(' ') || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
