/**
 * `productMatch` — deciding that two suppliers sell the same thing.
 *
 * A wrong merge puts one supplier's price against another supplier's product, so
 * a customer's job gets quoted from an item nobody is going to deliver. The
 * number looks exactly like a right one, which is why the interesting assertions
 * here are the REFUSALS: what it declines to guess matters more than what it
 * matches.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normaliseName, normaliseUnit, scorePair, proposeMerges, AUTO_TICK,
  type MatchCandidate,
} from '../supabase/functions/server/productMatch.ts';

const make = (
  id: string, name: string, unit: string, category: string, skus: string[], vendors: string[],
): MatchCandidate => ({ productId: id, name, unit, category, skus, vendorIds: vendors });

// ── normalisation: form only, never meaning ────────────────────────────────

test('inch marks are normalised in every form a spreadsheet produces', () => {
  assert.equal(normaliseName('OSB Sheathing 7/16" 4x8'), 'osb sheathing 7/16 in 4x8');
  assert.equal(normaliseName('OSB 7/16″'), 'osb 7/16 in');
});

test('foot marks, spaced x, and separating punctuation', () => {
  assert.equal(normaliseName("2x4 PT 8'"), '2x4 pt 8 ft');
  assert.equal(normaliseName('2 X 4 Pressure Treated'), '2x4 pressure treated');
  assert.equal(normaliseName('Joist, 2x8, #2 SPF'), 'joist 2x8 #2 spf');
});

test('unit synonyms suppliers actually use', () => {
  assert.equal(normaliseUnit('EA'), 'each');
  assert.equal(normaliseUnit('Pcs'), 'each');
  assert.equal(normaliseUnit('SHT'), 'sheet');
  assert.equal(normaliseUnit('Lin Ft'), 'lf');
});

// ── what should be proposed ────────────────────────────────────────────────

test('identical descriptions from two suppliers arrive pre-ticked', () => {
  const p = scorePair(
    make('p1', '2x4 Pressure Treated Lumber 8ft', 'EA', 'Lumber', ['BP-2X4PT-8'], ['v1']),
    make('p2', '2X4  PRESSURE TREATED LUMBER 8FT', 'each', 'Lumber', ['SM-4408'], ['v2']),
  );
  assert.equal(p?.confidence, 0.9);
  assert.equal(p?.ticked, true);
});

test('a shared manufacturer part number is a strong signal', () => {
  const p = scorePair(
    make('p1', 'Simpson LUS28 Joist Hanger', 'EA', 'Fasteners', ['LUS28'], ['v1']),
    make('p2', 'Hanger, face mount 2x8', 'ea', 'Hardware', ['LUS-28'], ['v2']),
  );
  assert.equal(p?.confidence, 0.85);
  assert.equal(p?.ticked, true);
});

test('close, but the categories differ: shown and left unticked', () => {
  const p = scorePair(
    make('p1', 'Galvanized Roofing Nail 1-1/4 in 5 lb', 'EA', 'Fasteners', ['A1'], ['v1']),
    make('p2', 'Galvanized Roofing Nail 1-1/4 in', 'EA', 'Hardware', ['B2'], ['v2']),
  );
  assert.ok(p, 'hiding it would drop real work');
  assert.ok(p!.confidence < AUTO_TICK);
  assert.equal(p!.ticked, false, 'pre-ticking it would price a job wrong');
});

// ── what must never be proposed ───────────────────────────────────────────

test('different units are different products', () => {
  // A board priced each and a board priced per thousand board feet would put a
  // per-piece price against a per-MBF quantity.
  assert.equal(scorePair(
    make('p1', '2x4 Pressure Treated 8ft', 'EA', 'Lumber', ['A1'], ['v1']),
    make('p2', '2x4 Pressure Treated 8ft', 'MBF', 'Lumber', ['B2'], ['v2']),
  ), null);
});

test('the same vendor on both sides is not a merge', () => {
  assert.equal(scorePair(
    make('p1', '2x4 Pressure Treated 8ft', 'EA', 'Lumber', ['A1'], ['v1']),
    make('p2', '2x4 Pressure Treated 8ft', 'EA', 'Lumber', ['A2'], ['v1']),
  ), null);
});

test('unrelated products are not proposed at all', () => {
  assert.equal(scorePair(
    make('p1', '2x4 Pressure Treated 8ft', 'EA', 'Lumber', ['A1'], ['v1']),
    make('p2', 'Roofing Nails 1-1/4 in Galvanized', 'EA', 'Fasteners', ['B2'], ['v2']),
  ), null);
});

test('a short shared code is not treated as a part number', () => {
  // "A12" on two unrelated lines is a coincidence, not a manufacturer's number.
  assert.equal(scorePair(
    make('p1', 'Deck Screw 3in', 'EA', 'Fasteners', ['A12'], ['v1']),
    make('p2', 'Lag Bolt 6in', 'EA', 'Fasteners', ['A12'], ['v2']),
  ), null);
});

test('ABBREVIATIONS ARE NOT EXPANDED — this miss is deliberate', () => {
  // Teaching it that PT means pressure treated invites it to decide GALV means
  // galvanized and then that 4/4 means 1x. A miss is a merge somebody does by
  // hand; a wrong guess is a mispriced job. If this test ever starts failing,
  // somebody has taught the matcher to guess.
  assert.equal(scorePair(
    make('p1', '2x4-8 PT', 'EA', 'Lumber', ['A1'], ['v1']),
    make('p2', '2x4 Pressure Treated 8ft', 'EA', 'Lumber', ['B2'], ['v2']),
  ), null);
});

test('a product appears in only its strongest proposal', () => {
  // Asking "is A the same as B?" then "is A the same as C?" invites somebody to
  // tick both, and A cannot be two products.
  const out = proposeMerges([
    make('p1', 'OSB Sheathing 7/16 in 4x8', 'SHT', 'Sheathing', ['OSB716'], ['v1']),
    make('p2', 'OSB Sheathing 7/16 in 4x8', 'SHT', 'Sheathing', ['Z1'], ['v2']),
    make('p3', 'OSB Sheathing 7/16 in 4x8', 'SHT', 'Sheathing', ['Z2'], ['v3']),
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].ticked, true);
});
