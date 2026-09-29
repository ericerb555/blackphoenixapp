/**
 * An add-on's ceilings, merged over the tier's.
 *
 * `PlanAddOn.limits` was documented as merging over the tier's limits as a
 * delta, and nothing implemented it — so an add-on sold on capacity would have
 * been a charge that granted nothing. These pin the arithmetic, and in
 * particular the one case that would take capacity AWAY from somebody who had
 * just paid for more: zero means unlimited in this system, so neither `a + b`
 * nor `Math.max` is correct.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  effectiveLimits, effectiveLimit, isUnlimited,
} from '../supabase/functions/server/effectiveLimits.ts';

// ── The convention ────────────────────────────────────────────────────────

test('zero and below mean unlimited; a positive number is a real ceiling', () => {
  assert.equal(isUnlimited(0), true);
  assert.equal(isUnlimited(-3), true, 'a negative cannot mean "minus three"');
  assert.equal(isUnlimited(1), false);
  assert.equal(isUnlimited(undefined), false, 'absent is not the same as unlimited');
});

// ── No add-ons ────────────────────────────────────────────────────────────

test('with no add-ons the tier stands unchanged', () => {
  assert.deepEqual(effectiveLimits({ products: 250, deals: 3 }, []), { products: 250, deals: 3 });
  assert.deepEqual(effectiveLimits({ products: 250 }), { products: 250 });
});

test('no tier and no add-ons is an empty map, not a crash', () => {
  assert.deepEqual(effectiveLimits(null, []), {});
  assert.deepEqual(effectiveLimits(undefined, [null, undefined]), {});
});

// ── The delta ─────────────────────────────────────────────────────────────

/**
 * The documented behaviour: "an add-on that grants 500 more products is
 * `{ products: 500 }` as a delta, not an absolute."
 */
test('AN ADD-ON ADDS TO THE TIER, it does not replace it', () => {
  const out = effectiveLimits({ products: 250 }, [{ limits: { products: 500 } }]);
  assert.equal(out.products, 750);
});

test('several add-ons all count', () => {
  const out = effectiveLimits({ aiCallsPerMonth: 1500 }, [
    { limits: { aiCallsPerMonth: 600 } },
    { limits: { aiCallsPerMonth: 400 } },
  ]);
  assert.equal(out.aiCallsPerMonth, 2500);
});

test('a key only the add-on names becomes the ceiling', () => {
  // The tier said nothing about reels. That is not "zero reels", it is a key
  // the tier did not publish — so the add-on is what publishes it.
  const out = effectiveLimits({ products: 250 }, [{ limits: { reelsPerMonth: 20 } }]);
  assert.equal(out.reelsPerMonth, 20);
  assert.equal(out.products, 250, 'and the tier keeps its own');
});

test('a key only the tier names is untouched', () => {
  const out = effectiveLimits({ deals: 3 }, [{ limits: { reelsPerMonth: 5 } }]);
  assert.equal(out.deals, 3);
});

// ── Unlimited, in both directions ─────────────────────────────────────────

/**
 * The expensive one. Stocked and Preferred both carry `products: 0` and sell
 * themselves as unlimited. Summing or maxing would turn that into 500 — the
 * customer pays MORE and gets LESS, and it looks like the purchase worked.
 */
test('AN ADD-ON CANNOT TAKE AWAY AN UNLIMITED CEILING', () => {
  const out = effectiveLimits({ products: 0 }, [{ limits: { products: 500 } }]);
  assert.equal(out.products, 0, 'still unlimited');
  assert.equal(isUnlimited(out.products), true);
});

test('an add-on that grants unlimited grants it', () => {
  const out = effectiveLimits({ reelsPerMonth: 5 }, [{ limits: { reelsPerMonth: 0 } }]);
  assert.equal(out.reelsPerMonth, 0, 'the Agency rung sells unlimited reels');
});

test('unlimited survives a later finite add-on', () => {
  const out = effectiveLimits({ reelsPerMonth: 5 }, [
    { limits: { reelsPerMonth: 0 } },
    { limits: { reelsPerMonth: 10 } },
  ]);
  assert.equal(out.reelsPerMonth, 0, 'once lifted, it stays lifted whatever order they merge in');
});

test('a negative on either side reads as unlimited, never as a subtraction', () => {
  assert.equal(effectiveLimits({ products: 250 }, [{ limits: { products: -1 } }]).products, 0);
  assert.equal(effectiveLimits({ products: -5 }, [{ limits: { products: 100 } }]).products, -5,
    'the tier keeps its own sentinel; isUnlimited already reads it');
});

// ── Nonsense is ignored rather than guessed at ────────────────────────────

test('an unreadable add-on figure is ignored, leaving the tier as it was', () => {
  const out = effectiveLimits({ products: 250 }, [
    { limits: { products: NaN as any } },
    { limits: { products: 'lots' as any } },
  ]);
  assert.equal(out.products, 250);
});

test('an add-on with no limits at all changes nothing', () => {
  // Every add-on in production today is exactly this shape.
  assert.deepEqual(effectiveLimits({ products: 250 }, [{ limits: {} }, {}, { limits: null }]),
    { products: 250 });
});

test('an unreadable tier figure is dropped rather than carried through', () => {
  const out = effectiveLimits({ products: 'many' as any, deals: 3 }, []);
  assert.equal('products' in out, false);
  assert.equal(out.deals, 3);
});

// ── The shape pickCeiling needs ───────────────────────────────────────────

/**
 * `pickCeiling` reads absent and zero as different answers — absent falls to
 * the built-in backstop, zero is unlimited. Collapsing them would either uncap
 * an account nobody meant to uncap or cap one that had bought its way out.
 */
test('A KEY NOBODY PUBLISHED COMES BACK UNDEFINED, NOT ZERO', () => {
  assert.equal(effectiveLimit({ products: 250 }, [], 'aiCallsPerMonth'), undefined);
  assert.equal(effectiveLimit({ aiCallsPerMonth: 0 }, [], 'aiCallsPerMonth'), 0, 'zero is a real answer');
});

// ── The actual content rungs ──────────────────────────────────────────────

/**
 * The three rungs as they will be authored, against a vendor tier. The free
 * backstop is 300 AI calls and 10 renders, so these are what the add-on has to
 * be worth to be worth buying.
 */
test('the content rungs raise a vendor above the free backstop', () => {
  const listed = { deals: 3, products: 250, bidQuotesPerMonth: 10 }; // publishes no AI keys
  const solo = { limits: { aiCallsPerMonth: 600, rendersPerMonth: 40, reelsPerMonth: 5, seats: 1 } };
  const out = effectiveLimits(listed, [solo]);
  assert.equal(out.aiCallsPerMonth, 600, 'vs a 300 backstop');
  assert.equal(out.rendersPerMonth, 40, 'vs a 10 backstop');
  assert.equal(out.deals, 3, 'and the vendor plan is untouched');
});

test('a content rung stacks on a tier that already meters AI', () => {
  const preferred = { products: 0, aiCallsPerMonth: 1500, rendersPerMonth: 150 };
  const studio = { limits: { aiCallsPerMonth: 1500, rendersPerMonth: 150, reelsPerMonth: 20, seats: 3 } };
  const out = effectiveLimits(preferred, [studio]);
  assert.equal(out.aiCallsPerMonth, 3000);
  assert.equal(out.rendersPerMonth, 300);
  assert.equal(out.products, 0, 'unlimited products stay unlimited');
});

// ── Who is exempt from metering entirely ──────────────────────────────────

/**
 * `aiSpend.reserve` returns before reading any ceiling for staff, so this set
 * decides who has uncapped model spend. aiSpend kept its OWN copy of the role
 * list and the copy had drifted from the canonical one here, missing
 * `platform_owner`, `business_owner`, `master_admin` and `management` — so a
 * master_admin was metered at the free backstop of 300 calls while an `admin`
 * beside them had no ceiling at all.
 *
 * aiSpend now delegates to `isTrustedStaff` in a single line and keeps no list
 * of its own, so there is nothing left to drift. It cannot be imported here —
 * it reaches `kv_store.tsx`, which node's test runner cannot load — so what is
 * pinned is the canonical answer it now defers to.
 */
import { isTrustedStaff, STAFF_ROLE_SET, trustedRole } from '../supabase/functions/server/trustedRole.ts';

const as = (role: string) => ({ app_metadata: { role } });

test('EVERY COMPANY-SIDE ROLE COUNTS AS STAFF, not just some of them', () => {
  for (const role of STAFF_ROLE_SET) {
    assert.equal(isTrustedStaff(as(role)), true, `${role} must not be metered`);
  }
});

test('the four that aiSpend had drifted out of its own list are staff', () => {
  for (const role of ['platform_owner', 'business_owner', 'master_admin', 'management']) {
    assert.equal(STAFF_ROLE_SET.has(role), true, `${role} belongs in the canonical set`);
    assert.equal(isTrustedStaff(as(role)), true, role);
  }
});

test('a portal guest is not staff', () => {
  for (const role of ['customer', 'vendor', 'subcontractor', 'landlord', 'tenant', '']) {
    assert.equal(isTrustedStaff(as(role)), false, `${role || '(none)'} must stay metered`);
  }
});

/**
 * What this grants is uncapped model spend — real money — so it has to be
 * unreachable from anything the account can write itself. `user_metadata` is
 * writable from the browser with `supabase.auth.updateUser`; `app_metadata`
 * only by the service role.
 */
test('STAFF CANNOT BE CLAIMED FROM THE BROWSER', () => {
  assert.equal(isTrustedStaff({ user_metadata: { role: 'owner' } }), false);
  assert.equal(isTrustedStaff({ user_metadata: { accountType: 'admin' } }), false);
  assert.equal(
    isTrustedStaff({ app_metadata: { role: 'customer' }, user_metadata: { role: 'owner' } }),
    false,
    'the writable bag must never override the trustworthy one',
  );
});

test('the role is read tolerantly of spacing and case, but only from app_metadata', () => {
  assert.equal(trustedRole({ app_metadata: { role: 'Master Admin' } }), 'master_admin');
  assert.equal(isTrustedStaff({ app_metadata: { role: 'Master-Admin' } }), true);
  assert.equal(trustedRole({ user_metadata: { role: 'owner' } }), '');
});
