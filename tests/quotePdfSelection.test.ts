/**
 * What lands on a quote PDF, and what must not.
 *
 * A PDF emailed to a customer is exactly as public as a share link, so this
 * has to obey the same rules as `customerQuoteView` — and the failure is
 * worse, because an email cannot be unsent. If the customer copy carries a
 * line Eric hid, he finds out when they quote his own labour rate back at
 * him.
 *
 * So the tests come in pairs: what the customer gets, and what the internal
 * copy gets. Those two diverging in the wrong direction is the whole risk.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectQuoteLines, sectionsOf } from '../src/app/lib/quotePdfSelection.ts';

const quote = {
  materials: [
    { name: 'Lumber', quantity: 1, unitCost: 1100, totalCost: 1100, phase: 'Framing' },
    { name: 'Skip hire', quantity: 1, unitCost: 450, totalCost: 450, phase: 'Strip out', visible: false },
  ],
  labor: [
    { role: 'Carpenter', hours: 40, hourlyRate: 70, totalCost: 2800, phase: 'Framing' },
  ],
  processSteps: [
    { title: 'Strip out', description: 'Remove existing', estimatedDuration: '2 days' },
    { title: 'Framing', description: 'Build the frame', estimatedDuration: '5 days' },
    { title: 'Internal staging', description: 'our scheduling', visible: false },
  ],
};

/* ── the customer copy ───────────────────────────────────────────────────── */

test('a hidden line is not on the customer copy', () => {
  const sel = selectQuoteLines(quote, true);
  assert.ok(!sel.lines.some((l) => l.description.includes('Skip hire')));
});

test('a hidden line still counts towards its phase cost', () => {
  // Hiding removes the detail, not the money. A total summed from the drawn
  // lines would undercharge by exactly the hidden amount.
  const sel = selectQuoteLines(quote, true);
  assert.equal(sel.phaseCost.get('Strip out'), 450);
  assert.equal(sel.phaseCost.get('Framing'), 3900);
});

test('a hidden process step is not on the customer copy', () => {
  const sel = selectQuoteLines(quote, true);
  assert.ok(!sel.steps.some((s: any) => s.title === 'Internal staging'));
});

test('switching labour off withholds the rate but keeps the phase cost', () => {
  const sel = selectQuoteLines(
    { ...quote, customerSections: { materials: true, labor: false, processDetail: true } },
    true,
  );
  assert.ok(!sel.lines.some((l) => l.description.includes('Carpenter')), 'labour leaked');
  assert.ok(sel.lines.some((l) => l.description.includes('Lumber')), 'materials should stay');
  assert.equal(sel.phaseCost.get('Framing'), 3900, 'phase cost unchanged');
  assert.equal(sel.showLines, true);
});

test('switching both line sections off leaves nothing drawable but the totals', () => {
  const sel = selectQuoteLines(
    { ...quote, customerSections: { materials: false, labor: false, processDetail: true } },
    true,
  );
  assert.deepEqual(sel.lines, []);
  assert.equal(sel.showLines, false);
  assert.equal(sel.phaseCost.get('Framing'), 3900);
});

test('switching process detail off drops the text, never the phase', () => {
  const sel = selectQuoteLines(
    { ...quote, customerSections: { materials: true, labor: true, processDetail: false } },
    true,
  );
  assert.equal(sel.phaseText.size, 0, 'no phase prose');
  assert.equal(sel.steps.length, 2, 'the phases themselves survive');
});

test('nothing withheld leaks into the serialised customer selection', () => {
  const sel = selectQuoteLines(
    { ...quote, customerSections: { materials: false, labor: false, processDetail: false } },
    true,
  );
  const json = JSON.stringify({ lines: sel.lines, text: [...sel.phaseText] });
  for (const secret of ['Carpenter', 'Lumber', 'Skip hire', 'Build the frame', 'our scheduling']) {
    assert.ok(!json.includes(secret), `${secret} leaked onto the customer PDF`);
  }
});

/* ── the internal copy, which must NOT be censored ───────────────────────── */

test('the internal copy shows everything, hidden lines included', () => {
  const sel = selectQuoteLines(quote, false);
  assert.ok(sel.lines.some((l) => l.description.includes('Skip hire')));
  assert.ok(sel.lines.some((l) => l.description.includes('Carpenter')));
  assert.ok(sel.steps.some((s: any) => s.title === 'Internal staging'));
});

test('the internal copy marks which lines the customer was not shown', () => {
  // Reading a printout and not knowing which lines the customer saw is how
  // somebody discusses a line the customer has never heard of.
  const sel = selectQuoteLines(quote, false);
  const skip = sel.lines.find((l) => l.description.includes('Skip hire'));
  assert.match(skip!.description, /hidden from customer/);
});

test('the internal copy ignores the section switches', () => {
  const sel = selectQuoteLines(
    { ...quote, customerSections: { materials: false, labor: false, processDetail: false } },
    false,
  );
  assert.equal(sel.lines.length, 3, 'all lines regardless');
  assert.equal(sel.sections.materials, true);
});

/* ── defaults and rubbish ────────────────────────────────────────────────── */

test('every section defaults on', () => {
  for (const q of [{}, { customerSections: {} }, { customerSections: { materials: true } }]) {
    const s = sectionsOf(q);
    assert.equal(s.labor, true, JSON.stringify(q));
    assert.equal(s.processDetail, true);
  }
});

test('the old lineDetail setting is still honoured', () => {
  const s = sectionsOf({ lineDetail: 'phase-totals' });
  assert.deepEqual(s, { materials: false, labor: false, processDetail: true });
});

test('a malformed quote selects nothing rather than throwing', () => {
  for (const bad of [undefined, null, {}, { materials: 'nope', labor: 3 }]) {
    const sel = selectQuoteLines(bad, true);
    assert.deepEqual(sel.lines, []);
    assert.equal(sel.phaseCost.size, 0);
  }
});

/* ── what the home owner is supplying ────────────────────────────────────── */

const withSupplied = {
  ...quote,
  credits: [
    { id: 'c1', description: 'Hardwood flooring', amount: 2400, reason: 'Bought their own at Home Depot, receipt on file' },
    { id: 'c2', description: 'Bathroom fixtures', amount: 650 },
  ],
};

test('what the owner supplies reaches the customer copy', () => {
  const sel = selectQuoteLines(withSupplied, true);
  assert.equal(sel.credits.length, 2);
  assert.equal(sel.credits[0].description, 'Hardwood flooring');
  assert.equal(sel.credits[0].amount, 2400);
  assert.match(sel.credits[0].note!, /Home Depot/);
});

test('the section switches do NOT withhold it', () => {
  /**
   * The switches exist to stop a customer working backwards to our rates.
   * This is money coming OFF their bill for something they are providing,
   * so hiding it would leave a deduction in the total with nothing on the
   * page explaining it — which is the one thing that generates a phone call.
   */
  const sel = selectQuoteLines(
    { ...withSupplied, customerSections: { materials: false, labor: false, processDetail: false } },
    true,
  );
  assert.equal(sel.credits.length, 2, 'withheld along with the materials');
});

test('the amount is always positive, whatever was typed', () => {
  // Being a credit is the record type, not the sign. A negative here would
  // be subtracted twice by anything that already knows these come off.
  const sel = selectQuoteLines({ credits: [{ description: 'Tiles', amount: -500 }] }, true);
  assert.equal(sel.credits[0].amount, 500);
});

test('an unnamed item still reads as something', () => {
  const sel = selectQuoteLines({ credits: [{ amount: 100 }] }, true);
  assert.equal(sel.credits[0].description, 'Supplied by you');
  assert.equal(sel.credits[0].note, undefined, 'no empty note to draw');
});

test('a quote with none gets an empty list, not undefined', () => {
  for (const q of [quote, {}, undefined, { credits: 'nope' }]) {
    assert.deepEqual(selectQuoteLines(q, true).credits, []);
  }
});
