/**
 * What of each phase, and each kind of cost inside it, is ours.
 *
 * Eric: "mark up is ours only but added per line item section."
 *
 * OURS ONLY. Every figure this module produces is for the office copy. None
 * of it may reach a customer's PDF, portal or email, which is why it is
 * computed in the assembler under a `forCustomer` guard rather than carried
 * on `SelectedLine` — a field that exists on the customer's object is a field
 * one future renderer away from being drawn. That is not hypothetical: it is
 * precisely how the `visible` flag nearly leaked a labour rate.
 *
 * THIS IS APPORTIONMENT, NOT ESTIMATION
 *
 * It would be easy to assume markup has to be guessed back out of a price.
 * It does not. `quoteMargins.applyMargins` puts overhead, profit and
 * contingency on as a flat fraction of DIRECT COST:
 *
 *   overhead    = directCost x overheadPercent
 *   profit      = directCost x profitPercent
 *   contingency = directCost x contingencyPercent
 *
 * Because every one of them is linear in direct cost, the share belonging to
 * any subset of lines is exactly that subset's direct cost times the same
 * fraction. No cost basis has to be stored on a line and nothing is inferred.
 * Sum the sections back up and you get the quote's own margin figures to the
 * penny, which is the property the tests pin down.
 *
 * `applyMaterialMarkup` in `pricingConfig.ts` is NOT part of this. It is
 * dead code — nothing in the app calls it — so no markup is hidden inside
 * `unitCost`, and reading one out of it would invent margin that is not
 * there. The real markup is these three percentages and nothing else.
 */

/** The three rates that sit on top of direct cost, as fractions. */
export interface MarkupRates {
  overhead: number;
  profit: number;
  contingency: number;
  /** Their sum — what one dollar of direct cost carries. */
  total: number;
}

export interface MarkupShare {
  /** Direct cost of the lines this covers. */
  directCost: number;
  overhead: number;
  profit: number;
  contingency: number;
  /** Everything above direct cost, for this slice of the quote. */
  total: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * A rate, whichever of the two conventions in this codebase wrote it.
 *
 * `applyMargins` is explicit that its inputs and outputs are FRACTIONS —
 * 0.10 is ten per cent — and that is what the server stores. But the company
 * settings hold PERCENTAGES, `repriceEstimate` converts at its boundary, and
 * `QuoteBasis` renders the stored value straight into a `%` sign, so a quote
 * carrying 0.1 displays as "0.1%" when it means ten.
 *
 * Mixing those two up is the exact fault that once shipped 40% overhead and
 * 40% profit on every repriced quote — the worst pricing bug this project
 * has had, and the reason `quoteMargins.ts` exists as its own tested module.
 * So this does not guess per caller: anything above 1 is read as a
 * percentage, anything at or below 1 as a fraction. A real rate above 100%
 * is not a thing, and a 1% rate is written 0.01, so the rule is unambiguous
 * over every value either convention can produce.
 */
export function asFraction(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n > 1 ? n / 100 : n;
}

/**
 * The rates this quote was priced with.
 *
 * Absent means zero, deliberately. `applyMargins` defaults a MISSING rate to
 * 10/10/5 when it prices a job, but that is a decision about what to charge,
 * made once, at pricing time. Re-applying the default here would invent
 * margin on a hand-built quote that never had any and report it as fact on
 * the office copy — a figure somebody might then quote in a meeting.
 */
export function markupRatesOf(quote: any): MarkupRates {
  const overhead = asFraction(quote?.overheadPercent);
  const profit = asFraction(quote?.profitPercent);
  const contingency = asFraction(quote?.contingencyPercent);
  return { overhead, profit, contingency, total: overhead + profit + contingency };
}

/** What a given slice of direct cost carries in overhead, profit and contingency. */
export function markupOn(directCost: number, rates: MarkupRates): MarkupShare {
  const base = Number(directCost) || 0;
  const overhead = round2(base * rates.overhead);
  const profit = round2(base * rates.profit);
  const contingency = round2(base * rates.contingency);
  return {
    directCost: round2(base),
    overhead,
    profit,
    contingency,
    // Summed from the ROUNDED parts, not rounded from the sum, so the three
    // figures printed under a section always add up to the total printed
    // beside them. A penny of disagreement on a document about money is read
    // as a mistake in the pricing, not in the rounding.
    total: round2(overhead + profit + contingency),
  };
}

/** True when there is any markup worth drawing a row for. */
export function hasMarkup(rates: MarkupRates): boolean {
  return rates.total > 0;
}

/**
 * The rates as a label: "10% + 10% + 5%" collapsed to what it costs.
 *
 * Percentages are shown because "25%" is the number Eric reasons about when
 * deciding whether a job is worth taking, and an amount alone does not let
 * him compare two phases of different size.
 */
export function describeRates(rates: MarkupRates): string {
  const pct = (f: number) => `${round2(f * 100)}%`;
  const parts: string[] = [];
  if (rates.overhead > 0) parts.push(`${pct(rates.overhead)} overhead`);
  if (rates.profit > 0) parts.push(`${pct(rates.profit)} profit`);
  if (rates.contingency > 0) parts.push(`${pct(rates.contingency)} contingency`);
  return parts.join(' + ');
}
