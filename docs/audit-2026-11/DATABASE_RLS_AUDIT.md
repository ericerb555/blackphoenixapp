# Phase 2C — Database, RLS and storage

Measured 2026-11-19 against the live project.

## The headline

| | |
|---|---:|
| Public tables | 39 |
| **Tables without RLS** | **0** |
| RLS policies (public / all) | 52 / 56 |
| `SECURITY DEFINER` functions | 18 |
| Storage buckets / public | 20 / 4 |

**Proven, not read.** Earlier in this audit, an anonymous caller *and* a real
signed-in non-staff customer were both pointed at `kv_store_3eae23a6` (all
business data), `exchange_deal`, `ai_call_log` and `private_cron_config`.
Every one answered **`permission denied` (42501)** — denial at the GRANT
level, which is stronger than RLS filtering, for both identities.

## Two correct shapes, not one

**1. Service-role-only tables: RLS on, zero policies.** 20 tables, including
every KV store and every log table. Deny-all to `anon` and `authenticated`;
only the server reaches them. This is what the Supabase advisor flags as
"RLS enabled, no policy" — here it is the design, not an oversight, because
the application's data path is the edge function and not the browser.

**2. Browser-reachable tables with real policies.** The Phoenix Exchange
tables carry 2–4 policies each and are queried directly from the client:

`organizations` (3) · `organization_members` (2) · `companies` (4) ·
`bids` (4) · `bid_requests` (3) · `bid_invitations` (3) ·
`bid_line_prices` (4) · `bid_request_lines` (4) · `bid_request_media` (3)

This is the properly-built part of the platform: authorization lives in the
database, per record, rather than being re-implemented in TypeScript.

## D-1 (P2) — The browser queries eleven tables that do not exist

`src/app` issues `supabase.from(...)` against 20 table names. **Eleven have
never existed:**

`portals` (12 call sites) · `user_profiles` (7) · `stakeholder_notifications`
(6) · `stakeholder_activity` (6) · `security_audit_log` (3) ·
`company_documents` (3) · `user_companies` (2) · `stakeholders` (2) ·
`company_settings` (2) · `user_activity_log` (1) · `notification_templates`
(1)

Every one of those features is dead. `supabase-js` does not throw on a missing
table — it resolves with an error object, which the calling code generally
discards, so the screen renders empty rather than broken. **This is the same
pattern as `user_permissions` and `company_members` on the server**, found
earlier in this audit: a query that has never returned a row, failing quietly
for months.

It fails **closed**, which is why it is P2 and not P1. Nothing is exposed;
things simply do not work.

## D-2 (P2) — Company switching is permanently denied, and the denial is only logged to the browser

`AuthContext.validateCompanyAccessSecure` calls
`supabase.rpc('validate_company_access_secure', …)`. **That function does not
exist in the database.** The RPC errors, and the code returns
`{ allowed: false, error_code: 'RPC_ERROR' }`.

So every company switch is refused — correct direction, and the multi-company
feature is non-functional.

The security record of those refusals is worse. `logSecurityEvent` fires on
five `company_switch_denied` paths and three successes, and its body is:

```js
// Note: security_audit_log table doesn't exist - logging to console instead
console.log('🔒 Security Event:', { user_id, event_type, company_id, … });
// Skip database insert - table doesn't exist
```

**The one category of event this application explicitly instruments as a
security event is a tenant-boundary violation — and every record of one lands
in the browser console of the person who was denied, and nowhere else.** It is
honestly commented, so it is a known stub rather than a hidden failure; the
consequence is the same. See `L-1` in `AUDIT_LOGGING_REPORT.md`.

## D-3 (P3) — Nine `SECURITY DEFINER` functions are callable by `anon`

18 `SECURITY DEFINER` functions exist; the advisor flags 9 as executable by
`anon` via `/rest/v1/rpc/…`, including `is_platform_operator()` and the
`my_*_ids()` family. **Measured:** called anonymously, `is_platform_operator()`
returns `false` — they derive everything from `auth.uid()`, which is null for
an anonymous caller, so they return nothing. Unnecessary surface rather than a
hole. `REVOKE EXECUTE … FROM anon` is the fix.

## Storage

20 buckets, 4 public. **Every object in all four public buckets was listed by
name**: website gallery photographs, company logo variants, a logo cache.
No customer uploads, no blueprints, no quote documents. Every bucket holding
customer files is private, including the new `media-backup`.

## Backups

Supabase Pro daily database backups with 7-day retention. **Storage objects
are not covered by that** — which is why `storage-backup-nightly` exists, runs
at 07:23 daily, and was verified on its first run. Restoration has **not**
been exercised.
