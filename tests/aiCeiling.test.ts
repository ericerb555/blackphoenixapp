/**
 * How much model work an account is allowed.
 *
 * This decides what a paying customer can actually use, so the precedence is
 * the whole of it: an override set for one account, then whatever their tier
 * publishes, then the built-in backstop.
 *
 * The two rules easiest to get wrong in a way nobody notices are here:
 *
 *   - zero on a tier means UNLIMITED, the same convention the tier editor and
 *     every other limit on the platform already use. Read as "none allowed" it
 *     would lock the most expensive plan out of the feature it pays for.
 *   - a tier that says nothing falls through to the backstop rather than to
 *     unlimited. Silence is not a promise.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickCeiling, TIER_LIMIT_KEY } from '../supabase/functions/server/aiCeiling.ts';

const FALLBACK = 300;

/* ── precedence ──────────────────────────────────────────────────────────── */

test('an account override beats everything', () => {
  const r = pickCeiling({ override: 5000, tierLimit: 100, tierName: 'Listed', fallback: FALLBACK });
  assert.equal(r.limit, 5000);
  assert.equal(r.source, 'account override');
});

test('a tier beats the backstop', () => {
  const r = pickCeiling({ tierLimit: 1200, tierName: 'Preferred', fallback: FALLBACK });
  assert.equal(r.limit, 1200);
  assert.equal(r.source, 'Preferred');
});

test('nothing set falls back', () => {
  const r = pickCeiling({ fallback: FALLBACK });
  assert.equal(r.limit, FALLBACK);
  assert.equal(r.source, 'default');
});

/* ── zero means unlimited ────────────────────────────────────────────────── */

test('a tier publishing zero is unlimited, not zero allowed', () => {
  const r = pickCeiling({ tierLimit: 0, tierName: 'Preferred', fallback: FALLBACK });
  assert.equal(r.limit, Number.POSITIVE_INFINITY,
    'read as "none allowed" this would lock the dearest plan out of what it pays for');
  assert.ok(r.source.includes('unlimited'));
});

test('an unlimited tier still names itself, so a log says which plan', () => {
  assert.equal(pickCeiling({ tierLimit: 0, tierName: 'Stocked', fallback: FALLBACK }).source,
    'Stocked (unlimited)');
});

/* ── silence is not a promise ────────────────────────────────────────────── */

test('a tier that says nothing about model work gets the backstop', () => {
  const r = pickCeiling({ tierLimit: undefined, tierName: 'Listed', fallback: FALLBACK });
  assert.equal(r.limit, FALLBACK,
    'a tier with no opinion must not be read as an unlimited one');
  assert.equal(r.source, 'default');
});

test('an explicit null is the same as saying nothing', () => {
  assert.equal(pickCeiling({ tierLimit: null, fallback: FALLBACK }).limit, FALLBACK);
});

/* ── rubbish falls back rather than refusing ─────────────────────────────── */

test('an unreadable tier value falls back rather than locking somebody out', () => {
  const r = pickCeiling({ tierLimit: Number.NaN, tierName: 'Listed', fallback: FALLBACK });
  assert.equal(r.limit, FALLBACK);
  assert.ok(r.source.includes('unreadable'));
});

test('a negative ceiling is not honoured', () => {
  assert.equal(pickCeiling({ tierLimit: -5, fallback: FALLBACK }).limit, FALLBACK,
    'a negative allowance would refuse everybody on that plan');
});

test('an override of zero is not an override', () => {
  const r = pickCeiling({ override: 0, tierLimit: 900, tierName: 'Preferred', fallback: FALLBACK });
  assert.equal(r.limit, 900,
    'zero in the override slot means unset, so the tier still decides');
});

test('a negative override is ignored', () => {
  assert.equal(pickCeiling({ override: -100, tierLimit: 900, tierName: 'X', fallback: FALLBACK }).limit, 900);
});

/* ── the keys a tier is read for ─────────────────────────────────────────── */

test('each bucket reads a limit named like the others a tier publishes', () => {
  assert.equal(TIER_LIMIT_KEY.ai, 'aiCallsPerMonth');
  assert.equal(TIER_LIMIT_KEY.render, 'rendersPerMonth');
  assert.equal(TIER_LIMIT_KEY.blueprint, 'blueprintsPerMonth');
});

