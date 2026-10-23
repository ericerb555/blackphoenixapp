/**
 * What must not reach a customer holding their own invoice.
 *
 * The tests come in three groups, and the third is the one that is easy to
 * forget: what leaks, what the customer still sees correctly, and whether
 * the document still ADDS UP. An invoice whose sections no longer sum to its
 * total is queried by the customer, and at that point every other figure on
 * it is in question too.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { customerInvoiceView, isLineShown } from '../supabase/functions/server/customerInvoiceView.ts';

const invoice = {
  id: 'inv-1',
  invoice_id: 'INV-2026-0188',
  invoice_number: 'INV-2026-0188',
  status: 'pending',
  issue_date: '2026-10-22',
  due_date: '2026-11-21',
  customer_name: 'Marguerite Oyelaran',
  customer_email: 'm.oyelaran@example.com',
  line_items: [
    { line_number: 1, description: 'Steel beam', quantity: 1, unit_price: 1840, amount: 1840, phase: 'Structural' },
    { line_number: 2, description: 'Contingency', quantity: 1, unit_price: 500, amount: 500, phase: 'Structural', visible: false },
    { line_number: 3, description: 'Carpenter', quantity: 32, unit_price: 70, amount: 2240, phase: 'Structural' },
    { line_number: 4, description: 'Skip hire', quantity: 2, unit_price: 450, amount: 900, phase: 'Strip out', visible: false },
    { line_number: 5, description: 'Parking permits', quantity: 1, unit_price: 90, amount: 90 },
  ],
  process_steps: [
    { title: 'Structural', description: 'Steels in' },
    { title: 'Internal staging', description: 'our scheduling', visible: false },
  ],
  subtotal: 5570,
  tax_rate: 8.75,
  tax_amount: 487.38,
  discount_amount: 0,
  total_amount: 6057.38,
  paid_amount: 0,
  balance_due: 6057.38,
  notes: 'Due on completion of the structural phase.',

  /* ── everything below is the office's business, not the customer's ──── */
  internalNotes: 'customer haggles, padded the carpenter hours',
  costBasis: { trueMaterialCost: 1200, markupPct: 53 },
  subQuotes: [{ subName: 'Dmitri Steelworks', baseAmount: 1200, markupPct: 53 }],
  createdBy: 'eric@theblackphoenixcompany.com',
  priceSummary: { discountApplied: 0.15, listTotal: 7126 },
};

/* ── what must not travel ────────────────────────────────────────────────── */

test('a hidden line is not in the customer’s copy', () => {
  const v = customerInvoiceView(invoice);
  const json = JSON.stringify(v);
  assert.ok(!json.includes('Contingency'), 'contingency leaked');
  assert.ok(!json.includes('Skip hire'), 'skip hire leaked');
  assert.equal(v.line_items.length, 3);
});

test('a hidden process step is not in the customer’s copy', () => {
  const v = customerInvoiceView(invoice);
  assert.ok(!JSON.stringify(v).includes('our scheduling'));
  assert.deepEqual(v.process_steps.map((s) => s.title), ['Structural']);
});

test('nothing the office keeps to itself travels, named or not', () => {
  const json = JSON.stringify(customerInvoiceView(invoice));
  for (const secret of [
    'haggles', 'padded', 'trueMaterialCost', 'markupPct', 'Dmitri',
    'discountApplied', 'listTotal', 'eric@theblackphoenixcompany.com',
  ]) {
    assert.ok(!json.includes(secret), `${secret} leaked to the customer`);
  }
});

test('an allowlist: a field added to the record tomorrow does not travel', () => {
  // The whole point of building the projection up rather than stripping it
  // down. This is the test that fails if somebody switches to a denylist.
  const v: any = customerInvoiceView({ ...invoice, someNewMarginField: 9999 });
  assert.ok(!('someNewMarginField' in v));
  assert.ok(!JSON.stringify(v).includes('9999'));
});

test('a hidden line’s own fields do not survive on a visible one', () => {
  const v = customerInvoiceView({
    ...invoice,
    line_items: [{ description: 'Beam', quantity: 1, unit_price: 10, amount: 10, visible: true, costBasis: 4, internalNote: 'padded' }],
  });
  const line: any = v.line_items[0];
  assert.ok(!('costBasis' in line), 'line-level cost basis leaked');
  assert.ok(!('internalNote' in line), 'line-level note leaked');
  assert.ok(!('visible' in line), 'the flag itself need not travel');
});

/* ── what the customer must still get ────────────────────────────────────── */

test('the visible lines come through, renumbered without gaps', () => {
  const v = customerInvoiceView(invoice);
  assert.deepEqual(v.line_items.map((l) => l.description), ['Steel beam', 'Carpenter', 'Parking permits']);
  assert.deepEqual(v.line_items.map((l) => l.line_number), [1, 2, 3]);
});

test('the invoice still identifies itself and who owes what', () => {
  const v = customerInvoiceView(invoice);
  assert.equal(v.invoice_number, 'INV-2026-0188');
  assert.equal(v.customer_name, 'Marguerite Oyelaran');
  assert.equal(v.due_date, '2026-11-21');
  assert.equal(v.balance_due, 6057.38);
  assert.equal(v.notes, 'Due on completion of the structural phase.');
});

/* ── THE ARITHMETIC: it still has to add up ──────────────────────────────── */

test('phase costs count the hidden lines, so the sections still sum', () => {
  const v = customerInvoiceView(invoice);
  assert.equal(v.phase_costs['Structural'], 4580, '1840 + 500 hidden + 2240');
  assert.equal(v.phase_costs['Strip out'], 900, 'entirely hidden, still costed');
  assert.equal(v.phase_costs[''], 90, 'unphased lines keyed on the empty string');
});

test('the phase costs sum to the stored subtotal', () => {
  const v = customerInvoiceView(invoice);
  const summed = Object.values(v.phase_costs).reduce((a, b) => a + b, 0);
  assert.equal(summed, invoice.subtotal, 'the sections must add up to the subtotal');
});

test('a phase whose every line is hidden still has its cost', () => {
  // Otherwise "Strip out" renders at $0 and the customer asks why they are
  // being charged nothing for work they watched happen.
  const v = customerInvoiceView(invoice);
  assert.ok(!v.line_items.some((l) => l.phase === 'Strip out'));
  assert.equal(v.phase_costs['Strip out'], 900);
});

test('the stored totals pass through untouched, never recomputed', () => {
  const v = customerInvoiceView(invoice);
  const visibleSum = v.line_items.reduce((a, l) => a + l.amount, 0);
  assert.equal(visibleSum, 4170, 'the drawn lines deliberately fall short');
  assert.equal(v.subtotal, 5570, 'and the subtotal is NOT reduced to match');
  assert.equal(v.total_amount, 6057.38);
});

test('an amount is derived only when the record has none', () => {
  const v = customerInvoiceView({ line_items: [{ description: 'x', quantity: 3, unit_price: 19.999 }] });
  assert.equal(v.line_items[0].amount, 60, 'rounded once');
});

/* ── defaults and rubbish ────────────────────────────────────────────────── */

test('absent means shown, so invoices already sent are unchanged', () => {
  for (const l of [{}, { visible: true }, { visible: undefined }]) {
    assert.equal(isLineShown(l), true, JSON.stringify(l));
  }
  assert.equal(isLineShown({ visible: false }), false);
});

test('an invoice with nothing hidden is fully itemised', () => {
  const plain = { ...invoice, line_items: invoice.line_items.filter((l: any) => l.visible !== false) };
  const v = customerInvoiceView(plain);
  assert.equal(v.line_items.length, 3);
  const summed = Object.values(v.phase_costs).reduce((a, b) => a + b, 0);
  assert.equal(summed, v.line_items.reduce((a, l) => a + l.amount, 0));
});

test('a malformed invoice projects to an empty one rather than throwing', () => {
  for (const bad of [undefined, null, {}, 'nope', 7, { line_items: 'no' }]) {
    const v = customerInvoiceView(bad);
    assert.deepEqual(v.line_items, []);
    assert.deepEqual(v.process_steps, []);
    assert.equal(v.total_amount, 0);
  }
});

test('the projection never returns undefined fields the renderer would print', () => {
  const v: any = customerInvoiceView({});
  for (const [k, val] of Object.entries(v)) {
    assert.ok(val !== undefined && val !== null, `${k} came back ${val}`);
  }
});
