/**
 * SketchImport — photograph a hand-drawn framing plan and turn it into the model.
 *
 * What this can and cannot do, stated plainly because the difference matters:
 *
 * It transcribes. It reads the numbers and notes written on the paper and puts
 * them into the model. What it cannot do is recover a dimension that was never
 * written down, because a hand sketch is not to scale — measuring the drawing
 * would produce a confident number with nothing behind it. So every field comes
 * back marked as written on the drawing, implied by a note, or not given, and
 * the ones that were not given stay empty.
 *
 * Nothing is applied on its own. The reading is shown as a list of proposed
 * changes with what each one was read from, and applying it is a separate
 * action — because the failure mode here is a misread "2x8" quietly replacing a
 * 2x10 in a design that is already correct.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PencilRuler, Camera, Upload, Loader2, X, AlertTriangle, CheckCircle2, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { fileToDataUrl, dataUrlBytes } from '../lib/imageCapture';
import type { DeckModel } from '../lib/deckModel';
import LocalFolderPicker from './LocalFolderPicker';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const MAX_PAYLOAD_BYTES = 4_000_000;

/** Only these come off a sketch; finishes and the like are not drawn on one. */
const FIELDS: { key: keyof DeckModel; label: string; unit?: string }[] = [
  { key: 'widthFt', label: 'Width along house', unit: 'ft' },
  { key: 'depthFt', label: 'Depth out from house', unit: 'ft' },
  { key: 'heightFt', label: 'Height above grade', unit: 'ft' },
  { key: 'joistSize', label: 'Joist size' },
  { key: 'joistSpacing', label: 'Joist spacing', unit: 'in o.c.' },
  { key: 'beamSize', label: 'Beam size' },
  { key: 'beamPlies', label: 'Beam plies' },
  { key: 'postSize', label: 'Post size' },
  { key: 'postSpacingFt', label: 'Post spacing', unit: 'ft' },
  { key: 'cantileverFt', label: 'Cantilever', unit: 'ft' },
  { key: 'ledgerAttached', label: 'Ledger attached' },
  { key: 'deckingDirection', label: 'Decking direction' },
  { key: 'guardrail', label: 'Guardrail' },
  { key: 'stairs', label: 'Stairs' },
  { key: 'stairWidthFt', label: 'Stair width', unit: 'ft' },
];

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || publicAnonKey}`,
    apikey: publicAnonKey,
  };
}

export default function SketchImport({ model, onApply, incoming, onRead }: {
  model: DeckModel;
  onApply: (patch: Partial<DeckModel>) => void;
  /** Drawings pushed in from the job folder; `n` counts deliveries, not files. */
  incoming?: { files: File[]; n: number };
  /** Reports what was read off the drawing, so the assistant can use it. */
  onRead?: (sketch: any) => void;
}) {
  const [shots, setShots] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [read, setRead] = useState<any>(null);
  const [skip, setSkip] = useState<Set<string>>(new Set());

  const camera = useRef<HTMLInputElement>(null);
  const files = useRef<HTMLInputElement>(null);

  const add = useCallback(async (list: FileList | File[] | null) => {
    if (!list?.length) return;
    setBusy(true);
    try {
      const out: string[] = [];
      for (const f of Array.from(list).slice(0, 4)) out.push(await fileToDataUrl(f, 1600));
      setShots(s => [...s, ...out].slice(0, 4));
    } catch (err: any) {
      toast.error(err?.message || 'That image could not be read.');
    } finally {
      setBusy(false);
    }
  }, []);

  const lastDelivery = useRef(0);
  const [autoRead, setAutoRead] = useState(false);
  useEffect(() => {
    if (!incoming || !incoming.files.length || incoming.n === lastDelivery.current) return;
    lastDelivery.current = incoming.n;
    add(incoming.files);
    // Sending a drawing over from the job folder means read it.
    setAutoRead(true);
  }, [incoming, add]);

  const analyse = useCallback(async () => {
    if (!shots.length) return;
    let send = shots;
    while (send.length > 1 && send.reduce((n, s) => n + dataUrlBytes(s), 0) > MAX_PAYLOAD_BYTES) {
      send = send.slice(0, -1);
    }
    setBusy(true);
    setRead(null);
    setSkip(new Set());
    try {
      const res = await fetch(`${SERVER}/house-capture/read-sketch`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ images: send, note }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Reading failed (${res.status}).`);
      setRead(json.sketch);
      onRead?.(json.sketch);
      toast.success('Sketch read — check it before applying.');
    } catch (err: any) {
      toast.error(err?.message || 'Could not read that sketch.');
    } finally {
      setBusy(false);
    }
  }, [shots, note, onRead]);

  /**
   * Read the drawing once the delivered shots are in state. Separate effect for
   * the same two reasons as in HouseCapture: the shots are not readable until
   * the next render, and `analyse` must be declared above a dependency array
   * that names it.
   */
  useEffect(() => {
    if (!autoRead || busy || !shots.length) return;
    setAutoRead(false);
    analyse();
  }, [autoRead, busy, shots, analyse]);

  /** Fields that came back with a usable value and are not being skipped. */
  const proposals = read?.model
    ? FIELDS
      .map(f => ({ ...f, value: read.model[f.key] }))
      .filter(f => f.value !== null && f.value !== undefined && f.value !== '')
    : [];

  const apply = useCallback(() => {
    const patch: any = {};
    for (const p of proposals) {
      if (skip.has(p.key as string)) continue;
      patch[p.key] = p.value;
    }
    if (!Object.keys(patch).length) {
      toast.error('Nothing selected to apply.');
      return;
    }
    onApply(patch);
    toast.success(`Applied ${Object.keys(patch).length} values from the sketch.`);
  }, [proposals, skip, onApply]);

  const btn = 'flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-40';

  return (
    <div className="rounded-2xl border border-[#2A2A2A] bg-[#111] p-4">
      <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
        <PencilRuler className="w-4 h-4 text-[#ea580c]" /> Read a sketch
      </h2>
      <p className="text-xs text-gray-500 mb-3">
        Photograph a hand-drawn framing plan and it fills the designer. It reads what is written on
        the paper — a sketch is not to scale, so anything not dimensioned stays blank rather than
        being measured off the drawing.
      </p>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <button onClick={() => camera.current?.click()} disabled={busy}
          className={btn} style={{ background: '#ea580c', color: '#fff' }}>
          <Camera className="w-4 h-4" /> Photograph it
        </button>
        <button onClick={() => files.current?.click()} disabled={busy}
          className={`${btn} text-white`}
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <Upload className="w-4 h-4" /> Choose file
        </button>
      </div>
      <div className="mb-3">
        <LocalFolderPicker slot="sketches" allowVideo={false} limit={4} onPick={add} />
      </div>

      <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { add(e.target.files); e.currentTarget.value = ''; }} />
      <input ref={files} type="file" accept="image/*" multiple className="hidden"
        onChange={e => { add(e.target.files); e.currentTarget.value = ''; }} />

      {shots.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {shots.map((s, i) => (
              <div key={i} className="relative aspect-[4/3] rounded-lg overflow-hidden border border-[#2A2A2A]">
                <img src={s} alt={`Sketch ${i + 1}`} className="w-full h-full object-cover" />
                <button onClick={() => setShots(p => p.filter((_, k) => k !== i))}
                  className="absolute top-1 right-1 p-1 rounded-md bg-black/70 text-white"
                  aria-label={`Remove sketch ${i + 1}`}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <input value={note} onChange={e => setNote(e.target.value)}
            placeholder="Anything the drawing doesn't say — e.g. stairs go off the left, 2x10s throughout"
            className="w-full px-3 py-2 mb-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#ea580c]" />

          <button onClick={analyse} disabled={busy} className={`${btn} w-full`}
            style={{ background: '#ea580c', color: '#fff' }}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <PencilRuler className="w-4 h-4" />}
            {busy ? 'Reading the drawing' : 'Read the drawing'}
          </button>
        </>
      )}

      {read && (
        <div className="mt-4 pt-4 border-t border-[#2A2A2A] space-y-3">
          {read.summary && <p className="text-sm text-gray-300">{read.summary}</p>}

          {proposals.length > 0 ? (
            <>
              <div className="text-[10px] uppercase tracking-wide text-gray-500">
                What it read — untick anything wrong
              </div>
              <div className="space-y-1">
                {proposals.map(p => {
                  const k = p.key as string;
                  const src = read.sources?.[k];
                  const conf = read.confidence?.[k];
                  const off = skip.has(k);
                  const current = (model as any)[p.key];
                  const changes = String(current) !== String(p.value);
                  return (
                    <label key={k} className="flex items-start gap-2.5 py-1 cursor-pointer">
                      <input type="checkbox" checked={!off} className="mt-1 accent-[#ea580c] w-4 h-4"
                        onChange={e => setSkip(s => {
                          const n = new Set(s);
                          if (e.target.checked) n.delete(k); else n.add(k);
                          return n;
                        })} />
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="text-gray-400">{p.label}</span>
                          <span className="text-right shrink-0">
                            {changes && (
                              <span className="text-gray-600 line-through mr-1.5">{String(current)}</span>
                            )}
                            <span className="text-white font-semibold">
                              {String(p.value)}{p.unit ? ` ${p.unit}` : ''}
                            </span>
                          </span>
                        </span>
                        <span className="block text-[11px] text-gray-600">
                          {src === 'written' ? 'dimensioned on the drawing'
                            : src === 'noted' ? 'from a note on the drawing'
                            : 'source not stated'}
                          {conf ? ` · ${conf} confidence` : ''}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>

              <button onClick={apply} className={`${btn} w-full`}
                style={{ background: '#ea580c', color: '#fff' }}>
                <CheckCircle2 className="w-4 h-4" /> Apply the ticked values
              </button>
            </>
          ) : (
            <p className="flex items-start gap-2 text-sm text-yellow-400">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              Nothing could be read as a dimension. A straighter, better-lit photo of the whole
              sheet usually fixes it.
            </p>
          )}

          {Array.isArray(read.couldNotRead) && read.couldNotRead.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
                Not on the drawing — still yours to set
              </div>
              {read.couldNotRead.map((t: string, i: number) => (
                <p key={i} className="text-sm text-gray-400">· {t}</p>
              ))}
            </div>
          )}

          {Array.isArray(read.conflicts) && read.conflicts.length > 0 && (
            <div className="rounded-xl p-3"
              style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)' }}>
              <div className="text-sm font-bold text-red-300 mb-1">The drawing disagrees with itself</div>
              {read.conflicts.map((t: string, i: number) => (
                <p key={i} className="text-sm text-red-200">· {t}</p>
              ))}
            </div>
          )}

          {Array.isArray(read.notesOnDrawing) && read.notesOnDrawing.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
                Notes transcribed from the sheet
              </div>
              {read.notesOnDrawing.map((t: string, i: number) => (
                <p key={i} className="text-sm text-gray-400">“{t}”</p>
              ))}
            </div>
          )}

          <p className="flex items-start gap-2 text-xs text-gray-500">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Applying these changes the design, and every drawing and calculation follows from it.
            Check the framing plan against your sketch afterwards.
          </p>
        </div>
      )}
    </div>
  );
}
