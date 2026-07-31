/**
 * Tier Feature Entitlements — owner-controlled per-(category, tier) feature toggles.
 *
 * Lets the platform owner decide which features are ALLOWED in each subscription
 * tier (starter / professional / enterprise) for each plan category. The owner can
 * enable any feature in any tier — including allowing a feature across every tier.
 *
 * The frontend owns the catalog of features (from subscriptionPlans.ts). This
 * router just persists and returns the owner's allow-map in the KV store.
 *
 * Storage: single KV doc `tier_feature_overrides` shaped as:
 *   { [category]: { [tier]: { [featureName]: boolean } } }
 * An absent entry means "no override" — the frontend falls back to the plan default.
 *
 * - GET  /make-server-3eae23a6/tier-features            (public) returns the allow-map.
 * - PUT  /make-server-3eae23a6/tier-features            (admin)  replaces the full map.
 * - POST /make-server-3eae23a6/tier-features/toggle     (admin)  sets one feature in one tier.
 */
import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import * as kv from "./kv_store.tsx";

const tierFeaturesRouter = new Hono();

const KV_KEY = "tier_feature_overrides";

async function requireAdmin(c: any) {
  const accessToken = c.req.header("Authorization")?.split(" ")[1];
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const { data: { user }, error } = await supabase.auth.getUser(accessToken ?? "");
  if (error || !user?.id) return { ok: false, error: `Authorization error while verifying admin for tier features: ${error?.message || "no user"}`, status: 401 };
  const perms = (await kv.get(`user_permissions:${user.id}`)) as any;
  const role = perms?.role || user.user_metadata?.role;
  if (role !== "admin" && role !== "owner" && role !== "super_admin") {
    return { ok: false, error: "Administrator access is required to edit tier feature entitlements.", status: 403 };
  }
  return { ok: true };
}

/** Public: return the current owner-defined allow-map (empty object when unset). */
tierFeaturesRouter.get("/make-server-3eae23a6/tier-features", async (c) => {
  try {
    const overrides = (await kv.get(KV_KEY)) ?? {};
    return c.json({ success: true, overrides });
  } catch (err) {
    console.log(`Error loading tier feature overrides: ${err}`);
    return c.json({ success: false, error: `Failed to load tier feature overrides: ${err}` }, 500);
  }
});

/** Admin: replace the entire allow-map. */
tierFeaturesRouter.put("/make-server-3eae23a6/tier-features", async (c) => {
  try {
    const admin = await requireAdmin(c);
    if (!admin.ok) return c.json({ success: false, error: admin.error }, admin.status);

    const body = await c.req.json().catch(() => ({}));
    const overrides = body?.overrides;
    if (!overrides || typeof overrides !== "object") {
      return c.json({ success: false, error: "Request body must include an 'overrides' object." }, 400);
    }
    await kv.set(KV_KEY, overrides);
    return c.json({ success: true, overrides });
  } catch (err) {
    console.log(`Error saving tier feature overrides: ${err}`);
    return c.json({ success: false, error: `Failed to save tier feature overrides: ${err}` }, 500);
  }
});

/** Admin: toggle a single feature in a single (category, tier). */
tierFeaturesRouter.post("/make-server-3eae23a6/tier-features/toggle", async (c) => {
  try {
    const admin = await requireAdmin(c);
    if (!admin.ok) return c.json({ success: false, error: admin.error }, admin.status);

    const { category, tier, feature, allowed } = await c.req.json().catch(() => ({} as any));
    if (!category || !tier || !feature || typeof allowed !== "boolean") {
      return c.json({ success: false, error: "toggle requires { category, tier, feature, allowed:boolean }." }, 400);
    }
    const overrides = ((await kv.get(KV_KEY)) ?? {}) as any;
    overrides[category] = overrides[category] || {};
    overrides[category][tier] = overrides[category][tier] || {};
    overrides[category][tier][feature] = allowed;
    await kv.set(KV_KEY, overrides);
    return c.json({ success: true, overrides });
  } catch (err) {
    console.log(`Error toggling tier feature override: ${err}`);
    return c.json({ success: false, error: `Failed to toggle tier feature override: ${err}` }, 500);
  }
});

export default tierFeaturesRouter;
