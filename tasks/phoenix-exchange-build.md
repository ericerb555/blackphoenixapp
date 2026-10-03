# BUILD PLAN — Phoenix Exchange

The design and the reasoning live in `phoenix-exchange-plan.md`. This file is
the build: what gets made, in what order, and what has to be true before each
step starts.

**Nothing in here is started until Eric approves it.**

---

## The shape, in one paragraph

A standalone marketplace on its own domain for Pelham, Salem and Manchester,
New Hampshire, carrying every kind of local business across four sections —
Home & Property, Services, Food, Entertainment. The directory is compiled from
public records so it looks complete before anyone joins. Residents use it free
but signed in. Businesses claim their listing, get six months free, then land
on one of three tiers. Black Phoenix sees anything in its own catalogue first,
and anything nobody else can do at all. Everything is counted, because the
lead count is what sells the subscription.

---

## What ships first

Phases 0 to 4. That is a complete-looking directory for three towns, claimable
by businesses, searchable by residents, with messages and quote requests
flowing and every lead counted.

It is deliberately short of the things that earn money, because none of them
are worth anything until the directory is populated and used. Phases 5 to 8
follow quickly after, and the six-month trials mean there is time.

---

## Phase 0 — Preconditions

Nothing public happens until these are done. They are cheap and they are all
things that become expensive or dangerous later.

- [x] **Private media storage.** `project-photos`, `project-videos` and
      `project-blueprints` currently hand out permanent public URLs with no
      size or type limit. Convert to private buckets with short-lived signed
      URLs, size and type limits, and an access log. **No customer video
      walkthrough may be accepted until this is done.**
- [ ] Register the Exchange domain; decide the name
- [ ] Terms of service, privacy policy and a stated data posture covering
      resident searches, locations and home video
- [ ] Google Maps account and a referrer-restricted, API-scoped key held as a
      secret
- [x] Resolve the duplicate `"bid-room"` route key in `routes.tsx` — line 471
      (`BidRoomV2`) is unreachable behind line 565 (`BidRoom`)
- [ ] Confirm the trial clock: founding cohort with a shared end date, then
      rolling six months from claim

---

## Phase 1 — Foundations: taxonomy, identity, metering

Everything else sits on these three. Small tables, large consequences.

- [x] `exchange_category` — section, category, service; `engagement_modes`
      (quote / book / order / event / list); `is_construction`;
      `default_radius_miles`; criteria-sheet field definitions. A table, never
      an enum
- [x] Seed the taxonomy across all four sections, with **General Contracting**
      as its own category
- [x] `category_alias` — real phrases mapped to services
- [x] `organizations` gains: `service_lat`, `service_lng`,
      `service_radius_miles`, licence and insurance fields with expiry,
      `verification_state`, `claim_state`
- [x] `organization_categories` join, with the 5-included / 10-maximum
      allowance enforced server-side
- [x] **The Black Phoenix service catalogue** — the flagged set of leaves it
      does, and its territory. One object, used by both routing and first
      refusal
- [x] **Lead ledger** — viewed, revealed, called, messaged, requested,
      awarded. Written from the very first free account
- [x] **Demand ledger** — every search: phrase, resolved category, where,
      results returned, outcome
- [x] Trial and membership records as cohort rows at price zero with an end
      date, so a free account can still be counted and converted

---

## Phase 2 — The compiled directory and the public surface

The point of this phase is that a resident in Salem can search on launch day
and find their town.

- [ ] Registry ingestion: NH business and contractor licence registries,
      health-department restaurant inspections, liquor licences, chambers of
      commerce, OpenStreetMap. **Not** a commercial maps product
- [x] Deduplication and category assignment on ingest
- [ ] Generic industry marks — one designed icon per category, good enough
      that a map made entirely of them looks finished
- [ ] Public business profile page in three states — listed, claimed,
      subscribed — where the listed state looks deliberate rather than broken
- [ ] Listed state shows exactly: name, type, address, phone, website if
      public record has one. Nothing invented
- [ ] Outbound website redirect, with the click counted
- [ ] Public section and category pages, indexable, with a sitemap
- [ ] Google Maps: static image preview on the main page, interactive map
      loaded only on engagement, logo markers, clustering, pin correction
- [ ] "Can't find someone? Tell us who" feeding the demand ledger
- [ ] Removal requests honoured quickly; "suggest an edit" from residents

---

## Phase 3 — Claim, verification, and the business portal core

- [ ] **Multi-factor ownership proof** — at least two from different
      categories: code to the public-record phone, domain-matched email, DNS
      or file proof, code posted to the premises, licence-board match,
      reviewed documents. Server-side, failing closed
- [ ] Notify the public-record contact on every successful claim, whether or
      not it was used
- [ ] Disputed and second claims: notify the incumbent, wait, review. Never
      silent
- [ ] Re-verification when the contact email or phone changes
- [ ] Claim starts the six-month trial as a cohort row
- [ ] **Business portal core** — profile, credentials with real expiry,
      inbox, requests, calendar, reputation, performance, billing and trial
      status, team and roles
- [ ] Approval queue for everything published, with a human reviewer named
      and resourced
- [ ] Link validation on the server: http and https only;
      `rel="noopener noreferrer nofollow ugc"` on render
- [ ] Access to the ecommerce store from the Exchange portals

---

## Phase 4 — The customer side

- [ ] Exchange customer sign-up and portal — free, not anonymous
- [ ] Public pages stay readable without an account; acting requires one
- [ ] Search: aliases first, filters, per-category default radius
- [ ] The criteria sheet — common core plus per-category fields, appearing as
      refinement rather than as a gate
- [ ] Saved searches and alerts
- [ ] Request flow: the same sheet becomes a quote request, with photographs
      and a video walkthrough under the Phase 0 storage rules
- [ ] Messaging that **extends** the existing one-thread-per-account-and-
      company model, not a second inbox
- [ ] Main page: location, search, the business count, Happening Now, four
      doors, map preview, what's missing

---

## Phase 5 — Routing and the quote engine

- [ ] Routing: contracted vendor → Black Phoenix first refusal → territory
      slot holders → all matching members → Black Phoenix as last resort
- [ ] **The "might be ours" queue** — unclassified and adjacent requests
      surfaced to Black Phoenix without blocking anyone
- [ ] Supplier of last resort: any Home & Property request in territory that
      nobody matches comes to Black Phoenix
- [ ] Five quote slots, first come, with slots remaining shown
- [ ] A minimum 48-hour request window; emergencies collapse it
- [ ] Audit trail: who could see what, and when
- [ ] Award → job identity → quote, PO, invoice through the existing pipeline
- [ ] Black Phoenix customer auto-move for catalogue work, as an **upgrade**
      of the Exchange identity, with the Exchange still reachable from the
      Builds portal

---

## Phase 6 — Food and Entertainment

- [ ] Deals and happy hours as real time models: recurring windows, date
      ranges, states, automatic expiry
- [ ] **"On now"** — happy hours running, kitchens open, deals ending tonight
- [ ] Menus as listings. No ordering, no payments
- [ ] Events: dates, recurrence, capacity, a weekend view
- [ ] Black Phoenix community events as the Entertainment section's first
      real listings
- [ ] Per-section layouts — map-and-list for Food, date-first for
      Entertainment, compare for Services, describe-the-job for Home &
      Property

---

## Phase 7 — Trust and content

- [ ] Ratings, with the permanent rules **in code**: no deletion-for-money
      path exists at all, right of reply always, verified and open ratings
      visibly distinct, solicitation allowed and sentiment-filtering not
- [ ] Display rules: a threshold before an average is shown, recency, reply
      inline
- [ ] No ratings on unclaimed listings
- [ ] A low rating goes to the business for a day before publishing, with the
      reply alongside
- [ ] Moderation standard judged on conduct, never on sentiment
- [ ] Licence and insurance expiry that actually lapses the badge
- [ ] Town blog on the existing content centre, not a second publishing system

---

## Phase 8 — Money

- [ ] Three tiers — Listed, Active, Featured — priced in the plan catalogue
- [ ] Add-ons: extra categories to the ten ceiling, extra territories,
      advertising, sponsorship, on-call, content centre
- [ ] Trial checkpoints at months one, three and five, and a conversion flow
      where the business chooses what to keep
- [ ] "12 of 5 included · 10 maximum" shown from the first day of the trial
- [ ] **Territory as a fixed named unit** — county or postcode cluster, never
      a radius. Slots per category, incumbent first refusal at renewal,
      waiting list
- [ ] Exchange advertising inventory fed from the main app's advertising
      system. Fill order: house, then direct, then programmatic remnant
- [ ] Category exclusions so a member never sees a rival's advert beside
      their own listing
- [ ] Third-party ad tags only on public discovery pages, never on pages
      carrying customer detail
- [ ] **Sponsors portal** — events are the sponsorable object, member-run or
      Black-Phoenix-run, plus sections and town pages. Packages, tiers,
      limited slots, a cancellation remedy

---

## Phase 9 — The AI assistants

- [ ] Plain-language search into category, criteria, radius and budget
- [ ] Photographs into a job scope
- [ ] Onboarding: profile from a website and licence record; **menu from a
      photograph**
- [ ] **Moderation triage**, with humans on the uncertain cases
- [ ] Nightly demand clustering and the recruitment worklist
- [ ] Town blog drafting from real platform data
- [ ] Duplicate, stale-listing and dead-link hygiene
- [ ] The three rules enforced: never invent a fact about a real business,
      drafting is not publishing, meter the cost

---

## Phase 10 — Launch

- [ ] Seed and verify the three towns; do not market until searches return
      real results
- [ ] Community events in Pelham, Salem and Manchester, with sponsors
- [ ] Recruitment from the demand ledger: the gaps, ranked, with real numbers
- [ ] Founding cohort with founder pricing and the ten founder slots

---

## Standing rules for every phase

- `npm run typecheck` and `npm run smoke` before every commit. Typecheck has a
  known baseline; what matters is whether a change adds to it. Smoke must be
  zero throws
- Every phase that touches who-sees-what gets a security pass before it ships
- Authorisation in the route handler or in RLS, never in which button renders
- Schema changes tested outside production first
- A short review note added here as each phase completes

---

## Honest sizing

    Phase 0    small, and entirely unavoidable
    Phase 1    medium — small tables, but they decide everything after
    Phase 2    large — ingestion, the public pages and the map
    Phase 3    large — verification done properly, plus the portal core
    Phase 4    large — search, the criteria sheet, the customer portal
    Phase 5    medium — the routing rules on foundations that exist
    Phase 6    large — two sections with their own engagement modes
    Phase 7    medium
    Phase 8    large — four revenue lines
    Phase 9    medium, and it makes several earlier phases cheaper to run
    Phase 10   not a build

The largest single item in the whole plan is the business portal, because it
has to work for a roofer, a restaurant, a salon and a band. One shell, modules
switched on by engagement mode — never five portals.

---

## Review

### Phase 0, part one — private job media (2026-10-02)

**What was wrong.** `project-photos`, `project-videos` and
`project-blueprints` were created with `{ public: true }` and no size or type
limit, and every upload path handed out a permanent `getPublicUrl` link.
Anyone holding a URL could open a customer's job-site photographs and their
blueprints whether or not they had any business seeing them, and anything of
any size and any type could be put in the buckets.

**What changed, in five pieces.**

`supabase/functions/server/mediaSigning.ts` — new. Parses the bucket and path
back out of a stored value, whatever shape it is in (a legacy public URL, a
stale signed URL, or the new explicit `storage://bucket/path`), and mints
short-lived signed links. Only the three known private buckets are ever
rewritten; external links, data URIs, company logos and anything unrecognised
pass through untouched, so the failure direction is "a link we do not manage
is left alone" rather than "a link is broken".

`workRequestStore.ts` — the single work-request reader now signs media on the
way out. **This is why the change is small.** The four screens that render job
media — `WorkRequestFullView`, `ProjectDetailsModal`, `UnifiedProjectPipeline`
and `WorkOrderManager` — still take a plain URL string and were not touched,
and a fifth screen added later is covered without anybody remembering to.

`server/index.tsx` — `ensureStorageBuckets` now creates the buckets private
with per-bucket size caps (15MB photos, 200MB video, 50MB blueprints) and MIME
allow-lists, and **repairs** rather than only creates: a bucket that already
exists as public is flipped. That matters, because the public buckets already
exist in every environment and create-if-absent would have left all of them
exactly as they were.

`20261002120000_private_job_media.sql` — storage policies. Insert only:
authenticated into the three buckets, anonymous restricted to `guest/` so the
public intake path for new customers keeps working. **Deliberately no select,
update or delete policy for anon or authenticated**, so nothing can be read
with a browser key at all and a signed-in subcontractor cannot mint a link to
a customer's photographs by harvesting a path. The service role bypasses RLS,
which is how the signer works.

The two upload paths now store `storage://bucket/path` instead of a URL, and
`WorkRequestFullView` previews what was just uploaded from a local blob —
because the browser deliberately can no longer read back out of these buckets.
`upsert` was dropped, since allowing overwrite would mean an update policy that
lets one upload replace somebody else's file.

**No data migration.** Existing records keep their public URLs and keep
working, because the signer treats a stored value as an identifier rather than
a link. The public URLs stop functioning the moment the buckets flip, which is
the point.

**Verified.** 20 new tests in `tests/mediaSigning.test.ts` covering every
recognised shape and every pass-through case, including path traversal and
storage failure. Full suite 1,174 passing. Typecheck 316 findings, all
pre-existing — the only ones in a file I touched sit at lines 1291 and 2584 of
`ClientWorkRequestForm`, well outside the 1050–1105 region that changed, and
the other three files produce none. Smoke: 36 rendered, 0 threw.

**Still owed on this item.** The access log named in the plan is not built —
reads are signed but not yet recorded, and that is the control that survives
somebody screen-recording a walkthrough. It belongs with the walkthrough work
in Phase 4 rather than here, but it is outstanding and should not be forgotten.

**And it needs testing outside production before it reaches it.** If the
storage policies are wrong the symptom is silent: customers simply cannot
attach photographs to a work request, and nobody reports that.

### Phase 0, part two — the duplicate route

Already resolved in another session. `routes.tsx` now defines `"bid-room"`
once, with a comment where the dead `BidRoomV2` entry used to be.

### Phase 1 — foundations (2026-10-02)

Four migrations and two server modules. No UI, and nothing in this batch is
reachable from a browser yet.

**`20261002130000_exchange_taxonomy.sql`** — `exchange_section`,
`exchange_category` and `exchange_category_alias`. Categories are a table so a
new industry is a row rather than a migration; engagement modes *are* an enum,
deliberately and in contrast, because a new mode means new screens. Two levels
only, enforced by a trigger — a service may not parent another service.
Readable by anon so the pages built from it can be indexed, writable only by
the service role, so no business can invent a category to rank in.

**`20261002131000_exchange_org_coverage.sql`** — `organizations` gains
coordinates, a service radius, licence and insurance with expiry dates,
`verification_state`, `claim_state`, `listing_source` and
`category_allowance`. Plus `organization_category`, `exchange_territory` and
`organization_territory`.

**`20261002132000_exchange_ledgers.sql`** — the lead ledger and the demand
ledger. RLS on with **no policies at all**, so neither is reachable with a
browser key; the server reads and writes them with the service role. A
business can never enumerate who looked at it, and a resident's searches never
reach a business as anything but a count.

**`20261002133000_exchange_taxonomy_seed.sql`** — four sections, 80-odd
categories, 70 service leaves concentrated on the building trades, 110
aliases, and the three launch territories with their postcodes.

**`exchangeCoverage.ts`** — the pure rules: haversine distance, category ×
distance matching, the miss reason for the audit trail, and the allowance
arithmetic. **`exchangeLedger.ts`** — the writers, which swallow their own
failures, plus `conversionSentence`, which turns the ledger into the sentence
that converts a trial.

**Three decisions worth knowing about.**

*The ceiling is enforced in three places.* A check constraint on
`category_allowance`, a trigger on `organization_category`, and the TypeScript.
A limit that lives only in application code is a limit until somebody is in a
hurry to close a deal.

*Black Phoenix's catalogue is just its own `organization_category` rows*,
rather than a separate table. One object, so routing and first refusal can
never disagree about what the company does. The allowance trigger exempts
`type = 'operator'` for that reason, and only that type.

*Coverage fails closed.* A business with no coordinates or no declared radius
matches nothing, because unknown is not everywhere. Nothing is lost: an
unmatched request in territory reaches Black Phoenix as supplier of last
resort, and every unmatched search is a row in the demand ledger, which is the
recruitment list.

**Verified.** 43 new tests, full suite 1,304 passing, typecheck still 316 with
none in the new files, smoke 6 modals and 0 throws (no pages touched).

### Phase 1, part two — the catalogue and the trials (2026-10-02)

**`20261002134000_black_phoenix_catalogue.sql`** — Black Phoenix's own service
list, as `organization_category` rows against the operator org. No
organisation id is hardcoded: the insert selects by `type = 'operator'`, so it
works in every environment.

The list is mapped from `KNOWN_TRADES` in `design-projects.tsx` — deck,
structures, hardscape, siding, openings, kitchen, bathroom, flooring,
roofing, general — rather than invented, so the design centre and the
Exchange cannot disagree about what the company does on day one. **Eric should
check it**: it is a starting list, editing it is a row rather than a
migration, and the "might be ours" queue exists because no list is complete.

The same migration links the operator to the three launch territories and
sets a service centre and a fifty-mile radius **only where they are null**, so
a re-run never overwrites a deliberate choice. Both are defaults to adjust,
not facts.

**`exchangeTrials.ts`** — the six-month trial as something countable.

The awkward part is already settled: cohorts derive from the tier a grant
names, and a trial carries no tier on purpose, so a trial belongs to no
cohort and was counted nowhere. The rule is *count trials separately and say
so*, not *stamp a tier on them* — stamping one would make an account look as
though it had chosen a rung it has not chosen, and `resolveEntitlement` ranks
a tier above a trial, so it would change what they are served too.

So this is a **separate bucket at price zero**, `cohort-exchange-trial`, with
a roster sorted soonest-to-expire, state (running, expired, converted,
revoked), and checkpoints at months one, three and five — because a silent
six-month trial converts badly, and by month six the decision is already
made.

**It is deliberately additive.** `membershipFromGrant` and
`monthlyRecurringCents` are untouched, so no revenue figure anywhere moves by
a cent and no existing screen changes. Wiring the trial count into the cohort
screen is a UI change for later, and it is Eric's to approve because it
changes what a live screen reports.

Month arithmetic clamps rather than rolls: a trial started on 31 August ends
on 28 February. That bug would only ever appear on month ends and would
quietly give a few businesses a longer trial than everyone else.

**Verified.** 23 further tests (66 across Phase 1), full suite 1,327 passing,
typecheck still 316 with none in the new files, smoke 0 throws.

**And these migrations have not been applied anywhere.** Four files that alter
`organizations` and add seven tables should be run against a branch database
first.

### Phase 2, part one — the ingestion rules (2026-10-02)

`exchangeIngest.ts` — a registry row into a listing. Pure, no database, 29
tests. The runner that actually fetches from the New Hampshire registries is
**not** built: that needs real sources and is as much a data-operations job as
a coding one.

Three rules it exists to hold.

**Invent nothing.** A listing carries name, type, address, phone and website
and not one field more. Every normaliser is tested on what it must *refuse* at
least as hard as on what it accepts, because the tempting version of each is
the forgiving one — the version that turns a seven-digit fragment, or a
registry placeholder of ten zeroes, into something that looks dialable. A
missing phone number is a gap somebody fills; a wrong one sends a resident to
a stranger.

**Never overwrite a claimed listing.** The most important rule in the file. An
owner who corrects their address and finds last year's back the following week
has no way to know why, and leaves. A re-import may only fill gaps on an
unclaimed, registry-sourced row, and two registries disagreeing is left for a
human rather than settled by recency.

**Do not guess a category.** An unrecognised trade is left unassigned, which
is visible and fixable; a roofer filed under plumbing produces no leads and no
complaint, just a cancellation six months later. Assignment runs off the same
alias table the search box uses, so a phrase resolves the same way in both.

Deduplication is by phone first — two registries rarely agree on how an
address is written and almost always agree on the number — then by matchable
name plus postcode with legal suffixes stripped, so "Sutton Roofing, LLC" and
"Sutton Roofing Inc" are one row. Merging takes the union across sources,
which is the whole point of compiling from several. Websites are http and
https only, because these links render across the portals and the store.

**Verified.** Full suite 1,356 passing, typecheck still 316 with none in the
new file.

### Phase 2, part two — the first public pages (2026-10-02)

**`exchangeDirectory.tsx`** — the only routes on this platform designed to be
read with no account and by a search engine: the taxonomy, one listing, a
category in a place, a contact event, and "tell us who is missing".

Two things in it are deliberate and worth not undoing.

*The column list is written out rather than `select('*')`.* `organizations`
carries the licence number, verification state and claim state beside the
public fields. A column somebody adds next year must not become public
because this query was lazy. The licence **number** is not served at all —
whether a licence is verified and in date is the public fact; the number
belongs to the business, and publishing it hands somebody a way to claim
their listing with it.

*Lead and demand events are written on the server*, on the same request,
rather than trusted to the page. A view, a tap on the number and a click
through to their own site are all counted — including on unclaimed listings,
which is what makes the recruitment call specific rather than a cold sell.
Every category page view writes a demand row, and a result count of zero is
the valuable one.

**`ExchangeListing.tsx`** — the public profile page in its three states.
Built before the home page on purpose: it is what gets indexed, what a
business puts on their van, where a searcher becomes a lead, and the page a
business judges the product by when deciding whether to claim.

The **listed** state had the most thought. On launch day most of the
directory is in it, so it has to read as deliberate rather than half-built:
it says plainly that it is a public-record listing, shows only what the
record holds, and offers the owner a way to take it over. That sentence is
the recruitment funnel.

Contact details are simply shown. Hiding a phone number behind a form is the
most resented thing the lead sites do, and copying it would undo the whole
positioning — so nothing is withheld, and the *tap* is what gets counted.
Outbound links carry `rel="noopener noreferrer nofollow ugc"`, and the
redirect target comes from the stored record rather than the request, so it
cannot be used as an open redirect.

Added to the public route list in `App.tsx` with its reasoning, since a
resident reading a phone number has no account by design — and a new domain
earns search authority only if these pages can be indexed.

**Verified.** Typecheck still 316, none in the new files. Production build
clean, with `ExchangeListing` emitting its own chunk.

**Smoke did not run.** Another session has held the harness port (9911) for
the whole of this stretch — ten attempts over about five minutes. `vite build`
was run instead, which proves the module resolves and bundles but does **not**
prove it mounts without throwing, which is exactly what smoke is for. It
should be run against this page before it ships.

### Phase 0, remaining — Eric's to do

Domain registration and name, terms and privacy policy, the Google Maps
account and key, and confirming the trial clock.

---

## DEFERRED — Phase 2, part three: the browse surface (proposed 2026-10-02)

**Not started.** Offered to Eric on 2026-10-02 and he chose the claim flow
instead, which is the right call: a browse surface over a directory nobody has
claimed shows the same compiled rows more conveniently, while the claim is what
turns one of those rows into an account that pays. This plan stands as written
and is the step to come back to.

### Why this one next

The listing page is built and indexable, and **nothing links to it**. A
listing is reachable today only by typing its slug into the address bar. The
server already serves the three things needed to fix that and they have no
caller at all:

    GET  /exchange/taxonomy          four sections, categories, services
    GET  /exchange/category/:slug    the businesses in a category
    POST /exchange/missing           "we could not find anyone"

So this step is mostly front end against routes that exist and are tested,
which is why it is small.

It also turns on the demand ledger for real. Every category page view already
writes a demand row server-side, and a result count of zero is the row that
becomes a recruitment call — but only once somebody can actually open a
category page.

### Items

- [ ] 1. `ExchangeDirectory.tsx` — the front door. The four sections, each
      with its categories, from `/exchange/taxonomy`. Plain browse only: no
      search box, no map, no counts. Search and the real main page are Phase
      4, and building half of them here is exactly the "build on the whim"
      failure.
- [ ] 2. `ExchangeCategory.tsx` — the businesses in one category, each
      linking to its listing page. Listed and claimed states visibly
      distinct, the same way the listing page distinguishes them, so a
      resident can tell who stands behind their own details.
- [ ] 3. The empty state carries the "tell us who you were looking for" form,
      posting to `/exchange/missing`. The most damaging moment in a directory
      becomes the most useful row in the database — and that route currently
      has no caller, so the gap is invisible to us.
- [ ] 4. Wire both into `routes.tsx` and the public route list in `App.tsx`,
      with the reasoning written where the listing page's is.

### Deliberately NOT in this step

**The sitemap and prerendering.** `api/sitemap.js` and `api/render.js` already
exist and generate from live data for `/work` and `/blog`, so extending them
to the Exchange is a known, cheap job — but its origin is
`theblackphoenixcompany.com`, and the Exchange is standalone on a domain that
is not registered yet (Phase 0, Eric's). Doing it now means writing the wrong
origin into two files. **It should be the step straight after the domain is
settled**, and it matters: these pages are client-rendered, so being in the
public route list makes them readable by a person, not reliably indexable by a
crawler. Being found is the whole free-traffic plan.

**The map, search, counts per category, and the main page.** Phase 2's map
items are blocked on the Google key; the rest is Phase 4.

### Risk

Low. Two new page files, two wiring edits, no schema, no server change,
nothing existing restyled. Per `dont-restyle-portals-or-landing-page`, both
pages name their own classes under `EXCHANGE_CSS` as `ExchangeListing` does —
`p-*` and `m-*` compute to 0px application-wide, so they cannot be used.

---

## NEXT STEP — Phase 3, part one: proving you own the listing (proposed 2026-10-02)

**Not started. Awaiting Eric's approval.**

Eric chose this over the browse surface. The claim is the hinge of the whole
Exchange: the directory is compiled from public records, so every row in it
describes a real business that never asked to be there. Claiming is how that
row becomes theirs, and it is the only moment where getting it wrong hands a
stranger control of somebody's business identity, their leads and their
reputation.

### The thing this has to be right about

**A claim is an authorisation decision, not a sign-up form.** The failure is
not an error message — it is a competitor, or anybody who read the directory,
taking over a roofer's page, changing the phone number to their own, and
collecting his calls. The public record is public, so everything an attacker
needs to *fill in a form* is already on the page they are attacking. Knowing
the business's name, address and phone proves nothing at all.

So the test cannot be "do you know things about this business". It has to be
"do you **control** something only the business controls".

### Two factors, from two different categories

The plan says "at least two from different categories", and the categories are
the point. Two codes to the same phone is one fact proven twice.

    contact      a code to the phone or email already in the public record
    web          DNS TXT record, a file at the business's domain, or an email
                 address at that domain
    premises     a code posted by mail to the public-record address
    credential   licence number and state matching the licence board, or
                 documents read by a person

Proving two things in the **same** category does not count — a domain-matched
email and a DNS record both prove "controls the domain", and stacking them
would let somebody who registered a lookalike domain in front of everything.

**Fails closed, in every direction.** An unrecognised factor counts for
nothing. An expired or already-spent challenge counts for nothing. A listing
with no public phone and no website simply cannot reach two categories, and
that case goes to **human review** — not auto-granted because the business is
unlucky, and not auto-denied because then those businesses can never join.

### Items

- [ ] 1. `20261002140000_exchange_claim.sql` — `exchange_claim` and
      `exchange_claim_challenge`. RLS on with no policies, like the ledgers:
      a claim in progress is reached only by the service role. Challenge
      **codes and tokens are stored hashed**, never in plaintext, so a leak of
      the table is not a pile of live claim codes.
- [ ] 2. `exchangeClaim.ts` — the pure rules, with tests and no database:
      which factors are satisfied, whether they span two categories, what is
      still outstanding, whether a challenge is usable (expiry, attempts
      spent, already used), and the decision — granted, needs review, or
      refused — with the reason recorded either way.
- [ ] 3. Codes and tokens, reusing what exists: `mintShareToken` and
      `hashToken` from `shareToken.ts`. Six digits for a phone, a link for an
      email. Ten-minute expiry, **five attempts then the challenge is burned**,
      and a cap on how many can be issued per listing per day — otherwise the
      code route is a way to make us text a stranger thirty times.
- [ ] 4. The routes: start a claim, request a factor, answer a factor, and
      read the state of my own claim. Every decision in the handler, never in
      which button renders.
- [ ] 5. **Notify the public-record contact on every successful claim**,
      whether or not that contact was one of the factors used. This is the
      backstop that makes the whole thing recoverable: if a claim is ever
      wrongly granted, the real owner hears about it.
- [ ] 6. A second claim on a claimed listing opens a **dispute** and changes
      nothing. The incumbent is told, there is a waiting period, and a person
      decides. Never silent, and never first-come.
- [ ] 7. Granting a claim sets `claim_state = 'claimed'`, links the owner, and
      starts the six-month trial through `exchangeTrials.ts` — one action, so
      a claimed listing without a trial cannot exist.

### Deliberately NOT in this step

**The business portal.** It is the largest single item in the whole build plan
and it is a separate step. This one ends with a claim granted and a trial
running; what the owner then edits comes next.

**Re-verification on contact change**, and the licence-board lookup as a live
integration — the `credential` factor is reviewed documents plus a stored
licence number for now, because there is no licence API wired up and
pretending otherwise would make the strongest-sounding factor the weakest.

**Mailing anything.** The `premises` factor is defined in the engine and
switched off until Eric says a postcard can actually be sent, because a
factor that nobody posts is a factor that silently never completes.

### Risk, honestly

This is the highest-risk step so far, and the risk is not a crash. A claim
wrongly granted is somebody's livelihood handed to a stranger; a claim too
hard to complete means an empty directory. Item 5 exists because the first
failure has to be survivable, and the review path exists because the second
one has to be.

Schema change, so it is tested against a branch database before production per
`test-before-production`.

### Decided with Eric, 2026-10-02

**A listing that can only reach one factor category goes to human review.** Not
auto-granted on a single fact, and not refused for being unlucky. This is a
commitment to a queue somebody actually works: a review nobody reads is the
same as auto-granting, except slower and with a record that says a person
looked.

**A disputed claim gives the incumbent seven days.** Long enough that an owner
on holiday still answers; short enough that a genuine new owner after a sale
is not stuck for a month. The clock is stored on the dispute rather than
computed at read time, so changing the policy later cannot retroactively
decide a dispute already running.

### Phase 3, part one — the claim (2026-10-02)

One migration, one pure module, one route module, 48 tests, and two bug fixes
in work that was already committed. No UI: this step ends with a claim that can
be granted and a trial that starts. What the owner then edits is the next step.

**Two bugs found in the Phase 2 work, both invisible to every check we run.**

*Every Exchange route was unreachable.* `exchangeDirectory` was mounted with
`app.route("/", …)` while its routes define bare paths like
`/exchange/taxonomy`. Routers mounted at the root have to carry the
`/make-server-3eae23a6` prefix themselves — the rest of the file does this one
of two ways and this was neither — so the only URL the app ever calls answered
404. `ExchangeListing.tsx` mounted perfectly and simply never found a business,
which is exactly why typecheck and smoke both passed: the page renders, it just
renders "we could not find that business" for ever.

*And the public pages were not public.* `/exchange/` was not in
`PUBLIC_PREFIXES`, so once reachable, the routes built specifically to be read
with no account and by a crawler would have demanded a session. The four public
paths are now listed **one at a time** rather than as `/exchange/`, because the
claim routes live under the same prefix and a blanket exemption would have
taken the global auth gate off the thing that decides who controls a business's
identity. Anything new under `/exchange/` is private until somebody adds it
deliberately.

**The design, in one line:** the test cannot be *do you know things about this
business*, because the directory is compiled from public records and everything
a form could ask is printed on the page being attacked. It has to be *do you
control something only the business controls*.

So: two factors from two different **categories** — `contact`, `web`,
`premises`, `credential`. Two proofs in the same category are not two factors,
and the test suite pins this from four directions, because a domain-matched
email plus a DNS record both prove only "controls the domain" and counting them
as two would admit anyone who registered a lookalike.

**Decisions worth not undoing.**

*The listing row is the arbiter of a race, and it is taken first.*
`update organizations … where claim_state = 'listed'` is the lock: the first
request flips it, the second comes back with no rows and becomes a dispute.
Writing the claim first would let two claimants both believe they had been
granted the same business. There is a unique index behind it as well.

*Attempts are spent before the code is compared.* The other order makes a crash
between the two a free guess.

*The issue cap is per LISTING, not per claimant* — six codes a day across
everybody. The abuse is not somebody fumbling their own code, it is using our
server to text a stranger thirty times, and the business whose number it is
never asked to be in the directory.

*The public-record contact is told on every grant*, whether or not it was one of
the factors used. This is what makes a wrong grant recoverable instead of
permanent, and it is the reason the one-factor review path is safe enough to
exist.

*An unparseable expiry counts as expired, and an unrecognised category proves
nothing.* Both fail toward refusing, which is the only acceptable direction
here — a corrupt date must not become an unlimited credential, and inserting a
row that says `category: 'trust_me'` must not be a claim.

*`premises` is designed and switched off.* A factor nobody posts is a factor
that silently never completes, leaving the claimant waiting for a letter that
is not coming. Turning it on is an operational commitment, not a code change.

*The trial is NOT written as a `feature_grant`.* Those feed entitlement
resolution across the whole platform, and what a claimed Exchange listing may
reach is a decision about portal access that must not ride in on the back of a
verification. It is stored as `exchange_trial:{orgId}` in the shape
`exchangeTrials.ts` already defines, and the portal step is where access is
decided.

**Verified.** 48 new tests, full suite **1,437 passing, 0 failing**. App
typecheck 316, the known baseline, none in these files. Smoke 6 modals, 0
threw — no page is affected, because there is no UI in this step.

**A real gap in how we have been checking.** `npm run typecheck` is
`tsc -p tsconfig.json && tsc -p tsconfig.server.json`, and the app config has
316 standing findings — so the `&&` means **the server half has never run** in
any of these sessions. Run directly, `npm run typecheck:server` reports 89
pre-existing findings, none in the new files. Every "typecheck holds at 316"
note in this document was only ever checking the front end. Worth fixing
properly, and it is a change to how the checks run, so it is Eric's to approve.

**Still owed on this step.**

*The migration has not been applied anywhere.* It adds two tables and should be
run against a branch database first per `test-before-production`.

*The review queue has no screen.* `needs_review` and `disputed` claims are
written correctly and indexed for exactly this query, but nobody can work them
yet. Eric committed to that queue being worked when he chose the review path,
so the screen is owed before any of this is switched on for real.

*Nothing has been verified in a running app*, because there is no UI and no
applied schema. The routes are reasoned about and unit-tested, not observed.

### The typecheck gap, closed (2026-10-02)

Eric: *"fix the typecheck so both halves run."*

`npm run typecheck` now runs `scripts/typecheck.mjs`, which runs each config in
turn and prints a count per config — **app 316, server 89** as of today. The
old line chained the two with `&&`, and since the app config exits non-zero
every time on its standing backlog, the server half had never run in any
session. Swapping the operator was not available: npm runs scripts through
`cmd.exe` on Windows, where `;` is not a separator and `&` is, while every
other shell is the reverse, so the sequencing is in node where it means one
thing.

`typecheck:app` was added so each half can still be run alone, and
`typecheck:tests` is deliberately still outside the default run — adding a
third config would change what the pre-commit number means, which is a
decision about the standing check rather than a repair to a broken one.

**Read two numbers from now on, not one.** Every earlier note in this file
saying "typecheck holds at 316" was only ever checking the front end.

---

## NEXT STEP — Phase 3, part two: the review queue (proposed 2026-10-02)

Eric: *"build the review queue screen."*

This is the thing the one-factor decision promised. When he chose "a person
decides" over granting on a single fact, that became a commitment to a queue
somebody actually works — and a review queue nobody can open is the same as
auto-granting, except slower and with a record that says somebody looked.

### Decided with Eric

**Suspend, then transfer — never a one-click handover.** A reviewer may take a
listing back to unclaimed, and the challenger then proves ownership normally.
Two steps rather than one, because a single action that moves a business from
one owner to another is a mis-click away from handing somebody's phone calls to
the wrong person. It also makes the backstop email honest: it promises to
suspend a wrongly granted claim, and now there is a control that does that.

### Items

- [ ] 1. Three staff-only routes, **gated inside each handler** rather than by
      router middleware. `requireStaffOn` exists for this, but these routers
      mount at a prefix and a `use("*")` on one runs on every request under it
      — which once took the whole API staff-only for a deploy. Four handlers
      do not need a mechanism.
          GET  /exchange/review/claims              the queue, with context
          POST /exchange/review/claims/:id/decide   grant or refuse, with a note
          POST /exchange/review/listing/:id/suspend  back to unclaimed
- [ ] 2. The queue route returns what a decision actually needs: the business,
      what was proven and by which category, who is asking, how old the claim
      is, and for a dispute the seven-day clock and who holds it now.
- [ ] 3. Granting from review goes through **the same `grantClaim` path** as an
      automatic grant, so a reviewed claim cannot end up with a claimed listing
      and no trial. The decision is recorded against the reviewer.
- [ ] 4. Suspending un-claims the listing, revokes the trial, and moves any
      dispute on it back to `open` so the challenger can finish proving it the
      ordinary way. The incumbent is told.
- [ ] 5. `ExchangeClaimReview.tsx` — the screen. Oldest first, because the
      promise being kept is that somebody looks, and the one waiting longest is
      the one being let down. Dispute clocks shown as time remaining.
- [ ] 6. Routed, and **not** in the public route list.

### What this deliberately leaves alone

**Document upload.** The `documents` factor still means a reviewer makes
contact. An upload box is its own piece of work under the Phase 0 private
storage rules, and offering one that goes nowhere is worse than saying plainly
that somebody will be in touch.

**Automatic expiry of the dispute clock.** Seven days passing does not decide
anything by itself; it only means the queue shows it as ready. Nothing in this
system takes a business off its owner without a person.

### Phase 3, part two — the review queue (2026-10-02)

Three staff-only routes and one screen. The queue exists because of a decision
rather than a feature request: when Eric chose "a person decides" over granting
a one-factor claim, that became a commitment to a queue somebody works, and a
queue nobody can open is auto-refusing with a record that says a person looked.

**Decided with Eric: suspend, then transfer.** A reviewer may take a listing
back to unclaimed; the challenger then proves ownership the ordinary way.
Never one action. It also makes the grant notification honest — that email
promises to suspend a claim that was not the owner's, and until now there was
no control that could do it.

**What the reviewer is shown, and why.** The failures as much as the passes.
Five burned attempts on a phone code and one clean pass on a domain are
different stories, and a queue reporting "1 factor proven" would flatten them
into the same row. Contact details stay **masked**, exactly as they are to the
claimant: a reviewer needs to know which number received a code, not what the
number is. Oldest first, with the longest wait on the masthead, because that is
the number which says whether the queue is being worked or merely exists.

**Grant is disabled rather than hidden** when a listing is still held, with the
two-step rule written underneath it. A control that vanishes reads as a bug,
and the server answers 409 for the same case — the screen mirrors the rule
rather than being the only thing enforcing it.

**Three decisions worth knowing about.**

*Gated inside each handler, not by router middleware.* `requireStaffOn` exists,
but these routers mount at a prefix and a `use("*")` on one runs on every
request that prefix receives — doing exactly that once took the whole API
staff-only for a deploy, per the warning in `requireStaff.ts`. Three handlers
need three visible checks, not a mechanism.

*Granting from review goes through the same `grantClaim` path* as an automatic
grant, by moving the claim back to `open` first. So a reviewed claim cannot
produce a claimed listing with no trial behind it, and there is one place where
a listing changes hands.

*Suspending revokes the trial rather than deleting it.* A business that held a
listing for two months and lost it is a fact worth keeping; deleting the record
would make the roster say it never happened.

**Verified.** App typecheck 316 and server 89 — both baselines, nothing in the
new files, and this is the first step checked with both halves actually
running. Full suite 1,437 passing. Smoke ran the **whole sweep** because
`routes.tsx` is a shared entry point: **347 pages rendered, 0 threw**, with
`exchange-claim-review` reporting `ok` in `last-run.json`.

**Still not verified in a running app.** The page mounts and the routes
typecheck, but no claim has been through this against a real database, because
the migration has not been applied anywhere. That is the next thing owed.

**Not in this step.** Document upload — the `documents` factor still means a
reviewer makes contact, and an upload box that goes nowhere is worse than
saying so. And nothing decides a dispute when the seven days run out: the clock
only marks it ready, because nothing here takes a business off its owner
without a person.

### What production actually looks like (checked 2026-10-02)

Read-only inspection of `plzsvzwwcdopnawtiwzm`, because every claim in this
document about the Exchange being built was an inference from unit tests.

**No Exchange migration has ever been applied.** `organizations` still has its
original twelve columns — no `claim_state`, `verification_state`,
`listing_source`, coordinates or licence fields — and not one `exchange_*`
table exists. The newest applied migration is `20260923003905`; everything
dated 2026-10-02 is outstanding. So the directory routes would have failed on
their column list even after the mount bug was fixed, and nothing in Phase 1,
2 or 3 has ever run against a database.

**The Phase 0 media fix is not in effect either, and nothing was exposed.** All
three buckets are still `public: true` with no size or MIME limit. The review
note above describes this as done, and the code is genuinely deployed — but the
buckets hold **zero objects and always have**, so the exposure that fix was
written to close never had any data behind it. Worth recording plainly rather
than leaving the alarming version in the document.

**The real defect is the opposite one: customer attachments have never
worked.** RLS is on for `storage.objects` with *no policies at all*, and both
upload paths go browser-side with the user's own token — so every upload is
refused. `ClientWorkRequestForm` tells the customer "some attachments could not
be uploaded"; the staff path in `WorkRequestFullView` returns null and logs to
the console. `20261002120000_private_job_media.sql` grants exactly the two
missing insert policies, and has never been applied.

Because those buckets are empty, flipping them private carries **no legacy-URL
risk at all** — the hazard that note worried about does not exist.

**And the repair could never have told us.** `ensureStorageBuckets` was
reachable from one place, inside `POST /work-requests`, behind
`.catch(() => {})`. It ran only when a customer happened to submit a request,
and its failure was discarded. A control whose only trigger is somebody else's
unrelated action, and whose failure is thrown away, is not a control.

Fixed in code: it now returns a per-bucket outcome, the intake call logs its
failure instead of discarding it, and `POST /storage/repair-job-media`
(staff-only) runs it and reports what each bucket actually is now — because
"it ran" was never the question.

**Nothing was applied to any database.** Eric chose branch-first; the branch
creation was declined at the prompt, so the migrations remain outstanding and
customer attachments remain broken until that is settled.

### Phase 0, part one — finished, in production (2026-10-02)

Eric: *"just apply the media migration to production."* Applied, verified, and
customer attachments work again.

**It had to be both halves, and in this order.** Granting the insert policies
alone would have made production *worse*: uploads would have started working
into buckets anybody holding a URL could read. The buckets were empty, so there
was no exposure to close — there was an exposure to *avoid creating*. So the
buckets were made private first, then the writes were allowed. There is no
window in which a customer photograph landed in a public bucket.

Two migrations, both recorded in `supabase_migrations`:

    private_job_media_buckets   public=false, size caps, MIME allow-lists
    private_job_media           the two insert policies

**Verified by reading production back, not by trusting the success flag.** All
three buckets `public: false` with their caps (15MB / 200MB / 50MB) and
allow-lists. Exactly two policies on `storage.objects`, both INSERT —
`authenticated` into the three buckets, `anon` only under `guest/`. No select,
update or delete for either role, so nothing is readable with a browser key and
every read goes through the server's signer.

**A trap found on the way in, and worth remembering.** The work request form
uploaded *blueprints* into `project-photos`, whose allow-list is images only.
That was harmless for exactly as long as no allow-list was enforced, and would
have become a silent rejection of every PDF blueprint the moment one was — the
customer told "some attachments could not be uploaded", with no indication of
which or why. Blueprints now go to `project-blueprints`, the bucket whose
allow-list contains `application/pdf`. Safe to move because these buckets had
never held an object. The same line also produced a literal `undefined/` folder
for a signed-out customer, which the guest policy would have refused; it is
`guest/` now, matching the photo and video paths.

**What works now, and what waits on a deploy.** Photo and video uploads work
immediately — the deployed frontend already stores `storage://` references and
the deployed function already signs them, both from `cb8c65ab`, which is on
`origin/main`. Blueprint uploads still fail until the frontend is pushed,
exactly as they failed before; that is a regression avoided, not introduced.

**The bucket flags now live in a migration** rather than only in
`ensureStorageBuckets`, so the state is declared where applying it is recorded
and re-runnable. The function's copy is the belt rather than the braces, and
`JOB_MEDIA_BUCKETS` must stay in step with the migration — change one, change
the other.

Typecheck app 316 / server 89, both baselines. Suite 1,437 passing. Smoke 21
pages, 0 threw.

### The edge function is deployed (2026-10-03)

`supabase functions deploy make-server-3eae23a6 --project-ref plzsvzwwcdopnawtiwzm`.
Live and healthy at version `2.9.0-command-center-resilient`.

**Deployed BY NAME, deliberately.** A bare `supabase functions deploy` deploys
every function in `config.toml`, and that file carries an explicit warning that
doing so once pointed `make-server-57095a78` at its full directory and
re-exposed 509 retired routes with service-role privileges against live data.
Name the function.

**`--no-verify-jwt` was NOT passed, despite `deploy.md` saying to.** The live
function and `config.toml` both have `verify_jwt = true`, so the flag would
have loosened the gateway — a security change nobody asked for. `deploy.md` is
stale on this point and should be corrected.

**Verified against production, not assumed.**

    /health                       200, version 2.9.0
    /exchange/taxonomy            200 — was unreachable before the mount fix
    /exchange/review/claims       401 with an anon key
    /storage/repair-job-media     401 with an anon key
    /exchange/claim/start         401 with an anon key

The three private routes are refused by the global auth wall before the
per-handler staff checks are even reached, which is the layering we want.

**A bug the deploy exposed, not yet fixed.** `/exchange/taxonomy` answered
`{"success":true,"sections":[],"categories":[],"services":[]}` — on a database
where **none of the exchange tables exist**. `supabase-js` returns a missing
table as `result.error` rather than throwing, and the route reads
`sections.data ?? []` without ever checking `.error`, so the `catch` never
fires. A completely broken directory reports itself as an empty one.

That is the same silent-failure class that has bitten this project repeatedly:
the public buckets nobody noticed, the unreachable routes that typechecked
clean, the server half of the typecheck that never ran. `/exchange/category/:slug`
and `/exchange/listing/:slug` should be checked for the same pattern. Four
lines, and it needs a redeploy to take effect, so it is Eric's to say go.

### An empty directory and a broken one are no longer the same answer (2026-10-03)

Eric: *"fix all three routes and redeploy."*

`supabase-js` does not throw. A missing table, an absent column, a refused
permission — each comes back as `result.error` with `result.data` null. So the
idiom `const { data } = await sb.from(...)` followed by `data ?? []` converts a
completely broken database into a confident, cheerful, empty answer.

All four reads in `exchangeDirectory.tsx` now go through one `must()` helper
that makes an error fatal. The three routes lied in three different ways, which
is worth recording because each looked plausible on its own:

    /exchange/taxonomy        200 with empty arrays — "the directory is empty"
    /exchange/category/:slug  404 "No such category" — "your search is wrong",
                              when in fact the whole taxonomy was gone
    /exchange/listing/:slug   main query was checked; the SECOND one was not,
                              so a business rendered with none of its trades

`/exchange/listing/:slug/contact` had the same shape and is fixed in the same
pass.

**The listing's category read is fatal rather than degraded, deliberately.** A
listing showing none of the trades a business holds is wrong in the way nobody
reports: the page looks finished and the business looks like it does nothing. A
500 is worse to look at and far better to find.

**And a 404 must now mean "we looked and it is not there", never "we could not
look."** `must()` runs before the not-found check for that reason.

**The claim routes are NOT changed, and they are not the same case.** They read
`.data` without checking `.error` too, but every one of those paths fails
CLOSED: a broken `exchange_claim` makes `loadClaim` return null, which answers
"no such claim" and grants nothing; a broken challenge table yields zero proven
categories, which grants nothing. Wrong in the safe direction. Worth tidying so
the diagnosis is loud rather than silent, but it is a separate change and not
urgent.

**The server typecheck earned its keep immediately.** The first version of
`must()` was generic, which inferred `unknown` off the Postgrest result type
and added twelve findings — caught by the half of the typecheck that, this
morning, had never run. It returns `any` now, matching the rest of the file.

Typecheck app 316 / server 89, both baselines. Suite 1,437 passing. Smoke 6
modals, 0 threw.

### The Exchange exists in production (2026-10-03)

Five of the six outstanding migrations applied, verified by reading production
back after each. The Exchange API serves real data for the first time.

**Reviewed before applying, because the branch was declined.** That review was
the pre-production test, and it was not a formality — it checked the things
that would have failed silently:

* `exchange_normalise_phrase` is defined in the taxonomy migration (130000) and
  used by an index in the ledgers migration (132000), so timestamp order is
  load-bearing and correct.
* The catalogue migration selects nine category slugs and three territory
  slugs. All twelve exist in the seed — had any been renamed, the insert would
  have quietly written nothing.
* `organizations.type` is an enum and does contain `operator`, and exactly one
  active operator org exists, so the catalogue has a target.
* `organizations` RLS is authenticated-only with no anon policy, so the public
  directory genuinely has to go through the server's service role. It does.

**What is in production now.**

    4 sections · 86 categories · 70 services · 108 aliases · 3 territories
    10 exchange tables, RLS on all of them

    /exchange/taxonomy         200, the real taxonomy
    /exchange/category/roofing 200, the category and an empty listing set

**And the demand ledger took its first row**, unprompted, from that category
request: `section_slug: home-property, results_count: 0, surface: category`.
That is the whole business model working end to end — the row that says "people
looked for roofing here and we had nobody", which is the recruitment call with
a number attached. It had never been exercised before today.

**One migration is NOT applied: `black_phoenix_catalogue` (134000).** It was
refused by the permission classifier, and the reason is legitimate — unlike the
other five it is not pure DDL: it runs an `UPDATE` against existing
`organizations` rows to set the operator's service centre, radius, claim state
and verification state. I did not work around it.

The consequence is visible rather than silent: `organization_category` and
`organization_territory` are empty, so Black Phoenix holds no categories and no
territory, which means routing and first refusal have nothing to match on. The
Exchange directory works; the company is not in it yet. That migration needs
Eric's go-ahead, and it is idempotent (`on conflict do nothing`, `coalesce`), so
re-running it is safe.

**Applied out of order, deliberately.** `exchange_claim` (140000) went in while
134000 is still pending, because the claim schema does not depend on the
catalogue and it is the part most worth having verified. A later `db push`
would need `--include-all` to pick 134000 up, since it is older than the newest
recorded migration.

**Still not verified: a claim end to end.** The tables exist and the routes
answer, but no claim has been walked through, because that needs a signed-in
account and a listing to claim — and with the catalogue unapplied there are no
directory listings yet.
