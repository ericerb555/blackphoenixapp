/**
 * The leaf utilities most of the server depends on.
 *
 * None of these was testable while it sat in the middle of `index.tsx`, and
 * two of them have rules that are easy to get subtly wrong in a way that is
 * invisible until a customer sees it: a phone number Twilio silently refuses,
 * and a company name that reaches an email subject line as a random token.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  APP_URL, appUrl, money, toE164, resolveCompanyName,
} from '../supabase/functions/server/serverPrimitives.ts';

/* ── money ───────────────────────────────────────────────────────────────── */

test('money rounds to whole cents', () => {
  assert.equal(money(10.005), 10.01);
  assert.equal(money(10.004), 10);
  assert.equal(money('19.999'), 20);
});

test('money never returns NaN', () => {
  // A NaN reaches the customer as "$NaN" on an invoice. Zero is at least
  // obviously wrong to whoever is reading the figures.
  for (const bad of [undefined, null, '', 'abc', {}, [], NaN, Infinity]) {
    assert.equal(money(bad), 0, String(bad));
  }
});

test('money leaves a clean figure alone', () => {
  assert.equal(money(0), 0);
  assert.equal(money(1234.56), 1234.56);
  assert.equal(money(-5.25), -5.25);
});

/* ── toE164 ──────────────────────────────────────────────────────────────── */

test('a formatted US number becomes E.164', () => {
  assert.equal(toE164('(555) 123-4567'), '+15551234567');
  assert.equal(toE164('555.123.4567'), '+15551234567');
  assert.equal(toE164('555 123 4567'), '+15551234567');
});

test('a leading 1 is not doubled', () => {
  assert.equal(toE164('1 (555) 123-4567'), '+15551234567');
  assert.equal(toE164('15551234567'), '+15551234567');
});

test('an explicit plus is honoured rather than assumed American', () => {
  // The 10-digit rule must not fire on an international number that happens
  // to have ten digits after its country code.
  assert.equal(toE164('+44 20 7946 0958'), '+442079460958');
  assert.equal(toE164('+1 555 123 4567'), '+15551234567');
});

test('nothing in means nothing out, not a stray plus', () => {
  for (const empty of ['', '   ', 'abc', '()-', null as any, undefined as any]) {
    assert.equal(toE164(empty), '', JSON.stringify(empty));
  }
});

/* ── appUrl ──────────────────────────────────────────────────────────────── */

test('the app url carries no trailing slash', () => {
  // These get concatenated into links. `https://host//path` is a different
  // URL to a strict router and looks broken in an email.
  assert.ok(!APP_URL.endsWith('/'), APP_URL);
  assert.equal(appUrl(), APP_URL);
});

test('the app url falls back to the real site, not an empty string', () => {
  assert.ok(APP_URL.startsWith('https://'), APP_URL);
});

/* ── resolveCompanyName ──────────────────────────────────────────────────── */

test('an unset company name falls back to the trading name', () => {
  // COMPANY_NAME is unset under the test runner, which is the same path as a
  // secret that was never configured.
  assert.equal(resolveCompanyName(), 'The Black Phoenix Company');
});
