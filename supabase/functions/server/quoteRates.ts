/**
 * Whose percentages a generated quote is priced with.
 *
 * WHY THIS IS ITS OWN MODULE
 *
 * The same reason `quoteMargins.ts` and `quoteTotal.ts` are: it decides what a
 * customer is charged and it was living in `quote-generator.tsx`, a file the
 * test runner cannot load. Every time that has been true in this codebase the
 * untestable arithmetic is where the fault was found — 40% overhead on every
 * repriced quote, a contract six thousand dollars over its own quote, a tax
 * line in a state with no tax.
 *
 * WHAT IT DECIDES
 *
 * The estimator prompt asks the model for `overheadPercent`, `profitPercent`
 * and `contingencyPercent` along with the line items. So a language model has
 * been choosing the company's profit margin, and when it omitted them a
 * hardcoded 10/10/5 did. Neither ever read what the company charges.
 *
 * MEASURED 2026-11-12: all three quotes in production carried no margin at all
 * and went out at direct cost. Two faults stacked — the save dropped the
 * fields, fixed in `quoteDoc.ts`, and the figures being dropped were invented
 * rather than the company's, which is this.
 *
 * THE ORDER, AND WHY ZERO IS NOT A GAP
 *
 * The company's saved rate wins. The model's number is a fallback for an
 * account that has configured nothing, and it is a fallback rather than a
 * floor: a company that has set 0% contingency means nought per cent, and
 * `||` would read that as missing and reach past it. New Hampshire's `taxRate:
 * 0` is the case that matters — discarded, it becomes the model's habitual 8%
 * on every quote in a state that charges none.
 */

/**
 * A stored PERCENTAGE as a FRACTION, or undefined when there is no answer.
 *
 * PRESENCE IS TESTED BEFORE VALUE, and the first draft of this function did
 * not do that. `Number(null)` and `Number('')` are both 0, both finite and
 * both non-negative — so an unset profit margin came back as a deliberate 0%
 * and would have priced a job at cost while reporting that the company's own
 * rates were used. The test caught it; the reading did not.
 *
 * It is the same fault as the labour-burden override next door, and it keeps
 * arising because absent and zero look identical to `Number()`. They are not:
 * absent falls through to whoever else has an opinion, zero stops the search.
 */
export function asRate(percentage: unknown): number | undefined {
  if (percentage === null || percentage === undefined || percentage === '') return undefined;
  const n = Number(percentage);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n / 100;
}

export interface MarginRates {
  overheadPercent: number | undefined;
  profitPercent: number | undefined;
  contingencyPercent: number | undefined;
  taxRatePercent: number | undefined;
  /** Which side each figure came from, so a quote can say. */
  source: 'company' | 'model' | 'none';
}

/**
 * The rates to price a generated quote with.
 *
 * `settings` is the company's resolved pricing record, holding PERCENTAGES.
 * `raw` is the model's reply, holding FRACTIONS — the two conventions this
 * codebase has always had, converted in exactly one place, here.
 */
export function marginRatesFor(settings: any, raw: any): MarginRates {
  const company = {
    overheadPercent: asRate(settings?.overheadPercentage),
    profitPercent: asRate(settings?.profitMargin),
    contingencyPercent: asRate(settings?.contingencyPercentage),
    taxRatePercent: asRate(settings?.taxRate),
  };

  const fromModel = (value: unknown): number | undefined => {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };

  const anyCompany = Object.values(company).some((v) => v !== undefined);
  const resolved = {
    overheadPercent: company.overheadPercent ?? fromModel(raw?.overheadPercent),
    profitPercent: company.profitPercent ?? fromModel(raw?.profitPercent),
    contingencyPercent: company.contingencyPercent ?? fromModel(raw?.contingencyPercent),
    taxRatePercent: company.taxRatePercent ?? fromModel(raw?.taxRatePercent),
  };
  const anyResolved = Object.values(resolved).some((v) => v !== undefined);

  return {
    ...resolved,
    source: anyCompany ? 'company' : anyResolved ? 'model' : 'none',
  };
}
