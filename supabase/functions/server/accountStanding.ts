/**
 * accountStanding — whether an account may use its portal, and why not.
 *
 * WHY THIS IS A PURE MODULE
 *
 * It decides whether a paying customer can open their portal at all, which is
 * the most disruptive answer this server gives. Every branch of it needs to be
 * provable without a browser, a Stripe account or a signed-in session — so the
 * reading of records happens elsewhere and only the decision lives here.
 *
 * TWO DIFFERENT THINGS, KEPT APART ON PURPOSE
 *
 * A FREEZE is automatic and about money. Payment failed or went past due, and
 * the portal closes except for the parts needed to pay. The account lifts it
 * itself by paying.
 *
 * A DEACTIVATION is manual and about a person. Somebody with authority decided
 * this account should stop. Paying does not lift it, and it must not — if it
 * did, deactivation would mean nothing.
 *
 * Deactivation outranks a freeze, because it is a decision somebody made rather
 * than a state something drifted into.
 *
 * THE FIFTEEN DAYS
 *
 * Eric's number. Stripe retries a failed card for days, and this codebase
 * already argues against cutting service on the first miss: "cutting service
 * off on the first miss loses customers who simply need a new card". So the
 * warning shows from the first failure and the freeze lands on day fifteen.
 *
 * WHICH WAY IT FAILS
 *
 * The rule everywhere else in this server is fail closed. It is the wrong rule
 * for this one decision, and deliberately not followed: an unreadable record
 * failing closed would lock a paying customer out of their own portal. So a
 * freeze happens only when the account is POSITIVELY known to be past due.
 *
 * That is still fail-closed where it matters. Entitlements are decided by
 * `resolveEntitlement`, which grants nothing without proof. This module only
 * decides lockout, and on lockout the safe direction is open.
 */

/** Days past due before the portal freezes. Eric's number, not a default. */
export const GRACE_DAYS = 15;

export type StandingState = 'ok' | 'warning' | 'frozen' | 'deactivated';

export interface StandingInputs {
  /** `feature_grant:{email}` — carries `lastSubscriptionStatus` from Stripe. */
  grant?: { lastSubscriptionStatus?: string; pastDueSince?: string; status?: string } | null;
  /** The maintenance plan's billing block, when the account holds one. */
  planBilling?: { status?: string; lastFailureAt?: string } | null;
  /** `account_deactivation:{email}`, when somebody has switched this account off. */
  deactivation?: { active?: boolean; reason?: string; by?: string; at?: string } | null;
  /** From `trustedRole` — app_metadata only, never anything the browser wrote. */
  role?: string;
  now?: Date;
}

export interface Standing {
  state: StandingState;
  /** Plain English, shown to the account holder. */
  reason: string;
  /** When the account first went past due, if it did. */
  pastDueSince: string | null;
  /** When the freeze lands, if it has not already. */
  graceEndsAt: string | null;
  daysPastDue: number;
  /** Convenience for callers that only care whether to refuse. */
  blocked: boolean;
}

/**
 * Accounts that are never frozen for non-payment.
 *
 * Owners and administrators for the obvious reason. Employees because they pay
 * for nothing: freezing a technician's timesheet because the company card
 * failed would stop work and payroll for somebody who had no part in the bill.
 *
 * This reads the role resolved from `app_metadata`. It must never be given a
 * value the browser can write.
 */
export const NEVER_FROZEN_ROLES = new Set([
  'owner', 'platform_owner', 'business_owner',
  'admin', 'master_admin', 'super_admin', 'superadmin', 'management',
  'staff', 'employee', 'project_manager', 'estimator', 'office',
]);

/** Stripe subscription states that mean money is owed. */
const PAST_DUE_STATES = new Set(['past_due', 'unpaid', 'incomplete_expired']);

const asDate = (value: unknown): Date | null => {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isFinite(d.getTime()) ? d : null;
};

const DAY = 24 * 60 * 60 * 1000;

export function accountStanding(input: StandingInputs): Standing {
  const now = input.now || new Date();
  const role = String(input.role || '').toLowerCase().replace(/[\s-]+/g, '_');

  const clear: Standing = {
    state: 'ok', reason: '', pastDueSince: null, graceEndsAt: null,
    daysPastDue: 0, blocked: false,
  };

  /**
   * Deactivation first, and it applies to everybody.
   *
   * An owner may deactivate anyone, so this check cannot sit behind the staff
   * exemption below — otherwise deactivating an administrator would do nothing.
   */
  if (input.deactivation?.active) {
    return {
      state: 'deactivated',
      reason: input.deactivation.reason
        ? `This account has been deactivated: ${input.deactivation.reason}`
        : 'This account has been deactivated.',
      pastDueSince: null,
      graceEndsAt: null,
      daysPastDue: 0,
      blocked: true,
    };
  }

  // Nobody who works for the company is frozen over a bill.
  if (NEVER_FROZEN_ROLES.has(role)) return clear;

  const subscriptionState = String(input.grant?.lastSubscriptionStatus || '').toLowerCase();
  const planState = String(input.planBilling?.status || '').toLowerCase();
  const owing = PAST_DUE_STATES.has(subscriptionState) || PAST_DUE_STATES.has(planState);

  // Not positively known to be past due — see "which way it fails" above.
  if (!owing) return clear;

  /**
   * When the clock started.
   *
   * Without a date we know money is owed but not for how long, and the grace
   * period cannot be measured. Counting from now rather than guessing a past
   * date means such an account gets the full fifteen days from the moment we
   * noticed, which is the generous reading and the right one.
   */
  const since = asDate(input.grant?.pastDueSince)
    || asDate(input.planBilling?.lastFailureAt)
    || now;
  const graceEnds = new Date(since.getTime() + GRACE_DAYS * DAY);
  const daysPastDue = Math.max(0, Math.floor((now.getTime() - since.getTime()) / DAY));

  if (now.getTime() < graceEnds.getTime()) {
    const daysLeft = Math.max(1, Math.ceil((graceEnds.getTime() - now.getTime()) / DAY));
    return {
      state: 'warning',
      reason: `A payment on this account has not gone through. Please update it within ${daysLeft} day${daysLeft === 1 ? '' : 's'} to keep your portal open.`,
      pastDueSince: since.toISOString(),
      graceEndsAt: graceEnds.toISOString(),
      daysPastDue,
      blocked: false,
    };
  }

  return {
    state: 'frozen',
    reason: `This portal is on hold because a payment has not gone through. It reopens as soon as the balance is settled.`,
    pastDueSince: since.toISOString(),
    graceEndsAt: graceEnds.toISOString(),
    daysPastDue,
    blocked: true,
  };
}

/**
 * Who may switch off whose account.
 *
 * An owner may deactivate anyone but themselves — leaving nobody able to undo
 * it is not a state worth allowing. An administrator may deactivate employees
 * and nobody else: not an owner, not another administrator, and not a paying
 * tenant account.
 *
 * `actorRole` and `targetRole` must both come from `app_metadata`. Taking
 * either from the request body would let the caller name their own authority.
 */
const OWNER_ROLES = new Set(['owner', 'platform_owner', 'business_owner', 'master_admin']);
const ADMIN_ROLES = new Set(['admin', 'super_admin', 'superadmin', 'management']);
const EMPLOYEE_ROLES = new Set(['employee', 'staff', 'project_manager', 'estimator', 'office']);

export function mayDeactivate(
  actor: { role: string; email: string },
  target: { role: string; email: string },
): { allowed: boolean; reason: string } {
  const actorRole = String(actor.role || '').toLowerCase().replace(/[\s-]+/g, '_');
  const targetRole = String(target.role || '').toLowerCase().replace(/[\s-]+/g, '_');
  const actorEmail = String(actor.email || '').toLowerCase();
  const targetEmail = String(target.email || '').toLowerCase();

  if (!actorEmail || !targetEmail) {
    return { allowed: false, reason: 'Both accounts must be identified.' };
  }
  if (actorEmail === targetEmail) {
    return { allowed: false, reason: 'You cannot deactivate your own account.' };
  }

  if (OWNER_ROLES.has(actorRole)) {
    return { allowed: true, reason: '' };
  }

  if (ADMIN_ROLES.has(actorRole)) {
    if (EMPLOYEE_ROLES.has(targetRole)) return { allowed: true, reason: '' };
    return {
      allowed: false,
      reason: 'Administrators may deactivate employee accounts. Only an owner can deactivate this one.',
    };
  }

  return { allowed: false, reason: 'Administrator access is required.' };
}
