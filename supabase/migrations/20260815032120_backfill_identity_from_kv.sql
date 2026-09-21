-- ============================================================
-- Black Phoenix Builds — backfill platform core from the kv store
--
-- Reads (never writes) these kv_store_57095a78 key families:
--   portal_access:<email>:<portalType>   → organizations + organization_members
--   feature_grant:<email>                → feature_grants
--
-- Additive and idempotent: every insert is guarded by ON CONFLICT, so running
-- it twice changes nothing. It deletes no kv rows — the old path keeps working
-- until a portal has actually moved, per the strangler rule.
--
-- Requires 001_platform_core.sql.
-- ============================================================


-- ------------------------------------------------------------
-- 0. THE OPERATOR ORG
-- The platform company itself. It has no portal_access row — nobody grants
-- themselves access — so it is created explicitly and employees hang off it.
-- ------------------------------------------------------------

insert into organizations (type, name, slug, status)
values ('operator', 'Black Phoenix Builds', 'black-phoenix-builds', 'active')
on conflict (slug) do nothing;


-- ------------------------------------------------------------
-- 1. ORGANIZATIONS, one per (email, portalType)
--
-- A person legitimately holds several portal types — in live data
-- ericerb555@yahoo.com is both landlord and subcontractor, and three separate
-- Mark Sutton addresses are each customer + landlord. organizations.type is a
-- single enum value, so each (email, portalType) pair is its own org and the
-- person joins each one through organization_members. That is exactly the case
-- the join table was designed for.
--
-- `employee` is excluded on purpose: an employee is a person inside the
-- operator org, modelled as a membership role, not an organization.
--
-- Slugs derive from the email local part, NOT the applicant name — three
-- different Mark Sutton emails would otherwise collide on a unique slug.
-- ------------------------------------------------------------

with pa as (
  select
    split_part(key, ':', 2) as email,
    (case when jsonb_typeof(value) = 'string'
          then (value #>> '{}')::jsonb else value end) as v
  from kv_store_57095a78
  where key like 'portal_access:%'
)
insert into organizations (type, name, slug, email, status)
select
  (v->>'portalType')::org_type,
  coalesce(nullif(trim(v->>'applicantName'), ''), pa.email),
  regexp_replace(lower(split_part(pa.email, '@', 1)), '[^a-z0-9]+', '-', 'g')
    || '-' || (v->>'portalType'),
  pa.email,
  'active'
from pa
where v->>'portalType' is distinct from 'employee'
on conflict (slug) do nothing;


-- ------------------------------------------------------------
-- 2. MEMBERSHIP
--
-- portal_access is keyed by email; organization_members.user_id is a uuid into
-- auth.users. The join below is that missing resolution step. Anyone without a
-- matching auth user is skipped rather than guessed at — the verification
-- queries at the bottom surface the count so a silent drop is impossible.
--
-- Status mapping: kv 'onboarding' is a person who has been provisioned but has
-- not finished signing up, which is what 'invited' means here.
-- ------------------------------------------------------------

with pa as (
  select
    split_part(key, ':', 2) as email,
    (case when jsonb_typeof(value) = 'string'
          then (value #>> '{}')::jsonb else value end) as v
  from kv_store_57095a78
  where key like 'portal_access:%'
)
insert into organization_members (org_id, user_id, role, status)
select
  o.id,
  u.id,
  'owner'::member_role,          -- the person who requested the portal owns it
  case v->>'status' when 'active' then 'active' else 'invited' end
from pa
join auth.users u on lower(u.email) = lower(pa.email)
join organizations o
  on o.slug = regexp_replace(lower(split_part(pa.email, '@', 1)), '[^a-z0-9]+', '-', 'g')
              || '-' || (v->>'portalType')
where v->>'portalType' is distinct from 'employee'
on conflict (org_id, user_id) do nothing;

-- Employees join the operator org as members, not owners.
with pa as (
  select
    split_part(key, ':', 2) as email,
    (case when jsonb_typeof(value) = 'string'
          then (value #>> '{}')::jsonb else value end) as v
  from kv_store_57095a78
  where key like 'portal_access:%'
)
insert into organization_members (org_id, user_id, role, status)
select
  o.id,
  u.id,
  'member'::member_role,
  case v->>'status' when 'active' then 'active' else 'invited' end
from pa
join auth.users u on lower(u.email) = lower(pa.email)
join organizations o on o.slug = 'black-phoenix-builds'
where v->>'portalType' = 'employee'
on conflict (org_id, user_id) do nothing;


-- ------------------------------------------------------------
-- 3. FEATURE GRANTS
--
-- Each feature_grant row carries its own portalType, so a grant maps to one
-- specific org rather than to everything its owner happens to hold. Note
-- ericerb555@yahoo.com holds landlord AND subcontractor but is granted only on
-- landlord — blanket-granting both would hand out access nobody authorised.
--
-- `level` becomes the feature name verbatim ('full'); inventing a richer
-- feature taxonomy here would be guessing at intent.
--
-- KNOWN GAP — employee grants are intentionally NOT migrated.
-- kv feature_grant is per PERSON; feature_grants is per ORG. For customers,
-- vendors and landlords those are equivalent, because each such person has
-- their own single-member org. Employees share the operator org, so there is
-- no per-person target — and attaching the grant to the operator org would
-- hand the entire company that entitlement. In live data this drops exactly
-- one row (erbdylan22@gmail.com, portalType=employee, level=full).
--
-- This is deliberately left unmapped rather than guessed at. Section 4 reports
-- it so the drop can never be silent. Resolving it properly needs a
-- per-member entitlement concept, which the core schema does not yet have.
-- ------------------------------------------------------------

with fg as (
  select
    split_part(key, ':', 2) as email,
    (case when jsonb_typeof(value) = 'string'
          then (value #>> '{}')::jsonb else value end) as v
  from kv_store_57095a78
  where key like 'feature_grant:%'
)
insert into feature_grants (org_id, feature, granted_by, reason, expires_at)
select
  o.id,
  coalesce(nullif(fg.v->>'level', ''), 'full'),
  granter.id,
  'Migrated from kv feature_grant:' || fg.email,
  nullif(fg.v->>'trialEnd', '')::timestamptz
from fg
join organizations o
  on o.slug = regexp_replace(lower(split_part(fg.email, '@', 1)), '[^a-z0-9]+', '-', 'g')
              || '-' || (fg.v->>'portalType')
left join auth.users granter on lower(granter.email) = lower(fg.v->>'grantedBy')
where coalesce(fg.v->>'status', 'active') = 'active'
on conflict (org_id, feature) do nothing;


-- ------------------------------------------------------------
-- 4. VERIFICATION
--
-- Run these after the backfill. Anything returning rows is a source record
-- that did NOT make it across — the whole point is that a drop is visible
-- rather than inferred from a count that looks about right.
-- ------------------------------------------------------------

-- 4a. portal_access rows whose email has no auth.users match (want: 0 rows).
--     These would silently lose a membership.
--
-- with pa as (
--   select split_part(key,':',2) as email from kv_store_57095a78
--   where key like 'portal_access:%'
-- )
-- select distinct pa.email as portal_access_email_with_no_auth_user
-- from pa where not exists (
--   select 1 from auth.users u where lower(u.email) = lower(pa.email)
-- );

-- 4b. feature_grant rows with no destination org (expected: the employee ones).
--
-- with fg as (
--   select split_part(key,':',2) as email,
--          (case when jsonb_typeof(value)='string'
--                then (value #>> '{}')::jsonb else value end) as v
--   from kv_store_57095a78 where key like 'feature_grant:%'
-- )
-- select fg.email, fg.v->>'portalType' as portal_type, fg.v->>'level' as level
-- from fg
-- where not exists (
--   select 1 from organizations o
--   where o.slug = regexp_replace(lower(split_part(fg.email,'@',1)),'[^a-z0-9]+','-','g')
--                  || '-' || (fg.v->>'portalType')
-- );

-- 4c. Reconciliation. Verified on branch `platform-core`, 2026-08-15:
--
--   portal_access rows          11  ->  10 orgs + 1 operator = 11 organizations
--                                       (customer 4, landlord 4, subcontractor 1,
--                                        vendor 1, operator 1)
--   memberships                 11      (10 owner + 1 employee-as-member)
--                                       1 active, 10 invited — matches kv status
--   feature_grant rows           7  ->   6 feature_grants
--                                       1 unmapped, employee, see KNOWN GAP above
--
-- select
--   (select count(*) from kv_store_57095a78 where key like 'portal_access:%') as kv_portal_access,
--   (select count(*) from organizations)        as orgs,
--   (select count(*) from organization_members) as members,
--   (select count(*) from kv_store_57095a78 where key like 'feature_grant:%') as kv_grants,
--   (select count(*) from feature_grants)       as grants;
