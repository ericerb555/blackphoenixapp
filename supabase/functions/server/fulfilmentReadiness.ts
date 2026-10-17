/**
 * Would a paid subscription actually grant anything?
 *
 * WHY THIS EXISTS
 *
 * Because on 2026-10-17 the answer was no, and nothing said so.
 *
 * Every piece of the money path was built and correct. `/plan-checkout` stamps
 * `bp_tier_id`, `bp_audience`, `bp_email` and `bp_add_ons` onto both the
 * session and the subscription. `handlePortalPlanEvent` in the
 * `stripe-webhooks` function reads them and writes `feature_grant:{email}`.
 * Neither had a bug.
 *
 * But that function refuses every delivery unless a signing secret is
 * configured — correctly, because accepting an unsigned event would let anyone
 * grant themselves a plan — and none of the four names it looks for was set.
 * So Stripe would have taken the money, the delivery would have been rejected
 * at the door, and `/my-plan` would have reported no plan. A silent failure on
 * the one path where silence costs a customer.
 *
 * WHY A CHECK RATHER THAN A FIX
 *
 * There was nothing to fix. The gap was configuration, and configuration is
 * exactly what a unit test cannot see: every test of the handler would have
 * passed throughout, because the handler was never the problem.
 *
 * What was missing was somebody being able to ask the question. Stripe can say
 * whether an endpoint is registered; only this side knows whether the secret
 * that verifies its deliveries is present. Neither half is sufficient, and
 * nothing put the two together.
 *
 * WHY IT NEVER TOUCHES A SECRET VALUE
 *
 * It takes the NAMES that are set, as booleans. A readiness report is
 * something an administrator looks at, and it does not need the key material
 * to answer the question — so it never receives any.
 *
 * Pure: no Deno, no network. `node --test` runs it.
 */

/** The four names `stripe-webhooks` will verify a delivery against. */
export const WEBHOOK_SECRET_NAMES = [
  'STRIPE_WEBHOOK_SECRET_SERVICES',
  'STRIPE_WEBHOOK_SECRET_STORE',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_WEBHOOK_SECRET_TEST',
] as const;

/** The event without which a completed checkout grants nothing. */
export const REQUIRED_EVENT = 'checkout.session.completed';

export interface EndpointLike {
  id?: string;
  url?: string;
  status?: string;
  livemode?: boolean;
  enabledEvents?: string[];
  pointsAtThisProject?: boolean;
}

export interface ReadinessInput {
  /** Which of `WEBHOOK_SECRET_NAMES` are set. Names only — never values. */
  secretsSet: string[];
  /** Endpoints Stripe reports, across every account that could be listed. */
  endpoints: EndpointLike[];
}

export interface ModeVerdict {
  mode: 'live' | 'test';
  /** Could a completed checkout in this mode place a grant? */
  fulfils: boolean;
  /** What is wrong, in order of what to do about it. */
  reasons: string[];
}

export interface Readiness {
  live: ModeVerdict;
  test: ModeVerdict;
  /** True when NEITHER mode can fulfil — money could be taken for nothing. */
  nothingWouldFulfil: boolean;
  secretsSet: string[];
  secretsMissing: string[];
}

/** Is this an endpoint of ours, switched on, listening for the right event? */
export function endpointUsable(endpoint: EndpointLike | null | undefined): boolean {
  if (!endpoint) return false;
  if (!endpoint.pointsAtThisProject) return false;
  // Stripe's own word for a disabled endpoint. Anything other than enabled
  // receives nothing, and reports nothing when it does not.
  if (String(endpoint.status ?? 'enabled') !== 'enabled') return false;
  const events = Array.isArray(endpoint.enabledEvents) ? endpoint.enabledEvents : [];
  // Stripe writes a wildcard as the literal '*'.
  return events.includes(REQUIRED_EVENT) || events.includes('*');
}

/**
 * Which secret could verify a delivery in this mode.
 *
 * `STRIPE_WEBHOOK_SECRET_TEST` is the only one documented as the test-mode
 * endpoint's secret, and the other three are the live accounts. The
 * verification loop tries them all against every delivery, so in principle any
 * secret could verify any event — but reporting it that way would say
 * "configured" when the only secret present belongs to the other mode, and the
 * endpoint lists are entirely separate per mode. The narrower answer is the
 * useful one.
 */
function secretForMode(secretsSet: string[], mode: 'live' | 'test'): boolean {
  if (mode === 'test') return secretsSet.includes('STRIPE_WEBHOOK_SECRET_TEST');
  return secretsSet.some((name) => name !== 'STRIPE_WEBHOOK_SECRET_TEST');
}

function verdictFor(input: ReadinessInput, mode: 'live' | 'test'): ModeVerdict {
  const reasons: string[] = [];

  const hasSecret = secretForMode(input.secretsSet, mode);
  if (!hasSecret) {
    reasons.push(
      mode === 'test'
        ? 'No STRIPE_WEBHOOK_SECRET_TEST is set, so every test-mode delivery is refused before it is read.'
        : 'No live webhook signing secret is set, so every delivery is refused before it is read.',
    );
  }

  /*
   * Endpoint lists are per mode and a key only ever sees its own, which is the
   * trap this guards: an endpoint registered in live mode is invisible to a
   * test delivery, and the delivery lands nowhere with no error to explain it.
   */
  // `filter(Boolean)` first: a list from an API can carry a null, and the
  // branches below read fields off each entry. A readiness check that throws
  // reports nothing, which is the state it exists to detect.
  const inMode = (input.endpoints || []).filter(Boolean).filter(
    (e) => Boolean(e?.livemode) === (mode === 'live'),
  );
  const usable = inMode.filter(endpointUsable);

  if (usable.length === 0) {
    if (inMode.length === 0) {
      reasons.push(`No ${mode}-mode webhook endpoint is registered against this project.`);
    } else {
      const ours = inMode.filter((e) => e?.pointsAtThisProject);
      if (ours.length === 0) {
        reasons.push(`A ${mode}-mode endpoint exists but none of them points at this project.`);
      } else if (ours.every((e) => String(e?.status ?? 'enabled') !== 'enabled')) {
        reasons.push(`This project's ${mode}-mode endpoint is not enabled.`);
      } else {
        reasons.push(`This project's ${mode}-mode endpoint is not subscribed to ${REQUIRED_EVENT}.`);
      }
    }
  }

  return { mode, fulfils: reasons.length === 0, reasons };
}

/**
 * The whole answer, for both modes.
 *
 * Both are reported rather than only the one the server's key is for, because
 * the rehearsal runs in test while the business runs in live, and "it worked
 * when I tested it" is the sentence this is meant to make impossible.
 */
export function fulfilmentReadiness(input: ReadinessInput): Readiness {
  const secretsSet = (input?.secretsSet || []).filter(Boolean);
  const live = verdictFor({ ...input, secretsSet }, 'live');
  const test = verdictFor({ ...input, secretsSet }, 'test');

  return {
    live,
    test,
    nothingWouldFulfil: !live.fulfils && !test.fulfils,
    secretsSet,
    secretsMissing: WEBHOOK_SECRET_NAMES.filter((n) => !secretsSet.includes(n)),
  };
}
