# Accurate quoting: real prices, real labour hours

## What I found

**The quote generator invents every number.** `quote-generator.tsx` references
`vendor_catalog` 0 times, `kv.get` 0, `labor_rate` 0, `pricing_settings` 0,
`supabase` 0. Every unit cost, every labour rate and every vendor name comes out
of gpt-4o. The fallback path names a supplier "Supply House". The *structure* is
good — waste factors, crew productivity, permits, disposal, overhead broken out
— but nothing underneath is yours, and it cannot be current: the model has no
idea what lumber costs this week.

**Your real inputs exist and are ignored.**

| input | where | state |
|---|---|---|
| Labour rates, 12 trades | `labor_rates:global`, server | real, shared — **0 saved in production** (code defaults only) |
| Markups, margin, overhead, tax | `pricingConfig` | **localStorage only** — the server cannot read it at all |
| Vendor catalogue prices | `vendor_catalog:*`, server | real — **1 item in production** |

**What is missing entirely: how long work takes.** You have $/hour for twelve
trades and nothing that says a tiled floor is 0.1 hours a square foot. Rates
without production rates cannot produce a labour number, which is why the model
was left to guess it.

`deckQuote.ts` already does this correctly for decks — "hours per square foot,
builder's own productivity number", defaulting to **0** so it never invents one.
That is the pattern to generalise.

## Plan

### A. A task catalogue with real labour hours
- [ ] `labor_tasks:global` on the server, beside the rates, so it is shared
- [ ] Each task: trade, name, unit, **hours per unit**, crew size, minimum hours
- [ ] Minimum hours matters — a 20 sq ft tile patch is still half a day, and
      hours-per-unit alone prices small jobs far too low
- [ ] Condition multipliers: demolition first, tight access, second storey,
      pattern layouts (herringbone is not the same as a straight lay)
- [ ] Seeded with industry starting figures for your twelve trades —
      **clearly labelled as starting points, and editable**, because they are
      not yet measurements of your crews
- [ ] Editing UI beside the rates, showing when each was last changed by you

### B. Let the server see your pricing settings — DONE
- [x] Move `pricingConfig` from localStorage to the server. The generator
      physically cannot read markups or margin today, so it invents those too

### C. Reprice deterministically after the model — DONE
- [x] Model does the takeoff — what work, what materials, what quantities
- [x] Then the server replaces its numbers: catalogue price where a SKU matches,
      your task hours × your trade rate for labour, your markups and margin
- [x] The model never sets a price that we hold a real number for

### D. Say where every number came from
- [x] Each line marked: vendor catalogue (with vendor and date), your own rate,
      or estimated
- [x] A quote that cannot show its source for a figure should say so rather than
      let it pass as priced

### E. Pipeline
- [ ] Surface the priced quote and its confidence in the Work Request → Quote →
      Contract → Invoice board

## Open question for Eric

The seeded production rates are industry figures, not measurements of his crews.
They should be treated as a starting point to correct, and the UI should say so
rather than presenting them as fact.

### F. Standards on the server, so a quote is defensible from day one — IN PROGRESS

The rates and markups had defaults in the browser only. Nothing was ever saved,
so the server saw an empty list and marked every labour line `estimated`. Quotes
came back at near-zero confidence for no good reason.

- [x] Run the repricer locally against a realistic estimate and watch the
      numbers — confidence off the floor, lines marked `standard` not
      `your-rate`, `onYourFigures` still 0 when nothing is saved
- [x] Confirm saved figures still win over the standards
- [x] Two problems the run surfaced, both fixed:
      - the note only mentioned standards in the ≥80% band, and real quotes
        land in the middle band, so the sentence that stops standards reading
        as Eric's own figures almost never appeared
      - `pricing-config/get` returning standards instead of `null` made
        `loadPricingConfigFromServer` overwrite markups held only in
        localStorage, which is where they all lived until last commit
- [x] Commit and push
- [ ] Deploy the edge function
- [ ] Generate a real quote in the running app and read the summary off the screen

## Review

_(to be completed)_
