/**
 * Share links that authorise something — a quote to be read and signed.
 *
 * WHAT WAS WRONG WITH THE ONE THIS REPLACES
 *
 * `crypto.randomUUID().replace(/-/g, '')` stored as `quote_token:{token}`, with
 * a `createdAt` and nothing else. Four separate problems, in rising order of
 * seriousness:
 *
 *   1. The token was stored in plaintext. Anything that could read the key-value
 *      store — a backup, a mis-scoped route, a log — held every live link, and
 *      a link is the whole credential. Storing the hash means a leak of the
 *      store is not a leak of the links.
 *   2. There was no expiry. A quote link mailed in March still worked in
 *      December.
 *   3. There was no way to withdraw one. A quote sent to the wrong address
 *      could not be taken back.
 *   4. It authorises **signing**, not just reading. This is the closest thing in
 *      the system to a signature on a contract, and it had the weakest link
 *      security in the system.
 *
 * The architect-review link built earlier in this project already does this
 * properly — 256 bits, stored hashed, with expiry and revocation. This is that
 * pattern, applied to the link that actually commits somebody to a price.
 *
 * ON ENTROPY, HONESTLY
 *
 * `randomUUID` gives 122 random bits, which is not brute-forceable and was never
 * the real problem. The upgrade to 256 is cheap and removes the question; the
 * three things that mattered are hashing, expiry and revocation.
 */

/** How long a quote link stays good for. */
export const QUOTE_LINK_DAYS = 30;

/** A fresh token and the hash to file it under. */
export async function mintShareToken(): Promise<{ token: string; hash: string }> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  // base64url: URL-safe without escaping, and shorter than hex for the same
  // entropy, which matters when somebody has to paste it out of an email.
  const token = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return { token, hash: await hashToken(token) };
}

/** The lookup key for a token. The plaintext is never stored. */
export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(String(token || ''));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface ShareTokenRecord {
  quoteId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string | null;
  createdBy?: string;
}

export function shareTokenRecord(quoteId: string, nowIso: string, createdBy = ''): ShareTokenRecord {
  const expires = new Date(Date.parse(nowIso) + QUOTE_LINK_DAYS * 24 * 60 * 60 * 1000);
  return {
    quoteId: String(quoteId),
    createdAt: nowIso,
    expiresAt: expires.toISOString(),
    revokedAt: null,
    createdBy,
  };
}

/**
 * Is this link still good?
 *
 * One function for all three reasons a link can be dead, because the caller must
 * give the same answer to all of them. Telling somebody "expired" rather than
 * "not found" confirms the link was once real, which is information a stranger
 * guessing at links should not be given.
 */
export function shareTokenUsable(
  record: ShareTokenRecord | null | undefined,
  nowMs: number,
): boolean {
  if (!record?.quoteId) return false;
  if (record.revokedAt) return false;
  const expiry = Date.parse(String(record.expiresAt || ''));
  // A record with no readable expiry is treated as dead rather than immortal.
  // Failing closed on a malformed date is the only safe direction here.
  if (!Number.isFinite(expiry)) return false;
  return nowMs < expiry;
}

/**
 * May this quote still be signed?
 *
 * A quote that has been signed is signed. Re-signing let a customer flip an
 * approval to a rejection and back as often as they liked, each time
 * overwriting the stored signature and its timestamp — so the record of what
 * was agreed, and when, was whatever the last click said.
 */
export function alreadyDecided(quote: any): boolean {
  if (quote?.signature?.signedAt) return true;
  return ['approved', 'rejected', 'accepted', 'declined'].includes(
    String(quote?.status || '').toLowerCase(),
  );
}
