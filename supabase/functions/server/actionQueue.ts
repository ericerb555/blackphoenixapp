/**
 * The approval queue: proposing, deciding, and running what was decided.
 *
 * The rules live in `actionQueueRules.ts` where tests can reach them; the
 * handlers live in `aiActions.ts`; this is the part that touches the
 * database and holds them together.
 *
 * THE ORDER OF OPERATIONS IS THE SAFETY
 *
 *   propose   validate the params, set the risk from the registry, write a
 *             pending row. Nothing happens.
 *   approve   check the approver may approve THIS risk, flip to approved.
 *             Still nothing happens.
 *   execute   re-read the row from the database, re-check it may run, then
 *             call the handler with the params AS STORED.
 *
 * That last step is the one that matters. Execution reads `params` back out
 * of the row rather than taking them from the approving request, so the
 * thing that runs is the thing that was reviewed. The database refuses to
 * let `params` change after insert, so even a bug here cannot swap them.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  canApprove, canExecute, canTransition, approverIsIndependent, expiryFrom,
  type ActionRequest, type ActionRisk, type ActionStatus,
} from "./actionQueueRules.ts";
import { ACTIONS, knownAction, riskOf } from "./aiActions.ts";

let cached: any = null;
function admin() {
  if (!cached) {
    cached = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
  }
  return cached;
}

const TABLE = 'ai_action_request';

function toRequest(row: any): ActionRequest {
  return {
    id: String(row.id),
    agent: row.agent,
    requestedBy: row.requested_by ?? null,
    action: row.action,
    params: row.params || {},
    summary: row.summary,
    risk: row.risk as ActionRisk,
    status: row.status as ActionStatus,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    decidedBy: row.decided_by ?? null,
  };
}

export interface ProposeInput {
  agent: string;
  requestedBy?: string | null;
  action: string;
  params: Record<string, unknown>;
  summary: string;
}

/**
 * Write a proposal. Returns the row, or the reason it was refused.
 *
 * Refusing here rather than at approval time is deliberate: a malformed
 * proposal that reaches the queue costs somebody the attention of reading
 * it before discovering it could never have run.
 */
export async function proposeAction(
  input: ProposeInput,
): Promise<{ ok: boolean; request?: ActionRequest; error?: string }> {
  if (!knownAction(input.action)) {
    return { ok: false, error: `There is no action called "${input.action}".` };
  }
  const handler = ACTIONS[input.action];
  const check = handler.validate(input.params || {});
  if (!check.ok) return { ok: false, error: check.error || 'Those details are not usable.' };

  const summary = String(input.summary || '').trim().slice(0, 500);
  if (!summary) return { ok: false, error: 'A proposal needs a one-line summary a person can read.' };

  try {
    const { data, error } = await admin().from(TABLE).insert({
      agent: input.agent,
      requested_by: input.requestedBy || null,
      action: input.action,
      params: input.params || {},
      summary,
      // From the registry, never from the caller.
      risk: riskOf(input.action),
      status: 'pending',
      expires_at: expiryFrom(),
    }).select('*').single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, request: toRequest(data) };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function listActions(
  status: ActionStatus | 'all' = 'pending', limit = 25,
): Promise<ActionRequest[]> {
  let q = admin().from(TABLE).select('*').order('created_at', { ascending: false }).limit(limit);
  if (status !== 'all') q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data || []).map(toRequest);
}

export async function getAction(id: string): Promise<ActionRequest | null> {
  const { data, error } = await admin().from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toRequest(data) : null;
}

export interface Approver { email: string; isStaff: boolean; isOwner: boolean }

/**
 * Approve and immediately execute.
 *
 * One step, because two would mean a window in which something is approved
 * and not yet done, and somebody would have to decide what that state
 * means. The decision and the act are recorded separately on the row either
 * way, so the audit trail is unchanged.
 */
export async function approveAndRun(
  id: string, approver: Approver, note?: string,
): Promise<{ ok: boolean; result?: string; error?: string; request?: ActionRequest }> {
  const request = await getAction(id);
  if (!request) return { ok: false, error: 'No such proposal.' };

  if (!canTransition(request.status, 'approved')) {
    return { ok: false, error: `This is ${request.status}; it cannot be approved now.` };
  }
  const allowed = canApprove(request.risk, approver);
  if (!allowed.allowed) return { ok: false, error: allowed.reason };
  if (!approverIsIndependent(request, approver.email)) {
    return { ok: false, error: 'An approval has to come from a signed-in person.' };
  }

  const decidedAt = new Date().toISOString();
  const { error: upErr } = await admin().from(TABLE).update({
    status: 'approved', decided_by: approver.email, decided_at: decidedAt,
    decision_note: (note || '').slice(0, 500) || null,
  }).eq('id', id).eq('status', 'pending');     // lost-update guard
  if (upErr) return { ok: false, error: upErr.message };

  /**
   * Re-read before running.
   *
   * The row is fetched again rather than reusing the object above, so the
   * params that reach the handler came out of the database after the
   * approval was recorded. Belt and braces over the immutability trigger,
   * and the cost is one query on a path a human just waited for anyway.
   */
  const fresh = await getAction(id);
  if (!fresh) return { ok: false, error: 'The proposal vanished between approving and running it.' };
  const runnable = canExecute(fresh);
  if (!runnable.allowed) {
    await admin().from(TABLE).update({ status: 'failed', error: runnable.reason }).eq('id', id);
    return { ok: false, error: runnable.reason, request: fresh };
  }

  try {
    const result = await ACTIONS[fresh.action].run(fresh.params, { approvedBy: approver.email });
    await admin().from(TABLE).update({
      status: 'executed', executed_at: new Date().toISOString(), result: String(result).slice(0, 1000),
    }).eq('id', id);
    return { ok: true, result: String(result), request: fresh };
  } catch (e: any) {
    const message = e?.message || String(e);
    await admin().from(TABLE).update({
      status: 'failed', executed_at: new Date().toISOString(), error: message.slice(0, 1000),
    }).eq('id', id);
    return { ok: false, error: message, request: fresh };
  }
}

export async function rejectAction(
  id: string, approver: Approver, note?: string,
): Promise<{ ok: boolean; error?: string }> {
  const request = await getAction(id);
  if (!request) return { ok: false, error: 'No such proposal.' };
  if (!approver.isStaff) return { ok: false, error: 'Deciding on an AI action requires a company account.' };
  if (!canTransition(request.status, 'rejected')) {
    return { ok: false, error: `This is ${request.status}; it cannot be rejected now.` };
  }
  const { error } = await admin().from(TABLE).update({
    status: 'rejected', decided_by: approver.email, decided_at: new Date().toISOString(),
    decision_note: (note || '').slice(0, 500) || null,
  }).eq('id', id).eq('status', 'pending');
  return error ? { ok: false, error: error.message } : { ok: true };
}

/**
 * Mark stale proposals expired.
 *
 * Cheap, and called when the queue is listed rather than on a schedule —
 * the only thing that reads these is a person opening the queue, so that is
 * the moment the distinction matters.
 */
export async function expireStale(): Promise<number> {
  const { data, error } = await admin().from(TABLE)
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString())
    .select('id');
  if (error) return 0;
  return (data || []).length;
}
