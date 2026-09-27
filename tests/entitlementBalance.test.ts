/**
 * Rebuilding a plan's balance from its ledger.
 *
 * This is the second of the two guards: the first stops one event being applied
 * twice, and this catches anything that changed a balance without going through
 * the ledger at all. Both exist so hours and money cannot quietly go missing.
 *
 * The replay has to agree with the writer in `entitlements.tsx` exactly,
 * including the awkward part — hours are consumed against the balance as it
 * stood at that moment — so most of what follows pins that behaviour.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  recomputeBalance, compareBalances, emptyBalance,
} from '../supabase/functions/server/entitlementBalance.ts';

const at = (n: number) => `2026-09-${String(10 + n).padStart(2, '0')}T12:00:00.000Z`;

test('no entries is a clean zero, not a NaN', () => {
  const b = recomputeBalance([]);
  assert.deepEqual(b, emptyBalance());
  assert.deepEqual(recomputeBalance(null), emptyBalance());
});

/* ── hours ───────────────────────────────────────────────────────────────── */

test('granted hours accumulate and remain', () => {
  const b = recomputeBalance([
    { hoursDelta: 10, createdAt: at(1) },
    { hoursDelta: 5, createdAt: at(2) },
  ]);
  assert.equal(b.hoursGranted, 15);
  assert.equal(b.hoursRemaining, 15);
  assert.equal(b.hoursUsed, 0);
});

test('used hours come off the remaining balance', () => {
  const b = recomputeBalance([
    { hoursDelta: 10, createdAt: at(1) },
    { hoursDelta: -4, createdAt: at(2) },
  ]);
  assert.equal(b.hoursUsed, 4);
  assert.equal(b.hoursRemaining, 6);
  assert.equal(b.overageHours, 0);
});

test('using more than remains becomes overage, not a negative balance', () => {
  const b = recomputeBalance([
    { hoursDelta: 10, createdAt: at(1) },
    { hoursDelta: -14, createdAt: at(2) },
  ]);
  assert.equal(b.hoursUsed, 10, 'only what was there could be used');
  assert.equal(b.overageHours, 4, 'the rest is billable overage');
  assert.equal(b.hoursRemaining, 0);
});

test('overage stays overage even when hours are granted afterwards', () => {
  const b = recomputeBalance([
    { hoursDelta: 5, createdAt: at(1) },
    { hoursDelta: -8, createdAt: at(2) },   // 3 into overage, and billed as such
    { hoursDelta: 10, createdAt: at(3) },   // next month's allowance
  ]);
  assert.equal(b.overageHours, 3,
    'the customer was told they were over at the time; a later grant does not rewrite that');
  assert.equal(b.hoursRemaining, 10);
  assert.equal(b.hoursUsed, 5);
});

test('entries are replayed oldest first regardless of the order given', () => {
  const inOrder = recomputeBalance([
    { hoursDelta: 10, createdAt: at(1) },
    { hoursDelta: -12, createdAt: at(2) },
  ]);
  const shuffled = recomputeBalance([
    { hoursDelta: -12, createdAt: at(2) },
    { hoursDelta: 10, createdAt: at(1) },
  ]);
  assert.deepEqual(shuffled, inOrder,
    'a ledger read back out of order must not produce a different balance');
});

/* ── money ───────────────────────────────────────────────────────────────── */

test('payments and refunds are counted against their own source type', () => {
  const b = recomputeBalance([
    { sourceType: 'payment', amountDelta: 500, createdAt: at(1) },
    { sourceType: 'refund', amountDelta: -120, createdAt: at(2) },
    { sourceType: 'invoice', amountDelta: 999, createdAt: at(3) },
  ]);
  assert.equal(b.amountPaid, 500);
  assert.equal(b.amountRefunded, 120, 'a refund is recorded positive however its delta was signed');
  assert.equal(b.amountPaid + b.amountRefunded, 620, 'the invoice event moved no money');
});

/* ── credits, which is the gift card half ────────────────────────────────── */

test('credits granted and redeemed leave what is left on the card', () => {
  const b = recomputeBalance([
    { creditDelta: 250, createdAt: at(1) },
    { creditDelta: -100, createdAt: at(2) },
  ]);
  assert.equal(b.creditsGranted, 250);
  assert.equal(b.creditsRedeemed, 100);
  assert.equal(b.creditsRemaining, 150);
});

test('hours and credits are separate columns of the same account', () => {
  const b = recomputeBalance([
    { hoursDelta: 8, creditDelta: 100, createdAt: at(1) },
    { hoursDelta: -2, creditDelta: -25, createdAt: at(2) },
  ]);
  assert.equal(b.hoursRemaining, 6);
  assert.equal(b.creditsRemaining, 75);
});

/* ── features ────────────────────────────────────────────────────────────── */

test('a feature with no quantity counts as one', () => {
  const b = recomputeBalance([
    { feature: 'render', createdAt: at(1) },
    { feature: 'render', featureQuantity: 3, createdAt: at(2) },
  ]);
  assert.equal(b.features.render, 4);
});

/* ── drift, which is the whole point ─────────────────────────────────────── */

test('a balance that matches its ledger reports no drift', () => {
  const entries = [{ hoursDelta: 10, createdAt: at(1) }, { hoursDelta: -3, createdAt: at(2) }];
  const fromLedger = recomputeBalance(entries);
  assert.deepEqual(compareBalances(fromLedger, fromLedger), []);
});

test('hours changed without a ledger entry are caught', () => {
  const entries = [{ hoursDelta: 10, createdAt: at(1) }];
  const fromLedger = recomputeBalance(entries);
  // Somebody bumped plan.hours.used directly, the way the old routes did.
  const stored = { ...fromLedger, hoursUsed: 4, hoursRemaining: 6 };
  const drift = compareBalances(stored, fromLedger);
  const fields = drift.map(d => d.field).sort();
  assert.deepEqual(fields, ['hoursRemaining', 'hoursUsed']);
  assert.equal(drift.find(d => d.field === 'hoursUsed')!.difference, 4);
});

test('a missing stored balance reads as zero against the ledger', () => {
  const fromLedger = recomputeBalance([{ hoursDelta: 6, createdAt: at(1) }]);
  const drift = compareBalances(null, fromLedger);
  assert.ok(drift.some(d => d.field === 'hoursGranted' && d.fromLedger === 6));
});

test('floating point addition alone is not reported as drift', () => {
  const fromLedger = recomputeBalance([
    { hoursDelta: 0.1, createdAt: at(1) },
    { hoursDelta: 0.2, createdAt: at(2) },
  ]);
  assert.deepEqual(compareBalances({ ...fromLedger, hoursGranted: 0.3 }, fromLedger), [],
    '0.1 + 0.2 is not 0.3 in floating point, and that is not a missing hour');
});

test('a real disagreement of a penny is still reported', () => {
  const fromLedger = recomputeBalance([{ sourceType: 'payment', amountDelta: 100, createdAt: at(1) }]);
  const drift = compareBalances({ ...fromLedger, amountPaid: 100.5 }, fromLedger);
  assert.equal(drift.length, 1);
  assert.equal(drift[0].field, 'amountPaid');
});
