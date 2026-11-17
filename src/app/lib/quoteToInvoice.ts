/**
 * quoteToInvoice — kept as the name every caller already imports.
 *
 * The implementation moved to `supabase/functions/server/quoteInvoiceLines.ts`
 * so the edge function can build the same lines when it keeps a quote's draft
 * invoice in sync. It moved rather than being copied for the obvious reason:
 * two functions deciding what a customer owes is how they come to disagree.
 *
 * This file stays because a dozen screens and three test files import
 * `quoteToInvoice`, and renaming them all to prove a point about directories
 * would be churn with a chance of a missed call site.
 */
export {
  invoiceLinesFromQuote,
  invoiceAmountFromQuote,
  type InvoiceLine,
  type QuoteLike,
  type QuoteLikeMaterial,
  type QuoteLikeLabor,
  type QuoteLikeCredit,
} from "../../../supabase/functions/server/quoteInvoiceLines.ts";
