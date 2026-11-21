/**
 * A portal gate that asks "do you hold one" opens all ten.
 *
 * WHAT WAS WRONG
 *
 * `PortalAccessGuard` fetched `intake/my-access`, read `canEnterPortal` —
 * true when ANY `portal_access:<email>:*` row is active — and then rendered
 * whichever portal page the browser had asked for. Ten pages, one question.
 * An account holding only a vendor portal reached `/landlord-portal` by
 * typing it.
 *
 * The sign-in screen never had this bug: it compares the portal somebody
 * picked against the granted set and refuses the rest, and its comment
 * records the opposite mistake being fixed (gating on the single `portalType`
 * on the intake record, which locked people out of portals they held). The
 * render gate is the half that runs when somebody skips sign-in and goes
 * straight to a URL.
 *
 * Eric, on being shown it: "no one should be able to move to other portals
 * unless authorized by me or admin."
 *
 * The rules themselves are not new. `rentalAccess.ts` already decided who
 * counts as a landlord and who counts as a manager, including the
 * compatibility path that must not be made symmetrical; `portalGrants.ts`
 * reuses that file rather than restating it, and these tests pin the
 * asymmetry in both directions.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { effectivePortalGrants, mayOpenPortal } from '../supabase/functions/server/portalGrants.ts';

const root = join(import.meta.dirname, '..');
const app = readFileSync(join(root, 'src/app/App.tsx'), 'utf8');

const active = (portalType: string) => ({ portalType, status: 'active' });

/* ── the grant rules ─────────────────────────────────────────────────────── */

test('an active row grants its own portal and nothing else', () => {
  const grants = effectivePortalGrants({ access: [active('vendor')] });
  assert.deepEqual(grants, ['vendor']);
});

test('a vendor cannot open the landlord portal', () => {
  assert.equal(mayOpenPortal({ access: [active('vendor')] }, 'landlord'), false);
});

test('two rows grant two portals — holding several is allowed', () => {
  const grants = effectivePortalGrants({ access: [active('customer'), active('landlord')] });
  assert.deepEqual(grants, ['customer', 'landlord']);
  assert.equal(mayOpenPortal({ access: [active('customer'), active('landlord')] }, 'customer'), true);
  assert.equal(mayOpenPortal({ access: [active('customer'), active('landlord')] }, 'landlord'), true);
});

/**
 * THE ASYMMETRY. Copied from `rentalAccess.ts`, which explains at length why
 * its mirror image is a privilege escalation: landlord applications used to
 * be filed under the property-manager intake type, so manager ⊆ landlord —
 * and making the pair symmetrical would promote every landlord into the
 * condo-manager queue, which reads other people's buildings.
 */
test('an active property manager is also a landlord', () => {
  assert.equal(mayOpenPortal({ access: [active('property_manager')] }, 'landlord'), true);
});

test('a landlord is NOT a property manager', () => {
  assert.equal(
    mayOpenPortal({ access: [active('landlord')] }, 'property_manager'), false,
    'the compatibility path runs one way only; the mirror is an escalation',
  );
});

test('a landlord is NOT a condo manager', () => {
  assert.equal(
    mayOpenPortal({ access: [active('landlord')] }, 'condo_manager'), false,
    'the condo-manager pages read other people’s buildings',
  );
});

/**
 * `propertyManagerActor` serves the condo-manager routes and accepts the
 * `property_manager` key, so an active property manager opens those pages on
 * the server today. The gate says the same thing rather than being quietly
 * stricter than what it gates.
 */
test('an active property manager opens the condo-manager pages, as the server already allows', () => {
  assert.equal(mayOpenPortal({ access: [active('property_manager')] }, 'condo_manager'), true);
});

/* ── a row that grants nothing ───────────────────────────────────────────── */

for (const status of ['pending', 'onboarding', 'revoked', 'rejected', 'active_pending_requirements', '']) {
  test(`a ${status || '(empty)'} row grants nothing`, () => {
    assert.deepEqual(
      effectivePortalGrants({ access: [{ portalType: 'vendor', status }] }), [],
      'only "active" grants — the direction to be wrong in on a gate is too strict',
    );
  });
}

test('no rows at all grants nothing', () => {
  assert.deepEqual(effectivePortalGrants({ access: [] }), []);
  assert.deepEqual(effectivePortalGrants({ access: null }), []);
  assert.deepEqual(effectivePortalGrants({}), []);
});

test('an unknown portal type is never granted by accident', () => {
  assert.equal(mayOpenPortal({ access: [active('vendor')] }, 'owner'), false);
  assert.equal(mayOpenPortal({ access: [active('vendor')] }, ''), false);
  assert.equal(mayOpenPortal({ access: [active('vendor')] }, undefined), false);
});

/* ── metadata roles, spelled every way the screens write them ────────────── */

test('the metadata role stands in for a row, however it is spelled', () => {
  for (const spelling of ['Property Manager', 'property-manager', 'property_manager']) {
    assert.equal(
      mayOpenPortal({ metadataRole: spelling }, 'property_manager'), true,
      `${spelling} was not recognised`,
    );
  }
});

test('a metadata landlord is still not a manager', () => {
  assert.equal(mayOpenPortal({ metadataRole: 'landlord' }, 'property_manager'), false);
});

test('staff open everything', () => {
  assert.equal(mayOpenPortal({ admin: true, access: [] }, 'landlord'), true);
  assert.equal(mayOpenPortal({ admin: true, access: [] }, 'investor'), true);
});

/* ── the front-end map ───────────────────────────────────────────────────── */

/** `PORTAL_ROUTE_GRANT` in App.tsx, as route → required portal type. */
function routeGrants(): Record<string, string> {
  const start = app.indexOf('const PORTAL_ROUTE_GRANT');
  assert.notEqual(start, -1, 'PORTAL_ROUTE_GRANT is gone from App.tsx');
  const body = app.slice(start, app.indexOf('};', start));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/"([a-z-]+)":\s*"([a-z_]+)"/g)) out[m[1]] = m[2];
  return out;
}

test('every gated route names the portal it requires', () => {
  const map = routeGrants();
  assert.ok(Object.keys(map).length >= 10, `only ${Object.keys(map).length} routes mapped`);
  for (const [route, type] of Object.entries(map)) {
    assert.ok(type, `${route} requires nothing, so it is gated on "any portal" again`);
  }
});

/**
 * The route list is DERIVED from the map.
 *
 * Two literals would be two places to add a portal page, and the failure mode
 * of forgetting the second one is a page gated on nothing.
 */
test('the gated-route list cannot drift from the map', () => {
  assert.match(
    app, /const APPROVED_PORTAL_ROUTES = new Set\(Object\.keys\(PORTAL_ROUTE_GRANT\)\)/,
    'APPROVED_PORTAL_ROUTES is a second hand-written list again',
  );
});

test('the guard checks the required grant rather than any-portal', () => {
  assert.match(app, /grants\.includes\(required\)/, 'the per-portal check is gone from the guard');
});

/**
 * A missing `grants` must not fall back to the old answer.
 *
 * The front end and the server deploy in one push, but if they ever separate,
 * an absent field falling back to `canEnterPortal` would reopen the hole on
 * exactly that deploy. Shut is the safe direction.
 */
test('an absent grants field is treated as no grant', () => {
  const start = app.indexOf('const grants: string[] =');
  const line = app.slice(start, app.indexOf('\n', start));
  assert.match(line, /Array\.isArray\(data\?\.grants\)/, 'grants is read without checking it arrived');
  assert.match(line, /:\s*\[\]/, 'a missing grants field falls back to something other than empty');
});
