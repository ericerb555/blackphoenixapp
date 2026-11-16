/**
 * The 5% shown for opening a free account.
 *
 * The figure on this page is an offer a customer will hold us to, so what
 * matters is not that 5% is subtracted — it is that the offer is absent in
 * every case where showing one would be a promise we have not made.
 *
 * TWO OF THESE ARE ABOUT NOT SHOWING A NUMBER
 *
 * `needsSiteVisit` means the estimate already says, on the same screen, that we
 * want to look at the job before we stand behind a price. Discounting that
 * figure would promise twice and mean neither, and the customer would quote the
 * discounted number back at us on the day. So the offer is withheld.
 *
 * A saving that rounds to nothing is withheld for a plainer reason: "save
 * $0.00 by creating an account" reads as a broken page, and the trust cost of
 * looking broken on a price is worse than the conversion lost on a job too
 * small to discount.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signupOfferFor, SIGNUP_DISCOUNT_PERCENT } from '../supabase/functions/server/signupIncentive.ts';
import { QUOTE_DISCOUNT_CAP_PERCENT } from '../supabase/functions/server/discounts.ts';

const band = (low: number, likely: number, high: number) => ({ low, likely, high });

test('the whole band is discounted, not just the headline', () => {
  // The page shows "range low – high" beside the likely figure. Discounting
  // only the middle one would put a discounted headline next to an
  // undiscounted range, which a reader resolves by trusting the bigger number.
  const offer = signupOfferFor(band(1000, 2000, 3000));
  assert.ok(offer);
  assert.equal(offer.cost.low, 950);
  assert.equal(offer.cost.likely, 1900);
  assert.equal(offer.cost.high, 2850);
});

test('the saving is the dollars off the likely figure', () => {
  // "5%" is not a number of dollars, and the saving is the thing that sells it.
  const offer = signupOfferFor(band(1000, 2000, 3000));
  assert.equal(offer?.saves, 100);
});

test('figures carry two decimal places, like every other money figure', () => {
  // A takeoff rounds to two places (trashTakeoff.ts round2). A discounted
  // figure with floating-point tails would be the only ragged number shown.
  const offer = signupOfferFor(band(333.33, 1234.57, 2000.01));
  assert.ok(offer);
  for (const n of [offer.cost.low, offer.cost.likely, offer.cost.high, offer.saves]) {
    assert.equal(n, Math.round(n * 100) / 100, `${n} has more than two decimal places`);
  }
  assert.equal(offer.cost.likely, 1172.84);
});

test('no offer when the estimate wants a site visit first', () => {
  assert.equal(signupOfferFor(band(1000, 2000, 3000), { needsSiteVisit: true }), null);
});

test('no offer when there is no priced band', () => {
  assert.equal(signupOfferFor(null), null);
  assert.equal(signupOfferFor(undefined), null);
  assert.equal(signupOfferFor(band(0, 0, 0)), null);
});

test('no offer on a band that is not fully priced', () => {
  // A partial band is a reader failure upstream, not a free job. Discounting
  // whatever did arrive would invent an offer from a broken estimate.
  assert.equal(signupOfferFor({ low: 100, likely: NaN, high: 300 } as any), null);
  assert.equal(signupOfferFor({ low: 100, high: 300 } as any), null);
  assert.equal(signupOfferFor(band(-50, -100, -200)), null);
});

test('no offer when the saving would print as $0', () => {
  // The panel's money() rounds to whole dollars, so the threshold is a dollar
  // of saving rather than a cent of it — "save $0" reads as a broken page.
  assert.equal(signupOfferFor(band(0.04, 0.04, 0.04)), null);
  assert.equal(signupOfferFor(band(10, 10, 10)), null, '5% of $10 is 50c, prints as $0');
  const smallest = signupOfferFor(band(20, 20, 20));
  assert.ok(smallest, '5% of $20 is a whole dollar and should show');
  assert.equal(smallest.saves, 1);
});

test('the incentive stays inside the cap on quoted work', () => {
  // Eric's rule is "additive with a 20% cap" on quote pricing. This grant is
  // additive with whatever else a customer holds, and the ceiling lives in
  // another file — so raising this constant past it must fail loudly here
  // rather than silently overrun the cap once it stacks.
  assert.ok(
    SIGNUP_DISCOUNT_PERCENT <= QUOTE_DISCOUNT_CAP_PERCENT,
    `${SIGNUP_DISCOUNT_PERCENT}% signup incentive exceeds the ${QUOTE_DISCOUNT_CAP_PERCENT}% quote cap`,
  );
  assert.equal(SIGNUP_DISCOUNT_PERCENT, 5);
});

test('the offer never costs more than the estimate', () => {
  // The direction of the arithmetic, asserted because a sign error here would
  // read as a surcharge for signing up.
  // Real takeoff shapes — a minimum call-out, a half-day, and a full container.
  for (const c of [band(180, 240, 320), band(99.99, 450.5, 1200), band(5000, 7500, 9000)]) {
    const offer = signupOfferFor(c)!;
    assert.ok(offer.cost.likely < c.likely);
    assert.ok(offer.cost.low < c.low);
    assert.ok(offer.cost.high < c.high);
  }
});
