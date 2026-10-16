-- When each town's listings were last compiled. Applied to production on
-- 2026-10-16.
--
-- WHY
--
-- The Exchange refresh has to pick one town per tick — Overpass is a free
-- shared service that has already refused us, and an earlier fetcher that
-- fired twelve queries back to back was blocked outright. "Slowest first" is
-- the rule Eric agreed on 2026-10-13, and nothing recorded when a town was
-- last compiled, so there was no way to order them.
--
-- WHY NOT DERIVE IT FROM THE LISTINGS
--
-- `max(organizations.created_at)` for a territory looks like the same thing
-- and is not. It is the last time a town gained a NEW business, which a
-- refresh that only filled gaps or corrected a phone number does not change.
-- A town refreshed every week would look untouched since the day its last new
-- listing appeared, and the clock would keep choosing it for ever.
--
-- NULL MEANS NEVER, AND IT IS THE INTERESTING CASE
--
-- `pickTownToRefresh` puts a null ahead of every date: a town with no
-- businesses is not a stale town, it is an empty product. Hudson and Windham
-- are both in exactly that state as this is written.
--
-- THE BACKFILL IS DELIBERATELY APPROXIMATE, AND SAYS SO
--
-- The three towns already compiled get the newest `created_at` of the
-- businesses filed against them, which is the best evidence available and is
-- an UNDERSTATEMENT of the truth — the real last run was at least that recent.
-- Understating it means a town might be refreshed sooner than strictly needed,
-- which costs one extra Overpass query. Overstating it would mean a town going
-- unrefreshed with nothing to show why, so the error is pointed in the
-- direction that is merely wasteful rather than silent.
--
-- Towns with no listings are left null on purpose and not backfilled to now().

alter table public.exchange_territory
  add column if not exists last_compiled_at timestamptz;

comment on column public.exchange_territory.last_compiled_at is
  'When the OSM ingest last ran for this town. Null means never, which ranks '
  'ahead of every date when choosing what to refresh - an empty town is worse '
  'than a stale one. Not derivable from listing timestamps: a refresh that '
  'only fills gaps creates no rows.';

update public.exchange_territory t
   set last_compiled_at = newest.at
  from (
    select ot.territory_slug as slug, max(o.created_at) as at
      from public.organization_territory ot
      join public.organizations o on o.id = ot.org_id
     group by ot.territory_slug
  ) as newest
 where newest.slug = t.slug
   and t.last_compiled_at is null;
