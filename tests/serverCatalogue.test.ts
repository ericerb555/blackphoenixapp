/**
 * Merging the three task stores the server keeps.
 *
 * The rule decides what a customer is charged, and one part of it is a security
 * property rather than a preference: a task is somebody's OWN if and only if it
 * appears in the editor's store. Nothing about which rates are protected from
 * the learning loop may be read from a request, so `source` is decided here and
 * never taken from the incoming task.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeServerCatalogue, findTask } from '../supabase/functions/server/serverCatalogue.ts';

const published = {
  tasks: [
    { id: 'paint-walls', tradeId: 'painting', name: 'Walls, prep and two coats', unit: 'sq ft', hoursPerUnit: 0.010, crewSize: 1, minimumHours: 6 },
    { id: 'tile-wall', tradeId: 'tile', name: 'Wall tile', unit: 'sq ft', hoursPerUnit: 0.14, crewSize: 1, minimumHours: 8 },
  ],
};

test('the published book comes through as seed', () => {
  const out = mergeServerCatalogue(published, null);
  assert.equal(out.length, 2);
  assert.equal(out[0].source, 'seed');
  assert.equal(out[0].hoursPerUnit, 0.010);
  assert.equal(out[0].minimumHours, 6, 'the floor must survive the merge or small jobs misprice');
});

test('an edit wins and is marked as somebody\'s own', () => {
  const out = mergeServerCatalogue(published, {
    tasks: [{ id: 'paint-walls', hoursPerUnit: 0.014 }],
  });
  const walls = findTask(out, 'paint-walls')!;
  assert.equal(walls.hoursPerUnit, 0.014);
  assert.equal(walls.source, 'yours');
});

test('a partial edit does not blank the rest of the task', () => {
  const out = mergeServerCatalogue(published, {
    tasks: [{ id: 'paint-walls', hoursPerUnit: 0.014 }],
  });
  const walls = findTask(out, 'paint-walls')!;
  assert.equal(walls.minimumHours, 6, 'still the published floor');
  assert.equal(walls.unit, 'sq ft');
  assert.equal(walls.tradeId, 'painting');
  assert.equal(walls.name, 'Walls, prep and two coats');
});

test('a task somebody added that was never published still appears', () => {
  const out = mergeServerCatalogue(published, {
    tasks: [{ id: 'wash-house', tradeId: 'power_washing', name: 'House wash', unit: 'sq ft', hoursPerUnit: 0.001, crewSize: 1, minimumHours: 3 }],
  });
  assert.equal(out.length, 3);
  assert.equal(findTask(out, 'wash-house')!.source, 'yours');
});

test('source is decided here, never read off the incoming task', () => {
  // A caller claiming `source: 'yours'` on a published task must not get it:
  // that would protect a rate from the learning loop by asking nicely.
  const out = mergeServerCatalogue(
    { tasks: [{ ...published.tasks[0], source: 'yours' }] },
    null,
  );
  assert.equal(findTask(out, 'paint-walls')!.source, 'seed');
});

test('and the reverse: an edited task cannot be marked seed by the caller', () => {
  const out = mergeServerCatalogue(published, {
    tasks: [{ id: 'tile-wall', hoursPerUnit: 0.2, source: 'seed' }],
  });
  assert.equal(findTask(out, 'tile-wall')!.source, 'yours');
});

/* ── the awkward shapes ──────────────────────────────────────────────────── */

test('a crew size of zero becomes one, because it is a divisor', () => {
  const out = mergeServerCatalogue({ tasks: [{ id: 'x', tradeId: 'tile', crewSize: 0, hoursPerUnit: 1 }] }, null);
  assert.equal(out[0].crewSize, 1);
});

test('a duplicate id is taken once', () => {
  const out = mergeServerCatalogue({
    tasks: [published.tasks[0], { ...published.tasks[0], hoursPerUnit: 99 }],
  }, null);
  assert.equal(out.length, 1);
  assert.equal(out[0].hoursPerUnit, 0.010, 'the first wins');
});

test('a task with no id is dropped, because nothing can look it up', () => {
  const out = mergeServerCatalogue({ tasks: [{ tradeId: 'tile', hoursPerUnit: 1 }] }, null);
  assert.deepEqual(out, []);
});

test('nothing stored is an empty catalogue, not a throw', () => {
  assert.deepEqual(mergeServerCatalogue(null, null), []);
  assert.deepEqual(mergeServerCatalogue(undefined, undefined), []);
  assert.deepEqual(mergeServerCatalogue({}, {}), []);
});

test('findTask never guesses at a near match', () => {
  const out = mergeServerCatalogue(published, null);
  assert.equal(findTask(out, 'paint-wall'), null, 'one character out is a different task');
  assert.equal(findTask(out, ''), null);
});
