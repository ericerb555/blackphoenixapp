/**
 * Turning the scope of work into a quote.
 *
 * WHY THE SCOPE PRICES RATHER THAN THE TRADES
 *
 * Each trade tool already prices its own takeoff, and that is right for a job
 * that is one trade. A kitchen is not: it has demolition, electrical, tile,
 * cabinets and paint in it, and pricing each tool separately gives five totals
 * that have to be added up by hand and no single answer to "what does the job
 * cost". The scope is the one place that knows the whole job, so the whole job
 * is priced from it.
 *
 * THREE KINDS OF LINE, PRICED THREE WAYS
 *
 *   Labour       hours from the task template at the trade's own rate, so
 *                carpentry is charged at the carpentry rate and a strip-out at
 *                the labouring rate rather than everything at one blended
 *                number that is wrong for both.
 *
 *   Material     from the vendor catalogues by SKU, through the same route
 *                siding, flooring and kitchens already use.
 *
 *   Subbed       a subcontractor's returned number. Until one comes back the
 *                line is unpriced and says so, because a job that is half bid
 *                out has half a price and pretending otherwise is how a quote
 *                goes out short.
 *
 * NOTHING IS DROPPED
 *
 * A line with no price is kept, marked and counted, and the total says it is
 * short. Excluding it would produce a number that looks complete and is wrong,
 * which of the three available behaviours is the worst.
 */
import type { Scope, ScopeLine } from './scopeModel';
import { taskById, hoursFor, phaseOf } from './scopeModel';
import type { QuoteLine, QuoteOptions, QuoteTotals } from './deckQuote';
import { quoteTotals } from './deckQuote';
import type { TradeRates } from './sidingPricing';

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export type PriceSource = 'catalogue' | 'your-rate' | 'sub-bid' | 'estimated';

export interface PricedScopeLine extends QuoteLine {
  source: PriceSource;
  phase: string;
  trade: string;
  /** Carried through so a quote can say which numbers were confirmed on site. */
  confidence: 'provisional' | 'confirmed';
}

export interface ScopeQuote {
  lines: PricedScopeLine[];
  totals: QuoteTotals;
  unpricedCount: number;
  /** Lines waiting on a subcontractor's number. */
  awaitingBids: number;
  provisionalCount: number;
}

/**
 * Which quote category a scope line belongs in.
 *
 * The pipeline's quote editor and the customer's portal both split a quote into
 * materials and labour, so the split has to be decided here rather than left
 * for them to guess.
 */
function categoryFor(line: ScopeLine): QuoteLine['category'] {
  if (line.taskId) return 'Labour';
  if (line.bidOut) return 'Labour';
  return 'Hardware';
}

export function priceScope(
  scope: Scope,
  rates: TradeRates,
  prices: Record<string, number>,
  opts: QuoteOptions,
): ScopeQuote {
  const lines: PricedScopeLine[] = [];

  for (const l of scope.lines) {
    const common = {
      description: l.description,
      unit: l.unit,
      category: categoryFor(l),
      phase: phaseOf(l.phase).label,
      trade: l.trade,
      confidence: l.confidence,
    };

    // ── subbed out ──
    if (l.bidOut) {
      const amount = Number(l.bidAmount) || 0;
      lines.push({
        ...common,
        sku: `sub:${l.trade}:${l.id}`,
        qty: 1,
        unitPrice: round2(amount),
        total: round2(amount),
        unpriced: !(amount > 0),
        source: amount > 0 ? 'sub-bid' : 'estimated',
        basis: amount > 0
          ? `${l.trade} subcontractor's returned price`
          : `out to ${l.trade} — no number back yet`,
      });
      continue;
    }

    // ── labour, from the task template ──
    const task = l.taskId ? taskById(l.taskId) : undefined;
    if (task) {
      // Recomputed from the current quantity rather than frozen at whatever the
      // hours were when the line was added. A scope gets edited.
      const hours = hoursFor(task, l.qty);
      const rate = Number(rates[l.trade]) || 0;
      lines.push({
        ...common,
        sku: `labour:${task.id}`,
        description: `${l.description} — ${l.qty} ${l.unit}`,
        unit: 'hr',
        qty: hours,
        unitPrice: round2(rate),
        total: round2(hours * rate),
        unpriced: !(rate > 0),
        source: rate > 0 ? 'your-rate' : 'estimated',
        basis: rate > 0
          ? `${task.hoursPer} hr per ${task.unit} at your ${l.trade} rate`
          : `no ${l.trade} rate set`,
      });
      continue;
    }

    // ── material, from the catalogues ──
    const sku = l.sku || `scope:${l.description.toLowerCase().replace(/\s+/g, '-')}`;
    const price = Number(prices[sku]) || 0;
    lines.push({
      ...common,
      sku,
      qty: l.qty,
      unitPrice: round2(price),
      total: round2(l.qty * price),
      unpriced: !(price > 0),
      source: price > 0 ? 'catalogue' : 'estimated',
      basis: price > 0 ? 'vendor catalogue' : 'no catalogue price',
    });
  }

  return {
    lines,
    totals: quoteTotals(lines, opts),
    unpricedCount: lines.filter(l => l.unpriced).length,
    awaitingBids: lines.filter(l => l.source === 'estimated' && l.sku.startsWith('sub:')).length,
    provisionalCount: lines.filter(l => l.confidence === 'provisional').length,
  };
}

/** Every SKU this scope wants a price for, to hand to the catalogue lookup. */
export function skusToPrice(scope: Scope): Array<{ sku: string; description: string }> {
  const out = new Map<string, string>();
  for (const l of scope.lines) {
    if (l.bidOut || l.taskId) continue;
    const sku = l.sku || `scope:${l.description.toLowerCase().replace(/\s+/g, '-')}`;
    if (!out.has(sku)) out.set(sku, l.description);
  }
  return [...out.entries()].map(([sku, description]) => ({ sku, description }));
}

/**
 * One honest sentence about how solid this number is.
 *
 * Two different weaknesses, and they are not the same. Unpriced lines make the
 * total wrong. Provisional quantities make it uncertain. A quote can suffer
 * from either, and saying which is the difference between a number somebody can
 * act on and a number they have to interrogate.
 */
export function quoteConfidence(q: ScopeQuote): string {
  if (!q.lines.length) return 'Nothing to price yet.';
  const parts: string[] = [];
  if (q.awaitingBids > 0) {
    parts.push(`${q.awaitingBids} line${q.awaitingBids === 1 ? '' : 's'} still out to bid`);
  }
  const otherUnpriced = q.unpricedCount - q.awaitingBids;
  if (otherUnpriced > 0) {
    parts.push(`${otherUnpriced} with no price at all`);
  }
  if (parts.length) {
    return `The total is short: ${parts.join(', ')}. Not a quote yet.`;
  }
  if (q.provisionalCount > 0) {
    return `Everything is priced, but ${q.provisionalCount} quantit${q.provisionalCount === 1 ? 'y is' : 'ies are'} still provisional — worked out at the desk, not confirmed on site.`;
  }
  return 'Every line priced, every quantity confirmed on site.';
}
