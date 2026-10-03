/**
 * The decisions the store's clock makes, with nothing else attached.
 *
 * WHY THIS IS A SEPARATE FILE
 *
 * `storeAutonomy.ts` imports Hono, supabase-js and the KV store, so it only
 * runs inside Deno and cannot be loaded by the test runner. These three rules
 * are the ones where being wrong is expensive and silent:
 *
 *   - a secret comparison that accepts something it should not
 *   - a settings reader that turns "absent" into "enabled", which would arm a
 *     job nobody switched on
 *   - a staleness judgement that calls a dead clock healthy
 *
 * None of them needs a network, so none of them has an excuse to be untested.
 */

/** How long a tick may run before a later one assumes it died. */
export const LOCK_MINUTES = 10;

/** No tick in this long means something is wrong, not that it is quiet. */
export const STALE_AFTER_MINUTES = 45;

export interface AutonomySettings {
  /** Job name → enabled. A job absent from here is OFF. */
  jobs: Record<string, boolean>;
  maxOrdersPerTick: number;
  maxSpendPerTick: number;
  updatedAt?: string;
  updatedBy?: string;
}

/**
 * Everything off but the heartbeat.
 *
 * The heartbeat cannot be switched off: its whole purpose is to prove the clock
 * is alive, and a scheduler that stopped without saying so is the failure this
 * system exists to prevent. Everything that touches money or a customer starts
 * disabled and is switched on one at a time.
 */
export const DEFAULT_SETTINGS: AutonomySettings = {
  jobs: { heartbeat: true },
  maxOrdersPerTick: 25,
  maxSpendPerTick: 2000,
};

export const MAX_ORDERS_CEILING = 500;
export const MAX_SPEND_CEILING = 100000;

/**
 * Read stored settings into something safe to act on.
 *
 * Fails closed in the direction that matters: anything not explicitly `true` is
 * off. A stored `{ fulfil: "yes" }` or `{ fulfil: 1 }` must not place supplier
 * orders — only `true` does, so a half-written record cannot spend money.
 */
export function normaliseSettings(stored: unknown): AutonomySettings {
  const source = (stored && typeof stored === "object" ? stored : {}) as Record<string, unknown>;
  const jobs: Record<string, boolean> = {};
  const storedJobs = source.jobs;
  if (storedJobs && typeof storedJobs === "object") {
    for (const [name, on] of Object.entries(storedJobs as Record<string, unknown>)) {
      jobs[name] = on === true;
    }
  }
  // Always, regardless of what was stored or whether anything was.
  jobs.heartbeat = true;

  const orders = Number(source.maxOrdersPerTick);
  const spend = Number(source.maxSpendPerTick);
  return {
    jobs,
    maxOrdersPerTick: Number.isFinite(orders) && orders > 0 && orders <= MAX_ORDERS_CEILING
      ? Math.floor(orders)
      : DEFAULT_SETTINGS.maxOrdersPerTick,
    maxSpendPerTick: Number.isFinite(spend) && spend > 0 && spend <= MAX_SPEND_CEILING
      ? spend
      : DEFAULT_SETTINGS.maxSpendPerTick,
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : undefined,
    updatedBy: typeof source.updatedBy === "string" ? source.updatedBy : undefined,
  };
}

/**
 * Compare without leaking how much of the secret was right.
 *
 * A plain `!==` returns as soon as two bytes differ, so how long it takes is a
 * signal about the prefix. It is a thin channel over the public internet and a
 * 32-byte random secret is not realistically guessable through it — but the fix
 * costs a few lines, and "probably not exploitable" is a worse reason than
 * "cannot be".
 *
 * An empty expected secret never matches. An unset secret must mean "refuse",
 * never "no check required", and this is the second place that is enforced.
 */
export function secretMatches(offered: string, expected: string): boolean {
  if (!expected || !offered) return false;
  const a = new TextEncoder().encode(offered);
  const b = new TextEncoder().encode(expected);
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i += 1) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

/** Is a lease still held, so this tick should stand down? */
export function leaseIsHeld(lock: unknown, now: Date = new Date()): boolean {
  const until = (lock as any)?.until;
  if (!until) return false;
  const t = new Date(String(until)).getTime();
  if (Number.isNaN(t)) return false;
  return t > now.getTime();
}

export type ClockHealth = "never-run" | "healthy" | "stale";

/**
 * What to say about a clock, from its last run alone.
 *
 * "never-run" and "stale" are deliberately different answers. The first means
 * the schedule was never armed or cannot reach the route — the 401 trap, a
 * wrong URL, a missing secret. The second means it ran and then stopped, which
 * is a different investigation. Collapsing them into "unhealthy" would throw
 * away the only clue.
 */
export function clockHealth(lastRunAt: unknown, now: Date = new Date()): ClockHealth {
  if (!lastRunAt) return "never-run";
  const t = new Date(String(lastRunAt)).getTime();
  if (Number.isNaN(t)) return "never-run";
  const minutes = (now.getTime() - t) / 60_000;
  return minutes > STALE_AFTER_MINUTES ? "stale" : "healthy";
}

/** Which registered jobs are switched off, for the heartbeat to report. */
export function disabledJobs(registered: string[], settings: AutonomySettings): string[] {
  return registered.filter((name) => name !== "heartbeat" && settings.jobs[name] !== true);
}
