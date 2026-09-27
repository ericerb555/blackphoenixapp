/**
 * Correcting production rates from finished jobs, automatically.
 *
 * These numbers go straight into what a customer is quoted, and they move
 * without anybody pressing anything. So the tests below are weighted toward
 * the things that would be expensive to get wrong rather than toward coverage:
 *
 *   - a rate somebody set themselves is never moved, only offered
 *   - the same evidence never corrects a rate twice, because compounding an
 *     18% correction a few times prices the company out of its own market
 *   - a trade nothing in the catalogue matches is reported, not guessed at
 *   - every correction can be put back
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tradeKey, resolveHoursPerUnit, resolveCatalogue, evidenceKeyFor,
  learnRates, revertMeasured,
  MIN_JOBS_TO_ADJUST, MIN_VARIANCE_TO_ADJUST,
  type CatalogueTask, type MeasuredRate, type VarianceRow,
} from '../supabase/functions/server/rateLearning.ts';

const NOW = '2026-09-27T12:00:00.000Z';

const task = (id: string, tradeId: string, hoursPerUnit: number, source: CatalogueTask['source'] = 'seed'): CatalogueTask =>
  ({ id, tradeId, name: id, hoursPerUnit, source });

/** Framing, measured over five jobs, running 30% over quote. */
const over30: VarianceRow = {
  key: 'carpentry', label: 'Carpentry',
  jobs: 5, quotedHours: 100, actualHours: 130,
  variancePercent: 30, confident: true,
};

/* ── matching a trade ────────────────────────────────────────────────────── */

test('trade names meet regardless of how they were typed', () => {
  assert.equal(tradeKey('Carpentry'), 'carpentry');
  assert.equal(tradeKey('roofing / gutters'), 'roofinggutters');
  assert.equal(tradeKey('  Deck-Building '), 'deckbuilding');
  assert.equal(tradeKey(null), '');
});

test('a trade the catalogue has nothing for is reported, never guessed at', () => {
  const r = learnRates({
    variance: [{ ...over30, key: 'deck building', label: 'Deck Building' }],
    tasks: [task('frame-wall', 'carpentry', 0.5)],
    measured: [], now: NOW,
  });
  assert.equal(r.applied.length, 0);
  assert.deepEqual(r.unmatchedTrades, [{ key: 'deckbuilding', jobs: 5, variancePercent: 30 }]);
});

/* ── which figure is in force ────────────────────────────────────────────── */

test('an edit somebody made beats a measurement', () => {
  const t = task('frame-wall', 'carpentry', 0.4, 'yours');
  const m: MeasuredRate = {
    taskId: 'frame-wall', tradeId: 'carpentry', hoursPerUnit: 0.65,
    previousHoursPerUnit: 0.5, variancePercent: 30, jobs: 5,
    because: '', measuredAt: NOW, evidenceKey: 'carpentry:5:30',
  };
  const r = resolveHoursPerUnit(t, { 'frame-wall': m });
  assert.equal(r.hoursPerUnit, 0.4);
  assert.equal(r.source, 'yours');
});

test('a measurement beats the book figure', () => {
  const t = task('frame-wall', 'carpentry', 0.5);
  const m: MeasuredRate = {
    taskId: 'frame-wall', tradeId: 'carpentry', hoursPerUnit: 0.65,
    previousHoursPerUnit: 0.5, variancePercent: 30, jobs: 5,
    because: 'measured', measuredAt: NOW, evidenceKey: 'carpentry:5:30',
  };
  const r = resolveHoursPerUnit(t, { 'frame-wall': m });
  assert.equal(r.hoursPerUnit, 0.65);
  assert.equal(r.source, 'measured');
  assert.equal(r.because, 'measured');
});

test('with nothing measured the book figure stands', () => {
  const r = resolveHoursPerUnit(task('frame-wall', 'carpentry', 0.5), {});
  assert.equal(r.hoursPerUnit, 0.5);
  assert.equal(r.source, 'seed');
});

test('the whole catalogue resolves at once, which is what a quote reads', () => {
  const rows = resolveCatalogue(
    [task('a', 'carpentry', 0.5), task('b', 'carpentry', 0.2, 'yours')],
    [{
      taskId: 'a', tradeId: 'carpentry', hoursPerUnit: 0.65, previousHoursPerUnit: 0.5,
      variancePercent: 30, jobs: 5, because: '', measuredAt: NOW, evidenceKey: 'k',
    }, {
      taskId: 'b', tradeId: 'carpentry', hoursPerUnit: 0.9, previousHoursPerUnit: 0.2,
      variancePercent: 30, jobs: 5, because: '', measuredAt: NOW, evidenceKey: 'k',
    }],
  );
  assert.equal(rows[0].hoursPerUnit, 0.65);
  assert.equal(rows[0].resolvedFrom, 'measured');
  assert.equal(rows[1].hoursPerUnit, 0.2, 'his own figure is what prices the job');
  assert.equal(rows[1].resolvedFrom, 'yours');
});

/* ── the line that must not be crossed ───────────────────────────────────── */

test('a rate somebody set is offered, never moved', () => {
  const r = learnRates({
    variance: [over30],
    tasks: [task('frame-wall', 'carpentry', 0.4, 'yours')],
    measured: [], now: NOW,
  });
  assert.equal(r.applied.length, 0, 'nothing was changed');
  assert.equal(r.measured.length, 0);
  assert.equal(r.heldBack.length, 1);
  assert.equal(r.heldBack[0].currentHoursPerUnit, 0.4);
  assert.equal(r.heldBack[0].suggestedHoursPerUnit, 0.52);
  assert.ok(r.heldBack[0].because.includes('5 finished jobs'));
});

test('a book figure nobody chose is corrected without being asked', () => {
  const r = learnRates({
    variance: [over30],
    tasks: [task('frame-wall', 'carpentry', 0.5)],
    measured: [], now: NOW,
  });
  assert.equal(r.applied.length, 1);
  assert.equal(r.applied[0].hoursPerUnit, 0.65, '0.5 scaled by the 30% overrun');
  assert.equal(r.applied[0].previousHoursPerUnit, 0.5);
  assert.equal(r.heldBack.length, 0);
});

test('every task in the trade moves, not just one', () => {
  const r = learnRates({
    variance: [over30],
    tasks: [
      task('frame-wall', 'carpentry', 0.5),
      task('hang-door', 'carpentry', 2),
      task('lay-tile', 'tile', 0.8),
    ],
    measured: [], now: NOW,
  });
  assert.equal(r.applied.length, 2);
  assert.deepEqual(r.applied.map((a) => a.taskId).sort(), ['frame-wall', 'hang-door']);
  assert.equal(r.applied.find((a) => a.taskId === 'hang-door')?.hoursPerUnit, 2.6);
});

test('a mixed trade corrects what it may and offers the rest', () => {
  const r = learnRates({
    variance: [over30],
    tasks: [task('frame-wall', 'carpentry', 0.5), task('hang-door', 'carpentry', 2, 'yours')],
    measured: [], now: NOW,
  });
  assert.equal(r.applied.length, 1);
  assert.equal(r.applied[0].taskId, 'frame-wall');
  assert.equal(r.heldBack.length, 1);
  assert.equal(r.heldBack[0].taskId, 'hang-door');
});

/* ── the same evidence never corrects twice ──────────────────────────────── */

test('running the pass again on unchanged evidence changes nothing', () => {
  const first = learnRates({
    variance: [over30], tasks: [task('frame-wall', 'carpentry', 0.5)],
    measured: [], now: NOW,
  });
  const second = learnRates({
    variance: [over30], tasks: [task('frame-wall', 'carpentry', 0.5)],
    measured: first.measured, now: NOW,
  });
  assert.equal(second.applied.length, 0,
    '18% applied twice is 39% — a few passes of that prices the company out of its own market');
  assert.equal(second.measured[0].hoursPerUnit, 0.65, 'and the correction already made still stands');
});

test('a newly finished job is new evidence, and the rate moves again', () => {
  const first = learnRates({
    variance: [over30], tasks: [task('frame-wall', 'carpentry', 0.5)],
    measured: [], now: NOW,
  });
  // A sixth job lands, and the trade now reads 10% over rather than 30%.
  const sixth: VarianceRow = {
    key: 'carpentry', label: 'Carpentry',
    jobs: 6, quotedHours: 130, actualHours: 143,
    variancePercent: 10, confident: true,
  };
  const second = learnRates({
    variance: [sixth], tasks: [task('frame-wall', 'carpentry', 0.5)],
    measured: first.measured, now: NOW,
  });
  assert.equal(second.applied.length, 1);
  assert.equal(second.applied[0].previousHoursPerUnit, 0.65,
    'it corrects from the figure in force, not from the book figure it replaced');
  assert.equal(second.applied[0].hoursPerUnit, 0.715);
});

test('the evidence key is the job count and the variance together', () => {
  assert.equal(evidenceKeyFor(over30), 'carpentry:5:30');
  assert.equal(evidenceKeyFor({ ...over30, jobs: 6 }), 'carpentry:6:30');
  assert.equal(evidenceKeyFor({ ...over30, variancePercent: 31 }), 'carpentry:5:31');
});

/* ── the floors ──────────────────────────────────────────────────────────── */

test('thin evidence corrects nothing', () => {
  const thin = { ...over30, jobs: 4, confident: false };
  const r = learnRates({
    variance: [thin], tasks: [task('frame-wall', 'carpentry', 0.5)], measured: [], now: NOW,
  });
  assert.equal(r.applied.length, 0);
  assert.equal(MIN_JOBS_TO_ADJUST, 5);
});

test('a small variance is noise and corrects nothing', () => {
  const small: VarianceRow = {
    key: 'carpentry', label: 'Carpentry',
    jobs: 9, quotedHours: 100, actualHours: 105, variancePercent: 5, confident: true,
  };
  const r = learnRates({
    variance: [small], tasks: [task('frame-wall', 'carpentry', 0.5)], measured: [], now: NOW,
  });
  assert.equal(r.applied.length, 0);
  assert.ok(small.variancePercent < MIN_VARIANCE_TO_ADJUST);
});

test('padding is corrected downward, and named as padding', () => {
  const under: VarianceRow = {
    key: 'carpentry', label: 'Carpentry',
    jobs: 5, quotedHours: 100, actualHours: 70, variancePercent: -30, confident: true,
  };
  const r = learnRates({
    variance: [under], tasks: [task('frame-wall', 'carpentry', 0.5)], measured: [], now: NOW,
  });
  assert.equal(r.applied[0].hoursPerUnit, 0.35);
  assert.ok(r.applied[0].because.includes('padding'),
    'quoting too high loses work on price, which is also a fault worth correcting');
});

test('a variance row with no quoted hours cannot say the quote was wrong', () => {
  const r = learnRates({
    variance: [{ ...over30, quotedHours: 0 }],
    tasks: [task('frame-wall', 'carpentry', 0.5)], measured: [], now: NOW,
  });
  assert.equal(r.applied.length, 0);
});

test('a task with no usable rate is skipped rather than made up', () => {
  const r = learnRates({
    variance: [over30], tasks: [task('frame-wall', 'carpentry', 0)], measured: [], now: NOW,
  });
  assert.equal(r.applied.length, 0);
});

/* ── undoing it ──────────────────────────────────────────────────────────── */

test('a correction can be put back, and the book figure returns', () => {
  const first = learnRates({
    variance: [over30], tasks: [task('frame-wall', 'carpentry', 0.5)], measured: [], now: NOW,
  });
  const after = revertMeasured(first.measured, 'frame-wall');
  assert.equal(after.length, 0);
  assert.equal(
    resolveHoursPerUnit(task('frame-wall', 'carpentry', 0.5), {}).hoursPerUnit,
    0.5,
    'an automatic change that cannot be undone is not one anybody should accept',
  );
});

test('reverting one correction leaves the others alone', () => {
  const first = learnRates({
    variance: [over30],
    tasks: [task('frame-wall', 'carpentry', 0.5), task('hang-door', 'carpentry', 2)],
    measured: [], now: NOW,
  });
  const after = revertMeasured(first.measured, 'frame-wall');
  assert.equal(after.length, 1);
  assert.equal(after[0].taskId, 'hang-door');
});

/* ── nothing to do ───────────────────────────────────────────────────────── */

test('no finished jobs is an empty pass, not a crash', () => {
  const r = learnRates({ variance: [], tasks: [task('a', 'carpentry', 0.5)], measured: [], now: NOW });
  assert.deepEqual(r.applied, []);
  assert.deepEqual(r.heldBack, []);
  assert.deepEqual(r.measured, []);
});

test('an empty catalogue reports the trades it could not act on', () => {
  const r = learnRates({ variance: [over30], tasks: [], measured: [], now: NOW });
  assert.equal(r.unmatchedTrades.length, 1);
  assert.equal(r.applied.length, 0);
});
