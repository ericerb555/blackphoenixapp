/**
 * Which pages could a change possibly have broken?
 *
 * WHY THIS EXISTS
 *
 * The smoke test mounted all three hundred and thirty pages every time, which
 * took six minutes. As a check that runs before every commit that is too slow
 * to actually run, and a check people skip is worse than no check because it
 * gives false comfort.
 *
 * Almost every commit touches a handful of files. This walks the import graph
 * backwards from those files to the pages that reach them, so a typical change
 * smoke-tests two or three pages in a few seconds rather than all of them in
 * six minutes.
 *
 * HOW IT DECIDES
 *
 * A page is affected when it imports the changed file, or imports something
 * that does, to any depth. Shared things therefore pull in a lot — touching the
 * house model reaches every trade, which is correct, because it can break every
 * trade.
 *
 * WHERE IT DELIBERATELY GIVES UP
 *
 * Change `routes.tsx` itself, or anything the whole app hangs off — App,
 * main, a context provider — and it returns everything. Working out the real
 * blast radius of a change to the route map is not worth the risk of getting
 * it wrong, and those files are rarely touched.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');
const EXTS = ['.ts', '.tsx', '.js', '.jsx'];

/** Files that mean "test everything" when they change. */
const GLOBAL = [
  'src/app/routes.tsx',
  'src/app/App.tsx',
  'src/main.tsx',
  'src/app/main.tsx',
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    // Editor backups carry a commit subject in their filename and ship nothing.
    if (name.includes('~')) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (EXTS.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
}

/** Resolve an import specifier to a real file, or null if it leaves src. */
function resolveImport(fromFile, spec) {
  let base;
  if (spec.startsWith('.')) base = resolve(dirname(fromFile), spec);
  else if (spec.startsWith('@/')) base = join(SRC, spec.slice(2));
  else if (spec.startsWith('/')) base = join(ROOT, spec.slice(1));
  else return null; // a package

  for (const cand of [
    base,
    ...EXTS.map((e) => base + e),
    ...EXTS.map((e) => join(base, 'index' + e)),
  ]) {
    if (existsSync(cand) && statSync(cand).isFile()) return cand;
  }
  return null;
}

const IMPORT_RE = /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s*['"]([^'"]+)['"]/g;
const DYNAMIC_RE = /import\(\s*['"]([^'"]+)['"]\s*\)/g;

/** file -> the files it imports. */
export function buildGraph() {
  const files = walk(SRC);
  const imports = new Map();
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    const found = new Set();
    for (const re of [IMPORT_RE, DYNAMIC_RE]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(src))) {
        const target = resolveImport(f, m[1]);
        if (target) found.add(target);
      }
    }
    imports.set(f, found);
  }
  return imports;
}

/** route name -> the file that page lives in. */
export function routeFiles() {
  const routesPath = join(SRC, 'app', 'routes.tsx');
  const src = readFileSync(routesPath, 'utf8');

  const byComponent = new Map();
  const lazyRe = /const\s+(\w+)\s*=\s*lazy\(\s*\(\)\s*=>\s*import\(\s*["']([^"']+)["']/g;
  let m;
  while ((m = lazyRe.exec(src))) {
    const file = resolveImport(routesPath, m[2]);
    if (file) byComponent.set(m[1], file);
  }
  // Components imported directly rather than lazily.
  const plainRe = /import\s+(?:\{[^}]*\}|(\w+))\s*from\s*["'](\.[^"']+)["']/g;
  while ((m = plainRe.exec(src))) {
    if (!m[1]) continue;
    const file = resolveImport(routesPath, m[2]);
    if (file) byComponent.set(m[1], file);
  }

  const out = new Map();
  const entryRe = /["']([a-z0-9-]+)["']\s*:\s*(\w+)\s*,/g;
  while ((m = entryRe.exec(src))) {
    const file = byComponent.get(m[2]);
    if (file) out.set(m[1], file);
  }
  return out;
}

/** Files changed against HEAD, including untracked ones. */
export function changedFiles() {
  const run = (cmd) => {
    try { return execSync(cmd, { encoding: 'utf8' }); } catch { return ''; }
  };
  const lines = [
    ...run('git diff --name-only HEAD').split('\n'),
    ...run('git ls-files --others --exclude-standard').split('\n'),
  ];
  return [...new Set(lines.map((l) => l.trim()).filter(Boolean))]
    .filter((f) => EXTS.some((e) => f.endsWith(e)))
    .map((f) => join(ROOT, f))
    .filter((f) => existsSync(f));
}

/**
 * The routes a set of changed files could reach.
 *
 * Walks forward from each page and asks whether it arrives at a changed file,
 * memoising as it goes — a page's answer does not change between questions, and
 * without memoising a graph this size takes long enough to defeat the point.
 */
export function affectedRoutes(changed) {
  const rel = (f) => relative(ROOT, f).split(sep).join('/');
  if (changed.some((f) => GLOBAL.includes(rel(f)))) return null; // means: everything

  const graph = buildGraph();
  const routes = routeFiles();
  const changedSet = new Set(changed.map((f) => resolve(f)));
  const memo = new Map();

  function reaches(file, seen = new Set()) {
    const key = resolve(file);
    if (changedSet.has(key)) return true;
    if (memo.has(key)) return memo.get(key);
    if (seen.has(key)) return false; // a cycle; this branch adds nothing
    seen.add(key);

    let hit = false;
    for (const dep of graph.get(key) || []) {
      if (reaches(dep, seen)) { hit = true; break; }
    }
    // Only memoise a definite yes. A no reached through a cycle is only a no
    // for this particular walk, and caching it would hide real dependencies.
    if (hit) memo.set(key, true);
    return hit;
  }

  const out = [];
  for (const [route, file] of routes) {
    if (reaches(file)) out.push(route);
  }
  return out.sort();
}

// Run directly for a quick look at what a change touches. Guarded on the
// argument rather than on import.meta.url, which is not comparable when this
// file is imported rather than executed.
if (process.argv[1] && process.argv[1].endsWith('affected.mjs')) {
  const changed = changedFiles();
  console.log(`${changed.length} changed file(s)`);
  for (const f of changed) console.log('  ' + relative(ROOT, f));
  const routes = affectedRoutes(changed);
  if (routes === null) {
    console.log('\nA shared entry point changed — every page is affected.');
  } else {
    console.log(`\n${routes.length} affected route(s)`);
    for (const r of routes) console.log('  ' + r);
  }
}
