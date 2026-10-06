/**
 * OpenStreetMap as a source of listings.
 *
 * WHY THESE ASSERTIONS
 *
 * The ingest rules this feeds were written against registry rows, and the
 * tempting mistakes here are all about making OSM's sparser data *look* like a
 * registry row.
 *
 * NEVER DEFAULT A POSTCODE. The tempting version fills the searched town's
 * postcode in where OSM has none, because it raises the yield. It would also
 * turn a record `toListing` means to reject — no phone, no postcode, nobody
 * can contact or place it — into one it accepts, inventing the very fact the
 * rule turns on. The town and state ARE passed through, because those describe
 * the search rather than the business.
 *
 * AN UNMAPPED TAG MUST RESOLVE TO NOTHING, NOT TO SOMETHING CLOSE. A roofer
 * filed under plumbing produces no leads and no complaint, just a cancellation
 * six months later. Mapping to null is visible and fixable.
 *
 * A FEATURE WITHOUT A NAME IS NOT A BUSINESS. OSM is full of unnamed shops and
 * offices; they are map geometry, not listings.
 *
 * The real fixtures are shaped exactly like the live Overpass responses seen
 * on 2026-10-03, including the two tag conventions (`phone` and
 * `contact:phone`) that OSM carries simultaneously.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tradeWordsFor,
  osmToRegistryRecord,
  osmCoordinates,
  overpassQuery,
  belongsToTerritory,
  OSM_ATTRIBUTION,
  type OverpassElement,
} from '../supabase/functions/server/exchangeOsm.ts';

const PELHAM = { name: 'Pelham', state: 'NH', territorySlug: 'pelham-nh' };

/* ── the trade words ──────────────────────────────────────────────────── */

test('a mapped tag becomes the phrase a resident would use', () => {
  assert.equal(tradeWordsFor({ craft: 'roofer' }), 'roofer');
  assert.equal(tradeWordsFor({ shop: 'car_repair' }), 'mechanic');
  assert.equal(tradeWordsFor({ office: 'lawyer' }), 'divorce lawyer');
  assert.equal(tradeWordsFor({ amenity: 'cafe' }), 'coffee');
});

test('an unmapped tag keeps its own words rather than guessing a category', () => {
  // Underscores opened out so the alias matcher has a chance, but nothing
  // is forced into a category we carry.
  assert.equal(tradeWordsFor({ shop: 'bicycle' }), 'bicycle');
  assert.equal(tradeWordsFor({ craft: 'blacksmith' }), 'blacksmith');
  assert.equal(tradeWordsFor({ shop: 'pet_grooming' }), 'pet grooming');
});

test('a tag mapped deliberately to nothing stays nothing', () => {
  // A pharmacy is a real business and we carry no category for it. Forcing it
  // somewhere adjacent would be worse than leaving it unassigned.
  assert.equal(tradeWordsFor({ amenity: 'pharmacy' }), null);
  assert.equal(tradeWordsFor({ shop: 'funeral_directors' }), null);

  /*
    Retailers and beauty shops, all learned from a real run.

    `beauty` read as "manicure" and filed Medusa Body Piercing, Buff City Soap
    and Bella Viaggio Salon & Spa under Nail Salons — three for three wrong.
    `hardware` and `doityourself` read as "handyman" and filed Lowe's, The
    Home Depot and Harbor Freight Tools under a SERVICE category, where
    somebody looking for a person to hang a door would find them.

    The taxonomy carries no category for either, so unassigned is the honest
    answer. A wrong category produces no leads, no complaint, and a
    cancellation six months later.
  */
  assert.equal(tradeWordsFor({ shop: 'beauty' }), null);
  assert.equal(tradeWordsFor({ shop: 'hardware' }), null);
  assert.equal(tradeWordsFor({ shop: 'doityourself' }), null);
});

test('craft wins over shop, which wins over amenity', () => {
  // A roofer who also sells materials is a roofer.
  assert.equal(tradeWordsFor({ craft: 'roofer', shop: 'hardware' }), 'roofer');
  assert.equal(tradeWordsFor({ shop: 'car_repair', amenity: 'cafe' }), 'mechanic');
});

test('no tags at all resolves to nothing', () => {
  assert.equal(tradeWordsFor({}), null);
  assert.equal(tradeWordsFor(undefined), null);
  assert.equal(tradeWordsFor({ name: 'Just A Name' }), null);
});

/* ── an element as a record ───────────────────────────────────────────── */

test('a real Pelham element becomes a record with nothing added', () => {
  const element: OverpassElement = {
    type: 'node', id: 1, lat: 42.7362, lon: -71.3273,
    tags: {
      name: 'Bridge Street Hardware',
      shop: 'hardware',
      phone: '+1 603-635-1521',
      website: 'https://truevalue.com/bridgestreethardware/',
      'addr:housenumber': '12',
      'addr:street': 'Bridge Street',
      'addr:city': 'Pelham',
      'addr:postcode': '03076',
    },
  };

  const record = osmToRegistryRecord(element, PELHAM) as any;
  assert.equal(record.name, 'Bridge Street Hardware');
  // A hardware shop is a RETAILER, not a handyman. See OSM_TRADE_WORDS.
  assert.equal(record.businessType, null);
  assert.equal(record.address, '12 Bridge Street');
  assert.equal(record.city, 'Pelham');
  assert.equal(record.state, 'NH');
  assert.equal(record.postcode, '03076');
  assert.equal(record.phone, '+1 603-635-1521');
  assert.equal(record.source, 'openstreetmap');
});

test('the postcode is NEVER defaulted from the town we searched', () => {
  // The rule this protects: toListing rejects a record with neither a phone
  // nor a postcode, because nobody could contact or place it. Filling the
  // town's postcode in here would quietly defeat that.
  const element: OverpassElement = {
    type: 'node', id: 2, lat: 42.73, lon: -71.32,
    tags: { name: 'All Peaks Roofing LLC', craft: 'roofer', 'addr:street': 'Pulpit Rock Road' },
  };
  const record = osmToRegistryRecord(element, PELHAM) as any;
  assert.equal(record.postcode, null);
  assert.equal(record.phone, null);
  // But the town and state are passed through: they describe the search.
  assert.equal(record.city, 'Pelham');
  assert.equal(record.state, 'NH');
});

test('OSM’s own city beats the searched town when it has one', () => {
  const element: OverpassElement = {
    type: 'node', id: 3, lat: 42.73, lon: -71.32,
    tags: { name: 'Edge Of Town Diner', amenity: 'restaurant', 'addr:city': 'Windham', 'addr:postcode': '03087' },
  };
  const record = osmToRegistryRecord(element, PELHAM) as any;
  assert.equal(record.city, 'Windham');
});

test('both OSM phone and website conventions are read', () => {
  const element: OverpassElement = {
    type: 'way', id: 4, center: { lat: 42.78, lon: -71.2 },
    tags: {
      name: 'Pro-Turf Landscaping', craft: 'gardener',
      'contact:phone': '603-555-0142',
      'contact:website': 'https://pro-turf.example.com',
    },
  };
  const record = osmToRegistryRecord(element, PELHAM) as any;
  assert.equal(record.phone, '603-555-0142');
  assert.equal(record.website, 'https://pro-turf.example.com');
  assert.equal(record.businessType, 'lawn guy');
});

test('a feature with no name is not a business', () => {
  assert.equal(osmToRegistryRecord({ type: 'node', id: 5, tags: { shop: 'convenience' } }, PELHAM), null);
  assert.equal(osmToRegistryRecord({ type: 'node', id: 6, tags: { name: '   ', shop: 'bakery' } }, PELHAM), null);
  assert.equal(osmToRegistryRecord({ type: 'node', id: 7 }, PELHAM), null);
  assert.equal(osmToRegistryRecord(null, PELHAM), null);
});

test('a street with no house number is still an address', () => {
  const r = osmToRegistryRecord(
    { type: 'node', id: 8, tags: { name: 'X', shop: 'car', 'addr:street': 'Bridge Street', 'addr:postcode': '03076' } },
    PELHAM,
  ) as any;
  assert.equal(r.address, 'Bridge Street');
});

test('a house number with no street is not an address', () => {
  const r = osmToRegistryRecord(
    { type: 'node', id: 9, tags: { name: 'X', shop: 'car', 'addr:housenumber': '12', 'addr:postcode': '03076' } },
    PELHAM,
  ) as any;
  assert.equal(r.address, null);
});

/* ── coordinates ──────────────────────────────────────────────────────── */

test('a node carries its own point, a way carries a centre', () => {
  assert.deepEqual(osmCoordinates({ lat: 42.7362, lon: -71.3273 }), { lat: 42.7362, lng: -71.3273 });
  assert.deepEqual(osmCoordinates({ center: { lat: 42.5, lon: -71.1 } }), { lat: 42.5, lng: -71.1 });
});

test('a missing or impossible coordinate is null rather than zero', () => {
  // (0,0) is in the Atlantic. Returning it would put businesses there.
  assert.equal(osmCoordinates({}), null);
  assert.equal(osmCoordinates(null), null);
  assert.equal(osmCoordinates({ lat: 91, lon: 0 }), null);
  assert.equal(osmCoordinates({ lat: 0, lon: 181 }), null);
});

/* ── the query ────────────────────────────────────────────────────────── */

test('the query asks only for named features', () => {
  const q = overpassQuery(42.7362, -71.3273, 6000);
  // Every clause filters on name server-side: politer to a shared free
  // endpoint than downloading them and discarding them here.
  const clauses = q.split('\n').filter((l) => l.trim().startsWith('nwr'));
  assert.equal(clauses.length, 4);
  for (const c of clauses) assert.ok(c.includes('["name"]'), c);
  assert.ok(q.includes('[out:json]'));
  assert.ok(q.includes('around:6000,42.736200,-71.327300'));
});

test('the radius and the limit are clamped', () => {
  // A hand-typed radius must not become a request for the whole state.
  assert.ok(overpassQuery(42, -71, 999_999).includes('around:25000'));
  assert.ok(overpassQuery(42, -71, 1).includes('around:500'));
  assert.ok(overpassQuery(42, -71, 6000, 99_999).includes('out center tags 2000'));
});

/* ── the licence ──────────────────────────────────────────────────────── */

test('the attribution string is exactly what the licence requires', () => {
  // ODbL. Pinned so that nobody shortens it to "OpenStreetMap" one day.
  assert.equal(OSM_ATTRIBUTION, '© OpenStreetMap contributors');
});

/* ── the territory filter ─────────────────────────────────────────────── */

/**
 * These cases are the actual leak, not an invented one. The first dry run
 * against live Overpass data returned "Haverhill Fire Department" in postcode
 * 01830 — Massachusetts — because six kilometres around Salem, New Hampshire
 * crosses the state line, and the record had been stamped `NH` from the search.
 */
const SALEM_TERRITORY = { postcodes: ['03079'], state: 'NH' };

test('a postcode outside the territory is rejected', () => {
  const haverhill = osmToRegistryRecord(
    { type: 'node', id: 20, tags: { name: 'Haverhill Fire Department', office: 'company', 'addr:postcode': '01830' } },
    { name: 'Salem', state: 'NH' },
  );
  assert.equal(belongsToTerritory(haverhill, SALEM_TERRITORY), false);
});

test('a state OSM itself gave us, not ours, is rejected even without a postcode', () => {
  const overTheLine = osmToRegistryRecord(
    { type: 'node', id: 21, tags: { name: 'Bay State Plumbing', craft: 'plumber', 'addr:state': 'MA', phone: '978-555-0100' } },
    { name: 'Salem', state: 'NH' },
  );
  assert.equal(belongsToTerritory(overTheLine, SALEM_TERRITORY), false);
});

test('a postcode inside the territory is kept, ZIP+4 and all', () => {
  const inTown = osmToRegistryRecord(
    { type: 'node', id: 22, tags: { name: 'Salem Roofing', craft: 'roofer', 'addr:postcode': '03079-1234' } },
    { name: 'Salem', state: 'NH' },
  );
  assert.equal(belongsToTerritory(inTown, SALEM_TERRITORY), true);
});

test('no postcode and no state of its own is kept, placed by proximity', () => {
  // The stated compromise: it was found within a few kilometres of the centre
  // and needs a phone to be listable at all.
  const nearby = osmToRegistryRecord(
    { type: 'node', id: 23, tags: { name: 'All Peaks Roofing LLC', craft: 'roofer', phone: '603-555-0101' } },
    { name: 'Salem', state: 'NH' },
  );
  assert.equal(belongsToTerritory(nearby, SALEM_TERRITORY), true);
});

test('a territory with no postcodes on record falls back to the state check', () => {
  const rec = osmToRegistryRecord(
    { type: 'node', id: 24, tags: { name: 'X', craft: 'roofer', 'addr:postcode': '99999' } },
    { name: 'Salem', state: 'NH' },
  );
  assert.equal(belongsToTerritory(rec, { state: 'NH' }), true);
  assert.equal(belongsToTerritory(rec, { postcodes: [], state: 'NH' }), true);
});

test('nothing is not in the territory', () => {
  assert.equal(belongsToTerritory(null, SALEM_TERRITORY), false);
  assert.equal(belongsToTerritory(undefined, SALEM_TERRITORY), false);
});

test('a government office is no longer even asked for', () => {
  // The fire department arrived through an unrestricted ["office"] clause.
  const q = overpassQuery(42.7884, -71.2009, 6000);
  const officeClause = q.split('\n').find((l) => l.includes('["office'));
  assert.ok(officeClause, 'there is an office clause');
  assert.ok(officeClause!.includes('lawyer'), 'it names the offices we carry');
  assert.ok(!/\["office"\]\["name"\]/.test(q), 'office is not unrestricted');
});
