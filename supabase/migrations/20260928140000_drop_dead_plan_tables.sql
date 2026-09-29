-- Drop the dead Postgres `plans` and `subscriptions` tables.
--
-- APPLIED BY HAND ON 2026-09-29, on Eric's explicit go-ahead. Kept here as the
-- record of what was done and so a fresh environment reaches the same state.
-- It is idempotent: `to_regclass` makes every branch a no-op once the tables
-- are gone, so re-running it is safe.
--
-- WHY THEY WERE DEAD
--
-- Nothing in the repository referenced either table — no `.from('plans')`, no
-- `.from('subscriptions')` — and no migration here created them, so they were
-- made in the dashboard and their contents were described nowhere in version
-- control. Both held zero rows, checked against the database immediately
-- before the drop rather than inferred from reading code.
--
-- Everything the platform calls a plan or a subscription lives in the KV
-- store: `plan_tier:*` for the catalogue, `plan_addon:*` for the extras,
-- `feature_grant:*` for who holds what, and `cohort_*` for the cohort spine.
--
-- What they looked like, for the record:
--   plans         (id text, name text, portal text, applies_to enum,
--                  features array, is_active boolean, created_at timestamptz)
--   subscriptions (id uuid, org_id uuid, plan_id text, status text,
--                  current_period_end timestamptz, external_ref text,
--                  created_at timestamptz, updated_at timestamptz)
--
-- ORDER MATTERS, AND NO CASCADE
--
-- `subscriptions.plan_id` carries a foreign key into `plans`, so dropping
-- `plans` first fails — which it did, on the first attempt. Dropping the
-- referencing table first means CASCADE is never needed, and that is the
-- point: without CASCADE, anything ELSE that turned out to depend on either
-- table stops this dead instead of being quietly destroyed along with it.
--
-- The row guard below is a safety net, not a substitute for looking. A drop
-- that turns out to have been wrong is not recoverable by re-running anything.

do $$
declare
  n bigint;
begin
  -- Refuse before touching anything if either table has gained rows.
  if to_regclass('public.plans') is not null then
    execute 'select count(*) from public.plans' into n;
    if n > 0 then
      raise exception
        'public.plans holds % row(s); refusing to drop. Establish what they are first.', n;
    end if;
  end if;

  if to_regclass('public.subscriptions') is not null then
    execute 'select count(*) from public.subscriptions' into n;
    if n > 0 then
      raise exception
        'public.subscriptions holds % row(s); refusing to drop. Establish what they are first.', n;
    end if;
  end if;

  -- Referencing table first, so no CASCADE is required.
  if to_regclass('public.subscriptions') is not null then
    drop table public.subscriptions;
    raise notice 'Dropped empty table public.subscriptions.';
  end if;

  if to_regclass('public.plans') is not null then
    drop table public.plans;
    raise notice 'Dropped empty table public.plans.';
  end if;
end $$;
