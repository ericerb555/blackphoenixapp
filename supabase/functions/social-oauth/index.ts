/**
 * The public doorway for OAuth returns.
 *
 * THE PROBLEM THIS EXISTS TO SOLVE
 *
 * `make-server-3eae23a6` runs with `verify_jwt: true`, so Supabase rejects any
 * request without a valid token before the function is even started. Facebook
 * returns a user by redirecting their *browser*, which carries no Supabase JWT
 * — so the callback was answered with a 401 by the platform and the handler
 * never ran. Two OAuth attempts sat abandoned in the store as a result: the
 * handshake started, the user approved, and nothing came back.
 *
 * Turning `verify_jwt` off for the main function was not an option. It is the
 * one platform-level gate in front of ~1,600 routes while the per-route
 * authorisation gap is still open, and trading that away to fix a redirect
 * would be a bad bargain.
 *
 * WHAT IT DOES, AND DELIBERATELY DOES NOT DO
 *
 * It forwards the redirect to the real callback with the publishable key
 * attached, and returns whatever that answers. It holds no secrets, talks to no
 * database, and makes no decisions: the Facebook app secret, the state check
 * and the token exchange all stay in social-media.tsx where they were already
 * written and tested. Duplicating an OAuth handshake in two places is how one
 * of them ends up subtly wrong.
 *
 * It is safe to leave open because it grants nothing. The `code` and `state` it
 * passes through are only worth anything to the real callback, which verifies
 * the state against a value it issued and stored, and deletes it on use.
 *
 * Deployed separately with `verify_jwt = false`, the same pattern
 * `stripe-webhooks` already uses here for the same reason.
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const PLATFORMS = new Set(['facebook', 'instagram', 'tiktok']);

function page(message: string, ok: boolean) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${ok ? 'Connected' : 'Connection failed'}</title></head>
<body style="font-family:system-ui;background:#0A0A0A;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
<div style="text-align:center;max-width:28rem;padding:1.5rem">
<h1 style="color:${ok ? '#16a34a' : '#ea580c'};font-size:1.1rem">${ok ? 'Connected' : 'Could not connect'}</h1>
<p style="color:#9ca3af;font-size:.9rem">${message}</p>
<p style="color:#6b7280;font-size:.8rem">You can close this window.</p>
</div></body></html>`;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);

  // .../functions/v1/social-oauth/<platform>
  const platform = url.pathname.split('/').filter(Boolean).pop() || '';
  if (!PLATFORMS.has(platform)) {
    return new Response(page('That connection type is not recognised.', false), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  if (!SUPABASE_URL || !ANON_KEY) {
    return new Response(page('This deployment is missing its Supabase environment.', false), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const target =
    `${SUPABASE_URL}/functions/v1/make-server-3eae23a6/social/callback/${platform}${url.search}`;

  try {
    const upstream = await fetch(target, {
      headers: { Authorization: `Bearer ${ANON_KEY}`, apikey: ANON_KEY },
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    console.error('[social-oauth] forward failed:', error);
    return new Response(page('The connection could not be completed. Please try again.', false), {
      status: 502,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
});
