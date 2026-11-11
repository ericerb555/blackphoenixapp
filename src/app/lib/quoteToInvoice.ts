/**
 * quoteToInvoice — turning an approved quote into invoice lines.
 *
 * WHY THIS IS A MODULE AND NOT INLINE IN THE BUTTON
 *
 * It was inline, and it was wrong in two ways at once: it sent the customer's
 * stated BUDGET rather than the quoted price, and it flattened the whole quote
 * into a single "Project Work" line. The first would have invoiced half a
 * million dollars for a fifty-thousand-dollar job. The second threw away the
 * breakdown the customer approved and, with it, the one thing an invoice line
 * cannot work out for itself — whether sales tax applies.
 *
 * Inline, neither could be tested without a browser and a signed-in session.
 * Here they can be proven with numbers, which is the only way anybody finds out
 * before a customer does.
 *
 * WHAT IT REFUSES TO GUESS
 *
 * The taxability of a line. Materials are taxable, labour is not, and credits
 * carry the tax treatment of the thing being credited. That is knowable here,
 * from the quote's own structure, and nowhere downstream.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * Add the lines up. It carried an `invoiceTotals` for a while and nothing ever
 * called it — the screens each total their own lines. A second implementation
 * of the arithmetic, tested and unused, is worse than none: it reads as the
 * authority while the real answer is computed somewhere else entirely.
 */

export interface QuoteLikeMaterial {
  name?: string;
  description?: string;
  unit?: string;
  quantity?: number;
  unitCost?: number;
  unitPrice?: number;
}

export interface QuoteLikeLabor {
  role?: string;
  description?: string;
  hours?: number;
  hourlyRate?: number;
  unitPrice?: number;
}

export interface QuoteLikeCredit {
  description?: string;
  amount?: number;
  reason?: string;
}

export interface QuoteLike {
  materials?: QuoteLikeMaterial[];
  labor?: QuoteLikeLabor[];
  laborItems?: QuoteLikeLabor[];
  credits?: QuoteLikeCredit[];
  taxRate?: number;
  totalCost?: number;
  total?: number;
  /** Stamped at signature: totalCost less the labour discount agreed. */
  agreedTotal?: number;
}

export interface InvoiceLine {
  line_number: number;
  description: string;
  quantity: number;
  /** Negative for a credit — this invoice model has no credit kind of its own. */
  unit_price: number;
  is_taxable: boolean;
}

import { customerPricingOf } from "../../../supabase/functions/server/quoteCustomerPrice.ts";

const num = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * The quote's lines, in the order a customer reads them.
 *
 * Materials, then labour, then anything credited back — which is the order the
 * quote itself presents and the order that makes a total legible as you go down
 * the page.
 */
export function invoiceLinesFromQuote(quote: QuoteLike | null | undefined): InvoiceLine[] {
  /**
   * AT THE PRICE, NOT AT THE COST.
   *
   * `unitCost` and `hourlyRate` are what the job costs US. Overhead, profit
   * and contingency go on the whole quote and reach only `totalCost`, so an
   * invoice built from these lines billed the customer our cost — about a
   * fifth under the figure they approved — and the server derives the invoice
   * total FROM the lines, so the amount passed beside them could not save it.
   *
   * The same apportionment the quote, the PDF and the portal use, so the
   * invoice bills what the customer agreed to rather than a fourth opinion.
   */
  const pricing = customerPricingOf(quote as any);
  const priced = (n: number) => Math.round(n * pricing.factor * 100) / 100;

  const materials = (quote?.materials || []).map((m) => ({
    description: `${m.name || m.description || 'Material'}${m.unit ? ` (${m.unit})` : ''}`,
    quantity: num(m.quantity, 1) || 1,
    unit_price: priced(num(m.unitCost ?? m.unitPrice)),
    // Materials carry sales tax.
    is_taxable: true,
  }));

  const labour = (quote?.labor || quote?.laborItems || []).map((l) => ({
    description: `Labor — ${l.role || l.description || 'work'}`,
    quantity: num(l.hours, 1) || 1,
    unit_price: priced(num(l.hourlyRate ?? l.unitPrice)),
    /**
     * Labour is a service and is not taxed here.
     *
     * Marked as the line is built rather than left to somebody pressing a
     * toggle, because the default on an invoice line is taxable — so forgetting
     * means charging sales tax on labour, silently, on every invoice.
     */
    is_taxable: false,
  }));

  const credits = (quote?.credits || []).map((c) => ({
    description: c.description || 'Customer-supplied material',
    quantity: 1,
    unit_price: -Math.abs(num(c.amount)),
    /**
     * A credit against material is material leaving the bill, so it takes its
     * tax with it. Leaving it non-taxable would drop the charge and keep the
     * tax on something no longer being sold.
     */
    is_taxable: true,
  }));

  return [...materials, ...labour, ...credits]
    .map((line, i) => ({ ...line, line_number: i + 1 }));
}

/**
 * What the invoice is for.
 *
 * The quoted price, and the budget only when nothing has been quoted at all.
 * `estimatedValue` is what the customer said they had to spend; invoicing it
 * bills a number nobody agreed to.
 */
export function invoiceAmountFromQuote(
  quote: QuoteLike | null | undefined,
  estimatedValue = 0,
): number {
  /**
   * What was AGREED, when a signature says so.
   *
   * `agreedTotal` is stamped when the customer approves and is `totalCost`
   * less the labour discount they were shown. Billing `totalCost` takes the
   * discount back off them at invoice time, which is the one place nobody
   * is looking for it.
   */
  const agreed = Number((quote as any)?.agreedTotal);
  if (Number.isFinite(agreed) && agreed > 0) return agreed;
  const quoted = Number(quote?.totalCost ?? quote?.total);
  return Number.isFinite(quoted) && quoted > 0 ? quoted : num(estimatedValue);
}
