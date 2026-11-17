/**
 * Who may hand out which role.
 *
 * This is the one check standing between "an administrator manages the crew"
 * and "an administrator promotes themselves to owner". It is pure, so every
 * branch is cheap to assert, and the cost of being wrong is the whole
 * company — so every branch is asserted.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  mayAssignRole, normalizeRole, ASSIGNABLE_ROLES,
} from '../supabase/functions/server/accountStanding.ts';

const owner = { role: 'owner', email: 'eric@theblackphoenixcompany.com' };
const admin = { role: 'admin', email: 'office@theblackphoenixcompany.com' };
const employee = { role: 'employee', email: 'tech@theblackphoenixcompany.com' };
const estimator = { role: 'estimator', email: 'est@theblackphoenixcompany.com' };
const customer = { role: 'customer', email: 'buyer@example.com' };

test('an owner may promote an employee to anything on the list', () => {
  for (const role of ASSIGNABLE_ROLES) {
    const verdict = mayAssignRole(owner, employee, role);
    assert.equal(verdict.allowed, true, `owner should be able to assign ${role}`);
  }
});

test('an owner may appoint another owner', () => {
  assert.equal(mayAssignRole(owner, admin, 'owner').allowed, true);
});

test('an administrator may move somebody between employee roles', () => {
  assert.equal(mayAssignRole(admin, employee, 'project_manager').allowed, true);
  assert.equal(mayAssignRole(admin, estimator, 'office').allowed, true);
});

test('an administrator cannot mint a second administrator', () => {
  const verdict = mayAssignRole(admin, employee, 'admin');
  assert.equal(verdict.allowed, false);
  assert.match(verdict.reason, /owner can grant/i);
});

test('an administrator cannot make anybody an owner', () => {
  assert.equal(mayAssignRole(admin, employee, 'owner').allowed, false);
});

test('an administrator cannot touch an owner or another administrator', () => {
  const atOwner = mayAssignRole(admin, owner, 'employee');
  assert.equal(atOwner.allowed, false);
  assert.match(atOwner.reason, /only an owner/i);

  const atPeer = mayAssignRole(admin, { role: 'admin', email: 'other@x.com' }, 'employee');
  assert.equal(atPeer.allowed, false);
});

/**
 * The demotion case is the one that actually happens.
 *
 * Self-promotion is what you think of first and it is refused here, but the
 * expensive accident is a sole owner picking "Employee" from the dropdown on
 * their own row: the screen that would undo it is the screen they just locked
 * themselves out of.
 */
test('nobody may change their own role, owner included', () => {
  const self = mayAssignRole(owner, { ...owner }, 'employee');
  assert.equal(self.allowed, false);
  assert.match(self.reason, /your own role/i);

  assert.equal(mayAssignRole(admin, { ...admin }, 'owner').allowed, false);
});

test('a differently-cased or spaced email is still the same person', () => {
  const verdict = mayAssignRole(
    { role: 'owner', email: 'Eric@TheBlackPhoenixCompany.com' },
    owner,
    'employee',
  );
  assert.equal(verdict.allowed, false, 'case alone must not defeat the self-check');
});

test('a customer, vendor or tenant may assign nothing', () => {
  for (const role of ['customer', 'vendor', 'tenant', 'subcontractor', '']) {
    const verdict = mayAssignRole({ role, email: 'x@example.com' }, employee, 'employee');
    assert.equal(verdict.allowed, false, `${role || '(no role)'} must be refused`);
    assert.match(verdict.reason, /administrator access/i);
  }
});

/**
 * An unrecognised role is refused rather than written.
 *
 * It would not fail safe. The string lands in `app_metadata`, every
 * `STAFF_ROLE_SET` check answers no, and the account looks broken rather than
 * restricted.
 */
test('a role that is not on the list is refused, however it is spelled', () => {
  for (const role of ['superuser', 'root', 'Owner Of Everything', 'tenant', '']) {
    assert.equal(mayAssignRole(owner, employee, role).allowed, false, `${role} must be refused`);
  }
});

test('an unidentified account on either side is refused', () => {
  assert.equal(mayAssignRole({ role: 'owner', email: '' }, employee, 'employee').allowed, false);
  assert.equal(mayAssignRole(owner, { role: 'employee', email: '' }, 'employee').allowed, false);
});

test('role spelling is normalised before any of this is decided', () => {
  assert.equal(normalizeRole('Project Manager'), 'project_manager');
  assert.equal(normalizeRole('super-admin'), 'super_admin');
  assert.equal(normalizeRole('  '), '');
  // And the decision honours it: a spaced role still reads as the owner it is.
  assert.equal(mayAssignRole({ role: 'Business Owner', email: 'a@x.com' }, employee, 'admin').allowed, true);
});

test('a customer account can be given a staff role by an owner', () => {
  // Hiring somebody who was already a customer is an ordinary thing to do.
  assert.equal(mayAssignRole(owner, customer, 'employee').allowed, true);
  // An administrator cannot, because the target is not already staff.
  assert.equal(mayAssignRole(admin, customer, 'employee').allowed, false);
});

/**
 * Inviting is a different question from re-roling.
 *
 * An invitee holds no role yet, and `mayAssignRole`'s protection of existing
 * accounts reads a blank role as "not an employee" — which would have refused
 * every invitation an administrator ever sent.
 */
test('an administrator may invite crew but not a peer', async () => {
  const { mayInviteAs } = await import('../supabase/functions/server/accountStanding.ts');

  assert.equal(mayInviteAs(admin, 'employee').allowed, true);
  assert.equal(mayInviteAs(admin, 'project_manager').allowed, true);

  const peer = mayInviteAs(admin, 'admin');
  assert.equal(peer.allowed, false);
  assert.match(peer.reason, /only an owner/i);
  assert.equal(mayInviteAs(admin, 'owner').allowed, false);
});

test('an owner may invite at any assignable role, and nobody else may invite at all', async () => {
  const { mayInviteAs, ASSIGNABLE_ROLES: roles } = await import('../supabase/functions/server/accountStanding.ts');

  for (const role of roles) {
    assert.equal(mayInviteAs(owner, role).allowed, true, `owner should be able to invite ${role}`);
  }
  assert.equal(mayInviteAs(customer, 'employee').allowed, false);
  assert.equal(mayInviteAs({ role: 'owner', email: '' }, 'employee').allowed, false);
  assert.equal(mayInviteAs(owner, 'tenant').allowed, false);
});

/*
 * THE ROUTE AROUND THE FUNCTION
 *
 * `mayAssignRole` is pure and every branch of it is asserted above. Two
 * defects found reviewing POST /team/members/role on 2026-11-17 were not in
 * the function at all — they were in what the route did before and after
 * asking it. Asserted against the source, in the pattern
 * `clientRoleAuthority.test.ts` established, because the handler needs a
 * Supabase admin client and a Hono context to run and these are the two
 * lines a future edit would drop.
 */
const routeSource = readFileSync(
  join(import.meta.dirname, '..', 'supabase/functions/server/teamDirectory.ts'),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('the role route refuses a target who is not staff', () => {
  /*
   * The target is found in the WHOLE account directory while the screen lists
   * staff only, and an owner may assign any role — so a customer's address in
   * the body produced a staff role with no portal, organisation or feature
   * grant. The same objection the route's own 404 makes about a non-existent
   * account applies to an existing non-staff one.
   */
  assert.match(
    routeSource,
    /if \(!STAFF_ROLE_SET\.has\(currentRole\)\)/,
    'a non-staff target is assignable a staff role again',
  );
});

test('the role route reports the account standing it actually found', () => {
  // `toMember(target, new Set())` makes `active` unconditionally true, so
  // re-roling a deactivated person drew them as active until the next reload.
  assert.doesNotMatch(
    routeSource,
    /toMember\(target, new Set\(\)\)/,
    'the reply claims every account is active again',
  );
  assert.match(routeSource, /account_deactivation:\$\{targetEmail\}/);
});
