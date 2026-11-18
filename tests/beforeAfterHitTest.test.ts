/**
 * Grabbing things on the canvas.
 *
 * Two properties decide whether direct manipulation feels right or broken, and
 * both are arithmetic rather than taste:
 *
 *   the thing under your finger stays under your finger — which needs the
 *   screen-to-canvas conversion, letterbox and all, to be exact;
 *
 *   dragging a photograph moves the view the way a map does, not the way a
 *   sticker does — which needs one sign to be the right way round.
 *
 * Both are pinned here.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canvasScale,
  clampUnit,
  dragToFraming,
  dragToOffset,
  hitTest,
  toCanvasPoint,
  type HitBoxes,
} from '../src/app/lib/beforeAfterHitTest.ts';

const square = { width: 1080, height: 1080 };
const reel = { width: 1080, height: 1920 };

const boxes = (over: Partial<HitBoxes> = {}): HitBoxes => ({
  panes: [
    { role: 'before', dest: { x: 0, y: 0, width: 540, height: 1080 } },
    { role: 'after', dest: { x: 540, y: 0, width: 540, height: 1080 } },
  ],
  ...over,
});

test('a point lands on the pane it is actually over', () => {
  assert.equal(hitTest({ x: 100, y: 500 }, boxes()).kind, 'before');
  assert.equal(hitTest({ x: 900, y: 500 }, boxes()).kind, 'after');
});

test('a point on nothing returns nothing rather than the nearest thing', () => {
  const h = hitTest({ x: 5000, y: 5000 }, boxes());
  assert.equal(h.kind, null);
  assert.equal(h.rect, null);
});

test('the logo wins over the photograph underneath it', () => {
  // The renderer draws a freed logo last, so a click there is aimed at the
  // logo. Hit-testing in drawing order would hand back the photograph.
  const withLogo = boxes({ logo: { x: 60, y: 940, width: 160, height: 80 } });
  assert.equal(hitTest({ x: 100, y: 980 }, withLogo).kind, 'logo');
  // And just outside it, the photograph again.
  assert.equal(hitTest({ x: 100, y: 900 }, withLogo).kind, 'before');
});

test('the stacking order is logo over text over banner over photos', () => {
  const all = boxes({
    logo: { x: 100, y: 100, width: 200, height: 200 },
    text: { x: 100, y: 100, width: 200, height: 200 },
    banner: { x: 100, y: 100, width: 200, height: 200 },
  });
  assert.equal(hitTest({ x: 150, y: 150 }, all).kind, 'logo');

  const noLogo = boxes({
    text: { x: 100, y: 100, width: 200, height: 200 },
    banner: { x: 100, y: 100, width: 200, height: 200 },
  });
  assert.equal(hitTest({ x: 150, y: 150 }, noLogo).kind, 'text');

  const bannerOnly = boxes({ banner: { x: 100, y: 100, width: 200, height: 200 } });
  assert.equal(hitTest({ x: 150, y: 150 }, bannerOnly).kind, 'banner');
});

test('an absent element is never hit', () => {
  const h = hitTest({ x: 150, y: 150 }, boxes({ logo: null, banner: null, text: null }));
  assert.equal(h.kind, 'before');
});

test('screen coordinates convert exactly, with no letterbox', () => {
  // A 540px-wide box showing a 1080 square: half scale, no bars.
  const rect = { left: 0, top: 0, width: 540, height: 540 };
  assert.deepEqual(toCanvasPoint(0, 0, rect, square), { x: 0, y: 0 });
  assert.deepEqual(toCanvasPoint(270, 270, rect, square), { x: 540, y: 540 });
  assert.deepEqual(toCanvasPoint(540, 540, rect, square), { x: 1080, y: 1080 });
});

test('the letterbox is subtracted, or every drag is off by the bars', () => {
  // A 1080x1920 reel shown in a 600x600 box: it fits by height, so there are
  // bars left and right. The centre of the box must still be the centre of the
  // canvas.
  const rect = { left: 0, top: 0, width: 600, height: 600 };
  const mid = toCanvasPoint(300, 300, rect, reel);
  assert.equal(Math.round(mid.x), 540);
  assert.equal(Math.round(mid.y), 960);

  // And the top-left of the DRAWN area, not of the box.
  const scale = 600 / 1920;
  const padX = (600 - 1080 * scale) / 2;
  const topLeft = toCanvasPoint(padX, 0, rect, reel);
  assert.equal(Math.round(topLeft.x), 0);
  assert.equal(Math.round(topLeft.y), 0);
});

test('an offset page does not shift the drag', () => {
  // getBoundingClientRect carries the element's position; ignoring it puts the
  // grab point in the wrong place on every scrolled page.
  const rect = { left: 120, top: 80, width: 540, height: 540 };
  assert.deepEqual(toCanvasPoint(120, 80, rect, square), { x: 0, y: 0 });
});

test('the scale says how many screen pixels a canvas pixel is', () => {
  assert.equal(canvasScale({ width: 540, height: 540 }, square), 0.5);
  assert.equal(canvasScale({ width: 600, height: 600 }, reel), 600 / 1920);
});

test('a placement drag is a fraction of the canvas', () => {
  // Offsets are fractions, so a raw pixel delta would move things wildly.
  const d = dragToOffset(108, 54, square);
  assert.ok(Math.abs(d.offsetX - 0.1) < 1e-9);
  assert.ok(Math.abs(d.offsetY - 0.05) < 1e-9);
});

test('DRAGGING A PHOTO MOVES THE VIEW LIKE A MAP, not like a sticker', () => {
  // The sign that decides whether this feels right. Pulling the picture to the
  // right means "show me more of the left", which is the crop window moving
  // left — a NEGATIVE offset.
  const pane = { width: 540, height: 1080 };
  const right = dragToFraming(100, 0, pane);
  assert.ok(right.offsetX < 0, 'dragging right must decrease the crop offset');

  const down = dragToFraming(0, 100, pane);
  assert.ok(down.offsetY < 0, 'dragging down must decrease the crop offset');

  // Dragging back the other way undoes it exactly.
  const left = dragToFraming(-100, 0, pane);
  assert.ok(Math.abs(left.offsetX + right.offsetX) < 1e-9);
});

test('a drag across the whole pane covers the whole range', () => {
  // -1 to 1 is the full travel, so a full-width drag should be about 2 units.
  const pane = { width: 540, height: 1080 };
  const full = dragToFraming(540, 0, pane);
  assert.ok(Math.abs(full.offsetX + 2) < 1e-9);
});

test('offsets stay in range however far somebody drags', () => {
  assert.equal(clampUnit(5), 1);
  assert.equal(clampUnit(-5), -1);
  assert.equal(clampUnit(0.3), 0.3);
});

test('a zero-sized box does not divide by zero', () => {
  // Happens on the first render, before layout has run.
  const p = toCanvasPoint(10, 10, { left: 0, top: 0, width: 0, height: 0 }, square);
  assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
  assert.ok(Number.isFinite(canvasScale({ width: 0, height: 0 }, square)));
  assert.ok(Number.isFinite(dragToFraming(10, 10, { width: 0, height: 0 }).offsetX));
});
