/**
 * Turning what someone shot on their phone into something an API will accept.
 *
 * A modern phone photo is 12 megapixels and several megabytes; a walk-around
 * video is tens of megabytes. Neither can be posted to an edge function as
 * base64, and neither needs to be — the analysis reads siding courses and door
 * openings, which survive a downscale to 1280px with room to spare. Everything
 * here exists to get from "what the camera produced" to "what fits in a request
 * body" without losing the detail the answer depends on.
 *
 * All of it runs in the browser. Pulling frames out of a video server-side
 * would mean shipping a video decoder into the edge runtime, when the device
 * that shot the video already has one.
 */

/** Long edge, in pixels, of what we send. Chosen to keep a whole set under the
 *  request limit while leaving siding courses and trim reveals legible. */
export const MAX_EDGE = 1280;

/** JPEG quality for transport. High enough that material reads correctly. */
const QUALITY = 0.82;

function drawScaled(
  source: CanvasImageSource,
  sw: number,
  sh: number,
  maxEdge: number,
): string {
  const scale = Math.min(1, maxEdge / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser would not give us a canvas to resize with.');

  // A white ground matters for anything with transparency — a PNG screenshot
  // of a house would otherwise composite onto black and read as a night shot.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, w, h);

  return canvas.toDataURL('image/jpeg', QUALITY);
}

/** Read one image file down to a data URI small enough to post. */
export function fileToDataUrl(file: File, maxEdge = MAX_EDGE): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        resolve(drawScaled(img, img.naturalWidth, img.naturalHeight, maxEdge));
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`${file.name || 'That image'} could not be opened.`));
    };

    img.src = url;
  });
}

/**
 * Pull evenly spaced still frames out of a video.
 *
 * A walk-around video is the most useful thing someone can capture, because
 * seeing the same wall from several angles is most of what makes a sill height
 * estimable at all — one straight-on photo gives no parallax to work with.
 *
 * Frames are sampled across the middle of the clip rather than the whole of it.
 * The first and last second of a hand-held video are reliably the worst: the
 * phone is being raised, lowered, or is still settling, and those frames are
 * blurred or pointed at the ground.
 */
export async function framesFromVideo(
  file: File,
  count = 4,
  maxEdge = MAX_EDGE,
  onProgress?: (done: number, total: number) => void,
): Promise<string[]> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  // Locally created object URLs are same-origin, so the canvas stays untainted
  // and toDataURL keeps working. Set anyway for safety if the source ever moves.
  video.crossOrigin = 'anonymous';

  const cleanup = () => {
    URL.revokeObjectURL(url);
    video.removeAttribute('src');
    video.load();
  };

  try {
    await new Promise<void>((resolve, reject) => {
      // Naming the real cause matters. The old wording — "try an MP4 or MOV" —
      // was usually shown to somebody who had just handed it a MOV, so it read
      // as the app being broken. What actually fails is the codec: an iPhone
      // recording in "High Efficiency" is H.265 inside a .mov, and Chrome on
      // Windows cannot decode it at any container. The setting that fixes it is
      // the one worth naming, because it is the only part the operator controls.
      const fail = () => reject(new Error(
        'The browser could not decode that video. If it came off an iPhone, set '
        + 'Camera > Formats to "Most Compatible" and re-record, or convert the clip to H.264 MP4.',
      ));
      video.onloadedmetadata = () => resolve();
      video.onerror = fail;
      // A video that never fires either event would hang the button forever.
      setTimeout(() => reject(new Error('That video took too long to open.')), 30000);
      video.src = url;
    });

    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    if (!duration) throw new Error('That video has no readable length.');

    const start = duration > 3 ? 0.75 : 0;
    const end = duration > 3 ? duration - 0.75 : duration;
    const span = Math.max(0.01, end - start);

    const frames: string[] = [];
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? start + span / 2 : start + (span * i) / (count - 1);

      await new Promise<void>((resolve, reject) => {
        const done = () => { video.onseeked = null; resolve(); };
        video.onseeked = done;
        video.onerror = () => reject(new Error('The video stopped part way through.'));
        setTimeout(done, 8000); // draw whatever is there rather than hanging
        video.currentTime = Math.min(t, Math.max(0, duration - 0.05));
      });

      frames.push(drawScaled(video, video.videoWidth, video.videoHeight, maxEdge));
      onProgress?.(i + 1, count);
    }

    return frames;
  } finally {
    cleanup();
  }
}

/** Rough size of a data URI once posted, for keeping a set under the limit. */
export function dataUrlBytes(uri: string): number {
  const i = uri.indexOf(',');
  return i === -1 ? 0 : Math.floor((uri.length - i - 1) * 0.75);
}
