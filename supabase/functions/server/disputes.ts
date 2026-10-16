/**
 * Reading a chargeback: the clock, the reason, and what would answer it.
 *
 * WHY THIS IS A .ts AND NOT PART OF THE WEBHOOK
 *
 * It decides how urgent a deadline is and which evidence a reason code calls
 * for, and the test runner strips types from `.ts` only — logic living in a
 * `.tsx` cannot be checked by hand.
 *
 * It is also deliberately NOT inside the webhook function. Each edge function
 * in this repo is self-contained and `stripe-webhooks` is the one Stripe talks
 * to; its job is to verify a signature and never lose an event. Interpretation
 * belongs where it can be changed, tested and re-read without redeploying the
 * endpoint a card network is delivering to.
 *
 * THE DEADLINE IS THE WHOLE PRODUCT
 *
 * A dispute not answered inside its window is lost by default, however good the
 * evidence was. That is the one failure where having everything and never being
 * asked costs exactly as much as having nothing — see
 * `tasks/chargeback-defence.md`. So the clock is a first-class field and
 * `dueState` is the most important function here.
 *
 * PER COMPANY, NEVER GUESSED
 *
 * Each company is its own standalone Stripe account, so a dispute lands on one
 * of them and the evidence that answers it is that company's. A dispute whose
 * company cannot be established is `unattributed` and goes to a person. Filing
 * it under a default would put one business's money and one business's
 * documents against another's chargeback.
 */

/** Stripe's reason codes, as of API 2024-12-18. */
export type DisputeReason =
  | 'bank_cannot_process'
  | 'check_returned'
  | 'credit_not_processed'
  | 'customer_initiated'
  | 'debit_not_authorized'
  | 'duplicate'
  | 'fraudulent'
  | 'general'
  | 'incorrect_account_details'
  | 'insufficient_funds'
  | 'product_not_received'
  | 'product_unacceptable'
  | 'subscription_canceled'
  | 'unrecognized';

/**
 * Where a dispute is in our handling of it — NOT Stripe's status.
 *
 * Stripe's `status` says what the network thinks. This says what we have done,
 * which is the thing a person needs to see on a queue. They are tracked
 * separately because they disagree in both directions: a dispute can be
 * `needs_response` at Stripe while we have already drafted, and `under_review`
 * while we have done nothing.
 */
export type HandlingState =
  | 'received'
  | 'gathering'
  | 'drafted'
  | 'submitted'
  | 'won'
  | 'lost'
  | 'closed'
  | 'unattributed';

export interface DisputeRecord {
  /** Stripe's dispute id, and our primary key. */
  id: string;
  /** Null when the delivery could not be attributed. Never a default. */
  companyId: string | null;
  chargeId: string;
  paymentIntentId?: string | null;
  /** Minor units, as Stripe sends it. Never converted in storage. */
  amountMinor: number;
  currency: string;
  reason: DisputeReason | string;
  /** Stripe's own status. */
  stripeStatus: string;
  /** Ours. */
  state: HandlingState;
  /** ISO. The clock. Null when Stripe says no response is required. */
  evidenceDueBy: string | null;
  /** Whether Stripe says it is still possible to submit. */
  submissionOpen: boolean;
  liveMode: boolean;
  createdAt: string;
  updatedAt: string;
  /** Which signing secret verified the delivery, for attribution and audit. */
  verifiedBy?: string | null;
}

const str = (v: unknown, fallback = '') => {
  const s = v === null || v === undefined ? '' : String(v).trim();
  return s || fallback;
};

/**
 * Turn a Stripe dispute object into our record.
 *
 * Reads defensively: this is the one place a card network's payload meets our
 * storage, the shape has changed across API versions, and a webhook that throws
 * on an unexpected field is a webhook that loses the event. Stripe retries, but
 * a persistent parse failure means the clock runs out while deliveries bounce.
 */
export function readDisputeEvent(
  dispute: any,
  options: { companyId?: string | null; verifiedBy?: string | null; now?: string } = {},
): DisputeRecord | null {
  const id = str(dispute?.id);
  if (!id) return null;

  const now = options.now || new Date().toISOString();
  const dueRaw = dispute?.evidence_details?.due_by;
  // Stripe sends seconds. A millisecond reading would put every deadline in
  // 1970 and every dispute would look overdue, which is the kind of wrong that
  // looks like a crisis.
  const dueBy = Number.isFinite(Number(dueRaw)) && Number(dueRaw) > 0
    ? new Date(Number(dueRaw) * 1000).toISOString()
    : null;

  const companyId = str(options.companyId) || null;

  return {
    id,
    companyId,
    chargeId: str(dispute?.charge),
    paymentIntentId: str(dispute?.payment_intent) || null,
    amountMinor: Number(dispute?.amount) || 0,
    currency: str(dispute?.currency, 'usd').toLowerCase(),
    reason: str(dispute?.reason, 'general'),
    stripeStatus: str(dispute?.status, 'needs_response'),
    // An unattributable dispute is its own state, so it cannot sit in a
    // company's queue looking handled.
    state: companyId ? 'received' : 'unattributed',
    evidenceDueBy: dueBy,
    submissionOpen: dispute?.evidence_details?.submission_count !== undefined
      ? dispute?.is_charge_refundable !== false || str(dispute?.status) === 'needs_response'
      : str(dispute?.status) === 'needs_response',
    liveMode: dispute?.livemode !== false,
    createdAt: now,
    updatedAt: now,
    verifiedBy: options.verifiedBy || null,
  };
}

export type Urgency = 'overdue' | 'critical' | 'soon' | 'ok' | 'none';

export interface DueState {
  urgency: Urgency;
  /** Whole days remaining; negative once past. Null when there is no deadline. */
  daysLeft: number | null;
  /** A sentence for the queue. */
  why: string;
}

/**
 * How much time is left, and how loudly to say so.
 *
 * The thresholds are deliberately pessimistic about the last stretch. Assembling
 * evidence needs a person to find photographs, read correspondence and decide
 * which argument to make; "two days left" is not comfortable, it is the last
 * moment that is still workable. So two days is `critical`, not `soon`.
 *
 * `none` is for a dispute Stripe says needs no response — already won, already
 * lost, or an enquiry. It is not the same as `ok` and must not read as time in
 * hand.
 */
export function dueState(
  dueBy: string | null | undefined,
  now: number | Date = Date.now(),
): DueState {
  if (!dueBy) {
    return { urgency: 'none', daysLeft: null, why: 'Stripe is not asking for a response.' };
  }
  const due = Date.parse(String(dueBy));
  if (!Number.isFinite(due)) {
    // Refusing to guess: a deadline we cannot read is treated as urgent,
    // because the alternative is treating it as absent and missing it.
    return { urgency: 'critical', daysLeft: null, why: 'The deadline could not be read. Check Stripe directly.' };
  }
  const at = now instanceof Date ? now.getTime() : now;
  const msLeft = due - at;
  const daysLeft = Math.floor(msLeft / 86_400_000);

  if (msLeft <= 0) {
    return {
      urgency: 'overdue',
      daysLeft,
      why: 'The window has closed. Submitting now may not be possible — check Stripe.',
    };
  }
  if (daysLeft <= 2) {
    return { urgency: 'critical', daysLeft, why: `${daysLeft === 0 ? 'Due today' : `${daysLeft} day(s) left`} — this needs doing now.` };
  }
  if (daysLeft <= 5) {
    return { urgency: 'soon', daysLeft, why: `${daysLeft} days left.` };
  }
  return { urgency: 'ok', daysLeft, why: `${daysLeft} days left.` };
}

export interface EvidenceAsk {
  /** What actually answers this reason code, in priority order. */
  wants: string[];
  /** The one-line argument this reason turns on. */
  argument: string;
}

/**
 * What a given reason code actually calls for.
 *
 * WHY THIS MATTERS MORE THAN A TEMPLATE
 *
 * The reason code decides which facts are relevant, and the arguments are not
 * interchangeable. "Product not received" turns on delivery; "not as described"
 * turns on scope and sign-off; "unrecognised" is usually answered by showing the
 * customer who they bought from. Submitting a delivery receipt against a
 * not-as-described dispute is a lost dispute with paperwork attached.
 *
 * Unknown codes fall through to the general ask rather than to nothing, and say
 * so — a reason we do not recognise still has a deadline.
 */
export function evidenceFor(reason: string): EvidenceAsk {
  switch (String(reason || '').toLowerCase()) {
    case 'product_not_received':
      return {
        argument: 'Show it was delivered, or that the service was performed.',
        wants: [
          'delivery confirmation with carrier and tracking, or the completion record',
          'the service date and address',
          'photographs taken on completion',
          'any message where the customer acknowledged receipt',
        ],
      };
    case 'product_unacceptable':
      return {
        argument: 'Show what was agreed, and that it is what was supplied.',
        wants: [
          'the signed quote or contract, with the scope',
          'completion photographs against that scope',
          'the refund policy in force at the time',
          'correspondence about the complaint and what was offered',
        ],
      };
    case 'unrecognized':
    case 'customer_initiated':
      return {
        argument: 'Show who they bought from and what they bought.',
        wants: [
          'the receipt, with the trading name as it appears on the statement',
          'the customer details given at checkout',
          'the service address or delivery address',
          'any correspondence to the same email or phone',
        ],
      };
    case 'fraudulent':
      return {
        argument: 'Show the customer authorised it, and that it reached them.',
        wants: [
          'the signed quote or approval, with timestamp and IP if held',
          'delivery or completion proof to the cardholder address',
          'prior successful payments from the same customer',
          'correspondence from the same email or phone',
        ],
      };
    case 'duplicate':
      return {
        argument: 'Show the two charges are for different things.',
        wants: [
          'both receipts, side by side',
          'what each charge covered — the dates, the jobs, the items',
          'proof the other charge was not refunded already',
        ],
      };
    case 'subscription_canceled':
      return {
        argument: 'Show when it was cancelled and what the terms said.',
        wants: [
          'the cancellation record, with its date',
          'the terms shown at sign-up, including notice',
          'what was supplied after the cancellation date, if anything',
        ],
      };
    case 'credit_not_processed':
      return {
        argument: 'Show the refund was issued, or that none was owed.',
        wants: [
          'the refund record, with its date and amount',
          'the refund policy in force at the time',
          'correspondence where the outcome was agreed',
        ],
      };
    default:
      return {
        argument: 'A reason code we do not have a specific argument for. '
          + 'Read it in Stripe before drafting.',
        wants: [
          'the receipt',
          'the refund policy in force at the time',
          'the correspondence log',
          'whatever proves the work was done or the goods sent',
        ],
      };
  }
}

/** Is this one still ours to act on? */
export function isOpen(state: HandlingState): boolean {
  return state === 'received' || state === 'gathering' || state === 'drafted'
    || state === 'unattributed';
}

/**
 * The moves allowed from a state.
 *
 * A state machine rather than a free field, so a dispute cannot go from
 * `received` to `won` without anybody submitting anything — which is how a
 * queue starts lying about what has been done. `won`, `lost` and `closed` are
 * terminal from our side: they are Stripe's to declare and we record them.
 */
export function nextStates(state: HandlingState): HandlingState[] {
  switch (state) {
    case 'unattributed': return ['received'];
    case 'received': return ['gathering', 'closed'];
    case 'gathering': return ['drafted', 'closed'];
    case 'drafted': return ['submitted', 'gathering'];
    case 'submitted': return ['won', 'lost', 'closed'];
    default: return [];
  }
}

export function canMove(from: HandlingState, to: HandlingState): boolean {
  return nextStates(from).includes(to);
}
