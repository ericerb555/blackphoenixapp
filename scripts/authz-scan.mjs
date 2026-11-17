#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
/** Pull the wall's own lists out of index.tsx, so the tiers are not guessed. */
const idx = fs.readFileSync("supabase/functions/server/index.tsx", 'utf8');

/**
 * Strip a line's trailing `//` comment WITHOUT breaking on apostrophes.
 *
 * THE BUG THIS FIXES MATTERED MORE THAN ANY FINDING. The first version
 * stripped only whole-line comments, so trailing ones survived:
 *
 *     '/leads/capture',     // the customer's enquiry form
 *     '/store-content',     // storefront copy and banners
 *
 * The apostrophe in "customer's" closed a quote that was never opened, every
 * quote pair after it shifted by one, and PUBLIC_PREFIXES came out as a mix of
 * real paths and comment fragments with `/store-content` missing entirely.
 *
 * The cost was not cosmetic: the scan then reported
 * `DELETE /store-content/reels/:id` as needing a session when that prefix is
 * PUBLIC. A security tool calling a public write authenticated is the exact
 * failure it exists to prevent — and it would have been wrong about every
 * prefix listed after the first apostrophe.
 *
 * Knowing whether a `//` is a comment or part of a string means tracking quote
 * state, so that is what this does. No regex can.
 */
const BACKSLASH = String.fromCharCode(92);

function stripTrailingComment(line) {
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === BACKSLASH) i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '/' && line[i + 1] === '/') return line.slice(0, i);
  }
  return line;
}

function listNamed(name) {
  const at = idx.indexOf(`const ${name}`);
  if (at === -1) return [];
  const open = idx.indexOf('[', at);
  let depth = 0, end = open;
  for (let i = open; i < idx.length; i++) {
    if (idx[i] === '[') depth++;
    else if (idx[i] === ']') { depth--; if (!depth) { end = i; break; } }
  }
  const block = idx.slice(open, end)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map(stripTrailingComment)
    .join('\n');
  return [...block.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
}

const PUBLIC_PREFIXES = listNamed('PUBLIC_PREFIXES');
const PUBLIC_GET_PREFIXES = listNamed('PUBLIC_GET_PREFIXES');
const PUBLIC_POST_PATHS = listNamed('PUBLIC_POST_PATHS');
const ADMIN_PREFIXES = listNamed('ADMIN_PREFIXES');
const USE_GUARDS = [...idx.matchAll(/app\.use\(\s*['"`]([^'"`]+)['"`]/g)].map((m) => m[1]);

/**
 * WHERE EACH ROUTER IS MOUNTED, because the registered path is not the path.
 *
 * `store-content.tsx` registers `delete('/posts/:id')` and index.tsx mounts it
 * with `app.route("/make-server-3eae23a6/store-content", …)`, so the path the
 * wall sees is `/store-content/posts/:id`. Asking the wall about `/posts/:id`
 * returned "any signed-in user" while the real answer is PUBLIC — a false
 * negative, and wrong for every sub-mounted router rather than just that one.
 */
const MOUNTS = (() => {
  const byVar = new Map();
  for (const m of idx.matchAll(/app\.route\(\s*["'`]([^"'`]*)["'`]\s*,\s*([A-Za-z_$][\w$]*)/g)) {
    byVar.set(m[2], m[1]);
  }
  return byVar;
})();

/** The router variable a module exports, so MOUNTS can be looked up. */
function routerVarOf(code) {
  const m = code.match(/export const ([A-Za-z_$][\w$]*)\s*=\s*new Hono\(\)/)
    || code.match(/const ([A-Za-z_$][\w$]*)\s*=\s*new Hono\(\)/);
  return m ? m[1] : null;
}

/** The path the wall actually sees. */
function fullPathOf(mount, route) {
  if (route.startsWith('/make-server-3eae23a6')) return route;
  const base = mount && mount !== '/' ? mount : '/make-server-3eae23a6';
  return (base + route).replace(/\/{2,}/g, '/');
}

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
  // A local actor helper's own admin flag. `discount-grants.tsx` gates both of
  // its write routes on `who.isAdmin` and was reported as unguarded without
  // this line — the module whose whole purpose is "who may grant a discount".
  /\.isAdmin\b/, /\.isOwner\b/, /isPlatformOwner/, /\.isMasterAdmin\b/,
  // Locally-defined guards. `store-content.tsx` has its own `requireAdmin`
  // that reads app_metadata and refuses a non-admin — and its two deletes are
  // PUBLIC at the wall, so that local guard is the only thing standing there.
  /requireAdmin/, /requireOwner/, /requireCompany/, /assertStaff/, /assertAdmin/,
  // The same flag under other names, each found by reading a lead and finding
  // it already correct: `me.admin` in unavailability.tsx, `actor.isCompany` in
  // vendor-billing.tsx, `actor.admin` in rental-portals.tsx.
  /\.admin\b/, /\.isCompany\b/, /\.isStaff\b/, /\.isLandlord\b/,
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
  // The comparison written the other way round — `existing.employeeId !== me.id`
  // rather than `me.id !== existing.employeeId`. Several leads were only this.
  /(?:===|!==|==|!=)\s*(?:String\()?\s*(?:user|who|actor|caller|me)\??\./,
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

/**
 * C — SCOPED BY CONSTRUCTION, which is stronger than comparing.
 *
 * `POST /landlord/tenants/:id/charge` resolves `landlordActor`, takes the
 * landlord's email FROM THE TOKEN, and then looks the tenant up inside that
 * landlord's own roster — `kv.get(landlordTenantsKey(landlordEmail))` — so a
 * tenant id belonging to somebody else is simply not in the list it searched.
 * There is no comparison to find because there is nothing to compare: the
 * caller's identity decided which records exist.
 *
 * That is better than fetch-then-compare, and the first version of this scan
 * called it a finding. A scanner that reports the strongest pattern in the
 * codebase as the weakest teaches people to ignore it.
 *
 * WRITTEN WITH STRING OPERATIONS, NOT REGEXES, DELIBERATELY. Three attempts
 * with `new RegExp` on a built-up pattern lost a backslash at some layer
 * between here and the file, and a regex that silently loses an escape stops
 * matching what it says it matches. There is nothing here a split and an
 * includes cannot do.
 *
 * Two steps: a variable assigned from the caller's email or id, then that same
 * variable used to build a storage key.
 */
const CALLER_WORDS = ['actor', 'user', 'who', 'caller', 'session'];

function callerDerivedNames(scope) {
  const names = [];
  for (const line of scope.split('\n')) {
    const decl = line.trim();
    if (!decl.startsWith('const ') && !decl.startsWith('let ')) continue;
    const eq = decl.indexOf('=');
    if (eq === -1) continue;
    const lhs = decl.slice(decl.indexOf(' ') + 1, eq).trim();
    const rhs = decl.slice(eq + 1);
    if (!/^[A-Za-z_$][\w$]*$/.test(lhs)) continue;
    const fromCaller = CALLER_WORDS.some((w) => rhs.includes(w))
      && (rhs.includes('.email') || rhs.includes('.id'));
    if (fromCaller) names.push(lhs);
  }
  return names;
}

/**
 * The same thing without the intermediate variable.
 *
 * `condoStanding(c, assocId)` reads `CONDO_GRANT(assocId, user.email)` — the
 * caller's grant ON THIS association — and `can()` answers false unless that
 * grant allows it. Scoped by construction twice over: the key carries both the
 * record and the caller. It was flagged because `user.email` goes straight
 * into the call and is never assigned to a `const`, which is all
 * `callerDerivedNames` knows how to find.
 */
/**
 * Delegated to a per-record standing helper.
 *
 * `condo-associations.tsx` calls `condoStanding(c, id)` and then
 * `standing.can('members')`. The scoping is real and is two layers deep: the
 * helper reads `CONDO_GRANT(assocId, user.email)` — the caller's grant on THIS
 * association — and `can()` answers false without it. None of that is visible
 * in the handler body, which is all this scan reads.
 *
 * Two signals, both distinctive of the pattern rather than of code in general:
 * a helper handed the request context AND a second argument, which for a
 * two-argument call means "this caller, this record"; and a capability test.
 *
 * This is the one place the scan deliberately risks a FALSE NEGATIVE. A
 * handler could call `thing(c, id)` and ignore the answer. The alternative was
 * reporting the most carefully authorised module on the server as the least,
 * which is how a tool gets switched off — and every cluster is read by hand
 * before anything is changed anyway.
 */
function delegatesStanding(scope) {
  if (scope.includes('.can(')) return true;
  return scope.split('\n').some((line) => line.includes('(c, ') && !line.includes('function'));
}

function scopedInline(scope) {
  return scope.split('\n').some((line) => {
    const caller = CALLER_WORDS.some((w) => line.includes(w + '.email') || line.includes(w + '.id'));
    if (!caller) return false;
    const key = line.includes('Key(') || line.includes('kv.get(') || line.includes('kv.set(')
      || /\b[A-Z][A-Z0-9_]{2,}\(/.test(line);
    return key;
  });
}

function scopedByKey(scope) {
  const names = callerDerivedNames(scope);
  if (!names.length) return false;
  return names.some((name) => scope.split('\n').some((line) => {
    if (!line.includes(name)) return false;
    // the name is being fed into a key, a template key, or a kv call
    return line.includes('Key(') || line.includes('${' + name) || line.includes('kv.');
  }));
}

const noCaller = [], noCheck = [];
for (const f of fs.readdirSync(DIR)) {
  if (!/\.tsx?$/.test(f)) continue;
  const code = strip(fs.readFileSync(path.join(DIR, f), 'utf8'));
  const mount = MOUNTS.get(routerVarOf(code));
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
    const full = fullPathOf(mount, route);
    const row = { f, method: method.toUpperCase(), route: full.replace('/make-server-3eae23a6', ''), tier: tierOf(method.toUpperCase(), full) };
    if (!any(RESOLVES, scope)) noCaller.push(row);
    else if (!any(COMPARES, scope) && !scopedByKey(scope) && !scopedInline(scope) && !delegatesStanding(scope)) noCheck.push(row);
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
