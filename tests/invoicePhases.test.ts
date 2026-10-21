/**
 * Grouping an invoice by the phases of the job.
 *
 * The money is the part that matters. A customer reading a grouped invoice
 * adds the phase subtotals in their head, and if they do not reach the
 * invoice subtotal they stop trusting the document — so the arithmetic is
 * asserted harder than the layout, including the awkward cases: credits,
 * fractional quantities, and lines that belong to no phase at all.
 *
 * The second theme is that nothing may disappear. Most existing invoices have
 * no phase on any line; people will keep adding ad-hoc lines by hand. A
 * grouping that quietly dropped those would be a billing error, not a display
 * bug.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  groupLinesByPhase, subtotalOf, hasPhaseStructure, lineAmount, applyDetailLevel,
  type PhasedLine,
} from '../src/app/lib/invoicePhases.ts';

const line = (description: string, quantity: number, unit_price: number, phase?: string): PhasedLine =>
  ({ description, quantity, unit_price, phase });

const PHASES = [
  { title: 'Strip-out', estimatedDuration: '2 days' },
  { title: 'Framing', estimatedDuration: '5 days' },
  { title: 'Second fix', estimatedDuration: '3 days' },
];

/* ── the money ───────────────────────────────────────────────────────────── */

test('phase subtotals sum exactly to the invoice subtotal', () => {
  const lines = [
    line('Skip hire', 1, 450, 'Strip-out'),
    line('Labourer', 16, 50, 'Strip-out'),
    line('Lumber', 1, 1100, 'Framing'),
    line('Carpenter', 40, 70, 'Framing'),
  ];
  const groups = groupLinesByPhase(lines, PHASES);
  assert.equal(groups[0].subtotal, 1250);
  assert.equal(groups[1].subtotal, 3900);
  assert.equal(subtotalOf(groups), 5150);
  // And it equals a naive sum of every line, which is what a customer does.
  assert.equal(subtotalOf(groups), lines.reduce((s, l) => s + lineAmount(l), 0));
});

test('credits are negative lines and reduce their phase', () => {
  const groups = groupLinesByPhase([
    line('Lumber', 1, 1100, 'Framing'),
    line('Customer-supplied timber', 1, -300, 'Framing'),
  ], PHASES);
  assert.equal(groups[0].subtotal, 800);
  assert.equal(subtotalOf(groups), 800);
});

test('fractional quantities do not drift the total by a penny', () => {
  // The classic failure: rounding each subtotal independently, so the groups
  // no longer agree with the whole.
  const lines = [
    line('Tile', 12.33, 7.77, 'Second fix'),
    line('Grout', 2.5, 19.99, 'Second fix'),
    line('Tiler', 7.25, 68.5, 'Second fix'),
  ];
  const groups = groupLinesByPhase(lines, PHASES);
  const naive = lines.reduce((s, l) => s + lineAmount(l), 0);
  assert.equal(subtotalOf(groups), Math.round(naive * 100) / 100);
});

/* ── nothing may vanish ──────────────────────────────────────────────────── */

test('lines with no phase are kept, in their own trailing group', () => {
  const groups = groupLinesByPhase([
    line('Lumber', 1, 1100, 'Framing'),
    line('Parking permit', 1, 40),
  ], PHASES);
  assert.equal(groups.length, 2);
  assert.equal(groups[1].phase, null);
  assert.equal(groups[1].label, 'Additional items');
  assert.equal(subtotalOf(groups), 1140);
});

test('an invoice with no phases at all still renders as one plain list', () => {
  // Every invoice that predates this. It must look exactly like it always did.
  const groups = groupLinesByPhase([
    line('Lumber', 1, 1100),
    line('Carpenter', 40, 70),
  ], []);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].phase, null);
  assert.equal(groups[0].label, 'Line Items');
  assert.equal(hasPhaseStructure(groups), false);
  assert.equal(subtotalOf(groups), 3900);
});

test('a phase the lines use but the job never listed still appears', () => {
  const groups = groupLinesByPhase([
    line('Lumber', 1, 1100, 'Framing'),
    line('Skip', 1, 450, 'Making good'),
  ], PHASES);
  assert.deepEqual(groups.map((g) => g.phase), ['Framing', 'Making good']);
  assert.equal(subtotalOf(groups), 1550);
});

/* ── order ───────────────────────────────────────────────────────────────── */

test('phases come out in the job order, not the line order', () => {
  const groups = groupLinesByPhase([
    line('Tiler', 1, 500, 'Second fix'),
    line('Skip', 1, 450, 'Strip-out'),
    line('Lumber', 1, 1100, 'Framing'),
  ], PHASES);
  assert.deepEqual(groups.map((g) => g.phase), ['Strip-out', 'Framing', 'Second fix']);
});

test('with no stated order, phases follow first appearance', () => {
  const groups = groupLinesByPhase([
    line('Tiler', 1, 500, 'Second fix'),
    line('Skip', 1, 450, 'Strip-out'),
  ], []);
  assert.deepEqual(groups.map((g) => g.phase), ['Second fix', 'Strip-out']);
});

test('a phase with no lines against it is not billed and not shown', () => {
  const groups = groupLinesByPhase([line('Lumber', 1, 1100, 'Framing')], PHASES);
  assert.deepEqual(groups.map((g) => g.phase), ['Framing']);
});

/* ── presentation details that carry meaning ─────────────────────────────── */

test('the phase duration travels through for the heading', () => {
  const groups = groupLinesByPhase([line('Lumber', 1, 1100, 'Framing')], PHASES);
  assert.equal(groups[0].duration, '5 days');
});

test('unassigned lines on an otherwise phased invoice are not called Line Items', () => {
  // "Line Items" is the heading of the old flat invoice. Reusing it beside
  // real phases would read as the main section rather than the remainder.
  const groups = groupLinesByPhase([
    line('Lumber', 1, 1100, 'Framing'),
    line('Parking permit', 1, 40),
  ], PHASES);
  assert.equal(groups[1].label, 'Additional items');
});

/* ── phase-totals: the breakdown is removed, not hidden ──────────────────── */

test('collapsing to phase totals keeps the price and removes the lines', () => {
  const groups = applyDetailLevel(groupLinesByPhase([
    line('Lumber', 1, 1100, 'Framing'),
    line('Carpenter', 40, 70, 'Framing'),
  ], PHASES), 'phase-totals');

  assert.equal(groups[0].subtotal, 3900);
  assert.deepEqual(groups[0].lines, []);
});

test('a collapsed group carries no trace of the breakdown at all', () => {
  // The whole point. A flag the renderer is trusted to respect would leave
  // the labour rate in the customer's browser — which is what the `visible`
  // checkbox did for months.
  const groups = applyDetailLevel(groupLinesByPhase([
    line('Carpenter 40h @ $70', 40, 70, 'Framing'),
    line('Trade discount from supplier', 1, -400, 'Framing'),
  ], PHASES), 'phase-totals');

  const json = JSON.stringify(groups);
  assert.ok(!json.includes('Carpenter'), 'labour line leaked');
  assert.ok(!json.includes('Trade discount'), 'supplier discount leaked');
  assert.ok(!json.includes('70'), 'the hourly rate leaked');
});

test('collapsing does not move the money — totals are identical either way', () => {
  const lines = [
    line('Skip hire', 1, 450, 'Strip-out'),
    line('Lumber', 1, 1100, 'Framing'),
    line('Carpenter', 40, 70, 'Framing'),
    line('Parking permit', 1, 40),
  ];
  const full = groupLinesByPhase(lines, PHASES);
  const collapsed = applyDetailLevel(full, 'phase-totals');
  assert.equal(subtotalOf(collapsed), subtotalOf(full));
  assert.equal(subtotalOf(collapsed), 4390); // 450 + 1100 + 2800 + 40
});

test("'full' is a pass-through and changes nothing", () => {
  const full = groupLinesByPhase([line('Lumber', 1, 1100, 'Framing')], PHASES);
  assert.deepEqual(applyDetailLevel(full, 'full'), full);
});

test('an unphased invoice collapsed to totals shows one price, no lines', () => {
  // The degenerate case: no phases, so the single group is the whole invoice.
  // It must not leak the lines just because there is only one section.
  const groups = applyDetailLevel(groupLinesByPhase([
    line('Lumber', 1, 1100),
    line('Carpenter', 40, 70),
  ], []), 'phase-totals');
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].lines, []);
  assert.equal(groups[0].subtotal, 3900);
});

/* ── rubbish in ──────────────────────────────────────────────────────────── */

test('malformed input yields nothing rather than throwing', () => {
  for (const bad of [undefined, null, 'nonsense', 7]) {
    const groups = groupLinesByPhase(bad as any, PHASES);
    assert.deepEqual(groups, []);
    assert.equal(subtotalOf(groups), 0);
  }
});

test('missing quantity or price counts as zero, not NaN', () => {
  const groups = groupLinesByPhase([
    { description: 'Vague', quantity: undefined as any, unit_price: undefined as any, phase: 'Framing' },
  ], PHASES);
  assert.equal(groups[0].subtotal, 0);
  assert.ok(!Number.isNaN(subtotalOf(groups)));
});

test('a blank or whitespace phase is treated as unassigned', () => {
  const groups = groupLinesByPhase([
    line('A', 1, 10, '   '),
    line('B', 1, 20, ''),
  ], PHASES);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].phase, null);
  assert.equal(subtotalOf(groups), 30);
});
