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

export default router;
