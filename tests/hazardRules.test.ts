/**
 * What we charge extra to take, and what we will not take at all.
 *
 * The behaviours pinned here are the ones that decide whether a customer is
 * helped or ambushed:
 *
 *   - the dangerous reading wins whenever both match, because the cost of
 *     being wrong is not symmetrical
 *   - whole words only: "entire" is not a tyre and a "painted dresser" is not
 *     a tin of paint
 *   - a TV stand is furniture; a TV is leaded glass and a recycler fee
 *   - every refusal says what the customer can do instead
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hazardFor, hazardById, isRefused, SURCHARGES, REFUSALS,
} from '../supabase/functions/server/hazardRules.ts';

/* ── surcharges ──────────────────────────────────────────────────────────── */

test('a fridge is a refrigerant surcharge, not an ordinary appliance', () => {
  const rule = hazardFor('old refrigerator from the garage');
  assert.equal(rule?.action, 'surcharge');
  assert.equal(rule?.id, 'freon-appliance');
  assert.equal((rule as any).each, 45);
});

test('the common surcharges are all recognised by the words a homeowner uses', () => {
  assert.equal(hazardFor('queen mattress')?.id, 'mattress');
  assert.equal(hazardFor('box spring')?.id, 'mattress');
  assert.equal(hazardFor('four old tires')?.id, 'tyre');
  assert.equal(hazardFor('CRT television')?.id, 'e-waste');
  assert.equal(hazardFor('window air conditioner')?.id, 'freon-appliance');
});

test('every surcharge carries a price and a reason it costs money', () => {
  for (const s of SURCHARGES) {
    assert.ok(s.each > 0, `${s.id} has no price`);
    assert.ok(s.why.length > 20, `${s.id} does not say why`);
    assert.equal(s.source, 'standard', `${s.id} claims to be our own rate`);
  }
});

/* ── refusals ────────────────────────────────────────────────────────────── */

test('the dangerous ones are refused, not priced', () => {
  assert.equal(hazardFor('propane tank')?.action, 'refuse');
  assert.equal(hazardFor('suspected asbestos pipe lagging')?.action, 'refuse');
  assert.equal(hazardFor('half a can of paint thinner')?.action, 'refuse');
  assert.equal(hazardFor('sharps container')?.action, 'refuse');
  assert.equal(isRefused('gasoline'), true);
});

test('every refusal tells the customer what to do instead', () => {
  for (const r of REFUSALS) {
    assert.ok(r.why.length > 40, `${r.id} does not say why`);
    assert.ok(/hardware store|supplier|abatement|hazardous waste|licensed|call us/i.test(r.why),
      `${r.id} refuses without offering a way forward`);
  }
});

test('the dangerous reading wins when both match', () => {
  // A fridge is a $45 surcharge. A fridge full of paint cans is not.
  const rule = hazardFor('fridge full of old paint cans');
  assert.equal(rule?.action, 'refuse');
  assert.equal(rule?.id, 'liquids');
});

/* ── the matching itself ─────────────────────────────────────────────────── */

test('whole words only — substrings do not classify', () => {
  assert.equal(hazardFor('the entire basement'), null, '"entire" is not a tyre');
  assert.equal(hazardFor('painted dresser'), null, '"painted" is not paint');
  assert.equal(hazardFor('retired office chairs'), null);
});

test('a TV stand is furniture; a TV is e-waste', () => {
  assert.equal(hazardFor('tv stand'), null);
  assert.equal(hazardFor('tv cabinet'), null);
  assert.equal(hazardFor('55 inch tv')?.id, 'e-waste');
});

test('nothing ordinary is classified as a hazard', () => {
  for (const ordinary of ['sofa', 'dining table', 'cardboard boxes', 'bags of clothes',
    'broken fence panels', 'garden waste', 'kitchen cabinets', 'carpet offcuts']) {
    assert.equal(hazardFor(ordinary), null, `${ordinary} was flagged`);
  }
});

test('empty, missing and nonsense input classify as nothing', () => {
  assert.equal(hazardFor(''), null);
  assert.equal(hazardFor(null), null);
  assert.equal(hazardFor(undefined), null);
  assert.equal(hazardFor(42), null);
});

test('a rule can be read back by id off a stored estimate', () => {
  assert.equal(hazardById('mattress')?.label, 'Mattress or box spring');
  assert.equal(hazardById('nope'), null);
});
