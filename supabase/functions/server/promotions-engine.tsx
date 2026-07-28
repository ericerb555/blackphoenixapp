/**
 * Promotions Engine router — scheduled discounts + volume/tiered pricing.
 *
 * Public storefront reads active rules (GET, anon key). Admin panel in the
 * Content Center writes them (POST, admin only). One shared config document
 * stored in the KV table under `promotions_engine:config`.
 */
import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import * as kv from "./kv_store.tsx";

const promotionsEngineRouter = new Hono();

const CONFIG_KEY = "promotions_engine:config";

const DEFAULT_CONFIG = {
  // Time-boxed price reductions applied automatically on the storefront.
  scheduledDiscounts: [] as Array<{
    id: string;
    name: string;
    scope: "all" | "category";
    category?: string;
    discountType: "percent" | "fixed";
    value: number;
    startsAt?: string; // ISO; empty = starts immediately
    endsAt?: string;   // ISO; empty = never expires
    active: boolean;
  }>,
  // Quantity-based price breaks applied per cart line item.
  volumePricing: {
    enabled: false,
    tiers: [] as Array<{ minQty: number; discountPercent: number }>,
  },
};

function mergeConfig(saved: any) {
  const s = saved || {};
  return {
    scheduledDiscounts: Array.isArray(s.scheduledDiscounts) ? s.scheduledDiscounts : DEFAULT_CONFIG.scheduledDiscounts,
    volumePricing: {
      enabled: !!(s.volumePricing?.enabled),
      tiers: Array.isArray(s.volumePricing?.tiers) ? s.volumePricing.tiers : [],
    },
  };
}

// Only return discounts that are currently in their active window, so the
// storefront can apply them without re-implementing the schedule logic.
function activeDiscounts(config: any) {
  const now = Date.now();
  return (config.scheduledDiscounts || []).filter((d: any) => {
    if (!d.active) return false;
    if (d.startsAt && new Date(d.startsAt).getTime() > now) return false;
    if (d.endsAt && new Date(d.endsAt).getTime() < now) return false;
    return true;
  });
}

// GET /make-server-3eae23a6/promotions-engine -> { success, config, activeDiscounts }
promotionsEngineRouter.get("/make-server-3eae23a6/promotions-engine", async (c) => {
  try {
    const saved = await kv.get(CONFIG_KEY);
    const config = mergeConfig(saved);
    return c.json({ success: true, config, activeDiscounts: activeDiscounts(config) });
  } catch (err) {
    console.log(`Error loading promotions engine config: ${err}`);
    return c.json({ success: false, error: `Failed to load promotions engine config: ${err}`, config: DEFAULT_CONFIG, activeDiscounts: [] }, 500);
  }
});

// POST /make-server-3eae23a6/promotions-engine  body { config } -> { success, config }
// Admin only.
promotionsEngineRouter.post("/make-server-3eae23a6/promotions-engine", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser(accessToken ?? "");
    if (authErr || !user?.id) {
      return c.json({ success: false, error: `Authorization error while saving promotions engine config: ${authErr?.message || "no user"}` }, 401);
    }
    const perms = (await kv.get(`user_permissions:${user.id}`)) as any;
    const role = perms?.role || user.user_metadata?.role;
    if (role !== "admin" && role !== "owner" && role !== "super_admin") {
      return c.json({ success: false, error: "Administrator access is required to change promotions." }, 403);
    }

    const body = await c.req.json().catch(() => ({}));
    const merged = mergeConfig(body?.config);
    await kv.set(CONFIG_KEY, merged);
    return c.json({ success: true, config: merged, activeDiscounts: activeDiscounts(merged) });
  } catch (err) {
    console.log(`Error saving promotions engine config: ${err}`);
    return c.json({ success: false, error: `Failed to save promotions engine config: ${err}` }, 500);
  }
});

export default promotionsEngineRouter;
