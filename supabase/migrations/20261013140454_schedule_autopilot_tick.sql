-- Advance autopilot campaigns on a clock.
--
-- APPLIED 2026-10-13, replacing a file parked since 2026-09-28.
--
-- Until now a campaign only moved while somebody had the Autopilot page open,
-- because the runner was driven by a client heartbeat — so overnight and
-- weekend slots simply never posted. `autopilot.tsx` has had a correct machine
-- route for weeks; what it lacked was a clock.
--
-- SAFE TO ARM, AND CHECKED FIRST: zero `autopilot:index:` keys and zero stored
-- campaigns on this project, so the first ticks iterate nothing and post
-- nothing. The plumbing gets proven while there is nothing to get wrong — which
-- matters for this job more than most, because what it does when it has work is
-- publish to somebody's real social accounts.
--
-- Whose campaigns get advanced is read from the stored keys, never from the
-- request, so a holder of the secret cannot post as an arbitrary account.
insert into private_cron_config (key, value)
values ('autopilot_cron_secret', encode(gen_random_bytes(32), 'base64'))
on conflict (key) do nothing;

select cron.unschedule('autopilot-tick')
where exists (select 1 from cron.job where jobname = 'autopilot-tick');

-- Every fifteen minutes. Campaign slots are scheduled to the quarter hour, and
-- a coarser sweep would post late rather than not at all — for a social post,
-- the difference between a scheduled time and an arbitrary one.
select cron.schedule(
  'autopilot-tick',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-3eae23a6/autopilot/cron-tick',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select value from private_cron_config where key = 'anon_key'),
      'X-Autopilot-Cron-Secret', (select value from private_cron_config where key = 'autopilot_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
