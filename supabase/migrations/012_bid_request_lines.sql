-- ============================================================================
-- 012  The scope goes out to bid, line by line
--
-- Until now a bid request carried a title and a paragraph somebody retyped out
-- of the design centre. A subcontractor pricing a paragraph prices the
-- vagueness too, and the number he picks for what he cannot determine is always
-- larger than the truth. What came back was one lump sum that could never be
-- attributed to the work it paid for, so the scope stayed provisional even
-- after the person who would do the work had priced it.
--
-- This adds the two halves that were missing:
--
--   bid_request_lines  — the ask.    What we want done. Carries NO price.
--   bid_line_prices    — the answer. What he charges for each of those lines.
--
-- They are separate tables rather than jsonb for the reason 011 already stated:
-- these rows carry their own access rule, and jsonb cannot be policied. The
-- sealing rule on bids is the single most important rule in the bid room, and
-- it has to hold for the per-line breakdown exactly as it holds for the total.
--
-- NOTE ON 010. `010_bid_room_entitlements.sql` remains deliberately unapplied.
-- Nothing here depends on it and this migration is not a reason to apply it.
--
-- Requires 003, 004, 011.
-- ============================================================================


-- ------------------------------------------------------------
-- 1. WHERE THE REQUEST CAME FROM
--
-- The design project that produced the package, so a returned price can find
-- its way back to the scope line it belongs to. Text rather than uuid because
-- design projects live in the kv store and their ids are not uuids.
-- ------------------------------------------------------------

alter table bid_requests
  add column if not exists design_project_id text;

create index if not exists bid_requests_design_project_idx
  on bid_requests (design_project_id) where design_project_id is not null;


-- ------------------------------------------------------------
-- 2. THE ASK
--
-- There is deliberately no amount, cost or budget column on this table. Our
-- labour rate, our material cost and our margin are not his business, and a
-- budget shown to a bidder is a floor he bids just under. Making the column
-- absent means the leak cannot happen through carelessness later.
--
-- qty is constrained positive in the database as well as in the application,
-- because "some" is not a quantity and a line he has to guess at is a line he
-- guesses high on.
-- ------------------------------------------------------------

create table if not exists bid_request_lines (
  id              uuid primary key default gen_random_uuid(),
  bid_request_id  uuid not null references bid_requests(id) on delete cascade,

  -- Our scope line id, carried so what returns can be put back exactly.
  source_line_id  text not null,

  phase           text not null,
  description     text not null,
  qty             numeric(12,3) not null,
  unit            text not null,

  -- Said to him honestly. A quantity taken off photographs and one confirmed on
  -- site are worth different things to a bidder, and hiding the difference is
  -- how an indicative figure becomes a fixed price nobody meant to give.
  confidence      text not null default 'provisional',

  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),

  constraint bid_request_line_qty_positive check (qty > 0),
  constraint bid_request_line_unit_present check (length(btrim(unit)) > 0),
  constraint bid_request_line_confidence_known
    check (confidence in ('provisional', 'confirmed')),

  -- One row per scope line per request. A package sent twice updates rather
  -- than duplicating, which is what stops a quantity being counted twice.
  unique (bid_request_id, source_line_id)
);

create index if not exists bid_request_lines_request_idx
  on bid_request_lines (bid_request_id, sort_order);


-- ------------------------------------------------------------
-- 3. THE ANSWER
--
-- One price per line per bid. Cascades from the bid so a withdrawn bid takes
-- its breakdown with it, and from the line so a line removed from the package
-- cannot leave a price attached to nothing.
-- ------------------------------------------------------------

create table if not exists bid_line_prices (
  id                   uuid primary key default gen_random_uuid(),
  bid_id               uuid not null references bids(id) on delete cascade,
  bid_request_line_id  uuid not null references bid_request_lines(id) on delete cascade,
  amount               numeric(12,2) not null,
  note                 text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint bid_line_price_non_negative check (amount >= 0),
  unique (bid_id, bid_request_line_id)
);

create index if not exists bid_line_prices_bid_idx
  on bid_line_prices (bid_id);
create index if not exists bid_line_prices_line_idx
  on bid_line_prices (bid_request_line_id);


-- ------------------------------------------------------------
-- 4. HELPERS
--
-- Security definer, for the reason 003 sets out: a policy on bid_line_prices
-- that consulted `bids` inline would drag that table's policy into the check
-- and Postgres would abort on mutual recursion (42P17). The sealing rule is
-- too important to express in a form that might fail open.
-- ------------------------------------------------------------

-- Bids I am allowed to see at all: my own org's, plus every bid on a request my
-- org posted. This is `bid_read` from 003, expressed once so the breakdown
-- cannot drift away from the total's rule.
create or replace function my_visible_bid_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select b.id
  from bids b
  where b.org_id in (
    select m.org_id from organization_members m
    where m.user_id = auth.uid() and m.status = 'active'
  )
  or b.bid_request_id in (select my_owned_bid_request_ids());
$$;

-- Bids I may still price: mine, on a request that is open and undue. Mirrors
-- bid_insert / bid_update from 004 — a provider must not be able to revise a
-- breakdown after the deadline that his competitors were held to.
create or replace function my_editable_bid_ids()
returns setof uuid
language sql stable security definer set search_path = public
as $$
  select b.id
  from bids b
  where b.org_id in (
    select m.org_id from organization_members m
    where m.user_id = auth.uid() and m.status = 'active'
  )
  and b.bid_request_id in (select my_open_bid_request_ids());
$$;


-- ------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table bid_request_lines enable row level security;
alter table bid_line_prices   enable row level security;

-- The lines are readable by exactly whoever can read the request they belong
-- to: the org that posted it, and any org invited once it leaves draft. A draft
-- package must not leak through its own contents.
drop policy if exists bid_request_line_read on bid_request_lines;
create policy bid_request_line_read on bid_request_lines
  for select to authenticated
  using (
    bid_request_id in (select my_owned_bid_request_ids())
    or bid_request_id in (select my_invited_bid_request_ids())
  );

-- Only an owner/admin of the posting org may write the scope. Deliberately
-- my_admin_org_ids() by way of my_owned_bid_request_ids() — putting work out to
-- bid is not something an ordinary member or a viewer does.
drop policy if exists bid_request_line_insert on bid_request_lines;
create policy bid_request_line_insert on bid_request_lines
  for insert to authenticated
  with check (bid_request_id in (select my_owned_bid_request_ids()));

drop policy if exists bid_request_line_update on bid_request_lines;
create policy bid_request_line_update on bid_request_lines
  for update to authenticated
  using (bid_request_id in (select my_owned_bid_request_ids()))
  with check (bid_request_id in (select my_owned_bid_request_ids()));

drop policy if exists bid_request_line_delete on bid_request_lines;
create policy bid_request_line_delete on bid_request_lines
  for delete to authenticated
  using (bid_request_id in (select my_owned_bid_request_ids()));


-- THE IMPORTANT ONE. A provider sees only its own breakdown. The org that
-- posted the request sees every breakdown on it. There is deliberately no path
-- for one provider to read another's per-line pricing — which would be worse
-- than leaking the total, because it exposes how he builds a price.
drop policy if exists bid_line_price_read on bid_line_prices;
create policy bid_line_price_read on bid_line_prices
  for select to authenticated
  using (bid_id in (select my_visible_bid_ids()));

-- A provider prices his own bid, on an open request, before the deadline.
drop policy if exists bid_line_price_insert on bid_line_prices;
create policy bid_line_price_insert on bid_line_prices
  for insert to authenticated
  with check (
    bid_id in (select my_editable_bid_ids())
    -- And only against a line that is actually on the request he is bidding on.
    -- Without this a provider could attach a price to a line belonging to
    -- somebody else's job.
    and exists (
      select 1
      from bid_request_lines l
      join bids b on b.id = bid_line_prices.bid_id
      where l.id = bid_line_prices.bid_request_line_id
        and l.bid_request_id = b.bid_request_id
    )
  );

drop policy if exists bid_line_price_update on bid_line_prices;
create policy bid_line_price_update on bid_line_prices
  for update to authenticated
  using (bid_id in (select my_editable_bid_ids()))
  with check (bid_id in (select my_editable_bid_ids()));

drop policy if exists bid_line_price_delete on bid_line_prices;
create policy bid_line_price_delete on bid_line_prices
  for delete to authenticated
  using (bid_id in (select my_editable_bid_ids()));


-- ------------------------------------------------------------
-- 6. THE TOTAL IS COMPUTED, NEVER ACCEPTED
--
-- Once a bid has a breakdown, bids.amount is the sum of that breakdown and
-- nothing else. A provider cannot submit lines that add to one figure and a
-- headline total that says another — not by mistake and not on purpose.
--
-- In the database rather than the application because that is the only place
-- it cannot be bypassed: the client writes through supabase-js directly, and an
-- edge function on the service role would bypass RLS but not this.
-- ------------------------------------------------------------

create or replace function sync_bid_amount_from_lines()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  target uuid;
  total  numeric(12,2);
begin
  target := coalesce(new.bid_id, old.bid_id);

  select sum(amount) into total
  from bid_line_prices
  where bid_id = target;

  -- Null means the last line price was just removed. The bid reverts to
  -- whatever headline figure it carries rather than being zeroed, because a
  -- bid of nothing and a bid with no breakdown are different claims.
  if total is not null then
    update bids set amount = total, updated_at = now()
    where id = target and amount is distinct from total;
  end if;

  return null;
end;
$$;

drop trigger if exists bid_line_prices_sync on bid_line_prices;
create trigger bid_line_prices_sync
  after insert or update or delete on bid_line_prices
  for each row execute function sync_bid_amount_from_lines();
