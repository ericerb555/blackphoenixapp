# External security assessment — 2026-10-16

Conducted as an outside team against the **live production surface**, not as a
read of our own source. Every finding below was produced by sending a request
and recording what came back, or by reading what the hosted platform actually
reports — never by trusting a comment in this repository. Where the code was
right, the probe says so.

**Target.** `plzsvzwwcdopnawtiwzm.supabase.co` (Black Phoenix Builds, Postgres
17.6.1, `us-east-1`), the `make-server-3eae23a6` edge function, three retired
function generations, and `theblackphoenixcompany.com` on Vercel.

**Credential used.** The publishable anon key and nothing else — the same thing
any visitor can lift from the JavaScript bundle in ten seconds.

**Bottom line.** The application layer is in much better shape than most code
at this stage: the authorisation gate is real, it is enforcing in production,
and it held against everything thrown at it. **No customer data was reachable.**
What is missing is the layer *around* the application — platform settings,
dependency hygiene, HTTP headers, and the paperwork a buyer's diligence asks
for. Three findings should be fixed before a sale closes; one of them is a
dashboard toggle that takes thirty seconds.

---

## What held up (verified by probe, not by reading)

These are stated because an audit that only lists problems is not an audit.

| Control | How it was tested | Result |
|---|---|---|
| Default-deny auth gate | Anonymous GET to 12 sensitive routes | 11 × `401`, only `/health` open |
| Gate vs. a forged "signed-in" token | Minted an anonymous JWT, replayed all 12 | Still `401` — gate requires a real email |
| RLS on the KV stores | Anon `SELECT *` on `kv_store_*` | `200 []` — no rows, service-role only |
| Secrets table | Anon read of `private_cron_config` | `401 permission denied` |
| Exchange claim tables | Anon read of `exchange_claim` | `401 permission denied` |
| Tenant isolation on money | Anon + anon-auth reads of `investor_commitments`, `payout_distributions`, `work_requests`, `companies`, `organizations` | `200 []` every time |
| Three retired API generations | Probed `/customers`, `/invoices` on each | `410 Gone` — stubs confirmed live |
| Authority source | Source + live behaviour | `app_metadata` only; browser-writable `user_metadata` decides nothing |
| Stripe webhook authenticity | Read `stripe-webhooks` | HMAC-SHA256, constant-time compare, 5-minute replay window |
| Checkout pricing | Read both checkout paths | Server-authoritative; an unpriceable item is refused, not sold at the buyer's price |
| Secrets in version control | Pattern scan of every tracked file + full history | None. Only the publishable anon key and placeholder strings |
| Code injection | `eval` / `new Function` across app and server | Zero occurrences |

The 1,019-handler authorisation gap recorded in the gate's own comments is
closed in production. That was the thing most likely to sink a diligence
review, and it is done.

---

## Findings

### H-1 — Anonymous sign-ins are enabled, and nothing uses them · **HIGH**

`GET /auth/v1/settings` reports `"anonymous_users": true`. A single
unauthenticated `POST /auth/v1/signup` with an empty body `{}` returns a valid
`authenticated` JWT:

```
{"aud":"authenticated","email":"","role":"authenticated","is_anonymous":true}
```

No email. No password. No verification. No CAPTCHA. Unlimited.

Nothing in `src/` ever calls `signInAnonymously()` — this is a dashboard toggle
switched on at some point and never used. It is pure attack surface with no
feature behind it.

**It is not leaking data today**, and the reason is worth understanding because
it is luck rather than design. The edge gate computes `signedIn = !!user?.email`,
and an anonymous user has `email: ""`, so it is refused. Every RLS policy
happens to key on `auth.uid()` or `auth.jwt()->>'email'`, which an anonymous
token cannot satisfy.

**Why it is still High.** It makes the `authenticated` role meaningless as a
trust boundary, and every Postgres and Supabase convention assumes otherwise.
The ordinary, correct-looking policy `TO authenticated USING (true)` is
world-readable on this project. So is any future edge route that checks
`user?.id` instead of `user?.email` — and `user?.id` is the obvious thing to
write. We are one normal line of code from a full data breach, and the line
would pass review. Separately, it allows unbounded `auth.users` growth against
a billable MAU count.

**Fix.** Dashboard → Authentication → Sign In / Providers → turn off Anonymous
sign-ins. Thirty seconds, zero code, no deploy.

### H-2 — 14 high-severity dependency CVEs, no scanning in place · **HIGH**

`pnpm audit`: **35 vulnerabilities — 14 high, 16 moderate, 5 low.**

The ones that reach a customer's browser:

- **react-router** (7 high, 5 moderate) — XSS in RSC redirect handling, CSRF
  bypass, open redirect via backslash in `<Link>`, stored XSS via unescaped
  `Location` header, arbitrary constructor injection in deserialisation,
  unauthenticated DoS.
- **hono** (4 moderate) — `hono/jsx` renders plain strings unescaped in boundary
  components (XSS); unbounded dot-notation nesting in `parseBody()`. This one is
  our edge server.
- **dompurify** (2 low) — sanitiser bypasses, and we rely on it.

Build-only (`vite`, `rollup`, `brace-expansion`, `source-map-js`) matter less for
a running customer but every one will appear on a buyer's scan report.

**There is no automated scanning at all** — no CI, no `.github/` directory, no
Dependabot. These were found because this audit ran the command by hand.

### H-3 — No security headers except HSTS · **HIGH**

Live response from `theblackphoenixcompany.com` carries `Strict-Transport-Security:
max-age=63072000` and nothing else. Absent:

- **Content-Security-Policy** — nothing bounds the damage of any XSS, including
  the react-router and hono ones above.
- **X-Frame-Options / `frame-ancestors`** — the app can be framed, so every
  portal is clickjackable.
- **X-Content-Type-Options: nosniff**
- **Referrer-Policy** — full URLs leak to third parties, and our URLs carry
  quote and screening tokens.
- **Permissions-Policy**
- HSTS lacks `includeSubDomains` and `preload`.

`vercel.json` sets only `Cache-Control`. This is a dozen lines in one file.

### M-1 — `investment_documents` policy opens on a null column · **MEDIUM**

```sql
USING ((commitment_id IS NULL) OR (commitment_id IN (
  SELECT c.id FROM investor_commitments c
  WHERE c.investor_email = auth.jwt()->>'email')))
```

Any row with a null `commitment_id` is readable by **every** `authenticated`
caller — which, per H-1, means every stranger. The table holds 0 rows today, so
nothing is exposed; the first general offering document filed without a
commitment id changes that silently. Investor documents are exactly the category
a buyer's counsel will test.

**Fix.** Drop the `IS NULL` branch, or replace it with an explicit
`is_public = true` column so that publishing a document to everyone is a
deliberate act rather than a missing value.

### M-2 — No rate limiting on any public endpoint · **MEDIUM**

AI routes are metered for cost (`AI_METERED_PREFIXES`), which is good and
unrelated. Nothing limits request *volume* on the endpoints a stranger can
reach: `/auth/*` (credential stuffing, password spraying), `/leads/capture`,
`/applications`, `/store/checkout`, `/exchange/*`. Combined with H-1 there is
no cost to an attacker for trying anything repeatedly.

### M-3 — Eleven `SECURITY DEFINER` functions callable by `anon` via RPC · **MEDIUM**

`is_platform_operator`, `my_org_ids`, `my_admin_org_ids`, `my_visible_bid_ids`,
`org_has_feature`, `sync_bid_amount_from_lines` and five more are reachable at
`/rest/v1/rpc/<name>` by the `anon` role. Each returns nothing useful to a caller
with no identity, and `sync_bid_amount_from_lines` is a trigger function that
will error if invoked directly — so current impact is nil. But a definer
function runs as its owner, and leaving a row of them publicly callable is the
kind of thing that becomes a finding the day one of them gains a parameter.

**Correction — this finding's first remediation was wrong.** It read "revoke
EXECUTE on all eleven, grant back where needed." Taken literally that breaks
the bid room, and the migration already sitting in the repo
(`20261016180000_revoke_definer_function_execute.sql`, committed, **not yet
applied**) gets it right: nine of the eleven are RLS *helpers*, and an RLS
policy is evaluated as the querying user, so that user must hold EXECUTE on
every function the policy calls. Revoking does not fail open, it fails closed —
nobody can read their own bids. That migration counts 35 policy usages across
eleven tables from `pg_policies` rather than estimating, revokes the two that
are genuinely safe, and records why the other nine stay.

**Fix.** Apply the existing migration. Nothing further to write.

The nine that remain are defensible rather than merely tolerated: each answers
"which rows are mine" from `auth.uid()` and takes no argument a caller can
steer, so as `anon` there is no uid and they return nothing. Worth re-checking
if any of them ever gains a parameter.

### M-4 — Server-side fetch of a supplied URL (SSRF) · **MEDIUM**

`content-studio.tsx:971` — `rehostImage(url)` fetches an arbitrary caller-supplied
URL from inside the edge function and writes the response to our storage bucket.
There is a 12 MB size cap and a `content-type` check, but no scheme allowlist, no
host allowlist, and no block on private or link-local address ranges.

Supabase Edge is Deno Deploy, which has no instance-metadata service to steal, so
this is not the classic cloud-credential SSRF. It is still a way to make our
server issue requests to addresses of someone else's choosing and to plant
content in our bucket.

**Fix.** Allow `https:` only, resolve and refuse RFC1918 / loopback /
link-local, and prefer an allowlist of known supplier CDNs.

### M-5 — Stripe webhook: unverified signature on a dead path · **MEDIUM**

`POST /make-server-3eae23a6/store/webhook` parses the body with `JSON.parse` and
never checks `stripe-signature`. Two things save it: the route re-verifies the
session against Stripe before creating any order, and the auth gate refuses the
path outright, so Stripe cannot reach it at all. Already recorded in
`tasks/tenant-screening.md`.

So there is no exploit — but there is a route that looks like a webhook, does
not authenticate like one, and never fires. Either delete it or give it the
signature check its sibling function already implements.

### M-6 — Password and account-security options left off · **MEDIUM**

- Leaked-password protection (HaveIBeenPwned) is **disabled** — known-breached
  passwords are accepted at signup.
- No MFA, no passkeys (`passkeys_enabled: false`).
- `disable_signup: false` with open email signup.

Three dashboard toggles. MFA for administrator accounts in particular is a
checkbox on most diligence questionnaires.

### M-7 — One table has RLS switched off entirely · **MEDIUM**

`kv_archive_20261003` is the only one of the 34 public tables with
`rowsecurity = false`. It is **not** exposed today: neither `anon` nor
`authenticated` holds `SELECT` on it, so PostgREST refuses the request before
any policy would be consulted.

But it is protected by the absence of a grant rather than by a policy, and that
is a materially weaker thing. Every other table in the schema would survive a
stray `GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon` — a single
statement, and not an exotic one to type while debugging. This one would not,
and it is an archive of the entire KV store: invoices, customers, orders,
applications.

**Fix.** `ALTER TABLE kv_archive_20261003 ENABLE ROW LEVEL SECURITY;` with no
policies, matching the live KV tables. Service-role access is unaffected. One
line, and it brings the table into line with the other 33.

### L-1 — `JSON.stringify` injected into a `<script>` block · **LOW**

`api/render.js:66` writes `<script type="application/ld+json">${JSON.stringify(meta.schema)}</script>`.
Every other field on that page is escaped correctly via `esc()`; this one is not.
A `</script>` sequence inside any schema field — a blog title, a job name —
breaks out of the block. The values are staff-authored today, which is why this
is Low.

**Fix.** `.replace(/</g, '\\u003c')` on the stringified output.

### L-2 — Anon key hardcoded in eight tracked files · **LOW**

`api/render.js`, `api/sitemap.js`, `scripts/e2e.mjs`, two components,
`src/app/utils/supabase/info.tsx`, and both `set-secrets` scripts. The key is
publishable and this is not a leak — but rotating it is eight edits instead of
one, and nobody rotates what is annoying to rotate.

### L-3 — No security documentation of any kind · **LOW severity, HIGH diligence impact**

Searched the repository: there is no `SECURITY.md`, no incident-response plan,
no threat model, no data-flow or subprocessor inventory, no privacy policy
under version control, no DPA, and no pen-test report. This is not a
vulnerability. It is the section of the diligence questionnaire that currently
has to be answered "we don't have that," and it is answered below.

---

## The diligence questions, answered

### Encryption

**In transit — yes.** TLS enforced everywhere. HSTS is set with a two-year
max-age, though without `includeSubDomains` or `preload` (see H-3). Supabase
and Vercel both terminate TLS 1.2+.

**At rest — yes, at platform level.** Supabase runs on AWS; storage is
AES-256-encrypted by default, as are automated backups. Postgres 17.6.1.

**Field level — no.** No column encryption, and Supabase Vault is not in use.
Customer names, addresses, phone numbers, email, invoice amounts and tenant
screening records sit in plaintext columns, protected by RLS and by the
service-role boundary rather than by cryptography. That is a defensible posture
and a common one — but it is an honest "no" to the question as asked, and it is
worth knowing which of those fields a buyer will consider sensitive.

### Penetration test

**Never performed.** No third-party test, no report, no remediation letter.
This document is the first adversarial assessment of the platform, and it was
conducted internally — which is not the same thing and will not be accepted as
the same thing. A buyer will want a named firm.

### Vulnerability scanning

**None automated.** No CI, no Dependabot, no SAST, no secret scanning, no DAST.
`pnpm audit` and the Supabase advisors both produce real findings (35 and 14
respectively) and both were run for the first time today, by hand.

### Incident response plan

**Does not exist.** There is no written plan, no severity scale, no contact
tree, no breach-notification procedure, and no log-retention policy. New
Hampshire RSA 359-C:20 requires notification of affected residents, and this
platform holds tenant and customer PII for NH residents. There is currently no
documented process to meet that obligation inside any particular timeframe.

A draft plan is item 9 in the remediation plan below.

### Where the data lives — onshore or off?

**Primary data: onshore, United States.** The Supabase project is in
`us-east-1` (AWS, Northern Virginia). The database, storage buckets, auth
records and edge functions all run there. Vercel serves the front end from a US
region with a global CDN for static assets only — no customer data at the edge.

**Third parties are a different answer, and this is the one to prepare for.**
Data leaves us for a number of subprocessors, and at least one of them is
offshore:

| Subprocessor | What reaches it | Where |
|---|---|---|
| Supabase / AWS | Everything — primary store | US (`us-east-1`) |
| Vercel | Front-end delivery, SSR meta | US |
| Stripe | Payment and payout data, two accounts | US, global processing |
| OpenAI / Anthropic | Prompt content: blueprints, quotes, listings, assistant queries | US |
| Resend | Email addresses and message bodies | US |
| Twilio | Phone numbers, SMS bodies | US |
| **CJ Dropshipping** | **Customer name and full shipping address for every store order** | **China** |
| MapTiler | Map tile requests | EU |
| Regrid | Property addresses for parcel lookup | US |

**CJ Dropshipping is the answer that needs preparing.** Fulfilling a physical
store order sends a customer's name and home address to a Chinese company. That
is a lawful and ordinary dropshipping arrangement, but "is any customer data
processed outside the United States?" has to be answered **yes**, with CJ named,
and a buyer will ask what the contract says about it.

---

## Remediation plan

Ordered by what a buyer's diligence hits first, not by technical interest.

### Phase 1 — Before anything else · **DONE 2026-10-16, except two dashboard toggles**

1. ✅ **Anonymous sign-ins turned off** by Eric, 2026-10-16. H-1 closed.
   Verified from outside: `POST /auth/v1/signup` with an empty body now
   answers `422 anonymous_provider_disabled`, where that morning it returned a
   valid `authenticated` JWT. `ANON-1` green.
   - **This also cleared ~17 `auth_allow_anonymous_sign_ins` advisor warnings
     in one move.** They fired because every RLS policy scoped to the
     `authenticated` role was reachable by a stranger holding an anonymous
     token; with the provider off, that whole class is gone. It is the
     highest-leverage thing done in this entire audit, and it was a toggle.
2. ✅ **Leaked-password protection enabled** by Eric, 2026-10-17. M-6 half
   closed. Verified via the Supabase security advisor, where the
   `auth_leaked_password_protection` lint is now absent — the probe cannot see
   this one, because Supabase does not publish the flag on the anonymous
   settings endpoint. `ANON-2` therefore stays `skip`, by design rather than
   by omission.
   - Still open from M-6: MFA for administrator accounts, and passkeys.
3. ✅ **Security headers in `vercel.json`.** Seven headers; six enforcing
   (HSTS + `includeSubDomains`, `X-Frame-Options: SAMEORIGIN`, `nosniff`,
   `Referrer-Policy`, `Cross-Origin-Opener-Policy`, `Permissions-Policy`) and
   CSP in **report-only**. Live at the next Vercel deploy — the probe reads
   production, so `HDR-*` stays amber until then. Reasoning, the known
   violations, and the promotion steps: `docs/security/headers.md`.
   - `SAMEORIGIN`, not the planned `DENY`: the app frames its own pages, and
     `DENY` would break them while `SAMEORIGIN` still blocks every third party.
   - No HSTS `preload`: it is effectively irreversible and would strand any
     subdomain that cannot serve HTTPS. Add deliberately, not in a sweep.
   - `script-src` uses **SHA-256 hashes** for the two inline scripts in
     `index.html` rather than `'unsafe-inline'`, which would have made the
     policy decorative against the attack it exists to stop. Hashes rot
     silently when the file is edited, so `HDR-CSP-HASH` in the probe
     recomputes and compares them.
4. ✅ **Three anonymous `auth.users` rows deleted** — the ones this audit
   created while proving H-1. Verified: 0 anonymous remaining, 9 real accounts
   untouched.
5. ✅ **M-7 fixed** — RLS enabled on `kv_archive_20261003`, plus a defensive
   `REVOKE`. Applied to production and verified: **35 of 35 public tables now
   have RLS on**, up from 33 of 34.
6. ✅ **Incident response plan written** — `docs/security/incident-response.md`.
   Severity scale, first-hour runbook (log → preserve evidence → contain →
   confirm with `npm run security`), scoping, the NH RSA 359-C:20 notification
   path, and a post-incident review that feeds new checks back into the probe.
   Still open inside it: retained counsel, cyber insurance, access inventory.

### Phase 2 — **DONE 2026-10-16**

5. ✅ **Dependencies: 35 vulnerabilities → 0.** Was 14 high, 16 moderate, 5 low.
   - **`react-router` removed, not upgraded.** It accounted for 7 of the 14
     highs and 5 moderates, and **nothing imported it** — zero references in
     `src/`, `api/`, `scripts/`, `tests/`, and no package depended on it. The
     app hand-rolls routing through `routes.tsx`. Half the high-severity CVE
     count came from a package that was never used.
   - `hono` → `^4.13.13`, `vite` → `6.4.4`, `rollup` → `4.64.7`.
   - Transitive ones cleared with pinned overrides: `dompurify`,
     `source-map-js`, and both `brace-expansion` major lines. `uuid` is
     overridden **scoped** (`@react-three/drei>uuid`, `exceljs>uuid`) rather
     than globally, so it cannot downgrade our own direct `uuid@14`.
   - Verified: `pnpm audit` clean, exceljs still writes a workbook under
     `uuid@11`, build clean, **373 pages smoke-rendered, 0 failures**, 2172
     tests pass, typecheck unchanged at 307/83.
6. ✅ **M-1 `investment_documents` fixed and applied.** The `commitment_id IS
   NULL` branch is gone, replaced by an explicit `is_public boolean not null
   default false`. Visibility is now: explicitly published, **or** your own
   commitment's documents, **or** documents on an opportunity you have actually
   committed to — which is what the null branch was reaching for and missing.
   The email comparison is wrapped in `nullif(…, '')` so an anonymous token
   (whose `email` is the empty string) cannot match a blank `investor_email`.
7. ✅ **M-3 was already done.** Both `20261016170000_pin_function_search_path`
   and `20261016180000_revoke_definer_function_execute` had been applied as raw
   SQL, which is why they are absent from the migration ledger. Verified
   directly: all six functions carry `search_path=public`, and
   `org_has_feature` / `sync_bid_amount_from_lines` report `anon_exec=false`,
   `auth_exec=false`. My Phase 1 note calling them "unapplied" was wrong — it
   inferred state from `list_migrations` instead of from the database.
8. ✅ **M-4 SSRF bounded.** New `supabase/functions/server/safeFetch.ts`:
   https-only, no credentialled URLs, default-deny on loopback / RFC1918 /
   link-local / CGNAT / multicast, blocked internal hostnames, an optional host
   allowlist, and **manual redirect following that re-validates every hop** —
   the hop check being the one that matters, since any public host can simply
   302 to `169.254.169.254`. Wired into `rehostImage`, the one caller that
   fetches a URL from a request body.
   - 14 tests in `tests/safeFetch.test.ts`. **One of them caught a real bypass
     in the first implementation**: `new URL()` normalises
     `::ffff:169.254.169.254` to `::ffff:a9fe:a9fe`, so the dotted-quad regex
     guarding IPv4-mapped IPv6 never matched and the cloud metadata address
     went straight through in hex. Replaced with a proper IPv6 expander that
     decodes the low 32 bits of a `::ffff:0:0/96` address.
   - Known and documented gap: DNS is not resolved before connecting, so
     rebinding is not covered. Deno Deploy offers no hook to pin the resolved
     address. The allowlist is the real answer where hosts are knowable.
9. ✅ **M-5 resolved, and it was a live bug, not just a dead route.**
   `stripe-webhooks` verifies Stripe's signature then forwards to
   `store/webhook` carrying the service-role key — which resolves to no user,
   so the gate answered **401 to every real store payment event**. Its sibling
   `/screening/webhook` was listed in `PUBLIC_POST_PATHS`; `/store/webhook`
   never was. Now listed.
   - What it was costing: orders paid for and never created, for any shopper
     who closed the tab, paid by a delayed method, or lost connectivity on the
     way back from Stripe. `/store/checkouts/complete` covers only the shopper
     who returns with the browser open, which is why nothing ever reported an
     error.
   - The route's own comment claimed it verified the signature "when
     `STRIPE_WEBHOOK_SECRET` is set". It never has — there is no
     `constructEvent` call and no read of `stripe-signature`. Comment corrected
     rather than deleted: one claiming a control that is not there is worse
     than none, because it stops the next reader looking. The actual
     protections are the upstream HMAC check and the route re-verifying the
     session with Stripe before creating anything.

### Phase 3 — The audit-to-pen-test pipeline (~2 days to build, then it runs itself)

This is the part that turns a one-off review into a posture, and it is what
converts "we looked once" into something a buyer will credit. Four stages, each
feeding the next:

**Stage 1 — Every commit (CI, blocking).** A `.github/workflows/security.yml`
that runs on every push and pull request: `pnpm audit --audit-level=high`
(fails the build), `gitleaks` for secret scanning (fails the build), and
CodeQL for JavaScript/TypeScript SAST. Plus Dependabot on a weekly schedule so
upgrades arrive as reviewable PRs instead of as an annual crisis.

**Stage 2 — Every deploy (post-deploy probe). ✅ BUILT — `npm run security`.**
`scripts/security-probe.mjs` is this audit, executable. It re-runs the checks
that produced every finding above, using only the publishable key, so a pass is
a statement about the actual exposed surface rather than about what a
privileged caller sees. Fifteen checks across six controls:

| ID | Checks |
|---|---|
| `AUTH-1` | Ten sensitive routes refuse an anonymous caller |
| `AUTH-2` | The API is actually up — so `AUTH-1` cannot pass because of an outage |
| `ANON-1` | Anonymous sign-ins stay off (**failing today — H-1**) |
| `ANON-2` | Leaked-password protection |
| `RLS-1` | Sixteen tables return no data to a stranger |
| `RLS-2` | Every public table has RLS enabled (needs the service key) |
| `RETIRED-1` | The three decommissioned API generations stay dead |
| `HDR-*` | Six browser security headers (**five warning today — H-3**) |
| `SEC-1` | No credentials in any tracked file |
| `DEP-1` | No high or critical dependency advisories |

Three design decisions worth keeping:

- **It writes nothing and creates no accounts.** Proving H-1 by hand cost three
  anonymous rows in `auth.users`; a check that runs on every deploy cannot leave
  residue, so `ANON-1` reads the published settings document instead of minting
  a token. Same answer, no side effect.
- **A skip is never a pass.** "We did not look" and "we looked and it was fine"
  are the two answers a security report must never blur. `--quick`, a missing
  service key, and a flag the platform does not publish all report `skip`.
- **`AUTH-2` exists to stop `AUTH-1` lying.** A function that is down returns
  401 to all ten gated paths, which reads as perfect security and is an outage.

Run it after `deploy:server`, the way `smoke.mjs` already runs. This is the
highest-value item in the plan, because it is the only one that defends the
work already done.

**Stage 3 — Weekly (scheduled).** Supabase security advisors pulled via MCP and
diffed against the last run, plus an OWASP ZAP baseline scan against production.
Both post to one place; only the diff needs reading.

**Stage 4 — Annual (external).** A third-party penetration test. Stages 1–3
exist partly to make this cheap: a firm that finds no dependency CVEs, no
missing headers and no open RLS spends its hours on logic flaws, which is what
you are actually paying for. Budget roughly $8–20k for a web-app test of this
size. Do it *after* Phases 1 and 2, so the report comes back thin — a thin
report from a named firm is the single most useful document in a diligence
pack.

### Phase 5 — Edge defence (WAF, adaptive limiting, DDoS) · code done, config outstanding

Requested 2026-10-16. The central finding shaped everything else:

**There is no single front door.** The browser calls
`plzsvzwwcdopnawtiwzm.supabase.co` **directly** — 504 call sites across 361
files build that URL — for the API, auth, the database and storage. Vercel
only ever sees the static site. **A WAF on the hosting provider would protect
0% of the API.** Full design in `docs/security/waf.md`.

- ✅ **Origin lock built** (`index.tsx`, report-only). Cloudflare adds a secret
  header; anything arriving without it did not come through the firewall and
  is refused. Without this a WAF is theatre — the project ref is in the
  JavaScript bundle, so anyone can read it and address the origin directly.
  Fails *open* while unset (the opposite of the cron secrets, deliberately: it
  fronts the whole API and must not black it out before Cloudflare exists),
  and exempts the webhook and cron paths, which reach us by internal hops that
  never touch the firewall.
- ✅ **Behavioural IP reputation built and wired**
  (`ipReputation.ts` + middleware, report-only). Scores *meaning*, not volume:
  share-token misses weigh 5× a mistyped password, because nobody misses six
  256-bit tokens by accident. Breadth across distinct paths is its own signal.
  Escalates allow → throttle (429) → temporary 15-minute ban, and **decays** —
  a shared office NAT drifts back to clean on its own. 17 tests cover every
  threshold boundary and the forgiveness path.
  - Costs nothing for well-behaved traffic: no read, no write, no storage
    touched unless a caller has already misbehaved. A per-request counter
    write would have made the anti-abuse code its own amplifier.
  - Takes the **rightmost** `x-forwarded-for` entry, not the leftmost — the
    leftmost is client-controlled, and trusting it would let an attacker wear
    a fresh address per request and never accrue a score.
- ✅ **DDoS response plan** — `docs/security/ddos-response.md`. Attack-vs-launch
  triage table, classification, per-layer actions both with and without
  Cloudflare, and the point most people learn afterwards: on a usage-priced
  stack **this is a billing event as much as an outage**, and the AI routes are
  the cheapest thing to attack and the most expensive to serve.
- ⬜ **Cloudflare itself** — account, DNS move, `api.` hostname, rulesets,
  adaptive rate limiting. Needs Eric's registrar and account access.
- ✅ **API base centralised.** All 504 call sites across 361 files now import
  `API_BASE_URL`; `SUPABASE_ORIGIN` in `src/app/lib/apiConfig.ts` is the one
  line to change to move the API behind the firewall.
  - Six sites had the project ref typed out as a **literal string**, so they
    would have survived any change to `info.tsx` and gone on calling the old
    host — with the only symptom being a quietly empty panel.
  - `SocialMediaManager.tsx` held a `try { require('../utils/supabase/info') }
    catch { <hardcoded URL> }`. There is no `require` in a Vite browser
    bundle, so the call threw on every evaluation and **the catch was the code
    path** — the fallback was what the file always used. Replaced with a plain
    import.
  - `FeaturedDealsReels.tsx` had both the URL and the anon key as literals
    (part of L-2). Both now come from the shared modules.
  - Verified: typecheck **unchanged at 307/83** across the whole refactor,
    `check:imports` resolves all 1218 relative imports, build clean, 2231
    tests pass. In the built bundle `/functions/v1` now appears **exactly
    once** — it was ~488 times before, which is the centralisation visible in
    the output.
  - Guarded by a new **`API-1`** check in `scripts/security-probe.mjs`: it
    fails if any source file builds the API URL by hand again. Without it the
    first component pasted from an old one silently bypasses the WAF and the
    origin lock, showing an empty list rather than an error — the same silent
    shape as the `/store/webhook` 401.

**Adaptive rate limiting belongs at Cloudflare, not here**, and the split is
deliberate: volumetric patterns, bot scores and managed rulesets run before we
pay for the request, while this layer handles the application-aware signals an
upstream firewall structurally cannot see. Building the volumetric half
ourselves would be a worse version that costs money per request and cannot
protect `/auth/v1` at all.

### Phase 4 — The paperwork (~2 days, mostly writing)

10. **Incident response plan** — `docs/security/incident-response.md`: severity
    scale, who is called, containment steps, the NH RSA 359-C:20 notification
    path and its timeline, evidence preservation, and a post-incident review
    template. This is the document you asked to see; it does not exist yet, and
    writing it is a morning's work once the shape above is agreed.
11. **`SECURITY.md`** — a disclosure address and a response commitment. Costs
    nothing and is the first file a technical buyer looks for.
12. **Subprocessor inventory and data-flow map** — the table in this document,
    expanded, with the CJ Dropshipping transfer called out explicitly and the
    contract terms attached.
13. **Access review** — enumerate who holds Supabase dashboard access, Vercel
    access, Stripe access and repository access; turn on MFA for every one of
    them; remove anyone who no longer needs it. A buyer will ask for this list.
14. **Backup and recovery test** — confirm PITR is on, then actually restore to
    a branch once and write down how long it took.

---

---

## Seen since the audit (2026-10-17)

Found by re-running the Supabase advisors, which is the weekly habit Stage 3
of the pipeline is meant to automate.

**`public.slow_queries` has no pinned `search_path`** — a new function added
after the audit. Low, and for the same reason the six in
`20261016170000_pin_function_search_path` were low: it is `SECURITY INVOKER`,
so a caller who redirects it gains only the privileges they already had, and
neither `anon` nor `authenticated` holds `EXECUTE` on it at all. Worth a
one-line `ALTER FUNCTION … SET search_path = public` next time somebody is in
that file, not worth a deploy of its own.

It is recorded here chiefly as evidence that the advisors are worth re-reading
on a schedule: this appeared within a day of the audit closing, from ordinary
unrelated work, and nothing else would have surfaced it.

---

## Answering "are we secure enough to sell?"

The application is in good shape and the probing says so: no data was reachable,
the authorisation model is sound and enforcing, money cannot be manipulated from
the client, and three generations of old insecure APIs are properly dead. That
is the hard part and it is done.

What is not done is everything a buyer checks *before* they look at the code —
the platform toggles, the CVE list, the response headers, and the absence of any
document describing how security is managed. None of it is difficult. Phase 1 is
an hour. Phases 1 and 2 together are about a day and a half, and they close every
High and every Medium in this report.

The honest gap is Phase 3 and the external pen test. "We have never had a
penetration test and we have no automated scanning" is a sentence that costs
real money at a negotiating table, and the fix needs a calendar, not a
keyboard. Starting the CI pipeline now means that by the time a buyer asks,
the answer is "here is the pipeline, here are six months of clean runs, and
here is the report from the firm we engaged."

---

## Disclosure about this audit

Testing whether anonymous sign-in was enabled required actually calling it,
which created **three anonymous rows in `auth.users`** (no email, no personal
data, created 2026-10-16). They are mine, not a user's, and they should be
deleted. Deleting auth rows is destructive, so I have not done it — say the word
and it is one statement. Everything else in this audit was read-only.

---

## Remediation, 2026-11-06

Three weeks after the assessment. Everything below was verified by running it,
not by reading it.

### Closed

**Phase 3 Stage 1 — CI exists.** `.github/workflows/security.yml`:
`pnpm audit` blocking at high, gitleaks across full history (a secret
committed and reverted is still a secret, so the checkout is not shallow),
CodeQL `security-extended` non-blocking to the Security tab, and the
production probe on a Monday cron. `.github/dependabot.yml` groups Radix,
three.js, types and build tooling so bumps get read rather than
rubber-stamped — security updates deliberately ungrouped, because those
should arrive and be merged on their own. **This was the only phase with
nothing started.** Stage 3 (weekly advisors, ZAP) and Stage 4 (external
pen test) remain.

**H-2 follow-on — a moderate CVE that `DEP-1` is built not to see.**
`DEP-1` fails on high and critical only, which is the right line for a gate
and meant `vite@6.4.4` sat unnoticed: GHSA-8g5g-mxqh-grgj, `server.fs.deny`
bypassed with queries. We were pinned to the vulnerable version *twice* —
`devDependencies` and a `pnpm.overrides` entry holding it there. Bumped to
6.4.5; `pnpm audit --audit-level=moderate` now reports nothing at all. The
CI job above reports moderates without failing, so the next one is visible.

**L-1 — the JSON-LD injection.** Fixed, with the detail that matters:
the obvious fix is a no-op. `.replace(/</g, '<')` compiles, runs, and
replaces `<` with `<`, because `'<'` *is* `<` in JavaScript source. It
needs `'\\u003c'`. Both forms look correct in a diff. Extracted to an
exported `jsonLdBlock()` and tested on the emitted text rather than on the
call; proven by reverting to the no-op and watching 2 of 4 tests fail.

**Phase 4 item 11 — `SECURITY.md`.** Disclosure address, the same
three-business-day commitment already on the public security page and in the
incident response plan, scope, out-of-scope, and safe harbour.

**Item 10 was already done** and this document had not been updated to say
so: `docs/security/incident-response.md` exists.

### New finding, found and fixed in the same pass

**The customer set the time on their own signature.**
`POST /quotes/by-token/:token/sign` took `signedAt` from the request body,
where `CustomerQuoteApproval.tsx` puts `new Date().toISOString()` off the
customer's machine. The route goes to real trouble a few lines earlier to
stop a second click rewriting *when* a quote was agreed — then accepted that
date from the browser. A wrong system clock misdated the record by accident;
anybody who wanted to could set it to any date at all, on the closest thing
in this system to a signature on a contract. Now `signedAt: now`, from the
value already computed for `updatedAt`.

Severity Low — it is the signer's own timestamp, so the fraud is against
their own position — but it is evidence integrity on a signing endpoint, and
a buyer's counsel is exactly who reads that record.

### H-3 follow-on — the CSP can now actually be promoted

The policy shipped Report-Only on 16 October with instructions to collect for
a week first, and the honest note that "right now nothing collects them, so
this step means actually looking". Nothing collected, nobody looked, and the
policy spent three weeks reporting into the void waiting on evidence that was
never going to arrive.

`report-uri` now points at `POST /csp-report`, with
`GET /csp-report/summary` (staff only) to read it. See
`supabase/functions/server/cspReports.ts` and the 21 tests. Two design points
worth keeping:

- **It does no storage work in the common case.** Browsers post with no
  credentials, so the route is public — the only unauthenticated write here
  that is not a payment webhook. Reports buffer in the isolate and flush at
  most once every 30 seconds, so a flood costs one write, not one per
  request. `ipReputation.ts` reached the same conclusion: a per-request
  counter write makes the anti-abuse code its own amplifier.
- **Overflow is counted, not discarded.** The blocked URI is
  attacker-controlled, so distinct fingerprints are capped — but a store that
  fills up and quietly stops counting looks exactly like a site with no
  violations, and "clean, promote it" is the dangerous conclusion to draw
  from it. `dropped` is in the summary.

**A correction to `docs/security/headers.md`.** It listed the JSON-LD block
as a known CSP violation. That was asserted, not checked. Per spec a
`<script>` with a non-JavaScript MIME type is a *data block* — never
executed, so there is nothing for `script-src` to block — and current Chrome
does not report it. Read the reports before fixing it.

The policy is still Report-Only, deliberately. Promoting a first-draft CSP
blind is how you take down checkout on a Friday. The week starts now.

### Still open, and what each one is waiting on

| Item | Waiting on |
|---|---|
| `RLS-2` — every public table has RLS on | The service-role key. **Never run.** A skip is not a pass. |
| `ANON-2` — leaked-password protection | A dashboard toggle; not published to anonymous callers, so it cannot be probed. |
| Three anonymous `auth.users` rows from 16 Oct | A decision. Deleting auth rows is destructive. |
| `public.slow_queries()` | Its definition. It is a **live function with no migration anywhere in this repository** — the only schema drift found — and the one still carrying an unpinned `search_path`. |
| Origin lock → enforcing | Cloudflare. Fails open while unset, by design. |
| IP reputation → enforcing | The `would-block` lines in the edge function logs. |
| CSP → enforcing | A week of the reports now being collected. |
| Phase 3 Stages 3–4 | A calendar and a budget, not a keyboard. |
| Phase 4 items 12–14 | Subprocessor inventory, access review + MFA, a restore test. |

### Verified

    tests             2537/2537
    typecheck app     307, exactly baseline
    typecheck server   83, exactly baseline
    typecheck tests    12, exactly baseline
    build             clean
    pnpm audit        nothing at moderate or above
    probe             14 passed, 0 failed, 1 warning (CSP report-only), 2 skipped
    deployed          server deployed and re-probed; /csp-report answers 204,
                      /csp-report/summary answers 401 to a stranger

### A process note, because it nearly cost the work

Two Claude sessions were running against this repository at once. The other
one committed with `git add -A` and swept this work into an unrelated quote
commit, then `git reset` twice, orphaning the security commits both times.
Nothing was lost — the resets were mixed, so the files survived in the
working tree — but the commits had to be rebuilt.

The work is therefore anchored: branch `security/audit-remediation-2026-11-06`
and tag `security-work-2026-11-06`, both pushed. **One session per
repository** is the cheap fix.

---

## Pass 3 — 2026-11-10

Four days after the last pass. The probe has reached its ceiling: `npm run
security` reports the same **14 passed · 0 failed · 1 warning · 2 skipped** as
on 6 November, and both skips are unrunnable with an anon key by design. So this
pass went at them with database access instead, which is how `RLS-2` finally
ran — for the first time since it was written.

### RLS-2 — run at last, and it passes

Never executed before: the probe skips it without a service-role key, and the
6 November note said plainly "**Never run.** A skip is not a pass."

Read out of `pg_class.relrowsecurity` rather than from the migrations: **all 39
tables in `public` and all 4 in `command_center` have RLS enabled.** Not one
exception.

That also closes **M-7** ("one table has RLS switched off entirely"), which had
been carried as open since 16 October.

### Anon isolation, re-proved two ways

The probe's `RLS-1` only ever asked PostgREST for rows. This pass asked
Postgres directly, as the `anon` role, inside a rolled-back transaction —
underneath the API rather than through it:

    set local role anon;  -- 14 tables, count(*) each

`app_error_log`, `ai_call_log`, `ai_kill_switch`, `ai_action_request`,
`query_perf_snapshot`, `exchange_deal`, `kv_store_3eae23a6`,
`kv_store_57095a78`, `work_requests`, `companies`, `investor_commitments`,
`payout_distributions`, `organizations`, `feature_grants` — **0 rows every
time**, including tables that are not empty.

**Anon WRITES had never been probed at all.** Now they have:

    POST /rest/v1/kv_store_3eae23a6   401  new row violates row-level security policy
    POST /rest/v1/kv_store_57095a78   401  new row violates row-level security policy

A note on method, because it nearly produced a false pass: the first attempt
sent a `key` column to tables that do not have one and got `400 PGRST204` from
the schema cache. PostgREST resolves columns *before* RLS, so those 400s proved
nothing about authorisation. A 400 is not a refusal. Re-run with real columns.

### M-3 re-probed — the anon-callable functions give nothing away

Nine `SECURITY DEFINER` functions remain callable by `anon` over RPC. Asked as
a stranger:

    rpc/is_platform_operator  200  false
    rpc/my_org_ids            200  []
    rpc/my_admin_org_ids      200  []
    rpc/my_visible_bid_ids    200  []

They answer honestly about a caller who is nobody. The lint stands; the risk
does not.

### Policies read rather than assumed

Every policy on the money and tenancy tables was read out of `pg_policies`.
They are scoped the way they claim to be — `my_org_ids()`, `my_admin_org_ids()`,
`auth.uid() = user_id`, or a lowercased `auth.jwt() ->> 'email'` match. The anon
reads that do exist are confined to public directory data (`status = 'active'`,
`status = 'open'`) or to join tables for it. **M-1 is fixed**: the
`investment_documents` policy now reads `is_public OR (commitment_id IS NOT NULL
AND ...)` rather than opening on a null column.

### Closed since the last pass

**The three anonymous `auth.users` rows from 16 October are gone.**
`select count(*) from auth.users where is_anonymous = true` gives **0**, of 10
users total. That item was waiting on a decision about a destructive delete; it
no longer needs one.

**Dependencies still clean.** `pnpm audit --audit-level=moderate` reports "No
known vulnerabilities found".

### SP-1 — the predicted regression arrived · **LOW**

`20261016170000_pin_function_search_path.sql` pinned six functions and said why
it mattered even though none was `SECURITY DEFINER`:

> "the dangerous version of this is one `security definer` away: the day
> somebody adds that keyword to a trigger guard, the hole opens silently and
> nothing in review would catch it."

The linter now reports two functions with a mutable `search_path`:

| Function | Created | `SECURITY DEFINER` | Who may EXECUTE |
|---|---|---|---|
| `public.slow_queries` | by hand, undated | no | `service_role` |
| `public.ai_action_request_freeze` | 2026-11-09 | no | `service_role` |

`ai_action_request_freeze` is the instructive one. Its author remembered to
`revoke all ... from public, anon, authenticated` **on the very next line** and
did not pin the path. Careful work, same gap — because nothing checked.

Severity is Low and should be stated as Low: both are `SECURITY INVOKER`, both
are executable only by `service_role`, and that role already bypasses RLS. There
is no path from an anonymous or signed-in caller to either one today.

**Fixed, and the class fixed with it.**
`20261110234500_pin_search_path_and_record_slow_queries.sql` pins both — with
an empty path rather than `public`, because unlike the October six neither body
has an unqualified object reference. More importantly,
`tests/migrationSearchPath.test.ts` now fails the build when any migration
creates a function without a pin, names the file and function, and keeps its own
exemption list honest by failing if an entry goes stale. Proven by adding an
unpinned function and watching it fail, not by watching it pass.

### DRIFT-1 — closed: `slow_queries` is in version control

The only live object in this database with no migration anywhere in the
repository. Carried as open and blocked "waiting on its definition"; the
definition was read back out of `pg_get_functiondef` and is now recorded
verbatim in the migration above, apart from the added pin. Its grants are
restated there too, because they had never been written down either.

### GRANT-1 — RLS is the only thing between `anon` and ten tables · **LOW**

Ten tables have RLS enabled, **zero policies**, and still carry `GRANT SELECT`
and `GRANT INSERT` to `anon`:

    kv_store_3eae23a6   kv_store_57095a78   kv_store_12c91054   kv_store_824f083c
    ai_action_request   ai_call_log         ai_kill_switch      app_error_log
    exchange_deal       query_perf_snapshot

They are closed today and that is proved above, not assumed — RLS with no
permissive policy denies everything, and the 401s confirm it. The finding is
that **this project already does better elsewhere**: `exchange_claim`,
`exchange_claim_challenge`, `exchange_demand_event`, `exchange_lead_event`,
`kv_archive_20261003`, `private_cron_config` and all four `command_center`
tables have the grant revoked, so `anon` cannot reach them even if a policy were
added by mistake.

The ten above are one accidental `TO authenticated USING (true)` away from
exposure, and the four `kv_store_*` tables hold essentially all application
data. This is the same argument H-1 made about anonymous sign-ins: the control
that happens to be load-bearing should not be the only one. Revoking the grant
costs nothing and is not a behaviour change — every one of these is read and
written by the service role.

**Not applied in this pass.** It is a production grant change on the tables that
hold everything, and it wants its own migration and its own verification.

### CSP — do not promote on this evidence yet

The policy has been collecting for four of the seven days. The store is
**empty**: `csp_violations` is absent from all four `kv_store_*` tables.

The header is correctly wired — verified live, absolute, right function path:

    Content-Security-Policy-Report-Only: default-src 'self'; ...
      report-uri https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-3eae23a6/csp-report

So "empty" probably does mean "no violations". But it is not *provable*, and
that is the finding: **nothing counts reports received, only violations
recorded.** An empty store is therefore indistinguishable from a pipe that
never delivered — the identical trap the 6 November note identified one level
down, where a full store that stops counting "looks exactly like a site with no
violations, and 'clean, promote it' is the dangerous conclusion to draw from
it."

Count receipts before promoting. A received-counter that increments even when a
report produces no new fingerprint turns an empty store from an absence of
evidence into evidence of absence.

### Still open, and what each one is waiting on

| Item | Waiting on |
|---|---|
| `GRANT-1` — revoke `anon`/`authenticated` on the ten tables | A migration and a decision. Safe, but it touches everything. |
| `ANON-2` — leaked-password protection | A dashboard toggle; not published to anonymous callers, so it cannot be probed. |
| CSP goes enforcing | Three more days, and a receipts counter so the empty store means something. |
| Origin lock goes enforcing | Cloudflare. Fails open while unset, by design. |
| IP reputation goes enforcing | The `would-block` lines in the edge function logs. |
| Phase 3 Stages 3-4 | A calendar and a budget, not a keyboard. |
| Phase 4 items 12-14 | Subprocessor inventory, access review + MFA, a restore test. |

Closed this pass: `RLS-2`, `M-7`, `M-1`, `DRIFT-1`, the anonymous `auth.users`
rows, and `SP-1` (new, found and fixed).

### A note on method

One probe in this pass was refused by the agent's own tooling — a batch of
anonymous `INSERT`, `PATCH` and `DELETE` attempts against production tables,
including a `DELETE` on the AI kill switch. It was blocked as destructive, which
is the correct call for an unattended agent even when the intent is an audit.
The same questions were answered read-only instead: role-switched `SELECT`s
inside a rolled-back transaction, and the grant and policy tables themselves.
Two of the write probes had already completed and are reported above.

Worth recording because it is a real limit on self-auditing: an agent that
cannot safely attempt a destructive write cannot fully verify that destructive
writes are refused. The remaining gap — anon `UPDATE` and `DELETE` on tables
with RLS and no policies — is closed by the same structural argument as the
`INSERT`s, and an external pen test (Phase 3 Stage 4) is where it gets proved
properly.

### GRANT-1 — closed, 2026-11-11

Applied through the management API, and verified by reading the grants back
rather than trusting the apply.

**What changed.** The ten service-only tables hold nothing for `anon` or
`authenticated` any more. Nobody outside `service_role` holds `TRUNCATE` or
`MAINTAIN` anywhere in `public`. And the Supabase default that caused all of
this is off: `pg_default_acl` for new tables in `public` now reads
`{postgres, service_role}`, where it used to hand `arwdDxtm` to the anonymous
role on every table created.

That last part is the only piece that stops an eleventh table. `app_error_log`
got the full set within an hour of being created on 2026-11-10, without anybody
choosing it.

**The TRUNCATE hole is shut.** `has_table_privilege('anon', 'kv_store_57095a78',
'TRUNCATE')` is now `false`. It was `true`, and RLS does not cover TRUNCATE — a
fact proved on a throwaway table rather than assumed: with RLS on and no
policies, `anon` could see none of three rows and still emptied the table.

**Proved by request, not only by reading privileges.**

    POST/GET anon → kv_store_57095a78   401  permission denied for table
    POST/GET anon → app_error_log        401  permission denied for table
    POST/GET anon → ai_kill_switch       401  permission denied for table

Before this they answered `200 []` — correct, but from RLS alone. A grant
refusal is a second, independent layer, which was the whole point of the
finding.

**The regression check mattered more than the fix.** All 23 tables that are
legitimately reached from a browser kept `SELECT`, `INSERT`, `UPDATE` and
`DELETE` and lost only `TRUNCATE`/`MAINTAIN` — `companies`, `work_requests`,
`organizations`, the `bid_*` family, the `exchange_*` directory, the investment
tables. Confirmed live: the public Exchange directory still returns its rows to
an anonymous reader (`exchange_territory` → Pelham NH, full record).

**Probe after:** `14 passed · 1 failed · 1 warning · 2 skipped`. The failure is
`WAF-1`, a check another session added in the same window — there is no firewall
in front of the API, so the origin can be addressed directly. It is unrelated to
this change and was not introduced by it.

**Still open:** `ANON-2` (a dashboard toggle), CSP promotion (needs a receipts
counter before an empty store means anything), origin lock and IP reputation
enforcement, Phase 3 stages 3–4, Phase 4 items 12–14, and `WAF-1`.
