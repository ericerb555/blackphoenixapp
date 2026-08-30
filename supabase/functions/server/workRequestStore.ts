/**
 * Where work requests actually live.
 *
 * WHY THIS IS ITS OWN MODULE
 *
 * They are stored under `wr:{id}` behind a `wr_index` list, with two fallbacks
 * beneath that for records written before the index existed. Knowing all of
 * that is not obvious, and the cost of guessing wrong is silent: a second
 * reader that looks at the wrong prefix returns an empty list rather than an
 * error, so everything downstream of it simply has no work requests and nobody
 * is told why.
 *
 * That is exactly what had happened. `design-links` read a `work_request:`
 * prefix that is never written to anywhere — the only other uses of that string
 * in the codebase are notification dedupe keys — so the design centre's view of
 * a customer returned no work requests for anybody, always. The design centre
 * could not be attached to a job because it could not see that jobs existed.
 *
 * So there is one reader, here, and both callers use it.
 */

import * as kv from "./kv_store.tsx";

/**
 * Every work request, newest first where the index preserves that order.
 *
 * `sb` is an optional Supabase client. When one is passed, an optional
 * `work_requests` table is merged in for records that never reached the
 * key-value store. It is a merge rather than a replacement because the KV copy
 * is the durable one — the table may not exist at all.
 */
export async function readWorkRequests(sb?: any): Promise<any[]> {
  const index: string[] = ((await kv.get("wr_index")) as string[]) || [];

  let all: any[] = index.length
    ? ((await Promise.all(index.map((id) => kv.get(`wr:${id}`)))).filter(Boolean) as any[])
    : ((await kv.get("all_work_requests")) as any[]) || [];

  if (sb) {
    try {
      const { data } = await sb
        .from("work_requests")
        .select("data")
        .order("created_at", { ascending: false })
        .limit(500);
      const present = new Set(all.map((record: any) => record?.id));
      all = [
        ...all,
        ...((data || [])
          .map((row: any) => row.data)
          .filter((record: any) => record && !present.has(record.id))),
      ];
    } catch {
      // The key-value store remains the durable fallback when the optional
      // table is absent, which it is in most environments.
    }
  }

  return all;
}

/**
 * Does this work request belong to this customer?
 *
 * Matched on id first and email second, because records raised before a
 * customer record existed carry only an address to reply to. The field names
 * are inconsistent across the app's history, which is why every spelling is
 * checked rather than the one that happens to be current.
 */
export function workRequestBelongsTo(
  record: any,
  customerId: string,
  email: string,
): boolean {
  const id = String(record?.customerId ?? record?.customer_id ?? "").trim();
  if (id && customerId && id === customerId) return true;

  const target = String(email || "").trim().toLowerCase();
  if (!target) return false;

  return [
    record?.clientEmail,
    record?.client_email,
    record?.customerEmail,
    record?.customer_email,
    record?.client_info?.email,
    record?.email,
  ].some((value: any) => String(value || "").trim().toLowerCase() === target);
}
