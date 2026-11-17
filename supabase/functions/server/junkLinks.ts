/**
 * The junk pricing link Eric can text, and what stops it becoming a bill.
 *
 * Eric, 2026-11-16: *"also can we create a link to the junk pricing tool i can
 * text?"*
 *
 * A link somebody receives by text gets forwarded, screenshotted and pasted
 * into group chats. That is the point of it — and it is also the whole problem,
 * because behind this one is an Anthropic call per estimate. So the link is a
 * credential with a budget rather than a URL, and this module is the record
 * keeping that makes both halves true.
 *
 * WHY THE TOKEN IS THE PRINCIPAL
 *
 * `aiSpend.reserve` meters against `user.id` and keys usage at
 * `budgetKey(bucket, id)`. A visitor on a link has no account, and the first
 * instinct — waive metering for them — is exactly backwards: the anonymous
 * caller is the one who cannot be billed, warned or rate-limited afterwards.
 *
 * The second instinct, metering against the staff member who minted it, is
 * nearly right and still wrong: one careless link would spend the minter's
 * whole ceiling and start refusing their own work, and a link forwarded to a
 * thousand people would be indistinguishable from the minter having a busy day.
 *
 * So the token itself is the principal. `principalFor` returns a synthetic user
 * whose id is derived from the token hash, which means every existing control
 * applies to it with no change to `aiSpend` at all: it gets its own budget row,
 * `isStaff` is false so it is metered rather than waived, and `ceilingFor`
 * finds no override and no email and falls back to the published backstop. One
 * exhausted link cannot reach another link or any real account.
 *
 * WHAT `reserve` ALREADY DOES, SO THIS DOES NOT REPEAT IT
 *
 * `reserve` with no id returns "Sign in required." rather than running
 * unmetered — it fails closed. That is why a public route could never have been
 * an open AI endpoint by accident; it would simply have refused everybody. The
 * work here is giving the link an identity so that it is metered rather than
 * refused.
 *
 * WHY A USE CAP ON TOP OF A BUDGET
 *
 * The spend ceiling bounds the money. The use cap bounds the blast radius of
 * one forwarded link, and it is the thing a person can reason about when they
 * are deciding whether to text it: "this works twenty times" is a sentence an
 * estimator can hold in their head. A budget measured in image reads is not.
 *
 * WHY THE HASH, NOT THE TOKEN, IS STORED
 *
 * Same reason as `shareToken.ts`, whose pattern this follows: the link is the
 * entire credential, so storing it in plaintext means any read of the key-value
 * store — a backup, a log, a mis-scoped route — hands over every live link.
 * Only the hash is filed, and `junk_link:{hash}` is the key.
 */
import { mintShareToken, hashToken } from "./shareToken.ts";

/** How long a texted pricing link stays good for. */
export const JUNK_LINK_DAYS = 14;

/**
 * How many estimates one link may produce.
 *
 * Ten rather than one, because the person who was texted will photograph the
 * pile twice and get the framing wrong the first time, and a link that dies on
 * a mis-shot is a lead lost to our own security. Ten rather than a hundred
 * because a link in a group chat should run out while somebody still owns the
 * consequence.
 */
export const JUNK_LINK_MAX_USES = 10;

export interface JunkLinkRecord {
  /** The hash this record is filed under; never the token. */
  hash: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string | null;
  /** Who minted it, so a link that misbehaves has an owner. */
  createdBy?: string;
  /** What the estimator called it — "Dunbarton basement" — for the staff list. */
  label?: string;
  uses: number;
  maxUses: number;
}

export function junkLinkRecord(
  hash: string,
  nowIso: string,
  opts: { createdBy?: string; label?: string; maxUses?: number } = {},
): JunkLinkRecord {
  const expires = new Date(Date.parse(nowIso) + JUNK_LINK_DAYS * 24 * 60 * 60 * 1000);
  const asked = Number(opts.maxUses);
  return {
    hash: String(hash),
    createdAt: nowIso,
    expiresAt: expires.toISOString(),
    revokedAt: null,
    createdBy: opts.createdBy || "",
    label: opts.label || "",
    uses: 0,
    // A caller may ask for fewer, never for more. The ceiling is ours.
    maxUses: Number.isFinite(asked) && asked > 0 ? Math.min(asked, JUNK_LINK_MAX_USES) : JUNK_LINK_MAX_USES,
  };
}

/** Why a link is dead. Internal — callers are told only that it is. */
export type JunkLinkRefusal = "unknown" | "revoked" | "expired" | "spent" | "malformed";

/**
 * Is this link still good, and if not, why.
 *
 * The reason is returned for the staff list and the server log, and must not
 * reach the person holding the link: telling a stranger "expired" rather than
 * "not found" confirms the link was once real, which is the one bit of
 * information somebody guessing at links should not be given. Same rule as
 * `shareTokenUsable`.
 */
export function junkLinkState(
  record: JunkLinkRecord | null | undefined,
  nowMs: number,
): { usable: true } | { usable: false; reason: JunkLinkRefusal } {
  if (!record?.hash) return { usable: false, reason: "unknown" };
  if (record.revokedAt) return { usable: false, reason: "revoked" };

  const expiry = Date.parse(String(record.expiresAt || ""));
  // A record with no readable expiry is dead rather than immortal. Failing
  // closed on a malformed date is the only safe direction.
  if (!Number.isFinite(expiry)) return { usable: false, reason: "malformed" };
  if (nowMs >= expiry) return { usable: false, reason: "expired" };

  const uses = Number(record.uses);
  const max = Number(record.maxUses);
  // An unreadable counter is spent, not infinite — same direction as the date.
  if (!Number.isFinite(uses) || !Number.isFinite(max) || max <= 0) {
    return { usable: false, reason: "malformed" };
  }
  if (uses >= max) return { usable: false, reason: "spent" };

  return { usable: true };
}

/** The key a record is filed under. */
export function junkLinkKey(hash: string): string {
  return `junk_link:${hash}`;
}

/**
 * The synthetic principal a link spends as.
 *
 * Shaped like a user because that is what `aiSpend`, `aiLedger` and the kill
 * switch all take. It deliberately carries NO `app_metadata`, so `isStaff` is
 * false and the link is metered rather than waived, and no `email`, so
 * `ceilingFor` falls through to the published backstop instead of inheriting
 * somebody's subscription tier.
 *
 * The id is namespaced so a budget row for a link can never collide with a
 * real account's uuid, and so anybody reading the spend table can see what
 * they are looking at.
 */
export function principalFor(hash: string): { id: string; isJunkLink: true } {
  return { id: `junklink:${hash}`, isJunkLink: true };
}

/** Mint a fresh link: the token to text, and the record to file. */
export async function mintJunkLink(
  nowIso: string,
  opts: { createdBy?: string; label?: string; maxUses?: number } = {},
): Promise<{ token: string; record: JunkLinkRecord }> {
  const { token, hash } = await mintShareToken();
  return { token, record: junkLinkRecord(hash, nowIso, opts) };
}

/** Look up the record key for a token somebody presented. */
export async function keyForToken(token: string): Promise<string> {
  return junkLinkKey(await hashToken(String(token)));
}

/**
 * The link as a person receives it.
 *
 * A bare path, because the same link has to survive being pasted into a text
 * message, and a query string with two parameters gets truncated by somebody's
 * SMS client sooner or later.
 */
export function junkLinkUrl(appUrl: string, token: string): string {
  const base = String(appUrl || "").replace(/\/+$/, "");
  return `${base}/junk-quote/${encodeURIComponent(token)}`;
}
