/**
 * How far away a business is, and whether it answers what was typed.
 *
 * WHY THIS FILE EXISTS
 *
 * Distance is the number a resident actually decides on. In a state where the
 * next town is ten minutes away, "7.3 mi" is the difference between ringing
 * somebody and not — so a quietly wrong figure is not a cosmetic fault, it
 * sends people to the wrong side of the county.
 *
 * The distances below are checked against truth that does not come from the
 * implementation. One degree of latitude is 69.09 miles on a sphere of the
 * earth's mean radius, everywhere, and that single fact catches the whole
 * family of plausible mistakes: radians for degrees, a radius in kilometres, a
 * swapped lat and lng, a halved or doubled haversine. Asserting the function
 * against its own output would have caught none of them.
 *
 * The sort has its own test because the failure mode is silent and backwards:
 * a listing with no coordinate, sorted as though it were at distance zero,
 * arrives at the top of a "nearest first" list.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  asPoint, haversineMiles, formatDistance, normalise,
  matchesSearch, searchableText, measureListings, boundsOf,
} from '../src/app/lib/exchangeGeo.ts';

/** The three launch towns, to six decimals as the listings carry them. */
const SALEM = { lat: 42.7886, lng: -71.2009 };
const MANCHESTER = { lat: 42.9956, lng: -71.4548 };
const PELHAM = { lat: 42.7343, lng: -71.3245 };

// ── the arithmetic ──────────────────────────────────────────────────────────

test('one degree of latitude is 69.09 miles', () => {
  // Independent of this code: a meridian degree on a sphere of mean radius
  // 6371.0088 km is 69.093 miles. Tight tolerance on purpose — every unit and
  // conversion mistake lands well outside it.
  const miles = haversineMiles({ lat: 42, lng: -71 }, { lat: 43, lng: -71 });
  assert.ok(Math.abs(miles - 69.093) < 0.01, `got ${miles}`);
});

test('a degree of longitude shrinks with latitude', () => {
  // 69.09 * cos(42.8) = 50.68. This is the check a flat approximation fails
  // and the reason haversine is used rather than scaled pythagoras.
  const miles = haversineMiles({ lat: 42.8, lng: -71 }, { lat: 42.8, lng: -70 });
  assert.ok(Math.abs(miles - 50.68) < 0.05, `got ${miles}`);
});

test('a point is no distance from itself', () => {
  assert.equal(haversineMiles(SALEM, SALEM), 0);
});

test('distance does not depend on which way round you ask', () => {
  assert.equal(haversineMiles(SALEM, MANCHESTER), haversineMiles(MANCHESTER, SALEM));
});

test('the launch towns are the distance apart that they are', () => {
  // Salem to Manchester is a little over 19 miles as the crow flies, and
  // Salem to Pelham a little over 7. Wide enough not to be asserting the
  // sixth decimal of a town centre, narrow enough that a wrong unit fails.
  const toManchester = haversineMiles(SALEM, MANCHESTER);
  const toPelham = haversineMiles(SALEM, PELHAM);
  assert.ok(toManchester > 18.5 && toManchester < 20, `Manchester: ${toManchester}`);
  assert.ok(toPelham > 7 && toPelham < 7.7, `Pelham: ${toPelham}`);
});

// ── how it reads ────────────────────────────────────────────────────────────

test('distance is phrased the way a person would say it', () => {
  assert.equal(formatDistance(0.0123), '60 ft');
  assert.equal(formatDistance(0.5), '0.5 mi');
  assert.equal(formatDistance(7.3067), '7.3 mi');
  assert.equal(formatDistance(12.4), '12 mi');
});

test('nine point nine six miles is not "10.0 mi"', () => {
  // The seam between the two formats. Rounding after choosing the branch
  // printed a trailing zero at exactly this one value.
  assert.equal(formatDistance(9.96), '10 mi');
  assert.equal(formatDistance(9.94), '9.9 mi');
});

test('no distance is said plainly rather than shown as zero', () => {
  assert.equal(formatDistance(null), null);
  assert.equal(formatDistance(NaN), null);
  assert.equal(formatDistance(Infinity), null);
  assert.equal(formatDistance(-1), null);
});

// ── what counts as a coordinate ─────────────────────────────────────────────

test('a coordinate has to be one', () => {
  assert.deepEqual(asPoint({ lat: 42.7886, lng: -71.2009 }), SALEM);
  // Strings arrive from JSON and from numeric columns.
  assert.deepEqual(asPoint({ lat: '42.7886', lng: '-71.2009' }), SALEM);
  assert.equal(asPoint(null), null);
  assert.equal(asPoint({}), null);
  assert.equal(asPoint({ lat: 42.7886 }), null);
  assert.equal(asPoint({ lat: 'north', lng: 'west' }), null);
  assert.equal(asPoint({ lat: 200, lng: -71 }), null, 'latitude 200 is not a place');
  assert.equal(asPoint({ lat: 42, lng: 400 }), null);
  assert.equal(asPoint({ lat: 0, lng: 0 }), null, 'null island is what an empty record looks like');
});

// ── the search ──────────────────────────────────────────────────────────────

test('punctuation and case do not change a search', () => {
  assert.equal(normalise("Ray's Auto Body, LLC"), 'rays auto body llc');
  // A curly apostrophe is what a phone keyboard and a pasted website title
  // produce, and it has to normalise to the same thing as the straight one.
  assert.equal(normalise("Ray’s Auto"), 'rays auto');
  assert.ok(matchesSearch("Ray's Auto Body, LLC", 'rays auto'));
  assert.ok(matchesSearch("Ray's Auto Body, LLC", 'RAY'));
});

test('every word has to land, so a second word narrows', () => {
  const hay = 'Granite State Plumbing · Plumbing';
  assert.ok(matchesSearch(hay, 'granite plumbing'));
  assert.ok(!matchesSearch(hay, 'granite electrician'));
});

test('a part-typed word matches from the start of a word only', () => {
  assert.ok(matchesSearch('Plumbing and Heating', 'plumb'), 'a prefix should match');
  assert.ok(!matchesSearch('Headquarters Quarter', 'art'), 'not from the middle of a word');
});

test('an empty search highlights nothing, not everything', () => {
  // The caller highlights matches. Before anything is typed there is nothing
  // to highlight, and "everything matches" would light the whole list up.
  assert.ok(!matchesSearch('Anything at all', ''));
  assert.ok(!matchesSearch('Anything at all', '   '));
});

test('the category names are searchable, not just the business name', () => {
  const listing = { name: 'Ray Chevrolet', categories: [{ name: 'Car dealerships' }] };
  assert.ok(matchesSearch(searchableText(listing), 'car'));
  assert.ok(!matchesSearch(searchableText(listing), 'bakery'));
});

// ── measuring a whole list ──────────────────────────────────────────────────

const LISTINGS = [
  { name: 'Manchester Motors', location: MANCHESTER, categories: [{ name: 'Car dealerships' }] },
  { name: 'Pelham Plumbing', location: PELHAM, categories: [{ name: 'Plumbing' }] },
  { name: 'Salem Shoes', location: SALEM, categories: [{ name: 'Clothing' }] },
  { name: 'Nowhere In Particular', location: null, categories: [] },
];

test('nearest comes first, and the unplaceable comes last', () => {
  const measured = measureListings(LISTINGS, SALEM, '');
  assert.deepEqual(
    measured.map((m) => m.listing.name),
    ['Salem Shoes', 'Pelham Plumbing', 'Manchester Motors', 'Nowhere In Particular'],
  );
  // The one with no coordinate is measured as nothing, never as zero — which
  // is what would have floated it to the top of a "nearest" list.
  assert.equal(measured[3].miles, null);
  assert.equal(measured[0].miles, 0);
});

test('with nowhere to measure from, the server order is kept', () => {
  const measured = measureListings(LISTINGS, null, '');
  assert.deepEqual(
    measured.map((m) => m.listing.name),
    LISTINGS.map((l) => l.name),
  );
  assert.ok(measured.every((m) => m.miles === null));
});

test('a search marks the matches and keeps the rest', () => {
  const measured = measureListings(LISTINGS, SALEM, 'plumbing');
  // Nothing is dropped — the list still holds everything, so a resident can
  // see that something better sits two streets from what they asked for.
  assert.equal(measured.length, 4);
  assert.deepEqual(
    measured.filter((m) => m.highlighted).map((m) => m.listing.name),
    ['Pelham Plumbing'],
  );
});

// ── framing the map ─────────────────────────────────────────────────────────

test('the bounds hold every placeable pin', () => {
  const box = boundsOf(LISTINGS.map((l) => l.location));
  assert.ok(box);
  assert.equal(box.sw.lat, PELHAM.lat);
  assert.equal(box.ne.lat, MANCHESTER.lat);
  assert.equal(box.sw.lng, MANCHESTER.lng);
  assert.equal(box.ne.lng, SALEM.lng);
});

test('nothing placeable means no bounds rather than a box at zero', () => {
  assert.equal(boundsOf([]), null);
  assert.equal(boundsOf([null, undefined, { lat: 0, lng: 0 }]), null);
});

// ── the category you are already inside ─────────────────────────────────────

test('the browsed category is left out of the haystack', () => {
  /*
   * Found in a real browser, not by reading the code. On the "Clothing &
   * Shoes" page every one of the forty-five businesses carries that category,
   * so searching "shoe" highlighted all forty-five — and a highlight that
   * marks everything marks nothing. It looked like a working feature while
   * telling the resident strictly less than the page already had.
   */
  const listing = {
    name: 'Peridot',
    categories: [{ name: 'Clothing & Shoes' }, { name: 'Gifts' }],
  };
  assert.ok(matchesSearch(searchableText(listing), 'shoe'),
    'without the exclusion, the category name matches');
  assert.ok(!matchesSearch(searchableText(listing, 'Clothing & Shoes'), 'shoe'),
    'with it, a word only in the browsed category no longer matches');
  // The other categories still count — they genuinely distinguish listings.
  assert.ok(matchesSearch(searchableText(listing, 'Clothing & Shoes'), 'gifts'));
  // And the name always counts.
  assert.ok(matchesSearch(searchableText(listing, 'Clothing & Shoes'), 'peridot'));
});

test('a search in a category narrows to the shops it names', () => {
  const inCategory = [
    { name: 'Benton Shoe', location: MANCHESTER, categories: [{ name: 'Clothing & Shoes' }] },
    { name: "George's Apparel", location: MANCHESTER, categories: [{ name: 'Clothing & Shoes' }] },
    { name: 'Peridot', location: SALEM, categories: [{ name: 'Clothing & Shoes' }] },
  ];
  const measured = measureListings(inCategory, MANCHESTER, 'shoe', 'Clothing & Shoes');
  assert.deepEqual(
    measured.filter((m) => m.highlighted).map((m) => m.listing.name),
    ['Benton Shoe'],
  );
  // Still three rows: the others are dimmed by the page, never dropped.
  assert.equal(measured.length, 3);
});
