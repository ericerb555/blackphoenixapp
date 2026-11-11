/**
 * The two things a keyed lead store can get silently wrong.
 *
 * A lead listing must never sweep up the email pointers, and an address must
 * normalise identically on write and on lookup — a mismatch on either lets the
 * same person become two leads, which is exactly the dedup the store exists to
 * provide, broken without an error to show for it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LEAD_PREFIX, LEAD_EMAIL_PREFIX, normalizeEmail, leadKey, emailPointerKey, sortByCapturedDesc,
} from '../supabase/functions/server/leadsKeys.ts';

test('the lead listing prefix does not match an email pointer key', () => {
  // getByPrefix(LEAD_PREFIX) compiles to LIKE 'lead:%'. A pointer key must fall
  // outside that, or every listing double-counts and leaks the pointers.
  const pointer = emailPointerKey('a@b.com');
  assert.ok(!pointer.startsWith(LEAD_PREFIX), `${pointer} must not start with ${LEAD_PREFIX}`);
  assert.ok(pointer.startsWith(LEAD_EMAIL_PREFIX));
});

test('an email normalises the same on the pointer as on a bare normalise', () => {
  for (const raw of ['  JANE@Example.COM ', 'jane@example.com', 'JANE@EXAMPLE.COM']) {
    assert.equal(emailPointerKey(raw), `${LEAD_EMAIL_PREFIX}jane@example.com`,
      `${JSON.stringify(raw)} forked the key`);
  }
});

test('normalizeEmail is total: junk in, empty string out, never a throw', () => {
  assert.equal(normalizeEmail(null), '');
  assert.equal(normalizeEmail(undefined), '');
  assert.equal(normalizeEmail(42), '42');
  assert.equal(normalizeEmail('  A@B.com '), 'a@b.com');
});

test('a lead key carries the id verbatim', () => {
  assert.equal(leadKey('lead_123'), 'lead:lead_123');
  assert.equal(leadKey('application_lead_x'), 'lead:application_lead_x');
});

test('listing order is newest first, and missing dates sort last', () => {
  const sorted = sortByCapturedDesc([
    { id: 'a', capturedAt: '2026-01-01T00:00:00Z' },
    { id: 'b', capturedAt: '2026-06-01T00:00:00Z' },
    { id: 'c' },
  ]);
  assert.deepEqual(sorted.map((l) => l.id), ['b', 'a', 'c']);
});

test('sort does not mutate the input array', () => {
  const input = [{ id: 'a', capturedAt: '1' }, { id: 'b', capturedAt: '2' }];
  sortByCapturedDesc(input);
  assert.deepEqual(input.map((l) => l.id), ['a', 'b']);
});
