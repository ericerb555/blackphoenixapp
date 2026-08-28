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
- [x] Deploy the edge function (`make-server-3eae23a6`; the slug is not `server`,
      and `config.toml` holds the `.tsx` entrypoint mapping)
- [x] Confirm it boots — both routes answer, rejecting an anon key with
      "Sign in required" rather than failing to start
- [ ] Generate a real quote in the running app and read the summary off the
      screen. Needs a signed-in session, so this one is Eric's to do.

---

# Videos in the deck builder

Eric: "I am trying to upload a video for the deck builder and it doesn't allow
me to upload videos." He asked for them to go to the `project-videos` bucket.

**They should not.** The deck designer never uploads video by design — it decodes
the clip in the browser, takes up to six frames, and posts only those. The
endpoint behind it hard-requires images (`house-capture.tsx:55` matches
`^data:(image/...)`), so a video in a bucket would be a file nobody reads.
Storing the clip is a separate feature; he chose not to do it now.

## The gates, and the fix for each

- [x] **Empty MIME type is silently dropped.** `HouseCapture.fromFolder` filters
      on `file.type`, and the File System Access API frequently reports `''`
      for `.MOV`/`.avi`. Matches neither filter, discarded with no message.
      → new `isVideoFile`/`isImageFile` in `localFolder.ts` fall back to the
      file name when the browser gives no type; anything matching neither now
      says so instead of vanishing
- [x] **Same silent drop in `LocalFolderPicker`**, which then says "No photos in
      that folder" — wrong twice over
- [x] **Container allowlist too narrow.** `localFolder.ts:102` listed only
      `mp4|mov|m4v|webm|avi`; now also `.mkv .mts .m2ts .3gp .3g2 .mpg .mpeg
      .wmv .flv .ogv .ts`. Being generous is safe — an undecodable file is
      caught later by `framesFromVideo`, which explains itself
- [x] **A success toast that lies.** Frames sliced away by `MAX_PHOTOS` while
      reporting success. Now refuses up front with a reason, and clips are
      taken *before* stills, since the panel itself says a walking video is the
      most useful thing to capture and arrival order was discarding it
- [x] **`jobFolderSort` routes a video to the drawings pile** when the type is
      empty and the name contains "framing", "plan" etc. Now tested by name too
- [x] **The codec error blames the container.** Replaced "Try an MP4 or MOV"
      with the actual cause and the setting that fixes it (iPhone
      Camera → Formats → Most Compatible)

## Not doing now

HEVC/H.265 transcoding. Chrome on Windows cannot decode it at all, so an iPhone
clip in H.265 will still fail — with an honest message rather than a misleading
one. Fixing it properly means transcoding, server-side or via WebAssembly.
Flagged to Eric, deferred by choice.

## Review

### Pricing standards (F)

Shipped as `5c57a89e` and deployed to `make-server-3eae23a6`. The rates and
markups now exist server-side in `pricingDefaults.ts`, so quotes stop coming
back near-zero. Anything priced from them is marked `standard`, not `your-rate`,
and the summary reports `confidence` and `onYourFigures` separately so a quote
priced from a standard table cannot read as Eric's own figures.

Running it turned up two things reading the code had not:

1. The standards caveat only printed above 80% confidence, and real quotes land
   in the middle band — so the one sentence protecting against overclaiming was
   the one that almost never appeared.
2. `pricing-config/get` returning standards instead of `null` made the client
   overwrite markups held only in localStorage, which is where they all lived
   until the server copy was added the commit before.

**Not verified:** the routes require a signed-in session, so the summary has not
been seen rendered on a real quote. The function boots and both routes answer;
the payload itself is unconfirmed.

### Videos in the deck builder

Eric asked for videos to upload to `project-videos`. They should not, and doing
it would not have fixed anything: the deck designer deliberately never uploads
video, it decodes the clip in the browser and posts up to six still frames.
`house-capture.tsx:55` hard-requires `data:image/...`, so a stored video would
be a file nobody reads. Told him, and he chose to fix the reading instead.

Four of the six gates were the same bug wearing different clothes — testing
`file.type.startsWith('video/')` when Windows hands back an empty type through
the File System Access API. Two of the six failed **silently**, which is why it
read as "the app won't take videos" rather than as an error.

Verified by running the predicates and the sorter against twelve filename/MIME
combinations, including the trap where `deck framing walkaround.MOV` with no
type was being routed to the drawing reader. All pass.

**Not verified:** none of this has been exercised in a real browser with a real
video file. The logic is tested; the screen is not.

**Still broken on purpose:** an iPhone recording in "High Efficiency" is H.265,
which Chrome on Windows cannot decode at all. It now fails with an honest
message naming the camera setting that fixes it, but it still fails. Real
support means transcoding — server-side or WebAssembly — and Eric deferred it.
