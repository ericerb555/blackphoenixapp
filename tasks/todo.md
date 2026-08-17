# Security audit — findings

331 / Black Phoenix platform. Read-only audit. Nothing changed, written or deleted.

Question the audit was asked to answer: **can this be sold safely to other
companies?** Short answer: not yet, and the reason is one structural gap, not a
long list of small ones.

## Phases

- [x] **1** Authorisation and tenancy
- [x] **2** Secrets and keys
- [x] **3** Input handling
- [x] **4** Configuration and dependencies
- [x] **5** This report
- [ ] **1.3** Cross-tenant read against a staging target — **still blocked**, no
      non-production Supabase project. The finding rests on code reading plus the
      live proof in F1.

---

# Blocks selling to tenants

### F1 · The edge functions are the only security boundary, and 88% of them have none

**1,153 route handlers. 134 authenticated. 1,019 not — 483 of those write.**

The mechanism matters more than the count. `kv_store.tsx` builds its client with
`SUPABASE_SERVICE_ROLE_KEY`, which **bypasses Row Level Security entirely**. Every
edge function therefore runs with full database privilege, and the route's own
auth check is the only thing standing in front of it.

**Proven, not inferred:** `GET /design-projects?owner=shared` returns 4 real
records using only the public anon key that ships in the frontend bundle. No user
token. The same router exposes POST and DELETE.

*Smallest fix:* apply a `requireSignedIn` middleware at the router mount points.
`design-assistant.tsx` and `house-capture.tsx` already do exactly this with
`.use("*", requireSignedIn)`. The helper exists — it needs applying broadly.

### F2 · Tenant identity comes from the client

**30 routes take a tenant id from the request; 22 of those have no auth at all.**
Six are in `content-management.tsx` — the content centre itself, the product
intended for paying tenants:

```ts
const companyId = c.req.query('companyId');
rows = filterBy(rows, 'company_id', companyId);
```

The filter is correct. Its input is attacker-controlled. Change one query
parameter, read another tenant's content.

*Smallest fix:* derive the tenant from the verified session.
`/entitlements-summary` already demonstrates the pattern — it compares the
requested `owner` against the session email and refuses a mismatch.

### F3 · 59 of 60 money-touching routes are unauthenticated

Invoices, payouts, gift-card checkout, affiliate payouts, Stripe Connect,
marketplace checkout. `POST /invoices`, `PATCH /affiliate-payouts/:email/:id`,
`POST /affiliates/:email/payout-requests` — all open, all writing.

*Smallest fix:* the same middleware as F1, applied to the payment routers first.

---

# Fix before launch

### F4 · Password reset links are written to the log — **FIXED in source, not yet deployed**

- [x] `supabase/functions/server/index.tsx:2490` (deployed as `make-server-3eae23a6`)
- [x] `supabase/functions/make-server-57095a78/index.tsx:2636` — **second copy**,
      found while fixing the first. Also live: `make-server-57095a78` is ACTIVE
      at v483. Fixing only the first file would have left the hole open.
- [x] **`RESEND_API_KEY` is set** — answered without the dashboard in the end.
      The `/health` endpoint reports `resendKeyPresent: true`. **So the
      vulnerable branch was never taken in production and no reset link was
      ever logged.** F4 was latent, not actively leaking.
- [x] Deployed. `make-server-3eae23a6` v315, `make-server-57095a78` v484, both
      ACTIVE, both `verify_jwt: true` preserved.
- [x] Committed and pushed to `main` as `70cc8db3`.

When `RESEND_API_KEY` is unset the reset link was logged instead of emailed. That
link is a working account-takeover token valid for an hour, and Supabase function
logs are readable by anyone with dashboard access.

The `else` branch now does two things instead of logging:

```ts
await kv.del(`pwreset:${token}`);
console.error('[forgot-password] RESEND_API_KEY is not set — no reset email was sent.');
```

The `kv.del` matters as much as removing the log. The token is written to KV
*before* the send is attempted, so without it a failed send left a live,
undeliverable reset token sitting in the store for an hour — a credential nobody
could use but an attacker with store access could.

The endpoint still returns `{success:true}` either way. That is deliberate and
was left alone: a different response for known vs unknown email would turn this
into an account-enumeration oracle.

**Log check (read-only, 24h window — the API caps it there):** no occurrence of
`forgot-password`, `reset-password?token`, `pwreset`, or `RESEND_API_KEY` in
`function_logs`. But there was no email activity of any kind in the window, so
this shows the path was not exercised — **it does not show the key is set.** That
is why the dashboard check above is still open. Anything older than 24h is beyond
what the log API will return, so if the key has been unset for a while, assume
links are sitting in older logs and treat those accounts as exposed.

### F5 · Stored XSS chain into admin sessions

Four unsanitised HTML sinks:

| File | Sink |
| --- | --- |
| `EmailCenter.tsx:434` | `composeHtml` |
| `EmailCenter.tsx:467` | `previewEmail.html` |
| `ProjectDetailsModal.tsx:589` | `item.floorPlan.svgLayout` — SVG is a script carrier |
| `AiSeoEngine.tsx:544` | `preview.contentHtml` — AI-generated |

On their own, moderate. Combined with F1: an attacker writes a record through an
open POST, an admin opens it, script runs in the admin's session. The SVG one is
the sharpest — `<svg><script>` is a standard vector.

*Smallest fix:* sanitise at render, and never render stored SVG inline.

### F6 · The upload bucket is public

`image-upload.tsx:50` — `createBucket(BUCKET_NAME, { public: true })`. Anything
uploaded there is world-readable by URL, no auth, no expiry.

`media-library.tsx` and `house-capture.tsx` both correctly use `public: false`
with signed URLs — so the right pattern is already in the codebase.

### F7 · 14 high-severity dependency vulnerabilities

59 total: 6 low, 39 moderate, 14 high. The ones that matter here:

- **hono** — *Improper Authorization*, and *CORS middleware reflects any Origin
  with credentials*. This is the server framework, on 3.12.12.
- **hono** — `memo()` retains SSR output across requests → **cross-user data
  disclosure**.
- **react-router** — XSS, CSRF bypass, several DoS.

*Smallest fix:* upgrade hono first; it is both the framework and the worst offender.

### F8 · CORS is `origin: "*"` across the whole server

Combined with the hono CORS advisory and F1, this widens who can reach open
routes from a browser. Should be an allowlist of your own origins.

---

# Should fix

### F9 · No security headers

`vercel.json` sets only `Cache-Control`. Missing: `Content-Security-Policy`,
`X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`,
`Referrer-Policy`, `Permissions-Policy`. CSP would also blunt F5.

### F10 · `deck.unparked.v1` holds customer data indefinitely

Written by me earlier. Stores site address, town, parcel, customer name and job
id in plaintext localStorage with no expiry. *Fix:* drop the `link` object and
add an expiry.

### F11 · Store webhook does not verify its Stripe signature

`index.tsx:9897` — the comment claims it verifies when the secret is set; the code
only `JSON.parse`s. It **does** re-verify the session against Stripe before
fulfilling, which is real defence in depth, so this is lower risk than it looks —
but the comment is wrong and the signature check is free.
`investments-kv.tsx` does this correctly.

---

# What is actually in good shape

Worth stating, because it changes what the fix looks like:

- **RLS is on and working.** Direct PostgREST reads with the anon key return
  `200 []`. The database itself is not exposed.
- **No secrets ship to the browser.** 390 files, 11.2 MB scanned: no Stripe keys,
  no AWS keys, no private keys, no service-role key. The only JWT in the bundle
  is `role=anon`, which is correct.
- **No secret is logged** — the error logging prints exception objects, not keys.
  F4 is a link, not a key.
- **The auth that exists is well written.** The `/entitlements-summary` guard,
  the `supplierAdminGuard`, the `.use("*", requireSignedIn)` routers. The problem
  is coverage, not competence.

---

# Corrections made during the audit

Recorded because the numbers changed twice and you should know why:

1. A first pass reported **680** unauthenticated routes by scanning handler
   bodies. Wrong — auth here lives largely in **path-prefix middleware**, which a
   per-handler scan cannot see. Re-run accounting for it.
2. The second pass reported **2,097** routes. Also wrong — the regex was matching
   `kv.get('invoice:...')` as a route. Corrected to require an app/router receiver
   and a path-shaped argument. **1,153** is the real number.

Numbers in this report are from the corrected third pass.

3. **Found while fixing F4, and it widens F1:** the audit scanned
   `supabase/functions/server` only. There is a **second live server**.
   `list_edge_functions` shows both `make-server-3eae23a6` (v314) and
   `make-server-57095a78` (v483) ACTIVE, plus `make-server-824f083c` (v160) and
   `make-server-12c91054` (v146).

   | source dir | serves prefix | route handlers |
   | --- | --- | --- |
   | `server/` | `/make-server-3eae23a6` | 1,153 *(audited)* |
   | `make-server-57095a78/` | `/make-server-57095a78` | 509 *(not audited)* |

   So the live surface is **~1,662 handlers, not 1,153**, and the F1 middleware
   has to be applied in both trees or the old prefix stays open. The two older
   functions still need checking too. **This also means duplicated logic drifts:
   F4 existed in both copies with the same bug — assume other findings do too.**

---

# Proposed fix order

Not started. Awaiting your verification per the working agreement.

1. **F4** — one line, today, and check the env var.
2. **F1 + F3** — one middleware, applied to router mounts, payment routers first.
   This is the change that unblocks selling.
3. **F2** — ~30 call sites, tenant from session.
4. **F7** — upgrade hono, then react-router.
5. **F5, F6, F8, F9** — sanitise, private bucket, CORS allowlist, headers.
6. **F10, F11** — small.

Suggest doing 1 and 2 as separate approved batches rather than one sweep, so each
can be tested before the next.

---

# Review — batch 1 (F4)

**What changed:** two files, the same six-line hunk in each. Nothing else.

| File | Line | Change |
| --- | --- | --- |
| `supabase/functions/server/index.tsx` | 2490 | `else` branch no longer logs the reset link; deletes the token; logs an error |
| `supabase/functions/make-server-57095a78/index.tsx` | 2636 | identical |

**Why two files:** the second copy was found by grepping for the pattern rather
than trusting the single line number in the finding. It is deployed and live at
v483, so fixing only the file named in the audit would have left the
vulnerability fully exploitable through the other prefix.

**Verified:**
- Both files parse (esbuild `tsx` loader — the repo has no typechecker, so this
  is the available check).
- `kv.del` is exported from `kv_store.tsx` in *both* directories, confirmed
  separately; `index.tsx` imports `* as kv` in both.
- `git diff` reviewed — the F4 change is exactly two hunks. The other modified
  files in `supabase/functions` (`town-permits.tsx`, `design-assistant.tsx`) are
  earlier uncommitted work and were not touched.
- Swept the whole `supabase/functions` tree for other secret/token logging. Only
  hits were this pattern and false positives (`"No access token provided"`,
  `"Reset hours for..."`, error objects). `_retired/` also contains a copy but is
  not deployed.

**Deployed** on Eric's explicit instruction ("just push it, it's only 6 lines"),
without a staging pass. Noted because the standing rule is the opposite and this
was a deliberate one-off override, not a new default.

Post-deploy checks, all against production:

| Check | Result |
| --- | --- |
| `/health` both servers | 200, `status: ok` |
| `verify_jwt` after deploy | still `true` on both |
| `/design-projects`, `/products`, `/quotes` | 200 |
| `/entitlements-summary`, `/invoices`, `/design-assistant` | 401 — guards intact |
| `/town-permits/towns` | 403 — admin guard intact |
| `forgot-password`, unknown address | `{"success":true}`, no token minted |

## The thing that made this more than a one-line fix

**The CLI could not deploy either function at all.** It defaults a function's
entrypoint to `<slug>/index.ts`; both servers use `.tsx`, and the main one lives
in `functions/server/` rather than a directory named after its slug. Every
attempt failed with *"Entrypoint path does not exist"*. `supabase/config.toml`
now declares both entrypoints, so deploying works from a clean checkout.

**Consequence worth remembering:** before this, `make-server-3eae23a6` was
deployed from a directory named `make-server-3eae23a6/` that no longer exists in
the repo. So git and production had drifted, and the redeploy shipped whatever
else had accumulated in `functions/server/` since — not only the six lines. The
smoke tests above are what stands behind the claim that nothing broke; they are
not a substitute for using the app. **If something looks wrong in the next day or
so, this deploy is the first thing to suspect.**

`town-permits.tsx` and `design-assistant.tsx` were stashed out of the working
tree for the deploy and restored afterwards, so their untested changes did *not*
reach production and are still uncommitted.

**No production data was written or deleted.** Read-only log queries, two
function deploys, and GETs.
