/**
 * make-server-824f083c — RETIRED 2026-08-30.
 *
 * An older server that was still ACTIVE, still answering, and holding its own
 * copy of live business data in `kv_store_824f083c` — 54 rows covering
 * invoices, subscriptions, customers, gift cards and ad campaigns.
 *
 * WHY IT HAD TO GO
 *
 * Its authorisation was patchy in the worst possible places. `payments-
 * transactions.ts`, `payments-methods.ts` and `payments-refunds.ts` contained
 * no authorisation check at all — not a weak one, none — and `/invoices`
 * answered an unprivileged test account with a 500 that leaked an internal
 * table name, which means it queried the database before asking who was
 * calling. It also predates the whole `user_metadata` privilege-escalation fix,
 * so even its guarded routes trusted a bag the browser can write.
 *
 * Nothing in the shipping app calls it. The 598 apparent references in `src/`
 * were editor backup files, `deploy.sh`/`deploy.bat` and a diagnostic HTML
 * page; no compiled source imports it. Its KV table is its own, separate from
 * `kv_store_57095a78` where the live data actually lives, so retiring it
 * removes an exposure without removing a capability.
 *
 * `/health` is kept answering 200 because an unidentified caller polls these
 * functions and there is no way to tell which path it uses — `function_logs`
 * carries no path or user-agent. Everything else answers 410 Gone, which is a
 * far better failure than a silent 401 for anyone still wired to it.
 *
 * This stub holds NO database credentials and imports no kv module, so it
 * cannot touch `kv_store_824f083c` at all.
 *
 * The 44 files this replaced are archived at
 * supabase/functions/_retired/make-server-824f083c-2026-08-30/.
 */

const LIVE_FUNCTION = 'make-server-3eae23a6';
const RETIRED_ON = '2026-08-30';
const SLUG = 'make-server-824f083c';

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
