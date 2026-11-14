/**
 * The card surcharge, and the sentence that has to match it.
 *
 * Eric: *"add a disclaimer that 3percent will be added when using a card to
 * process payment checks and cash are accepted as well."*
 *
 * A disclaimer and an arithmetic that disagree is the failure this codebase
 * has spent a week on, one document at a time. A notice reading "3% will be
 * added" above a total that does not include it is untrue; 3% in a total with
 * no line naming it is a surprise on a card statement. So both come from one
 * module and the tests hold them together.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CARD_FEE_RATE, CARD_FEE_LABEL, CARD_FEE_LINE, CARD_FEE_NOTICE, CARD_FEE_NOTICE_SHORT,
  cardFeeFor, methodIsSurcharged,
} from '../src/app/lib/cardFee.ts';

/* ── the money ───────────────────────────────────────────────────────────── */

test('three per cent of the transaction, on a card', () => {
  assert.equal(cardFeeFor(100, 'card'), 3);
  assert.equal(cardFeeFor(1000, 'card'), 30);
});

test('rounded to the cent, once', () => {
  // 3% of 49.99 is 1.4997 — a figure rendered to two places from four is a
  // total that misses by a penny.
  assert.equal(cardFeeFor(49.99, 'card'), 1.5);
  assert.equal(cardFeeFor(0.33, 'card'), 0.01);
  for (const amount of [1, 7.77, 123.45, 9999.99]) {
    const fee = cardFeeFor(amount, 'card');
    assert.equal(fee, Math.round(fee * 100) / 100, `${amount} produced sub-cent precision`);
  }
});

/* ── who pays it ─────────────────────────────────────────────────────────── */

test('cash and check carry no fee — the point of the disclaimer', () => {
  assert.equal(cardFeeFor(500, 'cash'), 0);
  assert.equal(cardFeeFor(500, 'check'), 0);
});

test('a bank transfer carries no fee either', () => {
  assert.equal(cardFeeFor(500, 'ach'), 0);
});

/**
 * Only the card method is surcharged, and nothing else is by accident.
 * A method nobody has decided about must not silently acquire a 3% charge.
 */
test('an unknown method is not surcharged', () => {
  for (const method of ['paypal', 'apple-pay', 'google-pay', 'bnpl', 'invoice', '', 'CARD']) {
    assert.equal(methodIsSurcharged(method), false, method || '(empty)');
    assert.equal(cardFeeFor(500, method), 0);
  }
  assert.equal(methodIsSurcharged('card'), true);
  assert.equal(methodIsSurcharged(null), false);
  assert.equal(methodIsSurcharged(undefined), false);
});

/* ── rubbish does not become a charge ────────────────────────────────────── */

test('nothing, or nonsense, is never a fee', () => {
  assert.equal(cardFeeFor(0, 'card'), 0);
  assert.equal(cardFeeFor(null, 'card'), 0);
  assert.equal(cardFeeFor(undefined, 'card'), 0);
  assert.equal(cardFeeFor(Number.NaN, 'card'), 0);
  assert.equal(cardFeeFor('abc' as any, 'card'), 0);
});

/**
 * A negative amount must not produce a negative fee. "Minus three dollars" on
 * a checkout screen is a discount nobody authorised.
 */
test('a negative amount is never a negative fee', () => {
  assert.equal(cardFeeFor(-500, 'card'), 0);
});

/* ── the words ───────────────────────────────────────────────────────────── */

test('the label is derived from the rate, not typed twice', () => {
  assert.equal(CARD_FEE_LABEL, '3%');
  assert.equal(CARD_FEE_RATE, 0.03);
  assert.match(CARD_FEE_LINE, /3%/);
  assert.match(CARD_FEE_NOTICE, /3%/);
});

/**
 * THE HALF THAT MAKES IT FAIR. A customer told there is a fee and not told
 * how to avoid it has been informed of a charge. One told cash and check are
 * accepted has been given a choice — which is what Eric asked for.
 */
test('the notice names the alternatives', () => {
  assert.match(CARD_FEE_NOTICE, /cash/i);
  assert.match(CARD_FEE_NOTICE, /check/i);
  assert.match(CARD_FEE_NOTICE_SHORT, /cash/i);
  assert.match(CARD_FEE_NOTICE_SHORT, /check/i);
});

/**
 * "CREDIT card", never bare "card", and this is law rather than wording.
 * Surcharging a DEBIT card is prohibited federally — the Durbin Amendment
 * and Regulation II — in every state. Credit surcharging is legal in New
 * Hampshire, capped at the cost of acceptance, and must be disclosed before
 * the customer commits.
 */
test('the notice and the line say CREDIT card', () => {
  assert.match(CARD_FEE_NOTICE, /credit card/i);
  assert.match(CARD_FEE_LINE, /credit card/i);
});

test('the rate stays within what the card networks allow', () => {
  // Network rules cap a surcharge at the merchant's cost of acceptance and
  // never above 4%. A rate edited past that is a compliance problem, not a
  // pricing decision.
  assert.ok(CARD_FEE_RATE > 0 && CARD_FEE_RATE <= 0.04, `${CARD_FEE_RATE} is out of bounds`);
});
