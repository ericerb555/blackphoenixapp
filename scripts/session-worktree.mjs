/**
 * A working tree of your own.
 *
 * WHY, WITH THE DATE
 *
 * On 2026-11-14 two Claude sessions were editing this one checkout at the same
 * time, and in a single afternoon that produced: 141 of one session's files
 * staged when the other went to commit; six phantom test failures from files
 * being saved mid-run; a deploy that shipped somebody's half-written
 * `customerQuoteView.ts` to production; and a stash-rebase-push dance to get
 * one commit out. None of those were anybody being careless. They are what
 * sharing a working tree does.
 *
 * Eric's call: a worktree per session. Same repository, same history, same
 * remote — separate directories and separate branches, so two sessions can run
 * at once and cannot stage, stash, or deploy over each other.
 *
 *   npm run session my-feature
 *
 * Then work in the directory it prints. Commit and push on the branch it made,
 * and merge to main the usual way.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * It does not move an existing session. Pulling the floor out from under
 * somebody mid-edit is the problem, not the fix — so this makes a NEW tree and
 * leaves every running session exactly where it is.
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const name = (process.argv[2] || '').trim();

const die = (message) => {
  console.error(`\x1b[31m\n  ${message}\x1b[0m\n`);
  process.exit(1);
};

if (!name) {
  die('Give it a name:  npm run session my-feature');
}
if (!/^[a-z0-9][a-z0-9._-]{0,48}$/i.test(name)) {
  die(`"${name}" will not do as a directory and branch name — letters, digits, dot, dash and underscore.`);
}

const dir = path.join('.claude', 'worktrees', name);
const branch = `session/${name}`;

if (existsSync(dir)) {
  die(`${dir} already exists. Use it, or pick another name.`);
}

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });
const quiet = (cmd) => {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

/*
 * Branch from the REMOTE's main, not from whatever this tree happens to be
 * sitting on. The local main may be mid-rebase, behind, or carrying another
 * session's commits — and starting a clean tree from an unclean base is how
 * the thing this script exists to prevent comes back in a different shape.
 */
console.log('\n  Fetching…');
quiet('git fetch --quiet');

const base = quiet('git rev-parse --verify origin/main') ? 'origin/main' : 'HEAD';
if (base === 'HEAD') {
  console.log('\x1b[33m  No origin/main to branch from — using this tree\'s HEAD.\x1b[0m');
}

console.log(`  Creating ${dir} on ${branch} from ${base}…\n`);
run(`git worktree add -b ${branch} "${dir}" ${base}`);

console.log(`\x1b[32m
  Ready.\x1b[0m

  Work here:     ${path.resolve(dir)}
  On branch:     ${branch}

  Dependencies are shared through the repo root, so there is nothing to
  install. When you are done:

      git push -u origin ${branch}

  and merge it to main however you normally would. To remove the tree
  afterwards:

      git worktree remove ${dir}
`);
