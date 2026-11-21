/**
 * The payment schedule on the quote, and the switch that hides it.
 *
 * Eric, 2026-11-21: "can we add the payment schedule to the quote please maybe
 * give me the option to add or hide".
 *
 * WHAT WAS ALREADY THERE, AND WHY IT NEVER REACHED ANYBODY
 *
 * The editor has built a real schedule for a while — a deposit and a draw per
 * phase, summing to the contract total to the cent through integer-cent
 * arithmetic — and stored it on the quote. Three things then dropped it:
 *
 *   quoteToPdfDocument     never read it, so no PDF ever drew it
 *   customerQuoteView      never named it, so the share link never sent it
 *   CustomerQuoteApproval  computed a deposit and a balance of its own
 *
 * So the schedule somebody agreed internally and the payment terms the
 * customer actually read were two different documents.
 *
 * THE RULE LIVES IN TWO PLACES AND HAS TO AGREE
 *
 * `quotePdfSelection.ts` runs in the browser and `customerQuoteView.ts` runs
 * in Deno, which cannot import it. A switch that hid the schedule on the PDF
 * while the share link still carried it would be exactly the failure
 * `customerQuoteView`'s own header warns about — "a hidden field is not a
 * check" — so the last test here asserts the two predicates are the same.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { selectPaymentSchedule, sectionsOf } from '../src/app/lib/quotePdfSelection.ts';
import { buildPaymentSchedule, scheduleTotal } from '../src/app/lib/paymentSchedule.ts';

/** A quote with a real schedule on it, built the way the editor builds one. */
function quoteWithSchedule(total = 21371.55) {
  const paymentSchedule = buildPaymentSchedule({
    phases: [
      { title: 'Demolition', subtotal: 3200 },
      { title: 'Structural', subtotal: 8400 },
      { title: 'Finishes', subtotal: 6100 },
    ],
    total,
    depositRate: 0.3,
  });
  return { totalCost: total, paymentSchedule };
}

test('THE DRAWS REACH THE CUSTOMER COPY, which they never did before', () => {
  const sel = selectPaymentSchedule(quoteWithSchedule(), true);
  assert.ok(sel.draws.length >= 4, `expected a deposit and three phases, got ${sel.draws.length}`);
  assert.match(sel.draws[0].label, /deposit/i);
  assert.equal(sel.withheld, false);
});

test('and they still sum to the contract total, to the cent', () => {
  // The one rule paymentSchedule.ts says cannot bend. A schedule summing to
  // $21,371.54 against a $21,371.55 contract is the error a customer finds.
  const quote = quoteWithSchedule(21371.55);
  const sel = selectPaymentSchedule(quote, true);
  assert.equal(sel.total, 21371.55);
  assert.equal(sel.total, scheduleTotal(quote.paymentSchedule));
});

test('THE SWITCH HIDES IT — nothing at all, not a redacted row', () => {
  // Unlike a hidden line item there is no money to account for: the draws sum
  // to a total that is already printed above them.
  const quote = { ...quoteWithSchedule(), customerSections: { paymentSchedule: false } };
  const sel = selectPaymentSchedule(quote, true);
  assert.deepEqual(sel.draws, []);
  assert.equal(sel.total, 0);
});

test('the office copy still shows it, and says it is being withheld', () => {
  // "No schedule on this quote" and "switched off for the customer" are
  // different facts, and the person checking the document needs both.
  const quote = { ...quoteWithSchedule(), customerSections: { paymentSchedule: false } };
  const internal = selectPaymentSchedule(quote, false);
  assert.ok(internal.draws.length >= 4);
  assert.equal(internal.withheld, false, 'the internal copy is not itself withheld');

  const customer = selectPaymentSchedule(quote, true);
  assert.equal(customer.withheld, true, 'the customer copy reports that it was held back');
});

test('a quote with no schedule reports nothing withheld', () => {
  // Otherwise the office copy prints "not shown to the customer" on every
  // quote that simply has no schedule, which is most of them.
  const sel = selectPaymentSchedule({ customerSections: { paymentSchedule: false } }, true);
  assert.deepEqual(sel.draws, []);
  assert.equal(sel.withheld, false);
});

test('ABSENT MEANS SHOWN, like every other section switch', () => {
  // Defaulting to hidden would mean the switch had to be found before the
  // feature did anything.
  assert.equal(sectionsOf({}).paymentSchedule, true);
  assert.equal(sectionsOf({ customerSections: {} }).paymentSchedule, true);
  assert.equal(sectionsOf({ customerSections: { paymentSchedule: true } }).paymentSchedule, true);
  assert.equal(sectionsOf({ customerSections: { paymentSchedule: false } }).paymentSchedule, false);
});

test('only an explicit false hides it — not a truthy-looking value', () => {
  for (const odd of [0, '', 'off', null, undefined]) {
    const shown = sectionsOf({ customerSections: { paymentSchedule: odd } }).paymentSchedule;
    assert.equal(shown, true, `${JSON.stringify(odd)} must not hide the schedule`);
  }
});

test('the internal arithmetic of the deposit does not travel', () => {
  // `phaseValue` and `depositCredit` are for whoever built the split. On a
  // customer's document they are numbers that sum to nothing being asked for.
  const sel = selectPaymentSchedule(quoteWithSchedule(), true);
  for (const draw of sel.draws) {
    assert.deepEqual(
      Object.keys(draw).sort(),
      ['amount', 'label', 'status', 'trigger'],
      'only four fields may reach the customer',
    );
  }
});

test('a malformed draw is dropped rather than printed as $NaN', () => {
  const sel = selectPaymentSchedule({
    paymentSchedule: [
      { label: 'Good', amount: 100, trigger: 'On signing', status: 'pending' },
      { label: 'Bad', amount: 'later' },
      { label: 'Also bad', amount: null },
    ],
  }, true);
  assert.equal(sel.draws.length, 1);
  assert.equal(sel.total, 100);
});

test('an unlabelled draw falls back to its phase, then to "Payment"', () => {
  const sel = selectPaymentSchedule({
    paymentSchedule: [
      { phase: 'Structural', amount: 10 },
      { amount: 20 },
    ],
  }, true);
  assert.equal(sel.draws[0].label, 'Structural');
  assert.equal(sel.draws[1].label, 'Payment');
});

test('a status the page cannot render is clamped to pending', () => {
  const sel = selectPaymentSchedule({
    paymentSchedule: [{ label: 'X', amount: 1, status: 'disputed' }],
  }, true);
  assert.equal(sel.draws[0].status, 'pending');
});

/* ── the two copies of the rule ─────────────────────────────────────────── */

test('THE SERVER APPLIES THE SAME SWITCH, in its own copy of the rule', () => {
  // The browser filter alone would be worthless: `/quotes/by-token/:token`
  // sends the quote, and a field removed only in the renderer has already
  // been delivered.
  const server = readFileSync('supabase/functions/server/customerQuoteView.ts', 'utf8');
  assert.match(server, /paymentSchedule: s\?\.paymentSchedule !== false/,
    'customerQuoteView must read the same switch, the same way');
  assert.match(server, /paymentSchedule: sections\.paymentSchedule/,
    'and must gate the field it sends on it');

  const browser = readFileSync('src/app/lib/quotePdfSelection.ts', 'utf8');
  assert.match(browser, /paymentSchedule: quote\?\.customerSections\?\.paymentSchedule !== false/,
    'and the browser must use the identical predicate');
});

test('the server sends the same four fields, and no identifiers', () => {
  const server = readFileSync('supabase/functions/server/customerQuoteView.ts', 'utf8');
  const block = server.slice(server.indexOf('paymentSchedule: sections.paymentSchedule'));
  const sent = block.slice(0, block.indexOf('    : [],'));
  for (const field of ['label:', 'trigger:', 'amount:', 'status:']) {
    assert.ok(sent.includes(field), `${field} must travel`);
  }
  for (const internal of ['invoiceId', 'phaseValue', 'depositCredit']) {
    assert.ok(!sent.includes(internal), `${internal} must not travel`);
  }
});

test('the stored record keeps the switch, or it would not survive a save', () => {
  // `quoteDoc.ts` is a whitelist: a field it does not name is dropped
  // silently on the way in. That has cost this project seven times.
  const doc = readFileSync('supabase/functions/server/quoteDoc.ts', 'utf8');
  assert.match(doc, /paymentSchedule: input\?\.customerSections\?\.paymentSchedule !== false/);
});

/* ── what the document draws ────────────────────────────────────────────── */

test('the PDF draws the schedule below the totals and above the notes', () => {
  // It answers the figure above it, and it is a term of the deal rather than
  // an aside, so it sits between the two.
  const layout = readFileSync('src/app/lib/services/quotePdfLayout.ts', 'utf8');
  const schedule = layout.indexOf("doc.text('PAYMENT SCHEDULE'");
  const notes = layout.indexOf("['Notes', data.notes]");
  assert.ok(schedule > 0 && notes > 0, 'both blocks must exist');
  assert.ok(schedule < notes, 'the schedule is drawn before the notes');
});

test('A SCHEDULE THAT MISSES THE TOTAL SAYS SO on the document', () => {
  // The draws are a stored commitment and are deliberately not rescaled when
  // a line is unticked, so they can drift. Printing two numbers and hoping is
  // how a customer finds the gap.
  const layout = readFileSync('src/app/lib/services/quotePdfLayout.ts', 'utf8');
  assert.match(layout, /schedule\.total - data\.total/);
  assert.match(layout, /differ from the quote total by/);
  assert.match(layout, /Rebalance the schedule in the editor/);
});

test('the approval page prefers the real schedule and keeps the fallback', () => {
  // Never both: the real draws with a synthetic deposit underneath would be
  // two different answers to the same question.
  const page = readFileSync('src/app/pages/CustomerQuoteApproval.tsx', 'utf8');
  assert.match(page, /const paymentSchedule: PaymentScheduleItem\[\] = storedDraws\.length/);
  assert.match(page, /Deposit — secures your materials/, 'the fallback must survive');
});

test('the editor offers the switch, with no middle state', () => {
  const editor = readFileSync('src/app/components/QuoteToContractEditor.tsx', 'utf8');
  assert.match(editor, /\['paymentSchedule', 'Payment schedule',/);
  assert.match(editor, /key !== 'processDetail' && key !== 'paymentSchedule'/,
    'there is no half a draw, so it does not cycle through three states');
  assert.match(editor, /key === 'processDetail' \|\| key === 'paymentSchedule'/,
    'and the handler must flip it rather than cycling it');
});

test('the portal document shows it too, through the same selector', () => {
  // `QuoteDocument` is what a customer reads in their portal. A schedule on
  // the PDF and not on the portal page would be two different quotes.
  const doc = readFileSync('src/app/components/documents/QuoteDocument.tsx', 'utf8');
  assert.match(doc, /selectPaymentSchedule\(quote, true\)/,
    'the same switch must decide, not a second rule');
  assert.match(doc, /Payment schedule/);
  assert.match(doc, /schedule\.total - total/, 'and it must flag a schedule that misses the total');
});
