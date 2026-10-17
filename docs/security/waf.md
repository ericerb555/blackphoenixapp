# Putting a WAF in front of the stack

Requested 2026-10-16: *"a web application firewall that sits in front of the
entire stack… filters malicious traffic patterns before they ever reach our
server."* That is the right instinct and it is worth doing. This document is
about one fact that decides how it has to be built.

## The problem: there is no single front door today

```
                    ┌──────────────────────────────────────┐
  browser ─────────►│ theblackphoenixcompany.com → Vercel  │   static site
                    └──────────────────────────────────────┘

  browser ─────────► plzsvzwwcdopnawtiwzm.supabase.co         ← EVERYTHING ELSE
                       /functions/v1/make-server-3eae23a6/…     the API
                       /auth/v1/…                               sign in, sign up
                       /rest/v1/…                               the database
                       /storage/v1/…                            files
```

The browser talks to Supabase **directly**. Verified: 504 call sites across 361
files build `https://${projectId}.supabase.co/functions/v1/…` and fetch it from
the page. Nothing about that traffic passes through Vercel.

So **a WAF on Vercel would protect the static site and none of the API.** Every
route the authorisation gate guards, every customer record, sign-in, and file
download is on a hostname Vercel never sees. That option is close to worthless
here and is listed below only to be ruled out explicitly.

## The second problem: the origin stays reachable

Whatever is put in front, `plzsvzwwcdopnawtiwzm.supabase.co` remains a public
hostname on the internet. The project ref is compiled into the JavaScript
bundle — it has to be, the browser needs it — so anyone who views source can
address the origin directly and the WAF is simply not in the path.

A WAF that can be stepped around by reading the page source is theatre. **Any
plan that does not answer this is not a plan**, which is why the shared-secret
origin lock below is not an optional extra.

## Options

### A. Cloudflare in front of both hostnames — recommended

Move DNS to Cloudflare, proxy the apex to Vercel, and add
`api.theblackphoenixcompany.com` proxying to the Supabase project. Point the
app at the API domain instead of `*.supabase.co`.

Gets you managed OWASP rulesets, bot filtering, edge rate limiting by IP and
path, geo rules, and request inspection ahead of the origin — the actual
request supplied. Free tier covers a surprising amount; WAF managed rulesets
and proper bot management are Pro ($20–25/mo) and up.

Requires: a DNS move, a custom domain on Supabase (a paid add-on, and note it
does **not** retire the `*.supabase.co` hostname), the app repointed, and the
origin lock below.

### B. Vercel WAF only

Cheap, no DNS change, protects 0% of the API. Ruled out — see above.

### C. Proxy the API through Vercel (`/api/*` → Supabase)

One front door, no new domain, no DNS move. Costs a hop of latency on every
call, puts all API traffic through Vercel function invocations and their
limits, and still leaves the origin reachable. Reasonable fallback if the DNS
move is unwelcome; worse steady-state than A.

### D. Supabase's own protections

Supabase fronts projects with their own Cloudflare, but the rules are not
yours. Network restrictions and custom domains exist on paid plans. Useful
alongside A, not a substitute for it.

## The origin lock, which is the part that makes it real

Cloudflare injects a secret header on every request it forwards. The edge
function refuses any request that does not carry it. Direct hits on
`*.supabase.co` then fail, so the WAF is the only way in.

```
browser → api.theblackphoenixcompany.com → [Cloudflare WAF]
             adds  X-Edge-Auth: <32-byte secret>
          → plzsvzwwcdopnawtiwzm.supabase.co → gate checks the header
```

Implementation is small and belongs beside the existing auth gate in
`supabase/functions/server/index.tsx`: a constant-time compare against a
secret from `private_cron_config` (so it rotates without a deploy), refusing
when set and absent.

Three things it must get right, each learned from a trap already recorded in
that file:

- **Report-only first.** Same rollout as `AUTH_ENFORCE`: log what it *would*
  refuse, read the log, then enforce. Switching this on blind locks out every
  caller at once, including Eric.
- **Fail open while unset, closed once set.** The opposite of the cron
  secrets, and deliberately: an unset cron secret should refuse everything,
  but an unset *origin* secret must not take the whole platform down before
  Cloudflare is configured.
- **Webhooks and schedulers do not come through Cloudflare.** Stripe posts to
  the `stripe-webhooks` function and pg_cron posts to the tick endpoints; none
  carries the header. They need exempting exactly the way
  `PUBLIC_POST_PATHS` already exempts them, or the first thing this breaks is
  getting paid.

## Sequencing

The order matters, because step 3 is the expensive one and doing it first
makes the rest cheap.

1. **Cloudflare account, DNS moved, apex proxied to Vercel.** Low risk,
   immediate benefit for the site. Nothing in the repo changes.
2. **WAF rules on in report/log mode.** Watch for a week. Managed rulesets
   produce false positives on exactly the routes that matter — file uploads,
   the blueprint reader, long AI prompts.
3. ~~**Centralise the API base.**~~ **DONE 2026-10-16.** All 504 call sites
   now import `API_BASE_URL`. To move the API, change `SUPABASE_ORIGIN` in
   `src/app/lib/apiConfig.ts` — one line, nothing else. The `API-1` check in
   `scripts/security-probe.mjs` fails if anything starts building the URL by
   hand again, because one such file would silently bypass both the WAF and
   the origin lock.
4. **`api.theblackphoenixcompany.com` → Supabase**, app repointed via the
   constant from step 3.
5. **Origin lock, report-only**, then enforcing once the log is clean.
6. **Add `WAF-1` to `scripts/security-probe.mjs`**: assert that a direct
   request to `*.supabase.co` without the header is refused. Otherwise the
   lock silently stops working the day a secret is rotated wrong, and nothing
   reports it.

## What a WAF does not fix

Worth stating so it is not over-credited in a diligence conversation.

- **It is not a substitute for the controls already built.** The authorisation
  gate, RLS, and server-authoritative pricing are what actually protect the
  data. A WAF filters traffic patterns; it has no idea whether this signed-in
  vendor may read that invoice.
- **It does not fix H-1.** Anonymous sign-ins are a Supabase Auth setting.
  A WAF in front of `/auth/v1` could rate-limit the signup endpoint, but the
  hole is that the endpoint issues credentials to nobody at all — that is two
  clicks in a dashboard, and it should not wait for this project.
- **Managed rules will block something legitimate.** Plan for step 2's
  observation week rather than discovering it through a customer.
