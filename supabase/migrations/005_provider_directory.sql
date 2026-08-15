-- ============================================================
-- Black Phoenix Builds — provider directory
--
-- To invite a subcontractor you first have to be able to SEE one. 001's
-- org_read only returns organizations you are a member of, which is correct
-- for tenancy but leaves an operator unable to list the providers they work
-- with — so the invite UI had nothing to pick from.
--
-- The narrow fix, rather than opening the table:
--
--   * only a platform operator (owner/admin of an org of type 'operator') can
--     read the directory. A subcontractor still cannot enumerate other
--     subcontractors, so this does not become a competitor list.
--   * only provider-shaped org types are listed. `customer` and `landlord`
--     are private parties — often a household — and are deliberately excluded.
--   * archived and suspended orgs are excluded; you cannot invite them anyway.
--
-- This is an additional SELECT policy, so it ORs with org_read: an operator
-- sees their own orgs plus the directory, everyone else is unchanged.
--
-- Requires 001_platform_core.sql.
-- ============================================================

-- Security definer for the usual reason: it reads organization_members and
-- organizations, and inlining it into a policy on organizations would re-enter
-- that same policy.
create or replace function is_platform_operator()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from organization_members m
    join organizations o on o.id = m.org_id
    where m.user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('owner', 'admin')
      and o.type = 'operator'
  );
$$;

create policy org_directory_read on organizations
  for select to authenticated
  using (
    is_platform_operator()
    and type in ('subcontractor', 'vendor', 'advertiser')
    and status = 'active'
  );
