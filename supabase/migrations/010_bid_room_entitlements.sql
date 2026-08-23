-- Bid room subscription gate.
--
-- WHAT THIS ENFORCES
--
-- Posting work and bidding on work require a paid subscription. Reading does
-- not. A subscriber whose plan lapses keeps seeing the jobs going past them and
-- the quotes they have already placed; what they lose is the ability to act
-- until they resubscribe. That is Eric's rule, and it is why every SELECT
-- policy below is left exactly as it was — only the two INSERT paths change.
--
-- WHY A MIRRORED TABLE RATHER THAN A LOOKUP
--
-- Subscriptions live in the key-value store, and row-level security cannot read
-- it. A gate that exists only in the edge function is advisory: anything
-- reaching Postgres another way is not covered. So the *answer* is mirrored
-- here — resolved features per organisation — and the database enforces it
-- itself. The edge function refreshes this table when a subscription changes.
--
-- WHY FEATURES RATHER THAN PLAN NAMES
--
-- So pricing can change without touching access. A stock tier, an add-on, or a
-- one-off plan built for a single customer all grant the same named feature,
-- and the policies below never learn what a plan is called.

-- ── The mirror ──────────────────────────────────────────────────────────────
create table if not exists public.org_entitlements (
  org_id     uuid        not null references public.organizations(id) on delete cascade,
  feature    text        not null,
  -- Which plan or add-on granted it, for support questions later.
  source     text,
  granted_at timestamptz not null default now(),
  -- Null means it does not lapse. Setting this in the past is how a lapse is
  -- expressed, and it is deliberately not a delete: the history of what someone
  -- used to hold is worth keeping.
  expires_at timestamptz,
  primary key (org_id, feature)
);

comment on table public.org_entitlements is
  'Resolved subscription features per organisation, mirrored from the key-value store so RLS can enforce them.';

create index if not exists org_entitlements_feature_idx
  on public.org_entitlements (feature)
  where expires_at is null;

-- ── The question every policy asks ──────────────────────────────────────────
create or replace function public.org_has_feature(p_org uuid, p_feature text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.org_entitlements e
    where e.org_id  = p_org
      and e.feature = p_feature
      and (e.expires_at is null or e.expires_at > now())
  );
$$;

comment on function public.org_has_feature(uuid, text) is
  'True when the organisation currently holds the named feature. Expiry in the past reads as false without deleting the row.';

-- ── Who may read the mirror ─────────────────────────────────────────────────
-- A member may see what their own organisation is entitled to, which is what
-- lets a portal say "resubscribe to bid" rather than failing silently. Nobody
-- may write it from the client; the edge function holds the service role.
alter table public.org_entitlements enable row level security;

drop policy if exists org_entitlement_read on public.org_entitlements;
create policy org_entitlement_read
  on public.org_entitlements
  for select
  to authenticated
  using (org_id in (select my_org_ids()));

-- ── The gate ────────────────────────────────────────────────────────────────
-- Both policies keep every condition they already had and add the subscription
-- requirement. Posting still requires org admin; bidding still requires
-- membership and an open request addressed to you.
drop policy if exists bid_request_insert on public.bid_requests;
create policy bid_request_insert
  on public.bid_requests
  for insert
  to authenticated
  with check (
    org_id in (select my_admin_org_ids())
    and public.org_has_feature(org_id, 'bid_room.post')
  );

drop policy if exists bid_insert on public.bids;
create policy bid_insert
  on public.bids
  for insert
  to authenticated
  with check (
    org_id in (select my_org_ids())
    and bid_request_id in (select my_open_bid_request_ids())
    and public.org_has_feature(org_id, 'bid_room.quote')
  );

-- ── The operator is not a paying subscriber of its own marketplace ──────────
-- Black Phoenix runs the bid room; it does not buy access to it. Granting the
-- operator organisations directly keeps that out of the subscription logic,
-- where it would otherwise be a special case forever.
insert into public.org_entitlements (org_id, feature, source)
select o.id, f.feature, 'operator'
from public.organizations o
cross join (values ('bid_room.post'), ('bid_room.quote')) as f(feature)
where o.type = 'operator'
on conflict (org_id, feature) do nothing;
