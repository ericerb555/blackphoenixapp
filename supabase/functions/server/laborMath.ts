/**
 * What a quantity of work costs in man-hours and money.
 *
 * WHY THIS LIVES ON THE SERVER
 *
 * It was in `src/app/lib/laborTasks.ts`, which the design centre and the rates
 * screens import and which an edge function cannot reach — only
 * `supabase/functions` is uploaded. So when the blueprint quoter needed the same
 * arithmetic it had two choices: a second copy, or this.
 *
 * A second copy is the thing to avoid. The minimum-hours floor is the whole
 * reason small jobs are priced correctly, and two implementations of it would
 * eventually disagree about a customer's price depending on which screen asked.
 * The client re-exports from here, so there is one.
 *
 * MAN-HOURS, NOT CREW-HOURS — READ THIS BEFORE CHANGING ANYTHING
 *
 * `hoursPerUnit` is MAN-hours: the labour one person would spend. Cost is
 * hours × rate, and crew size does not enter the cost at all — it only says how
 * long the work occupies the calendar. Two framers at 0.035 man-hours per
 * square foot cost the same as one framer taking twice as long; they simply
 * finish sooner. Reading these as crew-hours and multiplying by crew size
 * doubles every labour line, which is the easiest way to price yourself out of
 * a job.
 */

export type LaborUnit = 'sq ft' | 'lin ft' | 'each' | 'sheet' | 'square' | 'hour' | 'day';

export interface LaborTask {
  id: string;
  /** Matches the id used by the labour-rate list, so the rate is looked up not duplicated. */
  tradeId: string;
  name: string;
  unit: LaborUnit;
  /** MAN-hours per unit. See the note above before changing this. */
  hoursPerUnit: number;
  /** For scheduling only. Deliberately not part of the cost. */
  crewSize: number;
  /**
   * The floor, in man-hours. A 20 sq ft tile patch is not 2 hours of work — it
   * is a trip, a setup, a cut station, a cleanup and a return to grout. Without
   * a floor, hours-per-unit prices every small job far too low, which is where
   * a renovation business actually loses money.
   */
  minimumHours: number;
  notes?: string;
  source: 'seed' | 'yours';
  updatedAt?: string;
}

/**
 * Things that make the same work take longer.
 *
 * Kept separate from the tasks because they cut across trades: working in an
 * occupied house slows every trade in it, not just the tiler.
 */
export interface LaborCondition {
  id: string;
  label: string;
  /** 1.15 means fifteen percent more hours. */
  multiplier: number;
  note: string;
}

export const LABOR_CONDITIONS: LaborCondition[] = [
  { id: 'occupied', label: 'Occupied home', multiplier: 1.15, note: 'Protection, daily clean-down, working around people and furniture.' },
  { id: 'tight-access', label: 'Tight or difficult access', multiplier: 1.20, note: 'Long carries, no driveway, stairs only, limited parking.' },
  { id: 'upper-floor', label: 'Second storey or above', multiplier: 1.10, note: 'Material handling up stairs, staging.' },
  { id: 'demo-first', label: 'Demolition before the new work', multiplier: 1.15, note: 'Unknowns behind the existing surface, extra protection.' },
  { id: 'old-house', label: 'Pre-1950 structure', multiplier: 1.20, note: 'Out of plumb and level, non-standard dimensions, surprises.' },
  { id: 'winter', label: 'Winter exterior work', multiplier: 1.15, note: 'Short days, cold-weather handling, weather delays.' },
  { id: 'pattern', label: 'Pattern or diagonal layout', multiplier: 1.35, note: 'Herringbone, diagonal, borders — far more cuts and layout time.' },
  { id: 'small-job', label: 'Small or single-room job', multiplier: 1.10, note: 'Setup and breakdown carry across less work.' },
];

export interface LaborEstimate {
  /** Man-hours after conditions and the minimum floor. */
  hours: number;
  /** Hours before the floor was applied, so the quote can explain itself. */
  rawHours: number;
  /** True when the minimum, not the quantity, decided the number. */
  minimumApplied: boolean;
  /** Combined condition multiplier, 1 when none apply. */
  conditionMultiplier: number;
  cost: number;
  /** Roughly how many working days this occupies, given the crew. */
  crewDays: number;
}

const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;

/**
 * Labour for one task.
 *
 * Cost is hours × rate. Crew size is deliberately absent from that line — see
 * the man-hours note at the top of this file.
 */
export function estimateTaskLabor(
  task: Pick<LaborTask, 'hoursPerUnit' | 'minimumHours' | 'crewSize'>,
  quantity: number,
  hourlyRate: number,
  conditionIds: string[] = [],
): LaborEstimate {
  const qty = Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
  const rate = Number.isFinite(hourlyRate) && hourlyRate > 0 ? hourlyRate : 0;

  const multiplier = conditionIds.reduce((acc, id) => {
    const c = LABOR_CONDITIONS.find(x => x.id === id);
    return c ? acc * c.multiplier : acc;
  }, 1);

  const rawHours = qty * (Number(task.hoursPerUnit) || 0) * multiplier;

  // The floor applies to real work only. A quantity of zero is not a job, and
  // charging a minimum for it would put a phantom line on the quote.
  const floor = Number(task.minimumHours) || 0;
  const hours = qty > 0 ? Math.max(rawHours, floor) : 0;

  const crew = Math.max(1, Number(task.crewSize) || 1);

  return {
    hours: round(hours),
    rawHours: round(rawHours),
    minimumApplied: qty > 0 && floor > rawHours,
    conditionMultiplier: round(multiplier, 4),
    cost: round(hours * rate),
    crewDays: round(hours / crew / 8, 2),
  };
}
