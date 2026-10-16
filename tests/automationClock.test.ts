/**
 * Whether a clock is reported as running.
 *
 * WHY THIS IS TESTED AND NOT JUST WRITTEN
 *
 * The screen exists because Eric asked how the automation was doing and the
 * answer was not available anywhere in the app. A screen that answers that
 * question wrongly — green lights over a stopped job — is worse than the
 * silence it replaced.
 *
 * The specific trap: pg_cron records `succeeded` when the SQL ran, and the SQL
 * only QUEUES an HTTP request. A job can read `succeeded` for a week while
 * every request times out. So health is judged on WHEN IT LAST RAN against how
 * often it is due, never on the status string, and the first test below pins
 * exactly that.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  intervalMinutes, scheduleInWords, allowanceMinutes, clockHealth, describeAge, fleetSummary,
  type ClockRow,
} from '../src/app/lib/automationClock.ts';

const NOW = Date.parse('2026-10-16T02:30:00Z');
const agoMinutes = (n: number) => new Date(NOW - n * 60_000).toISOString();

const row = (over: Partial<ClockRow> = {}): ClockRow => ({
  jobname: 'a-job',
  schedule: '*/15 * * * *',
  active: true,
  last_run_at: agoMinutes(5),
  last_status: 'succeeded',
  runs_24h: 96,
  failed_24h: 0,
  ...over,
});

/* ── the trap ────────────────────────────────────────────────────────────── */

test('a `succeeded` status does NOT make a stopped job healthy', () => {
  // The whole point. Every one of our jobs reports `succeeded` for a queued
  // request nobody answered.
  const h = clockHealth(row({ last_status: 'succeeded', last_run_at: agoMinutes(600) }), NOW);
  assert.equal(h.status, 'late');
});

test('a failed status does not make a job that is running on time look stopped', () => {
  // The converse: one bad run yesterday is not "currently stopped". The screen
  // reports failure counts separately.
  const h = clockHealth(row({ last_status: 'failed', last_run_at: agoMinutes(3) }), NOW);
  assert.equal(h.status, 'running');
});

/* ── reading our four schedule shapes ────────────────────────────────────── */

test('the four shapes our six jobs actually use', () => {
  assert.equal(intervalMinutes('* * * * *'), 1);        // on-call-escalation
  assert.equal(intervalMinutes('*/15 * * * *'), 15);    // store-cron-tick, autopilot-tick
  assert.equal(intervalMinutes('7 * * * *'), 60);       // store-watchdog, screening expiry
  assert.equal(intervalMinutes('0 12 * * *'), 1440);    // compliance-expiry-reminders
});

test('an hour step is read as hours', () => {
  assert.equal(intervalMinutes('0 */6 * * *'), 360);
});

test('a schedule restricting the date is refused rather than guessed', () => {
  // A half-written parser that read the day-of-week field as "*" would call a
  // Monday-only job daily, and then report it stopped for six days a week.
  assert.equal(intervalMinutes('0 12 * * 1'), null);
  assert.equal(intervalMinutes('0 12 1 * *'), null);
  assert.equal(intervalMinutes('0 12 * 3 *'), null);
});

test('malformed schedules are refused', () => {
  for (const bad of ['', '   ', '* * * *', '* * * * * *', 'every minute', '*/0 * * * *', 'x * * * *']) {
    assert.equal(intervalMinutes(bad), null, `should refuse ${JSON.stringify(bad)}`);
  }
});

test('an unreadable schedule means the screen declines to judge', () => {
  const h = clockHealth(row({ schedule: '0 12 * * 1', last_run_at: agoMinutes(10_000) }), NOW);
  assert.equal(h.status, 'unknown-schedule');
  assert.match(h.why, /does not read that schedule/);
});

/* ── words ───────────────────────────────────────────────────────────────── */

test('schedules read as English', () => {
  assert.equal(scheduleInWords('* * * * *'), 'every minute');
  assert.equal(scheduleInWords('*/15 * * * *'), 'every 15 minutes');
  assert.equal(scheduleInWords('7 * * * *'), 'every hour');
  assert.equal(scheduleInWords('0 */6 * * *'), 'every 6 hours');
  assert.equal(scheduleInWords('0 12 * * *'), 'once a day');
});

test('an unreadable schedule is shown as itself rather than mislabelled', () => {
  assert.equal(scheduleInWords('0 12 * * 1'), '0 12 * * 1');
});

/* ── how late is late ────────────────────────────────────────────────────── */

test('three missed runs, with a five minute floor and a one day ceiling', () => {
  assert.equal(allowanceMinutes(1), 5);        // floor: one late tick is not news
  assert.equal(allowanceMinutes(15), 45);
  assert.equal(allowanceMinutes(60), 180);
  assert.equal(allowanceMinutes(1440), 2880);  // ceiling: a day late, not three
});

test('a daily job is called stopped within two days, not six', () => {
  const daily = row({ schedule: '0 12 * * *' });
  assert.equal(clockHealth({ ...daily, last_run_at: agoMinutes(1500) }, NOW).status, 'running');
  assert.equal(clockHealth({ ...daily, last_run_at: agoMinutes(3000) }, NOW).status, 'late');
});

test('the every-minute job tolerates a few minutes and no more', () => {
  const minutely = row({ schedule: '* * * * *' });
  assert.equal(clockHealth({ ...minutely, last_run_at: agoMinutes(4) }, NOW).status, 'running');
  assert.equal(clockHealth({ ...minutely, last_run_at: agoMinutes(9) }, NOW).status, 'late');
});

/* ── the states that must not be collapsed ───────────────────────────────── */

test('never having run is its own state, not lateness', () => {
  // Different problem, different fix: the schedule was never right, versus it
  // ran and then stopped. Collapsing them sends somebody to the wrong place.
  const h = clockHealth(row({ last_run_at: null }), NOW);
  assert.equal(h.status, 'never-ran');
  assert.equal(h.minutesSinceLastRun, null);
});

test('switched off is reported as paused, never as late', () => {
  const h = clockHealth(row({ active: false, last_run_at: agoMinutes(100_000) }), NOW);
  assert.equal(h.status, 'paused');
});

test('switched off outranks never having run', () => {
  // A job somebody deliberately disabled before it ever ran is paused, and
  // telling them it is broken would send them to fix a decision they made.
  assert.equal(clockHealth(row({ active: false, last_run_at: null }), NOW).status, 'paused');
});

test('an unparseable timestamp is never-ran rather than an epoch-old job', () => {
  assert.equal(clockHealth(row({ last_run_at: 'not a date' }), NOW).status, 'never-ran');
});

test('a run in the future does not produce a negative age', () => {
  const h = clockHealth(row({ last_run_at: new Date(NOW + 60_000).toISOString() }), NOW);
  assert.equal(h.minutesSinceLastRun, 0);
  assert.equal(h.status, 'running');
});

/* ── ages in words ───────────────────────────────────────────────────────── */

test('ages read as English', () => {
  assert.equal(describeAge(null), 'never');
  assert.equal(describeAge(0), 'just now');
  assert.equal(describeAge(1), 'a minute ago');
  assert.equal(describeAge(42), '42 minutes ago');
  assert.equal(describeAge(60), 'an hour ago');
  assert.equal(describeAge(300), '5 hours ago');
  assert.equal(describeAge(1440), 'a day ago');
  assert.equal(describeAge(4320), '3 days ago');
});

/* ── the one sentence at the top ─────────────────────────────────────────── */

test('no jobs at all says so, rather than reporting health', () => {
  const s = fleetSummary([], NOW);
  assert.equal(s.tone, 'none');
  assert.match(s.text, /Nothing in this business runs on its own/);
});

test('one stopped job outranks five healthy ones', () => {
  // A summary that averages six clocks into "mostly fine" is how a stopped one
  // goes unnoticed, which is the failure this screen exists to prevent.
  const rows = [
    row({ jobname: 'a' }), row({ jobname: 'b' }), row({ jobname: 'c' }),
    row({ jobname: 'd' }), row({ jobname: 'e' }),
    row({ jobname: 'stopped', last_run_at: agoMinutes(5000) }),
  ];
  const s = fleetSummary(rows, NOW);
  assert.equal(s.tone, 'bad');
  assert.match(s.text, /1 of 6 scheduled job has stopped/);
});

test('a job that never ran counts as stopped in the summary', () => {
  const s = fleetSummary([row({ last_run_at: null })], NOW);
  assert.equal(s.tone, 'bad');
});

test('paused jobs are a warning, not a failure', () => {
  const s = fleetSummary([row(), row({ jobname: 'off', active: false })], NOW);
  assert.equal(s.tone, 'warn');
  assert.match(s.text, /1 switched off/);
});

test('all firing reads as all firing', () => {
  const s = fleetSummary([row(), row({ jobname: 'b' })], NOW);
  assert.equal(s.tone, 'good');
  assert.match(s.text, /All 2 scheduled jobs are firing on time/);
});

test('a non-array is treated as no jobs rather than throwing', () => {
  assert.equal(fleetSummary(null as any, NOW).tone, 'none');
});

/* ── the six real jobs, as production has them ───────────────────────────── */

test('the six jobs in production all read as running', () => {
  // Taken from automation_clocks() on 2026-10-16: every one firing, zero
  // failures in 24h. If this ever fails, the reader has drifted from the
  // schedules actually in the database.
  const production: ClockRow[] = [
    { jobname: 'autopilot-tick', schedule: '*/15 * * * *', active: true, last_run_at: agoMinutes(15), last_status: 'succeeded', runs_24h: 96, failed_24h: 0 },
    { jobname: 'compliance-expiry-reminders', schedule: '0 12 * * *', active: true, last_run_at: agoMinutes(870), last_status: 'succeeded', runs_24h: 1, failed_24h: 0 },
    { jobname: 'on-call-escalation', schedule: '* * * * *', active: true, last_run_at: agoMinutes(3), last_status: 'succeeded', runs_24h: 1440, failed_24h: 0 },
    { jobname: 'screening-invitation-expiry', schedule: '7 * * * *', active: true, last_run_at: agoMinutes(23), last_status: 'succeeded', runs_24h: 24, failed_24h: 0 },
    { jobname: 'store-cron-tick', schedule: '*/15 * * * *', active: true, last_run_at: agoMinutes(15), last_status: 'succeeded', runs_24h: 96, failed_24h: 0 },
    { jobname: 'store-watchdog', schedule: '7 * * * *', active: true, last_run_at: agoMinutes(23), last_status: 'succeeded', runs_24h: 24, failed_24h: 0 },
  ];
  for (const job of production) {
    assert.equal(clockHealth(job, NOW).status, 'running', `${job.jobname} should read as running`);
  }
  assert.equal(fleetSummary(production, NOW).tone, 'good');
});
