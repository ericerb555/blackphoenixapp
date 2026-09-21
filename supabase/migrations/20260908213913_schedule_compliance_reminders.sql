-- Recovered from the project's applied migration history on 2026-09-20.
--
-- CREDENTIALS ARE NOT IN THIS FILE, AND THAT IS DELIBERATE.
--
-- The version applied to production inserts the real COMPLIANCE_CRON_SECRET as
-- a string literal. Committing that would put a live credential in git, and
-- worse, it would mean every environment rebuilt from this repo shared
-- production's secret. A new environment should get a new secret.
--
-- So this file creates the table and the schedule, and the two values are
-- supplied separately — see the block at the bottom.
--
-- Worth knowing: because the applied version embedded the literal, that secret
-- is sitting in plaintext in supabase_migrations.schema_migrations on
-- production. Only privileged roles can read that table, but it is a place
-- nobody thinks to look, and rotating the secret would be reasonable.

-- The secret lives in a table only the postgres role can read, rather than
-- inline in the cron command where anyone with cron.job select could read it.
create table if not exists private_cron_config (
  key   text primary key,
  value text not null
);
revoke all on private_cron_config from public, anon, authenticated;

select cron.unschedule('compliance-expiry-reminders')
where exists (select 1 from cron.job where jobname = 'compliance-expiry-reminders');

-- 12:00 UTC is 8am Eastern in winter and 9am in summer. A certificate reminder
-- does not need its hour pinned, and this avoids a DST-aware second schedule.
select cron.schedule(
  'compliance-expiry-reminders',
  '0 12 * * *',
  $job$
  select net.http_post(
    url     := 'https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-3eae23a6/compliance/run-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Compliance-Cron-Secret', (select value from private_cron_config where key = 'compliance_cron_secret')
    ),
    body    := '{}'::jsonb
  );
  $job$
);

-- ── Run this by hand, once, per environment ─────────────────────────────────
--
-- The value must match the COMPLIANCE_CRON_SECRET edge function secret in the
-- SAME environment. Generate a fresh one rather than copying production's:
--
--   insert into private_cron_config (key, value)
--   values ('compliance_cron_secret', '<the COMPLIANCE_CRON_SECRET for this environment>')
--   on conflict (key) do update set value = excluded.value;
--
-- Until it is set the job still runs, sends no valid secret, and the route
-- refuses it — which is the safe direction: a misconfigured scheduler does
-- nothing rather than something.
