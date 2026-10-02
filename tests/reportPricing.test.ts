/**
 * Putting a quote's figures onto a conditions report.
 *
 * The two refusals here are the ones that protect somebody's deposit:
 *
 *   - a quote may only price the report whose job it was raised against, or a
 *     figure from one person's work could take money off another's deposit
 *   - an area the quote said nothing about stays UNPRICED rather than becoming
 *     zero, so a half-priced quote cannot go out as a finished statement
 *
 * And one deliberate non-feature: the area is never guessed from the description
 * text, because "protect flooring while working on the walls" would charge the
 * wrong area and nobody would notice.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { areasFromQuote, pricingRefusal } from '../supabase/functions/server/reportPricing.ts';

const line = (over: Record<string, any> = {}) => ({
  id: 'L1', description: 'Work', qty: 1, rate: 100, ...over,
});

const quote = (items: any[], over: Record<string, any> = {}) => ({
  id: 'q_1', number: 'QT-5', workRequestId: 'wr_1', items, ...over,
});

const CHARGEABLE = ['Flooring', 'Walls & Ceilings'];

const costFor = (result: any, area: string) => result.costs.find((c: any) => c.area === area);

/* ── the ordinary case ───────────────────────────────────────────────────── */

test('lines are summed onto the area they name', () => {
  const r = areasFromQuote(quote([
    line({ id: 'A', conditionArea: 'Flooring', qty: 8, rate: 70 }),
    line({ id: 'B', conditionArea: 'Flooring', qty: 1, rate: 260 }),
    line({ id: 'C', conditionArea: 'Walls & Ceilings', qty: 4, rate: 55 }),
  ]), CHARGEABLE);
  assert.equal(costFor(r, 'Flooring').cost, 820, '560 + 260');
  assert.equal(costFor(r, 'Walls & Ceilings').cost, 220);
  assert.deepEqual(r.unassigned, []);
  assert.deepEqual(r.stillUnpriced, []);
});

test('the quote is named on every figure it produced', () => {
  const r = areasFromQuote(quote([line({ conditionArea: 'Flooring' })]), CHARGEABLE);
  assert.equal(costFor(r, 'Flooring').quoteId, 'QT-5');
  assert.equal(r.quoteId, 'QT-5');
});

test('an unpriced area carries no quote id, since no quote priced it', () => {
  const r = areasFromQuote(quote([line({ conditionArea: 'Flooring' })]), CHARGEABLE);
  assert.equal(costFor(r, 'Walls & Ceilings').quoteId, undefined);
});

test('a credit subtracts, as it does on the quote itself', () => {
  const r = areasFromQuote(quote([
    line({ id: 'A', conditionArea: 'Flooring', qty: 1, rate: 900 }),
    line({ id: 'B', conditionArea: 'Flooring', qty: 1, rate: 80, kind: 'credit' }),
  ]), CHARGEABLE);
  assert.equal(costFor(r, 'Flooring').cost, 820);
});

test('credits cannot take an area below nothing', () => {
  const r = areasFromQuote(quote([
    line({ id: 'A', conditionArea: 'Flooring', qty: 1, rate: 100 }),
    line({ id: 'B', conditionArea: 'Flooring', qty: 1, rate: 400, kind: 'credit' }),
  ]), CHARGEABLE);
  assert.equal(costFor(r, 'Flooring').cost, 0, 'a negative deduction would pay the tenant');
});

/* ── absent is not zero ──────────────────────────────────────────────────── */

test('an area the quote said nothing about stays unpriced', () => {
  const r = areasFromQuote(quote([line({ conditionArea: 'Flooring' })]), CHARGEABLE);
  assert.equal(costFor(r, 'Walls & Ceilings').cost, null, 'not 0');
  assert.deepEqual(r.stillUnpriced, ['Walls & Ceilings']);
});

test('a quote with no usable lines prices nothing at all', () => {
  const r = areasFromQuote(quote([line({ id: 'A' })]), CHARGEABLE);
  assert.equal(costFor(r, 'Flooring').cost, null);
  assert.equal(costFor(r, 'Walls & Ceilings').cost, null);
  assert.equal(r.unassigned.length, 1);
});

test('every chargeable area appears, priced or not', () => {
  const r = areasFromQuote(quote([]), CHARGEABLE);
  assert.deepEqual(r.costs.map((c: any) => c.area), CHARGEABLE);
});

/* ── nothing is silently dropped ─────────────────────────────────────────── */

test('a line naming no area is reported back rather than ignored', () => {
  const r = areasFromQuote(quote([line({ id: 'X', description: 'Skip hire', qty: 1, rate: 300 })]), CHARGEABLE);
  assert.deepEqual(r.unassigned, [{ id: 'X', description: 'Skip hire', amount: 300 }]);
});

test('a line naming an area the report found no damage in is refused', () => {
  // A quote must not be able to introduce a deduction for an area the comparison
  // never found damage in.
  const r = areasFromQuote(quote([line({ id: 'X', conditionArea: 'Appliances', qty: 1, rate: 400 })]), CHARGEABLE);
  assert.equal(r.unassigned.length, 1);
  assert.equal(costFor(r, 'Flooring').cost, null);
});

test('a line with no id still gets one, so it can be assigned', () => {
  const r = areasFromQuote(quote([{ description: 'Mystery', qty: 1, rate: 50 }]), CHARGEABLE);
  assert.equal(r.unassigned[0].id, 'line-0');
});

/* ── the explicit assignment ─────────────────────────────────────────────── */

test('an assignment map can place lines the quote did not label', () => {
  const r = areasFromQuote(
    quote([line({ id: 'A', qty: 8, rate: 70 }), line({ id: 'B', qty: 4, rate: 55 })]),
    CHARGEABLE,
    { A: 'Flooring', B: 'Walls & Ceilings' },
  );
  assert.equal(costFor(r, 'Flooring').cost, 560);
  assert.equal(costFor(r, 'Walls & Ceilings').cost, 220);
  assert.deepEqual(r.unassigned, []);
});

test("the line's own area wins over the assignment", () => {
  const r = areasFromQuote(
    quote([line({ id: 'A', conditionArea: 'Flooring', qty: 1, rate: 100 })]),
    CHARGEABLE,
    { A: 'Walls & Ceilings' },
  );
  assert.equal(costFor(r, 'Flooring').cost, 100);
  assert.equal(costFor(r, 'Walls & Ceilings').cost, null);
});

test('an assignment to an area with no damage is still refused', () => {
  const r = areasFromQuote(quote([line({ id: 'A' })]), CHARGEABLE, { A: 'Appliances' });
  assert.equal(r.unassigned.length, 1);
});

/* ── the area is never guessed ───────────────────────────────────────────── */

test('a description mentioning an area does not assign it', () => {
  // "Protect flooring while working on the walls" is the line that makes text
  // matching dangerous, and it is indistinguishable from a real flooring line.
  const r = areasFromQuote(
    quote([line({ id: 'A', description: 'Protect flooring while working on the walls', qty: 1, rate: 200 })]),
    CHARGEABLE,
  );
  assert.equal(costFor(r, 'Flooring').cost, null);
  assert.equal(r.unassigned.length, 1, 'an unassigned line gets noticed; a wrong one does not');
});

/* ── which quote may price which report ──────────────────────────────────── */

test('a quote raised against the report\'s own job may price it', () => {
  assert.equal(pricingRefusal(quote([line()]), { workRequestId: 'wr_1' }), null);
});

test('a quote from a different job may not', () => {
  const refusal = pricingRefusal(quote([line()], { workRequestId: 'wr_999' }), { workRequestId: 'wr_1' });
  assert.match(refusal!, /not raised against this report/i);
});

test('a report that was never sent has no job for a quote to belong to', () => {
  assert.match(pricingRefusal(quote([line()]), {})!, /not been sent for pricing/i);
});

test('a missing quote, and an empty one, are both refused', () => {
  assert.match(pricingRefusal(null, { workRequestId: 'wr_1' })!, /could not be found/i);
  assert.match(pricingRefusal(quote([]), { workRequestId: 'wr_1' })!, /no lines/i);
});

/* ── the awkward shapes ──────────────────────────────────────────────────── */

test('missing quantities and rates come to nothing rather than NaN', () => {
  const r = areasFromQuote(quote([
    { id: 'A', conditionArea: 'Flooring', description: 'No numbers' },
    { id: 'B', conditionArea: 'Flooring', qty: 2, rate: 50 },
  ]), CHARGEABLE);
  assert.equal(costFor(r, 'Flooring').cost, 100);
});

test('rubbish in does not throw', () => {
  for (const q of [null, undefined, {}, { items: 'lots' }]) {
    const r = areasFromQuote(q as any, CHARGEABLE);
    assert.equal(r.costs.length, 2, String(q));
  }
});

test('no chargeable areas produces no costs', () => {
  const r = areasFromQuote(quote([line({ conditionArea: 'Flooring' })]), []);
  assert.deepEqual(r.costs, []);
  assert.equal(r.unassigned.length, 1, 'the line had nowhere to go, and that is said');
});

test('the id falls back to the quote id where there is no number', () => {
  const r = areasFromQuote(quote([line({ conditionArea: 'Flooring' })], { number: '' }), CHARGEABLE);
  assert.equal(r.quoteId, 'q_1');
});
