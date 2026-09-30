/**
 * What may be recorded as somebody's trades.
 *
 * The behaviour worth pinning is the one that reads backwards: an ABSENT list
 * keeps what was stored, while an EMPTY list clears it — because clearing does
 * not stop the scheduler offering somebody work, it makes it offer them
 * everything.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normaliseTrades, sanitiseTrades } from '../supabase/functions/server/employeeTrades.ts';

test('the ordinary case is left alone', () => {
  assert.deepEqual(normaliseTrades(['carpentry', 'painting']), ['carpentry', 'painting']);
});

test('case and padding are settled, so one trade is one entry', () => {
  assert.deepEqual(normaliseTrades([' Carpentry ', 'CARPENTRY']), ['carpentry']);
});

test('anything that is not a slug is dropped rather than stored', () => {
  assert.deepEqual(
    normaliseTrades(['<script>x</script>', 'a b', '../etc', '', null, 42, 'hvac']),
    ['hvac'],
    'these are rendered on the scheduling screens',
  );
});

test('a trade we do not sell is kept, not rejected', () => {
  // The catalogue lives in the front end. A slug matching nothing is inert;
  // rejecting one the screen was offering would be an unschedulable technician.
  assert.deepEqual(normaliseTrades(['power_washing']), ['power_washing']);
});

test('not a list is an empty list, not a throw', () => {
  assert.deepEqual(normaliseTrades(undefined), []);
  assert.deepEqual(normaliseTrades('carpentry'), []);
  assert.deepEqual(normaliseTrades({ carpentry: true }), []);
});

test('a very long list is capped', () => {
  const many = Array.from({ length: 200 }, (_, i) => `trade_${i}`);
  assert.equal(normaliseTrades(many).length, 40);
});

/* ── absent versus empty ─────────────────────────────────────────────────── */

test('a save that says nothing about trades keeps the stored ones', () => {
  assert.deepEqual(sanitiseTrades(undefined, ['tile']), ['tile'],
    'the timeclock posts an employee to keep a name current');
  assert.deepEqual(sanitiseTrades(null, ['tile']), ['tile']);
});

test('a save that posts an empty list clears them', () => {
  assert.deepEqual(sanitiseTrades([], ['tile']), [],
    'somebody deliberately unticking every trade means it');
});

test('what is posted replaces what was stored rather than adding to it', () => {
  assert.deepEqual(sanitiseTrades(['siding'], ['tile', 'flooring']), ['siding']);
});

test('a stored list that has gone bad is cleaned on the way out', () => {
  assert.deepEqual(sanitiseTrades(undefined, ['Tile', 'a b', 'tile']), ['tile']);
});
