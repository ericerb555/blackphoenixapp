/**
 * Does every import in the committed tree point at a file that is committed?
 *
 *   node scripts/checkImports.mjs
 *
 * WHY THIS EXISTS
 *
 * On 2026-10-16 `main` was pushed in a state that could not build:
 *
 *     Could not resolve "./pages/Security" from "src/app/routes.tsx"
 *
 * `routes.tsx` was committed importing two page files and `index.tsx` was
 * committed importing a server module, and none of the three was in any commit.
 * Vercel failed every build for the best part of an hour and no frontend change
 * shipped, including a day's work.
 *
 * HOW A WORKING TREE HIDES IT
 *
 * Two agents were editing `routes.tsx` and `supabase/functions/server/index.tsx`
 * at the same time. Each one's route registration landed in the OTHER one's
 * commit, while each one's new page file stayed untracked. Neither session could
 * see the other's staging area, and both working trees were complete and built
 * fine — because the untracked files were sitting right there on disk.
 *
 * That is the part worth understanding: **`npm run precommit` cannot catch
 * this.** Tests, typecheck, smoke and even `vite build` all read the working
 * tree, where the file exists. The only place the problem is visible is the
 * index, and nothing was looking there.
 *
 * WHY IT READS THE INDEX AND NOT THE WORKING TREE
 *
 * The index IS "what this commit will contain", so the question asked here is
 * the one that matters — *if I commit now, will the tree still build?* — rather
 * than *does my checkout work*, which was already answering yes throughout.
 *
 * A file with unstaged edits is therefore read with `git show :path`, not off
 * disk. Everything else is read off disk, because for an unmodified file the
 * two are the same and ~900 extra git processes are not free on Windows.
 *
 * WHY IT CHECKS EVERY TRACKED FILE, NOT JUST THE CHANGED ONES
 *
 * Because the other half of that incident was somebody ELSE's commit leaving a
 * dangling import, and the session that could have noticed had not touched the
 * file. A check scoped to the diff would have passed for both of us.
 *
 * WHY NOT JUST RUN THE BUILD
 *
 * `vite build` from a clean stash is the thorough answer and takes a minute,
 * and a check that takes a minute before every commit is a check people turn
 * off. This is seconds. The build stays the backstop, and `--build` runs it.
 *
 * WHY THE EXCLUSIONS AND THE COMMENT STRIPPING MATTER
 *
 * The first version of this script reported 22 problems and every one was
 * false: imports inside `/** @example *\/` blocks, and retired server code
 * whose siblings were deliberately left behind when the directory was moved. A
 * check that cries wolf twenty-two times is a check nobody runs — which is the
 * same failure as not having one. So comments are stripped properly, from whole
 * files rather than from isolated grep lines, and only code that is actually
 * built or run is examined.
 *
 * WHAT IT DOES NOT CLAIM
 *
 * Relative specifiers only: a bare one is npm's or Deno's to resolve, and a
 * missing dependency is a different failure with its own message. It does not
 * type-check — a resolved import of the wrong shape is typecheck's job.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const wantBuild = process.argv.includes('--build');

const git = (args, allowFail = false) => {
  const r = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (!allowFail && r.status !== 0) {
    console.error(`git ${args.join(' ')} failed:\n${r.stderr || ''}`);
    process.exit(2);
  }
  return r.stdout ?? '';
};

/* ── what is in the commit, and what of it is actually built ────────────── */

const tracked = new Set(
  git(['ls-files']).split('\n').map((l) => l.trim()).filter(Boolean),
);
if (tracked.size === 0) {
  console.error('No files in the index. Is this a git repository?');
  process.exit(2);
}

/** Roots whose imports have to resolve for something to build or run. */
const ROOTS = ['src/', 'supabase/functions/', 'scripts/', 'tests/'];

/**
 * Deliberately not examined.
 *
 * `_retired/` is code moved out of the build on purpose; its siblings were not
 * moved with it and its imports have dangled ever since, by choice.
 * `server-dist/` is a build output and gitignored, so it is never in the index
 * anyway — listed for the reader rather than for the filter.
 */
const SKIP = ['supabase/functions/_retired/', 'supabase/functions/server-dist/'];

const SOURCE = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

const checkable = [...tracked].filter((p) =>
  SOURCE.test(p) && ROOTS.some((r) => p.startsWith(r)) && !SKIP.some((s) => p.startsWith(s)));

/**
 * Paths whose INDEX content differs from disk — i.e. edited and not staged.
 * Only these need a git read; for the rest, disk is the index.
 *
 * Porcelain's second column is the working-tree status. `M`, `D` or `?` there
 * means disk has drifted from the index.
 */
const dirtyOnDisk = new Set(
  git(['status', '--porcelain', '-z']).split('\0').filter(Boolean)
    .filter((entry) => entry.length > 3 && entry[1] !== ' ')
    .map((entry) => entry.slice(3)),
);

const contentOf = (path) => {
  if (dirtyOnDisk.has(path)) return git(['show', `:${path}`], true);
  try {
    return readFileSync(path, 'utf8');
  } catch {
    // Staged-but-deleted from disk, or a path git quotes oddly. Fall back.
    return git(['show', `:${path}`], true);
  }
};

/* ── read the code, not the prose around it ─────────────────────────────── */

/**
 * Remove comments and string-ish noise that could hold an import-shaped
 * phrase, while preserving the line structure so reported line numbers are
 * still the ones in the file.
 *
 * Block comments are the reason this reads whole files: `/** @example` blocks
 * put real-looking `import … from './x'` lines in the middle of a file, and
 * from a single grep line there is no way to know you are inside one.
 */
function stripComments(source) {
  let out = '';
  let i = 0;
  const n = source.length;
  let state = 'code'; // code | line | block | single | double | template
  while (i < n) {
    const c = source[i];
    const next = source[i + 1];
    if (state === 'code') {
      if (c === '/' && next === '/') { state = 'line'; i += 2; continue; }
      if (c === '/' && next === '*') { state = 'block'; i += 2; continue; }
      if (c === "'") { state = 'single'; out += c; i += 1; continue; }
      if (c === '"') { state = 'double'; out += c; i += 1; continue; }
      if (c === '`') { state = 'template'; out += c; i += 1; continue; }
      out += c; i += 1; continue;
    }
    if (state === 'line') {
      if (c === '\n') { state = 'code'; out += '\n'; }
      i += 1; continue;
    }
    if (state === 'block') {
      if (c === '*' && next === '/') { state = 'code'; i += 2; continue; }
      // Keep newlines so line numbers survive.
      if (c === '\n') out += '\n';
      i += 1; continue;
    }
    // Inside a string: copy through, honouring escapes, so a quote in a
    // comment-looking string cannot end it early.
    if (c === '\\') { out += c + (next ?? ''); i += 2; continue; }
    out += c;
    if ((state === 'single' && c === "'") || (state === 'double' && c === '"')
      || (state === 'template' && c === '`')) state = 'code';
    i += 1;
  }
  return out;
}

/* ── resolve each specifier the way a bundler would ─────────────────────── */

const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"](\.{1,2}\/[^'"]*)['"]/g;

const CANDIDATES = (base) => [
  base,
  `${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}.jsx`, `${base}.mjs`, `${base}.cjs`,
  `${base}/index.ts`, `${base}/index.tsx`, `${base}/index.js`, `${base}/index.jsx`,
  // `./thing.js` in TypeScript usually means `./thing.ts` on disk.
  base.endsWith('.js') ? `${base.slice(0, -3)}.ts` : null,
  base.endsWith('.js') ? `${base.slice(0, -3)}.tsx` : null,
].filter(Boolean);

/** POSIX join — git paths are always forward-slashed. */
function resolve(fromFile, specifier) {
  const parts = fromFile.split('/').slice(0, -1).concat(specifier.split('/'));
  const out = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') { out.pop(); continue; }
    out.push(part);
  }
  return out.join('/');
}

const problems = [];

for (const file of checkable) {
  const code = stripComments(contentOf(file));
  const lines = code.split('\n');
  for (let l = 0; l < lines.length; l += 1) {
    for (const match of lines[l].matchAll(SPECIFIER)) {
      const raw = match[1].split('?')[0];
      if (!raw) continue;
      const base = resolve(file, raw);
      if (CANDIDATES(base).some((c) => tracked.has(c))) continue;
      problems.push({ file, line: l + 1, specifier: match[1], resolved: base });
    }
  }
}

/* ── report ─────────────────────────────────────────────────────────────── */

if (problems.length > 0) {
  console.error(`\n${problems.length} import(s) point at a file git does not have.\n`);
  console.error('This is what broke main on 2026-10-16: the file is on your disk, so your');
  console.error('build works and nobody else\'s does.\n');

  const untracked = new Set(
    git(['ls-files', '--others', '--exclude-standard']).split('\n').map((l) => l.trim()).filter(Boolean),
  );

  for (const p of problems) {
    console.error(`  ${p.file}:${p.line}`);
    console.error(`      imports ${p.specifier}`);
    const onDisk = CANDIDATES(p.resolved).find((c) => untracked.has(c));
    if (onDisk) {
      // Nearly always the real cause, and the fix is one command.
      console.error(`      ${onDisk} is on disk and UNTRACKED — \`git add ${onDisk}\``);
    } else {
      console.error(`      nothing at ${p.resolved}{,.ts,.tsx,.js,/index.ts…}`);
    }
    console.error('');
  }
  process.exit(1);
}

console.log(`imports: ${checkable.length} built files, every relative import resolves to a tracked file.`);

/* ── the backstop, on request ───────────────────────────────────────────── */

if (wantBuild) {
  console.log('\nbuilding the index, with the working tree stashed…');
  const stash = spawnSync('git', ['stash', 'push', '-u', '-q', '-m', 'checkImports --build'], { encoding: 'utf8' });
  if (stash.status !== 0) {
    console.error('Could not stash, so the build would have read your working tree. Not run.');
    process.exit(2);
  }
  const build = spawnSync('npx', ['vite', 'build'], { encoding: 'utf8', shell: true });
  // Restored whatever happened, including on a build failure or a throw above.
  spawnSync('git', ['stash', 'pop', '-q'], { encoding: 'utf8' });
  const output = `${build.stdout ?? ''}${build.stderr ?? ''}`;
  if (build.status !== 0) {
    console.error('\nThe index does not build:\n');
    console.error(output.split('\n').filter((l) => /error|Could not resolve|failed/i.test(l)).slice(0, 15).join('\n'));
    process.exit(1);
  }
  console.log('build: the index builds clean.');
}
