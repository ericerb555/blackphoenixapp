-- L-2 — a stated retention period, and something that actually enforces it.
--
-- APPLIED 2026-11-19 through the management API, then exercised rather than
-- left to its first scheduled run: all three functions were called by hand and
-- each returned 0 removed, which is correct when the oldest row is eleven days
-- old and every period is thirty days or more. That proves they execute — no
-- search_path problem, no permission problem — instead of merely existing,
-- which is the mistake the thing they replace was already making.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT WAS FOUND
-- ─────────────────────────────────────────────────────────────────────────────
--
-- `prune_ai_call_log(keep_days default 90)` and
-- `prune_app_error_log(keep_days default 30)` already existed and were
-- correctly written: SECURITY DEFINER, search_path pinned, returning a count.
--
-- NOTHING CALLED THEM. No cron job referenced either one, so neither had ever
-- run and both tables held everything since the day they were created. The
-- defaults in those two signatures were the closest thing this project had to
-- a retention policy, and a default nobody invokes is not a policy.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- THE PERIODS, AND WHY THEY DIFFER
-- ─────────────────────────────────────────────────────────────────────────────
--
--   app_error_log       30 days   A browser failure is worth knowing about
--                                 while it is still happening. Past a month it
--                                 is archaeology, and this is the
--                                 highest-volume table — 350 rows in a day.
--
--   ai_call_log         90 days   Spend and usage. A quarter is the window
--                                 somebody actually asks about: "what did the
--                                 pricer cost us last quarter".
--
--   security_audit_log  400 days  A FULL YEAR PLUS MARGIN, and deliberately
--                                 the longest of the three. A tenant-boundary
--                                 probe is worth having months later — that is
--                                 the entire point of keeping it — and an
--                                 annual review needs a complete year behind
--                                 it, not a year that began expiring on day
--                                 366.
--
-- Retention on a security trail is a policy decision rather than a cleanup
-- convenience, which is why the reasoning is written here in prose and not
-- left implicit in a default argument. To change a period, change the interval
-- in the cron command at the bottom of this file.

create or replace function public.prune_security_audit_log(keep_days integer default 400)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  removed integer;
begin
  -- `greatest(keep_days, 1)` guards the one call that would be catastrophic:
  -- prune_security_audit_log(0) must not be able to mean "delete the audit
  -- trail". The two functions this one is modelled on do the same.
  delete from public.security_audit_log
   where at < now() - make_interval(days => greatest(keep_days, 1));
  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- Revoked from PUBLIC as well as from the two roles, because PUBLIC is where
-- `anon` inherits EXECUTE from by default — see
-- 20261119213000_revoke_public_execute_on_identity_functions.sql, where a
-- role-only revoke reported success and changed nothing.
revoke execute on function public.prune_security_audit_log(integer) from public;
revoke execute on function public.prune_security_audit_log(integer) from anon;
revoke execute on function public.prune_security_audit_log(integer) from authenticated;

comment on function public.prune_security_audit_log(integer) is
  'Delete security_audit_log rows older than keep_days (default 400 — a full '
  'year plus margin). Scheduled nightly by log-retention-nightly. Not callable '
  'by anon or authenticated.';

-- One job for all three, rather than three jobs to forget separately.
-- 03:40 — off the hour, and clear of the 07:23 storage backup.
select cron.unschedule('log-retention-nightly')
 where exists (select 1 from cron.job where jobname = 'log-retention-nightly');

select cron.schedule(
  'log-retention-nightly',
  '40 3 * * *',
  $$
    select public.prune_app_error_log(30),
           public.prune_ai_call_log(90),
           public.prune_security_audit_log(400);
  $$
);
