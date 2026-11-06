/**
 * Which phases are finished, and which draws that makes due.
 *
 * The schedule has always drawn one invoice per phase, and each draw has
 * always carried a trigger reading "on completion of Framing". Nothing
 * recorded whether Framing was finished, so that sentence was a note to a
 * human and the list could not tell a draw that was due from one months
 * away.
 *
 * Two things are worth pinning down. That a draw reads as DUE only when its
 * phase is actually marked done — otherwise the signal is noise. And that
 * the deposit never reads as waiting, because it has nothing to complete
 * and a permanent false warning on the one always-collectable draw would
 * teach somebody to ignore the column.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  completionMap, isPhaseComplete, withPhaseCompletion, drawReadiness, dueCount,
} from '../src/app/lib/phaseCompletion.ts';

const steps = [
  { id: 's1', title: 'Strip-out', completedAt: '2026-11-01T09:00:00.000Z' },
  { id: 's2', title: 'Framing' },
  { id: 's3', title: 'Second fix', completedAt: null },
];

/* ── reading what is finished ────────────────────────────────────────────── */

test('only phases with a date are complete', () => {
  assert.equal(isPhaseComplete(steps, 'Strip-out'), true);
  assert.equal(isPhaseComplete(steps, 'Framing'), false);
  assert.equal(isPhaseComplete(steps, 'Second fix'), false, 'an explicit null is not complete');
});

test('a phase the job does not have is not complete', () => {
  assert.equal(isPhaseComplete(steps, 'Roofing'), false);
  assert.equal(isPhaseComplete(steps, ''), false);
  assert.equal(isPhaseComplete(steps, null), false);
});

test('a step written as `step` rather than `title` still counts', () => {
  assert.equal(isPhaseComplete([{ step: 'Framing', completedAt: '2026-11-02' }], 'Framing'), true);
});

test('the map holds only the finished ones', () => {
  assert.deepEqual([...completionMap(steps).keys()], ['Strip-out']);
});

test('malformed input does not throw', () => {
  assert.equal(completionMap(null as any).size, 0);
  assert.equal(isPhaseComplete(undefined as any, 'Framing'), false);
});

/* ── marking, and unmarking ──────────────────────────────────────────────── */

test('marking a phase complete does not touch the others', () => {
  const out = withPhaseCompletion(steps, 'Framing', '2026-11-05T12:00:00.000Z');
  assert.equal(isPhaseComplete(out, 'Framing'), true);
  assert.equal(isPhaseComplete(out, 'Strip-out'), true, 'still complete');
  assert.equal(isPhaseComplete(out, 'Second fix'), false, 'still not');
});

/** One click marks it; marking the wrong one has to be undoable. */
test('a phase can be unmarked', () => {
  const out = withPhaseCompletion(steps, 'Strip-out', null);
  assert.equal(isPhaseComplete(out, 'Strip-out'), false);
});

test('marking does not mutate the steps it was given', () => {
  withPhaseCompletion(steps, 'Framing', '2026-11-05');
  assert.equal(isPhaseComplete(steps, 'Framing'), false, 'the caller array is untouched');
});

/* ── what that makes due ─────────────────────────────────────────────────── */

test('a draw whose phase is finished is due', () => {
  const r = drawReadiness({ phase: 'Strip-out', status: 'pending' }, steps);
  assert.equal(r.ready, true);
  assert.equal(r.state, 'due');
  assert.match(r.note, /completed 2026-11-01/);
});

test('a draw whose phase is not finished is waiting, and says on what', () => {
  const r = drawReadiness({ phase: 'Framing', status: 'pending' }, steps);
  assert.equal(r.ready, false);
  assert.equal(r.state, 'waiting');
  assert.match(r.note, /Waiting on Framing/);
});

/**
 * The deposit has no phase. Treating it as blocked would put a permanent
 * false warning on the one draw that is always collectable.
 */
test('the deposit is never waiting on anything', () => {
  const r = drawReadiness({ phase: null, type: 'deposit', status: 'pending' }, steps);
  assert.equal(r.ready, true);
  assert.equal(r.state, 'due');
  assert.match(r.note, /nothing to complete/i);
});

test('a raised or paid draw is neither due nor waiting', () => {
  assert.equal(drawReadiness({ phase: 'Strip-out', status: 'invoiced' }, steps).state, 'raised');
  assert.equal(drawReadiness({ phase: 'Strip-out', status: 'paid' }, steps).state, 'paid');
  // And neither offers itself up to be raised again.
  assert.equal(drawReadiness({ phase: 'Strip-out', status: 'invoiced' }, steps).ready, false);
  assert.equal(drawReadiness({ phase: 'Strip-out', status: 'paid' }, steps).ready, false);
});

test('the due count is what you could invoice right now', () => {
  const draws = [
    { phase: null, status: 'pending' },          // deposit, always due
    { phase: 'Strip-out', status: 'pending' },   // complete
    { phase: 'Framing', status: 'pending' },     // not complete
    { phase: 'Second fix', status: 'invoiced' }, // already raised
  ];
  assert.equal(dueCount(draws, steps), 2);
});

test('nothing is due on a job where nothing is finished', () => {
  const none = [{ title: 'Framing' }, { title: 'Second fix' }];
  const draws = [{ phase: 'Framing', status: 'pending' }, { phase: 'Second fix', status: 'pending' }];
  assert.equal(dueCount(draws, none), 0);
});
