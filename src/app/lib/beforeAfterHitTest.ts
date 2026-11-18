/**
 * Working out what you just grabbed, and what dragging it should do.
 *
 * Eric: "the before and after section it not top tier it should be better."
 *
 * He is right, and the reason is narrower than it sounds. Every number in the
 * tool was already adjustable — zoom, nudge, anchor, size — but only through a
 * column of sliders beside the picture. That is a form with a preview attached,
 * and it feels like one: you move a slider, look up, look back down, move it
 * again. A tool people call good lets them put a finger on the thing and move
 * it. The arithmetic underneath is identical; the distance between intention
 * and result is not.
 *
 * SO THIS IS THE PART THAT MUST BE EXACT
 *
 * The canvas is drawn at 1080 or 1920 pixels and displayed at whatever width is
 * left over beside the controls — often a third of that, and a different third
 * on a phone. Every pointer event arrives in screen pixels and has to be read
 * in canvas pixels, or a drag moves the wrong distance and the thing under your
 * finger slides away from it. That conversion, and the question of which
 * element is under a point, are pure arithmetic with exactly one right answer,
 * so they live here and are tested rather than being written inline in a
 * component where nobody can check them.
 *
 * WHAT DRAGGING MEANS DEPENDS ON WHAT IS UNDER THE POINTER
 *
 * Dragging the logo moves the logo. Dragging a photograph does NOT move the
 * photograph — it moves the CROP, which is the opposite direction: pulling
 * right should bring more of the right-hand side of the picture into view, the
 * way dragging a map works. Getting that sign wrong is the single most
 * noticeable way this kind of editor feels broken, so it is stated once, here,
 * with a test that would fail if it were flipped.
 *
 * ORDER MATTERS, AND IT IS THE REVERSE OF THE DRAWING ORDER
 *
 * The renderer paints photographs, then the banner, then the headline, then a
 * freed logo on top. A click lands on whatever is visually uppermost, so this
 * tests them in the opposite order. Hit-testing in drawing order would hand you
 * the photograph underneath a logo you were plainly aiming at.
 */

export interface Rect { x: number; y: number; width: number; height: number }
export interface Size { width: number; height: number }

/** What is under the pointer. */
export type HitKind = 'logo' | 'banner' | 'text' | 'before' | 'after' | null;

export interface Hit {
  kind: HitKind;
  /** The box it occupies, for drawing a highlight around it. */
  rect: Rect | null;
}

/** The boxes the renderer actually drew, as the component knows them. */
export interface HitBoxes {
  /** Only when the logo is placed loose rather than in the brand strip. */
  logo?: Rect | null;
  banner?: Rect | null;
  text?: Rect | null;
  /** The panes, with the role each one shows. */
  panes: Array<{ role: 'before' | 'after'; dest: Rect }>;
}

const inside = (r: Rect | null | undefined, x: number, y: number): boolean =>
  Boolean(r) && x >= r!.x && x <= r!.x + r!.width && y >= r!.y && y <= r!.y + r!.height;

/**
 * Screen coordinates to canvas coordinates.
 *
 * `rect` is the element's on-screen box from `getBoundingClientRect`. The
 * canvas is drawn with `object-contain`, so it is letterboxed inside that box
 * when the aspect ratios differ — and the letterbox has to be subtracted or
 * every drag is offset by the size of the bars.
 */
export function toCanvasPoint(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  canvas: Size,
): { x: number; y: number } {
  const boxW = Math.max(1, rect.width);
  const boxH = Math.max(1, rect.height);
  const cw = Math.max(1, canvas.width);
  const ch = Math.max(1, canvas.height);

  // `object-contain`: the smaller scale wins, and the remainder is the bars.
  const scale = Math.min(boxW / cw, boxH / ch);
  const drawnW = cw * scale;
  const drawnH = ch * scale;
  const padX = (boxW - drawnW) / 2;
  const padY = (boxH - drawnH) / 2;

  return {
    x: (clientX - rect.left - padX) / scale,
    y: (clientY - rect.top - padY) / scale,
  };
}

/** How many canvas pixels one screen pixel is worth, for converting a drag. */
export function canvasScale(
  rect: { width: number; height: number },
  canvas: Size,
): number {
  const scale = Math.min(
    Math.max(1, rect.width) / Math.max(1, canvas.width),
    Math.max(1, rect.height) / Math.max(1, canvas.height),
  );
  return scale > 0 ? scale : 1;
}

/**
 * What is under this canvas point.
 *
 * Topmost first, mirroring the renderer in reverse.
 */
export function hitTest(point: { x: number; y: number }, boxes: HitBoxes): Hit {
  const { x, y } = point;

  if (inside(boxes.logo, x, y)) return { kind: 'logo', rect: boxes.logo! };
  if (inside(boxes.text, x, y)) return { kind: 'text', rect: boxes.text! };
  if (inside(boxes.banner, x, y)) return { kind: 'banner', rect: boxes.banner! };

  /*
   * Panes last, and in reverse too. A diagonal layout gives the two panes
   * overlapping bounding boxes even though the drawn shapes do not overlap —
   * the clip is a triangle, the box is a rectangle. Taking the later pane
   * first matches which one is drawn over the other at the seam.
   */
  for (let i = boxes.panes.length - 1; i >= 0; i--) {
    const pane = boxes.panes[i];
    if (inside(pane.dest, x, y)) return { kind: pane.role, rect: pane.dest };
  }

  return { kind: null, rect: null };
}

/**
 * A drag in canvas pixels, as a change to a placement's offset.
 *
 * Offsets are fractions of the canvas, so a drag has to be divided by the
 * canvas dimension rather than used raw.
 */
export function dragToOffset(
  dxCanvas: number,
  dyCanvas: number,
  canvas: Size,
): { offsetX: number; offsetY: number } {
  return {
    offsetX: dxCanvas / Math.max(1, canvas.width),
    offsetY: dyCanvas / Math.max(1, canvas.height),
  };
}

/**
 * A drag on a PHOTOGRAPH, as a change to its framing offset.
 *
 * INVERTED, and this is the line that decides whether the tool feels right.
 * Framing offsets move the CROP WINDOW across the source image. Dragging the
 * picture to the right means "show me more of what is off to the left", which
 * is the crop window moving LEFT. Every map, every photo editor and every
 * phone gallery behaves this way, so matching it is not a preference.
 *
 * Scaled by the slack available: `framedCrop` expresses offsets as -1..1 across
 * whatever room the crop has to move, so a drag across the full pane is one
 * full unit of offset and a drag on a photograph with little slack covers its
 * range sooner. That is correct — there is less to see.
 */
export function dragToFraming(
  dxCanvas: number,
  dyCanvas: number,
  pane: Size,
): { offsetX: number; offsetY: number } {
  return {
    offsetX: (-2 * dxCanvas) / Math.max(1, pane.width),
    offsetY: (-2 * dyCanvas) / Math.max(1, pane.height),
  };
}

/** Keep a value in range after a drag has been added to it. */
export const clampUnit = (n: number): number => Math.min(1, Math.max(-1, n));
