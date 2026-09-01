/**
 * A subcontractor's quote comes back, and lands on our scope.
 *
 * They send whatever they send — a PDF on their letterhead, a photograph of
 * something handwritten from the van, a walkthrough video with the numbers said
 * out loud. This reads it and proposes where each of their lines belongs
 * against ours.
 *
 * NOTHING IS APPLIED UNTIL SOMEBODY TICKS IT
 *
 * That is the whole shape of this screen. A reading is a suggestion; a person
 * accepts it. An AI parsing a supplier's document and silently writing money
 * into a customer quote produces the worst kind of error — a wrong number
 * nobody typed and nobody checked, sitting in front of a customer with your
 * name on it.
 *
 * Matches the reader is unsure about are shown and left unticked rather than
 * hidden. Hiding them would quietly drop work; ticking them would quietly
 * price it wrong.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  FileUp, Loader2, Check, AlertTriangle, Info, X, Camera, Video, Paperclip,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { projectId } from '../utils/supabase/info';
import { fileToDataUrl, framesFromVideo } from '../lib/imageCapture';
import {
  type BidReading, type ProposedMatch,
  EMPTY_READING, REVIEW_BELOW, matchKey, amountsFor, confidentMatches,
  readingNote, sumOfLines, totalDisagreement,
} from '../lib/bidIntakeModel';
import type { Scope } from '../lib/scopeModel';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';

async function headers() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || ''}`,
  };
}

export default function BidIntakePanel({ scope, onApply }: {
  scope: Scope;
  /** Amounts keyed by our scope line id. Adds to what is there. */
  onApply: (amounts: Record<string, number>) => void;
}) {
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [reading, setReading] = useState<BidReading | null>(null);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());

  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  // Only the lines actually out to bid. Offering to match a plumber's quote
  // against our own carpentry is noise that makes the real matches harder to see.
  const ourLines = useMemo(
    () => scope.lines.filter(l => l.bidOut).map(l => ({
      id: l.id, description: l.description, trade: l.trade, phase: l.phase,
    })),
    [scope.lines],
  );

  const addPhotos = useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy('Reading');
    try {
      const added: string[] = [];
      for (const f of Array.from(files).slice(0, 8)) added.push(await fileToDataUrl(f));
      setImages(p => [...p, ...added].slice(0, 8));
    } catch { toast.error('Those could not be read.'); }
    finally { setBusy(null); }
  }, []);

  /**
   * A walkthrough video, reduced to frames.
   *
   * Subs send them, and the numbers are sometimes on a page held up to the
   * camera. Frames are what the reader can actually look at.
   */
  const addVideo = useCallback(async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    setBusy('Pulling frames');
    try {
      const frames = await framesFromVideo(f, 4, undefined, (d, t) => setBusy(`Frame ${d} of ${t}`));
      setImages(p => [...p, ...frames].slice(0, 8));
    } catch { toast.error('That video could not be read.'); }
    finally { setBusy(null); }
  }, []);

  const read = useCallback(async () => {
    if (!text.trim() && !images.length) return;
    if (!ourLines.length) {
      toast.error('Nothing in the scope is marked as going out to bid, so there is nothing to match against.');
      return;
    }
    setBusy('Reading their quote');
    try {
      const res = await fetch(`${SERVER}/bid-intake/read`, {
        method: 'POST', headers: await headers(),
        body: JSON.stringify({ text: text.trim(), images, ourLines }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { toast.error(data?.error || 'That could not be read.'); return; }
      const r: BidReading = data.reading || EMPTY_READING;
      setReading(r);
      // Pre-tick only what the reader is confident about. The rest is shown.
      setAccepted(new Set(confidentMatches(r).map(matchKey)));
    } catch (err: any) {
      toast.error(err?.message || 'That could not be read.');
    } finally { setBusy(null); }
  }, [text, images, ourLines]);

  const apply = useCallback(() => {
    if (!reading) return;
    const amounts = amountsFor(reading.matches, accepted);
    const n = Object.keys(amounts).length;
    if (!n) { toast.error('Nothing is ticked.'); return; }
    onApply(amounts);
    toast.success(`${n} scope line${n === 1 ? '' : 's'} priced from ${reading.vendor || 'their quote'}.`);
  }, [reading, accepted, onApply]);

  const toggle = (m: ProposedMatch) => {
    const k = matchKey(m);
    setAccepted(prev => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  };

  const disagreement = reading ? totalDisagreement(reading) : null;

  return (
    <div className={card}>
      <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
        <FileUp className="w-4 h-4 text-[#ea580c]" /> A quote came back
      </h3>
      <p className="text-xs text-gray-500 mb-3">
        However they sent it — paste the text, or attach the PDF pages, a photo of it, or a
        clip. It gets read and lined up against the {ourLines.length} line
        {ourLines.length === 1 ? '' : 's'} you have out to bid. Nothing is applied until you tick it.
      </p>

      <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
        placeholder="Paste their quote here, or attach it below…"
        className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#ea580c] resize-y mb-2" />

      <div className="flex flex-wrap gap-1.5 mb-2">
        <button onClick={() => photoInput.current?.click()}
          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-[#2A2A2A] text-gray-400 hover:text-white flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5" /> Pages or photos
        </button>
        <button onClick={() => videoInput.current?.click()}
          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-[#2A2A2A] text-gray-400 hover:text-white flex items-center gap-1.5">
          <Video className="w-3.5 h-3.5" /> A clip
        </button>
        {images.length > 0 && (
          <span className="text-[11px] text-gray-500 self-center flex items-center gap-1">
            <Paperclip className="w-3 h-3" /> {images.length} attached
            <button onClick={() => setImages([])} className="ml-1 text-gray-600 hover:text-red-400">
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
      </div>
      <input ref={photoInput} type="file" accept="image/*" multiple className="hidden"
        onChange={e => addPhotos(e.target.files)} />
      <input ref={videoInput} type="file" accept="video/*" className="hidden"
        onChange={e => addVideo(e.target.files)} />

      <button onClick={read} disabled={!!busy || (!text.trim() && !images.length)}
        className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40"
        style={{ background: '#ea580c' }}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
        {busy || 'Read it and line it up'}
      </button>

      {reading && (
        <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-sm font-bold text-white">{reading.vendor || 'Their quote'}</span>
            <span className="text-sm font-black text-[#ea580c]">
              ${sumOfLines(reading.lines).toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-3">{readingNote(reading)}</p>

          {disagreement !== null && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/[0.06] p-2.5 mb-3 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">
                Their printed total is ${reading.statedTotal?.toFixed(2)} and their lines add to
                ${sumOfLines(reading.lines).toFixed(2)}. Resolve that with them before using either.
              </p>
            </div>
          )}

          {reading.matches.length > 0 && (
            <>
              <p className="text-[11px] font-semibold text-gray-400 mb-1.5">
                Where their lines land. Untick anything you disagree with.
              </p>
              <ul className="space-y-1.5 mb-3">
                {reading.matches.map(m => {
                  const on = accepted.has(matchKey(m));
                  const shaky = m.confidence < REVIEW_BELOW;
                  return (
                    <li key={matchKey(m)}
                      className={`rounded-xl border p-2.5 ${
                        on ? 'border-[#ea580c]/40 bg-[#ea580c]/[0.06]' : 'border-[#2A2A2A] bg-[#0A0A0A]'}`}>
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input type="checkbox" checked={on} onChange={() => toggle(m)}
                          className="w-4 h-4 accent-[#ea580c] mt-0.5 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs text-gray-300 truncate">
                            “{m.theirDescription}” → {m.ourDescription}
                          </span>
                          <span className="block text-[10px] text-gray-600">
                            {m.why}
                            {shaky && <span className="text-amber-500/90"> · the reader is unsure — check this one</span>}
                          </span>
                        </span>
                        <span className="text-xs font-semibold text-white shrink-0">
                          ${m.amount.toFixed(2)}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {(reading.unmatchedTheirs.length > 0 || reading.unmatchedOurs.length > 0) && (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.05] p-2.5 mb-3">
              {reading.unmatchedTheirs.length > 0 && (
                <p className="text-[11px] text-amber-200/90 mb-1">
                  On their quote and not in our scope — possibly work we missed:
                  {' '}{reading.unmatchedTheirs.map(i => `“${reading.lines[i]?.description ?? '?'}”`).join(', ')}
                </p>
              )}
              {reading.unmatchedOurs.length > 0 && (
                <p className="text-[11px] text-amber-200/90">
                  In our scope with nothing priced against it — {reading.unmatchedOurs.length} line
                  {reading.unmatchedOurs.length === 1 ? '' : 's'}. Did they leave it out on purpose?
                </p>
              )}
            </div>
          )}

          {reading.notes.map((n, i) => (
            <p key={i} className="text-[11px] text-gray-500 flex items-start gap-1.5 mb-1">
              <Info className="w-3 h-3 shrink-0 mt-0.5 text-gray-600" />{n}
            </p>
          ))}

          <button onClick={apply} disabled={accepted.size === 0}
            className="mt-2 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <Check className="w-4 h-4" />
            Put {accepted.size} of these on the scope
          </button>
        </div>
      )}
    </div>
  );
}
