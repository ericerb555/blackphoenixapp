/**
 * The escalation ladder: when a caller gets slowed, when they get banned, and
 * — the half that actually matters — when they get forgiven.
 *
 * This module decides whether somebody can use the platform at all, from a
 * signal as thin as an IP address. Both mistakes are expensive and both are
 * silent. Banning too eagerly locks out an office behind one NAT and nobody
 * reports it, because the people affected just see a broken site and leave.
 * Banning too slowly makes the whole thing decorative.
 *
 * So every threshold is asserted at its boundary rather than somewhere
 * comfortably past it, and decay is tested as carefully as accumulation.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  freshReputation, record, decide, decayed, clientIp,
  WARN_SCORE, BAN_SCORE, BAN_MS, HALF_LIFE_MS, MAX_SCORE, BREADTH_PATHS,
  type Reputation,
} from '../supabase/functions/server/ipReputation.ts';

const T0 = 1_700_000_000_000;
const MIN = 60_000;

/** Fire `n` signals of one kind, each on its own path unless pinned. */
function hammer(n: number, signal: Parameters<typeof record>[1], opts: { at?: number; path?: string } = {}) {
  let rep: Reputation = freshReputation(opts.at ?? T0);
  let decision = decide(rep, opts.at ?? T0);
  for (let i = 0; i < n; i++) {
    const r = record(rep, signal, opts.path ?? `/p/${i}`, opts.at ?? T0);
    rep = r.next; decision = r.decision;
  }
  return { rep, decision };
}

/* ── the ordinary caller ─────────────────────────────────────────────────── */

test('a fresh caller is allowed and carries no score', () => {
  const rep = freshReputation(T0);
  const d = decide(rep, T0);
  assert.equal(d.action, 'allow');
  assert.equal(d.score, 0);
});

test('a few failed sign-ins do not throttle anybody', () => {
  // Someone mistyping a password three times is the single most common
  // reason to see 401s, and must cost them nothing.
  const { decision } = hammer(3, 'auth_refused', { path: '/auth/signin' });
  assert.equal(decision.action, 'allow');
});

/* ── escalation ──────────────────────────────────────────────────────────── */

test('sustained auth refusals escalate to throttle at the warn threshold', () => {
  const { decision } = hammer(WARN_SCORE, 'auth_refused', { path: '/auth/signin' });
  assert.equal(decision.action, 'throttle');
  assert.ok(decision.retryAfter > 0, 'a throttle must tell the caller when to come back');
});

test('and on to a ban once the ban threshold is reached', () => {
  const { decision } = hammer(BAN_SCORE, 'auth_refused', { path: '/auth/signin' });
  assert.equal(decision.action, 'ban');
});

test('the throttle band is real — one signal below the ban score is not a ban', () => {
  // The off-by-one that would make the throttle stage meaningless.
  const { decision } = hammer(BAN_SCORE - 1, 'auth_refused', { path: '/auth/signin' });
  assert.equal(decision.action, 'throttle');
});

test('token guessing bans far faster than password mistyping', () => {
  // The whole point of weighting by behaviour rather than counting requests:
  // nobody misses six 256-bit share tokens by accident.
  const tokens = hammer(6, 'bad_token', { path: '/quotes/by-token/x' });
  const logins = hammer(6, 'auth_refused', { path: '/auth/signin' });
  assert.equal(tokens.decision.action, 'ban');
  assert.equal(logins.decision.action, 'allow');
});

/* ── breadth, independent of volume ──────────────────────────────────────── */

test('touching many distinct paths is itself a signal', () => {
  // Each individual miss is cheap; the breadth is what gives away a scan.
  let rep = freshReputation(T0);
  let decision = decide(rep, T0);
  for (let i = 0; i < BREADTH_PATHS; i++) {
    const r = record(rep, 'not_found', `/scan/${i}`, T0);
    rep = r.next; decision = r.decision;
  }
  assert.ok(decision.score >= WARN_SCORE, `breadth should push past warn, got ${decision.score}`);
});

test('hitting the same path repeatedly does not trigger the breadth charge', () => {
  let rep = freshReputation(T0);
  for (let i = 0; i < BREADTH_PATHS; i++) rep = record(rep, 'not_found', '/same', T0).next;
  // Still scored for the misses, but not additionally for breadth.
  const viaBreadth = hammer(BREADTH_PATHS, 'not_found').decision.score;
  assert.ok(decide(rep, T0).score < viaBreadth, 'one repeated path should score below many distinct ones');
});

/* ── forgiveness, which is the half that protects real users ─────────────── */

test('score halves over one half-life of quiet', () => {
  const rep: Reputation = { ...freshReputation(T0), score: 20 };
  assert.ok(Math.abs(decayed(rep, T0 + HALF_LIFE_MS) - 10) < 0.001);
  assert.ok(Math.abs(decayed(rep, T0 + 2 * HALF_LIFE_MS) - 5) < 0.001);
});

test('a throttled caller who stops is allowed again later', () => {
  const { rep } = hammer(WARN_SCORE, 'auth_refused', { path: '/auth/signin' });
  assert.equal(decide(rep, T0).action, 'throttle');
  // Long enough for the score to fall back under the warn line.
  assert.equal(decide(rep, T0 + 4 * HALF_LIFE_MS).action, 'allow');
});

test('a ban expires on its own', () => {
  const { rep } = hammer(BAN_SCORE, 'auth_refused', { path: '/auth/signin' });
  assert.equal(decide(rep, T0).action, 'ban');
  assert.notEqual(decide(rep, T0 + BAN_MS + 4 * HALF_LIFE_MS).action, 'ban');
});

test('a ban is served for its full length even as the score decays beneath it', () => {
  // bannedUntil must win while it stands, or a ban silently lapses early.
  const { rep } = hammer(BAN_SCORE, 'auth_refused', { path: '/auth/signin' });
  const midway = decide(rep, T0 + BAN_MS / 2);
  assert.equal(midway.action, 'ban');
  assert.ok(midway.retryAfter > 0 && midway.retryAfter <= BAN_MS / 1000);
});

test('score is capped so a long attack cannot bank an unending ban', () => {
  const { rep } = hammer(500, 'bad_token');
  assert.ok(rep.score <= MAX_SCORE, `score ${rep.score} exceeded the cap ${MAX_SCORE}`);
  // And it still clears within a bounded amount of quiet.
  assert.notEqual(decide(rep, T0 + BAN_MS + 10 * HALF_LIFE_MS).action, 'ban');
});

test('slow and steady stays below the line', () => {
  // One refusal every half-life decays as fast as it accrues. A customer with
  // a flaky saved password must never grind their way to a ban.
  let rep = freshReputation(T0);
  for (let i = 0; i < 50; i++) {
    rep = record(rep, 'auth_refused', '/auth/signin', T0 + i * HALF_LIFE_MS).next;
  }
  assert.equal(decide(rep, T0 + 50 * HALF_LIFE_MS).action, 'allow');
});

/* ── address extraction, where the forgery risk lives ────────────────────── */

const hdr = (o: Record<string, string>) => ({ get: (n: string) => o[n.toLowerCase()] ?? null });

test('cf-connecting-ip wins, because Cloudflare sets it and strips the client copy', () => {
  assert.equal(clientIp(hdr({ 'cf-connecting-ip': '1.2.3.4', 'x-forwarded-for': '9.9.9.9' })), '1.2.3.4');
});

test('the RIGHTMOST x-forwarded-for entry is used, not the leftmost', () => {
  // The leftmost entry is whatever the client typed. Trusting it would let an
  // attacker wear a fresh address on every request and never accrue a score.
  assert.equal(clientIp(hdr({ 'x-forwarded-for': '6.6.6.6, 203.0.113.9' })), '203.0.113.9');
});

test('no usable header yields null, so everyone is not pooled into one bucket', () => {
  // Returning a constant here would ban every anonymous visitor at once the
  // first time any one of them probed.
  assert.equal(clientIp(hdr({})), null);
  assert.equal(clientIp(hdr({ 'x-forwarded-for': '   ' })), null);
});
