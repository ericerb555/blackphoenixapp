/**
 * portalSettings — persists the global portal settings edited in PortalGlobalSettings.tsx.
 *
 * The whole settings object is stored under a single KV key so it survives
 * refreshes and syncs across devices, replacing the previous "TODO: Save to
 * Supabase" no-op.
 *
 * KV key: portal_global_settings:default
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import * as kv from "./kv_store.tsx";

const portalSettingsRouter = new Hono();
const PREFIX = "/make-server-57095a78";
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

portalSettingsRouter.post(`${PREFIX}/portal-settings`, async (c) => {
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
