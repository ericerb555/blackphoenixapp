/**
 * The scheduling assistant's routes: what it proposes, and confirming one.
 *
 * WHAT IS AND IS NOT AUTOMATIC HERE
 *
 * Proposing is free and changes nothing — `GET /schedule/proposals` reads the
 * work, the roster and the diary and works out what could happen. Nothing is
 * written.
 *
 * Confirming is the act that matters, and it is a POST somebody makes. Eric's
 * rule is auto for the simple and ask for the hard, and this is the line where
 * that is enforced: even a proposal marked `auto` is not written until it is
 * confirmed. The label means "no choice was involved", not "already done".
 *
 * WHY CONFIRMING WRITES BOTH AN APPOINTMENT AND THE WORK REQUEST
 *
 * The appointment ledger is what the master schedule and the customer portal
 * both read; the work request is what the pipeline and job costing follow. A
 * confirmation that wrote one and not the other would put a crew on a calendar
 * for a job that still reads as unscheduled, or the reverse. Both, in one
 * action, or neither.
 */
import { Hono } from "npm:hono@4";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import { readWorkRequests } from "./workRequestStore.ts";
import { proposeSchedule, summariseProposals, type WorkRequestLike } from "./proposeSchedule.ts";
import type { Tech, Unavailability, Booking } from "./availability.ts";
import { tradeFor } from "./tradeFor.ts";

export const scheduleAssistantRouter = new Hono();

const auth = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

const STAFF_ROLES = new Set([
  "owner", "admin", "master_admin", "management", "platform_owner",
  "business_owner", "project_manager", "office", "employee",
]);

async function staffActor(c: any): Promise<{ email: string } | null> {
  const token = String(c.req.header("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await auth.auth.getUser(token);
  const user = error ? null : data?.user;
  if (!user?.email) return null;
  const role = String(
    user.app_metadata?.role || user.app_metadata?.accountType || "",
  ).toLowerCase().replace(/[\s-]+/g, "_");
  return STAFF_ROLES.has(role) ? { email: String(user.email).toLowerCase() } : null;
}

/** Statuses that mean a work request still needs a day. */
const NEEDS_SCHEDULING = new Set(["pending", "new", "approved", "quoted", ""]);

function asPlannable(record: any): WorkRequestLike {
  return {
    id: String(record?.id || ""),
    title: String(record?.title || record?.project_name || record?.serviceType || "Work request"),
    /**
     * The TRADE, resolved from whatever the record calls the work.
     *
     * Never the raw service label. The customer picks from a list of services
     * — "Pressure Washing", "Trash Removal / Hauling" — and handing one of
     * those to `availability` as a trade id is a trade nobody holds. While the
     * roster had no trades recorded that was invisible, because an unrecorded
     * technician is eligible for anything; the moment somebody's trades were
     * filled in, every request became unschedulable. Filling in the roster
     * emptied the schedule.
     *
     * `tradeFor` returns undefined for a service we do not price as a trade,
     * and undefined is passed through as an ABSENT trade, which means anybody
     * may take it.
     */
    trade: tradeFor(record?.trade, record?.serviceType, record?.service, record?.project_type),
    // Hours come from the record where the estimator has put them. Absent is
    // left absent: `availability` offers an unmeasured job rather than hiding
    // it, because an unknown length is a gap in what we measured.
    hours: Number(record?.estimatedHours || record?.hours) || undefined,
    timeline: record?.timeline,
    preferredDate: record?.preferredDate,
    earliestDate: record?.earliestDate,
    latestDate: record?.latestDate,
    avoidDays: Array.isArray(record?.avoidDays) ? record.avoidDays.map(Number) : [],
    requestedTechId: String(record?.requestedTechId || "").trim() || undefined,
    status: String(record?.status || ""),
  };
}

/**
 * What the assistant would do, if asked.
 *
 * Reads only. Safe to call as often as a screen likes, and cheap — there is no
 * model call in here, because working out who is free is arithmetic.
 */
scheduleAssistantRouter.get("/make-server-3eae23a6/schedule/proposals", async (c) => {
  try {
    const me = await staffActor(c);
    if (!me) return c.json({ success: false, error: "Staff access is required." }, 403);

    const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

    const [requests, employees, unavailRows, appointments] = await Promise.all([
      readWorkRequests(),
      kv.getByPrefix("time_employee:"),
      kv.getByPrefix("unavailability:"),
      kv.getByPrefix("appointment:"),
    ]);

    const waiting = (requests as any[] || [])
      .filter(Boolean)
      .filter((r) => NEEDS_SCHEDULING.has(String(r?.status || "").toLowerCase()))
      // Anything already given a day is not waiting for one.
      .filter((r) => !r?.scheduledDate)
      .map(asPlannable)
      .filter((r) => r.id);

    const techs: Tech[] = ((employees as any[]) || []).filter(Boolean).map((e) => ({
      id: String(e.id),
      name: String(e.name || e.email || "Technician"),
      trades: Array.isArray(e.trades) ? e.trades.map(String) : [],
      workingDays: Array.isArray(e.workingDays) ? e.workingDays.map(Number) : undefined,
      workingHours: e.workingHours,
      active: e.active,
    }));

    const unavailability = ((unavailRows as any[]) || []).filter(Boolean) as Unavailability[];
    const bookings: Booking[] = ((appointments as any[]) || []).filter(Boolean).map((a) => ({
      id: String(a.id),
      employeeId: String(a.employeeId || ""),
      date: String(a.date || ""),
      hours: Number(a.estimatedHours) || 1,
      status: String(a.status || "scheduled"),
    }));

    const proposals = proposeSchedule(waiting, techs, unavailability, bookings, today);

    return c.json({
      success: true,
      today,
      summary: summariseProposals(proposals),
      proposals,
      /**
       * Said out loud so a screen can explain an empty or thin plan. A
       * scheduler with nobody on the roster produces nothing, and "no
       * proposals" on its own reads as a fault rather than as an empty roster.
       */
      context: {
        waiting: waiting.length,
        technicians: techs.length,
        techniciansWithoutTrades: techs.filter((t) => !t.trades?.length).length,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not work out a schedule." }, 500);
  }
});

/**
 * Confirm one proposal: the day, the person, and the promise.
 *
 * Writes the appointment first. If the work request update then fails, the
 * appointment is removed again rather than left behind — a crew booked for a
 * job that still reads as unscheduled is the worse of the two half-states,
 * because the schedule looks settled and the pipeline does not.
 */
scheduleAssistantRouter.post("/make-server-3eae23a6/schedule/confirm", async (c) => {
  try {
    const me = await staffActor(c);
    if (!me) return c.json({ success: false, error: "Staff access is required." }, 403);

    const body = await c.req.json().catch(() => ({}));
    const jobId = String(body.jobId || "").trim();
    const techId = String(body.techId || "").trim();
    const date = String(body.date || "").trim();
    if (!jobId || !techId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return c.json({ success: false, error: "A job, a technician and a date are required." }, 400);
    }

    const record = await kv.get(`wr:${jobId}`) as any;
    if (!record) return c.json({ success: false, error: "That work request no longer exists." }, 404);

    const employee = await kv.get(`time_employee:${techId}`) as any;
    if (!employee) return c.json({ success: false, error: "That technician is not on the roster." }, 404);

    const now = new Date().toISOString();
    const appointment = {
      id: `apt_${crypto.randomUUID()}`,
      date,
      time: String(body.time || "08:00"),
      employeeId: techId,
      serviceTitle: String(record.title || record.project_name || record.serviceType || "Scheduled work"),
      customerName: String(record.client_name || record.clientName || ""),
      customerEmail: String(record.client_email || record.clientEmail || "").toLowerCase(),
      location: String(record.site_address || record.address || ""),
      estimatedHours: Number(body.hours) || Number(record.estimatedHours) || 0,
      workRequestId: jobId,
      jobId: record.jobId || null,
      status: "scheduled",
      created_at: now,
      updated_at: now,
      requested_by: me.email,
      scheduledBy: me.email,
    };

    await kv.set(`appointment:${appointment.id}`, appointment);

    try {
      await kv.set(`wr:${jobId}`, {
        ...record,
        status: "assigned",
        scheduledDate: date,
        assignedToEmail: String(employee.email || "").toLowerCase(),
        assignedTo: String(employee.name || ""),
        assignedEmployeeId: techId,
        appointmentId: appointment.id,
        scheduledBy: me.email,
        updated_at: now,
      });
    } catch (inner) {
      await kv.del(`appointment:${appointment.id}`).catch(() => {});
      throw inner;
    }

    console.log(`[schedule] ${jobId} → ${employee.name || techId} on ${date}, by ${me.email}`);
    return c.json({ success: true, appointment });
  } catch (error: any) {
    return c.json({ success: false, error: error?.message || "Could not confirm that." }, 500);
  }
});

/**
 * Generated job schedules — the ones that used to exist only in a browser.
 *
 * `AutoJobScheduleGenerator` builds a schedule for a job — phases, milestones,
 * start and end dates, total cost — and wrote it to `localStorage` under
 * `jobSchedules` and nowhere else. The component has no network calls at all.
 * So a plan with costs in it lived in whichever browser happened to generate
 * it: invisible to everybody else, gone with a cleared cache, and absent from
 * the nightly database backup because it had never been in the database.
 *
 * WHY HERE AND NOT A NEW MODULE
 *
 * This file already owns scheduling, already has `staffActor`, and is already
 * mounted. A new module would have meant a second staff check to keep in step
 * with this one, and the audit of this server found nine of those already.
 *
 * WHY THE CALLER CANNOT NAME THE OWNER
 *
 * The id comes from the record and the owner from the verified token, never
 * from the request. That is deliberate and it is the whole finding of
 * `docs/server-route-authorization.md`: 223 routes on this server take a
 * record id straight from the request, and 25 of them hand over somebody
 * else's data as a result. A route written today should not be the 224th.
 *
 * Staff-only, like everything else in this file. A job schedule is internal
 * planning with margins visible in it, not something a portal customer reads.
 */
const JOB_SCHEDULE_PREFIX = "job_schedule:";

scheduleAssistantRouter.get("/make-server-3eae23a6/schedule/job-schedules", async (c) => {
  try {
    const me = await staffActor(c);
    if (!me) return c.json({ success: false, error: "Staff access is required." }, 403);

    const rows = await kv.getByPrefix(JOB_SCHEDULE_PREFIX).catch(() => []) as any[];
    const schedules = (rows || [])
      .filter(Boolean)
      .sort((a, b) => String(b?.createdAt || "").localeCompare(String(a?.createdAt || "")));

    return c.json({ success: true, schedules });
  } catch (error: any) {
    console.error("[schedule] job-schedules read failed:", error?.message || error);
    return c.json({ success: false, error: error?.message || "Could not load the schedules." }, 500);
  }
});

scheduleAssistantRouter.post("/make-server-3eae23a6/schedule/job-schedules", async (c) => {
  try {
    const me = await staffActor(c);
    if (!me) return c.json({ success: false, error: "Staff access is required." }, 403);

    const body = await c.req.json().catch(() => ({}));
    const schedule = body?.schedule;
    if (!schedule || typeof schedule !== "object") {
      return c.json({ success: false, error: "No schedule in that request." }, 400);
    }

    /*
     * The id is ours, not the browser's.
     *
     * A client-supplied id would let one schedule overwrite another by
     * collision or by choice, and this is a store a staff member writes to
     * repeatedly from a generator that does not track what it has already
     * sent. An id minted here cannot collide and cannot be aimed.
     */
    const id = `js_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const record = {
      ...schedule,
      id,
      createdBy: me.email,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`${JOB_SCHEDULE_PREFIX}${id}`, record);
    return c.json({ success: true, schedule: record });
  } catch (error: any) {
    console.error("[schedule] job-schedule write failed:", error?.message || error);
    return c.json({ success: false, error: error?.message || "Could not save that schedule." }, 500);
  }
});

export default scheduleAssistantRouter;
