/**
 * The quote adds up.
 *
 * WHAT WAS WRONG
 *
 * Eric: "on the quotes the line items are not adding up to the total on the
 * bottom."
 *
 * `applyMargins` puts overhead, profit and contingency on top of direct cost
 * and folds all three into `totalCost`. Every customer-facing surface printed
 * materials, labour, tax and credits — and nothing for the markup. On the
 * standard 10/10/5 the lines came to about 80% of the figure at the bottom,
 * so a customer adding up the quote they were sent was out by a fifth of the
 * job with nothing on the page to explain it.
 *
 * WHAT THESE ASSERT
 *
 * The chain, to the penny: lines sum to their section, the sections sum to
 * the quote's own pre-tax total, and that plus tax less credits is the stored
 * `totalCost`. Each link is a separate test because each was a separate way
 * of being a cent out, and a cent out on a document about money reads as a
 * mistake in the pricing rather than in the rounding.
 *
 * `totalCost` is never recomputed anywhere in this path. It is the figure the
 * contract, the invoice and the payment are raised from, so these tests pin
 * the displayed figures TO it rather than checking two derivations agree.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyMargins } from '../supabase/functions/server/quoteMargins.ts';
import { customerQuoteView } from '../supabase/functions/server/customerQuoteView.ts';
import {
  asFraction, customerPricingOf, atCustomerPrice,
  spreadCustomerPrices, allocate, preTaxTotalOf,
} from '../supabase/functions/server/quoteCustomerPrice.ts';

const round2 = (n: number) => Math.round(n * 100) / 100;

/* ── the rates, read whichever way they were written ──────────────────────── */

test('ten per cent is ten per cent, written either way', () => {
  assert.equal(asFraction(10), 0.1);
  assert.equal(asFraction(0.1), 0.1);
  assert.equal(asFraction(undefined), 0);
  assert.equal(asFraction(''), 0);
  assert.equal(asFraction(-5), 0);
});

test('a quote with no rates on it is priced at cost', () => {
  const pricing = customerPricingOf({});
  assert.equal(pricing.markup, 0);
  assert.equal(pricing.factor, 1);
  assert.equal(atCustomerPrice(1234.56, pricing), 1234.56);
});

test('the standard 10/10/5 sells a dollar of cost for 1.25', () => {
  const pricing = customerPricingOf({
    overheadPercent: 0.1, profitPercent: 0.1, contingencyPercent: 0.05,
  });
  assert.equal(round2(pricing.factor), 1.25);
  assert.equal(atCustomerPrice(4000, pricing), 5000);
});

/* ── the rounding remainder has to land somewhere ─────────────────────────── */

test('scaled lines sum to the scaled total, not a cent under it', () => {
  const pricing = customerPricingOf({ overheadPercent: 7.5 });
  // Three lines whose individual roundings each lose a fraction of a cent.
  const costs = [33.33, 33.33, 33.34];
  const priced = spreadCustomerPrices(costs, pricing);
  const target = round2(100 * 1.075);
  assert.equal(round2(priced.reduce((s, v) => s + v, 0)), target);
});

test('an allocation hits its target exactly, and in proportion', () => {
  const parts = allocate([3000, 1800, 200], 6250);
  assert.equal(round2(parts.reduce((s, v) => s + v, 0)), 6250);
  // 3000/5000 of the target, to the penny.
  assert.equal(parts[0], 3750);
  assert.equal(parts[1], 2250);
  assert.equal(parts[2], 250);
});

test('the remainder goes on the largest line, where it cannot be read', () => {
  const pricing = customerPricingOf({ overheadPercent: 10 });
  const priced = spreadCustomerPrices([0.01, 0.01, 1000], pricing);
  assert.equal(round2(priced.reduce((s, v) => s + v, 0)), round2(1000.02 * 1.1));
  assert.equal(priced[0], 0.01);
  assert.equal(priced[1], 0.01);
});

test('the quote\'s own pre-tax total is preferred to a recomputed one', () => {
  const pricing = customerPricingOf({ overheadPercent: 0.1 });
  // A stored figure that does NOT match the rates. The stored one wins,
  // because it is what totalCost was built from.
  const preTax = preTaxTotalOf({ preTaxTotal: 9999.99, directCost: 1000 }, pricing);
  assert.equal(preTax, 9999.99);
});

/* ── the whole document, end to end ───────────────────────────────────────── */

/**
 * A job priced the way the estimator prices one: 10% overhead, 10% profit,
 * 5% contingency, 8.75% tax on materials, and a credit for the tiles the
 * customer bought themselves.
 */
const margins = applyMargins({
  materialsSubtotal: 4000,
  laborSubtotal: 6000,
  additionalCostsSubtotal: 125,
  creditsSubtotal: 500,
  overheadPercent: 0.1,
  profitPercent: 0.1,
  contingencyPercent: 0.05,
  taxRatePercent: 0.0875,
});

const pricedQuote = {
  id: 'q-priced',
  number: 'Q-2026-0100',
  clientName: 'Jane Homeowner',
  materials: [
    { id: 'm1', name: 'Lumber', quantity: 100, unit: 'each', unitCost: 25, totalCost: 2500, phase: 'Framing' },
    { id: 'm2', name: 'Fixings', quantity: 30, unit: 'box', unitCost: 50, totalCost: 1500, phase: 'Framing' },
  ],
  labor: [
    { id: 'l1', role: 'Carpenter', hours: 60, hourlyRate: 70, totalCost: 4200, phase: 'Framing' },
    { id: 'l2', role: 'Labourer', hours: 36, hourlyRate: 50, totalCost: 1800, phase: 'Strip out' },
  ],
  additionalCosts: [{ id: 'a1', name: 'Skip hire', amount: 125, phase: 'Strip out' }],
  credits: [{ id: 'c1', description: 'Tiles supplied by you', amount: 500 }],
  ...margins,
  materialsSubtotal: 4000,
  laborSubtotal: 6000,
  additionalCostsSubtotal: 125,
  creditsSubtotal: 500,
};

test('the sections, the tax and the credit make the total the customer is asked for', () => {
  const out = customerQuoteView(pricedQuote);
  const sum = round2(
    out.materialsSubtotal + out.laborSubtotal + out.otherCostsSubtotal
    + out.taxAmount - out.creditsSubtotal,
  );
  assert.equal(sum, out.totalCost);
  // And the total is the stored one, untouched.
  assert.equal(out.totalCost, margins.totalCost);
});

test('the markup is in the prices, and is nowhere named', () => {
  const out = customerQuoteView(pricedQuote);
  // 4000 of materials at 1.25.
  assert.equal(out.materialsSubtotal, 5000);
  assert.equal(out.laborSubtotal, 7500);
  assert.equal(out.otherCostsSubtotal, 156.25);
  const body = JSON.stringify(out);
  for (const leak of ['overhead', 'profit', 'contingency', 'margin', 'directCost']) {
    assert.ok(!body.toLowerCase().includes(leak.toLowerCase()), `${leak} must not travel`);
  }
});

test('the lines add up to the section above them', () => {
  const out = customerQuoteView(pricedQuote);
  const materials = round2(out.materials.reduce((s, m) => s + m.totalCost, 0));
  const labor = round2(out.labor.reduce((s, l) => s + l.totalCost, 0));
  assert.equal(materials, out.materialsSubtotal);
  assert.equal(labor, out.laborSubtotal);
});

test('quantity times the unit price is the amount printed beside it', () => {
  const out = customerQuoteView(pricedQuote);
  for (const m of out.materials) {
    assert.equal(round2(m.quantity * m.unitCost), m.totalCost, `${m.name} does not multiply`);
  }
  for (const l of out.labor) {
    assert.equal(round2(l.hours * l.hourlyRate), l.totalCost, `${l.role} does not multiply`);
  }
});

test('the charge-out rate is shown, never what the trade costs us', () => {
  const out = customerQuoteView(pricedQuote);
  const carpenter = out.labor.find((l) => l.role === 'Carpenter');
  assert.ok(carpenter);
  // $70 an hour of cost sells at $87.50, and the cost figure is not in the payload.
  assert.equal(carpenter.hourlyRate, 87.5);
  assert.ok(!JSON.stringify(out).includes('"hourlyRate":70'));
});

test('a hidden line pays its own share of the markup, not the visible lines', () => {
  const withHidden = {
    ...pricedQuote,
    materials: [
      { ...pricedQuote.materials[0] },
      { ...pricedQuote.materials[1], visible: false },
    ],
  };
  const out = customerQuoteView(withHidden);
  // The drawn line is priced at its own cost x 1.25 — 2500 becomes 3125 —
  // and emphatically not inflated to cover the hidden one.
  assert.equal(out.materials.length, 1);
  assert.equal(out.materials[0].totalCost, 3125);
  // The money stays in the section total, which is what makes the bottom
  // line right while the visible lines deliberately do not reach it.
  assert.equal(out.materialsSubtotal, 5000);
});

test('an excluded line is not charged for, priced or otherwise', () => {
  const withExcluded = {
    ...pricedQuote,
    materials: [
      { ...pricedQuote.materials[0] },
      { ...pricedQuote.materials[1], included: false },
    ],
  };
  const out = customerQuoteView(withExcluded);
  assert.equal(out.materials.length, 1);
  assert.equal(out.materials[0].totalCost, 3125);
});

test('a phase total is priced too — it is all a customer gets when lines are withheld', () => {
  const phased = {
    ...pricedQuote,
    customerSections: { materials: false, labor: false, processDetail: true },
    processSteps: [
      { id: 's1', stepNumber: 1, title: 'Framing', description: 'Build', estimatedDuration: '5 days' },
      { id: 's2', stepNumber: 2, title: 'Strip out', description: 'Clear', estimatedDuration: '2 days' },
    ],
  };
  const out = customerQuoteView(phased);
  const framing = out.processSteps.find((s) => s.title === 'Framing');
  assert.ok(framing);
  // 2500 + 1500 of materials and 4200 of labour, at 1.25.
  assert.equal(framing.cost, 10250);
});

test('a quote carrying no margin is unchanged, to the penny', () => {
  const plain = {
    id: 'q-plain',
    materials: [{ id: 'm1', name: 'Lumber', quantity: 10, unit: 'each', unitCost: 25, totalCost: 250 }],
    labor: [{ id: 'l1', role: 'Carpenter', hours: 10, hourlyRate: 70, totalCost: 700 }],
    materialsSubtotal: 250,
    laborSubtotal: 700,
    taxAmount: 0,
    totalCost: 950,
  };
  const out = customerQuoteView(plain);
  assert.equal(out.materialsSubtotal, 250);
  assert.equal(out.laborSubtotal, 700);
  assert.equal(out.materials[0].unitCost, 25);
  assert.equal(out.labor[0].hourlyRate, 70);
  assert.equal(out.totalCost, 950);
});
