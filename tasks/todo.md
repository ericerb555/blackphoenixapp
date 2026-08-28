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

---

# The deck lands on the wrong side of the house

Eric: "we are just trying to rebuild a deck and it built a deck on the wrong
side of the house — this is not going to work."

## What is actually wrong

Three separate defects, and the first one is the galling one.

**1. The right answer is worked out, then thrown away.**
`/house-capture/analyze` already returns an `attachment` object
(`house-capture.tsx:118-130`) whose very first field is
`"wallDescription": "which wall the deck would attach to, as seen"`, along with
`doorType` and `doorPresent`. The client then sends the render only
`house: analysis?.house || {}` (`HouseCapture.tsx:262`) — siding and trim
colours. **`attachment` never leaves the browser.** The system identifies the
correct wall and discards it before rendering.

**2. The render's only placement instruction is a hardcoded sentence.**
`house-capture.tsx:241`: `"Add a newly built residential deck attached to the
wall where the door is"`. A house has a front door, a slider, often a garage
and a bulkhead. Nothing says which, so the image model picks the most visually
obvious one — usually the front.

**3. Nothing in the system knows what a rebuild is.**
The prompt says *add* a new deck and *change nothing about the house*. Handed a
photo with an existing deck in it, the model keeps the old deck and puts a new
one somewhere else. There is no `existingDeck` concept anywhere in the codebase.
This is the one Eric actually hit, and it is not an edge case — see
`rebuilds-not-new-builds.md`; a renovation company mostly replaces things.

## Plan

### A. Stop discarding the wall
- [ ] Send `analysis.attachment` to `/render` alongside `house`
- [ ] Build the placement line from `wallDescription` and `doorType` instead of
      the hardcoded "where the door is"
- [ ] When the wall is unknown, say so in the prompt rather than guessing

### B. Let Eric state the wall, and override the read
- [ ] Show the wall the analysis chose, as editable text, so it is never a
      silent decision
- [ ] Typing a wall wins over the analysis — he is standing in the yard

### C. Rebuilds as a first-class case
- [ ] A "replacing an existing deck" toggle
- [ ] When set, the prompt says the existing deck is demolished and removed, and
      the new one is built in its footprint — which also fixes placement, since
      the old deck's position is the best evidence available
- [ ] Feed it to the analysis too, so it reports the existing deck's size

### D. A few looks to show a client — DONE, with one part refused

**Shape variants are not built, and should not be.** `DeckModel` is a single
rectangle (`widthFt` × `depthFt`) and the structural engine, the takeoff and the
permit drawings are all built on it. An L-shape, a wrap-around or a second level
cannot be represented, so rendering one would produce an image nothing
downstream could price or draw — the exact picture/quote disagreement this
section set out to avoid. Eric asked for layout variants; this is the one part
of that ask that cannot be delivered honestly without extending the model and
everything under it. Flagged rather than faked.

What the model *can* express, and therefore what varies: decking finish (12),
railing (7, and cable and glass are real geometry not colours), size, height,
stairs and board direction. Every look is a `Partial<DeckModel>` patch, so
"Use this one" moves the real model and the quote follows.
- [ ] Render 2–3 variants in one go — same house, same wall, same size, with
      different decking and railing combinations
- [ ] Show them side by side, each labelled with its materials, so a customer
      can be walked through the options
- [ ] Each variant is a separate image call, so note the cost: `gpt-image-1` at
      high quality is roughly 20¢ an image, so three looks is about 60¢ a go
- [ ] Keep the existing single render as the default and make variants a
      deliberate action, so nobody triples the bill by accident

## Decided

Eric wants variants to vary **materials and layout**, and wants **placement
fixed first** before any of D is built.

Layout variants carry a consequence that must not be left implicit: a
wrap-around or a bumped-out section is a different quantity of decking, framing
and railing, so the quote no longer matches whichever image the customer picks.
When D is built, choosing a layout has to either update the deck model and
reprice, or be labelled on its face as changing the price. A pretty picture that
silently disagrees with the quote is the same class of problem as a quote priced
from figures nobody set.

---

# Scope: wrap-around and L-shaped decks

Not a plan to execute yet — this is the estimate Eric asked for.

## The good news first

`buildMembers(m)` in `deckModel.ts` is a real single source of truth, and its
own comment says so: *"This is the single place framing is decided. Every view
renders whatever this returns, so none of them can drift from the others."*
That holds up — 13 call sites, and the 3D viewer, the framing plan, the takeoff,
the quote and the permit packet all go through `buildMembers` or `takeoff`.

More importantly, `Member` is **already shape-agnostic**. It is a positioned box
— `pos`, `size`, optional `rot` — with a `kind`. Nothing about it assumes a
rectangle. So the 827-line 3D viewer and the framing plan canvas largely come
along for free: give them members for an L-shaped deck and they draw an L-shaped
deck.

This is the difference between a rewrite and an extension. It is an extension.

## Where the rectangle is actually baked in

Two kinds of problem, and only the second is hard.

**Scalars that assume one rectangle.** Each is a line or two, but they are
load-bearing and they leak into the permit set and the price:

| what | where | why it breaks |
|---|---|---|
| `deckArea = widthFt * depthFt` | `deckModel.ts:614` | area of an L is not w×d |
| `joistSpanFt = depthFt - cantileverFt` | `deckModel.ts:627` | an L has a span per section |
| decking area, `widthFt * depthFt` | `deckQuote.ts:159,225` | under-orders boards |
| ledger fasteners and flashing by `widthFt` | `deckQuote.ts:218,219` | a wrap-around has ledger on two walls |
| `tributary`, span checks off one scalar | `deckStructural.ts:137,152` | code check must run per section |
| viewport bounds, house wall drawn full width | `FramingPlanCanvas.tsx:43-63` | wrong bounds, wrong wall |

**The genuinely hard part: the framing engine and the outline.**
`buildMembers` is ~450 lines that lay one ledger along the wall, one beam line at
`depthFt - cantilever`, and joists in one direction. Two things get difficult:

1. **The interior join.** Where two sections meet there is no rim joist, no
   railing and no post line — but there usually is a shared beam, and the joists
   of one section often bear on it. Getting this wrong produces a deck with a
   railing running through the middle of it, or a beam missing where the load
   actually is. This is the real work.
2. **The railing outline.** Guard currently runs the perimeter of a rectangle.
   For an L it has to run the perimeter of a polygon, minus the house-attached
   edges, minus the join. That is genuine geometry, and it is what an inspector
   looks at.

## How I would represent it

**Sections, not polygons.** `DeckModel` grows a list of rectangular sections,
each with its own size, its own joist direction, and which of its edges meet the
house.

Rejected: a general polygon footprint. It is more flexible and much worse here,
because framing an arbitrary polygon means choosing joist direction and beam
lines per region anyway — and, decisively, **DCA 6 span tables only apply to a
rectangular framed bay**. Keeping every section a rectangle keeps each one
inside the prescriptive tables, which is what lets this print a permit set
without an engineer's stamp. A polygon model would push most decks out of
prescriptive design, which is a much bigger problem than a missing shape.

Sections also match how a builder describes it — "16 by 12 across the back, then
10 by 8 wrapping round the side" — and multi-level later is just an elevation
per section.

## Phases, honestly sized

**1 — Model and framing engine.** Sections in `DeckModel`, `buildMembers`
emitting per section, shared-edge handling, polygon railing outline. *The bulk
of the work, and where all the risk is.* Everything else is small by comparison.

**2 — Scalars.** Area becomes a sum, joist span becomes the worst section,
ledger run becomes the total house-attached edge. Touches `takeoff`,
`deckQuote`, `deckStructural`, `deckAnnotations`. Mechanical once phase 1 gives
the right members.

**3 — Drawings and bounds.** `FramingPlanCanvas` bounds from sections rather
than `widthFt`; permit packet dimensions each section. `DeckViewer3D` and
`DeckScenery` need their camera framing and ground plane checked, but should not
need structural change.

**4 — A way to enter the shape.** Recommend **preset shapes with dimensions**
— straight, L-left, L-right, U, wrap-around-corner — rather than a drag editor.
Presets cover the overwhelming majority of real jobs, are far cheaper, and
cannot produce a shape the framing engine has never seen. A freeform editor is a
separate project and would want phase 1 proven first.

**5 — Renders and looks.** Once the model holds a shape, `renderPrompt` can
describe it, and layout variants become honest — a wrap-around render would
correspond to a deck that prices and draws.

## What I would want agreed before starting

- **Presets or freeform** for entering the shape. I recommend presets.
- **Multi-level in or out.** Out, for now — it is a second elevation per section
  and it drags stairs between levels in with it.
- **Backwards compatibility.** Every existing saved deck is a single rectangle.
  A one-section model must behave byte-identically to today, and that is worth a
  test before anything else is built, because every deck already quoted goes
  through this path.

---

# Plan: show a customer what we designed, for any trade

Eric: "we should be able to use it for decks kitchen bathrooms everything
really."

## The good news: the storage layer is already trade-agnostic

Nothing here needs a new backend model.

- `/design-links/attach` keys designs as `design_project:${ownerKey}:${id}` and
  `ownerKey` is already a parameter — it merely *defaults* to `"decks"`.
  `kitchens`, `bathrooms` and anything else work the day a designer exists.
- `/design-links/files` takes `label`, `category`, `dataUri`, `customerId`,
  `jobId`, `designId`. Not one deck-specific field. Its own comment says it
  takes a data URI because "everything the design centre produces is generated
  in the browser — a permit packet PDF, a captured drawing, a render."
- `/my-files` resolves the customer **from the signed-in session**, never from a
  parameter, and re-checks ownership before handing out a URL.

So this is wiring, not construction. Only `DeckDesigner` exists today, but it is
the one to wire, and the pieces are generic.

## The thing that must be fixed before any of it ships

**Filing a document currently makes it customer-visible, and there is no way to
file one that is not.** The record written by `/files` has no
`sharedWithCustomer` field, and `/my-files` returns everything matching the
customer id.

Today that is invisible because `/my-files` is dead code — nothing calls it. The
moment the portal section in phase C exists, **every document ever filed becomes
customer-visible retroactively**, including anything staff put through
ProjectLinkPanel's "Add a file" as internal working material. Turning the
feature on is what creates the exposure, which is exactly the kind of thing that
is easy to ship without noticing.

So phase A is not optional and not last.

## Plan

### A. Sharing is explicit, and it fails closed
- [ ] `sharedWithCustomer: boolean` on the file record, default **false**
- [ ] `/my-files` returns only records where it is `true` — a record without the
      field is treated as not shared, so everything already filed stays hidden
      rather than being revealed by the upgrade
- [ ] A staff-only route to share and un-share one document
- [ ] The staff folder view shows which documents the customer can see, because
      "who can see this" is not something to keep in your head

### B. One "Share with the customer" action, used everywhere
- [ ] A small component taking `{ label, category, dataUri }` and the design's
      customer — nothing about decks in it
- [ ] Wire it to the render, to each of the three looks, and to the permit
      packet and calculation sheets
- [ ] Fix the dangling wire: `ProjectLinkPanel` exposes `fileDocument` through
      `onFilerReady` and **nothing in `DeckDesigner` consumes it**, which is why
      filing anything today means download-then-re-upload

### C. A Designs section in the customer portal
- [ ] Reads `/my-files`, grouped by design and job
- [ ] Images shown as a gallery — this is the point, the customer sees the three
      looks side by side rather than an emailed attachment
- [ ] PDFs listed as documents
- [ ] **Built to match the existing portal, not restyled.** `PortalDocumentVault`
      is the pattern to copy — same layout language, same accent handling. The
      portals keep their design unless Eric asks otherwise.

### D. Beyond decks
- [ ] Pass a real `ownerKey` per trade rather than letting it default
- [ ] Portal groups by trade so a customer having a kitchen and a bathroom done
      sees two folders, not one pile
- [ ] Nothing else — B and C are already trade-agnostic, and a kitchen designer
      built later files through the same route with `ownerKey: 'kitchens'`

### E. Tell them it is there
- [ ] A document shared with nobody notified is a document nobody opens
- [ ] Reuse whatever the portal already uses for messages rather than inventing
      a second notification path

## Decided

**The customer can pick a look**, and **both** email and a portal message go out
when something is shared.

### A choice is a preference, not an acceptance

This is the part to get right. A customer clicking "this is the one" is saying
which deck they like, not agreeing a price. Quote acceptance already exists on
its own tab with its own record, and the two must not blur — a picture picked in
a portal that later reads as agreement to a figure is the sort of thing that
ends in an argument on a doorstep. So:

- The choice is recorded against the design, not against a quote
- Nothing about it changes a quote's status
- The wording says liked, preferred, chosen — never accepted or approved
- It can be changed as often as they like, and the latest one wins

### G. The customer photographs and renders their own house

Eric: "the customer should be able to take picture and render there own house to
add to there folders to use and build or rebuild decks."

**A cost hole exists today, and it is not created by this feature.**
`house-capture.tsx:51` is `app.use("*", requireSignedIn)` — *signed in*, not
*staff*. Every portal customer, vendor, subcontractor and tenant with an account
can already call `/render` and `/looks`. There is no quota, no rate limit and no
per-account ceiling on a route that spends roughly 20¢ an image and 60¢ for a
set of three. A loop against it is a bill.

That has to be closed whether or not customers ever get the button, and it must
be closed *before* the button exists, because the button is an invitation.

- [ ] A per-account render budget, counted on the server, refusing past the
      ceiling. Never a client-side check — the client decides nothing that
      spends money
- [ ] A sensible free allowance per customer, then a clear "ask us" message
      rather than a silent failure
- [ ] Staff are not limited the same way

**Filing.** `/design-links/files` is `requireStaff`, so a customer cannot put
anything in their own folder today.

- [ ] A customer-scoped filing route that writes only to the caller's own
      folder, resolved from the session and never from a posted customer id
- [ ] Something the customer made is theirs to see, so it is shared by default
      — but marked as customer-created, so staff can tell at a glance which
      documents came from which side

**The screen.** A capture panel in the portal, matching the portal's existing
design rather than restyled.

- [ ] Photograph or video the house, same as the staff tool
- [ ] Render, and it lands in their folder
- [ ] Enough framing that a customer understands this is a sketch to talk about
      and not a quote

### F. Let the customer choose
- [ ] Each shared look carries an id the customer can select
- [ ] The choice is stored against the design with a timestamp
- [ ] Staff see which one was picked, and when
- [ ] Picking one offers — never applies automatically — the matching patch to
      the deck model, so the quote follows a decision a person made

---

# Capturing the real house: what HOVER does and does not give us

## HOVER covers the facade and not the ground

Read off the JSON measurement schema (`summarized_json`, `full_json`,
`sketch_json`, `paint_measurements`):

**Gives us** — roof facets and pitch, ridges, valleys, rakes, gutters; facades
broken out by material (brick, stucco, siding) with area and `openings_total`;
`windows` and `doors` arrays with `width_x_height` and area; `walls_area`,
`ceiling_edges`, `floor_edges`, `max_ceiling_height`.

**Does not give us** — any elevation, grade, terrain slope, foundation height,
story height or **sill height** field. They are absent from every schema.

For a deck that is exactly half the problem solved:

| what a deck needs | HOVER |
|---|---|
| which wall, and how long the ledger can run | yes — facade areas and edges |
| siding type, for the right flashing | yes — facades by material |
| window and door sizes to clear | yes — openings |
| **door sill height above grade** | **no** |
| **ground slope across the footprint** | **no** |

Those two absent numbers are precisely the two that `house-capture`'s analysis
already flags as guesses (`sillConfidence`, `dropConfidence`). Sill height sets
the deck surface — get it wrong and the deck steps up into the door. Slope sets
post lengths and footing depths.

So HOVER removes the guessing about the *house* and removes none of the
guessing about the *ground*.

## "Photo and video tech that gives exact measurements"

**What we have is estimation, not measurement**, and it says so itself. The
analysis prompt derives dimensions from known-size references — a door is 80in,
a brick course 2.67in, siding courses 4–8in — and instructs: *"assume every
number you give is an estimate to be checked with a tape."* The floor-plan video
route is a stub that returns "Video processing not yet implemented."

**The physical limit worth understanding:** a single moving camera cannot
recover absolute scale. Structure-from-motion reconstructs shape up to an
unknown scale factor, so every photogrammetry pipeline needs a scale source:

- a known reference in frame (what we do now, and the weakest)
- **phone IMU/ARKit motion** — gives true metric scale, typically 1–3% on short
  spans
- **LiDAR** on a Pro iPhone — direct metric depth, accurate but only to ~5m, so
  ideal for a sill height and poor for a whole house
- survey equipment — exact and not a phone

So "exact from photos alone" is not a thing that exists, for anyone. Exact from
*photos plus a scale source* very much is.

## Where that leaves it

The last mile — sill height and grade drop — is faster and more accurate with a
tape and a laser level on a site visit than with any camera pipeline, and a £30
laser measure beats a $999/year subscription for those two figures. That is not
a reason to skip capture; it is a reason to be honest about which numbers come
from where.

The system that would actually meet "every house, first time":

- [ ] Facade geometry from a real capture (HOVER, or photogrammetry) —
      replaces the invented box wall in `DeckViewer3D`
- [ ] Sill height and grade captured deliberately: LiDAR/ARKit where the phone
      has it, otherwise two prompted numbers someone typed after measuring
- [ ] The model records **where each number came from** and never presents a
      guessed one as measured — the same discipline the quote repricing already
      applies to money
- [ ] Render from the CAD scene once the house is real; the photo render becomes
      a cross-check

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
