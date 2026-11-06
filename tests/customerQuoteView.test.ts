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

/* ── what the home owner is supplying ────────────────────────────────────── */

test('what the owner supplies is sent, with its note', () => {
  const v = customerQuoteView({
    credits: [{ id: 'c1', description: 'Hardwood flooring', amount: 2400, reason: 'Receipt on file' }],
    creditsSubtotal: 2400,
  });
  assert.equal(v.credits.length, 1);
  assert.equal(v.credits[0].description, 'Hardwood flooring');
  assert.equal(v.credits[0].amount, 2400);
  assert.equal(v.credits[0].note, 'Receipt on file');
  assert.equal(v.creditsSubtotal, 2400);
});

test('it survives every section being switched off', () => {
  // Not a margin disclosure — it is a deduction in the customer's favour,
  // and a deduction they cannot see itemised is one they ring about.
  const v = customerQuoteView({
    customerSections: { materials: false, labor: false, processDetail: false },
    credits: [{ description: 'Tiles', amount: 300 }],
    creditsSubtotal: 300,
  });
  assert.equal(v.credits.length, 1);
});

test('the amount is positive however it was stored', () => {
  const v = customerQuoteView({ credits: [{ description: 'Tiles', amount: -300 }], creditsSubtotal: -300 });
  assert.equal(v.credits[0].amount, 300);
  assert.equal(v.creditsSubtotal, 300);
});

test('a quote with none sends an empty list, never undefined', () => {
  for (const q of [{}, undefined, { credits: 'nope' }]) {
    assert.deepEqual(customerQuoteView(q).credits, []);
    assert.equal(customerQuoteView(q).creditsSubtotal, 0);
  }
});

/* ── 'no-rates': the figures must not be SENT, not merely not drawn ─────── */

/**
 * The whole protection is that the customer's browser never receives the
 * numbers. A payload carrying the real rate with a flag saying "do not
 * display" is the mistake the `visible` checkbox made for months, and it is
 * why a labour rate was one keystroke from being public.
 */
test('a de-rated section sends the line and its cost, and no rate at all', () => {
  const view = customerQuoteView({
    materials: [{ id: 'm1', name: 'Timber', quantity: 40, unit: 'len', unitCost: 12, totalCost: 480 }],
    labor: [{ id: 'l1', role: 'Carpenter', hours: 24, hourlyRate: 55, totalCost: 1320 }],
    customerSections: { materials: 'no-rates', labor: 'no-rates', processDetail: true },
  });

  // The line travels — that is what was asked for.
  assert.equal(view.labor.length, 1);
  assert.equal(view.labor[0].role, 'Carpenter');
  assert.equal(view.labor[0].totalCost, 1320);

  // The figures somebody could divide into a rate do not.
  assert.equal(view.labor[0].hours, 0);
  assert.equal(view.labor[0].hourlyRate, 0);
  assert.equal(view.materials[0].quantity, 0);
  assert.equal(view.materials[0].unitCost, 0);
  assert.equal(view.materials[0].totalCost, 480, 'what it costs still shows');

  // And nowhere in the serialised payload is the rate recoverable.
  const wire = JSON.stringify(view);
  assert.ok(!wire.includes('55'), 'the hourly rate must not appear anywhere');
});

test('full mode still sends everything it always did', () => {
  const view = customerQuoteView({
    labor: [{ id: 'l1', role: 'Carpenter', hours: 24, hourlyRate: 55, totalCost: 1320 }],
    customerSections: { materials: 'full', labor: 'full', processDetail: true },
  });
  assert.equal(view.labor[0].hours, 24);
  assert.equal(view.labor[0].hourlyRate, 55);
});

test('off still sends no lines at all', () => {
  const view = customerQuoteView({
    labor: [{ id: 'l1', role: 'Carpenter', hours: 24, hourlyRate: 55, totalCost: 1320 }],
    customerSections: { materials: 'off', labor: 'off', processDetail: true },
  });
  assert.equal(view.labor.length, 0);
});

/**
 * Phase costs are the floor the customer agrees to, and they appear
 * whenever anything is held back — including when only the rates are.
 */
test('de-rating a section turns the phase costs on', () => {
  const quote = {
    materials: [{ id: 'm1', name: 'Timber', totalCost: 480, phase: 'Framing' }],
    labor: [{ id: 'l1', role: 'Carpenter', totalCost: 1320, phase: 'Framing' }],
    processSteps: [{ title: 'Framing', description: 'We build the frame.' }],
    customerSections: { materials: 'no-rates', labor: 'no-rates', processDetail: true },
  };
  assert.equal(customerQuoteView(quote).processSteps[0].cost, 1800);
});

/* ── the portal list, which had no projection at all ─────────────────────── */

/**
 * `customerQuoteSummary` — what a SIGNED-IN customer gets from GET /quotes.
 *
 * Eric: "make sure what i block never ends up in there portal."
 *
 * The share link was fixed for this and the portal list was not. `GET
 * /quotes` filtered by ownership and returned the raw stored document, so a
 * customer reading their own quote held every hidden line, every excluded
 * line, the margin and the whole rate card. Owning a quote is not permission
 * to see what it cost us.
 *
 * These assert on the SERIALISED payload rather than on named fields,
 * because the failure being guarded against is a field nobody thought to
 * name — a projection that forgets one should fail here, not in somebody's
 * devtools.
 */
import { customerQuoteSummary } from '../supabase/functions/server/customerQuoteView.ts';

const portalQuote = {
  id: 'q-portal',
  quoteNumber: 'Q-2026-414',
  status: 'sent',
  title: 'Kitchen refit',
  project_name: 'Erb kitchen',
  total: 18400,
  createdAt: '2026-11-01T09:00:00.000Z',
  expiryDate: '2026-12-01T09:00:00.000Z',
  workRequestId: 'wr-9',
  customerName: 'A Customer',
  customerEmail: 'customer@example.com',
  totalCost: 18400,
  materials: [
    { name: 'Shaker doors', quantity: 12, unitCost: 140, totalCost: 1680 },
    { name: 'SECRET-HIDDEN-UNIT', quantity: 2, unitCost: 900, totalCost: 1800, visible: false },
    { name: 'SECRET-EXCLUDED-UNIT', quantity: 1, unitCost: 500, totalCost: 500, included: false },
  ],
  labor: [
    { role: 'Carpenter', hours: 24, hourlyRate: 55, totalCost: 1320 },
    { role: 'SECRET-HIDDEN-TRADE', hours: 8, hourlyRate: 95, totalCost: 760, visible: false },
  ],
  processSteps: [
    { title: 'First fix', description: 'rough in' },
    { title: 'SECRET-HIDDEN-PHASE', description: 'internal only', visible: false },
  ],
  // Everything that must never travel.
  repricingSummary: { margin: 0.42, note: 'SECRET-MARGIN' },
  markupRates: { materials: 0.3, labor: 0.25 },
  subcontractorBids: [{ vendor: 'SECRET-SUBBIE', amount: 4200 }],
  estimatorContext: 'SECRET-CONTEXT',
  internalNotes: 'SECRET-NOTE',
  costBasis: { trueCost: 9100 },
};

test('a hidden or excluded line is absent from the portal payload entirely', () => {
  const wire = JSON.stringify(customerQuoteSummary(portalQuote));
  for (const secret of [
    'SECRET-HIDDEN-UNIT',
    'SECRET-EXCLUDED-UNIT',
    'SECRET-HIDDEN-TRADE',
    'SECRET-HIDDEN-PHASE',
  ]) {
    assert.ok(!wire.includes(secret), `${secret} reached the customer portal`);
  }
});

test('nothing internal travels, named or not', () => {
  const wire = JSON.stringify(customerQuoteSummary(portalQuote));
  for (const secret of [
    'SECRET-MARGIN', 'SECRET-SUBBIE', 'SECRET-CONTEXT', 'SECRET-NOTE',
    'repricingSummary', 'markupRates', 'subcontractorBids', 'estimatorContext',
    'internalNotes', 'costBasis', 'trueCost',
  ]) {
    assert.ok(!wire.includes(secret), `${secret} reached the customer portal`);
  }
});

/** The visible work still has to arrive, or the portal shows an empty quote. */
test('what the customer is allowed to see still arrives', () => {
  const out: any = customerQuoteSummary(portalQuote);
  assert.equal(out.materials.length, 1);
  assert.equal(out.materials[0].name, 'Shaker doors');
  assert.equal(out.labor.length, 1);
  assert.equal(out.processSteps.length, 1);
  assert.equal(out.totalCost, 18400);
});

/** The fields CustomerPortalView renders the list from. */
test('the list still has what the portal needs to draw a row', () => {
  const out: any = customerQuoteSummary(portalQuote);
  assert.equal(out.id, 'q-portal');
  assert.equal(out.status, 'sent');
  assert.equal(out.title, 'Kitchen refit');
  assert.equal(out.project_name, 'Erb kitchen');
  assert.equal(out.total, 18400);
  assert.equal(out.amount, 18400);
  assert.equal(out.createdAt, '2026-11-01T09:00:00.000Z');
  assert.equal(out.expiryDate, '2026-12-01T09:00:00.000Z');
  assert.equal(out.workRequestId, 'wr-9');
  assert.equal(out.deposit_paid, false);
  assert.equal(out.quote_approved, false);
});

/**
 * A quote set to withhold rates must withhold them here too. The portal is
 * a second door onto the same document and the rule cannot differ by door.
 */
test('rates withheld on the quote do not appear in the portal payload', () => {
  const wire = JSON.stringify(customerQuoteSummary({
    ...portalQuote,
    customerSections: { materials: 'no-rates', labor: 'no-rates', processDetail: true },
  }));
  assert.ok(!wire.includes('140'), 'a material unit cost reached the portal');
  assert.ok(!wire.includes('55'), 'an hourly rate reached the portal');
  // The amount of the line is the thing being shown, and still is.
  assert.ok(wire.includes('1680'), 'the line total should still travel');
});

test('a junk or empty quote does not throw', () => {
  assert.doesNotThrow(() => customerQuoteSummary({}));
  assert.doesNotThrow(() => customerQuoteSummary(null));
});
