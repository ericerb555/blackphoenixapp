/**
 * HouseCapture — photograph the house, read it, and show the deck on it.
 *
 * This is the panel someone uses standing in the driveway. It does two things
 * that are kept visually separate on purpose, because they carry very different
 * weight:
 *
 *   Reading the house is advisory. Everything it reports came out of a
 *   photograph, and a photograph has no scale, so every dimension is labelled
 *   with the reference it was derived from and how confident the read was. The
 *   "use these numbers" button says out loud that they are a starting point to
 *   be checked with a tape. Nothing is applied silently.
 *
 *   Rendering the deck onto the photo is a sales image. It is the thing that
 *   closes the job, and it is not a drawing. It carries its disclaimer in the
 *   UI and in the file name, so it stays labelled after someone right-clicks
 *   and saves it into an email.
 *
 * The permit set never comes from here. It comes from the measured three.js
 * views, off the model, which is why applying numbers is a deliberate action
 * with a warning rather than something that happens on analysis.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera, Video, Upload, Sparkles, Loader2, X, AlertTriangle, Info, Send,
  Home, Ruler, Download, ImageIcon, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { fileToDataUrl, framesFromVideo, dataUrlBytes } from '../lib/imageCapture';
import { isVideoFile, isImageFile } from '../lib/localFolder';
import { DEFAULT_LOOKS, applyLook, lookAppearance, lookCaption } from '../lib/deckLooks';
import type { DeckModel } from '../lib/deckModel';
import LocalFolderPicker from './LocalFolderPicker';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

/** Ceiling for one analysis request, comfortably inside the edge limit. */
const MAX_PAYLOAD_BYTES = 4_000_000;
const MAX_PHOTOS = 12;

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || publicAnonKey}`,
    apikey: publicAnonKey,
  };
}

type Confidence = 'high' | 'medium' | 'low' | string;

interface Props {
  model: DeckModel;
  site: { projectName: string; address: string; town: string; state: string; parcel: string };
  onApply: (patch: Partial<DeckModel>) => void;
  /**
   * Photos pushed in from the job folder rather than picked here.
   *
   * `n` is a delivery counter rather than a comparison of the files themselves:
   * sending the same six photos twice is a thing an operator may well do on
   * purpose, and comparing arrays would swallow the second one.
   */
  incoming?: { files: File[]; n: number };
  /**
   * Reports the read upward so the assistant can reason about the real house.
   * Passing the whole analysis rather than a summary: the assistant is better
   * placed than this component to decide which parts of it matter.
   */
  onRead?: (analysis: any) => void;
  /** Who the design belongs to, so a send button can name them. */
  customerName?: string;
  /**
   * File a picture into the customer's folder and show it to them.
   *
   * Passed in rather than done here because this component has no idea who the
   * customer is — that lives with the design, and a component that reached out
   * to find it would be the second place that decision is made.
   */
  onSendToCustomer?: (label: string, dataUri: string) => Promise<boolean>;
}

export default function HouseCapture({ model, site, onApply, incoming, onRead, customerName, onSendToCustomer }: Props) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [render, setRender] = useState<{ url: string; disclaimer: string } | null>(null);
  const [renderOn, setRenderOn] = useState(0);
  const [extra, setExtra] = useState('');
  // The wall, and whether this is a tear-out. Both start from what the analysis
  // read and can be overruled — the person using this is standing in the yard
  // and the photograph is not.
  const [wall, setWall] = useState('');
  const [replacing, setReplacing] = useState(false);
  const [looks, setLooks] = useState<any[] | null>(null);

  const photoInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  const addPhotos = useCallback(async (files: FileList | File[] | null) => {
    if (!files?.length) return;
    setBusy('Reading photos');
    try {
      const added: string[] = [];
      for (const f of Array.from(files)) {
        if (added.length + photos.length >= MAX_PHOTOS) break;
        added.push(await fileToDataUrl(f));
      }
      setPhotos(p => [...p, ...added].slice(0, MAX_PHOTOS));
      if (added.length) toast.success(`${added.length} photo${added.length > 1 ? 's' : ''} added.`);
    } catch (err: any) {
      toast.error(err?.message || 'Those photos could not be read.');
    } finally {
      setBusy(null);
    }
  }, [photos.length]);

  const addVideo = useCallback(async (files: FileList | File[] | null) => {
    const file = files ? (Array.from(files as any)[0] as File | undefined) : undefined;
    if (!file) return;
    // No room means the frames would be extracted and then sliced away by the
    // cap below, while a success toast claimed they had been added. Say it
    // plainly instead — a video that silently does nothing is the complaint
    // this whole change exists to answer.
    const room = MAX_PHOTOS - photos.length;
    if (room < 1) {
      toast.error(`Already holding ${MAX_PHOTOS} photos. Remove a few to pull frames from a video.`);
      return;
    }
    setBusy('Pulling frames');
    try {
      const frames = await framesFromVideo(file, Math.min(6, room), undefined, (d, t) =>
        setBusy(`Pulling frame ${d} of ${t}`));
      setPhotos(p => [...p, ...frames].slice(0, MAX_PHOTOS));
      toast.success(`${frames.length} frame${frames.length > 1 ? 's' : ''} taken from the video.`);
    } catch (err: any) {
      toast.error(err?.message || 'That video could not be read.');
    } finally {
      setBusy(null);
    }
  }, [photos.length]);

  /**
   * A folder selection can hold both stills and clips, so each goes to the
   * handler that knows what to do with it — a video still gets its frames
   * pulled rather than being treated as one enormous photo.
   */
  const fromFolder = useCallback(async (files: File[]) => {
    const clips = files.filter(isVideoFile);
    const stills = files.filter(f => !isVideoFile(f) && isImageFile(f));

    // Clips go first. The panel tells you a video walking past the wall is the
    // single most useful thing to take, and stills going first meant a folder
    // holding a dozen photos filled every slot and left the clip nothing — the
    // most valuable file discarded by arrival order.
    for (const clip of clips) await addVideo([clip]);
    if (stills.length) await addPhotos(stills);

    // Anything the browser could name neither. Previously these matched no
    // filter and vanished without a word.
    const skipped = files.length - clips.length - stills.length;
    if (skipped > 0) {
      toast.error(`${skipped} file${skipped > 1 ? 's were' : ' was'} not a photo or video and could not be read.`);
    }
  }, [addPhotos, addVideo]);

  // Deliveries from the job folder land through the same handler a folder pick
  // uses, so stills and clips are separated the one way rather than two.
  const lastDelivery = useRef(0);
  const [autoRead, setAutoRead] = useState(false);
  useEffect(() => {
    if (!incoming || !incoming.files.length || incoming.n === lastDelivery.current) return;
    lastDelivery.current = incoming.n;
    fromFolder(incoming.files);
    // Sending photos from the job folder is the operator saying "read these".
    // Dropping them in and waiting to be told to read them again is a step that
    // only exists because of how the code is arranged, not because anyone wants
    // it — and it was the reason the assistant had nothing to work from.
    setAutoRead(true);
  }, [incoming, fromFolder]);

  const analyze = useCallback(async () => {
    if (!photos.length) return;

    // Trim from the end rather than failing: four good frames beat a request
    // that bounces because the sixth pushed it over.
    let send = photos;
    while (send.length > 1 && send.reduce((n, p) => n + dataUrlBytes(p), 0) > MAX_PAYLOAD_BYTES) {
      send = send.slice(0, -1);
    }
    if (send.length < photos.length) {
      toast.message(`Sending the first ${send.length} — the rest would not fit in one request.`);
    }

    setBusy('Reading the house');
    setAnalysis(null);
    try {
      const res = await fetch(`${SERVER}/house-capture/analyze`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ images: send, note }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Analysis failed (${res.status}).`);
      setAnalysis(json.analysis);
      onRead?.(json.analysis);

      // Seed the wall and the tear-out flag from what was just read, so the
      // render starts from the analysis instead of a hardcoded guess. Both stay
      // editable — this is a starting point, not a decision.
      const att = json.analysis?.attachment;
      const old = json.analysis?.existingDeck;
      if (old?.present) {
        setReplacing(true);
        setWall(String(old.wallDescription || att?.wallDescription || ''));
        toast.message('There is already a deck here — set up as a replacement.');
      } else if (att?.wallDescription) {
        setWall(String(att.wallDescription));
      }
      toast.success('House read.');
    } catch (err: any) {
      toast.error(err?.message || 'Could not read the house.');
    } finally {
      setBusy(null);
    }
  }, [photos, note, onRead]);

  /**
   * Run the read once the delivered photos have actually landed in state.
   *
   * Split from the delivery effect because `fromFolder` sets state and the new
   * photos are not readable until the next render — firing the read in the same
   * effect would send an empty list. Declared after `analyze` deliberately: a
   * dependency array is evaluated during render, so naming a const from above
   * its declaration throws.
   */
  useEffect(() => {
    if (!autoRead || busy || !photos.length) return;
    setAutoRead(false);
    analyze();
  }, [autoRead, busy, photos, analyze]);

  const applySuggested = useCallback(() => {
    const s = analysis?.suggested;
    if (!s) return;
    const patch: Partial<DeckModel> = {};
    if (Number(s.widthFt) > 0) patch.widthFt = Math.round(Number(s.widthFt) * 2) / 2;
    if (Number(s.depthFt) > 0) patch.depthFt = Math.round(Number(s.depthFt) * 2) / 2;
    if (Number(s.deckHeightFt) > 0) patch.heightFt = Math.round(Number(s.deckHeightFt) * 4) / 4;
    if (typeof s.ledgerAttached === 'boolean') patch.ledgerAttached = s.ledgerAttached;

    if (!Object.keys(patch).length) {
      toast.error('There were no usable numbers in that read.');
      return;
    }
    onApply(patch);
    toast.success('Applied as a starting point — verify on site with a tape.');
  }, [analysis, onApply]);

  const makeRender = useCallback(async () => {
    const photo = photos[renderOn];
    if (!photo) return;

    // Extra views make the render match the real house, but the whole set has
    // to fit in one request. Take as many as fit alongside the primary and drop
    // the rest — a render from four good angles beats a request that bounces.
    const others: string[] = [];
    let budget = MAX_PAYLOAD_BYTES - dataUrlBytes(photo);
    for (const [i, p] of photos.entries()) {
      if (i === renderOn) continue;
      const size = dataUrlBytes(p);
      if (size > budget) continue;
      budget -= size;
      others.push(p);
    }

    setBusy('Rendering the deck onto the photo');
    setRender(null);
    try {
      const res = await fetch(`${SERVER}/house-capture/render`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          photo,
          // Every other photo goes along as reference so the render matches the
          // real house rather than inventing what one angle could not show.
          references: others,
          deck: model,
          house: analysis?.house || {},
          // This used to send `house` alone, so the wall the analysis had
          // already identified never reached the renderer and the prompt fell
          // back to "the wall where the door is" — which is how a deck ended up
          // on the wrong side of the house.
          attachment: {
            wallDescription: analysis?.attachment?.wallDescription || '',
            wallOverride: wall.trim(),
            doorType: analysis?.attachment?.doorType || '',
          },
          existing: {
            replacing,
            widthFt: Number(analysis?.existingDeck?.widthFt) || 0,
            depthFt: Number(analysis?.existingDeck?.depthFt) || 0,
          },
          extra,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Render failed (${res.status}).`);
      setRender({ url: json.url, disclaimer: json.disclaimer });
      toast.success('Render ready.');
    } catch (err: any) {
      toast.error(err?.message || 'The render failed.');
    } finally {
      setBusy(null);
    }
  }, [photos, renderOn, model, analysis, extra, wall, replacing]);

  /**
   * The same deck on the same wall in three finishes, to sit in front of a
   * customer. Everything but the finishes is held still on purpose — a
   * comparison only works if one thing varies.
   */
  const makeLooks = useCallback(async () => {
    const photo = photos[renderOn];
    if (!photo) return;

    const others: string[] = [];
    let budget = MAX_PAYLOAD_BYTES - dataUrlBytes(photo);
    for (const [i, p] of photos.entries()) {
      if (i === renderOn) continue;
      const size = dataUrlBytes(p);
      if (size > budget) continue;
      budget -= size;
      others.push(p);
    }

    // Each look is resolved into a real deck here, so what gets rendered and
    // what would get priced are the same object rather than two descriptions
    // that have to agree.
    const payload = DEFAULT_LOOKS.map(look => {
      const deck = applyLook(model, look);
      return {
        id: look.id,
        name: look.name,
        pitch: look.pitch,
        caption: lookCaption(deck),
        appearance: lookAppearance(deck),
        deck,
      };
    });

    setBusy(`Rendering ${payload.length} looks`);
    setLooks(null);
    try {
      const res = await fetch(`${SERVER}/house-capture/looks`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          photo,
          references: others,
          house: analysis?.house || {},
          attachment: {
            wallDescription: analysis?.attachment?.wallDescription || '',
            wallOverride: wall.trim(),
            doorType: analysis?.attachment?.doorType || '',
          },
          existing: {
            replacing,
            widthFt: Number(analysis?.existingDeck?.widthFt) || 0,
            depthFt: Number(analysis?.existingDeck?.depthFt) || 0,
          },
          extra,
          looks: payload,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || `Looks failed (${res.status}).`);
      setLooks(json.looks || []);
      if (json.failed > 0) {
        toast.error(`${json.rendered} of ${json.rendered + json.failed} looks rendered — the rest failed.`);
      } else {
        toast.success(`${json.rendered} looks ready.`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'The looks failed.');
    } finally {
      setBusy(null);
    }
  }, [photos, renderOn, model, analysis, extra, wall, replacing]);

  /**
   * Take a look. This patches the real deck model, so the 3D view, the drawings
   * and the quote all move with it — which is the whole reason each look is a
   * model patch rather than a description in a prompt.
   */
  /**
   * Put a render in front of the customer.
   *
   * The render lives in private storage behind a signed URL, so the bytes are
   * fetched back and filed as a document against the customer. That keeps one
   * filing route for everything the design centre produces rather than a second
   * path that only images use.
   */
  const [sending, setSending] = useState<string | null>(null);
  const sendToCustomer = useCallback(async (url: string, label: string) => {
    if (!onSendToCustomer) return;
    setSending(url);
    try {
      const blob = await (await fetch(url)).blob();
      const dataUri: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error('That image could not be read back.'));
        r.readAsDataURL(blob);
      });
      await onSendToCustomer(label, dataUri);
    } catch (err: any) {
      toast.error(err?.message || 'Could not send that to the customer.');
    } finally {
      setSending(null);
    }
  }, [onSendToCustomer]);

  const chooseLook = useCallback((look: any) => {
    const d = look?.deck;
    if (!d) return;
    onApply({
      deckingFinish: d.deckingFinish,
      railFinish: d.railFinish,
      deckingDirection: d.deckingDirection,
      widthFt: d.widthFt,
      depthFt: d.depthFt,
      heightFt: d.heightFt,
      stairs: d.stairs,
    });
    toast.success(`"${look.name}" applied — the quote follows the new materials.`);
  }, [onApply]);

  const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';
  const btn = 'flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className={card}>
      <div className="flex items-start justify-between gap-3 mb-1">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Home className="w-4 h-4 text-[#ea580c]" /> The existing house
        </h2>
        {photos.length > 0 && (
          <span className="text-[11px] text-gray-500 shrink-0">{photos.length}/{MAX_PHOTOS}</span>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Photograph or video the wall the deck attaches to. Several angles read far better than one
        — walking the length of the wall while recording gives the parallax that makes heights
        readable at all.
      </p>

      {/* Capture */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <button onClick={() => cameraInput.current?.click()} disabled={!!busy}
          className={btn} style={{ background: '#ea580c', color: '#fff' }}>
          <Camera className="w-4 h-4" /> Camera
        </button>
        <button onClick={() => videoInput.current?.click()} disabled={!!busy}
          className={`${btn} text-white`} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <Video className="w-4 h-4" /> Video
        </button>
        <button onClick={() => photoInput.current?.click()} disabled={!!busy}
          className={`${btn} text-white`} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <Upload className="w-4 h-4" /> Files
        </button>
      </div>
      <div className="mb-3">
        <LocalFolderPicker slot="job-photos" allowVideo limit={MAX_PHOTOS} onPick={fromFolder} />
      </div>

      <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { addPhotos(e.target.files); e.currentTarget.value = ''; }} />
      <input ref={photoInput} type="file" accept="image/*" multiple className="hidden"
        onChange={e => { addPhotos(e.target.files); e.currentTarget.value = ''; }} />
      <input ref={videoInput} type="file" accept="video/*" capture="environment" className="hidden"
        onChange={e => { addVideo(e.target.files); e.currentTarget.value = ''; }} />

      {/* What was captured */}
      {photos.length > 0 && (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
            {photos.map((p, i) => (
              <div key={i} className="relative aspect-[4/3] rounded-lg overflow-hidden border"
                style={{ borderColor: i === renderOn ? '#ea580c' : '#2A2A2A' }}>
                <img src={p} alt={`House ${i + 1}`} className="w-full h-full object-cover"
                  onClick={() => setRenderOn(i)} />
                <button onClick={() => {
                  setPhotos(ps => ps.filter((_, k) => k !== i));
                  setRenderOn(r => (r >= i && r > 0 ? r - 1 : r));
                }}
                  className="absolute top-1 right-1 p-1 rounded-md bg-black/70 text-white"
                  aria-label={`Remove photo ${i + 1}`}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <input value={note} onChange={e => setNote(e.target.value)}
            placeholder="Anything the photos don't show — e.g. slider is off the kitchen, yard drops to the left"
            className="w-full px-3 py-2 mb-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#ea580c]" />

          <button onClick={analyze} disabled={!!busy}
            className={`${btn} w-full`} style={{ background: '#ea580c', color: '#fff' }}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {busy || 'Read the house'}
          </button>
        </>
      )}

      {photos.length === 0 && (
        <p className="flex items-start gap-2 text-xs text-gray-600">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          Nothing captured yet. A video walking past the wall is the single most useful thing to take.
        </p>
      )}

      {/* What it found */}
      {analysis && (
        <div className="mt-4 pt-4 border-t border-[#2A2A2A] space-y-4">
          <div className="flex items-start gap-2 rounded-xl p-3"
            style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.28)' }}>
            <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-200">
              Everything below was read off a photograph. A photograph has no scale, so every
              dimension is an estimate derived from something of known size in the frame. Check
              each one with a tape before it goes on a drawing.
            </p>
          </div>

          {analysis.house && (
            <Section title="The house">
              <Row k="Style" v={analysis.house.style} />
              <Row k="Siding" v={[analysis.house.sidingType, analysis.house.sidingColor].filter(Boolean).join(' · ')}
                swatch={analysis.house.sidingColorHex} />
              <Row k="Trim" v={analysis.house.trimColor} swatch={analysis.house.trimColorHex} />
              <Row k="Foundation" v={analysis.house.foundation} />
            </Section>
          )}

          {analysis.attachment && (
            <Section title="Where it attaches">
              <Row k="Wall" v={analysis.attachment.wallDescription} />
              <Row k="Door" v={analysis.attachment.doorType} />
              <Estimate k="Door sill above grade"
                v={analysis.attachment.sillHeightInches ? `${analysis.attachment.sillHeightInches}"` : '—'}
                ref_={analysis.attachment.sillReference}
                conf={analysis.attachment.sillConfidence} />
              <Estimate k="Ledger run"
                v={analysis.attachment.ledgerRunFeet ? `${analysis.attachment.ledgerRunFeet} ft` : '—'}
                ref_={analysis.attachment.ledgerRunReference}
                conf={analysis.attachment.ledgerRunConfidence} />
              {analysis.attachment.rimJoistNote && (
                <p className="text-xs text-gray-400 pt-1">{analysis.attachment.rimJoistNote}</p>
              )}
            </Section>
          )}

          {Array.isArray(analysis.obstructions) && analysis.obstructions.length > 0 && (
            <Section title="In the way">
              {analysis.obstructions.map((o: any, i: number) => (
                <div key={i} className="text-sm">
                  <span className="text-white font-semibold">{o.item}</span>
                  <span className="text-gray-400"> — {o.where}</span>
                  {o.impact && <p className="text-xs text-gray-500 mt-0.5">{o.impact}</p>}
                </div>
              ))}
            </Section>
          )}

          {analysis.grade && (
            <Section title="The ground">
              <Row k="Slope" v={analysis.grade.slope} />
              {analysis.grade.note && <p className="text-xs text-gray-400">{analysis.grade.note}</p>}
            </Section>
          )}

          {analysis.suggested && (
            <div className="rounded-xl p-3" style={{ background: 'rgba(234,88,12,0.08)', border: '1px solid rgba(234,88,12,0.35)' }}>
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                <Ruler className="w-4 h-4 text-[#ea580c]" /> A starting point
              </h3>
              <div className="grid grid-cols-3 gap-3 mb-2">
                <Big label="Width" value={analysis.suggested.widthFt ? `${analysis.suggested.widthFt}'` : '—'} />
                <Big label="Depth" value={analysis.suggested.depthFt ? `${analysis.suggested.depthFt}'` : '—'} />
                <Big label="Height" value={analysis.suggested.deckHeightFt ? `${analysis.suggested.deckHeightFt}'` : '—'} />
              </div>
              {analysis.suggested.why && <p className="text-xs text-gray-300 mb-3">{analysis.suggested.why}</p>}
              <button onClick={applySuggested} className={`${btn} w-full`}
                style={{ background: '#ea580c', color: '#fff' }}>
                <CheckCircle2 className="w-4 h-4" /> Use these as a starting point
              </button>
              <p className="text-[11px] text-gray-500 mt-2">
                This fills the designer so there is something to work from. It does not make the
                numbers measured — the permit drawings come off whatever you leave in those fields.
              </p>
            </div>
          )}

          {Array.isArray(analysis.cautions) && analysis.cautions.length > 0 && (
            <div className="space-y-1">
              {analysis.cautions.map((t: string, i: number) => (
                <p key={i} className="flex items-start gap-2 text-sm text-yellow-400">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {t}
                </p>
              ))}
            </div>
          )}

          {Array.isArray(analysis.notVisible) && analysis.notVisible.length > 0 && (
            <Section title="Still has to be checked on site">
              {analysis.notVisible.map((t: string, i: number) => (
                <p key={i} className="text-sm text-gray-400">· {t}</p>
              ))}
            </Section>
          )}
        </div>
      )}

      {/* The sales image */}
      {photos.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
            <ImageIcon className="w-4 h-4 text-[#ea580c]" /> Show the deck on their house
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Uses the photo outlined above and the current deck size. Tap another photo to switch.
          </p>

          <input value={extra} onChange={e => setExtra(e.target.value)}
            placeholder="Anything to include — pergola, lighting, bench seating, a particular railing"
            className="w-full px-3 py-2 mb-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#ea580c]" />

          {/*
            Which wall, stated out loud. The renderer used to be handed nothing
            but the siding colour and left to infer placement from "the wall
            where the door is", which put decks on the front of the house. It is
            shown as an editable field rather than a read-only label because the
            person using this is standing in the yard and the photograph is not.
          */}
          <label className="block text-[11px] font-semibold text-gray-400 mb-1">Which wall</label>
          <input value={wall} onChange={e => setWall(e.target.value)}
            placeholder="e.g. the back wall with the slider, facing the garden"
            className="w-full px-3 py-2 mb-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#ea580c]" />
          {!wall.trim() && (
            <p className="text-[11px] text-amber-500/80 mb-2">
              No wall set — the render will have to guess, and it usually guesses the front door.
            </p>
          )}

          <label className="flex items-center gap-2 mb-3 cursor-pointer select-none">
            <input type="checkbox" checked={replacing} onChange={e => setReplacing(e.target.checked)}
              className="w-4 h-4 accent-[#ea580c]" />
            <span className="text-xs text-gray-300">
              Replacing an existing deck — tear the old one out and build in its place
            </span>
          </label>

          <button onClick={makeRender} disabled={!!busy} className={`${btn} w-full text-white`}
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {busy || `Render a ${model.widthFt}' × ${model.depthFt}' deck onto this photo`}
          </button>

          {/*
            Deliberately a second, separate button. Three looks is three image
            calls, so it costs about three times a single render — that is a
            decision to make on purpose, not something the ordinary button
            should quietly do.
          */}
          <button onClick={makeLooks} disabled={!!busy} className={`${btn} w-full text-white mt-2`}
            style={{ background: 'rgba(234,88,32,0.14)', border: '1px solid rgba(234,88,32,0.35)' }}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-[#ea580c]" />}
            {busy || `Show ${DEFAULT_LOOKS.length} looks to choose from`}
          </button>
          <p className="text-[11px] text-gray-600 mt-1 mb-1">
            Same deck, same wall, {DEFAULT_LOOKS.length} sets of materials — {DEFAULT_LOOKS.length} renders.
          </p>

          {looks && looks.length > 0 && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {looks.map((l: any) => (
                <div key={l.id} className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] overflow-hidden flex flex-col">
                  {l.url ? (
                    <img src={l.url} alt={l.name} className="w-full aspect-[3/2] object-cover" />
                  ) : (
                    <div className="w-full aspect-[3/2] flex items-center justify-center px-3 text-center">
                      <span className="text-[11px] text-red-400">{l.error || 'This one did not render.'}</span>
                    </div>
                  )}
                  <div className="p-3 flex flex-col gap-1 grow">
                    <p className="text-xs font-bold text-white">{l.name}</p>
                    <p className="text-[11px] text-gray-500">{l.pitch}</p>
                    <p className="text-[11px] text-gray-400 mt-1">{l.caption}</p>
                    {l.url && (
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => chooseLook(l)}
                          className="flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold text-white"
                          style={{ background: '#ea580c' }}>
                          Use this one
                        </button>
                        {onSendToCustomer && (
                          <button onClick={() => sendToCustomer(l.url, `${l.name} — ${l.caption}`)}
                            disabled={sending === l.url} title="Send this look to the customer"
                            className="px-2 py-1.5 rounded-lg text-[11px] font-semibold text-white flex items-center disabled:opacity-50"
                            style={{ background: 'rgba(234,88,12,0.2)', border: '1px solid rgba(234,88,12,0.4)' }}>
                            {sending === l.url ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <a href={l.url} download={`${(site.projectName || 'deck').replace(/[^\w-]+/g, '-')}-${l.id}-not-to-scale.png`}
                          target="_blank" rel="noreferrer"
                          className="px-2 py-1.5 rounded-lg text-[11px] font-semibold text-white flex items-center"
                          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {render && (
            <div className="mt-3">
              <img src={render.url} alt="The proposed deck on the house"
                className="w-full rounded-xl border border-[#2A2A2A]" />
              <div className="flex items-center justify-between gap-3 mt-2">
                <p className="text-[11px] text-gray-500">{render.disclaimer}</p>
                <div className="shrink-0 flex items-center gap-2">
                  {onSendToCustomer && (
                    <button onClick={() => sendToCustomer(render.url, 'Deck concept on your house')}
                      disabled={sending === render.url}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                      style={{ background: '#ea580c' }}>
                      {sending === render.url ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {customerName ? `Send to ${customerName.split(' ')[0]}` : 'Send to customer'}
                    </button>
                  )}
                  <a href={render.url} download={`${(site.projectName || 'deck').replace(/[^\w-]+/g, '-')}-concept-not-to-scale.png`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-white"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                    <Download className="w-4 h-4" /> Save
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <div>
      <h3 className="text-xs uppercase tracking-wide text-gray-500 mb-1.5">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ k, v, swatch }: { k: string; v?: string; swatch?: string }) {
  if (!v) return null;
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-gray-400 shrink-0">{k}</span>
      <span className="text-white font-semibold text-right flex items-center gap-2">
        {swatch && /^#[0-9a-f]{6}$/i.test(swatch) && (
          <span className="w-3.5 h-3.5 rounded-sm border border-white/20 shrink-0" style={{ background: swatch }} />
        )}
        {v}
      </span>
    </div>
  );
}

/**
 * A dimension that came out of a photograph, shown with what produced it.
 *
 * The reference and the confidence are not decoration — they are the difference
 * between a number someone sanity-checks and a number someone builds to.
 */
function Estimate({ k, v, ref_, conf }: { k: string; v: string; ref_?: string; conf?: Confidence }) {
  const tone = conf === 'high' ? '#4ade80' : conf === 'medium' ? '#facc15' : '#f87171';
  return (
    <div className="text-sm">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-gray-400 shrink-0">{k}</span>
        <span className="text-right flex items-center gap-2">
          <span className="text-white font-semibold tabular-nums">{v}</span>
          {conf && (
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded"
              style={{ color: tone, background: `${tone}1a`, border: `1px solid ${tone}55` }}>
              {conf}
            </span>
          )}
        </span>
      </div>
      {ref_ && <p className="text-[11px] text-gray-600 mt-0.5">scaled from {ref_}</p>}
    </div>
  );
}

function Big({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-2xl font-black text-white tabular-nums">{value}</div>
    </div>
  );
}
