/**
 * The registry describes the application to Phoenix. Two things can go wrong
 * with a file like that, and neither shows up by reading it.
 *
 * It can drift — a page gets renamed, and Phoenix keeps offering a door that
 * is no longer there. So the routes are checked against the real route map.
 *
 * And it can be mistaken for a permission. It is not one; the `access` field
 * only decides what Phoenix mentions. The tests at the bottom pin the two
 * properties that keep that true: the model cannot name its own route, and a
 * field added to Capability later is not exposed until somebody names it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CAPABILITIES, CAPABILITY_IDS, capabilityById, visibleTo,
  searchCapabilities, publicCapability, openDirective,
} from '../supabase/functions/server/capabilityRegistry.ts';

/** The keys of pageMap in routes.tsx — the only routes that actually exist. */
function realRoutes(): Set<string> {
  const src = readFileSync('src/app/routes.tsx', 'utf8');
  const keys = src.match(/^\s*"([a-z0-9-]+)":/gm) ?? [];
  return new Set(keys.map((k) => k.trim().replace(/^"/, '').replace(/":$/, '')));
}

const OWNER = { isStaff: true, isOwner: true };
const STAFF = { isStaff: true, isOwner: false };
const PORTAL = { isStaff: false, isOwner: false };

/* ── drift ───────────────────────────────────────────────────────────── */

test('every capability points at a route that exists', () => {
  // The failure this prevents: rename a page, and Phoenix spends the next
  // month confidently sending people to a blank screen.
  const routes = realRoutes();
  assert.ok(routes.size > 100, 'route map did not parse — fix this test, not the registry');

  const broken = CAPABILITIES.filter((c) => !routes.has(c.route));
  assert.deepEqual(broken.map((c) => `${c.id} -> ${c.route}`), [],
    'these capabilities name routes that are not in pageMap');
});

test('ids and routes are unique', () => {
  // Two capabilities on one route means the model picks between duplicates
  // on a coin flip, and the one it picks is the one worded best, not right.
  assert.equal(new Set(CAPABILITY_IDS).size, CAPABILITIES.length, 'duplicate id');
  const routes = CAPABILITIES.map((c) => c.route);
  assert.equal(new Set(routes).size, routes.length, 'duplicate route');
});

test('coverage of the route map is reported, and does not silently rot', () => {
  // Not an assertion that every route is described — padding the list with
  // 359 aliases makes search worse. This is a floor, so the registry cannot
  // quietly shrink to nothing while still passing every other test.
  const routes = realRoutes();
  const pct = Math.round((CAPABILITIES.length / routes.size) * 100);
  console.log(`      capability coverage: ${CAPABILITIES.length} of ${routes.size} routes (${pct}%)`);
  assert.ok(CAPABILITIES.length >= 70, `only ${CAPABILITIES.length} capabilities described`);
});

/* ── what the model reads ────────────────────────────────────────────── */

test('every capability says what it is for, not just what it is called', () => {
  for (const c of CAPABILITIES) {
    assert.ok(c.purpose.length > 25, `${c.id}: purpose too thin for the model to choose on`);
    assert.ok(c.keywords.length >= 3, `${c.id}: needs the words an owner would actually say`);
    assert.ok(c.label.length > 1, `${c.id}: needs a label`);
    // A purpose that just repeats the label tells the model nothing.
    assert.notEqual(c.purpose.toLowerCase().trim(), c.label.toLowerCase().trim(), c.id);
  }
});

test('the registry does not describe itself as acting', () => {
  // Purposes are read as capability descriptions. "Sends the invoice" invites
  // the model to believe opening the module sends something.
  for (const c of CAPABILITIES) {
    assert.doesNotMatch(c.purpose, /\b(sends?|deletes?|charges?|publishes?) the\b/i, c.id);
  }
});

/* ── visibility (mentioning, not access) ─────────────────────────────── */

test('owner-only modules are not mentioned to staff or portal accounts', () => {
  const staffSees = visibleTo(STAFF).map((c) => c.id);
  const ownerOnly = CAPABILITIES.filter((c) => c.access === 'owner');
  assert.ok(ownerOnly.length > 0, 'nothing is owner-only — that is suspicious');
  for (const c of ownerOnly) assert.ok(!staffSees.includes(c.id), `${c.id} shown to staff`);
});

test('a portal account is offered only the public modules', () => {
  for (const c of visibleTo(PORTAL)) {
    assert.equal(c.access, 'any', `${c.id} offered to a portal account`);
  }
});

test('the owner sees everything', () => {
  assert.equal(visibleTo(OWNER).length, CAPABILITIES.length);
});

test('a missing or malformed role is treated as the least privileged', () => {
  // Fails closed. An undefined role is an unauthenticated one, not an owner.
  for (const bad of [null, undefined, {}, { isOwner: false }]) {
    for (const c of visibleTo(bad as any)) assert.equal(c.access, 'any', JSON.stringify(bad));
  }
});

/* ── search ──────────────────────────────────────────────────────────── */

test('the words an owner would say find the module they mean', () => {
  const finds = (q: string, id: string) => {
    const hits = searchCapabilities(q, OWNER).map((c) => c.id);
    assert.ok(hits.includes(id), `"${q}" should find ${id}, got ${hits.slice(0, 4).join(', ')}`);
  };
  finds('outstanding estimates', 'estimates');
  finds('who owes us money', 'invoices');
  finds('contractor dashboard', 'subcontractors');
  finds('marketing', 'marketing-command');
  finds('maintenance subscription system', 'maintenance-plans');
  finds('what is the ai costing', 'ai-diagnostics');
  finds('schedule', 'scheduling');
  finds('new enquiries', 'leads');
});

test('search never returns a module the asker may not be offered', () => {
  // The leak that would matter: an office account asking "payroll" and being
  // told the platform-owner screens exist.
  for (const q of ['payroll', 'stripe', 'master admin', 'roles', 'everything']) {
    for (const c of searchCapabilities(q, STAFF)) {
      assert.notEqual(c.access, 'owner', `"${q}" offered ${c.id} to staff`);
    }
  }
});

test('a search that matches nothing returns nothing, rather than guessing', () => {
  // An empty result lets Phoenix say "there is no such module". A fuzzy
  // best-effort match sends somebody to the wrong screen with confidence.
  assert.deepEqual(searchCapabilities('zzzqqq', OWNER), []);
});

test('an empty query lists rather than fails', () => {
  assert.ok(searchCapabilities('', OWNER).length > 0);
  assert.ok(searchCapabilities(null, OWNER).length > 0);
  assert.ok(searchCapabilities(undefined, OWNER).length > 0);
});

test('the result count is bounded whatever is asked for', () => {
  assert.ok(searchCapabilities('a', OWNER, 999).length <= 25);
  assert.ok(searchCapabilities('invoice', OWNER, -5).length <= 1);
});

/* ── the two safety properties ───────────────────────────────────────── */

test('the model cannot name its own route', () => {
  // openDirective resolves the route from the registry by id. If the model
  // could supply a route string it could send somebody to any page in the
  // application, including ones it was never told about.
  assert.equal(openDirective('invoices')?.route, 'invoices');
  assert.equal(openDirective('master-admin-dashboard'), null, 'that is a route, not an id');
  for (const bad of ['', null, undefined, 42, {}, 'nonexistent', '../admin']) {
    assert.equal(openDirective(bad as any), null, JSON.stringify(bad));
  }
});

test('a field added to Capability later is not exposed until it is named', () => {
  // Allowlist, not redaction list — same rule as the ledger's publicCallRow.
  // If someone adds `internalNotes` to an entry it must not reach the model.
  const withExtra = { ...CAPABILITIES[0], internalNotes: 'secret', route: 'invoices' };
  const shown = publicCapability(withExtra as any);
  assert.deepEqual(Object.keys(shown).sort(), ['area', 'id', 'label', 'purpose']);
});

test('the route is not handed to the model with the description', () => {
  // The model picks by id. Giving it routes invites it to compose one.
  const shown = publicCapability(CAPABILITIES[0]) as any;
  assert.equal(shown.route, undefined);
});

test('capabilityById refuses anything that is not a known id', () => {
  assert.equal(capabilityById('invoices')?.label, 'Invoices');
  for (const bad of ['', null, undefined, 0, [], 'INVOICES']) {
    assert.equal(capabilityById(bad as any), undefined, JSON.stringify(bad));
  }
});
