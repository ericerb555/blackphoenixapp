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
import { customerPricingOf } from '../supabase/functions/server/quoteCustomerPrice.ts';

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

/**
 * Every money row the page prints, which is what a reader actually adds up.
 *
 * Since a withheld line keeps its own row and its own amount, this is now
 * the same figure as `drawnSum` in every case — which is the point. It is
 * kept separate because it is the question Eric asks of the page: add up
 * what is printed, and see whether it reaches the total.
 */
function printedSum(doc: any): number {
  let total = 0;
  for (const phase of doc.phases || []) {
    if (phase.groups?.length) {
      for (const g of phase.groups) {
        total += g.balancing
          ? (Number(g.subtotal) || 0)
          : (g.lines || []).reduce((s: number, l: any) => s + (Number(l?.amount) || 0), 0);
      }
    } else {
      total += (phase.lines || []).reduce((s: number, l: any) => s + (Number(l?.amount) || 0), 0);
    }
  }
  return r2(total);
}
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

test('the office copy still shows everything, marked', () => {
  const q = sarah({ processSteps: SARAH_STEPS });
  (q.materials[8] as any).visible = false;
  const doc = quoteToPdfDocument(q, { forCustomer: false });
  assert.equal(drawnSum(doc), 12666.13);
  const row = drawnLines(doc).find((l: any) => /Custom Benches/.test(l.description));
  assert.match(row.description, /hidden from customer/i, 'we can still see which it was');
  assert.ok(!row.detailWithheld, 'and we still see its quantity and rate');
});

/** Q-2026-0002's real nine steps — two of them stored as a bare title. */
const SARAH_STEPS = [
  { title: 'Site Setup and Protection', included: true, stepNumber: 1 },
  { title: 'Demolition and Preparation', stepNumber: 2 },
  { title: 'Bench Construction', stepNumber: 3 },
  { title: 'Wall Modifications', stepNumber: 4 },
  { title: 'Electrical Rough-In', stepNumber: 5 },
  { title: 'Fixture Installation', stepNumber: 6 },
  { title: 'Lighting Installation', stepNumber: 7 },
  { title: 'Painting', stepNumber: 8 },
  { title: 'Final Cleanup and Handover', stepNumber: 9 },
];

/**
 * A section switched off is the one case with no lines to carry the money,
 * so the phase heading and its subtotal are the total — on the page, which
 * is what "the totals stay as part of the quote" asks for.
 */
test('a section switched off still shows every phase and its total', () => {
  const doc = quoteToPdfDocument(
    sarah({ processSteps: SARAH_STEPS, customerSections: { labor: true, materials: false, processDetail: true } }),
    { forCustomer: true },
  );
  assert.equal(phaseSum(doc), 12666.13, 'the totals are all still on the page');
  assertAddsUp(doc, 'materials off');
});

/* ── edited in the editor, which is where he actually is ─────────────────── */

/**
 * The general case behind all of this: the lines move and the stored totals
 * do not. Unticking was one way to cause it; changing a price in the editor
 * is the everyday way, and the stored `preTaxTotal` is not rewritten by an
 * edit. The document has to foot to what it draws either way.
 */
test('Sarah: raising a line price still foots', () => {
  const q = sarah();
  (q.materials[8] as any).totalCost = 2050;        // Custom Benches, was 1050
  (q.materials[8] as any).unitCost = 683.34;
  const doc = quoteToPdfDocument(q, { forCustomer: true });
  assertAddsUp(doc, 'Sarah price raised');
  assert.equal(drawnSum(doc), r2(12666.13 + 1000));
});

test('Sarah: adding a line still foots', () => {
  const q = sarah();
  (q.materials as any).push({
    id: 'extra', name: 'Extra trim', phase: 'Painting',
    quantity: 10, unitCost: 12, totalCost: 120, visible: true,
  });
  const doc = quoteToPdfDocument(q, { forCustomer: true });
  assertAddsUp(doc, 'Sarah line added');
  assert.equal(drawnSum(doc), r2(12666.13 + 120));
});

test('Jason: editing an items-shaped quote foots too', () => {
  const q = jason();
  (q.items[3] as any).totalCost = 794;             // Vanity, was 594
  const doc = quoteToPdfDocument(q, { forCustomer: true });
  assertAddsUp(doc, 'Jason price raised');
  assert.equal(drawnSum(doc), r2(7308.7 + 200));
});

/* ── the actual PDF file, not the payload ────────────────────────────────── */

import { buildQuotePdf } from '../src/app/lib/services/quotePdfLayout.ts';

const LETTERHEAD = {
  name: 'Black Phoenix Builds',
  contact: { email: 'a@b.c', phone: '603', website: 'x' },
  address: { line1: 'L1', city: 'Pelham', state: 'NH', zipCode: '03076' },
  branding: { primaryColor: '#ea580c' },
};

/** Every string jsPDF actually placed on the page. */
function printedText(data: any): string[] {
  const doc: any = buildQuotePdf(data);
  const out: string[] = [];
  for (const page of doc.internal.pages.filter(Boolean)) {
    for (const op of page as any[]) {
      const hit = /\((.*)\)\s*Tj/.exec(String(op));
      if (hit) out.push(hit[1]);
    }
  }
  return out;
}

/**
 * THE LAST MILE. Everything above asserts the payload; this builds the real
 * document and reads the money off it. The three closing figures are "The N
 * stages above", "Subtotal" and "Total", and on a quote with no tax and no
 * credits all three are the same number — which is precisely the thing Eric
 * has been telling us was not true.
 */
test('the generated PDF prints a column that reaches its own total', () => {
  const data = quoteToPdfDocument(sarah(), { forCustomer: true, company: LETTERHEAD as any });
  const money = printedText(data).filter((t) => /^\$[\d,]+\.\d\d$/.test(t));
  const last3 = money.slice(-3);
  assert.deepEqual(last3, ['$12,666.13', '$12,666.13', '$12,666.13'],
    'stages, subtotal and total must all read the same on an untaxed quote');
});

/**
 * jsPDF throws "Invalid arguments passed to jsPDF.text" on undefined rather
 * than drawing nothing, so a missing letterhead produced NO document at all.
 * Found by building the real PDF here, which was impossible before.
 */
test('a quote rendered without a letterhead still produces a document', () => {
  const data = quoteToPdfDocument(sarah(), { forCustomer: true });
  assert.doesNotThrow(() => buildQuotePdf(data));
});

test('Jason: the generated PDF foots as well', () => {
  const data = quoteToPdfDocument(jason(), { forCustomer: true, company: LETTERHEAD as any });
  const money = printedText(data).filter((t) => /^\$[\d,]+\.\d\d$/.test(t));
  assert.equal(money[money.length - 1], '$7,308.70', 'the printed Total');
});


/* ── the card surcharge, on the document itself ──────────────────────────── */

/**
 * Eric: "yes add it to the invoices and quote approval too."
 *
 * One layout draws the quote and the invoice — an invoice is mapped onto
 * `QuotePdfData` and comes through `buildQuotePdf` — so this notice reaching
 * the page proves it on both.
 */
test('the generated PDF carries the card fee notice', () => {
  const data = quoteToPdfDocument(sarah(), { forCustomer: true, company: LETTERHEAD as any });
  const printed = printedText(data).join(' ');
  assert.match(printed, /3%/, 'the rate is on the page');
  assert.match(printed, /credit card/i, 'and it says CREDIT card');
  assert.match(printed, /cash/i, 'and names cash');
  assert.match(printed, /check/i, 'and check');
});

/**
 * THE SURCHARGE IS NOT IN THE TOTAL on a quote or an invoice. The total is
 * what the work costs; the fee is the cost of one way of paying for it, and
 * adding it here would overcharge everybody who pays by the two methods the
 * notice exists to offer.
 */
test('the notice does not change what the document totals', () => {
  const doc = quoteToPdfDocument(sarah(), { forCustomer: true, company: LETTERHEAD as any });
  assert.equal(doc.total, 12666.13, 'unchanged by the disclosure');
  assertAddsUp(doc, 'with the card notice');
});

/* ── every section adds up on its own, not just the document ───────────── */

/**
 * A PHASE MUST EQUAL ITS OWN ROWS.
 *
 * `assertAddsUp` above compares the two COLUMNS against the footer, and
 * both of them reached it while individual sections were wrong. The phase
 * headings and the line amounts were apportioned by two separate calls to
 * `allocate`, which placed their rounding remainders on different rows: on
 * Jason’s quote, plumbing printed two lines summing to 2,588.30 under a
 * heading reading 2,588.31, and waterproofing was a penny the other way.
 * The pennies cancelled, the document footed, and a customer reading one
 * section still saw lines that did not add up to the number beside it.
 *
 * Nobody adds up a whole quote. They add up the section they are arguing
 * about.
 */
function assertEachPhaseAddsUp(doc: any, label: string) {
  for (const phase of doc.phases || []) {
    const rows = phase.groups?.length
      ? phase.groups.flatMap((g: any) => g.lines || [])
      : phase.lines || [];
    if (!rows.length) continue;   // a process step carries its money in the heading
    const sum = r2(rows.reduce((s: number, l: any) => s + (Number(l?.amount) || 0), 0));
    assert.equal(
      sum, r2(Number(phase.subtotal) || 0),
      `${label}: ${phase.label} prints rows totalling ${sum} under a heading reading ${phase.subtotal}`,
    );
  }
}

const hideAll = (q: any) => {
  for (const r of (q.items || q.materials || [])) r.visible = false;
  for (const r of (q.labor || [])) r.visible = false;
  return q;
};

/**
 * JASON AS HE IS ACTUALLY STORED — WITH MARGIN ON HIM.
 *
 * `jason()` carries no stored total, and `sarah()` stores one equal to her
 * direct cost. On both, `customerPricingOf` returns a markup of zero, so
 * `quoteToPdfDocument` skips the whole pricing block — every `allocate` call
 * in it, and every bug that lives in one. Two tests written against those
 * fixtures passed with the fix reverted, which is how this was noticed.
 *
 * `quote:qt-1794354942724` stores a direct cost of 9,860.70 beneath a
 * preTaxTotal of 14,435.81 and no percentages at all — the margin is implied
 * by the gap. That is the quote Eric was looking at, and the only shape that
 * exercises the apportionment. The ratio is applied to whatever this fixture
 * costs rather than pinning 14,435.81, so editing a line above does not turn
 * this into a test of a stale constant.
 */
const JASON_MARKUP = 14435.81 / 9860.70;
const jasonPriced = () => {
  const cost = r2(Number(quoteToPdfDocument(jason(), { forCustomer: false }).total) || 0);
  const priced = r2(cost * JASON_MARKUP);
  return jason({ preTaxTotal: priced, totalCost: priced });
};

test('the priced fixture really is priced, or the tests below prove nothing', () => {
  const pricing = customerPricingOf(jasonPriced());
  assert.ok(
    pricing.markup > 0.4,
    `markup came out ${pricing.markup} — the pricing block is being skipped and these tests are inert`,
  );
});

test('every phase foots on its own, hidden or not', () => {
  for (const [label, doc] of [
    ['Jason priced', quoteToPdfDocument(jasonPriced(), { forCustomer: true })],
    ['Jason priced, all hidden', quoteToPdfDocument(hideAll(jasonPriced()), { forCustomer: true })],
    ['Jason', quoteToPdfDocument(jason(), { forCustomer: true })],
    ['Jason, all hidden', quoteToPdfDocument(hideAll(jason()), { forCustomer: true })],
    ['Sarah', quoteToPdfDocument(sarah(), { forCustomer: true })],
    ['Sarah, all hidden', quoteToPdfDocument(hideAll(sarah()), { forCustomer: true })],
  ] as [string, any][]) {
    assertEachPhaseAddsUp(doc, label);
    assertAddsUp(doc, label);
  }
});

/* ── hidden means hidden: no row, and the money stays in the total ───────── */

/**
 * Eric, 2026-11-19: *"i do not want additional work under the line item to
 * show up on the quote i just want it added into the total it should always
 * be hidden"*.
 *
 * This replaced two earlier readings of the same instruction, and the history
 * is the reason these tests are specific. First every hidden line kept its
 * own row reading "Additional work" — eighteen of them on Q-2026-0006, each
 * with its own price — which disclosed how many pieces of work there were and
 * what each cost while refusing to say what they were. Then they collapsed to
 * one such row per phase, which was better and still answered a question the
 * customer had not asked.
 *
 * So the assertion is the ABSENCE of a row, not the shape of one.
 */
const withheldRows = (doc: any) => drawnLines(doc).filter((l: any) => l.detailWithheld);
const labelledRows = (doc: any) => drawnLines(doc).filter((l: any) => /additional work/i.test(String(l.description || '')));

test('a hidden line draws no row at all on the customer copy', () => {
  const q = sarah();
  (q.materials[8] as any).visible = false;        // Custom Benches, 1050

  const doc = quoteToPdfDocument(q, { forCustomer: true });
  assert.equal(withheldRows(doc).length, 0, 'nothing is marked withheld, because nothing is drawn for it');
  assert.equal(labelledRows(doc).length, 0, 'and no row says "Additional work"');
  assert.equal(drawnLines(doc).length, 15, 'the other fifteen are unaffected');
});

/**
 * THE MONEY IS THE INVARIANT.
 *
 * Dropping these rows is what the code did originally, and it was logged as a
 * defect then: the money sat in the phase subtotal with nothing accounting
 * for it and the column did not add up. What changed is the apportionment —
 * each phase's subtotal is allocated across the rows actually drawn. So the
 * withheld money lands inside the visible lines of its own phase.
 */
test('hiding a line changes no total', () => {
  const shown = quoteToPdfDocument(sarah(), { forCustomer: true });
  const q = sarah();
  (q.materials[8] as any).visible = false;
  const hidden = quoteToPdfDocument(q, { forCustomer: true });

  assert.equal(r2(Number(hidden.total)), r2(Number(shown.total)), 'the total did not move');
  assert.equal(drawnSum(hidden), drawnSum(shown), 'and the column still reaches it');
  assert.equal(drawnSum(hidden), 12666.13);
  assertEachPhaseAddsUp(hidden, 'Sarah, one hidden');
  assertAddsUp(hidden, 'Sarah, one hidden');
});

test("a hidden line's money lands in the visible lines of its own phase", () => {
  const q: any = jasonPriced();
  const hidden = q.items.find((r: any) => r.name === 'Grout');
  const shown = q.items.find((r: any) => r.name === 'Tile Adhesive');
  hidden.visible = false;                          // Floor tiling is these two

  const doc = quoteToPdfDocument(q, { forCustomer: true });
  const phase = (doc.phases as any[]).find((p) => p.label === 'Floor tiling');
  const rows = phase.groups?.length ? phase.groups.flatMap((g: any) => g.lines || []) : phase.lines;

  assert.equal(rows.length, 1, 'only the visible line is drawn');
  assert.match(String(rows[0].description), /Tile Adhesive/);
  assert.equal(
    r2(Number(rows[0].amount)), r2(Number(phase.subtotal)),
    "the one drawn row carries the whole phase, the hidden line's share included",
  );
  /*
   * Named explicitly: the visible line prints MORE than its own cost times
   * the markup, because it is now carrying the hidden line too. That is the
   * deliberate consequence of showing no row — the alternative is a phase
   * heading that exceeds the rows beneath it, which is the complaint this
   * whole thread started from.
   */
  const alone = shown.totalCost / (hidden.totalCost + shown.totalCost);
  assert.ok(
    Number(rows[0].amount) > Number(phase.subtotal) * alone,
    'the visible row absorbed the hidden one rather than printing its own share',
  );
  assertEachPhaseAddsUp(doc, 'Jason, one hidden in a shared phase');
  assertAddsUp(doc, 'Jason, one hidden in a shared phase');
});

/**
 * A phase with nothing visible prints as a single priced heading.
 *
 * On Q-2026-0006, where Eric had hidden all eighteen lines, this turns a page
 * of eighteen "Additional work" rows into nine priced phases — which is how a
 * process step with no lines already reads.
 */
test('a phase with every line hidden draws no rows and keeps its price', () => {
  const doc = quoteToPdfDocument(hideAll(jasonPriced()), { forCustomer: true });

  assert.equal(drawnLines(doc).length, 0, 'not one row on the whole document');
  assert.equal(withheldRows(doc).length, 0);
  assert.equal(labelledRows(doc).length, 0);

  const phases = (doc.phases as any[]).filter((p) => Number(p.subtotal) > 0);
  assert.ok(phases.length >= 2, 'the phases themselves are still there, priced');
  assert.equal(
    r2(phases.reduce((s: number, p: any) => s + Number(p.subtotal), 0)),
    r2(Number(doc.total)),
    'and they come to the total',
  );
});

/** The office copy is unchanged — staff still see every line, marked. */
test('the office copy still draws the hidden lines', () => {
  const q = sarah();
  (q.materials[8] as any).visible = false;

  const doc = quoteToPdfDocument(q, { forCustomer: false });
  assert.equal(drawnLines(doc).length, 16, 'nothing was dropped for us');
  const row = drawnLines(doc).find((l: any) => /Custom Benches/.test(l.description));
  assert.match(row.description, /hidden from customer/i, 'and we can see which it was');
  assert.equal(drawnSum(doc), 12666.13);
});

/* ── a phase that exists only on a line, with every line hidden ────────── */
/**
 * Eric, 2026-11-20: "the view pdf totals match 13345.11 but when i add up
 * the line items it only 11517.05 why is this so hard to get right?"
 *
 * Q-2026-0006 as stored. Every one of its eighteen priced rows is
 * `visible: false`, so no line is drawn and the phase subtotals ARE the
 * column. It has eight written process steps — and a $1,350 shower pan
 * tagged to a ninth phase, "Shower Finish", that is not one of them.
 *
 * The all-hidden path built its phases by enumerating `processSteps`, which
 * cannot know about a phase that lives only on a line, so that phase was
 * dropped with its money: 11,518.07 of column under a total of 13,345.11.
 * The top-up that exists for exactly this is guarded on `phases.length` and
 * is therefore skipped in the one case where nothing was drawn.
 */
const showerFinish = (over: Record<string, unknown> = {}) => ({
  materials: [
    { name: "Shower pan", quantity: 1, unitCost: 1350, totalCost: 1350, phase: "Shower Finish", visible: false },
    { name: "Vanity", quantity: 1, unitCost: 540, totalCost: 594, phase: "Vanity installation", visible: false },
    { name: "Debris haul", quantity: 1, unitCost: 420, totalCost: 420, phase: "Demolition and removal", visible: false },
    { name: "Sundries", quantity: 1, unitCost: 526.55, totalCost: 579.2, phase: "Set-up and bathroom protection", visible: false },
  ],
  labor: [
    { role: "Plumber", hours: 1, hourlyRate: 1625, totalCost: 1625, phase: "Plumbing rough-in", visible: false },
    { role: "Waterproofing", hours: 24, hourlyRate: 80.5, totalCost: 1932, phase: "Shower preparation and waterproofing", visible: false },
    { role: "Carpenter", hours: 65, hourlyRate: 51.69, totalCost: 3360.5, phase: "Final cleanup and handover", visible: false },
  ],
  additionalCosts: [
    { name: "Building Permit", amount: 200 },
    { name: "Disposal Fee", amount: 350 },
  ],
  // Eight steps. "Shower Finish" is deliberately NOT among them.
  processSteps: [
    "Set-up and bathroom protection", "Demolition and removal", "Plumbing rough-in",
    "Shower preparation and waterproofing", "Exhaust fan installation",
    "Vanity installation", "Floor tiling", "Final cleanup and handover",
  ].map((title) => ({ title, description: "step detail" })),
  materialsSubtotal: 2943.2,
  laborSubtotal: 6917.5,
  additionalCostsSubtotal: 550,
  laborBurdenAmount: 2421.13,
  directCost: 12831.83,
  overheadAmount: 0,
  profitAmount: 320.8,
  contingencyAmount: 192.48,
  preTaxTotal: 13345.11,
  totalCost: 13345.11,
  taxAmount: 0,
  customerSections: { materials: true, labor: true, processDetail: true },
  ...over,
});

test('a phase no step names has its money spread, not a section of its own', () => {
  const doc: any = quoteToPdfDocument(showerFinish(), { forCustomer: true });
  const titles = (doc.phases || []).map((x: any) => String(x.title));
  // Eric: 'i just want all the other items to be devided up and split
  // between all the lines'. So no orphan section with no description.
  assert.ok(!titles.includes('Shower Finish'),
    `"Shower Finish" should not get a row of its own: ${titles.join(', ')}`);
  assert.equal(titles.length, 8);
  // And not a cent of it is lost: the column still reaches the total.
  assert.equal(phaseSum(doc), 13345.11);
  assert.notEqual(phaseSum(doc), 11518.07);
  assertAddsUp(doc, 'Q-2026-0006 customer');
});

test('and it is not drawn twice when it IS a written step', () => {
  const steps = [
    "Set-up and bathroom protection", "Demolition and removal", "Plumbing rough-in",
    "Shower preparation and waterproofing", "Shower Finish", "Exhaust fan installation",
    "Vanity installation", "Floor tiling", "Final cleanup and handover",
  ].map((title) => ({ title, description: 'd' }));
  const doc: any = quoteToPdfDocument(showerFinish({ processSteps: steps }), { forCustomer: true });
  const titles = (doc.phases || []).map((x: any) => String(x.title));
  const dupes = titles.filter((t: string, i: number) => titles.indexOf(t) !== i);
  assert.deepEqual(dupes, [], `drawn twice: ${dupes.join(', ')}`);
  assert.equal(phaseSum(doc), 13345.11);
});
