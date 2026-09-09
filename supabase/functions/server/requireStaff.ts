/**
 * One guard, for routers that were written without one.
 *
 * WHY IT EXISTS
 *
 * Several routers in this project were built, never mounted, and therefore never
 * had an authorisation review — because nothing could reach them, nothing forced
 * the question. Mounting them is what forces it, and the answer for six of them
 * was that they had no checks at all: `/crm/contacts` readable and writable,
 * `/images/upload`, `/media-library`, `/automation/workflows/:id/run`.
 *
 * The auth wall in `index.tsx` defaults an unlisted route to "signed in", which
 * is the right default and is not enough here. Every portal customer, tenant,
 * vendor and subcontractor is signed in. A route that manages the company's own
 * marketing, media and contact book needs to know the difference between a
 * customer and the company, and these did not.
 *
 * HOW IT IS APPLIED
 *
 * As router middleware — `router.use('*', requireStaff)` — rather than a line in
 * each handler. A check that has to be remembered on every new route is a check
 * that will eventually be forgotten, and these files have thirty routes apiece.
 *
 * WHAT IT TRUSTS
 *
 * `app_metadata` only, through the shared `trustedRole`. `user_metadata` is
 * writable by the account it belongs to, so reading a role from it would be
 * letting the caller name their own authority — which is exactly the hole that
 * public signup had until it was closed.
 */
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import { trustedRole } from "./trustedRole.ts";

const STAFF_ROLES = new Set([
  "owner", "admin", "master_admin", "super_admin", "superadmin",
  "management", "staff", "employee", "project_manager", "estimator", "office",
]);

let cached: any = null;
function admin() {
  if (!cached) {
    cached = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    );
  }
  return cached;
}

/** True when this request carries a token belonging to somebody who works here. */
export async function isStaffRequest(c: any): Promise<boolean> {
  const token = String(c.req.header("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  try {
    const { data, error } = await admin().auth.getUser(token);
    if (error || !data?.user) return false;
    return STAFF_ROLES.has(trustedRole(data.user));
  } catch {
    // Fail closed. An identity we could not establish is not a staff identity.
    return false;
  }
}

/**
 * Hono middleware. Refuses anybody who is not staff, before the handler runs.
 *
 * The message says what is required rather than merely "forbidden", because the
 * usual reader of it is a colleague wondering why a screen is empty.
 */
export async function requireStaff(c: any, next: any) {
  if (await isStaffRequest(c)) return await next();
  return c.json(
    { success: false, error: "Company access is required for this." },
    403,
  );
}

/**
 * The same guard, but only over the paths a router actually owns.
 *
 * DO NOT replace this with `router.use("*", requireStaff)`. These routers spell
 * their paths out in full and are therefore mounted at `/`, and a `use("*")` on
 * a router mounted at `/` runs on every request the whole server receives — not
 * merely the ones that router handles. Doing exactly that took the entire API
 * staff-only for one deploy: `/health` and `/public/branding` both started
 * answering "Company access is required for this."
 *
 * It is an easy mistake because the middleware looks scoped to the router it is
 * written in. It is not. Hono resolves middleware by mount path, and the mount
 * path here is everything.
 */
export function requireStaffOn(paths: string[]) {
  return async function guard(c: any, next: any) {
    const p = new URL(c.req.url).pathname;
    const mine = paths.some((base) => p === base || p.startsWith(base + "/"));
    if (!mine) return await next();
    return await requireStaff(c, next);
  };
}
