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
}

export interface InvoiceLine {
  line_number: number;
  description: string;
  quantity: number;
  /** Negative for a credit — this invoice model has no credit kind of its own. */
  unit_price: number;
  is_taxable: boolean;
}

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
  const materials = (quote?.materials || []).map((m) => ({
    description: `${m.name || m.description || 'Material'}${m.unit ? ` (${m.unit})` : ''}`,
    quantity: num(m.quantity, 1) || 1,
    unit_price: num(m.unitCost ?? m.unitPrice),
    // Materials carry sales tax.
    is_taxable: true,
  }));

  const labour = (quote?.labor || quote?.laborItems || []).map((l) => ({
    description: `Labor — ${l.role || l.description || 'work'}`,
    quantity: num(l.hours, 1) || 1,
    unit_price: num(l.hourlyRate ?? l.unitPrice),
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
  const quoted = Number(quote?.totalCost ?? quote?.total);
  return Number.isFinite(quoted) && quoted > 0 ? quoted : num(estimatedValue);
}

/**
 * What those lines come to, by the invoice's own rules.
 *
 * Here so a conversion can be checked end to end without a browser: the lines
 * and the totals are produced by the same code the screens use, so a test of
 * this is a test of what actually happens.
 *
 * `taxRate` accepts a fraction or a percent, because quotes store 0.08 and
 * invoices store 8 — the same trap `constructionTax` handles.
 */
export function invoiceTotals(lines: InvoiceLine[], taxRate: number) {
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const rateValue = num(taxRate);
  const rate = rateValue <= 1 ? rateValue : rateValue / 100;

  let subtotal = 0;
  let taxable = 0;
  for (const line of lines || []) {
    const amount = num(line.quantity, 1) * num(line.unit_price);
    subtotal += amount;
    if (line.is_taxable !== false) taxable += amount;
  }

  // Floored: credits larger than the taxable charges must not produce a
  // negative tax that quietly adds money back to the bill.
  const taxableSubtotal = Math.max(0, round2(taxable));
  const tax = round2(taxableSubtotal * rate);

  return {
    subtotal: round2(subtotal),
    taxableSubtotal,
    tax,
    total: round2(subtotal + tax),
  };
}
