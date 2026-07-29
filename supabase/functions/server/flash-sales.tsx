/**
 * Flash Sales router
 * Public storefront feature: the customer-facing store and the admin
 * FlashSaleManager both read the active sales list, so GET is publicly
 * readable. Writes are accepted with the anon key as well because the
 * frontend persists via the public anon token — the KV key is a single
 * shared list for the storefront.
 */
import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";

const flashSalesRouter = new Hono();

const FLASH_SALES_KEY = "flash_sales:all";

// GET /make-server-3eae23a6/flash-sales -> { success, sales: [] }
flashSalesRouter.get("/make-server-3eae23a6/flash-sales", async (c) => {
  try {
    const sales = (await kv.get(FLASH_SALES_KEY)) as any[] | undefined;
    return c.json({ success: true, sales: Array.isArray(sales) ? sales : [] });
  } catch (err) {
    console.log(`Error loading flash sales from KV store: ${err}`);
    return c.json({ success: false, error: `Failed to load flash sales: ${err}`, sales: [] }, 500);
  }
});

// POST /make-server-3eae23a6/flash-sales  body { sales: [] } -> { success }
flashSalesRouter.post("/make-server-3eae23a6/flash-sales", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const sales = Array.isArray(body?.sales) ? body.sales : [];
    await kv.set(FLASH_SALES_KEY, sales);
    return c.json({ success: true, sales });
  } catch (err) {
    console.log(`Error saving flash sales to KV store: ${err}`);
    return c.json({ success: false, error: `Failed to save flash sales: ${err}` }, 500);
  }
});

export default flashSalesRouter;
