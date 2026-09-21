/**
 * RoomCapture — photograph a room, read it, and put it in the house.
 *
 * WHY THIS EXISTS AT ALL
 *
 * The house record has always had two kinds of view: an elevation and a room.
 * Elevations could be photographed and read; rooms could only be typed in by
 * hand, field by field, in the house panel. So every interior trade — kitchens,
 * bathrooms, flooring — began with somebody guessing a room's dimensions into a
 * form, and the tooling downstream then treated those guesses with the same
 * respect as a measurement. This is the missing half.
 *
 * WHY IT IS A SEPARATE PANEL FROM `HouseCapture`
 *
 * That component is about a deck: it reads a wall, offers to apply a deck
 * height, and renders a deck onto the photograph. Almost none of it is true
 * indoors. Bending it to cover both would mean a component where half the
 * controls are hidden depending on a flag, which is how a panel becomes
 * unreadable. They share the route and the discipline, not the screen.
 *
 * WHAT IT WILL NOT DO
 *
 * Apply anything silently. The read produces a proposal with every number
 * labelled by where it came from and how confident the model was; nothing
 * reaches the house until somebody presses the button. A photograph has no
 * scale, so every dimension here is a starting point to be checked with a tape,
 * and the UI says that rather than implying otherwise by looking precise.
 *
 * It also does not guess at plumbing or structure. Whether a wall is bearing is
 * the most expensive question in residential work and a photograph cannot
 * answer it, so the read is told to put that in "not visible" and this panel
 * shows that list prominently rather than tucking it away.
 */
import { useCallback, useRef, useState } from 'react';
import {
  Camera, Loader2, X, Ruler, AlertTriangle, CheckCircle2, Eye, DoorOpen, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { fileToDataUrl, framesFromVideo, dataUrlBytes } from '../lib/imageCapture';
import { isVideoFile, isImageFile } from '../lib/localFolder';
import {
  type House, roomViewFromAnalysis, upsertView,
} from '../lib/houseModel';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

/** Same ceiling as the exterior read, for the same reason: the edge limit. */
const MAX_PAYLOAD_BYTES = 4_000_000;
const MAX_PHOTOS = 8;

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || publicAnonKey}`,
    apikey: publicAnonKey,
  };
}

const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';
const field =
  'w-full px-2 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm '
  + 'focus:outline-none focus:border-[#ea580c]';

/** Says how much weight a reported number will bear. */
function Confidence({ of }: { of?: string }) {
  const v = String(of || '').toLowerCase();
  if (v === 'high') return <span className="text-[10px] font-semibold text-emerald-400">high confidence</span>;
  if (v === 'medium') return <span className="text-[10px] font-semibold text-amber-400">medium</span>;
  if (v === 'low') return <span className="text-[10px] font-semibold text-red-400">low — check this</span>;
  return null;
}

export default function RoomCapture({
  house,
  onChange,
}: {
  house: House;
  onChange: (house: House) => void;
}) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const input = useRef<HTMLInputElement>(null);

  const add = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy('Reading files');
    try {
      const next: string[] = [];
      for (const file of Array.from(files)) {
        const room = MAX_PHOTOS - (photos.length + next.length);
        if (room < 1) break;
        if (isVideoFile(file)) {
          // A slow pan of a room carries the corners that stills miss, which is
          // most of what makes the shape readable.
          const frames = await framesFromVideo(file, Math.min(5, room));
          next.push(...frames);
        } else if (isImageFile(file)) {
          next.push(await fileToDataUrl(file));
        }
      }
      if (!next.length) { toast.error('Those files could not be read.'); return; }
      setPhotos(p => [...p, ...next].slice(0, MAX_PHOTOS));
    } catch (e: any) {
      toast.error(e?.message || 'Could not read those files.');
    } finally {
      setBusy(null);
      if (input.current) input.current.value = '';
    }
  }, [photos.length]);

  const analyze = useCallback(async () => {
    if (!photos.length) return;
    // Trim from the end rather than failing: four good frames beat a request
    // that bounces because the fifth pushed it over the edge limit.
    let send = photos;
    while (send.length > 1 && send.reduce((n, p) => n + dataUrlBytes(p), 0) > MAX_PAYLOAD_BYTES) {
      send = send.slice(0, -1);
    }
    if (send.length < photos.length) {
      toast.message(`Sending the first ${send.length} — the rest would not fit in one request.`);
    }

    setBusy('Reading the room');
    setAnalysis(null);
    try {
      const res = await fetch(`${SERVER}/house-capture/analyze`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ images: send, note, subject: 'room' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `The read failed (${res.status}).`);
      setAnalysis(json.analysis);
      // Name it from what the read thinks it is, unless somebody already said.
      const kind = String(json.analysis?.room?.type || '').trim();
      if (!name.trim() && kind && kind !== 'other') {
        setName(kind.charAt(0).toUpperCase() + kind.slice(1));
      }
      toast.success('Room read.');
    } catch (e: any) {
      toast.error(e?.message || 'Could not read the room.');
    } finally {
      setBusy(null);
    }
  }, [photos, note, name]);

  /**
   * Put the read into the house.
   *
   * Deliberately a button rather than something that happens on analysis. The
   * house is what every trade downstream measures from, so writing to it is an
   * act somebody takes, not a side effect of looking.
   */
  const apply = () => {
    if (!analysis) return;
    const view = roomViewFromAnalysis(analysis, name.trim() || 'Room');
    onChange(upsertView(house, view));
    toast.success(`${view.name} added to the house — check the numbers against a tape.`);
  };

  const room = analysis?.room || null;
  const openings: any[] = Array.isArray(analysis?.openings) ? analysis.openings : [];
  const fittings: any[] = Array.isArray(analysis?.fittings) ? analysis.fittings : [];
  const finishes = analysis?.finishes || null;
  const cautions: string[] = Array.isArray(analysis?.cautions) ? analysis.cautions : [];
  const notVisible: string[] = Array.isArray(analysis?.notVisible) ? analysis.notVisible : [];

  return (
    <div className={card}>
      <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-white">
        <Camera className="h-4 w-4 text-[#ea580c]" /> Read a room
      </h2>
      <p className="mb-3 text-xs text-gray-500">
        Photograph or film the room and this reads its shape, its openings and what
        is fitted in it now. Stand in a corner and turn slowly — the corners are what
        make the shape readable.
      </p>

      {/* The single most useful instruction on this panel. A sheet of paper
          taped to the wall turns every dimension from an assumption about
          typical construction into a measurement of this room. */}
      <div className="mb-3 flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 p-2.5">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-400" />
        <p className="text-xs text-blue-200/80">
          Tape a sheet of printer paper flat on one wall before you shoot. It is
          exactly 8.5 by 11 inches everywhere, so it scales the room properly instead
          of the read guessing from standard door sizes.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={input}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={e => add(e.target.files)}
        />
        <button
          onClick={() => input.current?.click()}
          disabled={!!busy || photos.length >= MAX_PHOTOS}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#2A2A2A] px-3 py-2 text-xs font-bold text-gray-200 transition hover:border-orange-500/40 disabled:opacity-40"
        >
          <Camera className="h-3.5 w-3.5" /> Photos or video
        </button>
        <button
          onClick={analyze}
          disabled={!!busy || !photos.length}
          className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-orange-500 disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
          {busy || 'Read the room'}
        </button>
        <span className="text-xs text-gray-600">
          {photos.length ? `${photos.length} of ${MAX_PHOTOS}` : 'Nothing added yet'}
        </span>
      </div>

      {photos.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {photos.map((p, i) => (
            <div key={i} className="relative">
              <img src={p} alt="" className="h-16 w-16 rounded-lg border border-[#2A2A2A] object-cover" />
              <button
                onClick={() => setPhotos(list => list.filter((_, j) => j !== i))}
                className="absolute -right-1.5 -top-1.5 rounded-full bg-black/80 p-0.5 text-gray-300 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-gray-400">Call this room</label>
          <input className={field} value={name} onChange={e => setName(e.target.value)} placeholder="Kitchen" />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold text-gray-400">Anything worth saying</label>
          <input
            className={field}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="The door on the left is new"
          />
        </div>
      </div>

      {room && (
        <div className="mt-4 space-y-3 rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-bold text-white">
              <Ruler className="h-4 w-4 text-[#ea580c]" />
              {Number(room.lengthFt) || '?'} × {Number(room.widthFt) || '?'} ft,
              ceiling {Number(room.ceilingHeightFt) || '?'} ft
            </p>
            <Confidence of={room.confidence} />
          </div>
          <p className="text-xs text-gray-500">
            Scaled from {String(room.reference || 'nothing it could name')} ({String(room.basis || 'unknown basis')}).
            {room.shape && room.shape !== 'rectangular' && (
              <span className="text-amber-400"> Reported as {String(room.shape)} — {String(room.notes || 'the numbers describe the largest rectangle inside it')}.</span>
            )}
          </p>

          {openings.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-semibold text-gray-400">Openings</p>
              <ul className="space-y-0.5 text-xs text-gray-300">
                {openings.map((o, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <DoorOpen className="h-3 w-3 shrink-0 text-gray-600" />
                    {String(o.kind || 'opening')} on the {String(o.wall || '?')} wall,
                    {' '}{Number(o.widthFt) || '?'} ft wide
                    <Confidence of={o.confidence} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {fittings.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-semibold text-gray-400">What is there now</p>
              <ul className="space-y-0.5 text-xs text-gray-300">
                {fittings.map((f, i) => (
                  <li key={i}>
                    {String(f.description || f.item)} — {String(f.wall || '?')} wall
                    {Number(f.lengthFt) ? `, ${Number(f.lengthFt)} ft` : ''}
                    {' '}<Confidence of={f.confidence} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {finishes && (
            <div>
              <p className="mb-1 text-[11px] font-semibold text-gray-400">
                Finishes — the least reliable thing in a photograph
              </p>
              <ul className="space-y-0.5 text-xs text-gray-300">
                <li>Floor: {String(finishes.floor || 'unknown')} <Confidence of={finishes.floorConfidence} /></li>
                <li>Walls: {String(finishes.walls || 'unknown')}{finishes.wallColor ? `, ${String(finishes.wallColor)}` : ''} <Confidence of={finishes.wallColorConfidence} /></li>
                {finishes.counter && <li>Worktop: {String(finishes.counter)} <Confidence of={finishes.counterConfidence} /></li>}
                <li>Condition: {String(finishes.condition || 'unknown')} <Confidence of={finishes.conditionConfidence} /></li>
              </ul>
            </div>
          )}

          {cautions.length > 0 && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-amber-400">
                <AlertTriangle className="h-3 w-3" /> Worth knowing before pricing
              </p>
              <ul className="list-inside list-disc space-y-0.5 text-xs text-amber-200/80">
                {cautions.map((c, i) => <li key={i}>{String(c)}</li>)}
              </ul>
            </div>
          )}

          {/* Shown, not tucked away. What a photograph cannot see is the part
              that turns into a change order on site. */}
          {notVisible.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-semibold text-gray-400">
                Still has to be checked on site
              </p>
              <ul className="list-inside list-disc space-y-0.5 text-xs text-gray-500">
                {notVisible.map((n, i) => <li key={i}>{String(n)}</li>)}
              </ul>
            </div>
          )}

          <button
            onClick={apply}
            className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-orange-500"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Use these numbers
          </button>
          <p className="text-[11px] text-gray-600">
            They go into the house as read-from-photos, which the kitchen, bathroom and
            flooring tools all work from. Typing over any of them marks it measured, and
            a later read will then leave it alone.
          </p>
        </div>
      )}
    </div>
  );
}
