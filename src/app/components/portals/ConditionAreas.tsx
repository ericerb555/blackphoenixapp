/**
 * ConditionAreas — condition and evidence, area by area.
 *
 * Shared by the move-in and move-out forms in the leases tab and by a whole
 * property inspection under properties, because they are the same act: walk
 * round, say what state each area is in, and photograph it.
 *
 * It lives in one file so the two cannot drift. Two copies of evidence capture
 * would eventually disagree about what an area is, and the move-out form that
 * disagrees with the move-in form is worth nothing at exactly the moment
 * somebody needs it.
 *
 * WHY MEDIA HANGS OFF AN AREA
 *
 * In a deposit dispute the question is never "are there photos of this flat" —
 * it is what the carpet in bedroom 2 looked like the day they moved in. Twenty
 * photos in a pile cannot answer that. Twenty photos against named areas can.
 *
 * WHY ONLY AN ID IS KEPT
 *
 * The upload returns a signed URL that expires in twenty-four hours. These
 * records are read when a tenant leaves or a roof fails — months or years
 * later — so storing that URL would leave every record full of dead links by
 * tomorrow. `GET /media/:id` re-signs on read, so the id is the durable part.
 */
import { LoaderCircle, X, Camera, Video, Image as ImageIcon, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { projectId } from '../../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

/** What the media library accepts — refused here so nobody waits for a 400. */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export interface AreaMedia {
  id: string;
  name: string;
  type: 'image' | 'video' | string;
}

export interface AreaRow {
  name: string;
  condition: string;
  notes: string;
  media: AreaMedia[];
}

export const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'];

/** The areas of a dwelling, in the order somebody actually walks them. */
export const DEFAULT_AREAS = [
  'Living Room', 'Kitchen', 'Dining Room', 'Bathroom(s)', 'Bedroom(s)',
  'Hallways & Stairs', 'Windows & Doors', 'Walls & Ceilings', 'Flooring',
  'Appliances', 'HVAC / Heating', 'Smoke & CO Detectors', 'Exterior / Yard',
];

/**
 * A whole building has more to look at than a single unit.
 *
 * Roof, foundation and the common parts are where the expensive surprises
 * live, and they are exactly what nobody photographs unless a list asks them
 * to.
 */
export const PROPERTY_AREAS = [
  'Roof & Gutters', 'Foundation & Basement', 'Siding & Exterior Walls',
  'Windows & Doors', 'Driveway & Walkways', 'Landscaping & Drainage',
  'Common Areas & Entry', 'Stairs & Railings', 'HVAC / Heating',
  'Plumbing & Water Heater', 'Electrical Panel & Wiring',
  'Smoke & CO Detectors', 'Fire Egress & Extinguishers',
  'Laundry & Utility', 'Garage & Outbuildings', 'Parking & Lighting',
];

export const blankAreas = (names: string[] = DEFAULT_AREAS): AreaRow[] =>
  names.map(name => ({ name, condition: 'Good', notes: '', media: [] }));

const inputClass =
  'w-full rounded-lg border border-[#363636] bg-[#0A0A0A] px-3 py-2.5 text-sm text-white outline-none focus:border-teal-500';

export default function ConditionAreas({
  areas,
  setAreas,
  authHeaders,
  context = '',
  disabled = false,
}: {
  areas: AreaRow[];
  setAreas: (fn: (a: AreaRow[]) => AreaRow[]) => void;
  authHeaders?: Record<string, string>;
  /** Tagged onto each upload so it can be found later by what it was for. */
  context?: string;
  disabled?: boolean;
}) {
  // Which area is mid-upload, so its own row says so rather than the whole form.
  const [uploading, setUploading] = useState<number | null>(null);

  /**
   * Upload an area's files as they are picked, and keep the ids.
   *
   * As they are picked rather than held until the end, because a walkthrough
   * happens on a phone in an empty building and losing an hour of photos to a
   * closed tab means doing the whole job again.
   *
   * One request per file. A single request carrying a dozen videos is one thing
   * to fail; this way a bad file costs that file, and the message can name it.
   */
  const attach = async (index: number, files: File[]) => {
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

    setUploading(index);
    const attached: AreaMedia[] = [];
    const failed: string[] = [];

    for (const file of usable) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', 'condition-evidence');
        fd.append('tags', [context, areas[index]?.name].filter(Boolean).join(','));
        fd.append('description', `${context || 'Condition'} — ${areas[index]?.name || 'area'}`);

        const res = await fetch(`${SERVER}/media/upload`, {
          method: 'POST',
          headers: authHeaders,
          body: fd,
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload?.media?.id) {
          throw new Error(payload?.error || `Upload failed (${res.status})`);
        }
        attached.push({
          id: payload.media.id,
          name: payload.media.name || file.name,
          type: payload.media.type,
        });
      } catch {
        failed.push(file.name);
      }
    }

    if (attached.length) {
      setAreas(a => a.map((x, j) => j === index ? { ...x, media: [...x.media, ...attached] } : x));
    }
    // Named per file, so it is clear which photo has to be taken again.
    if (failed.length) toast.error(`Could not attach: ${failed.join(', ')}`);
    else if (attached.length) {
      toast.success(`${attached.length} attached to ${areas[index]?.name || 'this area'}.`);
    }
    setUploading(null);
  };

  const withEvidence = areas.filter(a => a.media.length > 0).length;

  return (
    <div className="space-y-2">
      {areas.map((area, i) => (
        <div key={i} className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-2">
          <div className="grid grid-cols-12 gap-2">
            <input
              value={area.name}
              disabled={disabled}
              onChange={e => setAreas(a => a.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
              placeholder="Area"
              className={`${inputClass} col-span-4`}
            />
            <select
              value={area.condition}
              disabled={disabled}
              onChange={e => setAreas(a => a.map((x, j) => j === i ? { ...x, condition: e.target.value } : x))}
              className={`${inputClass} col-span-3`}
            >
              {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              value={area.notes}
              disabled={disabled}
              onChange={e => setAreas(a => a.map((x, j) => j === i ? { ...x, notes: e.target.value } : x))}
              placeholder="Notes (scratches, stains, etc.)"
              className={`${inputClass} col-span-4`}
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => setAreas(a => a.filter((_, j) => j !== i))}
              className="col-span-1 flex items-center justify-center rounded-lg border border-[#363636] text-gray-500 transition hover:border-red-500/40 hover:text-red-400 disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* A label rather than a bare input, so it can be tapped one-handed —
              which is how this is actually used. `capture` is deliberately not
              set: the camera and the gallery are both legitimate, and forcing
              the camera would stop somebody attaching a photo taken earlier. */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className={`inline-flex items-center gap-1.5 rounded-lg border border-[#363636] px-2.5 py-1.5 text-xs font-semibold transition ${
              disabled || uploading !== null
                ? 'text-gray-600'
                : 'cursor-pointer text-gray-300 hover:border-teal-500/50 hover:text-teal-300'
            }`}>
              {uploading === i
                ? <><LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Attaching…</>
                : <><Camera className="h-3.5 w-3.5" /> Add photos or video</>}
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                disabled={disabled || uploading !== null}
                className="hidden"
                onChange={e => {
                  const files = Array.from(e.target.files || []);
                  // Cleared so the same file can be chosen again after a
                  // failure; otherwise onChange never fires twice for it.
                  e.target.value = '';
                  void attach(i, files);
                }}
              />
            </label>

            {area.media.map((m, k) => (
              <span
                key={m.id}
                className="inline-flex max-w-[14rem] items-center gap-1.5 rounded-lg border border-teal-500/25 bg-teal-500/5 px-2 py-1 text-[11px] text-teal-200"
              >
                {String(m.type).startsWith('video')
                  ? <Video className="h-3 w-3 shrink-0" />
                  : <ImageIcon className="h-3 w-3 shrink-0" />}
                <span className="truncate">{m.name}</span>
                {!disabled && (
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
                )}
              </span>
            ))}
          </div>
        </div>
      ))}

      {!disabled && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => setAreas(a => [...a, { name: '', condition: 'Good', notes: '', media: [] }])}
            className="inline-flex items-center gap-1 text-xs font-bold text-teal-300 hover:text-teal-200"
          >
            <Plus className="h-3.5 w-3.5" /> Add area
          </button>
          {/* Said plainly, because an inspection with no photographs looks
              identical to one nobody has started. */}
          <p className="text-[11px] text-gray-500">
            {withEvidence} of {areas.length} area{areas.length === 1 ? '' : 's'} photographed
          </p>
        </div>
      )}
    </div>
  );
}
