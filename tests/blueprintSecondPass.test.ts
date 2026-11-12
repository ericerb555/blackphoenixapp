/**
 * The second pass exists to fix small rooms, and the ways it can go wrong all
 * end with a worse number than the one it replaced.
 *
 * Two properties carry the weight. Tiles must cover the whole sheet with
 * enough overlap that no dimension label falls in a seam — a label read by
 * neither tile is exactly the failure this was built to end. And the merge
 * must be conservative: a tile disagreeing with a large room the whole-sheet
 * read got exactly right must not be allowed to overwrite it, because on the
 * measured evidence the whole-sheet figure is the better one there.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tileRegions, mergeReadings, roomsNeedingSecondPass,
  SMALL_ROOM_SQFT, TILE_OVERLAP, type RoomLike, type Reading,
} from '../src/app/lib/blueprintSecondPass.ts';

/* ── tiling ──────────────────────────────────────────────────────────────── */

test('four tiles, and between them they cover every pixel', () => {
  const [w, h] = [644, 1000];
  const tiles = tileRegions(w, h);
  assert.equal(tiles.length, 4);
  // Corners of the sheet must each fall inside some tile.
  for (const [px, py] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1], [w / 2, h / 2]]) {
    const covered = tiles.some((t) =>
      px >= t.x && px <= t.x + t.width && py >= t.y && py <= t.y + t.height);
    assert.ok(covered, `(${px},${py}) is in no tile`);
  }
});

test('neighbouring tiles overlap, so a label on the seam is read twice not never', () => {
  const tiles = tileRegions(1000, 1000);
  const left = tiles[0], right = tiles[1];
  const overlap = (left.x + left.width) - right.x;
  assert.ok(overlap > 0, 'tiles do not overlap');
  // Roughly the configured fraction, allowing for rounding.
  assert.ok(Math.abs(overlap - 1000 * TILE_OVERLAP) <= 2, `overlap was ${overlap}`);
});

test('no tile runs off the edge of the sheet', () => {
  for (const [w, h] of [[644, 1000], [3987, 2990], [101, 7]]) {
    for (const t of tileRegions(w, h)) {
      assert.ok(t.x >= 0 && t.y >= 0, 'negative origin');
      assert.ok(t.x + t.width <= w + 1, `tile exceeds width on ${w}x${h}`);
      assert.ok(t.y + t.height <= h + 1, `tile exceeds height on ${w}x${h}`);
    }
  }
});

test('a sheet with no size yields no tiles rather than a zero-size crop', () => {
  assert.deepEqual(tileRegions(0, 0), []);
  assert.deepEqual(tileRegions(-5, 100), []);
});

/* ── which rooms are worth a second read ─────────────────────────────────── */

test('unmeasured and small rooms are picked, large ones are left alone', () => {
  const rooms: RoomLike[] = [
    { name: 'Lounge', squareFootage: 255 },
    { name: 'Bathroom', squareFootage: 21 },
    { name: 'Hall', squareFootage: null },
    { name: 'Kitchen', squareFootage: 120 },
    { name: 'Vestibule', squareFootage: 9 },
  ];
  assert.deepEqual(roomsNeedingSecondPass(rooms), ['Bathroom', 'Hall', 'Vestibule']);
});

test('a nonsense area counts as unmeasured', () => {
  const rooms: RoomLike[] = [
    { name: 'A', squareFootage: 0 },
    { name: 'B', squareFootage: -4 },
    { name: 'C', squareFootage: Number.NaN },
  ];
  assert.deepEqual(roomsNeedingSecondPass(rooms), ['A', 'B', 'C']);
});

/* ── merging, which is where a second pass can make things worse ─────────── */

test('a null room takes the tile reading, with the area computed not trusted', () => {
  const out = mergeReadings(
    [{ name: 'Laundry', squareFootage: null }],
    [{ name: 'Laundry', lengthFt: 8.5, widthFt: 7.5 }],
  );
  assert.equal(out.rooms[0].squareFootage, 63.8);   // 8.5 * 7.5 = 63.75
  assert.equal(out.rooms[0].dimensions?.length, 8.5);
  assert.deepEqual(out.changed, [{ name: 'Laundry', from: null, to: 63.8 }]);
});

test('a LARGE room the first pass measured is never overwritten', () => {
  // The whole-sheet read got 255, 192, 168 and 120 exactly right. A tile that
  // disagrees about one of those is the tile that is wrong.
  const out = mergeReadings(
    [{ name: 'Lounge', squareFootage: 255 }],
    [{ name: 'Lounge', lengthFt: 10, widthFt: 10 }],
  );
  assert.equal(out.rooms[0].squareFootage, 255);
  assert.deepEqual(out.changed, []);
});

test('a small room IS overwritten, because that is the case this exists for', () => {
  const out = mergeReadings(
    [{ name: 'Bathroom', squareFootage: 21, dimensions: { length: 7, width: 3 } }],
    [{ name: 'Bath Rm', lengthFt: 7.75, widthFt: 7 }],   // the printed 7'9" x 7'
  );
  assert.equal(out.rooms[0].squareFootage, 54.3);
  assert.equal(out.changed.length, 1);
});

test('names match loosely, since the two passes word them differently', () => {
  for (const [a, b] of [['Bath Rm', 'Bathroom'], ['Bed Rm 1', 'bedroom1'], ['LOBBY', 'Lobby']]) {
    const out = mergeReadings(
      [{ name: a, squareFootage: null }], [{ name: b, lengthFt: 4, widthFt: 5 }],
    );
    assert.equal(out.rooms[0].squareFootage, 20, `${a} did not match ${b}`);
  }
});

test('a reading with no usable numbers leaves the room untouched', () => {
  // Better an admitted gap than a number invented by the pass meant to end
  // invented numbers.
  for (const bad of [
    { name: 'Hall', lengthFt: null, widthFt: 3 },
    { name: 'Hall', lengthFt: 0, widthFt: 3 },
    { name: 'Hall', lengthFt: Number.NaN, widthFt: 3 },
  ] as Reading[]) {
    const out = mergeReadings([{ name: 'Hall', squareFootage: null }], [bad]);
    assert.equal(out.rooms[0].squareFootage, null);
    assert.deepEqual(out.changed, []);
  }
});

test('a room the second pass never mentioned is left exactly as it was', () => {
  const out = mergeReadings(
    [{ name: 'Nook', squareFootage: null }], [{ name: 'Porch', lengthFt: 16, widthFt: 8 }],
  );
  assert.equal(out.rooms[0].squareFootage, null);
  assert.deepEqual(out.changed, []);
});

test('the threshold sits between the rooms that failed and the ones that did not', () => {
  // Bathroom 54, laundry 64, vestibule 27 were all wrong; kitchen 120 and
  // bedroom 93.5 were right. The line has to fall between those two groups.
  assert.ok(SMALL_ROOM_SQFT > 64, 'laundry would not be rechecked');
  assert.ok(SMALL_ROOM_SQFT <= 93.5, 'a correctly-read bedroom would be rechecked');
});
