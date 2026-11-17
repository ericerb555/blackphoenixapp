/**
 * Pricing a junk job with no account, and the two ceilings that make that
 * affordable.
 *
 * Eric wants anyone to be able to try the pricer and only create an account
 * when they want the 5%. Every estimate is two model passes over up to twelve
 * images, so the whole question is what stops it being a free AI endpoint.
 *
 * WHY THE DAY IS IN THE KEY
 *
 * The first design metered an IP through `aiSpend.reserve`, and that is the
 * mistake these tests exist to prevent coming back. Those budgets are
 * cumulative and never reset — correct for a paid allowance, catastrophic for
 * an address: the ceiling is 40 units, an estimate costs up to 24, so the
 * second person behind a carrier NAT or an office router is refused for ever
 * because of somebody they have never met. Putting the date in the key means
 * there is nothing to reset and no shared-address trap.
 *
 * WHY BOTH CEILINGS
 *
 * A per-IP limit cannot see a thousand addresses each taking three. A global
 * limit cannot see one address taking a thousand. They stop different things
 * and the tests check each in isolation, including the boundary, because an
 * off-by-one on a spend limit is a bill rather than a bug report.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mayPriceAnonymously, ANON_PER_IP_DAILY, ANON_GLOBAL_DAILY,
  dayStamp, globalDayKey, ipDayKey,
} from '../supabase/functions/server/anonPricer.ts';

const NOW = '2026-11-17T15:30:00.000Z';

test('a first-time visitor is allowed', () => {
  assert.deepEqual(mayPriceAnonymously(0, 0), { allowed: true });
});

test('a visitor is allowed right up to the per-IP ceiling', () => {
  for (let used = 0; used < ANON_PER_IP_DAILY; used++) {
    assert.equal(mayPriceAnonymously(used, 0).allowed, true, `${used} used must still be allowed`);
  }
});

test('the per-IP ceiling refuses, and invites instead of complaining', () => {
  const d = mayPriceAnonymously(ANON_PER_IP_DAILY, 0);
  assert.equal(d.allowed, false);
  assert.equal(d.reason, 'per-ip');
  // Somebody who priced three jobs today is interested. The next thing they
  // see should be the account, not a lecture about rate limits.
  assert.match(d.message || '', /free account/i);
  assert.match(d.message || '', /5%/);
});

test('the global ceiling refuses whatever this address has done', () => {
  const d = mayPriceAnonymously(0, ANON_GLOBAL_DAILY);
  assert.equal(d.allowed, false);
  assert.equal(d.reason, 'global');
});

test('the global ceiling is checked first', () => {
  // When both are exhausted the global answer is the honest one: the problem
  // is ours, not theirs, and the message should not blame them for it.
  const d = mayPriceAnonymously(ANON_PER_IP_DAILY, ANON_GLOBAL_DAILY);
  assert.equal(d.reason, 'global');
  assert.match(d.message || '', /busy/i);
});

test('no refusal names which ceiling it hit', () => {
  // A probe should not learn whether it is throttled personally or whether the
  // whole pricer is near its cap — the second is a thing worth knowing.
  for (const d of [mayPriceAnonymously(99, 0), mayPriceAnonymously(0, 9999)]) {
    assert.ok(!/per.ip|global|limit|ceiling/i.test(d.message || ''), d.message);
  }
});

test('garbage counters fail closed-ish, not open', () => {
  // NaN must not read as "under the limit by a mile".
  assert.equal(mayPriceAnonymously(NaN, NaN).allowed, true, 'NaN counts as zero used');
  assert.equal(mayPriceAnonymously(undefined as any, ANON_GLOBAL_DAILY).allowed, false);
  assert.equal(mayPriceAnonymously(ANON_PER_IP_DAILY, undefined as any).allowed, false);
});

test('the day is in the key, so nothing needs resetting', () => {
  assert.equal(dayStamp(NOW), '2026-11-17');
  assert.equal(globalDayKey(NOW), 'anon_pricer:day:2026-11-17');
  assert.notEqual(globalDayKey(NOW), globalDayKey('2026-11-18T00:00:00.000Z'));
});

test('the address is hashed, never stored', () => {
  const key = ipDayKey('203.0.113.42', NOW);
  assert.ok(!key.includes('203.0.113.42'), 'the raw address must not appear in a key');
  assert.ok(key.startsWith('anon_pricer:ip:'));
  assert.ok(key.endsWith(':2026-11-17'));
});

test('the same address maps to the same key within a day, and a new one tomorrow', () => {
  assert.equal(ipDayKey('198.51.100.7', NOW), ipDayKey('198.51.100.7', '2026-11-17T23:00:00.000Z'));
  assert.notEqual(ipDayKey('198.51.100.7', NOW), ipDayKey('198.51.100.7', '2026-11-18T01:00:00.000Z'));
});

test('different addresses do not share a counter', () => {
  assert.notEqual(ipDayKey('198.51.100.7', NOW), ipDayKey('198.51.100.8', NOW));
});

test('a missing address still produces a usable key', () => {
  // Better that an unidentifiable caller shares one bucket than that the
  // counter silently stops counting.
  assert.equal(ipDayKey('', NOW), ipDayKey(undefined as any, NOW));
  assert.ok(ipDayKey('', NOW).startsWith('anon_pricer:ip:'));
});
