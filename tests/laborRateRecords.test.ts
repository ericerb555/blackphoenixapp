/**
 * What a stored labour rate record must carry.
 *
 * This exists because of a loop that fed itself and would not have stopped.
 * The rates screen merged saved records over its defaults reading
 * `visible: savedRate.visible`; the stored records had no such key; so every
 * rate loaded as `undefined`, and on the next save `JSON.stringify` dropped
 * the undefined key again. Twelve of Eric's real rates sat in that state.
 *
 * The rule pinned here is the direction of the default: ABSENT MEANS VISIBLE.
 * A rate somebody set is one they mean to quote with, and defaulting the other
 * way would silently drop a trade out of every quote.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normaliseLaborRates, resolveLaborRates } from '../supabase/functions/server/pricingDefaults.ts';

test('a record with no visible flag is stored as visible', () => {
  const [rate] = normaliseLaborRates([{ id: 'carpentry', category: 'Carpentry', hourlyRate: 70 }]);
  assert.equal(rate.visible, true, 'this is the exact shape the twelve were stored in');
});

test('undefined and null are visible too, because neither is a decision', () => {
  assert.equal(normaliseLaborRates([{ id: 'a', hourlyRate: 1, visible: undefined }])[0].visible, true);
  assert.equal(normaliseLaborRates([{ id: 'a', hourlyRate: 1, visible: null }])[0].visible, true);
});

test('only an explicit false hides a trade from quotes', () => {
  assert.equal(normaliseLaborRates([{ id: 'a', hourlyRate: 1, visible: false }])[0].visible, false);
});

test('the flag is always present afterwards, so the loop cannot restart', () => {
  const out = normaliseLaborRates([{ id: 'a', hourlyRate: 1 }, { id: 'b', hourlyRate: 2, visible: false }]);
  for (const rate of out) {
    assert.equal(typeof rate.visible, 'boolean', `${rate.id} must not be undefined`);
    assert.ok('visible' in rate);
  }
});

/* ── the rest of the record ──────────────────────────────────────────────── */

test('a rate that is not a number becomes zero rather than NaN', () => {
  assert.equal(normaliseLaborRates([{ id: 'a', hourlyRate: 'lots' }])[0].hourlyRate, 0);
  assert.equal(normaliseLaborRates([{ id: 'a' }])[0].hourlyRate, 0);
});

test('a record with no id is dropped, because nothing can look it up', () => {
  assert.deepEqual(normaliseLaborRates([{ category: 'Mystery', hourlyRate: 50 }]), []);
});

test('a missing category falls back to the id rather than to empty', () => {
  assert.equal(normaliseLaborRates([{ id: 'power_washing', hourlyRate: 55 }])[0].category, 'power_washing');
});

test('not a list is an empty list', () => {
  assert.deepEqual(normaliseLaborRates(undefined), []);
  assert.deepEqual(normaliseLaborRates({ carpentry: 70 }), []);
});

/* ── and it still hands the standards over when nothing is saved ─────────── */

test('normalising does not disturb the fall back to standard rates', () => {
  const empty = resolveLaborRates({ laborRates: normaliseLaborRates([]) });
  assert.equal(empty.usingStandards, true);

  const saved = resolveLaborRates({ laborRates: normaliseLaborRates([{ id: 'carpentry', hourlyRate: 70 }]) });
  assert.equal(saved.usingStandards, false, "his own number must win");
  assert.equal(saved.rates[0].hourlyRate, 70);
});

test('a zero-rate record does not count as a saved rate card', () => {
  // resolveLaborRates filters on hourlyRate > 0, so normalising a junk rate to
  // zero must not make the server think the company has set its rates.
  const out = resolveLaborRates({ laborRates: normaliseLaborRates([{ id: 'a', hourlyRate: 'lots' }]) });
  assert.equal(out.usingStandards, true);
});
