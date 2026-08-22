# Plan — build out the condo owner portal, and sell from it

Eric: build out the portal owners are invited into, put it in the role switcher
so he can walk it and iterate, and add a section that upsells Black Phoenix
services to grow revenue, with products and strategies based on the condo's town.

## Where this portal stands today

`CondoAssociationPortalView` now takes its role from the association's grant —
that part is done and tested. Everything else about it is still a demo:
`loadDemoData()` supplies a Harborview association in Miami, 240 invented units,
and a board president called Robert Martinez. Five of its tabs are placeholder
cards.

So "build it out" means three things: connect it to the real association, make
it behave differently for an owner than for the board, and add the sell section.

## What an owner should actually see

An owner is not the board. The grant model already distinguishes them, and the
portal should too:

| | Owner / resident | Board / manager |
|---|---|---|
| Their unit, and their own requests | yes | yes |
| Association-wide work requests | summary only | all, with approvals |
| Financials, vendors, roster | no | yes |
| Documents (bylaws, minutes) | published ones | all, and can publish |
| Offers | yes | yes, plus what to propose |

## The sell section — what it can honestly be built on

This has to clear the bar the town-loads module already sets in this codebase:
*a figure is looked up and carries its source, never inferred, because a
plausible guess will be believed.* Four real inputs exist:

1. **The town record** — `lookupTownLoads()` returns ground snow load, frost
   depth and code edition for a town, entered by an operator from the building
   department's own table, with a source note. Where a town has no record, the
   section says so rather than guessing.
2. **The season** — today's date. A roof and gutter check sells in September in
   New Hampshire for reasons nobody has to invent.
3. **The association's own history** — its work requests, unit count, building
   count and age. What has already broken is the best predictor of what to
   propose next, and it is data we hold.
4. **The real service list** — the one `WorkRequestWidget` already uses (snow
   removal, pressure washing, lawn care, handyman, construction, pest control),
   plus the property-management add-ons already in the plan catalogue: annual
   reserve-study assessment, after-hours emergency dispatch, extra sub-portals.

What it will **not** do is invent town demographics, market sizing, or revenue
projections. A number on this screen either came from somewhere real or it is
not on the screen.

## Todo

- [ ] **Wire the portal to the real association.** Load it from
      `/condo/associations` and the caller's grant, replacing `loadDemoData()`.
      Honest empty states when an account belongs to no association yet.
- [ ] **Make it role-aware** per the table above, using the capabilities the
      grant already returns rather than a second set of rules here.
- [ ] **Units tab** — the board sees every unit; an owner sees their own.
- [ ] **Maintenance tab** — submit a request, see its status; the board sees all
      and can approve.
- [ ] **Documents tab** — reuse `PortalDocumentVault`, as the vendor, landlord
      and investor portals already do.
- [ ] **The sell section**, built on the four inputs above, with each
      recommendation stating *why* it is being suggested — the season, the
      snow load, the age of the building, or the request that keeps recurring.
- [ ] **Role switcher entry** so Eric can walk it: a `CONDO_ASSOCIATION` role,
      its portal route, and a mock profile, matching how every other portal is
      already listed there.
- [ ] **iPhone pass**, as with the other portals.

## Settled: a condo is two customers, not one

Eric: *"we want all the interior work from the owners and we want to upsell the
association."*

That is the organising idea for the whole sell section, and it is not a
marketing preference — it follows the legal boundary of a condominium. The
association is responsible for the common elements and the building envelope;
the owner is responsible for everything inside their unit walls. So the same
building yields two buyers with two different shopping lists, and an offer aimed
at the wrong one is something the recipient has no authority to buy.

| | Sold to the **unit owner** | Sold to the **association** |
|---|---|---|
| What | Interior work — kitchens, bathrooms, flooring, paint, fixtures, in-unit systems | Envelope and common areas — roofs, siding, balconies, walkways, snow, landscaping, pressure washing |
| Plus | Customer maintenance plans | Reserve study, after-hours dispatch, extra sub-portals |
| Why them | It is their property to alter | It is their property to maintain |

This is also the company's core business pointed at a new channel: Black Phoenix
leads with kitchen and bathroom renovation, and a 40-unit building is 40
kitchens with a known address and a warm introduction.

**One person can be both.** A board member who owns a unit sees both lists. So
the interior/exterior split is a property of the *offer*, not only of the
account — the section decides per recommendation, from the viewer's grant.

## Grounding — the standard being applied

Eric did not settle this one, so I am taking the conservative reading, which is
the standard this repository already set for itself in `townLoads.ts`: a figure
is looked up and carries its source, never inferred, because a plausible guess
will be believed. Recommendations therefore come only from the season, the
town's recorded snow load / frost depth / code edition, the association's own
work-request history and building facts, and the real service list. Where a town
has no record on file, the section says so instead of guessing.

Worth returning to later: a screen for Eric to record what he knows about a town
— building stock, age, what sells there. His own knowledge is a real source; it
just needs somewhere to live and a note saying it came from him.

## Review — what was built

### The association is real now

The portal loads the association the signed-in member actually belongs to, via
their grant, and shows it. `loadDemoData()` still supplies the sample work
requests and units — that is the next piece — but the building on screen is no
longer Harborview in Miami, and everything the offers section reasons from is
real: the name, the address, the unit count, the number of buildings.

### The sell section

`condoOffers.ts` decides what to offer and, more importantly, why. Every card
states the fact that produced it.

Interior work goes to owners; envelope and common-area work goes to the board.
Whichever side you are, the other side's list is one click away, clearly
labelled and not actionable — a board can see what its residents are being
offered without being able to buy a kitchen on their behalf.

**What it reasons from**, and nothing else: the season, the town's recorded
ground snow load, frost depth and code edition, the association's own unit and
building counts, and the real service list `WorkRequestWidget` already uses.
Requesting an item posts a genuine work request to `/work-requests`, carrying
the reason with it so whoever picks it up knows what was said on screen.

**Where a town has no record it says so** — "the suggestions below are seasonal
only" — rather than inventing local knowledge. That is the standard
`townLoads.ts` set for this codebase: a guessed figure is worse than a blank one
because it will be believed. A board acting on a fabricated snow load is exactly
the harm that rule exists to prevent.

There are no revenue projections and no market sizing anywhere in it. We hold no
data that would support either.

### Verified

*The reasoning*, as a unit test over five scenarios — autumn, winter, spring and
summer, with a heavy town record, a light one, and none at all:

- nothing ever crosses the condominium boundary; an owner is never shown roof or
  snow work, a board is never shown a kitchen
- a 60 psf town triggers the roof snow-load assessment; a 40 psf town does not
- with no town record on file, no snow load and no frost depth is quoted
  anywhere — the offers that depend on them simply disappear
- owners always see interior work, because it is not seasonal

*The screen*, in headless Edge at 390x844 with touch emulation, as an owner and
as a board president, with a town record and without, plus a real click through
the other-audience panel and a request actually posting. No errors, no
side-scroll, no tap target under 44px, no sub-12px text. The portal itself was
then rendered end to end and shows Harbour Point rather than the Miami sample.

### In the role switcher

A **Condo Association** role, routed to the association portal, with a Harbour
Point profile. Registered in all four places a role has to exist — the enum, the
permission table, the display names and the colours — plus the switcher's own
route map, profile list and menu.

### Still open

- The sample work requests and units inside the portal are still
  `loadDemoData()`. Association-scoped work requests are the next piece, and
  they would also let the offers reason from what has actually broken.
- No prices. Every card reads "Quoted per job" because that is true; one-click
  buying needs real numbers from Eric.
- Worth returning to: a screen for Eric to record what he knows about a town —
  building stock, age, what sells there — as a real, attributed source.
