# PLAN — marketing Black Phoenix, and making the portals able to sell

Eric, 2026-10-03:

> *"scan the platform and put together a detailed plan to market the black
> phoenix Builds construction and also all our platforms portals and
> capabilities. we need to updage all the poratal so they can market and sell
> maintence plans subscription plans and add ons."*
>
> *"we can use social media and other ways if we have a good enough plan that
> will my this sell"*

Scanned against the live database and the current code on 2026-10-03. This is
the plan asked for, and it opens with the thing the scan found, because it
changes the order of everything else.

---

## 1. What the scan found

### The platform is enormous and almost entirely unsold

    345 routes
    12  portal types, each with a built portal view
    10  public landing pages, all reachable without signing in
    ~90 server modules

Marketing machinery that already exists and works: an SEO engine, Page Pilot,
the content studio, social publishing to **twelve** platforms, autopilot
campaigns, reels, abandoned-cart recovery, SMS and email campaigns, a CRM and
lead capture, the physical store, the digital store, Phoenix Exchange, the
design centre, on-call, and a maintenance-plan system with hours tracking.

Now the money:

    paying subscriptions                1   — and it is Eric's own vendor test
    comped trial grants                 7
    maintenance plan records            1   — a test record
    cohorts                             0
    work requests                       0
    quotes                              6
    leads captured                      1

**There is no revenue problem to optimise. There is no revenue.** That is not a
criticism of the build — it is the single most important input to a marketing
plan, because it decides what the plan is for.

### Eleven of the twelve portals cannot sell anything

This is the direct answer to the second half of the request, and it is worse
than "needs a screen adding".

| What | State |
|---|---|
| `plan_tier:vendor` — Listed $49, Stocked $79, Preferred $199 | **active, Stripe-priced, sellable** |
| `plan_tier:content` — Solo $79, Studio $199, Agency $499 | inactive (deliberately retired in favour of add-ons) |
| 24 × `plan_addon` across 6 audiences — content at $79/$199/$499, on-call | **every one `active: false`, not one has a Stripe price** |
| `plan_addon` on-call / on-call-answered | present, priced **$0** |
| The other 11 portal types (customer, landlord, tenant, property_manager, condo_manager, condo_association, subcontractor, employee, investor, territory_owner, advertiser) | **no tier ladder exists at all** |

So: one audience out of twelve has something to buy. The add-on catalogue is
fully authored and none of it is purchasable — the records are off and have no
price attached, which means the content centre, named repeatedly as a priority,
cannot be bought by anybody.

### The add-ons panel is mounted in 2 of 12 portals

`SubscriptionAddOnsPanel` appears in the vendor portal and the advertiser
tabs. Nowhere else. Ten portals have no surface on which an add-on could be
sold even if one were purchasable.

### Maintenance plans cannot be bought

The system is real — `MaintenancePlanCreator`, hours logging, usage tracking,
tiers derived from hours (Basic ≤10h, Standard ≤25h, Professional ≤50h,
Enterprise above). But a plan is **created by staff for a customer**. There is
no price on it, no Stripe product, and no path by which a customer chooses one
and pays. It is an internal record-keeping tool wearing the name of a product.

### The public pricing page is not connected to the catalogue

`PricingPage.tsx` makes **zero** server calls. Its figures are hardcoded, its
"select plan" handler logs to the console and navigates to signup. So the one
public page whose job is to sell subscriptions does not know what is for sale,
and cannot be wrong-but-fixable — it is simply not wired.

### The front door is the directory, not the construction business

`"landing-page" → DirectoryLandingPage`. The Phoenix Exchange directory is what
a visitor to the root gets. `builds-landing-page` exists, is public, and is a
secondary route nothing points at by default. For a request that begins "market
the Black Phoenix Builds construction", that is the first thing to decide.

### Social: the machinery is ready and nothing is connected

Zero connected accounts. Twelve platforms supported, onboarding built this
afternoon, autopilot campaign runner written and its cron migration parked.
Everything needed to post is in place and no account has been attached.

---

## 2. The diagnosis, stated plainly

**Marketing the platform before it can take money would waste the spend.**
Every pound of attention sent at a portal today lands on a page that cannot
sell a subscription, an add-on that cannot be bought, or a maintenance plan
with no price. The conversion rate of that traffic is not low, it is zero, and
no amount of social media changes an arithmetic of zero.

There is also a strategic point hiding in the request. "Market the construction
business" and "market the platform" are **two different products sold to two
different audiences**, and they do not share a campaign:

- **Construction** sells to homeowners, landlords and boards in southern New
  Hampshire. It has real revenue potential now, a trade reputation to build on,
  and a short path from attention to money. Its channel is local.
- **The platform** sells subscriptions to vendors, managers, landlords and
  advertisers. It is a software business. Its channel is the construction
  customer base, the vendor relationships, and content — and it needs the
  product to be purchasable first.

They connect in one specific direction, and that direction is the whole
strategy: **construction earns the money and produces the customers; those
customers become the portal accounts; the portal accounts become the
subscription revenue.** Marketing the platform cold, to strangers, with one
paying account and no case studies, is the hardest version of the job. Selling
a landlord portal to a landlord whose roof you just replaced is the easiest.

So the plan is in that order, and Phase A is not marketing at all.

---

## 3. Phase A — make it sellable (two to three weeks of work)

Nothing in Phases B to D is worth starting before this. Every item here is
mechanical; none needs a decision beyond pricing.

- [ ] **A1. Decide the price ladder for each portal type.** Eric's decision and
      the only genuine blocker in the phase. Eleven audiences need a three-rung
      ladder each, per `subscription-shape-three-tiers-plus-addons.md`. I can
      draft a proposal from what the portals actually do, for him to change.
- [ ] **A2. Author the tier records.** `plan_tier:{audience}:{id}` for all
      eleven missing audiences, following the vendor records that already work.
- [ ] **A3. Attach Stripe prices.** The routes exist
      (`/plan-tiers/:audience/:id/attach-price`). Nothing can be sold without
      this and it is the step the 24 add-ons are stuck behind.
- [ ] **A4. Activate the add-on catalogue.** Twenty-four records, `active:false`
      → published, with Stripe prices. This alone makes the content centre
      sellable to six audiences for the first time.
- [ ] **A5. Price the on-call add-ons.** Currently $0. Per
      `on-call-is-priced-by-call-hours-and-units.md` this is a base plus
      per-call and per-unit extras, so it needs the pricing model wired rather
      than a single figure.
- [ ] **A6. Make maintenance plans purchasable.** The biggest build in the
      phase: give the four tiers prices, create Stripe products, and add a
      customer-facing "choose a plan" path that creates the plan record the
      existing system already understands. Staff creation stays.
- [ ] **A7. Mount the add-ons panel in all twelve portals.** It exists; it is
      wired into two.
- [ ] **A8. Wire the public pricing page to the catalogue.** Read
      `/plan-tiers` and `/me/upgrade-options` rather than hardcoding. A pricing
      page that disagrees with what Stripe charges is worse than none.
- [ ] **A9. One upgrade path, proven end to end.** Pick the landlord portal,
      take it from "see the plans" to "card charged" to "entitlement granted",
      and watch it work. Per `every-way-in-must-be-verified.md`, this gets
      tested with a real card before anybody is invited.
- [ ] **A10. The trial-to-paid path.** Seven comped grants expire in January
      2027. Before then there must be a way for those accounts to convert
      rather than simply stop working — and they are the best seven prospects
      in the business.

**Exit test for Phase A:** a stranger can sign up to any portal, see a price,
pay it, and receive what they paid for — without anybody at Black Phoenix
touching it.

---

## 4. Phase B — marketing Black Phoenix Builds (construction)

The business with revenue today. Local, trade-led, and the source of every
portal customer later.

### B1. Fix the front door

- [ ] Decide what the root domain shows. My recommendation: **a construction
      landing page**, with the directory and the platform as destinations from
      it. Right now a homeowner looking for a contractor lands on a business
      directory.
- [ ] `theblackphoenixcompany.com` serves the app — confirm the construction
      page is what a first-time visitor gets, and that the Exchange has its own
      entrance rather than owning the main one.
- [ ] Lead capture on every construction landing page, feeding the CRM that
      already exists. One lead captured in the system's lifetime says this is
      either not wired or not reaching anybody.

### B2. The proof that sells construction work

Nothing converts a construction enquiry like evidence, and the platform has
unusual amounts of it available:

- [ ] **Project pages from real jobs.** `OurWork` exists. Every completed job
      already produces a completion report; a public, photographed, costed
      case study per job is the single highest-value marketing asset the
      business can make, and the data is already collected.
- [ ] **Before-and-after reels** from site photos. The reels system is built and
      the design centre already captures photographs per job.
- [ ] **The design centre as the differentiator.** A contractor who can show a
      homeowner a 3D model of their own deck before quoting is not competing on
      price. This is the most saleable capability in the building and it is not
      in any marketing material.
- [ ] **Reviews, asked for systematically** at job completion rather than
      hoped for.

### B3. Local channels, in order of return

- [ ] **Google Business Profile**, complete, with photographs from real jobs
      and a review flow. For a local contractor this outperforms everything
      else and the integration already exists in the social module.
- [ ] **Local SEO pages per service per town.** The SEO engine and Page Pilot
      are built. "Deck builder Bedford NH" is a page this platform can generate
      and nobody has.
- [ ] **The emergency and on-call angle.** `EmergencyServicesLandingPage`
      exists. Emergency work is high-margin, high-urgency, and the on-call
      system is a genuine differentiator — most local contractors do not answer
      the phone at 2am.
- [ ] **Referral from completed jobs.** The referral system exists. A customer
      who just had good work done is the cheapest lead available.

### B4. Social for construction

This is where Eric's "we can use social media" lands most profitably, because
construction content is visual and the raw material is already being captured.

- [ ] **Connect Facebook and Instagram first.** The two that matter for local
      trade. Everything is built; it needs credentials.
- [ ] **Bluesky and Mastodon today** — they need no app registration at all, so
      they are the zero-friction proof that the posting pipeline works end to
      end before the Meta credentials arrive.
- [ ] **One post per completed job**, generated from the completion report and
      the site photographs, approved by a person, published by the autopilot.
      Three to five a week without anybody writing anything.
- [ ] **Seasonal content that is genuinely useful** — and this is the part that
      compounds: the digital products just written are a content library.
      Forty-seven winter prep items, 102 repair procedures, the life-expectancy
      table. Each is a post, and each post can offer the $14 guide.
- [ ] Keep X off the list unless Eric wants it. It charges per post and every
      store post carries a link, at roughly 20 cents each.

---

## 5. Phase C — marketing the platform and the portals

Only after Phase A. The audience is businesses, and the pitch differs per
portal — a single "platform" message sells to nobody.

### C1. The honest positioning per portal

| Portal | Who they are | The one thing that sells it |
|---|---|---|
| Vendor | Local suppliers | Your catalogue in front of every job we quote. Already sellable. |
| Subcontractor | Trades | Work inside your radius, first look. |
| Landlord | Small NH landlords | Tenants, work orders, inspections and a deposit record that holds up. |
| Property manager | Managers with portfolios | One place for maintenance, vendors and approvals across every property. |
| Condo association / manager | Boards | Reserve, meetings, owner approvals, and the governance toolkit. |
| Advertiser | Local businesses | Reach every portal account and the store. |
| Tenant | Renters | Free, invited by the landlord — never sold. |
| Investor / Territory | Capital and partners | A different conversation entirely; not a marketing funnel. |

### C2. The beachhead, and why it is the trial accounts

Seven comped grants, expiring January 2027, across vendor, landlord, customer
and employee portals. They are real people who already said yes once. Before
any cold marketing:

- [ ] Find out what each of them actually used. The platform records it.
- [ ] Ask them directly what they would pay for and what they ignored.
- [ ] Convert the ones that work, at a price set with their input.
- [ ] Write up the first one that converts as the case study everything else
      leans on. **One named local business on the record is worth more than any
      amount of copy.**

### C3. Content, which is the only cold channel that works here

- [ ] The digital products are the top of the funnel. The condo governance
      handbook sells a condo portal; the landlord manual sells a landlord
      portal; the capital planning guide sells to managers. Give one away in
      exchange for an email and the audience assembles itself.
- [ ] Local association and landlord groups: NH has organised bodies for
      property managers, realtors and landlords. One useful talk is worth a
      quarter of posting.
- [ ] Vendor recruitment is direct and unglamorous: the suppliers Black Phoenix
      already buys from, asked in person. The vendor tier is the one product
      that is already sellable, so this is the fastest revenue in the plan.

### C4. What NOT to do

- [ ] No paid advertising for portals until Phase A is finished and at least one
      unprompted customer has bought something. Paid traffic into a funnel with
      an unproven checkout is how a budget disappears without information.
- [ ] No "platform" brand campaign. Nobody buys a platform; they buy the thing
      their own job is about.

---

## 6. Phase D — the machinery, switched on

Everything here is built and dormant. Each item is switching something on
rather than building it.

- [ ] **Arm the store clock** (`store-autonomy.md` Phase 1). It governs
      fulfilment, tracking and customer emails.
- [ ] **Arm the autopilot cron** so posts publish without a tab open — with
      `requireApproval` on for the first campaign.
- [ ] **Abandoned cart recovery**, which exists as a button and needs the job.
- [ ] **The SEO engine against real service-and-town pages.**
- [ ] **Review requests at job completion**, automatically.
- [ ] **The referral flow**, surfaced to customers who just had work done.
- [ ] **One weekly report** to Eric: leads, enquiries, portal signups, trials,
      conversions, store orders, and what the autonomy watchman found. There is
      a reporting place for the store; there is none for the business.

---

## 7. What needs Eric, collected in one place

1. **Price ladders for eleven portal types.** The one hard blocker. I will draft
   a proposal; the numbers are his.
2. **Maintenance plan prices** for the four tiers that already exist.
3. **On-call pricing** — base, per call, per unit.
4. **What the root domain shows.** Construction, directory, or a chooser.
5. **Facebook and Instagram credentials**, when ready. Bluesky and Mastodon
   need nothing and can be connected today.
6. **Whether to approach the seven trial accounts now.** They are the warmest
   prospects in the business and they expire in January.
7. **The two bundle prices and the listing corrections** from the digital
   products work — see the note at the top of `store-autonomy.md`.

---

## 8. What I would do first, in order

1. **A1–A4**, the catalogue: tier records, Stripe prices, add-ons activated.
   Nothing sells until this is done and it is mostly mechanical.
2. **A9**, one upgrade path proven with a real card.
3. **B1**, the front door and lead capture, because traffic is currently
   landing on a directory and leaving no trace.
4. **B4's free half** — connect Bluesky and Mastodon, publish one post from a
   real completed job, and prove the whole pipeline works before the Meta
   credentials arrive.
5. **C2**, the seven trial accounts, which is a phone call each and the
   highest-value hour in this document.
6. Then the rest of B and C, with D switched on as each piece is needed.

The honest summary: **this platform does not need more capability, it needs to
be able to take money and it needs its first ten customers.** Phase A is three
weeks of unglamorous wiring and it is worth more than any campaign that could
be run before it.

---

# PART TWO — the architecture of pricing

Eric's brief, in his words:

> "everything needs to flow together and pricing to match. corhort system
> should run it all and increase and decrease if nessasary. ai assistant should
> be watching of of this and ping the owner and admin if somehting needs to be
> changed and why. i really like the system we built with in the landlord portal
> to add on things of build your own plans is this something we can match in all
> the portal with only the iteam the portal can relate to? but also have a main
> 3 tiered struckture for standarded versions?"
>
> "this will need to link to stripe and the prices as well can we do that?"

Short answers: **yes, yes, yes — and most of it is closer to done than it
looks.** But there is one real problem underneath it, and it has to be fixed
first or none of the rest can be trusted.

## 9. What is already true (read from the code, not assumed)

**The build-your-own builder is already the reusable thing you want.**
`src/app/components/portals/PlanBuilderTab.tsx` describes itself as "a single
reusable tab dropped into every portal", and it is already mounted in **nine**
portals — Advertiser, Condo Manager, Customer, Employee, Investor, Landlord,
Property Manager, Subcontractor, Vendor — plus the public application flow via
`ApplicationPlanBuilderSection.tsx`. It is also **already scoped per portal**:
`PORTAL_ENTITIES: Record<PortalType, EntityType[]>` at line 61 decides which
entity types a portal may build for, and line 107 reads it. So "only the items
the portal can relate to" is the existing design, not a change.

Missing from three subscriber portals: **Condo Association, Sub-Tenant,
Territory**. (Admin, Mobile Owner and the On-Call console are not subscriber
portals and do not need it.)

**The three-tier ladder already exists as a real catalogue.**
`supabase/functions/server/planTier.ts` has audience-scoped tiers, live *and*
test Stripe price ids, a free floor every audience shares, add-ons that can be
priced flat, **per unit covered**, or **banded by unit count**,
`includedAddOns` so a higher rung can give away what a lower rung pays for,
`subscriptionTotalCents` that sums tier + chosen add-ons, and it strips the
Stripe ids before anything reaches a browser. It is a good catalogue. It is
simply nearly empty — only `plan_tier:vendor` is populated, and all 24
`plan_addon` records are `active: false` with no Stripe price.

**There is already a cohort-to-tier adapter.** `planTier.ts` around line 524
converts a cohort into a tier shape, taking the price from
`priceFor(cohort, seats)`. The seat-banded pricing you want the cohort system
to run is already modelled; there are just zero cohort records.

## 10. The problem underneath it: four price lists, and the browser decides

Right now a monthly figure can come from four unrelated places:

| Source | Lives | Who decides the number |
|---|---|---|
| `src/app/data/maintenancePlans.ts` | browser | the browser (`computePrice`) |
| `plan_tier:` / `plan_addon:` | server KV | the server |
| `portalUpgradePrices.ts` | browser | hardcoded |
| `PricingPage.tsx` | browser | hardcoded |

They do not agree, and they cannot, because nothing makes them.

Worse than the duplication: **the plan builder's price is decided in the
browser and the server writes down whatever it is told.**
`src/app/utils/plansApi.ts` posts the client-computed `monthlyTotal`, and the
handler at `supabase/functions/server/plans.tsx:149` stores
`monthlyTotal: Number(body.monthlyTotal) || 0`. There is no recomputation, and
the word "stripe" does not appear anywhere in that file. Somebody who opens the
browser console can build a $900/month plan and save it as $9.

A second one: `/plan-builder/price-custom` (`index.tsx:6443`) takes the
**reference catalogue out of the request body** — so the browser tells the AI
what our existing services cost before asking it to price a new one. Send an
inflated list and the model quotes to match it. The price it returns then flows
into the figure above. (It does require a signed-in caller; an earlier draft of
this document said it was a public route, which was wrong.)

A third, found while fixing the first two: `POST /maintenance-config` had **no
authorisation check at all**, and the auth wall defaults an unlisted route to
"signed in" — so any portal customer, tenant, vendor or subcontractor could
overwrite the platform's entire service catalogue, every price in it included.
`POST /subscription-plan-overrides` and its DELETE had no check either, saved
only by sitting behind the admin prefix list in another file.

Neither is exploitable for a charge today, because nothing in the builder
charges anybody yet. That is exactly why now is the moment: the first thing
Phase A does is connect this to Stripe, and after that it becomes a billing
hole.

## 11. The architecture — one catalogue, four layers

```
  Stripe                   prices + subscription items (the actual charge)
    ^
  plan_tier / plan_addon   the served catalogue: 3 rungs + add-ons per audience
    ^
  cohort records           the store of record: base price, seat bands, capacity
    ^
  AI price watcher         proposes a move, with a reason -> owner + admin
```

**Layer 1 — cohorts are the store of record.** Every price originates in a
cohort record: base price, the `minUsers`/`maxUsers` bands, spots remaining,
capacity. Nothing else holds an authoritative number. That was already the
ruling; this is what makes it true in code.

**Layer 2 — `plan_tier` / `plan_addon` is the projection cohorts publish.**
Portals, the pricing page and Stripe all read this one catalogue, which is
derived from cohorts rather than typed in. The cohort-to-tier adapter already
in `planTier.ts` is the seam.

**Layer 3 — the builder reads the same catalogue.** Every service now living in
`maintenancePlans.ts` becomes a `plan_addon` record carrying its entity scope.
The builder fetches the catalogue instead of importing it, and the **server**
recomputes the total from its own records on save. The per-portal scoping stays
exactly as it is — `PORTAL_ENTITIES` filters server-supplied items instead of
bundled ones. So the answer to "can we match it in all the portals" is: it
already matches, and this is the work that makes the prices inside it real.

**Layer 4 — Stripe.** Yes, cleanly, and the model is the one Stripe is built
for:

- a tier is **one recurring Price**;
- each add-on and each built service is **its own recurring Price**;
- an account's subscription is **one Stripe Subscription with several items** —
  the tier plus whatever they took. Adding a service to a built plan adds a
  subscription item; dropping one removes it, and Stripe prorates;
- per-unit add-ons (on-call) use a **quantity** taken from our own unit count,
  never from the customer;
- a price change creates a **new Stripe Price**. Existing subscribers keep the
  one they are on until deliberately migrated. That is the mechanism that makes
  "increase and decrease if necessary" safe rather than a refund queue.

## 12. The cohort controller — what may move a price

Automatic movement needs guardrails or it becomes a customer-service problem:

- a floor (never below cost — the employee bill rate is the floor for anything
  with labour in it) and a ceiling, per product;
- a maximum move per change (proposal: 10%) and a minimum interval between
  changes (proposal: 90 days);
- **existing subscribers are never moved without notice** — a new price applies
  to new subscriptions, and migrating an existing account is its own
  deliberate, logged act with notice;
- founding-member and admin-granted discounts survive a price move
  (`admin-can-grant-discounts-at-any-time`);
- every move is logged with its reason, so an invoice question has an answer.

## 13. The AI watcher — on the channel that already exists

No second inbox. The store autonomy work already built a report screen and a
two-way ask/answer channel (`askForGuidance`, `GET /store/autonomy/asks`,
`POST /store/autonomy/asks/:id/answer`). The price watcher registers as another
job on the same clock and raises its proposals as asks there.

What it watches, and what each signal means:

| Signal | Reads | Proposal |
|---|---|---|
| Capacity | spots remaining in a territory cohort | nearly full → raise; empty for a quarter → lower or widen |
| Trial conversion | trials converted vs lapsed | low conversion → the rung above the trial is priced wrong |
| Churn | cancels per cohort per month | churn right after an add-on was added → that add-on is overpriced |
| Attach rate | add-ons taken per subscriber | nobody takes it → wrong price or wrong bundle |
| Labour margin | plan price vs employee bill rate × hours | below floor → raise, and flag the quote that caused it |
| Idle add-ons | `active: false` but asked for | activate it |

Each proposal is one ask, pinged to **owner and admin**, carrying: what to
change, from what to what, the number that triggered it, and what the change is
expected to do. Owner approves → the cohort moves → a new Stripe price is
created → the catalogue republishes. Nothing moves a price without that
approval until you say it may.

## 14. Tasks

- [x] **P1. Recompute the plan price on the server.** DONE — see the review at
      the end of this document.
- [ ] **P2. Move the service catalogue to the server.** Every item in
      `maintenancePlans.ts` becomes a `plan_addon` record with its entity
      scope, skill and frequency multipliers. One migration script, read back
      and verified.
- [ ] **P3. The builder reads the catalogue.** `PlanBuilderTab` fetches instead
      of importing. `PORTAL_ENTITIES` filtering stays. No visual change.
- [ ] **P4. Populate cohorts, and derive the catalogue from them.** One cohort
      per audience per rung, with bands. `plan_tier` / `plan_addon` become its
      projection.
- [ ] **P5. The three rungs for all eleven audiences.** Names, what each
      includes, prices. **Drafted — see `tasks/price-ladders.md`**, which turns
      out to be ten ladders rather than eleven (the content centre is an add-on,
      not a portal type) and carries four conflicts that need settling first.
      Waiting on Eric's edits to that table.
- [ ] **P6. Stripe prices for every rung and every add-on,** live and test,
      written into the catalogue. Subscription items, not separate
      subscriptions.
- [ ] **P7. Mount the builder in the last three portals** — Condo Association,
      Sub-Tenant, Territory.
- [ ] **P8. Retire the other two price lists.** `portalUpgradePrices.ts` and
      `PricingPage.tsx` read the catalogue. One source, visibly.
- [ ] **P9. The price watcher,** as a job on the autonomy clock, raising asks to
      owner and admin. Read-only proposals until you arm it.

Order matters. P1 is a fix and ships on its own. P2–P4 are the consolidation and
nothing sells correctly before them. P5–P6 are where money starts moving. P7–P9
follow.

## 15. What this needs from you

1. ~~The three rung names~~ — **ANSWERED: Basic, Advanced, Professional**, the
   same three names in every audience. Still needed: the prices. I can draft all
   eleven ladders from what the portals actually contain and what the vendor
   ladder already charges ($49 / $79 / $199) — the draft comes back as a table
   to edit rather than as a question.

   Note that `plan_tier:vendor` is currently published as Listed / Stocked /
   Preferred, and the maintenance presets in the builder are named per entity
   (Essential Care, Preferred Home, Total Home, and so on). Those are a
   different product — a maintenance plan buys visits, a subscription buys
   features — so they keep their own names unless you say otherwise. The vendor
   ladder, being a subscription, gets renamed to Basic / Advanced / Professional
   in P5.
2. **The guardrails in section 12** — 10% per move, 90 days, never move an
   existing subscriber silently. Confirm or change those numbers.
3. **Whether the watcher may ever move a price by itself** once it has earned
   trust, or whether every move stays approval-only permanently.
4. **Whether a built maintenance plan bills as subscription items on the same
   Stripe subscription as the portal tier, or as its own subscription.** Same
   subscription is tidier and gives one invoice; separate keeps "the plan buys
   visits, the subscription buys features" visible on the statement. My
   recommendation is the same subscription with a separate invoice line group.

---

## 16. Review — P1, the server-side recompute (2026-10-03)

**What was wrong.** The plan builder computed its monthly total in the browser
and `POST /plans` stored `Number(body.monthlyTotal) || 0`. That figure was not
decorative: `provisionLinks` derives an included hours allotment from it and
mints a welcome gift card worth up to $250, both written as real records. So a
posted number decided money. `PATCH /plans/:id` had the same hole one screen
further along — `monthlyTotal` was in its allowed-fields list and a plan's own
owner may reach that route, so an account could re-price a plan it already held.

**What changed.**

- `supabase/functions/server/planPricing.ts` (new) is the server's authority on
  what a plan costs. `pricePlan()` takes only the chosen ids and resolves every
  price from our own records; an unrecognised skill or frequency id falls back to
  the standard rung, never to zero, because a missing multiplier must not make a
  plan free.
- `supabase/functions/server/planPricingData.ts` (new, **generated**) holds the
  115 services, 24 presets and the skill / frequency / region multipliers. The
  edge function deploys only `supabase/functions/server/` and cannot import
  front-end code, so the server needs its own copy;
  `scripts/gen-plan-pricing-data.mjs` writes it from
  `src/app/data/maintenancePlans.ts`, which is still where prices are edited.
- `tests/planPricingData.test.ts` (new, 4 tests) fails if the two copies drift —
  a changed price, a missing service, an invented one, or a multiplier that
  does not match or is zero. Verified it actually fails by changing a price and
  watching it go red, then regenerating.
- `plans.tsx` — `POST` re-prices from the ids, refuses a plan whose items cannot
  all be priced (rather than silently dropping a line the customer chose and
  billing short), refuses an empty plan, and logs any mismatch with the posted
  figure. The service names and the per-line breakdown now come from the server
  too, and the plan record carries a `lines` array so an invoice question has an
  answer. `PATCH` no longer accepts `monthlyTotal` or `annualTotal` at all and
  re-prices whenever the services, skill or frequency change.
- **Custom AI-priced items** were the awkward case: their price does not exist
  until the model invents it, so there was nothing to check against. The server
  keeps the quote now — `price-custom` writes it under a `plan_quote:` key and
  returns only an id. The browser can echo the id; it cannot name the price. A
  quote belongs to the account that asked for it and expires after seven days,
  so an old quote cannot be replayed at a stale price.
- `price-custom` also reads its **reference catalogue from our own records**
  instead of the request body, which closes the "post an inflated comparables
  list and the model quotes to match" route.
- `maintenance-config.tsx` — the two POSTs and the DELETE now require staff.
  They had no check at all, and the auth wall defaults an unlisted route to
  "signed in", so any portal account could have rewritten the whole catalogue.
  Reading stays open to any signed-in account, because the builder has to show
  the catalogue to the person choosing from it.
- `PlanBuilderTab.tsx` — stops sending the catalogue, and uses the server's
  quote id for a custom line. No visual change.

**Checks.** `npm run typecheck` — app 316, server 87, both exactly at baseline,
nothing added. `npm run smoke` — 351 pages rendered, 0 threw. `npm test` — 1636
pass, 0 fail.

**Known gaps, stated rather than left quiet.**

1. The generated copy is a copy. The test makes drift loud, but **P2** is what
   removes the duplication by moving the catalogue into `plan_addon` records.
   `planPricing.ts` keeps its signatures so P2 reaches no caller.
2. `fetchMaintenanceConfig` in the browser sends only the anon key, never a
   session token, so the GET resolves to nobody and — with the auth wall on —
   answers 401 and the builder quietly falls back to code defaults. That means
   the admin editor's saved overrides are probably not reaching the builder
   today. The server reads the saved config directly from KV, so pricing is
   correct either way; the editor's own round trip wants checking separately.
   Not touched here because it is not a security hole and this change was
   already wide enough.
3. Nothing in the builder charges anybody yet — that is P6. What this change
   buys is that the figure which reaches Stripe will be one we computed.
