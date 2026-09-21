-- ============================================================================
-- 011  Phoenix Exchange — marketplace mechanics
--
-- Adds the four things the Exchange needs that 003/004 did not model:
--
--   1. emergency work        — a lane that jumps the queue
--   2. where the job is      — so a 50-mile radius means something
--   3. first refusal         — Black Phoenix's exclusive window before a job
--                              reaches the wider market
--   4. photos and video      — a provider cannot price framing from a sentence
--
-- NOTE ON 010. `010_bid_room_entitlements.sql` exists but is deliberately NOT
-- applied — it gates posting and quoting on a subscription, which is a separate
-- decision that has not been made yet. Nothing here depends on it, and this
-- migration must not be taken as a reason to apply it.
-- ============================================================================


-- ------------------------------------------------------------
-- 1. NEW COLUMNS ON bid_requests
-- ------------------------------------------------------------

alter table bid_requests
  add column if not exists is_emergency boolean not null default false,

  -- Plain lat/lng rather than PostGIS. The only question being asked is
  -- "within N miles of here", which is a haversine over a handful of rows;
  -- adding a spatial extension to answer it would be cost without benefit.
  add column if not exists latitude  numeric(9,6),
  add column if not exists longitude numeric(9,6),

  -- While this is in the future the request belongs to Black Phoenix alone.
  -- Null means no exclusivity was ever claimed — which is different from an
  -- exclusivity that has expired, and the UI says so.
  add column if not exists first_refusal_until timestamptz,

  -- Who holds that first refusal. Null when the window is open to everyone.
  add column if not exists first_refusal_org_id uuid references organizations(id) on delete set null;

-- A coordinate pair is meaningless half-supplied, and a bad one would silently
-- place a job in the ocean and drop it out of every radius search.
alter table bid_requests
  drop constraint if exists bid_request_coords_sane;
alter table bid_requests
  add constraint bid_request_coords_sane check (
    (latitude is null and longitude is null)
    or (
      latitude is not null and longitude is not null
      and latitude  between -90  and 90
      and longitude between -180 and 180
    )
  );

-- Emergencies are read by urgency, and the radius search filters on
-- coordinates being present at all.
create index if not exists bid_requests_emergency_idx
  on bid_requests (is_emergency, status, due_at);
create index if not exists bid_requests_located_idx
  on bid_requests (latitude, longitude) where latitude is not null;


-- ------------------------------------------------------------
-- 2. MEDIA
--
-- A separate table rather than a jsonb column, because these rows carry their
-- own access rule and jsonb cannot be policied.
-- ------------------------------------------------------------

create table if not exists bid_request_media (
  id              uuid primary key default gen_random_uuid(),
  bid_request_id  uuid not null references bid_requests(id) on delete cascade,
  kind            text not null check (kind in ('photo', 'video')),
  url             text not null,
  caption         text,
  -- Ordering is the poster's, not upload order: the establishing shot first.
  sort_order      integer not null default 0,
  uploaded_by     uuid references auth.users(id),
  created_at      timestamptz not null default now()
);

create index if not exists bid_request_media_request_idx
  on bid_request_media (bid_request_id, sort_order);

alter table bid_request_media enable row level security;

-- Media inherits the visibility of the request it belongs to, by reusing the
-- same two helpers bid_request_read uses. Writing the rule again in different
-- words is how the copy drifts and starts leaking a draft job's photographs.
create policy bid_request_media_read on bid_request_media
  for select to authenticated
  using (
    bid_request_id in (select my_owned_bid_request_ids())
    or bid_request_id in (select my_invited_bid_request_ids())
  );

-- Only the org that posted the request may attach media to it. An invited
-- provider can read the photographs but cannot add to them.
create policy bid_request_media_write on bid_request_media
  for insert to authenticated
  with check (bid_request_id in (select my_owned_bid_request_ids()));

create policy bid_request_media_delete on bid_request_media
  for delete to authenticated
  using (bid_request_id in (select my_owned_bid_request_ids()));


-- ------------------------------------------------------------
-- 3. DISTANCE
--
-- Miles between a request and a point, or null when the request has no
-- coordinates. Kept in SQL so the radius means the same thing everywhere
-- rather than being re-derived by each caller.
-- ------------------------------------------------------------

create or replace function bid_request_distance_miles(
  request_lat numeric, request_lng numeric,
  from_lat numeric, from_lng numeric
)
returns numeric
language sql immutable
as $$
  select case
    when request_lat is null or request_lng is null
      or from_lat is null or from_lng is null then null
    else round(
      (3958.7613 * acos(
        least(1, greatest(-1,
          cos(radians(from_lat)) * cos(radians(request_lat))
            * cos(radians(request_lng) - radians(from_lng))
          + sin(radians(from_lat)) * sin(radians(request_lat))
        ))
      ))::numeric, 1)
  end;
$$;
