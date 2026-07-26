import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";

const router = new Hono();

// The JobFinancialService on the frontend keeps a set of granular localStorage
// keys (job_financials, time_entries_<jobId>, purchases_<jobId>, etc.). We mirror
// each of those keys server-side under a `jobfin:` prefix so the data is durable
// and shared across devices, while the frontend keeps its synchronous cache API.
const PREFIX = "jobfin:";

router.get("/make-server-3eae23a6/job-financials/snapshot", async (c) => {
  try {
    const rows = (await kv.getByPrefix(PREFIX)) || [];
    // Each stored value is { key, value }.
    const entries = rows.filter((r: any) => r && typeof r.key === "string");
    return c.json({ success: true, entries });
  } catch (err) {
    console.log("Error loading job-financials snapshot:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

router.post("/make-server-3eae23a6/job-financials/kv", async (c) => {
  try {
    const { key, value } = await c.req.json();
    if (typeof key !== "string" || !key) {
      return c.json({ success: false, error: "key is required" }, 400);
    }
    await kv.set(`${PREFIX}${key}`, { key, value });
    return c.json({ success: true });
  } catch (err) {
    console.log("Error saving job-financials kv:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

export default router;
