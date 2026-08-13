-- ============================================================
-- Black Phoenix Builds — platform core schema (DRAFT, not applied)
--
-- The three things every portal needs before it can do anything:
--   who is this person, what org do they represent, what may they see.
--
-- Nothing here touches kv_store_* or the existing companies table.
-- It is additive: run it alongside what you have, migrate one
-- portal at a time, delete nothing until each portal has moved.
-- ============================================================


-- ------------------------------------------------------------
-- 1. ORGANIZATIONS
-- Every party on the platform is an org: your construction company,
-- each subcontractor firm, each vendor, each advertiser, each
-- customer household or business. One table, distinguished by type.
-- ------------------------------------------------------------

create type org_type as enum (
  'operator',        -- you; the company running the platform
  'subcontractor',
  'vendor',
  'advertiser',
  'customer'
);

create table organizations (
  id            uuid primary key default gen_random_uuid(),
  type          org_type not null,
  name          text not null,
  slug          text unique not null,
  legal_name    text,
  email         text,
  phone         text,
  website       text,
  status        text not null default 'active'
                  check (status in ('active', 'suspended', 'archived')),

  -- link back to the row you already have, so nothing is lost
  legacy_company_id text references companies(id),

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index on organizations (type);
create index on organizations (slug);


-- ------------------------------------------------------------
-- 2. MEMBERSHIP
-- Links a real login to an org, with a role. This is what replaces
-- the auth_profile / staff / owner_provision keys in the kv store.
-- A person can belong to more than one org (a sub who also buys
-- from your store) — hence a join table, not a column on the user.
-- ------------------------------------------------------------

create type member_role as enum ('owner', 'admin', 'member', 'viewer');

create table organization_members (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          member_role not null default 'member',
  status        text not null default 'active'
                  check (status in ('invited', 'active', 'revoked')),
  invited_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),

  unique (org_id, user_id)
);

create index on organization_members (user_id);


-- ------------------------------------------------------------
-- 3. PLANS, SUBSCRIPTIONS, ENTITLEMENTS
-- Portals sell subscriptions; subscriptions grant features.
-- feature_grants covers the manual overrides you're doing today
-- with feature_grant:* keys — comped access, trials, one-offs.
-- ------------------------------------------------------------

create table plans (
  id            text primary key,          -- 'vendor_pro', 'sub_basic'
  name          text not null,
  portal        text not null,             -- 'bid_room' | 'vendor' | 'store' | ...
  applies_to    org_type not null,
  features      text[] not null default '{}',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create table subscriptions (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organizations(id) on delete cascade,
  plan_id           text not null references plans(id),
  status            text not null default 'trialing'
                      check (status in ('trialing','active','past_due','canceled')),
  current_period_end timestamptz,

  -- populated by your payment processor; never store card data here
  external_ref      text,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index on subscriptions (org_id, status);

create table feature_grants (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  feature       text not null,
  granted_by    uuid references auth.users(id),
  reason        text,
  expires_at    timestamptz,
  created_at    timestamptz not null default now(),

  unique (org_id, feature)
);


-- ------------------------------------------------------------
-- 4. HELPERS
-- These two functions are the whole point. Once they exist, every
-- RLS policy in every portal is a one-liner instead of bespoke
-- TypeScript in an edge function.
-- ------------------------------------------------------------

create or replace function my_org_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select org_id from organization_members
  where user_id = auth.uid() and status = 'active';
$$;

create or replace function org_has_feature(p_org uuid, p_feature text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from subscriptions s
    join plans p on p.id = s.plan_id
    where s.org_id = p_org
      and s.status in ('trialing','active')
      and p_feature = any(p.features)
  ) or exists (
    select 1 from feature_grants g
    where g.org_id = p_org
      and g.feature = p_feature
      and (g.expires_at is null or g.expires_at > now())
  );
$$;


-- ------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- Enabled AND policied. Enabling without policies is what the
-- kv tables do today, which means the database protects nothing
-- and every check has to be remembered in application code.
-- ------------------------------------------------------------

alter table organizations        enable row level security;
alter table organization_members enable row level security;
alter table plans                enable row level security;
alter table subscriptions        enable row level security;
alter table feature_grants       enable row level security;

create policy org_read on organizations
  for select to authenticated
  using (id in (select my_org_ids()));

create policy org_update on organizations
  for update to authenticated
  using (id in (
    select org_id from organization_members
    where user_id = auth.uid() and role in ('owner','admin') and status = 'active'
  ));

create policy member_read on organization_members
  for select to authenticated
  using (org_id in (select my_org_ids()));

create policy member_manage on organization_members
  for all to authenticated
  using (org_id in (
    select org_id from organization_members
    where user_id = auth.uid() and role in ('owner','admin') and status = 'active'
  ));

-- plans are the public price list
create policy plans_read on plans
  for select to anon, authenticated
  using (is_active);

create policy sub_read on subscriptions
  for select to authenticated
  using (org_id in (select my_org_ids()));

create policy grant_read on feature_grants
  for select to authenticated
  using (org_id in (select my_org_ids()));

-- Writes to subscriptions and feature_grants come from your server
-- (webhooks, admin actions) using the service role, which bypasses
-- RLS by design. No client-facing insert/update policy on purpose.


-- ============================================================
-- NOT INCLUDED YET, ON PURPOSE
--
--  * vendor API credentials — these need encryption at rest
--    (pgsodium / Supabase Vault), not a plain text column.
--    Separate migration, done deliberately.
--
--  * bank and tax fields currently plain text in companies —
--    same treatment, same reason.
--
--  * portal tables (bids, quotes, products, orders, placements) —
--    these come one portal at a time, each hanging off org_id
--    and using org_has_feature() for access.
-- ============================================================
