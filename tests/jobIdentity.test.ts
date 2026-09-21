/**
 * One job, whatever door the work came in through.
 *
 * WHY THESE ASSERTIONS
 *
 * The rule Eric set is easy to state and easy to erode: *"even if we have the
 * same addresses and service address the documents will create a separate job
 * number per job or work request."* Every future convenience — "surely two
 * requests at the same address are the same job", "surely the same customer on
 * the same day" — is a plausible-sounding change that would silently merge two
 * jobs somebody is being billed for separately.
 *
 * Merging is also the direction that cannot be undone by noticing. Two jobs
 * collapsed into one lose the boundary between them, and nothing reports it;
 * two jobs left separate are visibly separate.
 *
 * So the rule is pinned here rather than described in a comment.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chooseJob, jobNumber, openJob, jobIdOf,
  type JobSeed,
} from '../supabase/functions/server/jobIdentity.ts';

const AT = new Date('2026-09-21T14:30:00.000Z');

const seed = (over: Partial<JobSeed> = {}): JobSeed => ({
  customerEmail: 'Wanda@Example.com',
  customerName: 'Wanda Sutton',
  siteAddress: '14 Mill Lane, Nashua NH',
  title: 'Bulk head replacement',
  serviceType: 'carpentry',
  openedFrom: 'work_request',
  openedFromId: 'wr_123',
  createdBy: 'Staff@Example.com',
  ...over,
});

/* ── the rule ─────────────────────────────────────────────────────────────── */

test('THE RULE: same customer and same address still open separate jobs', () => {
  const a = openJob(seed(), AT, 'job_aaa');
  const b = openJob(seed(), AT, 'job_bbb');

  assert.notEqual(a.id, b.id);
  assert.notEqual(a.jobNumber, b.jobNumber,
    'two jobs sharing a number is the failure this module exists to prevent');
  assert.equal(a.siteAddress, b.siteAddress, 'the addresses really are identical');
  assert.equal(a.customerEmail, b.customerEmail, 'and so is the customer');
});

test('nothing about the work is consulted when choosing a job', () => {
  // chooseJob is given no customer, address, service or date, and there is no
  // parameter through which it could be. If a future change adds one, this stops
  // compiling, which is the point.
  assert.deepEqual(chooseJob({}), { use: 'new' });
  assert.deepEqual(chooseJob(null), { use: 'new' });
  assert.deepEqual(chooseJob(undefined), { use: 'new' });
});

/* ── joining a job you are told about ─────────────────────────────────────── */

test('a job named outright is used', () => {
  assert.deepEqual(chooseJob({ jobId: 'job_abc' }), { use: 'explicit', jobId: 'job_abc' });
});

test("a parent's job is inherited — this is how a quote joins its work request", () => {
  assert.deepEqual(chooseJob({ parentJobId: 'job_abc' }), { use: 'parent', jobId: 'job_abc' });
});

test('an explicit job beats an inherited one, because somebody chose it', () => {
  assert.deepEqual(
    chooseJob({ jobId: 'job_chosen', parentJobId: 'job_inherited' }),
    { use: 'explicit', jobId: 'job_chosen' },
  );
});

test('a blank id is not a job — it opens a new one rather than attaching to nothing', () => {
  assert.deepEqual(chooseJob({ jobId: '' }), { use: 'new' });
  assert.deepEqual(chooseJob({ jobId: '   ' }), { use: 'new' });
  assert.deepEqual(chooseJob({ jobId: null, parentJobId: null }), { use: 'new' });
  assert.deepEqual(chooseJob({ jobId: '  ', parentJobId: 'job_x' }), { use: 'parent', jobId: 'job_x' });
});

test('ids are trimmed, so a stray space does not fork a job', () => {
  assert.deepEqual(chooseJob({ jobId: ' job_abc ' }), { use: 'explicit', jobId: 'job_abc' });
});

/* ── the number ───────────────────────────────────────────────────────────── */

test('a job number carries the date it was opened', () => {
  assert.match(jobNumber(AT, 'aaaa'), /^JOB-20260921-[A-Z0-9]+$/);
});

test('the date is UTC, so a job opened late in the evening is not dated tomorrow', () => {
  assert.match(jobNumber(new Date('2026-01-05T23:59:59.000Z'), 'x'), /^JOB-20260105-/);
});

test('two jobs opened in the same millisecond do not share a number', () => {
  assert.notEqual(jobNumber(AT, 'aaaa'), jobNumber(AT, 'bbbb'));
});

/* ── opening one ──────────────────────────────────────────────────────────── */

test('an email is stored lowercased, so the same person is one person', () => {
  const job = openJob(seed(), AT, 'job_1');
  assert.equal(job.customerEmail, 'wanda@example.com');
  assert.equal(job.createdBy, 'staff@example.com');
});

test('a job opened from a thin document is still a job', () => {
  // An invoice raised for work already done may know a customer and nothing
  // else. Refusing to open a job here would leave it attached to nothing, which
  // is the state this whole module exists to end.
  const job = openJob({ customerEmail: 'a@b.com', openedFrom: 'invoice', openedFromId: 'inv_9' }, AT, 'job_2');
  assert.equal(job.customerEmail, 'a@b.com');
  assert.equal(job.openedFrom, 'invoice');
  assert.equal(job.siteAddress, '');
  assert.ok(job.jobNumber.startsWith('JOB-'));
});

test('an empty seed still produces a usable record', () => {
  const job = openJob({}, AT, 'job_3');
  assert.equal(job.openedFrom, 'manual');
  assert.equal(job.id, 'job_3');
  assert.ok(job.jobNumber);
  assert.equal(job.createdAt, AT.toISOString());
});

/* ── reading a job off a record ───────────────────────────────────────────── */

test("a parent's job id is read whichever spelling the record uses", () => {
  assert.equal(jobIdOf({ jobId: 'job_a' }), 'job_a');
  assert.equal(jobIdOf({ job_id: 'job_b' }), 'job_b');
  assert.equal(jobIdOf({ job: { id: 'job_c' } }), 'job_c');
});

test('a record with no job yields nothing, and nothing is inferred from it', () => {
  assert.equal(jobIdOf({ customerEmail: 'a@b.com', siteAddress: '14 Mill Lane' }), '');
  assert.equal(jobIdOf(null), '');
  assert.equal(jobIdOf(undefined), '');
  assert.equal(jobIdOf('not a record'), '');
  assert.equal(jobIdOf({ jobId: '   ' }), '');
});
