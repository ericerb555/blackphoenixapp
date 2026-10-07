# Manchester, and the cap that hid a third of it

## The fault

Manchester had been compiled once and produced 570 listings. It was short, and
nothing said so.

`overpassQuery` asked for all four feature classes in one query, and Overpass's
`out center tags 800` caps the **combined** result. Asked class by class with
`out count`, six kilometres around the city centre holds:

    shop      785
    craft      29
    office     94
    amenity   323
    ------------
    total    1231

So the query returned the first 800 of 1231 and said nothing whatever about the
other 431. Overpass does not warn when `out` truncates: no flag in the
response, HTTP 200, well-formed JSON. Pelham (121 features) and Salem (438)
were both under the cap, so two correct runs came first and 800 looked like a
generous ceiling rather than a live constraint.

This is the project's most expensive failure shape again — a system reporting
success while quietly doing part of the job. A town's directory being a third
short is invisible by inspection, because every listing in it is real.

## Plan

- [x] 1. Split the Overpass query: one per feature class, each with its own
      allowance, so no class can be starved by another.
- [x] 2. Report any class that comes back AT its limit, because that is the
      only signal truncation gives. A run that hides it is the bug again.
- [x] 3. Dedupe by OSM type and id, since a feature can answer two classes.
- [x] 4. Compile Manchester through the same module the runner uses, refusing
      to emit anything if a class looks truncated.
- [x] 5. Apply, verifying counts between every step.
- [x] 6. Verify through the public API and in the running app.
- [x] 7. Typecheck both halves, tests, smoke, commit, push, deploy.

## Review

**895 listings, against the truncated run's 570.** 325 businesses were missing.
411 category links across 19 categories. 0 skipped on a shared phone, 0 left
without a free slug, 0 slug clashes with the 213 organisations already there —
checked before anything was written, not after.

### The code changes

`exchangeOsm.ts` gains `overpassClassQueries` (one query per class, default
allowance 2000, where Manchester's largest class uses 785), `truncatedClasses`
(which classes came back at their limit and are therefore suspect) and
`dedupeOsmElements` (identity is OSM's own type and id — a bakery that bakes on
site answers both `shop` and `craft`; five features in Manchester did).
`overpassQuery` stays for spot checks, with a comment saying plainly why it is
no longer what compiles a town.

`exchangeIngestRun.ts` asks class by class, sequentially rather than in
parallel — four simultaneous queries from one caller is not the courtesy a
shared free endpoint's terms ask for — and carries `truncated` up into
`IngestOutcome` so a short run says so.

### A second defect, which the database caught

Applying the category links failed with:

    P0001: a business holds categories, not individual services

`family-law` is a service whose parent is `lawyers`, and the alias table
resolves "lawyer" phrases to it. Manchester has eleven law offices and every
one of them resolved to the service. The guard refused the lot.

That is a live break in the runner, not just in this compile: the category
insert is the last thing done for a listing, so the organisation row would go
in and its category would not — quietly uncategorised, with the error buried in
a log. `exchangeIngestRun.ts` now takes `parent_id ?? id`, which is the same
rule the read path already applies in reverse (`holdingId` in
`exchangeDirectory` lists the businesses holding a category's parent). The write
now agrees with the read instead of relying on the alias table only ever naming
top-level categories.

The guard working is worth noting on its own: it failed closed and named the
reason, which is why this was a five-minute fix rather than a mystery.

### Verified against production

Every town column sums to its unfiltered total:

    category          all  pelham  salem  manchester
    restaurants       241      11     38         192
    auto-repair       103       8      7          88
    hair-salon         61       5      3          53
    bars-pubs          21       1      1          19
    cafes-coffee       20       0      6          14
    lawyers            11       0      0          11
    real-estate         7       0      0           7
    spa-massage         6       0      0           6
    breweries           3       0      0           3
    plumbing            3       0      0           3
    veterinary          5       0      2           3
    accountants         2       0      0           2

`roofing` is the one row that does not add up — 5 overall against 1 + 1 + 5 —
and it is correct: Black Phoenix's own listing covers all three towns, so it is
counted in each. Checked rather than assumed.

### Verified in the running app

    manchester-nh  restaurants  cards=192  Manchester · 192 businesses
    manchester-nh  lawyers      cards=11   Manchester · 11 businesses
    manchester-nh  auto-repair  cards=88   Manchester · 88 businesses
    pelham-nh      lawyers      cards=0    Nobody here yet for lawyers

Rendered card counts, not headings.

## What is imperfect, and is OSM's data rather than ours

Some listings carry a category that is wrong because the OSM tag is wrong. A
few seen while checking: Kinne Electric Service and White Cap Construction
Supply are tagged as car repair or car parts and so sit under Auto Repair;
La Coupe Barber Shop's own OSM node carries a bakery's website. These were
confirmed against the live Overpass data — our mapping reproduces the source
faithfully, which is the correct behaviour for a compiled directory. A claim
corrects them, and that is what claiming is for.

This is a different thing from the `beauty` and `hardware` mappings fixed
earlier that day: those were OUR map guessing wrong every single time it fired,
which is a bug. A single mistagged node upstream is data.

Typecheck app 316 / server 87, unchanged. 29 OSM tests pass. Smoke 352
rendered, 0 threw.
