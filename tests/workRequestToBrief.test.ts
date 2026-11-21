/**
 * What the customer typed has to reach the estimator.
 *
 * Eric, 2026-11-20: "now that micheal work request is and it didnt generate
 * how to i get it to generate or into quote editor so i can tell the generator
 * what i need?"
 *
 * The answer turned out to be that he largely could not. Three layers used
 * three different names for the same facts and nothing translated between
 * them, so a quote came back priced off the service type and the free-text
 * description while the square footage, the floors, the lot, the address and
 * the project name were dropped on the floor.
 *
 * Nothing failed visibly. A quote was produced; it was simply produced from
 * two fields instead of ten. That is why these tests assert on the exact
 * payload `ClientWorkRequestForm` sends rather than on a tidy invented object
 * — the whole bug was that the tidy object and the real one had different
 * keys.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  estimatorInputFor, briefInputFor, locationOf,
} from '../supabase/functions/server/workRequestToBrief.ts';
import { composeEstimatorContext } from '../supabase/functions/server/quoteBrief.ts';

/**
 * Copied from the payload in `ClientWorkRequestForm.tsx`, names and all.
 * If that form is ever changed, this is the thing that should fail.
 */
const realFormPayload = {
  user_id: 'u-1',
  project_name: 'Rear deck rebuild',
  project_type: 'residential',
  serviceType: 'deck',
  description: 'Existing deck is rotten. Same footprint, composite boards, keep the stairs where they are.',
  total_floors: 2,
  total_square_feet: 480,
  measurement_unit: 'imperial',
  site_address: '12 Probe Lane',
  city: 'Salem',
  state: 'NH',
  zip_code: '03079',
  lot_size_sqft: 10400,
  urgency: 'high',
};

test('the project name reaches the estimator as its title', () => {
  // Was `undefined`: the estimator asked for `title`, the form sends
  // `project_name`.
  assert.equal(estimatorInputFor(realFormPayload).title, 'Rear deck rebuild');
});

test('THE JOB SITE REACHES IT, assembled from four separate fields', () => {
  // Was `undefined`: the estimator asked for `location || address`, the form
  // sends `site_address` plus city, state and postcode as separate keys.
  // Travel and local rates both key off the town, so the town has to be in it.
  assert.equal(
    estimatorInputFor(realFormPayload).location,
    '12 Probe Lane, Salem, NH, 03079',
  );
});

test('service type and description still come through', () => {
  const out = estimatorInputFor(realFormPayload);
  assert.equal(out.serviceType, 'deck');
  assert.ok(out.description?.startsWith('Existing deck is rotten'));
});

test('the size and the storeys reach the written brief', () => {
  // composeEstimatorContext wants squareFootage and storeys; the form sends
  // total_square_feet and total_floors, so THE SIZE and THE PLACE sections
  // were empty on every request a customer ever filed.
  const brief = composeEstimatorContext(briefInputFor(realFormPayload));
  assert.ok(brief.includes('480'), `square footage missing from:\n${brief}`);
  assert.ok(brief.includes('Storeys'), `storeys missing from:\n${brief}`);
  assert.ok(brief.includes('deck'), 'the trade should be in the brief');
});

test('square footage prefers the floor area over the lot size', () => {
  // A big lot with a small extension is where using the wrong one is worst.
  assert.equal(briefInputFor(realFormPayload).squareFootage, 480);
});

test('the names the estimator originally asked for still win when present', () => {
  // Backward compatibility: a record written in the old shape must not be
  // broken by the translation.
  const legacy = { title: 'Legacy title', location: 'Nashua, NH', estimatedValue: 9500, serviceType: 'siding' };
  const out = estimatorInputFor(legacy);
  assert.equal(out.title, 'Legacy title');
  assert.equal(out.location, 'Nashua, NH');
  assert.equal(out.estimatedValue, 9500);
});

test("Michael's request — almost nothing filled in — yields undefined, not junk", () => {
  /*
   * The real record, as stored on 2026-11-20 after the signup bug discarded
   * his details: a name, an email, and three empty strings. The point is that
   * the translation must not invent a location out of empty fields, because
   * an estimate priced against ", , " is worse than one that knows it has no
   * address.
   */
  const michael = {
    client_name: 'Michael Saverse',
    client_email: 'msaverse@yahoo.com',
    client_phone: '',
    service: null,
    site_address: '',
    status: 'pending',
  };
  const out = estimatorInputFor(michael);
  assert.equal(out.location, undefined, 'empty address parts must not become ", ,"');
  assert.equal(out.title, undefined);
  assert.equal(out.serviceType, undefined);
  assert.equal(out.estimatedValue, undefined);
});

test('a zero or negative measurement is treated as absent', () => {
  // `total_square_feet: 0` is "not filled in", not "a zero square foot job".
  const out = briefInputFor({ total_square_feet: 0, total_floors: -1 });
  assert.equal(out.squareFootage, undefined);
  assert.equal(out.storeys, undefined);
});

test('garbage in yields an empty shape rather than throwing', () => {
  for (const bad of [null, undefined, 'nope', 42, []]) {
    assert.equal(estimatorInputFor(bad as any).title, undefined, JSON.stringify(bad));
    assert.equal(locationOf((bad ?? {}) as any), undefined, JSON.stringify(bad));
  }
});
