/**
 * The audit trail for consumer-report pulls.
 *
 * Four properties, and the last is the one that matters most because this is
 * the record kept longest:
 *
 *   - entries bucket by month, so "every report requested in March" is a prefix
 *     scan rather than a scan of everything ever written
 *   - an unreadable timestamp is filed as `unknown`, never guessed into a month
 *   - only terminal outcomes are audited; the intermediate steps are noise
 *   - the record is an ALLOW-LIST, so a caller who passes a whole order in
 *     cannot archive a report body, a score, or anything else unnamed
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  auditEntry,
  auditKey,
  auditMonth,
  auditMonthPrefix,
  AUDIT_FIELDS,
  AUDIT_PREFIX,
} from '../supabase/functions/server/screeningAudit.ts';
import { auditEventFor, SCREENING_STATES } from '../supabase/functions/server/screeningOrder.ts';

const AT = '2026-03-14T09:30:00.000Z';

const input = {
  event: 'requested' as const,
  orderId: 'scr_1',
  landlordEmail: 'Landlord@Example.com',
  certifiedBy: 'Landlord@Example.com',
  permissiblePurpose: 'tenancy_application',
  provider: 'manual',
  applicantName: 'Jo Smith',
  applicantEmail: 'JO@example.com ',
  propertyState: 'nh',
  at: AT,
};

/* ── where entries live ───────────────────────────────────────────────────── */

test('an entry belongs to the month it happened in', () => {
  assert.equal(auditMonth(AT), '2026-03');
  assert.equal(auditMonth('2026-12-31T23:59:59.000Z'), '2026-12');
});

test('an unreadable timestamp is filed as unknown, not guessed', () => {
  // A misfiled audit entry is worse than an obviously odd one, because the
  // misfiled one is invisible.
  assert.equal(auditMonth('last March'), 'unknown');
  assert.equal(auditMonth(''), 'unknown');
  assert.equal(auditMonth(undefined as any), 'unknown');
});

test('the key carries the month, the instant and the id', () => {
  const record = auditEntry(input, 'aud_1');
  const key = auditKey(record);
  assert.ok(key.startsWith(auditMonthPrefix('2026-03')), key);
  assert.ok(key.includes(AT));
  assert.ok(key.endsWith('aud_1'));
});

test('the month prefix is what answers an audit question', () => {
  assert.equal(auditMonthPrefix('2026-03'), `${AUDIT_PREFIX}2026-03:`);
  // Two entries in the same month share the prefix; different months do not.
  const march = auditKey(auditEntry({ ...input, at: '2026-03-01T00:00:00.000Z' }, 'a'));
  const april = auditKey(auditEntry({ ...input, at: '2026-04-01T00:00:00.000Z' }, 'b'));
  assert.ok(march.startsWith(auditMonthPrefix('2026-03')));
  assert.equal(april.startsWith(auditMonthPrefix('2026-03')), false);
});

test('entries within a month sort chronologically by key', () => {
  const early = auditKey(auditEntry({ ...input, at: '2026-03-01T00:00:00.000Z' }, 'a'));
  const late = auditKey(auditEntry({ ...input, at: '2026-03-28T00:00:00.000Z' }, 'b'));
  assert.ok(early < late);
});

/* ── which transitions are audited ────────────────────────────────────────── */

test('only the terminal outcomes are audited', () => {
  assert.equal(auditEventFor('complete'), 'completed');
  assert.equal(auditEventFor('failed'), 'failed');
  for (const s of SCREENING_STATES) {
    if (s === 'complete' || s === 'failed') continue;
    assert.equal(auditEventFor(s), null, `${s} should not produce an audit entry`);
  }
});

test('expiry is not an audit event', () => {
  // An invitation nobody used is not a report anybody pulled.
  assert.equal(auditEventFor('expired'), null);
});

/* ── the record is an allow-list ──────────────────────────────────────────── */

test('a report body cannot reach the audit log, however it is passed in', () => {
  // The property that matters most: this record outlives the order, so anything
  // that leaks in here is kept the longest.
  const record = auditEntry({
    ...input,
    // The shapes a careless caller might spread in.
    reportBody: 'FULL CREDIT REPORT …',
    creditScore: 712,
    ssn: '000-00-0000',
    dateOfBirth: '1990-01-01',
    score: 712,
  } as any, 'aud_1');

  for (const leaked of ['reportBody', 'creditScore', 'ssn', 'dateOfBirth', 'score']) {
    assert.equal(leaked in record, false, `${leaked} must not be stored`);
  }
  assert.deepEqual(Object.keys(record).sort(), [...AUDIT_FIELDS].sort());
});

test('the entry keeps what an audit needs to identify the pull', () => {
  const record = auditEntry(input, 'aud_1');
  assert.equal(record.orderId, 'scr_1');
  assert.equal(record.permissiblePurpose, 'tenancy_application');
  assert.equal(record.applicantName, 'Jo Smith');
  assert.equal(record.event, 'requested');
});

test('emails are normalised and the state is upper-cased', () => {
  // So an audit grouped by landlord does not split on capitalisation.
  const record = auditEntry(input, 'aud_1');
  assert.equal(record.landlordEmail, 'landlord@example.com');
  assert.equal(record.applicantEmail, 'jo@example.com');
  assert.equal(record.propertyState, 'NH');
});

test('absent fields are null rather than empty strings', () => {
  const record = auditEntry({ event: 'failed', orderId: 'scr_2', at: AT }, 'aud_2');
  assert.equal(record.landlordEmail, null);
  assert.equal(record.providerRef, null);
  assert.equal(record.note, null);
  assert.equal(record.propertyState, null);
});

test('a note is truncated, because it is a reason and not a payload', () => {
  const record = auditEntry({ ...input, note: 'x'.repeat(5000) }, 'aud_1');
  assert.equal(record.note?.length, 300);
});

test('an entry with no timestamp of its own is stamped now', () => {
  const record = auditEntry({ event: 'requested', orderId: 'scr_3' }, 'aud_3', AT);
  assert.equal(record.at, AT);
  assert.equal(auditMonth(record.at), '2026-03');
});
