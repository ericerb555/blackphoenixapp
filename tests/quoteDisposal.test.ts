/**
 * Every job makes rubbish, so every quote prices taking it away.
 *
 * Two failures are possible and they are not equally bad.
 *
 * MISSING is the one being fixed: the estimator decides a skip is "not
 * applicable" on a small job and the cost is eaten.
 *
 * DUPLICATED is the one to be careful of while fixing it. If the detector
 * does not recognise "haul-away" as disposal it will add a second line, and
 * the customer is overcharged — quietly, on a document that looks correct.
 * So most of this file is about what the detector must RECOGNISE, not about
 * what it adds.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isDisposalLine, findDisposal, ensureDisposal, disposalPlaceholder,
} from '../supabase/functions/server/quoteDisposal.ts';

let n = 0;
const rid = () => `id-${++n}`;

/* ── what counts as disposal ─────────────────────────────────────────────── */

test('the names the estimator actually uses are all recognised', () => {
  const named = [
    { name: 'Dumpster rental, 10 yard' },
    { name: 'Skip hire' },
    { name: 'Debris disposal' },
    { name: 'Waste removal' },
    { name: 'Trash removal and disposal' },
    { name: 'Haul-away' },
    { name: 'Haul away of old units' },
    { name: 'Tip fees' },
    { name: 'Landfill charges' },
    { name: 'Dump run' },
    { name: 'Junk removal' },
    { name: 'Muck away' },
    { name: 'Rubbish clearance' },
  ];
  for (const row of named) {
    assert.ok(isDisposalLine(row), `${row.name} should count as disposal`);
  }
});

test('it reads the description and the category too, not just the name', () => {
  assert.ok(isDisposalLine({ name: 'Container', description: 'For debris from the strip-out' }));
  assert.ok(isDisposalLine({ name: 'Misc', category: 'Disposal' }));
  assert.ok(isDisposalLine({ role: 'Labourer', trade: 'waste' }));
});

test('ordinary lines are not mistaken for disposal', () => {
  for (const row of [
    { name: 'Timber, 2x4' },
    { name: 'Licensed Electrician', description: 'First fix wiring' },
    { name: 'Building permit', category: 'Permit' },
    { name: 'Paint, matt emulsion' },
    {},
  ]) {
    assert.ok(!isDisposalLine(row), `${JSON.stringify(row)} should not count`);
  }
});

/* ── where it looks ──────────────────────────────────────────────────────── */

test('disposal counts wherever the model happened to file it', () => {
  assert.equal(findDisposal({ additionalCosts: [{ name: 'Skip hire' }] }).foundIn, 'additionalCosts');
  assert.equal(findDisposal({ materials: [{ name: 'Dumpster rental' }] }).foundIn, 'materials');
  assert.equal(findDisposal({ labor: [{ role: 'Labourer', description: 'load the skip' }] }).foundIn, 'labor');
});

test('an estimate with none says so', () => {
  const check = findDisposal({ materials: [{ name: 'Timber' }], labor: [{ role: 'Carpenter' }] });
  assert.equal(check.present, false);
  assert.equal(check.foundIn, null);
});

/* ── what it does about it ───────────────────────────────────────────────── */

test('a missing disposal line is added', () => {
  const out = ensureDisposal({ additionalCosts: [{ name: 'Permit', amount: 150 }] }, rid);
  assert.equal(out.added, true);
  assert.equal(out.additionalCosts.length, 2);
  const added: any = out.additionalCosts[1];
  assert.match(added.name, /trash removal/i);
});

/**
 * The guard that matters. A second skip on a quote that already has one
 * overcharges the customer, on a document that looks perfectly correct.
 */
test('disposal already present is never duplicated, under any of its names', () => {
  for (const row of [
    { name: 'Skip hire', amount: 400 },
    { name: 'Dumpster rental, 10 yard', amount: 400 },
    { name: 'Haul-away', amount: 400 },
  ]) {
    const out = ensureDisposal({ additionalCosts: [row] }, rid);
    assert.equal(out.added, false, `${row.name} should have been recognised`);
    assert.equal(out.additionalCosts.length, 1);
  }
});

test('disposal priced as a material does not get a second soft cost', () => {
  const out = ensureDisposal(
    { additionalCosts: [{ name: 'Permit' }], materials: [{ name: 'Dumpster rental' }] },
    rid,
  );
  assert.equal(out.added, false);
  assert.equal(out.foundIn, 'materials');
  assert.equal(out.additionalCosts.length, 1);
});

/**
 * It must never invent what a skip costs. A fabricated figure is worse than
 * a blank one: blank is visible and gets filled in; invented is invisible
 * and gets sent to a customer.
 */
test('the placeholder carries no price, and says it needs one', () => {
  const line = disposalPlaceholder(rid);
  assert.equal(line.amount, 0);
  assert.equal(line.needsPricing, true);
  assert.match(line.description, /set the amount before sending/i);
});

test('adding the placeholder does not change the total on its own', () => {
  const before = [{ name: 'Permit', amount: 150 }];
  const out = ensureDisposal({ additionalCosts: before }, rid);
  const total = out.additionalCosts.reduce((t: number, a: any) => t + (Number(a.amount) || 0), 0);
  assert.equal(total, 150);
});

test('an estimate with no soft costs at all still gets disposal', () => {
  const out = ensureDisposal({}, rid);
  assert.equal(out.added, true);
  assert.equal(out.additionalCosts.length, 1);
});
