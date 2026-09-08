-- The daily run that chases expiring insurance and licences.
--
-- WHY A SCHEDULER AND NOT A LAZY CHECK
--
-- The timeclock's auto-close runs whenever somebody reads a shift, which works
-- because everything that cares about a stale punch reads it on the way past.
-- That is exactly what is not true of a certificate: nobody opens the record of
-- a subcontractor who has gone quiet, and a policy lapsing on a company you are
-- not currently working with is precisely the one you learn about too late. It
-- has to run whether or not anyone is looking.
--
-- WHAT WAS LEARNED BY RUNNING IT
--
-- The first version sent only the shared secret and got
-- `401 UNAUTHORIZED_NO_AUTH_HEADER`. The edge function gateway refuses a request
-- with no `Authorization` header before any of our code sees it, so the job
-- would have failed silently at eight o'clock every morning and the first
-- symptom would have been an uninsured subcontractor on a site. Firing the
-- command by hand and reading `net._http_response` is what caught it; the
-- schedule existing is not evidence that it works.
--
-- The anon key identifies the project and nobody in particular — it is
-- published in the client bundle. `COMPLIANCE_CRON_SECRET` is what actually
-- authorises the run, and the route refuses everything when that variable is
-- unset rather than falling open.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- Secrets live in a table the browser roles cannot read, rather than inline in
-- the cron command where anyone able to select from cron.job could see them.
create table if not exists private_cron_config (
  key   text primary key,
  value text not null
);
revoke all on private_cron_config from public, anon, authenticated;

-- Values are set out of band; this migration does not carry them.
--   insert into private_cron_config (key, value)
--   values ('compliance_cron_secret', '…'), ('anon_key', '…')
--   on conflict (key) do update set value = excluded.value;

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
      'Authorization', 'Bearer ' || (select value from private_cron_config where key = 'anon_key'),
      'X-Compliance-Cron-Secret', (select value from private_cron_config where key = 'compliance_cron_secret')
    ),
    body    := '{}'::jsonb
  );
  $job$
);
