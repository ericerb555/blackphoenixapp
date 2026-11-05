/**
 * Every priced line answers to a phase of the job, or we know it does not.
 *
 * Eric: "we should really make sure our ai quotings is breaking everything
 * down in the the processes of the job like set-up and all that is for the
 * certain job, then demo or prep, then all the next process pertaining to a
 * job until the end."
 *
 * WHY A PROMPT IS NOT ENOUGH
 *
 * The estimator prompt already demands that every material and labour line
 * carry the EXACT `step` string of its phase. A prompt is a request. The
 * model returns "Demolition" where the step is "Demolition and strip-out",
 * or "Set up" for "Set-up and site protection", and the line then matches no
 * phase at all — `groupLinesByPhase` drops it into a loose "Additional
 * items" group at the bottom of the document.
 *
 * Nothing looked. A quote could come back with half its money in that
 * trailing group and the only symptom was a customer asking what the
 * untitled section at the end was. The whole per-phase breakdown — the
 * document, the phase subtotals, the payment schedule that draws one invoice
 * per phase — rests on that one string matching, and it was unchecked.
 *
 * So this is deterministic repair, not more prompting. It runs after the
 * model answers and before anything is stored.
 *
 * IT NEVER GUESSES INTO A WRONG PHASE
 *
 * A line billed against the wrong phase is worse than one in "Additional
 * items": the payment schedule draws per phase, so a misfiled line invoices
 * the customer at the wrong milestone — real money at the wrong time, and
 * invisible, because the document looks perfectly tidy. An unmatched line is
 * merely untidy and obvious.
 *
 * Matching therefore runs strongest-first and stops at the first confident
 * answer. Anything below that confidence is LEFT ALONE and counted, so the
 * caller can log how badly the model did rather than quietly absorbing it.
 *
 * NO IMPORTS, SO IT CAN BE TESTED
 *
 * Same reason as `quoteMargins.ts` and `quotePdfSelection.ts`: this decides
 * where money appears on a document, the assembler is a `.tsx` the test
 * runner cannot load, and arithmetic nobody can test is how this project
 * shipped 40% overhead on every repriced quote.
 */

export interface PhaseStepLike {
  step?: string;
  title?: string;
  description?: string;
  estimatedDuration?: string;
  trade?: string;
}

export interface PhasedLineLike {
  phase?: string;
  [key: string]: any;
}

export interface PhasePlanReport {
  /** Phase names, in the order the job runs them. */
  order: string[];
  /** Lines whose phase string was repaired onto a real step. */
  snapped: number;
  /** Lines left with a phase that matches no step — they will group loose. */
  unmatched: string[];
  /** Lines that arrived with no phase at all. */
  untagged: number;
}

/**
 * A phase name reduced to what it is actually saying.
 *
 * Lower-cased, punctuation and connecting words dropped, then RUN TOGETHER.
 *
 * The spaces come out because the gap between "setup" and "set-up" is the
 * commonest way the model's phase string misses: it writes "Setup and site
 * protection" where the step says "Set-up and site protection", and a
 * word-wise comparison calls those two different phases. Run together, both
 * are "setupsiteprotection". It fixes "rough-in" against "rough in" for the
 * same reason.
 *
 * Collisions between unrelated phases are not a realistic worry: two names
 * made of the same letters in the same order, differing only in spacing,
 * ARE the same phase.
 */
export function normalisePhase(name: unknown): string {
  return words(name).replace(/ /g, '');
}

/** The words of a phase name, still separated. */
function words(name: unknown): string {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[‐-―]/g, '-')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(and|the|a|an|of|to|for|phase|stage|step)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The significant words of a phase name. */
function tokens(name: string): string[] {
  const n = words(name);
  return n ? n.split(' ').filter((t) => t.length > 2) : [];
}

/**
 * Which step this line's phase string means, or null if we cannot be sure.
 *
 * Four passes, each weaker than the last, stopping at the first hit:
 *
 *   1  exact string                     "Framing" -> "Framing"
 *   2  normalised equal                 "set-up & site prep" -> "Set up and site prep"
 *   3  one normalised name contains the other, and the shorter is not a bare
 *      single short word — "Demolition" -> "Demolition and strip-out", but
 *      never "Prep" -> "Preparation of the slab" on three letters alone
 *   4  every significant word of one appears in the other
 *
 * Pass 3 and 4 only answer when EXACTLY ONE step qualifies. Two plausible
 * homes for a line is not a match, it is a coin toss, and a coin toss here
 * bills somebody at the wrong milestone.
 */
export function matchPhase(value: unknown, steps: string[]): string | null {
  const raw = String(value ?? '').trim();
  if (!raw || !steps.length) return null;

  const exact = steps.find((s) => s === raw);
  if (exact) return exact;

  const target = normalisePhase(raw);
  if (!target) return null;

  const equal = steps.filter((s) => normalisePhase(s) === target);
  if (equal.length === 1) return equal[0];
  if (equal.length > 1) return equal[0]; // identical names; the first is as good as any

  const contains = steps.filter((s) => {
    const n = normalisePhase(s);
    if (!n) return false;
    const [shorter, longer] = n.length <= target.length ? [n, target] : [target, n];
    // A very short fragment matches far too much to be trusted on its own.
    if (shorter.length < 5) return false;
    return longer.includes(shorter);
  });
  if (contains.length === 1) return contains[0];

  /**
   * The last pass needs BOTH names to carry more than one significant word.
   *
   * A single token is not evidence. "fix" is three letters of a word that
   * appears in "First fix plumbing", "Second fix plumbing" and half a price
   * book besides; matching on it would file the line against whichever phase
   * happened to be the only one containing it — exactly the silent misfiling
   * this function exists to refuse. A genuinely abbreviated single word like
   * "Demolition" is already caught by the containment pass above, which
   * demands five characters before it answers.
   */
  const want = tokens(raw);
  if (want.length > 1) {
    const covered = steps.filter((s) => {
      const have = tokens(s);
      if (have.length < 2) return false;
      return want.every((w) => have.includes(w)) || have.every((h) => want.includes(h));
    });
    if (covered.length === 1) return covered[0];
  }

  return null;
}

/**
 * The phase names of a job, in order, deduplicated.
 *
 * Order is the model's own sequence, which is the sequence the work happens
 * in — set-up, then demo or prep, then each trade through to clean and
 * handover. It is never sorted: a document that lists Framing before
 * Demolition because F precedes D is worse than no ordering at all.
 */
export function phaseOrderOf(steps: PhaseStepLike[]): string[] {
  const out: string[] = [];
  for (const s of Array.isArray(steps) ? steps : []) {
    const name = String(s?.step ?? s?.title ?? '').trim();
    if (name && !out.includes(name)) out.push(name);
  }
  return out;
}

/**
 * Snap every line onto a real phase, and report what could not be snapped.
 *
 * Mutates nothing: returns new line arrays. The report is the point as much
 * as the repair — a quote where nothing matched is a quote whose breakdown
 * is broken, and the caller logs it rather than shipping it silently.
 */
export function reconcilePhases<M extends PhasedLineLike, L extends PhasedLineLike>(
  steps: PhaseStepLike[],
  materials: M[],
  labor: L[],
): { materials: M[]; labor: L[]; report: PhasePlanReport } {
  const order = phaseOrderOf(steps);
  const report: PhasePlanReport = { order, snapped: 0, unmatched: [], untagged: 0 };

  const fix = <T extends PhasedLineLike>(lines: T[]): T[] =>
    (Array.isArray(lines) ? lines : []).map((line) => {
      const raw = String(line?.phase ?? '').trim();
      if (!raw) { report.untagged++; return line; }

      const hit = matchPhase(raw, order);
      if (!hit) {
        if (!report.unmatched.includes(raw)) report.unmatched.push(raw);
        return line;
      }
      if (hit === raw) return line;
      report.snapped++;
      return { ...line, phase: hit };
    });

  return { materials: fix(materials), labor: fix(labor), report };
}
