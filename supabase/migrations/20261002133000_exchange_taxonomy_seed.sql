-- ============================================================================
-- Phoenix Exchange — seeding the taxonomy and the launch territories
--
-- Data, not schema. Every statement is `on conflict do nothing`, so this is
-- re-runnable and so a category edited by hand afterwards is not stamped back
-- over by a redeploy.
--
-- The seed is deliberately broad rather than complete. A directory that
-- offers four categories looks dead; one that offers sixty looks like a place
-- a town might actually be found in. Service leaves are seeded densely for
-- the building trades, because that is where matching has to be precise and
-- where Black Phoenix's own first refusal is decided, and sparsely elsewhere,
-- where the category is usually enough.
-- ============================================================================


-- ------------------------------------------------------------
-- SECTIONS — the four doors
-- ------------------------------------------------------------
insert into exchange_section (slug, name, tagline, sort_order) values
  ('home-property',  'Home & Property', 'Work on the building',            1),
  ('services',       'Services',        'People who do things for you',    2),
  ('food',           'Food',            'Eat, drink, order in',            3),
  ('entertainment',  'Entertainment',   'What is on near you',             4)
on conflict (slug) do nothing;


-- ------------------------------------------------------------
-- CATEGORIES
--
-- `is_construction` is the flag that decides whether Black Phoenix's first
-- refusal can apply, so it is true only for building work. Lawn care, pest
-- control and house cleaning sit in this section because that is where a
-- resident looks for them, not because Black Phoenix would ever take the job.
--
-- Radius is the default a search starts at, chosen from how far people
-- actually travel for the thing.
-- ------------------------------------------------------------
insert into exchange_category
  (section_slug, slug, name, engagement_modes, is_construction, default_radius_miles, sort_order)
values
  -- Home & Property — building trades
  ('home-property', 'general-contracting', 'General Contracting', '{quote,list}',       true,  40,  1),
  ('home-property', 'roofing',             'Roofing',             '{quote,list}',       true,  35,  2),
  ('home-property', 'siding',              'Siding',              '{quote,list}',       true,  35,  3),
  ('home-property', 'windows-doors',       'Windows & Doors',     '{quote,list}',       true,  35,  4),
  ('home-property', 'decks-porches',       'Decks & Porches',     '{quote,list}',       true,  35,  5),
  ('home-property', 'kitchens',            'Kitchen Remodeling',  '{quote,list}',       true,  40,  6),
  ('home-property', 'bathrooms',           'Bathroom Remodeling', '{quote,list}',       true,  40,  7),
  ('home-property', 'flooring',            'Flooring',            '{quote,list}',       true,  35,  8),
  ('home-property', 'painting',            'Painting',            '{quote,list}',       true,  30,  9),
  ('home-property', 'plumbing',            'Plumbing',            '{quote,list}',       true,  25, 10),
  ('home-property', 'electrical',          'Electrical',          '{quote,list}',       true,  25, 11),
  ('home-property', 'hvac',                'Heating & Cooling',   '{quote,list}',       true,  30, 12),
  ('home-property', 'masonry-concrete',    'Masonry & Concrete',  '{quote,list}',       true,  35, 13),
  ('home-property', 'fencing',             'Fencing',             '{quote,list}',       true,  30, 14),
  ('home-property', 'gutters',             'Gutters',             '{quote,list}',       true,  30, 15),
  ('home-property', 'insulation',          'Insulation',          '{quote,list}',       true,  35, 16),
  ('home-property', 'chimney',             'Chimney & Fireplace', '{quote,list}',       true,  35, 17),
  ('home-property', 'garage-doors',        'Garage Doors',        '{quote,list}',       true,  30, 18),
  ('home-property', 'septic-well',         'Septic & Well',       '{quote,list}',       true,  40, 19),
  ('home-property', 'solar',               'Solar',               '{quote,list}',       true,  50, 20),
  ('home-property', 'excavation',          'Excavation & Site Work', '{quote,list}',    true,  40, 21),

  -- Home & Property — grounds and upkeep, which Black Phoenix does not bid
  ('home-property', 'landscaping',         'Landscaping',         '{quote,list}',       false, 25, 30),
  ('home-property', 'lawn-care',           'Lawn Care',           '{quote,book,list}',  false, 15, 31),
  ('home-property', 'tree-service',        'Tree Service',        '{quote,list}',       false, 30, 32),
  ('home-property', 'snow-removal',        'Snow Removal',        '{quote,book,list}',  false, 15, 33),
  ('home-property', 'pressure-washing',    'Pressure Washing',    '{quote,book,list}',  false, 25, 34),
  ('home-property', 'house-cleaning',      'House Cleaning',      '{quote,book,list}',  false, 20, 35),
  ('home-property', 'pest-control',        'Pest Control',        '{quote,book,list}',  false, 25, 36),
  ('home-property', 'junk-removal',        'Junk Removal',        '{quote,book,list}',  false, 25, 37),
  ('home-property', 'pools-spas',          'Pools & Spas',        '{quote,list}',       false, 35, 38),
  ('home-property', 'handyman',            'Handyman',            '{quote,book,list}',  false, 20, 39),
  ('home-property', 'appliance-repair',    'Appliance Repair',    '{quote,book,list}',  false, 25, 40),

  -- Services — professional
  ('services', 'lawyers',          'Lawyers',                '{quote,book,list}', false, 50,  1),
  ('services', 'accountants',      'Accountants & Tax',      '{quote,book,list}', false, 40,  2),
  ('services', 'insurance',        'Insurance',              '{quote,list}',      false, 40,  3),
  ('services', 'real-estate',      'Real Estate Agents',     '{list,book}',       false, 30,  4),
  ('services', 'mortgage',         'Mortgage & Lending',     '{quote,list}',      false, 50,  5),
  ('services', 'architects',       'Architects',             '{quote,list}',      false, 60,  6),
  ('services', 'engineers',        'Engineers',              '{quote,list}',      false, 60,  7),
  ('services', 'surveyors',        'Surveyors',              '{quote,list}',      false, 50,  8),
  ('services', 'home-inspection',  'Home Inspection',        '{quote,book,list}', false, 40,  9),

  -- Services — business
  ('services', 'it-services',      'IT & Computer Repair',   '{quote,book,list}', false, 30, 20),
  ('services', 'marketing',        'Marketing & Design',     '{quote,list}',      false, 75, 21),
  ('services', 'printing',         'Printing & Signs',       '{quote,order,list}',false, 30, 22),
  ('services', 'staffing',         'Staffing',               '{quote,list}',      false, 50, 23),
  ('services', 'commercial-cleaning','Commercial Cleaning',  '{quote,list}',      false, 30, 24),
  ('services', 'photography',      'Photography & Video',    '{quote,book,list}', false, 40, 25),

  -- Services — personal
  ('services', 'hair-salon',       'Hair Salons',            '{book,list}',       false, 12, 40),
  ('services', 'barber',           'Barbers',                '{book,list}',       false, 10, 41),
  ('services', 'nails',            'Nail Salons',            '{book,list}',       false, 10, 42),
  ('services', 'spa-massage',      'Spa & Massage',          '{book,list}',       false, 15, 43),
  ('services', 'fitness',          'Gyms & Trainers',        '{book,list}',       false, 12, 44),
  ('services', 'tutoring',         'Tutoring',               '{book,quote,list}', false, 20, 45),
  ('services', 'childcare',        'Childcare',              '{book,list}',       false, 12, 46),
  ('services', 'veterinary',       'Veterinary & Pet Care',  '{book,list}',       false, 20, 47),
  ('services', 'dry-cleaning',     'Dry Cleaning & Tailoring','{book,list}',      false, 12, 48),

  -- Services — auto and transport
  ('services', 'auto-repair',      'Auto Repair',            '{quote,book,list}', false, 20, 60),
  ('services', 'auto-body',        'Auto Body & Glass',      '{quote,book,list}', false, 25, 61),
  ('services', 'towing',           'Towing & Roadside',      '{quote,list}',      false, 30, 62),
  ('services', 'movers',           'Movers',                 '{quote,list}',      false, 50, 63),
  ('services', 'storage',          'Storage',                '{list,book}',       false, 20, 64),
  ('services', 'locksmith',        'Locksmiths',             '{quote,list}',      false, 25, 65),

  -- Food
  ('food', 'restaurants',   'Restaurants',        '{order,book,list}', false,  8,  1),
  ('food', 'pizza',         'Pizza',              '{order,list}',      false,  6,  2),
  ('food', 'cafes-coffee',  'Cafés & Coffee',     '{order,list}',      false,  6,  3),
  ('food', 'bakeries',      'Bakeries',           '{order,list}',      false,  8,  4),
  ('food', 'delis',         'Delis & Sandwiches', '{order,list}',      false,  6,  5),
  ('food', 'bars-pubs',     'Bars & Pubs',        '{list,book,event}', false,  8,  6),
  ('food', 'breweries',     'Breweries & Taprooms','{list,event}',     false, 15,  7),
  ('food', 'food-trucks',   'Food Trucks',        '{order,event,list}',false, 10,  8),
  ('food', 'caterers',      'Caterers',           '{quote,order,list}',false, 30,  9),
  ('food', 'ice-cream',     'Ice Cream & Dessert','{order,list}',      false,  8, 10),
  ('food', 'grocers',       'Grocers & Markets',  '{list,order}',      false, 10, 11),
  ('food', 'butchers',      'Butchers & Seafood', '{list,order}',      false, 12, 12),

  -- Entertainment
  ('entertainment', 'live-music',     'Live Music',            '{event,list}',       false, 25,  1),
  ('entertainment', 'venues',         'Venues & Halls',        '{list,book,event}',  false, 30,  2),
  ('entertainment', 'theaters',       'Theatre & Cinema',      '{event,list}',       false, 25,  3),
  ('entertainment', 'djs-bands',      'DJs & Bands',           '{quote,book,list}',  false, 40,  4),
  ('entertainment', 'event-rentals',  'Event Rentals',         '{quote,order,list}', false, 35,  5),
  ('entertainment', 'fairs-festivals','Fairs & Festivals',     '{event,list}',       false, 30,  6),
  ('entertainment', 'kids-activities','Kids'' Activities',     '{event,book,list}',  false, 20,  7),
  ('entertainment', 'golf',           'Golf',                  '{book,list}',        false, 25,  8),
  ('entertainment', 'bowling-arcades','Bowling & Arcades',     '{book,list}',        false, 20,  9),
  ('entertainment', 'museums',        'Museums & Galleries',   '{event,list}',       false, 30, 10),
  ('entertainment', 'farms-orchards', 'Farms & Orchards',      '{event,list}',       false, 30, 11),
  ('entertainment', 'parks-trails',   'Parks & Trails',        '{list,event}',       false, 25, 12)
on conflict (slug) do nothing;


-- ------------------------------------------------------------
-- SERVICE LEAVES
--
-- Dense where matching has to be precise. A leaf inherits its parent's modes,
-- construction flag and radius — holding "Roofing" brings every one of these
-- at no extra cost, which is the rule that makes an allowance of five
-- categories generous rather than absurd.
-- ------------------------------------------------------------
insert into exchange_category
  (section_slug, parent_id, slug, name, engagement_modes, is_construction, default_radius_miles, sort_order)
select p.section_slug, p.id, v.slug, v.name,
       p.engagement_modes, p.is_construction, p.default_radius_miles, v.sort_order
from (values
  ('roofing',        'roof-replacement',   'Roof replacement',        1),
  ('roofing',        'roof-repair',        'Roof repair',             2),
  ('roofing',        'flat-roof',          'Flat & rubber roofing',   3),
  ('roofing',        'skylights',          'Skylights',               4),
  ('siding',         'vinyl-siding',       'Vinyl siding',            1),
  ('siding',         'fiber-cement',       'Fiber cement siding',     2),
  ('siding',         'wood-siding',        'Wood & shake siding',     3),
  ('siding',         'siding-repair',      'Siding repair',           4),
  ('windows-doors',  'window-replacement', 'Window replacement',      1),
  ('windows-doors',  'entry-doors',        'Entry doors',             2),
  ('windows-doors',  'sliding-patio',      'Sliders & patio doors',   3),
  ('windows-doors',  'storm-windows',      'Storm windows & doors',   4),
  ('decks-porches',  'deck-build',         'New deck',                1),
  ('decks-porches',  'deck-rebuild',       'Deck rebuild & resurface',2),
  ('decks-porches',  'porch-screening',    'Porches & screen rooms',  3),
  ('decks-porches',  'deck-railing',       'Railings & stairs',       4),
  ('kitchens',       'kitchen-full',       'Full kitchen remodel',    1),
  ('kitchens',       'cabinets',           'Cabinets',                2),
  ('kitchens',       'countertops',        'Countertops',             3),
  ('bathrooms',      'bathroom-full',      'Full bathroom remodel',   1),
  ('bathrooms',      'tub-shower',         'Tub & shower',            2),
  ('bathrooms',      'bathroom-tile',      'Bathroom tile',           3),
  ('flooring',       'hardwood',           'Hardwood',                1),
  ('flooring',       'tile-floor',         'Tile',                    2),
  ('flooring',       'carpet-lvp',         'Carpet & vinyl plank',    3),
  ('painting',       'interior-painting',  'Interior painting',       1),
  ('painting',       'exterior-painting',  'Exterior painting',       2),
  ('plumbing',       'leak-repair',        'Leaks & burst pipes',     1),
  ('plumbing',       'fixture-install',    'Fixture installation',    2),
  ('plumbing',       'water-heater',       'Water heaters',           3),
  ('plumbing',       'drain-clearing',     'Drains & sewer',          4),
  ('electrical',     'panel-upgrade',      'Panel upgrades',          1),
  ('electrical',     'wiring-outlets',     'Wiring & outlets',        2),
  ('electrical',     'lighting-install',   'Lighting',                3),
  ('electrical',     'generator',          'Generators',              4),
  ('hvac',           'furnace',            'Furnaces & boilers',      1),
  ('hvac',           'ac-install',         'Air conditioning',        2),
  ('hvac',           'mini-split',         'Mini splits & heat pumps',3),
  ('hvac',           'ductwork',           'Ductwork',                4),
  ('masonry-concrete','driveway',          'Driveways & walkways',    1),
  ('masonry-concrete','foundation',        'Foundations',             2),
  ('masonry-concrete','patio-pavers',      'Patios & pavers',         3),
  ('masonry-concrete','retaining-wall',    'Retaining walls',         4),
  ('gutters',        'gutter-install',     'Gutter installation',     1),
  ('gutters',        'gutter-cleaning',    'Gutter cleaning',         2),
  ('landscaping',    'planting-beds',      'Planting & beds',         1),
  ('landscaping',    'hardscape',          'Hardscaping',             2),
  ('landscaping',    'irrigation',         'Irrigation',              3),
  ('lawn-care',      'mowing',             'Mowing',                  1),
  ('lawn-care',      'fertilizing',        'Fertilising & weed control',2),
  ('lawn-care',      'spring-cleanup',     'Spring & fall cleanup',   3),
  ('tree-service',   'tree-removal',       'Tree removal',            1),
  ('tree-service',   'tree-trimming',      'Trimming & pruning',      2),
  ('tree-service',   'stump-grinding',     'Stump grinding',          3),
  ('general-contracting','home-addition',  'Additions',               1),
  ('general-contracting','whole-home-reno','Whole-home renovation',   2),
  ('general-contracting','basement-finish','Basement finishing',      3),
  ('general-contracting','garage-build',   'Garages & outbuildings',  4),
  ('general-contracting','storm-damage',   'Storm & water damage',    5),
  ('lawyers',        'real-estate-law',    'Real estate & closings',  1),
  ('lawyers',        'family-law',         'Family law',              2),
  ('lawyers',        'estate-planning',    'Wills & estates',         3),
  ('lawyers',        'injury-law',         'Personal injury',         4),
  ('lawyers',        'business-law',       'Business law',            5),
  ('auto-repair',    'oil-brakes',         'Oil, brakes & tyres',     1),
  ('auto-repair',    'engine-diagnostics', 'Engine & diagnostics',    2),
  ('auto-repair',    'state-inspection',   'State inspection',        3),
  ('caterers',       'wedding-catering',   'Weddings',                1),
  ('caterers',       'corporate-catering', 'Corporate & office',      2),
  ('caterers',       'party-trays',        'Party trays',             3)
) as v(parent_slug, slug, name, sort_order)
join exchange_category p on p.slug = v.parent_slug and p.parent_id is null
on conflict (slug) do nothing;


-- ------------------------------------------------------------
-- ALIASES — the words people actually use
--
-- The cheap first layer. What these miss goes to the resolver, and what the
-- resolver works out is written back here as a learned alias, so this table
-- grows and the model gets called less.
-- ------------------------------------------------------------
insert into exchange_category_alias (category_id, phrase, source, weight)
select c.id, v.phrase, 'seed', 100
from (values
  ('leak-repair',        'leaky faucet'),
  ('leak-repair',        'my sink is leaking'),
  ('leak-repair',        'burst pipe'),
  ('leak-repair',        'pipe leaking'),
  ('drain-clearing',     'clogged drain'),
  ('drain-clearing',     'blocked toilet'),
  ('water-heater',       'no hot water'),
  ('plumbing',           'plumber'),
  ('electrical',         'electrician'),
  ('wiring-outlets',     'outlet not working'),
  ('panel-upgrade',      'breaker box'),
  ('generator',          'whole house generator'),
  ('hvac',               'furnace not working'),
  ('hvac',               'no heat'),
  ('ac-install',         'air conditioner'),
  ('mini-split',         'heat pump'),
  ('roofing',            'roofer'),
  ('roof-repair',        'roof leaking'),
  ('roof-repair',        'missing shingles'),
  ('roof-replacement',   'new roof'),
  ('gutter-cleaning',    'gutters full of leaves'),
  ('gutters',            'guy for gutters'),
  ('siding',             'new siding'),
  ('window-replacement', 'replace my windows'),
  ('windows-doors',      'drafty windows'),
  ('deck-rebuild',       'my deck is rotten'),
  ('decks-porches',      'build a deck'),
  ('kitchens',           'redo my kitchen'),
  ('kitchens',           'kitchen remodel'),
  ('bathrooms',          'redo my bathroom'),
  ('tub-shower',         'walk in shower'),
  ('general-contracting','general contractor'),
  ('general-contracting','builder'),
  ('home-addition',      'add a room'),
  ('basement-finish',    'finish my basement'),
  ('storm-damage',       'water damage'),
  ('painting',           'painter'),
  ('interior-painting',  'paint my living room'),
  ('flooring',           'new floors'),
  ('carpet-lvp',         'laminate floor'),
  ('mowing',             'mow my lawn'),
  ('lawn-care',          'lawn guy'),
  ('spring-cleanup',     'yard cleanup'),
  ('tree-removal',       'cut down a tree'),
  ('tree-trimming',      'trim my trees'),
  ('snow-removal',       'plow my driveway'),
  ('junk-removal',       'haul away junk'),
  ('house-cleaning',     'cleaner'),
  ('house-cleaning',     'house cleaner'),
  ('pest-control',       'exterminator'),
  ('pest-control',       'mice in my house'),
  ('handyman',           'handyman'),
  ('handyman',           'odd jobs'),
  ('appliance-repair',   'washing machine broken'),
  ('driveway',           'pave my driveway'),
  ('patio-pavers',       'new patio'),
  ('fencing',            'put up a fence'),
  ('chimney',            'chimney sweep'),
  ('septic-well',        'septic pumping'),
  ('home-inspection',    'home inspector'),
  ('real-estate-law',    'closing attorney'),
  ('family-law',         'divorce lawyer'),
  ('estate-planning',    'write a will'),
  ('injury-law',         'car accident lawyer'),
  ('accountants',        'do my taxes'),
  ('accountants',        'tax preparer'),
  ('real-estate',        'realtor'),
  ('real-estate',        'sell my house'),
  ('mortgage',           'home loan'),
  ('movers',             'moving company'),
  ('towing',             'tow truck'),
  ('auto-repair',        'mechanic'),
  ('state-inspection',   'car inspection'),
  ('auto-body',          'dent repair'),
  ('locksmith',          'locked out'),
  ('it-services',        'computer repair'),
  ('hair-salon',         'haircut'),
  ('barber',             'barber shop'),
  ('nails',              'manicure'),
  ('spa-massage',        'massage'),
  ('fitness',            'personal trainer'),
  ('veterinary',         'vet'),
  ('childcare',          'daycare'),
  ('tutoring',           'tutor'),
  ('photography',        'wedding photographer'),
  ('restaurants',        'somewhere to eat'),
  ('restaurants',        'dinner near me'),
  ('pizza',              'pizza'),
  ('cafes-coffee',       'coffee'),
  ('bars-pubs',          'happy hour'),
  ('bars-pubs',          'a drink'),
  ('breweries',          'brewery'),
  ('bakeries',           'birthday cake'),
  ('ice-cream',          'ice cream'),
  ('caterers',           'catering'),
  ('wedding-catering',   'cater my wedding'),
  ('food-trucks',        'food truck'),
  ('live-music',         'live music tonight'),
  ('live-music',         'bands playing'),
  ('venues',             'function hall'),
  ('venues',             'wedding venue'),
  ('djs-bands',          'dj for a party'),
  ('event-rentals',      'rent a tent'),
  ('kids-activities',    'something for the kids'),
  ('fairs-festivals',    'whats on this weekend'),
  ('farms-orchards',     'apple picking'),
  ('golf',               'tee time'),
  ('bowling-arcades',    'bowling')
) as v(category_slug, phrase)
join exchange_category c on c.slug = v.category_slug
on conflict do nothing;


-- ------------------------------------------------------------
-- LAUNCH TERRITORIES — southern New Hampshire
--
-- Manchester supplies the density Food and Entertainment need; Pelham and
-- Salem supply the residential work for the quote side. All three sit inside
-- the existing 40-mile radius.
-- ------------------------------------------------------------
insert into exchange_territory (slug, name, state, postcodes, center_lat, center_lng) values
  ('pelham-nh',     'Pelham',     'NH', '{03076}',                              42.736200, -71.327300),
  ('salem-nh',      'Salem',      'NH', '{03079}',                              42.788400, -71.200900),
  ('manchester-nh', 'Manchester', 'NH', '{03101,03102,03103,03104,03109}',      42.995600, -71.454800)
on conflict (slug) do nothing;
