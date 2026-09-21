-- ============================================================
-- Black Phoenix Builds — backfill organizations.phone
--
-- 002 populated organizations from `portal_access`, which carries an email but
-- no phone, so organizations.phone was left null and SMS had nothing to send to.
--
-- The numbers do exist: `owner_provision:` records hold a phone, either at the
-- top level or inside `profile`. This joins them onto organizations by email.
--
-- Additive and idempotent — it only fills rows where phone is currently null,
-- so a number later corrected in the app is never overwritten by stale kv data.
--
-- Requires 002_backfill_identity_from_kv.sql.
-- ============================================================

with op as (
  select
    lower(trim(coalesce(v->>'email', v->'profile'->>'email'))) as email,
    nullif(trim(coalesce(v->>'phone', v->'profile'->>'phone')), '') as phone
  from (
    select (case when jsonb_typeof(value) = 'string'
                 then (value #>> '{}')::jsonb else value end) as v
    from kv_store_57095a78
    where key like 'owner_provision:%'
  ) raw
),
-- One person can hold several owner_provision records (one per invite). They
-- carry the same number, but pick deterministically rather than relying on it.
best as (
  select email, min(phone) as phone
  from op
  where email is not null and phone is not null
  group by email
)
update organizations o
set phone = best.phone,
    updated_at = now()
from best
where lower(o.email) = best.email
  and (o.phone is null or o.phone = '');
