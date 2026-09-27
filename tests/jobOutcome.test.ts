/**
 * What a finished job actually cost, and whether we quoted it right.
 *
 * This is the arithmetic behind correcting production rates: every job is
 * examined once it is done so the hours we quote move toward the hours the
 * crews really take. So the rules that matter most here are the ones that stop
 * a wrong number looking like a right one.
 *
 * THE RULE THIS FILE GUARDS ABOVE ALL OTHERS
 *
 * Unknown is not zero. The report this replaced wrote missing costs down as
 * zero, and zero costs subtract to full margin — so every finished job in the
 * company's history reported 100% profit. A job that looks unprofitable is
 * information; a job that looks perfect because half its costs are missing is a
 * trap, and several tests below exist only to keep that trap shut.
 *
 * THE COST SIDE IS WHAT WE PAY, NOT WHAT WE CHARGE
 *
 * A purchase order's total is what we pay the vendor, and an employee's pay
 * rate is what we pay them. Neither is the customer's price. That is the whole
 * reason a real margin is computable, and it is why a cancelled order — money
 * that never left — must not count.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  labourOnJob, materialsOnJob, quotedFrom, quotedHoursFrom, jobOutcome,
  varianceByTask, proposeRate, MIN_JOBS_TO_LEARN, MIN_VARIANCE_TO_PROPOSE,
  type JobOutcome,
} from '../supabase/functions/server/jobOutcome.ts';

/** One employee at $40/h, one at $60/h, and one nobody priced. */
const rates = { emp1: 40, emp2: 60, unpriced: 0 };

const entry = (employeeId: string, allocations: any[], extra: any = {}) => ({
  id: `TE-${employeeId}-${Math.random()}`, employeeId, allocations, ...extra,
});

/* ── labour ──────────────────────────────────────────────────────────────── */

test('hours billed to a job are priced at the employee who worked them', () => {
  const r = labourOnJob('JOB-1', [
    entry('emp1', [{ workOrderId: 'JOB-1', hours: 8 }]),
    entry('emp2', [{ workOrderId: 'JOB-1', hours: 4 }]),
  ], rates);
  assert.equal(r.hours, 12);
  assert.equal(r.cost, 8 * 40 + 4 * 60, 'two people on one job are not one blended rate');
  assert.equal(r.entries, 2);
});

test('time on somebody else’s job stays on somebody else’s job', () => {
  const r = labourOnJob('JOB-1', [
    entry('emp1', [{ workOrderId: 'JOB-2', hours: 8 }]),
  ], rates);
  assert.equal(r.hours, 0);
  assert.equal(r.cost, 0);
  assert.equal(r.entries, 0);
});

test('one entry split across jobs contributes only its own share', () => {
  const r = labourOnJob('JOB-1', [
    entry('emp1', [
      { workOrderId: 'JOB-1', hours: 3 },
      { workOrderId: 'JOB-2', hours: 5 },
    ]),
  ], rates);
  assert.equal(r.hours, 3, 'a day split between two jobs is not eight hours on each');
  assert.equal(r.cost, 120);
});

test('an entry still flagged for review is not counted', () => {
  const r = labourOnJob('JOB-1', [
    entry('emp1', [{ workOrderId: 'JOB-1', hours: 8 }], { needsReview: true }),
  ], rates);
  assert.equal(r.entries, 0,
    'an entry under review carries a placeholder finish time — counting it puts a guess into a cost');
});

test('an employee with no pay rate is counted as missing, never as free', () => {
  const r = labourOnJob('JOB-1', [
    entry('unpriced', [{ workOrderId: 'JOB-1', hours: 10 }]),
  ], rates);
  assert.equal(r.hours, 10, 'the hours happened');
  assert.equal(r.cost, 0);
  assert.equal(r.ratesMissing, 1,
    'unpriced labour must be reported as unknown, or the margin is overstated by whatever it cost');
});

/* ── materials ───────────────────────────────────────────────────────────── */

test('purchase orders against the job add up, by any of the names the link goes by', () => {
  const r = materialsOnJob('JOB-1', [
    { id: 'PO-1', jobId: 'JOB-1', total: 500, status: 'sent' },
    { id: 'PO-2', workRequestId: 'JOB-1', total: 250.5, status: 'received' },
    { id: 'PO-3', project_id: 'JOB-1', total: 100, status: 'sent' },
  ]);
  assert.equal(r.cost, 850.5);
  assert.equal(r.orders, 3);
});

test('a cancelled or still-draft order is money that never left', () => {
  const r = materialsOnJob('JOB-1', [
    { id: 'PO-1', jobId: 'JOB-1', total: 500, status: 'cancelled' },
    { id: 'PO-2', jobId: 'JOB-1', total: 300, status: 'draft' },
    { id: 'PO-3', jobId: 'JOB-1', total: 200, status: 'sent' },
  ]);
  assert.equal(r.cost, 200);
  assert.equal(r.orders, 1);
});

test('an order on another job is not this job’s cost', () => {
  const r = materialsOnJob('JOB-1', [{ id: 'PO-1', jobId: 'JOB-9', total: 500, status: 'sent' }]);
  assert.equal(r.cost, 0);
  assert.equal(r.orders, 0);
});

/* ── the quoted side ─────────────────────────────────────────────────────── */

test('the quote is read from whichever shape carries it', () => {
  assert.equal(quotedFrom({ quote: { totalCost: 4632.4 } }).total, 4632.4);
  assert.equal(quotedFrom({ quote: { total: 900 } }).total, 900);
  assert.equal(quotedFrom({ estimatedValue: 1200 }).total, 1200);
});

test('a job nobody quoted reports no quoted figure rather than zero', () => {
  const q = quotedFrom({});
  assert.equal(q.total, null);
  assert.equal(q.known, 'unknown');
});

/**
 * The shape every real quote in this system actually has.
 *
 * These were added after pushing one genuine job through end to end: the
 * seeded flooring quote carried its 16 hours inside `labor[]` and nothing
 * else, so the loop read null hours and declined to learn from it. Every
 * finished job would have done the same.
 */
test('hours on the labour lines are what a real quote carries', () => {
  assert.equal(quotedHoursFrom({ labor: [{ role: "Fitter", hours: 16, hourlyRate: 85 }] }), 16);
  assert.equal(quotedHoursFrom({ labor: [{ hours: 16 }, { hours: 8 }] }), 24, "every line counts");
  assert.equal(quotedHoursFrom({ laborItems: [{ hours: 12 }] }), 12, "the builder’s shape too");
});

test('a top-level figure wins over the lines when a quote carries one', () => {
  assert.equal(quotedHoursFrom({ labourHours: 40, labor: [{ hours: 16 }] }), 40);
});

test('labour lines with no hours on them is not zero hours quoted', () => {
  assert.equal(quotedHoursFrom({ labor: [{ role: "Fitter", hourlyRate: 85 }] }), null,
    'zero would read as a total overrun on a quote that simply never said');
  assert.equal(quotedHoursFrom({}), null);
  assert.equal(quotedHoursFrom({ labor: [] }), null);
});


test('quoted hours are read under either spelling', () => {
  assert.equal(quotedFrom({ quote: { totalCost: 100, labourHours: 12 } }).hours, 12);
  assert.equal(quotedFrom({ quote: { totalCost: 100, laborHours: 12 } }).hours, 12);
});

/* ── the whole outcome, where unknown must stay unknown ──────────────────── */

const fullInputs = {
  request: { id: 'JOB-1', title: 'Deck rebuild', quote: { totalCost: 5000, labourHours: 40 } },
  invoiceAmount: 5000,
  completedAt: '2026-09-20T00:00:00.000Z',
  timeEntries: [entry('emp1', [{ workOrderId: 'JOB-1', hours: 40 }])],
  payRateByEmployee: rates,
  purchaseOrders: [{ id: 'PO-1', jobId: 'JOB-1', total: 1200, status: 'sent' }],
};

test('a job quoted only through its labour lines can still be learned from', () => {
  const o = jobOutcome({
    ...fullInputs,
    request: { id: "JOB-1", title: "Flooring", quote: { totalCost: 4632.4, labor: [{ hours: 16 }] } },
  });
  assert.equal(o.quoted.hours, 16);
  assert.equal(o.enoughToLearn, true,
    'this is the case that made every finished job unusable');
});

test('a job with both halves measured reports a real margin', () => {
  const o = jobOutcome(fullInputs);
  assert.equal(o.actual.labourCost, 1600);
  assert.equal(o.actual.materialCost, 1200);
  assert.equal(o.actual.total, 2800);
  assert.equal(o.margin.amount, 2200, '5000 billed less 2800 that it cost');
  assert.equal(o.margin.percent, 44);
  assert.equal(o.margin.known, 'measured');
  assert.deepEqual(o.gaps, []);
});

test('no time booked means no margin, not a perfect one', () => {
  const o = jobOutcome({ ...fullInputs, timeEntries: [] });
  assert.equal(o.actual.labourCost, null);
  assert.equal(o.actual.total, null);
  assert.equal(o.margin.percent, null,
    'this is the exact path by which every finished job once reported 100% profit');
  assert.ok(o.gaps.some((g) => g.includes('No time was booked')));
});

test('no purchase order means no margin either', () => {
  const o = jobOutcome({ ...fullInputs, purchaseOrders: [] });
  assert.equal(o.actual.materialCost, null);
  assert.equal(o.margin.amount, null);
  assert.ok(o.gaps.some((g) => g.includes('No purchase order')));
});

test('labour we could not price is incomplete, and says so', () => {
  const o = jobOutcome({
    ...fullInputs,
    timeEntries: [entry('unpriced', [{ workOrderId: 'JOB-1', hours: 40 }])],
  });
  assert.equal(o.actual.labourKnown, 'unknown');
  assert.equal(o.margin.percent, null);
  assert.ok(o.gaps.some((g) => g.includes('no pay rate')));
});

test('a job that lost money says so plainly', () => {
  const o = jobOutcome({
    ...fullInputs,
    invoiceAmount: 2000,
    purchaseOrders: [{ id: 'PO-1', jobId: 'JOB-1', total: 3000, status: 'sent' }],
  });
  assert.equal(o.actual.total, 4600);
  assert.equal(o.margin.amount, -2600);
  assert.ok(o.margin.percent !== null && o.margin.percent < 0);
});

test('hours are reported even when they could not be priced', () => {
  const o = jobOutcome({
    ...fullInputs,
    timeEntries: [entry('unpriced', [{ workOrderId: 'JOB-1', hours: 40 }])],
  });
  assert.equal(o.actual.hours, 40,
    'how long it took is the figure that corrects the quoting rate, and it is known here');
});

test('a job teaches us about hours only when both sides of the comparison exist', () => {
  assert.equal(jobOutcome(fullInputs).enoughToLearn, true);
  assert.equal(
    jobOutcome({ ...fullInputs, request: { id: 'JOB-1', quote: { totalCost: 5000 } } }).enoughToLearn,
    false,
    'measured hours with nothing quoted to compare them to teaches nothing',
  );
  assert.equal(
    jobOutcome({ ...fullInputs, timeEntries: [] }).enoughToLearn,
    false,
  );
});

/* ── learning: where the quoting is wrong, by trade ──────────────────────── */

const outcome = (key: string, quotedHours: number, actualHours: number): JobOutcome =>
  jobOutcome({
    request: { id: `JOB-${key}-${quotedHours}-${actualHours}`, title: key, quote: { totalCost: 1000, labourHours: quotedHours } },
    invoiceAmount: 1000,
    completedAt: '2026-09-20T00:00:00.000Z',
    timeEntries: [entry('emp1', [{ workOrderId: `JOB-${key}-${quotedHours}-${actualHours}`, hours: actualHours }])],
    payRateByEmployee: rates,
    purchaseOrders: [],
  });

test('consistently over-running work shows up as a positive variance', () => {
  const rows = varianceByTask(
    [outcome('framing', 10, 12), outcome('framing', 10, 12)],
    () => 'framing',
  );
  assert.equal(rows[0].quotedHours, 20);
  assert.equal(rows[0].actualHours, 24);
  assert.equal(rows[0].variancePercent, 20, 'under-quoted by a fifth');
});

test('a pattern under five jobs is an anecdote, and is marked as one', () => {
  const four = [1, 2, 3, 4].map(() => outcome('framing', 10, 13));
  assert.equal(varianceByTask(four, () => 'framing')[0].confident, false);
  const five = [1, 2, 3, 4, 5].map(() => outcome('framing', 10, 13));
  assert.equal(varianceByTask(five, () => 'framing')[0].confident, true);
  assert.equal(MIN_JOBS_TO_LEARN, 5);
});

test('jobs with nothing to learn from are left out of the grouping entirely', () => {
  const rows = varianceByTask([outcome('framing', 0, 12)], () => 'framing');
  assert.equal(rows.length, 0, 'a job with no quoted hours cannot say the quote was wrong');
});

/* ── proposals: offered, never applied ───────────────────────────────────── */

const confidentOver = varianceByTask([1, 2, 3, 4, 5].map(() => outcome('framing', 10, 13)), () => 'framing')[0];

test('a corrected rate is proposed with the evidence behind it', () => {
  const p = proposeRate(confidentOver, 0.5);
  assert.ok(p);
  assert.equal(p.proposedHoursPerUnit, 0.65, '0.5 scaled by the 30% overrun measured across five jobs');
  assert.ok(p.because.includes('5 finished jobs'));
  assert.ok(p.because.includes('over'));
});

test('thin evidence proposes nothing', () => {
  const thin = varianceByTask([1, 2, 3].map(() => outcome('framing', 10, 13)), () => 'framing')[0];
  assert.equal(proposeRate(thin, 0.5), null,
    're-quoting the whole company off three jobs is worse than leaving the seed figure alone');
});

test('a small variance proposes nothing, because that is noise', () => {
  const small = varianceByTask([1, 2, 3, 4, 5].map(() => outcome('framing', 100, 105)), () => 'framing')[0];
  assert.equal(small.variancePercent, 5);
  assert.ok(small.variancePercent < MIN_VARIANCE_TO_PROPOSE);
  assert.equal(proposeRate(small, 0.5), null);
});

test('padding is reported as padding, not congratulated', () => {
  const under = varianceByTask([1, 2, 3, 4, 5].map(() => outcome('framing', 10, 7)), () => 'framing')[0];
  const p = proposeRate(under, 0.5);
  assert.ok(p);
  assert.equal(p.proposedHoursPerUnit, 0.35);
  assert.ok(p.because.includes('padding'), 'quoting too high loses work on price, which is also a fault');
});

test('a proposal needs a current rate to correct', () => {
  assert.equal(proposeRate(confidentOver, 0), null);
});
