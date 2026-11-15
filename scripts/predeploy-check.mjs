/**
 * Refuse to deploy somebody else's half-finished work.
 *
 * WHY THIS EXISTS, WITH THE DATE
 *
 * `deploy:server` builds from the WORKING TREE, not from a commit. On
 * 2026-11-14 two Claude sessions were editing this checkout at once, and a
 * deploy run from one of them shipped the other's uncommitted, mid-edit
 * `customerQuoteView.ts` to production. Nobody chose that and nobody would
 * have seen it: the deploy said "Deployed Functions" and the health check
 * answered 200, because the code was syntactically fine — it was simply
 * halfway through being written.
 *
 * The same run also deployed a commit that had just FAILED to push, because
 * the push and the deploy were chained with `&&` through a `tail` that
 * succeeded whatever the push did. So production briefly held a change that
 * existed on one laptop and nowhere else.
 *
 * Both are the same mistake underneath — deploying something nobody agreed
 * was finished — and both are cheap to make impossible.
 *
 * WHAT IT CHECKS
 *
 *   1. Uncommitted changes to deployed server source. This is the one that
 *      bit. Refuses, because the files belong to whoever is editing them and
 *      a deploy is not the moment to find out what state they are in.
 *
 *   2. Commits on HEAD that are not on the remote. Warns rather than refuses:
 *      deploying before pushing is a legitimate way to test a fix, and the
 *      warning is there so it is a decision rather than a surprise.
 *
 * `taskDigest.generated.ts` is excluded from the first check because the
 * deploy regenerates it itself, so it is always dirty and never anybody's
 * work in progress.
 *
 * TO OVERRIDE: DEPLOY_ALLOW_DIRTY=1 npm run deploy:server
 * Stated plainly rather than hidden, because a guard nobody can get past in a
 * genuine emergency is a guard somebody deletes.
 */
import { execSync } from 'node:child_process';

/*
 * Every deployed function directory, not just the main one.
 *
 * It watched only `server/` at first, which left `stripe-webhooks/` — the one
 * route on the platform running with verify_jwt = false — able to be deployed
 * half-written by anybody. Narrowing a guard to the directory that happened to
 * burn you once is how the same accident finds a different door.
 */
const WATCHED = 'supabase/functions/';
const GENERATED = 'supabase/functions/server/taskDigest.generated.ts';

const run = (cmd) => {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const amber = (s) => `\x1b[33m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

/* ── 1. is anybody mid-edit in a deployed function? ─────────────────────── */

const dirty = run(`git status --porcelain -- ${WATCHED}`)
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  // "XY path" — take the path, and keep renames' destination.
  .map((line) => line.replace(/^\S+\s+/, '').split(' -> ').pop())
  .filter((path) => path && path.startsWith(WATCHED) && path !== GENERATED);

if (dirty.length && !process.env.DEPLOY_ALLOW_DIRTY) {
  console.error(red('\n  Not deploying: a deployed function has uncommitted changes.\n'));
  for (const path of dirty) console.error(`    ${path}`);
  console.error(dim(`
  A deploy builds from the working tree, so these would go to production
  exactly as they are right now — including anything another session is
  halfway through writing.

  Commit them, stash them, or if you are certain they are yours and ready:

      DEPLOY_ALLOW_DIRTY=1 npm run deploy:server
`));
  process.exit(1);
}

/* ── 2. does the remote have what you are about to deploy? ───────────────── */

run('git fetch --quiet');
const unpushed = run('git rev-list --count @{upstream}..HEAD');

if (unpushed && unpushed !== '0') {
  console.error(amber(`\n  Heads up: ${unpushed} commit(s) here are not on the remote.`));
  console.error(dim(`  Deploying anyway. If that was not deliberate, push first so production
  and the repository agree about what is running.\n`));
}

if (dirty.length) {
  console.error(amber('  Deploying with uncommitted function changes because DEPLOY_ALLOW_DIRTY is set.\n'));
}
