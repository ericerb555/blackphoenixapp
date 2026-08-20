/**
 * ReelRenderer — turns a storyboard into a video worth posting.
 *
 * The Content Studio writes the script; /content-studio/reel/storyboard
 * resolves every beat into a picture, a caption and a narration track. This is
 * the last stage: draw those beats and record them.
 *
 * Everything happens in the browser — no frames uploaded, no render service.
 *
 * The choices here are what separate a reel from a slideshow with words on it:
 * captions land word by word in time with the narration, stills drift rather
 * than sit, and beats cross-dissolve instead of blinking through black. Those
 * are the tells a viewer reads as "made" versus "generated", and they cost
 * almost nothing to get right.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Loader2, Square, AlertTriangle, Film, Settings2 } from 'lucide-react';

export interface ReelSlide {
  id: string;
  order: number;
  label: string;
  url: string;
  /**
   * Whether this beat is a photograph or a moving clip.
   *
   * Optional, and inferred from the file extension when absent, so every
   * existing storyboard keeps working untouched.
   */
  mediaType?: 'image' | 'video';
  visualSource: 'supplied' | 'generated' | 'none';
  caption: string;
  voiceover: string;
  audioUrl: string | null;
  duration: number;
  effect: 'ken-burns-in' | 'ken-burns-out' | string;
  transition: 'fade' | 'none' | string;
  transitionDuration: number;
}

export interface ReelStoryboard {
  width: number;
  height: number;
  totalSeconds: number;
  slides: ReelSlide[];
}

const FPS = 30;
const DISSOLVE = 0.4; // seconds of overlap between beats

/**
 * Vertical video's usable area. TikTok, Reels and Shorts all lay their own
 * controls over the frame; text outside this band gets covered by a caption
 * field, a follow button or a progress bar depending on the app.
 */
const SAFE_TOP = 0.14;
const SAFE_BOTTOM = 0.78;

function pickMimeType(): { mimeType: string; ext: string } | null {
  // VP9 first: markedly better detail per bit than VP8 at the bitrates a reel
  // needs, and text edges are exactly where weak compression shows.
  const candidates: Array<[string, string]> = [
    ['video/webm;codecs=vp9,opus', 'webm'],
    ['video/webm;codecs=vp8,opus', 'webm'],
    ['video/mp4;codecs=h264,aac', 'mp4'],
    ['video/webm', 'webm'],
  ];
  for (const [mimeType, ext] of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mimeType)) {
      return { mimeType, ext };
    }
  }
  return null;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // The storyboard re-hosts supplier images onto our own storage so this
    // succeeds; without it the canvas is tainted and captureStream throws.
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load image: ${url.slice(0, 80)}`));
    img.src = url;
  });
}

/** True when a URL points at a moving clip rather than a photograph. */
function isVideoUrl(url: string, declared?: 'image' | 'video'): boolean {
  if (declared) return declared === 'video';
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url);
}

/**
 * A clip, loaded and ready to draw from.
 *
 * Muted and inline because a browser will refuse to play it otherwise, and
 * because the reel's audio is its own track — a clip arriving with sound would
 * fight the voiceover.
 *
 * It is played rather than seeked frame by frame. The recorder captures in real
 * time against the wall clock, and so does playback, so the two stay together;
 * seeking per frame would stall on every draw and drop frames the recorder has
 * already sampled.
 */
function loadVideo(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.loop = true; // a clip shorter than its beat should carry on, not freeze
    const done = () => resolve(video);
    video.onloadeddata = done;
    video.oncanplaythrough = done;
    video.onerror = () => reject(new Error(`Could not load clip: ${url.slice(0, 80)}`));
    video.src = url;
  });
}

type Visual = HTMLImageElement | HTMLVideoElement;

const isVideoEl = (m: Visual): m is HTMLVideoElement => 'videoWidth' in m;

/** Natural size, which lives under different names on the two element types. */
function naturalSize(m: Visual): { w: number; h: number } {
  return isVideoEl(m)
    ? { w: m.videoWidth || 1080, h: m.videoHeight || 1920 }
    : { w: m.width || 1080, h: m.height || 1920 };
}

/** Ease-in-out — linear motion is the thing that reads as "computer did this". */
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/**
 * A clip, cover-fitted, with a barely-there push in.
 *
 * Deliberately NOT Ken Burns. A photograph needs invented movement or it reads
 * as a slideshow; a clip already moves, and panning across it fights whatever
 * the footage is doing — that combination is the clearest amateur tell in
 * short-form video. A 2% push over the beat keeps it from feeling locked off
 * without arguing with the shot.
 */
function drawClip(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  w: number,
  h: number,
  progress: number,
) {
  const t = ease(Math.max(0, Math.min(1, progress)));
  const zoom = 1 + 0.02 * t;
  const { w: nw, h: nh } = naturalSize(video);
  const ar = nw / nh;
  const target = w / h;
  const dw = (ar > target ? h * ar : w) * zoom;
  const dh = (ar > target ? h : w / ar) * zoom;
  ctx.drawImage(video, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

/**
 * Cover-fit with a slow drift. Real Ken Burns moves the frame as well as
 * scaling it; zoom alone looks like a stuck lens. The pan direction is derived
 * from the slide index so consecutive beats never drift the same way.
 */
function drawKenBurns(
  ctx: CanvasRenderingContext2D,
  img: Visual,
  w: number,
  h: number,
  progress: number,
  index: number,
  zoomIn: boolean,
) {
  const t = ease(Math.max(0, Math.min(1, progress)));
  const zoom = zoomIn ? 1.04 + 0.10 * t : 1.14 - 0.10 * t;

  const { w: nw, h: nh } = naturalSize(img);
  const ar = nw / nh;
  const target = w / h;
  let dw = ar > target ? h * ar : w;
  let dh = ar > target ? h : w / ar;
  dw *= zoom;
  dh *= zoom;

  // Only pan as far as the overflow allows, so the frame never shows an edge.
  const slackX = Math.max(0, dw - w) / 2;
  const slackY = Math.max(0, dh - h) / 2;
  const dirX = [1, -1, 1, -1][index % 4];
  const dirY = [1, 1, -1, -1][index % 4];
  const panX = dirX * slackX * 0.5 * (t - 0.5) * 2;
  const panY = dirY * slackY * 0.3 * (t - 0.5) * 2;

  ctx.drawImage(img, (w - dw) / 2 + panX, (h - dh) / 2 + panY, dw, dh);
}

/**
 * Start a clip at its head the first time its beat comes up.
 *
 * Called every frame but acts once per beat, because rewinding a playing clip on
 * each draw would freeze it on frame one for the whole beat.
 */
function rollClip(media: Visual | undefined, started: Set<number>, index: number) {
  if (!media || !isVideoEl(media) || started.has(index)) return;
  started.add(index);
  try {
    media.currentTime = 0;
    void media.play().catch(() => {}); // muted autoplay is allowed; ignore races
  } catch {
    /* a clip that will not play is drawn as its poster frame, not a hard stop */
  }
}

/**
 * Draw a beat, treated according to what it actually is.
 *
 * The whole reason both paths exist: a still gets invented motion, a clip keeps
 * its own. Everything downstream — dissolves, grade, captions — is identical
 * either way, so the two only differ here.
 */
function drawVisual(
  ctx: CanvasRenderingContext2D,
  media: Visual,
  w: number,
  h: number,
  progress: number,
  index: number,
  zoomIn: boolean,
) {
  if (isVideoEl(media)) {
    // A clip that has not decoded its first frame yet would draw nothing and
    // leave a black hole in the middle of the reel; skip it rather than flash.
    if (media.readyState >= 2) drawClip(ctx, media, w, h, progress);
    return;
  }
  drawKenBurns(ctx, media, w, h, progress, index, zoomIn);
}

/**
 * A vignette and a slight lift in contrast. Supplier photography is shot on
 * many different days under many different lights; a shared grade is what makes
 * six of them read as one video rather than six pictures in a row.
 */
function grade(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const g = ctx.createRadialGradient(w / 2, h * 0.45, h * 0.22, w / 2, h * 0.5, h * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

interface Word { text: string; at: number }

/** Spread a caption's words across the beat so they can land in time. */
function timeWords(caption: string, duration: number): Word[] {
  const words = caption.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  // Land them across the first 55% of the beat: the line needs to be complete
  // and readable well before the picture changes.
  const window = duration * 0.55;
  const per = window / words.length;
  return words.map((text, i) => ({ text, at: i * per }));
}

/**
 * Burned captions, revealed word by word.
 *
 * This is the loudest signal that a reel was made rather than assembled. Words
 * appearing in time with the voice hold attention through the first seconds,
 * which is the whole game — and most viewers watch muted, so the words are also
 * the only script they get.
 */
function drawCaption(
  ctx: CanvasRenderingContext2D,
  words: Word[],
  elapsed: number,
  w: number,
  h: number,
) {
  if (!words.length) return;

  const fontSize = Math.round(w * 0.075);
  const lineHeight = fontSize * 1.14;
  const font = `900 ${fontSize}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const visible = words.filter((word) => elapsed >= word.at);
  if (!visible.length) return;

  // Wrap on the full caption, not the visible part, so the block does not
  // reflow as words arrive — a line jumping mid-reveal looks broken.
  const maxWidth = w * 0.84;
  const lines: Word[][] = [];
  let line: Word[] = [];
  for (const word of words) {
    const test = [...line, word].map((x) => x.text).join(' ');
    if (ctx.measureText(test).width > maxWidth && line.length) {
      lines.push(line);
      line = [word];
    } else {
      line.push(word);
    }
  }
  if (line.length) lines.push(line);

  const blockH = lines.length * lineHeight;
  const bottom = h * SAFE_BOTTOM;
  const top = bottom - blockH;

  lines.forEach((lineWords, li) => {
    const shown = lineWords.filter((word) => elapsed >= word.at);
    if (!shown.length) return;

    const y = top + lineHeight * li + lineHeight / 2;
    const full = lineWords.map((x) => x.text).join(' ');
    const startX = w / 2 - ctx.measureText(full).width / 2;

    let x = startX;
    for (const word of lineWords) {
      const wordW = ctx.measureText(`${word.text} `).width;
      if (elapsed < word.at) { x += wordW; continue; }

      // A brief scale-up as each word lands, then settle.
      const age = elapsed - word.at;
      const pop = age < 0.16 ? 1 + 0.22 * (1 - age / 0.16) : 1;
      const cx = x + ctx.measureText(word.text).width / 2;

      ctx.save();
      ctx.translate(cx, y);
      ctx.scale(pop, pop);

      // Outline rather than a box: it keeps the words legible over any
      // photograph without hiding the product behind a slab.
      ctx.lineWidth = Math.max(6, fontSize * 0.16);
      ctx.strokeStyle = 'rgba(0,0,0,0.92)';
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;
      ctx.font = font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText(word.text, 0, 0);

      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = fontSize * 0.22;
      ctx.fillStyle = age < 0.16 ? '#ffe9c7' : '#ffffff';
      ctx.fillText(word.text, 0, 0);
      ctx.restore();

      x += wordW;
    }
  });
}

export default function ReelRenderer({
  storyboard,
  filename = 'reel',
}: {
  storyboard: ReelStoryboard;
  filename?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cancelRef = useRef(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'rendering' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [ext, setExt] = useState('webm');
  const [quality, setQuality] = useState<'high' | 'max'>('high');

  const { width, height, slides } = storyboard;
  const renderable = slides.filter((s) => s.url);
  const skipped = slides.length - renderable.length;

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  const render = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const codec = pickMimeType();
    if (!codec) {
      setError('This browser cannot record video. Chrome or Firefox will work.');
      setStatus('error');
      return;
    }
    setExt(codec.ext);

    cancelRef.current = false;
    setError(null);
    setVideoUrl(null);
    setStatus('loading');
    setProgress(0);

    let audioCtx: AudioContext | null = null;
    // Every clip opened for this render, so the teardown can stop them. They
    // loop by design, so one left running keeps decoding for the life of the tab.
    const clips: HTMLVideoElement[] = [];

    try {
      // Decode everything before recording. Decoding mid-record drops frames,
      // and a missing image should stop the run before recording rather than
      // halfway through.
      // Photographs and clips load differently, so each beat loads what it is.
      const visuals: Visual[] = await Promise.all(
        renderable.map((s) => (isVideoUrl(s.url, s.mediaType) ? loadVideo(s.url) : loadImage(s.url))),
      );
      for (const v of visuals) if (isVideoEl(v)) clips.push(v);
      const captions = renderable.map((s) => timeWords(s.caption, s.duration));

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error('Could not get a 2D canvas context.');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const stream = canvas.captureStream(FPS);

      // Narration is one mixed track scheduled against the beat timings, so
      // each voice clip stays with the picture it belongs to.
      const starts: number[] = [];
      let clock = 0;
      for (const s of renderable) { starts.push(clock); clock += s.duration; }

      const scheduled: { node: AudioBufferSourceNode; at: number }[] = [];
      if (renderable.some((s) => s.audioUrl)) {
        audioCtx = new AudioContext();
        const dest = audioCtx.createMediaStreamDestination();

        // TTS clips come back at inconsistent levels. A compressor keeps the
        // quiet ones audible over a phone speaker without the loud ones
        // clipping, which is the difference between "narrated" and "amateur".
        const comp = audioCtx.createDynamicsCompressor();
        comp.threshold.value = -20;
        comp.ratio.value = 4;
        comp.attack.value = 0.004;
        comp.release.value = 0.2;
        const gain = audioCtx.createGain();
        gain.gain.value = 1.25;
        comp.connect(gain).connect(dest);

        for (let i = 0; i < renderable.length; i++) {
          const s = renderable[i];
          if (!s.audioUrl) continue;
          try {
            const buf = await fetch(s.audioUrl).then((r) => r.arrayBuffer());
            const decoded = await audioCtx.decodeAudioData(buf);
            const node = audioCtx.createBufferSource();
            node.buffer = decoded;
            node.connect(comp);
            scheduled.push({ node, at: starts[i] });
          } catch {
            // A beat without narration is still a beat — keep its picture.
          }
        }
        dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
      }

      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(stream, {
        mimeType: codec.mimeType,
        // Vertical 1080 with moving text needs real headroom; text edges are
        // the first thing to smear when the encoder is starved.
        videoBitsPerSecond: quality === 'max' ? 16_000_000 : 10_000_000,
        audioBitsPerSecond: 192_000,
      });
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      const finished = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: codec.mimeType }));
      });

      setStatus('rendering');
      recorder.start();

      const startedAt = performance.now();
      if (audioCtx) {
        // A beat of lead-in so the first word is not clipped by the recorder
        // still spinning up.
        const base = audioCtx.currentTime + 0.12;
        for (const s of scheduled) s.node.start(base + s.at);
      }

      const totalMs = clock * 1000;
      let lastDrawn = -1;
      const started = new Set<number>();

      await new Promise<void>((resolve) => {
        const frame = () => {
          if (cancelRef.current) { resolve(); return; }

          // Wall clock, not a frame counter — the audio is running on its own
          // clock and the picture has to follow it, not the other way round.
          const elapsed = performance.now() - startedAt;
          if (elapsed >= totalMs) { resolve(); return; }

          // Displays run at 60 or 120Hz; drawing more often than the recorder
          // samples just burns CPU and risks dropping real frames.
          const slot = Math.floor((elapsed / 1000) * FPS);
          if (slot === lastDrawn) { requestAnimationFrame(frame); return; }
          lastDrawn = slot;

          const now = elapsed / 1000;
          let index = renderable.length - 1;
          for (let i = 0; i < renderable.length; i++) {
            if (now < starts[i] + renderable[i].duration) { index = i; break; }
          }

          const slide = renderable[index];
          const local = now - starts[index];
          const p = local / slide.duration;

          // Clips run on their own clock. Rewind one to its head the first time
          // its beat comes up, then leave it playing — the recorder samples in
          // real time and so does playback, so they stay together without any
          // per-frame seeking. Beats that are stills no-op here.
          rollClip(visuals[index], started, index);
          // The next beat is already on screen during a cross-dissolve, so it
          // has to be moving by then, not starting when the dissolve finishes.
          if (slide.duration - local < DISSOLVE) {
            rollClip(visuals[index + 1], started, index + 1);
          }

          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, width, height);

          drawVisual(ctx, visuals[index], width, height, p, index, slide.effect !== 'ken-burns-out');

          // A true cross-dissolve into the next beat. Dipping through black
          // reads as a fault; two pictures overlapping reads as an edit.
          const remaining = slide.duration - local;
          const next = renderable[index + 1];
          if (next && remaining < DISSOLVE) {
            const alpha = 1 - remaining / DISSOLVE;
            ctx.save();
            ctx.globalAlpha = ease(alpha);
            drawVisual(
              ctx, visuals[index + 1], width, height,
              0, index + 1, next.effect !== 'ken-burns-out',
            );
            ctx.restore();
          }

          grade(ctx, width, height);
          drawCaption(ctx, captions[index], local, width, height);

          setProgress(Math.min(99, Math.round((elapsed / totalMs) * 100)));
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });

      recorder.stop();
      const blob = await finished;

      setVideoUrl(URL.createObjectURL(blob));
      setProgress(100);
      setStatus(cancelRef.current ? 'idle' : 'done');
    } catch (err: any) {
      console.error('[ReelRenderer]', err);
      setError(err?.message || 'Rendering failed.');
      setStatus('error');
    } finally {
      // Always tear the audio graph down — an AudioContext left open holds the
      // device's audio hardware awake for the life of the tab.
      if (audioCtx) await audioCtx.close().catch(() => {});
      for (const v of clips) { try { v.pause(); v.removeAttribute('src'); v.load(); } catch { /* already gone */ } }
    }
  }, [renderable, width, height, quality]);

  const busy = status === 'loading' || status === 'rendering';
  const seconds = Math.round(renderable.reduce((n, s) => n + s.duration, 0));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={busy ? () => { cancelRef.current = true; } : render}
          disabled={renderable.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
          style={{ background: busy ? 'rgba(220,38,38,0.9)' : 'linear-gradient(135deg,#7c3aed,#ea580c)' }}
        >
          {busy ? <Square className="w-4 h-4" /> : <Film className="w-4 h-4" />}
          {busy ? 'Stop' : 'Render reel'}
        </button>

        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Settings2 className="w-3.5 h-3.5" />
          {(['high', 'max'] as const).map((q) => (
            <button
              key={q}
              onClick={() => setQuality(q)}
              disabled={busy}
              className={`px-2.5 py-1 rounded-lg font-semibold transition disabled:opacity-40 ${
                quality === q ? 'bg-[#ea580c] text-white' : 'bg-[#0A0A0A] border border-[#2A2A2A] text-gray-400'
              }`}
            >
              {q === 'high' ? '10 Mbps' : '16 Mbps'}
            </button>
          ))}
        </div>

        {busy && (
          <span className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            {status === 'loading' ? 'Decoding media…' : `Recording ${progress}%`}
          </span>
        )}

        {videoUrl && (
          <a
            href={videoUrl}
            download={`${filename}.${ext}`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: 'rgba(22,163,74,0.9)' }}
          >
            <Download className="w-4 h-4" /> Download
          </a>
        )}
      </div>

      {busy && status === 'rendering' && (
        <p className="text-xs text-gray-500">
          Recording happens in real time — {seconds}s of video takes about {seconds}s. Keep this
          tab in front; browsers throttle background tabs and that would drop frames.
        </p>
      )}

      {skipped > 0 && (
        <p className="flex items-start gap-2 text-sm text-yellow-400">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          {skipped} beat{skipped === 1 ? '' : 's'} had no visual and {skipped === 1 ? 'is' : 'are'} left
          out — the reel will be shorter than the script.
        </p>
      )}

      {error && (
        <p className="flex items-start gap-2 text-sm text-red-400">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
        </p>
      )}

      <div className="flex gap-4 flex-wrap">
        <div>
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="rounded-xl border border-[#2A2A2A] bg-black"
            style={{ width: 216, height: 384 }}
          />
          <p className="text-[10px] text-gray-600 mt-1 text-center">recording surface</p>
        </div>
        {videoUrl && (
          <div>
            <video
              src={videoUrl}
              controls
              playsInline
              className="rounded-xl border border-[#2A2A2A] bg-black"
              style={{ width: 216, height: 384 }}
            />
            <p className="text-[10px] text-gray-600 mt-1 text-center">result</p>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        {renderable.length} beat{renderable.length === 1 ? '' : 's'} · {seconds}s · {width}×{height} ·
        rendered in your browser, nothing uploaded.
      </p>
    </div>
  );
}
