/**
 * A technician's own time off, and the button for the morning they cannot come.
 *
 * TWO ACTIONS THAT LOOK SIMILAR AND ARE NOT
 *
 * Booking a holiday is a REQUEST. It waits for an admin, and until it is
 * approved the schedule still counts on that person — which is why this screen
 * says "requested" rather than showing it as time already taken. A technician
 * who reads a pending request as settled books a flight.
 *
 * Calling out is a STATEMENT. It takes effect at once, because waiting for an
 * approval that arrives after the crew was due on site helps nobody. That is
 * also why it is the more prominent control on the day it matters and the more
 * awkward one to press by accident.
 *
 * WHAT THIS SCREEN DOES NOT PROMISE
 *
 * That somebody has covered the work. Recording that Dave is off and deciding
 * what happens to Dave's Tuesday are different things, and this does only the
 * first. Saying more here would be telling a technician their jobs are handled
 * when nobody has looked at them.
 */
import { useState, useEffect, useCallback } from 'react';
import { CalendarOff, Plus, Loader2, X, AlertTriangle, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { projectId } from '../../utils/supabase/info';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6/unavailability`;

export interface UnavailabilityRecord {
  id: string;
  employeeId: string;
  from: string;
  to?: string;
  kind: 'time_off' | 'call_out';
  status: 'requested' | 'approved' | 'declined' | 'cancelled';
  reason?: string;
  decidedBy?: string;
  decisionNote?: string;
}

/** Today where the company is, so a late-evening call-out is not tomorrow. */
export const companyToday = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

const STATUS_STYLE: Record<string, string> = {
  requested: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  approved: 'border-green-500/40 bg-green-500/10 text-green-400',
  declined: 'border-red-500/40 bg-red-500/10 text-red-400',
  cancelled: 'border-gray-600/40 bg-gray-600/10 text-gray-400',
};

/** Said as a person would say it, not as the record spells it. */
export function describe(record: UnavailabilityRecord): string {
  const range = record.to && record.to !== record.from
    ? `${record.from} to ${record.to}`
    : record.from;
  if (record.kind === 'call_out') return `Called out — ${range}`;
  if (record.status === 'requested') return `Requested — ${range}`;
  if (record.status === 'approved') return `Approved — ${range}`;
  if (record.status === 'declined') return `Declined — ${range}`;
  return `Cancelled — ${range}`;
}

export default function TimeOffPanel() {
  const [records, setRecords] = useState<UnavailabilityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [confirmingCallOut, setConfirmingCallOut] = useState(false);

  const headers = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Sign in again.');
    return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' };
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch(API, { headers: await headers() });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) throw new Error(json?.error || 'Could not load your time off.');
      setRecords(Array.isArray(json.unavailability) ? json.unavailability : []);
    } catch (error: any) {
      toast.error(error.message || 'Could not load your time off.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function submit(kind: 'time_off' | 'call_out') {
    setBusy(true);
    try {
      const body = kind === 'call_out'
        ? { kind, from: companyToday(), reason: reason.trim() }
        : { kind, from, to: to || from, reason: reason.trim() };
      const res = await fetch(API, { method: 'POST', headers: await headers(), body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) throw new Error(json?.error || 'Could not record that.');
      toast.success(kind === 'call_out'
        ? 'Recorded. Your jobs today will be looked at.'
        : 'Requested. You will hear once it has been decided.');
      setRequesting(false);
      setConfirmingCallOut(false);
      setFrom(''); setTo(''); setReason('');
      await load();
    } catch (error: any) {
      toast.error(error.message || 'Could not record that.');
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`${API}/${encodeURIComponent(id)}/cancel`, {
        method: 'POST', headers: await headers(), body: '{}',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) throw new Error(json?.error || 'Could not cancel that.');
      await load();
    } catch (error: any) {
      toast.error(error.message || 'Could not cancel that.');
    } finally {
      setBusy(false);
    }
  }

  const live = records.filter(r => r.status !== 'cancelled');

  return (
    <div className="rounded-xl border border-gray-800 bg-[#1a1a1a] p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white">Time off</h3>
          <p className="text-sm text-gray-400">Book days ahead, or tell us you cannot come in today.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setRequesting(v => !v)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#ea580c] px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-500"
          >
            <Plus className="h-4 w-4" />
            Request time off
          </button>
          {/*
            Deliberately not beside the request button as an equal. Calling out
            is the rarer, heavier action and takes effect the moment it is
            pressed, so it asks once before it does.
          */}
          <button
            onClick={() => setConfirmingCallOut(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-300 transition hover:bg-red-500/20"
          >
            <CalendarOff className="h-4 w-4" />
            Call out today
          </button>
        </div>
      </div>

      {requesting && (
        <div className="mb-5 rounded-lg border border-gray-800 bg-[#0A0A0A] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-gray-500">First day</label>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)}
                className="w-full rounded-lg border border-gray-800 bg-[#1a1a1a] px-3 py-2 text-sm text-white outline-none focus:border-orange-500" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Last day</label>
              <input type="date" value={to} onChange={e => setTo(e.target.value)} min={from}
                className="w-full rounded-lg border border-gray-800 bg-[#1a1a1a] px-3 py-2 text-sm text-white outline-none focus:border-orange-500" />
              <p className="mt-1 text-[11px] text-gray-600">Leave blank for a single day.</p>
            </div>
          </div>
          <label className="mb-1 mt-3 block text-xs font-bold uppercase text-gray-500">Reason (optional)</label>
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Holiday, appointment…"
            className="w-full rounded-lg border border-gray-800 bg-[#1a1a1a] px-3 py-2 text-sm text-white outline-none focus:border-orange-500" />
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => setRequesting(false)}
              className="rounded-lg border border-gray-800 px-4 py-2 text-sm font-semibold text-gray-300 hover:bg-gray-800">
              Cancel
            </button>
            <button onClick={() => submit('time_off')} disabled={!from || busy}
              className="inline-flex items-center gap-2 rounded-lg bg-[#ea580c] px-4 py-2 text-sm font-bold text-white disabled:opacity-40">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Send request
            </button>
          </div>
        </div>
      )}

      {confirmingCallOut && (
        <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/5 p-4">
          <p className="flex gap-2 text-sm text-red-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {/*
              Says what actually happens, and what does not. A technician should
              not leave this screen believing somebody has already covered their
              work.
            */}
            <span>
              This takes effect straight away for <strong>{companyToday()}</strong> — you come off today's
              schedule and your jobs are flagged for someone to look at. It does not reassign them by itself,
              and it does not tell your customers anything.
            </span>
          </p>
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Anything we should know (optional)"
            className="mt-3 w-full rounded-lg border border-gray-800 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-red-500" />
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => setConfirmingCallOut(false)}
              className="rounded-lg border border-gray-800 px-4 py-2 text-sm font-semibold text-gray-300 hover:bg-gray-800">
              Not now
            </button>
            <button onClick={() => submit('call_out')} disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-40">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarOff className="h-4 w-4" />}
              I cannot come in today
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="py-6 text-center text-sm text-gray-500">Loading…</p>
      ) : live.length === 0 ? (
        <p className="rounded-lg border border-gray-800 p-6 text-center text-sm text-gray-500">
          Nothing booked. Request time off above.
        </p>
      ) : (
        <ul className="space-y-2">
          {live.map(record => (
            <li key={record.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-800 bg-[#0A0A0A] p-3">
              <div>
                <p className="text-sm font-semibold text-white">{describe(record)}</p>
                {record.reason && <p className="text-xs text-gray-500">{record.reason}</p>}
                {record.status === 'declined' && record.decisionNote && (
                  <p className="text-xs text-red-300">{record.decisionNote}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase ${STATUS_STYLE[record.status] || STATUS_STYLE.cancelled}`}>
                  {record.status}
                </span>
                {record.status !== 'declined' && (
                  <button onClick={() => cancel(record.id)} disabled={busy} aria-label="Cancel"
                    className="rounded-lg border border-gray-800 p-1.5 text-gray-500 transition hover:text-red-400 disabled:opacity-40">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
