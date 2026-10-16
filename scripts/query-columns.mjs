/**
 * Every table query the server runs, and the columns it filters or orders by.
 *
 *   node scripts/query-columns.mjs
 *
 * Written to answer "which columns should be indexed" with a list rather than
 * a hunch. It found 73 table/column pairs across 24 tables; the answer that
 * came out of comparing them against the indexes that exist is in
 * `supabase/migrations/20261016140000_index_the_foreign_keys.sql`, and the
 * short version is that almost none of them should be indexed, because an
 * index is only read when it is more selective than a scan.
 *
 * Re-run it after adding routes, and compare against pg_index before believing
 * anything is missing.
 *
 * Reads the Supabase client chains out of the source: `.from("x")` followed by
 * `.eq("col")`, `.in`, `.gte`, `.order` and the rest, up to the end of that
 * statement. Crude where a chain is built across several lines into a variable,
 * so the output is a starting point to verify, not a proof.
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'supabase/functions/server';

/** Filter and ordering methods whose first argument is a column name. */
const COLUMN_METHODS = [
  'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in',
  'contains', 'containedBy', 'order', 'match',
];

const usage = new Map(); // table -> Map(column -> {methods:Set, files:Set, count})

function note(table, column, method, file) {
  if (!usage.has(table)) usage.set(table, new Map());
  const cols = usage.get(table);
  if (!cols.has(column)) cols.set(column, { methods: new Set(), files: new Set(), count: 0 });
  const entry = cols.get(column);
  entry.methods.add(method);
  entry.files.add(file);
  entry.count += 1;
}

for (const name of fs.readdirSync(DIR)) {
  if (!/\.(ts|tsx)$/.test(name)) continue;
  const src = fs.readFileSync(path.join(DIR, name), 'utf8');

  const fromRe = /\.from\(\s*["'`]([A-Za-z0-9_]+)["'`]\s*\)/g;
  let m;
  while ((m = fromRe.exec(src))) {
    const table = m[1];
    // The chain runs until the statement ends. Take a generous window and stop
    // at the first `;` that is not inside the chain.
    const rest = src.slice(m.index + m[0].length, m.index + m[0].length + 900);
    const stop = rest.indexOf(';');
    const chain = stop === -1 ? rest : rest.slice(0, stop);

    if (!usage.has(table)) usage.set(table, new Map());

    for (const method of COLUMN_METHODS) {
      const re = new RegExp(`\\.${method}\\(\\s*["'\`]([A-Za-z0-9_.]+)["'\`]`, 'g');
      let c;
      while ((c = re.exec(chain))) note(table, c[1], method, name);
    }
  }
}

const rows = [];
for (const [table, cols] of usage) {
  for (const [column, info] of cols) {
    rows.push({
      table,
      column,
      uses: info.count,
      methods: [...info.methods].sort().join(','),
      files: info.files.size,
    });
  }
}

rows.sort((a, b) => a.table.localeCompare(b.table) || b.uses - a.uses);

console.log(`tables touched: ${usage.size}`);
console.log(`table/column filter pairs: ${rows.length}\n`);
for (const r of rows) {
  console.log(`${r.table.padEnd(28)} ${r.column.padEnd(24)} ${String(r.uses).padStart(3)}x  ${r.methods}`);
}
// Printed rather than written: this is a report to read, not an artefact to
// commit and let go stale.
