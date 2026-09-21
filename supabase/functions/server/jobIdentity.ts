/**
 * jobIdentity — the one job a document belongs to.
 *
 * WHAT THIS IS FOR
 *
 * Eric: *"lets make sure we can keep all the work requests/quote and invoices
 * link to one job no matter what point we enter in the job."*
 *
 * Before this, linking was pairwise, optional and supplied by whoever happened
 * to be calling — `body.workRequestId || null` and similar. That works in the
 * one direction you came in through and nowhere else: a quote raised with no
 * work request had nothing upstream, an invoice from the plan-proposal flow
 * carried `planProposalId` and no job at all, and every purchase order raised
 * from Materials Center was orphaned because the route accepted `quoteId` and
 * the screen never sent one. "Show me everything for this job" was a question
 * with no answer.
 *
 * THE RULE THAT SHAPES ALL OF IT
 *
 * Eric again, and it is the important one: *"even if we have the same addresses
 * and service address the documents will create a separate job number per job
 * or work request."*
 *
 * So a document NEVER finds its job by resembling one. Not by address, not by
 * customer, not by service type, not by being created around the same time. A
 * landlord with ten instructions at one building gets ten jobs, which is what
 * the business actually needs — and, just as importantly, two genuinely
 * separate jobs can never be silently collapsed into one by a matching rule
 * that seemed clever at the time.
 *
 * A document joins an existing job only when it is *told* to: the caller names
 * the job, or names a parent document that already belongs to one. Everything
 * else opens a new job.
 *
 * WHY THIS FILE IS PURE
 *
 * No `Deno`, no network, no key-value store — so it runs under `node --test`
 * and the rule above is pinned by assertions rather than by a comment. The
 * storage half lives in `jobs.tsx`, which calls into here.
 */

export type JobDoorway =
  | 'work_request'
  | 'quote'
  | 'invoice'
  | 'purchase_order'
  | 'design_project'
  | 'manual';

export interface Job {
  id: string;
  /** Human-readable, the thing people say on the phone. */
  jobNumber: string;
  customerEmail: string;
  customerName: string;
  siteAddress: string;
  title: string;
  serviceType: string;
  /** Which kind of document opened it, and which one. */
  openedFrom: JobDoorway;
  openedFromId: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
}

/**
 * How a document decides which job it is on.
 *
 * Three outcomes and no fourth. There is deliberately no `'matched'` — nothing
 * here ever looks at a customer, an address or a date to decide two documents
 * belong together.
 */
export type JobChoice =
  | { use: 'explicit'; jobId: string }
  | { use: 'parent'; jobId: string }
  | { use: 'new' };

export interface JobClaim {
  /** A job named outright by the caller. */
  jobId?: string | null;
  /** The job already carried by the parent document, if it had one. */
  parentJobId?: string | null;
}

/**
 * Which job a new document belongs to.
 *
 * An explicit job beats an inherited one, because somebody naming a job is
 * making a decision and the parent link is only a default. Both are followed
 * only when they actually name something — a blank string is not a job, and
 * treating one as though it were is how a document ends up attached to
 * nothing while appearing attached.
 */
export function chooseJob(claim: JobClaim | null | undefined): JobChoice {
  const explicit = String(claim?.jobId ?? '').trim();
  if (explicit) return { use: 'explicit', jobId: explicit };

  const inherited = String(claim?.parentJobId ?? '').trim();
  if (inherited) return { use: 'parent', jobId: inherited };

  return { use: 'new' };
}

const TWO_DIGIT = (n: number) => String(n).padStart(2, '0');

/**
 * A job number people can read out.
 *
 * `JOB-YYYYMMDD-XXXXXX`, where the tail is base36 of the moment it was opened
 * plus a short salt. Shaped after the purchase-order numbers this codebase
 * already issues, which use the same `Date.now().toString(36)` stamp.
 *
 * Deliberately not a per-day counter. A counter has to be read, incremented
 * and written, and two jobs opened in the same instant would either collide on
 * the number or need locking that a key-value store does not offer. A number
 * that is merely unique and roughly sortable is worth more here than one that
 * counts from 1, because the failure mode of the pretty version is two jobs
 * sharing a number — which is precisely the thing this module exists to
 * prevent.
 *
 * `now` and `salt` are arguments rather than read from the clock so the format
 * can be asserted rather than described.
 */
export function jobNumber(now: Date, salt: string): string {
  const stamp = `${now.getUTCFullYear()}${TWO_DIGIT(now.getUTCMonth() + 1)}${TWO_DIGIT(now.getUTCDate())}`;
  const tail = `${now.getTime().toString(36)}${String(salt || '').replace(/[^a-zA-Z0-9]/g, '')}`
    .toUpperCase()
    .slice(0, 10);
  return `JOB-${stamp}-${tail}`;
}

/** What a caller knows about the work when a job is opened. */
export interface JobSeed {
  customerEmail?: string | null;
  customerName?: string | null;
  siteAddress?: string | null;
  title?: string | null;
  serviceType?: string | null;
  openedFrom?: JobDoorway;
  openedFromId?: string | null;
  createdBy?: string | null;
}

const text = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);

/**
 * Build a job record.
 *
 * Every field is optional going in, because the whole point is that a job can
 * be opened from any door and some doors know less than others — an invoice
 * raised for work already done may have a customer and nothing else. A job
 * with thin details is still a job, and still better than a document attached
 * to nothing.
 */
export function openJob(
  seed: JobSeed,
  now: Date,
  id: string,
): Job {
  return {
    id,
    jobNumber: jobNumber(now, id.replace(/[^a-zA-Z0-9]/g, '').slice(-4)),
    customerEmail: text(seed.customerEmail, 320).toLowerCase(),
    customerName: text(seed.customerName, 180),
    siteAddress: text(seed.siteAddress, 400),
    title: text(seed.title, 240),
    serviceType: text(seed.serviceType, 120),
    openedFrom: seed.openedFrom || 'manual',
    openedFromId: text(seed.openedFromId, 120),
    createdAt: now.toISOString(),
    createdBy: text(seed.createdBy, 320).toLowerCase(),
  };
}

/**
 * The job id carried by a parent document, whatever shape it is.
 *
 * Records in this codebase were written by many hands over a long time, so the
 * same idea appears as `jobId`, `job_id` and occasionally nested under a
 * `job` object. Reading all of them here means a creation path does not have
 * to know which convention the record it was handed happens to follow.
 *
 * Note this reads the job id OFF a record — it never infers one.
 */
export function jobIdOf(record: any): string {
  if (!record || typeof record !== 'object') return '';
  const direct = record.jobId ?? record.job_id ?? record.job?.id ?? record.job?.jobId;
  return String(direct ?? '').trim();
}
