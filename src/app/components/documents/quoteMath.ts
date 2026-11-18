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

/**
 * WHAT A STORED LINE ACTUALLY LOOKS LIKE.
 *
 * This read `qty * rate` and nothing else. No quote in the database has ever
 * had either field: materials store `quantity` and `unitCost`, labour stores
 * `hours` and `hourlyRate`, and both carry an authoritative `totalCost`. So
 * every line of every quote computed to zero, and because `quoteTotals` sums
 * the same function, the footer agreed — a document showing $0.00 against
 * each line under a $0.00 total, which is internally consistent and entirely
 * wrong. Confirmed against all nine stored quotes on 2026-11-14.
 *
 * `qty`/`rate` are still read last, because they are the declared interface
 * and something may yet write them.
 */

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** How many of it — pieces, sheets, gallons, or hours. */
export const lineQty = (line: QuoteLine): number =>
  num((line as any)?.quantity ?? (line as any)?.hours ?? line?.qty);

/** What one of them costs. */
export const lineRate = (line: QuoteLine): number =>
  num((line as any)?.unitCost ?? (line as any)?.hourlyRate ?? line?.rate);

/**
 * What the line comes to.
 *
 * `totalCost` wins where it exists, because it is not always quantity times
 * rate: a waste factor lives in the stored figure and not in the unit price,
 * so two gallons at $60 can legitimately come to $126. `quotePdfSelection`
 * resolves it the same way, which is what keeps this screen and the printed
 * PDF showing one set of numbers.
 */
export const lineAmount = (line: QuoteLine): number => {
  const stored = num((line as any)?.totalCost);
  if (stored > 0) return stored;
  return lineQty(line) * lineRate(line);
};

/**
 * A credit is recognised by its FLAG, never by a negative rate.
 *
 * The record models it that way on purpose: `-1240` and a fat-fingered `1240`
 * look identical on a screen a year later, while "credit" reads as what it is.
 * So every sum has to honour the flag rather than the sign.
 */
export const isCredit = (line: QuoteLine) => line.kind === 'credit';

export const signed = (line: QuoteLine) => (isCredit(line) ? -lineAmount(line) : lineAmount(line));

/**
 * The lines this document is actually made of.
 *
 * An estimator quote keeps them in `materials` and `labor`; a hand-built one
 * keeps them in `items`. Three of the nine stored quotes have BOTH, and on
 * those the `items` array is a stale copy left behind by an earlier save —
 * Q-2026-0002 carries 2x4s at $3.75 in `items` against $4.38 in `materials`,
 * a month apart.
 *
 * So materials and labour win where they exist, and the stored subtotals are
 * what settles it rather than a guess: on all three, `materialsSubtotal` and
 * `laborSubtotal` reconcile with those arrays and not with `items`.
 */
export const quoteLines = (doc: QuoteDoc): QuoteLine[] => lines(doc);

const lines = (doc: QuoteDoc): QuoteLine[] => {
  const materials = Array.isArray((doc as any)?.materials) ? (doc as any).materials : [];
  const labour = Array.isArray((doc as any)?.labor) ? (doc as any).labor : [];
  if (materials.length || labour.length) return [...materials, ...labour] as QuoteLine[];
  return Array.isArray(doc.items) ? doc.items : [];
};

/**
 * What to call the line.
 *
 * Materials carry a `name` and a `description` that are often both set and
 * say nearly the same thing; labour carries a `role`. Reading only
 * `description` left labour rows blank on screen.
 */
export const lineLabel = (line: QuoteLine): string =>
  String((line as any)?.name || line?.description || (line as any)?.role || '').trim() || '—';

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
 * THE quote total. One figure, one reader, so nothing can show a different
 * one to anybody.
 *
 * Eric, 2026-11-18, on Jason's quote: *"the view pdf should be created from
 * the quote editor and only show what i allow with correct totalls"* — and,
 * asked which of the two totals that quote carried was the real one,
 * *"14.435.81"*.
 *
 * WHAT WAS WRONG, WITH THE NUMBERS
 *
 * `quote:qt-1794354942724` stored BOTH:
 *
 *     totalCost  14435.81   ← the PDF and the estimate email
 *     total      13359.79   ← the customer portal and the draft list
 *
 * Tax on that quote is zero, so those two should be identical. They differ by
 * $1,076.02, and nothing kept them in step: one was written and the other
 * recomputed later. Across every other quote in the system the pair agrees,
 * which is why this read as intermittent rather than as a bug.
 *
 * The lines were never the problem. Materials 2,943.20 and labour 6,917.50
 * are raw COST, scaled up by the markup to reach the printed total — that
 * machinery works. It was reaching the wrong target.
 *
 * WHY `totalCost` WINS
 *
 * Because Eric said so, and because it is the figure the PDF and the estimate
 * email have been quoting to customers. Making the portal agree with the
 * document the customer was sent is the direction that cannot surprise
 * anybody.
 *
 * `total` stays as the fallback for older quotes that never had `totalCost` —
 * removing it would zero their value rather than fix anything.
 */
export const quoteTotalOf = (doc: any): number =>
  Number(doc?.totalCost) || Number(doc?.total) || 0;

/**
 * Do the two stored totals disagree? Null when there is nothing to compare.
 *
 * Exported so a screen can SAY "this quote carries two totals" rather than
 * silently picking one, and so the test can assert the live shapes.
 */
export const totalsDisagreeBy = (doc: any): number | null => {
  const a = Number(doc?.totalCost);
  const b = Number(doc?.total);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === 0 || b === 0) return null;
  const gap = Math.round((a - b) * 100) / 100;
  return gap === 0 ? null : gap;
};

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
