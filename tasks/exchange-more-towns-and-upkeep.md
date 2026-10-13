# More towns, and something that keeps them current

Eric: *"lets add more towns and maybe have an ai assistant to add them and then
keep everything up to date?"*

A plan to agree before any of it is built.

## More already works than I expected

| already there | what it means |
|---|---|
| **`exchange_territory`** — slug, name, state, `postcodes[]`, `center_lat/lng`, `status` | a town is a row, not a code change |
| **`POST /exchange/ingest/:territory`** — staff only, **dry run by default**, `apply: true` to commit | adding a town's businesses is already one call |
| **`mergeListing`** | the property that makes repeat runs safe, below |
| **`fillMissingCategory`** | adds a category only when a listing has none, so a re-run cannot pile a second one on |
| **`npm run check:exchange-map`** | catches a tag mapping that resolves to nothing — in the pre-commit set |
| **`exchange_demand_event`** | every search that found nobody, with the town. This is the answer to "which town next" |
| **pg_cron + `net.http_post`**, now with explicit 30s timeouts | the scheduling is already proven, six jobs running |

### Why repeat runs are safe, in one paragraph

`mergeListing` is the only place that decides what a re-import may change, and
it refuses three ways. A **claimed** listing returns `{}` — nothing is touched,
ever. A listing whose source is not `registry` returns `{}` — a human made it,
so a scraper does not get to edit it. Otherwise it only *fills empty fields*:
`if (!current && incoming)`. A phone number we already have is never replaced
by one from OpenStreetMap.

That is the single property that makes "keep everything up to date" a sane idea
rather than a way to overwrite the businesses who actually turned up. It should
be the first thing anyone re-reads before changing the ingest.

## The blocker, and it is small

**`LAUNCH_TOWNS` is hardcoded** in `src/app/lib/exchangeTowns.ts`. Adding a
town today needs a code change, a commit and a frontend deploy — which is
exactly what your rule about settings taking effect everywhere the moment they
are saved rules out. The file's own comment already says so: *"Hardcoded
because no route serves the territory list yet. When one exists, this becomes a
fetch and the shape stays the same."*

Nothing else should be built until that is true, because every other piece
would otherwise end in "…and then Claude edits a constant and redeploys".

## What "an AI assistant" should and should not mean

Worth being straight about this, because most of the work here is not AI and
calling it that would oversell it.

**Deterministic, and better for being so:** the Overpass query, the tag→category
mapping, deduplication, the merge rules, the insert. These have exact right
answers and a language model would only add a way to get them wrong.

**Genuinely worth a model, three places:**

1. **Which town next.** `exchange_demand_event` already records every search
   that found nobody, with the town it was made in. That is a real signal and
   nobody is reading it. Mostly arithmetic, but the judgement of "this looks
   like a town worth opening" is a sensible thing to be advised on.
2. **The one-off categories.** 131 listings are still uncategorised — tailors,
   sign shops, tanning salons. A model can propose a category per listing for
   you to accept or reject in a batch. It must *propose*, never apply: a wrong
   category is invisible and sits there for months.
3. **The report.** A run that says "+412 listings, 38 filled, 9 uncategorised"
   is a log. A readable account of what changed and what looks wrong is worth
   a model and is the thing you would actually read.

**What it must never do:** invent a business, a phone number or an address;
decide a category without review; or open a town on its own if you have said
otherwise. Everything it writes is either reversible or reviewed.

## The shape I would build

### 1. Towns come from the database (prerequisite)

A public `GET /exchange/territories` returning active towns, and
`exchangeTowns.ts` becomes a fetch with the hardcoded list as the fallback for
a failed request. Small, and it unblocks everything else.

### 2. Adding a town becomes one reviewed action

A staff screen that takes a town name, finds its centre and postcodes, runs the
ingest **as a dry run**, and shows what it would create. You press apply. The
route already supports exactly this; it has no screen.

A town stays `status = 'pending'` until it has enough listings to be worth
visiting — a town with nine businesses reads as a broken product, not a new
one. It appears in the switcher when you promote it.

### 3. Upkeep runs on the clock, and reports

A seventh cron job refreshing one town per run, slowest-first, because
**Overpass rate-limits hard and has already refused us once** — the first
fetcher fired twelve queries back to back and was blocked. One town per tick,
with backoff, is the shape that survives.

Each run writes a record: what it added, what it filled, what it could not
categorise, what it skipped because somebody had claimed it. That is your
standing requirement that anything running autonomously has a place you can
review and a channel where it asks.

### 4. The assistant proposes, you dispose

A queue of suggestions — towns worth opening, categories for the uncategorised,
listings that look closed — each with an accept and a reject. Nothing in it
takes effect until you press something.

## What this will cost, honestly

- **Each new town adds uncategorised one-offs.** Manchester left 131 across
  three towns; ten towns will leave several hundred. The fix is businesses
  claiming their listings, not more tag mapping, and the assistant's category
  suggestions are a stopgap rather than a solution.
- **Overpass is free and rate-limited.** Ten towns is ten times the fetching.
  Refreshing all of them nightly is not realistic; weekly, one per tick, is.
- **The map sends a town at a time.** 779 places in Manchester is fine. "All
  towns" across ten would not be, and nothing should offer it.
- **More towns, more claim review.** Most compiled listings can reach only one
  verification category, so they land in `needs_review` — which you already
  agreed to work. Ten towns makes that queue ten times longer.

## Decisions I need before building

1. **Which towns?** Name them, or let the demand ledger propose and you pick.
2. **Does a new town go live on your say-so, or automatically once it has
   enough listings?** I would default to your say-so.
3. **How often should the refresh run?** Weekly per town is my suggestion.
4. **Should the assistant propose categories for the 131 uncategorised**, or is
   that better left to businesses claiming their own listings?

## Decisions, and one that cannot be honoured as asked

Answered 2026-10-13.

| decision | answer |
|---|---|
| Which towns | let the demand ledger propose — **see below, it cannot** |
| Going live | **only when Eric says so** |
| Refresh | **weekly, one town per tick** |
| The 131 uncategorised | **propose as a review queue**, nothing applied without a press |

### The demand ledger cannot propose a town, and the reason is structural

It holds 410 rows, all from the last thirty days. None of them can tell us
where to open next, for two reasons that no amount of waiting will fix:

- **Zero rows carry a phrase.** Nobody has used the "tell us who is missing"
  box. Every row is a category view, not a typed request.
- **Every row names a town we already cover.** A resident chooses from the
  towns we offer, so the ledger can only ever record demand *inside* the three
  we have. It is structurally incapable of saying "people in Nashua wanted
  you".

There is no other signal either: `companies` holds two rows, both Eric's own,
both Salem.

What the ledger *can* say is which categories are thin where we already are —
Pelham returned nothing on 48 of its 90 category views, which is what a town of
fifty businesses looks like. That is a real finding and a different question.

**So the honest options for choosing towns are:**

1. **Geography and population.** Adjacent New Hampshire towns, biggest first —
   Nashua, Derry, Londonderry, Hudson, Bedford, Merrimack. Deterministic, and a
   contiguous region makes boundary-crossing searches start working.
2. **Make the ledger able to answer next time.** Add "somewhere else" to the
   town switcher so a resident can name where they are. Small, and it turns the
   ledger into exactly the signal Eric asked for — for the town after next.

Both are worth doing. The second is the one that makes the original answer true
eventually.

### `hidden`, not `pending`

The plan proposed a `pending` status for a town that is ingested but not worth
visiting. `exchange_territory` already constrains status to `active` or
`hidden`, so `hidden` is that state and no migration is needed.

## Built: towns come from the database

`GET /exchange/territories` serves active towns with their centres, and
`exchangeTowns.ts` fetches it. `FALLBACK_TOWNS` survives only for a browser
that cannot reach the server — an empty switcher would read as "the Exchange
covers nowhere", which is worse than a slightly stale list.

**Proved by adding a fourth town to the database and watching it appear with no
deploy of anything**, then removing it:

    towns: Manchester, Pelham, Salem, Test Town

The directory's subtitle is built from the same list, so a fourth town does not
leave that sentence quietly lying about where the Exchange operates.
