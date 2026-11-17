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

/**
 * WHO MAY HAND OUT WHICH ROLE
 *
 * The companion to `mayDeactivate`, and the reason it had to exist: until
 * now nothing in this application could change an account's role at all.
 * `ensureAuthUser` stamped one at invitation and that was permanent. The
 * invite route's own refusal message — "use access control to change their
 * access" — pointed at a screen that did not exist.
 *
 * THE RULES, AND WHY EACH ONE
 *
 * An owner may assign anything on the list. An administrator may only move
 * somebody between employee-level roles: they can make an estimator a project
 * manager, and they cannot mint a second administrator or touch an owner.
 * Otherwise the first administrator could promote themselves a peer, and from
 * there the owner is outnumbered in their own company.
 *
 * NOBODY MAY CHANGE THEIR OWN ROLE, owner included. Self-promotion is the
 * obvious hole; self-DEMOTION is the one that actually bites — a sole owner
 * who picks the wrong entry from a dropdown locks themselves out of the screen
 * that would undo it, and no one left can put it back. `mayDeactivate` refuses
 * self-action for the same reason and this mirrors it deliberately.
 *
 * A role not on the list is refused rather than written. The role string is
 * read as authority all over this server, so an unrecognised one does not
 * fail safe — it lands in `app_metadata` and every `STAFF_ROLE_SET` check
 * quietly answers no, which looks exactly like a broken account.
 */
export const ASSIGNABLE_ROLES: readonly string[] = [
  'owner', 'admin', 'management', 'project_manager', 'estimator', 'office',
  'employee', 'staff',
];

const ASSIGNABLE = new Set(ASSIGNABLE_ROLES);

export function normalizeRole(role: string): string {
  return String(role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function mayAssignRole(
  actor: { role: string; email: string },
  target: { role: string; email: string },
  nextRole: string,
): { allowed: boolean; reason: string } {
  const actorRole = normalizeRole(actor.role);
  const targetRole = normalizeRole(target.role);
  const next = normalizeRole(nextRole);
  const actorEmail = String(actor.email || '').toLowerCase();
  const targetEmail = String(target.email || '').toLowerCase();

  if (!actorEmail || !targetEmail) {
    return { allowed: false, reason: 'Both accounts must be identified.' };
  }
  if (!ASSIGNABLE.has(next)) {
    return { allowed: false, reason: 'That is not a role this screen can assign.' };
  }
  if (actorEmail === targetEmail) {
    return { allowed: false, reason: 'You cannot change your own role. Ask another owner.' };
  }

  if (OWNER_ROLES.has(actorRole)) {
    return { allowed: true, reason: '' };
  }

  if (ADMIN_ROLES.has(actorRole)) {
    if (!EMPLOYEE_ROLES.has(targetRole)) {
      return {
        allowed: false,
        reason: 'Administrators may only change employee accounts. Only an owner can change this one.',
      };
    }
    if (!EMPLOYEE_ROLES.has(next)) {
      return {
        allowed: false,
        reason: 'Administrators may assign employee roles. Only an owner can grant this one.',
      };
    }
    return { allowed: true, reason: '' };
  }

  return { allowed: false, reason: 'Administrator access is required.' };
}

/**
 * WHAT ROLE SOMEBODY MAY BE INVITED AS.
 *
 * Separate from `mayAssignRole` because an invitee has no role yet, and the
 * rule that protects existing accounts ("an administrator may only touch
 * employees") would read a blank role as "not an employee" and refuse every
 * invitation an administrator sent. Same ceiling, different question: an
 * administrator may bring on crew, and may not bring on a peer.
 */
export function mayInviteAs(
  actor: { role: string; email: string },
  nextRole: string,
): { allowed: boolean; reason: string } {
  const actorRole = normalizeRole(actor.role);
  const next = normalizeRole(nextRole);

  if (!String(actor.email || '').trim()) {
    return { allowed: false, reason: 'The inviting account must be identified.' };
  }
  if (!ASSIGNABLE.has(next)) {
    return { allowed: false, reason: 'That is not a role an invitation can grant.' };
  }
  if (OWNER_ROLES.has(actorRole)) return { allowed: true, reason: '' };
  if (ADMIN_ROLES.has(actorRole)) {
    if (EMPLOYEE_ROLES.has(next)) return { allowed: true, reason: '' };
    return {
      allowed: false,
      reason: 'Administrators may invite employees. Only an owner can invite this one.',
    };
  }
  return { allowed: false, reason: 'Administrator access is required.' };
}
