import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";

const router = new Hono();

// ─── Key constants ──────────────────────────────────────────────────────────
const WORKFLOWS_KEY = "automation_workflows:default";
const KEYWORDS_KEY = "keyword_tracker:default";
const FLASH_KEY = "flash_sales:default";
const REFERRALS_KEY = "referrals:list";
const PROGRAMS_KEY = "referral_programs:list";
const LOYALTY = (email: string) => `loyalty:${email.toLowerCase()}`;

function ok(data: Record<string, unknown> = {}) {
  return { success: true, ...data };
}

// ─── Marketing Automation ─────────────────────────────────────────────────────
router.get("/make-server-57095a78/automation/workflows", async (c) => {
  try {
    const workflows = (await kv.get(WORKFLOWS_KEY)) || null;
    return c.json(ok({ workflows }));
  } catch (err) {
    console.log("Error loading automation workflows:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

router.post("/make-server-57095a78/automation/workflows", async (c) => {
  try {
    const { workflows } = await c.req.json();
    if (!Array.isArray(workflows)) {
      return c.json({ success: false, error: "workflows must be an array" }, 400);
    }
    await kv.set(WORKFLOWS_KEY, workflows);
    return c.json(ok({ workflows }));
  } catch (err) {
    console.log("Error saving automation workflows:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

// Execute a workflow: increments its real run count and records the last run
// time. Called when a workflow actually fires (manual "Run now" or a trigger
// event), replacing the hardcoded runCount values.
router.post("/make-server-57095a78/automation/workflows/:id/run", async (c) => {
  try {
    const id = c.req.param("id");
    const workflows = (await kv.get(WORKFLOWS_KEY)) || [];
    if (!Array.isArray(workflows)) {
      return c.json({ success: false, error: "No workflows stored" }, 404);
    }
    const idx = workflows.findIndex((w: any) => w.id === id);
    if (idx < 0) return c.json({ success: false, error: "Workflow not found" }, 404);
    if (workflows[idx].status !== "active") {
      return c.json({ success: false, error: "Workflow is not active" }, 400);
    }
    workflows[idx].runCount = (Number(workflows[idx].runCount) || 0) + 1;
    workflows[idx].lastRun = new Date().toISOString();
    await kv.set(WORKFLOWS_KEY, workflows);
    return c.json(ok({ workflow: workflows[idx], workflows }));
  } catch (err) {
    console.log("Error running automation workflow:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

// ─── Keyword Tracker ──────────────────────────────────────────────────────────
router.get("/make-server-57095a78/keywords", async (c) => {
  try {
    const keywords = (await kv.get(KEYWORDS_KEY)) || null;
    return c.json(ok({ keywords }));
  } catch (err) {
    console.log("Error loading keywords:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

router.post("/make-server-57095a78/keywords", async (c) => {
  try {
    const { keywords } = await c.req.json();
    if (!Array.isArray(keywords)) {
      return c.json({ success: false, error: "keywords must be an array" }, 400);
    }
    await kv.set(KEYWORDS_KEY, keywords);
    return c.json(ok({ keywords }));
  } catch (err) {
    console.log("Error saving keywords:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

// ─── Flash Sales ──────────────────────────────────────────────────────────────
router.get("/make-server-57095a78/flash-sales", async (c) => {
  try {
    const sales = (await kv.get(FLASH_KEY)) || [];
    return c.json(ok({ sales }));
  } catch (err) {
    console.log("Error loading flash sales:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

router.post("/make-server-57095a78/flash-sales", async (c) => {
  try {
    const { sales } = await c.req.json();
    if (!Array.isArray(sales)) {
      return c.json({ success: false, error: "sales must be an array" }, 400);
    }
    await kv.set(FLASH_KEY, sales);
    return c.json(ok({ sales }));
  } catch (err) {
    console.log("Error saving flash sales:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

// ─── Loyalty Program (per-email accounts) ─────────────────────────────────────
router.get("/make-server-57095a78/loyalty/:email", async (c) => {
  try {
    const email = c.req.param("email");
    const account = (await kv.get(LOYALTY(email))) || null;
    return c.json(ok({ account }));
  } catch (err) {
    console.log("Error loading loyalty account:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

router.post("/make-server-57095a78/loyalty/:email", async (c) => {
  try {
    const email = c.req.param("email");
    const { account } = await c.req.json();
    if (!account || typeof account !== "object") {
      return c.json({ success: false, error: "account object is required" }, 400);
    }
    await kv.set(LOYALTY(email), account);
    return c.json(ok({ account }));
  } catch (err) {
    console.log("Error saving loyalty account:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

// ─── Referral Rewards ─────────────────────────────────────────────────────────
router.get("/make-server-57095a78/referrals", async (c) => {
  try {
    const referrals = (await kv.get(REFERRALS_KEY)) || null;
    const programs = (await kv.get(PROGRAMS_KEY)) || null;
    return c.json(ok({ referrals, programs }));
  } catch (err) {
    console.log("Error loading referrals:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

router.post("/make-server-57095a78/referrals", async (c) => {
  try {
    const { referrals, programs } = await c.req.json();
    if (Array.isArray(referrals)) await kv.set(REFERRALS_KEY, referrals);
    if (Array.isArray(programs)) await kv.set(PROGRAMS_KEY, programs);
    return c.json(ok({ referrals, programs }));
  } catch (err) {
    console.log("Error saving referrals:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

export default router;
