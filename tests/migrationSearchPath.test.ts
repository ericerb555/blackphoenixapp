/**
 * Every function a migration creates must pin its `search_path`.
 *
 * WHY THIS TEST EXISTS
 *
 * `20261016170000_pin_function_search_path.sql` pinned six functions and wrote
 * down, correctly, why it mattered even though none of them was SECURITY
 * DEFINER:
 *
 *   "the dangerous version of this is one `security definer` away: the day
 *    somebody adds that keyword to a trigger guard, the hole opens silently
 *    and nothing in review would catch it."
 *
 * Three weeks later the linter reported two more. `ai_action_request_freeze`
 * (2026-11-09) is the instructive one: its author remembered to revoke EXECUTE
 * from `public`, `anon` and `authenticated` on the very next line, and did not
 * pin the path. Careful work, same gap — because nothing checked.
 *
 * So this is the check. It reads the migrations rather than the database, which
 * means it needs no credentials and it fails at authoring time instead of
 * showing up in an advisor weeks later.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * It does not demand `search_path = ''`. Three of the October six read
 * `exchange_category`, `organizations` and `organization_category` unqualified
 * and an empty path breaks them outright; that file explains the trade and
 * chose `public` on purpose. Any pin satisfies this test. The point is that the
 * author made a choice, not that they made a particular one.
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS = 'supabase/migrations';

/**
 * Strip SQL comments before looking for anything.
 *
 * Several migrations quote `create or replace function` inside explanatory
 * block comments — this very change's migration does. Counting those as
 * declarations would make the test fail on prose.
 */
function withoutComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ');
}

/**
 * Every `create function` / `create or replace function` in one file, as
 * `{ name, body }` where `body` runs to the start of the next declaration.
 *
 * Crude on purpose: a real SQL parser is not worth the dependency, and the
 * shape being matched is one this repository writes by hand in a consistent
 * style.
 */
function functionDeclarations(sql: string): { name: string; head: string }[] {
  const clean = withoutComments(sql);
  const re = /create\s+(?:or\s+replace\s+)?function\s+([a-z0-9_."]+)\s*\(/gi;
  const found: { name: string; head: string }[] = [];
  const starts: { name: string; at: number }[] = [];

  let m: RegExpExecArray | null;
  while ((m = re.exec(clean)) !== null) {
    starts.push({ name: m[1].replace(/"/g, ''), at: m.index });
  }

  for (let i = 0; i < starts.length; i++) {
    const from = starts[i].at;
    // The header is everything up to the body delimiter, which is where
    // `set search_path` must appear if it appears at all. Falling back to the
    // next declaration keeps a file with an unusual delimiter from silently
    // passing.
    const rest = clean.slice(from, starts[i + 1]?.at ?? clean.length);
    const bodyAt = rest.search(/\bas\s+(\$[a-z_]*\$|')/i);
    found.push({ name: starts[i].name, head: bodyAt === -1 ? rest : rest.slice(0, bodyAt) });
  }

  return found;
}

/**
 * Functions created before this rule was written, each with the file that
 * settles them. Listed one by one rather than waved through by date, so a NEW
 * function in an OLD file cannot hide behind a cutoff.
 *
 * `search_path` was pinned for all of these by
 * `20261016170000_pin_function_search_path.sql` and
 * `20261110234500_pin_search_path_and_record_slow_queries.sql` — in a later
 * file than the one that created them, which is why reading each declaration in
 * isolation cannot see it.
 */
const PINNED_ELSEWHERE = new Set([
  'public.bid_request_distance_miles',
  'public.exchange_category_depth_guard',
  'public.exchange_normalise_phrase',
  'public.exchange_org_category_guard',
  'public.update_investor_totals',
  'public.update_opportunity_stats',
  'public.ai_action_request_freeze',
]);

test('every function a migration creates pins its search_path', () => {
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
  assert.ok(files.length > 0, 'no migrations found — is the path still right?');

  const offenders: string[] = [];

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS, file), 'utf8');
    for (const { name, head } of functionDeclarations(sql)) {
      const qualified = name.includes('.') ? name : `public.${name}`;
      if (PINNED_ELSEWHERE.has(qualified)) continue;
      if (/\bset\s+search_path\s*=/i.test(head)) continue;
      offenders.push(`${file}: ${qualified}`);
    }
  }

  assert.deepStrictEqual(
    offenders,
    [],
    'These functions are created without `set search_path`. Add one to the ' +
    'declaration — `= \'\'` if every object reference in the body is ' +
    'schema-qualified, `= public` if not. See ' +
    '20261016170000_pin_function_search_path.sql for why, and add to ' +
    'PINNED_ELSEWHERE only if a LATER migration pins it.\n  ' +
    offenders.join('\n  '),
  );
});

test('the allowlist does not outlive the functions it covers', () => {
  // An entry that no migration creates any more is a stale exemption, and a
  // stale exemption is how a new function with the old name gets a free pass.
  const all = new Set<string>();
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql'))) {
    for (const { name } of functionDeclarations(readFileSync(join(MIGRATIONS, file), 'utf8'))) {
      all.add(name.includes('.') ? name : `public.${name}`);
    }
  }

  const stale = [...PINNED_ELSEWHERE].filter((n) => !all.has(n));
  assert.deepStrictEqual(stale, [], `PINNED_ELSEWHERE names functions no migration creates: ${stale.join(', ')}`);
});

test('the pin this pass added is actually in the migration', () => {
  // Guards against the allowlist above being the only thing keeping the suite
  // green: `ai_action_request_freeze` is exempt because a later file pins it,
  // so that file had better still do so.
  const sql = readFileSync(
    join(MIGRATIONS, '20261110234500_pin_search_path_and_record_slow_queries.sql'),
    'utf8',
  );
  assert.match(
    withoutComments(sql),
    /alter\s+function\s+public\.ai_action_request_freeze\(\)\s+set\s+search_path\s*=/i,
  );
  assert.match(withoutComments(sql), /create\s+or\s+replace\s+function\s+public\.slow_queries/i);
});
