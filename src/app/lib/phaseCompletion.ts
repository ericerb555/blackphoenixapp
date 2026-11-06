/**
 * Which phases of the job are finished, and which draws that makes due.
 *
 * Eric: "we can set payment schedules with completion of certain phases."
 *
 * The schedule already draws one invoice per phase and each draw already
 * carries a `trigger` saying what has to have happened first — "on
 * completion of Framing". That sentence was the only thing connecting a
 * draw to the work. Nothing anywhere recorded whether Framing was actually
 * finished, so the trigger was a note to a human and the schedule could not
 * tell a draw that was due from one that was months away.
 *
 * This is the missing fact: a completion date per phase, and the reading of
 * it that says whether a draw has come due.
 *
 * COMPLETION LIVES ON THE PHASE, NOT ON THE DRAW
 *
 * It is a fact about the job — the framing is up — not about the invoice.
 * Putting it on the draw would lose it the moment the schedule is rebuilt,
 * which happens whenever the quote is re-priced, and "we rebuilt the
 * schedule and forgot which phases were done" is a bad afternoon.
 *
 * IT MARKS A DRAW DUE. IT DOES NOT RAISE ONE.
 *
 * Deliberately. Invoicing a customer is an outward act with their money in
 * it, and it stays a decision somebody makes. What this removes is having
 * to hold in your head which phases are finished while reading a list of
 * draws.
 *
 * Nor does it BLOCK raising a draw early. Part-billing a phase that is
 * nearly done, or taking a payment ahead of schedule because a customer
 * offered, are ordinary things in this trade. An unfinished phase makes its
 * draw look premature; it does not make it impossible.
 */

/** A process step, in the shape the quote stores them. */
export interface CompletableStep {
  id?: string;
  title?: string;
  step?: string;
  completedAt?: string | null;
  [key: string]: any;
}

const nameOf = (step: CompletableStep): string =>
  String(step?.title ?? step?.step ?? '').trim();

/** Phase name → when it was finished, for the phases that are. */
export function completionMap(steps: CompletableStep[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const step of Array.isArray(steps) ? steps : []) {
    const name = nameOf(step);
    const at = String(step?.completedAt ?? '').trim();
    if (name && at) out.set(name, at);
  }
  return out;
}

/** Is this phase finished? */
export function isPhaseComplete(steps: CompletableStep[], phase: string | null | undefined): boolean {
  const name = String(phase ?? '').trim();
  if (!name) return false;
  return completionMap(steps).has(name);
}

/**
 * Mark a phase finished, or unfinished, returning new steps.
 *
 * Mutates nothing. Passing null clears the date, because marking the wrong
 * phase complete has to be undoable — it is one click and it changes what
 * the schedule says you may bill.
 */
export function withPhaseCompletion(
  steps: CompletableStep[],
  phase: string,
  completedAt: string | null,
): CompletableStep[] {
  const target = String(phase ?? '').trim();
  return (Array.isArray(steps) ? steps : []).map((step) =>
    nameOf(step) === target ? { ...step, completedAt } : step,
  );
}

export interface DrawReadiness {
  /** True when nothing is standing between this draw and being raised. */
  ready: boolean;
  /** Short state for the badge. */
  state: 'due' | 'waiting' | 'raised' | 'paid';
  /** A sentence for the row, in the words somebody would use out loud. */
  note: string;
}

/**
 * Whether a draw has come due, given what is finished.
 *
 * A draw with no phase — the deposit, and the single-balance fallback for a
 * job with no phase structure — is never "waiting". The deposit is due on
 * signing and has nothing to complete, so treating it as blocked would put
 * a permanent false warning on the one draw that is always collectable.
 */
export function drawReadiness(
  draw: { phase?: string | null; status?: string; type?: string },
  steps: CompletableStep[],
): DrawReadiness {
  if (draw?.status === 'paid') return { ready: false, state: 'paid', note: 'Paid.' };
  if (draw?.status === 'invoiced') return { ready: false, state: 'raised', note: 'Invoice raised.' };

  const phase = String(draw?.phase ?? '').trim();
  if (!phase) {
    return { ready: true, state: 'due', note: 'Due on signing — nothing to complete first.' };
  }

  const done = completionMap(steps).get(phase);
  if (done) {
    const when = done.slice(0, 10);
    return { ready: true, state: 'due', note: `${phase} completed ${when} — ready to invoice.` };
  }
  return { ready: false, state: 'waiting', note: `Waiting on ${phase} being marked complete.` };
}

/** How many draws are sitting ready to be raised. */
export function dueCount(
  draws: Array<{ phase?: string | null; status?: string }>,
  steps: CompletableStep[],
): number {
  return (Array.isArray(draws) ? draws : [])
    .filter((d) => drawReadiness(d, steps).state === 'due').length;
}
