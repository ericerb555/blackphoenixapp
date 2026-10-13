# Phoenix Exchange: the map, and the customer account

Eric asked for two things together: a logged-in customer area (saved
businesses, enquiry history, deals from places you follow) and **"a live
interactive map — a main feature in finding places near you."**

They are one plan because they meet in two places. The map is how somebody
finds a business; the account is what remembers which ones they cared about.
"Near you" needs a location, and an account is the only honest place to keep
one. Built separately they would be two half-features that each need the other.

This is a plan to agree before any of it is built, not a description of work
done.

## What already exists to build on

More than I expected, which changes the shape of the work.

| already there | why it matters |
|---|---|
| **1,090 listings with coordinates** — `service_lat`/`service_lng`, six decimals, written from the OSM feature itself | the map has real data on day one; nothing needs compiling first |
| **`exchange_lead_event.actor_user_id`** | a signed-in customer's contact events are ALREADY recorded. Enquiry history is a read of rows that exist, not new capture |
| **`exchange_territory.center_lat/lng` + `postcodes`** | a town has a centre to open the map on and a boundary to check against |
| **`exchange_category.default_radius_miles`** | how far somebody travels for each category is already decided per category — 4 miles for a convenience store, 25 for a car dealer. Never used for anything yet |
| **The public category/listing API** | already returns `location: {lat, lng}` per listing, signed out |
| **The claim flow** | the business side of the Exchange already has an identity model |

## What does not exist

- **No map library at all.** Nothing in `package.json`; `CanvasMinimap` belongs
  to the deck designer and is unrelated.
- **No distance query.** The territory filter is a *town*, not a radius. "Near
  me" is a different question from "in Salem" and the server cannot answer it
  today.
- **No customer identity in the Exchange.** Claims identify businesses. Nothing
  identifies a resident.
- **No saved/followed concept.**
- **No deals.** This is the largest unbuilt piece of the three — see below.

## The decisions, and what he answered

Answered 2026-10-12. Recorded here so they are not re-opened.

| decision | answer |
|---|---|
| Map tiles | **MapLibre GL + a hosted free tier** (MapTiler or Stadia). Never OSM's own tile server |
| "Near me" | Typed town is the default, browser geolocation offered not demanded |
| Deals | **Free with a claimed listing now, priced into the plan catalogue later** |
| Customer account | Inside the Exchange, its own portal |
| Start with | **Phase 1 — the map, signed out** |

### 1. Map tiles — chosen: MapLibre GL + a hosted free tier

A map needs tiles (the imagery) as well as data (our pins). The data is ours;
the tiles are not.

**OpenStreetMap's own tile server is not an option.** Its usage policy forbids
systematic use by applications, and "a main feature" of a product is squarely
that. Using it anyway would be taking something on terms we have not agreed
to, and the failure mode is being blocked without notice.

Real options, cheapest first:

- **MapTiler / Stadia / Protomaps free tier** — roughly 100k map loads a month
  free, then paid. Standard, well-documented, works with MapLibre GL (open
  source, no licence fee). Needs an account and an API key.
- **Self-hosted Protomaps** — one static file of tiles for New Hampshire
  served from Supabase Storage. No per-load cost, no third party, no key. More
  work up front and the tiles go stale until re-cut.
- **Google Maps** — most familiar to residents, has a free monthly credit,
  costs real money past it and ties us to their terms.

My recommendation is **MapLibre GL + a hosted free tier to start**, because it
proves the feature at near-zero cost and Protomaps self-hosting is a
drop-in replacement later if volume justifies it. But it needs an account in
your name, and I will not sign you up for anything.

### 2. "Near me" — chosen: typed town by default, geolocation offered

- **Browser geolocation** is accurate and one tap, and shows a permission
  prompt. Residents are used to it.
- **A typed town or postcode** needs no permission and no prompt.

I would do **both, with the typed one as the default** and geolocation offered
rather than demanded — a directory that demands your location before it shows
you anything is the behaviour people dislike about the lead-resale sites.

Either way: a coordinate never goes in a URL, and a location is never stored
unless you ask me to remember it.

### 3. Deals — chosen: free with a claim now, priced later

"Deals from places you follow" needs a deals entity, and that raises two
questions your own rules already half-answer:

- Anything a tenant publishes that reaches other people **must be approved
  before it goes live** — so deals need a review queue, like claims have.
- The Exchange is **permanently free for customers**, and businesses arrive on
  a free trial that converts to a subscription. So is publishing a deal a free
  feature of a claimed listing, or a paid tier? If paid, it belongs in the
  cohort/plan catalogue rather than being priced on its own.

**Only a claimed listing should be able to publish**, whatever the answer —
an unclaimed compiled listing has nobody standing behind it.

He chose **free now, priced later**. The consequence to build for from the
start: the publish path asks the plan catalogue whether deals are included
rather than hardcoding "free", so moving them into a paid tier later is a
catalogue row and not a rewrite.

### 4. The customer account — confirmed: inside the Exchange

Your boundary ruling is that the Exchange is standalone with its own business
and customer portals, while advertising, vendors and subcontractors stay in the
main app. I will follow that: an **Exchange customer account**, separate from
the main app's customer portal, sharing the same Supabase auth but its own
portal, its own tables and its own navigation.

Worth confirming, because it is the difference between a new portal and a tab
on an existing one.

## The phases

Each is useful on its own and each ends with something you can look at.

### Phase 1 — the map, signed out

The feature you asked for, with no account needed. Split in two once it met
reality, because the second half needs something from you.

**1a — search highlighting and distance. DONE.** Needs no map library and no
tiles, so it shipped first.

- A search box on the category page that **highlights** what it answers and
  **dims** the rest rather than filtering. Nothing is hidden: somebody
  searching "brake" can still see that a general garage sits two streets
  closer.
- **Distance per business, computed in the browser.** Every listing already
  arrives with its coordinates, so the only missing number is where the
  resident is — and that never leaves their device. Nothing is asked on load,
  nothing is stored, nothing is sent, and there is a button to take it back.
- Nearest-first ordering once a location is known. A listing with no
  coordinate sorts **last**, never as though it were at distance zero.
- `src/app/lib/exchangeGeo.ts` (the arithmetic, 19 tests),
  `src/app/lib/exchangeHere.ts` (the permission), and the category page wired
  to both.

**1b — the map itself. BLOCKED on two things.**

- MapLibre GL, pins from the existing public category API, clustered so 1,090
  markers do not kill the page.
- Opens on the chosen town's centre; switching town moves the map.
- A pin opens the listing card that already exists.
- "Near me" by typed town first, geolocation offered.
- **The server learns to answer "within N miles of here"**, using the
  category's own `default_radius_miles` as the default — the column that has
  been sitting there unused.
- Attribution on the map, because ODbL requires it and a map is the most
  visible place it has ever mattered.

**Blocker one: the tile key.** You chose a hosted free tier, which needs an
account in your name. I will not create one for you. MapTiler or Stadia, free
tier, and the style URL goes in one config module rather than being scattered
through the map code.

**Blocker two: installing the library.** `npm install` cannot run in this
repository *at all* — not for MapLibre, not bare. `package.json` carries 60
self-referential alias entries (`"@emotion/react@11.14.0": "npm:@emotion/react@11.14.0"`)
and npm rejects them as invalid package names. It has presumably been that way
since the Figma export.

Nothing is actually broken in production, because `vercel.json` installs with
**pnpm**, which tolerates them, and `pnpm-lock.yaml` is committed. But pnpm is
not installed on this machine, and running it here would reinstall the whole of
`node_modules` in pnpm's symlinked layout — with your other sessions and the
smoke harness sharing that tree, that is not a change I will make without you
saying so. Two ways out:

- **`npx pnpm add maplibre-gl`** — the tool the deploy already uses, lockfile
  stays consistent, and `node_modules` gets rebuilt once. Right answer, but it
  disrupts any session currently running against this tree.
### Correction: the aliases are load-bearing

I first reported that 54 of the 60 were "provably redundant" because each
duplicated a plain entry at the same version. That was true and it was not the
whole question. **Bundled code imports five of them by their aliased name**,
and one of those is everywhere:

| alias | imports in bundled code |
|---|---|
| `sonner@2.0.3` | **200** |
| `lucide-react@0.487.0` | 2 |
| `@radix-ui/react-select@2.1.6` | 1 |
| `@radix-ui/react-label@2.1.2` | 1 |
| `@radix-ui/react-checkbox@1.1.4` | 1 |

So deleting all 60 breaks the Vercel build in 205 places, and deleting only the
55 unused ones does not help, because npm still rejects the file over the five
that remain. npm cannot express these at all: an alias *name* has to be a valid
package name, and `sonner@2.0.3` is not one. **This repository needs pnpm
unless the imports are rewritten** — the generated import style, not a defect
in the dependency list, is what rules npm out.

The good news is that the rewrite is provably version-neutral: every one of the
five has a plain entry at the **identical** version, so `from 'sonner@2.0.3'`
→ `from 'sonner'` resolves to exactly the same package. It is 205 import lines
across about 200 files, mechanical, and smoke mounting 361 pages is a real
check on it. But it is a 200-file change and you approved something smaller,
so it waits for you.

**Why I am asking rather than just doing it:** there is no way back. Switching
this tree to pnpm's layout is not reversible by re-running npm, because
`npm install` is the thing that does not work — so if the pnpm install went
wrong, the repository would have no working `node_modules` and no committed
npm lockfile to rebuild one from. That is the kind of step that gets your
sign-off first.

- **Clean up the 60 alias entries** so npm works here too. They are provably
  redundant — 54 are exact self-references with a matching plain entry, and the
  other 6 name versions the plain entries already supersede. This is the better
  long-term state and it changes how every future install resolves, so it is
  your call rather than mine.

### Phase 2 — the account, and saving (not started)

- An Exchange customer sign-in, its own portal.
- **Saved businesses** — the pin you keep.
- **Enquiry history** — built from `exchange_lead_event` rows that already
  carry the customer's id. Nothing new captured; a read of their own data.
- The privacy rule holds without exception: a business may be told **how
  many** people wanted them, never **who**. The account must not weaken that,
  and I will write that as a test rather than a comment.

### Phase 3 — following, and deals (not started)

- **Follow a business** (distinct from saving: saving is a bookmark, following
  is consent to hear from them).
- **Deals**, publishable only by a claimed listing, through a review queue
  before they are visible.
- Deals from followed businesses on the customer's own page.

### Phase 4 — the map as the main surface (not started)

Only once the above is real: make the map a primary entry point rather than a
view — the thing you land on, with the category list beside it.

## Risks I will not discover later

- **Tiles are a running cost or a usage-policy breach.** Decision 1 settles it
  and nothing gets built on OSM's tile server.
- **A radius is not a boundary.** Six kilometres around Salem reaches
  Massachusetts — the compile already found a Haverhill business that way. A
  "within 10 miles" search will surface out-of-state businesses, and that is
  correct for a map and wrong for a town page. The two must not share one
  query without saying which they are.
- **Geolocation is personal data.** Never in a URL, never stored without being
  asked for, never sent anywhere but our own server.
- **1,090 pins is already enough to need clustering**, and Manchester alone is
  895 of them in a small area.
- **The lead ledger is the one thing in the Exchange that could leak a
  person.** Adding a customer identity is exactly the change that could do it
  by accident.

## What I am not proposing

- No reviews or ratings. That is a moderation commitment, not a feature.
- No chat between customer and business. The contact event already exists and
  does the job.
- No paid placement on the map. It would make the map untrustworthy, which is
  the one thing it cannot be if it is the main way people find places.

## Review — what changed in Phase 1a

Three files added, two touched. Nothing in this pass needs a map library, a
tile account or a server change, which is why it could ship ahead of the rest.

**`src/app/lib/exchangeGeo.ts`** — the arithmetic. Haversine distance in miles,
phrasing (`60 ft`, `7.3 mi`, `12 mi`), phrase normalisation, prefix word
matching, and one pass that measures and marks a whole list. Pure functions, no
React, no network.

**`tests/exchangeGeo.test.ts`** — 19 assertions. The distances are checked
against truth that does not come from the implementation: one degree of
latitude is 69.093 miles on a sphere of the earth's mean radius, and that
single fact fails for radians-as-degrees, kilometres-as-miles, a swapped lat
and lng, and a halved or doubled haversine. Asserting the function against its
own output would have caught none of them.

**`src/app/lib/exchangeHere.ts`** — the permission, and nothing more. Asks only
when pressed, reads the position once rather than watching, validates what the
browser hands back, keeps it in React state alone, and offers `forget()`.
"They said no" is its own state rather than an error, because declining is an
answer and should not be reported back as a fault.

**`src/app/pages/ExchangeCategory.tsx`** — a search box that highlights and
dims instead of filtering, a distance beside each business, nearest-first
ordering, and one honest line saying what is going on.

**`src/app/pages/exchangeBrowseStyles.ts`** — the styles for the above, as
named classes with inline-ish values, because `p-*` and `m-*` compute to 0px
application-wide.

### Two faults the tests found, both real

**Every possessive business name was unsearchable.** `normalise` turned all
punctuation into spaces, so `"Ray's Auto Body"` became `ray s auto body` and a
resident typing "rays auto" matched nothing. Apostrophes — straight and curly,
since a phone keyboard produces the curly one — are now dropped rather than
spaced, giving `rays auto body`. Half the family businesses in New Hampshire
are named this way.

**9.96 miles printed as "10.0 mi".** The format branch was chosen before the
number was rounded, so exactly one value produced a trailing zero that read
like a different unit from the "10 mi" next to it.

### The thing most worth knowing

An unplaceable listing sorts **last**, not first. Treating a missing coordinate
as distance zero would have put every business we cannot locate at the top of a
list labelled "nearest" — a failure that is both silent and exactly backwards,
which is why it has a test of its own.

## The dependency cleanup, done

Eric: *"do the import rewrite."* Done, in three steps that have to happen in
that order.

**1. The 205 imports.** Five specifiers, rewritten to their plain names across
202 files:

| was | now | sites |
|---|---|---|
| `sonner@2.0.3` | `sonner` | 201 |
| `lucide-react@0.487.0` | `lucide-react` | 2 |
| `@radix-ui/react-select@2.1.6` | `@radix-ui/react-select` | 1 |
| `@radix-ui/react-label@2.1.2` | `@radix-ui/react-label` | 1 |
| `@radix-ui/react-checkbox@1.1.4` | `@radix-ui/react-checkbox` | 1 |

Version-neutral by construction: each had a plain `package.json` entry at the
**identical** version, so the same build of the same package resolves. Only
`from`/`import`/`require(` positions were touched, so a string that merely
looks like a specifier was left alone.

**2. The 60 alias entries, removed.** The diff is deletions only, apart from
one trailing comma — `vaul@1.1.2` was the last entry in the block.

**3. The lockfile, regenerated.** This step is the one that would have broken
the deploy if it had been missed: Vercel runs `pnpm install`, which is frozen
in CI, and a lockfile still listing 60 dependencies that `package.json` no
longer declares is a hard failure. `npx pnpm@8.15.6 install --lockfile-only`
rewrote it without touching `node_modules` — 6,049 lines to 5,521, no alias
entries left, and the five packages pinned to the same versions as before.

### npm works again

`npm install` in a clean directory resolves all 616 packages from the cleaned
file. In this working tree it still complains, and that is the pre-existing
`node_modules` — built by something other than npm — rather than the manifest;
nothing needs to be installed, because that tree already holds every package at
the right version. The repository is no longer *locked* to pnpm, which was the
point.

### What I got wrong on the way

I recommended deleting the 60 aliases on the grounds that 54 were "provably
redundant" — each duplicated a plain entry at the same version. True, and not
the whole question: I had not checked whether any code imported the aliased
*name*, and 205 sites did. Deleting them on that recommendation would have
broken the Vercel build in 205 places. The check that was missing is cheap and
is the one worth remembering: before removing a dependency declaration, grep
for the thing being removed, not just for what it duplicates.

## Phase 1b — the map, built

MapLibre GL 6.14.0 is installed (with pnpm, which is what built this
`node_modules` in the first place — `.modules.yaml` and `.pnpm/` were both
already there, so adding one package was an ordinary incremental install and
not the tree conversion I had feared).

**`src/app/config/mapTiles.ts`** — the provider, the style and the key, in one
place because the plan is to change supplier later. It carries the one
condition that makes a client-side tile key safe: **it must be restricted by
origin in the MapTiler console**, or anybody who views source can spend the
allowance. With no key the module returns `null` rather than a URL with an
empty parameter, because a 403 renders as an unexplained void.

**`src/app/components/exchange/ExchangeMap.tsx`** — clustered pins, the search
highlight carried onto the map, a "you are here" marker, click a pin to select
the row and click a row to fly the map, our own zoom controls, and the
attribution both licences require.

Three decisions in it worth keeping:

- **It loads late.** MapLibre is a quarter of a megabyte and needs WebGL.
  Nothing is imported until the container is scrolled into view, and nothing is
  attempted at all without a key — so a headless browser never software-renders
  a map nobody is looking at, which is how a page becomes "slow" and then
  "hung" in the smoke harness.
- **Every failure has a visible state.** No key, no WebGL, refused tiles, no
  coordinates — each says which. An empty dark rectangle looks exactly like a
  working map of nowhere, and the list underneath never depends on the map
  succeeding.
- **Clustering is not an optimisation here.** Manchester alone is 895 listings
  in a few square miles; at town zoom the map is unreadable without it.

### The bug a browser found and a type check could not

Typing "shoe" on the Clothing & Shoes page highlighted **all forty-five**
businesses. The haystack included each listing's category names, and on a
category page every listing carries the same category — so any word from it lit
the whole list. It looked like a working feature while telling the resident
strictly less than the page already had.

The browsed category is now left out of the haystack while a business's *other*
categories stay in, because those genuinely distinguish one listing from the
next. "shoe" now highlights two of forty-five. Two tests hold it.

This is the second time in this task that the real fault was invisible to the
checks and obvious in a browser — the first being the possessive names. Both
were found by driving the actual page.

### Verified in the running app

Manchester, Clothing & Shoes, over the live edge function:

- 45 businesses listed, map container present, honest "needs a tile key" cover
- "shoe" → 2 highlighted, 43 dimmed, 0 removed
- location granted → distances 0.5, 0.6, 0.6, 0.7, 1.1 mi, nearest first, and
  the line saying the position stays in the browser
- a "Forget my location" button once a position is held

### Still needed from Eric

A MapTiler key, restricted by origin, pasted into `MAP_TILE_KEY`. Everything
else about the map is built and will draw the moment it is there.

## Phase 2 — the customer account, built

A resident's own shelf and their record of who they contacted. Small on
purpose: the Exchange is free for them for ever, so there is nothing here to
upsell and no reason to pad it into a dashboard.

### The privacy rule, held by something that can fail

The plan said this would be a test rather than a comment, because adding a
customer identity is exactly the change that leaks "who" by accident. It is:

- **`viewed` is not part of anybody's history.** The ledger records a view of
  every listing page, so a history built from all of it would be a list of
  everything somebody had so much as glanced at — surveillance wearing the
  costume of a feature, and the thing the Exchange is positioned against. The
  history keeps what a person *did*: rang, opened a website, asked for a quote.
- **`actorFilter` throws rather than returning an empty filter.**
  `exchange_lead_event` carries no row-level security — it is reached only with
  the service role — so that one filter is the whole of the protection between
  one resident's history and everybody else's. An unscoped read would return
  every enquiry every person has ever made, and there is no sensible degraded
  answer, so asking for one by accident has to be impossible.
- **A structural test that the module never grows a business-shaped function.**
  The leak would not look like a bug. It would look like a helpful export —
  `whoSaved(orgId)`, `enquirersFor(orgId)` — added by somebody building the
  business side who did not know the rule. Every function takes a *person* as
  its subject; if that stops being true the suite fails and whoever changed it
  has to say so out loud.

### What was built

| | |
|---|---|
| `exchange_saved_business` | New table. Composite key, so saving twice is idempotent. RLS on with owner-only select/insert/delete and deliberately no update — a saved business has nothing to change |
| `exchangeAccount.ts` | The rules, pure and tested: which kinds count, how each reads, the filter that must never be empty |
| `exchangeAccountRoutes.tsx` | `GET/POST/DELETE /exchange/me/saved`, `GET /exchange/me/enquiries`. Every one refuses an unidentified caller |
| `ExchangeAccount.tsx` | The page, at `exchange-account`, plus a role-switcher entry |
| `SaveBusinessButton.tsx` | On every category row |

### Verified rather than assumed

**RLS, before the migration was applied.** Rehearsed in a rolled-back
transaction: Alice saved a business, then the session became a different
signed-in user and counted the rows. Zero, including Alice's.

**The routes fail closed,** tested against production with the anon key — the
credential a signed-out visitor's browser actually holds:

    GET  /exchange/me/saved       -> Sign in required.
    GET  /exchange/me/enquiries   -> Sign in required.
    POST /exchange/me/saved       -> Sign in required.
    (no Authorization header)     -> UNAUTHORIZED_NO_AUTH_HEADER

None of `/exchange/me/*` is in `PUBLIC_PREFIXES`, and it must stay that way.

### Why the history is empty, and that is correct

`exchange_lead_event` holds 15 rows and exactly **one** carries an
`actor_user_id` — because almost everybody who has used the Exchange so far was
signed out. That one row is a `viewed`, which the rule above excludes. So every
account's history is empty today. It fills as signed-in residents actually
contact businesses; it is not broken.

### The save button is visible to signed-out people, deliberately

Hiding it until sign-in would be easier and worse: nobody would ever discover
there is a reason to have an account. Pressed while signed out it offers the
sign-in once, politely, with no modal.

## Phase 3 — following and deals, built

A resident can hear from a business, a claimed business can write a deal, and
staff decide whether anybody sees it.

### The rule this feature exists to not break

Eric's standing rule: anything a tenant publishes that reaches other people is
approved before it goes live. The enforcement is not a flag on a screen —
`businessMayMove` contains no route to `approved` from any state, so there is
no sequence of business-side requests that publishes anything. Approval lives
behind `isStaffRequest` and nowhere else.

An approved deal also cannot be edited, only withdrawn and submitted again.
Otherwise what residents see would not be what a person reviewed, and the
review would be a formality anybody could walk straight past.

### Following is not saving, and the button does not say "Follow"

Saving is a bookmark: private, silent, the business never told. Following is
consent to hear from them. Separate tables, separate verbs, and a deliberately
different-looking control.

"Follow" is a social-network word and it sets the wrong expectation — people
read it as a feed and then resent the business for appearing in one. The label
says **"Get their deals"**, which is what actually happens.

It appears only on a claimed listing, because an unclaimed one can never
publish and inviting somebody to hear from it would promise something that
cannot arrive.

### Still how many, never who

A business may be told how many people follow it. The identities are not
served, and no route takes a business as its subject and returns people. The
feed is built from the resident's side — their follow rows, then those
businesses' live deals — because the opposite shape is the same data and a far
worse habit.

### Approval is necessary and not sufficient

`isLive` checks the state **and** the window, and a malformed date makes a deal
NOT live. The tempting alternative — treating a bad end date as "no limit" —
publishes something indefinitely because a field was malformed. 17 tests.

### Pricing, when it comes

`mayPublish` asks whether deals are included in the plan rather than returning
true. Eric chose free-with-a-claim now, priced into the catalogue later; when
that day comes the answer comes from the catalogue and nothing else on the
publish path changes.

### What is not here

No public deal surface. A deal reaches residents through their own account,
which is what the plan scoped. Showing live deals on a public listing page is a
reasonable next step and was deliberately not widened into this phase.

### The smoke harness could not complete

Worth recording because it affected two commits. `npm run smoke` reports
"nothing at all" from its first batch — on clean ports, with no orphaned
listeners, after the parallel session's fix for sharing the harness. Every
module added here transforms through Vite with a 200 and typecheck is at
baseline, so it is a harness-level failure rather than a page one. The pages
were mounted directly in a headless browser instead and all rendered.

## Phase 4 — the map as a place you can go

`/exchange-places`: every business in a town, clustered, nearest first, no
category needed. 779 in Manchester, 136 in Salem, 50 in Pelham.

### It does not replace the front door

`/exchange` stays the crawlable tree of categories and names, because that is
what the free-traffic plan rests on and a map is a canvas with nothing in it
for a crawler to read. The map sits beside it, with a prominent way in placed
**above** the tree so a resident does not have to work that out.

### Three controls, three different jobs

| control | what it does |
|---|---|
| a category | **filters** — removes everything else |
| the search | **highlights** — marks what it answers, dims the rest |
| a location | **sorts** — nearest first, nothing hidden |

Only one removes anything, and it is the one a resident chose explicitly from a
list of what is actually in this town. The other two never hide a business,
because the thing a map is for is noticing what you were not looking for.

The category list is ordered **biggest first** rather than alphabetically: on a
map of a whole town the useful doors are the ones with something behind them.

### Why the server answers "this town" and not "within N miles"

A radius query needs the resident's coordinates. The whole point of the
distance work is that their position never leaves their browser, so the server
sends the town and the measuring happens locally.

The cost is real and the code says so: somebody near a boundary will not see
the shop two miles into the next town until they switch towns. The alternative
buys a shorter list with the one piece of data this directory has promised not
to collect. If that trade is ever revisited, this is the paragraph to argue
with.

### The plan is now built

Phases 1 to 4 are all live. What was deliberately left out:

- **No public deal surface.** A deal reaches residents through their own
  account. Showing live deals on a listing page is the obvious next step.
- **No reviews or ratings**, no chat, no paid placement on the map — all three
  were ruled out at the start and nothing since has changed the reasoning.
- **The last 131 uncategorised listings** are still one-offs, better fixed by
  businesses claiming their listings than by more tag mapping.
