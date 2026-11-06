/**
 * Is this business still there?
 *
 * The ingest reports created, filled, untouched and uncategorised — every
 * one about a business that is present. Nothing noticed a business that was
 * in last week's answer and is not in this week's, so a shop that closed in
 * 2024 is still in a directory sold as a live list of local trade.
 *
 * MOST OF THIS FILE IS ABOUT REFUSING TO ACT. Absence is weak evidence:
 * Overpass truncates, fails, and occasionally answers with a fraction of a
 * town. A rule that believed every absence would flag half a directory on a
 * bad day, and the flags would be indistinguishable from real closures.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  runQuality, planLiveness, describeLiveness,
  MISSES_BEFORE_REVIEW, MIN_COVERAGE_FRACTION,
} from '../supabase/functions/server/exchangeLiveness.ts';

const listing = (id: string, extra: Record<string, unknown> = {}) => ({
  id, claim_state: 'listed', missing_runs: 0, missing_since: null, needs_review: false, ...extra,
});
const good = { ok: true, truncated: [], seenCount: 10, heldCount: 10 };
const NOW = '2026-11-06T12:00:00.000Z';
// A RunQuality, not the input to one. `planLiveness` takes the VERDICT, and
// passing it the input instead silently sends every case down the "this run
// proved nothing" path — which is how five of these tests passed an empty
// update list and looked like they were asserting something.
const OK = runQuality(good);

/* ── when a run may be believed at all ───────────────────────────────────── */

test('a complete run is trustworthy', () => {
  assert.equal(runQuality(good).trustworthy, true);
});

/** Overpass caps a class at its limit; what did not appear may be past the cut. */
test('a truncated run proves nothing, and names the classes', () => {
  const q = runQuality({ ...good, truncated: ['shop', 'craft'] });
  assert.equal(q.trustworthy, false);
  assert.match(q.why!, /cut off/i);
  assert.match(q.why!, /shop, craft/);
});

test('a failed run proves nothing', () => {
  assert.equal(runQuality({ ...good, ok: false }).trustworthy, false);
});

/**
 * A town that answers with two businesses when it held ninety has not lost
 * eighty-eight. Believing it would flag almost the whole town at once.
 */
test('an implausibly thin answer proves nothing', () => {
  const q = runQuality({ ok: true, truncated: [], seenCount: 2, heldCount: 90 });
  assert.equal(q.trustworthy, false);
  assert.match(q.why!, /2 of 90/);
});

test('the coverage floor is a fraction, so a hamlet and a city can share it', () => {
  // Four of nine is under half and refused; five of nine is over and allowed.
  assert.equal(runQuality({ ok: true, truncated: [], seenCount: 4, heldCount: 9 }).trustworthy, false);
  assert.equal(runQuality({ ok: true, truncated: [], seenCount: 5, heldCount: 9 }).trustworthy, true);
  assert.equal(MIN_COVERAGE_FRACTION, 0.5);
});

test('a town we hold nothing for cannot fail the coverage check', () => {
  assert.equal(runQuality({ ok: true, truncated: [], seenCount: 0, heldCount: 0 }).trustworthy, true);
});

/* ── an untrustworthy run changes nothing ────────────────────────────────── */

test('a truncated run writes no updates at all', () => {
  const plan = planLiveness({
    held: [listing('a'), listing('b'), listing('c')],
    seenIds: ['a'],
    quality: runQuality({ ...good, truncated: ['shop'] }),
    now: NOW,
  });
  assert.deepEqual(plan.updates, [], 'not one counter moved');
  assert.equal(plan.missing, 0, 'and nothing is reported as missing');
  assert.match(plan.why!, /cut off/i);
});

/* ── counting a miss, and what it takes to raise one ─────────────────────── */

test('a first miss is counted and nothing is flagged', () => {
  const plan = planLiveness({ held: [listing('a')], seenIds: [], quality: runQuality({ ...good, seenCount: 0, heldCount: 0 }), now: NOW });
  const u = plan.updates[0];
  assert.equal(u.missing_runs, 1);
  assert.equal(u.needs_review, false);
  assert.equal(plan.flagged, 0);
});

test('review comes only after several consecutive complete runs', () => {
  const at = (n: number) => planLiveness({
    held: [listing('a', { missing_runs: n, missing_since: '2026-10-01T00:00:00.000Z' })],
    seenIds: [],
    quality: runQuality({ ok: true, truncated: [], seenCount: 0, heldCount: 0 }),
    now: NOW,
  }).updates[0];

  assert.equal(at(MISSES_BEFORE_REVIEW - 2).needs_review, false);
  assert.equal(at(MISSES_BEFORE_REVIEW - 1).needs_review, true, 'this run is the one that crosses');
});

/** The useful question a reviewer asks is how long it has been gone. */
test('missing_since records the FIRST miss, not the latest', () => {
  const first = '2026-10-01T00:00:00.000Z';
  const u = planLiveness({
    held: [listing('a', { missing_runs: 1, missing_since: first })],
    seenIds: [], quality: runQuality({ ok: true, truncated: [], seenCount: 0, heldCount: 0 }), now: NOW,
  }).updates[0];
  assert.equal(u.missing_since, first);
});

test('a first miss stamps missing_since with now', () => {
  const u = planLiveness({
    held: [listing('a')], seenIds: [],
    quality: runQuality({ ok: true, truncated: [], seenCount: 0, heldCount: 0 }), now: NOW,
  }).updates[0];
  assert.equal(u.missing_since, NOW);
});

/* ── coming back ─────────────────────────────────────────────────────────── */

test('a business that reappears has its history cleared', () => {
  const plan = planLiveness({
    held: [listing('a', { missing_runs: 2, missing_since: '2026-10-01T00:00:00.000Z', needs_review: true })],
    seenIds: ['a'], quality: OK, now: NOW,
  });
  const u = plan.updates[0];
  assert.equal(u.missing_runs, 0);
  assert.equal(u.missing_since, null);
  assert.equal(u.needs_review, false);
  assert.equal(u.last_seen_at, NOW);
  assert.equal(plan.recovered, 1);
});

/**
 * A listing seen every week must not be rewritten in full every week — only
 * stamped. Clearing counters that are already clear is write traffic for
 * nothing.
 */
test('a listing with no history is only stamped', () => {
  const u = planLiveness({ held: [listing('a')], seenIds: ['a'], quality: OK, now: NOW }).updates[0];
  assert.deepEqual(Object.keys(u).sort(), ['id', 'last_seen_at']);
});

/* ── claimed listings are never flagged ──────────────────────────────────── */

/**
 * Somebody owns that row and answers for it. Most small firms are not on
 * OpenStreetMap at all, so their absence means nothing whatsoever.
 */
test('a claimed listing absent from the map is never flagged', () => {
  const plan = planLiveness({
    held: [listing('a', { claim_state: 'claimed', missing_runs: 9 })],
    seenIds: [], quality: runQuality({ ok: true, truncated: [], seenCount: 0, heldCount: 0 }), now: NOW,
  });
  assert.deepEqual(plan.updates, [], 'not touched');
  assert.equal(plan.missing, 1, 'but still counted in the summary');
  assert.equal(plan.flagged, 0);
});

test('a claimed listing that IS seen still gets its stamp', () => {
  const plan = planLiveness({
    held: [listing('a', { claim_state: 'claimed' })], seenIds: ['a'], quality: OK, now: NOW,
  });
  assert.equal(plan.updates[0].last_seen_at, NOW);
});

/* ── nothing is ever deleted ─────────────────────────────────────────────── */

test('the strongest action available is a review flag', () => {
  const plan = planLiveness({
    held: [listing('a', { missing_runs: 99 })],
    seenIds: [], quality: runQuality({ ok: true, truncated: [], seenCount: 0, heldCount: 0 }), now: NOW,
  });
  const keys = Object.keys(plan.updates[0]);
  for (const forbidden of ['status', 'deleted_at', 'archived', 'hidden']) {
    assert.ok(!keys.includes(forbidden), `must not touch ${forbidden}`);
  }
});

/* ── the summary ─────────────────────────────────────────────────────────── */

test('the summary says what happened', () => {
  const plan = planLiveness({
    held: [listing('a'), listing('b', { missing_runs: MISSES_BEFORE_REVIEW - 1 }), listing('c', { missing_runs: 1 })],
    seenIds: ['a', 'c'], quality: OK, now: NOW,
  });
  const line = describeLiveness(plan);
  assert.match(line, /1 not seen/);
  assert.match(line, /1 now up for review/);
  assert.match(line, /1 back after being missed/);
});

test('an untouched town says so rather than reading as a failure', () => {
  const plan = planLiveness({ held: [listing('a')], seenIds: ['a'], quality: OK, now: NOW });
  assert.match(describeLiveness(plan), /Every listing was still there/);
});

test('rubbish in does not throw', () => {
  const plan = planLiveness({ held: [null, undefined, {} as any], seenIds: [], quality: OK });
  assert.deepEqual(plan.updates, []);
});
