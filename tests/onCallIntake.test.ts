/**
 * Reading an incoming work request as an emergency, or not.
 *
 * WHY THESE ASSERTIONS
 *
 * All three questions have a plausible wrong answer that nothing catches.
 *
 * Waking a rota for a dripping tap is the fastest way to teach people to stop
 * answering it. Reading the reporter's email instead of the building owner's
 * looks correct in every test where the tester is the landlord, and is wrong
 * for every real tenant — the burst pipe is reported by the tenant and answered
 * by the landlord's plumber. And a trade read from the wrong field name comes
 * back empty, matches no service, falls to the catch-all, and quietly wakes
 * somebody who does not do that work.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isEmergency, accountForRequest, tradeOf,
} from '../supabase/functions/server/onCallIntake.ts';

/* ── is this an emergency? ───────────────────────────────────────────────── */

test('urgent is the emergency priority the portals already set', () => {
  assert.ok(isEmergency({ priority: 'urgent' }));
  assert.ok(isEmergency({ priority: 'URGENT' }));
  assert.ok(isEmergency({ priority: ' urgent ' }));
});

test('ordinary work does not wake anybody', () => {
  for (const priority of ['high', 'medium', 'low', 'normal', '', undefined]) {
    assert.ok(!isEmergency({ priority }), `${priority} should not page a rota`);
  }
  assert.ok(!isEmergency({}));
  assert.ok(!isEmergency(null));
});

test('an explicit flag is honoured in both directions', () => {
  assert.ok(isEmergency({ isEmergency: true, priority: 'low' }));
  assert.ok(!isEmergency({ isEmergency: false, priority: 'urgent' }),
    'a caller that knows this is not an emergency is believed');
});

/* ── whose rota answers? ─────────────────────────────────────────────────── */

test('a tenant reports it; the landlord\'s rota answers', () => {
  const request = {
    client_email: 'tenant@example.com',
    landlordEmail: 'landlord@example.com',
    priority: 'urgent',
  };
  assert.equal(accountForRequest(request), 'landlord@example.com',
    'the landlord\'s plumber is who should be woken, not the tenant\'s');
});

test('an association holding the building beats the reporter', () => {
  assert.equal(
    accountForRequest({ client_email: 'owner@example.com', associationEmail: 'hoa@example.com' }),
    'hoa@example.com',
  );
});

test('a landlord reporting on their own building resolves to themselves', () => {
  assert.equal(
    accountForRequest({ client_email: 'landlord@example.com' }),
    'landlord@example.com',
  );
});

test('a plain customer resolves to themselves, finds no rota, and escalates to us', () => {
  assert.equal(accountForRequest({ email: 'cust@example.com' }), 'cust@example.com');
});

test('the address is normalised, because it is used as a key', () => {
  assert.equal(accountForRequest({ landlordEmail: '  Landlord@Example.COM ' }), 'landlord@example.com');
});

test('nothing to resolve is empty rather than a guess', () => {
  assert.equal(accountForRequest({}), '');
  assert.equal(accountForRequest(null), '');
});

/* ── what kind of work? ──────────────────────────────────────────────────── */

test('the trade is read from whichever field name the record happens to use', () => {
  assert.equal(tradeOf({ trade: 'plumbing' }), 'plumbing');
  assert.equal(tradeOf({ serviceType: 'plumbing' }), 'plumbing');
  assert.equal(tradeOf({ service_type: 'plumbing' }), 'plumbing');
  assert.equal(tradeOf({ project_type: 'plumbing' }), 'plumbing');
  assert.equal(tradeOf({ category: 'plumbing' }), 'plumbing');
});

test('an explicit trade beats a looser field on the same record', () => {
  assert.equal(tradeOf({ trade: 'plumbing', category: 'ai-inspection' }), 'plumbing');
});

test('no trade at all is empty, which the routing reads as the catch-all', () => {
  assert.equal(tradeOf({}), '');
  assert.equal(tradeOf(null), '');
});
