/**
 * What a quote or invoice adds up to when the customer supplied some of it.
 *
 * WHY THESE ASSERTIONS
 *
 * Eric's case is a homeowner who bought their own flooring and wants crediting
 * for it. Every way of getting that wrong produces a document that looks
 * perfectly normal and is wrong about money:
 *
 *   — a credit that adds instead of subtracting
 *   — tax charged on the gross, so they pay tax on somebody else's purchase
 *   — a negative rate typed into a charge, silently becoming a credit
 *   — a negative total quietly clamped to zero, hiding that we owe them
 *   — a card charged the gross because the credit lived only on the paper
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  totalsFor, lineAmountCents, lineDisplayCents, isCredit, payableCents,
} from '../supabase/functions/server/lineTotals.ts';

const install = { description: 'Flooring installation', qty: 1, rate: 3200 };
const flooring = {
  description: 'Customer-supplied flooring',
  qty: 1, rate: 1240, kind: 'credit' as const,
  reason: 'Bought their own at Home Depot',
};

/* ── the case this was built for ─────────────────────────────────────────── */

test('a credit comes off the total', () => {
  const t = totalsFor([install, flooring], 0);
  assert.equal(t.charges, 3200);
  assert.equal(t.credits, 1240);
  assert.equal(t.subtotal, 1960);
  assert.equal(t.total, 1960);
});

test('the credit stays visible rather than being netted away', () => {
  const t = totalsFor([install, flooring], 0);
  assert.equal(t.charges, 3200, 'the work is still shown at what it cost');
  assert.ok(t.credits > 0, 'and what was given back is its own number');
});

test('tax is charged on the net, not on material we did not sell them', () => {
  const t = totalsFor([install, flooring], 10);
  assert.equal(t.subtotal, 1960);
  assert.equal(t.tax, 196, 'ten per cent of 1960, not of 3200');
  assert.equal(t.total, 2156);
});

/* ── a credit cannot be created, or destroyed, by a typo ─────────────────── */

test('a negative rate on a charge does not turn it into a credit', () => {
  const t = totalsFor([{ description: 'Oops', qty: 1, rate: -500 }], 0);
  assert.equal(t.charges, 500);
  assert.equal(t.credits, 0);
  assert.equal(t.subtotal, 500, 'a fat-fingered minus must not give money away');
});

test('a negative rate on a credit does not cancel it back into a charge', () => {
  const t = totalsFor([{ qty: 1, rate: -1240, kind: 'credit' }], 0);
  assert.equal(t.credits, 1240);
  assert.equal(t.subtotal, -1240);
});

test('the kind decides the sign, and nothing else does', () => {
  assert.equal(lineAmountCents({ qty: 1, rate: 100 }), 10000);
  assert.equal(lineAmountCents({ qty: 1, rate: 100, kind: 'credit' }), -10000);
  assert.ok(isCredit({ kind: 'credit' }));
  assert.ok(!isCredit({}));
  assert.ok(!isCredit(null));
});

test('a line reads as a positive figure on the document either way', () => {
  assert.equal(lineDisplayCents({ qty: 2, rate: 50, kind: 'credit' }), 10000);
  assert.equal(lineDisplayCents({ qty: 2, rate: 50 }), 10000);
});

/* ── quantities and pennies ──────────────────────────────────────────────── */

test('a credit can have a quantity like anything else', () => {
  const t = totalsFor([{ qty: 3, rate: 19.99, kind: 'credit' }], 0);
  assert.equal(t.credits, 59.97);
});

test('a missing quantity is one, not zero', () => {
  assert.equal(lineAmountCents({ rate: 250 }), 25000,
    'defaulting to zero would silently drop the line');
});

test('percentages do not drift a penny at a time', () => {
  const t = totalsFor([{ qty: 3, rate: 33.33 }], 8.25);
  assert.equal(t.subtotal, 99.99);
  assert.equal(t.tax, 8.25);
  assert.equal(t.total, 108.24);
});

/* ── when we end up owing them ───────────────────────────────────────────── */

test('credits larger than the work produce a negative total, not a zero', () => {
  const t = totalsFor([{ qty: 1, rate: 200 }, { qty: 1, rate: 950, kind: 'credit' }], 0);
  assert.equal(t.total, -750);
  assert.ok(t.inCustomersFavour, 'clamping this to zero would hide that we owe them');
});

test('nothing is charged to a card when the balance is theirs', () => {
  const t = totalsFor([{ qty: 1, rate: 200 }, { qty: 1, rate: 950, kind: 'credit' }], 0);
  assert.equal(payableCents(t), 0);
});

test('what is charged to a card is the net, never the gross', () => {
  const t = totalsFor([install, flooring], 10);
  assert.equal(payableCents(t), 215600,
    'Stripe has no negative line items, so the credit has to be inside the amount');
});

/* ── and the empty cases ─────────────────────────────────────────────────── */

test('no lines is zero, not a crash', () => {
  const t = totalsFor([], 8);
  assert.equal(t.total, 0);
  assert.ok(!t.inCustomersFavour);
  assert.equal(totalsFor(null, 8).total, 0);
});

test('a credit alone is a document entirely in their favour', () => {
  const t = totalsFor([flooring], 0);
  assert.equal(t.total, -1240);
  assert.ok(t.inCustomersFavour);
});
