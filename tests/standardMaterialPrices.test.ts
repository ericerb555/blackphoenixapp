/**
 * The standard material price book, and the matcher that decides when it applies.
 *
 * WHY THE MATCHER IS THE RISK
 *
 * A price from this book is labelled `standard`, which reads as
 * semi-authoritative — not a vendor's quote, but not a guess either. That
 * makes a WRONG match worse than no match at all: an unmatched line keeps the
 * model's number and says `estimated`, which is honest, while a mismatched one
 * produces a stable, confident, wrong figure.
 *
 * The unit check is the sharpest edge. Pricing 500 linear feet of trim at a
 * per-stud rate, or a square of siding per square foot, is wrong by a factor
 * of a hundred and still looks like a plausible number on a quote.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STANDARD_MATERIAL_PRICES,
  matchStandardMaterial,
  normaliseUnit,
} from '../supabase/functions/server/standardMaterialPrices.ts';

/* ── the book itself ──────────────────────────────────────────────────────── */

test('every entry is usable', () => {
  // A zero price would quietly make a material free; a missing unit would
  // defeat the unit check that stops the hundredfold errors.
  for (const entry of STANDARD_MATERIAL_PRICES) {
    assert.ok(entry.id, 'every entry needs an id to be traceable');
    assert.ok(entry.price > 0, `${entry.id} has no price`);
    assert.ok(entry.unit, `${entry.id} has no unit`);
    assert.ok(entry.all.length > 0, `${entry.id} would match everything`);
    for (const token of entry.all) {
      assert.equal(token, token.toLowerCase(), `${entry.id}: tokens are matched lowercased`);
    }
  }
});

test('ids are unique', () => {
  // Two entries sharing an id would make a priced line untraceable to the
  // figure that produced it.
  const ids = STANDARD_MATERIAL_PRICES.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('the entries that overlap the real catalogue carry the real price', () => {
  // Granite State Building Supply's own published figures, 2026-09-27. If the
  // book drifted from them, the same material would cost one thing when the
  // vendor is consulted and another when the book is.
  const priceOf = (id: string) => STANDARD_MATERIAL_PRICES.find((e) => e.id === id)?.price;
  assert.equal(priceOf('sheet-osb-716'), 19.85);
  assert.equal(priceOf('lumber-2x4-stud'), 4.12);
  assert.equal(priceOf('lumber-2x8-pt-12'), 21.40);
  assert.equal(priceOf('sheet-cement-board'), 12.90);
  assert.equal(priceOf('floor-lvp'), 2.48);
  assert.equal(priceOf('floor-engineered-oak'), 4.85);
  assert.equal(priceOf('floor-underlayment-acoustic'), 0.42);
  assert.equal(priceOf('floor-transition-oak'), 18.75);
  assert.equal(priceOf('fastener-screws-925'), 34.60);
  assert.equal(priceOf('hardware-joist-hanger'), 2.35);
});

/* ── units ───────────────────────────────────────────────────────────────── */

test('units that mean the same thing resolve the same way', () => {
  assert.equal(normaliseUnit('EA'), 'each');
  assert.equal(normaliseUnit('pieces'), 'each');
  assert.equal(normaliseUnit('sq ft'), 'sqft');
  assert.equal(normaliseUnit('SF'), 'sqft');
  assert.equal(normaliseUnit('square feet'), 'sqft');
  assert.equal(normaliseUnit('lin. ft'), 'lnft');
  assert.equal(normaliseUnit('LF'), 'lnft');
  assert.equal(normaliseUnit('Sheets'), 'sheet');
  assert.equal(normaliseUnit('gal'), 'gallon');
});

test('no unit at all is not a disagreement', () => {
  // Plenty of takeoff lines omit the unit, and refusing to price those would
  // throw away most of the book's usefulness for no safety gain.
  assert.equal(normaliseUnit(''), null);
  assert.equal(normaliseUnit(undefined), null);
  const hit = matchStandardMaterial({ name: 'OSB sheathing 7/16' });
  assert.equal(hit?.id, 'sheet-osb-716');
});

test('a unit that disagrees blocks the match outright', () => {
  // THE EXPENSIVE CASE. Vinyl siding is priced per square (100 sq ft); a line
  // measured in square feet must not take that number, or the material cost
  // comes out a hundred times too high and still looks like a price.
  assert.equal(matchStandardMaterial({ name: 'Vinyl siding', unit: 'square' })?.id, 'siding-vinyl');
  assert.equal(matchStandardMaterial({ name: 'Vinyl siding', unit: 'sq ft' }), null);

  // And the reverse: a per-each stud price must not be applied to linear feet.
  assert.equal(matchStandardMaterial({ name: '2x4 stud', unit: 'each' })?.id, 'lumber-2x4-stud');
  assert.equal(matchStandardMaterial({ name: '2x4 stud', unit: 'linear ft' }), null);
});

/* ── matching ────────────────────────────────────────────────────────────── */

test('a material the book covers is priced from it', () => {
  assert.equal(matchStandardMaterial({ name: 'Drywall, 1/2 inch 4x8 sheet' })?.id, 'sheet-drywall-half');
  assert.equal(matchStandardMaterial({ name: 'Architectural shingles', unit: 'bundle' })?.id, 'roof-shingles-arch');
  assert.equal(matchStandardMaterial({ name: 'Interior paint, eggshell', unit: 'gallon' })?.id, 'paint-interior-latex');
  assert.equal(matchStandardMaterial({ name: 'Thinset mortar', unit: 'bag' })?.id, 'tile-thinset');
});

test('every token must appear, not just one', () => {
  // "joint compound" must not be matched by "compound" alone, which could be
  // anything from a polishing compound to a patching compound.
  assert.equal(matchStandardMaterial({ name: 'Joint compound' })?.id, 'drywall-compound');
  assert.equal(matchStandardMaterial({ name: 'Rubbing compound' }), null);
});

test('pressure-treated lumber is not priced as kiln-dried, or the reverse', () => {
  // The two sit at very different prices and the names overlap almost
  // entirely, which is exactly where an `none` guard earns its place.
  assert.equal(matchStandardMaterial({ name: '2x4 pressure treated 8ft' })?.id, 'lumber-2x4-pt-8');
  assert.equal(matchStandardMaterial({ name: '2x4 stud, kiln dried SPF' })?.id, 'lumber-2x4-stud');
  // A PT stud must take the PT price, never the cheaper dry one.
  const pt = matchStandardMaterial({ name: '2x4 pressure treated stud' });
  assert.equal(pt?.id, 'lumber-2x4-pt-8');
});

test('drywall accessories are not priced as sheets of drywall', () => {
  assert.equal(matchStandardMaterial({ name: 'Drywall tape', unit: 'roll' })?.id, 'drywall-tape');
  assert.equal(matchStandardMaterial({ name: 'Drywall screws' }), null, 'no entry for these yet, and guessing is worse');
});

test('a material the book does not cover returns nothing', () => {
  // The expected answer for most of a real takeoff. The line keeps the model's
  // price and stays marked `estimated`, which is the honest outcome.
  assert.equal(matchStandardMaterial({ name: 'Custom walnut range hood surround' }), null);
  assert.equal(matchStandardMaterial({ name: 'Quartz countertop slab' }), null);
  assert.equal(matchStandardMaterial({ name: '' }), null);
  assert.equal(matchStandardMaterial({}), null);
});

test('the description is searched as well as the name', () => {
  // Takeoff lines often put the specifics in the description.
  const hit = matchStandardMaterial({ name: 'Sheathing', description: 'OSB 7/16 for the walls' });
  assert.equal(hit?.id, 'sheet-osb-716');
});
