/**
 * A blueprint becomes the building record.
 *
 * Eric's decision, and it changes what this screen is. A takeoff tool would
 * read a drawing, hand back square footages and be done with it — while every
 * other trade carried on working from a house estimated off photographs. This
 * folds the drawing into the plan itself, because a drawing carries a scale and
 * a photograph carries a guess.
 *
 * WHAT IT WILL NOT DO
 *
 * Quietly undo the walkthrough. A room measured on site keeps its measurement;
 * the drawing is shown disagreeing with it and the person who stood in the
 * building decides. A drawing describes the building somebody intended, which
 * is not always the one that got built and very often not the one still
 * standing after forty years of alterations.
 *
 * Every change it makes is listed before it makes it.
 */
import { useCallback, useMemo, useState } from 'react';
import {
  FileInput, Loader2, Check, AlertTriangle, ShieldCheck, Info, Ruler,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { projectId as supabaseProjectId } from '../utils/supabase/info';
import { fileToDataUrl } from '../lib/imageCapture';
import {
  type BlueprintRead, type MergeResult,
  readBlueprint, mergeIntoPlan, mergeNote, readWarnings,
} from '../lib/blueprintRecord';
import type { FloorPlan } from '../lib/floorPlanModel';

const SERVER = `https://${supabaseProjectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';

export default function BlueprintImport({ plan, onChange }: {
  plan: FloorPlan;
  onChange: (p: FloorPlan) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [read, setRead] = useState<BlueprintRead | null>(null);

  /** Computed, never applied, until somebody presses the button. */
  const preview: MergeResult | null = useMemo(
    () => (read ? mergeIntoPlan(plan, read) : null),
    [plan, read],
  );
  const warnings = useMemo(() => (read ? readWarnings(read) : []), [read]);

  const pick = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const images: string[] = [];
      for (const f of Array.from(files).slice(0, 6)) images.push(await fileToDataUrl(f));

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SERVER}/ai/analyze-blueprints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ images, blueprints: images }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { toast.error(data?.error || 'That drawing could not be read.'); return; }

      const parsed = readBlueprint(data?.analysis || data);
      if (!parsed.rooms.length) {
        toast.error('No rooms with usable dimensions came back. A room with no size cannot become geometry.');
      }
      setRead(parsed);
    } catch (err: any) {
      toast.error(err?.message || 'That drawing could not be read.');
    } finally {
      setBusy(false);
    }
  }, []);

  const apply = () => {
    if (!preview) return;
    onChange(preview.plan);
    const kept = preview.conflicts.filter(c => c.keptExisting).length;
    toast.success(
      `${preview.added} added, ${preview.updated} updated`
      + (kept ? `, ${kept} left as measured.` : '.'),
    );
    setRead(null);
  };

  return (
    <div className={card}>
      <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
        <FileInput className="w-4 h-4 text-[#ea580c]" /> Read an existing drawing
      </h3>
      <p className="text-xs text-gray-500 mb-3">
        The drawing becomes the building record — rooms, sizes and where they sit — not just a
        list of quantities. A scaled drawing beats a dimension guessed off a photograph, so it
        wins over those. It does not win over anything measured on site.
      </p>

      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer"
        style={{ background: '#ea580c' }}>
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileInput className="w-3.5 h-3.5" />}
        {busy ? 'Reading…' : 'Pick the drawing'}
        <input type="file" accept="image/*,application/pdf" multiple className="hidden"
          onChange={e => pick(e.target.files)} disabled={busy} />
      </label>

      {read && preview && (
        <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <span className="text-sm font-bold text-white truncate">
              {read.sheetTitle || 'The drawing'}
            </span>
            {read.scaleNote && (
              <span className="text-[10px] text-gray-500 shrink-0 flex items-center gap-1">
                <Ruler className="w-3 h-3" />{read.scaleNote}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-3">{mergeNote(preview)}</p>

          {warnings.map((w, i) => (
            <p key={i} className="text-[11px] text-amber-200/85 flex items-start gap-1.5 mb-1">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />{w}
            </p>
          ))}

          {/* Every disagreement, before anything is written. */}
          {preview.conflicts.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <p className="text-[11px] font-semibold text-gray-400">
                Where the drawing and the plan disagree
              </p>
              {preview.conflicts.map(c => (
                <div key={c.name} className={`rounded-xl border p-2.5 ${
                  c.keptExisting
                    ? 'border-emerald-500/25 bg-emerald-500/[0.04]'
                    : 'border-[#2A2A2A] bg-[#0A0A0A]'}`}>
                  <p className="text-[11px] text-gray-300 flex items-start gap-1.5">
                    {c.keptExisting
                      ? <ShieldCheck className="w-3 h-3 shrink-0 mt-0.5 text-emerald-400" />
                      : <Info className="w-3 h-3 shrink-0 mt-0.5 text-gray-600" />}
                    {c.message}
                  </p>
                </div>
              ))}
            </div>
          )}

          <button onClick={apply}
            disabled={preview.added === 0 && preview.updated === 0}
            className="mt-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: '#ea580c' }}>
            <Check className="w-4 h-4" />
            Make this the building record
          </button>
        </div>
      )}
    </div>
  );
}
