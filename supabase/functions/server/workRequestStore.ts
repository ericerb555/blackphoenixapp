/**
 * Where work requests actually live.
 *
 * WHY THIS IS ITS OWN MODULE
 *
 * They are stored under `wr:{id}` behind a `wr_index` list, with an older array
 * and an optional table alongside holding records that never reached it. All
 * three are merged, because they are three generations of the same store and
 * a job is no less real for having been raised before the current one existed.
 * Knowing all of that is not obvious, and the cost of guessing wrong is silent:
 * a second reader that looks at the wrong prefix returns an empty list rather
 * than an error, so everything downstream of it simply has no work requests and
 * nobody is told why.
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
  const legacy: any[] = ((await kv.get("all_work_requests")) as any[]) || [];

  const indexed: any[] = index.length
    ? ((await Promise.all(index.map((id) => kv.get(`wr:${id}`)))).filter(Boolean) as any[])
    : [];

  /**
   * THE LEGACY ARRAY IS MERGED, NOT FALLEN BACK TO.
   *
   * This read `index.length ? indexed : legacy` — an either/or. The index is
   * empty on a system that has never used it, so the old array was read and
   * everything showed up, which is why it looked correct.
   *
   * It was one submission away from not being. The moment `persistWorkRequest`
   * writes the first indexed record, `wr_index` has one entry, the truthy
   * branch is taken, and every record that exists only in the old array stops
   * being returned — by the pipeline, by the customer's own list, and by the
   * design centre, all of which come through here.
   *
   * On this project that is not hypothetical: two real jobs from June live only
   * in that array, one of them assigned to a customer. They were visible only
   * because nothing had been submitted since. Merging costs one extra read and
   * removes the cliff entirely.
   */
  const byId = new Map<string, any>();

  // Freshest first: an indexed record is what a PUT updates, so it wins over an
  // older copy of the same id sitting in the array.
  for (const record of indexed) if (record?.id) byId.set(record.id, record);
  for (const record of legacy) if (record?.id && !byId.has(record.id)) byId.set(record.id, record);

  if (sb) {
    try {
      const { data } = await sb
        .from("work_requests")
        .select("data")
        .order("created_at", { ascending: false })
        .limit(500);
      for (const row of data || []) {
        const record = row?.data;
        if (record?.id && !byId.has(record.id)) byId.set(record.id, record);
      }
    } catch {
      // The key-value store remains the durable fallback when the optional
      // table is absent, which it is in most environments.
    }
  }

  return [...byId.values()];
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
