/**
 * An append-only record of every consumer report this platform ever requested.
 *
 * WHY IT IS NOT THE ORDER RECORD
 *
 * The order already says who certified what purpose and when, which is most of
 * the same information — and it is the wrong place to answer an audit from, for
 * two reasons.
 *
 * It is **mutable**: an order's status, decision and refund all move over its
 * life, so reading history out of it means reading the current state and
 * inferring the past. An audit asks what happened, not what is true now.
 *
 * And it is **deleted**. The retention purge removes finished orders, by
 * design. An audit question — "show me every consumer report you requested in
 * March" — would then be answered by a scan that silently got shorter every
 * night. The whole point of an audit trail is that it outlives the thing it
 * describes.
 *
 * So entries here are written once and never updated. A later event about the
 * same order appends a second entry rather than changing the first. The purge
 * does not touch this prefix, and `purgeRefusal` in `screeningOrder.ts` has no
 * business knowing it exists.
 *
 * WHY THE KEYS ARE BUCKETED BY MONTH
 *
 * Because the question really is asked by month, and a prefix scan over
 * `screening_audit:2026-03:` answers it directly instead of reading every
 * entry ever written and filtering. The id suffix keeps two pulls in the same
 * millisecond from colliding.
 *
 * WHAT MAY NEVER BE IN HERE
 *
 * The same rule as everywhere else in this system, and it matters more here
 * because this record is the one that is kept longest. No report body, no
 * score, no band, no date of birth, no Social Security number. `auditEntry` is
 * an allow-list for exactly that reason: it cannot emit a field it does not
 * name, so a caller who passes a whole order in does not accidentally archive
 * its contents for seven years.
 *
 * The applicant's name and email ARE here, deliberately. An audit has to
 * identify whose report was pulled, and a log that cannot say who the subject
 * was does not answer the question it exists for. That is the minimum, and
 * nothing beyond it is kept.
 */

export type AuditEvent =
  | 'requested'
  | 'completed'
  | 'failed'
  | 'adverse_action';

export interface AuditInput {
  event: AuditEvent;
  orderId: string;
  /** The end user whose permissible purpose this pull was made under. */
  landlordEmail?: string | null;
  certifiedBy?: string | null;
  permissiblePurpose?: string | null;
  provider?: string | null;
  providerRef?: string | null;
  applicantName?: string | null;
  applicantEmail?: string | null;
  propertyState?: string | null;
  /** Free text for a failure reason or a decision. Truncated, never a report. */
  note?: string | null;
  at?: string;
}

export interface AuditRecord {
  id: string;
  at: string;
  event: AuditEvent;
  orderId: string;
  landlordEmail: string | null;
  certifiedBy: string | null;
  permissiblePurpose: string | null;
  provider: string | null;
  providerRef: string | null;
  applicantName: string | null;
  applicantEmail: string | null;
  propertyState: string | null;
  note: string | null;
}

export const AUDIT_PREFIX = 'screening_audit:';

/** The month an entry belongs to, as `YYYY-MM`. */
export function auditMonth(atIso: string): string {
  const at = Date.parse(String(atIso ?? ''));
  // An unreadable timestamp is bucketed as `unknown` rather than guessed into a
  // month. A misfiled audit entry is worse than an obviously odd one, because
  // the misfiled one is invisible.
  if (!Number.isFinite(at)) return 'unknown';
  return new Date(at).toISOString().slice(0, 7);
}

/** The key an entry is stored under. Sorts roughly chronologically per month. */
export function auditKey(record: Pick<AuditRecord, 'at' | 'id'>): string {
  return `${AUDIT_PREFIX}${auditMonth(record.at)}:${record.at}:${record.id}`;
}

/** The prefix that answers "every report requested in this month". */
export function auditMonthPrefix(month: string): string {
  return `${AUDIT_PREFIX}${String(month ?? '').trim()}:`;
}

const text = (value: unknown, max = 200): string | null => {
  const s = String(value ?? '').trim();
  return s ? s.slice(0, max) : null;
};

/**
 * Build an entry. An allow-list, so nothing unnamed can reach storage.
 *
 * `id` is supplied by the caller rather than generated here so the function
 * stays pure and testable; the routes pass a uuid.
 */
export function auditEntry(input: AuditInput, id: string, now: string = new Date().toISOString()): AuditRecord {
  return {
    id,
    at: text(input.at, 40) ?? now,
    event: input.event,
    orderId: text(input.orderId, 80) ?? '',
    landlordEmail: text(input.landlordEmail)?.toLowerCase() ?? null,
    certifiedBy: text(input.certifiedBy)?.toLowerCase() ?? null,
    permissiblePurpose: text(input.permissiblePurpose, 60),
    provider: text(input.provider, 60),
    providerRef: text(input.providerRef, 120),
    applicantName: text(input.applicantName),
    applicantEmail: text(input.applicantEmail)?.toLowerCase() ?? null,
    propertyState: text(input.propertyState, 2)?.toUpperCase() ?? null,
    // Deliberately short. A note is a reason, not a place to put a report.
    note: text(input.note, 300),
  };
}

/**
 * Whether a stored entry looks like it has been tampered with by growth.
 *
 * Used by a test rather than at runtime: the property being protected is that
 * nothing ever adds a field to this record without somebody deciding to. A
 * report body arriving in an audit entry would be the worst version of that,
 * because this is the record kept longest.
 */
export const AUDIT_FIELDS: readonly (keyof AuditRecord)[] = [
  'id', 'at', 'event', 'orderId', 'landlordEmail', 'certifiedBy',
  'permissiblePurpose', 'provider', 'providerRef', 'applicantName',
  'applicantEmail', 'propertyState', 'note',
];
