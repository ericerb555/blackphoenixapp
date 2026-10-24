/**
 * What lands on an invoice, and what must not.
 *
 * The expensive failure here is not a leak — it is arithmetic. An invoice
 * whose sections no longer add up to the total is an invoice the customer
 * queries, and they query it by adding the sections up themselves. So the
 * money tests matter at least as much as the visibility ones, and they come
 * in pairs: what is shown, and what is still charged for.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  selectInvoiceLines,
  isLineShown,
  amountOf,
  UNPHASED,
  isLineIncluded,
} from '../src/app/lib/invoiceLineSelection.ts';

const items = [
  { description: 'Steel beam', quantity: 1, unit_price: 1840, phase: 'Structural' },
  { description: 'Structural carpenter', quantity: 32, unit_price: 70, phase: 'Structural' },
  { description: 'Contingency', quantity: 1, unit_price: 500, phase: 'Structural', visible: false },
  { description: 'Skip hire', quantity: 2, unit_price: 450, phase: 'Strip out', visible: false },
  { description: 'Labourer', quantity: 16, unit_price: 38, phase: 'Strip out' },
  { description: 'Parking permits', quantity: 1, unit_price: 90 },
];

/* ── the customer copy ───────────────────────────────────────────────────── */

test('a hidden line is not on the customer copy', () => {
  const sel = selectInvoiceLines(items, true);
  const text = JSON.stringify(sel.lines);
  assert.ok(!text.includes('Contingency'), 'contingency leaked');
  assert.ok(!text.includes('Skip hire'), 'skip hire leaked');
  assert.equal(sel.lines.length, 4);
});

test('a hidden line still counts towards its phase cost', () => {
  // The whole point. Structural is 1840 + 2240 + 500 even though the 500 is
  // never drawn; summing the drawn lines would undercharge by exactly that.
  const sel = selectInvoiceLines(items, true);
  assert.equal(sel.phaseCost.get('Structural'), 4580);
  assert.equal(sel.phaseCost.get('Strip out'), 1508);
});

test('lines with no phase are costed under the unassigned key', () => {
  const sel = selectInvoiceLines(items, true);
  assert.equal(sel.phaseCost.get(UNPHASED), 90);
});

test('the phase costs sum to the full invoice, hidden lines included', () => {
  const sel = selectInvoiceLines(items, true);
  const summed = [...sel.phaseCost.values()].reduce((a, b) => a + b, 0);
  const everything = items.reduce((a, i) => a + i.quantity * i.unit_price, 0);
  assert.equal(summed, everything, 'sections must add up to the total');
  assert.equal(summed, 6178);
});

test('the customer copy reports what was withheld, for the sender', () => {
  const sel = selectInvoiceLines(items, true);
  assert.equal(sel.hiddenCount, 2);
  assert.equal(sel.hiddenAmount, 1400);
});

/* ── credits keep their sign ─────────────────────────────────────────────── */

test('a credit subtracts, and a hidden credit still subtracts', () => {
  const withCredit = [
    { description: 'Flooring', quantity: 1, unit_price: 1200, phase: 'Finishes' },
    { description: 'Customer-supplied flooring', quantity: 1, unit_price: -1200, phase: 'Finishes', visible: false },
  ];
  const sel = selectInvoiceLines(withCredit, true);
  assert.equal(sel.lines.length, 1);
  assert.equal(sel.phaseCost.get('Finishes'), 0, 'the credit must still net off');
  assert.equal(sel.hiddenAmount, -1200);
});

/* ── the internal copy, which must NOT be censored ───────────────────────── */

test('the internal copy shows every line', () => {
  const sel = selectInvoiceLines(items, false);
  assert.equal(sel.lines.length, 6);
});

test('the internal copy marks which lines the customer was not shown', () => {
  const sel = selectInvoiceLines(items, false);
  const hidden = sel.lines.filter((l) => /hidden from customer/.test(l.description));
  assert.equal(hidden.length, 2);
  assert.match(hidden[0].description, /^Contingency/);
});

test('the internal copy does not report a withheld tally, having withheld nothing', () => {
  const sel = selectInvoiceLines(items, false);
  assert.equal(sel.hiddenCount, 0);
  assert.equal(sel.hiddenAmount, 0);
});

test('marking the internal copy does not mutate the caller’s lines', () => {
  const mine = [{ description: 'Contingency', quantity: 1, unit_price: 500, visible: false }];
  selectInvoiceLines(mine, false);
  assert.equal(mine[0].description, 'Contingency', 'the source line was edited in place');
});

/* ── defaults and rubbish ────────────────────────────────────────────────── */

test('absent means shown, so existing invoices are unchanged', () => {
  for (const l of [{}, { visible: true }, { visible: undefined }, { description: 'x' }]) {
    assert.equal(isLineShown(l), true, JSON.stringify(l));
  }
  assert.equal(isLineShown({ visible: false }), false);
});

test('an invoice with no hidden lines is identical either way', () => {
  const plain = items.filter((i) => i.visible !== false);
  const a = selectInvoiceLines(plain, true);
  const b = selectInvoiceLines(plain, false);
  assert.deepEqual(a.lines, b.lines);
});

test('amounts round once, so the sections cannot drift from the total', () => {
  assert.equal(amountOf({ quantity: 3, unit_price: 19.999 }), 60);
  assert.equal(amountOf({ quantity: 0, unit_price: 100 }), 0);
  assert.equal(amountOf({}), 0);
});

test('malformed input selects nothing rather than throwing', () => {
  for (const bad of [undefined, null, {}, 'nope', 7, [null, undefined]]) {
    const sel = selectInvoiceLines(bad, true);
    assert.ok(Array.isArray(sel.lines));
    assert.equal(sel.hiddenCount, 0);
  }
});

/* ── excluded is not hidden, and the difference is money ─────────────────── */

const mixed = [
  { description: 'Steel', quantity: 1, unit_price: 1000, phase: 'Structural' },
  { description: 'Skip hire', quantity: 1, unit_price: 300, phase: 'Structural', visible: false },
  { description: 'Dropped extra', quantity: 1, unit_price: 700, phase: 'Structural', included: false },
];

test('an excluded line is not charged, a hidden one is', () => {
  const sel = selectInvoiceLines(mixed, true);
  // Hidden: in the phase cost, not in the lines. Excluded: in neither.
  assert.equal(sel.phaseCost.get('Structural'), 1300, '1000 + 300 hidden, NOT the 700 excluded');
  assert.deepEqual(sel.lines.map((l) => l.description), ['Steel']);
});

test('an excluded line is gone from the office copy too', () => {
  // An internal printout listing work that is not being billed is how
  // somebody quotes a figure that is not the figure.
  const sel = selectInvoiceLines(mixed, false);
  assert.ok(!JSON.stringify(sel.lines).includes('Dropped extra'));
  assert.equal(sel.lines.length, 2, 'the hidden one still shows internally');
});

test('excluding does not count towards the withheld tally', () => {
  const sel = selectInvoiceLines(mixed, true);
  assert.equal(sel.hiddenCount, 1, 'only the hidden one');
  assert.equal(sel.hiddenAmount, 300, 'not 1000');
});

test('absent means included, so no invoice already sent changes', () => {
  for (const l of [{}, { included: true }, { included: undefined }]) {
    assert.equal(isLineIncluded(l), true, JSON.stringify(l));
  }
  assert.equal(isLineIncluded({ included: false }), false);
});

test('a line can be both excluded and hidden without counting twice', () => {
  const sel = selectInvoiceLines(
    [{ description: 'Both', quantity: 1, unit_price: 500, visible: false, included: false }],
    true,
  );
  assert.deepEqual(sel.lines, []);
  assert.equal(sel.hiddenCount, 0, 'excluded wins; it is not a withheld line');
  assert.equal(sel.phaseCost.size, 0);
});
