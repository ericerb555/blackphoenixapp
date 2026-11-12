/**
 * Where the two photographs go.
 *
 * WHY THIS IS WORTH TESTING WHEN THE OUTPUT IS A PICTURE
 *
 * The drawing needs a browser and cannot be asserted here. The DECIDING does
 * not, and the deciding is where the faults that matter live: a photograph
 * stretched to fit, a pane drawn off the edge of the canvas, two panes of
 * different sizes so one looks favoured, a label with no room for its text.
 *
 * Every one of those ships a distorted photograph of a customer's house to
 * every follower the company has, and none of them is obvious in a thumbnail.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  composeBeforeAfter, coverCrop, OUTPUT_SIZES, LAYOUTS,
  type BeforeAfterLayout,
} from '../src/app/lib/beforeAfterLayout.ts';

/* A wide phone photo and a tall one, which is the awkward real case. */
const WIDE = { width: 4032, height: 3024 };
const TALL = { width: 3024, height: 4032 };

const near = (a: number, b: number, tol = 0.5) => Math.abs(a - b) <= tol;

/* ── the crop never distorts, and never leaves the source ────────────────── */

test('a crop keeps the target aspect exactly', () => {
  const crop = coverCrop(WIDE, { width: 540, height: 1080 });
  assert.ok(near(crop.width / crop.height, 540 / 1080, 0.001), 'aspect must match the target');
});

test('a crop never reads outside the photograph', () => {
  for (const source of [WIDE, TALL, { width: 100, height: 4000 }]) {
    for (const target of [{ width: 1080, height: 1080 }, { width: 1080, height: 1920 }, { width: 520, height: 1000 }]) {
      const c = coverCrop(source, target);
      assert.ok(c.x >= 0 && c.y >= 0, 'crop starts inside the image');
      assert.ok(c.x + c.width <= source.width + 0.01, 'crop ends inside the width');
      assert.ok(c.y + c.height <= source.height + 0.01, 'crop ends inside the height');
    }
  }
});

test('a crop is centred, so two photos of the same room stay aligned', () => {
  const c = coverCrop(WIDE, { width: 1000, height: 1000 });
  // Equal margin either side: the subject does not drift between panes.
  assert.ok(near(c.x, (WIDE.width - c.width) / 2));
  assert.equal(c.y, 0);
});

test('a photograph already the right shape is not cropped at all', () => {
  const c = coverCrop({ width: 1080, height: 1080 }, { width: 540, height: 540 });
  assert.deepEqual(c, { x: 0, y: 0, width: 1080, height: 1080 });
});

test('a nonsense size does not produce a nonsense crop', () => {
  const c = coverCrop({ width: 0, height: 0 } as any, { width: 1080, height: 1080 });
  assert.ok(c.width > 0 && c.height > 0);
  assert.ok(Number.isFinite(c.x) && Number.isFinite(c.y));
});

/* ── nothing is ever drawn off the canvas ────────────────────────────────── */

test('every pane of every layout stays on the canvas, at every size', () => {
  for (const { id } of LAYOUTS) {
    for (const size of ['square', 'portrait', 'story'] as const) {
      const c = composeBeforeAfter({ layout: id, size, before: WIDE, after: TALL });
      for (const pane of c.panes) {
        assert.ok(pane.dest.x >= -0.01, `${id}/${size}: pane starts left of the canvas`);
        assert.ok(pane.dest.y >= -0.01, `${id}/${size}: pane starts above the canvas`);
        assert.ok(
          pane.dest.x + pane.dest.width <= c.canvas.width + 0.01,
          `${id}/${size}: pane runs off the right`,
        );
        assert.ok(
          pane.dest.y + pane.dest.height <= c.canvas.height + 0.01,
          `${id}/${size}: pane runs off the bottom`,
        );
        assert.ok(pane.dest.width > 0 && pane.dest.height > 0, `${id}/${size}: empty pane`);
      }
    }
  }
});

test('every layout places something, and the comparison ones place both', () => {
  for (const { id } of LAYOUTS) {
    const c = composeBeforeAfter({ layout: id, size: 'square', before: WIDE, after: WIDE });
    assert.ok(c.panes.length >= 1, `${id} drew nothing`);
    if (id !== 'full-bleed') {
      const roles = c.panes.map((p) => p.role).sort();
      assert.deepEqual(roles, ['after', 'before'], `${id} must show both photographs`);
    } else {
      // The full transformation is the finished room, which is the point of it.
      assert.deepEqual(c.panes.map((p) => p.role), ['after']);
    }
  }
});

/* ── neither photograph is favoured ──────────────────────────────────────── */

test('the two panes of a comparison are the same size as each other', () => {
  for (const id of ['side-by-side', 'horizontal-split', 'framed', 'luxury'] as BeforeAfterLayout[]) {
    const c = composeBeforeAfter({ layout: id, size: 'square', before: WIDE, after: TALL });
    const [a, b] = c.panes;
    assert.ok(near(a.dest.width, b.dest.width), `${id}: panes differ in width`);
    assert.ok(near(a.dest.height, b.dest.height), `${id}: panes differ in height`);
  }
});

test('a wide photo and a tall one are cropped to the SAME shape as each other', () => {
  // The dishonest failure: cropping each to its own aspect, so the rooms are
  // shown at different scales and the comparison means nothing.
  const c = composeBeforeAfter({ layout: 'side-by-side', size: 'square', before: WIDE, after: TALL });
  const aspect = (p: { source: { width: number; height: number } }) => p.source.width / p.source.height;
  assert.ok(near(aspect(c.panes[0]), aspect(c.panes[1]), 0.01));
});

test('the before comes first, so the eye reads the change in order', () => {
  for (const id of ['side-by-side', 'horizontal-split', 'framed', 'luxury'] as BeforeAfterLayout[]) {
    const c = composeBeforeAfter({ layout: id, size: 'square', before: WIDE, after: WIDE });
    assert.equal(c.panes[0].role, 'before', `${id} leads with the after`);
  }
});

/* ── the labels ──────────────────────────────────────────────────────────── */

test('a label sits inside its own pane, never across the seam', () => {
  for (const { id } of LAYOUTS) {
    const c = composeBeforeAfter({ layout: id, size: 'portrait', before: WIDE, after: WIDE });
    for (const label of c.labels) {
      const pane = c.panes.find((p) => (p.role === 'before') === (label.text === 'BEFORE'));
      assert.ok(pane, `${id}: a label with no pane`);
      assert.ok(label.x >= pane.dest.x - 0.01, `${id}: label starts left of its pane`);
      assert.ok(
        label.x + label.width <= pane.dest.x + pane.dest.width + 0.01,
        `${id}: label runs past its pane`,
      );
      assert.ok(label.y + label.height <= pane.dest.y + pane.dest.height + 0.01);
    }
  }
});

test('a long custom label still fits the pane it belongs to', () => {
  const c = composeBeforeAfter({
    layout: 'side-by-side', size: 'square', before: WIDE, after: WIDE,
    beforeLabel: 'BEFORE — 1998 KITCHEN', afterLabel: 'AFTER',
  });
  for (const label of c.labels) {
    const pane = c.panes.find((p) => (p.role === 'before') === label.text.startsWith('BEFORE'))!;
    assert.ok(label.width <= pane.dest.width, 'a label must never be wider than its pane');
  }
});

test('labels and branding can both be switched off', () => {
  const c = composeBeforeAfter({
    layout: 'side-by-side', size: 'square', before: WIDE, after: WIDE,
    showLabels: false, showBrand: false,
  });
  assert.equal(c.labels.length, 0);
  assert.equal(c.brand, null);
});

/* ── the sizes the brief asks for ────────────────────────────────────────── */

test('the three export sizes are the ones the platforms want', () => {
  assert.deepEqual(
    [OUTPUT_SIZES.square, OUTPUT_SIZES.portrait, OUTPUT_SIZES.story].map((s) => `${s.width}x${s.height}`),
    ['1080x1080', '1080x1350', '1080x1920'],
  );
});

test('a canvas is exactly the size asked for, whatever the layout', () => {
  for (const { id } of LAYOUTS) {
    for (const size of ['square', 'portrait', 'story'] as const) {
      const c = composeBeforeAfter({ layout: id, size, before: WIDE, after: TALL });
      assert.deepEqual(c.canvas, { width: OUTPUT_SIZES[size].width, height: OUTPUT_SIZES[size].height });
    }
  }
});

test('the full transformation really is edge to edge', () => {
  const c = composeBeforeAfter({ layout: 'full-bleed', size: 'story', before: WIDE, after: WIDE });
  assert.deepEqual(c.panes[0].dest, { x: 0, y: 0, width: 1080, height: 1920 });
  assert.equal(c.padding, 0);
  assert.equal(c.brand, null, 'nothing is laid over a full-bleed photograph');
});

test('the brand strip is at the foot and never overlaps the photographs', () => {
  const c = composeBeforeAfter({ layout: 'side-by-side', size: 'square', before: WIDE, after: WIDE });
  assert.ok(c.brand);
  assert.ok(near(c.brand.y + c.brand.height, c.canvas.height), 'the strip sits at the foot');
  for (const pane of c.panes) {
    assert.ok(pane.dest.y + pane.dest.height <= c.brand.y + 0.01, 'a pane runs under the brand strip');
  }
});

test('an unknown size falls back rather than producing a zero canvas', () => {
  const c = composeBeforeAfter({ layout: 'side-by-side', size: 'banner' as any, before: WIDE, after: WIDE });
  assert.deepEqual(c.canvas, { width: 1080, height: 1080 });
});
