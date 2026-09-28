/**
 * What a quote adds up to.
 *
 * This is the figure a customer reads, agrees to, and is later billed against,
 * so the arithmetic is pinned rather than trusted. Two rules matter most and
 * neither is obvious from reading the component:
 *
 *   - a CREDIT subtracts. It is modelled as `kind: 'credit'` rather than a
 *     negative rate precisely so it reads as a credit a year later instead of
 *     looking like a typo — which means every sum must honour the flag, not
 *     the sign.
 *   - the total is RECOMPUTED from the lines, never taken from the stored
 *     `total` field. A document whose total disagrees with its own lines is
 *     arguing with itself in front of a customer, and the lines are the half
 *     they can check.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  quoteTotals, quoteToPDFData, signed, isCredit,
} from '../src/app/components/documents/quoteMath.ts';

const charge = (qty: number, rate: number, over = {}) => ({ description: 'x', qty, rate, ...over });

/* ── the sums ────────────────────────────────────────────────────────────── */

test('a quote with no lines is zero, not NaN', () => {
  const t = quoteTotals({});
  assert.deepEqual([t.subtotal, t.tax, t.total], [0, 0, 0]);
});

test('lines multiply quantity by rate and add up', () => {
  const t = quoteTotals({ items: [charge(16, 75), charge(1, 420)] });
  assert.equal(t.subtotal, 1620);
  assert.equal(t.total, 1620);
});

test('a credit subtracts rather than adding', () => {
  const t = quoteTotals({ items: [charge(10, 100), charge(1, 240, { kind: 'credit' })] });
  assert.equal(t.subtotal, 760,
    'the homeowner supplied their own flooring, so the quote gives it back');
});

test('a credit is recognised by its flag, not by a negative rate', () => {
  assert.equal(signed({ qty: 1, rate: 240, kind: 'credit' }), -240);
  assert.equal(signed({ qty: 1, rate: 240 }), 240);
  assert.ok(isCredit({ kind: 'credit' }));
  assert.ok(!isCredit({ kind: 'charge' }));
  assert.ok(!isCredit({}), 'a line with no kind is a charge');
});

/* ── tax ─────────────────────────────────────────────────────────────────── */

test('tax applies to the taxable lines only', () => {
  const t = quoteTotals({
    taxRate: 10,
    items: [charge(1, 1000), charge(1, 500, { taxable: false })],
  });
  assert.equal(t.subtotal, 1500);
  assert.equal(t.tax, 100, 'only the $1,000 line is taxable');
  assert.equal(t.total, 1600);
});

test('a line with no taxable flag is taxable', () => {
  assert.equal(quoteTotals({ taxRate: 10, items: [charge(1, 1000)] }).tax, 100);
});

test('a credit reduces the taxable base too', () => {
  const t = quoteTotals({
    taxRate: 10,
    items: [charge(1, 1000), charge(1, 200, { kind: 'credit' })],
  });
  assert.equal(t.tax, 80, 'tax is charged on what is actually owed, not the gross');
});

test('no tax rate means no tax', () => {
  assert.equal(quoteTotals({ items: [charge(1, 1000)] }).tax, 0);
});

/* ── the stored total is not trusted ─────────────────────────────────────── */

test('a stored total that disagrees with the lines is ignored', () => {
  const t = quoteTotals({ items: [charge(1, 100)], total: 99999 });
  assert.equal(t.total, 100,
    'the lines are what the customer can check, so the lines decide');
});

/* ── rubbish does not produce rubbish ────────────────────────────────────── */

test('missing quantities and rates count as zero', () => {
  const t = quoteTotals({ items: [{ description: 'no numbers' }, charge(2, 50)] });
  assert.equal(t.subtotal, 100);
});

test('a non-array items field does not throw', () => {
  assert.equal(quoteTotals({ items: undefined }).total, 0);
  assert.equal(quoteTotals({ items: null }).total, 0);
});

/* ── what the PDF is handed ──────────────────────────────────────────────── */

test('the PDF payload carries the same totals as the layout', () => {
  const doc = { items: [charge(10, 100), charge(1, 240, { kind: 'credit' })], taxRate: 10 };
  const pdf = quoteToPDFData(doc);
  const totals = quoteTotals(doc);
  assert.equal(pdf.subtotal, totals.subtotal);
  assert.equal(pdf.tax, totals.tax);
  assert.equal(pdf.total, totals.total,
    'a printout whose total differs from the screen it came from is the failure this prevents');
});

test('a credit is marked in the PDF description, since the table has no column for it', () => {
  const pdf = quoteToPDFData({ items: [charge(1, 240, { kind: 'credit', description: 'Flooring' })] });
  assert.match(pdf.items[0].description, /credit/i,
    'rendered as a plain charge, a credit shows the customer the opposite of what was agreed');
  assert.equal(pdf.items[0].amount, -240);
});

test('a quote with no expiry says so rather than printing an empty date', () => {
  assert.equal(quoteToPDFData({ items: [] }).dueDate, 'On acceptance');
});

test('the number falls back to the id, so a draft still identifies itself', () => {
  assert.equal(quoteToPDFData({ id: 'qt-123', items: [] }).invoiceNumber, 'qt-123');
});

/* ── what must never reach the customer ──────────────────────────────────── */

test('subcontractor costs and markup are not in the PDF payload', () => {
  const pdf = quoteToPDFData({
    items: [charge(1, 5000)],
    // What the trade quoted us, and what we added. Present on real records.
    subQuotes: [{ id: 's1', subName: 'Ace', baseAmount: 2400, markupPct: 35, total: 3240 }],
  } as any);
  const serialised = JSON.stringify(pdf);
  assert.ok(!serialised.includes('2400'), 'the raw trade price is the company margin, visible');
  assert.ok(!serialised.includes('markupPct'), 'and so is the markup');
  assert.equal(pdf.items.length, 1, 'only the lines the customer agreed to');
});
