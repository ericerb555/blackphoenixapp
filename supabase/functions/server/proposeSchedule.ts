/**
 * Turning work requests into proposed days.
 *
 * This is the join Eric asked about: a work request carries a horizon and
 * whatever the customer asked for, `scheduleWindow` turns that into days to
 * search, `availability` says who could work each one, and this walks the two
 * together until it finds a day that works.
 *
 * "THEY CAN REQUEST BUT WE PLAN"
 *
 * Nothing here books anything. Every result is a PROPOSAL — a day, a person,
 * and the reason — for somebody to confirm. That is why the output carries its
 * reasoning rather than just an answer: a proposal nobody can check is an
 * instruction, and the person confirming it is the one who will ring the
 * customer.
 *
 * WHY THE FIRST WORKABLE DAY RATHER THAN THE BEST ONE
 *
 * Because "best" needs a measure nobody has agreed, and the honest default for
 * a contractor is sooner. A job placed early can still be moved; a job placed
 * late has already used up the room it might have needed. The customer's own
 * preferred day is respected by the WINDOW being centred on it, so aiming
 * early inside that window aims at them.
 */
import {
  type Tech, type Unavailability, type Booking,
  candidatesFor, mayAutoAssign, hasRequestedTech,
} from './availability.ts';
import {
  type ScheduleWindow, scheduleWindow, daysIn, moreUrgent,
} from './scheduleWindow.ts';

export interface WorkRequestLike {
  id: string;
  title?: string;
  /** What the work needs. Absent means anybody may take it. */
  trade?: string;
  /** How long it takes, from measured hours where the loop has learned them. */
  hours?: number;
  timeline?: string;
  preferredDate?: string;
  earliestDate?: string;
  latestDate?: string;
  avoidDays?: number[];
  /** A technician the customer asked for. A promise — never substituted. */
  requestedTechId?: string;
  status?: string;
}

export interface ProposalOption {
  techId: string;
  techName?: string;
  hoursFree: number;
  caveat?: string;
}

export interface Proposal {
  jobId: string;
  title?: string;
  /** The day proposed, or null when the window ran out. */
  date: string | null;
  techId?: string;
  techName?: string;
  hours: number;
  /**
   * `auto`   — booked without asking: one sensible answer, nobody promised.
   * `choice` — a person decides: several options, or a promise to honour.
   * `none`   — nobody can do it inside what the customer asked for.
   */
  outcome: 'auto' | 'choice' | 'none';
  /** Why, in words somebody can check before ringing a customer. */
  reason: string;
  /** The other people who could take that day. */
  alternatives: ProposalOption[];
  /** What the customer asked for, so the proposal can repeat it back. */
  asked: string;
  /** True where the plan rests on an assumed horizon or working pattern. */
  assumed: boolean;
}

function optionsFrom(candidates: ReturnType<typeof candidatesFor>): ProposalOption[] {
  return candidates.map((c) => ({
    techId: String(c.tech.id),
    techName: c.tech.name,
    hoursFree: c.hoursFree,
    caveat: c.unverifiedTrade
      ? 'trade not recorded for them'
      : c.assumedPattern ? 'working hours assumed' : undefined,
  }));
}

/**
 * Propose a day for each work request.
 *
 * Requests are taken most urgent first, and provisional bookings accumulate as
 * they are placed — so an urgent job gets the contested Tuesday and the
 * flexible one is offered the Wednesday, rather than both being told Tuesday
 * is free because neither was booked when the other was asked.
 */
export function proposeSchedule(
  requests: WorkRequestLike[],
  techs: Tech[],
  unavailability: Unavailability[] = [],
  bookings: Booking[] = [],
  today: string = new Date().toISOString().slice(0, 10),
): Proposal[] {
  const provisional: Booking[] = [...bookings];

  const withWindows = (requests || [])
    .filter((r) => r && r.id)
    .map((request) => ({
      request,
      window: scheduleWindow({
        timeline: request.timeline,
        requestedDate: request.preferredDate,
        earliestDate: request.earliestDate,
        latestDate: request.latestDate,
      }, today),
    }))
    .sort((a, b) => moreUrgent(a.window, b.window));

  const out: Proposal[] = [];

  for (const { request, window } of withWindows) {
    out.push(proposeOne(request, window, techs, unavailability, provisional));
  }

  return out;
}

function proposeOne(
  request: WorkRequestLike,
  window: ScheduleWindow,
  techs: Tech[],
  unavailability: Unavailability[],
  provisional: Booking[],
): Proposal {
  const hours = Number(request.hours) > 0 ? Number(request.hours) : 0;
  const job = {
    trade: request.trade,
    hours: request.hours,
    requestedTechId: request.requestedTechId,
  };

  const base: Omit<Proposal, 'date' | 'techId' | 'techName' | 'outcome' | 'reason' | 'alternatives'> = {
    jobId: request.id,
    title: request.title,
    hours,
    asked: window.label,
    assumed: window.assumed,
  };

  for (const day of daysIn(window, 120, request.avoidDays)) {
    const candidates = candidatesFor(techs, day, job, unavailability, provisional);
    if (candidates.length === 0) continue;

    const options = optionsFrom(candidates);

    /**
     * A promised technician is never booked automatically, even alone.
     *
     * The choice is not who does it — it is whether to commit a job the
     * customer has already been given a promise about. Somebody should see
     * that before it becomes a date they are told.
     */
    if (hasRequestedTech(job)) {
      return {
        ...base,
        date: day,
        techId: options[0].techId,
        techName: options[0].techName,
        outcome: 'choice',
        reason: `${options[0].techName || 'the technician they asked for'} is free on ${day} — confirm before booking`,
        alternatives: [],
        assumed: base.assumed || Boolean(options[0].caveat),
      };
    }

    if (mayAutoAssign(candidates)) {
      const only = options[0];
      provisional.push({ employeeId: only.techId, date: day, hours: hours || 1, status: 'scheduled' });
      return {
        ...base,
        date: day,
        techId: only.techId,
        techName: only.techName,
        outcome: 'auto',
        reason: `${only.techName || 'one technician'} is the only one free on ${day} with the trade`,
        alternatives: [],
      };
    }

    return {
      ...base,
      date: day,
      techId: options[0].techId,
      techName: options[0].techName,
      outcome: 'choice',
      reason: options.length > 1
        ? `${options.length} could take ${day} — pick one`
        : `${options[0].techName || 'the only candidate'} could take ${day}, but ${options[0].caveat}`,
      alternatives: options,
      assumed: base.assumed || options.some((o) => Boolean(o.caveat)),
    };
  }

  /**
   * Nothing inside what the customer asked for.
   *
   * Said as a clash rather than as a failure, and naming what was asked, so
   * whoever reads it knows what to offer instead. "Unschedulable" would be
   * both unhelpful and untrue — the work is fine, the window is full.
   */
  return {
    ...base,
    date: null,
    outcome: 'none',
    reason: hasRequestedTech(job)
      ? `the technician they asked for has no free day ${window.label}`
      : `no free day ${window.label} — offer them another window`,
    alternatives: [],
  };
}

/** The plan in a sentence. A count is not worth a model call. */
export function summariseProposals(proposals: Proposal[]): string {
  const auto = proposals.filter((p) => p.outcome === 'auto').length;
  const choice = proposals.filter((p) => p.outcome === 'choice').length;
  const none = proposals.filter((p) => p.outcome === 'none').length;
  const bits: string[] = [];
  if (auto) bits.push(`${auto} scheduled`);
  if (choice) bits.push(`${choice} need you`);
  if (none) bits.push(`${none} cannot be placed`);
  return bits.length ? bits.join(', ') : 'nothing waiting to be scheduled';
}
