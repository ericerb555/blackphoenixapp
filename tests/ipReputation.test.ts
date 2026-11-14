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
  banDuration, banCount, nextBanLength, BAN_MAX_MS, BAN_FORGET_MS, BAN_ESCALATION,
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

/* ── the forwarded address, which is only believable with proof ──────────── */

test('x-client-ip is IGNORED without proof the request came through the Worker', () => {
  // The whole forgery risk in one assertion. The header is client-settable, so
  // believing it unconditionally would let anybody pick their own identity and
  // shed a bad score on demand — worse than the pooling it exists to fix.
  assert.equal(
    clientIp(hdr({ 'x-client-ip': '6.6.6.6', 'cf-connecting-ip': '1.2.3.4' })),
    '1.2.3.4',
  );
});

test('x-client-ip wins once X-Edge-Auth has proved the Worker forwarded it', () => {
  // MEASURED 2026-11-11: Supabase's own Cloudflare rewrites cf-connecting-ip to
  // the Worker's address, so without this every visitor behind the firewall
  // shares one reputation record and one prober bans them all.
  assert.equal(
    clientIp(hdr({ 'x-client-ip': '70.109.187.2', 'cf-connecting-ip': '2a06:98c0:3600::103' }), true),
    '70.109.187.2',
  );
});

test('proof alone does not invent an address when the Worker forwarded none', () => {
  // Falls back rather than returning null: a request that reached us through
  // the Worker is still a request, and cf-connecting-ip is the best left.
  assert.equal(clientIp(hdr({ 'cf-connecting-ip': '1.2.3.4' }), true), '1.2.3.4');
  assert.equal(clientIp(hdr({ 'x-client-ip': '  ' }), true), null);
});

/* ── escalating bans ─────────────────────────────────────────────────────── */

/**
 * Eric: "ban repeat offenders for escalating durations."
 *
 * A flat fifteen minutes is the right price for a first offence and far too
 * cheap for the sixth. But the reason the ban was short in the first place
 * has not gone away — addresses are not identities, and an office or a CGNAT
 * range is shared — so escalation only ever punishes coming BACK, and it is
 * forgiven after a day of quiet.
 */

test('the first ban is the short one', () => {
  assert.equal(banDuration(1), BAN_MS);
});

test('each further ban doubles', () => {
  assert.equal(banDuration(2), BAN_MS * 2);
  assert.equal(banDuration(3), BAN_MS * 4);
  assert.equal(banDuration(4), BAN_MS * 8);
});

test('escalation stops at the cap, and stays there', () => {
  assert.equal(banDuration(99), BAN_MAX_MS);
  assert.equal(banDuration(5000), BAN_MAX_MS, 'no overflow to Infinity');
  assert.ok(Number.isFinite(banDuration(Number.MAX_SAFE_INTEGER)));
});

test('a nonsense count is treated as a first offence, never as no ban', () => {
  for (const n of [0, -3, Number.NaN, 0.4]) {
    assert.equal(banDuration(n as number), BAN_MS, String(n));
  }
});

test('a second offence after the first ban expires is longer', () => {
  const first = hammer(BAN_SCORE, 'auth_refused').rep;
  assert.equal(first.bans, 1);
  assert.equal(first.bannedUntil - T0, BAN_MS);

  // Long enough after that the ban has expired and the score has decayed,
  // but well inside the forget window.
  const later = T0 + BAN_MS + 60 * MIN;
  let rep: Reputation = { ...first };
  for (let i = 0; i < BAN_SCORE; i++) {
    rep = record(rep, 'auth_refused', `/again/${i}`, later).next;
  }
  assert.equal(rep.bans, 2, 'the second ban is counted');
  assert.equal(rep.bannedUntil - later, BAN_MS * 2, 'and is twice as long');
});

/**
 * THE ONE THAT KEEPS THIS HONEST. An address serving a ban goes on making
 * requests — that is what being banned looks like from in here. If each of
 * those re-counted, one run would reach the four-hour cap in seconds and the
 * ladder would be measuring request volume, which the score already does.
 */
test('hammering DURING a ban does not escalate it', () => {
  const banned = hammer(BAN_SCORE, 'auth_refused').rep;
  assert.equal(banned.bans, 1);

  let rep: Reputation = banned;
  for (let i = 0; i < 200; i++) {
    rep = record(rep, 'auth_refused', `/during/${i}`, T0 + 1000 + i).next;
  }
  assert.equal(rep.bans, 1, 'still one ban');
  assert.equal(rep.bannedUntil, banned.bannedUntil, 'and it did not get longer');
});

test('a day of quiet forgives the count, so a shared address is not punished forever', () => {
  const first = hammer(BAN_SCORE, 'auth_refused').rep;
  const muchLater = T0 + BAN_FORGET_MS + MIN;
  assert.equal(banCount(first, muchLater), 0);
  assert.equal(nextBanLength(first, muchLater), BAN_MS, 'back to a first offence');

  // And still counted inside the window.
  assert.equal(banCount(first, T0 + BAN_FORGET_MS - MIN), 1);
});

test('Retry-After matches the ban that is about to be imposed', () => {
  // A record one ban in, out of its ban and decayed, about to earn another.
  const first = hammer(BAN_SCORE, 'auth_refused').rep;
  const later = T0 + BAN_MS + 60 * MIN;
  const atThreshold: Reputation = { ...first, score: BAN_SCORE, updatedAt: later };

  const said = decide(atThreshold, later);
  assert.equal(said.action, 'ban');
  const imposed = record(atThreshold, 'auth_refused', '/x', later).next;
  assert.equal(
    said.retryAfter, Math.ceil((imposed.bannedUntil - later) / 1000),
    'the header and the ban must not be able to disagree',
  );
});

test('a record written before escalation existed still works', () => {
  // No `bans`, no `lastBanAt` — every record in the store at deploy time.
  const legacy = { score: 0, updatedAt: T0, bannedUntil: 0, paths: [], windowAt: T0 } as Reputation;
  assert.equal(banCount(legacy, T0), 0);
  let rep = legacy;
  for (let i = 0; i < BAN_SCORE; i++) rep = record(rep, 'auth_refused', `/p/${i}`, T0).next;
  assert.equal(rep.bans, 1, 'it starts counting from now');
  assert.equal(rep.bannedUntil - T0, BAN_MS);
});

test('the ladder a determined attacker actually walks', () => {
  const lengths: number[] = [];
  let rep: Reputation = freshReputation(T0);
  let at = T0;
  for (let round = 0; round < 6; round++) {
    for (let i = 0; i < BAN_SCORE; i++) rep = record(rep, 'auth_refused', `/r${round}/${i}`, at).next;
    lengths.push(rep.bannedUntil - at);
    // Wait out the ban, then come straight back.
    at = rep.bannedUntil + MIN;
  }
  assert.deepEqual(lengths, [
    BAN_MS, BAN_MS * 2, BAN_MS * 4, BAN_MS * 8, BAN_MAX_MS, BAN_MAX_MS,
  ]);
  assert.equal(BAN_ESCALATION, 2, 'the ladder is a doubling');
});
