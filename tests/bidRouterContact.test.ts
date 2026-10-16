/**
 * A bid-router answer must not carry a provider's address.
 *
 * The hole these pin shut: `/bid-router/ai-analyze` was reachable by every
 * signed-in account and returned `matchingProviders` exactly as
 * `loadBidProviders` built them — email address included, on all eight of the
 * `vendor:` records in production. The route is staff-only now; this is the
 * second line, because a gate is one line somebody can move and "the address
 * does not leave the server" is the part that has to stay true regardless.
 *
 * The properties pinned here:
 *
 *   - the address is removed, and removed by being ABSENT rather than blank,
 *     because an empty string is a false claim that the provider has no email
 *   - everything a caller legitimately needs survives untouched
 *   - nothing nested anywhere in a payload still carries one
 *   - rubbish in does not throw, because a route that throws while refusing to
 *     leak has still failed the person using it
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  withholdProviderContact,
  carriesProviderContact,
} from '../supabase/functions/server/bidRouterContact.ts';

const row = {
  id: 'provider_1',
  name: 'Denron Plumbing & HVAC',
  email: 'office@denronph.com',
  type: 'service_provider',
  rating: 4,
  subscriptionTier: 'enterprise',
  categories: ['plumbing'],
  matchScore: 91,
};

test('the address is gone, and gone by absence rather than by blanking', () => {
  const [out] = withholdProviderContact([row]);
  assert.equal('email' in out, false, 'the key itself must not survive');
  assert.equal((out as any).email, undefined);
});

test('everything a caller actually needs survives', () => {
  const [out] = withholdProviderContact([row]) as any[];
  assert.equal(out.id, 'provider_1');
  assert.equal(out.name, 'Denron Plumbing & HVAC');
  assert.equal(out.type, 'service_provider');
  assert.equal(out.rating, 4);
  assert.equal(out.subscriptionTier, 'enterprise');
  assert.deepEqual(out.categories, ['plumbing']);
  assert.equal(out.matchScore, 91);
});

test('every row is cleaned, not just the first', () => {
  const out = withholdProviderContact([row, { ...row, id: 'provider_2' }, { ...row, id: 'provider_3' }]);
  assert.equal(out.length, 3);
  for (const r of out) assert.equal('email' in r, false);
});

test('a row that never had an address is unharmed', () => {
  const [out] = withholdProviderContact([{ id: 'p', name: 'No Address Ltd' }]) as any[];
  assert.deepEqual(out, { id: 'p', name: 'No Address Ltd' });
});

test('the detector finds an address at the top level, nested, and in an array', () => {
  assert.equal(carriesProviderContact([row]), true);
  assert.equal(carriesProviderContact({ success: true, matchingProviders: [row] }), true);
  assert.equal(carriesProviderContact({ a: { b: { c: { contactEmail: 'x@y.z' } } } }), true);
});

test('the detector clears the payload the route now returns', () => {
  const payload = {
    success: true,
    analysis: { summary: 'A plumbing job.', confidence: 80, categories: ['plumbing'] },
    matchingProviders: withholdProviderContact([row, { ...row, id: 'provider_2' }]),
  };
  assert.equal(carriesProviderContact(payload), false);
});

test('contactEmail is caught too, because loadBidProviders reads either name', () => {
  // `loadBidProviders` takes `r.email || r.contactEmail`, so a row shaped the
  // second way must not be reported clean by the detector.
  assert.equal(carriesProviderContact([{ id: 'p', contactEmail: 'x@y.z' }]), true);
});

test('rubbish in does not throw', () => {
  assert.deepEqual(withholdProviderContact(null), []);
  assert.deepEqual(withholdProviderContact(undefined), []);
  assert.deepEqual(withholdProviderContact([] as any), []);
  assert.equal(carriesProviderContact(null), false);
  assert.equal(carriesProviderContact('a string'), false);
  assert.equal(carriesProviderContact(7), false);
});
