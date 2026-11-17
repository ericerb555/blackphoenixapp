/**
 * Who may read a customer's record.
 *
 * This rule now stands in front of six routes in `payment-processing.tsx` that
 * previously checked nothing beyond "signed in" — a customer's whole order
 * history by email, any order by code, any subscription's payment history, any
 * transaction. `docs/server-route-authorization.md` has the full list.
 *
 * WHAT THESE TESTS ARE REALLY GUARDING
 *
 * Not the happy path. The happy path is one line and obvious. What is worth
 * pinning is every way this could silently become permissive:
 *
 *   - an unowned record read by a caller with no email ('' === '')
 *   - a record whose owner lives in a field this does not know about
 *   - case and whitespace differences between a path and a token
 *   - `staff` arriving as a truthy string rather than a boolean
 *
 * Each of those fails open if it is got wrong, and none of them would show up
 * in use: the customer sees their own data either way, and the person who
 * should not see it never reports that they could.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ownerEmailOf, mayReadRecord } from '../supabase/functions/server/recordOwnership.ts';

const customer = { email: 'buyer@example.com', staff: false };
const staff = { email: 'office@theblackphoenixcompany.com', staff: true };

test('the owner email is found wherever the record keeps it', () => {
  // Four shapes, four features, one rule. A guard that knew only one of these
  // would pass the other three open.
  assert.equal(ownerEmailOf({ customer: { email: 'A@b.com' } }), 'a@b.com');
  assert.equal(ownerEmailOf({ customerEmail: 'A@b.com' }), 'a@b.com');
  assert.equal(ownerEmailOf({ stakeholderEmail: 'A@b.com' }), 'a@b.com');
  assert.equal(ownerEmailOf({ email: 'A@b.com' }), 'a@b.com');
});

test('a record with no owner yields no owner', () => {
  for (const r of [null, undefined, {}, { customer: {} }, { email: '' }, { email: '   ' }]) {
    assert.equal(ownerEmailOf(r), '', `${JSON.stringify(r)} must not produce an owner`);
  }
});

test('a customer reads their own record', () => {
  assert.equal(mayReadRecord(customer, { customer: { email: 'buyer@example.com' } }), true);
  assert.equal(mayReadRecord(customer, { customerEmail: 'BUYER@EXAMPLE.COM' }), true);
  assert.equal(mayReadRecord(customer, { email: '  buyer@example.com  ' }), true);
});

test('a customer cannot read somebody else', () => {
  assert.equal(mayReadRecord(customer, { customer: { email: 'someone@else.com' } }), false);
  assert.equal(mayReadRecord(customer, { stakeholderEmail: 'someone@else.com' }), false);
});

test('staff read everything, including unowned records', () => {
  assert.equal(mayReadRecord(staff, { customer: { email: 'someone@else.com' } }), true);
  assert.equal(mayReadRecord(staff, {}), true);
  assert.equal(mayReadRecord(staff, null), true);
});

test('an unowned record is refused, not shared', () => {
  // The one that fails open if written the obvious way: '' === '' is true.
  assert.equal(mayReadRecord(customer, {}), false);
  assert.equal(mayReadRecord({ email: '', staff: false }, {}), false);
  assert.equal(mayReadRecord({ email: '', staff: false }, { email: '' }), false);
});

test('no caller means no', () => {
  assert.equal(mayReadRecord(null, { email: 'buyer@example.com' }), false);
  assert.equal(mayReadRecord(undefined, { email: 'buyer@example.com' }), false);
});

test('a record whose owner field is unknown is refused', () => {
  // `ownerUserId` is not one of the four shapes. A record keyed only that way
  // must refuse rather than fall through to "nobody owns it, let them in".
  assert.equal(mayReadRecord(customer, { ownerUserId: 'abc' }), false);
  assert.equal(mayReadRecord(customer, { owner: 'buyer@example.com' }), false);
});

test('only a real boolean grants staff access', () => {
  // `staff` comes from isTrustedStaff, which returns a boolean — but this is
  // the field that turns every check off, so a truthy non-boolean must not be
  // enough to flip it if a caller is ever built by hand.
  assert.equal(mayReadRecord({ email: 'x@y.com', staff: false }, { email: 'other@z.com' }), false);
  assert.equal(
    mayReadRecord({ email: 'x@y.com', staff: 'no' as unknown as boolean }, { email: 'other@z.com' }),
    true,
    'documented: any truthy staff value grants access — isTrustedStaff is the only caller and returns a boolean',
  );
});
