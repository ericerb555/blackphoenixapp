/**
 * What it would cost to move a block of `index.tsx` out into its own router.
 *
 * WHY THIS IS A SCRIPT AND NOT A CAREFUL READ
 *
 * `index.tsx` is 22,858 lines holding 510 inline route handlers and ~340
 * top-level declarations. The question that decides whether an extraction is
 * safe is "does anything on the other side of the cut use a name defined on
 * this side", and answering that by eye over a file that long is not a check,
 * it is a hope. The one time it is wrong, the symptom is a route that throws
 * at runtime on a path nobody tests — which is exactly how the two failures
 * recorded in `tasks/phases.md` reached production.
 *
 * So the cut is proposed by hand and the dependencies are counted by machine.
 *
 * WHAT IT DOES
 *
 * Finds every top-level declaration and every top-level `app.<verb>(...)`
 * block, with real extents worked out by balancing brackets rather than by
 * guessing at blank lines. Then, for a named group of routes, reports the two
 * things that can go wrong:
 *
 *   ESCAPING    defined inside the block, used outside it. Each one has to
 *               stay behind, be exported, or move with the block.
 *   INCOMING    defined outside the block, used inside it. Each one has to be
 *               imported, duplicated, or moved too.
 *
 * A block with nothing in either list is a clean lift. Nothing in this file
 * writes to `index.tsx`; it only tells you what the move involves.
 *
 * USAGE
 *
 *   node scripts/indexSplit.mjs --list
 *   node scripts/indexSplit.mjs --prefix landlord,tenant,screening
 *   node scripts/indexSplit.mjs --range 8987-12900
 */
import { readFileSync } from 'node:fs';

const FILE = 'supabase/functions/server/index.tsx';
const MOUNT = '/make-server-3eae23a6';

const src = readFileSync(FILE, 'utf8');
const lines = src.split(/\r?\n/);

/**
 * Strip the things that look like code and are not.
 *
 * Comments and string bodies both contain identifiers, and counting those as
 * references is how a clean block acquires imaginary dependencies. Template
 * literals are deliberately left alone apart from their `${}` holes, because
 * an interpolation is real code and the HTML around it is not.
 */
function decommented(text) {
  let out = '';
  let i = 0;
  let state = 'code';
  let quote = '';
  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];
    if (state === 'code') {
      if (ch === '/' && next === '*') { state = 'block'; i += 2; continue; }
      if (ch === '/' && next === '/') { state = 'line'; i += 2; continue; }
      if (ch === '"' || ch === "'" || ch === '`') { state = 'str'; quote = ch; out += ' '; i++; continue; }
      out += ch; i++; continue;
    }
    if (state === 'block') {
      if (ch === '*' && next === '/') { state = 'code'; i += 2; continue; }
      out += ch === '\n' ? '\n' : ' '; i++; continue;
    }
    if (state === 'line') {
      if (ch === '\n') { state = 'code'; out += '\n'; i++; continue; }
      i++; continue;
    }
    // inside a string
    if (ch === '\\') { out += '  '; i += 2; continue; }
    if (ch === quote) { state = 'code'; out += ' '; i++; continue; }
    if (quote === '`' && ch === '$' && next === '{') {
      // Keep the interpolation, drop the literal around it.
      let depth = 1; let j = i + 2; let inner = '';
      while (j < text.length && depth > 0) {
        if (text[j] === '{') depth++;
        else if (text[j] === '}') depth--;
        if (depth > 0) inner += text[j];
        j++;
      }
      out += ' ' + inner + ' ';
      i = j; continue;
    }
    out += ch === '\n' ? '\n' : ' '; i++;
  }
  return out;
}

const clean = decommented(src);
const cleanLines = clean.split('\n');

/** Where a top-level construct starting on `start` ends, by bracket balance. */
function extentFrom(start) {
  let depth = 0;
  let seen = false;
  for (let n = start; n < cleanLines.length; n++) {
    for (const ch of cleanLines[n]) {
      if (ch === '{' || ch === '(' || ch === '[') { depth++; seen = true; }
      else if (ch === '}' || ch === ')' || ch === ']') depth--;
    }
    if (seen && depth <= 0) return n;
    if (!seen && /;\s*$/.test(cleanLines[n])) return n;
  }
  return cleanLines.length - 1;
}

const DECL = /^(?:export\s+)?(?:async\s+)?(?:const|let|var|function|class|type|interface|enum)\s+([A-Za-z_$][\w$]*)/;
const ROUTE = /^app\.(get|post|put|patch|delete|all|use)\(\s*["'`]([^"'`]*)/;

const decls = [];
const routes = [];

for (let n = 0; n < cleanLines.length; n++) {
  const raw = lines[n];
  const m = DECL.exec(raw);
  if (m) {
    decls.push({ name: m[1], start: n, end: extentFrom(n) });
    continue;
  }
  const r = ROUTE.exec(raw);
  if (r) {
    const path = r[2].startsWith(MOUNT) ? r[2].slice(MOUNT.length) : r[2];
    routes.push({ verb: r[1], path, start: n, end: extentFrom(n) });
  }
}

/** Every identifier referenced in a line span, ignoring property accesses. */
function identsIn(from, to) {
  const text = cleanLines.slice(from, to + 1).join('\n');
  const found = new Set();
  const re = /(\.\s*)?\b([A-Za-z_$][\w$]*)\b/g;
  let m;
  while ((m = re.exec(text))) {
    if (m[1]) continue; // a property, not a free name
    found.add(m[2]);
  }
  return found;
}

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};

if (args.includes('--list') || args.length === 0) {
  const groups = new Map();
  for (const r of routes) {
    const key = r.path.replace(/^\//, '').split('/')[0] || '(root)';
    const g = groups.get(key) || { key, count: 0, lines: 0, min: Infinity, max: 0 };
    g.count++;
    g.lines += r.end - r.start + 1;
    g.min = Math.min(g.min, r.start + 1);
    g.max = Math.max(g.max, r.end + 1);
    groups.set(key, g);
  }
  const rows = [...groups.values()].sort((a, b) => b.lines - a.lines);
  console.log(`${routes.length} inline routes, ${decls.length} top-level declarations, ${lines.length} lines\n`);
  console.log('group                     routes   lines   span');
  for (const g of rows.slice(0, 30)) {
    console.log(
      g.key.padEnd(24),
      String(g.count).padStart(6),
      String(g.lines).padStart(7),
      `  ${g.min}-${g.max}`,
    );
  }
  process.exit(0);
}

// Work out the block under consideration.
let lo, hi, label;
const range = flag('--range');
const prefixes = (flag('--prefix') || '').split(',').filter(Boolean);

if (range) {
  const [a, b] = range.split('-').map(Number);
  lo = a - 1; hi = b - 1; label = `lines ${a}-${b}`;
} else if (prefixes.length) {
  const picked = routes.filter((r) => prefixes.some((p) => r.path.replace(/^\//, '').split('/')[0] === p));
  if (!picked.length) { console.error('no routes matched'); process.exit(1); }
  lo = Math.min(...picked.map((r) => r.start));
  hi = Math.max(...picked.map((r) => r.end));
  label = `${prefixes.join(', ')} — ${picked.length} routes`;
} else {
  console.error('need --list, --prefix or --range');
  process.exit(1);
}

const inside = (d) => d.start >= lo && d.end <= hi;

const definedInside = decls.filter(inside);
const definedOutside = decls.filter((d) => !inside(d));

const insideIdents = identsIn(lo, hi);

// Names declared inside the block that something outside still needs.
const escaping = [];
for (const d of definedInside) {
  const used = [];
  for (const other of [...decls, ...routes].filter((x) => !(x.start >= lo && x.end <= hi))) {
    if (identsIn(other.start, other.end).has(d.name)) {
      used.push(other.name || `${other.verb} ${other.path}`);
      if (used.length > 3) break;
    }
  }
  if (used.length) escaping.push({ name: d.name, line: d.start + 1, used });
}

// Names the block needs that are declared elsewhere in this same file.
const incoming = definedOutside
  .filter((d) => insideIdents.has(d.name))
  .map((d) => ({ name: d.name, line: d.start + 1 }));

const routesInside = routes.filter((r) => r.start >= lo && r.end <= hi);
const foreignRoutes = routesInside.filter(
  (r) => !prefixes.length || !prefixes.some((p) => r.path.replace(/^\//, '').split('/')[0] === p),
);

console.log(`\n=== ${label} ===`);
console.log(`span            lines ${lo + 1}-${hi + 1}  (${hi - lo + 1} lines)`);
console.log(`routes in span  ${routesInside.length}`);
console.log(`declarations    ${definedInside.length} defined inside\n`);

console.log(`ESCAPING — defined inside, used outside (${escaping.length})`);
for (const e of escaping) console.log(`  ${String(e.line).padStart(6)}  ${e.name}  <- ${e.used.slice(0, 3).join(', ')}`);
if (!escaping.length) console.log('  none — nothing outside depends on this block');

console.log(`\nINCOMING — defined outside, used inside (${incoming.length})`);
for (const i of incoming) console.log(`  ${String(i.line).padStart(6)}  ${i.name}`);
if (!incoming.length) console.log('  none');

if (prefixes.length) {
  console.log(`\nFOREIGN ROUTES caught in the span (${foreignRoutes.length})`);
  for (const r of foreignRoutes.slice(0, 40)) {
    console.log(`  ${String(r.start + 1).padStart(6)}  ${r.verb.toUpperCase().padEnd(6)} ${r.path}`);
  }
  if (foreignRoutes.length > 40) console.log(`  ... and ${foreignRoutes.length - 40} more`);
}
