/**
 * Taking damage costs out of a deposit.
 *
 * Two refusals are the whole point of this file, and both are pinned here:
 *
 *   - an unreadable deposit does NOT become zero, because a zero deposit shows
 *     the entire cost as owed by the tenant
 *   - nothing totals while a chargeable area is unpriced, because "$0 deducted"
 *     reads as "nothing owed" and means the opposite
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDeposit, settleDeposit } from '../supabase/functions/server/depositMath.ts';

/* ── reading the field ───────────────────────────────────────────────────── */

test('the ordinary money shapes are read', () => {
  assert.equal(parseDeposit('1800').amount, 1800);
  assert.equal(parseDeposit('$1,800').amount, 1800);
  assert.equal(parseDeposit('1,800.00').amount, 1800);
  assert.equal(parseDeposit('$ 1 800').amount, 1800);
  assert.equal(parseDeposit('1800.50').amount, 1800.5);
  assert.equal(parseDeposit(1800).amount, 1800);
});

test('"one month" is refused rather than read as one dollar', () => {
  const d = parseDeposit('one month');
  assert.equal(d.readable, false);
  assert.equal(d.amount, null);
  assert.match(d.why, /not an amount/i);
});

test('"1 month rent" is refused, which is the dangerous one', () => {
  // Stripping the non-numerics leaves "1", and a one dollar deposit is a worse
  // answer than no answer.
  const d = parseDeposit('1 month rent');
  assert.equal(d.readable, false);
  assert.equal(d.amount, null);
});

test('an empty field says there is no deposit recorded', () => {
  for (const raw of ['', '   ', null, undefined]) {
    const d = parseDeposit(raw);
    assert.equal(d.readable, false, String(raw));
  }
  assert.match(parseDeposit('').why, /No security deposit is recorded/i);
});

test('an ambiguous European format is refused rather than guessed', () => {
  assert.equal(parseDeposit('1.800,00').readable, false);
});

test('fractions of a cent and negatives are refused', () => {
  assert.equal(parseDeposit('1800.555').readable, false);
  assert.equal(parseDeposit('-500').readable, false);
});

test('the refusal names what it could not read, so it can be fixed', () => {
  assert.match(parseDeposit('TBD').why, /"TBD"/);
});

/* ── nothing chargeable ──────────────────────────────────────────────────── */

test('no damage returns the deposit in full', () => {
  const s = settleDeposit('$1,800', []);
  assert.equal(s.status, 'ready');
  assert.equal(s.deductions, 0);
  assert.equal(s.returnedToTenant, 1800);
  assert.equal(s.owedByTenant, 0);
  assert.ok(s.notes.some((n) => /returned in full/i.test(n)));
});

/* ── the arithmetic ─────────────────────────────────────────────────────── */

test('deductions come off the deposit and the rest goes back', () => {
  const s = settleDeposit('1800', [
    { area: 'Flooring', cost: 820, quoteId: 'QT-1' },
    { area: 'Walls & Ceilings', cost: 310.5, quoteId: 'QT-1' },
  ]);
  assert.equal(s.status, 'ready');
  assert.equal(s.deductions, 1130.5);
  assert.equal(s.returnedToTenant, 669.5);
  assert.equal(s.owedByTenant, 0);
});

test('damage beyond the deposit is owed, not withheld twice', () => {
  const s = settleDeposit('1000', [{ area: 'Flooring', cost: 2500, quoteId: 'QT-1' }]);
  assert.equal(s.returnedToTenant, 0, 'never a negative return');
  assert.equal(s.owedByTenant, 1500);
  assert.ok(s.notes.some((n) => /exceeds the deposit/i.test(n)));
});

test('the arithmetic lands on the cent', () => {
  const s = settleDeposit('1000', [
    { area: 'A', cost: 333.33, quoteId: 'q' },
    { area: 'B', cost: 333.33, quoteId: 'q' },
    { area: 'C', cost: 333.33, quoteId: 'q' },
  ]);
  assert.equal(s.deductions, 999.99);
  assert.equal(s.returnedToTenant, 0.01);
});

/* ── the two refusals ────────────────────────────────────────────────────── */

test('an unreadable deposit blocks the arithmetic instead of becoming zero', () => {
  const s = settleDeposit('one month', [{ area: 'Flooring', cost: 820, quoteId: 'QT-1' }]);
  assert.equal(s.status, 'deposit_unreadable');
  assert.equal(s.deductions, null, 'not 820');
  assert.equal(s.returnedToTenant, null);
  assert.equal(s.owedByTenant, null, 'a zero deposit would have shown 820 owed by the tenant');
  assert.ok(s.notes.some((n) => /until the deposit is a figure/i.test(n)));
});

test('an unpriced chargeable area blocks the total', () => {
  const s = settleDeposit('1800', [
    { area: 'Flooring', cost: 820, quoteId: 'QT-1' },
    { area: 'Appliances', cost: null },
  ]);
  assert.equal(s.status, 'awaiting_pricing');
  assert.equal(s.deductions, null, '820 would read as the final figure');
  assert.equal(s.returnedToTenant, null);
  assert.deepEqual(s.unpriced, ['Appliances']);
  assert.ok(s.notes.some((n) => /would read as nothing owed/i.test(n)));
});

test('the unpriced areas are named, so it is obvious what is waiting', () => {
  const s = settleDeposit('1800', [
    { area: 'Flooring', cost: null },
    { area: 'Appliances', cost: null },
  ]);
  assert.ok(s.notes.some((n) => /Flooring, Appliances/.test(n)));
});

test('an unreadable deposit is reported ahead of unpriced lines, and both are listed', () => {
  const s = settleDeposit('TBD', [{ area: 'Flooring', cost: null }]);
  assert.equal(s.status, 'deposit_unreadable');
  assert.deepEqual(s.unpriced, ['Flooring'], 'still visible, so both get fixed in one pass');
});

/* ── provenance of each figure ───────────────────────────────────────────── */

test('a deduction with no quote behind it is flagged but not blocked', () => {
  const s = settleDeposit('1800', [{ area: 'Flooring', cost: 820 }]);
  assert.equal(s.status, 'ready', 'a figure can be right without a quote');
  assert.equal(s.deductions, 820);
  assert.ok(s.notes.some((n) => /not linked to a quote/i.test(n)));
});

test('and when every line is quoted, nothing is flagged', () => {
  const s = settleDeposit('1800', [{ area: 'Flooring', cost: 820, quoteId: 'QT-1' }]);
  assert.ok(!s.notes.some((n) => /not linked to a quote/i.test(n)));
});

test('the quote id travels onto the line so the report can name it', () => {
  const s = settleDeposit('1800', [{ area: 'Flooring', cost: 820, quoteId: 'QT-9' }]);
  assert.equal(s.lines[0].quoteId, 'QT-9');
});

/* ── the awkward shapes ──────────────────────────────────────────────────── */

test('a negative cost is treated as unpriced rather than as a credit', () => {
  const s = settleDeposit('1800', [{ area: 'Flooring', cost: -100 }]);
  assert.equal(s.status, 'awaiting_pricing');
  assert.deepEqual(s.unpriced, ['Flooring']);
});

test('a line with no area is dropped', () => {
  const s = settleDeposit('1800', [{ area: '  ', cost: 500 }] as any);
  assert.equal(s.lines.length, 0);
  assert.equal(s.deductions, 0);
});

test('a zero cost is a real price, not a missing one', () => {
  const s = settleDeposit('1800', [{ area: 'Flooring', cost: 0, quoteId: 'QT-1' }]);
  assert.equal(s.status, 'ready', 'quoted at nothing is an answer');
  assert.equal(s.returnedToTenant, 1800);
});

test('rubbish in does not throw', () => {
  for (const lines of [null, undefined, 'lots']) {
    const s = settleDeposit('1800', lines as any);
    assert.equal(s.status, 'ready', String(lines));
  }
});

test('the deposit as read is always on the result, even when it was refused', () => {
  const s = settleDeposit('one month', []);
  assert.equal(s.deposit.raw, 'one month');
  assert.equal(s.deposit.readable, false);
});
