/**
 * What we expected a checkout to charge, written when we open it and checked
 * again when Stripe says it was paid.
 *
 * Eric: "then verify payment through webhooks before granting any access.
 * implement a stripe webhook listener so it confirms the payment event
 * validates the amount against our product price and only then provisions
 * access to the purchase resource."
 *
 * WHAT WAS MISSING, AND IT WAS THE WHOLE CHECK
 *
 * The webhook already proved deliveries were genuine — a real Stripe signature
 * (`constructEventAsync` against the endpoint's signing secret) and a one-time
 * claim on the event id so a replay cannot be applied twice. Both are about
 * whether STRIPE really sent this. Neither says anything about WHAT was paid.
 *
 * So provisioning worked like this: a `checkout.session.completed` arrives
 * carrying `bp_tier_id` in its metadata, and `feature_grant:{email}` is written
 * with that tier, active. Nothing read the amount. Nothing read
 * `payment_status` either — and Stripe sends that event for sessions that
 * completed WITHOUT being paid, which is the plainer hole of the two: a
 * delayed payment method completes the session as `unpaid` and can fail hours
 * later, and the grant was already written.
 *
 * THE EXPECTATION IS RECORDED AT CREATION, NOT RECOMPUTED AT PAYMENT
 *
 * The obvious implementation is to look the tier up in the webhook and compare
 * its price to the amount paid. That is worse, for two reasons.
 *
 * The first is drift. A checkout opened on Tuesday against a $39 tier, paid on
 * Thursday after the tier was edited to $59, is a legitimate $39 payment that a
 * recompute would refuse. The figure to check against is the one the session
 * was BUILT from, not the one the catalogue holds now.
 *
 * The second is that a sum is not a price. A portal checkout is a tier plus any
 * extras, each its own Stripe line item, some priced per unit and some by size
 * band from a count the server made. Re-deriving that total inside the webhook
 * means a second implementation of `addOnCharge` and `unitsCovered` that can
 * disagree with the first — and the disagreement would show up as a customer
 * who paid correctly being refused access.
 *
 * So the server writes down, at the moment it creates the session, the subtotal
 * Stripe quoted for the line items it built from OUR prices, together with the
 * price ids themselves and what the session is supposed to buy. The webhook
 * holds the payment against that.
 *
 * THIS ALSO ANSWERS A QUESTION THE AMOUNT CHECK CANNOT
 *
 * A session with no expectation record is a session this server did not create.
 * That is the stronger half of the check: an event carrying our metadata but no
 * matching record provisions nothing, whatever amount it claims to have paid.
 *
 * AND IT FAILS CLOSED
 *
 * Every refusal here means access is not granted. A payment that cannot be
 * verified is parked for a person to look at rather than either granted or
 * thrown away — the money is real either way, so the one unacceptable outcome
 * is silence.
 *
 * WHY IT LIVES IN `server/` AND NOT IN A `_shared/` FOLDER
 *
 * Two functions import it — this server and `stripe-webhooks` — so `_shared/`
 * is the obvious home and it is the wrong one. `make-server-3eae23a6` does not
 * deploy from this directory: `scripts/build-server.mjs` copies the files of
 * `server/` FLAT into `server-dist/`, strips the comments and types, and
 * `config.toml` points the entrypoint at that build. A `../_shared/…` import
 * would survive the typecheck, survive the build, and then resolve to a file
 * that is not inside the deployed directory.
 *
 * So it sits here with every other server module, and the webhook — which
 * deploys from source and has no build step — reaches across with
 * `../server/checkoutExpectation.ts`. Nothing in it touches Deno, Stripe or
 * the database, which is what makes being imported from two runtimes safe and
 * what makes it testable under `node --test`.
 */

/** Where an expectation lives. Written by the server, read by the webhook. */
export const expectationKey = (sessionId: string) =>
  `checkout_expectation:${String(sessionId || '').trim()}`;

/** Where a payment that could not be verified is parked for a person. */
export const heldPaymentKey = (sessionId: string) =>
  `payment_held:${String(sessionId || '').trim()}`;

/** What a session is allowed to provision. */
export type PurchaseKind =
  | 'portal_plan'
  | 'property_ai'
  | 'maintenance_plan'
  | 'maintenance_invoice';

export interface CheckoutExpectation {
  sessionId: string;
  /** Which flow opened it, so one flow's session cannot provision another. */
  kind: PurchaseKind;
  /** The tier, plan or invoice id this buys. */
  subject: string;
  /** Lowercased, where the flow knows it. */
  email?: string;
  /** Which Stripe account, for the audit trail. */
  account: string;
  /** Live or test, as the key that created it. */
  livemode: boolean;
  currency: string;
  /**
   * What Stripe quoted for the line items we built. `amount_subtotal` rather
   * than `amount_total` because it is the figure before discounts and tax — the
   * one that corresponds to our prices and nothing else.
   */
  subtotalCents: number | null;
  totalCents: number | null;
  /** The Stripe price ids on the session, where the flow uses them. */
  priceIds: string[];
  createdAt: string;
  createdBy?: string;
}

/**
 * The price ids on a set of checkout params, in line-item order.
 *
 * Read out of the params rather than passed separately so it cannot fall out of
 * step with the session that was actually created — the params ARE the session.
 */
export function priceIdsFromParams(params: URLSearchParams): string[] {
  const found: Array<{ at: number; id: string }> = [];
  for (const [k, v] of params.entries()) {
    const m = /^line_items\[(\d+)\]\[price\]$/.exec(k);
    if (m && String(v || '').trim()) found.push({ at: Number(m[1]), id: String(v).trim() });
  }
  return found.sort((a, b) => a.at - b.at).map((f) => f.id);
}

/** Build the record from the session Stripe just returned. */
export function expectationFrom(input: {
  session: any;
  kind: PurchaseKind;
  subject: string;
  email?: string | null;
  account: string;
  priceIds?: string[];
  createdBy?: string | null;
}): CheckoutExpectation {
  const s = input.session || {};
  /*
   * The same absent-is-not-zero reader the gate uses, and here it is the more
   * dangerous of the two places to get wrong: an expectation that recorded 0
   * because Stripe sent no subtotal would be satisfied by ANY payment, since
   * every amount is at least zero. A null records as null and the gate refuses
   * with `no-amount` instead.
   */
  const num = asCents;
  return {
    sessionId: String(s.id || ''),
    kind: input.kind,
    subject: String(input.subject || ''),
    email: input.email ? String(input.email).trim().toLowerCase() : undefined,
    account: String(input.account || ''),
    /*
     * Defaulted to LIVE when Stripe does not say. A missing flag read as test
     * would let the dispatcher's rehearsal exception satisfy an expectation
     * that was in fact a real charge.
     */
    livemode: s.livemode !== false,
    currency: String(s.currency || 'usd').toLowerCase(),
    subtotalCents: num(s.amount_subtotal),
    totalCents: num(s.amount_total),
    priceIds: Array.isArray(input.priceIds) ? input.priceIds.filter(Boolean).map(String) : [],
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy ? String(input.createdBy) : undefined,
  };
}

export type RefusalCode =
  | 'no-expectation'
  | 'session-mismatch'
  | 'wrong-kind'
  | 'wrong-subject'
  | 'wrong-mode'
  | 'not-paid'
  | 'wrong-currency'
  | 'no-amount'
  | 'short-paid';

export interface GateResult {
  ok: boolean;
  code?: RefusalCode;
  /** In words, for the log and for the held-payment record. */
  reason: string;
  /** Which checks actually ran, so a pass is not mistaken for a skip. */
  checked: string[];
  paidCents?: number | null;
  expectedCents?: number | null;
}

/**
 * A minor-unit amount, or null — and ABSENT IS NOT ZERO.
 *
 * `Number(null)` is 0, which is finite. Coerced that way, an event carrying no
 * amount at all would be reported as having paid nothing, and the held-payment
 * record would say "paid 0.00 against 39.00" about a message that never
 * mentioned money. Both outcomes refuse, but only one of them is true, and the
 * record is what a refund or a manual grant gets decided from.
 */
const asCents = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
};

/**
 * May this completed checkout session provision what it claims to?
 *
 * `expectation` is whatever came back from the store, including null — a
 * missing record is a refusal, not a reason to skip the check.
 */
export function verifySessionPayment(
  object: any,
  expectation: CheckoutExpectation | null | undefined,
  want: { kind: PurchaseKind; subject?: string },
): GateResult {
  const checked: string[] = [];
  const sessionId = String(object?.id || '');

  if (!expectation || !expectation.sessionId) {
    return {
      ok: false,
      code: 'no-expectation',
      reason: `No record of opening checkout session ${sessionId || '(none)'} on this server, `
        + 'so there is nothing to check the payment against and nothing is granted.',
      checked,
    };
  }
  checked.push('expectation-exists');

  if (expectation.sessionId !== sessionId) {
    return {
      ok: false,
      code: 'session-mismatch',
      reason: `The expectation is for session ${expectation.sessionId} but the event is about `
        + `${sessionId || '(none)'}.`,
      checked,
    };
  }
  checked.push('session-id');

  if (expectation.kind !== want.kind) {
    /*
     * One flow's session cannot provision another's. Without this, a cheap
     * one-off checkout could be handed to the handler that grants a plan.
     */
    return {
      ok: false,
      code: 'wrong-kind',
      reason: `That session was opened to buy ${expectation.kind}, not ${want.kind}.`,
      checked,
    };
  }
  checked.push('kind');

  if (want.subject && String(expectation.subject) !== String(want.subject)) {
    return {
      ok: false,
      code: 'wrong-subject',
      reason: `That session was opened for ${expectation.subject || '(nothing)'}, but the event `
        + `asks to provision ${want.subject}.`,
      checked,
    };
  }
  if (want.subject) checked.push('subject');

  /*
   * A test-mode event must not satisfy a live expectation. The dispatcher
   * already stops test events at the door, but it has one deliberate exception
   * for rehearsals, and this is the check that keeps the exception honest.
   */
  const eventLive = object?.livemode !== false;
  if (eventLive !== expectation.livemode) {
    return {
      ok: false,
      code: 'wrong-mode',
      reason: `The session was created in ${expectation.livemode ? 'live' : 'test'} mode and the `
        + `event arrived in ${eventLive ? 'live' : 'test'} mode.`,
      checked,
    };
  }
  checked.push('livemode');

  /*
   * PAID, NOT MERELY COMPLETED.
   *
   * `checkout.session.completed` fires when the session finishes, which is not
   * the same as the money arriving. `no_payment_required` is only ever right
   * for something that genuinely costs nothing.
   */
  const status = String(object?.payment_status || '');
  const expected = expectation.subtotalCents ?? expectation.totalCents;
  if (status === 'no_payment_required') {
    if ((expected ?? 0) > 0) {
      return {
        ok: false,
        code: 'not-paid',
        reason: 'Stripe says no payment was required, but this session was opened for '
          + `${((expected ?? 0) / 100).toFixed(2)}.`,
        checked,
        expectedCents: expected,
      };
    }
  } else if (status !== 'paid') {
    return {
      ok: false,
      code: 'not-paid',
      reason: `The session completed with payment_status "${status || 'unknown'}". Access is `
        + 'granted on payment, not on completion.',
      checked,
    };
  }
  checked.push('payment-status');

  const currency = String(object?.currency || '').toLowerCase();
  if (currency && expectation.currency && currency !== expectation.currency) {
    /*
     * Same number, different money. 5,000 of a minor unit is fifty dollars or
     * about thirty pounds, and an amount check alone cannot tell them apart.
     */
    return {
      ok: false,
      code: 'wrong-currency',
      reason: `Paid in ${currency.toUpperCase()} but the session was priced in `
        + `${expectation.currency.toUpperCase()}.`,
      checked,
    };
  }
  checked.push('currency');

  /*
   * THE AMOUNT, AGAINST OUR OWN FIGURE.
   *
   * `amount_subtotal` on both sides: it is the total of the line items before
   * discounts and tax, so it is the part that comes from our prices and nothing
   * else. Comparing `amount_total` would refuse a legitimate promotion code and
   * could accept a cheaper line item that tax happened to top up.
   */
  const paid = asCents(object?.amount_subtotal) ?? asCents(object?.amount_total);
  if (expected === null || expected === undefined) {
    return {
      ok: false,
      code: 'no-amount',
      reason: 'The expectation recorded no amount, so the payment cannot be checked against it.',
      checked,
    };
  }
  if (paid === null) {
    return {
      ok: false,
      code: 'no-amount',
      reason: 'The event carried no amount, so it cannot be checked against what we charged.',
      checked,
      expectedCents: expected,
    };
  }
  if (paid < expected) {
    return {
      ok: false,
      code: 'short-paid',
      reason: `Paid ${(paid / 100).toFixed(2)} against our price of ${(expected / 100).toFixed(2)}.`,
      checked,
      paidCents: paid,
      expectedCents: expected,
    };
  }
  checked.push('amount');

  return {
    ok: true,
    reason: `Paid ${(paid / 100).toFixed(2)} ${expectation.currency.toUpperCase()} against our `
      + `price of ${(expected / 100).toFixed(2)}.`,
    checked,
    paidCents: paid,
    expectedCents: expected,
  };
}

/**
 * The price ids on a paid invoice, where Stripe put them.
 *
 * Renewals carry no session, so there is no expectation to hold them against —
 * but an invoice does name the prices it billed, and those can be held against
 * the ones the subscription was sold with.
 */
export function invoicePriceIds(invoice: any): string[] {
  const lines = invoice?.lines?.data;
  if (!Array.isArray(lines)) return [];
  return lines
    .map((l: any) => String(l?.price?.id || l?.plan?.id || '').trim())
    .filter(Boolean);
}

/**
 * Was this renewal billed against a price we sold?
 *
 * Returns `ok` with an empty `checked` when there is nothing to compare —
 * unknown is reported as unknown rather than dressed up as a pass. The caller
 * decides what to do with that, and for a renewal of a subscription Stripe is
 * billing on its own schedule, continuing is the right answer: the money
 * arrived, and refusing would cut off a paying customer over bookkeeping.
 */
export function verifyRenewalPrices(invoice: any, soldPriceIds: string[]): GateResult {
  const billed = invoicePriceIds(invoice);
  const sold = (soldPriceIds || []).filter(Boolean).map(String);
  if (!billed.length || !sold.length) {
    return {
      ok: true,
      reason: 'Nothing to compare: the invoice or the record does not name its prices.',
      checked: [],
    };
  }
  const stranger = billed.find((id) => !sold.includes(id));
  if (stranger) {
    return {
      ok: false,
      code: 'short-paid',
      reason: `The invoice billed price ${stranger}, which is not one this subscription was sold `
        + `with (${sold.join(', ')}).`,
      checked: ['price-ids'],
    };
  }
  return { ok: true, reason: 'Every billed price is one we sold.', checked: ['price-ids'] };
}
