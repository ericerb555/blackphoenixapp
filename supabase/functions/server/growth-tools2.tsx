import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";

const router = new Hono();

// ─── Key constants ──────────────────────────────────────────────────────────
const CRM_CONTACTS_KEY = "crm_contacts:default";
const CRM_HIDDEN_KEY = "crm_hidden_ids:default";
const SURVEYS_KEY = "review_surveys:default";
const INFLUENCERS_KEY = "influencer_ambassadors:default";
const AFFILIATE = (email: string) => `affiliate:${email.toLowerCase()}`;
const MAINT_DRAFT = (email: string) => `maintenance_draft:${email.toLowerCase()}`;

function ok(data: Record<string, unknown> = {}) {
  return { success: true, ...data };
}

// ─── CRM Contacts (Unified CRM Hub) ───────────────────────────────────────────
router.get("/make-server-3eae23a6/crm/contacts", async (c) => {
  try {
    const contacts = (await kv.get(CRM_CONTACTS_KEY)) || null;
    const hidden = (await kv.get(CRM_HIDDEN_KEY)) || [];
    return c.json(ok({ contacts, hidden }));
  } catch (err) {
    console.log("Error loading CRM contacts:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

router.post("/make-server-3eae23a6/crm/contacts", async (c) => {
  try {
    const { contacts, hidden } = await c.req.json();
    if (Array.isArray(contacts)) await kv.set(CRM_CONTACTS_KEY, contacts);
    if (Array.isArray(hidden)) await kv.set(CRM_HIDDEN_KEY, hidden);
    return c.json(ok({ contacts, hidden }));
  } catch (err) {
    console.log("Error saving CRM contacts:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

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

// ─── Affiliate Program (per-email stats) ──────────────────────────────────────
router.get("/make-server-3eae23a6/affiliates/:email", async (c) => {
  try {
    const email = c.req.param("email");
    const stats = (await kv.get(AFFILIATE(email))) || null;
    return c.json(ok({ stats }));
  } catch (err) {
    console.log("Error loading affiliate stats:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

router.post("/make-server-3eae23a6/affiliates/:email", async (c) => {
  try {
    const email = c.req.param("email");
    const { stats } = await c.req.json();
    if (!stats || typeof stats !== "object") {
      return c.json({ success: false, error: "stats object is required" }, 400);
    }
    await kv.set(AFFILIATE(email), stats);
    return c.json(ok({ stats }));
  } catch (err) {
    console.log("Error saving affiliate stats:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

// ─── Maintenance Plan Draft (per-email checkout handoff) ───────────────────────
router.get("/make-server-3eae23a6/maintenance-draft/:email", async (c) => {
  try {
    const email = c.req.param("email");
    const draft = (await kv.get(MAINT_DRAFT(email))) || null;
    return c.json(ok({ draft }));
  } catch (err) {
    console.log("Error loading maintenance draft:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

router.post("/make-server-3eae23a6/maintenance-draft/:email", async (c) => {
  try {
    const email = c.req.param("email");
    const { draft } = await c.req.json();
    await kv.set(MAINT_DRAFT(email), draft);
    return c.json(ok({ draft }));
  } catch (err) {
    console.log("Error saving maintenance draft:", err);
    return c.json({ success: false, error: String(err) }, 500);
  }
});

export default router;
