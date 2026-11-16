/**
 * The 5% a customer gets for opening a free account, priced on the server.
 *
 * Eric, 2026-11-16: *"can we make sure that after someone gets a price through
 * the trash removal quote can you offer then an addition 5 percent off to
 * create an account"* — and then, on where it goes: *"add it to the price page
 * they see when they price something out and show the discount if they create
 * a free customer account."*
 *
 * WHY THIS IS NOT COMPUTED IN THE BROWSER
 *
 * `TrashEstimatePanel` says it of itself: *"It will not send a price. It sends
 * pictures; every figure on the way back was computed on the server from the
 * rate card."* A discounted figure is still a figure. Working it out in the
 * component would put a number the customer can edit next to one they cannot,
 * on the same screen, and the editable one is the one they would be quoting
 * back at us. So the offer arrives from the server already priced, the same way
 * the estimate does.
 *
 * It is also the mistake `discount-grants.tsx` was written to undo. The module
 * it replaced read a discount percentage out of `localStorage`, which meant a
 * paying subscriber got nothing while anyone editing one browser value took
 * 15% off the margin. Putting this one in the browser would be walking back
 * into that.
 *
 * WHY DOLLARS AND NOT `discountCents`
 *
 * `discounts.ts` is the tested arithmetic for this and is the right thing to
 * reuse — but `discountCents` takes cents and rounds to a whole cent, while a
 * trash takeoff carries dollars rounded to two places (`round2`, trashTakeoff
 * .ts:208). Handing it dollars would round the discount to whole dollars and
 * quietly disagree with every other figure on the page. So the percentage is
 * applied in the estimate's own unit, and what is borrowed from `discounts.ts`
 * is the thing that actually matters: the cap.
 *
 * WHY THE CAP IS CHECKED HERE AT ALL
 *
 * Eric's rule is *"additive with a 20% cap"* on quoted work, and this grant is
 * additive with whatever else a customer holds. 5% cannot breach a 20% ceiling
 * on its own, so the assertion below can only fire if somebody raises this
 * constant — which is exactly when you want to be told, because the ceiling
 * lives in another file and the person raising a signup incentive is not
 * thinking about plan discounts.
 */
import { QUOTE_DISCOUNT_CAP_PERCENT } from "./discounts.ts";
import type { Band } from "./trashTakeoff.ts";

/** What opening a free customer account takes off a quoted job. */
export const SIGNUP_DISCOUNT_PERCENT = 5;

/** Two decimal places, as every other money figure in a takeoff carries. */
const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface SignupOffer {
  percent: number;
  /** The same band, discounted. Same shape as `cost`, so the page renders it the same way. */
  cost: Band<number>;
  /** What comes off the likely figure. Shown, because "5%" is not a number of dollars. */
  saves: number;
}

/**
 * Price the offer, or return null when there is nothing to offer.
 *
 * Null rather than a zeroed offer: a zero-dollar saving rendered as an
 * incentive reads as a bug to a customer, and a `needsSiteVisit` estimate is
 * not a price we are standing behind yet — discounting a figure we have
 * already said we want to re-check would be promising twice and meaning
 * neither.
 */
export function signupOfferFor(
  cost: Band<number> | null | undefined,
  opts: { needsSiteVisit?: boolean } = {},
): SignupOffer | null {
  if (SIGNUP_DISCOUNT_PERCENT > QUOTE_DISCOUNT_CAP_PERCENT) {
    throw new Error(
      `signup incentive of ${SIGNUP_DISCOUNT_PERCENT}% exceeds the ` +
      `${QUOTE_DISCOUNT_CAP_PERCENT}% cap on quoted work (discounts.ts)`,
    );
  }
  if (opts.needsSiteVisit) return null;

  const low = Number(cost?.low);
  const likely = Number(cost?.likely);
  const high = Number(cost?.high);
  if (![low, likely, high].every((n) => Number.isFinite(n) && n > 0)) return null;

  const keep = (1 - SIGNUP_DISCOUNT_PERCENT / 100);
  const offer: SignupOffer = {
    percent: SIGNUP_DISCOUNT_PERCENT,
    cost: { low: round2(low * keep), likely: round2(likely * keep), high: round2(high * keep) },
    saves: round2(likely - round2(likely * keep)),
  };
  /*
   * A dollar, not a cent, because of how the page prints it.
   *
   * `TrashEstimatePanel`'s `money()` rounds to whole dollars, so a saving of
   * forty cents renders as "save $0" — an incentive that reads as a broken
   * page. The threshold is the page's resolution rather than the arithmetic's,
   * since the arithmetic is not what the customer sees. Nothing is lost: a job
   * where 5% is under a dollar is below the call-out minimum anyway.
   */
  return offer.saves >= 1 ? offer : null;
}
