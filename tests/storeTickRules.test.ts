/**
 * The store's clock, where being wrong is expensive and silent.
 *
 * Three failure modes are asserted here because none of them would announce
 * itself: a secret check that accepts what it should refuse, a settings reader
 * that turns a half-written record into an armed job that spends money, and a
 * staleness judgement that reports a dead scheduler as healthy.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normaliseSettings, secretMatches, leaseIsHeld, clockHealth, disabledJobs,
  DEFAULT_SETTINGS, STALE_AFTER_MINUTES, MAX_ORDERS_CEILING, MAX_SPEND_CEILING,
} from '../supabase/functions/server/storeTickRules.ts';

const NOW = new Date('2026-10-03T12:00:00.000Z');
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();

// ── The secret ──────────────────────────────────────────────────────────────

test('an unset secret refuses everything, including an empty offer', () => {
  assert.equal(secretMatches('', ''), false);
  assert.equal(secretMatches('anything', ''), false);
  assert.equal(secretMatches('', 'the-real-secret'), false);
});

test('only the exact secret matches', () => {
  const secret = 'Zm9vYmFyYmF6cXV1eA==';
  assert.equal(secretMatches(secret, secret), true);
  assert.equal(secretMatches(secret.toLowerCase(), secret), false);
  assert.equal(secretMatches(secret + 'x', secret), false);
  assert.equal(secretMatches(secret.slice(0, -1), secret), false);
});

test('a correct prefix is not enough', () => {
  // The whole point of the constant-time compare: a caller who has guessed the
  // first twenty bytes is no closer than one who has guessed none.
  const secret = 'abcdefghijklmnopqrstuvwxyz';
  assert.equal(secretMatches('abcdefghijklmnopqrst', secret), false);
  assert.equal(secretMatches('a', secret), false);
});

test('multi-byte characters compare by bytes, not by code units', () => {
  assert.equal(secretMatches('secret-é', 'secret-é'), true);
  assert.equal(secretMatches('secret-e', 'secret-é'), false);
});

// ── Settings ────────────────────────────────────────────────────────────────

test('nothing stored means the heartbeat only', () => {
  const s = normaliseSettings(undefined);
  assert.deepEqual(s.jobs, { heartbeat: true });
  assert.equal(s.maxOrdersPerTick, DEFAULT_SETTINGS.maxOrdersPerTick);
  assert.equal(s.maxSpendPerTick, DEFAULT_SETTINGS.maxSpendPerTick);
});

test('a job absent from the record is off, never on', () => {
  const s = normaliseSettings({ jobs: { heartbeat: true } });
  assert.equal(s.jobs.fulfil, undefined);
  assert.notEqual(s.jobs.fulfil, true);
});

test('only true enables a job — a half-written record cannot spend money', () => {
  // This is the one that matters. A stored "yes", 1, or "true" must not place
  // supplier orders, because none of them is a deliberate switch-on.
  for (const truthy of ['yes', 1, 'true', {}, [], 'on']) {
    const s = normaliseSettings({ jobs: { fulfil: truthy } });
    assert.equal(s.jobs.fulfil, false, `${JSON.stringify(truthy)} must not enable a job`);
  }
  assert.equal(normaliseSettings({ jobs: { fulfil: true } }).jobs.fulfil, true);
});

test('the heartbeat cannot be switched off, however the record says so', () => {
  assert.equal(normaliseSettings({ jobs: { heartbeat: false } }).jobs.heartbeat, true);
  assert.equal(normaliseSettings({ jobs: {} }).jobs.heartbeat, true);
  assert.equal(normaliseSettings({ jobs: null }).jobs.heartbeat, true);
  assert.equal(normaliseSettings('nonsense').jobs.heartbeat, true);
});

test('ceilings outside their range fall back to the default rather than through', () => {
  assert.equal(normaliseSettings({ maxOrdersPerTick: 0 }).maxOrdersPerTick, DEFAULT_SETTINGS.maxOrdersPerTick);
  assert.equal(normaliseSettings({ maxOrdersPerTick: -5 }).maxOrdersPerTick, DEFAULT_SETTINGS.maxOrdersPerTick);
  assert.equal(normaliseSettings({ maxOrdersPerTick: MAX_ORDERS_CEILING + 1 }).maxOrdersPerTick, DEFAULT_SETTINGS.maxOrdersPerTick);
  assert.equal(normaliseSettings({ maxSpendPerTick: MAX_SPEND_CEILING + 1 }).maxSpendPerTick, DEFAULT_SETTINGS.maxSpendPerTick);
  assert.equal(normaliseSettings({ maxSpendPerTick: 'lots' }).maxSpendPerTick, DEFAULT_SETTINGS.maxSpendPerTick);
  // And a sane value is kept.
  assert.equal(normaliseSettings({ maxOrdersPerTick: 40 }).maxOrdersPerTick, 40);
  assert.equal(normaliseSettings({ maxOrdersPerTick: 40.9 }).maxOrdersPerTick, 40);
});

// ── The lease ───────────────────────────────────────────────────────────────

test('no lease, a released lease and a malformed lease all mean "go"', () => {
  assert.equal(leaseIsHeld(null, NOW), false);
  assert.equal(leaseIsHeld({}, NOW), false);
  assert.equal(leaseIsHeld({ until: new Date(0).toISOString() }, NOW), false);
  assert.equal(leaseIsHeld({ until: 'not a date' }, NOW), false);
});

test('a lease in the future holds, one in the past does not', () => {
  assert.equal(leaseIsHeld({ until: minutesAgo(-5) }, NOW), true);
  assert.equal(leaseIsHeld({ until: minutesAgo(1) }, NOW), false);
});

// ── Health ──────────────────────────────────────────────────────────────────

test('never run is told apart from stopped', () => {
  // Different answers on purpose: "never-run" points at the schedule or the
  // 401 auth-gate trap, "stale" points at something that ran and then stopped.
  assert.equal(clockHealth(null, NOW), 'never-run');
  assert.equal(clockHealth(undefined, NOW), 'never-run');
  assert.equal(clockHealth('', NOW), 'never-run');
  assert.equal(clockHealth('rubbish', NOW), 'never-run');
});

test('a clock that ran recently is healthy, and one that stopped is stale', () => {
  assert.equal(clockHealth(minutesAgo(5), NOW), 'healthy');
  assert.equal(clockHealth(minutesAgo(STALE_AFTER_MINUTES - 1), NOW), 'healthy');
  assert.equal(clockHealth(minutesAgo(STALE_AFTER_MINUTES + 1), NOW), 'stale');
  assert.equal(clockHealth(minutesAgo(60 * 24), NOW), 'stale');
});

test('a fifteen-minute schedule is comfortably inside the stale threshold', () => {
  // Otherwise a healthy clock would report itself broken between ticks.
  assert.ok(STALE_AFTER_MINUTES > 15 * 2, 'two missed ticks should not read as stale');
});

// ── Reporting ───────────────────────────────────────────────────────────────

test('the heartbeat reports which jobs are registered and off', () => {
  const settings = normaliseSettings({ jobs: { heartbeat: true, fulfil: true } });
  const off = disabledJobs(['heartbeat', 'fulfil', 'track', 'catalogue'], settings);
  assert.deepEqual(off, ['track', 'catalogue']);
  assert.equal(disabledJobs(['heartbeat'], settings).length, 0);
});
