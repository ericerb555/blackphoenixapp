/**
 * A quote that keeps its lines in `items`.
 *
 * Eric: "there is only two live quotes sarah and jason" — and the two are not
 * the same shape. Sarah's Q-2026-0002 keeps its lines in `materials` and
 * `labor`. Jason's Q-2026-0006 keeps all seventeen of its lines in `items`,
 * every one phased, priced and visible, totalling $7,308.70, with
 * `materials` and `labor` absent and every stored total null.
 *
 * `selectQuoteLines` read only the two named arrays, so his PDF drew phase
 * headings with no lines under them and a $0.00 total — the "i just see a
 * total at the bottom of the pdf" state, with the whole $7,308.70 invisible.
 * Half of his live quotes.
 *
 * THE PRECEDENCE, AND WHY IT IS THIS WAY ROUND
 *
 * `materials`/`labor` win wherever they exist. Three stored quotes carry both
 * them and `items`, and on those `items` is a stale copy from an earlier save
 * — Q-2026-0002 has 2x4s at $3.75 in `items` against $4.38 in `materials`, a
 * month apart. The stored subtotals settle it: they reconcile with the named
 * arrays and not with `items`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectQuoteLines } from '../src/app/lib/quotePdfSelection.ts';

const r2 = (n: number) => Math.round(n * 100) / 100;
const sum = (xs: readonly any[]) =>
  r2(xs.reduce((s, l) => s + (Number(l?.amount) || 0), 0));

const material = (name: string, phase: string, quantity: number, unitCost: number, totalCost: number) =>
  ({ id: name, name, phase, quantity, unitCost, totalCost, visible: true });
const labour = (role: string, phase: string, hours: number, hourlyRate: number, totalCost: number) =>
  ({ id: role, role, phase, hours, hourlyRate, totalCost, visible: true });

/** Q-2026-0006 as stored — his figures. */
const jason = (over: Record<string, unknown> = {}) => ({
  number: 'Q-2026-0006',
  items: [
    material('Waterproofing Membrane', 'Shower preparation and waterproofing', 2, 60, 126),
    material('Shower Valve', 'Plumbing rough-in', 1, 91, 100.1),
    material('Mud Pan Mix', 'Shower preparation and waterproofing', 5, 8.4, 46.2),
    material('Vanity', 'Vanity installation', 1, 540, 594),
    material('Plumbing Stops', 'Plumbing rough-in', 2, 19.5, 42.9),
    material('Exhaust Fan', 'Exhaust fan installation', 1, 120, 132),
    material('Tile Adhesive', 'Floor tiling', 1, 56, 61.6),
    material('Grout', 'Floor tiling', 2, 18, 39.6),
    material('Dust Protection', 'Set-up and bathroom protection', 1, 28, 30.8),
    material('Disposal Bin', 'Demolition and removal', 1, 420, 420),
    labour('General Contractor', 'Set-up and bathroom protection', 20, 51.75, 1035),
    labour('Demolition Crew', 'Demolition and removal', 16, 51.75, 828),
    labour('Licensed Plumber', 'Plumbing rough-in', 8, 120.75, 966),
    labour('Tile Setter', 'Shower preparation and waterproofing', 24, 80.5, 1932),
    labour('HVAC Technician', 'Exhaust fan installation', 4, 109.25, 437),
    labour('Finish Carpenter', 'Vanity installation', 6, 51.75, 310.5),
    labour('Cleanup Crew', 'Final cleanup and handover', 4, 51.75, 207),
  ],
  customerSections: { labor: true, materials: true, processDetail: true },
  credits: [], subQuotes: [], processSteps: [],
  taxRate: 0, taxAmount: 0,
  ...over,
});

const TOTAL = 7308.7;

test('all seventeen of his lines reach the office copy', () => {
  const sel = selectQuoteLines(jason(), false);
  assert.equal(sel.lines.length, 17);
  assert.equal(sum(sel.lines), TOTAL);
});

test('and the customer copy, which is the one that gets sent', () => {
  const sel = selectQuoteLines(jason(), true);
  assert.equal(sel.lines.length, 17);
  assert.equal(sum(sel.lines), TOTAL);
});

/**
 * The phase subtotals have to come from the same rows as the lines, or every
 * phase prints zero beneath its own priced lines.
 */
test('phase subtotals come from the same rows the lines did', () => {
  const sel = selectQuoteLines(jason(), true);
  const phased = r2([...sel.phaseCost.values()].reduce((s, v) => s + v, 0));
  assert.equal(phased, TOTAL);
  assert.equal(sel.phaseCost.get('Plumbing rough-in'), r2(100.1 + 42.9 + 966));
});

test('labour is told apart from materials by its own fields', () => {
  const sel = selectQuoteLines(jason(), false);
  const kinds = sel.lines.map((l: any) => l.kind);
  assert.equal(kinds.filter((k) => k === 'material').length, 10);
  assert.equal(kinds.filter((k) => k === 'labor').length, 7);
});

test('an hourly line is priced from hours and rate, not quantity', () => {
  const sel = selectQuoteLines(jason(), false);
  const plumber = sel.lines.find((l: any) => /Licensed Plumber/.test(l.description)) as any;
  assert.equal(plumber.quantity, 8);
  assert.equal(plumber.unit_price, 120.75);
  assert.equal(plumber.amount, 966);
});

/* ── precedence ──────────────────────────────────────────────────────────── */

/**
 * The stale-copy case. A quote carrying both must ignore `items` entirely,
 * or Q-2026-0002 would price its lumber a month out of date.
 */
test('named arrays win, and the stale items copy is ignored', () => {
  const quote = jason({
    materials: [material('2x4 Lumber', 'Bench Construction', 25, 4.38, 109.5)],
    labor: [labour('Carpenter', 'Bench Construction', 30, 80.5, 2415)],
  });
  const sel = selectQuoteLines(quote, false);
  assert.equal(sel.lines.length, 2, 'the seventeen items are not added on top');
  assert.equal(sum(sel.lines), r2(109.5 + 2415));
});

test('materials alone still suppress the items fallback', () => {
  const quote = jason({ materials: [material('Only', 'P', 1, 10, 10)] });
  const sel = selectQuoteLines(quote, false);
  assert.equal(sel.lines.length, 1);
});

test('a quote with neither has no lines, and does not throw', () => {
  const sel = selectQuoteLines(jason({ items: [] }), false);
  assert.equal(sel.lines.length, 0);
});

/* ── the rules still apply to a fallback line ────────────────────────────── */

test('an unticked item is off the quote however it is stored', () => {
  const quote = jason();
  (quote.items[3] as any).included = false;   // the $594 vanity
  const sel = selectQuoteLines(quote, true);
  assert.equal(sel.lines.length, 16);
  assert.equal(sum(sel.lines), r2(TOTAL - 594));
});

test('a hidden item leaves the customer copy but keeps its money in the phase', () => {
  const quote = jason();
  (quote.items[3] as any).visible = false;
  const sel = selectQuoteLines(quote, true);
  assert.equal(sel.lines.length, 16, 'not drawn for the customer');
  assert.equal(
    r2([...sel.phaseCost.values()].reduce((s, v) => s + v, 0)), TOTAL,
    'but still charged for, which is what hiding means',
  );
});
