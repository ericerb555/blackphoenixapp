# One place to read and change every price

Eric, 2026-10-17: *"this is out of control i want all the pricing and editing
for prices in the cohort section… one place to read and change all the pricing
for plans and subscription that link to stripe."*

He is right, and the reason is worth stating precisely, because it is not that
the system was designed badly.

## WHY IT FEELS OUT OF CONTROL

The decision he is asking for was already made. `cohortPricing.ts` opens with
*"This is the reason cohorts was chosen as the money spine: a cohort prices by
SEAT COUNT, through bands and an optional scaling curve"* — which `plan_tier`
cannot do. It has `cohortFromTier()`, pricing bands, seat scaling, and
`POST /cohorts/migrate-tiers` to carry the old shape into the new one. 314
lines, tested.

What never happened is the second half. Read off production 2026-10-17:

    cohorts            0
    plan_tier          6     3 vendor (active, live prices), 3 content (superseded)
    plan_addon        24     18 content across 6 audiences, all inactive
    feature_grant      8     the accounts actually being served
    subscription       1

The money spine exists in code and has nothing in it. Meanwhile the real price
editor is not in the cohort section at all:

| Where it lives today | What it is | Lines |
|---|---|---|
| OwnersDashboard, "plans" tab | `PlanTierAdmin` — tiers, add-ons, Stripe prices | 1,422 |
| CohortManagement, Territory-Based | founder slots, capacity. **No prices.** | 1,452 |
| CohortManagement, Advanced Plans | cohorts, subscriptions | 1,707 |
| `SubscriptionPlans`, `SubscriptionAddOnsPanel` | customer-facing price display | — |
| `OnCallPricingAdmin`, `ScreeningSettings` | on-call rates, screening fee | — |

So the price editor is behind a dashboard tab, the cohort screens are a
different page, and nothing shows the whole catalogue at once. That is the
entire complaint, and it is a UI problem rather than a data problem.

## WHAT IT COST ALREADY

Two failures this week came from nobody being able to see the catalogue in one
view:

1. Three `plan_tier:content:*` records carried the note *"NOT SELLABLE until a
   Stripe price is created"* and sat `active: false` for three weeks. A task
   file then told the next reader to create prices for them — which their own
   `supersededNote` forbids, because they were replaced by add-ons on
   2026-09-29 and the note ends **"Do not reactivate."** See the X3b
   correction in `todo.md`.
2. Of the 18 content add-ons that replaced them, **3 have a Stripe test price
   and 15 have no price at all.** Someone rehearsed the vendor audience and
   stopped. Nothing anywhere has a live price, which is the real reason the
   content centre cannot be bought.

Neither is a bug. Both are invisible states that no screen reports.

## THE INVARIANT THAT WOULD HAVE CAUGHT BOTH

> A record may be `active: true` only when a Stripe price exists for the mode
> being sold.

One rule, checkable without a model, and it turns both failures above into a
red row on a screen instead of three weeks of silence. It is the most valuable
single line in this plan.

---

## Phase 0 — rehearse the migration off production · **GATE**

`todo.md` X3 already says it, and it is not optional: *"Exercised in a
non-production Supabase project before any of it touches live data. This moves
the system of record for money while eight real accounts are attached to it."*

0 cohorts today means `migrate-tiers` has never run, so its first run would
also be its test. That happens on a branch, not on the thing eight people are
paying against.

- [ ] 0a. Create a Supabase branch, or a scratch project, from current schema.
- [ ] 0b. Copy the `plan_tier:*`, `plan_addon:*`, `feature_grant*` and
      `subscription:*` keys across. Not a dump of everything — these four
      prefixes, so what is tested is the migration and not the copy.
- [ ] 0c. Run `POST /cohorts/migrate-tiers`.
- [ ] 0d. Assert, as a written list rather than a glance: 6 tiers and 24
      add-ons present as cohorts; bands intact; `stripePriceId` and
      `stripePriceIdTest` carried on every record that had one; the 3
      superseded content tiers NOT resurrected as sellable; the 8 feature
      grants still resolving to the same entitlements as before.
- [ ] 0e. Only then consider running it against production, and separately.

**Phase 1 does not depend on this.** It is read-only and reports what is there,
including "no cohorts exist yet", which is itself the finding.

---

## Phase 1 — one screen, read-only · **IN PROGRESS**

Ships on its own, cannot break anything, and immediately answers "one place to
read all the pricing".

- [x] 1a. `pricingReadiness.ts` — pure, tested. Given a tier, add-on or cohort
      record, answer **can this be bought, and if not, why not**, as a list of
      plain reasons. This is where the invariant above lives. No Deno imports,
      so `node --test` can run it.
- [x] 1b. `GET /pricing/overview` — staff only. One call returns the whole
      catalogue: every tier, add-on and cohort with price, interval, both
      Stripe ids, active state, superseded note, bands, member count, and the
      readiness verdict. One route rather than four round trips, because the
      point is a single view.
- [x] 1c. `PricingOverview.tsx` — a third tab in `CohortManagement`, beside
      Territory-Based and Advanced Plans. Reads, renders, refuses to write.
      Sellable and not-sellable are visually distinct, and every not-sellable
      row states its reason.
- [x] 1d. Tests for 1a covering both real failures above as fixtures: a
      superseded tier, and an add-on priced in cents with no Stripe price.

## Phase 2 — editing in that same place · **DONE 2026-10-17**

Mostly not what this section expected, and the differences are the useful part.

- [x] 2d. **`PlanTierAdmin` moved, not rewritten.** It now renders inside the
      Pricing tab under an "Edit plans" view beside the catalogue, and the old
      Owner dashboard "Plans" tab is a pointer to it rather than a second copy.
      Two places was the thing being complained about.
- [x] 2a/2b. **Already existed, and are what moved.** `PlanTierAdmin` already
      edits price, interval, bands, blurb, features, limits and active through
      `POST /plan-tiers/:audience` and `/plan-addons/:audience`, and already
      offers create-test-price, create-live-price and attach-existing. Building
      a second editor against the same routes was the plan; reading them first
      showed there was nothing to build.
- [x] 2c. **Not done, because it was already enforced — and refusing would
      have been wrong.** The write route already refuses retired audiences via
      `retiredAudiences.ts`, carries Stripe linkage across an edit, detaches a
      price whose amount changed, and warns when the result cannot be bought.
      It deliberately WARNS rather than refusing `active: true` without a
      price, and that is correct: activating and then pricing is a legitimate
      order of work, and the sale is gated on the read paths instead.

### What auditing 2c found instead

- [x] **The public catalogue filtered on `active`, not on buyable.**
      `GET /public/plan-tiers` returned every tier with `active !== false`,
      attaching `purchasable: false` where there was no Stripe price — and
      `SubscriptionPlans`, its only reader, has never looked at that field. A
      tier switched on before its price existed would have rendered as an
      ordinary buyable plan and failed at checkout. The comment on that route
      already claimed it returned only tiers on sale; now it does.

      No record was affected: all three live vendor tiers hold a live-mode
      price and the server runs a live key, verified by calling the route.
      Closed because twenty-four add-ons are priced with no Stripe price, and
      the only thing standing between that and the pricing page was that
      nobody had switched one on.

- [x] **`pricingReadiness.ts` was a duplicate, and has been reconciled.**
      Written in Phase 1 with its own active/price/id checks, beside the
      `isPurchasable()`, `notPurchasableReason()` and `priceIdFor()` in
      `planTier.ts` that the write, checkout and public paths all use. The two
      already disagreed: `isPurchasable` grandfathers `active: undefined` as
      sellable, the copy called it switched off. No stored record omits
      `active`, so nothing broke.

      It now delegates, keeping only what it adds — superseded records, which
      nothing else in the codebase reads, and banded cohort pricing, which
      `planTier.ts` has never known about. A test asserts the two agree on
      every shape in both modes, so they cannot drift again.

## Phase 3 — the assistant

Copy the shape that already works: `exchangeAssistant.ts` (pure tested rules)
plus `exchangeAssistantRoutes.tsx` (daily cap, fenced rows, model output
whitelisted to ids that were actually retrieved).

- [ ] 3a. **It proposes; it never applies.** A hallucinated price is money
      leaving the business. It drafts "set Studio to $199, create the live
      price, activate" and a human presses the button.
- [ ] 3b. The read side is where it earns its place: "what cannot be bought
      right now and why", "which add-ons have no price", "what changes if
      Studio goes to $249". Those are the questions that took twenty tool
      calls to answer by hand today.
- [ ] 3c. Same daily cap and spend accounting as the Exchange assistant.

---

## SCOPE, DECIDED

**In:** `plan_tier`, `plan_addon`, `cohort` — everything that is a plan or a
subscription billed through Stripe.

**Out, but linked from the screen so nothing is hidden:**
`OnCallPricingAdmin` (hourly on-call rates) and `ScreeningSettings` (screening
fee). Different objects with a different lifecycle; folding them in would make
one screen that is really three.

**Territory-Based stays a separate tab.** It governs founder slots and
capacity, not price — checked, it has no price fields at all. Pricing becomes a
third tab beside the two, not surgery inside either.

## WHAT I WOULD NOT DO

**Not a rewrite of the pricing maths.** `cohortPricing.ts` is tested and
correct. Cohorts becomes the object that OWNS the price; it does not become a
second implementation of how a price is added up. Carried forward from the
earlier cohort plan, which already said this.

**Not a big-bang cutover.** `feature_grant` keeps working throughout. If the
cohort side is wrong, the grants are still the grants and nobody's access or
billing breaks while it is corrected.

**Not a model with write access to prices.** See 3a.
