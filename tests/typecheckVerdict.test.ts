/**
 * The ratchet, and the thing that used to defeat it.
 *
 * `tasks/found-not-fixed.md`, measured 2026-11-14: a stray backtick in a
 * template literal took the server typecheck count from 82 to 3, and
 * `precommit` reported "typecheck ok — server 3 (under baseline)" and passed
 * all five checks. The file did not compile. The number went the right way, so
 * the ratchet applauded — and its own advice was then to write 3 into the
 * baseline, which would have locked 82 real findings out of view for good.
 *
 * The first test here is that exact scenario, as output text. If it ever passes
 * again, the guard is gone.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { typecheckVerdict } from '../scripts/typecheckVerdict.mjs';

const BASELINE = { app: 281, server: 82 };

/** The shape `typecheck.mjs` prints. */
const summary = (app: number | 'DID NOT RUN', server: number | 'DID NOT RUN') => [
  'typecheck',
  `  app      ${app === 'DID NOT RUN' ? 'DID NOT RUN' : `${app} findings`}`,
  `  server   ${server === 'DID NOT RUN' ? 'DID NOT RUN' : `${server} findings`}`,
].join('\n');

test('at baseline is a pass with nothing to say', () => {
  const v = typecheckVerdict(summary(281, 82), BASELINE);
  assert.deepEqual(v.problems, []);
  assert.deepEqual(v.movements, []);
});

test('added errors fail, and the message says how many', () => {
  const v = typecheckVerdict(summary(290, 82), BASELINE);
  assert.equal(v.problems.length, 1);
  assert.match(v.problems[0], /ADDED 9/);
});

test('THE 2026-11-14 COLLAPSE now fails instead of being applauded', () => {
  // A parse error in growth-marketing.tsx. Both signals are present: the
  // TS1xxx line, and the count falling off a cliff.
  const output = [
    'supabase/functions/server/growth-marketing.tsx(412,18): error TS1005: \'}\' expected.',
    summary(281, 3),
  ].join('\n');

  const v = typecheckVerdict(output, BASELINE);
  assert.ok(v.problems.length > 0, 'this must not pass');
  assert.ok(
    v.problems.some((p) => /SYNTAX/.test(p)),
    'the syntax error is the reason, and should be named as such',
  );
  assert.match(v.problems.find((p) => /SYNTAX/.test(p))!, /growth-marketing/);
  // And it must NOT be reported as an improvement worth baking in.
  assert.deepEqual(v.movements, []);
});

test('a syntax error fails even when every count is at baseline', () => {
  // The counts can look perfect while a file silently fails to parse — the
  // errors it was holding simply are not computed.
  const output = [
    'src/app/pages/Thing.tsx(10,3): error TS1128: Declaration or statement expected.',
    summary(281, 82),
  ].join('\n');
  const v = typecheckVerdict(output, BASELINE);
  assert.equal(v.syntaxErrors, 1);
  assert.ok(v.problems.some((p) => /SYNTAX/.test(p)));
});

test('ordinary semantic errors are not mistaken for syntax ones', () => {
  // TS2xxx is the normal backlog. Only the TS1xxx range stops a parse.
  const output = [
    "src/app/x.tsx(1,1): error TS2339: Property 'a' does not exist on type 'B'.",
    "src/app/y.tsx(2,2): error TS2322: Type 'string' is not assignable to type 'number'.",
    summary(281, 82),
  ].join('\n');
  const v = typecheckVerdict(output, BASELINE);
  assert.equal(v.syntaxErrors, 0);
  assert.deepEqual(v.problems, []);
});

test('a real cleanup is still welcomed, and told to lower the baseline', () => {
  // Errors come off a few at a time. That must stay frictionless or the guard
  // will be worked around.
  const v = typecheckVerdict(summary(275, 80), BASELINE);
  assert.deepEqual(v.problems, []);
  assert.equal(v.movements.length, 2);
  assert.match(v.movements[0], /lower the baseline/);
});

test('a collapse with no syntax error still fails, because tsc saw less', () => {
  // A config that stopped matching files, or a widened exclude. No parse error
  // to point at, and the same false "improvement".
  const v = typecheckVerdict(summary(281, 4), BASELINE);
  assert.ok(v.problems.some((p) => /collapse|analysing LESS/i.test(p)));
});

test('a small backlog may legitimately empty', () => {
  // Below the floor, "all of them" is a plausible afternoon's work and the
  // collapse rule would only cry wolf.
  const v = typecheckVerdict(summary(0, 0), { app: 6, server: 4 });
  assert.deepEqual(v.problems, []);
  assert.equal(v.movements.length, 2);
});

test('a deliberate collapse can be forced through, and syntax with it', () => {
  const output = [
    'x.tsx(1,1): error TS1005: \'}\' expected.',
    summary(281, 3),
  ].join('\n');
  const v = typecheckVerdict(output, BASELINE, { allowSyntaxErrors: true });
  assert.deepEqual(v.problems, []);
});

test('a missing count is a problem, not a zero', () => {
  // Absent is not zero — the oldest rule in this codebase. A missing line means
  // the run did not report, and reading it as "no errors" is the same class of
  // mistake as the collapse.
  const v = typecheckVerdict('typecheck\n  app      281 findings', BASELINE);
  assert.ok(v.problems.some((p) => /server: no count/.test(p)));
});

test('tsc not running at all is a problem', () => {
  const v = typecheckVerdict(summary(281, 'DID NOT RUN'), BASELINE);
  assert.ok(v.problems.some((p) => /DID NOT RUN/.test(p)));
});

test('empty output fails rather than passing silently', () => {
  const v = typecheckVerdict('', BASELINE);
  assert.equal(v.problems.length, 2, 'both halves should be reported missing');
});
