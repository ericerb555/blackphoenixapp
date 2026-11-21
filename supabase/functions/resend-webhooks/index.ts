/**
 * Resend's delivery events, getting past the gate that would refuse them.
 *
 * WHY THIS FUNCTION EXISTS AT ALL
 *
 * `make-server-3eae23a6` runs with `verify_jwt = true`, and `config.toml` says
 * why in as many words: it is the only platform-level gate in front of that
 * function while the per-route auth gap is open, and it must stay on.
 *
 * A webhook carries no Supabase token. Resend posts a signature and a body,
 * so every event was being refused by the gateway with
 * `UNAUTHORIZED_NO_AUTH_HEADER` before the handler saw a byte of it. The
 * route over there was written, deployed, and unreachable — I had tested it
 * by hand WITH an anon key, read the 401 for an unsigned request as the
 * handler refusing correctly, and never checked who was doing the refusing.
 *
 * `stripe-webhooks` solved this first and this is the same shape: a function
 * with the JWT gate off, which verifies the provider's own signature and then
 * forwards the original bytes inward with a service-role token.
 *
 * WHAT IT DOES NOT DO
 *
 * It does not touch the database and it holds no logic about what an event
 * means. That all lives in `resendDelivery.ts` and the route in the main
 * server, which is tested. This is a doorway, and a doorway with business
 * logic in it is a second place to fix things.
 */
import { verifyResendSignature } from '../server/resendDelivery.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const SIGNING_SECRET = Deno.env.get('RESEND_WEBHOOK_SECRET') || '';

const TARGET = `${SUPABASE_URL}/functions/v1/make-server-3eae23a6/resend/webhook`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const raw = await req.text();

  /*
   * Verified here as well as inside, deliberately.
   *
   * The route beyond this one checks the signature too, and that is the gate
   * that matters — this function must never be the only thing standing
   * between a stranger and a delivery record. Checking here as well means a
   * forged event is refused without a service-role request being made on its
   * behalf, which keeps the inner route's own refusals meaningful in the log.
   */
  const verdict = await verifyResendSignature({
    secret: SIGNING_SECRET,
    id: req.headers.get('svix-id') || '',
    timestamp: req.headers.get('svix-timestamp') || '',
    signatureHeader: req.headers.get('svix-signature') || '',
    body: raw,
  });

  if (!verdict.ok) {
    console.log(`[resend-webhooks] refused: ${verdict.reason}`);
    /* One answer for every reason. Naming which part failed tells a guesser
       which part to change. */
    return new Response(JSON.stringify({ received: false }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    console.error('[resend-webhooks] cannot forward: SUPABASE_URL or service role key is unset');
    /* 500, not 200: this one IS worth Resend retrying, because the event is
       good and only our own plumbing is missing. */
    return new Response(JSON.stringify({ received: false }), { status: 500 });
  }

  try {
    const res = await fetch(TARGET, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_ROLE}`,
        /* Passed through so the inner route verifies the ORIGINAL signature
           against the ORIGINAL bytes, rather than trusting this hop. */
        'svix-id': req.headers.get('svix-id') || '',
        'svix-timestamp': req.headers.get('svix-timestamp') || '',
        'svix-signature': req.headers.get('svix-signature') || '',
      },
      body: raw,
    });

    const text = await res.text();
    console.log(`[resend-webhooks] forwarded, inner status ${res.status}`);
    return new Response(text, {
      status: res.ok ? 200 : res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error(`[resend-webhooks] forward failed: ${err instanceof Error ? err.message : err}`);
    return new Response(JSON.stringify({ received: false }), { status: 502 });
  }
});
