/**
 * The only shape of a payment gateway config allowed into browser storage.
 *
 * Its own module, with no imports, for one reason: so a test can load it.
 * `unifiedPaymentService.ts` reaches `apiConfig` through an extensionless
 * Vite-style import that `node --test` cannot resolve, so a rule living there
 * could only ever be asserted by reading the code and hoping. A rule about
 * where payment secrets may go deserves better than that.
 *
 * WHAT THIS IS FOR
 *
 * Until 2026-11-16 the payment centre wrote `api_key`, `api_secret` and
 * `webhook_secret` into `localStorage` in plaintext. Nothing read them back
 * except the form that wrote them — no request carries them, and the server
 * deliberately keeps only `is_active` and `test_mode` — so the exposure was
 * total and the benefit was a "Configured" badge. `has_credentials` is that
 * badge, which is all the UI actually needed.
 *
 * Running this on load as well as on save is deliberate: it means simply
 * opening the screen scrubs secrets an older build left on that machine,
 * rather than waiting for anyone to go and clear them.
 */

/** The fields that must never be persisted. Exported so tests name the same list. */
export const GATEWAY_SECRET_FIELDS = ['api_key', 'api_secret', 'webhook_secret'] as const;

/**
 * Deliberately no index signature. One was tried and rejected: an `interface`
 * has no implicit index signature in TypeScript, so `GatewayConfig` — the real
 * caller — would not satisfy it, and the fix for that is a cast, which is the
 * thing that would let a future secret field slip past this function unnoticed.
 */
type GatewayConfigLike = {
  api_key?: string;
  api_secret?: string;
  webhook_secret?: string;
  has_credentials?: boolean;
};

/**
 * Returns a copy without the secrets. Never mutates its argument — the open
 * form still needs the values the admin just typed, and stripping a shared
 * object in place would blank the form on save.
 */
export function withoutGatewaySecrets<T extends GatewayConfigLike>(config: T): T {
  const { api_key, api_secret, webhook_secret, ...safe } = config;
  return {
    ...safe,
    has_credentials: Boolean(config.has_credentials || api_key || api_secret || webhook_secret),
  } as unknown as T;
}
