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
  lineAmount, lineQty, lineRate, lineLabel, quoteLines,
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

/* ── the shapes quotes are actually stored in ────────────────────────────── */

/**
 * `lineAmount` was `qty * rate`, and no quote in the database has ever had
 * either field. Materials store `quantity`/`unitCost`, labour stores
 * `hours`/`hourlyRate`, and both carry `totalCost`. Every line of all nine
 * stored quotes therefore computed to zero — and since the footer sums the
 * same function, the document agreed with itself at $0.00 all the way down.
 * Checked against the live records on 2026-11-14.
 */
test('a material line is priced from quantity and unitCost', () => {
  assert.equal(lineAmount({ quantity: 5, unitCost: 8.4 } as any), 42);
  assert.equal(lineQty({ quantity: 5, unitCost: 8.4 } as any), 5);
  assert.equal(lineRate({ quantity: 5, unitCost: 8.4 } as any), 8.4);
});

test('a labour line is priced from hours and hourlyRate', () => {
  assert.equal(lineAmount({ hours: 8, hourlyRate: 57.5 } as any), 460);
  assert.equal(lineQty({ hours: 8, hourlyRate: 57.5 } as any), 8);
});

/**
 * Waste lives in the stored total and not in the unit price: two gallons at
 * $60 legitimately comes to $126. `quotePdfSelection` resolves it the same
 * way, which is what keeps this screen and the printed PDF in agreement.
 */
test('a stored total wins over quantity times rate', () => {
  assert.equal(lineAmount({ quantity: 2, unitCost: 60, totalCost: 126 } as any), 126);
});

test('the old qty/rate shape still works, since it is the declared interface', () => {
  assert.equal(lineAmount({ qty: 3, rate: 10 } as any), 30);
});

test('a line with nothing on it is worth nothing, not NaN', () => {
  assert.equal(lineAmount({} as any), 0);
  assert.equal(lineAmount({ quantity: 'x', unitCost: null } as any), 0);
});

/**
 * Q-2026-0002 end to end: nine materials and seven labour lines that the
 * stored subtotals reconcile with. Before this the whole document read $0.00.
 */
test('an estimator quote totals what its stored subtotals say', () => {
  const quote = {
    taxRate: 0,
    materials: [
      { name: '2x4 Lumber', quantity: 25, unitCost: 4.38, totalCost: 109.5 },
      { name: 'Plywood Sheets', quantity: 6, unitCost: 38.4, totalCost: 253.44 },
      { name: 'Drywall work', quantity: 13, unitCost: 18.13, totalCost: 235.69 },
      { name: 'LED Strip Lights', quantity: 30, unitCost: 21.25, totalCost: 637.5 },
      { name: 'Electrical Wire', quantity: 100, unitCost: 4.65, totalCost: 465.00000000000006 },
      { name: 'Hair Dryers', quantity: 3, unitCost: 202.5, totalCost: 607.5 },
      { name: 'Paint', quantity: 10, unitCost: 50.4, totalCost: 504 },
      { name: 'New Material', quantity: 2, unitCost: 24, totalCost: 48 },
      { name: 'Custom Benches', quantity: 3, unitCost: 350, totalCost: 1050 },
    ],
    labor: [
      { role: 'General Laborer', hours: 40, hourlyRate: 51.75, totalCost: 2070 },
      { role: 'Carpenter', hours: 30, hourlyRate: 80.5, totalCost: 2415 },
      { role: 'Licensed Electrician', hours: 24, hourlyRate: 115, totalCost: 2760 },
      { role: 'Painter', hours: 8, hourlyRate: 57.5, totalCost: 460 },
      { role: 'Cleanup Crew', hours: 6, hourlyRate: 51.75, totalCost: 310.5 },
      { role: 'New Labor Role', hours: 4, hourlyRate: 120, totalCost: 480 },
      { role: 'Bench install', hours: 4, hourlyRate: 65, totalCost: 260 },
    ],
    // The stale copy an earlier save left behind: 2x4s a month old at $3.75.
    items: [{ name: '2x4 Lumber', quantity: 40, unitCost: 3.75, totalCost: 165 }],
  } as any;

  assert.equal(quoteLines(quote).length, 16, 'materials and labour, not the stale items');
  assert.equal(Math.round(quoteTotals(quote).subtotal * 100) / 100, 12666.13);
});

/** A hand-built quote has no materials or labour, and items are all it has. */
test('a quote with only items still reads them', () => {
  const quote = { taxRate: 0, items: [{ quantity: 2, unitCost: 60, totalCost: 126 }] } as any;
  assert.equal(quoteLines(quote).length, 1);
  assert.equal(quoteTotals(quote).subtotal, 126);
});

test('labour rows are labelled by role rather than left blank', () => {
  assert.equal(lineLabel({ role: 'Carpenter' } as any), 'Carpenter');
  assert.equal(lineLabel({ name: '2x4 Lumber', description: 'framing' } as any), '2x4 Lumber');
  assert.equal(lineLabel({} as any), '—');
});

/** A credit still subtracts, whichever shape it arrived in. */
test('a credit subtracts from a real amount', () => {
  const quote = {
    taxRate: 0,
    items: [
      { quantity: 1, unitCost: 1000, totalCost: 1000 },
      { quantity: 1, unitCost: 250, totalCost: 250, kind: 'credit' },
    ],
  } as any;
  assert.equal(quoteTotals(quote).subtotal, 750);
});
