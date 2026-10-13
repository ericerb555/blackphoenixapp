-- Phase 3 of the Exchange plan: following a business, and deals.
-- Applied to production on 2026-10-13.
--
-- FOLLOWING IS NOT SAVING, AND THE TWO ARE SEPARATE TABLES ON PURPOSE
--
-- Saving is a bookmark: a note to yourself, and the business is never told.
-- Following is consent to hear from them. Collapsing the two would mean that
-- keeping a note of a shop quietly signed you up to its offers, which is the
-- kind of thing that makes people stop keeping notes.
--
-- DEALS CARRY NO POLICIES AT ALL, DELIBERATELY
--
-- Row level security is enabled on exchange_deal and nothing is granted, so
-- anon and authenticated get nothing from it directly and only the service
-- role can read or write. That is the same treatment the lead ledger gets, and
-- for the same reason: what a visitor may see is decided by a route that
-- chooses its own columns and its own filters, not by a policy that has to
-- anticipate every future column. A deal is a published thing, but only once a
-- human has approved it, and "approved" is a condition a route states
-- explicitly rather than a table enforcing by omission.
--
-- Verified before applying, in a rolled-back transaction: the window
-- constraint refused a deal ending before it starts, and a second signed-in
-- user could read zero rows from either table.

create table if not exists public.exchange_follow (
  user_id     uuid not null references auth.users(id) on delete cascade,
  org_id      uuid not null references public.organizations(id) on delete cascade,
  followed_at timestamptz not null default now(),
  primary key (user_id, org_id)
);

-- For "how many people follow this business" -- the only aggregate a business
-- is ever shown from this table. How many, never who.
create index if not exists exchange_follow_org_idx
  on public.exchange_follow (org_id);

alter table public.exchange_follow enable row level security;

create policy "read only who you follow"
  on public.exchange_follow for select using (auth.uid() = user_id);
create policy "follow only as yourself"
  on public.exchange_follow for insert with check (auth.uid() = user_id);
create policy "unfollow only your own"
  on public.exchange_follow for delete using (auth.uid() = user_id);

do $$ begin
  create type public.exchange_deal_state as enum
    ('draft','submitted','approved','rejected','withdrawn');
exception when duplicate_object then null; end $$;

create table if not exists public.exchange_deal (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  title         text not null,
  body          text not null,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  state         public.exchange_deal_state not null default 'draft',
  created_by    uuid references auth.users(id) on delete set null,
  submitted_at  timestamptz,
  decided_at    timestamptz,
  decided_by    uuid references auth.users(id) on delete set null,
  decision_note text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- In the database as well as the application, because a date window that
  -- runs backwards is not a difference of opinion.
  constraint exchange_deal_window    check (ends_at > starts_at),
  constraint exchange_deal_title_len check (char_length(title) between 3 and 120),
  constraint exchange_deal_body_len  check (char_length(body)  between 3 and 2000)
);

-- The review queue reads by state; the resident's feed reads live deals for a
-- set of businesses.
create index if not exists exchange_deal_state_idx on public.exchange_deal (state, submitted_at);
create index if not exists exchange_deal_live_idx  on public.exchange_deal (org_id, state, starts_at, ends_at);

alter table public.exchange_deal enable row level security;

comment on table public.exchange_follow is
  'Who a resident chose to hear from. Private to them; a business may be told how many follow it, never who.';
comment on table public.exchange_deal is
  'A business offer. Visible to residents only once a human has approved it; no RLS policies, reached only with the service role.';
