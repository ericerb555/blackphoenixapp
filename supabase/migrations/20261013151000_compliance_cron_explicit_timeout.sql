-- The last cron job without an explicit HTTP timeout. Applied 2026-10-13.
--
-- `compliance-expiry-reminders` was the one job left inheriting pg_net's
-- five-second default after the other five were set to thirty. Leaving a known
-- defect in one of six siblings is how a thing comes back later as a mystery,
-- so it gets the same treatment.
--
-- Its exposure is actually the worst of the set, and worth stating. The
-- per-minute and quarter-hourly jobs have a next tick to cover for a missed
-- one. This runs once a day at 12:00 UTC, so a single edge function cold start
-- at noon means a day's compliance reminders are never sent -- and pg_cron
-- still records the run as "succeeded", because the SQL ran. The only trace
-- would be a null status code in net._http_response.
--
-- Same mechanism as 20261013150000_cron_jobs_explicit_timeout.sql: the
-- replacement is computed from the stored command so the URL and config
-- lookups are preserved exactly and no secret has to travel to make the change.

do $$
declare
  job record;
  updated_command text;
begin
  for job in
    select jobid, jobname, command
      from cron.job
     where jobname = 'compliance-expiry-reminders'
       and command !~ 'timeout_milliseconds'
  loop
    updated_command := regexp_replace(
      job.command,
      '\s*\)\s*;\s*$',
      ',' || chr(10) || '    timeout_milliseconds := 30000' || chr(10) || '  );'
    );

    if updated_command = job.command then
      raise exception 'could not add a timeout to %, its command did not match the expected shape', job.jobname;
    end if;

    perform cron.alter_job(job.jobid, command => updated_command);
    raise notice 'timeout added to %', job.jobname;
  end loop;
end $$;
