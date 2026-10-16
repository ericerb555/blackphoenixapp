-- Let the server read the state of its own clocks. Applied to production on
-- 2026-10-16.
--
-- WHY THIS NEEDS A FUNCTION AT ALL
--
-- Six pg_cron jobs run this business — on-call escalation every minute, the
-- store tick and the autopilot every fifteen, the watchdog and the screening
-- expiry hourly, compliance reminders daily. Their state lives in `cron.job`
-- and `cron.job_run_details`, and PostgREST serves only exposed schemas, so
-- nothing the edge function can call could see any of it. The only way to find
-- out whether a clock was still running was to open the SQL editor.
--
-- That is the wrong place for the answer. Eric's standing requirement is that
-- anything running autonomously has a place he can review; a clock whose health
-- is only visible to somebody with database access does not have one.
--
-- WHY `succeeded` IS NOT REPORTED AS SUCCESS
--
-- This is the trap, and it is already written up in
-- 20261013150000_cron_jobs_explicit_timeout.sql: pg_cron records a job as
-- "succeeded" when the SQL ran, and the SQL here is `net.http_post`, which
-- only QUEUES a request. A job can read `succeeded` every minute for a week
-- while every single request times out and nothing is ever answered. On
-- 2026-10-13 that happened — "Timeout of 5000 ms reached" — and pg_cron called
-- it a success.
--
-- The only trace of a failed delivery is a row in `net._http_response` with a
-- null `status_code`, which that migration noted "nothing watches". So
-- `automation_undelivered` watches it, and the two are reported side by side:
-- the schedule fired, and separately, whether anybody answered.
--
-- The response table is pruned to a few hours, so the window is returned with
-- the count rather than implied. "2 undelivered" means nothing without "since
-- when".
--
-- WHAT THESE CAN AND CANNOT DO
--
-- Read-only, both of them. SECURITY DEFINER because the caller cannot see those
-- schemas, with `search_path` pinned so nothing can be shadowed into the body.
-- EXECUTE is revoked from `public`, `anon` and `authenticated` and granted only
-- to `service_role`: the schedule of every job, including the ones carrying
-- secrets in their command text, is not something a signed-in portal customer
-- should be able to ask for. The command text itself is never returned by
-- either function.

-- ── the clocks ──────────────────────────────────────────────────────────────

create or replace function public.automation_clocks()
returns table (
  jobname      text,
  schedule     text,
  active       boolean,
  last_run_at  timestamptz,
  last_status  text,
  runs_24h     bigint,
  failed_24h   bigint
)
language sql
security definer
set search_path = pg_catalog, public
stable
as $$
  select
    j.jobname::text,
    j.schedule::text,
    j.active,
    r.last_run_at,
    r.last_status,
    coalesce(r.runs_24h, 0)   as runs_24h,
    coalesce(r.failed_24h, 0) as failed_24h
  from cron.job j
  left join (
    select
      d.jobid,
      max(d.start_time) as last_run_at,
      -- The status of the MOST RECENT run, not of any run. A job that failed
      -- once yesterday and has been fine since is not currently failing.
      (array_agg(d.status order by d.start_time desc))[1]::text as last_status,
      count(*) filter (where d.start_time > now() - interval '24 hours') as runs_24h,
      count(*) filter (
        where d.start_time > now() - interval '24 hours'
          and d.status is distinct from 'succeeded'
      ) as failed_24h
    from cron.job_run_details d
    group by d.jobid
  ) r on r.jobid = j.jobid
  order by j.jobname;
$$;

comment on function public.automation_clocks() is
  'Scheduled job health for the automation screen. A `succeeded` last_status '
  'means the SQL ran, NOT that the HTTP request it queued was answered — pair '
  'it with automation_undelivered().';

-- ── whether anybody answered ────────────────────────────────────────────────

create or replace function public.automation_undelivered()
returns table (
  undelivered  bigint,
  errored      bigint,
  total        bigint,
  window_start timestamptz,
  window_end   timestamptz
)
language sql
security definer
set search_path = pg_catalog, public
stable
as $$
  select
    -- A queued request that never got a status code: the failure pg_cron
    -- reports as a success.
    count(*) filter (where status_code is null)     as undelivered,
    count(*) filter (where status_code >= 400)      as errored,
    count(*)                                        as total,
    -- Returned rather than assumed: net prunes this table, so the window is
    -- however much history happens to be left.
    min(created)                                    as window_start,
    max(created)                                    as window_end
  from net._http_response;
$$;

comment on function public.automation_undelivered() is
  'Queued HTTP requests that got no answer, over whatever window net._http_response '
  'still holds. The window is returned because a count without one means nothing.';

-- ── who may ask ─────────────────────────────────────────────────────────────

revoke execute on function public.automation_clocks()      from public;
revoke execute on function public.automation_undelivered() from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke execute on function public.automation_clocks() from anon';
    execute 'revoke execute on function public.automation_undelivered() from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke execute on function public.automation_clocks() from authenticated';
    execute 'revoke execute on function public.automation_undelivered() from authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.automation_clocks() to service_role';
    execute 'grant execute on function public.automation_undelivered() to service_role';
  end if;
end $$;
