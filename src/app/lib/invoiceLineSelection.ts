/**
 * Which invoice lines are drawn, and which are held back.
 *
 * Eric: "i should be able to click individual items to show on the invoice i
 * can only show all or none?" — correct, and the all-or-none was not even
 * wired up. `applyDetailLevel` and `collapseToPhaseTotals` existed, were
 * documented and were tested, and nothing ever called them. The invoice
 * rendered every line in `line_items` unconditionally.
 *
 * This is the per-line control the quote has had for a while, brought across
 * so the two documents behave the same way. Somebody who has learned to hide
 * the dump run on a quote should not discover the invoice has its own
 * different rules.
 *
 * THE TWO RULES, AND WHY THEY ARE BOTH NEEDED
 *
 *   included: false  the line is not ON THE INVOICE at all and its money is
 *                    out of every total — work decided against, not billed
 *   visible: false   this line is nobody's business — the contingency, the
 *                    skip, the sub's markup — and its MONEY STAYS IN
 *   phase-totals     the whole breakdown is withheld (see `invoicePhases`)
 *
 * The first two are easy to conflate and must not be. "Not included" changes
 * what is owed; "not visible" changes only what is itemised.
 *
 * HIDING REMOVES THE DETAIL, NOT THE MONEY
 *
 * This is the part that is easy to get wrong and expensive to get wrong. An
 * invoice whose phase subtotals are summed from the DRAWN lines drops by
 * exactly the hidden amount, so the sections stop adding up to the total the
 * customer is asked to pay. They will notice, because people add up invoices.
 * So `phaseCost` counts every line, drawn or not, and the renderer takes its
 * subtotals from there rather than from what it happens to be drawing.
 *
 * WHY THIS FILE HAS NO IMPORTS
 *
 * The same reason `quotePdfSelection`, `safeFetch`, `ipReputation` and
 * `customerQuoteView` have none: it is the rule that decides what a customer
 * is allowed to see, so it has to be assertable in a plain Node test rather
 * than reasoned about. A mistake here bills somebody for a line it also
 * refuses to show them.
 *
 * The server enforces the same rules independently in `customerInvoiceView`.
 * That duplication is deliberate — Deno cannot import from `src/`, and a
 * hide that exists only in the browser is not a hide at all.
 */

export interface InvoiceLine {
  line_number?: number;
  description: string;
  quantity: number;
  unit_price: number;
  is_taxable?: boolean;
  /** Which phase of the job this line belongs to. Absent is normal. */
  phase?: string;
  /**
   * Shown on the customer's copy?
   *
   * ABSENT MEANS SHOWN. Every invoice already written has no such field, and
   * defaulting the other way would blank the lines off documents that have
   * already been sent — changing paper somebody is holding, which is not a
   * feature. Same reasoning as `taxable` on the builder's own line type.
   */
  visible?: boolean;
  kind?: 'charge' | 'credit';
}

/** Absent means shown — see the field. */
export const isLineShown = (line: any): boolean => line?.visible !== false;

/**
 * Is this line on the invoice at all?
 *
 * ABSENT MEANS INCLUDED, so no invoice already written changes. Excluded is
 * checked before every other rule and on the office copy too — an internal
 * printout listing work that is not being billed is how somebody quotes a
 * figure that is not the figure.
 */
export const isLineIncluded = (line: any): boolean => line?.included !== false;

/** The key `phaseCost` uses for lines belonging to no phase. */
export const UNPHASED = '';

/** The phase key for a line, normalised the way `groupLinesByPhase` does it. */
export const phaseKeyOf = (line: any): string => String(line?.phase || '').trim();

/**
 * One line's money. Credits are stored with a negative `unit_price`, so the
 * sign falls out of the arithmetic and is never applied twice.
 */
export const amountOf = (line: any): number =>
  Math.round((Number(line?.quantity) || 0) * (Number(line?.unit_price) || 0) * 100) / 100;

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface InvoiceSelection {
  /** The lines to draw, in their original order. */
  lines: InvoiceLine[];
  /** Phase key → the true cost of that phase, counting withheld lines. */
  phaseCost: Map<string, number>;
  /** How many lines were withheld. Zero on the internal copy. */
  hiddenCount: number;
  /** The money withheld from view. Still owed; just not itemised. */
  hiddenAmount: number;
}

/**
 * Apply the visibility rules.
 *
 * `forCustomer` is the whole switch. The internal copy shows everything with
 * the withheld lines MARKED, because the control exists to manage what the
 * customer sees, not to blind the person who raised the invoice — and
 * reading a printout without knowing which lines the customer saw is how
 * somebody ends up discussing a line the customer has never heard of.
 */
export function selectInvoiceLines(
  lineItems: any,
  forCustomer: boolean,
): InvoiceSelection {
  // Excluded lines are gone before anything else looks at them, so they
  // cannot appear in a total, a phase cost, or a withheld tally.
  const all: any[] = (Array.isArray(lineItems) ? lineItems : []).filter(isLineIncluded);

  const lines: InvoiceLine[] = [];
  let hiddenCount = 0;
  let hiddenAmount = 0;

  for (const line of all) {
    const shown = isLineShown(line);
    if (!shown) {
      hiddenCount += 1;
      hiddenAmount = round2(hiddenAmount + amountOf(line));
    }
    if (forCustomer && !shown) continue;
    lines.push(
      !forCustomer && !shown
        ? { ...line, description: `${line?.description ?? ''}  (hidden from customer)` }
        : line,
    );
  }

  /**
   * Every line counts towards its phase, drawn or not — see the note at the
   * top. This is computed from `all`, never from `lines`, and that is the
   * single most important line in this file.
   */
  const phaseCost = new Map<string, number>();
  for (const line of all) {
    const key = phaseKeyOf(line);
    phaseCost.set(key, round2((phaseCost.get(key) || 0) + amountOf(line)));
  }

  return {
    lines,
    phaseCost,
    hiddenCount: forCustomer ? hiddenCount : 0,
    hiddenAmount: forCustomer ? hiddenAmount : 0,
  };
}
