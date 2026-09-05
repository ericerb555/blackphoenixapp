/**
 * Job financials — the company's own costing, mirrored server-side.
 *
 * WHY IT WAS NOT MOUNTED, AND WHY IT COULD NOT SIMPLY BE MOUNTED
 *
 * The frontend's JobFinancialService keeps granular localStorage keys
 * (`job_financials`, `time_entries_<jobId>`, `purchases_<jobId>`) and mirrors
 * each one here so the data survives a browser and follows a person between
 * devices. That part is sound. What was not sound is the shape these two routes
 * had while nobody could reach them:
 *
 *   GET  /snapshot  returned every record under the prefix, to any caller
 *   POST /kv        wrote any key with any value, from any caller
 *
 * That is a skeleton key over the company's job costing — every job's labour,
 * purchases, margins — readable and writable by anyone past the auth wall,
 * which is every signed-in portal account: tenants, advertisers, vendors,
 * customers. The same shape was found and removed from `/kv/*` earlier in this
 * project; mounting this without fixing it would have put it straight back.
 *
 * So both routes are staff-only, and the write is confined to the key shapes the
 * service actually uses. An arbitrary key means an arbitrary record, and a
 * prefix is not a permission.
 */
import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import * as kv from "./kv_store.tsx";
import { trustedRole } from "./trustedRole.ts";

const router = new Hono();

const PREFIX = "jobfin:";

const STAFF = new Set([
  "owner", "admin", "master_admin", "super_admin", "superadmin",
  "management", "staff", "employee", "project_manager", "estimator", "office",
]);

/**
 * Is this caller staff?
 *
 * Read from `app_metadata` through the shared `trustedRole`, never from
 * `user_metadata` — an account can write its own `user_metadata`, so trusting it
 * would let anybody grant themselves the company's costing by editing their own
 * profile.
 */
async function isStaff(c: any): Promise<boolean> {
  const token = String(c.req.header("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    );
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user) return false;
    return STAFF.has(trustedRole(data.user));
  } catch {
    return false;
  }
}

/**
 * The keys the service actually writes, taken from `jobFinancialService.tsx`
 * rather than guessed — `job_financials`, `job_activity_logs`, and four
 * per-job families.
 *
 * The route used to take whatever string it was handed. Anchored patterns mean a
 * caller cannot invent a key to squat on and cannot walk out of the prefix. If a
 * new key family is added to the service, it is added here too — a write that
 * silently fails is worse than one that is refused, so the 400 says which key
 * was rejected.
 */
const ALLOWED_KEY = new RegExp(
  '^(job_financials|job_activity_logs'
  + '|(?:time_entries|purchases|materials|job_folders|job_activity_logs)_[A-Za-z0-9_-]{1,64})$',
);

router.get("/make-server-3eae23a6/job-financials/snapshot", async (c) => {
  if (!await isStaff(c)) {
    // Empty rather than an error: this is the company's costing, and confirming
    // that there is something here to be refused is itself worth nothing to a
    // caller who may not have it.
    return c.json({ success: true, entries: [] });
  }
  try {
    const rows = (await kv.getByPrefix(PREFIX)) || [];
    const entries = rows.filter((r: any) => r && typeof r.key === "string");
    return c.json({ success: true, entries });
  } catch (err) {
    console.log("Error loading job-financials snapshot:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

router.post("/make-server-3eae23a6/job-financials/kv", async (c) => {
  if (!await isStaff(c)) {
    return c.json({ success: false, error: "Only the company can record job costs." }, 403);
  }
  try {
    const { key, value } = await c.req.json();
    if (typeof key !== "string" || !key) {
      return c.json({ success: false, error: "key is required" }, 400);
    }
    if (!ALLOWED_KEY.test(key)) {
      return c.json({ success: false, error: `"${key}" is not a job-financials key.` }, 400);
    }
    await kv.set(`${PREFIX}${key}`, { key, value });
    return c.json({ success: true });
  } catch (err) {
    console.log("Error saving job-financials kv:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

export default router;
