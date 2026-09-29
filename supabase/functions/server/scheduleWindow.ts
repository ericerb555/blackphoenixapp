/**
 * Turning what a customer said into days we can actually search.
 *
 * THE PROBLEM THIS SOLVES
 *
 * A work request carries a HORIZON, not a date: "ASAP", "within 1 month",
 * "within 6 months", "flexible". Eric: *"they can request but we plan."* So the
 * customer's answer is an input to planning, and planning needs a span of days
 * to look at.
 *
 * "Within six months" is the one most easily got wrong. It does not mean the
 * six-month mark — that is the LATEST acceptable date, not the target. A
 * scheduler that aims at the far end of every horizon fills next May and leaves
 * next week empty. So a window has both ends: where to start looking, and when
 * it stops being acceptable.
 *
 * WHAT AN UNSTATED HORIZON MEANS
 *
 * Neither "today" nor "never". Most of the real work requests carry no timeline
 * at all, and treating that as urgent would put unquoted work at the front of
 * the queue, while treating it as indefinite would bury it. It falls to the
 * ordinary window and is reported as assumed — the same rule as an unrecorded
 * working pattern, for the same reason.
 */

export type Horizon =
  | 'asap' | '1_month' | '3_months' | '6_months' | '1_year' | 'flexible' | '';

export interface ScheduleWindow {
  /** First day worth looking at, `YYYY-MM-DD`. */
  earliest: string;
  /** Last day that still honours what the customer asked for. */
  latest: string;
  /** Higher is more urgent. Used to order jobs competing for the same day. */
  urgency: number;
  /** True when no horizon was stated and the ordinary window was assumed. */
  assumed: boolean;
  /** Said plainly, for the proposal to repeat. */
  label: string;
}

/** Days each horizon allows, measured from the day planning happens. */
const SPAN_DAYS: Record<string, number> = {
  asap: 7,
  '1_month': 30,
  '3_months': 90,
  '6_months': 180,
  '1_year': 365,
  flexible: 180,
};

/**
 * How hard this one is pushing, 0–100.
 *
 * ASAP is not merely "sooner" — it is the one that should displace others when
 * a day is contested. Flexible sits BELOW an unstated horizon on purpose: a
 * customer who chose "flexible" said so, while one who chose nothing did not
 * say anything, and the second should not be pushed behind the first.
 */
const URGENCY: Record<string, number> = {
  asap: 100,
  '1_month': 70,
  '3_months': 45,
  '6_months': 25,
  '1_year': 10,
  flexible: 5,
};

const LABEL: Record<string, string> = {
  asap: 'as soon as possible',
  '1_month': 'within a month',
  '3_months': 'within three months',
  '6_months': 'within six months',
  '1_year': 'within a year',
  flexible: 'whenever suits',
};

const isDate = (v: unknown): v is string =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/**
 * Add days to a plain date string without a timezone anywhere near it.
 *
 * Noon UTC on purpose: it is the furthest point from either midnight, so no
 * daylight-saving shift can move the result onto a different day.
 */
export function addDays(date: string, days: number): string {
  if (!isDate(date)) return date;
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Math.trunc(days));
  return d.toISOString().slice(0, 10);
}

export interface WindowInput {
  timeline?: string | null;
  /** A date the customer asked for. A REQUEST, never a booking. */
  requestedDate?: string | null;
  /** Nothing before this — "I am away until the 10th". */
  earliestDate?: string | null;
  /** Nothing after this — "before the school term starts". */
  latestDate?: string | null;
}

/**
 * The span of days to search for one job.
 *
 * A customer's requested date narrows the window around itself rather than
 * replacing it. It is a request: if the day turns out to be impossible the job
 * is still schedulable, and a window collapsed to a single day would report it
 * as unschedulable instead — which would be the software refusing work because
 * somebody expressed a preference.
 */
export function scheduleWindow(input: WindowInput, today: string): ScheduleWindow {
  const from = isDate(today) ? today : new Date().toISOString().slice(0, 10);
  const horizon = String(input?.timeline || '').toLowerCase().trim();
  const known = Object.prototype.hasOwnProperty.call(SPAN_DAYS, horizon);

  let earliest = from;
  let latest = addDays(from, known ? SPAN_DAYS[horizon] : SPAN_DAYS['3_months']);
  let urgency = known ? URGENCY[horizon] : 30;
  const assumed = !known;
  let label = known ? LABEL[horizon] : 'no timeline given';

  // Hard bounds the customer gave. These do constrain, because "I am away
  // until the 10th" is a fact about the world rather than a preference.
  if (isDate(input?.earliestDate) && input!.earliestDate! > earliest) {
    earliest = input!.earliestDate!;
    if (latest < earliest) latest = earliest;
  }
  if (isDate(input?.latestDate) && input!.latestDate! < latest) {
    latest = input!.latestDate!;
    if (latest < earliest) latest = earliest;
  }

  /**
   * A requested day pulls the window tight around itself — a fortnight either
   * side — without cutting it to that one day. Close enough to aim at what
   * they asked for, wide enough that missing it is a conversation rather than
   * a refusal.
   */
  if (isDate(input?.requestedDate)) {
    const wanted = input!.requestedDate!;
    const near = addDays(wanted, -14);
    const far = addDays(wanted, 14);
    if (near > earliest) earliest = near;
    if (far < latest) latest = far;
    if (latest < earliest) latest = earliest;
    urgency = Math.max(urgency, 60);
    label = `asked for ${wanted}`;
  }

  return { earliest, latest, urgency, assumed, label };
}

/** Every day in the window, so the planner can walk them. */
export function daysIn(window: ScheduleWindow, cap = 120): string[] {
  const out: string[] = [];
  let cursor = window.earliest;
  while (cursor <= window.latest && out.length < cap) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return out;
}

/**
 * Which job should be offered a contested day first.
 *
 * Urgency, then the tighter window — somebody with three weeks left has fewer
 * chances than somebody with six months, whatever either of them stated.
 */
export function moreUrgent(a: ScheduleWindow, b: ScheduleWindow): number {
  if (a.urgency !== b.urgency) return b.urgency - a.urgency;
  return a.latest.localeCompare(b.latest);
}
