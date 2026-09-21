/**
 * PropertyInspections — walk a whole building and record what you find.
 *
 * Distinct from the property's photos, which are the portfolio. This is a dated
 * event: what the roof, the boiler and the stairs looked like on this day,
 * recorded by this person. A condition record whose date cannot be trusted is
 * worth nothing in the one moment it matters, so each walkthrough is its own
 * record rather than more pictures on a pile.
 *
 * IT SAVES AS IT GOES
 *
 * An inspection takes an hour, on a phone, in a building with poor signal.
 * Holding all of it in a tab and posting once at the end is how somebody loses
 * the lot to an incoming call. So it is created first and saved as the walk
 * proceeds, and a draft is visibly a draft — a half-finished walkthrough that
 * looked complete would read as a building in perfect condition.
 *
 * The areas and the evidence capture come from ConditionAreas, shared with the
 * move-in and move-out forms, because they are the same act.
 */
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  ClipboardCheck, LoaderCircle, Plus, Camera, CheckCircle2,
  Trash2, ChevronLeft, AlertTriangle,
} from 'lucide-react';
import { projectId } from '../../utils/supabase/info';
import ConditionAreas, {
  PROPERTY_AREAS, blankAreas, type AreaRow,
} from './ConditionAreas';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface Property { id: string; name?: string; address?: string; }

interface Inspection {
  id: string;
  propertyId: string;
  propertyName?: string;
  propertyAddress?: string;
  inspector?: string;
  status: 'draft' | 'complete';
  areas: AreaRow[];
  summary?: string;
  startedAt?: string;
  completedAt?: string;
}

const day = (iso?: string | null) => (iso ? String(iso).slice(0, 10) : '');

export default function PropertyInspections({
  session, properties,
}: { session: any; properties: Property[] }) {
  const [list, setList] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Inspection | null>(null);
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [propertyId, setPropertyId] = useState('');

  const authHeaders = session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : undefined;

  const load = useCallback(async () => {
    if (!authHeaders) { setList([]); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/landlord/inspections`, { headers: authHeaders });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Unable to load inspections.');
      setList(Array.isArray(payload.inspections) ? payload.inspections : []);
    } catch (error: any) {
      setList([]);
      toast.error(error?.message || 'Unable to load inspections.');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => { void load(); }, [load]);

  const start = async () => {
    if (!authHeaders) { toast.error('Sign in first.'); return; }
    const property = properties.find(p => p.id === propertyId) || properties[0];
    if (!property) { toast.error('Add a property first.'); return; }
    setBusy(true);
    try {
      const res = await fetch(`${SERVER}/landlord/inspections`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: property.id,
          propertyName: property.name,
          propertyAddress: property.address,
          // Started with the building's areas already listed, because a blank
          // page invites somebody to record only what they happened to notice —
          // and the roof is exactly what gets skipped.
          areas: blankAreas(PROPERTY_AREAS),
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Unable to start the inspection.');
      setList(prev => [payload.inspection, ...prev]);
      setOpen(payload.inspection);
      setAreas(payload.inspection.areas || []);
      setSummary('');
    } catch (error: any) {
      toast.error(error?.message || 'Unable to start the inspection.');
    } finally {
      setBusy(false);
    }
  };

  /** Save progress, or finish for good. */
  const save = async (complete = false) => {
    if (!open || !authHeaders) return;
    setBusy(true);
    try {
      const res = await fetch(`${SERVER}/landlord/inspections/${open.id}`, {
        method: 'PUT',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ areas, summary, status: complete ? 'complete' : undefined }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Unable to save.');
      setList(prev => prev.map(i => i.id === open.id ? payload.inspection : i));
      if (complete) {
        toast.success(payload.note || 'Inspection recorded.');
        setOpen(null);
      } else {
        setOpen(payload.inspection);
        toast.success('Saved.');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Unable to save.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (i: Inspection) => {
    if (!authHeaders) return;
    if (!window.confirm('Delete this draft inspection?')) return;
    try {
      const res = await fetch(`${SERVER}/landlord/inspections/${i.id}`, {
        method: 'DELETE', headers: authHeaders,
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Unable to delete.');
      setList(prev => prev.filter(x => x.id !== i.id));
      toast.success('Draft deleted.');
    } catch (error: any) {
      toast.error(error?.message || 'Unable to delete.');
    }
  };

  const photographed = areas.filter(a => a.media.length > 0).length;
  const flagged = areas.filter(a => ['Poor', 'Damaged'].includes(a.condition));

  /* ── walking one ──────────────────────────────────────────────────────── */
  if (open) {
    const readOnly = open.status === 'complete';
    return (
      <div className="space-y-4 rounded-xl border border-teal-500/25 bg-[#151515] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <button
              onClick={() => setOpen(null)}
              className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-white"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> All inspections
            </button>
            <p className="text-sm font-bold text-teal-300">
              {open.propertyName || open.propertyAddress || 'Property'} — {readOnly ? 'recorded' : 'in progress'}
            </p>
            <p className="text-[11px] text-gray-500">
              Started {day(open.startedAt)}{open.completedAt ? ` · completed ${day(open.completedAt)}` : ''}
            </p>
          </div>
          {!readOnly && (
            <div className="flex gap-2">
              <button
                onClick={() => save(false)}
                disabled={busy}
                className="rounded-lg border border-[#3a3a3a] px-3 py-2 text-sm font-semibold text-gray-300 transition hover:text-white disabled:opacity-60"
              >
                {busy ? 'Saving…' : 'Save progress'}
              </button>
              <button
                onClick={() => {
                  // Asked once, because a completed inspection is a dated
                  // statement about a building and is not edited afterwards.
                  if (window.confirm(
                    photographed === 0
                      ? 'Finish with no photographs attached? The record will be notes only.'
                      : 'Finish this inspection? It cannot be edited afterwards.',
                  )) void save(true);
                }}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-teal-500 disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" /> Finish
              </button>
            </div>
          )}
        </div>

        {/* What the walk has actually produced so far. An inspection with no
            photographs looks identical to one nobody has started. */}
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="rounded border border-[#2A2A2A] bg-[#0F0F0F] px-2 py-1 text-gray-400">
            {photographed} of {areas.length} areas photographed
          </span>
          {flagged.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 font-bold text-amber-400">
              <AlertTriangle className="h-3 w-3" /> {flagged.length} poor or damaged
            </span>
          )}
        </div>

        <ConditionAreas
          areas={areas}
          setAreas={setAreas}
          authHeaders={authHeaders}
          context={`Inspection — ${open.propertyName || open.propertyAddress || 'property'}`}
          disabled={readOnly}
        />

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-400">Overall notes</label>
          <textarea
            value={summary}
            disabled={readOnly}
            onChange={e => setSummary(e.target.value)}
            placeholder="Anything that does not belong to one area — access, weather, who was present."
            className="min-h-[80px] w-full rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500 disabled:opacity-60"
          />
        </div>
      </div>
    );
  }

  /* ── the list ─────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-3 rounded-xl border border-[#2A2A2A] bg-[#151515] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-white">
            <ClipboardCheck className="h-4 w-4 text-teal-400" /> Property inspections
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            A dated walkthrough with photos and video, area by area.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {properties.length > 1 && (
            <select
              value={propertyId}
              onChange={e => setPropertyId(e.target.value)}
              className="rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-teal-500"
            >
              <option value="">{properties[0]?.name || properties[0]?.address || 'First property'}</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name || p.address || p.id}</option>
              ))}
            </select>
          )}
          <button
            onClick={start}
            disabled={busy || properties.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-teal-500 disabled:opacity-60"
          >
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Start inspection
          </button>
        </div>
      </div>

      {properties.length === 0 ? (
        <p className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-4 text-sm text-gray-400">
          Add a property first — an inspection is a record about a building.
        </p>
      ) : loading ? (
        <p className="flex items-center gap-2 text-sm text-gray-400">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Loading…
        </p>
      ) : list.length === 0 ? (
        <p className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-4 text-sm text-gray-400">
          No inspections yet. A walkthrough now is the record you will want when something fails.
        </p>
      ) : (
        <div className="space-y-2">
          {list.map(i => {
            const shot = (i.areas || []).filter(a => (a.media || []).length > 0).length;
            const bad = (i.areas || []).filter(a => ['Poor', 'Damaged'].includes(a.condition)).length;
            return (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                    {i.propertyName || i.propertyAddress || 'Property'}
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                      i.status === 'complete'
                        ? 'border-green-500/20 bg-green-500/10 text-green-400'
                        : 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                    }`}>
                      {i.status === 'complete' ? 'recorded' : 'draft'}
                    </span>
                    {bad > 0 && (
                      <span className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                        {bad} poor or damaged
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    {i.status === 'complete' ? `Completed ${day(i.completedAt)}` : `Started ${day(i.startedAt)}`}
                    {' · '}<Camera className="inline h-3 w-3" /> {shot} of {(i.areas || []).length} areas photographed
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => { setOpen(i); setAreas(i.areas || []); setSummary(i.summary || ''); }}
                    className="rounded-lg border border-[#3a3a3a] px-3 py-1.5 text-xs font-semibold text-gray-300 transition hover:text-white"
                  >
                    {i.status === 'complete' ? 'View' : 'Continue'}
                  </button>
                  {i.status !== 'complete' && (
                    <button
                      onClick={() => remove(i)}
                      className="rounded-lg border border-[#3a3a3a] px-2 py-1.5 text-gray-500 transition hover:border-red-500/40 hover:text-red-400"
                      title="Delete this draft"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
