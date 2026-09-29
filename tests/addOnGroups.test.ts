/**
 * Ladder add-ons: which rung replaces which, and which one counts.
 *
 * `addOnIds` is a flat list, so nothing stopped an account being billed for
 * Solo and Studio and Agency at once — three recurring line items for one
 * product. And with no removal path an "upgrade" meant paying for both rungs.
 * These decide what a purchase replaces, before anything touches Stripe.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  supersededIds, applicableAddOns, supersedesMessage,
} from '../supabase/functions/server/addOnGroups.ts';

const solo = { id: 'content-solo', name: 'Solo', group: 'content', groupRank: 1 };
const studio = { id: 'content-studio', name: 'Studio', group: 'content', groupRank: 2 };
const agency = { id: 'content-agency', name: 'Agency', group: 'content', groupRank: 3 };
const onCall = { id: 'on-call', name: 'On-Call' };               // no group
const answered = { id: 'on-call-answered', name: 'Answered' };   // no group
const CATALOGUE = [solo, studio, agency, onCall, answered];

// ── What a purchase replaces ──────────────────────────────────────────────

test('MOVING UP THE LADDER REMOVES THE RUNG BELOW', () => {
  assert.deepEqual(supersededIds(studio, CATALOGUE, ['content-solo']), ['content-solo']);
});

test('moving down removes the rung above — a downgrade is still a swap', () => {
  assert.deepEqual(supersededIds(solo, CATALOGUE, ['content-agency']), ['content-agency']);
});

test('an account that somehow holds two rungs loses both', () => {
  assert.deepEqual(
    supersededIds(agency, CATALOGUE, ['content-solo', 'content-studio']).sort(),
    ['content-solo', 'content-studio'],
  );
});

test('nothing held means nothing to remove', () => {
  assert.deepEqual(supersededIds(studio, CATALOGUE, []), []);
  assert.deepEqual(supersededIds(studio, CATALOGUE, ['on-call']), [], 'a different product is untouched');
});

/**
 * Every add-on in production today has no group, so this must be inert until
 * a ladder is deliberately authored.
 */
test('AN UNGROUPED ADD-ON REPLACES NOTHING — this is inert today', () => {
  assert.deepEqual(supersededIds(onCall, CATALOGUE, ['on-call-answered', 'content-solo']), []);
  assert.deepEqual(supersededIds({ id: 'x' }, CATALOGUE, ['content-solo']), []);
});

test('buying the rung already held replaces nothing, not itself', () => {
  assert.deepEqual(supersededIds(studio, CATALOGUE, ['content-studio']), []);
});

/**
 * An add-on the TIER includes has no subscription item behind it. Returning it
 * would mean trying to cancel a line that does not exist, and conceptually
 * taking away something the plan grants.
 */
test('only bought rungs are returned, never ones the tier includes', () => {
  // 'content-solo' is held via the tier's includedAddOns, so it is not in the
  // bought list and must not be cancelled.
  assert.deepEqual(supersededIds(studio, CATALOGUE, []), []);
});

test('nonsense in, empty out', () => {
  assert.deepEqual(supersededIds(null, CATALOGUE, ['content-solo']), []);
  assert.deepEqual(supersededIds(studio, [], ['content-solo']), []);
  assert.deepEqual(supersededIds(studio, [null, undefined] as any, ['content-solo']), []);
  assert.deepEqual(supersededIds(studio, CATALOGUE, ['', '  '] as any), []);
});

// ── Which rung counts ─────────────────────────────────────────────────────

/**
 * Without this, an account holding two rungs would have BOTH allowances summed
 * by `effectiveLimits` — capacity nobody sold.
 */
test('A LADDER COLLAPSES TO ITS HIGHEST RUNG', () => {
  const kept = applicableAddOns([solo, studio, agency]);
  assert.equal(kept.length, 1);
  assert.equal(kept[0].id, 'content-agency');
});

test('order does not matter — the highest rank wins either way', () => {
  assert.equal(applicableAddOns([agency, solo])[0].id, 'content-agency');
  assert.equal(applicableAddOns([solo, agency])[0].id, 'content-agency');
});

test('ungrouped add-ons all survive alongside the winning rung', () => {
  const kept = applicableAddOns([onCall, solo, answered, studio]);
  assert.deepEqual(kept.map((a) => a.id).sort(), ['content-studio', 'on-call', 'on-call-answered']);
});

test('two different ladders each keep their own winner', () => {
  const a1 = { id: 'a-low', group: 'a', groupRank: 1 };
  const a2 = { id: 'a-high', group: 'a', groupRank: 9 };
  const b1 = { id: 'b-low', group: 'b', groupRank: 1 };
  const b2 = { id: 'b-high', group: 'b', groupRank: 2 };
  assert.deepEqual(
    applicableAddOns([a1, b2, a2, b1]).map((x) => x.id).sort(),
    ['a-high', 'b-high'],
  );
});

test('a tie keeps the first seen, so the result is stable not arbitrary', () => {
  const x = { id: 'x', group: 'g', groupRank: 1 };
  const y = { id: 'y', group: 'g', groupRank: 1 };
  assert.equal(applicableAddOns([x, y])[0].id, 'x');
  assert.equal(applicableAddOns([y, x])[0].id, 'y');
});

test('a missing rank counts as the bottom of the ladder', () => {
  const unranked = { id: 'content-unranked', group: 'content' };
  assert.equal(applicableAddOns([unranked, solo])[0].id, 'content-solo');
});

test('empty and broken lists are handled', () => {
  assert.deepEqual(applicableAddOns([]), []);
  assert.deepEqual(applicableAddOns([null, undefined, { id: '' }] as any), []);
});

// ── Telling the buyer ─────────────────────────────────────────────────────

test('the buyer is told what is being replaced and that they are credited', () => {
  const msg = supersedesMessage(studio, [solo])!;
  assert.match(msg, /Studio replaces Solo/);
  assert.match(msg, /credited/);
  assert.match(msg, /It is removed/, 'singular reads correctly');
});

test('two replaced rungs read as a list', () => {
  const msg = supersedesMessage(agency, [solo, studio])!;
  assert.match(msg, /Solo and Studio/);
  assert.match(msg, /They are removed/);
});

test('replacing nothing says nothing', () => {
  assert.equal(supersedesMessage(studio, []), null);
  assert.equal(supersedesMessage(studio, [null, undefined]), null);
});
