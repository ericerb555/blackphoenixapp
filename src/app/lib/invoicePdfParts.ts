/**
 * Everything an invoice PDF needs that is NOT the company letterhead.
 *
 * WHY THIS IS SEPARATE FROM `invoiceToPdfDocument`
 *
 * The same reason `quotePdfSelection` is separate from `quoteToPdfDocument`:
 * so it can be tested. The assembler imports `companyInfo`, which pulls in
 * the branding service and a chain of browser-shaped modules Node's test
 * runner cannot follow. This half has no imports but the two tested modules
 * it builds on, so every decision it makes can be asserted.
 *
 * And they are decisions worth asserting. Which lines appear, what a phase
 * is said to cost, whether the tax rate is a percent or a fraction, and
 * whether the balance is stated — get any of those wrong and the document
 * is still a perfectly good-looking PDF with the wrong numbers on it, sent
 * to somebody who is going to pay against them.
 */
import { groupLinesByPhase } from './invoicePhases.ts';
import { selectInvoiceLines } from './invoiceLineSelection.ts';

export interface InvoicePdfPhase {
  title: string | null;
  label: string;
  duration?: string;
  lines: Array<{ description: string; quantity: number; rate: number; amount: number }>;
  subtotal: number;
}

export interface InvoicePdfParts {
  heading: string;
  number: string;
  date: string;
  /** The due date. The layout's "valid until" row is the right shape. */
  validUntil?: string;
  /** Always 'Due' — the row is shared with the quote, the word is not. */
  validUntilLabel?: string;
  status: string;
  customer: { name: string; email?: string; phone?: string; address?: string };
  job: { title?: string; description?: string };
  phases: InvoicePdfPhase[];
  showLines: boolean;
  subtotal: number;
  tax: number;
  /** A FRACTION, because the layout multiplies it by 100 to print it. */
  taxRate?: number;
  total: number;
  notes?: string;
  terms?: string;
}

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

const money = (n: number) =>
  `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function invoicePdfParts(invoice: any, forCustomer: boolean): InvoicePdfParts {
  const allLines = Array.isArray(invoice?.line_items) ? invoice.line_items : [];
  const selection = selectInvoiceLines(allLines, forCustomer);

  const steps = Array.isArray(invoice?.process_steps)
    ? invoice.process_steps
    : Array.isArray(invoice?.processSteps)
      ? invoice.processSteps
      : [];

  const grouped = groupLinesByPhase(selection.lines as any, steps);

  /**
   * The server's per-phase costs win wherever they exist.
   *
   * A customer's invoice arrives through `customerInvoiceView`, which has
   * ALREADY removed the withheld lines — so a cost computed from what is
   * left would be short by exactly the hidden amount, and the sections would
   * stop adding up to the total being charged. `phase_costs` was computed
   * server side before the removal, which is the only place it still could
   * be. On the office copy nothing was removed and the local figure is the
   * same number.
   */
  const serverCosts = invoice?.phase_costs as Record<string, number> | undefined;
  const costOf = (phase: string | null, fallback: number) => {
    const key = phase ?? '';
    if (serverCosts && Object.prototype.hasOwnProperty.call(serverCosts, key)) {
      return round2(Number(serverCosts[key]));
    }
    const local = selection.phaseCost.get(key);
    return local === undefined ? fallback : local;
  };

  const phases: InvoicePdfPhase[] = grouped.map((g) => ({
    title: g.phase,
    label: g.label,
    duration: g.duration,
    lines: g.lines.map((l: any) => ({
      description: l.description,
      quantity: Number(l.quantity) || 0,
      rate: Number(l.unit_price) || 0,
      amount: round2((Number(l.quantity) || 0) * (Number(l.unit_price) || 0)),
    })),
    subtotal: costOf(g.phase, g.subtotal),
  }));

  /**
   * With every line withheld there is nothing to group, so the phases are
   * rebuilt from their costs — otherwise an invoice for several thousand
   * pounds prints a total with blank space above it.
   */
  if (!phases.length) {
    for (const [phase, cost] of selection.phaseCost.entries()) {
      if (!phase) continue;
      phases.push({ title: phase, label: phase, lines: [], subtotal: cost });
    }
  }

  /**
   * The balance, as a note, and only when it says something.
   *
   * On an unpaid invoice the balance IS the total, and printing it twice
   * invites the reader to work out which of the two they owe.
   */
  const total = Number(invoice?.total_amount) || 0;
  const paid = Number(invoice?.paid_amount) || 0;
  const balance = Number.isFinite(Number(invoice?.balance_due))
    ? Number(invoice.balance_due)
    : round2(total - paid);

  const notes = [
    String(invoice?.notes || '').trim(),
    paid > 0 ? `Paid to date ${money(paid)}.  Balance due ${money(balance)}.` : '',
  ].filter(Boolean).join('\n\n');

  /**
   * An invoice stores its tax rate as a PERCENT (8.75); the layout prints a
   * FRACTION (0.0875 → "8.75%"). A quote stores the fraction. Neither is
   * wrong and the layout only reads one, so the conversion happens here
   * where it can be tested rather than inline where it cannot.
   */
  const storedRate = Number(invoice?.tax_rate);
  const taxRate = Number.isFinite(storedRate) && storedRate > 0 ? storedRate / 100 : undefined;

  return {
    heading: 'Invoice',
    number: String(invoice?.invoice_number || invoice?.invoice_id || ''),
    date: String(invoice?.issue_date || invoice?.createdAt || '').slice(0, 10),
    validUntil: invoice?.due_date ? String(invoice.due_date).slice(0, 10) : undefined,
    validUntilLabel: 'Due',
    status: String(invoice?.status || 'draft'),
    customer: {
      name: String(invoice?.customer_name || invoice?.customerName || ''),
      email: invoice?.customer_email || invoice?.customerEmail || undefined,
      phone: invoice?.customer_phone || undefined,
      address: invoice?.service_address || invoice?.customer_address || undefined,
    },
    job: {
      title: invoice?.project_title || invoice?.projectTitle || undefined,
      description: invoice?.project_description || undefined,
    },
    phases,
    showLines: selection.lines.length > 0,
    subtotal: Number(invoice?.subtotal) || 0,
    tax: Number(invoice?.tax_amount) || 0,
    taxRate,
    total,
    notes: notes || undefined,
    terms: invoice?.terms || undefined,
  };
}
