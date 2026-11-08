/**
 * Reading, owning and saving a work request.
 *
 * WHY THIS IS ITS OWN FILE
 *
 * `persistWorkRequest` is the single point every work request passes through,
 * whichever door it came in by — the public form, the tenant portal, the
 * landlord inspection, staff typing one in. That makes it the one place a
 * request can be stamped with a job and the one place an urgent request can
 * open a call, which is why those hooks live in it rather than on a route.
 *
 * It was in the middle of `index.tsx`, so the rental and portal routes that
 * save work requests were pinned there with it. Moved out as a prerequisite
 * for lifting that block; see `tasks/phoenix-ai-audit.md`.
 *
 * NOT TO BE CONFUSED WITH `workRequestStore.ts`
 *
 * That module owns the question "where do work requests live", and
 * `readWorkRequests` here delegates to it rather than answering it a second
 * time — it used to answer it, reading a prefix nothing was stored under.
 * This module owns the write path and the authority check around it.
 *
 * The bodies are unchanged from `index.tsx`.
 */
import * as kv from "./kv_store.tsx";
import { createClient } from "npm:@supabase/supabase-js@2";
import { intakeActor, intakeIsAdmin } from "./identity.ts";
import { readWorkRequests as readWorkRequestsShared } from "./workRequestStore.ts";
import { ensureJobId } from "./jobs.tsx";
import { openCallFor } from "./on-call.tsx";

/** Service-role client, built on first use. Same shape as `identity.ts`. */
let cached: any = null;
function supabaseClient() {
  if (!cached) {
    cached = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
  }
  return cached;
}

export async function workRequestActor(c: any) {
  const user = await intakeActor(c);
  return { user, admin: await intakeIsAdmin(user) };
}

export function ownsWorkRequest(record: any, user: any) {
  const email = String(user?.email || '').toLowerCase();
  return Boolean(
    (user?.id && (record.user_id === user.id || record.userId === user.id)) ||
    (email && [record.client_email, record.clientEmail, record.client_info?.email, record.email]
      .some((value: any) => String(value || '').toLowerCase() === email))
  );
}

/**
 * Delegates to the shared reader so this is not the second place that knows
 * where work requests live. It was, and the other place was reading a prefix
 * nothing is stored under.
 */
export async function readWorkRequests() {
  return await readWorkRequestsShared(supabaseClient());
}

/**
 * Every work request goes through here, on create and on update, which makes
 * it the one place a work request can be given its job.
 *
 * A work request is the front door with nothing above it, so it opens a job
 * rather than inheriting one — unless the caller already put a jobId on the
 * record, which is how a second request can be added to work already under
 * way. `ensureJobId` never re-stamps, so an update keeps the job it had.
 */
export async function persistWorkRequest(record: any) {
  record.jobId = await ensureJobId(record, {
    seed: {
      customerEmail: record.client_email || record.clientEmail || record.email,
      customerName: record.client_name || record.clientName || record.customer_name,
      siteAddress: record.address || record.site_address || record.siteAddress || record.location,
      title: record.title || record.project_name || record.projectName,
      serviceType: record.serviceType || record.project_type || record.service_type,
      openedFrom: 'work_request',
      openedFromId: record.id,
      createdBy: record.createdBy || record.client_email || record.clientEmail,
    },
  });
  await kv.set(`wr:${record.id}`, record);
  const index: string[] = (await kv.get('wr_index') as string[]) || [];
  if (!index.includes(record.id)) await kv.set('wr_index', [record.id, ...index].slice(0, 1000));
  const legacy = (await kv.get('all_work_requests') as any[]) || [];
  const nextLegacy = [record, ...legacy.filter((item: any) => item.id !== record.id)].slice(0, 500);
  await kv.set('all_work_requests', nextLegacy);
  try {
    await supabaseClient().from('work_requests').upsert([{
      id: record.id, client_name: record.client_name || '', client_email: record.client_email || '',
      client_phone: record.client_phone || '', user_id: record.user_id || null,
      service_type: record.serviceType || record.project_type || null,
      title: record.project_name || record.title || null, description: record.description || null,
      status: record.status || 'pending', data: record, created_at: record.created_at, updated_at: record.updated_at,
    }], { onConflict: 'id' });
  } catch (error: any) { console.warn('[Work Requests] Database mirror skipped:', error?.message); }

  /**
   * An urgent request is an emergency, and an emergency opens a call.
   *
   * Here rather than in the route because this is the one place every work
   * request lands, whichever portal it came from — the customer form, the
   * tenant portal, the landlord AI inspection, staff typing one in. A hook on
   * one route would answer for one door.
   *
   * It runs AFTER the job id is stamped, so the call carries the job and sits
   * with the quote and the invoice that follow it. openCallFor opens at most
   * one call per work request and never throws: this function saves work
   * requests for the whole platform, and losing one because the on-call store
   * had a bad moment is far worse than an emergency a person has to notice.
   */
  await openCallFor(record);
}
