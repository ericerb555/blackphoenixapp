/**
 * Time Tracking API Routes
 * Handles employee time entries, GPS tracking, and payroll integration
 */

import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import * as kv from "./kv_store.tsx";
import { shiftStatus, autoClosePunchOut, blockedFromPayroll, reviewReason, AUTO_CLOSE_AFTER_HOURS } from "./shiftLimits.ts";

type TimeTrackingVariables = { actor: any; admin: boolean };
const timeTrackingRouter = new Hono<{ Variables: TimeTrackingVariables }>();
const auth = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);
const ADMIN_ROLES = new Set(["owner", "admin", "master_admin", "management", "hr", "human_resources"]);

async function authenticatedActor(c: any) {
  const token = String(c.req.header("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data: { user }, error } = await auth.auth.getUser(token);
  return error || !user ? null : user;
}

async function hasAdminAccess(user: any) {
  const metadataRole = String(user?.app_metadata?.role || user?.app_metadata?.accountType || "").toLowerCase();
  if (ADMIN_ROLES.has(metadataRole)) return true;
  if (!user?.id) return false;
  try {
    const { data } = await auth.from("user_permissions").select("role_name").eq("user_id", user.id);
    return (data || []).some((row: any) => ADMIN_ROLES.has(String(row.role_name || "").toLowerCase()));
  } catch {
    return false;
  }
}

function ownsEmployee(c: any, employeeId: string) {
  return Boolean(c.get("admin") || String(c.get("actor")?.id || "") === String(employeeId || ""));
}

/**
 * Close a shift that has plainly been forgotten, whenever we next look at it.
 *
 * There is no scheduler here, so this runs lazily: any route that reads an
 * employee's active entry calls it first. That is enough, because the only
 * things that care about a stale entry — the timeclock screen, punching in
 * again, payroll — all read it on the way past.
 *
 * It never shortens a real day. Nothing happens before sixteen hours, and what
 * happens then is a closure marked `needsReview` with a placeholder finish time
 * that payroll refuses to accept. Somebody has to say when the person actually
 * stopped. See shiftLimits.ts for why eight hours only nudges.
 */
async function closeIfAbandoned(employeeId: string, activeEntry: any): Promise<any | null> {
  if (!activeEntry?.punchIn) return activeEntry ?? null;
  const status = shiftStatus(activeEntry.punchIn, Date.now(), Number(activeEntry.breakMinutes || 0));
  if (status.state !== "auto-close") return activeEntry;

  const punchOut = autoClosePunchOut(activeEntry.punchIn);
  const totalHours = Math.round(
    ((Date.parse(punchOut) - Date.parse(activeEntry.punchIn)) / 3_600_000
      - Number(activeEntry.breakMinutes || 0) / 60) * 100,
  ) / 100;

  const closed = {
    ...activeEntry,
    punchOut,
    totalHours,
    status: "completed",
    autoClosed: true,
    needsReview: true,
    autoClosedAt: new Date().toISOString(),
    notes: [activeEntry.notes, "Auto-closed: this shift ran past 16 hours. The finish time is a placeholder."]
      .filter(Boolean).join(" — "),
  };

  const dateKey = String(activeEntry.punchIn).split("T")[0];
  await kv.set(`time_entry_history:${employeeId}:${dateKey}:${activeEntry.id}`, closed);
  await kv.del(`time_entry_active:${employeeId}`);

  const employee = await kv.get(`time_employee:${employeeId}`) as any;
  if (employee) {
    employee.status = "clocked-out";
    employee.currentShiftStart = null;
    // Deliberately NOT added to hoursToday/hoursWeek. The number is a
    // placeholder and those totals are read as fact.
    await kv.set(`time_employee:${employeeId}`, employee);
  }

  console.log(`[time] auto-closed abandoned shift ${activeEntry.id} for ${employeeId} after 16h`);
  return null;
}

function requireEmployeeAccess(c: any, employeeId: string) {
  return ownsEmployee(c, employeeId) ? null : c.json({ success: false, error: "You may only access your own time records." }, 403);
}

function requireAdmin(c: any) {
  return c.get("admin") ? null : c.json({ success: false, error: "Administrator access is required." }, 403);
}

// ─── Work orders and time allocation ────────────────────────────────────────
//
// A "work order" here is a work request — one entity under two names, with no
// separate work_order: records anywhere. Assignment is recorded inconsistently
// across several field spellings depending on which screen did the assigning,
// so all of them are checked rather than picking one and quietly missing jobs.
//
// Employees may only bill time to work orders assigned to them. Labour hours
// drive what a customer is invoiced, so time landing on a job somebody was never
// on is not untidy — it is a wrong invoice.

/**
 * Every work request, across the three keys they have ended up spread over.
 *
 *   all_work_requests        real customer submissions — the live jobs
 *   work_requests            what the property-management routes read and write
 *   work_requests_anonymous  completed jobs kept as marketing showcase pieces
 *
 * The last one is the trap: those eight records are finished projects with
 * before-and-after photos and an approvedForMarketing flag, kept for the public
 * gallery. They are not jobs anybody is going to work on, and offering them as
 * somewhere to bill hours would be offering to bill time to a photograph.
 * Completed requests are dropped for that reason.
 */
async function allWorkRequests(): Promise<any[]> {
  const buckets = await Promise.all([
    kv.get("all_work_requests"),
    kv.get("work_requests"),
    kv.get("work_requests_anonymous"),
  ]);
  const rows: any[] = [];
  for (const b of buckets) if (Array.isArray(b)) rows.push(...b);
  const prefixed = (await kv.getByPrefix("work_request:")) as any[] | null;
  if (Array.isArray(prefixed)) rows.push(...prefixed);

  const finished = new Set(["completed", "complete", "closed", "cancelled", "canceled"]);
  const seen = new Set<string>();
  return rows.filter((r) => {
    const id = String(r?.id || "");
    if (!id || seen.has(id)) return false;
    if (finished.has(String(r?.status || "").toLowerCase())) return false;
    seen.add(id);
    return true;
  });
}

/** A work request's title, which is spelled differently depending on its origin. */
function workRequestTitle(r: any): string {
  return String(
    r?.title ||
    r?.serviceType ||
    r?.project_type ||
    (r?.description ? String(r.description).split("\n")[0].slice(0, 80) : "") ||
    "Work order",
  );
}

/** And its customer, likewise. */
function workRequestCustomer(r: any): string {
  return String(r?.customerName || r?.clientName || r?.client_name || r?.client_info?.name || "");
}

/** Is this work request assigned to this employee? */
function assignedToEmployee(request: any, employee: any, user: any): boolean {
  const email = String(user?.email || employee?.email || "").toLowerCase();
  const name = String(employee?.name || "").trim().toLowerCase();

  const emailFields = [
    request?.assignedToEmail, request?.assigned_to_email,
    request?.assignedTechnicianEmail, request?.assigned_technician_email,
    request?.employeeEmail, request?.employee_email,
  ];
  if (email && emailFields.some((v: any) => String(v || "").toLowerCase() === email)) return true;

  // The assign screen writes a free-text crew or technician name, so a name
  // match is the only link available for anything assigned that way. Exact
  // match only — a substring would attach one person's hours to another's job.
  const nameFields = [request?.assignedTo, request?.assigned_to, request?.assignedTech, request?.crewName];
  if (name && nameFields.some((v: any) => String(v || "").trim().toLowerCase() === name)) return true;

  const ids = [request?.assignedEmployeeId, request?.employeeId];
  return Boolean(employee?.id && ids.some((v: any) => String(v || "") === String(employee.id)));
}

timeTrackingRouter.use("*", async (c, next) => {
  const actor = await authenticatedActor(c);
  if (!actor?.id) return c.json({ success: false, error: "Sign in is required for time tracking." }, 401);
  c.set("actor", actor);
  c.set("admin", await hasAdminAccess(actor));
  await next();
});

/**
 * The work orders this employee is allowed to bill time to.
 *
 * Admins get everything, because they reconcile other people's timesheets.
 */
timeTrackingRouter.get("/my-work-orders/:employeeId", async (c) => {
  const employeeId = c.req.param("employeeId");
  const denial = requireEmployeeAccess(c, employeeId);
  if (denial) return denial;
  try {
    const employee = await kv.get(`time_employee:${employeeId}`);
    if (!employee) return c.json({ success: false, error: "Employee not found" }, 404);

    const requests = await allWorkRequests();
    const isAdmin = c.get("admin");
    const mine = isAdmin ? requests : requests.filter((r) => assignedToEmployee(r, employee, c.get("actor")));

    return c.json({
      success: true,
      workOrders: mine.map((r) => ({
        id: String(r.id),
        title: workRequestTitle(r),
        status: String(r.status || ""),
        customer: workRequestCustomer(r),
        location: String(r.location || r.propertyAddress || [r.city, r.state].filter(Boolean).join(", ") || ""),
      })),
      // Said out loud so an empty list is not read as "no work assigned" when it
      // actually means nobody has been assigned to anything yet.
      totalWorkRequests: requests.length,
      scope: isAdmin ? "all" : "assigned",
    });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get all employees with time tracking status
timeTrackingRouter.get("/employees", async (c) => {
  const denial = requireAdmin(c);
  if (denial) return denial;
  try {
    const employees = await kv.getByPrefix("time_employee:");
    
    // Get active time entries for each employee
    const activeEntries = await kv.getByPrefix("time_entry_active:");
    
    // Merge employee data with active entries
    const employeesWithStatus = employees.map((emp: any) => {
      const activeEntry = activeEntries.find((entry: any) => 
        entry.employeeId === emp.id && entry.status === 'active'
      );
      
      return {
        ...emp,
        currentEntry: activeEntry || null,
        isActive: !!activeEntry
      };
    });
    
    return c.json({
      success: true,
      employees: employeesWithStatus,
      count: employeesWithStatus.length
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get specific employee
timeTrackingRouter.get("/employees/:id", async (c) => {
  const employeeId = c.req.param("id");
  const denial = requireEmployeeAccess(c, employeeId);
  if (denial) return denial;
  try {
    // The active entry is settled first, because closing an abandoned shift
    // also flips the employee's status — reading the employee before that would
    // hand the timeclock a record still saying "clocked in".
    const activeEntry = await closeIfAbandoned(employeeId, await kv.get(`time_entry_active:${employeeId}`));

    const employee = await kv.get(`time_employee:${employeeId}`);
    if (!employee) {
      return c.json({ success: false, error: "Employee not found" }, 404);
    }

    // Get recent entries (last 30 days)
    const allEntries = await kv.getByPrefix(`time_entry_history:${employeeId}:`);
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentEntries = allEntries.filter((entry: any) =>
      new Date(entry.punchIn).getTime() > thirtyDaysAgo
    );

    return c.json({
      success: true,
      employee,
      activeEntry: activeEntry || null,
      // How long they have been on the clock, and whether to put the punch-out
      // prompt in front of them. Computed here rather than in the browser so
      // every screen showing a running shift agrees about it.
      shift: activeEntry
        ? shiftStatus(activeEntry.punchIn, Date.now(), Number(activeEntry.breakMinutes || 0))
        : null,
      // Entries payroll will refuse until somebody sets a real finish time.
      needsReview: recentEntries
        .filter((e: any) => blockedFromPayroll(e))
        .map((e: any) => ({ id: e.id, punchIn: e.punchIn, reason: reviewReason(e) })),
      recentEntries
    });
  } catch (error) {
    console.error("Error fetching employee:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create/Update employee
timeTrackingRouter.post("/employees", async (c) => {
  try {
    const body = await c.req.json();
    const { id, name, role, department, phoneNumber, payRate, assignedProject } = body;
    const denial = requireEmployeeAccess(c, id);
    if (denial) return denial;
    
    if (!id || !name) {
      return c.json({ success: false, error: "Employee ID and name are required" }, 400);
    }
    
    const existing = await kv.get(`time_employee:${id}`) as any;
    const isAdmin = Boolean(c.get("admin"));
    const employee = {
      ...(existing || {}),
      id,
      // A field user can keep their name current but cannot modify pay, role, department, or assignment.
      name: name || existing?.name || c.get("actor")?.email || "Employee",
      role: isAdmin ? (role || existing?.role || 'Employee') : (existing?.role || 'Employee'),
      department: isAdmin ? (department || existing?.department || 'General') : (existing?.department || 'General'),
      phoneNumber: isAdmin ? (phoneNumber || existing?.phoneNumber || '') : (existing?.phoneNumber || ''),
      payRate: isAdmin ? Number(payRate ?? existing?.payRate ?? 0) : Number(existing?.payRate || 0),
      assignedProject: isAdmin ? (assignedProject ?? existing?.assignedProject ?? null) : (existing?.assignedProject ?? null),
      status: existing?.status || 'clocked-out',
      hoursToday: Number(existing?.hoursToday || 0),
      hoursWeek: Number(existing?.hoursWeek || 0),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`time_employee:${id}`, employee);
    
    return c.json({
      success: true,
      employee
    });
  } catch (error) {
    console.error("Error creating/updating employee:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Punch In
timeTrackingRouter.post("/punch-in", async (c) => {
  try {
    const body = await c.req.json();
    const { employeeId, location, projectId, notes } = body;
    const denial = requireEmployeeAccess(c, employeeId);
    if (denial) return denial;
    
    if (!employeeId) {
      return c.json({ success: false, error: "Employee ID is required" }, 400);
    }
    
    // Get employee
    const employee = await kv.get(`time_employee:${employeeId}`);
    if (!employee) {
      return c.json({ success: false, error: "Employee not found" }, 404);
    }
    
    // Check if already clocked in
    const activeEntry = await closeIfAbandoned(employeeId, await kv.get(`time_entry_active:${employeeId}`));
    if (activeEntry) {
      return c.json({ 
        success: false, 
        error: "Employee is already clocked in",
        activeEntry 
      }, 400);
    }
    
    const now = new Date();
    const entryId = `ENTRY-${employeeId}-${now.getTime()}`;
    
    // Create time entry
    const timeEntry = {
      id: entryId,
      employeeId,
      employeeName: employee.name,
      punchIn: now.toISOString(),
      punchOut: null,
      breakMinutes: 0,
      totalHours: 0,
      location: {
        punchInLocation: location || { lat: 0, lng: 0, address: 'Unknown' }
      },
      projectId: projectId || employee.assignedProject,
      notes: notes || '',
      status: 'active',
      approved: false,
      createdAt: now.toISOString()
    };
    
    // Store active entry
    await kv.set(`time_entry_active:${employeeId}`, timeEntry);
    
    // Update employee status
    employee.status = 'clocked-in';
    employee.lastPunch = now.toISOString();
    employee.currentShiftStart = now.toISOString();
    employee.location = location;
    employee.updatedAt = now.toISOString();
    
    await kv.set(`time_employee:${employeeId}`, employee);
    
    console.log(`✅ ${employee.name} punched in at ${location?.address || 'unknown location'}`);
    
    return c.json({
      success: true,
      timeEntry,
      employee
    });
  } catch (error) {
    console.error("Error punching in:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Punch Out
timeTrackingRouter.post("/punch-out", async (c) => {
  try {
    const body = await c.req.json();
    const { employeeId, location, notes } = body;
    const denial = requireEmployeeAccess(c, employeeId);
    if (denial) return denial;
    
    if (!employeeId) {
      return c.json({ success: false, error: "Employee ID is required" }, 400);
    }
    
    // Get employee
    const employee = await kv.get(`time_employee:${employeeId}`);
    if (!employee) {
      return c.json({ success: false, error: "Employee not found" }, 404);
    }
    
    // Get active entry
    const activeEntry = await closeIfAbandoned(employeeId, await kv.get(`time_entry_active:${employeeId}`));
    if (!activeEntry) {
      return c.json({ 
        success: false, 
        error: "No active time entry found. Employee is not clocked in." 
      }, 400);
    }
    
    const now = new Date();
    const punchInTime = new Date(activeEntry.punchIn);
    const hoursWorked = (now.getTime() - punchInTime.getTime()) / (1000 * 60 * 60);
    const totalHours = Math.round((hoursWorked - activeEntry.breakMinutes / 60) * 100) / 100;
    
    // Complete time entry
    const completedEntry = {
      ...activeEntry,
      punchOut: now.toISOString(),
      totalHours,
      location: {
        ...activeEntry.location,
        punchOutLocation: location || { lat: 0, lng: 0, address: 'Unknown' }
      },
      notes: notes || activeEntry.notes,
      // Seed the whole shift onto whatever job the entry was punched in against.
      // The ordinary single-job day therefore reconciles with no extra work from
      // anyone, and splitting is only for days that were actually split.
      allocations: activeEntry.projectId
        ? [{
            workOrderId: String(activeEntry.projectId),
            workOrderTitle: String(activeEntry.projectTitle || ''),
            hours: totalHours,
            note: '',
          }]
        : [],
      status: 'completed',
      completedAt: now.toISOString()
    };
    
    // Store in history
    const dateKey = now.toISOString().split('T')[0]; // YYYY-MM-DD
    await kv.set(
      `time_entry_history:${employeeId}:${dateKey}:${activeEntry.id}`, 
      completedEntry
    );
    
    // Remove active entry
    await kv.del(`time_entry_active:${employeeId}`);
    
    // Update employee status and hours
    employee.status = 'clocked-out';
    employee.lastPunch = now.toISOString();
    employee.currentShiftStart = null;
    employee.hoursToday = (employee.hoursToday || 0) + totalHours;
    employee.hoursWeek = (employee.hoursWeek || 0) + totalHours;
    employee.location = location;
    employee.updatedAt = now.toISOString();
    
    await kv.set(`time_employee:${employeeId}`, employee);
    
    console.log(`✅ ${employee.name} punched out. Worked ${totalHours} hours`);
    
    return c.json({
      success: true,
      timeEntry: completedEntry,
      employee,
      hoursWorked: totalHours
    });
  } catch (error) {
    console.error("Error punching out:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Start/End Break
timeTrackingRouter.post("/break", async (c) => {
  try {
    const body = await c.req.json();
    const { employeeId, action } = body; // action: 'start' | 'end'
    const denial = requireEmployeeAccess(c, employeeId);
    if (denial) return denial;
    
    if (!employeeId || !action) {
      return c.json({ 
        success: false, 
        error: "Employee ID and action (start/end) are required" 
      }, 400);
    }
    
    // Get employee
    const employee = await kv.get(`time_employee:${employeeId}`);
    if (!employee) {
      return c.json({ success: false, error: "Employee not found" }, 404);
    }
    
    const now = new Date();
    
    if (action === 'start') {
      // Start break
      employee.status = 'on-break';
      employee.breakStart = now.toISOString();
      employee.lastPunch = now.toISOString();
      employee.updatedAt = now.toISOString();
      
      await kv.set(`time_employee:${employeeId}`, employee);
      
      console.log(`☕ ${employee.name} started break`);
      
      return c.json({
        success: true,
        message: "Break started",
        employee
      });
    } else if (action === 'end') {
      // End break
      if (!employee.breakStart) {
        return c.json({ success: false, error: "No active break found" }, 400);
      }
      
      const breakStart = new Date(employee.breakStart);
      const breakDuration = (now.getTime() - breakStart.getTime()) / (1000 * 60); // minutes
      
      // Update active time entry with break minutes
      const activeEntry = await closeIfAbandoned(employeeId, await kv.get(`time_entry_active:${employeeId}`));
      if (activeEntry) {
        activeEntry.breakMinutes = (activeEntry.breakMinutes || 0) + breakDuration;
        await kv.set(`time_entry_active:${employeeId}`, activeEntry);
      }
      
      employee.status = 'clocked-in';
      employee.breakStart = null;
      employee.lastPunch = now.toISOString();
      employee.updatedAt = now.toISOString();
      
      await kv.set(`time_employee:${employeeId}`, employee);
      
      console.log(`✅ ${employee.name} ended break (${Math.round(breakDuration)} minutes)`);
      
      return c.json({
        success: true,
        message: "Break ended",
        employee,
        breakDuration: Math.round(breakDuration)
      });
    } else {
      return c.json({ success: false, error: "Invalid action. Use 'start' or 'end'" }, 400);
    }
  } catch (error) {
    console.error("Error managing break:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get time entries for date range
timeTrackingRouter.get("/entries", async (c) => {
  try {
    let employeeId = c.req.query("employeeId");
    if (!c.get("admin")) employeeId = String(c.get("actor")?.id || "");
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");
    
    let entries: any[] = [];
    
    if (employeeId) {
      // Get entries for specific employee
      entries = await kv.getByPrefix(`time_entry_history:${employeeId}:`);
    } else {
      // Get all entries
      entries = await kv.getByPrefix("time_entry_history:");
    }
    
    // Filter by date range if provided
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate).getTime() : 0;
      const end = endDate ? new Date(endDate).getTime() : Date.now();
      
      entries = entries.filter((entry: any) => {
        const entryTime = new Date(entry.punchIn).getTime();
        return entryTime >= start && entryTime <= end;
      });
    }
    
    // Sort by date descending
    entries.sort((a: any, b: any) => 
      new Date(b.punchIn).getTime() - new Date(a.punchIn).getTime()
    );
    
    return c.json({
      success: true,
      entries,
      count: entries.length
    });
  } catch (error) {
    console.error("Error fetching time entries:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Approve time entry (for payroll)
/**
 * Rewrite how one shift's hours are split across work orders.
 *
 * THE INVARIANT, which is the entire point of this endpoint:
 *
 *   sum(allocations.hours) === entry.totalHours
 *
 * An allocation set that does not add up to the clocked total is a billing
 * record that disagrees with the timesheet it came from — the customer is
 * invoiced for hours nobody worked, or the employee's day is partly unbilled.
 * So it is enforced here, on the server, and not merely in the form. The form is
 * not the part that has to be trusted.
 *
 * Two further rules:
 *   • only work orders assigned to this employee may be billed to, because time
 *     landing on a job they were never on is a wrong invoice, not a typo;
 *   • an approved entry is frozen — once payroll has taken it, it stops moving.
 */
timeTrackingRouter.patch("/entries/:id/allocations", async (c) => {
  try {
    const entryId = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));

    const allEntries = ((await kv.getByPrefix("time_entry_history:")) as any[]) || [];
    const entry = allEntries.find((e: any) => e?.id === entryId);
    if (!entry) return c.json({ success: false, error: "Time entry not found" }, 404);

    const denial = requireEmployeeAccess(c, entry.employeeId);
    if (denial) return denial;

    if (entry.approved && !c.get("admin")) {
      return c.json({ success: false, error: "This entry has been approved for payroll and can no longer be changed." }, 409);
    }
    if (entry.status !== "completed") {
      return c.json({ success: false, error: "Punch out before splitting the shift — the total is not final until then." }, 400);
    }

    const incoming = Array.isArray(body.allocations) ? body.allocations : [];
    if (incoming.length > 40) {
      return c.json({ success: false, error: "That is more splits than a single shift can sensibly carry." }, 400);
    }

    const employee = await kv.get(`time_employee:${entry.employeeId}`);
    const requests = await allWorkRequests();
    const permitted = new Map<string, any>();
    for (const r of requests) {
      if (c.get("admin") || assignedToEmployee(r, employee, c.get("actor"))) permitted.set(String(r.id), r);
    }

    const cleaned: any[] = [];
    for (const a of incoming) {
      const workOrderId = String(a?.workOrderId || "").trim();
      const hours = Number(a?.hours);
      if (!workOrderId) return c.json({ success: false, error: "Every line needs a work order." }, 400);
      if (!Number.isFinite(hours) || hours <= 0) {
        return c.json({ success: false, error: `"${workOrderId}" has no usable number of hours.` }, 400);
      }
      const wo = permitted.get(workOrderId);
      if (!wo) {
        return c.json({ success: false, error: `Work order ${workOrderId} is not assigned to you, so time cannot be billed to it.` }, 403);
      }
      cleaned.push({
        workOrderId,
        workOrderTitle: workRequestTitle(wo),
        hours: Math.round(hours * 100) / 100,
        note: String(a?.note || "").slice(0, 300),
      });
    }

    // One work order twice in the same shift is almost certainly a mistake, and
    // silently merging it would hide it.
    const ids = cleaned.map((a) => a.workOrderId);
    if (new Set(ids).size !== ids.length) {
      return c.json({ success: false, error: "The same work order appears more than once — combine those lines." }, 400);
    }

    const allocated = Math.round(cleaned.reduce((sum, a) => sum + a.hours, 0) * 100) / 100;
    const total = Math.round(Number(entry.totalHours || 0) * 100) / 100;
    const drift = Math.round((allocated - total) * 100) / 100;

    // A partial split saves. Somebody halfway through assigning a day's hours
    // should not be refused and lose the rows they have already filled in — the
    // reconciliation is checked when the timesheet is SENT TO PAYROLL, which is
    // the gate that actually matters. See /entries/:id/submit below.
    //
    // Over-allocation is still refused here, because billing more hours than
    // were worked is never a work-in-progress state; it is simply wrong, and it
    // is cheaper to say so while the person is still looking at the form.
    if (drift > 0.01) {
      return c.json({
        success: false,
        error: `Allocated ${allocated}h but only ${total}h were worked — ${Math.abs(drift)}h too many.`,
        totalHours: total, allocatedHours: allocated, unallocatedHours: Math.round((total - allocated) * 100) / 100,
      }, 400);
    }

    // One hundredth of an hour — 36 seconds — of slack, because 8.5 hours across
    // three jobs is 2.8333 each and no set of hundredths adds back exactly. The
    // slack is for the person typing, not for the record: a near-miss is
    // absorbed below so a *complete* split stores an exact total.
    const nearlyBalanced = Math.abs(drift) <= 0.01;

    // Absorb any sub-tolerance rounding onto the largest line, so what gets
    // stored reconciles to the penny rather than merely to within 36 seconds.
    // The largest line is chosen because a hundredth of an hour is proportionally
    // least visible there.
    // Only a split that is meant to be complete gets its rounding absorbed.
    // Nudging a deliberately partial split would silently invent hours the
    // person had not assigned yet.
    if (nearlyBalanced && drift !== 0 && cleaned.length) {
      let biggest = 0;
      for (let i = 1; i < cleaned.length; i++) if (cleaned[i].hours > cleaned[biggest].hours) biggest = i;
      cleaned[biggest].hours = Math.round((cleaned[biggest].hours - drift) * 100) / 100;
    }
    const finalAllocated = Math.round(cleaned.reduce((sum, a) => sum + a.hours, 0) * 100) / 100;
    const remaining = Math.round((total - finalAllocated) * 100) / 100;

    const now = new Date().toISOString();
    // Changing the split withdraws it from payroll. Otherwise payroll could be
    // holding a submission for approval while the hours behind it move.
    const updated = {
      ...entry,
      allocations: cleaned,
      allocationsUpdatedAt: now,
      ...(entry.submittedToPayroll ? { submittedToPayroll: false, payrollStatus: "withdrawn", withdrawnAt: now } : {}),
    };
    const dateKey = new Date(entry.punchIn).toISOString().split("T")[0];
    await kv.set(`time_entry_history:${entry.employeeId}:${dateKey}:${entry.id}`, updated);

    return c.json({
      success: true,
      entry: updated,
      totalHours: total,
      allocatedHours: finalAllocated,
      unallocatedHours: remaining,
      // What payroll will say if it is submitted as it stands.
      readyForPayroll: Math.abs(remaining) <= 0.01,
    });
  } catch (error) {
    console.error("Error updating allocations:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * Send a shift to payroll.
 *
 * This is where the reconciliation is enforced, and deliberately not earlier.
 * Punching is never restricted and a half-finished split saves freely — someone
 * assigning a day's hours across three jobs should be able to do it in three
 * sittings without being refused. What must not happen is an unbalanced
 * timesheet reaching payroll, because that is the moment the hours become an
 * invoice and a wage.
 */
timeTrackingRouter.post("/entries/:id/submit", async (c) => {
  try {
    const entryId = c.req.param("id");
    const allEntries = ((await kv.getByPrefix("time_entry_history:")) as any[]) || [];
    const entry = allEntries.find((e: any) => e?.id === entryId);
    if (!entry) return c.json({ success: false, error: "Time entry not found" }, 404);

    const denial = requireEmployeeAccess(c, entry.employeeId);
    if (denial) return denial;

    if (entry.status !== "completed") {
      return c.json({ success: false, error: "Punch out before sending this shift to payroll." }, 400);
    }
    if (entry.approved) {
      return c.json({ success: false, error: "Payroll has already approved this shift." }, 409);
    }
    // An auto-closed shift carries a placeholder finish time, not a measured
    // one. Paying it would pay a guess, so it is refused until somebody has
    // replaced the end time with what actually happened.
    if (blockedFromPayroll(entry)) {
      return c.json({ success: false, error: reviewReason(entry), needsReview: true }, 400);
    }

    const total = Math.round(Number(entry.totalHours || 0) * 100) / 100;
    const allocations = Array.isArray(entry.allocations) ? entry.allocations : [];
    const allocated = Math.round(allocations.reduce((s: number, a: any) => s + Number(a.hours || 0), 0) * 100) / 100;
    const remaining = Math.round((total - allocated) * 100) / 100;

    if (Math.abs(remaining) > 0.01) {
      return c.json({
        success: false,
        error: remaining > 0
          ? `${remaining}h of the ${total}h worked are not assigned to a work order yet.`
          : `${Math.abs(remaining)}h more than the ${total}h worked have been assigned.`,
        totalHours: total, allocatedHours: allocated, unallocatedHours: remaining,
      }, 400);
    }
    if (total > 0 && allocations.length === 0) {
      return c.json({ success: false, error: `None of the ${total}h worked are assigned to a work order yet.` }, 400);
    }

    const now = new Date().toISOString();
    const updated = { ...entry, submittedToPayroll: true, submittedAt: now, payrollStatus: "submitted" };
    const dateKey = new Date(entry.punchIn).toISOString().split("T")[0];
    await kv.set(`time_entry_history:${entry.employeeId}:${dateKey}:${entry.id}`, updated);

    return c.json({ success: true, entry: updated, totalHours: total, allocatedHours: allocated });
  } catch (error) {
    console.error("Error submitting entry to payroll:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

/**
 * Set the real finish time on a shift that was closed automatically.
 *
 * This is the only way out of `needsReview`, and it has to exist — without it
 * an auto-closed shift is unpayable forever, which would make the backstop a
 * worse outcome for the employee than the forgotten punch-out it was catching.
 *
 * Admin only. The person whose hours these are cannot be the one who decides
 * what they were, because the number decides their own pay and what a customer
 * is invoiced. They can say what happened; a supervisor records it.
 *
 * The corrected time is checked against the shift rather than accepted: it must
 * be after the punch-in and no more than the auto-close threshold after it. A
 * mistyped date would otherwise put a three-day shift on the payroll report,
 * which is the exact failure this whole mechanism exists to prevent.
 */
timeTrackingRouter.post("/entries/:id/finish-time", async (c) => {
  const denial = requireAdmin(c);
  if (denial) return denial;
  try {
    const entryId = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));
    const punchOut = String(body?.punchOut || "");

    const allEntries = ((await kv.getByPrefix("time_entry_history:")) as any[]) || [];
    const entry = allEntries.find((e: any) => e?.id === entryId);
    if (!entry) return c.json({ success: false, error: "Time entry not found" }, 404);
    if (entry.approved) {
      return c.json({ success: false, error: "Payroll has already approved this shift." }, 409);
    }

    const finish = Date.parse(punchOut);
    const start = Date.parse(entry.punchIn);
    if (!Number.isFinite(finish)) {
      return c.json({ success: false, error: "A finish time is required." }, 400);
    }
    if (!Number.isFinite(start)) {
      return c.json({ success: false, error: "This shift has no usable start time." }, 400);
    }
    if (finish <= start) {
      return c.json({ success: false, error: "The finish time has to be after the start of the shift." }, 400);
    }
    const hoursOnClock = (finish - start) / 3_600_000;
    if (hoursOnClock > AUTO_CLOSE_AFTER_HOURS) {
      return c.json({
        success: false,
        error: `That is ${Math.round(hoursOnClock)} hours on the clock. A single shift cannot run longer than `
          + `${AUTO_CLOSE_AFTER_HOURS} hours — check the date.`,
      }, 400);
    }

    const totalHours = Math.round(
      (hoursOnClock - Math.max(0, Number(entry.breakMinutes || 0)) / 60) * 100,
    ) / 100;
    if (totalHours <= 0) {
      return c.json({ success: false, error: "The break recorded is longer than the shift." }, 400);
    }

    const now = new Date().toISOString();
    const updated = {
      ...entry,
      punchOut: new Date(finish).toISOString(),
      totalHours,
      needsReview: false,
      reviewedAt: now,
      reviewedBy: String(c.get("actor")?.id || ""),
      // The allocation split was made against the placeholder hours, so it no
      // longer reconciles. Submit will refuse until it is redone against the
      // real number, which is the correct outcome — the split has to be
      // reconsidered, not rescaled by us on somebody's behalf.
      ...(entry.submittedToPayroll ? { submittedToPayroll: false, payrollStatus: "withdrawn", withdrawnAt: now } : {}),
    };
    const dateKey = new Date(entry.punchIn).toISOString().split("T")[0];
    await kv.set(`time_entry_history:${entry.employeeId}:${dateKey}:${entry.id}`, updated);

    const allocated = Math.round(
      (Array.isArray(updated.allocations) ? updated.allocations : [])
        .reduce((s: number, a: any) => s + Number(a.hours || 0), 0) * 100,
    ) / 100;

    return c.json({
      success: true,
      entry: updated,
      totalHours,
      allocatedHours: allocated,
      unallocatedHours: Math.round((totalHours - allocated) * 100) / 100,
    });
  } catch (error) {
    console.error("Error setting finish time:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

timeTrackingRouter.post("/entries/:id/approve", async (c) => {
  const denial = requireAdmin(c);
  if (denial) return denial;
  try {
    const entryId = c.req.param("id");
    
    // Find entry across all employee histories
    const allEntries = await kv.getByPrefix("time_entry_history:");
    const entry = allEntries.find((e: any) => e.id === entryId);
    
    if (!entry) {
      return c.json({ success: false, error: "Time entry not found" }, 404);
    }
    // The same refusal as submit, repeated here rather than assumed. Approval
    // is reachable directly from the payroll screen, so a flagged entry that
    // never went through submit could otherwise be approved straight past it.
    if (blockedFromPayroll(entry)) {
      return c.json({ success: false, error: reviewReason(entry), needsReview: true }, 400);
    }

    // Update entry approval status
    entry.approved = true;
    entry.approvedAt = new Date().toISOString();
    
    // Reconstruct the key
    const dateKey = new Date(entry.punchIn).toISOString().split('T')[0];
    const key = `time_entry_history:${entry.employeeId}:${dateKey}:${entry.id}`;
    
    await kv.set(key, entry);
    
    console.log(`✅ Time entry ${entryId} approved for payroll`);
    
    return c.json({
      success: true,
      entry
    });
  } catch (error) {
    console.error("Error approving time entry:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Get payroll report
timeTrackingRouter.get("/payroll-report", async (c) => {
  const denial = requireAdmin(c);
  if (denial) return denial;
  try {
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");
    
    if (!startDate || !endDate) {
      return c.json({ 
        success: false, 
        error: "Start date and end date are required" 
      }, 400);
    }
    
    // Get all entries in date range
    const allEntries = await kv.getByPrefix("time_entry_history:");
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    
    const entriesInRange = allEntries.filter((entry: any) => {
      const entryTime = new Date(entry.punchIn).getTime();
      return entryTime >= start && entryTime <= end;
    });
    
    // Get all employees
    const employees = await kv.getByPrefix("time_employee:");
    
    // Calculate payroll by employee
    const payrollByEmployee = employees.map((emp: any) => {
      const employeeEntries = entriesInRange.filter((e: any) =>
        e.employeeId === emp.id
      );

      // An auto-closed shift carries a placeholder finish time. Its hours are
      // held out of the totals rather than paid, and counted separately so the
      // shift is visibly waiting on somebody instead of quietly missing.
      const held = employeeEntries.filter((e: any) => blockedFromPayroll(e));
      const payable = employeeEntries.filter((e: any) => !blockedFromPayroll(e));

      const totalHours = payable.reduce((sum: number, e: any) =>
        sum + (e.totalHours || 0), 0
      );

      const grossPay = totalHours * (emp.payRate || 0);

      return {
        employeeId: emp.id,
        employeeName: emp.name,
        role: emp.role,
        department: emp.department,
        payRate: emp.payRate,
        totalHours: Math.round(totalHours * 100) / 100,
        grossPay: Math.round(grossPay * 100) / 100,
        entries: payable.length,
        approvedEntries: payable.filter((e: any) => e.approved).length,
        heldForReview: held.length,
        heldEntries: held.map((e: any) => ({ id: e.id, punchIn: e.punchIn, reason: reviewReason(e) })),
      };
    });
    
    // Calculate totals
    const totals = {
      totalHours: payrollByEmployee.reduce((sum, e) => sum + e.totalHours, 0),
      totalGrossPay: payrollByEmployee.reduce((sum, e) => sum + e.grossPay, 0),
      totalEmployees: payrollByEmployee.length,
      totalEntries: entriesInRange.length,
      // Named at the top of the report, so a run that is short by a day's
      // labour says why rather than just being short.
      heldForReview: payrollByEmployee.reduce((sum, e) => sum + e.heldForReview, 0),
    };
    
    return c.json({
      success: true,
      startDate,
      endDate,
      payrollByEmployee,
      totals
    });
  } catch (error) {
    console.error("Error generating payroll report:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Reset daily/weekly hours (run via cron)
timeTrackingRouter.post("/reset-hours", async (c) => {
  const denial = requireAdmin(c);
  if (denial) return denial;
  try {
    const resetType = c.req.query("type"); // 'daily' | 'weekly'
    
    const employees = await kv.getByPrefix("time_employee:");
    
    for (const employee of employees) {
      if (resetType === 'daily') {
        employee.hoursToday = 0;
      } else if (resetType === 'weekly') {
        employee.hoursWeek = 0;
      }
      employee.updatedAt = new Date().toISOString();
      
      await kv.set(`time_employee:${employee.id}`, employee);
    }
    
    console.log(`✅ Reset ${resetType} hours for ${employees.length} employees`);
    
    return c.json({
      success: true,
      message: `Reset ${resetType} hours for ${employees.length} employees`
    });
  } catch (error) {
    console.error("Error resetting hours:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Aggregate real logged hours per employee (by name) for the current week and
// pay period. Consumed by the HR hub so employee hours reflect actual timesheets
// instead of static seed values.
timeTrackingRouter.get("/hours-summary", async (c) => {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const periodAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    let entries = (await kv.getByPrefix("time_entry_history:")) || [];
    // A field employee only receives their own aggregate; HR/admin receives the full summary.
    if (!c.get("admin")) entries = entries.filter((entry: any) => String(entry?.employeeId || "") === String(c.get("actor")?.id || ""));
    // name -> { week, period }
    const byName: Record<string, { hoursThisWeek: number; hoursThisPeriod: number }> = {};

    for (const e of entries) {
      const name = String(e?.employeeName || "").trim();
      if (!name) continue;
      const when = new Date(e?.punchOut || e?.completedAt || e?.punchIn || e?.createdAt);
      if (isNaN(when.getTime())) continue;
      const hrs = Number(e?.totalHours) || 0;
      if (!byName[name]) byName[name] = { hoursThisWeek: 0, hoursThisPeriod: 0 };
      if (when >= periodAgo) byName[name].hoursThisPeriod += hrs;
      if (when >= weekAgo) byName[name].hoursThisWeek += hrs;
    }

    // Round to 2 decimals.
    for (const k of Object.keys(byName)) {
      byName[k].hoursThisWeek = Math.round(byName[k].hoursThisWeek * 100) / 100;
      byName[k].hoursThisPeriod = Math.round(byName[k].hoursThisPeriod * 100) / 100;
    }

    return c.json({ success: true, summary: byName });
  } catch (error) {
    console.error("Error building hours summary:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// ── Field tasks (the technician's daily schedule) ──────────────────────────────
// Genuinely persistent, KV-backed tasks keyed by employee. Replaces the static
// array that previously hardcoded the mobile app's "Today's Tasks".

// List tasks for an employee
timeTrackingRouter.get("/tasks/:employeeId", async (c) => {
  const employeeId = c.req.param("employeeId");
  const denial = requireEmployeeAccess(c, employeeId);
  if (denial) return denial;
  try {
    const tasks = (await kv.getByPrefix(`time_task:${employeeId}:`)) || [];
    tasks.sort((a: any, b: any) => new Date(a?.scheduledAt || 0).getTime() - new Date(b?.scheduledAt || 0).getTime());
    return c.json({ success: true, tasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Create a task for an employee
timeTrackingRouter.post("/tasks/:employeeId", async (c) => {
  const denial = requireAdmin(c);
  if (denial) return denial;
  try {
    const employeeId = c.req.param("employeeId");
    const body = await c.req.json();
    const { title, location, scheduledAt, status } = body;
    if (!title) {
      return c.json({ success: false, error: "Task title is required" }, 400);
    }
    const id = `TASK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const task = {
      id,
      employeeId,
      title,
      location: location || "",
      scheduledAt: scheduledAt || new Date().toISOString(),
      status: status || "pending",
      createdAt: new Date().toISOString(),
    };
    await kv.set(`time_task:${employeeId}:${id}`, task);
    return c.json({ success: true, task });
  } catch (error) {
    console.error("Error creating task:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Update a task's status
timeTrackingRouter.post("/tasks/:employeeId/:taskId/status", async (c) => {
  const employeeId = c.req.param("employeeId");
  const denial = requireEmployeeAccess(c, employeeId);
  if (denial) return denial;
  try {
    const taskId = c.req.param("taskId");
    const body = await c.req.json();
    const { status } = body;
    const key = `time_task:${employeeId}:${taskId}`;
    const task = await kv.get(key);
    if (!task) {
      return c.json({ success: false, error: "Task not found" }, 404);
    }
    task.status = status || task.status;
    task.updatedAt = new Date().toISOString();
    await kv.set(key, task);
    return c.json({ success: true, task });
  } catch (error) {
    console.error("Error updating task status:", error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

export default timeTrackingRouter;
