/**
 * Type-check every config, and say what each one found.
 *
 * WHY THIS IS A SCRIPT AND NOT A ONE-LINER
 *
 * It used to be `tsc -p tsconfig.json --noEmit && tsc -p tsconfig.server.json
 * --noEmit`. The app config has a few hundred standing findings, so it exits
 * non-zero every single time, so the `&&` short-circuited and **the server
 * half never ran at all** — in any session, for as long as that line existed.
 * Every "typecheck is clean" note written against it was only ever looking at
 * the front end, which is the worst kind of check: one that gives confidence
 * it has not earned.
 *
 * The obvious repair is to swap the operator, and it does not work here. npm
 * runs scripts through `cmd.exe` on Windows, where `;` is not a separator at
 * all and `&` is, while every other shell is the other way round. A check that
 * behaves differently depending on who runs it is barely better than one that
 * silently skips half the code, so the sequencing happens in node where it
 * means one thing.
 *
 * WHAT IT REPORTS, AND WHY PER CONFIG
 *
 * Both halves always find something, because both carry a backlog. So the
 * useful question is never "did it pass" — it is "did MY change add to it",
 * and that can only be answered against a number per config. One combined
 * total would hide a new server error behind a front-end count that moved for
 * an unrelated reason.
 */
import { spawnSync } from 'node:child_process';

const CONFIGS = [
  { name: 'app', config: 'tsconfig.json' },
  { name: 'server', config: 'tsconfig.server.json' },
];

/**
 * The test config is deliberately not here.
 *
 * `npm run typecheck:tests` still exists and still works. Adding it to the
 * default run would change what the pre-commit number means, and that is a
 * decision about the standing check rather than a repair to a broken one.
 */

const results = [];

for (const { name, config } of CONFIGS) {
  console.log(`\n── ${name} (${config}) ${'─'.repeat(Math.max(50 - name.length - config.length, 0))}`);

  // `shell: true` because tsc is a shell-resolved binary on Windows. stdio is
  // inherited rather than captured so a long run prints as it goes instead of
  // appearing to hang.
  const run = spawnSync('npx', ['tsc', '-p', config, '--noEmit'], {
    shell: true,
    encoding: 'utf8',
  });

  const output = `${run.stdout || ''}${run.stderr || ''}`;
  if (output.trim()) console.log(output.trimEnd());

  const findings = (output.match(/error TS\d+/g) || []).length;
  results.push({ name, config, findings, failedToRun: run.status === null });

  if (run.status === null) {
    console.error(`\n${name}: tsc could not be run at all.`);
  }
}

/* ── the summary, which is the part anybody actually reads ─────────────── */

console.log(`\n${'═'.repeat(56)}`);
for (const r of results) {
  const label = r.failedToRun ? 'DID NOT RUN' : `${r.findings} finding${r.findings === 1 ? '' : 's'}`;
  console.log(`  ${r.name.padEnd(8)} ${label}`);
}
console.log(`${'═'.repeat(56)}`);
console.log(
  'Both halves ran. What matters is whether your change ADDED to these\n'
  + 'counts, not that they are above zero — each carries a known backlog.',
);

// Non-zero while the backlog exists, exactly as before. Nothing is gated on
// this exit code today; the output is what the rule asks you to read.
const broken = results.some((r) => r.failedToRun);
const anyFindings = results.some((r) => r.findings > 0);
process.exit(broken || anyFindings ? 1 : 0);
