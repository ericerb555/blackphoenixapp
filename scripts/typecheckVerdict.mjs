/**
 * Reading a typecheck run, in a way a syntax error cannot flatter.
 *
 * `tasks/found-not-fixed.md`: "The typecheck ratchet reads a syntax error as an
 * improvement."
 *
 * THE FAULT, MEASURED 2026-11-14
 *
 * The ratchet compared the NUMBER of findings against a baseline and passed
 * whenever the number did not rise. A stray backtick in a template literal in
 * `growth-marketing.tsx` took the server count from 82 to 3, and `precommit`
 * reported "typecheck ok — server 3 (under baseline)" and passed all five
 * checks. The file did not compile. The number went the right way, so the
 * ratchet applauded.
 *
 * It is worse than a missed error. The ratchet's own note invites you to lower
 * the baseline when a count comes in below it — so the next step was to write
 * 3 into the baseline file and lock 82 real findings permanently out of view.
 *
 * WHY COUNTING CANNOT SEE THIS
 *
 * Because `tsc` stops analysing a file it cannot parse. The semantic errors it
 * was holding against that file do not get reported as fixed; they simply never
 * get computed. A smaller number means either "somebody fixed things" or "I
 * looked at less", and a count alone cannot tell those apart.
 *
 * SO THE CLASS IS CHECKED, NOT ONLY THE COUNT
 *
 * TS1xxx is TypeScript's syntax range — unterminated literals, stray brackets,
 * the things that stop a parse. One of those means the rest of the check did
 * not happen, so it fails outright no matter what the totals say.
 *
 * AND A COLLAPSE IS TREATED AS SUSPICIOUS RATHER THAN CELEBRATED
 *
 * The syntax check catches the known cause. The collapse check catches the ones
 * nobody has met yet — a config that stopped matching files, an exclude that
 * grew, a half that silently checked nothing. Real cleanups take errors off one
 * and two at a time; half the backlog disappearing in one change is a claim
 * worth making deliberately rather than accepting quietly.
 *
 * This is the guard that should have caught the lost backslash in
 * `/^Bearers+/i` on 2026-11-17 — a signed-in owner told to sign in, because an
 * edit through a shell ate an escape. It would not have: that was valid syntax
 * and a valid regex. Which is the point of saying what a guard does NOT cover,
 * so nobody reads a green tick as more than it is.
 */

/**
 * TypeScript's TS1xxx range: the grammatical complaints.
 *
 * Most of them stop the parse — an unterminated literal, a missing brace — and
 * those are the ones that make a count meaningless, because `tsc` reports
 * nothing further about a file it could not read.
 *
 * A few do not. TS1345 ("an expression of type void cannot be tested for
 * truthiness") is a grammar rule applied to a file that parsed perfectly well.
 * The whole range is still failed on rather than an enumerated subset of it,
 * for two reasons: enumerating the parse-stopping codes means maintaining a
 * list against a compiler that adds to it, and getting that list wrong fails
 * open — the error class this exists to catch would be the one missed. And the
 * range is tiny in practice. It found exactly one instance across this entire
 * repository on the day it was written, which was a real defect worth fixing.
 */
const SYNTAX = /error TS1\d{3}:/;

/**
 * How far a count may fall in one change before it is treated as a collapse
 * rather than a cleanup.
 *
 * Half. Chosen to sit far above any plausible real cleanup — the largest
 * deliberate reduction in this repository's history is a few dozen against a
 * backlog of hundreds — and far below the collapse that was actually measured,
 * which was 96%.
 */
const COLLAPSE_FRACTION = 0.5;

/** Counts are only meaningful above this; a small backlog can legitimately empty. */
const COLLAPSE_FLOOR = 20;

/**
 * What a typecheck run means.
 *
 * `output` is the raw text of `npm run typecheck`, which carries both the
 * per-config summary lines and the individual `error TSxxxx` lines.
 *
 * Returns problems (which must fail the run) and movements (which are notes).
 * Nothing here exits or prints: the decision is separated from the reporting so
 * it can be tested without running a compiler.
 */
export function typecheckVerdict(output, baseline, opts = {}) {
  const text = String(output || '');
  const allowForSyntax = Boolean(opts.allowSyntaxErrors);

  const counts = {};
  for (const m of text.matchAll(/^\s{2}(app|server)\s+(?:(\d+) findings?|DID NOT RUN)\s*$/gm)) {
    counts[m[1]] = m[2] === undefined ? null : Number(m[2]);
  }

  const problems = [];
  const movements = [];

  /*
   * THE SYNTAX CHECK COMES FIRST, and is independent of every count.
   *
   * A file that will not parse makes the totals meaningless in the direction
   * that looks like success, so this is not a finding to be weighed against a
   * baseline — it is a statement that the measurement did not happen.
   */
  const syntaxLines = text.split('\n').filter((l) => SYNTAX.test(l));
  if (syntaxLines.length && !allowForSyntax) {
    const files = [...new Set(syntaxLines.map((l) => l.split('(')[0].trim()))].slice(0, 5);
    problems.push(
      `${syntaxLines.length} SYNTAX error(s) (TS1xxx) in ${files.join(', ')}`
      + ' — tsc stops analysing a file it cannot parse, so the counts below are'
      + ' not a measurement of anything. Fix the parse error and run again.',
    );
  }

  for (const [half, allowed] of Object.entries(baseline || {})) {
    const found = counts[half];
    if (found === undefined) {
      problems.push(`${half}: no count in the output`);
      continue;
    }
    if (found === null) {
      problems.push(`${half}: tsc DID NOT RUN`);
      continue;
    }
    if (found > allowed) {
      problems.push(`${half}: ${found} findings, baseline ${allowed} — this change ADDED ${found - allowed}`);
      continue;
    }
    if (found === allowed) continue;

    const drop = allowed - found;
    const collapsed = allowed >= COLLAPSE_FLOOR && found < allowed * COLLAPSE_FRACTION;
    if (collapsed && !allowForSyntax) {
      /*
       * Reported as a problem, not a note. The one time this happened the run
       * passed and the advice on screen was to bake the collapse into the
       * baseline — so the failure has to be louder than the invitation.
       */
      problems.push(
        `${half}: ${found} findings against a baseline of ${allowed} — that is ${drop} fewer in`
        + ' one change. A real cleanup removes errors a few at a time; a collapse this size is'
        + ' usually tsc analysing LESS than before (a parse error, a config that stopped matching'
        + ' files, a widened exclude). Check it is genuine, then lower the baseline in the same'
        + ' commit. To proceed deliberately: PRECOMMIT_ALLOW_COLLAPSE=1.',
      );
      continue;
    }
    movements.push(`${half}: ${found} findings, baseline ${allowed} — ${drop} fewer, lower the baseline`);
  }

  return { counts, problems, movements, syntaxErrors: syntaxLines.length };
}
