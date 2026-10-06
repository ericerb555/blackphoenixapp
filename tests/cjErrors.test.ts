/**
 * Telling a disabled CJ account apart from a stale token.
 *
 * WHY THESE ASSERTIONS
 *
 * This pair of conditions was confused in production on 2026-10-06, and the
 * confusion was invisible. The token detector tested the message for
 * /access[- ]?token/, CJ's disabled-account message says "Your API access has
 * been disabled", and the two nearly collide — one more word in CJ's sentence,
 * or one looser regex here, and a disabled account is treated as a stale token.
 *
 * Which costs one pointless re-authentication per request. On a catalogue sweep
 * of 123 products that is 123 wasted auth calls, and the message that tells
 * somebody what to actually do arrives buried in a wall of identical errors.
 *
 * The reverse mistake is worse. A genuinely stale token that is read as a
 * disabled account stops the sweep and raises an ask asking the owner to fix
 * something on CJ's dashboard that is not broken — which trains them to ignore
 * the queue.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isAccessDisabled, isStaleToken,
  CJ_ACCESS_DISABLED, CJ_ACCESS_DISABLED_CODE, CJ_BAD_TOKEN_CODE,
} from '../supabase/functions/server/cjErrors.ts';

/** The exact payload CJ returned in production, code and all. */
const DISABLED = {
  code: 1600014,
  result: false,
  message: 'Your API access has been disabled. Please visit https://www.cjdropshipping.com/my.html#/authorize/APIStores to reactivate it.',
  data: null,
};

test('the real production payload is read as a disabled account', () => {
  assert.equal(isAccessDisabled(DISABLED), true);
  assert.equal(DISABLED.code, CJ_ACCESS_DISABLED_CODE);
});

test('a disabled account is NOT read as a stale token', () => {
  // The bug. CJ's sentence contains "access", and the token test looks for
  // "access token" — one reworded sentence away from matching.
  assert.equal(isStaleToken(DISABLED), false);
});

test('the code alone is enough, even if CJ rewords the sentence', () => {
  assert.equal(isAccessDisabled({ code: 1600014, message: 'something else entirely' }), true);
  assert.equal(isAccessDisabled({ code: 1600014 }), true);
});

test('the sentence alone is enough, even if CJ changes the code', () => {
  // Likelier than the reverse: a code is part of their API contract, a sentence
  // is not.
  assert.equal(isAccessDisabled({ code: 9999, message: 'Your API access has been disabled.' }), true);
  assert.equal(isAccessDisabled({ message: 'API ACCESS HAS BEEN DISABLED' }), true);
});

test('a disabled PRODUCT does not stop the sweep', () => {
  // The loose match that would have been tempting. One product being disabled
  // is an ordinary per-product outcome; stopping the whole catalogue for it
  // would leave 122 products unchecked over a single dead listing.
  for (const message of [
    'This product has been disabled by the supplier',
    'Variant disabled',
    'The listing is disabled',
  ]) {
    assert.equal(isAccessDisabled({ code: 1600001, message }), false, message);
  }
});

test('a stale token is still recognised', () => {
  assert.equal(isStaleToken({ code: CJ_BAD_TOKEN_CODE, message: 'token invalid' }), true);
  assert.equal(isStaleToken({ message: 'The access token is expired' }), true);
  assert.equal(isStaleToken({ message: 'accessToken invalid' }), true);
  assert.equal(isStaleToken({ code: 0, message: 'nothing relevant' }, 401), true);
});

test('an ordinary failure is neither', () => {
  for (const payload of [
    { code: 1600200, message: 'Too many requests' },
    { code: 1600001, message: 'Product not found' },
    { message: '' },
    {},
    null,
    undefined,
  ] as any[]) {
    assert.equal(isAccessDisabled(payload), false, JSON.stringify(payload));
    assert.equal(isStaleToken(payload), false, JSON.stringify(payload));
  }
});

test('a rate limit is not mistaken for either condition', () => {
  // It has its own retry with a backoff; reading it as an auth problem would
  // replace a sensible wait with a pointless re-authentication.
  const limited = { code: 1600200, result: false, message: 'Request frequency is too high', data: null };
  assert.equal(isAccessDisabled(limited), false);
  assert.equal(isStaleToken(limited), false);
});

test('the marker prefix is distinctive enough to match on', () => {
  // storeCatalogueJob matches a thrown message with startsWith. A short or
  // generic prefix would collide with CJ's own wording one day.
  assert.ok(CJ_ACCESS_DISABLED.length >= 10);
  assert.ok(!/\s/.test(CJ_ACCESS_DISABLED), 'no whitespace, so it survives being prefixed to prose');
  assert.ok(`${CJ_ACCESS_DISABLED}: ${DISABLED.message}`.startsWith(CJ_ACCESS_DISABLED));
});

test('the two conditions are mutually exclusive on every payload tested', () => {
  // Belt and braces: if both ever returned true, the handling order in cjFetch
  // would be the only thing deciding behaviour, which is too subtle to rely on.
  for (const payload of [DISABLED, { code: CJ_BAD_TOKEN_CODE }, { message: 'access token expired' }, { code: 1600200 }] as any[]) {
    assert.ok(!(isAccessDisabled(payload) && isStaleToken(payload)), JSON.stringify(payload));
  }
});
