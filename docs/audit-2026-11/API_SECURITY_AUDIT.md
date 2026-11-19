# Phase 2B — The API

One Hono application on Deno, deployed as the `make-server-3eae23a6` edge
function. Roughly 1,850 route registrations across ~70 modules; the whole
public surface of the platform is this one function.

## The wall is enforcing. Measured, not read.

`index.tsx` puts an authentication gate ahead of every route, with four
explicit exemption lists (`PUBLIC_PREFIXES`, `PUBLIC_GET_PREFIXES`,
`PUBLIC_POST_PATHS`, `ADMIN_PREFIXES`). It was rolled out report-only behind
`AUTH_ENFORCE`. **Production logs for the last 24 hours: 1,304 `[authgate]`
lines, and not one of them says `would-block`.** It is on.

What it refused, by volume: `POST /kv/set` (145), `/design-projects` (50),
`/work-requests` (44), `/customers` (41), `/users` (20), and KV reads of
`hr_payroll_*`, `hr_employees_*`, `bp_subscriptions_*`. Every line reads
`tier=user signedIn=false`.

### A-1 (P3) — Those 1,304 blocks are our own app, and it matters twice

Every blocked line carries `signedIn=false`, and the paths are the owner
dashboard's mount-time fetches. The client fires its full panel load before it
has a session, roughly 1,300 times a day. Two consequences:

- The user sees an empty dashboard rather than a sign-in prompt, because the
  callers discard the 401 — the same swallowed-failure pattern recorded in
  `BROKEN_BUTTONS_REPORT.md`.
- **It poisons the abuse signal.** It is exactly why `presentedCredential`
  exists in `ipReputation.ts` — without it, a signed-out browser scores itself
  into a ban. The anti-abuse module had to be taught to ignore our own noise,
  which is a real cost paid for a client-side bug.

The KV keys ending `_anonymous` are the same bug with a visible fingerprint:
the key is built from an identity the client does not have yet.

## Authorization — the part that was actually broken

The wall proves somebody is signed in. **Every portal customer, tenant, vendor
and subcontractor is signed in.** The real question is per-route, and when
this audit started the answer was frequently "nothing is checked".

Two instruments, both written during this audit:

**`npm run authz:scan`** — static, two buckets. Bucket B, *the caller is
resolved and then never compared to anything*, started at 20 and is **now 0**.
Bucket A, *no caller resolved at all*, stands at **25 leads** still to walk;
most are legitimately public or already prefix-gated and need reading one at a
time, which is why they are leads and not findings.

**A live probe as a real, signed-in, non-staff customer** — the test that
could not be faked, because an unauthenticated request is answered by the wall
before the route's own guard ever runs, so 401 proves nothing. 27 guarded
routes, called with a genuine customer token and deliberately nonsense ids:

| Outcome | n |
|---|---:|
| Refused by the route's own guard (403) | 20 |
| Refused as not-found (404) | 6 |
| 200 | 1 |

**The single 200 is a false positive in my own harness**, and I am recording it
rather than quietly re-scoring it. `GET
/payment/ecommerce/orders/customer/eric%40example.com` answered
`{"orders":[]}`. The route does compare:

```js
const who = await actor(c);
if (!who || (!who.staff && who.email !== String(email || "").toLowerCase()))
  return c.json({ orders: [] });
```

That is the deny branch, and it deliberately returns an empty set rather than a
403 — the same answer a stranger gets for an address with no orders. My harness
scored "not 2xx" as the pass condition, so a correct silent denial read as a
breach.

**Note what that costs. From outside, the deny branch and a genuinely empty
history are indistinguishable, so the probe cannot confirm the fix — only
reading the code can.** A denial that is invisible externally *and* unlogged
(`L-1`) is a control nobody can verify in production. One `console.warn` on
that branch would fix both.

This route is one of 25 in `docs/server-route-authorization.md`. Before the fix
it returned any named customer's full order history — items, totals, addresses
— to anyone who typed their email into the URL.

## Three staged defences, and one of them will break the backups

All three shipped report-only on purpose: *the first draft of a judgement call
does not get to lock people out.* Status today:

| Control | Flag | State |
|---|---|---|
| Auth wall | `AUTH_ENFORCE` | **enforcing** (1,304 blocks, 0 would-block) |
| Origin lock | `ORIGIN_LOCK_ENFORCE` | report-only |
| IP reputation | `IP_REPUTATION_ENFORCE` | report-only, **0 lines in 24h** |

### A-2 (P2) — Enabling the origin lock tonight breaks the nightly storage backup

The origin lock exists because the `supabase.co` project hostname stays public
no matter what sits in front of it, and the project ref is compiled into the
browser bundle — so an attacker simply does not use the Cloudflare name. The
lock requires a shared header that only the WAF adds.

32 `would-block` lines in 24 hours. **31 of them are this audit**, probing the
function directly. The 32nd is:

```
2026-11-19T07:23:02  [originlock] would-block POST .../storage-backup/run  header=absent
```

That is `storage-backup-nightly` — the job that covers the gap in Supabase's
backups, since storage objects are not in the daily database backup. It calls
the function without the header. **Flip the flag and the backups stop silently
on the first night**: the cron keeps firing, the function keeps answering, and
the answer is 403. Give the cron the header, or exempt its path, *before*
enforcing.

### Two honest consequences of this audit's own method

1. Every probe here reached the function directly, bypassing Cloudflare. **No
   finding in this audit depends on the WAF, and equally, nothing here
   verifies the WAF.** Its rules are untested by this work.
2. Those 31 lines are also the proof the lock works: it saw the audit.

### A-3 (P3) — IP reputation has never fired in anger

Zero `[ipreputation]` lines in 24 hours means no caller crossed even the WARN
threshold. The module is correct and idle, which is the right state but is also
no evidence that enforcement is safe. Its one recorded near-miss is in its own
comments: on 2026-11-14 the owner's address sat pinned at the score cap, earned
by the dashboard mounting fifteen panels in one second. `IP_REPUTATION_ALLOW`
was added before enforcement rather than after a lockout.

## Rate limiting — spend, not requests

There is **no per-IP request limiter in the application**, by design: floods
are the firewall's job and it rejects them before the request is paid for
(`docs/security/waf.md`), while the behavioural module above catches what a
firewall cannot see — forty misses on 256-bit share tokens look like forty
ordinary GETs to anything upstream.

What does exist is **cost control**: 26 routes return 429 through `reserve`,
`reserveAiSpend`, `reserveImages` and `meterAi`, metered against plan limits.
Every one is on an AI or image path — the places where an abusive caller spends
the company's money rather than its CPU.

**Not covered: the public unauthenticated POST paths** (`PUBLIC_POST_PATHS` —
application forms, quote requests, consent webhooks). Those have no limiter at
the application layer, and they write records. They were not load-tested
either, because doing so against production would have created real leads.
Carried into `REMEDIATION_PLAN.md` as needing staging.

## CORS and headers

`origin: "*"` on the function — the standard Supabase posture, and tolerable
only because authorization never depends on the origin: the wall requires a
bearer token and no route trusts a cookie. The header allowlist is tight, and
the three `X-*-Secret` headers are shared-secret webhook channels, not caller
identity.

The browser app ships `Strict-Transport-Security`, `X-Frame-Options` and a
`Content-Security-Policy` from `vercel.json`, with violation reports collected
by `cspReports.ts`.

## Still open on this phase

- Bucket A's 25 leads, read one at a time.
- Cross-tenant authorization between two *staff* accounts at different
  companies. The probe used one customer; proving company isolation needs a
  second staff account, which needs the user's approval to create.
