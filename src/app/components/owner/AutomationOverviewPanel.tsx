/**
 * Is anything running by itself — and does it need me?
 *
 * WHY THIS SCREEN EXISTS
 *
 * Eric, 2026-10-15, after looking for new towns on the Exchange and finding
 * none: *"how is the ai automation to keep adding town to the phoenix exchange
 * doing i done see any new towns added or adding?"*
 *
 * Answering that took six database reads and knowing which six. The clocks are
 * in `cron.job`, which PostgREST does not serve. The store's heartbeat is in
 * the key-value store. Two towns had been opened and never compiled, which was
 * only findable by joining two tables by hand. None of it was visible in the
 * app, so the only honest answer to "how is the automation doing" was "ask
 * somebody with database access".
 *
 * THE RULE IT IS BUILT ON
 *
 * `StoreAutonomyPanel` put it best and it is the reason this screen is shaped
 * the way it is: *"A dashboard that reassures you without evidence is worse
 * than no dashboard."*
 *
 * So the order is deliberate:
 *
 *   NEEDS YOU       first, because that is the question being asked
 *   NOT AUTOMATED   second, because a gap is a finding, not an absence
 *   THE CLOCKS      third, because they are the part that is usually fine
 *
 * Most screens of this kind put the green lights first. Six green lights with
 * no mention that nothing refreshes the Exchange would have answered Eric's
 * question with "all good", and the true answer was that no such automation
 * was ever built.
 *
 * `succeeded` IS NOT SUCCESS, AND THE SCREEN SAYS SO
 *
 * pg_cron records a job as succeeded when its SQL ran, and that SQL only
 * QUEUES an HTTP request. Health is therefore judged on when a job last ran
 * against how often it is due — `automationClock.ts`, which is tested — and
 * whether anybody ANSWERED is reported as its own line.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Clock, AlertTriangle, CheckCircle2, Loader2, RefreshCw, HelpCircle,
  PauseCircle, ArrowRight, Inbox, Radio, Store, MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import {
  clockHealth, fleetSummary, scheduleInWords, describeAge,
  type ClockRow, type ClockStatus,
} from '../../lib/automationClock';
import { API_BASE_URL } from '../../lib/apiConfig';

const SERVER = `${API_BASE_URL}/make-server-3eae23a6`;

interface Waiting {
  id: string;
  label: string;
  count: number;
  action: string;
  where: string | null;
  severity: 'attention' | 'blocked' | 'fyi';
}

interface Gap {
  id: string;
  label: string;
  detail: string;
  where: string | null;
}

interface Overview {
  at: string;
  clocks: ClockRow[];
  clocksError: string | null;
  delivery: {
    undelivered: number;
    errored: number;
    total: number;
    windowStart: string | null;
    windowEnd: string | null;
  } | null;
  storeClock: {
    lastRunAt: string | null;
    minutesSinceLastRun: number | null;
    totalRuns: number;
    jobsEnabled: number;
    jobsRegistered: number;
    openAsks: number;
    findings: { at: string; urgent: number; attention: number } | null;
  } | null;
  exchangeUpkeep: {
    armed: boolean;
    lastRun: { at: string; town: string | null; ok: boolean } | null;
    summary: string;
    runs: number;
  } | null;
  waiting: Waiting[];
  gaps: Gap[];
}

const CARD = 'rounded-2xl border border-[#2A2A2A] bg-[#141414]';

/** The one icon per clock state. Paused is not a failure and does not look like one. */
function StatusMark({ status }: { status: ClockStatus }) {
  if (status === 'running') return <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
  if (status === 'paused') return <PauseCircle className="w-4 h-4 text-zinc-500 flex-shrink-0" />;
  if (status === 'unknown-schedule') return <HelpCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />;
  return <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />;
}

export default function AutomationOverviewPanel({
  onNavigate,
}: {
  onNavigate?: (page: string) => void;
}) {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshingTown, setRefreshingTown] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Sign in as staff to see this.');
        setData(null);
        return;
      }
      const res = await fetch(`${SERVER}/automation/overview`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        setError(String(body?.error || `Could not read the automation status (${res.status}).`));
        setData(null);
        return;
      }
      setData(body as Overview);
    } catch (err: any) {
      setError(String(err?.message || 'Could not reach the server.'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /**
   * Refresh one town now, through the same path the scheduler uses.
   *
   * Here rather than only on Towns & coverage because this is the screen that
   * says the refresh is not running — and a screen that reports a gap it
   * cannot help with sends somebody hunting for the button. It compiles the
   * town longest unrefreshed, which until Hudson and Windham are filled means
   * one of those two.
   */
  const refreshOneTown = useCallback(async () => {
    setRefreshingTown(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error('Sign in as staff to do that.'); return; }
      const res = await fetch(`${SERVER}/exchange/upkeep/run`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        toast.error(String(body?.error || `The refresh could not run (${res.status}).`));
        return;
      }
      // The job's own sentence, not one composed here — it knows whether it did
      // nothing, and why, and whether the town it filled is still hidden.
      toast.success(String(body.summary || 'Refresh finished.'), { duration: 10_000 });
      await load();
    } catch (err: any) {
      toast.error(String(err?.message || 'Could not reach the server.'));
    } finally {
      setRefreshingTown(false);
    }
  }, [load]);

  const go = (where: string | null) => {
    if (!where) return;
    if (onNavigate) { onNavigate(where); return; }
    const spa = (window as any).__navigateApp;
    if (typeof spa === 'function') { spa(where); return; }
    toast.error('Could not navigate from here.');
  };

  if (loading && !data) {
    return (
      <div className={`${CARD} p-10 flex items-center justify-center gap-3 text-zinc-400`}>
        <Loader2 className="w-5 h-5 animate-spin" />
        Reading the clocks…
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${CARD} p-6`}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h3 className="text-white font-bold">Could not read the automation status</h3>
            <p className="text-zinc-400 text-sm mt-1 break-words">{error}</p>
            {/*
              Said out loud, because the alternative reading is the dangerous
              one: a screen that cannot reach the server looks exactly like a
              business with nothing running.
            */}
            <p className="text-zinc-500 text-sm mt-3">
              This does not mean nothing is running — it means this screen could not find out.
            </p>
            <button
              onClick={load}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1F1F1F] border border-[#2F2F2F] text-zinc-200 text-sm font-semibold hover:border-orange-500/50"
            >
              <RefreshCw className="w-4 h-4" /> Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const summary = fleetSummary(data.clocks || []);
  const waiting = Array.isArray(data.waiting) ? data.waiting : [];
  const gaps = Array.isArray(data.gaps) ? data.gaps : [];
  const blocked = waiting.filter((w) => w.severity === 'blocked');

  const toneRing = summary.tone === 'bad' ? 'border-red-500/40'
    : summary.tone === 'warn' ? 'border-amber-500/40'
    : summary.tone === 'good' ? 'border-emerald-500/30'
    : 'border-[#2A2A2A]';

  return (
    <div className="space-y-5">

      {/* ── the one line, and the refresh ───────────────────────────────── */}
      <div className={`rounded-2xl border ${toneRing} bg-[#141414] p-5`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <Radio className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              summary.tone === 'bad' ? 'text-red-400'
                : summary.tone === 'warn' ? 'text-amber-400'
                : summary.tone === 'good' ? 'text-emerald-400' : 'text-zinc-500'
            }`} />
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white">{summary.text}</h2>
              <p className="text-sm text-zinc-400 mt-1">
                {waiting.length === 0
                  ? 'Nothing is waiting on you.'
                  : `${waiting.length} ${waiting.length === 1 ? 'thing needs' : 'things need'} you${blocked.length > 0 ? `, ${blocked.length} of them blocking` : ''}.`}
                {gaps.length > 0 && ` ${gaps.length} ${gaps.length === 1 ? 'job is' : 'jobs are'} not automated at all.`}
              </p>
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1F1F1F] border border-[#2F2F2F] text-zinc-300 text-sm hover:border-orange-500/50 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
        </div>
        <p className="text-xs text-zinc-600 mt-3">
          Read {describeAge(0)} · {new Date(data.at).toLocaleString()}
        </p>
      </div>

      {/* ── needs you ───────────────────────────────────────────────────── */}
      <section className={`${CARD} overflow-hidden`}>
        <div className="p-5 border-b border-[#2A2A2A] flex items-center gap-3">
          <Inbox className="w-5 h-5 text-orange-400" />
          <h3 className="text-lg font-bold text-white">Needs you</h3>
          {waiting.length > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-orange-500/15 text-orange-300 text-sm font-bold">
              {waiting.length}
            </span>
          )}
        </div>

        {waiting.length === 0 ? (
          <div className="p-5 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-zinc-200">Nothing is waiting for a decision.</p>
              <p className="text-zinc-500 text-sm mt-1">
                Review queues are empty and no job has stopped to ask anything.
              </p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-[#222]">
            {waiting.map((item) => (
              <li key={item.id} className="p-5 flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {item.severity === 'blocked'
                    ? <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-1" />
                    : <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-1" />}
                  <div className="min-w-0">
                    <p className="text-white font-semibold">
                      {item.label}
                      {item.count > 1 && (
                        <span className="ml-2 text-zinc-500 font-normal">×{item.count}</span>
                      )}
                    </p>
                    <p className="text-zinc-400 text-sm mt-1">{item.action}</p>
                  </div>
                </div>
                {item.where && (
                  <button
                    onClick={() => go(item.where)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold flex-shrink-0"
                  >
                    Go there <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── not automated ───────────────────────────────────────────────── */}
      {gaps.length > 0 && (
        <section className={`${CARD} overflow-hidden`}>
          <div className="p-5 border-b border-[#2A2A2A]">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-zinc-400" />
              <h3 className="text-lg font-bold text-white">Not automated</h3>
            </div>
            {/*
              The reason this section exists, stated on the screen rather than
              only in a comment. Somebody reading a page of green ticks should
              not have to infer what is missing from it.
            */}
            <p className="text-zinc-500 text-sm mt-2">
              Work that only happens when a person does it. Listed because an empty
              list of failures is not the same as everything being covered.
            </p>
          </div>
          <ul className="divide-y divide-[#222]">
            {gaps.map((gap) => (
              <li key={gap.id} className="p-5 flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="text-white font-semibold">{gap.label}</p>
                  <p className="text-zinc-400 text-sm mt-1">{gap.detail}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                  {/* The gap this screen can close from here, rather than only
                      point at. See `refreshOneTown`. */}
                  {gap.id === 'exchange-clock-not-armed' && (
                    <button
                      onClick={refreshOneTown}
                      disabled={refreshingTown}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold disabled:opacity-50"
                    >
                      {refreshingTown
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Refreshing…</>
                        : <>Refresh one town now <ArrowRight className="w-4 h-4" /></>}
                    </button>
                  )}
                  {gap.where && (
                    <button
                      onClick={() => go(gap.where)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1F1F1F] border border-[#2F2F2F] text-zinc-200 text-sm font-semibold hover:border-orange-500/50"
                    >
                      Do it by hand <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── the clocks ──────────────────────────────────────────────────── */}
      <section className={`${CARD} overflow-hidden`}>
        <div className="p-5 border-b border-[#2A2A2A] flex items-center gap-3">
          <Clock className="w-5 h-5 text-zinc-400" />
          <h3 className="text-lg font-bold text-white">The clocks</h3>
        </div>

        {data.clocksError ? (
          <div className="p-5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-white font-semibold">The schedule could not be read</p>
              <p className="text-zinc-400 text-sm mt-1 break-words">{data.clocksError}</p>
              <p className="text-zinc-500 text-sm mt-2">
                Not the same as having no scheduled jobs — this is a failure to look.
              </p>
            </div>
          </div>
        ) : (data.clocks || []).length === 0 ? (
          <div className="p-5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-zinc-200">
              There are no scheduled jobs. Nothing in this business runs on its own.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[#222]">
            {(data.clocks || []).map((job) => {
              const health = clockHealth(job);
              return (
                <li key={job.jobname} className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <span className="mt-1"><StatusMark status={health.status} /></span>
                      <div className="min-w-0">
                        <p className="text-white font-semibold font-mono text-sm">{job.jobname}</p>
                        <p className="text-zinc-400 text-sm mt-1">{health.why}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm text-zinc-300">{scheduleInWords(job.schedule)}</p>
                      <p className="text-xs text-zinc-600 mt-1">
                        {job.runs_24h} {job.runs_24h === 1 ? 'run' : 'runs'} in 24h
                        {job.failed_24h > 0 && (
                          <span className="text-red-400"> · {job.failed_24h} failed</span>
                        )}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/*
          The half pg_cron cannot tell you.

          Every job above runs `net.http_post`, which QUEUES a request — so a
          "succeeded" run means we asked, not that anybody answered. On
          2026-10-13 an on-call escalation timed out after five seconds and
          pg_cron recorded it as a success. This is the line that would have
          shown it.
        */}
        {data.delivery && (
          <div className="p-5 border-t border-[#2A2A2A] bg-[#101010]">
            <div className="flex items-start gap-3">
              {data.delivery.undelivered > 0 || data.delivery.errored > 0
                ? <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                : <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />}
              <div className="min-w-0">
                <p className="text-zinc-200 text-sm font-semibold">
                  {data.delivery.undelivered === 0 && data.delivery.errored === 0
                    ? `All ${data.delivery.total} requests were answered.`
                    : `${data.delivery.undelivered} request${data.delivery.undelivered === 1 ? '' : 's'} got no answer`
                      + `${data.delivery.errored > 0 ? `, ${data.delivery.errored} returned an error` : ''}`
                      + ` out of ${data.delivery.total}.`}
                </p>
                <p className="text-zinc-500 text-xs mt-1">
                  A job above reads “succeeded” when it QUEUED its request, not when it was
                  answered — so this line is the one that catches a timeout.
                  {data.delivery.windowStart && (
                    <> Covers {new Date(data.delivery.windowStart).toLocaleString()} onward; older
                    responses are pruned by the database.</>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── the Exchange refresh ───────────────────────────────────────── */}
      {data.exchangeUpkeep && (
        <section className={`${CARD} p-5`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3 min-w-0">
              <MapPin className="w-5 h-5 text-zinc-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-white">The Exchange refresh</h3>
                {/*
                  Scheduled and having-run are reported separately, because they
                  can disagree in both directions: a scheduled job whose
                  requests are all refused has never run, and a job run by hand
                  has run without being scheduled. Collapsing them is how a week
                  of silence passes for a week of work.
                */}
                <p className="text-zinc-400 text-sm mt-1">
                  {data.exchangeUpkeep.armed
                    ? 'Scheduled.'
                    : 'Not scheduled — it runs only when somebody presses the button.'}
                  {' '}{data.exchangeUpkeep.summary}
                </p>
                {data.exchangeUpkeep.runs > 0 && (
                  <p className="text-zinc-600 text-xs mt-1">
                    {data.exchangeUpkeep.runs} {data.exchangeUpkeep.runs === 1 ? 'run' : 'runs'} on record.
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={refreshOneTown}
              disabled={refreshingTown}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1F1F1F] border border-[#2F2F2F] text-zinc-200 text-sm font-semibold hover:border-orange-500/50 flex-shrink-0 disabled:opacity-50"
            >
              {refreshingTown
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Refreshing…</>
                : <>Refresh one town <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        </section>
      )}

      {/* ── the store clock, which has its own panel ────────────────────── */}
      {data.storeClock && (
        <section className={`${CARD} p-5`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3 min-w-0">
              <Store className="w-5 h-5 text-zinc-400 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-white">The store's own jobs</h3>
                <p className="text-zinc-400 text-sm mt-1">
                  {data.storeClock.lastRunAt
                    ? `${data.storeClock.jobsEnabled} of ${data.storeClock.jobsRegistered} jobs enabled; `
                      + `last tick ${describeAge(data.storeClock.minutesSinceLastRun)}, `
                      + `${data.storeClock.totalRuns.toLocaleString()} ticks in total.`
                    : 'The store clock has never run a tick.'}
                </p>
                {/*
                  Null findings are NOT "nothing is wrong" — the reconciliation
                  has simply never run. The store panel makes the same point and
                  it is worth repeating wherever the number is shown.
                */}
                <p className="text-zinc-500 text-sm mt-1">
                  {data.storeClock.findings
                    ? `Reconciliation last ran ${new Date(data.storeClock.findings.at).toLocaleString()}: `
                      + `${data.storeClock.findings.urgent} urgent, ${data.storeClock.findings.attention} to look at.`
                    : 'The reconciliation has not run yet, so nothing has been checked — which is not the same as nothing being wrong.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => go('owners-dashboard')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1F1F1F] border border-[#2F2F2F] text-zinc-200 text-sm font-semibold hover:border-orange-500/50 flex-shrink-0"
            >
              Open the full panel <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
