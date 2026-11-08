/**
 * The small answers that most of this server needs and nothing owns.
 *
 * WHY ONE FILE AND NOT FOUR
 *
 * Each of these is three to ten lines, and every one of them was stranded in
 * the middle of `index.tsx` — which is the whole problem, because a block of
 * routes cannot be lifted out of that file while it depends on a one-line
 * helper that lives there. `money` is used 85 times, `APP_URL` 27, `toE164`
 * and `rentAppUrl` 13 each.
 *
 * Four separate modules for four tiny functions would be its own kind of
 * clutter, and the honest description of what they have in common is "leaf
 * utilities with no dependencies of their own". That is a real category: they
 * import nothing, so they can be imported by anything, which is exactly the
 * property that makes the rest of the split possible. Anything here that grows
 * dependencies should leave and become its own module.
 *
 * See `tasks/phoenix-ai-audit.md` for why `index.tsx` is being split at all.
 */

/**
 * Read a secret, in a way that survives being imported by the test runner.
 *
 * `Deno.env.get` is the real thing in production. These functions are also the
 * most worth testing in this file — the E.164 rules and the company-name
 * heuristic both have cases that are easy to get subtly wrong — and the tests
 * run under `node --test`, where `Deno` does not exist. A module that reads it
 * at import time cannot be imported there at all, so the test would fail
 * before its first assertion rather than for any reason to do with the code.
 *
 * Optional chaining rather than a mock, because the alternative is every test
 * file that touches this having to install a fake global first, and a shim
 * that has to be remembered is one that will eventually be forgotten.
 */
function env(name: string): string {
  return (globalThis as any).Deno?.env?.get(name) || '';
}

/**
 * Where the app lives, without a trailing slash.
 *
 * WHY A FUNCTION AND A CONSTANT
 *
 * There were two of these in `index.tsx`: a const `APP_URL` reading the
 * environment, and a function `rentAppUrl()` reading the same variable with
 * the same fallback and then stripping a trailing slash. Callers of the const
 * mostly stripped the slash themselves at the point of use, which is the same
 * work done 27 times instead of once.
 *
 * Both are kept because both are used, and they now agree by construction
 * rather than by coincidence. The trailing slash matters: these values are
 * concatenated into links, and `https://host//path` is a different URL to a
 * strict router and an ugly one in an email.
 */
export const APP_URL = (env('APP_URL') || 'https://www.theblackphoenixcompany.com').replace(/\/$/, '');

/** The same value, for callers that want it lazily. */
export function appUrl(): string {
  return APP_URL;
}

/**
 * Round a value to whole cents, and never return NaN.
 *
 * Anything unparseable becomes 0 rather than propagating NaN into a total,
 * because a NaN reaches the customer as "$NaN" on an invoice while a zero is
 * at least obviously wrong to whoever is looking at the figures.
 */
export function money(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : 0;
}

/**
 * A phone number in the form Twilio will accept.
 *
 * Twilio rejects anything that is not E.164, which is why a number typed as
 * "(555) 123-4567" silently fails to send rather than erroring somewhere
 * visible. Ten digits are assumed to be North American, which is where this
 * company works; an explicit `+` is always honoured.
 */
export function toE164(raw: string): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  const digits = s.replace(/\D/g, '');
  if (!digits) return '';
  if (s.startsWith('+')) return '+' + digits;
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  return '+' + digits;
}

/**
 * The company's name, refusing to believe an obviously wrong one.
 *
 * `COMPANY_NAME` is a secret, and a secret that has been set to a generated
 * identifier — the sort of thing a deploy tool writes — would otherwise end up
 * in the subject line of customer email. The heuristic is deliberately narrow:
 * a single token, mixed letters and digits, at least ten characters, with none
 * of the punctuation a real trading name uses. "Black Phoenix Builds LLC"
 * passes; "a7f3c9d2e1b4" does not.
 */
export function resolveCompanyName(): string {
  const fallback = 'The Black Phoenix Company';
  const raw = env('COMPANY_NAME').trim();
  if (!raw) return fallback;
  const looksLikeRandomId = !/\s/.test(raw) && /[A-Za-z]/.test(raw) && /[0-9]/.test(raw) && raw.length >= 10 && !/[.\-_&]/.test(raw);
  return looksLikeRandomId ? fallback : raw;
}
