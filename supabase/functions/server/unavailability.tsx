/**
 * Time off and call-outs — the reasons somebody cannot work.
 *
 * ONE RECORD TYPE, NOT TWO
 *
 * The scheduler asks these one question — is this person available — and two
 * stores would mean two places to forget to check. A call-out and a booked
 * holiday differ in how they START, not in what they do to a day.
 *
 *   time_off   requested ahead, and blocks nothing until an admin approves it
 *   call_out   same morning, declared by the technician, blocks immediately
 *
 * WHY A CALL-OUT NEEDS NOBODY'S APPROVAL
 *
 * Because waiting for one would leave somebody on the schedule who has already
 * said they are not coming. The approval would arrive after the crew was due on
 * site. A call-out is a statement of fact, not a request.
 *
 * WHY TIME OFF NEEDS ONE
 *
 * Eric's decision: requested by the technician, approved by an admin or owner.
 * A pending request must not quietly remove somebody from the schedule, or a
 * request nobody has read becomes a day with no cover that nobody decided on.
 * `blocksDay` in `availability.ts` enforces that and is tested for it.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 *
 * Move anybody's jobs. Recording that Dave is off on Tuesday and deciding what
 * happens to Tuesday's work are different actions with different risks, and the
 * second one touches promises already made to customers.
 */
import { Hono } from "npm:hono@4";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import type { Unavailability, UnavailabilityKind } from "./availability.ts";

export const unavailabilityRouter = new Hono();

const auth = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const ADMIN_ROLES = new Set([
  "owner", "admin", "master_admin", "management", "hr", "human_resources",
  "platform_owner", "business_owner",
]);

async function actor(c: any): Promise<{ id: string; email: string; admin: boolean } | null> {
  const token = String(c.req.header("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await auth.auth.getUser(token);
  const user = error ? null : data?.user;
  if (!user?.id) return null;
  const role = String(
    user.app_metadata?.role || user.app_metadata?.accountType || "",
  ).toLowerCase().replace(/[\s-]+/g, "_");
  return { id: String(user.id), email: String(user.email || "").toLowerCase(), admin: ADMIN_ROLES.has(role) };
}

const key = (id: string) => `unavailability:${id}`;
const isDate = (v: unknown) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

/**
 * Today where the company is, not where the server is.
 *
 * A call-out declared at 7am in New Hampshire is 11am or noon UTC, so a server
 * computing "today" from UTC agrees. But a technician ringing in at 9pm would
 * be recorded as tomorrow, taking them off the wrong day entirely. Fixed to the
 * company's own timezone rather than the box's.
 */
function companyToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

/**
 * Record that somebody cannot work.
 *
 * A technician may only file their OWN. An admin may file for anybody, because
 * the person who rings in sick at 6am is not going to open the portal, and a
 * call-out somebody has to take by phone is the commonest kind.
 */
unavailabilityRouter.post("/make-server-3eae23a6/unavailability", async (c) => {
  try {
    const me = await actor(c);
    if (!me) return c.json({ success: false, error: "Sign in required." }, 401);

    const body = await c.req.json().catch(() => ({}));
    const employeeId = String(body.employeeId || me.id).trim();
    if (!me.admin && employeeId !== me.id) {
      return c.json({ success: false, error: "You may only record your own time off." }, 403);
    }

    const kind: UnavailabilityKind = body.kind === "call_out" ? "call_out" : "time_off";
    const from = isDate(body.from) ? String(body.from) : (kind === "call_out" ? companyToday() : "");
    if (!from) return c.json({ success: false, error: "A start date is required." }, 400);
    const to = isDate(body.to) ? String(body.to) : from;
    if (to < from) return c.json({ success: false, error: "The end date is before the start date." }, 400);

    /**
     * A call-out is filed as already in force; time off starts as a request.
     *
     * An admin filing time off on somebody's behalf still files a REQUEST
     * rather than an approval. Recording it and deciding it are two acts, and
     * collapsing them means a day comes off the schedule with nobody's name
     * against the decision.
     */
    const now = new Date().toISOString();
    const record: Unavailability & Record<string, any> = {
      id: String(body.id || `unavail_${crypto.randomUUID()}`),
      employeeId,
      from,
      to,
      kind,
      status: kind === "call_out" ? "approved" : "requested",
      reason: String(body.reason || "").trim().slice(0, 500),
      requestedBy: me.email,
      createdAt: now,
      updatedAt: now,
    };

    await kv.set(key(record.id!), record);
    console.log(`[schedule] ${kind} recorded for ${employeeId} ${from}..${to} by ${me.email}`);
    return c.json({ success: true, unavailability: record }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not record that." }, 500);
  }
});

/**
 * What is on file.
 *
 * A technician sees their own; an admin sees everybody's, because the whole
 * point of the admin view is the pending requests waiting on a decision.
 */
unavailabilityRouter.get("/make-server-3eae23a6/unavailability", async (c) => {
  try {
    const me = await actor(c);
    if (!me) return c.json({ success: false, error: "Sign in required." }, 401);

    const all = ((await kv.getByPrefix("unavailability:")) as any[] || []).filter(Boolean);
    const mine = me.admin ? all : all.filter((r) => String(r?.employeeId) === me.id);

    const from = isDate(c.req.query("from")) ? String(c.req.query("from")) : null;
    const to = isDate(c.req.query("to")) ? String(c.req.query("to")) : null;
    // Overlap, not containment: a fortnight's leave that starts before the
    // window still takes days out of it.
    const inWindow = (r: any) =>
      (!to || String(r.from) <= to) && (!from || String(r.to || r.from) >= from);

    return c.json({
      success: true,
      unavailability: mine.filter(inWindow).sort((a, b) => String(a.from).localeCompare(String(b.from))),
    });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not load that." }, 500);
  }
});

/**
 * Approve or decline a request.
 *
 * Admin only, and deliberately not something the requester can do to their own
 * — which is why it is a separate route from the POST rather than a status
 * field anybody may set.
 */
unavailabilityRouter.post("/make-server-3eae23a6/unavailability/:id/decide", async (c) => {
  try {
    const me = await actor(c);
    if (!me) return c.json({ success: false, error: "Sign in required." }, 401);
    if (!me.admin) return c.json({ success: false, error: "Administrator access is required." }, 403);

    const existing = await kv.get(key(c.req.param("id"))) as any;
    if (!existing) return c.json({ success: false, error: "That record no longer exists." }, 404);

    const body = await c.req.json().catch(() => ({}));
    const decision = String(body.decision || "").toLowerCase();
    if (decision !== "approved" && decision !== "declined") {
      return c.json({ success: false, error: "Decide approved or declined." }, 400);
    }

    const now = new Date().toISOString();
    const updated = {
      ...existing,
      status: decision,
      decidedBy: me.email,
      decidedAt: now,
      decisionNote: String(body.note || "").trim().slice(0, 500),
      updatedAt: now,
    };
    await kv.set(key(updated.id), updated);
    console.log(`[schedule] ${existing.kind} ${updated.id} ${decision} by ${me.email}`);
    return c.json({ success: true, unavailability: updated });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not record that decision." }, 500);
  }
});

/**
 * Withdraw a request, or call off a call-out.
 *
 * Cancelled rather than deleted. Somebody asked for a day and then did not take
 * it, and that is worth being able to see afterwards — deleting it leaves an
 * unexplained gap in a schedule people will later try to reconstruct.
 *
 * The requester may cancel their own; an admin may cancel anybody's.
 */
unavailabilityRouter.post("/make-server-3eae23a6/unavailability/:id/cancel", async (c) => {
  try {
    const me = await actor(c);
    if (!me) return c.json({ success: false, error: "Sign in required." }, 401);

    const existing = await kv.get(key(c.req.param("id"))) as any;
    if (!existing) return c.json({ success: false, error: "That record no longer exists." }, 404);
    if (!me.admin && String(existing.employeeId) !== me.id) {
      return c.json({ success: false, error: "You may only cancel your own." }, 403);
    }

    const now = new Date().toISOString();
    const updated = { ...existing, status: "cancelled", cancelledBy: me.email, updatedAt: now };
    await kv.set(key(updated.id), updated);
    return c.json({ success: true, unavailability: updated });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not cancel that." }, 500);
  }
});

export default unavailabilityRouter;
