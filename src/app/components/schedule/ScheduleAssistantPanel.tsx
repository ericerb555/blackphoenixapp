/**
 * What the scheduler would do, and the button that makes it real.
 *
 * THE THREE GROUPS ARE THE WHOLE DESIGN
 *
 *   Ready        one sensible answer — confirm and move on
 *   Needs you    a choice was involved, so a person makes it
 *   Cannot place nobody can do it inside what the customer asked for
 *
 * Eric's rule is auto for the simple and ask for the hard, and this is where
 * somebody sees which is which. The middle group is the one that earns the
 * screen: it is the work that would otherwise sit unnoticed because nothing
 * was obviously wrong with it.
 *
 * WHY "READY" STILL HAS A BUTTON
 *
 * Because proposing and promising are different acts. `auto` means no choice
 * was involved in working it out — not that it has already happened. The
 * person pressing confirm is the one who will ring the customer, and they
 * should press it knowingly.
 *
 * WHY EVERY ROW CARRIES ITS REASON
 *
 * A proposal nobody can check is an instruction. "Dave, Tuesday" invites
 * trust; "Dave is the only one free on Tuesday with the trade" invites a
 * glance at whether that is true.
 */
import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Check, Loader2, AlertTriangle, RefreshCw, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { projectId } from '../../utils/supabase/info';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/schedule`;

interface ProposalOption {
  techId: string;
  techName?: string;
  hoursFree: number;
  caveat?: string;
}

interface Proposal {
  jobId: string;
  title?: string;
  date: string | null;
  techId?: string;
  techName?: string;
  hours: number;
  outcome: 'auto' | 'choice' | 'none';
  reason: string;
  alternatives: ProposalOption[];
  asked: string;
  assumed: boolean;
}

export default function ScheduleAssistantPanel({ onConfirmed }: { onConfirmed?: () => void }) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [summary, setSummary] = useState('');
  const [context, setContext] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  /** Which technician a person picked, where the proposal offered several. */
  const [picked, setPicked] = useState<Record<string, string>>({});

  const headers = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Sign in again.');
    return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' };
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/proposals`, { headers: await headers() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) throw new Error(json?.error || 'Could not work out a schedule.');
      setProposals(Array.isArray(json.proposals) ? json.proposals : []);
      setSummary(String(json.summary || ''));
      setContext(json.context || null);
    } catch (error: any) {
      toast.error(error.message || 'Could not work out a schedule.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function confirm(p: Proposal) {
    const techId = picked[p.jobId] || p.techId;
    if (!p.date || !techId) return;
    setBusyId(p.jobId);
    try {
      const res = await fetch(`${API}/confirm`, {
        method: 'POST',
        headers: await headers(),
        body: JSON.stringify({ jobId: p.jobId, techId, date: p.date, hours: p.hours }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) throw new Error(json?.error || 'Could not confirm that.');
      toast.success('Scheduled. The customer has not been told — that is still yours to do.');
      await load();
      onConfirmed?.();
    } catch (error: any) {
      toast.error(error.message || 'Could not confirm that.');
    } finally {
      setBusyId(null);
    }
  }

  const ready = proposals.filter(p => p.outcome === 'auto');
  const needsYou = proposals.filter(p => p.outcome === 'choice');
  const cannot = proposals.filter(p => p.outcome === 'none');

  const Row = ({ p }: { p: Proposal }) => {
    const options = p.alternatives.length ? p.alternatives : (p.techId ? [{ techId: p.techId, techName: p.techName, hoursFree: 0 }] : []);
    const chosen = picked[p.jobId] || p.techId || '';
    return (
      <li className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-white">{p.title || p.jobId}</p>
            <p className="text-sm text-gray-400">
              {p.date ? <>{p.date}{p.hours ? ` · ${p.hours}h` : ''}</> : 'no day found'}
            </p>
            {/* The reason, always. See the note at the top of this file. */}
            <p className="mt-1 text-xs text-gray-500">{p.reason}</p>
            <p className="text-[11px] text-gray-600">They asked: {p.asked}</p>
            {p.assumed && (
              <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-400">
                <AlertTriangle className="h-3 w-3" />
                resting on an assumption — worth a look before you promise it
              </p>
            )}
          </div>

          {p.date && options.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {options.length > 1 && (
                <select
                  value={chosen}
                  onChange={e => setPicked(s => ({ ...s, [p.jobId]: e.target.value }))}
                  className="rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] px-2 py-2 text-sm text-white outline-none"
                >
                  {options.map(o => (
                    <option key={o.techId} value={o.techId}>
                      {o.techName || o.techId}{o.caveat ? ` (${o.caveat})` : ''}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={() => confirm(p)}
                disabled={busyId === p.jobId}
                className="inline-flex items-center gap-2 rounded-lg bg-[#ea580c] px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-500 disabled:opacity-40"
              >
                {busyId === p.jobId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Confirm
              </button>
            </div>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#1a1a1a] p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-white">
            <Sparkles className="h-4 w-4 text-[#ea580c]" />
            Scheduling assistant
          </h3>
          <p className="text-sm text-gray-400">{loading ? 'Working it out…' : summary}</p>
        </div>
        <button onClick={() => void load()} disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm font-semibold text-gray-300 transition hover:bg-[#2A2A2A] disabled:opacity-40">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Work it out again
        </button>
      </div>

      {/*
        Said rather than left as an empty list. A scheduler with nobody on the
        roster produces nothing, and "no proposals" on its own reads as a fault
        instead of as an empty roster.
      */}
      {!loading && proposals.length === 0 && (
        <p className="rounded-lg border border-[#2A2A2A] p-6 text-center text-sm text-gray-500">
          {context?.technicians === 0
            ? 'Nobody is on the roster yet, so there is nobody to schedule.'
            : context?.waiting === 0
              ? 'No work requests are waiting for a day.'
              : 'Nothing to propose.'}
        </p>
      )}

      {context?.techniciansWithoutTrades > 0 && proposals.length > 0 && (
        <p className="mb-4 flex gap-2 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] p-3 text-xs text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {context.techniciansWithoutTrades} technician{context.techniciansWithoutTrades === 1 ? ' has' : 's have'} no
            trades recorded, so they are offered for any trade and flagged. Recording their trades makes these proposals sharper.
          </span>
        </p>
      )}

      <div className="space-y-6">
        {ready.length > 0 && (
          <section>
            <h4 className="mb-2 text-xs font-bold uppercase text-green-400">Ready — {ready.length}</h4>
            <ul className="space-y-2">{ready.map(p => <Row key={p.jobId} p={p} />)}</ul>
          </section>
        )}

        {needsYou.length > 0 && (
          <section>
            <h4 className="mb-2 text-xs font-bold uppercase text-amber-400">Needs you — {needsYou.length}</h4>
            <ul className="space-y-2">{needsYou.map(p => <Row key={p.jobId} p={p} />)}</ul>
          </section>
        )}

        {cannot.length > 0 && (
          <section>
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase text-red-400">
              <CalendarClock className="h-3.5 w-3.5" />
              Cannot place — {cannot.length}
            </h4>
            <ul className="space-y-2">{cannot.map(p => <Row key={p.jobId} p={p} />)}</ul>
          </section>
        )}
      </div>
    </div>
  );
}
