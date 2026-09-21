import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  ClipboardList, PawPrint, Plus, X, Send, LoaderCircle, Trash2,
  CheckCircle2, FileText, Camera, Video, Image as ImageIcon,
} from 'lucide-react';
import { projectId } from '../../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface Tenant { id: string; name: string; email?: string; unit?: string; rent?: number; }

type FormType = 'move-in' | 'move-out' | 'pet-deposit';
type Mode = 'list' | FormType;

const DEFAULT_AREAS = [
  'Living Room', 'Kitchen', 'Dining Room', 'Bathroom(s)', 'Bedroom(s)',
  'Hallways & Stairs', 'Windows & Doors', 'Walls & Ceilings', 'Flooring',
  'Appliances', 'HVAC / Heating', 'Smoke & CO Detectors', 'Exterior / Yard',
];
const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'];

/**
 * A photo or video attached to ONE area of the property.
 *
 * Per area, not per form, and that is the whole point. In a deposit dispute
 * the question is never "are there photos of this flat" — it is what the
 * carpet in bedroom 2 looked like the day they moved in. Twenty photos in a
 * pile cannot answer that; twenty photos against named areas can.
 *
 * Only the id is kept. The upload hands back a signed URL that expires in
 * twenty-four hours, and a move-in record is read when the tenant LEAVES —
 * possibly years later — so storing that URL would leave a form full of dead
 * links by tomorrow. `GET /media/:id` re-signs on read, so the id is the
 * durable thing.
 */
interface AreaMedia {
  id: string;
  name: string;
  type: 'image' | 'video' | string;
}

interface AreaRow {
  name: string;
  condition: string;
  notes: string;
  media: AreaMedia[];
}

const blankAreas = (): AreaRow[] =>
  DEFAULT_AREAS.map(name => ({ name, condition: 'Good', notes: '', media: [] }));

/** What the media library accepts — refused here so nobody waits for a 400. */
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const emptyTenant = { tenantId: '', tenantName: '', tenantEmail: '', propertyAddress: '', unit: '' };

function typeLabel(t: string) {
  return t === 'pet-deposit' ? 'Pet Deposit' : t === 'move-out' ? 'Move-Out Checklist' : 'Move-In Checklist';
}
function typeIcon(t: string) {
  return t === 'pet-deposit' ? PawPrint : ClipboardList;
}
function statusBadge(s: string) {
  return s === 'completed'
    ? 'bg-green-500/10 text-green-400 border-green-500/20'
    : 'bg-amber-500/10 text-amber-400 border-amber-500/20';
}

export default function LandlordFormsManager({ session, tenants }: { session: any; tenants: Tenant[] }) {
  const [mode, setMode] = useState<Mode>('list');
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [who, setWho] = useState({ ...emptyTenant });
  const [areas, setAreas] = useState<AreaRow[]>(blankAreas());
  // Which area is mid-upload, so its row can say so rather than the whole form.
  const [uploadingArea, setUploadingArea] = useState<number | null>(null);
  const [pet, setPet] = useState({ petType: '', breed: '', petName: '', weight: '', age: '', depositAmount: '', monthlyPetRent: '', terms: 'Tenant agrees to keep the above pet(s) in accordance with the lease. Tenant is responsible for any damage caused by the pet(s) beyond the pet deposit. Pet(s) must be licensed and vaccinated as required by law.' });

  const authHeaders = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined;
  const inputClass = 'w-full rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500';
  const labelClass = 'block text-xs font-semibold text-gray-400 mb-1.5';

  const loadForms = async () => {
    if (!authHeaders) { setForms([]); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/landlord/forms`, { headers: authHeaders });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Unable to load forms.');
      setForms(Array.isArray(payload.forms) ? payload.forms : []);
    } catch (error: any) { setForms([]); toast.error(error?.message || 'Unable to load forms.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void loadForms(); }, [session?.access_token]);

  const resetForm = () => {
    setWho({ ...emptyTenant });
    setAreas(blankAreas());
    setPet({ petType: '', breed: '', petName: '', weight: '', age: '', depositAmount: '', monthlyPetRent: '', terms: pet.terms });
    setMode('list');
  };

  const pickTenant = (id: string) => {
    const t = tenants.find(x => x.id === id);
    setWho(w => t ? { ...w, tenantId: t.id, tenantName: t.name, tenantEmail: t.email || w.tenantEmail, unit: t.unit || w.unit } : { ...w, tenantId: id });
  };

  /**
   * Put an area's photos and video into the media library, keep the ids.
   *
   * Uploaded as they are picked rather than held until the form is sent,
   * because a walkthrough is done on a phone in an empty flat and losing
   * twenty photos to a tab closing at the end would be the whole job again.
   *
   * Files are sent one at a time. A single request carrying a dozen videos
   * is one thing to fail; this way a bad file costs that file.
   */
  const attachToArea = async (index: number, files: File[]) => {
    if (!authHeaders || files.length === 0) return;

    const tooBig = files.filter(f => f.size > MAX_UPLOAD_BYTES);
    if (tooBig.length) {
      toast.error(
        `${tooBig.length === 1 ? tooBig[0].name : `${tooBig.length} files`} exceeded 50MB and `
        + 'was not attached. A shorter video usually does the job.',
      );
    }
    const usable = files.filter(f => f.size <= MAX_UPLOAD_BYTES);
    if (!usable.length) return;

    setUploadingArea(index);
    const attached: AreaMedia[] = [];
    const failed: string[] = [];

    for (const file of usable) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', 'condition-forms');
        // Findable later by what it is rather than by remembering an id.
        fd.append('tags', [mode, who.unit || '', who.propertyAddress || ''].filter(Boolean).join(','));
        fd.append('description', `${typeLabel(mode)} — ${areas[index]?.name || 'area'}`);

        const res = await fetch(`${SERVER}/media/upload`, {
          method: 'POST',
          headers: authHeaders,
          body: fd,
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload?.media?.id) throw new Error(payload?.error || `Upload failed (${res.status})`);
        attached.push({ id: payload.media.id, name: payload.media.name || file.name, type: payload.media.type });
      } catch {
        failed.push(file.name);
      }
    }

    if (attached.length) {
      setAreas(a => a.map((x, j) => j === index ? { ...x, media: [...x.media, ...attached] } : x));
    }
    // Said per file rather than as one "some failed", so it is clear which
    // photo has to be taken again.
    if (failed.length) toast.error(`Could not attach: ${failed.join(", ")}`);
    else if (attached.length) toast.success(`${attached.length} attached to ${areas[index]?.name || "this area"}.`);
    setUploadingArea(null);
  };

  const submit = async () => {
    if (mode === 'list') return;
    if (!who.tenantEmail.trim()) { toast.error("Enter the tenant's email to send the form."); return; }
    if (!authHeaders) { toast.error('Sign in first.'); return; }
    const data = mode === 'pet-deposit'
      ? { ...pet }
      : { areas };
    setSaving(true);
    try {
      const res = await fetch(`${SERVER}/landlord/forms`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: mode, tenantName: who.tenantName, tenantEmail: who.tenantEmail, propertyAddress: who.propertyAddress, unit: who.unit, data }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Unable to send the form.');
      setForms(prev => [payload.form, ...prev]);
      toast.success(`${typeLabel(mode)} sent to ${who.tenantEmail}'s portal.`);
      resetForm();
    } catch (error: any) { toast.error(error?.message || 'Unable to send the form.'); }
    finally { setSaving(false); }
  };

  const deleteForm = async (id: string) => {
    if (!authHeaders || deletingId) return;
    if (!window.confirm('Delete this form? The tenant will no longer see it.')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${SERVER}/landlord/forms/${id}`, { method: 'DELETE', headers: authHeaders });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.success) throw new Error(payload?.error || 'Unable to delete the form.');
      setForms(prev => prev.filter(f => f.id !== id));
      toast.success('Form deleted.');
    } catch (error: any) { toast.error(error?.message || 'Unable to delete the form.'); }
    finally { setDeletingId(null); }
  };

  const tenantFields = (
    <>
      {tenants.length > 0 && (
        <div>
          <label className={labelClass}>Choose from your roster (optional)</label>
          <select value={who.tenantId} onChange={e => pickTenant(e.target.value)} className={inputClass}>
            <option value="">— Select a saved tenant —</option>
            {tenants.map(t => <option key={t.id} value={t.id}>{t.name}{t.unit ? ` · ${t.unit}` : ''}{t.email ? ` · ${t.email}` : ''}</option>)}
          </select>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div><label className={labelClass}>Tenant name</label><input value={who.tenantName} onChange={e => setWho(w => ({ ...w, tenantName: e.target.value }))} className={inputClass} placeholder="Jane Tenant" /></div>
        <div><label className={labelClass}>Tenant email *</label><input value={who.tenantEmail} onChange={e => setWho(w => ({ ...w, tenantEmail: e.target.value }))} className={inputClass} placeholder="jane@email.com" /></div>
        <div><label className={labelClass}>Property address</label><input value={who.propertyAddress} onChange={e => setWho(w => ({ ...w, propertyAddress: e.target.value }))} className={inputClass} placeholder="14 Oak St" /></div>
        <div><label className={labelClass}>Unit</label><input value={who.unit} onChange={e => setWho(w => ({ ...w, unit: e.target.value }))} className={inputClass} placeholder="12A" /></div>
      </div>
    </>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Move-In / Out & Pet Forms</h3>
          <p className="mt-1 text-sm text-gray-400">Send condition checklists and pet deposit agreements to your tenant's portal for review and signature.</p>
        </div>
        {mode === 'list' ? (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => { resetForm(); setMode('move-in'); }} className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-teal-500"><ClipboardList className="h-4 w-4" /> Move-in</button>
            <button onClick={() => { resetForm(); setMode('move-out'); }} className="inline-flex items-center gap-2 rounded-lg border border-teal-500/40 px-3.5 py-2 text-sm font-bold text-teal-300 transition hover:bg-teal-500/10"><ClipboardList className="h-4 w-4" /> Move-out</button>
            <button onClick={() => { resetForm(); setMode('pet-deposit'); }} className="inline-flex items-center gap-2 rounded-lg border border-teal-500/40 px-3.5 py-2 text-sm font-bold text-teal-300 transition hover:bg-teal-500/10"><PawPrint className="h-4 w-4" /> Pet deposit</button>
          </div>
        ) : (
          <button onClick={resetForm} className="inline-flex items-center gap-2 rounded-lg border border-[#3a3a3a] px-4 py-2 text-sm font-semibold text-gray-300 hover:text-white"><X className="h-4 w-4" /> Cancel</button>
        )}
      </div>

      {/* CHECKLIST BUILDER */}
      {(mode === 'move-in' || mode === 'move-out') && (
        <div className="space-y-4 rounded-xl border border-teal-500/25 bg-[#151515] p-5">
          <div className="flex items-center gap-2 text-teal-300"><ClipboardList className="h-4 w-4" /><span className="text-sm font-bold">{mode === 'move-in' ? 'Move-In' : 'Move-Out'} Inspection Checklist</span></div>
          {tenantFields}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={labelClass}>Areas & condition</label>
              <button type="button" onClick={() => setAreas(a => [...a, { name: '', condition: 'Good', notes: '', media: [] }])} className="inline-flex items-center gap-1 text-xs font-bold text-teal-300 hover:text-teal-200"><Plus className="h-3.5 w-3.5" /> Add area</button>
            </div>
            <div className="space-y-2">
              {areas.map((area, i) => (
                <div key={i} className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-2">
                  <div className="grid grid-cols-12 gap-2">
                    <input value={area.name} onChange={e => setAreas(a => a.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Area" className={`${inputClass} col-span-4`} />
                    <select value={area.condition} onChange={e => setAreas(a => a.map((x, j) => j === i ? { ...x, condition: e.target.value } : x))} className={`${inputClass} col-span-3`}>{CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}</select>
                    <input value={area.notes} onChange={e => setAreas(a => a.map((x, j) => j === i ? { ...x, notes: e.target.value } : x))} placeholder="Notes (scratches, stains, etc.)" className={`${inputClass} col-span-4`} />
                    <button type="button" onClick={() => setAreas(a => a.filter((_, j) => j !== i))} className="col-span-1 flex items-center justify-center rounded-lg border border-[#363636] text-gray-500 transition hover:border-red-500/40 hover:text-red-400"><X className="h-4 w-4" /></button>
                  </div>

                  {/* ── Evidence for THIS area ───────────────────────────
                      A label rather than a bare input, so it can be tapped
                      one-handed on a phone in an empty flat, which is where
                      this is actually filled in. `capture` is not set: the
                      camera and the gallery are both legitimate, and forcing
                      the camera would stop somebody attaching a photo they
                      took ten minutes ago. */}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#363636] px-2.5 py-1.5 text-xs font-semibold transition ${
                      uploadingArea === i ? 'text-gray-500' : 'text-gray-300 hover:border-teal-500/50 hover:text-teal-300'
                    }`}>
                      {uploadingArea === i
                        ? <><LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Attaching…</>
                        : <><Camera className="h-3.5 w-3.5" /> Add photos or video</>}
                      <input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        disabled={uploadingArea !== null}
                        className="hidden"
                        onChange={e => {
                          const files = Array.from(e.target.files || []);
                          // Cleared so the same file can be picked again after
                          // a failure; otherwise onChange never fires twice.
                          e.target.value = '';
                          void attachToArea(i, files);
                        }}
                      />
                    </label>

                    {area.media.map((m, k) => (
                      <span key={m.id} className="inline-flex max-w-[14rem] items-center gap-1.5 rounded-lg border border-teal-500/25 bg-teal-500/5 px-2 py-1 text-[11px] text-teal-200">
                        {String(m.type).startsWith('video')
                          ? <Video className="h-3 w-3 shrink-0" />
                          : <ImageIcon className="h-3 w-3 shrink-0" />}
                        <span className="truncate">{m.name}</span>
                        <button
                          type="button"
                          title="Remove from this area"
                          onClick={() => setAreas(a => a.map((x, j) => j === i
                            ? { ...x, media: x.media.filter((_, n) => n !== k) }
                            : x))}
                          className="shrink-0 text-teal-400/60 transition hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button onClick={submit} disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green-500 disabled:opacity-60">
            {saving ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Sending…</> : <><Send className="h-4 w-4" /> Send to tenant portal</>}
          </button>
        </div>
      )}

      {/* PET DEPOSIT BUILDER */}
      {mode === 'pet-deposit' && (
        <div className="space-y-4 rounded-xl border border-teal-500/25 bg-[#151515] p-5">
          <div className="flex items-center gap-2 text-teal-300"><PawPrint className="h-4 w-4" /><span className="text-sm font-bold">Pet Deposit Agreement</span></div>
          {tenantFields}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div><label className={labelClass}>Pet type</label><input value={pet.petType} onChange={e => setPet(p => ({ ...p, petType: e.target.value }))} className={inputClass} placeholder="Dog, cat, etc." /></div>
            <div><label className={labelClass}>Breed</label><input value={pet.breed} onChange={e => setPet(p => ({ ...p, breed: e.target.value }))} className={inputClass} placeholder="Labrador" /></div>
            <div><label className={labelClass}>Pet name</label><input value={pet.petName} onChange={e => setPet(p => ({ ...p, petName: e.target.value }))} className={inputClass} placeholder="Rex" /></div>
            <div><label className={labelClass}>Weight</label><input value={pet.weight} onChange={e => setPet(p => ({ ...p, weight: e.target.value }))} className={inputClass} placeholder="45 lbs" /></div>
            <div><label className={labelClass}>Age</label><input value={pet.age} onChange={e => setPet(p => ({ ...p, age: e.target.value }))} className={inputClass} placeholder="3 years" /></div>
            <div><label className={labelClass}>Pet deposit amount</label><input value={pet.depositAmount} onChange={e => setPet(p => ({ ...p, depositAmount: e.target.value }))} className={inputClass} placeholder="$300" /></div>
            <div><label className={labelClass}>Monthly pet rent</label><input value={pet.monthlyPetRent} onChange={e => setPet(p => ({ ...p, monthlyPetRent: e.target.value }))} className={inputClass} placeholder="$25" /></div>
          </div>
          <div><label className={labelClass}>Agreement terms</label><textarea rows={4} value={pet.terms} onChange={e => setPet(p => ({ ...p, terms: e.target.value }))} className={`${inputClass} resize-none`} /></div>
          <button onClick={submit} disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green-500 disabled:opacity-60">
            {saving ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Sending…</> : <><Send className="h-4 w-4" /> Send to tenant portal</>}
          </button>
        </div>
      )}

      {/* LIST */}
      {mode === 'list' && (
        <div className="rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] divide-y divide-[#2A2A2A]">
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-gray-400"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading forms…</div>
          ) : forms.length === 0 ? (
            <div className="p-10 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-gray-600" />
              <p className="text-sm text-gray-400">No forms yet. Send a move-in/out checklist or pet deposit agreement to a tenant.</p>
            </div>
          ) : forms.map(form => {
            const Icon = typeIcon(form.type);
            return (
              <div key={form.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold">{form.title}</p>
                      <span className="inline-flex items-center gap-1 rounded border border-teal-500/20 bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-teal-300"><Icon className="h-3 w-3" /> {typeLabel(form.type)}</span>
                    </div>
                    <p className="text-sm text-gray-500">{form.tenantName || form.tenantEmail}{form.unit ? ` · ${form.unit}` : ''}{form.propertyAddress ? ` · ${form.propertyAddress}` : ''}</p>
                    <p className="mt-0.5 text-xs text-gray-600">Sent {new Date(form.createdAt).toLocaleDateString()}{form.completedAt ? ` · Completed ${new Date(form.completedAt).toLocaleDateString()} by ${form.signature}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-bold ${statusBadge(form.status)}`}>{form.status === 'completed' ? <><CheckCircle2 className="h-3 w-3" /> Completed</> : 'Awaiting tenant'}</span>
                    <button onClick={() => deleteForm(form.id)} disabled={deletingId === form.id} title="Delete form" className="rounded-lg border border-[#363636] p-1.5 text-gray-400 transition hover:border-red-500/40 hover:text-red-400 disabled:opacity-40">{deletingId === form.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button>
                  </div>
                </div>
                {form.status === 'completed' && (form.type === 'move-in' || form.type === 'move-out') && Array.isArray(form.tenantResponses?.areas) && (
                  <div className="mt-3 overflow-x-auto rounded-lg border border-[#2A2A2A]">
                    <table className="w-full text-xs">
                      <thead><tr className="text-left text-gray-500"><th className="px-3 py-2">Area</th><th className="px-3 py-2">Tenant condition</th><th className="px-3 py-2">Tenant notes</th></tr></thead>
                      <tbody>{form.tenantResponses.areas.map((a: any, i: number) => <tr key={i} className="border-t border-[#2A2A2A] text-gray-300"><td className="px-3 py-2">{a.name}</td><td className="px-3 py-2">{a.condition}</td><td className="px-3 py-2">{a.notes || '—'}</td></tr>)}</tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
