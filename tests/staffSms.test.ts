/**
 * Texting the office when something arrives.
 *
 * An SMS costs money per message and arrives wherever somebody is standing, so
 * what is pinned here is all about not sending the wrong one:
 *
 *   - texts are opted into PER EVENT, separately from email, and off by default
 *   - a number we cannot send to is not a number
 *   - the same phone typed two ways is one phone and one message
 *   - the text carries the figure, so it is useful without opening anything
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalisePhone, phonesForEvent, smsBody, SMS_MAX } from '../supabase/functions/server/staffSms.ts';

/* ── the number ──────────────────────────────────────────────────────────── */

test('a number somebody actually typed becomes one we can send to', () => {
  assert.equal(normalisePhone('(603) 207-2248'), '+16032072248');
  assert.equal(normalisePhone('603-207-2248'), '+16032072248');
  assert.equal(normalisePhone('6032072248'), '+16032072248');
  assert.equal(normalisePhone('16032072248'), '+16032072248');
  assert.equal(normalisePhone('+16032072248'), '+16032072248');
  assert.equal(normalisePhone('  +44 7700 900123 '), '+447700900123');
});

test('anything we could not actually send to is nothing', () => {
  for (const bad of ['', '   ', 'call me', '12345', '+0123456789', null, undefined, '603-207-224']) {
    assert.equal(normalisePhone(bad), '', `${String(bad)} should not be sendable`);
  }
});

/* ── who gets texted ─────────────────────────────────────────────────────── */

const sub = (over: Record<string, any> = {}) => ({
  phone: '603-207-2248', enabled: true, smsEvents: ['estimate'], ...over,
});

test('nobody configured means nobody texted — there is no env back door', () => {
  assert.deepEqual(phonesForEvent('estimate', []), [],
    'an env list here would subscribe that number to every event and double the work-request text');
});

test('a subscriber is texted only for events they asked for', () => {
  const rows = [sub()];
  assert.deepEqual(phonesForEvent('estimate', rows), ['+16032072248']);
  assert.deepEqual(phonesForEvent('application', rows), [], 'texted about something they did not opt into');
});

test('texts are off by default — email subscribers are not phone subscribers', () => {
  const emailOnly = { phone: '6032072248', enabled: true, events: ['estimate'] } as any;
  assert.deepEqual(phonesForEvent('estimate', [emailOnly]), []);
  assert.deepEqual(phonesForEvent('estimate', [sub({ smsEvents: [] })]), []);
  assert.deepEqual(phonesForEvent('estimate', [sub({ smsEvents: undefined })]), []);
});

test('somebody switched off is not texted', () => {
  assert.deepEqual(phonesForEvent('estimate', [sub({ enabled: false })]), []);
});

test('the same phone typed two ways is one message', () => {
  const phones = phonesForEvent('estimate', [sub({ phone: '(603) 207-2248' }), sub({ phone: '+16032072248' })]);
  assert.deepEqual(phones, ['+16032072248']);
});

test('a subscriber with an unsendable number is skipped, not sent to', () => {
  assert.deepEqual(phonesForEvent('estimate', [sub({ phone: 'ask Dan' })]), []);
});

test('junk in the list does not throw', () => {
  assert.deepEqual(phonesForEvent('estimate', [null, undefined, 42, {}] as any), []);
  assert.deepEqual(phonesForEvent('estimate', null as any), []);
});

/* ── what it says ────────────────────────────────────────────────────────── */

test('the text carries the figure, not just a nudge to go and look', () => {
  const text = smsBody({
    company: 'Black Phoenix',
    subject: 'Junk estimate: $680',
    rows: [['Customer', 'jane@example.com'], ['Likely', '$680'], ['Volume', 'about 11 cu yd'], ['They said', 'everything but the bed']],
    keep: ['Likely', 'Customer'],
    url: 'https://theblackphoenixcompany.com/owners-dashboard',
  });
  assert.ok(text.includes('$680'));
  assert.ok(text.includes('jane@example.com'));
  assert.ok(text.startsWith('Black Phoenix:'), 'identifiable before it is opened');
  assert.ok(!text.includes('about 11 cu yd'), 'a row nobody asked to keep is left for the email');
});

test('an empty row is left out rather than sent as a dangling label', () => {
  const text = smsBody({
    company: 'BP', subject: 'Tip received',
    rows: [['Customer', ''], ['Amount', '$40'], ['Note', '—']],
    keep: ['Customer', 'Amount', 'Note'],
  });
  assert.ok(text.includes('Amount: $40'));
  assert.ok(!text.includes('Customer:'));
  assert.ok(!text.includes('Note:'));
});

test('a long message is cut rather than sent at any length', () => {
  const text = smsBody({
    company: 'Black Phoenix',
    subject: 'x'.repeat(400),
    rows: [['Likely', '$680']],
    keep: ['Likely'],
  });
  assert.ok(text.length <= SMS_MAX);
  assert.ok(text.endsWith('…'));
});

test('no rows and no link is still a usable message', () => {
  assert.equal(smsBody({ company: 'BP', subject: 'Something happened' }), 'BP: Something happened');
});
