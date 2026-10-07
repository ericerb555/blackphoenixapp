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

/* ── the units the assembler expects ──────────────────────────────────────── */

/*
  WHY THESE EXIST

  `repriceEstimate` hands three fields to `assembleEstimate`, which reads them
  as FRACTIONS and clamps them — overhead and profit at 0.4, tax at 0.15. The
  company's settings hold PERCENTAGES, which is how every other reader uses
  them (`capitalPlanRules` computes `base * (1 + overheadPercentage / 100)`).

  Passing 10 and 15 straight across meant `Math.min(0.4, 10)` — so every
  repriced quote carried 40% overhead and 40% profit instead of 10% and 15%,
  and a representative job came out at 1.88x direct cost instead of 1.35x.
  Nothing looked wrong: an expensive quote reads as an expensive quote.

  Measured against production's own saved settings on 2026-10-07, not deduced.
*/

import { repriceEstimate } from '../supabase/functions/server/repriceEstimate.ts';

/** Eric's figures, exactly as production holds them. */
const HIS_SETTINGS = {
  materialMarkup: 20,
  laborMarkup: 15,
  overheadPercentage: 10,
  profitMargin: 20,
  taxRate: 0,
};

const bareEstimate = () => ({
  materials: [{ name: 'OSB sheathing', quantity: 10, unitCost: 25, unit: 'sheet' }],
  labor: [{ role: 'Carpentry', hours: 10, hourlyRate: 60 }],
});

test('overhead and profit are handed over as fractions, not percentages', () => {
  const { estimate } = repriceEstimate(bareEstimate(), {
    catalog: [],
    rates: [{ id: 'carpentry', category: 'Carpentry', hourlyRate: 70 }],
    settings: HIS_SETTINGS,
  });

  // 10% and 20%, not 10 and 20 — which the assembler would clamp to 0.4 each.
  assert.equal(estimate.overheadPercent, 0.10);
  assert.equal(estimate.profitPercent, 0.20);

  // The thing that actually went wrong, asserted as the assembler would do it.
  assert.equal(Math.min(0.4, estimate.overheadPercent), 0.10, 'must not hit the ceiling');
  assert.equal(Math.min(0.4, estimate.profitPercent), 0.20, 'must not hit the ceiling');
});

test('no sales tax stays no sales tax', () => {
  // New Hampshire has none, `STANDARD_PRICING.taxRate` is 0 on purpose, and a
  // wrong tax line is worse than none.
  const { estimate } = repriceEstimate(bareEstimate(), {
    catalog: [],
    rates: [],
    settings: HIS_SETTINGS,
  });
  assert.equal(estimate.taxRatePercent, 0);
});

test('a real tax rate is converted rather than passed through', () => {
  // A job in Massachusetts, set deliberately. 6.25% must arrive as 0.0625 —
  // as a percentage it would clamp to the 0.15 ceiling and charge 15%.
  const { estimate } = repriceEstimate(bareEstimate(), {
    catalog: [],
    rates: [],
    settings: { ...HIS_SETTINGS, taxRate: 6.25 },
  });
  assert.equal(estimate.taxRatePercent, 0.0625);
  assert.equal(Math.min(0.15, estimate.taxRatePercent), 0.0625);
});

test('nonsense in a settings percentage becomes zero, not a clamped maximum', () => {
  const { estimate } = repriceEstimate(bareEstimate(), {
    catalog: [],
    rates: [],
    settings: { ...HIS_SETTINGS, overheadPercentage: -5, profitMargin: 'twenty' as any },
  });
  assert.equal(estimate.overheadPercent, 0);
  assert.equal(estimate.profitPercent, 0);
});

/* ── the standard price book as the middle rung ───────────────────────────── */

/*
  Materials used to have two outcomes: a catalogue hit or the model's guess.
  With 11 catalogue items in production that meant nearly every line was a
  guess, re-made from scratch on every quote. The standard book is the rung
  labour always had — `PriceSource` has carried 'standard' since it was
  written and only labour ever used it.

  What these assert is mostly about what a `standard` line must NOT claim.
*/

test('a material no vendor sells falls to the standard book, labelled as such', () => {
  const { estimate, summary } = repriceEstimate(
    { materials: [{ name: 'OSB sheathing 7/16', quantity: 10, unit: 'sheet', unitCost: 99 }], labor: [] },
    { catalog: [], rates: [], settings: { materialMarkup: 0 } },
  );

  const line = estimate.materials[0];
  assert.equal(line.priceSource, 'standard');
  assert.equal(line.unitCost, 19.85, "the book's figure, not the model's 99");
  assert.equal(line.modelUnitCost, 99, 'what the model thought is kept for comparison');
  assert.equal(summary.materialsAtStandardPrices, 1);
  assert.equal(summary.materialsFromCatalogue, 0);
});

test('a real vendor price still beats the book', () => {
  // The book is a floor to stand on, never a substitute for a price somebody
  // actually published.
  const { estimate, summary } = repriceEstimate(
    { materials: [{ name: 'OSB sheathing 7/16', quantity: 1, unit: 'sheet', unitCost: 99 }], labor: [] },
    {
      catalog: [{ vendorId: 'V1', vendorName: 'Granite State', name: 'OSB sheathing 7/16', price: 21.5, isActive: true }],
      rates: [],
      settings: { materialMarkup: 0 },
    },
  );

  assert.equal(estimate.materials[0].priceSource, 'catalogue');
  assert.equal(estimate.materials[0].unitCost, 21.5);
  assert.equal(summary.materialsFromCatalogue, 1);
  assert.equal(summary.materialsAtStandardPrices, 0);
});

test('a standard price never carries a vendor, not even the one the model invented', () => {
  // THE IMPORTANT ONE. The vendor fallback chain reaches the model's own
  // invented supplier name, so without the guard a reference figure from this
  // repository would go out attributed to a company that never quoted it —
  // a worse lie than the guess it replaced, because the number looks sourced.
  const { estimate } = repriceEstimate(
    {
      materials: [{
        name: 'Thinset mortar', quantity: 4, unit: 'bag', unitCost: 30,
        vendor: 'Totally Real Supply Co',
      }],
      labor: [],
    },
    { catalog: [], rates: [], settings: { materialMarkup: 0 } },
  );

  assert.equal(estimate.materials[0].priceSource, 'standard');
  assert.equal(estimate.materials[0].vendor, '');
  assert.equal(estimate.materials[0].pricedFrom.vendor, '');
  assert.equal(estimate.materials[0].pricedFrom.offerId, '');
  assert.equal(estimate.materials[0].pricedFrom.standardId, 'tile-thinset', 'traceable to the figure');
});

test('the markup applies to a book price like any other cost', () => {
  const { estimate } = repriceEstimate(
    { materials: [{ name: 'Thinset mortar', quantity: 1, unit: 'bag', unitCost: 99 }], labor: [] },
    { catalog: [], rates: [], settings: { materialMarkup: 20 } },
  );
  assert.equal(estimate.materials[0].unitCost, 21.60, '18.00 plus 20%');
});

test('a book price counts as defensible but never as the company\'s own', () => {
  // The distinction the whole labelling scheme exists for: `confidence` says
  // "not a guess", `onYourFigures` says "Eric set this". A book price is the
  // first and not the second.
  const { summary } = repriceEstimate(
    { materials: [{ name: 'Thinset mortar', quantity: 1, unit: 'bag', unitCost: 99 }], labor: [] },
    { catalog: [], rates: [], settings: { materialMarkup: 0 } },
  );

  assert.equal(summary.confidence, 1, 'all of it is priced from a real figure');
  assert.equal(summary.onYourFigures, 0, 'and none of it is his');
  assert.match(summary.note, /standard material prices/);
  assert.match(summary.note, /none of it is your own figures yet/);
});

test('the note names trade rates and material prices separately', () => {
  // It used to say "standard trade rates" whatever the standard part was. A
  // quote whose standard portion is entirely materials would have been
  // described as resting on labour rates.
  const materialsOnly = repriceEstimate(
    { materials: [{ name: 'Thinset mortar', quantity: 1, unit: 'bag', unitCost: 9 }], labor: [] },
    { catalog: [], rates: [], settings: { materialMarkup: 0 } },
  ).summary;
  assert.match(materialsOnly.note, /standard material prices/);
  assert.doesNotMatch(materialsOnly.note, /trade rates/);

  const both = repriceEstimate(
    {
      materials: [{ name: 'Thinset mortar', quantity: 1, unit: 'bag', unitCost: 9 }],
      labor: [{ role: 'Carpentry', hours: 1, hourlyRate: 50 }],
    },
    {
      catalog: [],
      // A rate that MATCHES, from the standard table rather than Eric's own —
      // which is what makes the labour line 'standard' instead of 'estimated'.
      rates: [{ id: 'carpentry', category: 'Carpentry', hourlyRate: 65 }],
      settings: { materialMarkup: 0 },
      ratesAreStandard: true,
    },
  ).summary;
  assert.match(both.note, /standard trade rates and standard material prices/);
});
