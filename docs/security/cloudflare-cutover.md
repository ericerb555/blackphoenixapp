# Putting Cloudflare in front, step by step

The runbook for the one open item in Phase 5 of
`tasks/security-audit-2026-10-16.md`: *"Cloudflare itself — account, DNS move,
`api.` hostname, rulesets. Needs Eric's registrar and account access."*

Everything in code is already built and deployed, in report-only. This is the
configuration, in the order that does not break anything.

**Read the order as load-bearing.** Three of these steps black out the site or
the API if done early — they are marked **⚠ ORDER**. Each phase ends with a
check; do not start the next until the check passes.

---

## Where things stand before step 1

Re-verified 2026-11-11 by resolving each record and reading the live headers,
because the apex addresses had already moved since October — Vercel rotates
them, which is one more reason the apex goes behind a CNAME-flattened proxy
rather than being pinned by hand.

| | |
|---|---|
| Registrar | Vercel (reselling through Name.com — manage it in **Vercel**) |
| Nameservers | `ns1.vercel-dns.com`, `ns2.vercel-dns.com` — **still Vercel's** |
| Apex A records | `216.150.16.1`, `216.150.1.193` (Vercel; was `.1.65` in October) |
| `www` | A records `216.150.1.193`, `216.150.1.65`. `Server: Vercel`, no `cf-ray` |
| `api.theblackphoenixcompany.com` | A → `216.150.16.1`, `216.150.16.193`; answers 404. The stale record of step 2.1 |
| Cloudflare | account exists |
| Supabase org | **Pro** (`tier_payg`) — custom domains add-on is available |
| `EDGE_ORIGIN_SECRET` / `private_cron_config.edge_origin_secret` | neither set → origin lock inert, failing open by design |
| `ORIGIN_LOCK_ENFORCE` | not set → report-only |

### Every record that has to survive the move

This is the list to tick off against Cloudflare's import in 1.2. **Anything
missing here stops working the moment the nameservers change**, and the two
things that break silently are both email: a DKIM record that is gone does not
bounce anything, it just starts failing authentication at the far end.

| Type | Name | Value | What breaks without it |
|---|---|---|---|
| A | `@` | `216.150.16.1`, `216.150.1.193` | the site |
| A | `www` | `216.150.1.193`, `216.150.1.65` | the site on `www` |
| CAA | `@` | `0 issue "letsencrypt.org"`, `0 issue "pki.goog"`, `0 issue "sectigo.com"` | nothing — and see the note below |
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEB…` (DKIM, 1024-bit) | **every email Resend sends starts failing DKIM** |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | SPF for the same mail |
| MX | `send` | `10 feedback-smtp.us-east-1.amazonses.com` | bounce and complaint handling |

`A`/`AAAA` for the apex and `www` go **orange-cloud (proxied)** — that is the
whole point of the exercise. The mail records go **grey-cloud (DNS only)**;
Cloudflare cannot proxy MX and must not try.

**The CAA records already permit Cloudflare.** Universal SSL issues through
Let's Encrypt and Google Trust Services, and `letsencrypt.org` and `pki.goog`
are both on the list, so certificate issuance will work. Worth knowing because
a CAA record that excludes the new CA fails as a certificate error on the
whole site, which looks like the cutover broke rather than like one DNS row.

### Two gaps found while taking the inventory

Neither is caused by the cutover and both are cheapest to fix during it,
while you are already in the DNS editor.

1. **No SPF record on the apex, and no DMARC anywhere.** `send.` has SPF for
   the mail Resend sends, and the apex has nothing — so anybody can send mail
   claiming to be `@theblackphoenixcompany.com` and no receiving server has
   been told not to believe them. For a company that emails customers quotes
   and invoices, that is the domain somebody would spoof. A DMARC record at
   `_dmarc` starting at `p=none` costs nothing and begins collecting reports
   about who is already sending as you.
2. **The DKIM key is 1024-bit.** Resend will issue a 2048-bit key on request.
   Not urgent, and not something to change in the same hour as a nameserver
   move — one mail change at a time, so a deliverability problem has one
   possible cause.

---

## Phase 1 — move DNS to Cloudflare

### 1.1 Write down what Vercel is serving · **you**

In Vercel → **Domains** → `theblackphoenixcompany.com`, list every DNS record.
Pay particular attention to:

- the apex `A` records
- `www`
- any **MX** records — this is email, and it is the usual casualty
- any **TXT** records (domain verification, SPF, DKIM, DMARC)
- any subdomain pointing at a third party

### 1.2 Compare against what Cloudflare imported · **you**

Cloudflare's scan is good, not perfect. In Cloudflare → **DNS** → **Records**,
check every record from 1.1 is present and identical.

**Anything missing here stops working the moment nameservers change.** Add it
now. This is the single highest-risk step in the whole runbook, and it is
entirely preventable.

### 1.3 Set SSL/TLS mode to Full (strict) · **you** · **⚠ ORDER**

Cloudflare → **SSL/TLS** → **Overview** → set **Full (strict)**.

Do this *before* proxying. On the default *Flexible*, Cloudflare speaks HTTP to
Vercel, Vercel redirects to HTTPS, Cloudflare follows it back round, and the
site dies in a redirect loop with nothing obvious to blame.

### 1.4 Switch the nameservers · **you**

1. Cloudflare → your site → **Overview** → copy the two assigned nameservers.
   They look like `<word>.ns.cloudflare.com` and are unique to your account —
   a pair copied from a tutorial will never activate.
2. Vercel → **Domains** → `theblackphoenixcompany.com` → **Nameservers** →
   **Edit**.
3. **Replace** both `vercel-dns.com` entries with Cloudflare's two. Do not keep
   both providers: resolvers would get different answers depending on which
   they asked.

There is a **Restore Original Nameservers** button on that same page. That is
the undo.

### ✅ Check before Phase 2

```
nslookup -type=NS theblackphoenixcompany.com      # expect *.ns.cloudflare.com
curl -sI https://www.theblackphoenixcompany.com | grep -i cf-ray
```

A `cf-ray` header means Cloudflare is genuinely in the path. **No `cf-ray`
means the record is grey-cloud (DNS only) and there is no firewall** — it looks
identical from the outside otherwise. Turn the orange cloud on for the apex and
`www` in Cloudflare → DNS.

Also confirm the site loads and email still arrives. Propagation is usually
under an hour; Vercel's docs allow up to 48.

---

## Phase 2 — give the API its own hostname

Until this phase the browser still calls `plzsvzwwcdopnawtiwzm.supabase.co`
directly and the firewall protects the static site only — which is nothing that
matters.

### 2.1 Delete the stale `api.` record · **you**

It points at Vercel and returns `404 DEPLOYMENT_NOT_FOUND`. If Cloudflare
imported it, remove it, or step 2.3 will collide with it.

### 2.2 Enable the Supabase custom domain add-on · **you**

Dashboard → project → **Settings → Add-ons → Custom Domain**. A paid add-on on
a paid plan; the org is already Pro.

### 2.3 Register and verify the hostname · **you**

```
supabase domains create --project-ref plzsvzwwcdopnawtiwzm \
  --custom-hostname api.theblackphoenixcompany.com
```

It returns two DNS records to add in **Cloudflare**:

| Type | Name | Value |
|---|---|---|
| CNAME | `api` | `plzsvzwwcdopnawtiwzm.supabase.co` |
| TXT | `_acme-challenge.api` | the challenge value it gives you |

**Leave the CNAME grey-cloud (DNS only) for now · ⚠ ORDER.** Supabase has to
complete an ACME challenge to issue the certificate, and a proxied record can
stop that resolving the way the challenge expects. Proxy it in 2.5, once the
certificate exists.

```
supabase domains reverify --project-ref plzsvzwwcdopnawtiwzm
supabase domains activate --project-ref plzsvzwwcdopnawtiwzm
```

### 2.4 Check it serves the API · **me**

```
curl -sI https://api.theblackphoenixcompany.com/functions/v1/stripe-webhooks
```

Expect the webhook endpoint's own answer, not a Vercel 404.

### 2.5 Turn the orange cloud on for `api.` · **you**

Cloudflare → DNS → the `api` record → proxy **on**. This is the step that puts
the firewall in front of the API. Re-run 2.4 and confirm a `cf-ray` header.

### ⚠ The thing a custom domain does NOT do

`plzsvzwwcdopnawtiwzm.supabase.co` **stays reachable for ever**, and the project
ref is compiled into the browser bundle where anyone can read it. So an
attacker simply addresses the origin and never touches the firewall. Phase 4 is
what closes that, and without Phase 4 this is decoration.

---

## Phase 3 — point the app at the new hostname

### 3.1 One line · **me**

`src/app/lib/apiConfig.ts`:

```ts
export const SUPABASE_ORIGIN = `https://${projectId}.supabase.co`;
```

becomes `https://api.theblackphoenixcompany.com`. All 504 call sites across 361
files read it from there — `/functions/v1` appears exactly once in the built
bundle, which is what that refactor bought. The `API-1` check in
`scripts/security-probe.mjs` fails the build if anyone hand-builds the URL
again, because one such file would silently bypass both the WAF and the origin
lock while showing an empty panel rather than an error.

### 3.2 Deploy and check · **me**

The site, sign-in, the Exchange map, and a storage image. Sign-in matters most:
`/auth/v1` moves with the origin.

---

## Phase 4 — the origin lock, which makes it real

### 4.1 Generate a secret · **you**

32 bytes of randomness. Keep it to hand for the next two steps and do not paste
it into a chat — including to me.

### 4.2 Have Cloudflare add the header · **you**

Cloudflare → **Rules** → **Transform Rules** → **Modify Request Header** →
create a rule that applies to all requests on `api.theblackphoenixcompany.com`
and **sets a static header**:

| Header | Value |
|---|---|
| `X-Edge-Auth` | your secret from 4.1 |

The name must be exactly `X-Edge-Auth` — that is what the middleware reads.

### 4.3 Tell the server the same secret · **you**

Either works; the database is read first and the environment is the fallback:

```
supabase secrets set EDGE_ORIGIN_SECRET=... --project-ref plzsvzwwcdopnawtiwzm
```

or the `private_cron_config` row with key `edge_origin_secret`.

It is cached for 60 seconds, so allow a minute.

### 4.4 Watch report-only for a few days · **both** · **⚠ ORDER**

The lock is still *reporting*. Every request that would have been refused logs:

```
[originlock] would-block GET /path header=absent
```

Ask me to pull those from the edge logs. **Anything legitimate in that list has
to be understood before enforcing** — enforcing with a real caller in there
takes a working feature offline, and the error it returns will not look like a
firewall problem.

Already exempt, because they reach us by internal hops that never touch
Cloudflare, and each authenticates by other means — Stripe webhooks re-verify
with Stripe, the cron endpoints carry their own 32-byte secret:

```
/health              /store/webhook      /screening/webhook
/store/cron-tick     /store/watchdog     /autopilot/cron-tick
/exchange/cron-tick  /compliance/run-reminders
/on-call/escalate-due
/cron/screening/expire-invitations
```

`OPTIONS` preflights are exempt too — a preflight carries no custom headers, so
locking them would break CORS for every browser call.

### 4.5 Enforce · **you**

```
supabase secrets set ORIGIN_LOCK_ENFORCE=true --project-ref plzsvzwwcdopnawtiwzm
```

Only once 4.4 is quiet. To roll back, set it to `false` — the lock returns to
reporting and the API opens up again.

### ✅ Check

A request straight to the origin should now be refused:

```
curl -s https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-3eae23a6/exchange/taxonomy
# expect: This API must be reached through its public endpoint.
```

…while the same call through `api.theblackphoenixcompany.com` succeeds. That
difference is the whole point of the exercise.

---

## Phase 5 — the actual filtering

Only now is there a front door worth putting rules on.

### 5.1 Managed rulesets, in log mode · **you**

Cloudflare **Pro** (~$20–25/mo — confirm current pricing) adds the managed
OWASP rulesets and bot management. Free covers the DNS, proxying, TLS and rules
you write yourself, which is everything Phases 1–4 need, so there is no reason
to pay before this step.

Set the managed rules to **Log** and leave them a week. **They will flag
something legitimate** — a long quote body, a base64 image upload, an SQL-ish
string in a search box.

### 5.2 Promote to block, exception by exception · **you**

Per rule, not all at once.

### 5.3 Rate limiting · **you**

The AI routes first: they are the cheapest thing to attack and the most
expensive to serve. On a usage-priced stack an attack is a billing event as
much as an outage — see `docs/security/ddos-response.md`.

The behavioural IP reputation layer already in the code is complementary: it
scores *meaning* rather than volume, escalates allow → throttle → 15-minute
ban, and decays so a shared office NAT drifts back to clean. It is also in
report-only until Phase 4 settles.

---

## If something breaks

| Symptom | Likely cause | Undo |
|---|---|---|
| Site in a redirect loop | SSL/TLS on *Flexible* | Set **Full (strict)** (1.3) |
| Email stopped | MX records not copied | Add them in Cloudflare (1.2) |
| Site down after NS switch | records missing in Cloudflare | **Restore Original Nameservers** in Vercel |
| API 403 "must be reached through its public endpoint" | enforcing with the header missing | `ORIGIN_LOCK_ENFORCE=false` (4.5) |
| API 404 everywhere after Phase 3 | `api.` not serving Supabase yet | revert `SUPABASE_ORIGIN` (3.1) |
| Stripe webhooks stop | — | they are exempt (4.4); look elsewhere |

Every step is reversible. The two that bite hardest are a missing MX record and
enforcing the lock too early, and both are avoidable by not skipping 1.2 and
4.4.
