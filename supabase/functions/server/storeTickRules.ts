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

// ── Asking a person ─────────────────────────────────────────────────────────

/**
 * When the machine stops and asks.
 *
 * Eric's requirement, in his words: *"can we make sure the automony feature has
 * a reporting place that we can review and a place it it needs a human approval
 * or guidence we can communicate?"* Both halves matter. The heartbeat is the
 * report; this is the asking, and the answer has to come back and be acted on —
 * a one-way alert is not a conversation.
 *
 * An ask is raised by a job, carries what the job was about to do and why it
 * stopped, offers named choices, and waits. It is deliberately NOT an alert:
 * an alert is something you read, and this is something you answer.
 */
export type AskStatus = "open" | "answered" | "withdrawn";

export interface StoreAsk {
  id: string;
  /** The job that wants a decision. */
  job: string;
  /**
   * Stable per question, so a job that runs every fifteen minutes raises one
   * ask rather than ninety-six a day. This is the whole reason the queue stays
   * readable.
   */
  dedupeKey: string;
  /** One line: what is being asked. */
  question: string;
  /** Why the machine would not decide this itself. */
  because: string;
  /** What it was about to do, if nobody intervenes. Plain language. */
  wouldHaveDone?: string;
  /** Named options. The first is the machine's recommendation, if it has one. */
  choices: Array<{ key: string; label: string; consequence?: string }>;
  /** Label/value pairs: the facts a person needs to decide. */
  detail: Array<[string, string]>;
  /** What this concerns, so the answer can be applied. */
  subject?: { kind: string; id: string };
  status: AskStatus;
  raisedAt: string;
  answeredAt?: string;
  answeredBy?: string;
  /** The chosen option key. */
  answer?: string;
  /** Free text from the person answering — the "guidance" half. */
  note?: string;
}

export const ASK_CHOICE_MAX = 6;

/** Is this ask still waiting on somebody? */
export function askIsOpen(ask: unknown): boolean {
  return (ask as any)?.status === "open";
}

/**
 * Accept an answer, or say why not.
 *
 * Refuses a choice the ask never offered. A job reads `answer` and acts on it,
 * so an answer outside the offered set is an instruction the job has no code
 * for — better refused at the door than stored for a job to misread.
 */
export function applyAnswer(
  ask: StoreAsk,
  choice: string,
  opts: { by?: string; note?: string; now?: Date } = {},
): { ok: boolean; ask?: StoreAsk; error?: string } {
  /*
   * A flat shape with an optional error rather than a discriminated union.
   * This project compiles the server without strictNullChecks, and without it
   * TypeScript will not narrow `{ok:true} | {ok:false, error}` on `!result.ok`
   * — so the tidier union reads better and does not compile.
   */
  if (!askIsOpen(ask)) {
    return { ok: false, error: `This was already ${ask.status === "answered" ? "answered" : "withdrawn"}.` };
  }
  const offered = (ask.choices || []).map((c) => c.key);
  if (!offered.includes(choice)) {
    return { ok: false, error: `"${choice}" is not one of the options (${offered.join(", ")}).` };
  }
  const note = String(opts.note || "").trim().slice(0, 2000);
  return {
    ok: true,
    ask: {
      ...ask,
      status: "answered",
      answer: choice,
      answeredAt: (opts.now || new Date()).toISOString(),
      answeredBy: opts.by,
      ...(note ? { note } : {}),
    },
  };
}

/**
 * Validate what a job wants to ask, before it reaches the queue.
 *
 * A malformed ask is worse than none: it occupies the place a person looks and
 * tells them nothing they can act on. So a question, a reason and at least two
 * named choices are required — if there is only one option it is not a
 * decision, and the job should just do it.
 */
export function askIsWellFormed(ask: Partial<StoreAsk>): { ok: boolean; error?: string } {
  if (!String(ask.job || "").trim()) return { ok: false, error: "An ask must name the job that raised it." };
  if (!String(ask.dedupeKey || "").trim()) return { ok: false, error: "An ask needs a dedupe key, or it will be raised again every tick." };
  if (!String(ask.question || "").trim()) return { ok: false, error: "An ask needs a question." };
  if (!String(ask.because || "").trim()) return { ok: false, error: "An ask must say why the machine would not decide it." };
  const choices = Array.isArray(ask.choices) ? ask.choices : [];
  if (choices.length < 2) return { ok: false, error: "An ask needs at least two choices — with one option it is not a decision." };
  if (choices.length > ASK_CHOICE_MAX) return { ok: false, error: `An ask may offer at most ${ASK_CHOICE_MAX} choices.` };
  if (choices.some((c) => !String(c?.key || "").trim() || !String(c?.label || "").trim())) {
    return { ok: false, error: "Every choice needs a key and a label." };
  }
  const keys = choices.map((c) => c.key);
  if (new Set(keys).size !== keys.length) return { ok: false, error: "Two choices share a key." };
  return { ok: true };
}
