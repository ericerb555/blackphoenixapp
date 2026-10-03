-- ============================================================================
-- Black Phoenix's own service catalogue, and its territory
--
-- "The only time the customer will be sent into my app is if they are looking
-- to get a quote for work that I have on my list that we do." That list has to
-- exist as data the router can read, not as a list on a page.
--
-- IT IS THE SAME TABLE EVERY OTHER BUSINESS USES
--
-- Black Phoenix is an `organizations` row of type `operator`, so its catalogue
-- is its own `organization_category` rows. One object, which is what stops
-- routing and first refusal ever disagreeing about what the company does. The
-- allowance trigger exempts `type = 'operator'` for exactly this reason, and
-- only that type.
--
-- No organisation id is hardcoded. The insert selects the operator org by
-- type, so this works in every environment and breaks loudly in none.
--
-- WHERE THE LIST COMES FROM
--
-- `KNOWN_TRADES` in `design-projects.tsx` — deck, structures, hardscape,
-- siding, openings, kitchen, bathroom, flooring, roofing, general — which is
-- what the design centre already builds for. Mapped onto Exchange categories
-- rather than invented, so the two cannot drift apart on day one.
--
-- This is a starting list and it is meant to be edited. Adding or removing a
-- category here is a row, not a migration, and the "might be ours" queue in
-- the routing engine exists precisely because no list is ever complete.
-- ============================================================================

insert into organization_category (org_id, category_id)
select o.id, c.id
from organizations o
cross join exchange_category c
where o.type = 'operator'
  and o.status = 'active'
  and c.parent_id is null
  and c.slug in (
    'general-contracting',  -- 'general' and 'structures': additions, garages, whole-home
    'decks-porches',        -- 'deck'
    'masonry-concrete',     -- 'hardscape'
    'siding',               -- 'siding'
    'windows-doors',        -- 'openings'
    'kitchens',             -- 'kitchen'
    'bathrooms',            -- 'bathroom'
    'flooring',             -- 'flooring'
    'roofing'               -- 'roofing'
  )
on conflict do nothing;


-- ------------------------------------------------------------
-- THE TERRITORY
--
-- Pelham, Salem and Manchester. First refusal applies to construction work
-- inside it and to nothing else — a job three states away, or a haircut next
-- door, never enters that window.
-- ------------------------------------------------------------
insert into organization_territory (org_id, territory_slug)
select o.id, t.slug
from organizations o
cross join exchange_territory t
where o.type = 'operator'
  and o.status = 'active'
  and t.slug in ('pelham-nh', 'salem-nh', 'manchester-nh')
on conflict do nothing;


-- ------------------------------------------------------------
-- THE RADIUS
--
-- Only where it has not been set, so this never overwrites a deliberate
-- choice on a re-run. The centre is the midpoint of the three launch towns
-- and the radius is the stated fifty miles of the first-refusal rule.
--
-- Both are defaults to be adjusted from the portal rather than facts this
-- migration is certain of.
-- ------------------------------------------------------------
update organizations
   set service_lat          = coalesce(service_lat, 42.850000),
       service_lng          = coalesce(service_lng, -71.290000),
       service_radius_miles = coalesce(service_radius_miles, 50),
       listing_source       = 'operator',
       claim_state          = 'claimed'
       -- `verification_state` IS DELIBERATELY NOT SET HERE.
       --
       -- This migration used to flip it to 'verified'. Applied against
       -- production on 2026-10-03 it did exactly that, for an organisation
       -- with no licence number and no licence expiry on record — so the
       -- database asserted a verification that nobody had performed.
       --
       -- Nothing was visibly wrong, which is what made it worth removing.
       -- `publicListing` computes the badge as verified AND an in-date
       -- `license_expires_at`, and the expiry was null, so no badge appeared.
       -- The trap was the day somebody entered a licence expiry for the
       -- company: a verified badge would have appeared on the strength of a
       -- flag this file set, not a check anyone made.
       --
       -- Being the operator is not evidence of a licence. If Black Phoenix
       -- should carry the badge, give it a real licence record — number,
       -- state and expiry — and the existing logic will show it honestly.
 where type = 'operator'
   and status = 'active';
