/**
 * portalSettings — persists the global portal settings edited in PortalGlobalSettings.tsx.
 *
 * The whole settings object is stored under a single KV key so it survives
 * refreshes and syncs across devices, replacing the previous "TODO: Save to
 * Supabase" no-op.
 *
 * KV key: portal_global_settings:default
 *
 * THIS ROUTER IS NOT MOUNTED
 *
 * Nothing in index.tsx imports it, so neither route is reachable today and
 * the settings screen fails visibly when you press Save. That is why the
 * write below had no authorisation check of any kind: a router nothing can
 * reach never has the question forced, which is exactly the history
 * requireStaff.ts describes about six other routers in this project.
 *
 * The guard is added now, before mounting, rather than at the same time as
 * it. What this record holds is the company's branding, its outbound email
 * templates and its access-control flags — "may portals be public", "must a
 * new portal be approved". Reachable and unguarded, the publishable key that
 * ships to every visitor's browser would be enough to rewrite all of it.
 *
 * Reading stays open to anybody signed in, because portals render from this
 * branding. Writing is company-only.
 */

import { Hono } from "npm:hono@4";
import { cors } from "npm:hono@4/cors";
import * as kv from "./kv_store.tsx";
import { requireStaffOn } from "./requireStaff.ts";

const portalSettingsRouter = new Hono();
const PREFIX = "/make-server-3eae23a6";
const KEY = "portal_global_settings:default";

portalSettingsRouter.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  maxAge: 600,
  credentials: false,
}));

portalSettingsRouter.get(`${PREFIX}/portal-settings`, async (c) => {
  try {
    const settings = (await kv.get(KEY)) || null;
    return c.json({ success: true, settings });
  } catch (error) {
    console.error("[PortalSettings] Error loading settings:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * Company access to write, checked before the handler runs.
 *
 * `requireStaffOn` rather than `use("*")`: this router spells its paths out
 * in full and is therefore mounted at `/`, where a `use("*")` would run on
 * every request the whole server receives. Doing that once took the entire
 * API staff-only for a deploy.
 */
portalSettingsRouter.post(
  `${PREFIX}/portal-settings`,
  requireStaffOn([`${PREFIX}/portal-settings`]),
  async (c) => {
  try {
    const { settings } = await c.req.json();
    if (!settings || typeof settings !== "object") {
      return c.json({ success: false, error: "settings object is required" }, 400);
    }
    await kv.set(KEY, settings);
    return c.json({ success: true, settings });
  } catch (error) {
    console.error("[PortalSettings] Error saving settings:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

export default portalSettingsRouter;
