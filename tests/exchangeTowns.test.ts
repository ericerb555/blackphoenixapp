/**
 * Which town somebody is in, decided in their own browser.
 *
 * The whole reason this is arithmetic against a three-row list rather than a
 * lookup is the standing rule that a coordinate never leaves the browser. A
 * geocoding service would answer the same question better and would send
 * somebody's position to a stranger to do it, so this is the trade: a cruder
 * answer, kept local.
 *
 * The test that matters most is the last one — that a fix from somewhere the
 * Exchange does not cover returns nothing rather than the least distant of
 * three wrong answers.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nearestTown, TOWN_NEAR_ENOUGH_MILES,
} from '../src/app/lib/exchangeGeo.ts';

/** The real centres, as `/exchange/territories` serves them. */
const TOWNS = [
  { slug: 'manchester-nh', name: 'Manchester', center: { lat: 42.9956, lng: -71.4548 } },
  { slug: 'pelham-nh', name: 'Pelham', center: { lat: 42.7362, lng: -71.3273 } },
  { slug: 'salem-nh', name: 'Salem', center: { lat: 42.7884, lng: -71.2009 } },
];

test('standing in a town picks that town', () => {
  const near = nearestTown({ lat: 42.9956, lng: -71.4548 }, TOWNS);
  assert.equal(near?.town.slug, 'manchester-nh');
  assert.ok((near?.miles ?? 99) < 1);
});

test('between two towns picks the closer one', () => {
  // Just north of Pelham, still much nearer it than Manchester.
  const near = nearestTown({ lat: 42.78, lng: -71.33 }, TOWNS);
  assert.equal(near?.town.slug, 'pelham-nh');
});

test('Nashua is near enough to be given a town', () => {
  // Nashua is not covered, but it is a few miles from Pelham and somebody
  // there is genuinely well served by Pelham's listings.
  const near = nearestTown({ lat: 42.7654, lng: -71.4676 }, TOWNS);
  assert.equal(near?.town.slug, 'pelham-nh');
  assert.ok((near?.miles ?? 99) < TOWN_NEAR_ENOUGH_MILES);
});

test('somewhere the Exchange does not cover gets no town at all', () => {
  /*
   * Hartford, Connecticut — about 90 miles away. Snapping that to Pelham and
   * calling it "near you" is a lie told by a helpful feature, and it is the
   * failure this whole distance cap exists to prevent. All towns is the honest
   * answer, and they can still pick one.
   */
  assert.equal(nearestTown({ lat: 41.7658, lng: -72.6734 }, TOWNS), null);
});

test('the far side of the cap is excluded, the near side included', () => {
  const towns = [{ slug: 'x-nh', name: 'X', center: { lat: 43, lng: -71 } }];
  // Roughly a degree of latitude is 69 miles, so a tenth is about 7.
  assert.ok(nearestTown({ lat: 43.1, lng: -71 }, towns, 10));
  assert.equal(nearestTown({ lat: 43.1, lng: -71 }, towns, 5), null);
});

test('no position is not a town', () => {
  assert.equal(nearestTown(null, TOWNS), null);
  assert.equal(nearestTown(undefined, TOWNS), null);
});

test('a town with no centre is skipped, not treated as the equator', () => {
  /*
   * The offline fallback list carries no centres. Measuring against a missing
   * centre would read as lat 0, lng 0 off the coast of Africa, and whichever
   * town happened to be listed first would win every time.
   */
  const noCentres = [{ slug: 'pelham-nh' }, { slug: 'salem-nh' }];
  assert.equal(nearestTown({ lat: 42.9956, lng: -71.4548 }, noCentres), null);

  const mixed = [{ slug: 'nowhere-nh', name: 'Nowhere' }, ...TOWNS];
  assert.equal(nearestTown({ lat: 42.9956, lng: -71.4548 }, mixed)?.town.slug, 'manchester-nh');
});

test('an empty list cannot produce a town', () => {
  assert.equal(nearestTown({ lat: 42.9956, lng: -71.4548 }, []), null);
});

test('the slug a GPS pick produces is one the switcher knows', () => {
  // It becomes `territory=` on a query the server validates against
  // `exchange_territory`, so an invented slug would be a silent empty result.
  const near = nearestTown({ lat: 42.7362, lng: -71.3273 }, TOWNS);
  assert.ok(TOWNS.some((t) => t.slug === near?.town.slug));
  assert.equal(near?.town.name, 'Pelham');
});
