# The bid room as a marketplace — how hard, honestly

Eric's model: subcontractors and vendors join the platform, anyone can post a
job and receive quotes, **access to post or quote requires a paid
subscription**, all construction and renovation bids within **50 miles** come to
Black Phoenix first and he pushes out what he does not want, **emergency work
orders** run through the same pipe, and if a condo association already has
**contractors under contract** the job goes only to them.

## The short answer

**The expensive half is already built, and built properly.** The half that is
missing is business rules — which is the half that is easier to change your mind
about later.

## What already exists, and is sound

Real Postgres tables with real row-level security:

| | |
|---|---|
| `organizations` | typed `operator`, `subcontractor`, `vendor`, `advertiser`, `customer`, `landlord` — exactly the cast you described |
| `organization_members` | user to org, with role and status |
| `bid_requests` | title, description, trade, site address, budget range, start date, due date, awarded bid |
| `bids` | amount, currency, notes, valid-until, status |
| `bid_invitations` | which orgs were invited to which request |

And RLS that is genuinely enforced, through helper functions —
`my_org_ids()`, `my_admin_org_ids()`, `my_owned_bid_request_ids()`,
`my_invited_bid_request_ids()`, `is_platform_operator()`. A subcontractor can
see a request only if their org owns it or was invited to it. That is the part
most marketplaces get wrong, and here it is correct already.

There is even a directory policy letting the platform operator read
subcontractor, vendor and advertiser orgs — the beginnings of "bring everyone
in".

## What is missing — four gaps, in order of cost

### 1. There is no geography anywhere. This is the big one.

`bid_requests.site_address` is free text. `organizations` has no location and no
service radius. Nothing in either table can answer "is this job within 50 miles
of that subcontractor".

To make the radius rule real:
- latitude and longitude on `bid_requests`, geocoded when a job is posted
- a service centre and radius on `organizations`
- a distance query, and an index to keep it quick

The app already geocodes addresses elsewhere — `lookupParcel` returns latitude
and longitude — so the capability exists and needs wiring rather than inventing.
Still the most work of the four, and the one with a real dependency.

### 2. Nothing connects an organisation to a paid subscription

The plans exist and are priced — vendor at $149/$299/$599, and subcontractor
plans alongside them. What does not exist is any link from an `organizations`
row to a subscription, so "may this org post, may this org quote" cannot be
answered.

This is the revenue gate, so it deserves care: it wants to be one function the
database itself can call inside an RLS policy, not a check in the client that a
determined person can skip.

### 3. The status flow has no room for first refusal

`bid_request_status` is `draft, open, closed, awarded, cancelled`. Your model
needs a step before `open`: the job exists, Black Phoenix has it, nobody else
can see it yet. Then a decision — take it, or release it to the pool — and
probably a timeout so nothing sits forever.

Small database change, slightly more thought about who moves it and when.

### 4. Emergency work orders, and the contracted-vendor exception

The exception is the most interesting rule you described, and the one most worth
getting right: **if a condo association has contractors under contract, the job
goes only to them.** The platform must never broadcast work that its own
customer has already committed elsewhere.

The hook exists — the condo master account can already grant a vendor access to
an association, which is exactly "this vendor works for us". But there is a
wrinkle worth knowing about before we start.

## The wrinkle: the bid room lives in a different place from everything else

The bid room is Postgres with RLS. Almost everything else in this app —
condo associations, grants, work requests, invoices, purchase orders — is in the
key-value store.

So the contracted-vendor rule has to reach across both: a condo grant in the KV
store deciding who may see a bid request in Postgres. That is doable, but it is
the kind of seam that causes trouble later, and it is worth deciding
deliberately rather than by accident:

- **Bridge them** — the routing code reads both. Fastest, and the seam stays.
- **Move condo membership into Postgres** — one identity model for everything,
  RLS can enforce the exception itself. More work now, much less later.

I would lean to the second for anything that decides who sees money, but it is
your call and it is not free.

## Roughly how hard

| Piece | Size | Notes |
|---|---|---|
| Subscription gate | small–medium | the plans exist; needs a link and a policy |
| First-refusal state | small | enum plus a decision endpoint |
| Emergency path | small–medium | work requests already exist; needs a route into bids |
| Contracted-vendor exception | medium | depends on the seam decision above |
| 50-mile radius | medium–large | geocoding, columns, distance queries |

None of it is research. All of it is ordinary work on a foundation that already
holds. The risk is not technical difficulty, it is deciding the rules precisely
enough that the routing does not surprise a paying subcontractor.

## What I would build first

The subscription gate, because it is the revenue and because everything else is
worth less without it. Then first refusal, which is small and is your actual
workflow. Then the contracted-vendor exception. Radius last, because it is the
most expensive and the least useful while the subscriber pool is small — a
50-mile rule matters when you have subcontractors in three towns, not two.
