/**
 * Who may approve what, and whether a proposal may still run.
 *
 * WHY THIS IS SPLIT OUT
 *
 * Same reason as `aiCeiling.ts` and `aiKillSwitchRules.ts`: the module that
 * does the database work imports the Supabase client, which `node --test`
 * cannot load. These are the rules that stand between a language model and
 * the company's mail sender, so "we read them carefully" is not the standard
 * they should be held to.
 */

export type ActionStatus =
  | 'pending' | 'approved' | 'rejected' | 'executed' | 'failed' | 'expired';

export type ActionRisk = 'low' | 'medium' | 'high';

export interface ActionRequest {
  id: string;
  agent: string;
  requestedBy: string | null;
  action: string;
  params: Record<string, unknown>;
  summary: string;
  risk: ActionRisk;
  status: ActionStatus;
  createdAt: string;
  expiresAt: string;
  decidedBy?: string | null;
}

/**
 * Who is allowed to say yes.
 *
 * Risk is set by the server from the action type, never by the model, so
 * this cannot be talked down by a proposal that describes itself as
 * harmless.
 *
 * `high` is owner-only for the same reason releasing the emergency stop is:
 * the decisions that cannot be taken back want a name against them.
 */
export function canApprove(
  risk: ActionRisk, approver: { email: string; isStaff: boolean; isOwner: boolean },
): { allowed: boolean; reason?: string } {
  if (!approver.isStaff) {
    return { allowed: false, reason: 'Approving an AI action requires a company account.' };
  }
  if (risk === 'high' && !approver.isOwner) {
    return {
      allowed: false,
      reason: 'This action moves money or cannot be undone, so it needs a platform owner to approve it.',
    };
  }
  return { allowed: true };
}

/**
 * Nobody approves their own proposal — including the AI.
 *
 * The agent is not a person and cannot hold an account, so in practice this
 * guards a subtler case: a route that let the assistant pass an approver
 * email through from its own context would turn the queue into a formality.
 * The approver must be the authenticated caller of the approve route, and
 * that is asserted here rather than assumed there.
 */
export function approverIsIndependent(
  request: Pick<ActionRequest, 'agent'>, approverEmail: string,
): boolean {
  const who = String(approverEmail || '').trim().toLowerCase();
  if (!who) return false;
  // An agent name is never an email; a proposal "approved by" one means the
  // server passed its own identity in, which is the bug this catches.
  if (who === String(request.agent || '').toLowerCase()) return false;
  return who.includes('@');
}

/** Has this proposal gone stale? */
export function isExpired(request: Pick<ActionRequest, 'expiresAt'>, now: number = Date.now()): boolean {
  const at = Date.parse(request.expiresAt);
  if (!Number.isFinite(at)) return true;   // unreadable expiry is a refusal
  return now > at;
}

/**
 * May this request be executed right now?
 *
 * Deliberately strict and deliberately explicit about why — a refusal that
 * says "not allowed" sends somebody to read the code.
 */
export function canExecute(
  request: Pick<ActionRequest, 'status' | 'expiresAt'>, now: number = Date.now(),
): { allowed: boolean; reason?: string } {
  if (request.status === 'executed') {
    return { allowed: false, reason: 'This has already run. Propose it again if you want it repeated.' };
  }
  if (request.status === 'rejected') return { allowed: false, reason: 'This was rejected.' };
  if (request.status === 'failed') {
    return { allowed: false, reason: 'This already ran and failed. Propose it again rather than retrying blind.' };
  }
  if (request.status === 'pending') {
    return { allowed: false, reason: 'This has not been approved yet.' };
  }
  if (request.status === 'expired') return { allowed: false, reason: 'This proposal expired before it was approved.' };
  if (request.status !== 'approved') return { allowed: false, reason: `Unexpected status: ${request.status}` };
  if (isExpired(request, now)) {
    return {
      allowed: false,
      reason: 'This was approved but the proposal has since expired. The facts behind it may have changed; propose it again.',
    };
  }
  return { allowed: true };
}

/**
 * Which transitions are legal.
 *
 * Written as a table rather than scattered `if`s so that adding a state
 * means editing one place and seeing every edge at once. `executed` and
 * `rejected` are terminal — an executed action cannot be un-executed by
 * changing a row.
 */
const TRANSITIONS: Record<ActionStatus, ActionStatus[]> = {
  pending: ['approved', 'rejected', 'expired'],
  approved: ['executed', 'failed', 'expired'],
  rejected: [],
  executed: [],
  failed: [],
  expired: [],
};

export function canTransition(from: ActionStatus, to: ActionStatus): boolean {
  return (TRANSITIONS[from] || []).includes(to);
}

/**
 * How long a proposal stays good.
 *
 * Twenty-four hours. "Chase these three invoices" is reasonable to approve
 * ten minutes later and unreasonable next week, by which time two may have
 * paid — and the approval would still be sitting there, valid.
 */
export const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export function expiryFrom(now: number = Date.now(), ttlMs = DEFAULT_TTL_MS): string {
  return new Date(now + ttlMs).toISOString();
}
