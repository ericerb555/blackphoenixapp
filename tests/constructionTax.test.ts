/**
 * Sales tax on a construction job.
 *
 * WHY THESE ASSERTIONS
 *
 * The same job was coming out at two different totals depending on which
 * screen last touched it: the quote generator and the quote editor taxed
 * materials, and the pipeline's materials re-sync taxed materials plus labour.
 * On a job with $4,000 of labour at 8% that is $320 charged to a customer who
 * does not owe it — appearing and disappearing as the quote moved between
 * screens, with nothing visible either way because both numbers look like a
 * total.
 *
 * The rate convention is the other trap: quote records store 0.08 and the
 * invoice builder stores 8. A reader that picked one would be wrong by a
 * factor of a hundred for half its callers.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  constructionTax, taxableBase, readRate,
} from '../src/app/lib/constructionTax.ts';

/* ── materials only ──────────────────────────────────────────────────────── */

test('labour is not taxed — it is not even an argument', () => {
  assert.equal(constructionTax({ materials: 6000, rate: 0.08 }), 480);
});

test('the old materials-plus-labour answer is not reachable', () => {
  // $6,000 materials, $4,000 labour at 8%: materials-only is 480, the wrong
  // answer was 800. $320 of tax the customer never owed.
  assert.notEqual(constructionTax({ materials: 10000, rate: 0.08 }), 480);
  assert.equal(constructionTax({ materials: 6000, rate: 0.08 }), 480);
});

/* ── credits leave the base before the rate ──────────────────────────────── */

test('material the customer supplied is not taxed', () => {
  assert.equal(taxableBase({ materials: 6000, credits: 1240, rate: 0 }), 4760);
  assert.equal(constructionTax({ materials: 6000, credits: 1240, rate: 0.08 }), 380.8);
});

test('a credit larger than the materials cannot produce a negative tax', () => {
  assert.equal(taxableBase({ materials: 500, credits: 900, rate: 0 }), 0);
  assert.equal(constructionTax({ materials: 500, credits: 900, rate: 0.08 }), 0);
});

test('a credit written as a negative is still a credit', () => {
  assert.equal(taxableBase({ materials: 6000, credits: -1240, rate: 0 }), 4760);
});

/* ── the rate, written either way ────────────────────────────────────────── */

test('a fraction and a percent give the same answer', () => {
  assert.equal(constructionTax({ materials: 6000, rate: 0.08 }), 480);
  assert.equal(constructionTax({ materials: 6000, rate: 8 }), 480);
});

test('an absurd rate is clamped rather than billed', () => {
  assert.equal(readRate(5000), 0.25, 'a data error must not reach a customer as a dollar figure');
});

test('no rate is no tax', () => {
  assert.equal(readRate(0), 0);
  assert.equal(readRate(undefined), 0);
  assert.equal(readRate(-3), 0);
  assert.equal(constructionTax({ materials: 6000, rate: 0 }), 0);
});

/* ── and the empty cases ─────────────────────────────────────────────────── */

test('no materials is no tax, whatever the labour', () => {
  assert.equal(constructionTax({ materials: 0, rate: 0.08 }), 0);
});

test('nonsense in is zero out, not NaN on an invoice', () => {
  assert.equal(constructionTax({ materials: NaN, rate: 0.08 }), 0);
  assert.equal(constructionTax({ materials: 6000, rate: NaN }), 0);
});
