/**
 * `matchCatalogItem` — which catalogue line a material is priced from.
 *
 * WHY THIS FILE IS FIRST
 *
 * Because the bug it covers reached production and nothing caught it. The matcher
 * took whichever line matched FIRST, and first meant first in the array — which
 * is whatever order the KV read handed back. So when two vendors published the
 * same SKU, the price a customer was quoted depended on row order and could
 * differ between two identical requests.
 *
 * A quote is money, someone else's, on a document with our name at the top. The
 * assertions below are the ones that would have failed before the fix, plus the
 * behaviour that must not change while fixing it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchCatalogItem, type CatalogItem } from '../supabase/functions/server/repriceEstimate.ts';

const item = (vendorId: string, name: string, sku: string, price: number): CatalogItem =>
  ({ vendorId, vendorName: vendorId, name, sku, price, unit: 'each', isActive: true, offerId: `o-${vendorId}` });

test('two vendors on the same SKU: the cheapest wins, dearest listed first', () => {
  const catalog = [
    item('dear', '2x4 Pressure Treated 8ft', 'BP-2X4PT-8', 11.40),
    item('cheap', '2x4 Pressure Treated 8ft', 'BP-2X4PT-8', 8.74),
  ];
  const hit = matchCatalogItem({ name: 'whatever', sku: 'BP-2X4PT-8' }, catalog);
  assert.equal(hit?.vendorId, 'cheap');
  assert.equal(hit?.price, 8.74);
});

test('and the answer does not depend on the order rows arrive in', () => {
  const catalog = [
    item('dear', '2x4 Pressure Treated 8ft', 'BP-2X4PT-8', 11.40),
    item('cheap', '2x4 Pressure Treated 8ft', 'BP-2X4PT-8', 8.74),
  ];
  const a = matchCatalogItem({ name: 'x', sku: 'BP-2X4PT-8' }, catalog);
  const b = matchCatalogItem({ name: 'x', sku: 'BP-2X4PT-8' }, [...catalog].reverse());
  assert.equal(a?.vendorId, b?.vendorId, 'the same question must get the same answer');
});

test('equally specific name matches: the cheapest wins', () => {
  const hit = matchCatalogItem({ name: 'Simpson joist hanger for 2x8', sku: '' }, [
    item('dear', 'joist hanger', 'A-1', 4.10),
    item('cheap', 'joist hanger', 'B-2', 2.85),
  ]);
  assert.equal(hit?.vendorId, 'cheap');
});

test('a more specific match beats a cheaper vaguer one', () => {
  // The guard that matters: pricing the WRONG product cheaply is worse than
  // pricing the right one dearly.
  const hit = matchCatalogItem({ name: 'galvanized joist hanger 2x8 heavy', sku: '' }, [
    item('cheapVague', 'joist hanger', 'A-1', 2.00),
    item('dearExact', 'galvanized joist hanger 2x8', 'B-2', 6.50),
  ]);
  assert.equal(hit?.vendorId, 'dearExact');
});

test('an exact SKU wins outright, however cheap a name match is', () => {
  const hit = matchCatalogItem({ name: 'deck screw 3in', sku: 'DS-3IN' }, [
    item('nameOnly', 'deck screw 3in', 'X-1', 0.10),
    item('skuMatch', 'fastener', 'DS-3IN', 0.22),
  ]);
  assert.equal(hit?.vendorId, 'skuMatch');
});

test('the offer id survives, which is what a quote records', () => {
  const hit = matchCatalogItem({ name: 'joist hanger', sku: '' }, [item('v', 'joist hanger', 'A', 3)]);
  assert.equal(hit?.offerId, 'o-v');
});

// ── behaviour that must NOT change ──────────────────────────────────────────

test('a zero-priced line is not a match', () => {
  assert.equal(matchCatalogItem({ name: 'joist hanger', sku: '' }, [item('v', 'joist hanger', 'A', 0)]), null);
});

test('an inactive line is not a match', () => {
  const inactive = { ...item('v', 'joist hanger', 'A', 3), isActive: false };
  assert.equal(matchCatalogItem({ name: 'joist hanger', sku: '' }, [inactive]), null);
});

test('a one-word catalogue name is too weak to price from', () => {
  assert.equal(matchCatalogItem({ name: 'box of screws', sku: '' }, [item('v', 'screws', 'A', 3)]), null);
});

test('a partial word match is refused', () => {
  // "joist hanger" does not contain every significant word of
  // "galvanized joist hanger heavy", so it is not that product.
  assert.equal(
    matchCatalogItem({ name: 'joist hanger', sku: '' }, [item('v', 'galvanized joist hanger heavy', 'A', 3)]),
    null,
  );
});

test('an empty catalogue is a miss rather than a crash', () => {
  assert.equal(matchCatalogItem({ name: 'anything', sku: 'X' }, []), null);
});
