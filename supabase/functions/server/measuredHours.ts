/**
 * Putting what the crews actually achieve into the hours a quote is built from.
 *
 * WHERE THE HOURS ON A QUOTE COME FROM TODAY
 *
 * A language model reasons about crew size and productivity and returns a
 * number. That number is labelled `hoursSource: 'estimated'` precisely because
 * nobody measured it — and until this file existed, nothing ever corrected it.
 * Jobs were finished, hours were booked against them, the variance was computed
 * on a screen, and the next quote still asked the model to guess again.
 *
 * WHAT THIS DOES
 *
 * Takes the measured variance per trade and scales the estimated hours by it.
 * Carpentry running 30% over its quoted hours across nine finished jobs means
 * the next carpentry line is quoted at 1.3× what the model said, and marked
 * `measured` rather than `estimated` so the quote says which of its figures are
 * real.
 *
 * WHY THE FACTOR IS CLAMPED
 *
 * A factor is a ratio of two sums, and a small number of unusual jobs can
 * produce a wild one — five jobs that all went badly could say a trade takes
 * four times as long as quoted. Tripling every future quote on that evidence
 * would lose the work outright, and halving it would lose money on all of it.
 * So the correction is bounded, and a factor outside the band is clamped to the
 * edge rather than dropped: the direction is almost certainly right even when
 * the magnitude is not yet trustworthy.
 *
 * WHAT IT WILL NOT TOUCH
 *
 * A line whose hours somebody set themselves. The model's output is always
 * `estimated`, so in practice this corrects guesses and leaves decisions alone
 * — the same line the rate-learning loop draws.
 *
 * NO ARITHMETIC IN A LANGUAGE MODEL
 *
 * The model proposes hours. The correction, the multiplication and the line
 * total all happen here, where they can be checked by hand and are.
 */

/** One trade's measured variance, in the shape `varianceByTask` returns. */
export interface VarianceRow {
  key: string;
  label: string;
  jobs: number;
  quotedHours: number;
  actualHours: number;
  variancePercent: number;
  confident: boolean;
}

export interface TradeFactor {
  key: string;
  label: string;
  /** Multiply estimated hours by this. */
  factor: number;
  jobs: number;
  variancePercent: number;
  /** Whether the raw ratio had to be pulled back to the band. */
  clamped: boolean;
  because: string;
}

/** Below this many finished jobs a pattern is an anecdote. */
export const MIN_JOBS = 5;
/** Below this the movement is noise. */
export const MIN_VARIANCE = 10;
/** The widest correction a quote will carry from measurement alone. */
export const MIN_FACTOR = 0.6;
export const MAX_FACTOR = 1.8;

const round2 = (n: number) => Math.round(n * 100) / 100;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** A trade name reduced to something two spellings of it share. */
export function tradeKey(value: unknown): string {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '').trim();
}

/**
 * The trades we have enough evidence to correct, and by how much.
 *
 * Anything thin, small, or without both sides of the comparison is left out
 * entirely rather than being included with a factor of one — a caller should be
 * able to tell "we measured this and it is fine" from "we have not measured
 * this", and an entry that does nothing hides the difference.
 */
export function tradeFactorsFrom(variance: VarianceRow[]): Record<string, TradeFactor> {
  const out: Record<string, TradeFactor> = {};

  for (const v of variance || []) {
    if (!v?.confident || Number(v.jobs) < MIN_JOBS) continue;
    if (Math.abs(Number(v.variancePercent) || 0) < MIN_VARIANCE) continue;
    if (!(Number(v.quotedHours) > 0) || !(Number(v.actualHours) > 0)) continue;

    const raw = Number(v.actualHours) / Number(v.quotedHours);
    if (!Number.isFinite(raw) || raw <= 0) continue;

    const factor = round3(Math.min(MAX_FACTOR, Math.max(MIN_FACTOR, raw)));
    const clamped = round3(raw) !== factor;
    const over = v.variancePercent > 0;

    out[tradeKey(v.key)] = {
      key: tradeKey(v.key),
      label: v.label || v.key,
      factor,
      jobs: v.jobs,
      variancePercent: round2(v.variancePercent),
      clamped,
      because:
        `Measured across ${v.jobs} finished jobs: ${round2(v.actualHours)}h taken against `
        + `${round2(v.quotedHours)}h quoted, ${Math.abs(round2(v.variancePercent))}% ${over ? 'over' : 'under'}.`
        + (clamped ? ' The correction is capped until more jobs are behind it.' : ''),
    };
  }

  return out;
}

export interface LaborLine {
  trade?: string;
  role?: string;
  hours: number;
  hourlyRate: number;
  totalCost?: number;
  hoursSource?: string;
  modelHours?: number;
  productivityNote?: string;
  [key: string]: any;
}

export interface MeasuredResult {
  lines: LaborLine[];
  /** How many lines were corrected, for the caller to report honestly. */
  adjusted: number;
}

/**
 * Correct one estimate's labour lines against what the trades actually take.
 *
 * The original figure is kept as `modelHours` rather than overwritten, so a
 * quote can always show what was guessed and what replaced it — and so a
 * correction that later proves wrong can be traced rather than argued about.
 */
export function applyMeasuredHours(
  lines: LaborLine[],
  factors: Record<string, TradeFactor>,
): MeasuredResult {
  let adjusted = 0;

  const out = (lines || []).map((line) => {
    const hours = Number(line?.hours) || 0;
    const rate = Number(line?.hourlyRate) || 0;

    // Only a guess is corrected. Anything a person set stands.
    if (String(line?.hoursSource || 'estimated') !== 'estimated') return line;
    if (!(hours > 0)) return line;

    const f = factors[tradeKey(line?.trade)];
    if (!f) return line;

    const corrected = round2(hours * f.factor);
    if (corrected === hours) return line;

    adjusted++;
    return {
      ...line,
      hours: corrected,
      totalCost: round2(corrected * rate),
      hoursSource: 'measured',
      /** What the model said, kept so the change is always traceable. */
      modelHours: hours,
      measuredFactor: f.factor,
      productivityNote: [line?.productivityNote, f.because].filter(Boolean).join(' '),
    };
  });

  return { lines: out, adjusted };
}
