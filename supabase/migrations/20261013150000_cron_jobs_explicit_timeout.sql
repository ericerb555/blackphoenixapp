-- Give the three newest cron jobs the same 30-second HTTP timeout the store
-- jobs already use. Applied to production on 2026-10-13.
--
-- WHY
--
-- `autopilot-tick`, `on-call-escalation` and `screening-invitation-expiry` were
-- scheduled without `timeout_milliseconds`, so each inherited pg_net's default
-- of five seconds. `store-cron-tick` and `store-watchdog`, written earlier
-- against the same edge function, set thirty seconds explicitly. Nothing about
-- these three endpoints is slower or faster than those two, so the omission
-- reads as an oversight rather than a decision.
--
-- IT HAD ALREADY BITTEN
--
-- On 2026-10-13 at 14:10 UTC a request failed with
-- "Timeout of 5000 ms reached. Total time: 5001.027000 ms". Only one job is
-- scheduled at that minute, so it was `on-call-escalation`. Measured directly,
-- these endpoints answer in 0.8-1.0 seconds; five seconds is ample right up
-- until an edge function cold start, and then it is not.
--
-- WHY IT MATTERS MORE THAN ONE FAILURE IN FORTY SUGGESTS
--
-- A missed `on-call-escalation` tick is a minute in which an emergency was not
-- escalated, and nothing anywhere reports it. pg_cron records the job as
-- "succeeded" because the SQL ran -- "succeeded" there means the HTTP request
-- was QUEUED, not that anybody answered it. The only trace of the failure is a
-- row in net._http_response with a null status code, which nothing watches.
--
-- HOW
--
-- The replacement is computed from the stored command rather than retyped, so
-- the URLs and the config lookups are preserved exactly and no secret has to
-- travel anywhere to make the change. Each command ends with the close of the
-- net.http_post call, which is where the new argument goes.

do $$
declare
  job record;
  updated_command text;
begin
  for job in
    select jobid, jobname, schedule, command
      from cron.job
     where jobname in ('autopilot-tick', 'on-call-escalation', 'screening-invitation-expiry')
       -- Idempotent: a job that already carries a timeout is left alone, so
       -- re-running this cannot nest the argument twice.
       and command !~ 'timeout_milliseconds'
  loop
    updated_command := regexp_replace(
      job.command,
      '\s*\)\s*;\s*$',
      ',' || chr(10) || '    timeout_milliseconds := 30000' || chr(10) || '  );'
    );

    -- Refuse to write something that did not actually change, which is what a
    -- pattern that stopped matching would quietly produce.
    if updated_command = job.command then
      raise exception 'could not add a timeout to %, its command did not match the expected shape', job.jobname;
    end if;

    perform cron.alter_job(job.jobid, command => updated_command);
    raise notice 'timeout added to %', job.jobname;
  end loop;
end $$;
