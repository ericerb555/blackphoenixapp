# Phase 6 — Security logging and audit trails

Measured 2026-11-19 against the live database and the server source.

## What exists, with row counts

| Sink | Rows | Range | RLS | Policies |
|---|---:|---|---|---:|
| `ai_call_log` | **623** | 8–18 Nov | on | 0 |
| `app_error_log` | **345** | 10–18 Nov | on | 0 |
| `ai_action_request` | 2 | 11–13 Nov | on | 0 |
| `ai_kill_switch` | 2 | 8 Nov | on | 0 |
| KV `team_role_change:` | **0** | — | n/a | n/a |

**RLS on, zero policies, on every log table.** That is deny-all for `anon` and
`authenticated` — only the service role writes or reads them. Verified earlier
in this audit by probing as both an anonymous caller and a real signed-in
customer: every table answered `permission denied` at the GRANT level.
**Ordinary users cannot read or tamper with the logs.**

## The metadata is good where it exists

`ai_call_log` carries what an investigation actually needs:

> `started_at, finished_at, duration_ms, actor_email, actor_id, actor_role,`
> `authority, agent, operation, provider, model, bucket, outcome, error,`
> `input_digest, input_chars, tokens_in, tokens_out, cost_cents,`
> `action_taken, request_path`

Two things worth calling out as done right:

- **`input_digest`, not the input.** The prompt is fingerprinted rather than
  stored, so the log can prove *which* input produced a call without becoming
  a copy of customer photographs and notes.
- **`actor_role` and `authority` alongside `actor_email`** — the log records
  not just who, but what the server believed they were allowed to be.

`ai_action_request` is a complete approval trail: `requested_by`, `risk`,
`status`, `decided_by`, `decided_at`, `decision_note`, `executed_at`,
`result`. `ai_kill_switch` records `engaged_by/at`, `reason`,
`released_by/at`.

## L-1 (P2) — A permission denial leaves no trace

**This is the gap that matters.** The shared staff guard is:

```js
export async function requireStaff(c: any, next: any) {
  if (await isStaffRequest(c)) return await next();
  return c.json({ success: false, error: "Company access is required for this." }, 403);
}
```

No row, no console line. It is now the gate on eight or more modules —
company config, projects, variance drafts, the page generator, property
management, territory/cohorts, the reel scoreboard, five marketing modules.

So: **a signed-in customer who probes thirty admin routes and is refused
thirty times produces no record anywhere.** The wall above it logs tier-level
blocks (`[authgate] BLOCK … tier=user signedIn=false`), which catches callers
with no session — but a refusal of somebody who *has* an account, which is
the more interesting event, is silent.

The audit brief lists "permission-denied events" and "unauthorized-access
attempts" as required. They are not recorded.

**Recommendation:** one line in `requireStaff` and in the cart guard's
sibling — `console.warn` with path, method and actor email. The cart guard
already does exactly this and its comment explains why: *same answer to a
stranger, different answer to us*.

## L-2 (P3) — No retention or deletion policy

The tables are 11 days old and hold everything since. There is no documented
retention period, no deletion job, and no stated policy. At 623 rows in 10
days this is not yet a cost or privacy problem; it becomes one silently.

## L-3 (P2) — The only alerting surface fabricates alerts

`AdminAlertsPanel` renders invented alerts — including a fake
*"5 failed login attempts"* — whenever the real list is empty. Recorded in
full as `I-1` in `INCOMPLETE_IMPLEMENTATIONS.md`. It belongs here too: **the
one screen that would surface a security event cannot be trusted to mean
anything**, which undoes the value of the logging that does work.

## L-4 (P3) — The role-change trail has never been exercised

`team_role_change:` has **0 rows**. The write exists and was reviewed in
code, but no role has been changed through it in production, so the trail is
unproven in practice rather than known good.

## Where authentication events live

Logins, failed logins, sign-ups and token grants are in **Supabase's own auth
logs**, visible in the log stream as `auth_audit_event` records with action,
actor id, actor username, IP and user agent. They are not duplicated into the
application's tables. That is a reasonable division — but it means retention,
access and alerting for authentication are governed by Supabase's settings,
not by anything in this repository, and nobody has written down what those
settings are.

## Not logged at all

Payment and billing changes, record deletions outside the AI queue, webhook
verification failures, rate-limit violations, and integration failures beyond
the error log. None of these was found to have a dedicated trail.
