/**
 * A quote has ONE total, and every screen reads the same one.
 *
 * Eric, 2026-11-18: *"the view pdf should be created from the quote editor
 * and only show what i allow with correct totalls"*. Asked which of the two
 * totals his quote carried was real: *"14.435.81"*.
 *
 * THE DEFECT, WITH THE NUMBERS
 *
 * `quote:qt-1794354942724` — Jason's — stored both:
 *
 *     totalCost  14435.81   the PDF and the estimate email
 *     total      13359.79   the customer portal and the draft list
 *
 * Tax on that quote is zero, so they should be identical. They differed by
 * $1,076.02. The customer portal showed Jason a thousand dollars less than
 * the PDF sitting in his inbox.
 *
 * WHY IT LOOKED INTERMITTENT, AND WHY THE SEARCH KEPT LANDING ELSEWHERE
 *
 * Every other quote in the system has the pair in agreement, so the same
 * screens were right everywhere else. And the symptom — "the line items
 * don't add up to the total" — points at the lines, which were correct:
 * materials 2,943.20 and labour 6,917.50 are raw COST, scaled up by markup
 * to reach the printed total. That machinery worked. It was aimed at the
 * wrong target.
 *
 * Three separate fixes went into the LINES before anybody asked whether the
 * two totals matched each other.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quoteTotalOf, totalsDisagreeBy } from '../src/app/components/documents/quoteMath.ts';

/* ── one reader, one answer ──────────────────────────────────────────────── */

test('totalCost wins, because it is what the customer was sent', () => {
  // Jason's quote, exactly as stored.
  assert.equal(quoteTotalOf({ totalCost: 14435.81, total: 13359.79 }), 14435.81);
});

test('an older quote with no totalCost still has a value', () => {
  // Removing the fallback would zero these rather than fix anything.
  assert.equal(quoteTotalOf({ total: 9500 }), 9500);
  assert.equal(quoteTotalOf({ totalCost: 0, total: 9500 }), 9500, 'a zero totalCost must not win');
});

test('a quote with neither is zero, not NaN', () => {
  for (const doc of [{}, null, undefined, { totalCost: null, total: undefined }, { totalCost: 'abc' }]) {
    const v = quoteTotalOf(doc as any);
    assert.equal(Number.isFinite(v), true, `${JSON.stringify(doc)} gave a non-number`);
    assert.equal(v, 0);
  }
});

test('the agreeing case — every other quote in the system', () => {
  assert.equal(quoteTotalOf({ totalCost: 12666.13, total: 12666.13 }), 12666.13);
  assert.equal(totalsDisagreeBy({ totalCost: 12666.13, total: 12666.13 }), null);
});

/* ── and the disagreement is reportable rather than silent ───────────────── */

test('a quote carrying two different totals can be named as such', () => {
  assert.equal(totalsDisagreeBy({ totalCost: 14435.81, total: 13359.79 }), 1076.02);
});

/**
 * Nothing to compare is not a disagreement.
 *
 * An older quote with only `total`, or a draft with neither, must not be
 * reported as inconsistent — that turns a real signal into noise and the
 * next person stops reading it.
 */
test('a missing or zero figure is not a disagreement', () => {
  assert.equal(totalsDisagreeBy({ total: 9500 }), null);
  assert.equal(totalsDisagreeBy({ totalCost: 9500 }), null);
  assert.equal(totalsDisagreeBy({ totalCost: 0, total: 9500 }), null);
  assert.equal(totalsDisagreeBy({}), null);
  assert.equal(totalsDisagreeBy(null), null);
});

test('the gap is signed, so it says which way round', () => {
  assert.equal(totalsDisagreeBy({ totalCost: 100, total: 90 }), 10);
  assert.equal(totalsDisagreeBy({ totalCost: 90, total: 100 }), -10);
});

/* ── the call sites, at the source ───────────────────────────────────────── */

/**
 * The helper being right proves nothing about whether anybody uses it, and
 * the whole defect was in the using: two screens reading a different field
 * from the document the customer had been sent.
 */
test('the customer-facing screens read the one total', async () => {
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const root = join(import.meta.dirname, '..');

  for (const page of [
    'src/app/components/portals/CustomerPortalView.tsx',
    'src/app/components/quotes/WorkRequestQuoteDraft.tsx',
  ]) {
    const code = readFileSync(join(root, page), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      .replace(/^\s*\/\/.*$/gm, '');

    assert.match(code, /quoteTotalOf\(/, `${page} no longer reads the shared total`);
    assert.doesNotMatch(
      code, /money\(q\.total\)|quote\.total\s*\|\|/,
      `${page} is back on the raw .total field, which is the one that was $1,076 out on Jason's quote`,
    );
  }
});
