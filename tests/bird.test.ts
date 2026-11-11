/**
 * The one thing a Bird key gets silently wrong: the region.
 *
 * The host and the key must name the same region, because Bird answers a
 * mismatch with an opaque auth error rather than "wrong region". Deriving the
 * host from the key makes that impossible by construction — this proves the
 * derivation, and proves a non-Bird key is refused rather than sent somewhere
 * guessed.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { birdHostFromKey, describeBirdError } from '../supabase/functions/server/bird.ts';

test('a US key points at the US host', () => {
  assert.equal(birdHostFromKey('bk_us1_ABCDEF123456'), 'https://us1.platform.bird.com');
});

test('an EU key points at the EU host', () => {
  assert.equal(birdHostFromKey('bk_eu1_ABCDEF123456'), 'https://eu1.platform.bird.com');
});

test('whitespace around a pasted key does not defeat the region', () => {
  assert.equal(birdHostFromKey('  bk_us1_x  '), 'https://us1.platform.bird.com');
});

test('a key that is not a Bird v1 key yields null, not a guessed host', () => {
  assert.equal(birdHostFromKey('AC_twilio_sid'), null);      // a Twilio-shaped value
  assert.equal(birdHostFromKey('sk_live_stripe'), null);
  assert.equal(birdHostFromKey(''), null);
  assert.equal(birdHostFromKey(null), null);
  assert.equal(birdHostFromKey(undefined), null);
});

test('a rejected key is explained as a key problem, not a message problem', () => {
  const msg = describeBirdError(401, '{"message":"unauthorized"}');
  assert.match(msg, /API key/i);
});

test('a 422 names the sender and recipient as the things to check', () => {
  const msg = describeBirdError(422, '{"code":"invalid_from","message":"bad sender"}');
  assert.match(msg, /BIRD_SMS_FROM|recipient|E\.164/i);
});

test('an unknown status still produces a bounded, readable line', () => {
  const msg = describeBirdError(500, 'x'.repeat(5000));
  assert.ok(msg.length < 400, 'the error is truncated, not the whole body');
  assert.match(msg, /500/);
});
