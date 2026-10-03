/**
 * The public rental-application link.
 *
 * Four properties are the point of this file, and all four are things that were
 * wrong before it existed:
 *
 *   - a link expires, so a token minted once does not accept applications for
 *     ever
 *   - a revoked link stays revoked, and in particular is NEVER renewed by the
 *     grandfather path, because turning a link off must not hand it ninety
 *     fresh days
 *   - a corrupt expiry fails closed rather than being treated as absent
 *   - a stranger holding the link cannot fill a landlord's record, and a
 *     landlord's own manual entries can never lock their own link out
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  screeningLinkState,
  screeningLinkExpiry,
  publicApplicationsSince,
  submissionRefusal,
  SCREENING_BURST_CAP,
  SCREENING_BURST_MS,
  SCREENING_DAILY_CAP,
  SCREENING_LINK_DAYS,
  SCREENING_DAY_MS,
} from '../supabase/functions/server/screeningLink.ts';

const NOW = Date.parse('2026-10-03T12:00:00.000Z');
const EMAIL = 'landlord@example.com';

/* ── what state a link is in ──────────────────────────────────────────────── */

test('no record at all is missing, not usable', () => {
  assert.equal(screeningLinkState(null, NOW), 'missing');
  assert.equal(screeningLinkState(undefined, NOW), 'missing');
  assert.equal(screeningLinkState({}, NOW), 'missing');
  // A record that lost its owner is not a link to somebody's applications.
  assert.equal(screeningLinkState({ landlordEmail: '', expiresAt: new Date(NOW + 1000).toISOString() }, NOW), 'missing');
});

test('a live link is ok and a lapsed one is expired', () => {
  const live = { landlordEmail: EMAIL, expiresAt: new Date(NOW + SCREENING_DAY_MS).toISOString() };
  const dead = { landlordEmail: EMAIL, expiresAt: new Date(NOW - 1).toISOString() };
  assert.equal(screeningLinkState(live, NOW), 'ok');
  assert.equal(screeningLinkState(dead, NOW), 'expired');
});

test('the expiry boundary is exclusive — a link is not live at its own instant', () => {
  const edge = { landlordEmail: EMAIL, expiresAt: new Date(NOW).toISOString() };
  assert.equal(screeningLinkState(edge, NOW), 'expired');
});

test('a token from before expiries existed is grandfathered, not expired', () => {
  // This is the shape the old code wrote: owner and creation date, nothing else.
  const legacy = { landlordEmail: EMAIL, createdAt: '2024-01-01T00:00:00.000Z' };
  assert.equal(screeningLinkState(legacy, NOW), 'grandfather');
});

test('a REVOKED link is never grandfathered, even with no expiry', () => {
  // The security property. Revocation is checked before the grandfather path,
  // so turning off an old link cannot renew it.
  const revokedLegacy = { landlordEmail: EMAIL, revokedAt: '2026-09-01T00:00:00.000Z' };
  assert.equal(screeningLinkState(revokedLegacy, NOW), 'revoked');
});

test('revocation outranks a still-valid expiry', () => {
  const revoked = {
    landlordEmail: EMAIL,
    expiresAt: new Date(NOW + 30 * SCREENING_DAY_MS).toISOString(),
    revokedAt: '2026-10-01T00:00:00.000Z',
  };
  assert.equal(screeningLinkState(revoked, NOW), 'revoked');
});

test('an unreadable expiry fails closed', () => {
  // Must not fall through to `grandfather`: that would renew a corrupt record
  // instead of refusing it.
  assert.equal(screeningLinkState({ landlordEmail: EMAIL, expiresAt: 'whenever' }, NOW), 'expired');
});

test('a freshly issued link lasts the advertised number of days', () => {
  const expiresAt = screeningLinkExpiry(NOW);
  assert.equal(Date.parse(expiresAt) - NOW, SCREENING_LINK_DAYS * SCREENING_DAY_MS);
  assert.equal(screeningLinkState({ landlordEmail: EMAIL, expiresAt }, NOW), 'ok');
  // And it is not still live a day after it lapses.
  assert.equal(
    screeningLinkState({ landlordEmail: EMAIL, expiresAt }, NOW + (SCREENING_LINK_DAYS + 1) * SCREENING_DAY_MS),
    'expired',
  );
});

/* ── how much a stranger may write ────────────────────────────────────────── */

const publicApp = (minutesAgo: number) => ({
  source: 'public',
  createdAt: new Date(NOW - minutesAgo * 60 * 1000).toISOString(),
});

test('only public submissions are counted', () => {
  const apps = [
    { source: 'landlord', createdAt: new Date(NOW - 60_000).toISOString() },
    publicApp(1),
  ];
  assert.equal(publicApplicationsSince(apps, SCREENING_BURST_MS, NOW), 1);
});

test("a landlord's own manual entries cannot lock their link out", () => {
  // Typing twenty applications in by hand is not abuse of your own link.
  const typedIn = Array.from({ length: SCREENING_DAILY_CAP + 10 }, () => ({
    source: 'landlord',
    createdAt: new Date(NOW - 60_000).toISOString(),
  }));
  assert.equal(submissionRefusal(typedIn, NOW), null);
});

test('records with no usable timestamp are not counted', () => {
  const apps = [
    { source: 'public', createdAt: null },
    { source: 'public', createdAt: 'sometime' },
    { source: 'public' },
  ];
  assert.equal(publicApplicationsSince(apps, SCREENING_DAY_MS, NOW), 0);
});

test('an empty or absent list allows a submission', () => {
  assert.equal(submissionRefusal([], NOW), null);
  assert.equal(submissionRefusal(null, NOW), null);
  assert.equal(submissionRefusal(undefined, NOW), null);
});

test('the burst cap refuses a script hammering the route', () => {
  const burst = Array.from({ length: SCREENING_BURST_CAP }, (_, i) => publicApp(i));
  assert.deepEqual(submissionRefusal(burst, NOW), { window: 'burst' });
  // One below the cap still goes through.
  assert.equal(submissionRefusal(burst.slice(1), NOW), null);
});

test('traffic that has aged out of the burst window is allowed again', () => {
  const old = Array.from({ length: SCREENING_BURST_CAP }, () => publicApp(SCREENING_BURST_MS / 60_000 + 1));
  assert.equal(submissionRefusal(old, NOW), null);
});

test('the daily cap catches a flood that paces itself under the burst cap', () => {
  // Spread across the day so no fifteen-minute window ever holds five.
  const paced = Array.from({ length: SCREENING_DAILY_CAP }, (_, i) => publicApp(i * 30 + 20));
  const verdict = submissionRefusal(paced, NOW);
  assert.deepEqual(verdict, { window: 'daily' });
});

test('yesterday does not count against today', () => {
  const yesterday = Array.from({ length: SCREENING_DAILY_CAP + 5 }, () => publicApp(SCREENING_DAY_MS / 60_000 + 60));
  assert.equal(submissionRefusal(yesterday, NOW), null);
});
