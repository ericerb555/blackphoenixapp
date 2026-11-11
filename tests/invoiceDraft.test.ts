/**
 * The sum on an invoice.
 *
 * This arithmetic spent its life inside a thirteen-thousand-line .tsx that the
 * test runner cannot load, which meant the one calculation deciding what a
 * customer is asked to pay was the one calculation nobody could test. It is a
 * module now because the assistant can propose an invoice, and two
 * implementations of a total is how one of them ends up taxing a discount.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  money, normaliseLineItems, invoiceTotals, invoiceNumberFor, buildInvoiceRecord,
} from '../supabase/functions/server/invoiceDraft.ts';

const recipient = {
  customerEmail: 'jane@example.com',
  customerName: 'Jane Smith',
  recipientPortal: null,
  paymentRail: 'services',
};

/* ── money ───────────────────────────────────────────────────────────── */

test('money rounds to the cent and refuses to be NaN', () => {
  assert.equal(money(10.005), 10.01);
  assert.equal(money('12.3'), 12.3);
  assert.equal(money(undefined), 0);
  assert.equal(money('not a number'), 0);
  assert.equal(money(Infinity), 0);
});

/* ── line items ──────────────────────────────────────────────────────── */

test('an amount is derived when only quantity and price are given', () => {
  const [item] = normaliseLineItems([{ description: 'Framing', quantity: 3, unit_price: 150 }]);
  assert.equal(item.amount, 450);
  assert.equal(item.line_number, 1);
});

test('a supplied amount is kept, because the screen sends amounts', () => {
  const [item] = normaliseLineItems([{ quantity: 3, unit_price: 150, amount: 400 }]);
  assert.equal(item.amount, 400);
});

test('both spellings of unit price are understood', () => {
  const [a] = normaliseLineItems([{ quantity: 2, unitPrice: 25 }]);
  assert.equal(a.amount, 50);
});

test('line numbers are assigned in order and existing ones survive', () => {
  const items = normaliseLineItems([{ quantity: 1, unit_price: 1 }, { quantity: 1, unit_price: 1, line_number: 7 }]);
  assert.deepEqual(items.map((i) => i.line_number), [1, 7]);
});

test('anything that is not an array of items is no items, not a crash', () => {
  assert.deepEqual(normaliseLineItems(undefined), []);
  assert.deepEqual(normaliseLineItems('x'), []);
});

/* ── the sum ─────────────────────────────────────────────────────────── */

test('tax is charged on the subtotal, and the discount comes off after', () => {
  // A real decision, not an accident: discounting before tax and after it
  // produce different invoices, and the difference is one a customer notices.
  const items = normaliseLineItems([{ quantity: 1, unit_price: 1000 }]);
  const t = invoiceTotals(items, { tax_rate: 10, discount_amount: 100 });
  assert.equal(t.subtotal, 1000);
  assert.equal(t.taxAmount, 100);
  assert.equal(t.total, 1000);
});

test('no tax rate means no tax, not a default', () => {
  const items = normaliseLineItems([{ quantity: 1, unit_price: 500 }]);
  assert.equal(invoiceTotals(items, {}).taxAmount, 0);
  assert.equal(invoiceTotals(items, {}).total, 500);
});

test('the number is sortable by date and carries the id', () => {
  assert.equal(invoiceNumberFor('abcdef12-3456', '2026-11-10T22:00:00.000Z'), 'INV-20261110-ABCDEF');
});

/* ── the record ──────────────────────────────────────────────────────── */

test('the line items win over a posted total, and the disagreement is reported', () => {
  const built = buildInvoiceRecord(
    { line_items: [{ quantity: 1, unit_price: 500 }], total_amount: 50 },
    { recipient, createdBy: 'eric@example.com' },
  );
  assert.equal(built.record.total_amount, 500);
  assert.equal(built.postedTotalIgnored, 50);
});

test('a total that agrees is not reported as ignored', () => {
  const built = buildInvoiceRecord(
    { line_items: [{ quantity: 2, unit_price: 100 }], total_amount: 200 },
    { recipient, createdBy: 'eric@example.com' },
  );
  assert.equal(built.postedTotalIgnored, null);
});

test('no recipient email forces a draft, however the caller asked', () => {
  // An invoice with nobody on it cannot be issued, and storing it as pending
  // would file it in the chase-the-customer pile for a customer who is not there.
  const built = buildInvoiceRecord(
    { line_items: [{ quantity: 1, unit_price: 10 }], status: 'pending', is_draft: false },
    { recipient: { ...recipient, customerEmail: '' }, createdBy: 'eric@example.com' },
  );
  assert.equal(built.record.is_draft, true);
  assert.equal(built.record.status, 'draft');
  assert.equal(built.record.issuedAt, null);
});

test('a draft carries no issued date, and an issued invoice does', () => {
  const draft = buildInvoiceRecord({ is_draft: true, line_items: [] }, { recipient, createdBy: 'e@x.com' });
  assert.equal(draft.record.issuedAt, null);
  const issued = buildInvoiceRecord({ status: 'pending', line_items: [] }, { recipient, createdBy: 'e@x.com' });
  assert.ok(issued.record.issuedAt);
  assert.equal(issued.record.status, 'pending');
});

test('both spellings of every recipient field are written', () => {
  const { record } = buildInvoiceRecord({ line_items: [] }, { recipient, createdBy: 'e@x.com' });
  for (const key of ['customerEmail', 'customer_email', 'clientEmail', 'client_email']) {
    assert.equal(record[key], 'jane@example.com', `${key} was not written`);
  }
  assert.equal(record.customerName, 'Jane Smith');
  assert.equal(record.customer_name, 'Jane Smith');
});

test('the balance due is the total less what has been paid', () => {
  const { record } = buildInvoiceRecord(
    { line_items: [{ quantity: 1, unit_price: 1000 }], paid_amount: 250 },
    { recipient, createdBy: 'e@x.com' },
  );
  assert.equal(record.total_amount, 1000);
  assert.equal(record.balance_due, 750);
});

test('the creator is who the caller says, never the body', () => {
  // Attribution is the one field a proposal must not be able to set about itself.
  const { record } = buildInvoiceRecord(
    { line_items: [], createdBy: 'someone.else@example.com' },
    { recipient, createdBy: 'eric@example.com' },
  );
  assert.equal(record.createdBy, 'eric@example.com');
});
