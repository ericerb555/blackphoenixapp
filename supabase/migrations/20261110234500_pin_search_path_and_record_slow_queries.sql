-- Pin the search_path on the two functions that still have a mutable one, and
-- put `slow_queries` into version control at last.
--
-- FOUND BY THE 2026-11-10 AUDIT PASS
--
-- `20261016170000_pin_function_search_path.sql` pinned six functions and
-- explained exactly why it mattered even though none of them was SECURITY
-- DEFINER:
--
--   "the dangerous version of this is one `security definer` away: the day
--    somebody adds that keyword to a trigger guard, the hole opens silently
--    and nothing in review would catch it."
--
-- Three weeks later the database linter reports two again:
--
--   public.slow_queries              role mutable search_path
--   public.ai_action_request_freeze  role mutable search_path
--
-- `ai_action_request_freeze` was written on 2026-11-09, and its author
-- remembered to `revoke all ... from public, anon, authenticated` on the very
-- next line and did not pin the path. That is not carelessness, it is the
-- predicted failure: nothing enforces the pin, so every new function
-- reintroduces the lint. `tests/migrationSearchPath.test.ts` now fails the
-- build when a migration adds a function without one, which is the part of
-- this change that stops the next one.
--
-- SEVERITY, STATED HONESTLY
--
-- Low, and lower than the linter's name suggests. Read out of `pg_proc` on
-- 2026-11-10:
--
--   proname                        prosecdef   who may EXECUTE
--   slow_queries                   false       service_role
--   ai_action_request_freeze        false       service_role
--
-- Both are SECURITY INVOKER, so a caller who redirects an unqualified name
-- gains only their own rights, and only `service_role` may call either — a role
-- that already bypasses RLS and owns the schema. There is no path from an
-- anonymous or signed-in caller to these today. This is pinned because the
-- October file is right about the day somebody writes `security definer`.
--
-- WHY `''` HERE AND `public` THERE
--
-- The October six kept `search_path = public` because three of their bodies
-- read `exchange_category`, `organizations` and `organization_category`
-- unqualified, and an empty path breaks those outright. That reasoning does not
-- apply to either function here, and both get the stronger form:
--
--   * `slow_queries` has exactly one object reference, `public.query_perf_snapshot`,
--     and it is already schema-qualified in the live body.
--   * `ai_action_request_freeze` has no object references at all — it compares
--     `new`/`old` fields and raises.
--
-- Everything else either function names (`now`, `make_interval`, `greatest`,
-- `round`, `nullif`, `count`) lives in `pg_catalog`, which is searched first
-- whatever this says.
--
-- THE SCHEMA DRIFT THIS CLOSES
--
-- `slow_queries` was the only live object in this database with no migration
-- anywhere in the repository — created by hand and never written down, so the
-- repo could not rebuild it and nobody reviewing the repo knew it existed. The
-- 2026-10-16 assessment recorded it as outstanding and blocked "waiting on its
-- definition". The definition below was read back out of `pg_get_functiondef`
-- on 2026-11-10 and is reproduced verbatim apart from the added `set
-- search_path`, so applying this file is a no-op against the running function
-- except for the pin.
--
-- Its sibling `capture_query_perf()` was already migrated and already pinned in
-- `20261016160000_slow_query_log.sql`; only the reader was missing.
--
-- HOW THIS GETS APPLIED
--
-- By hand through the management API, not `supabase db push` — see the
-- version-mismatch note in `20261015120000_exchange_listing_logo.sql`.

alter function public.ai_action_request_freeze()
  set search_path = '';

create or replace function public.slow_queries(
  threshold_ms double precision default 100,
  window_hours integer default 24
)
returns table(
  queryid bigint,
  query text,
  calls bigint,
  mean_ms double precision,
  max_ms double precision,
  total_ms double precision,
  rows_returned bigint,
  blks_from_disk bigint,
  cache_hit_pct numeric,
  wal_bytes numeric,
  first_seen timestamp with time zone,
  last_seen timestamp with time zone,
  basis text
)
language sql
stable
set search_path = ''
as $function$
  with bounded as (
    select *
    from public.query_perf_snapshot
    where captured_at > now() - make_interval(hours => greatest(1, window_hours))
  ),
  edges as (
    select s.queryid, min(s.captured_at) as first_seen, max(s.captured_at) as last_seen,
           count(*) as samples
    from bounded s group by s.queryid
  ),
  delta as (
    select
      e.queryid, e.first_seen, e.last_seen, e.samples, last.query,
      /*
       * With only one sample there is nothing to subtract, so the sample's own
       * lifetime totals are reported and `basis` says 'lifetime'. That is the
       * state for the first fifteen minutes after this is installed, and after
       * any gap longer than the window. Reporting nothing would read as
       * "nothing is slow", which is a different and wrong answer.
       *
       * A counter that went backwards means pg_stat_statements was reset
       * inside the window; the later sample is then the whole truth we have.
       */
      case when e.samples < 2 then last.calls
           when last.calls >= firsts.calls then last.calls - firsts.calls
           else last.calls end as calls,
      case when e.samples < 2 then last.total_exec_ms
           when last.total_exec_ms >= firsts.total_exec_ms then last.total_exec_ms - firsts.total_exec_ms
           else last.total_exec_ms end as total_ms,
      greatest(last.max_exec_ms, firsts.max_exec_ms) as max_ms,
      case when e.samples < 2 then last.rows_returned
           when last.rows_returned >= firsts.rows_returned then last.rows_returned - firsts.rows_returned
           else last.rows_returned end as rows_returned,
      case when e.samples < 2 then last.shared_blks_read
           when last.shared_blks_read >= firsts.shared_blks_read then last.shared_blks_read - firsts.shared_blks_read
           else last.shared_blks_read end as blks_read,
      case when e.samples < 2 then last.shared_blks_hit
           when last.shared_blks_hit >= firsts.shared_blks_hit then last.shared_blks_hit - firsts.shared_blks_hit
           else last.shared_blks_hit end as blks_hit,
      case when e.samples < 2 then last.wal_bytes
           when last.wal_bytes >= firsts.wal_bytes then last.wal_bytes - firsts.wal_bytes
           else last.wal_bytes end as wal_bytes
    from edges e
    join bounded firsts on firsts.queryid = e.queryid and firsts.captured_at = e.first_seen
    join bounded last   on last.queryid   = e.queryid and last.captured_at   = e.last_seen
  )
  select
    d.queryid, d.query, d.calls,
    case when d.calls > 0 then d.total_ms / d.calls else 0 end as mean_ms,
    d.max_ms, d.total_ms, d.rows_returned,
    d.blks_read as blks_from_disk,
    case when (d.blks_hit + d.blks_read) > 0
         then round(100.0 * d.blks_hit / (d.blks_hit + d.blks_read), 1) else null end as cache_hit_pct,
    d.wal_bytes, d.first_seen, d.last_seen,
    case when d.samples < 2 then 'lifetime' else 'window' end as basis
  from delta d
  where d.calls > 0
    and (d.total_ms / nullif(d.calls, 0)) >= threshold_ms
  order by d.total_ms desc
  limit 100;
$function$;

/**
 * Who may read the slow-query log.
 *
 * `create or replace` does not touch privileges, so this only restates what
 * `pg_proc` already reported on 2026-11-10 — EXECUTE held by `service_role`
 * alone. Restated anyway, because the reason this function had no migration is
 * that its grants were never written down either, and a reader of this file
 * should not have to query production to learn who can call it.
 *
 * It exposes `query` text from `pg_stat_statements`, which carries the shape of
 * every statement the application runs. That is reconnaissance, not customer
 * data, and it still is not for anonymous callers.
 */
revoke all on function public.slow_queries(double precision, integer) from public, anon, authenticated;
grant execute on function public.slow_queries(double precision, integer) to service_role;
