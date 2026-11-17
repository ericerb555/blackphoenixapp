#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
/** Pull the wall's own lists out of index.tsx, so the tiers are not guessed. */
const idx = fs.readFileSync("supabase/functions/server/index.tsx", 'utf8');

function listNamed(name) {
  const at = idx.indexOf(`const ${name}`);
  if (at === -1) return [];
  const open = idx.indexOf('[', at);
  let depth = 0, end = open;
  for (let i = open; i < idx.length; i++) {
    if (idx[i] === '[') depth++;
    else if (idx[i] === ']') { depth--; if (!depth) { end = i; break; } }
  }
  const block = idx.slice(open, end).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  return [...block.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

const PUBLIC_PREFIXES = listNamed('PUBLIC_PREFIXES');
const PUBLIC_GET_PREFIXES = listNamed('PUBLIC_GET_PREFIXES');
const PUBLIC_POST_PATHS = listNamed('PUBLIC_POST_PATHS');
const ADMIN_PREFIXES = listNamed('ADMIN_PREFIXES');
const USE_GUARDS = [...idx.matchAll(/app\.use\(\s*['"`]([^'"`]+)['"`]/g)].map((m) => m[1]);

function tierOf(method, route) {
  // routes are written either with the prefix or without it
  const p = route.startsWith('/make-server-3eae23a6')
    ? route.slice('/make-server-3eae23a6'.length)
    : route;
  const full = `/make-server-3eae23a6${p}`;
  const guard = USE_GUARDS.find((g) => {
    const stem = g.replace(/\*$/, '');
    return full.startsWith(stem) && stem.length > '/make-server-3eae23a6/'.length;
  });
  if (guard) return `middleware ${guard}`;
  if (PUBLIC_PREFIXES.some((x) => p.startsWith(x))) return 'PUBLIC';
  if (method === 'GET' && PUBLIC_GET_PREFIXES.some((x) => p.startsWith(x))) return 'PUBLIC';
  if (method === 'POST' && PUBLIC_POST_PATHS.includes(p)) return 'PUBLIC';
  if (ADMIN_PREFIXES.some((x) => p.startsWith(x))) return 'admin';
  return 'USER (any session)';
}

/**
 * Writes that take an id from the request, in three buckets.
 *
 * The earlier pass asked one question — "is there an authorisation marker?" —
 * and reported two kinds of false positive that cost real time:
 *
 *   design-links.tsx       passes `requireStaff` as PER-ROUTE middleware, so
 *                          the handler body never names it.
 *   rental-portals.tsx     `PATCH /tenant/leases/:id/sign` resolves
 *                          `intakeActor` and then compares the caller's email
 *                          to `lease.tenantEmail` INLINE. Textbook correct,
 *                          and flagged because the comparison is an
 *                          expression rather than a helper call.
 *
 * So it now asks two questions instead, which is the distinction that
 * actually matters:
 *
 *   A — is a caller resolved at all?
 *   B — is that caller compared against something on the RECORD?
 *
 *   no A        the worst: writes with no idea who is asking.
 *   A, no B     the IDOR class: knows who you are, does not check the record
 *               is yours. This is the shape of all 25 findings in section 1
 *               of docs/server-route-authorization.md.
 *   A and B     fine, and excluded.
 *
 * Staff-only routes are excluded wherever a staff check is present, because
 * "every staff member may touch every record" is a policy, not a bug.
 */


const DIR = 'supabase/functions/server';
const ROUTE = /\b(?:app|router|[A-Za-z_$][\w$]*Router)\s*\.\s*(get|post|put|patch|delete)\s*\(\s*[`'"]([^`'"]+)[`'"]/g;
const FROM_REQUEST = [/c\.req\.param\(/, /\breq\.param\(/, /body\?*\.\w*[Ii]d\b/, /body\?*\.email\b/];
const WRITES = [/kv\.set\(/, /kv\.del\(/, /kv\.mset\(/, /kv\.mdel\(/, /\.upsert\(/, /\.insert\(/, /\.update\(/];

const STAFF = [
  /requireStaff/, /isStaffRequest/, /intakeIsAdmin/, /rewardsAdmin/, /requireQuoteStaff/,
  /PLATFORM_OWNER_EMAILS/, /isTrustedStaff/, /STAFF_ROLE_SET/, /trustedRole/,
  /c\.get\(['"]admin['"]\)/, /\.staff\b/, /supplierAdminGuard/, /mayTouch/,
];
// A: somebody is identified
const RESOLVES = [
  /intakeActor\(/, /verifiedActor\(/, /financialActor\(/, /catalogActor\(/, /billingActor\(/,
  /landlordActor\(/, /rewardsActor\(/, /purchaseOrderActor\(/, /\bactor\(c\)/,
  /c\.get\(['"]actor['"]\)/, /auth\.getUser\(/, /\bresident\(/, /condoStanding\(/,
];
// B: that somebody is checked against the record, or a capability token is
const COMPARES = [
  /(?:user|who|actor|caller|me)\??\.(?:email|id)\s*\)?\s*(?:===|!==|==|!=)/,
  /(?:===|!==|==|!=)\s*String\((?:user|who|actor|caller)/,
  /toLowerCase\(\)\s*(?:===|!==)/,
  /mayReadRecord\(/, /ownerEmailOf\(/, /shareToken/, /junkLinkState/, /screeningToken/,
  /\.includes\(String\((?:user|who|actor)/, /ownedBy/, /intakeOwnedBy/,
];

const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const any = (res, s) => res.some((r) => r.test(s));

function bodyAfter(code, from) {
  const open = code.indexOf('{', from);
  if (open === -1) return '';
  let depth = 0;
  for (let i = open; i < code.length && i < open + 24000; i++) {
    if (code[i] === '{') depth++;
    else if (code[i] === '}') { depth--; if (!depth) return code.slice(open, i + 1); }
  }
  return code.slice(open, open + 24000);
}

const noCaller = [], noCheck = [];
for (const f of fs.readdirSync(DIR)) {
  if (!/\.tsx?$/.test(f)) continue;
  const code = strip(fs.readFileSync(path.join(DIR, f), 'utf8'));
  const useAt = code.indexOf('.use(');
  const moduleGuard = /\.use\(\s*['"`]\*['"`]\s*,/.test(code) && useAt > -1
    && any([...STAFF, ...RESOLVES], code.slice(0, useAt + 4000));
  ROUTE.lastIndex = 0;
  let m;
  while ((m = ROUTE.exec(code))) {
    const [, method, route] = m;
    const bodyStart = code.indexOf('{', m.index);
    const args = code.slice(m.index, bodyStart === -1 ? m.index : bodyStart);
    const body = bodyAfter(code, m.index);
    if (!any(WRITES, body) || !any(FROM_REQUEST, body)) continue;
    if (moduleGuard) continue;
    const scope = args + body;
    if (any(STAFF, scope)) continue;
    const row = { f, method: method.toUpperCase(), route: route.replace('/make-server-3eae23a6', ''), tier: tierOf(method.toUpperCase(), route) };
    if (!any(RESOLVES, scope)) noCaller.push(row);
    else if (!any(COMPARES, scope)) noCheck.push(row);
  }
}

const show = (title, rows) => {
  console.log(`\n${title} — ${rows.length}`);
  const byFile = {};
  for (const r of rows) (byFile[r.f] ||= []).push(r);
  for (const [f, rs] of Object.entries(byFile).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${f}  (${rs.length})`);
    for (const r of rs) console.log(`      ${r.method.padEnd(6)} ${r.route.slice(0, 50).padEnd(50)} ${r.tier}`);
  }
};
show('A. WRITES WITH NO CALLER RESOLVED AT ALL', noCaller);
show('B. CALLER RESOLVED, NEVER COMPARED TO THE RECORD (the IDOR class)', noCheck);
