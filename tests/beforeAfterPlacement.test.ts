/**
 * Putting the logo, the headline and a banner where somebody wants them.
 *
 * The property that matters is containment. A logo half off the edge is not a
 * style choice made deliberately at 2am — it is a mistake that reaches a
 * customer's feed, and unlike a bad crop it is invisible in the thumbnail. So
 * most of this is "it stayed inside the frame", checked at every anchor, every
 * extreme of the offset, and both output shapes.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ANCHORS,
  DEFAULT_LOGO_PLACEMENT,
  EDGE_MARGIN,
  placeOn,
  placeText,
  readPlacement,
  type Anchor,
  type Placement,
} from '../src/app/lib/beforeAfterPlacement.ts';

const square = { width: 1080, height: 1080 };
const reel = { width: 1080, height: 1920 };
const at = (anchor: Anchor, over: Partial<Placement> = {}): Placement =>
  ({ anchor, scale: 0.2, offsetX: 0, offsetY: 0, ...over });

test('every anchor, on both canvases, lands fully inside the frame', () => {
  for (const canvas of [square, reel]) {
    for (const anchor of ANCHORS) {
      for (const scale of [0.02, 0.2, 0.6, 1]) {
        for (const offsetX of [-0.5, 0, 0.5]) {
          for (const offsetY of [-0.5, 0, 0.5]) {
            const r = placeOn(canvas, 1.6, at(anchor, { scale, offsetX, offsetY }));
            assert.ok(r.x >= 0, `${anchor} x ${r.x}`);
            assert.ok(r.y >= 0, `${anchor} y ${r.y}`);
            assert.ok(r.x + r.width <= canvas.width, `${anchor} right edge`);
            assert.ok(r.y + r.height <= canvas.height, `${anchor} bottom edge`);
            assert.ok(r.width > 0 && r.height > 0, `${anchor} has size`);
          }
        }
      }
    }
  }
});

test('the anchors actually sit where they are named', () => {
  const left = placeOn(square, 1, at('top-left'));
  const right = placeOn(square, 1, at('top-right'));
  const centre = placeOn(square, 1, at('middle-center'));
  const bottom = placeOn(square, 1, at('bottom-center'));

  assert.ok(left.x < centre.x, 'left is left of centre');
  assert.ok(right.x > centre.x, 'right is right of centre');
  assert.ok(bottom.y > centre.y, 'bottom is below centre');
  // Centre means centre, to the pixel.
  assert.equal(centre.x + centre.width / 2, square.width / 2);
});

test('an item keeps its own proportions', () => {
  // A wide logo squeezed into a square box is the thing people notice first.
  const wide = placeOn(square, 3, at('top-left', { scale: 0.3 }));
  assert.equal(wide.width, 324);
  assert.equal(wide.height, 108);
});

test('the margin keeps an unnudged item off the edge', () => {
  const r = placeOn(square, 1, at('top-left'));
  assert.equal(r.x, Math.round(square.width * EDGE_MARGIN));
  assert.equal(r.y, Math.round(square.height * EDGE_MARGIN));
});

test('a nudge can reach the edge but not pass it', () => {
  const pushed = placeOn(square, 1, at('top-left', { offsetX: -0.5, offsetY: -0.5 }));
  assert.equal(pushed.x, 0);
  assert.equal(pushed.y, 0);
});

test('an item too big for the frame is placed, not given a negative corner', () => {
  // Full-width banner on a square: wider than the canvas less its margins.
  const r = placeOn(square, 4, { anchor: 'middle-center', scale: 1, offsetX: 0, offsetY: 0 });
  assert.equal(r.x, 0);
  assert.equal(r.width, square.width);
  assert.ok(r.y >= 0 && r.y + r.height <= square.height);
});

test('nonsense placements fall back rather than throwing', () => {
  const d = DEFAULT_LOGO_PLACEMENT;
  assert.deepEqual(readPlacement(null, d), d);
  assert.deepEqual(readPlacement(undefined, d), d);
  assert.deepEqual(readPlacement({} as any, d), d);
  assert.equal(readPlacement({ anchor: 'nowhere' } as any, d).anchor, d.anchor);
  assert.equal(readPlacement({ scale: NaN } as any, d).scale, d.scale);
  assert.equal(readPlacement({ offsetX: 'left' } as any, d).offsetX, 0);
});

test('a scale of zero is refused — invisible is not a decision', () => {
  const p = readPlacement({ scale: 0 }, DEFAULT_LOGO_PLACEMENT);
  assert.equal(p.scale, DEFAULT_LOGO_PLACEMENT.scale);
  const tiny = readPlacement({ scale: 0.0001 }, DEFAULT_LOGO_PLACEMENT);
  assert.equal(tiny.scale, 0.02, 'clamped to the floor, not to nothing');
});

test('a scale beyond the canvas is capped at the canvas', () => {
  assert.equal(readPlacement({ scale: 5 }, DEFAULT_LOGO_PLACEMENT).scale, 1);
});

test('text gets a font size tied to the band it fills', () => {
  const narrow = placeText(square, { anchor: 'bottom-center', scale: 0.4, offsetX: 0, offsetY: 0 });
  const wide = placeText(square, { anchor: 'bottom-center', scale: 0.92, offsetX: 0, offsetY: 0 });
  // Widening the band makes the words bigger, which is what dragging it
  // implies. The alternative — a fixed size in a wider box — looks broken.
  assert.ok(wide.fontSize > narrow.fontSize);
  assert.ok(narrow.fontSize >= 10, 'never smaller than legible');
});

test('a two-line headline is twice as tall and still inside the frame', () => {
  const one = placeText(square, { anchor: 'bottom-center', scale: 0.9, offsetX: 0, offsetY: 0 }, 1);
  const two = placeText(square, { anchor: 'bottom-center', scale: 0.9, offsetX: 0, offsetY: 0 }, 2);
  assert.ok(two.height > one.height);
  assert.ok(two.y + two.height <= square.height);
});

test('the same placement moves with the output size', () => {
  // The whole reason for anchors rather than coordinates: a design made square
  // must still read correctly as a 1080x1920 reel.
  const p: Placement = { anchor: 'bottom-right', scale: 0.2, offsetX: 0, offsetY: 0 };
  const s = placeOn(square, 1, p);
  const r = placeOn(reel, 1, p);
  const fromRight = (c: typeof square, box: { x: number; width: number }) => c.width - (box.x + box.width);
  const fromBottom = (c: typeof square, box: { y: number; height: number }) => c.height - (box.y + box.height);
  assert.equal(fromRight(square, s), fromRight(reel, r), 'same inset from the right');
  assert.equal(fromBottom(square, s), fromBottom(reel, r), 'same inset from the bottom');
});
