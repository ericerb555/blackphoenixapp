/**
 * What a quote comes to, and which stored field is believed.
 *
 * WHAT WAS WRONG
 *
 * A quote carries several fields that all look like its total, and only some
 * of them are maintained. `totalCost` is recomputed by the editor on every
 * edit; `total` is written once and then drifts as the lines change. Read in
 * the wrong order, the drifted one wins.
 *
 * MEASURED 2026-11-11 on the three priced quotes in production — every
 * `totalCost` reconciled to its own line items, and not one `total` did:
 *
 *   Q-2026-0002   totalCost 12,978.98   total 11,193.40
 *   Q-2026-0003   totalCost 18,954.13   total 24,978.17
 *   Q-2026-0004   totalCost 11,508.66   total 11,301.55
 *
 * `handleConvertToContract` read `total || grandTotal || totalCost`, so
 * converting Q-2026-0003 would have written a contract for $24,978.17 against
 * a job quoted at $18,954.13. These assertions exist so that ordering cannot
 * come back, in any of the four places that used to each have their own.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quoteTotal, quoteTotalOr } from '../supabase/functions/server/quoteTotal.ts';
import { contractTotalOf } from '../src/app/lib/quoteToSchedule.ts';

/* ── the ordering, which is the whole point ──────────────────────────────── */

test('the signed total beats everything, because it is what was agreed', () => {
  assert.equal(quoteTotal({ agreedTotal: 11750, totalCost: 12500, total: 24978.17 }), 11750);
});

test('the maintained total beats the legacy one', () => {
  // Q-2026-0003, exactly as stored.
  assert.equal(quoteTotal({ totalCost: 18954.13, total: 24978.17 }), 18954.13);
  // And the other direction, so this is about WHICH FIELD, not which is larger.
  assert.equal(quoteTotal({ totalCost: 12978.98, total: 11193.4 }), 12978.98);
});

test('the legacy field is still read when it is all there is', () => {
  assert.equal(quoteTotal({ total: 9000 }), 9000);
  assert.equal(quoteTotal({ grandTotal: 9000 }), 9000);
  assert.equal(quoteTotal({ quoteTotal: 9000 }), 9000);
});

test('a quote with no total at all is summed from its parts', () => {
  assert.equal(
    quoteTotal({ materialsSubtotal: 2335.33, laborSubtotal: 8336.5, taxAmount: 186.83 }),
    10858.66,
  );
});

test('nothing to work from is null, never zero', () => {
  assert.equal(quoteTotal({}), null);
  assert.equal(quoteTotal(null), null);
  assert.equal(quoteTotal({ totalCost: 0, total: 0 }), null);
  // A caller with somewhere safe to land says so explicitly.
  assert.equal(quoteTotalOr({}, 0), 0);
  assert.equal(quoteTotalOr({ totalCost: 500 }), 500);
});

test('a stored zero does not beat a real figure beneath it', () => {
  // The shape that once built a schedule of £0.00 draws.
  assert.equal(quoteTotal({ totalCost: 0, grandTotal: 7400 }), 7400);
});

/* ── the schedule has to agree with it ───────────────────────────────────── */

test('the schedule apportions the same figure the contract is written for', () => {
  const quote = { totalCost: 18954.13, total: 24978.17 };
  assert.equal(contractTotalOf(quote), quoteTotal(quote));
});

test('and both prefer the agreed total once it exists', () => {
  const signed = { agreedTotal: 11750, totalCost: 12500, total: 24978.17 };
  assert.equal(contractTotalOf(signed), 11750);
  assert.equal(quoteTotal(signed), 11750);
});
