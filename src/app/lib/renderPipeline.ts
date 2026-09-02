/**
 * Model first, render once.
 *
 * WHY THE OLD WAY WAS WRONG
 *
 * The render was produced by describing a deck in words. That is a fresh roll
 * of the dice every time: words cannot measure sixteen feet, they do not know
 * where the ledger lands, and asking again produces a different deck in a
 * different place. Eric's complaint was exactly this — "its not putting the
 * deck back in the same place, it's adding it on other places on the house".
 *
 * It could not have worked. The image model was being asked to be an architect.
 *
 * WHAT REPLACES IT
 *
 * The 3D model already knows the width, the height, the post spacing and where
 * the stairs land, because a person drew it and a calculator sized it. So the
 * geometry is rendered from the model, composited onto the photograph, and the
 * paid pass is masked to the deck's own silhouette with one instruction: change
 * no shape and no position, only make it photographic.
 *
 * The image model stops deciding where the deck is. It cannot get the size
 * wrong because it is not choosing the size. It is left doing the thing it is
 * actually good at — light, material and shadow.
 *
 * AND IT IS CHEAPER BY ACCIDENT
 *
 * A render costs about twenty cents and the 3D view is free. Moving the
 * iteration into the free step and paying once, at the end, on a design that is
 * already settled, is the same decision arriving from the other direction.
 */

/* ── the camera ───────────────────────────────────────────────────────── */

/**
 * Where the 3D camera has to stand for the model to line up with the photo.
 *
 * Aligned by hand, on purpose. Recovering a camera from a single photograph is
 * a research problem, and this is a judgement a person looking at both images
 * makes in thirty seconds. Saved with the project so it is done once per photo
 * and never again — after that, a design change costs one render rather than
 * another alignment.
 */
export interface AlignedCamera {
  /** Orbit position in spherical terms, which is what the controls produce. */
  azimuthDeg: number;
  elevationDeg: number;
  distanceFt: number;
  /** What the camera looks at, in model feet. */
  targetX: number;
  targetY: number;
  targetZ: number;
  fovDeg: number;
  /** Which photo this was aligned against. A camera is only valid for one. */
  photoKey?: string;
  alignedOn?: string;
}

export const DEFAULT_CAMERA: AlignedCamera = {
  azimuthDeg: 35, elevationDeg: 18, distanceFt: 40,
  targetX: 0, targetY: 2, targetZ: 0, fovDeg: 45,
};

/**
 * A camera aligned against a different photograph is worse than none.
 *
 * It will produce a confidently wrong picture — geometry placed precisely where
 * it belonged in a photo nobody is looking at any more. So the alignment is
 * tied to the photo it was made against and reported stale when that changes.
 */
export function cameraMatchesPhoto(cam: AlignedCamera | null, photoKey: string): boolean {
  return Boolean(cam && cam.photoKey && cam.photoKey === photoKey);
}

/* ── the mask ─────────────────────────────────────────────────────────── */

/**
 * Turn the deck's own silhouette into an edit mask.
 *
 * THE SEMANTICS ARE INVERTED AND IT MATTERS
 *
 * The images/edits API edits where the mask is TRANSPARENT and preserves where
 * it is opaque. So the deck — the only thing we want touched — becomes alpha 0,
 * and the entire photograph around it becomes alpha 255. Getting this backwards
 * repaints the house and leaves the deck as a drawing, which is a plausible
 * enough mistake that it is worth stating here in capitals.
 *
 * The silhouette is grown by a few pixels because a mask cut exactly to the
 * geometry leaves the model no room to blend an edge or lay a contact shadow,
 * and a deck with no shadow reads as pasted on however good the materials are.
 *
 * Dilation is separable — a horizontal pass then a vertical one — which gives a
 * square kernel and runs in time proportional to the pixels rather than to the
 * pixels times the radius.
 */
export function maskFromAlpha(
  alpha: Uint8ClampedArray | Uint8Array | number[],
  width: number,
  height: number,
  growPx = 6,
  threshold = 8,
): Uint8ClampedArray {
  const n = width * height;
  const solid = new Uint8Array(n);
  for (let i = 0; i < n; i++) solid[i] = alpha[i] > threshold ? 1 : 0;

  const grown = growPx > 0 ? dilate(solid, width, height, growPx) : solid;

  // RGBA. Black everywhere; only alpha carries the meaning.
  const out = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    // Deck → transparent → "edit here". Everything else → opaque → "leave it".
    out[i * 4 + 3] = grown[i] ? 0 : 255;
  }
  return out;
}

/** Square dilation, done as two 1-D passes. */
function dilate(src: Uint8Array, width: number, height: number, r: number): Uint8Array {
  const horiz = new Uint8Array(src.length);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      let hit = 0;
      const lo = Math.max(0, x - r);
      const hi = Math.min(width - 1, x + r);
      for (let k = lo; k <= hi; k++) if (src[row + k]) { hit = 1; break; }
      horiz[row + x] = hit;
    }
  }

  const out = new Uint8Array(src.length);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let hit = 0;
      const lo = Math.max(0, y - r);
      const hi = Math.min(height - 1, y + r);
      for (let k = lo; k <= hi; k++) if (horiz[k * width + x]) { hit = 1; break; }
      out[y * width + x] = hit;
    }
  }
  return out;
}

/** How much of the frame the deck occupies, 0–1. */
export function coverageOf(
  alpha: Uint8ClampedArray | Uint8Array | number[],
  threshold = 8,
): number {
  let hit = 0;
  for (let i = 0; i < alpha.length; i++) if (alpha[i] > threshold) hit++;
  return alpha.length ? hit / alpha.length : 0;
}

/* ── is this worth paying for ─────────────────────────────────────────── */

export interface PipelineState {
  hasPhoto: boolean;
  hasCapture: boolean;
  camera: AlignedCamera | null;
  photoKey: string;
  /** Fraction of the frame the deck silhouette covers. */
  coverage: number;
}

export interface PipelineIssue {
  severity: 'blocking' | 'warning';
  message: string;
}

/**
 * What is wrong before twenty cents is spent.
 *
 * A render is cheap enough to be careless with and expensive enough that being
 * careless with it thirty times a week adds up. More to the point, a render
 * made from a bad composite wastes the person's time rather than the money —
 * they have to look at it, decide it is wrong, and work out why.
 */
export function pipelineIssues(s: PipelineState): PipelineIssue[] {
  const issues: PipelineIssue[] = [];

  if (!s.hasPhoto) {
    issues.push({ severity: 'blocking', message: 'No photograph of the house to render onto.' });
  }
  if (!s.hasCapture) {
    issues.push({ severity: 'blocking', message: 'The deck has not been captured from the 3D view yet.' });
  }
  if (!s.camera) {
    issues.push({
      severity: 'blocking',
      message: 'The camera has not been aligned to the photograph. Without it the geometry is '
        + 'placed by guesswork, which is the problem this pipeline exists to fix.',
    });
  } else if (s.photoKey && !cameraMatchesPhoto(s.camera, s.photoKey)) {
    issues.push({
      severity: 'blocking',
      message: 'This camera was aligned against a different photograph. It will place the deck '
        + 'precisely where it belonged in a picture nobody is looking at — align it again.',
    });
  }

  if (s.hasCapture && s.coverage <= 0.001) {
    issues.push({
      severity: 'blocking',
      message: 'The capture is empty — the deck is not in frame. Orbit until it is visible before rendering.',
    });
  } else if (s.hasCapture && s.coverage < 0.02) {
    issues.push({
      severity: 'warning',
      message: 'The deck covers under 2% of the frame. There is very little for the render to work '
        + 'on, and the result will be mostly untouched photograph.',
    });
  } else if (s.coverage > 0.6) {
    issues.push({
      severity: 'warning',
      message: 'The deck fills most of the frame, so there is little house left for context. '
        + 'Pull the camera back if this is meant to show the deck on the building.',
    });
  }

  return issues;
}

export function canRender(s: PipelineState): boolean {
  return !pipelineIssues(s).some(i => i.severity === 'blocking');
}

/** One sentence on where the pipeline stands. */
export function pipelineNote(s: PipelineState): string {
  const issues = pipelineIssues(s);
  const blocking = issues.filter(i => i.severity === 'blocking');
  if (blocking.length) return blocking[0].message;
  const warning = issues.find(i => i.severity === 'warning');
  if (warning) return warning.message;
  return 'Aligned and composited. One paid pass turns the geometry photographic without moving it.';
}

/* ── what the paid pass is told ───────────────────────────────────────── */

/**
 * The instruction for the one paid pass.
 *
 * Written to remove decisions rather than to describe a deck. Every sentence in
 * it exists to stop the model doing something it would otherwise do: it is very
 * willing to "improve" a composition, straighten a rail it thinks is crooked,
 * or move a structure somewhere it looks better. The geometry is already
 * correct and any change to it is a regression.
 *
 * The old prompt described a deck in words and asked for a picture of one. That
 * is what produced a different deck in a different place on every attempt.
 */
export function photorealPrompt(opts: {
  material?: string;
  railing?: string;
  timeOfDay?: string;
  extra?: string;
} = {}): string {
  const lines = [
    'This photograph already contains a 3D render of a deck composited onto it.',
    'The deck geometry is correct and measured. Your only job is to make it look photographic.',
    '',
    'DO NOT change the shape, size, position, angle or proportions of anything.',
    'DO NOT move, add or remove any post, board, step, railing or structural member.',
    'DO NOT alter the house, the roof, the siding, the windows, the sky or the ground.',
    'DO NOT reframe, crop, straighten or recompose the image.',
    '',
    'DO give the deck realistic material and surface texture.',
    'DO match the lighting direction, colour temperature and contrast of the photograph.',
    'DO add a natural contact shadow where the structure meets the ground.',
    'DO soften the composited edges so it sits in the scene rather than on top of it.',
  ];

  if (opts.material) lines.push(`Decking material: ${opts.material}.`);
  if (opts.railing) lines.push(`Railing: ${opts.railing}.`);
  if (opts.timeOfDay) lines.push(`Match the light to: ${opts.timeOfDay}.`);
  if (opts.extra) lines.push('', `Also: ${opts.extra}`);

  lines.push('', 'If you are unsure whether a change is allowed, do not make it.');
  return lines.join('\n');
}
