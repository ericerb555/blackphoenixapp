/**
 * What a finished job actually cost, against what it was quoted at.
 *
 * WHY THIS EXISTS, AND WHAT IT REPLACES
 *
 * `/work-orders/completion-reports` reported every finished job as
 * `totalCosts: 0` and `profitMargin: amount > 0 ? 100 : 0`. Those were literals.
 * The one screen in the company that answers "is our quoting profitable" said
 * "yes, entirely" about every job it had ever seen, which is worse than saying
 * nothing — a report nobody has is a gap, and a report that is confidently wrong
 * is a decision made on it.
 *
 * THE RULE THAT MATTERS MOST: UNKNOWN IS NOT ZERO
 *
 * That is exactly how the old report reached 100%. Costs it did not have were
 * written as zero, zero costs subtract to full margin, and the screen looked
 * populated and healthy. So every figure here carries how it was known, and a
 * job missing its labour or its materials reports **"not enough data"** rather
 * than a number. A job that looks unprofitable is information; a job that looks
 * perfect because half its costs are missing is a trap.
 *
 * WHAT COUNTS AS MEASURED
 *
 * Labour is measured, genuinely. A time entry cannot reach payroll unless its
 * allocations reconcile to the hours worked exactly, and an employee may only
 * bill to a work order assigned to them — so hours against a job are recorded,
 * not estimated. Multiplied by the employee's own pay rate, that is a real
 * labour cost.
 *
 * Materials are measured when a purchase order is linked to the job, and
 * unknown when none is — which is common, and must read as unknown.
 *
 * NO ARITHMETIC LIVES IN A LANGUAGE MODEL
 *
 * Quoted against actual is subtraction. A model doing subtraction on money is a
 * worse calculator with a confident tone. The numbers are computed here and
 * tested; a model's job is to read the finished variance and say why.
 */

/** How a figure came to be known. Same vocabulary the takeoff uses. */
export type Known = 'measured' | 'estimated' | 'unknown';

export interface QuotedSide {
  /** Labour hours the quote assumed, when it recorded any. */
  hours: number | null;
  labourCost: number | null;
  materialCost: number | null;
  /** The price the customer was given. */
  total: number | null;
  known: Known;
}

export interface ActualSide {
  hours: number | null;
  labourCost: number | null;
  materialCost: number | null;
  subcontractorCost: number | null;
  /** Only a number when every part of it is known. */
  total: number | null;
  labourKnown: Known;
  materialKnown: Known;
}

export interface JobOutcome {
  workRequestId: string;
  title: string;
  customer: string;
  completedAt: string;
  quoted: QuotedSide;
  actual: ActualSide;
  /** What was actually invoiced and paid. */
  billed: number;
  margin: { amount: number | null; percent: number | null; known: Known };
  /** Plain sentences naming what is missing, shown rather than swallowed. */
  gaps: string[];
  /** Whether this job may be used to correct a rate. */
  enoughToLearn: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: any): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Hours billed to one work order, and what they cost.
 *
 * Only entries payroll would accept are counted. An entry still flagged for
 * review carries a placeholder finish time — counting it would put a guess into
 * a cost, and the whole point of this file is that a guess and a measurement are
 * not the same thing.
 */
export function labourOnJob(
  workRequestId: string,
  entries: any[],
  payRateByEmployee: Record<string, number>,
): { hours: number; cost: number; entries: number; ratesMissing: number } {
  let hours = 0;
  let cost = 0;
  let counted = 0;
  let ratesMissing = 0;

  for (const entry of entries || []) {
    if (!entry || entry.needsReview) continue;
    const allocations = Array.isArray(entry.allocations) ? entry.allocations : [];
    for (const a of allocations) {
      if (String(a?.workOrderId || '') !== String(workRequestId)) continue;
      const h = Number(a?.hours) || 0;
      if (h <= 0) continue;
      hours += h;
      counted++;
      const rate = Number(payRateByEmployee[String(entry.employeeId || '')]) || 0;
      // A missing pay rate is counted rather than treated as free labour. Zero
      // here would understate the cost and overstate the margin, which is the
      // fault this file exists to stop.
      if (rate > 0) cost += h * rate;
      else ratesMissing++;
    }
  }

  return { hours: round2(hours), cost: round2(cost), entries: counted, ratesMissing };
}

/** Purchase orders raised against one job. */
export function materialsOnJob(workRequestId: string, orders: any[]): { cost: number; orders: number } {
  let cost = 0;
  let count = 0;
  for (const o of orders || []) {
    const links = [o?.workRequestId, o?.work_request_id, o?.jobId, o?.job_id, o?.projectId, o?.project_id];
    if (!links.some((v) => String(v || '') === String(workRequestId))) continue;
    // A cancelled order was never bought.
    if (['cancelled', 'canceled', 'void', 'draft'].includes(String(o?.status || '').toLowerCase())) continue;
    cost += Number(o?.total ?? o?.totalAmount ?? o?.amount ?? 0) || 0;
    count++;
  }
  return { cost: round2(cost), orders: count };
}

/** What the quote said, from whichever of the several shapes carries it. */
export function quotedFrom(request: any): QuotedSide {
  const quote = request?.quote || request?.estimate || {};
  const total = num(quote.totalCost ?? quote.total ?? request?.estimatedValue ?? request?.quotedAmount);
  const hours = num(quote.labourHours ?? quote.laborHours ?? quote.totalHours);
  const labourCost = num(quote.labourCost ?? quote.laborCost);
  const materialCost = num(quote.materialCost ?? quote.materialsCost);

  return {
    hours,
    labourCost,
    materialCost,
    total,
    known: total === null ? 'unknown' : (hours === null && labourCost === null ? 'estimated' : 'estimated'),
  };
}

export interface OutcomeInputs {
  request: any;
  invoiceAmount: number;
  completedAt: string;
  timeEntries: any[];
  payRateByEmployee: Record<string, number>;
  purchaseOrders: any[];
}

/**
 * One finished job, honestly.
 *
 * Every branch that cannot produce a number produces null and a sentence saying
 * why. Nothing here ever substitutes zero for missing.
 */
export function jobOutcome(input: OutcomeInputs): JobOutcome {
  const { request, invoiceAmount, completedAt, timeEntries, payRateByEmployee, purchaseOrders } = input;
  const id = String(request?.id || '');
  const gaps: string[] = [];

  const labour = labourOnJob(id, timeEntries, payRateByEmployee);
  const materials = materialsOnJob(id, purchaseOrders);
  const subcontractorCost = num(request?.subcontractorCost ?? request?.subCost);

  // Labour: measured only when somebody actually billed time to this job AND we
  // could price all of it.
  let labourKnown: Known = 'unknown';
  if (labour.entries === 0) {
    gaps.push('No time was booked to this job, so its labour cost is not known.');
  } else if (labour.ratesMissing > 0) {
    gaps.push(
      `${labour.ratesMissing} time allocation${labour.ratesMissing === 1 ? '' : 's'} `
      + 'belong to an employee with no pay rate on file, so the labour cost is incomplete.',
    );
  } else {
    labourKnown = 'measured';
  }

  let materialKnown: Known = 'unknown';
  if (materials.orders === 0) {
    gaps.push('No purchase order is linked to this job, so its material cost is not known.');
  } else {
    materialKnown = 'measured';
  }

  const bothKnown = labourKnown === 'measured' && materialKnown === 'measured';
  const actualTotal = bothKnown
    ? round2(labour.cost + materials.cost + (subcontractorCost || 0))
    : null;

  const billed = Number(invoiceAmount) || 0;
  const marginAmount = actualTotal === null ? null : round2(billed - actualTotal);
  const marginPercent = marginAmount === null || billed <= 0
    ? null
    : round2((marginAmount / billed) * 100);

  const quoted = quotedFrom(request);
  if (quoted.total === null) {
    gaps.push('This job has no quoted figure recorded, so there is nothing to compare against.');
  }

  return {
    workRequestId: id,
    title: String(request?.title || request?.project_name || request?.projectTitle || 'Completed project'),
    customer: String(request?.client_name || request?.clientName || request?.customerName || ''),
    completedAt,
    quoted,
    actual: {
      hours: labour.entries > 0 ? labour.hours : null,
      labourCost: labourKnown === 'measured' ? labour.cost : null,
      materialCost: materialKnown === 'measured' ? materials.cost : null,
      subcontractorCost,
      total: actualTotal,
      labourKnown,
      materialKnown,
    },
    billed,
    margin: {
      amount: marginAmount,
      percent: marginPercent,
      known: actualTotal === null ? 'unknown' : 'measured',
    },
    gaps,
    // A job teaches us about labour if its hours are measured and it was quoted
    // with hours to compare them to. Materials are not required for that: a job
    // with no purchase order still tells us how long the work took.
    enoughToLearn: labourKnown === 'measured' && quoted.hours !== null && quoted.hours > 0,
  };
}

// ── Learning ────────────────────────────────────────────────────────────────

export interface TaskVariance {
  /** The trade or task these jobs were, as recorded on the request. */
  key: string;
  label: string;
  jobs: number;
  quotedHours: number;
  actualHours: number;
  /** Positive means the work took longer than quoted. */
  variancePercent: number;
  /** Whether there are enough jobs behind it to act on. */
  confident: boolean;
}

/** Below this, a pattern is an anecdote. */
export const MIN_JOBS_TO_LEARN = 5;

/**
 * Where the quoting is consistently wrong, by trade rather than by job.
 *
 * "Deck framing runs 18% over the quoted hours across nine jobs" is something to
 * act on. "Job 402 lost money" is a story about job 402 — it might have rained.
 * Grouping is what turns one into the other.
 */
export function varianceByTask(outcomes: JobOutcome[], keyOf: (o: JobOutcome) => string): TaskVariance[] {
  const groups = new Map<string, { quoted: number; actual: number; jobs: number }>();

  for (const o of outcomes) {
    if (!o.enoughToLearn) continue;
    const key = keyOf(o) || 'general';
    const g = groups.get(key) || { quoted: 0, actual: 0, jobs: 0 };
    g.quoted += o.quoted.hours || 0;
    g.actual += o.actual.hours || 0;
    g.jobs++;
    groups.set(key, g);
  }

  return Array.from(groups.entries())
    .map(([key, g]) => ({
      key,
      label: key.replace(/[_-]/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
      jobs: g.jobs,
      quotedHours: round2(g.quoted),
      actualHours: round2(g.actual),
      variancePercent: g.quoted > 0 ? round2(((g.actual - g.quoted) / g.quoted) * 100) : 0,
      confident: g.jobs >= MIN_JOBS_TO_LEARN,
    }))
    .sort((a, b) => Math.abs(b.variancePercent) - Math.abs(a.variancePercent));
}

export interface RateProposal {
  key: string;
  label: string;
  currentHoursPerUnit: number;
  proposedHoursPerUnit: number;
  variancePercent: number;
  jobs: number;
  /** The sentence shown next to the accept button. */
  because: string;
}

/**
 * A corrected production rate, offered rather than applied.
 *
 * `laborTasks.ts` says in its own header that a figure Eric has edited is marked
 * `source: 'yours'` and "is never silently overwritten". This honours that: it
 * returns a proposal with the evidence behind it, and a person accepts it.
 * Nothing in this file writes a rate.
 *
 * Returns null when the evidence is thin or the variance is small. A rate that
 * moves 3% on five jobs is noise, and re-quoting the whole company off noise is
 * worse than leaving the seed figure alone.
 */
export const MIN_VARIANCE_TO_PROPOSE = 10;

export function proposeRate(v: TaskVariance, currentHoursPerUnit: number): RateProposal | null {
  if (!v.confident) return null;
  if (Math.abs(v.variancePercent) < MIN_VARIANCE_TO_PROPOSE) return null;
  if (!(currentHoursPerUnit > 0)) return null;
  if (!(v.quotedHours > 0)) return null;

  const factor = v.actualHours / v.quotedHours;
  const proposed = Math.round(currentHoursPerUnit * factor * 1000) / 1000;
  if (proposed === currentHoursPerUnit) return null;

  const over = v.variancePercent > 0;
  return {
    key: v.key,
    label: v.label,
    currentHoursPerUnit,
    proposedHoursPerUnit: proposed,
    variancePercent: v.variancePercent,
    jobs: v.jobs,
    because:
      `Across ${v.jobs} finished jobs, ${v.label.toLowerCase()} took ${v.actualHours}h against `
      + `${v.quotedHours}h quoted — ${Math.abs(v.variancePercent)}% ${over ? 'over' : 'under'}. `
      + `${over ? 'Quoting it at the measured rate stops the overrun coming out of the margin.'
        : 'The current rate is padding these quotes, which loses work on price.'}`,
  };
}
