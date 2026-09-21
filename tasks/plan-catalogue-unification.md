# One catalogue behind every plan

Eric, looking at the portals: *"all the plan builders need to all connect
correct?"*

Yes. They do not today. This is the plan for making them, written before any of
it is built so the pieces can be argued about on paper rather than reconciled
afterwards.

**U1 and U2 are built.** Eric settled question 1 — $39 / $79 / $159 as *base*
prices with the extras as add-ons — which is what U1 and U2 were built to. U3
onward are still unstarted and the remaining questions still block them.

---

## 1. What is actually there now

Seven places name plans and carry their own prices.

| # | Where | What it drives | Prices live in |
|---|---|---|---|
| 1 | `plan_tier:` records | Portal Plans tab; the **only** ladder with a Stripe price behind it | the catalogue |
| 2 | `PORTAL_UPGRADE_PRICES` — `index.tsx:14885` | what portal checkout **validates an amount against**, and `/me/upgrade-options` | a server constant |
| 3 | `config/subscriptionPlans.ts` | ten exported ladders, read by `SubscriptionPlans`, `TierFeatureManager`, `AdvertiserTabs`, `RevenueMonetizationHub`, `subscriptionDiscount` | a client constant |
| 4 | `SUBSCRIPTION_PLANS` — `DealsOffersSection.tsx:49` | the deals panel inside the portals | a client constant |
| 5 | `PLANS` — `PropertyAIStudio.tsx:27` | Property AI | a client constant |
| 6 | `SUBSCRIPTION_TIERS` — `serviceProviders.tsx:75` | **lead routing order** and provider ranking, not just price | a server constant |
| 7 | `SUBSCRIPTION_TIERS` — `InvestmentTab.tsx:33` | the investor portal's tiers | a client constant |

### The evidence that this matters

Three of them describe the same vendor and disagree:

- Catalogue — **Listed $39 / Stocked $79 / Preferred $159**
- Checkout map — **basic $99 / professional $199 / premium $399 / elite $799**
- Config file — **Vendor Starter $149** (founding $104) / Professional / Enterprise

A vendor can be shown one of these and charged against another, or shown a plan
that checkout then refuses as "invalid plan or price" — `index.tsx:14967`
rejects any amount not in map #2, and map #2 has never heard of Listed,
Stocked or Preferred.

Number 6 is the one that would surprise someone: `SUBSCRIPTION_TIERS` in
`serviceProviders.tsx` carries `priority` and `leadsPerMonth`, and the provider
list is **sorted by it**. So that ladder is not a price list at all — it is
routing logic wearing a price list's clothes. Deleting it without replacing the
ranking would silently reorder who gets leads.

---

## 2. What should own what

Four owners, each with one job. Nothing else holds a price.

**The catalogue (`plan_tier:`) owns what is for sale.** Names, blurbs,
features, limits, display price, interval, sort order, whether it is offered.
One record per tier per audience. Already built, already editable in the Portal
Plans tab.

**Stripe owns what can be charged.** A Price object, immutable, referenced by
id from the catalogue record and never invented by this app. Already built,
including the rule that changing an amount detaches the old price.

**`feature_grant` → `resolveEntitlement` owns what a person may do.** It is
already the only thing the portals gate on, and it is already written by three
places — provisioning (`index.tsx:11981`), the Stripe webhook
(`stripe-webhooks/index.ts:285`), and manual grants. Everything that sells,
comps or trials must end here and nowhere else.

**Add-ons (`plan_addon:`) own what is sold alongside a tier.** A base tier is
what a subscriber is on; an add-on is something extra they pay for on top,
billed as its own line on the same subscription. Each carries its own Stripe
Price for the same reason a tier does — Stripe bills line items, not totals,
and a price this app invented would bill against nothing.

Kept as their own records rather than as a field on the tier, because the same
add-on is usually offered on several tiers and sometimes included free on the
top one. A tier says which add-ons it includes at no cost; an add-on says
which tiers it may be bought on.

**`plan:` records own bespoke bundles.** The Plans & Add-ons builder assembles a
custom set of services with an hours allotment. That is genuinely a *different
product* from a published tier and should stay separate — but it must price
against the catalogue rather than its own service prices, and it must end in
the same kind of grant.

### The one rule

> A surface reads the catalogue. It never carries prices.
> If the catalogue cannot express what a surface needs, the catalogue grows.

---

## 3. What the catalogue cannot express yet

This is the real work, and it is why this is not a find-and-replace. Each gap is
something one of the seven ladders does that `PlanTier` has no field for.

| Gap | Who needs it | Note |
|---|---|---|
| **Weekly billing** | `ADVERTISER_WEEKLY_PLANS` (`billingInterval: 'week'`) | catalogue interval is `month \| year` only |
| **A discounted founding price** | every ladder in `subscriptionPlans.ts` (`foundingPrice`, 30% off) | needs a second Stripe price, not just a second number |
| **Annual price alongside monthly** | `DealsOffersSection` (`annualPrice`) | two prices per tier, or two records |
| **Add-on options** | `SubscriptionPlan.portalOptions`, `allowCustomRequest`, every `*_maintenance` row | **now the centre of the work** — see the answer to question 1 |
| **Non-numeric limits** | `storage: '10 GB'`, `support: 'Email (48hr response)'` | catalogue limits are `Record<string, number>` — these are prose, and probably belong in `features` |
| **Ranking / priority** | `serviceProviders.SUBSCRIPTION_TIERS.priority`, `leadsPerMonth` | decides lead routing order; must survive |
| **A badge** | `'Most Popular'`, `'Best Value'`, `highlighted`, `popular` | display only |

### And the audiences do not line up

- Catalogue: `vendor, subcontractor, advertiser, customer, content, property_manager, landlord, condo_association`
- Config file: `customer, construction, demolition, property-management, vendor, subcontractor, advertiser, investor, territory-owner`

The catalogue has **no `investor` and no `territory_owner`**, so it cannot hold
those two ladders at all today. `construction` and `demolition` look like
customer sub-categories rather than audiences, but that is Eric's call, not a
mechanical one.

---

## 4. Order of work, so nothing goes dark

The danger is obvious and worth naming: **if checkout starts validating against
the catalogue before the catalogue holds every plan the portals offer, real
purchases start being refused.** So the catalogue is filled first and the
constants are deleted last.

- [x] **U1. The add-on model, in `planTier.ts`.** `PlanAddOn` as its own record
      type; a shared `Sellable` so the purchasability rules cover tiers and
      add-ons without a second copy; `BillingInterval` widened to include
      `week`; `readInterval` replacing three inline readers that collapsed week
      to month; `subscriptionTotalCents`, which is where base + add-ons is
      actually computed. Tiers gained `includedAddOns` and `badge`.
      **15 new tests**, including the one that matters most: a weekly add-on is
      refused on a monthly tier, because Stripe requires every recurring line on
      one subscription to share an interval and offering it would build a
      checkout Stripe rejects in front of the customer.
- [x] **U2. Add-ons in the catalogue, and the importer.** `plan_addon:` records
      with list / publish / withdraw routes mirroring the tier ones and reusing
      `carryStripeLinkage`. `PORTAL_UPGRADE_PRICES` lifted into its own module so
      the catalogue can read it without a cycle. `POST /plan-catalog/import`
      brings those rows in — everything **inactive**, nothing ever overwritten,
      nothing guessed — with a dry run first. The Portal Plans tab shows add-ons,
      edits them in the same form as tiers, and runs the import.
- [x] **U2b. Stripe prices for add-ons.** The create and attach routes are now
      one handler each, parameterised by kind, registered at both
      `/plan-tiers/…` and `/plan-addons/…`. A `SELLABLE` table holds the only
      things that actually differ: the storage prefix, the noun for a sentence,
      and the Stripe metadata key. Two copies would have drifted, and the copy
      that missed a fix is the one that creates a LIVE price while the caller
      believes they are rehearsing.

      Doing it this way caught the interval bug a third and fourth time — both
      routes read `=== 'year' ? 'year' : 'month'` inline, so a weekly price
      created or attached through either would have been stored as monthly.
      Both now go through `readInterval`.

      The tab gained the matching buttons, so an add-on can be priced the same
      way a tier can. `/plan-catalog/` also went into `ADMIN_PREFIXES`: it is
      wholly administrative and POST-only, unlike `/plan-tiers`, which any
      signed-in buyer must be able to read.
- [x] **U3. `/me/upgrade-options` reads the catalogue first.** A catalogue tier
      is offered only when it is actually purchasable in the mode this server is
      in — an entry with no Stripe price is a plan nobody can buy, and offering
      it is precisely the failure this route exists to prevent. If the catalogue
      has nothing sellable for the portal, the old rows are offered exactly as
      before, and the fallback is logged rather than left to be noticed months
      later.

      Each option now says which checkout it belongs to and the panel sends it
      there: a catalogue plan to `/plan-checkout`, which takes the Stripe price
      off the record, and a legacy row to `/subscriptions/checkout`. During the
      migration a portal can legitimately show one of each.

      `amount` stays in DOLLARS, which is what this route has always returned
      and what the legacy checkout compares against. The catalogue stores cents,
      so that conversion happens once, in one place — it is a factor of a
      hundred in either direction if it is done twice or not at all.
- [ ] **U3b. Selling an add-on.** Catalogue add-ons are deliberately NOT offered
      for purchase yet, and the reason is the grant model rather than effort. A
      checkout started from this panel ends at the webhook, which reads
      `bp_tier_id` off the subscription and writes the entitlement grant from
      it. Send an add-on down that path and the grant lands pointing at the
      add-on, so buying a products top-up would overwrite the record of which
      plan the person is on. They would pay for an extra and lose their tier.

      Doing it properly means adding a line item to the subscription they
      already have rather than opening a second one — Stripe subscription-item
      work, plus a decision about what the grant should then say. Until that
      exists, add-ons are served by the old rows exactly as they are today.
- [ ] **U4. Point checkout validation at the catalogue.** Keep
      `PORTAL_UPGRADE_PRICES` as a fallback for one deploy, log when the
      fallback fires, and only then delete it. This is the step that takes
      money, so it gets the belt and braces.
- [ ] **U5. Move the ranking out of `serviceProviders.SUBSCRIPTION_TIERS`.**
      `priority` and `leadsPerMonth` become catalogue limits; the provider sort
      reads them from the tier record. Do this before deleting that constant,
      and check the provider order is unchanged afterwards.
- [ ] **U6. Switch the client surfaces to read the catalogue.** #3, #4, #5, #7.
      One component at a time, each with a smoke run, since these render inside
      portals Eric has told me not to restyle.
- [ ] **U7. Delete the constants.** Only once nothing imports them.
- [ ] **U8. Bespoke plans price against the catalogue.** The Plans & Add-ons
      builder stops carrying its own service prices, and an activated bespoke
      plan writes a `feature_grant` like any other sale.

U1 and U2 are worth doing whatever is decided about the prices, because the
catalogue cannot be judged until it holds everything.

---

## 5. What needs deciding next

These are business calls and I should not guess at any of them. Question 1 is
answered; the rest still block U3 onward, and the importer reports each row it
had to skip for want of an answer rather than filing it under a near-enough
audience.

1. ~~**Which vendor ladder is right?**~~ **ANSWERED.** $39 / $79 / $159, and
   they are **base** prices — *"most of the extras are add-ons."*

   This changes the shape of the work rather than just settling a number. The
   higher ladders were not competitors to be retired; a good part of what they
   charged for is add-ons sold alongside a base tier. So what a subscriber pays
   is `base tier + the add-ons they chose`, and the catalogue needs add-ons as a
   first-class thing rather than as a field on a tier.

   It also explains something already in the code: the `*_maintenance` rows in
   `PORTAL_UPGRADE_PRICES` carry a comment calling them "a separate product sold
   alongside the portal plan, so they are offered as add-ons rather than mixed
   into the tiers." That was the right instinct with nowhere to put it.
2. **Do investors and territory owners become catalogue audiences**, or are
   their plans sold some other way?
3. **Are `construction` and `demolition` audiences of their own**, or customer
   tiers?
4. **Is the founding-price discount still running?** It needs a second Stripe
   price per tier if so, and that doubles the price objects to manage.
5. **Does anything still need weekly billing**, or can advertiser weekly go?

---

## 6. What this does NOT do

- It does not restyle any portal. Surfaces change where their data comes from,
  not how they look.
- It does not merge the bespoke plan builder into the tier system. They stay
  two products that share a catalogue and an entitlement.
- It does not touch the maintenance-plan add-ons in `PORTAL_UPGRADE_PRICES`
  beyond moving them; whether they stay a separate product is question 4's
  neighbour and not part of this.
- It does not change who can buy what. Gating already runs off the grant.

---

## 7. Still open from the work around this

- **25 calls across 15 files** still send the publishable anon key to routes
  that require a signed-in caller, so they answer "Sign in required." to people
  who are signed in. Includes guest `POST /marketplace/checkout` twice in
  `DigitalStorefront`. Audit script: `scratchpad/anonaudit.mjs`.
- **No tier in any portal has a Stripe price attached**, in live or test mode,
  so nothing is on sale yet whatever the catalogue says.
- **`limits` is enforced nowhere.** `withinLimit()` exists and is tested; no
  route calls it. U5 would make the first real consumer.
