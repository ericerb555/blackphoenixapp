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

### Batch 1 — Stop the application lying (P1, four findings)

| | Finding | Fix | Effort |
|---|---|---|---|
| W-3 | "Member added successfully" adds nobody | call the real invite route, or disable the control | ~1h |
| W-1 | The job delete button cannot ever work | wire to the delete route, or remove the button | ~1h |
| W-2 | The job page seeds invented financial data into the browser | delete the seed; render an empty state | ~1h |
| I-1 | The alerts panel invents alerts when there are none | remove the fabrication; empty means empty | ~1h |

`I-1` and `L-3` are the same defect seen from two angles: **the only alerting
surface in the platform manufactures its own content.** That makes every alert
it shows unverifiable, which is worse than having no alerting panel. Fix it in
this batch even though `L-3` is logged P2.

Half a day, all four, and every one is a deletion or a one-line rewire. This
batch should go first regardless of what else is scheduled.

### Batch 2 — Make denials visible (P2, cheap, and it unblocks verification)

| | Finding | Fix | Effort |
|---|---|---|---|
| L-1 | A permission denial leaves no trace | one `console.warn` in `requireStaff` with path, method, actor | ~30m |
| — | The orders-by-email deny branch is invisible *and* unlogged | same line, on that branch | ~15m |
| D-2 | `logSecurityEvent` writes to the denied user's own browser | post to a server route; or create `security_audit_log` with service-role-only access | ~2h |

**Do this second, not later, because it is the prerequisite for verifying
everything else.** Today a customer can probe thirty admin routes, be refused
thirty times, and leave no record anywhere — so no fix in this plan can be
confirmed to be holding in production. The cart guard already does exactly
this and its comment explains the principle: *same answer to a stranger,
different answer to us.*

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
| C2 | 85 handlers claiming success without reaching the server | triage: many are legitimately local state | ~2 days |
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
   security audit. It cannot be probed with one customer token.
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
