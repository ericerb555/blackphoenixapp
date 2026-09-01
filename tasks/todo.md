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

## Review

(to be completed)
