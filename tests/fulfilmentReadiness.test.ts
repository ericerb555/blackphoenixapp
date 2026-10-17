/**
 * Would a paid subscription actually grant anything?
 *
 * THE FIRST TEST IS THE REAL ONE
 *
 * `the state production was in on 2026-10-17` is not a hypothetical. Every
 * piece of the money path was built and correct — `/plan-checkout` stamped the
 * metadata, `handlePortalPlanEvent` read it and wrote the grant — and a
 * customer would still have paid and received nothing, because no webhook
 * signing secret was configured and the webhook function refuses an unsigned
 * delivery. Correctly: accepting one would let anybody grant themselves a plan.
 *
 * No unit test of the handler would have caught that, because the handler was
 * never wrong. This asserts the thing that was: that nobody could ask whether
 * the path was wired.
 *
 * WHY BOTH MODES ARE ASSERTED EVERYWHERE
 *
 * Stripe keeps separate endpoint lists per mode and a key only sees its own.
 * An endpoint registered in live mode is invisible to a test delivery, which
 * lands nowhere and reports nothing. "It worked when I tested it" is the
 * sentence these tests exist to make impossible.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fulfilmentReadiness, endpointUsable, WEBHOOK_SECRET_NAMES, REQUIRED_EVENT,
  type EndpointLike,
} from '../supabase/functions/server/fulfilmentReadiness.ts';

const ours = (over: Partial<EndpointLike> = {}): EndpointLike => ({
  id: 'we_1',
  url: 'https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/stripe-webhooks',
  status: 'enabled',
  livemode: true,
  enabledEvents: [REQUIRED_EVENT, 'customer.subscription.deleted'],
  pointsAtThisProject: true,
  ...over,
});

/* ── what was actually true ───────────────────────────────────────────── */

test('the state production was in on 2026-10-17: nothing would fulfil', () => {
  // No webhook secret of any kind, and no endpoint confirmed.
  const verdict = fulfilmentReadiness({ secretsSet: [], endpoints: [] });

  assert.equal(verdict.nothingWouldFulfil, true);
  assert.equal(verdict.live.fulfils, false);
  assert.equal(verdict.test.fulfils, false);
  assert.deepEqual(verdict.secretsMissing, [...WEBHOOK_SECRET_NAMES]);

  // And it says both of the two things that were wrong, not just the first.
  const why = [...verdict.test.reasons, ...verdict.live.reasons].join(' ');
  assert.match(why, /signing secret/i);
  assert.match(why, /endpoint/i);
});

test('the rehearsal case: a test secret and a test endpoint, live still not ready', () => {
  const verdict = fulfilmentReadiness({
    secretsSet: ['STRIPE_WEBHOOK_SECRET_TEST'],
    endpoints: [ours({ livemode: false })],
  });

  assert.equal(verdict.test.fulfils, true, verdict.test.reasons.join(' '));
  assert.deepEqual(verdict.test.reasons, []);
  // Live is deliberately still false: rehearsing proves the rehearsal.
  assert.equal(verdict.live.fulfils, false);
  assert.equal(verdict.nothingWouldFulfil, false);
});

test('fully wired in both modes', () => {
  const verdict = fulfilmentReadiness({
    secretsSet: ['STRIPE_WEBHOOK_SECRET_SERVICES', 'STRIPE_WEBHOOK_SECRET_TEST'],
    endpoints: [ours({ livemode: true }), ours({ id: 'we_2', livemode: false })],
  });
  assert.equal(verdict.live.fulfils, true, verdict.live.reasons.join(' '));
  assert.equal(verdict.test.fulfils, true, verdict.test.reasons.join(' '));
  assert.equal(verdict.nothingWouldFulfil, false);
});

/* ── the per-mode trap, which is the subtle one ───────────────────────── */

test('a LIVE endpoint does not make TEST ready, however good the secret', () => {
  // The exact trap: Stripe's lists are separate, so a live endpoint is
  // invisible to a test delivery and the delivery reports nothing anywhere.
  const verdict = fulfilmentReadiness({
    secretsSet: ['STRIPE_WEBHOOK_SECRET_TEST', 'STRIPE_WEBHOOK_SECRET_SERVICES'],
    endpoints: [ours({ livemode: true })],
  });
  assert.equal(verdict.live.fulfils, true);
  assert.equal(verdict.test.fulfils, false);
  assert.match(verdict.test.reasons.join(' '), /test-mode webhook endpoint/i);
});

test('a TEST endpoint does not make LIVE ready either', () => {
  const verdict = fulfilmentReadiness({
    secretsSet: ['STRIPE_WEBHOOK_SECRET_SERVICES', 'STRIPE_WEBHOOK_SECRET_TEST'],
    endpoints: [ours({ livemode: false })],
  });
  assert.equal(verdict.test.fulfils, true);
  assert.equal(verdict.live.fulfils, false);
});

test('the test secret alone does not satisfy live mode', () => {
  const verdict = fulfilmentReadiness({
    secretsSet: ['STRIPE_WEBHOOK_SECRET_TEST'],
    endpoints: [ours({ livemode: true }), ours({ id: 'we_2', livemode: false })],
  });
  assert.equal(verdict.live.fulfils, false);
  assert.match(verdict.live.reasons.join(' '), /signing secret/i);
});

test('any live secret name satisfies live mode', () => {
  for (const name of ['STRIPE_WEBHOOK_SECRET_SERVICES', 'STRIPE_WEBHOOK_SECRET_STORE', 'STRIPE_WEBHOOK_SECRET']) {
    const verdict = fulfilmentReadiness({
      secretsSet: [name],
      endpoints: [ours({ livemode: true })],
    });
    assert.equal(verdict.live.fulfils, true, `${name} should satisfy live: ${verdict.live.reasons.join(' ')}`);
  }
});

/* ── which endpoints count ────────────────────────────────────────────── */

test('an endpoint pointing somewhere else is not ours', () => {
  assert.equal(endpointUsable(ours({ pointsAtThisProject: false })), false);
});

test('a disabled endpoint receives nothing, and says nothing when it does not', () => {
  assert.equal(endpointUsable(ours({ status: 'disabled' })), false);
});

test('an endpoint not subscribed to the completion event cannot fulfil', () => {
  assert.equal(endpointUsable(ours({ enabledEvents: ['invoice.payment_succeeded'] })), false);
  assert.equal(endpointUsable(ours({ enabledEvents: [] })), false);
  assert.equal(endpointUsable(ours({ enabledEvents: undefined })), false);
});

test('a wildcard subscription counts', () => {
  // Stripe writes "send me everything" as the literal '*'.
  assert.equal(endpointUsable(ours({ enabledEvents: ['*'] })), true);
});

test('a missing endpoint is not usable rather than a crash', () => {
  assert.equal(endpointUsable(null), false);
  assert.equal(endpointUsable(undefined), false);
  assert.equal(endpointUsable({}), false);
});

test('status absent is treated as enabled, which is how Stripe omits it', () => {
  assert.equal(endpointUsable(ours({ status: undefined })), true);
});

/* ── the reason has to say what to do ─────────────────────────────────── */

test('an endpoint of ours missing the event is reported as the event, not as absence', () => {
  // These three failures need three different actions, so they must not
  // collapse into one message.
  const noEvent = fulfilmentReadiness({
    secretsSet: ['STRIPE_WEBHOOK_SECRET_SERVICES'],
    endpoints: [ours({ enabledEvents: ['invoice.payment_succeeded'] })],
  });
  assert.match(noEvent.live.reasons.join(' '), new RegExp(REQUIRED_EVENT));

  const notOurs = fulfilmentReadiness({
    secretsSet: ['STRIPE_WEBHOOK_SECRET_SERVICES'],
    endpoints: [ours({ pointsAtThisProject: false })],
  });
  assert.match(notOurs.live.reasons.join(' '), /points at this project/i);

  const disabled = fulfilmentReadiness({
    secretsSet: ['STRIPE_WEBHOOK_SECRET_SERVICES'],
    endpoints: [ours({ status: 'disabled' })],
  });
  assert.match(disabled.live.reasons.join(' '), /not enabled/i);
});

/* ── shapes that arrive from an API ───────────────────────────────────── */

test('missing input is refused rather than throwing', () => {
  const verdict = fulfilmentReadiness({ secretsSet: [], endpoints: [] });
  assert.equal(verdict.nothingWouldFulfil, true);
  assert.doesNotThrow(() => fulfilmentReadiness({ secretsSet: [], endpoints: [null as any] }));
  assert.doesNotThrow(() => fulfilmentReadiness({} as any));
});

test('blank secret names are ignored rather than counted', () => {
  const verdict = fulfilmentReadiness({
    secretsSet: ['', undefined as any, 'STRIPE_WEBHOOK_SECRET_TEST'],
    endpoints: [ours({ livemode: false })],
  });
  assert.deepEqual(verdict.secretsSet, ['STRIPE_WEBHOOK_SECRET_TEST']);
  assert.equal(verdict.test.fulfils, true);
});

test('no secret value could ever appear in the report', () => {
  // The report takes names, so there is nothing for a value to ride in on.
  const verdict = fulfilmentReadiness({
    secretsSet: ['STRIPE_WEBHOOK_SECRET_TEST'],
    endpoints: [ours({ livemode: false })],
  });
  const serialised = JSON.stringify(verdict);
  assert.ok(!/whsec_/.test(serialised), 'a signing secret must never reach the report');
});
