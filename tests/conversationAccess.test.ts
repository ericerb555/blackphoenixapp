/**
 * Who may read a conversation.
 *
 * The hole this closes: `/messaging/conversations/:convId/messages` took an id
 * and returned every message in it with no ownership check — any signed-in
 * account could read anybody's thread with the company, and the ids are
 * `conv_{timestamp}`. The listing route was the same from the other side: it
 * took a userId from the path and an email from the query and answered with
 * whatever matched, both supplied by the caller.
 *
 * So the assertions that matter here are the refusals.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mayReadConversation, visibleConversations, staffInbox, isStaffParticipant,
} from '../supabase/functions/server/conversationAccess.ts';

const customer = { email: 'wanda@example.com', userId: 'uuid-wanda', isStaff: false };
const other = { email: 'nosy@vendor.com', userId: 'uuid-nosy', isStaff: false };
const owner = { email: 'eric@example.com', userId: '1a9f3ae4', isStaff: true };

// The three spellings of the company side actually present in production.
const byLiteral = {
  participants: [
    { userId: 'admin', userRole: 'admin', userName: 'Black Phoenix Team' },
    { userId: 'wanda@example.com', userRole: 'customer', userName: 'Wanda' },
  ],
};
const byUuid = {
  participants: [
    { userId: '1a9f3ae4', userRole: 'admin', userName: 'Black Phoenix Team' },
    { userId: 'wanda@example.com', userRole: 'customer', userName: 'Wanda' },
  ],
};
const betweenOthers = {
  participants: [
    { userId: 'someone@else.com', userRole: 'customer' },
    { userId: 'third@party.com', userRole: 'vendor' },
  ],
};

// ── The refusals ──────────────────────────────────────────────────────────

test('A SIGNED-IN STRANGER CANNOT READ SOMEBODY ELSE\'S THREAD', () => {
  assert.equal(mayReadConversation(byLiteral, other), false);
  assert.equal(mayReadConversation(byUuid, other), false);
});

test('an unidentifiable actor reads nothing', () => {
  assert.equal(mayReadConversation(byLiteral, { email: '', userId: '', isStaff: false }), false);
  assert.equal(mayReadConversation(byLiteral, { email: '', userId: '', isStaff: true }), false,
    'not even claiming staff, without an identity');
  assert.equal(mayReadConversation(byLiteral, null), false);
});

/**
 * Staff get the company's inbox, not a key to the whole platform. A thread
 * between two other parties is still not theirs to open.
 */
test('STAFF DO NOT GET A BLANKET KEY — only threads the company is in', () => {
  assert.equal(mayReadConversation(betweenOthers, owner), false);
  assert.equal(mayReadConversation(byLiteral, owner), true, 'but the company inbox, yes');
});

test('a conversation with no participants is not readable', () => {
  assert.equal(mayReadConversation({}, owner), false);
  assert.equal(mayReadConversation({ participants: [] }, owner), false);
  assert.equal(mayReadConversation(null, owner), false);
});

// ── The permissions ───────────────────────────────────────────────────────

test('a customer reads the thread they are in', () => {
  assert.equal(mayReadConversation(byLiteral, customer), true);
  assert.equal(mayReadConversation(byUuid, customer), true);
});

/**
 * `userId` holds an email on some rows and a UUID on others — both are in
 * production. Either identifier must match either field, or the fix works for
 * whichever spelling was written last and silently fails for the rest.
 */
test('the viewer matches on email OR on auth id, against either field', () => {
  const byUserEmailField = { participants: [{ userId: 'x', userEmail: 'wanda@example.com' }] };
  assert.equal(mayReadConversation(byUserEmailField, customer), true);

  const byAuthId = { participants: [{ userId: 'uuid-wanda' }] };
  assert.equal(mayReadConversation(byAuthId, customer), true);
});

test('matching ignores case and surrounding space', () => {
  const messy = { participants: [{ userId: '  WANDA@Example.com ' }] };
  assert.equal(mayReadConversation(messy, customer), true);
});

test('a customer named only in the metadata still reaches their thread', () => {
  const viaMetadata = {
    participants: [{ userId: 'admin', userRole: 'admin' }],
    metadata: { customerEmail: 'wanda@example.com' },
  };
  assert.equal(mayReadConversation(viaMetadata, customer), true);
  assert.equal(mayReadConversation(viaMetadata, other), false, 'and nobody else does');
});

test('staff read the company inbox whichever way the company side is spelled', () => {
  assert.equal(mayReadConversation(byLiteral, owner), true, 'literal "admin"');
  assert.equal(mayReadConversation(byUuid, owner), true, 'the owner UUID');
});

// ── Listing ───────────────────────────────────────────────────────────────

test('a listing shows only what the viewer may read', () => {
  const all = [byLiteral, byUuid, betweenOthers];
  assert.equal(visibleConversations(all, customer).length, 2);
  assert.equal(visibleConversations(all, other).length, 0, 'the nosy vendor sees nothing');
  assert.equal(visibleConversations(all, owner).length, 2, 'the company inbox, not the third thread');
});

test('a broken list does not throw or leak', () => {
  assert.deepEqual(visibleConversations([null, undefined] as any, owner), []);
  assert.deepEqual(visibleConversations([], owner), []);
  assert.deepEqual(visibleConversations([byLiteral], null), []);
});

// ── The staff inbox, without a magic id ───────────────────────────────────

/**
 * The inbox asked for participant id `blackphoenix-admin`. None of the four
 * real conversations uses it — the company side is `admin` twice and the
 * owner's UUID twice — so the inbox was empty while a real customer waited.
 * Asking for the ROLE catches every spelling.
 */
test('THE STAFF INBOX FINDS ALL THREE SPELLINGS, including the one that never matched', () => {
  const byMagicId = {
    participants: [{ userId: 'blackphoenix-admin', userRole: 'admin' }, { userId: 'c@x.com', userRole: 'customer' }],
  };
  const inbox = staffInbox([byLiteral, byUuid, byMagicId, betweenOthers]);
  assert.equal(inbox.length, 3);
  assert.equal(inbox.includes(betweenOthers as any), false, 'and not a thread the company is not in');
});

test('every company-side role counts as staff on a thread', () => {
  for (const userRole of ['admin', 'owner', 'staff', 'employee', 'ADMIN']) {
    assert.equal(isStaffParticipant({ userRole }), true, userRole);
  }
  for (const userRole of ['customer', 'vendor', 'tenant', '', undefined]) {
    assert.equal(isStaffParticipant({ userRole } as any), false, String(userRole));
  }
});

test('the inbox is empty rather than broken when there is nothing in it', () => {
  assert.deepEqual(staffInbox([]), []);
  assert.deepEqual(staffInbox([null, undefined] as any), []);
  assert.deepEqual(staffInbox([betweenOthers]), []);
});
