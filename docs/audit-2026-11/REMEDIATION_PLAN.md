# Phase 9 — Remediation plan

25 numbered findings across nine documents, plus three mass categories. This
orders them, says what each costs, and is explicit about which ones are not
mine to decide.

## Already fixed and verified during the audit

Listed first so the plan is not read as a list of outstanding work. Each was
measured before and after:

| What | Evidence |
|---|---|
| Cart IDOR | 200 before, 404 after, as a non-staff customer |
| 20 routes resolving a caller and never comparing it (`authz:scan` bucket B) | 20 → 0 |
| 12 property-management writes, 10 territory routes, reel scoreboard, 5 marketing modules | guards added, probed |
| 2 role-route defects (`/team/members/role`) | deactivation state, and a 409 for non-staff targets |
| Notification test routes (`/notifications/test-email`, `test-sms`) | `requireStaffForTest` added |
| User Management Hub add button | rewritten; bulk role setting added |
| Dead `company_members` / `user_permissions` reads | removed |
| Both failing CI jobs | gitleaks allowlist, `.gitleaksignore`, setup-node cache |
| Bird SMS error translation | `BIRD_SETUP_ERRORS` |

## Order of work, and why this order

The sequencing rule is **fix what lies before you fix what is merely
incomplete.** A button that does nothing wastes a minute. A button that says
"Member added successfully" and adds nobody causes an operator to act on a
false belief — the employee is never onboarded, and nobody finds out until it
matters. Every P1 here is a lie, not a gap.

### Batch 1 — Stop the application lying (P1, four findings) — ✅ DONE 2026-11-19

| | Finding | What was done |
|---|---|---|
| I-1 | The alerts panel invents alerts when there are none | 274-line `demoAlerts` array deleted; the tab bodies already had empty states |
| W-2 | The job page seeds invented financial data into the browser | Seeding removed — **from two pages, not one.** `JobTrackingHub.tsx` was doing the identical thing on a second route; fixing only the page named in the report would have left the fabrication reachable another way |
| W-1 | The job delete button cannot ever work | Button removed. Not wired, because the jobs module has no `DELETE` at any path and adding one is a real decision — a job carries hours, receipts and margin |
| W-3 | "Member added successfully" adds nobody | Modal deleted; the button now goes to `/application-submissions` |

**One correction to this document's own research.** The W-3 entry in
`DEAD_END_WORKFLOWS_REPORT.md` said the backend existed and this was "unwired,
not unbuilt". That was too loose, and checking it properly changed the fix:
`POST /cohorts` creates a *cohort*, and `territory-cohorts.tsx` has
`GET /members` but no `POST`. **The only code that ever writes a `member_`
record is `POST /applications/:id/approve`** — a territory member comes from an
approved application. Adding a create-member endpoint so the form had
something to post to would have routed around the approval step, which is an
authorisation boundary rather than an inconvenience. So the button goes where
members actually come from.

**What the scanners would not have caught**, measured by re-running them after
the fixes: C2 fell 85 → 83, exactly the two seeding toasts. A stayed at 188 and
C1 stayed at 44. **Three of these four were never in any bucket** — `W-1`'s
handler called `confirm()` and `W-3`'s changed state, so both looked like they
did something, and `I-1` was a return value rather than a toast. They came out
of reading. The scanners find the shape; they do not find the lie.

`I-1` and `L-3` were the same defect seen from two angles: **the only alerting
surface in the platform manufactured its own content.** That made every alert
it showed unverifiable, which is worse than having no alerting panel. Closed
in this batch, so `L-3` is closed too even though it is logged P2.

Net effect: **528 lines deleted, 99 added.** Every fix was a deletion or a
redirect, as predicted — but two of the four needed a decision first, and
neither decision was the obvious one. 4,111 tests pass; `tsc` clean on all
four files.

### Batch 2 — Make denials visible — ✅ WRITTEN 2026-11-19, ⚠️ NOT YET DEPLOYED

| | Finding | What was done |
|---|---|---|
| L-1 | A permission denial leaves no trace | **One middleware, not four hundred edits.** A refusal is observable from outside the guard that made it — a 401/403 on a request that carried a credential — so it is logged once, centrally, covering every guard including ones not yet written |
| — | The orders-by-email deny branch is invisible *and* unlogged | `[authz] DENIED-200` on that branch, since it answers 200 by design and the central logger cannot see it |
| D-2 | `logSecurityEvent` writes to the denied user's own browser | Both copies now post to the `app-errors` ingest route with `kind='security'`; the server attributes them from the **verified token**, never the body |

**Why not instrument `requireStaff`.** Most module-local guards
(`requireStripeStaff`, `requireOrdersStaff`, `requireQuoteStaff` and the rest)
never call it, and there are 400+ `403` responses across twenty-odd guards.
Instrumenting the shared one would have covered a fraction while reading as a
fix for all of it.

**Why not fold it into the IP-reputation middleware**, which already inspects
response status: that one returns early for `OPTIONS`, for a request with no
usable address, and for an allowlisted address — and the allowlist holds the
owner's own IPs, so the refusals most worth reading are the ones it skips.

**The log says `claimed=`, not `actor=`.** Naming the refused party properly
costs a `getUser` round trip per refusal, which would make the logging more
expensive than the thing logged. The email is a local decode of an unverified
token body. A test named *A FORGED EMAIL DECODES PERFECTLY* exists to stop a
future reader treating that field as established identity.

#### My first version of this fix answered 204 and stored nothing

Worth recording in full, because it is the audit's own thesis landing on the
auditor. I shipped batch 2, deployed it, and then checked for the row instead
of trusting the status code. There was no row. The function log:

```
[app-errors] could not record a security event: new row for relation
"app_error_log" violates check constraint "app_error_log_kind_known"
```

`app_error_log` carries a deliberate `CHECK` naming the four kinds it accepts,
and it is read as "what is broken" through `app_error_groups`. **The
constraint was right** — a tenant-boundary refusal is not a bug report. Every
security event was being answered 204 and dropped, which is the exact failure
shape these documents catalogue, and it was visible only because the row count
is the test and the 204 is not.

So `security_audit_log` now exists — the table the code has named since before
it existed, and one of `D-1`'s eleven. **Verified after creating it:** RLS on,
zero policies, and no `SELECT` or `INSERT` grant to `anon` or `authenticated`,
so denial is at the GRANT level exactly as on `ai_call_log` and
`app_error_log`. The subject of a record cannot read, alter or delete it.

Two deliberate schema choices: `company_id` is text and **not** a foreign key,
because a record of an attempt on a company must survive that company being
deleted and a cascade would erase precisely the evidence worth keeping; and
there is a partial index on `(event_type, at desc) where outcome = 'denied'`,
because "who has been refused, and how often" is the question the table is for.

#### Verified / not verified, after deploying

| | Status |
|---|---|
| **D-2** — security events reach a server | **Verified.** A probe row landed in `security_audit_log` with `company_id`, `outcome` and `detail` intact, and `actor_email` null — correct, since the probe carried the anon key and so had no session to attribute |
| **L-1** — the central denial logger | **Deployed, NOT verified.** The marker is in the uploaded bundle; no `[authz] DENIED` line has yet been produced |

**Why L-1 cannot be proven from here.** The logger fires on a 401/403 where a
credential was presented, and the anon key deliberately does not count as one.
Trying a malformed bearer instead does not reach the application at all:

```
GET /health   Authorization: Bearer this.is.not-a-real-token
→ 401 {"code":"UNAUTHORIZED_INVALID_JWT_FORMAT","message":"Invalid JWT"}
```

That is the Supabase platform gateway, not this function — `/health` otherwise
answers 200. So a credentialed refusal can only be produced by a **genuinely
valid session token belonging to a real account that a route then refuses**,
which is test account #2 on the list below. Until that exists, this control is
written, shipped, and unproven — and by this audit's own first rule, unproven
is not working.

A useful by-product: because the gateway rejects anything that is not a
well-formed signed JWT, the `'unreadable-token'` branch of the log line is
effectively unreachable in production. It stays as a guard rather than an
expectation.

### Batch 3 — Make the origin lock safe to switch on — ✅ CODE DONE 2026-11-19, flag still off

`A-2`. The cron exemption was one line. Finding out what *else* breaks when the
flag flips was the work.

**`/storage-backup/run` is now on `ORIGIN_LOCK_EXEMPT`.** Safe for the same
reason as every other entry: it carries its own 32-byte
`X-Storage-Backup-Secret` and refuses outright when that secret is unset, so
the origin lock was never what protected it. Checked against the whole crontab
rather than fixed in isolation — nine `pg_cron` jobs, eight hit this function,
seven were already exempt. **This was the only gap**, the newest cron having
been added after the list.

Verified after deploying, by differential, under identical conditions:

| Path | `[originlock]` line | Answer |
|---|---|---|
| `/invoices` (control, not exempt) | **yes** — `would-block … header=absent` | 401, auth gate |
| `/storage-backup/run` (exempt) | **none** | 401, its own secret check |

#### The part that mattered more: enforcement would have broken the retest

`scripts/security-probe.mjs` — the instrument this audit used for its own
retest — sent every functional check straight to `*.supabase.co`. Under an
enforced lock:

- **`AUTH-1`** asks eleven gated paths for a 401 or 403. Every one would answer
  **403 from the lock, never reaching the auth gate.** The check counts 403 as
  refused, so **it would keep passing while measuring something else entirely.**
- **`AUTH-2`** exists precisely to stop `AUTH-1` passing for the wrong reason,
  by proving the API is up. It asks `/health` — which is **on the exempt
  list**, so it would still answer 200 and report that all is well.

The designed interlock fails exactly there. So `AUTH-1`, `AUTH-2` and
`RETIRED-1` now go through the front door like the application does (via
`fnPublic`, overridable with `SECURITY_PROBE_API`), and `WAF-1` keeps the
direct call because the direct call is its subject. Re-run: identical results,
14 passed / 1 failed / 3 skipped, the failure still `WAF-1`.

That re-run is also independent proof Cloudflare adds the header correctly —
`AUTH-1`'s eleven paths went through it and came back 401 from the auth gate
rather than 403 from the lock.

#### Is enforcement ready? The traffic says yes

Measured over 24h: **7,964 responses logged, 168 `would-block`, and zero
`header=wrong`.** So ~98% of traffic already presents a correct `X-Edge-Auth`
and nothing presents a broken one. The `would-block` remainder is this audit
probing directly plus the backup cron — and my own probing is the dominant
source, which inflates that figure.

**`ORIGIN_LOCK_ENFORCE` is still `false`.** Flipping it is a production
behaviour change and the remaining step is the owner's. The safe sequence now:
confirm one nightly cron run after this deploy, then set the flag, then confirm
`WAF-1` turns green and `AUTH-1` stays green.

#### The restore drill — done, non-destructively

Full results in `FINAL_VERIFICATION_REPORT.md`. **168 of 168 originals have a
backup twin with an identical `eTag` and mimetype** — byte-level evidence, no
downloads, no writes. It also corrected this audit's claim that the job had
"run once": it has run three nights, incrementally.

**`BK-1` (P3, new): there is no restore path.** Only `run` and `status` exist.
The bytes are provably there; the procedure is not. ~2h for a restore script
with a `--dry-run`.

### Batch 4 — The eleven tables that never existed — ✅ DONE 2026-11-19

**Decisions taken by the owner: 50 miles for the service radius, "fix them"
for the rest.** Eleven became six. What was done to each group is recorded
under its heading below; `supabase/known-tables.json` carries the same answers
next to the names, so the list cannot drift from the code.

**Group 3 is verified end to end**, and it needed two fixes rather than one.
The route returned the right address and the check would *still* never have
run, because the company's `address_line2` is `Ste 3 PMB 9039` and Nominatim
answers an empty array for it:

```
"50A Northwestern Drive, Ste 3 PMB 9039, Salem, NH, 03079"  →  []
"50A Northwestern Drive, Salem, NH, 03079"  →  42.7791658, -71.2631078
```

A suite or mailbox number never helps a geocoder find a building and reliably
stops it. With line 2 dropped, measured against the live route using the same
haversine the form uses:

| Job site | Distance | Result |
|---|---:|---|
| 100 Main Street, Nashua NH | 10.3 mi | in range, no warning |
| 1600 Pennsylvania Ave NW, Washington DC | 403.6 mi | **out of range, warning shown** |

That is the first time that warning has ever been capable of appearing.

**Group 2** now renders `<FeatureNotBuilt />` on `/portal-management` and on
the three stakeholder tabs of `/reports`. All 2,700 lines of the components are
intact in the tree; it is a three-line revert each. Taking the portal screen
off also removed its delete button, which announced *"Portal deleted
successfully"* against a table that does not exist.

**Group 1** removed: `userService.ts` (489 lines, zero importers),
`companyScope`'s two uncalled functions — its type exports stay, since
`AuthContext` uses them — and the three uncalled document methods. Each left a
note explaining why completing it would have been the wrong answer.

**Two of this repo's own guards caught me while doing it**, and both earned
their keep: the test that every queried table exists flagged
`security_audit_log` before I had registered it, and the test that nothing
lingers on `knownMissing` once the front end stops querying it flagged all five
I had just removed.

| | Finding | Decision needed | Effort |
|---|---|---|---|
| D-1 | 11 non-existent tables, 45 call sites — **1 closed, 4 dead, 6 live** | per group below: complete, disable, or remove | 1–3 days |

Per the brief, **nothing here gets deleted automatically.** Each needs a
classification. Below is the measured version, 2026-11-19 — reachability
traced from the route table inward, not guessed.

**It corrects this document's own first pass**, which grouped
`company_settings` and `company_documents` together as "likely remove". One of
them is dead and the other is a live customer-facing control that has never
run.

#### Group 1 — DEAD. No caller, nothing breaks. (4 tables, 13 calls)

| Table | Calls | Why it is dead |
|---|---:|---|
| `user_profiles` | 7 | `lib/services/userService.ts` — **zero importers** |
| `user_activity_log` | 1 | same file |
| `user_companies` | 2 | `lib/companyScope.ts` — `validateCompanyAccess` and `getUserCompanies` are **never called**; `AuthContext` imports only its *types* |
| `company_documents` | 3 | `CompanyDatabaseService.getDocuments` / `saveDocument` / `deleteDocument` — **all three uncalled** |

**Recommend remove.** KV already holds `user_profile:<email>` rows, so
`userService` duplicates a shape the server owns. Keep `companyScope`'s type
exports; delete only its two unused functions.

#### Group 2 — LIVE AND EMPTY. A routed screen renders nothing. (6 tables, 28 calls)

| Feature | Route | Tables |
|---|---|---|
| Portal management | `/portal-management` | `portals` (12) |
| Enterprise reporting — three dashboards | `/reports`, `/enterprise-reporting` | `stakeholders` (2), `stakeholder_activity` (6), `stakeholder_notifications` (6), `notification_templates` (1), `audit_logs` (1) |

Both are reachable today and both render empty. **Recommend complete or
disable** — the stakeholder five are one feature and should be decided as one.

#### Group 3 — LIVE, AND THE ONE WITH A CUSTOMER CONSEQUENCE (1 table, 2 calls)

`company_settings` (2 calls) in `components/forms/ClientWorkRequestForm.tsx`,
which has 5 importers and is a **customer-facing work-request form**.

**The service-area check on that form has never run.** The code reads
`business_address / city / state / zip` from `company_settings`, geocodes it,
measures the distance to the job site, and sets an error:

> *"This location is 412.3 miles away. We currently serve within 50 miles of
> our business location."*

`company_settings` has never existed, so `settings` is null, the entire
`if (settings)` block is skipped, the distance is never computed and that error
is never set. **A customer four hundred miles away is told nothing.** The
second call reads `service_area_radius` and silently keeps the default.

**Recommend repoint, not remove** — because the data already exists. KV key
`company_branding_profile_anonymous` holds the real business address (Salem,
NH). What is genuinely missing is a `service_area_radius` value, which is a
business decision and not mine: the territory module uses 50 miles
(`CAPACITY_LIMITS.radius`), but that governs subcontractor territories, not
how far this company will travel for a job.

#### Closed already

`security_audit_log` — **built and in service**, batch 2. It was the only
security control on the list.

### Batch 5 — The mass categories

| | Scope | Approach | Effort |
|---|---|---|---|
| C1a | ~12 handlers that announce a completed action and do nothing | fix or disable, one at a time | ~1 day |
| C2 | 83 handlers claiming success without reaching the server (was 85; batch 1 took two) | triage: many are legitimately local state | ~2 days |
| — | 188 controls with no handler at all | triage; most are layout elements the scanner cannot distinguish | ~1 day |
| — | `authz:scan` bucket A, 25 leads | read each; most are legitimately public | ~0.5 day |

C2 and the 188 are **scanner output, not findings.** Treating them as a
defect list would be the error the brief warns about in the other direction:
counting unverified items as failures. They need reading before they need
fixing.

### Batch 6 — Hardening (P3/P4) — 2 of 10 done

#### ✅ A-1 — done 2026-11-19. One file, and it explained a user-visible bug.

`src/app/lib/database.ts` had `getAuthToken()` returning the session token
`|| publicAnonKey` ("demo mode") and `getUserId()` returning the user's id
`|| 'anonymous'`. Signed out, that layer sent the publishable key as a
credential and built every key as `<key>_anonymous`. Now: **no session, no
request** — `saveDual` / `loadDual` carry on with localStorage, which is what
"working offline" always meant. The signed-in key shape is unchanged, because
113 keys are already written that way.

The third consequence was the one nobody had connected to it. `loadDual` syncs
localStorage *up* to the server, so work done before signing in was stored
under `_anonymous` and is then **invisible to the same person once they sign
in**, because the read asks for `<key>_<their uuid>`. Eight such keys hold
2.7 MB of real company data. That is why **Service Area Settings looks blank
to its own owner** — and there are two copies of it, seven months apart:

| Key | Saved | Radius |
|---|---|---:|
| `service_area_settings_anonymous` | 2026-05-10 | 50 |
| `service_area_settings_<owner uuid>` | 2026-09-27 | **55** |

So `/public/service-area` now reads whichever was saved most recently, making
that settings screen authoritative rather than a number in the source. 50
survives only as the floor for a project that has configured nothing.

**Not done, deliberately:** migrating the eight `_anonymous` keys. That is
moving 2.7 MB of production data between namespaces and wants the owner's
say-so, not a tidy-up inside a hardening commit.

#### ✅ D-3 — done 2026-11-19, and the first attempt silently did nothing

`REVOKE … FROM anon` reported success and changed no privilege:
`has_function_privilege('anon', …)` stayed true on all nine. Postgres grants
EXECUTE to **PUBLIC** by default and `anon` inherited it there. The ACL named
it — the leading empty grantee is PUBLIC:

```
{=X/postgres,postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}
```

Safe to revoke PUBLIC precisely because `authenticated` and `service_role`
hold explicit grants in that same ACL — which matters, because **27 policies
across 9 Exchange tables evaluate `org_id in (select my_org_ids())`**, a policy
body runs as the querying role, and revoking from a role a policy applies to
makes it *error* rather than return no rows. All 27 are scoped to
`{authenticated}`; not one to `anon`. Verified both directions afterwards:

| | Result |
|---|---|
| `anon` → `rpc/is_platform_operator` | `401` `42501 permission denied for function` (was `200 false`) |
| `authenticated` → count orgs / bids / bid_requests | **0 rows, no error** — the policies still evaluate |

#### Still open
- `DEP-1` pin one Hono version and one `supabase-js` version in a single
  import module for the edge function, and `pnpm update hono` for the npm
  side. Today the server imports `npm:hono` unpinned in 90 places, so no
  dependency advisory about it can be answered either way. ~2h, and it turns
  A06 from unanswerable into answerable.
- `L-2` a retention policy and a deletion job. ~2h. Note `prune_ai_call_log`
  and `prune_app_error_log` already exist as functions — what is missing is a
  stated period and a schedule, and now `security_audit_log` needs its own
  answer, which should not be the same as an error log's.
- `A-3` enable `IP_REPUTATION_ENFORCE` after confirming `IP_REPUTATION_ALLOW`
  holds the owner's address. **`A-1` was the blocker and it is now closed** —
  the ~1,300 signed-out requests a day that pinned the owner's own address at
  the score cap are gone at the source.
- `S-1` one Supabase config module, three imports. ~30m.
- `F-2` landing-page clipping. ~15m.
- `I-3` remove shipped dev tooling. ~1h.
- `L-4` exercise the role-change trail. ~30m.
- `AI-2` document that `aiSpend` never resets before anything anonymous reuses it. ~15m.

## Not mine to decide — four things waiting on the owner

These are blocking, and three of them block *verification*, not fixes:

1. **The GitHub PAT (`S-3`).** Reported deleted on Tuesday. Deleted is not
   revoked. **This is the only finding in the audit where a credential may
   still be live, and it needs one yes or no.**
2. **Test accounts, one per role.** Cross-tenant isolation between two staff
   accounts at different companies is the single largest untested area in the
   security audit. It cannot be probed with one customer token. **This now also
   blocks verifying `L-1`**, the denial logger shipped in batch 2: producing a
   credentialed refusal needs a valid signed session token, and the platform
   gateway rejects anything short of one before the function sees it.
3. **One hostile prompt-injection payload (`AI-1`).** Designed, unsent. The
   fencing looks sound and the blast radius is bounded by server-side pricing,
   but nothing proves it.
4. **A staging environment.** Load testing and payment testing were both
   skipped because production is the only environment, and the brief forbids
   charging real methods or creating real records. The public unauthenticated
   POST paths — application forms, quote requests — have no rate limiter and
   they write records; that cannot be tested safely here.

Also uncovered and worth naming: **nine cron jobs run autonomously with no
coverage in this audit** (`AI-3`), including `on-call-escalation` every minute
and `autopilot-tick` every fifteen. Their failure, retry and spend behaviour
is unexercised. And **A06 (dependencies) and A10 (SSRF) were not tested** —
recorded as gaps, not passes.

## One thing this plan will not do

No item above weakens a control to make something work. Where a feature is
broken *because* a guard refuses it, the guard stays and the feature is fixed
or disabled — `D-2` is the clearest case: company switching is dead because
its validation RPC does not exist, and the fix is to build the RPC, never to
drop the check.
