/**
 * What a quote adds up to, and how it maps onto the PDF payload.
 *
 * WHY THIS IS A .ts AND NOT PART OF THE COMPONENT
 *
 * It decides money, and the test runner strips types from `.ts` only — logic
 * living in a `.tsx` cannot be checked by hand. That is the same reason
 * `aiCeiling.ts` was split out of `aiSpend.ts`, and the same class of rule:
 * anything producing a figure a customer is shown should be testable.
 *
 * WHY THE PDF MAPPING LIVES HERE TOO
 *
 * So there is exactly ONE reading of a stored quote. Split between the
 * component and the PDF service, the preview and the printout drift, and a
 * customer ends up holding paper whose total disagrees with the screen it came
 * from.
 */

export interface QuoteLine {
  id?: string;
  description?: string;
  qty?: number;
  rate?: number;
  /** A credit subtracts. See `signed`. */
  kind?: 'charge' | 'credit';
  reason?: string;
  taxable?: boolean;
}

export interface QuoteDoc {
  id?: string;
  number?: string;
  type?: string;
  status?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  issueDate?: string;
  dueDate?: string;
  items?: QuoteLine[] | null;
  notes?: string;
  taxRate?: number;
  total?: number;
  signature?: any;
  createdAt?: string;
}

export const formatDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

export const money = (amount: number) =>
  `$${(Number(amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const lineAmount = (line: QuoteLine) => (Number(line.qty) || 0) * (Number(line.rate) || 0);

/**
 * A credit is recognised by its FLAG, never by a negative rate.
 *
 * The record models it that way on purpose: `-1240` and a fat-fingered `1240`
 * look identical on a screen a year later, while "credit" reads as what it is.
 * So every sum has to honour the flag rather than the sign.
 */
export const isCredit = (line: QuoteLine) => line.kind === 'credit';

export const signed = (line: QuoteLine) => (isCredit(line) ? -lineAmount(line) : lineAmount(line));

const lines = (doc: QuoteDoc): QuoteLine[] => (Array.isArray(doc.items) ? doc.items : []);

/**
 * Totals are recomputed from the lines rather than trusting a stored `total`.
 *
 * A stored figure and a list of lines that disagree is a document arguing with
 * itself in front of a customer, and the lines are the half they can check.
 */
export function quoteTotals(doc: QuoteDoc) {
  const items = lines(doc);
  const subtotal = items.reduce((sum, line) => sum + signed(line), 0);
  const taxableBase = items
    .filter((line) => line.taxable !== false)
    .reduce((sum, line) => sum + signed(line), 0);
  const tax = taxableBase * ((Number(doc.taxRate) || 0) / 100);
  return { subtotal, tax, total: subtotal + tax };
}

/**
 * The quote, as the PDF generator wants it.
 *
 * `subQuotes` are deliberately not mapped — they carry what the trade quoted
 * us and our markup. See the note at the top of `QuoteDocument.tsx`.
 */
export function quoteToPDFData(doc: QuoteDoc) {
  const items = lines(doc);
  const { subtotal, tax, total } = quoteTotals(doc);
  return {
    invoiceNumber: String(doc.number || doc.id || ''),
    date: formatDate(doc.issueDate) || formatDate(doc.createdAt) || '',
    dueDate: formatDate(doc.dueDate) || 'On acceptance',
    status: String(doc.status || 'draft'),
    customer: {
      name: String(doc.clientName || ''),
      email: String(doc.clientEmail || ''),
      phone: doc.clientPhone || undefined,
      address: doc.clientAddress || undefined,
    },
    items: items.map((line) => ({
      // The credit marker travels in the description, because the PDF table has
      // no column for it and a credit silently rendered as a charge shows the
      // customer the opposite of what was agreed.
      description: `${line.description || ''}${isCredit(line) ? '  (credit)' : ''}`,
      quantity: Number(line.qty) || 0,
      rate: Number(line.rate) || 0,
      amount: signed(line),
    })),
    subtotal,
    tax,
    total,
    notes: doc.notes || undefined,
  };
}
