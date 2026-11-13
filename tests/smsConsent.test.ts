/**
 * Who may be texted, pinned.
 *
 * WHY THESE ASSERTIONS
 *
 * One number on this account sends everything — portal invites, order
 * updates, bid invitations and the ON-CALL EMERGENCY PAGES. US carriers
 * suspend numbers that attract complaints, so a marketing complaint here does
 * not cost a marketing channel; it costs the emergency line. That is the
 * stake behind every rule below.
 *
 * The three states are not two, and collapsing them is the fault this file
 * exists to catch. `unknown` read as granted is how a platform texts people
 * who never agreed. `unknown` read as revoked would silently switch off every
 * order update and every emergency page on this system TODAY, because nothing
 * has ever recorded consent. Both are invisible from the outside, which is
 * why `maySend` answers per category rather than with one boolean.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readKeyword, maySend, normalizeConsent, withDecision, UNKNOWN,
  type ConsentRecord,
} from '../supabase/functions/server/smsConsent.ts';

const granted = (): ConsentRecord => withDecision(UNKNOWN('+16175550123'), {
  status: 'granted', method: 'signup-form', at: '2026-11-13T10:00:00.000Z',
  wording: 'I agree to receive texts…', source: 'portal-signup',
});

const revoked = (): ConsentRecord => withDecision(granted(), {
  status: 'revoked', method: 'stop-keyword', at: '2026-11-14T09:00:00.000Z',
});

/* ── STOP must actually be heard ─────────────────────────────────────────── */

test('the ways people really write STOP', () => {
  for (const said of ['STOP', 'stop', 'Stop.', 'STOP!', 'please stop', 'unsubscribe', 'CANCEL', 'quit', 'opt-out']) {
    assert.equal(readKeyword(said), 'stop', said);
  }
});

test('a sentence that merely contains the word does not unsubscribe anybody', () => {
  // Somebody reporting an emergency must not be opted out by describing it.
  assert.equal(readKeyword('the leak will not stop'), null);
  assert.equal(readKeyword('water wont stop coming in please help'), null);
  assert.equal(readKeyword('can you stop by tomorrow to look at the boiler'), null);
});

test('START puts somebody back on', () => {
  for (const said of ['START', 'start', 'Unstop', 'YES', 'subscribe']) {
    assert.equal(readKeyword(said), 'start', said);
  }
});

test('an ordinary reply is neither', () => {
  assert.equal(readKeyword('on my way'), null);
  assert.equal(readKeyword(''), null);
  assert.equal(readKeyword(null), null);
});

/* ── revoked is absolute ─────────────────────────────────────────────────── */

test('somebody who said stop gets nothing, in any category', () => {
  const r = revoked();
  for (const cat of ['marketing', 'transactional', 'authentication', 'service'] as const) {
    const d = maySend(r, cat);
    assert.equal(d.allowed, false, cat);
    assert.match(d.reason, /opted out/);
  }
});

test('the refusal says when they opted out, because somebody has to answer for it', () => {
  assert.match(maySend(revoked(), 'service').reason, /2026-11-14/);
});

/* ── marketing needs a yes ───────────────────────────────────────────────── */

test('marketing to an unknown number is refused', () => {
  const d = maySend(UNKNOWN('+16175550123'), 'marketing');
  assert.equal(d.allowed, false);
  assert.match(d.reason, /recorded opt-in/);
});

test('marketing to a consented number is allowed', () => {
  assert.equal(maySend(granted(), 'marketing').allowed, true);
});

test('a null record is treated as unknown, not as consent', () => {
  assert.equal(maySend(null, 'marketing').allowed, false);
  assert.equal(maySend(null, 'service').allowed, true);
});

/* ── operational traffic still works ─────────────────────────────────────── */

test('an emergency page reaches a number nobody has asked', () => {
  // Nothing on this platform has ever recorded consent. Reading `unknown` as
  // a refusal would switch off every on-call page, invisibly.
  const d = maySend(UNKNOWN('+16035550100'), 'service');
  assert.equal(d.allowed, true);
  assert.match(d.reason, /existing relationship/);
});

test('order updates and invites reach unknown numbers too', () => {
  assert.equal(maySend(UNKNOWN('+1'), 'transactional').allowed, true);
  assert.equal(maySend(UNKNOWN('+1'), 'authentication').allowed, true);
});

/* ── the record keeps its story ──────────────────────────────────────────── */

test('opting out does not erase that consent once existed', () => {
  const r = revoked();
  assert.equal(r.status, 'revoked');
  assert.equal(r.history.length, 2);
  assert.equal(r.history[0].status, 'granted');
  assert.equal(r.history[1].status, 'revoked');
});

test('the exact wording shown is kept, not a reference to it', () => {
  // The form's wording will change; what matters is what THIS person saw.
  assert.match(granted().wording || '', /I agree to receive texts/);
});

test('opting back in after a stop is allowed and recorded', () => {
  const back = withDecision(revoked(), { status: 'granted', method: 'keyword' });
  assert.equal(back.status, 'granted');
  assert.equal(maySend(back, 'marketing').allowed, true);
  assert.equal(back.history.length, 3);
});

/* ── reading what is stored ──────────────────────────────────────────────── */

test('an unreadable record is unknown, never granted', () => {
  for (const junk of [null, undefined, {}, { status: 'yes' }, { status: true }, 'nonsense']) {
    assert.equal(normalizeConsent(junk, '+1').status, 'unknown', JSON.stringify(junk));
  }
});

test('a stored revocation survives being read back', () => {
  const stored = JSON.parse(JSON.stringify(revoked()));
  assert.equal(normalizeConsent(stored, '+16175550123').status, 'revoked');
  assert.equal(maySend(normalizeConsent(stored, '+16175550123'), 'service').allowed, false);
});

test('history is capped so one number cannot grow without bound', () => {
  let r = UNKNOWN('+1');
  for (let i = 0; i < 80; i++) {
    r = withDecision(r, { status: i % 2 ? 'granted' : 'revoked', method: 'keyword' });
  }
  assert.ok(r.history.length <= 50, `history ${r.history.length}`);
  // The CURRENT status is never a casualty of the cap.
  assert.equal(r.status, 'granted');
});
