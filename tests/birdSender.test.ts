/**
 * The number a text and a call go out FROM, pinned.
 *
 * WHY THIS FILE EXISTS AT ALL
 *
 * Because the nine-digit case was not hypothetical. On 2026-11-12 the voice
 * number arrived as "603331918" — nine digits, one short — and was corrected
 * to 6033331918 only because it was counted and refused rather than accepted.
 *
 * The obvious thing for software to do with nine digits is prefix "+" and send
 * it. That produces "+603331918", which is not an error anybody would notice:
 * it is a syntactically valid number in Portugal. Bird would have taken the
 * configuration, the call would have failed somewhere a long way from here,
 * and nothing in the message would have mentioned the missing digit. The guard
 * paid for itself the day it was written.
 *
 * So the rule is: normalise what is unambiguous, refuse what is not, and never
 * guess. These tests are that rule.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSender } from '../supabase/functions/server/bird.ts';

/* ── what gets normalised ────────────────────────────────────────────────── */

test('both of the real numbers become E.164', () => {
  // The two senders this account actually uses, in the form Bird wants.
  assert.equal(normalizeSender('6038108010').sender, '+16038108010');   // SMS
  assert.equal(normalizeSender('6033331918').sender, '+16033331918');   // voice
  assert.equal(normalizeSender('6038108010').error, undefined);
  assert.equal(normalizeSender('6033331918').error, undefined);
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

test('the nine-digit typo is REFUSED, not prefixed into a Portuguese number', () => {
  // The voice number as first given, one digit short of 6033331918.
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
