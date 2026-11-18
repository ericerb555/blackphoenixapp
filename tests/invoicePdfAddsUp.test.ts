/**
 * The INVOICE adds up too — the same assertion, on the other document.
 *
 * Eric, 2026-11-18: *"why is my pdf invoices still not matching my quote
 * editor page when i hit the view quote all line items and prices only and
 * they dont add up to the total? why is this happening"*.
 *
 * WHY IT KEPT HAPPENING AFTER THE QUOTE WAS FIXED
 *
 * There are two documents and only one was fixed. The quote editor draws
 * through `quoteToPdfDocument`, which `tests/quotePdfAddsUp.test.ts` has
 * guarded since the column last failed to reach the total. Invoices draw
 * through `invoicePdfParts` — a different file, with no such test.
 *
 * And the fix that made quotes add up never touched it. Commit 265154bc6,
 * "The markup goes into the line prices, so the quote adds up", changed
 * `quoteMarkup`, `quoteToPdfDocument`, `customerQuoteView` and
 * `quoteCustomerPrice`. Not one invoice file.
 *
 * THE SHAPE OF THE BUG, WHICH IS WHY A PART-TEST COULD NOT SEE IT
 *
 * `invoicePdfParts` builds the PHASES from the invoice's lines, and then
 * takes `subtotal`, `tax` and `total` straight off the stored record:
 *
 *     phases:   computed from selection.lines
 *     subtotal: Number(invoice?.subtotal)      ← stored
 *     total:    Number(invoice?.total_amount)  ← stored
 *
 * Two independent sources for one page. Every part can be correct and the
 * page still disagrees with itself, which is exactly what a reader adding up
 * the column discovers and no unit test on either part ever would.
 *
 * This asserts the only thing that matters to the person holding the paper:
 * the printed column reaches the printed total.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { invoicePdfParts } from '../src/app/lib/invoicePdfParts.ts';

const r2 = (n: number) => Math.round(n * 100) / 100;

const line = (description: string, phase: string, quantity: number, rate: number, extra: any = {}) => ({
  id: description,
  description,
  phase,
  quantity,
  rate,
  amount: r2(quantity * rate),
  ...extra,
});

/**
 * An invoice of the shape the app actually stores: snake_case money fields,
 * a tax rate as a PERCENT, lines carrying their own amount.
 */
function invoiceOf(lines: any[], over: any = {}) {
  const subtotal = r2(lines.reduce((s, l) => s + (Number(l.amount) || 0), 0));
  const taxRate = 8.75;
  const tax = r2(subtotal * (taxRate / 100));
  return {
    invoice_number: 'INV-20261118-0001',
    issue_date: '2026-11-18',
    status: 'sent',
    customer_name: 'Sarah',
    line_items: lines,
    subtotal,
    tax_rate: taxRate,
    tax_amount: tax,
    total_amount: r2(subtotal + tax),
    paid_amount: 0,
    ...over,
  };
}

const phaseSum = (doc: any) =>
  r2((doc.phases || []).reduce((s: number, p: any) => s + (Number(p.subtotal) || 0), 0));

const lineSum = (doc: any) =>
  r2((doc.phases || []).reduce(
    (s: number, p: any) => s + (p.lines || []).reduce((t: number, l: any) => t + (Number(l.amount) || 0), 0),
    0,
  ));

/**
 * THE ASSERTION ERIC MAKES, on an invoice.
 *
 * The phases must reach the SUBTOTAL rather than the total, because tax is
 * printed as its own row beneath them — an invoice whose phases equalled the
 * total would be charging tax twice.
 */
function assertAddsUp(doc: any, label: string) {
  const phases = phaseSum(doc);
  const lines = lineSum(doc);
  const subtotal = r2(Number(doc.subtotal) || 0);
  const tax = r2(Number(doc.tax) || 0);
  const total = r2(Number(doc.total) || 0);

  assert.equal(phases, subtotal,
    `${label}: phase subtotals (${phases}) must come to the printed subtotal (${subtotal})`);
  assert.equal(r2(subtotal + tax), total,
    `${label}: subtotal ${subtotal} + tax ${tax} must come to the printed total (${total})`);
  assert.ok(lines <= phases + 0.01,
    `${label}: drawn lines (${lines}) exceed the phase subtotals (${phases})`);
}

/* ── the ordinary case ───────────────────────────────────────────────────── */

test('an ordinary invoice adds up, office copy', () => {
  const inv = invoiceOf([
    line('Demolition and haul-away', 'Demolition', 1, 2400),
    line('Framing labour', 'Framing', 32, 85),
    line('Drywall and finish', 'Drywall', 1, 1850),
  ]);
  assertAddsUp(invoicePdfParts(inv, false), 'office');
});

test('an ordinary invoice adds up, customer copy', () => {
  const inv = invoiceOf([
    line('Demolition and haul-away', 'Demolition', 1, 2400),
    line('Framing labour', 'Framing', 32, 85),
  ]);
  assertAddsUp(invoicePdfParts(inv, true), 'customer');
});

/* ── the case the whole area exists for ──────────────────────────────────── */

/**
 * Hiding withholds DETAIL and keeps the MONEY. Eric's rule, stated to me
 * three times: *"things can be hidden but totals can not"*, and *"we can
 * hidden things but the totals stay as part of the quote"*.
 */
test('a hidden line keeps its money in the column', () => {
  const inv = invoiceOf([
    line('Demolition and haul-away', 'Demolition', 1, 2400),
    line('Supplier markup', 'Demolition', 1, 600, { visible: false }),
    line('Framing labour', 'Framing', 32, 85),
  ]);
  const doc = invoicePdfParts(inv, true);
  assertAddsUp(doc, 'customer with a hidden line');

  // And the hidden one is not readable as itself.
  const text = JSON.stringify(doc.phases);
  assert.doesNotMatch(text, /Supplier markup/i, 'a hidden line is still named on the customer copy');
});

test('a whole phase hidden still carries its money', () => {
  const inv = invoiceOf([
    line('Demolition and haul-away', 'Demolition', 1, 2400),
    line('Permit expediting', 'Permits', 1, 900, { visible: false }),
  ]);
  assertAddsUp(invoicePdfParts(inv, true), 'customer with a hidden phase');
});

/* ── the stored-versus-computed split, which is the actual defect ────────── */

/**
 * THE DEFECT THIS FILE WAS WRITTEN TO CATCH.
 *
 * `amountOf` in `invoiceLineSelection` — which builds the phase subtotals —
 * computed quantity × `unit_price` and nothing else, while the renderer
 * printed the line's own `amount` where it had one. Two readings of one
 * line's money, agreeing on an ordinary line and parting company on any line
 * that carries an amount without a matching `unit_price`:
 *
 *   - a flat fee
 *   - a line adjusted after it was priced
 *   - a line converted from a quote, which stores `rate` rather than
 *     `unit_price`
 *   - every withheld line, which by design has an amount and no quantity or
 *     rate at all
 *
 * On those the page printed the real money on the row and counted ZERO in the
 * phase subtotal: a column of correct prices under a subtotal that excludes
 * them. Reproduced before the fix — four phases, every subtotal 0.00, against
 * a printed subtotal of 6,970.
 *
 * Checked against production first: all five live invoices store a subtotal
 * equal to the sum of their lines, so this was latent on today's data rather
 * than active — and would have bitten the first flat-fee or converted line.
 */
test('a line priced by amount alone still reaches the phase subtotal', () => {
  const inv = invoiceOf([
    // Priced the ordinary way.
    line('Framing labour', 'Framing', 32, 85),
    // A flat fee: an amount, no unit price at all. This is the one that
    // used to print $900.00 on the row and add 0 to the phase.
    { id: 'permit', description: 'Permit expediting', phase: 'Permits', amount: 900 },
    // Converted from a quote, which spells it `rate`.
    { id: 'haul', description: 'Haul-away', phase: 'Demolition', quantity: 2, rate: 300, amount: 600 },
  ]);
  const doc = invoicePdfParts(inv, true);

  assertAddsUp(doc, 'amount-only and rate-spelled lines');

  // And each one actually landed in a phase rather than vanishing.
  assert.equal(phaseSum(doc), r2(32 * 85 + 900 + 600), 'a priced line is missing from the subtotals');
});
