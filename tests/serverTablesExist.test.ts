/**
 * A `.from('…')` must name a table that exists.
 *
 * THE CHECK THAT WOULD HAVE FOUND AN ENTIRE CLASS YEARS EARLIER
 *
 * Three tables were read by authorization code on this server and have never
 * existed in any schema: `user_permissions`, `company_members` and
 * `user_profiles`. Confirmed against production 2026-11-17 —
 * `ERROR 42P01: relation "public.user_permissions" does not exist`.
 *
 * Nothing noticed, because nothing could. PostgREST answers with an error
 * OBJECT rather than throwing, so every call site did one of:
 *
 *     const { data } = await sb.from('user_permissions')…   // data is null
 *     return (data || []).some(…)                           // → false
 *
 *     try { … } catch { return false }                      // never reached
 *
 * An empty list and a missing table are indistinguishable downstream. Eight
 * gates read one of these beside a live role check, so they were merely
 * wasted round trips. One — `rewardsAdmin` — had no other check at all: it
 * returned false on every call, and the gift-card, redemption and rewards
 * admin routes refused the owner of the company for as long as that code
 * existed.
 *
 * **It failed closed, which is why nobody found it.** A permanently refused
 * admin route is indistinguishable from a correctly guarded one, from the
 * outside and from the inside.
 *
 * WHY THIS IS A TEST AND NOT A PROBE
 *
 * The probe half already exists — `npm run security` asks production. This is
 * the prevention half, and it is the one that runs on the commit that would
 * introduce the next one, without a network, in the same gate as everything
 * else. The same split as `predeploy-check` against the `/health` build stamp,
 * and `retiredFunctionEntrypoints` against `RETIRED-1`.
 *
 * WHAT IT CANNOT DO
 *
 * It compares against `supabase/known-tables.json`, a snapshot — not against
 * the live database, which a unit test has no business reaching. So it
 * catches a name that was never real; it would not catch a table dropped from
 * the database while the snapshot still lists it. That residual belongs to
 * the probe, and the snapshot carries the date it was verified so its age is
 * visible rather than assumed.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const manifest = JSON.parse(readFileSync(join(root, 'supabase/known-tables.json'), 'utf8'));
const KNOWN: Set<string> = new Set(manifest.tables);

/** Comments stripped: a comment naming a dead table is a record, not a call. */
function codeOf(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

/**
 * Only a quoted literal is checked. `.from(someVariable)` is unresolvable
 * here and is left to the probe rather than guessed at — a check that
 * pretends to cover what it cannot is worse than one with a stated edge.
 */
const FROM_LITERAL = /\.from\(\s*[`'"]([a-zA-Z0-9_]+)[`'"]\s*\)/g;

function scan(dir: string, out: Map<string, Set<string>>): Map<string, Set<string>> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) { scan(full, out); continue; }
    if (!/\.(ts|tsx)$/.test(entry)) continue;
    for (const match of codeOf(full).matchAll(FROM_LITERAL)) {
      const table = match[1];
      if (!out.has(table)) out.set(table, new Set());
      out.get(table)!.add(full.slice(root.length + 1).replace(/\\/g, '/'));
    }
  }
  return out;
}

function report(found: Map<string, Set<string>>, where: string) {
  const phantom = [...found.keys()].filter((t) => !KNOWN.has(t)).sort();
  assert.deepEqual(
    phantom, [],
    `${where} queries ${phantom.length} table(s) that are not in supabase/known-tables.json:\n`
    + phantom.map((t) => `  ${t}  — ${[...found.get(t)!].join(', ')}`).join('\n')
    + '\n\nEither the table does not exist — in which case this query returns an error '
    + 'object that a `catch` or a `|| []` will silently turn into "no rows", and any '
    + 'gate built on it refuses everybody — or a migration added it and the manifest '
    + 'needs regenerating. Check which before editing the manifest: adding the name '
    + 'is how you hide the first case.',
  );
}

test('every table the server queries is a table that exists', () => {
  const found = scan(join(root, 'supabase/functions/server'), new Map());
  assert.ok(found.size > 0, 'no .from() calls found at all — the scanner is broken');
  report(found, 'The server');
});

/**
 * The browser too. It reaches Postgres directly through the Supabase client,
 * under RLS — a different trust model, the same silent failure.
 *
 * THE SERVER CAME BACK CLEAN AND THE BROWSER DID NOT. Twelve names, found the
 * moment this check was first run. They are carried in `knownMissing` as a
 * RATCHET: a new one fails here, and the twelve are recorded rather than
 * hidden, because fixing each needs a decision — build the table, delete the
 * feature, or point it at the server route that already holds the data.
 *
 * Deliberately not merged into `tables`. That would make them "exist" to
 * every future reader of this manifest, which is precisely the move the
 * failure message warns against.
 */
test('the front end queries no table beyond the twelve already known missing', () => {
  const allowed = new Set([...KNOWN, ...(manifest.knownMissing || [])]);
  const found = scan(join(root, 'src'), new Map());
  const fresh = [...found.keys()].filter((t) => !allowed.has(t)).sort();
  assert.deepEqual(
    fresh, [],
    `The front end queries ${fresh.length} table(s) that exist neither in the database `
    + `nor on the known-missing list:\n`
    + fresh.map((t) => `  ${t}  — ${[...found.get(t)!].join(', ')}`).join('\n')
    + '\n\nA query against a table that does not exist returns an error object, not a '
    + 'throw — so a `|| []` turns it into "no rows" and the screen renders empty for '
    + 'ever. Create the table, or do not query it.',
  );
});

/**
 * The ratchet only ratchets if it can go down.
 *
 * A name that has been fixed must leave `knownMissing`, or the list becomes a
 * permanent excuse and the next person inherits twelve entries with no way to
 * tell which are still true.
 */
test('nothing sits on the known-missing list that the front end no longer queries', () => {
  const found = scan(join(root, 'src'), new Map());
  const stale = (manifest.knownMissing || []).filter((t: string) => !found.has(t)).sort();
  assert.deepEqual(
    stale, [],
    `known-missing entries nothing queries any more: ${stale.join(', ')}.\n`
    + 'Remove them from supabase/known-tables.json — the list is a ratchet, and an '
    + 'entry nobody uses makes it look longer than the problem is.',
  );
});

test('a known-missing table is never also claimed to exist', () => {
  for (const t of manifest.knownMissing || []) {
    assert.ok(!KNOWN.has(t), `${t} is on both lists — it cannot be missing and present`);
  }
});

/**
 * The three that caused this, named explicitly.
 *
 * The general check above would catch them, but it would also pass the day
 * somebody "fixes" a failure by pasting the name into the manifest. These
 * three must never be in it — they have never existed, and a migration
 * creating one now would be a third place roles live, which is a decision and
 * not a repair.
 */
test('the three tables that never existed are not quietly added to the manifest', () => {
  for (const ghost of ['user_permissions', 'company_members', 'user_profiles']) {
    assert.ok(
      !KNOWN.has(ghost),
      `${ghost} is in known-tables.json. It has never existed in any schema. If it `
      + 'genuinely exists now, that is a new authority store and wants deciding on '
      + 'purpose — see tasks/security-audit-2026-11-17.md, P4-3.',
    );
  }
});

test('the manifest says when it was checked against the database', () => {
  assert.match(
    String(manifest.verifiedAgainstProductionOn || ''),
    /^\d{4}-\d{2}-\d{2}$/,
    'known-tables.json has no verification date — its age is the only thing that says how far to trust it',
  );
  assert.ok(Array.isArray(manifest.tables) && manifest.tables.length > 10, 'the manifest looks truncated');
});
