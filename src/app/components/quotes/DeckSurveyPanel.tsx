/**
 * Reading the existing deck, from the quote editor.
 *
 * Eric: "i want the exisiting framing and footing caught in the auto generate
 * proccess so it can build be a framed deck in my design center and then it
 * should read what the customer is requestiong and prep a new build that i can
 * review and then render" — and "i am going to do most of my work out of the
 * quote editor so lets make sure everyhthing is getting triggered from there".
 *
 * So the survey is triggered here, beside the quote it will feed.
 *
 * WHY THE FRAMES ARE PULLED IN THE BROWSER
 *
 * There is no ffmpeg in Deno and a 200MB clip as base64 is a ~270MB request
 * body. `framesFromVideo` already does this for `HouseCapture`, `SidingTakeoff`
 * and `BidIntakePanel`, and the iPhone video capture it depends on was fixed
 * earlier. The browser extracts, resizes and caps; the server decides
 * everything about what the frames MEAN.
 *
 * WHAT THIS SCREEN IS FOR
 *
 * Showing the basis, not just the answer. Every dimension comes back with HOW
 * it was arrived at — a tape measure, a riser count, a board count, or an
 * assumption — and an assumption is shown as a warning rather than a number.
 * That is the whole safety argument of this feature: a guessed length becomes
 * framing, a permit packet and a price, so the one thing this must never do is
 * present an assumption as a measurement.
 */

import { useCallback, useRef, useState } from 'react';
import {
  Ruler, Video, Loader2, AlertTriangle, CheckCircle2, Eye, EyeOff, HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { publicAnonKey } from '../../utils/supabase/info';
import { API_BASE_URL } from '../../lib/apiConfig';
import { framesFromVideo, fileToDataUrl, dataUrlBytes } from '../../lib/imageCapture';

/** Matches `MAX_FRAMES` on the server. More are discarded there anyway. */
const MAX_FRAMES = 12;

/** The same cap `HouseCapture` uses, for the same reason. */
const MAX_PAYLOAD_BYTES = 4_000_000;

interface Measured {
  value: number;
  basis: 'stated' | 'riser-count' | 'joist-count' | 'board-count' | 'assumed';
  low: number;
  high: number;
  how: string;
}

export interface DeckSurvey {
  id: string;
  surveyedAt: string;
  passes: number;
  verified: boolean;
  deck: Record<string, unknown> & { widthFt: number; depthFt: number; heightFt: number };
  width: Measured;
  depth: Measured;
  height: Measured;
  needsMeasurement: boolean;
  unknowns: string[];
  framesCited: number[];
}

interface Props {
  workRequestId: string;
  /** Opens the as-built in the designer. Absent hides the button. */
  onOpenInDesigner?: (deck: Record<string, unknown>) => void;
}

const isVideo = (f: File) => f.type.startsWith('video/') || /\.(mov|mp4|m4v|webm|avi)$/i.test(f.name);

/** A dimension and, more importantly, where it came from. */
function Dimension({ label, m }: { label: string; m: Measured }) {
  const assumed = m.basis === 'assumed';
  const range = m.low !== m.high ? `${m.low}–${m.high} ft` : null;
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        assumed ? 'border-amber-500/50 bg-amber-500/5' : 'border-[#2A2A2A] bg-black/40'
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{label}</span>
        <span className={`text-lg font-black ${assumed ? 'text-amber-300' : 'text-white'}`}>
          {assumed ? '—' : `${m.value} ft`}
        </span>
      </div>
      {/*
        An assumed dimension shows NO NUMBER. It has one — the deck has to be
        built from something — but putting it here in the same type as a
        measured figure is how an assumption becomes a fact on the way to a
        customer.
      */}
      <p className={`mt-0.5 text-[11px] ${assumed ? 'text-amber-400/90' : 'text-gray-500'}`}>
        {assumed ? 'Not established — needs measuring' : m.how}
        {!assumed && range ? ` · good to ${range}` : ''}
      </p>
    </div>
  );
}

export default function DeckSurveyPanel({ workRequestId, onOpenInDesigner }: Props) {
  const [frames, setFrames] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [survey, setSurvey] = useState<DeckSurvey | null>(null);
  const [unsure, setUnsure] = useState<string | null>(null);
  const [showFrames, setShowFrames] = useState(false);
  const [notes, setNotes] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  const addFiles = useCallback(async (files: File[]) => {
    const room = MAX_FRAMES - frames.length;
    if (room < 1) {
      toast.error(`Already holding ${MAX_FRAMES} frames. Clear some first.`);
      return;
    }
    setBusy('Reading the files');
    try {
      const next: string[] = [];
      // Clips first. A video walking round the deck is the single most useful
      // thing here, and stills arriving first would fill every slot and leave
      // the clip nothing — the most valuable file discarded by arrival order.
      for (const file of [...files.filter(isVideo), ...files.filter((f) => !isVideo(f))]) {
        if (next.length >= room) break;
        if (isVideo(file)) {
          const pulled = await framesFromVideo(
            file,
            Math.min(8, room - next.length),
            undefined,
            (d, t) => setBusy(`Pulling frame ${d} of ${t}`),
          );
          next.push(...pulled);
        } else if (file.type.startsWith('image/')) {
          next.push(await fileToDataUrl(file));
        }
      }
      if (!next.length) {
        toast.error('Nothing readable in those files.');
        return;
      }
      setFrames((prev) => [...prev, ...next].slice(0, MAX_FRAMES));
      toast.success(`${next.length} frame${next.length === 1 ? '' : 's'} ready.`);
    } catch (err: any) {
      toast.error(err?.message || 'Those files could not be read.');
    } finally {
      setBusy(null);
    }
  }, [frames.length]);

  const run = useCallback(async () => {
    if (!frames.length) {
      toast.error('Add the customer\'s video or photographs first.');
      return;
    }

    // Trim from the end rather than failing: eight good frames beat a request
    // that bounces because the twelfth pushed it over.
    let send = frames;
    while (send.length > 1 && send.reduce((n, f) => n + dataUrlBytes(f), 0) > MAX_PAYLOAD_BYTES) {
      send = send.slice(0, -1);
    }
    if (send.length < frames.length) {
      toast.message(`Sending the first ${send.length} — the rest would not fit in one request.`);
    }

    setBusy('Reading the deck');
    setUnsure(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || publicAnonKey;
      const res = await fetch(`${API_BASE_URL}/make-server-3eae23a6/deck-survey/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ workRequestId, frames: send, notes: notes.trim() || undefined }),
        // Two passes over a dozen frames. The 15s timeout that threw away
        // paid-for model answers elsewhere in this app is the thing to avoid.
        signal: AbortSignal.timeout(180000),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.success === false) {
        toast.error(data?.error || `The survey failed (HTTP ${res.status}).`);
        return;
      }
      /* The model looked and would not say. That is an answer worth showing,
         not an error — and it is the honest outcome for a deck under snow. */
      if (data?.unsure) {
        setUnsure(String(data.why || 'The surveyor would not read these frames.'));
        setSurvey(null);
        return;
      }
      setSurvey(data.survey as DeckSurvey);
      toast.success(
        data.survey?.needsMeasurement
          ? 'Read — but something needs measuring. See below.'
          : 'Read. Every dimension was established.',
      );
    } catch (err: any) {
      toast.error(err?.name === 'TimeoutError'
        ? 'The survey is taking more than three minutes. It may still finish — try again shortly.'
        : 'Could not reach the surveyor.');
    } finally {
      setBusy(null);
    }
  }, [frames, notes, workRequestId]);

  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#0F0F0F] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-base font-bold text-white">
          <Ruler className="h-4 w-4 text-sky-400" />
          The deck that is there now
        </h4>
        <span className="text-[11px] text-gray-500">{frames.length}/{MAX_FRAMES} frames</span>
      </div>

      <p className="mb-3 text-xs text-gray-400">
        Add the customer&apos;s video and photographs. Frames are pulled here in the browser, then
        read twice — once to count what is there, once to check the count. Nothing is priced from
        this until you have looked at it.
      </p>

      <input
        ref={fileRef}
        type="file"
        multiple
        accept="video/*,image/*"
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          e.target.value = '';
          if (files.length) void addFiles(files);
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={!!busy}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-sky-500/50 bg-black px-3 py-2 text-sm font-bold text-sky-300 transition-colors hover:border-sky-400 disabled:opacity-50"
        >
          <Video className="h-4 w-4" />
          Add video or photos
        </button>
        <button
          onClick={() => void run()}
          disabled={!!busy || !frames.length}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-sky-600 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ruler className="h-4 w-4" />}
          {busy || 'Read the deck'}
        </button>
        {frames.length > 0 && (
          <>
            <button
              onClick={() => setShowFrames((v) => !v)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[#2A2A2A] px-3 py-2 text-xs font-bold text-gray-300 hover:border-gray-500"
            >
              {showFrames ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showFrames ? 'Hide frames' : 'Show frames'}
            </button>
            <button
              onClick={() => { setFrames([]); setSurvey(null); setUnsure(null); }}
              disabled={!!busy}
              className="min-h-[44px] px-2 text-xs font-bold text-gray-500 hover:text-gray-300 disabled:opacity-50"
            >
              Clear
            </button>
          </>
        )}
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Anything the customer told you about the deck (optional)"
        rows={2}
        className="mt-3 w-full rounded-lg border border-[#2A2A2A] bg-black px-3 py-2 text-xs text-gray-200 placeholder:text-gray-600"
      />
      {/*
        Said on the screen as well as in the prompt, because somebody typing a
        dimension in here would reasonably expect it to be used. It is not: a
        figure in a note is hearsay, and the surveyor is told so.
      */}
      <p className="mt-1 text-[11px] text-gray-600">
        Read as description only. A dimension written here is not treated as a measurement — put a
        tape in one of the frames for that.
      </p>

      {showFrames && frames.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
          {frames.map((f, i) => (
            <div key={i} className="relative">
              <img src={f} alt={`Frame ${i}`} className="aspect-square w-full rounded object-cover" />
              <span className="absolute left-1 top-1 rounded bg-black/80 px-1 text-[10px] font-bold text-white">
                {i}
              </span>
            </div>
          ))}
        </div>
      )}

      {unsure && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2">
          <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-bold text-amber-300">The surveyor would not read these</p>
            <p className="mt-0.5 text-xs text-amber-200/80">{unsure}</p>
          </div>
        </div>
      )}

      {survey && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Dimension label="Width" m={survey.width} />
            <Dimension label="Depth" m={survey.depth} />
            <Dimension label="Height" m={survey.height} />
          </div>

          {survey.needsMeasurement ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/5 px-3 py-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <p className="text-xs text-amber-200/90">
                Something could not be established from the frames. The deck below is built on an
                assumption for those, so it is not a quotable figure until somebody measures it or
                a better frame is added.
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/5 px-3 py-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <p className="text-xs text-emerald-200/90">
                Every dimension was established from the frames. Check it against the site anyway —
                this is a reading, not a site visit.
              </p>
            </div>
          )}

          <div className="rounded-lg border border-[#2A2A2A] bg-black/40 px-3 py-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
              The framing it found
            </p>
            <p className="mt-1 text-xs text-gray-300">
              {String(survey.deck.joistSize)} joists at {String(survey.deck.joistSpacing)}&quot; on
              centre · {String(survey.deck.beamPlies)}-ply {String(survey.deck.beamSize)} beam ·{' '}
              {String(survey.deck.postSize)} posts at {String(survey.deck.postSpacingFt)} ft ·{' '}
              {survey.deck.ledgerAttached ? 'ledger-attached' : 'free-standing'}
              {survey.deck.stairs ? ' · stairs' : ''}
              {survey.deck.guardrail ? ' · guardrail' : ' · no guardrail'}
            </p>
            <p className="mt-1 text-[11px] text-gray-500">
              {survey.verified
                ? `Read and verified across ${survey.passes} passes, from frames ${survey.framesCited.join(', ')}.`
                : 'Read ONCE — the checking pass came back unusable, so this count has not been verified.'}
            </p>
          </div>

          {survey.unknowns.length > 0 && (
            <div className="rounded-lg border border-[#2A2A2A] bg-black/40 px-3 py-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                What it could not see
              </p>
              <ul className="mt-1 space-y-0.5">
                {survey.unknowns.map((u, i) => (
                  <li key={i} className="text-xs text-gray-400">· {u}</li>
                ))}
              </ul>
            </div>
          )}

          {onOpenInDesigner && (
            <button
              onClick={() => onOpenInDesigner(survey.deck)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-sky-500/50 bg-black px-3 py-2 text-sm font-bold text-sky-300 hover:border-sky-400"
            >
              <Ruler className="h-4 w-4" />
              Open this in the designer
            </button>
          )}
        </div>
      )}
    </div>
  );
}
