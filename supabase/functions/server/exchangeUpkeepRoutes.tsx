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
import { demandGaps } from "./exchangeLedger.ts";
import {
  assessExchange,
  describeHealth,
  approvalActions,
  type Finding,
  type ActionKind,
} from "./exchangeHealth.ts";
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

/**
 * How long to wait before recording another refusal.
 *
 * The route is public — it has to be, pg_cron posts to it with no session —
 * so anybody can POST at it. Recording every refusal would let a stranger
 * push the real run history out of a 20-row log, which is worse than the
 * blindness being fixed. One an hour is enough to make a misconfigured
 * clock obvious within a day and useless as a way to flood anything.
 */
const REFUSAL_QUIET_MINUTES = 60;
const REFRESH_QUIET_MS = REFUSAL_QUIET_MINUTES * 60_000;
const LAST_REFUSAL_KEY = `${RUNS_KEY}:last_refusal`;

/**
 * A refused tick leaves a trace, instead of being the one outcome that does
 * not.
 *
 * THIS IS THE HOLE THE SCHEDULE'S OWN MIGRATION WARNED ABOUT. Every other
 * outcome is already recorded by `runUpkeep` — a success, a town that was
 * not due, a database error, Overpass refusing. The 401 is returned BEFORE
 * `runUpkeep` is ever called, so a clock whose secret is missing or stale
 * writes nothing at all. pg_cron records the POST as "succeeded" because it
 * got an HTTP response, and the only symptom is a directory that quietly
 * stops growing. That is exactly the state this system was found in.
 *
 * `secretConfigured` on the status route catches one half — no secret
 * stored at all. It cannot catch the other half, which is a secret that
 * exists and does not match the one the cron job sends, and that half looks
 * identical from the outside.
 *
 * What is recorded says nothing about either secret, not even its length.
 * The fact of the refusal is the whole diagnostic.
 */
async function recordRefusal(hadHeader: boolean, secretExists: boolean): Promise<void> {
  try {
    const last = (await kv.get(LAST_REFUSAL_KEY)) as { at?: string } | null;
    const since = last?.at ? Date.now() - Date.parse(String(last.at)) : Infinity;
    if (Number.isFinite(since) && since < REFRESH_QUIET_MS) return;

    await kv.set(LAST_REFUSAL_KEY, { at: new Date().toISOString() });
    await recordRun({
      at: new Date().toISOString(),
      town: null,
      ok: false,
      why: "A tick was refused before it could run (scheduled).",
      error: !secretExists
        ? "No cron secret is configured, so every tick is refused. The schedule will "
          + "never compile a town until one is set."
        : hadHeader
          ? "The secret sent with the tick did not match the one configured. The "
            + "schedule is running and every tick is being turned away."
          : "The tick arrived with no secret header. If this is the scheduled job, "
            + "the header is resolving to null — check the cron command's subquery.",
      ms: 0,
    });
  } catch {
    // Never let the bookkeeping turn a refusal into a 500. A refused tick
    // that also crashes is strictly worse than one that is merely refused.
  }
}

exchangeUpkeepRoutes.post(`${PREFIX}/exchange/cron-tick`, async (c) => {
  const offered = String(c.req.header(SECRET_HEADER) || "");
  const expected = await expectedSecret();

  // Refusing with no secret configured is the point. The alternative — running
  // when unset — means arming the schedule before the secret exists silently
  // opens a route that rewrites a live directory.
  if (!expected || !secretMatches(offered, expected)) {
    // Recorded, throttled, so a week of refusals is a row somebody can read
    // rather than silence that looks exactly like a quiet clock.
    await recordRefusal(Boolean(offered), Boolean(expected));
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
  /**
   * Refusals and failures counted separately, because they mean different
   * things and have different fixes. A run of refusals is a misconfigured
   * clock; a run of failures is usually Overpass saying no, which is
   * expected and self-correcting.
   */
  const refused = rows.filter((r) => r && r.ok === false && r.town === null
    && String(r.why || '').startsWith('A tick was refused')).length;
  const failed = rows.filter((r) => r && r.ok === false && r.town !== null).length;
  return c.json({
    success: true,
    refusedRecently: refused,
    failedRecently: failed,
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


/* ── the control page ───────────────────────────────────────────────────── */

/**
 * Phoenix Exchange — everything about whether it is working, in one answer.
 *
 * Eric: "a control page ... where i can make sure its running properly with
 * all the functions and monitor what people are looking for and an ai
 * assistant to make sure its performing."
 *
 * Every number here already existed behind a route somebody would have to
 * know about. The clock's run log, the towns and their listing counts, and
 * the demand ledger — which records every search a resident made that the
 * directory could not answer, and has been readable only by curl since the
 * day it was written. This gathers them and runs the rules over them.
 *
 * THE FINDINGS ARE COMPUTED, NOT ASKED FOR. `assessExchange` is pure and
 * tested; the assistant below is handed its output and writes prose. A model
 * that cannot name an action cannot invent one, and this surface publishes
 * directories and creates territories sold as exclusive.
 */
/**
 * Gather everything and run the rules over it.
 *
 * A function rather than only a route, because `/act` has to re-derive the
 * findings before it performs one. Doing that by having the route call
 * itself over HTTP worked and was a bad idea: it depends on the mount path,
 * it re-does the auth, and it turns one database read into two requests.
 */
async function gatherHealth(): Promise<{
  findings: Finding[];
  rows: UpkeepRun[];
  towns: number;
  listings: number;
}> {
  const sb = service();
  const [runs, secret] = await Promise.all([
    kv.get(RUNS_KEY) as Promise<UpkeepRun[] | null>,
    expectedSecret(),
  ]);
  const rows = Array.isArray(runs) ? runs : [];

  const { data: towns } = await sb
    .from("exchange_territory")
    .select("slug, name, status, last_compiled_at");
  const { data: links } = await sb
    .from("organization_territory")
    .select("territory_slug");

  const counts = new Map<string, number>();
  for (const l of links || []) {
    counts.set((l as any).territory_slug, (counts.get((l as any).territory_slug) ?? 0) + 1);
  }

  /*
   * Listings the liveness check has raised. The column does not exist yet —
   * that migration is written and not applied — so a failure here is
   * expected and must not take the page down with it. Zero reads as "none
   * flagged", which is true today.
   */
  let needsReview = 0;
  try {
    const { count } = await sb
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .eq("type", "exchange_business")
      .eq("needs_review", true);
    needsReview = Number(count) || 0;
  } catch { /* column not added yet */ }

  let demand: Array<{ category: string | null; town: string | null; searches: number }> = [];
  try {
    const gaps = await demandGaps(sb, {
      territorySlug: null,
      since: new Date(Date.now() - 90 * 86_400_000).toISOString(),
      limit: 50,
    });
    const names = new Map<string, string>(
      (towns || []).map((t: any) => [String(t.slug), String(t.name)] as [string, string]),
    );
    const ids = [...new Set(gaps.map((g) => g.categoryId).filter(Boolean))] as string[];
    const catNames = new Map<string, string>();
    if (ids.length) {
      const { data: cats } = await sb.from("exchange_category").select("id, name").in("id", ids);
      for (const row of cats || []) catNames.set(String((row as any).id), String((row as any).name));
    }
    demand = gaps.map((g) => ({
      category: g.categoryId ? catNames.get(g.categoryId) ?? null : null,
      town: g.territorySlug ? names.get(g.territorySlug) ?? g.territorySlug : null,
      searches: g.searches,
    }));
  } catch { /* the ledger is empty or unavailable; the rest of the page still works */ }

  const findings = assessExchange({
    secretConfigured: Boolean(secret),
    refusedRecently: rows.filter((r) => r && r.ok === false && r.town === null
      && String(r.why || "").startsWith("A tick was refused")).length,
    failedRecently: rows.filter((r) => r && r.ok === false && r.town !== null).length,
    lastRunAt: rows[0]?.at || null,
    territories: (towns || []).map((t: any) => ({
      slug: String(t.slug),
      name: String(t.name),
      status: t.status ?? null,
      listings: counts.get(String(t.slug)) ?? 0,
      lastCompiledAt: t.last_compiled_at ?? null,
    })),
    demand,
    needsReview,
  });

  return { findings, rows, towns: (towns || []).length, listings: (links || []).length };
}

exchangeUpkeepRoutes.get(`${PREFIX}/exchange/admin/health`, async (c) => {
  if (!await isStaffRequest(c)) {
    return c.json({ success: false, error: "Company access is required for this." }, 403);
  }
  const { findings, rows, towns, listings } = await gatherHealth();
  return c.json({
    success: true,
    headline: describeHealth(findings),
    findings,
    needsApproval: approvalActions(findings).length,
    towns,
    listings,
    lastRun: rows[0] || null,
    recent: rows.slice(0, 10),
  });
});

/**
 * Ask the assistant what to do about it.
 *
 * It is handed the FINDINGS — the same computed list the page is showing —
 * and asked to write the briefing. It is told, in the system prompt and by
 * the shape of what it gets, that it may not invent work: everything
 * actionable is already in the list with its parameters filled in.
 *
 * Separate from the health route because it costs money and the page should
 * render without it. No key, no narration, and the findings stand on their
 * own — they are complete sentences already.
 */
exchangeUpkeepRoutes.post(`${PREFIX}/exchange/admin/health/brief`, async (c) => {
  if (!await isStaffRequest(c)) {
    return c.json({ success: false, error: "Company access is required for this." }, 403);
  }

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) {
    return c.json({
      success: true,
      brief: null,
      note: "No ANTHROPIC_API_KEY is set, so there is no written briefing. The findings below are "
        + "complete on their own.",
    });
  }

  const body = await c.req.json().catch(() => ({}));
  const findings = (Array.isArray(body?.findings) ? body.findings : []) as Finding[];
  if (!findings.length) {
    return c.json({ success: true, brief: "Nothing is outstanding. The Exchange is running." });
  }

  try {
    const client = new (await import("npm:@anthropic-ai/sdk")).default({ apiKey: key });
    const message = await client.messages.create({
      // The same model and override the Exchange assistant already uses, so
      // there is one answer to "which model does the Exchange run on".
      model: Deno.env.get("EXCHANGE_ASSISTANT_MODEL") || "claude-opus-5",
      max_tokens: 900,
      system: [
        "You are briefing the owner of a local business directory on its health.",
        "",
        "You are given a list of findings that has ALREADY been computed from real data.",
        "Do not invent findings, numbers, towns or actions. If something is not in the list,",
        "it is not happening. Every fix that exists is already named in the list with its",
        "parameters; your job is to explain and to order, never to propose a new one.",
        "",
        "Write for somebody who runs the business and does not read code:",
        "  - lead with anything marked critical, and say plainly what it is costing",
        "  - say which ONE thing to do first, and why that one",
        "  - mention demand findings as the recruitment list they are: each is a business",
        "    worth signing up and a territory worth more once it is",
        "  - if an action needs approval, say what approving it will do in the world",
        "",
        "Six short paragraphs at most. No headings, no bullet lists, no preamble.",
      ].join("\n"),
      messages: [{
        role: "user",
        content: JSON.stringify({ findings }, null, 2),
      }],
    });

    const brief = (message.content || [])
      .filter((b: any) => b?.type === "text")
      .map((b: any) => b.text)
      .join("\n")
      .trim();

    return c.json({ success: true, brief: brief || null });
  } catch (err: any) {
    // A briefing that will not generate must not look like an Exchange that
    // is on fire. The findings are the product; this is commentary on them.
    return c.json({
      success: true,
      brief: null,
      note: `The written briefing could not be generated (${String(err?.message || err)}). The findings are unaffected.`,
    });
  }
});

/**
 * Do one of the things the page offered.
 *
 * THE ACTION MUST BE ONE THE RULES PRODUCED, and that is re-derived here
 * rather than trusted from the request. A client — or an assistant with a
 * loose grip on its instructions — can post anything; what it cannot do is
 * make `assessExchange` return a finding that is not true of the data.
 *
 * APPROVAL IS ENFORCED HERE, not in the browser. An action marked 'ask' is
 * refused without `approved: true` in the body, whatever the page did or
 * did not render.
 */
exchangeUpkeepRoutes.post(`${PREFIX}/exchange/admin/health/act`, async (c) => {
  if (!await isStaffRequest(c)) {
    return c.json({ success: false, error: "Company access is required for this." }, 403);
  }

  const body = await c.req.json().catch(() => ({}));
  const findingId = String(body?.findingId ?? "").trim();
  const approved = body?.approved === true;
  if (!findingId) return c.json({ success: false, error: "Which finding?" }, 400);

  /*
   * RE-DERIVED, never trusted from the request. A client — or an assistant
   * with a loose grip on its instructions — can post any finding id and any
   * parameters it likes. What it cannot do is make `assessExchange` return a
   * finding that is not true of the data as it stands right now.
   *
   * It also means a fix already applied cannot be applied twice: the finding
   * that justified it is gone the moment it is no longer true.
   */
  const { findings } = await gatherHealth();
  const finding = findings.find((f) => f.id === findingId);
  if (!finding) {
    return c.json({
      success: false,
      error: "That is no longer something that needs doing. The page has been refreshed.",
    }, 409);
  }
  if (!finding.action) {
    return c.json({ success: false, error: "That finding has nothing to press." }, 400);
  }
  if (finding.action.approval === "ask" && !approved) {
    return c.json({
      success: false,
      needsApproval: true,
      why: finding.action.whyApproval,
      error: "This one needs approving first.",
    }, 428);
  }

  const kind = finding.action.kind as ActionKind;
  const params = finding.action.params || {};

  try {
    switch (kind) {
      case "run-upkeep-now": {
        const run = await runUpkeep("control page");
        return c.json({ success: true, did: kind, run, summary: describeRun(run) });
      }
      case "publish-town": {
        const slug = String((params as any).slug || "");
        if (!slug) return c.json({ success: false, error: "Which town?" }, 400);
        const sb = service();
        const { error } = await sb
          .from("exchange_territory")
          .update({ status: "visible" })
          .eq("slug", slug);
        if (error) throw new Error(error.message);
        return c.json({ success: true, did: kind, summary: `${slug} is now visible to the public.` });
      }
      case "open-review-list":
      case "discover-county":
        /*
         * Navigation and discovery belong to the page, not to this route —
         * discovery has its own endpoint that returns candidates to choose
         * from, and a review list is a screen. Answering here with where to
         * go keeps one definition of each action rather than two.
         */
        return c.json({
          success: true,
          did: kind,
          navigate: kind === "discover-county"
            ? `${PREFIX}/exchange/admin/territories/discover`
            : "/exchange/admin/review",
          params,
        });
      case "add-towns":
        return c.json({
          success: false,
          error: "Adding towns goes through the discovery screen, so the list can be reviewed first.",
        }, 400);
      default:
        return c.json({ success: false, error: "That is not an action this page performs." }, 400);
    }
  } catch (err: any) {
    return c.json({ success: false, error: String(err?.message || err) }, 500);
  }
});
