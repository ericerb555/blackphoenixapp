/**
 * `POST /email-center/send` must never be open again.
 *
 * It had no authorisation of any kind. The auth wall defaults an unlisted
 * route to "signed in", which every portal customer, vendor, subcontractor and
 * advertiser is — so any of them could post a recipient, a subject, arbitrary
 * HTML and a base64 attachment, and the platform would send it from
 * `Black Phoenix <FROM_EMAIL>` with the company reply-to attached.
 *
 * That is an open relay wearing a verified sending domain: mail that passes
 * SPF and DKIM because it genuinely is us, to any address the caller names.
 * One use of it costs the sending reputation of every invoice and quote this
 * company sends.
 *
 * The template route beside it was already closed, with a comment saying why —
 * "an open write here is a way to make us send whatever somebody wants, to our
 * own list, with our reputation behind it." That route only STORES subject and
 * HTML. This one sends immediately, and was the one left open.
 *
 * Asserted against the source rather than left as a habit, because the hole
 * was invisible: nothing failed, nothing logged who sent anything, and the
 * route reads perfectly well without a gate.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SOURCE = 'supabase/functions/server/email-center.tsx';
const src = readFileSync(SOURCE, 'utf8');

/** The body of one route handler, from its registration to the next one. */
function routeBody(method: 'post' | 'put' | 'get' | 'delete', path: string): string {
  const start = src.indexOf(`emailCenterRouter.${method}('${path}'`);
  assert.ok(start >= 0, `${SOURCE} no longer registers ${method.toUpperCase()} ${path}`);
  const after = src.indexOf('emailCenterRouter.', start + 10);
  return src.slice(start, after === -1 ? src.length : after);
}

test('the send route resolves who is calling', () => {
  const body = routeBody('post', '/send');
  assert.match(body, /verifiedActor\s*\(\s*c\s*\)/,
    'POST /email-center/send must resolve the caller before it sends anything');
});

test('and refuses anybody who does not work here', () => {
  const body = routeBody('post', '/send');
  assert.match(body, /who\?\.staff/, 'the caller must be checked for staff');
  assert.match(body, /403/, 'a non-staff caller must be refused with a 403');
});

test('THE GATE COMES BEFORE THE SEND, not after it', () => {
  // A check that runs after `sendCompanyEmail` is not a check: the mail has
  // already left.
  const body = routeBody('post', '/send');
  const gate = body.indexOf('verifiedActor');
  const send = body.indexOf('sendCompanyEmail');
  assert.ok(gate >= 0 && send >= 0, 'both the gate and the send must be present');
  assert.ok(gate < send,
    `the authorisation check must precede sendCompanyEmail (gate at ${gate}, send at ${send})`);
});

test('the send is attributed, so a company email traces to a person', () => {
  const body = routeBody('post', '/send');
  assert.match(body, /sentBy/,
    'the caller must be recorded — the log used to hold the recipient and nothing about the sender');
});

test('the log can carry who sent it', () => {
  // The audit half of the same fix. Without this the attribution above would
  // be passed in and quietly dropped.
  assert.match(src, /sentBy\?\s*:\s*string/, 'logSentEmail must accept sentBy');
  assert.match(src, /sentBy:\s*entry\.sentBy/, 'and must write it onto the record');
});

test('the template route it sits beside is still closed too', () => {
  // It was closed first and for the same reason. A regression there would be
  // the same hole one route along.
  const body = routeBody('put', '/templates/:key');
  assert.match(body, /who\?\.staff/, 'the template write must stay staff-only');
});
