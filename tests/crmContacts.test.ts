/**
 * Everybody who arrives in the app reaches the CRM, once.
 *
 * Eric, 2026-11-19: *"can we make sure that when people add into the app he
 * get put into the crm"*.
 *
 * THE DEFECT, AND WHY NOTHING CAUGHT IT
 *
 * The CRM is the array at `crm_contacts:default`. Signup wrote a record at
 * `customer:{id}` and logged `✅ [CRM] Added signup to CRM: …` on the next
 * line. Two different stores, and the log named the intention rather than
 * what happened — so the server reported success and the CRM stayed empty.
 *
 * Counted on the live data before the fix: 0 of 9 customers were in the CRM,
 * 0 of 3 user profiles, and 5 of 10 portal grants. The only arrivals that
 * landed were job applications, because that one flow wrote the array
 * directly with its own inline copy of the contact shape.
 *
 * A refusal would have been visible. A write to the wrong key is not, which
 * is why the test below asserts the KEY and not merely that something was
 * saved.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CRM_CONTACTS_KEY, upsertCrmContact, mergeCrmContact, crmContactFrom,
  bestStatus, nameOf, normaliseEmail,
} from '../supabase/functions/server/crmContacts.ts';

/** A kv stand-in that records exactly which keys were touched. */
function fakeStore(initial: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = { ...initial };
  const writes: string[] = [];
  return {
    data,
    writes,
    get: async (key: string) => data[key],
    set: async (key: string, value: unknown) => { data[key] = value; writes.push(key); return value; },
  };
}

/* ── it goes into the CRM, and the CRM is a specific key ─────────────────── */

test('a new arrival lands in crm_contacts:default', async () => {
  const store = fakeStore();
  const { created, contact } = await upsertCrmContact(store, {
    email: 'Jane@Example.com ', name: 'Jane Doe', phone: '603-555-0101',
    type: 'customer', source: 'signup', tags: ['signup'],
  });

  assert.equal(created, true);
  assert.deepEqual(store.writes, [CRM_CONTACTS_KEY], 'it must write the CRM array and nothing else');
  const list = store.data[CRM_CONTACTS_KEY] as any[];
  assert.equal(list.length, 1);
  assert.equal(list[0].email, 'jane@example.com', 'the email is normalised, because every lookup compares it');
  assert.equal(list[0].name, 'Jane Doe');
  assert.equal(contact.type, 'customer');
});

test('the same person arriving twice is one contact, not two', async () => {
  const store = fakeStore();
  await upsertCrmContact(store, { email: 'jane@example.com', name: 'Jane Doe', source: 'signup' });
  const { created } = await upsertCrmContact(store, { email: 'JANE@example.com', name: 'Jane Doe', source: 'signup' });

  assert.equal(created, false, 'the second arrival updated rather than inserted');
  assert.equal((store.data[CRM_CONTACTS_KEY] as any[]).length, 1);
});

test('a contact with no email is refused rather than written', async () => {
  const store = fakeStore();
  await assert.rejects(() => upsertCrmContact(store, { email: '  ' }), /needs an email/);
  assert.deepEqual(store.writes, [], 'nothing was written');
});

/* ── the merge rules: a later arrival must not lose what we already knew ── */

test('a signup does not blank the company an application captured', () => {
  const prior = { email: 'dana@example.com', name: 'Dana Whitfield', company: 'Granite State Building', phone: '603-555-0188' };
  const merged = mergeCrmContact(prior, { email: 'dana@example.com', name: 'Dana Whitfield', source: 'signup' });

  assert.equal(merged.company, 'Granite State Building', 'the company survived a signup that never mentioned it');
  assert.equal(merged.phone, '603-555-0188');
});

test('an empty string is silence, not a correction', () => {
  const prior = { email: 'd@example.com', phone: '603-555-0188', company: 'Granite State' };
  const merged = mergeCrmContact(prior, { email: 'd@example.com', phone: '', company: '   ' });
  assert.equal(merged.phone, '603-555-0188');
  assert.equal(merged.company, 'Granite State');
});

test('status is promoted and never demoted', () => {
  // Signing up when you are already an active customer must not reset you.
  assert.equal(bestStatus('active', 'lead'), 'active');
  assert.equal(bestStatus('vip', 'active'), 'vip');
  assert.equal(bestStatus('lead', 'active'), 'active');
  assert.equal(bestStatus(undefined, undefined), 'lead');
  assert.equal(bestStatus('nonsense', undefined), 'lead', 'an unrecognised status reads as a lead, as /customers treats it');

  const merged = mergeCrmContact({ email: 'a@b.c', status: 'vip' }, { email: 'a@b.c', source: 'signup' });
  assert.equal(merged.status, 'vip');
});

test('tags accumulate, because no later arrival makes an earlier route untrue', () => {
  const prior = { email: 'a@b.c', tags: ['application', 'vendor'] };
  const merged = mergeCrmContact(prior, { email: 'a@b.c', tags: ['signup', 'vendor'] });
  assert.deepEqual(merged.tags, ['application', 'vendor', 'signup'], 'merged, deduplicated, order kept');
});

test('source keeps the first one, because it answers where they came from', () => {
  const merged = mergeCrmContact({ email: 'a@b.c', source: 'application' }, { email: 'a@b.c', source: 'signup' });
  assert.equal(merged.source, 'application', 'overwriting with signup would erase what actually brought them in');

  // And somebody genuinely new takes the source of their first arrival.
  assert.equal(mergeCrmContact(undefined, { email: 'a@b.c', source: 'signup' }).source, 'signup');
  assert.equal(mergeCrmContact(undefined, { email: 'a@b.c' }).source, 'crm', 'never undefined');
});

test('an existing id is kept, so references to the contact survive', () => {
  const merged = mergeCrmContact({ email: 'a@b.c', id: 'applicant_123' }, { email: 'a@b.c', userId: 'user_999' });
  assert.equal(merged.id, 'applicant_123');
});

test('a new contact takes the auth user id when there is one', () => {
  assert.equal(mergeCrmContact(undefined, { email: 'a@b.c', userId: 'user_999' }).id, 'user_999');
  assert.match(String(mergeCrmContact(undefined, { email: 'a@b.c' }).id), /^crm_/, 'and invents one otherwise');
});

test('createdAt is the first arrival, updatedAt is this one', () => {
  const merged = mergeCrmContact(
    { email: 'a@b.c', createdAt: '2026-01-01T00:00:00.000Z' },
    { email: 'a@b.c' },
    '2026-11-19T12:00:00.000Z',
  );
  assert.equal(merged.createdAt, '2026-01-01T00:00:00.000Z');
  assert.equal(merged.updatedAt, '2026-11-19T12:00:00.000Z');
});

/* ── the small pieces ────────────────────────────────────────────────────── */

test('a name comes from whichever fields they gave', () => {
  assert.equal(nameOf({ email: '', name: 'Jane Doe' }), 'Jane Doe');
  assert.equal(nameOf({ email: '', firstName: 'Jane', lastName: 'Doe' }), 'Jane Doe');
  assert.equal(nameOf({ email: '', firstName: 'Jane' }), 'Jane');
  assert.equal(nameOf({ email: '' }), '');
});

test('emails normalise the way the lookups compare them', () => {
  assert.equal(normaliseEmail('  Jane@Example.COM '), 'jane@example.com');
  assert.equal(normaliseEmail(null), '');
});

test('a blank field is left off the contact rather than stored as empty', () => {
  const contact = crmContactFrom({ email: 'a@b.c', name: '', phone: '  ', company: undefined });
  assert.equal('name' in contact, false);
  assert.equal('phone' in contact, false);
  assert.equal('company' in contact, false);
  assert.equal(contact.email, 'a@b.c');
});

/* ── the call site, at the source ────────────────────────────────────────── */

/**
 * The helper being right proves nothing about whether signup calls it, and
 * the entire defect was a call that went to the wrong store while logging
 * that it had gone to the right one.
 */
test('signup writes the CRM, and no longer claims it without doing it', async () => {
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const code = readFileSync(
    join(import.meta.dirname, '..', 'supabase/functions/server/auth.tsx'), 'utf8',
  )
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  assert.match(code, /upsertCrmContact\(/, 'signup no longer puts anybody into the CRM');
  assert.doesNotMatch(
    code, /Added signup to CRM/,
    'the log line that claimed the CRM write is back, and it is still not the CRM',
  );
});
