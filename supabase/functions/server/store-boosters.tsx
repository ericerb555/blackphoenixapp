/**
 * Store Boosters router — AOV-boosting merchandising config for the storefront.
 *
 * Public storefront reads the config (GET, anon key). Admin panel in the
 * Content Center writes it (POST, admin only). Single shared config document
 * stored in the KV table under `store_boosters:config`.
 */
import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import * as kv from "./kv_store.tsx";

const storeBoostersRouter = new Hono();

const CONFIG_KEY = "store_boosters:config";

const DEFAULT_CONFIG = {
  freeShipping: {
    enabled: true,
    threshold: 500,
    // Message templating: {remaining} is replaced with the dollars left.
    message: "Add {remaining} more for FREE shipping!",
    unlockedMessage: "🎉 You've unlocked FREE shipping!",
  },
  urgency: {
    enabled: false,
    // Rolling countdown in minutes; resets per visit to create urgency.
    minutes: 15,
    message: "⚡ Flash deal ends soon — prices go back up when the timer hits zero!",
  },
  cartUpsell: {
    enabled: true,
    heading: "Frequently bought together",
    maxItems: 4,
  },
  stockScarcity: {
    enabled: true,
    // Show "Only N left" when inventory is at or below this number.
    threshold: 8,
    message: "Only {count} left in stock",
  },
  freeGift: {
    enabled: false,
    threshold: 750,
    productName: "",
    message: "Spend {remaining} more to get a FREE gift!",
  },
};

function mergeConfig(saved: any) {
  const s = saved || {};
  return {
    freeShipping: { ...DEFAULT_CONFIG.freeShipping, ...(s.freeShipping || {}) },
    urgency: { ...DEFAULT_CONFIG.urgency, ...(s.urgency || {}) },
    cartUpsell: { ...DEFAULT_CONFIG.cartUpsell, ...(s.cartUpsell || {}) },
    stockScarcity: { ...DEFAULT_CONFIG.stockScarcity, ...(s.stockScarcity || {}) },
    freeGift: { ...DEFAULT_CONFIG.freeGift, ...(s.freeGift || {}) },
  };
}

// GET /make-server-3eae23a6/store-boosters -> { success, config }
storeBoostersRouter.get("/make-server-3eae23a6/store-boosters", async (c) => {
  try {
    const saved = await kv.get(CONFIG_KEY);
    return c.json({ success: true, config: mergeConfig(saved) });
  } catch (err) {
    console.log(`Error loading store boosters config: ${err}`);
    return c.json({ success: false, error: `Failed to load store boosters config: ${err}`, config: DEFAULT_CONFIG }, 500);
  }
});

// POST /make-server-3eae23a6/store-boosters  body { config } -> { success, config }
// Admin only — verify the caller is an authenticated admin before persisting.
storeBoostersRouter.post("/make-server-3eae23a6/store-boosters", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser(accessToken ?? "");
    if (authErr || !user?.id) {
      return c.json({ success: false, error: `Authorization error while saving store boosters config: ${authErr?.message || "no user"}` }, 401);
    }
    const perms = (await kv.get(`user_permissions:${user.id}`)) as any;
    const role = perms?.role || user.user_metadata?.role;
    if (role !== "admin" && role !== "owner" && role !== "super_admin") {
      return c.json({ success: false, error: "Administrator access is required to change store boosters." }, 403);
    }

    const body = await c.req.json().catch(() => ({}));
    const merged = mergeConfig(body?.config);
    await kv.set(CONFIG_KEY, merged);
    return c.json({ success: true, config: merged });
  } catch (err) {
    console.log(`Error saving store boosters config: ${err}`);
    return c.json({ success: false, error: `Failed to save store boosters config: ${err}` }, 500);
  }
});

export default storeBoostersRouter;
