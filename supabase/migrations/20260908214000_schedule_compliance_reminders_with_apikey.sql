-- Recovered from the project's applied migration history on 2026-09-20.
--
-- CREDENTIALS ARE NOT IN THIS FILE — see the note in the migration before this
-- one. The applied version inserts the project's publishable anon key as a
-- literal; it is supplied per environment instead, at the bottom.
--
-- WHY THE ANON KEY IS NEEDED AT ALL
--
-- The edge function gateway rejects a request with no Authorization header
-- before it reaches any of our code, so the scheduled call needs the publishable
-- anon key as well as the shared secret. The anon key identifies the project and
-- nobody in particular; COMPLIANCE_CRON_SECRET is what actually authorises the
-- run. Proven by firing the command by hand: without this header it answered
-- 401 UNAUTHORIZED_NO_AUTH_HEADER, and the job would have failed silently every
-- morning.

select cron.unschedule('compliance-expiry-reminders')
where exists (select 1 from cron.job where jobname = 'compliance-expiry-reminders');

select cron.schedule(
  'compliance-expiry-reminders',
  '0 12 * * *',
  $job$
  select net.http_post(
    url     := 'https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-3eae23a6/compliance/run-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select value from private_cron_config where key = 'anon_key'),
      'X-Compliance-Cron-Secret', (select value from private_cron_config where key = 'compliance_cron_secret')
    ),
    body    := '{}'::jsonb
  );
  $job$
);

-- ── Run this by hand, once, per environment ─────────────────────────────────
--
-- The publishable anon key of the environment this is running in — NOT
-- production's, or a branch would call production's function:
--
--   insert into private_cron_config (key, value)
--   values ('anon_key', '<this environment''s publishable anon key>')
--   on conflict (key) do update set value = excluded.value;
--
-- The URL above is also production's. Rebuilding elsewhere means pointing it at
-- that environment's own function host — which is the same hardcoded-project-ref
-- problem the application code has, recorded in tasks/todo.md.
