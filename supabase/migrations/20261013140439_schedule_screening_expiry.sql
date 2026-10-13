-- Expire screening invitations, and purge finished orders once a retention
-- window is set.
--
-- APPLIED 2026-10-13. This replaces a file parked since 2026-10-03 that used
-- Vault. The secret lives in private_cron_config instead, matching the store
-- clock that was already proving the pattern in production — 96 of 96
-- successful runs in the preceding day. vault.secrets is empty on this project,
-- so Vault would have been a new mechanism introduced for one job, and the
-- security premise for preferring it was checked and found wrong: anon and
-- authenticated hold no grants on private_cron_config, and row-level security
-- is enabled on it besides (migration 20261003174715).
--
-- The secret is generated here so the value never leaves the database. pg_cron
-- reads it from this table and the edge function reads it from the same row, so
-- nobody carries it between them — not a person, not a transcript.
insert into private_cron_config (key, value)
values ('screening_cron_secret', encode(gen_random_bytes(32), 'base64'))
on conflict (key) do nothing;

select cron.unschedule('screening-invitation-expiry')
where exists (select 1 from cron.job where jobname = 'screening-invitation-expiry');

-- Hourly at seven past. The unit here is days — an invitation that lapsed at
-- 3am does not need noticing at 3:01 — and hourly is well inside the thirty-day
-- refund deadline it also backstops.
--
-- THE PURGE HALF IS STILL OFF. It needs SCREENING_RETENTION_DAYS set as an
-- edge-function secret, at 180 or more. Unset means nothing is ever deleted, so
-- arming this schedule did not start destroying records.
select cron.schedule(
  'screening-invitation-expiry',
  '7 * * * *',
  $$
  select net.http_post(
    url := 'https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-3eae23a6/cron/screening/expire-invitations',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select value from private_cron_config where key = 'anon_key'),
      'X-Screening-Cron-Secret', (select value from private_cron_config where key = 'screening_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Verified after applying: HTTP 200,
--   {"success":true,"scanned":0,"expired":0,"refused":0,"purged":0,
--    "refunded":0,"refundsStuck":0,"staleReported":0,...}
