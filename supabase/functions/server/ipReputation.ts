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
/** How long a FIRST ban lasts, in ms. Short on purpose — see `decide`. */
export const BAN_MS = 15 * 60 * 1000;
/**
 * Each further ban doubles: 15m, 30m, 1h, 2h, 4h, then the cap.
 *
 * Eric: "ban repeat offenders for escalating durations." This is fail2ban's
 * `bantime.increment` and it answers the one thing a flat ban cannot. Fifteen
 * minutes is the right price for a first offence — it stops an enumeration
 * run dead and expires before a wrongly-caught customer telephones — and it
 * is far too cheap for somebody who comes back and earns it a sixth time.
 */
export const BAN_ESCALATION = 2;
/**
 * Longest a ban may ever last.
 *
 * Four hours rather than a day, and the reason is the one in `decide`:
 * addresses are not identities. A CGNAT range or an office can be shared by
 * hundreds of people, and the cost of being wrong rises with the duration.
 * Four hours is long enough that an attacker has to come back tomorrow, and
 * short enough that a mistaken ban clears inside a working day.
 */
export const BAN_MAX_MS = 4 * 60 * 60 * 1000;
/**
 * Quiet time after which repeat offences are forgiven and the count resets.
 *
 * Without this, escalation is permanent: an office that trips the detector
 * once a quarter would eventually be meeting four-hour bans for a single
 * mistake, having done nothing wrong twice in a row. Measured from the last
 * ban, so a genuine attacker pausing to wait it out has to pause for longer
 * than the ban they were trying to escape.
 */
export const BAN_FORGET_MS = 24 * 60 * 60 * 1000;

/**
 * How long the Nth ban should last.
 *
 * `bans` is the count INCLUDING this one, so the first ban is `BAN_MS`.
 * Exported because the figure appears in a `Retry-After` header and in the
 * log line, and those two must not be able to disagree.
 */
/**
 * How many bans count against this address right now.
 *
 * Zero once it has been quiet for `BAN_FORGET_MS`, which is what stops
 * escalation being permanent for a shared address that trips the detector
 * twice a year.
 */
export function banCount(rep: Reputation, now: number): number {
  const last = Number(rep?.lastBanAt) || 0;
  if (!last || now - last > BAN_FORGET_MS) return 0;
  return Math.max(0, Math.trunc(Number(rep?.bans) || 0));
}

/** How long the ban being imposed right now should last. */
export function nextBanLength(rep: Reputation, now: number): number {
  return banDuration(banCount(rep, now) + 1);
}

export function banDuration(bans: number): number {
  const n = Math.max(1, Math.trunc(bans) || 1);
  // Doubling overflows into Infinity surprisingly fast; the cap is applied to
  // the exponent as well so the arithmetic stays finite for any input.
  const steps = Math.min(n - 1, 32);
  return Math.min(BAN_MS * Math.pow(BAN_ESCALATION, steps), BAN_MAX_MS);
}
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
  /**
   * How many bans this address has earned, for escalation.
   *
   * Reset after `BAN_FORGET_MS` of quiet — see `banDuration`. Absent on
   * records written before escalation existed, which `record` reads as zero,
   * so an address mid-ban at deploy time simply starts its count now.
   */
  bans?: number;
  /** Epoch ms of the most recent ban, for the forget window. */
  lastBanAt?: number;
  /** Distinct paths seen in the breadth window, and when it opened. */
  paths: string[];
  windowAt: number;
}

export const freshReputation = (now: number): Reputation => ({
  score: 0, updatedAt: now, bannedUntil: 0, bans: 0, lastBanAt: 0, paths: [], windowAt: now,
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
  if (score >= BAN_SCORE) {
    // What the NEXT ban would cost, which is what `record` is about to
    // impose. Reading it from the same function keeps the Retry-After this
    // returns and the ban that follows from ever disagreeing.
    return { action: 'ban', score, retryAfter: Math.ceil(nextBanLength(rep, now) / 1000) };
  }
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

  /*
   * A BAN IS COUNTED WHEN IT STARTS, NOT WHILE IT RUNS.
   *
   * An address already serving a ban keeps earning signals — it is still
   * making requests, that is what being banned looks like from here. If each
   * of those re-counted, one determined run would walk straight up to the
   * four-hour cap in seconds and the escalation would measure request volume
   * rather than repeat offending, which is what the score already does.
   *
   * So the count rises only on the transition into a ban: the address was
   * free, and now it is not.
   */
  const alreadyBanned = rep.bannedUntil > now;
  const starting = score >= BAN_SCORE && !alreadyBanned;

  let { bans, lastBanAt, bannedUntil } = {
    bans: banCount(rep, now),
    lastBanAt: Number(rep.lastBanAt) || 0,
    bannedUntil: rep.bannedUntil,
  };

  if (starting) {
    bans += 1;
    lastBanAt = now;
    bannedUntil = now + banDuration(bans);
  }

  const next: Reputation = {
    score,
    updatedAt: now,
    bannedUntil,
    bans,
    lastBanAt,
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
 *
 * `viaTrustedProxy` exists because of a measurement, not a theory. The
 * Cloudflare Worker forwards the visitor's address in `x-client-ip`, and
 * MEASURED 2026-11-11: Supabase's own Cloudflare overwrites `cf-connecting-ip`
 * with the Worker's address before this function ever sees it. One probe from
 * 70.109.187.2 through the Worker was recorded against `2a06:98c0:3600::103`.
 * Left alone, every visitor arriving through the firewall would share a single
 * reputation record, and one person's probing would ban all of them at once.
 *
 * `x-client-ip` is client-settable, so it is read ONLY when the caller has
 * already proved the request came through the Worker by presenting a matching
 * X-Edge-Auth. Trusting it without that proof would hand every caller a free
 * way to choose their own identity and shed a bad score at will — strictly
 * worse than the pooling it fixes.
 */
/**
 * The `role` a bearer token claims, without verifying it.
 *
 * Unverified on purpose and safe because of what it is used for: nothing is
 * authorised on the strength of this. It answers one question — "was this
 * caller attempting to authenticate at all" — and a forged claim can only
 * ever make a caller look MORE suspicious, never less, because an
 * unparseable token is treated as an attempt.
 *
 * Returns null when there is no readable payload.
 */
export function tokenRole(bearer: string): string | null {
  const parts = String(bearer || '').split('.');
  if (parts.length !== 3) return null;
  try {
    const pad = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(pad + '='.repeat((4 - (pad.length % 4)) % 4));
    const role = JSON.parse(json)?.role;
    return typeof role === 'string' ? role : null;
  } catch {
    return null;
  }
}

/**
 * Did this caller actually try to authenticate?
 *
 * THE DISTINCTION THIS EXISTS TO MAKE, and it decides whether enforcement is
 * safe to turn on at all.
 *
 * A 401 was scored as `auth_refused` — credential probing — whatever produced
 * it. But the overwhelming majority of 401s on this platform come from the
 * app's own screens: a signed-out browser opens a staff page and every panel
 * on it fetches. MEASURED 2026-11-14: `/design-projects`, `/work-requests`,
 * `/crm/contacts`, `/labor-rates/get`, all `signedIn=false`, several per
 * second, and Eric's own address pinned at 60.0 of a possible 60 in a
 * permanent would-ban state. A stranger reading the website generates the
 * same burst.
 *
 * Presenting NO token, or the publishable anon key, is not probing. It is a
 * client asking for something it has not earned, and the gate says no. That
 * is the system working, and scoring it would have banned every signed-out
 * visitor the moment enforcement came on.
 *
 * Presenting a token that claims to be a SESSION and having it refused is a
 * different thing: an expired, stolen or guessed credential. So is a token
 * that cannot be parsed at all. Those still score.
 */
export function presentedCredential(headers: Headers): boolean {
  // `\s*`, not `\s+`: Headers trims the value, so a header of "Bearer   "
  // arrives as the bare scheme. That is a broken client with no token, not a
  // credential attempt, and `\s+` left it looking like an unparseable one.
  const raw = String(headers.get('authorization') || '').replace(/^Bearer\s*/i, '').trim();
  if (!raw) return false;
  const role = tokenRole(raw);
  // 'anon' is the publishable key every browser carries. Not a credential.
  if (role === 'anon') return false;
  // A readable session or service token, or something unreadable: an attempt.
  return true;
}

export function clientIp(
  headers: { get(name: string): string | null },
  viaTrustedProxy = false,
): string | null {
  if (viaTrustedProxy) {
    const forwarded = headers.get('x-client-ip')?.trim();
    if (forwarded) return forwarded;
  }
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
