-- Shops & Retail — a section for the half of the directory that had nowhere to live.
--
-- 595 of 1,090 compiled listings held no category, because the taxonomy had
-- Home & Property, Services, Food and Entertainment and no section for a shop.
-- Reading those 595 names, most are retail: pharmacies, clothing, phone shops,
-- pet supplies, hardware, jewellers, discount stores, florists, opticians.
--
-- It is also why `shop=beauty`, `shop=hardware` and `shop=doityourself` were
-- unmapped from the ingest on 2026-10-06 rather than corrected — every
-- destination then available to them was wrong, because the right ones did not
-- exist yet. They do now.
--
-- THE CATEGORIES COME FROM THE NAMES THAT WERE ACTUALLY THERE, not from a
-- general idea of what retail contains. Each one below had members waiting for
-- it; the counts in the comments are from the uncategorised set on 2026-10-12.
--
-- Idempotent: safe to run twice, which matters because the seed it extends is
-- also re-runnable.

insert into exchange_section (slug, name, tagline, sort_order, status)
values ('shops-retail', 'Shops & Retail', 'Places to buy things', 25, 'active')
on conflict (slug) do update
  set name = excluded.name,
      tagline = excluded.tagline,
      sort_order = excluded.sort_order,
      status = 'active';

-- `default_radius_miles` follows the existing convention: how far somebody will
-- realistically travel for it. A convenience store is the shop you pass; a
-- department store is a trip you make.
insert into exchange_category
  (section_slug, slug, name, engagement_modes, default_radius_miles, sort_order, status)
values
  -- 14 waiting: CVS x4, Walgreens x4, Rite Aid x4, two independents.
  ('shops-retail', 'pharmacy',             'Pharmacies',                  '{list,order}', 8,  1,  'active'),
  -- 35 waiting: 7-Eleven, Circle K, Cumberland Farms, Nouria, Speedway, and a
  -- long tail of superettes and corner markets.
  ('shops-retail', 'convenience-stores',   'Convenience & Gas',           '{list}',       4,  2,  'active'),
  -- 10 waiting: Walmart, Kohl''s, Macy''s, JCPenney, BJ''s, Ocean State Job Lot.
  ('shops-retail', 'department-stores',    'Department & Big Box',        '{list}',       20, 3,  'active'),
  -- 45 waiting, the largest single group in the uncategorised set.
  ('shops-retail', 'clothing',             'Clothing & Shoes',            '{list}',       15, 4,  'active'),
  -- 20 waiting: the carriers, Best Buy, Apple, and the repair shops.
  ('shops-retail', 'phones-electronics',   'Phones & Electronics',        '{list,order}', 15, 5,  'active'),
  -- 20 waiting, including the three tags unmapped in October for want of this.
  ('shops-retail', 'hardware-building',    'Hardware & Building Supply',  '{list,order}', 15, 6,  'active'),
  -- 15 waiting: Arhaus, La-Z-Boy, LoveSac, Mattress Firm x3, west elm.
  ('shops-retail', 'furniture-mattresses', 'Furniture & Mattresses',      '{list}',       20, 7,  'active'),
  -- 10 waiting: Petco x2, PetSmart, Pet Life, and four independents.
  ('shops-retail', 'pet-supplies',         'Pet Supplies',                '{list,order}', 10, 8,  'active'),
  -- 8 waiting: Jared, Kay, Zales, Day''s, Hannoush, Nazarian, Pandora.
  ('shops-retail', 'jewelry',              'Jewelry',                     '{list}',       20, 9,  'active'),
  -- 12 waiting: Ulta x2, Sally Beauty x2, Bath & Body Works, GNC x2.
  ('shops-retail', 'beauty-supply',        'Beauty & Cosmetics',          '{list}',       12, 10, 'active'),
  -- 15 waiting: Dick''s x2, EMS, Ski Haus, two ski shops, Cycle Gear, a saddlery.
  ('shops-retail', 'sporting-goods',       'Sporting Goods & Outdoors',   '{list}',       20, 11, 'active'),
  -- 20 waiting: Barnes & Noble x2, two comic shops, Michaels x2, three music shops.
  ('shops-retail', 'books-music-hobby',    'Books, Music & Hobbies',      '{list}',       15, 12, 'active'),
  -- 6 waiting: Josh''s Toys, Ron''s Toy Shop, Build-A-Bear, Level Up Gaming.
  ('shops-retail', 'toys-games',           'Toys & Games',                '{list}',       15, 13, 'active'),
  -- 13 waiting: Dollar Tree x2, Family Dollar x4, Five Below x2, 99 Cent.
  ('shops-retail', 'discount-variety',     'Discount & Variety',          '{list}',       10, 14, 'active'),
  -- 5 waiting: Goodwill, Savers, Salvation Army, two local thrift stores.
  ('shops-retail', 'thrift-consignment',   'Thrift & Consignment',        '{list}',       15, 15, 'active'),
  -- 15 waiting. Florists were previously mapped to "planting & beds", which is
  -- landscaping — a florist is not a landscaper, and that is corrected with this.
  ('shops-retail', 'florists-gifts',       'Florists & Gifts',            '{list,order}', 12, 16, 'active'),
  -- 8 waiting: LensCrafters x2, Pearle Vision, MyEyeDr, Warby Parker.
  ('shops-retail', 'eyewear',              'Eyewear & Opticians',         '{list,book}',  15, 17, 'active'),
  -- 12 waiting: the three state liquor outlets, a beer shop, five smoke shops.
  ('shops-retail', 'liquor-tobacco',       'Liquor, Beer & Tobacco',      '{list}',       10, 18, 'active'),
  -- 6 waiting: Demers Garden Center, Beaver Valley, Dodge Grain, Tractor Supply.
  ('shops-retail', 'garden-farm',          'Garden & Farm Supply',        '{list,order}', 15, 19, 'active'),
  -- 3 waiting: Staples x2, Cartridge World. Distinct from the `printing`
  -- category in Services, which is a service rather than a shop.
  ('shops-retail', 'office-supplies',      'Office Supplies',             '{list,order}', 15, 20, 'active')
on conflict (slug) do update
  set section_slug = excluded.section_slug,
      name = excluded.name,
      engagement_modes = excluded.engagement_modes,
      default_radius_miles = excluded.default_radius_miles,
      sort_order = excluded.sort_order,
      status = 'active';

-- The phrases the ingest resolver matches against, written as a person would
-- say them.
--
-- UNIQUENESS IS GLOBAL AND ON THE NORMALISED FORM. The table carries no
-- unique constraint, but it does carry
-- `CREATE UNIQUE INDEX … ON (exchange_normalise_phrase(phrase))` — so a phrase
-- belongs to exactly ONE category across the whole taxonomy, and
-- `on conflict do nothing` silently leaves an already-claimed phrase pointing
-- where it already pointed. Every phrase below was checked against the
-- existing aliases before this was written; none of them collide. Anything
-- added later must be checked the same way, or it will appear to be seeded and
-- quietly resolve somewhere else.
--
-- Deliberately generous on synonyms and deliberately silent on anything
-- ambiguous: a phrase that could belong to two categories is left out
-- altogether. The cost of a miss is an uncategorised listing, which is visible
-- and fixable; the cost of a wrong match is a business filed where nobody
-- looking for it will ever see it.
insert into exchange_category_alias (category_id, phrase, source, weight)
select c.id, p.phrase, 'seed', 100
from (values
  ('pharmacy', 'pharmacy'), ('pharmacy', 'drugstore'), ('pharmacy', 'chemist'),
  ('pharmacy', 'prescriptions'),

  ('convenience-stores', 'convenience store'), ('convenience-stores', 'corner store'),
  ('convenience-stores', 'gas station'), ('convenience-stores', 'petrol station'),
  ('convenience-stores', 'superette'), ('convenience-stores', 'variety store'),

  ('department-stores', 'department store'), ('department-stores', 'big box store'),
  ('department-stores', 'wholesale club'),

  ('clothing', 'clothing'), ('clothing', 'clothes'), ('clothing', 'apparel'),
  ('clothing', 'shoes'), ('clothing', 'shoe store'), ('clothing', 'boutique'),
  ('clothing', 'menswear'), ('clothing', 'womenswear'), ('clothing', 'workwear'),

  ('phones-electronics', 'electronics'), ('phones-electronics', 'mobile phone store'),
  ('phones-electronics', 'cell phone store'), ('phones-electronics', 'phone repair'),
  ('phones-electronics', 'computer store'), ('phones-electronics', 'video games'),

  ('hardware-building', 'hardware store'), ('hardware-building', 'building supply'),
  ('hardware-building', 'lumber yard'), ('hardware-building', 'home improvement'),
  ('hardware-building', 'paint store'), ('hardware-building', 'tool store'),
  ('hardware-building', 'plumbing supply'), ('hardware-building', 'electrical supply'),

  ('furniture-mattresses', 'furniture'), ('furniture-mattresses', 'mattresses'),
  ('furniture-mattresses', 'bedding'), ('furniture-mattresses', 'home furnishings'),
  ('furniture-mattresses', 'interior decoration'),

  ('pet-supplies', 'pet supplies'), ('pet-supplies', 'pet store'),
  ('pet-supplies', 'pet food'), ('pet-supplies', 'aquarium supplies'),

  ('jewelry', 'jewelry'), ('jewelry', 'jeweller'), ('jewelry', 'jewellery'),
  ('jewelry', 'watches'), ('jewelry', 'diamonds'),

  ('beauty-supply', 'beauty supply'), ('beauty-supply', 'cosmetics'),
  ('beauty-supply', 'perfume'), ('beauty-supply', 'vitamins'),
  ('beauty-supply', 'health food store'),

  ('sporting-goods', 'sporting goods'), ('sporting-goods', 'sports store'),
  ('sporting-goods', 'outdoor gear'), ('sporting-goods', 'bicycle shop'),
  ('sporting-goods', 'ski shop'), ('sporting-goods', 'hunting and fishing'),

  ('books-music-hobby', 'bookshop'), ('books-music-hobby', 'book store'),
  ('books-music-hobby', 'music store'), ('books-music-hobby', 'musical instruments'),
  ('books-music-hobby', 'craft supplies'), ('books-music-hobby', 'hobby shop'),
  ('books-music-hobby', 'art supplies'), ('books-music-hobby', 'comic shop'),

  ('toys-games', 'toy store'), ('toys-games', 'toys'), ('toys-games', 'games shop'),

  ('discount-variety', 'discount store'), ('discount-variety', 'dollar store'),

  ('thrift-consignment', 'thrift store'), ('thrift-consignment', 'charity shop'),
  ('thrift-consignment', 'consignment'), ('thrift-consignment', 'second hand'),

  ('florists-gifts', 'florist'), ('florists-gifts', 'flowers'),
  ('florists-gifts', 'flower shop'), ('florists-gifts', 'gift shop'),
  ('florists-gifts', 'cards and gifts'),

  ('eyewear', 'eyewear'), ('eyewear', 'optician'), ('eyewear', 'optometrist'),
  ('eyewear', 'glasses'), ('eyewear', 'sunglasses'),

  ('liquor-tobacco', 'liquor store'), ('liquor-tobacco', 'wine shop'),
  ('liquor-tobacco', 'beer store'), ('liquor-tobacco', 'tobacco'),
  ('liquor-tobacco', 'smoke shop'), ('liquor-tobacco', 'vape shop'),

  ('garden-farm', 'garden center'), ('garden-farm', 'garden centre'),
  ('garden-farm', 'nursery and plants'), ('garden-farm', 'farm supply'),
  ('garden-farm', 'feed store'),

  ('office-supplies', 'office supplies'), ('office-supplies', 'stationery'),
  ('office-supplies', 'printer ink')
) as p(cat, phrase)
join exchange_category c on c.slug = p.cat
on conflict do nothing;
