/**
 * What reaches a customer holding a share link, and what must not.
 *
 * This is the only thing standing between the stored quote and somebody
 * outside the company, and the failure is silent in the worst way: a leaked
 * margin looks exactly like a working quote. The customer sees a normal page,
 * nobody reports anything, and the figure is in their browser.
 *
 * So the test that matters most is the negative one — the whole record is fed
 * in with every internal field populated, and the output is checked for their
 * ABSENCE rather than the presence of the good fields. A projection that
 * forgets a field fails here instead of in somebody's devtools.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { customerQuoteView } from '../supabase/functions/server/customerQuoteView.ts';

/** A quote carrying everything the real record carries, internal bits included. */
const fullQuote = {
  id: 'q1',
  number: 'Q-2026-0001',
  clientName: 'Jane Homeowner',
  clientEmail: 'jane@example.com',
  clientPhone: '555-0100',
  clientAddress: '1 Main St',
  totalCost: 5100,
  materialsSubtotal: 3000,
  laborSubtotal: 1800,
  taxRate: 0.07,
  taxAmount: 300,
  aiSummary: 'A full account of the job.',
  notes: 'Customer-facing note.',

  materials: [
    { id: 'm1', name: 'Lumber', description: '2x4', quantity: 50, unit: 'each', unitCost: 6, totalCost: 300, category: 'Lumber' },
    { id: 'm2', name: 'Dump fees', description: 'skip hire', quantity: 1, unit: 'lot', unitCost: 500, totalCost: 500, category: 'Disposal', visible: false },
  ],
  labor: [
    { id: 'l1', role: 'Carpenter', description: 'framing', hours: 20, hourlyRate: 70, totalCost: 1400 },
    { id: 'l2', role: 'Labourer', description: 'clearing', hours: 8, hourlyRate: 50, totalCost: 400, visible: false },
  ],
  processSteps: [
    { id: 's1', stepNumber: 1, title: 'Strip out', description: 'Remove existing', estimatedDuration: '2 days' },
    { id: 's2', stepNumber: 2, title: 'Internal staging', description: 'our scheduling', estimatedDuration: '1 day', visible: false },
    { id: 's3', stepNumber: 3, title: 'Framing', description: 'Build', estimatedDuration: '3 days' },
  ],

  // ── none of this may travel ────────────────────────────────────────────
  internalNotes: 'Dave is slow on tile, pad the hours. Customer haggles.',
  priceSummary: { ourCost: 2100, margin: 0.42 },
  subQuotes: [{ sub: 'Dave', amount: 900 }],
  intake: { brief: 'what he told us', squareFootage: '900' },
  aiEstimatorContext: 'the full prompt context',
  pricingBasis: 'estimator',
  unpricedSendAcknowledged: { by: 'eric', at: 'now', basis: 'x' },
  jobId: 'job-99',
  workRequestId: 'wr-99',
  signature: { signerName: 'Jane', signatureData: 'base64...' },
};

/* ── the negative test, which is the point of the module ─────────────────── */

test('no internal field survives the projection', () => {
  const out = customerQuoteView(fullQuote) as Record<string, any>;
  for (const leaked of [
    'internalNotes', 'priceSummary', 'subQuotes', 'intake', 'aiEstimatorContext',
    'pricingBasis', 'unpricedSendAcknowledged', 'jobId', 'workRequestId', 'signature',
  ]) {
    assert.equal(out[leaked], undefined, `${leaked} reached the customer`);
  }
});

test('the serialised payload does not contain internal text anywhere', () => {
  // Belt and braces: a nested copy would pass the key check above and still
  // ship the words. This is what an attacker actually reads.
  const json = JSON.stringify(customerQuoteView(fullQuote));
  assert.ok(!json.includes('Dave is slow'), 'internal notes text leaked');
  assert.ok(!json.includes('margin'), 'margin leaked');
  assert.ok(!json.includes('what he told us'), 'intake leaked');
  assert.ok(!json.includes('the full prompt context'), 'estimator context leaked');
});

/* ── hidden lines ────────────────────────────────────────────────────────── */

test('a line marked not visible does not reach the customer', () => {
  const out = customerQuoteView(fullQuote);
  assert.deepEqual(out.materials.map((m) => m.id), ['m1']);
  assert.deepEqual(out.labor.map((l) => l.id), ['l1']);
  assert.ok(!JSON.stringify(out).includes('Dump fees'));
});

test('a line with no visible flag is shown — absent is not hidden', () => {
  // Every quote raised before the flag existed has none. Defaulting to hidden
  // would blank them all.
  const out = customerQuoteView({ materials: [{ id: 'm1', name: 'Lumber' }] });
  assert.equal(out.materials.length, 1);
});

test('hiding a line keeps the money: totals pass through untouched', () => {
  // Eric's explicit choice. The visible lines deliberately do not sum to the
  // total — hiding removes the detail, not the cost.
  const out = customerQuoteView(fullQuote);
  assert.equal(out.totalCost, 5100);
  assert.equal(out.materialsSubtotal, 3000);
  assert.equal(out.laborSubtotal, 1800);
  const visibleSum = out.materials.reduce((s, m) => s + m.totalCost, 0)
    + out.labor.reduce((s, l) => s + l.totalCost, 0);
  assert.equal(visibleSum, 1700);
  assert.notEqual(visibleSum, out.totalCost);
});

test('visible process steps are renumbered so there is no gap to ask about', () => {
  const out = customerQuoteView(fullQuote);
  assert.deepEqual(out.processSteps.map((s) => s.stepNumber), [1, 2]);
  assert.deepEqual(out.processSteps.map((s) => s.title), ['Strip out', 'Framing']);
  assert.ok(!JSON.stringify(out).includes('Internal staging'));
});

/* ── phase-totals mode: the breakdown must not be sent ───────────────────── */

const phasedQuote = {
  ...fullQuote,
  customerSections: { materials: false, labor: false, processDetail: true },
  materials: [
    { id: 'm1', name: 'Lumber', quantity: 1, unitCost: 1100, totalCost: 1100, phase: 'Framing' },
    { id: 'm2', name: 'Skip hire', quantity: 1, unitCost: 450, totalCost: 450, phase: 'Strip out', visible: false },
  ],
  labor: [
    { id: 'l1', role: 'Carpenter', hours: 40, hourlyRate: 70, totalCost: 2800, phase: 'Framing' },
  ],
  processSteps: [
    { id: 's1', stepNumber: 1, title: 'Strip out', description: 'Remove existing', estimatedDuration: '2 days' },
    { id: 's2', stepNumber: 2, title: 'Framing', description: 'Build', estimatedDuration: '5 days' },
  ],
};

test('phase-totals sends no materials or labour at all', () => {
  const out = customerQuoteView(phasedQuote);
  assert.deepEqual(out.materials, []);
  assert.deepEqual(out.labor, []);
});

test('phase-totals leaves no trace of a rate or a supplier line', () => {
  // The reason this mode exists: a customer who can read "Carpenter 40h @ $70"
  // knows the labour rate and can price the job themselves.
  const json = JSON.stringify(customerQuoteView(phasedQuote));
  assert.ok(!json.includes('Carpenter'), 'labour role leaked');
  assert.ok(!json.includes('Lumber'), 'material leaked');
  assert.ok(!json.includes('70'), 'hourly rate leaked');
});

test('each phase carries its own cost instead', () => {
  const out = customerQuoteView(phasedQuote);
  const byTitle = Object.fromEntries(out.processSteps.map((s) => [s.title, s.cost]));
  assert.equal(byTitle['Framing'], 3900);   // 1100 + 2800
  assert.equal(byTitle['Strip out'], 450);
});

test('a hidden line still counts towards its phase total', () => {
  // Hiding removes the detail, not the money — so the skip hire is invisible
  // as a line and present in the Strip out total. That is exactly what makes
  // showing phase totals safe while hiding the lines.
  const out = customerQuoteView(phasedQuote);
  const stripOut = out.processSteps.find((s) => s.title === 'Strip out');
  assert.equal(stripOut?.cost, 450);
  assert.ok(!JSON.stringify(out).includes('Skip hire'));
});

test('every section defaults on — hiding is an act', () => {
  // Absent config means show everything, so no existing quote changes.
  for (const customerSections of [undefined, {}, { materials: true }]) {
    const out = customerQuoteView({ ...phasedQuote, customerSections });
    assert.equal(out.materials.length, 1, JSON.stringify(customerSections));
    if (customerSections?.materials === true && !('labor' in (customerSections as any))) {
      assert.equal(out.labor.length, 1, 'labor should default on');
    }
  }
});

test('materials and labour switch independently', () => {
  const noLabor = customerQuoteView({ ...phasedQuote, customerSections: { materials: true, labor: false, processDetail: true } });
  assert.equal(noLabor.materials.length, 1, 'materials kept');
  assert.deepEqual(noLabor.labor, [], 'labour withheld');
  assert.ok(!JSON.stringify(noLabor).includes('Carpenter'), 'labour role leaked');
  // The rate is what hiding labour protects, and the phase total still shows.
  assert.equal(noLabor.processSteps.find((s) => s.title === 'Framing')?.cost, 3900);

  const noMaterials = customerQuoteView({ ...phasedQuote, customerSections: { materials: false, labor: true, processDetail: true } });
  assert.deepEqual(noMaterials.materials, [], 'materials withheld');
  assert.equal(noMaterials.labor.length, 1, 'labour kept');
});

test('process detail switches off without losing the phase or its price', () => {
  const out = customerQuoteView({ ...phasedQuote, customerSections: { materials: false, labor: false, processDetail: false } });
  const framing = out.processSteps.find((s) => s.title === 'Framing');
  assert.equal(framing?.title, 'Framing', 'the phase name must survive');
  assert.equal(framing?.cost, 3900, 'the price must survive');
  assert.equal(framing?.description, '', 'the written account is withheld');
  assert.ok(!JSON.stringify(out).includes('Build'), 'phase description leaked');
});

test('with both line sections shown, no phase cost is emitted', () => {
  // It would just be a second copy of a number they can already add up.
  const out = customerQuoteView({ ...phasedQuote, customerSections: { materials: true, labor: true, processDetail: true } });
  assert.equal(out.processSteps[0].cost, undefined);
});

test('a quote saved under the old lineDetail setting still behaves', () => {
  const out = customerQuoteView({ ...phasedQuote, customerSections: undefined, lineDetail: 'phase-totals' });
  assert.deepEqual(out.materials, []);
  assert.deepEqual(out.labor, []);
  assert.equal(out.processSteps.find((s) => s.title === 'Framing')?.cost, 3900);
});

/* ── the fields that should travel ───────────────────────────────────────── */

test('what the customer view needs does come through', () => {
  const out = customerQuoteView(fullQuote);
  assert.equal(out.quoteNumber, 'Q-2026-0001');
  assert.equal(out.customerName, 'Jane Homeowner');
  assert.equal(out.address, '1 Main St');
  assert.equal(out.scopeOfWork, 'A full account of the job.');
  assert.equal(out.notes, 'Customer-facing note.');
  assert.equal(out.taxAmount, 300);
});

test('an empty or malformed quote yields a usable empty shape, not a throw', () => {
  for (const input of [undefined, null, {}, { materials: 'nonsense', labor: 7 }]) {
    const out = customerQuoteView(input);
    assert.deepEqual(out.materials, []);
    assert.deepEqual(out.labor, []);
    assert.equal(out.totalCost, 0);
  }
});
