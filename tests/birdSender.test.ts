/**
 * The number a text and a call go out FROM, pinned.
 *
 * WHY THIS FILE EXISTS AT ALL
 *
 * Eric gave two numbers on 2026-11-12: 6038108010 for SMS and 603331918 for
 * voice. The second has nine digits. Nine is not a US number, and the obvious
 * thing for software to do with it — prefix "+" and send it — produces
 * "+603331918", which is not an error anybody would notice: it is a
 * syntactically valid number in Portugal. Bird would take the configuration,
 * the call would fail somewhere a long way from here, and nothing in the
 * message would mention the missing digit.
 *
 * So the rule is: normalise what is unambiguous, refuse what is not, and never
 * guess. These tests are that rule, and the nine-digit case is the one they
 * exist for.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSender } from '../supabase/functions/server/bird.ts';

/* ── what gets normalised ────────────────────────────────────────────────── */

test('the SMS number Eric gave becomes E.164', () => {
  assert.equal(normalizeSender('6038108010').sender, '+16038108010');
  assert.equal(normalizeSender('6038108010').error, undefined);
});

test('a number typed the way a person types it is still accepted', () => {
  for (const typed of ['(603) 810-8010', '603-810-8010', '603.810.8010', ' 603 810 8010 ']) {
    assert.equal(normalizeSender(typed).sender, '+16038108010', typed);
  }
});

test('a leading 1 is understood as the country code, not an eleventh digit', () => {
  assert.equal(normalizeSender('16038108010').sender, '+16038108010');
  assert.equal(normalizeSender('1-603-810-8010').sender, '+16038108010');
});

test('a number already in E.164 is left as it is', () => {
  assert.equal(normalizeSender('+16038108010').sender, '+16038108010');
  assert.equal(normalizeSender('+442071838750').sender, '+442071838750');
});

/* ── the case this file was written for ──────────────────────────────────── */

test('nine digits is REFUSED, not prefixed into a Portuguese number', () => {
  const result = normalizeSender('603331918');
  assert.equal(result.sender, '');
  assert.ok(result.error);
  // The count is in the message, because the whole failure is one missing digit
  // and the person reading it is looking at the number thinking it looks right.
  assert.match(result.error!, /9 digits/);
  assert.match(result.error!, /NOT been guessed/);
});

test('the refusal says what a correct number looks like', () => {
  const result = normalizeSender('603331918');
  assert.match(result.error!, /10/);
  assert.match(result.error!, /6038108010/);
});

test('other wrong lengths are refused the same way', () => {
  for (const wrong of ['12345', '60381080101234', '6038']) {
    assert.equal(normalizeSender(wrong).sender, '', wrong);
    assert.ok(normalizeSender(wrong).error, wrong);
  }
});

test('an explicit + with an implausible length is still refused', () => {
  // "+1" alone is not a number, and trusting the plus sign would let it through.
  assert.ok(normalizeSender('+1').error);
  assert.ok(normalizeSender('+1234567890123456789').error);
});

/* ── alphanumeric sender ids ─────────────────────────────────────────────── */

test('an alphanumeric sender id is passed through untouched', () => {
  // Normalising this would destroy it: there are no digits to count.
  assert.equal(normalizeSender('BLACKPHOENIX').sender, 'BLACKPHOENIX');
  assert.equal(normalizeSender('BLACKPHOENIX').error, undefined);
});

test('a sender id containing digits is still a sender id', () => {
  assert.equal(normalizeSender('PHOENIX24').sender, 'PHOENIX24');
});

test('nothing set is reported as nothing set', () => {
  assert.ok(normalizeSender('').error);
  assert.ok(normalizeSender(null).error);
  assert.ok(normalizeSender(undefined).error);
});
