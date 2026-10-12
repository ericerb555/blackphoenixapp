-- Four categories for the four groups the retail backfill could not place.
--
-- After Shops & Retail took the directory from 45% to 81.6% browsable, the 201
-- listings still without a category were sampled. They were not a long tail of
-- oddities but four clear groups whose OSM tag had no honest destination —
-- counted across the three towns on 2026-10-12:
--
--     shop=car / motorcycle / boat   66   car and vehicle dealerships
--     shop=tyres                     11   tyre shops
--     shop=tattoo                    10   tattoo and piercing studios
--     shop=funeral_directors          9   funeral homes
--
-- Each had been left unmapped on purpose rather than guessed at. A dealership
-- is not Auto Repair — that is the Lowe's-under-Handyman mistake in a different
-- coat — and for the other three there was no category at all.
--
-- A dealership is retail: somebody is buying a vehicle. The other three are
-- services, and sit beside the trades a person would look for them next to.
insert into exchange_category
  (section_slug, slug, name, engagement_modes, default_radius_miles, sort_order, status)
values
  ('shops-retail', 'car-dealers', 'Car & Vehicle Dealers', '{list}', 25, 21, 'active'),
  -- Its own category rather than folded into Auto Repair, because fitting
  -- tyres and fixing a car are different errands.
  ('services', 'tires-wheels', 'Tires & Wheels', '{quote,book,list}', 20, 61, 'active'),
  -- Next to Hair Salons and Nail Salons, where somebody looking for one would
  -- expect to find it.
  ('services', 'tattoo-piercing', 'Tattoo & Piercing', '{book,list}', 20, 43, 'active'),
  -- Unmapped since the ingest was written, for want of this.
  ('services', 'funeral-homes', 'Funeral Homes', '{list}', 25, 70, 'active')
on conflict (slug) do update
  set section_slug = excluded.section_slug, name = excluded.name,
      engagement_modes = excluded.engagement_modes,
      default_radius_miles = excluded.default_radius_miles,
      sort_order = excluded.sort_order, status = 'active';

-- Uniqueness here is a functional index over the normalised phrase and is
-- GLOBAL, so every phrase was checked against the existing aliases first.
insert into exchange_category_alias (category_id, phrase, source, weight)
select c.id, p.phrase, 'seed', 100
from (values
  ('car-dealers',     'car dealer'),
  ('car-dealers',     'car dealership'),
  ('car-dealers',     'motorcycle dealer'),
  ('car-dealers',     'boat dealer'),
  ('car-dealers',     'truck dealer'),
  ('car-dealers',     'buy a car'),
  ('tires-wheels',    'tires'),
  ('tires-wheels',    'tyres'),
  ('tires-wheels',    'new tires'),
  ('tattoo-piercing', 'tattoo'),
  ('tattoo-piercing', 'tattoo studio'),
  ('tattoo-piercing', 'piercing'),
  ('funeral-homes',   'funeral home'),
  ('funeral-homes',   'funeral director'),
  ('funeral-homes',   'cremation')
) as p(cat, phrase)
join exchange_category c on c.slug = p.cat
on conflict do nothing;
