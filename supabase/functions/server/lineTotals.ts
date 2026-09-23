/**
 * lineTotals — what a quote or an invoice adds up to, credits included.
 *
 * WHY CREDITS EXIST
 *
 * Eric's case: the homeowner buys their own flooring and we install it. They
 * have already paid for the material, so the invoice has to give it back to
 * them — visibly, as a line somebody can read — and take it off the total.
 *
 * "Visibly" is the requirement that shapes this. A credit could be done by
 * quietly reducing a charge, and then nobody can see what was allowed or why,
 * and next year nobody can answer why that floor was priced differently from
 * every other floor. So a credit is its own line with its own description, and
 * it is recorded rather than netted away.
 *
 * WHY A CREDIT STORES A POSITIVE NUMBER
 *
 * Because a negative one is a typo waiting to happen. `-1240` in a rate field
 * is indistinguishable from a fat-fingered `1240` until the total comes out
 * wrong, and on a quote that has already gone to a customer it is worse than
 * wrong. So the AMOUNT is always positive and the KIND decides the sign. A
 * credit cannot be created by accident, and a charge cannot become one.
 *
 * WHY TAX IS CHARGED ON THE NET
 *
 * Because we did not sell them the flooring. Taxing the gross and then
 * crediting the material would charge them tax on somebody else's sale. The
 * credit reduces the taxable base, which is the same answer as never having
 * billed the material in the first place — which is what actually happened.
 */

export type LineKind = 'charge' | 'credit';

export interface MoneyLine {
  id?: string;
  description?: string;
  /** Always positive. `kind` decides whether it adds or subtracts. */
  qty?: number;
  rate?: number;
  kind?: LineKind;
  /** Free text for a credit: "supplied own flooring — Home Depot receipt". */
  reason?: string;
}

export interface Totals {
  /** What the work comes to before anything is given back. */
  charges: number;
  /** What is being given back, as a positive number. */
  credits: number;
  /** charges − credits. */
  subtotal: number;
  taxRatePercent: number;
  tax: number;
  total: number;
  /**
   * True when the credits exceed the charges.
   *
   * Not clamped to zero, because clamping hides it. An invoice that comes out
   * negative is a real situation — we owe them — and it needs to be seen and
   * decided about rather than silently rounded up to nothing owed.
   */
  inCustomersFavour: boolean;
}

/** Cents, so a chain of percentages cannot drift a penny at a time. */
const cents = (v: unknown) => Math.round((Number(v) || 0) * 100);
const money = (c: number) => Math.round(c) / 100;

export function isCredit(line: MoneyLine | null | undefined): boolean {
  return String(line?.kind || 'charge') === 'credit';
}

/**
 * One line's contribution to the subtotal, signed.
 *
 * The magnitude is always taken as positive before the sign is applied, so a
 * negative rate typed into a charge cannot quietly become a credit — and a
 * negative rate typed into a credit cannot become a charge by cancelling out.
 */
export function lineAmountCents(line: MoneyLine | null | undefined): number {
  const qty = Math.abs(Number(line?.qty ?? 1) || 0);
  const rate = Math.abs(cents(line?.rate));
  const magnitude = Math.round(qty * rate);
  return isCredit(line) ? -magnitude : magnitude;
}

/** What one line reads as on the document, positive either way. */
export function lineDisplayCents(line: MoneyLine | null | undefined): number {
  return Math.abs(lineAmountCents(line));
}

/**
 * Add it all up.
 *
 * Tax is applied to the net subtotal — see the note at the top. A negative
 * subtotal produces a negative tax, which is correct: if we are giving back
 * more than we charged, we are giving back the tax on it too.
 */
export function totalsFor(
  lines: MoneyLine[] | null | undefined,
  taxRatePercent = 0,
): Totals {
  let chargeCents = 0;
  let creditCents = 0;

  for (const line of lines || []) {
    const amount = lineAmountCents(line);
    if (amount < 0) creditCents += -amount;
    else chargeCents += amount;
  }

  const rate = Number(taxRatePercent) || 0;
  const subtotalCents = chargeCents - creditCents;
  const taxCents = Math.round(subtotalCents * (rate / 100));

  return {
    charges: money(chargeCents),
    credits: money(creditCents),
    subtotal: money(subtotalCents),
    taxRatePercent: rate,
    tax: money(taxCents),
    total: money(subtotalCents + taxCents),
    inCustomersFavour: subtotalCents + taxCents < 0,
  };
}

/**
 * What to actually charge a card.
 *
 * Stripe has no concept of a negative line item, so a document with credits on
 * it is sent as ONE net amount. Netting here rather than at each payment route
 * means no route has to remember that rule — and a route that forgot it would
 * either be refused by Stripe or, worse, charge the gross.
 *
 * Zero or less is not payable. That is returned as zero with the flag above
 * rather than as a refusal, because the document is perfectly valid — there is
 * simply nothing to collect, and somebody has to decide what to do about the
 * balance.
 */
export function payableCents(totals: Totals): number {
  const c = cents(totals?.total);
  return c > 0 ? c : 0;
}
