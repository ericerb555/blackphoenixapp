/**
 * make-server-57095a78 — RETIRED.
 *
 * This function is superseded by `make-server-3eae23a6`, which the app calls
 * exclusively. The old deployment was left running and shared the live dataset:
 * its kv_store.tsx read and wrote `kv_store_57095a78`, the table holding every
 * production row. A second, older server with write access to live data — one
 * running a known auth bug the repo had already fixed — is the risk this stub
 * removes.
 *
 * It is a stub rather than a deletion because something was calling the
 * function every 60 seconds and could not be identified: `edge_logs` does not
 * record function invocations, and `function_logs` carries no path or
 * user-agent. Before retirement, `/health` was the ONLY route that still
 * answered 200 — every other route returned 401 "Sign in required" because of
 * the root-mount `use('*')` guard in plans.tsx. So whatever polls this almost
 * certainly polls `/health`, and that is the one thing kept working.
 *
 * Everything else answers 410 Gone with a pointer to the live function, which
 * is a far better failure than a silent 401 for anyone still wired to it.
 *
 * This stub holds NO database credentials and imports no kv module, so it
 * cannot touch `kv_store_57095a78` at all.
 *
 * The exact source this replaced is archived at
 * supabase/functions/_retired/make-server-57095a78-2026-08-15/ with restore
 * instructions.
 */

const LIVE_FUNCTION = 'make-server-3eae23a6';
const RETIRED_ON = '2026-08-15';

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

  // Keep the health check answering exactly as before so an uptime monitor
  // does not start alarming. `retired: true` is added so anyone reading the
  // response — rather than just its status code — learns what happened.
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
    useInstead: `/functions/v1/${LIVE_FUNCTION}${pathname.replace(/^\/make-server-57095a78/, '')}`,
  }, 410);
});
