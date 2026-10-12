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
  overpassClassQueries,
  truncatedClasses,
  dedupeOsmElements,
  OVERPASS_CLASSES,
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
  assert.equal(tradeWordsFor({ craft: 'blacksmith' }), 'blacksmith');
  assert.equal(tradeWordsFor({ shop: 'pet_grooming' }), 'pet grooming');
  // `shop=bicycle` used to be the example here. It is mapped now that
  // Sporting Goods exists, so a tag that IS still unmapped stands in its
  // place — the point of the test is the fallback, not the bicycle.
  assert.equal(tradeWordsFor({ shop: 'carpet' }), 'carpet');
});

test('a tag mapped deliberately to nothing stays nothing', () => {
  // Pharmacies, hardware shops and DIY sheds were all here, each because the
  // taxonomy had nowhere to put them. The `shops-retail` section gave all
  // three an honest destination on 2026-10-12, so they moved to the retail
  // tests below. What is left here is what is still genuinely ambiguous or
  // genuinely absent from the taxonomy.
  // `funeral_directors` lived here too, unmapped since the ingest was
  // written. It has a category as of 2026-10-12 and moved to the tests below.

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
  // A hardware shop is a RETAILER, not a handyman — which is why this was
  // `null` from 2026-10-06, when the only destination available was the
  // Handyman service category. With `hardware-building` in the retail
  // section it resolves properly.
  assert.equal(record.businessType, 'hardware store');
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

/* ── one query per class, which is how a town is really asked for ─────── */

test('each feature class is asked for separately, with its own allowance', () => {
  /*
    WHY THIS MATTERS, WITH THE RECEIPT

    `out ... N` caps the COMBINED result, so one query makes the four classes
    compete for a single allowance. Six kilometres around Manchester holds 785
    shops, 29 crafts, 94 offices and 323 amenities — 1231 features. The old
    combined query asked for 800 of them and said nothing whatever about the
    other 431: no flag, no warning, HTTP 200, well-formed JSON. The town's
    directory came out a third short and looked completely normal, because
    every listing in it was real.
  */
  const queries = overpassClassQueries(42.9956, -71.4548, 6000);
  assert.deepEqual(queries.map((q) => q.className), OVERPASS_CLASSES);
  assert.equal(queries.length, 4);

  for (const { query } of queries) {
    // Exactly one clause each — that is the whole point of splitting them.
    const clauses = query.split('\n').filter((l) => l.trim().startsWith('nwr'));
    assert.equal(clauses.length, 1);
    assert.ok(clauses[0].includes('["name"]'), clauses[0]);
    assert.ok(query.includes('around:6000,42.995600,-71.454800'));
    // The default allowance is the ceiling, because a class is now alone in it.
    assert.ok(query.includes('out center tags 2000'));
  }

  // Between them they still ask for everything the combined query did.
  const all = queries.map((q) => q.query).join('\n');
  for (const tag of ['["shop"]', '["craft"]', '"office"~', '"amenity"~']) {
    assert.ok(all.includes(tag), tag);
  }
});

test('the class queries clamp their radius and limit too', () => {
  assert.ok(overpassClassQueries(42, -71, 999_999)[0].query.includes('around:25000'));
  assert.ok(overpassClassQueries(42, -71, 1)[0].query.includes('around:500'));
  assert.ok(
    overpassClassQueries(42, -71, 6000, 99_999)[0].query.includes('out center tags 2000'),
  );
});

test('a class that came back at its limit is reported as suspect', () => {
  // At the limit is not proof of truncation — a class with exactly 2000
  // features looks identical — but it is the only signal Overpass gives, and
  // treating it as suspect is the right direction to be wrong in.
  assert.deepEqual(
    truncatedClasses({ shop: 785, craft: 29, office: 94, amenity: 323 }),
    [],
  );
  assert.deepEqual(truncatedClasses({ shop: 2000, craft: 29 }), ['shop']);
  assert.deepEqual(truncatedClasses({ shop: 800, craft: 800 }, 800), ['shop', 'craft']);
});

test('a feature answering two classes is kept once', () => {
  // A bakery that bakes on site is both `shop` and `craft`, so it comes back
  // from two of the four queries. Identity is OSM's own type and id: the only
  // thing here that cannot be two different places by coincidence.
  const bakery = { type: 'node', id: 1, tags: { shop: 'bakery', name: 'Rise' } };
  const deduped = dedupeOsmElements([
    bakery,
    { type: 'node', id: 2, tags: { name: 'Other' } },
    { ...bakery },
    // Same id, different element type, genuinely a different feature.
    { type: 'way', id: 1, tags: { name: 'A building' } },
  ] as OverpassElement[]);

  assert.deepEqual(deduped.map((e) => `${e.type}/${e.id}`), ['node/1', 'node/2', 'way/1']);
});

test('an element with no identity is dropped rather than guessed at', () => {
  // Without a type and id there is no way to tell a repeat from a new
  // feature, and a listing compiled from one could not be traced back.
  assert.deepEqual(dedupeOsmElements([{ tags: { name: 'Nowhere' } }] as OverpassElement[]), []);
  assert.deepEqual(dedupeOsmElements([] as OverpassElement[]), []);
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

/* ── retail, and the mappings that were silently broken ───────────────────── */

/*
  WHY THESE MATTER

  595 of 1,090 compiled listings held no category, and reading the names showed
  why: they were shops, and the taxonomy had Home & Property, Services, Food
  and Entertainment with no section for a shop. The `shops-retail` section was
  added on 2026-10-12 and these tags are its doors.

  Four mappings were ALSO pointing at phrases that do not exist in the alias
  table — `carpenter`, `tile`, `insurance` and `planting & beds`. A mapping
  like that resolves to nothing while looking handled, which is the worst of
  both: the listing goes uncategorised and the map says it was dealt with.
  Every value in `OSM_TRADE_WORDS` was checked against the live alias table
  after this change; none of them dangle.

  These assertions can only check the tag → PHRASE half, because the phrase →
  category half lives in the database. That split is exactly how the dangling
  four survived, so the check against the alias table is recorded in
  `tasks/exchange-retail-section.md` rather than pretended at here.
*/

test('a shop gets a retail phrase rather than nothing', () => {
  assert.equal(tradeWordsFor({ shop: 'chemist' }), 'pharmacy');
  assert.equal(tradeWordsFor({ shop: 'clothes' }), 'clothing');
  assert.equal(tradeWordsFor({ shop: 'mobile_phone' }), 'mobile phone store');
  assert.equal(tradeWordsFor({ shop: 'pet' }), 'pet supplies');
  assert.equal(tradeWordsFor({ shop: 'jewelry' }), 'jewelry');
  assert.equal(tradeWordsFor({ shop: 'optician' }), 'optician');
  assert.equal(tradeWordsFor({ shop: 'alcohol' }), 'liquor store');
  assert.equal(tradeWordsFor({ shop: 'charity' }), 'charity shop');
  assert.equal(tradeWordsFor({ shop: 'department_store' }), 'department store');
});

test('the hardware tags are mapped again, to retail this time', () => {
  // Unmapped on 2026-10-06 because every destination then available was wrong:
  // they read "handyman", so The Home Depot and Harbor Freight were filed
  // under a SERVICE category. The note left behind said they would list
  // unassigned "until the taxonomy carries a hardware or building-supply
  // category". It does now, so a retailer lands in a retail category.
  assert.equal(tradeWordsFor({ shop: 'hardware' }), 'hardware store');
  assert.equal(tradeWordsFor({ shop: 'doityourself' }), 'home improvement');
  assert.equal(tradeWordsFor({ shop: 'building_materials' }), 'building supply');
});

test('a pharmacy is a pharmacy now that there is somewhere to put one', () => {
  // `amenity=pharmacy` was deliberately empty for want of a category, which
  // left fourteen of them uncategorised — four CVS, four Walgreens, four Rite
  // Aid and two independents.
  assert.equal(tradeWordsFor({ amenity: 'pharmacy' }), 'pharmacy');
});

test('a florist is not a landscaper', () => {
  // This read "planting & beds" — landscaping work — and was wrong twice over,
  // because no such alias existed either. So it resolved to nothing and the
  // error was invisible.
  assert.equal(tradeWordsFor({ shop: 'florist' }), 'florist');
});

test('the tags with no honest destination are still unmapped', () => {
  // `beauty` stays out: OSM uses it for nail bars, waxing, spas and soap shops
  // alike, and `beauty-supply` is a shop selling cosmetics rather than any of
  // those. A retail section does not make an ambiguous tag unambiguous.
  assert.equal(tradeWordsFor({ shop: 'beauty' }), null);
  // No carpentry category exists. General Contracting is a different trade and
  // Handyman is the mistake that put Lowe's under odd jobs.
  assert.equal(tradeWordsFor({ craft: 'carpenter' }), null);
});

test('categories that existed but could not be reached now can be', () => {
  // None of these needed a new category — only a way in. Each had members
  // sitting uncategorised while its category sat empty.
  assert.equal(tradeWordsFor({ shop: 'supermarket' }), 'grocers');
  assert.equal(tradeWordsFor({ shop: 'laundry' }), 'dry cleaning');
  assert.equal(tradeWordsFor({ shop: 'dry_cleaning' }), 'dry cleaning');
  assert.equal(tradeWordsFor({ shop: 'copyshop' }), 'copy shop');
  assert.equal(tradeWordsFor({ shop: 'storage_rental' }), 'self storage');
  assert.equal(tradeWordsFor({ office: 'insurance' }), 'insurance');
});

/* ── the four groups that had nowhere to go, and the beauty subtag ────────── */

test('the four groups now resolve', () => {
  // Counted across the three towns on 2026-10-12: 66 vehicle dealerships, 11
  // tyre shops, 10 tattoo studios, 9 funeral homes. Every one had been left
  // unmapped on purpose, because a dealership is not Auto Repair — that is the
  // Lowe's-under-Handyman mistake in a different coat — and for the other
  // three there was no category at all.
  assert.equal(tradeWordsFor({ shop: 'car' }), 'car dealer');
  assert.equal(tradeWordsFor({ shop: 'motorcycle' }), 'motorcycle dealer');
  assert.equal(tradeWordsFor({ shop: 'boat' }), 'boat dealer');
  assert.equal(tradeWordsFor({ shop: 'tyres' }), 'tires');
  assert.equal(tradeWordsFor({ shop: 'tattoo' }), 'tattoo');
  assert.equal(tradeWordsFor({ shop: 'funeral_directors' }), 'funeral home');
});

test('a car dealership is not a mechanic', () => {
  // The two tags sit next to each other in the data — 61 dealerships and 122
  // repair shops — and conflating them would put Mercedes-Benz of Manchester
  // in front of somebody whose brakes are grinding.
  assert.notEqual(tradeWordsFor({ shop: 'car' }), tradeWordsFor({ shop: 'car_repair' }));
  assert.equal(tradeWordsFor({ shop: 'car_repair' }), 'mechanic');
});

test('shop=massage is unambiguous where shop=beauty is not', () => {
  assert.equal(tradeWordsFor({ shop: 'massage' }), 'massage');
  assert.equal(tradeWordsFor({ shop: 'beauty' }), null);
});

test('the beauty subtag settles what the bare tag cannot', () => {
  /*
    54 features carry `shop=beauty` across the three towns. 13 say
    `beauty=nails`, 2 say `beauty=tanning`, 2 are spas — and 34 say nothing at
    all. Those 34 include Top Nails, Buff City Soap, Sun Tan City and Medusa
    Body Piercing: a nail bar, a soap shop, a tanning salon and a piercing
    studio under one tag.

    So the subtag is read where it exists and the bare tag stays unmapped.
  */
  assert.equal(tradeWordsFor({ shop: 'beauty', beauty: 'nails' }), 'manicure');
  assert.equal(tradeWordsFor({ shop: 'beauty', beauty: 'spa' }), 'massage');

  // OSM's semicolon convention, first recognised value wins: a nail bar that
  // also does waxing is a nail bar.
  assert.equal(tradeWordsFor({ shop: 'beauty', beauty: 'nails;waxing' }), 'manicure');
  assert.equal(tradeWordsFor({ shop: 'beauty', beauty: 'spa;hair' }), 'massage');
  assert.equal(tradeWordsFor({ shop: 'beauty', beauty: 'eyelash;nails;waxing' }), 'manicure');

  // Subtags we carry nothing for leave it unmapped rather than reaching for
  // the nearest category. `tanning` is the live example: two of them, and no
  // tanning category.
  assert.equal(tradeWordsFor({ shop: 'beauty', beauty: 'tanning' }), null);
  assert.equal(tradeWordsFor({ shop: 'beauty', beauty: 'waxing;eyelash' }), null);
  assert.equal(tradeWordsFor({ shop: 'beauty', beauty: '' }), null);
});

test('a subtag never overrides a tag that already resolves cleanly', () => {
  // Only `shop=beauty` consults it. Letting a stray `beauty=` key redirect a
  // hairdresser or a pharmacy would be a second, quieter way for the map to
  // disagree with itself.
  assert.equal(tradeWordsFor({ shop: 'hairdresser', beauty: 'nails' }), 'haircut');
  assert.equal(tradeWordsFor({ amenity: 'pharmacy', beauty: 'spa' }), 'pharmacy');
});
