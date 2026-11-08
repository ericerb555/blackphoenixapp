/**
 * What the AI is doing, and what it has done. The read side of the ledger.
 *
 * WHY THIS EXISTS
 *
 * `AIDiagnosticsCenter.tsx` is 1,676 lines of activity log, health monitoring
 * and agent controls, and it makes zero network calls — every number in it is
 * a hardcoded array. It is a drawing of a dashboard. These routes are what it
 * needs in order to become one.
 *
 * STAFF ONLY, AND NOT NEGOTIABLE
 *
 * The ledger records which customer asked for what, which agents exist, what
 * the platform spends and what it refuses. The list of agent names alone
 * describes the shape of the whole system. The auth wall would default these
 * to "signed in", and every portal customer, tenant and vendor is signed in —
 * the same hole the leads routes were in. So the guard is explicit and the
 * whole router is behind it.
 *
 * READ ONLY
 *
 * Nothing here writes to `ai_call_log`. Rows are written by `aiLedger.ts` from
 * inside the code being described; an endpoint that accepted log entries would
 * be a way to forge the audit trail, which is the one thing an audit trail
 * must not allow.
 */
import { Hono } from "npm:hono@4";
import { createClient } from "npm:@supabase/supabase-js@2";
import { requireStaffOn } from "./requireStaff.ts";
import {
  summarise, byAgent, concerns, effectiveState, type LedgerRow,
} from "./aiLedgerView.ts";

export const aiActivityRouter = new Hono();

const BASE = '/make-server-3eae23a6/ai-activity';

/**
 * Scoped to this router's own paths.
 *
 * `requireStaffOn` rather than a bare `use('*')`, because this router spells
 * its paths in full and is therefore mounted at `/` — a wildcard there runs on
 * every request the server receives, which once took the whole API staff-only
 * for a deploy. Unlike the leads router there is no public exception to carve
 * out, so the base-path form is exactly right here.
 */
aiActivityRouter.use('*', requireStaffOn([BASE]));

let cached: any = null;
function admin() {
  if (!cached) {
    cached = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
  }
  return cached;
}

/** How far back a request may look, and how many rows it may have. */
const MAX_HOURS = 24 * 90;   // the table's retention; asking for more is a typo
const MAX_LIMIT = 500;

function windowFrom(c: any): { sinceIso: string; hours: number } {
  const raw = Number(c.req.query('hours'));
  const hours = Number.isFinite(raw) && raw > 0 ? Math.min(raw, MAX_HOURS) : 24;
  return { sinceIso: new Date(Date.now() - hours * 3600_000).toISOString(), hours };
}

async function fetchRows(c: any, limit: number): Promise<LedgerRow[]> {
  const { sinceIso } = windowFrom(c);
  let query = admin()
    .from('ai_call_log')
    .select('id,started_at,finished_at,duration_ms,agent,operation,outcome,authority,actor_email,model,cost_cents,tokens_in,tokens_out,action_taken,error,summary')
    .gte('started_at', sinceIso)
    .order('started_at', { ascending: false })
    .limit(limit);

  const agent = String(c.req.query('agent') || '').trim();
  if (agent) query = query.eq('agent', agent);
  const outcome = String(c.req.query('outcome') || '').trim();
  if (outcome) query = query.eq('outcome', outcome);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []) as LedgerRow[];
}

/**
 * The dashboard header: totals, per-agent rollup, and anything worth saying.
 *
 * One route rather than three, because the three would be fetched together on
 * every page load and would each pay for their own round trip to the same
 * rows.
 */
aiActivityRouter.get(`${BASE}/summary`, async (c) => {
  try {
    const { hours } = windowFrom(c);
    const rows = await fetchRows(c, MAX_LIMIT);
    const summary = summarise(rows);
    return c.json({
      success: true,
      windowHours: hours,
      /**
       * True when the window held more rows than we read, so the UI can say
       * "500 most recent" rather than presenting a partial count as a total.
       * A dashboard that quietly under-reports is worse than one that admits
       * a limit.
       */
      truncated: rows.length >= MAX_LIMIT,
      summary,
      agents: byAgent(rows),
      concerns: concerns(summary),
      costIsEstimate: true,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/** The activity list itself, newest first. */
aiActivityRouter.get(`${BASE}/calls`, async (c) => {
  try {
    const asked = Number(c.req.query('limit'));
    const limit = Number.isFinite(asked) && asked > 0 ? Math.min(asked, MAX_LIMIT) : 100;
    const rows = await fetchRows(c, limit);
    const now = Date.now();
    return c.json({
      success: true,
      calls: rows.map((row) => ({ ...row, state: effectiveState(row, now) })),
      truncated: rows.length >= limit,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * What is in flight right now.
 *
 * Separate from `/calls` because it is the one question with no time window —
 * an open row from three hours ago is still open, and a 24-hour filter would
 * hide one from yesterday that never closed.
 */
aiActivityRouter.get(`${BASE}/running`, async (c) => {
  try {
    const { data, error } = await admin()
      .from('ai_call_log')
      .select('id,started_at,agent,operation,authority,actor_email,model')
      .eq('outcome', 'running')
      .order('started_at', { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    const now = Date.now();
    const rows = ((data || []) as LedgerRow[]).map((row) => ({
      ...row, state: effectiveState(row, now),
    }));
    return c.json({
      success: true,
      running: rows.filter((r) => r.state === 'running'),
      abandoned: rows.filter((r) => r.state === 'abandoned'),
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});
