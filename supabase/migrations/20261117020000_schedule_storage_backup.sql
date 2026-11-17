-- A nightly second copy of every Storage object.
--
-- WHY THIS EXISTS
--
-- Supabase's own documentation: "Database backups do not include objects you
-- store via the Storage API." The project is on the Pro plan, so Postgres is
-- backed up daily with seven days retained — and nothing covered the
-- photographs behind every trash estimate, the house captures, the gallery,
-- the reels or the marketing assets. A file deleted by hand had no second copy
-- anywhere.
--
-- WHAT IT COVERS, AND WHAT IT DOES NOT
--
-- Covered: a deleted file, an emptied bucket, an overwrite, a migration that
-- cleans up too enthusiastically. Those are the losses that happen.
--
-- Not covered: losing the Supabase project or the account, because the copy
-- lives in the same project. The run also writes a manifest to the key-value
-- store — every path and size — and THAT is inside the nightly database
-- backup, so a bucket lost entirely leaves a list of what was in it rather
-- than a shrug. An off-site copy of the bytes needs a destination outside
-- Supabase and is a separate decision.
--
-- Scale when this was written: 19 buckets, 165 objects, about 236 MB against a
-- 100 GB allowance. The copy is incremental after the first run — size is the
-- change signal — so a nightly job moves almost nothing on a quiet day.
--
-- The secret is generated here so the value never leaves the database. pg_cron
-- reads it from this table and the edge function reads it from the same row,
-- so nobody carries it between them — not a person, not a transcript. Same
-- pattern as 20261013140439_schedule_screening_expiry.sql, and for the reason
-- written out there.
insert into private_cron_config (key, value)
values ('storage_backup_secret', encode(gen_random_bytes(32), 'base64'))
on conflict (key) do nothing;

select cron.unschedule('storage-backup-nightly')
where exists (select 1 from cron.job where jobname = 'storage-backup-nightly');

-- 07:23 UTC, which is the small hours in New Hampshire. Nightly rather than
-- hourly because the unit of loss here is a file somebody deletes, and a day
-- of exposure on a second copy that did not exist at all yesterday is the
-- wrong thing to optimise first. The odd minute keeps it off the hour with
-- every other scheduled job.
select cron.schedule(
  'storage-backup-nightly',
  '23 7 * * *',
  $$
  select net.http_post(
    url := 'https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-3eae23a6/storage-backup/run',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select value from private_cron_config where key = 'anon_key'),
      'X-Storage-Backup-Secret', (select value from private_cron_config where key = 'storage_backup_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);
