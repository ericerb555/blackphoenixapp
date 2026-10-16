/**
 * Working out a day: what gets booked, what needs deciding, what cannot be done.
 *
 * WHY THIS IS NOT A MODEL CALL
 *
 * Same reason as `availability.ts`. Assigning people to jobs is a constraint
 * problem with a right answer, and a language model asked to solve one is
 * convincing rather than correct — it will double-book somebody, or quietly
 * drop the job it could not place. This produces the plan; a model is useful
 * afterwards, to say it in a sentence a person reads faster than a table.
 *
 * THE ONE ALGORITHMIC DECISION WORTH KNOWING
 *
 * Jobs are placed MOST CONSTRAINED FIRST — fewest possible technicians before
 * most. Taking them in the order they arrive is the obvious approach and it is
 * how a day gets wasted: the one person who can do Thursday's boiler gets put
 * on a job anybody could have covered, and the boiler then cannot be done at
 * all. Placing the hard ones while there is still room to place them is worth
 * more than any cleverness afterwards.
 *
 * A JOB WITH A REQUESTED TECHNICIAN IS PLACED FIRST OF ALL
 *
 * Not because it is more important, but because it has exactly one possible
 * answer and no flexibility to give up later.
 */
import {
  type Tech, type Job, type Unavailability, type Booking, type Candidate,
  candidatesFor, mayAutoAssign, hasRequestedTech,
} from './availability.ts';

export interface PlannableJob extends Job {
  id: string;
  title?: string;
  /** Higher goes first among equally constrained jobs. */
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface Assignment {
  jobId: string;
  techId: string;
  techName?: string;
  hours: number;
  /** Why this person, in words somebody can check. */
  reason: string;
}

export interface Choice {
  jobId: string;
  candidates: Array<{ techId: string; techName?: string; hoursFree: number; caveat?: string }>;
  reason: string;
}

export interface Unstaffed {
  jobId: string;
  reason: string;
}

export interface DayPlan {
  date: string;
  /** Booked without asking — exactly one sensible answer. */
  assignments: Assignment[];
  /** A choice was involved, so a person decides. */
  choices: Choice[];
  /** Nobody can do it today. */
  unstaffed: Unstaffed[];
}

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

/** A caveat worth repeating to whoever is choosing. */
function caveatFor(c: Candidate): string | undefined {
  if (c.unverifiedTrade && c.assumedPattern) return 'trade not recorded, and hours assumed';
  if (c.unverifiedTrade) return 'trade not recorded for them';
  if (c.assumedPattern) return 'working hours assumed';
  return undefined;
}

/**
 * Plan one day.
 *
 * Provisional bookings accumulate as jobs are placed, so the plan cannot
 * double-book somebody it has just committed. Without that the second job of
 * the morning is offered the same technician as the first, and the schedule
 * reads as solved while two crews are expected in two places.
 */
export function planDay(
  date: string,
  jobs: PlannableJob[],
  techs: Tech[],
  unavailability: Unavailability[] = [],
  bookings: Booking[] = [],
): DayPlan {
  const plan: DayPlan = { date, assignments: [], choices: [], unstaffed: [] };
  const provisional: Booking[] = [...bookings];
  const nameOf = (id: string) => techs.find((t) => String(t.id) === String(id))?.name;

  /**
   * Order before placing: promised first, then fewest options, then priority.
   *
   * The candidate count is computed against the starting state rather than
   * being recomputed as we go. It is an ordering heuristic, not a guarantee,
   * and recomputing it would cost a pass per job for an ordering that barely
   * moves.
   */
  const ordered = [...(jobs || [])].sort((a, b) => {
    const aPromised = hasRequestedTech(a) ? 0 : 1;
    const bPromised = hasRequestedTech(b) ? 0 : 1;
    if (aPromised !== bPromised) return aPromised - bPromised;

    const aCount = candidatesFor(techs, date, a, unavailability, bookings).length;
    const bCount = candidatesFor(techs, date, b, unavailability, bookings).length;
    if (aCount !== bCount) return aCount - bCount;

    return (PRIORITY_RANK[String(a.priority || 'medium')] ?? 2)
      - (PRIORITY_RANK[String(b.priority || 'medium')] ?? 2);
  });

  for (const job of ordered) {
    const candidates = candidatesFor(techs, date, job, unavailability, provisional);

    if (candidates.length === 0) {
      plan.unstaffed.push({
        jobId: job.id,
        reason: hasRequestedTech(job)
          // Said precisely. "Nobody is free" would be untrue and would invite
          // somebody to wonder why the other technicians were not offered.
          ? 'the technician the customer asked for cannot do it that day'
          : 'nobody available with the trade and the hours',
      });
      continue;
    }

    const hours = Number(job.hours) > 0 ? Number(job.hours) : 0;

    if (mayAutoAssign(candidates) && !hasRequestedTech(job)) {
      const only = candidates[0];
      plan.assignments.push({
        jobId: job.id,
        techId: String(only.tech.id),
        techName: only.tech.name,
        hours,
        reason: `only ${only.tech.name || 'one technician'} is free with the trade`,
      });
      provisional.push({ employeeId: String(only.tech.id), date, hours: hours || 1, status: 'scheduled' });
      continue;
    }

    /**
     * A promised technician is a CHOICE, even when they are the only candidate.
     *
     * The choice is not who does it — it is whether to book a job the customer
     * has already been made a promise about, which somebody should see.
     */
    plan.choices.push({
      jobId: job.id,
      candidates: candidates.map((c) => ({
        techId: String(c.tech.id),
        techName: c.tech.name,
        hoursFree: c.hoursFree,
        caveat: caveatFor(c),
      })),
      reason: hasRequestedTech(job)
        ? 'the customer asked for this technician — confirm before booking'
        : candidates.length > 1
          ? `${candidates.length} technicians could take it`
          : 'the only candidate rests on an assumption',
    });
  }

  return plan;
}

export interface CoverPlan {
  date: string;
  calledOutTechId: string;
  /** Moved automatically — nobody was promised, and one person was free. */
  reassigned: Assignment[];
  /** A human has to decide, and why. */
  needsHuman: Array<{ jobId: string; reason: string; candidates: Choice['candidates'] }>;
}

/**
 * Somebody rang in sick. What happens to their day?
 *
 * Eric asked for automatic reassignment here, because the morning of a
 * call-out is when an assistant earns its place and waiting for a human is
 * what loses the day.
 *
 * With one exception, and it is the important one: a job where a technician
 * was PROMISED is never moved automatically. Substituting a stranger at the
 * moment nobody is watching is the one thing not to automate — those reach a
 * person who can ring the customer and offer them the choice.
 *
 * The called-out technician is removed from the pool before anything is
 * placed, rather than filtered afterwards, so nothing can be handed back to
 * the person who is not coming in.
 */
export function planCallOutCover(
  date: string,
  calledOutTechId: string,
  theirJobs: PlannableJob[],
  techs: Tech[],
  unavailability: Unavailability[] = [],
  bookings: Booking[] = [],
): CoverPlan {
  const cover: CoverPlan = { date, calledOutTechId: String(calledOutTechId), reassigned: [], needsHuman: [] };
  const pool = (techs || []).filter((t) => String(t.id) !== String(calledOutTechId));
  // Their own bookings no longer hold anybody's time — they are not coming in.
  const freed = (bookings || []).filter((b) => String(b.employeeId) !== String(calledOutTechId));
  const provisional: Booking[] = [...freed];

  for (const job of theirJobs || []) {
    if (hasRequestedTech(job)) {
      cover.needsHuman.push({
        jobId: job.id,
        reason: 'the customer asked for this technician — somebody should ring them',
        candidates: [],
      });
      continue;
    }

    const candidates = candidatesFor(pool, date, job, unavailability, provisional);
    const hours = Number(job.hours) > 0 ? Number(job.hours) : 0;

    if (candidates.length === 0) {
      cover.needsHuman.push({
        jobId: job.id,
        reason: 'nobody else can take it today',
        candidates: [],
      });
      continue;
    }

    if (mayAutoAssign(candidates)) {
      const only = candidates[0];
      cover.reassigned.push({
        jobId: job.id,
        techId: String(only.tech.id),
        techName: only.tech.name,
        hours,
        reason: `moved to ${only.tech.name || 'the only free technician'}`,
      });
      provisional.push({ employeeId: String(only.tech.id), date, hours: hours || 1, status: 'scheduled' });
      continue;
    }

    cover.needsHuman.push({
      jobId: job.id,
      reason: `${candidates.length} could cover it — pick one`,
      candidates: candidates.map((c) => ({
        techId: String(c.tech.id),
        techName: c.tech.name,
        hoursFree: c.hoursFree,
        caveat: caveatFor(c),
      })),
    });
  }

  return cover;
}

/**
 * The plan in a sentence, for somebody who will not read the table.
 *
 * Written here rather than asked of a model: it is a count, and paying for a
 * model call to produce "3 booked, 2 need you" would be both slower and less
 * reliable. The model earns its place explaining a PARTICULAR choice, not
 * counting.
 */
export function summarise(plan: DayPlan): string {
  const bits: string[] = [];
  if (plan.assignments.length) bits.push(`${plan.assignments.length} booked`);
  if (plan.choices.length) bits.push(`${plan.choices.length} need you`);
  if (plan.unstaffed.length) bits.push(`${plan.unstaffed.length} nobody can do`);
  return bits.length ? bits.join(', ') : 'nothing to schedule';
}
