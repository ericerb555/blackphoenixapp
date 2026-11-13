/**
 * Every phase a line names is a stage of the job.
 *
 * THE FAULT THIS CLOSES
 *
 * The estimator writes a `phase` onto a material or labour line and does not
 * always add that phase to `processSteps`. Nothing notices, because every
 * consumer copes: `groupLinesByPhase` appends an unlisted phase after the
 * listed ones, the subtotals still reconcile, and the money is right.
 *
 * MEASURED on Q-2026-0002, 2026-11-13. Two phases — `Fixture Installation`
 * ($2,397.50) and `Wall Modifications` ($235.69) — were on the lines and in
 * neither case on the steps. Both were drawn after the six phases that had
 * steps, landed past a page break, and adding up the first page gave
 * $10,032.94 against a total of $12,666.13. Eric: "they still only add up to
 * 10,032.94 not 12666.13 why?"
 *
 * Nothing was lost. $2,633.19 of work was simply in the wrong part of the
 * document, reading as an appendix to a job it is in the middle of.
 *
 * WHERE EACH MISSING PHASE GOES
 *
 * Not at the end, which is what happens today and is the thing being fixed.
 * A phase with no step has no stated position, so the only evidence available
 * is the order the lines themselves were written: it is inserted immediately
 * after the step-phase that its first line follows. On the quote above that
 * puts Wall Modifications after Bench Construction and Fixture Installation
 * after Electrical Rough-In, which is where a builder would expect them.
 *
 * A phase whose first line precedes every known phase goes to the front, for
 * the same reason — that is where its evidence puts it.
 *
 * WHAT IT WILL NOT DO
 *
 * It never removes a step, never renames one, never reorders the steps that
 * already exist, and never invents a description. An added step carries the
 * phase name and nothing else, because the phase name is the only thing
 * anybody actually asserted. A paragraph written here would be a paragraph
 * about a job this module knows nothing about.
 *
 * It changes no money. `schedulePhasesOf` derives its draws from the LINES,
 * so a phase that already has lines already has a draw; this moves where that
 * draw appears in the order and not what it is worth.
 */

export interface PhaseStep {
  title?: string;
  step?: string;
  [key: string]: unknown;
}

const nameOfStep = (s: any): string => String(s?.title || s?.step || '').trim();
const nameOfLine = (l: any): string => String(l?.phase || '').trim();

/**
 * A line is only evidence of a stage if it is ON the quote.
 *
 * An excluded line is work somebody took off, and inventing a stage for it
 * would put a heading on the customer's document for something they are not
 * being charged for and will not be getting. `visible: false` is different —
 * that line IS charged, so its phase is real.
 */
const isIncluded = (l: any): boolean => l?.included !== false;

/** The lines in the order the document reads them: materials, then labour. */
function linesOf(quote: any): any[] {
  const materials = Array.isArray(quote?.materials) ? quote.materials : [];
  const labor = Array.isArray(quote?.labor) ? quote.labor : [];
  const additional = Array.isArray(quote?.additionalCosts) ? quote.additionalCosts : [];
  return [...materials, ...labor, ...additional].filter(isIncluded);
}

/** Phases named on a line and missing from the steps, in first-seen order. */
export function missingPhasesOf(quote: any): string[] {
  const known = new Set(
    (Array.isArray(quote?.processSteps) ? quote.processSteps : [])
      .map(nameOfStep)
      .filter(Boolean),
  );
  const missing: string[] = [];
  for (const line of linesOf(quote)) {
    const phase = nameOfLine(line);
    if (!phase || known.has(phase) || missing.includes(phase)) continue;
    missing.push(phase);
  }
  return missing;
}

export interface SyncResult {
  steps: PhaseStep[];
  /** The phases that had to be added, in the order they were added. */
  added: string[];
  changed: boolean;
}

/**
 * The quote's steps, with every phase its lines name present exactly once.
 *
 * Returns the ORIGINAL array when nothing is missing, so a caller can store
 * the result unconditionally without rewriting a record that was already
 * correct.
 */
export function syncQuotePhases(quote: any): SyncResult {
  const original: PhaseStep[] = Array.isArray(quote?.processSteps) ? quote.processSteps : [];
  const missing = missingPhasesOf(quote);
  if (!missing.length) return { steps: original, added: [], changed: false };

  const steps = [...original];
  const added: string[] = [];

  /**
   * Walk the lines once, remembering the last KNOWN phase seen. An unlisted
   * phase is inserted directly after it — the position its own lines imply.
   */
  const indexOf = (name: string) => steps.findIndex((s) => nameOfStep(s) === name);
  let anchor = -1; // index in `steps` of the last known phase encountered

  for (const line of linesOf(quote)) {
    const phase = nameOfLine(line);
    if (!phase) continue;

    const at = indexOf(phase);
    if (at >= 0) { anchor = at; continue; }
    if (added.includes(phase)) continue;

    const insertAt = anchor + 1;
    steps.splice(insertAt, 0, { title: phase });
    added.push(phase);
    /* The one just inserted becomes the anchor, so two consecutive new
       phases stay in the order their lines appeared rather than reversing. */
    anchor = insertAt;
  }

  /**
   * Renumber, because `stepNumber` is printed and a document that reads
   * 1, 2, 4 raises exactly the question a renumbering exists to avoid.
   * Only touched where it was already present.
   */
  let n = 0;
  const renumbered = steps.map((s) => {
    n += 1;
    return 'stepNumber' in (s || {}) || added.includes(nameOfStep(s))
      ? { ...s, stepNumber: n }
      : s;
  });

  return { steps: renumbered, added, changed: true };
}
