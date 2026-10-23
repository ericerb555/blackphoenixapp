/**
 * The invoice PDF's numbers.
 *
 * A mapping bug here does not produce a broken document — it produces a
 * perfectly good-looking PDF with the wrong figures on it, sent to somebody
 * who is going to pay against them. That is why the tax rate, the phase
 * subtotals and the balance each get their own test rather than being
 * eyeballed once in a preview.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { invoicePdfParts } from '../src/app/lib/invoicePdfParts.ts';

const invoice = {
  invoice_number: 'INV-2026-0188',
  issue_date: '2026-10-22T09:14:00.000Z',
  due_date: '2026-11-21',
  status: 'pending',
  customer_name: 'Marguerite Oyelaran',
  customer_email: 'm.oyelaran@example.com',
  service_address: '884 Catalina Drive, Scottsdale AZ 85251',
  line_items: [
    { description: 'Steel beam', quantity: 1, unit_price: 1840, amount: 1840, phase: 'Structural' },
    { description: 'Contingency', quantity: 1, unit_price: 500, amount: 500, phase: 'Structural', visible: false },
    { description: 'Carpenter', quantity: 32, unit_price: 70, amount: 2240, phase: 'Structural' },
    { description: 'Parking permits', quantity: 1, unit_price: 90, amount: 90 },
  ],
  process_steps: [{ title: 'Structural', estimatedDuration: '4 days' }],
  subtotal: 4670,
  tax_rate: 8.75,
  tax_amount: 408.63,
  total_amount: 5078.63,
  paid_amount: 0,
  balance_due: 5078.63,
  notes: 'Due on completion of the structural phase.',
};

/* ── the heading, which is the whole point of reusing the layout ─────────── */

test('it says INVOICE, not ESTIMATE', () => {
  assert.equal(invoicePdfParts(invoice, true).heading, 'Invoice');
});

test('the due date rides in the layout’s validUntil row', () => {
  assert.equal(invoicePdfParts(invoice, true).validUntil, '2026-11-21');
});

test('an issue date with a time on it is trimmed to the day', () => {
  assert.equal(invoicePdfParts(invoice, true).date, '2026-10-22');
});

/* ── THE TAX RATE: stored as a percent, printed as a fraction ────────────── */

test('the stored percent becomes the fraction the layout prints', () => {
  // The layout does `(taxRate * 100).toFixed(2)`. Passing 8.75 straight
  // through would print "875.00%" on an invoice sent to a customer.
  assert.equal(invoicePdfParts(invoice, true).taxRate, 0.0875);
});

test('no tax means no rate at all, not a zero percent line', () => {
  for (const r of [0, undefined, null, 'x', -1]) {
    assert.equal(invoicePdfParts({ ...invoice, tax_rate: r }, true).taxRate, undefined, String(r));
  }
});

/* ── visibility, and the arithmetic it must not break ────────────────────── */

test('the customer copy omits a hidden line', () => {
  const parts = invoicePdfParts(invoice, true);
  assert.ok(!JSON.stringify(parts).includes('Contingency'));
});

test('the office copy draws it, marked', () => {
  const parts = invoicePdfParts(invoice, false);
  const drawn = parts.phases.flatMap((p) => p.lines).map((l) => l.description);
  assert.ok(drawn.some((d) => /Contingency.*hidden from customer/.test(d)));
});

test('a phase subtotal counts the hidden line, so the sections still sum', () => {
  const parts = invoicePdfParts(invoice, true);
  const structural = parts.phases.find((p) => p.title === 'Structural')!;
  assert.equal(structural.subtotal, 4580, '1840 + 500 hidden + 2240');
  const drawnSum = structural.lines.reduce((a, l) => a + l.amount, 0);
  assert.equal(drawnSum, 4080, 'the drawn lines deliberately fall short');
});

test('the server’s phase_costs win over anything computed locally', () => {
  /**
   * The case this exists for: a customer's invoice has already had its
   * hidden lines removed server side, so there is nothing left locally from
   * which to work out what the phase truly cost.
   */
  const stripped = {
    ...invoice,
    line_items: invoice.line_items.filter((l: any) => l.visible !== false),
    phase_costs: { Structural: 4580, '': 90 },
  };
  const structural = invoicePdfParts(stripped, true).phases.find((p) => p.title === 'Structural')!;
  assert.equal(structural.subtotal, 4580, 'must use the server figure, not the 4080 it can see');
});

test('a phase whose every line is hidden still appears, at its true cost', () => {
  const allHidden = {
    ...invoice,
    line_items: [{ description: 'Skip', quantity: 2, unit_price: 450, amount: 900, phase: 'Strip out', visible: false }],
  };
  const parts = invoicePdfParts(allHidden, true);
  assert.equal(parts.showLines, false);
  assert.deepEqual(parts.phases.map((p) => p.title), ['Strip out']);
  assert.equal(parts.phases[0].subtotal, 900);
  assert.deepEqual(parts.phases[0].lines, []);
});

test('the phase duration comes across from the job’s steps', () => {
  assert.equal(invoicePdfParts(invoice, true).phases[0].duration, '4 days');
});

/* ── the balance note ────────────────────────────────────────────────────── */

test('nothing paid means no balance note, because it would repeat the total', () => {
  assert.equal(invoicePdfParts(invoice, true).notes, 'Due on completion of the structural phase.');
});

test('a part payment is stated, with what is left', () => {
  const parts = invoicePdfParts({ ...invoice, paid_amount: 2000, balance_due: 3078.63 }, true);
  assert.match(parts.notes!, /Paid to date \$2,000\.00/);
  assert.match(parts.notes!, /Balance due \$3,078\.63/);
  assert.match(parts.notes!, /^Due on completion/, 'the original note survives');
});

test('a missing balance is derived rather than printed as zero', () => {
  const parts = invoicePdfParts({ ...invoice, paid_amount: 1000, balance_due: undefined }, true);
  assert.match(parts.notes!, /Balance due \$4,078\.63/);
});

/* ── the totals pass through, never recomputed ───────────────────────────── */

test('the stored totals are printed, not re-derived from the drawn lines', () => {
  const parts = invoicePdfParts(invoice, true);
  assert.equal(parts.subtotal, 4670);
  assert.equal(parts.tax, 408.63);
  assert.equal(parts.total, 5078.63);
});

/* ── rubbish ─────────────────────────────────────────────────────────────── */

test('a malformed invoice still produces a drawable document', () => {
  for (const bad of [undefined, null, {}, 'nope', { line_items: 'no' }]) {
    const parts = invoicePdfParts(bad, true);
    assert.equal(parts.heading, 'Invoice');
    assert.deepEqual(parts.phases, []);
    assert.equal(parts.total, 0);
    assert.equal(parts.showLines, false);
  }
});

test('the date row says Due, not Valid until', () => {
  // The row is shared with the quote; the word is not. "Valid until" on an
  // invoice is the kind of wrong a customer reads twice and then rings about.
  assert.equal(invoicePdfParts(invoice, true).validUntilLabel, 'Due');
});
