/**
 * Remembering where somebody was going before they were asked to sign in.
 *
 * THE PROBLEM THIS SOLVES
 *
 * Opening a protected page without a session bounced you to /login, and Login
 * then sent you to whatever your role's home page is. The page you actually
 * asked for was forgotten, so reaching it meant signing in, landing somewhere
 * else, and navigating back by hand — which mostly read as "the page isn't
 * there".
 *
 * WHY sessionStorage
 *
 * The intent belongs to this tab and this attempt. localStorage would keep a
 * stale destination alive for weeks, so a sign-in months later would fling the
 * person at a page they had long forgotten asking for.
 *
 * WHY THE VALUE IS VALIDATED ON THE WAY OUT AS WELL AS IN
 *
 * This is read after authentication and turned into navigation, so it is
 * exactly the kind of value that must not be trusted just because we wrote it:
 * anything in storage can be edited from the browser console. Restricting it to
 * a bare route key — no slashes, no scheme, no host — means it can never become
 * an off-site redirect, and checking it against the real route map means it can
 * only ever name a page this application actually has.
 */

const KEY = 'bp_return_to';

/** Pages that must never be a destination, or signing in becomes a loop. */
const NEVER = new Set(['login', 'signup', 'forgot-password', 'reset-password']);

/** A route key is lowercase letters, digits and hyphens. Nothing else. */
const SHAPE = /^[a-z0-9-]{1,64}$/;

export function rememberReturnTo(page: string | null | undefined): void {
  const key = String(page || '').trim().toLowerCase();
  if (!key || !SHAPE.test(key) || NEVER.has(key)) return;
  try { sessionStorage.setItem(KEY, key); } catch { /* private mode — no memory, no harm */ }
}

/**
 * Read the destination and forget it in the same breath.
 *
 * Consumed rather than merely read, so a redirect fires once. Left in place it
 * would hijack the next sign-in in the same tab.
 *
 * `known` is the set of real route keys — pass `Object.keys(pageMap)`. A value
 * that is not in it is discarded rather than navigated to.
 */
export function consumeReturnTo(known?: Iterable<string>): string | null {
  let stored: string | null = null;
  try {
    stored = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch {
    return null;
  }
  if (!stored) return null;

  const key = stored.trim().toLowerCase();
  if (!SHAPE.test(key) || NEVER.has(key)) return null;
  if (known) {
    const set = known instanceof Set ? known : new Set(known);
    if (!set.has(key)) return null;
  }
  return key;
}

/** Drop any remembered destination — used when signing out. */
export function clearReturnTo(): void {
  try { sessionStorage.removeItem(KEY); } catch { /* nothing to clear */ }
}
