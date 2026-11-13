/**
 * Closed emergency calls, as lines on an invoice.
 *
 * WHY THIS EXISTS
 *
 * `onCallCharges.ts` prices a callout the moment it is closed, and the close
 * route stores the result on the call record. Nothing read it back. So the
 * arithmetic was right, the lines were sitting there with the hours and the
 * minimum-hours note already written — and the customer was never asked to pay
 * for any of it, because the only path from a closed call to an invoice was
 * somebody remembering the call happened and typing it in again.
 *
 * Work done at two in the morning is the work most likely to be forgotten and
 * the work least likely to be cheap. This is the path.
 *
 * THE RISK IS THE OPPOSITE ONE, AND IT IS WORSE
 *
 * Billing a callout twice is a worse failure than billing it late. A customer
 * invoiced late pays; a customer invoiced twice for the same night stops
 * trusting every figure on every invoice after it. So exclusion is decided
 * from two independent sources and a call has to clear both:
 *
 *   1. The marker on the call record (`charges.invoicedOn`), written after an
 *      invoice is saved.
 *   2. The `sourceCallId` carried on the line items of invoices that already
 *      exist, passed in by the caller.
 *
 * The second is the durable one. A marker can fail to write — it is a second
 * request after the invoice is already saved, and the browser may be closed by
 * then. The line on the invoice cannot fail to exist, because the invoice is
 * the thing that was saved. The marker is a convenience that saves a lookup;
 * the line is the evidence. Neither is trusted alone.
 *
 * WHAT IS DELIBERATELY NOT BILLABLE
 *
 * A closed call priced at nothing. Plenty of accounts fold the callout into
 * the job and charge only for materials, and `callChargeLines` returns an
 * empty list for them on purpose — its own note says a $0.00 row on an invoice
 * reads as a mistake. Such a call is not hidden here either: it comes back
 * under `nothingToBill` so the person invoicing can see the call happened and
 * that it was free, rather than wondering where it went.
 *
 * AND WHAT MUST NEVER BE SILENTLY DROPPED
 *
 * A call that closed but could not be priced. The close route tolerates a
 * pricing failure on purpose — an emergency that is over must be closable at
 * midnight even if a rate card will not load — which means "closed with no
 * charges" is a state the system creates by design. If this module quietly
 * skipped those, the exact calls that hit a problem would be the ones that
 * never got billed. They come back under `needsPricing`, with the reason.
 */

/** The line shape the invoice modal holds, matching `quoteToInvoice`. */
export interface InvoiceLine {
  line_number: number;
  description: string;
  quantity: number;
  unit_price: number;
  is_taxable: boolean;
  /**
   * The call this line came from.
   *
   * Written onto the invoice and never removed. This is what makes a second
   * billing detectable by anything that reads invoices, including this file
   * on the next run, and it is why the marker on the call is not load-bearing.
   */
  sourceCallId?: string;
}

/** As much of a stored call as this file needs. Loose: it comes from kv. */
export interface CallLike {
  id?: string;
  jobId?: string | null;
  workRequestId?: string | null;
  title?: string;
  trade?: string;
  status?: string;
  closedAt?: string | null;
  createdAt?: string | null;
  siteAddress?: string;
  charges?: {
    lines?: Array<Record<string, unknown>>;
    totalCents?: number;
    billedHours?: number;
    chargedBy?: string;
    pricedAt?: string;
    /** Set once this call has been put on an invoice. */
    invoicedOn?: string | null;
  } | null;
}

export interface BillableCall {
  callId: string;
  title: string;
  trade: string;
  closedAt: string | null;
  totalCents: number;
  billedHours: number;
  chargedBy: string;
  /** Numbered from 1 within the call; `invoiceLinesFromCalls` renumbers. */
  lines: InvoiceLine[];
}

export interface CallSkipped {
  callId: string;
  title: string;
  closedAt: string | null;
  why: string;
}

export interface BillableCalls {
  billable: BillableCall[];
  /** Closed, priced at zero. Real, and free. */
  nothingToBill: CallSkipped[];
  /** Closed and never priced. Somebody has to look at these. */
  needsPricing: CallSkipped[];
  /** Already on an invoice, with which one. */
  alreadyInvoiced: CallSkipped[];
  /** The sum of everything in `billable`, in cents. */
  totalCents: number;
}

const num = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const text = (v: unknown, fallback = ''): string => {
  const s = String(v ?? '').trim();
  return s || fallback;
};

/**
 * Every call id already named on an invoice's lines.
 *
 * Takes whatever the caller has — invoice records, a flat list of lines, a
 * mixture — because the shape of an invoice varies by where it was read from
 * and a narrow signature here would push that mess into the caller.
 */
export function invoicedCallIds(invoices: unknown): Map<string, string> {
  const found = new Map<string, string>();
  const rows = Array.isArray(invoices) ? invoices : [];

  for (const row of rows) {
    const inv = row as any;
    if (!inv || typeof inv !== 'object') continue;
    const label = text(
      inv.invoice_number ?? inv.invoiceNumber ?? inv.id,
      'an existing invoice',
    );
    const lines = Array.isArray(inv.line_items) ? inv.line_items
      : Array.isArray(inv.lineItems) ? inv.lineItems
      : Array.isArray(inv) ? inv
      : [];
    for (const line of lines) {
      const id = text((line as any)?.sourceCallId);
      // First one wins: if the same call somehow reached two invoices, the
      // earlier one is the one to point at when refusing the third.
      if (id && !found.has(id)) found.set(id, label);
    }
  }
  return found;
}

/**
 * Which of a job's calls can be billed, and what happened to the rest.
 *
 * `jobId` is what ties them together — a call carries the job it belongs to
 * rather than a customer, because the call, the quote and the invoice are one
 * piece of work and the customer can move between the three.
 */
export function billableCalls(
  calls: readonly CallLike[] | null | undefined,
  opts: {
    jobId?: string | null;
    workRequestId?: string | null;
    /** Invoices that already exist, so their lines can veto a call. */
    existingInvoices?: unknown;
  } = {},
): BillableCalls {
  const out: BillableCalls = {
    billable: [], nothingToBill: [], needsPricing: [], alreadyInvoiced: [], totalCents: 0,
  };

  const jobId = text(opts.jobId);
  const workRequestId = text(opts.workRequestId);
  // With neither, there is nothing to scope to. Returning every call on the
  // platform would put another customer's emergency on this invoice, so the
  // answer is nothing.
  if (!jobId && !workRequestId) return out;

  const onInvoices = invoicedCallIds(opts.existingInvoices);

  for (const call of calls ?? []) {
    if (!call || typeof call !== 'object') continue;

    const belongs = (jobId && text(call.jobId) === jobId)
      || (workRequestId && text(call.workRequestId) === workRequestId);
    if (!belongs) continue;

    const callId = text(call.id);
    if (!callId) continue;

    // An open call is not finished work. Billing one would invoice for an
    // emergency still in progress, and the hours are not known yet.
    if (text(call.status) !== 'closed') continue;

    const title = text(call.title, 'Emergency call');
    const closedAt = text(call.closedAt) || null;
    const skip = { callId, title, closedAt };

    const already = onInvoices.get(callId) || text(call.charges?.invoicedOn);
    if (already) {
      out.alreadyInvoiced.push({ ...skip, why: 'Already on ' + already });
      continue;
    }

    const charges = call.charges;
    if (!charges || !Array.isArray(charges.lines)) {
      out.needsPricing.push({
        ...skip,
        why: 'Closed without being priced — the rate card could not be read at the time',
      });
      continue;
    }

    const lines = charges.lines
      .map((raw, i) => {
        const quantity = num((raw as any)?.quantity, 1);
        const unitPrice = num((raw as any)?.unit_price);
        return {
          line_number: i + 1,
          description: text((raw as any)?.description, title),
          quantity,
          unit_price: unitPrice,
          is_taxable: (raw as any)?.is_taxable !== false,
          sourceCallId: callId,
        } as InvoiceLine;
      })
      // A line that totals nothing is dropped rather than shown as $0.00, for
      // the same reason the pricer refuses to emit one.
      .filter((l) => Math.abs(l.quantity * l.unit_price) > 0.005);

    if (!lines.length) {
      out.nothingToBill.push({
        ...skip,
        why: 'Priced at nothing — this account does not charge for the callout',
      });
      continue;
    }

    const totalCents = num(charges.totalCents)
      || Math.round(lines.reduce((n, l) => n + l.quantity * l.unit_price, 0) * 100);

    out.billable.push({
      callId,
      title,
      trade: text(call.trade),
      closedAt,
      totalCents,
      billedHours: num(charges.billedHours),
      chargedBy: text(charges.chargedBy, 'account'),
      lines,
    });
    out.totalCents += totalCents;
  }

  // Oldest first: the order the work was done, which is the order somebody
  // reading the invoice will reconstruct it in.
  const byDate = (a: { closedAt: string | null }, b: { closedAt: string | null }) =>
    String(a.closedAt ?? '').localeCompare(String(b.closedAt ?? ''));
  out.billable.sort(byDate);
  out.needsPricing.sort(byDate);

  return out;
}

/** A date a customer reads, from an ISO string that may be rubbish. */
function dayOf(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * The chosen calls as one continuous run of invoice lines.
 *
 * `startAt` is where the invoice's existing lines left off. Renumbering is not
 * cosmetic: two lines sharing a number is how a total stops matching the rows
 * above it on a printed invoice.
 *
 * Each line is labelled with its own call, because an invoice carrying three
 * callouts otherwise shows "Emergency callout" three times with no way to tell
 * which night is which.
 */
export function invoiceLinesFromCalls(
  billable: readonly BillableCall[] | null | undefined,
  startAt = 1,
): InvoiceLine[] {
  const lines: InvoiceLine[] = [];
  let n = Math.max(1, Math.floor(num(startAt, 1)));

  for (const call of billable ?? []) {
    const when = call.closedAt ? dayOf(call.closedAt) : '';
    for (const line of call.lines ?? []) {
      const label = when
        ? line.description + ' · ' + call.title + ' (' + when + ')'
        : line.description + ' · ' + call.title;
      lines.push({ ...line, line_number: n, description: label });
      n += 1;
    }
  }
  return lines;
}
