/**
 * Telling two refusals apart when creating a provider organisation.
 *
 * WHY THIS MATTERS MORE THAN IT LOOKS
 *
 * Two unique constraints refuse the same insert and they mean opposite things.
 * An email clash means this company is already here and should be adopted. A
 * slug clash means a DIFFERENT company took the name and this one needs its own.
 *
 * Getting it wrong in one direction merges two genuinely different firms into
 * one organisation, putting one company's people inside the other's where they
 * could read sealed bids. Getting it wrong in the other direction is what
 * actually happened: the retry handed the second insert a fresh slug and one
 * vendor ended up with two organisations 160 milliseconds apart.
 *
 * Both refusals carry the same Postgres error code, so only the constraint name
 * separates them.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isDuplicateEmail, UNIQUE_VIOLATION, EMAIL_CONSTRAINT,
} from '../supabase/functions/server/orgConflict.ts';

const emailClash = {
  code: '23505',
  message: 'duplicate key value violates unique constraint "organizations_type_email_uniq"',
};

const slugClash = {
  code: '23505',
  message: 'duplicate key value violates unique constraint "organizations_slug_key"',
};

test('the email constraint means this company is already here', () => {
  assert.equal(isDuplicateEmail(emailClash), true);
});

test('a slug clash is a different company and must not be adopted', () => {
  assert.equal(isDuplicateEmail(slugClash), false,
    'adopting here would merge two genuinely different firms into one organisation');
});

test('the error code alone is not enough to decide', () => {
  assert.equal(emailClash.code, slugClash.code,
    'both refusals are 23505 — only the constraint name separates them');
  assert.equal(UNIQUE_VIOLATION, '23505');
});

test('the constraint is matched however the message is cased', () => {
  assert.equal(isDuplicateEmail({
    code: '23505',
    message: `DUPLICATE KEY VALUE VIOLATES UNIQUE CONSTRAINT "${EMAIL_CONSTRAINT.toUpperCase()}"`,
  }), true);
});

/* ── anything unrecognised falls through rather than adopting ────────────── */

test('a different error code is not a duplicate', () => {
  assert.equal(isDuplicateEmail({ code: '23503', message: EMAIL_CONSTRAINT }), false,
    'a foreign key violation naming the constraint is still not a duplicate');
});

test('no error at all is not a duplicate', () => {
  assert.equal(isDuplicateEmail(null), false);
  assert.equal(isDuplicateEmail(undefined), false);
});

test('rubbish is not a duplicate', () => {
  assert.equal(isDuplicateEmail('23505'), false, 'a bare string carries no constraint name');
  assert.equal(isDuplicateEmail(23505 as any), false);
  assert.equal(isDuplicateEmail({}), false);
});

test('an unrecognised unique violation is not adopted', () => {
  assert.equal(isDuplicateEmail({
    code: '23505',
    message: 'duplicate key value violates unique constraint "some_future_constraint"',
  }), false,
    'an unknown refusal must surface as an error, never silently adopt some other organisation');
});
