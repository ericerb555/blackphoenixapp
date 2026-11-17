/**
 * A retired edge function must deploy its stub, and never its archive.
 *
 * WHAT THIS PREVENTS, AND THE DATE IT ALREADY HAPPENED
 *
 * Three generations of this server were retired, and each one's full source is
 * still in the repository as the record of what was retired — 13,640 lines in
 * `make-server-57095a78` alone, and two more under `_retired/`. What makes
 * them harmless is one line apiece in `supabase/config.toml`: an `entrypoint`
 * pointing at the `-stub` directory instead of the archive.
 *
 * Point it back and every route returns, **with service-role privileges,
 * against live data** — including, in those older generations, payment routes
 * with no authorisation check at all and a `/customers` that answered an
 * unprivileged caller with HTTP 200.
 *
 * That is not hypothetical. The F4 deploy on 2026-08-17 named the full
 * directory and silently un-retired `57095a78` for about fifteen minutes.
 *
 * WHY A TEST, WHEN THERE IS ALREADY A LIVE PROBE
 *
 * `RETIRED-1` in `scripts/security-probe.mjs` asks production whether the
 * stubs are serving. That is DETECTION: it can only tell you after a deploy
 * has already exposed them. This is PREVENTION, and it is the cheaper half —
 * a one-line config change that nobody would look at twice, caught before it
 * ships rather than during the window it is live.
 *
 * The same split as `predeploy-check` (refuses a tree behind main) and the
 * `/health` build stamp (says what production is running). Neither half is
 * sufficient on its own.
 *
 * WHY IT READS THE CONFIG RATHER THAN THE DEPLOYED FUNCTION
 *
 * Because it has to run without a network, in the same gate as everything
 * else, on the commit that would do the damage.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const config = readFileSync(join(root, 'supabase/config.toml'), 'utf8');

/**
 * The retired slugs, as a literal list.
 *
 * Deliberately not discovered from the config: a list derived from the file
 * it is checking would silently shrink to nothing the day somebody deletes a
 * `[functions.…]` block, and a test that checks nothing passes.
 */
const RETIRED = [
  'make-server-57095a78',
  'make-server-824f083c',
  'make-server-12c91054',
];

/** The one that is live. Its entrypoint must NOT look like a stub. */
const LIVE = 'make-server-3eae23a6';

function entrypointOf(slug: string): string | null {
  const section = config.indexOf(`[functions.${slug}]`);
  if (section < 0) return null;
  const rest = config.slice(section);
  const line = rest.match(/^\s*entrypoint\s*=\s*"([^"]+)"/m);
  return line ? line[1] : null;
}

test('every retired function is still declared', () => {
  for (const slug of RETIRED) {
    assert.ok(
      config.includes(`[functions.${slug}]`),
      `${slug} has no section in config.toml. Deleting the section does not retire it — `
        + 'the CLI then defaults its entrypoint to <slug>/index.ts, which for 57095a78 '
        + 'is the full archived server.',
    );
  }
});

/**
 * The assertion this file exists for.
 */
test('every retired function points at its stub, not its archive', () => {
  for (const slug of RETIRED) {
    const entry = entrypointOf(slug);
    assert.ok(entry, `${slug} declares no entrypoint`);
    assert.match(
      entry!,
      new RegExp(`${slug}-stub/`),
      `${slug} does not deploy its stub — it points at ${entry}. `
        + 'Deploying this re-exposes every route that function had, with service-role '
        + 'privileges, against live data. This happened on 2026-08-17.',
    );
  }
});

test('a retired entrypoint never names the archived source directly', () => {
  for (const slug of RETIRED) {
    const entry = entrypointOf(slug)!;
    assert.doesNotMatch(entry, /_retired\//, `${slug} points into the archive`);
    // `./functions/make-server-57095a78/index.tsx` — the exact 2026-08-17 shape.
    assert.doesNotMatch(
      entry,
      new RegExp(`functions/${slug}/`),
      `${slug} points at the full archived directory, which is the 2026-08-17 mistake exactly`,
    );
  }
});

/**
 * The stub has to be there.
 *
 * An entrypoint naming a directory that does not exist fails the deploy
 * loudly, which is survivable — but it is also the state somebody "fixes" at
 * speed by pointing the line back at the archive, which is the thing this
 * file exists to stop.
 */
test('each stub the config names actually exists', () => {
  for (const slug of RETIRED) {
    const entry = entrypointOf(slug)!;
    const onDisk = join(root, 'supabase', entry.replace(/^\.\//, ''));
    assert.ok(existsSync(onDisk), `${slug} names ${entry}, which is not on disk`);
  }
});

/**
 * The inverse, so this cannot be satisfied by retiring everything.
 *
 * A test that only asserts "points at a stub" is passed by a config in which
 * the live server points at a stub too — which would take the whole platform
 * down while this file reported success.
 */
test('the live function is not pointed at a stub', () => {
  const entry = entrypointOf(LIVE);
  assert.ok(entry, `${LIVE} declares no entrypoint`);
  assert.doesNotMatch(entry!, /-stub\//, `${LIVE} is serving a retirement stub`);
  assert.match(entry!, /server-dist/, `${LIVE} should deploy the built server`);
});

/**
 * The archive is allowed to exist — keeping it is the point. This asserts it
 * is still only a record, so that "the source is present" never gets confused
 * with "the source is deployed".
 */
test('the archived source may stay, because the entrypoint is what matters', () => {
  const archive = join(root, 'supabase/functions/make-server-57095a78');
  if (!existsSync(archive)) return; // deleting the record is allowed too
  const entry = entrypointOf('make-server-57095a78')!;
  assert.ok(
    entry.includes('-stub/'),
    'the archive is present AND the entrypoint points at it — that is the live-exposure state',
  );
});
