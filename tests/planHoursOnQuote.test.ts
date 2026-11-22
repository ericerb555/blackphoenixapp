/**
 * Hours from a maintenance plan, spent against a quote.
 *
 * Eric, 2026-11-21: "we should be able to tie is all our dicounts and hours",
 * then "add pdf and hours".
 *
 * The banks were already real — `plan:` carries hours.included/used/
 * overageRate, `plan_usage:` logs each visit, `recordEntitlementEvent` keeps
 * the balance — and nothing connected them to a quote. A customer paying for
 * a plan with five hours in it got a quote charging for every hour of labour
 * on the job, and the hours sat unspent until somebody remembered them.
 *
 * Three decisions are being pinned here, because they are PRICING decisions
 * and the point of putting them in a pure module was so they could be stated
 * rather than buried:
 *
 *   what an hour is worth   this quote's own blended labour rate
 *   how many can be spent   no more than the bank holds, worth no more than
 *                           the labour on the quote
 *   when the bank moves     not here, and not when the quote is sent
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  applyPlanHours, quoteHourRate, planHoursDeduction, type PlanHourBank,
} from '../src/app/lib/planHoursOnQuote.ts';

/** Eric's own plan, as production stores it. */
const BANK: PlanHourBank = {
  planId: 'PLAN-MWI1FCC7-CX9H03',
  planName: 'Essential Care',
  hoursRemaining: 5,
  overageRate: 95,
};

test('AN HOUR IS WORTH WHAT THIS QUOTE BILLS AN HOUR AT', () => {
  // 8,000 of customer-priced labour across 80 hours is $100/hr, so an hour
  // off the plan cancels exactly one hour of the work being quoted.
  assert.equal(quoteHourRate(8000, 80), 100);
  const out = applyPlanHours({ bank: BANK, hours: 3, labourShown: 8000, labourHours: 80 });
  assert.equal(out?.rate, 100);
  assert.equal(out?.hours, 3);
  assert.equal(out?.amount, 300);
  assert.equal(out?.basis, 'quote-rate');
});

test('with no labour hours to divide by, the plan’s overage rate is used', () => {
  // What they would pay for an hour beyond the bank is the closest thing to
  // an agreed price for an hour. Never a guess, and never zero.
  const out = applyPlanHours({ bank: BANK, hours: 2, labourShown: 4000, labourHours: 0 });
  assert.equal(out?.rate, 95);
  assert.equal(out?.amount, 190);
  assert.equal(out?.basis, 'plan-overage-rate');
});

test('NO MORE HOURS THAN THE BANK HOLDS', () => {
  const out = applyPlanHours({ bank: BANK, hours: 12, labourShown: 20000, labourHours: 100 });
  assert.equal(out?.hours, 5, 'capped at the five left');
  assert.equal(out?.cappedBy, 'bank');
});

test('AND NEVER WORTH MORE THAN THE LABOUR ON THE QUOTE', () => {
  // The plan buys our time. A bank bigger than the job stops at the job
  // rather than starting to discount the lumber.
  const out = applyPlanHours({
    bank: { ...BANK, hoursRemaining: 40 },
    hours: 40,
    labourShown: 500,
    labourHours: 5, // $100/hr
  });
  assert.equal(out?.amount, 500, 'stops at the labour');
  assert.equal(out?.hours, 5);
  assert.equal(out?.cappedBy, 'labour');
});

test('an empty bank applies nothing at all', () => {
  assert.equal(applyPlanHours({ bank: { ...BANK, hoursRemaining: 0 }, hours: 2, labourShown: 8000, labourHours: 80 }), null);
});

test('asking for nothing returns null, not a zero-hour row', () => {
  // A stored `{ hours: 0 }` would put "0 hours from your plan" on a quote.
  for (const hours of [0, -1, NaN, undefined as any]) {
    assert.equal(applyPlanHours({ bank: BANK, hours, labourShown: 8000, labourHours: 80 }), null, String(hours));
  }
});

test('an hour that cannot be valued is not spent', () => {
  // No quote rate and no overage rate: spending an hour for nothing is worse
  // than not spending it, because the hour is gone either way.
  const out = applyPlanHours({
    bank: { ...BANK, overageRate: 0 }, hours: 2, labourShown: 0, labourHours: 0,
  });
  assert.equal(out, null);
});

test('a quote with no labour at all takes no hours', () => {
  const out = applyPlanHours({ bank: BANK, hours: 2, labourShown: 0, labourHours: 10 });
  assert.equal(out, null, 'nothing to cancel');
});

test('what is stored is read back coerced, never as NaN', () => {
  // A NaN here is a deduction of $NaN on a document somebody sends.
  assert.equal(planHoursDeduction({ planHours: { hours: 'two', amount: 190 } }), null);
  assert.equal(planHoursDeduction({ planHours: { hours: 2, amount: 'free' } }), null);
  assert.equal(planHoursDeduction({ planHours: null }), null);
  assert.equal(planHoursDeduction({}), null);
  const ok = planHoursDeduction({ planHours: { planName: 'Essential Care', hours: 2, rate: 95, amount: 190 } });
  assert.equal(ok?.amount, 190);
  assert.equal(ok?.planName, 'Essential Care');
});

/* ── where the rules are enforced ───────────────────────────────────────── */

test('THE BANK IS NOT DEBITED BY A QUOTE', () => {
  // A quote the customer never accepts must not spend their hours, and a
  // quote revised twice must not spend them twice. The balance moves when the
  // work is invoiced, through the log-hours route that already exists.
  const lib = readFileSync('src/app/lib/planHoursOnQuote.ts', 'utf8');
  assert.match(lib, /WHEN THE BANK IS DEBITED — NOT HERE/);
  assert.ok(!/log-hours/.test(lib.replace(/\/\*[\s\S]*?\*\//g, '')),
    'this module must not write the ledger');

  const editor = readFileSync('src/app/components/QuoteToContractEditor.tsx', 'utf8');
  const handler = editor.slice(editor.indexOf('const applyPlanHoursToQuote'));
  const body = handler.slice(0, handler.indexOf('\n  };'));
  assert.match(body, /persistQuotePatch\(\{ planHours: applied \}\)/, 'it stores an intention');
  assert.ok(!/log-hours/.test(body), 'and does not move the balance');
});

test('the stored field survives a save', () => {
  // quoteDoc is a whitelist; a field it does not name is dropped silently.
  const doc = readFileSync('supabase/functions/server/quoteDoc.ts', 'utf8');
  assert.match(doc, /planHours: input\?\.planHours && Number\(input\.planHours\.hours\) > 0/);
});

test('the customer is always told — hours are their property', () => {
  // Not behind a section switch, for the same reason credits are not.
  const view = readFileSync('supabase/functions/server/customerQuoteView.ts', 'utf8');
  assert.match(view, /planHours: quote\?\.planHours && num\(quote\.planHours\.hours\) > 0/);
  const block = view.slice(view.indexOf('planHours: quote?.planHours'));
  assert.ok(!/sections\.planHours/.test(block.slice(0, 400)), 'no switch gates it');
});

test('only an active plan lends hours', () => {
  // Drawing on a bank somebody has stopped paying for is the one way this
  // could cost money nobody agreed to.
  const server = readFileSync('supabase/functions/server/index.tsx', 'utf8');
  const route = server.slice(server.indexOf("app.get('/make-server-3eae23a6/plan-hours'"));
  const body = route.slice(0, route.indexOf('\n});'));
  assert.match(body, /plan\.status === 'active'/);
  assert.match(body, /Math\.max\(0, Math\.round\(\(included - used\) \* 100\) \/ 100\)/,
    'an over-drawn bank has nothing left to lend');
  assert.match(body, /Administrator access is required to read another account/,
    'an hour balance says what somebody is paying for');
});

test('the PDF draws the hours and takes them off the total', () => {
  const assemble = readFileSync('src/app/lib/quoteToPdfDocument.ts', 'utf8');
  assert.match(assemble, /planHours: planHoursDeduction\(quote\)/);
  assert.match(assemble, /- \(Number\(planHoursDeduction\(quote\)\?\.amount\) \|\| 0\)\)/);
  const layout = readFileSync('src/app/lib/services/quotePdfLayout.ts', 'utf8');
  assert.match(layout, /if \(data\.planHours && data\.planHours\.amount > 0\)/);
});

test('hours come off AFTER the percentage, against what is left', () => {
  // A percentage is a discount on what the work costs; an hour then buys an
  // hour of what remains. The other order discounts hours they already paid
  // for, handing back less than an hour per hour.
  const panel = readFileSync('src/app/components/quotes/QuoteDiscountPanel.tsx', 'utf8');
  assert.match(panel, /const labourAfterDiscount = Math\.max\(0, \(Number\(labourShown\) \|\| 0\) - amount\)/);
  assert.match(panel, /labourShown: labourAfterDiscount/);
});
