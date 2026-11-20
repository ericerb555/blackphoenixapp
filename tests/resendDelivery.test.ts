/**
 * The log says what happened to an email, not just that we sent one.
 *
 * Eric, 2026-11-20: *"I GOT THE EMAIL OF ACCOUNT CREATION BUT NOT THE PRICING
 * APPROVAL"* — and the log could not tell him which was true.
 *
 * Every send recorded `status: 'sent'`, the provider's message id, and
 * nothing after handoff. The alert he was chasing is in there, accepted by
 * Resend one second after the request:
 *
 *     status            sent
 *     providerResponse  {"id":"01a1f685-da4a-7ed1-ac58-3d2e4e7815f3"}
 *     recipients        blackphoenixbuilds@proton.me, ericerb555@proton.me
 *
 * That row looks the same whether the mail landed, bounced at Proton or was
 * filed as spam. All 61 logged sends looked the same. "Sent" is not
 * "arrived", and the difference is the whole question somebody asks when they
 * did not get an email.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  deliveryStateFor, advances, emailIdOf, recordMatches, applyResendEvent,
  verifyResendSignature, timingSafeEqual,
} from '../supabase/functions/server/resendDelivery.ts';

/* ── which events we record ──────────────────────────────────────────────── */

test('the delivery events are recorded, and the tracking ones are not', () => {
  assert.equal(deliveryStateFor('email.delivered'), 'delivered');
  assert.equal(deliveryStateFor('email.bounced'), 'bounced');
  assert.equal(deliveryStateFor('email.complained'), 'complained');
  assert.equal(deliveryStateFor('email.delivery_delayed'), 'delayed');
  assert.equal(deliveryStateFor('email.sent'), 'sent');

  /*
   * Opens and clicks are deliberately absent. They are not delivery facts,
   * they depend on a tracking pixel the recipient may block, and recording
   * when somebody read their mail is a decision for Eric rather than a side
   * effect of fixing a bounce log.
   */
  assert.equal(deliveryStateFor('email.opened'), null);
  assert.equal(deliveryStateFor('email.clicked'), null);
  assert.equal(deliveryStateFor('something.else'), null);
  assert.equal(deliveryStateFor(undefined), null);
});

/* ── a late redelivery cannot undo a bounce ─────────────────────────────── */

/**
 * Webhooks are not ordered and are retried. Without a rank, a redelivered
 * `email.sent` lands on top of a `bounced` and the row says the mail is fine
 * — which is worse than the gap this closes, because it looks like an answer.
 */
test('a bounce is terminal and nothing later overwrites it', () => {
  assert.equal(advances('bounced', 'sent'), false);
  assert.equal(advances('bounced', 'delivered'), false);
  assert.equal(advances('complained', 'delivered'), false);

  assert.equal(advances('sent', 'delivered'), true);
  assert.equal(advances('sent', 'bounced'), true);
  assert.equal(advances('delayed', 'delivered'), true);
  assert.equal(advances(undefined, 'sent'), true, 'a record with no delivery yet takes the first event');
});

test('applying a stale event changes nothing', () => {
  const bounced = { id: 'x', status: 'bounced', delivery: { state: 'bounced', at: 'then' } };
  assert.equal(applyResendEvent(bounced, { type: 'email.sent', data: { email_id: 'e1' } }), null);
  assert.equal(applyResendEvent(bounced, { type: 'email.opened', data: { email_id: 'e1' } }), null);
});

/* ── matching the event to the send ─────────────────────────────────────── */

/**
 * `providerResponse` is stored as the raw response TEXT, truncated to 500
 * characters — not as a parsed object — so matching has to read the id back
 * out of a string. This is the exact shape of the row Eric was chasing.
 */
test('an event finds its send by message id', () => {
  const row = { id: 'log1', providerResponse: '{"id":"01a1f685-da4a-7ed1-ac58-3d2e4e7815f3"}' };
  assert.equal(recordMatches(row, '01a1f685-da4a-7ed1-ac58-3d2e4e7815f3'), true);
  assert.equal(recordMatches(row, 'some-other-id'), false);
  assert.equal(recordMatches(row, ''), false, 'an event with no id matches nothing');
  assert.equal(recordMatches({ id: 'log2' }, 'anything'), false);
});

test('a provider response stored as an object still matches', () => {
  const row = { id: 'log1', providerResponse: { id: 'abc' } };
  assert.equal(recordMatches(row, 'abc'), true);
  assert.equal(recordMatches(row, 'abd'), false);
});

test('the id is read from the event', () => {
  assert.equal(emailIdOf({ data: { email_id: ' abc ' } }), 'abc');
  assert.equal(emailIdOf({ data: {} }), '');
  assert.equal(emailIdOf(null), '');
});

/* ── what gets written ──────────────────────────────────────────────────── */

test('a delivery updates the status the existing readers already use', () => {
  const row = { id: 'log1', status: 'sent', recipients: ['a@b.c'], providerResponse: '{"id":"e1"}' };
  const out = applyResendEvent(row, {
    type: 'email.delivered', created_at: '2026-11-20T01:16:00.000Z', data: { email_id: 'e1' },
  });

  assert.equal(out.status, 'delivered', 'so `loadStaffNotificationLog` tells the truth without changing');
  assert.equal(out.delivery.state, 'delivered');
  assert.equal(out.delivery.at, '2026-11-20T01:16:00.000Z');
  assert.deepEqual(out.delivery.to, ['a@b.c'], 'the recipients travel with the verdict');
  assert.equal(out.id, 'log1', 'and the rest of the row is untouched');
});

test('a bounce carries the reason, which is the part worth reading', () => {
  const row = { id: 'log1', status: 'sent', providerResponse: '{"id":"e1"}' };
  const out = applyResendEvent(row, {
    type: 'email.bounced',
    data: { email_id: 'e1', bounce: { message: 'The recipient mailbox is full.' } },
  });

  assert.equal(out.status, 'bounced');
  assert.equal(out.delivery.detail, 'The recipient mailbox is full.');
});

test('a delivery carries no bounce detail', () => {
  const out = applyResendEvent({ id: 'l', providerResponse: '{"id":"e1"}' }, {
    type: 'email.delivered', data: { email_id: 'e1' },
  });
  assert.equal('detail' in out.delivery, false);
});

/* ── the signature ──────────────────────────────────────────────────────── */

/** Signs a payload the way Svix does, so the test exercises the real path. */
async function sign(secret: string, id: string, timestamp: string, body: string): Promise<string> {
  const keyBytes = Uint8Array.from(atob(secret.replace(/^whsec_/, '')), (ch) => ch.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${timestamp}.${body}`)));
  return `v1,${btoa(String.fromCharCode(...mac))}`;
}

const SECRET = 'whsec_' + btoa('a-test-signing-secret-of-some-length');
const BODY = JSON.stringify({ type: 'email.delivered', data: { email_id: 'e1' } });

test('a correctly signed request is accepted', async () => {
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = await sign(SECRET, 'msg_1', ts, BODY);
  const out = await verifyResendSignature({
    secret: SECRET, id: 'msg_1', timestamp: ts, body: BODY, signatureHeader: sig,
  });
  assert.equal(out.ok, true);
});

/**
 * WITHOUT A SECRET IT REFUSES EVERYTHING, AND THAT IS THE POINT.
 *
 * This endpoint mutates a delivery record chosen by message id, and those ids
 * are not secret — they appear in provider dashboards and in any forwarded
 * alert. Unsigned, anybody could mark a bounced message delivered, so the one
 * question this exists to answer could be answered wrongly on purpose.
 */
test('no configured secret means no request is accepted', async () => {
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = await sign(SECRET, 'msg_1', ts, BODY);
  const out = await verifyResendSignature({
    secret: '', id: 'msg_1', timestamp: ts, body: BODY, signatureHeader: sig,
  });
  assert.equal(out.ok, false);
  assert.match(out.reason || '', /signing secret/);
});

test('a tampered body is refused', async () => {
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = await sign(SECRET, 'msg_1', ts, BODY);
  const out = await verifyResendSignature({
    secret: SECRET, id: 'msg_1', timestamp: ts,
    body: JSON.stringify({ type: 'email.delivered', data: { email_id: 'SOMEBODY_ELSE' } }),
    signatureHeader: sig,
  });
  assert.equal(out.ok, false);
});

test('a replayed request outside the window is refused', async () => {
  const old = String(Math.floor(Date.now() / 1000) - 3600);
  const sig = await sign(SECRET, 'msg_1', old, BODY);
  const out = await verifyResendSignature({
    secret: SECRET, id: 'msg_1', timestamp: old, body: BODY, signatureHeader: sig,
  });
  assert.equal(out.ok, false);
  assert.match(out.reason || '', /replay window/);
});

/** Svix sends several signatures while a secret is being rotated. */
test('one good signature among several is enough', async () => {
  const ts = String(Math.floor(Date.now() / 1000));
  const good = await sign(SECRET, 'msg_1', ts, BODY);
  const out = await verifyResendSignature({
    secret: SECRET, id: 'msg_1', timestamp: ts, body: BODY,
    signatureHeader: `v1,bm90LXRoZS1yaWdodC1vbmU= ${good}`,
  });
  assert.equal(out.ok, true);
});

test('missing headers are refused rather than throwing', async () => {
  for (const headers of [
    { id: '', timestamp: '1', signatureHeader: 'v1,x' },
    { id: 'a', timestamp: '', signatureHeader: 'v1,x' },
    { id: 'a', timestamp: '1', signatureHeader: '' },
    { id: 'a', timestamp: 'not-a-number', signatureHeader: 'v1,x' },
  ]) {
    const out = await verifyResendSignature({ secret: SECRET, body: BODY, ...headers });
    assert.equal(out.ok, false, JSON.stringify(headers));
  }
});

test('the comparison does not leak where two strings differ', () => {
  assert.equal(timingSafeEqual('abc', 'abc'), true);
  assert.equal(timingSafeEqual('abc', 'abd'), false);
  assert.equal(timingSafeEqual('abc', 'abcd'), false);
  assert.equal(timingSafeEqual('', ''), true);
});
