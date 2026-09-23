/**
 * onCallEscalation — what a call is owed next, when nobody is watching.
 *
 * A rota is a promise with a clock in it: ring Dan, and if he has not answered
 * in ten minutes ring Ray, and if nobody answers at all put it out. Every part
 * of that after the first ring needs something to happen with no person
 * present, which is the one thing a request-driven server cannot do for itself.
 *
 * This module decides; the route acts; the scheduler asks. Keeping the decision
 * pure means the awkward cases — a call already answered, a rung paged twice, a
 * clock that jumped — can be proven rather than watched for.
 *
 * WHY IT IS CONSERVATIVE
 *
 * Every action it returns wakes somebody or broadcasts somebody's emergency to
 * other contractors. So it returns `none` for anything it is not certain about:
 * a call whose paging state it cannot read, a rung with no recorded time, an
 * outcome that was never a rota. Doing nothing is recoverable by a person
 * looking at the screen. Ringing the wrong people at three in the morning, or
 * putting contracted work out to the open market, is not.
 */

export type DueAction =
  /** Ring the next rung of the rota. */
  | { action: 'page-next'; rung: number; reason: string }
  /** The rota is exhausted. It belongs to escalation now. */
  | { action: 'escalate'; reason: string }
  /** Nothing to do yet, or ever. */
  | { action: 'none'; reason: string };

export interface CallShape {
  status?: string;
  outcome?: string;
  bidRequestId?: string | null;
  plan?: {
    outcome?: string;
    steps?: Array<{ waitMinutes?: number; contacts?: any[] }>;
    next?: { platform?: boolean; exchange?: boolean };
  };
  paging?: {
    rung?: number;
    lastPagedAt?: string;
  };
  createdAt?: string;
}

const minutes = (ms: number) => ms / 60_000;

/**
 * What this call is owed, at this moment.
 *
 * `now` is passed rather than read, so the whole clock can be moved in a test
 * instead of waiting ten minutes to find out whether the second rung fires.
 */
export function dueAction(call: CallShape, now: Date = new Date()): DueAction {
  if (!call) return { action: 'none', reason: 'no call' };

  /**
   * Answered or closed stops everything.
   *
   * This is the whole point of a rota: it ends when a person picks up. A
   * scheduler that kept climbing after somebody answered would ring the entire
   * rota for a problem already being dealt with, which is how people learn to
   * ignore it.
   */
  if (call.status && call.status !== 'open') {
    return { action: 'none', reason: `already ${call.status}` };
  }

  const outcome = call.plan?.outcome || call.outcome;
  if (outcome !== 'rota') {
    // Anything that was never a rota was decided when it came in and has
    // already gone wherever it was going.
    return { action: 'none', reason: `outcome is ${outcome || 'unknown'}, not a rota` };
  }

  const steps = call.plan?.steps || [];
  if (steps.length === 0) return { action: 'none', reason: 'no rota to climb' };

  const rung = Number(call.paging?.rung ?? -1);
  const lastPagedAt = call.paging?.lastPagedAt;

  /**
   * Never paged at all.
   *
   * The call was routed to a rota and the first ring did not happen — Twilio
   * was unconfigured, or every attempt failed. Climbing from here would skip
   * the person who should have been rung first, so this escalates instead:
   * somebody needs to know now, and the rota has already not worked.
   */
  if (rung < 0 || !lastPagedAt) {
    return {
      action: 'escalate',
      reason: 'the rota was never paged, so there is nothing to climb — escalating',
    };
  }

  const since = minutes(now.getTime() - new Date(lastPagedAt).getTime());
  if (!Number.isFinite(since)) {
    return { action: 'none', reason: 'the last page has no readable time' };
  }
  /**
   * A clock that went backwards.
   *
   * Rare and real — a record written by a machine whose time was wrong. Waiting
   * is the safe reading: the wait will elapse once the clocks agree.
   */
  if (since < 0) return { action: 'none', reason: 'the last page is in the future' };

  const wait = Number(steps[rung]?.waitMinutes) || 0;
  if (since < wait) {
    return {
      action: 'none',
      reason: `${Math.round(wait - since)} min left on rung ${rung + 1}`,
    };
  }

  const next = rung + 1;
  if (next < steps.length) {
    return {
      action: 'page-next',
      rung: next,
      reason: `rung ${rung + 1} has had ${Math.round(since)} of its ${wait} minutes with no answer`,
    };
  }

  return {
    action: 'escalate',
    reason: `the whole rota has been paged and nobody answered in ${Math.round(since)} minutes`,
  };
}

/**
 * Should escalation put this on the exchange?
 *
 * Read from the plan the routing made, never decided again here. An exclusive
 * contract and an in-hours request both say no, and they said so when the call
 * came in — a scheduler that re-derived it would be a third place holding an
 * opinion about the one rule that must not bend.
 */
export function escalationGoesToExchange(call: CallShape): boolean {
  if (call?.bidRequestId) return false;            // already there
  const outcome = call?.plan?.outcome || call?.outcome;
  if (outcome === 'contracted' || outcome === 'office-hours') return false;
  return call?.plan?.next?.exchange === true;
}

/**
 * A ceiling on how long a call stays in the scheduler's view.
 *
 * Without one, a call nobody ever closes is examined for ever and, worse,
 * could be acted on days later — a phone ringing at three in the morning about
 * a burst pipe from last Tuesday. Twelve hours is well past any rota and short
 * of absurd.
 */
export const STALE_AFTER_HOURS = 12;

export function isStale(call: CallShape, now: Date = new Date()): boolean {
  const started = new Date(String(call?.createdAt || '')).getTime();
  if (!Number.isFinite(started)) return false;
  return (now.getTime() - started) > STALE_AFTER_HOURS * 3_600_000;
}
