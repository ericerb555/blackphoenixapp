/**
 * What a quote comes to. One answer, for every screen that asks.
 *
 * WHY IT MOVED HERE
 *
 * It lived at `index.tsx:13135`, in a seventeen-thousand-line `.tsx` the test
 * runner cannot load — so the function deciding what goes on a CONTRACT was
 * one more piece of money arithmetic that could not be asserted. The same
 * reasoning that moved `quoteMargins`, `invoiceDraft` and `quoteCustomerPrice`
 * below this line applies to it, and it is imported by the browser now as well,
 * which the old home made impossible.
 *
 * THE ORDER IS THE WHOLE POINT, AND `total` IS NEAR THE END OF IT
 *
 * Quotes are stored as whatever screen built them, and the same figure has had
 * several names. `totalCost` is the one today's editor computes, persists and
 * recomputes on every edit. `total` is a legacy field that nothing recalculates
 * — it is written once and then drifts as the lines change.
 *
 * MEASURED 2026-11-11, on the three priced quotes in production:
 *
 *   Q-2026-0002   totalCost 12,978.98   total 11,193.40
 *   Q-2026-0003   totalCost 18,954.13   total 24,978.17
 *   Q-2026-0004   totalCost 11,508.66   total 11,301.55
 *
 * Every `totalCost` reconciled with its own line items. Not one `total` did.
 * Q-2026-0003's was six thousand dollars over the quote, and
 * `handleConvertToContract` read `total || grandTotal || totalCost` — so
 * converting that quote would have written a contract for $24,978.17 against a
 * job quoted at $18,954.13, with nothing on screen saying so.
 *
 * So `total` stays in the list, because a quote old enough to have only that
 * field must still yield a number rather than a null, and it goes AFTER every
 * field that is maintained.
 *
 * `agreedTotal` goes first and ahead even of `totalCost`: it is what the
 * customer signed for, stamped at the moment they signed, and a later reprice
 * must not raise the price of a job already agreed.
 *
 * RETURNS NULL WHEN THERE IS NOTHING TO WORK FROM. A caller that gets null
 * must refuse rather than substitute zero — a contract for nothing and a
 * contract nobody priced are different, and only one of them is safe to send.
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

export function quoteTotal(quote: any): number | null {
  const named = [
    /* Signed for. Nothing below may override it. */
    quote?.agreedTotal,
    /* Maintained: recomputed by the editor on every edit. */
    quote?.totalCost, quote?.total_amount, quote?.totalAmount,
    /* Legacy, and unmaintained. Only reached when nothing above exists. */
    quote?.grandTotal, quote?.total, quote?.quoteTotal,
  ];
  for (const v of named) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return round2(n);
  }

  /*
   * No stored total at all: add the parts up, which is the same arithmetic
   * the quote screen does. A quote with subtotals and no total still yields a
   * number rather than a null.
   */
  const parts = [quote?.materialsSubtotal, quote?.laborSubtotal, quote?.taxAmount]
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n));
  if (parts.length) {
    const summed = parts.reduce((a, b) => a + b, 0);
    if (summed > 0) return round2(summed);
  }

  return null;
}

/**
 * The same answer, as a number, for callers with somewhere sensible to fall
 * back to — a schedule apportioning nothing, a card showing a dash.
 *
 * Separate rather than a default parameter so that the callers who MUST refuse
 * on null keep having to say so out loud.
 */
export function quoteTotalOr(quote: any, fallback = 0): number {
  const value = quoteTotal(quote);
  return value === null ? fallback : value;
}
