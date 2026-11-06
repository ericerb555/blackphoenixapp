/**
 * The schedule's phases must be the document's phases.
 *
 * The failure this guards against is quiet: a schedule that draws against
 * milestones the customer's copy never mentions. Everything adds up, nothing
 * looks wrong, and the first draw gets queried because the customer cannot
 * find "Steels" anywhere on the quote they signed.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { schedulePhasesOf, contractTotalOf } from '../src/app/lib/quoteToSchedule.ts';
import { buildPaymentSchedule, scheduleTotal } from '../src/app/lib/paymentSchedule.ts';

const quote = {
  totalCost: 21371.55,
  materials: [
    { name: 'Steel beam', quantity: 1, unitCost: 1840, totalCost: 1840, phase: 'Structural' },
    { name: 'Skip hire', quantity: 2, unitCost: 450, totalCost: 900, phase: 'Strip out', visible: false },
  ],
  labor: [
    { role: 'Carpenter', hours: 32, hourlyRate: 70, totalCost: 2240, phase: 'Structural' },
    { role: 'Labourer', hours: 16, hourlyRate: 38, totalCost: 608, phase: 'Strip out' },
  ],
  processSteps: [
    { title: 'Strip out', description: 'Remove existing', estimatedDuration: '2 days' },
    { title: 'Structural', description: 'Steels in', estimatedDuration: '4 days' },
  ],
};

test('the phases come out in the job’s own order, not the lines’ order', () => {
  // The lines mention Structural first; processSteps says Strip out leads.
  assert.deepEqual(schedulePhasesOf(quote).map((p) => p.title), ['Strip out', 'Structural']);
});

test('a phase’s value counts lines hidden from the customer', () => {
  // Strip out is 900 (hidden skip) + 608. Weighting by the visible lines only
  // would value it at 608 and shift the difference onto Structural.
  const phases = schedulePhasesOf(quote);
  assert.equal(phases.find((p) => p.title === 'Strip out')!.subtotal, 1508);
  assert.equal(phases.find((p) => p.title === 'Structural')!.subtotal, 4080);
});

test('hiding a line does not move money between phases', () => {
  const visible = JSON.parse(JSON.stringify(quote));
  visible.materials[1].visible = true;
  assert.deepEqual(schedulePhasesOf(quote), schedulePhasesOf(visible));
});

test('the section switches do not change the contract either', () => {
  const hidden = { ...quote, customerSections: { materials: false, labor: false, processDetail: false } };
  assert.deepEqual(schedulePhasesOf(hidden), schedulePhasesOf(quote));
});

test('phases described but not yet priced still appear, at zero', () => {
  const unpriced = {
    totalCost: 1000, materials: [], labor: [],
    processSteps: [{ title: 'Survey' }, { title: 'Build' }],
  };
  assert.deepEqual(schedulePhasesOf(unpriced), [
    { title: 'Survey', subtotal: 0 },
    { title: 'Build', subtotal: 0 },
  ]);
});

test('a quote with no phase structure yields no phases, which is allowed', () => {
  const flat = { totalCost: 500, materials: [{ name: 'Bits', quantity: 1, unitCost: 500, totalCost: 500 }], labor: [] };
  assert.deepEqual(schedulePhasesOf(flat), []);
  const s = buildPaymentSchedule({ phases: [], total: 500, depositRate: 0.3 });
  assert.deepEqual(s.map((d) => d.type), ['deposit', 'balance']);
});

test('end to end: the draws sum to the quote’s own total', () => {
  const s = buildPaymentSchedule({
    phases: schedulePhasesOf(quote),
    total: contractTotalOf(quote),
    depositRate: 0.3,
  });
  assert.equal(scheduleTotal(s), 21371.55);
  assert.deepEqual(s.map((d) => d.label), ['Deposit — 30%', 'Strip out', 'Structural']);
});

test('the contract total reads the quote, and copes with junk', () => {
  assert.equal(contractTotalOf({ totalCost: 10 }), 10);
  assert.equal(contractTotalOf({ total: 7 }), 7);
  for (const bad of [undefined, null, {}, { totalCost: 'x' }]) assert.equal(contractTotalOf(bad), 0);
});

test('a malformed quote does not throw', () => {
  for (const bad of [undefined, null, {}, { materials: 'no', labor: 3, processSteps: 9 }]) {
    assert.doesNotThrow(() => schedulePhasesOf(bad));
  }
});

/* ── the total the schedule divides up ───────────────────────────────────── */

/**
 * `contractTotalOf` read `totalCost ?? total` and nothing else, so a quote
 * carrying its figure anywhere else resolved to ZERO — not an error, zero.
 * `buildPaymentSchedule` then dutifully apportioned nothing and produced a
 * full set of draws worth £0.00 each. The schedule looked built and was
 * worthless.
 *
 * That is what "the rebuild payment schedule isn't working" turned out to
 * be. The arithmetic was never wrong; it was being handed a zero.
 *
 * `grandTotal` is not hypothetical — the generator writes
 * `totals.grandTotal`, and the editor reads `total || grandTotal ||
 * totalCost` when converting a quote to a contract. The editor already knew
 * the figure could live there. The schedule did not.
 */
test('the total is found wherever a quote actually keeps it', () => {
  assert.equal(contractTotalOf({ totalCost: 9000 }), 9000);
  assert.equal(contractTotalOf({ total: 9000 }), 9000);
  assert.equal(contractTotalOf({ grandTotal: 9000 }), 9000);
  assert.equal(contractTotalOf({ totals: { grandTotal: 9000 } }), 9000);
  assert.equal(contractTotalOf({ totals: { total: 9000 } }), 9000);
});

/**
 * The first POSITIVE one wins, not the first one present. A quote carrying
 * `totalCost: 0` beside a real `grandTotal` is the exact shape that caused
 * this; preferring a defined zero would keep the bug while looking fixed.
 */
test('a zero does not win over a real figure', () => {
  assert.equal(contractTotalOf({ totalCost: 0, grandTotal: 9000 }), 9000);
  assert.equal(contractTotalOf({ totalCost: null, total: 0, grandTotal: 1200 }), 1200);
});

test('a quote with no figure anywhere is zero, not NaN', () => {
  for (const q of [{}, null, undefined, { totalCost: 'abc' }, { totalCost: NaN }]) {
    const v = contractTotalOf(q as any);
    assert.equal(v, 0, JSON.stringify(q));
    assert.ok(Number.isFinite(v));
  }
});

/** The end-to-end shape of the bug, as one assertion. */
test('a grandTotal-only quote now builds a schedule worth something', () => {
  const quote = {
    grandTotal: 10000,
    processSteps: [{ title: 'Set-up' }, { title: 'Fit out' }],
    materials: [{ totalCost: 6000, phase: 'Fit out' }],
    labor: [{ totalCost: 4000, phase: 'Set-up' }],
  };
  const draws = buildPaymentSchedule({
    phases: schedulePhasesOf(quote),
    total: contractTotalOf(quote),
    depositRate: 0.3,
  });

  assert.ok(draws.length > 0);
  assert.equal(scheduleTotal(draws), 10000);
  assert.ok(draws.every((d) => d.amount > 0), 'no draw should be worth nothing');
});
