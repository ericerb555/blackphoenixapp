/**
 * The screening fee: whether there is one, and who is asked to pay it.
 *
 * The properties pinned here are all about failing in the harmless direction,
 * because the harmful direction is an unlawful charge to a member of the
 * public:
 *
 *   - nothing is charged until somebody publishes a price, and an unpriced
 *     system is not an error
 *   - the payer defaults to the LANDLORD, which is lawful everywhere
 *   - the applicant is never charged by accident: it takes an explicit setting
 *     AND a known state
 *   - a price with the decimal point in the wrong place is refused rather than
 *     charged
 *   - margin counts only money actually taken, so work given away is not a loss
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  payerFor,
  chargeFor,
  chargeRefusalMessage,
  marginOf,
  refundDue,
  staleUndecided,
  SCREENING_MAX_PRICE_CENTS,
  type ScreeningPricing,
} from '../supabase/functions/server/screeningPricing.ts';

const priced: ScreeningPricing = { priceCents: 4500, costCents: 2500, enabled: true };

/* ── whether anything is charged at all ───────────────────────────────────── */

test('an unconfigured system charges nobody, and that is not an error', () => {
  assert.deepEqual(chargeFor(null, 'MA'), { charge: false, reason: 'no_pricing', payer: null, amountCents: 0, costCents: 0 });
  assert.deepEqual(chargeFor(undefined, 'MA'), { charge: false, reason: 'no_pricing', payer: null, amountCents: 0, costCents: 0 });
  assert.deepEqual(chargeFor({}, 'MA'), { charge: false, reason: 'unpriced', payer: null, amountCents: 0, costCents: 0 });
  assert.deepEqual(chargeFor({ priceCents: 0 }, 'MA'), { charge: false, reason: 'unpriced', payer: null, amountCents: 0, costCents: 0 });
  assert.deepEqual(chargeFor({ priceCents: null }, 'MA'), { charge: false, reason: 'unpriced', payer: null, amountCents: 0, costCents: 0 });
});

test('a negative or unreadable price charges nobody', () => {
  assert.deepEqual(chargeFor({ priceCents: -100 }, 'MA'), { charge: false, reason: 'unpriced', payer: null, amountCents: 0, costCents: 0 });
  assert.deepEqual(chargeFor({ priceCents: Number.NaN }, 'MA'), { charge: false, reason: 'unpriced', payer: null, amountCents: 0, costCents: 0 });
  assert.deepEqual(chargeFor({ priceCents: Number.POSITIVE_INFINITY }, 'MA'), { charge: false, reason: 'unpriced', payer: null, amountCents: 0, costCents: 0 });
});

test('the switch stops charging without deleting the figures', () => {
  assert.deepEqual(chargeFor({ ...priced, enabled: false }, 'MA'), { charge: false, reason: 'disabled', payer: null, amountCents: 0, costCents: 0 });
});

test('a misplaced decimal point is refused, not charged', () => {
  // $450 typed as 45000 when 4500 was meant.
  const verdict = chargeFor({ ...priced, priceCents: SCREENING_MAX_PRICE_CENTS + 1 }, 'MA');
  assert.deepEqual(verdict, { charge: false, reason: 'price_out_of_bounds', payer: null, amountCents: 0, costCents: 0 });
  // And the boundary itself is allowed.
  const atLimit = chargeFor({ ...priced, priceCents: SCREENING_MAX_PRICE_CENTS }, 'MA');
  assert.equal(atLimit.charge, true);
});

test('a fractional price is refused rather than silently rounded', () => {
  assert.deepEqual(chargeFor({ ...priced, priceCents: 4500.5 }, 'MA'), { charge: false, reason: 'price_out_of_bounds', payer: null, amountCents: 0, costCents: 0 });
});

test('every refusal says something a person can act on', () => {
  for (const reason of ['no_pricing', 'unpriced', 'disabled', 'price_out_of_bounds'] as const) {
    assert.ok(chargeRefusalMessage(reason).length > 20, `${reason} needs a real message`);
  }
});

/* ── who pays ─────────────────────────────────────────────────────────────── */

test('with nothing configured the LANDLORD pays', () => {
  // Lawful everywhere, which is why it is the default.
  assert.equal(payerFor(null, 'MA'), 'landlord');
  assert.equal(payerFor({}, 'MA'), 'landlord');
  assert.equal(payerFor(priced, 'MA'), 'landlord');
});

test('a per-state setting decides that state', () => {
  const p = { ...priced, payerByState: { NH: 'applicant' as const, MA: 'landlord' as const } };
  assert.equal(payerFor(p, 'NH'), 'applicant');
  assert.equal(payerFor(p, 'MA'), 'landlord');
});

test('the state code is read regardless of case or padding', () => {
  const p = { ...priced, payerByState: { NH: 'applicant' as const } };
  assert.equal(payerFor(p, ' nh '), 'applicant');
});

test('a state with no setting of its own falls to the default', () => {
  const p = { ...priced, defaultPayer: 'applicant' as const, payerByState: { MA: 'landlord' as const } };
  assert.equal(payerFor(p, 'MA'), 'landlord');
  assert.equal(payerFor(p, 'NH'), 'applicant');
});

test('an UNKNOWN state never resolves to the applicant', () => {
  // The security-and-legality property. A per-state rule cannot be applied to a
  // state nobody recorded, so the charge falls on the business instead.
  const p = { ...priced, defaultPayer: 'applicant' as const };
  assert.equal(payerFor(p, ''), 'landlord');
  assert.equal(payerFor(p, null), 'landlord');
  assert.equal(payerFor(p, undefined), 'landlord');
  assert.equal(payerFor(p, '   '), 'landlord');
});

test('a nonsense payer setting falls back to the landlord', () => {
  const p = { ...priced, payerByState: { MA: 'tenant' as any }, defaultPayer: 'nobody' as any };
  assert.equal(payerFor(p, 'MA'), 'landlord');
});

test('a full charge decision carries the payer, the price and the cost', () => {
  const verdict = chargeFor({ ...priced, payerByState: { NH: 'applicant' } }, 'NH');
  assert.deepEqual(verdict, { charge: true, reason: null, payer: 'applicant', amountCents: 4500, costCents: 2500 });
});

test('an unknown agency cost is zero rather than a guess', () => {
  const verdict = chargeFor({ priceCents: 4500 }, 'MA');
  assert.equal(verdict.charge && verdict.costCents, 0);
});

/* ── what it earned ───────────────────────────────────────────────────────── */

test('margin counts only orders that were actually paid', () => {
  const m = marginOf([
    { status: 'complete', priceCents: 4500, costCents: 2500, paidAt: '2026-10-01T00:00:00.000Z' },
    { status: 'complete', priceCents: 4500, costCents: 2500, paidAt: null },   // never charged
    { status: 'created', priceCents: 4500, costCents: 2500 },                  // not paid yet
  ]);
  assert.deepEqual(m, { paidOrders: 1, revenueCents: 4500, refundedCents: 0, costCents: 2500, marginCents: 2000 });
});

test('work given away is not a loss', () => {
  // An unpriced order with a cost attached must not show as negative margin.
  const m = marginOf([{ status: 'complete', priceCents: 0, costCents: 2500, paidAt: '2026-10-01T00:00:00.000Z' }]);
  assert.deepEqual(m, { paidOrders: 0, revenueCents: 0, refundedCents: 0, costCents: 0, marginCents: 0 });
});

test('a paid order whose cost is unknown shows full revenue and no cost', () => {
  const m = marginOf([{ status: 'complete', priceCents: 4500, paidAt: '2026-10-01T00:00:00.000Z' }]);
  assert.deepEqual(m, { paidOrders: 1, revenueCents: 4500, refundedCents: 0, costCents: 0, marginCents: 4500 });
});

test('an empty or absent list earns nothing without throwing', () => {
  assert.deepEqual(marginOf([]), { paidOrders: 0, revenueCents: 0, refundedCents: 0, costCents: 0, marginCents: 0 });
  assert.deepEqual(marginOf(undefined as any), { paidOrders: 0, revenueCents: 0, refundedCents: 0, costCents: 0, marginCents: 0 });
});

/* ── the New Hampshire refund (RSA 540-A:3 VIII) ──────────────────────────── */

const paidByApplicant = {
  payer: 'applicant',
  paidAt: '2026-10-01T00:00:00.000Z',
  priceCents: 4500,
  costCents: 2500,
};

test('a rejected applicant is owed the markup', () => {
  assert.equal(refundDue({ ...paidByApplicant, decision: 'rejected' }), 2000);
});

test('with retained admin costs allowed, less goes back', () => {
  // The number only moves if a lawyer says our fee is a reasonable
  // administrative cost. The code takes no view; it just does the arithmetic.
  assert.equal(refundDue({ ...paidByApplicant, decision: 'rejected' }, 500), 1500);
  assert.equal(refundDue({ ...paidByApplicant, decision: 'rejected' }, 2000), 0);
  // Retaining more than was taken is not a negative refund.
  assert.equal(refundDue({ ...paidByApplicant, decision: 'rejected' }, 99999), 0);
});

test('an approved applicant is owed nothing', () => {
  // The duty turns on the unit not being rented to them.
  assert.equal(refundDue({ ...paidByApplicant, decision: 'approved' }), 0);
});

test('SILENCE is not a rejection and refunds nothing', () => {
  // Refunding early hands money back to somebody about to be approved.
  assert.equal(refundDue({ ...paidByApplicant }), 0);
  assert.equal(refundDue({ ...paidByApplicant, decision: '' }), 0);
  assert.equal(refundDue({ ...paidByApplicant, decision: null }), 0);
});

test('a LANDLORD-paid fee is never refunded to the applicant', () => {
  // It was not their money.
  assert.equal(refundDue({ ...paidByApplicant, payer: 'landlord', decision: 'rejected' }), 0);
});

test('an unpaid order refunds nothing', () => {
  assert.equal(refundDue({ ...paidByApplicant, paidAt: null, decision: 'rejected' }), 0);
  assert.equal(refundDue({ ...paidByApplicant, priceCents: 0, decision: 'rejected' }), 0);
});

test('a refund already issued is never issued again', () => {
  // The first of two idempotency guards; the Stripe key is the second.
  assert.equal(refundDue({ ...paidByApplicant, decision: 'rejected', refundedAt: '2026-10-02T00:00:00.000Z' }), 0);
});

test('the decision is read case-insensitively', () => {
  assert.equal(refundDue({ ...paidByApplicant, decision: 'REJECTED' }), 2000);
});

test('a fee at or below documented cost owes nothing back', () => {
  assert.equal(refundDue({ ...paidByApplicant, costCents: 4500, decision: 'rejected' }), 0);
  assert.equal(refundDue({ ...paidByApplicant, costCents: 5000, decision: 'rejected' }), 0);
});

test('an unknown cost means the whole fee goes back', () => {
  // Fails towards the applicant: we cannot retain a documented cost we cannot
  // document.
  assert.equal(refundDue({ ...paidByApplicant, costCents: null, decision: 'rejected' }), 4500);
});

/* ── the stale-application report ─────────────────────────────────────────── */

const NOW2 = Date.parse('2026-10-20T00:00:00.000Z');

test('an applicant-paid order left undecided is reported after the window', () => {
  const rows = [{ ...paidByApplicant }];
  assert.equal(staleUndecided(rows, 14, NOW2).length, 1);
  assert.equal(staleUndecided(rows, 30, NOW2).length, 0);
});

test('decided, refunded, landlord-paid and unpaid orders are not reported', () => {
  assert.equal(staleUndecided([{ ...paidByApplicant, decision: 'rejected' }], 14, NOW2).length, 0);
  assert.equal(staleUndecided([{ ...paidByApplicant, refundedAt: '2026-10-05T00:00:00.000Z' }], 14, NOW2).length, 0);
  assert.equal(staleUndecided([{ ...paidByApplicant, payer: 'landlord' }], 14, NOW2).length, 0);
  assert.equal(staleUndecided([{ ...paidByApplicant, paidAt: null }], 14, NOW2).length, 0);
});

/* ── refunds come off the revenue figure ──────────────────────────────────── */

test('a refund is not revenue', () => {
  // Counting the gross would overstate New Hampshire earnings by the markup on
  // every applicant who was turned down, which is most of them.
  const m = marginOf([
    { priceCents: 4500, costCents: 2500, paidAt: '2026-10-01T00:00:00.000Z' },
    { priceCents: 4500, costCents: 2500, paidAt: '2026-10-01T00:00:00.000Z', refundedAt: '2026-10-09T00:00:00.000Z', refundCents: 2000 },
  ]);
  assert.deepEqual(m, { paidOrders: 2, revenueCents: 9000, refundedCents: 2000, costCents: 5000, marginCents: 2000 });
});
