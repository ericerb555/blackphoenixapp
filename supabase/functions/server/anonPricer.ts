/**
 * Letting anybody price a junk job without an account, without handing out a
 * free AI endpoint.
 *
 * Eric: "Some Should not have to login to use the junk remaval picer until
 * they decied to create an account and get 5 percent off.. anyone can try the
 * pricer."
 *
 * WHY THIS IS NOT JUST "ALLOW ANONYMOUS"
 *
 * Every estimate is two model passes over up to twelve images, which is the
 * most expensive thing this server does per request. An open route with no
 * counting is somebody's loop and your bill.
 *
 * WHY NOT `aiSpend.reserve` WITH A PER-IP PRINCIPAL
 *
 * That was the first design, and it is wrong here. `aiSpend` budgets are
 * CUMULATIVE AND NEVER RESET — nothing clears `trash_budget:*`, by design, so
 * that a paid allowance cannot be farmed by waiting. Against an account that
 * is correct. Against an IP it is a permanent ban: the ceiling is 40 units and
 * an estimate costs up to 24, so the second visitor behind a carrier NAT, an
 * office, a coffee shop or a school is refused for ever because somebody they
 * have never met priced a sofa last month.
 *
 * So this counts per DAY, and the date is in the key rather than in a field.
 * There is nothing to reset: tomorrow asks a different question, and the old
 * rows age out of relevance on their own.
 *
 * TWO CEILINGS, BECAUSE THEY STOP DIFFERENT THINGS
 *
 *   per IP     stops one person refreshing in a loop, and is generous enough
 *              that a real visitor photographing a garage twice is unaffected.
 *   per day    stops a thousand IPs each doing it three times. One is a
 *              nuisance, the other is a bill, and a per-IP limit alone cannot
 *              see the difference.
 *
 * The IP is hashed before it becomes a key. It is personal data, the rows live
 * in a store other things read, and a daily counter does not need to know who
 * anybody is — only that they are the same somebody as a minute ago.
 */

/** Estimates one address may take in a day without an account. */
export const ANON_PER_IP_DAILY = 3;

/**
 * Estimates the whole internet may take in a day without an account.
 *
 * Sized against what this is for rather than what it could bear: a texted link
 * and a public pricer are a lead-generation tool for one contractor in
 * southern New Hampshire, so a hundred and fifty priced jobs in a day from
 * strangers is already far beyond a good day's traffic. It is a backstop, not
 * a quota anybody legitimate will meet — and if it is ever hit, that is worth
 * knowing about rather than paying for.
 */
export const ANON_GLOBAL_DAILY = 150;

/** `YYYY-MM-DD` in UTC. The day boundary is the key, so nothing needs resetting. */
export function dayStamp(nowIso: string): string {
  return String(nowIso).slice(0, 10);
}

export function globalDayKey(nowIso: string): string {
  return `anon_pricer:day:${dayStamp(nowIso)}`;
}

/**
 * Per-address key. The address is hashed, never stored.
 *
 * Synchronous and non-cryptographic on purpose: this is a bucketing function,
 * not a secret. It needs to be stable within a day and to not carry the
 * address around, and a 32-bit FNV-1a does both without making the caller
 * await a digest.
 */
export function ipDayKey(ip: string, nowIso: string): string {
  const s = String(ip || "unknown");
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `anon_pricer:ip:${h.toString(36)}:${dayStamp(nowIso)}`;
}

export type AnonRefusal = "per-ip" | "global";

export interface AnonDecision {
  allowed: boolean;
  reason?: AnonRefusal;
  /** What to tell the visitor. Never which ceiling they met. */
  message?: string;
}

/**
 * May this anonymous caller have an estimate?
 *
 * Pure, so both ceilings and both messages are testable without a request.
 *
 * The refusal does not say which limit was reached, and the per-IP one is
 * phrased as an invitation rather than a wall: somebody who has priced three
 * jobs today is interested, and the next thing they should see is the account
 * that gives them 5% off, not a complaint about rate limits. The global one is
 * phrased as our problem, because it is.
 */
export function mayPriceAnonymously(
  ipUsed: number,
  globalUsed: number,
): AnonDecision {
  const ip = Number(ipUsed) || 0;
  const all = Number(globalUsed) || 0;

  if (all >= ANON_GLOBAL_DAILY) {
    return {
      allowed: false,
      reason: "global",
      message: "The instant pricer is busy right now. Try again shortly, or create a free account and we will price it for you.",
    };
  }
  if (ip >= ANON_PER_IP_DAILY) {
    return {
      allowed: false,
      reason: "per-ip",
      message: `That is ${ANON_PER_IP_DAILY} free prices today. Create a free account to keep pricing jobs — and take 5% off the one you book.`,
    };
  }
  return { allowed: true };
}
