import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";
import { requireStaffOn } from "./requireStaff.ts";

const router = new Hono();

// Retargeting pixels and auto-product rules are company configuration. A pixel
// is third-party script identity, so write access to it is not a small thing.
//
// Scoped to this router's own paths, never `use("*")` — this router is mounted
// at `/`, where a wildcard middleware would run on every request the server
// gets. See the note on `requireStaffOn`.
router.use("*", requireStaffOn([
  "/make-server-3eae23a6/retargeting-pixels",
  "/make-server-3eae23a6/auto-products",
  "/make-server-3eae23a6/social/custom-accounts",
]));

const PIXELS_KEY = "retargeting_pixels:default";
const AUTO_PRODUCTS_KEY = "auto_products:default";
const SOCIAL_CUSTOM_KEY = "social_custom_accounts:default";

// --- Retargeting pixel config (single object) ---------------------------------
router.get("/make-server-3eae23a6/retargeting-pixels", async (c) => {
  try {
    const config = await kv.get(PIXELS_KEY);
    return c.json({ success: true, config: config || null });
  } catch (err) {
    console.log("Error loading retargeting pixels:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

router.post("/make-server-3eae23a6/retargeting-pixels", async (c) => {
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
router.get("/make-server-3eae23a6/auto-products", async (c) => {
  try {
    const products = await kv.get(AUTO_PRODUCTS_KEY);
    return c.json({ success: true, products: Array.isArray(products) ? products : null });
  } catch (err) {
    console.log("Error loading auto products:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

router.post("/make-server-3eae23a6/auto-products", async (c) => {
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
router.get("/make-server-3eae23a6/social/custom-accounts", async (c) => {
  try {
    const accounts = await kv.get(SOCIAL_CUSTOM_KEY);
    return c.json({ success: true, accounts: Array.isArray(accounts) ? accounts : [] });
  } catch (err) {
    console.log("Error loading social custom accounts:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

router.post("/make-server-3eae23a6/social/custom-accounts", async (c) => {
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
