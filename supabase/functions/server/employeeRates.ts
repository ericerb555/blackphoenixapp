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

export interface EmployeeRates {
  payType?: PayType | string;
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
