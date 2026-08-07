import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";

const router = new Hono();

// The maintenance plan builder's editable configuration: service catalog,
// technician (skill) levels, frequency tiers, and pricing regions. The admin
// editor writes here; the builder reads it (falling back to code defaults when
// nothing has been saved yet).
const CONFIG_KEY = "maintenance_config:default";

router.get("/make-server-3eae23a6/maintenance-config", async (c) => {
  try {
    const config = await kv.get(CONFIG_KEY);
    return c.json({ success: true, config: config || null });
  } catch (err) {
    console.log("Error loading maintenance config:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

router.post("/make-server-3eae23a6/maintenance-config", async (c) => {
  try {
    const { config } = await c.req.json();
    if (!config || typeof config !== "object") {
      return c.json({ success: false, error: "config object is required" }, 400);
    }
    await kv.set(CONFIG_KEY, config);
    return c.json({ success: true });
  } catch (err) {
    console.log("Error saving maintenance config:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

// Owner-edited overrides for the code-defined subscription plans. The plan
// catalog itself ships in the frontend config; this stores only the fields an
// admin changed, keyed by plan id, so an edit survives a reload.
const PLAN_OVERRIDES_KEY = "subscription_plan_overrides:default";

router.get("/make-server-3eae23a6/subscription-plan-overrides", async (c) => {
  try {
    const overrides = await kv.get(PLAN_OVERRIDES_KEY);
    return c.json({ success: true, overrides: overrides || {} });
  } catch (err) {
    console.log("Error loading subscription plan overrides:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

router.post("/make-server-3eae23a6/subscription-plan-overrides", async (c) => {
  try {
    const { planId, override } = await c.req.json();
    if (!planId || typeof planId !== "string") {
      return c.json({ success: false, error: "planId is required" }, 400);
    }
    if (!override || typeof override !== "object") {
      return c.json({ success: false, error: "override object is required" }, 400);
    }
    const current = ((await kv.get(PLAN_OVERRIDES_KEY)) as Record<string, any>) || {};
    current[planId] = { ...(current[planId] || {}), ...override, updatedAt: new Date().toISOString() };
    await kv.set(PLAN_OVERRIDES_KEY, current);
    return c.json({ success: true, overrides: current });
  } catch (err) {
    console.log("Error saving subscription plan override:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

router.delete("/make-server-3eae23a6/subscription-plan-overrides/:planId", async (c) => {
  try {
    const planId = c.req.param("planId");
    const current = ((await kv.get(PLAN_OVERRIDES_KEY)) as Record<string, any>) || {};
    delete current[planId];
    await kv.set(PLAN_OVERRIDES_KEY, current);
    return c.json({ success: true, overrides: current });
  } catch (err) {
    console.log("Error clearing subscription plan override:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

export default router;
