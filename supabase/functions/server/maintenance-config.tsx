import { Hono } from "npm:hono@4";
import * as kv from "./kv_store.tsx";
import { requireStaff } from "./requireStaff.ts";
import { loadCatalogue } from "./planPricing.ts";

const router = new Hono();

/**
 * WHO MAY WRITE A PRICE
 *
 * Both POST routes in this file, and the DELETE, had no authorisation check at
 * all. The auth wall in index.tsx defaults an unlisted route to "signed in",
 * and /maintenance-config is unlisted — so every portal customer, tenant,
 * vendor and subcontractor could overwrite the platform's entire service
 * catalogue, every price in it included, and the plan builder would then quote
 * from it. `/subscription-plan-overrides` is at least behind the admin prefix
 * list in index.tsx, but a guard that lives in another file is one rename away
 * from being gone without anybody noticing, so it gets a check of its own too.
 *
 * Reading stays open to any signed-in account: the plan builder has to show the
 * catalogue to the person choosing from it.
 *
 * Scoped to this router's own paths, never `use("*")` — this router is mounted
 * at "/" and a wildcard here would make the whole API staff-only. See the note
 * on requireStaffOn in requireStaff.ts, which is the same trap.
 */
const staffForWrites = async (c: any, next: any) => {
  const method = c.req.method;
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return await next();
  return await requireStaff(c, next);
};
router.use("/make-server-3eae23a6/maintenance-config", staffForWrites);
router.use("/make-server-3eae23a6/subscription-plan-overrides", staffForWrites);
router.use("/make-server-3eae23a6/subscription-plan-overrides/*", staffForWrites);

// The maintenance plan builder's editable configuration: service catalog,
// technician (skill) levels, frequency tiers, and pricing regions. The admin
// editor writes here; the builder reads it (falling back to code defaults when
// nothing has been saved yet).
const CONFIG_KEY = "maintenance_config:default";

/**
 * GET /maintenance-catalogue — the catalogue the SERVER will price from.
 *
 * WHY A SECOND READ ROUTE
 *
 * `/maintenance-config` returns only what an administrator has saved, or null,
 * and leaves the browser to merge that over a copy of the catalogue bundled
 * into the front end. That is how the plan builder ended up showing prices the
 * server had never agreed to: two copies, two merge rules, and the browser's
 * figure was the one that got saved. The server-side recompute closed the money
 * hole; this closes the display half, so the price somebody is shown is the
 * price they will be charged.
 *
 * It returns the MERGED result — generated defaults with the admin's saved
 * overrides applied — from the same `loadCatalogue` that `pricePlan` uses. One
 * reader, so the quote and the charge cannot disagree.
 *
 * WHY IT IS READABLE WITHOUT SIGNING IN
 *
 * The public application forms carry the plan builder, and an applicant has no
 * account yet — that is what they are applying for. Nothing here is a secret
 * either: every one of these prices is already shipped inside the front-end
 * bundle today and shown on the screen to anybody who opens the builder. What
 * is deliberately NOT here is anything about an account, a Stripe id, or a
 * saved plan.
 */
router.get("/make-server-3eae23a6/maintenance-catalogue", async (c) => {
  try {
    const { services, skill, frequency, region } = await loadCatalogue();
    return c.json({
      success: true,
      config: {
        catalog: services,
        // Shaped as the front end's own config: a list of records with an id
        // and a multiplier, so nothing has to translate between two shapes.
        skillLevels: Object.keys(skill).map((id) => ({ id, multiplier: skill[id] })),
        frequencyTiers: Object.keys(frequency).map((id) => ({ id, multiplier: frequency[id] })),
        regions: Object.keys(region).map((id) => ({ id, priceMultiplier: region[id] })),
      },
    });
  } catch (err) {
    console.log("Error loading the maintenance catalogue:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

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
