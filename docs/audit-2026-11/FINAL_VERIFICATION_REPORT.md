# Phase 10 — Verification

Everything below was re-run today, 2026-11-19, against production and the
current tree. This is the retest, not a summary of earlier results.

## What was re-run, and what it said

### The credential-free production probe — `node scripts/security-probe.mjs`

This already existed in the repo: an executable version of the October
outside-team audit, using only the publishable key, which is what an attacker
has. **14 passed · 1 failed · 3 skipped.**

| Check | Result |
|---|---|
| `AUTH-2` API is up, so `AUTH-1` means something | ok |
| `AUTH-1` The gate refuses anonymous callers | **ok** |
| `ANON-1` Anonymous sign-ins disabled | ok |
| `RLS-1` No table returns data to an unauthenticated reader | **ok** |
| `RETIRED-1` Retired API generations still decommissioned | ok |
| `HDR-FRAME`, HSTS, CSP, nosniff, referrer, permissions | ok (6) |
| `HDR-CSP-HASH` CSP inline-script hashes match `index.html` | ok |
| `API-1` API base URL defined only in `apiConfig.ts` | ok |
| `SEC-1` No credentials committed | **ok** |
| **`WAF-1` A firewall fronts the API and the origin refuses bypass** | **FAIL** |
| `ANON-2` leaked-password protection, `RLS-2` (needs service key), `DEP-1` (`--quick`) | skipped (3) |

**`SEC-1` independently corroborates the bundle scan** in
`SECURITY_AUDIT_REPORT.md §2A-2`, by a different method. Two instruments, same
answer: no secret is committed and none ships to the browser.

**`WAF-1` is `A-2`, confirmed from the outside.** The probe's own wording:
*a direct request to the Supabase origin with no firewall header answered 401 —
the firewall can be walked around.* That is exactly what the 32 `would-block`
log lines say from the inside. Two independent measurements, one conclusion,
and the remediation order matters: **header the backup cron before enforcing**,
or the nightly storage backup stops silently.

### Static authorization scan — `npm run authz:scan`

| Bucket | At audit start | Today |
|---|---:|---:|
| B — caller resolved, never compared (the IDOR class) | 20 | **0** |
| A — no caller resolved at all (leads, not findings) | 25 | **25** |

Bucket A is unchanged and that is honest: those 25 need reading one at a time
and most are legitimately public. The remaining ones are named in the scan
output — `architect-review` token routes, `media/:mediaId` delete,
`schedule/confirm`, `subscription-plan-overrides/:planId`, `pipeline/items`,
`trash-estimator/confirm-anonymous`.

### Test suite

**4,111 tests, 4,111 pass, 0 fail**, 8.9s. Including the tests written during
this audit for the QR send path — that a text carries the destination and never
the PNG, and that a hostile label cannot break out of the email HTML.

### Dependency audit — and it found something new

`npm audit` **cannot read this project's lockfile** (it is `pnpm-lock.yaml`),
and my first attempt at it returned an empty result that looked like a pass.
It was not a pass; it was a tool failing quietly — the exact pattern this
audit has been cataloguing all day. Re-run correctly:

**5 advisories in production dependencies: 1 low, 4 moderate, 0 high, 0
critical.** All in `hono`, all patched in `>= 4.13.16`. `package.json` already
allows that (`^4.13.13`), so the npm side is one `pnpm update hono` away.

#### DEP-1 (P2, new) — the deployed server's framework version is undeclared

The edge function does not get its dependencies from the lockfile. It imports
them by `npm:` specifier, resolved by Deno at deploy time:

| Specifier | Occurrences |
|---|---:|
| `npm:hono@4` | 301 |
| `npm:hono` (bare, no version at all) | 90 |
| `npm:hono@^4.0.0` | 4 |

Not one pins a patch version. **So whether those 5 advisories are present in
production cannot be determined from this repository** — the answer depends on
what Deno resolved the last time the function was deployed, and it can change
between two deploys of identical source.

`@supabase/supabase-js` is worse: four specifiers in one function — bare,
`@2`, `@2.39.3`, and `@2.39.7`. Two different pinned versions of the same
client library, plus two unpinned, which can put more than one copy in the
bundle.

This is low-severity today — the advisories are moderate and the `css` helper
the XSS one affects is not used — but it means the server has **no dependency
inventory**, so no future advisory can be answered either. Pin one Hono
version and one supabase-js version in one import module, and `A06` becomes
answerable instead of unanswerable.

## Verified fixes, with before and after

| Fix | Before | After |
|---|---|---|
| Cart IDOR | 200, another customer's cart | 404 |
| 20 bucket-B routes | caller resolved, never compared | 0 remaining |
| 27 guarded routes, probed as a real non-staff customer | — | 20 × 403, 6 × 404, 1 × 200 |
| `/notifications/test-sms`, `test-email` | any session | staff only |
| `/team/members/role` | accepted non-staff targets, ignored deactivation | 409 + standing check |
| User Management Hub add button | did nothing | works; bulk role setting added |
| Both failing CI jobs | failing | passing |

**That one remaining 200 is my own harness, not a breach**, and it is written
up as such in `API_SECURITY_AUDIT.md` rather than quietly re-scored. The route
denies by returning an empty list — deliberately the same answer a stranger
gets for an address with no orders — and my pass condition was "not 2xx". The
lesson outlived the correction: that denial is invisible from outside *and*
unlogged, so it is a control nobody can verify in production. It is `L-1`'s
best argument.

## What this audit does NOT verify

Per the brief: an untested item is not a passing item.

| Area | Why not |
|---|---|
| The WAF's rules | Every probe here bypassed Cloudflare by design. Nothing here tests it. |
| Cross-tenant isolation between two **staff** accounts | Needs a second staff account at a second company — owner approval. |
| Prompt injection against a serious attempt (`AI-1`) | One payload designed, unsent, awaiting approval. |
| Load behaviour, and the unauthenticated POST paths that write records | Production is the only environment. Testing would create real leads. |
| Payment flows | Would charge real methods. |
| Nine autonomous cron jobs (`AI-3`) | `on-call-escalation` every minute, `autopilot-tick` every fifteen. Failure, retry and spend unexercised. |
| ~~Restoring from `storage-backup-nightly`~~ | **Superseded 2026-11-19 — see the drill below.** The contents are now verified byte-for-byte; what is missing is a restore *procedure* (`BK-1`). |
| `A10` SSRF — `outboundGuard.ts` | Exists, gates outbound fetches, not probed. |
| Whether the GitHub PAT was **revoked** | Reported deleted Tuesday. Deleted is not revoked. Only the owner can answer. |

## The storage-backup drill — and a correction to this document

Run 2026-11-19, non-destructively: **nothing was written to production
storage.** Every original was compared against its backup twin instead.

| | |
|---|---:|
| Originals (all buckets except `media-backup`) | 168 |
| With a backup twin | **168** |
| Missing from backup | **0** |
| Size mismatches | **0** |
| **Pairs with identical `eTag` and identical mimetype** | **168** |
| Source size | 227 MB |

`eTag` is the content MD5 for a simple upload, so that last row is byte-level
evidence that the second copy matches — obtained with no downloads and no
writes.

**The correction.** This report said the job "has run once". The manifests say
three nights, and incrementally: 17 Nov copied 165 of 165, 18 Nov copied 3 new,
19 Nov copied 0. It is working, and it is genuinely incremental.

**And a warning about how not to check it.** `cron.job_run_details` says
`succeeded` for both nights, and that proves nothing either way:
`net.http_post` is asynchronous, so the job only ever learns that the statement
queued. Another success-shaped answer. The manifest is the evidence; the cron's
own verdict is not.

### BK-1 (P3) — the backup has no restore path

Only `/storage-backup/run` and `/storage-backup/status` exist. The word
"restore" appears once in the codebase, in a comment explaining why the path
layout would help one. So the bytes are provably present and provably
identical, and recovery today means somebody writing a procedure under
pressure or clicking through the dashboard object by object.

P3 rather than P2 because the data is safe and a manual restore is feasible —
but a backup with no tested restore is a hypothesis about the part that
matters. A restore script with a `--dry-run` is ~2h.

## What this audit left behind

A security probe that leaves residue is a probe that has to be cleaned up after,
and `security-probe.mjs` was written with that rule in its header — the October
audit created three anonymous auth rows and the lesson was taken. This audit's
manual probing was less disciplined, so here is the full account:

| Residue | State |
|---|---|
| `kv_store_57095a78` → `user_profile:authz-probe-1794947626875@…` | **deleted 2026-11-19** |
| `kv_store_57095a78` → `user_profile:authz-smstest-1795034044436@…` | **deleted 2026-11-19** |
| The two matching `auth.users` accounts | already gone |
| `security_audit_log` → one `deploy_verification_probe` row | kept deliberately: it is the evidence that `D-2` works, and its `detail` says so |
| 31 of the 32 `[originlock] would-block` lines in the 24h window | this audit, probing the function directly. Worth knowing before anyone reads that figure as bypass traffic |

The two KV rows were deleted on the owner's say-so. They were asked about
first rather than quietly tidied, because deleting production data on my own
initiative is exactly what the brief forbids — even when the data is mine.

Their auth accounts being gone is also why `L-1` could not be verified: the
token that would have produced a credentialed refusal belonged to one of them.

## The honest bottom line

**The deliberate security work in this platform is strong and it holds up to
measurement.** RLS on 39 of 39 tables, with GRANT-level denial proven against
two separate identities. No secret in the bundle, confirmed twice by different
means. Authority read from `app_metadata`, the bag an account cannot write for
itself. The auth wall enforcing in production, 1,304 refusals in a day. A
closed action registry for the AI agent with a real, asymmetric kill switch.

**The risk is concentrated almost entirely in one failure mode: things that
silently do nothing and report success.** Eleven tables that never existed. An
RPC that never existed. A permission denial with no trace. An alerting panel
that invents its own alerts. A dashboard that fetches 1,300 times a day with
no session and shows a blank screen. A dependency audit that returned `{}`
because the tool could not read the lockfile.

Four P1 findings, and every one of them is the application telling the operator
something untrue. That is where `REMEDIATION_PLAN.md` starts, and half a day
clears all four.
