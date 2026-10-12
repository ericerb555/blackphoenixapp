/**
 * Everything that has to pass before a commit, as one command.
 *
 *   npm run precommit            all four checks
 *   npm run precommit -- --quick everything except smoke, and says so loudly
 *
 * WHY THIS EXISTS
 *
 * Eric's standing rule is that typecheck and smoke run before every commit.
 * The rule was real and the list was not: it lived in a memory and in a
 * habit, so a fourth check added later — `check:exchange-map` — would have had
 * to be remembered separately by whoever happened to know about it. One
 * command is one thing to remember.
 *
 * WHY IT IS A NODE SCRIPT AND NOT `a && b && c`
 *
 * The same reason `typecheck.mjs` is. npm runs scripts through `cmd.exe` on
 * Windows, where `;` is not a separator and `&&` is — while every other shell
 * is the reverse. `typecheck` itself was half-broken for weeks because an `&&`
 * short-circuited on a non-zero exit and the server half never ran at all.
 * Spawning each step from node sidesteps the whole question.
 *
 * WHY TYPECHECK IS A RATCHET RATHER THAN A PASS OR FAIL
 *
 * `npm run typecheck` exits non-zero whenever ANY finding exists, and there is
 * a standing backlog of a few hundred — so its exit code has never meant
 * anything, and the rule says what matters is "whether a change ADDED to these
 * counts". That is a judgement a person had to make by reading two numbers and
 * remembering what they were last time.
 *
 * So this compares against `precommit-baseline.json`: above it is a failure,
 * below it is reported with a nudge to lower the file. A backlog that only
 * ratchets down.
 *
 * ORDER IS CHEAPEST-FIRST, deliberately. Tests take three seconds and the map
 * check one HTTP call; typecheck takes a minute and a half and smoke takes
 * four. Failing on the cheap ones first is the difference between a ten-second
 * answer and a six-minute one.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const BASELINE = JSON.parse(readFileSync(new URL('precommit-baseline.json', import.meta.url), 'utf8'));
const quick = process.argv.includes('--quick');

/**
 * npm, as one command string.
 *
 * It has to go through a shell: on Windows npm is `npm.cmd`, and spawning a
 * `.cmd` without one fails outright — which this script demonstrated by
 * reporting all three of its own steps as "could not run" when that was tried.
 *
 * A STRING rather than an args array, deliberately. Node deprecates passing an
 * array alongside `shell: true` because the arguments are concatenated rather
 * than escaped, and it says so on stderr every run. Every command here is a
 * literal in this file with nothing interpolated into it, so there is no
 * injection surface either way — but a check that prints a warning about
 * argument escaping is a check people stop reading.
 */
function run(command) {
  const result = spawnSync(command, { encoding: 'utf8', shell: true });
  return {
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
    status: result.status,
    ranAtAll: result.status !== null,
  };
}

const steps = [];
const line = (s = '') => console.log(s);

/* ── 1. the unit tests ─────────────────────────────────────────────────── */

line('tests…');
{
  const { output, status, ranAtAll } = run('npm test');
  const passed = Number((output.match(/pass (\d+)/) || [])[1] ?? NaN);
  const failed = Number((output.match(/fail (\d+)/) || [])[1] ?? NaN);
  const ok = ranAtAll && status === 0 && failed === 0 && passed > 0;
  steps.push({
    name: 'tests',
    ok,
    detail: !ranAtAll ? 'could not run'
      : Number.isNaN(passed) ? 'could not read the result'
      : `${passed} passed, ${failed} failed`,
    // The failures themselves, not the whole run.
    noise: ok ? '' : output.split('\n').filter((l) => /^not ok|✖|AssertionError|Error:/.test(l)).slice(0, 25).join('\n'),
  });
  line(`  ${ok ? 'ok' : 'FAILED'} — ${steps.at(-1).detail}`);
}

/* ── 2. every OSM mapping reaches a category ───────────────────────────── */

line('exchange map…');
{
  const { output, status, ranAtAll } = run('npm run check:exchange-map');
  // Exit 2 means the taxonomy could not be read, so nothing was checked. That
  // is not a pass and not a code failure — it is an unknown, and it says so.
  const unknown = status === 2;
  const ok = ranAtAll && status === 0;
  steps.push({
    name: 'exchange map',
    ok,
    unknown,
    detail: !ranAtAll ? 'could not run'
      : unknown ? 'could not read the taxonomy — NOT CHECKED'
      : (output.match(/^\d+ mappings:.*$/m) || ['done'])[0],
    noise: ok ? '' : output.split('\n').filter(Boolean).slice(-12).join('\n'),
  });
  line(`  ${ok ? 'ok' : unknown ? 'UNKNOWN' : 'FAILED'} — ${steps.at(-1).detail}`);
}

/* ── 3. typecheck, against the baseline ────────────────────────────────── */

line('typecheck…');
{
  const { output, ranAtAll } = run('npm run typecheck');
  // The summary `typecheck.mjs` prints: "  app      316 findings".
  const counts = {};
  for (const m of output.matchAll(/^\s{2}(app|server)\s+(?:(\d+) findings?|DID NOT RUN)\s*$/gm)) {
    counts[m[1]] = m[2] === undefined ? null : Number(m[2]);
  }

  const problems = [];
  const movements = [];
  for (const [half, allowed] of Object.entries(BASELINE.typecheck)) {
    const found = counts[half];
    if (found === undefined) problems.push(`${half}: no count in the output`);
    else if (found === null) problems.push(`${half}: tsc DID NOT RUN`);
    else if (found > allowed) problems.push(`${half}: ${found} findings, baseline ${allowed} — this change ADDED ${found - allowed}`);
    else if (found < allowed) movements.push(`${half}: ${found} findings, baseline ${allowed} — ${allowed - found} fewer, lower the baseline`);
  }

  const ok = ranAtAll && problems.length === 0;
  steps.push({
    name: 'typecheck',
    ok,
    detail: ok
      // "at baseline" only when it IS at baseline. Below it is a different and
      // better answer, and saying the wrong one would be a small lie in the
      // one line somebody reads.
      ? Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(', ')
        + (movements.length ? ' (under baseline)' : ' (at baseline)')
      : problems.join('; '),
    movements,
    noise: ok ? '' : output.split('\n').filter((l) => /error TS/.test(l)).slice(0, 20).join('\n'),
  });
  line(`  ${ok ? 'ok' : 'FAILED'} — ${steps.at(-1).detail}`);
  for (const m of movements) line(`  note — ${m}`);
}

/* ── 4. smoke ──────────────────────────────────────────────────────────── */

if (quick) {
  steps.push({ name: 'smoke', ok: true, skipped: true, detail: 'SKIPPED by --quick' });
  line('smoke…\n  SKIPPED — --quick was passed');
} else {
  line('smoke…');
  const { output, ranAtAll } = run('npm run smoke -- --all --batch 40');
  const m = output.match(/(\d+) rendered, (\d+) did not report, (\d+) threw/);
  const ok = ranAtAll && !!m && Number(m[2]) === 0 && Number(m[3]) === 0 && Number(m[1]) > 0;
  steps.push({
    name: 'smoke',
    ok,
    detail: !ranAtAll ? 'could not run'
      : !m ? 'could not read the result'
      : `${m[1]} rendered, ${m[2]} did not report, ${m[3]} threw`,
    noise: ok ? '' : output.split('\n').filter((l) => /threw|did not report|Error/.test(l)).slice(0, 25).join('\n'),
  });
  line(`  ${ok ? 'ok' : 'FAILED'} — ${steps.at(-1).detail}`);
}

/* ── the verdict ───────────────────────────────────────────────────────── */

line();
line('═'.repeat(64));
for (const s of steps) {
  const mark = s.skipped ? 'skip' : s.unknown ? '????' : s.ok ? ' ok ' : 'FAIL';
  line(`  [${mark}] ${s.name.padEnd(14)} ${s.detail}`);
}
line('═'.repeat(64));

const failed = steps.filter((s) => !s.ok && !s.unknown);
const unknown = steps.filter((s) => s.unknown);

for (const s of [...failed, ...unknown]) {
  if (!s.noise) continue;
  line(`\n── ${s.name} ──`);
  line(s.noise);
}

if (failed.length) {
  line(`\n${failed.length} check(s) failed. Not ready to commit.`);
  process.exit(1);
}
if (unknown.length) {
  // Deliberately not a pass. "Could not check" and "checked and fine" are
  // different answers, and collapsing them is how a broken check goes unnoticed.
  line(`\n${unknown.length} check(s) could not run. Fix that or say so in the commit message.`);
  process.exit(3);
}
if (quick) {
  line('\nEverything except smoke passed. Smoke was SKIPPED — this is not a full run.');
  process.exit(0);
}
line('\nAll checks passed.');
