/**
 * Zooming and moving a photograph inside its pane.
 *
 * Eric: "i need to be able to zoom in and out on the picture i uploaded to make
 * is look correct."
 *
 * The crop is the one thing in this tool that can quietly ruin a published
 * post: a source rectangle that runs off the edge of the bitmap does not throw,
 * it paints the overhang as nothing, and the result is a black band down the
 * side of a photograph on a finished design. So the properties pinned here are
 * mostly about staying inside the image.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  coverCrop,
  framedCrop,
  composeBeforeAfter,
  NO_FRAMING,
  MAX_ZOOM,
} from '../src/app/lib/beforeAfterLayout.ts';

const landscape = { width: 4000, height: 3000 };
const portrait = { width: 3000, height: 4000 };
const pane = { width: 1000, height: 1000 };

test('no framing is the old centred crop, to the pixel', () => {
  // The compatibility property. Every design made before this existed must
  // render identically, or adding the feature silently re-crops them all.
  for (const source of [landscape, portrait, { width: 1920, height: 1080 }]) {
    for (const target of [pane, { width: 1080, height: 1920 }, { width: 500, height: 300 }]) {
      assert.deepEqual(framedCrop(source, target, NO_FRAMING), coverCrop(source, target));
      assert.deepEqual(framedCrop(source, target, null), coverCrop(source, target));
      assert.deepEqual(framedCrop(source, target, undefined), coverCrop(source, target));
    }
  }
});

test('zooming in reads less of the source', () => {
  const at1 = framedCrop(landscape, pane, { zoom: 1, offsetX: 0, offsetY: 0 });
  const at2 = framedCrop(landscape, pane, { zoom: 2, offsetX: 0, offsetY: 0 });
  assert.equal(at2.width, Math.round(at1.width / 2));
  assert.equal(at2.height, Math.round(at1.height / 2));
});

test('the crop never leaves the image, at any zoom or offset', () => {
  // The one that matters. A crop running past the edge paints black.
  for (const source of [landscape, portrait, { width: 640, height: 640 }]) {
    for (const zoom of [1, 1.3, 2, 4, MAX_ZOOM]) {
      for (const offsetX of [-1, -0.4, 0, 0.7, 1]) {
        for (const offsetY of [-1, 0, 1]) {
          const crop = framedCrop(source, pane, { zoom, offsetX, offsetY });
          assert.ok(crop.x >= 0, `x ${crop.x} < 0`);
          assert.ok(crop.y >= 0, `y ${crop.y} < 0`);
          assert.ok(crop.width > 0 && crop.height > 0, 'a crop must have size');
          assert.ok(
            crop.x + crop.width <= source.width,
            `right edge ${crop.x + crop.width} past ${source.width} (zoom ${zoom}, x ${offsetX})`,
          );
          assert.ok(
            crop.y + crop.height <= source.height,
            `bottom edge ${crop.y + crop.height} past ${source.height} (zoom ${zoom}, y ${offsetY})`,
          );
        }
      }
    }
  }
});

test('zooming out below the pane is refused, not honoured', () => {
  // Below 1 the crop would be bigger than the source and the pane would get a
  // black band. Clamped rather than rejected: a slider that sticks at its end
  // explains itself, an error does not.
  const floor = framedCrop(landscape, pane, { zoom: 1, offsetX: 0, offsetY: 0 });
  assert.deepEqual(framedCrop(landscape, pane, { zoom: 0.5, offsetX: 0, offsetY: 0 }), floor);
  assert.deepEqual(framedCrop(landscape, pane, { zoom: 0, offsetX: 0, offsetY: 0 }), floor);
  assert.deepEqual(framedCrop(landscape, pane, { zoom: -3, offsetX: 0, offsetY: 0 }), floor);
});

test('zoom is capped so a pane cannot read a postage stamp', () => {
  const atMax = framedCrop(landscape, pane, { zoom: MAX_ZOOM, offsetX: 0, offsetY: 0 });
  const beyond = framedCrop(landscape, pane, { zoom: 500, offsetX: 0, offsetY: 0 });
  assert.deepEqual(beyond, atMax);
});

test('an offset reaches the part of the photo the centred crop threw away', () => {
  // A 4000x3000 source in a square pane: `coverCrop` keeps the middle 3000
  // and discards 500 either side. Being able to get at those 500 is most of
  // the point — the subject is often not in the middle.
  const centred = framedCrop(landscape, pane, { zoom: 1, offsetX: 0, offsetY: 0 });
  const left = framedCrop(landscape, pane, { zoom: 1, offsetX: -1, offsetY: 0 });
  const right = framedCrop(landscape, pane, { zoom: 1, offsetX: 1, offsetY: 0 });

  assert.equal(centred.x, 500);
  assert.equal(left.x, 0, 'hard left should start at the edge');
  assert.equal(right.x + right.width, landscape.width, 'hard right should end at the edge');
});

test('an offset on an axis with no slack does nothing', () => {
  // At zoom 1 a 4000x3000 source in a square pane uses the full height. There
  // is nowhere to move vertically, and pretending otherwise would shift the
  // crop off the image.
  const centred = framedCrop(landscape, pane, { zoom: 1, offsetX: 0, offsetY: 0 });
  const pushed = framedCrop(landscape, pane, { zoom: 1, offsetX: 0, offsetY: 1 });
  assert.deepEqual(pushed, centred);
});

test('nonsense framing falls back to centred rather than throwing', () => {
  // These arrive from stored designs and from half-typed input.
  const centred = framedCrop(landscape, pane, NO_FRAMING);
  assert.deepEqual(framedCrop(landscape, pane, { zoom: NaN, offsetX: NaN, offsetY: NaN }), centred);
  assert.deepEqual(framedCrop(landscape, pane, {} as any), centred);
  assert.deepEqual(
    framedCrop(landscape, pane, { zoom: 'big', offsetX: null, offsetY: undefined } as any),
    centred,
  );
});

test('offsets beyond the ends are clamped, not wrapped', () => {
  const right = framedCrop(landscape, pane, { zoom: 1, offsetX: 1, offsetY: 0 });
  assert.deepEqual(framedCrop(landscape, pane, { zoom: 1, offsetX: 99, offsetY: 0 }), right);
});

test('a portrait photo in a square pane has vertical slack instead', () => {
  const centred = framedCrop(portrait, pane, { zoom: 1, offsetX: 0, offsetY: 0 });
  const top = framedCrop(portrait, pane, { zoom: 1, offsetX: 0, offsetY: -1 });
  assert.equal(centred.y, 500);
  assert.equal(top.y, 0);
});

test('the composition carries each photo its own framing', () => {
  // The two are rarely wrong in the same way: the before is the whole room,
  // the after is the detail worth seeing.
  const comp = composeBeforeAfter({
    layout: 'side-by-side',
    size: 'square',
    before: landscape,
    after: landscape,
    beforeFraming: { zoom: 1, offsetX: 0, offsetY: 0 },
    afterFraming: { zoom: 3, offsetX: 0, offsetY: 0 },
  });
  const before = comp.panes.find((p) => p.role === 'before')!;
  const after = comp.panes.find((p) => p.role === 'after')!;
  assert.ok(after.source.width < before.source.width, 'the zoomed pane should read less source');
});

test('a composition with no framing matches one built before the feature', () => {
  const plain = composeBeforeAfter({
    layout: 'side-by-side', size: 'square', before: landscape, after: portrait,
  });
  const explicit = composeBeforeAfter({
    layout: 'side-by-side', size: 'square', before: landscape, after: portrait,
    beforeFraming: NO_FRAMING, afterFraming: NO_FRAMING,
  });
  assert.deepEqual(plain.panes, explicit.panes);
});
