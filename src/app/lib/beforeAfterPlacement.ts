/**
 * Where the logo, the headline and a banner sit on the design.
 *
 * Eric: "can we also have editing options for the logo branding placement and
 * have the ability to upload texts a banners to add on".
 *
 * WHAT WAS FIXED IN PLACE BEFORE THIS
 *
 * The logo was welded to the left end of the brand strip at one size. The
 * promotional line was a white-on-black band of one width, one position, always
 * centred, always just above that strip. There was no banner at all. So every
 * design this tool has ever produced has the same furniture in the same places,
 * and the only way to move anything was to export the picture and open it in
 * something else.
 *
 * NINE ANCHORS, NOT X AND Y
 *
 * A pair of coordinates is the obvious design and the wrong one here. The
 * canvas is 1080 square or 1080x1920 depending on the output, so a logo pinned
 * at (840, 120) is in the corner on one and halfway up the side on the other —
 * and the person placing it is choosing "top right", not a number. Anchors mean
 * a design survives a change of output size, which is the whole reason this
 * tool renders rather than crops.
 *
 * The offset exists for the cases an anchor cannot express: nudging a logo off
 * a busy corner, lifting a headline clear of a doorway. It is a fraction of the
 * canvas rather than pixels, for the same reason.
 *
 * NOTHING MAY LEAVE THE CANVAS
 *
 * Every rectangle is clamped inside the frame. A logo half off the edge is not
 * a style choice somebody made deliberately at 2am, it is a mistake that
 * reaches a customer's feed — and unlike a bad crop it is invisible in the
 * thumbnail. The clamp is tested at every anchor and at the extremes of the
 * offset.
 */

export type Anchor =
  | 'top-left' | 'top-center' | 'top-right'
  | 'middle-left' | 'middle-center' | 'middle-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export const ANCHORS: Anchor[] = [
  'top-left', 'top-center', 'top-right',
  'middle-left', 'middle-center', 'middle-right',
  'bottom-left', 'bottom-center', 'bottom-right',
];

/** Short labels for the nine-box picker, in the same order. */
export const ANCHOR_LABELS: Record<Anchor, string> = {
  'top-left': 'Top left',
  'top-center': 'Top',
  'top-right': 'Top right',
  'middle-left': 'Left',
  'middle-center': 'Centre',
  'middle-right': 'Right',
  'bottom-left': 'Bottom left',
  'bottom-center': 'Bottom',
  'bottom-right': 'Bottom right',
};

export interface Placement {
  anchor: Anchor;
  /** Width as a fraction of the canvas width. Height follows the aspect. */
  scale: number;
  /** Nudge, as a fraction of the canvas. Positive is right and down. */
  offsetX: number;
  offsetY: number;
}

export interface Rect { x: number; y: number; width: number; height: number }
export interface Size { width: number; height: number }

const round = (n: number) => Math.round(n);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** The margin an anchored item keeps off the edge, as a fraction of the canvas. */
export const EDGE_MARGIN = 0.035;

export const DEFAULT_LOGO_PLACEMENT: Placement = {
  anchor: 'bottom-left', scale: 0.18, offsetX: 0, offsetY: 0,
};
export const DEFAULT_TEXT_PLACEMENT: Placement = {
  anchor: 'bottom-center', scale: 0.92, offsetX: 0, offsetY: 0,
};
export const DEFAULT_BANNER_PLACEMENT: Placement = {
  anchor: 'top-center', scale: 0.8, offsetX: 0, offsetY: 0,
};

const isAnchor = (v: unknown): v is Anchor => ANCHORS.includes(v as Anchor);

/** A placement with every field safe to use, whatever arrived. */
export function readPlacement(raw: Partial<Placement> | null | undefined, fallback: Placement): Placement {
  const scaleRaw = Number(raw?.scale);
  const offsetXRaw = Number(raw?.offsetX);
  const offsetYRaw = Number(raw?.offsetY);
  return {
    anchor: isAnchor(raw?.anchor) ? raw!.anchor as Anchor : fallback.anchor,
    /*
     * A floor of 2% because below that it is invisible at any realistic
     * viewing size, and somebody dragging a slider to nothing has made a
     * mistake rather than a decision. A ceiling of the full width because a
     * banner across the whole design is a legitimate thing to want.
     */
    scale: clamp(Number.isFinite(scaleRaw) && scaleRaw > 0 ? scaleRaw : fallback.scale, 0.02, 1),
    offsetX: clamp(Number.isFinite(offsetXRaw) ? offsetXRaw : 0, -0.5, 0.5),
    offsetY: clamp(Number.isFinite(offsetYRaw) ? offsetYRaw : 0, -0.5, 0.5),
  };
}

/**
 * Where an item of this aspect ratio lands on this canvas.
 *
 * `aspect` is width ÷ height of the thing being placed, so a logo keeps its
 * proportions instead of being stretched to whatever box the anchor implies.
 */
export function placeOn(canvas: Size, aspect: number, placement: Placement): Rect {
  const cw = Math.max(1, Number(canvas.width) || 1);
  const ch = Math.max(1, Number(canvas.height) || 1);
  const ratio = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;

  /*
   * ROUNDED BEFORE ANYTHING IS POSITIONED AGAINST THEM.
   *
   * Clamping x and y against fractional dimensions and rounding everything
   * separately afterwards lets both round upward and push the box past the
   * edge: a 21.6 x 13.5 logo became 22 x 14 at y 1067 on a 1080 canvas, whose
   * bottom edge is 1081. One pixel, invisible in review, and a clipped logo in
   * the feed. The size is settled first so the clamp below is the final word.
   */
  const width = round(clamp(cw * placement.scale, 1, cw));
  const height = round(clamp(width / ratio, 1, ch));

  const margin = Math.min(cw, ch) * EDGE_MARGIN;
  /*
   * The travel available between the margins. Never negative: an item wider
   * than the canvas less its margins is centred rather than placed at a
   * nonsensical negative coordinate.
   */
  const spanX = Math.max(0, cw - width - margin * 2);
  const spanY = Math.max(0, ch - height - margin * 2);

  const [vertical, horizontal] = placement.anchor.split('-');

  const left = horizontal === 'left' ? margin
    : horizontal === 'right' ? margin + spanX
      : margin + spanX / 2;
  const top = vertical === 'top' ? margin
    : vertical === 'bottom' ? margin + spanY
      : margin + spanY / 2;

  /*
   * Clamped to the CANVAS, not to the margin, so a deliberate nudge can take
   * something right to the edge while still never leaving the frame.
   */
  const x = clamp(round(left + placement.offsetX * cw), 0, Math.max(0, cw - width));
  const y = clamp(round(top + placement.offsetY * ch), 0, Math.max(0, ch - height));

  return { x, y, width, height };
}

/**
 * The box a line of text occupies, and the size to set it at.
 *
 * Text is placed by the width it is allowed to fill rather than by a font size,
 * because the readable size depends on the output: 48px is a headline on a
 * 1080 square and a caption on a 1920-tall reel. The caller measures nothing —
 * it sets this size and draws inside this box.
 */
export function placeText(canvas: Size, placement: Placement, lines = 1): Rect & { fontSize: number } {
  const cw = Math.max(1, Number(canvas.width) || 1);
  const width = clamp(cw * placement.scale, 1, cw);
  /*
   * Tied to the BOX width rather than the canvas, so widening the band makes
   * the words bigger — which is what somebody dragging it expects. Divided by
   * a constant that puts roughly 18 characters across the band at full width,
   * which is about a headline.
   */
  const fontSize = Math.max(10, width / 13);
  const height = fontSize * 1.45 * Math.max(1, lines);
  const box = placeOn(canvas, width / Math.max(1, height), { ...placement, scale: placement.scale });
  return { ...box, height: round(height), fontSize: round(fontSize) };
}
