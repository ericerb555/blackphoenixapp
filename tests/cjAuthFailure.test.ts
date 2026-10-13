/**
 * Telling a run-level authentication failure from a per-product one.
 *
 * WHY THESE ASSERTIONS
 *
 * Every string tested here was returned by CJ on 2026-10-13, on one catalogue
 * sweep, after the API key was replaced with a value CJ did not accept. The run
 * produced 123 errors: the first said the key was wrong, and the other 122 were
 * rate-limit complaints caused by retrying that same rejected key once per
 * product against a limiter that allows one call a second.
 *
 * So what is pinned here is the rule that makes the retry impossible:
 * authentication is a property of the run, not of a product, and the first
 * failure must end the sweep. Plus the one exclusion that matters — a disabled
 * account must NOT be swept into this, because it has its own ask carrying the
 * only instruction that fixes it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isAuthFailure,
  authFailureKind,
  CJ_ACCESS_DISABLED,
  CJ_AUTH_FAILED_PREFIX,
} from '../supabase/functions/server/cjErrors.ts';

// The literal messages, as thrown by getAccessToken and seen in the heartbeat.
const BAD_KEY = 'CJ authentication failed: APIkey is wrong, please check and try again';
const RATE_LIMITED = 'CJ authentication failed: Too Many Requests, QPS limit is 1 time/1second';
const DISABLED = `${CJ_ACCESS_DISABLED}: Your API access has been disabled. Please visit https://www.cjdropshipping.com/my.html#/authorize/APIStores to reactivate it.`;

test('a wrong key is a run-level failure', () => {
  assert.equal(isAuthFailure(BAD_KEY), true);
  assert.equal(authFailureKind(BAD_KEY), 'bad-key');
});

test('a rate-limited authentication is too', () => {
  // These were the 122. They are the symptom of the first failure, and
  // treating them as per-product errors is what produced them.
  assert.equal(isAuthFailure(RATE_LIMITED), true);
  assert.equal(authFailureKind(RATE_LIMITED), 'rate-limited');
});

test('a disabled account is NOT an auth failure', () => {
  // The exclusion that matters. A disabled account authenticates perfectly;
  // its ask carries the dashboard link that is the only fix. If this returned
  // true, that ask would never be raised and the instruction would be lost.
  assert.equal(isAuthFailure(DISABLED), false);
});

test('a product-level problem is left to the loop', () => {
  // These must NOT stop the sweep: one bad product is not a reason to abandon
  // the other 122.
  for (const message of [
    'CJYD3045890: no variant matched that product id',
    'Product not found',
    'CJ returned non-JSON (HTTP 502): <html>bad gateway</html>',
    'cost was null and stock was null',
  ]) {
    assert.equal(isAuthFailure(message), false, message);
  }
});

test('the prefix matched is ours, not CJ prose', () => {
  // getAccessToken throws with this prefix, so rewording on CJ's side cannot
  // silently turn a fatal condition back into a per-product one.
  assert.ok(BAD_KEY.startsWith(CJ_AUTH_FAILED_PREFIX));
  assert.equal(isAuthFailure(`${CJ_AUTH_FAILED_PREFIX}: something entirely new`), true);
  assert.equal(authFailureKind(`${CJ_AUTH_FAILED_PREFIX}: something entirely new`), 'other');
});

test('nothing non-string throws', () => {
  for (const bad of [null, undefined, 0, {}, [], true] as any[]) {
    assert.equal(isAuthFailure(bad), false, String(bad));
    assert.equal(authFailureKind(bad), 'other', String(bad));
  }
});

test('wording variants of a wrong key are all caught', () => {
  // CJ is not consistent across endpoints, and this is the one classification
  // a person acts on, so it is matched loosely on purpose.
  for (const message of [
    'CJ authentication failed: APIkey is wrong, please check and try again',
    'CJ authentication failed: wrong api key',
    'CJ authentication failed: Invalid API Key',
    'CJ authentication failed: apikey is wrong',
  ]) {
    assert.equal(authFailureKind(message), 'bad-key', message);
  }
});
