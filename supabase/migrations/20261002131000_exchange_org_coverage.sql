-- ============================================================================
-- Phoenix Exchange — what a business covers, and where
--
-- `organizations` has a name, a slug, an email, a phone and a website. It has
-- no location, no service radius and no notion of what the business actually
-- does, which means "show me plumbing jobs within 25 miles of my shop" cannot
-- be answered by the database at all.
--
-- Coverage is two things, both declared by the business: WHICH CATEGORIES and
-- HOW FAR. Matching is the intersection. Everything the Exchange routes, ranks
-- or searches reads from here.
-- ============================================================================


-- ------------------------------------------------------------
-- 1. WHERE A BUSINESS IS, AND HOW FAR IT GOES
-- ------------------------------------------------------------
alter table organizations
  add column if not exists service_lat numeric(9,6),
  add column if not exists service_lng numeric(9,6),
  add column if not exists service_radius_miles integer,

  -- Credentials. The expiry dates are the point: a badge that never lapses is
  -- a claim, not a verification.
  add column if not exists license_number     text,
  add column if not exists license_state      text,
  add column if not exists license_expires_at date,
  add column if not exists insurance_expires_at date,

  add column if not exists verification_state text not null default 'unverified',

  -- 'listed'  compiled from public records, nobody has claimed it
  -- 'claimed' somebody proved control and owns it
  add column if not exists claim_state text not null default 'claimed',

  -- Where the row came from. A compiled listing and a business that signed up
  -- are different things and the profile page shows them differently.
  add column if not exists listing_source text not null default 'signup',

  -- Five included, more sold, ten the ceiling. Held here rather than derived
  -- from the plan so a grant, a founder deal or a correction can move it
  -- without reaching into the billing system.
  add column if not exists category_allowance integer not null default 5;

-- A coordinate pair is meaningless half-supplied, and a bad one silently puts
-- a business in the ocean and drops it out of every radius search.
alter table organizations drop constraint if exists org_service_coords_sane;
alter table organizations add constraint org_service_coords_sane check (
  (service_lat is null and service_lng is null)
  or (
    service_lat is not null and service_lng is not null
    and service_lat between -90 and 90
    and service_lng between -180 and 180
  )
);

alter table organizations drop constraint if exists org_service_radius_sane;
alter table organizations add constraint org_service_radius_sane check (
  service_radius_miles is null or service_radius_miles between 1 and 500
);

alter table organizations drop constraint if exists org_verification_state_known;
alter table organizations add constraint org_verification_state_known check (
  verification_state in ('unverified', 'pending', 'verified', 'rejected')
);

alter table organizations drop constraint if exists org_claim_state_known;
alter table organizations add constraint org_claim_state_known check (
  claim_state in ('listed', 'claimed')
);

alter table organizations drop constraint if exists org_listing_source_known;
alter table organizations add constraint org_listing_source_known check (
  listing_source in ('signup', 'registry', 'invited', 'operator')
);

-- THE CEILING IS TEN, AT ANY PRICE.
--
-- Five are included and five more can be bought. Nobody holds eleven, because
-- the limit exists to protect match quality and an upsell that defeats it is
-- worse than no upsell. Enforced here rather than in a route, so it cannot be
-- bent by whoever is under pressure to close a deal.
alter table organizations drop constraint if exists org_category_allowance_ceiling;
alter table organizations add constraint org_category_allowance_ceiling check (
  category_allowance between 0 and 10
);

create index if not exists organizations_located_idx
  on organizations (service_lat, service_lng) where service_lat is not null;
create index if not exists organizations_claim_state_idx
  on organizations (claim_state, status);


-- ------------------------------------------------------------
-- 2. WHAT A BUSINESS DOES
--
-- Categories only, never service leaves. Holding "Roofing" brings every leaf
-- under it — replacement, repair, gutters, skylights — at no extra cost,
-- which is the distinction that makes an allowance of five generous rather
-- than absurd.
-- ------------------------------------------------------------
create table if not exists organization_category (
  org_id      uuid not null references organizations(id) on delete cascade,
  category_id uuid not null references exchange_category(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (org_id, category_id)
);

create index if not exists organization_category_category_idx
  on organization_category (category_id);

create or replace function exchange_org_category_guard()
returns trigger
language plpgsql
as $$
declare
  org_type_text text;
  allowance     integer;
  held          integer;
  is_leaf       boolean;
begin
  select parent_id is not null into is_leaf
    from exchange_category where id = new.category_id;

  if is_leaf is null then
    raise exception 'unknown category';
  end if;

  if is_leaf then
    raise exception 'a business holds categories, not individual services';
  end if;

  select o.type::text, o.category_allowance
    into org_type_text, allowance
    from organizations o
   where o.id = new.org_id;

  if org_type_text is null then
    raise exception 'unknown organisation';
  end if;

  -- Black Phoenix's own service catalogue is these same rows, and it is not a
  -- purchased allowance. The operator is exempt for that reason, and only the
  -- operator is.
  if org_type_text = 'operator' then
    return new;
  end if;

  -- Two requests arriving together could otherwise both see room for one
  -- more. The lock is per-organisation and lasts the transaction.
  perform pg_advisory_xact_lock(hashtext(new.org_id::text));

  select count(*) into held from organization_category where org_id = new.org_id;

  if held >= coalesce(allowance, 5) then
    raise exception 'category allowance of % reached', coalesce(allowance, 5)
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke execute on function exchange_org_category_guard() from anon, authenticated;

drop trigger if exists organization_category_allowance on organization_category;
create trigger organization_category_allowance
  before insert on organization_category
  for each row execute function exchange_org_category_guard();


-- ------------------------------------------------------------
-- 3. TERRITORY — a named place, never a radius
--
-- A sold territory has to be a fixed geographic unit. With radii, two
-- contractors both believe they bought the same town, and once their money
-- has been taken that argument has no clean answer.
--
-- A business's own `service_radius_miles` is a separate thing and keeps
-- deciding what work it is SHOWN. The territory is what it OWNS.
-- ------------------------------------------------------------
create table if not exists exchange_territory (
  slug        text primary key,
  name        text not null,
  state       text not null,
  -- The definition of the place. Postcodes rather than geometry: they are how
  -- the registries describe a business, they do not need PostGIS, and nobody
  -- argues about where a postcode ends.
  postcodes   text[] not null default '{}',
  center_lat  numeric(9,6),
  center_lng  numeric(9,6),
  status      text not null default 'active' check (status in ('active', 'hidden')),
  created_at  timestamptz not null default now()
);

create table if not exists organization_territory (
  org_id         uuid not null references organizations(id) on delete cascade,
  territory_slug text not null references exchange_territory(slug) on delete cascade,
  created_at     timestamptz not null default now(),
  primary key (org_id, territory_slug)
);

create index if not exists organization_territory_slug_idx
  on organization_territory (territory_slug);


-- ------------------------------------------------------------
-- 4. ROW-LEVEL SECURITY
--
-- Coverage is public: a resident looking at a listing sees what it does and
-- where it works, and those pages are indexed. Writes have no policy, so
-- coverage changes go through the server, where the allowance and the
-- licence-evidence rules are applied.
-- ------------------------------------------------------------
alter table organization_category  enable row level security;
alter table exchange_territory     enable row level security;
alter table organization_territory enable row level security;

drop policy if exists organization_category_read on organization_category;
create policy organization_category_read on organization_category
  for select to anon, authenticated using (true);

drop policy if exists exchange_territory_read on exchange_territory;
create policy exchange_territory_read on exchange_territory
  for select to anon, authenticated using (status = 'active');

drop policy if exists organization_territory_read on organization_territory;
create policy organization_territory_read on organization_territory
  for select to anon, authenticated using (true);
