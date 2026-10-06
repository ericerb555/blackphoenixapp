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
