/**
 * Finding towns to add to the Exchange.
 *
 * The directory stopped growing because nothing ever created a territory —
 * five towns were seeded or typed in by hand, and the weekly clock had
 * nothing left to reach. This turns one Overpass answer into a list of
 * candidates somebody can approve.
 *
 * The tests that matter are the ones about REFUSING. A territory is
 * inventory Eric sells as exclusive, and a town added with the wrong
 * postcode or a bad centre quietly collects another town's businesses —
 * which is worse than a town that was never added, because it looks right.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  townSlug, postcodesFrom, centreOf, areaToCandidate, candidatesFrom,
  municipalityQuery, describeCandidates, SLUG_RE,
} from '../supabase/functions/server/exchangeTownDiscovery.ts';

const town = (name: string, extra: Record<string, unknown> = {}) => ({
  type: 'relation',
  id: 1234,
  center: { lat: 42.7362, lon: -71.3273 },
  ...extra,
  // Merged AFTER the spread. The other way round, `extra.tags` replaces the
  // whole tags object and takes the name with it — which silently turned
  // three of these tests into "a boundary with no name", the one case
  // `areaToCandidate` is supposed to reject.
  tags: { name, boundary: 'administrative', admin_level: '8', postal_code: '03076', ...(extra.tags as object || {}) },
});

/* ── slugs ───────────────────────────────────────────────────────────────── */

test('a slug is the name, hyphenated, with the state on the end', () => {
  assert.equal(townSlug('Pelham', 'NH'), 'pelham-nh');
  assert.equal(townSlug('Manchester', 'nh'), 'manchester-nh');
});

/**
 * There is a Windham in New Hampshire, Maine AND Vermont. Dropping the state
 * collides the first time coverage crosses a border, and a slug collision
 * means two towns sharing one territory's listings.
 */
test('the state suffix is what stops a cross-border collision', () => {
  assert.notEqual(townSlug('Windham', 'NH'), townSlug('Windham', 'ME'));
});

test('punctuation, spaces and accents all become hyphens or nothing', () => {
  assert.equal(townSlug("Hart's Location", 'NH'), 'hart-s-location-nh');
  assert.equal(townSlug('Center Harbor', 'NH'), 'center-harbor-nh');
  assert.equal(townSlug('Montréal', 'QC'), 'montreal-qc');
});

test('every slug produced satisfies the create route rule', () => {
  for (const n of ['Pelham', "Hart's Location", 'Center Harbor', 'Newington']) {
    assert.match(townSlug(n, 'NH'), SLUG_RE, n);
  }
});

test('a nameless boundary produces no slug and no candidate', () => {
  assert.equal(townSlug('', 'NH'), '');
  assert.equal(areaToCandidate({ tags: {} }, 'NH'), null);
});

/* ── postcodes, which are never guessed ──────────────────────────────────── */

test('a single postcode is read', () => {
  assert.deepEqual(postcodesFrom({ postal_code: '03076' }), ['03076']);
});

test('a list is split, however it was punctuated', () => {
  assert.deepEqual(postcodesFrom({ postal_code: '03101;03102,03103' }), ['03101', '03102', '03103']);
});

test('duplicates collapse', () => {
  assert.deepEqual(postcodesFrom({ postal_code: '03076;03076' }), ['03076']);
});

/**
 * A malformed code reaches `belongsToTerritory`, and a territory bounded by
 * a code matching nothing silently collects no businesses at all — which
 * looks like a quiet town rather than a broken one.
 */
test('anything that is not a five digit ZIP is dropped, not passed along', () => {
  assert.deepEqual(postcodesFrom({ postal_code: 'NH-03076' }), []);
  assert.deepEqual(postcodesFrom({ postal_code: '3076' }), []);
  assert.deepEqual(postcodesFrom({ postal_code: '03076-1234' }), []);
  assert.deepEqual(postcodesFrom({}), []);
});

/* ── centres ─────────────────────────────────────────────────────────────── */

test('a centre is read from center or from lat/lon', () => {
  assert.deepEqual(centreOf({ center: { lat: 42.7, lon: -71.3 } }), { lat: 42.7, lng: -71.3 });
  assert.deepEqual(centreOf({ lat: 42.7, lon: -71.3 }), { lat: 42.7, lng: -71.3 });
});

/** Overpass returns 0,0 for a relation whose geometry failed to resolve. */
test('null island is not a centre', () => {
  assert.equal(centreOf({ center: { lat: 0, lon: 0 } }), null);
});

test('an impossible or absent coordinate is not a centre', () => {
  assert.equal(centreOf({ center: { lat: 999, lon: -71 } }), null);
  assert.equal(centreOf({}), null);
});

/* ── candidates, and why one is refused ──────────────────────────────────── */

test('a complete boundary is ready to add', () => {
  const c = areaToCandidate(town('Pelham'), 'NH')!;
  assert.equal(c.ready, true);
  assert.equal(c.slug, 'pelham-nh');
  assert.equal(c.state, 'NH');
  assert.deepEqual(c.postcodes, ['03076']);
  assert.equal(c.osmId, 'relation/1234');
});

/**
 * Surfaced, not dropped. A town silently discarded for want of a postcode
 * is a town nobody knows to go and fix.
 */
test('no postcode means not ready, and says so', () => {
  const c = areaToCandidate(town('Nowhere', { tags: { postal_code: '' } }), 'NH')!;
  assert.equal(c.ready, false);
  assert.match(c.blockedBy!, /postcode/i);
  assert.match(c.blockedBy!, /neighbour/i, 'says why it matters');
});

test('no centre means not ready, and says so', () => {
  const c = areaToCandidate({ tags: { name: 'Nowhere', postal_code: '03076' } }, 'NH')!;
  assert.equal(c.ready, false);
  assert.match(c.blockedBy!, /centre/i);
});

test('a postcode is never invented for a town that has none', () => {
  const c = areaToCandidate(town('Nowhere', { tags: { postal_code: '' } }), 'NH')!;
  assert.deepEqual(c.postcodes, [], 'no plausible nearby code filled in');
});

/* ── a whole answer ──────────────────────────────────────────────────────── */

test('candidates come back deduplicated and in name order', () => {
  const out = candidatesFrom([
    town('Salem'), town('Pelham'), town('Amherst'),
  ], 'NH');
  assert.deepEqual(out.map((t) => t.name), ['Amherst', 'Pelham', 'Salem']);
});

/** A town appears as both a boundary relation and a place node. Same town. */
test('the same town twice is one candidate', () => {
  const out = candidatesFrom([town('Pelham'), { ...town('Pelham'), type: 'node', id: 99 }], 'NH');
  assert.equal(out.length, 1);
});

test('a duplicate carrying a postcode beats an earlier one without', () => {
  const bare = town('Pelham', { tags: { postal_code: '' } });
  const full = town('Pelham');
  const out = candidatesFrom([bare, full], 'NH');
  assert.equal(out.length, 1);
  assert.equal(out[0].ready, true, 'the usable one won');
});

test('towns already in the directory are flagged, not hidden', () => {
  const out = candidatesFrom([town('Pelham'), town('Amherst')], 'NH', ['pelham-nh']);
  assert.equal(out.find((t) => t.slug === 'pelham-nh')!.existing, true);
  assert.equal(out.find((t) => t.slug === 'amherst-nh')!.existing, false);
});

test('rubbish in the answer does not throw', () => {
  const out = candidatesFrom([null, undefined, {}, { tags: {} }, town('Pelham')] as any, 'NH');
  assert.equal(out.length, 1);
  assert.equal(candidatesFrom(null as any, 'NH').length, 0);
});

/* ── the query ───────────────────────────────────────────────────────────── */

test('a state query asks for municipalities inside that state', () => {
  const q = municipalityQuery('NH');
  assert.match(q, /ISO3166-2"="US-NH"/);
  assert.match(q, /"admin_level"="8"/);
  assert.match(q, /out tags center;/, 'tags and a centre, never full geometry');
  assert.ok(!/out geom/.test(q), 'asking a free endpoint for 234 polygons is how a project gets blocked');
});

test('a county query narrows to that county', () => {
  const q = municipalityQuery('NH', 'Hillsborough County');
  assert.match(q, /"admin_level"="6"/);
  assert.match(q, /Hillsborough County/);
});

test('a county name cannot break out of the query string', () => {
  const benign = municipalityQuery('NH', 'Rockingham County');
  const hostile = municipalityQuery('NH', 'Rockingham" ; out meta; //');

  /*
   * What matters is STRUCTURE, not whether the words survive. The whitelist
   * drops every character that could act — quotes, semicolons, slashes — so
   * what is left is inert letters sitting inside a quoted value. Asserting
   * the words are gone would be asserting something stronger than is true,
   * and would fail the day somebody adds a county called "Out".
   */
  assert.equal(
    hostile.split(';').length, benign.split(';').length,
    'no extra statement was introduced',
  );
  assert.equal(
    (hostile.match(/"/g) || []).length, (benign.match(/"/g) || []).length,
    'no extra quote, so the value cannot have closed its own string',
  );
  assert.ok(!hostile.includes('//'), 'no comment to swallow the rest of the query');
  assert.match(hostile, /\["name"="[A-Za-z .'-]+"\]/, 'the name clause is still one well-formed clause');
});

test('the timeout is clamped to something a free endpoint will accept', () => {
  assert.match(municipalityQuery('NH', '', 9999), /timeout:180/);
  assert.match(municipalityQuery('NH', '', 1), /timeout:10/);
});

/* ── the summary a person reads ──────────────────────────────────────────── */

test('the summary counts what can be added, what is here, and what is stuck', () => {
  const found = candidatesFrom([
    town('Pelham'), town('Amherst'), town('Nowhere', { tags: { postal_code: '' } }),
  ], 'NH', ['pelham-nh']);
  const line = describeCandidates(found);
  assert.match(line, /3 municipalities found/);
  assert.match(line, /1 ready to add/);
  assert.match(line, /1 already here/);
  assert.match(line, /1 needing a postcode/);
});

test('an empty answer says so rather than reading as a success', () => {
  assert.match(describeCandidates([]), /No municipalities came back/);
});
