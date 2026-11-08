/**
 * Free music, and the half of "free" that is a legal obligation.
 *
 * "Free" means three things and only one is safe on a commercial post. Free
 * to listen is not free to use. CC-BY is free to use AND REQUIRES CREDIT —
 * a reel posted without it is a licence breach, not a discourtesy. CC0 asks
 * for nothing.
 *
 * So the tests that matter are not about searching. They are:
 *
 *   - nothing we cannot legally use is ever offered
 *   - anything that needs credit arrives WITH the credit line
 *   - nothing claims credit is needed when it is not, because a field that
 *     cries wolf is a field people stop reading
 *
 * This is a business being prepared for sale, posting to a public feed.
 * Handing somebody a URL and an unmentioned obligation is the failure worth
 * writing tests against.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSearchUrl,
  normaliseTrack,
  usableTracks,
  attributionFor,
  creditsFor,
  OFFERED_LICENCES,
} from '../src/app/lib/freeMusicSearch.ts';

const cc0 = {
  id: 'a1',
  title: 'Ambient Corporate',
  creator: 'WinnieTheMoog',
  url: 'https://upload.wikimedia.org/wikipedia/commons/b/be/track.ogg',
  duration: 181472,
  license: 'cc0',
  license_version: '1.0',
  provider: 'wikimedia_audio',
  foreign_landing_url: 'https://commons.wikimedia.org/wiki/File:track.ogg',
};

const ccBy = {
  ...cc0,
  id: 'a2',
  title: 'Quiet Beds',
  creator: 'Somebody',
  license: 'by',
  license_version: '4.0',
  attribution: '"Quiet Beds" by Somebody is licensed under CC BY 4.0.',
  url: 'https://cdn.freesound.org/previews/1/1-hq.mp3',
  provider: 'freesound',
};

/* ── what is offered ─────────────────────────────────────────────────────── */

test('only the two licences we can live with are requested', () => {
  assert.equal(OFFERED_LICENCES, 'cc0,by');
  const url = buildSearchUrl('corporate');
  assert.match(url, /license=cc0%2Cby/);
  // Sound effects are the bulk of this catalogue and the enemy of a bed.
  assert.match(url, /categories=music/);
});

test('an empty query still searches for something sensible', () => {
  assert.match(buildSearchUrl('   '), /q=instrumental\+background/);
});

test('the page size cannot be driven somewhere silly', () => {
  assert.match(buildSearchUrl('x', 9999), /page_size=40/);
  assert.match(buildSearchUrl('x', 0), /page_size=1/);
});

/* ── the obligation travels with the track ───────────────────────────────── */

test('a CC-BY track arrives with the exact credit line to paste', () => {
  const t = normaliseTrack(ccBy)!;
  assert.equal(t.licence, 'by');
  assert.match(t.licenceLabel, /credit required/i);
  assert.equal(t.attribution, '"Quiet Beds" by Somebody is licensed under CC BY 4.0.');
});

test('a credit line is built when the feed does not supply one', () => {
  const made = attributionFor({ title: 'T', creator: 'C', license: 'by', license_version: '4.0' }, 'by');
  assert.match(made, /"T"/);
  assert.match(made, /by C/);
  assert.match(made, /CC BY 4\.0/);
});

/**
 * Asking for credit that is not owed trains people to ignore the field, and
 * the field is the only thing standing between them and a licence breach on
 * the one that does owe it.
 */
test('CC0 asks for nothing', () => {
  const t = normaliseTrack(cc0)!;
  assert.equal(t.licence, 'cc0');
  assert.equal(t.attribution, '');
  assert.equal(attributionFor(cc0, 'cc0'), '');
});

test('the credits block is only the lines actually owed', () => {
  const tracks = [normaliseTrack(cc0)!, normaliseTrack(ccBy)!];
  assert.equal(creditsFor(tracks), '"Quiet Beds" by Somebody is licensed under CC BY 4.0.');
  assert.equal(creditsFor([normaliseTrack(cc0)!]), '');
  assert.equal(creditsFor([]), '');
});

/* ── nothing unusable is ever offered ────────────────────────────────────── */

test('a licence we did not ask for is dropped even if the API returns it', () => {
  for (const license of ['by-sa', 'by-nc', 'by-nd', 'by-nc-sa', '']) {
    assert.equal(normaliseTrack({ ...cc0, license }), null, license || '(blank)');
  }
});

test('a track with no usable audio URL is dropped', () => {
  assert.equal(normaliseTrack({ ...cc0, url: '' }), null);
  assert.equal(normaliseTrack({ ...cc0, url: 'http://insecure.test/a.mp3' }), null, 'http would be blocked anyway');
  assert.equal(normaliseTrack(null), null);
  assert.equal(normaliseTrack({}), null);
});

/** A four-second one-shot looped under a 30s reel is a drill, not music. */
test('clips too short to be a bed are left out', () => {
  const short = { ...cc0, id: 'short', duration: 4000 };
  assert.equal(usableTracks([short]).length, 0);
  assert.equal(usableTracks([cc0]).length, 1);
});

test('an unknown duration is kept rather than guessed away', () => {
  assert.equal(usableTracks([{ ...cc0, duration: null }]).length, 1);
});

test('a duration in the wrong unit does not become a 50-hour track', () => {
  const t = normaliseTrack({ ...cc0, duration: 99_999_999 })!;
  assert.equal(t.duration, 0, 'reported as unknown rather than absurd');
});

test('milliseconds become seconds', () => {
  assert.equal(normaliseTrack(cc0)!.duration, 181.5);
});

/* ── ordering ────────────────────────────────────────────────────────────── */

test('the ones that cost nothing afterwards come first', () => {
  const out = usableTracks([ccBy, cc0]);
  assert.deepEqual(out.map((t) => t.licence), ['cc0', 'by']);
});

test('junk from the API does not throw', () => {
  assert.deepEqual(usableTracks(null as any), []);
  assert.deepEqual(usableTracks([null, undefined, 'nope', 42] as any), []);
});
