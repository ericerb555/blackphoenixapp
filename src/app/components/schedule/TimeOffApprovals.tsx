/**
 * The requests waiting on somebody, and the call-outs that did not wait.
 *
 * WHY PENDING REQUESTS COME FIRST AND LOUDEST
 *
 * Because a technician is standing on the other end of each one. Eric's rule is
 * that time off blocks nothing until it is approved, which is the right rule —
 * but it means an unread request is a person who does not know whether they
 * have the day, and a schedule that still counts on somebody who has already
 * made plans. The cost of this screen being quiet is a request nobody sees.
 *
 * WHY CALL-OUTS ARE SHOWN BUT NOT DECIDED
 *
 * A call-out is a statement, not a request — it took effect the moment it was
 * filed and there is nothing here to approve. It appears so that whoever opens
 * this screen in the morning knows who is missing, and it is deliberately not
 * given approve and decline buttons that would imply the day is negotiable.
 *
 * WHAT THIS SCREEN DOES NOT DO
 *
 * Move anybody's work. Approving leave records a decision about a person;
 * deciding what happens to the jobs on those days is a separate act against
 * promises already made to customers.
 */
import { useState, useEffect, useCallback } from 'react';
import { Loader2, Check, X, CalendarOff, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { projectId } from '../../utils/supabase/info';
import type { UnavailabilityRecord } from './TimeOffPanel';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/unavailability`;

/** A range as a person would read it. */
export const rangeLabel = (r: { from: string; to?: string }) =>
  r.to && r.to !== r.from ? `${r.from} → ${r.to}` : r.from;

/**
 * How many days a record takes out of the schedule.
 *
 * Counted on plain date strings rather than by subtracting Date objects, for
 * the same reason the scheduler does: a Date carries a timezone and a range
 * spanning a clock change comes back a day short.
 */
export function dayCount(r: { from: string; to?: string }): number {
  const from = String(r.from || '');
  const to = String(r.to || from);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return 0;
  if (to < from) return 0;
  let days = 1;
  const cursor = new Date(`${from}T12:00:00Z`);
  const end = new Date(`${to}T12:00:00Z`);
  while (cursor < end) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    days += 1;
  }
  return days;
}

export default function TimeOffApprovals({
  nameFor,
  onPendingCount,
}: {
  /** Turns an employee id into a name, so the list reads as people. */
  nameFor?: (employeeId: string) => string;
  /**
   * How many requests are waiting, reported upward so a badge can show it from
   * another tab. Without it the count is only visible to somebody already
   * looking at this screen, which is the one person who does not need telling.
   */
  onPendingCount?: (count: number) => void;
}) {
  const [records, setRecords] = useState<UnavailabilityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const headers = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Sign in again.');
    return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' };
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch(API, { headers: await headers() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) throw new Error(json?.error || 'Could not load requests.');
      const rows: UnavailabilityRecord[] = Array.isArray(json.unavailability) ? json.unavailability : [];
      setRecords(rows);
      onPendingCount?.(rows.filter(r => r.kind === 'time_off' && r.status === 'requested').length);
    } catch (error: any) {
      toast.error(error.message || 'Could not load requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function decide(id: string, decision: 'approved' | 'declined') {
    setBusyId(id);
    try {
      const res = await fetch(`${API}/${encodeURIComponent(id)}/decide`, {
        method: 'POST', headers: await headers(), body: JSON.stringify({ decision }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) throw new Error(json?.error || 'Could not record that.');
      toast.success(decision === 'approved' ? 'Approved.' : 'Declined.');
      await load();
    } catch (error: any) {
      toast.error(error.message || 'Could not record that.');
    } finally {
      setBusyId(null);
    }
  }

  const who = (id: string) => (nameFor?.(id) || id);
  const pending = records.filter(r => r.kind === 'time_off' && r.status === 'requested');
  const callOuts = records.filter(r => r.kind === 'call_out' && r.status !== 'cancelled');
  const settled = records.filter(r => r.kind === 'time_off' && r.status !== 'requested' && r.status !== 'cancelled');

  if (loading) return <p className="py-8 text-center text-sm text-gray-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-white">
          <Clock className="h-4 w-4 text-amber-400" />
          Waiting on you
          {pending.length > 0 && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[11px] font-black text-amber-400">
              {pending.length}
            </span>
          )}
        </h3>
        {pending.length === 0 ? (
          <p className="rounded-xl border border-gray-800 p-6 text-center text-sm text-gray-500">
            No requests waiting.
          </p>
        ) : (
          <ul className="space-y-2">
            {pending.map(r => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
                <div>
                  <p className="font-semibold text-white">{who(r.employeeId)}</p>
                  <p className="text-sm text-gray-400">
                    {rangeLabel(r)} · {dayCount(r)} day{dayCount(r) === 1 ? '' : 's'}
                  </p>
                  {r.reason && <p className="text-xs text-gray-500">{r.reason}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => decide(r.id, 'declined')} disabled={busyId === r.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-2 text-sm font-semibold text-gray-300 transition hover:bg-gray-800 disabled:opacity-40">
                    <X className="h-4 w-4" /> Decline
                  </button>
                  <button onClick={() => decide(r.id, 'approved')} disabled={busyId === r.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-green-500 disabled:opacity-40">
                    {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Approve
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {callOuts.length > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-white">
            <CalendarOff className="h-4 w-4 text-red-400" />
            Called out
          </h3>
          {/*
            No approve or decline here. A call-out took effect when it was
            filed, and offering buttons would imply the day is negotiable.
          */}
          <ul className="space-y-2">
            {callOuts.map(r => (
              <li key={r.id} className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4">
                <p className="font-semibold text-white">{who(r.employeeId)}</p>
                <p className="text-sm text-gray-400">{rangeLabel(r)}</p>
                {r.reason && <p className="text-xs text-gray-500">{r.reason}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {settled.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-bold uppercase text-gray-500">Decided</h3>
          <ul className="space-y-1.5">
            {settled.map(r => (
              <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-800 px-3 py-2 text-sm">
                <span className="text-gray-300">{who(r.employeeId)} · {rangeLabel(r)}</span>
                <span className={r.status === 'approved' ? 'text-green-400' : 'text-red-400'}>
                  {r.status}{r.decidedBy ? ` by ${r.decidedBy}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
