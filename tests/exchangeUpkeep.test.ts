/**
 * Which town the Exchange refresh touches, and when it leaves Overpass alone.
 *
 * WHY THIS IS TESTED BEFORE THE CLOCK IS ARMED
 *
 * It decides what a scheduled job does to a live directory of 1,100
 * businesses, against a free endpoint that has already refused us once — an
 * earlier fetcher fired twelve queries back to back and was blocked. The two
 * rules that keep that from happening again are "one town per tick" and "do
 * nothing when everything is fresh", and the second is the one a careless
 * change would quietly remove. So it is pinned here.
 *
 * The other rule worth pinning is that a town which has never been compiled
 * wins. Hudson and Windham sat opened-but-empty because compiling a hidden
 * town threw; with that fixed, the clock must fill them before it goes back to
 * re-checking Manchester's 897.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pickTownToRefresh, describeRun, REFRESH_AFTER_DAYS,
  type UpkeepTown,
} from '../supabase/functions/server/exchangeUpkeep.ts';

const NOW = Date.parse('2026-10-16T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString();

const town = (over: Partial<UpkeepTown> = {}): UpkeepTown => ({
  slug: 'a-town',
  name: 'A Town',
  status: 'active',
  center_lat: 42.9,
  center_lng: -71.4,
  last_compiled_at: daysAgo(1),
  ...over,
});

/* ── doing nothing is a real answer ──────────────────────────────────────── */

test('nothing runs when every town is inside the refresh window', () => {
  // The rule that protects a free endpoint. A clock that always does something
  // re-fetches the same town every tick the moment the list is short.
  const choice = pickTownToRefresh([
    town({ slug: 'manchester-nh', last_compiled_at: daysAgo(1) }),
    town({ slug: 'salem-nh', last_compiled_at: daysAgo(3) }),
  ], NOW);
  assert.equal(choice.town, null);
  assert.equal(choice.reason, 'all-fresh');
  assert.match(choice.why, /refreshed within the last 7 days/);
});

test('the wait message names the town due next and how long', () => {
  const choice = pickTownToRefresh([
    town({ slug: 'salem-nh', name: 'Salem', last_compiled_at: daysAgo(5) }),
  ], NOW);
  assert.match(choice.why, /Salem/);
  assert.match(choice.why, /2 day/);
});

test('an empty list says so rather than throwing', () => {
  const choice = pickTownToRefresh([], NOW);
  assert.equal(choice.town, null);
  assert.equal(choice.reason, 'no-towns');
});

test('nulls in the list are ignored', () => {
  const choice = pickTownToRefresh([null, undefined, town({ last_compiled_at: null })], NOW);
  assert.equal(choice.town?.slug, 'a-town');
});

/* ── a town with no businesses is the worst state ────────────────────────── */

test('a never-compiled town beats one that is merely stale', () => {
  const choice = pickTownToRefresh([
    town({ slug: 'manchester-nh', name: 'Manchester', last_compiled_at: daysAgo(400) }),
    town({ slug: 'hudson-nh', name: 'Hudson', last_compiled_at: null }),
  ], NOW);
  assert.equal(choice.town?.slug, 'hudson-nh');
  assert.match(choice.why, /never been compiled/);
});

test('a never-compiled town runs even though nothing is "due"', () => {
  // It must not fall into the all-fresh branch: an empty town is not fresh.
  const choice = pickTownToRefresh([
    town({ slug: 'windham-nh', last_compiled_at: null }),
    town({ slug: 'salem-nh', last_compiled_at: daysAgo(0) }),
  ], NOW);
  assert.equal(choice.town?.slug, 'windham-nh');
});

test('an unparseable compile date counts as never compiled', () => {
  // The safe direction: treating a bad timestamp as recent would leave a town
  // never refreshed and nothing would say why.
  const choice = pickTownToRefresh([town({ last_compiled_at: 'not a date' })], NOW);
  assert.equal(choice.town?.slug, 'a-town');
  assert.match(choice.why, /never been compiled/);
});

/* ── oldest first ────────────────────────────────────────────────────────── */

test('the town compiled longest ago is chosen', () => {
  const choice = pickTownToRefresh([
    town({ slug: 'pelham-nh', last_compiled_at: daysAgo(9) }),
    town({ slug: 'manchester-nh', name: 'Manchester', last_compiled_at: daysAgo(30) }),
    town({ slug: 'salem-nh', last_compiled_at: daysAgo(12) }),
  ], NOW);
  assert.equal(choice.town?.slug, 'manchester-nh');
  assert.match(choice.why, /30 days ago/);
});

test('ties break on slug, so the choice is deterministic', () => {
  const same = daysAgo(20);
  const forwards = pickTownToRefresh([
    town({ slug: 'zeta', last_compiled_at: same }),
    town({ slug: 'alpha', last_compiled_at: same }),
  ], NOW);
  const backwards = pickTownToRefresh([
    town({ slug: 'alpha', last_compiled_at: same }),
    town({ slug: 'zeta', last_compiled_at: same }),
  ], NOW);
  assert.equal(forwards.town?.slug, 'alpha');
  assert.equal(backwards.town?.slug, 'alpha');
});

test('exactly at the window is due, not fresh', () => {
  const choice = pickTownToRefresh([
    town({ last_compiled_at: daysAgo(REFRESH_AFTER_DAYS) }),
  ], NOW);
  assert.equal(choice.town?.slug, 'a-town');
});

/* ── a town with nowhere to search ───────────────────────────────────────── */

test('a town with no centre is skipped rather than passed to the ingest', () => {
  // `ingestTerritory` throws "has no centre, so there is nowhere to search".
  // Choosing it would turn every tick into a recorded failure.
  const choice = pickTownToRefresh([
    town({ slug: 'nowhere', center_lat: null, center_lng: null, last_compiled_at: null }),
    town({ slug: 'salem-nh', last_compiled_at: daysAgo(40) }),
  ], NOW);
  assert.equal(choice.town?.slug, 'salem-nh');
});

test('all towns lacking a centre reports that, not "no towns"', () => {
  const choice = pickTownToRefresh([
    town({ slug: 'a', center_lat: null, center_lng: null }),
    town({ slug: 'b', center_lat: 1, center_lng: undefined }),
  ], NOW);
  assert.equal(choice.town, null);
  assert.equal(choice.reason, 'no-centre');
  assert.match(choice.why, /nowhere to search/);
});

test('a zero coordinate is a real coordinate', () => {
  // Null Island is not where Salem is, but `0` must not be mistaken for
  // "missing" — that is the classic falsy-coordinate bug.
  const choice = pickTownToRefresh([
    town({ slug: 'zeroes', center_lat: 0, center_lng: 0, last_compiled_at: null }),
  ], NOW);
  assert.equal(choice.town?.slug, 'zeroes');
});

test('coordinates arriving as strings are accepted', () => {
  // Postgres numerics come back as strings through PostgREST, which is how
  // `exchange_territory.center_lat` actually arrives.
  const choice = pickTownToRefresh([
    town({ slug: 'strings', center_lat: '42.765600', center_lng: '-71.439300', last_compiled_at: null }),
  ], NOW);
  assert.equal(choice.town?.slug, 'strings');
});

/* ── hidden towns are still refreshed, never promoted ────────────────────── */

test('a hidden town is chosen like any other', () => {
  // Compiling a hidden town is the documented flow — open it hidden, compile
  // it, show it. The clock fills it; whether it goes live stays Eric's call.
  const choice = pickTownToRefresh([
    town({ slug: 'hudson-nh', status: 'hidden', last_compiled_at: null }),
  ], NOW);
  assert.equal(choice.town?.slug, 'hudson-nh');
  assert.equal(choice.town?.status, 'hidden');
});

/* ── the sentence a person reads ─────────────────────────────────────────── */

test('never having run says so, rather than reading as a clean run', () => {
  assert.match(describeRun(null), /has never run/);
});

test('a failure leads with the failure', () => {
  const text = describeRun({ at: '', town: 'salem-nh', why: '', ok: false, error: 'Overpass 504' });
  assert.match(text, /failed: Overpass 504/);
});

test('a tick that did nothing reports why', () => {
  const text = describeRun({ at: '', town: null, why: 'Every town was refreshed recently.', ok: true });
  assert.match(text, /did nothing: Every town was refreshed recently/);
});

test('a hidden town is called out, because nothing it wrote is visible', () => {
  const text = describeRun({
    at: '', town: 'hudson-nh', why: '', ok: true,
    created: 412, filled: 3, categorised: 0, status: 'hidden',
  });
  assert.match(text, /412 new/);
  assert.match(text, /still hidden/);
});

test('a truncated fetch is reported as a short directory, not a success', () => {
  const text = describeRun({
    at: '', town: 'manchester-nh', why: '', ok: true,
    created: 10, truncated: ['shop', 'amenity'],
  });
  assert.match(text, /Overpass capped shop, amenity/);
  assert.match(text, /short by an unknown amount/);
});

test('an uncategorised count is only mentioned when there is one', () => {
  const clean = describeRun({ at: '', town: 't', why: '', ok: true, created: 1, uncategorised: 0 });
  assert.ok(!/no category/.test(clean));
  const dirty = describeRun({ at: '', town: 't', why: '', ok: true, created: 1, uncategorised: 7 });
  assert.match(dirty, /7 still with no category/);
});
