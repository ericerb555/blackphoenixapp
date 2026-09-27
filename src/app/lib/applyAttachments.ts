/**
 * applyAttachments — what a bill comes to once everything is applied to it.
 *
 * THE ORDER, AND WHY IT IS THIS ONE
 *
 * Percentages first, against the subtotal. Then money the customer already
 * holds — gift cards and banked hours — against what is left.
 *
 * The other order is tempting and wrong. Applying a gift card first and then a
 * ten percent discount discounts the customer's own money: they would hand over
 * a hundred pounds of card and be "given" ten pounds off it. A discount is
 * something the company gives on its price; a card is the customer paying. The
 * price has to be settled before anybody pays it.
 *
 * TOTAL VERSUS BALANCE
 *
 * A discount changes the TOTAL — what is owed. A card or an hour changes the
 * BALANCE — what is left to pay, with the total untouched. That distinction is
 * kept all the way through because the invoice a customer was sent must keep
 * saying what it said. Quietly rewriting an agreed figure because somebody paid
 * part of it with a card is how records stop matching conversations.
 *
 * TAX FOLLOWS THE DISCOUNT
 *
 * A discount reduces the price, so it reduces the tax on that price. The
 * taxable base is discounted by the same proportion rather than the tax being
 * left alone, because tax on a price nobody paid is tax nobody owes. Credits do
 * NOT touch the tax: paying with a card does not change what was sold.
 *
 * NOTHING IS OVER-APPLIED
 *
 * Credits are capped at what is actually owed, and what could not be used is
 * reported rather than swallowed. A card worth more than the bill keeps the
 * difference, and an hour not needed stays on the plan — which is the whole
 * point of saying how much of each was consumed rather than just marking them
 * used.
 */

export type Attachment =
  | { kind: 'grant' | 'promotion'; id?: string; label?: string; percent: number }
  | { kind: 'giftcard'; id?: string; label?: string; code?: string; amount: number }
  | { kind: 'hours'; id?: string; label?: string; planId?: string; hours: number; rate: number }
  | { kind: 'addon'; id?: string; label?: string; percent?: number; amount?: number };

export interface AttachmentInput {
  /** The lines added up, before tax and before anything is applied. */
  subtotal: number;
  /** The part of the subtotal that carries tax. Materials, in this business. */
  taxableBase?: number;
  /** As a fraction: 0.08, not 8. */
  taxRate?: number;
  attachments: Attachment[];
  /** The most any combination of percentages may come to. */
  capPercent?: number;
  /** Already settled against this invoice before any of this. */
  alreadyPaid?: number;
}

export interface AppliedCredit {
  kind: 'giftcard' | 'hours';
  id?: string;
  label?: string;
  /** Money this credit actually covered. */
  used: number;
  /** What it could have covered but was not needed. */
  unused: number;
  /** For hours: how many were actually consumed, so the ledger deducts only those. */
  hoursUsed?: number;
}

export interface AppliedResult {
  /** After the cap. */
  discountPercent: number;
  /** What the percentages added up to before the cap bit. */
  requestedPercent: number;
  capped: boolean;
  discountAmount: number;
  taxAmount: number;
  /** What is owed, after discount and tax. */
  total: number;
  credits: AppliedCredit[];
  creditTotal: number;
  /** What is left to pay. */
  balanceDue: number;
}

const round = (n: number) => Math.round(n * 100) / 100;

const num = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export function applyAttachments(input: AttachmentInput): AppliedResult {
  const subtotal = round(num(input.subtotal));
  const taxRate = num(input.taxRate);
  const attachments = input.attachments || [];

  /**
   * The taxable part defaults to the whole subtotal.
   *
   * Passing nothing means "everything here is taxable", which is the safe
   * default: assuming the opposite would under-charge tax on a bill whose
   * caller simply did not say.
   */
  const taxableBase = input.taxableBase === undefined ? subtotal : round(num(input.taxableBase));

  /* ── percentages, added then capped ────────────────────────────────────── */
  const requestedPercent = round(
    attachments.reduce((sum, a) => {
      if (a.kind === 'grant' || a.kind === 'promotion') return sum + num(a.percent);
      if (a.kind === 'addon') return sum + num(a.percent);
      return sum;
    }, 0),
  );

  const cap = input.capPercent === undefined ? 100 : num(input.capPercent);
  const discountPercent = round(Math.max(0, Math.min(requestedPercent, cap)));
  const capped = requestedPercent > cap;

  const discountAmount = round(subtotal * (discountPercent / 100));

  /**
   * Tax on what is actually being charged.
   *
   * The taxable base is reduced in the same proportion as the price, so a ten
   * percent discount is ten percent less tax. Leaving the tax alone would
   * charge tax on money nobody paid.
   */
  const discountedTaxable = Math.max(0, round(taxableBase * (1 - discountPercent / 100)));
  const taxAmount = round(discountedTaxable * taxRate);

  const total = round(subtotal - discountAmount + taxAmount);

  /* ── money already held, against what is left ──────────────────────────── */
  const alreadyPaid = round(num(input.alreadyPaid));
  let owing = Math.max(0, round(total - alreadyPaid));

  const credits: AppliedCredit[] = [];

  for (const a of attachments) {
    if (a.kind === 'giftcard') {
      const worth = round(Math.max(0, num(a.amount)));
      const used = round(Math.min(worth, owing));
      owing = round(owing - used);
      credits.push({ kind: 'giftcard', id: a.id ?? a.code, label: a.label, used, unused: round(worth - used) });
      continue;
    }

    if (a.kind === 'hours') {
      const hours = Math.max(0, num(a.hours));
      const rate = Math.max(0, num(a.rate));
      const worth = round(hours * rate);
      const used = round(Math.min(worth, owing));
      /**
       * Only the hours actually needed are consumed.
       *
       * Ten hours against a forty pound balance should not spend ten hours. The
       * consumed figure is what the ledger deducts, so the rest stays on the
       * plan where the customer can still use it.
       */
      const hoursUsed = rate > 0 ? round(used / rate) : 0;
      owing = round(owing - used);
      credits.push({
        kind: 'hours', id: a.id ?? a.planId, label: a.label,
        used, unused: round(worth - used), hoursUsed,
      });
      continue;
    }

    if (a.kind === 'addon' && a.amount) {
      const worth = round(Math.max(0, num(a.amount)));
      const used = round(Math.min(worth, owing));
      owing = round(owing - used);
      credits.push({ kind: 'giftcard', id: a.id, label: a.label, used, unused: round(worth - used) });
    }
  }

  const creditTotal = round(credits.reduce((sum, c) => sum + c.used, 0));

  return {
    discountPercent,
    requestedPercent,
    capped,
    discountAmount,
    taxAmount,
    total,
    credits,
    creditTotal,
    balanceDue: Math.max(0, round(total - alreadyPaid - creditTotal)),
  };
}
