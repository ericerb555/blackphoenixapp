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

- [x] 1. Deck-only capture on a transparent background
- [x] 2. Alignment view — photo behind, opacity slider, orbit to match
- [x] 3. Persist the camera on the design project
- [x] 4. Composite, and derive the mask from the deck silhouette
- [x] 5. The photoreal pass, worded to forbid moving anything
- [x] 6. Show the composite beside the finished render, so it is obvious what
      the paid step actually changed

### Built — 57/57 tests

**The mask semantics are inverted and it matters.** `images/edits` edits where
the mask is TRANSPARENT and preserves where it is opaque. So the deck becomes
alpha 0 and the whole photograph around it becomes alpha 255. Backwards, it
repaints the house and leaves the deck a drawing — plausible enough a mistake
that the test asserts both directions explicitly.

The silhouette is grown a few pixels, because a mask cut exactly to the geometry
leaves no room to blend an edge or lay a contact shadow, and a deck with no
shadow reads as pasted on however good the materials are. Dilation is separable,
so it costs pixels rather than pixels × radius.

**A camera is tied to the photograph it was aligned against.** Reusing one on a
different photo blocks, because it would place the geometry precisely where it
belonged in a picture nobody is looking at — confidently wrong, which is worse
than obviously wrong.

**The prompt removes decisions rather than describing a deck.** Four DO NOTs
before any DO, ending "if you are unsure whether a change is allowed, do not
make it". A test asserts it never contains a dimension in words — the moment it
does, it is deciding geometry again.

The constraints are assembled **on the server**. The client has its own tested
copy so the operator can see what will be sent, but a prompt arriving over the
wire is one somebody can shorten, and a shortened one brings the wandering deck
straight back. Rendering with no mask is **refused** rather than quietly
downgraded — that path is an unconstrained edit of the whole photograph.

### Before it spends the money

Blocks on: no photo, no capture, no camera, a camera from another photo, or an
empty capture. Warns on a deck under 2% of frame (little to work on) or over
60% (no house left for context).

### The comparison is the check

The composite and the render sit side by side. If the model moved something
inside the mask, that is how it gets caught here rather than by a customer.
Item 6 existed for exactly this and it is the part worth actually using.

### Not verified

Nobody has run a real render through this. The mask maths, the gates and the
prompt are tested; what the image model does with a correct mask and that
wording is an empirical question and costs about twenty cents to answer.

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
- [x] 5. The subcontractor's side — pricing the package line by line.

### The sub's side, and why blank is not zero

The existing bid form was repaired rather than duplicated. When a request has
lines it prices them row by row and the total is the sum of what he types;
there is no separate headline field for it to disagree with. When it has none —
every request posted before 012 — it behaves exactly as it did.

The distinction the whole screen turns on: **a blank is not a zero.** A line he
left empty is a line he has not priced. A line he typed `0` into is one he is
including at no extra charge, which is a normal thing for a trade to do.
Collapsing the two would turn every line he skipped into a promise to do it for
nothing, and he would find that out on site.

So blanks are counted and reported in both directions — he is warned before he
submits, and the poster sees `3 of 11 lines not priced — this total does not
cover the job` against that bid. Two totals are only comparable if they cover
the same work, and a provider who left three lines blank looks cheapest right
up until the change order.

### 7. The won bid comes home  (done)

`AwardedBidsPanel` reads the bids we awarded on this design project and puts
each returned price back onto the scope line it was quoted against. Nothing is
matched or guessed — the identity was carried the whole way round, which is the
entire reason the package went out as rows.

It is a button rather than automatic, on purpose. Awarding is a decision about
*who does the work*; putting his price on our quote is a second decision, and
doing it silently would mean a customer-facing figure changing because somebody
clicked Award on another screen.

Both return paths — the bid room's own and the reader that handles a quote
arriving as a photograph — now share one `priced()` helper, because a price is
worth the same whichever way it travelled and should not land differently
depending on the route.

### The whole loop, driven on a branch

Posted a three-line electrical package against design project `dp_kitchen_1`,
as the real roles under RLS, running the same statements the screens run:

| step | result |
|---|---|
| Sub A prices all three lines, headline 11000 | stored as **7400** — the sum |
| Sub B prices two, skips the panel upgrade, headline 9999 | stored as **4700** |
| what the poster sees against Sub B | *1 of 3 lines not priced — this total does not cover the job* |
| award Sub A, then read it back | `sl_rough` 3200, `sl_fix` 1800, `sl_panel` 2400 |

That middle row is the point of the whole feature. Sub B sorts to the top as
**lowest** and is $2,700 cheaper, and he is not quoting the same job. Before
this, the two numbers were indistinguishable.

Sealing after the award also holds: the loser cannot read the winner's
breakdown *or his total*, the winner cannot read the loser's, neither can
revise a price once the request is awarded, and both can still read their own
for their records.

### Still not verified

Nobody has clicked these screens in a browser. Every statement the screens issue
has been run against a real database as the real roles, and the logic is at
81/81, but the DOM path — the inputs, the buttons, the toasts — has only been
proven to render, not to be driven.

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

## Phase 5 — the walkthrough

### Why this matters more than it looks

`scopeModel`'s own header says it: *"A figure worked out at the desk and one
confirmed on site are both useful, and letting them look the same is how an
indicative number becomes a fixed price."* The confidence field exists to keep
them apart.

Then `confirmAll()` marks every line confirmed with one click, defending itself
on the grounds that *"the walk is one event: somebody stood in the room and
looked."* That is true about the visit and false about the measuring. Nobody
measures forty lines. Standing in a kitchen tells you the cabinet run and
teaches you nothing about the joist spacing under the floor, and a button that
promotes both is the exact failure the field was added to prevent.

So the walk stops being a checkbox and becomes a sheet.

### What a walkthrough is actually for

Three things happen on site, and only the first is about numbers:

1. **Confirming or correcting quantities** that could only be estimated from
   photographs.
2. **Finding what was not there to see** — the surprise behind the wall. This is
   the real reason to go, and a screen that can only tick off things already
   listed cannot capture it.
3. **Recording conditions that cost money and are not quantities** — access,
   parking, stairs with no lift, an occupied house, working hours, pets, where
   the panel is. These are what a subcontractor pads for when nobody tells him.

### What it feeds

- **The scope** — per line, provisional becomes confirmed, carrying what was
  actually measured rather than a flag.
- **The bid packages** — a package sent before the walk is marked provisional on
  the sub's copy; after it, confirmed, and he can price tight instead of
  guessing. Already wired: 012 carries `confidence` per line.
- **A bid already returned** — if a quantity changes *after* a subcontractor has
  priced it, his number was for a different job. That has to be said out loud,
  not absorbed.
- **The quote** — built on confirmed quantities it is a price; on provisional
  ones it is an estimate. `confidenceNote` already draws that line.

### Todo

- [x] 1. `walkthroughModel.ts` — 40/40 tests.
- [x] 2. Per-line confirmation carrying the measured figure.
- [x] 3. Discoveries — a line added on site, arriving already confirmed.
- [x] 4. Warn when a correction moves a quantity a sub already bid against.
- [x] 5. Site conditions, carried onto the bid packages.

### Three verdicts, not two

The distinction that keeps this honest:

| | what it claims | what happens to the line |
|---|---|---|
| **Measured** | a tape went on it | quantity can change, confirmed, basis says *measured on site* |
| **Looked, agreed** | content with the desk figure without measuring | confirmed, number unchanged, basis says *accepted without measuring* |
| **Not looked at** | nobody was there | untouched — still provisional, because it still is |

The middle one is the point. It is a real confirmation and a different claim
from a measurement, and six weeks later the basis on the line says which. The
old single button collapsed all three.

`confirmAll()` is kept and marked superseded rather than deleted, so nothing
that has not moved over breaks. The "mark the rest as looked at and agreed"
link does what the old button did, honestly labelled.

### What a correction does downstream

If a measured quantity moves on a line that already carries a returned bid, the
sheet says so in red and names the difference per line: *"Frame wall 100 → 130
(+30)"*, with *his price was for a different job — settle it with him rather
than absorbing it.* Lines nobody has priced can change freely and raise nothing.

### Conditions travel

Twelve of them, each carrying why it costs money. They are appended to the bid
request description, so a subcontractor is told about the missing parking and
the full panel instead of discovering them on the first morning and padding
every job afterwards.

### Persistence

`walkthrough` is threaded through all three save paths, all three dependency
arrays, the reset, the unpark-restore and the project open — read tolerantly,
so a project saved before this existed still opens.

Typecheck caught five errors while wiring that up: the field added to the wrong
interface, then three session constructors missing it. Every one of them would
have compiled fine and thrown at runtime.

## Phase 6 — framing details, and getting them approved

Eric: *"framing details that we can submit to out archetechs for approval or
changes"* … *"maybe a portal i am not sure how that would work"* … *"yea i think
link is the best for now"*.

### What makes this a submittal rather than a printout

An architect cannot review a number without knowing what it assumed. So every
member on the schedule carries the check that justified it — span, load,
utilisation, deflection ratio — and the assumptions are stated once at the top:
loads, species and grade, deflection limit, code edition.

The calculation already exists and is real. `structureModel.checkMember` does
bending as M = wL²/8 against section modulus and deflection as 5wL⁴/384EI
against L/240, and `deckStructural.computeStructural` does soil bearing and
frost depth. This phase does not invent engineering — it presents what is
already computed in a form somebody can stamp or argue with.

It also carries the **open questions**: what we could not determine and want a
ruling on. A submittal with no questions is a brochure.

### The link, and why it is built more carefully than the one we have

The existing quote share link is `crypto.randomUUID()` with the dashes stripped,
stored in plaintext, with no expiry and no way to revoke it. That is 122 bits
and it is fine for a quote the customer already has. It is not the standard for
a construction document going to an outside firm.

This one:

- **256 bits** of `crypto.getRandomValues`, base64url.
- **Stored as a SHA-256 hash, never in plaintext.** If the store leaks, the
  tokens in it do not work.
- **Expires**, server-enforced, and can be revoked.
- **Serves a snapshot, not the live project.** Submitting for approval means
  submitting a specific revision — and it means a project that later gains
  something sensitive cannot leak it through a link issued today.
- **Carries no money.** No labour rate, no margin, no customer quote. The
  payload type has no field for it, the same way `PackageLine` has none.
- Read-only plus exactly one response. The architect cannot edit the document.

### Todo

- [x] 1. `framingModel.ts` — 68/68 tests.
- [x] 2. `architect-review.tsx` — issue, read by token, respond, list, revoke.
- [x] 3. `FramingSubmittal.tsx` — build it, send it, watch the state.
- [x] 4. `ArchitectReview.tsx` — the page they open, public route.

### The leak test is the one that matters

`architectView()` rebuilds the payload field by field rather than spreading the
submittal, and the server re-filters it on arrival. The test plants
`labourRate`, `margin`, `customerQuoteTotal`, `internalNotes` and `bidAmounts`
on a submittal as though somebody had added them later, and asserts none of
them reach the view — plus a planted field on a *member*, and that the view is a
copy rather than a window onto the live document.

A spread would have been shorter and would have leaked every one of them.

### The schedule is derived, never retyped

`submittalFromDeck` takes the sizes from the model somebody drew and the loads,
post load, soil and frost depth from `computeStructural`. Joists span the depth,
the beam spans post to post at half the deck depth tributary — stated on the
sheet, because a reviewer cannot check anything without knowing which way the
framing runs.

What the calculation could not settle becomes an **open question** carrying what
we assumed meanwhile and what moves if that is wrong, rather than an absence. A
member with no calculation is shown as *not calculated*, never given a plausible
figure.

Eric's standing details ride on every submittal: 4x4 posts are not notched, and
post bases take a 1/2in drop-in anchor rather than a cast-in J-bolt. Stated as
what we do, so a reviewer does not return a detail we do not build.

### Note on the smoke run

Touching the router made the affected set all 331 pages. That run reported 1
page unread; a control run on the **unchanged** tree reported 4, and different
ones. It is batch-timing flakiness in full-run mode, not a regression — zero
threw in both. Worth knowing before the next full run is read as a failure.

`smoke.html` is written by the harness on every run and was untracked; now
ignored rather than committed.

### Reported, not fixed

The quote share link's weaknesses above are a separate feature touching customer
money flows. Named here rather than widened into this change.

## Phase 7 — permits and variances

The open decision is settled: **it asks, never guesses.** A town record Eric
fills in once, reused on every job there afterwards.

The option not taken was shipping every local ordinance pre-loaded. It works on
day one and rots in silence — towns amend, a figure right when written is wrong
after the next town meeting, and nothing announces it. A wrong setback in a
filed drawing costs a reputation with a building department, and it would be
his rather than the software's.

### The rule the whole thing turns on

**Unknown is not compliant.** A setback nobody entered reads as *not known*,
never as a pass — in the type, in the check, and on the screen. That is the
entire integrity of the choice: the system knows only what somebody told it, so
its silence has to mean silence rather than approval.

`complianceNote` refuses to read as approval while anything is unchecked:
*"Nothing broken among the 4 rules that could be checked, but 3 could not be —
that is not the same as passing."*

And an unknown says **which kind** it is, because the two are fixed by different
people: *"the rear setback for Salem has not been entered"* against *"nobody has
measured how far this sits from the rear lot line."*

### Honest about its own age

Every record carries where the figure came from — read off the ordinance,
confirmed at the counter, told over the phone, or assumed — and when. Past two
years it says so and suggests a call. A record marked *assumed* says plainly:
do not file on it.

### Variances

The five statutory tests a New Hampshire board applies, from RSA 674:33 I(b),
carried verbatim because the board reads them out and takes each in turn. Each
one also carries what the board is actually weighing, and the hardship test
carries the trap applications fail on: *a hardship about the owner rather than
the land does not qualify.*

Relief sought is derived from what actually broke — *"20 ft required, 18 ft
proposed — 2 ft of relief"* — rather than typed. A one-word answer to a
criterion is called a fragment, because boards continue applications for that.

`criteriaFor()` returns **null** for any state but NH rather than offering the
wrong five. That is the same discipline as the rest: better to say we do not
carry it than to be confidently wrong.

- [x] `jurisdictionModel.ts` — 55/55 tests.
- [x] `jurisdictions.tsx` — the record, staff-only, stored per company so the
      twenty minutes on Salem repays itself on every Salem job.
- [x] `PermitCompliance.tsx` — beside the permit packet in the documents stage.

### Note

`formsUrl` is restricted to http and https on the server. It is a link the whole
company clicks, and a `javascript:` scheme stored in a shared field executes for
other people.

Three multi-line edits silently did not apply because the file is CRLF and the
patterns used `\n`. Typecheck caught all three. Worth remembering: on this
repo, script-driven multi-line edits need `\r\n` or the Edit tool.

## Phase 9 — the remaining trades

The listed scope was: gazebo, pergola, tile, sheetrock, framing, foundation,
roofing, additions as composite, furniture. Surveying first changed what was
worth building.

### What was already there

`flooringModel` takes floors off properly — materials, tile layouts, waste,
carpet rolls. `structureModel` already does the engineering for any roofed
outdoor structure: snow, rafter sizing, beam sizing, post loads. `framingModel`
came in with Phase 6. So three of the nine were already covered and building
them again would have produced a second set of numbers to keep in agreement
with the first.

### What was actually missing — walls and ceilings

Nothing took off the other five surfaces in a room. That is most of a sheetrock
job and nearly all of a bathroom gut, where the wall tile costs more than the
floor tile and takes longer to set.

`surfaceTakeoff.ts` — one model, three trades, 59/59 tests. Sheetrock, wall
tile and paint disagree about materials and agree completely about geometry, so
three models would be three chances to compute the same square footage
differently and the one that disagreed would be found by a customer.

**The deductions are the part people get wrong, and they are not the same:**

| | opening deducted | why |
|---|---|---|
| Sheetrock | **half** | board is cut around it and only some of the offcut comes back — a full deduction reliably under-orders |
| Paint | **in full** | there is genuinely nothing there to paint |
| Wall tile | **only below the tile line** | a window sill above a 48in wainscot takes nothing off |

That third one is why a wainscot cannot reuse the floor logic. Waste comes from
`flooringModel.LAYOUT_WASTE` rather than a second table — herringbone wastes 15%
on a wall for the same reason it does on a floor.

### And the vocabulary — gazebos and pergolas

A gazebo is a gable on posts and a pergola is a flat roof with open slats. The
engineering was already here and works on both without special-casing; what was
missing was the word. A customer asks for a pergola, not for "a flat-form
free-standing structure with an open-slat covering", and a design centre that
cannot take the word cannot take the job.

Six presets — pergola, attached pergola, gazebo, pavilion, carport, porch roof —
each carrying what makes it that thing rather than another. Applied as a merge,
so a dimension already set for this site is not thrown away when somebody
changes what they are calling it. 15/15 tests, including that slats carry less
load than shingles through the existing snow calculation.

### Deferred, and why

**Foundation, roofing, and additions-as-composite** are each their own phase. A
real foundation is frost walls and slabs, not the footing calculator that already
exists; roofing needs its own material and flashing model; an addition is
framing plus foundation plus roofing plus siding plus systems plus finishes —
an orchestration of things that must exist first. Half-building four of those
would have produced four features that each nearly work.

**Furniture** is staging for a render, not construction, and belongs with the
render pipeline rather than here.

## The blueprint becomes the building record  (decision settled)

Eric, asked directly: **"the blueprint should become the building record."**

That closes the question left open since Phase 3 and it changes what blueprint
reading is for. A takeoff tool would read a drawing, hand back square footages
and be finished with it — while everything else in the design centre carried on
working from a house estimated off photographs. A drawing carries a scale and a
photograph carries a guess, so the better source should win.

### What followed

**Reading produces geometry, not a report.** Rooms with positions, in the same
shapes the floor plan already uses. The analyser is now asked for `x`/`y` as
fractions of the building envelope, plus the scale and the overall dimensions —
because the drawing has them and the layout is the point. A room that comes back
with no dimensions is dropped rather than carried as a nameplate.

**Provenance now ranks.** `Provenance` gains `drawing`, sitting above `photos`
and below `measured`, with `PROVENANCE_RANK` and `outranks()` in one place.

**And the rule that matters: it does not undo the walkthrough.**

| the plan's room came from | what the drawing does |
|---|---|
| nothing recorded, or a guess | replaced |
| a photograph | replaced, and the change is listed |
| **measured on site** | **kept** — and the disagreement is shown |

A drawing describes the building somebody intended. That is not always the one
that got built and very often not the one still standing after forty years of
alterations, so the person who walked the job decides. Positions are only
written when the drawing actually supplied them — moving a room somebody placed
to a spot that came from a packing loop would be worse than leaving it.

44/44 tests, including that a measured room survives a drawing that disagrees.

### A dead route, found on the way

`ai-blueprint-analysis.tsx` was never mounted in `index.tsx`. `ClientWorkRequestForm`
has been POSTing to `/ai/analyze-blueprints` since it was written and getting a
404 every time — a customer uploading blueprints with a work request has never
had them read. Mounted now.

**It was unmetered.** Fixed straight afterwards — see below.

## The unmetered AI route  (fixed)

The blueprint reader required a session and nothing else, so any signed-in
customer, vendor, tenant or subcontractor could spend model tokens on it without
limit. The image routes in `house-capture` already had a ceiling; this had none.

### One ceiling, not two

The spend logic moved out of `house-capture.tsx` into `aiSpend.ts` rather than
being copied. Two ceilings would be two things to keep in agreement, and the one
that drifted would be the one nobody was watching. The caller names its bucket;
each bucket has its own counter and its own limit.

**The render keys are byte-identical to what is already in production.**
Renaming them would silently reset every customer's usage to zero — not a
migration, a gift of free renders that nobody notices until the bill. There is a
test asserting `render_budget:u1` specifically, for that reason.

### Counted per sheet, not per request

Each sheet is a full-detail vision call, so the cost scales with how many are
sent. Counted individually and capped at 8 per upload, so dropping a forty-page
set in cannot empty an account in one go.

The allowance is **120 sheets per account**, set by Eric. The unit is the sheet
because that is what costs money, and a drawing set runs about four — so 120 is
roughly **thirty real drawings**, which was the intent. Anybody later reading
120 as extravagant and trimming it to 30 would be cutting the allowance to seven
or eight sets without meaning to; the constant says so in place.

Renders stay at 10. Both carry per-account overrides in the kv store, so either
can be lifted for one customer without moving it for everybody.

Reserved **before** the call and refunded if it fails. Charging on success lets
a burst of parallel requests all pass the same check before any has been
counted.

### Found on the way

The route built its image payload as `data:image/jpeg;base64,${bp.base64}`,
assuming one caller's shape. The work-request form sends objects whose `base64`
may already carry the prefix, and the design centre sends plain data URLs — so
one of the two would have produced a doubled prefix or the literal string
`undefined`. Never noticed, because the route was never mounted. Both shapes are
normalised now.

### Baseline

Server typecheck **97 → 96**. The union-narrowing finding that came with the
moved code was fixed rather than relocated, and the baseline file records why.

32/32 tests, run against the real module through a hook that stubs the database
rather than against a copy of it.

## Review

(to be completed)

---

# Long shifts: prompt at eight, close at sixteen

- [x] `shiftLimits.ts` — the two thresholds and the decisions they drive
- [x] Auto-close abandoned shifts lazily, on every read of an active entry
- [x] Refuse an auto-closed shift at submit and at approve
- [x] A way for a supervisor to set the real finish time
- [x] Hold flagged hours out of the payroll report totals
- [x] The prompt itself, in the portal and in the mobile app

## Why it is not "punch them out at eight"

A ten-hour day is a normal day in construction, and a clock that stops itself at
eight records eight. The two hours do not become overtime for somebody to
approve — they stop existing, and the person who loses them is the one who
worked them. Silently shortening a wage is a worse failure than a forgotten
punch-out, so nothing built here does it.

So eight hours **asks**, hourly, and the clock carries on either way. Sixteen
hours is the backstop, and sixteen is not a long day — it is a punch-out
somebody forgot on the way home.

## What an auto-closed shift is

Closed so the person can start their next shift, and marked `needsReview` with a
finish time that is explicitly a placeholder. It is recorded at punch-in plus
sixteen hours rather than at "now", so a Friday shift found on Monday reads as
sixteen hours and not seventy-two. It is not added to `hoursToday` or
`hoursWeek`, because those are read as fact.

Then three gates: **submit** refuses it, **approve** refuses it separately (the
payroll screen can reach approve directly, so assuming submit had run would have
left a way past), and the **payroll report** holds its hours out of the totals
while counting them under `heldForReview`, so a short run says why rather than
just being short.

`POST /entries/:id/finish-time` is the only way out, and it is admin only — the
person whose hours these are cannot be the one who decides what they were. It
checks the corrected time against the shift rather than accepting it: after the
punch-in, and no more than sixteen hours after it, because a mistyped date is
exactly what the rest of this exists to keep off the payroll report. Correcting
the hours withdraws any existing payroll submission, since the allocation split
was made against the placeholder and no longer reconciles.

## No cron, so it runs on the way past

There is no scheduler in this project. `closeIfAbandoned` runs on every read of
an active entry — the timeclock screen, punching in again, the portal — which
covers it, because everything that cares about a stale entry reads it anyway. In
`GET /employees/:id` the active entry is now settled **before** the employee
record is read, or the timeclock would be handed a record still saying "clocked
in".

## Already true, and left alone

"All time must be matched with a work request" was already enforced and needed
no change: `POST /entries/:id/submit` refuses unless the allocations sum exactly
to the hours worked, and `PATCH /entries/:id/allocations` refuses any work order
not assigned to that employee. The work was the long-shift half.

## Checks

Server typecheck 84, unchanged. App typecheck 332, unchanged — the one finding
in `EmployeePortalView` is a pre-existing prop-type error on line 1219. Smoke:
12 affected pages, 0 threw. 31/31 on `shiftLimits`.

Not yet verified in a browser: the eight-hour prompt, and the supervisor's
finish-time correction has no screen yet — the route exists and is reachable,
but nothing in the UI calls it.

## Follow-up: the correction screen, and a gap it exposed

- [x] Held shifts listed at the top of the payroll tab, with a finish-time box
- [x] A count badge on the tab, so they are findable from the employees tab
- [x] `hours-summary` holds placeholder hours out of the figures HR pays from

The third item was not planned and matters more than the first two. Hardening
went into `GET /payroll-report`, which nothing in the app calls. The endpoint HR
actually pays from is `GET /hours-summary`, and it was still adding a
placeholder sixteen hours into `hoursThisWeek` and `hoursThisPeriod` — the
numbers the HR hub multiplies by a pay rate for "Period Payroll Est". So the
guarded route was the unused one and the live one was open. It now holds those
hours out, returns them as `hoursHeld`, and returns the shifts behind them as
`held` so the screen can name them.

The lesson is the one from the products-route episode: check what the client
actually calls before treating a route as the one that counts.

The panel sits above the payroll runs rather than below them, because its whole
purpose is to be read before somebody approves a run that is short. The
finish-time box opens on the placeholder in the browser's own timezone —
`toISOString` would have shown a time hours away from the one the crew would
name. Validation stays on the server; the screen only collects.

Server typecheck 84, app typecheck 332, both unchanged. Smoke: 8 pages, 0 threw.

Still unverified in a browser.

---

# Letting the customer into the design centre

Eric's decision: a **"Design Your Project" tab in the customer portal**, pointing
at the design centre itself — not a cut-down copy of it.

## What is already true, and needs nothing

- **Their work is separated.** Design projects are keyed by an owner derived
  from the token, and a requested `?owner=` is validated against the signed-in
  user, so a customer only ever sees their own designs.
- **The spend is bounded.** The render, blueprint and AI buckets are metered per
  account, which is what makes opening these routes to customers affordable.
- **They are not blocked today.** After sign-in the route guard falls through to
  "all portal access allowed", so a customer who typed `/deck-designer` would
  already get in. This is a discoverability change, not a permissions change.

## The items

- [ ] 1. Add the tab to `CustomerPortalView`, navigating to `deck-designer`.
      One design centre, not an embedded second one.
- [ ] 2. A way back. The tab takes them out of the portal chrome, and being
      stranded in a tool with no route home is the exact complaint that got the
      old Figma redirect removed.
- [ ] 3. Trim the workspace rail for customers. `DESIGN_TOOLS` currently offers
      Permits & zoning, Zoning variance, Document scanner and Materials hub —
      all internal workflow, one click from where the customer would land.
      A customer sees the design centre and nothing else on the rail.
- [ ] 4. Start them on their own house, not a blank site. `rebuilds-not-new-
      builds` says replacing an existing structure is the normal case, and the
      address drives snow load, frost depth and code edition.
- [ ] 5. **Make the design go somewhere.** See below.

## Item 5 is the one that decides whether this is worth doing

`DeckDesigner.tsx:507` carries the comment *"No quote is linked to a deck design
yet"*, and it is accurate — the design centre saves a design and produces no
quote and no work request. Today that is fine, because the only people in there
are staff who then go and do the next step by hand.

Put a customer in it and that stops being fine. They would spend an evening
designing their deck, press save, and nothing would reach you. `pipeline-is-the-
spine` says anything producing a number or a document has to write into the
pipeline rather than compute beside it — and a customer's finished design is
exactly that.

So the tab needs a **"Send this to Black Phoenix"** action that creates a work
request carrying the design id, the address and the saved version, landing it in
the pipeline the same way the visualiser's renders already do.

That is the real work here. Items 1–4 are an afternoon; item 5 is the feature.

## What I am NOT proposing

Not restyling the portal — one tab added to an existing list, nothing else
moved. Not changing the route guard. Not giving customers pricing: the design
centre does not currently show margin, labour rate or supplier cost, and this
change must not be the thing that starts.

## Awaiting approval before any of this is built.

## Review — the customer's way into the design centre

All five items done.

**The tab is a panel, not a jump.** `CustomerDesignTab.tsx` explains what the
design centre is and says plainly that a drawing is an idea rather than a plan or
a price, then offers a way in and lists the designs they already have. Dropping
a homeowner straight onto an empty canvas that expects spans and a code edition
is how a good tool gets a reputation for being difficult.

**Item 5 turned out to need no server work.** The existing
`POST /work-requests` already enforces that the email matches the signed-in
account, persists, raises the admin alert and notifies staff. So "Send to Black
Phoenix" posts to the same route the enquiry form uses, carrying
`designProjectId` and the saved version. One way in means one place a job starts.

Whether a design has already been sent is read back from the customer's own work
requests rather than flagged on the design. A flag would be a second copy of the
truth, and if the office deleted the request the design would go on claiming it
had been sent.

**`from=portal` changes presentation only.** It trims the workspace rail to the
design centre and the stair calculator — permits, variances, the document
scanner and the materials hub are office workflow and were one click from where
the portal drops them — and adds "Back to my portal". Nothing about access
depends on it: the server decides what a customer can read and write from their
token, and design projects are scoped to their owner there.

**The address travels with them** and seeds an empty site field only, never
replacing a typed one — the same rule the job-linked address already follows,
because the address sets snow load, frost depth and the code edition.

### Found on the way

The `deals` tab had a button and a render branch but was missing from the
`activeTab` union, so TypeScript called the comparison impossible. It worked at
runtime only because the click handler casts. One word, and the app baseline
drops 332 → 331.

### Checks

App typecheck **332 → 331**, and the one that went is named above. Server
untouched at 84. Smoke: 21 pages, 0 threw.

Not verified in a browser: the tab, the send, and the trimmed rail.

---

# Photos and video in every section of the design centre

Eric: *"i should be able to add picture and video in all section of the design
center so i can add on to existing structures."*

## Where it stands today

The design centre has five stages — **Capture, Design, Scope, Price,
Documents** — and nine trades. Capture is the only stage that takes a file at
all. The other four take nothing.

**Video does not work anywhere, including on Capture.** The Capture tab is
labelled *"Photos, video and what is already there"*, `JobFolder` draws a film
icon next to a video file so one looks accepted, and then:

- `designPhotos.ts:58` filters the pile to `image/` and silently drops the rest
- the server's `PHOTO_TYPES` (`design-projects.tsx:63`) lists only jpeg, png,
  webp, heic and heif — there is no video type in it

So a video can be picked, appears in the list, and vanishes on save without a
word. That is the promise the label already makes, unkept.

**Everything attaches to the project, not to a section.** A kitchen photograph
and a siding photograph land in the same pile with nothing to tell them apart,
which is why they cannot be shown back next to the work they are about.

## The items

- [ ] 1. **Tag what already exists.** Photos gain the stage and trade they were
      taken in. Without this, capture in nine sections produces one heap.
- [ ] 2. **Make video real, and by a different road.** A phone video is
      50–500MB; the photo path base64-encodes into a JSON body, which is
      correct for a 12MB photo and will simply fail for video. Video needs a
      signed upload straight to storage. Proposed ceiling **200MB**, about two
      minutes of phone video — enough for a walk along an elevation, which is
      the thing stills lose.
- [ ] 3. **One capture control, dropped into every section**, tagged with the
      stage and trade it sits in. One component, nine placements — not nine
      capture panels to keep in step.
- [ ] 4. **Show it back where it was taken**, so the pictures of the existing
      kitchen are on the kitchen and the elevation walk is on siding.
- [ ] 5. **Say what the ceilings are.** 60 files a project today; video will
      need its own count and a total size, and hitting a limit must say so
      rather than dropping the file quietly — which is the bug being fixed.

## What this is really for

`rebuilds-not-new-builds`: the job is nearly always an addition to something
already standing, and the photographs are the best evidence of what is there —
better than anything typed. This is what feeds the building record and the
model-first render, so capture is not an attachment feature, it is the input.

## Not proposed

Not touching how the render or the blueprint reader consume photos — they keep
reading the same pile, now better labelled. Not raising the per-project photo
count. Not adding capture to the portal visualiser, which has its own.

## Awaiting approval.

## Review — capture in every section

All five items done, plus two defects found on the way that had to be fixed for
any of it to work.

**One component, five placements.** `SectionCapture.tsx` takes the stage and
trade it is sitting in as props, tags every upload with them, and shows back
only what belongs to that section. Five capture panels kept in step would have
drifted; this is one.

**Video now works, by a different road.** Signed upload URL → the browser PUTs
straight into storage → the server is told and reads the object back to check
what actually landed. The size is taken from storage, not from the request, so
the ceiling is enforced against the file rather than against a number the
uploader chose; anything over 200MB is deleted rather than left costing money.
XHR instead of fetch purely for the progress bar — a 200MB upload with no
visible progress reads as a hung page.

`photosAsFiles` now filters videos out. Everything downstream — the house
reader, the sketch reader, the render — takes stills, and a 200MB MOV arriving
where a JPEG was expected would download in full before failing.

### Two defects found on the way

**1. The photo upload route took its owner from the request body.** The read and
delete routes beside it both narrow the asked-for owner against the signed-in
user; this one did not, so any signed-in account that knew another owner's key
could attach files to their project. It uses the same helper as its neighbours
now.

**2. The customer portal tab shipped earlier could not save.** The design centre
sends `ownerKey=decks`, which is a shared namespace the server only admits staff
to — a customer got 403 *"That is not yours to save to."* on every save and an
empty list on every read. So a customer could open the design centre, draw for
an hour and lose it. `ownerKeyForCurrentUser()` now resolves staff to `decks`,
which is where every existing design already lives and where the pipeline looks
for them, and everybody else to a key of their own. Staff role is read from
`app_metadata` only — `user_metadata` is writable by its own account, so
trusting it would let anyone put themselves in the staff namespace.

### Checks

App typecheck 331, unchanged. Server 84, unchanged. Smoke: 18 pages, 0 threw.

### Not verified in a browser

None of it — the capture panels, a real video upload, or the customer save path
now that its owner key is fixed. The video route in particular has never had a
file put through it.
