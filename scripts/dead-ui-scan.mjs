#!/usr/bin/env node
/**
 * Buttons that cannot work, found without clicking 4,498 of them.
 *
 * WHY THIS EXISTS
 *
 * The audit asks for every interactive element to be clicked in every role.
 * At twenty seconds each that is about twenty-five hours of machine time for
 * one role. Clicking is still the only way to prove a button DOES work — but
 * three failure modes can be proven WITHOUT clicking, because the evidence is
 * in the source:
 *
 *   A  a button with no handler at all          it cannot do anything
 *   B  a handler that navigates to a route that does not exist
 *   C  a handler that reports success with no network call behind it
 *
 * C is the one that cost real time: the User Management Hub's "Add New" had
 * no handler and sat above invented statistics reading "24 Total / 18 Active"
 * on a platform with ten accounts. A screen that looks like it works is worse
 * than an empty one.
 *
 * WHAT THIS IS NOT
 *
 * It cannot tell you a button works. A handler that calls the right endpoint
 * with the wrong argument looks identical to a correct one here. This narrows
 * 4,498 buttons to a list short enough to open by hand, and nothing more.
 */
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'src/app';
const ROUTES_FILE = 'src/app/routes.tsx';

/** Every route key the app can resolve, from routes.tsx. */
function knownRoutes() {
  const txt = fs.readFileSync(ROUTES_FILE, 'utf8');
  const keys = new Set();
  for (const m of txt.matchAll(/^\s*"([a-z0-9-]+)"\s*:/gm)) keys.add(m[1]);
  return keys;
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(p)) out.push(p);
  }
  return out;
}

/**
 * Remove comments WITHOUT moving anything.
 *
 * The first version deleted comment text outright, so every line number
 * reported after a comment was wrong — and this file's own findings pointed
 * at an `<input>` forty lines from the button they meant. A report whose line
 * numbers are wrong is worse than no report: it sends somebody to the wrong
 * place and costs them the trust they had in the rest of it.
 *
 * So comments are replaced by the same number of newlines they occupied, and
 * every offset in the file stays exactly where it was.
 */
const strip = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
   .replace(/^(\s*)\/\/.*$/gm, (_m, indent) => indent);

/** The body of an arrow handler starting at `from`, by brace matching. */
function handlerBody(code, from) {
  const open = code.indexOf('{', from);
  if (open === -1 || open - from > 120) return '';
  let depth = 0;
  for (let i = open; i < code.length && i < open + 4000; i++) {
    if (code[i] === '{') depth++;
    else if (code[i] === '}') { depth--; if (!depth) return code.slice(open, i + 1); }
  }
  return '';
}

const routes = knownRoutes();
const files = walk(SRC);
const noHandler = [], badRoute = [], fakeSuccess = [], allTalk = [];

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  const code = strip(raw);

  // ── A. <button> with no onClick, no type=submit, no form= ──────────────
  for (const m of code.matchAll(/<button\b([^>]*)>/g)) {
    const attrs = m[1];
    if (attrs.includes('onClick')) continue;
    if (/type\s*=\s*["']submit["']/.test(attrs)) continue;   // a form submits it
    if (attrs.includes('form=')) continue;
    if (attrs.includes('{...')) continue;                     // spread props may carry it
    const line = code.slice(0, m.index).split('\n').length;
    noHandler.push({ file, line });
  }

  // ── B. navigate('somewhere') where somewhere is not a route ────────────
  for (const m of code.matchAll(/navigate\(\s*['"`]\/?([a-z0-9-]+)['"`]/g)) {
    const target = m[1];
    if (routes.has(target)) continue;
    const line = code.slice(0, m.index).split('\n').length;
    badRoute.push({ file, line, target });
  }

  /*
   * C is split, because "no network call" is not the same as "a lie".
   *
   * A handler may legitimately change local state and say so —
   * `setWeatherSource('demo'); toast.success('Weather source set to Demo')`
   * did exactly what it claimed. A handler may call a prop the parent
   * persists. Neither is a defect, and reporting them as one is how a list
   * gets ignored.
   *
   * C1 is the hard class: the ENTIRE body is a toast or an alert. There is
   * no state change, no prop call, nothing. The user is told something
   * happened and nothing happened — "Deal approved!", "Reward payment
   * processed". Those need no judgement call.
   *
   * C2 is everything else that claims success without reaching the server:
   * real work may be happening locally, and each one needs reading.
   */
  for (const m of code.matchAll(/onClick=\{/g)) {
    const body = handlerBody(code, m.index);
    if (!body) continue;
    if (!/toast\.success|toast\.info|alert\(/.test(body)) continue;
    const line = code.slice(0, m.index).split('\n').length;
    // strip the arrow wrapper and whitespace to see what the body really is
    // The body arrives with its arrow wrapper still on:
    // "{() => toast.success('…')}". Strip the braces, then the arrow, to see
    // what the handler actually consists of.
    const inner = body
      .replace(/^\{/, '').replace(/\}$/, '').trim()
      .replace(/^(?:async\s*)?\([^)]*\)\s*=>\s*/, '').trim()
      .replace(/^\{/, '').replace(/\}$/, '').trim();
    const onlyTalk = /^(?:toast\.(?:success|info)|alert)\([^;]*\)\s*;?$/.test(inner);
    if (onlyTalk) {
      allTalk.push({ file, line, snippet: inner.replace(/\s+/g, ' ').slice(0, 96) });
      continue;
    }
    if (/fetch\(|await |supabase\.|\.mutate\(/.test(body)) continue;
    fakeSuccess.push({ file, line, snippet: inner.replace(/\s+/g, ' ').slice(0, 90) });
  }
}

const BS = String.fromCharCode(92);
const rel = (f) => f.split(BS).join('/');
const show = (title, rows, fmt) => {
  console.log(`\n${title} — ${rows.length}`);
  const byFile = {};
  for (const r of rows) (byFile[rel(r.file)] ||= []).push(r);
  const limit = process.env.FULL ? 999 : 25;
  for (const [f, rs] of Object.entries(byFile).sort((a, b) => b[1].length - a[1].length).slice(0, limit)) {
    console.log(`  ${f}  (${rs.length})`);
    for (const r of rs.slice(0, process.env.FULL ? 999 : 4)) console.log(`      ${fmt(r)}`);
    if (!process.env.FULL && rs.length > 4) console.log(`      …and ${rs.length - 4} more`);
  }
  if (Object.keys(byFile).length > 25) console.log(`  …and ${Object.keys(byFile).length - 25} more files`);
};

show('A. BUTTONS WITH NO HANDLER AT ALL', noHandler, (r) => `line ${r.line}`);
show('B. NAVIGATION TO A ROUTE THAT DOES NOT EXIST', badRoute, (r) => `line ${r.line} -> "${r.target}"`);
show('C1. THE WHOLE HANDLER IS A MESSAGE — nothing happens', allTalk, (r) => `line ${r.line}  ${r.snippet}`);
show('C2. CLAIMS SUCCESS WITHOUT REACHING THE SERVER', fakeSuccess, (r) => `line ${r.line}  ${r.snippet}`);

console.log(`\nscanned ${files.length} files`);
console.log(`A ${noHandler.length}   B ${badRoute.length}   C1 ${allTalk.length}   C2 ${fakeSuccess.length}`);
