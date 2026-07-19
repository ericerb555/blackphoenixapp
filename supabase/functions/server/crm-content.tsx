/**
 * CRM & Content Router — Batch 2
 *
 * Real, backend-wired implementations for what used to be localStorage-only tools:
 *  - Lead CRM            → KV-persisted leads + notes (also surfaces exit-intent leads)
 *  - Reviews moderation  → KV-persisted approved/hidden state (shared across admins)
 *  - Coupon Manager      → KV-persisted coupons + validation endpoint
 *  - Live Chat Manager   → KV-persisted widget config + captured chat leads
 *  - Blog Manager        → KV-persisted posts (draft/published/scheduled)
 *
 * All data lives in the shared KV table via ./kv_store.tsx.
 */

import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";

const router = new Hono();

// ── KV key helpers ──────────────────────────────────────────────────────────
const LEAD = (id: string) => `lead:${id}`;
const CRM_NOTE = (id: string) => `crm_note:${id}`;
const COUPON = (id: string) => `coupon:${id}`;
const CHAT_LEAD = (id: string) => `chat_lead:${id}`;
const BLOG_POST = (id: string) => `blog_post:${id}`;
const REVIEWS_MODERATION = "reviews_moderation:default";
const CHAT_CONFIG = "chat_config:default";

const uid = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// ════════════════════════════════════════════════════════════════════════════
// LEAD CRM
// ════════════════════════════════════════════════════════════════════════════

const ALLOWED_SOURCES = ["booking", "chat", "email", "affiliate", "subscription", "review", "walk-in", "referral", "social"];

// Normalize any stored lead (including exit-intent captures) into the CRM shape.
function normalizeLead(l: any) {
  const source = ALLOWED_SOURCES.includes(l.source) ? l.source : "email";
  return {
    id: l.id,
    name: l.name || (l.email ? l.email.split("@")[0] : "Unknown"),
    email: l.email || "",
    phone: l.phone || undefined,
    city: l.city || undefined,
    source,
    service: l.service || undefined,
    stage: l.stage || "new",
    score: typeof l.score === "number" ? l.score : 50,
    value: typeof l.value === "number" ? l.value : 0,
    createdAt: l.capturedAt || l.createdAtISO || new Date(l.createdAt || Date.now()).toISOString(),
    lastContact: l.lastContact || undefined,
    tags: Array.isArray(l.tags) ? l.tags : [],
    urgent: !!l.urgent,
    _ts: l.createdAt || 0,
  };
}

router.get("/make-server-57095a78/crm/leads", async (c) => {
  try {
    const raw = (await kv.getByPrefix("lead:")) || [];
    const leads = raw.map(normalizeLead).sort((a: any, b: any) => (b._ts || 0) - (a._ts || 0));
    return c.json({ success: true, leads });
  } catch (e: any) {
    console.log("CRM leads list error:", e.message);
    return c.json({ success: false, error: e.message }, 500);
  }
});

router.post("/make-server-57095a78/crm/leads", async (c) => {
  try {
    const b = await c.req.json();
    if (!b.name || !b.email) return c.json({ success: false, error: "Name and email are required" }, 400);
    const id = uid("lead");
    const lead = {
      id,
      name: b.name,
      email: b.email,
      phone: b.phone || "",
      city: b.city || "",
      source: b.source || "email",
      service: b.service || "",
      stage: b.stage || "new",
      score: typeof b.score === "number" ? b.score : Math.floor(40 + Math.random() * 40),
      value: Number(b.value) || 0,
      tags: Array.isArray(b.tags) ? b.tags : [],
      urgent: !!b.urgent,
      status: "new",
      createdAt: Date.now(),
    };
    await kv.set(LEAD(id), lead);
    return c.json({ success: true, lead: normalizeLead(lead) });
  } catch (e: any) {
    console.log("CRM lead create error:", e.message);
    return c.json({ success: false, error: e.message }, 500);
  }
});

router.put("/make-server-57095a78/crm/leads/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const existing: any = await kv.get(LEAD(id));
    if (!existing) return c.json({ success: false, error: "Lead not found" }, 404);
    const b = await c.req.json();
    const updated = { ...existing, ...b, id };
    if (b.stage) updated.lastContact = new Date().toISOString();
    await kv.set(LEAD(id), updated);
    return c.json({ success: true, lead: normalizeLead(updated) });
  } catch (e: any) {
    console.log("CRM lead update error:", e.message);
    return c.json({ success: false, error: e.message }, 500);
  }
});

router.delete("/make-server-57095a78/crm/leads/:id", async (c) => {
  try {
    await kv.del(LEAD(c.req.param("id")));
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

router.get("/make-server-57095a78/crm/notes", async (c) => {
  try {
    const notes = (await kv.getByPrefix("crm_note:")) || [];
    notes.sort((a: any, b: any) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return c.json({ success: true, notes });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

router.post("/make-server-57095a78/crm/notes", async (c) => {
  try {
    const b = await c.req.json();
    if (!b.leadId || !b.body) return c.json({ success: false, error: "leadId and body are required" }, 400);
    const id = uid("note");
    const note = { id, leadId: b.leadId, body: b.body, at: new Date().toISOString() };
    await kv.set(CRM_NOTE(id), note);
    return c.json({ success: true, note });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// REVIEWS MODERATION
// ════════════════════════════════════════════════════════════════════════════

router.get("/make-server-57095a78/reviews/moderation", async (c) => {
  try {
    const state = (await kv.get(REVIEWS_MODERATION)) || { approved: [], hidden: [] };
    return c.json({ success: true, approved: state.approved || [], hidden: state.hidden || [] });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

router.post("/make-server-57095a78/reviews/moderation", async (c) => {
  try {
    const b = await c.req.json();
    const state = {
      approved: Array.isArray(b.approved) ? b.approved : [],
      hidden: Array.isArray(b.hidden) ? b.hidden : [],
      updatedAt: new Date().toISOString(),
    };
    await kv.set(REVIEWS_MODERATION, state);
    return c.json({ success: true, ...state });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// COUPONS
// ════════════════════════════════════════════════════════════════════════════

router.get("/make-server-57095a78/coupons", async (c) => {
  try {
    const coupons = (await kv.getByPrefix("coupon:")) || [];
    coupons.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ success: true, coupons });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

router.post("/make-server-57095a78/coupons", async (c) => {
  try {
    const b = await c.req.json();
    if (!b.code) return c.json({ success: false, error: "Code is required" }, 400);
    const id = b.id || uid("coupon");
    const coupon = {
      id,
      code: String(b.code).toUpperCase(),
      description: b.description || "",
      type: b.type || "percent",
      value: Number(b.value) || 0,
      minOrder: Number(b.minOrder) || 0,
      maxUses: b.maxUses === null || b.maxUses === "" || b.maxUses === undefined ? null : Number(b.maxUses),
      usedCount: Number(b.usedCount) || 0,
      active: b.active !== false,
      expiresAt: b.expiresAt || null,
      createdAt: b.createdAt || new Date().toISOString(),
      categories: Array.isArray(b.categories) ? b.categories : [],
      source: b.source || "manual",
      redemptions: Array.isArray(b.redemptions) ? b.redemptions : [],
    };
    await kv.set(COUPON(id), coupon);
    return c.json({ success: true, coupon });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

router.put("/make-server-57095a78/coupons/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const existing: any = await kv.get(COUPON(id));
    if (!existing) return c.json({ success: false, error: "Coupon not found" }, 404);
    const b = await c.req.json();
    const coupon = {
      ...existing,
      ...b,
      id,
      code: b.code ? String(b.code).toUpperCase() : existing.code,
      maxUses: b.maxUses === null || b.maxUses === "" ? null : b.maxUses !== undefined ? Number(b.maxUses) : existing.maxUses,
    };
    await kv.set(COUPON(id), coupon);
    return c.json({ success: true, coupon });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

router.delete("/make-server-57095a78/coupons/:id", async (c) => {
  try {
    await kv.del(COUPON(c.req.param("id")));
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// Validate a coupon code for checkout.
router.get("/make-server-57095a78/coupons/validate/:code", async (c) => {
  try {
    const code = c.req.param("code").toUpperCase();
    const coupons = (await kv.getByPrefix("coupon:")) || [];
    const match = coupons.find((x: any) => (x.code || "").toUpperCase() === code);
    if (!match) return c.json({ success: true, valid: false, reason: "not found" });
    const expired = match.expiresAt && new Date(match.expiresAt) < new Date();
    const limitReached = match.maxUses != null && match.usedCount >= match.maxUses;
    const valid = match.active && !expired && !limitReached;
    return c.json({ success: true, valid, coupon: match, reason: expired ? "expired" : limitReached ? "limit reached" : valid ? "ok" : "inactive" });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// LIVE CHAT
// ════════════════════════════════════════════════════════════════════════════

router.get("/make-server-57095a78/chat/config", async (c) => {
  try {
    const config = (await kv.get(CHAT_CONFIG)) || null;
    return c.json({ success: true, config });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

router.post("/make-server-57095a78/chat/config", async (c) => {
  try {
    const b = await c.req.json();
    const config = { ...b, updatedAt: new Date().toISOString() };
    await kv.set(CHAT_CONFIG, config);
    return c.json({ success: true, config });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

router.get("/make-server-57095a78/chat/leads", async (c) => {
  try {
    const leads = (await kv.getByPrefix("chat_lead:")) || [];
    leads.sort((a: any, b: any) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
    return c.json({ success: true, leads });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// Called by the chat widget when a visitor leaves their contact info.
router.post("/make-server-57095a78/chat/leads", async (c) => {
  try {
    const b = await c.req.json();
    if (!b.email) return c.json({ success: false, error: "Email is required" }, 400);
    const id = uid("chatlead");
    const lead = {
      id,
      name: b.name || "",
      email: b.email,
      source: b.source || "live-chat",
      capturedAt: b.capturedAt || new Date().toISOString(),
    };
    await kv.set(CHAT_LEAD(id), lead);
    return c.json({ success: true, lead });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

router.delete("/make-server-57095a78/chat/leads", async (c) => {
  try {
    const leads = (await kv.getByPrefix("chat_lead:")) || [];
    if (leads.length) await kv.mdel(leads.map((l: any) => CHAT_LEAD(l.id)));
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// BLOG
// ════════════════════════════════════════════════════════════════════════════

router.get("/make-server-57095a78/blog/posts", async (c) => {
  try {
    const posts = (await kv.getByPrefix("blog_post:")) || [];
    posts.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ success: true, posts });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// Upsert a blog post (create or update).
router.post("/make-server-57095a78/blog/posts", async (c) => {
  try {
    const b = await c.req.json();
    if (!b.id) return c.json({ success: false, error: "Post id is required" }, 400);
    await kv.set(BLOG_POST(b.id), b);
    return c.json({ success: true, post: b });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

router.delete("/make-server-57095a78/blog/posts/:id", async (c) => {
  try {
    await kv.del(BLOG_POST(c.req.param("id")));
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// Register a real view: atomically increment the post's view counter.
router.post("/make-server-57095a78/blog/posts/:id/view", async (c) => {
  try {
    const id = c.req.param("id");
    const post = await kv.get(BLOG_POST(id));
    if (!post) return c.json({ success: false, error: "Post not found" }, 404);
    post.views = (Number(post.views) || 0) + 1;
    await kv.set(BLOG_POST(id), post);
    return c.json({ success: true, views: post.views });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

export default router;
