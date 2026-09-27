/**
 * Correcting production rates from finished jobs, automatically.
 *
 * WHAT THIS IS FOR
 *
 * Every job is measured once it is done — hours actually booked against hours
 * quoted — and where a trade is consistently wrong, the rate used to quote it
 * moves toward what the crews really achieve. Under-quoting is the expensive
 * direction: a rate that is too low loses money on every job priced with it,
 * quietly, until somebody compares.
 *
 * THE ONE LINE THAT MUST NOT BE CROSSED
 *
 * A rate marked `source: 'yours'` was set by a person on purpose, and this file
 * never changes it. Those are collected as `heldBack` and offered with their
 * evidence, for somebody to accept or ignore. Everything else — the seeded book
 * figures nobody chose, and figures this file itself measured earlier — is
 * corrected without being asked.
 *
 * That split is the whole design. The system should stop anybody having to
 * maintain numbers they never picked, without ever quietly undoing a judgement
 * somebody made.
 *
 * WHY MEASURED RATES LIVE APART FROM EDITED ONES
 *
 * The labour editor saves only the tasks marked `yours` — deliberately, so a
 * future catalogue improvement still reaches an account that has edited some of
 * it. If a measured rate were written into that same store, the next save from
 * the editor would drop every automatic correction on the floor. So measured
 * rates are their own record and the reader resolves the three in order:
 *
 *     an edit somebody made  >  what we measured  >  the book figure
 *
 * That also makes every correction reversible: delete the measured record and
 * the rate falls back to what it was.
 *
 * WHY THE SAME EVIDENCE CANNOT BE APPLIED TWICE
 *
 * A trade running 18% over gets its rate scaled by 1.18. The jobs behind that
 * finding are still in the window on the next pass and still read 18% over, so
 * applying again would scale a rate that has already been corrected — 18% twice
 * is 39%, and a few passes of that prices the company out of its own market.
 *
 * Each correction therefore records the evidence it came from, and a correction
 * is skipped while that evidence has not changed. A newly finished job changes
 * the job count, which is new evidence, and the rate moves again.
 */

export type RateSource = 'seed' | 'yours' | 'measured';

/** One task in the labour catalogue, as far as this file cares. */
export interface CatalogueTask {
  id: string;
  tradeId: string;
  name?: string;
  hoursPerUnit: number;
  source: RateSource;
}

/** One rate this file has corrected, with the evidence that moved it. */
export interface MeasuredRate {
  taskId: string;
  tradeId: string;
  hoursPerUnit: number;
  /** What it was, so it can be put back. */
  previousHoursPerUnit: number;
  variancePercent: number;
  jobs: number;
  /** The sentence shown next to it on the screen. */
  because: string;
  measuredAt: string;
  /** What this correction was derived from. Identical evidence is not re-applied. */
  evidenceKey: string;
}

/** A rate somebody set themselves, with what the measurements say about it. */
export interface HeldBack {
  taskId: string;
  tradeId: string;
  name?: string;
  currentHoursPerUnit: number;
  suggestedHoursPerUnit: number;
  variancePercent: number;
  jobs: number;
  because: string;
}

/** Measured work in a trade the catalogue has no tasks for. */
export interface UnmatchedTrade {
  key: string;
  jobs: number;
  variancePercent: number;
}

/** What one variance row has to look like for this file to act on it. */
export interface VarianceRow {
  key: string;
  label: string;
  jobs: number;
  quotedHours: number;
  actualHours: number;
  variancePercent: number;
  confident: boolean;
}

export interface LearningInput {
  variance: VarianceRow[];
  /** The catalogue as it stands, including anything marked `yours`. */
  tasks: CatalogueTask[];
  /** Corrections from previous passes. */
  measured: MeasuredRate[];
  now: string;
}

export interface LearningResult {
  /** The complete set to store, previous corrections included. */
  measured: MeasuredRate[];
  /** What moved on this pass. */
  applied: MeasuredRate[];
  /** Rates somebody set, which are offered rather than changed. */
  heldBack: HeldBack[];
  /** Trades with measured work and no task to correct. */
  unmatchedTrades: UnmatchedTrade[];
}

/** Below this many finished jobs, a pattern is an anecdote. */
export const MIN_JOBS_TO_ADJUST = 5;
/** Below this, the movement is noise and re-pricing off it is worse than leaving it. */
export const MIN_VARIANCE_TO_ADJUST = 10;

const round3 = (n: number) => Math.round(n * 1000) / 1000;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * A trade name reduced to something two spellings of it share.
 *
 * Intake writes what a customer picked from a form — "Deck Building", "roofing
 * / gutters" — and the catalogue carries ids like `carpentry`. Lower-casing and
 * dropping punctuation is as far as this goes deliberately: guessing that
 * "deck" means "carpentry" would be this file inventing a mapping nobody
 * agreed, and a wrong guess silently re-prices the wrong trade. Anything that
 * does not match is reported as unmatched instead.
 */
export function tradeKey(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

/**
 * What a task's hours-per-unit actually is right now, and where it came from.
 *
 * The order is the point: an edit somebody made beats a measurement, a
 * measurement beats the book figure, and nothing else gets a say.
 */
export function resolveHoursPerUnit(
  task: CatalogueTask,
  measuredById: Record<string, MeasuredRate>,
): { hoursPerUnit: number; source: RateSource; because?: string } {
  if (task.source === 'yours') {
    return { hoursPerUnit: task.hoursPerUnit, source: 'yours' };
  }
  const m = measuredById[task.id];
  if (m && Number.isFinite(m.hoursPerUnit) && m.hoursPerUnit > 0) {
    return { hoursPerUnit: m.hoursPerUnit, source: 'measured', because: m.because };
  }
  return { hoursPerUnit: task.hoursPerUnit, source: task.source === 'measured' ? 'seed' : task.source };
}

/**
 * Resolve the whole catalogue at once, which is what a quote needs.
 */
export function resolveCatalogue(
  tasks: CatalogueTask[],
  measured: MeasuredRate[],
): Array<CatalogueTask & { resolvedFrom: RateSource; because?: string }> {
  const byId = indexMeasured(measured);
  return (tasks || []).map((t) => {
    const r = resolveHoursPerUnit(t, byId);
    return { ...t, hoursPerUnit: r.hoursPerUnit, resolvedFrom: r.source, because: r.because };
  });
}

function indexMeasured(measured: MeasuredRate[]): Record<string, MeasuredRate> {
  const out: Record<string, MeasuredRate> = {};
  for (const m of measured || []) {
    if (m?.taskId) out[String(m.taskId)] = m;
  }
  return out;
}

/**
 * What a finding is derived from, as one string.
 *
 * The job count and the variance together. A newly finished job changes the
 * count; a re-measured one changes the variance. Either is new evidence and
 * moves the rate again. Neither changing means nothing has happened since the
 * last pass, and the rate is left where it is.
 */
export function evidenceKeyFor(v: VarianceRow): string {
  return `${tradeKey(v.key)}:${v.jobs}:${round2(v.variancePercent)}`;
}

/**
 * One learning pass.
 *
 * Returns what it would store rather than storing anything, so the whole of it
 * can be checked by hand.
 */
export function learnRates(input: LearningInput): LearningResult {
  const tasks = input.tasks || [];
  const measuredById = indexMeasured(input.measured);
  const now = input.now || new Date().toISOString();

  const applied: MeasuredRate[] = [];
  const heldBack: HeldBack[] = [];
  const unmatchedTrades: UnmatchedTrade[] = [];

  for (const v of input.variance || []) {
    // Thin or small findings are left alone. Both floors are the same ones the
    // proposal path uses, so the automatic and the offered behave alike.
    if (!v.confident || v.jobs < MIN_JOBS_TO_ADJUST) continue;
    if (Math.abs(v.variancePercent) < MIN_VARIANCE_TO_ADJUST) continue;
    if (!(v.quotedHours > 0) || !(v.actualHours > 0)) continue;

    const key = tradeKey(v.key);
    const inTrade = tasks.filter((t) => tradeKey(t.tradeId) === key);
    if (inTrade.length === 0) {
      unmatchedTrades.push({ key, jobs: v.jobs, variancePercent: round2(v.variancePercent) });
      continue;
    }

    const factor = v.actualHours / v.quotedHours;
    const over = v.variancePercent > 0;
    const evidenceKey = evidenceKeyFor(v);
    const because =
      `Across ${v.jobs} finished jobs, ${v.label.toLowerCase()} took ${round2(v.actualHours)}h against `
      + `${round2(v.quotedHours)}h quoted — ${Math.abs(round2(v.variancePercent))}% ${over ? 'over' : 'under'}. `
      + `${over
        ? 'Quoting it at the measured rate stops the overrun coming out of the margin.'
        : 'The current rate is padding these quotes, which loses work on price.'}`;

    for (const task of inTrade) {
      const current = resolveHoursPerUnit(task, measuredById);
      if (!(current.hoursPerUnit > 0)) continue;

      const proposed = round3(current.hoursPerUnit * factor);
      if (proposed === current.hoursPerUnit) continue;

      // A figure somebody set on purpose. Offered, never moved.
      if (current.source === 'yours') {
        heldBack.push({
          taskId: task.id,
          tradeId: task.tradeId,
          name: task.name,
          currentHoursPerUnit: current.hoursPerUnit,
          suggestedHoursPerUnit: proposed,
          variancePercent: round2(v.variancePercent),
          jobs: v.jobs,
          because,
        });
        continue;
      }

      // Already corrected from exactly this evidence. Applying it again would
      // compound a correction that has already been made.
      const existing = measuredById[task.id];
      if (existing && existing.evidenceKey === evidenceKey) continue;

      const record: MeasuredRate = {
        taskId: task.id,
        tradeId: task.tradeId,
        hoursPerUnit: proposed,
        previousHoursPerUnit: current.hoursPerUnit,
        variancePercent: round2(v.variancePercent),
        jobs: v.jobs,
        because,
        measuredAt: now,
        evidenceKey,
      };
      measuredById[task.id] = record;
      applied.push(record);
    }
  }

  return {
    measured: Object.values(measuredById),
    applied,
    heldBack,
    unmatchedTrades,
  };
}

/**
 * Put one corrected rate back to what it was before this file touched it.
 *
 * An automatic change that cannot be undone is not one anybody should accept,
 * and the record carries the previous figure precisely so this is possible.
 */
export function revertMeasured(measured: MeasuredRate[], taskId: string): MeasuredRate[] {
  return (measured || []).filter((m) => String(m?.taskId) !== String(taskId));
}
