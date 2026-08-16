/**
 * Turning a photograph of a document into a document.
 *
 * A phone photo of a form is not a scan. It is shot at an angle, so the page is
 * a trapezoid rather than a rectangle; it carries the desk it was lying on; and
 * it has no physical size, so printing it gives a picture of a page floating on
 * a page. Towns reject those, and they are right to — a submitted drawing that
 * prints at 94% is not the drawing that was approved.
 *
 * This module does the two things that make the difference:
 *
 *   1. Perspective correction. Four corners of the page are mapped onto a true
 *      rectangle, so what was shot at an angle comes out square.
 *   2. Physical sizing. The output is rendered at an exact page size and
 *      resolution, so the PDF prints 1:1 with the original rather than to
 *      whatever the printer decides.
 *
 * Everything runs in the browser. Nothing is uploaded to be processed.
 */

export interface PageSize { id: string; label: string; widthIn: number; heightIn: number }

export const PAGE_SIZES: PageSize[] = [
  { id: 'letter', label: 'Letter — 8.5 × 11 in', widthIn: 8.5, heightIn: 11 },
  { id: 'legal', label: 'Legal — 8.5 × 14 in', widthIn: 8.5, heightIn: 14 },
  { id: 'tabloid', label: 'Tabloid — 11 × 17 in', widthIn: 11, heightIn: 17 },
  { id: 'a4', label: 'A4 — 210 × 297 mm', widthIn: 8.27, heightIn: 11.69 },
  { id: 'arch-d', label: 'Arch D — 24 × 36 in', widthIn: 24, heightIn: 36 },
];

export type Corner = { x: number; y: number };
/** Clockwise from top-left. */
export type Quad = [Corner, Corner, Corner, Corner];

/**
 * Solve the 3x3 homography taking four source points to four destination
 * points, by solving the 8x8 system with Gaussian elimination.
 *
 * This is the whole trick: with it, a page shot from the side comes out square;
 * without it, "scanning" is just cropping and the page stays a trapezoid.
 */
export function computeHomography(src: Quad, dst: Quad): number[] | null {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: u, y: v } = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }

  const n = 8;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    // Degenerate corners — three in a line, or two on top of each other.
    if (Math.abs(M[pivot][col]) < 1e-10) return null;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  // After full Gauss-Jordan, row i holds only its own pivot and the RHS, so the
  // unknown is RHS ÷ pivot. `row[i]` IS the pivot — indexing it again yields
  // undefined and the whole matrix comes back NaN, which warps every page to
  // blank white without raising anything.
  const h = M.map((row, i) => row[n] / row[i]);
  if (h.some(v => !Number.isFinite(v))) return null;
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

function invert3x3(m: number[]): number[] | null {
  const [a, b, c, d, e, f, g, h, i] = m;
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (!det || !Number.isFinite(det)) return null;
  const id = 1 / det;
  return [
    (e * i - f * h) * id, (c * h - b * i) * id, (b * f - c * e) * id,
    (f * g - d * i) * id, (a * i - c * g) * id, (c * d - a * f) * id,
    (d * h - e * g) * id, (b * g - a * h) * id, (a * e - b * d) * id,
  ];
}

export interface WarpOptions {
  page: PageSize;
  dpi: number;
  /** Lift contrast and neutralise paper colour. Off keeps the original exactly. */
  cleanup: boolean;
}

/**
 * Warp the quad in the source image onto a full page at the requested size.
 *
 * Inverse mapping with bilinear sampling: for every output pixel, find where it
 * came from in the photo. Forward mapping leaves holes.
 */
export function warpToPage(
  source: HTMLImageElement | HTMLCanvasElement,
  quad: Quad,
  opts: WarpOptions,
): HTMLCanvasElement | null {
  const outW = Math.round(opts.page.widthIn * opts.dpi);
  const outH = Math.round(opts.page.heightIn * opts.dpi);

  const dst: Quad = [
    { x: 0, y: 0 }, { x: outW, y: 0 }, { x: outW, y: outH }, { x: 0, y: outH },
  ];
  const H = computeHomography(quad, dst);
  if (!H) return null;
  const Hinv = invert3x3(H);
  if (!Hinv) return null;

  const sw = (source as HTMLImageElement).naturalWidth || source.width;
  const sh = (source as HTMLImageElement).naturalHeight || source.height;

  const scratch = document.createElement('canvas');
  scratch.width = sw; scratch.height = sh;
  const sctx = scratch.getContext('2d', { willReadFrequently: true });
  if (!sctx) return null;
  sctx.drawImage(source, 0, 0, sw, sh);
  const srcData = sctx.getImageData(0, 0, sw, sh).data;

  const out = document.createElement('canvas');
  out.width = outW; out.height = outH;
  const octx = out.getContext('2d');
  if (!octx) return null;
  const outImg = octx.createImageData(outW, outH);
  const o = outImg.data;

  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const w = Hinv[6] * x + Hinv[7] * y + Hinv[8];
      const sx = (Hinv[0] * x + Hinv[1] * y + Hinv[2]) / w;
      const sy = (Hinv[3] * x + Hinv[4] * y + Hinv[5]) / w;
      const di = (y * outW + x) * 4;

      if (sx < 0 || sy < 0 || sx >= sw - 1 || sy >= sh - 1) {
        // Outside the photo — white, so a slightly wrong corner gives white
        // margin rather than a black band that looks like a printing fault.
        o[di] = o[di + 1] = o[di + 2] = 255; o[di + 3] = 255;
        continue;
      }

      const x0 = Math.floor(sx), y0 = Math.floor(sy);
      const fx = sx - x0, fy = sy - y0;
      const i00 = (y0 * sw + x0) * 4, i10 = i00 + 4;
      const i01 = i00 + sw * 4, i11 = i01 + 4;
      for (let ch = 0; ch < 3; ch++) {
        const top = srcData[i00 + ch] * (1 - fx) + srcData[i10 + ch] * fx;
        const bot = srcData[i01 + ch] * (1 - fx) + srcData[i11 + ch] * fx;
        o[di + ch] = top * (1 - fy) + bot * fy;
      }
      o[di + 3] = 255;
    }
  }

  if (opts.cleanup) applyCleanup(o);

  octx.putImageData(outImg, 0, 0);
  return out;
}

/**
 * Lift contrast so paper reads white and ink reads black under uneven light.
 *
 * Deliberately a gentle curve rather than a hard threshold. Thresholding gives
 * a crisper-looking page and destroys exactly what a town needs to see —
 * signatures, notary stamps, faint carbon copies, pencil corrections. A missing
 * seal is a rejected application.
 */
function applyCleanup(data: Uint8ClampedArray) {
  let sum = 0, count = 0;
  for (let i = 0; i < data.length; i += 4 * 64) { sum += data[i]; count++; }
  const meanLight = count ? sum / count : 200;
  // Anchor white near the paper's own brightness rather than a fixed value, so
  // a grey photo does not come out muddy and a bright one does not blow out.
  const white = Math.max(150, Math.min(245, meanLight * 1.05));
  const black = 40;
  const range = Math.max(1, white - black);

  for (let i = 0; i < data.length; i += 4) {
    for (let ch = 0; ch < 3; ch++) {
      const v = (data[i + ch] - black) / range;
      data[i + ch] = Math.max(0, Math.min(255, Math.round(v * 255)));
    }
  }
}

/** Corners of the whole image — the starting quad before adjustment. */
export function fullFrameQuad(w: number, h: number): Quad {
  const m = 0.02;
  return [
    { x: w * m, y: h * m }, { x: w * (1 - m), y: h * m },
    { x: w * (1 - m), y: h * (1 - m) }, { x: w * m, y: h * (1 - m) },
  ];
}

/**
 * Guess the page edges from image content.
 *
 * A rough estimate, not detection: it finds where the page stops being paper
 * against a darker background. It gives a better starting quad than the frame
 * edges, and the corners stay draggable because on a busy desk this will
 * sometimes be wrong.
 */
export function estimateQuad(source: HTMLImageElement): Quad {
  const w = (source as any).naturalWidth || source.width;
  const h = (source as any).naturalHeight || source.height;
  const SAMPLE = 240;
  const c = document.createElement('canvas');
  const scale = Math.min(SAMPLE / w, SAMPLE / h, 1);
  c.width = Math.max(1, Math.round(w * scale));
  c.height = Math.max(1, Math.round(h * scale));
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return fullFrameQuad(w, h);
  ctx.drawImage(source, 0, 0, c.width, c.height);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;

  const lum = (x: number, y: number) => {
    const i = (y * c.width + x) * 4;
    return 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  };

  let sum = 0;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) sum += lum(x, y);
  const mean = sum / (c.width * c.height);
  const bright = mean * 0.88;

  let minX = c.width, minY = c.height, maxX = 0, maxY = 0, found = false;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (lum(x, y) > bright) {
        found = true;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (!found || maxX - minX < c.width * 0.25 || maxY - minY < c.height * 0.25) {
    return fullFrameQuad(w, h);
  }
  const k = 1 / scale;
  return [
    { x: minX * k, y: minY * k }, { x: maxX * k, y: minY * k },
    { x: maxX * k, y: maxY * k }, { x: minX * k, y: maxY * k },
  ];
}
