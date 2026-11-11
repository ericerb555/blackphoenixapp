/**
 * What an invoice record is, and what it adds up to.
 *
 * WHY THIS IS ITS OWN FILE
 *
 * This arithmetic lived inside the `POST /invoices` handler in index.tsx — a
 * `.tsx` of thirteen thousand lines that the test runner cannot load. So the
 * one calculation on this platform that decides what a customer is asked to
 * pay was the one calculation that could not be tested, and it stayed that way
 * while a comment above it explained that an invoice which does not add up is
 * not an invoice.
 *
 * It moved because the assistant can now propose an invoice. The alternative
 * was a second implementation of the same sum, and a second implementation is
 * how one of them ends up charging tax on a discount while the other does not.
 * One copy, two callers, tests.
 *
 * THE RULE IT ENCODES: THE LINE ITEMS WIN.
 *
 * Subtotal, tax and total are all derived here. A caller may post a
 * `total_amount` and it is ignored for anything but a warning — a screen that
 * sends a stale total after an edit is enough to store an invoice reading $50
 * while showing $500 of lines, and the customer is the one who spots it.
 */

export interface InvoiceLineItem {
  description?: string;
  quantity: number;
  unit_price: number;
  amount: number;
  line_number: number;
  [key: string]: unknown;
}

export interface InvoiceRecipient {
  customerEmail: string;
  customerName: string;
  recipientPortal: unknown;
  paymentRail: unknown;
}

export interface BuiltInvoice {
  record: Record<string, unknown>;
  /** Set when the caller's own total disagreed with its line items. */
  postedTotalIgnored: number | null;
}

/** Money, to the cent, and never NaN. */
export const money = (n: unknown): number => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : 0;
};

/**
 * Line items, normalised.
 *
 * `amount` is taken when given and derived from quantity × price when not,
 * because both shapes arrive: the invoice screen sends amounts, and anything
 * composing an invoice from a description sends quantities.
 */
export function normaliseLineItems(raw: unknown): InvoiceLineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: any, index: number) => {
    const quantity = Number(item?.quantity || 0);
    const unitPrice = Number(item?.unit_price ?? item?.unitPrice ?? 0);
    const amount = Number(item?.amount ?? quantity * unitPrice);
    return {
      ...item,
      line_number: item?.line_number || index + 1,
      quantity,
      unit_price: unitPrice,
      amount: Number.isFinite(amount) ? amount : 0,
    };
  });
}

export interface InvoiceTotals {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;
}

/**
 * The sum. Rate and discount are inputs; the arithmetic they feed is ours.
 *
 * Tax is charged on the subtotal before the discount, which is how the invoice
 * screen has always computed it. Stated here because it is a real decision —
 * discounting after tax and discounting before it produce different invoices,
 * and the difference is the kind a customer notices.
 */
export function invoiceTotals(items: InvoiceLineItem[], body: any): InvoiceTotals {
  const subtotal = money(items.reduce((sum, item) => sum + item.amount, 0));
  const taxRate = Number(body?.tax_rate || 0);
  const taxAmount = money(subtotal * (taxRate / 100));
  const discount = money(body?.discount_amount || 0);
  const total = money(subtotal + taxAmount - discount);
  return { subtotal, taxRate, taxAmount, discount, total };
}

/**
 * The invoice number, when the caller has not supplied one.
 *
 * Date plus a slice of the id: sortable, unique enough, and legible on a
 * printed invoice. Deliberately not a counter — a counter needs a lock, and
 * two invoices racing for number 41 is a worse problem than a number with a
 * gap in it.
 */
export function invoiceNumberFor(id: string, nowIso: string): string {
  return `INV-${nowIso.slice(0, 10).replaceAll('-', '')}-${id.slice(0, 6).toUpperCase()}`;
}

/**
 * Build the record. No database, no side effects.
 *
 * A draft is forced when there is no recipient email, because an invoice with
 * nobody to send it to cannot be issued — and silently storing it as `pending`
 * would put it in the chase-the-customer pile for a customer who does not
 * exist on it.
 */
export function buildInvoiceRecord(
  body: any,
  opts: { recipient: InvoiceRecipient; createdBy: string; id?: string; now?: string },
): BuiltInvoice {
  const id = String(opts.id || body?.id || crypto.randomUUID());
  const now = opts.now || new Date().toISOString();
  const { recipient } = opts;

  const lineItems = normaliseLineItems(body?.line_items);
  const { subtotal, taxRate, taxAmount, discount, total } = invoiceTotals(lineItems, body);

  const postedTotal = body?.total_amount === undefined ? null : money(body.total_amount);
  const postedTotalIgnored =
    postedTotal !== null && Math.abs(postedTotal - total) > 0.01 ? postedTotal : null;

  const requestedDraft = body?.is_draft ?? body?.status === 'draft';
  const isDraft = Boolean(requestedDraft) || !recipient.customerEmail;
  const status = isDraft ? 'draft' : (body?.status && body.status !== 'draft' ? body.status : 'pending');
  const invoiceNumber = body?.invoice_number || body?.invoice_id || invoiceNumberFor(id, now);
  const paidAmount = money(body?.paid_amount || 0);

  return {
    postedTotalIgnored,
    record: {
      ...body,
      id,
      invoice_id: body?.invoice_id || invoiceNumber,
      invoice_number: invoiceNumber,
      // Both spellings of every recipient field, because the screens and the
      // portals disagree about which they read and a missing one renders as
      // an invoice addressed to nobody.
      customerEmail: recipient.customerEmail,
      customer_email: recipient.customerEmail,
      customerName: recipient.customerName,
      customer_name: recipient.customerName,
      clientEmail: recipient.customerEmail,
      client_email: recipient.customerEmail,
      recipientPortal: recipient.recipientPortal,
      recipient_portal: recipient.recipientPortal,
      paymentRail: recipient.paymentRail,
      payment_rail: recipient.paymentRail,
      line_items: lineItems,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      discount_amount: discount,
      total_amount: total,
      paid_amount: paidAmount,
      balance_due: money(total - paidAmount),
      status,
      is_draft: isDraft,
      issuedAt: isDraft ? null : now,
      createdAt: body?.createdAt || now,
      updatedAt: now,
      createdBy: opts.createdBy,
    },
  };
}
