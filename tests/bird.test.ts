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
  assert.ok(msg.length < 600, 'the error is truncated, not the whole 5000-char body');
  assert.match(msg, /500/);
});

/*
 * THE REAL BODY BIRD SENT, 2026-11-18.
 *
 * Copied from the production log of the first SMS this platform ever
 * attempted — a staff notification to Eric's own phone. He read the result as
 * "nothing came in on my phone", which is all it looks like from outside, and
 * the error that would have explained it arrived as eighty characters of JSON
 * because the parser read the flat shape and Bird nests under `error`.
 */
const E12014_BODY = JSON.stringify({
  error: {
    type: 'validation_error',
    code: 'E12014',
    name: 'SenderNotRegistered',
    message: 'This sender is not registered to send to the destination country. Registration is required before sending there.',
    doc_url: 'https://bird.com/docs/api/errors/E12014',
    remediation: 'Register this sender for the destination country, then send again once the registration is approved.',
  },
});

test('the nested Bird error is read, not stringified whole', () => {
  const out = describeBirdError(422, E12014_BODY);
  assert.doesNotMatch(out, /doc_url/, 'the whole JSON body leaked into the message');
  assert.doesNotMatch(out, /\[object Object\]/);
});

test('E12014 is explained as a registration step, not a bug', () => {
  const out = describeBirdError(422, E12014_BODY);
  // The two things somebody needs: that it is registration, and which setting.
  assert.match(out, /registered/i);
  assert.match(out, /BIRD_SMS_FROM/);
  assert.match(out, /E12014/, 'the raw code must survive for a support ticket');
  // And the reassurance that stops an afternoon being spent in the codebase.
  assert.match(out, /Nothing in this app needs changing/);
});

test('an unknown code still says what the provider said', () => {
  const out = describeBirdError(422, JSON.stringify({ error: { code: 'E99999', message: 'Something new' } }));
  assert.match(out, /E99999/);
  assert.match(out, /Something new/);
});

test('a bad key still reads as a key problem', () => {
  const out = describeBirdError(401, '{}');
  assert.match(out, /BIRD_API_SMS_KEY/);
});
