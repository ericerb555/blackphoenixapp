/**
 * A webhook endpoint a provider cannot reach is not an endpoint.
 *
 * WHAT HAPPENED
 *
 * The Resend delivery route was written, tested, deployed — and unreachable.
 * `make-server-3eae23a6` runs with `verify_jwt = true`, so the Supabase
 * gateway refuses anything without a Supabase token before the function sees
 * it, and a webhook carries no such token:
 *
 *     POST .../make-server-3eae23a6/resend/webhook      (no auth header)
 *     → {"code":"UNAUTHORIZED_NO_AUTH_HEADER"}
 *
 * I had tested that route by hand WITH an anon key. The unsigned request came
 * back 401 and I read it as the handler refusing correctly. It was the
 * gateway, and the handler had never run. The same mistake as reading a 401
 * for a 404 earlier the same night: a refusal is not proof of the thing you
 * hoped was refusing.
 *
 * `config.toml` is explicit that the main function's gate must stay on — it
 * is the only platform-level gate in front of it. So a provider callback
 * needs its own function with the gate off, verifying the provider's own
 * signature instead. `stripe-webhooks` established that shape and its comment
 * records the trap that caught it: deployed with verify_jwt false but not
 * LISTED, so the next deploy would have silently switched the gate on and
 * killed every delivery.
 *
 * This test is that trap, generalised.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const config = readFileSync(join(root, 'supabase/config.toml'), 'utf8');

/** Every function that receives a provider callback and cannot send a token. */
const WEBHOOK_FUNCTIONS = ['stripe-webhooks', 'resend-webhooks'];

/** The verify_jwt value declared for a slug, or null when it has no section. */
function verifyJwtFor(slug: string): string | null {
  const start = config.indexOf(`[functions.${slug}]`);
  if (start === -1) return null;
  const next = config.indexOf('[functions.', start + 1);
  const section = config.slice(start, next === -1 ? undefined : next);
  const m = section.match(/verify_jwt\s*=\s*(true|false)/);
  return m ? m[1] : null;
}

test('every webhook function has the JWT gate off', () => {
  for (const slug of WEBHOOK_FUNCTIONS) {
    assert.equal(
      verifyJwtFor(slug), 'false',
      `${slug} receives posts from a provider that cannot send a Supabase token. `
      + 'With verify_jwt on, the gateway refuses every event before the function '
      + 'runs and the endpoint looks deployed while being dead.',
    );
  }
});

/**
 * Stated, not defaulted.
 *
 * The CLI defaults verify_jwt to TRUE. A function deployed with it off but
 * missing from this file is one deploy away from being silently gated —
 * which is the trap the stripe entry was written to close.
 */
test('the setting is written down rather than left to the default', () => {
  for (const slug of WEBHOOK_FUNCTIONS) {
    assert.notEqual(
      verifyJwtFor(slug), null,
      `${slug} has no verify_jwt in config.toml. The CLI defaults it to true, so `
      + 'the next deploy would switch the gate on and kill every delivery.',
    );
  }
});

test('the main server keeps its gate ON', () => {
  assert.equal(
    verifyJwtFor('make-server-3eae23a6'), 'true',
    'the main function is the one carrying every other route; its gate is the only '
    + 'platform-level check in front of them and must not be turned off to make a '
    + 'webhook work',
  );
});

test('each webhook function has the entrypoint it claims', () => {
  for (const slug of WEBHOOK_FUNCTIONS) {
    const start = config.indexOf(`[functions.${slug}]`);
    const next = config.indexOf('[functions.', start + 1);
    const section = config.slice(start, next === -1 ? undefined : next);
    const m = section.match(/entrypoint\s*=\s*"([^"]+)"/);
    assert.ok(m, `${slug} declares no entrypoint`);

    const path = join(root, 'supabase', m![1].replace(/^\.\//, ''));
    assert.ok(
      existsSync(path),
      `${slug} points at ${m![1]}, which does not exist — the deploy fails with `
      + '"Entrypoint path does not exist"',
    );
  }
});

/**
 * And the shim must not become the only thing checking the signature.
 *
 * It verifies, and so does the route it forwards to. If the inner check were
 * dropped, anything that could reach the inner route — anything holding a
 * service-role token — could write a delivery verdict with no signature at
 * all.
 */
test('the shim forwards the signature rather than vouching for it', () => {
  const shim = readFileSync(join(root, 'supabase/functions/resend-webhooks/index.ts'), 'utf8');

  assert.match(shim, /verifyResendSignature/, 'the shim no longer checks the signature');
  for (const header of ['svix-id', 'svix-timestamp', 'svix-signature']) {
    assert.ok(
      shim.includes(`'${header}': req.headers.get('${header}')`),
      `${header} is not passed through, so the inner route cannot verify the original bytes`,
    );
  }

  const server = readFileSync(join(root, 'supabase/functions/server/trash-estimator.tsx'), 'utf8')
    + readFileSync(join(root, 'supabase/functions/server/index.tsx'), 'utf8');
  assert.match(
    server, /verifyResendSignature/,
    'the inner route stopped verifying, leaving the shim as the only gate',
  );
});
