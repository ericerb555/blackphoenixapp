# Delivery plan — the phases

The architecture is in `architecture.md`. This is the order it gets built, what
each phase contains, and how we know it is finished.

Two rules that apply to every phase:

- **Each phase leaves the app usable.** No phase depends on a later one to make
  sense.
- **Nothing gets built that a later phase has to undo.** Where that risk exists
  it is called out below.

Sizes are relative, not calendar estimates. "Small" is a focused piece of work,
"large" is a project in its own right.

---

## Phase 0 — Make it safe to build on

**Goal.** Stop shipping on top of a live hole, and be able to tell when
something breaks.

**Build**

- Authorisation on `design-projects`. Today the owner key is a query parameter
  whose value is the shared constant `decks`, so anyone holding the public anon
  key — which ships inside the JavaScript — can list, read, overwrite or delete
  every saved design in the system.
- A render smoke harness: mount every page and portal headlessly, report which
  throw, which render empty, and which log errors.
- A real `tsconfig.json` and a `typecheck` script, configured so the output is a
  short list of real problems rather than four thousand phantoms.

**Why first.** Two runtime failures shipped through a clean build this year —
a variable read before it was declared, and a missing import — and both were
found by Eric using the app rather than before shipping. Everything below is
safer to build once these exist.

**Done when.** An unauthorised caller cannot read another owner's design; one
command reports the health of every screen; `typecheck` passes or its remaining
failures are a known, written-down list.

**Size.** Small, except the typecheck triage, which is unknown until it runs.

---

## Phase 1 — The spine: the scope of work

**Goal.** The thing that turns a request into a job exists.

**Build**

- The scope object: phases in build order, tasks, quantities, the trade that
  owns each, and a confidence on every line — provisional from the desk,
  confirmed after a walkthrough.
- Inspection hold points between phases.
- Task templates that carry their own consumables, so screws, thinset, shims and
  hangers are quoted by construction rather than by memory.
- Job-level lines that belong to no trade and are therefore the most often
  missed: protection, safety, and site.
- The completeness check before a quote leaves — demolition with no dumpster,
  tile with no thinset, a gut with no dust barrier.
- Work request into scope. Scope into quote into pipeline.
- Kitchens and bathrooms publish into it.

**Why here.** Everything else attaches to the scope. Building any of it first
means attaching it twice. It also fixes kitchens and bathrooms being the only
trades that currently cannot become a job.

**Done when.** A work request can be turned into a sequenced scope, priced, and
sent as a quote that appears in the pipeline — for a kitchen, which is the trade
furthest from the spine today.

**Size.** Large. This is the centre of the system.

---

## Phase 2 — The front door: the customer visualiser

**Goal.** A customer can see what they are imagining, and asking for it starts a
job.

**Build**

- Photo of a room or the house in the portal, and ask: a deck, a roof over it, a
  pergola, new siding, a different colour, a kitchen layout, hardwood, tile, new
  windows and doors.
- Real vendor products rather than generic finishes, so a choice is a
  specification and not a mood.
- "I like this" becomes a work request with the picture attached.
- Their photographs seed the building record — captured once, used twice, rather
  than asking again when the job gets real.

**Decide before building**

- The per-account render ceiling. Ten images today. Do subscribers get more, can
  a customer buy more, or is hitting the limit a reason to call them?
- How the pictures are labelled. A photoreal kitchen sitting beside a quote
  becomes an argument at handover unless it is as honest as every other figure
  in the app.

**Why here.** It brings work in, and it runs on render machinery that already
exists. It needs Phase 1 so the requests it generates land somewhere real.

**Done when.** A customer with no training can photograph a room, see a change
they asked for, and start a work request from it without contacting anyone.

**Size.** Medium. The machinery exists; the conversational front and the product
catalogue wiring do not.

---

## Phase 3 — The building, properly

**Goal.** A real floor plan, including rooms that do not exist yet.

**Build**

- A plan that **records existing rooms and draws proposed ones**. Both. An
  addition is rooms that do not exist yet, so tracing alone is not enough.
- Existing and proposed elevations, so an addition ties into the house.
- Wall structural state — bearing, non-bearing, not yet determined — defaulting
  to the third.
- Rooms get their second dimension, which unblocks flooring imports and stops
  kitchens asking for a width already given.

**Why here.** The systems layer needs a plan to sit on, and additions cannot be
designed at all without drawing.

**Done when.** An existing house can be traced from photos or a blueprint, an
addition drawn onto it, and both used by the kitchen, flooring and tile tools
without either knowing which was which.

**Size.** Large.

---

## Phase 4 — The systems layer, and bidding out

**Goal.** A sub can be handed a scope and price it.

**Build**

- Four disciplines over the plan, existing and proposed, with counts:
  electrical, plumbing, HVAC, low-voltage and AV.
- **The placement layer built generically** — an item at a position in a room —
  because furniture reuses it in Phase 9. Built narrowly for electrical devices,
  furniture becomes a second system duplicating the first.
- Existing-condition photographs attached: the open panel, under the sink.
- Bid packages per trade, built from scope lines.
- Returned prices land back in the same lines. `bid_requests`, the bid room and
  the request-bids route already exist and the design side has never used them.

**Why here.** Needs the plan from Phase 3 and the scope from Phase 1. The
generic placement decision has to be made here because undoing it later is the
rework this whole document exists to avoid.

**Done when.** An electrician receives a package showing what exists, what is
wanted, and a count — and their returned number lands on the quote labelled as
theirs.

**Size.** Large.

---

## Phase 5 — The walkthrough

**Goal.** A firm price stops looking like a desk estimate.

**Build**

- A site stage that turns provisional scope lines into confirmed ones.
- Constructability findings: is that wall bearing, is the panel full, can a beam
  get in there, is there room for the waste run where it was drawn.
- The bearing answer forks the scope. Non-bearing is demo and patch. Bearing is
  shoring, a sized beam, posts, and often footings — thousands of dollars
  apart, which is exactly why the estimate stays provisional until somebody
  stands in the room and looks up.

**Done when.** A quote can show which of its numbers were confirmed on site and
which were not, and the customer can see the difference.

**Size.** Medium.

---

## Phase 6 — Framing details and the architect loop

**Goal.** Structural work leaves the building with something an architect can
approve rather than produce.

**Build**

- Framing details with real spans, headers, beams, bearing points and load
  paths. The deck designer already sizes beams, posts and footings; a header
  over a removed wall is the same class of calculation on a harder building.
- Document states: draft, submitted, approved, changes requested, revised,
  resubmitted.
- The one-time review link. No account, no portal — an expensive professional
  doing you a favour will not learn a new login for a ten-minute markup, they
  will email you instead, and then the system is lying about the state of the
  job.

**Done when.** A framing detail can be sent, marked up, approved or returned,
and the whole exchange sits on the project.

**Size.** Medium, plus the structural calculations, which are the real work.

---

## Phase 7 — Documents

**Goal.** What the town needs comes out of the design rather than beside it.

**Build**

- Permit sets, variance applications, plans and schedules drawing on the real
  design.

**Blocked on a decision.** Counter-ready for specific towns, with their sheet
sizes, title blocks and code notes? Or accurate drawings assembled and filed by
hand? The first means modelling each jurisdiction's paperwork. The architect
loop in Phase 6 makes the second more plausible than it first looked.

**Size.** Unknown until that decision is made — which is why it is not earlier.

---

## Phase 8 — Model first, render once

**Goal.** The sales image comes from the model, not from a description.

**Build**

- Align the 3D camera to the photograph — by hand, with the photo behind at half
  opacity. Saved with the project, so it happens once per photo.
- Render the structure alone on transparency.
- Composite it onto the photograph. At this point the geometry *is* the model.
- One paid pass masked to it, told to change no shape and no position, only to
  make it photographic.
- Show the composite beside the finished render, so it is obvious what the paid
  step changed.

**Why here.** A render costs about twenty cents and is a fresh roll of the dice
each time; the 3D view is free and instant. So all the deciding happens in 3D
and the paid step runs once on a settled design. It comes after the smoke
harness because it touches the 3D view every trade now shares.

**Done when.** A render's deck is the same size, in the same place, with the
same stairs as the model — reliably, not sometimes.

**Size.** Large.

---

## Phase 9 — The remaining trades, and furnishing

**Goal.** Everything Black Phoenix sells is in the Design Centre.

**Build**

- Gazebo, pergola, tile, sheetrock, framing, foundation, roofing.
- Additions as a composite scope spanning nearly all of them, inside and out.
  This is the strongest test that Phase 1 was built right: if a phased,
  sequenced scope with hold points works for an addition, it works for anything.
- Furniture and design pieces from vendors, reusing the Phase 4 placement layer.
- The render's furniture rule becomes a mode rather than a prohibition — a
  construction view stays empty, a sales view is furnished, and everything shown
  is labelled *shown for scale* or *included in the price*.

**Size.** Large, but incremental — each trade lands on its own and the ones
already built prove the pattern.

---

## Still open, and why it matters

**Permit sets** — blocks Phase 7 and nothing else.

**Blueprint reading** — should an existing drawing become the building record,
so a rebuild starts from the real plan rather than photographs? Or only yield
quantities? The first is far more useful and considerably harder. It would
attach to Phase 3, and deciding late means Phase 3 may need revisiting, so this
is the one worth settling soonest.
