# Shops & Retail: giving half the directory somewhere to live

## The problem, measured

595 of the Exchange's 1,090 compiled listings — **55%** — hold no category, so
they exist and answer on a direct link but appear on no category page. Nobody
browsing can reach them.

Reading the 595 names, the reason is structural rather than a bug: they are
overwhelmingly **shops**. DSW, PacSun, Walgreens, Petco, Mattress Firm, Metro
by T-Mobile, Ace Hardware, Day's Jewelers, Dollar Tree, laundromats, tattoo
studios, convenience stores. The taxonomy has four sections — Home & Property,
Services, Food, Entertainment — and **no retail section at all**. There is
nowhere to put a shop.

That is also why `shop=beauty`, `shop=hardware` and `shop=doityourself` had to
be unmapped on 2026-10-06 rather than corrected: every destination available to
them was wrong, because the right one did not exist.

## What the counting actually showed

The taxonomy is in better shape than the 55% suggests. `dry-cleaning`,
`nails`, `insurance`, `accountants`, `printing`, `storage`, `photography`,
`locksmith`, `towing`, `auto-body`, `grocers`, `bakeries`, `butchers` and
`delis` all **already exist and sit empty**, while businesses that plainly
belong in them sit uncategorised.

So this is two separate faults that look like one:

1. **No retail section.** Roughly 300 of the 595 are shops with no possible
   home. This is what Eric approved building.
2. **A thin tag map.** The rest are services and food businesses whose OSM tag
   maps to nothing, even though their category exists. `OSM_TRADE_WORDS` covers
   a few dozen tags out of the hundreds OSM uses.

Fixing (1) without (2) would leave a new section as empty as Entertainment —
12 categories, 0 businesses — so both are in scope here. What is NOT in scope
is inventing new service categories; the existing ones are used as they stand.

## Plan

- [ ] 1. Add a `shops-retail` section and 20 categories, chosen from the names
      actually sitting uncategorised rather than from a general idea of retail.
      Rehearsed in a rolled-back transaction before it is applied.
- [ ] 2. Seed aliases for the new categories, in the same shape as the existing
      seed, so the ingest resolver can reach them.
- [ ] 3. Widen `OSM_TRADE_WORDS` to cover the tags these businesses carry —
      including the three unmapped on 2026-10-06, which now have honest
      destinations — and map tags whose existing categories are empty.
- [ ] 4. Backfill the 595. No OSM id was stored, but `service_lat`/`service_lng`
      were written from the feature's own coordinates at six decimals, so a
      listing can be matched back to its OSM feature by position. Re-fetch the
      three towns once and assign categories from the corrected map.
- [ ] 5. Verify through the public API and in the running app, then typecheck,
      tests, smoke, commit, deploy.

## Risks and how they are handled

**A wrong category is worse than none.** That is the lesson from `beauty` →
Nail Salons, which caught a piercing studio, a soap shop and a spa — three for
three wrong. So a tag is mapped only where the mapping is unambiguous, and
anything doubtful is left unmapped. An uncategorised listing is visible and
fixable; a miscategorised one produces no leads, no complaint, and a
cancellation six months later.

**The backfill writes to 595 live rows.** It is additive — `organization_category`
inserts with `on conflict do nothing`, no listing is edited — and the match is
by exact coordinate, so a feature that has moved in OSM since the compile
simply does not match and the listing keeps no category.

**Overpass rate-limits.** The first fetch attempt fired twelve queries back to
back and was refused. The fetcher now waits properly, pauses between queries
and saves after each one, so a refusal late in the run does not discard the
work already done.
