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

  /**
   * A completed inspection stamps the property it was about.
   *
   * The property AI scores each building partly on how long ago it was last
   * inspected, and with nothing recorded it says so — "No inspection date
   * recorded. Schedule a professional inspection." Somebody who has just
   * spent an hour walking the building with a camera should not then be told
   * to go and inspect it.
   *
   * Written on completion rather than when the walk starts, because a draft
   * abandoned halfway is not an inspection and should not silence the
   * warning.
   *
   * Best effort: the inspection is already saved above, and failing to
   * update a score must not lose an hour of somebody's work.
   */
  if (wantsComplete) {
    console.log(`[Inspections] ${who.email} completed ${id}`);
    try {
      const portfolioKey = `landlord_portfolio:${who.email}`;
      const portfolio = (await kv.get(portfolioKey)) as any[] | null;
      if (Array.isArray(portfolio)) {
        let touched = false;
        const next = portfolio.map((prop: any) => {
          if (String(prop?.id) !== String(updated.propertyId)) return prop;
          touched = true;
          return {
            ...prop,
            lastInspectionDate: updated.completedAt,
            lastInspectionId: updated.id,
          };
        });
        if (touched) {
          await kv.set(portfolioKey, next);
          console.log(`[Inspections] stamped ${updated.propertyId} as inspected ${updated.completedAt}`);
        }
      }
    } catch (err: any) {
      console.error('[Inspections] completed but could not stamp the property:', err?.message || err);
    }
  }

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

/* ── the plan a landlord keeps ────────────────────────────────────────────
 *
 * P6. The inspection says what was observed on a day and never changes. The
 * plan says what is going to be done about it, and changes constantly — things
 * get quoted, done, deferred, reconsidered.
 *
 * So they are separate records. Folding the plan into the inspection would
 * either freeze the plan, which makes it useless, or unfreeze the inspection,
 * which makes it arguable. Neither is acceptable and the split costs nothing.
 *
 * THE PLAN IS THE LANDLORD'S
 *
 * Eric's steer: the plan belongs to them, and each line has a "get this
 * quoted" they press if they want us to do the work. That keeps the pipeline
 * the spine without volunteering somebody else's money — a maintenance plan
 * that silently became a pile of work requests to Black Phoenix would be us
 * deciding how a landlord spends.
 */
export const PLAN_KEY = (email: string, inspectionId: string) =>
  `maintenance_plan:${String(email).toLowerCase()}:${inspectionId}`;

/** The plan for one inspection, if the landlord kept one. */
inspectionsRouter.get("/make-server-3eae23a6/landlord/inspections/:id/plan", async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ success: false, error: "Sign in required." }, 401);

  const id = text(c.req.param("id"), 120);
  const plan = await kv.get(PLAN_KEY(who.email, id));
  return c.json({ success: true, plan: plan || null });
});

/**
 * Keep a plan, or update one.
 *
 * Saved wholesale rather than item by item, because a landlord reading through
 * a draft changes several lines before they are happy — deferring one, cutting
 * another, correcting an estimate — and saving each keystroke separately would
 * make a half-edited plan the stored one.
 */
inspectionsRouter.put("/make-server-3eae23a6/landlord/inspections/:id/plan", async (c) => {
  const who = await actor(c);
  if (!who) return c.json({ success: false, error: "Sign in required." }, 401);

  const id = text(c.req.param("id"), 120);
  const inspection = await kv.get(KEY(who.email, id)) as any;
  if (!inspection) return c.json({ success: false, error: "No such inspection." }, 404);

  const body = await c.req.json().catch(() => ({}));
  const existing = await kv.get(PLAN_KEY(who.email, id)) as any;
  const now = new Date().toISOString();

  const items = (Array.isArray(body?.items) ? body.items : []).slice(0, 100).map((it: any, i: number) => {
    // A line that has already been sent to us for a quote keeps that fact,
    // whatever the browser sends back — otherwise re-saving the plan after
    // requesting a quote would quietly lose the link to the work request.
    const before = existing?.items?.[i];
    return {
      area: text(it?.area, 120),
      work: text(it?.work, 1000),
      why: text(it?.why, 1000),
      urgency: ["urgent", "this year", "watch"].includes(it?.urgency) ? it.urgency : "watch",
      estimateLow: Number(it?.estimateLow) || 0,
      estimateHigh: Number(it?.estimateHigh) || 0,
      confidence: text(it?.confidence, 60),
      status: ["open", "done", "deferred"].includes(it?.status) ? it.status : (before?.status || "open"),
      workRequestId: before?.workRequestId || null,
      quotedAt: before?.quotedAt || null,
    };
  }).filter((it: any) => it.work);

  const plan = {
    inspectionId: id,
    landlordEmail: who.email,
    propertyId: inspection.propertyId,
    propertyName: inspection.propertyName || inspection.propertyAddress || "",
    summary: text(body?.summary, 4000),
    items,
    schedule: Array.isArray(body?.schedule) ? body.schedule.slice(0, 20) : (existing?.schedule || []),
    budget: body?.budget && typeof body.budget === "object" ? body.budget : (existing?.budget || null),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await kv.set(PLAN_KEY(who.email, id), plan);
  console.log(`[Inspections] ${who.email} saved a plan for ${id} with ${items.length} item(s)`);
  return c.json({ success: true, plan });
});

/* ── the assistant ────────────────────────────────────────────────────────
 *
 * P5 of `tasks/property-inspections.md`. Reads a completed inspection and
 * drafts a maintenance plan, a schedule and a budget.
 *
 * VIDEO IS STORED, NOT WATCHED
 *
 * Eric's decision: "store the video, analyze photos and notes." A walkthrough
 * video runs to minutes and costs real money to put through a model, for very
 * little the stills do not already show. So video stays what it is best at
 * being — evidence for a dispute, a record a person can scrub through — and the
 * assistant reads the photographs and what the inspector wrote.
 *
 * IT LOOKS HARDEST AT WHAT IS WORST
 *
 * Every area's condition and notes go in as text, which is cheap. Photographs
 * are capped, and the cap is spent on the areas marked Poor or Damaged first.
 * Twelve pictures of a failing roof are worth more than forty of rooms nobody
 * is worried about, and the difference is money.
 *
 * IT PROPOSES; IT DOES NOT SCHEDULE OR SPEND
 *
 * Nothing is saved. Two of the three outputs are commitments — a date somebody
 * has to keep and money somebody has to find — so they land as a draft a person
 * accepts. What accepting one does is P6, and it is not built.
 */

/** Where the media library keeps its files. */
const MEDIA_BUCKET = "make-3eae23a6-media";

/**
 * How many photographs go to the model.
 *
 * A cap rather than everything, because an inspection can carry fifty images
 * and each one is paid for. Twelve is enough to see the things that matter once
 * the worst areas are picked first.
 */
const MAX_PHOTOS = 12;

/** Worst first — the cap is spent where the answer changes. */
const CONDITION_RANK: Record<string, number> = {
  Damaged: 0, Poor: 1, Fair: 2, Good: 3, Excellent: 4,
};

inspectionsRouter.post("/make-server-3eae23a6/inspection-plan/:id", async (c) => {
  try {
    const who = await actor(c);
    if (!who) return c.json({ success: false, error: "Sign in required." }, 401);

    const id = text(c.req.param("id"), 120);
    const inspection = await kv.get(KEY(who.email, id)) as any;
    if (!inspection) return c.json({ success: false, error: "No such inspection." }, 404);

    /**
     * Only a finished walkthrough.
     *
     * A draft is half a building. Drafting a maintenance plan from it would
     * produce something that looks authoritative about rooms nobody has
     * entered yet, and it would spend money on a model to do it.
     */
    if (inspection.status !== "complete") {
      return c.json({
        success: false,
        error: "Finish the inspection first. A plan drawn from half a walkthrough "
          + "is confident about rooms nobody has looked at yet.",
      }, 400);
    }

    const key = Deno.env.get("ANTHROPIC_API_KEY");
    if (!key) {
      return c.json({ success: false, error: "The assistant is not configured. Set the ANTHROPIC_API_KEY secret." }, 503);
    }

    const areas: any[] = Array.isArray(inspection.areas) ? inspection.areas : [];
    if (!areas.length) return c.json({ success: false, error: "This inspection recorded no areas." }, 400);

    /* ── choose the photographs ────────────────────────────────────────── */
    const candidates: Array<{ area: string; condition: string; mediaId: string }> = [];
    for (const area of [...areas].sort((a, b) =>
      (CONDITION_RANK[a.condition] ?? 9) - (CONDITION_RANK[b.condition] ?? 9))) {
      for (const m of (area.media || [])) {
        // Video is deliberately skipped. It is kept as evidence and never sent.
        if (String(m.type || "").startsWith("video")) continue;
        candidates.push({ area: area.name, condition: area.condition, mediaId: m.id });
      }
    }

    const images: any[] = [];
    const shown: string[] = [];
    for (const candidate of candidates.slice(0, MAX_PHOTOS)) {
      try {
        const item = await kv.get(`media:${candidate.mediaId}`) as any;
        if (!item?.storagePath) continue;
        const { data, error } = await admin.storage.from(MEDIA_BUCKET).download(item.storagePath);
        if (error || !data) continue;
        const bytes = new Uint8Array(await data.arrayBuffer());
        // Chunked rather than spread, because a large image spread into
        // String.fromCharCode in one call blows the argument limit.
        let binary = "";
        for (let i = 0; i < bytes.length; i += 8192) {
          binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        }
        images.push({
          type: "image",
          source: {
            type: "base64",
            media_type: String(item.mimeType || "image/jpeg"),
            data: btoa(binary),
          },
        });
        shown.push(`${candidate.area} (${candidate.condition})`);
      } catch {
        // One unreadable photograph is not a reason to refuse the whole plan.
      }
    }

    /* ── what the inspector actually wrote ─────────────────────────────── */
    const written = areas.map((a) => {
      const photos = (a.media || []).filter((m: any) => !String(m.type || "").startsWith("video")).length;
      const videos = (a.media || []).length - photos;
      return `· ${a.name} — ${a.condition}`
        + (a.notes ? `: ${a.notes}` : "")
        + ` [${photos} photo${photos === 1 ? "" : "s"}`
        + (videos ? `, ${videos} video${videos === 1 ? "" : "s"} on file` : "")
        + "]";
    }).join("\n");

    const system = `You are helping a landlord turn a property inspection into a plan of work.

You are given what the inspector recorded for every area, and photographs of the
areas in the worst condition. Video was taken and is on file; you have not been
shown it, so do not refer to it as though you had.

WRITE FOR SOMEBODY WHO OWNS THE BUILDING, not for a surveyor. Say what needs
doing, why it matters, and what happens if it waits.

URGENCY IS ABOUT CONSEQUENCE, NOT TIDINESS. A failing roof flashing and a
scuffed skirting board are not the same kind of problem. Reserve "urgent" for
things that are unsafe, are letting water in, or will cost markedly more every
month they are left.

COSTS ARE ESTIMATES AND MUST BE LABELLED AS SUCH. Give a realistic range in US
dollars for the work as described, and say when you cannot tell from a
photograph — "needs a closer look" is a legitimate answer and a better one than
a confident number that is wrong.

DO NOT INVENT FINDINGS. If an area was recorded as Good with no notes and you
were shown no photograph of it, it does not appear in the plan.

Return ONLY a JSON object, no prose, no code fence:
{
  "summary": "two or three sentences on the state of the building overall",
  "items": [
    { "area": "Roof & Gutters",
      "work": "what needs doing, in plain words",
      "why": "what happens if it waits",
      "urgency": "urgent" | "this year" | "watch",
      "estimateLow": 0, "estimateHigh": 0,
      "confidence": "clear from the photos" | "needs a closer look" }
  ],
  "schedule": [
    { "when": "Next 30 days" | "Next 3 months" | "Next 12 months" | "Beyond a year",
      "items": ["area — work"] }
  ],
  "budget": {
    "urgentLow": 0, "urgentHigh": 0,
    "yearLow": 0, "yearHigh": 0,
    "note": "one line on how to read these figures"
  }
}`;

    const client = new (await import("npm:@anthropic-ai/sdk")).default({ apiKey: key });
    const message = await client.messages.create({
      model: Deno.env.get("INSPECTION_PLAN_MODEL") || "claude-opus-5",
      max_tokens: 4000,
      system,
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: `Property: ${inspection.propertyName || inspection.propertyAddress || "unnamed"}\n`
              + `Inspected: ${String(inspection.completedAt || "").slice(0, 10)}\n\n`
              + `WHAT THE INSPECTOR RECORDED\n${written}\n\n`
              + (inspection.summary ? `OVERALL NOTES\n${inspection.summary}\n\n` : "")
              + (shown.length
                ? `The photographs that follow are of: ${shown.join("; ")}.`
                : "No photographs were attached, so work from the notes alone and say so in the summary."),
          },
          ...images,
        ],
      }],
    });

    const raw = message.content
      .filter((b: any) => b.type === "text").map((b: any) => b.text).join("").trim();
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const body = fenced ? fenced[1].trim() : raw;
    const first = body.indexOf("{");
    const last = body.lastIndexOf("}");
    let parsed: any;
    try {
      parsed = JSON.parse(first !== -1 && last > first ? body.slice(first, last + 1) : body);
    } catch {
      return c.json({ success: false, error: "The plan came back unreadable. Try again." }, 502);
    }

    console.log(`[Inspections] ${who.email} drafted a plan for ${id} from ${images.length} photo(s)`);
    return c.json({
      success: true,
      inspectionId: id,
      photosRead: images.length,
      photosAvailable: candidates.length,
      plan: parsed,
      // Said plainly on every reply, because a plan that looks saved and is not
      // is how somebody loses an afternoon's thinking.
      note: "Nothing has been saved or scheduled. This is a draft to read and change.",
    });
  } catch (error: any) {
    console.error("[Inspections] plan failed:", error?.message || error);
    return c.json({ success: false, error: error?.message || "Could not draft the plan." }, 500);
  }
});

export default inspectionsRouter;
