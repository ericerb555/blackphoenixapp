/**
 * Putting money against a siding takeoff.
 *
 * `sidingQuote.ts` deliberately produces quantities and hours and no prices, so
 * that a siding job is costed by the same machinery as everything else rather
 * than by arithmetic of its own. This is the join: it takes those lines, the
 * material prices the server resolved from the vendor catalogue, and the
 * company's trade rates, and produces the same shape of quote line a deck
 * produces.
 *
 * Producing the *same shape* is the point. A quote line from a deck and a quote
 * line from a siding job go to the same place, are read by the same pipeline and
 * appear in the same customer's portal, so they had better not be two different
 * kinds of object.
 */

import type { SidingLine } from './sidingQuote';
import type { QuoteLine, QuoteOptions, QuoteTotals } from './deckQuote';
import { quoteTotals } from './deckQuote';

/** What a trade costs an hour, by the ids used in `labor_rates:global`. */
export type TradeRates = Record<string, number>;

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Siding categories mapped onto the ones a quote line uses.
 *
 * Deck quote lines carry a fixed set of categories. Rather than widen that
 * union for every trade added, each trade maps its own vocabulary onto it —
 * siding and trim are materials, wrap is weatherproofing which is also a
 * material, and hours are hours.
 */
function categoryFor(line: SidingLine): QuoteLine['category'] {
  if (line.category === 'Labour') return 'Labour';
  if (line.category === 'Disposal') return 'Hardware';
  if (line.category === 'Trim') return 'Railing';
  return 'Decking';
}

export interface PricedSiding {
  lines: QuoteLine[];
  totals: QuoteTotals;
  unpricedCount: number;
}

/**
 * Price the takeoff.
 *
 * Labour is priced from the trade rate for the trade that does the work — the
 * takeoff already says which, so siding hours are charged at the siding rate and
 * a tear-out at the labouring rate, rather than everything being charged at one
 * blended number that is wrong for both.
 *
 * A line with no price is marked rather than dropped. Excluding it would make a
 * total that looks complete and is short by whatever that line costs, which is
 * the worst of the three possible behaviours.
 */
export function priceSiding(
  lines: SidingLine[],
  materialPrices: Record<string, number>,
  rates: TradeRates,
  opts: QuoteOptions,
): PricedSiding {
  const priced: QuoteLine[] = lines.map(line => {
    const isLabour = line.category === 'Labour';

    const unitPrice = isLabour
      ? round2(Number(rates[String(line.tradeId || '')]) || 0)
      : round2(Number(materialPrices[line.sku]) || 0);

    const qty = Number(line.qty) || 0;

    return {
      sku: line.sku,
      category: categoryFor(line),
      description: line.description,
      qty,
      unit: line.unit,
      unitPrice,
      total: round2(qty * unitPrice),
      unpriced: !(unitPrice > 0),
      basis: line.basis,
    };
  });

  return {
    lines: priced,
    totals: quoteTotals(priced, opts),
    unpricedCount: priced.filter(l => l.unpriced).length,
  };
}

/** The trade rates a siding job actually draws on, as a plain lookup. */
export function tradeRatesFrom(laborRates: any[]): TradeRates {
  const out: TradeRates = {};
  for (const r of laborRates || []) {
    const id = String(r?.id || '').trim();
    const rate = Number(r?.hourlyRate) || 0;
    if (id && rate > 0) out[id] = rate;
  }
  return out;
}
