/**
 * A customer portal for somebody who never made an account.
 *
 * Eric, 2026-11-20: *"give them a portal on confirmation a customer portal"*.
 *
 * WHY POSSESSION OF THE LINK, AND NOT A LOGIN
 *
 * The contact details on one of these are UNVERIFIED, and the rest of this
 * flow is careful about that: `confirm-anonymous` refuses to write the
 * address to `customerEmail` precisely because an unverified one would let
 * anybody claim somebody else's estimate by typing their email. Issuing a
 * login keyed on the same detail would hand over exactly what that refusal
 * protects.
 *
 * So the token is the credential — filed by hash, expiring, read-only —
 * reusing `shareToken.ts` rather than growing a second system beside it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  estimateTokenKey, estimatePortalRecord, estimatePortalUsable,
  estimatePortalUrl, customerStageOf, customerEstimateView,
  NEVER_IN_A_CUSTOMER_VIEW,
} from '../supabase/functions/server/estimatePortal.ts';

const NOW = '2026-11-20T01:15:29.017Z';

/* ── the token ───────────────────────────────────────────────────────────── */

test('the token is filed by hash, never in the clear', () => {
  assert.equal(estimateTokenKey('abc123'), 'estimate_token:abc123');
});

test('a fresh link works and a stale one does not', () => {
  const record = estimatePortalRecord('est_1', NOW);
  assert.equal(record.quoteId, 'est_1');

  assert.equal(estimatePortalUsable(record, Date.parse(NOW) + 1000), true);
  assert.equal(
    estimatePortalUsable(record, Date.parse(record.expiresAt) + 1000), false,
    'an expired link is dead',
  );
  assert.equal(
    estimatePortalUsable({ ...record, revokedAt: NOW }, Date.parse(NOW) + 1000), false,
    'a revoked link is dead',
  );
  assert.equal(estimatePortalUsable(null, Date.now()), false);
  assert.equal(
    estimatePortalUsable({ ...record, expiresAt: 'nonsense' } as any, Date.parse(NOW)), false,
    'an unreadable expiry fails closed rather than lasting forever',
  );
});

test('the url is a bare path, which survives a text message', () => {
  assert.equal(
    estimatePortalUrl('https://example.com/', 'tok123'),
    'https://example.com/my-estimate/tok123',
  );
  assert.match(estimatePortalUrl('https://example.com', 'a/b c'), /my-estimate\/a%2Fb%20c$/);
});

/* ── what the customer is told ───────────────────────────────────────────── */

test('each state says something the person waiting can act on', () => {
  assert.equal(customerStageOf('confirmation-requested').stage, 'with-us');
  assert.match(customerStageOf('confirmation-requested').says, /somebody will call you/i);
  assert.equal(customerStageOf('needs-visit').stage, 'needs-visit');
  assert.equal(customerStageOf('scheduled').stage, 'scheduled');
  assert.equal(customerStageOf('declined').stage, 'declined');
});

/**
 * An unknown state reads as "with us", which is true of every state this flow
 * can reach and is the safe thing to say about one it cannot.
 */
test('an unrecognised state does not leak and does not alarm', () => {
  for (const s of [undefined, null, '', 'internal-triage-step-4']) {
    const out = customerStageOf(s);
    assert.equal(out.stage, 'with-us');
    assert.ok(out.says.length > 0);
  }
});

/* ── the projection ──────────────────────────────────────────────────────── */

/** An estimate shaped like the real stored one, internals and all. */
const stored = {
  id: 'est_1795137240769_1tzs30',
  status: 'confirmation-requested',
  userId: 'anon:2026-11-20',
  customerEmail: '',
  anonContact: { name: 'Garage Cleanout Test', phone: '(603) 555-0199', email: '' },
  customerScope: 'Whole garage clear-out — everything except the blue tool chest.',
  customerNotes: 'Flat driveway, no stairs.',
  customerMessage: null,
  confirmationRequestedAt: NOW,
  cost: { low: 720, likely: 1112, high: 1589 },
  volumeCuYd: { likely: 24.5 },
  loads: 2,
  lines: [{ label: 'Load out and haul', cost: 275.63 }],
  needsSiteVisit: true,
  siteVisitReasons: ['suspected asbestos — this has to be tested'],
  excluded: [{ name: 'Blue tool chest' }],
  refused: [{ id: 'liquids', why: 'Household hazardous waste.' }],
  notes: ['Some items were read with low confidence.'],
  mediaRefs: ['storage://project-photos/guest/trash-estimate/1795134856260_garage-cleanout.jpg'],
  workRequestId: null,
  signupOffer: null,
};

test('the customer sees their job', () => {
  const view: any = customerEstimateView(stored);

  assert.equal(view.id, stored.id);
  assert.equal(view.stage, 'with-us');
  assert.equal(view.cost.likely, 1112);
  assert.equal(view.loads, 2);
  assert.equal(view.needsSiteVisit, true);
  assert.deepEqual(view.siteVisitReasons, stored.siteVisitReasons);
  assert.equal(view.scope, stored.customerScope);
  assert.equal(view.access, stored.customerNotes);
  assert.equal(view.name, 'Garage Cleanout Test', 'greeted by the name they gave');
});

/**
 * THE PROJECTION IS A NAMED LIST, AND THIS IS THE ASSERTION THAT KEEPS IT ONE.
 *
 * A denylist leaks by default the moment somebody adds a field upstream and
 * forgets this file. The view is built from a fixed set instead, so this test
 * is a statement that the set is right rather than a second line of defence.
 */
test('nothing internal travels with it', () => {
  const view = customerEstimateView(stored) as Record<string, unknown>;
  const wire = JSON.stringify(view);

  for (const field of NEVER_IN_A_CUSTOMER_VIEW) {
    assert.equal(field in view, false, `${field} is being sent to the customer`);
  }
  assert.ok(!wire.includes('anon:2026-11-20'), 'the metering principal leaked');
  assert.ok(!wire.includes('storage://'), 'the photo storage paths leaked');
  assert.ok(!wire.includes('(603) 555-0199'), 'their phone number is echoed back over an open link');
});

test('a missing or junk estimate yields nothing rather than a half view', () => {
  assert.equal(customerEstimateView(null), null);
  assert.equal(customerEstimateView(undefined), null);
  assert.equal(customerEstimateView({}), null);
});

test('arrays stay arrays even when the record is missing them', () => {
  const view: any = customerEstimateView({ id: 'e', status: 'needs-visit' });
  for (const k of ['lines', 'siteVisitReasons', 'excluded', 'refused', 'notes']) {
    assert.ok(Array.isArray(view[k]), `${k} should be an array, so the page can map it`);
  }
});

/* ── the wiring ──────────────────────────────────────────────────────────── */

const root = join(import.meta.dirname, '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const strip = (c: string) => c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/^\s*\/\/.*$/gm, '');

test('confirming a price mints the portal and hands back the link', () => {
  const code = strip(read('supabase/functions/server/trash-estimator.tsx'));
  assert.match(code, /estimatePortalRecord\(id, nowIso\)/, 'no portal is minted on confirmation');
  assert.match(code, /portalUrl/, 'the link is not returned, so nobody can be given it');
});

/**
 * The read has to be reachable with no session — the people it is for have
 * never had one. That is the whole bug this flow has already hit twice.
 */
test('the portal read is public, and the page is routed', () => {
  const server = strip(read('supabase/functions/server/trash-estimator.tsx'));
  assert.match(
    server, /method === "GET" && path\.includes\("\/trash-estimator\/portal\/"\)/,
    'the portal read demands a session again',
  );

  /*
   * BOTH GATES, because the router allowance alone was not enough. The outer
   * tier check in index.tsx refuses first, so the portal answered 401 to
   * every caller including the ones holding a good link. Found by asking for
   * a made-up token and reading the status code: 401 and 404 both look like
   * "no" until you check which.
   */
  const index = strip(read('supabase/functions/server/index.tsx'));
  assert.match(
    index, /'\/trash-estimator\/portal\/'/,
    'the outer auth tier refuses the portal again, so every link 401s',
  );

  const app = strip(read('src/app/App.tsx'));
  assert.match(app, /'my-estimate'/, 'the page is not public');
  assert.match(app, /PREFIX_ROUTES[^\n]*my-estimate/, 'the token in the path will not route');
});
