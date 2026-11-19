/**
 * Which pricing rates a save should write back onto a quote.
 *
 * Eric, 2026-11-19: *"when i save the edits i expect that the tax and profit
 * and everything on the invoice locks unless i change and save it again"*.
 *
 * WHY THIS IS NOT JUST "SEND THE THREE PERCENTAGES"
 *
 * `asFraction` reads an absent rate as 0, and `customerPricingOf` now treats
 * a RECORDED 0 as a decision — "no margin on this job" — which holds against
 * the stored total rather than deriving a markup from it. The two rules are
 * correct separately and destructive together: a save that normalised every
 * quote to 0/0/0 would not be tidying the record, it would be repricing it.
 *
 * Measured on the live data. Jason's quote carries 9,860.70 of direct cost
 * under a total of 13,345.11 — 3,484.41 of margin with no rate anywhere
 * naming it. Stamping 0/0/0 on him would lock that margin out, and the next
 * recalculation would drop his quote by exactly that much.
 *
 * So presence decides, matching `hasStoredPricing` on the read side: a quote
 * that has been priced records what it was priced with and locks; one that
 * never was keeps saying nothing, and the derivation goes on covering it.
 */

/** The three rates, as they are stored. */
const RATE_FIELDS = ['overheadPercent', 'profitPercent', 'contingencyPercent'] as const;

/**
 * Is this rate recorded on the quote?
 *
 * An empty string counts as absent, because that is what a cleared input
 * posts and a cleared box is not a choice of nothing. A zero that was
 * actually written IS a choice, and is the case this whole function exists
 * to carry through a save intact.
 */
function isRecorded(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  return Number.isFinite(Number(value));
}

/**
 * The rate fields to merge into a save body — `{}` when the quote carries
 * none, which leaves the server's merge to keep saying nothing about them.
 *
 * Values are passed through unchanged rather than normalised. `asFraction`
 * accepts both conventions on the way out, and rewriting 10 as 0.1 here
 * would be a second, silent edit to a figure nobody touched.
 */
export function pricingRatesToPersist(quote: any): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of RATE_FIELDS) {
    const value = quote?.[field];
    if (isRecorded(value)) out[field] = value;
  }
  return out;
}
