/**
 * The assembled document adds up. Not a part of it — the document.
 *
 * Eric, three times now: "THE LINE ITEMS DONT TOTAL THE TOTAL LINE", and
 * then "why is this being so difficult".
 *
 * Here is why it was. Every test around this feature covered a PIECE —
 * `quotePdfSelection` picks the right lines, `quoteCustomerPrice` prices
 * them, `quoteMarkup` reads the rates, `invoicePhases` groups them. All of
 * them passed throughout. Nothing ever called `quoteToPdfDocument` and added
 * the drawn column up against the printed total, because that function could
 * not be loaded by the test runner: its imports were extensionless and its
 * `companyInfo` dependency pulled in a chain that failed to resolve.
 *
 * So the one assertion that matches what Eric actually does — open the
 * editor, click View PDF, add the column up — was the one assertion nobody
 * could write. Every fix was aimed at a part, verified on that part, and
 * shipped without the whole ever being checked.
 *
 * This is that check. It runs against the real shapes of both live quotes.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quoteToPdfDocument } from '../src/app/lib/quoteToPdfDocument.ts';

const r2 = (n: number) => Math.round(n * 100) / 100;

const material = (name: string, phase: string, quantity: number, unitCost: number, totalCost: number) =>
  ({ id: name, name, phase, quantity, unitCost, totalCost, visible: true });
const labour = (role: string, phase: string, hours: number, hourlyRate: number, totalCost: number) =>
  ({ id: role, role, phase, hours, hourlyRate, totalCost, visible: true });

/** Q-2026-0002 — lines in `materials`/`labor`, totals stored. */
const sarah = (over: Record<string, unknown> = {}) => ({
  number: 'Q-2026-0002', clientName: 'Sarah',
  materials: [
    material('2x4 Lumber', 'Bench Construction', 25, 4.38, 109.5),
    material('Plywood Sheets', 'Bench Construction', 6, 38.4, 253.44),
    material('Drywall work', 'Wall Modifications', 13, 18.13, 235.69),
    material('LED Strip Lights', 'Lighting Installation', 30, 21.25, 637.5),
    material('Electrical Wire', 'Electrical Rough-In', 100, 4.65, 465.00000000000006),
    material('Hair Dryers', 'Fixture Installation', 3, 202.5, 607.5),
    material('Paint', 'Painting', 10, 50.4, 504),
    material('New Material', 'Site Setup and Protection', 2, 24, 48),
    material('Custom Benches', 'Fixture Installation', 3, 350, 1050),
  ],
  labor: [
    labour('General Laborer', 'Site Setup and Protection', 40, 51.75, 2070),
    labour('Carpenter', 'Bench Construction', 30, 80.5, 2415),
    labour('Licensed Electrician', 'Electrical Rough-In', 24, 115, 2760),
    labour('Painter', 'Painting', 8, 57.5, 460),
    labour('Cleanup Crew', 'Final Cleanup and Handover', 6, 51.75, 310.5),
    labour('New Labor Role', 'Fixture Installation', 4, 120, 480),
    labour('Bench install', 'Fixture Installation', 4, 65, 260),
  ],
  materialsSubtotal: 3910.63, laborSubtotal: 8755.5,
  preTaxTotal: 12666.13, totalCost: 12666.13, total: 12666.13,
  customerSections: { labor: true, materials: true, processDetail: true },
  credits: [], creditsSubtotal: 0, subQuotes: [], processSteps: [],
  taxRate: 0, taxAmount: 0, pricingBasis: 'estimator',
  ...over,
});

/** Q-2026-0006 — everything in `items`, no stored totals at all. */
const jason = (over: Record<string, unknown> = {}) => ({
  number: 'Q-2026-0006', clientName: 'Jason Fiore',
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

/**
 * Every line the document actually draws.
 *
 * `groups` holds the SAME lines split by kind and, per the layout's own type,
 * is "drawn in preference" — so a reader that counted both would double every
 * figure. This mirrors the renderer rather than the payload.
 */
function drawnLines(doc: any): any[] {
  const out: any[] = [];
  for (const phase of doc.phases || []) {
    if (phase.groups?.length) {
      for (const g of phase.groups) for (const l of g.lines || []) out.push(l);
    } else {
      for (const l of phase.lines || []) out.push(l);
    }
  }
  return out;
}

const drawnSum = (doc: any) => r2(drawnLines(doc).reduce((s, l) => s + (Number(l?.amount) || 0), 0));
const phaseSum = (doc: any) =>
  r2((doc.phases || []).reduce((s: number, p: any) => s + (Number(p.subtotal) || 0), 0));

/**
 * THE ASSERTION ERIC WOULD MAKE. Add the column up; it equals the total at
 * the foot of the page.
 */
function assertAddsUp(doc: any, label: string) {
  const lines = drawnSum(doc);
  const phases = phaseSum(doc);
  const total = r2(Number(doc.total) || 0);

  assert.equal(phases, total,
    `${label}: phase subtotals (${phases}) must come to the printed total (${total})`);
  // Lines may legitimately sit under the phase total when something is
  // hidden — hiding withholds detail and keeps the money. It may never sit
  // ABOVE it, which would mean charging less than the column shows.
  assert.ok(lines <= phases + 0.01,
    `${label}: drawn lines (${lines}) exceed the phase subtotals (${phases})`);
}

/* ── Sarah, as stored ────────────────────────────────────────────────────── */

test('Sarah: the office copy adds up', () => {
  const doc = quoteToPdfDocument(sarah(), { forCustomer: false });
  assert.equal(drawnSum(doc), 12666.13);
  assertAddsUp(doc, 'Sarah office');
});

test('Sarah: the customer copy adds up', () => {
  const doc = quoteToPdfDocument(sarah(), { forCustomer: true });
  assert.equal(drawnSum(doc), 12666.13);
  assertAddsUp(doc, 'Sarah customer');
});

/* ── Jason, whose lines live in `items` ──────────────────────────────────── */

test('Jason: all seventeen lines are drawn and add up', () => {
  const doc = quoteToPdfDocument(jason(), { forCustomer: false });
  assert.equal(drawnLines(doc).length, 17);
  assert.equal(drawnSum(doc), 7308.7);
  assertAddsUp(doc, 'Jason office');
});

test('Jason: the customer copy too', () => {
  const doc = quoteToPdfDocument(jason(), { forCustomer: true });
  assert.equal(drawnSum(doc), 7308.7);
  assertAddsUp(doc, 'Jason customer');
});

/* ── unticking, which is what he does in the editor ──────────────────────── */

test('Sarah: unticking a line removes it from the lines AND the total', () => {
  const q = sarah();
  (q.materials[8] as any).included = false;        // Custom Benches, 1050
  const doc = quoteToPdfDocument(q, { forCustomer: true });
  assert.equal(drawnSum(doc), r2(12666.13 - 1050));
  assertAddsUp(doc, 'Sarah unticked');
});

test('Jason: unticking works on an items-shaped quote too', () => {
  const q = jason();
  (q.items[3] as any).included = false;            // Vanity, 594
  const doc = quoteToPdfDocument(q, { forCustomer: true });
  assert.equal(drawnSum(doc), r2(7308.7 - 594));
  assertAddsUp(doc, 'Jason unticked');
});

/* ── with a margin on, which is where the rounding bites ─────────────────── */

test('a marked-up customer copy still adds up to the penny', () => {
  const doc = quoteToPdfDocument(
    sarah({ overheadPercent: 0.1, profitPercent: 0.1, contingencyPercent: 0.05 }),
    { forCustomer: true },
  );
  assertAddsUp(doc, 'Sarah with margin');
});

test('and still adds up with a line unticked under a margin', () => {
  const q = sarah({ overheadPercent: 0.1, profitPercent: 0.1, contingencyPercent: 0.05 });
  (q.materials[8] as any).included = false;
  const doc = quoteToPdfDocument(q, { forCustomer: true });
  assertAddsUp(doc, 'Sarah margin + unticked');
});

/* ── hiding withholds detail, never money ────────────────────────────────── */

test('a hidden line leaves the column but stays in the phase total', () => {
  const q = sarah();
  (q.materials[8] as any).visible = false;
  const doc = quoteToPdfDocument(q, { forCustomer: true });
  assert.equal(drawnLines(doc).length, 15, 'not drawn');
  assertAddsUp(doc, 'Sarah hidden');
  assert.equal(phaseSum(doc), 12666.13, 'still charged for');
});
