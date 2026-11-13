/**
 * Reading and writing the list of services we take first refusal on.
 *
 * The rules live in `exchangeServices.ts` and are tested there; this is the
 * storage and the two routes, which decide nothing.
 *
 * STAFF ONLY, BOTH WAYS. The read as much as the write: the list of work
 * Black Phoenix intends to take before anybody else sees it is commercial
 * information about how the exchange is being run, and a competitor on the
 * platform reading it learns which jobs never reach them untouched.
 */
import { Hono } from "npm:hono@4";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import { claimedSlugs, isConfigured, type ClaimRecord } from "./exchangeServices.ts";

export const exchangeServicesRouter = new Hono();

const PREFIX = "/make-server-3eae23a6";

/**
 * ONE RECORD, NOT ONE PER CATEGORY.
 *
 * A ticked box is not a thing with a lifecycle — it has no history anybody
 * wants, no author worth recording per row, and no partial state. Storing 180
 * rows to answer one question would mean a save that can half-succeed, which
 * is the one failure mode this must not have: a list that is half old and half
 * new routes work by accident.
 */
const KEY = "exchange_services:claimed";

const service = () =>
  createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

async function readClaim(): Promise<ClaimRecord | null> {
  try {
    return (await kv.get(KEY)) as ClaimRecord | null;
  } catch {
    /*
     * A store that will not read is NOT an empty list.
     *
     * Returning `{}` here would read as "nobody has decided" and quietly put
     * every category back on the construction fallback — changing how work
     * routes because of a database blip. Null means unknown, and the caller
     * reports the failure rather than acting on a guess.
     */
    return null;
  }
}

/**
 * GET — every category, with what is claimed and what the fallback would say.
 *
 * The whole table comes back rather than just the ticked slugs, because the
 * screen needs to draw 180 checkboxes and a second round trip to fetch the
 * categories would let the two answers disagree about what exists.
 */
exchangeServicesRouter.get(`${PREFIX}/exchange/services`, async (c) => {
  const actor = c.get("actor");
  if (!actor?.email) return c.json({ success: false, error: "Sign in required." }, 401);

  try {
    const sb = service();
    const { data, error } = await sb
      .from("exchange_category")
      .select("slug,name,section_slug,is_construction,status")
      .order("section_slug", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;

    const record = await readClaim();
    const claimed = claimedSlugs(record);

    const categories = (data || [])
      .filter((row: any) => !row.status || row.status === "active")
      .map((row: any) => ({
        slug: row.slug,
        name: row.name,
        section: row.section_slug,
        isConstruction: row.is_construction === true,
        claimed: claimed.has(String(row.slug || "").trim().toLowerCase()),
      }));

    return c.json({
      success: true,
      configured: isConfigured(record),
      updatedAt: record?.updatedAt ?? null,
      updatedBy: record?.updatedBy ?? null,
      categories,
      /*
       * What the fallback currently claims, so the screen can offer it as a
       * starting point. Correcting a sensible list is a different job from
       * ticking 71 boxes from blank, and the second is how a list ends up half
       * done and wrong.
       */
      suggested: categories.filter((x: any) => x.isConstruction).map((x: any) => x.slug),
    });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || "Could not read the services list." }, 500);
  }
});

/**
 * PUT — replace the list.
 *
 * A whole-list write rather than add/remove calls. The screen holds the whole
 * list anyway, and two people editing different halves is a problem this does
 * not need to have: last save wins, visibly, with their name on it.
 */
exchangeServicesRouter.put(`${PREFIX}/exchange/services`, async (c) => {
  const actor = c.get("actor");
  if (!actor?.email) return c.json({ success: false, error: "Sign in required." }, 401);

  try {
    const body = await c.req.json().catch(() => ({}));
    const incoming = Array.isArray((body as any)?.slugs) ? (body as any).slugs : null;
    if (!incoming) {
      return c.json({ success: false, error: "Send `slugs` as an array, even when empty." }, 400);
    }

    /*
     * Checked against the real categories rather than trusted.
     *
     * A slug that does not exist can never match an incoming request, so it is
     * not dangerous — it is WORSE than dangerous, it is invisible: the box
     * stays ticked on the screen and the work never routes. Unknown slugs are
     * dropped and named in the response so the caller sees what happened.
     */
    const sb = service();
    const { data, error } = await sb.from("exchange_category").select("slug");
    if (error) throw error;
    const real = new Set((data || []).map((r: any) => String(r.slug || "").trim().toLowerCase()));

    const seen = new Set<string>();
    const kept: string[] = [];
    const dropped: string[] = [];
    for (const entry of incoming) {
      const slug = String(entry ?? "").trim().toLowerCase();
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      (real.has(slug) ? kept : dropped).push(slug);
    }

    const record: ClaimRecord = {
      slugs: kept,
      /*
       * TRUE EVEN WHEN THE LIST IS EMPTY. "I claim none of these" is a
       * decision, and without this flag the next read would fall back to the
       * construction heuristic and overrule the person who just made it.
       */
      configured: true,
      updatedAt: new Date().toISOString(),
      updatedBy: String(actor.email),
    };
    await kv.set(KEY, record);

    return c.json({ success: true, claimed: kept.length, dropped, record });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || "Could not save the services list." }, 500);
  }
});

export default exchangeServicesRouter;
