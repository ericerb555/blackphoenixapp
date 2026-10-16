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

---

## Built: the upkeep clock — and the bug that was the real answer

2026-10-16, after Eric asked: *"how is the ai automation to keep adding town to
the phoenix exchange doing i done see any new towns added or adding?"*

### The finding was not the missing clock

Hudson and Windham existed as territory rows, both `hidden`, both holding
**zero** listings. The obvious reading was that nobody had pressed compile.

**They could not have been compiled.** `ingestTerritory` selected the territory
with `.eq("status", "active")`, and the documented flow creates a town HIDDEN —
`ExchangeTowns.tsx` says so in its own header, and the screen tells you after
creating one: *"X is open and hidden. Compile it, then show it when it is worth
visiting."* Compiling it threw `no such territory`, every time. Step three of a
four-step flow could never run, and the only way round it was to promote an
empty town to residents — the precise thing hiding it exists to prevent.

The filter was copied from the read path, where it is right. Nobody chose it.

So two towns sat opened-and-empty with nothing anywhere reporting why, which is
the same shape as the question that found it: the absence of a thing is
invisible unless something is built to say so.

### What now exists

- `exchangeUpkeep.ts` — which town next, and when to leave Overpass alone.
  Never-compiled towns rank ahead of every stale one; ties break on slug so the
  choice is deterministic; and **doing nothing is a real outcome**, recorded as
  one. 21 hand-written tests.
- `exchangeUpkeepRoutes.tsx` — `POST /exchange/cron-tick` behind a shared
  secret that refuses everything while unset, plus `GET /exchange/upkeep/status`
  and `POST /exchange/upkeep/run` for staff.
- `exchange_territory.last_compiled_at`, backfilled from the newest listing per
  town — an understatement of the truth, deliberately, so the error costs an
  extra Overpass query rather than a town going silently unrefreshed.
- The schedule. Written as
  `20261016140000_schedule_exchange_upkeep.sql.pending`, then **armed on Eric's
  instruction the same day** — job 10, `exchange-upkeep`, 04:40 UTC daily,
  after the route was proved deployed and the secret proved non-null.

**Daily, not weekly, for a weekly refresh.** With five towns and a seven-day
window a weekly tick takes five weeks to reach the fifth town. A daily tick
that usually does nothing reaches each town every seven days and costs four
cheap no-op requests a week.

### OPEN: the ingest gets 406 from Overpass, and the clock cannot do its job

**Deferred on Eric's decision, 2026-10-16: "leave it until overpass is
answering."** Recorded here rather than remembered, because the symptom is a
job failing quietly every night at 00:40.

The first real tick failed. Not a timeout — 906ms — and the message said
"Overpass did not answer", which was itself wrong and is fixed: `safeFetch`
sets `error` only when a request never completes, so a real non-2xx answer was
being reported as unreachable with the status discarded. It now says what it
got, which is **406**.

406 is what Overpass returns to a caller sending no User-Agent, and
`exchangeIngestRun.ts` has said so in a comment since it was written. Proved
both ways from a workstation on the day:

    with a User-Agent      times out — the endpoint is at capacity
    without a User-Agent   406 — exactly what the server receives

So the server's requests arrive with no User-Agent although the code sets one.
What this rules out: the build step is faithful — `server-dist` carries
`headers: { Accept: ..., ...(init.headers || {}) }` intact — and the geocoder
in `exchangeTerritoryRoutes.tsx` sets a User-Agent on a plain `fetch` and
works, which is how Hudson and Windham got their coordinates. The likely
mechanism is the edge runtime overriding the header: Nominatim tolerates a
default agent, Overpass does not.

**Why it was not fixed on the spot:** no fix can be confirmed while Overpass is
at capacity, because a correct User-Agent gets no answer either. Shipping an
unverifiable change to the one path that rewrites the directory is how a second
bug gets hidden behind the first.

**How to tell when it is worth picking up:**

    curl -s -m 25 https://overpass-api.de/api/status \
      -H "User-Agent: PhoenixExchange/1.0 (contact blackphoenixbuilds@proton.me)"

A slot report means it is answering. A "currently at capacity" page means wait.
When it answers, the test is a single tick — `POST /exchange/upkeep/run` — and
a 406 that persists against a confirmed-answering endpoint proves the header,
while a success means capacity was the whole story.

**What the clock does meanwhile, which is the part that is not broken:** it
records each failure, leaves Hudson at the front of the queue rather than
deferring it a week, and reports the reason on the Automation tab. Nothing
accumulates and nothing is lost. It is a job that cannot currently succeed, not
a job doing damage.

### Still not done, and now visible rather than assumed

The **category review queue** for the 131 uncategorised listings is not built.
It is reported on the Command Center's new Automation tab as a gap rather than
left to be rediscovered.

The clock still **never opens a town and never promotes one** — Eric's
decision, unchanged. The second half of "make the ledger able to answer next
time" is also still open: 3 of 413 demand rows now carry a phrase, up from
zero, so the box is being used, but every row still names a town we already
cover.
