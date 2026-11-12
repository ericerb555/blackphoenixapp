/**
 * What is planned, how far through it we are, and which plans have stopped
 * moving.
 *
 * The counts come from `taskDigest.generated.ts`, written at deploy time by
 * `scripts/build-task-digest.mjs` — see that file for why a build step and not
 * a query. Everything here is the judgement applied to those counts, and it is
 * pure so it can be tested.
 *
 * THE DISTINCTION THIS EXISTS TO MAKE
 *
 * A total is useless. "495 open items" is not something anybody can act on,
 * and reporting it would be worse than saying nothing because it sounds like
 * information. What is worth knowing is which of four states a plan is in:
 *
 *   not-started  written, nothing ticked. Might be a dead end, might be next.
 *   nearly-done  most of it ticked. The cheapest remaining wins are here.
 *   stalled      part-done and not touched in a month. The expensive ones:
 *                work already paid for that is not finished.
 *   active       touched recently. Leave it alone, somebody is on it.
 *
 * Only the git date separates `stalled` from `active`, which is why the digest
 * gathers it. A plan with eight open items tells you nothing on its own.
 *
 * WHAT THIS CANNOT TELL YOU
 *
 * A ticked box means somebody ticked a box. It is not evidence the work
 * shipped, and this file must never be reported as though it were — the same
 * caution the agent registry needs about silence. It also says nothing about
 * plans that were finished and deleted, or work done without a plan at all.
 */

export interface PlanSnapshot {
  file: string;
  title: string;
  open: number;
  done: number;
  /** ISO of the last commit touching the file, or null when git could not say. */
  lastTouched: string | null;
}

export type PlanState = 'active' | 'nearly-done' | 'stalled' | 'not-started';

export interface PlanStatus extends PlanSnapshot {
  state: PlanState;
  /** 0-1, or null when there is nothing to divide. */
  completion: number | null;
  ageDays: number | null;
}

/** Touched inside this window and it is somebody's current work. */
export const ACTIVE_WITHIN_DAYS = 14;
/** Part-done and untouched for this long is stalled, not in progress. */
export const STALLED_AFTER_DAYS = 30;
/** Most of the way there. The cheap wins. */
export const NEARLY_DONE_AT = 0.8;

function ageDays(iso: string | null, now: number): number | null {
  if (!iso) return null;
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return null;
  return Math.max(0, (now - at) / 86_400_000);
}

/**
 * One plan's state.
 *
 * Order matters and is deliberate. `not-started` is decided before anything
 * about age, because a plan with nothing ticked is the same question whenever
 * it was written — someone has to say whether it is next or abandoned, and
 * calling a two-week-old untouched plan "active" would bury it.
 */
export function classify(plan: PlanSnapshot, now: number): PlanStatus {
  const total = plan.open + plan.done;
  const completion = total > 0 ? plan.done / total : null;
  const age = ageDays(plan.lastTouched, now);

  let state: PlanState;
  if (plan.open === 0) {
    state = 'nearly-done';              // nothing open: finished, as far as the boxes go
  } else if (plan.done === 0) {
    state = 'not-started';
  } else if (age !== null && age <= ACTIVE_WITHIN_DAYS) {
    state = 'active';
  } else if (age === null || age > STALLED_AFTER_DAYS) {
    // Unknown age counts as stalled rather than active: an unverifiable date
    // must not let a forgotten plan read as somebody's current work.
    state = 'stalled';
  } else if (completion !== null && completion >= NEARLY_DONE_AT) {
    state = 'nearly-done';
  } else {
    state = 'stalled';
  }

  return { ...plan, state, completion, ageDays: age };
}

export interface WorkSummary {
  generatedAt: string | null;
  plans: PlanStatus[];
  totals: { plans: number; open: number; done: number };
  /** Part-done, not touched in a month. Work already paid for and unfinished. */
  stalled: PlanStatus[];
  /** Most of the way there. The cheapest remaining wins. */
  nearlyDone: PlanStatus[];
  /** Written, nothing ticked. Next, or a dead end — somebody has to say which. */
  notStarted: PlanStatus[];
  note: string;
}

/**
 * The whole digest, judged.
 *
 * Returns the lists rather than a total, because the total is the one number
 * here that cannot be acted on.
 */
export function summariseWork(
  plans: readonly PlanSnapshot[], generatedAt: string | null, now: number,
): WorkSummary {
  const judged = plans.map((p) => classify(p, now));
  const pick = (s: PlanState) => judged.filter((p) => p.state === s);

  return {
    generatedAt,
    plans: judged,
    totals: {
      plans: judged.length,
      open: judged.reduce((n, p) => n + p.open, 0),
      done: judged.reduce((n, p) => n + p.done, 0),
    },
    stalled: pick('stalled'),
    nearlyDone: pick('nearly-done'),
    notStarted: pick('not-started'),
    note: 'A ticked box means somebody ticked a box, not that the work shipped — '
      + 'say so rather than reporting these as delivered features. The digest is a '
      + 'snapshot taken when the server was last deployed, so a plan edited since '
      + 'then will not show here yet.',
  };
}

/**
 * The generated snapshot, or empty when it was never generated.
 *
 * Dynamic, and tolerant of an empty one, so a deploy that skipped the digest
 * step still runs. An absent or empty digest is reported as "not generated"
 * rather than as "no unfinished work" — opposite answers, and only one of them
 * is ever true.
 */
export async function loadDigest(): Promise<{ generatedAt: string | null; plans: PlanSnapshot[] }> {
  try {
    const mod = await import('./taskDigest.generated.ts');
    return {
      generatedAt: (mod as any).GENERATED_AT ?? null,
      plans: Array.isArray((mod as any).PLANS) ? (mod as any).PLANS : [],
    };
  } catch {
    return { generatedAt: null, plans: [] };
  }
}
