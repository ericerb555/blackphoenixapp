/**
 * One real job, quote through to invoice.
 *
 * The case Eric described: a homeowner buys their own flooring, we install it,
 * and they are credited for what they bought. Every number below can be
 * checked by hand, which is the point — this is the arithmetic that reaches a
 * customer, and until now the only way to see it was to click through the app
 * signed in and hope.
 *
 * The job:
 *
 *   Underlayment      40 sq yd @ $12.50   =  $500.00   taxable
 *   Trim & fixings     1 lot   @ $180.00  =  $180.00   taxable
 *   Fitting           16 hrs   @ $85.00   = $1,360.00  NOT taxable
 *   Credit: their own flooring            − $1,240.00  taxable
 *
 *   Materials sold        680.00
 *   Less their flooring −1,240.00  → taxable base floors at 0
 *   Labour              1,360.00
 *   Subtotal              800.00
 *   Tax at 8%               0.00
 *   Total                 800.00
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  invoiceLinesFromQuote, invoiceAmountFromQuote, invoiceTotals,
} from '../src/app/lib/quoteToInvoice.ts';

const job = {
  taxRate: 0.08,
  totalCost: 800,
  materials: [
    { name: 'Underlayment', unit: 'sq yd', quantity: 40, unitCost: 12.5 },
    { name: 'Trim & fixings', quantity: 1, unitCost: 180 },
  ],
  labor: [
    { role: 'Flooring fitter', hours: 16, hourlyRate: 85 },
  ],
  credits: [
    {
      description: 'Customer-supplied flooring',
      amount: 1240,
      reason: 'Bought their own at Home Depot',
    },
  ],
};

/* ── the lines ───────────────────────────────────────────────────────────── */

test('every part of the quote reaches the invoice as its own line', () => {
  const lines = invoiceLinesFromQuote(job);
  assert.equal(lines.length, 4, 'two materials, one labour, one credit');
  assert.deepEqual(lines.map(l => l.line_number), [1, 2, 3, 4]);
});

test('the material lines read as the customer saw them on the quote', () => {
  const [underlay, trim] = invoiceLinesFromQuote(job);
  assert.equal(underlay.description, 'Underlayment (sq yd)');
  assert.equal(underlay.quantity, 40);
  assert.equal(underlay.unit_price, 12.5);
  assert.equal(trim.description, 'Trim & fixings');
});

test('materials are taxable and labour is not', () => {
  const lines = invoiceLinesFromQuote(job);
  assert.ok(lines[0].is_taxable && lines[1].is_taxable, 'materials carry sales tax');
  assert.equal(lines[2].is_taxable, false,
    'labour is a service — the default is taxable, so forgetting charges tax on it');
  assert.match(lines[2].description, /^Labor —/);
});

test('the credit arrives negative, and taxable, so it takes its tax with it', () => {
  const credit = invoiceLinesFromQuote(job)[3];
  assert.equal(credit.unit_price, -1240);
  assert.ok(credit.is_taxable,
    'material leaving the bill takes its tax with it; otherwise we tax what we no longer sell');
  assert.match(credit.description, /Customer-supplied flooring/);
});

/* ── the money ───────────────────────────────────────────────────────────── */

test('the totals come out to the figures on the quote', () => {
  const totals = invoiceTotals(invoiceLinesFromQuote(job), job.taxRate);
  assert.equal(totals.subtotal, 800, '680 material − 1240 credit + 1360 labour');
  assert.equal(totals.taxableSubtotal, 0, 'they supplied more material than we did');
  assert.equal(totals.tax, 0);
  assert.equal(totals.total, 800);
});

test('the same job without the credit is taxed on its materials only', () => {
  const totals = invoiceTotals(
    invoiceLinesFromQuote({ ...job, credits: [] }),
    job.taxRate,
  );
  assert.equal(totals.subtotal, 2040, '680 material + 1360 labour');
  assert.equal(totals.taxableSubtotal, 680, 'not 2040 — labour is not taxed');
  assert.equal(totals.tax, 54.4, '8% of 680');
  assert.equal(totals.total, 2094.4);
});

test('the old bug would have taxed the labour too, and it does not', () => {
  const totals = invoiceTotals(invoiceLinesFromQuote({ ...job, credits: [] }), 0.08);
  assert.notEqual(totals.tax, 163.2, '8% of 2040 — $108.80 the customer never owed');
});

test('a rate written as a percent gives the same answer as a fraction', () => {
  const lines = invoiceLinesFromQuote({ ...job, credits: [] });
  assert.equal(invoiceTotals(lines, 8).tax, invoiceTotals(lines, 0.08).tax);
});

/* ── what the invoice is for ─────────────────────────────────────────────── */

test('the invoice bills the quoted price, never the budget', () => {
  assert.equal(invoiceAmountFromQuote(job, 500000), 800,
    'estimatedValue is what they said they could spend, not what they agreed to pay');
});

test('with no quote at all, the budget is the only figure there is', () => {
  assert.equal(invoiceAmountFromQuote(null, 1200), 1200);
  assert.equal(invoiceAmountFromQuote({ materials: [] }, 1200), 1200);
});

/* ── and the shapes that turn up in real stored data ─────────────────────── */

test('the older field names are read too', () => {
  const older = {
    materials: [{ description: 'Sheet goods', quantity: 2, unitPrice: 45 }],
    laborItems: [{ description: 'Install', hours: 4, unitPrice: 90 }],
  };
  const lines = invoiceLinesFromQuote(older);
  assert.equal(lines[0].unit_price, 45);
  assert.equal(lines[1].unit_price, 90);
  assert.equal(lines[1].is_taxable, false);
});

test('an empty quote produces no lines rather than a phantom one', () => {
  assert.deepEqual(invoiceLinesFromQuote({}), []);
  assert.deepEqual(invoiceLinesFromQuote(null), []);
});

test('a missing quantity bills one, not zero', () => {
  const lines = invoiceLinesFromQuote({ materials: [{ name: 'Delivery', unitCost: 75 }] });
  assert.equal(lines[0].quantity, 1, 'defaulting to zero would silently drop the charge');
  assert.equal(invoiceTotals(lines, 0).subtotal, 75);
});
