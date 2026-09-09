/**
 * Review surveys and the influencer/ambassador tracker.
 *
 * WHAT THIS FILE USED TO BE
 *
 * It also carried `/crm/contacts`, `/affiliates/:email` and
 * `/maintenance-draft/:email`. All three already exist inline in `index.tsx`,
 * guarded with `intakeIsAdmin`, and this router's copies had no guard at all.
 * Because it mounts at `/`, ahead of those inline definitions, mounting it with
 * them still present would not have added routes — it would have put an open
 * copy of the company's contact book in front of the admin-only one. They are
 * gone; the live versions are untouched and still admin-only.
 *
 * What remains is the half that exists nowhere else and that real, routed pages
 * call: `review-surveys` and `influencer-tracker` have both been asking a server
 * that never had these routes, so they have been failing rather than merely
 * being empty. Mounting this is what fixes them.
 */
import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";
import { requireStaffOn } from "./requireStaff.ts";

const router = new Hono();

/**
 * Staff only — survey results carry customer feedback and the influencer list is
 * a commercial relationship, neither of which belongs to a portal account.
 *
 * Scoped to this router's own paths rather than `use("*")`, because this mounts
 * at `/` and Hono resolves middleware by mount path: a bare wildcard would run
 * on every request the server receives. See the note on `requireStaffOn`.
 */
router.use("*", requireStaffOn([
  "/make-server-3eae23a6/surveys",
  "/make-server-3eae23a6/influencers",
]));

const SURVEYS_KEY = "review_surveys:default";
const INFLUENCERS_KEY = "influencer_ambassadors:default";

function ok(data: Record<string, unknown> = {}) {
  return { success: true, ...data };
}

// ─── Review / Survey Manager ──────────────────────────────────────────────────
router.get("/make-server-3eae23a6/surveys", async (c) => {
  try {
    const surveys = (await kv.get(SURVEYS_KEY)) || null;
    return c.json(ok({ surveys }));
  } catch (err) {
    console.log("Error loading surveys:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

router.post("/make-server-3eae23a6/surveys", async (c) => {
  try {
    const { surveys } = await c.req.json();
    if (!Array.isArray(surveys)) {
      return c.json({ success: false, error: "surveys must be an array" }, 400);
    }
    await kv.set(SURVEYS_KEY, surveys);
    return c.json(ok({ surveys }));
  } catch (err) {
    console.log("Error saving surveys:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

// ─── Influencer / Ambassador Tracker ──────────────────────────────────────────
router.get("/make-server-3eae23a6/influencers", async (c) => {
  try {
    const influencers = (await kv.get(INFLUENCERS_KEY)) || null;
    return c.json(ok({ influencers }));
  } catch (err) {
    console.log("Error loading influencers:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

router.post("/make-server-3eae23a6/influencers", async (c) => {
  try {
    const { influencers } = await c.req.json();
    if (!Array.isArray(influencers)) {
      return c.json({ success: false, error: "influencers must be an array" }, 400);
    }
    await kv.set(INFLUENCERS_KEY, influencers);
    return c.json(ok({ influencers }));
  } catch (err) {
    console.log("Error saving influencers:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

export default router;
