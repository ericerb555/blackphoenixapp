/**
 * Who may reach the lead routes.
 *
 * These four routes read, mail and delete the company's contact book, and
 * until they were lifted out of `index.tsx` they were in no list at all — so
 * they fell to the auth wall's default of "signed in", and every portal
 * customer, tenant, vendor and subcontractor on this platform is signed in.
 *
 * The two mistakes worth pinning are opposite and both silent:
 *
 *   - guarding by PREFIX closes `/leads/capture`, the storefront's public
 *     enquiry form. Nobody reports a form that stopped submitting; it looks
 *     like a quiet week. The first draft of the guard did exactly this.
 *   - guarding by an explicit LIST of private paths leaves whatever gets added
 *     next wide open, which is how these routes got into this state.
 *
 * So the rule defaults to staff and names the public exception, and that is
 * what these check.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LEADS_BASE, PUBLIC_LEAD_PATHS, isLeadsPath, leadPathNeedsStaff,
} from '../supabase/functions/server/leadsAccess.ts';

/* ── the public exception ────────────────────────────────────────────────── */

test('the storefront capture form stays public', () => {
  assert.equal(leadPathNeedsStaff(`${LEADS_BASE}/capture`), false);
});

test('capture is the only public lead path', () => {
  assert.deepEqual([...PUBLIC_LEAD_PATHS], [`${LEADS_BASE}/capture`]);
});

/* ── everything else is the company's ────────────────────────────────────── */

test('reading the whole contact book needs staff', () => {
  assert.equal(leadPathNeedsStaff(LEADS_BASE), true);
});

test('sending mail to a lead needs staff', () => {
  assert.equal(leadPathNeedsStaff(`${LEADS_BASE}/send-email`), true);
});

test('blasting fifty leads needs staff', () => {
  assert.equal(leadPathNeedsStaff(`${LEADS_BASE}/blast`), true);
});

test('deleting a lead needs staff', () => {
  assert.equal(leadPathNeedsStaff(`${LEADS_BASE}/lead_1730000000000`), true);
});

test('a route added under /leads later is staff-only by default', () => {
  assert.equal(leadPathNeedsStaff(`${LEADS_BASE}/export-everything`), true);
});

/* ── the prefix trap ─────────────────────────────────────────────────────── */

test('something merely starting with the capture path is not public', () => {
  // `/capture-all` shares a prefix with `/capture` and is not it. A guard
  // written with startsWith would hand this to the public.
  assert.equal(leadPathNeedsStaff(`${LEADS_BASE}/capture-all`), true);
});

test('a path below the capture form is not public either', () => {
  assert.equal(leadPathNeedsStaff(`${LEADS_BASE}/capture/all`), true);
});

/* ── standing aside for everybody else's routes ──────────────────────────── */

test('paths that are not ours are left alone', () => {
  // The router is mounted at `/`, so its middleware sees every request the
  // server receives. Claiming them would take the whole API staff-only, which
  // has happened here before.
  for (const path of [
    '/make-server-3eae23a6/health',
    '/make-server-3eae23a6/public/branding',
    '/make-server-3eae23a6/quotes',
  ]) {
    assert.equal(isLeadsPath(path), false, path);
    assert.equal(leadPathNeedsStaff(path), false, path);
  }
});

test('a path that merely contains the word leads is not ours', () => {
  assert.equal(isLeadsPath('/make-server-3eae23a6/exchange-leads'), false);
  assert.equal(isLeadsPath('/make-server-3eae23a6/leadsomething'), false);
});
