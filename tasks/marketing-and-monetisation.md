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
- [x] **P2. Move the service catalogue to the server.** Done, but NOT as
      `plan_addon` records — see the review at the end, which explains why that
      part of this task was wrong. The server is the authority on the catalogue
      and serves it at `GET /maintenance-catalogue`.
- [x] **P3. The builder reads the catalogue.** Done. `PlanBuilderTab` fetches,
      with the bundled copy as its starting value so the tab still works if the
      request fails. `PORTAL_ENTITIES` filtering unchanged, no visual change.
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
- [~] **P7. Mount the builder in the last three portals.** Condo Association is
      done. Sub-Tenant and Territory are deliberately NOT done — see the review
      at the end of this document; mounting them would offer a product neither
      is meant to buy.
- [ ] **P8. Retire the other two price lists.** `portalUpgradePrices.ts` and
      `PricingPage.tsx` read the catalogue. One source, visibly.
- [x] **P9. The price watcher.** Built and registered on the autonomy clock,
      read-only, raising asks on the channel that already exists. OFF until it
      is switched on in the autonomy settings. See the review at the end for the
      three signals it cannot yet see.

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

---

## 17. Review — P5's half, the agreed ladders in code (2026-10-03)

Eric approved the ladders ("looks good"), so they are now in the code rather than
only in a document. Nothing is on sale and nothing has been written to the live
catalogue yet — both deliberate.

**What changed.**

- `supabase/functions/server/agreedLadders.ts` (new) holds the nine approved
  ladders as data, each carrying the market figures it was derived from so the
  next person to doubt a price can check it instead of re-deriving it.
- `planTier.ts` gained two audiences, `investor` and `condo_manager`. Both were
  deliberately absent before — the old importer refused to file them under a
  near-enough audience, and was right to, since a condo manager and a condo
  association are different buyers. `territory_owner` is still absent, because
  no market comparable exists for a territory licence and so there is no agreed
  figure for it to hold.
- `planTier.ts` also gained the metered tier shape: `includedUnits` and
  `perUnitCents` on `PlanTier`, plus `tierMonthlyCents(tier, units)`. A flat
  `priceCents` cannot express "based on doors", and every platform in the market
  research charges a floor plus a per-unit rate.
- **A money bug fixed in passing.** `subscriptionTotalCents` added each add-on's
  `priceCents` directly, and for a per-unit add-on that is the price of ONE
  unit — so a hundred-unit association was billed for one. It uses
  `addOnMonthlyCents` now. Nothing bills through that function yet, which is why
  it had gone unnoticed; it would have surfaced as a wrong invoice rather than
  as an error. The two-argument call signature is unchanged, and a test pins it.
- `POST /plan-catalog/seed-ladders` (new, admin only, `?dry=1` supported) writes
  the ladders into the catalogue. Same three rules as the older importer:
  everything lands inactive and with no Stripe price; nothing is overwritten;
  nothing is guessed.
- `tests/agreedLadders.test.ts` (new, 15 tests) pins every approved figure
  literally, checks the rungs are exactly Basic/Advanced/Professional in order,
  that flat ladders carry no stray per-unit rate, that the floor behaves as a
  minimum rather than a rate, and that a nonsense unit count cannot bill below
  the floor.

**Checks.** typecheck app 316 / server 87, both at baseline. 1651 tests pass.

**Known gaps.**

1. **Vendor will be skipped by the seed, by design.** `plan_tier:vendor` already
   holds Listed, Stocked and Preferred with live Stripe prices, so vendors may be
   paying against those records. The seed refuses to write a second vendor ladder
   beside them; renaming and repricing those three is a deliberate act with a
   migration behind it. That is the one audience the approved table cannot reach
   without Eric's say-so.
2. **Nothing has been seeded.** The route exists and has not been run — these are
   live prices, and `test-before-production` says so. Run it with `?dry=1` first.
3. **No Stripe prices.** P6. A tier with no Stripe price cannot be bought, which
   is the safety net under all of the above.
4. **The metered count has no source yet.** `tierMonthlyCents` takes a unit count
   and the ladders define what a unit is per audience, but nothing resolves a
   door count from our own records yet. Until it does, a metered tier bills at
   its floor. That is the safe direction to fail, and it is the next piece of
   work after the seed.

---

## 18. Review — P7, and why it is one portal rather than three (2026-10-04)

P7 said "mount the builder in the last three portals — Condo Association,
Sub-Tenant, Territory." One of those three is right. The other two would have
offered a product the account is not meant to buy, so they are not done, and
this is the reasoning rather than a quiet omission.

**Condo Association — done.** An association buys work on the building and the
common areas, which is exactly what the `condo` service catalogue holds. The tab
is scoped to that single entity on purpose: listing `homeowner` alongside it
would let a board commit the association's money to work inside somebody's unit,
which is sold to the unit owner instead (`condo-revenue-split`). The tab is
visible only to officers who may approve an expense, because building a plan
commits the association to a monthly cost.

**Sub-Tenant — not done, and should not be.** A tenant does not buy maintenance;
their landlord is responsible for it, and the tenant portal exists because the
landlord invited them (`who-invites-which-portal`). A plan builder there would
invite a tenant to pay for work somebody else owes them. If Eric wants a tenant
to be able to buy something — an optional extra inside their own unit, say —
that is a product decision with a question behind it (who approves it, who is
liable, what happens at move-out), not a mount.

**Territory — not done, for a different reason.** A territory owner is a partner
buying an exclusive area, not a buyer of maintenance visits. There is no entity
in the service catalogue that fits them, and the ladder has no agreed figures
either, because no market comparable for a territory licence could be found. Two
blockers, both needing Eric rather than code.

**A wrong-price display found and closed on the way.** `PortalUpgradeModal`
resolved its tiers as `subscriptionTiers[portalType] || subscriptionTiers.customer`
— so a portal with no entry in that hardcoded table was shown **the homeowner
ladder**, with working Buy buttons that would have charged against it. Only
`condo_association` can reach that path today, because every other portal type
has an entry, which is why it had never been seen. It now shows an empty list
and says plainly that plans for this portal are not published yet. That table
being hardcoded in a modal at all is what P8 removes.

**Checks.** typecheck app 316 / server 87, both at baseline — the mount
initially added two findings (an activeTab union that did not know the new tab,
and the modal's prop union) and both are fixed rather than absorbed. smoke 352
rendered, 0 threw. 1657 tests pass.

**Known gap.** The association can build a plan and has no tab that shows the
plans it has built — the landlord portal pairs `PlanBuilderTab` with
`MaintenancePlanTracker` and this one does not. Left out deliberately to keep
the change small; worth adding, and it is a one-line mount when wanted.

---

## 19. Review — where a metered tier gets its door count (2026-10-04)

**Why this and not P8.** P8 was next on the list and is blocked. Pointing
`PricingPage` and `portalUpgradePrices.ts` at the catalogue means checkout starts
validating against the catalogue — and the catalogue holds one ladder today, so
every purchase outside it would be refused. That is the exact danger
`tasks/plan-catalogue-unification.md` names in its ordering note: fill the
catalogue first, delete the constants last. P8 therefore waits on the seed being
run and on P6. This was the next piece that needed no decision and no risk: the
gap left open by the metered ladders, where nothing resolved a unit count so
every metered tier billed at its floor.

**What was already there.** `unitsCovered(email)` — written for on-call, which is
priced by units covered. It reads landlord portfolios, property-manager
portfolios and condo associations, and refuses to guess when it cannot read one.
It needed extending rather than replacing.

**The mistake it would have been to reuse it as-is.** `unitsCovered` sums every
source, which is right for on-call: one person may own a rental house and sit on
an association board, and an emergency could come from either. A tier is a
different question. A landlord's plan is priced on the units they own, and at the
property-manager rate of $5.50 a door, one board seat at a hundred-unit block
would have put $418 a month on a four-unit landlord's invoice.

**What changed.**

- `unitSourceRules.ts` (new) holds the audience → source mapping as a pure
  module, so the rule that decides a bill can be tested. `unitsCovered.tsx`
  reaches `kv_store.tsx`, which node's test runner cannot load, so a rule left in
  there is a rule nothing checks.
- `unitsForAudience(email, audience)` in `unitsCovered.tsx` reads only the source
  belonging to the audience being priced. The three existing readers were
  extracted so both functions share them, and `unitsCovered` itself reads exactly
  the same three sources it did before — its behaviour is unchanged.
- A fourth source added for condo managers: `condo_manager_units:{email}`, one
  record per unit, so the count is the roster length. **Deliberately not added to
  `unitsCovered`**, because that function prices on-call and adding a source to
  it would change what some existing accounts pay for emergency cover without
  anybody deciding to. Whether a managing company's roster should count towards
  their on-call is a real question and it is Eric's.
- `monthlyFigure` takes a unit count and passes it through; `GET /my-plan`
  resolves it with `unitsForAudience` and returns a `metering` block — the count,
  the included units, the rate, and **which properties contributed**. A figure
  that moves because a door was added needs an explanation attached, or the first
  question about an invoice has no answer.
- `tests/unitSourceRules.test.ts` (new, 7 tests) cross-checks the rules against
  `AGREED_LADDERS`: every approved ladder has a decided source, a ladder that
  meters has a source or a stated reason it has none, the flat ladders are never
  metered, and an audience nobody has decided about is treated as unknown rather
  than quietly flat.

**Checks.** typecheck app 316 / server 87, both at baseline. smoke 6 affected
pages rendered, 0 threw. 1664 tests pass.

**Known gaps.**

1. **Investor meters properties and nothing records them.** Its ladder charges
   per property in the portfolio, and this platform has no investor property
   record — `investment:` rows are stakes in deals, not buildings, and counting
   those would bill somebody for holding several positions in one property. So
   investor bills at its floor, with a reason, until there is something real to
   count. The test asserts investor is the *only* knowingly unsourced ladder, so
   a second one cannot slip in quietly.
2. **Nothing charges from this yet.** `/my-plan` reports the metered figure;
   Stripe still has no price for any of these tiers (P6). When it does, the
   per-unit rate becomes a subscription-item quantity, and the quantity has to
   come from this same resolver rather than from a second count.
3. **A count that falls should reduce the bill at once and a count that rises
   should wait for renewal** — the asymmetry proposed in `price-ladders.md`
   section 4. Nothing implements that yet; today the figure simply reflects
   whatever the records say when it is read.

---

## 20. Review — P2 and P3, and a correction to P2 itself (2026-10-04)

**P2 was partly wrong as written, and this is the correction.** It said every
maintenance service should become a `plan_addon` record. It should not, for two
reasons found while doing it.

The first is Eric's own ruling: *"no that is an option the subscriptions are
separate"* — a maintenance plan buys visits from the crews and a portal
subscription buys features, and they are different products
(`subscription-shape-three-tiers-plus-addons`). Filing the services as
subscription add-ons would merge the two things he separated, and the add-on
layer would then be carrying both "the content centre, $219 a month" and
"gutter cleaning, per visit".

The second is mechanical. A `plan_addon` record has one `audience`. A service
has an **entity** — what the plan is built *for* — and the customer portal alone
builds for homeowner, condo, landlord and commercial. So a single condo service
would need a copy under `customer` and another under `condo_association`, and
115 services across the audiences that can reach them is several hundred records
that all have to be edited together. The entity axis and the audience axis are
genuinely different things.

**What the task really needed** was the part underneath it: the server being the
authority on the catalogue, and the builder reading it rather than a copy
bundled into the browser. That is done.

**What changed.**

- `GET /maintenance-catalogue` (new, in `maintenance-config.tsx`) returns the
  merged catalogue — generated defaults with the administrator's saved overrides
  applied — from the same `loadCatalogue` that `pricePlan` uses. One reader, so
  a quote and a charge cannot come from different copies.
- It is readable without signing in, deliberately: the public application forms
  carry the builder and an applicant has no account yet. Nothing in it is a
  secret — every one of these prices already ships inside the front-end bundle
  and is on screen to anybody who opens the builder. `/maintenance-config`, the
  administrator's own saved overrides, stays behind sign-in for reads and staff
  for writes.
- The generated server catalogue now carries `description`, `recommended` and
  `nhSpecific` as well as the money fields, because the builder renders from it
  now and a service with no description would show as a bare name.
- `fetchMaintenanceConfig` points at the new route. It had been calling
  `/maintenance-config` with the anon key alone, which is behind the sign-in
  wall — so it answered 401 and **every caller silently fell back to the bundled
  copy**. That is how the builder could show a price the server had never agreed
  to, and it also means the admin editor's saved overrides have not been reaching
  anybody. Three call sites are fixed by the one change: the builder, the admin
  editor and the subscription-plans page.
- `mergeWithDefaults` now merges the skill, frequency and region lists **field by
  field on id** instead of replacing them wholesale. This mattered immediately:
  the server carries only the fields that decide money, so a wholesale swap would
  have left every technician level with a multiplier and no label, and the
  selectors in the builder would have rendered as blank buttons.
- `PlanBuilderTab` fetches the catalogue, keeping the bundled copy as its initial
  value so the tab renders instantly and still works if the request fails. The
  arithmetic stays in the browser — a total has to update as somebody ticks a box
  — but the numbers going into it are the server's now.
- Preset prices are summed from the catalogue in hand rather than by
  `presetBaseMonthly`, which read the bundle directly. Without that, an
  administrator changing a price would have left the three preset cards showing
  the shipped figure while the à-la-carte list beside them showed the new one.

**Checks.** typecheck app 316 / server 87, both at baseline. smoke 50 affected
pages rendered, 0 threw. 1664 tests pass.

**Deployed and verified against production, 2026-10-04.**

`npx supabase functions deploy make-server-3eae23a6 --project-ref plzsvzwwcdopnawtiwzm --use-api`
with no flags, as `config.toml` already pins the entrypoint and `verify_jwt = true`.
Deployed by name on purpose: a bare deploy ships every function in config.toml,
which once re-exposed 509 retired routes.

| Check | Result |
|---|---|
| `/health` | 200 |
| `GET /maintenance-catalogue` with the anon key | 200, 8 entities, 115 services |
| Multipliers served | apprentice 0.8 / journeyman 1 / master 1.3; monthly 1 / quarterly 0.9 / annual 0.72 |
| `POST /maintenance-config` with the anon key | **401** — writes still refused |
| Labels after the field-wise merge | three skill levels and three frequencies, **zero blank labels** |
| One price end to end | Furnace/AC Tune-Up, $95 x 1.3 Master x 0.72 Annual = **$89/mo** |

The last two were checked by replaying the browser-s own merge against the live
response in node, because the Chrome extension was not connected. That is the
exact thing the field-wise merge protects — the server sends multipliers with no
labels, and a wholesale swap would have produced three blank buttons.

**Known gaps.**

1. **Not seen rendered in a browser.** The merge and the arithmetic are verified
   against production data, but nobody has looked at the tab. The front end also
   has to reach Vercel before any visitor gets this — these commits are not
   pushed.
3. **The entity/audience question is still open.** The services live under
   entities and the ladders live under audiences, and nothing yet maps one to the
   other. It has not had to: the builder asks for an entity directly. It will
   matter when a maintenance plan has to bill through Stripe alongside a portal
   subscription, which is the fourth question in section 15 of
   `price-ladders.md`.

---

## 21. Review — P9, the price watcher (2026-10-04)

Eric's words were *"ai assistant should be watching of of this and ping the
owner and admin if somehting needs to be changed **and why**."* The last two
words are the deliverable, and they shaped the whole thing: a watcher that says
"raise the vendor Advanced rung to $128" is useless, and one that says "raise it
because 9 of 11 trials on it converted" is a decision somebody can make in ten
seconds. Every proposal carries the figure that triggered it and what the change
is expected to do, and a test asserts that none can be raised without both.

**What changed.**

- `priceWatchRules.ts` (new) is pure — no records, no network, no KV — because
  these are rules about money and every way they fail is silent. A watcher that
  proposes a 40% rise because a divisor was one does not throw; it writes a
  confident sentence into the place Eric looks and waits to be approved.
- Six signals: capacity nearly full, capacity unsold for a quarter, trial
  conversion too low, trial conversion so high there is room above, churn above
  a tenth of a rung, and an add-on nobody has taken. The last raises a
  **question with no number**, deliberately — either the price is wrong or the
  add-on is, and the price cannot be the answer to both.
- The guardrails from section 12 of `price-ladders.md` are enforced rather than
  documented: a 10% cap per move, 90 days between changes, a floor and an
  optional ceiling. The cap **clamps rather than refuses**, because the
  direction is the useful half of the judgement and the size is what the rail is
  for. A clamp that lands on the current price proposes nothing, so the watcher
  never suggests changing a price to itself.
- **`MIN_SAMPLE = 8`.** Two trials converting out of two is a coincidence, not a
  signal, and a price moved on it gets moved back next month. Every rule that
  divides checks it first — a ratio from a denominator of one is the classic way
  a watcher like this starts talking confident nonsense.
- **The labour floor outranks the waiting period.** Every other rule is an
  optimisation and can wait ninety days; a rung priced below what the work costs
  loses money on every sale, so it is raised immediately and is not clamped to
  10% — it has to reach the floor, not creep towards it over a year of
  ninety-day steps. An underwater rung reports only that, and nothing else.
- `priceWatchJob.ts` (new) registers as another job on the store autonomy clock
  and raises each proposal as an ask on the existing channel. **No second
  inbox** — a second place to look is a place that stops being looked at.
- A proposal that stops being true **withdraws itself**. A band that filled and
  then emptied would otherwise leave "raise this, it is 90% full" sitting in the
  queue, and an ask that is wrong by the time it is read teaches somebody to
  ignore the screen.
- `tests/priceWatchRules.test.ts` (new, 23 tests).

**Checks.** typecheck app 316 / server 87, both at baseline. smoke 6 affected
pages, 0 threw. 1687 tests pass.

**It is registered and OFF.** Like every job on that clock it stays off until it
is switched on in the autonomy settings, and switching it on grants it nothing
but the ability to ask: it writes no price and the rules module returns
sentences, not writes.

**What it cannot see yet, stated rather than estimated.**

1. **Churn.** Nothing records a cancellation against a rung. The Stripe webhook
   clears `tierId` off the grant when a subscription ends, which loses the one
   fact the churn rule needs. The rule is written and tested; it will stay
   silent until something records which rung somebody left.
2. **Add-on attach.** Add-ons are not purchasable yet (U3b in
   `plan-catalogue-unification.md`), so there is nothing to attach.
3. **The labour floor.** It needs quoted hours per rung, which does not exist.
   `employees-have-a-pay-rate-and-a-bill-rate` is what makes the figure knowable
   once it does.

All three are left **unset** rather than approximated, because the rules skip a
signal they were not given — and a churn figure invented here would be the most
confident wrong number on the screen.

**And it will find nothing today.** One populated ladder, no cohort records, and
sample thresholds that refuse to read a signal out of three accounts. That is
the correct result rather than a fault: it was built now so that it already
works when the numbers arrive, and because the rules were worth getting right
while nothing depended on them.
