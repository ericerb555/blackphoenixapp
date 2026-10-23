/**
 * What a customer is allowed to see of their own invoice.
 *
 * WHY THIS EXISTS
 *
 * `GET /invoices` answers a non-admin with `records.filter(ownsFinancialRecord)`
 * — the WHOLE stored record for every invoice that is theirs. So a line
 * marked `visible: false` was sent to the customer's browser and merely not
 * drawn, which is the same decorative hiding `customerQuoteView` was written
 * to end on quotes. One devtools tab away.
 *
 * Invoices are worse than quotes in one respect: they are generated from a
 * draw on the payment schedule, so `line_items` carries the phase's entire
 * breakdown — including the contingency and the sub's markup, which are
 * exactly the lines somebody hides.
 *
 * The rule, from `customers-never-see-our-discounted-pricing`:
 *
 *   "Filtering a discounted price out in the browser is not enough, because
 *    the figure has already been sent; the decision about which price a
 *    caller may see belongs on the server, in the route that assembles the
 *    response, keyed on who is asking. A hidden field is not a check."
 *
 * AN ALLOWLIST, NOT A DENYLIST
 *
 * Built field by field from what `InvoiceDocument` and the customer portal
 * actually read. A denylist is one forgotten field away from a silent leak
 * every time somebody adds something to the record; the failure mode of
 * forgetting here is a blank on the customer's screen, which gets noticed.
 *
 * THE DIFFERENCE FROM THE QUOTE PROJECTION, WHICH IS THE WHOLE DESIGN
 *
 * A quote's totals are stored fields, so dropping hidden lines leaves them
 * untouched and the arithmetic simply does not itemise. An invoice's phase
 * subtotals are DERIVED BY THE RENDERER from the lines it is given — so
 * dropping a line silently reduces the phase it belonged to, and the
 * sections stop adding up to the total the customer is being asked to pay.
 * People add up invoices. They query the difference.
 *
 * So the hidden lines are removed AND `phase_costs` is sent alongside,
 * computed from every line, drawn or not. The renderer takes its subtotals
 * from there. The invoice's own stored totals pass through untouched for the
 * same reason they do on a quote: recomputing them from the visible lines
 * would contradict the total and make the document look wrong rather than
 * summarised.
 *
 * WHY NOT FOLD THE HIDDEN LINES INTO AN "OTHER ITEMS" LINE
 *
 * Considered and rejected. It keeps the sums right without a side channel,
 * but it announces that something was withheld, on every invoice, in a way
 * the quote does not. The two documents should behave the same, and Eric
 * already chose the quote's behaviour: the detail goes, the money stays.
 */

/** A line the customer may see. Anything not named here does not travel. */
export interface CustomerInvoiceLine {
  line_number: number;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  phase?: string;
}

export interface CustomerInvoice {
  id: string;
  invoice_id: string;
  invoice_number: string;
  status: string;
  issue_date: string;
  due_date: string;
  customer_name: string;
  customer_email: string;
  customer_address: string;
  service_address: string;
  project_id: string;
  line_items: CustomerInvoiceLine[];
  /** Phase name → its true cost, counting withheld lines. '' is unphased. */
  phase_costs: Record<string, number>;
  process_steps: Array<{ title: string; description?: string; estimatedDuration?: string }>;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  notes: string;
  terms: string;
}

const str = (v: any) => (v === null || v === undefined ? '' : String(v));
const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Absent means shown.
 *
 * Every invoice written before this field existed has no such flag, and
 * defaulting the other way would blank the lines off documents already sent
 * — changing paper somebody is holding. Only an explicit `false` withholds.
 */
export const isLineShown = (line: any): boolean => line?.visible !== false;

const amountOf = (line: any): number =>
  Number.isFinite(Number(line?.amount))
    ? round2(Number(line.amount))
    : round2((Number(line?.quantity) || 0) * (Number(line?.unit_price) || 0));

/**
 * What each phase truly costs, counting the lines the customer will not see.
 *
 * Computed from ALL the lines. Deriving it from the drawn ones would be the
 * bug this whole module exists to avoid, one level down.
 */
function phaseCosts(lineItems: any[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const line of lineItems) {
    const key = str(line?.phase).trim();
    out[key] = round2((out[key] || 0) + amountOf(line));
  }
  return out;
}

/**
 * A process step, stripped to what a customer may read.
 *
 * Steps carry `visible` too, and an internal staging note is as private as
 * an internal line. Anything else on the step — crew notes, supplier
 * contacts, whatever gets added later — does not travel because it is not
 * named here.
 */
function customerSteps(steps: any): CustomerInvoice['process_steps'] {
  if (!Array.isArray(steps)) return [];
  return steps.filter(isLineShown).map((s: any) => ({
    title: str(s?.title || s?.step),
    ...(s?.description ? { description: str(s.description) } : {}),
    ...(s?.estimatedDuration ? { estimatedDuration: str(s.estimatedDuration) } : {}),
  }));
}

/**
 * Project one stored invoice down to the customer's copy.
 *
 * Totals are passed through, never recomputed. The visible lines will not
 * sum to the subtotal whenever anything is hidden, and that is intended —
 * it is how a contractor avoids itemising every dump run without giving the
 * work away.
 */
export function customerInvoiceView(invoice: any): CustomerInvoice {
  const all: any[] = Array.isArray(invoice?.line_items) ? invoice.line_items : [];

  const line_items = all.filter(isLineShown).map((line: any, i: number) => {
    const projected: CustomerInvoiceLine = {
      line_number: i + 1,
      description: str(line?.description),
      quantity: num(line?.quantity),
      unit_price: num(line?.unit_price),
      amount: amountOf(line),
    };
    const phase = str(line?.phase).trim();
    if (phase) projected.phase = phase;
    return projected;
  });

  return {
    id: str(invoice?.id),
    invoice_id: str(invoice?.invoice_id),
    invoice_number: str(invoice?.invoice_number),
    status: str(invoice?.status),
    issue_date: str(invoice?.issue_date || invoice?.issuedAt || invoice?.createdAt),
    due_date: str(invoice?.due_date || invoice?.dueDate),
    customer_name: str(invoice?.customer_name || invoice?.customerName),
    customer_email: str(invoice?.customer_email || invoice?.customerEmail),
    customer_address: str(invoice?.customer_address),
    service_address: str(invoice?.service_address),
    project_id: str(invoice?.project_id || invoice?.workRequestId),
    line_items,
    phase_costs: phaseCosts(all),
    process_steps: customerSteps(invoice?.process_steps ?? invoice?.processSteps),
    subtotal: num(invoice?.subtotal),
    tax_rate: num(invoice?.tax_rate),
    tax_amount: num(invoice?.tax_amount),
    discount_amount: num(invoice?.discount_amount),
    total_amount: num(invoice?.total_amount),
    paid_amount: num(invoice?.paid_amount),
    balance_due: num(invoice?.balance_due),
    notes: str(invoice?.notes),
    terms: str(invoice?.terms),
  };
}
