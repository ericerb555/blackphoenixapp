/**
 * Reading a scheduled job's state, for the automation screen.
 *
 * WHY THIS IS A .ts AND NOT PART OF THE PANEL
 *
 * It decides whether a clock is reported as healthy, and the test runner
 * strips types from `.ts` only — logic living in a `.tsx` cannot be checked by
 * hand. A screen that calls a stopped clock "running" is worse than no screen,
 * so this is exactly the kind of judgement that should be pinned by tests.
 *
 * THE TRAP THIS FILE EXISTS TO AVOID
 *
 * pg_cron records a job as `succeeded` when its SQL ran. The SQL in every one
 * of our jobs is `net.http_post`, which only QUEUES a request — so `succeeded`
 * means "we asked", not "anybody answered". On 2026-10-13 an on-call
 * escalation request timed out after five seconds and pg_cron recorded the run
 * as a success; the only trace was a null status code in `net._http_response`,
 * which nothing watched. See
 * `supabase/migrations/20261013150000_cron_jobs_explicit_timeout.sql`.
 *
 * So `clockHealth` never reports "fine" on the strength of the status alone. It
 * judges on WHEN THE JOB LAST RAN against how often it is supposed to, and the
 * screen reports delivery separately.
 */

export interface ClockRow {
  jobname: string;
  schedule: string;
  active: boolean;
  last_run_at: string | null;
  last_status: string | null;
  runs_24h: number;
  failed_24h: number;
}

/**
 * How many minutes should pass between runs, or null for a schedule this does
 * not understand.
 *
 * Deliberately not a full cron parser. Our six jobs use four shapes between
 * them, and a half-written parser that silently mis-reads a day-of-week field
 * would produce confident wrong staleness. Anything outside these shapes
 * returns null and the screen declines to judge it rather than guessing.
 */
export function intervalMinutes(schedule: string): number | null {
  const fields = String(schedule || '').trim().split(/\s+/);
  if (fields.length !== 5) return null;
  const [minute, hour, dom, month, dow] = fields;

  // Anything restricting the date is beyond what this reads.
  if (dom !== '*' || month !== '*' || dow !== '*') return null;

  const everyN = (field: string): number | null => {
    const match = /^\*\/(\d{1,4})$/.exec(field);
    if (!match) return null;
    const n = Number(match[1]);
    return n > 0 ? n : null;
  };

  if (minute === '*') {
    // Every minute of every hour, or every minute of some hours — the second
    // is not a shape we use and not one to guess at.
    return hour === '*' ? 1 : null;
  }

  const minuteStep = everyN(minute);
  if (minuteStep !== null) return hour === '*' ? minuteStep : null;

  // A fixed minute. Which hours decides whether that is hourly or daily.
  if (!/^\d{1,2}$/.test(minute)) return null;
  if (hour === '*') return 60;
  const hourStep = everyN(hour);
  if (hourStep !== null) return hourStep * 60;
  if (/^\d{1,2}$/.test(hour)) return 1440;
  return null;
}

/** The schedule in words, for somebody who does not read cron. */
export function scheduleInWords(schedule: string): string {
  const every = intervalMinutes(schedule);
  if (every === null) return String(schedule || 'unknown schedule');
  if (every === 1) return 'every minute';
  if (every < 60) return `every ${every} minutes`;
  if (every === 60) return 'every hour';
  if (every < 1440) return `every ${every / 60} hours`;
  if (every === 1440) return 'once a day';
  return `every ${Math.round(every / 1440)} days`;
}

/**
 * How late a run is allowed to be before the screen calls it stopped.
 *
 * Three missed runs, which follows the store watchdog's reasoning — it treats
 * an hour of silence on a fifteen-minute schedule as wrong rather than quiet —
 * but never more than a day beyond due, because "three missed runs" on a daily
 * job would be three days of silence before anybody was told.
 *
 * The five-minute floor is for the every-minute job: a single tick landing a
 * few seconds late is not news.
 */
export function allowanceMinutes(everyMinutes: number): number {
  return Math.max(5, Math.min(everyMinutes * 3, everyMinutes + 1440));
}

export type ClockStatus = 'never-ran' | 'paused' | 'late' | 'running' | 'unknown-schedule';

export interface ClockHealth {
  status: ClockStatus;
  /** A sentence for the screen. Says what is true, not what to feel about it. */
  why: string;
  minutesSinceLastRun: number | null;
  everyMinutes: number | null;
}

/**
 * Is this clock running?
 *
 * The order of the checks is the order of the questions. Switched off comes
 * first because a paused job is not a broken one and must not be reported as
 * late; never-ran comes before late because "the schedule was never right" and
 * "it ran and then stopped" are different problems with different fixes, and
 * collapsing them sends somebody to the wrong place.
 */
export function clockHealth(row: ClockRow, now: number = Date.now()): ClockHealth {
  const everyMinutes = intervalMinutes(row?.schedule || '');
  const lastRun = row?.last_run_at ? Date.parse(row.last_run_at) : NaN;
  const minutesSince = Number.isFinite(lastRun)
    ? Math.max(0, Math.round((now - lastRun) / 60_000))
    : null;

  if (row?.active === false) {
    return {
      status: 'paused',
      why: 'Switched off. It will not run until somebody schedules it again.',
      minutesSinceLastRun: minutesSince,
      everyMinutes,
    };
  }

  if (minutesSince === null) {
    return {
      status: 'never-ran',
      why: 'Scheduled but has never run once. The schedule itself is wrong, or pg_cron is not armed.',
      minutesSinceLastRun: null,
      everyMinutes,
    };
  }

  if (everyMinutes === null) {
    return {
      status: 'unknown-schedule',
      why: `Last ran ${describeAge(minutesSince)}. This screen does not read that schedule, so it cannot say whether that is late.`,
      minutesSinceLastRun: minutesSince,
      everyMinutes: null,
    };
  }

  const allowance = allowanceMinutes(everyMinutes);
  if (minutesSince > allowance) {
    return {
      status: 'late',
      why: `Due ${scheduleInWords(row.schedule)} and last ran ${describeAge(minutesSince)}. It has stopped.`,
      minutesSinceLastRun: minutesSince,
      everyMinutes,
    };
  }

  return {
    status: 'running',
    // Says only that the schedule is firing. Whether anything ANSWERED is a
    // separate question the screen reports separately — see the note at the top.
    why: `Firing ${scheduleInWords(row.schedule)}; last ran ${describeAge(minutesSince)}.`,
    minutesSinceLastRun: minutesSince,
    everyMinutes,
  };
}

/** "4 minutes ago", "2 hours ago", "3 days ago". */
export function describeAge(minutes: number | null): string {
  if (minutes === null) return 'never';
  if (minutes < 1) return 'just now';
  if (minutes === 1) return 'a minute ago';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours === 1) return 'an hour ago';
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'a day ago' : `${days} days ago`;
}

/**
 * One sentence for the whole set, for the top of the screen.
 *
 * Reports the worst thing that is true. A summary that averages six clocks
 * into "mostly fine" is how a stopped one goes unnoticed.
 */
export function fleetSummary(rows: ClockRow[], now: number = Date.now()): {
  tone: 'bad' | 'warn' | 'good' | 'none';
  text: string;
} {
  const list = Array.isArray(rows) ? rows : [];
  if (list.length === 0) {
    return { tone: 'none', text: 'No scheduled jobs exist. Nothing in this business runs on its own.' };
  }

  const health = list.map((row) => clockHealth(row, now));
  const stopped = health.filter((h) => h.status === 'late' || h.status === 'never-ran').length;
  const paused = health.filter((h) => h.status === 'paused').length;
  const running = health.filter((h) => h.status === 'running').length;

  if (stopped > 0) {
    return {
      tone: 'bad',
      text: `${stopped} of ${list.length} scheduled ${stopped === 1 ? 'job has' : 'jobs have'} stopped.`,
    };
  }
  if (paused > 0) {
    return {
      tone: 'warn',
      text: `${running} of ${list.length} running; ${paused} switched off.`,
    };
  }
  return { tone: 'good', text: `All ${list.length} scheduled jobs are firing on time.` };
}
