/**
 * api.theblackphoenixcompany.com → the Supabase edge functions, through Cloudflare.
 *
 * WHY THIS EXISTS INSTEAD OF SUPABASE'S CUSTOM DOMAIN ADD-ON
 *
 * The firewall is worth nothing until the browser stops talking to
 * `<ref>.supabase.co` and starts talking to a hostname we control — see
 * docs/security/waf.md. The documented way to get that hostname is Supabase's
 * custom domain add-on, which is about ten dollars a month, and the reason it
 * is normally needed is narrow: a proxied CNAME makes Cloudflare send
 * `Host: api.theblackphoenixcompany.com` to Supabase, and Supabase's gateway
 * refuses a hostname it has never been told about.
 *
 * A Worker has no such problem. It does not forward the original request; it
 * makes a NEW one to the real Supabase hostname, so Host and SNI are both
 * correct by construction. That removes the only thing the add-on was buying.
 *
 * WHAT IT IS ALSO BUYING US, WHICH THE ADD-ON WAS NOT
 *
 * The origin-lock header is added HERE, in code, from an encrypted binding.
 * The Transform Rule alternative puts the shared secret into a rules screen in
 * a dashboard, where it is visible to anybody with read access to the account
 * and gets copied into screenshots of rules screens.
 *
 * WHAT IS DELIBERATELY NOT DONE HERE
 *
 *  - No caching. Every path behind this is either authenticated, a mutation,
 *    or priced per call; a cached 200 on somebody else's invoice is the kind
 *    of bug that takes a week to believe.
 *  - No header rewriting beyond the one. The server sets its own CORS, cost
 *    and auth headers and they travel untouched.
 *  - No redirect following. `redirect: 'manual'` so a 3xx reaches the browser
 *    as a 3xx, which is what the app's own fetches expect.
 *  - Nothing is logged. The URLs here carry quote ids, customer emails in
 *    query strings and signed storage links; a console.log in a Worker is a
 *    retention decision nobody made.
 *
 * DEPLOYING IT
 *
 *  1. Cloudflare → Workers & Pages → Create → Worker. Paste this file.
 *  2. Settings → Variables → add a SECRET (not a plaintext variable) named
 *     EDGE_ORIGIN_SECRET. Generate it with `openssl rand -hex 32` and keep it
 *     out of chats and tickets.
 *  3. Settings → Domains & Routes → add route
 *     `api.theblackphoenixcompany.com/*` on zone theblackphoenixcompany.com.
 *     No DNS record is needed: the proxied wildcard `*` already resolves that
 *     name through Cloudflare, and a Worker route intercepts before the
 *     request reaches the wildcard's Vercel origin.
 *
 *     ⚠ ON THE SAME SCREEN, DISABLE THE workers.dev ROUTE.
 *
 *     Cloudflare publishes every Worker at `<name>.<account>.workers.dev`
 *     unless told not to. For this Worker that hostname is a second public
 *     entrance which ADDS the origin-lock header — so it passes the lock
 *     that is the entire point of this file, while sitting outside the zone
 *     where the WAF rules, the rate limits and the managed rulesets live.
 *     Leaving it on is building the firewall and a door beside it, and the
 *     door is the one with no cameras.
 *  4. Set the SAME secret on the server:
 *     `supabase secrets set EDGE_ORIGIN_SECRET=<it> --project-ref plzsvzwwcdopnawtiwzm`
 *     It is cached for 60 seconds. Until `ORIGIN_LOCK_ENFORCE=true` the server
 *     only logs `[originlock] would-block`, which is the observation window.
 *
 * WHAT THIS DOES NOT COVER
 *
 * Only the edge functions. Supabase Auth, Realtime (`wss://`), Storage and the
 * database REST API are separate services on the same hostname and the browser
 * still reaches them directly. The origin lock is middleware inside our own
 * Hono app, so it never applied to those either — locking this hostname does
 * not break them, and it also does not protect them.
 */

const SUPABASE_HOST = 'plzsvzwwcdopnawtiwzm.supabase.co';

export default {
  async fetch(request, env) {
    /*
     * A missing secret is refused rather than proxied without the header.
     *
     * The alternative is worse than it looks: the request would succeed today,
     * because the server fails open while no secret is configured, and then
     * start failing the hour somebody enforces the lock — with the cause
     * sitting in a binding nobody is looking at.
     */
    if (!env.EDGE_ORIGIN_SECRET) {
      return new Response('This proxy is not configured.', { status: 503 });
    }

    const url = new URL(request.url);
    url.protocol = 'https:';
    url.hostname = SUPABASE_HOST;
    url.port = '';

    const headers = new Headers(request.headers);
    headers.set('X-Edge-Auth', env.EDGE_ORIGIN_SECRET);
    /*
     * Host is dropped so fetch derives it from the new URL. Left in place it
     * would travel as api.theblackphoenixcompany.com and Supabase's gateway
     * would refuse the hostname — the exact failure the add-on exists to fix,
     * reintroduced by hand.
     */
    headers.delete('host');

    /*
     * EVERY OTHER HEADER TRAVELS, AND cf-connecting-ip ESPECIALLY.
     *
     * The first draft of this file deleted Cloudflare's hop headers on the
     * reasoning that they describe the connection to US rather than to
     * Supabase. That would have quietly disabled a control: `clientIp()` in
     * ipReputation.ts reads `cf-connecting-ip` first and falls back to the
     * LAST entry of x-forwarded-for, which on this path is a Cloudflare
     * address. Every visitor would have scored as one client, and the
     * reputation middleware bans a client that misbehaves — so one abusive
     * request would have thrown every user out at once.
     *
     * A copy goes in x-client-ip as well. Not because the server reads it
     * today, but because Supabase sits behind its own Cloudflare, which may
     * overwrite cf-connecting-ip with the address of whoever opened the
     * connection — this Worker. If it does, per-client scoring is pooled
     * anyway and the fix is server-side: trust an explicit header only when
     * the X-Edge-Auth match proves the request came through here. That is a
     * measurement to take once this is live, not a guess to build on now.
     */
    const seenIp = request.headers.get('cf-connecting-ip');
    if (seenIp) headers.set('x-client-ip', seenIp);

    // GET and HEAD must carry no body, and a ReadableStream is passed through
    // rather than buffered so a large upload does not have to fit in memory.
    const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

    const upstream = new Request(url.toString(), {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      redirect: 'manual',
    });

    try {
      return await fetch(upstream);
    } catch (err) {
      /*
       * 502, and a sentence that says which hop failed.
       *
       * "Failed to fetch" in a browser console cost three rounds of debugging
       * on this project once already. A caller that gets this at least knows
       * the request reached Cloudflare and died on the way to Supabase.
       */
      return new Response(
        'The API could not be reached through the firewall.',
        { status: 502, headers: { 'Content-Type': 'text/plain' } },
      );
    }
  },
};
