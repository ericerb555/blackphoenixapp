/**
 * `roomViewFromAnalysis` — turning an interior photo read into a house view.
 *
 * WHY THIS IS TESTED AND THE EXTERIOR READ IS NOT
 *
 * Because the expensive half cannot be. The read itself is a vision call, so
 * exercising it costs money and needs a real photograph of a real room; what it
 * returns is a JSON object, and everything downstream depends on this function
 * turning that object into the record the kitchen, bathroom and flooring tools
 * measure from. So the model call is verified by hand with a real room, once,
 * and the conversion is pinned here where it runs for free on every change.
 *
 * The interesting assertions are about PROVENANCE, not arithmetic. A number
 * that came from a photograph and a number that is a blank default must never
 * look alike, because the whole defence against quoting a room a foot wider
 * than it is rests on the screen being honest about which is which.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roomViewFromAnalysis, blankView, mergeRead, setMeasured } from '../src/app/lib/houseModel.ts';

/** A read of a small bathroom, in the shape the room prompt asks for. */
const bathroom = {
  room: {
    type: 'bathroom',
    lengthFt: 9,
    widthFt: 5.5,
    ceilingHeightFt: 8,
    basis: 'scale-object',
    reference: 'sheet of US Letter taped beside the door',
    confidence: 'high',
    shape: 'rectangular',
  },
  openings: [
    { kind: 'door', wall: 'door', offsetFt: 2, widthFt: 2.5, heightFt: 6.67, confidence: 'high' },
    { kind: 'window', wall: 'opposite', offsetFt: 4.5, widthFt: 3, heightFt: 3, sillHeightFt: 4, confidence: 'medium' },
    { kind: 'window', wall: 'opposite', offsetFt: 7.5, widthFt: 2, heightFt: 3, sillHeightFt: 4, confidence: 'low' },
  ],
  fittings: [
    { item: 'tub', wall: 'opposite', offsetFt: 3, lengthFt: 5, description: '60in alcove tub' },
  ],
};

// ── the shape of the room ──────────────────────────────────────────────────

test('the long dimension becomes the width and the short one the depth', () => {
  const view = roomViewFromAnalysis(bathroom, 'Main bath');
  assert.equal(view.widthFt, 9);
  assert.equal(view.depthFt, 5.5);
  assert.equal(view.heightFt, 8);
  assert.equal(view.kind, 'room');
  assert.equal(view.name, 'Main bath');
});

test('length and width are sorted, not trusted, because people swap the words', () => {
  // The same room described the other way round must produce the same view.
  const swapped = { room: { ...bathroom.room, lengthFt: 5.5, widthFt: 9 } };
  const view = roomViewFromAnalysis(swapped);
  assert.equal(view.widthFt, 9);
  assert.equal(view.depthFt, 5.5);
});

test('a room is one storey, said rather than left to a default', () => {
  const view = roomViewFromAnalysis(bathroom);
  assert.equal(view.storeys, 1);
  assert.equal(view.source.storeys, 'photos');
});

// ── provenance: the part that matters ──────────────────────────────────────

test('what the read supplied is marked photos', () => {
  const view = roomViewFromAnalysis(bathroom);
  assert.equal(view.source.widthFt, 'photos');
  assert.equal(view.source.depthFt, 'photos');
  assert.equal(view.source.heightFt, 'photos');
});

test('what the read omitted keeps the blank default AND stays estimated', () => {
  // A read that found the floor but could not see the ceiling.
  const partial = { room: { lengthFt: 12, widthFt: 10 } };
  const view = roomViewFromAnalysis(partial);
  const blank = blankView('x', 'room');
  assert.equal(view.heightFt, blank.heightFt, 'height should fall back to the blank default');
  assert.equal(view.source.heightFt, 'estimated', 'and must not claim to be from photos');
});

test('an empty or malformed analysis yields a blank room, not a broken one', () => {
  for (const bad of [null, undefined, 'not an object', 42, {}]) {
    const view = roomViewFromAnalysis(bad as any, 'Room');
    assert.equal(view.kind, 'room');
    assert.equal(view.source.widthFt, 'estimated');
    assert.equal(view.openings.length, 0);
  }
});

test('zero and negative dimensions are refused rather than written in', () => {
  const view = roomViewFromAnalysis({ room: { lengthFt: 0, widthFt: -3, ceilingHeightFt: 0 } });
  assert.equal(view.source.widthFt, 'estimated');
  assert.equal(view.source.heightFt, 'estimated');
  assert.ok(view.widthFt > 0, 'must keep the blank default rather than a zero');
});

// ── openings: one wall, chosen rather than assumed ─────────────────────────

test('the busiest wall is the one carried across', () => {
  const view = roomViewFromAnalysis(bathroom);
  // Two windows on 'opposite' beat one door on 'door'.
  assert.equal(view.openings.length, 2);
  assert.ok(view.openings.every(o => o.kind === 'window'));
});

test('a reported centre becomes a left edge, because that is what Opening stores', () => {
  const view = roomViewFromAnalysis(bathroom);
  const first = view.openings[0];
  // Centre 4.5ft, 3ft wide -> left edge at 3ft.
  assert.equal(first.offsetFt, 3);
  assert.equal(first.widthFt, 3);
});

test('an opening whose centre is nearer the corner than its half-width clamps to zero', () => {
  const view = roomViewFromAnalysis({
    room: { lengthFt: 10, widthFt: 8 },
    openings: [{ kind: 'window', wall: 'left', offsetFt: 0.5, widthFt: 3, heightFt: 3 }],
  });
  assert.equal(view.openings[0].offsetFt, 0, 'a negative offset would place it outside the room');
});

test('doors sit on the floor and windows keep their reported sill', () => {
  const view = roomViewFromAnalysis({
    room: { lengthFt: 10, widthFt: 8 },
    openings: [{ kind: 'door', wall: 'left', offsetFt: 3, widthFt: 2.5, heightFt: 6.67, sillHeightFt: 9 }],
  });
  assert.equal(view.openings[0].sillFt, 0, 'a door reported with a sill height is still on the floor');
});

test('an unknown opening kind becomes a window rather than corrupting the model', () => {
  const view = roomViewFromAnalysis({
    room: { lengthFt: 10, widthFt: 8 },
    openings: [{ kind: 'porthole', wall: 'left', offsetFt: 3, widthFt: 2, heightFt: 2 }],
  });
  assert.equal(view.openings[0].kind, 'window');
});

test('an opening with no usable width is dropped, not defaulted', () => {
  const view = roomViewFromAnalysis({
    room: { lengthFt: 10, widthFt: 8 },
    openings: [
      { kind: 'window', wall: 'left', offsetFt: 3, heightFt: 3 },
      { kind: 'window', wall: 'left', offsetFt: 6, widthFt: 2, heightFt: 3 },
    ],
  });
  assert.equal(view.openings.length, 1, 'a width-less opening is not a 3ft window');
});

test('openings are marked photos only because the read places each one itself', () => {
  // Unlike the elevation read, which returns a count and spreads them evenly
  // and must therefore mark them estimated.
  const view = roomViewFromAnalysis(bathroom);
  assert.equal(view.source.openings, 'photos');
});

test('no openings leaves the field estimated rather than claiming an empty read', () => {
  const view = roomViewFromAnalysis({ room: { lengthFt: 10, widthFt: 8 } });
  assert.equal(view.source.openings, 'estimated');
});

// ── merging a second read into a room ──────────────────────────────────────
//
// A room gets photographed twice more often than an elevation does: somebody
// shoots it, looks at the numbers, then goes back and shoots it properly.

test('a second read updates the depth, which it used to drop silently', () => {
  const first = roomViewFromAnalysis({ room: { lengthFt: 12, widthFt: 9, ceilingHeightFt: 8 } }, 'Kitchen');
  const second = roomViewFromAnalysis({ room: { lengthFt: 12, widthFt: 10.5, ceilingHeightFt: 8 } }, 'Kitchen');
  const merged = mergeRead(first, second);
  assert.equal(merged.depthFt, 10.5, 'the corrected second dimension must survive the merge');
  assert.equal(merged.source.depthFt, 'photos');
});

test('a measured dimension beats a later photo read, depth included', () => {
  const read = roomViewFromAnalysis({ room: { lengthFt: 12, widthFt: 9, ceilingHeightFt: 8 } });
  const taped = setMeasured(read, 'depthFt', 9.25);
  const again = roomViewFromAnalysis({ room: { lengthFt: 12, widthFt: 40, ceilingHeightFt: 8 } });
  const merged = mergeRead(taped, again);
  assert.equal(merged.depthFt, 9.25, 'somebody stood there with a tape; a photo does not overrule that');
  assert.equal(merged.source.depthFt, 'measured');
});

test('merging into an elevation is unaffected by depth being in the list', () => {
  const a = blankView('Back', 'elevation');
  const b = blankView('Back', 'elevation');
  const merged = mergeRead(a, b);
  assert.equal(merged.depthFt, undefined);
  assert.equal(merged.kind, 'elevation');
});
