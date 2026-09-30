/**
 * Turning a customer's chosen SERVICE into a trade the scheduler understands.
 *
 * The test that matters is the last group. Filling in a technician's trades
 * used to make the schedule EMPTY: the service string was passed through as a
 * trade id, a recorded technician must hold the trade named, and no human being
 * holds the trade "pressure washing". These pin the direction that fixes it —
 * an unclassifiable service names no trade, and no trade means anybody may
 * take it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tradeFor, isRecognisedNonTrade } from '../supabase/functions/server/tradeFor.ts';
import { candidatesFor } from '../supabase/functions/server/availability.ts';

test('a trade id passes straight through', () => {
  assert.equal(tradeFor('carpentry'), 'carpentry');
});

test("the form's own wording lands on the right trade", () => {
  assert.equal(tradeFor('Trash Removal / Hauling'), 'laboring');
  assert.equal(tradeFor('Interior Painting'), 'painting');
  assert.equal(tradeFor('Drywall & Taping'), 'sheetrock');
});

test('case and spacing do not decide the answer', () => {
  assert.equal(tradeFor('  ROOFING  '), 'roofing');
  assert.equal(tradeFor('trash   removal'), 'laboring');
});

test('the first candidate that resolves wins, so a stored trade beats a service label', () => {
  assert.equal(tradeFor('hvac', 'Handyman / Repairs'), 'hvac');
  assert.equal(tradeFor('', null, 'Roofing'), 'roofing');
});

/* ── the deliberate blanks ───────────────────────────────────────────────── */

test('a service we do not price as a trade names no trade', () => {
  for (const service of ['Pressure Washing', 'Lawn Care & Landscaping', 'Snow Removal', 'Pest Control']) {
    assert.equal(tradeFor(service), undefined, service);
  }
});

test('and it is reported as a non-trade rather than as a failure to classify', () => {
  assert.equal(isRecognisedNonTrade('Pressure Washing'), true);
  assert.equal(isRecognisedNonTrade('Interpretive dance'), false);
});

test('wording nobody has seen before is also no trade, not a guess', () => {
  assert.equal(tradeFor('Aardvark wrangling'), undefined);
});

test('nothing at all is no trade', () => {
  assert.equal(tradeFor(), undefined);
  assert.equal(tradeFor('', null, undefined), undefined);
});

/* ── the regression this was written for ─────────────────────────────────── */

const dave = {
  id: 'DAVE', name: 'Dave',
  trades: ['carpentry', 'painting', 'laboring'],
  workingDays: [1, 2, 3, 4, 5], workingHours: { start: '08:00', end: '16:00' },
};
const TUESDAY = '2026-09-29';

test('a raw service label excludes a technician who has trades recorded', () => {
  // Documents the break, so the reason for tradeFor() is visible from the test.
  const found = candidatesFor([dave], TUESDAY, { trade: 'Pressure Washing', hours: 4 }, [], []);
  assert.equal(found.length, 0,
    'recording trades made every request unschedulable — this is what tradeFor prevents');
});

test('resolved through tradeFor, the same request reaches him', () => {
  const trade = tradeFor('Pressure Washing');
  const found = candidatesFor([dave], TUESDAY, { trade, hours: 4 }, [], []);
  assert.equal(found.length, 1);
  assert.equal(found[0].tech.id, 'DAVE');
});

test('and a request that does name his trade still matches on the trade, not on luck', () => {
  const found = candidatesFor([dave], TUESDAY, { trade: tradeFor('Interior Painting'), hours: 4 }, [], []);
  assert.equal(found.length, 1);
  assert.equal(found[0].unverifiedTrade, false, 'painting is recorded against him');
});

test('a trade he does not hold still excludes him, which is the point of recording them', () => {
  const found = candidatesFor([dave], TUESDAY, { trade: tradeFor('hvac'), hours: 4 }, [], []);
  assert.equal(found.length, 0);
});
