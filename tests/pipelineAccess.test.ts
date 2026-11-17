/**
 * Who may touch the pipeline board.
 *
 * Every route in `pipeline.tsx` had no authentication of any kind, and a
 * pipeline item carries the quote — its materials, its labour, its margins and
 * its total. So the figures a customer is about to sign were editable by anyone
 * who could name the job, and `POST /pipeline/items/batch` took an array and
 * `mset` it with no validation at all.
 *
 * The gates are three composed predicates, and these are the cases that decide
 * whether the fix holds: the roles that must get in, the roles that must not,
 * and the one that matters most — a portal guest who has written
 * `role: admin` into the bag they can write to.
 *
 * The route handlers themselves need a Hono context and a live Supabase, so
 * what is pinned here is the decision, which is the part that can be wrong
 * quietly.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { isTrustedStaff, trustedRole, STAFF_ROLE_SET } from '../supabase/functions/server/trustedRole.ts';

/** The field roles `pipeline.tsx` admits for creating an item. */
const FIELD_ROLES = new Set(['technician', 'field_technician', 'maintenance_tech']);

/** The same three decisions the router makes, over a user object. */
const decide = (user: any, admin = false) => {
  const role = trustedRole(user);
  const staff = Boolean(user) && (admin || isTrustedStaff(user));
  const crew = Boolean(user) && FIELD_ROLES.has(role);
  return {
    mayRead: staff,
    mayCreate: staff || crew,
    mayReprice: staff,
    mayDelete: admin,
  };
};

const as = (role: string) => ({ email: 'someone@example.com', app_metadata: { role } });

test('the office can read the board and reprice a job', () => {
  for (const role of ['owner', 'admin', 'management', 'staff', 'estimator', 'project_manager', 'office']) {
    const d = decide(as(role));
    assert.equal(d.mayRead, true, `${role} should read the board`);
    assert.equal(d.mayReprice, true, `${role} should reprice`);
  }
});

test('field crew may raise an item but not read the board or reprice', () => {
  // The change-order camera app posts one from somebody's phone on site. It
  // never lists the board, and a technician has no business repricing a job.
  for (const role of ['technician', 'field_technician', 'maintenance_tech']) {
    const d = decide(as(role));
    assert.equal(d.mayCreate, true, `${role} should be able to raise an item`);
    assert.equal(d.mayRead, false, `${role} should not read every job's pricing`);
    assert.equal(d.mayReprice, false, `${role} should not reprice`);
  }
});

test('portal guests are refused everything', () => {
  // These are the accounts the old routes were wide open to: anyone holding the
  // publishable anon key, which ships in the browser bundle.
  for (const role of ['customer', 'tenant', 'vendor', 'subcontractor', 'service_provider', 'user', '']) {
    const d = decide(as(role));
    assert.equal(d.mayRead, false, `${role || 'no role'} must not read the board`);
    assert.equal(d.mayCreate, false, `${role || 'no role'} must not create`);
    assert.equal(d.mayReprice, false, `${role || 'no role'} must not reprice`);
    assert.equal(d.mayDelete, false, `${role || 'no role'} must not delete`);
  }
});

test('a subcontractor is deliberately NOT field crew', () => {
  // `internalWorkAccess` lets a subcontractor read the notes on a job assigned
  // to them. That is not the same as being allowed to put a job on the
  // company's sales board, so the pipeline's crew set is narrower on purpose.
  const d = decide(as('subcontractor'));
  assert.equal(d.mayCreate, false);
});

test('the browser-writable bag decides nothing', () => {
  // THE ONE THAT MATTERS. A portal guest can write whatever they like into
  // `user_metadata` from the console — `supabase.auth.updateUser` is already
  // called by the landlord portal to change a display name, so the path is open
  // and in use. Authority is read from `app_metadata` and nowhere else.
  const liar = {
    email: 'guest@example.com',
    app_metadata: { role: 'customer' },
    user_metadata: { role: 'admin', accountType: 'owner' },
  };
  const d = decide(liar);
  assert.equal(d.mayRead, false);
  assert.equal(d.mayCreate, false);
  assert.equal(d.mayReprice, false);
  assert.equal(d.mayDelete, false);
});

test('no user at all is refused, not defaulted', () => {
  const d = decide(null);
  assert.equal(d.mayRead, false);
  assert.equal(d.mayCreate, false);
  assert.equal(d.mayReprice, false);
  assert.equal(d.mayDelete, false);
});

test('an admin may delete; staff alone may not', () => {
  // Deleting a job removes a record with money attached to it.
  assert.equal(decide(as('staff'), false).mayDelete, false);
  assert.equal(decide(as('estimator'), false).mayDelete, false);
  assert.equal(decide(as('owner'), true).mayDelete, true);
});

test('role spellings are normalised before they are judged', () => {
  // "Master Admin", "master-admin" and "master_admin" are one role. A gate that
  // compares raw strings lets the wrong spelling through or locks the right
  // person out.
  assert.equal(trustedRole({ app_metadata: { role: 'Master Admin' } }), 'master_admin');
  assert.equal(trustedRole({ app_metadata: { role: 'project-manager' } }), 'project_manager');
  assert.equal(isTrustedStaff({ app_metadata: { role: 'Master Admin' } }), true);
});

test('the crew roles are not quietly inside the staff set', () => {
  // If they were, the narrower create-only tier would be meaningless and a
  // technician would be reading every job's margin.
  for (const role of FIELD_ROLES) {
    assert.equal(STAFF_ROLE_SET.has(role), false, `${role} should not be in STAFF_ROLE_SET`);
  }
});
