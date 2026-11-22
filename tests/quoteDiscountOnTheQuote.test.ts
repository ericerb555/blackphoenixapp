/**
 * A discount on the quote, with a switch — and one source of truth for it.
 *
 * Eric, 2026-11-21: "can we add a customer discount option on the quote editor
 * that will show on the quote with a toggle show and hide", and immediately
 * after: "we should be able to tie is all our dicounts and hours".
 *
 * WHY THERE IS NO `quote.discountPercent`
 *
 * A field on the quote would have been the short way and a second source of
 * truth. The machinery already exists and ties the sources together properly:
 *
 *   plan discount   from the tier the payment actually granted
 *   grants          an administrator's, scoped to a customer, a job or ONE
 *                   quote, each with a required reason
 *   resolveDiscount adds them, caps the total at 20% OF LABOUR, and reports
 *                   which parts made the number
 *
 * So "a customer discount on this quote" is a grant scoped to this quote. It
 * reaches the customer through the same resolver as everything else, which is
 * what stops a plan discount and a typed figure stacking unnoticed.
 *
 * THE SWITCH GOVERNS THE ROW, NEVER THE PRICE. A quote that charged the
 * discounted total while printing the list one would not add up — the defect
 * this codebase has chased more than any other. Hiding a discount is the same
 * distinction a hidden line item makes: charged, not itemised.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sectionsOf } from '../src/app/lib/quotePdfSelection.ts';
import {
  labourDiscountAmount, resolveDiscount, QUOTE_DISCOUNT_CAP_PERCENT,
} from '../supabase/functions/server/discounts.ts';

const panel = readFileSync('src/app/components/quotes/QuoteDiscountPanel.tsx', 'utf8');
const editor = readFileSync('src/app/components/QuoteToContractEditor.tsx', 'utf8');
const approval = readFileSync('src/app/pages/CustomerQuoteApproval.tsx', 'utf8');
const server = readFileSync('supabase/functions/server/index.tsx', 'utf8');
const view = readFileSync('supabase/functions/server/customerQuoteView.ts', 'utf8');
const doc = readFileSync('supabase/functions/server/quoteDoc.ts', 'utf8');

/* ── the switch ─────────────────────────────────────────────────────────── */

test('ABSENT MEANS SHOWN, like every other section switch', () => {
  assert.equal(sectionsOf({}).discount, true);
  assert.equal(sectionsOf({ customerSections: {} }).discount, true);
  assert.equal(sectionsOf({ customerSections: { discount: false } }).discount, false);
  assert.equal(sectionsOf({ customerSections: { discount: true } }).discount, true);
});

test('the three readers of the switch agree, word for word', () => {
  // The browser and Deno copies cannot import one another, so the predicate is
  // written three times and asserted identical. A switch that hid the saving
  // on one surface and showed it on another is worse than no switch.
  assert.match(doc, /discount: input\?\.customerSections\?\.discount !== false/);
  assert.match(view, /discount: s\?\.discount !== false/);
  assert.match(readFileSync('src/app/lib/quotePdfSelection.ts', 'utf8'),
    /discount: quote\?\.customerSections\?\.discount !== false/);
});

test('THE PRICE IS NOT THE SWITCH — the discount still comes down', () => {
  // Withholding the percent would leave the customer's page unable to work
  // out the net total, and a quote showing the list price while charging the
  // discounted one is the arithmetic hole this project has spent weeks on.
  const block = server.slice(server.indexOf('const discountItemised'));
  assert.match(block.slice(0, 600), /return c\.json\(\{ success: true, discount, discountItemised/);
  assert.match(server, /quote\?\.customerSections\?\.discount !== false/);
});

test('the customer page hides the row and keeps the maths', () => {
  assert.match(approval, /const showDiscountLine = discountPct > 0 && itemiseDiscount/);
  // The money still uses discountPct, not the display flag.
  assert.match(approval, /const discountAmount = labourDiscountAmount\(quote\?\.laborSubtotal, discountPct\)/);
  // Plan hours joined the same subtraction on 2026-11-21; what matters is
  // that neither deduction is conditional on the display flag.
  assert.match(approval, /const discountedTotal = Math\.max\(0,\s*\n?\s*\(quote\?\.totalCost \|\| 0\) - discountAmount/);
  assert.ok(
    !/discountedTotal = .*showDiscountLine/.test(approval),
    'the total must not depend on whether the row is shown',
  );
});

test('all three places the saving is spelled out obey the switch', () => {
  // The line, the struck-through list price, and the "you saved" note.
  assert.equal((approval.match(/\{showDiscountLine && \(/g) || []).length, 3);
});

/* ── tying the sources together ─────────────────────────────────────────── */

test('A QUOTE DISCOUNT IS A GRANT ON THAT QUOTE, not a new field', () => {
  assert.match(panel, /scope: 'quote', scopeId: quoteId/);
  assert.match(panel, /\/discount-grants/);
  assert.match(panel, /\/my-discount/, 'and the resolved figure comes from the one resolver');
  // No parallel field anywhere on the stored record.
  assert.ok(!/discountPercent/.test(doc), 'quoteDoc must not grow a second source of truth');
});

test('the plan and the grants add up, and the cap holds', () => {
  const now = new Date('2026-11-21T00:00:00Z');
  const resolved = resolveDiscount(
    10,
    [{ id: 'g1', percent: 15, scope: 'quote', scopeId: 'Q1', reason: 'Repeat customer', grantedBy: 'e@x', grantedAt: now.toISOString() }],
    { quoteId: 'Q1' },
    now,
  );
  assert.equal(resolved.requestedPercent, 25, 'additive, as "additional" plainly means');
  assert.equal(resolved.percent, QUOTE_DISCOUNT_CAP_PERCENT, 'and capped');
  assert.equal(resolved.capped, true);
  assert.equal(resolved.components.length, 2, 'the panel shows what it is made of');
});

test('the panel shows the components and the cap rather than one bare number', () => {
  // "What is this 20%?" is the question an owner asks, and the answer is the
  // reason somebody typed when they granted it.
  assert.match(panel, /resolved\.components\.map/);
  assert.match(panel, /resolved\?\.capped &&/);
  assert.match(panel, /c\.why/);
});

test('the money is computed with the same function the customer sees', () => {
  // Two different sums for one discount is how a quote and its approval page
  // came to disagree before.
  assert.match(panel, /labourDiscountAmount\(labourShown, pct\)/);
  assert.equal(labourDiscountAmount(10000, 15), 1500);
  assert.equal(labourDiscountAmount(10000, 0), 0);
});

test('LABOUR ONLY — materials are not discounted', () => {
  // Standing rule: "the discount only comes off labor, not materials."
  assert.match(panel, /Off labour only/);
  // A 10% discount on a job with 10,000 labour takes 1,000 — not 10% of the
  // whole contract.
  assert.equal(labourDiscountAmount(10000, 10), 1000);
});

test('a reason is required before anything is granted', () => {
  // Deliberate friction: 15% for a good reason and 15% by mistake look
  // identical in a number and different in a record.
  assert.match(panel, /Say why this discount is being given/);
  assert.match(readFileSync('supabase/functions/server/discount-grants.tsx', 'utf8'),
    /if \(!reason\) return c\.json/);
});

test('withdrawing keeps the history', () => {
  assert.match(panel, /Discount withdrawn\. The record of it stays\./);
  assert.match(panel, /method: 'DELETE'/);
});

test('a failed read is said out loud, not shown as 0%', () => {
  // "No discount" and "we could not find out" are different facts, and a
  // panel that renders the second as the first is how a subscriber silently
  // loses their rate.
  assert.match(panel, /Could not read the discount for this quote/);
});

test('the editor mounts it and owns the toggle', () => {
  assert.match(editor, /<QuoteDiscountPanel/);
  assert.match(editor, /onToggleItemised=\{\(\) => void toggleCustomerSection\('discount'\)\}/);
  assert.match(editor, /key === 'processDetail' \|\| key === 'paymentSchedule' \|\| key === 'discount'/,
    'two-state, like the other switches that have no middle');
  assert.match(editor, /labourShown=\{Number\(\(currentQuote as any\)\?\.laborSubtotal\) \|\| 0\}/,
    'and the percentage must divide into the labour the customer is shown');
});
