import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";

const router = new Hono();

const PIXELS_KEY = "retargeting_pixels:default";
const AUTO_PRODUCTS_KEY = "auto_products:default";
const SOCIAL_CUSTOM_KEY = "social_custom_accounts:default";

// --- Retargeting pixel config (single object) ---------------------------------
router.get("/make-server-57095a78/retargeting-pixels", async (c) => {
  try {
    const config = await kv.get(PIXELS_KEY);
    return c.json({ success: true, config: config || null });
  } catch (err) {
    console.log("Error loading retargeting pixels:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

router.post("/make-server-57095a78/retargeting-pixels", async (c) => {
  try {
    const { config } = await c.req.json();
    await kv.set(PIXELS_KEY, config || {});
    return c.json({ success: true });
  } catch (err) {
    console.log("Error saving retargeting pixels:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

// --- Auto product pilot (bulk array) ------------------------------------------
router.get("/make-server-57095a78/auto-products", async (c) => {
  try {
    const products = await kv.get(AUTO_PRODUCTS_KEY);
    return c.json({ success: true, products: Array.isArray(products) ? products : null });
  } catch (err) {
    console.log("Error loading auto products:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

router.post("/make-server-57095a78/auto-products", async (c) => {
  try {
    const { products } = await c.req.json();
    await kv.set(AUTO_PRODUCTS_KEY, Array.isArray(products) ? products : []);
    return c.json({ success: true });
  } catch (err) {
    console.log("Error saving auto products:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

// --- Social custom accounts (bulk array) --------------------------------------
router.get("/make-server-57095a78/social/custom-accounts", async (c) => {
  try {
    const accounts = await kv.get(SOCIAL_CUSTOM_KEY);
    return c.json({ success: true, accounts: Array.isArray(accounts) ? accounts : [] });
  } catch (err) {
    console.log("Error loading social custom accounts:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

router.post("/make-server-57095a78/social/custom-accounts", async (c) => {
  try {
    const { accounts } = await c.req.json();
    await kv.set(SOCIAL_CUSTOM_KEY, Array.isArray(accounts) ? accounts : []);
    return c.json({ success: true });
  } catch (err) {
    console.log("Error saving social custom accounts:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

export default router;
