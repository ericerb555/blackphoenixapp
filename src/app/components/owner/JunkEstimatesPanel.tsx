/**
 * The junk estimates waiting on us, and booking one in.
 *
 * Eric, 2026-11-17: *"can we add a scheduling feature to the junk removal once
 * a price is submitted for review by us?"*
 *
 * WHY THIS PANEL HAD TO EXIST BEFORE SCHEDULING COULD
 *
 * `ask-us-to-confirm` wrote an admin alert and sent an email, and that was the
 * whole of the office's view. There was no screen anywhere that listed junk
 * estimates — so the queue existed, was recorded correctly, and could only be
 * read by scrolling the alert list or searching an inbox. A confirmation step
 * nobody can see is not a step, which is the same sentence the server route
 * already uses about the listing it added for exactly this reason.
 *
 * WHAT BOOKING ACTUALLY DOES
 *
 * `POST /trash-estimator/estimates/:id/schedule` writes an ordinary record
 * into `appointment:` — the same store the calendar, MasterScheduling and the
 * scheduling assistant all read — and links it to the estimate both ways. A
 * junk job in its own store would be invisible to the screen the crew checks
 * to find out who is working on Thursday.
 *
 * The server refuses a technician who cannot work that day, through the same
 * `availabilityOn` rule those screens display: a call-out counts immediately,
 * approved time off counts, a PENDING request does not. This panel does not
 * re-implement that check — it shows the refusal. A fourth copy of an
 * availability rule is the copy that drifts.
 *
 * WHY THE ROSTER IS FETCHED AND NOT INVENTED
 *
 * `time-tracking/employees`, which is the roster the timeclock punches
 * against. An empty roster says so rather than offering a name nobody
 * employs — the precedent set when the booking page was found sending three
 * fictional technicians, with ratings and certifications, to customers
 * choosing who comes to their house.
 */
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  CalendarClock, Loader2, MapPin, User, CheckCircle2, AlertTriangle, Clock,
} from 'lucide-react';
import { authedHeaders } from '../../utils/authHeaders';
import { API_BASE_URL } from '../../lib/apiConfig';

const SERVER = `${API_BASE_URL}/make-server-3eae23a6`;

interface Estimate {
  id: string;
  customerEmail?: string;
  status?: string;
  confirmationRequestedAt?: string | null;
  customerMessage?: string | null;
  address?: string;
  serviceAddress?: string;
  needsSiteVisit?: boolean;
  cost?: { low?: number; likely?: number; high?: number };
  volumeCuYd?: { likely?: number };
  loads?: number;
  scheduledFor?: { date: string; time: string; employeeName?: string; hours?: number };
  createdAt?: string;
}

interface Employee { id: string; name?: string; email?: string; active?: boolean }

const money = (n: unknown) => '$' + Math.round(Number(n) || 0).toLocaleString();

const shortDate = (iso?: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
};

export default function JunkEstimatesPanel() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [roster, setRoster] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  /** Which estimate's form is open, and what is in it. */
  const [booking, setBooking] = useState<Record<string, { date: string; time: string; employeeId: string; hours: number; note: string }>>({});
  const [saving, setSaving] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const headers = await authedHeaders();
      const [estRes, rosterRes] = await Promise.all([
        fetch(`${SERVER}/trash-estimator/estimates`, { headers }),
        fetch(`${SERVER}/time-tracking/employees`, { headers }),
      ]);
      const estJson = await estRes.json().catch(() => ({}));
      if (!estRes.ok || !estJson?.success) throw new Error(estJson?.error || 'The estimates could not be read.');
      setEstimates(Array.isArray(estJson.estimates) ? estJson.estimates : []);

      /*
       * The roster failing is not the estimates failing. A list you cannot
       * book from is still a list worth seeing, so this degrades to "no
       * roster" rather than taking the screen down with it.
       */
      const rosterJson = await rosterRes.json().catch(() => ({}));
      const people = rosterJson?.employees ?? rosterJson?.data ?? [];
      setRoster(Array.isArray(people) ? people.filter((p: Employee) => p?.active !== false) : []);
    } catch (err: any) {
      setError(err?.message || 'The estimates could not be read.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  /** Submitted for review, and not yet booked — the queue this screen is for. */
  const waiting = estimates.filter((e) => e.confirmationRequestedAt && !e.scheduledFor);
  const booked = estimates.filter((e) => e.scheduledFor);

  const formFor = (id: string) => booking[id] || { date: '', time: '08:00', employeeId: '', hours: 2, note: '' };
  const setForm = (id: string, patch: Partial<ReturnType<typeof formFor>>) =>
    setBooking((b) => ({ ...b, [id]: { ...formFor(id), ...patch } }));

  const schedule = async (estimate: Estimate) => {
    const form = formFor(estimate.id);
    if (!form.date) { toast.error('Pick a day.'); return; }
    if (!form.employeeId) { toast.error('Pick who is going.'); return; }
    setSaving(estimate.id);
    try {
      const res = await fetch(`${SERVER}/trash-estimator/estimates/${encodeURIComponent(estimate.id)}/schedule`, {
        method: 'POST',
        headers: { ...(await authedHeaders()), 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      /*
       * The server's refusal is shown as written. It knows why — called out,
       * approved time off, not enough hours left that day — and rewording it
       * here would turn a specific answer into a generic one.
       */
      if (!res.ok || !json?.success) throw new Error(json?.error || 'It could not be booked.');
      toast.success(`Booked for ${form.date} at ${form.time}.`);
      void load();
    } catch (err: any) {
      toast.error(err?.message || 'It could not be booked.', { duration: 8000 });
    } finally {
      setSaving('');
    }
  };

  const input = 'rounded-lg border border-[#2A2A2A] bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none focus:border-orange-500';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-orange-500" />
          <h3 className="text-lg font-black text-white">Junk estimates waiting on us</h3>
          {!loading && <span className="text-sm text-gray-500">{waiting.length}</span>}
        </div>
        <button onClick={() => void load()} className="text-xs text-gray-400 hover:text-white">Refresh</button>
      </div>

      {loading && (
        <p className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Reading the queue…
        </p>
      )}

      {!loading && error && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-900/50 bg-amber-950/30 p-3 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      )}

      {!loading && !error && waiting.length === 0 && (
        <p className="text-sm text-gray-400">
          Nothing waiting. A customer who prices a job and asks us to confirm it appears here.
        </p>
      )}

      {!loading && roster.length === 0 && waiting.length > 0 && (
        <p className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-3 text-xs text-amber-200">
          Nobody is on the roster, so there is no one to assign. Add staff under HR &amp; Employee Hub
          and they will appear here.
        </p>
      )}

      {waiting.map((e) => {
        const form = formFor(e.id);
        const busy = saving === e.id;
        return (
          <div key={e.id} className="rounded-2xl border border-[#2A2A2A] bg-[#0d0d0d] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-black text-white">{money(e.cost?.likely)}</p>
                <p className="text-xs text-gray-500">
                  {money(e.cost?.low)}–{money(e.cost?.high)} · about {e.volumeCuYd?.likely ?? '?'} cu yd
                  {e.loads ? ` in ${e.loads} load(s)` : ''}
                </p>
              </div>
              <div className="text-right text-xs text-gray-400">
                <p className="flex items-center justify-end gap-1"><User className="h-3 w-3" /> {e.customerEmail || '—'}</p>
                <p className="flex items-center justify-end gap-1">
                  <Clock className="h-3 w-3" /> asked {shortDate(e.confirmationRequestedAt)}
                </p>
              </div>
            </div>

            {(e.address || e.serviceAddress) && (
              <p className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                <MapPin className="h-3 w-3" /> {e.address || e.serviceAddress}
              </p>
            )}
            {e.needsSiteVisit && (
              <p className="mt-2 text-xs text-amber-300">Flagged for a site visit before the price is firm.</p>
            )}
            {e.customerMessage && (
              <p className="mt-2 rounded-lg bg-[#111] p-2 text-xs text-gray-300">“{e.customerMessage}”</p>
            )}

            <div className="mt-4 grid gap-2 sm:grid-cols-5">
              <label className="sm:col-span-1">
                <span className="text-[10px] uppercase tracking-wide text-gray-500">Day</span>
                <input type="date" value={form.date} onChange={(ev) => setForm(e.id, { date: ev.target.value })} className={`${input} w-full`} />
              </label>
              <label className="sm:col-span-1">
                <span className="text-[10px] uppercase tracking-wide text-gray-500">Time</span>
                <input type="time" value={form.time} onChange={(ev) => setForm(e.id, { time: ev.target.value })} className={`${input} w-full`} />
              </label>
              <label className="sm:col-span-2">
                <span className="text-[10px] uppercase tracking-wide text-gray-500">Who is going</span>
                <select value={form.employeeId} onChange={(ev) => setForm(e.id, { employeeId: ev.target.value })} className={`${input} w-full`}>
                  <option value="">Pick somebody…</option>
                  {roster.map((p) => (
                    <option key={p.id} value={p.id} className="bg-[#1A1A1A]">{p.name || p.email || p.id}</option>
                  ))}
                </select>
              </label>
              <label className="sm:col-span-1">
                <span className="text-[10px] uppercase tracking-wide text-gray-500">Hours</span>
                <input type="number" min={1} max={12} value={form.hours}
                  onChange={(ev) => setForm(e.id, { hours: Math.min(12, Math.max(1, Number(ev.target.value) || 1)) })}
                  className={`${input} w-full`} />
              </label>
            </div>

            <button
              onClick={() => void schedule(e)}
              disabled={busy}
              className="mt-3 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-black text-black disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
              {busy ? 'Booking…' : 'Book it in'}
            </button>
          </div>
        );
      })}

      {booked.length > 0 && (
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#0d0d0d] p-5">
          <p className="text-sm font-black text-white">Booked</p>
          <div className="mt-3 space-y-2">
            {booked.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F1F1F] pb-2 last:border-0 last:pb-0">
                <span className="flex items-center gap-2 text-sm text-gray-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  {e.customerEmail || '—'} · {money(e.cost?.likely)}
                </span>
                <span className="text-xs text-gray-400">
                  {e.scheduledFor?.date} at {e.scheduledFor?.time}
                  {e.scheduledFor?.employeeName ? ` · ${e.scheduledFor.employeeName}` : ''}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            These are ordinary appointments — they show on the master schedule and the crew's app,
            not just here.
          </p>
        </div>
      )}
    </div>
  );
}
