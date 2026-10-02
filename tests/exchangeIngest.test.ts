/**
 * Compiling public records into listings.
 *
 * WHY THESE ASSERTIONS
 *
 * This code writes rows about real businesses that never asked to be listed,
 * which makes its failure modes unusual: almost all of them are invisible to
 * us and obvious to the one person guaranteed to look — the owner.
 *
 * INVENT NOTHING. A missing phone number is a gap somebody can fill. A wrong
 * one sends a resident to a stranger and gets the listing reported. Every
 * normaliser here is tested on what it must REFUSE at least as hard as on
 * what it must accept, because the tempting version of each one is the
 * forgiving version that turns a seven-digit fragment into something that
 * looks dialable.
 *
 * NEVER OVERWRITE A CLAIMED LISTING. An owner who corrects their address and
 * finds last year's back the following week has no way to know why, and is
 * gone. This is the single most important rule in the file.
 *
 * AND DO NOT GUESS A CATEGORY. A roofer filed under plumbing produces no
 * leads and no complaint — just a cancellation six months later.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanName,
  matchableName,
  normalisePhone,
  phoneDigits,
  normaliseWebsite,
  normalisePostcode,
  normaliseState,
  assignCategory,
  dedupeKeyFor,
  toListing,
  dedupeListings,
  mergeListing,
  type ListingCandidate,
} from '../supabase/functions/server/exchangeIngest.ts';

const ALIASES = new Map<string, string>([
  ['roofing', 'roofing'],
  ['roofing contractor', 'roofing'],
  ['plumber', 'plumbing'],
  ['plumbing', 'plumbing'],
  ['restaurant', 'restaurants'],
  ['pizza', 'pizza'],
  ['general contractor', 'general-contracting'],
]);

// ── names ────────────────────────────────────────────────────────────────────

test('a display name keeps what the record said, tidied', () => {
  // "Sutton Roofing LLC" is what is on their van. We do not improve it.
  assert.equal(cleanName('  Sutton   Roofing LLC '), 'Sutton Roofing LLC');
  assert.equal(cleanName('Sutton Roofing,'), 'Sutton Roofing');
  assert.equal(cleanName(''), null);
  assert.equal(cleanName(null), null);
});

test('matching strips the legal suffix the owner never says out loud', () => {
  assert.equal(matchableName('Sutton Roofing, LLC'), 'sutton roofing');
  assert.equal(matchableName('Sutton Roofing Inc.'), 'sutton roofing');
  assert.equal(matchableName('Sutton Roofing Co Inc'), 'sutton roofing', 'stacked suffixes');
});

test('& and "and" are the same word for matching', () => {
  assert.equal(matchableName('Smith & Sons'), matchableName('Smith and Sons'));
});

test('a business actually called "Co" is not stripped to nothing', () => {
  assert.equal(matchableName('Co'), 'co');
  assert.equal(matchableName('LLC'), 'llc');
});

// ── phone numbers ────────────────────────────────────────────────────────────

test('a real number is formatted one way, however it arrived', () => {
  for (const input of ['6035551234', '(603) 555-1234', '603.555.1234', '1-603-555-1234', ' +1 603 555 1234 ']) {
    assert.equal(normalisePhone(input), '(603) 555-1234', input);
  }
});

test('anything that is not a dialable number becomes nothing', () => {
  // The forgiving version of this function is the dangerous one.
  for (const input of [
    '5551234',            // seven digits
    '0000000000',         // placeholder
    '1111111111',         // placeholder
    '0035551234',         // area code cannot start 0
    '1035551234',         // area code cannot start 1
    '603555123',          // nine
    '60355512345',        // eleven not starting 1
    'call the shop',
    '',
    null,
    undefined,
  ]) {
    assert.equal(normalisePhone(input as any), null, JSON.stringify(input));
  }
});

test('digits are what two registries are compared on', () => {
  assert.equal(phoneDigits('(603) 555-1234'), '6035551234');
  assert.equal(phoneDigits('nope'), null);
});

// ── websites ─────────────────────────────────────────────────────────────────

test('a bare domain gets https, and a trailing slash goes', () => {
  assert.equal(normaliseWebsite('suttonroofing.com'), 'https://suttonroofing.com');
  assert.equal(normaliseWebsite('http://suttonroofing.com/'), 'http://suttonroofing.com');
});

test('only http and https survive', () => {
  // These links render across the portals and the store. A javascript:
  // scheme stored here would execute for every other visitor.
  for (const input of [
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'data:text/html,<script>x</script>',
    'file:///etc/passwd',
    'ftp://files.example.com',
    'vbscript:msgbox',
  ]) {
    assert.equal(normaliseWebsite(input), null, input);
  }
});

test('junk that is not a URL becomes nothing', () => {
  for (const input of ['', '   ', 'none', 'n/a', 'localhost', null, 42]) {
    assert.equal(normaliseWebsite(input as any), null, JSON.stringify(input));
  }
});

test('somebody else’s campaign parameters are not republished as their URL', () => {
  assert.equal(
    normaliseWebsite('https://shop.example.com/?utm_source=chamber&id=7&fbclid=abc'),
    'https://shop.example.com/?id=7',
  );
});

// ── place ────────────────────────────────────────────────────────────────────

test('postcodes keep five digits and refuse the rest', () => {
  assert.equal(normalisePostcode('03079'), '03079');
  assert.equal(normalisePostcode('03079-1234'), '03079');
  assert.equal(normalisePostcode('3079'), null);
  assert.equal(normalisePostcode('NH 03079'), null);
});

test('states are two letters or nothing', () => {
  assert.equal(normaliseState('nh'), 'NH');
  assert.equal(normaliseState('New Hampshire'), null);
  assert.equal(normaliseState(''), null);
});

// ── category assignment ──────────────────────────────────────────────────────

test('an exact match on the registry’s words wins', () => {
  assert.equal(assignCategory('ROOFING CONTRACTOR', ALIASES), 'roofing');
});

test('the longest alias inside the text wins, not the first', () => {
  // "roofing contractor" beats "roofing", which is the more specific answer.
  assert.equal(assignCategory('Licensed Roofing Contractor of NH', ALIASES), 'roofing');
  assert.equal(assignCategory('General Contractor and Builder', ALIASES), 'general-contracting');
});

test('an unrecognised trade is left unassigned rather than guessed', () => {
  // Visible and fixable beats a roofer quietly filed under plumbing.
  assert.equal(assignCategory('TAXIDERMY SERVICES', ALIASES), null);
  assert.equal(assignCategory('', ALIASES), null);
  assert.equal(assignCategory(null, ALIASES), null);
  assert.equal(assignCategory('roofing', new Map()), null);
});

// ── building a candidate ─────────────────────────────────────────────────────

const record = {
  name: 'Sutton Roofing LLC',
  businessType: 'ROOFING CONTRACTOR',
  address: '12 Main St',
  city: 'Salem',
  state: 'nh',
  postcode: '03079-1234',
  phone: '603-555-1234',
  website: 'suttonroofing.com',
  source: 'nh-licence-board',
};

test('a good record becomes exactly the five public fields and nothing more', () => {
  const listing = toListing(record, ALIASES)!;
  assert.equal(listing.name, 'Sutton Roofing LLC');
  assert.equal(listing.categorySlug, 'roofing');
  assert.equal(listing.postcode, '03079');
  assert.equal(listing.state, 'NH');
  assert.equal(listing.phone, '(603) 555-1234');
  assert.equal(listing.website, 'https://suttonroofing.com');

  // Nothing that an owner has not stood behind.
  for (const invented of ['description', 'hours', 'photos', 'rating', 'logo']) {
    assert.equal((listing as any)[invented], undefined, `${invented} must not be invented`);
  }
});

test('no name means no listing', () => {
  assert.equal(toListing({ ...record, name: '  ' }, ALIASES), null);
});

test('a business that can be neither placed nor contacted is not listed', () => {
  // It could only ever be a dead listing, which is worse than no listing.
  assert.equal(toListing({ name: 'Ghost Co', postcode: null, phone: null }, ALIASES), null);
  assert.ok(toListing({ name: 'Ghost Co', postcode: '03079' }, ALIASES));
  assert.ok(toListing({ name: 'Ghost Co', phone: '6035551234' }, ALIASES));
});

// ── deduplication ────────────────────────────────────────────────────────────

test('the phone number identifies a business before the address does', () => {
  // Two registries rarely agree on how an address is written and almost
  // always agree on the number.
  assert.equal(
    dedupeKeyFor({ name: 'Sutton Roofing LLC', phone: '603-555-1234', postcode: '03079' }),
    'tel:6035551234',
  );
});

test('without a phone it is the matchable name and the postcode', () => {
  assert.equal(
    dedupeKeyFor({ name: 'Sutton Roofing, LLC', postcode: '03079-1234' }),
    'name:sutton roofing|03079',
  );
  assert.equal(
    dedupeKeyFor({ name: 'Sutton Roofing Inc', postcode: '03079' }),
    dedupeKeyFor({ name: 'Sutton Roofing, LLC', postcode: '03079' }),
    'the same business listed twice by two registries',
  );
});

test('two sources describing one business are merged, not shown twice', () => {
  const fromBoard = toListing(
    { name: 'Sutton Roofing LLC', phone: '6035551234', licenseNumber: 'NH-4471', postcode: '03079' },
    ALIASES,
  )!;
  const fromChamber = toListing(
    { name: 'Sutton Roofing', phone: '(603) 555-1234', website: 'suttonroofing.com',
      businessType: 'roofing', postcode: '03079' },
    ALIASES,
  )!;

  const out = dedupeListings([fromBoard, fromChamber]);
  assert.equal(out.length, 1, 'one business, one row');
  // The union is the whole reason to compile from several sources.
  assert.equal(out[0].licenseNumber, 'NH-4471');
  assert.equal(out[0].website, 'https://suttonroofing.com');
  assert.equal(out[0].categorySlug, 'roofing');
});

test('the first source wins a disagreement, so source order is priority order', () => {
  const first = toListing({ name: 'A', phone: '6035551234', website: 'first.com' }, ALIASES)!;
  const second = toListing({ name: 'A', phone: '6035551234', website: 'second.com' }, ALIASES)!;
  assert.equal(dedupeListings([first, second])[0].website, 'https://first.com');
});

test('two genuinely different businesses stay two rows', () => {
  const a = toListing({ name: 'Sutton Roofing', postcode: '03079' }, ALIASES)!;
  const b = toListing({ name: 'Pelham Plumbing', postcode: '03076' }, ALIASES)!;
  assert.equal(dedupeListings([a, b]).length, 2);
});

// ── re-importing ─────────────────────────────────────────────────────────────

const candidate = (over: Partial<ListingCandidate> = {}): ListingCandidate => ({
  name: 'Sutton Roofing LLC',
  categorySlug: 'roofing',
  address: '12 Main St', city: 'Salem', state: 'NH', postcode: '03079',
  phone: '(603) 555-1234', website: 'https://suttonroofing.com',
  licenseNumber: 'NH-4471', licenseState: 'NH', licenseExpiresAt: null,
  source: 'nh-licence-board', dedupeKey: 'tel:6035551234',
  ...over,
});

test('a claimed listing is never touched by a re-import', () => {
  // THE most important rule here. An owner who corrects their details and
  // finds last year's back next week has no idea why, and leaves.
  const patch = mergeListing(
    { claim_state: 'claimed', listing_source: 'registry', phone: null, website: null },
    candidate(),
  );
  assert.deepEqual(patch, {}, 'nothing, not even an empty field');
});

test('a business that signed up itself is never touched either', () => {
  const patch = mergeListing(
    { claim_state: 'listed', listing_source: 'signup', phone: null },
    candidate(),
  );
  assert.deepEqual(patch, {});
});

test('an unclaimed compiled listing has its gaps filled', () => {
  const patch = mergeListing(
    { claim_state: 'listed', listing_source: 'registry', phone: null, website: null, license_number: 'NH-4471' },
    candidate(),
  );
  assert.deepEqual(patch, {
    phone: '(603) 555-1234',
    website: 'https://suttonroofing.com',
  }, 'the licence number it already had is left alone');
});

test('a disagreement is left for a human rather than resolved by recency', () => {
  const patch = mergeListing(
    { claim_state: 'listed', listing_source: 'registry', phone: '(603) 555-9999' },
    candidate({ phone: '(603) 555-1234' }),
  );
  assert.equal(patch.phone, undefined, 'the newer registry does not simply win');
});

test('a business not yet in the directory is written in full, as listed', () => {
  const patch = mergeListing(null, candidate());
  assert.equal(patch.claim_state, 'listed');
  assert.equal(patch.listing_source, 'registry');
  assert.equal(patch.name, 'Sutton Roofing LLC');
});
