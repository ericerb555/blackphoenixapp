/**
 * Who can work what, and when.
 *
 * WHY THIS IS DETERMINISTIC AND NOT A MODEL CALL
 *
 * Whether Dave can take Tuesday is arithmetic: is he on approved leave, has he
 * called out, is he already booked, does the job fit his day, does he hold the
 * trade. A language model asked that question is right most of the time and
 * subtly wrong occasionally, and the failure is a crew sent to the wrong place
 * or a customer promised a slot nobody can work.
 *
 * So the feasible set is computed here, in a `.ts` the test runner can check by
 * hand, and the model is used for what it is actually better at — explaining a
 * proposal, ranking options that are equally valid, reading messy human input.
 * It is also the difference between free and a bill: scheduling runs constantly.
 *
 * THE RULE THAT MATTERS MOST
 *
 * UNKNOWN IS NOT UNAVAILABLE. A roster where nobody has working hours recorded
 * must not produce an empty schedule — that is the quiet zero this codebase
 * keeps being bitten by: no error, no empty state, just a day with nobody on it
 * and no explanation. Anything unstated falls back to a normal working day and
 * is reported as assumed rather than known.
 *
 * DATES ARE PLAIN STRINGS
 *
 * `YYYY-MM-DD`, compared as strings, never as Date objects. A `Date` carries a
 * timezone, and a crew scheduled at 23:00 UTC is on a different day from the
 * one the office typed. Nothing here converts between the two.
 */

export type UnavailabilityKind = 'time_off' | 'call_out';
export type UnavailabilityStatus = 'requested' | 'approved' | 'declined' | 'cancelled';

export interface Unavailability {
  id?: string;
  employeeId: string;
  /** Inclusive, `YYYY-MM-DD`. */
  from: string;
  /** Inclusive. Same as `from` for a single day. */
  to?: string;
  kind: UnavailabilityKind;
  status?: UnavailabilityStatus;
  reason?: string;
}

export interface WorkingHours {
  /** `HH:MM`, 24 hour. */
  start: string;
  end: string;
}

export interface Tech {
  id: string;
  name?: string;
  /** Trades this person holds. Empty or absent means unrecorded, NOT none. */
  trades?: string[];
  /** 0 = Sunday. Absent means the default working week. */
  workingDays?: number[];
  workingHours?: WorkingHours;
  /** Explicitly false takes somebody off the roster. */
  active?: boolean;
}

export interface Booking {
  id?: string;
  employeeId: string;
  /** `YYYY-MM-DD`. */
  date: string;
  hours?: number;
  status?: string;
}

/** Monday to Friday. Used when a tech has no working days recorded. */
export const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5];

/** A normal day, used when none is recorded. */
export const DEFAULT_WORKING_HOURS: WorkingHours = { start: '07:00', end: '16:00' };

/** Statuses that mean a booking is still holding somebody's time. */
const LIVE_BOOKING = new Set(['scheduled', 'confirmed', 'in_progress', 'in-progress', '']);

const minutes = (hhmm: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
};

const isDate = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

/**
 * The day of the week for a plain date string, without constructing a Date.
 *
 * Doing this by hand rather than with `new Date(iso).getDay()`, which parses a
 * bare `YYYY-MM-DD` as UTC midnight and then reports it in local time — so west
 * of Greenwich every date comes back as the day before. A scheduler that thinks
 * Monday is Sunday puts nobody on the roster.
 *
 * Sakamoto's method. 0 = Sunday.
 */
export function dayOfWeek(date: string): number | null {
  if (!isDate(date)) return null;
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7));
  const d = Number(date.slice(8, 10));
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const yy = m < 3 ? y - 1 : y;
  return (yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) + t[m - 1] + d) % 7;
}

/**
 * Does this record stop somebody working on this day?
 *
 * A CALL-OUT bites immediately — there is nobody to approve it and waiting for
 * one would mean scheduling a person who has already said they are not coming.
 *
 * TIME OFF bites only once APPROVED. A pending request must not quietly remove
 * somebody from the schedule, or a request nobody has looked at becomes a day
 * with no cover that nobody decided on.
 */
export function blocksDay(record: Unavailability, date: string): boolean {
  if (!record || !isDate(date)) return false;
  const status = String(record.status || '').toLowerCase();
  if (status === 'declined' || status === 'cancelled') return false;
  if (record.kind === 'time_off' && status !== 'approved') return false;

  const from = isDate(record.from) ? record.from : null;
  if (!from) return false;
  const to = isDate(record.to || '') ? (record.to as string) : from;
  // String comparison is safe and correct for YYYY-MM-DD, and carries no timezone.
  return date >= from && date <= to;
}

export interface Availability {
  available: boolean;
  /** Hours this person could still take on this day. */
  hoursFree: number;
  /** Said plainly, for the assistant to repeat and for a human to check. */
  reason: string;
  /** True where a working pattern was assumed rather than recorded. */
  assumedPattern: boolean;
}

/**
 * Is this tech available on this day, and for how long?
 *
 * Returns hours rather than a yes/no alone, because "available" is not binary
 * for somebody who already has four hours booked on an eight hour day.
 */
export function availabilityOn(
  tech: Tech,
  date: string,
  unavailability: Unavailability[] = [],
  bookings: Booking[] = [],
): Availability {
  const none = (reason: string): Availability =>
    ({ available: false, hoursFree: 0, reason, assumedPattern: false });

  if (!tech?.id) return none('no employee');
  if (!isDate(date)) return none('not a date');
  if (tech.active === false) return none('not on the roster');

  const blocking = unavailability.find(
    (u) => String(u?.employeeId) === String(tech.id) && blocksDay(u, date),
  );
  if (blocking) {
    return none(blocking.kind === 'call_out' ? 'called out' : 'on approved time off');
  }

  /**
   * An unrecorded working pattern is a normal week, not a blank one.
   *
   * The alternative — treating unknown as unavailable — empties the schedule
   * for any roster that has not been filled in, silently and with no error.
   * `assumedPattern` travels with the answer so a caller can say "assuming a
   * standard week" rather than stating it as fact.
   */
  const daysRecorded = Array.isArray(tech.workingDays) && tech.workingDays.length > 0;
  const days = daysRecorded ? tech.workingDays! : DEFAULT_WORKING_DAYS;
  const dow = dayOfWeek(date);
  if (dow === null) return none('not a date');
  if (!days.includes(dow)) return none('not a working day for them');

  const startRecorded = minutes(tech.workingHours?.start || '');
  const endRecorded = minutes(tech.workingHours?.end || '');
  const hoursRecorded = startRecorded !== null && endRecorded !== null && endRecorded > startRecorded;
  const start = hoursRecorded ? startRecorded! : minutes(DEFAULT_WORKING_HOURS.start)!;
  const end = hoursRecorded ? endRecorded! : minutes(DEFAULT_WORKING_HOURS.end)!;
  const dayHours = (end - start) / 60;

  const booked = bookings
    .filter((b) => String(b?.employeeId) === String(tech.id)
      && b?.date === date
      && LIVE_BOOKING.has(String(b?.status || '').toLowerCase()))
    .reduce((sum, b) => sum + (Number(b.hours) > 0 ? Number(b.hours) : 0), 0);

  const hoursFree = Math.max(0, dayHours - booked);
  const assumedPattern = !daysRecorded || !hoursRecorded;

  if (hoursFree <= 0) {
    return { available: false, hoursFree: 0, reason: 'fully booked that day', assumedPattern };
  }
  return {
    available: true,
    hoursFree: Math.round(hoursFree * 100) / 100,
    reason: assumedPattern ? 'free (assuming a standard week)' : 'free',
    assumedPattern,
  };
}

export interface Job {
  /** What the work needs. Absent means anybody may take it. */
  trade?: string;
  /** How long it takes. From measured hours where the loop has learned them. */
  hours?: number;
  /**
   * A technician the customer asked for by name, or one a quote was written
   * around. Eric: "there is no standard but if a customer request or quotes out
   * a particular tech then we add it."
   *
   * This is a PROMISE, not a preference. When it is set, nobody else is a
   * candidate — not the next best person, not somebody equally qualified who
   * happens to be free. If they cannot do it, the answer is to say so, because
   * quietly sending a stranger is breaking a promise without telling anybody
   * and the customer discovers it when the van arrives.
   */
  requestedTechId?: string;
}

/**
 * Was a particular technician promised for this job?
 *
 * Its own function because two places have to agree about it: the scheduler,
 * which must not offer anybody else, and the call-out handler, which must not
 * reassign it automatically.
 */
export function hasRequestedTech(job: Job | null | undefined): boolean {
  return Boolean(String(job?.requestedTechId || '').trim());
}

export interface Candidate {
  tech: Tech;
  hoursFree: number;
  /** True when the job names a trade and this person's trades are unrecorded. */
  unverifiedTrade: boolean;
  assumedPattern: boolean;
  reason: string;
}

/**
 * Does this person hold the trade a job needs?
 *
 * Three states, not two, and the third is the interesting one:
 *
 *   the job names no trade        anybody may take it
 *   their trades are recorded     they must include it
 *   their trades are UNRECORDED   eligible, but flagged
 *
 * Excluding the unrecorded would empty the schedule for a roster nobody has
 * filled in — the same quiet zero as unknown working hours. Including them
 * silently would send an unqualified person to a job. So they are offered and
 * marked, for the caller to rank last and the assistant to say out loud.
 */
function tradeMatch(tech: Tech, job: Job): { eligible: boolean; unverified: boolean } {
  const needed = String(job?.trade || '').trim().toLowerCase();
  if (!needed) return { eligible: true, unverified: false };
  const held = (tech.trades || []).map((t) => String(t || '').trim().toLowerCase()).filter(Boolean);
  if (held.length === 0) return { eligible: true, unverified: true };
  return { eligible: held.includes(needed), unverified: false };
}

/**
 * Everyone who could take this job on this day, best first.
 *
 * Ordered so the caller can apply Eric's rule — commit automatically when there
 * is exactly ONE sensible answer, ask when there is a choice. "Sensible" means
 * a verified trade and a recorded pattern; a candidate carrying either flag is
 * a choice somebody should look at, not an answer.
 */
export function candidatesFor(
  techs: Tech[],
  date: string,
  job: Job,
  unavailability: Unavailability[] = [],
  bookings: Booking[] = [],
): Candidate[] {
  const needed = Number(job?.hours) > 0 ? Number(job.hours) : 0;
  const out: Candidate[] = [];

  /**
   * A promised technician narrows the field to one person, or to nobody.
   *
   * Deliberately BEFORE the trade check: if the customer asked for Dave, Dave
   * is the answer whether or not our records say he holds the trade. Our
   * paperwork is not a reason to send somebody the customer did not ask for.
   */
  const promised = String(job?.requestedTechId || '').trim();
  const pool = promised
    ? (techs || []).filter((t) => String(t?.id) === promised)
    : (techs || []);

  for (const tech of pool) {
    if (!tech?.id) continue;
    const { eligible, unverified } = promised
      ? { eligible: true, unverified: false }
      : tradeMatch(tech, job);
    if (!eligible) continue;

    const avail = availabilityOn(tech, date, unavailability, bookings);
    if (!avail.available) continue;
    // A job with no known duration is not rejected for not fitting — an unknown
    // length is a gap in what we measured, not a reason to leave the day empty.
    if (needed > 0 && avail.hoursFree < needed) continue;

    out.push({
      tech,
      hoursFree: avail.hoursFree,
      unverifiedTrade: unverified,
      assumedPattern: avail.assumedPattern,
      reason: avail.reason,
    });
  }

  return out.sort((a, b) => {
    // Certain before assumed, then the fullest day that still fits — keeping
    // whole days free for the jobs that need them.
    const aSure = (a.unverifiedTrade ? 1 : 0) + (a.assumedPattern ? 1 : 0);
    const bSure = (b.unverifiedTrade ? 1 : 0) + (b.assumedPattern ? 1 : 0);
    if (aSure !== bSure) return aSure - bSure;
    return a.hoursFree - b.hoursFree;
  });
}

/**
 * May this be booked without asking anybody?
 *
 * Eric's rule: auto for the simple, ask for the hard — where "hard" means a
 * CHOICE was involved, not that the code felt uncertain. So exactly one
 * candidate, holding a verified trade, on a recorded pattern.
 *
 * A single candidate carrying an assumption is still a choice: somebody should
 * see that the schedule is resting on a guess before a customer is promised.
 */
export function mayAutoAssign(candidates: Candidate[]): boolean {
  if (candidates.length !== 1) return false;
  const only = candidates[0];
  return !only.unverifiedTrade && !only.assumedPattern;
}

/**
 * May this job be moved to somebody else without asking?
 *
 * Eric asked for automatic reassignment when a technician calls out, because
 * the morning of a call-out is when an assistant earns its place. This is the
 * one exception: a job where a particular technician was PROMISED.
 *
 * Reassigning that automatically substitutes a stranger at the precise moment
 * nobody is watching. It has to reach a human who can ring the customer and
 * offer them the choice — a later date with the person they asked for, or
 * somebody else today.
 *
 * So "auto-reassign where possible" means where nobody was promised.
 */
export function mayAutoReassign(job: Job | null | undefined, candidates: Candidate[]): boolean {
  if (hasRequestedTech(job)) return false;
  return mayAutoAssign(candidates);
}
