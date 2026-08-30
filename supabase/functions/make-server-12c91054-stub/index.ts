/**
 * make-server-12c91054 — RETIRED 2026-08-30.
 *
 * An older server that was still ACTIVE and still answering, holding its own
 * copy of business data in `kv_store_12c91054` — 47 rows covering work
 * requests, town permits, deck renders, geocoding results and plot plans.
 *
 * WHY IT HAD TO GO
 *
 * `/customers` answered an unprivileged test account with `HTTP 200` and a JSON
 * body. The list came back empty, but that is because the customers in this
 * table sit under other keys — not because anything refused the request. It
 * carries 67 routes and the same `user_metadata` authority pattern that was
 * removed from the live server on 2026-08-30, in four places, so its access
 * checks trusted a metadata bag the browser can write.
 *
 * Nothing in the shipping app calls it, and its KV table is its own, separate
 * from `kv_store_57095a78` where the live data actually lives. Retiring it
 * removes an exposure without removing a capability.
 *
 * `/health` is kept answering 200 because an unidentified caller polls these
 * functions and there is no way to tell which path it uses — `function_logs`
 * carries no path or user-agent. Everything else answers 410 Gone, which is a
 * far better failure than a silent 401 for anyone still wired to it.
 *
 * This stub holds NO database credentials and imports no kv module, so it
 * cannot touch `kv_store_12c91054` at all.
 *
 * The source this replaced is archived at
 * supabase/functions/_retired/make-server-12c91054-2026-08-30/.
 */

const LIVE_FUNCTION = 'make-server-3eae23a6';
const RETIRED_ON = '2026-08-30';
const SLUG = 'make-server-12c91054';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

Deno.serve((req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const { pathname } = new URL(req.url);

  if (pathname.endsWith('/health') || pathname.endsWith('/health/')) {
    return json({
      status: 'ok',
      retired: true,
      retiredOn: RETIRED_ON,
      message: `This function is retired. Live API: ${LIVE_FUNCTION}.`,
    }, 200);
  }

  return json({
    success: false,
    error: 'This API has been retired.',
    retiredOn: RETIRED_ON,
    useInstead: `/functions/v1/${LIVE_FUNCTION}${pathname.replace(new RegExp(`^/${SLUG}`), '')}`,
  }, 410);
});
