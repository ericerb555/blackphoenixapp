/**
 * Where the two photographs go, and how big the words are.
 *
 * WHY THE GEOMETRY IS A SEPARATE, PURE MODULE
 *
 * The drawing half needs a browser — a canvas, a loaded `Image`, real pixels —
 * and nothing in a browser can be asserted by the test runner. The deciding
 * half needs none of that: given two photographs' dimensions, a layout and an
 * output size, where each one sits is arithmetic. Split that way, the rules
 * that actually go wrong can be pinned:
 *
 *   a photograph is never stretched, only cropped
 *   nothing is drawn outside the canvas
 *   the two panes are the same size as each other, so neither looks favoured
 *   a label always has room for its text
 *
 * The same split as `quotePdfSelection` from the quote PDF, and for the same
 * reason: a mistake here ships a distorted photograph of somebody's house to
 * every follower the company has.
 *
 * WHAT IT WILL NOT DO
 *
 * It does not touch the photographs themselves. A before-and-after is evidence
 * — the one piece of marketing a construction company has that a customer can
 * check against their own memory of the room — so the AFTER is the AFTER, and
 * nothing here crops it to flatter, warps it to match, or invents a pixel.
 * Cropping to a common aspect is the only transformation, it is applied to
 * both panes identically, and `cover` is deliberate: a letterboxed photo with
 * bars is honest but ugly, a stretched one is a lie.
 */

export type BeforeAfterLayout =
  | 'side-by-side'
  | 'horizontal-split'
  | 'vertical-split'
  | 'diagonal'
  | 'framed'
  | 'luxury'
  | 'full-bleed'
  | 'collage';

export type BeforeAfterSize = 'square' | 'portrait' | 'story';

export interface Size { width: number; height: number }

/** The export sizes the brief asks for, by the name a person uses for them. */
export const OUTPUT_SIZES: Record<BeforeAfterSize, Size & { label: string; use: string }> = {
  square: { width: 1080, height: 1080, label: '1080 × 1080', use: 'Feed post' },
  portrait: { width: 1080, height: 1350, label: '1080 × 1350', use: 'Portrait post' },
  story: { width: 1080, height: 1920, label: '1080 × 1920', use: 'Stories and Reels' },
};

export interface Rect { x: number; y: number; width: number; height: number }

/** One photograph's placement: what to take from it, and where it lands. */
export interface Pane {
  /** The part of the SOURCE image to read — the crop. */
  source: Rect;
  /** Where it lands on the canvas. */
  dest: Rect;
  /** 'before' or 'after', so the renderer knows which label to draw. */
  role: 'before' | 'after';
}

export interface LabelBox extends Rect {
  text: string;
  /** Point size for the label text, scaled to the canvas rather than fixed. */
  fontSize: number;
  align: 'left' | 'center';
}

export interface BrandBar extends Rect {
  /** Height reserved for the brand strip. Zero when branding is switched off. */
  fontSize: number;
}

export interface Composition {
  canvas: Size;
  panes: Pane[];
  labels: LabelBox[];
  /** Null when the design carries no brand strip (full-bleed, for instance). */
  brand: BrandBar | null;
  /** Where the split runs, for the layouts that draw one. */
  divider: { kind: 'none' | 'vertical' | 'horizontal' | 'diagonal'; width: number };
  /** Padding the design uses, exposed so the renderer draws the same frame. */
  padding: number;
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * The biggest centred crop of `source` with the target's aspect ratio.
 *
 * Centre-weighted on purpose. A before-and-after is almost always two
 * photographs of the same room taken from the same doorway, so the subject is
 * in the middle of both; cropping from a corner would shift one pane relative
 * to the other and make the comparison dishonest in a way nobody could see.
 */
export function coverCrop(source: Size, target: Size): Rect {
  const sw = Math.max(1, Number(source.width) || 1);
  const sh = Math.max(1, Number(source.height) || 1);
  const tw = Math.max(1, Number(target.width) || 1);
  const th = Math.max(1, Number(target.height) || 1);

  const sourceAspect = sw / sh;
  const targetAspect = tw / th;

  if (sourceAspect > targetAspect) {
    // Source is wider: take a full-height slice from the middle.
    const width = sh * targetAspect;
    return { x: round((sw - width) / 2), y: 0, width: round(width), height: round(sh) };
  }
  // Source is taller: take a full-width slice from the middle.
  const height = sw / targetAspect;
  return { x: 0, y: round((sh - height) / 2), width: round(sw), height: round(height) };
}

export interface CompositionOptions {
  layout: BeforeAfterLayout;
  size: BeforeAfterSize;
  before: Size;
  after: Size;
  /** Off for a design that is all photograph. */
  showLabels?: boolean;
  /** Off when the Content Center's own branding controls say so. */
  showBrand?: boolean;
  beforeLabel?: string;
  afterLabel?: string;
}

/**
 * The design, as rectangles.
 *
 * Every number is derived from the canvas rather than fixed, so the same
 * layout works at 1080 square and 1080x1920 without a second set of
 * constants — and so a future export size needs no changes here at all.
 */
export function composeBeforeAfter(opts: CompositionOptions): Composition {
  const canvas = OUTPUT_SIZES[opts.size] || OUTPUT_SIZES.square;
  const W = canvas.width;
  const H = canvas.height;

  const showLabels = opts.showLabels !== false;
  const showBrand = opts.showBrand !== false;
  const beforeText = (opts.beforeLabel || 'BEFORE').slice(0, 24);
  const afterText = (opts.afterLabel || 'AFTER').slice(0, 24);

  /* Proportional throughout: 3% of the short edge reads the same at every size. */
  const unit = Math.min(W, H);
  const padding = opts.layout === 'full-bleed' ? 0 : round(unit * 0.035);
  const brandHeight = showBrand && opts.layout !== 'full-bleed' ? round(unit * 0.11) : 0;
  const labelFont = round(unit * 0.045);
  const divider = round(unit * 0.008);

  const body: Rect = {
    x: padding,
    y: padding,
    width: round(W - padding * 2),
    height: round(H - padding * 2 - brandHeight),
  };

  const panes: Pane[] = [];
  let dividerKind: Composition['divider']['kind'] = 'none';

  const place = (dest: Rect, role: 'before' | 'after', source: Size) => {
    panes.push({ source: coverCrop(source, { width: dest.width, height: dest.height }), dest, role });
  };

  switch (opts.layout) {
    /**
     * Two panes side by side. The default, and the one people mean when they
     * say "before and after" — the eye compares left to right without being
     * asked to remember anything.
     */
    case 'side-by-side':
    case 'framed':
    case 'luxury': {
      const gap = opts.layout === 'framed' ? round(unit * 0.02) : divider;
      const paneWidth = round((body.width - gap) / 2);
      place({ x: body.x, y: body.y, width: paneWidth, height: body.height }, 'before', opts.before);
      place({ x: round(body.x + paneWidth + gap), y: body.y, width: paneWidth, height: body.height }, 'after', opts.after);
      dividerKind = 'vertical';
      break;
    }

    /** Stacked. Reads better on a tall canvas, where two columns are slivers. */
    case 'horizontal-split': {
      const paneHeight = round((body.height - divider) / 2);
      place({ x: body.x, y: body.y, width: body.width, height: paneHeight }, 'before', opts.before);
      place({ x: body.x, y: round(body.y + paneHeight + divider), width: body.width, height: paneHeight }, 'after', opts.after);
      dividerKind = 'horizontal';
      break;
    }

    /**
     * Both photographs full size, one clipped to each half of a straight
     * seam — the "slider" look, without the slider.
     */
    case 'vertical-split': {
      place({ x: body.x, y: body.y, width: body.width, height: body.height }, 'before', opts.before);
      place({ x: body.x, y: body.y, width: body.width, height: body.height }, 'after', opts.after);
      dividerKind = 'vertical';
      break;
    }

    /** The same, cut on the diagonal. The renderer does the clipping. */
    case 'diagonal': {
      place({ x: body.x, y: body.y, width: body.width, height: body.height }, 'before', opts.before);
      place({ x: body.x, y: body.y, width: body.width, height: body.height }, 'after', opts.after);
      dividerKind = 'diagonal';
      break;
    }

    /** One photograph, edge to edge. The AFTER, because that is the point. */
    case 'full-bleed': {
      place({ x: 0, y: 0, width: W, height: H }, 'after', opts.after);
      break;
    }

    /**
     * A large AFTER with the BEFORE inset in the corner — the shape a
     * completion announcement usually takes, where the finished room is the
     * subject and the before is the evidence.
     */
    case 'collage': {
      place({ x: body.x, y: body.y, width: body.width, height: body.height }, 'after', opts.after);
      const inset = round(body.width * 0.32);
      place({
        x: round(body.x + body.width - inset - padding),
        y: round(body.y + body.height - round(inset * 0.75) - padding),
        width: inset,
        height: round(inset * 0.75),
      }, 'before', opts.before);
      break;
    }
  }

  /**
   * A label sits inside its own pane, never over the seam.
   *
   * Over the seam it lands on whichever photograph happens to be lighter and
   * becomes unreadable on half the jobs. Inside the pane the renderer can put
   * a plate behind it and know how wide that plate needs to be.
   */
  const labels: LabelBox[] = [];
  if (showLabels) {
    for (const pane of panes) {
      const text = pane.role === 'before' ? beforeText : afterText;
      const boxHeight = round(labelFont * 1.9);
      const boxWidth = round(Math.max(labelFont * 3.2, text.length * labelFont * 0.72));
      labels.push({
        text,
        fontSize: labelFont,
        align: 'center',
        x: round(pane.dest.x + labelFont * 0.6),
        y: round(pane.dest.y + pane.dest.height - boxHeight - labelFont * 0.6),
        width: Math.min(boxWidth, round(pane.dest.width - labelFont * 1.2)),
        height: boxHeight,
      });
    }
  }

  return {
    canvas: { width: W, height: H },
    panes,
    labels,
    brand: brandHeight > 0
      ? {
        x: 0,
        y: round(H - brandHeight),
        width: W,
        height: brandHeight,
        fontSize: round(brandHeight * 0.3),
      }
      : null,
    divider: { kind: dividerKind, width: divider },
    padding,
  };
}

/** Every layout, with the name and the sentence a person needs to choose one. */
export const LAYOUTS: Array<{ id: BeforeAfterLayout; name: string; note: string }> = [
  { id: 'side-by-side', name: 'Side by side', note: 'The classic. Left to right, nothing to remember.' },
  { id: 'horizontal-split', name: 'Stacked', note: 'One above the other — better on a tall canvas.' },
  { id: 'vertical-split', name: 'Straight seam', note: 'One image cut down the middle, slider style.' },
  { id: 'diagonal', name: 'Diagonal', note: 'The same cut on an angle. More movement.' },
  { id: 'framed', name: 'Framed', note: 'Side by side with a wider gutter and a border.' },
  { id: 'luxury', name: 'Luxury showcase', note: 'Side by side, dark ground, generous type.' },
  { id: 'full-bleed', name: 'Full transformation', note: 'The finished room, edge to edge.' },
  { id: 'collage', name: 'Completion announcement', note: 'The after, with the before inset as evidence.' },
];
