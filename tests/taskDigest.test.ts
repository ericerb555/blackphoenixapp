/**
 * Which plans are stalled, nearly done, or never started.
 *
 * The classification is the whole value of this module, and every way it can
 * be wrong makes the assistant mislead somebody about their own project.
 * Calling a forgotten plan "active" buries it. Calling somebody's current work
 * "stalled" sends them to re-litigate a decision already being acted on. And
 * reporting an absent digest as "no unfinished work" is the one answer that is
 * never true and would never be questioned.
 *
 * So the boundaries are asserted at the day, and the empty case is asserted as
 * loudly as the full one.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  classify, summariseWork, ACTIVE_WITHIN_DAYS, STALLED_AFTER_DAYS,
  type PlanSnapshot,
} from '../supabase/functions/server/taskDigest.ts';

const NOW = Date.parse('2026-11-12T00:00:00Z');
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

const plan = (over: Partial<PlanSnapshot> = {}): PlanSnapshot => ({
  file: 'p.md', title: 'A plan', open: 5, done: 5, lastTouched: daysAgo(1), ...over,
});

/* ── the four states ─────────────────────────────────────────────────────── */

test('nothing ticked is not-started, however recently it was written', () => {
  // Decided before age on purpose: a plan with nothing done is the same
  // question whenever it was written, and "active" would hide it.
  assert.equal(classify(plan({ done: 0, lastTouched: daysAgo(1) }), NOW).state, 'not-started');
  assert.equal(classify(plan({ done: 0, lastTouched: daysAgo(200) }), NOW).state, 'not-started');
});

test('part-done and touched this week is active', () => {
  assert.equal(classify(plan({ lastTouched: daysAgo(3) }), NOW).state, 'active');
});

test('part-done and untouched for a month is stalled', () => {
  assert.equal(classify(plan({ lastTouched: daysAgo(STALLED_AFTER_DAYS + 1) }), NOW).state, 'stalled');
});

test('no open items reads as done regardless of age', () => {
  assert.equal(classify(plan({ open: 0, done: 9, lastTouched: daysAgo(400) }), NOW).state, 'nearly-done');
});

test('mostly ticked, past active but inside the stall window, is nearly-done', () => {
  const p = plan({ open: 1, done: 9, lastTouched: daysAgo(ACTIVE_WITHIN_DAYS + 1) });
  assert.equal(classify(p, NOW).state, 'nearly-done');
});

test('the active boundary is inclusive and the day past it is not', () => {
  assert.equal(classify(plan({ lastTouched: daysAgo(ACTIVE_WITHIN_DAYS) }), NOW).state, 'active');
  assert.notEqual(classify(plan({ lastTouched: daysAgo(ACTIVE_WITHIN_DAYS + 1) }), NOW).state, 'active');
});

test('an unknown date counts as stalled, never as active', () => {
  // A shallow clone gives no git date. Letting that read as current work would
  // quietly empty the stalled list, which is the list worth reading.
  assert.equal(classify(plan({ lastTouched: null }), NOW).state, 'stalled');
  assert.equal(classify(plan({ lastTouched: 'whenever' }), NOW).state, 'stalled');
  assert.equal(classify(plan({ lastTouched: null }), NOW).ageDays, null);
});

test('a future date does not produce a negative age', () => {
  assert.equal(classify(plan({ lastTouched: daysAgo(-5) }), NOW).ageDays, 0);
});

/* ── the summary, which is lists rather than a total ─────────────────────── */

test('the three actionable lists are separated', () => {
  const s = summariseWork([
    plan({ file: 'stall.md', lastTouched: daysAgo(90) }),
    plan({ file: 'nearly.md', open: 1, done: 19, lastTouched: daysAgo(20) }),
    plan({ file: 'new.md', done: 0 }),
    plan({ file: 'live.md', lastTouched: daysAgo(2) }),
  ], daysAgo(0), NOW);

  assert.deepEqual(s.stalled.map((p) => p.file), ['stall.md']);
  assert.deepEqual(s.nearlyDone.map((p) => p.file), ['nearly.md']);
  assert.deepEqual(s.notStarted.map((p) => p.file), ['new.md']);
  assert.equal(s.totals.plans, 4);
  assert.equal(s.totals.open, 5 + 1 + 5 + 5);
});

test('completion is null rather than NaN when there is nothing to divide', () => {
  const c = classify(plan({ open: 0, done: 0 }), NOW);
  assert.equal(c.completion, null);
});

test('the summary says a ticked box is not shipped work', () => {
  // The caution that keeps this from being read as a feature list.
  assert.match(summariseWork([plan()], null, NOW).note, /not that the work shipped/);
});

test('an empty digest summarises to empty lists, not to a cheerful total', () => {
  const s = summariseWork([], null, NOW);
  assert.deepEqual(s.stalled, []);
  assert.equal(s.totals.open, 0);
  assert.equal(s.generatedAt, null);
});
