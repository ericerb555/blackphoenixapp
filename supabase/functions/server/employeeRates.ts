/**
 * What an employee's hour costs, and what it is billed at.
 *
 * WHY THIS IS ITS OWN TESTED MODULE
 *
 * Because getting it wrong is not a visible error, it is a wrong margin. Job
 * costing multiplies a rate by hours. The HR side stores an ANNUAL figure for
 * salaried staff — 72,000 for a project manager. Multiply that by hours and a
 * single day of their time costs the job half a million pounds, the margin
 * inverts, and the rate-learning loop is fed from the result. Nothing throws.
 *
 * So the conversion lives here, in a `.ts` the test runner can strip types from
 * and check by hand, rather than inline at the call site where it would be one
 * refactor away from being dropped.
 *
 * TWO RATES, DELIBERATELY
 *
 * Eric's requirement: "it should be able to add actual pay and billed out rate
 * for each employee." The pay rate is what the company pays — a cost. The bill
 * rate is what the hour is charged at — revenue. The difference across hours
 * actually worked is the labour margin, and holding only one of them makes that
 * margin uncomputable. It is the labour half of the rule that already keeps a
 * purchase order's total (what we pay the vendor) apart from what the customer
 * is charged.
 */

/**
 * The divisor for turning a salary into an hourly cost: 40 hours, 52 weeks.
 *
 * A convention rather than a measurement, and named so it can be changed in
 * one place if Black Phoenix counts a working year differently. It is
 * deliberately NOT net of holiday — a salaried person is paid through their
 * leave, so their cost per working hour is slightly higher than this suggests.
 * Erring low understates cost and overstates margin, which is the direction
 * that flatters a job, so if this is ever tuned it should move UP.
 */
export const HOURS_PER_YEAR = 2080;

export type PayType = 'hourly' | 'salary';

/**
 * How somebody is engaged: an employee on a W-2, or a contractor on a W-9.
 *
 * A SEPARATE AXIS FROM `PayType`, and worth keeping separate. A W-2 employee
 * may be hourly or salaried; a W-9 contractor invoices and is neither. Folding
 * the two into one field would put a tax classification into the value that
 * decides whether to divide a figure by 2,080.
 *
 * WHAT THIS DOES NOT YET DO, STATED PLAINLY
 *
 * A W-2 hour costs more than the pay rate. Employer FICA, unemployment
 * insurance and workers' compensation are real costs of that hour and are
 * typically 10–25% on top. `hourlyCostRate` does not apply any burden, so a
 * W-2 hour is costed at the bare rate and the labour margin on it reads
 * slightly better than it truly is.
 *
 * That is recorded rather than guessed at. The direction of the error is the
 * flattering one — the same fault `HOURS_PER_YEAR` warns about above — and the
 * multiplier is a number Black Phoenix has to supply, not one to invent here.
 */
export type WorkerType = 'w2' | 'w9';

export interface EmployeeRates {
  payType?: PayType | string;
  /** W-2 or W-9. Does not affect the arithmetic yet — see WorkerType. */
  workerType?: WorkerType | string;
  /** Hourly for an hourly employee; ANNUAL for a salaried one. */
  payRate?: number | string | null;
  /** Always hourly. What this person's time is charged at. */
  billRate?: number | string | null;
}

const finiteOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/**
 * What one hour of this person costs the company.
 *
 * Returns null when it cannot be known, never zero. Zero is a claim that the
 * labour was free, and `jobOutcome` already counts an unknown rate separately
 * (`ratesMissing`) precisely so that a job with unpriced hours reports a gap
 * rather than a flattering margin.
 */
export function hourlyCostRate(employee: EmployeeRates | null | undefined): number | null {
  const rate = finiteOrNull(employee?.payRate);
  if (rate === null || rate === 0) return null;
  if (String(employee?.payType || '').toLowerCase() === 'salary') {
    return rate / HOURS_PER_YEAR;
  }
  return rate;
}

/**
 * What one hour of this person is billed at.
 *
 * Always hourly whatever the pay type — a salaried person's time is still
 * charged by the hour on a quote, and their salary has nothing to do with what
 * the customer pays for it.
 */
export function hourlyBillRate(employee: EmployeeRates | null | undefined): number | null {
  const rate = finiteOrNull(employee?.billRate);
  return rate === null || rate === 0 ? null : rate;
}

/**
 * The margin on an hour of this person's time, as a fraction of what is billed.
 *
 * Null unless BOTH rates are known — a margin computed from half the numbers is
 * the thing this whole pairing exists to prevent. Negative is returned rather
 * than hidden: billing somebody out below cost is exactly what somebody looking
 * at this screen needs to see.
 */
export function hourlyMargin(employee: EmployeeRates | null | undefined): {
  cost: number; bill: number; profit: number; percent: number;
} | null {
  const cost = hourlyCostRate(employee);
  const bill = hourlyBillRate(employee);
  if (cost === null || bill === null) return null;
  const profit = bill - cost;
  return { cost, bill, profit, percent: (profit / bill) * 100 };
}

/**
 * What an hour truly costs once the employer's own costs are counted.
 *
 * Eric asked for the burden to be editable, so this is the arithmetic behind
 * that number. It is deliberately a SEPARATE function from `hourlyCostRate`
 * rather than a change to it.
 *
 * WHY SEPARATE, WHEN FOLDING IT IN WOULD BE TIDIER
 *
 * `hourlyCostRate` feeds `jobOutcome`, every margin figure and the
 * rate-learning loop. Teaching it about burden would change every job's
 * reported margin at once, including jobs already closed, as a side effect of
 * adding a settings field. That is a decision with a before and after, not a
 * refactor. So nothing existing moves until it is wired in on purpose.
 *
 * A W-9 CONTRACTOR NEVER CARRIES BURDEN
 *
 * Their cost is their rate — no employer FICA, no unemployment insurance, no
 * workers' compensation. That is what being a contractor means, and it is the
 * single most important line here: applying burden to a 1099 hour would
 * overstate cost and understate margin, which is the opposite error but an
 * error all the same.
 *
 * AN UNSET BURDEN CHANGES NOTHING
 *
 * Null, empty or unparseable returns the bare rate. Not a guessed 15% — a
 * plausible default would quietly move every margin in the system, and the
 * whole reason this is editable is that only Black Phoenix knows the figure.
 */
export function burdenedHourlyCost(
  rates: EmployeeRates | null | undefined,
  burdenPercent?: number | string | null,
): number | null {
  const base = hourlyCostRate(rates);
  if (base === null) return null;

  // A contractor's cost is their rate. Nothing is added, whatever is set.
  if (String(rates?.workerType ?? '').toLowerCase() === 'w9') return base;

  const percent = finiteOrNull(burdenPercent);
  if (percent === null || percent === 0) return base;

  return base * (1 + percent / 100);
}
