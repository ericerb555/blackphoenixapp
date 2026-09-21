/**
 * Which walls an addition puts on the outside of the building.
 *
 * WHY THIS IS WORTH TESTING CAREFULLY
 *
 * Because a wrong answer here is invisible. A wall missed is simply a wall the
 * siding quote does not mention; a wall counted twice is siding nobody fits and
 * an estimate that loses the job. Neither shows up on screen as an error — the
 * drawing looks identical either way — so the arithmetic is the only place the
 * mistake can be caught.
 *
 * The partial-abutment case is the one that matters most and the one a naive
 * implementation gets wrong: a 20ft addition against a 12ft existing wall has
 * 8ft exposed, not 20 and not 0.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  subtractSpans, additionExteriorWalls, additionExteriorTotals,
  type FloorPlan, type PlanRoom,
} from '../src/app/lib/floorPlanModel.ts';

const room = (over: Partial<PlanRoom> & { id: string }): PlanRoom => ({
  name: over.name || over.id,
  x: 0, y: 0, widthFt: 10, depthFt: 10, ceilingFt: 8,
  state: 'existing',
  ...over,
} as PlanRoom);

const plan = (rooms: PlanRoom[]): FloorPlan => ({ rooms, walls: [] });

// ── the arithmetic on its own ──────────────────────────────────────────────

test('nothing covering it leaves the span whole', () => {
  assert.deepEqual(subtractSpans([0, 20], []), [[0, 20]]);
});

test('a cover in the middle splits the span in two', () => {
  assert.deepEqual(subtractSpans([0, 20], [[8, 12]]), [[0, 8], [12, 20]]);
});

test('a cover at one end shortens it', () => {
  assert.deepEqual(subtractSpans([0, 20], [[0, 12]]), [[12, 20]]);
});

test('a cover over the whole span leaves nothing', () => {
  assert.deepEqual(subtractSpans([0, 20], [[0, 20]]), []);
});

test('a cover wider than the span leaves nothing, rather than a negative', () => {
  assert.deepEqual(subtractSpans([4, 16], [[0, 30]]), []);
});

test('covers that do not touch the span are ignored', () => {
  assert.deepEqual(subtractSpans([0, 10], [[20, 30]]), [[0, 10]]);
});

test('two covers are both removed', () => {
  assert.deepEqual(subtractSpans([0, 30], [[5, 10], [20, 25]]), [[0, 5], [10, 20], [25, 30]]);
});

test('a sliver left over is noise, not a wall', () => {
  // 0.02ft is a quarter of an inch — a rounding artefact, not something to side.
  assert.deepEqual(subtractSpans([0, 10], [[0, 9.98]]), []);
});

// ── a freestanding addition ────────────────────────────────────────────────

test('an addition touching nothing is exterior on all four sides', () => {
  const p = plan([room({ id: 'A', state: 'proposed', widthFt: 20, depthFt: 12 })]);
  const walls = additionExteriorWalls(p);
  assert.equal(walls.length, 4);
  assert.deepEqual(
    walls.map(w => w.side).sort(),
    ['east', 'north', 'south', 'west'],
  );
  // 2 × (20 + 12)
  assert.equal(additionExteriorTotals(p).runFt, 64);
});

test('existing rooms are never reported — only the addition is new wall', () => {
  const p = plan([
    room({ id: 'existing', widthFt: 30, depthFt: 20 }),
    room({ id: 'A', state: 'proposed', x: 0, y: 20, widthFt: 30, depthFt: 12 }),
  ]);
  const walls = additionExteriorWalls(p);
  assert.ok(walls.every(w => w.roomId === 'A'));
});

// ── the case that matters ──────────────────────────────────────────────────

test('a side fully against the house is not exterior wall', () => {
  const p = plan([
    room({ id: 'house', widthFt: 30, depthFt: 20 }),
    // Sits directly below the house, same width.
    room({ id: 'A', state: 'proposed', x: 0, y: 20, widthFt: 30, depthFt: 12 }),
  ]);
  const walls = additionExteriorWalls(p);
  assert.equal(walls.length, 3, 'the shared side should be gone');
  assert.ok(!walls.some(w => w.side === 'north'));
  assert.equal(additionExteriorTotals(p).runFt, 30 + 12 + 12);
});

test('a side PARTLY against the house counts only the exposed part', () => {
  const p = plan([
    // The existing house covers 12ft of the addition's 20ft top edge.
    room({ id: 'house', x: 0, y: 0, widthFt: 12, depthFt: 20 }),
    room({ id: 'A', state: 'proposed', x: 0, y: 20, widthFt: 20, depthFt: 10 }),
  ]);
  const north = additionExteriorWalls(p).filter(w => w.side === 'north');
  assert.equal(north.length, 1);
  assert.equal(north[0].lengthFt, 8, '20ft of edge less 12ft of house');
});

test('a side interrupted in the middle produces two separate runs', () => {
  const p = plan([
    // One existing wing meeting the middle of the addition's top edge, so the
    // addition wraps past it on both sides.
    room({ id: 'wing', x: 6, y: 0, widthFt: 8, depthFt: 10 }),
    room({ id: 'A', state: 'proposed', x: 0, y: 10, widthFt: 20, depthFt: 10 }),
  ]);
  const north = additionExteriorWalls(p).filter(w => w.side === 'north');
  assert.equal(north.length, 2, 'two exposed stretches with a covered one between');
  assert.deepEqual(north.map(w => w.lengthFt).sort((a, b) => a - b), [6, 6]);
});

test('two wings at the ends leave one exposed stretch between them', () => {
  const p = plan([
    room({ id: 'wingA', x: 0, y: 0, widthFt: 5, depthFt: 10 }),
    room({ id: 'wingB', x: 15, y: 0, widthFt: 5, depthFt: 10 }),
    room({ id: 'A', state: 'proposed', x: 0, y: 10, widthFt: 20, depthFt: 10 }),
  ]);
  const north = additionExteriorWalls(p).filter(w => w.side === 'north');
  assert.equal(north.length, 1);
  assert.equal(north[0].lengthFt, 10);
});

test('two proposed rooms against each other do not double-count the join', () => {
  const p = plan([
    room({ id: 'A', state: 'proposed', x: 0, y: 0, widthFt: 10, depthFt: 10 }),
    room({ id: 'B', state: 'proposed', x: 10, y: 0, widthFt: 10, depthFt: 10 }),
  ]);
  const totals = additionExteriorTotals(p);
  // A 20x10 footprint: perimeter 60, not 80.
  assert.equal(totals.runFt, 60);
});

// ── the honest cases ───────────────────────────────────────────────────────

test('a room being removed does not shelter a wall', () => {
  const p = plan([
    room({ id: 'gone', state: 'removed', widthFt: 30, depthFt: 20 }),
    room({ id: 'A', state: 'proposed', x: 0, y: 20, widthFt: 30, depthFt: 12 }),
  ]);
  const walls = additionExteriorWalls(p);
  assert.equal(walls.length, 4, 'if the room next door comes out, that wall is outside');
});

test('a wall is never better known than the room that implies it', () => {
  const p = plan([room({ id: 'A', state: 'proposed', source: 'photos' } as any)]);
  assert.ok(additionExteriorWalls(p).every(w => w.source === 'photos'));
});

test('a room drawn before provenance existed reads as a guess', () => {
  const p = plan([room({ id: 'A', state: 'proposed' })]);
  assert.ok(additionExteriorWalls(p).every(w => w.source === 'estimated'));
});

test('no addition means no new exterior wall, not an error', () => {
  const p = plan([room({ id: 'house', widthFt: 30, depthFt: 20 })]);
  assert.deepEqual(additionExteriorWalls(p), []);
  assert.deepEqual(additionExteriorTotals(p), { runFt: 0, areaSqFt: 0 });
});

test('an empty or malformed plan does not throw', () => {
  for (const bad of [null, undefined, {}, { rooms: null }]) {
    assert.doesNotThrow(() => additionExteriorWalls(bad as any));
    assert.deepEqual(additionExteriorWalls(bad as any), []);
  }
});

test('area uses each room own ceiling height', () => {
  const p = plan([room({ id: 'A', state: 'proposed', widthFt: 10, depthFt: 10, ceilingFt: 9 })]);
  // Perimeter 40 at 9ft.
  assert.equal(additionExteriorTotals(p).areaSqFt, 360);
});
