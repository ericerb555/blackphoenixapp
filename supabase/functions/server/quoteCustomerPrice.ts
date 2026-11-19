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

/**
 * Has anybody actually chosen this quote’s pricing?
 *
 * Presence, deliberately — not whether the number is above zero. A stored
 * 0 is a decision ("no margin on this one") and must read differently from
 * a field that was never written, or saving zero cannot hold.
 *
 * An empty string is treated as absent because that is what an emptied
 * input posts, and a cleared box is not a choice of nothing.
 */
export function hasStoredPricing(quote: any): boolean {
  for (const key of ['overheadPercent', 'profitPercent', 'contingencyPercent']) {
    const v = quote?.[key];
    if (v === null || v === undefined || v === '') continue;
    if (Number.isFinite(Number(v))) return true;
  }
  return false;
}

/** The markup this quote was priced with, ready to multiply by. */
export function customerPricingOf(quote: any): CustomerPricing {
  const overhead = asFraction(quote?.overheadPercent);
  const profit = asFraction(quote?.profitPercent);
  const contingency = asFraction(quote?.contingencyPercent);
  const stated = overhead + profit + contingency;
  if (stated > 0) {
    return { overhead, profit, contingency, markup: stated, factor: 1 + stated };
  }

  /**
   * NO PERCENTAGES STORED, BUT THE TOTALS SAY THERE IS MARGIN.
   *
   * Eric, 2026-11-19: *"i am really getting aggrivated with the view quote in
   * the quote builder not hidding the items i have hidden and not adding up
   * to the quote"*. This is the "not adding up" half, and it is the whole of
   * it.
   *
   * `applyMargins` prices a quote on the server, defaulting to 10/10/5, and
   * does NOT write those percentages back onto the record. So the margin
   * exists in `preTaxTotal` and nowhere else — and every consumer that asks
   * "what markup does this quote carry?" got zero and did nothing.
   *
   * Measured on Jason's quote, `qt-1794354942724`:
   *
   *     materialsSubtotal   2,943.20
   *     laborSubtotal       6,917.50   → direct cost 9,860.70
   *     preTaxTotal        14,435.81   → 4,575.11 of margin
   *     overheadPercent     (absent)
   *     profitPercent       (absent)
   *     contingencyPercent  (absent)
   *
   * `quoteToPdfDocument` guards its entire distribution on
   * `pricing.markup > 0`, so with a stated markup of zero it skipped scaling
   * altogether: the lines and phase subtotals printed at COST, summing
   * 9,860.70, under a footer reading 14,435.81. The customer adds the column
   * up and is $4,575.11 short. That is the complaint, exactly, and it is not
   * a rounding or a hiding problem — the margin was never put into the lines
   * because nothing could tell there was any.
   *
   * So when the percentages are silent, the TOTALS are asked instead. They
   * are the figures the document actually prints, which makes this the
   * authoritative source rather than a guess: whatever the quote charges
   * above its direct cost IS its markup, however it came to be.
   *
   * The split across overhead/profit/contingency is deliberately left at
   * zero. Only the OFFICE copy itemises those three, and inventing a split
   * that was never recorded would print a "profit" figure nobody chose — the
   * same objection `markupRatesOf` makes about defaulting absent rates. The
   * customer's document needs the total markup and nothing else.
   */
  /*
   * A SAVED ZERO IS AN ANSWER, AND IT OUTRANKS THE DERIVATION.
   *
   * Eric, 2026-11-19: *"when i save the edits i expect that the tax and
   * profit and everything on the invoice locks unless i change and save it
   * again"*.
   *
   * The derivation below reads margin out of the gap between cost and the
   * stored total. That is the right answer for a quote that never recorded
   * a percentage — and the wrong one for a quote where somebody went into
   * the editor and set the margin to nothing on purpose. `stated` is zero
   * in both cases, so without this they are indistinguishable.
   *
   * The failure is not hypothetical and it is not symmetrical. Save 0/0/0
   * and the save writes `preTaxTotal` equal to `directCost`, so the
   * derivation finds no gap and agrees. Then edit a line: the subtotals
   * move and the stored total does not, the gap reappears out of nothing,
   * and the document prices itself back up by it. The margin he removed
   * returns on its own, which is the opposite of locking.
   *
   * So presence decides, not value. Any of the three fields recorded on the
   * quote means the pricing was chosen and is held until it is chosen
   * again. The derivation is left for the legacy records it was written
   * for: `applyMargins` priced them at 10/10/5 and wrote the percentages
   * nowhere, so their margin exists in the totals and in no other place.
   */
  if (hasStoredPricing(quote)) {
    return { overhead, profit, contingency, markup: stated, factor: 1 + stated };
  }

  const direct = directCostOf(quote);
  const preTax = Number(quote?.preTaxTotal);
  if (direct > 0 && Number.isFinite(preTax) && preTax > direct) {
    const derived = (preTax - direct) / direct;
    return { overhead: 0, profit: 0, contingency: 0, markup: derived, factor: 1 + derived };
  }

  return { overhead, profit, contingency, markup: stated, factor: 1 + stated };
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
  const subtotals = round2(
    (Number(quote?.materialsSubtotal) || 0)
    + (Number(quote?.laborSubtotal) || 0)
    + (Number(quote?.additionalCostsSubtotal) || 0),
  );
  if (subtotals > 0) return subtotals;
  /*
   * NO SUBTOTALS STORED — ADD THE ROWS UP INSTEAD.
   *
   * Quotes come in two shapes. The estimator writes `materials` and `labor`
   * with their subtotals alongside; the quote builder writes one flat
   * `items` array and stores no subtotal at all. This function only ever
   * read the subtotals, so on an items-shaped quote it returned zero.
   *
   * Zero direct cost is not a harmless answer. `customerPricingOf` derives
   * the markup from the gap between cost and the stored total, and guards
   * that derivation on `direct > 0` — so a zero here means no markup, which
   * means `quoteToPdfDocument` skips distributing it into the line prices
   * entirely. The document then prints lines at cost beneath a total that
   * includes margin, which is Eric’s complaint in its original form: the
   * line items do not add up to the total.
   *
   * Summed the way `costOfRow` resolves a row, so a stored `totalCost` with
   * a waste factor in it still wins over quantity times unit price.
   */
  const rows = [
    ...(Array.isArray(quote?.items) ? quote.items : []),
    ...(Array.isArray(quote?.materials) ? quote.materials : []),
    ...(Array.isArray(quote?.labor) ? quote.labor : []),
    ...(Array.isArray(quote?.additionalCosts) ? quote.additionalCosts : []),
  ];
  return round2(rows.reduce((sum: number, r: any) => sum + costOfRow(r), 0));
}

/**
 * What a line costs us, whichever shape it was stored in.
 *
 * Materials keep `quantity`/`unitCost`, labour keeps `hours`/`hourlyRate`,
 * and both carry a `totalCost` that is authoritative where it exists —
 * a waste factor lives in the stored figure and not in the unit price.
 */
function costOfRow(row: any): number {
  const stored = Number(row?.totalCost ?? row?.amount);
  if (Number.isFinite(stored) && stored > 0) return stored;
  const qty = Number(row?.quantity ?? row?.hours ?? row?.qty) || 0;
  const rate = Number(row?.unitCost ?? row?.hourlyRate ?? row?.rate) || 0;
  return qty * rate;
}

/**
 * The cost of the lines that have been taken OFF the quote.
 *
 * `included: false` means the work is not on the quote and is not charged —
 * a different thing from `visible: false`, which hides a line's detail and
 * keeps its money. Only the first belongs here.
 */
export function excludedCostOf(quote: any): number {
  const rows = [
    ...(Array.isArray(quote?.materials) ? quote.materials : []),
    ...(Array.isArray(quote?.labor) ? quote.labor : []),
    ...(Array.isArray(quote?.additionalCosts) ? quote.additionalCosts : []),
  ];
  return round2(rows
    .filter((r: any) => r?.included === false)
    .reduce((sum: number, r: any) => sum + costOfRow(r), 0));
}

/**
 * How much of this quote's stored total still applies.
 *
 * THE BUG THIS EXISTS FOR
 *
 * Unticking a line removes it from the document and leaves every stored
 * figure untouched: `preTaxTotal`, `totalCost` and the subtotals are all
 * written when the quote is priced and never rewritten when a line is taken
 * off. `preTaxTotalOf` returns the stored number when it has one, so the PDF
 * drew fifteen lines under a total that still charged for sixteen.
 *
 * Reproduced on Q-2026-0002 on 2026-11-14: unticking one $1,050 line left the
 * column at 11,616.13 beneath a total of 12,666.13 — the exact complaint,
 * "the line items don't total the total line", and the dangerous direction,
 * because the customer is billed for work that was removed.
 *
 * A SHARE RATHER THAN A SUBTRACTION, AND WHY
 *
 * The stored total is direct cost plus overhead, profit and contingency. A
 * line that leaves takes its share of all four with it — subtracting only its
 * raw cost would leave the markup it carried behind, quietly raising the
 * margin on everything else. Scaling by the share of direct cost that
 * remains removes it proportionally, which is exact for percentage margins
 * and the defensible reading for fixed ones.
 *
 * Returns 1 when nothing is excluded, so a quote nobody has edited is
 * untouched by this and prices exactly as it did.
 */
export function includedShareOf(quote: any): number {
  const direct = directCostOf(quote);
  if (!(direct > 0)) return 1;

  /*
   * MEASURED FROM THE LINES, NOT FROM WHAT WAS TAKEN OFF.
   *
   * This counted only `included: false` rows at first, which fixed unticking
   * and nothing else. The same gap opens whenever the lines move and the
   * stored totals do not — and in the editor they move constantly: change a
   * quantity, correct a unit price, add a row. `preTaxTotal` and `totalCost`
   * were written when the quote was priced and are not rewritten by an edit,
   * so the PDF drew the new lines beneath the old total.
   *
   * Comparing what the rows actually come to against what the quote says
   * they come to covers every one of those cases with one rule, and gives
   * the same answer as before for unticking.
   *
   * It is a ratio against DIRECT cost, so the margin rides along: a line
   * whose price doubles takes its overhead, profit and contingency up with
   * it, which is what the stored total would have done had it been rewritten.
   */
  const actual = includedCostOf(quote);

  // Nothing countable on the quote: trust what is stored rather than wiping
  // the total out. A quote with no priced rows and a stored total is a
  // shape this cannot speak to.
  if (!(actual > 0)) return excludedCostOf(quote) > 0 ? 0 : 1;

  const ratio = actual / direct;
  // Agreement to the penny is the normal case; leave it exactly alone so an
  // untouched quote prices bit-for-bit as it always has.
  return Math.abs(ratio - 1) < 0.0001 ? 1 : ratio;
}

/** What the rows still on the quote come to, at cost. */
export function includedCostOf(quote: any): number {
  const rows = [
    ...(Array.isArray(quote?.materials) ? quote.materials : []),
    ...(Array.isArray(quote?.labor) ? quote.labor : []),
    ...(Array.isArray(quote?.additionalCosts) ? quote.additionalCosts : []),
  ];
  // A quote that keeps its lines in `items` is read from there, the same
  // precedence `selectQuoteLines` uses.
  const source = rows.length
    ? rows
    : (Array.isArray(quote?.items) ? quote.items : []);

  return round2(source
    .filter((r: any) => r?.included !== false)
    .reduce((sum: number, r: any) => sum + costOfRow(r), 0));
}

/**
 * A row of a priced section, for `pricesAbsorbingWithheld`.
 */
export interface WithheldAwareRow {
  /** What the row costs us, before markup. */
  amount: unknown;
  /** Which phase it belongs to. Absent or blank groups with the other blanks. */
  phase?: unknown;
  /** False when the customer must not see this row at all. */
  visible: boolean;
}

/**
 * Price a section's rows so the HIDDEN ones print nothing and are still paid for.
 *
 * Eric, 2026-11-19: *"i do not want additional work under the line item to
 * show up on the quote i just want it added into the total it should always
 * be hidden"*.
 *
 * Returns one figure per row, in order: the priced amount for a visible row,
 * and zero for a withheld one, which the caller then declines to emit. The
 * visible rows between them come to exactly what every row together would
 * have come to, so the section subtotal — which is apportioned from the
 * stored total and counts withheld work — still equals the rows beneath it.
 *
 * WHY THE MONEY MOVES WITHIN A PHASE FIRST
 *
 * A phase is the unit a customer reads and queries, so withheld money is
 * absorbed by the visible rows of its OWN phase wherever there are any. That
 * keeps a phase total equal to its own rows, which is the invariant the whole
 * "your lines do not add up" complaint turns on.
 *
 * When a phase has no visible rows at all, its money cannot stay there — a
 * row has to carry it or the section comes up short — so it spills across
 * the section's remaining visible rows. The phase's own total is then larger
 * than the rows shown under it, which is unavoidable and is the lesser
 * failure: a section that does not add up is arithmetic a customer can
 * check, and a phase with nothing under it is not.
 *
 * A section with nothing visible returns all zeroes. The caller emits no
 * rows and the subtotal stands on its own, which is how a quote set to
 * phase totals already reads.
 */
export function pricesAbsorbingWithheld(
  rows: WithheldAwareRow[],
  pricing: CustomerPricing,
): number[] {
  const priced = spreadCustomerPrices(rows.map((r) => r.amount), pricing);
  const out = rows.map(() => 0);

  const visible = rows.map((r, i) => (r.visible ? i : -1)).filter((i) => i >= 0);
  if (!visible.length) return out;

  const keyOf = (i: number) => String(rows[i]?.phase ?? '').trim();

  /* What each phase is worth, and which of its rows can carry it. */
  const phaseTotal = new Map<string, number>();
  const phaseVisible = new Map<string, number[]>();
  rows.forEach((_, i) => {
    const key = keyOf(i);
    phaseTotal.set(key, round2((phaseTotal.get(key) || 0) + priced[i]));
    if (rows[i].visible) {
      if (!phaseVisible.has(key)) phaseVisible.set(key, []);
      phaseVisible.get(key)!.push(i);
    }
  });

  let spill = 0;
  for (const [key, total] of phaseTotal) {
    const carriers = phaseVisible.get(key);
    if (!carriers || !carriers.length) {
      /* Nobody in this phase can hold it; it goes to the section. */
      spill = round2(spill + total);
      continue;
    }
    const shares = allocate(carriers.map((i) => priced[i]), total);
    carriers.forEach((i, n) => { out[i] = shares[n]; });
  }

  if (Math.abs(spill) >= 0.005) {
    /*
     * Spread over the section's visible rows in proportion to what they
     * already carry, then re-allocated so the column lands on the exact
     * section total rather than a cent either side of it.
     */
    const target = round2(visible.reduce((sum, i) => sum + out[i], 0) + spill);
    const shares = allocate(visible.map((i) => out[i]), target);
    visible.forEach((i, n) => { out[i] = shares[n]; });
  }

  return out;
}
