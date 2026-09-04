/**
 * How long is too long to be on the clock.
 *
 * WHY THIS IS NOT SIMPLY "PUNCH THEM OUT AT EIGHT"
 *
 * Because a ten-hour day is a normal day in construction, and a clock that
 * stops itself at eight records eight. The two hours do not become overtime to
 * approve — they stop existing, and the person who loses them is the one who
 * worked them. Silently shortening somebody's pay is a worse failure than a
 * forgotten punch-out, so nothing here ever does it.
 *
 * What it does instead: nudge at eight, and only at a much longer threshold
 * close the shift as a data-integrity backstop — marked, blocked from payroll,
 * and waiting for a person to enter the real end time. A shift still running at
 * sixteen hours is not a long day, it is a punch-out somebody forgot on their
 * way home.
 *
 * Kept pure and separate from the route because these two numbers decide what
 * lands on a paycheque, and a boundary error either nags people all afternoon
 * or lets a Friday punch run until Monday.
 */

/** Nudge from here on. A long day, but a real one. */
export const NUDGE_AFTER_HOURS = 8;

/** Past here it is not a shift any more. Closed, flagged, never submitted. */
export const AUTO_CLOSE_AFTER_HOURS = 16;

export type ShiftState = 'ok' | 'nudge' | 'auto-close';

export interface ShiftStatus {
  state: ShiftState;
  hoursOnClock: number;
  /** What to put in front of the employee, or empty when nothing is wrong. */
  message: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Where a running shift stands.
 *
 * `breakMinutes` is deducted, because time on the clock and time worked are
 * different things and the nudge should be about the latter — somebody who took
 * an hour for lunch has not done eight hours at eight and a half.
 */
export function shiftStatus(
  punchInIso: string,
  nowMs: number,
  breakMinutes = 0,
): ShiftStatus {
  const punchIn = Date.parse(punchInIso);
  if (!Number.isFinite(punchIn)) {
    return { state: 'ok', hoursOnClock: 0, message: '' };
  }

  const worked = round2(
    Math.max(0, (nowMs - punchIn) / 3_600_000 - Math.max(0, breakMinutes) / 60),
  );

  if (worked >= AUTO_CLOSE_AFTER_HOURS) {
    return {
      state: 'auto-close',
      hoursOnClock: worked,
      message: `This shift has been running ${Math.floor(worked)} hours. It has been closed `
        + 'and held back from payroll until somebody sets the real finish time.',
    };
  }

  if (worked >= NUDGE_AFTER_HOURS) {
    return {
      state: 'nudge',
      hoursOnClock: worked,
      message: `You have been on the clock ${Math.floor(worked)} hours. Punch out if you are done — `
        + 'if you are still working, carry on and this will ask again later.',
    };
  }

  return { state: 'ok', hoursOnClock: worked, message: '' };
}

/**
 * The shape an auto-closed entry takes.
 *
 * The punch-out time is a placeholder and is labelled as one. It exists so the
 * record is closed and the employee can start a new shift; it is explicitly not
 * a claim about when they finished, which is why `needsReview` blocks the entry
 * from payroll until a person corrects it.
 *
 * Recording the placeholder at the auto-close threshold rather than at "now"
 * matters: a shift discovered three days later must not read as a
 * seventy-two-hour day.
 */
export function autoClosePunchOut(punchInIso: string): string {
  const punchIn = Date.parse(punchInIso);
  const at = Number.isFinite(punchIn)
    ? punchIn + AUTO_CLOSE_AFTER_HOURS * 3_600_000
    : Date.now();
  return new Date(at).toISOString();
}

/** True when this entry must not reach payroll until a person has looked. */
export function blockedFromPayroll(entry: any): boolean {
  return Boolean(entry?.needsReview);
}

export function reviewReason(entry: any): string {
  if (!entry?.needsReview) return '';
  return entry.autoClosed
    ? `This shift ran past ${AUTO_CLOSE_AFTER_HOURS} hours and was closed automatically. `
      + 'The finish time on it is a placeholder — set the real one before sending it to payroll.'
    : 'This shift is flagged for review.';
}
