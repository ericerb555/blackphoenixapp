/**
 * Insurance and licences, and whether they have run out.
 *
 * WHY THIS IS NOT A DOCUMENTS FEATURE
 *
 * A certificate of insurance is not a file to keep — it is a date that decides
 * whether somebody may be on a site tomorrow. A subcontractor whose general
 * liability lapsed last month is a subcontractor who cannot work, and the
 * expensive version of finding that out is a claim on a job where nobody was
 * covered.
 *
 * So the useful part is not storage, it is the answer to "is this current, and
 * if not, how long has it not been". Everything here computes that answer.
 *
 * DATES, NOT TIMESTAMPS
 *
 * A policy expires on a day, not at an instant. Comparing an ISO timestamp
 * against `Date.now()` makes a certificate valid through the 31st expire during
 * the afternoon of the 30th for anybody west of UTC — which is everybody here.
 * Every comparison is done on the calendar date in whole days.
 */

export type ComplianceKind =
  | 'general_liability'
  | 'workers_comp'
  | 'auto_liability'
  | 'trade_license'
  | 'bond';

export const COMPLIANCE_LABELS: Record<ComplianceKind, string> = {
  general_liability: 'General liability insurance',
  workers_comp: "Workers' compensation",
  auto_liability: 'Commercial auto liability',
  trade_license: 'Trade licence',
  bond: 'Surety bond',
};

/**
 * What a subcontractor must hold to be sent to a site.
 *
 * General liability and workers' compensation are the two a general contractor
 * is asked for by their own insurer and by most owners. The rest are recorded
 * when held and are not treated as missing when absent — a sole trader with no
 * employees genuinely has no workers' compensation policy, and a trade licence
 * is a matter of which trade, so blanket-requiring everything would flag honest
 * companies as non-compliant.
 */
export const REQUIRED_KINDS: ComplianceKind[] = ['general_liability', 'workers_comp'];

/** Warn from here. Long enough to renew without rushing. */
export const EXPIRING_SOON_DAYS = 30;

export interface ComplianceRecord {
  kind: ComplianceKind;
  /** Who wrote the policy, or issued the licence. */
  issuer: string;
  /** Policy or licence number, as printed. */
  reference: string;
  /** ISO date, `YYYY-MM-DD`. The day it stops being valid. */
  expiresOn: string;
  /** Cover amount, where it is an insurance policy. */
  coverage?: number | null;
  documentUrl?: string | null;
  updatedAt?: string;
}

export type ComplianceState = 'valid' | 'expiring' | 'expired' | 'missing' | 'undated';

export interface ComplianceStatus {
  kind: ComplianceKind;
  label: string;
  state: ComplianceState;
  /** Negative once it has expired. Null when there is no usable date. */
  daysRemaining: number | null;
  required: boolean;
  message: string;
}

/** Midnight-anchored day number, so comparisons are in whole calendar days. */
function dayNumber(input: string | Date): number | null {
  const d = typeof input === 'string' ? parseDateOnly(input) : input;
  if (!d || isNaN(d.getTime())) return null;
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86_400_000);
}

/**
 * Parse `YYYY-MM-DD` without letting a timezone move it.
 *
 * `new Date('2026-10-01')` is midnight UTC, which is the evening of September
 * 30th in New Hampshire — so a policy good through October would read as
 * expiring a day early. Parsed as UTC calendar parts on purpose.
 */
function parseDateOnly(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || '').trim());
  if (!m) {
    const loose = new Date(String(value || ''));
    return isNaN(loose.getTime()) ? null : loose;
  }
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

/**
 * How many days until this expires. Zero means it expires today, which still
 * counts as valid — cover runs to the end of the day it names.
 */
export function daysUntil(expiresOn: string, today: Date = new Date()): number | null {
  const then = dayNumber(expiresOn);
  const now = dayNumber(today);
  if (then === null || now === null) return null;
  return then - now;
}

/** The state of one requirement, given what the provider has on file. */
export function statusFor(
  kind: ComplianceKind,
  record: ComplianceRecord | null | undefined,
  today: Date = new Date(),
): ComplianceStatus {
  const label = COMPLIANCE_LABELS[kind];
  const required = REQUIRED_KINDS.includes(kind);

  if (!record || !record.expiresOn) {
    return {
      kind, label, required,
      state: record ? 'undated' : 'missing',
      daysRemaining: null,
      message: record
        ? `${label} is on file with no expiry date, so it cannot be checked.`
        : `No ${label.toLowerCase()} on file.`,
    };
  }

  const days = daysUntil(record.expiresOn, today);
  if (days === null) {
    return {
      kind, label, required, state: 'undated', daysRemaining: null,
      message: `The expiry date on the ${label.toLowerCase()} could not be read.`,
    };
  }

  if (days < 0) {
    return {
      kind, label, required, state: 'expired', daysRemaining: days,
      message: `${label} expired ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago.`,
    };
  }
  if (days <= EXPIRING_SOON_DAYS) {
    return {
      kind, label, required, state: 'expiring', daysRemaining: days,
      message: days === 0
        ? `${label} expires today.`
        : `${label} expires in ${days} day${days === 1 ? '' : 's'}.`,
    };
  }
  return {
    kind, label, required, state: 'valid', daysRemaining: days,
    message: `${label} is current until ${record.expiresOn}.`,
  };
}

export interface ComplianceSummary {
  statuses: ComplianceStatus[];
  /** True when nothing required is missing, undated or expired. */
  clearToWork: boolean;
  /** The reasons they are not, in the words to put in front of somebody. */
  blockers: string[];
  /** Things that are current but will not be for long. */
  warnings: string[];
}

/**
 * The whole picture for one provider.
 *
 * `clearToWork` is deliberately strict about **required** cover and silent about
 * the rest: an expired trade licence a company recorded voluntarily is a warning,
 * not a reason to stop them, because we never asked for it. An expired general
 * liability is a blocker.
 *
 * Undated counts as a blocker for required cover, not as valid. A certificate
 * with no expiry recorded cannot be confirmed current, and treating unknown as
 * fine is how somebody ends up on a site without cover.
 */
export function summarise(
  records: ComplianceRecord[],
  today: Date = new Date(),
  kinds: ComplianceKind[] = Object.keys(COMPLIANCE_LABELS) as ComplianceKind[],
): ComplianceSummary {
  const byKind = new Map<ComplianceKind, ComplianceRecord>();
  for (const r of records || []) {
    if (r?.kind && COMPLIANCE_LABELS[r.kind]) byKind.set(r.kind, r);
  }

  const statuses = kinds.map((k) => statusFor(k, byKind.get(k), today));
  const blockers: string[] = [];
  const warnings: string[] = [];

  for (const s of statuses) {
    if (s.required && (s.state === 'expired' || s.state === 'missing' || s.state === 'undated')) {
      blockers.push(s.message);
    } else if (s.state === 'expiring') {
      warnings.push(s.message);
    } else if (!s.required && s.state === 'expired') {
      // Recorded voluntarily and now lapsed. Worth saying, not worth stopping
      // work over something we never asked for.
      warnings.push(s.message);
    }
  }

  return { statuses, clearToWork: blockers.length === 0, blockers, warnings };
}

/** Records that need chasing, soonest first — what a reminder run would send. */
export function needsAttention(
  records: ComplianceRecord[],
  today: Date = new Date(),
): ComplianceStatus[] {
  return summarise(records, today).statuses
    .filter((s) => s.state === 'expired' || s.state === 'expiring'
      || (s.required && (s.state === 'missing' || s.state === 'undated')))
    .sort((a, b) => (a.daysRemaining ?? -9999) - (b.daysRemaining ?? -9999));
}

/** Reject a date that is obviously wrong before it is stored. */
export function validExpiry(value: string, today: Date = new Date()): { ok: boolean; reason?: string } {
  const days = daysUntil(value, today);
  if (days === null) return { ok: false, reason: 'Give the expiry date as YYYY-MM-DD.' };
  // Twenty years out is a typo, not a policy — usually a mistyped year.
  if (days > 365 * 20) return { ok: false, reason: 'That expiry date is more than twenty years away — check the year.' };
  return { ok: true };
}
