/**
 * Every phase a line names is a stage of the job.
 *
 * Q-2026-0002 carried `Fixture Installation` ($2,397.50) and `Wall
 * Modifications` ($235.69) on its lines and on neither of its steps. Both were
 * drawn after the six phases that had steps, landed past a page break, and
 * adding up the first page gave $10,032.94 against a total of $12,666.13.
 *
 * Nothing was lost — $2,633.19 of work was in the wrong part of the document.
 * These assertions are about WHERE a stage ends up, and about the things this
 * must never do to a quote on the way: no step removed, none renamed, none
 * reordered, no description invented, and not a cent moved.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { syncQuotePhases, missingPhasesOf } from '../supabase/functions/server/quotePhaseSync.ts';
import { selectQuoteLines } from '../src/app/lib/quotePdfSelection.ts';
import { groupLinesByPhase } from '../src/app/lib/invoicePhases.ts';
import { schedulePhasesOf } from '../src/app/lib/quoteToSchedule.ts';

/** Q-2026-0002, reduced to the shape that produced the fault. */
const SARAH = {
  processSteps: [
    { title: 'Site Setup and Protection', stepNumber: 1 },
    { title: 'Demolition and Preparation', stepNumber: 2 },
    { title: 'Bench Construction', stepNumber: 3 },
    { title: 'Electrical Rough-In', stepNumber: 4 },
    { title: 'Lighting Installation', stepNumber: 5 },
    { title: 'Painting', stepNumber: 6 },
    { title: 'Final Cleanup and Handover', stepNumber: 7 },
  ],
  materials: [
    { name: '2x4 Lumber', phase: 'Bench Construction', quantity: 25, unitCost: 4.38, totalCost: 109.5 },
    { name: 'Plywood Sheets', phase: 'Bench Construction', quantity: 6, unitCost: 38.4, totalCost: 253.44 },
    { name: 'Drywall work', phase: 'Wall Modifications', quantity: 13, unitCost: 18.13, totalCost: 235.69 },
    { name: 'LED Strip Lights', phase: 'Lighting Installation', quantity: 30, unitCost: 21.25, totalCost: 637.5 },
    { name: 'Electrical Wire', phase: 'Electrical Rough-In', quantity: 100, unitCost: 4.65, totalCost: 465 },
    { name: 'Hair Dryers', phase: 'Fixture Installation', quantity: 3, unitCost: 202.5, totalCost: 607.5 },
    { name: 'Paint', phase: 'Painting', quantity: 10, unitCost: 50.4, totalCost: 504 },
    { name: 'New Material', phase: 'Site Setup and Protection', quantity: 2, unitCost: 24, totalCost: 48 },
    { name: 'Custom Benches', phase: 'Fixture Installation', quantity: 3, unitCost: 350, totalCost: 1050 },
  ],
  labor: [
    { role: 'General Laborer', phase: 'Site Setup and Protection', hours: 40, hourlyRate: 51.75, totalCost: 2070 },
    { role: 'Carpenter', phase: 'Bench Construction', hours: 30, hourlyRate: 80.5, totalCost: 2415 },
    { role: 'Licensed Electrician', phase: 'Electrical Rough-In', hours: 24, hourlyRate: 115, totalCost: 2760 },
    { role: 'Painter', phase: 'Painting', hours: 8, hourlyRate: 57.5, totalCost: 460 },
    { role: 'Cleanup Crew', phase: 'Final Cleanup and Handover', hours: 6, hourlyRate: 51.75, totalCost: 310.5 },
    { role: 'New Labor Role', phase: 'Fixture Installation', hours: 4, hourlyRate: 120, totalCost: 480 },
    { role: 'Bench install', phase: 'Fixture Installation', hours: 4, hourlyRate: 65, totalCost: 260 },
  ],
  customerSections: { materials: true, labor: true, processDetail: true },
  totalCost: 12666.13,
};

const titles = (steps: any[]) => steps.map((s) => String(s.title || s.step));

/* ── finding them ────────────────────────────────────────────────────────── */

test('the two phases nobody listed are found', () => {
  assert.deepEqual(missingPhasesOf(SARAH), ['Wall Modifications', 'Fixture Installation']);
});

test('a quote whose phases all have steps needs nothing done to it', () => {
  const tidy = { ...SARAH, materials: SARAH.materials.filter((m) => m.phase !== 'Wall Modifications' && m.phase !== 'Fixture Installation'), labor: SARAH.labor.filter((l) => l.phase !== 'Fixture Installation') };
  assert.deepEqual(missingPhasesOf(tidy), []);
  const out = syncQuotePhases(tidy);
  assert.equal(out.changed, false);
  assert.equal(out.steps, tidy.processSteps, 'the original array comes straight back');
});

/* ── where they go ───────────────────────────────────────────────────────── */

test('a missing phase lands where its own lines put it, not at the end', () => {
  const { steps, added } = syncQuotePhases(SARAH);
  assert.deepEqual(added, ['Wall Modifications', 'Fixture Installation']);
  assert.deepEqual(titles(steps), [
    'Site Setup and Protection',
    'Demolition and Preparation',
    'Bench Construction',
    'Wall Modifications',      // its drywall line follows the bench lines
    'Electrical Rough-In',
    'Fixture Installation',    // its hair dryers follow the electrical wire
    'Lighting Installation',
    'Painting',
    'Final Cleanup and Handover',
  ]);
});

test('a phase whose lines come before any known one goes to the front', () => {
  const quote = {
    processSteps: [{ title: 'Framing' }],
    materials: [
      { name: 'Skip', phase: 'Strip out', totalCost: 400 },
      { name: 'Timber', phase: 'Framing', totalCost: 900 },
    ],
    labor: [],
  };
  assert.deepEqual(titles(syncQuotePhases(quote).steps), ['Strip out', 'Framing']);
});

test('two new phases in a row keep the order their lines appeared', () => {
  const quote = {
    processSteps: [{ title: 'Framing' }],
    materials: [
      { name: 'Timber', phase: 'Framing', totalCost: 900 },
      { name: 'Board', phase: 'Boarding', totalCost: 300 },
      { name: 'Tape', phase: 'Taping', totalCost: 100 },
    ],
    labor: [],
  };
  assert.deepEqual(titles(syncQuotePhases(quote).steps), ['Framing', 'Boarding', 'Taping']);
});

test('a line added later creates its stage, which is the whole point', () => {
  const after = {
    ...SARAH,
    labor: [...SARAH.labor, { role: 'Snagging', phase: 'Snag list', hours: 3, hourlyRate: 60, totalCost: 180 }],
  };
  assert.ok(titles(syncQuotePhases(after).steps).includes('Snag list'));
});

/* ── what it must never do ───────────────────────────────────────────────── */

test('no step is removed, renamed or reordered', () => {
  const { steps } = syncQuotePhases(SARAH);
  const kept = titles(steps).filter((t) => titles(SARAH.processSteps).includes(t));
  assert.deepEqual(kept, titles(SARAH.processSteps), 'the originals, in their original order');
  // Including the one with no lines against it at all.
  assert.ok(kept.includes('Demolition and Preparation'));
});

test('an added step carries the name and invents nothing else', () => {
  const { steps } = syncQuotePhases(SARAH);
  const added = steps.find((s: any) => s.title === 'Wall Modifications') as any;
  assert.equal(added.description, undefined, 'no paragraph about a job this cannot know');
  assert.equal(added.estimatedDuration, undefined);
});

test('an excluded line does not invent a stage for work nobody is buying', () => {
  const quote = {
    processSteps: [{ title: 'Framing' }],
    materials: [
      { name: 'Timber', phase: 'Framing', totalCost: 900 },
      { name: 'Dropped', phase: 'Loft conversion', totalCost: 9000, included: false },
    ],
    labor: [],
  };
  assert.deepEqual(missingPhasesOf(quote), []);
});

test('a hidden line DOES have a stage, because it is still charged for', () => {
  const quote = {
    processSteps: [{ title: 'Framing' }],
    materials: [
      { name: 'Timber', phase: 'Framing', totalCost: 900 },
      { name: 'Dump run', phase: 'Disposal', totalCost: 125, visible: false },
    ],
    labor: [],
  };
  assert.deepEqual(missingPhasesOf(quote), ['Disposal']);
});

test('step numbers come out 1..n with no gap to ask about', () => {
  const { steps } = syncQuotePhases(SARAH);
  assert.deepEqual(steps.map((s: any) => s.stepNumber), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

/* ── and not a cent moves ────────────────────────────────────────────────── */

test('the document draws the same money, in a better order', () => {
  const before = selectQuoteLines(SARAH, true);
  const after = selectQuoteLines({ ...SARAH, processSteps: syncQuotePhases(SARAH).steps }, true);

  const sum = (q: any, sel: any) => Math.round(groupLinesByPhase(sel.lines, sel.steps)
    .reduce((t: number, g: any) => t + (g.phase && sel.phaseCost.has(g.phase) ? sel.phaseCost.get(g.phase) : g.subtotal), 0) * 100) / 100;

  assert.equal(sum(SARAH, before), 12666.13);
  assert.equal(sum(SARAH, after), 12666.13, 'same total');

  const order = (sel: any) => groupLinesByPhase(sel.lines, sel.steps).map((g: any) => g.label);
  assert.equal(order(before).indexOf('Fixture Installation'), 7, 'was last');
  assert.equal(order(after).indexOf('Fixture Installation'), 4, 'now in the middle of the job');
});

test('the payment schedule keeps every draw and every amount', () => {
  const before = schedulePhasesOf(SARAH);
  const after = schedulePhasesOf({ ...SARAH, processSteps: syncQuotePhases(SARAH).steps });

  const byTitle = (rows: any[]) => Object.fromEntries(rows.map((r) => [r.title, r.subtotal]));
  assert.deepEqual(byTitle(after), byTitle(before), 'same phases, same values');
  assert.equal(
    Math.round(after.reduce((t, p) => t + p.subtotal, 0) * 100) / 100,
    12666.13,
  );
});
