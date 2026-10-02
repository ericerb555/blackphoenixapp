-- ============================================================================
-- Phoenix Exchange — the category taxonomy
--
-- The Exchange carries every kind of local business, not construction trades:
-- lawn care, lawyers, hairstylists, restaurants, bands. So what a business
-- does cannot be an enum of trades, and it cannot be free text either — free
-- text is what `bid_requests.trade` already is, and nothing can match on it.
--
-- THREE LEVELS, AND THE LEAF IS WHAT MATTERS
--
--   SECTION    Home & Property · Services · Food · Entertainment
--   CATEGORY   Roofing · Plumbing · Restaurants · Live music
--   SERVICE    roof replacement · roof repair · gutters · skylights
--
-- A business lists itself at CATEGORY level. A request matches at SERVICE
-- level. That gap is what stops a roofer being sent gutter cleaning they do
-- not do, and it is why five categories is a generous allowance while five
-- services would be absurd.
--
-- A TABLE, NEVER AN ENUM
--
-- Adding an industry has to be a row. An enum would make every new kind of
-- business a migration, which guarantees the taxonomy stops growing the first
-- time somebody is busy.
--
-- Sections are a table for the same reason, even though there are only four
-- and they were named by hand. A fifth is a product decision, not a release.
-- ============================================================================


-- ------------------------------------------------------------
-- 1. ENGAGEMENT MODES
--
-- What a customer can actually DO with a business in this category. A roofing
-- job takes bids; a haircut does not; a restaurant has a menu; a venue has
-- dates. Building one interaction for all of them would serve none of them.
--
-- This one IS an enum, deliberately and in contrast to the categories: it is
-- a closed set of interaction types the software knows how to render. A new
-- mode is new screens, so it SHOULD be a migration.
-- ------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'exchange_engagement_mode') then
    create type exchange_engagement_mode as enum (
      'quote',   -- post a job, receive bids, award
      'book',    -- pick a time
      'order',   -- choose from a menu or product list
      'event',   -- dated things people attend
      'list'     -- presence only; found and contacted, not transacted here
    );
  end if;
end $$;


-- ------------------------------------------------------------
-- 2. SECTIONS — the four doors on the main page
-- ------------------------------------------------------------
create table if not exists exchange_section (
  slug        text primary key,
  name        text not null,
  tagline     text,
  sort_order  integer not null default 0,
  status      text not null default 'active' check (status in ('active', 'hidden')),
  created_at  timestamptz not null default now()
);


-- ------------------------------------------------------------
-- 3. CATEGORIES AND SERVICES
--
-- One table, self-referencing. `parent_id is null` means a category; a row
-- with a parent is a service leaf under it. Two levels rather than arbitrary
-- depth, because the allowance, the matching and the search results all mean
-- different things at each level and a third level would make "what does a
-- business hold" ambiguous.
-- ------------------------------------------------------------
create table if not exists exchange_category (
  id            uuid primary key default gen_random_uuid(),
  section_slug  text not null references exchange_section(slug) on delete restrict,
  parent_id     uuid references exchange_category(id) on delete cascade,

  slug          text not null unique,
  name          text not null,

  -- A category can hold more than one: a caterer is `order` for a tray of
  -- sandwiches and `quote` for a wedding. Hence an array, not a value.
  engagement_modes exchange_engagement_mode[] not null default '{}',

  -- Does Black Phoenix's first refusal apply to work in this category. A
  -- hairstylist's booking is not work Black Phoenix would ever take.
  is_construction  boolean not null default false,

  -- Nobody drives thirty miles for a sandwich and nobody limits a specialist
  -- solicitor to three. The default radius belongs to the category; the
  -- customer may widen or narrow it.
  default_radius_miles integer check (default_radius_miles is null or default_radius_miles between 1 and 500),

  -- The per-category half of the search criteria sheet: cuisine and party
  -- size for food, property type and dimensions for a renovation. Shaped
  -- rather than schema'd, because every industry wants different questions
  -- and a column per question is not a taxonomy, it is a thousand migrations.
  criteria      jsonb not null default '[]'::jsonb,

  sort_order    integer not null default 0,
  status        text not null default 'active' check (status in ('active', 'hidden')),

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- A service may not parent another service. Enforced with a trigger because a
-- check constraint cannot look at another row.
create or replace function exchange_category_depth_guard()
returns trigger
language plpgsql
as $$
declare
  parent_parent uuid;
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'a category cannot be its own parent';
  end if;

  select parent_id into parent_parent from exchange_category where id = new.parent_id;
  if parent_parent is not null then
    raise exception 'the taxonomy is two levels: a service may not have children';
  end if;

  return new;
end;
$$;

-- A trigger function has no business being reachable at /rest/v1/rpc/.
revoke execute on function exchange_category_depth_guard() from anon, authenticated;

drop trigger if exists exchange_category_depth on exchange_category;
create trigger exchange_category_depth
  before insert or update of parent_id on exchange_category
  for each row execute function exchange_category_depth_guard();

create index if not exists exchange_category_section_idx on exchange_category (section_slug, sort_order);
create index if not exists exchange_category_parent_idx  on exchange_category (parent_id);
create index if not exists exchange_category_modes_idx   on exchange_category using gin (engagement_modes);


-- ------------------------------------------------------------
-- 4. ALIASES — how real language reaches the taxonomy
--
-- Customers type "my sink is leaking", "someone to redo my kitchen", "guy for
-- gutters". They do not type "Plumbing › fixture repair".
--
-- Aliases are the cheap first layer: a lookup table that handles most traffic
-- without a model call. What the aliases miss goes to the AI resolver, and
-- what the resolver works out gets written back here as a learned alias, so
-- the table gets better and the model gets called less.
-- ------------------------------------------------------------
create table if not exists exchange_category_alias (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references exchange_category(id) on delete cascade,

  -- Stored as given; matched case- and space-insensitively through the
  -- normalised index below.
  phrase       text not null,

  -- 'seed'    written by hand or by the seed migration
  -- 'learned' written back after the resolver worked it out
  source       text not null default 'seed' check (source in ('seed', 'learned')),

  -- Ties are broken by weight, so a learned alias cannot quietly outrank a
  -- deliberate one.
  weight       integer not null default 100,

  created_at   timestamptz not null default now()
);

-- The normalised form is what lookups use: lower-cased, collapsed whitespace.
create or replace function exchange_normalise_phrase(input text)
returns text
language sql
immutable
as $$
  select nullif(btrim(regexp_replace(lower(coalesce(input, '')), '\s+', ' ', 'g')), '');
$$;

-- One phrase resolves to one category. A phrase that genuinely means two
-- things is a phrase that needs to be more specific, not a row that returns
-- both and makes the search feel random.
create unique index if not exists exchange_alias_phrase_key
  on exchange_category_alias (exchange_normalise_phrase(phrase));

create index if not exists exchange_alias_category_idx
  on exchange_category_alias (category_id);


-- ------------------------------------------------------------
-- 5. ROW-LEVEL SECURITY
--
-- The taxonomy is the public category tree. A resident browsing before they
-- have an account must be able to read it, and search engines must be able to
-- index the pages built from it — that is the whole free-traffic plan.
--
-- Writes have no policy at all, which means only the service role can change
-- the taxonomy. A business cannot invent a category to rank in.
-- ------------------------------------------------------------
alter table exchange_section        enable row level security;
alter table exchange_category       enable row level security;
alter table exchange_category_alias enable row level security;

drop policy if exists exchange_section_read on exchange_section;
create policy exchange_section_read on exchange_section
  for select to anon, authenticated
  using (status = 'active');

drop policy if exists exchange_category_read on exchange_category;
create policy exchange_category_read on exchange_category
  for select to anon, authenticated
  using (status = 'active');

-- Aliases are readable so the browser can resolve a phrase without a round
-- trip. They carry no private information: they are a dictionary.
drop policy if exists exchange_alias_read on exchange_category_alias;
create policy exchange_alias_read on exchange_category_alias
  for select to anon, authenticated
  using (true);
