/**
 * Behavioural IP reputation: throttle, then ban, on what a caller DOES.
 *
 * WHY THIS EXISTS ALONGSIDE A WAF RATHER THAN INSTEAD OF ONE
 *
 * Cloudflare is better than this at everything volumetric — floods, scrapers,
 * known-bad signatures, bot scores — and it does that work before the request
 * costs us anything. That layer belongs there and docs/security/waf.md says so.
 *
 * What a firewall cannot see is meaning. To Cloudflare, forty requests to
 * `/quotes/by-token/<40 different tokens>` are forty ordinary GETs at a
 * harmless rate, each returning a perfectly normal response. To us they are
 * somebody working through the keyspace of a signing link. The signal is not
 * the volume, it is that every one of them missed — and only the application
 * knows a token missed.
 *
 * So this layer scores the things only we can score:
 *
 *   - refusals from the auth gate (401/403) — credential and session probing
 *   - share tokens that resolve to nothing — quote, change-order, screening
 *   - requests for routes that do not exist — scanning
 *   - bodies rejected as malformed — fuzzing
 *   - breadth: many distinct paths from one address in one window
 *
 * THE DESIGN DECISION THAT MAKES THIS AFFORDABLE
 *
 * Nothing is written for a well-behaved request. A caller earns a record only
 * by doing something suspicious, so ordinary traffic costs one in-memory map
 * lookup and no IO at all. A per-request counter write would have made this
 * module its own denial-of-service amplifier — every request from an attacker
 * turning into a database write is precisely the wrong shape.
 *
 * ESCALATION IS BY SCORE, AND SCORE DECAYS
 *
 *   under WARN      nothing
 *   WARN..BAN       throttle — 429 with Retry-After, cheap to serve
 *   over BAN        temporary ban — 403 until it expires
 *
 * Decay matters as much as accumulation. A shared office NAT, a corporate
 * proxy, or a customer who genuinely forgot their password three times must
 * drift back to clean on their own. A score that only ever rises eventually
 * bans everybody, and the failure is invisible because the people it bans
 * simply stop arriving.
 *
 * This module is deliberately pure: no IO, no clock of its own. Every function
 * takes `now` and returns new state, so the escalation ladder can be tested
 * exhaustively rather than observed in production. The middleware that calls
 * it does the storage.
 */

/** What a request did that was worth noticing. */
export type Signal =
  | 'auth_refused'        // 401/403 from the authorisation gate
  | 'bad_token'           // a share/screening token that resolved to nothing
  | 'not_found'           // a route that does not exist
  | 'malformed'           // body failed to parse or validate
  | 'origin_blocked';     // arrived bypassing the firewall once it is enforced

/**
 * What each signal is worth.
 *
 * Weighted by how specific the behaviour is to an attacker rather than by how
 * annoying it is. A mistyped password is ordinary and common; forty misses on
 * 256-bit share tokens is not something a real customer ever does, so
 * `bad_token` is weighted to reach a ban in far fewer events.
 */
export const SIGNAL_WEIGHTS: Record<Signal, number> = {
  auth_refused: 1,
  bad_token: 5,
  not_found: 1,
  malformed: 2,
  origin_blocked: 3,
};

/** Score at which a caller starts being slowed down. */
export const WARN_SCORE = 12;
/** Score at which a caller is refused outright. */
export const BAN_SCORE = 30;
/** How long a ban lasts, in ms. Short on purpose — see `decide`. */
export const BAN_MS = 15 * 60 * 1000;
/** Score halves every this many ms of quiet. */
export const HALF_LIFE_MS = 10 * 60 * 1000;
/** Distinct paths in one window past which breadth itself is a signal. */
export const BREADTH_PATHS = 25;
export const BREADTH_WINDOW_MS = 60 * 1000;
/** Cap, so a long attack cannot bank a ban that outlives the ban length. */
export const MAX_SCORE = BAN_SCORE * 2;

export interface Reputation {
  score: number;
  /** When `score` was last correct, for decay. */
  updatedAt: number;
  /** Epoch ms the current ban expires, or 0. */
  bannedUntil: number;
  /** Distinct paths seen in the breadth window, and when it opened. */
  paths: string[];
  windowAt: number;
}

export const freshReputation = (now: number): Reputation => ({
  score: 0, updatedAt: now, bannedUntil: 0, paths: [], windowAt: now,
});

/**
 * The score now, given it was `score` at `updatedAt`.
 *
 * Exponential rather than a sliding window of events: it needs no event list,
 * so a record stays a fixed handful of bytes however long the attack runs.
 */
export function decayed(rep: Reputation, now: number): number {
  const elapsed = Math.max(0, now - rep.updatedAt);
  if (elapsed === 0) return rep.score;
  return rep.score * Math.pow(0.5, elapsed / HALF_LIFE_MS);
}

export type Action = 'allow' | 'throttle' | 'ban';

export interface Decision {
  action: Action;
  score: number;
  /** Seconds to put in Retry-After, for throttle and ban. */
  retryAfter: number;
}

/**
 * What to do with a caller right now, without recording anything.
 *
 * A ban is fifteen minutes rather than a day, and that is a deliberate
 * trade. Addresses are not identities: they are shared by offices, carriers
 * and whole countries behind CGNAT, and a long ban on a mistaken signal
 * silently locks out everyone behind it. Short bans still defeat the attacks
 * this sees — an enumeration run is worthless if it has to pause every few
 * hundred attempts — and they expire before a wrongly-caught customer gives
 * up and telephones.
 */
export function decide(rep: Reputation, now: number): Decision {
  if (rep.bannedUntil > now) {
    return { action: 'ban', score: decayed(rep, now), retryAfter: Math.ceil((rep.bannedUntil - now) / 1000) };
  }
  const score = decayed(rep, now);
  if (score >= BAN_SCORE) return { action: 'ban', score, retryAfter: Math.ceil(BAN_MS / 1000) };
  if (score >= WARN_SCORE) return { action: 'throttle', score, retryAfter: 5 };
  return { action: 'allow', score, retryAfter: 0 };
}

/**
 * Record one suspicious request and return the new state and what to do.
 *
 * Call this ONLY for requests that produced a signal. A clean request must
 * never reach here — see the note on cost at the top.
 */
export function record(
  rep: Reputation,
  signal: Signal,
  path: string,
  now: number,
): { next: Reputation; decision: Decision } {
  let score = decayed(rep, now) + (SIGNAL_WEIGHTS[signal] ?? 1);

  // Breadth: one address touching many different paths in a minute is
  // scanning, whatever each individual request returned.
  let { paths, windowAt } = rep;
  if (now - windowAt > BREADTH_WINDOW_MS) { paths = []; windowAt = now; }
  if (!paths.includes(path)) paths = [...paths, path].slice(-BREADTH_PATHS * 2);
  if (paths.length >= BREADTH_PATHS) {
    score += 5;
    paths = [];          // charged once per window, not once per request after
    windowAt = now;
  }

  score = Math.min(score, MAX_SCORE);

  const next: Reputation = {
    score,
    updatedAt: now,
    bannedUntil: score >= BAN_SCORE ? now + BAN_MS : rep.bannedUntil,
    paths,
    windowAt,
  };
  return { next, decision: decide(next, now) };
}

/**
 * The caller's address, as far as it can be trusted.
 *
 * `cf-connecting-ip` first: once Cloudflare fronts this API it is the one
 * header it sets itself and strips from the client, so it cannot be forged
 * from outside. `x-forwarded-for` is a client-settable list and its LEFTMOST
 * entry is whatever the client typed — taking that would let an attacker wear
 * a different address per request and make this module useless. The rightmost
 * entry is the one the nearest trusted proxy appended, so that is what is
 * used.
 *
 * Returns null when nothing usable is present, and the caller then skips
 * reputation entirely rather than lumping every anonymous request under one
 * shared bucket — which would ban everybody the first time one person probed.
 */
export function clientIp(headers: { get(name: string): string | null }): string | null {
  const cf = headers.get('cf-connecting-ip')?.trim();
  if (cf) return cf;
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  const real = headers.get('x-real-ip')?.trim();
  return real || null;
}
