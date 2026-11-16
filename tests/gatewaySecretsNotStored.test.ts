/**
 * Payment gateway credentials must never reach browser storage.
 *
 * Until 2026-11-16 the payment centre wrote `api_key`, `api_secret` and
 * `webhook_secret` into `localStorage` in plaintext, under
 * `gateway_config_<gateway>`. That put a payment processor's secret — the
 * kind that moves money, and the webhook secret that authenticates its
 * callbacks — on the disk of whatever machine an admin last opened the screen
 * on: readable by anyone with that browser profile, carried along by whatever
 * syncs it, and surviving every sign-out, because nothing ever cleared it.
 *
 * What made it indefensible rather than merely risky is that nothing read
 * them back. No request carried them; the server deliberately keeps only
 * `is_active` and `test_mode`. The form wrote them, re-read them to fill
 * itself in, and showed a "Configured" badge. That is the entire use. The
 * exposure was unbounded and bought nothing.
 *
 * So the rule is asserted here rather than left as a habit in one component.
 * `withoutGatewaySecrets` is the only shape allowed into storage, and these
 * tests fail if a secret field can survive it — including through the paths
 * that are easy to forget: a config that arrives already carrying secrets
 * from an older build, and the round trip through JSON that storage actually
 * performs.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withoutGatewaySecrets } from '../src/app/lib/gatewaySecrets.ts';

const SECRET_FIELDS = ['api_key', 'api_secret', 'webhook_secret'] as const;

const base = {
  gateway_name: 'stripe',
  is_active: true,
  test_mode: false,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
} as any;

const withSecrets = () => ({
  ...base,
  api_key: 'pk_live_should_never_be_stored',
  api_secret: 'sk_live_should_never_be_stored',
  webhook_secret: 'whsec_should_never_be_stored',
});

test('every secret field is dropped', () => {
  const stored = withoutGatewaySecrets(withSecrets()) as Record<string, unknown>;
  for (const field of SECRET_FIELDS) {
    assert.ok(!(field in stored), `${field} survived into the stored config`);
  }
});

test('no secret VALUE appears anywhere in what gets serialised', () => {
  // Checking the keys alone would miss a secret that got copied into some
  // other field — which is exactly how this class of leak comes back.
  const json = JSON.stringify(withoutGatewaySecrets(withSecrets()));
  for (const value of Object.values(withSecrets())) {
    if (typeof value === 'string' && value.includes('should_never_be_stored')) {
      assert.ok(!json.includes(value), `a secret value leaked into storage: ${json}`);
    }
  }
});

test('the non-secret state is preserved exactly', () => {
  const stored = withoutGatewaySecrets(withSecrets());
  assert.equal(stored.gateway_name, base.gateway_name);
  assert.equal(stored.is_active, true);
  assert.equal(stored.test_mode, false);
  assert.equal(stored.created_at, base.created_at);
  assert.equal(stored.updated_at, base.updated_at);
});

test('entering credentials is remembered as a boolean, not as the credentials', () => {
  assert.equal(withoutGatewaySecrets(withSecrets()).has_credentials, true);
  assert.equal(withoutGatewaySecrets({ ...base, api_key: 'only-the-key' }).has_credentials, true);
  assert.equal(withoutGatewaySecrets({ ...base, webhook_secret: 'only-the-hook' }).has_credentials, true);
});

test('a config with no credentials is not marked as having them', () => {
  assert.equal(withoutGatewaySecrets({ ...base }).has_credentials, false);
  assert.equal(withoutGatewaySecrets({ ...base, api_key: '' }).has_credentials, false);
});

test('an existing has_credentials is not lost when the secrets are already gone', () => {
  // The purge path: a config read back from storage has no secrets left, and
  // must not silently downgrade to "never configured" and lose the badge.
  const alreadyClean = { ...base, has_credentials: true };
  assert.equal(withoutGatewaySecrets(alreadyClean).has_credentials, true);
});

test('the function is idempotent', () => {
  // It runs on load as the purge and again on save; two passes must agree, or
  // the purge itself becomes a source of drift.
  const once = withoutGatewaySecrets(withSecrets());
  const twice = withoutGatewaySecrets(once);
  assert.deepEqual(twice, once);
});

test('it does not mutate the caller: in-memory secrets stay usable this session', () => {
  // The open form still needs the values the admin just typed. Stripping a
  // shared object in place would blank the form on save.
  const live = withSecrets();
  withoutGatewaySecrets(live);
  assert.equal(live.api_secret, 'sk_live_should_never_be_stored');
});

test('the stored shape survives the JSON round trip storage performs', () => {
  const stored = JSON.parse(JSON.stringify(withoutGatewaySecrets(withSecrets())));
  for (const field of SECRET_FIELDS) {
    assert.ok(!(field in stored), `${field} came back after a JSON round trip`);
  }
  assert.equal(stored.has_credentials, true);
});
