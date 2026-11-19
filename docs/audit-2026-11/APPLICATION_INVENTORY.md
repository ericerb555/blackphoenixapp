# Phase 1 — Application inventory

Measured 2026-11-19 against the working tree at the commit named below, and
against the live Supabase project. Every number here came from a command, not
an estimate; the command is named so it can be re-run.

## Scale

| Thing | Count | How it was counted |
|---|---:|---|
| Frontend route entries | 367 | `routes.tsx` keys (many are aliases of one page) |
| Page components | 192 | `src/app/pages/*.tsx` |
| All components | 445 | `src/app/components/**/*.tsx` |
| **`<button>` elements** | **4,498** | static grep, `src/app` |
| **`onClick` handlers** | **4,729** | static grep, `src/app` |
| `<form>` elements | 42 | static grep |
| **Server route registrations** | **1,233** | `scripts/authz-scan.mjs` matcher |
| — GET / POST / PUT / PATCH / DELETE | 483 / 545 / 70 / 43 / 92 | same |
| Route-carrying server modules | 107 | same |
| Deployed edge functions | 9 | Supabase API (3 are retired stubs) |
| Migrations | 61 | `supabase/migrations/*.sql` |
| Test files | 225 | `tests/*.test.ts` |
| Automated tests passing | 4,043 | `npm test` |

## Database and storage

| Thing | Count |
|---|---:|
| Public tables | 39 |
| **Tables without RLS** | **0** |
| RLS policies (public / all schemas) | 52 / 56 |
| Public-schema functions | 26 |
| `SECURITY DEFINER` functions | 18 |
| Storage buckets | 20 |
| **Public buckets** | **4** |
| Auth users | 10 |

## Scheduled jobs (pg_cron, all active)

| Job | Schedule |
|---|---|
| `on-call-escalation` | every minute |
| `autopilot-tick` | every 15 min |
| `store-cron-tick` | every 15 min |
| `query-perf-snapshot` | every 15 min |
| `exchange-upkeep` | hourly |
| `screening-invitation-expiry` | hourly |
| `store-watchdog` | hourly |
| `compliance-expiry-reminders` | daily 12:00 |
| `storage-backup-nightly` | daily 07:23 |

## Third-party services the server calls

OpenAI, Anthropic, Stripe, Resend (email), Bird (SMS/voice), Google APIs,
Facebook/Instagram Graph, TikTok, LinkedIn, MapTiler, Unsplash, a CDN.

## What this means for the audit's scope

**4,498 buttons across 367 routes and every role is not something this or any
single session can click.** At a genuinely fast 20 seconds per button —
locate, click, verify the backend call, verify the database change, verify
feedback, verify the disabled state, verify after refresh — one pass of one
role is about 25 hours of machine time, before the other roles.

Stating that plainly is part of the job. The alternative to admitting it is
sampling a few screens and reporting a number that implies the rest, which
rule 2 of this audit forbids.

So the button audit is **risk-ranked rather than exhaustive**, and every
report will carry a tested/not-tested split so nothing untested is ever
counted as passing. The ranking:

1. Anything that writes authority, money, or customer data.
2. Anything a customer can reach without an account.
3. Anything on the owner's daily path.
4. Everything else, sampled, with the sample size stated.

## Already established, with evidence, before this audit began

These are not claims to re-litigate; each has a measurement behind it in
`docs/server-route-authorization.md` section 4 or in the commits named there.

- **RLS**: 39 of 39 public tables enabled. An anonymous caller AND a real
  signed-in customer are both refused at the GRANT level on every table
  probed, including the one holding all business data.
- **Authorization**: 20 of 20 guarded routes refused a real non-staff session,
  with 0 answered by the wall — the distinction that makes the result mean
  anything.
- **The IDOR class**: 38 candidate routes examined, 37 already correct, 1 real
  and fixed. Bucket B of `npm run authz:scan` is empty.
- **Unguarded modules**: company config, projects, variance drafts, the AI page
  generator, property management, territory/cohorts, the reel scoreboard and
  five marketing modules — all were reachable by any signed-in account, all
  now staff-gated and deployed.
- **Storage**: every bucket holding customer files is private; all four public
  buckets listed object by object and contain only website imagery and logos.
- **Secrets**: no privileged key in frontend code or git history; gateway
  credentials removed from browser storage.
- **Retired APIs**: three older generations confirmed serving 410 behind a
  positive `retired: true` marker, with a standing check.

## Known blockers

| Blocker | Consequence | What would clear it |
|---|---|---|
| No test accounts for most roles | Cross-tenant tests for landlord, tenant, vendor, condo, contractor cannot run | Approval to create and later delete one account per role, as was done twice for the staff/non-staff proof |
| SMS is rejected by the provider (Bird E12014) | Every SMS workflow is untestable end to end | A2P 10DLC registration at Bird — Eric's action |
| No staging environment | Destructive and load testing cannot be done safely | A Supabase branch or a second project |
| Payments are live Stripe | Charge/refund paths cannot be exercised | Stripe test-mode keys in a non-production environment |
