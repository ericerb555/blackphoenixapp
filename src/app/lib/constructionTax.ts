/**
 * constructionTax — sales tax on a construction job, computed one way.
 *
 * THE RULE
 *
 * Tax is on MATERIALS ONLY. Labour is a service and is not taxed in the states
 * this company works in, which is the normal treatment for US construction
 * contracts and the one the quote generator has always used.
 *
 * WHY THIS IS A MODULE AND NOT A LINE OF ARITHMETIC
 *
 * Because it was six lines of arithmetic, and they disagreed. The quote
 * generator taxed materials, the quote editor taxed materials, and the
 * pipeline's materials re-sync taxed materials PLUS labour — so the same job
 * came out at two different totals depending on which screen last touched it.
 * On a job with $4,000 of labour at 8% that is $320 of tax charged to a
 * customer who does not owe it, appearing and disappearing as the quote moves
 * between screens.
 *
 * Nothing about that is visible. Both numbers look like a total.
 *
 * CREDITS COME OFF FIRST
 *
 * Material the customer bought themselves is not material we are selling, so
 * it leaves the taxable base before the rate is applied. Taxing it and then
 * crediting the material without its tax would charge them tax on their own
 * purchase.
 */

export interface TaxableJob {
  /** What we are supplying, before anything is credited back. */
  materials: number;
  /** Material the customer supplied themselves. Positive. */
  credits?: number;
  /**
   * The rate, as a PERCENT (8 for 8%) or a FRACTION (0.08 for 8%).
   *
   * Both conventions exist in the stored data — the quote records hold 0.08,
   * the invoice builder holds 8 — and a module that silently picked one would
   * be wrong by a factor of a hundred for half its callers. See `readRate`.
   */
  rate: number;
}

/**
 * Read a rate whichever way it was written.
 *
 * Anything at or below 1 is treated as a fraction, anything above as a
 * percent. The ambiguous case is exactly 1, which would be either 1% or 100%;
 * it is read as 100% because a fraction of 1 is what a caller passing
 * fractions means, and nobody charges 1% sales tax.
 *
 * A rate is clamped to a sane ceiling. No US jurisdiction charges more than
 * about 12%, and a 5000% tax is a data error that should not reach a customer
 * as a number with a dollar sign in front of it.
 */
export function readRate(rate: unknown): number {
  const value = Number(rate);
  if (!Number.isFinite(value) || value <= 0) return 0;
  const fraction = value <= 1 ? value : value / 100;
  return Math.min(0.25, fraction);
}

/** What the tax is actually charged on. Never negative. */
export function taxableBase(job: TaxableJob): number {
  const materials = Math.max(0, Number(job?.materials) || 0);
  const credits = Math.abs(Number(job?.credits) || 0);
  return Math.max(0, round2(materials - credits));
}

/**
 * The tax due on this job.
 *
 * Labour is not passed in at all, deliberately. A function that accepted it
 * and then ignored it would invite somebody to "fix" the omission.
 */
export function constructionTax(job: TaxableJob): number {
  return round2(taxableBase(job) * readRate(job?.rate));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
