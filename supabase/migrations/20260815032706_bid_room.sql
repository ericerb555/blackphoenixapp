-- ============================================================
-- Black Phoenix Builds — bid room
--
-- The first portal built natively on the platform core. There is nothing to
-- strangle here: bidRoom.tsx was never deployed and the kv store holds zero
-- bid/RFQ/provider rows, so this is greenfield rather than a migration. No
-- dual-write, no reconciliation, nothing to delete later.
--
-- Everything hangs off org_id and uses my_org_ids() from 001_platform_core.sql.
--
-- THE SECURITY PROPERTY THAT MATTERS: competing subcontractors must never see
-- each other's prices. That is enforced here in RLS, not in edge-function
-- TypeScript, so a forgotten check in application code cannot leak a rival's
-- number.
-- ============================================================


create type bid_request_status as enum (
  'draft',      -- being written, not visible to providers
  'open',       -- accepting bids
  'closed',     -- no longer accepting, not yet decided
  'awarded',
  'cancelled'
);

create type bid_status as enum (
  'submitted',
  'withdrawn',
  'declined',   -- provider declined to bid
  'won',
  'lost'
);


-- ------------------------------------------------------------
-- 1. BID REQUESTS — the work being put out to bid.
-- Owned by the org that posted it (normally the operator, but a landlord or
-- customer can post their own work).
-- ------------------------------------------------------------

create table bid_requests (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references organizations(id) on delete cascade,
  title         text not null,
  description   text,
  trade         text,                       -- 'framing', 'electrical', ...
  status        bid_request_status not null default 'draft',
  site_address  text,
  budget_low    numeric(12,2),
  budget_high   numeric(12,2),
  starts_on     date,
  due_at        timestamptz,                -- bids due by
  awarded_bid_id uuid,                      -- FK added after bids exists
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint budget_range_sane
    check (budget_low is null or budget_high is null or budget_high >= budget_low)
);

create index on bid_requests (org_id, status);
create index on bid_requests (status, due_at);


-- ------------------------------------------------------------
-- 2. INVITATIONS — which providers were asked to bid.
-- A provider sees a request only if invited; this table is the gate.
-- ------------------------------------------------------------

create table bid_invitations (
  id              uuid primary key default gen_random_uuid(),
  bid_request_id  uuid not null references bid_requests(id) on delete cascade,
  org_id          uuid not null references organizations(id) on delete cascade,
  invited_by      uuid references auth.users(id),
  viewed_at       timestamptz,
  created_at      timestamptz not null default now(),

  unique (bid_request_id, org_id)
);

create index on bid_invitations (org_id);


-- ------------------------------------------------------------
-- 3. BIDS — one per (request, provider org).
-- ------------------------------------------------------------

create table bids (
  id              uuid primary key default gen_random_uuid(),
  bid_request_id  uuid not null references bid_requests(id) on delete cascade,
  org_id          uuid not null references organizations(id) on delete cascade,
  status          bid_status not null default 'submitted',
  amount          numeric(12,2),
  currency        text not null default 'usd',
  notes           text,
  valid_until     date,
  submitted_by    uuid references auth.users(id),
  submitted_at    timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (bid_request_id, org_id),
  -- A live bid needs a number; a declined one deliberately has none.
  constraint amount_required_unless_declined
    check (status = 'declined' or amount is not null)
);

create index on bids (bid_request_id, status);
create index on bids (org_id);

alter table bid_requests
  add constraint bid_requests_awarded_bid_fk
  foreign key (awarded_bid_id) references bids(id) on delete set null;


-- ------------------------------------------------------------
-- 4. HELPERS
--
-- These MUST be security-definer functions rather than inline subqueries.
-- bid_requests' policy needs to consult bid_invitations and vice versa; written
-- inline that is mutual recursion and Postgres aborts the query with 42P17.
-- This is the same failure that made the first draft of 001_platform_core
-- unusable, so it is designed out here from the start.
-- ------------------------------------------------------------

-- Requests posted by an org I belong to.
create or replace function my_owned_bid_request_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select r.id
  from bid_requests r
  where r.org_id in (
    select m.org_id from organization_members m
    where m.user_id = auth.uid() and m.status = 'active'
  );
$$;

-- Requests one of my orgs has been invited to bid on. Draft requests are
-- excluded: an invitation must not expose work that has not been opened yet.
create or replace function my_invited_bid_request_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select i.bid_request_id
  from bid_invitations i
  join bid_requests r on r.id = i.bid_request_id
  where r.status <> 'draft'
    and i.org_id in (
      select m.org_id from organization_members m
      where m.user_id = auth.uid() and m.status = 'active'
    );
$$;


-- ------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table bid_requests    enable row level security;
alter table bid_invitations enable row level security;
alter table bids            enable row level security;

-- A request is visible to the org that posted it, and to any org invited to it
-- once it leaves draft.
create policy bid_request_read on bid_requests
  for select to authenticated
  using (
    id in (select my_owned_bid_request_ids())
    or id in (select my_invited_bid_request_ids())
  );

-- The poster sees the full invite list, drafts included. An invited provider
-- sees only its OWN invitation — the competitor list is not theirs to read —
-- and only once the request has left draft.
--
-- That draft condition was missing in the first version and a branch test
-- caught it: bid_request_read correctly hid a draft request, but the provider
-- could still read their own invitation row, which carries bid_request_id. The
-- title and budget stayed hidden, yet the existence of an unannounced job and
-- their pre-selection for it leaked. my_invited_bid_request_ids() already
-- excludes drafts, so gating on it closes the hole.
create policy bid_invitation_read on bid_invitations
  for select to authenticated
  using (
    bid_request_id in (select my_owned_bid_request_ids())
    or (
      org_id in (select my_org_ids())
      and bid_request_id in (select my_invited_bid_request_ids())
    )
  );

-- THE IMPORTANT ONE. A provider sees only its own bid. The org that posted the
-- request sees every bid on it. There is deliberately no path for one provider
-- to read another's amount.
create policy bid_read on bids
  for select to authenticated
  using (
    org_id in (select my_org_ids())
    or bid_request_id in (select my_owned_bid_request_ids())
  );

-- Writes go through the server using the service role, which bypasses RLS —
-- the same convention 001_platform_core sets for subscriptions and
-- feature_grants. Awarding a bid, closing a request and submitting on behalf of
-- a provider are all server actions with their own checks, so no client-facing
-- insert/update policy is granted here on purpose.
