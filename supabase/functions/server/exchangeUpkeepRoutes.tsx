/**
 * Phoenix Exchange — the clock that keeps the towns current.
 *
 * WHY IT EXISTS
 *
 * Eric, 2026-10-15: *"how is the ai automation to keep adding town to the
 * phoenix exchange doing i done see any new towns added or adding?"*
 *
 * It was doing nothing, because it had never been built. Six pg_cron jobs run
 * this business and none of them touched the Exchange: towns were opened and
 * compiled by hand, and nothing ever re-checked a town once compiled, so a
 * business that closed or moved stayed exactly as OpenStreetMap had it on the
 * day it was imported. `tasks/exchange-more-towns-and-upkeep.md` planned "a
 * seventh cron job refreshing one town per run, slowest-first" and the
 * decision recorded on 2026-10-13 was weekly, one town per tick. This is that.
 *
 * WHAT IT DOES AND, MORE IMPORTANTLY, WHAT IT WILL NOT
 *
 *   it refreshes      one town per tick, the one longest unrefreshed, with
 *                     never-compiled towns first
 *   it never opens    choosing where the Exchange operates is not a decision
 *                     to hand a schedule
 *   it never promotes a town goes live only when Eric says so — his decision,
 *                     recorded in the plan. A clock that published towns would
 *                     be judging whether a town is worth a resident's time,
 *                     which is the one thing the four-step flow in
 *                     `ExchangeTowns.tsx` deliberately keeps in a person's
 *                     hands.
 *   it never invents  `mergeListing` refuses a claimed listing outright, never
 *                     overwrites an answer on an unclaimed one, and only fills
 *                     empty fields. That is the property that makes a repeat
 *                     run safe rather than a way to overwrite the businesses
 *                     who actually turned up.
 *
 * ONE TOWN PER TICK, AND THAT IS NOT TIMIDITY
 *
 * Overpass is free and shared and entitled to refuse. It answered 504 on two
 * of three towns during testing, repeatedly, and the first fetcher written
 * against it fired twelve queries back to back and was blocked. So a tick is
 * one town, a failure costs one town, and the choice of which — including the
 * decision to do nothing at all when everything is fresh — lives in
 * `exchangeUpkeep.ts` where it is tested.
 *
 * THE TRAP THIS FILE WAS WRITTEN AROUND, WHICH HAS NOW COME UP FIVE TIMES
 *
 * A scheduler carries only the publishable key, which resolves to no user, and
 * the global auth wall answers "Sign in required." to any path it does not
 * recognise. `/store/cron-tick`, `/autopilot/cron-tick`, `/store/watchdog` and
 * `/cron/screening/expire-invitations` each had to be listed in
 * `PUBLIC_POST_PATHS` for exactly this reason, and the autopilot one was found
 * only because somebody went to arm it. So `/exchange/cron-tick` is listed
 * there, with the argument written out beside it.
 *
 * "Public" in that list means the gate does not ask for a session. It does not
 * mean unauthenticated: this route carries a shared secret in a header, read
 * from `private_cron_config` so it can be rotated without a deploy, and
 * REFUSES EVERYTHING while no secret is configured. An unset secret must never
 * read as "no check required".
 */

import { Hono } from "npm:hono@4";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import { isStaffRequest } from "./requireStaff.ts";
import { secretMatches, leaseIsHeld } from "./storeTickRules.ts";
import { ingestTerritory } from "./exchangeIngestRun.ts";
import {
  pickTownToRefresh, describeRun, REFRESH_AFTER_DAYS, type UpkeepRun,
} from "./exchangeUpkeep.ts";

export const exchangeUpkeepRoutes = new Hono();

const PREFIX = "/make-server-3eae23a6";
const RUNS_KEY = "exchange:upkeep:runs";
const LOCK_KEY = "exchange:upkeep:lock";
const SECRET_ROW = "exchange_cron_secret";
const SECRET_HEADER = "X-Exchange-Cron-Secret";
const SECRET_ENV = "EXCHANGE_CRON_SECRET";

/** How many runs to keep. A year of weekly ticks, so the record outlives the year. */
const RUN_HISTORY = 60;

/**
 * Long enough that a slow Overpass answer cannot be overtaken, short enough
 * that a crashed tick does not block the next one for a week. Overpass has
 * taken minutes to answer and the function's own ceiling is well under this.
 */
const LOCK_MINUTES = 20;

function service() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/**
 * The secret this route expects, or null.
 *
 * The database row first so it can be rotated in one place without a deploy,
 * the environment as a fallback, and null when neither yields anything — which
 * the caller treats as "refuse", never as "no check needed".
 */
async function expectedSecret(): Promise<string | null> {
  try {
    const { data } = await service()
      .from("private_cron_config")
      .select("value")
      .eq("key", SECRET_ROW)
      .maybeSingle();
    const row = String(data?.value || "").trim();
    if (row) return row;
  } catch {
    // A database blip must not turn a machine endpoint into an open one. Falls
    // through to the environment; with neither, the caller still refuses.
  }
  const env = String(Deno.env.get(SECRET_ENV) || "").trim();
  return env || null;
}

async function recordRun(run: UpkeepRun): Promise<void> {
  const existing = ((await kv.get(RUNS_KEY)) || []) as UpkeepRun[];
  const rows = [run, ...(Array.isArray(existing) ? existing : [])].slice(0, RUN_HISTORY);
  await kv.set(RUNS_KEY, rows);
}

/**
 * Refresh one town, or decide not to.
 *
 * `reason` is recorded so a run triggered by hand is distinguishable from one
 * the schedule caused — otherwise a person pressing the button looks exactly
 * like a clock that is working.
 */
async function runUpkeep(reason: string): Promise<UpkeepRun> {
  const startedAt = Date.now();
  const sb = service();

  const { data: towns, error } = await sb
    .from("exchange_territory")
    .select("slug, name, status, center_lat, center_lng, last_compiled_at");

  if (error) {
    const run: UpkeepRun = {
      at: new Date().toISOString(),
      town: null,
      why: `Could not read the towns: ${error.message}`,
      ok: false,
      error: error.message,
      ms: Date.now() - startedAt,
    };
    await recordRun(run);
    return run;
  }

  const choice = pickTownToRefresh(towns || []);

  // Doing nothing is a real outcome and it is recorded as one. A tick that
  // leaves no trace is indistinguishable from a clock that has stopped, which
  // is the whole failure the store's heartbeat exists to prevent.
  if (!choice.town) {
    const run: UpkeepRun = {
      at: new Date().toISOString(),
      town: null,
      why: `${choice.why} (${reason})`,
      ok: true,
      ms: Date.now() - startedAt,
    };
    await recordRun(run);
    return run;
  }

  const slug = choice.town.slug;
  try {
    // `apply: true`. This is the job; a dry run here would be a clock that
    // reports what it would have done and never does it.
    const outcome = await ingestTerritory(sb, slug, { dryRun: false });

    // Stamped only on a run that actually completed, so a failure leaves the
    // town at the front of the queue instead of quietly deferring it a week.
    await sb
      .from("exchange_territory")
      .update({ last_compiled_at: new Date().toISOString() })
      .eq("slug", slug);

    const run: UpkeepRun = {
      at: new Date().toISOString(),
      town: slug,
      why: `${choice.why} (${reason})`,
      ok: true,
      created: outcome.created,
      filled: outcome.filled,
      categorised: outcome.categorised,
      uncategorised: outcome.uncategorised,
      untouched: outcome.untouched,
      truncated: outcome.truncated,
      status: outcome.status,
      ms: Date.now() - startedAt,
    };
    await recordRun(run);
    console.log(`[exchange-upkeep] ${describeRun(run)}`);
    return run;
  } catch (err: any) {
    const message = String(err?.message || err);
    const run: UpkeepRun = {
      at: new Date().toISOString(),
      town: slug,
      why: `${choice.why} (${reason})`,
      ok: false,
      error: message,
      ms: Date.now() - startedAt,
    };
    await recordRun(run);
    // Overpass refusing is the expected failure, not an exceptional one, so it
    // is logged at the same level as a success and the town keeps its place at
    // the front of the queue.
    console.log(`[exchange-upkeep] ${slug} failed: ${message}`);
    return run;
  }
}

// ── the machine endpoint ────────────────────────────────────────────────────

exchangeUpkeepRoutes.post(`${PREFIX}/exchange/cron-tick`, async (c) => {
  const offered = String(c.req.header(SECRET_HEADER) || "");
  const expected = await expectedSecret();

  // Refusing with no secret configured is the point. The alternative — running
  // when unset — means arming the schedule before the secret exists silently
  // opens a route that rewrites a live directory.
  if (!expected || !secretMatches(offered, expected)) {
    return c.json({ success: false, error: "Not authorised." }, 401);
  }

  // One tick at a time. Overpass answers slowly enough that two overlapping
  // ticks could both choose the same town and fetch it twice, which is the
  // behaviour that got an earlier fetcher blocked.
  const lock = await kv.get(LOCK_KEY);
  if (leaseIsHeld(lock)) {
    return c.json({ success: true, skipped: "A refresh is already running." });
  }
  await kv.set(LOCK_KEY, {
    until: new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString(),
  });

  try {
    const run = await runUpkeep("scheduled");
    return c.json({ success: true, run, summary: describeRun(run) });
  } finally {
    // Released even on a throw, or one crash locks the clock out for twenty
    // minutes and the next tick reports "already running" with nothing running.
    await kv.set(LOCK_KEY, { until: null });
  }
});

// ── what it has been doing ──────────────────────────────────────────────────

exchangeUpkeepRoutes.get(`${PREFIX}/exchange/upkeep/status`, async (c) => {
  if (!await isStaffRequest(c)) {
    return c.json({ success: false, error: "Company access is required for this." }, 403);
  }
  const [runs, secret] = await Promise.all([
    kv.get(RUNS_KEY) as Promise<UpkeepRun[] | null>,
    expectedSecret(),
  ]);
  const rows = Array.isArray(runs) ? runs : [];
  return c.json({
    success: true,
    // Whether a secret exists, never what it is. Without one the schedule can
    // be armed and every tick will be refused, which is worth seeing here
    // rather than discovering from a week of silence.
    secretConfigured: Boolean(secret),
    refreshAfterDays: REFRESH_AFTER_DAYS,
    last: rows[0] || null,
    summary: describeRun(rows[0]),
    recent: rows.slice(0, 20),
  });
});

/**
 * Run one refresh by hand. Staff only.
 *
 * Here so the clock can be proved without waiting a week and without holding
 * the cron secret, and so Hudson and Windham can be filled now rather than on
 * whatever tick reaches them. It goes through exactly the same path as the
 * scheduler, so a successful press means something about the scheduled run.
 */
exchangeUpkeepRoutes.post(`${PREFIX}/exchange/upkeep/run`, async (c) => {
  if (!await isStaffRequest(c)) {
    return c.json({ success: false, error: "Company access is required for this." }, 403);
  }
  const lock = await kv.get(LOCK_KEY);
  if (leaseIsHeld(lock)) {
    return c.json({ success: false, error: "A refresh is already running." }, 409);
  }
  await kv.set(LOCK_KEY, {
    until: new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString(),
  });
  try {
    const run = await runUpkeep("by hand");
    return c.json({ success: true, run, summary: describeRun(run) });
  } finally {
    await kv.set(LOCK_KEY, { until: null });
  }
});

export default exchangeUpkeepRoutes;
