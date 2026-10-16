-- The seventh clock: refresh one Exchange town a week.
--
-- ARMED. Applied to production on 2026-10-16, on Eric's instruction, after the
-- two preconditions below were checked rather than assumed.
--
-- It was written and held as `.sql.pending` first, which is this repository's
-- convention for a migration that STARTS SOMETHING RUNNING — `deploy.md`:
-- "Rename to `.sql` to arm one, as its own decision." This one rewrites a live
-- directory of 1,100 businesses against a free endpoint that has already
-- blocked us once, so it belonged in that set until somebody chose.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT WAS CHECKED BEFORE ARMING, AND WHAT TO CHECK IF IT IS EVER RE-ARMED
-- ─────────────────────────────────────────────────────────────────────────────
--
-- 1. THE SERVER IS DEPLOYED. `/exchange/cron-tick` must exist, or every tick
--    is a 404 that pg_cron records as "succeeded" — see the note on
--    `succeeded` below. Checked with:
--
--      curl -s -X POST \
--        https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-3eae23a6/exchange/cron-tick \
--        -H "Authorization: Bearer <anon key>"
--
--    A 401 "Not authorised." is the RIGHT answer: the route exists and is
--    refusing a request with no secret. A 404 or "Sign in required." means it
--    is not deployed, or not listed in PUBLIC_POST_PATHS. It answered 401.
--
-- 2. THE SECRET EXISTS. Without it the header below resolves to NULL, the
--    route refuses every tick, and the only trace is silence that looks
--    exactly like a town where nothing changed. Created as:
--
--      insert into private_cron_config (key, value)
--      values ('exchange_cron_secret', encode(gen_random_bytes(32), 'hex'))
--      on conflict (key) do nothing;
--
--    Verified by running the command's own subquery and confirming it is not
--    null. `GET /exchange/upkeep/status` also reports `secretConfigured`, so
--    it can be confirmed from the Automation screen rather than from SQL.
--
-- 3. STILL OUTSTANDING AT THE TIME OF ARMING: nobody had yet watched a town
--    compile. Windham and Hudson are the first two the clock will reach,
--    because `pickTownToRefresh` puts a never-compiled town ahead of every
--    stale one, and compiling a town writes hundreds of rows describing real
--    businesses who never asked to be listed. `POST /exchange/upkeep/run`
--    does exactly what a tick does, on demand, for watching it happen.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY WEEKLY, AND WHY ONE TOWN
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Eric's decision, 2026-10-13: weekly, one town per tick. Overpass is free and
-- shared and has answered 504 on two of three towns during testing; the first
-- fetcher written against it fired twelve queries back to back and was blocked
-- outright. Ten towns refreshed nightly is ten times that load for information
-- that changes a few times a year.
--
-- The schedule fires DAILY and the job refreshes a town only if the one at the
-- front of the queue is more than seven days old. That is deliberate and it is
-- not the same as scheduling it weekly: with five towns and a seven-day
-- window, a weekly tick would take five weeks to come round to the fifth town.
-- A daily tick that usually does nothing reaches each town every seven days
-- and costs four cheap no-op requests a week. `pickTownToRefresh` owns that
-- decision and is tested, including the case where it correctly does nothing.
--
-- 04:40 UTC, which is 00:40 Eastern — nobody is using the directory and
-- Overpass is at its quietest.
--
-- :40 avoids the two fifteen-minute jobs (:00, :15, :30, :45) and the two
-- hourly ones (:07). It does NOT avoid `on-call-escalation`, which runs every
-- minute of every hour and therefore coincides with everything; there is no
-- minute that misses it, and an earlier draft of this comment claiming the
-- slot was clear of every other job was wrong. The overlap is two concurrent
-- requests to the same edge function, which it already handles ninety-six
-- times a day alongside the store tick.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- `succeeded` DOES NOT MEAN IT WORKED
-- ─────────────────────────────────────────────────────────────────────────────
--
-- pg_cron records this job as succeeded when the SQL ran, and the SQL only
-- QUEUES an HTTP request. A 404, a 401 or a timeout all read as "succeeded"
-- in `cron.job_run_details`. The Automation tab in the Command Center reports
-- the delivery separately, from `net._http_response`, for exactly this reason,
-- and `GET /exchange/upkeep/status` is the record of what the job itself
-- believes it did. Check both after arming; do not trust the schedule alone.
--
-- The 30-second timeout is explicit because the default is five, which already
-- bit on 2026-10-13 — see 20261013150000_cron_jobs_explicit_timeout.sql. An
-- Overpass fetch is the slowest thing any of these jobs does, so if any of
-- them needs the full allowance it is this one.

do $$
declare
  anon_key text;
begin
  -- Read from the same config row the other jobs use rather than pasted in,
  -- so rotating it is one change in one place.
  select value into anon_key from private_cron_config where key = 'anon_key';
  if anon_key is null then
    raise exception 'private_cron_config has no anon_key row; the other cron jobs read it from there';
  end if;

  perform cron.unschedule('exchange-upkeep')
    where exists (select 1 from cron.job where jobname = 'exchange-upkeep');

  perform cron.schedule(
    'exchange-upkeep',
    '40 4 * * *',
    format($cmd$
      select net.http_post(
        url     := 'https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-3eae23a6/exchange/cron-tick',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer %s',
          'X-Exchange-Cron-Secret', (select value from private_cron_config where key = 'exchange_cron_secret')
        ),
        body    := '{}'::jsonb,
        timeout_milliseconds := 30000
      );
    $cmd$, anon_key)
  );
end $$;

-- Read back after applying. A `.sql` file is the only thing in this repository
-- that is never typechecked, never built and never tested, so this was run:
--
--   select jobname, schedule, active from cron.job where jobname = 'exchange-upkeep';
