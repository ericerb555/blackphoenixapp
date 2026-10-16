/**
 * Phoenix — the slow query log.
 *
 * Staff only. The query text in here names tables and columns across the whole
 * system, which is a map of the schema and not a thing to hand out; and the
 * numbers beside them say which parts of the business are busy.
 *
 * WHY IT READS SNAPSHOTS RATHER THAN pg_stat_statements
 *
 * Because that view counts from the last reset, which here is three months
 * ago, and the loudest thing in it is an index incident fixed in September.
 * `query_perf_snapshot` samples it every fifteen minutes and
 * `public.slow_queries()` subtracts two samples, so the answer is about the
 * window asked for rather than about all of history. See the migration for the
 * longer version.
 *
 * THE THRESHOLD IS A PARAMETER, NOT A CONSTANT
 *
 * What counts as slow depends on what the query is for. 150 ms is disastrous
 * for something on the critical path of a page load and unremarkable for a
 * nightly sweep, so the number belongs to whoever is looking rather than to
 * this file.
 */

import { Hono } from "npm:hono@4";
import { createClient } from "npm:@supabase/supabase-js@2";
import { isStaffRequest } from "./requireStaff.ts";

export const queryPerfRoutes = new Hono();

function service() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

queryPerfRoutes.get("/admin/slow-queries", async (c) => {
  if (!await isStaffRequest(c)) {
    return c.json({ success: false, error: "Company access is required." }, 403);
  }

  try {
    const sb = service();
    const thresholdMs = Math.min(60_000, Math.max(0, Number(c.req.query("ms") ?? 100) || 0));
    const windowHours = Math.min(720, Math.max(1, Number(c.req.query("hours") ?? 24) || 24));

    const { data, error } = await sb.rpc("slow_queries", {
      threshold_ms: thresholdMs,
      window_hours: windowHours,
    });
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as any[];

    /*
     * How much of the window is actually covered. A dashboard that has been
     * collecting for ten minutes and one that has a fortnight of history look
     * identical from a list of rows, and they mean very different things.
     */
    const { data: coverage } = await sb
      .from("query_perf_snapshot")
      .select("captured_at")
      .order("captured_at", { ascending: true })
      .limit(1);
    const { data: latest } = await sb
      .from("query_perf_snapshot")
      .select("captured_at")
      .order("captured_at", { ascending: false })
      .limit(1);

    return c.json({
      success: true,
      thresholdMs,
      windowHours,
      collectingSince: coverage?.[0]?.captured_at ?? null,
      lastSampleAt: latest?.[0]?.captured_at ?? null,
      // `lifetime` on any row means there was only one sample in the window,
      // so those figures are totals since the stats were last reset rather
      // than what happened in the window. The screen says so.
      queries: rows.map((r) => ({
        id: String(r.queryid),
        query: r.query,
        calls: Number(r.calls ?? 0),
        meanMs: Number(r.mean_ms ?? 0),
        maxMs: Number(r.max_ms ?? 0),
        totalMs: Number(r.total_ms ?? 0),
        rows: Number(r.rows_returned ?? 0),
        blocksFromDisk: Number(r.blks_from_disk ?? 0),
        cacheHitPct: r.cache_hit_pct === null ? null : Number(r.cache_hit_pct),
        walBytes: Number(r.wal_bytes ?? 0),
        basis: String(r.basis ?? "window"),
      })),
    });
  } catch (error) {
    return c.json({ success: false, error: String((error as Error).message) }, 500);
  }
});

/**
 * Take a sample now, rather than waiting for the quarter hour.
 *
 * The scheduled job is the one that matters; this exists so that somebody
 * looking at an incident can get a second data point immediately instead of
 * watching a clock.
 */
queryPerfRoutes.post("/admin/slow-queries/sample", async (c) => {
  if (!await isStaffRequest(c)) {
    return c.json({ success: false, error: "Company access is required." }, 403);
  }
  try {
    const { data, error } = await service().rpc("capture_query_perf");
    if (error) throw new Error(error.message);
    return c.json({ success: true, captured: Number(data ?? 0) });
  } catch (error) {
    return c.json({ success: false, error: String((error as Error).message) }, 500);
  }
});
