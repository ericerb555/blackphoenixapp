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

1. ⬜ **Turn off anonymous sign-ins.** Dashboard toggle — **Eric only**, no API
   for it. Closes H-1 entirely. `npm run security` fails on `ANON-1` until done.
2. ⬜ **Enable leaked-password protection.** Dashboard toggle — **Eric only**.
   Closes half of M-6.
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
