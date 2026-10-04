/**
 * The Property Health Report's content and its rendering.
 *
 * WHY THESE ASSERTIONS
 *
 * This is a document a customer pays $79 for and nobody reviews before they
 * receive it, so the things that must hold are the things a reader would notice
 * and we would not:
 *
 *   - it uses only the block vocabulary the authored books use, which is what
 *     keeps a generated report from looking like a different company made it,
 *     and what lets the same structure go through pdfBook later;
 *   - the worst areas come first, because that is the order the work is read in;
 *   - every escape is applied, because every string in it was typed by somebody
 *     into an inspection note and these pages are shared with tenants, buyers
 *     and lenders;
 *   - it never claims more than the records hold.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { propertyHealthReport, type Report } from '../supabase/functions/server/propertyReportContent.ts';
import { reportToHtml } from '../supabase/functions/server/reportHtml.ts';
import { emptyEvidence } from '../supabase/functions/server/propertyReportRules.ts';
import type { PropertyDetail } from '../supabase/functions/server/propertyReportData.ts';

/** The vocabulary pdfBook.mjs understands. Anything else cannot be typeset. */
const BOOK_BLOCKS = new Set(['h2', 'h3', 'p', 'bullets', 'numbers', 'checks', 'callout', 'table', 'fields', 'rule', 'break']);

const detail = (over: Partial<PropertyDetail> = {}): PropertyDetail => ({
  property: { id: 'p1', name: 'Harbour Street', address: '14 Harbour Street, Nashua NH', units: 4, yearBuilt: 1962 },
  inspections: [{ id: 'i1', propertyId: 'p1', status: 'complete', completedAt: '2026-09-18T10:00:00Z' }],
  areas: [
    { name: 'Roof', condition: 'Poor', notes: 'Granule loss across the south slope.', inspectedAt: '2026-09-18' },
    { name: 'Kitchen', condition: 'Good', notes: '', inspectedAt: '2026-09-18' },
    { name: 'Basement', condition: 'Fair', notes: 'Damp at the north wall.', inspectedAt: '2026-09-18' },
    { name: 'Boiler', condition: 'Failed', notes: 'No heat on test.', inspectedAt: '2026-09-18' },
    { name: 'Windows', condition: 'Excellent', notes: '', inspectedAt: '2026-09-18' },
    { name: 'Driveway', condition: 'Peculiar', notes: 'Unrecognised condition word.', inspectedAt: '2026-09-18' },
  ],
  openItems: [{ area: 'Basement', what: 'Trace the damp before winter', inspectedAt: '2026-09-18' }],
  jobs: [
    { id: 'j1', propertyId: 'p1', status: 'completed', title: 'Gutter clearance', completedAt: '2026-08-02T09:00:00Z' },
    { id: 'j2', propertyId: 'p1', status: 'open', title: 'Boiler service', createdAt: '2026-09-20T09:00:00Z' },
  ],
  conditionsReports: [{ id: 'c1', propertyId: 'p1' }],
  ...over,
});

const evidence = () => ({
  ...emptyEvidence('p1'),
  completedInspections: 1, assessedAreas: 6, distinctAreas: 6, openFindings: 1,
  jobs: 2, completedJobs: 1, conditionsReports: 1, units: 4, unitsWithRent: 4, yearBuilt: 1962,
});

const allBlocks = (r: Report) => r.chapters.flatMap((c) => c.blocks);
const allText = (r: Report) => JSON.stringify(r);

test('every block is one the authored books can typeset', () => {
  // The architecture note in the plan: one renderer, two sources. If this fails,
  // the report has grown a block pdfBook cannot draw and the two document
  // families have started to diverge.
  for (const block of allBlocks(propertyHealthReport(detail(), evidence()))) {
    assert.ok(BOOK_BLOCKS.has(block.t), `"${block.t}" is not in the book vocabulary`);
  }
});

test('the worst areas come first, and the unknown word sits in the middle', () => {
  const report = propertyHealthReport(detail(), evidence());
  const table = allBlocks(report).find((b) => b.t === 'table' && (b.head || [])[0] === 'Area');
  assert.ok(table, 'no condition table');
  const order = (table!.rows || []).map((r) => r[0]);
  assert.deepEqual(order.slice(0, 2), ['Boiler', 'Roof'], 'failed and poor must lead');
  assert.equal(order[order.length - 1], 'Windows', 'excellent must come last');
  // An unrecognised condition must not become the worst thing in the building,
  // nor the best — a stray word would otherwise reorder somebody's priorities.
  const peculiar = order.indexOf('Driveway');
  assert.ok(peculiar > order.indexOf('Basement'), 'unknown ranked below fair');
  assert.ok(peculiar < order.indexOf('Windows'), 'unknown ranked above excellent');
});

test('the headline names the areas that actually need attention', () => {
  const report = propertyHealthReport(detail(), evidence());
  const callout = allBlocks(report).find((b) => b.t === 'callout');
  assert.match(callout!.heading || '', /2 areas need attention now/);
  assert.match(callout!.body || '', /Boiler/);
  assert.match(callout!.body || '', /Roof/);
});

test('a property in good order says so rather than manufacturing a problem', () => {
  const healthy = detail({
    areas: [
      { name: 'Roof', condition: 'Good', notes: '', inspectedAt: '2026-09-18' },
      { name: 'Kitchen', condition: 'Excellent', notes: '', inspectedAt: '2026-09-18' },
    ],
    openItems: [],
  });
  const report = propertyHealthReport(healthy, { ...evidence(), distinctAreas: 2, openFindings: 0 });
  const callout = allBlocks(report).find((b) => b.t === 'callout');
  assert.match(callout!.heading || '', /Nothing inspected is in poor condition/);
  assert.match(allText(report), /No inspection finding is still open/);
});

test('nothing is claimed that the records do not hold', () => {
  const bare = detail({ areas: [], openItems: [], jobs: [], conditionsReports: [] });
  const report = propertyHealthReport(bare, { ...emptyEvidence('p1'), completedInspections: 1, yearBuilt: 1962 });
  const text = allText(report);
  // No completed work must read as "nothing has been done through us", not as a
  // clean maintenance history — the difference matters to a buyer or a lender.
  assert.match(text, /nothing has been done through us/);
  assert.match(text, /this report cannot evidence it/);
});

test('an unrecorded field says so instead of printing a blank or a zero', () => {
  const unknown = detail({ property: { id: 'p1', name: 'Harbour Street' } });
  const report = propertyHealthReport(unknown, { ...evidence(), units: 0, yearBuilt: null });
  const fields = allBlocks(report).find((b) => b.t === 'fields');
  const pairs = Object.fromEntries((fields!.pairs || []) as Array<[string, string]>);
  assert.equal(pairs['Units'], 'not recorded');
  assert.equal(pairs['Built'], 'not recorded');
  assert.equal(pairs['Address'], 'not recorded');
});

test('what to do next is ordered worst-first and names the finding', () => {
  const report = propertyHealthReport(detail(), evidence());
  const steps = allBlocks(report).find((b) => b.t === 'numbers');
  assert.ok(steps, 'no ordered next steps');
  assert.match((steps!.items || [])[0], /Boiler/);
  assert.ok((steps!.items || []).some((i) => /Trace the damp/.test(i)), 'the open finding is not carried into the steps');
});

test('a thin report tells the owner what would make the next one better', () => {
  const thin = detail({ areas: detail().areas.slice(0, 3) });
  const report = propertyHealthReport(thin, { ...evidence(), distinctAreas: 3 });
  assert.match(allText(report), /A fuller inspection makes every section of it sharper/);
});

// ─── Rendering ───────────────────────────────────────────────────────────────

test('every string from a record is escaped', () => {
  // A landlord who names a unit <script> must not get a document that runs it,
  // and these pages get shared with tenants, buyers and lenders.
  const nasty = detail({
    property: { id: 'p1', name: '<script>alert(1)</script>', address: '"><img src=x onerror=alert(2)>', units: 1, yearBuilt: 1962 },
    areas: [{ name: '<b>Roof</b>', condition: "Poor'", notes: '<iframe src=//evil>', inspectedAt: '2026-09-18' }],
    openItems: [{ area: '&lt;', what: '<svg onload=alert(3)>', inspectedAt: '2026-09-18' }],
    jobs: [{ id: 'j1', propertyId: 'p1', status: 'completed', title: '</td><script>x</script>', completedAt: '2026-08-02T09:00:00Z' }],
  });
  const html = reportToHtml(propertyHealthReport(nasty, { ...evidence(), distinctAreas: 1 }));
  // What matters is that no ELEMENT was introduced. The literal text
  // "onerror=" surviving is expected and harmless — it sits inside escaped
  // text, so it is characters on a page rather than an attribute on a tag.
  // Asserting on that substring would be testing the wrong thing.
  for (const tag of [/<script/i, /<iframe/i, /<svg/i, /<img/i, /<b>/i]) {
    assert.ok(!tag.test(html), `${tag} introduced an element from a record`);
  }
  // And the content is still there, escaped rather than dropped — a report that
  // silently swallowed an inspection note would be worse than one that showed
  // it awkwardly.
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /&lt;svg onload=alert\(3\)&gt;/);
  assert.match(html, /&lt;iframe src=\/\/evil&gt;/);
});

test('the page carries the print path and the letter page size', () => {
  const html = reportToHtml(propertyHealthReport(detail(), evidence()));
  // documents-need-a-view-and-a-pdf: it must be printable to a PDF, and the
  // sheet has to match the authored books rather than default to A4.
  assert.match(html, /@media print/);
  assert.match(html, /@page \{ size: letter/);
  assert.match(html, /save it as a PDF/);
  assert.match(html, /Times New Roman/, 'the body face must match the books');
});

test('a table can scroll on a phone without the page scrolling sideways', () => {
  const html = reportToHtml(propertyHealthReport(detail(), evidence()));
  assert.match(html, /overflow-x:auto/);
  assert.match(html, /initial-scale=1/);
});

test('the rendered page is one document, titled for the property', () => {
  const html = reportToHtml(propertyHealthReport(detail(), evidence()));
  assert.match(html, /<title>Property Health Report — Harbour Street<\/title>/);
  assert.equal((html.match(/<h1>/g) || []).length, 1);
  // Every chapter reaches the page.
  for (const chapter of propertyHealthReport(detail(), evidence()).chapters) {
    assert.ok(html.includes(chapter.title), `${chapter.title} is missing from the page`);
  }
});
