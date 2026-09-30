/**
 * Turning a drawing into quantities the catalogue can price.
 *
 * The behaviours pinned here are the ones that decide a customer's number:
 *
 *   - wall area is PERIMETER times height, never floor area, because that is
 *     what framing, board and wall paint are actually measured in
 *   - a task appears only where the analysis gives a reason for it, so a quote
 *     never lists a trade merely because the trade exists
 *   - an assumed figure is marked rather than skipped, and rather than hidden
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  blueprintTakeoff, measure, flooringTask, DEFAULT_CEILING_HEIGHT_FT,
} from '../supabase/functions/server/blueprintTakeoff.ts';

/** A 12x10 room with a 9ft ceiling: 120 sq ft floor, 44 lin ft perimeter. */
const room = (over: Record<string, any> = {}) => ({
  name: 'Living', type: 'living', squareFootage: 120,
  dimensions: { length: 12, width: 10, height: 9 },
  perimeterLinearFeet: 44,
  ...over,
});

const analysis = (over: Record<string, any> = {}) => ({
  totalSquareFootage: 120,
  rooms: [room()],
  materials: [],
  constructionDetails: {},
  ...over,
});

const lineFor = (t: any, taskId: string) => t.lines.find((l: any) => l.taskId === taskId);

/* ── measuring ───────────────────────────────────────────────────────────── */

test('wall area is perimeter times height, not floor area', () => {
  const m = measure(analysis());
  assert.equal(m.wallAreaSqFt, 396, '44 lin ft x 9 ft');
  assert.notEqual(m.wallAreaSqFt, m.floorAreaSqFt,
    'pricing board off floor area is the mistake this replaces');
  assert.equal(m.floorAreaSqFt, 120);
  assert.equal(m.ceilingAreaSqFt, 120);
  assert.equal(m.assumedCeilingHeight, false);
});

test('two rooms of the same total area can differ in wall area', () => {
  // 400 sq ft as one 20x20 room, or as one 40x10 room. Same floor, more wall.
  const square = measure({ rooms: [{ squareFootage: 400, dimensions: { length: 20, width: 20, height: 8 } }] });
  const thin = measure({ rooms: [{ squareFootage: 400, dimensions: { length: 40, width: 10, height: 8 } }] });
  assert.equal(square.floorAreaSqFt, thin.floorAreaSqFt);
  assert.ok(thin.wallAreaSqFt > square.wallAreaSqFt,
    'this is exactly what a square-footage multiplier cannot see');
});

test('a perimeter is derived from the dimensions when not given', () => {
  const m = measure({ rooms: [room({ perimeterLinearFeet: undefined })] });
  assert.equal(m.perimeterLinFt, 44, '2 x (12 + 10)');
  assert.equal(m.assumedPerimeter, false, 'derived from real dimensions is not an assumption');
});

test('a room with only an area gets a square perimeter, marked', () => {
  const m = measure({ rooms: [{ squareFootage: 100 }] });
  assert.equal(m.perimeterLinFt, 40, '4 x sqrt(100)');
  assert.equal(m.assumedPerimeter, true);
});

test('rooms with no usable area are skipped rather than counted as zero', () => {
  const m = measure({ rooms: [room(), { name: 'Unknown' }] });
  assert.equal(m.roomsRead, 1);
  assert.equal(m.floorAreaSqFt, 120);
});

/* ── the assumed ceiling, which is Eric's call ───────────────────────────── */

test('a missing ceiling height is assumed at eight feet and marked', () => {
  const m = measure({ rooms: [room({ dimensions: { length: 12, width: 10 } })] });
  assert.equal(DEFAULT_CEILING_HEIGHT_FT, 8);
  assert.equal(m.wallAreaSqFt, 352, '44 x 8');
  assert.equal(m.assumedCeilingHeight, true);
});

test('the assumption travels onto every line derived from wall area', () => {
  const t = blueprintTakeoff(analysis({ rooms: [room({ dimensions: { length: 12, width: 10 } })] }));
  assert.equal(lineFor(t, 'paint-walls').assumed, true);
  assert.equal(lineFor(t, 'dry-hang-wall').assumed, true);
  // The ceiling is the floor area, which was read, so it is not assumed.
  assert.equal(lineFor(t, 'paint-ceilings').assumed, false);
});

test('and it is said out loud, not only flagged', () => {
  const t = blueprintTakeoff(analysis({ rooms: [room({ dimensions: { length: 12, width: 10 } })] }));
  assert.ok(t.notes.some((n) => /8ft assumed/i.test(n)));
});

test('the trade is still priced, which is the whole point of assuming', () => {
  const t = blueprintTakeoff(analysis({ rooms: [room({ dimensions: { length: 12, width: 10 } })] }));
  assert.ok(lineFor(t, 'paint-walls').quantity > 0,
    'a missing wall paint line would read as "no painting needed"');
});

/* ── evidence, not completeness ──────────────────────────────────────────── */

test('no counts means no lines for the counted things', () => {
  const t = blueprintTakeoff(analysis());
  for (const id of ['carp-door-hang', 'paint-doors', 'elec-device', 'plumb-rough', 'hvac-register']) {
    assert.equal(lineFor(t, id), undefined, id + ' had no count to justify it');
  }
});

test('a count produces exactly the work that count implies', () => {
  const t = blueprintTakeoff(analysis({
    constructionDetails: { doorCount: 6, electricalOutlets: 22, plumbingFixtures: 3, hvacVents: 5 },
  }));
  assert.equal(lineFor(t, 'carp-door-hang').quantity, 6);
  assert.equal(lineFor(t, 'paint-doors').quantity, 6);
  assert.equal(lineFor(t, 'elec-device').quantity, 22);
  assert.equal(lineFor(t, 'plumb-rough').quantity, 3);
  assert.equal(lineFor(t, 'plumb-set-fixture').quantity, 3);
  assert.equal(lineFor(t, 'hvac-register').quantity, 5);
});

test('framing is priced only where the materials say there is framing', () => {
  assert.equal(lineFor(blueprintTakeoff(analysis()), 'carp-wall-framing'), undefined);
  const framed = blueprintTakeoff(analysis({
    materials: [{ category: 'Framing', items: [{ name: '2x4 studs', quantity: 100, unit: 'each' }] }],
  }));
  assert.equal(lineFor(framed, 'carp-wall-framing').quantity, 396);
});

test('cabinets are priced only from a linear-foot quantity somebody measured', () => {
  const each = blueprintTakeoff(analysis({
    materials: [{ category: 'Cabinetry', items: [{ name: 'Wall cabinet', quantity: 8, unit: 'each' }] }],
  }));
  assert.equal(lineFor(each, 'carp-cabinets'), undefined, 'a count of boxes is not a run length');

  const measured = blueprintTakeoff(analysis({
    materials: [{ category: 'Cabinetry', items: [{ name: 'Base run', quantity: 18, unit: 'linear ft' }] }],
  }));
  assert.equal(lineFor(measured, 'carp-cabinets').quantity, 18);
});

/* ── flooring is read, not defaulted ─────────────────────────────────────── */

test('no flooring in the materials list prices no flooring, and says so', () => {
  const t = blueprintTakeoff(analysis());
  assert.equal(flooringTask(analysis()), null);
  assert.ok(t.notes.some((n) => /No flooring is priced/i.test(n)));
});

test('the product named decides the task, because hardwood is not LVP', () => {
  const of = (name: string) => flooringTask({ materials: [{ category: 'Flooring', items: [{ name }] }] });
  assert.equal(of('Red oak hardwood')!.taskId, 'floor-hardwood-nail');
  assert.equal(of('Berber carpet')!.taskId, 'floor-carpet');
  assert.equal(of('Porcelain floor tile')!.taskId, 'tile-floor-standard');
  assert.equal(of('Something unspecified')!.taskId, 'floor-lvp');
});

test('flooring is quantified by floor area', () => {
  const t = blueprintTakeoff(analysis({
    materials: [{ category: 'Flooring', items: [{ name: 'LVP plank' }] }],
  }));
  assert.equal(lineFor(t, 'floor-lvp').quantity, 120);
});

/* ── a drawing with a total and nothing else ─────────────────────────────── */

test('a bare total square footage still prices, with everything marked', () => {
  const t = blueprintTakeoff({ totalSquareFootage: 1600, rooms: [], materials: [] });
  assert.equal(t.measurements.floorAreaSqFt, 1600);
  assert.equal(t.measurements.perimeterLinFt, 160, '4 x sqrt(1600)');
  assert.equal(t.measurements.wallAreaSqFt, 1280, '160 x 8');
  assert.equal(t.measurements.assumedCeilingHeight, true);
  assert.equal(t.measurements.assumedPerimeter, true);
  assert.ok(t.notes.some((n) => /No room dimensions were read/i.test(n)));
});

test('building width and depth beat a guessed square', () => {
  const t = blueprintTakeoff({
    totalSquareFootage: 1600, buildingWidthFt: 40, buildingDepthFt: 40, rooms: [],
  });
  assert.equal(t.measurements.perimeterLinFt, 160, '2 x (40 + 40)');
  assert.equal(t.measurements.assumedPerimeter, false, 'those were read off the sheet');
});

/* ── nothing at all ──────────────────────────────────────────────────────── */

test('an empty analysis produces no lines and says why', () => {
  const t = blueprintTakeoff({});
  assert.deepEqual(t.lines, []);
  assert.ok(t.notes.some((n) => /Nothing could be priced/i.test(n)));
});

test('rubbish in does not throw', () => {
  for (const input of [null, undefined, 'a drawing', 42, { rooms: 'lots' }]) {
    const t = blueprintTakeoff(input as any);
    assert.ok(Array.isArray(t.lines), String(input));
  }
});

test('every line names the field it came from', () => {
  const t = blueprintTakeoff(analysis({ constructionDetails: { doorCount: 2 } }));
  assert.ok(t.lines.length > 0);
  for (const line of t.lines) {
    assert.ok(line.from && line.from.length > 3, line.taskId + ' must say where its number came from');
    assert.equal(typeof line.assumed, 'boolean');
    assert.ok(line.quantity > 0, 'a zero-quantity line is a phantom line');
  }
});
