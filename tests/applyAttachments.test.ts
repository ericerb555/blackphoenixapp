/**
 * What a bill comes to once discounts, gift cards and banked hours are applied.
 *
 * This decides what a customer is charged, so every rule below is a number
 * somebody could check by hand. The two that matter most are the order —
 * percentages before money — and the refusal to spend more of a card or more
 * hours than the bill actually needs.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAttachments } from '../src/app/lib/applyAttachments.ts';

/** The job used through most of this file: 1,000 of work, 8% tax on it all. */
const base = { subtotal: 1000, taxableBase: 1000, taxRate: 0.08 };

test('nothing applied is the bill as it stands', () => {
  const r = applyAttachments({ ...base, attachments: [] });
  assert.equal(r.discountAmount, 0);
  assert.equal(r.taxAmount, 80);
  assert.equal(r.total, 1080);
  assert.equal(r.balanceDue, 1080);
});

/* ── discounts ───────────────────────────────────────────────────────────── */

test('a discount comes off the price and off the tax on it', () => {
  const r = applyAttachments({ ...base, attachments: [{ kind: 'grant', percent: 10 }] });
  assert.equal(r.discountAmount, 100);
  assert.equal(r.taxAmount, 72, 'tax on 900, not on 1000 — tax on a price nobody paid is tax nobody owes');
  assert.equal(r.total, 972);
});

test('percentages from different sources add up', () => {
  const r = applyAttachments({
    ...base,
    attachments: [{ kind: 'grant', percent: 10 }, { kind: 'promotion', percent: 5 }],
  });
  assert.equal(r.discountPercent, 15);
  assert.equal(r.discountAmount, 150);
});

test('the cap bites, and says what it bit', () => {
  const r = applyAttachments({
    ...base,
    capPercent: 20,
    attachments: [{ kind: 'grant', percent: 15 }, { kind: 'promotion', percent: 10 }],
  });
  assert.equal(r.requestedPercent, 25);
  assert.equal(r.discountPercent, 20);
  assert.equal(r.capped, true);
  assert.equal(r.discountAmount, 200);
});

test('labour is not taxed, so a discount does not reduce tax it never carried', () => {
  // 600 of materials and 400 of labour: tax applies to the 600 only.
  const r = applyAttachments({
    subtotal: 1000, taxableBase: 600, taxRate: 0.08,
    attachments: [{ kind: 'grant', percent: 10 }],
  });
  assert.equal(r.discountAmount, 100);
  assert.equal(r.taxAmount, 43.2, '8% of 540, not of 900');
});

/* ── the order, which is the whole point ─────────────────────────────────── */

test('a card pays the discounted price, it is not itself discounted', () => {
  const r = applyAttachments({
    ...base,
    attachments: [{ kind: 'grant', percent: 10 }, { kind: 'giftcard', amount: 500, code: 'GC-1' }],
  });
  assert.equal(r.total, 972, 'the discount settled the price first');
  assert.equal(r.creditTotal, 500, 'then the card paid 500 of it');
  assert.equal(r.balanceDue, 472);
});

test('a card does not change the total, only what is left to pay', () => {
  const r = applyAttachments({ ...base, attachments: [{ kind: 'giftcard', amount: 200, code: 'GC-1' }] });
  assert.equal(r.total, 1080, 'the invoice still says what it said');
  assert.equal(r.balanceDue, 880);
});

test('and a card does not reduce the tax, because paying does not change what was sold', () => {
  const r = applyAttachments({ ...base, attachments: [{ kind: 'giftcard', amount: 900, code: 'GC-1' }] });
  assert.equal(r.taxAmount, 80);
});

/* ── nothing is over-spent ───────────────────────────────────────────────── */

test('a card worth more than the bill keeps the difference', () => {
  const r = applyAttachments({ ...base, attachments: [{ kind: 'giftcard', amount: 2000, code: 'GC-1' }] });
  assert.equal(r.credits[0].used, 1080);
  assert.equal(r.credits[0].unused, 920, 'the rest stays on the card');
  assert.equal(r.balanceDue, 0);
});

test('two cards stop once the bill is covered', () => {
  const r = applyAttachments({
    ...base,
    attachments: [
      { kind: 'giftcard', amount: 1000, code: 'A' },
      { kind: 'giftcard', amount: 1000, code: 'B' },
    ],
  });
  assert.equal(r.credits[0].used, 1000);
  assert.equal(r.credits[1].used, 80, 'the second only covers what is left');
  assert.equal(r.credits[1].unused, 920);
  assert.equal(r.balanceDue, 0);
});

/* ── hours ───────────────────────────────────────────────────────────────── */

test('hours are worth their rate and come off the balance', () => {
  const r = applyAttachments({
    ...base,
    attachments: [{ kind: 'hours', hours: 4, rate: 95, planId: 'PLAN-1' }],
  });
  assert.equal(r.creditTotal, 380);
  assert.equal(r.balanceDue, 700);
  assert.equal(r.credits[0].hoursUsed, 4);
});

test('only the hours the bill needs are spent', () => {
  const r = applyAttachments({
    subtotal: 100, taxableBase: 0, taxRate: 0.08,
    attachments: [{ kind: 'hours', hours: 10, rate: 95, planId: 'PLAN-1' }],
  });
  assert.equal(r.balanceDue, 0);
  assert.equal(r.credits[0].used, 100);
  assert.equal(r.credits[0].hoursUsed, 1.05,
    'ten hours against a hundred pound bill must not spend ten hours');
  assert.equal(r.credits[0].unused, 850);
});

test('hours with no rate cover nothing rather than everything', () => {
  const r = applyAttachments({ ...base, attachments: [{ kind: 'hours', hours: 8, rate: 0 }] });
  assert.equal(r.creditTotal, 0);
  assert.equal(r.credits[0].hoursUsed, 0);
  assert.equal(r.balanceDue, 1080, 'an unknown rate must not silently clear a bill');
});

/* ── part paid already ───────────────────────────────────────────────────── */

test('what has already been paid is not paid again', () => {
  const r = applyAttachments({
    ...base,
    alreadyPaid: 600,
    attachments: [{ kind: 'giftcard', amount: 1000, code: 'GC-1' }],
  });
  assert.equal(r.total, 1080, 'the total is the total regardless of what has been paid');
  assert.equal(r.credits[0].used, 480, 'only the outstanding 480 needed covering');
  assert.equal(r.balanceDue, 0);
});

/* ── everything at once ──────────────────────────────────────────────────── */

test('a discount, a card and some hours together', () => {
  const r = applyAttachments({
    subtotal: 1000, taxableBase: 600, taxRate: 0.08, capPercent: 20,
    attachments: [
      { kind: 'grant', percent: 10 },
      { kind: 'hours', hours: 2, rate: 95, planId: 'PLAN-1' },
      { kind: 'giftcard', amount: 100, code: 'GC-1' },
    ],
  });
  // 1000 − 100 discount = 900, tax 8% of 540 = 43.20, total 943.20
  assert.equal(r.total, 943.2);
  // 190 of hours, then 100 of card
  assert.equal(r.creditTotal, 290);
  assert.equal(r.balanceDue, 653.2);
});

/* ── rubbish in ──────────────────────────────────────────────────────────── */

test('missing and unreadable figures do not produce NaN', () => {
  const r = applyAttachments({
    subtotal: Number.NaN as any,
    attachments: [
      { kind: 'grant', percent: undefined as any },
      { kind: 'giftcard', amount: 'lots' as any },
    ],
  });
  assert.equal(r.total, 0);
  assert.equal(r.balanceDue, 0);
  assert.equal(Number.isNaN(r.creditTotal), false);
});

test('a taxable base that was never given is assumed to be everything', () => {
  const r = applyAttachments({ subtotal: 500, taxRate: 0.08, attachments: [] });
  assert.equal(r.taxAmount, 40,
    'assuming nothing is taxable would under-charge tax on a bill whose caller simply did not say');
});
