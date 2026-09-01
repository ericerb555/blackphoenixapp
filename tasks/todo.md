# Making the platform actually work — proposed plan

## The honest position

A great deal has been built here very fast, across many surfaces. Almost none of
it has been watched working. That is the gap between where we are and "the
platform functions correctly", and it is not a gap that more building closes.

The evidence for saying so is our own history. The design centre was blank for
hours because a variable was read eleven lines before it was declared. The
siding takeoff threw on first render because `useEffect` was never imported.
Both passed `vite build` cleanly, because esbuild strips types and never checks
them — it will happily ship a reference to a name that does not exist. Both were
found by you, using the app, rather than by me before shipping.

So the honest answer to "what do you suggest" is: stop guessing which parts
work, and build the thing that tells us.

## What I checked before proposing this

- **Your data is fine.** The live server writes to `kv_store_57095a78` — 1225
  rows, 436 pipeline items, 6 vendors, 4 quotes, 5 design projects. The
  similarly named `kv_store_3eae23a6` is an unused empty table; the naming is
  inherited from the function that was retired in August, which is why it looked
  alarming at first glance.
- **The crash-causing class of type error is currently absent.** A type check
  reports zero `Cannot find name` errors across `src/`. The specific bug that
  has bitten twice is not sitting in the tree right now. Nothing prevents it
  from coming back, though: there is no `tsconfig.json` and no typecheck script,
  so TypeScript has never actually run on this codebase.
- Of the 4789 errors that check did report, roughly 4400 are React's types
  failing to resolve in a throwaway config I wrote in five minutes. That number
  is my probe's fault and should not be read as 4789 defects.

## The plan, in the order I would do it

### 1. Retire the two orphaned backends  (~30 min, security)

`make-server-824f083c` and `make-server-12c91054` are still ACTIVE with live
customer data and no source in this repository. Both answered an unprivileged
test account: one returned `HTTP 200` on `/customers`, the other returned a 500
from `/invoices` that leaked an internal table name, meaning it queried the
database before checking who was asking. Retire them behind the same 410 stub
that `make-server-57095a78` already uses, archiving each under
`supabase/functions/_retired/` so either can be restored.

### 2. A smoke harness that renders every screen  (the main event)

One command that mounts every page and portal in headless Edge and reports which
ones throw, which render empty, and which log console errors. This is precisely
the check that would have caught the blank design centre before you did.

It is worth being clear about why this matters more than it sounds: right now
"does the platform work" is answered by you opening screens until one is broken.
This replaces that with a list, produced in a couple of minutes, before anything
ships.

### 3. Fix whatever step 2 finds

Unknown size — that is the point of running it. Ranked worst-first, and I would
bring you the list before starting rather than disappearing into it.

### 4. A real `tsconfig.json` and a `typecheck` script  (~1 hour + triage)

So the `useEffect is not defined` class cannot come back silently. Configured
properly this time, with React's types resolving, so the output is a short list
of real problems rather than four thousand phantoms.

### 5. Then kitchens and bathrooms

Detailed measurements, 3D CAD, photorealistic render and a cabinet schedule.
The largest thing asked for so far, and it deserves a proper plan of its own
rather than being started at the end of a long day. Doing it on top of a
platform we have actually verified is a much better position than doing it on
top of one we hope works.

## Todo

- [x] 1. Stub and archive `make-server-824f083c` and `make-server-12c91054`
- [ ] 2. Build the render smoke harness over every page and portal
- [ ] 3. Report the findings, ranked, and agree what to fix
- [ ] 4. Add `tsconfig.json` and a `typecheck` script; triage the real errors
- [ ] 5. Plan kitchens and bathrooms properly

## URGENT — deck photos do not survive a save

Reported while step 1 was in progress. Diagnosed, not yet fixed.

Photos are never stored with a deck project. The save payload in
`DeckDesigner.tsx:544` is `{ kind, model, site, loads, takeoff, ...link }` —
there is no photo field in it. So reopening a saved deck cannot show photos:
they were never written, rather than written and lost.

Three things compound it:

1. `JobFolder` clears its own list the instant Send is pressed
   (`setSorted([])`, JobFolder.tsx:56). The files pass through to the house
   capture step and the card empties.
2. The photos only ever existed as `File` objects read live from a folder on
   the machine, held in React state.
3. `hardReset()` calls `forgetFolder` on all three slots — `job-folder`,
   `job-photos`, `sketches` — and it runs on both Save-as-new and New
   (DeckDesigner.tsx:524, called at 552 and 674). So saving also drops the
   remembered folder.

### Proposed fix

- [ ] Store the picked photos against the project when it saves, and list them
      back when it opens. There is already a private bucket and an upload path
      for exactly this shape of thing in `design-links.tsx`.
- [ ] Stop `hardReset` forgetting the job folder on a plain save. Starting a
      genuinely new deck should forget it; filing the current one should not.

Not started — waiting on confirmation, and on one detail of what "cannot add
any" looks like on screen.

## The house, drawn from the photos and then editable

### What is actually wrong

The two ends both exist and nothing joins them.

`/analyze` already returns the house: `sillHeightInches`, `sidingType`,
`storeys`, and each wall with `widthFt`, `heightFt` and its openings, every
field carrying its own confidence. That result reaches the designer as
`houseRead` and is handed to the chat assistant. **No geometry reads any of
it.**

The house in the 3D view is invented from the deck:

    const wallW = model.widthFt + 16;
    const wallH = Math.max(12, model.heightFt + 11);
    const doorW = 6; const doorH = 6.7;
    const doorSill = model.heightFt + 0.1;

The wall is the deck plus sixteen feet. The door is a hardcoded six by six-eight.
And the sill is derived from the deck height, which is backwards from how the
job is actually done — the sill is what decides how high the deck sits.

### The approach, which is not a scanning problem

Scale comes from the sheet of paper in each photograph, and Eric corrects the
numbers by hand afterwards with a tape measure. Approximate-from-photos plus
operator correction is the design. So this is a wiring and editing job, not a
reconstruction one.

- [x] 1. A `house` record on the design project, saved beside `model` and
      `site`: wall width and height, storeys, siding type, sill height, and the
      openings with their positions and sizes.
- [x] 2. Seed it from the photo analysis, and keep the provenance per field —
      `from photos` against a typed `measured`, so it is always visible which
      numbers are a guess and which he stood in the yard and measured.
- [x] 3. An editable panel: every number a field he can type over. Typing a
      real measurement marks that field measured and it stops being overwritten
      by a later photo read.
- [x] 4. `DeckViewer3D`'s `House` draws from that record instead of inventing
      it — real wall length, real storey height, the door where the door is.
- [x] 5. Turn the sill relationship the right way round: deck height follows
      sill height, with an explicit override for when it should not.

### Revised: the house belongs to the project, not to the deck

Eric: "I should have the ability to add a partial or a full house view, which I
should be able to bring into the other sections in the design center."

That rules out hanging the house off the deck, which is what the plan above
quietly assumed. The house is the thing every trade works on — siding needs
every elevation and its openings, doors and windows need the opening schedule,
roofing needs the roof planes, kitchens and bathrooms need a room. Capturing it
once per trade would mean four descriptions of one building, free to disagree.

So the house is captured once, stored on the project, and read by whichever
trade tab is open.

**A house is a set of views, and it accumulates.** A view is one named piece —
"back elevation", "kitchen", "north gable". A partial capture is one view; a
full house is several. This matters because it matches how the work actually
arrives: a deck job needs one wall and nothing else, and being forced to
photograph an entire house to design a deck would be an obstacle rather than a
feature. Later, when the same customer wants siding, the remaining elevations
are added to the house that is already there rather than starting again.

What each trade takes from it:

| Trade | Reads |
| --- | --- |
| Decks | the one wall it attaches to, and its sill height |
| Siding | every elevation, with areas and opening deductions |
| Doors and windows | the openings, as the schedule |
| Roofing | the roof planes |
| Kitchens, bathrooms | one interior room view |
| Flooring | the room, for its floor area |

- [x] 6. Store the house on the project as a set of named views rather than a
      single elevation, so a partial capture is the normal case and a full house
      is what several partials add up to.
- [~] 7. Let every trade tab read it — the house is stored per project and the panel shows on every trade; the individual trades do not yet CONSUME it (siding areas, window schedule). Decks do., and let a trade say which view it is
      working on.

Not started — needs sign-off, because it changes what every deck in the design
centre is drawn against, and it is the foundation the other trades sit on.

## Model first, render once — the photoreal pipeline

### Why this exists

Two facts settle the design between them.

A render costs about twenty cents and a set of looks is three of them, so
iterating by rendering is the expensive way to work and also the slow one. And
a render produced by describing a deck in words is a fresh roll of the dice
every time — it cannot measure sixteen feet, it does not know where the ledger
lands, and asking again produces a different deck.

The 3D view is free and instant. So the work moves there, and the paid step
happens once, at the end, on a design that is already settled.

The prize is bigger than the cost saving. If the picture is generated FROM the
model it cannot get the size or the position wrong, because it is not deciding
them. The image model stops being an architect and becomes what it is actually
good at: lighting, materials and shadow.

### The pipeline

1. **Align the 3D camera to the photograph.** The photo sits behind the 3D view
   at half opacity and the view is orbited until the house edges line up. Done
   by hand on purpose — recovering a camera automatically from one photo is a
   research problem, and this is a job for the person already looking at both.
   Saved with the project, so it happens once per photo and never again.

2. **Render the deck alone, on transparency.** House, ground and sky hidden;
   only the deck and its shadow catcher. `DeckViewer3D` already runs with
   `preserveDrawingBuffer`, which is what makes the capture possible at all.

3. **Composite it onto the photograph.** At this point the geometry IS the
   model — right width, right height, right post spacing, stairs where the stair
   calculator put them. It will look like a drawing pasted onto a photo, which
   is exactly what it is.

4. **One paid pass, masked to the deck.** The composite goes to the image model
   with a mask of the deck's own silhouette, grown slightly so it can blend the
   edges and lay a contact shadow. The instruction is to change no shape and no
   position, only to make it photographic. The masking shipped today is the
   mechanism this relies on.

5. **Keep the aligned camera.** Re-rendering after a design change then costs
   one image rather than another alignment.

### Todo

- [ ] 1. Deck-only capture on a transparent background
- [ ] 2. Alignment view — photo behind, opacity slider, orbit to match
- [ ] 3. Persist the camera on the design project
- [ ] 4. Composite, and derive the mask from the deck silhouette
- [ ] 5. The photoreal pass, worded to forbid moving anything
- [ ] 6. Show the composite beside the finished render, so it is obvious what
      the paid step actually changed

### What could go wrong, said in advance

**The model may still move things inside the mask.** `input_fidelity: high` and
a prompt forbidding any change of shape both help, and item 6 exists so it is
visible when it happens rather than being found by a customer.

**Alignment is fiddly on a phone.** It is a desk job. The site visit captures
the photo; the alignment happens back at the office, which matches how the work
actually runs.

**A wrong camera produces a confidently wrong picture.** Worth checking that the
deck's base line sits on the ground plane in the photo before spending a render
on it.


## A returned quote, read and put against our scope  (done — 471a11cd)

A subcontractor sends a PDF on his own letterhead, or a photograph of
something handwritten from the van. A system that demands he fill in our form
gets routed around by email, and then the numbers live in an inbox while the
scope quietly goes out of date. So the system reads what they actually send.

- [x] `bidIntakeModel.ts` — the pure logic. 20/20 tests.
- [x] `bid-intake.tsx` — `POST /read`, staff only, reads text and images.
- [x] `BidIntakePanel.tsx` — paste, attach pages/photos, or a clip reduced to
      frames. Review the proposed matches, tick, apply.
- [x] Mounted on the scope screen, and only once something is out to bid.

### The three rules it is built on

1. **Proposed, never applied.** Every match arrives as a suggestion with a
   confidence and has to be ticked. An AI writing money into a customer quote
   on its own produces the worst kind of error — a wrong number nobody typed
   and nobody checked, in front of a customer with our name on it.
2. **Shown but unticked when unsure.** Below 0.7 confidence a match is
   displayed and left off. Hiding it drops work; ticking it prices it wrong.
3. **Report what did not match, both directions.** Their line fitting nothing
   of ours may be work we forgot to scope. Ours with nothing against it may be
   work they have not priced. Both matter more than the total, and both vanish
   if a reader only reports its successes.

It also checks their own arithmetic and says so when their printed total
disagrees with their own lines — that is a phone call, not something to absorb.

### Known limits, said plainly

- **Video is read as frames, not watched.** Four stills are pulled from the
  middle of the clip and those are what the model looks at. If the numbers are
  only spoken aloud, they will not be read. Numbers held up to the camera will.
- **A PDF has to be attached as page images**, not as the file itself.
- Several of their lines landing on one of ours **add** rather than overwrite,
  which is right for a plumber itemising rough and trim against one line of
  ours — but it means ticking the same reading twice would double it.

## Phase 4b — the scope goes out to bid  (DONE)

Decision taken: **a lines table**. Migration 012 tested on a throwaway branch,
then applied to production. The branch found a real hole — see below.

- [x] 1. `bidPackageModel.ts` — 48/48 tests.
- [x] 2. `BidPackagePanel.tsx` on the scope screen.
- [x] 3. Migration 012: `bid_request_lines`, `bid_line_prices`.
- [x] 4. Posts into the existing bid room as a draft.
- [x] 6. The dead `request-bids` stub now says what it actually did.
- [ ] 5. The subcontractor's side — pricing the package line by line in the
      portal. The schema is in place for it; the UI is not built yet.

### What the branch test found

The first version of 012 used `my_owned_bid_request_ids()` for the write
policies on `bid_request_lines` while its own comment claimed the rule was
owner/admin only. That helper is any active membership. So a **`viewer` of the
posting organisation could add lines to a package and change a quantity on one
already out to bid** — the quantity a subcontractor's price is computed from.
Fixed with a new `my_admin_owned_bid_request_ids()` helper, matching what 004
already says about who may put work out to bid. Retested: viewer refused all
three writes, still reads; owner can still do all three.

This is the second time a branch test has caught a real leak in the bid room —
003's comments record the first. The branch cost about four cents.

### What held under attack

Run as a poster, two rival electricians and an outsider, with RLS on:

- one provider reading a rival's per-line pricing — **0 rows**
- an *invited* provider reading a **draft** package's lines — **0 rows**
  (the exact leak class 003 caught on invitations)
- an outsider reading anything — 0 requests, 0 lines, 0 breakdowns
- pricing a rival's bid, attaching a price to another job's line, editing the
  scope you are bidding on, adding a line to it, deleting a rival's breakdown —
  all refused
- revising a breakdown after the request closed — refused; reading your own
  afterwards — still works
- qty of zero, negative qty, blank unit, invented confidence, duplicate scope
  line, negative price — all rejected by constraint
- deleting a line takes its prices and re-syncs the bid total; deleting a
  request takes everything

### The total is computed, never accepted

A trigger keeps `bids.amount` equal to the sum of the breakdown. Proven: a bid
submitted with a headline of **9999** and lines of 3000 + 2500 became **5500**
without anybody asking. A provider cannot submit lines that add to one figure
and a headline that says another.

### Original plan, for the record

### What is actually wrong

The two halves of the bid loop have never been connected.

The **design centre** holds the scope in KV: lines with a phase, a trade, a
description, a quantity, a unit and a `bidOut` flag. The **bid room** is a real
Postgres system with row-level security — `bid_requests`, `bid_invitations`,
sealed `bids`, and `bid_request_media` for photos and video. Both are sound.

Nothing carries the scope from one to the other. A bid request today is a title
and a free-text paragraph somebody retyped. Three costs follow from that:

1. **The sub prices a paragraph, so he pads it.** A number for the unknown is
   always larger than the truth, and we pay that difference on every job.
2. **What comes back has no relationship to our lines.** That is the whole
   reason the intake reader has to work as hard as it does.
3. **The award never lands where the money was spent.** A single bid amount
   against a paragraph cannot be attributed to the lines it paid for, so the
   scope stays provisional even after it has been priced by the person who is
   going to do the work.

There is also a dead stub — `POST /quotes/:id/request-bids` writes a row into
`quote_bid_requests:{id}` in KV that nothing reads and that never reaches the
bid room. It should be pointed at the real system rather than left to look
like a working feature.

### What this phase builds

Scope → package per trade → invitation → sealed bid → intake → back onto the
same lines. Closing that circle is the whole of it.

- [ ] 1. `bidPackageModel.ts` — pure logic. Group the `bidOut` lines by trade
      into one package each. Decide what a package must contain before it is
      fit to send: quantities on every line, the site, the phase each line sits
      in, and the hold points that constrain when the trade can work. Refuse to
      send an incomplete one and say what is missing.
- [ ] 2. A panel on the scope screen — the packages as they will be received,
      reviewed before anything goes out, with what is missing named per package.
- [ ] 3. Persist the lines onto the bid request (**the decision below**).
- [ ] 4. Post into the **existing** bid room. One `bid_requests` row per trade,
      invitations to the provider orgs for that trade. No second bid system.
- [ ] 5. Show the package on the subcontractor's side as a table rather than a
      paragraph, and attach the plan captures and site photos via the media
      table that already exists.
- [ ] 6. Repoint the dead `request-bids` stub at the real bid room.

### The decision I need before step 3

Where the lines live on a bid request. The bid room is Postgres with RLS and
the design centre is KV, so this is the join between them and it decides how
much the rest is worth.

**(a) Rendered into `description`.** No migration. The sub reads a formatted
list instead of a paragraph. But it is text — nothing structured comes back and
he still cannot price line by line.

**(b) A `bid_request_lines` table.** Migration 011 states the house rule
outright: *"A separate table rather than a jsonb column, because these rows
carry their own access rule and jsonb cannot be policied."* One row per line,
RLS inherited from the parent request. This is the option where the sub prices
line by line, what returns already matches our lines, and the award attributes
itself. Most work, and the only one that actually closes the loop.

**(c) A `scope jsonb` column.** Between the two. Cheaper than (b), and here the
access rule is genuinely the same as the parent row so jsonb is defensible —
but line-by-line pricing still needs more work afterwards.

Recommending **(b)**. It is what the codebase's own stated reasoning points at,
and it is the version that makes the intake reader mostly unnecessary for the
subs who cooperate while still catching the ones who send a photograph.

### Migration discipline

010 is deliberately unapplied and this must not become a reason to apply it.
Production currently has 001–006 and 011. Any new migration goes to a branch
first, RLS gets verified there — including that a provider invited to one
request cannot read another's lines — and only then to production.

## Review

(to be completed)
