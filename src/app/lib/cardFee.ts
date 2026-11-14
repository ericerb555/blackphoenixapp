/**
 * The card processing fee, and the sentence that goes with it.
 *
 * Eric: *"add a disclaimer that 3percent will be added when using a card to
 * process payment checks and cash are accepted as well."*
 *
 * WHY THIS IS A MODULE AND NOT A LINE OF JSX
 *
 * Because a disclaimer and an arithmetic have to agree, and today proved what
 * happens when they do not. A notice reading "3% will be added" above a total
 * that does not include it tells the customer something untrue; adding 3% to
 * a total without a line saying so is a surprise charge on a card statement.
 * Both are the same failure — the page saying one thing and the money doing
 * another — so the fee, the line it prints, and the words that explain it all
 * come from here.
 *
 * WHAT THE FEE IS CHARGED ON
 *
 * The whole transaction: goods, shipping and tax. That is what a processor
 * charges a percentage of, so it is what the surcharge has to recover. Taking
 * 3% of the goods alone would under-recover on every order that ships.
 *
 * ROUNDED TO THE CENT, ONCE, at the point the figure is produced. A fee
 * computed to four decimals and rendered to two is a total that does not add
 * up by a penny, which is the complaint this codebase has spent a week on.
 */

/**
 * The surcharge rate.
 *
 * Card network rules cap a surcharge at the merchant's actual cost of
 * acceptance — commonly around 3% and never more than 4% — so this is a
 * ceiling as well as a price. If the real processing cost ever falls below
 * it, this has to come down with it.
 */
export const CARD_FEE_RATE = 0.03;

/** Payment methods that carry the fee. */
export const SURCHARGED_METHODS = ['card'] as const;

/** Methods that do not, and that the notice names so a customer can choose. */
export const FEE_FREE_METHODS = ['cash', 'check', 'ach'] as const;

export type FeeMethod = string;

/** Does this payment method carry the surcharge? */
export function methodIsSurcharged(method: FeeMethod | null | undefined): boolean {
  return (SURCHARGED_METHODS as readonly string[]).includes(String(method ?? ''));
}

/**
 * The fee on a transaction, in whole cents.
 *
 * Zero for a method that does not carry it, and zero rather than a negative
 * for nonsense input: a fee is something added, and a "negative fee" on a
 * checkout screen is a discount nobody authorised.
 */
export function cardFeeFor(
  amount: number | null | undefined,
  method: FeeMethod | null | undefined,
): number {
  if (!methodIsSurcharged(method)) return 0;
  const base = Number(amount);
  if (!Number.isFinite(base) || base <= 0) return 0;
  return Math.round(base * CARD_FEE_RATE * 100) / 100;
}

/** `3%`, for putting in a sentence without hard-coding it twice. */
export const CARD_FEE_LABEL = `${(CARD_FEE_RATE * 100).toFixed(0)}%`;

/**
 * The line that appears in a price breakdown.
 *
 * Says "credit card" rather than "card" deliberately — see the note on
 * `CARD_FEE_NOTICE`.
 */
export const CARD_FEE_LINE = `Credit card processing fee (${CARD_FEE_LABEL})`;

/**
 * The disclaimer.
 *
 * IT NAMES THE ALTERNATIVES, which is the half that makes it fair rather
 * than merely disclosed. A customer told there is a fee and not told how to
 * avoid it has been informed of a charge; a customer told cash and check are
 * accepted has been given a choice.
 *
 * "CREDIT CARD", NOT "CARD", AND THIS IS NOT A WORDING PREFERENCE.
 * Surcharging a DEBIT card is prohibited by federal law — the Durbin
 * Amendment and Regulation II — regardless of state. Credit card surcharging
 * is legal in New Hampshire, capped at the cost of acceptance, and must be
 * disclosed before the customer commits, which is what this is for.
 *
 * The checkout's own payment option is currently labelled "Credit/Debit
 * Card" and cannot tell which it is until the number is entered, so the
 * wording here is the narrower, lawful claim. Flagged for Eric: if debit is
 * to be accepted without the fee, the payment step has to separate them.
 */
export const CARD_FEE_NOTICE =
  `A ${CARD_FEE_LABEL} processing fee is added to credit card payments. `
  + 'Cash and check are accepted with no fee.';

/** The same thing in one short line, where space is tight. */
export const CARD_FEE_NOTICE_SHORT =
  `${CARD_FEE_LABEL} fee on credit cards · no fee for cash or check`;
