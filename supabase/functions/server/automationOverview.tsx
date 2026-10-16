/**
 * Is anything running by itself — and is it waiting on Eric?
 *
 * WHY THIS EXISTS
 *
 * Eric, 2026-10-15, having looked for new towns on the Exchange and found
 * none: *"how is the ai automation to keep adding town to the phoenix exchange
 * doing i done see any new towns added or adding?"*
 *
 * The honest answer took four database queries to assemble and none of them
 * was available anywhere in the app. The clocks live in `cron.job`, which
 * PostgREST does not serve. The store's heartbeat lives in the key-value
 * store behind a route of its own. The review queues are three more routes.
 * The towns opened but never compiled were only findable by joining two
 * tables by hand.
 *
 * So the question "is the automation working" could only be answered by
 * somebody with database access, reading six places and knowing which six.
 * This is those six places, in one answer.
 *
 * THE RULE THIS SCREEN LIVES BY
 *
 * `StoreAutonomyPanel` already states it and it is worth repeating because it
 * is the whole reason to be careful here: *"A dashboard that reassures you
 * without evidence is worse than no dashboard."*
 *
 * Which is why this route reports GAPS as first-class rows. Six green clocks
 * with no mention that nothing refreshes the Exchange would have answered
 * Eric's question with "all good" — and the true answer is that no such
 * automation was ever built. A screen that cannot say "nothing is doing this"
 * is a screen that quietly says the opposite.
 *
 * `succeeded` IS NOT SUCCESS
 *
 * pg_cron records a job as succeeded when its SQL ran, and that SQL is
 * `net.http_post`, which only QUEUES a request. On 2026-10-13 a request timed
 * out after five seconds and pg_cron called the job a success; see
 * 20261013150000_cron_jobs_explicit_timeout.sql. So the schedule and the
 * delivery are reported separately and the screen says which is which.
 */

import { Hono } from "npm:hono@4";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import { isStaffRequest } from "./requireStaff.ts";
import { storeClockSummary } from "./storeAutonomy.ts";
import { describeRun, type UpkeepRun } from "./exchangeUpkeep.ts";

export const automationOverviewRoutes = new Hono();

const PREFIX = "/make-server-3eae23a6";

function service() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/**
 * Something that is waiting for a person.
 *
 * `where` is a page this app can actually navigate to, or null. A queue with
 * no door is a queue nobody empties — the Exchange had two of those for weeks
 * because the only way in was the staff role switcher.
 */
interface Waiting {
  id: string;
  label: string;
  count: number;
  /** What to do about it, in a sentence. */
  action: string;
  where: string | null;
  severity: "attention" | "blocked" | "fyi";
}

/**
 * A thing nobody automated, stated out loud.
 *
 * This is the half of the screen that makes it honest. Each entry is a piece
 * of work that runs only when a person does it, and says so.
 */
interface Gap {
  id: string;
  label: string;
  detail: string;
  where: string | null;
}

const count = async (
  sb: any,
  table: string,
  build: (q: any) => any,
): Promise<number> => {
  try {
    const { count: n, error } = await build(sb.from(table).select("*", { count: "exact", head: true }));
    if (error) return 0;
    return Number(n || 0);
  } catch {
    return 0;
  }
};

automationOverviewRoutes.get(`${PREFIX}/automation/overview`, async (c) => {
  if (!await isStaffRequest(c)) {
    return c.json({ success: false, error: "Company access is required for this." }, 403);
  }

  const sb = service();
  const waiting: Waiting[] = [];
  const gaps: Gap[] = [];

  /* ── the clocks ──────────────────────────────────────────────────────── */

  let clocks: any[] = [];
  let clocksError: string | null = null;
  try {
    const { data, error } = await sb.rpc("automation_clocks");
    if (error) throw new Error(error.message);
    clocks = Array.isArray(data) ? data : [];
  } catch (error: any) {
    // Reported, never swallowed into an empty list. "No clocks" and "could not
    // read the clocks" are opposite findings and must not look the same.
    clocksError = String(error?.message || error);
  }

  let delivery: any = null;
  try {
    const { data, error } = await sb.rpc("automation_undelivered");
    if (error) throw new Error(error.message);
    delivery = Array.isArray(data) ? data[0] : data;
  } catch {
    delivery = null;
  }

  /* ── the store clock, which has a panel of its own ───────────────────── */

  let storeClock: any = null;
  try {
    storeClock = await storeClockSummary();
  } catch {
    storeClock = null;
  }

  if (storeClock?.openAsks > 0) {
    waiting.push({
      id: "store-asks",
      label: "The store clock is waiting to be told something",
      count: storeClock.openAsks,
      action: "A job stopped rather than guess. Answer it and the job acts on its next tick.",
      where: "owners-dashboard",
      severity: "blocked",
    });
  }
  if (storeClock?.findings && storeClock.findings.urgent > 0) {
    waiting.push({
      id: "store-findings",
      label: "The store reconciliation found something urgent",
      count: storeClock.findings.urgent,
      action: "Open the store autonomy panel and read what it found.",
      where: "owners-dashboard",
      severity: "blocked",
    });
  }

  /* ── the Exchange: queues, and the work nothing does ─────────────────── */

  const [claims, deals, territories, orgTerritories] = await Promise.all([
    count(sb, "exchange_claim", (q: any) => q.eq("state", "needs_review")),
    count(sb, "exchange_deal", (q: any) => q.eq("state", "pending")),
    (async () => {
      const { data } = await sb.from("exchange_territory").select("slug, name, status");
      return (data || []) as any[];
    })(),
    (async () => {
      const { data } = await sb.from("organization_territory").select("territory_slug");
      return (data || []) as any[];
    })(),
  ]);

  if (claims > 0) {
    waiting.push({
      id: "exchange-claims",
      label: "Businesses claiming their Exchange listing",
      count: claims,
      action: "Most compiled listings can prove only one verification category, so they land here by design.",
      where: "exchange-claim-review",
      severity: "attention",
    });
  }
  if (deals > 0) {
    waiting.push({
      id: "exchange-deals",
      label: "Deals submitted for review",
      count: deals,
      action: "Nothing a business submitted is visible to residents until it is approved.",
      where: "exchange-deal-review",
      severity: "attention",
    });
  }

  /**
   * A town row with no listings against it.
   *
   * This is the exact state Eric's question walked into: Hudson and Windham
   * were looked up and opened, and the compile step — the one that actually
   * fetches the businesses — was never pressed. Nothing anywhere said so, and
   * a hidden town with no listings is invisible by design, so it could sit
   * like that indefinitely.
   */
  const compiled = new Set((orgTerritories || []).map((r: any) => String(r.territory_slug || "")));
  const neverCompiled = (territories || []).filter((t: any) => !compiled.has(String(t.slug || "")));
  const hiddenWithListings = (territories || []).filter(
    (t: any) => t.status === "hidden" && compiled.has(String(t.slug || "")),
  );

  if (neverCompiled.length > 0) {
    waiting.push({
      id: "towns-never-compiled",
      label: `Towns opened but never compiled: ${neverCompiled.map((t: any) => t.name).join(", ")}`,
      count: neverCompiled.length,
      action: 'Open Towns & coverage and press "see what it would find", then "compile it". Until then the town holds no businesses.',
      where: "exchange-towns",
      severity: "blocked",
    });
  }
  if (hiddenWithListings.length > 0) {
    waiting.push({
      id: "towns-hidden",
      label: `Towns compiled but still hidden: ${hiddenWithListings.map((t: any) => t.name).join(", ")}`,
      count: hiddenWithListings.length,
      action: 'Residents cannot see these yet. Press "show it" when the town is worth a visit.',
      where: "exchange-towns",
      severity: "attention",
    });
  }

  /* ── what nothing is doing ───────────────────────────────────────────── */

  const clockNames = new Set(clocks.map((j: any) => String(j.jobname || "")));

  /**
   * The gap Eric asked about.
   *
   * `tasks/exchange-more-towns-and-upkeep.md` planned "a seventh cron job
   * refreshing one town per run, slowest-first", and the decision recorded on
   * 2026-10-13 was weekly, one town per tick. It was never built: there is no
   * migration scheduling it and no route for it to call. Adding and refreshing
   * a town is entirely manual, through Towns & coverage.
   *
   * Detected rather than asserted — if somebody schedules it later, this row
   * disappears on its own instead of becoming a lie in a comment.
   */
  const exchangeClock = [...clockNames].some((n) => n.includes("exchange"));

  /** What the refresh has actually done, if it has ever run. */
  const upkeepRuns = await (async () => {
    try {
      const rows = (await kv.get("exchange:upkeep:runs")) as UpkeepRun[] | null;
      return Array.isArray(rows) ? rows : [];
    } catch {
      return [];
    }
  })();
  const lastUpkeep = upkeepRuns[0] || null;

  if (!exchangeClock) {
    /**
     * Built, and not armed. Reported as that rather than as "missing".
     *
     * The distinction is the whole value of the row. "Nothing refreshes the
     * Exchange" would send somebody to write a job that already exists;
     * "built, awaiting one decision" names the decision. Arming it starts
     * something that rewrites a live directory of 1,100 businesses, which is
     * why `deploy.md` holds such migrations as `.sql.pending` and calls
     * renaming one "its own decision".
     */
    gaps.push({
      id: "exchange-clock-not-armed",
      label: "The Exchange refresh is built but not switched on",
      detail:
        "Nothing re-checks a town once it is compiled, so a business that closed or moved stays "
        + "as OpenStreetMap had it on the day it was imported. The weekly refresh agreed on "
        + "2026-10-13 now exists — one town per tick, longest-unrefreshed first, never promoting "
        + "a town on its own — and is waiting to be scheduled. Its migration is held at "
        + "supabase/migrations/20261016140000_schedule_exchange_upkeep.sql.pending, which lists "
        + "the three things to check first. Until it is armed, refreshing a town is a button in "
        + "Towns & coverage.",
      where: "exchange-towns",
    });
  }

  /**
   * The uncategorised listings.
   *
   * Counted because it is the standing cost of every new town — Manchester
   * left 131 across three towns — and because nothing proposes a category for
   * them. The plan's answer was a review queue that proposes and never
   * applies; it is not built either.
   */
  const uncategorised = await (async () => {
    try {
      const { data, error } = await sb
        .from("organization_category")
        .select("org_id");
      if (error) return null;
      const categorised = new Set((data || []).map((r: any) => String(r.org_id)));
      const { data: orgs } = await sb.from("organization_territory").select("org_id");
      const listed = new Set((orgs || []).map((r: any) => String(r.org_id)));
      let n = 0;
      for (const id of listed) if (!categorised.has(id)) n += 1;
      return { uncategorised: n, listed: listed.size };
    } catch {
      return null;
    }
  })();

  if (uncategorised && uncategorised.uncategorised > 0) {
    gaps.push({
      id: "uncategorised-listings",
      label: `${uncategorised.uncategorised} Exchange listings have no category`,
      detail:
        `Out of ${uncategorised.listed} compiled listings. A listing with no category is reachable `
        + "only by search, not by browsing. Nothing proposes categories for these — the review "
        + "queue that would was planned and not built. The real fix is businesses claiming their "
        + "own listings.",
      where: "exchange-towns",
    });
  }

  return c.json({
    success: true,
    at: new Date().toISOString(),
    clocks,
    clocksError,
    /**
     * Whether the queued requests were answered, which pg_cron cannot tell
     * you. The window comes with it because `net._http_response` is pruned and
     * a count over an unknown period means nothing.
     */
    delivery: delivery
      ? {
        undelivered: Number(delivery.undelivered || 0),
        errored: Number(delivery.errored || 0),
        total: Number(delivery.total || 0),
        windowStart: delivery.window_start || null,
        windowEnd: delivery.window_end || null,
      }
      : null,
    storeClock,
    /**
     * The Exchange refresh, whether or not it is scheduled.
     *
     * `armed` is read from the schedule and `lastRun` from what the job
     * recorded, because the two can disagree in both directions: a scheduled
     * job whose requests are all refused has never run, and a job run by hand
     * has run without being scheduled. Reporting one and implying the other is
     * how a week of silence passes for a week of work.
     */
    exchangeUpkeep: {
      armed: exchangeClock,
      lastRun: lastUpkeep,
      summary: describeRun(lastUpkeep),
      runs: upkeepRuns.length,
    },
    waiting,
    gaps,
  });
});

export default automationOverviewRoutes;
