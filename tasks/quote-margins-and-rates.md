# The rates were already saved. The quote engine was ignoring them.

## What Eric asked for

> "now add the vendor prices and labor rates"

## First, a correction to what I told him

I said production held no vendor catalogue, no labour rates, no pricing config
and no trade factors. **That was wrong.** I queried `kv_store_3eae23a6`, named
after the edge function, which has 0 rows and is not the store the server uses.
`supabase/functions/server/kv_store.tsx` reads and writes
**`kv_store_57095a78`**, which has 723 rows of live data.

What is actually there, as of 2026-10-07:

    labor_rates:global          13 trades, Eric's own, saved 27 September
    vendor_catalog:*            11 items across 2 vendors
    pricing_config:global       absent
    labor_tasks:trade_factors   absent (no finished jobs measured yet)

So the labour rates did not need adding. They needed to arrive.

## What was wrong, in increasing order of cost

### 1. His margins were stranded (money: wrong markups)

Two places can hold the company's margins and they disagree on field names:

    labour rates screen  ->  labor_rates:global
                             { profitSettings: { materialsMarkup,
                               laborMarkup, overheadPercentage,
                               targetProfitMargin } }

    pricing settings     ->  pricing_config:global
                             { config: { materialMarkup, laborMarkup,
                               profitMargin, overheadPercentage } }

Note `materialsMarkup` plural against `materialMarkup` singular, and
`targetProfitMargin` against `profitMargin`. Eric saved the first on 27
September; the second has never been written. `resolvePricing` read only the
second, so quotes used the STANDARD 30% materials markup where he had set 20%,
no labour markup where he had set 15%, and 15% profit where he had set 20%.

Worse, the blueprint quote path reads `profitSettings` directly and therefore
priced the same work differently from the description path. Two quotes for one
job that disagree is the kind of thing a customer finds before we do.

### 2. Percentages were handed to something expecting fractions (money: huge)

`repriceEstimate` writes `overheadPercent`, `profitPercent` and
`taxRatePercent` for `assembleEstimate`, which reads them as FRACTIONS and
clamps them at 0.4, 0.4 and 0.15. The settings hold PERCENTAGES — 10 and 15 —
which is correct and is how every other reader treats them
(`capitalPlanRules` computes `base * (1 + overheadPercentage / 100)`; the
property report prints "10 per cent overhead").

So 10 and 15 went across unconverted and `Math.min(0.4, 10)` is 0.4. **Every
repriced quote carried 40% overhead and 40% profit.** Measured, not deduced.

It survived because it never looks absurd. A quote at 1.88× direct cost reads
as an expensive quote, not a broken one — and the clamp is what made two very
different wrong numbers both land on the same plausible-looking ceiling.

### 3. An explicit zero was treated as "not set" (money: a tax that does not exist)

`Number(raw?.taxRatePercent) || 0.08`. Zero is falsy, so the correct New
Hampshire tax rate of zero became **8% sales tax on materials on every repriced
quote**, in a state with no sales tax. `STANDARD_PRICING` even carries a
comment saying the zero is deliberate and that a wrong tax line is worse than
none. The same pattern applied to overhead and profit, so a deliberate 0%
would have been overwritten too.

## What changed

- `pricingDefaults.ts` — `resolvePricing(saved, savedRates?)` now also reads
  the margins saved on the rates screen, translating the field names once in
  one place. The dedicated settings record still wins **field by field** where
  it has an opinion, so setting one value there does not wipe out the rest.
- `repriceEstimate.ts` — converts percentages to fractions at the boundary,
  with the units named in each field's comment.
- `quote-generator.tsx` — `pickFraction` distinguishes "not given" from "given
  as zero" for overhead, profit, contingency and tax. The clamps stay; they are
  a guard against a model returning nonsense.
- `index.tsx` and `property-reports.tsx` — both pass the rates record, so the
  quote path, the capital plan and the pricing-settings screen all answer with
  the same margins. The settings screen reporting standards while quotes used
  his figures would have made the one screen whose job is to tell him his
  settings the only place that did not know.

## The effect on a real quote

Ten sheets of OSB at $25 and ten hours of carpentry:

    BEFORE  materials $325.00 (30% standard)  labour $700.00 (no markup)
            direct $1025.00
            overhead 40%  profit 40%  contingency 5%  tax 8%
            TOTAL $1922.25   (1.88x direct)

    AFTER   materials $300.00 (his 20%)  labour $805.00 (his 15%)
            direct $1105.00
            overhead 10%  profit 20%  contingency 5%  tax 0%
            TOTAL $1491.75   (1.35x direct)

    22.4% lower.

Direct cost went UP, because his 15% labour markup is now applied where the
standards applied none. Everything above it came down a long way.

## Still outstanding: the vendor prices

**I have not added material prices, and will not invent them.**

There are 11 real catalogue items from 2 vendors, so coverage is thin and most
material lines will still be priced by the estimator and labelled `estimated`.
Filling that gap needs a real source, and the obvious candidate is not one:
`bigBoxProducts.tsx` is explicitly mock data behind a comment saying a real
Home Depot / Lowe's / Grainger integration would go there.

Making up a price list would mark those lines `catalogue` — the label meaning
"this is a real vendor price" — which is exactly the fault the previous two
commits were about, and this time it would be in the money rather than in a
caption. So it needs one of:

1. A real price list from a supplier account — a CSV or export is enough, and
   it loads straight into `vendor_catalog:*`.
2. A decision to pay for one of those retail APIs, which is a real integration
   rather than data entry.
3. Items added through the vendor portal by the vendors themselves, which is
   how Eric said catalogue questions should be answered.

A fourth option exists and is his call: a **standard material price book**
alongside `STANDARD_LABOR_RATES`, carrying a `standard` source label rather
than `catalogue`, so it is useful without claiming to be a vendor's price. That
is a design decision, not data entry, so it is not done here.

Typecheck app 316 / server 87, unchanged. 1851 tests pass, 13 of them new.
Smoke 359 rendered, 0 threw.
