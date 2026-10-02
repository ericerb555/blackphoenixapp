/**
 * Taking the figures off a quote and putting them on a conditions report.
 *
 * WHY THIS IS NOT A TOTAL
 *
 * A quote has one total; a deposit statement needs a figure per area, because
 * each one is a separate deduction the former tenant can agree with or dispute.
 * "We are keeping $1,130 of your deposit" is not a statement anybody can check.
 * "$820 for the flooring and $310 for the walls, here is the quote" is.
 *
 * So the quote's lines are grouped by the area they belong to and summed, and
 * the report records which quote each figure came from.
 *
 * HOW A LINE KNOWS ITS AREA
 *
 * Two ways, in this order. A line may carry `conditionArea` itself, which is how
 * a quote built from a conditions report should be written. Failing that, the
 * caller can supply an explicit assignment of line id to area — which is how
 * this works today, because the quote builder has no area picker yet.
 *
 * It is deliberately NOT guessed from the description text. "Repair flooring in
 * bedroom 2" matching the area "Flooring" by substring would work until the day
 * a line reads "protect flooring while working on the walls", and that line
 * would silently charge a tenant for the wrong area. A wrong deduction is worse
 * than an unassigned one, because the unassigned one gets noticed.
 *
 * NOTHING IS SILENTLY DROPPED
 *
 * Lines that belong to no area are reported back rather than ignored, and an
 * area with no lines stays unpriced rather than becoming zero — `depositMath`
 * then refuses to total, which is the behaviour that stops a half-priced quote
 * going out as a finished statement.
 */

import type { ReportCost } from './conditionsReport.ts';

export interface QuoteLineLike {
  id?: string;
  description?: string;
  qty?: number;
  rate?: number;
  /** A credit subtracts, the same as it does on the quote itself. */
  kind?: 'charge' | 'credit';
  /** The report area this line is for, where the quote records it. */
  conditionArea?: string;
}

export interface QuoteLike {
  id?: string;
  number?: string;
  workRequestId?: string;
  items?: QuoteLineLike[] | null;
}

export interface PricingResult {
  /** One entry per chargeable area, unpriced ones carrying null. */
  costs: ReportCost[];
  /** Lines that named no area, so they can be assigned rather than lost. */
  unassigned: Array<{ id: string; description: string; amount: number }>;
  /** Areas the quote said nothing about. */
  stillUnpriced: string[];
  /** What was read, so a route can report it without recomputing. */
  quoteId: string;
}

const str = (v: unknown): string => (v == null ? '' : String(v));
const money = (n: number): number => Math.round(n * 100) / 100;

/** What one line comes to, credits subtracting as they do on the quote. */
function lineAmount(line: QuoteLineLike): number {
  const qty = Number(line?.qty);
  const rate = Number(line?.rate);
  const amount = (Number.isFinite(qty) ? qty : 0) * (Number.isFinite(rate) ? rate : 0);
  return line?.kind === 'credit' ? -amount : amount;
}

/**
 * Group a quote's lines onto the report's chargeable areas.
 *
 * `chargeableAreas` comes from the report's own findings, and an area not on
 * that list is refused rather than added: a quote must not be able to introduce
 * a deduction for an area the comparison never found damage in.
 */
export function areasFromQuote(
  quote: QuoteLike,
  chargeableAreas: string[],
  assignment: Record<string, string> = {},
): PricingResult {
  const allowed = new Set((chargeableAreas || []).map((a) => str(a).trim()).filter(Boolean));
  const totals = new Map<string, number>();
  const unassigned: PricingResult['unassigned'] = [];

  const lines = Array.isArray(quote?.items) ? quote.items : [];
  lines.forEach((line, index) => {
    const id = str(line?.id) || `line-${index}`;
    const named = str(line?.conditionArea).trim() || str(assignment[id]).trim();
    const amount = lineAmount(line);

    if (!named || !allowed.has(named)) {
      // Either nobody said which area this is, or it names an area the report
      // found no damage in. Both are reported, never absorbed.
      unassigned.push({ id, description: str(line?.description), amount: money(amount) });
      return;
    }
    totals.set(named, money((totals.get(named) || 0) + amount));
  });

  const quoteId = str(quote?.number) || str(quote?.id);

  const costs: ReportCost[] = [...allowed].map((area) => {
    const has = totals.has(area);
    return {
      area,
      // Absent stays absent. An area the quote said nothing about must not
      // become zero, or the settlement would read as finished.
      cost: has ? Math.max(0, totals.get(area)!) : null,
      quoteId: has ? quoteId : undefined,
    };
  });

  return {
    costs,
    unassigned,
    stillUnpriced: costs.filter((c) => c.cost === null).map((c) => c.area),
    quoteId,
  };
}

/**
 * Why this quote may not price this report, or null when it may.
 *
 * The check that matters is the link: a quote may only price the report whose
 * work request it was raised against. Without it, any quote in the system could
 * be used to set a deduction against any tenant's deposit — a figure from one
 * person's job taking money off another person's deposit.
 */
export function pricingRefusal(
  quote: QuoteLike | null,
  report: { workRequestId?: string },
): string | null {
  if (!quote) return 'That quote could not be found.';
  if (!report?.workRequestId) {
    return 'This report has not been sent for pricing yet, so there is no job for a quote to belong to.';
  }
  if (str(quote.workRequestId) !== str(report.workRequestId)) {
    return 'That quote was not raised against this report. A deduction has to come from the job '
      + 'that was opened for this tenancy.';
  }
  if (!Array.isArray(quote.items) || quote.items.length === 0) {
    return 'That quote has no lines on it.';
  }
  return null;
}
