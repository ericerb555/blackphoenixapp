/**
 * Phoenix Exchange — the six-month trial, counted without being faked.
 *
 * Eric: *"6 month trial, then three tiers"*, and earlier, *"a trial is use of
 * all components then it moves to tiers upon completion"*.
 *
 * WHY THIS IS A SEPARATE MODULE AND NOT A CHANGE TO cohortMembership
 *
 * Cohorts derive from the tier a grant names — `cohort-tier-{tierId}` — and a
 * trial carries no `tierId`, deliberately. Stamping one on would make an
 * account look as though it had chosen a rung it has not chosen, and
 * `resolveEntitlement` ranks a tier above a trial, so it would also change
 * what the account is served. That is a decision already taken and it is not
 * revisited here.
 *
 * The consequence was that a trial belonged to no cohort and was therefore
 * counted nowhere, which is a real gap when the entire launch is trials. The
 * answer is the one already written down: **count trials separately and say
 * so.** This module is that separate count.
 *
 * It is additive on purpose. `membershipFromGrant` and `monthlyRecurringCents`
 * are untouched, so no revenue figure anywhere moves by a cent — a trial is
 * worth zero and keeps being worth zero. What changes is that trials can now
 * be listed, counted, and chased before they expire.
 *
 * WHY CHASING THEM MATTERS MORE THAN LISTING THEM
 *
 * Six months is a long time to take no money, and a silent trial converts
 * badly: if leads do not visibly arrive in the first months, the business has
 * mentally left long before the bill. So the checkpoints are part of the
 * model rather than a marketing afterthought, and the number that actually
 * predicts conversion is time-to-first-real-lead, not the length of the
 * trial.
 */

/** Eric's length, and the value already sitting in `territory-cohorts.tsx`. */
export const TRIAL_MONTHS = 6;

/** A trial is worth nothing, and must keep being worth nothing in every total. */
export const TRIAL_MONTHLY_CENTS = 0;

/**
 * Where trials are counted.
 *
 * A bucket, not a tier. It exists so a screen can say "41 businesses on
 * trial, 12 converting in March" instead of showing one member across the
 * whole platform and reading as broken. Nothing prices against it.
 */
export const TRIAL_COHORT_ID = 'cohort-exchange-trial';

/**
 * When to get in touch during a trial, in months from the start.
 *
 * One — did anything reach you yet, and is your profile finished. Three —
 * here is what you have had, half way. Five — this is what it becomes, and
 * what you keep. Nothing at six: by then the decision is already made.
 */
export const CHECKPOINT_MONTHS = [1, 3, 5] as const;
export type CheckpointMonth = (typeof CHECKPOINT_MONTHS)[number];

export interface TrialGrant {
  email?: string;
  orgId?: string;
  status?: string;
  tierId?: string;
  trialStart?: string;
  trialEnd?: string;
  /** Checkpoints already sent, as month numbers. */
  checkpointsSent?: number[];
}

export type TrialState = 'none' | 'running' | 'expired' | 'converted' | 'revoked';

// ── dates ────────────────────────────────────────────────────────────────────

/**
 * Add whole months, clamping the day rather than rolling into the next month.
 *
 * A trial started on 31 August ends on 28 February, not 3 March. Rolling over
 * would make a handful of trials a few days longer than everyone else's, and
 * the bug would only ever show up on month ends.
 */
export function addMonths(iso: string, months: number): string | null {
  const start = new Date(iso);
  if (Number.isNaN(start.getTime())) return null;

  const day = start.getUTCDate();
  const target = new Date(Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth() + months,
    1,
    start.getUTCHours(),
    start.getUTCMinutes(),
    start.getUTCSeconds(),
    start.getUTCMilliseconds(),
  ));

  const lastDay = new Date(Date.UTC(
    target.getUTCFullYear(), target.getUTCMonth() + 1, 0,
  )).getUTCDate();

  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString();
}

/** When a trial that started then should finish. */
export function trialEndFor(startIso: string, months = TRIAL_MONTHS): string | null {
  return addMonths(startIso, months);
}

const MS_PER_DAY = 86_400_000;

/** Whole days left, floored, never negative. */
export function daysRemaining(endIso: string | null | undefined, now = new Date()): number {
  const end = Date.parse(String(endIso ?? ''));
  if (!Number.isFinite(end)) return 0;
  return Math.max(0, Math.floor((end - now.getTime()) / MS_PER_DAY));
}

// ── state ────────────────────────────────────────────────────────────────────

/**
 * What this grant is, as far as the trial is concerned.
 *
 * `converted` comes before `running` deliberately: a business that signed up
 * to a tier part way through its trial is a customer, not a trialist, and
 * chasing them with "your trial ends soon" would be both wrong and annoying.
 */
export function trialState(grant: TrialGrant | null | undefined, now = new Date()): TrialState {
  if (!grant) return 'none';

  const status = String(grant.status ?? '').toLowerCase();
  if (status && status !== 'active') return 'revoked';

  if (String(grant.tierId ?? '').trim()) return 'converted';

  const start = String(grant.trialStart ?? '').trim();
  if (!start) return 'none';

  const end = String(grant.trialEnd ?? '').trim() || trialEndFor(start);
  const ends = Date.parse(String(end ?? ''));
  if (!Number.isFinite(ends)) return 'none';

  return ends > now.getTime() ? 'running' : 'expired';
}

export interface TrialRecord {
  email?: string;
  orgId?: string;
  start: string;
  end: string;
  daysLeft: number;
  monthlyCents: number;
  cohortId: string;
  /** The checkpoint that should go out now, if any. */
  checkpointDue: CheckpointMonth | null;
}

/**
 * Which checkpoint is owed right now.
 *
 * The latest one whose month has passed and which has not already been sent,
 * so a trial that nobody contacted for four months gets the three-month
 * message rather than three messages at once.
 */
export function checkpointDue(
  grant: TrialGrant,
  now = new Date(),
): CheckpointMonth | null {
  const start = String(grant?.trialStart ?? '').trim();
  if (!start) return null;

  const sent = new Set((grant?.checkpointsSent ?? []).map(Number));

  let due: CheckpointMonth | null = null;
  for (const month of CHECKPOINT_MONTHS) {
    if (sent.has(month)) continue;
    const at = Date.parse(String(addMonths(start, month) ?? ''));
    if (Number.isFinite(at) && at <= now.getTime()) due = month;
  }
  return due;
}

/**
 * Every running trial, soonest to expire first — which is the order anybody
 * working the list wants them in.
 */
export function trialRoster(
  grants: ReadonlyArray<TrialGrant | null | undefined>,
  now = new Date(),
): TrialRecord[] {
  const out: TrialRecord[] = [];

  for (const grant of grants ?? []) {
    if (!grant || trialState(grant, now) !== 'running') continue;

    const start = String(grant.trialStart ?? '').trim();
    const end = String(grant.trialEnd ?? '').trim() || trialEndFor(start) || '';

    out.push({
      email: grant.email,
      orgId: grant.orgId,
      start,
      end,
      daysLeft: daysRemaining(end, now),
      monthlyCents: TRIAL_MONTHLY_CENTS,
      cohortId: TRIAL_COHORT_ID,
      checkpointDue: checkpointDue(grant, now),
    });
  }

  return out.sort((a, b) => a.daysLeft - b.daysLeft);
}

export interface TrialSummary {
  running: number;
  expired: number;
  converted: number;
  /** Running trials finishing within the window. */
  endingSoon: number;
  /** Trials owed a checkpoint right now. */
  checkpointsDue: number;
  monthlyCents: number;
}

/**
 * The line a cohort screen should show instead of pretending trials are
 * members of a tier they never chose.
 *
 * `monthlyCents` is zero and is returned anyway, so that anything summing
 * across cohorts picks up the honest number rather than omitting the bucket
 * and leaving somebody to wonder whether it was forgotten.
 */
export function summariseTrials(
  grants: ReadonlyArray<TrialGrant | null | undefined>,
  now = new Date(),
  endingWithinDays = 30,
): TrialSummary {
  let running = 0, expired = 0, converted = 0, endingSoon = 0, checkpointsDue = 0;

  for (const grant of grants ?? []) {
    switch (trialState(grant, now)) {
      case 'running': {
        running += 1;
        const end = String(grant?.trialEnd ?? '').trim() ||
          trialEndFor(String(grant?.trialStart ?? '')) || '';
        if (daysRemaining(end, now) <= endingWithinDays) endingSoon += 1;
        if (grant && checkpointDue(grant, now) !== null) checkpointsDue += 1;
        break;
      }
      case 'expired':   expired += 1; break;
      case 'converted': converted += 1; break;
      default: break;
    }
  }

  return {
    running, expired, converted, endingSoon, checkpointsDue,
    monthlyCents: TRIAL_MONTHLY_CENTS,
  };
}
