/**
 * Renaming a phase, everywhere it is written down.
 *
 * WHY THIS IS NOT A ONE-LINE EDIT
 *
 * A phase has no id. Every part of the system that refers to one refers to it
 * by its TITLE, as a string:
 *
 *   processSteps[].title     the phase itself
 *   materials[].phase        which stage this material belongs to
 *   labor[].phase            the same, for hours
 *   paymentSchedule[].phase  which milestone releases this draw
 *
 * So editing the title on a process step renamed exactly one of those four,
 * and silently cut the other three loose:
 *
 *   - the lines keep the OLD name, so they group under a phase that is no
 *     longer a step. `phaseOptions` builds itself from both sources, so the
 *     By-process tab shows the renamed step EMPTY next to a ghost group
 *     holding all the money — and an empty process is precisely the fault
 *     that tab exists to surface.
 *   - the draw keeps the OLD name too, and `isPhaseComplete` resolves a
 *     draw by looking its phase up among the steps. After a rename there is
 *     no such step, so **the draw can never become due**. Marking the
 *     renamed phase finished does nothing. That is the serious one: it is
 *     money that cannot be invoiced, and nothing anywhere says why.
 *
 * None of it throws, nothing is lost, and the totals still add up — which is
 * why it would be found by a customer asking why they were never billed for
 * second fix, rather than by anybody here.
 *
 * WHAT IS DELIBERATELY NOT REWRITTEN
 *
 * A draw's `label` and `trigger` are rewritten ONLY when they still hold the
 * exact text `buildPaymentSchedule` generates for that title. Both are
 * customer-facing and both are editable, so anything a human has touched is
 * left alone — a rename is not a licence to overwrite someone's wording on a
 * document that has possibly already been sent.
 *
 * ON COLLISIONS
 *
 * Renaming A to a name B that already exists MERGES them: the lines and
 * draws of A join B, because grouping is by name and two phases cannot share
 * one. That is the honest consequence of a title being the identity, and it
 * is what the person typing asked for. The caller should apply this on a
 * COMMITTED value — on blur, not per keystroke — or a title typed through a
 * collision on its way somewhere else would merge two phases in passing and
 * not unmerge them.
 */

/** Trim and compare the way every consumer of a phase name already does. */
const norm = (value: unknown): string => String(value ?? '').trim();

/** The title of a process step, whichever key this quote shape uses. */
const titleOf = (step: any): string => norm(step?.title ?? step?.step);

/**
 * Rename a phase across a quote, returning a new quote.
 *
 * Mutates nothing. Returns the SAME object when there is nothing to do, so a
 * caller can use the result directly in state without forcing a render for a
 * rename that did not happen.
 */
export function renamePhase(quote: any, from: unknown, to: unknown): any {
  const before = norm(from);
  const after = norm(to);
  if (!quote || !before || !after || before === after) return quote;

  const retag = (rows: any) =>
    Array.isArray(rows)
      ? rows.map((row: any) => (norm(row?.phase) === before ? { ...row, phase: after } : row))
      : rows;

  const steps = Array.isArray(quote.processSteps)
    ? quote.processSteps.map((step: any) => {
        if (titleOf(step) !== before) return step;
        // Written back under the key this step already uses, so a quote
        // shaped with `step` does not silently grow a `title`.
        return step?.title !== undefined
          ? { ...step, title: after }
          : { ...step, step: after };
      })
    : quote.processSteps;

  const draws = Array.isArray(quote.paymentSchedule)
    ? quote.paymentSchedule.map((draw: any) => {
        if (norm(draw?.phase) !== before) return draw;
        const next: any = { ...draw, phase: after };
        // Only the generated wording. See the note above.
        if (norm(draw?.label) === before) next.label = after;
        if (norm(draw?.trigger) === `On completion of ${before.toLowerCase()}`) {
          next.trigger = `On completion of ${after.toLowerCase()}`;
        }
        return next;
      })
    : quote.paymentSchedule;

  return {
    ...quote,
    processSteps: steps,
    materials: retag(quote.materials),
    labor: retag(quote.labor),
    paymentSchedule: draws,
  };
}

/**
 * Every phase name a quote currently refers to, from both sources.
 *
 * Useful for telling a caller whether a rename is about to merge into an
 * existing phase, which is worth warning somebody about before it happens.
 */
export function phaseNamesOf(quote: any): string[] {
  const out: string[] = [];
  const push = (value: unknown) => {
    const name = norm(value);
    if (name && !out.includes(name)) out.push(name);
  };
  for (const step of (Array.isArray(quote?.processSteps) ? quote.processSteps : [])) {
    push(titleOf(step));
  }
  for (const row of [
    ...(Array.isArray(quote?.materials) ? quote.materials : []),
    ...(Array.isArray(quote?.labor) ? quote.labor : []),
  ]) {
    push(row?.phase);
  }
  return out;
}

/**
 * Would this rename land on a phase that already exists?
 *
 * Asked BEFORE the rename, so the answer is about the other phases rather
 * than about the one being renamed.
 */
export function wouldMerge(quote: any, from: unknown, to: unknown): boolean {
  const before = norm(from);
  const after = norm(to);
  if (!before || !after || before === after) return false;
  return phaseNamesOf(quote).some((name) => name !== before && name === after);
}
