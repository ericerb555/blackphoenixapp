# The Exchange town filter does nothing

## The fault

`GET /exchange/category/:slug` accepts `?territory=` and the browse pages send
it correctly. The handler reads it into a local and passes it to the demand
ledger — and nowhere else. It never filters the listings.

Measured against production on 2026-10-06:

    restaurants in pelham-nh       49
    restaurants in salem-nh        49
    restaurants in manchester-nh   49

Manchester has no listings at all. What the three answers really are:

    pelham-nh      11
    salem-nh       38
    manchester-nh   0
    no filter      49

With one town live this was invisible, because unfiltered and Pelham were the
same set. Salem made it visible: picking "Salem" shows Pelham's restaurants,
and picking Manchester shows forty-nine businesses that are not there.

This is the same failure class as the rest of this feature's history — a
control that reports success while doing nothing. The selector looks like it
works, because the list changes length when you change category.

## A second, quieter fault in the same lines

`territory` is passed to `recordDemand` unvalidated, and it lands in
`exchange_demand_event.territory_slug`, a foreign key to `exchange_territory`.
The ledger writer swallows its own failures by design, so a slug that is not a
real town silently loses the demand row. `exchangeTowns.ts` warns about exactly
this and keeps a closed set on the client to prevent it; the server took the
client's word for it. Validating the town fixes both faults with one query.

## Plan

- [x] 1. Validate the town against `exchange_territory` before using it.
      Unknown slug answers 404 "No such town." — not an empty list, because an
      empty directory and a broken one must never be the same answer.
- [x] 2. Filter the listings by `organization_territory` when a town is given.
      Root the query at `organizations` so both filters are one level deep.
- [x] 3. No town given still means every town. That is the front door's
      default and it must not change.
- [x] 4. Verify against production: 11 / 38 / 0 / 49, and the category page
      rendered in a browser with the selector actually moving the list.
- [x] 5. Typecheck both halves, smoke, commit, push, deploy.

## Scope

One handler in `supabase/functions/server/exchangeDirectory.tsx`. No frontend
change — the page already sends the parameter. No schema change.

## Review

All five items done. One file changed:
`supabase/functions/server/exchangeDirectory.tsx`, the category handler only.

**The filter.** The query is now rooted at `organizations` rather than at
`organization_category`, so the category filter and the town filter both sit
one level deep in the embed instead of one being nested behind the other. Both
embeds are `!inner`, which is what makes an embed a join rather than a
decoration — without it the filter narrows the embedded rows and keeps every
parent, which would have looked like a fix and changed nothing. The territory
embed is added only when a town is named, because an unconditional `!inner`
would silently drop any listing with no territory row.

**The town is validated.** An unknown slug answers 404 "No such town." rather
than an empty list. That also closes the quieter fault: the slug reaches
`exchange_demand_event.territory_slug`, a foreign key, and the ledger writer
swallows its own failures, so an invented town used to lose the demand row
silently.

**Results deduplicated by id**, since a join can repeat a parent. The
`PUBLIC_ORG_TYPES` and `status` checks deliberately stayed in JavaScript rather
than moving into the query — that is the rule keeping a customer, a landlord or
a condo association off a public page, and it is worth having in one obvious
place every route in the file reads the same way.

### Verified against production, not inferred

    category         all   pelham   salem
    restaurants       49       11      38
    auto-repair       15        8       7
    cafes-coffee       6        0       6
    hair-salon         8        5       3
    bars-pubs          2        1       1
    veterinary         2        0       2
    hvac               1        0       1
    it-services        1        0       1

Every town column sums to its unfiltered total, and each figure matches the
same question asked directly in SQL. `?territory=not-a-town` answers 404.

### Verified in the running app

Driven over the DevTools protocol, because the town is a `localStorage`
preference rather than a URL parameter and a fresh profile is always "All
towns". Rendered card counts, not just the heading:

    stored=(none)          cards=49   All towns · 49 businesses
    stored=pelham-nh       cards=11   Pelham · 11 businesses
    stored=salem-nh        cards=38   Salem · 38 businesses
    stored=manchester-nh   cards=0    Manchester · 0 businesses

The empty town is a state this fix makes reachable for the first time, so it
was looked at directly rather than assumed: Manchester renders "Nobody here yet
for restaurants" with the tell-us-who-is-missing prompt. That prompt is how the
demand ledger learns who to approach next, and it was previously dead on every
town, because every town reported forty-nine.

Typecheck app 316 / server 87, both unchanged. Smoke 352 rendered, 0 threw.
