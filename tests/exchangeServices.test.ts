/**
 * The list the whole routing model forks on.
 *
 * Eric: "if some is looking for services i offer then the requests will come
 * through me first… if its not on the list for things i do then it will just
 * go to the exchange for bids."
 *
 * Two properties are worth more than the rest and are asserted first:
 *
 *   NOTHING CHANGES UNTIL A BOX IS TICKED. An unconfigured list behaves
 *   exactly as the system behaves today, so this can ship before any decision
 *   has been made.
 *
 *   TICKING NOTHING IS A DECISION. "Somebody went to the screen and claimed
 *   none of it" must not be read as "nobody has been", or the fallback
 *   silently overrules the person who went.
 *
 * Those two pull in opposite directions and the gap between them is where a
 * system quietly starts routing work nobody asked it to route.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  weOffer, routeFor, claimedSlugs, isConfigured, releasesAt, hasReleased,
  FIRST_REFUSAL_HOURS,
} from '../supabase/functions/server/exchangeServices.ts';

const ROOFING = { slug: 'roofing', isConstruction: true };
const RESTAURANTS = { slug: 'restaurants', isConstruction: false };
/** Under the `services` section — real work, never flagged construction. */
const CLEANING = { slug: 'cleaning', isConstruction: false };

/* ── before anybody has decided ──────────────────────────────────────────── */

test('with no list saved, the construction flag still decides — today unchanged', () => {
  assert.equal(weOffer(ROOFING, null), true);
  assert.equal(weOffer(RESTAURANTS, null), false);
  assert.equal(weOffer(CLEANING, null), false);
});

test('an empty record is the same as none', () => {
  assert.equal(isConfigured({}), false);
  assert.equal(isConfigured({ slugs: [] }), false);
  assert.equal(weOffer(ROOFING, { slugs: [] }), true, 'still the flag');
});

test('the fallback says so, so nobody mistakes it for a decision', () => {
  const d = routeFor(ROOFING, null);
  assert.equal(d.route, 'first-refusal');
  assert.equal(d.fromList, false);
  assert.match(d.reason, /Tick the categories/);
});

/* ── once somebody has ──────────────────────────────────────────────────── */

const SAVED = { configured: true, slugs: ['roofing', 'cleaning'] };

test('the saved list is the authority, and it can ADD what the flag missed', () => {
  // Cleaning is under `services` and flagged as nothing. The flag said no; the
  // list says yes, and the list wins.
  assert.equal(weOffer(CLEANING, SAVED), true);
});

test('and it can REMOVE what the flag claimed', () => {
  // Every construction category was "ours" by default. A builder who does not
  // do roofing must be able to say so.
  const noRoofing = { configured: true, slugs: ['cleaning'] };
  assert.equal(weOffer(ROOFING, noRoofing), false);
  assert.equal(routeFor(ROOFING, noRoofing).route, 'open-exchange');
});

test('ticking NOTHING is a decision, not an absence', () => {
  // The property that stops the fallback overruling the person who went to
  // the screen and claimed none of it.
  const claimsNothing = { configured: true, slugs: [] };
  assert.equal(isConfigured(claimsNothing), true);
  assert.equal(weOffer(ROOFING, claimsNothing), false, 'the flag must not come back');
  assert.equal(routeFor(ROOFING, claimsNothing).route, 'open-exchange');
});

test('a list written without the flag is still a list', () => {
  // An older or third-party writer that stored slugs and no boolean.
  assert.equal(isConfigured({ slugs: ['roofing'] }), true);
  assert.equal(weOffer(CLEANING, { slugs: ['roofing'] }), false);
});

/* ── the slugs themselves ────────────────────────────────────────────────── */

test('slugs are normalised, so a stray capital or space cannot lose a claim', () => {
  const messy = { configured: true, slugs: ['  Roofing  ', 'ROOFING', 'cleaning', '', null, 42] };
  const set = claimedSlugs(messy);
  assert.deepEqual([...set].sort(), ['42', 'cleaning', 'roofing']);
  assert.equal(weOffer(ROOFING, messy), true);
});

test('a category with no slug is never ours', () => {
  assert.equal(weOffer({ slug: '' }, SAVED), false);
  assert.equal(weOffer(null, SAVED), false);
  assert.equal(weOffer(undefined, null), false);
});

/* ── the fork ────────────────────────────────────────────────────────────── */

test('on the list is held for a day; off it goes straight out', () => {
  const ours = routeFor(ROOFING, SAVED);
  assert.equal(ours.route, 'first-refusal');
  assert.equal(ours.holdHours, 24);
  assert.equal(ours.fromList, true);

  const theirs = routeFor(RESTAURANTS, SAVED);
  assert.equal(theirs.route, 'open-exchange');
  assert.equal(theirs.holdHours, 0, 'work we do not do is not held for a day');
});

test('every decision carries a sentence a person can read', () => {
  for (const record of [null, SAVED, { configured: true, slugs: [] }]) {
    for (const category of [ROOFING, RESTAURANTS, CLEANING]) {
      const d = routeFor(category, record);
      assert.ok(d.reason.length > 20, 'a reason, not a code');
      assert.ok(['first-refusal', 'open-exchange'].includes(d.route));
    }
  }
});

/* ── the timer, which is the part that protects the customer ─────────────── */

test('a held request has a deadline, not a countdown', () => {
  const held = '2026-11-13T09:00:00.000Z';
  assert.equal(releasesAt(held), '2026-11-14T09:00:00.000Z');
  assert.equal(FIRST_REFUSAL_HOURS, 24);
});

test('the deadline is honoured to the second, and before it nothing opens', () => {
  const due = '2026-11-14T09:00:00.000Z';
  assert.equal(hasReleased(due, new Date('2026-11-14T08:59:59.000Z')), false);
  assert.equal(hasReleased(due, new Date('2026-11-14T09:00:00.000Z')), true);
  assert.equal(hasReleased(due, new Date('2026-11-15T00:00:00.000Z')), true);
});

test('an unreadable deadline does not release a job by accident', () => {
  // Wrong in the direction that keeps the job where somebody put it, rather
  // than broadcasting a customer's work because a date failed to parse.
  assert.equal(hasReleased('not a date', new Date()), false);
  assert.equal(hasReleased('', new Date()), false);
});

test('a bad held-from falls back to now rather than 1970', () => {
  const out = releasesAt('nonsense');
  const hoursAway = (new Date(out).getTime() - Date.now()) / 3600_000;
  assert.ok(hoursAway > 23.9 && hoursAway < 24.1, `expected ~24h, got ${hoursAway}`);
});
