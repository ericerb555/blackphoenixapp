/**
 * Which front-end files talk to gated routes using only the publishable key?
 *
 * WHY THIS EXISTS
 *
 * `CreativeStudio.tsx` built its auth header once, at module scope, from
 * `publicAnonKey`. The auth wall treats `/creative-studio/*` as signed-in
 * only, so every call it made returned 401 — and because the button was
 * disabled on the resulting null state, and the explanation was guarded on
 * that same null, the screen greyed itself out and said nothing. It had
 * never worked.
 *
 * That pattern is not unique to one file. This finds the rest, and
 * distinguishes the ones that matter: a module-level anon header is fine for
 * a component that only calls public routes, and fatal for one that does
 * not. The public lists are read out of `index.tsx` rather than retyped, so
 * this cannot drift from the server's actual answer.
 *
 *   node scripts/anonAuthAudit.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SERVER = 'supabase/functions/server/index.tsx';
const idx = readFileSync(SERVER, 'utf8');

/**
 * Comments are stripped BEFORE the quoted strings are read.
 *
 * The first version of this did not, and the apostrophe in "the public
 * store's enquiry form" paired with the next quote in the file. That
 * swallowed real entries into multi-line junk and produced a public list
 * that was wrong in both directions. An audit that is wrong in the
 * permissive direction is worse than no audit, so this strips first.
 */
function listFrom(name) {
  const start = idx.indexOf('const ' + name + ' = [');
  if (start < 0) return [];
  const end = idx.indexOf('\n];', start);
  const body = idx.slice(start, end)
    .replace(/\/\*[\s\S]*?\*\//g, '')   // block comments, including the long ones
    .replace(/\/\/[^\n]*/g, '');        // line comments, with their apostrophes
  return [...body.matchAll(/'([^'\n]+)'/g)].map((m) => m[1]).filter((s) => s.startsWith('/'));
}

const PUBLIC = [
  ...listFrom('PUBLIC_PREFIXES'),
  ...listFrom('PUBLIC_GET_PREFIXES'),
  ...listFrom('PUBLIC_POST_PATHS'),
];

const isPublic = (p) => PUBLIC.some((base) => p === base || p.startsWith(base));

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/** A header object literal, declared at module scope, carrying the anon key. */
const MODULE_ANON_HEADER = /^const\s+\w+\s*=\s*\{[^}]*Bearer \$\{publicAnonKey\}/m;

const broken = [];
const publicOnly = [];
const mixed = [];

for (const file of walk('src/app')) {
  const src = readFileSync(file, 'utf8');
  if (!MODULE_ANON_HEADER.test(src)) continue;

  const name = file.split(/[\\/]/).slice(-1)[0];

  // A file that also resolves a session somewhere is doing it properly at
  // least sometimes; it needs a human look rather than a blanket rewrite.
  if (/getSession\(\)/.test(src)) { mixed.push(name); continue; }

  /**
   * Paths are taken from the template literals, not from the function slug.
   *
   * The first version searched for `make-server-3eae23a6/...` and found
   * almost nothing, because components write `${SERVER}/creative-studio/...`
   * and the slug appears once, in the `const SERVER` line. Every file
   * therefore looked like it called no gated routes — a false clean bill on
   * the exact question being asked.
   */
  const paths = [
    ...src.matchAll(/\$\{(?:SERVER|API_BASE_URL|BASE)\}((?:\/make-server-3eae23a6)?\/[A-Za-z0-9_\-/]*)/g),
    ...src.matchAll(/make-server-3eae23a6(\/[A-Za-z0-9_\-/]+)/g),
  ]
    .map((m) => m[1].replace(/^\/make-server-3eae23a6/, '').replace(/\/$/, ''))
    .filter(Boolean);
  const gated = [...new Set(paths)].filter((p) => !isPublic(p));

  if (gated.length) broken.push({ name, file, gated });
  else publicOnly.push(name);
}

console.log(`${PUBLIC.length} public path rules read from the server.`);
console.log(`\nBROKEN — module-level anon header, calls gated routes (${broken.length}):`);
for (const b of broken.sort((a, b) => b.gated.length - a.gated.length)) {
  console.log(`  ${b.name.padEnd(32)} ${b.gated.length} gated route(s)  e.g. ${b.gated[0]}`);
}
console.log(`\nPublic-only, fine as-is (${publicOnly.length}): ${publicOnly.join(', ') || 'none'}`);
console.log(`Mixed, needs a human look (${mixed.length}): ${mixed.join(', ') || 'none'}`);
