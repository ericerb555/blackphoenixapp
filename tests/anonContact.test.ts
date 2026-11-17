/**
 * The only thing between an unauthenticated form and the office's queue.
 *
 * A visitor can now price a junk job and ask us to confirm it without making
 * an account, leaving a name and a number instead. That is the right trade —
 * somebody standing in a basement should not meet a signup wall — and it
 * means a public form writes into the queue the office actually works from.
 *
 * The failure it prevents is quiet. A queue filling with entries nobody can
 * ring back looks exactly like a busy week, and nobody reports it, because
 * from the inside it looks like business.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readAnonContact, plausiblePhone, plausibleEmail, anonConfirmKey, ANON_CONFIRM_PER_IP_DAILY,
} from '../supabase/functions/server/anonContact.ts';

test('a real number in any of the ways people type it', () => {
  for (const n of [
    '6032072248', '603-207-2248', '(603) 207-2248', '603.207.2248',
    '+1 603 207 2248', '1-603-207-2248', ' 603 207 2248 ',
  ]) {
    assert.equal(plausiblePhone(n), true, `${n} should be dialable`);
  }
});

/**
 * The placeholders people type to get past a required field.
 *
 * These are the whole point: not fraud, just somebody who wants the price and
 * not the phone call. Each one would otherwise become a queue entry the
 * office spends time on and cannot action.
 */
test('the things people type to skip the field', () => {
  for (const n of [
    '', '   ', '0000000000', '1111111111', '1234567890', '0123456789',
    '123', '555', 'no thanks', '+', '++++', '12345',
  ]) {
    assert.equal(plausiblePhone(n), false, `${JSON.stringify(n)} should be refused`);
  }
});

/**
 * NANP rules, which are rules and not guesses: neither an area code nor an
 * exchange may begin with 0 or 1. This is what rejects `1234567890` without
 * rejecting anything real.
 */
test('an area code or exchange starting 0 or 1 is not a number', () => {
  assert.equal(plausiblePhone('0035551234'), false, 'area code starting 0');
  assert.equal(plausiblePhone('1035551234'), false, 'area code starting 1');
  assert.equal(plausiblePhone('6030551234'), false, 'exchange starting 0');
  assert.equal(plausiblePhone('6031551234'), false, 'exchange starting 1');
  assert.equal(plausiblePhone('6032072248'), true, 'a real one still passes');
});

test('eleven digits only counts when it starts with a 1', () => {
  assert.equal(plausiblePhone('16032072248'), true);
  assert.equal(plausiblePhone('26032072248'), false, 'eleven digits starting 2 is not NANP');
});

test('a name and a number are enough, and an email is not required', () => {
  const v = readAnonContact({ name: 'Jordan Smith', phone: '(603) 207-2248' });
  assert.equal(v.ok, true);
  if (v.ok) {
    assert.equal(v.contact.name, 'Jordan Smith');
    assert.equal(v.contact.email, '');
  }
});

test('a name is required, because the office rings these back', () => {
  const v = readAnonContact({ phone: '6032072248' });
  assert.equal(v.ok, false);
  if (!v.ok) assert.match(v.error, /name/i);
});

test('one error at a time, in the order the form shows them', () => {
  // Everything wrong at once: the name comes first because it is the first field.
  const v = readAnonContact({ name: '', phone: 'nope', email: 'not-an-email' });
  assert.equal(v.ok, false);
  if (!v.ok) assert.match(v.error, /name/i, 'should not skip ahead to the phone or the email');

  // Name fixed: now the phone is the complaint.
  const w = readAnonContact({ name: 'Jordan', phone: 'nope', email: 'not-an-email' });
  assert.equal(w.ok, false);
  if (!w.ok) assert.match(w.error, /phone|ring/i);
});

test('an empty phone is told it is needed, not that it is malformed', () => {
  const v = readAnonContact({ name: 'Jordan', phone: '' });
  assert.equal(v.ok, false);
  // "We need a number" and "that is not a number" are different problems to
  // the person reading them.
  if (!v.ok) assert.doesNotMatch(v.error, /does not look like/i);
});

test('a supplied email is checked, a missing one is not', () => {
  assert.equal(readAnonContact({ name: 'Jordan', phone: '6032072248', email: 'j@x.com' }).ok, true);
  assert.equal(readAnonContact({ name: 'Jordan', phone: '6032072248', email: '' }).ok, true);
  const bad = readAnonContact({ name: 'Jordan', phone: '6032072248', email: 'j@x' });
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.match(bad.error, /email/i);
});

test('a hostile name is bounded rather than rejected', () => {
  // Somebody with a very long name is a customer, not an attack. It is cut to
  // fit and accepted; what must not happen is an unbounded string reaching a
  // record and an email subject line.
  const v = readAnonContact({ name: 'x'.repeat(5000), phone: '6032072248' });
  assert.equal(v.ok, true);
  if (v.ok) assert.ok(v.contact.name.length <= 120, 'the name is not bounded');
});

test('nothing at all is refused', () => {
  for (const body of [null, undefined, {}, 'a string', 42]) {
    assert.equal(readAnonContact(body as any).ok, false, `${JSON.stringify(body)} should be refused`);
  }
});

/**
 * The daily cap bounds the OFFICE'S ATTENTION, not the money.
 *
 * `anonPricer` already bounds the spend, because pricing is the expensive
 * half and this costs a row. A queue somebody has filled with rubbish is a
 * queue that stops being read, which is the more expensive failure.
 */
test('the daily cap is keyed by address and by day', () => {
  const a = anonConfirmKey('1.2.3.4', '2026-11-17T10:00:00Z');
  const b = anonConfirmKey('1.2.3.4', '2026-11-17T23:59:00Z');
  const c = anonConfirmKey('1.2.3.4', '2026-11-18T00:01:00Z');
  const d = anonConfirmKey('5.6.7.8', '2026-11-17T10:00:00Z');

  assert.equal(a, b, 'the same address on the same day shares a bucket');
  assert.notEqual(a, c, 'a new day is a new bucket, so nothing needs resetting');
  assert.notEqual(a, d, 'different addresses do not share a bucket');
  assert.doesNotMatch(a, /1\.2\.3\.4/, 'the address is hashed, not stored');
  assert.ok(ANON_CONFIRM_PER_IP_DAILY > 0 && ANON_CONFIRM_PER_IP_DAILY <= 20);
});

test('an unknown address still gets a bucket rather than none', () => {
  // The alternative is an unmetered path for anybody we cannot identify,
  // which is the wrong way round.
  assert.ok(anonConfirmKey('', '2026-11-17T10:00:00Z').includes('anon_confirm:ip:'));
});
