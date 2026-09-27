/**
 * jobFinancials — how a job is doing, from records that exist.
 *
 * WHAT THIS DELIBERATELY DOES NOT REPORT
 *
 * Margin, profit, or cost. It would be easy to subtract the quote's material
 * and labour subtotals from its total and call the difference profit, and it
 * would be wrong: those are what the customer is CHARGED, not what the work
 * COSTS. Real cost lives in purchase orders and in the hours employees bill to
 * a work order, and until this reads those, a margin figure here would be a
 * confident number with nothing behind it.
 *
 * This project has already been bitten by exactly that: dashboards carrying
 * revenue, ratings and conversion figures that were literals typed into a
 * component. A screen an owner makes decisions on has to be countable or
 * absent.
 *
 * So: quoted, invoiced, paid, outstanding, and what is left to invoice. All
 * five are sums of records somebody can be shown.
 */

export interface InvoiceLike {
  project_id?: string | null;
  total_amount?: number | null;
  paid_amount?: number | null;
  balance_due?: number | null;
  status?: string | null;
}

export interface JobFinancials {
  /** What the customer agreed to, when a quote exists. */
  quoted: number | null;
  /** Billed so far, across every invoice raised against this job. */
  invoiced: number;
  /** Actually received. */
  paid: number;
  /** Billed and not yet received. */
  outstanding: number;
  /** Quoted but not yet billed. Null when nothing has been quoted. */
  toInvoice: number | null;
  /** How many invoices this is counted from. */
  invoiceCount: number;
  /**
   * Billed beyond the quote.
   *
   * Not an error — change orders are real — but worth surfacing, because the
   * other reason it happens is invoicing the same work twice.
   */
  overInvoiced: boolean;
}

const money = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * The money on one job.
 *
 * `quoted` comes from the quote's own total; pass whatever `quoteTotal` gave
 * you, including null when nothing has been quoted. `invoices` should already
 * be the ones belonging to this job.
 */
export function jobFinancials(
  quoted: number | null | undefined,
  invoices: InvoiceLike[] | null | undefined,
): JobFinancials {
  const rows = (invoices || []).filter(Boolean);

  const invoiced = round(rows.reduce((sum, i) => sum + money(i.total_amount), 0));
  const paid = round(rows.reduce((sum, i) => sum + money(i.paid_amount), 0));

  /**
   * Outstanding is taken from each invoice's own balance where it has one.
   *
   * Recomputing it as invoiced minus paid would quietly disagree with the
   * invoice itself whenever a discount, a write-off or a part-payment has been
   * recorded against the invoice rather than derived. The invoice is the
   * record; this only adds them up.
   */
  const outstanding = round(rows.reduce((sum, i) => {
    const stated = i.balance_due;
    if (stated !== undefined && stated !== null && Number.isFinite(Number(stated))) {
      return sum + money(stated);
    }
    return sum + Math.max(0, money(i.total_amount) - money(i.paid_amount));
  }, 0));

  const hasQuote = quoted !== null && quoted !== undefined && Number.isFinite(Number(quoted));
  const quotedValue = hasQuote ? round(Number(quoted)) : null;

  return {
    quoted: quotedValue,
    invoiced,
    paid,
    outstanding,
    toInvoice: quotedValue === null ? null : round(quotedValue - invoiced),
    invoiceCount: rows.length,
    overInvoiced: quotedValue !== null && invoiced > quotedValue,
  };
}

/** Group invoices by the job they were raised against. */
export function invoicesByJob(invoices: InvoiceLike[] | null | undefined): Map<string, InvoiceLike[]> {
  const byJob = new Map<string, InvoiceLike[]>();
  for (const invoice of invoices || []) {
    const id = String(invoice?.project_id || '').trim();
    // An invoice with no job attached belongs to no job. It is not everybody's.
    if (!id) continue;
    const list = byJob.get(id);
    if (list) list.push(invoice);
    else byJob.set(id, [invoice]);
  }
  return byJob;
}
