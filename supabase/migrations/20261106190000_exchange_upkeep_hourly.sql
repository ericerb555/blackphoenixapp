-- The seventh clock, moved from daily to hourly.
--
-- Eric: "we need to make sure we check every town weekly to keep up to date."
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY THIS IS A FREQUENCY CHANGE AND NOT A BATCH SIZE CHANGE
-- ─────────────────────────────────────────────────────────────────────────────
--
-- The clock does ONE town per tick, and that is the design: a refusal from a
-- free endpoint costs one town and retries, instead of taking the directory
-- with it. Keeping every town inside a weekly window is therefore a question
-- of how often the clock ticks, not how much it does per tick.
--
--   daily ticks    7 ticks/week   covers   7 towns on a weekly cycle
--   hourly ticks 168 ticks/week   covers 168 towns on a weekly cycle
--
-- Batching several towns into one daily tick would reach the same number and
-- do it as a burst — five Overpass calls back to back at 04:40. Hourly is one
-- call an hour at most, which is strictly gentler on an endpoint that has
-- already blocked this project once.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- A TICK WITH NOTHING DUE COSTS ONE DATABASE READ AND NO OVERPASS CALL
-- ─────────────────────────────────────────────────────────────────────────────
--
-- This is what makes 24 ticks a day reasonable. `pickTownToRefresh` decides
-- from the territory table alone, and `ingestTerritory` only runs if a town is
-- actually chosen. With `REFRESH_AFTER_DAYS = 7` and thirty towns, about four
-- or five ticks a day do work and the other twenty do nothing but one select.
--
-- The 7-day window is the real throttle. The tick rate only sets the CEILING
-- on how many towns can be kept weekly; the window decides how many actually
-- run on any given day. Raising the rate does not make the clock busier in
-- steady state — it makes a longer list possible.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHERE THIS STOPS WORKING, STATED NOW RATHER THAN DISCOVERED LATER
-- ─────────────────────────────────────────────────────────────────────────────
--
-- 168 ticks a week is the ceiling. Past about 168 towns, "every town weekly"
-- is no longer true however the schedule is written, and the honest options
-- are a longer cycle or a paid Overpass instance. New Hampshire alone has 234
-- municipalities, so that ceiling is reachable with one state — it is not a
-- theoretical limit and it should not come as a surprise.
--
-- The first fill is the other place to watch. Thirty newly added towns are all
-- never-compiled, so they jump the queue ahead of every stale one and the
-- clock will compile roughly 24 a day until they are done — about a day and a
-- half of real Overpass traffic. That is the busiest this will ever be, and it
-- happens only after somebody bulk-adds a county.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THE MINUTE IS NOT ZERO, DELIBERATELY
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Every other scheduled thing in the world fires at the top of the hour. :07
-- costs nothing and keeps this out of that crowd.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- APPLY BY HAND. `deploy.md`: nothing in `supabase/migrations/` is automatic.
--
-- The command below is the one already running, unchanged except the
-- schedule — the secret is still read by a subquery INSIDE the command
-- string, so it resolves at run time rather than being baked in at schedule
-- time. If that row is missing the header is null, every tick is refused, and
-- as of this week a refused tick records a row saying so instead of leaving
-- silence that looks like a quiet clock.
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  anon_key text;
begin
  select value into anon_key from private_cron_config where key = 'anon_key';
  if anon_key is null then
    raise exception 'private_cron_config has no anon_key row; the other cron jobs read it from there';
  end if;

  if not exists (select 1 from private_cron_config where key = 'exchange_cron_secret') then
    raise exception
      'private_cron_config has no exchange_cron_secret row; every tick would be refused. '
      'Create it first: insert into private_cron_config (key, value) values '
      '(''exchange_cron_secret'', encode(gen_random_bytes(32), ''hex''));';
  end if;

  perform cron.unschedule('exchange-upkeep')
    where exists (select 1 from cron.job where jobname = 'exchange-upkeep');

  perform cron.schedule(
    'exchange-upkeep',
    '7 * * * *',
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
-- that is never typechecked, never built and never tested, so run:
--
--   select jobname, schedule, active from cron.job where jobname = 'exchange-upkeep';
--
-- Expect exactly one row: exchange-upkeep | 7 * * * * | t
--
-- Then, within the hour, the Automation screen should show a run. "Every town
-- was refreshed within the last 7 days" is a SUCCESSFUL tick and the expected
-- answer when nothing is due — it is not the clock failing.
