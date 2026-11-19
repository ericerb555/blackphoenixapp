/**
 * A hidden row prints nothing, is still paid for, and the column still foots.
 *
 * Eric, 2026-11-19: *"i do not want additional work under the line item to
 * show up on the quote i just want it added into the total it should always
 * be hidden"*.
 *
 * WHY THIS IS A SHARED HELPER AND NOT TWO IMPLEMENTATIONS
 *
 * The customer sees this quote twice: as the PDF, built by
 * `quoteToPdfDocument`, and as the web approval page, built by
 * `customerQuoteView` on the server. Both had their own copy of the
 * withheld-row rule, so the PDF stopped drawing "Additional work" and the
 * page a customer actually approves from went on drawing it.
 *
 * Two implementations of one rule is the same fault as the CRM key spelled in
 * three files, and it fails the same way: the half nobody is looking at.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pricesAbsorbingWithheld, spreadCustomerPrices, customerPricingOf,
} from '../supabase/functions/server/quoteCustomerPrice.ts';

const r2 = (n: number) => Math.round(n * 100) / 100;
const sum = (xs: number[]) => r2(xs.reduce((a, b) => a + b, 0));
const flat = { overhead: 0, profit: 0, contingency: 0, markup: 0, factor: 1 };
const marked = customerPricingOf({ overheadPercent: 0.1, profitPercent: 0.1, contingencyPercent: 0.05 });

/* ── nothing hidden: unchanged ───────────────────────────────────────────── */

test('with nothing hidden it prices exactly as before', () => {
  const rows = [
    { amount: 100, phase: 'A', visible: true },
    { amount: 250, phase: 'A', visible: true },
    { amount: 400, phase: 'B', visible: true },
  ];
  assert.deepEqual(
    pricesAbsorbingWithheld(rows, flat),
    spreadCustomerPrices(rows.map((r) => r.amount), flat),
  );
});

/* ── the withheld row is zero, and its phase-mates carry it ─────────────── */

test('a hidden row prices to zero and its own phase absorbs it', () => {
  const out = pricesAbsorbingWithheld([
    { amount: 100, phase: 'A', visible: false },
    { amount: 300, phase: 'A', visible: true },
    { amount: 600, phase: 'B', visible: true },
  ], flat);

  assert.equal(out[0], 0, 'the hidden row carries nothing, so the caller draws nothing');
  assert.equal(out[1], 400, 'its phase-mate carries both');
  assert.equal(out[2], 600, 'another phase is untouched');
  assert.equal(sum(out), 1000, 'and the section still comes to what it did');
});

test('several hidden rows in one phase all land on its visible rows', () => {
  const out = pricesAbsorbingWithheld([
    { amount: 50, phase: 'A', visible: false },
    { amount: 50, phase: 'A', visible: false },
    { amount: 100, phase: 'A', visible: true },
    { amount: 100, phase: 'A', visible: true },
  ], flat);

  assert.deepEqual(out, [0, 0, 150, 150]);
  assert.equal(sum(out), 300);
});

/* ── a phase with nothing visible has to spill ───────────────────────────── */

/**
 * Its money cannot stay in the phase — there is no row there to hold it — so
 * it spreads across the section's other visible rows. The phase total then
 * exceeds the rows shown under it, which is unavoidable and is the lesser
 * failure: a section that does not add up is arithmetic a customer can check,
 * and a phase with nothing under it is not.
 */
test('a wholly hidden phase spills onto the rest of the section', () => {
  const out = pricesAbsorbingWithheld([
    { amount: 200, phase: 'A', visible: false },
    { amount: 400, phase: 'B', visible: true },
    { amount: 400, phase: 'C', visible: true },
  ], flat);

  assert.equal(out[0], 0);
  assert.equal(sum(out), 1000, 'the section still foots, which is the point');
  assert.equal(out[1], 500);
  assert.equal(out[2], 500);
});

test('a section with nothing visible prices to all zeroes', () => {
  const out = pricesAbsorbingWithheld([
    { amount: 200, phase: 'A', visible: false },
    { amount: 300, phase: 'B', visible: false },
  ], flat);

  assert.deepEqual(out, [0, 0], 'no rows are drawn; the subtotal stands on its own');
});

/* ── with markup on, and to the penny ────────────────────────────────────── */

test('the markup is applied and the column still lands exactly', () => {
  const rows = [
    { amount: 2943.2, phase: 'Fit out', visible: false },
    { amount: 6917.5, phase: 'Fit out', visible: true },
  ];
  const out = pricesAbsorbingWithheld(rows, marked);
  const whole = sum(spreadCustomerPrices(rows.map((r) => r.amount), marked));

  assert.equal(out[0], 0);
  assert.equal(out[1], whole, 'the one visible row carries the priced total of both');
  assert.equal(whole, r2((2943.2 + 6917.5) * 1.25));
});

/**
 * THE PENNY CASE, WHICH IS WHY `allocate` IS USED RATHER THAN A MULTIPLY.
 *
 * Three rows that do not divide cleanly must still come to the section total
 * exactly — a cent out is the same sentence from the customer as a pound out.
 */
test('an awkward split still foots to the cent', () => {
  for (const amounts of [
    [10, 10, 10.01], [33.33, 33.33, 33.34], [0.01, 0.01, 0.01], [1, 2, 997],
  ]) {
    const rows = amounts.map((amount, i) => ({ amount, phase: 'A', visible: i !== 0 }));
    const out = pricesAbsorbingWithheld(rows, marked);
    const whole = sum(spreadCustomerPrices(amounts, marked));
    assert.equal(out[0], 0, `${amounts} drew the hidden row`);
    assert.equal(sum(out), whole, `${amounts} did not foot`);
  }
});

/* ── the shapes that should not crash ────────────────────────────────────── */

test('empty, blank phases and junk amounts', () => {
  assert.deepEqual(pricesAbsorbingWithheld([], flat), []);

  // Rows with no phase group together rather than each becoming its own.
  const out = pricesAbsorbingWithheld([
    { amount: 100, visible: false },
    { amount: 100, phase: '', visible: true },
    { amount: 100, phase: '   ', visible: true },
  ], flat);
  assert.equal(out[0], 0);
  assert.equal(sum(out), 300, 'the blank-phase rows absorbed it between them');

  const junk = pricesAbsorbingWithheld([
    { amount: 'abc', phase: 'A', visible: false },
    { amount: null, phase: 'A', visible: true },
  ], flat);
  assert.ok(junk.every((n) => Number.isFinite(n)), 'no NaN reached the page');
  assert.equal(sum(junk), 0);
});

/* ── the call site, at the source ────────────────────────────────────────── */

/**
 * The helper being right proves nothing about whether the web view uses it,
 * and the defect was that the PDF and the web view each had their own copy of
 * this rule.
 */
test('the customer web view draws no withheld rows', async () => {
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const code = readFileSync(
    join(import.meta.dirname, '..', 'supabase/functions/server/customerQuoteView.ts'), 'utf8',
  )
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  assert.match(code, /pricesAbsorbingWithheld\(/, 'the web view is not using the shared rule');
  assert.doesNotMatch(
    code, /detailWithheld:\s*true/,
    'the web view is emitting withheld rows again — the customer sees "Additional work" on the page they approve from',
  );
});
