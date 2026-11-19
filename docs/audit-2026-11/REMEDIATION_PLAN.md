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

### Batch 3 — The thing that will break if nobody touches it (P2)

| | Finding | Fix | Effort |
|---|---|---|---|
| A-2 | Enabling the origin lock stops the nightly storage backup | give the cron the shared header, or exempt its path, **then** set `ORIGIN_LOCK_ENFORCE=true` | ~1h |

This is the one item with a wrong order of operations baked in. Flipping the
flag first means the cron keeps firing, the function keeps answering 403, and
the backups stop with no error anywhere. Header first, verify one nightly run,
then enforce.

Restoration from `storage-backup-nightly` has **never been exercised.** A
backup nobody has restored from is a hypothesis. Add a restore drill here
(~2h) — it is the difference between A08 being covered and being claimed.

### Batch 4 — The eleven tables that never existed (P2, the largest single job)

| | Finding | Decision needed | Effort |
|---|---|---|---|
| D-1 | 11 non-existent tables, 45 call sites | per feature: complete, disable, isolate, or remove | 1–3 days |

Per the brief, **nothing here gets deleted automatically.** Each needs a
classification, and they are not the same:

- `portals` (12 sites), `stakeholders` + `stakeholder_activity` +
  `stakeholder_notifications` (14 sites) — substantial features that were
  built front-first. **Complete or disable**; they are too large to leave
  rendering empty.
- `user_profiles` (7), `user_companies` (2), `company_settings` (2),
  `company_documents` (3) — overlap with what the KV layer and
  `app_metadata` already hold. Likely **remove**, after confirming nothing
  depends on them.
- `security_audit_log` (3) — **complete it.** This is `D-2` and `L-1`; it is
  the one on the list that is a security control.
- `user_activity_log` (1), `notification_templates` (1) — **remove**.

The owner decides. My recommendation is above each group, not a decision.

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

### Batch 6 — Hardening, after the above (P3/P4)

- `A-1` the client fires ~1,300 unauthenticated requests a day — gate panel
  fetches on a session. Fixes the blank dashboard *and* stops poisoning the
  abuse signal. ~3h, and it is the highest-value P3 here.
- `DEP-1` pin one Hono version and one `supabase-js` version in a single
  import module for the edge function, and `pnpm update hono` for the npm
  side. Today the server imports `npm:hono` unpinned in 90 places, so no
  dependency advisory about it can be answered either way. ~2h, and it turns
  A06 from unanswerable into answerable.
- `D-3` `REVOKE EXECUTE … FROM anon` on nine `SECURITY DEFINER` functions. ~30m.
- `L-2` a retention policy and a deletion job. ~2h.
- `A-3` enable `IP_REPUTATION_ENFORCE` after confirming `IP_REPUTATION_ALLOW`
  holds the owner's address. Not before `A-1`, or the dashboard bans its own
  operator.
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
