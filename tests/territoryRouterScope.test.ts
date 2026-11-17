/**
 * Which paths the territory router's staff gate owns — and which it must not.
 *
 * This is a test about a PREFIX BEING TOO GREEDY, which is the mistake this
 * server has already made in production once: a `use('*', requireStaff)` on a
 * router mounted at the API prefix took the whole API staff-only, `/health`
 * included, for one deploy.
 *
 * The usual helper, `requireStaffOn`, matches `p === base || p.startsWith(base
 * + '/')`. For this module that is wrong twice, and both are live routes served
 * by other files:
 *
 *   `/applications`   is on PUBLIC_POST_PATHS. The subcontractor, vendor and
 *                     service-provider application forms post to it with NO
 *                     session. A prefix match on `/applications` would have put
 *                     a staff gate in front of the public application forms —
 *                     every new vendor silently unable to apply.
 *   `/analytics`      this module owns the bare path. `/analytics/summary` and
 *                     `/analytics/portfolio/:email` belong elsewhere and are
 *                     read by the reporting and investor screens.
 *
 * So the gate matches segment by segment, and these assertions are the reason
 * it is allowed to stay that way.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ownedByThisRouter } from '../supabase/functions/server/territoryRouterScope.ts';

const P = '/make-server-3eae23a6';

test('the routes this module owns are gated', () => {
  for (const p of [
    `${P}/territories`,
    `${P}/territories/portland-or`,
    `${P}/applications/status/pending`,
    `${P}/applications/abc123/reject`,
    `${P}/members`,
    `${P}/founders`,
    `${P}/analytics`,
  ]) {
    assert.equal(ownedByThisRouter(p), true, p);
  }
});

test('the PUBLIC application form is never gated', () => {
  // The one that would have been a real outage: no session, and on the
  // exact-match public POST list.
  assert.equal(ownedByThisRouter(`${P}/applications`), false);
});

test('another module\u2019s analytics is left alone', () => {
  assert.equal(ownedByThisRouter(`${P}/analytics/summary`), false);
  assert.equal(ownedByThisRouter(`${P}/analytics/portfolio/a@b.com`), false);
});

test('the staff application screen keeps reading one application', () => {
  // ApplicationSubmissions.tsx fetches `/applications/:id`. It is a staff
  // screen, so gating it would be harmless — but it is not this module's
  // route, and a gate that reaches into another file's paths is how the
  // greedy-prefix mistake starts.
  assert.equal(ownedByThisRouter(`${P}/applications/abc123`), false);
});

test('approve keeps its own guard rather than gaining a second', () => {
  // It was hardened earlier in this audit and verified against a real
  // non-staff session. Two guards would change the message that test asserts.
  assert.equal(ownedByThisRouter(`${P}/applications/abc123/approve`), false);
});

test('nothing outside this module is touched', () => {
  for (const p of [
    `${P}/health`,
    `${P}/public/branding`,
    `${P}/team/members`,
    `${P}/trash-estimator/read`,
    '/health',
    '',
  ]) {
    assert.equal(ownedByThisRouter(p), false, p || '(empty)');
  }
});
