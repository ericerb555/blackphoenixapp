/**
 * What may be refunded on a services payment, and what it does to the invoice.
 *
 * Eric: "build refunds for invoices and deposits."
 *
 * WHY THIS IS ITS OWN FILE
 *
 * `returns.tsx` already refunds STORE orders, and it is good. This is the other
 * half — invoices and deposits — and the arithmetic is the part that must not be
 * wrong, so it lives where `node --test` can reach it rather than inside a route
 * that needs Stripe and a database to exercise.
 *
 * THE TIP IS NOT THE COMPANY'S MONEY, AND THAT SHAPES EVERYTHING HERE
 *
 * A payment can carry a gratuity for the crew. It was charged as its own Stripe
 * line, it is recorded as owed to named people, and it is NOT part of what the
 * invoice was for. So:
 *
 *   · a partial refund comes out of the PRINCIPAL first and never silently
 *     touches the tip — refunding £50 of a £200 job must not quietly take £20
 *     off what two people are owed for carrying a sofa;
 *   · the tip is only refunded when somebody asks for it explicitly, or when
 *     the whole payment is being reversed;
 *   · and refunding the tip has to be reported separately, because a tip record
 *     marked "owed" has to stop being owed.
 *
 * NOTHING MAY BE REFUNDED TWICE
 *
 * Every refund is recorded against the payment and subtracted from what remains
 * refundable. The cap is the amount actually captured, not the invoice total — a
 * deposit of 30% can only ever give back that 30%.
 */

export interface RefundablePayment {
  /** What the invoice was paid toward. Never includes the tip. */
  amount?: number;
  /** The gratuity, charged as its own line. */
  tip?: number;
  /** Refunds already issued against this payment. */
  refunds?: Array<{ principal?: number; tip?: number }>;
  status?: string;
}

const money = (n: unknown): number => {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : 0;
};

const sum = (xs: number[]): number => Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100;

export interface Refundable {
  principal: number;
  tip: number;
  total: number;
  refundedPrincipal: number;
  refundedTip: number;
}

/** What is left to give back, principal and tip counted separately. */
export function refundableOf(payment: RefundablePayment): Refundable {
  const principalPaid = money(payment?.amount);
  const tipPaid = money(payment?.tip);
  const past = Array.isArray(payment?.refunds) ? payment.refunds : [];

  const refundedPrincipal = sum(past.map((r) => money(r?.principal)));
  const refundedTip = sum(past.map((r) => money(r?.tip)));

  const principal = Math.max(0, Math.round((principalPaid - refundedPrincipal) * 100) / 100);
  const tip = Math.max(0, Math.round((tipPaid - refundedTip) * 100) / 100);

  return {
    principal,
    tip,
    total: Math.round((principal + tip) * 100) / 100,
    refundedPrincipal,
    refundedTip,
  };
}

export interface RefundPlan {
  principal: number;
  tip: number;
  total: number;
  error?: string;
}

/**
 * How a requested refund is apportioned.
 *
 * `amount` absent means "everything still refundable". Otherwise the figure is
 * taken from the principal first; the tip is only reached when `includeTip` is
 * set, and even then only after the principal is exhausted.
 *
 * Refusing is better than guessing: asking for more than was captured is a
 * mistake somebody should see, not a figure to be quietly clamped. A clamped
 * refund looks like it worked and leaves the customer short.
 */
export function planRefund(
  payment: RefundablePayment,
  request: { amount?: number | null; includeTip?: boolean } = {},
): RefundPlan {
  const left = refundableOf(payment);

  if (String(payment?.status || '') !== 'paid') {
    return { principal: 0, tip: 0, total: 0, error: 'Only a captured payment can be refunded.' };
  }
  if (left.total <= 0) {
    return { principal: 0, tip: 0, total: 0, error: 'This payment has already been fully refunded.' };
  }

  // Everything left. The tip goes with it — reversing a payment in full and
  // leaving the gratuity charged would bill somebody for a tip on a job that
  // was refunded.
  if (request.amount === undefined || request.amount === null || request.amount === 0) {
    return { principal: left.principal, tip: left.tip, total: left.total };
  }

  const asked = money(request.amount);
  if (asked <= 0) {
    return { principal: 0, tip: 0, total: 0, error: 'A refund needs a positive amount.' };
  }

  const ceiling = request.includeTip ? left.total : left.principal;
  if (asked > ceiling) {
    return {
      principal: 0, tip: 0, total: 0,
      error: request.includeTip
        ? `That is more than remains refundable (${ceiling.toFixed(2)}).`
        : `That is more than the refundable job amount (${ceiling.toFixed(2)}). `
          + 'The gratuity is held separately; include it explicitly to refund it too.',
    };
  }

  const principal = Math.min(asked, left.principal);
  const tip = Math.round((asked - principal) * 100) / 100;
  return { principal, tip, total: Math.round((principal + tip) * 100) / 100 };
}

export interface InvoiceShape {
  total_amount?: number; total?: number;
  paid_amount?: number; paidAmount?: number;
  status?: string;
}

/**
 * The invoice, reopened by the principal that was given back.
 *
 * Only the principal moves it. A refunded gratuity is not money the invoice was
 * ever owed, so taking it off `paid_amount` would make a settled invoice look
 * underpaid and chase the customer for a tip they did not get back.
 *
 * Returns the fields to merge, in BOTH spellings, because this record is
 * written and read under `paid_amount` and `paidAmount` in different places and
 * updating one of them is how a balance starts disagreeing with itself.
 */
export function invoiceAfterRefund(
  invoice: InvoiceShape | null | undefined,
  refundedPrincipal: number,
): Record<string, unknown> | null {
  if (!invoice) return null;
  const back = money(refundedPrincipal);
  if (back <= 0) return null;

  const total = money(invoice.total_amount ?? invoice.total);
  const paidBefore = money(invoice.paid_amount ?? invoice.paidAmount);
  const paidAfter = Math.max(0, Math.round((paidBefore - back) * 100) / 100);
  const due = Math.max(0, Math.round((total - paidAfter) * 100) / 100);

  return {
    paid_amount: paidAfter,
    paidAmount: paidAfter,
    balance_due: due,
    balanceDue: due,
    /*
     * A fully refunded invoice goes back to `sent`, not to `draft`.
     *
     * It was issued and the customer saw it; pretending otherwise loses that.
     * Partly paid stays `partial`, and anything still covered stays `paid`.
     */
    status: paidAfter <= 0 ? 'sent' : paidAfter >= total ? 'paid' : 'partial',
    // Cleared so a reopened invoice does not read as settled on a date.
    paidAt: paidAfter >= total && total > 0 ? (invoice as any).paidAt ?? null : null,
  };
}
