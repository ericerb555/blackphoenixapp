/**
 * Correcting a quote's estimated hours with what the trades actually take.
 *
 * This is the step that makes the learning loop pay: without it, jobs are
 * measured, the variance is shown on a screen, and the next quote still asks a
 * language model to guess the hours from scratch.
 *
 * Because it changes what customers are quoted, the tests below lean on the
 * guards rather than the happy path — the clamp that stops one bad run of jobs
 * tripling every future quote, and the refusal to touch hours a person set.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tradeKey, tradeFactorsFrom, applyMeasuredHours,
  MIN_JOBS, MIN_VARIANCE, MIN_FACTOR, MAX_FACTOR,
  type VarianceRow, type LaborLine,
} from '../supabase/functions/server/measuredHours.ts';

const row = (over: Partial<VarianceRow> = {}): VarianceRow => ({
  key: 'carpentry', label: 'Carpentry',
  jobs: 9, quotedHours: 100, actualHours: 130,
  variancePercent: 30, confident: true,
  ...over,
});

const line = (over: Partial<LaborLine> = {}): LaborLine => ({
  trade: 'carpentry', role: 'Lead Carpenter',
  hours: 10, hourlyRate: 65, totalCost: 650,
  hoursSource: 'estimated', productivityNote: 'Model takeoff.',
  ...over,
});

/* ── which trades we may correct ─────────────────────────────────────────── */

test('a measured trade yields a factor and the sentence behind it', () => {
  const f = tradeFactorsFrom([row()]);
  assert.equal(f.carpentry.factor, 1.3);
  assert.equal(f.carpentry.jobs, 9);
  assert.equal(f.carpentry.clamped, false);
  assert.ok(f.carpentry.because.includes('9 finished jobs'));
  assert.ok(f.carpentry.because.includes('over'));
});

test('thin evidence yields nothing at all, not a factor of one', () => {
  const f = tradeFactorsFrom([row({ jobs: 4, confident: false })]);
  assert.deepEqual(f, {},
    'a caller must be able to tell "measured and fine" from "never measured"');
  assert.equal(MIN_JOBS, 5);
});

test('a small variance is noise and yields nothing', () => {
  const f = tradeFactorsFrom([row({ quotedHours: 100, actualHours: 105, variancePercent: 5 })]);
  assert.deepEqual(f, {});
  assert.equal(MIN_VARIANCE, 10);
});

test('a row missing either side of the comparison yields nothing', () => {
  assert.deepEqual(tradeFactorsFrom([row({ quotedHours: 0 })]), {});
  assert.deepEqual(tradeFactorsFrom([row({ actualHours: 0 })]), {});
});

test('trade names meet regardless of how they were typed', () => {
  assert.equal(tradeKey('Carpentry'), 'carpentry');
  assert.equal(tradeKey('Rough Framing'), 'roughframing');
  const f = tradeFactorsFrom([row({ key: 'Carpentry' })]);
  assert.ok(f.carpentry);
});

/* ── the clamp, which is the guard that matters ──────────────────────────── */

test('a wild overrun is capped rather than quoted at face value', () => {
  const f = tradeFactorsFrom([row({ quotedHours: 100, actualHours: 400, variancePercent: 300 })]);
  assert.equal(f.carpentry.factor, MAX_FACTOR);
  assert.equal(f.carpentry.clamped, true);
  assert.ok(f.carpentry.because.includes('capped'),
    'quadrupling every future quote on five unusual jobs loses the work outright');
});

test('a wild underrun is capped too, in the other direction', () => {
  const f = tradeFactorsFrom([row({ quotedHours: 100, actualHours: 20, variancePercent: -80 })]);
  assert.equal(f.carpentry.factor, MIN_FACTOR);
  assert.equal(f.carpentry.clamped, true);
});

test('a correction inside the band is not marked as capped', () => {
  const f = tradeFactorsFrom([row({ quotedHours: 100, actualHours: 150, variancePercent: 50 })]);
  assert.equal(f.carpentry.factor, 1.5);
  assert.equal(f.carpentry.clamped, false);
});

/* ── applying it to a quote ──────────────────────────────────────────────── */

test('an estimated line is corrected, and its total follows', () => {
  const r = applyMeasuredHours([line()], tradeFactorsFrom([row()]));
  assert.equal(r.adjusted, 1);
  assert.equal(r.lines[0].hours, 13);
  assert.equal(r.lines[0].totalCost, 845, '13 hours at 65');
  assert.equal(r.lines[0].hoursSource, 'measured');
});

test('what the model said is kept, so the change can always be traced', () => {
  const r = applyMeasuredHours([line()], tradeFactorsFrom([row()]));
  assert.equal(r.lines[0].modelHours, 10);
  assert.equal(r.lines[0].measuredFactor, 1.3);
  assert.ok(r.lines[0].productivityNote.includes('Model takeoff.'));
  assert.ok(r.lines[0].productivityNote.includes('9 finished jobs'));
});

test('hours somebody set themselves are left exactly as they are', () => {
  const r = applyMeasuredHours(
    [line({ hoursSource: 'yours', hours: 6 })],
    tradeFactorsFrom([row()]),
  );
  assert.equal(r.adjusted, 0);
  assert.equal(r.lines[0].hours, 6);
  assert.equal(r.lines[0].hoursSource, 'yours');
});

test('a trade we have never measured is untouched and stays labelled a guess', () => {
  const r = applyMeasuredHours(
    [line({ trade: 'plumbing' })],
    tradeFactorsFrom([row()]),
  );
  assert.equal(r.adjusted, 0);
  assert.equal(r.lines[0].hours, 10);
  assert.equal(r.lines[0].hoursSource, 'estimated');
});

test('only the measured trades on a mixed quote move', () => {
  const r = applyMeasuredHours(
    [line(), line({ trade: 'plumbing' }), line({ trade: 'Carpentry', hours: 4, totalCost: 260 })],
    tradeFactorsFrom([row()]),
  );
  assert.equal(r.adjusted, 2);
  assert.equal(r.lines[0].hours, 13);
  assert.equal(r.lines[1].hours, 10);
  assert.equal(r.lines[2].hours, 5.2);
});

test('a line with no hours is not given any', () => {
  const r = applyMeasuredHours([line({ hours: 0, totalCost: 0 })], tradeFactorsFrom([row()]));
  assert.equal(r.adjusted, 0);
  assert.equal(r.lines[0].hours, 0);
});

test('padding is corrected downward as readily as an overrun is corrected up', () => {
  const under = tradeFactorsFrom([row({ quotedHours: 100, actualHours: 75, variancePercent: -25 })]);
  const r = applyMeasuredHours([line()], under);
  assert.equal(r.lines[0].hours, 7.5);
  assert.ok(r.lines[0].productivityNote.includes('under'));
});

/* ── nothing to do ───────────────────────────────────────────────────────── */

test('no measurements leaves the quote exactly as the model built it', () => {
  const r = applyMeasuredHours([line()], {});
  assert.equal(r.adjusted, 0);
  assert.equal(r.lines[0].hours, 10);
  assert.equal(r.lines[0].hoursSource, 'estimated');
});

test('an empty quote is an empty result, not a crash', () => {
  const r = applyMeasuredHours([], tradeFactorsFrom([row()]));
  assert.deepEqual(r.lines, []);
  assert.equal(r.adjusted, 0);
});

test('unreadable figures do not produce NaN hours on a customer’s quote', () => {
  const r = applyMeasuredHours(
    [line({ hours: 'lots' as any, hourlyRate: undefined as any })],
    tradeFactorsFrom([row()]),
  );
  assert.equal(r.lines[0].hours, 'lots', 'left untouched rather than turned into a number we invented');
  assert.equal(r.adjusted, 0);
});
