/**
 * Align the model to the photograph, then pay for one render.
 *
 * THE WHOLE POINT, IN ONE SENTENCE
 *
 * The picture is generated FROM the model, so it cannot get the size or the
 * position wrong — it is not deciding them.
 *
 * The old way described a deck in words and asked for a picture of one, which
 * is why the deck kept landing on a different wall every time. Words cannot
 * measure sixteen feet and they cannot point at a wall.
 *
 * HOW IT RUNS
 *
 *   1. The photograph sits behind the 3D view at half opacity. Orbit until the
 *      house edges line up. Done by hand because recovering a camera from one
 *      photo is a research problem and this is a thirty-second judgement for
 *      somebody already looking at both.
 *   2. Capture the deck alone, on transparency.
 *   3. Composite it onto the photograph. It will look like a drawing pasted on
 *      a photo, because that is exactly what it is.
 *   4. One paid pass, masked to the deck's own silhouette, told to change no
 *      shape and no position — only to make it photographic.
 *
 * The composite is kept and shown beside the finished render, so what the paid
 * step actually changed is visible rather than taken on trust. If the model
 * moves something inside the mask, that comparison is how anyone finds out —
 * rather than a customer noticing.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Camera, Loader2, Wand2, AlertTriangle, Check, Layers, RefreshCw, Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { projectId as supabaseProjectId } from '../utils/supabase/info';
import {
  type AlignedCamera, type PipelineState,
  maskFromAlpha, coverageOf, pipelineIssues, pipelineNote, canRender,
  photorealPrompt, cameraMatchesPhoto,
} from '../lib/renderPipeline';

const SERVER = `https://${supabaseProjectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';
const tiny = 'px-2 py-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-xs focus:outline-none focus:border-[#ea580c]';

/** A short stable key for a photo, so a camera can be tied to the one it fits. */
function keyForPhoto(dataUrl: string): string {
  if (!dataUrl) return '';
  let h = 0;
  // Sampled rather than hashed in full — these are megabytes and this only has
  // to tell one photograph from another, not resist anybody.
  for (let i = 0; i < dataUrl.length; i += 997) h = (h * 31 + dataUrl.charCodeAt(i)) | 0;
  return `p${(h >>> 0).toString(36)}_${dataUrl.length}`;
}

export default function AlignAndRender({
  photo, capture, camera, onCameraChange, children,
}: {
  /** The house photograph, as a data URL. */
  photo?: string;
  /** Captures the deck alone on transparency, from the live 3D view. */
  capture?: () => string | null;
  camera: AlignedCamera | null;
  onCameraChange: (c: AlignedCamera) => void;
  /** The 3D view, mounted by the caller so this does not own the renderer. */
  children?: React.ReactNode;
}) {
  const [opacity, setOpacity] = useState(0.5);
  const [deckPng, setDeckPng] = useState<string | null>(null);
  const [composite, setComposite] = useState<string | null>(null);
  const [mask, setMask] = useState<string | null>(null);
  const [coverage, setCoverage] = useState(0);
  const [rendered, setRendered] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [material, setMaterial] = useState('');
  const [railing, setRailing] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('');
  const [extra, setExtra] = useState('');

  const photoKey = useMemo(() => keyForPhoto(photo || ''), [photo]);
  const state: PipelineState = {
    hasPhoto: Boolean(photo),
    hasCapture: Boolean(deckPng),
    camera,
    photoKey,
    coverage,
  };
  const issues = pipelineIssues(state);
  const blocking = issues.filter(i => i.severity === 'blocking');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const load = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That image could not be read.'));
    img.src = src;
  });

  /**
   * Capture the deck, composite it, and derive the mask — one step, because
   * they are one thought and doing them separately invites a stale mask.
   */
  const build = useCallback(async () => {
    if (!photo) { toast.error('Pick a photo of the house first.'); return; }
    if (!capture) { toast.error('The 3D view is not ready.'); return; }
    setBusy('Capturing');
    try {
      const png = capture();
      if (!png) { toast.error('The 3D view could not be captured.'); return; }
      setDeckPng(png);

      const [bg, deck] = await Promise.all([load(photo), load(png)]);

      // The photograph sets the frame. The capture is drawn to fill it, which
      // is correct because the alignment was done against this same photo at
      // this same aspect — the two views are already the same window.
      const w = bg.naturalWidth;
      const h = bg.naturalHeight;
      const canvas = canvasRef.current || document.createElement('canvas');
      canvasRef.current = canvas;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) { toast.error('The canvas could not be opened.'); return; }

      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(bg, 0, 0, w, h);
      ctx.drawImage(deck, 0, 0, w, h);
      setComposite(canvas.toDataURL('image/png'));

      // The mask comes from the deck's own alpha — its exact silhouette, grown
      // a little so the model has room to blend an edge and lay a shadow.
      const alphaCanvas = document.createElement('canvas');
      alphaCanvas.width = w;
      alphaCanvas.height = h;
      const actx = alphaCanvas.getContext('2d', { willReadFrequently: true });
      if (!actx) { toast.error('The canvas could not be opened.'); return; }
      actx.clearRect(0, 0, w, h);
      actx.drawImage(deck, 0, 0, w, h);
      const px = actx.getImageData(0, 0, w, h).data;

      const alpha = new Uint8ClampedArray(w * h);
      for (let i = 0; i < w * h; i++) alpha[i] = px[i * 4 + 3];
      setCoverage(coverageOf(alpha));

      const maskPx = maskFromAlpha(alpha, w, h, Math.max(4, Math.round(Math.min(w, h) / 200)));
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = w;
      maskCanvas.height = h;
      const mctx = maskCanvas.getContext('2d');
      if (!mctx) { toast.error('The canvas could not be opened.'); return; }
      mctx.putImageData(new ImageData(maskPx, w, h), 0, 0);
      setMask(maskCanvas.toDataURL('image/png'));

      setRendered(null);
      toast.success('Composited. The geometry in this is the model, not a guess.');
    } catch (err: any) {
      toast.error(err?.message || 'That could not be composited.');
    } finally {
      setBusy(null);
    }
  }, [photo, capture]);

  const render = useCallback(async () => {
    if (!composite || !mask) { toast.error('Composite it first.'); return; }
    if (!canRender(state)) { toast.error(blocking[0]?.message || 'Not ready to render.'); return; }
    setBusy('Rendering');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SERVER}/house-capture/photoreal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ composite, mask, material, railing, timeOfDay, extra }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { toast.error(data?.error || 'The render failed.'); return; }
      setRendered(data.url);
      toast.success('Rendered. Compare it against the composite before you send it.');
    } catch (err: any) {
      toast.error(err?.message || 'The render failed.');
    } finally {
      setBusy(null);
    }
  }, [composite, mask, state, blocking, material, railing, timeOfDay, extra]);

  const markAligned = () => {
    onCameraChange({
      ...(camera || {
        azimuthDeg: 35, elevationDeg: 18, distanceFt: 40,
        targetX: 0, targetY: 2, targetZ: 0, fovDeg: 45,
      }),
      photoKey,
      alignedOn: new Date().toISOString().slice(0, 10),
    });
    toast.success('Alignment saved against this photo. It will not need doing again.');
  };

  const aligned = cameraMatchesPhoto(camera, photoKey);

  return (
    <div className="space-y-4">
      <div className={card}>
        <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#ea580c]" /> Align, then render once
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          The picture is generated from the model, so it cannot put the deck in the wrong place
          or at the wrong size — it is not choosing them. Orbit until the house lines up, then
          pay for one pass.
        </p>

        {/* The photo behind the live 3D view. Half opacity by default because
            that is where both sets of edges are readable at once. */}
        {photo && (
          <>
            <div className="relative rounded-xl overflow-hidden border border-[#2A2A2A] mb-2"
              style={{ background: '#000' }}>
              <img src={photo} alt="" className="w-full block" style={{ opacity: 1 }} />
              <div className="absolute inset-0" style={{ opacity }}>
                {children}
              </div>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] text-gray-500 shrink-0">Model over photo</span>
              <input type="range" min={0} max={1} step={0.05} value={opacity}
                onChange={e => setOpacity(Number(e.target.value))}
                className="flex-1 accent-[#ea580c]" />
              <span className="text-[11px] text-gray-500 w-10 text-right">
                {Math.round(opacity * 100)}%
              </span>
              <button onClick={markAligned}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border shrink-0 ${
                  aligned
                    ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
                    : 'border-[#ea580c] text-white bg-[#ea580c]/15'}`}>
                {aligned ? <><Check className="w-3 h-3 inline mr-1" />Aligned</> : 'It lines up — save'}
              </button>
            </div>
          </>
        )}

        <div className="flex flex-wrap gap-1.5">
          <button onClick={build} disabled={!!busy || !photo}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
            {busy === 'Capturing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
            Capture and composite
          </button>
          {composite && (
            <button onClick={build} disabled={!!busy}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-[#2A2A2A] text-gray-400 hover:text-white flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Re-capture after a change
            </button>
          )}
        </div>
      </div>

      {/* ── what is wrong before the money goes ── */}
      {composite && issues.length > 0 && (
        <div className={card}>
          <p className={`text-xs ${blocking.length ? 'text-red-300' : 'text-amber-200/85'}`}>
            {pipelineNote(state)}
          </p>
          {issues.length > 1 && (
            <ul className="mt-2 space-y-1">
              {issues.slice(1).map((i, n) => (
                <li key={n} className={`text-[11px] flex items-start gap-1.5 ${
                  i.severity === 'blocking' ? 'text-red-300' : 'text-amber-200/80'}`}>
                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />{i.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── the paid pass ── */}
      {composite && (
        <div className={card}>
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-[#ea580c]" /> The one paid pass
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Masked to the deck's own silhouette, so the house cannot be repainted. The
            instruction forbids changing any shape or position — only material, light and shadow.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
            <input value={material} onChange={e => setMaterial(e.target.value)}
              placeholder="Decking material" className={tiny} />
            <input value={railing} onChange={e => setRailing(e.target.value)}
              placeholder="Railing" className={tiny} />
            <input value={timeOfDay} onChange={e => setTimeOfDay(e.target.value)}
              placeholder="Light, e.g. late afternoon" className={tiny} />
            <input value={extra} onChange={e => setExtra(e.target.value)}
              placeholder="Anything else" className={tiny} />
          </div>
          <button onClick={render} disabled={!!busy || blocking.length > 0}
            className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: '#ea580c' }}>
            {busy === 'Rendering' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {busy === 'Rendering' ? 'Rendering…' : 'Make it photographic'}
          </button>
          <details className="mt-2">
            <summary className="text-[10px] text-gray-600 cursor-pointer">What it will be told</summary>
            <pre className="text-[10px] text-gray-500 whitespace-pre-wrap mt-1">
              {photorealPrompt({ material, railing, timeOfDay, extra })}
            </pre>
          </details>
        </div>
      )}

      {/* ── before and after ──
          Kept side by side on purpose. If the model moved something inside the
          mask this is how it gets caught here rather than by a customer. */}
      {composite && (
        <div className={card}>
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#ea580c]" /> What the paid step changed
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            The left is the model composited onto the photograph — the geometry is exact. If
            anything on the right sits differently, the render moved it and should not be sent.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <figure className="m-0">
              <img src={composite} alt="Composite from the model"
                className="w-full rounded-xl border border-[#2A2A2A]" />
              <figcaption className="text-[10px] text-gray-600 mt-1">
                From the model · exact geometry
              </figcaption>
            </figure>
            <figure className="m-0">
              {rendered ? (
                <>
                  <img src={rendered} alt="Photoreal render"
                    className="w-full rounded-xl border border-[#2A2A2A]" />
                  <figcaption className="text-[10px] text-gray-600 mt-1">
                    After the paid pass · lighting and material only
                  </figcaption>
                </>
              ) : (
                <div className="w-full h-full min-h-[120px] rounded-xl border border-dashed border-[#2A2A2A] flex items-center justify-center">
                  <span className="text-[11px] text-gray-600">Not rendered yet</span>
                </div>
              )}
            </figure>
          </div>
        </div>
      )}
    </div>
  );
}
