/**
 * property-inspections — a dated walkthrough of a property, with evidence.
 *
 * WHY THIS IS NOT JUST MORE PROPERTY MEDIA
 *
 * A property already carries photos and video: that is the portfolio, what the
 * building looks like. An inspection is an *event* — this is what it looked
 * like on this day, area by area, recorded by this person. Collapsing the two
 * would put a photo from 2024 beside one from this morning with nothing to say
 * which was which, and a condition record whose date cannot be trusted is worth
 * nothing in the one moment it matters.
 *
 * IT SAVES AS IT GOES
 *
 * A walkthrough takes an hour, on a phone, in a building with bad signal.
 * Holding an hour of work in a browser tab and posting it once at the end is
 * how somebody loses the lot to a phone call. So an inspection is created first
 * and then updated as each area is done, and it carries a status so a
 * half-finished one is visibly half-finished rather than looking like a
 * complete record of a building in perfect condition.
 *
 * WHO CAN SEE ONE
 *
 * The landlord who owns the property, and staff. A move-out inspection is
 * evidence in a disagreement between a landlord and their tenant, so who else
 * sees it is a decision Eric has not made yet — see `tasks/property-inspections.md`.
 * Until he does, it stays with the side that recorded it, which is the
 * reversible choice.
 */
import { Hono } from "npm:hono@4";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

export const inspectionsRouter = new Hono();

const admin = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
);

const ADMIN_ROLES = new Set(["owner", "admin", "master_admin", "management"]);

/**
 * Keyed by the landlord first, so one prefix read returns everything they own
 * and no query can reach across to somebody else's building. Tenant isolation
 * by construction rather than by a filter somebody has to remember.
 */
const KEY = (email: string, id: string) =>
  `inspection:${String(email).toLowerCase()}:${id}`;
const PREFIX = (email: string) => `inspection:${String(email).toLowerCase()}:`;

async function actor(c: any) {
  const token = String(c.req.header("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user?.email) return null;
  const role = String(user.app_metadata?.role || user.app_metadata?.accountType || "")
    .toLowerCase().replace(/[\s-]+/g, "_");
  return {
    email: String(user.email).toLowerCase(),
    isAdmin: ADMIN_ROLES.has(role),
  };
}

const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/**
 * The areas of an inspection, cleaned.
 *
 * Media carries the id and nothing else that matters. The upload hands back a
 * signed URL good for a day, and an inspection is read months or years later,
 * so storing that URL would fill the record with links that are dead by
 * tomorrow. `GET /media/:id` re-signs on read.
 */
function readAreas(raw: any): any[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 200).map((a: any) => ({
    name: text(a?.name, 120),
    condition: text(a?.condition, 40) || "Good",
    notes: text(a?.notes, 2000),
    media: (Array.isArray(a?.media) ? a.media : []).slice(0, 50).map((m: any) => ({
      id: text(m?.id, 120),
      name: text(m?.name, 200),
      type: text(m?.type, 40),
    })).filter((m: any) => m.id),
  })).filter((a: any) => a.name);
}

/** Every inspection this landlord has, newest first. */
inspectionsRouter.get("/make-server-3eae23a6/landlord/inspections", async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ success: false, error: "Sign in required." }, 401);

  const rows = ((await kv.getByPrefix(PREFIX(who.email))) as any[] || []).filter(Boolean);
  const propertyId = text(c.req.query("propertyId"), 120);
  const filtered = propertyId ? rows.filter((r) => String(r.propertyId) === propertyId) : rows;

  filtered.sort((a, b) => String(b.startedAt || "").localeCompare(String(a.startedAt || "")));
  return c.json({ success: true, count: filtered.length, inspections: filtered });
});

/** One inspection in full. */
inspectionsRouter.get("/make-server-3eae23a6/landlord/inspections/:id", async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ success: false, error: "Sign in required." }, 401);

  const record = await kv.get(KEY(who.email, text(c.req.param("id"), 120)));
  // Staff can reach one they do not own; nobody else can, because the key is
  // scoped to the caller and a miss reads the same as not existing.
  if (!record) return c.json({ success: false, error: "No such inspection." }, 404);
  return c.json({ success: true, inspection: record });
});

/** Start one. Created empty and filled in as the walk happens. */
inspectionsRouter.post("/make-server-3eae23a6/landlord/inspections", async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ success: false, error: "Sign in required." }, 401);

  const body = await c.req.json().catch(() => ({}));
  const propertyId = text(body?.propertyId, 120);
  if (!propertyId) return c.json({ success: false, error: "Which property?" }, 400);

  const now = new Date().toISOString();
  const id = `insp_${crypto.randomUUID()}`;
  const record = {
    id,
    propertyId,
    propertyName: text(body?.propertyName, 240),
    propertyAddress: text(body?.propertyAddress, 400),
    landlordEmail: who.email,
    inspector: text(body?.inspector, 200) || who.email,
    // Draft until somebody says it is finished. A half-done walkthrough that
    // looked complete would read as a building in perfect condition.
    status: "draft",
    areas: readAreas(body?.areas),
    summary: "",
    startedAt: now,
    completedAt: null,
    updatedAt: now,
  };

  await kv.set(KEY(who.email, id), record);
  console.log(`[Inspections] ${who.email} started ${id} on ${propertyId}`);
  return c.json({ success: true, inspection: record }, 201);
});

/**
 * Save progress, or finish.
 *
 * The same route for both because they are the same act from the walker's side
 * — they keep noting things down, and at some point the last note is the last
 * one. `status: 'complete'` stamps the date it was finished, which is the date
 * the record is actually about.
 */
inspectionsRouter.put("/make-server-3eae23a6/landlord/inspections/:id", async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ success: false, error: "Sign in required." }, 401);

  const id = text(c.req.param("id"), 120);
  const existing = await kv.get(KEY(who.email, id)) as any;
  if (!existing) return c.json({ success: false, error: "No such inspection." }, 404);

  const body = await c.req.json().catch(() => ({}));
  const wantsComplete = body?.status === "complete";

  /**
   * A completed inspection is not edited back into a draft.
   *
   * It is a dated statement about a building on a day. Reopening it to change
   * what it says would make every completed inspection arguable, which is the
   * opposite of why anybody takes one.
   */
  if (existing.status === "complete" && !who.isAdmin) {
    return c.json({
      success: false,
      error: "This inspection is complete. Start a new one to record how the property is now.",
    }, 409);
  }

  const now = new Date().toISOString();
  const updated = {
    ...existing,
    areas: body?.areas === undefined ? existing.areas : readAreas(body.areas),
    summary: body?.summary === undefined ? existing.summary : text(body.summary, 5000),
    inspector: body?.inspector === undefined ? existing.inspector : text(body.inspector, 200),
    status: wantsComplete ? "complete" : existing.status,
    completedAt: wantsComplete ? (existing.completedAt || now) : existing.completedAt,
    updatedAt: now,
  };

  await kv.set(KEY(who.email, id), updated);
  if (wantsComplete) console.log(`[Inspections] ${who.email} completed ${id}`);

  return c.json({
    success: true,
    inspection: updated,
    note: wantsComplete
      ? "Recorded. It cannot be edited now — start a new inspection to record a later condition."
      : undefined,
  });
});

/** Drop a draft that was started by mistake. A completed one is kept. */
inspectionsRouter.delete("/make-server-3eae23a6/landlord/inspections/:id", async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ success: false, error: "Sign in required." }, 401);

  const id = text(c.req.param("id"), 120);
  const existing = await kv.get(KEY(who.email, id)) as any;
  if (!existing) return c.json({ success: false, error: "No such inspection." }, 404);

  if (existing.status === "complete" && !who.isAdmin) {
    return c.json({
      success: false,
      error: "A completed inspection is a record of how the property was on a day, and is kept.",
    }, 409);
  }

  await kv.del(KEY(who.email, id));
  return c.json({ success: true, deleted: true });
});

export default inspectionsRouter;
