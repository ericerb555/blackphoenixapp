/**
 * Hours from a maintenance plan, spent against a quote.
 *
 * Eric, 2026-11-21: "we should be able to tie is all our dicounts and hours",
 * then "add pdf and hours".
 *
 * WHAT WAS ALREADY TRUE
 *
 * The banks are real. A `plan:` record carries `hours.included`,
 * `hours.used` and `hours.overageRate`; `plan_usage:` logs each visit;
 * `recordEntitlementEvent` keeps the balance. What did not exist was any
 * connection to a quote — so a customer paying for a plan with five hours in
 * it received a quote charging for every hour of labour on the job, and the
 * hours sat unspent until somebody happened to remember them.
 *
 * THE THREE DECISIONS THIS FILE MAKES, because they are pricing decisions and
 * they should be written down rather than buried in a component:
 *
 * 1. WHAT AN HOUR IS WORTH — the quote's own blended labour rate, which is
 *    the customer-priced labour subtotal divided by the labour hours on the
 *    quote. That is what this job actually bills an hour at, so an hour off
 *    the plan cancels exactly one hour of the work being quoted.
 *
 *    When the quote carries no labour hours to divide by, the plan's own
 *    overage rate is used instead and `basis` says so. That rate is what the
 *    customer pays for an hour beyond the bank, which is the closest thing to
 *    an agreed price for an hour that exists. Never a guess, and never zero —
 *    an hour valued at nothing is an hour quietly thrown away.
 *
 * 2. HOW MANY CAN BE SPENT — no more than the bank holds, and never worth
 *    more than the labour on the quote. Hours cannot reduce materials: the
 *    plan buys our time, and a bank big enough to wipe out a job would
 *    otherwise start discounting the lumber.
 *
 * 3. WHEN THE BANK IS DEBITED — NOT HERE, and not when the quote is sent.
 *    Applying hours to a quote records an intention; the balance moves when
 *    the work is invoiced, through `POST /maintenance-plans/:id/log-hours`,
 *    which already exists and already writes the ledger. A quote the customer
 *    never accepts must not spend their hours, and a quote revised twice must
 *    not spend them twice.
 */

export interface PlanHourBank {
  planId: string;
  planName: string;
  hoursRemaining: number;
  overageRate: number;
}

export interface AppliedPlanHours {
  planId: string;
  planName: string;
  /** Hours actually applied, after both caps. */
  hours: number;
  /** What one hour was valued at. */
  rate: number;
  /** `hours × rate`, rounded. What comes off the quote. */
  amount: number;
  /** Which rule produced the rate, so a reader can tell. */
  basis: 'quote-rate' | 'plan-overage-rate';
  /** Set when fewer hours were applied than asked for, and why. */
  cappedBy?: 'bank' | 'labour';
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The blended rate this quote bills an hour at.
 *
 * The CUSTOMER-priced labour, not our cost — an hour off the plan has to
 * cancel an hour of what the customer is being charged, or the deduction is
 * not the hour they think they are spending.
 */
export function quoteHourRate(labourShown: unknown, labourHours: unknown): number {
  const money = Number(labourShown);
  const hours = Number(labourHours);
  if (!Number.isFinite(money) || !Number.isFinite(hours) || hours <= 0 || money <= 0) return 0;
  return round2(money / hours);
}

/**
 * Apply hours from one bank to one quote.
 *
 * Returns null when nothing can be applied, which is a different thing from
 * applying zero: a caller that stored `{ hours: 0 }` would put a "0 hours
 * from your plan" row on a customer's quote.
 */
export function applyPlanHours(opts: {
  bank: PlanHourBank;
  /** How many the operator asked to use. */
  hours: number;
  /** Customer-priced labour on the quote, after any discount. */
  labourShown: number;
  /** Labour hours on the quote, for the rate. */
  labourHours: number;
}): AppliedPlanHours | null {
  const { bank, labourShown, labourHours } = opts;
  const asked = Number(opts.hours);
  if (!bank?.planId || !Number.isFinite(asked) || asked <= 0) return null;

  const remaining = Math.max(0, Number(bank.hoursRemaining) || 0);
  if (remaining <= 0) return null;

  const quoteRate = quoteHourRate(labourShown, labourHours);
  const rate = quoteRate > 0 ? quoteRate : round2(Number(bank.overageRate) || 0);
  if (rate <= 0) return null;
  const basis: AppliedPlanHours['basis'] = quoteRate > 0 ? 'quote-rate' : 'plan-overage-rate';

  let hours = Math.min(asked, remaining);
  let cappedBy: AppliedPlanHours['cappedBy'] = hours < asked ? 'bank' : undefined;

  /*
   * Worth no more than the labour being quoted. The plan buys our time, so a
   * bank larger than the job stops at the job rather than starting to
   * discount the materials.
   */
  const labourCeiling = Math.max(0, Number(labourShown) || 0);
  if (round2(hours * rate) > labourCeiling) {
    hours = round2(labourCeiling / rate);
    cappedBy = 'labour';
  }
  if (hours <= 0) return null;

  return {
    planId: bank.planId,
    planName: bank.planName,
    hours: round2(hours),
    rate,
    amount: round2(round2(hours) * rate),
    basis,
    ...(cappedBy ? { cappedBy } : {}),
  };
}

/** What a stored `quote.planHours` takes off, coerced and safe to draw. */
export function planHoursDeduction(quote: any): AppliedPlanHours | null {
  const raw = quote?.planHours;
  if (!raw || typeof raw !== 'object') return null;
  const hours = Number(raw.hours);
  const amount = Number(raw.amount);
  if (!Number.isFinite(hours) || hours <= 0) return null;
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return {
    planId: String(raw.planId || ''),
    planName: String(raw.planName || 'Maintenance plan'),
    hours: round2(hours),
    rate: round2(Number(raw.rate) || 0),
    amount: round2(amount),
    basis: raw.basis === 'plan-overage-rate' ? 'plan-overage-rate' : 'quote-rate',
    ...(raw.cappedBy === 'bank' || raw.cappedBy === 'labour' ? { cappedBy: raw.cappedBy } : {}),
  };
}
