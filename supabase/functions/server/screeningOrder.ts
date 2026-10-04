/**
 * A screening order: what state it is in, who may see it, and what we refuse.
 *
 * WHY THIS IS ITS OWN FILE
 *
 * Same reason as `screeningLink.ts` and `aiCeiling.ts`: these are the rules that
 * decide whether a report about a real person may be ordered and who may read
 * it, and a rule the test runner cannot import is a rule nobody can check. The
 * routes in `index.tsx` do the storage; every decision is here.
 *
 * WHAT AN ORDER IS NOT
 *
 * It is not a report, and it must never become one. The record holds a status, a
 * provider reference and the money, and no score, no band, no report body and no
 * identity fields — no date of birth, and above all no Social Security number.
 * See the architectural rule at the top of `tasks/tenant-screening.md`: the
 * consumer reporting agency collects identity on its own infrastructure, and the
 * landlord reads the report through a short-lived link into the provider. If a
 * field ever appears here that would be worth stealing, something has gone
 * wrong.
 *
 * THE STATE MACHINE IS DELIBERATELY NARROW
 *
 *   created ─► paid ─► invited ─► verifying ─► complete
 *      │        │         │           │
 *      └────────┴─────────┴───────────┴──► failed
 *                         └──► expired
 *
 * Only `complete`, `expired` and `failed` are terminal, and nothing leaves a
 * terminal state. That is the property that matters most: a finished report must
 * not be walked backwards by a late webhook, and an expiry sweep running at
 * midnight must not expire an order that completed at 23:59.
 *
 * `paid` exists in the machine before anything charges for a screening, because
 * the fee arrives in phase 2 and a state added later is a migration of live
 * records. Until then an order with no fee due goes straight from `created` to
 * `invited`, which is a transition the machine allows explicitly rather than by
 * omission.
 */

export const SCREENING_STATES = [
  'created',
  'paid',
  'invited',
  'verifying',
  'complete',
  'expired',
  'failed',
] as const;

export type ScreeningState = typeof SCREENING_STATES[number];

const TERMINAL: readonly ScreeningState[] = ['complete', 'expired', 'failed'];

/** Terminal states are final. Nothing moves out of one, ever. */
export function isTerminal(state: ScreeningState): boolean {
  return TERMINAL.includes(state);
}

/**
 * Which moves are legal. Everything absent from this table is refused, which is
 * why the table is written out rather than derived from the order of the states:
 * `created → complete` would be a perfectly sensible-looking step forward and it
 * is exactly the one that must never happen, because it would mean a report
 * exists that nobody was ever invited to produce.
 */
const ALLOWED: Readonly<Record<ScreeningState, readonly ScreeningState[]>> = {
  created: ['paid', 'invited', 'failed'],
  paid: ['invited', 'failed'],
  invited: ['verifying', 'expired', 'failed'],
  verifying: ['complete', 'failed'],
  complete: [],
  expired: [],
  failed: [],
};

export type TransitionVerdict = 'ok' | 'noop' | 'refused';

/**
 * Whether an order may move from one state to another.
 *
 * `noop` rather than `refused` for a move to the state it is already in, because
 * providers resend: a webhook delivered twice must be boring, not an error that
 * pages somebody. A repeat of a TERMINAL state is also a noop — hearing
 * "complete" twice is the same report, not a violation.
 */
export function transition(from: ScreeningState, to: ScreeningState): TransitionVerdict {
  if (from === to) return 'noop';
  if (isTerminal(from)) return 'refused';
  return (ALLOWED[from] ?? []).includes(to) ? 'ok' : 'refused';
}

/* ── whether an application may be screened at all ────────────────────────── */

export interface ConsentBearing {
  consentBackground?: boolean | null;
  consentAt?: string | null;
  consentText?: string | null;
}

export type ConsentRefusal =
  | 'no_application'
  | 'not_consented'
  | 'consent_undated'
  | 'consent_unrecorded';

/**
 * Why this application cannot be screened, or `null` if it can.
 *
 * The consent record is the entire legal basis for ordering a report about
 * somebody, so each way of lacking one is named separately — "they did not
 * agree" and "they agreed before we started keeping proof" need different things
 * said to the landlord, and only the first is the applicant's answer.
 *
 * Applications submitted before phase 0 carry a bare `consentBackground` with no
 * timestamp and no wording. Those are refused as `consent_undated` /
 * `consent_unrecorded` rather than accepted on the strength of the boolean:
 * back-filling a date we never recorded would be inventing evidence, and a
 * consent we cannot show the wording of is not a consent we can stand behind.
 */
export function consentRefusal(app: ConsentBearing | null | undefined): ConsentRefusal | null {
  if (!app) return 'no_application';
  if (!app.consentBackground) return 'not_consented';
  if (!app.consentAt || !Number.isFinite(Date.parse(String(app.consentAt)))) return 'consent_undated';
  if (!String(app.consentText ?? '').trim()) return 'consent_unrecorded';
  return null;
}

/** What to tell the landlord. Phrased for somebody who has to act on it. */
export function consentRefusalMessage(reason: ConsentRefusal): string {
  switch (reason) {
    case 'no_application':
      return 'That application is not on your list.';
    case 'not_consented':
      return 'This applicant did not consent to a background and credit check. Ask them to submit a new application with consent given, or request their written authorisation directly.';
    case 'consent_undated':
    case 'consent_unrecorded':
      return 'This application was submitted before we began recording the wording and date of the consent, so it cannot support a screening order. Send the applicant a current application link and screen the new submission.';
  }
}

/* ── why this report is being pulled ──────────────────────────────────────── */

/**
 * The purposes this platform will order a report for.
 *
 * Federal law lets a consumer report be pulled only for a permissible purpose,
 * and the person pulling it has to certify which one. Both of these are the
 * tenancy purpose; they are separate values because they are separate moments,
 * and a landlord renewing a sitting tenant should not have to claim they are
 * considering a new application.
 *
 * The list is closed and short on purpose. Every addition is a new claim about
 * what the law permits, which is not a decision to make by widening an array —
 * and an open-ended "other, please specify" field would collect a certification
 * nobody could stand behind.
 */
export const SCREENING_PURPOSES = ['tenancy_application', 'lease_renewal'] as const;

export type ScreeningPurpose = typeof SCREENING_PURPOSES[number];

export const SCREENING_PURPOSE_LABELS: Readonly<Record<ScreeningPurpose, string>> = {
  tenancy_application: 'Deciding on a rental application for a property I own or manage',
  lease_renewal: 'Deciding whether to renew the lease of a current tenant',
};

/**
 * What the landlord certifies, owned by the server for the same reason the
 * applicant's consent wording is: the record has to be what they were shown.
 *
 * DRAFT WORDING, AND IT IS FLAGGED AS SUCH IN THE PLAN. The sentence is a plain
 * statement of the three things that actually matter — the purpose, that the
 * applicant authorised it, and that the report will not be used for anything
 * else. It needs a lawyer's eye once before a real report is ever ordered; see
 * the blocking list in `tasks/tenant-screening.md`. It is not left empty in the
 * meantime, because an uncertified order is the thing to prevent.
 */
export const SCREENING_PURPOSE_CERTIFICATION =
  'I certify that I am requesting this report for the tenancy purpose selected above, that the applicant has authorised it, and that I will not use it for any other purpose.';

export type PurposeRefusal = 'missing' | 'unknown' | 'uncertified';

/**
 * Why this request may not order a report, or `null` if it may.
 *
 * Separated from the consent check because they are two different people making
 * two different promises: the applicant authorises the check, and the landlord
 * certifies why they are pulling it. A system that conflated them would let one
 * stand in for the other, and the law requires both.
 */
export function purposeRefusal(
  purpose: unknown,
  certified: unknown,
): PurposeRefusal | null {
  const value = String(purpose ?? '').trim();
  if (!value) return 'missing';
  if (!(SCREENING_PURPOSES as readonly string[]).includes(value)) return 'unknown';
  // Certification is an affirmative act. Anything other than a literal true —
  // an absent field, an empty string, the string "false" — is not one.
  if (certified !== true) return 'uncertified';
  return null;
}

export function purposeRefusalMessage(reason: PurposeRefusal): string {
  switch (reason) {
    case 'missing':
      return 'Select why you are ordering this report before continuing.';
    case 'unknown':
      return `A report can only be ordered for a tenancy decision. Choose one of: ${SCREENING_PURPOSES.join(', ')}.`;
    case 'uncertified':
      return 'You must certify the purpose of this report before it can be ordered.';
  }
}

/* ── who may see what ─────────────────────────────────────────────────────── */

export interface ScreeningOrderRecord {
  id: string;
  landlordEmail: string;
  applicationId: string;
  applicantName?: string | null;
  applicantEmail?: string | null;
  provider: string;
  providerRef?: string | null;
  status: ScreeningState;
  createdAt: string;
  updatedAt?: string | null;
  invitedAt?: string | null;
  completedAt?: string | null;
  inviteExpiresAt?: string | null;
  priceCents?: number | null;
  costCents?: number | null;
  failureReason?: string | null;
  [key: string]: unknown;
}

/**
 * Does this order belong to this landlord?
 *
 * Compared on a normalised email because that is the key the orders are indexed
 * by. A route must call this even when it loaded the order out of the landlord's
 * own index — the index is a convenience, the record's own owner field is the
 * authority, and a route that trusts the index alone becomes a hole the moment
 * anything else writes to it.
 */
export function ownsOrder(order: ScreeningOrderRecord | null | undefined, email: string | null | undefined): boolean {
  const owner = String(order?.landlordEmail ?? '').trim().toLowerCase();
  const actor = String(email ?? '').trim().toLowerCase();
  return !!owner && !!actor && owner === actor;
}

/**
 * The order as the landlord may see it.
 *
 * An allow-list, not a blocklist. A projection that deleted known-bad keys would
 * leak the next field somebody adds; this one can only ever emit what is named
 * here, so a careless addition to the record is invisible until somebody decides
 * it should be visible.
 */
export function landlordView(order: ScreeningOrderRecord) {
  return {
    id: order.id,
    applicationId: order.applicationId,
    permissiblePurpose: order.permissiblePurpose ?? null,
    certifiedAt: order.certifiedAt ?? null,
    applicantName: order.applicantName ?? null,
    applicantEmail: order.applicantEmail ?? null,
    status: order.status,
    provider: order.provider,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt ?? null,
    invitedAt: order.invitedAt ?? null,
    completedAt: order.completedAt ?? null,
    inviteExpiresAt: order.inviteExpiresAt ?? null,
    priceCents: order.priceCents ?? null,
    failureReason: order.failureReason ?? null,
  };
}

/**
 * The order as the APPLICANT may see it.
 *
 * Narrower again, and the omissions are the point. No landlord email, because
 * the applicant applied to a property and is not owed the landlord's address.
 * No `priceCents`, because what we charge the landlord is not the applicant's
 * business. No `providerRef`, which is the handle on the report itself.
 */
export function applicantView(order: ScreeningOrderRecord) {
  return {
    id: order.id,
    status: order.status,
    createdAt: order.createdAt,
    invitedAt: order.invitedAt ?? null,
    inviteExpiresAt: order.inviteExpiresAt ?? null,
    completedAt: order.completedAt ?? null,
  };
}

/* ── when an invitation has gone stale ────────────────────────────────────── */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How long an invitation stands when the provider does not say.
 *
 * Fourteen days, which is longer than any applicant who wants the tenancy will
 * take and short enough that an abandoned order does not sit in `invited` for
 * ever. Our own figure, used only as a fallback: when the agency sets its own
 * deadline that is the one that counts, because they are the ones who will stop
 * honouring the link.
 */
export const SCREENING_INVITE_DAYS = 14;

/**
 * When this invitation stops being good, or `null` if that cannot be known.
 *
 * Null when there is no `invitedAt` to count from, and the sweep treats null as
 * "leave it alone" rather than "expire it". An order whose dates are unreadable
 * is a record to look at, not one to quietly close — expiring it would destroy
 * the only evidence of what went wrong.
 */
export function inviteDeadline(order: ScreeningOrderRecord | null | undefined): string | null {
  const provider = String(order?.inviteExpiresAt ?? '').trim();
  if (provider && Number.isFinite(Date.parse(provider))) return provider;
  const invitedAt = Date.parse(String(order?.invitedAt ?? ''));
  if (!Number.isFinite(invitedAt)) return null;
  return new Date(invitedAt + SCREENING_INVITE_DAYS * DAY_MS).toISOString();
}

/**
 * Whether the sweep should expire this order.
 *
 * Only an `invited` order can lapse, which is the same rule the state machine
 * enforces — stated twice on purpose, so the sweep cannot ask for a transition
 * the machine would refuse and log a refusal every night for ever. An order
 * being verified has an applicant part way through identity checks and is not
 * abandoned; a complete one is finished.
 */
export function inviteLapsed(
  order: ScreeningOrderRecord | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (!order || order.status !== 'invited') return false;
  const deadline = inviteDeadline(order);
  if (!deadline) return false;
  const at = Date.parse(deadline);
  return Number.isFinite(at) && at <= nowMs;
}

/* ── throwing records away ────────────────────────────────────────────────── */

/**
 * The shortest retention this will accept.
 *
 * Not a legal figure — I am not the right source for one and the plan says so.
 * It is a floor against the obvious mistake: somebody typing 7 to tidy up, and
 * destroying the consent wording, the purpose certification and the decision
 * trail for every screening more than a week old. Those records exist to answer
 * a challenge that arrives months later, so a short window defeats the whole
 * point of having kept them.
 *
 * The real figure is Eric's to set once a lawyer has said what it should be.
 * Until then nothing is purged at all — see `purgeRefusal`.
 */
export const SCREENING_MIN_RETENTION_DAYS = 180;

export type PurgeRefusal =
  | 'no_retention'
  | 'not_finished'
  | 'within_window'
  | 'adverse_action_trail';

/**
 * Why this order must be kept, or `null` if it may be deleted.
 *
 * Deletion is the one irreversible thing in this module, so every branch here
 * is a reason NOT to delete and the default is to keep.
 *
 * `no_retention` is the ordinary state: with no window configured nothing is
 * ever purged. A purge that ran on a built-in default would mean deploying this
 * file silently started destroying records, which is not a thing a deploy
 * should do.
 *
 * `adverse_action_trail` is the one worth explaining. An order where the
 * landlord declined somebody *because of* the report is precisely the order
 * whose record you need if that decision is ever questioned — the consent, the
 * wording, the purpose, the date, who certified it. So those are never purged
 * on a timer. They outlive the window deliberately, and deleting one has to be
 * somebody's explicit decision rather than a sweep's.
 */
export function purgeRefusal(
  order: ScreeningOrderRecord | null | undefined,
  retentionDays: number | null | undefined,
  nowMs: number = Date.now(),
): PurgeRefusal | null {
  const days = Number(retentionDays ?? 0);
  if (!Number.isFinite(days) || days < SCREENING_MIN_RETENTION_DAYS) return 'no_retention';
  if (!order || !isTerminal(order.status)) return 'not_finished';
  if (order.reportInfluenced === true) return 'adverse_action_trail';

  // Measured from the last thing that happened to the order, not from its
  // creation: an order created in January and completed in June is six months
  // of relevance, not six months of age.
  const last = Date.parse(String(order.updatedAt || order.completedAt || order.createdAt || ''));
  if (!Number.isFinite(last)) return 'not_finished';
  return last + days * DAY_MS <= nowMs ? null : 'within_window';
}

/* ── turning somebody down ────────────────────────────────────────────────── */

/**
 * The agency that produced the report, as the notice has to name it.
 *
 * It comes from the provider rather than from our own configuration because it
 * is a fact about who furnished the report, and getting it wrong on a notice
 * sends somebody to the wrong company to dispute their own file. The manual
 * provider has none, which is why a notice cannot be produced while it is in
 * use — see `adverseActionRefusal`.
 */
export interface AgencyDisclosure {
  legalName: string;
  address: string;
  phone: string;
}

export type AdverseActionRefusal =
  | 'not_declined'
  | 'no_screening'
  | 'report_not_used'
  | 'agency_unknown';

/**
 * Why no adverse-action notice is owed here, or `null` if one is.
 *
 * Four refusals, and the middle two are the ones that matter.
 *
 * `report_not_used` exists because the obligation attaches to a decision made
 * *because of* a consumer report, not to every rejection. A landlord who turned
 * somebody down before the report came back, or on grounds that had nothing to
 * do with it, owes a notice about something that did not happen — and a system
 * that produced one anyway would be putting words in their mouth about why they
 * declined. So the landlord says whether the report bore on it, and that answer
 * is recorded rather than guessed.
 *
 * `agency_unknown` is a refusal, not a blank to be filled in later. A notice
 * naming no agency is worse than no notice: its entire function is to tell
 * somebody where their file is and who to dispute it with.
 */
export function adverseActionRefusal(
  order: ScreeningOrderRecord | null | undefined,
  decision: string,
  reportInfluenced: unknown,
  agency: AgencyDisclosure | null | undefined,
): AdverseActionRefusal | null {
  if (String(decision ?? '').toLowerCase() !== 'rejected') return 'not_declined';
  if (!order || order.status !== 'complete') return 'no_screening';
  // An affirmative answer only, for the same reason the purpose certification
  // demands a literal true: this records what somebody said about their own
  // reasoning, and a truthy accident is not an answer.
  if (reportInfluenced !== true) return 'report_not_used';
  if (!agency || !String(agency.legalName ?? '').trim() || !String(agency.phone ?? '').trim()) return 'agency_unknown';
  return null;
}

export interface AdverseActionInput {
  applicantName: string;
  applicantEmail?: string | null;
  decidedAt: string;
  agency: AgencyDisclosure;
}

/**
 * The notice an applicant is owed when a report counted against them.
 *
 * DRAFT WORDING. Returned as structured paragraphs rather than a rendered
 * document on purpose: the text has not been through a lawyer, and producing a
 * tidy PDF of unapproved legal language invites somebody to send it. The
 * portal shows it marked as a draft and there is no route that sends it. See
 * item 3 of the blocking list in `tasks/tenant-screening.md`.
 *
 * The four statements are the ones the obligation is actually about — who
 * furnished the report, that they did not make the decision and cannot explain
 * it, the right to a free copy, and the right to dispute what is in it. They
 * are separate fields rather than one block of prose so that a lawyer's edit to
 * one does not require re-reading the others, and so the portal can show them
 * as a list rather than a wall.
 */
export function adverseActionNotice(input: AdverseActionInput) {
  const { agency } = input;
  return {
    draft: true,
    heading: 'Notice regarding your rental application',
    applicantName: input.applicantName,
    applicantEmail: input.applicantEmail ?? null,
    decidedAt: input.decidedAt,
    agency: {
      legalName: agency.legalName,
      address: agency.address,
      phone: agency.phone,
    },
    statements: [
      `Your rental application was declined, and information in a consumer report was a factor in that decision.`,
      `The report was supplied by ${agency.legalName}, ${agency.address}, ${agency.phone}.`,
      `${agency.legalName} did not make the decision to decline your application and cannot explain why it was made.`,
      `You have the right to obtain a free copy of your report from ${agency.legalName} if you request it within 60 days.`,
      `You have the right to dispute with ${agency.legalName} the accuracy or completeness of any information in the report.`,
    ],
  };
}

/**
 * Whether a landlord may be handed a link to the report.
 *
 * Only on a complete order, and only with a provider reference to point at. The
 * second half is not pedantry: a `complete` order with no reference means the
 * status moved and the report did not arrive, and the right answer there is to
 * say so rather than open an empty viewer.
 */
export function reportReadable(order: ScreeningOrderRecord | null | undefined): boolean {
  return !!order && order.status === 'complete' && !!String(order.providerRef ?? '').trim();
}
