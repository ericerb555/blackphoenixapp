/**
 * ReelRenderer — turns a storyboard into a video file you can post.
 *
 * The Content Studio writes the script and /content-studio/reel/storyboard
 * resolves every beat into a picture, a caption and a narration track. This is
 * the last step: draw those beats to a canvas, record the canvas, and hand back
 * a WebM.
 *
 * Why a purpose-built renderer rather than the existing photo-to-video exporter:
 * a reel is vertical, its captions are burned in because most viewers watch
 * muted, and its audio is per-beat narration rather than one music bed. Those
 * are different enough that reusing the slideshow exporter would mean bending
 * it out of shape.
 *
 * Everything happens in the browser. No frames are uploaded, and no render
 * service is involved.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Loader2, Play, Square, AlertTriangle, Film } from 'lucide-react';

export interface ReelSlide {
  id: string;
  order: number;
  label: string;
  url: string;
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

/**
 * Pick the best container the browser will actually record.
 *
 * Chrome and Firefox differ on codec support, and MediaRecorder throws rather
 * than degrading when handed a type it does not know. Ask before committing.
 */
function pickMimeType(): string | null {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  for (const t of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t)) return t;
  }
  return null;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Required for the canvas to stay untainted. The storyboard re-hosts
    // supplier images onto our own storage precisely so this succeeds.
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load image: ${url.slice(0, 80)}`));
    img.src = url;
  });
}

/** Cover-fit: fill the frame without distorting the photograph. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
  scale: number,
) {
  const ar = img.width / img.height;
  const target = w / h;
  let dw = ar > target ? h * ar : w;
  let dh = ar > target ? h : w / ar;
  dw *= scale;
  dh *= scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

/**
 * Caption styling is the difference between a reel and a slideshow with words
 * on it. Heavy weight, tight leading, a scrim behind the text so it stays
 * readable over a busy photograph, and generous bottom margin to clear the
 * platform's own UI.
 */
function drawCaption(ctx: CanvasRenderingContext2D, text: string, w: number, h: number) {
  if (!text.trim()) return;

  const fontSize = Math.round(w * 0.072);
  const lineHeight = fontSize * 1.16;
  ctx.font = `800 ${fontSize}px ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxWidth = w * 0.86;
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  // Sit above the platform's own controls rather than under them.
  const blockH = lines.length * lineHeight;
  const bottom = h * 0.82;
  const top = bottom - blockH;

  const pad = fontSize * 0.5;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, top - pad, w, blockH + pad * 2);

  lines.forEach((l, i) => {
    const y = top + lineHeight * i + lineHeight / 2;
    ctx.lineWidth = Math.max(4, fontSize * 0.13);
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.lineJoin = 'round';
    ctx.strokeText(l, w / 2, y);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(l, w / 2, y);
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

  const { width, height, slides } = storyboard;
  const renderable = slides.filter((s) => s.url);
  const skipped = slides.length - renderable.length;

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  const render = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const mimeType = pickMimeType();
    if (!mimeType) {
      setError('This browser cannot record video. Chrome or Firefox will work.');
      setStatus('error');
      return;
    }

    cancelRef.current = false;
    setError(null);
    setVideoUrl(null);
    setStatus('loading');
    setProgress(0);

    try {
      // Load every image up front. Decoding mid-record drops frames, and a
      // missing image should stop us before recording rather than halfway in.
      const images = await Promise.all(renderable.map((s) => loadImage(s.url)));

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get a 2D canvas context.');

      const stream = canvas.captureStream(FPS);

      // Mix the per-beat narration into one track. Web Audio lets several
      // clips share a destination, which MediaRecorder can then record
      // alongside the video.
      const audioSlides = renderable.filter((s) => s.audioUrl);
      let audioCtx: AudioContext | null = null;
      const sources: { node: AudioBufferSourceNode; at: number }[] = [];

      if (audioSlides.length) {
        audioCtx = new AudioContext();
        const dest = audioCtx.createMediaStreamDestination();
        let clock = 0;
        for (const s of renderable) {
          if (s.audioUrl) {
            try {
              const buf = await fetch(s.audioUrl).then((r) => r.arrayBuffer());
              const decoded = await audioCtx.decodeAudioData(buf);
              const node = audioCtx.createBufferSource();
              node.buffer = decoded;
              node.connect(dest);
              sources.push({ node, at: clock });
            } catch {
              // A beat without narration is still a beat — keep its picture.
            }
          }
          clock += s.duration;
        }
        dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
      }

      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

      const finished = new Promise<Blob>((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      });

      setStatus('rendering');
      recorder.start();

      const startedAt = performance.now();
      if (audioCtx) {
        const base = audioCtx.currentTime + 0.08;
        for (const s of sources) s.node.start(base + s.at);
      }

      const totalMs = renderable.reduce((n, s) => n + s.duration, 0) * 1000;

      // Drive frames from the wall clock rather than a frame counter, so the
      // video stays in step with the audio even if a frame is slow to draw.
      await new Promise<void>((resolve) => {
        const frame = () => {
          if (cancelRef.current) { resolve(); return; }

          const elapsed = performance.now() - startedAt;
          if (elapsed >= totalMs) { resolve(); return; }

          let acc = 0;
          let index = 0;
          for (let i = 0; i < renderable.length; i++) {
            const ms = renderable[i].duration * 1000;
            if (elapsed < acc + ms) { index = i; break; }
            acc += ms;
            index = i;
          }

          const slide = renderable[index];
          const img = images[index];
          const local = (elapsed - acc) / (slide.duration * 1000);

          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, width, height);

          // Slow push in or out — a still with no motion reads as a slideshow.
          const zoom = slide.effect === 'ken-burns-out'
            ? 1.08 - 0.08 * local
            : 1.0 + 0.08 * local;
          drawCover(ctx, img, width, height, zoom);

          // Cross-fade by dipping to black at the boundary: cheap, and it reads
          // as a deliberate cut rather than a glitch.
          if (slide.transition === 'fade' && local < 0.12) {
            ctx.fillStyle = `rgba(0,0,0,${(1 - local / 0.12) * 0.85})`;
            ctx.fillRect(0, 0, width, height);
          }

          drawCaption(ctx, slide.caption, width, height);

          setProgress(Math.min(99, Math.round((elapsed / totalMs) * 100)));
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });

      recorder.stop();
      const blob = await finished;
      if (audioCtx) await audioCtx.close().catch(() => {});

      setVideoUrl(URL.createObjectURL(blob));
      setProgress(100);
      setStatus(cancelRef.current ? 'idle' : 'done');
    } catch (err: any) {
      console.error('[ReelRenderer]', err);
      setError(err?.message || 'Rendering failed.');
      setStatus('error');
    }
  }, [renderable, width, height]);

  const busy = status === 'loading' || status === 'rendering';

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

        {busy && (
          <span className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            {status === 'loading' ? 'Loading media…' : `Recording ${progress}%`}
          </span>
        )}

        {videoUrl && (
          <a
            href={videoUrl}
            download={`${filename}.webm`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: 'rgba(22,163,74,0.9)' }}
          >
            <Download className="w-4 h-4" /> Download
          </a>
        )}
      </div>

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

      {/* The canvas is the recording surface, shown at a fraction of its real
          size so a 1080x1920 frame fits on screen. */}
      <div className="flex gap-4 flex-wrap">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="rounded-xl border border-[#2A2A2A] bg-black"
          style={{ width: 216, height: 384 }}
        />
        {videoUrl && (
          <video
            src={videoUrl}
            controls
            playsInline
            className="rounded-xl border border-[#2A2A2A] bg-black"
            style={{ width: 216, height: 384 }}
          />
        )}
      </div>

      <p className="text-xs text-gray-500">
        {renderable.length} beat{renderable.length === 1 ? '' : 's'} ·{' '}
        {Math.round(renderable.reduce((n, s) => n + s.duration, 0))}s · {width}×{height} ·
        rendered in your browser, nothing uploaded.
      </p>
    </div>
  );
}
