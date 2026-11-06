/**
 * Renaming a phase has to move everything that names it.
 *
 * A phase has no id. `processSteps[].title`, `materials[].phase`,
 * `labor[].phase` and `paymentSchedule[].phase` all refer to one by its text,
 * so editing the step title alone renamed a quarter of the truth.
 *
 * THE TEST THAT MATTERS IS THE DRAW ONE. Orphaned lines are visible — the
 * By-process tab shows an empty process sitting next to a ghost group with
 * all the money in it, and somebody notices. A draw whose `phase` no longer
 * matches any step is invisible: `isPhaseComplete` looks the name up among
 * the steps, fails to find it, and the draw simply never becomes due. The
 * quote looks right, the total is right, and a payment can never be raised.
 * That is found by a customer wondering why they were never invoiced.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { renamePhase, phaseNamesOf, wouldMerge } from '../src/app/lib/phaseRename.ts';
import { isPhaseComplete, withPhaseCompletion } from '../src/app/lib/phaseCompletion.ts';

const quote = () => ({
  id: 'q1',
  processSteps: [
    { id: 's1', title: 'First fix', description: 'rough in' },
    { id: 's2', title: 'Second fix', description: 'finish' },
  ],
  materials: [
    { id: 'm1', phase: 'First fix', totalCost: 300 },
    { id: 'm2', phase: 'Second fix', totalCost: 200 },
    { id: 'm3', phase: '', totalCost: 50 },
  ],
  labor: [
    { id: 'l1', phase: 'First fix', totalCost: 400 },
    { id: 'l2', phase: 'Second fix', totalCost: 100 },
  ],
  paymentSchedule: [
    { id: 'deposit', type: 'deposit', phase: null, label: 'Deposit — 30%', trigger: 'On acceptance of the quote' },
    { id: 'd1', type: 'phase', phase: 'First fix', label: 'First fix', trigger: 'On completion of first fix' },
    { id: 'd2', type: 'phase', phase: 'Second fix', label: 'Second fix', trigger: 'On completion of second fix' },
  ],
});

/* ── the whole point ─────────────────────────────────────────────────────── */

test('every reference to the old name moves', () => {
  const q = renamePhase(quote(), 'First fix', 'First fix (electrical)');

  assert.equal(q.processSteps[0].title, 'First fix (electrical)');
  assert.equal(q.materials[0].phase, 'First fix (electrical)');
  assert.equal(q.labor[0].phase, 'First fix (electrical)');
  assert.equal(q.paymentSchedule[1].phase, 'First fix (electrical)');
});

test('nothing belonging to another phase moves with it', () => {
  const q = renamePhase(quote(), 'First fix', 'Rough-in');

  assert.equal(q.processSteps[1].title, 'Second fix');
  assert.equal(q.materials[1].phase, 'Second fix');
  assert.equal(q.labor[1].phase, 'Second fix');
  assert.equal(q.paymentSchedule[2].phase, 'Second fix');
  // The untagged line stays untagged rather than being swept into the rename.
  assert.equal(q.materials[2].phase, '');
  // And the deposit, which belongs to no phase, is untouched.
  assert.equal(q.paymentSchedule[0].phase, null);
  assert.equal(q.paymentSchedule[0].label, 'Deposit — 30%');
});

/**
 * The invisible failure, stated as a test.
 *
 * Before the fix: rename the step, mark it complete, and the draw still
 * points at a phase nobody can finish.
 */
test('after a rename the draw can still be released by finishing the phase', () => {
  const q = renamePhase(quote(), 'Second fix', 'Second fix & snagging');

  const steps = withPhaseCompletion(q.processSteps as any, 'Second fix & snagging', '2026-11-06');
  const draw = q.paymentSchedule.find((d: any) => d.id === 'd2');

  assert.equal(draw.phase, 'Second fix & snagging');
  assert.equal(isPhaseComplete(steps as any, draw.phase), true);
});

test('the pre-fix behaviour is what this prevents', () => {
  // Rename ONLY the step, the way the editor used to.
  const q = quote();
  const stepsOnly = q.processSteps.map((s) =>
    s.title === 'Second fix' ? { ...s, title: 'Second fix & snagging' } : s,
  );
  const draw = q.paymentSchedule.find((d: any) => d.id === 'd2')!;

  const marked = withPhaseCompletion(stepsOnly as any, 'Second fix & snagging', '2026-11-06');
  assert.equal(
    isPhaseComplete(marked as any, draw.phase),
    false,
    'the draw is unreachable — this is the bug',
  );
});

/* ── customer-facing wording ─────────────────────────────────────────────── */

test('generated label and trigger follow the rename', () => {
  const q = renamePhase(quote(), 'First fix', 'Rough-in');
  const draw = q.paymentSchedule.find((d: any) => d.id === 'd1');

  assert.equal(draw.label, 'Rough-in');
  assert.equal(draw.trigger, 'On completion of rough-in');
});

/**
 * A rename is not a licence to overwrite somebody's wording on a document
 * that may already have been sent.
 */
test('hand-edited wording is left alone', () => {
  const q = quote();
  q.paymentSchedule[1].label = '50% due at rough-in stage';
  q.paymentSchedule[1].trigger = 'When the electrician signs off';

  const out = renamePhase(q, 'First fix', 'Rough-in');
  const draw = out.paymentSchedule[1];

  assert.equal(draw.phase, 'Rough-in', 'the structural link still moves');
  assert.equal(draw.label, '50% due at rough-in stage');
  assert.equal(draw.trigger, 'When the electrician signs off');
});

/* ── doing nothing, correctly ────────────────────────────────────────────── */

test('a no-op rename returns the very same object', () => {
  const q = quote();
  assert.equal(renamePhase(q, 'First fix', 'First fix'), q);
  assert.equal(renamePhase(q, 'First fix', '   First fix   '), q);
  assert.equal(renamePhase(q, '', 'Something'), q);
  assert.equal(renamePhase(q, 'First fix', ''), q);
  assert.equal(renamePhase(null, 'a', 'b'), null);
});

test('the original is never mutated', () => {
  const q = quote();
  const snapshot = JSON.stringify(q);
  renamePhase(q, 'First fix', 'Rough-in');
  assert.equal(JSON.stringify(q), snapshot);
});

test('a quote missing any of the four lists does not throw', () => {
  assert.doesNotThrow(() => renamePhase({ id: 'q' }, 'a', 'b'));
  assert.doesNotThrow(() => renamePhase({ processSteps: null, materials: 'nope' }, 'a', 'b'));
});

test('a step shaped with `step` instead of `title` is renamed in place', () => {
  const q = renamePhase(
    { processSteps: [{ id: 's1', step: 'Demolition' }], materials: [{ phase: 'Demolition' }] },
    'Demolition',
    'Strip-out',
  );
  assert.equal(q.processSteps[0].step, 'Strip-out');
  assert.equal(q.processSteps[0].title, undefined, 'no second key appears');
  assert.equal(q.materials[0].phase, 'Strip-out');
});

/* ── collisions, which the caller is warned about ────────────────────────── */

test('every name a quote refers to, from both sources', () => {
  const q = quote();
  q.materials.push({ id: 'm4', phase: 'Clean-up', totalCost: 10 } as any);
  assert.deepEqual(phaseNamesOf(q), ['First fix', 'Second fix', 'Clean-up']);
});

test('a rename onto an existing name is reported as a merge', () => {
  const q = quote();
  assert.equal(wouldMerge(q, 'First fix', 'Second fix'), true);
  assert.equal(wouldMerge(q, 'First fix', 'Rough-in'), false);
  assert.equal(wouldMerge(q, 'First fix', 'First fix'), false, 'renaming to itself is not a merge');
});

/**
 * And if it is done anyway, it genuinely merges — one name cannot be two
 * phases. This is the behaviour, asserted so nobody is surprised by it.
 */
test('a merge really does combine them', () => {
  const q = renamePhase(quote(), 'First fix', 'Second fix');
  const phases = q.materials.map((m: any) => m.phase);

  assert.deepEqual(phases, ['Second fix', 'Second fix', '']);
  assert.equal(phaseNamesOf(q).filter((n) => n === 'Second fix').length, 1);
});
