# PLAN — Phoenix Exchange

Eric, on what it is for:

> "i see this as a place all my local companies will pick up work that i dont
> want or cant do so how do we have as many company join to create the largest
> job bidding site in the world?"

And, when asked how that squares with the capped territory cohorts:

> "the phoenix exchange will hold more that construction work we will have
> whatever company want in and they can advertise. lawn care, lawyers,
> hairstylist, realtors everything"

So the Exchange is **a general marketplace for local businesses** — every
industry, not a trade board. Construction is one lane through it, and it
happens to be the lane Black Phoenix runs.

Nothing here gets built until it is agreed.

---

## 1. What the Exchange actually is

Three things sold on one membership. Keeping them distinct is what makes the
product work for a roofer and a hairstylist at the same time.

    WORK        Requests get posted. Members in that category and area quote.
                This is the "largest job bidding site" part.

    PRESENCE    Every member has a profile that can be found — by category, by
                area, by what they have completed on the platform. A barber
                never quotes on anything and still gets value here.

    PROMOTION   Paid placement: the sponsored marquee that already exists,
                category pages, and slots beside relevant work. This is the
                add-on that rides on top of the tier.

A company joining for any one of the three is a member for all three. That
matters, because it means the hairstylist and the lawyer are not dead weight on
a bidding board — they are the membership, and they are also **customers for
each other**, which is the flywheel in section 5.

---

## 2. Where it stands today

**The foundation is real and well built.** Postgres with row-level security
that is genuinely enforced:

    organizations         operator / subcontractor / vendor / advertiser /
                          customer / landlord
    organization_members  person to org, with role and status
    bid_requests          title, trade, address, budget, dates, awarded bid
    bids                  amount, notes, valid-until, status
    bid_invitations       which orgs were asked
    bid_request_media     photos and video, policied to match the request
    bid_request_lines     line-item pricing

Migration 011 added the emergency flag, latitude and longitude, the
first-refusal window, and a `bid_request_distance_miles()` function.
`BidRoom.tsx` reads Postgres directly with the signed-in user's own session, so
a member **cannot** read a rival's price — the row never arrives. That is the
thing most marketplaces get wrong, and it is already right here.

**Four things are missing. The first one is fatal to the goal.**

### a. A paying member cannot discover work

    create policy bid_request_read on bid_requests
      using (
        id in (select my_owned_bid_request_ids())
        or id in (select my_invited_bid_request_ids())
      );

You see a job only if you posted it or were personally invited to it. There is
no third path. Today the Exchange is a private invitation tool, not a
marketplace — a thousand companies could subscribe tomorrow and see an empty
screen until somebody hand-picked them for each job.

This is **not** an argument for making anything public. The Exchange is
subscriber-only and stays that way. What is missing is the **member board**:
once you are paying, you see the work in your categories and your area without
waiting to be chosen. That is the single biggest build item, and it has to live
in RLS rather than in a browser filter, or it is not a boundary.

### b. Everything assumes construction

`bid_requests.trade` is free text meaning a construction trade. There is no
taxonomy that can hold "lawn care", "family law" and "roofing" in the same
system, and no way for a member to say which categories they serve.

### c. No company has a location, a radius, or a category list

`organizations` has name, slug, email, phone, website, status. Nothing else. So
"show me work within 25 miles of my shop in my categories" cannot be answered
by the database at all.

### d. Nothing links an organisation to a paid subscription

The plans exist and are priced. There is no link from an `organizations` row to
a cohort membership, so "may this org quote" has no answer.
`010_bid_room_entitlements.sql` was written and deliberately **not** applied,
pending this decision. That gate is the revenue.

---

## 3. The decisions, with recommendations

Decisions A and B are settled by Eric — every industry, they can advertise, and
access is by subscription with no free or public lane. C, D and E follow from
them, and each changes what gets built, so they want a yes or a no first.

### B. Free for customers, free trials for businesses — *settled 2026-10-01*

This was decided twice and reversed once. The standing ruling, in Eric's words:

> "letting anyone that want to use the exchange is free we will start the
> buisnesses free as well and get them all in and the platform running... this
> all incompusing exchange that will eventally drive subscriptions from
> businesses and free for customers"

and, pinning down what "free" meant for the business side:

> "well the busniess will be free trial periods"

So:

    CUSTOMERS     free, and permanently. Searching, comparing, requesting
                  quotes and awarding work cost a resident nothing, ever.
                  They are the traffic, and traffic is what the businesses
                  are eventually paying for.

    BUSINESSES    a free trial — full use of everything — which converts to a
                  tier when it ends. `territory-cohorts.tsx` already carries
                  `trialMonths: 6`, ten founder slots and a 30% founder
                  discount, which is exactly this shape.

This is a land grab: population first, revenue second. It is the right call
for the stated goal, and it changes what has to be **built**, not merely what
is charged. Two rules follow, and they are the difference between this working
and this failing.

**Meter from day one, charge later.** Count everything from the first free
account — quotes sent, leads received, categories held, radius served,
placements taken, profile views. Without that there is no basis to price on
when the trials end, and nothing to show a business to justify the bill. The
conversion email writes itself if the numbers exist (*"you received 34 quote
requests and won 9 jobs worth $61,000 during your trial"*) and is impossible
if they do not.

**A free account still needs a cohort record, at price zero.** Cohorts are the
money spine. An account with no cohort record cannot be converted, counted or
forecast, so a trial is a membership with a rate of zero and an end date — not
the absence of a membership. This is also how the dashboard can answer "how
much revenue arrives when the founding trials expire", which is the single
most important number in a land-grab strategy.

**Never take back what was given free.** The paid tier sells the *next*
increment — more categories, wider radius, more quote slots, priority in
ranking, advertising placement — rather than reclaiming something a member
already had. Removing a free capability is how a populated platform turns into
a public revolt, and it is the main way this strategy fails.

### B3. Six-month trial, then three tiers — *settled 2026-10-01*

Eric: *"6 month trial, then three tiers."* This matches `trialMonths: 6`
already in `territory-cohorts.tsx`.

**Still to confirm: when the clock starts.** Per-business from the day they
claim is fairest; a fixed shared end date creates one conversion moment you
can run a campaign around. The recommended hybrid, which also fits the ten
existing founder slots: everyone who joins before a cut-off is a **founding
cohort** with a common end date and founder pricing; after the cut-off,
trials run six months from each claim.

**Six months is a long time to go without revenue from businesses**, which is
exactly why sponsorship and advertising matter in the launch period — they
are the only lines that pay before the first conversion.

**And a silent trial converts badly.** If leads do not visibly arrive in
months one to three, a business has mentally left long before the bill. So
the trial needs monthly "here is what you got" summaries from the ledger,
with checkpoints at months one, three and five — not a surprise at month
six.

### B2. The three tiers — *proposed, needs sign-off*

Built from the levers now settled: categories, territory, placement, lead
volume, the engagement modules, and advertising.

    1 · LISTED      the claimed profile earning its keep. Logo, photographs,
                    hours, links, messaging, reviews with right of reply,
                    up to 5 categories, the basic lead ledger. Found by
                    relevance and distance, with no placement priority.

    2 · ACTIVE      everything above, plus the tools of actually trading:
                    deals and events publishing, the engagement-mode modules
                    (book, order, event), higher or uncapped quote volume,
                    the full performance view, review solicitation, more
                    team seats.

    3 · FEATURED    everything above, plus position: priority ranking in its
                    categories and area, prominence on the map, first look
                    at matching leads, eligibility for a territory slot and
                    for category sponsorship, and the full ten categories.

    ADD-ONS         extra categories to the ceiling of ten, extra
                    territories, advertising placement, event sponsorship,
                    on-call, the content centre.

Two deliberate choices in that shape. **Eligibility for a territory slot sits
in the top tier; the slot itself is sold separately** — because slots are
scarce and priced by territory, which the cohort system already models.
And **the engagement modules sit at tier 2 rather than tier 1**, because a
restaurant publishing a menu and deals is trading, not merely listed — that
is the natural place for the first upgrade to bite.

Prices come from the plan catalogue, never from a constant in a route file.

The hardest question in the whole plan, and it has to be answered **now**, not
when the first trials expire, because the metering has to be in place long
before the bill is. Candidates, not mutually exclusive:

    VOLUME        quote slots per month, categories held, radius served
    VISIBILITY    ranking position, featured placement, category sponsorship
    AUDIENCE      advertising to Exchange customers and to other members
    TOOLS         the portal features — invoicing, scheduling, the content
                  centre, on-call — sold on top of a free-ish presence

My recommendation is **volume and visibility first, tools second**. Volume is
fair, it scales with value received, and a business that is winning work will
pay for more of it without resentment. Tools are a weaker lever because a
business that is not getting work will not pay for better software.

### C. National board, local first refusal — *recommended*

    the BOARD        national, eventually wider. Anyone may post from
                     anywhere; a member sees work inside their own declared
                     service area and categories.
    FIRST REFUSAL    Black Phoenix's private window, only inside its own
                     ~50-mile territory, and only for categories Black Phoenix
                     actually works in. A hairstylist booking or a job three
                     states away never enters that window.

The radius is a property of Black Phoenix's territory, not a limit on the
marketplace.

### D. Caps apply to the partner programme only — *recommended*

`territory-cohorts.tsx` enforces 45 members per territory, four subcontractors
per trade, five vendors, five advertisers, a 40-mile radius, ten founder slots
at 30% off. Four roofers in a territory is scarcity worth paying for. Four
hairstylists is a closed door for no reason.

    PHOENIX PARTNER   capped, in-territory, construction categories. Gets
                      Black Phoenix's overflow work first, founder pricing,
                      can be put under contract. Scarce on purpose.

    EXCHANGE MEMBER   uncapped, any category, anywhere. Quotes on the member
                      board, has a profile, may advertise.

Every Partner is an Exchange Member. An Exchange Member applies to become a
Partner when a slot opens — which turns the cap from a wall into a waiting
list, and a waiting list is a sales asset.

### F. Routing, not hand-picking — *recommended, awaiting sign-off*

A job should not sit on a board waiting to be found, and it should not wait for
a person to choose who may quote. It gets **routed** to the members who
qualify — category, radius, verification, available slots — and each member's
board shows what was routed to them. Invitation stays on top: a poster can name
specific companies and they are added whether or not they would have matched.

Three things come with it, and they are part of the decision:

**A cap on bids per request.** Five slots, shown counting down. Forty quotes
is worse for the customer than five and wastes thirty-five members' evenings,
which is how a matching marketplace earns a reputation for being worthless.
The cap also sells: "3 of 5 slots left" makes members answer quickly.

**A ranking for who gets the slots.** Contracted vendors first and alone, then
Black Phoenix's first refusal, then partners, then verified members, then
everyone matching. Same order as the routing engine in section 4.

**An audit trail.** Who could see what, and when. The first time a member asks
why they never saw a job, the answer has to exist.

### H. The three sections, and what an engagement mode is — *settled, needs design sign-off*

Eric: *"a section in the exchange for service style businesses, then a section
for restaurants and food providers, and an entertainment section."*

These are not three copies of the bid board with different labels. They work
differently, and the taxonomy has to say so. Each category carries an
**engagement mode** — what a customer can actually do with a business in it:

    QUOTE     post a job, receive bids, award. Contractors, lawyers, movers,
              lawn care. This is the existing bid engine.
    BOOK      pick a time. Hairstylists, trainers, a table, a consultation.
    ORDER     choose from a menu or product list. Restaurants, food trucks,
              bakeries, caterers for standard packages.
    EVENT     dated things people attend. Live music, markets, shows,
              classes, venue availability.
    LIST      presence only — found, contacted, not transacted through the
              platform.

A category can hold more than one: a caterer is ORDER for a tray of
sandwiches and QUOTE for a wedding; a venue is LIST for enquiries and EVENT
for what is on this weekend. So the mode is a set, not a single value.

**Why this matters more than it looks.** The sections are the reason the
Exchange can become a habit rather than a utility — see section 10. But every
mode is a different build, and three half-finished sections look far worse
than one finished one. Sequence them; do not open all three at once.

### G. Where does the directory sit relative to the paywall? — *resolved by B*

Decision B settles this: customers are free, so **the directory is open to
them**. A resident searches, sees who is near, compares and requests work
without paying. The question that remains is only whether a search works with
*no account at all* or requires a free sign-up — recommendation below.

**Recommendation: searching is anonymous, acting needs a free account.** Browse
and compare with no sign-up, because that is what gets found by search engines
and shared between neighbours. Creating an account happens at the moment of
need, inside the request — somebody with a leak will finish a sign-up, the same
person browsing on a Tuesday will not.

Eric: *"phoenix exchange will be the place people can look for any service, it
will allow customers to truly see what is available to them in their
marketplace or nearby."*

The **work board is settled and stays shut** — subscription required to post or
quote. The directory is a different surface and it has not been decided. It is
the consumer product: a resident searching for a plumber, a lawyer, a lawn
service. Three ways it can sit:

    FULLY INSIDE      Nothing visible until you have an account. Cleanest
                      rule, hardest growth — nobody signs up for a directory
                      they have not seen, so every resident arrives through
                      marketing spend or a member's own link.

    SHELF VISIBLE     A searcher sees that fourteen plumbers cover their
                      postcode, their categories, their verified badges and
                      their rating spread. Contact details, profiles and
                      requesting quotes need an account. The inventory is
                      visible; the counter is not.

    FULLY OPEN        Browse everything, account only to request work. Most
                      growth, least control, and closest to the thing Eric
                      already rejected for the board.

This needs Eric's ruling and it is the single biggest lever on whether the
consumer side ever gets going. See section 9.

### E. Not every category takes bids — *recommended*

A roofing job takes bids. A haircut does not. Each category carries an
`accepts_requests` flag: categories that take work show a "get quotes" button
and appear on the board; categories that do not are presence-and-promotion
only, and their members are found rather than bid on. One switch, set per
category by an administrator, and it keeps the board from filling with things
nobody bids on.

---

## 4. The architecture, as one connected system

What owns the data, who reads it, what it feeds.

### The category taxonomy — a table, never an enum

    exchange_category
      id, parent_id, section, name, slug
      engagement_modes  text[]    quote / book / order / event / list
      is_construction   boolean   does Black Phoenix's first refusal apply
      status            active / hidden

`section` is the top level the customer sees — Services, Food, Entertainment,
and the Home & Property work the platform already does.

A table so a new industry is a row, not a migration. Two or three levels:
sector, category, service. Seeded roughly as —

    Home & Property      roofing, siding, plumbing, HVAC, electrical,
                         painting, lawn & landscape, cleaning, pest, pools,
                         snow, handyman
    Professional         lawyers, accountants, insurance, realtors, mortgage,
                         architects, engineers, surveyors
    Personal             hairstylists, barbers, nails, fitness, massage,
                         photography
    Auto & Transport     mechanics, towing, movers, hauling, detailing
    Events & Food        catering, venues, DJs, florists, rentals
    Business Services    IT, marketing, print, staffing, commercial cleaning
    Supply               materials vendors, equipment, wholesale

`bid_requests.trade` becomes `category_id`, with the old free text kept and
backfilled rather than dropped.

Read by: the board, member matching, the directory, advertising placement,
search, and the routing engine. This is the spine of the whole widening — get
it wrong and every other surface inherits a construction-shaped hole.

### `organizations` becomes the one company identity

    service_lat, service_lng     geocoded from the business address
    service_radius_miles         how far they will travel
    categories                   join table to exchange_category
    license_number, license_state, license_expires_at
    insurance_expires_at
    verification_state           unverified / pending / verified
    claim_state                  shell / claimed  (see section 5.4)

Coverage is derived rather than stored: a member sees a request when it sits
inside their radius and matches one of their categories. Read by the board, the
directory, the invite picker, the provider portals, cohort membership.

### Entitlement has to be answerable *inside* the database

Cohorts are the money spine, and cohorts live in the KV store. RLS cannot make
an HTTP call. So the server writes a small mirror whenever a grant changes:

    org_exchange_access(org_id, state, tier, valid_until, source_cohort_id)

RLS reads the mirror; the cohort system stays the system of record. The mirror
**fails closed** — no row, or an expired row, means no writing. Same pattern as
`__unresolved__` in vendor billing.

And per the recorded rule, **the gate is on writes only**. A lapsed member
still sees the work going past them and the quotes they have already placed.
They just cannot post or bid. That is kinder, and it sells better, because what
they are missing stays visible on screen.

### Membership shape

Three base tiers plus add-ons, as everything else on the platform is shaped:

    tier 1   presence — profile, found in the directory, a small number of
             quotes a month
    tier 2   active — unlimited quotes in your categories and radius
    tier 3   featured — priority placement, more categories, wider radius

    add-ons  extra territories, extra categories, marquee and category-page
             advertising, on-call, content centre

Prices come from the plan catalogue, not from a constant in a route file. The
monthly figure is the tier plus what they have taken, computed rather than read
off the tier.

### The routing engine is the actual product

A request does not "appear". It travels, and every step has money attached:

    1. CONTRACTED VENDOR   Does the posting account already have somebody
                           under contract for this category? If yes it goes to
                           them and stops. It never reaches the board. The
                           platform must never broadcast work its own customer
                           has already committed elsewhere.

    2. FIRST REFUSAL       Construction category, inside Black Phoenix's
                           territory? Black Phoenix sees it alone until
                           `first_refusal_until`. Take it or release it; a
                           timer releases it automatically so nothing rots.
                           Every other category skips this step entirely.

    3. PARTNERS            Territory partners in that category get a short
                           head start. This is what a partnership is worth.

    4. MEMBER BOARD        Every subscriber whose radius and categories match.

    EMERGENCY              Skips 2 and 3. Contracted vendors still win, then
                           straight to everyone who covers it. A burst pipe
                           does not wait out an exclusivity clock.

Each step is a state plus a timestamp, so who could see what, and when, is
auditable. That matters the first time a member asks why they never saw a job.

### The loop has to close, or the money leaves

An awarded bid becomes a job through `jobIdentity.ts` — the same job id — and
from there into quote, purchase order, invoice and change order, all of which
this app already has. This is not a nicety. It is why a poster and a bidder
come back instead of swapping phone numbers once and never returning. The
subscription is defensible only while the platform is where the paperwork
lives.

---

## 5. How it gets big

Eric's real question. Each of these is a build item, not a campaign.

### 1. The board is not empty on day one

Black Phoenix already has work flowing — its own overflow, plus the condo
associations, landlords and property managers on the platform. That is the
unfair advantage a new marketplace never has, and everything below depends on
it being true first. Seed with real work, never with an empty directory.

### 2. Every industry makes the cold start easier, not harder

This is the part of Eric's widening that is worth saying out loud. A town has
maybe a hundred contractors. It has a couple of thousand businesses. So:

- **The addressable membership is twenty times bigger** in the same radius.
- **The members are each other's customers.** The hairstylist needs a plumber.
  The plumber needs an accountant. The accountant needs a roofer. Every member
  is demand as well as supply, which means the board fills from inside the
  membership rather than only from outside it. A single-trade board can never
  do this.
- **A saturated town is a real product.** "Every business in the county, in one
  place" sells to residents in a way "forty contractors" does not.

### 3. Win one territory completely before widening

"Largest in the world" gets built as many saturated territories, not one thin
national board. The metric is **requests per category per week inside the
radius**, not total members. A member who sees three relevant jobs a week pays
forever; a member who sees one a month cancels.

### 4. Every posted request is a recruiting event

When work goes up and nobody covers that category in that area, the system
invites the companies that do — by email, with the actual job in it. *"A
$14,000 siding job, six miles from you. Here are the photos. Claim your profile
to quote."* That converts because it is not an advert, it is work.

Invitations already exist in the schema. What is missing is inviting an
organisation that has not signed up yet, and a landing page that turns that
email into an account.

### 5. Claim-your-profile shells

Pre-create dormant `organizations` rows for local businesses — business licence
registries, supplier lists, the vendors already in the materials hub. A company
then arrives at a page that already carries their name, category and service
area, with matching work listed beside it. Claiming converts several times
better than a blank signup form, and it means the directory is useful before
anybody has joined.

**Security condition, and it is not optional:** a shell is claimable only by proving
control of the listed email or phone, holds no private data until claimed, and
never grants write access on the strength of an unverified claim. Otherwise it
is an account-takeover surface.

### 6. Members recruit members

A member who brings another company gets credit against their subscription, and
both sides get something. Business owners in a town all know each other. This
is the cheapest supply channel there is, and it needs only a referral code on
the org record and a credit on the cohort membership.

### 7. Scarcity where it sells, openness where it scales

The capped partnership is the upsell; the member board is the volume. "Four
roofers per territory, slot three of four taken" is a reason to sign this week.
The waiting list for a full territory is a sales list.

### 8. Trust is a growth feature, not a compliance chore

Companies avoid boards where they are undercut by somebody unlicensed and
uninsured. Verified licence, verified insurance, expiry dates that actually
lapse the badge, and a completed-job record earned on the platform. Posters
filter on it; good companies join *because* of it.

### And the line that sells it

We do not sell leads and we do not take a cut of the job. One subscription,
every job in your area, and the customer's money is yours. That is a genuinely
different offer from the lead-resale sites every business owner already
resents, and it is true of this design rather than a claim bolted on to it.

---

## 6. Build order

Phase 0 is this document.

- [ ] **0. Decisions** — B2, C, D, E, F, G and H in section 3 signed off
- [ ] **0b. Metering** — count quotes, leads, views, categories and radius per
      account from the very first free one, because the trials end and the
      bill has to be justifiable. Nothing else in this list is allowed to ship
      before the counters exist
- [ ] **1. Category taxonomy** — `exchange_category` table, seeded across all
      sectors; `bid_requests.category_id`; backfill the existing free-text
      trade; category picker in the post form
- [ ] **2. Company identity** — coordinates, radius and categories on
      `organizations`; geocode on save and on post; backfill existing orgs
- [ ] **3. The entitlement gate** — `org_exchange_access` mirror written from
      the cohort system, failing closed, enforced on write paths only
- [ ] **4. The member board** — third RLS read path (subscriber, past exclusivity,
      inside radius, matching category), plus browse, search, filter and saved
      searches
- [ ] **5. Routing engine** — contracted vendor, first refusal, partners, open,
      with timers and an audit trail; emergency lane
- [ ] **6. Presence** — member profile pages, category and area directory,
      completed-work history
- [ ] **7. Trust layer** — licence and insurance capture, verification state,
      expiry lapsing, badges
- [ ] **8. Growth machinery** — claim-your-profile shells, invite-a-non-member
      funnel, referral credit, work-alert digests
- [ ] **9. Promotion** — advertising placement sold as an add-on, priced from
      the plan catalogue, reusing the sponsored marquee
- [ ] **10. Close the loop** — awarded bid to job identity to PO and invoice

Phases 1 to 4 make it a marketplace at all. Phase 5 makes it Eric's
marketplace. Phases 6 to 9 make it big. Phase 10 stops it leaking.

---

## 7. Loose ends found while reading

- **`routes.tsx` defines `"bid-room"` twice** — line 471 to `BidRoomV2`, line
  565 to `BidRoom`. The last key wins, so `BidRoomV2` is unreachable dead code.
  It is the only duplicate route key in the file. It needs a decision, not a
  tidy-up.
- **Job media buckets are public.** `project-photos`, `project-videos` and
  `project-blueprints` hand out permanent public URLs with no size or type
  limit. That is true today, before any Exchange work — but a member board
  multiplies how many people hold those links, and they are photographs of
  customers' homes. Signed URLs before the board opens.
- **The 010 entitlements migration is written and unapplied.** Review it
  against decision B rather than applying it as it stands.
- **`SUBSCRIPTION_RATES` in `territory-cohorts.tsx` is a hard-coded price
  list** (99 / 149 / 199) outside the plan catalogue, which breaks
  `plans-are-one-connected-system`. Fold it in during phase 3.
- **The internal names stay.** The route is `bid-room`, the tables are
  `bid_requests`, `bids` and `bid_invitations`. Renaming a schema is a
  migration with real risk and no customer benefit.

---

## 8. The customer side — "search your local companies, made easy"

Everything above is written from the member's side. This section is the other
half, and it is the half that decides whether the member side has any value at
all. A directory with no searchers is a cost; searchers are what the
subscription is really buying.

### What a resident actually does

They do not browse directories. They have a problem — the water heater is
leaking, the closing is Thursday, the lawn has got away from them — and they
want to stop having it. So the product is not "a directory", it is:

    1. SAY WHAT YOU NEED      plain language or a category, plus where you are
    2. SEE WHO IS NEAR        who covers it, how far, verified or not, how
                              fast they usually answer, what they have
                              completed on the platform
    3. SEE WHAT IT COSTS      a real range from real completed jobs nearby
    4. ASK A FEW OF THEM      capped at five, the searcher picks, or the
                              routing picks for them
    5. CHOOSE                 compare quotes side by side, award, and the job
                              runs through the pipeline like any other

Step 3 is the one nobody else can do. After a year of awarded bids and
completed jobs, the Exchange knows what a bathroom actually costs in this
county — *"$12,000 to $28,000, from 34 completed jobs within 20 miles"*. Google
cannot show that, Yelp cannot show that, and the lead-resale sites will not,
because vagueness is how they sell the same lead five times. It is the single
most persuasive thing on the page and it is a by-product of the Exchange
running the money, not a feature anyone has to invent.

### What makes a resident trust it

**Verification, visibly.** Licence on file, insurance in date, both with an
expiry that actually lapses the badge. "Every company here has a verified
licence and insurance" is a sentence Google, Yelp and the lead sites cannot
say, and it is the reason to use this instead of a search engine.

**Proof of work, not stars.** Jobs completed on the platform, on time, at or
near quote. A rating earned from a transaction the system witnessed is worth
more than a review anybody can write, and it cannot be bought.

**No pile-on.** The capped slots mean a resident gets a handful of quotes, not
forty calls in an hour. This is the opposite of what the lead-resale sites do,
and it should be said out loud in the marketing, because everybody has been
burned by it.

---

## 9. How it is marketed and sold without driving people away

Eric's question: *"how do we market and sell this without driving people away
but to make them want to join because search your local service companies are
now made easy?"*

### The four things that actually drive people away

Worth naming, because every decision below is aimed at one of them.

    EMPTY RESULTS     The worst of the four and the only one that is fatal.
                      A resident who searches "plumber" and sees nothing
                      never comes back and tells people it does not work.
                      Density before marketing, always.

    A WALL TOO EARLY  Being asked to pay or register before seeing anything
                      of value. People do not buy a directory sight unseen.

    THE PILE-ON       Five companies calling within the hour because the lead
                      was sold five times. This is why people distrust the
                      whole category.

    DEAD LISTINGS     A company that never answers. One of those undoes ten
                      good experiences.

### The sequence, and the order is the strategy

**1. Fill the directory before anyone is invited to search it.** Claim-your-
profile shells from licence registries and supplier lists mean a territory can
look complete before a single company has signed up. Do not market to residents
until their searches return real results — this is the one rule that cannot be
bent.

**2. Lead with the trial, never with the price.** Access is by subscription and
that is settled, so the offer is *"search every local company, free for your
trial"* — full use of everything, then a tier. The number that decides whether
they convert is **time-to-first-real-job**, so the trial clock should not start
until there is something in their area worth seeing.

**3. Sell the outcome, not the access.** Nobody wants a subscription to a
directory. They want: one place, every company near you, licence and insurance
verified, real prices from real jobs, and a handful of quotes instead of forty
calls. That is the sentence. "Access to Phoenix Exchange" is not.

**4. Join at the moment of need, not before.** The account gets created inside
the job post, not as a gate before the search. Somebody with a leak will finish
a signup; the same person browsing on a Tuesday will not.

**5. Let the members do the marketing.** Every member profile is a page they
will link to, put on a van, and send to their own customers for reviews. Badges,
a QR code, a review-request flow. A directory that grows through its members
costs nothing per resident; one that grows through advertising costs more every
month.

**6. Say the thing the competition cannot.** *We do not sell your lead to five
companies and we do not take a cut of the job.* Every contractor in the county
has been burned by the lead-resale sites, and every homeowner has been
pile-oned by them. Being the opposite is the whole pitch, to both sides at
once, and it is true of this design rather than bolted on.

**7. Market the territory, not the platform.** "Every service in this county,
in one place" is a local claim that can actually be made true, and it is far
more credible than a national one. Saturate, then move.

### The one honest risk to manage in public

Black Phoenix will be a member of its own marketplace — writing the rules,
taking first look at every construction job in its radius, and collecting
subscriptions from its competitors. Members will work that out.

The answer is not to hide it. Make it a visible, finite rule: *"Black Phoenix
holds this until 4pm, then it is yours."* A marketplace whose owner quietly
takes the best jobs gets abandoned the moment somebody notices the pattern. One
that openly takes first look, inside a stated radius, for a stated window, is a
rule everybody can price in — and most will take the deal, because the jobs are
real.

---

## 9b. Two doors into one Exchange

Eric: *"we will probably make a separate portal of the exchange customer just
signing up for the exchange, and the Black Phoenix Builds customer will get
access through their portal as well."*

So there is a new portal type — **the Exchange customer** — for a resident who
joins the Exchange alone, while existing Black Phoenix customers reach the
same Exchange from the portal they already have.

**Two doors, not two products.** One Exchange, one set of data; the portals
differ only in what surrounds it and what each account may reach. Building a
second Exchange behind the new door is how the two drift apart and start
disagreeing about what a listing says.

Three things that are easy to get wrong:

**One person, one account.** Somebody who is already a Black Phoenix customer
signing up at the Exchange door with the same email must resolve to their
existing identity, not a duplicate. A duplicate splits their history, their
saved companies and their reputation, and merging afterwards is painful.

**The Exchange customer is the narrowest account on the platform.** Name,
contact, location, and what they have asked for. It must not be able to reach
construction records, pipeline data, or anything belonging to a Black Phoenix
customer — enforced in the route handler, not by which menu items render.

**It is an upgrade path.** An Exchange customer who hires Black Phoenix
becomes a Black Phoenix customer and brings their history with them. That
conversion is one of the better reasons for Black Phoenix to run the
marketplace at all.

---

## 9c. The boundary: standalone surface, shared spine

Eric: *"I want to keep all the advertising and vendors and subcontractors in
the main app we have built. This Exchange will be a standalone portion that
ties into the main app."*

### What belongs to the Exchange

Its own front door, its own two portals, the category taxonomy, listings,
consumer search, reviews, the job board and routing, and the engagement modes.

### What stays in the main app, untouched

The advertiser system, the vendor and materials hub, the subcontractor
portals, and everything in construction operations. These are not moved,
absorbed or rebuilt. When the Exchange needs them it reaches across a seam.

### The seams, named

    IDENTITY      one `organizations` row per real company, one person per
                  login, whichever door they came through
    MONEY         cohorts, for trials, tiers, usage and revenue
    JOBS          job identity and the pipeline — an awarded Exchange job
                  becomes a job like any other
    ADVERTISING   the main app sells the inventory; the Exchange displays it
                  and supplies the audience
    MATERIALS     an Exchange winner can buy through the vendor catalogues
    OVERFLOW      main-app work requests that Black Phoenix declines or
                  cannot place leave through the Exchange

### The trap, stated plainly

**"Standalone" is right for the interface and wrong for the data.** The
failure mode is that the same company becomes a vendor record in the main app
*and* a separate business record in the Exchange, and from that day they
disagree about the name, the address, the licence and the subscription.

So: **separate surfaces, shared spine.** One company, one row, many
relationships. A subcontractor who also lists in the Exchange is one company
with two relationships, never two companies.

---

## 9b-ii. The lead ledger — what the Exchange is really collecting

Eric: *"people can search all related business and get all the information and
contact info, as well as contacting and messaging from the portals... if the
customer wants to get bids for work this will go through their portal so we
can at least track all the leads to sell the app."*

That last clause is the design principle, not a feature. **Leads are tracked
because the lead count is what sells the subscription.** A business is never
sold on software; it is sold on *"you received 34 enquiries here last month,
and won nine of them."* That sentence only exists if the contact happened
inside the system.

So the thing being accumulated is a **lead ledger**: one record per contact,
whatever form it took.

    viewed      the profile was opened
    revealed    the phone number or email was shown
    called      the number was tapped
    messaged    a thread was started
    requested   a bid or booking request was made
    awarded     the business won the work

### The tension in that sentence, and how it resolves

Eric wants searchers to **see the contact details** — which is right. Hiding
a phone number is the single most resented behaviour of the lead-resale
sites, and copying it would undo the whole positioning.

But a phone number printed as text produces a call nobody can count.

The resolution is not to hide it. It is that **every contact is an action in
the system rather than a string on a page.** The number is shown, and showing
it is an event; tapping it is an event; messages and requests are records by
their nature. The searcher gets exactly what they wanted and the lead is
still counted. Nothing is withheld to force a funnel.

### Outbound links — the Exchange holds, it does not host

Eric: *"they will have links to their sites, so we will just hold whatever is
uploaded to portals and advertising."*

So a listing carries the business's own website, and the Exchange stores only
what the business uploads. That is the right scope — nobody wants to be in the
website business — but four things come with it.

**A click out is a lead leaving, so count it.** Same principle as the phone
number: show the link, and make the click an event. It is also the best
conversion material there is — *"we sent you 212 visits to your site last
month"* is a sentence a business can check against their own analytics, which
makes every other number in the ledger more credible.

**Validate the URL on the server.** Restrict to http and https where it cannot
be bypassed. A `javascript:` target stored in that field would execute for
every other visitor, and these links render across the portals and the store.
Render them with `rel="noopener noreferrer nofollow ugc"` so a member's site
cannot reach back into the opening page and so a hacked or spammy member
domain does not drag the Exchange's own search ranking down with it.

**Links rot, and rotted links are worse than none.** Businesses close, domains
lapse and get re-registered by whoever wants the traffic. A directory sending
residents to a dead shop — or to malware sitting on an expired domain — loses
trust faster than it earns it. A periodic checker that flags dead or
redirected links for review is cheap to build and almost every directory
skips it.

**Holding uploads makes us a host.** Size and type limits, scanning, the
approval queue for anything public, and a route for "that is my photograph,
take it down" — because sooner or later somebody uploads a competitor's
pictures.

### Reuse, not a second inbox

Messaging already exists in the app, including the rule that one portal
account and one company share a single thread. Exchange messaging extends
that model rather than standing up a parallel inbox — two inboxes means a
business misses messages, which is worse than having none.

### What this makes the most important screen

The business portal's performance view. It is the only place that turns the
ledger into the sentence that converts a trial, and it is the reason the
metering in decision B cannot be scheduled last.

---

## 9c-ii. Advertising: one system, many surfaces — plus a sponsors portal

Eric: *"I want this Exchange to use the advertising we create from the
advertising portals, and we will need to create a sponsors portal as well that
has the ability to advertise."*

**The Exchange gets no advertising system of its own.** Campaigns and
creatives are built in the advertising portals that already exist; the
Exchange is **inventory** — somewhere those campaigns are shown. Defending
this is worth effort, because a second ad stack means two campaign builders,
two approval queues and two sets of numbers for the same advertiser.

What the Exchange contributes is new placement, and it is better placement
than the main app has, because it carries consumer traffic:

    marquee            already exists, already rendered across portals
    search results     sponsored position against a category and an area
    category pages     "plumbers near you", sponsored at the top
    section pages      Food, Entertainment — the weekly-habit surfaces
    event listings     sponsorship attached to a dated thing

Targeting is by category, section, territory and audience — all of which the
Exchange knows and the main app currently does not. That is what makes the
inventory worth more than it is today.

**A sponsors portal is a fourth portal to build**, alongside the Exchange
business portal, the Exchange customer portal, and the existing advertiser
portal in the main app. It rides on the same inventory and the same approval
machinery — it is a different audience and a different product, not a second
pipeline.

### What a sponsor is, settled

Eric, 2026-10-01: *"a sponsor is a local business sponsoring events, my
company."*

So sponsorship is **association with a thing**, not impressions against an
audience. That is what separates it from advertising and justifies its own
portal and its own pricing.

    WHAT CAN BE SPONSORED
      an event, or a series of them — whoever runs it
      a section or a town page

Eric clarified that sponsoring Black Phoenix means *"community events we run
with their logo attached"*. That collapses the model usefully: **everything
sponsorable is an event**, and the only difference is who owns it — a member
business, or Black Phoenix as the operator. One object, one set of
sponsorship machinery, two kinds of owner. Sections and town pages are the
only non-event inventory.

### The community events are also the launch plan

Worth noticing, because it is a strategy and not just a feature. Black
Phoenix running community events in Pelham, Salem and Manchester does four
things at once:

    it puts the Exchange in front of residents in a way that does not feel
      like advertising
    it gives the Entertainment section real listings before any venue has
      joined — the section is not empty on day one
    it gives local businesses a reason to engage and pay before the
      directory is even full, through sponsorship rather than subscription
    it is the town blog's first content, and the blog is the SEO engine

That is the cold start solved from a second direction: the compiled
directory makes the platform look complete, and the events make it look
alive. Worth treating as part of the launch sequence rather than as
something that happens later.

Practical note: real events carry real obligations — permits, insurance,
weather, cancellation — and a sponsor who paid for a cancelled event needs a
stated remedy.

    HOW IT IS SOLD
      a named package for a period at a flat price, not a CPM
      tiers — title sponsor, supporting sponsor
      limited slots per object, so it stays scarce the way territory does

    WHAT THE SPONSOR GETS
      name and logo on the thing, a link, and a record of what it reached

A sponsor need not sell anything on the Exchange at all — a bank, an
insurer or a utility can sponsor a town's summer events without ever being
a listed business. That is precisely why it is a separate audience, and it
makes sponsorship a **third revenue line** alongside subscriptions and
advertising, independent of how many businesses have converted.

Two small things that matter in practice: an event that is cancelled leaves
a sponsor owed something, so the package needs a stated remedy; and sponsor
assets go through the same approval and the same http/https link validation
as everything else published.

Two existing rules apply without exception: anything a sponsor publishes that
reaches other people is approved before it goes live, and any sponsor-supplied
link target is restricted to http and https **on the server**, because those
links render across the portals and the store.

---

## 9d. The business portal — one shell, modules by engagement mode

"Really advanced, and able to work for all different types of business" is the
largest single build in this plan — larger than the board. Five portals for
five kinds of business would be unmaintainable and would drift. One portal
with modules switched on by the categories a business holds is the only shape
that survives.

### The core — every business, every type

    PROFILE         name, story, photos, hours, service area, categories
    CREDENTIALS     licence, insurance, certifications, health inspection —
                    with expiry that actually lapses the badge
    INBOX           messages with customers, in one thread per customer
    REQUESTS        what came in, and what was done about it
    CALENDAR        availability, closures, staff
    REPUTATION      reviews earned from real transactions
    PERFORMANCE     views, leads, conversion, response time — the metering
                    from decision B, shown back to the business
    BILLING         trial status, what it converts to, usage against limits
    TEAM            owner, staff, roles
    PROMOTION       buying placement, from the main app's inventory

### The modules, keyed to engagement mode

    QUOTE   the job feed, bid composer, quote templates, slot usage,
            won/lost history. Mostly exists already.
    BOOK    bookable services, durations, staff assignment, availability
            rules, deposits, cancellation policy
    ORDER   menu or product catalogue, modifiers, pickup and delivery
            windows, the live order queue
    EVENT   event listings with dates, recurrence, capacity, RSVP or tickets
    LIST    profile and enquiries only

A business holding more than one mode gets more than one module. A caterer
sees ORDER and QUOTE; a venue sees LIST and EVENT.

### Sizing it honestly

The core is most of the work and it is shared, so it is worth building first
and properly. Then one mode at a time, in the order the sections open. Do not
start five modules at once — three half-finished modules is the same failure
as three half-empty sections.

---

## 9e. Information architecture — a main page, then sub-pages per section

Eric: *"maybe we can have a main page for the exchange and break them up into
sub pages to break up what people are looking for."*

Yes — and the important part is that **each section gets the layout that fits
how people actually look for that thing.** Same spine, same data, different
front end. One generic search page across all of them would serve none of
them well.

    MAIN PAGE          where you are, what is near, what is on, what is open
                       now. A doorway, not a directory.

    FOOD               a map with logos, a list beside it, open-now, deals
                       and happy hours running now

    ENTERTAINMENT      what is on — by date first, not by business. A
                       weekend view

    SERVICES           search and compare — credentials, distance, response
                       time, reviews

    HOME & PROPERTY    describe the job, get bids. The existing quote flow

## 9f. The Food section in detail

Eric's description: *"the food and restaurants, we have a portal set up — they
can add all their info and logos in, and we will create a local map and place
their logo where they are and it will be clickable so people can find them
easy. We will create a list alongside that will be clickable as well, and we
will have all the deals and happy hours and anything they add into and pay for
running within that section."*

### Map and list, side by side

A map carrying the business's **own logo** at its own location, not a generic
pin, with a clickable list beside it that stays in step with the map. Logos
rather than pins is the right call: it is what makes the page feel like the
town rather than like a database, and a restaurant will share a map they can
see themselves on.

**Provider: Google Maps** (decided 2026-10-01). Custom HTML markers are
supported, so real logo pins work, and cloud map styling lets it carry the
brand rather than looking like everyone else's map. Four practical notes:

    COST        billed per map load, and the main page is the busiest page
                on the platform. Use a static map image for the preview and
                load the interactive map only when somebody engages with it.
                That one decision is the difference between a trivial bill
                and the largest per-visitor cost the product has. Confirm
                current pricing before committing — it has changed.
    DATA        Google Maps is for DISPLAY, never as the source of the
                compiled directory. Places content cannot be stored or
                republished under its terms. The directory comes from public
                registries, as section 9k already specifies.
    BRANDING    attribution is required and a competing map cannot be
                overlaid.
    THE KEY     referrer-restricted, scoped to the APIs actually used, and
                never committed to the repository.

Three things it needs that are not obvious:

**Accurate coordinates, and a way to fix them.** Geocoding gets a street
address close, not exact. The portal needs "drag your pin to where you
actually are", or a third of the logos will sit in the wrong car park.

**Clustering, or it becomes a pile.** Twenty restaurants on one block cannot
all show a logo at low zoom. Something has to collapse and something has to
win the visible slot — which is, conveniently, an advertising product.

**Logo moderation and sizing.** Logos are tenant-published content reaching
the public, so they go through approval, and they need a size and format
discipline or the map will look broken.

**Every location must carry a mark from day one.** Eric: *"it will be
required, or we can use a generic one for the industry they are in."* The
generic industry mark is the better of the two and it is not really a
fallback — it is the **launch state**, because the pre-created
claim-your-profile shells will have no logo at all and a map full of gaps
looks dead. So: a designed icon per category, in the brand palette, good
enough that a map made entirely of them still looks finished.

Requiring a logo at sign-up is friction at the exact moment the business is
being won, so the better shape is: generic mark by default, upload nudged as
part of profile completeness, and the map never has a hole in it either way.
Spec it tightly — square, minimum size, transparent background — auto-generate
the display sizes, and do not let an advert be uploaded as a logo.

### Deals and happy hours are time-bound, and that is the feature

A happy hour is not a field, it is a **recurring time window** — Monday to
Friday, four until six. A deal is a **date range**, sometimes with a daily
window inside it. Model both properly from the start:

    recurring    days of week + start and end time + effective dates
    one-off      a date range, optionally with a daily window
    state        draft / pending approval / live / expired

Because once that exists, the Exchange can answer **"what is happening right
now, near me"** — happy hours on at this moment, kitchens still open, a deal
that ends tonight. That is the single strongest reason for a resident to open
the app on a Friday, and it is what turns the Food section into the habit
engine described in section 10. A static list of restaurants is not that.

### What a restaurant pays for

Eric: *"anything they add into and pay for running within that section."* So
the monetisation of Food is **visibility and promotion**, not transactions:

    featured pin        survives clustering, shows at low zoom
    top of the list     for an area, a cuisine, or a time of day
    deal promotion      a deal pushed into the main page's "on now" strip
    section sponsorship the sponsors portal product

This answers the question left open in decision B2 for at least one section,
and it fits the ruling that advertising comes from the main app's system with
the Exchange supplying the inventory.

### What the Food section is not, for now

Eric's description is listing, contact and promotion — not ordering and not
payments. The Exchange shows the restaurant, the menu, the deal and the way
to reach them. It does not take the order. That keeps the section cheap to
build and avoids competing with ordering systems restaurants already pay for.

The honest cost of that choice: with no transaction, Food has no verified
reviews and no price data of the kind the quote side will have. Its trust
comes from being accurate and current — which makes the approval queue and
stale-deal expiry more important here than anywhere else.

---

## 9g. Search: ours to run, and a slot that can be sold

Eric: *"we should have a search engine on the exchange to find what exactly
they are looking for, but we can sell that as an advertising spot for Google
or Firefox or Bing, whoever we sell it to — just an option for the app to make
more money."*

So the search is **ours**, over our own data, which it has to be: only we know
what is open now, which happy hour is running, who is within three miles and
who has insurance in date. No external engine can answer that.

What gets sold is the **slot** — the premium position on the results page.

### The fill order, and it matters more than the slot itself

    1. HOUSE      a member paying for the top position in that category and
                  area. Highest value per impression by a wide margin, and
                  it is revenue from the people the platform is built for.
    2. DIRECT     a regional or national advertiser buying the section or
                  the territory, through the sponsors portal.
    3. REMNANT    programmatic — Google and the rest — filling only what did
                  not sell.

"Selling the spot to Google" is, in practice, programmatic remnant fill: an ad
network pays to occupy inventory nobody bought. It is real money and it is
worth switching on, but it is the **lowest**-value tenant of that slot, so it
belongs last in the waterfall rather than first.

### Three costs to go in with eyes open

**It pays modestly.** Programmatic on a local directory is small money per
thousand impressions. The same slot sold to one local plumber is worth far
more, which is why house fill goes first.

**It can show a member's competitor.** A plumber paying for presence, seeing
a rival's advert beside their own listing, is a churn event. Category
exclusions are not optional.

**Third-party tags are a privacy and security surface.** They execute on the
page, they track, and they bring consent obligations. Hard rule: programmatic
tags belong **only** on public discovery pages. They must never appear on a
page carrying customer job details, addresses, photographs, quotes or
messages.

---

## 9h. The demand ledger — the gaps are the sales pipeline

Eric: *"I want the customer to flow through the exchange easy and search for
anything. Even if we don't have everyone on the site, we can have AI create a
log of how many times they give out business in the area, to then go after
that business to join our app."*

This is the strongest growth mechanic in the whole plan, because it turns the
cold-start problem — the thing that kills marketplaces — into the thing that
fills them.

### What gets logged

Every search is a demand signal, and the **unsatisfied** ones are the valuable
ones:

    query           what they typed, in their words
    category        what the AI resolved it to ("guy to fix my gutters" →
                    gutters)
    where           area, and distance they would travel
    results         how many, and how good
    outcome         contacted somebody / gave up / asked for someone we do
                    not have

Zero-result and thin-result searches are gold. *"Gutter cleaning, this county:
47 searches, 2 listings"* is not a gap in the directory, it is a ranked
recruitment list that writes itself every night.

### Shells accumulate a real record before the business ever joins

Pair this with the claim-your-profile shells from section 5. A pre-created
listing quietly gathers the same ledger a member's does — views, searches
that matched it, people who wanted its number. By the time anybody calls that
business, the pitch is specific and verifiable rather than a cold sell:

> "Last month 112 people in your area searched for what you do, 14 of them
> opened your listing and asked how to reach you. Claim your profile and
> they come to you."

### Where the AI genuinely helps

Resolving free-text queries into categories, clustering them into "this area
wants X", matching the gap against real local businesses from licence
registries and public sources, ranking who to approach by how much demand
they are missing, and drafting the outreach. That is a nightly job, not a
feature — and the output is a worklist.

### Two constraints that are not negotiable

**Never overstate the referrals.** If a business is told "we sent you 30
leads", it has to be true and checkable against their own phone log. One
inflated claim and the whole pitch — and the ledger it rests on — stops being
believed. Shell listings must never show manufactured activity.

**Never hand over the searchers.** Search logs are personal data about
residents who were promised a free, clean product. A non-member business may
be told *how many* people wanted them; it may never be given who they were.

That constraint is also the conversion: **the demand is the pitch, the leads
are what joining unlocks.** Fourteen people wanted you this month — claim the
profile and the next fourteen reach you.

---

## 9i. Range, and the search criteria sheet

Eric: *"we can have the customer set a range that we search for what they are
looking for — maybe we can create a search criteria sheet to make it easier
to search."*

### Range belongs to the category, not to the app

One global radius is wrong for a platform carrying both restaurants and
roofers. Nobody drives thirty miles for a sandwich and nobody limits a
specialist solicitor to three. So the **default radius is a property of the
category** — five miles for food, fifteen for personal services, thirty for
trades, seventy-five for professional specialists — with the customer free to
widen or narrow it, and their choice remembered.

Getting this right costs one column and makes every first search feel like
the product understands the question.

### The criteria sheet is per-category, over a common core

A sheet that asks a restaurant-seeker for square footage is worse than no
sheet. So:

    COMMON       where, how far, when they need it, budget if relevant,
                 open now, verified only, minimum rating
    PER-CATEGORY fields defined on the category itself — cuisine and party
                 size for food, property type and dimensions for a
                 renovation, matter type for a solicitor, date and headcount
                 for a venue

The per-category definitions live on `exchange_category` beside the
engagement modes, so adding an industry stays a row rather than a release.

### The same sheet is the quote request — build it once

This is the part worth noticing. A filled-in criteria sheet **is** a job
description. So the one structured thing a customer fills in either filters
listings or becomes a request for bids, depending on what they do next. One
form, two outcomes, nothing re-typed — and the bid arrives rich enough to
price without a site visit, which is the complaint every contractor has about
every other platform.

The app already has most of this: `WorkRequestFullView` captures property
type, room type, dimensions, square footage, condition, budget, priority,
service type and style detail, with photographs and video. That is a criteria
sheet for construction. The work is generalising it per category, not
inventing it.

### A saved sheet is an alert, and that is the retention

A saved search is a standing intention: *tell me when a gutter company joins,
when a deal starts near me, when something is on this weekend.* That is the
reason a free customer account is worth holding between emergencies — and it
feeds the demand ledger directly, because *"23 people have a standing search
that matches your business"* is another true sentence for the recruitment
call.

### One caution

The sheet must be the **refinement, not the gate**. A twenty-field form in
front of the search box loses most people in the first ten seconds. One box
and a location to start; the sheet appears when they want to narrow, or when
they decide to ask for quotes.

---

## 9j. The one crossing point into the main app

Eric: *"the only time the customer will be sent into my app is if they are
looking to get a quote for work that I have on my list that we do."*

This is the cleanest boundary stated so far. **The Exchange is the customer's
home.** They search, compare, contact, message, book and request quotes there
and never leave it — unless what they want is work Black Phoenix itself does,
in which case the journey continues in the main app.

### It requires one canonical list

The switch is "is this on our list", so there has to be **one authoritative
catalogue of what Black Phoenix does**, mapped to Exchange categories and
scoped to its territory. Not a list in a page, a list the router reads. That
same list is what decides first refusal in section 4, so the two must be the
same object or they will disagree the first time a service is added.

### Does the customer move, or does the request move?

Worth deciding deliberately, because they are different products.

    THE REQUEST MOVES   The customer stays in the Exchange. Black Phoenix
                        receives the job in the main app and works it there.
                        Quotes come back into the Exchange alongside anyone
                        else's. The customer never notices a boundary.

    THE CUSTOMER MOVES  They are handed into the Builds portal to continue —
                        design centre, takeoffs, site visit scheduling, the
                        richer construction tooling.

**Recommendation: the request always moves; the customer follows only when
there is a reason.** A reason being a design session, a scheduled site visit,
or an accepted quote. Two arguments for it:

Somebody who ends up hiring a different company should never have been pushed
through a change of scenery for nothing — and every quote request would
otherwise create a half-formed Black Phoenix customer account that mostly
never converts.

But the counter-argument is real and worth weighing: **the design centre is
the best reason to pull them in early.** A homeowner wanting a deck quote who
is handed a design tool, a model and a render is being given something no
competitor on the Exchange can match. That is worth a boundary crossing, and
it argues for moving them at the point they want to design rather than at the
point they accept.

### What the customer should see

Nothing procedural. They asked for quotes; quotes arrive. Black Phoenix
appears among the quoters like anyone else. The first-refusal window happens
underneath, and if Black Phoenix passes, the request reaches the rest of the
Exchange without the customer doing anything.

### And it is an upgrade, never a second account

A customer who crosses becomes a Black Phoenix customer by **upgrade** — same
identity, Exchange history intact. See section 9b.

---

## 9k. Compile the directory first, let businesses claim into it

Eric: *"maybe we compile a list of all the businesses and add them to the
site, and they can create a portal and have more options."*

Yes — and this is the piece that makes everything else in the plan work,
because it answers the only truly fatal problem a marketplace has: **the
directory is complete before anybody has joined.** A resident searching on
launch day finds their town, not an empty page.

### Three states, and the ladder between them

    LISTED       compiled from public records. Name, category, address, map
                 pin with the generic industry mark, phone, hours if known.
                 Nobody has claimed it. It still accumulates the demand
                 ledger — views, searches matched, people who wanted the
                 number.

    CLAIMED      the business proved control and created a portal. Now they
                 own it: logo, photographs, description, hours, links,
                 messaging, deals and events, and — the point — they can see
                 the leads that were already waiting.

    SUBSCRIBED   after the trial. More categories, wider radius, placement,
                 promotion, the advanced portal modules.

The ladder is the sales process, and it runs itself: the listing gathers
demand, the demand is the pitch, the claim starts the trial, the trial's own
numbers close the subscription.

### Where the list comes from

    state and county business licence registries
    contractor and trade licence boards
    health department restaurant inspections — every food business in the
      county, and an inspection grade worth displaying
    liquor licences — bars, and a strong signal for the Food section
    chambers of commerce and town business directories
    OpenStreetMap

A caution on sources: public records are fine to compile and publish, but
scraping a commercial maps product and republishing it breaches its terms.
Stick to public registries and open data.

### Four things that have to come with it

**Claim verification, and it is the security control.** Proven control of the
listed phone, email or domain before the listing is handed over. A competitor
claiming a business's listing would be the worst failure this product could
have, so the check belongs on the server and it fails closed.

**Accuracy and a way to fix it.** Registry data goes stale — closed
businesses, old addresses. "Suggest an edit" for residents, and a fast
correction path for the business itself.

**An opt-out that is honoured quickly.** Some businesses will not want to be
listed. A removal request should be simple and immediate; arguing about it
would cost more goodwill than the listing is worth.

**No invented content.** No fabricated ratings, no implied endorsement, no
manufactured activity on an unclaimed listing. The demand numbers shown to a
business must be real, for the same reason given in section 9h: the ledger is
the product, and it only works if it is believed.

---

## 9l. The main page — proving the town before asking a question

Eric: *"how can our main page really tell the story of how we can show people
what's really available near them? I want people to be impressed when we break
down everything they can do, go to eat, or find a service in a click of a
button."*

### Search belongs on the main page, and it is the hero

Not saved for the portals. The main page is what a first-time visitor sees and
what Google indexes; a portal is for somebody already inside. Hiding search
behind a login would be backwards.

Portals get their **own** scoped search — a business searching the job board,
a customer searching their own requests and saved places — but that is a
different tool with a different job.

### The principle: answer "what is near me" before asking "what do you want"

Every directory opens with an empty box and demands a query. That is why they
all feel like databases. The Exchange should **show the town first** and let
the search box be there for people who already know what they want.

If a resident lands on the page and immediately sees their own town — real
counts, real logos, things happening this evening — the value is proven
before anything is asked of them.

### What the page carries

    LOCATION          detected or chosen, always visible, always editable.
                      Everything below it changes with it. "Lewisburg, 10
                      miles" is the frame for the whole page.

    SEARCH            large, central, with rotating real examples —
                      "roofer", "tacos", "something to do Saturday",
                      "someone to fix a gutter"

    THE COUNT         "412 businesses within 10 miles." This is the compiled
                      directory earning its keep: proof of completeness in
                      one line, and a number no empty competitor can show.

    HAPPENING NOW     happy hours running at this moment, kitchens still
                      open, deals ending tonight, what is on this weekend.
                      Only possible because deals and events are modelled as
                      time windows rather than text. This is the single most
                      impressive element on the page and the reason somebody
                      opens it on a Friday.

    FOUR DOORS        Eat · Do · Services · Home. Big, visual, one click
                      into a section laid out the way that section is
                      searched.

    THE MAP           a preview of the town with real logos on it. Seeing
                      your own high street rendered with the businesses you
                      recognise is the thing that makes a person believe the
                      product is real.

    WHAT IS MISSING   "Can't find someone? Tell us who." Feeds the demand
                      ledger in section 9h directly, and makes the gap a
                      contribution instead of a failure.

### The impression, in one sentence

Completeness, immediacy and locality — the count says *everything is here*,
Happening Now says *it is alive right now*, and the map says *this is your
town, not a database*. A category grid says none of those things, which is
why the page should not open with one.

---

## 9m. The town blog, and how ratings work

Eric: *"we should have a town blog as well, with ratings in the portals."*

### Why a blog is worth more here than it looks

It is the SEO engine. "Best breakfast in <town>", "who to call for a frozen
pipe", "what opened on Main Street this month" — local content is exactly
what ranks, and it brings free search traffic forever. That is the same
strategy as making listings indexable, and it compounds with it: the articles
link to the profiles, the profiles link to the articles.

It also changes what the Exchange *is* socially. A directory is a vendor's
website. A town blog makes it the town's own place, which is the difference
between a service people use and a thing people feel part of.

And it gives a business a reason to care before they have paid anything:
being featured is worth more to a local restaurant than any banner.

**Reuse rather than build.** The content centre already exists as a product
on this platform. A town blog should run on that machinery rather than
becoming a second publishing system.

### Who writes it

A mix, and the mix matters: platform-written features, AI-assisted drafting
from real platform data (*"the ten most-searched services in the county this
month"* writes itself from the demand ledger), businesses submitting their
own news and openings, and eventually residents. Everything published passes
the approval rule for tenant content before it reaches the public.

### Ratings — the rules are the product

Ratings are easy to build and easy to ruin. Four rules:

**A rating earned from a witnessed interaction is marked as such.** The
platform saw the message, the quote request or the awarded job, so that
review carries a verified badge. Open ratings are allowed but visibly
unverified. Over time the quote side accumulates far more verified ratings
than Food can — an asymmetry worth being honest about rather than hiding.

**The business always has a right of reply**, shown alongside.

**Nobody can pay to remove a rating, ever.** Not as a tier benefit, not as a
favour, not quietly. The moment that is possible the ratings are worthless
and so is the directory. This needs to be a rule in the code, not a policy in
a document.

**Review solicitation is a feature, not a loophole.** A business can ask its
customers for reviews through the portal; it cannot filter which ones get
published based on what they say.

---

## 9n. Territory is the thing that gets sold — decision D resolved

Eric: *"this will be a one stop shop, then we can sell territory for all
contractors and so on."*

The tension the plan opened with — capped cohorts versus "largest in the
world" — turns out not to be a tension at all. They are two halves of one
model:

    EVERYONE IS LISTED        the compiled directory, as complete as public
                              records allow. Completeness is what brings
                              residents, and residents are what make a slot
                              worth buying.

    A FEW HOLD THE POSITION   a limited number per category per territory pay
                              for placement. The scarcity is the product.

What a territory slot buys: top of search for that category and area,
prominence on the map, first look at matching leads, a badge. What it must
never buy: exclusivity of *listing*. Competitors stay visible — a directory
that hides businesses has stopped being a directory, and a resident who
discovers that is gone for good.

### Define a territory as a fixed unit, not a radius

The one trap that must be avoided before a single slot is sold. A sold
territory has to be a **named geographic unit** — a county, or a defined
cluster of postcodes. Not each business's own service radius.

Overlapping radii mean two contractors both believe they bought the same
town, and once their money has been taken that argument has no clean answer.
A business's service radius remains a separate thing and continues to decide
what work they are *shown*; the territory is what they *own*.

### The rest of the slot mechanics

    renewal     the incumbent gets first refusal on their own slot, or the
                product becomes a yearly auction nobody can plan around
    waiting     a full territory is a sales list, per section 5.7
    founders    the existing ten founder slots at 30% off are the launch
                mechanism and already exist in territory-cohorts.tsx
    pricing     through the cohort system, which already models banded
                pricing and spots remaining

---

## 9o. Where AI genuinely earns its place

Eric: *"we will definitely need some AI assistants to bring this to life."*

Agreed, with a preference for the places where it removes real friction
rather than the places where it is decorative.

### For the customer

    PLAIN LANGUAGE SEARCH   "someone to fix my gutters before winter, under
                            $800" resolved into category, criteria sheet,
                            radius and budget. This is what makes "search
                            for anything" true rather than aspirational.
    DESCRIBING A JOB        photographs into a scope, a likely trade and a
                            rough size — so a request is good enough to
                            price without a site visit
    PLANNING                "what is on this weekend near me" assembled
                            from events, deals and opening hours

### For the business — mostly onboarding friction

    PROFILE FROM NOTHING    building a claimed profile from their website,
                            their licence record and a photograph of their
                            signage
    MENU FROM A PHOTO       the single biggest friction remover for
                            restaurant onboarding, and Food onboarding is
                            the bottleneck for the habit engine
    DRAFTING                replies to leads and to reviews, quotes from the
                            criteria sheet against their own price book
    EXPLAINING              "why am I not getting leads" answered from their
                            own ledger

### For the platform — the one that decides whether this scales

    MODERATION TRIAGE       tenant content must be approved before it goes
                            live. At a few hundred free businesses posting
                            menus, deals, events and photographs, that queue
                            is the bottleneck that stops growth. Automatic
                            triage with human review of the uncertain cases
                            is what keeps it moving.
    DEMAND CLUSTERING       free-text searches into categories and gaps, and
                            the nightly recruitment worklist of section 9h
    CATEGORISING            registry rows into the taxonomy when the
                            directory is compiled
    THE TOWN BLOG           drafted from real platform data
    HYGIENE                 duplicate detection, stale listings, dead links

### Three rules for it

**Never invent a fact about a real business.** Hours, prices, menu items and
claims must come from what the business supplied or from public record.
A hallucinated detail about a real restaurant is both a trust failure and a
liability, and it is the most likely way AI damages this product.

**AI-drafted content still goes through approval.** Drafting is not
publishing.

**Meter the cost.** A free consumer side with unbounded AI calls is an
unbounded bill. Budget per surface from the start, the same way the lead
ledger is metered from the first free account.

---

## 9p. Rulings of 2026-10-01, in Eric's words

> "yes this will need a open ai to read and compute what is needed. addition
> phots or video walk through, yes we must be able to confirm a buisness
> owner, yes make rules permanet, we will provide buisness name, buisness
> type, address, phone, website if available until confirmed, the platform,
> we redirect to there website unless they pay to advertise"

### The unclaimed listing — exactly what it shows

Settled, and it is deliberately thin:

    business name
    business type (category)
    address, and the map pin with the generic industry mark
    phone
    website, if public record gives one

Nothing else until the listing is confirmed. No photographs, no description,
no hours, no deals, no ratings — because none of that can be trusted before
an owner stands behind it, and inventing it would break the rule in section
9k.

### Until they pay, the listing is a signpost

> "we redirect to their website unless they pay to advertise"

So an unclaimed or unpaid listing sends the visitor **out** to the business's
own site. The platform is doing the business a favour and asking nothing.

Two things follow:

**Count the click anyway.** It is a referral, it belongs in the ledger, and
it is the pitch: *"we sent 212 people to your website last month — claim your
listing and they could be messaging you here instead."* The redirect is not a
dead end, it is the sales argument.

**Make coming back easy.** A resident who bounces out to a restaurant's own
site and never returns is a lost visit. The redirect should be an obvious,
deliberate exit — not the only thing the page does.

What claiming and paying buys is **owning the destination**: the visitor
stays, sees the full profile, the photographs, the hours, the deals, and can
message directly. That is a clean, honest upgrade ladder and it needs no
dark patterns to work.

### Confirming a business owner — the control, not the formality

> "we must be able to confirm a buisness owner"

Verification of control is a security boundary, not a tick box. A competitor
successfully claiming a listing is the worst failure this product has
available to it. So: proven control of the listed phone, email or domain —
a code to the number on public record, a message to a domain-matched address,
or a DNS or file check on the website. Verified on the server, failing
closed, and never satisfied by a self-declared email alone.

### Permanent rules

> "make rules permanent"

The ratings rules of section 9m are now permanent and belong in the code
rather than in a policy document:

    no path exists to delete a rating in exchange for money, a tier, or a
      favour — the endpoint should not exist at all, only flag-and-review
      with a published outcome
    the business always has a right of reply
    verified and unverified ratings are visibly distinct
    solicitation is allowed; filtering by sentiment is not

A rule that lives in a settings toggle is not permanent. These should be
enforced where they cannot be switched off under pressure.

### Photographs and a video walkthrough on a request

> "addition photos or video walk through"

A request carries photographs and a **video walkthrough**, which is the thing
that lets a business price work without visiting. The upload machinery
already exists.

Two cautions, and the second is serious:

**Cost.** Video from a free consumer side is the largest storage and
bandwidth line this product will have. Length and resolution limits from the
start, not retrofitted.

**Privacy.** A video walkthrough of somebody's home is among the most
sensitive content the platform will ever hold — rooms, possessions, security
arrangements, children. The current buckets are **public**, handing out
permanent URLs to anyone who has the link. That was already flagged in
section 7; a consumer-facing video walkthrough makes it unacceptable rather
than untidy. Private buckets and signed, expiring URLs must be in place
before a single customer uploads a walkthrough.

### On the AI provider

The platform already has `aiBidRouter.tsx` and `AIBidAssistant`, so the
Exchange's assistants should extend what is there rather than starting a
second integration. The design in section 9o holds whichever provider is
chosen; what matters is that the three rules there — never invent a fact
about a real business, drafting is not publishing, and meter the cost — apply
to all of it.

---

## 9q. Moderation, ratings display, walkthrough protocol, ownership proof

### Negative is allowed; harsh is not — and the line is behaviour, not sentiment

Eric: *"we need to make sure that the blogs, even though they can be bad, we
don't want anything too harsh."*

The trap here is real and worth naming: if "too harsh" quietly becomes
"anything that upsets a paying member", the ratings are worthless and so is
the directory — the same failure as paying to remove a review. So the
standard has to be **sentiment-neutral**. What is judged is conduct, not how
badly the business comes out of it.

    STAYS, however damaging    "they were two weeks late", "the finish was
                               poor", "nobody returned my calls", "it cost
                               double the quote"
    REMOVED                    slurs, threats, personal attacks on named
                               individuals, accusations of crime presented
                               as fact, anything about matters other than
                               the dealing, contact details or addresses of
                               people, spam, and reviews traced to a
                               competitor

Two softeners that reduce harshness without censoring anything:

**A right of reply before publication.** A low rating is shown to the
business for a short window — a day — before it goes live. Most heat comes
out of a complaint when somebody answers it, and the reply publishes
alongside. Nothing is withheld; it is only delayed.

**No ratings on unclaimed listings.** The right of reply is a permanent rule,
so a listing nobody owns cannot carry ratings — there is no one to exercise
it. This also removes the worst abuse case, which is a competitor reviewing a
business that cannot answer back.

### Star ratings: shown, with four honesty rules

Yes, shown — a rating nobody can see is not a rating. But:

    THRESHOLD    no average displayed until there are enough reviews to mean
                 something. Below that, show the count and the reviews
                 themselves, not a score. One bad night should not brand a
                 restaurant at 1.0 forever.
    VERIFIED     ratings from a witnessed interaction are visibly distinct
                 from open ones
    RECENCY      a five-star from three years ago is not the same claim as
                 one from last month, and the display should say so
    THE REPLY    shown inline with the review, never buried

Dimensions beyond a single star — on time, on budget, quality,
communication — are worth more on the quote side than a single number, but
they can come later. One star plus a comment first.

### The walkthrough protocol — no gaps

Eric: *"protocol must be in place, we don't want any fall back with the
walkthroughs."*

A video walkthrough of somebody's home is the most sensitive content this
platform will ever hold. The protocol, in full:

    PRIVATE STORAGE    private buckets. No public URL is ever minted for a
                       walkthrough, under any circumstance.
    SIGNED ACCESS      short-lived signed URLs, issued per viewer per
                       request, never shared or reused.
    WHO CAN SEE IT     the customer, and only the businesses the customer
                       actually sent that request to — and only while the
                       request is live. Access ends when the request closes,
                       is withdrawn, or the business is removed from it.
    LOGGED             every view recorded: who, when, from where. This is
                       the control that actually matters, because it is the
                       only one that survives someone screen-recording.
    RETENTION          deleted a set period after the job closes. The
                       strongest protection is not holding it at all.
    CUSTOMER CONTROL   the customer can delete it at any time, and is told
                       plainly, before uploading, exactly who will be able
                       to watch it.
    NEVER INDEXED      no walkthrough, and no page containing one, is ever
                       reachable by a search engine.
    CHECKED ON UPLOAD  type, size and length limits, and scanning.

An honest limit to state rather than paper over: anyone who can watch a video
can record their screen. Technical prevention of that is theatre. The real
controls are **limiting who can view** and **logging every view** — so the
list of people who could possibly have copied it is short, known, and
attributable.

### Proving ownership on multiple factors

Eric: *"owners must prove ownership on multiple factors."*

At least **two factors from different categories**, verified on the server,
failing closed:

    control of the phone on public record      code by SMS or voice call
    control of a domain-matched email          code to name@theirdomain
    control of the website                     DNS record or hosted file
    control of the premises                    code posted to the address
    licence match                              number verified against the
                                               issuing board's record
    documents                                  licence or registration,
                                               reviewed by a person

Four rules around it:

**The bar rises with what is at stake.** Claiming a listing that has already
accumulated demand, or buying a territory slot, should need more than
claiming an empty one.

**Always notify the public-record contact.** When a claim succeeds, the phone
and email on public record are told — even if neither was used to claim. This
is the single cheapest way to catch a hijack, because the real owner finds
out immediately.

**Transfers are never silent.** A disputed or second claim notifies the
incumbent, waits, and goes to review. Ownership does not move because
somebody filled in a form more recently.

**Re-verify on change.** Changing the contact email or phone on a claimed
listing re-triggers verification and alerts the previous address.

---

## 9r. Answers to the blocking questions — 2026-10-01

### Launch area: Pelham, Salem and Manchester, New Hampshire

A cluster of towns rather than one, which fits the existing 40-mile territory
radius and gives roughly a quarter of a million people. Manchester supplies
the density for Food and Entertainment; Pelham and Salem supply the
residential work for the quote side. *(One thing to confirm: the list reads
"Pelham, Salem, Manchester, Salem NH" — taking all three as New Hampshire
unless Salem, Massachusetts was also meant.)*

### Its own domain — settled

Not a path on `theblackphoenixcompany.com`. A separate product with a
separate audience gets a separate name. The cost is that search authority
starts from zero, which makes the town blog and the indexable listing pages
the priority they were already argued to be.

### The customer moves — settled, overriding the earlier recommendation

> "if someone wants my services and a work request, they should automatically
> move them into my customer portal, with a connection to the exchange for
> the portal"

So when the request is for work Black Phoenix does, the **customer** is moved
into the Black Phoenix customer portal, automatically, and that portal keeps
a link back to the Exchange so they never lose it.

Two consequences to handle rather than discover:

**Every qualifying request creates a Black Phoenix customer account**, most
of which will not convert into jobs. That is acceptable as long as the
account is an upgrade of the Exchange identity rather than a second one, and
as long as the portal is useful to somebody who ends up hiring a competitor.

**They must never feel evicted.** The move is a widening — they keep the
Exchange, and they gain the construction tooling. If it reads as "you have
left the marketplace", it will cost more than it gains.

### Every Exchange portal reaches the ecommerce store — settled

A new seam, alongside identity, cohorts, job identity, advertising and the
vendor catalogues. The retail storefront only: materials-hub products stay
out of the store.

### Quote slots: the first five, inside a window of at least 48 hours

> "I don't pick. It will be the first 5 returned, unless we allow the portals
> to set a time when they are due back — nothing shorter than 48 hours unless
> it is an emergency."

So decision F resolves as **routing, not hand-picking**, with:

    SLOTS      five, taken by the first five quotes submitted
    WINDOW     the request stays open at least 48 hours before it closes,
               so the slots are not won by whoever happened to be holding
               their phone
    EMERGENCY  the window collapses; speed is the point

The window is what makes the cap fair, and the cap is what keeps the customer
from being buried. Both are needed; either alone fails.

*(Worth confirming: the 48 hours is read here as the **minimum life of the
request**. The alternative reading — that a business states when it will
respond by — is also workable and could sit on top of it.)*

### Customers sign up — free, but not anonymous

> "customers need to open a portal and sign up"

An account for every customer. One qualification worth raising, because it
pulls against the separate-domain decision above: **the pages a search engine
indexes have to be readable without an account.** A new domain starts with no
search authority, and the plan to earn it rests on listings and town-blog
articles being publicly readable.

So the shape that serves both: **listings, profiles and blog posts are public
and indexable; everything else is behind the sign-up** — searching with saved
criteria, messaging, requesting quotes, saving places, alerts, reviews, and
the whole customer portal. The resident sees enough to believe it, and signs
up at the moment they want to act.

### Still open: how the sections separate, and how people search them

> "we still need to figure out how we separate all the different businesses
> and how they search for them"

The next design conversation, and the right one to have before building.

---

## 9s. Separating the businesses, and making sure nothing escapes

Eric: *"we want to make sure we can push everything that can go to us that we
service, or our territory indicate they service."*

### Three levels, and the leaf is what matters

    SECTION     Home & Property · Services · Food · Entertainment
    CATEGORY    Roofing · Plumbing · Restaurants · Live music
    SERVICE     roof replacement · roof repair · gutters · skylights

A business lists itself at **category** level. A request matches at
**service** level. That difference is what stops a roofer being sent gutter
cleaning they do not do, and it is the granularity the whole matching engine
needs.

### Customers do not speak in categories

They type "my sink is leaking", "someone to redo my kitchen", "guy for
gutters". Three layers absorb that:

    ALIASES     a large synonym table mapping real phrases to services.
                Cheap, fast, and it handles most traffic.
    AI          resolves anything the aliases miss into a service, a radius
                and a budget — the plain-language search of section 9o.
    LOGGED      every phrase that resolves badly or not at all goes to the
                demand ledger. That is simultaneously how the taxonomy
                improves and how the recruitment list is built.

### A business declares services × area

Coverage is two things, both declared by the business: **which service
leaves** they do, and **where** they will travel. Matching is the
intersection. Later, travel distance can vary by service — a plumber will go
ten miles for a leak and forty for a bathroom — but that is a refinement, not
a first release.

### Making sure nothing escapes Black Phoenix

This is Eric's actual requirement, and it needs three mechanisms rather than
one, because a single exact-match rule leaks.

**1. The catalogue.** One authoritative list of the service leaves Black
Phoenix does, flagged on the same taxonomy everyone else uses. Same object
that drives first refusal, so the two can never disagree.

**2. Exact match routes first.** Request service is in the catalogue and the
site is inside the territory: Black Phoenix sees it alone for the
first-refusal window, then it releases.

**3. Near-misses surface anyway — err toward showing it.** A request that is
unclassified, or classified to a service adjacent to the catalogue, goes into
a **"might be ours"** queue that Black Phoenix can see and claim. It does not
hold the request up and it does not block anyone else; it just means nothing
quietly routes past the one company that would have taken it. This is the
mechanism that actually delivers "push everything that can go to us".

**4. Supplier of last resort.** Any Home & Property request inside the
territory that **nobody** matches goes to Black Phoenix regardless. No
request in Pelham, Salem or Manchester should ever sit unanswered while the
company that owns the platform is sitting there able to do it.

### Then the territory holders, then everyone

    1. contracted vendors    where a contract already exists — stops here
    2. Black Phoenix         exact match in territory, first-refusal window
    3. territory slot        the paid holders of that category and area
    4. all matching members  service and area match
    5. Black Phoenix again   as last resort, if nobody matched at all

### Guard against over-claiming, or matching rots

Every directory suffers the same decay: businesses tick every category to
catch more leads, match quality collapses, customers stop trusting the
results. Three controls, and they should go in from the start:

    a category limit per tier — five included, more sold as an add-on
      (decided 2026-10-01, "let's start with 5 categories per tier and sell
      more"). See the three qualifications below.
    evidence for regulated trades — electrical, plumbing, gas and the rest
      require a verified licence before the category can be held
    outcome feedback — a business that never quotes in a category, or
      consistently disappoints in it, is quietly down-ranked there

### The category allowance — five included, more sold

Eric, 2026-10-01: *"let's start with 5 categories per tier and sell more."*

Three qualifications that decide whether five is generous or stingy.

**Count categories, not service leaves.** Holding "Roofing" brings every leaf
under it — replacement, repair, gutters, skylights — at no extra cost. Five
*categories* is generous for almost every business on the platform; five
*leaves* would be absurd for a roofer. This one distinction is what makes the
number work.

With that rule, five comfortably covers a restaurant, a salon, a solicitor
and a single-trade contractor, and binds only on genuinely multi-trade
builders — who are exactly the businesses that can afford to buy more. That
is the right place for a limit to bite.

**Mind the cliff at the end of the trial.** The trial includes everything, so
a general contractor may hold fifteen categories for six months and then face
dropping to five. Left unmanaged that is precisely the "taking back what was
given free" failure from decision B.

It is avoidable, and only by saying it early: the trial states the
at-conversion allowance from day one, the portal shows "12 of 5 included"
throughout rather than at the end, and conversion is an explicit choice of
which five to keep with the rest offered as add-ons. Then the trial ended as
described, which is a different thing from a capability being withdrawn.

**Ten is the ceiling.** Eric, 2026-10-01: *"I would say a max of ten."* So
five included, five more buyable, and a hard stop — nobody holds eleven at
any price. That is the control that stops the upsell eating the match
quality, and it also bounds the revenue per business, which is fine: the
bigger levers are territory and placement, not category count.

The one business the ceiling could unfairly bind is a genuine multi-trade
builder, and the taxonomy solves it rather than an exception: **"General
Contracting" is itself a category** that matches whole-project requests, so a
builder does not have to hold fifteen individual trades to be found for a
renovation. Specialist trade categories stay for specialists. Worth getting
right, because a cap that punishes the most capable firms would be the wrong
signal entirely.

Show the ceiling during the trial too — *"15 held · 5 included · 10
maximum"* from the first day, not discovered at conversion.

**Paying buys reach, not relevance.** A purchased category is still subject
to the licence evidence rule for regulated trades, and still subject to
outcome-based down-ranking. A business cannot buy its way into categories it
cannot evidence or perform in — otherwise the upsell quietly destroys the
match quality the limit existed to protect.

**Categories are global; territory is the other axis.** The five are held
across the business as a whole, not per town. Territory is sold separately,
and keeping the two axes independent is what keeps the pricing explicable.

### How search then works

Sections are the four doors. Inside one, a resident either browses the
category tree or types what they want and the aliases and AI resolve it.
Results are matching businesses ordered by: territory slot holders first,
then verified, then distance, responsiveness and rating. The criteria sheet
narrows it, and the same sheet becomes the quote request.

---

## 10. Why food and entertainment are the strategically important part

This deserves its own section because it is easy to read "restaurants and
entertainment" as scope creep, and it is the opposite. It is the thing that
makes the rest work.

**Construction is a product people need twice a decade. Food is a product
people need twice a week.**

A contractor directory cannot build a habit. Nobody opens an app to look at
roofers for fun, so every visit has to be bought — through advertising, SEO, or
somebody remembering you exist at the exact moment their water heater fails.
That is the most expensive kind of traffic there is, and it is why contractor
marketplaces burn money.

Food and entertainment invert that. A resident who opens Phoenix Exchange on a
Friday to see what is on and where to eat is a resident who will think of it on
the Tuesday the boiler dies. The cheap, frequent, low-stakes categories buy the
attention; the rare, expensive, high-stakes ones monetise it.

Three consequences for the plan:

**Sequence the sections by what builds the habit, not by what earns first.**
Services is already half-built and earns, so it goes first by necessity. But
Food should come before the deeper construction work, because it is what turns
a once-a-decade destination into a weekly one.

**The customer account becomes worth having.** Saved places, favourites, what
is on near me, past orders and past jobs in one history. That is a reason to
hold an account between emergencies, and an account held between emergencies
is the whole asset.

**It changes who the advertisers are.** A restaurant advertising to local
residents is a far bigger and more frequent advertising market than
contractors advertising to each other. The marquee and placement inventory the
platform already has is worth considerably more against weekly traffic than
against occasional traffic.

### What going this wide puts at risk

**Three half-empty sections look worse than one full one.** The cost of
breadth is credibility: a Food section with four restaurants in it says the
platform is dead more loudly than no Food section at all. Open a section only
when its density in the launch territory would survive being searched.

**Moderation becomes a real workload.** Menus, event listings, photographs,
offers and profiles are tenant-published content reaching the public, and the
standing rule is that such content is approved before it goes live. At a few
hundred free businesses that is a job. The design has to carry automatic
checks plus an earned trust level that lets established members publish
without a queue, or the approval backlog becomes the thing that stops growth.

**Free registration is an abuse surface, and it is now consumer-facing.**
Fake listings claiming a real restaurant, scraped menus, fake reviews, job
posts made only to harvest contractor phone numbers. Verification of the
*claim* matters more when joining is free, not less — proven control of the
listed email or phone, duplicate detection, rate limits on posting, and no
auto-publishing of anything containing a link until the account has a history.

**Free means the costs are real before the revenue is.** Photographs, video,
menu images, emails and texts all cost money per free account. Caps and
sensible defaults from day one are cheaper than retrofitting them after the
bill arrives.

**And the public buckets get worse.** `project-photos`, `project-videos` and
`project-blueprints` hand out permanent public URLs with no size or type
limit. That was a contained problem when the audience was invited
subcontractors. With open consumer registration and free business accounts
uploading menus and galleries, it becomes an unbounded, publicly writable
store of unscanned files, alongside customers' house photographs. This should
be fixed before the Exchange opens, not after.

---

## Review

*(to be filled in when the work is done)*
