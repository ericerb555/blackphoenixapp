/**
 * Every priced line answers to a phase, or we know it does not.
 *
 * The estimator prompt demands the exact phase string on every line, and the
 * model mostly obeys. "Mostly" is the problem: a paraphrase matches no phase,
 * so `groupLinesByPhase` files the line in a loose "Additional items" group
 * and a third of a job's money can end up in an untitled section at the
 * bottom of the customer's quote with nothing to say it happened.
 *
 * The tests come in two halves, and the SECOND half is the important one.
 * Repairing a near-miss is easy. Refusing to repair an ambiguous one is what
 * keeps money off the wrong invoice: the payment schedule draws one invoice
 * per phase, so a line snapped into the wrong phase bills the customer at the
 * wrong milestone — and unlike an untidy group, it looks perfectly correct.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalisePhase, matchPhase, phaseOrderOf, reconcilePhases,
} from '../supabase/functions/server/quotePhasePlan.ts';

const steps = [
  { step: 'Set-up and site protection' },
  { step: 'Demolition and strip-out' },
  { step: 'First fix plumbing' },
  { step: 'Clean-up and hand-over' },
];
const order = phaseOrderOf(steps);

/* ── the order is the job's order, never sorted ──────────────────────────── */

test('phases keep the order the job runs them in', () => {
  assert.deepEqual(order, [
    'Set-up and site protection',
    'Demolition and strip-out',
    'First fix plumbing',
    'Clean-up and hand-over',
  ]);
});

test('a repeated phase is listed once', () => {
  assert.deepEqual(phaseOrderOf([{ step: 'Framing' }, { step: 'Framing' }]), ['Framing']);
});

test('a step titled rather than stepped still counts', () => {
  assert.deepEqual(phaseOrderOf([{ title: 'Framing' }]), ['Framing']);
});

/* ── repairing what the model actually gets wrong ────────────────────────── */

test('an exact name matches itself', () => {
  assert.equal(matchPhase('First fix plumbing', order), 'First fix plumbing');
});

test('punctuation and connecting words do not matter', () => {
  assert.equal(matchPhase('Set up & site protection', order), 'Set-up and site protection');
  assert.equal(matchPhase('set-up and site protection', order), 'Set-up and site protection');
  assert.equal(matchPhase('SETUP AND SITE PROTECTION', order), 'Set-up and site protection');
});

test('the shortened name the model likes to return is matched', () => {
  assert.equal(matchPhase('Demolition', order), 'Demolition and strip-out');
  assert.equal(matchPhase('Clean-up', order), 'Clean-up and hand-over');
});

test('normalising collapses the spellings of one phase onto one key', () => {
  const forms = ['Set-up and site protection', 'Set up & Site Protection', 'setup, site protection'];
  const keys = new Set(forms.map(normalisePhase));
  assert.equal(keys.size, 1, [...keys].join(' | '));
});

/* ── and refusing to guess, which is the half that protects the money ────── */

test('an unknown phase is left alone, not forced into the nearest', () => {
  assert.equal(matchPhase('Roof covering', order), null);
});

test('a fragment too short to be sure of matches nothing', () => {
  // "fix" appears in "First fix plumbing" but is three letters of a common
  // word; snapping on it would be a coin toss.
  assert.equal(matchPhase('fix', order), null);
});

test('a name that fits two phases equally is not a match', () => {
  const ambiguous = phaseOrderOf([
    { step: 'First fix plumbing' },
    { step: 'Second fix plumbing' },
  ]);
  assert.equal(matchPhase('plumbing', ambiguous), null, 'two plausible homes is a coin toss');
});

test('nothing matches when the job has no phases', () => {
  assert.equal(matchPhase('Framing', []), null);
});

test('an empty phase string matches nothing', () => {
  assert.equal(matchPhase('', order), null);
  assert.equal(matchPhase(undefined, order), null);
});

/* ── the whole reconciliation, and its report ────────────────────────────── */

test('lines are snapped, and the report says how many', () => {
  const materials = [
    { name: 'Dust sheets', phase: 'Set up & site protection' },
    { name: 'Skip', phase: 'Demolition' },
    { name: 'Copper pipe', phase: 'First fix plumbing' },
  ];
  const labor = [
    { role: 'Labourer', phase: 'Clean up' },
    { role: 'Roofer', phase: 'Roof covering' },
    { role: 'Odd job', phase: '' },
  ];
  const out = reconcilePhases(steps, materials, labor);

  assert.equal(out.materials[0].phase, 'Set-up and site protection');
  assert.equal(out.materials[1].phase, 'Demolition and strip-out');
  assert.equal(out.materials[2].phase, 'First fix plumbing', 'already exact, untouched');
  assert.equal(out.labor[0].phase, 'Clean-up and hand-over');

  assert.equal(out.labor[1].phase, 'Roof covering', 'unknown phase left exactly as it was');
  assert.deepEqual(out.report.unmatched, ['Roof covering']);
  assert.equal(out.report.untagged, 1);
  assert.equal(out.report.snapped, 3);
});

test('reconciling does not mutate the lines it was given', () => {
  const materials = [{ name: 'Skip', phase: 'Demolition' }];
  reconcilePhases(steps, materials, []);
  assert.equal(materials[0].phase, 'Demolition', 'the caller’s array is untouched');
});

test('a quote with no phases at all passes straight through', () => {
  const materials = [{ name: 'Skip', phase: 'Demolition' }];
  const out = reconcilePhases([], materials, []);
  assert.equal(out.materials[0].phase, 'Demolition');
  assert.equal(out.report.snapped, 0);
  assert.deepEqual(out.report.order, []);
});

test('malformed input is survived, not thrown on', () => {
  const out = reconcilePhases(null as any, null as any, undefined as any);
  assert.deepEqual(out.materials, []);
  assert.deepEqual(out.labor, []);
  assert.equal(out.report.snapped, 0);
});
