/**
 * Marketing automation and keyword tracking.
 *
 * WHAT THIS FILE USED TO BE
 *
 * It also carried `/flash-sales`, `/loyalty/:email` and `/referrals`. All three
 * already existed elsewhere — flash sales in `flash-sales.tsx`, the other two
 * inline in `index.tsx` behind `intakeIsAdmin` — and this router's copies were
 * older and unguarded. Because it mounts at `/`, ahead of those inline
 * definitions, mounting it with them still in place would not have added
 * anything: it would have replaced working admin-only routes with open ones.
 * They are gone, and the live copies are untouched.
 *
 * What is left is the half that exists nowhere else, and that a real page calls.
 * The `marketing-automation` page is routed and has been asking for
 * `/automation/workflows` against a server that never had it, so it has simply
 * been failing. That is what mounting this fixes.
 *
 * `/keywords` is kept for the same reason in reverse: `KeywordTracker` was
 * unrouted precisely because this route 404'd. The route works now, so that page
 * can be put back whenever it is wanted.
 */
import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";
import { requireStaffOn } from "./requireStaff.ts";

const router = new Hono();

/**
 * Company marketing machinery — not a customer's, so staff only.
 *
 * Scoped to this router's own paths rather than `use("*")`. This router mounts
 * at `/`, and Hono resolves middleware by mount path, so a bare wildcard here
 * would run on every request the whole server receives. That is not theoretical:
 * doing it took `/health` and `/public/branding` down for one deploy.
 */
router.use("*", requireStaffOn([
  "/make-server-3eae23a6/automation/workflows",
  "/make-server-3eae23a6/keywords",
]));

const WORKFLOWS_KEY = "automation_workflows:default";
const KEYWORDS_KEY = "keyword_tracker:default";

function ok(data: Record<string, unknown> = {}) {
  return { success: true, ...data };
}

// ─── Marketing Automation ─────────────────────────────────────────────────────
router.get("/make-server-3eae23a6/automation/workflows", async (c) => {
  try {
    const workflows = (await kv.get(WORKFLOWS_KEY)) || null;
    return c.json(ok({ workflows }));
  } catch (err) {
    console.log("Error loading automation workflows:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

router.post("/make-server-3eae23a6/automation/workflows", async (c) => {
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
router.post("/make-server-3eae23a6/automation/workflows/:id/run", async (c) => {
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
router.get("/make-server-3eae23a6/keywords", async (c) => {
  try {
    const keywords = (await kv.get(KEYWORDS_KEY)) || null;
    return c.json(ok({ keywords }));
  } catch (err) {
    console.log("Error loading keywords:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

router.post("/make-server-3eae23a6/keywords", async (c) => {
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

export default router;
