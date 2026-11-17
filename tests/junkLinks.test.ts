/**
 * The textable junk pricing link.
 *
 * This link is a credential that gets forwarded — that is what texting it
 * means — and behind it is an Anthropic call per estimate. So the tests that
 * matter are the ones about refusing, and every one of them asserts the
 * closed direction on bad input rather than the open one on good input.
 *
 * THE DIRECTION OF EVERY FAILURE
 *
 * A malformed expiry is dead, not immortal. An unreadable use counter is spent,
 * not infinite. A `maxUses` a caller asked to raise is clamped down, never up.
 * Each of those is a case where the permissive reading is the one a bug would
 * naturally produce, which is why they are pinned.
 *
 * WHY THE PRINCIPAL IS TESTED AT ALL
 *
 * `principalFor` looks like a two-line object literal and carries the whole
 * metering story: no `app_metadata` so `aiSpend.isStaff` is false and the link
 * is metered rather than waived, no `email` so `ceilingFor` falls back to the
 * published backstop instead of inheriting a subscriber's tier, and a
 * namespaced id so a link's budget row cannot collide with an account uuid.
 * Add a field in good faith — an email to make the ledger read nicer — and the
 * link silently inherits somebody's ceiling. These tests are what notices.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  junkLinkRecord, junkLinkState, junkLinkKey, principalFor, junkLinkUrl,
  JUNK_LINK_DAYS, JUNK_LINK_MAX_USES,
} from '../supabase/functions/server/junkLinks.ts';

const NOW = '2026-11-16T12:00:00.000Z';
const nowMs = Date.parse(NOW);
const DAY = 24 * 60 * 60 * 1000;

test('a fresh link is usable and starts unspent', () => {
  const r = junkLinkRecord('abc123', NOW, { createdBy: 'eric', label: 'Dunbarton basement' });
  assert.equal(r.uses, 0);
  assert.equal(r.maxUses, JUNK_LINK_MAX_USES);
  assert.equal(r.revokedAt, null);
  assert.equal(r.createdBy, 'eric');
  assert.equal(r.label, 'Dunbarton basement');
  assert.deepEqual(junkLinkState(r, nowMs), { usable: true });
});

test('it expires on schedule', () => {
  const r = junkLinkRecord('abc123', NOW);
  assert.equal(r.expiresAt, new Date(nowMs + JUNK_LINK_DAYS * DAY).toISOString());
  assert.deepEqual(junkLinkState(r, nowMs + (JUNK_LINK_DAYS - 1) * DAY), { usable: true });
  assert.deepEqual(
    junkLinkState(r, nowMs + JUNK_LINK_DAYS * DAY),
    { usable: false, reason: 'expired' },
    'the expiry instant itself is dead, not the last good moment',
  );
});

test('a revoked link is dead even before it expires', () => {
  const r = { ...junkLinkRecord('abc123', NOW), revokedAt: NOW };
  assert.deepEqual(junkLinkState(r, nowMs), { usable: false, reason: 'revoked' });
});

test('a spent link is dead', () => {
  const r = { ...junkLinkRecord('abc123', NOW), uses: JUNK_LINK_MAX_USES };
  assert.deepEqual(junkLinkState(r, nowMs), { usable: false, reason: 'spent' });
  const nearly = { ...junkLinkRecord('abc123', NOW), uses: JUNK_LINK_MAX_USES - 1 };
  assert.deepEqual(junkLinkState(nearly, nowMs), { usable: true });
});

test('a missing record is unknown, not usable', () => {
  assert.deepEqual(junkLinkState(null, nowMs), { usable: false, reason: 'unknown' });
  assert.deepEqual(junkLinkState(undefined, nowMs), { usable: false, reason: 'unknown' });
  assert.deepEqual(junkLinkState({} as any, nowMs), { usable: false, reason: 'unknown' });
});

test('an unreadable expiry is dead rather than immortal', () => {
  for (const expiresAt of ['', 'soon', null, undefined]) {
    const r = { ...junkLinkRecord('abc123', NOW), expiresAt } as any;
    assert.deepEqual(
      junkLinkState(r, nowMs), { usable: false, reason: 'malformed' },
      `expiresAt=${String(expiresAt)} must fail closed`,
    );
  }
});

test('an unreadable use counter is spent rather than infinite', () => {
  for (const bad of [{ uses: NaN }, { maxUses: NaN }, { maxUses: 0 }, { maxUses: -1 }, { uses: undefined }]) {
    const r = { ...junkLinkRecord('abc123', NOW), ...bad } as any;
    assert.deepEqual(
      junkLinkState(r, nowMs), { usable: false, reason: 'malformed' },
      `${JSON.stringify(bad)} must fail closed`,
    );
  }
});

test('a caller may ask for fewer uses, never more', () => {
  assert.equal(junkLinkRecord('h', NOW, { maxUses: 3 }).maxUses, 3);
  assert.equal(junkLinkRecord('h', NOW, { maxUses: 9999 }).maxUses, JUNK_LINK_MAX_USES);
  assert.equal(junkLinkRecord('h', NOW, { maxUses: 0 }).maxUses, JUNK_LINK_MAX_USES);
  assert.equal(junkLinkRecord('h', NOW, { maxUses: -5 }).maxUses, JUNK_LINK_MAX_USES);
  assert.equal(junkLinkRecord('h', NOW, { maxUses: NaN }).maxUses, JUNK_LINK_MAX_USES);
});

test('the record is filed under the hash', () => {
  assert.equal(junkLinkKey('deadbeef'), 'junk_link:deadbeef');
});

test('the principal is metered, not waived, and inherits nothing', () => {
  const p = principalFor('deadbeef') as Record<string, unknown>;
  assert.equal(p.id, 'junklink:deadbeef');
  // No app_metadata: aiSpend.isStaff reads it, and a truthy staff role would
  // waive metering entirely — the one outcome this whole module exists to stop.
  assert.ok(!('app_metadata' in p), 'a principal with app_metadata could read as staff');
  // No email: ceilingFor looks up feature_grant:{email} and would hand this
  // link whichever subscriber's ceiling that address happens to hold.
  assert.ok(!('email' in p), 'an email would inherit a subscription ceiling');
});

test('a link principal cannot collide with an account uuid', () => {
  // Budget rows are keyed by this id. A bare hash could in principle collide
  // with a real id; the namespace makes that impossible and makes the spend
  // table readable by a person.
  const p = principalFor('deadbeef');
  assert.ok(p.id.startsWith('junklink:'));
  assert.notEqual(p.id, 'deadbeef');
});

test('two links never share a budget', () => {
  assert.notEqual(principalFor('aaa').id, principalFor('bbb').id);
});

test('the url is a path, and survives a trailing slash on the app url', () => {
  assert.equal(junkLinkUrl('https://x.com', 'tok'), 'https://x.com/junk-quote/tok');
  assert.equal(junkLinkUrl('https://x.com/', 'tok'), 'https://x.com/junk-quote/tok');
  assert.equal(junkLinkUrl('https://x.com///', 'tok'), 'https://x.com/junk-quote/tok');
});

test('a token with url-unsafe characters survives the round trip', () => {
  // base64url should not produce these, but the link is pasted into SMS by
  // hand and this is the only place that could silently mangle one.
  const url = junkLinkUrl('https://x.com', 'a+b/c=');
  assert.equal(url, 'https://x.com/junk-quote/a%2Bb%2Fc%3D');
  assert.equal(decodeURIComponent(url.split('/junk-quote/')[1]), 'a+b/c=');
});
