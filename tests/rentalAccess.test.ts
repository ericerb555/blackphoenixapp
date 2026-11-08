/**
 * The three decisions every rental route opens with.
 *
 * ~80 routes under `/landlord`, `/tenant`, `/screening` and the manager queues
 * ask one of these before doing anything, so a branch that is wrong here is
 * wrong on all of them simultaneously — and the two failure directions are
 * both quiet. Too strict and an approved landlord gets 403 on their own
 * building; too loose and a manager reads somebody else's.
 *
 * What these pin, in order of how expensive the mistake would be:
 *
 *   - the landlord/manager ASYMMETRY. Landlord accepts the legacy
 *     `property_manager` access key; manager does not accept `landlord`.
 *     Symmetry here is a privilege escalation, and it looks like tidying up.
 *   - assignment matching on an EMPTY id or email. `String(undefined) === ''`
 *     on both sides makes every unassigned request belong to everybody.
 *   - the quota default. An unreadable subscription store has to land on
 *     Tier 1, not on zero and not on unlimited.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeRole, accessIsActive, isLandlord, isPropertyManager,
  assignedToManager, subPortalPlan, TENANT_SUBPORTAL_QUOTA,
  managerAccessAnswersLandlord,
} from '../supabase/functions/server/rentalAccess.ts';

const active = { status: 'active' };
const pending = { status: 'pending' };

/* ── role spellings ──────────────────────────────────────────────────────── */

test('the three spellings of a manager role are one role', () => {
  assert.equal(normalizeRole('Property Manager'), 'property_manager');
  assert.equal(normalizeRole('property-manager'), 'property_manager');
  assert.equal(normalizeRole('property_manager'), 'property_manager');
});

test('a missing role is the empty string, not a crash', () => {
  assert.equal(normalizeRole(undefined), '');
  assert.equal(normalizeRole(null), '');
});

test('only an active access record counts, matched exactly', () => {
  assert.equal(accessIsActive(active), true);
  assert.equal(accessIsActive(pending), false);
  assert.equal(accessIsActive(null), false);
  assert.equal(accessIsActive(undefined), false);
  // Not case-insensitive. Our approval code writes lowercase, and loosening
  // an authorisation check to accept a spelling nothing produces is a widening
  // for no gain.
  assert.equal(accessIsActive({ status: 'ACTIVE' }), false);
});

/* ── the asymmetry ───────────────────────────────────────────────────────── */

test('the legacy property-manager key still admits a landlord', () => {
  assert.equal(isLandlord({ managerAccess: active }), true);
});

test('the landlord key does NOT admit a property manager', () => {
  assert.equal(isPropertyManager({ landlordAccess: active }), false);
});

test('a manager is a landlord; a landlord is not a manager', () => {
  const manager = { managerAccess: active };
  const landlord = { landlordAccess: active };
  assert.equal(isLandlord(manager), true);
  assert.equal(isPropertyManager(manager), true);
  assert.equal(isLandlord(landlord), true);
  assert.equal(isPropertyManager(landlord), false);
});

test('an admin is both, without any access record', () => {
  assert.equal(isLandlord({ admin: true }), true);
  assert.equal(isPropertyManager({ admin: true }), true);
});

test('a condo manager reaches the manager routes by metadata alone', () => {
  assert.equal(isPropertyManager({ metadataRole: 'Condo Manager' }), true);
});

test('a landlord role in metadata is not a manager role', () => {
  assert.equal(isLandlord({ metadataRole: 'landlord' }), true);
  assert.equal(isPropertyManager({ metadataRole: 'landlord' }), false);
});

test('a pending application is nobody', () => {
  assert.equal(isLandlord({ managerAccess: pending, landlordAccess: pending }), false);
  assert.equal(isPropertyManager({ managerAccess: pending }), false);
});

test('an actor with nothing at all is refused', () => {
  assert.equal(isLandlord({}), false);
  assert.equal(isPropertyManager({}), false);
});

/* ── assignment ──────────────────────────────────────────────────────────── */

const user = { id: 'u-1', email: 'Manager@Example.com' };

test('assignment matches on the manager user id', () => {
  assert.equal(assignedToManager({ propertyManagerUserId: 'u-1' }, user, 'property'), true);
  assert.equal(assignedToManager({ property_manager_user_id: 'u-1' }, user, 'property'), true);
});

test('assignment matches on email regardless of case', () => {
  assert.equal(assignedToManager({ propertyManagerEmail: 'manager@example.com' }, user, 'property'), true);
  assert.equal(assignedToManager({ assignedManagerEmail: 'MANAGER@EXAMPLE.COM' }, user, 'property'), true);
});

test('the shared assignment fields serve both kinds', () => {
  const record = { assignedManagerUserId: 'u-1' };
  assert.equal(assignedToManager(record, user, 'property'), true);
  assert.equal(assignedToManager(record, user, 'condo'), true);
});

test('a condo assignment is not a property assignment', () => {
  const record = { condoManagerEmail: 'manager@example.com' };
  assert.equal(assignedToManager(record, user, 'condo'), true);
  assert.equal(assignedToManager(record, user, 'property'), false);
});

test('an unassigned request belongs to nobody', () => {
  assert.equal(assignedToManager({}, user, 'property'), false);
});

test('a user with no id or email matches no record, not every record', () => {
  // Both originals guarded this and so does the replacement. Unguarded,
  // String(undefined) === String(undefined) is true, so an empty actor would
  // match every request that names no manager. Pinned so it survives the next
  // rewrite rather than being rediscovered.
  assert.equal(assignedToManager({}, {}, 'property'), false);
  assert.equal(assignedToManager({ propertyManagerUserId: undefined }, {}, 'property'), false);
  assert.equal(assignedToManager({ propertyManagerEmail: '' }, { email: '' }, 'property'), false);
});

test('a different manager does not match', () => {
  assert.equal(assignedToManager({ propertyManagerEmail: 'other@example.com' }, user, 'property'), false);
  assert.equal(assignedToManager({ propertyManagerUserId: 'u-2' }, user, 'property'), false);
});

/* ── quota ───────────────────────────────────────────────────────────────── */

const email = 'landlord@example.com';
const sub = (planId: string, status = 'active') => ({ ownerEmail: email, planId, status });

test('an admin is unlimited', () => {
  const plan = subPortalPlan({ admin: true, email });
  assert.equal(plan.quota, Number.POSITIVE_INFINITY);
  assert.equal(plan.planId, 'property-manager');
});

test('no email falls back to Tier 1 rather than refusing', () => {
  assert.deepEqual(subPortalPlan({}), { planId: 'landlord', quota: 25 });
});

test('an unreadable subscription store is Tier 1, not zero', () => {
  // The route passes [] when getByPrefix throws.
  assert.deepEqual(subPortalPlan({ email, subscriptions: [] }), { planId: 'landlord', quota: 25 });
});

test('each sold tier grants its quota', () => {
  assert.equal(subPortalPlan({ email, subscriptions: [sub('landlord')] }).quota, 25);
  assert.equal(subPortalPlan({ email, subscriptions: [sub('condo-manager')] }).quota, 50);
  assert.equal(subPortalPlan({ email, subscriptions: [sub('property-manager')] }).quota, 100);
});

test('holding two plans gives the better one', () => {
  const plan = subPortalPlan({ email, subscriptions: [sub('landlord'), sub('property-manager')] });
  assert.equal(plan.planId, 'property-manager');
  assert.equal(plan.quota, 100);
});

test('a cancelled subscription grants nothing', () => {
  const plan = subPortalPlan({ email, subscriptions: [sub('property-manager', 'cancelled')] });
  assert.deepEqual(plan, { planId: 'landlord', quota: 25 });
});

test("somebody else's subscription grants nothing", () => {
  const theirs = { ownerEmail: 'someone@else.com', planId: 'property-manager', status: 'active' };
  assert.deepEqual(subPortalPlan({ email, subscriptions: [theirs] }), { planId: 'landlord', quota: 25 });
});

test('the subscription email is matched case-insensitively', () => {
  const upper = { ownerEmail: 'LANDLORD@EXAMPLE.COM', planId: 'condo-manager', status: 'active' };
  assert.equal(subPortalPlan({ email, subscriptions: [upper] }).quota, 50);
});

test('an admin override beats the subscription', () => {
  const plan = subPortalPlan({
    email,
    override: { planId: 'negotiated', quota: 250 },
    subscriptions: [sub('landlord')],
  });
  assert.deepEqual(plan, { planId: 'negotiated', quota: 250 });
});

test('an override with an unusable quota is ignored, not honoured as NaN', () => {
  const plan = subPortalPlan({
    email,
    override: { planId: 'broken', quota: 'lots' },
    subscriptions: [sub('condo-manager')],
  });
  assert.deepEqual(plan, { planId: 'condo-manager', quota: 50 });
});

test('an override of zero is a real answer, not a missing one', () => {
  const plan = subPortalPlan({ email, override: { quota: 0 }, subscriptions: [sub('property-manager')] });
  assert.deepEqual(plan, { planId: 'custom', quota: 0 });
});

test('the quota table is the three sold tiers', () => {
  assert.deepEqual(TENANT_SUBPORTAL_QUOTA, {
    'landlord': 25,
    'condo-manager': 50,
    'property-manager': 100,
  });
});

/* ── the read-order bug that locked landlords out of their own buildings ──── */

/**
 * `landlordActor` reads the property-manager record first and only reads the
 * landlord one if the first cannot answer. "Cannot answer" used to mean "is
 * absent", which is not the same as "grants nothing" — and the gap between
 * those two is a live 403 for a real person.
 */

test('an active manager record answers it alone: no second read needed', () => {
  assert.equal(managerAccessAnswersLandlord({ status: 'active' }), true);
});

test('a PENDING manager record does not answer it', () => {
  // This is the bug. A pending record is truthy, so the old `managerAccess ?`
  // test skipped the landlord read and the landlord was refused.
  assert.equal(managerAccessAnswersLandlord({ status: 'pending' }), false);
});

test('no manager record at all does not answer it', () => {
  assert.equal(managerAccessAnswersLandlord(null), false);
  assert.equal(managerAccessAnswersLandlord(undefined), false);
});

test('any non-active status still requires the landlord read', () => {
  for (const status of ['pending', 'rejected', 'revoked', 'suspended', '', 'Active']) {
    assert.equal(
      managerAccessAnswersLandlord({ status }), false,
      `status ${JSON.stringify(status)} must not short-circuit the landlord read`,
    );
  }
});

/**
 * The combination, which is what actually broke. These assert against
 * `isLandlord` fed the way the fixed caller feeds it, because `isLandlord`
 * was never wrong — it was starved of the record it needed.
 */

test('pending manager + active landlord is a landlord', () => {
  const managerAccess = { status: 'pending' };
  // The fixed caller reads the landlord key because the manager one cannot answer.
  const landlordAccess = managerAccessAnswersLandlord(managerAccess)
    ? null
    : { status: 'active' };
  assert.equal(isLandlord({ managerAccess, landlordAccess }), true);
});

test('and under the OLD read order the same person was refused', () => {
  // Kept as a regression witness: this is exactly what production did.
  const managerAccess: any = { status: 'pending' };
  const landlordAccessOldWay = managerAccess ? null : { status: 'active' };
  assert.equal(isLandlord({ managerAccess, landlordAccess: landlordAccessOldWay }), false);
});

test('pending manager + no landlord record is still not a landlord', () => {
  // The fix must not hand the portal to someone whose only record is pending.
  const managerAccess = { status: 'pending' };
  const landlordAccess = managerAccessAnswersLandlord(managerAccess) ? null : null;
  assert.equal(isLandlord({ managerAccess, landlordAccess }), false);
});

test('a pending manager record still cannot use the manager routes', () => {
  // The fix widens the LANDLORD answer only. isPropertyManager is untouched.
  assert.equal(isPropertyManager({ managerAccess: { status: 'pending' } }), false);
  assert.equal(isPropertyManager({ managerAccess: { status: 'active' } }), true);
});
