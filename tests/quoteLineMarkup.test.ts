/**
 * Where the overhead and contingency actually went, line by line.
 *
 * The property that matters is reconciliation: every column must sum to the
 * figure the quote stores and the customer-facing total was built from. A
 * breakdown that is three cents off the total printed beside it is worse than
 * no breakdown, because it reads as an error in the pricing.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { quoteLineMarkup } from '../src/app/lib/quoteLineMarkup.ts';

/** Eric's own example: seven lines, $1,600 of overhead and contingency. */
const sevenLineQuote = {
  overheadPercent: 0.1127,
  profitPercent: 0,
  contingencyPercent: 0.0376,
  overheadAmount: 1200,
  profitAmount: 0,
  contingencyAmount: 400,
  materials: [
    { name: 'Lumber', quantity: 1, unitCost: 4000 },
    { name: 'Fixtures', quantity: 1, unitCost: 900 },
    { name: 'Tile', quantity: 1, unitCost: 650 },
    { name: 'Fasteners', quantity: 1, unitCost: 200 },
  ],
  labor: [
    { role: 'Carpentry', hours: 1, hourlyRate: 3200 },
    { role: 'Electrical', hours: 1, hourlyRate: 1500 },
    { role: 'Cleanup', hours: 1, hourlyRate: 200 },
  ],
};

test('every line gets a share and the columns sum to the stored amounts', () => {
  const { lines, totals } = quoteLineMarkup(sevenLineQuote);
  assert.equal(lines.length, 7);
  // TO THE PENNY. This is the whole point of allocating rather than computing
  // each line independently.
  assert.equal(totals.overhead, 1200);
  assert.equal(totals.contingency, 400);
  assert.equal(totals.markup, 1600);
});

test('the share is proportional to cost, as Eric chose', () => {
  const { lines } = quoteLineMarkup(sevenLineQuote);
  const lumber = lines.find((l) => l.label === 'Lumber')!;
  const fasteners = lines.find((l) => l.label === 'Fasteners')!;
  // $4,000 against $200 — twenty times the cost, twenty times the overhead.
  assert.ok(Math.abs(lumber.overhead / fasteners.overhead - 20) < 0.01);
  assert.equal(lumber.directCost, 4000);
  assert.equal(fasteners.directCost, 200);
});

test('a line carries its direct cost plus its own markup as its price', () => {
  const { lines } = quoteLineMarkup(sevenLineQuote);
  for (const line of lines) {
    assert.equal(
      line.price,
      Math.round((line.directCost + line.markup) * 100) / 100,
      `${line.label} price should be cost plus markup`,
    );
  }
});

test('an indivisible total still reconciles exactly', () => {
  // $100 over three equal lines is 33.33 three times, which is 99.99. The
  // remainder has to land somewhere or the column is a penny short.
  const { totals, lines } = quoteLineMarkup({
    overheadAmount: 100,
    profitAmount: 0,
    contingencyAmount: 0,
    materials: [
      { name: 'A', quantity: 1, unitCost: 10 },
      { name: 'B', quantity: 1, unitCost: 10 },
      { name: 'C', quantity: 1, unitCost: 10 },
    ],
  });
  assert.equal(totals.overhead, 100);
  assert.equal(lines.length, 3);
  const summed = Math.round(lines.reduce((s, l) => s + l.overhead, 0) * 100) / 100;
  assert.equal(summed, 100);
});

test('the stored amount wins over the rate', () => {
  // A rate edited without a re-price must not move the breakdown off the
  // figure `totalCost` was built from.
  const { totals } = quoteLineMarkup({
    // 50% would be $500 of overhead; the stored figure says the quote was
    // actually priced at $100.
    overheadPercent: 0.5,
    overheadAmount: 100,
    materials: [{ name: 'A', quantity: 1, unitCost: 1000 }],
  });
  assert.equal(totals.overhead, 100);
});

test('a quote priced before applyMargins falls back to the rate', () => {
  // No stored amounts at all. Showing nothing on a quote that genuinely
  // carries 10% overhead would be the worse answer.
  const { totals } = quoteLineMarkup({
    overheadPercent: 0.1,
    materials: [{ name: 'A', quantity: 1, unitCost: 1000 }],
  });
  assert.equal(totals.overhead, 100);
});

test('labour is hours times rate, not quantity times price', () => {
  const { lines } = quoteLineMarkup({
    overheadAmount: 80,
    labor: [{ role: 'Framing', hours: 8, hourlyRate: 100 }],
  });
  assert.equal(lines[0].directCost, 800);
  assert.equal(lines[0].overhead, 80);
});

test('a credit reduces the markup rather than being ignored', () => {
  // The customer supplied $500 of the materials. That is $500 the job does not
  // cost us, so it is $500 that should not carry margin — and the credit line
  // shows a NEGATIVE share, which is what makes the column add up.
  const { lines, totals } = quoteLineMarkup({
    overheadAmount: 50,
    materials: [{ name: 'Tile', quantity: 1, unitCost: 1000 }],
    credits: [{ description: 'Customer-supplied tile', amount: 500 }],
  });
  const credit = lines.find((l) => l.kind === 'credit')!;
  assert.equal(credit.directCost, -500);
  assert.ok(credit.overhead < 0, 'a credit should carry negative overhead');
  assert.equal(totals.overhead, 50);
});

test('a zero-quantity line carries nothing', () => {
  // Defaulting quantity to 1 would invent a cost the quote does not contain,
  // and then hand it a share of the overhead.
  const { lines } = quoteLineMarkup({
    overheadAmount: 100,
    materials: [
      { name: 'Ordered', quantity: 4, unitCost: 25 },
      { name: 'Not ordered', quantity: 0, unitCost: 25 },
    ],
  });
  const none = lines.find((l) => l.label === 'Not ordered')!;
  assert.equal(none.directCost, 0);
  assert.equal(none.overhead, 0);
});

test('a quote with no lines does not throw and claims no markup', () => {
  const result = quoteLineMarkup({ overheadAmount: 500 });
  assert.deepEqual(result.lines, []);
  assert.equal(result.totals.directCost, 0);
});

test('a quote with no markup says so, so nothing is drawn', () => {
  const result = quoteLineMarkup({
    materials: [{ name: 'A', quantity: 1, unitCost: 100 }],
  });
  assert.equal(result.hasMarkup, false);
  assert.equal(result.totals.markup, 0);
});

test('null and undefined quotes are survivable', () => {
  assert.equal(quoteLineMarkup(null).lines.length, 0);
  assert.equal(quoteLineMarkup(undefined).hasMarkup, false);
});

test('laborItems is read when labor is absent', () => {
  // Both spellings exist in the store.
  const { lines } = quoteLineMarkup({
    overheadAmount: 10,
    laborItems: [{ role: 'Tiling', hours: 2, hourlyRate: 50 }],
  });
  assert.equal(lines.length, 1);
  assert.equal(lines[0].directCost, 100);
});

test('percentages stored as whole numbers are read as percentages', () => {
  // 10 means ten per cent, not ten times — the fault that once shipped 40%
  // overhead on every repriced quote.
  const { totals } = quoteLineMarkup({
    overheadPercent: 10,
    materials: [{ name: 'A', quantity: 1, unitCost: 1000 }],
  });
  assert.equal(totals.overhead, 100);
});

/*
 * The copy in the Invoice Manager has to come to the same money as the quote.
 *
 * Eric: "when i save them the invocie manager should show a copy." A copy that
 * bills a different figure is not a copy. The draft-invoice route builds its
 * lines with `invoiceLinesFromQuote` and lets `invoiceTotals` add them up, so
 * this pins the composition of those two against the quote's own total.
 */
import { invoiceLinesFromQuote } from '../supabase/functions/server/quoteInvoiceLines.ts';
import { invoiceTotals, normaliseLineItems } from '../supabase/functions/server/invoiceDraft.ts';
import { applyMargins } from '../supabase/functions/server/quoteMargins.ts';

test('the draft invoice bills what the quote says, to the penny', () => {
  const materials = [
    { name: 'Lumber', quantity: 20, unitCost: 200 },
    { name: 'Fixtures', quantity: 3, unitCost: 300 },
  ];
  const labor = [{ role: 'Carpentry', hours: 32, hourlyRate: 100 }];

  const materialsSubtotal = 20 * 200 + 3 * 300;
  const laborSubtotal = 32 * 100;

  // Priced the way the server prices: 10% overhead, 10% profit, 5% contingency.
  const margins = applyMargins({
    materialsSubtotal,
    laborSubtotal,
    additionalCostsSubtotal: 0,
    creditsSubtotal: 0,
    overheadPercent: 0.1,
    profitPercent: 0.1,
    contingencyPercent: 0.05,
    taxRatePercent: 0,
  });

  const quote = {
    materials,
    labor,
    materialsSubtotal,
    laborSubtotal,
    ...margins,
  };

  const lines = invoiceLinesFromQuote(quote as any);
  const totals = invoiceTotals(normaliseLineItems(lines.map((l) => ({
    description: l.description,
    quantity: l.quantity,
    unit_price: l.unit_price,
    is_taxable: l.is_taxable,
  }))), { tax_rate: 0 });

  // No tax in this fixture, so the invoice total IS the quote's pre-tax total.
  assert.equal(totals.total, margins.preTaxTotal);
  assert.equal(totals.total, margins.totalCost);
});

test('the per-line markup shown adds up to what the invoice adds on', () => {
  // The office breakdown and the customer's invoice are two views of one
  // apportionment. If they disagree, one of them is lying about the margin.
  const quote = {
    materials: [{ name: 'Tile', quantity: 10, unitCost: 50 }],
    labor: [{ role: 'Tiling', hours: 10, hourlyRate: 60 }],
    materialsSubtotal: 500,
    laborSubtotal: 600,
    overheadAmount: 110,
    profitAmount: 110,
    contingencyAmount: 55,
    overheadPercent: 0.1,
    profitPercent: 0.1,
    contingencyPercent: 0.05,
    preTaxTotal: 1375,
  };

  const { totals } = quoteLineMarkup(quote);
  const lines = invoiceLinesFromQuote(quote as any);
  const billed = Math.round(lines.reduce((s, l) => s + l.quantity * l.unit_price, 0) * 100) / 100;

  // Direct cost plus every penny of markup is what the customer is billed.
  assert.equal(Math.round((totals.directCost + totals.markup) * 100) / 100, billed);
});
