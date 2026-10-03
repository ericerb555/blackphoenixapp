/**
 * The public rental-application link, and what it is allowed to accept.
 *
 * WHY THIS IS ITS OWN FILE
 *
 * The same reason `aiCeiling.ts` is: these rules decide who may reach a
 * landlord's records and how much a stranger may write into them, and a rule
 * that cannot be tested is a rule nobody can check. The routes live in
 * `index.tsx`, which the test runner cannot import — it strips types from `.ts`
 * only — so the decisions live here and the route file does the input and
 * output around them.
 *
 * WHAT WAS WRONG BEFORE
 *
 * One token was minted per landlord on first page load, stored for ever, with
 * no expiry and no way to revoke it. It is the one credential in the portal
 * that is handed to strangers on purpose — posted on listing sites, pasted into
 * adverts — so "for ever" meant a link from a vacancy filled three years ago
 * still accepted applications, and a landlord who wanted it to stop had nothing
 * to press.
 *
 * The companion hole: the route behind the link is unauthenticated and appends
 * to an unbounded array, so anybody holding a link could fill both a landlord's
 * inbox and the stored record behind it.
 *
 * THE STATES ARE DISTINGUISHED ON PURPOSE
 *
 * Expired, revoked and never-existed are three different things to tell a
 * prospect standing in front of the form, and only one of them is the
 * landlord's deliberate act. Collapsing them into "invalid" would have the
 * software blame the applicant for the landlord turning the link off.
 *
 * A TOKEN FROM BEFORE EXPIRIES EXISTED IS GRANDFATHERED, NOT KILLED
 *
 * Tokens minted by the old code carry no `expiresAt`. Reading that as expired
 * would break every live advert the moment this deployed, so the state machine
 * reports `grandfather` and the caller stamps an expiry on first sight. A link
 * already revoked stays revoked — the grandfather path is checked after the
 * revocation, never before, because the one thing worse than an immortal link
 * is one that resurrects.
 */

export const SCREENING_DAY_MS = 24 * 60 * 60 * 1000;

/** How long a newly issued link accepts applications. */
export const SCREENING_LINK_DAYS = 90;

/**
 * The wording an applicant agrees to, owned by the server rather than the form.
 *
 * The consent record is the entire legal basis for ever ordering a report about
 * somebody, so what is stored has to be what they actually saw. The form asks
 * the server for this text and the same constant is written into the record,
 * which is why they cannot drift apart.
 */
export const SCREENING_CONSENT_TEXT =
  'I consent to a background and credit check as part of this application.';

/**
 * How many applications one link may take.
 *
 * Two windows, because they stop different things: the burst cap stops a script
 * hammering the route, and the daily cap bounds the damage from one that paces
 * itself under the burst cap. Both sit well above what a real vacancy draws —
 * a busy listing takes a handful of applications an hour, not five a minute.
 */
export const SCREENING_BURST_CAP = 5;
export const SCREENING_BURST_MS = 15 * 60 * 1000;
export const SCREENING_DAILY_CAP = 40;

export type ScreeningLinkState = 'missing' | 'revoked' | 'expired' | 'grandfather' | 'ok';

export interface ScreeningTokenMeta {
  landlordEmail?: string | null;
  createdAt?: string | null;
  expiresAt?: string | null;
  revokedAt?: string | null;
}

/**
 * What state a stored token is in.
 *
 * Order matters and is the security property: missing, then revoked, then
 * grandfather, then expiry. A revoked token must never reach the grandfather
 * branch, or turning a link off would hand it a fresh ninety days.
 */
export function screeningLinkState(
  meta: ScreeningTokenMeta | null | undefined,
  nowMs: number = Date.now(),
): ScreeningLinkState {
  if (!meta || !meta.landlordEmail) return 'missing';
  if (meta.revokedAt) return 'revoked';
  if (!meta.expiresAt) return 'grandfather';
  const at = Date.parse(String(meta.expiresAt));
  // An unparseable expiry is treated as expired, not as absent. A corrupt date
  // must fail closed; falling through to `grandfather` would renew it instead.
  if (!Number.isFinite(at)) return 'expired';
  return at > nowMs ? 'ok' : 'expired';
}

/** The expiry to stamp on a link issued now. */
export function screeningLinkExpiry(nowMs: number = Date.now()): string {
  return new Date(nowMs + SCREENING_LINK_DAYS * SCREENING_DAY_MS).toISOString();
}

export interface CountableApplication {
  source?: string | null;
  createdAt?: string | null;
}

/**
 * How many applications arrived through the public link inside a window.
 *
 * Counted from the application records themselves rather than from a separate
 * tally: the timestamps are already there, and a counter kept alongside them is
 * one more thing that can disagree with the truth. Only `public` submissions
 * count — an application a landlord typed in by hand is not abuse of their own
 * link, and must never be able to lock their link out.
 */
export function publicApplicationsSince(
  apps: readonly CountableApplication[] | null | undefined,
  windowMs: number,
  nowMs: number = Date.now(),
): number {
  const since = nowMs - windowMs;
  let n = 0;
  for (const a of apps ?? []) {
    if (!a || a.source !== 'public') continue;
    const at = Date.parse(String(a.createdAt ?? ''));
    if (Number.isFinite(at) && at > since) n += 1;
  }
  return n;
}

/**
 * Why one more public application may not be accepted, or `null` to accept it.
 *
 * Shaped as a nullable refusal rather than a boolean for two reasons: it is the
 * shape the spend ceilings in `aiSpend.ts` already use, so callers read the
 * same way (`if (refused) …`); and it names the window that bit, so a flood is
 * distinguishable in the log from steady legitimate traffic.
 */
export function submissionRefusal(
  apps: readonly CountableApplication[] | null | undefined,
  nowMs: number = Date.now(),
): { window: 'burst' | 'daily' } | null {
  if (publicApplicationsSince(apps, SCREENING_BURST_MS, nowMs) >= SCREENING_BURST_CAP) {
    return { window: 'burst' };
  }
  if (publicApplicationsSince(apps, SCREENING_DAY_MS, nowMs) >= SCREENING_DAILY_CAP) {
    return { window: 'daily' };
  }
  return null;
}
