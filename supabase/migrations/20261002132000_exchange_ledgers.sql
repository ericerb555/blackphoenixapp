-- ============================================================================
-- Phoenix Exchange — the lead ledger and the demand ledger
--
-- These two tables are the business model, not instrumentation.
--
-- THE LEAD LEDGER answers "what did this business get from us", which is the
-- only sentence that ever sells a subscription. Nobody buys software; they
-- buy *"you received 34 enquiries here last month and won nine of them."*
-- That sentence exists only if the contact happened inside the system, and it
-- has to be counted from the very first free account — six months later is
-- too late, because there is nothing to bill against and nothing to show.
--
-- THE DEMAND LEDGER answers "what did people want that we could not give
-- them", which turns the cold-start problem into the sales pipeline. A gap —
-- *"gutter cleaning, this county: 47 searches, 2 listings"* — is not an
-- embarrassment, it is a ranked list of who to call, and it writes itself
-- every night.
--
-- NEITHER IS READABLE WITH A BROWSER KEY
--
-- There are no policies on these tables at all, deliberately. Reads and
-- writes happen through the server with the service role, which bypasses
-- row-level security. Two reasons:
--
--   * a business must never be able to enumerate who looked at it, and a
--     competitor must never be able to read its lead volume
--   * the demand ledger holds residents' searches and whereabouts. A
--     non-member business may be told HOW MANY people wanted them. It may
--     never be told WHO. That is a privacy line, and it is also the
--     conversion lever — the count is free, the contact is what joining buys
-- ============================================================================


-- ------------------------------------------------------------
-- 1. LEAD EVENTS — one row per contact, whatever form it took
-- ------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'exchange_lead_kind') then
    create type exchange_lead_kind as enum (
      'viewed',        -- the profile was opened
      'revealed',      -- the phone number or email was shown
      'called',        -- the number was tapped
      'website',       -- the outbound link to their own site was followed
      'messaged',      -- a thread was started
      'requested',     -- a quote or booking request reached them
      'quoted',        -- they answered one
      'awarded'        -- they won the work
    );
  end if;
end $$;

create table if not exists exchange_lead_event (
  id          bigserial primary key,

  -- Who received the lead. A compiled listing nobody has claimed accumulates
  -- these too — that is what makes the recruitment call specific rather than
  -- a cold sell.
  org_id      uuid not null references organizations(id) on delete cascade,

  kind        exchange_lead_kind not null,

  category_id uuid references exchange_category(id) on delete set null,

  -- Who did it. Null for an anonymous visitor on a public page. Held so a
  -- lead can be deduplicated and so a business's own numbers can be
  -- reconciled — never to be handed to the business.
  actor_user_id uuid references auth.users(id) on delete set null,

  -- The request this came from, where there was one. Text rather than a
  -- foreign key because work requests live in the key-value store.
  request_ref text,

  -- Which surface produced it: 'search', 'profile', 'map', 'category',
  -- 'alert', 'blog'. Free text on purpose — new surfaces should not need a
  -- migration to be measured.
  surface     text,

  occurred_at timestamptz not null default now(),
  meta        jsonb not null default '{}'::jsonb
);

-- The two questions actually asked of this table: "what did this business get
-- last month" and "what happened on this request".
create index if not exists exchange_lead_event_org_idx
  on exchange_lead_event (org_id, occurred_at desc);
create index if not exists exchange_lead_event_kind_idx
  on exchange_lead_event (org_id, kind, occurred_at desc);
create index if not exists exchange_lead_event_request_idx
  on exchange_lead_event (request_ref) where request_ref is not null;


-- ------------------------------------------------------------
-- 2. DEMAND EVENTS — every search, especially the ones that failed
-- ------------------------------------------------------------
create table if not exists exchange_demand_event (
  id            bigserial primary key,

  -- What they typed, in their words. This is what the alias table and the
  -- resolver get better from.
  phrase        text,

  -- What it resolved to, if anything. Null is the interesting case: either
  -- the taxonomy is missing something or nobody covers it.
  category_id   uuid references exchange_category(id) on delete set null,
  section_slug  text references exchange_section(slug) on delete set null,

  -- Where they were looking, and how far they would go.
  territory_slug text references exchange_territory(slug) on delete set null,
  search_lat    numeric(9,6),
  search_lng    numeric(9,6),
  radius_miles  integer,

  -- How well it went. `results_count = 0` in a territory is the single most
  -- valuable row in this table.
  results_count integer not null default 0,

  -- 'contacted' · 'requested' · 'abandoned' · 'reported_missing'
  outcome       text,

  actor_user_id uuid references auth.users(id) on delete set null,
  occurred_at   timestamptz not null default now(),
  meta          jsonb not null default '{}'::jsonb
);

-- The nightly recruitment worklist is "unmet demand, by category, by place".
create index if not exists exchange_demand_gap_idx
  on exchange_demand_event (territory_slug, category_id, occurred_at desc)
  where results_count = 0;
create index if not exists exchange_demand_occurred_idx
  on exchange_demand_event (occurred_at desc);
create index if not exists exchange_demand_phrase_idx
  on exchange_demand_event (exchange_normalise_phrase(phrase))
  where phrase is not null;


-- ------------------------------------------------------------
-- 3. ROW-LEVEL SECURITY — on, with no policies at all
--
-- This is not an oversight. Enabling RLS and granting nothing means anon and
-- authenticated get nothing: no select, no insert, no update, no delete. The
-- service role bypasses it, which is how the server writes and reads them.
--
-- If a future change wants a browser to read one of these, that is a decision
-- to take deliberately — and the answer is almost certainly an aggregate
-- served by the server, never the rows.
-- ------------------------------------------------------------
alter table exchange_lead_event   enable row level security;
alter table exchange_demand_event enable row level security;

-- Belt as well as braces: RLS protects the rows, this protects against a
-- future policy being added carelessly.
revoke all on exchange_lead_event   from anon, authenticated;
revoke all on exchange_demand_event from anon, authenticated;
revoke all on sequence exchange_lead_event_id_seq   from anon, authenticated;
revoke all on sequence exchange_demand_event_id_seq from anon, authenticated;
