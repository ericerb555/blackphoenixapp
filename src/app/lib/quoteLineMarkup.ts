/**
 * Overhead, profit and contingency landed on each line of a quote.
 *
 * Eric: "once i set my overhead and contingency prices in the quote builder
 * section i should be able to save it to the quote and then at that point
 * destributed over all the line item as equal as possible."
 *
 * Asked whether that should be an equal dollar amount per line or proportional
 * to each line's cost, he chose proportional — today's behaviour. So this
 * changes no price. What it does is show WHERE the markup already went, line by
 * line, which until now existed only as three quote-level totals.
 *
 * "AS EQUAL AS POSSIBLE" IS ABOUT THE PENNIES, AND IT IS THE WHOLE JOB
 *
 * $1,600 of overhead across seven lines does not divide. Round each line on its
 * own and the column comes to $1,599.97, three cents under the figure printed
 * at the bottom of the same page — and a reader who checks the sum and finds it
 * out trusts the rest of the document less, not more. So the shares are
 * ALLOCATED to the stored total rather than computed independently: each column
 * sums to the quote's own `overheadAmount`, `profitAmount` and
 * `contingencyAmount` exactly, to the penny, by construction.
 *
 * `allocate` already does this and is tested. It is imported rather than
 * reimplemented, because the worst pricing fault this project has had was two
 * modules that agreed about field names and disagreed about arithmetic.
 *
 * WHY THE STORED AMOUNTS AND NOT THE RATES
 *
 * It would be easy to multiply each line by `overheadPercent` and call it done.
 * That is a second opinion about what the quote charges. `applyMargins` wrote
 * `overheadAmount` when the quote was priced, `totalCost` was built from it,
 * and every customer-facing document reconciles to that figure. Recomputing
 * from the rate disagrees in the last cent the moment a rate is edited without
 * a re-price — and the disagreement would show up as a line column that does
 * not match the total beside it.
 *
 * Only when a quote has no stored amount at all — written before `applyMargins`
 * ran on it — does it fall back to the rate, because the alternative is showing
 * nothing on a quote that genuinely carries markup.
 *
 * OURS ONLY
 *
 * Same rule as `quoteMarkup`, for the same reason. These figures are the office
 * copy: what of each line is cost and what is ours. None of it may reach a
 * customer's PDF, portal or email. A customer sees one price per line, which is
 * cost plus its share already folded in — that is what `spreadCustomerPrices`
 * is for, and it is a different function on purpose.
 */

import { allocate } from "../../../supabase/functions/server/quoteCustomerPrice.ts";
import { markupRatesOf, type MarkupRates } from "./quoteMarkup.ts";

const round2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Which part of the quote a line came from. */
export type LineKind = "material" | "labor" | "credit";

export interface QuoteLineMarkup {
  kind: LineKind;
  /** What to call it on screen. */
  label: string;
  /** Position within its own section, for keying a list. */
  index: number;
  /** What this line costs us, before anything is added. */
  directCost: number;
  overhead: number;
  profit: number;
  contingency: number;
  /** Everything above direct cost on this line. */
  markup: number;
  /** Direct cost plus its share — what this line contributes to the price. */
  price: number;
}

export interface QuoteLineMarkupBreakdown {
  lines: QuoteLineMarkup[];
  rates: MarkupRates;
  /** The totals the columns were allocated to, so a screen can prove the sum. */
  totals: { directCost: number; overhead: number; profit: number; contingency: number; markup: number };
  /** False when the quote carries no markup at all — nothing to draw. */
  hasMarkup: boolean;
}

/**
 * The direct cost of a line, by the shape it has.
 *
 * Materials are quantity times unit cost; labour is hours times rate. Both
 * spellings of each are accepted because quotes in the store carry both —
 * `unitCost` from the generator, `unitPrice` from hand-built lines.
 *
 * A credit is NEGATIVE, and is carried through as a negative number rather
 * than dropped. A credit reduces what the job costs us, so it reduces the
 * markup the job carries; treating it as zero would hold the customer's own
 * supplied materials at full margin.
 */
function directCostOfLine(line: any, kind: LineKind): number {
  if (kind === "credit") return -Math.abs(num(line?.amount));
  if (kind === "labor") {
    const hours = num(line?.hours ?? line?.quantity) || 0;
    const rate = num(line?.hourlyRate ?? line?.unitPrice ?? line?.rate);
    return round2(hours * rate);
  }
  const qty = num(line?.quantity);
  const unit = num(line?.unitCost ?? line?.unitPrice);
  // Quantity of zero is taken at face value — a line nobody is buying any of
  // costs nothing and should carry no markup. Defaulting it to one would
  // invent a cost the quote does not contain.
  return round2(qty * unit);
}

function labelOfLine(line: any, kind: LineKind): string {
  if (kind === "credit") return String(line?.description || "Credit");
  if (kind === "labor") return String(line?.role || line?.description || "Labor");
  const name = String(line?.name || line?.description || "Material");
  const unit = line?.unit ? ` (${line.unit})` : "";
  return `${name}${unit}`;
}

/**
 * The amount a column should sum to.
 *
 * The stored figure where there is one, the rate applied to total direct cost
 * where there is not. See the note at the top of the file for why that order
 * and not the other.
 */
function columnTotal(stored: unknown, directCost: number, rate: number): number {
  const amount = Number(stored);
  if (Number.isFinite(amount) && amount !== 0) return round2(amount);
  return round2(directCost * rate);
}

/**
 * Every line of this quote with its share of the markup.
 *
 * Lines come back in the order a quote presents them — materials, then labour,
 * then credits — so a screen can render them straight down the page beside the
 * figures a reader is already looking at.
 */
export function quoteLineMarkup(quote: any): QuoteLineMarkupBreakdown {
  const rates = markupRatesOf(quote);

  const materials = Array.isArray(quote?.materials) ? quote.materials : [];
  const labor = Array.isArray(quote?.labor)
    ? quote.labor
    : Array.isArray(quote?.laborItems) ? quote.laborItems : [];
  const credits = Array.isArray(quote?.credits) ? quote.credits : [];

  const rows: Array<{ kind: LineKind; label: string; index: number; directCost: number }> = [
    ...materials.map((m: any, i: number) => ({
      kind: "material" as LineKind,
      label: labelOfLine(m, "material"),
      index: i,
      directCost: directCostOfLine(m, "material"),
    })),
    ...labor.map((l: any, i: number) => ({
      kind: "labor" as LineKind,
      label: labelOfLine(l, "labor"),
      index: i,
      directCost: directCostOfLine(l, "labor"),
    })),
    ...credits.map((c: any, i: number) => ({
      kind: "credit" as LineKind,
      label: labelOfLine(c, "credit"),
      index: i,
      directCost: directCostOfLine(c, "credit"),
    })),
  ];

  const costs = rows.map((r) => r.directCost);
  const directTotal = round2(costs.reduce((sum, c) => sum + c, 0));

  const overheadTotal = columnTotal(quote?.overheadAmount, directTotal, rates.overhead);
  const profitTotal = columnTotal(quote?.profitAmount, directTotal, rates.profit);
  const contingencyTotal = columnTotal(quote?.contingencyAmount, directTotal, rates.contingency);

  /*
   * Each column allocated separately, so each sums to its own stored figure.
   *
   * Allocating the combined markup once and splitting it three ways afterwards
   * would be a cent cheaper to compute and would let the overhead column land a
   * penny off the overhead total — which is the one number somebody checks when
   * they are arguing about overhead.
   */
  const overheads = rows.length ? allocate(costs, overheadTotal) : [];
  const profits = rows.length ? allocate(costs, profitTotal) : [];
  const contingencies = rows.length ? allocate(costs, contingencyTotal) : [];

  const lines: QuoteLineMarkup[] = rows.map((row, i) => {
    const overhead = overheads[i] ?? 0;
    const profit = profits[i] ?? 0;
    const contingency = contingencies[i] ?? 0;
    // Summed from the rounded parts, so the three figures printed on a row add
    // up to the total printed on the same row.
    const markup = round2(overhead + profit + contingency);
    return {
      kind: row.kind,
      label: row.label,
      index: row.index,
      directCost: row.directCost,
      overhead,
      profit,
      contingency,
      markup,
      price: round2(row.directCost + markup),
    };
  });

  return {
    lines,
    rates,
    totals: {
      directCost: directTotal,
      overhead: round2(lines.reduce((s, l) => s + l.overhead, 0)),
      profit: round2(lines.reduce((s, l) => s + l.profit, 0)),
      contingency: round2(lines.reduce((s, l) => s + l.contingency, 0)),
      markup: round2(lines.reduce((s, l) => s + l.markup, 0)),
    },
    hasMarkup: rates.total > 0 || overheadTotal !== 0 || profitTotal !== 0 || contingencyTotal !== 0,
  };
}
