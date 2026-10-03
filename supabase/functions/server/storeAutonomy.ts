/**
 * The store's clock.
 *
 * WHY THIS EXISTS
 *
 * Because there was no clock. This project had exactly one scheduled job in the
 * whole database — the compliance reminder — so every "automatic" thing in the
 * store was really advanced by somebody opening a page. Fulfilment retries ran
 * when an administrator loaded the Orders screen. Tracking was pulled by a
 * button. The supplier catalogue refreshed when somebody remembered. Overnight
 * and at weekends, the store did nothing at all, and a paid order that failed
 * to reach its supplier sat unshipped with the failure written to a field on a
 * record nobody opens.
 *
 * ONE CLOCK, MANY HANDS
 *
 * The obvious shape is a cron job per concern. That gives five schedules, five
 * secrets, five things to rotate and five ways to half-arm the system. Instead
 * there is one pg_cron job, one machine endpoint, and a registry of small jobs
 * that are each idempotent and individually switchable:
 *
 *     pg_cron 'store-tick'  ──▶  POST /store/cron-tick  ──▶  job registry
 *
 * A job can be switched off without touching the schedule, and the schedule can
 * be stopped without editing any job. Nothing here decides *what* the jobs do:
 * `registerStoreJob` lets whoever owns a piece of work contribute it, so the
 * fulfilment sweep stays with the fulfilment code rather than being reimplemented
 * next to the scheduler.
 *
 * ARMED CARRYING NOTHING
 *
 * The default settings enable the heartbeat and nothing else. That is
 * deliberate: a clock should be proved on an empty load. If the schedule, the
 * secret, the header or the mount path is wrong, it is wrong while doing
 * nothing, and the heartbeat record is how you can tell the difference between
 * "working and idle" and "never ran".
 *
 * WHAT IT TRUSTS
 *
 * A shared secret read from `private_cron_config` — the same row the scheduler
 * itself sends, so rotating it means changing one thing in one place — falling
 * back to the environment, and refusing outright when neither yields a value.
 * An unset secret must never mean "no check required". Nothing is read from the
 * request body: a machine endpoint that accepted instructions would be a way to
 * make the store place orders on demand.
 *
 * This follows `/autopilot/cron-tick` deliberately rather than inventing a
 * second scheme, because two schemes means one of them is the one nobody
 * remembers to rotate.
 */
import { Hono } from "npm:hono@4";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import { isStaffRequest } from "./requireStaff.ts";
import {
  type AutonomySettings, normaliseSettings, secretMatches, leaseIsHeld,
  disabledJobs, LOCK_MINUTES, MAX_ORDERS_CEILING, MAX_SPEND_CEILING,
} from "./storeTickRules.ts";

export const storeAutonomyRouter = new Hono();

const PREFIX = "/make-server-3eae23a6";
const SETTINGS_KEY = "store:autonomy:settings";
const HEARTBEAT_KEY = "store:autonomy:heartbeat";
const LOCK_KEY = "store:autonomy:lock";
const SECRET_ROW = "store_cron_secret";
const SECRET_HEADER = "X-Store-Cron-Secret";
const SECRET_ENV = "STORE_CRON_SECRET";

/** How many recent runs the heartbeat keeps. Enough to see a day and a half. */
const RUN_HISTORY = 150;

let adminClient: any = null;
function admin() {
  if (!adminClient) {
    adminClient = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    );
  }
  return adminClient;
}

// ── The job registry ────────────────────────────────────────────────────────

/** What a job may spend, and what it is allowed to know about this run. */
export interface StoreJobContext {
  runId: string;
  startedAt: string;
  reason: string;
  /** Hard stop on orders placed with a supplier in one tick. */
  maxOrdersPerTick: number;
  /** Hard stop on money committed to suppliers in one tick, in dollars. */
  maxSpendPerTick: number;
}

export interface StoreJobResult {
  /** False when the job looked and had nothing to do. Not a failure. */
  ran: boolean;
  /** One line a person can read, in the heartbeat. */
  detail: string;
  counts?: Record<string, number>;
  /** Set only when something went wrong. A job must not throw to report this. */
  error?: string;
}

export type StoreJob = (ctx: StoreJobContext) => Promise<StoreJobResult>;

const registry = new Map<string, StoreJob>();

/**
 * Contribute a job to the clock.
 *
 * Called at module load by whoever owns the work — the fulfilment sweep is
 * registered from the fulfilment code, not reimplemented here. A job that is
 * registered is not thereby enabled: it still has to be switched on in the
 * settings, and it starts off.
 */
export function registerStoreJob(name: string, job: StoreJob): void {
  if (registry.has(name)) {
    console.log(`[store-tick] job "${name}" registered twice — the second one wins, which is probably a mistake`);
  }
  registry.set(name, job);
}

/** Names of every job the server knows how to run. */
export function registeredStoreJobs(): string[] {
  return [...registry.keys()];
}

// ── Settings ────────────────────────────────────────────────────────────────


/** Stored settings, read through the tested rules so the two cannot drift. */
async function readSettings(): Promise<AutonomySettings> {
  return normaliseSettings(await kv.get(SETTINGS_KEY));
}

// ── The heartbeat ───────────────────────────────────────────────────────────

interface RunRecord {
  runId: string;
  reason: string;
  startedAt: string;
  finishedAt: string;
  ms: number;
  jobs: Array<{ name: string; ran: boolean; detail: string; error?: string; ms: number }>;
  errors: number;
}

interface Heartbeat {
  lastRunAt: string;
  lastRunId: string;
  totalRuns: number;
  recent: RunRecord[];
}

async function recordRun(run: RunRecord): Promise<void> {
  const existing = ((await kv.get(HEARTBEAT_KEY)) as any) || {};
  const recent: RunRecord[] = Array.isArray(existing.recent) ? existing.recent : [];
  const heartbeat: Heartbeat = {
    lastRunAt: run.finishedAt,
    lastRunId: run.runId,
    totalRuns: Number(existing.totalRuns || 0) + 1,
    recent: [run, ...recent].slice(0, RUN_HISTORY),
  };
  await kv.set(HEARTBEAT_KEY, heartbeat);
}

/**
 * The heartbeat job itself: it looks at nothing and changes nothing.
 *
 * It exists so that an armed clock carrying no other work still leaves a trail,
 * which is what makes "the schedule is wrong" distinguishable from "there was
 * nothing to do". It reports what else is registered and off, so a glance at
 * the status screen says which hands the clock is currently driving.
 */
registerStoreJob("heartbeat", async () => {
  const settings = await readSettings();
  const off = disabledJobs(registeredStoreJobs(), settings);
  return {
    ran: true,
    detail: off.length === 0
      ? "Clock alive; every registered job is enabled."
      : `Clock alive; ${off.length} job(s) registered but switched off: ${off.join(", ")}.`,
    counts: { registered: registeredStoreJobs().length, enabled: registeredStoreJobs().length - off.length },
  };
});

// ── The secret ──────────────────────────────────────────────────────────────


/** The secret the scheduler must present, or null when none is configured. */
async function expectedSecret(): Promise<string | null> {
  try {
    const { data } = await admin()
      .from("private_cron_config")
      .select("value")
      .eq("key", SECRET_ROW)
      .maybeSingle();
    const row = String(data?.value || "").trim();
    if (row) return row;
  } catch {
    // Fall through to the environment. A database blip must not turn a machine
    // endpoint into an open one — the caller still refuses with neither.
  }
  const env = String(Deno.env.get(SECRET_ENV) || "").trim();
  return env || null;
}

// ── The tick ────────────────────────────────────────────────────────────────

/**
 * Run every enabled job once.
 *
 * A job that throws is caught and recorded rather than being allowed to stop
 * the ones after it: a broken tracking pull must not prevent fulfilment from
 * being retried, which is exactly the coupling that makes a single scheduled
 * job worse than none.
 */
async function runTick(reason: string): Promise<RunRecord & { skipped?: string }> {
  const startedAt = new Date().toISOString();
  const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const t0 = Date.now();

  /**
   * Don't run two ticks at once.
   *
   * The schedule is every fifteen minutes and a tick should take seconds, but a
   * supplier API that hangs could still have one run overlap the next — and two
   * concurrent fulfilment sweeps could place the same supplier order twice.
   *
   * Honest about what this is: the KV store has no compare-and-set, so a read
   * followed by a write leaves a theoretical gap where two ticks starting in
   * the same instant could both take the lease. With one cron job on a
   * fifteen-minute schedule that gap is not reachable in practice, and the jobs
   * are idempotent in their own right — the lease is the second line of
   * defence, not the only one.
   */
  const lock = ((await kv.get(LOCK_KEY)) as any) || null;
  if (leaseIsHeld(lock)) {
    const skipped = `A tick started at ${lock.startedAt} is still holding the lease until ${lock.until}.`;
    console.log(`[store-tick:${reason}] skipped — ${skipped}`);
    return {
      runId, reason, startedAt, finishedAt: new Date().toISOString(),
      ms: Date.now() - t0, jobs: [], errors: 0, skipped,
    };
  }
  await kv.set(LOCK_KEY, {
    runId,
    startedAt,
    until: new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString(),
  });

  const settings = await readSettings();
  const ctx: StoreJobContext = {
    runId,
    startedAt,
    reason,
    maxOrdersPerTick: settings.maxOrdersPerTick,
    maxSpendPerTick: settings.maxSpendPerTick,
  };

  const results: RunRecord["jobs"] = [];
  let errors = 0;

  for (const [name, job] of registry) {
    if (settings.jobs[name] !== true) continue;
    const jobStart = Date.now();
    try {
      const outcome = await job(ctx);
      if (outcome.error) errors += 1;
      results.push({
        name,
        ran: outcome.ran === true,
        detail: outcome.detail || "",
        error: outcome.error,
        ms: Date.now() - jobStart,
      });
    } catch (error: any) {
      errors += 1;
      results.push({
        name, ran: false, detail: "Threw before it could report.",
        error: String(error?.message || error), ms: Date.now() - jobStart,
      });
      console.log(`[store-tick:${reason}] job "${name}" threw: ${error?.message || error}`);
    }
  }

  const run: RunRecord = {
    runId, reason, startedAt,
    finishedAt: new Date().toISOString(),
    ms: Date.now() - t0,
    jobs: results,
    errors,
  };

  await recordRun(run);
  // Release the lease. Left behind on a crash, it expires on its own.
  await kv.set(LOCK_KEY, { runId, startedAt, until: new Date(0).toISOString(), releasedAt: run.finishedAt });

  console.log(`[store-tick:${reason}] ran ${results.length} job(s) in ${run.ms}ms, ${errors} error(s)`);
  return run;
}

// ── Routes ──────────────────────────────────────────────────────────────────

/**
 * The machine endpoint. Nothing but the secret decides whether this runs, and
 * nothing in the request decides what it does.
 */
storeAutonomyRouter.post(`${PREFIX}/store/cron-tick`, async (c) => {
  const expected = await expectedSecret();
  const offered = c.req.header(SECRET_HEADER) || "";
  if (!expected || !secretMatches(offered, expected)) {
    // Deliberately the same answer for "no secret configured" and "wrong
    // secret": which of the two it is tells an unauthorised caller something.
    return c.json({ success: false, error: "Unauthorized." }, 401);
  }
  try {
    const run = await runTick("cron");
    return c.json({ success: true, ...run });
  } catch (error: any) {
    console.log(`[store-tick] fatal: ${error?.message || error}`);
    return c.json({ success: false, error: String(error?.message || error) }, 500);
  }
});

/** Is the store running itself? Reads the heartbeat; invents nothing. */
storeAutonomyRouter.get(`${PREFIX}/store/autonomy/status`, async (c) => {
  if (!await isStaffRequest(c)) {
    return c.json({ success: false, error: "Company access is required for this." }, 403);
  }
  const [settings, heartbeat, secret] = await Promise.all([
    readSettings(),
    kv.get(HEARTBEAT_KEY) as Promise<any>,
    expectedSecret(),
  ]);
  const lastRunAt = heartbeat?.lastRunAt || null;
  const minutesSince = lastRunAt
    ? Math.round((Date.now() - new Date(lastRunAt).getTime()) / 60_000)
    : null;
  return c.json({
    success: true,
    // Whether a secret exists, never what it is.
    secretConfigured: Boolean(secret),
    scheduled: lastRunAt !== null,
    lastRunAt,
    minutesSinceLastRun: minutesSince,
    totalRuns: Number(heartbeat?.totalRuns || 0),
    jobs: registeredStoreJobs().map((name) => ({ name, enabled: settings.jobs[name] === true })),
    ceilings: { maxOrdersPerTick: settings.maxOrdersPerTick, maxSpendPerTick: settings.maxSpendPerTick },
    recent: Array.isArray(heartbeat?.recent) ? heartbeat.recent.slice(0, 20) : [],
  });
});

/** Switch a job on or off, or change what one tick may spend. Staff only. */
storeAutonomyRouter.put(`${PREFIX}/store/autonomy/settings`, async (c) => {
  if (!await isStaffRequest(c)) {
    return c.json({ success: false, error: "Company access is required for this." }, 403);
  }
  try {
    const body = await c.req.json().catch(() => ({}));
    const current = await readSettings();
    const jobs = { ...current.jobs };

    if (body?.jobs && typeof body.jobs === "object") {
      for (const [name, on] of Object.entries(body.jobs)) {
        if (!registry.has(name)) {
          return c.json({ success: false, error: `There is no job called "${name}".` }, 400);
        }
        jobs[name] = on === true;
      }
    }
    // Not negotiable: a clock that cannot say it is alive is the problem this
    // whole arrangement exists to solve.
    jobs.heartbeat = true;

    const orders = body?.maxOrdersPerTick === undefined ? current.maxOrdersPerTick : Number(body.maxOrdersPerTick);
    const spend = body?.maxSpendPerTick === undefined ? current.maxSpendPerTick : Number(body.maxSpendPerTick);
    if (!Number.isFinite(orders) || orders <= 0 || orders > MAX_ORDERS_CEILING) {
      return c.json({ success: false, error: `maxOrdersPerTick must be between 1 and ${MAX_ORDERS_CEILING}.` }, 400);
    }
    if (!Number.isFinite(spend) || spend <= 0 || spend > MAX_SPEND_CEILING) {
      return c.json({ success: false, error: `maxSpendPerTick must be between 1 and ${MAX_SPEND_CEILING}.` }, 400);
    }

    const actorEmail = String(c.req.header("X-Actor-Email") || "") || undefined;
    const settings: AutonomySettings = {
      jobs,
      maxOrdersPerTick: Math.floor(orders),
      maxSpendPerTick: spend,
      updatedAt: new Date().toISOString(),
      updatedBy: actorEmail,
    };
    await kv.set(SETTINGS_KEY, settings);
    const on = Object.entries(jobs).filter(([, v]) => v).map(([k]) => k);
    console.log(`[store-tick] settings changed; enabled: ${on.join(", ")}`);
    return c.json({ success: true, settings });
  } catch (error: any) {
    return c.json({ success: false, error: String(error?.message || error) }, 500);
  }
});

/**
 * Run a tick by hand, for proving the registry works without waiting for the
 * schedule or holding the cron secret. Staff only, and it goes through exactly
 * the same path as the scheduler so a successful press means something.
 */
storeAutonomyRouter.post(`${PREFIX}/store/autonomy/run`, async (c) => {
  if (!await isStaffRequest(c)) {
    return c.json({ success: false, error: "Company access is required for this." }, 403);
  }
  try {
    const run = await runTick("manual");
    return c.json({ success: true, ...run });
  } catch (error: any) {
    return c.json({ success: false, error: String(error?.message || error) }, 500);
  }
});

export default storeAutonomyRouter;
