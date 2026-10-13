/**
 * cjErrors.ts — telling CJ's failures apart.
 *
 * Pure, and its own module, because the distinction it draws decides whether
 * the server retries, gives up, or asks a person for help — and because a rule
 * about matching somebody else's error text is exactly the kind that stops
 * working quietly when they reword it.
 *
 * THE DISTINCTION THAT MATTERS
 *
 * An expired token and a disabled account look similar and need opposite
 * handling. A stale token is fixed by re-authenticating, so the right response
 * is to do that and retry. A disabled account authenticates perfectly and then
 * refuses every data endpoint, so re-authenticating achieves nothing: proved on
 * 2026-10-06 by minting a fresh token and calling `/product/variant/query`
 * thirty seconds later — the auth endpoint answered 200 with the full points
 * allowance unused, and the product endpoint still answered 1600014.
 *
 * Getting that backwards costs one pointless authentication per request, which
 * is 123 of them on a single catalogue sweep, and buries the one message that
 * tells somebody what to actually do.
 */

/** CJ's code for "API access is switched off for this account". */
export const CJ_ACCESS_DISABLED_CODE = 1600014;

/** CJ's code for an expired or invalid access token. */
export const CJ_BAD_TOKEN_CODE = 1600100;

/**
 * The prefix a disabled-account failure carries once this server has thrown it.
 *
 * Matched by `storeCatalogueJob` to raise one ask instead of recording the same
 * error against every product. A prefix we own is matched rather than CJ's
 * prose, which they can reword without telling anybody.
 */
export const CJ_ACCESS_DISABLED = 'CJ_ACCESS_DISABLED';

/**
 * Has CJ switched API access off for the whole account?
 *
 * The code is the reliable signal and is checked first. The message is a
 * fallback for the day CJ returns the same condition under a different code —
 * which is likelier than the reverse, because an error code is part of their
 * API contract and a sentence is not.
 */
export function isAccessDisabled(payload: { code?: unknown; message?: unknown } | null | undefined): boolean {
  if (!payload) return false;
  if (Number(payload.code) === CJ_ACCESS_DISABLED_CODE) return true;
  // "API access has been disabled", and deliberately not merely "disabled" —
  // a product being disabled is a different thing entirely and must not stop
  // the sweep.
  return /api\s+access\s+has\s+been\s+disabled/i.test(String(payload.message ?? ''));
}

/**
 * Is this worth re-authenticating for?
 *
 * Note the order: a disabled account is excluded FIRST. Its message contains
 * the word "access", and a looser token test would have claimed it — which is
 * the bug this module was written to make impossible.
 */
export function isStaleToken(
  payload: { code?: unknown; message?: unknown } | null | undefined,
  httpStatus = 200,
): boolean {
  if (isAccessDisabled(payload)) return false;
  if (httpStatus === 401) return true;
  if (!payload) return false;
  if (Number(payload.code) === CJ_BAD_TOKEN_CODE) return true;
  return /access[-\s]?token/i.test(String(payload.message ?? ''));
}

/**
 * AUTHENTICATION IS A PROPERTY OF THE RUN, NOT OF A PRODUCT.
 *
 * `storeCatalogueJob` walks 123 products and calls CJ for each. It already
 * stops the whole sweep when the account's API access is switched off — but a
 * WRONG KEY was not covered, and that distinction cost an evening.
 *
 * What actually happened on 2026-10-13, after the CJ key was replaced: the
 * first product reported `CJ authentication failed: APIkey is wrong, please
 * check and try again`, and the loop carried on to the next product. The next
 * 122 each tried to authenticate again, every one of them failed, and because
 * CJ allows one request per second they came back as `Too Many Requests, QPS
 * limit is 1 time/1second`. So the run produced 123 errors, 122 of them
 * meaningless, with the one sentence that identified the real problem buried
 * at the front of a wall of rate-limit noise.
 *
 * Retrying was never going to help. A key is either right or wrong for the
 * whole account; it cannot be wrong for product A and right for product B. So
 * the first authentication failure ends the run, which also stops us hammering
 * a supplier's rate limiter with credentials we already know are rejected —
 * a good way to get an account flagged on top of being useless.
 *
 * The prefix matched here is the one `getAccessToken` throws, so it is ours
 * rather than CJ's prose.
 */
export const CJ_AUTH_FAILED_PREFIX = 'CJ authentication failed';

export type CjAuthFailure = 'bad-key' | 'rate-limited' | 'other';

/**
 * Did this error come from authenticating, rather than from the product?
 *
 * A disabled account is excluded: it has its own marker, its own ask and its
 * own instruction, and it is handled before this is reached. Treating it as a
 * generic auth failure would lose the one message that says what to do.
 */
export function isAuthFailure(message: unknown): boolean {
  const text = String(message ?? '');
  if (text.startsWith(CJ_ACCESS_DISABLED)) return false;
  return text.includes(CJ_AUTH_FAILED_PREFIX);
}

/**
 * Which kind, so the run can say something useful rather than "it failed".
 *
 * `bad-key` needs a person to correct a credential. `rate-limited` is usually
 * the SYMPTOM of a bad key on a multi-product sweep — the first call fails and
 * the retries trip CJ's one-per-second limit — but it can also happen on its
 * own, so it is reported separately rather than reworded into the other.
 */
export function authFailureKind(message: unknown): CjAuthFailure {
  const text = String(message ?? '');
  if (/api\s*key\s+is\s+wrong|wrong\s+api\s*key|invalid\s+api\s*key/i.test(text)) return 'bad-key';
  if (/too\s+many\s+requests|qps\s+limit/i.test(text)) return 'rate-limited';
  return 'other';
}
