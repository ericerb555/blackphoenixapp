-- Escalate on-call rotas that have run out of time.
--
-- APPLIED 2026-10-13, replacing a file parked since 2026-09-23.
--
-- The most consequential job on this clock: it rings people's phones and can
-- post somebody's emergency to the open market. Three things were therefore
-- checked before arming it rather than after.
--
-- 1. The route refuses everything when no secret is configured. Confirmed
--    against production immediately before this migration: a POST carrying the
--    publishable key answered 503 "Escalation is not configured on this
--    server."
-- 2. There was nothing for it to act on: zero on-call rota keys and zero open
--    calls. The first ticks walk an empty index.
-- 3. The route decides nothing. `dueAction` says what each call is owed and
--    `escalationGoesToExchange` says where, both from the plan made when the
--    call came in. It walks, applies and reports.
--
-- The secret lives in private_cron_config like every other machine route here.
-- `on-call.tsx` read the environment only until today and now reads the table
-- first, with the environment kept as a fallback so an existing
-- ON_CALL_CRON_SECRET deployment is unaffected. Neither source is trusted when
-- empty.
insert into private_cron_config (key, value)
values ('on_call_cron_secret', encode(gen_random_bytes(32), 'base64'))
on conflict (key) do nothing;

select cron.unschedule('on-call-escalation')
where exists (select 1 from cron.job where jobname = 'on-call-escalation');

-- Every minute, because the unit the rota is written in is minutes: "ring Dan,
-- and if he has not answered in ten minutes ring Ray". A five-minute sweep
-- would make a ten-minute wait anything from ten to fifteen, a third of the way
-- into the next person's patience. The sweep is cheap — a bounded window of
-- calls, acting only on those whose clock has run out.
select cron.schedule(
  'on-call-escalation',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-3eae23a6/on-call/escalate-due',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select value from private_cron_config where key = 'anon_key'),
      'X-On-Call-Cron-Secret', (select value from private_cron_config where key = 'on_call_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Verified after applying: HTTP 200, {"success":true,"examined":0,"acted":[]}
