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

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * THE LEAD NOTIFICATION
 *
 * The same translation feeds the email and the text a new work request sends,
 * so the quote and the notification cannot disagree about what the job is.
 *
 * The address is the point. For a builder it decides whether a lead is worth
 * the drive — the service-area check on the form exists for that reason — and
 * the email did not carry it, while the record held it the whole time under
 * `site_address` plus city, state and postcode.
 */
import { smsBody } from '../supabase/functions/server/staffSms.ts';

/** The rows the work-request notification builds, as index.tsx builds them. */
function leadRows(wr: Record<string, unknown>): Array<[string, unknown]> {
  const b = estimatorInputFor(wr);
  const size = briefInputFor(wr);
  const sizeLine = [
    size.squareFootage ? `${size.squareFootage} sq ft` : '',
    size.storeys ? `${size.storeys} floor${Number(size.storeys) === 1 ? '' : 's'}` : '',
  ].filter(Boolean).join(' · ');
  return [
    ['Service', b.serviceType || b.title || '—'],
    ['Job address', b.location || '—'],
    ['Size', sizeLine || '—'],
  ];
}

test('the lead email carries the job address, assembled', () => {
  const rows = leadRows(realFormPayload);
  const address = rows.find(([l]) => l === 'Job address')?.[1];
  assert.equal(address, '12 Probe Lane, Salem, NH, 03079');
});

test('the lead email carries the size as a readable line', () => {
  const size = leadRows(realFormPayload).find(([l]) => l === 'Size')?.[1];
  assert.equal(size, '480 sq ft · 2 floors');
});

test('a snake_case service no longer shows as a dash', () => {
  // This is what my own end-to-end probe hit: it posted `service_type` and the
  // alert read "submitted a service request".
  const rows = leadRows({ service_type: 'deck', site_address: '1 A St', city: 'Salem' });
  assert.equal(rows.find(([l]) => l === 'Service')?.[1], 'deck');
});

test('THE TEXT SAYS WHAT AND WHERE, and nothing else', () => {
  // Work requests only began texting on 2026-11-20. With no `keep` list a text
  // is the subject line alone, which is not enough to triage from a phone.
  const text = smsBody({
    company: 'Black Phoenix Builds',
    subject: 'New work request from Michael Saverse',
    rows: leadRows(realFormPayload),
    keep: ['Service', 'Job address'],
    url: 'https://example.com/work-requests',
  });
  assert.ok(text.includes('deck'), text);
  assert.ok(text.includes('Salem'), text);
  assert.ok(!text.includes('Size'), 'size belongs in the email, not the text');
  assert.ok(text.length <= 300, `${text.length} characters`);
});

test('a blank field is left out of the text rather than sent as a dash', () => {
  const text = smsBody({
    company: 'Black Phoenix Builds',
    subject: 'New work request from Michael Saverse',
    rows: leadRows({ client_name: 'Michael Saverse', site_address: '' }),
    keep: ['Service', 'Job address'],
  });
  assert.ok(!text.includes('—'), `a text must not carry an em dash placeholder:\n${text}`);
});
