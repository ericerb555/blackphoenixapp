/**
 * Every job makes rubbish, so every quote prices taking it away.
 *
 * Two failures are possible and they are not equally bad.
 *
 * MISSING is the one being fixed: the estimator decides a skip is "not
 * applicable" on a small job and the cost is eaten.
 *
 * DUPLICATED is the one to be careful of while fixing it. If the detector
 * does not recognise "haul-away" as disposal it will add a second line, and
 * the customer is overcharged — quietly, on a document that looks correct.
 * So most of this file is about what the detector must RECOGNISE, not about
 * what it adds.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isDisposalLine, findDisposal, ensureDisposal, disposalPlaceholder,
  disposalValueOf, DISPOSAL_MINIMUM,
} from '../supabase/functions/server/quoteDisposal.ts';

let n = 0;
const rid = () => `id-${++n}`;

/* ── what counts as disposal ─────────────────────────────────────────────── */

test('the names the estimator actually uses are all recognised', () => {
  const named = [
    { name: 'Dumpster rental, 10 yard' },
    { name: 'Skip hire' },
    { name: 'Debris disposal' },
    { name: 'Waste removal' },
    { name: 'Trash removal and disposal' },
    { name: 'Haul-away' },
    { name: 'Haul away of old units' },
    { name: 'Tip fees' },
    { name: 'Landfill charges' },
    { name: 'Dump run' },
    { name: 'Junk removal' },
    { name: 'Muck away' },
    { name: 'Rubbish clearance' },
  ];
  for (const row of named) {
    assert.ok(isDisposalLine(row), `${row.name} should count as disposal`);
  }
});

test('it reads the description and the category too, not just the name', () => {
  assert.ok(isDisposalLine({ name: 'Container', description: 'For debris from the strip-out' }));
  assert.ok(isDisposalLine({ name: 'Misc', category: 'Disposal' }));
  assert.ok(isDisposalLine({ role: 'Labourer', trade: 'waste' }));
});

test('ordinary lines are not mistaken for disposal', () => {
  for (const row of [
    { name: 'Timber, 2x4' },
    { name: 'Licensed Electrician', description: 'First fix wiring' },
    { name: 'Building permit', category: 'Permit' },
    { name: 'Paint, matt emulsion' },
    {},
  ]) {
    assert.ok(!isDisposalLine(row), `${JSON.stringify(row)} should not count`);
  }
});

/* ── where it looks ──────────────────────────────────────────────────────── */

test('disposal counts wherever the model happened to file it', () => {
  assert.equal(findDisposal({ additionalCosts: [{ name: 'Skip hire' }] }).foundIn, 'additionalCosts');
  assert.equal(findDisposal({ materials: [{ name: 'Dumpster rental' }] }).foundIn, 'materials');
  assert.equal(findDisposal({ labor: [{ role: 'Labourer', description: 'load the skip' }] }).foundIn, 'labor');
});

test('an estimate with none says so', () => {
  const check = findDisposal({ materials: [{ name: 'Timber' }], labor: [{ role: 'Carpenter' }] });
  assert.equal(check.present, false);
  assert.equal(check.foundIn, null);
});

/* ── what it does about it ───────────────────────────────────────────────── */

test('a missing disposal line is added at the minimum', () => {
  const out = ensureDisposal({ additionalCosts: [{ name: 'Permit', amount: 150 }] }, rid);
  assert.equal(out.added, true);
  assert.equal(out.additionalCosts.length, 2);
  const added: any = out.additionalCosts[1];
  assert.match(added.name, /trash removal/i);
  assert.equal(added.amount, DISPOSAL_MINIMUM);
});

/**
 * The guard that matters. A second skip on a quote that already has one
 * overcharges the customer, on a document that looks perfectly correct.
 */
test('disposal already present is never duplicated, under any of its names', () => {
  for (const row of [
    { name: 'Skip hire', amount: 400 },
    { name: 'Dumpster rental, 10 yard', amount: 400 },
    { name: 'Haul-away', amount: 400 },
  ]) {
    const out = ensureDisposal({ additionalCosts: [row] }, rid);
    assert.equal(out.added, false, `${row.name} should have been recognised`);
    assert.equal(out.raised, false, 'already over the floor');
    assert.equal(out.additionalCosts.length, 1);
    assert.equal((out.additionalCosts[0] as any).amount, 400, 'and left at its own price');
  }
});

test('disposal priced as a material does not get a second soft cost', () => {
  const out = ensureDisposal(
    { additionalCosts: [{ name: 'Permit', amount: 150 }], materials: [{ name: 'Dumpster rental', totalCost: 400 }] },
    rid,
  );
  assert.equal(out.added, false);
  assert.equal(out.foundIn, 'materials');
  assert.equal(out.additionalCosts.length, 1);
});

/* ── the $125 floor ──────────────────────────────────────────────────────── */

test('the placeholder carries the minimum, and says that is what it is', () => {
  const line = disposalPlaceholder(rid);
  assert.equal(line.amount, DISPOSAL_MINIMUM);
  assert.equal(line.atMinimum, true);
  assert.match(line.description, /minimum/i);
});

test('an estimate with no soft costs at all still gets disposal at the floor', () => {
  const out = ensureDisposal({}, rid);
  assert.equal(out.added, true);
  assert.equal(out.additionalCosts.length, 1);
  assert.equal((out.additionalCosts[0] as any).amount, DISPOSAL_MINIMUM);
});

/**
 * The subtle case. Disposal IS priced, so nothing is missing — but it is
 * priced under the company minimum, which is the situation the floor exists
 * for and the one a presence-only check would sail straight past.
 */
test('disposal priced under the floor is raised to it, not duplicated', () => {
  const out = ensureDisposal({ additionalCosts: [{ name: 'Skip hire', amount: 60 }] }, rid);
  assert.equal(out.added, false, 'no second line');
  assert.equal(out.raised, true);
  assert.equal(out.additionalCosts.length, 1);
  assert.equal((out.additionalCosts[0] as any).amount, DISPOSAL_MINIMUM);
});

test('a shortfall is topped up when there is no soft cost to raise', () => {
  // Only the hauling labour is priced, at $80. The floor wants $125.
  const out = ensureDisposal({ labor: [{ role: 'Labourer', description: 'haul away', totalCost: 80 }] }, rid);
  assert.equal(out.added, true);
  assert.equal((out.additionalCosts[0] as any).amount, 45, 'the shortfall, not another full minimum');
});

test('disposal spread across buckets is counted together', () => {
  const estimate = {
    additionalCosts: [{ name: 'Tip fees', amount: 40 }],
    materials: [{ name: 'Skip hire', totalCost: 50 }],
    labor: [{ role: 'Labourer', description: 'load the skip', totalCost: 45 }],
  };
  assert.equal(disposalValueOf(estimate), 135);
  const out = ensureDisposal(estimate, rid);
  assert.equal(out.added, false, '135 is over the floor');
  assert.equal(out.raised, false);
});

test('a material priced by quantity counts at quantity times unit cost', () => {
  assert.equal(disposalValueOf({ materials: [{ name: 'Skip hire', quantity: 2, unitCost: 300 }] }), 600);
});

test('non-disposal lines are not counted towards the floor', () => {
  const out = ensureDisposal({ additionalCosts: [{ name: 'Building permit', amount: 500 }] }, rid);
  assert.equal(out.added, true, 'a permit is not trash removal');
  assert.equal((out.additionalCosts[1] as any).amount, DISPOSAL_MINIMUM);
});

test('exactly the minimum is left alone', () => {
  const out = ensureDisposal({ additionalCosts: [{ name: 'Skip hire', amount: DISPOSAL_MINIMUM }] }, rid);
  assert.equal(out.added, false);
  assert.equal(out.raised, false);
});

/* ── trash removal is its own process ────────────────────────────────────── */

/**
 * Eric: "trash removal should be its own process for every job."
 *
 * It was a soft cost with no phase. Three things followed from that, none of
 * them visible on the quote: it never appeared in the by-process breakdown
 * (which groups materials and labour and nothing else), it could never carry
 * a draw (the schedule builds milestones from phases), and nobody could mark
 * it done (completion is per phase).
 *
 * THE INVARIANT WORTH PROTECTING is that none of this moves money. The line
 * stays in `additionalCosts`; only the heading it is drawn under changes.
 */
import { DISPOSAL_PHASE, disposalStep, ensureDisposalPhase } from '../supabase/functions/server/quoteDisposal.ts';

let seq = 0;
const ids = () => `id-${++seq}`;

test('a quote with no disposal phase gets one, last', () => {
  const steps = [{ title: 'Set-up' }, { title: 'First fix' }];
  const out = ensureDisposalPhase(steps, ids);

  assert.equal(out.added, true);
  assert.equal(out.phase, DISPOSAL_PHASE);
  assert.equal(out.steps.length, 3);
  assert.equal(out.steps[2].title, DISPOSAL_PHASE);
  // Last, because you cannot sweep up before the work that makes the mess.
  assert.equal(out.steps[2].stepNumber, 3);
});

/**
 * The model names this a dozen ways. Appending ours next to its "Debris
 * removal" would split one job's rubbish across two headings that mean the
 * same thing — and the line can only be tagged to one of them.
 */
test('a phase the model already wrote is adopted, not duplicated', () => {
  for (const title of ['Debris removal', 'Site clearance and haul-away', 'Dumpster & disposal']) {
    const out = ensureDisposalPhase([{ title: 'Set-up' }, { title }], ids);
    assert.equal(out.added, false, title);
    assert.equal(out.phase, title, title);
    assert.equal(out.steps.length, 2, title);
  }
});

test('an empty or junk step list still ends up with the phase', () => {
  assert.equal(ensureDisposalPhase([], ids).steps.length, 1);
  assert.equal(ensureDisposalPhase(null as any, ids).steps.length, 1);
});

test('the step is shaped like every other process step', () => {
  const step: any = disposalStep(ids, 4);
  for (const key of ['id', 'stepNumber', 'title', 'description', 'estimatedDuration', 'trade']) {
    assert.ok(key in step, `missing ${key}`);
  }
  assert.equal(step.stepNumber, 4);
  assert.ok(step.description.length > 20, 'the customer is owed a sentence about it');
});

/* ── the line is tagged to it ────────────────────────────────────────────── */

test('the added disposal line carries the phase', () => {
  const out = ensureDisposal({ additionalCosts: [], materials: [], labor: [] }, ids);
  const line: any = out.additionalCosts[0];
  assert.equal(line.phase, DISPOSAL_PHASE);
  assert.equal(out.added, true);
});

test('the line is tagged to the phase that EXISTS, not the one we would make', () => {
  const found = ensureDisposalPhase([{ title: 'Debris removal' }], ids);
  const out = ensureDisposal({ additionalCosts: [], materials: [], labor: [] }, ids, found.phase);
  assert.equal((out.additionalCosts[0] as any).phase, 'Debris removal');
});

test('a raised existing line is adopted into the process', () => {
  const out = ensureDisposal(
    { additionalCosts: [{ name: 'Skip hire', amount: 80 }], materials: [], labor: [] },
    ids,
  );
  const line: any = out.additionalCosts[0];
  assert.equal(out.raised, true);
  assert.equal(line.amount, DISPOSAL_MINIMUM);
  assert.equal(line.phase, DISPOSAL_PHASE);
});

test('a phase the estimator already chose for the line is left alone', () => {
  const out = ensureDisposal(
    { additionalCosts: [{ name: 'Skip hire', amount: 80, phase: 'Demolition' }], materials: [], labor: [] },
    ids,
  );
  assert.equal((out.additionalCosts[0] as any).phase, 'Demolition');
});

/**
 * The invariant. Making it a process must not change what anybody is
 * charged — the line never leaves `additionalCosts`, so every subtotal, the
 * markup, the tax and the total are untouched.
 */
test('making it a process does not move a penny', () => {
  const before = { additionalCosts: [{ name: 'Skip hire', amount: 300 }], materials: [], labor: [] };
  const out = ensureDisposal(before, ids);
  const sum = (rows: any[]) => rows.reduce((t, r) => t + Number(r.amount || 0), 0);

  assert.equal(out.added, false);
  assert.equal(out.raised, false, 'already over the floor');
  assert.equal(sum(out.additionalCosts), sum(before.additionalCosts));
});
