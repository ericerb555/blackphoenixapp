/**
 * The number to dial and the words to say.
 *
 * WHY THESE ASSERTIONS
 *
 * A number Twilio will not accept is a 400 per message, at three in the
 * morning, after the emergency has already happened — and the number that
 * causes it is exactly what somebody types on the setup screen:
 * "(603) 555-0101". Nothing about that looks wrong until it is needed.
 *
 * The page text matters for a smaller but real reason: it arrives on a lock
 * screen, and a page that does not say the trade and the address is one
 * somebody has to ring back about before they can decide whether to get out of
 * bed.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { e164, pageText, pageSpeech } from '../supabase/functions/server/onCallMessage.ts';

/* ── the number ──────────────────────────────────────────────────────────── */

test('a number typed the way a person types it becomes one Twilio accepts', () => {
  assert.equal(e164('(603) 555-0101'), '+16035550101');
  assert.equal(e164('603-555-0101'), '+16035550101');
  assert.equal(e164('603.555.0101'), '+16035550101');
  assert.equal(e164('6035550101'), '+16035550101');
});

test('a number already in E.164 is left alone', () => {
  assert.equal(e164('+16035550101'), '+16035550101');
  assert.equal(e164('+1 603 555 0101'), '+16035550101');
});

test('eleven digits starting with one is already the country code', () => {
  assert.equal(e164('16035550101'), '+16035550101');
  assert.equal(e164('1 (603) 555-0101'), '+16035550101');
});

test('nothing is nothing, so the caller can tell it cannot ring this person', () => {
  assert.equal(e164(''), '');
  assert.equal(e164('   '), '');
  assert.equal(e164('not a phone number'), '');
  assert.equal(e164(null as any), '');
});

test('an international number is passed through for Twilio to judge', () => {
  assert.equal(e164('+44 20 7946 0958'), '+442079460958');
});

/* ── the words ───────────────────────────────────────────────────────────── */

test('the text leads with the trade and the address, which decide what goes in the van', () => {
  const text = pageText({ trade: 'Plumbing', siteAddress: '12 Mill Road', title: 'Burst riser' });
  assert.match(text, /^EMERGENCY/);
  assert.match(text, /Plumbing/);
  assert.match(text, /12 Mill Road/);
  assert.match(text, /Burst riser/);
});

test('a call missing most of its detail still produces a usable page', () => {
  const text = pageText({});
  assert.match(text, /EMERGENCY/);
  assert.ok(text.length > 0);
});

test('the text stays short enough for a lock screen', () => {
  const text = pageText({
    trade: 'x'.repeat(200), siteAddress: 'y'.repeat(200), title: 'z'.repeat(200),
  });
  assert.ok(text.length <= 280, `a ${text.length}-character page is not a page`);
});

test('the spoken message names the company, so nobody thinks it is a scam call', () => {
  const said = pageSpeech({ trade: 'Plumbing', siteAddress: '12 Mill Road' });
  assert.match(said, /Black Phoenix/);
  assert.match(said, /Plumbing/);
  assert.match(said, /12 Mill Road/);
});

test('the spoken message works with nothing to say about the job', () => {
  const said = pageSpeech({});
  assert.match(said, /Black Phoenix/);
  assert.ok(!said.includes('undefined'), 'a robot reading "undefined" down the phone at 3am');
});
