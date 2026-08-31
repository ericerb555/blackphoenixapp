# The Design Centre — what it is, and the order we build it

Written after Eric stopped a build session to say the work was happening on a
whim and needed one plan that ties everything together first. He was right. This
is that plan, worked out in conversation before any of it is built.

---

## What it actually is

Not a set of trade tools. It is where a construction company turns *a customer
asking for anything in a house* into a priced, documented, buildable job.

Black Phoenix does decks, gazebos and pergolas; additions inside and out; full
gut renovations; framing changes, foundations and rebuilds; kitchens, bathrooms,
tile, flooring, sheetrock and siding; the electrical, plumbing, HVAC and
low-voltage scope that goes with them; and the permits, variances and framing
details a town and an architect need.

Everything else follows from one fact: **a customer can send a work request
about anything.** The software copes with that rather than asking them to pick a
category first.

---

## The flow

    CUSTOMER VISUALISER   a photo of their room or house, in the portal.
          |               "show me a deck, a roof over it, a pergola, new
          |               siding, a different colour, this kitchen, oak floors,
          |               these windows" — using real vendor products
    WORK REQUEST          when they like one. The picture comes with it.
          |
    ASSESS AT THE DESK    their photos, video, or an existing blueprint
          |               -> the building record: the rooms as they are
    MARK THE INTENT       what we want, drawn on that plan
          |
    SITE WALKTHROUGH      usual, not required. The final piece: how it truly
          |               lays out, and how hard it will be to do what we want.
          |               Also where "can this wall come out" gets answered.
    SCOPE OF WORK         the detailed process — phases in build order, tasks,
          |               quantities, the trade that owns each, and every
          |               consumable down to the screws
       .--+------------------.
    PRICE IT OURSELVES    BID IT OUT
    our labour rates +    one package per trade -> vendors and subs
    vendor catalogues     -> their numbers return into the same lines
       '--+------------------'
          |
    QUOTE -> PIPELINE -> contract -> invoice -> payment
          |
    DOCUMENTS             permit set, variance, framing details, electrical,
          |               plumbing, HVAC and low-voltage plans, schedules
    REVIEW                framing details go to the architect on a one-time
                          link. Approved, or changes marked, and back it comes.

---

## The seven things that own data

### 1. The building

One record per project, holding **existing and proposed** geometry. Rooms and
elevations as they are, plus rooms and elevations that do not exist yet, because
an addition is new footprint attached to an old house.

Every dimension says where it came from — measured, from photos, or estimated.
Scale comes from the paper reference in each photograph plus a tape afterwards.

**A room is a room.** The kitchen tool, the flooring tool, the tile tool and the
systems layer do not care whether it was captured from a photo or drawn from
scratch. That single decision is what lets an addition be designed with the same
tools as a renovation.

**Walls carry a structural state: bearing, non-bearing, or not yet determined —
and they start as the third.** Open concept is the most requested move in the
business and the highest-stakes structural question in it. The desk pass can
show the wall gone, because that sells the job; what it must not do is imply the
wall can come out. A render over an undetermined wall says so on its face.

### 2. The scope of work

The centrepiece, and **it does not exist in the codebase today at all.**

An ordered process rather than a list: demolition, framing, rough electrical,
rough plumbing, rough HVAC, low-voltage rough, inspection, insulation,
sheetrock, tile, flooring, trim, paint. Inspection hold points sit between
phases.

Each line names its trade, its quantity, and how confident that quantity is —
provisional from the desk, confirmed after the walkthrough. A line needs no
drawing; "haul away the old deck" is a line.

**The sequence is the point, because selections reach backwards.** A
wall-mounted television chosen during the finishes conversation creates blocking
in framing and a recessed outlet in electrical — both of which must happen
before the sheetrock. A flat task list cannot express that. A phased scope with
hold points can, and it is what stops somebody cutting open a finished wall.

**Quoting the whole job means consumables belong to the task.** Hang a cabinet
and you need screws, shims and filler; set tile and you need thinset, grout,
spacers and backer board. Those live inside the task template so they are quoted
by construction rather than by memory.

A second class belongs to the job rather than any task, and gets missed more
often precisely because it belongs to no trade: **protection** (floor covering,
ram board, sheeting, dust barriers, covering furniture), **safety** (PPE, fall
protection, barricades, temporary rails), and **site** (dumpster, portable
toilet, deliveries, daily and final clean).

Before a quote leaves, a **completeness check**: demolition with no dumpster,
tile with no thinset, a gut with no dust barrier, a second storey with no fall
protection. Not blocking — an exclusion may be deliberate — but it makes an
omission a decision instead of an accident.

Over time this becomes a **task library**, which is the asset that makes the
tenth kitchen quote faster and more complete than the first.

### 3. The trade tools

Deck, siding, openings, kitchen, bathroom and flooring today. Gazebo, pergola,
tile, sheetrock, framing, foundation, roofing and additions to come.

These are **generators of scope lines, not destinations.** You do not work "in
the kitchen tool"; you have a job with a kitchen in its scope. Seven tiles as
top-level navigation is the wrong level of the hierarchy, and correcting that is
the single biggest change in this document.

Shower doors belong with openings rather than cabinets — an opening, a unit made
to fit it, a hardware finish, a supplier. With one sequencing fact worth
encoding: **they are measured after the tile is set**, so the line carries an
allowance and firms up on site. Ordering off framing dimensions is how you get a
piece of glass that does not fit, and it is not a cheap mistake.

### 4. The systems layer

Four disciplines, one shape: **electrical, plumbing, HVAC, and low-voltage/AV.**

Devices and fixtures over the floor plan in two states — what is there now, and
what we want. Receptacles, switches, lights, fans, dedicated circuits, the
panel. Fixtures, supply, waste, shutoffs, the water heater. Equipment, ducts,
supplies, returns, registers, the thermostat. Speakers, television locations,
data, cameras, doorbells.

Plus a count, because that is what a sub prices from.

Deliberately **not** engineering. No load calculations, no panel schedules, no
fixture units, no Manual J. This communicates scope so a licensed trade can
quote it. Existing conditions matter as much as intent: a sub who can see the
panel quotes tight, one who cannot pads for the unknown. Photographs of the open
panel and under the sink attach here.

Switching is scope, not decoration — three-way, dimmer, occupancy, and which
fixtures sit on which switch. For an addition, HVAC brings its own question:
whether the existing system has the capacity, or whether the new space needs its
own.

### 5. Products and selections

Vendor catalogues serve three jobs from one record: **the look** (a swatch or
texture rendered into their room), **the choice** (what was selected), and **the
price** (already flowing through the price-lines route).

So a customer picking a floor in the portal is not browsing inspiration, they
are specifying. It lands on the quote at the real price and is ordered from that
vendor.

**A selection travels with the project the entire way** — visualiser, scope
line, quote line, purchase order, what arrives on site — and it says who made
it:

- **Customer picked** — they chose it in the portal
- **We specified** — Black Phoenix selected it
- **Allowance** — a placeholder with a budget, pending their choice
- **Substituted** — changed later

**A substitution is an event, not an edit.** Overwriting loses the fact that the
customer chose something else, and six weeks later when they say "that is not
what I picked" there is nothing to show them. Recorded as an event pointing at
the original, you can show what they chose, what it became, why, and who
approved it.

Lighting spans two classes and both matter. **Fixed lighting** is simultaneously
a product the customer picks and an electrical scope item the sub prices — one
record seen from two sides, because separate records disagree and somebody eats
the difference. **Loose lighting** — table and floor lamps — is furniture class.

**Furniture and design pieces** are the same product system: a SKU, an image, a
price, a vendor. The only difference is that they are placed loose in a room
rather than attached to a wall. **So the placement layer is built generically —
an item at a position in a room — rather than specifically for electrical
devices.** Build it narrowly and furniture becomes a second system duplicating
the first. That decision costs nothing now and a rewrite later.

Vendors must supply images fit for rendering — a flat swatch, not a marketing
photograph of somebody else's room. Easier asked at onboarding than chased after
fifty products are loaded. A product without one is still listed and priced, and
marked as not yet visualisable.

### 6. The money

Every scope line prices from one of three places and says which: our own labour
rate, a vendor catalogue price, or a subcontractor's returned bid. A job can be
part self-performed and part subbed and still show where every number came from.
A line with no price is kept, flagged and counted, and the total says it is
short.

### 7. The documents

Permit sets, variance applications, framing details, plans and schedules. Unlike
anything in the app today these carry a **state**: draft, submitted, approved,
changes requested, revised, resubmitted.

Framing details go to the architect on a **one-time link** — no account, no
portal. An expensive professional doing you a favour will not learn a new login
to spend ten minutes on a header detail; they will email you back instead, and
then the system is quietly lying about the state of the job. A link asks the
least of them and still keeps the markup, the verdict and the date inside the
pipeline. If an architect ever wants a queue across jobs, that is a front door
onto the same data rather than a rebuild.

---

## The rule that settles arguments

Data flows one way:

    building -> scope -> quote -> pipeline -> document

Nothing reaches back. A trade tool does not capture its own walls. A quote does
not recompute a takeoff. A document does not invent a number. Where two things
disagree, the one further left wins.

---

## Where it is broken today

| Gap | Consequence |
| --- | --- |
| **No scope of work exists anywhere.** | The centre of the process is missing. Work requests, trade tools, quotes, the bid room, the pipeline and the portals all exist and nothing joins them — which is why the app feels bolted together. |
| **`design-projects` has no authorisation.** The owner key is a query parameter and the value is the shared constant `decks`. | Anyone holding the public anon key, which ships inside the JavaScript, can list, read, overwrite or delete every saved design. |
| **Kitchens and bathrooms do not publish to the pipeline.** Deck, siding, openings and flooring do. | The most recently built trades are the ones least tied in. A kitchen can be designed, scheduled and priced and then cannot become a job. |
| No floor plan of existing rooms, and no way to draw proposed ones. | The desk pass has nowhere to happen, and additions cannot be designed at all. |
| No walkthrough stage. | A desk estimate and a firm price look identical. |
| No systems layer. | Electricians, plumbers and HVAC contractors cannot be given a scope to quote. |
| Room views carry one dimension. | Flooring imports rooms with a zero side; kitchens ask for a width already given. |
| Captured openings use the hole size as the unit size. | A window schedule not safe to order from without checking. |
| Gazebos, pergolas, tile, sheetrock, framing, foundation, roofing, additions unbuilt. | Roughly half the trades. |
| Permits, variances and the blueprint analyser stand beside the design rather than drawing on it. | They cannot document what was actually designed. |
| No smoke harness, no `tsconfig`. | Two runtime failures shipped through a clean build this year. |

---

## The phases

Each leaves the app usable, and none has to be redone by the next.

### Phase 0 — Make it safe to build on

Small, and nothing else should start first.

- Close the `design-projects` authorisation hole.
- A render smoke harness that mounts every page and reports what throws.
- A real `tsconfig` and a `typecheck` script.

### Phase 1 — The spine: the scope of work

The missing centre. Everything attaches here, so building anything else first
means attaching it twice.

- The scope object: phases in build order, tasks, quantities, trade, confidence.
- Task templates carrying their own consumables; job-level protection, safety
  and site lines; the completeness check.
- Work request into scope, scope into quote into pipeline.
- Kitchens and bathrooms publish into it.

### Phase 2 — The front door: the customer visualiser

Brings the work in, and uses render machinery that already exists.

- Photo in the portal, ask for what they are imagining, see it — using **real
  vendor products**, so a choice is a specification rather than a mood.
- "I like this" becomes a work request with the picture attached.
- Their photographs seed the building record: captured once, used twice.

Two decisions to settle first: the per-account render ceiling, ten images today;
and how these pictures are labelled, because a photoreal kitchen arriving beside
a quote becomes an argument at handover unless it is as honest as every other
figure in the app.

### Phase 3 — The building, properly

- A floor plan that **records existing rooms and draws proposed ones**.
- Existing and proposed elevations, so an addition ties into the house.
- Wall structural state, defaulting to not yet determined.
- Rooms get their second dimension.

### Phase 4 — The systems layer, and bidding out

- Four disciplines over the plan, existing and proposed, with counts.
- The **generic placement layer** — an item at a position in a room — which
  furniture later reuses.
- Bid packages per trade built from scope lines; returned prices land back in
  the same lines. `bid_requests`, the bid room and the request-bids route
  already exist and the design side has never used them.

### Phase 5 — The walkthrough

- Turns provisional scope lines into confirmed ones.
- Records constructability, and answers the bearing question. Non-bearing means
  demo and patch; bearing means shoring, a sized beam, posts and often footings.
  The gap between those two answers is thousands of dollars, which is why the
  estimate stays provisional until somebody stands in the room and looks up.

### Phase 6 — Framing details and the architect loop

- Real spans, headers, beams, bearing points and load paths. The deck designer
  already sizes beams, posts and footings; a header over a removed wall is the
  same class of calculation on a harder building.
- Document states, and the one-time review link.

### Phase 7 — Documents

- Permit sets, variances, plans and schedules, drawing on the real design.

### Phase 8 — Model first, render once

- Align the 3D camera to the photograph, render the structure alone on
  transparency, composite, then one paid pass masked to it. A render costs about
  twenty cents and is a fresh roll of the dice; the 3D view is free and instant,
  so the deciding happens there and the paid step runs once on a settled design.
- Fixtures with real positions can light the 3D room, which makes a better sales
  image at no extra cost.

### Phase 9 — The remaining trades, and furnishing

- Gazebo, pergola, tile, sheetrock, framing, foundation, roofing.
- Additions as a composite scope spanning nearly all of them, inside and out —
  the strongest test that Phase 1 was built right.
- Furniture and design pieces from vendors, reusing the placement layer. The
  render currently forbids furniture, deliberately; that becomes a mode rather
  than a rule — a construction view stays empty, a sales view is furnished, and
  everything shown is labelled *shown for scale* or *included in the price*.

---

## Two decisions still open

**Permit sets.** Counter-ready for your towns, with their sheet sizes, title
blocks and code notes? Or accurate drawings that you assemble and file yourself?
The first means modelling each jurisdiction's paperwork. The architect loop in
Phase 6 makes the second more plausible than it first looked.

**Blueprint reading.** Should an existing drawing *become* the building record,
so a rebuild starts from the real plan rather than from photographs? Or only
yield quantities? The first is far more useful and considerably harder.

---

## How this changes working practice

A request that fits a layer above gets built to that layer's contract. A request
that does not fit means **this document is revised and agreed first, and then it
is built** — not built alongside and reconciled afterwards. That is the change
Eric asked for, and it is the whole point of writing it down.
