/**
 * The price a customer is shown, as opposed to what the work costs us.
 *
 * WHY THIS EXISTS
 *
 * Eric: "on the quotes the line items are not adding up to the total on the
 * bottom."
 *
 * They did not, and the gap was the markup. `applyMargins` puts overhead,
 * profit and contingency on top of direct cost and folds them into
 * `totalCost`, but every surface that printed a bottom line listed materials,
 * labour, tax and credits and nothing else. On a job with the standard
 * 10/10/5 the printed lines came to about 80% of the printed total, and the
 * missing fifth had no row anywhere — on the editor's summary grid, on the
 * PDF emailed to the customer, and on the approval page they sign from.
 *
 * The decision was to spread the markup INTO the line prices rather than add
 * a row naming it. A contractor's quote shows what each part of the job costs
 * the customer, margin included; a row reading "profit $1,000" invites a
 * negotiation about the wrong number. So the customer's copy is priced, ours
 * is costed, and this module is the one place that converts between them.
 *
 * WHY THE CONVERSION IS EXACT RATHER THAN AN ESTIMATE
 *
 * The same property `quoteMarkup.ts` relies on: every one of the three rates
 * is a flat fraction of direct cost, so the markup belonging to any subset of
 * lines is that subset's cost times the same fraction. Scaling each line by
 * `1 + overhead + profit + contingency` therefore reproduces the quote's own
 * pre-tax total to the penny — with `spreadCustomerPrices` to place the
 * rounding remainder, so a column of scaled lines sums to the scaled total
 * exactly rather than a cent under it.
 *
 * WHAT IT DELIBERATELY DOES NOT TOUCH
 *
 * Tax and credits. Tax is charged on materials AT COST — that is what the
 * supplier invoiced and what `applyMargins` taxes — and credits are money off
 * for goods the customer bought themselves, which carries no margin of ours.
 * Scaling either would change what the job comes to. The totals block still
 * adds up because the subtotal above it is the priced one:
 *
 *     priced materials + priced labour + priced soft costs
 *       - credits + tax  =  totalCost
 *
 * ABSENT MEANS ZERO, as everywhere else in this pricing code. A hand-built
 * quote that never carried a margin is shown exactly as it was written; the
 * 10/10/5 default belongs to `applyMargins` at pricing time and inventing it
 * here would reprice somebody's quote on the way to the printer.
 */

/** The rates as fractions, and what a dollar of direct cost sells for. */
export interface CustomerPricing {
  overhead: number;
  profit: number;
  contingency: number;
  /** Their sum: the fraction above direct cost. */
  markup: number;
  /** `1 + markup`. Multiply a cost by this to get the price. */
  factor: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * A rate, whichever of the two conventions in this codebase wrote it.
 *
 * `applyMargins` is explicit that its inputs and outputs are FRACTIONS —
 * 0.10 is ten per cent — and that is what the server stores. But the company
 * settings hold PERCENTAGES, `repriceEstimate` converts at its boundary, and
 * `QuoteBasis` once rendered the stored value straight into a `%` sign, so a
 * quote carrying 0.1 displayed as "0.1%" when it meant ten.
 *
 * Mixing those two up is the exact fault that once shipped 40% overhead and
 * 40% profit on every repriced quote — the worst pricing bug this project has
 * had, and the reason `quoteMargins.ts` exists as its own tested module. So
 * this does not guess per caller: anything above 1 is read as a percentage,
 * anything at or below 1 as a fraction. A real rate above 100% is not a
 * thing, and a 1% rate is written 0.01, so the rule is unambiguous over every
 * value either convention can produce.
 *
 * It lives HERE, below the Deno/browser line, because both sides price now:
 * the PDF and the editor are browser modules, `customerQuoteView` is an edge
 * function, and all three have to agree to the penny. `quoteMarkup.ts`
 * re-exports it so its existing callers are unaffected — what it must never
 * do again is hold a second copy of this rule.
 */
export function asFraction(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n > 1 ? n / 100 : n;
}

/** The markup this quote was priced with, ready to multiply by. */
export function customerPricingOf(quote: any): CustomerPricing {
  const overhead = asFraction(quote?.overheadPercent);
  const profit = asFraction(quote?.profitPercent);
  const contingency = asFraction(quote?.contingencyPercent);
  const markup = overhead + profit + contingency;
  return { overhead, profit, contingency, markup, factor: 1 + markup };
}

/** True when there is any markup to spread. Saves scaling a quote by 1.0. */
export function hasCustomerMarkup(pricing: CustomerPricing): boolean {
  return pricing.markup > 0;
}

/** One cost at the price the customer is shown. */
export function atCustomerPrice(cost: unknown, pricing: CustomerPricing): number {
  return round2((Number(cost) || 0) * pricing.factor);
}

/**
 * A column of costs priced so it sums to the priced total EXACTLY.
 *
 * Rounding each line on its own leaves the column a penny or two short of
 * the scaled subtotal, which is the whole complaint this module answers —
 * only smaller and more insulting, because a reader who checks the sum and
 * finds it two cents out trusts the rest of the document less, not more.
 *
 * The remainder goes on the largest line, where it is proportionally the
 * least visible: a cent on a $4,000 line is invisible, the same cent on a
 * $12 line is a figure that does not divide into its quantity.
 */
export function spreadCustomerPrices(costs: Array<unknown>, pricing: CustomerPricing): number[] {
  const values = costs.map((c) => Number(c) || 0);
  const priced = values.map((v) => round2(v * pricing.factor));
  const target = round2(values.reduce((sum, v) => sum + v, 0) * pricing.factor);
  const drawn = round2(priced.reduce((sum, v) => sum + v, 0));
  const remainder = round2(target - drawn);
  if (Math.abs(remainder) < 0.005 || !priced.length) return priced;

  let largest = 0;
  for (let i = 1; i < values.length; i++) {
    if (Math.abs(values[i]) > Math.abs(values[largest])) largest = i;
  }
  priced[largest] = round2(priced[largest] + remainder);
  return priced;
}

/**
 * A column of costs priced to hit a target EXACTLY.
 *
 * The generalisation of `spreadCustomerPrices`, and the reason the chain
 * closes: lines are allocated to their section's priced subtotal, the
 * sections are allocated to the quote's own `preTaxTotal`, and that figure
 * plus tax less credits IS `totalCost` by `applyMargins`' own arithmetic. So
 * every sum a reader can perform on the document comes out, rather than each
 * level being separately rounded and landing a cent or two apart.
 *
 * Proportional to cost, because that is what the markup is.
 */
export function allocate(costs: Array<unknown>, target: number): number[] {
  const values = costs.map((c) => Number(c) || 0);
  const goal = round2(Number(target) || 0);
  const base = values.reduce((sum, v) => sum + v, 0);
  if (!values.length) return [];
  /**
   * Nothing to apportion by. Every line is zero and the target is not — a
   * shape that should not occur, but splitting it evenly beats returning a
   * column of noughts under a non-zero subtotal.
   */
  if (!base) {
    const each = round2(goal / values.length);
    const even = values.map(() => each);
    even[0] = round2(even[0] + round2(goal - round2(each * values.length)));
    return even;
  }

  const priced = values.map((v) => round2((v / base) * goal));
  const drawn = round2(priced.reduce((sum, v) => sum + v, 0));
  const remainder = round2(goal - drawn);
  if (Math.abs(remainder) >= 0.005) {
    let largest = 0;
    for (let i = 1; i < values.length; i++) {
      if (Math.abs(values[i]) > Math.abs(values[largest])) largest = i;
    }
    priced[largest] = round2(priced[largest] + remainder);
  }
  return priced;
}

/**
 * What this quote comes to before tax and credits, at the customer's price.
 *
 * The STORED figure first, because it is the one `totalCost` was built from.
 * Recomputing it from the rates would be a second opinion that disagrees in
 * the last cent, which is the whole class of fault this module exists to end.
 * The fallbacks are for records written before `applyMargins` ran on them.
 */
export function preTaxTotalOf(quote: any, pricing: CustomerPricing): number {
  const stored = Number(quote?.preTaxTotal);
  if (Number.isFinite(stored) && stored > 0) return round2(stored);

  const direct = directCostOf(quote);
  const overhead = Number(quote?.overheadAmount);
  const profit = Number(quote?.profitAmount);
  const contingency = Number(quote?.contingencyAmount);
  const amounts = [overhead, profit, contingency].filter((n) => Number.isFinite(n) && n > 0);
  if (amounts.length) return round2(direct + amounts.reduce((sum, n) => sum + n, 0));

  return round2(direct * pricing.factor);
}

/** Materials, labour and soft costs at cost — the base the markup sits on. */
export function directCostOf(quote: any): number {
  const stored = Number(quote?.directCost);
  if (Number.isFinite(stored) && stored > 0) return round2(stored);
  return round2(
    (Number(quote?.materialsSubtotal) || 0)
    + (Number(quote?.laborSubtotal) || 0)
    + (Number(quote?.additionalCostsSubtotal) || 0),
  );
}
