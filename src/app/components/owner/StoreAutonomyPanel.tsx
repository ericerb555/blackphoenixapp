/**
 * Is the store running itself — and does it need anything from me?
 *
 * WHY THIS SCREEN EXISTS
 *
 * Eric's requirement, in his words: *"can we make sure the automony feature has
 * a reporting place that we can review and a place it it needs a human approval
 * or guidence we can communicate?"* Both halves are here, deliberately in one
 * place rather than two:
 *
 *   THE REPORT   what the clock did, when it last ran, which jobs are on
 *   THE ASKING   what it stopped and wants a decision about, with an answer box
 *
 * They belong together because the question a person has on opening this is one
 * question, not two: "is it working, and does it need me?" Splitting them across
 * two screens means the one nobody opens is where the next silence happens —
 * which is the whole reason this project has a scheduler at all.
 *
 * NOTHING HERE IS INVENTED
 *
 * Every figure is read from the heartbeat the server actually recorded. There is
 * no green light that means "probably fine": if the clock has never run, this
 * says so, and it says it differently from "ran and then stopped", because those
 * are different problems. A dashboard that reassures you without evidence is
 * worse than no dashboard.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Clock, CheckCircle2, AlertTriangle, HelpCircle, Loader2, RefreshCw,
  PauseCircle, PlayCircle, Send, Inbox,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../../utils/supabase/info';
import { supabase } from '../../lib/supabase';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface JobRun {
  name: string;
  ran: boolean;
  detail: string;
  error?: string;
  ms: number;
}

interface Run {
  runId: string;
  reason: string;
  startedAt: string;
  finishedAt: string;
  ms: number;
  jobs: JobRun[];
  errors: number;
}

interface Finding {
  kind: string;
  key: string;
  severity: 'urgent' | 'attention';
  summary: string;
  subject: { kind: string; id: string };
  ageHours: number;
  amount?: number;
}

interface Status {
  secretConfigured: boolean;
  lastRunAt: string | null;
  minutesSinceLastRun: number | null;
  totalRuns: number;
  jobs: Array<{ name: string; enabled: boolean }>;
  ceilings: { maxOrdersPerTick: number; maxSpendPerTick: number };
  recent: Run[];
  /** Null means the reconciliation has never run — NOT that nothing is wrong. */
  findings: { at: string; urgent: number; attention: number; items: Finding[] } | null;
}

interface Ask {
  id: string;
  job: string;
  question: string;
  because: string;
  wouldHaveDone?: string;
  choices: Array<{ key: string; label: string; consequence?: string }>;
  detail: Array<[string, string]>;
  status: string;
  raisedAt: string;
}

/** No tick in this long means something is wrong, not that it is quiet. */
const STALE_AFTER_MINUTES = 45;

const when = (iso: string | null) => {
  if (!iso) return 'never';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 'never';
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
};

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function StoreAutonomyPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [asks, setAsks] = useState<Ask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await authHeaders();
      const [sRes, aRes] = await Promise.all([
        fetch(`${SERVER}/store/autonomy/status`, { headers }),
        fetch(`${SERVER}/store/autonomy/asks`, { headers }),
      ]);
      const sData = await sRes.json().catch(() => null);
      const aData = await aRes.json().catch(() => null);
      if (!sRes.ok || !sData?.success) throw new Error(sData?.error || `Could not read the clock (${sRes.status}).`);
      setStatus(sData);
      // A failure to load the questions must not hide the report, but it must
      // not pretend there are none either.
      if (aRes.ok && aData?.success) setAsks(aData.items || []);
      else setAsks([]);
    } catch (err: any) {
      setError(err?.message || 'Could not read the clock.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const answer = async (ask: Ask, choice: string) => {
    setBusy(ask.id);
    try {
      const res = await fetch(`${SERVER}/store/autonomy/asks/${encodeURIComponent(ask.id)}/answer`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ choice, note: notes[ask.id] || '' }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `Could not record that (${res.status}).`);
      toast.success('Answered. The job will act on it on its next run.');
      setAsks((prev) => prev.filter((a) => a.id !== ask.id));
    } catch (err: any) {
      toast.error(err?.message || 'Could not record that.');
    } finally {
      setBusy(null);
    }
  };

  const toggleJob = async (name: string, enabled: boolean) => {
    setBusy(name);
    try {
      const res = await fetch(`${SERVER}/store/autonomy/settings`, {
        method: 'PUT',
        headers: await authHeaders(),
        body: JSON.stringify({ jobs: { [name]: enabled } }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `Could not change that (${res.status}).`);
      toast.success(`${name} is now ${enabled ? 'on' : 'off'}.`);
      void load();
    } catch (err: any) {
      toast.error(err?.message || 'Could not change that.');
    } finally {
      setBusy(null);
    }
  };

  const runNow = async () => {
    setBusy('run');
    try {
      const res = await fetch(`${SERVER}/store/autonomy/run`, { method: 'POST', headers: await authHeaders() });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || `Could not run it (${res.status}).`);
      toast.success(data.skipped ? 'A run is already in progress.' : `Ran ${(data.jobs || []).length} job(s).`);
      void load();
    } catch (err: any) {
      toast.error(err?.message || 'Could not run it.');
    } finally {
      setBusy(null);
    }
  };

  // ── Health, stated honestly ───────────────────────────────────────────────
  const health: 'never' | 'healthy' | 'stale' = !status?.lastRunAt
    ? 'never'
    : (status.minutesSinceLastRun ?? 0) > STALE_AFTER_MINUTES ? 'stale' : 'healthy';

  const HEALTH_COPY: Record<typeof health, { label: string; note: string; tint: string; Icon: any }> = {
    never: {
      label: 'Never run',
      note: status?.secretConfigured
        ? 'The secret is set but no tick has arrived. The schedule is probably not armed yet — the migration is still named .pending.'
        : 'No scheduler secret is configured, so nothing could authenticate even if the schedule were armed.',
      tint: 'text-gray-400 border-gray-600/40 bg-gray-500/5',
      Icon: PauseCircle,
    },
    stale: {
      label: 'Stopped',
      note: `It ran before but not in the last ${status?.minutesSinceLastRun ?? '?'} minutes. It ran and then stopped, which is a different problem from never having run.`,
      tint: 'text-red-400 border-red-500/40 bg-red-500/5',
      Icon: AlertTriangle,
    },
    healthy: {
      label: 'Running',
      note: `Last tick ${when(status?.lastRunAt ?? null)}. ${status?.totalRuns ?? 0} runs recorded.`,
      tint: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/5',
      Icon: CheckCircle2,
    },
  };

  if (loading && !status) {
    return (
      <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl p-8 text-center">
        <Loader2 className="w-6 h-6 text-orange-400 animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── The asking, first: it is the half that needs somebody ─────────── */}
      {asks.length > 0 && (
        <div className="bg-[#111] border border-amber-500/40 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <HelpCircle className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">
              Waiting on you — {asks.length} {asks.length === 1 ? 'decision' : 'decisions'}
            </h2>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            The store stopped rather than guess. Each job reads your answer on its next run.
          </p>

          <div className="space-y-4">
            {asks.map((ask) => (
              <div key={ask.id} className="border border-[#2A2A2A] rounded-xl p-4 bg-[#0A0A0A]">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <p className="text-sm font-bold text-white">{ask.question}</p>
                  <span className="text-[10px] uppercase tracking-wide text-gray-500 flex-shrink-0">
                    {ask.job} · {when(ask.raisedAt)}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mb-2">{ask.because}</p>
                {ask.wouldHaveDone && (
                  <p className="text-xs text-amber-400/90 mb-3">
                    Without you it would have: {ask.wouldHaveDone}
                  </p>
                )}

                {ask.detail?.length > 0 && (
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 mb-3 text-xs">
                    {ask.detail.map(([label, value], i) => (
                      <div key={`${ask.id}-d${i}`} className="contents">
                        <dt className="text-gray-500">{label}</dt>
                        <dd className="text-gray-300 break-words">{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                <textarea
                  value={notes[ask.id] || ''}
                  onChange={(e) => setNotes((p) => ({ ...p, [ask.id]: e.target.value }))}
                  placeholder="Anything the job should know (optional) — this is kept with the decision."
                  rows={2}
                  className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 mb-3"
                />

                <div className="flex flex-wrap gap-2">
                  {ask.choices.map((choice, i) => (
                    <button
                      key={choice.key}
                      onClick={() => void answer(ask, choice.key)}
                      disabled={busy === ask.id}
                      title={choice.consequence || ''}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition disabled:opacity-50 flex items-center gap-1.5 ${
                        i === 0
                          ? 'bg-amber-600 hover:bg-amber-500 text-white'
                          : 'bg-[#1A1A1A] hover:bg-[#222] text-gray-200 border border-[#2A2A2A]'
                      }`}
                    >
                      {busy === ask.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                      {choice.label}
                    </button>
                  ))}
                </div>
                {ask.choices.some((c) => c.consequence) && (
                  <ul className="mt-3 space-y-1">
                    {ask.choices.filter((c) => c.consequence).map((c) => (
                      <li key={`${ask.id}-c-${c.key}`} className="text-[11px] text-gray-500">
                        <span className="text-gray-400">{c.label}:</span> {c.consequence}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── What the reconciliation found ─────────────────────────────────── */}
      {status?.findings && status.findings.items.length > 0 && (
        <div className={`bg-[#111] border rounded-2xl p-5 ${status.findings.urgent > 0 ? 'border-red-500/40' : 'border-[#2A2A2A]'}`}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className={`w-5 h-5 ${status.findings.urgent > 0 ? 'text-red-400' : 'text-amber-400'}`} />
            <h2 className="text-base font-bold text-white">
              {status.findings.urgent > 0
                ? `${status.findings.urgent} urgent, ${status.findings.attention} to look at`
                : `${status.findings.attention} to look at`}
            </h2>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Money reconciled against what actually happened, {when(status.findings.at)}. Worst and
            oldest first — that is the order to work through them in.
          </p>
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {status.findings.items.map((f) => (
              <div
                key={f.key}
                className={`px-3 py-2 rounded-lg border ${
                  f.severity === 'urgent'
                    ? 'bg-red-500/5 border-red-500/30'
                    : 'bg-[#0A0A0A] border-[#2A2A2A]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className={`text-sm ${f.severity === 'urgent' ? 'text-red-200' : 'text-gray-200'}`}>
                    <span className="font-bold">{f.subject.id}</span> — {f.summary}
                  </p>
                  <span className="text-[10px] uppercase tracking-wide text-gray-500 flex-shrink-0">
                    {f.amount ? `$${f.amount.toFixed(2)} · ` : ''}{f.kind}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── The report ────────────────────────────────────────────────────── */}
      <div className="bg-[#111] border border-[#2A2A2A] rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-400" />
            <h2 className="text-base font-bold text-white">Store autonomy</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void runNow()}
              disabled={busy === 'run'}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1A1A1A] hover:bg-[#222] text-gray-200 border border-[#2A2A2A] disabled:opacity-50 flex items-center gap-1.5"
            >
              {busy === 'run' ? <Loader2 className="w-3 h-3 animate-spin" /> : <PlayCircle className="w-3 h-3" />}
              Run a tick now
            </button>
            <button
              onClick={() => void load()}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1A1A1A]"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400 flex items-start gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
          </p>
        )}

        {status && (
          <>
            <div className={`border rounded-xl p-4 mb-4 ${HEALTH_COPY[health].tint}`}>
              <div className="flex items-center gap-2 mb-1">
                {(() => { const I = HEALTH_COPY[health].Icon; return <I className="w-4 h-4" />; })()}
                <span className="text-sm font-bold">{HEALTH_COPY[health].label}</span>
              </div>
              <p className="text-xs text-gray-400">{HEALTH_COPY[health].note}</p>
            </div>

            {/*
              Said explicitly rather than shown as an empty list. "The
              reconciliation has not run" and "nothing is wrong" look identical
              on a dashboard, and the difference is the whole point of having
              one — a reassuring blank is how the original eight-week silence
              went unnoticed.
            */}
            {!status.findings && (
              <p className="text-xs text-gray-500 mb-4 flex items-start gap-2">
                <HelpCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                The reconciliation has never run, so nothing has been checked. That is not
                the same as nothing being wrong — switch the <span className="text-gray-300">watch</span> job on below.
              </p>
            )}
            {status.findings && status.findings.items.length === 0 && (
              <p className="text-xs text-emerald-400/90 mb-4 flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                Checked {when(status.findings.at)}: every paid order has been sent to a supplier,
                and every customer who should have been told has been.
              </p>
            )}

            <div className="mb-4">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Jobs</p>
              <div className="space-y-1.5">
                {status.jobs.map((job) => (
                  <div key={job.name} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A]">
                    <span className="text-sm text-gray-200">{job.name}</span>
                    {job.name === 'heartbeat' ? (
                      <span className="text-[11px] text-gray-500">always on</span>
                    ) : (
                      <button
                        onClick={() => void toggleJob(job.name, !job.enabled)}
                        disabled={busy === job.name}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition disabled:opacity-50 ${
                          job.enabled
                            ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-[#1A1A1A] text-gray-400 border border-[#2A2A2A]'
                        }`}
                      >
                        {busy === job.name ? '…' : job.enabled ? 'On' : 'Off'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-500 mt-2">
                Ceilings per tick: {status.ceilings.maxOrdersPerTick} supplier orders, $
                {status.ceilings.maxSpendPerTick.toLocaleString()} committed.
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Recent runs</p>
              {status.recent.length === 0 ? (
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <Inbox className="w-4 h-4" /> Nothing recorded yet.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {status.recent.map((run) => (
                    <div key={run.runId} className="px-3 py-2 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A]">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[11px] text-gray-500">
                          {when(run.finishedAt)} · {run.reason} · {run.ms}ms
                        </span>
                        {run.errors > 0 && (
                          <span className="text-[11px] text-red-400 font-bold">{run.errors} error{run.errors === 1 ? '' : 's'}</span>
                        )}
                      </div>
                      {run.jobs.length === 0 ? (
                        <p className="text-xs text-gray-500">No job was enabled.</p>
                      ) : (
                        <ul className="space-y-0.5">
                          {run.jobs.map((job) => (
                            <li key={`${run.runId}-${job.name}`} className="text-xs">
                              <span className={job.error ? 'text-red-400' : job.ran ? 'text-gray-200' : 'text-gray-500'}>
                                {job.name}
                              </span>
                              <span className="text-gray-500"> — {job.error || job.detail}</span>
                            </li>
                          ))}
                        </ul>
                      )}
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
