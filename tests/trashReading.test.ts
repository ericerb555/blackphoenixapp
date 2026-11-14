/**
 * What the agent is allowed to come back with.
 *
 * This is the boundary between a model's opinion and a customer's price, so
 * the behaviours pinned here are all refusals:
 *
 *   - an image index that was never sent rejects the WHOLE item, never clamps
 *   - after the verify pass, an item that cites no image at all is dropped
 *   - a field nobody allowed does not survive, money least of all
 *   - "I cannot read this" is carried through rather than smoothed away
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readObservations, parseReply, readingSystem, verifySystem, MAX_IMAGES,
} from '../supabase/functions/server/trashReading.ts';

const reply = (over: Record<string, any> = {}) => ({
  items: [
    { name: 'three-seat sofa', count: 1, materialClass: 'mixed-household', volumeLowCuYd: 2, volumeHighCuYd: 2.5, seenIn: [0, 1], confidence: 'high' },
  ],
  access: { stairFlights: 1, carryDistanceFt: 60 },
  demo: [],
  hazards: [],
  unseen: [],
  unsure: false,
  ...over,
});

/* ── evidence ────────────────────────────────────────────────────────────── */

test('an item reading cleanly survives with its evidence intact', () => {
  const { observations, problems } = readObservations(reply(), 4);
  assert.equal(problems.length, 0);
  assert.equal(observations.items?.length, 1);
  assert.deepEqual(observations.items?.[0].seenIn, [0, 1]);
  assert.equal(observations.access?.stairFlights, 1);
});

test('an image index that was never sent rejects the whole item', () => {
  const { observations, problems } = readObservations(reply({
    items: [{ name: 'sofa', count: 1, materialClass: 'mixed-household', volumeLowCuYd: 2, volumeHighCuYd: 2, seenIn: [9] }],
  }), 4);
  assert.equal(observations.items?.length, 0, 'a made-up citation was kept');
  assert.ok(problems[0].includes('dropped whole'));
});

test('a bad index is never clamped to the last image', () => {
  const { observations } = readObservations(reply({
    items: [{ name: 'fridge', count: 1, materialClass: 'appliance', volumeLowCuYd: 1, volumeHighCuYd: 1, seenIn: [0, 99] }],
  }), 3);
  assert.equal(observations.items?.length, 0);
});

test('after the verify pass, an item with no image at all is dropped', () => {
  const noEvidence = reply({
    items: [{ name: 'boxes', count: 4, materialClass: 'mixed-household', volumeLowCuYd: 0.2, volumeHighCuYd: 0.3, seenIn: [] }],
  });
  assert.equal(readObservations(noEvidence, 4).observations.items?.length, 1, 'pass one may omit it');
  assert.equal(
    readObservations(noEvidence, 4, { requireEvidence: true }).observations.items?.length, 0,
    'pass two must not keep what it cannot see',
  );
});

/* ── nothing but the allowlist survives ──────────────────────────────────── */

test('a price the model invented does not survive', () => {
  const { observations } = readObservations(reply({
    items: [{
      name: 'sofa', count: 1, materialClass: 'mixed-household',
      volumeLowCuYd: 2, volumeHighCuYd: 2, seenIn: [0],
      estimatedCost: 450, unitCost: 90, hourlyRate: 65,
    }],
    estimatedTotal: 900,
  }), 2);
  const item = observations.items?.[0] as any;
  assert.equal(item.estimatedCost, undefined);
  assert.equal(item.unitCost, undefined);
  assert.equal((observations as any).estimatedTotal, undefined);
});

test('a stream we do not sort is read as mixed household, and says so', () => {
  const { observations, problems } = readObservations(reply({
    items: [{ name: 'piano', count: 1, materialClass: 'musical', volumeLowCuYd: 2, volumeHighCuYd: 2, seenIn: [0] }],
  }), 2);
  assert.equal(observations.items?.[0].materialClass, 'mixed-household');
  assert.ok(problems[0].includes('not a stream we sort'));
});

test('an item with no volume or no name is dropped', () => {
  const { observations, problems } = readObservations(reply({
    items: [
      { name: '', count: 1, materialClass: 'wood', volumeLowCuYd: 1, volumeHighCuYd: 1, seenIn: [0] },
      { name: 'ghost', count: 1, materialClass: 'wood', volumeLowCuYd: 0, volumeHighCuYd: 0, seenIn: [0] },
    ],
  }), 2);
  assert.equal(observations.items?.length, 0);
  assert.equal(problems.length, 2);
});

test('a high below the low is lifted to the low, never the other way', () => {
  const { observations } = readObservations(reply({
    items: [{ name: 'pile', count: 1, materialClass: 'wood', volumeLowCuYd: 5, volumeHighCuYd: 1, seenIn: [0] }],
  }), 2);
  assert.equal(observations.items?.[0].volumeLowCuYd, 5);
  assert.equal(observations.items?.[0].volumeHighCuYd, 5);
});

/* ── the rest of the reading ─────────────────────────────────────────────── */

test('demolition only survives where it says something', () => {
  const { observations } = readObservations(reply({
    demo: [
      { description: 'kitchen', areaSqFt: 220, structural: false },
      { description: 'nothing in particular' },
      { description: 'bearing wall', structural: true },
    ],
  }), 2);
  assert.equal(observations.demo?.length, 2);
  assert.equal(observations.demo?.[1].structural, true);
});

test('what could not be seen is carried through', () => {
  const { observations } = readObservations(reply({
    unseen: [{ what: 'behind the stack on the left', estimatedVolumeCuYd: 3 }, { what: '' }],
  }), 2);
  assert.equal(observations.unseen?.length, 1);
  assert.equal(observations.unseen?.[0].estimatedVolumeCuYd, 3);
});

test('a reader that cannot read says so, and that survives', () => {
  const { observations } = readObservations(
    { items: [], unsure: true, why: 'the video is too dark to count anything' }, 4);
  assert.equal(observations.unsure, true);
  assert.ok(observations.why?.includes('too dark'));
});

test('junk, null and an empty reply do not throw', () => {
  for (const input of [null, undefined, 42, 'nope', {}, { items: 'not an array' }]) {
    const { observations } = readObservations(input, 3);
    assert.equal(observations.items?.length, 0);
  }
});

/* ── parsing the reply ───────────────────────────────────────────────────── */

test('JSON is found fenced, bare, or surrounded by chatter', () => {
  assert.equal(parseReply('```json\n{"a":1}\n```').a, 1);
  assert.equal(parseReply('{"a":2}').a, 2);
  assert.equal(parseReply('Here is what I found:\n{"a":3}\nHope that helps.').a, 3);
});

test('an unreadable reply is null, not an exception', () => {
  assert.equal(parseReply('I am afraid I cannot help with that.'), null);
  assert.equal(parseReply(''), null);
  assert.equal(parseReply('{broken'), null);
});

/* ── the prompts ─────────────────────────────────────────────────────────── */

test('both prompts forbid prices and demand the unseen', () => {
  for (const prompt of [readingSystem(8), verifySystem(8)]) {
    assert.ok(/NEVER GIVE A PRICE/.test(prompt));
    assert.ok(/SAY WHAT YOU COULD NOT SEE/.test(prompt));
    assert.ok(/numbers between 0 and 7/.test(prompt), 'the index range is not stated');
  }
});

test('only the verify pass is told to count things once', () => {
  assert.ok(!/COUNT EACH THING ONCE/.test(readingSystem(4)));
  assert.ok(/COUNT EACH THING ONCE/.test(verifySystem(4)));
  assert.ok(/WIDEN, DO NOT AVERAGE/.test(verifySystem(4)));
  assert.ok(/DROP WHAT YOU CANNOT FIND/.test(verifySystem(4)));
});

test('the image ceiling is the same one the house reader uses', () => {
  assert.equal(MAX_IMAGES, 12);
});
