/**
 * What a deposit on a QUOTE is, decided here and nowhere else.
 *
 * Eric: "creat checkout sessions on our server with prices from our database.
 * move all stripe session creation to server endpoint that ignores any price
 * the front end sends."
 *
 * NAMED `quoteDepositPrice`, NOT `depositMath`
 *
 * `depositMath.ts` already exists and is about a completely different deposit —
 * a tenant's security deposit, settled against damage after a tenancy. Two
 * files called deposit-something is how somebody imports the wrong one while
 * working on money, so this one says which deposit it prices.
 *
 * WHAT WAS WRONG, AND IT WAS NOT SUBTLE
 *
 * Two screens computed a deposit in the browser and posted the figure:
 *
 *   CustomerPortalView     amount: Math.round((quote.amount || quote.total) * 0.30)
 *   CustomerQuoteApproval  amount: depositAmount
 *
 * Neither carried an `invoiceId`, so `payments/create-checkout` fell through to
 * a branch that charged whatever arrived. A customer with the developer tools
 * open could have paid a one-dollar deposit on a ten-thousand-dollar job, and
 * the payment record would have looked entirely ordinary afterwards.
 *
 * THE SCHEDULE WINS OVER A PERCENTAGE
 *
 * A quote may carry its own `paymentSchedule` with an explicit deposit draw —
 * that is the figure the customer was SHOWN, and it is the one to charge. The
 * percentage is only the fallback for quotes without a schedule.
 *
 * That matters beyond tidiness: `CustomerQuoteApproval` already carries a note
 * about the button and the schedule disagreeing, because the button read
 * `totalCost * 0.30` while the schedule was computed from the discounted total.
 * Reading the schedule first makes them agree by construction.
 *
 * AND THE TOTAL IS THE AGREED ONE
 *
 * `quoteTotal` resolves that properly already — `agreedTotal` ahead of
 * `totalCost`, with its own long explanation of why those field names disagree.
 * This defers to it rather than re-deciding, because two answers to "what does
 * this quote cost" is how a subscriber gets charged a deposit on a price they
 * were told they were not paying.
 */

import { quoteTotal } from './quoteTotal.ts';

/** The same 30% the portal and the approval page display. */
export const QUOTE_DEPOSIT_RATE = 0.30;

export interface QuoteDeposit {
  amount: number;
  /** Where the figure came from, for the payment record and for an argument. */
  basis: 'schedule' | 'percentage';
  error?: string;
}

const money = (n: unknown): number => {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : 0;
};

/**
 * The deposit to charge on this quote.
 *
 * Returns an error rather than a guess where the quote cannot be priced. A
 * quote with no resolvable total is one nobody should be taking money against
 * — the rule `/store/checkout` already states, that an item which cannot be
 * priced is refused rather than sold at the price the browser suggested.
 */
export function quoteDepositPrice(quote: any): QuoteDeposit {
  if (!quote || typeof quote !== 'object') {
    return { amount: 0, basis: 'percentage', error: 'That quote could not be found.' };
  }

  /*
   * An explicit deposit draw, if the quote has one and it is not already paid.
   *
   * Excluding `paid` matters: otherwise reloading the approval page would offer
   * a deposit that has already been taken.
   */
  const schedule = Array.isArray(quote.paymentSchedule) ? quote.paymentSchedule : [];
  const draw = schedule.find(
    (d: any) => String(d?.type) === 'deposit' && String(d?.status || 'pending') !== 'paid',
  );
  if (draw) {
    const fromSchedule = money(draw.amount);
    if (fromSchedule > 0) return { amount: fromSchedule, basis: 'schedule' };
    /*
     * A deposit draw of zero is a deliberate "no deposit on this job", not a
     * reason to fall back to 30% and charge one anyway.
     */
    return {
      amount: 0,
      basis: 'schedule',
      error: "This quote's payment schedule does not ask for a deposit.",
    };
  }

  const total = quoteTotal(quote);
  if (total === null || money(total) <= 0) {
    return {
      amount: 0,
      basis: 'percentage',
      error: 'This quote has no priced total, so a deposit cannot be calculated.',
    };
  }

  return {
    amount: Math.round(money(total) * QUOTE_DEPOSIT_RATE * 100) / 100,
    basis: 'percentage',
  };
}
