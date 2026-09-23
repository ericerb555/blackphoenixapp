/**
 * Which suppliers this store may take money for.
 *
 * WHY THESE ASSERTIONS
 *
 * The store once sold something it could not ship: a customer paid for a
 * Zendrop item, and Zendrop's API turned out to have no way to place an order
 * at all. Every test here is a way that could happen again and look normal
 * while it did — a provider read from a field name nobody checked, a supplier
 * nobody vouched for slipping through, or the guard being so strict it refuses
 * the store's own goods and takes the whole shop down.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  providerOf, providerIsSellable, unavailableMessage, DEFAULT_SELLABLE_PROVIDERS,
} from '../supabase/functions/server/sellableProviders.ts';

/* ── reading the provider off a product ──────────────────────────────────── */

test('the provider is read from whichever field the record uses', () => {
  assert.equal(providerOf({ provider: 'cjdropshipping' }), 'cjdropshipping');
  assert.equal(providerOf({ source: 'cjdropshipping' }), 'cjdropshipping');
  assert.equal(providerOf({ providerId: 'cjdropshipping' }), 'cjdropshipping');
  assert.equal(providerOf({ supplier: 'cjdropshipping' }), 'cjdropshipping');
});

test('a record with no provider field falls back to the id prefix', () => {
  // This is how the order that could not be fulfilled was identifiable at all.
  assert.equal(providerOf({ id: 'zendrop_ZD-2746847' }), 'zendrop');
  assert.equal(providerOf({ id: 'cj_CJYD3061696' }), 'cjdropshipping');
});

test('an explicit field beats the prefix', () => {
  assert.equal(providerOf({ id: 'zendrop_ZD-1', provider: 'cjdropshipping' }), 'cjdropshipping');
});

test('nothing identifiable is empty rather than a guess', () => {
  assert.equal(providerOf({ id: 'digital-guide-01' }), '');
  assert.equal(providerOf({}), '');
  assert.equal(providerOf(null), '');
});

/* ── the allowlist ───────────────────────────────────────────────────────── */

test('CJ is sellable out of the box', () => {
  assert.ok(providerIsSellable({ id: 'cj_CJYD3061696' }));
  assert.ok(providerIsSellable({ provider: 'cjdropshipping' }));
  assert.deepEqual(DEFAULT_SELLABLE_PROVIDERS, ['cjdropshipping']);
});

test('Zendrop is not, which is the whole point', () => {
  assert.ok(!providerIsSellable({ id: 'zendrop_ZD-2746847' }),
    'the store must not take money for something it cannot order');
  assert.ok(!providerIsSellable({ provider: 'zendrop', name: 'A sweater' }));
});

test('a supplier nobody has vouched for cannot be sold', () => {
  assert.ok(!providerIsSellable({ provider: 'some-new-supplier' }),
    'an allowlist fails towards refusing, which is the recoverable direction');
});

test('adding a provider is configuration, not a deploy', () => {
  assert.ok(providerIsSellable({ provider: 'zendrop' }, ['cjdropshipping', 'zendrop']));
});

test('the comparison survives spelling and spacing', () => {
  assert.ok(providerIsSellable({ provider: 'CJ Dropshipping' }));
  assert.ok(providerIsSellable({ provider: ' cjdropshipping ' }));
});

/* ── and the generosity that keeps the shop open ─────────────────────────── */

test('a product with no supplier at all is sellable', () => {
  assert.ok(providerIsSellable({ id: 'digital-guide-01', name: 'Deck planning guide' }),
    'our own goods have no supplier to forward to, so they cannot fail to forward');
});

test('an empty allowlist does not close the shop', () => {
  assert.ok(providerIsSellable({ provider: 'cjdropshipping' }, []),
    'nothing configured is not the same as nothing allowed');
});

/* ── what the shopper is told ────────────────────────────────────────────── */

test('the shopper is told it is unavailable, not why', () => {
  const said = unavailableMessage('A sweater');
  assert.match(said, /no longer available/);
  assert.ok(!/zendrop|supplier|fulfil/i.test(said),
    'our fulfilment arrangements are not the shopper\'s problem');
});

test('an unnamed item still produces a sentence', () => {
  assert.match(unavailableMessage(), /That item is no longer available/);
});
