-- GRANT-1 — stop handing `anon` every privilege on tables only the server uses.
--
-- NOT YET APPLIED. Written, reviewed and committed on 2026-11-10; Eric's call
-- was "build it, don't apply yet". Apply through the management API, not
-- `supabase db push` — see the version-mismatch note in
-- `20261015120000_exchange_listing_logo.sql`. Verification queries at the foot
-- of this file.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT WAS FOUND
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Ten tables have RLS enabled, ZERO policies, and grant `arwdDxtm` — that is
-- INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN —
-- to both `anon` and `authenticated`:
--
--     kv_store_3eae23a6   kv_store_57095a78   kv_store_12c91054   kv_store_824f083c
--     ai_action_request   ai_call_log         ai_kill_switch      app_error_log
--     exchange_deal       query_perf_snapshot
--
-- The first four hold essentially all application data in this system.
--
-- The 2026-11-10 audit first recorded this as "GRANT SELECT and GRANT INSERT",
-- which understated it. The grant is everything.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY RLS IS NOT THE WHOLE ANSWER: TRUNCATE
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Row level security governs SELECT, INSERT, UPDATE and DELETE. **It does not
-- govern TRUNCATE.** TRUNCATE is checked against the table privilege alone, so
-- a table with RLS on and no policies — which refuses every row operation —
-- will still let any role holding the TRUNCATE privilege empty it completely.
--
-- Proved rather than asserted, on a throwaway table inside a rolled-back
-- transaction, 2026-11-10:
--
--     create table zz(id int); insert 3 rows;
--     alter table zz enable row level security;   -- no policies
--     grant all on zz to anon;
--     set local role anon;
--     select count(*) from zz;  -->  0      (RLS refuses every row)
--     truncate zz;              -->  succeeds
--     reset role;
--     select count(*) from zz;  -->  0      (all three rows gone)
--
-- So on the ten tables above, the control everybody believes is protecting them
-- protects them against reads and writes and not against erasure.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- HOW EXPLOITABLE IS IT, HONESTLY
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Not, as far as this pass can tell, from the internet today — and the audit
-- should say so rather than borrow the severity of the word TRUNCATE.
--
-- PostgREST exposes SELECT, INSERT, UPDATE, DELETE and RPC. It has no TRUNCATE
-- verb, so an anonymous caller holding the privilege has no route to use it
-- through the API. Reaching it needs one of: an RPC function that truncates
-- (none exists), a SQL injection into a `SECURITY INVOKER` path, or direct
-- database credentials — and anyone with those has worse options already.
--
-- It is therefore a LOW with a bad tail. The privilege is simply wrong, it is
-- not covered by the control everything else leans on, and the distance between
-- "wrong but unreachable" and "wrong and reachable" is one injected statement
-- in one function.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THE ROOT CAUSE, WHICH IS THE PART WORTH FIXING
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Nobody granted these. `pg_default_acl` for schema `public`, object type `r`,
-- reads:
--
--     postgres        public  r  {postgres=arwdDxtm/postgres,
--                                 anon=arwdDxtm/postgres,
--                                 authenticated=arwdDxtm/postgres,
--                                 service_role=arwdDxtm/postgres}
--     supabase_admin  public  r  {...same shape...}
--
-- That is Supabase's stock default, and it means EVERY new table in `public`
-- is born granting everything to the anonymous role. `app_error_log` was
-- created on 2026-11-10 and had the full set within the hour, without anybody
-- choosing it — which is exactly how the other nine got theirs.
--
-- So the per-table revokes this project has done by hand (`exchange_claim`,
-- `private_cron_config`, `kv_archive_20261003`, all four `command_center`
-- tables) have been swimming against the default the whole time. Section 3
-- turns the default off, which is the only part of this file that stops the
-- eleventh table.
--
-- WHAT SECTION 3 CHANGES FOR WHOEVER WRITES THE NEXT MIGRATION
--
-- After this, a new table in `public` grants nothing to `anon` or
-- `authenticated` until its migration says so. A table reached only through the
-- edge function — which is almost all of them here — needs nothing. A table
-- genuinely read from the browser needs an explicit
-- `grant select on <table> to anon;` alongside its policy. That is the right
-- way round: the grant becomes a decision in a reviewed file instead of a
-- default nobody sees.
--
-- `alter default privileges` only affects the defaults of the role that runs
-- it, so this covers the `postgres` row. The `supabase_admin` row is not ours
-- to change and still applies to tables created BY `supabase_admin` — which is
-- Supabase's own machinery, not application tables. Worth knowing rather than
-- being surprised by later.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. The ten tables: nothing for anon or authenticated.
--
-- Every one is read and written exclusively by the edge function on the
-- service-role key, which bypasses both grants and RLS — verified before
-- writing this by reading each module that touches them:
--
--   kv_store_*           kv_store.tsx (SUPABASE_SERVICE_ROLE_KEY)
--   ai_action_request    actionQueue.ts, phoenixTools.ts
--   ai_call_log          ai-activity.tsx, aiLedger.ts, phoenix-chat.tsx
--   ai_kill_switch       aiKillSwitch.ts
--   app_error_log        app-errors.tsx
--   exchange_deal        exchangeDealRoutes.tsx, exchangeDirectory.tsx
--   query_perf_snapshot  queryPerfRoutes.tsx
--
-- and by confirming no file under `src/` selects from any of them. So this is
-- not expected to change behaviour anywhere. `service_role` is untouched.
-- ─────────────────────────────────────────────────────────────────────────────

revoke all on public.kv_store_3eae23a6   from anon, authenticated;
revoke all on public.kv_store_57095a78   from anon, authenticated;
revoke all on public.kv_store_12c91054   from anon, authenticated;
revoke all on public.kv_store_824f083c   from anon, authenticated;
revoke all on public.ai_action_request    from anon, authenticated;
revoke all on public.ai_call_log          from anon, authenticated;
revoke all on public.ai_kill_switch       from anon, authenticated;
revoke all on public.app_error_log        from anon, authenticated;
revoke all on public.exchange_deal        from anon, authenticated;
revoke all on public.query_perf_snapshot  from anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. TRUNCATE goes everywhere, because no caller should ever have it.
--
-- Deliberately across ALL tables in `public`, not just the ten. The tables with
-- real policies — `companies`, `work_requests`, the `bid_*` family, the
-- `exchange_*` directory, `organizations`, the investment tables — need their
-- SELECT/INSERT/UPDATE/DELETE grants to keep working and keep them. None of
-- them needs TRUNCATE, nothing in PostgREST can ask for it, and RLS would not
-- stop it if something could.
--
-- MAINTAIN goes with it (Postgres 17): VACUUM/ANALYZE/REINDEX/CLUSTER on a
-- table is not a thing a web caller does, and it is a denial-of-service lever
-- on a large table.
-- ─────────────────────────────────────────────────────────────────────────────

revoke truncate on all tables in schema public from anon, authenticated;
revoke maintain on all tables in schema public from anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. The eleventh table is born safe.
-- ─────────────────────────────────────────────────────────────────────────────

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFY AFTER APPLYING
--
-- 1. The ten hold nothing. Expect zero rows:
--
--      select table_name, privilege_type, grantee
--      from information_schema.role_table_grants
--      where table_schema = 'public'
--        and grantee in ('anon','authenticated')
--        and table_name in (
--          'kv_store_3eae23a6','kv_store_57095a78','kv_store_12c91054',
--          'kv_store_824f083c','ai_action_request','ai_call_log',
--          'ai_kill_switch','app_error_log','exchange_deal','query_perf_snapshot');
--
-- 2. Nobody anywhere holds TRUNCATE. Expect zero rows:
--
--      select table_name, grantee from information_schema.role_table_grants
--      where table_schema='public' and grantee in ('anon','authenticated')
--        and privilege_type in ('TRUNCATE','MAINTAIN');
--
-- 3. The tables that SHOULD still be reachable still are. Expect rows for
--    each — this is the regression check that matters most:
--
--      select table_name, privilege_type, grantee
--      from information_schema.role_table_grants
--      where table_schema='public' and grantee in ('anon','authenticated')
--        and table_name in ('companies','work_requests','organizations',
--                           'exchange_category','bid_requests','investment_opportunities')
--      order by table_name, grantee, privilege_type;
--
-- 4. The default is off:
--
--      select pg_get_userbyid(defaclrole), defaclobjtype, defaclacl::text
--      from pg_default_acl d join pg_namespace n on n.oid=d.defaclnamespace
--      where n.nspname='public';
--
-- 5. Then the live probe, which must still pass 14/0: `npm run security`,
--    plus a signed-in pass through the Exchange directory and a quote save,
--    because those are the two paths that read `public` tables from a browser.
-- ─────────────────────────────────────────────────────────────────────────────
