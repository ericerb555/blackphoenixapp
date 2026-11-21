/**
 * What a PATCH to an appointment is allowed to change, decided in one place
 * that can actually be run.
 *
 * WHY THIS IS NOT INLINE IN THE ROUTE
 *
 * The route it came out of lives in `index.tsx`, which is a Deno module
 * holding the whole server; the test suite is node, so a route body there can
 * only be asserted against its own source text. That is how the first version
 * of these tests worked, and source assertions catch a deleted guard but
 * cannot catch a guard that is present and wrong — which is the failure mode
 * that matters here:
 *
 *   - `employeeId: null` must UNASSIGN, so presence has to be told apart from
 *     truthiness. A `if (body.employeeId)` reads fine and silently makes
 *     unassigning impossible.
 *   - a status-only PATCH must keep working untouched, because every caller
 *     written before 2026-11-21 sends one.
 *   - an id that is not on the roster must be refused. Storing it would roster
 *     nobody while the screen reads as assigned, which is the bug this whole
 *     change exists to remove, wearing a server round-trip.
 *
 * Those are three behaviours, so they are a function with tests rather than a
 * shape to grep for. The roster lookup is injected for the same reason.
 */

/** Looks an employee up by id. Returns null when they are not on the roster. */
export type EmployeeLookup = (id: string) => Promise<{ name?: unknown; email?: unknown } | null>;

export type PatchDecision =
  | { ok: false; status: 400 | 404; error: string }
  /** Fields to merge onto the stored appointment. Never includes `updated_at`. */
  | { ok: true; changes: Record<string, unknown> };

const STATUSES = ['scheduled', 'confirmed', 'completed', 'cancelled'] as const;

export async function decideAppointmentPatch(
  body: unknown,
  actorEmail: string,
  lookupEmployee: EmployeeLookup,
): Promise<PatchDecision> {
  const input = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const actor = String(actorEmail || '').trim().toLowerCase();

  const wantsStatus = input.status !== undefined && input.status !== null && String(input.status).trim() !== '';
  /*
   * Presence, not truthiness. `employeeId: null` is "take them off this job"
   * and has to be distinguishable from a body that does not mention the crew
   * at all.
   */
  const wantsCrew = Object.prototype.hasOwnProperty.call(input, 'employeeId');

  if (!wantsStatus && !wantsCrew) {
    return { ok: false, status: 400, error: 'Send a status, an employeeId, or both.' };
  }

  const changes: Record<string, unknown> = {};

  if (wantsStatus) {
    const status = String(input.status).trim().toLowerCase();
    if (!(STATUSES as readonly string[]).includes(status)) {
      return { ok: false, status: 400, error: 'A valid appointment status is required.' };
    }
    changes.status = status;
    changes.status_updated_by = actor;
  }

  if (wantsCrew) {
    const id = input.employeeId === null ? '' : String(input.employeeId).trim();
    if (!id) {
      changes.employeeId = null;
      changes.employeeName = null;
    } else {
      const employee = await lookupEmployee(id);
      if (!employee) {
        return { ok: false, status: 404, error: 'That employee is not on the roster.' };
      }
      changes.employeeId = id;
      // The name is stored alongside the id so a schedule read does not need
      // the roster to say who is on a job — and so a deleted employee leaves a
      // name behind rather than an orphan id.
      changes.employeeName = String(employee.name || employee.email || '').trim() || null;
    }
    // Who put them on it. The status half already recorded its own actor; a
    // crew change that recorded nothing would leave "who rostered Dave" with
    // no answer.
    changes.crew_updated_by = actor;
  }

  return { ok: true, changes };
}
