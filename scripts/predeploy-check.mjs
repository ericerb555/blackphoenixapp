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
 *   3. Server commits on origin/main that this tree does NOT have. Refuses.
 *      Added 2026-11-17 after two sessions spent days overwriting each
 *      other's function, each deploy reporting success while removing the
 *      other's work. See the note on the check itself.
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
/**
 * Files the build rewrites itself, so they are always dirty and never
 * anybody's work in progress. Excluded from check 1 for that reason alone —
 * `buildInfo.generated.ts` in particular is rewritten on every single build,
 * by definition after this check has run.
 */
const GENERATED = new Set([
  'supabase/functions/server/taskDigest.generated.ts',
  'supabase/functions/server/buildInfo.generated.ts',
]);

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
  .filter((path) => path && path.startsWith(WATCHED) && !GENERATED.has(path));

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

/* ── 3. does THIS tree have everything main already has? ─────────────────── */

/**
 * The mirror image of check 2, and the one that actually bit.
 *
 * Check 2 asks "are my commits on the remote". This asks "am I missing
 * anybody else's" — and because a deploy builds from the working tree, the
 * answer decides whether this deploy quietly REVERTS production.
 *
 * WHAT HAPPENED, 2026-11-17
 *
 * Two sessions, two worktrees, both deploying. Each build contained its own
 * author's work and none of the other's, so every deploy replaced the
 * previous one's function:
 *
 *   v839   one session's tree.  None of the other's fifteen commits.
 *   v840   the first build in days containing both.
 *
 * In between, `/team/members/role` — the route that writes the
 * `app_metadata.role` every authorisation check on this server reads — was
 * absent from production while its author's deploy had reported success.
 * Nothing in the output said so. The health check answered 200 the whole
 * time, because a server missing a route is a perfectly healthy server.
 *
 * WHY IT REFUSES RATHER THAN WARNS
 *
 * A warning is right for check 2: deploying before pushing is a decision
 * somebody is making about their own work. This is not that. Being behind
 * main means the deploy would remove code that is already merged, agreed and
 * live — somebody else's, usually without their knowing. There is no version
 * of that which is a considered choice, so it stops.
 *
 * WHY IT ONLY COUNTS COMMITS THAT TOUCH A DEPLOYED FUNCTION
 *
 * Main moves all day on the front end, and refusing a server deploy because
 * somebody changed a React page would be noise — and noise is what gets a
 * guard switched off. Only server source can be reverted by a server deploy,
 * so only server source blocks one.
 */
const hasMain = run('git rev-parse --verify --quiet origin/main');

if (hasMain) {
  const behind = run(`git rev-list HEAD..origin/main --oneline -- ${WATCHED}`)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (behind.length && !process.env.DEPLOY_ALLOW_BEHIND) {
    console.error(red(`\n  Not deploying: origin/main has ${behind.length} server commit(s) this tree does not.\n`));
    for (const line of behind.slice(0, 10)) console.error(`    ${line}`);
    if (behind.length > 10) console.error(dim(`    …and ${behind.length - 10} more`));
    console.error(dim(`
  A deploy builds from THIS working tree, so deploying now would replace the
  live function with one that does not contain those commits — silently, and
  with a 200 from the health check afterwards.

  Bring them in first:

      git merge origin/main

  Or, if you genuinely mean to deploy a tree that is behind main:

      DEPLOY_ALLOW_BEHIND=1 npm run deploy:server
`));
    process.exit(1);
  }

  if (behind.length) {
    console.error(amber(`  Deploying a tree missing ${behind.length} server commit(s) from main because DEPLOY_ALLOW_BEHIND is set.\n`));
  }
}

if (dirty.length) {
  console.error(amber('  Deploying with uncommitted function changes because DEPLOY_ALLOW_DIRTY is set.\n'));
}
