/**
 * Turning the real logo into particles.
 *
 * The brief is explicit that the particles must form MY phoenix, not a
 * phoenix. So the positions come from the actual asset: the PNG's alpha
 * channel is the silhouette, and every particle sits on a pixel that is
 * genuinely part of the mark. Nothing here is drawn by hand or approximated.
 *
 * WHY THE PIXEL MATHS IS SEPARATE FROM THE LOADING
 *
 * `pickParticles` is pure — it takes a pixel buffer and returns positions.
 * That means `node --test` can check the properties that actually matter
 * (the silhouette survives, the outline stays crisp, a transparent image
 * does not produce a cloud of particles at the origin) without a browser,
 * a canvas or a GPU. `loadPhoenixParticles` is the thin DOM wrapper.
 *
 * WHAT THE COLOURS MEAN
 *
 * The mark is a BLACK bird with an orange outline. Black particles on a
 * black command centre would be the same mistake as the black-on-black
 * button — invisible. A hologram of a black logo has to emit light, so the
 * body is rendered as glowing ember and the outline as the brand orange it
 * already is. Shape and proportion are the logo's exactly; the body's
 * luminance is the one deliberate departure, and it is the departure that
 * makes it visible at all.
 */

/** Brand orange, as it appears in the asset and the rest of the app. */
export const BRAND_ORANGE = [0.918, 0.345, 0.047] as const; // #ea580c
/** The ember the black mass glows as. Hotter at the edges, deeper inside. */
export const BRAND_EMBER = [0.49, 0.11, 0.02] as const;     // #7c1c05

export interface ParticleField {
  /** xyz per particle, normalised so the mark fits in [-1, 1]. */
  positions: Float32Array;
  /** 1 where the source pixel was the orange outline, 0 for the body. */
  edge: Float32Array;
  /** Stable per-particle randomness: phase, excursion, size. */
  seed: Float32Array;
  count: number;
}

export interface PickOptions {
  /** How many particles to produce. Clamped to what the image can supply. */
  count: number;
  /** Alpha below this is background and is never sampled. */
  alphaCutoff?: number;
  /**
   * Share of particles spent on the orange outline.
   *
   * The outline is a hairline — a few percent of the opaque pixels — so
   * uniform sampling would spend almost nothing on it and the silhouette
   * would dissolve into a blob. The brief's hard requirement is that the
   * shape stays identifiable, and this is the number that keeps it.
   */
  edgeShare?: number;
  /** Depth of the shell the particles occupy, in normalised units. */
  depth?: number;
  /** Deterministic randomness, so tests and snapshots are reproducible. */
  random?: () => number;
}

/** Orange outline vs black body, judged from the pixel itself. */
export function isOutlinePixel(r: number, g: number, b: number): boolean {
  // The outline is saturated orange; the body is near-black. Red well above
  // blue with real red energy is the whole discriminator, and it does not
  // care about the exact brand hex — antialiased edge pixels are darker
  // versions of the same relationship.
  return r > 90 && r > b * 1.6 && r >= g;
}

/**
 * Choose particle positions from a decoded RGBA buffer.
 *
 * Returns fewer than `count` only when the image cannot supply more opaque
 * pixels, which is the honest outcome — padding with particles at the
 * origin would put a bright knot in the middle of the bird.
 */
export function pickParticles(
  data: Uint8ClampedArray | number[],
  width: number,
  height: number,
  opts: PickOptions,
): ParticleField {
  const {
    count, alphaCutoff = 100, edgeShare = 0.35, depth = 0.22,
    random = Math.random,
  } = opts;

  const wanted = Math.max(0, Math.floor(count));
  const edgeIdx: number[] = [];
  const bodyIdx: number[] = [];

  for (let i = 0, p = 0; p < width * height; p++, i += 4) {
    if (data[i + 3] < alphaCutoff) continue;
    (isOutlinePixel(data[i], data[i + 1], data[i + 2]) ? edgeIdx : bodyIdx).push(p);
  }

  const available = edgeIdx.length + bodyIdx.length;
  const total = Math.min(wanted, available);

  // Ask for `edgeShare` of the budget on the outline, but never more outline
  // particles than there are outline pixels; the remainder goes to the body.
  let nEdge = Math.min(Math.round(total * edgeShare), edgeIdx.length);
  let nBody = Math.min(total - nEdge, bodyIdx.length);
  nEdge = Math.min(total - nBody, edgeIdx.length);

  const positions = new Float32Array(total * 3);
  const edge = new Float32Array(total);
  const seed = new Float32Array(total * 3);

  const half = Math.max(width, height) / 2;
  let w = 0;

  const emit = (pool: number[], n: number, isEdge: number) => {
    for (let k = 0; k < n; k++) {
      // Sampling with replacement. Two particles landing on one pixel is
      // invisible at this density, and the alternative — shuffling a
      // 200k-entry array — costs more than it is worth on page load.
      const p = pool[(random() * pool.length) | 0];
      const px = p % width;
      const py = (p / width) | 0;

      positions[w * 3] = (px - width / 2) / half;
      // Image rows run downward, GL's Y runs up.
      positions[w * 3 + 1] = (height / 2 - py) / half;
      // A shell rather than a plane, so the thing has depth when it turns.
      // Outline particles sit nearer the surface, which keeps the silhouette
      // reading as an edge instead of a smeared band.
      positions[w * 3 + 2] = (random() - 0.5) * depth * (isEdge ? 0.5 : 1);

      edge[w] = isEdge;
      seed[w * 3] = random();        // flow phase
      seed[w * 3 + 1] = random();    // excursion timing
      seed[w * 3 + 2] = random();    // size / brightness jitter
      w++;
    }
  };

  emit(edgeIdx, nEdge, 1);
  emit(bodyIdx, nBody, 0);

  return { positions, edge, seed, count: total };
}

/**
 * Load the logo and sample it. Browser only.
 *
 * Downsamples before reading pixels: a 1080² image is 1.17M pixels and we
 * need a few tens of thousands of positions, so reading it at full size
 * costs ~4.6 MB of ImageData and a visible hitch for no extra fidelity.
 */
export async function loadPhoenixParticles(
  src: string,
  count: number,
  sampleSize = 420,
): Promise<ParticleField> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = src;
  await img.decode();

  const canvas = document.createElement('canvas');
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not read the logo: no 2D context.');

  ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
  const { data } = ctx.getImageData(0, 0, sampleSize, sampleSize);

  return pickParticles(data, sampleSize, sampleSize, { count });
}

/**
 * How many particles this machine should be asked to draw.
 *
 * Deliberately conservative on anything that looks like a phone or a
 * low-core laptop. The brief asks for 60fps on capable desktop hardware and
 * adaptive counts elsewhere; a stuttering hologram reads as broken software
 * rather than as an intelligence.
 */
export function budgetFor(
  cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4,
  mobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent),
  memoryGb = (typeof navigator !== 'undefined' && (navigator as any).deviceMemory) || 8,
): number {
  if (mobile) return 9000;
  if (cores <= 4 || memoryGb <= 4) return 16000;
  if (cores <= 8) return 28000;
  return 42000;
}
