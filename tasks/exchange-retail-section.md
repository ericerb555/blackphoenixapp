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

## Review

**45% browsable → 81.6%.** 889 of 1,090 listings now appear on a category
page, up from 495.

    Pelham      52    25 -> 46    48% -> 88.5%
    Salem      143    59 -> 130   41% -> 90.9%
    Manchester 895   411 -> 713   46% -> 79.7%
    ALL      1,090   495 -> 889   45% -> 81.6%

Verified through the public API signed out, and every row sums exactly against
its three towns — auto repair 103 = 8 + 7 + 88, hair salons 63 = 7 + 3 + 53,
clothing 54 = 0 + 9 + 45, and so on across ~50 populated categories.

The new retail section carries real listings in all but one of its twenty
categories: clothing 54, phones & electronics 25, furniture 23, florists &
gifts 19, sporting goods 17, hardware 16, pharmacy 13, liquor & tobacco 13,
jewelry 12, discount 11, books & music 14, department stores 8, pet supplies 8,
eyewear 8, garden & farm 5, toys 4, thrift 4, beauty 4, office supplies 3.
Convenience & Gas is the largest at 62.

Seven previously unreachable categories also filled: dry cleaning 16, lawyers
11, insurance 11, bakeries 9, real estate 7, printing 7, storage 1.

### How the backfill was done

No OSM id was stored when these were compiled, but `service_lat`/`service_lng`
were written from the feature's own coordinates at six decimal places, so each
listing could be matched back to its feature by exact position. That assumption
was tested against two known rows in production before anything was written.

Resolution went through `osmToRegistryRecord` and `assignCategory` — the same
two functions the ingest uses — rather than a second implementation that could
drift. 23 features resolved to a SERVICE and were lifted to its parent
category, which is the rule the database guard enforces: a business holds a
category, never a service under one.

**It fills only what is missing.** The first generated SQL would have added a
second category to listings that already held one; that was caught and a
`not exists` guard added before any of it was applied, matching the
server-side `fillMissingCategory`. Bridge Street Hardware is the case in
point — its wrong `handyman` row was deleted deliberately last week, and it
gained `hardware-building` because it had none, not because a script outvoted
a decision.

Overpass rate-limited hard after the day's compiles, so the twelve town-class
queries took about an hour with backoff. The fetcher saved after each one and
the backfill was applied in three passes as data arrived — Pelham and Salem
first, then Manchester's shops, crafts and offices, then its amenities. The
`not exists` guard is what made running it in pieces safe.

### What the remaining 201 are

Not a gap to close by pushing harder. Sampling them, they are businesses whose
OSM tag has no honest destination in the taxonomy:

  - **car dealerships** (Mercedes-Benz, Stanley Mitsubishi, Nault's Power
    Sports) — `shop=car`. Auto Repair is a different trade and filing a
    dealership there would be the Lowe's-under-Handyman mistake again.
  - **tyre shops** (Tire Warehouse, John & Son's Tire Service) — defensible as
    auto repair, but `shop=tyres` is a retailer and it is a judgement call
    rather than an obvious one.
  - **nail salons and tattoo studios** (Queen City Nails, Masterpiece Tattoo,
    Bulletproof Tiger) — `shop=beauty`, still deliberately unmapped because
    OSM uses that one tag for nail bars, waxing, spas and soap shops alike.
  - **funeral homes** (McHugh, Phaneuf) — `shop=funeral_directors`, unmapped
    since the beginning; there is no category.
  - **tailors, sign shops, precision engineering, investment firms** — one-offs
    with no category each.

Each of these is a deliberate "unmapped" rather than an oversight, and every
one of them is a decision worth making separately rather than guessing at in
bulk. Adding categories for car dealers, tyres, nail salons and funeral homes
would take the figure past 90%, and that is a taxonomy decision for Eric.
