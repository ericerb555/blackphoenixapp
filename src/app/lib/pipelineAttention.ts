/**
 * pipelineAttention — which jobs need somebody to do something, and why.
 *
 * WHY THIS IS A MODULE AND NOT INLINE ON THE BOARD
 *
 * The board shows five columns of equal weight, so a job untouched since June
 * looks exactly like one raised this morning. Deciding which of those is stuck
 * is the whole point of the screen for an owner, and it is arithmetic over
 * dates — which means it can be proven here rather than squinted at there.
 *
 * WHAT IT REFUSES TO DO
 *
 * Flag anything it cannot evidence. A rule whose date is missing does not fire:
 * a quote with no `sentAt` is not "sent 400 days ago", it is a quote we cannot
 * say was ever sent, and inventing an age for it would put noise on the one
 * screen that has to be trustworthy. Silence is better than a wrong flag,
 * because a rail full of false alarms gets ignored and then the real one is
 * missed too.
 *
 * THE THRESHOLDS ARE ERIC'S
 *
 * Agreed 2026-09-26. They are business policy, not engineering defaults, so
 * they live here as named constants rather than scattered through the view.
 */

/** Days a thing may sit before it wants attention. */
export const ATTENTION_DAYS = {
  /** A work request nobody has quoted. */
  unquoted: 2,
  /** A quote written and never sent. */
  draftNotSent: 3,
  /** A quote sent with no answer back. */
  sentNoAnswer: 7,
  /** Approved, with no contract raised. */
  approvedNoContract: 3,
  /** Signed, with nothing invoiced. */
  signedNotInvoiced: 2,
} as const;

export type AttentionSeverity = 'urgent' | 'warn';

export interface AttentionFlag {
  /** Stable key, used to filter the board to this flag. */
  id: string;
  /** What the rail calls it. */
  label: string;
  /** What the card says, in words somebody can act on. */
  reason: string;
  severity: AttentionSeverity;
  /** How long it has been like this, where that is known. */
  days?: number;
}

const DAY = 24 * 60 * 60 * 1000;

/** A date we can actually use, or null. Never a guess. */
const when = (value: unknown): Date | null => {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isFinite(d.getTime()) ? d : null;
};

const daysSince = (value: unknown, now: Date): number | null => {
  const d = when(value);
  if (!d) return null;
  return Math.floor((now.getTime() - d.getTime()) / DAY);
};

const plural = (n: number) => `${n} day${n === 1 ? '' : 's'}`;

/**
 * Everything wrong with one job, worst first.
 *
 * `item` is deliberately loose: this runs over pipeline items that have been
 * through several generations of shape, and reading a field that is not there
 * must produce no flag rather than a crash.
 */
export function attentionFor(item: any, now: Date = new Date()): AttentionFlag[] {
  const flags: AttentionFlag[] = [];
  if (!item) return flags;

  const stage = String(item.stage || '');
  const quote = item.quote;
  const contract = item.contract;
  const invoice = item.invoice;

  /* ── nobody owns it ──────────────────────────────────────────────────── */
  const owner = String(item.assignedTo || '').trim();
  if (!owner) {
    flags.push({
      id: 'unowned',
      label: 'No owner',
      reason: 'Nobody is assigned to this job.',
      severity: 'warn',
    });
  }

  /* ── raised and never quoted ─────────────────────────────────────────── */
  if (!quote && (stage === 'quote-draft' || stage === 'work-request')) {
    const age = daysSince(item.createdDate, now);
    if (age !== null && age >= ATTENTION_DAYS.unquoted) {
      flags.push({
        id: 'unquoted',
        label: 'Not quoted',
        reason: `Raised ${plural(age)} ago with no quote.`,
        severity: age >= ATTENTION_DAYS.unquoted * 3 ? 'urgent' : 'warn',
        days: age,
      });
    }
  }

  /* ── quoted and never sent ───────────────────────────────────────────── */
  if (quote && !quote.sentAt && stage === 'quote-draft') {
    /**
     * Aged from when the quote was written, falling back to when the job was
     * raised. Not from "now minus nothing" — a quote with no date at all is
     * not evidence of neglect.
     */
    const age = daysSince(quote.generatedAt, now) ?? daysSince(item.createdDate, now);
    if (age !== null && age >= ATTENTION_DAYS.draftNotSent) {
      flags.push({
        id: 'not-sent',
        label: 'Quote not sent',
        reason: `Quote has been ready for ${plural(age)} and has not gone out.`,
        severity: 'urgent',
        days: age,
      });
    }
  }

  /* ── sent and no answer ──────────────────────────────────────────────── */
  if (quote?.sentAt && !quote.approvedAt && !quote.rejectedAt) {
    const age = daysSince(quote.sentAt, now);
    if (age !== null && age >= ATTENTION_DAYS.sentNoAnswer) {
      flags.push({
        id: 'no-answer',
        label: 'No answer',
        reason: quote.customerViewedAt
          ? `Sent ${plural(age)} ago. Seen by the customer, not answered.`
          : `Sent ${plural(age)} ago and not opened.`,
        severity: 'warn',
        days: age,
      });
    }
  }

  /* ── approved with no contract ───────────────────────────────────────── */
  if (stage === 'quote-approved' && !contract) {
    const age = daysSince(quote?.approvedAt, now) ?? daysSince(item.lastModified, now);
    if (age !== null && age >= ATTENTION_DAYS.approvedNoContract) {
      flags.push({
        id: 'no-contract',
        label: 'No contract',
        reason: `Approved ${plural(age)} ago with no contract raised.`,
        severity: 'urgent',
        days: age,
      });
    }
  }

  /* ── signed and not invoiced ─────────────────────────────────────────── */
  const signed = contract?.signedDate;
  if (signed && stage !== 'invoice' && stage !== 'payment') {
    const age = daysSince(signed, now);
    if (age !== null && age >= ATTENTION_DAYS.signedNotInvoiced) {
      flags.push({
        id: 'not-invoiced',
        label: 'Not invoiced',
        reason: `Signed ${plural(age)} ago and nothing has been invoiced.`,
        severity: 'urgent',
        days: age,
      });
    }
  }

  /* ── money owed ──────────────────────────────────────────────────────── */
  const due = when(invoice?.dueDate);
  const paid = String(invoice?.status || '').toLowerCase() === 'paid' || Boolean(invoice?.paidAt);
  if (due && !paid && due.getTime() < now.getTime()) {
    const over = Math.floor((now.getTime() - due.getTime()) / DAY);
    flags.push({
      id: 'overdue',
      label: 'Payment overdue',
      reason: over >= 1 ? `Invoice is ${plural(over)} past due.` : 'Invoice is past its due date.',
      severity: 'urgent',
      days: over,
    });
  }

  // Worst first, so a card shows its most serious problem before its least.
  return flags.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'urgent' ? -1 : 1));
}

/** Every flag across the board, counted — what the rail renders. */
export function attentionCounts(
  items: any[],
  now: Date = new Date(),
): Array<{ id: string; label: string; count: number; severity: AttentionSeverity }> {
  const byId = new Map<string, { id: string; label: string; count: number; severity: AttentionSeverity }>();
  for (const item of items || []) {
    for (const flag of attentionFor(item, now)) {
      const seen = byId.get(flag.id);
      if (seen) {
        seen.count += 1;
        if (flag.severity === 'urgent') seen.severity = 'urgent';
      } else {
        byId.set(flag.id, { id: flag.id, label: flag.label, count: 1, severity: flag.severity });
      }
    }
  }
  return [...byId.values()].sort((a, b) =>
    a.severity === b.severity ? b.count - a.count : a.severity === 'urgent' ? -1 : 1,
  );
}
