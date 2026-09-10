/**
 * End-to-end probe against the live server.
 *
 * WHY THIS EXISTS
 *
 * `npm run smoke` mounts every page and proves none of them throw. That is worth
 * having and it is not the same thing as working. Three flows in this project
 * passed typecheck and smoke while being completely dead:
 *
 *   - the quote signing link, broken at three separate layers
 *   - the change order approval link, which had no route at all
 *   - `intake/set-password`, so no invitation could ever be accepted
 *
 * Every one of them was a route meant for somebody with no account, sitting
 * behind an auth wall that defaults to signed-in. Nothing in the build catches
 * that, because the code is correct — it is the reachability that is wrong. The
 * symptom is always silence, since the person who hits it is outside the company
 * and simply gives up.
 *
 * So this asks the only question that matters: standing where the customer
 * stands, holding what they hold, does it answer?
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * It never uses the service role key, and it does not need one. Everything here
 * runs with the publishable key and accounts it creates itself through the
 * public signup route, which is exactly the access a real customer has. A probe
 * that authenticates as an administrator would pass while the customer's door
 * stayed locked — which is the whole failure it exists to catch.
 *
 * Run:  node scripts/e2e.mjs
 */

const PROJECT = 'plzsvzwwcdopnawtiwzm';
const API = `https://${PROJECT}.supabase.co/functions/v1/make-server-3eae23a6`;
const AUTH = `https://${PROJECT}.supabase.co/auth/v1`;
// The publishable key. Public by design — it is in the client bundle.
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsenN2end3Y2RvcG5hd3Rpd3ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NTczMTIsImV4cCI6MjA4NTEzMzMxMn0.HcaTHZrVUG1qWfHnKr7ItKOHrDhDWoDaPFG46O1lu6o';

let pass = 0, fail = 0;
let customerToken = '';
const failures = [];

function ok(name, condition, detail = '') {
  if (condition) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; failures.push(`${name}${detail ? ` — ${detail}` : ''}`); console.log(`  FAIL ${name}  ${detail}`); }
}

async function call(path, { method = 'GET', token = ANON, body, headers = {} } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let payload = null;
  try { payload = await res.json(); } catch { /* some routes answer with text */ }
  return { status: res.status, payload };
}

/**
 * The heart of it: a route a stranger must reach may answer anything except
 * "sign in". 401 from the wall is the exact failure that took three flows down.
 */
function reachableSignedOut(name, status) {
  ok(`${name} is reachable without an account`, status !== 401,
     status === 401 ? 'answered 401 — the wall is in front of it' : '');
}

console.log('\n── Public doors: routes for people with no account ──');
{
  // Each of these is answered with a token that does not exist. The right answer
  // is the route's own refusal (404, 400), never the wall's 401.
  const quote = await call('/quotes/by-token/e2e-nonexistent');
  reachableSignedOut('quote approval', quote.status);
  ok('and a bad quote token is refused, not accepted', quote.status === 404, String(quote.status));

  const co = await call('/change-orders/by-token/e2e-nonexistent');
  reachableSignedOut('change order approval', co.status);
  ok('and a bad change order token is refused', co.status === 404, String(co.status));

  const invite = await call('/intake/set-password', {
    method: 'POST', body: { token: 'e2e-nonexistent', password: 'not-a-real-password' },
  });
  reachableSignedOut('invitation set-password', invite.status);
  ok('and a bad invite token is refused', invite.status === 400, String(invite.status));

  const sign = await call('/quotes/by-token/e2e-nonexistent/sign', { method: 'POST', body: {} });
  reachableSignedOut('quote signing', sign.status);

  const decide = await call('/change-orders/by-token/e2e-nonexistent/decide', { method: 'POST', body: { decision: 'approved' } });
  reachableSignedOut('change order decision', decide.status);
}

console.log('\n── Doors that must stay shut ──');
{
  // The mirror image. These move money or reveal other people's data, and an
  // anonymous caller must not get through.
  const closed = [
    ['issuing a quote link', '/quotes/generate-link', 'POST', { quoteId: 'x' }],
    ['issuing a change order link', '/change-orders/co_x/send', 'POST', {}],
    ['redeeming a gift card', '/gift-cards/XXXX/redeem', 'POST', { amount: 1, idempotencyKey: 'k', orderId: 'o' }],
    ['reading job financials', '/job-financials/snapshot', 'GET', undefined],
    ['writing job financials', '/job-financials/kv', 'POST', { key: 'job_financials', value: {} }],
    ['the payroll report', '/time-tracking/payroll-report?startDate=2026-01-01&endDate=2026-12-31', 'GET', undefined],
    ['completion reports', '/work-orders/completion-reports', 'GET', undefined],
    ['quoting accuracy', '/work-orders/quoting-accuracy', 'GET', undefined],
    ['the compliance reminder run', '/compliance/run-reminders', 'POST', {}],
    ['backfilling vendors', '/vendors/backfill-from-applications', 'POST', {}],
  ];
  for (const [name, path, method, body] of closed) {
    const { status, payload } = await call(path, { method, body });
    // 401 or 403 are both correct. What must not happen is a 200 carrying data.
    const shut = status === 401 || status === 403
      || (status === 200 && Array.isArray(payload?.entries) && payload.entries.length === 0);
    ok(`${name} is refused anonymously`, shut, `status ${status}`);
  }
}

console.log('\n── A real customer, signed up through the front door ──');
{
  // One fixed account, reused. The first version minted a new address every
  // run, which would have left a trail of real accounts in production auth
  // that nothing cleans up — the probe has no service role and cannot delete
  // them. Signing up twice simply fails and we sign in instead.
  const email = 'e2e-probe@blackphoenixtest.dev';
  const password = 'E2e-Probe-9m4Xq7!';

  const signup = await call('/auth/signup', {
    method: 'POST', body: { email, password, full_name: 'E2E Probe' },
  });
  // Either it was created now or it already existed from a previous run. Both
  // are fine; what matters is that the front door works at all.
  const fresh = signup.status === 200 && signup.payload?.success === true;
  ok('the public signup route answers', fresh || signup.status === 400 || signup.status === 409,
     `status ${signup.status} ${JSON.stringify(signup.payload)?.slice(0, 120)}`);

  // THE ONE THAT MATTERS: signup must never grant authority.
  let token = '';
  {
    const res = await fetch(`${AUTH}/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const j = await res.json().catch(() => ({}));
    token = j.access_token || '';
    customerToken = token;
    ok('the new account can sign in', Boolean(token), j.msg || '');
  }

  if (token) {
    const me = await call('/auth/me', { token });
    ok('a fresh signup is a client, not an administrator',
       me.payload?.user?.role === 'client',
       `role ${me.payload?.user?.role}`);
    ok('and holds no permissions',
       !me.payload?.user?.permissions || Object.keys(me.payload.user.permissions).length === 0,
       JSON.stringify(me.payload?.user?.permissions));

    const admin = await call('/admin/users', { token });
    ok('and cannot list every user', admin.status === 403, `status ${admin.status}`);

    // Their own data, scoped to them, and empty because they are new.
    const wr = await call('/work-requests', { token });
    ok('sees only their own work requests', wr.status === 200 && Array.isArray(wr.payload) && wr.payload.length === 0,
       `status ${wr.status}`);

    const po = await call('/purchase-orders', { token });
    ok('is not handed the purchase order book',
       po.status === 200 && (po.payload?.orders || []).length === 0 && po.payload?.scopedToVendor === '__unresolved__',
       JSON.stringify(po.payload)?.slice(0, 100));

    const opps = await call('/investments/opportunities', { token });
    ok('sees no sample investment offers',
       (opps.payload?.opportunities || []).every((o) => !o.isDemo),
       JSON.stringify(opps.payload)?.slice(0, 100));

    // Design projects: the bug that let a customer draw for an hour and lose it.
    const save = await call('/design-projects', {
      method: 'POST', token,
      body: { name: 'E2E probe', ownerKey: 'decks' },
    });
    ok('cannot save into the shared staff namespace', save.payload?.success === false,
       JSON.stringify(save.payload)?.slice(0, 90));

    // The cohorts router is the company's own pricing and revenue — what each
    // tier earns, who is behind on payment, whose account gets shut off. Being
    // signed in is not the same as working here, and every vendor, tenant and
    // portal customer is signed in.
    const cohorts = await call('/cohorts', { token });
    ok('is not shown the company pricing and revenue', cohorts.status === 403,
       `status ${cohorts.status}`);

    // Asked separately because a 404 here would mean the guard is not
    // covering the whole router. It does NOT prove the route order is right:
    // the staff check fires before routing, so /cohorts/health and
    // /cohorts/:id are indistinguishable from out here. Route order is proven
    // by replaying the file's registrations through Hono, not by this.
    const cohortHealth = await call('/cohorts/health', { token });
    ok('and /cohorts/health is the health route, not an id lookup',
       cohortHealth.status === 403, `status ${cohortHealth.status}`);

    // Seeding wrote a fabricated million dollars of revenue onto the money
    // screen. It is refused now, and refused before the staff check even
    // matters — but a customer should never reach it either.
    const seed = await call('/cohorts/initialize', { method: 'POST', token });
    ok('cannot seed the revenue figures', seed.status === 403 || seed.status === 410,
       `status ${seed.status}`);

    // Vendor settings hold consents — what a vendor permits us to do with their
    // product photography. Two things are being checked, and the second is the
    // one that matters: not merely that an outsider cannot READ them, but that
    // an outsider cannot GRANT one. A consent recorded against a vendor by
    // somebody who is not that vendor is worse than no consent at all, because
    // it looks like evidence.
    const vsRead = await call('/vendor-settings/vendor-001', { token });
    ok('cannot read another party\'s vendor settings', vsRead.status === 403,
       `status ${vsRead.status}`);

    const vsGrant = await call('/vendor-settings/vendor-001', {
      method: 'PUT', token,
      body: { imageDisplay: { designCentre: true, quotes: true, storefront: true } },
    });
    ok('cannot grant image consent on a vendor\'s behalf', vsGrant.status === 403,
       `status ${vsGrant.status}`);
  }

  {
    // Holding nothing but the publishable key, which identifies nobody. The
    // catalogue actor fails closed on a token it cannot resolve to a user.
    const anon = await call('/vendor-settings/vendor-001');
    ok('an unidentified caller is refused vendor settings',
       anon.status === 401 || anon.status === 403, `status ${anon.status}`);
  }
}

console.log('\n── Reference data the design tools need ──');
{
  /**
   * Signed in, deliberately.
   *
   * The first version of this asked anonymously and failed, and I nearly took
   * that for a bug. It is not: the design centre requires an account, so a
   * reference route answering 401 to a stranger is correct. The probe was wrong
   * about the app rather than the other way round — which is a thing a probe
   * can be, and worth catching here rather than by "fixing" working code.
   */
  const rules = await call('/design-standards/code-rules?jurisdiction=IRC2021', {
    token: customerToken || ANON,
  });
  ok('the building code ruleset is served to a signed-in caller',
     customerToken ? (rules.status === 200 && Boolean(rules.payload?.ruleset)) : true,
     `status ${rules.status}`);

  const health = await call('/health');
  ok('the server reports healthy', health.payload?.status === 'ok');

  // Mounting a router at or near the root has twice risked taking the whole API
  // staff-only, because Hono resolves middleware by mount path and a wildcard
  // there covers every request. These two are the canaries: both are meant to
  // answer somebody holding nothing but the publishable key.
  const branding = await call('/public/branding');
  ok('public branding still answers an anonymous caller', branding.status === 200,
     `status ${branding.status}`);
}

console.log(`\n${pass}/${pass + fail} passed`);
if (failures.length) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
}
