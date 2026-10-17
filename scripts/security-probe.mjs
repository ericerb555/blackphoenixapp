/**
 * The production security protocol, as something that runs.
 *
 *   node scripts/security-probe.mjs           every check
 *   node scripts/security-probe.mjs --quick   skip the dependency audit
 *   node scripts/security-probe.mjs --json    machine-readable, for CI
 *
 * WHY IT EXISTS
 *
 * On 2026-10-16 an outside-team audit probed production and found three things
 * worth fixing. Every one of them came from sending a request and reading the
 * answer; not one came from reading the source, which was accurate throughout.
 * A written checklist repeating that work would have been obsolete within a
 * month. This is the same audit, executable, so the answer is current rather
 * than remembered. The findings it was built from are in
 * tasks/security-audit-2026-10-16.md.
 *
 * WHAT IT CHECKS, AND WHY THESE
 *
 * Each check below is a control that (a) protects customer data, (b) is
 * invisible when it breaks, and (c) can be verified from outside with no
 * credentials. That last clause is the important one. A test needing the
 * service-role key proves what a privileged caller sees; these use only the
 * publishable key, which is what an attacker has, so a pass here is a
 * statement about the actual exposed surface.
 *
 * The silent-failure property is why this runs on a schedule rather than
 * living in someone's head. An authorisation gate that stops enforcing serves
 * every page perfectly. A security header dropped from vercel.json breaks
 * nothing a user would report. A retired API quietly redeployed answers
 * normally. All three are invisible until somebody else finds them.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * It does not sign in, write anything, or create accounts. The 2026-10-16
 * audit created three anonymous auth rows proving anonymous sign-in was open,
 * and that is exactly the kind of side effect a check running on every deploy
 * must not have. ANON-1 below therefore reads the published settings document
 * instead of minting a token — same answer, no residue.
 *
 * EXIT CODES
 *   0  every check passed
 *   1  at least one FAIL — a control that should be in place is not
 *   2  the probe itself could not run (network, bad target)
 *
 * WARN does not fail the build. It marks a control that is absent by choice
 * today and will become a FAIL once the roadmap item lands; promote it by
 * moving the check's `level` to 'fail'.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const QUICK = args.includes('--quick');
const JSON_OUT = args.includes('--json');

/**
 * The target, and why the key is read rather than typed.
 *
 * `src/app/utils/supabase/info.tsx` is what the shipped browser bundle uses,
 * so reading it here means this probe always tests the project the app
 * actually talks to. Hardcoding a ref would let the two drift, and the drift
 * would be silent: the probe would go on passing against an old project while
 * the live one regressed.
 */
function loadTarget() {
  const src = readFileSync(new URL('../src/app/utils/supabase/info.tsx', import.meta.url), 'utf8');
  const projectId = src.match(/projectId\s*=\s*["'`]([a-z0-9]+)["'`]/i)?.[1];
  const anonKey = src.match(/publicAnonKey\s*=\s*["'`](ey[\w.-]+)["'`]/)?.[1];
  if (!projectId || !anonKey) {
    throw new Error('Could not read projectId / publicAnonKey from src/app/utils/supabase/info.tsx');
  }
  return {
    projectId,
    anonKey,
    api: `https://${projectId}.supabase.co`,
    fn: `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`,
    site: process.env.SECURITY_PROBE_SITE || 'https://www.theblackphoenixcompany.com',
  };
}

const T = loadTarget();
const H = { apikey: T.anonKey, Authorization: `Bearer ${T.anonKey}` };

const results = [];
/**
 * `level` is what this check costs when it does not pass, decided when the
 * check is written; `ok` is what happened this run.
 *
 * A 'skip' stays a skip whatever `ok` says — a check that did not run must
 * never report as a pass. That distinction is the whole point: "we did not
 * look" and "we looked and it was fine" are the two answers a security report
 * must never blur, and the first version of this function blurred them,
 * printing `ok` for both --quick and a missing service key.
 */
const record = (id, level, title, detail, ok) =>
  results.push({
    id, level, title, detail,
    status: level === 'skip' ? 'SKIP' : ok ? 'PASS' : level.toUpperCase(),
  });

async function get(url, init = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 15000);
  try {
    const res = await fetch(url, { ...init, signal: ctl.signal });
    const body = await res.text().catch(() => '');
    return { status: res.status, body, headers: res.headers };
  } catch (err) {
    return { status: 0, body: String(err?.message || err), headers: new Headers() };
  } finally {
    clearTimeout(t);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH-1 — the authorisation gate is enforcing
//
// The single most important check here. This server holds the service-role
// key, which bypasses row-level security entirely, so this gate is the only
// thing between a stranger and every record in the business. It shipped in
// report-only mode first and was switched to enforcing afterwards — meaning
// there is a one-constant change that silently reopens all of it, and the app
// behaves identically either way.
//
// These paths were chosen as one per data class: money, people, applications,
// administration, and the developer endpoints.
// ─────────────────────────────────────────────────────────────────────────────
const GATED_PATHS = [
  'invoices', 'payments', 'customers', 'crm/contacts', 'portal-access',
  'users', 'applications', 'store/orders', 'market-alerts/preferences', 'dev/purge',
];

async function checkAuthGate() {
  const leaked = [];
  for (const p of GATED_PATHS) {
    const r = await get(`${T.fn}/${p}`, { headers: H });
    if (r.status !== 401 && r.status !== 403) leaked.push(`${p} → ${r.status}`);
  }
  record(
    'AUTH-1', 'fail',
    'Authorisation gate refuses anonymous callers',
    leaked.length
      ? `Reachable without a session: ${leaked.join(', ')}. Check AUTH_ENFORCE and the gate lists in supabase/functions/server/index.tsx.`
      : `All ${GATED_PATHS.length} sensitive routes answered 401/403.`,
    leaked.length === 0,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH-2 — /health is reachable
//
// The inverse check, and it is here to stop AUTH-1 passing for the wrong
// reason. A function that is down, misrouted, or refusing everything also
// returns 401 to all ten paths above, which looks like perfect security and is
// actually an outage. One route must answer 200 for AUTH-1 to mean anything.
// ─────────────────────────────────────────────────────────────────────────────
async function checkLiveness() {
  const r = await get(`${T.fn}/health`, { headers: H });
  record(
    'AUTH-2', 'fail',
    'API is actually up (so AUTH-1 is meaningful)',
    r.status === 200 ? 'Health endpoint answered 200.' : `Health answered ${r.status} — AUTH-1 may be passing because the function is down.`,
    r.status === 200,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANON-1 — anonymous sign-ins stay off
//
// With this on, one unauthenticated POST mints a valid `authenticated` JWT
// with no email, no password and no verification — which makes the
// `authenticated` role worthless as a trust boundary. Every Postgres and
// Supabase convention assumes otherwise, so the ordinary, correct-looking
// policy `TO authenticated USING (true)` becomes world-readable, and so does
// any route that checks `user?.id` rather than `user?.email`. That is the
// obvious thing to write, and it would pass review.
//
// It was found enabled on 2026-10-16 with nothing in the app using it. Read
// rather than exercised, deliberately — see the note at the top of this file.
// ─────────────────────────────────────────────────────────────────────────────
async function checkAnonymousSignIn() {
  const r = await get(`${T.api}/auth/v1/settings`, { headers: { apikey: T.anonKey } });
  let on = null;
  try { on = JSON.parse(r.body)?.external?.anonymous_users ?? null; } catch { /* handled below */ }
  record(
    'ANON-1', 'fail',
    'Anonymous sign-ins are disabled',
    on === null
      ? `Could not read auth settings (HTTP ${r.status}).`
      : on
        ? 'ENABLED. Anyone can mint an authenticated JWT with one unauthenticated request. Dashboard → Authentication → Sign In / Providers → turn off Anonymous sign-ins.'
        : 'Disabled.',
    on === false,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ANON-2 — leaked-password protection is on
//
// Supabase checks new passwords against HaveIBeenPwned when this is enabled.
// Off means a customer may set a password already published in a breach corpus,
// which is the single cheapest account-takeover route there is.
// ─────────────────────────────────────────────────────────────────────────────
async function checkPasswordPolicy() {
  const r = await get(`${T.api}/auth/v1/settings`, { headers: { apikey: T.anonKey } });
  let flag = null;
  try {
    const s = JSON.parse(r.body);
    flag = s?.password_hibp_enabled ?? s?.security?.password_hibp_enabled ?? null;
  } catch { /* handled below */ }
  /**
   * Three outcomes, not two, and the middle one is why.
   *
   * Supabase does not publish this flag in the anonymous settings document, so
   * `null` means "this probe cannot see it" — which is not the same as "it is
   * off" and must not be reported as a failure. Failing on unknown trains
   * people to ignore the report; passing on unknown is a lie. It is a skip,
   * with the dashboard path to check by hand.
   */
  if (flag === null) {
    record('ANON-2', 'skip', 'Leaked-password protection enabled',
      'Not published in the anonymous settings document. Verify by hand: Dashboard → Authentication → Policies.', true);
    return;
  }
  record(
    'ANON-2', 'fail',
    'Leaked-password protection enabled',
    flag ? 'Enabled.' : 'Disabled. Dashboard → Authentication → Policies → enable leaked password protection.',
    flag === true,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RLS-1 — the data tables give a stranger nothing
//
// Row-level security is the layer beneath the application, and the reason an
// application bug is not automatically a breach. These are read with the
// publishable key alone: the correct answer is an empty array (a policy
// matched nothing) or a permission error. Anything else is live data on the
// open internet.
//
// The KV stores are listed first because they hold essentially the whole
// business — invoices, customers, orders, applications.
// ─────────────────────────────────────────────────────────────────────────────
const RLS_TABLES = [
  'kv_store_3eae23a6', 'kv_store_57095a78', 'kv_store_824f083c', 'kv_store_12c91054',
  'private_cron_config', 'organizations', 'organization_members', 'companies',
  'investor_commitments', 'payout_distributions', 'investment_documents',
  'work_requests', 'bid_requests', 'bids', 'feature_grants', 'exchange_claim',
];

async function checkRls() {
  const exposed = [];
  for (const t of RLS_TABLES) {
    const r = await get(`${T.api}/rest/v1/${t}?select=*&limit=1`, { headers: H });
    // 401/403 = grant or policy refused it. 200 [] = policy matched nothing.
    // 200 with rows = a stranger is reading this table.
    if (r.status === 200 && r.body.trim() !== '[]') exposed.push(`${t} (${r.body.length} bytes)`);
  }
  record(
    'RLS-1', 'fail',
    'No table returns data to an unauthenticated reader',
    exposed.length
      ? `DATA EXPOSED: ${exposed.join(', ')}`
      : `All ${RLS_TABLES.length} tables returned empty or refused.`,
    exposed.length === 0,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RLS-2 — every public table has RLS switched on
//
// Distinct from RLS-1, which asks whether data leaks today. This asks whether
// the control exists at all. A table protected only by a missing GRANT reads
// as secure right up until somebody grants it, and `kv_archive_20261003` was
// found in exactly that state on 2026-10-16 — an archive of the entire KV
// store with RLS off, safe only because no role happened to hold SELECT.
//
// Needs the service-role key, so it is skipped rather than failed when absent:
// this probe's contract is that it runs in CI with no secrets.
// ─────────────────────────────────────────────────────────────────────────────
async function checkRlsEnabled() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    record('RLS-2', 'skip', 'Every public table has RLS enabled',
      'Skipped — set SUPABASE_SERVICE_ROLE_KEY to run this one.', true);
    return;
  }
  const r = await get(`${T.api}/rest/v1/rpc/_probe_rls_off`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  // No helper function deployed; report rather than invent one.
  record('RLS-2', 'skip', 'Every public table has RLS enabled',
    r.status === 404
      ? 'No _probe_rls_off helper deployed. Run the query in tasks/security-audit-2026-10-16.md by hand, or add the helper.'
      : `Helper answered ${r.status}: ${r.body.slice(0, 200)}`,
    true);
}

// ─────────────────────────────────────────────────────────────────────────────
// RETIRED-1 — the decommissioned API generations stay dead
//
// Three older servers were retired, each with its own copy of live business
// data and its own authorisation holes: one answered an unprivileged caller
// HTTP 200 for /customers, another had no authorisation at all on three
// payments modules. They are retired by an entrypoint line in
// supabase/config.toml that points at a stub.
//
// That line has been wrong once already. A deploy on 2026-08-17 named the full
// directory instead of the stub and silently un-retired an entire 509-route
// server, with service-role privileges, against live data, for about fifteen
// minutes. Nothing errored. This check is what would have caught it.
// ─────────────────────────────────────────────────────────────────────────────
const RETIRED = ['make-server-57095a78', 'make-server-824f083c', 'make-server-12c91054'];

async function checkRetired() {
  const alive = [];
  for (const fn of RETIRED) {
    for (const p of ['customers', 'invoices']) {
      const r = await get(`${T.api}/functions/v1/${fn}/${p}`, { headers: H });
      if (r.status !== 410 && r.status !== 401 && r.status !== 404) {
        alive.push(`${fn}/${p} → ${r.status}`);
      }
    }
  }
  record(
    'RETIRED-1', 'fail',
    'Retired API generations are still decommissioned',
    alive.length
      ? `UN-RETIRED: ${alive.join(', ')}. Check the entrypoint lines in supabase/config.toml point at the -stub directories.`
      : 'All three retired functions refused.',
    alive.length === 0,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HDR-1 — the browser-side security headers are present
//
// These bound the damage of a cross-site scripting flaw rather than preventing
// one, which is why they matter even with none known: they are what stands
// between a dependency CVE and a session-theft incident. Absent entirely as of
// 2026-10-16 except HSTS.
//
// frame-ancestors / X-Frame-Options is the one to care about most here — every
// portal is clickjackable without it.
// ─────────────────────────────────────────────────────────────────────────────
const HEADERS = [
  { key: 'strict-transport-security', level: 'fail', why: 'Forces HTTPS on return visits.' },
  { key: 'content-security-policy', level: 'warn', why: 'Bounds the blast radius of any XSS.' },
  { key: 'x-content-type-options', level: 'warn', why: 'Stops MIME sniffing.' },
  { key: 'referrer-policy', level: 'warn', why: 'Our URLs carry quote and screening tokens.' },
  { key: 'permissions-policy', level: 'warn', why: 'Denies camera/mic/geolocation by default.' },
];

async function checkHeaders() {
  const r = await get(T.site, { redirect: 'follow' });
  if (!r.status) {
    record('HDR-0', 'warn', 'Site reachable for header check', `Could not reach ${T.site}: ${r.body}`, false);
    return;
  }
  const csp = r.headers.get('content-security-policy');
  const frame = r.headers.get('x-frame-options') || (csp && /frame-ancestors/i.test(csp) ? 'via CSP' : null);
  record('HDR-FRAME', 'warn', 'Clickjacking protection (X-Frame-Options or frame-ancestors)',
    frame ? `Present: ${frame}` : 'ABSENT — every portal can be framed by a hostile site.', !!frame);

  for (const h of HEADERS) {
    const v = r.headers.get(h.key);

    /**
     * Report-only is progress, not a pass, and the report must say which.
     *
     * A CSP in report-only blocks nothing — it only tells us what it would
     * have blocked. Scoring that as present would turn the rollout plan in
     * docs/security/headers.md into a step nobody takes, because the probe
     * would already be green. It stays a warning, with the distinction
     * spelled out, until the header is renamed to the enforcing form.
     */
    if (!v && h.key === 'content-security-policy') {
      const ro = r.headers.get('content-security-policy-report-only');
      record(`HDR-${h.key}`, 'warn', h.key,
        ro ? 'Report-only deployed — reporting violations but blocking nothing. Promote per docs/security/headers.md.'
           : `Absent. ${h.why}`,
        false);
      continue;
    }
    record(`HDR-${h.key}`, h.level, h.key, v ? `Present: ${String(v).slice(0, 90)}` : `Absent. ${h.why}`, !!v);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HDR-CSP-HASH — the inline-script hashes in vercel.json still match index.html
//
// script-src allows two inline scripts by SHA-256 hash rather than by
// 'unsafe-inline', because allowing inline script is precisely what makes a
// CSP decorative against the attack it exists to stop.
//
// The cost of hashes is that they rot invisibly. Edit index.html by one
// character and the hash no longer matches: while the policy is report-only
// that is a violation report nobody is reading, and once it is enforcing the
// script simply stops running — no error, no clue, and the two scripts in
// question are a console filter and a service-worker cleanup, neither of which
// announces its own absence.
//
// So the drift is checked by machine rather than remembered. This recomputes
// the hashes from index.html and compares them to what vercel.json allows.
// ─────────────────────────────────────────────────────────────────────────────
async function checkCspHashes() {
  const { createHash } = await import('node:crypto');
  let html, vercel;
  try {
    html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    vercel = readFileSync(new URL('../vercel.json', import.meta.url), 'utf8');
  } catch (err) {
    record('HDR-CSP-HASH', 'warn', 'CSP inline-script hashes match index.html',
      `Could not read index.html / vercel.json: ${err.message}`, false);
    return;
  }

  // Inline only — a <script src=…> is covered by the origin allowlist instead.
  const inline = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => m[1]).filter((body) => body.length);
  const expected = inline.map((body) => `sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}`);
  const missing = expected.filter((h) => !vercel.includes(h));

  record('HDR-CSP-HASH', 'fail',
    'CSP inline-script hashes match index.html',
    missing.length
      ? `index.html has ${inline.length} inline script(s); ${missing.length} not allowed by the CSP in vercel.json. Add: ${missing.join(' ')} — see docs/security/headers.md`
      : `All ${inline.length} inline script(s) in index.html are hashed in the CSP.`,
    missing.length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// API-1 — nothing builds the API URL by hand any more
//
// Until 2026-10-16, 504 call sites across 361 files each assembled
// `https://<ref>.supabase.co/functions/v1` for themselves, six of them with
// the project ref typed out as a literal. They were centralised onto
// `API_BASE_URL` so the API can be moved behind the firewall by editing one
// line (docs/security/waf.md).
//
// That only stays true if it stays true. One new component pasted from an old
// one puts a hardcoded host back, and the symptom after the migration is not
// an error — it is that one screen quietly goes on calling the origin,
// bypassing the WAF and the origin lock, and showing an empty list that
// nobody reads as a fault. That is the same silent shape as the `/store/webhook`
// 401 and the `/functions/v1/server` typo before it.
//
// So the invariant is asserted rather than trusted. Pure source check, no
// network.
// ─────────────────────────────────────────────────────────────────────────────
function checkApiBaseCentralised() {
  const ls = spawnSync('git', ['ls-files', 'src'], { encoding: 'utf8', shell: true });
  const files = (ls.stdout || '').split('\n').map((f) => f.trim())
    .filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('src/app/lib/apiConfig.ts'));

  const offenders = [];
  for (const f of files) {
    let text;
    try { text = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'); } catch { continue; }
    if (/supabase\.co\/functions\/v1/.test(text)) offenders.push(f);
  }

  record('API-1', 'fail',
    'API base URL is only defined in apiConfig.ts',
    offenders.length
      ? `${offenders.length} file(s) build the API URL by hand and would bypass the firewall: ${offenders.slice(0, 5).join(', ')}${offenders.length > 5 ? ` (+${offenders.length - 5} more)` : ''}. Import API_BASE_URL instead.`
      : `Checked ${files.length} source files; all route through API_BASE_URL.`,
    offenders.length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// DEP-1 — no high-severity dependency advisories
//
// Slow, so --quick skips it. Thresholded at high rather than at zero
// deliberately: a build that fails on every new moderate gets switched off
// within a fortnight, and a check nobody runs protects nothing.
// ─────────────────────────────────────────────────────────────────────────────
function checkDependencies() {
  if (QUICK) {
    record('DEP-1', 'skip', 'No high-severity dependency advisories', 'Skipped (--quick).', true);
    return;
  }
  const run = spawnSync('npx', ['--yes', 'pnpm@8.15.6', 'audit', '--json'], {
    encoding: 'utf8', shell: true, timeout: 300000,
  });
  const out = run.stdout || '';
  let high = 0, critical = 0, names = new Set();
  try {
    const parsed = JSON.parse(out);
    for (const a of Object.values(parsed.advisories || {})) {
      if (a.severity === 'high') { high++; names.add(a.module_name); }
      if (a.severity === 'critical') { critical++; names.add(a.module_name); }
    }
  } catch {
    record('DEP-1', 'warn', 'No high-severity dependency advisories',
      'Could not parse audit output — run `pnpm audit` by hand.', false);
    return;
  }
  const total = high + critical;
  record('DEP-1', 'fail', 'No high or critical dependency advisories',
    total ? `${critical} critical, ${high} high across: ${[...names].join(', ')}` : 'None.',
    total === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// SEC-1 — no credentials committed to the repository
//
// Scans tracked files only. The publishable anon key is expected and ignored;
// anything matching a private-credential shape is not. Cheap, and it runs
// against what git would actually publish rather than against the working tree.
// ─────────────────────────────────────────────────────────────────────────────
const SECRET_PATTERNS = [
  ['Stripe secret key', /sk_(live|test)_[A-Za-z0-9]{20,}/],
  ['Stripe webhook secret', /whsec_[A-Za-z0-9]{20,}/],
  ['AWS access key', /AKIA[0-9A-Z]{16}/],
  ['GitHub token', /gh[pousr]_[A-Za-z0-9]{30,}/],
  ['Slack token', /xox[baprs]-[A-Za-z0-9-]{10,}/],
  ['Google API key', /AIza[0-9A-Za-z_-]{30,}/],
  ['SendGrid key', /SG\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/],
  ['Private key block', /-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/],
  ['Supabase service-role JWT', /"role"\s*:\s*"service_role"/],
];

function checkCommittedSecrets() {
  const ls = spawnSync('git', ['ls-files'], { encoding: 'utf8', shell: true });
  const files = (ls.stdout || '').split('\n').map((f) => f.trim()).filter(Boolean)
    .filter((f) => !f.startsWith('node_modules/') && !/\.(png|jpg|jpeg|gif|webp|pdf|woff2?|ico)$/i.test(f));
  const hits = [];
  for (const f of files) {
    let text;
    try { text = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8'); } catch { continue; }
    for (const [label, re] of SECRET_PATTERNS) {
      const m = text.match(re);
      // A placeholder in a form field is not a credential.
      if (m && !/\.\.\.|•|xxxx|placeholder|example|YOUR_/i.test(m[0])) {
        hits.push(`${f}: ${label}`);
      }
    }
  }
  record('SEC-1', 'fail', 'No credentials committed to the repository',
    hits.length ? `FOUND: ${hits.join('; ')}` : `Scanned ${files.length} tracked files, none found.`,
    hits.length === 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Report
// ─────────────────────────────────────────────────────────────────────────────
function report() {
  const fails = results.filter((r) => r.status === 'FAIL');
  const warns = results.filter((r) => r.status === 'WARN');
  const skips = results.filter((r) => r.status === 'SKIP');
  const passes = results.filter((r) => r.status === 'PASS');

  if (JSON_OUT) {
    console.log(JSON.stringify({
      target: T.projectId,
      at: new Date().toISOString(),
      summary: { pass: passes.length, fail: fails.length, warn: warns.length, skip: skips.length },
      results,
    }, null, 2));
    return fails.length ? 1 : 0;
  }

  const mark = { PASS: '  ok  ', FAIL: ' FAIL ', WARN: ' warn ', SKIP: ' skip ' };
  console.log('');
  console.log('════════════════════════════════════════════════════════');
  console.log(`  Production security protocol — ${T.projectId}`);
  console.log(`  ${new Date().toISOString()}`);
  console.log('════════════════════════════════════════════════════════');
  for (const r of results) {
    console.log(`[${mark[r.status]}] ${r.id.padEnd(16)} ${r.title}`);
    if (r.status !== 'PASS' || process.env.SECURITY_PROBE_VERBOSE) {
      console.log(`${' '.repeat(10)}${r.detail}`);
    }
  }
  console.log('────────────────────────────────────────────────────────');
  console.log(`  ${passes.length} passed · ${fails.length} failed · ${warns.length} warnings · ${skips.length} skipped`);
  console.log('════════════════════════════════════════════════════════');
  if (fails.length) {
    console.log('');
    console.log('  A FAIL is a control that should be in place and is not.');
    console.log('  Context for each check: tasks/security-audit-2026-10-16.md');
  }
  console.log('');
  return fails.length ? 1 : 0;
}

async function main() {
  // Liveness first: if the API is down, AUTH-1 passes for the wrong reason
  // and the whole run is misleading.
  await checkLiveness();
  await checkAuthGate();
  await checkAnonymousSignIn();
  await checkPasswordPolicy();
  await checkRls();
  await checkRlsEnabled();
  await checkRetired();
  await checkHeaders();
  await checkCspHashes();
  checkApiBaseCentralised();
  checkCommittedSecrets();
  checkDependencies();
  process.exit(report());
}

main().catch((err) => {
  console.error('security-probe could not run:', err?.message || err);
  process.exit(2);
});
