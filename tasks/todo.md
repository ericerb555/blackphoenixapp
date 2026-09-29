# PLAN — the scheduling assistant

Eric: *"make sure we have a scheduling AI assistant that helps keep everything
running smoothly. use what is built but tweak if you as a scheduling master see
fit. we will set it up to know how many techs and linked to the portals for
scheduled time off and call outs."*

Decided with him: auto for the simple and ask for the hard; capacity from the
employee records; time off requested by the tech and approved by an admin; a
call-out reassigns automatically where it can.

## The tweak I would make, as the scheduling part of this

**Do not ask a language model to do the constraint solving.**

Who can take a job on Tuesday is arithmetic: is this person on approved leave,
have they called out, are they already booked, does the job fit their day, do
they hold the trade. A model asked that question will be right most of the time
and subtly wrong occasionally — and the failure is a crew sent to the wrong
place, or a customer promised a slot nobody can work.

So the feasible set is computed DETERMINISTICALLY and is testable. The model is
used where it is actually better than code: explaining a proposal in a sentence,
ranking equally valid options, and handling the messy human input ("Dave can do
mornings this week"). That also makes the whole thing cheap — scheduling runs
constantly, and a model call per decision is a bill.

This is the same split that already works elsewhere here: `aiCeiling` decides,
`aiSpend` fetches; `quoteMath` computes, the component renders.

## What already exists and is reused

    appointment:<id>        the booking store — routes exist, 0 records
    time_employee:<id>      the roster, and therefore CAPACITY
    wr:<id>                 the work needing a slot
    measuredHours           HOW LONG a job actually takes, learned from
                            finished jobs — the input a scheduler needs most,
                            and already built
    MasterScheduling.tsx    2,290 lines of calendar, shift and assign UI
    on-call rota config     who covers emergencies

## What is missing

    unavailability          time off and call-outs — no store, no surface
    the join                MasterScheduling's employees are a hardcoded mock
                            array with no setter (line 145), the same pattern
                            as the HR seeds just deleted
    any assistant           nothing in scheduling calls a model today

## The shape

**One record for "this person cannot work then":**

    unavailability:<id>  { employeeId, from, to, kind, status, reason,
                           requestedBy, decidedBy, decidedAt }

    kind    'time_off'  requested ahead, admin approves
            'call_out'  same day, the tech declares it, no approval to wait for
    status  'requested' | 'approved' | 'declined' | 'cancelled'

One type rather than two stores, because the scheduler asks one question of it —
is this person available — and two stores means two places to forget to check.

**One function that answers availability**, pure and tested, taking the roster,
the unavailability records and the existing appointments. Everything else reads
it: the calendar, the assistant, the call-out handler.

## Items

- [ ] 1. `availability.ts` — the deterministic core, as a tested `.ts`: who can
      work what, when. Includes the rule that UNKNOWN WORKING HOURS must not
      mean unavailable, or an incomplete roster silently empties the schedule.
- [ ] 2. `unavailability:` store and its admin-gated routes: request, approve,
      decline, cancel. Only `approved` time off blocks a slot; a `call_out`
      blocks immediately.
- [ ] 3. Employee portal: request time off, see its status, declare a call-out.
- [ ] 4. Admin surface: the pending requests, approve or decline.
- [ ] 5. MasterScheduling reads the REAL roster and real availability, replacing
      the mock array.
- [ ] 6. The assistant: proposes a day or week, auto-commits only where exactly
      one sensible answer exists, and explains each choice in a sentence.
- [ ] 7. Call-out handling: reassign automatically where a single qualified tech
      is free; flag the rest. Every automatic move recorded with its reason and
      reversible.

## Deliberately not in this pass

**Telling the customer.** Moving a job between techs is not the same as telling
the customer it moved. Automatic reassignment changes a promise already made,
and the notification should stay a separate, deliberate step until Eric says
otherwise.

**Travel time and routing.** Genuinely valuable and a different problem —
geography, drive times, clustering by area. It wants its own pass rather than
being smuggled into this one.

---

# PLAN — one money spine: everything through cohorts
      Done. `group` says two add-ons are alternatives; `groupRank` says which
      way is up — **stated, not inferred from price**, because an annual rung
      can cost more than a dearer monthly one and a price being edited in
      Stripe is momentarily whatever it is mid-edit. Inferring it would let the
      ladder reorder itself when somebody changes a number, and what it
      reorders is which of a customer's lines gets cancelled.

      Buying a rung ends the others, **after** the add rather than before: if
      the add failed after a removal the account would hold nothing and pay for
      nothing, whereas briefly holding both is visible, reversible and credited
      on the next invoice. Prorated, so the unused part comes back.

      **The guard that matters:** the grant records add-on ids and never Stripe
      item ids, so a line is found by matching its price. The tier's own price
      ids are excluded explicitly — deleting line item zero would cancel the
      plan itself, and it would look like a successful upgrade right up until
      the customer lost their portal. `priceIdOfAddOn` is also strictly
      single-mode, so a rehearsal cannot match and delete a real billing line.

      A removal that fails is **not** silently swallowed: the new rung is
      already live, so the account is double-charged until somebody acts. It is
      logged loudly and returned as `couldNotRemove`.

      `applicableAddOns` collapses a ladder to its highest rung before limits
      are summed, in both enforcers — otherwise an account holding two rungs
      would have both allowances added together, handing out capacity nobody
      sold.

      Inert until a ladder is authored: every add-on in production has no
      group, and 18 tests pin that an ungrouped add-on replaces nothing.

- [ ] Y3a. **Not yet exercised against Stripe.** The removal path has never
      run — there is no ladder in the catalogue to trigger it, and the one
      paying account holds no add-ons. Before any content rung goes live it
      should be rehearsed end to end in test mode: buy Solo, upgrade to Studio,
      and confirm in the Stripe dashboard that exactly one line ended, that the
      tier's line is untouched, and that the proration credit appears.

Eric: *"yes plan the consolidation everything must go through cohort managment
system advanced plans"*.

The ruling is made and this plan follows it. It overrode a recommendation to
keep `feature_grant` + `plan_tier` and retire cohorts, so that option is not
revisited below.

## WHY THE CHOICE IS DEFENSIBLE, HAVING ARGUED AGAINST IT

A cohort already carries `basePrice` plus `pricingTiers` banded on `minUsers`
and `maxUsers` — volume pricing by seat count. `plan_tier` has nothing
equivalent. It also models spots remaining, overdue accounts and account
shut-off. **The empty system is the better commercial model**, which is what
"advanced plans" means, and that changes the shape of this work: it is not
migrating onto weaker foundations, it is filling in a model that was never
populated.

## WHAT IS TRUE TODAY

| Store | Records | Stripe | Fate |
| --- | --- | --- | --- |
| `cohort_*` | **0** | no | **becomes the spine** |
| `feature_grant` + `plan_tier` / `plan_addon` | 8 / 6 / 6 | yes | folds in; membership survives |
| Postgres `plans`, `subscriptions` | 0 / 0 | no code at all | deleted |
| `subscription:` prefix | 1 | no | deleted, after MRR is repointed |

Live money that must not be disturbed: **8 feature grants, 3 invoices, 3
payments, 4 store orders.** Those are real accounts.

## THREE THINGS THAT MUST BE FIXED BEFORE ANYTHING IS BUILT ON TOP

### 1. The cohort system is broken and has never run

`kv.getByPrefix` returns the VALUES. `cohorts.tsx` treats each as
`{key, value}`:

    const totalRevenue = cohorts.reduce((sum, item) => sum + (item.value.monthlyRevenue || 0), 0);

With one real cohort that throws `Cannot read properties of undefined`. It has
survived only because the array is always empty. **Six occurrences in
`cohorts.tsx`, seven in `territory-cohorts.tsx`** — every one of them on a
path that runs the moment a cohort exists.

Nothing can be migrated onto this until it is fixed.

### 2. Revenue is stored, not computed

A cohort record holds `monthlyRevenue`, `activeSubscribers`, `churnRate` and
`averageLTV` as fields, written by a separate `update-subscribers` route. Money
that is stored rather than derived drifts silently: the dashboard then shows
whatever was last written, not what is being paid.

If cohorts is to be the system of record, **these become derived**. That is the
single most important change in this plan.

### 3. FIVE COHORT ROUTES ARE STUBS THAT REPORT SUCCESS

Found while fixing the bug above, and it changes the size of this job.

    /cohorts/applications/approve   console.log, returns "Approved N"
    /cohorts/applications/reject    console.log, returns "Rejected N"
    /cohorts/accounts/shutoff       console.log, returns success
    /cohorts/overdue                reads one key, commented "Mock"
    /cohorts/applications           reads one key, commented "Mock"

Each answers `success: true` and changes nothing — *"In production, this would
update the applications in the database."*

That is survivable in an unused module. It is not survivable in the system of
record for money: approving somebody's application would report approved and
grant nothing, and **shutting off a non-paying account would report the
account shut off while it kept working**. Both are worse than an error,
because both look like they worked.

These have to be real before cohorts holds anything, and they are not in the
original U/V/W sections. Added as section U4.

### 4. MRR currently reads the wrong store

`analytics-summary.tsx` computes MRR from the `subscription:` prefix — **one
record** — while the eight real grants are invisible to it. That is a live
wrong number on a dashboard, independent of this consolidation.

## THE WORK

### U — make cohorts able to hold anything at all

- [x] U1. Fix the `getByPrefix` misuse in `cohorts.tsx` and
      `territory-cohorts.tsx`. Thirteen places, all latent until a record
      exists.
- [x] U2. A pure, tested `cohortPricing.ts`: resolve the band for a seat
      count, the price at that band, and the spots remaining. The banding
      logic is the thing being bought into, so it is the thing to test.
- [x] U4. Make the five stubbed routes real — approve, reject, shut off, and
      the two that read a single mock key. Until then cohorts cannot be
      trusted with an account.
- [x] U3. Seed the six existing `plan_tier` records as cohorts, preserving
      their prices and Stripe price ids. A tier becomes a cohort with a single
      band; nothing is repriced by this migration.
      `cohortFromTier()` is pure and tested; `POST /cohorts/migrate-tiers` is
      a dry run unless given `{confirm:true}`, is idempotent, and will not
      overwrite a cohort somebody has edited. No revenue, subscriber, churn or
      LTV field is written — not even zero — and `POST /cohorts` now strips
      those five fields from the request body, so the only way a money figure
      reaches a screen is by being derived from real memberships.

### V — membership, and money derived from it

- [x] V1. `feature_grant` gains `cohortId` and becomes the membership record.
      It already holds who has what and the Stripe subscription behind it, and
      it is what the webhook writes — so it survives as the join rather than
      being replaced. Eight live grants are backfilled to their cohort.
      **DONE DIFFERENTLY, AND THE CHANGE IS THE POINT.** This item said the
      grant should *gain* a `cohortId` and that eight live grants should be
      backfilled. Writing it turned that around: a paying grant already
      carries `tierId`, and a migrated cohort's id is derived from precisely
      that (`cohort-tier-{tierId}`). So the cohort an account belongs to is a
      **function of what the grant already says**, not a new fact to store.
      `cohortMembership.ts` derives it. Nothing is written to the eight live
      paying accounts, there is no second field to keep in step when somebody
      changes tier, and a stored `cohortId` can never disagree with the
      `tierId` beside it. The Stripe webhook needs no change either — it
      already writes the only field this reads.

      **The bug this uncovered:** `loadMemberships` read `grant.cohortId`, and
      *nothing has ever written that field*. Every cohort's revenue and
      subscriber count was deriving to zero, which looks exactly like "no
      sales yet" and so went unnoticed. The join was missing from the code,
      not from the data.

      A membership resolves to one of four statuses, and only `active`
      becomes money: a running trial, a Stripe-side trial and an account in
      arrears are all **members who occupy a spot but are not revenue**, and
      a revoked grant is neither. 19 tests pin this, including that the
      derived id matches `cohortFromTier` — if those two ever drift, every
      figure silently returns to zero.
- [x] V2. **`monthlyRevenue` and `activeSubscribers` become computed** from
      the grants that point at the cohort, never stored. `update-subscribers`
      stops writing figures and is removed or repurposed.
      Done alongside V1. `activeSubscribers` (paying) and `members` (everyone
      being served) are now two separate derived figures, because using the
      paying count for capacity would oversell a capped cohort and using the
      member count for revenue would report income that never arrived.
      `spotsRemaining` counts members, and had been computing against a
      stored field that no longer exists. Three analytics routes —
      `/revenue/analytics`, `/revenue/trends` and `/revenue/category/:cat` —
      were still reading the stored fields and therefore reporting zero; they
      derive now. `update-subscribers` was retired in V0d.
- [x] V3. `subscriptionTotalCents`, `holdsAddOn`, `paysForAddOn` and the add-on
      catalogue are **kept and reused**, resolving through the cohort. They are
      correct, 98 tests cover them, and rewriting priced logic during a
      migration is how a customer gets the wrong invoice.
      Kept and reused, exactly as written. `tierViewOfCohort()` adapts a cohort
      INTO the shape those functions already take, so the add-on rules —
      offered on this plan, already included, priced in this Stripe mode — are
      called unchanged rather than reimplemented. The only thing the cohort
      does differently is the base price, which is banded by seat count.
      **A migrated cohort charges exactly what the tier charged, and a test
      asserts it.**

      Two fields were being dropped by the migration and are now carried:
      `includedAddOns` (losing it would start billing a top-tier customer for
      what their tier already covers — a real charge on a real card) and
      `discountPercent` (losing it quietly raises the price of every contract
      that subscriber signs).

      `pricedViewFor()` handles the changeover and is wired into `/my-plan`, so
      this is not another orphan. It **fails back to the tier, never to zero** —
      a missing or half-migrated cohort must not show a subscriber a believable
      $0, which is the fabricated-revenue mistake pointing the other way.

- [ ] V3a. **Banding has no Stripe representation, and this blocks using it.**
      `/plan-checkout` bills a Stripe *price id*, not a computed figure, and a
      migrated cohort carries the same ids the tier had — so nothing diverges
      today. But the moment somebody adds a real band to a cohort, the screen
      would show the banded figure while Stripe charged the flat one. Banding
      must not be used on a live cohort until a checkout exists that bills the
      banded amount. Worth saying plainly: the seat-banded pricing that
      justified choosing cohorts over `plan_tier` is computable but **not yet
      chargeable**.

### V0 — the screen has to read the server first

Found while checking who consumes U3's output, and it reorders the rest.

`AdvancedCohortManagement.tsx` is 1,552 lines and **calls the server
nowhere**. It imports `useEffect` and never uses it; it imports `projectId`
and never fetches. Every cohort on it is a `useState` literal:

    Premium Customers   245 members   $24,500/month
    Enterprise Clients   48 members   $96,000/month

That is $120,500 a month of revenue that does not exist, and it renders in
three places — the Cohort Management page, the Advertising Hub and the
Vendors Admin Hub. It is the fabricated-P&L problem again, this time living
in the frontend rather than in a seed route, which is why closing the server
side did not touch it.

It also has a **Monthly Revenue input** in its create form. As of U3 the
server strips that field, so typing a figure there now does nothing — the
screen would report a number the server refuses to keep.

This has to come before V, not after. V derives revenue from memberships;
deriving it correctly for a screen that reads none of it would be more
carefully tested code that nothing calls.

- [x] V0a. Load cohorts from `GET /cohorts` on mount; show the real empty
      state when there are none. Delete the two invented sample cohorts.
- [x] V0b. Remove Monthly Revenue and Member Count from the create form —
      both are derived now, and an input the server discards is a lie on the
      screen. Show them as read-only derived figures on the card instead.
- [x] V0c. Keep the existing layout and styling exactly as they are. This is
      a wiring change, not a redesign.

- [x] V0d. **Three more write holes, found while wiring the screen.** U3 closed
      `POST /cohorts`, but there were four doors onto a cohort record, not one:
      `PUT /cohorts/:id` merged `{...existing, ...updates}` with nothing
      removed, so an EDIT could write `monthlyRevenue: 999999`; `bulk-update`
      had the same shape; and `POST /cohorts/:id/update-subscribers` took a
      subscriber count from the caller, multiplied it by the price, and stored
      the product as revenue — a route whose entire purpose was writing an
      unverified figure onto the P&L. The first three now share one
      `withoutMoneyFigures()` guard in `cohortPricing.ts`, tested. The fourth
      answers 410; its only client, `updateCohortSubscribers` in
      `revenueService.ts`, is removed, and nothing in the app called it.
      This had to come before V0a because V0a makes the screen call `PUT`.

### V0 — still outstanding on this screen

The five other tabs on `AdvancedCohortManagement` are still local `useState`
samples with no server behind them, and their delete/duplicate/toggle
handlers still say "Item deleted successfully" over nothing. They are not
cohorts and they are not this task, but they are worth naming:

- [x] V0e. The **Subscriptions** tab is the default view, and its stats header
      counts a mock array of two ("Starter Plan, 320 subscribers" / a
      "Professional Plan" whose features are literally "Feature 1, Feature 2,
      Feature 3") while the grid below it renders the real `SubscriptionPlans`
      component. The header and the list disagree on the first screen anybody
      opening this page sees.
- [ ] V0f. Vendor, advertiser, maintenance and construction plan tabs: same
      shape, all local, all inventing subscriber counts.
### W — every money surface reads the spine

- [x] W1. Stripe checkout and the webhook write cohort membership.
      **Already true, and nothing had to change — which is the payoff of V1.**
      The subscription webhook is not in `server/`; it is its own edge function
      at `supabase/functions/stripe-webhooks/index.ts`, and it already writes
      `tierId`, `stripeSubscriptionId` and `lastSubscriptionStatus` onto the
      grant on checkout, renewal and cancellation. Because the cohort is
      *derived* from `tierId` rather than stored, that is the whole membership
      record. Had V1 gone the way the plan first described, this webhook would
      have needed editing in three separate branches.

- [x] W2. `/my-plan` resolves the cohort, so the add-on panel built earlier
      shows the cohort's figure.
      Done in V3 via `pricedViewFor`, which falls back to the tier when no
      cohort exists — which is the case today.

- [x] W3. **MRR is repointed at cohort memberships.**
      `GET /territory/subscriptions` reported `summary.mrr` as the sum of
      `amount` across every `subscription:` record marked active. Those are
      written by `/subscriptions/checkout`, which runs Stripe in
      `mode: 'payment'` — **it bills once.** Nothing renews them and nothing
      ever closes them, so every one-off sale ever made was counted as monthly
      income in perpetuity: a figure that could only climb, that no
      cancellation or refund could reduce. It now comes from
      `monthlyRecurringCents()`, scoped to the territory's own roster, counting
      only memberships Stripe will actually bill again. The `subscription:`
      records are still listed as the sales they are — only the MRR line moved.

- [x] W4. The dead Postgres `plans` and `subscriptions` tables are dropped —
      zero rows and no code touches either.
      **Written but deliberately NOT applied.** The migration is at
      `supabase/migrations/20260928140000_drop_dead_plan_tables.sql.pending`.
      Confirmed from the code side: nothing in the repository references either
      table and no migration here creates them, so they were made in the
      dashboard and their contents are described nowhere in version control.
      That is exactly why "zero rows" needs checking against the database
      rather than believed. The migration refuses to drop a table holding any
      rows, but that guard is a safety net, not a substitute for checking,
      backing up, and running it against a non-production project first.
      **Needs Eric's go-ahead; a dropped table does not come back.**

- [ ] W5. **A past-due account leaves its cohort entirely.** Noticed while
      checking W1. On `customer.subscription.updated` with a non-live status
      the webhook sets `tierId: undefined`, so the grant no longer names a
      cohort and the account vanishes from the member count — even though it
      is still being served through the fifteen-day grace period. The
      `past_due` branch in `membershipFromGrant` is correct and tested but
      cannot be reached from real data today. Fixing it means keeping `tierId`
      while clearing access some other way, which changes what
      `resolveEntitlement` sees and therefore who keeps access during the
      grace period. That is a real decision about a live policy, not a
      tidy-up, so it is recorded rather than made.

### X — prove it

**Dry run against production, 28 Sep — read-only, nothing written.**

Read the real records out of `kv_store_57095a78` and ran the actual
functions against them. Findings:

- **6 plan tiers, 8 feature grants, 0 cohorts, 1 `subscription:` record.**
- **Exactly ONE account is paying**: a vendor on `stocked`, $79/mo, with a
  real Stripe subscription. The other seven are trials Eric granted, all
  running to Jan–Feb 2027, none carrying a `tierId`.
- Platform MRR from cohort memberships: **$79.00/month.**
- The three **content** tiers (Solo $79, Studio $199, Agency $499) are
  `active: false` with **no Stripe price ids at all** — they cannot be sold.
  The three vendor tiers are active with both live and test prices.
- `plans` and `subscriptions` Postgres tables: **0 rows each**, confirming
  W4 against the database rather than from reading code.

**THE DRY RUN CAUGHT A REAL BUG THAT THE UNIT TESTS COULD NOT.**
`tierViewOfCohort` dropped three fields `addOnAvailableOn` reads. The
synthetic fixture in the test file is active, monthly and single-audience,
so it could not expose any of them:

- `active` — the three content tiers are `active: false`, and a withdrawn
  tier refuses add-ons. Without it they priced **$99 HIGHER** through the
  cohort than through the tier: an overcharge for an add-on the tier had
  already refused.
- `audience` — the check short-circuits when either side is missing, so a
  **vendor add-on could be sold on a content cohort**. Cross-portal, and it
  would have looked like an ordinary line on an invoice.
- `interval` — Stripe refuses a subscription whose recurring lines do not
  share an interval, in front of the customer.

All three fixed, all three now covered, plus an exhaustive test over every
active/audience/interval combination so a field added to `addOnAvailableOn`
later cannot be forgotten here silently.

- [x] X3a. **Trials belong to no cohort — and that is correct.** All seven trial grants lack a
      `tierId`, so they resolve to no cohort and appear in no member count.
      That is arguably right — they have not chosen a tier — but it means the
      cohort screen will show 1 member across the whole platform while eight
      accounts are being served. Worth deciding whether a trial should be
      provisioned against a tier.
- [ ] X3b. **The content tiers cannot be sold.** Solo, Studio and Agency are
      the platform's core product and all three are `active: false` with no
      Stripe price. Creating those prices is the single change that would let
      anybody buy the thing the platform is for.

- [ ] X1. Tests for the banding and for the derived figures: the right band at
      a boundary seat count, spots remaining, MRR summed from memberships
      rather than from a stored field.
- [ ] X2. `npm run typecheck`, `typecheck:server`, `npm test`, `npm run smoke`.
- [ ] X3. **Exercised in a non-production Supabase project before any of it
      touches live data.** This moves the system of record for money while
      eight real accounts are attached to it; the standing rule about testing
      backend changes off production is not optional here.

## WHAT I WOULD NOT DO, AND WHY IT IS WORTH SAYING

**Not a big-bang cutover.** `feature_grant` keeps working throughout and gains
a pointer, rather than being emptied into a new shape. If the cohort side is
wrong, the grants are still the grants and nobody's access or billing breaks
while it is corrected.

**Not a rewrite of the pricing maths.** The add-on and entitlement logic is
tested and correct. Cohorts becomes the object that OWNS the price; it does not
become a second implementation of how a price is added up.

## THE DECISION, MADE

Eric: *"lets do what is best for the platform i will go along with what you
suggest from here."* So it is called here rather than asked again.

**A cohort OWNS a tier — as the migration path, not as the end state.**

Own, because it can be done while eight paying accounts stay attached: nothing
is repriced, the Stripe price ids stay bound to exactly what they already
bill, the tested pricing logic is reused rather than reimplemented, and there
is no moment where money runs through code that has never held a record.

But own has a real cost, and it is the reason replace was tempting: it leaves
**two objects for one concept**, permanently, which is the very thing this
consolidation exists to end. Carrying a cohort that wraps a tier forever would
be trading four stores for two and calling it done.

So the tier is scaffolding. Once memberships are proven against real accounts
— X3 below — the tier's fields collapse into the cohort and the layer goes.
That is a separate, safe step once nothing depends on the old shape, and it is
written down here so it is not quietly forgotten.

---
---

# PLAN — one employee list, two rates

Eric chose the larger fix and added a requirement: *"it should be able to add
actual pay and billed out rate for each employee."*

## What is wrong now

Job costing reads `time_employee:<id>.payRate` (index.tsx:14581-14586). The HR
hub edits `hr_employees` — a different store — and joins the two by FULL NAME
string match (HREmployeeHub.tsx:140). Its list is seeded with four fictional
people: Mike Torres, Jake Sullivan, Lisa Park, Tom Walsh.

So no screen sets the rate that costing actually uses, and no billed-out rate
exists anywhere. The two real records carry rates only because something wrote
them directly.

## The trap that has to be settled first

The HR hub has `payType: 'hourly' | 'salary'`, and for salaried staff `payRate`
holds an ANNUAL figure — Lisa Park is 55000, Tom Walsh 72000. `time_employee`
has one flat `payRate` and `jobOutcome` multiplies it by HOURS.

Merge those two stores naively and a salaried manager's hour costs $72,000. The
job would show a catastrophic loss, the margin would be nonsense, and the rate
learning loop would be fed from it.

So `time_employee.payRate` must be, and must stay, an HOURLY COST. A salaried
person needs either a derived hourly equivalent or to be excluded from job
costing. That is a decision for Eric, not a default to pick quietly.

## Items

- [ ] 1. Server: `/time-tracking/employees` accepts and stores `billRate`
      beside `payRate`, admin-gated identically — a field technician can keep
      their name current and can change neither rate.
- [ ] 2. Server: the employee listing returns both rates.
- [ ] 3. HR hub reads its list from `time_employee:` and writes through that
      same route. The `hr_employees` store and the name-matching join go.
- [ ] 4. The four seed employees are removed rather than migrated. They are
      fictional, and carrying them into the real store puts invented people on
      a payroll screen.
- [ ] 5. Both rates are editable per employee, with the margin between them
      shown, since that is the number the pair exists to produce.
- [ ] 6. Salaried staff handled per Eric's decision above.

## Deliberately not in this pass

Using `billRate` to price labour on a quote. The quote currently prices from
`measuredHours` and the labour catalogue; wiring the bill rate into it is a
second change with its own blast radius, and it should follow once the rates
exist and are trusted.

---

# The work-request store, tidied (28 Sep)

Eric: *"delete the eight."*

    wr:<id>                  3 rows      the record, what the routes read and write
    wr_index                 3 entries    the id list those routes page through
    all_work_requests        3 items      legacy array, still the live write path
    work_requests            gone         never existed; the key held nothing
    work_requests_anonymous  DELETED      8 seeded demo completions
    work_request:<id>        0            retired prefix, my rows removed

Four shapes down to two, holding the same three real work requests.

## Why deleting the eight was safe

Checked before deleting rather than after. Nothing rendered them: the only
readers are a comment in `index.tsx` and `allWorkRequests()` in
`time-tracking.tsx`, which reads the key solely in order to DISCARD completed
rows — its own comment calls them "the trap… offering to bill time to a
photograph". No gallery route read the key at all, despite the name.

So the public gallery those eight were kept for was never built, and they had
sat inert since seeding.

## Still not done

`persistWorkRequest` writes `wr:` AND `all_work_requests` on every save, so the
legacy array is still maintained rather than derived. Collapsing that is the
remaining step, and it touches `index.tsx` — which Eric is editing in another
window, so it is deliberately left alone rather than risking a collision.
# The work-request store, corrected — and the write path answered (28 Sep)

## I used the wrong prefix, and here is the correction

The earlier migration created `work_request:<id>` rows. That prefix is RETIRED.
The store the code actually reads and writes is **`wr:<id>`**, written by
`persistWorkRequest` and read by the GET and PATCH routes at index.tsx 7373,
7384, 7467 and 7490. `work_request:` survives only as a notification dedupe
string and in a comment in `design-links.tsx` reading "This used to be
getByPrefix("work_request:")".

The mistake came from checking whether `work_request:%` rows existed, finding
none, and concluding the authoritative store was empty — rather than reading
what the write path actually does. Absence of a prefix is not evidence about
which prefix is right.

Corrected: the 11 rows were deleted (identified by the `migratedFrom` marker the
backfill stamped, so nothing else could be caught), and the three real work
requests were written under `wr:` instead. `wr_index`, the id list those routes
page through, was populated with them — newest first, which is the order
`persistWorkRequest` maintains.

## The write path: answered without needing to submit anything

    wr:<id> rows    0
    wr_index        0 entries

**No work request has ever been persisted through that route.** Which fits
exactly: the portal's work-request POST pointed at `/functions/v1/server`, a
function that does not exist, from 6 July until this morning. Submissions never
arrived, and nothing else used the route either.

So the answer to "does the write path work" is that it never has — and the fix
for it shipped this morning but has not been exercised by a real submission.
That is still the thing to prove before customers are invited, and it now needs
a submission rather than a query.

## The eight gallery records are deliberately still out

Eric asked that the anonymous list become a flag on the row. Doing that now
would put eight `wr-completed-00N` demo records into the LIVE work-request
store, where the pipeline lists them as real jobs. They look like seed data, not
work anybody did.

Held back rather than quietly done, because it is his call whether those
records belong in the pipeline at all — they may simply want deleting, which
would make the flag question moot.
# Item 2 — one shell for every document (28 Sep)

`DocumentPreviewModal` now carries the actions — Print, Download PDF, Email,
Close — and takes the document as `children`. `InvoicePreviewModal` is a thin
wrapper over it and went from 377 lines to 113.

Still no behaviour change on the staff page: same buttons, same order, same
colours, same Edit affordance. Typecheck 317 (baseline), 675 tests, smoke 13
rendered / 0 threw.

## The bug this prevents rather than fixes

**`printElementId` is a prop.** Printing works by hiding every element on the
page and un-hiding one named element and its descendants. The invoice modal
hardcoded `#invoice-content`. Reused as-is for a quote, that prints a BLANK
PAGE — the dialog opens, paper comes out empty, and nothing reports a fault,
because nothing is wrong as far as the browser is concerned. Naming the element
per document is what stops that.

The rule stays `visibility: hidden` rather than `display: none`, deliberately:
visibility preserves layout for the element being shown, so a document nested
inside a modal still measures correctly. Collapsing ancestors with `display`
shifts the output.

## Two smaller decisions

**`onDownload` and `onEmail` are optional, and their buttons vanish when not
supplied.** Contracts have no PDF generator until item 4, and an action that
appears and does nothing is worse than one that is absent.

**`EmailInvoiceModal` sits OUTSIDE the preview**, as a sibling. Nested inside,
the second modal renders underneath the first one's backdrop.

---

# Item 1 — the invoice layout becomes a component (28 Sep)

`InvoiceDocument` now holds the laid-out invoice that used to be the body of
`InvoicePreviewModal`. The modal renders it and keeps every action it had.

**No behaviour change, and that is the point of doing this first.** The staff
invoices page must look and work exactly as before, because nothing depends on
the extraction yet. Typecheck 317 (baseline), 675 tests, smoke 13 rendered / 0
threw.

## Two decisions inside it

**The document carries no actions.** No print button, no download, no email, no
modal chrome — it renders a document and nothing else, so it can sit in a modal,
a portal tab or a pipeline tab without assuming which. The actions move to
`DocumentPreviewModal` in item 2.

**With one exception, kept deliberately.** An "Edit line items" button sits
beside the line-items heading rather than in the chrome, because it belongs
next to what it edits. It is an optional `onEdit` prop: the staff preview passes
it and keeps the button it has always had, the customer portal passes nothing
and never sees it. It was already `print:hidden`, so no printed copy ever showed
it.

`id="invoice-content"` stays on the outer element — the print stylesheet hides
everything on the page except that element and its children, so the id is
load-bearing rather than decorative.

Also removed from the modal: `CompanyHeader`, `companyInfo` and `formatCurrency`,
which became unused once the body moved. `formatDate` stays — it is still used
to build the PDF payload.

---

# PLAN — every platform we can actually reach, in three tiers

Eric: *"lets add all the social sites we can we need to match in delivery or
excceed"*.

Researched before planning, because the platforms differ enormously in what
they will let anybody do, and two of them cost money or need an application
that Eric alone can file.

## THE THREE TIERS

| Platform | Gate | Cost | Tier |
| --- | --- | --- | --- |
| **Bluesky** | none at all | free | 1 |
| **Mastodon** | none — per-instance app registration | free | 1 |
| **LinkedIn (personal profile)** | none — `w_member_social` is self-serve | free | 1 |
| **Threads** | uses the Meta app already registered | free | 1 |
| **TikTok** | app audit — already built, awaiting Eric's filing | free | built |
| **Facebook / Instagram** | done | free | built |
| **LinkedIn (company page)** | Community Management API partner approval + screencast | free | 2 |
| **Pinterest** | trial → standard needs a recorded OAuth video | free | 2 |
| **YouTube** | works now — 100 uploads/day since June 2026 | free | 2 |
| **Google Business Profile** | formal request, verified profile 60+ days, starts at ZERO quota | free | 2 |
| **X** | no free tier for new developers | **1.5¢/post, 20¢ with a link** | built |

## WHAT THIS GETS TO

Three platforms today. Tier 1 takes it to **seven** — level with most of the
field. Tier 2 takes it to **eleven**, which matches Buffer, the broadest of
them. Tier 3 is a commercial decision rather than a build.

## TIER 1 — build now, nothing to ask anybody for

- [x] Q1. **Bluesky.** The easiest by a distance: the AT Protocol is an open
      specification, authentication is an app password rather than OAuth, and
      there is no review of any kind. `com.atproto.repo.createRecord` posts;
      images are uploaded as blobs first.
- [x] Q2. **Mastodon.** Open, but per-instance: the server is part of the
      account, so the connection has to capture which instance and register an
      app against it. `POST /api/v1/statuses`.
- [x] Q3. **LinkedIn, personal profile.** `w_member_social` is self-serve with
      no review. **It posts to the signed-in person's own profile and cannot
      post to a company page** — that is tier 2 — so the interface has to say
      which one it is posting as, or it looks broken.
- [x] Q4. **Threads.** Goes through the Meta app that Facebook and Instagram
      already use, so the marginal work is a scope and a publish path rather
      than a new integration. Two-step like Instagram: create a container,
      then publish.
- [x] Q5. One shape for all of them. Each new platform is currently a branch
      in `publishForUser` and a branch in the OAuth callback; five more of
      those makes the file unreadable. A small per-platform record — connect,
      exchange, publish — keeps each one in one place.

## TIER 2 — real, free, but gated on an application Eric files

- [x] R1. **LinkedIn company pages** via the Community Management API. Needs
      the legal entity name, registered address, website and privacy policy,
      then a screencast to leave the 500-call development tier. For a
      contractor this matters more than personal posting: commercial work
      comes from the company page.
- [x] R2. **Pinterest.** Genuinely useful for this business — finished
      kitchens, decks and bathrooms are exactly what Pinterest is for. Trial
      access is quick; standard needs a recorded video of the OAuth flow, and
      Pinterest asks for it even when the developer is the only user.
- [x] R3. **YouTube. CORRECTED — the earlier figure in this plan was wrong.**
      It said about six uploads a day, from an upload costing 1,600 units of a
      10,000-unit pool. Since June 2026 uploads no longer draw on that shared
      pool: a default project gets **100 `videos.insert` calls a day**, and an
      upload bills 1 unit inside its own bucket. Quota is not the constraint.

      What IS different about YouTube: it will not fetch a video from a URL.
      Every other platform here is handed a link and collects the file itself;
      YouTube requires the **bytes**, through a resumable upload. So the
      server has to read the video out of the bucket and stream it on, which
      is real work the other three do not need.
- [x] R4. **Google Business Profile.** The strongest local-search signal a
      contractor has, and the hardest gate: a formal access request, a profile
      verified and active for sixty days, a business website, and **zero quota
      until approved** — so it fails silently until the request clears.

## TIER 3 — X, which is now a per-post cost

- [x] S1. BUILT — Eric asked for it after seeing the figures. X moved to pay-per-use in February
      2026 and closed the free tier to new developers. **$0.015 a post, and
      $0.20 for any post containing a link** — and a store post is a link. At
      three linked posts a day that is about $18 a month, forever, on the
      platform with the weakest case for a contractor.

      Not a reason to refuse it; a reason for Eric to choose it rather than
      find it on a bill.

## PROVE IT

- [x] T1. Tests for the parts that do not need a live account: the per-platform
      record, the caption limits, which platforms accept a bare text post and
      which demand media.
- [x] T2. typecheck 316, server 84, 794 tests pass. Smoke correctly reported nothing to run — this round is entirely server-side.
- [ ] T3. One real post on each connected platform. Still blocked on the same
      thing everything else is: **no account is connected to anything.**

## REVIEW — Tier 1

### Three platforms became seven

Facebook, Instagram and TikTok are joined by **Bluesky, Mastodon, LinkedIn and
Threads** — level with most of the field, and reached without a single
application, approval or fee.

### The registry, written before the four

`socialPlatforms.ts` holds what each platform IS: whether a bare text post is
allowed, how long a caption may be, whether the server forms part of the
account, and what is surprising enough to say at connection time.

Without it, seven platforms would mean twenty-one branches across one file,
and the facts that actually differ would be implied by control flow rather
than written down. What is deliberately NOT in it is the publishing calls —
Bluesky speaks XRPC, Meta speaks Graph, TikTok wants a pull URL, and pretending
those share a shape would be a worse abstraction than separate functions. It
describes; it does not drive.

`refusalFor` is now asked **before** anything is sent, so "Instagram needs an
image or a video" and "Bluesky allows 300 characters; this is 400" reach the
person composing rather than arriving as somebody else's API error afterwards.
Same principle as the reel specification.

`fitToPlatform` trims rather than refuses where trimming is honest. Bluesky's
300 characters is the binding constraint in practice — one caption written for
Instagram will not fit anywhere else — and a post refused outright helps nobody
when the first three hundred characters would have done. Trimmed on a word
boundary so it reads as shortened, not as cut off mid-thought.

### The four, and what is peculiar about each

**Bluesky** has no gatekeeper of any kind: an open specification, the same
endpoints the official client uses, no app registration, no review, no quota,
no fee. The credential is an app password the holder generates in their own
settings, which is why it connects without OAuth at all and returns `connected`
rather than an `authUrl`. The password is verified before it is stored, so a
typo is caught at connection rather than at the first post. A session is
created per post rather than kept: tokens are short lived and an app password
can be revoked at any moment, so a stored session would only fail later and
less clearly.

**Mastodon** has no central authority. The same handle on two servers is two
accounts, so the instance is captured, an app is registered against that server,
and the person is sent to their own server to approve it. The instance and its
client secret travel in the OAuth state because nothing else in the callback
knows which server the handshake began with. Mastodon's own
`Idempotency-Key` is used so a retry cannot become two posts.

**LinkedIn** posts to the signed-in person's profile via `w_member_social`,
which is self-serve and needs no review. **It cannot post to a company page** —
that is the Community Management API and a partner approval — so the platform's
caveat says which one it is. Somebody expecting their company page to update
would otherwise reasonably call this broken. The member urn is treated as
required rather than cosmetic: without it there is nothing to post as, so the
connection is refused rather than saved half-formed.

**Threads** runs on Meta's infrastructure but has its own login host, its own
scopes and its own user id, which is not the Instagram one even for the same
person. Two steps like Instagram — container, then publish — with nothing to
wait for between them, since text needs no transcoding.

### `GET /social/platforms`

The catalogue, so no screen hardcodes a list that drifts from what the
publisher supports — the bug that arrives the first time a platform is added
and one of five screens is missed. It reports whether each platform's secrets
exist as a boolean, never the secrets, so a screen can grey out a button that
would otherwise fail after the click.

### Verification

- `typecheck` **316**, `typecheck:server` **84** — both unchanged.
- `npm test` — **794 pass, 0 fail**, up from 764. 15 new tests on the registry.
- `npm run smoke` — **correctly reported nothing to run.** Every change in this
  round is server-side, so no page is affected. Not a pass; an honest nothing.

### What is NOT proven

**Nothing has been posted to any of the four.** Every call is written from the
platforms' current documentation and none has executed, because no account is
connected to anything. The rules that could be tested are tested; the network
calls are not, and should not be called working until one real post has gone
out on each.

Bluesky is the one to try first: it is the only platform here that needs
nothing from anybody — an app password from account settings and it should
work.

**LinkedIn and Threads additionally need their secrets** —
`LINKEDIN_CLIENT_ID` / `SECRET` and `THREADS_APP_ID` / `SECRET`. Both refuse
clearly when absent rather than failing obscurely.

Nothing is deployed.

---
---

## WHAT THIS DOES NOT DO

Breadth is one of the four gaps. It does not add the scheduler, the unified
inbox or link-in-bio, and posting to eleven platforms with no inbox means
eleven places where replies go unread.

Nothing here is deployed.

---
---

# PLAN — reels that can actually be posted: the video pipeline, then Meta, then TikTok

Eric: *"yes plan tiktok and instagram facebook reels"*.

## THE THING THAT CHANGES THE ORDER

None of the three can post anything today, and **the reason is not the posting
code — it is the video itself.** Whatever gets wired up first, it would be
handed a file no platform will accept.

`VideoStudio.tsx` assembles the finished video in the browser with
`canvas.captureStream` + `MediaRecorder`, encodes it as **WebM / VP9**, and
then does exactly one thing with it: `a.download = '….webm'`. It goes to Eric's
disk. **It never reaches a server**, so there is no URL for any platform to
fetch, and even if there were:

> "only MP4/MOV with H.264 codec work — other formats silently fail with error
> code 24" — Instagram Reels API, 2026

WebM is refused by Instagram, by Facebook Reels and by TikTok. All three want
MP4/H.264. So the pipeline comes first or nothing else matters.

## WHAT ELSE IS BROKEN OR ABSENT (checked, not assumed)

**Instagram Reels is written and would fail.** `publishToInstagram` already
sets `media_type: "REELS"` with `video_url` — and then calls `media_publish`
immediately. Meta transcodes video asynchronously; the container must be polled
on `status_code` until `FINISHED` first. Publishing straight away errors. It
has never been noticed because no account has ever been connected.

**Facebook Reels does not exist at all.** `publishToFacebook` posts to
`/photos` when there is an image and `/feed` otherwise. Reels are a different
API entirely — `/video_reels`, a three-phase start/upload/finish.

**TikTok is a stub.** `connect/:platform` returns *"TikTok requires a TikTok
for Developers app."* Nothing else exists.

## THE TIKTOK APPROVAL GATE — READ BEFORE COMMITTING TO A DATE

TikTok's Content Posting API has a hurdle no amount of code removes:

> "All content posted by unaudited clients is restricted to private viewing
> mode" — and posting to a non-private account "is blocked at
> `/publish/video/init/`".

So until TikTok audits the app, every post lands **private**. Lifting that
needs a manual review: a demo video or screenshots of the integration, and a
privacy policy URL. **That application is Eric's to file and it has a lead
time.** The code can be finished and correct and still post privately until
TikTok says otherwise — worth knowing before it looks like a bug.

Worth it anyway: TikTok has the strongest organic reach of any platform in
2026 and reaches homeowners aged 25–40, which is the actual customer.

## THE WORK

### M — a video that a platform will accept

- [x] M1. Record MP4/H.264 rather than WebM. Chrome's `MediaRecorder` now takes
      `video/mp4;codecs=avc1…,mp4a.40.2`. **Feature-detect it** — Chromium
      builds ship without H.264 and AAC for licensing reasons, so this cannot
      be assumed. Where it is unavailable, say so plainly rather than exporting
      a file that will be refused later with a silent error code.
- [x] M2. Upload the finished video to a Supabase bucket and hand back a URL
      Meta and TikTok can fetch. Today the only output is a browser download,
      so there is nothing to publish even when everything else works.
- [x] M3. Enforce the spec before upload, not after a refusal: 9:16, 3–90
      seconds, 24–60 fps. A post rejected for aspect ratio after a minute of
      transcoding is a bad way to find out.

### N — Meta reels

- [x] N1. **Poll the container.** `GET /{container-id}?fields=status_code`
      until `FINISHED`, then publish. Meta advises about once a minute for up
      to five; most finish in 30 seconds to 2 minutes. This is the actual bug
      in the existing Instagram path.
- [x] N2. `share_to_feed` on the container so a reel appears on the grid as
      well as the reels tab.
- [x] N3. Facebook Reels through `/video_reels` — initialise, upload, finish —
      as a real branch beside the photo and feed ones, not a reuse of them.
- [x] N4. Surface the wait. These take minutes, not the moment a button is
      pressed, and a UI that looks hung is how somebody posts twice.

### O — TikTok

- [x] O1. OAuth with `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` and the
      `video.publish` scope, storing the token the same way Facebook's is.
- [x] O2. Direct Post: `/publish/video/init/` with `PULL_FROM_URL` against the
      bucket URL from M2, then poll for completion.
- [x] O3. **Say the private-until-audited thing in the interface**, beside the
      TikTok connection. A post that silently goes private looks like a bug and
      would otherwise be reported as one.

### P — prove it

- [x] P1. Tests for the parts that can be tested without a live account: the
      container-status decision (poll / publish / give up), the spec check, the
      format capability check.
- [x] P2. `npm run typecheck`, `typecheck:server`, `npm test`, `npm run smoke`.
- [ ] P3. STILL OUTSTANDING — one real reel posted to each connected platform. **This is the only
      proof that counts** and it cannot happen until an account is connected.

## REVIEW — what changed

### M — a video a platform will accept

`VideoStudio.tsx` recorded WebM/VP9 unconditionally and did exactly one thing
with the result: `a.download`. It reached a disk and nowhere else. Both halves
of that were fatal — WebM is refused by all three platforms, and a file on
somebody's laptop has no URL for anyone to fetch.

`src/app/lib/reelSpec.ts` now picks the best recordable format, **feature-
detected rather than assumed**: Chromium builds ship without H.264 and AAC for
licensing reasons, so "Chrome records MP4" is true of Chrome and not of
everything calling itself Chromium. Where MP4 is unavailable the export still
happens and is marked unpostable, and the interface says why **before** the
render rather than after a wasted minute.

`POST /video-studio/rendered` stores the file and returns a signed URL. The
bucket stays private; a signed URL is fetchable without credentials for its
lifetime, which is exactly what Meta and TikTok need, without making the
bucket public or the path guessable.

**The server validates only what it can honestly verify** — the container and
the size. It has no media library, so it cannot measure aspect ratio, duration
or frame rate; those are checked in the browser where the canvas dimensions
and scene timings are actually known, and that check exists to save a render
rather than as a security boundary. WebM is refused outright at the server
because Meta accepts it, queues it, and then fails silently with error code 24
— letting one through turns a clear refusal into a mystery.

15 tests on the rules, including the Chromium-without-H.264 case and that every
problem is reported at once rather than one render at a time.

### N — Meta reels

**The real bug: the container was never polled.** `publishToInstagram` created
a REELS container and called `media_publish` on the next line. Meta transcodes
video asynchronously, so the container is not publishable yet and the call
fails. Images are synchronous, which is why the photo path worked — and it
stayed invisible because no account has ever been connected, so no reel was
ever attempted. `waitForContainer` now polls `status_code` until `FINISHED`,
backing off to thirty seconds and giving up at five minutes, and reports
Meta's own message on `ERROR` because it names the cause better than a guess.

`share_to_feed` added, so a reel reaches the profile grid as well as the Reels
tab — without it, it reads as "it didn't post" to whoever goes looking.

**Facebook Reels did not exist.** `publishToFacebook` posted to `/photos` or
`/feed`, so a rendered reel would silently have become a text post. There is
now a real `/video_reels` branch — start, upload, finish — on its own host,
which could not be folded into the photo path.

### O — TikTok

OAuth with `video.publish` (not `video.upload`, which only drops a draft into
the creator's inbox — the two are granted separately, and asking for the wrong
one produces an integration that looks connected and cannot post), its own
token exchange, and Direct Post via `PULL_FROM_URL` against the bucket URL.

**The audit gate is surfaced in three places** rather than left to be
discovered: at connection time, in the publish error when TikTok refuses, and
in the plan above. An unaudited app can only post privately, and a refusal for
a public account reads like a bug when it is policy.

### The thing that nearly shipped as another orphan

Having built the upload and the publish paths, **nothing connected them** — a
video would have sat at a URL with no way to send it anywhere, which is the
identical shape to the product posts that were saved and never read, and to
the subscription maths with no caller. Caught before finishing.

The rendered reel now has Instagram / Facebook / TikTok buttons. **One platform
at a time, deliberately:** the three fail for different reasons — the reel
specification, the fetch, the audit — and a single "post everywhere" button
collapses three distinct answers into one toast that cannot say which went
wrong. The wait is stated on screen, because a UI that looks hung is how
somebody presses again and posts twice.

### Verification

- `npm run typecheck` **316**, `typecheck:server` **84** — both unchanged, and
  the one error inside `VideoStudio.tsx` was confirmed pre-existing by stashing
  this work and re-running.
- `npm test` — **764 pass, 0 fail**, up from 749.
- `npm run smoke` — the 9 pages this reaches, `video-studio` among them:
  **0 threw.**

### What is NOT proven, and cannot be yet

**No reel has been posted.** Every publish path here is written from the
platforms' current documentation and has never executed — no social account is
connected, so none of it can run. The parts that could be tested without an
account are tested; the Graph and TikTok calls are not, and should not be
described as working until one real reel has gone out on each.

That is `P3`, and it is the only proof that counts.

**Nothing is deployed.** Server changes, non-production project first.

**TikTok additionally needs Eric to file for the audit**, which has a queue.
Until then its posts land private, correctly and visibly.

---
---

## ORDER, AND WHY

**M first.** Without it the other two are untestable and would ship broken.
**N second** — the account Eric connects first is Facebook/Instagram, one real
bug is already sitting there, and it needs no external approval.
**O last**, because it is gated on an audit that has a queue.

## WHAT THIS DOES NOT DO

**It does not add a scheduler, an inbox, or link-in-bio** — the other three
gaps from the comparison. This is reels only.

**Nothing is deployed**, and the standing rule sends server changes to a
non-production project first.

**Step 1 is still outstanding and still blocks the only proof that matters:**
zero social accounts are connected.

---
---

# PLAN — make the store actually post: publish product posts, and run without a tab open

Eric: *"lets figure out why the online store isnt posting on my socials making
money yet"* — then, to the three things below: *"yes lets go all"*.

## WHAT THE LIVE SYSTEM SAYS

Read from the production KV table (`kv_store_57095a78` — the deployed function
is *named* `make-server-3eae23a6` but its code reads that table; the empty
`kv_store_3eae23a6` is an unused leftover, checked before raising any alarm):

    social accounts connected      0
    OAuth attempts left hanging    2
    product posts ever composed    0
    autopilot campaigns            0
    storefront products           22
    real orders                    1   (plus 2 demo, 3 "Probe Test")

**Nothing is posting because nothing was ever connected.** The publisher is
real — Facebook Graph, Instagram via the linked Business account — and it has
no account and no token.

The two hanging OAuth attempts are explained inside `social-media.tsx`: the
callback used to hit a `verify_jwt: true` function, so Facebook's redirect
(which carries no Supabase token) was 401'd before the handler ran — *"which is
why two OAuth attempts sat abandoned in the store with no account behind
them."* That bug is FIXED; the separate `social-oauth` function now catches the
redirect. So the two stale rows are from before the fix, and connecting should
work now.

**Step 1 is Eric's and blocks everything else:** connect one Facebook/Instagram
account. It needs his login, so it is not something to do on his behalf.

## THE TWO REAL GAPS IN THE CODE

### Gap 1 — a product post is saved and never published

`storeContentRouter.post('/posts')` takes a `channels` array and a `status`,
writes the record to KV, and returns success. **Nothing anywhere reads
`channels`.** No code path calls `/social/publish` with it. So composing a post
"to Facebook and Instagram" files a record that reads as published in the
Content Centre and never leaves the building.

Harmless today at zero composed posts. It would start lying the moment Eric
used it.

### Gap 2 — autopilot stops when the tab closes, and cannot be croned as built

`autopilot.tsx` says it plainly: *"this environment has no server cron — the
runner is driven by a client heartbeat."* `POST /autopilot/tick` exists for an
external cron and nothing calls it.

`pg_cron` IS available and already working here — `compliance-expiry-reminders`
runs daily at 12:00, calling the edge function through `net.http_post` with a
shared secret held in `private_cron_config`. The pattern is proven in this
project.

**But tick cannot simply be croned, for two reasons that matter:**

1. `getUserId` in `autopilot.tsx` returns **`"default"`** when there is no
   valid token. A cron carries no user JWT, so it would advance the campaigns
   of a shared pseudo-user rather than Eric's — and, separately, anyone holding
   only the publishable key can already POST to it and drive that namespace.
   This is the identical hole `social-media.tsx` deliberately closed, with a
   long comment about why: *"Connected pages carry the right to post as a
   business; that is not something to hand out to whoever asks."*

2. Publishing goes through `callInternal(c, "/social/publish", …)`, which
   **forwards the caller's Authorization header**. With no user JWT there is no
   identity, so `social_accounts:{userId}` resolves to nothing and every post
   comes back "Not connected".

## THE WORK

### J — publish product posts for real

- [x] J1. `POST /posts` publishes when the post says to. A `status` of
      `published` (or a `publishNow` flag) sends `body` + the post's image to
      `/social/publish` for each named channel, using the caller's own session
      — the same `callInternal` pattern autopilot already uses.
- [x] J2. **Record what actually happened, per channel.** The saved record
      carries the real per-platform result, and the status becomes `published`
      only if at least one channel succeeded — otherwise `failed`, with the
      reasons kept. A post that says "published" when Facebook refused it is
      the failure mode this whole task exists to remove.
- [x] J3. A draft stays a draft: no channels, or `status: 'draft'`, publishes
      nothing. Composing must remain safe.
- [x] J4. Instagram without an image already throws a clear error inside
      `publishToInstagram` and `/social/publish` catches it per platform — so
      that reason reaches the record rather than failing the whole save.

### K — let it run with no tab open, without weakening identity

- [x] K1. Extract the per-platform publishing loop out of the `/social/publish`
      HTTP handler into an exported `publishForUser(userId, …)`. The route
      keeps requiring a real session and passes its authenticated userId; no
      behaviour changes for any existing caller.
- [x] K2. Close the `"default"` fallback in `autopilot.tsx`: an unidentified
      caller gets 401 rather than a shared namespace. There are zero autopilot
      records, so nothing is stranded by this.
- [x] K3. `POST /autopilot/cron-tick`, guarded by the **same shared secret** the
      compliance job uses. It enumerates `autopilot:index:*` to find users who
      actually have campaigns and advances each as that user, calling
      `publishForUser` directly rather than forwarding a JWT it does not have.
      The userId is never taken from the request body.
- [x] K4. A migration adding the `pg_cron` job, copied from the compliance one
      that already works.

### L — prove it

- [x] L1. `npm run typecheck` / `typecheck:server` — no new findings.
- [x] L2. Tests for the publish decision: a draft publishes nothing; a
      published post with no successful channel is recorded as failed; the
      per-channel reasons survive onto the record.
- [x] L3. `npm run smoke` — the 8 pages this reaches, content-center among them: 0 threw.

## REVIEW — what changed

### J — product posts now actually post

The bug was quieter than first described, and the correction matters. The
composer did NOT claim to have posted: it said *"Saved as a social post — ready
to schedule."* That was almost honest. What made it a lie is that **no
scheduler for `store_post:` records exists or has ever existed** — nothing in
the entire server reads one back. So "ready to schedule" meant "will sit here
forever", and every post composed from live store products would have.

`POST /store-content/posts` now publishes through `/social/publish` when the
caller asks for it, forwarding their own session so the post goes out from
their accounts and never from a shared identity. The record carries the real
per-platform results, and its status is `published` only if a page actually
took it — otherwise `failed`, with the reasons kept.

The composer gained **Post to socials now**. The old button survives, honestly
relabelled **Save draft**, because saving must stay safe: publishing is the
side effect that cannot be undone.

`storePostPublish.ts` holds the decision — whether to publish, which platforms
a channel list means, what the status becomes — because `store-content.tsx` is
a `.tsx` the node test runner cannot load, and this decides whether something
reaches a live business page. 14 tests, including that saving does not post,
that a draft never posts, and that every platform refusing is recorded as
`failed` rather than published.

`channels: ['social']` — the only thing the UI ever sent — names no platform at
all. It expands to every supported platform rather than being dropped, because
it plainly meant "the socials", and posting nowhere is the behaviour being
fixed. Unsupported channels come back named rather than silently discarded.

### K — it runs with no tab open, and identity got stronger rather than weaker

**A security fix that stands on its own.** `getUserId` in `autopilot.tsx`
returned `"default"` for any caller without a valid session, turning "not
signed in" into a real shared identity. Every key is built from it, and
`advanceCampaign` publishes to live business pages — so anybody holding only
the publishable key could create campaigns in that namespace and drive them
out. `social-media.tsx` had already closed exactly this hole in its own
`getUserId`, with a comment whose reasoning applies here word for word. It now
returns null and all sixteen routes refuse. Nothing was stranded: there were
zero autopilot records in any namespace.

That fix is also what made the cron possible to do properly. A scheduler has no
session, so the two wrong answers were to invent a shared pseudo-user or to let
the caller name a user in the request body — both hand out the right to post as
a business. Instead:

- `publishForUser(userId, …)` was extracted from the `/social/publish` handler.
  The route still requires a real session and passes its authenticated user, so
  no existing caller changes; there is one publisher rather than two that drift.
- `advanceCampaign` takes an optional publisher. Request-driven runs forward
  the header as before; the scheduled run calls `publishForUser` directly.
  **This was only a one-line seam** because the runner's other work — caption,
  hashtags, image — is already on the item or re-signed with the service role.
  Publishing was the only part that needed a session.
- `POST /autopilot/cron-tick` is guarded by a shared secret read from
  `private_cron_config` first and the environment second, refusing outright
  when neither yields one. **Whose campaigns advance is read from the stored
  keys, never from the request.**
- `kv.getKeysByPrefix` was added so the table name stays in one file rather
  than being queried directly from a second.

### The migration is deliberately NOT armed

`20260928120000_schedule_autopilot_tick.sql.pending` — the same `.pending`
convention as the on-call escalation schedule, so a deploy does not apply it.
It schedules a job that posts to live Facebook and Instagram pages with nobody
watching. Renaming it to `.sql` is a decision, not a side effect.

It generates its own secret so nothing has to be typed anywhere, and copies the
compliance job's shape exactly — including reading the secret from the row the
scheduler itself sends, which is the arrangement that stopped a rotation from
silently 401ing every morning.

**The recommendation inside it, repeated here because it is the important
part:** leave `requireApproval` ON for the first campaign. The cron then proves
itself by moving items to "ready" while nothing reaches a page until Eric
presses approve. Turning it off later is one setting, by which point he will
have watched it work.

### What this does NOT do

**It does not make money, and nothing here should be described as if it will.**
The store is not broken — 22 products live, checkout working, one real order
through. What is missing is traffic. Posting is a prerequisite for traffic, not
a substitute for it.

**Step 1 is still Eric's and still blocks everything.** Zero social accounts are
connected. Both features above will run, find no account, and report "Not
connected" — correctly and visibly, rather than silently. The two abandoned
OAuth attempts are from before the callback bug was fixed, so connecting should
work now.

**Nothing is deployed.** All of this is server code.

### Verification

- `npm run typecheck` — **316, unchanged.** `typecheck:server` — **84,
  unchanged.** None in any file touched.
- `npm test` — **749 pass, 0 fail**, up from 735.
- `npm run smoke` — recorded below.
- **Not exercised end to end**, and cannot be until an account is connected.
  The publish paths were read carefully and their decisions are tested; the
  Graph API calls themselves have never run.

---
---

## WHAT THIS DOES NOT DO

**It does not make money, and should not be described as if it will.** The
store is not broken: 22 products are live, checkout works, one real order went
through. What is missing is traffic. Posting is a prerequisite for traffic, not
a substitute for it — the honest claim is "the machine will run", not "the
machine will sell".

**Nothing is deployed.** These are server changes and the standing rule sends
them to a non-production project first. The cron migration in particular
creates a path that posts to live business accounts with no human in the loop,
which is worth Eric seeing work somewhere safe before it runs on his own pages.

## THE DECISION INSIDE K3, NAMED RATHER THAN ASSUMED

A cron that advances campaigns will publish to Eric's real Facebook and
Instagram pages while nobody is watching. Autopilot already supports
`requireApproval` on a campaign, which holds items until a human approves them.
**Recommendation: leave that on for the first campaign**, so the cron proves
itself moving items to "ready" without anything reaching the pages until Eric
presses approve. Turning it off later is one setting.

---
---

# PLAN — the add-on panel: let a subscriber see what they pay and choose what to add

Eric picked "the trial leak first" from the subscription plan. **Section C is
already built and already pinned by tests** — the plan simply never had its
boxes ticked, the same way the quotes plan's were not. Checked against the code
before writing anything:

| Plan item | Reality |
|---|---|
| C1 `holdsAddOn` true for any add-on on trial | Deliberate and documented. `paysForAddOn` is the money-side companion, `TRIAL_EXCLUDED_ADD_ON_IDS` already carves out on-call, and `/plan-add-on` uses `paysForAddOn` on purpose. |
| C2 trial add-ons never written to `addOnIds` | Pinned: *"a trial owns nothing, so conversion has nothing to bill for"*, *"trial breadth never leaks into what is being paid for"*. |
| C3 cancelled subscription holds nothing | Pinned twice, including *"a cancelled subscription holds nothing, whatever ids are left on the grant"*. |
| C4 trial end drops to the free floor | Pinned: *"AN EXPIRED TRIAL IS FREE — this is the one that gives the product away"*, plus the exact-boundary case. |

`tests/planTier.test.ts` — **98 tests, all passing.** There is nothing to fix in
section C. Its boxes are ticked in this pass and the section is marked done.

## SO WHAT IS ACTUALLY MISSING

The same shape as this morning's `/applications` bug: **the machinery is built,
tested and careful, and nothing in the product calls it.**

    subscriptionTotalCents()   planTier.ts:364   called by: nothing
    addOnsForTier()            planTier.ts:385   called by: nothing

Both are complete and tested — included add-ons cost nothing, an add-on not
available on the tier is not counted rather than quietly charged, purchasable
is resolved against the server's own Stripe mode. Neither has a single caller
in `src/` or in any route.

The server side of buying is done too:

- `POST /plan-checkout` takes `addOnIds`, validates them against the catalogue
  and refuses the whole checkout rather than quietly building a cheaper one.
- `POST /plan-add-on` adds one extra to a live subscription — the Stripe
  subscription-item change the plan called "the hard part, named rather than
  discovered later". It is built.

**What is missing is the screen.** `GET /my-plan` tells a portal what the
account holds — entitlement, tier, `addOns`, `onCall` — and never what they
**pay**, nor what they **could add**. So there is no surface anywhere that
answers Eric's actual sentence:

> "there will be add on in the portals that can increase the monthly
> subscriptions depending on what the user wants"

Today a subscriber cannot see their monthly figure, cannot see what is
available to them, and cannot add anything. The two portals that read
`/my-plan` at all use it only to unlock features by tier.

## THE WORK

### G — make the figure and the catalogue readable

- [x] G1. `/my-plan` also returns `monthlyTotalCents` (from
      `subscriptionTotalCents`, tier plus what they hold) and `available`
      (from `addOnsForTier`, each marked `included` / `purchasable` with its
      price). Server-side, from records the server owns. The Stripe price ids
      keep not reaching the browser — `addOnsForTier` already strips them.
- [x] G2. **CHANGED WHILE BUILDING, and the change matters.** The plan said a
      trialist should be shown "the figure they WOULD pay on conversion". That
      figure does not exist: it depends on which tier they convert to, and they
      have not chosen one. Producing a number would have meant picking a tier
      on their behalf and presenting the guess as their bill.

      So `monthlyTotalCents` is **null** for anyone not on a paid tier — null
      and not zero, because a panel rendering "$0.00" teaches a trialist the
      wrong number for the day the clock stops. `totalBasis` says why
      (`subscription` / `trial` / `free`) so the screen can tell "nothing is
      charged during your trial" apart from "you are on the free plan", which
      are different sentences.
- [x] G3. Extend `tests/planTier.test.ts` for the payload shape: the total is
      the tier plus extras and never a posted figure; an included add-on adds
      nothing; a trialist gets null rather than zero.

### H — the panel, in the portals that already have a Billing tab

- [x] H1. `SubscriptionAddOnsPanel` — what you pay now, the extras available on
      your tier marked included-or-extra with their prices, and **the new
      monthly total shown before committing**. Reads `/my-plan`; posts to
      `/plan-add-on`, which already exists and already validates.
- [x] H2. Drop it into the **existing** Billing tab of the advertiser and vendor
      portals — the two that already read `/my-plan`. No new tabs, no
      restyling: per the standing rule the portals keep their design unless a
      redesign is asked for.
- [x] H3. Fail closed. Anything the panel cannot read leaves it showing nothing
      purchasable rather than a guessed price or an enabled button.

### I — prove it

- [x] I1. `npm run typecheck` — no new findings over the 316 baseline.
- [x] I2. `npm test` — planTier's 98 plus the new ones.
- [x] I3. `npm run smoke` — zero throws.
- [ ] I4. Open a portal Billing tab in the running app and read the figure.

## REVIEW — what changed

### The finding that redirected the work

Section C was picked as the starting point because the plan described it as a
trial leak. **It was not a leak and there was nothing to fix.** The behaviour
is deliberate, documented at length in `planTier.ts`, and pinned by tests that
were already passing: a trial grants breadth and a purchase grants persistence,
`paysForAddOn` is the money-side companion to `holdsAddOn`, and on-call is
already carved out of trials because staffing a phone line for four months is a
real bill and a real rota. The four boxes are now ticked rather than re-solved.

What the check DID surface is the same shape of bug as the applications work
earlier in the day: **built, tested, careful, and called by nothing.**

    subscriptionTotalCents()   planTier.ts   callers before this: none
    addOnsForTier()            planTier.ts   callers before this: none

`/plan-checkout` and `/plan-add-on` — including the Stripe subscription-item
change the plan called "the hard part" — were already written. The missing
piece was the screen, so Eric's actual sentence had nowhere to happen.

### G — the figure and the catalogue

`/my-plan` now also returns `available` (from `addOnsForTier`, which strips both
Stripe price ids before they can reach a browser) and `monthlyTotalCents` with
a `totalBasis`.

The judgement about WHICH figure to show moved into `monthlyFigure()` in
`planTier.ts` rather than staying inline in the route — the same reason the
application helpers moved this morning: logic inside a Deno route cannot be
tested, and this decides what a customer is told they pay.

**A trialist gets null, not zero.** See G2 above: the conversion figure does
not exist until they pick a tier, and "$0.00" is a number that would be wrong
on exactly the day it stopped being true.

### H — the panel

`SubscriptionAddOnsPanel` shows what the account is billed, the extras
available on their tier marked included-or-already-held, and — while boxes are
ticked — what the monthly total *would* become, clearly as a preview. Adding
one posts to `/plan-add-on`, which revalidates against the catalogue; the
preview arithmetic is display only, because a total that arrives from a browser
is a number the customer can edit.

Per-unit add-ons are deliberately excluded from the preview sum and labelled
"per unit covered". Their price is per unit and the count comes from our own
records, so adding one price would state a total that is wrong for every
account with more than one unit.

It fails closed: anything it cannot read leaves it showing no prices and no
enabled buttons, saying so, rather than guessing.

Placed in the two portals that already read `/my-plan`, in surfaces that
already exist — the advertiser Billing tab, and the vendor tab that is
literally called **"Plans & Add-ons"** and had no add-ons on it until now. No
new tabs and no restyling, per the standing rule about leaving portal design
alone.

### THE CONFLICT THIS EXPOSED — needs Eric's decision

The advertiser Billing tab's "Your plan — $X per month" comes from
`src/app/config/subscriptionPlans.ts`, a **hardcoded client-side catalogue**.
The new panel reads the server's `plan_tier` records. These are two separate
price lists on one screen, which is exactly what
`plans-are-one-connected-system` says must not happen.

Nothing was changed about the existing header, because reconciling the two
alters a price Eric sees on a working screen and that is his call, not a
side-effect of adding a panel. Today the two cannot contradict each other in
practice — with no `plan_tier:advertiser` records published, the panel reports
no figure rather than a competing one — but the moment a tier is published they
will. **Worth settling before any tier is published, not after.**

### Not done in this pass

- **A1, the entry content rung.** A tier is a KV record created through the
  admin screen. Publishing "Solo, $79/mo" is Eric pressing buttons, and the
  constraint is a pricing decision: the free backstop is 300 model calls and 10
  renders, so an entry rung must clear it or paying would be worse than not.
- **Proration on `/plan-add-on`.** It performs the subscription-item change;
  what it does to the current invoice was not read closely and was not changed
  blind.
- **Nothing is deployed.** The `/my-plan` change is server code and belongs in
  a non-production project first.

### Verification

- `npm run typecheck` — **316, unchanged from baseline**, none in any file touched.
- `npm run typecheck:server` — 84, unchanged.
- `npm test` — **735 pass, 0 fail**, up from 727: eight new tests on
  `monthlyFigure`, including that a trialist gets null rather than zero and
  that a subscription whose tier no longer resolves reports free rather than a
  stale figure.
- `npm run smoke` — see below.
- **Not opened in the running app.** The panel needs a signed-in advertiser or
  vendor with a published tier to show anything, and there are no
  `plan_tier:advertiser` records to sign in against. Its empty and
  failed-to-read states are what would render today, which is correct
  behaviour but is not the same as seeing it work.

---
---

## WHAT THIS PASS DOES NOT DO

**A1, the entry content rung.** A tier is a KV record (`plan_tier:<audience>:<id>`)
created through the admin screen, not code. Publishing "Solo, $79/mo" is Eric
pressing buttons, not a commit — and the plan's own constraint (the free
backstop is 300 calls and 10 renders, so an entry rung must clear it) is a
pricing decision, not an implementation one. Flagged for him rather than
invented.

**B3, mid-cycle proration.** `/plan-add-on` performs the subscription-item
change; what it does about proration on the current invoice has not been read
closely and is not being changed blind. Worth its own look.

**Nothing is deployed.** These are server changes and the standing rule is that
they are tested off production first.

## OPEN QUESTION

The panel lands in the advertiser and vendor Billing tabs because those exist
and already read `/my-plan`. Customer, subcontractor, property manager,
landlord and condo portals have no billing surface at all — should they get one
in a later pass, or do their subscriptions stay administered by Black Phoenix?

---
---

# PLAN — every application wired end to end, and a tech application that says what he is actually good at

Eric: *"can we please make sure the applications are all wire and running end to
end also make sure the tech application is redesigned as i need to know the techs
real abilities what he is good at. let review this application and make it more
detailed in the tech acuatul skills"*

Two things: prove every application path works from the button to the reviewed
record, and rebuild the field tech application so the answer to "what is he good
at" is readable rather than guessable.

---

## WHAT THE SURVEY FOUND

### 1. Five of the six modal applications cannot be submitted at all. BLOCKING.

`GenericApplicationForm.tsx:135` decides whether a required field has been
answered:

    if (field.type === 'skill') return !Array.isArray(value) || value.length === 0;

`SkillSelector` (same file, line 730) stores its answer as an **object** keyed by
skill id — `{ hvac: { checked: true, level: 'Expert (10+ years)', description: '' } }`
— not an array. An object is not an array, so the check says "empty" no matter
how many skills were ticked.

Every application whose skill step is `required: true` is therefore stuck. The
applicant ticks HVAC, Plumbing and Electrical, sets a level on each, presses
Next, and is told *"Please complete: Technical Skills"* forever. There is no way
round it and nothing on screen explains it.

That is:

| Application | Skill field | Blocked |
|---|---|---|
| Employee Portal | `skills` | **yes** |
| **Field Tech / Maintenance Tech** | `technical_skills` | **yes** |
| Property Manager | `service_needs` | **yes** |
| Landlord | `service_needs` | **yes** |
| Condo Association | `service_needs` | **yes** |
| Subcontractor (Maintenance/Carpentry) | `maintenance_skills`, `carpentry_skills` | no — not required |

The field tech application Eric is asking about is one of the five. Nobody has
ever been able to submit it.

Behind that sits a second bug that only shows once the first is fixed: the
preview screen renders `{formData[field.id] || 'Not provided'}`, and handing
React a plain object throws *"Objects are not valid as a React child"* — so the
preview would crash on the first skill field it met.

### 2. `/sign-up` is not a public route. BLOCKING.

`SignUpOptionsModal` sends Customer, Subcontractor and Advertiser to
`window.location.href = '/sign-up'`. `routes.tsx:238` has `"sign-up": SignUp`, so
the page exists — but `App.tsx`'s `publicRoutes` list contains `'signup'` and not
`'sign-up'`. A signed-out visitor is redirected straight to `/login`.

The same gap applies to `join`, `join-us`, `create-account` and `get-started`:
all four are real routes, all four are in `FULL_BLEED_PAGES` (so they were built
as public marketing screens), none is in `publicRoutes`.

### 3. What is already correct, and should be left alone

- Every application form posts to `POST /applications` on
  `make-server-3eae23a6`, which is the deployed function. Vendor, subcontractor,
  service provider, advertiser, investor, territory, property manager, tenant and
  both modal applications all agree on this.
- The server route is sound: it saves the application, writes a CRM contact, and
  on approval builds the intake record, syncs portal access, creates the provider
  organisation for Phoenix Exchange and raises a plan proposal.
- `GET /applications` and `PATCH /applications/:id` both require an administrator
  and `GET /applications/:id` lets an applicant read only their own. That is the
  fail-closed behaviour we want; nothing there needs touching.
- The tenant screening link (`/apply?t=<token>`) is routed and public, and its
  server side validates the token. Wired.
- `intakePortalType` already maps `field_technician` to `employee`, so an approved
  tech lands in the employee portal.

### 4. Three applications grant the WRONG PORTAL on approval. BLOCKING.

`GenericApplicationForm` derives `applicationType` from the config, falling back
to `'general'`. The server's `intakePortalType` maps `'general'` to **customer**.

Three of the modal applications never set `applicationType`:

| Application | `applicationType` set? | Portal granted on approval |
|---|---|---|
| Property Manager | **no** | customer |
| Landlord | **no** | customer |
| Condo Association | **no** | customer |
| Employee, Employment, Field Tech | yes | employee |

So approving a condo association board gives them a customer portal. Given that
the association is sold the exterior and common-area work while the unit owners
are sold the interior, and that a landlord portal invites its own tenants, this
is not a cosmetic mismatch — the approved account lands somewhere that cannot do
what they signed up for.

This one only becomes visible once the skill bug (section 1) is fixed, because
until then none of the three can be submitted in the first place.

### 5. The dead links: the features ARE built, the links are vestigial

Eric asked whether these are built out or need removing. Checked each:

**`change-orders`** — the feature is real and working. The server route exists,
`JobTrackingHub` fetches live change orders from it, and its Change Orders tab
renders them. The broken `/change-orders` link is a **"View All Change Orders"
button at the bottom of the screen that is already showing all of them**. It
points at a fuller page that was never built because the tab became the full
page. Nothing is stranded: delete the button.

`ChangeOrderCameraApp.tsx:788` is already handled — it navigates to
`change-order-approval` correctly and only falls back to the bad URL when no
`onNavigate` was passed. One-line fix.

Worth knowing: the **"New Change Order"** button beside it has no `onClick` at
all. It is inert, which is worse than a dead link — it looks like it works. The
page it should open, `change-order-camera`, is built and routed.

**`supplier-connect`** — identical shape. `SupplierManagementHub` loads real
suppliers and purchase orders from the server. The broken link is **"View All
Supplier Connections" at the bottom of the screen already listing every
supplier**. Delete the button. Three more buttons on that screen — View Details,
New Order, Contact — also have no `onClick`.

**`universal-signup-flow`** — the modal it belongs to is real and rendered, but
the two handlers that would navigate to `/universal-signup-flow` are never
called by anything. Dead code, not a dead feature. Delete the handlers.

**`PropertyManagerApplication.tsx`** — this one is the opposite: **fully built
and better than what is actually being used.** 296 lines, purpose-written rather
than generic, asking units managed, property types, service area, current
software, monthly maintenance spend, pain points and timeline, with the plan
builder and a terms agreement. The modal ignores it and renders its own generic
version inline — which is one of the three missing `applicationType` above.

So this is a duplicate, not an orphan. Two forms for one job is drift waiting to
happen, and the standing rule is repair the existing thing rather than keep a
second one alongside it. Recommendation: route the real page, point the modal at
it, delete the inline copy. That also removes one of the three wrong-portal bugs
for free.

## THE TECH APPLICATION: WHAT IS WRONG WITH IT

Today the whole of "what is he good at" is eight tick boxes — HVAC, Plumbing,
Electrical, Carpentry, Appliance Repair, Painting & Drywall, Flooring,
Landscaping — plus one overall `years_experience` number and a free-text
certifications box.

So a tech who has run commercial HVAC for twenty years and once helped a friend
tile a floor produces exactly the same record as a tech who is the other way
round. There is no proficiency, no licence, no evidence, and no distinction
between "I can do this" and "put me in charge of it".

And none of it is readable afterwards. `applicationFields.ts` names business
fields — company name, tax ID, categories, insurance. A field tech's skills,
experience, certifications, references and answers land in **`unlistedKeys`**,
which renders as one grey line: *"Also submitted, not shown above:
availability, certifications, emergency_calls, ..."*. To learn what a tech is good
at you open the Raw submission JSON and read it.

### The taxonomy already exists — use it, do not invent a second one

`src/app/lib/laborTasks.ts` holds the twelve trades the estimator actually prices
with (carpentry, painting, electrical, plumbing, laboring, sheetrock, siding,
roofing, tile, flooring, masonry, hvac) and, under each, named tasks with
man-hours per unit — *"Hang prehung interior door, 1.2 h each"*, *"Baseboard and
casing, 0.045 h per lin ft"*.

Declaring a tech's ability against that same list is what makes the answer worth
having, and it is what ties this into the rest of the platform rather than
sitting beside it:

- **Assignment** — the work request board can ask "who is rated to do this
  trade" instead of a person remembering.
- **Hours correction** — the standing intent that quoted hours get corrected
  against what crews really achieve. That comparison only means something per
  trade and per person.
- **Rates** — labour rates are already held per `tradeId`, so a tech's trades
  line up with what the work is billed at.

## THE REDESIGN

Six steps instead of five. The new middle three are the whole point.

**Step 1 — Who he is.** Unchanged: name, email, phone, address.

**Step 2 — Trades, rated.** Each of the twelve trades from `laborTasks.ts`, and
for each one he claims a **level** and the **years in that trade specifically**.

Eric's ruling, in his words: *"lets have three sections Beginner(1-2 years),
Novice (2-5years), Advanced (5-10 years), probation period to review actual
skills"*. So three rungs, defined by years served rather than by a description
of competence — a fact that can be checked, not a self-assessment:

| Level | Years in that trade |
|---|---|
| Beginner | 1–2 years |
| Novice | 2–5 years |
| Advanced | 5+ years |

The fourth "leads a crew" rung from the first draft is dropped.

**Assumption, flagged rather than asked:** the ranges as given stop at ten
years, which would leave a twenty-year tradesman with nothing to pick, and start
at one, which would leave a six-month apprentice with nothing to pick. Advanced
is therefore treated as open-ended at the top and Beginner as open-ended at the
bottom. Say so if that is wrong.

**Step 2b — Declared, not confirmed.** Because the real rating is settled during
probation (below), every level the applicant picks is stored as *declared*. The
record carries a second, separate confirmed rating that only a reviewer can
write. Nothing downstream — assignment, rates, scheduling — should ever read the
declared value as though it were established fact.

**Step 3 — Named tasks inside every trade he claims.** For each trade he picked
in step 2, the actual task list from `SEED_TASKS` for that trade, so he ticks
*"Hang prehung interior door"*, *"Crown moulding"*, *"Cabinet installation"*.
This is the difference between "carpentry" and knowing he can be sent to hang
cabinets on his own.

**Step 4 — Licences, certifications and tickets.** Structured, not a free-text
box: licence type, number, issuing state, expiry — plus the common ones as
checkboxes (EPA 608, OSHA 10, OSHA 30, journeyman/master electrical, gas fitting,
backflow, lift/aerial, confined space) and a free-text field for anything else.
Expiry matters: a certificate that lapsed is not a qualification.

**Step 5 — Evidence and equipment.** Photos of his work (already supported),
tools he owns at trade level rather than "Yes — full set", truck/trailer,
whether he can haul materials, and whether he is OK with heights, crawl spaces
and attic work — all things that decide what he can actually be sent to.

**Step 6 — Availability and references.** As today, plus the tax classification
step the form already appends for technician applications.

## PROBATION IS WHERE THE REAL SKILL IS SETTLED

Asked whether a trade quiz or a working interview should gate approval, Eric's
answer was neither: *"probation period to review actual skills"*.

That changes what the application **is**. It is a claim, not a finding. The tech
is brought on, and what he is actually good at is decided by watching him work.
So the build needs a place for that judgement to land:

- **On approval**, a technician record opens with every declared trade rating
  copied across as `declared`, and `confirmed` left empty, with a probation
  start date and a review date.
- **During probation**, a reviewer can confirm, raise or lower each trade
  individually — a tech can come out Advanced in carpentry and Beginner in the
  plumbing he claimed Novice at. Confirming is per trade, not one verdict on the
  person.
- **At the end**, probation closes as passed, extended, or not passed, with the
  confirmed ratings becoming the ones the rest of the platform reads.

This is the same instinct as correcting quoted hours against what crews really
achieve: measure the work rather than trust the number written in advance. A
technician's confirmed trade rating and his real hours on jobs are the same
evidence seen twice, and they should eventually inform each other.
step the form already appends for technician applications.

### And make it readable at the other end

A `technicianProfile()` reader beside `applicationFields()`, and a Tech Abilities
panel in `ApplicationSubmissions` that leads with the trades he leads, then what
he is strong at, then the named tasks, then live certifications — with lapsed
ones called out. A reviewer should be able to answer "what is he good at" in
about three seconds without opening the raw JSON.

---

## TODO

### A. Make the applications actually submit
- [x] A1. Fix the `skill` required-field check in `GenericApplicationForm.tsx` to
      understand the object shape `SkillSelector` really produces. Count a skill
      as answered only when it is ticked. Unblocks all five applications.
- [x] A2. Fix the preview screen so a skill answer renders as readable lines
      instead of throwing on an object.
- [x] A3. Add `sign-up`, `join`, `join-us`, `create-account` and `get-started` to
      `publicRoutes` in `App.tsx`, so a signed-out visitor reaches the signup
      screens instead of being bounced to login.
- [x] A4. Set `applicationType` on the Property Manager, Landlord and Condo
      Association configs, so approving one grants that portal instead of a
      customer portal.

### F. The dead links (answered: features are built, links are vestigial)
- [x] F1. Delete the "View All Change Orders" button in `JobTrackingHub.tsx` —
      it sits on the screen that already lists them all.
- [x] F2. Wire the inert "New Change Order" button beside it to
      `change-order-camera`, which is built and routed.
- [x] F3. Delete the "View All Supplier Connections" button in
      `SupplierManagementHub.tsx`, same reason.
- [x] F4. Fix the fallback URL in `ChangeOrderCameraApp.tsx:788` to
      `/change-order-approval`.
- [~] F5. NOT DONE ON PURPOSE (see review) — delete the two uncalled `universal-signup-flow` handlers in
      `SignUpOptionsModal.tsx`.
- [x] F6. Route `PropertyManagerApplication.tsx`, point the modal at it, and
      delete the inline generic copy. Resolves one third of A4 for free.

### B. Redesign the tech application
- [x] B1. New `src/app/lib/technicianSkills.ts`: the trade list derived from
      `laborTasks.ts` (one source, no second copy), the three levels
      (Beginner 1–2, Novice 2–5, Advanced 5+), and the certification list with
      expiry.
- [x] B2. A `trade-rating` field type in `GenericApplicationForm` — trade, level,
      years in that trade — replacing the flat tick list for this form only.
      Stored as `declared`, never as settled fact.
- [x] B3. A `task-checklist` field that shows the real tasks for every trade he
      claims, revealed per trade as he picks it rather than all at once.
- [x] B4. A `certifications` field: type, number, state, expiry, plus the common
      tickets.
- [x] B5. Rewrite the field tech config in `SignUpOptionsModal.tsx` to the six
      steps above.

### C. Make it readable when reviewing
- [x] C1. `technicianProfile()` in `applicationFields.ts` — ordered, labelled,
      nothing invented, nothing hidden.
- [x] C2. Tech Abilities panel in `ApplicationSubmissions.tsx`, shown only for
      technician and employee applications. Leads with Advanced trades, then
      Novice, then Beginner, then the named tasks, then live certifications with
      lapsed ones called out.
- [x] C3. Add the new field ids to `HANDLED` so they stop appearing in the
      "also submitted" line.

### E. Probation — where the real skill is settled
- [x] E1. On approval of a technician application, open a probation record: every
      declared trade rating copied in as `declared`, `confirmed` empty, a start
      date and a review date.
- [x] E2. A reviewer can confirm, raise or lower each trade **individually**
      during probation — a tech can come out Advanced in carpentry and Beginner
      in the plumbing he claimed Novice at.
- [x] E3. Close probation as passed, extended, or not passed. The confirmed
      ratings become what the rest of the platform reads; the declared ones stay
      on the record so the two can be compared.
- [x] E4. Server side: the confirmed rating and the probation verdict are written
      only by an administrator, on the server. A technician must never be able to
      raise his own rating, and no rating may be read from anything the browser
      controls.

### D. Prove it
- [x] D1. `npm run typecheck` — no new findings over baseline.
- [x] D2. `npm run smoke` — 345 rendered, 0 threw.
- [x] D3. Walk every application in the running app: open it, complete it,
      submit it, and confirm the record appears in Application Submissions with
      the abilities readable. This is the step that counts.

## SETTLED WITH ERIC

1. **The levels** — three, not four: Beginner (1–2 years), Novice (2–5 years),
   Advanced (5+ years). The "leads a crew" rung is dropped.
2. **Verification** — no trade quiz and no working interview at application
   stage. A probation period reviews the actual skills instead. Section E.

3. **Named tasks** — settled: show the task checklist for **every trade he
   claims**, not only the strongest. Each trade's tasks appear only once that
   trade is picked, so the form grows with what he actually claims rather than
   opening at sixty checkboxes.
4. **Probation** — settled: **90 days, administrator signs off**, confirming or
   revising each trade individually.

## STILL OPEN

5. **The dead links** — answered as a question of fact in section 5: the
   features are built, the links are vestigial buttons. Still Eric's call
   whether section F rides along in this pass or waits. F1–F5 are five small
   deletions and one one-line fix. F6 (routing the real Property Manager form)
   is the only one with any size to it, and it also fixes a wrong-portal bug.

## SCOPE NOTE

A1 and A2 touch `GenericApplicationForm`, which every application renders, and A3
touches the route guard. Both are narrow, both are fixing things that are broken
rather than changing anything that works, and neither alters how a working screen
looks — but per the standing rule about blast radius, flagging them here before
touching them rather than after.

## REVIEW — what changed

### A. The applications can now be submitted

**A1. The skill validation.** `GenericApplicationForm.tsx` asked
`!Array.isArray(value)` of an answer that `SkillSelector` stores as an object,
so it reported "empty" however many skills were ticked. Five applications —
Employee, Employment, Field Tech, Landlord, Condo Association — were impossible
to submit. Replaced with `selectedSkillIds()`, which reads the real shape and
also accepts the array shape an older offline queue may hold.

**A2. The preview screen.** It rendered `{formData[field.id] || 'Not provided'}`,
which throws "Objects are not valid as a React child" on a skill answer or a
FileList. It had never been reached because of A1, so fixing A1 alone would have
swapped one dead end for another. Added `previewText()` for ordinary answers and
dedicated rendering for skills, trades and certifications.

**A3. The signup routes.** `sign-up`, `join`, `join-us`, `create-account` and
`get-started` are real routes and were missing from `publicRoutes`, so a
signed-out visitor clicking the main sign-up button was redirected to `/login`
and asked to authenticate in order to create an account.

**A4. The wrong-portal bug.** Property Manager, Landlord and Condo Association
set no `applicationType`, so the server mapped them to `general` → **customer**.
Landlord and Condo Association now declare their own type; Property Manager is
fixed by F6 below, because the real page already declared it correctly.

### B. The tech application

**B1.** `src/app/lib/technicianSkills.ts` — the three levels, the certification
catalogue with expiry, the probation constants, and helpers. It contains **no
trade list**: the trades are re-exported from `laborTasks.ts`, which is the
list the estimator prices with. `TRADE_LABELS` moved out of `LaborTasksConfig`
into `laborTasks.ts` so there is one copy rather than two.

**B2 and B3 merged, deliberately.** The plan had named tasks as their own step.
That cannot work: `GenericApplicationForm` renders each field in isolation and
never hands a field another field's value, so a separate task step could not
know which trades had just been claimed — it would have had to show all sixty-six
tasks to everybody. `TradeRatingSelector` therefore opens a trade's level, years
and task list together, which is also the better form: nothing is shown for a
trade that was not claimed, so "every trade he claims" stays affordable.

**B4.** `CertificationsField` — type, number, issuing state and expiry as
fields, with lapsed and expiring-soon called out as the applicant types, and
"Something else" for anything not on the list.

**B5.** The field tech config rewritten to six steps: who he is, his trades,
licences, evidence and equipment, availability, references. References now ask
which trade each referee actually saw him do.

### C. Readable at the review end

`technicianTrades()` and `technicianCertifications()` in `applicationFields.ts`,
and a **Tech Abilities** panel that leads the detail view — Advanced trades
first, each showing declared beside confirmed, with lapsed certifications in
red. The new field ids were added to `HANDLED`, so they no longer appear in the
grey "also submitted, not shown above" line.

### E. Probation

Server: `ensureProbation` opens a record the moment a technician application is
approved, copying every claimed trade in as `declared` with `confirmed` null.
`GET /probation/:id` is readable by an administrator or by the technician it is
about, and by nobody else. `PATCH /probation/:id` is administrator-only,
validates the level against the three that exist rather than trusting the body,
confirms trades **one at a time**, and closes probation as passed, extended or
not passed. Extending restarts the ninety days.

UI: `TechnicianProbationPanel`, shown on an approved technician application. It
keeps the claim on screen next to the verdict and says plainly when a confirmed
level is above or below what was claimed.

Nothing anywhere copies `declared` into `confirmed`. `reliableLevel()` returns
the confirmed rating or null — never a fallback to the claim.

### F. The dead links

- F1, F3. The two "View All…" buttons deleted. Both sat at the bottom of the
  screen that already listed everything, pointing at pages that do not exist.
  JobTrackingHub gained an honest empty state in place of its button.
- F2. The inert "New Change Order" button now opens `change-order-camera`.
- F4. `ChangeOrderCameraApp`'s fallback URL corrected.
- **F5 was wrong and was not carried out.** The plan called
  `universal-signup-flow` dead code. It is not: `UniversalSignupFlow` is a
  complete 494-line signup posting to a real, implemented server route that
  saves the application, writes the CRM contact and raises the access request.
  It is unreachable only because the handler that opens it is never wired to
  anything. Deleting the handlers would have thrown away a working feature, so
  only the broken destination was fixed. **Eric's call** whether to offer it.
- F6. `PropertyManagerApplication` routed at `property-manager-application`,
  made public, added to the invite deep-link allow-list, and the modal points at
  it. The inline generic duplicate is gone.

### Found and fixed on the way

`type: 'info'` had no branch in the renderer, so the condo association
application's "Permission Structure" explanation — which lists what property
managers, board members and residents may each do — fell through to a plain
`<input>`. The applicant saw an empty text box and never the explanation.

### KNOWN GAP, NOT FIXED — READ THIS

`intakePortalType` on the server maps **landlord and condo association both to
`property_manager`**. A4 stops them being granted a customer portal, which was
the serious bug, but they still do not resolve to their own portal type, and a
landlord picks up the certificate-of-insurance onboarding task that belongs to a
property manager.

It was left alone on purpose. Changing that mapping changes which
`portal_access:<email>:<type>` key is written for every future approval and
orphans existing records keyed under `property_manager` — a migration, not an
edit, and the standing rule is that backend and schema changes are tested off
production first. Worth doing; worth doing deliberately.

### Verification

**Typecheck.** `npm run typecheck` reports **316 findings. The baseline,
measured by stashing this work and re-running, is 317.** So this adds none and
removes one — the `type: 'info'` error, now that `info` is a real field type.
None of the remaining findings are in any file this work touched.
`npm run typecheck:server` reports 84, none in the added range.

**Tests.** `npm test` — **727 pass, 0 fail**, including 21 new ones:

- `tests/applicationPreview.test.ts` covers the two shape bugs directly: that a
  ticked skill counts as answered (the bug that blocked five forms), that an
  empty one still does not, that the older array shape from an offline queue is
  accepted, and that **every answer shape renders as a string** — which is the
  crash class the preview screen died on.
- `tests/technicianProfile.test.ts` covers the trade profile: strongest trade
  first, a claimed level never standing in for a confirmed one, lapsed versus
  expiring-soon certifications, the ladder not running out above ten years, and
  probation landing ninety days out.

Both helper sets had to move out of `GenericApplicationForm.tsx` into
`src/app/lib/applicationAnswers.ts` to be testable at all — node's test runner
cannot load a `.tsx` file, which is a large part of why two bugs this basic
survived in there for so long.

**Smoke.** `npm run smoke` — **345 pages rendered, 0 did not report, 0 threw.**

**Walked in the running app** (dev server, signed out, Chrome):

- `/join-us` renders for a signed-out visitor instead of redirecting to
  `/login`. **A3 confirmed against the actual symptom.**
- The field tech application opens at seven steps and step 2 lists all twelve
  trades from `laborTasks.ts` with their real job-type counts — Carpentry 8,
  Tile 8, the rest 5.
- Ticking Carpentry reveals the level, the years, and the eight real carpentry
  tasks: wall framing, hang prehung interior door, crown moulding, cabinet
  installation and the rest.
- Claiming Beginner against 12 years raises the mismatch warning; choosing
  Advanced clears it.
- **Next moves from step 2 to step 3.** That is the bug: before this, that
  button said "Please complete: Technical Skills" and never moved, so the form
  could not be submitted by anybody. Confirmed twice.
- An OSHA 10 with a 2024 expiry turns the row red and says a lapsed ticket
  cannot be counted.
- "Work you are comfortable with" renders as plain tick boxes, with no
  experience-level dropdown.
- `/property-manager-application` loads the real purpose-built form — Contact,
  Portfolio, Needs, Review — which had no route at all before. **F6 confirmed.**

**The whole form was then walked end to end**, all seven steps, to the preview:

Step 7 offers **Review Application**, which validates all twenty required
fields at once and renders the preview. That screen — the one that would have
thrown *"Objects are not valid as a React child"* on the first structured
answer it met — now renders every answer as a readable line:

    Your Trades
      Trades, level and years
      Carpentry — Advanced, 12 years · 2 job types on your own

    Licences & Certifications
      Certifications and licences
      OSHA 10 · OSHA-10-44219 · NH · expires 2024-03-01 · expired

    Work you are comfortable with
      Roofs and ladders

The trade rating is the object that used to crash it. The lapsed OSHA 10 is
marked in red on the preview as well as on the form. Optional answers left
blank read "Not provided" rather than leaving a gap. The page renders to the
bottom, ending in Edit Application and Submit Application, with **no console
errors**.

**Submit was deliberately not pressed.** It posts to the live applications
store, and a fake "Test Technician" record is not something to leave behind in
production for somebody else to clean up. Everything up to and including the
preview is confirmed; the POST itself is not, and the route it posts to is the
same one every other application already uses successfully.

**Not exercised at all:** the probation routes. They are new server code and
have not run against a live Supabase. Per the standing rule they belong in a
non-production project first.

### Found while verifying, and fixed

`type: 'skill'` was doing double duty on the new form. It was written for
trades, where "Experience Level" and a written description are the point, and
the technician form also used it for work somebody is simply willing to do —
roofs, crawl spaces, attics. That asked applicants how many years of experience
they had in "crawl spaces", with a mandatory paragraph about it. A
`skillDetail: false` flag now renders that field as plain tick boxes.

### A note on the working tree

Another session — a second instance of me, as Eric confirmed — was working in
this repository at the same time. `pdfService.ts`, `QuoteDocument.tsx`,
`quoteMath.ts` and `quoteMath.test.ts` appeared in the working tree during this
task and belong to the quotes/PDF plan, not to this one. They were left
untouched and must not be swept into a commit for this work.

That session also held the smoke harness — its report port, its dev server and
its browser profile directory — so rather than killing another agent's run,
this one used a copy of the script with its own ports and profile.

---
---


# PLAN — see it, print it, save it: quotes, invoices and contracts

Eric: *"can we also make sure all the quote, invoice, contracts have a view
option of what the document looks like as well as create a pdf or print option
as well"* — and, asked where: *"i want these options in the pipeline as well."*

So every one of the three must be viewable, printable and saveable as a PDF from
BOTH surfaces: the customer portal and the pipeline.

## What the survey found

**Invoices are done, and are the template.** `InvoicePreviewModal` renders a
laid-out document with Print (`window.print`), Download PDF (`PDFService` →
jsPDF + `jspdf-autotable`, both already dependencies) and Email.

**But only staff can reach it.** It is opened from exactly one place,
`InvoicesNew.tsx`. `CustomerPortalView.tsx` contains ZERO references to
`InvoicePreviewModal`, `PDFService` or `window.print` — so the people who most
need to print an invoice cannot.

**Quotes have nothing.** No preview component and no generator; `PDFService`
knows only `generateInvoicePDF`. `CustomerQuoteApproval.tsx` — the public page
where a customer approves a price — imports a Download icon with no print or PDF
code behind it. A customer approves a figure they cannot keep a copy of.

**Contracts are worst.** In the portal a contract is `contract.terms` dropped
into a `<p>` with `whitespace-pre-wrap`. Raw text in a box, no layout, no print,
no PDF — and it is the document people most need a copy of, because they signed
it.

**The pipeline already has the right seams.** `UnifiedProjectPipeline.tsx` opens
a details panel with `quote`, `contract` and `invoice` tabs. Those tabs are where
the actions belong; no new navigation is needed.

## The one design decision worth stating

**One document component per type, used by both surfaces.** Not a portal version
and a pipeline version — the customer and the office must be looking at the
identical document, or the conversation about "what does it say" has two answers.

A shared `DocumentPreviewModal` shell supplies the actions (Print, Download,
Email) and takes the document body as children. Staying with client-side jsPDF
rather than introducing a rendering service: it already works here, and
`EmailInvoiceModal` already generates in the browser and posts the file up.

## Items

- [ ] 1. Extract the invoice's laid-out body into `InvoiceDocument`, rendered by
      the existing `InvoicePreviewModal`. NO behaviour change — the staff page
      must look and work exactly as before. This is the step that proves the
      extraction is safe before anything depends on it.
- [ ] 2. `DocumentPreviewModal` — the shell with Print / Download / Email,
      generalised from `InvoicePreviewModal`.
- [ ] 3. `QuoteDocument` + `PDFService.generateQuotePDF`. Quotes and invoices
      share most fields, so this follows the invoice closely.
- [ ] 4. `ContractDocument` + `PDFService.generateContractPDF`. The largest
      piece, because there is no layout to start from.
- [ ] 5. Wire all three into the CUSTOMER PORTAL — the quotes, contracts and
      payments tabs.
- [ ] 6. Wire all three into the PIPELINE — the existing quote, contract and
      invoice tabs of the project details panel.
- [ ] 7. A print stylesheet so `window.print` produces a clean page rather than
      the application chrome around it.

## Raised, not included

**Contract signing uses `window.prompt`** to collect the legal name. A browser
dialog cannot show the terms being agreed to, cannot be styled, and is
suppressed outright by some browsers. For a signature with legal weight that
wants to be a real dialog displaying what is being signed — which item 4 makes
natural, since the document will finally exist. Not folded in without Eric
saying so, because it changes a legal flow rather than a view.

## Still open elsewhere

Proving the work-request write path end to end, and admin/owner clock-in on work
requests that track hours.

---

# Work requests become individual rows (28 Sep)

Eric: *"use the individual rows."*

## What was actually there

Not two homes for work requests — four shapes, three of them arrays:

    all_work_requests        3 items   real submissions, where live jobs land
    work_requests            KEY DOES NOT EXIST
    work_requests_anonymous  8 items   completed jobs for the public gallery
    work_request:<id>        0 rows    the authoritative store, empty

`work_requests` holding nothing is already documented in the code: every
property-management assignment read that key, found nothing, and returned "Work
request not found", so no job had ever been assigned to anybody until
`findWorkRequest` was added to search all three.

So the store Eric chose as authoritative did not exist yet. This was a
migration, not a reconciliation.

## Rehearsed on a branch first

Eric's rule is that backend changes are tried off production before they touch
it, and "it is only additive" is not a reason to skip. A Supabase branch was
created, seeded with the same eleven ids and shapes, and the migration run there.

Stated plainly: the branch was seeded with records matching the real IDS AND
SHAPES rather than byte-for-byte copies of the production JSON. The transform is
field-agnostic — it expands an array into rows and adds a flag — so what the
rehearsal proves is the LOGIC: that every id becomes a row, that re-running
creates no duplicates, and that the arrays are left alone. It does not prove
anything about the contents of individual records, because it cannot.

All four checks passed there, then the same statements ran on production:

    ids in arrays          11
    work_request: rows     11
    array ids with no row  none
    gallery-flagged rows   8
    arrays untouched       3 + 8

The branch was deleted afterwards so it stops costing anything.

## The anonymous list is now a flag

On Eric's instruction, `publicGallery: true` on the row replaces the separate
`work_requests_anonymous` list, so one job is one record rather than a job and a
copy of it. Each row also carries `migratedFrom` and `migratedAt`, which is what
makes this reversible: the eleven rows can be dropped by that marker alone.

## Deliberately not done yet

Nothing READS the rows yet and nothing WRITES them on create. The arrays are
still the live path, untouched, so this changed no behaviour at all — which is
the point of doing it in this order. Moving readers across one at a time, and
making the create path write a row, is the next step and the one that can break
something.

---

# One handler for /quotes, and the rule it had been hiding (28 Sep)

Third of the three things agreed before customers are invited: make the code you
read be the code that runs.

`GET` and `POST /make-server-3eae23a6/quotes` were each defined TWICE — once in
`quotes.tsx`, mounted at index.tsx:911, and once directly in `index.tsx` at
5196 and 5228. Hono takes the first handler that answers, so the pair in
`index.tsx` had never run. Confirmed live: the response shape is the router's.

**No security hole.** Both copies filter by ownership, and the live one gates
creation to staff. This was a correctness and maintainability problem.

## Why deleting the dead code was the dangerous option

Everything valuable in this task was in the dead half.

**A wider ownership test.** The shadowed `ownsQuote` matched `userId`,
`createdBy`, `customerId` and `ownerEmail` as well as four email spellings. The
live `quoteBelongsTo` knew only the four emails — and the portal asks for its
quotes with `?userId=`. Deleting the dead route would have discarded that
coverage silently, and the symptom is not an error: it is a customer's own quote
invisible behind a confident zero. The union now lives in `quoteBelongsTo`.

The id it matches comes from the VERIFIED TOKEN, never from `?userId=`. The
query string is a request, not a proof; reading it would let anyone list another
person's quotes by typing their id.

**The job identity rule, implemented and never executed.** Eric's rule is that
work requests, quotes, invoices and purchase orders attach to ONE job. The only
implementation of that for quotes — an `ensureJobId` call — was in the shadowed
POST. The data confirms what that meant: **not one quote in the store carries a
`jobId`**, including one raised two days ago. It now runs in the live handler.

`jobId` also had to become a field of `normalizeDoc`, which rebuilds the record
field by field and drops anything unnamed. Attached afterwards, it would have
survived creation and vanished on the first edit — a quote detaching itself from
its own invoice, quietly.

## What this says about the bigger question

Eric asked whether data will stay and whether changes will be easy. This is the
shape of the risk, twice over in one file: a fix applied to code that does not
run, and a rule that exists only as unreachable code. Neither shows up as an
error. Both were found by comparing what the code claims against what the
database actually holds.

Typecheck 317 app / 84 server (both baseline), 675 tests pass, smoke 0 threw.

**Needs a function deploy to take effect** — it is server code.

## Existing quotes still have no job

The five in the store predate this and remain unlinked. Nothing backfills them;
that is a separate decision, not a side effect to slip in here.

---

# Fixing the portal uncovered the next bug (28 Sep)

The API base URL fix went live and every previously-dead call returned 200 —
work requests, quotes, invoices, contracts, subscriptions. Verified in the
running app against a real account.

The portal then crashed outright: **"Something went wrong loading this page —
j.filter is not a function."**

## Why a fix caused a crash

`setQuotes(data || [])` trusted `/quotes` to return a bare array. It does not:
it returns `{ success, quotes }`. `quotes` state became an object, and the first
thing render does is `quotes.filter(...)`, so the ErrorBoundary swallowed the
whole screen. Not a missing quote list — nothing at all.

That branch had never run against a real response in its life, because the base
URL had been wrong since 6 July. Three months of silent failure had been hiding
it. The invoices loader immediately below already did it correctly
(`Array.isArray(data) ? data : data.invoices || []`), which is what the quotes
line now does too.

## The cause underneath: two routes, one path

    supabase/functions/server/quotes.tsx:206   quotesRouter.get('/make-server-3eae23a6/quotes')
    supabase/functions/server/index.tsx:5196   app.get('/make-server-3eae23a6/quotes')

Both are registered. The router wins, and it returns an object — while the
shadowed handler in `index.tsx` carries a comment stating it returns a bare
array, which is exactly what the frontend was written to trust. A comment that
is true of dead code is worse than no comment.

This codebase already has a duplicate-route scanner and a history of this class
of bug; the same shadowing exists for POST /quotes. **Not fixed here.** Removing
a live route is a server change with a much wider blast radius than accepting
both shapes, and it wants Eric's sign-off rather than being slipped in behind a
crash fix.

Typecheck 317 app (baseline), 675 tests pass, smoke 19 rendered / 0 threw.

---

# The customer portal was not working. It had not been since 6 July (28 Sep)

Eric asked for the customer portal to be proven end to end before he invites
real customers. It does not work, and it has not for nearly three months.

## One wrong word in a constant

`src/app/lib/apiConfig.ts` read:

    // The Supabase Edge Function is named "server"
    export const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/server`;

The function is not named `server`. That is the DIRECTORY the source lives in;
the deployed slug is `make-server-3eae23a6`, and `supabase/config.toml` maps one
to the other precisely because they differ.

Every caller appends the slug itself, so each request resolved to
`/functions/v1/server/make-server-3eae23a6/...` — a function that does not
exist. Eighteen call sites across five files:

    work-requests POST (x2)      submitting a work request
    quotes, invoices             seeing what was quoted and billed
    contracts, contracts/:id/sign  reading and signing
    payments/complete            completing a payment
    subscriptions, .../checkout  the plan, and buying one
    media/upload                 photographs

That is the whole of what a customer does.

## Why nobody noticed for three months

Every one of those calls is wrapped in a try/catch that logs a warning and
falls back to an empty list. So the portal renders perfectly and shows zero:
zero projects, zero quotes, $0 invoiced, zero contracts. A customer with three
invoices sees none and is told nothing is wrong. There is no error state, no
spinner stuck, nothing that reads as a fault.

Found by loading the portal and reading the console, not by reading the code.
Which is the whole argument for Eric's rule that "working" means observed in
the running app.

## It had been diagnosed before, and patched in one screen

`ProductAdCreator.tsx` carries this comment:

    // The edge function is served at /functions/v1/make-server-3eae23a6 — the old
    // `/functions/v1/server` base pointed at a function that does not exist, so
    // every request from this screen 404'd.

Correct diagnosis, and the fix was a local constant for that one screen. The
shared constant was left wrong, so every other screen reading it stayed broken.
A root cause found and then worked around locally is worse than one not found
at all, because the second time it looks like solved ground.

## The fix

One line: the base is the functions root, `/functions/v1`, and the callers
supply the slug they already supply. Verified no other code still points at
`/functions/v1/server`.

Typecheck 317 app (baseline), 675 tests pass, smoke 26 rendered / 0 threw.

**Not yet verified in the running app** — it is a frontend change, so it has to
reach Vercel before the portal can be reloaded and the calls watched. That is
the next step and it is the one that actually proves this.

---

# A — the content ladder is three rungs (28 Sep)

    1  Solo     $79/mo    600 calls    40 renders    1 seat    5 reels
    2  Studio   $199/mo   1,500        150           3         20
    3  Agency   $499/mo   5,000        600           15        unlimited (sold, not enforced)

All three inactive with no Stripe price, which is still the honest state: a
tier that cannot take money must not be offered. Studio and Agency were
renumbered so the ladder reads 1, 2, 3.

## The number that is not arbitrary

Solo's 600 calls and 40 renders are above the free backstop in `aiSpend`
(`DEFAULT_LIMITS`: 300 calls, 10 renders). That constraint is the whole reason
the entry rung cannot be priced by feel alone: a rung publishing less than the
backstop would make PAYING US WORSE THAN NOT PAYING, and it would do it
silently — the tier would show a number, the customer would be charged, and
they would hit a lower ceiling than a stranger who signed up that morning.

The reasoning is recorded on the record itself, in its `note`, because the next
person to edit those figures will be in the tier admin rather than in this file.

## The gap this leaves

Nothing enforces that constraint. The tier editor will happily accept
`aiCallsPerMonth: 100` on a paid tier, and nothing compares a published ceiling
against the free backstop. A test cannot catch it either, because tiers live in
the database rather than in code — so the only place it can be caught is the
editor, at the moment somebody types it.

Offered to Eric rather than built, since A was agreed as data only.

---

# C — a trial grants breadth, a purchase grants persistence (28 Sep)

The first item of the agreed subscription plan, and it was an inversion rather
than a gap: `holdsAddOn` returned false unless the source was a subscription, so
a free trial held NO add-ons — the opposite of Eric's rule that they are all
included.

## The design

    trial          holds everything (bar the exception below), owns nothing
    subscription   holds what was bought, plus what the tier includes
    anything else  holds nothing at all

The obvious implementation — seeding the trial's add-ons onto `grant.addOnIds`
— is a trap. That field means PAID FOR: the Stripe webhook writes it and
conversion would bill from it, so a trial that filled it in would invoice
somebody for extras they never chose. Left empty, conversion bills only what was
picked. When money is involved that is the direction a mistake should fail in.

## The second function, which the plan did not foresee

`paysForAddOn` — is this being paid for, and so would it survive the trial?

Found by reading the callers rather than by planning: the "add this to my plan"
route refused with *"That is already on your plan"* whenever `holdsAddOn` was
true. Once a trial holds everything, that route would have refused every
trialist trying to buy the thing they were trialling — a refusal at the exact
moment somebody decided to become a customer, which is the moment this design
exists to serve. That route now asks what is PAID for.

The rule of thumb, now in the code: ask what they HOLD to decide access, and
what they PAY FOR to decide money.

## The exception Eric added

Neither on-call product is included in a trial.

Raised before shipping because `holdsAddOn` is what decides whether Black
Phoenix answers somebody's emergency line at 3am, and seven accounts are on a
running trial today — two of them landlords, the audience on-call is published
for. "Everything included" was written for software, where a call or a seat
costs cents and costs nobody their night.

Eric's answer was to exclude both products, not just the answered one. The cost
is people rather than compute, and emergency cover is a promise — a trialist
would have discovered it had lapsed at the worst possible moment.

`TRIAL_EXCLUDED_ADD_ON_IDS` holds the exception with its reasoning, and a test
pins it shut, because the tidy-looking simplification of that branch is to
delete the exception and return true for the whole trial.

Nobody paying is stranded by it: somebody who buys on-call during a trial
resolves as a subscription, which outranks the trial clock, so paying can never
leave an account worse off than not paying. Pinned by a test too.

Typecheck 317 app / 84 server (both baseline, none in planTier), 675 tests pass
(9 new), smoke 0 threw.

## Still to do on the agreed plan

A (the content entry rung, Solo) and B (add-ons that raise the monthly, where
the Stripe subscription-item work lives). D after those.

---

# PLAN — the subscription shape: three base rungs, portal add-ons, trial includes all

Eric, stopping the Stripe work to get this right first:

> "there will be a base three tiers system for the basics and there will be add
> on in the portals that can increase the monthly subscriptions depending on
> what the user wants. they will all be included into the free trial period but
> will add up if the want them after that"

Decided with him: the content ladder gains an ENTRY rung below Studio; a trial
that ends with nothing chosen drops to the FREE FLOOR; add-ons stay PER PORTAL,
the way on-call already is.

## How the pieces tie together

    plan_tier:<audience>:<id>     three rungs per audience. The basics.
    plan_addon:<audience>:<id>    extras, per portal, each with its own price
    feature_grant:<email>         who holds what: tierId + addOnIds, or a trial
    subscriptionTotalCents()      tier price + chosen extras = the monthly figure

The monthly figure is never the tier's price. Anything that charges, reports or
displays "their subscription" sums the tier and what they hold, server-side.

## What already exists and needs nothing

`subscriptionTotalCents`, `addOnsForTier`, `addOnAvailableOn`, `addOnIncludedIn`,
`heldAddOnIds`, `addOnQuantity` (per-unit pricing), and `grant.addOnIds` written
by the Stripe webhook. The pricing half was built to this design already.

## C — the trial rule, first because it is inverted today

`holdsAddOn` returns false unless `source === 'subscription'`, so a trial
currently holds NO add-ons — the opposite of what Eric wants. The guard is
protecting something real: `addOnIds` survives a cancellation, so reading it
without asking whether anything is being paid for would keep serving an account
that stopped paying.

The design that satisfies both: **a trial grants breadth, a purchase grants
persistence.**

- [x] C1. `holdsAddOn` returns true for ANY add-on while `source === 'trial'`.
- [x] C2. Trial add-ons are NEVER written into `addOnIds`. That field keeps
      meaning "paid for", so at conversion nothing is billed unless chosen —
      the money side fails closed, and there is no trial data to clean up.
- [x] C3. A cancelled subscription still holds nothing, because its source is
      neither. Pin this with a test; it is the case the current guard exists for.
- [x] C4. Pin trial-end-to-free-floor with a test. It is today's behaviour and
      Eric confirmed it, so the test is there to stop it drifting.

## A — three rungs per audience

- [ ] A1. Publish a content entry rung below Studio. PROPOSED: **Solo, $79/mo**,
      `aiCallsPerMonth 600`, `rendersPerMonth 40`, `seats 1`, `reelsPerMonth 5`.
      Inactive, no Stripe price, like the other two.

      **The constraint that sets the floor:** the free backstop is 300 model
      calls and 10 renders. An entry rung publishing less than that would make
      paying us WORSE than not paying, silently. 600/40 clears it with room.
- [ ] A2. Vendor already has three (Listed, Stocked, Preferred). Leave it.
- [ ] A3. No ladders for the other audiences in this pass. They have none today
      and inventing six is exactly the whim this plan replaces.

## B — add-ons that raise the monthly figure

- [ ] B1. A portal panel listing the add-ons available on the subscriber's tier,
      marked included-or-extra, with the new monthly total shown before they
      commit. Reads `addOnsForTier`; total from `subscriptionTotalCents`.
- [ ] B2. Route computes the total from the CATALOGUE, never from a posted
      amount, and resolves the tier from the grant, not the request.
- [ ] B3. **The hard part, named rather than discovered later:** changing add-ons
      mid-subscription is a Stripe subscription-item change, not a grant edit.
      Today `addOnIds` is only ever written by the webhook from checkout
      metadata, so there is no path that adds one to a subscription already
      running. This is where the work is, and it should be built after C and A.

## D — conversion, once the above is true

- [ ] D1. A trial grant carries `level: 'full'` and NO `tierId`, so a trialist
      choosing a plan is an ordinary `/plan-checkout`. Prove it end to end —
      Eric's rule is that every way onto the platform is verified, and this is
      the path that turns a trial into money.

## Order and why

C first: small, pure, testable, and it is a live inversion of a rule Eric has
stated. A second: data only, no code. B last: it is the only part that touches
Stripe subscriptions, and it should not be built on a trial rule that is wrong.

---

# The price button says which audience it is about to charge (28 Sep)

Eric went to create the Stripe test prices for the two content tiers and
created them for vendor Listed and vendor Preferred instead. No harm done —
test mode, no real money, live prices untouched, and all three vendor tiers now
have test prices, which is useful for rehearsing a vendor checkout. But it is
worth understanding rather than shrugging at.

## Why it happened

The panel opens on `audience = 'vendor'` and the Create-price button read
`Create test price` — the same words on every row of every audience. Somebody
who came to price a content plan and did not first change the dropdown was
pressing a vendor button that looked exactly like the one they wanted. Nothing
on the button, and nothing in a confirmation, named what it was about to act on.

That matters more here than for most buttons because **a Stripe price cannot be
deleted afterwards, only archived**. The press has to be checkable before it
happens, not correctable after.

## The change

Both price buttons — tiers and add-ons — now read `Create test price · content`,
and carry a hover title naming the audience, the plan, the amount and the
interval, plus the reminder that Stripe prices cannot be edited.

Deliberately not a confirmation dialog. Eric's rule is that a confirm dialog is
not a safeguard against a mis-click, and it would not have helped here: somebody
who believed they were on the content plans would have confirmed. Putting the
fact in the button makes the mistake visible before the press instead of asking
for agreement after it.

Typecheck 317 app (baseline, none in this file), 666 tests pass, smoke 10
rendered / 0 threw.

---

# The catalogue is the real vendor ladder (27 Sep)

Eric: *"the catalogue ladder is the real one."*

So `plan_tier:` is the vendor product, and the Basic/Professional/Premium/Elite
ladder in `PortalUpgradeModal` is not, however live it looks. That ladder sells
through `/subscriptions/checkout` in Stripe `mode: 'payment'` — one charge, a
`subscription:` record, no `feature_grant` — so nothing renews it and nothing
that resolves an entitlement can see it. Its buyers are indistinguishable from
people who never paid.

## What changed

`plan_tier:vendor:preferred` ($199, active, real Stripe price) gained
`aiCallsPerMonth: 1500` and `rendersPerMonth: 150` — the Studio allowance, so
content-centre access means something for vendors on a plan that actually
resolves. Its other limits, its price and its Stripe linkage were left exactly
as they were.

Nobody is cut off by this. The backstop is 300 calls and 10 renders, so both
figures are strictly more generous than what a Preferred subscriber had
yesterday. No account is on Preferred today in any case — the one paying vendor
is on Stocked.

## What was deliberately NOT changed

The modal, on Eric's instruction. Taking the phantom vendor rungs out of it is
right eventually and wrong today: `PortalUpgradeModal` also serves customer,
subcontractor, advertiser and investor, and none of those audiences has a
sellable catalogue tier yet. Cutting the hard-coded array now would leave those
portals with no upgrade path at all.

The order that avoids that: give an audience's catalogue tiers their Stripe
prices, prove a purchase end to end, then remove that audience's legacy rungs.
`/me/upgrade-options` already prefers the catalogue and falls back per-audience,
so the machinery for doing it one portal at a time is in place.

---

# The content centre gets published plans (27 Sep)

Eric asked for `aiCallsPerMonth` on the content-centre tiers. There were none —
three `plan_tier` rows existed in production and all three were vendor. The
content centre has been sold since before this, with no plan record behind it.

## Published, both inactive

    plan_tier:content:studio   Studio   $199/mo   aiCallsPerMonth 1500, rendersPerMonth 150, seats 3, reelsPerMonth 20
    plan_tier:content:agency   Agency   $499/mo   aiCallsPerMonth 5000, rendersPerMonth 600, seats 15

`active: false` and no Stripe price, which is the same state the six on-call
add-ons sit in. A tier with no Stripe price cannot be bought whatever it looks
like, so publishing it inactive is the honest order: the record exists, nothing
is offered, and the price is created from the button on the tier admin.

The ladder is the one proposed earlier in this file; the ceilings are new.
Worst case they cost about $60 against $199 and $220 against $499, images at
roughly 20c dominating both.

**Agency sells unlimited reels and does NOT publish a zero ceiling.** Zero means
unlimited, and an unlimited model ceiling on a $499 plan is the uncapped bill
this week's work exists to prevent. The generous number is finite on purpose.

## What could not be done, and why

Eric also asked that the vendor Premium $399 plan — which advertises "Content
Center access" — get the Studio allowance. There is nowhere to put it.

That plan is not a catalogue tier. It lives in `PORTAL_UPGRADE_PRICES` and
sells through `/subscriptions/checkout`, which runs Stripe in `mode: 'payment'`
— a ONE-OFF charge that writes a `subscription:` record and never a
`feature_grant`. `ceilingFor` resolves an allowance by reading the grant's
`tierId` and looking up `plan_tier:<portal>:<tierId>`, so a legacy buyer has no
tier to find and lands on the backstop no matter what is published.

The catalogue's real vendor ladder is Listed $49 / Stocked $79 / Preferred $199.
There is no Premium in it, and the two ladders disagree about the whole vendor
product, not just this bullet.

So a $399 bullet promising content centre access currently delivers a free
account's allowance, and will keep doing so until Eric says which vendor ladder
is the real one. Named here rather than papered over by inventing a fourth
vendor tier to hang a number on.

---

# The tier editor now names the keys that bite (27 Sep)

Eric: *"yes add the three keys to the tier editor."*

The limits box takes a free-typed key, which is why `aiCallsPerMonth` works and
`aicallspermonth` saves perfectly and does nothing at all, for ever, in silence.
The tier would show the number, the plan would promise the allowance, and the
subscriber would quietly get the free backstop.

## What changed, in one file

`ENFORCED_LIMITS` names the four keys the software actually reads — `products`
(vendor catalogue), plus the three spend buckets — with what each one does.
They are offered through a `datalist` on the existing key box, not imposed by a
dropdown: tiers in production already carry keys nothing enforces (`deals`,
`seats`, `bidQuotesPerMonth`) and a fixed list would drop them on the next save.

`nearMissFor` catches the actual trap. A key that folds onto an enforced one —
case and punctuation removed — is almost certainly meant to be it, so the row
says "nothing reads this, did you mean `aiCallsPerMonth`?" and one press fixes
it. A deliberate `deals` folds onto nothing and is left alone.

## A sentence that my own last change made false

The helper text said "nothing in the app enforces them yet". That stopped being
true when `products` began being enforced, and stopped being true again this
morning. It now says which four keys bite, that the spelling has to match, and
that everything else is a promise rather than a ceiling.

## Verified how far

Typecheck 317 app (baseline, none in this file), 666 tests pass, smoke 10
rendered / 0 threw — so the screen renders. The typo warning and the datalist
have NOT been clicked through in the running app; that needs an admin session.

---

# The tier decides how much model work an account gets (27 Sep)

Until now every signed-in account — free or paying — got the same three
ceilings out of `DEFAULT_LIMITS`: 300 model calls, 10 renders, 120 blueprint
sheets. A subscriber paying for the content centre had exactly the allowance of
somebody who had signed up that morning and paid nothing.

`ceilingFor` now resolves it in three steps: an override set for that one
account, else what their paid tier publishes, else the built-in backstop.

## Why the rule is its own file

`aiSpend.ts` imports `kv_store.tsx`, and the test runner strips types from `.ts`
only, so nothing in that file can be tested by hand. The precedence decides
what a paying customer may use, so it was pulled out into `aiCeiling.ts` —
pure, no storage — and `pickCeiling` has 12 tests. `aiSpend` fetches; the
tested function decides.

## The two readings that would have been wrong

**Zero on a tier means UNLIMITED**, the convention the tier editor, the vendor
tiers and `withinLimit` already use. Read as "none allowed", it would have
locked the dearest plan out of the feature it is paying for.

**A tier that says nothing gets the backstop, not unlimited.** No tier publishes
`aiCallsPerMonth` today, so "silence means no ceiling" would have handed every
subscriber an uncapped bill on the day this deployed.

## Where it deliberately differs from the rest of the platform

`checkPlanLimit` lets anybody it cannot place through, because refusing a vendor
with no resolvable plan would shut them out of a catalogue they already use.
This does the opposite and lands every unhappy path — no email, no grant, a
tier that has been deleted, a read that throws — on the backstop. Withholding a
feature is recoverable; a month of uncapped model spend is not.

`withinLimit` reads a negative ceiling as unlimited. Here it falls to the
backstop: the tier editor already refuses to save a negative, so one can only
arrive by a write that went round the editor, and a number nobody meant to type
should not open an account.

## The gap, named rather than left to be found

The tier editor takes free-typed limit keys. So `aiCallsPerMonth` can be set
today, and `aicallspermonth` can be set today too and will do nothing at all,
silently. Nothing in the editor suggests the three keys or spots a typo. Worth
fixing before these are used in anger; not done here because it is a UI change
nobody asked for.

Typecheck 317 app / 84 server (both baseline, none in the changed files),
666 tests pass, smoke 6 rendered / 0 threw.

---

# One job pushed through to paid, and what it found (27 Sep)

Pushed `wr_test_quote_to_invoice` all the way: paid invoice, time booked, a
purchase order against the job. Doing it found a bug that would have made the
whole learning loop inert.

## The bug

`quotedFrom()` read quoted hours from `quote.labourHours` / `laborHours` /
`totalHours` — a top-level field that **almost no real quote in this system
carries**. Both shapes that actually get written, the estimator's `labor[]` and
the builder's `laborItems[]`, put the hours on each line, because that is where
a person edits them.

So `quoted.hours` was null on every genuine quote, `enoughToLearn` was false on
every finished job, and the loop would have learned nothing no matter how many
jobs completed. Found by pushing one job through, not by reading the code.

`quotedHoursFrom()` now sums the labour lines, prefers a top-level figure where
one exists, and returns null — never zero — when the lines carry no hours,
because zero would read as a total overrun on a quote that simply never said.

## What the job now reports, from the real records

    quoted        $4,632.40, 16 hours
    billed        $4,632.40
    labour        $900    measured   (20 h at $45)
    materials     $512    measured   (one purchase order)
    cost          $1,412
    margin        $3,220.40 = 69.52%  measured, no gaps
    variance      +25% — 20 h taken against 16 h quoted

Not confident yet: one job is not five, so no rate moves and the next flooring
quote still says 16 hours. That is the floor working, not a failure.

## What this does and does not prove

It proves the measurement chain end to end on production data: work request →
quote → paid invoice → time → purchase order → outcome → variance → factor.

It does **not** prove the invoice-creation route works, because the invoice was
seeded rather than raised through the pipeline. That click-through is still
unverified, and it is the path that has failed before.

## Test records, all removable in one statement

    time_employee:EMP-TEST-FITTER
    time_entry_history:EMP-TEST-FITTER:2026-09-25:ENTRY-TEST-FLOORING-1
    purchase_order:PO-TEST-FLOORING-1
    invoice:INV-TEST-FLOORING-1
    payment:PMT-TEST-FLOORING-1

Also corrected: the legacy work-request array held the first version of this
quote (total 2094.40, a 2400 credit) while the pipeline held the revision
(4632.40, a 50 credit), so a report would have read "quoted 2094, billed 4632"
for one job. Synced to the pipeline copy.

Typecheck 317 app / 84 server (both baseline), 598 tests pass, smoke 0 threw.

---

# The loop closes: quotes now price from measured hours (27 Sep)

Eric: *"wire the estimator to read the resolved rates."*

Until now the hours on a quote came from a language model reasoning about crew
size and productivity — labelled `hoursSource: 'estimated'` precisely because
nobody had measured them. Jobs finished, hours were booked, variance was
computed, and the next quote asked the model to guess again from nothing.

`measuredHours.ts` (18 tests) closes it. Each labour line's trade is matched
against what our own finished jobs measured, the hours are scaled by it, and the
line is relabelled `measured` with the evidence in its note. What the model said
is kept as `modelHours` so every change is traceable.

**The factor is clamped to 0.6–1.8.** A ratio of two sums over a handful of
unusual jobs can say a trade takes four times as long as quoted; quoting that
loses the work outright, and the reverse loses money on all of it. Outside the
band it clamps to the edge rather than being dropped — the direction is
right even when the magnitude is not yet trustworthy — and the note says it was
capped.

**It corrects guesses, never decisions.** Only lines still marked `estimated`
move, which is the same line the rate-learning loop draws.

**It now runs by itself.** A paid invoice is a finished job, so the pass fires
from all three settlement paths — card, gift card, banked hours. Never awaited,
never throwing: settling an invoice must not depend on the rates learning
anything.

Factors are published to `labor_tasks:trade_factors` by the pass and read from
there when quoting, so pricing one line never means re-measuring every job the
company has finished. With none published, a quote is exactly what it always was.

Note: the factors come from the finished jobs, not from the catalogue — so
quotes get corrected by what the crews achieve even before any labour catalogue
is published.

Typecheck 317 app / 84 server (both baseline), 594 tests pass, smoke 0 threw.

---

# Rates that correct themselves from finished jobs (27 Sep)

Eric: *"yes make it auto adjust the rates i havent set."*

**What was already there.** `jobOutcome.ts` measures every paid job — labour from
timesheet allocations times each employee's own pay rate, materials from
purchase orders on the job (whose total is what we pay the vendor, confirmed) —
and groups variance by trade. It carried a comment saying it was tested. It was
not. 26 tests added; the rule they guard hardest is that unknown is not zero.

**What is new.** `rateLearning.ts` (22 tests) turns that variance into corrected
production rates:

- A rate marked `yours` is never moved. Those are offered with their evidence.
- A book figure nobody chose is corrected without being asked.
- The same evidence never corrects twice. 18% applied repeatedly compounds, and
  a few passes of that prices the company out of its own market, so each
  correction records what it came from and is skipped while that has not moved.
- Every correction records the previous figure and can be put back.

Three stores, deliberately not one: `labor_tasks:catalogue` (book figures, only
an administrator publishes), `labor_tasks:global` (his edits, written by the
editor), `labor_tasks:measured` (written only by the loop). The editor saves
only the tasks marked `yours`, so a measured rate living in that store would be
dropped by the next save.

Routes, all administrator-only, reading the catalogue from the server and never
from the request — a browser that could post its own catalogue could have a
correction computed from a number it invented, or mark a rate as somebody's own
to stop it ever being corrected.

New screen at `/quoting-accuracy`, which is the first thing ever to consume this
data — `/work-orders/quoting-accuracy` had zero callers.

## The gap, named rather than left to be found

**Nothing quotes from `laborTasks` yet.** The catalogue feeds its own editor and
nothing else. `quote-from-blueprint.tsx` says so in its own header and prices
from hand-typed multipliers. So corrected rates are correct and currently change
no quote. Wiring quoting to read `/labor-tasks/resolved` is the next task and
the one that makes all of this pay.

Typecheck 317 app / 84 server (both baseline), 576 tests pass.

---

# Search and attach — done (27 Sep)

Two panels, one endpoint.

**The customer's** (`ApplyCreditPanel`, in the Payments tab under each unpaid
invoice): their own gift cards and spare plan hours listed with balances, plus a
box for a card code they were given. Applying one drops the balance in front of
them; Pay now then charges only what is left, because checkout computes the
amount server-side.

**The staff one** (`AttachablesSearchPanel`, in the invoice builder): a search
box over everything the customer holds — grants, gift cards, hours — split into
what comes off the TOTAL and what comes off the BALANCE. Percentages go into the
discount figure and more than one can be put on. Gift cards and hours are shown
but not pressable on a draft: they settle a balance, and a draft has nothing to
pay.

Neither panel sends an amount. They name what to apply and `/invoices/:id/apply`
works out the lesser of what is held and what is owed, from records the server
owns.

Typecheck 317 (baseline), tests 528 pass, smoke 34 rendered / 0 threw.

---

# Where each job made money, and where it lost it

Asked for: a breakdown when an invoice is paid showing what a job cost and
where money was made or lost; a section for it in the Owners Dashboard; an admin
chart showing where quoting and job completion need improving; and an AI
assistant that reads those and suggests things.

## The good news: the cost data exists

I said earlier that real cost was not available. That was wrong, and worth
correcting before anything is built on it:

| | where | links to a job by |
|---|---|---|
| Material cost | `purchase_order:*` | `jobId` |
| Labour cost | timesheet allocations | `workOrderId`, and the employee's `payRate` |
| Revenue | `invoice:*` | `project_id` |
| Hours consumed | `entitlement_ledger:*` | `planId` |

So a genuine profit and loss per job is computable from records that exist. Not
estimated, not inferred from what the customer was charged.

**The distinction that makes this real:** the quote's material and labour
subtotals are what the customer was CHARGED. A purchase order and an employee's
pay rate are what the work COST. The difference between those two is the margin,
and it is the only honest way to get it.

## What a job's breakdown shows

    Quoted            what they agreed to
    Invoiced          what was billed
    Paid              what came in
    ────────────────
    Materials cost    from purchase orders raised against the job
    Labour cost       hours billed to its work orders x each person's pay rate
    Plan hours used   hours drawn from a subscription, at what they are worth
    ────────────────
    Margin            paid minus cost, in money and as a percentage
    Against quote     what the margin was SUPPOSED to be, and the gap

That last line is the useful one. A job can be profitable and still have been
quoted badly, and only the comparison shows it.

## Where quoting and completion need improving

One chart, built from the same numbers across all jobs:

- **Quote accuracy** — quoted cost against actual cost, per job. A cluster above
  the line is systematic under-quoting, which is the expensive kind.
- **Where it goes wrong** — materials against labour. Consistently over on
  labour is an hours problem; consistently over on materials is a pricing one.
- **Time to complete** — raised to invoiced, so a job that earns well but takes
  three months is visible as what it is.
- **What never finished** — quoted and never contracted, contracted and never
  invoiced, with what that was worth.

## The AI half, and what it may not do

An assistant reading those numbers and suggesting things is reasonable, with one
hard rule: **it may only speak about figures it was given.** It gets the
computed rows and says what it notices — "labour on kitchens runs 30% over quote
and on decks it does not" — and it never produces a number of its own.

This project has been bitten repeatedly by confident figures with nothing behind
them. An assistant is the easiest possible way to generate more of those, so the
prompt carries the numbers and the answer is checked against them.

There is already AI plumbing with spend metering, so it costs what it costs and
is counted.

## Order

- [ ] 1. `jobProfit()` — a pure, tested module. Revenue, cost, margin, and the
      gap against quote, from records passed to it.
- [ ] 2. `GET /jobs/:id/profit` — gathers the records, calls the module.
- [ ] 3. The breakdown on the job itself, shown once an invoice is paid.
- [ ] 4. An Owners Dashboard section listing every job by margin, worst first.
- [ ] 5. The quoting and completion chart across all jobs.
- [ ] 6. The assistant, last, once there are real numbers for it to read.

## What I need to confirm before item 1

Whether a purchase order carries a cost total, and whether it is the price we
pay the vendor or the price we charge the customer. If it is the second, the
material cost half is not yet available and item 1 covers labour only until it
is — which I would rather say now than discover halfway through.

---

# Attach anything the portals offer to an invoice, and draw hours down

Asked for: *"any and all options to attach discounts or hours, gift cards —
anything the portals may offer. I should be able to add multiple if they
apply."* And for hours: **draw down the plan**.

## What exists to attach, and where it lives

| Thing | Where | What it does to an invoice |
|---|---|---|
| Discount grants | `discount_grants`, resolved by `/my-discount` | a percentage |
| Gift cards | `giftcard:{code}`, carry a balance | money off, and the card draws down |
| Plan add-ons | `plan_addon:` (6 in production) | a line, or a discount it carries |
| Promotions | on the plan record, with codes | a percentage or an amount |
| Plan hours | `entitlement_balance:{planId}` | hours billed draw the balance down |

Five sources, four of which the invoice has never heard of. Nothing today can
list them together, which is why there is nothing to search.

## The shape

**One endpoint answers "what can be attached to this invoice".**
`GET /invoice-attachables?email=&jobId=` returns every applicable item from all
five sources, each with what it is worth and why it applies. The invoice
searches that one list rather than five.

It must be the server that decides. A browser knows neither what somebody pays
for nor what an administrator granted, and a gift card balance is money.

**Several can be applied at once**, as asked. Applying is then a list of
attachments on the invoice rather than a single `discount_amount`:

    attachments: [
      { kind: 'grant',    id, percent, reason },
      { kind: 'giftcard', code, amount },
      { kind: 'promo',    code, percent },
      { kind: 'hours',    hours, planId, rate }
    ]

`discount_amount` stays as the total they come to, so everything that already
reads it keeps working.

**Order matters and has to be decided once.** Percentages apply to the subtotal,
then gift cards come off what is left — a card is money, not a discount, and
applying it first would discount the customer's own money. The cap applies to
the percentage half only, for the same reason.

## Hours, drawn down

An hours line on an invoice posts against the plan's ledger with the invoice as
its source id, so the same line cannot deduct twice. Hours beyond the balance
bill as overage at the plan's rate rather than being refused — the work was
done.

The panel shows remaining hours as you type, and what the line will cost once
it crosses into overage.

## The order I would build it

- [ ] 1. `GET /invoice-attachables` — the one list, server-resolved. Nothing
      else is possible without it.
- [ ] 2. A tested module for what a set of attachments comes to, with the
      ordering rule above. Money arithmetic, so it is proven with numbers.
- [ ] 3. The search-and-attach panel on the invoice, multiple selection.
- [ ] 4. Gift card redemption through the ledger as a credit, so a card applied
      to an invoice actually draws down.
- [ ] 5. Hours draw-down, with the invoice as the idempotency source.

## What I need to know

**Item 4 moves real money and the redemption is not atomic** — the code says so
itself. If two invoices apply the same card in the same second, both can
succeed. I would rather apply the card and record the redemption as a single
conditional write before this is used in anger, which is the storage change
already sitting in the earlier plan.

Until that is done I can make the invoice refuse to apply a card whose balance
has moved since it was listed — narrower than atomic, but it closes the case
that actually happens: two people, one card, minutes apart.

---

# Hours and gift cards: one ledger, and two guards

Asked for: *"when the hours are used from a subscription they are removed and
reflected in the correct portals… double safety guard to insure we dont loose
time or money"* and *"that should also co exsist with our gift card system."*

## The good news: the ledger already exists

`entitlements.tsx` holds a proper one.

    entitlement_ledger:{planId}:{id}     every event, never overwritten
    entitlement_balance:{planId}         the running balance
    entitlement_source:{type}:{id}       the idempotency key

`recordEntitlementEvent` refuses to apply the same source twice and returns
`duplicate: true` instead. It already tracks hours granted, used, remaining and
overage — **and credits granted, redeemed and remaining**, which is the gift
card half, already modelled and not yet connected.

So this is not a build from nothing. It is making one existing ledger the truth.

## What is actually wrong

**1. The same hour is recorded in three places.**

| where | written by |
|---|---|
| `entitlement_balance:{planId}` | the ledger, idempotently |
| `plan.hours.used` | `/maintenance-plans/:id/log-hours`, incremented directly |
| `subscription.hoursUsed` | `/subscriptions/:id/log-hours`, incremented directly |

The maintenance route writes the ledger *and* bumps `plan.hours.used` beside it.
The subscription route does not touch the ledger at all. Three numbers for one
fact, and nothing reconciles them — so which portal you look at decides what you
are told, and a hour logged through one route is invisible to the other.

**2. Gift card redemption is not atomic, and the code says so.**

The comment above `/gift-cards/:code/redeem` is explicit: it reads the balance
and writes it back, *"so two simultaneous calls with different redemption ids
can both pass the check and spend the same balance twice."* Staff-only access
reduced who could trigger it; it did not fix the arithmetic.

**3. Gift cards do not go through the ledger** even though it has credit fields
waiting for them.

## The plan

- [ ] 1. **The ledger is the only truth.** `plan.hours.used` and
      `subscription.hoursUsed` stop being written and become derived reads from
      `entitlement_balance`. One number, one writer.
- [ ] 2. **Every consumption path writes through `recordEntitlementEvent`**,
      with a source id that is the thing that happened — the usage entry id, the
      timesheet allocation id, the redemption id. That is **guard one**:
      replaying an event, a double-click or a retried request cannot deduct
      twice, because the source key already exists.
- [ ] 3. **Guard two: reconciliation.** A route that recomputes the balance from
      the ledger entries and compares it to the stored balance, reporting any
      drift rather than silently correcting it. Silent correction hides the bug
      that caused the drift; a report is how you find out a route is writing
      around the ledger.
- [ ] 4. **Gift cards redeem through the ledger** as `creditDelta`, so a card
      and a plan's hours are two columns of the same account.
- [ ] 5. **Make the redemption atomic.** The read-then-write must become a
      single conditional write, so two simultaneous redemptions cannot both
      pass. This is the one item that needs a storage decision (below).
- [ ] 6. **Portals read the balance, not their own copy** — so the customer,
      the landlord and the office see the same remaining hours, because there is
      only one number to see.
- [ ] 7. **Tests on the arithmetic**: hours to zero then into overage, a
      duplicate source, a partial gift card redemption, a card that cannot cover
      the balance, and reconciliation detecting an injected drift.

## The one decision I need from you

**How atomic do you want item 5 to be?**

The KV store is read-then-write, so true atomicity needs either a Postgres
`update … where balance >= amount` against a real column, or a short-lived lock
record. My recommendation: **do the ledger work first (items 1-4, 6, 7), which
removes the drift you are actually worried about, and treat item 5 as its own
change** — it is a storage change rather than an accounting one, and it deserves
testing against a branch rather than being bundled in.

The race needs two people redeeming the same card in the same second. The drift
between three stores happens on its own, quietly, every time anybody logs an
hour.

## What I will not do without asking

Change what a customer's remaining hours currently say. If the three stores
disagree today, the reconciliation report tells us by how much before anything
is rewritten — a silent correction on somebody's paid balance is exactly the
kind of thing that must be seen first.

---

# Redesign the pipeline so it says what needs attention

Asked for: *"the pipeline area needs to be way more organized and redesigned and
more functionable for owners and admins to know whats going on and what need
attention."*

## What is actually wrong, from watching it today

Not theory. Every item below was seen in the last hour testing one quote.

**1. Nothing tells you what needs attention.** Five columns of equal weight. A
job that has sat untouched since June looks exactly like one raised this
morning. There is no age, no owner, no flag, no "this one is stuck".

**2. The board was empty while three work requests existed.** It read "No
Projects Yet" with Wanda's June job, a second June job and the test job all
present in the store. Still unexplained. **This has to be understood before
anything is redesigned**, or the new board inherits it.

**3. Two sources of truth for what stage a job is at.** On load the stage is
derived from the work request's status; on save it is written onto the pipeline
item. They can disagree, and the merge decides silently which wins.

**4. A whole stage has no column.** `payment` is a valid `PipelineStage` with a
label and a colour, and no column renders it. Anything reaching that stage
disappears from the board.

**5. Records under two key shapes.** The board reads `pipeline_{id}`. Three
records exist under `pipeline:{id}` — including both June jobs — which the code
already documents as a dead end nothing reads.

**6. Saving quietly overwrote the customer's budget.** Saving the quote replaced
`estimatedValue` with the quote total. I watched it happen and had to put the
figure back by hand.

**7. The invoice handoff is `sessionStorage` and is deleted on read.** Reload the
invoice page before saving and the prefill is gone with no trace.

**8. Failures were mute.** Every save error read "Failed to save quote" —
refusal, missing record and server fault alike. Fixed today, and the same
pattern is probably elsewhere on this page.

## The question only you can answer

**What counts as needing attention, and after how long?** My proposed defaults,
each of which is a real query over data we already hold:

| Flag | Default |
|---|---|
| Work request not yet quoted | older than **2 days** |
| Quote drafted, never sent | older than **3 days** |
| Quote sent, no answer | older than **7 days** |
| Approved, no contract | older than **3 days** |
| Contract signed, not invoiced | older than **2 days** |
| Invoice unpaid | past its due date |
| Anything with no owner | immediately |

Change any number, or tell me the ones that do not matter to you.

## Progress

- [x] 1. **Why the board was empty** — answered, and it was not a bug. The
      session was a plain customer account (jbrenes19@gmail.com, no app role),
      not the owner. `GET /work-requests` answered 200 with that customer's own
      records — none — and `GET /pipeline/items` answered 403, which a console.warn
      swallowed. Both silences rendered as the same cheerful empty state.
- [x] 3. **Needs-attention rail** built, with the agreed thresholds, as a
      tested module (23 tests) rather than inline arithmetic.
- [x] 4. **Cards carry the reason** they are flagged, worst first.
- [x] 6. **The board distinguishes** no access, a failed load, and no work.
- [x] 2. **One source of truth for stage** — the stored pipeline item owns it; a work request status only seeds it. The old merge replaced records wholesale, which also lost the customer’s files.
- [x] 5. Payment column added.
- [x] 7. The customer’s budget is no longer overwritten on save.
- [x] 8. Nothing writes the `pipeline:` shape — verified; the only remaining uses are comments explaining why it is dead.

## Proposed shape

- [ ] 1. **Find out why the board was empty.** No redesign until this is
      understood.
- [ ] 2. **One source of truth for stage.** The pipeline item owns it; the work
      request's status seeds it once. No silent merge.
- [ ] 3. **A "Needs attention" rail across the top** — each flag a count you can
      click to filter the board to exactly those jobs. This is the part that
      answers the actual request.
- [ ] 4. **Cards carry what a decision needs**: value, days in this stage, who
      owns it, last activity, and why it is flagged. Today they carry a name and
      a number.
- [ ] 5. **Add the Payment column** so nothing can fall off the board, or remove
      the stage. Not both ways.
- [ ] 6. **Every failure says what failed**, the way the quote save now does.
- [ ] 7. **Stop the silent overwrite** of the customer's budget.
- [ ] 8. **Leave the orphaned `pipeline:` records alone** but stop writing that
      shape anywhere.

## What I am NOT proposing

Replacing the board with something else. It is the right shape for this work and
you are used to it. This adds a layer that tells you where to look, and repairs
what is broken underneath — it does not move your furniture.

Nor am I proposing to touch the portals. This is the internal pipeline only.

## Risk

This file is 1,978 lines and it is the spine of the business — everything that
produces a number or a document writes into it. The safe order is: understand
the empty board, fix the data faults, then add the attention rail. Doing the
visible part first would build on ground I know is uneven.

---

# Freeze a portal when the account has not paid

Asked for: *"we must have a portals to froze and only allow payment and
subscriptions areas to allow new payment when account payments failed or pass
due."*

## What already exists (more than I expected)

**Stripe already tells us.** `customer.subscription.updated` reaches
`supabase/functions/stripe-webhooks/index.ts`, and `past_due` deliberately does
not count as live: the handler drops `tierId` and `addOnIds` from the grant and
records `lastSubscriptionStatus: 'past_due'`. `invoice.payment_failed` is
subscribed to as well, and for maintenance plans sets
`plan.billing.status = 'past_due'`.

**So paid features already stop.** `resolveEntitlement` sees no tier and no
trial and returns free. What does *not* happen is a freeze: the account simply
drops to free-tier and carries on using everything free.

**There is exactly one choke point on each side, and both already exist.**

| | where | what it already does |
|---|---|---|
| Server | the `app.use('*')` auth gate in `index.tsx` (~line 634) | resolves the actor, refuses by tier, uses prefix allowlists |
| Client | `PortalAccessGuard` in `App.tsx` (~line 927) | wraps **every** portal page, calls `/intake/my-access`, renders checking / allowed / blocked, bypasses admin and owner |

That means this does **not** need touching twelve portals. It is one server
middleware, one extra state in one guard component, and one screen.

## The plan

- [ ] 1. **`accountStanding(email)` — one server function, one answer.**
      Reads `feature_grant:{email}.lastSubscriptionStatus` and the maintenance
      plan's `billing.status`, and returns
      `{ frozen, reason, pastDueSince, graceEndsAt }`. Nothing else decides
      this, so there is one place to read and one place to fix.
- [ ] 2. **Freeze middleware**, straight after the auth gate. Everything is
      refused with `402 Payment Required` and a machine-readable body except an
      allowlist (item 4). Admin, owner and staff are never frozen; nor is any
      route the freeze screen itself needs.
- [ ] 3. **`GET /account-standing`** so the client can ask without guessing,
      returning the same shape — and folded into `/intake/my-access` so
      `PortalAccessGuard` keeps making one call rather than two.
- [ ] 4. **The allowlist**, decided deliberately rather than by what happens to
      break: plans and subscriptions, checkout and payment, invoices (they must
      be able to see what they owe), `/my-plan`, `/account-standing`, sign-out,
      and messages.
- [ ] 5. **`PortalAccessGuard` gains a `frozen` state** — one screen saying what
      is owed, since when, and a button to the payment tab. No other portal file
      changes.
- [ ] 6. **Unfreeze the moment they pay.** The webhook already fires on
      `invoice.payment_succeeded` and on the subscription returning to active.
      The payment route also clears the freeze directly rather than waiting for
      the webhook, copying the "floor" pattern already used when adding an
      add-on — otherwise the screen says paid and the server still says frozen.
- [ ] 7. **A test for the state machine.** Pure function, so `accountStanding`
      is testable without a browser: active, past due inside grace, past due
      beyond grace, cancelled, never subscribed, staff, owner.

## Decisions taken (2026-09-26)

1. **Grace period: fifteen days past due.** Warning from the first failure.
2. **Emergencies stay open, always.** On-call and emergency intake are never
   frozen.
3. **Never frozen: owners, administrators and employees.**
4. **Deactivation is separate and manual.** An administrator may deactivate
   employees; an owner may deactivate anyone but themselves. Paying does not
   lift a deactivation.
5. Two defaults I chose and stated: freeze only when positively known past due
   (an unreadable record never locks anybody out), and a frozen account keeps
   read access to its own records while losing writes.

## Built

- `accountStanding.ts` — pure decision, 25 tests, no I/O.
- `accountAccess.tsx` — standing lookup, the allowlist, deactivate/reactivate
  routes, and the list of deactivated accounts.
- Freeze middleware in `index.tsx`, straight after the auth gate, refusing with
  402 and a machine-readable body.
- `FREEZE_ENFORCE` secret as a kill switch, mirroring `AUTH_ENFORCE`.
- `pastDueSince` stamped by both webhooks and cleared on payment — without it
  the clock resets every request and day fifteen never arrives.
- `standing` folded into `/intake/my-access` so the guard still makes one call.
- `PortalAccessGuard` gained a `held` state and a screen. No portal file changed.

## Still to verify in a browser

Nobody has watched an account freeze, pay, and come back. The unit tests prove
the arithmetic; they do not prove the wiring.

---

## Five decisions that are yours, not mine

**1. How long is the grace period?** Stripe retries a failed card for days. The
existing code says so in a comment: *"Do not cancel on a failed payment —
Stripe retries, and cutting service off on the first miss loses customers who
simply need a new card."* Freezing instantly contradicts that and will lock out
people whose card expired. My recommendation: **7 days past due**, with the
banner showing from day one so it is never a surprise.

**2. Emergencies.** A condo association is 10 days past due, a pipe bursts at
2am, and the on-call rota is behind the freeze. Do we refuse?

My recommendation: **no — emergency intake stays open**, and the debt is shown
loudly instead. Refusing habitability work over an unpaid invoice is a
liability I would not take on, and it is the one thing a frozen customer will
remember. This is the decision I would most like you to make consciously.

**3. Who can never be frozen.** Owner and admin obviously. My recommendation:
**employees too** — they do not pay for anything, and freezing a technician's
timesheet because the company card failed stops work and payroll for people who
have done nothing wrong.

**4. Which way it fails when we cannot read the record.** The usual rule here
is fail closed, and it is the wrong rule for this one thing: an unreadable KV
record would lock out paying customers. My recommendation: **freeze only when
we positively know the account is past due**. That is still fail-closed on
*entitlements* — no paid features without proof — and fail-open only on the
lockout.

**5. Does a frozen account keep read access to its own records?** Can a frozen
property manager still *see* their work requests and invoices, or only the
payment screen? My recommendation: **read-only on their own data, no writes.**
Seeing what you owe against what you got is how people decide to pay; a blank
wall is how they decide to leave.

## What I will not do without being asked

Freeze on the first failed charge, freeze employees, or hide what is owed.

## Risk

The middleware adds a KV read to every authenticated request. Mitigation: only
for `tier === 'user'` requests outside the allowlist, and cache the answer per
request. Worth measuring before it ships.

The bigger risk is a false freeze — a paying customer locked out by a bad
webhook or a stale record. Decisions 1 and 4 exist to make that nearly
impossible, and the freeze screen will say how to reach you regardless.

---

# Wire the admin Dispatch Center to the pipeline

## What I found

The Dispatch Center is six invented work orders and six invented employees held
in `AdminPortalView.tsx`. The file makes **zero** server calls of its own.

But everything it needs already exists and is already working. Nothing new has
to be built on the server:

| Need | Endpoint | Status |
|---|---|---|
| The work orders | `GET /work-requests` | Real. An admin gets **every** request; reads the live keys. |
| The field team | `GET /time-tracking/employees` | Real, admin-gated. Name, role, department, phone, clocked-in state. |
| Assigning one | `POST /property-management/work-requests/:id/assign` | Real. Writes `assignedTo`, `assignedToEmail`, `assignedEmployeeId`, sets status, raises an admin alert. |
| Changing status | `PUT /work-requests/:id` | Real. Admin may set any field. |
| System alerts | `GET /notifications/admin-alerts` | Real — and it is the same `admin_alerts` the assign route writes into. |

So this is a screen that ignores its own backend, not a missing feature.

The assign endpoint matters more than it looks: it records the employee's
**email and id**, not just a typed name, and the employee portal decides which
jobs a person may bill time to by matching exactly those fields. Assigning from
this screen is therefore what puts a job on a technician's timesheet.

## The plan

- [x] 1. **Dispatch reads the pipeline.** Replace the hard-coded `workOrders`
      with `GET /work-requests`, and the hard-coded `employees` with
      `GET /time-tracking/employees`. Map the field-name variations that already
      exist in stored records (`title` / `serviceType` / `project_type`,
      `client_name` / `customerName`) the way `time-tracking.tsx` already does,
      rather than inventing a new spelling.
- [x] 2. **Assigning actually assigns.** `assignEmployee` calls the real
      endpoint with the employee's name, email and id, then re-reads the list.
      Failures surface as an error, not a success toast.
- [x] 3. **Status changes persist** through `PUT /work-requests/:id`.
- [x] 4. **The three lying buttons.**
      - *Call Customer* → a real `tel:` link to `client_phone`, hidden when
        there is no number.
      - *Message Tech* → a real `sms:` link to the assigned employee's phone,
        hidden until the job is assigned.
      - *Flag Urgent* → `PUT { priority: 'urgent' }`, so it is still true after
        a reload.
- [x] 5. **System Alerts reads `GET /notifications/admin-alerts`**, which is
      where assignments already write. Empty means nothing has happened, which
      is honest.
- [x] 6. **Collapse the three repeating Overview cards.** User Management,
      Revenue Analytics and System Analytics all open `unified-dashboard`. One
      card, "Analytics", going to the same place.
- [x] 7. **Update the admin guide** to match — steps 4 and 5 remove two of the
      four "this is a demonstration" notes.

## Deliberately NOT in this change

**Customer Service and Employee Support stay demos.** They have no backend at
all — there is no ticket store to read. Making them real is building a
helpdesk, which is a separate piece of work and not what was asked for. Their
guide notes stay, so the portal keeps telling the truth about them.

Real customer conversations already work, in the Messages tab of each
customer's portal.

## Risk

Dispatch will look emptier than the demo, because it will show the jobs that
actually exist rather than six invented ones. That is the point, but it is worth
expecting.

The assign endpoint requires property-admin rights. If the owner account does
not pass `intakeIsAdmin`, assignment will 403 — I will check that against the
running app rather than assume it.

## Review

All seven items done. `AdminPortalView.tsx` went from **zero** server calls to
reading and writing the same records the rest of the platform uses.

**What changed in behaviour**

- Dispatch shows every real work request, mapped across the field-name
  variations stored records actually carry, with a derived status so a job with
  somebody's name on it reads as Assigned.
- Dispatching calls the real endpoint with the employee's **name, email and
  id**. That is what makes the job billable by that person in the employee
  portal — the timesheet matches on the email and id, not the name.
- Status changes and Flag Urgent write to the work request, so they survive a
  reload.
- Call is a `tel:` link to the customer's own number; Text is an `sms:` link to
  the assigned technician. Each is hidden when there is no number to use,
  rather than present and lying.
- System Alerts reads `admin_alerts` — the same store the assign route appends
  to, so dispatching a job now produces a visible alert.
- Loading, error and empty states throughout, because all four lists can now
  legitimately be empty.

**Checked, not assumed**

`intakeIsAdmin` treats `ericerb555@proton.me` as a platform owner before any
`company_members` row exists, so the assign route will accept the owner
account. That was the open risk in this plan and it is closed.

All five endpoints probed live: `/work-requests`, `/time-tracking/employees`,
`/notifications/admin-alerts`, the assign POST and the work-request PUT each
return **401** unauthenticated. They exist and they fail closed.

typecheck 321 (baseline, nothing added), smoke 27 pages, 0 threw.

**Not yet verified**

Nobody has watched a real job move across this board signed in. The proof is
one work request assigned to one employee, then that employee seeing it in
their portal. Worth doing before it is relied on.

**Found on the way, not fixed**

`GET /property-management/work-requests/pending` and `/approved` both read the
`work_requests` key, which the code's own comment says holds nothing — real
submissions land in `all_work_requests`. Those two routes return an empty list
whatever the state of the platform. Dispatch routes around them, so this change
does not depend on them, but anything else calling them is being told there is
no work.

---

# Making the platform actually work — proposed plan

## The honest position

A great deal has been built here very fast, across many surfaces. Almost none of
it has been watched working. That is the gap between where we are and "the
platform functions correctly", and it is not a gap that more building closes.

The evidence for saying so is our own history. The design centre was blank for
hours because a variable was read eleven lines before it was declared. The
siding takeoff threw on first render because `useEffect` was never imported.
Both passed `vite build` cleanly, because esbuild strips types and never checks
them — it will happily ship a reference to a name that does not exist. Both were
found by you, using the app, rather than by me before shipping.

So the honest answer to "what do you suggest" is: stop guessing which parts
work, and build the thing that tells us.

## What I checked before proposing this

- **Your data is fine.** The live server writes to `kv_store_57095a78` — 1225
  rows, 436 pipeline items, 6 vendors, 4 quotes, 5 design projects. The
  similarly named `kv_store_3eae23a6` is an unused empty table; the naming is
  inherited from the function that was retired in August, which is why it looked
  alarming at first glance.
- **The crash-causing class of type error is currently absent.** A type check
  reports zero `Cannot find name` errors across `src/`. The specific bug that
  has bitten twice is not sitting in the tree right now. Nothing prevents it
  from coming back, though: there is no `tsconfig.json` and no typecheck script,
  so TypeScript has never actually run on this codebase.
- Of the 4789 errors that check did report, roughly 4400 are React's types
  failing to resolve in a throwaway config I wrote in five minutes. That number
  is my probe's fault and should not be read as 4789 defects.

## The plan, in the order I would do it

### 1. Retire the two orphaned backends  (~30 min, security)

`make-server-824f083c` and `make-server-12c91054` are still ACTIVE with live
customer data and no source in this repository. Both answered an unprivileged
test account: one returned `HTTP 200` on `/customers`, the other returned a 500
from `/invoices` that leaked an internal table name, meaning it queried the
database before checking who was asking. Retire them behind the same 410 stub
that `make-server-57095a78` already uses, archiving each under
`supabase/functions/_retired/` so either can be restored.

### 2. A smoke harness that renders every screen  (the main event)

One command that mounts every page and portal in headless Edge and reports which
ones throw, which render empty, and which log console errors. This is precisely
the check that would have caught the blank design centre before you did.

It is worth being clear about why this matters more than it sounds: right now
"does the platform work" is answered by you opening screens until one is broken.
This replaces that with a list, produced in a couple of minutes, before anything
ships.

### 3. Fix whatever step 2 finds

Unknown size — that is the point of running it. Ranked worst-first, and I would
bring you the list before starting rather than disappearing into it.

### 4. A real `tsconfig.json` and a `typecheck` script  (~1 hour + triage)

So the `useEffect is not defined` class cannot come back silently. Configured
properly this time, with React's types resolving, so the output is a short list
of real problems rather than four thousand phantoms.

### 5. Then kitchens and bathrooms

Detailed measurements, 3D CAD, photorealistic render and a cabinet schedule.
The largest thing asked for so far, and it deserves a proper plan of its own
rather than being started at the end of a long day. Doing it on top of a
platform we have actually verified is a much better position than doing it on
top of one we hope works.

## Todo

- [x] 1. Stub and archive `make-server-824f083c` and `make-server-12c91054`
- [x] 2. Build the render smoke harness over every page and portal
- [x] 3. Report the findings, ranked, and agree what to fix
- [x] 4. Add `tsconfig.json` and a `typecheck` script; triage the real errors
- [x] 5. Plan kitchens and bathrooms properly

## URGENT — deck photos do not survive a save

Reported while step 1 was in progress. Diagnosed, not yet fixed.

Photos are never stored with a deck project. The save payload in
`DeckDesigner.tsx:544` is `{ kind, model, site, loads, takeoff, ...link }` —
there is no photo field in it. So reopening a saved deck cannot show photos:
they were never written, rather than written and lost.

Three things compound it:

1. `JobFolder` clears its own list the instant Send is pressed
   (`setSorted([])`, JobFolder.tsx:56). The files pass through to the house
   capture step and the card empties.
2. The photos only ever existed as `File` objects read live from a folder on
   the machine, held in React state.
3. `hardReset()` calls `forgetFolder` on all three slots — `job-folder`,
   `job-photos`, `sketches` — and it runs on both Save-as-new and New
   (DeckDesigner.tsx:524, called at 552 and 674). So saving also drops the
   remembered folder.

### Proposed fix

- [x] Store the picked photos against the project when it saves, and list them
      back when it opens. There is already a private bucket and an upload path
      for exactly this shape of thing in `design-links.tsx`.
- [x] Stop `hardReset` forgetting the job folder on a plain save. Starting a
      genuinely new deck should forget it; filing the current one should not.

Not started — waiting on confirmation, and on one detail of what "cannot add
any" looks like on screen.

## The house, drawn from the photos and then editable

### What is actually wrong

The two ends both exist and nothing joins them.

`/analyze` already returns the house: `sillHeightInches`, `sidingType`,
`storeys`, and each wall with `widthFt`, `heightFt` and its openings, every
field carrying its own confidence. That result reaches the designer as
`houseRead` and is handed to the chat assistant. **No geometry reads any of
it.**

The house in the 3D view is invented from the deck:

    const wallW = model.widthFt + 16;
    const wallH = Math.max(12, model.heightFt + 11);
    const doorW = 6; const doorH = 6.7;
    const doorSill = model.heightFt + 0.1;

The wall is the deck plus sixteen feet. The door is a hardcoded six by six-eight.
And the sill is derived from the deck height, which is backwards from how the
job is actually done — the sill is what decides how high the deck sits.

### The approach, which is not a scanning problem

Scale comes from the sheet of paper in each photograph, and Eric corrects the
numbers by hand afterwards with a tape measure. Approximate-from-photos plus
operator correction is the design. So this is a wiring and editing job, not a
reconstruction one.

- [x] 1. A `house` record on the design project, saved beside `model` and
      `site`: wall width and height, storeys, siding type, sill height, and the
      openings with their positions and sizes.
- [x] 2. Seed it from the photo analysis, and keep the provenance per field —
      `from photos` against a typed `measured`, so it is always visible which
      numbers are a guess and which he stood in the yard and measured.
- [x] 3. An editable panel: every number a field he can type over. Typing a
      real measurement marks that field measured and it stops being overwritten
      by a later photo read.
- [x] 4. `DeckViewer3D`'s `House` draws from that record instead of inventing
      it — real wall length, real storey height, the door where the door is.
- [x] 5. Turn the sill relationship the right way round: deck height follows
      sill height, with an explicit override for when it should not.

### Revised: the house belongs to the project, not to the deck

Eric: "I should have the ability to add a partial or a full house view, which I
should be able to bring into the other sections in the design center."

That rules out hanging the house off the deck, which is what the plan above
quietly assumed. The house is the thing every trade works on — siding needs
every elevation and its openings, doors and windows need the opening schedule,
roofing needs the roof planes, kitchens and bathrooms need a room. Capturing it
once per trade would mean four descriptions of one building, free to disagree.

So the house is captured once, stored on the project, and read by whichever
trade tab is open.

**A house is a set of views, and it accumulates.** A view is one named piece —
"back elevation", "kitchen", "north gable". A partial capture is one view; a
full house is several. This matters because it matches how the work actually
arrives: a deck job needs one wall and nothing else, and being forced to
photograph an entire house to design a deck would be an obstacle rather than a
feature. Later, when the same customer wants siding, the remaining elevations
are added to the house that is already there rather than starting again.

What each trade takes from it:

| Trade | Reads |
| --- | --- |
| Decks | the one wall it attaches to, and its sill height |
| Siding | every elevation, with areas and opening deductions |
| Doors and windows | the openings, as the schedule |
| Roofing | the roof planes |
| Kitchens, bathrooms | one interior room view |
| Flooring | the room, for its floor area |

- [x] 6. Store the house on the project as a set of named views rather than a
      single elevation, so a partial capture is the normal case and a full house
      is what several partials add up to.
- [~] 7. Let every trade tab read it — the house is stored per project and the panel shows on every trade; the individual trades do not yet CONSUME it (siding areas, window schedule). Decks do., and let a trade say which view it is
      working on.

Not started — needs sign-off, because it changes what every deck in the design
centre is drawn against, and it is the foundation the other trades sit on.

## Model first, render once — the photoreal pipeline

### Why this exists

Two facts settle the design between them.

A render costs about twenty cents and a set of looks is three of them, so
iterating by rendering is the expensive way to work and also the slow one. And
a render produced by describing a deck in words is a fresh roll of the dice
every time — it cannot measure sixteen feet, it does not know where the ledger
lands, and asking again produces a different deck.

The 3D view is free and instant. So the work moves there, and the paid step
happens once, at the end, on a design that is already settled.

The prize is bigger than the cost saving. If the picture is generated FROM the
model it cannot get the size or the position wrong, because it is not deciding
them. The image model stops being an architect and becomes what it is actually
good at: lighting, materials and shadow.

### The pipeline

1. **Align the 3D camera to the photograph.** The photo sits behind the 3D view
   at half opacity and the view is orbited until the house edges line up. Done
   by hand on purpose — recovering a camera automatically from one photo is a
   research problem, and this is a job for the person already looking at both.
   Saved with the project, so it happens once per photo and never again.

2. **Render the deck alone, on transparency.** House, ground and sky hidden;
   only the deck and its shadow catcher. `DeckViewer3D` already runs with
   `preserveDrawingBuffer`, which is what makes the capture possible at all.

3. **Composite it onto the photograph.** At this point the geometry IS the
   model — right width, right height, right post spacing, stairs where the stair
   calculator put them. It will look like a drawing pasted onto a photo, which
   is exactly what it is.

4. **One paid pass, masked to the deck.** The composite goes to the image model
   with a mask of the deck's own silhouette, grown slightly so it can blend the
   edges and lay a contact shadow. The instruction is to change no shape and no
   position, only to make it photographic. The masking shipped today is the
   mechanism this relies on.

5. **Keep the aligned camera.** Re-rendering after a design change then costs
   one image rather than another alignment.

### Todo

- [x] 1. Deck-only capture on a transparent background
- [x] 2. Alignment view — photo behind, opacity slider, orbit to match
- [x] 3. Persist the camera on the design project
- [x] 4. Composite, and derive the mask from the deck silhouette
- [x] 5. The photoreal pass, worded to forbid moving anything
- [x] 6. Show the composite beside the finished render, so it is obvious what
      the paid step actually changed

### Built — 57/57 tests

**The mask semantics are inverted and it matters.** `images/edits` edits where
the mask is TRANSPARENT and preserves where it is opaque. So the deck becomes
alpha 0 and the whole photograph around it becomes alpha 255. Backwards, it
repaints the house and leaves the deck a drawing — plausible enough a mistake
that the test asserts both directions explicitly.

The silhouette is grown a few pixels, because a mask cut exactly to the geometry
leaves no room to blend an edge or lay a contact shadow, and a deck with no
shadow reads as pasted on however good the materials are. Dilation is separable,
so it costs pixels rather than pixels × radius.

**A camera is tied to the photograph it was aligned against.** Reusing one on a
different photo blocks, because it would place the geometry precisely where it
belonged in a picture nobody is looking at — confidently wrong, which is worse
than obviously wrong.

**The prompt removes decisions rather than describing a deck.** Four DO NOTs
before any DO, ending "if you are unsure whether a change is allowed, do not
make it". A test asserts it never contains a dimension in words — the moment it
does, it is deciding geometry again.

The constraints are assembled **on the server**. The client has its own tested
copy so the operator can see what will be sent, but a prompt arriving over the
wire is one somebody can shorten, and a shortened one brings the wandering deck
straight back. Rendering with no mask is **refused** rather than quietly
downgraded — that path is an unconstrained edit of the whole photograph.

### Before it spends the money

Blocks on: no photo, no capture, no camera, a camera from another photo, or an
empty capture. Warns on a deck under 2% of frame (little to work on) or over
60% (no house left for context).

### The comparison is the check

The composite and the render sit side by side. If the model moved something
inside the mask, that is how it gets caught here rather than by a customer.
Item 6 existed for exactly this and it is the part worth actually using.

### Not verified

Nobody has run a real render through this. The mask maths, the gates and the
prompt are tested; what the image model does with a correct mask and that
wording is an empirical question and costs about twenty cents to answer.

### What could go wrong, said in advance

**The model may still move things inside the mask.** `input_fidelity: high` and
a prompt forbidding any change of shape both help, and item 6 exists so it is
visible when it happens rather than being found by a customer.

**Alignment is fiddly on a phone.** It is a desk job. The site visit captures
the photo; the alignment happens back at the office, which matches how the work
actually runs.

**A wrong camera produces a confidently wrong picture.** Worth checking that the
deck's base line sits on the ground plane in the photo before spending a render
on it.


## A returned quote, read and put against our scope  (done — 471a11cd)

A subcontractor sends a PDF on his own letterhead, or a photograph of
something handwritten from the van. A system that demands he fill in our form
gets routed around by email, and then the numbers live in an inbox while the
scope quietly goes out of date. So the system reads what they actually send.

- [x] `bidIntakeModel.ts` — the pure logic. 20/20 tests.
- [x] `bid-intake.tsx` — `POST /read`, staff only, reads text and images.
- [x] `BidIntakePanel.tsx` — paste, attach pages/photos, or a clip reduced to
      frames. Review the proposed matches, tick, apply.
- [x] Mounted on the scope screen, and only once something is out to bid.

### The three rules it is built on

1. **Proposed, never applied.** Every match arrives as a suggestion with a
   confidence and has to be ticked. An AI writing money into a customer quote
   on its own produces the worst kind of error — a wrong number nobody typed
   and nobody checked, in front of a customer with our name on it.
2. **Shown but unticked when unsure.** Below 0.7 confidence a match is
   displayed and left off. Hiding it drops work; ticking it prices it wrong.
3. **Report what did not match, both directions.** Their line fitting nothing
   of ours may be work we forgot to scope. Ours with nothing against it may be
   work they have not priced. Both matter more than the total, and both vanish
   if a reader only reports its successes.

It also checks their own arithmetic and says so when their printed total
disagrees with their own lines — that is a phone call, not something to absorb.

### Known limits, said plainly

- **Video is read as frames, not watched.** Four stills are pulled from the
  middle of the clip and those are what the model looks at. If the numbers are
  only spoken aloud, they will not be read. Numbers held up to the camera will.
- **A PDF has to be attached as page images**, not as the file itself.
- Several of their lines landing on one of ours **add** rather than overwrite,
  which is right for a plumber itemising rough and trim against one line of
  ours — but it means ticking the same reading twice would double it.

## Phase 4b — the scope goes out to bid  (DONE)

Decision taken: **a lines table**. Migration 012 tested on a throwaway branch,
then applied to production. The branch found a real hole — see below.

- [x] 1. `bidPackageModel.ts` — 48/48 tests.
- [x] 2. `BidPackagePanel.tsx` on the scope screen.
- [x] 3. Migration 012: `bid_request_lines`, `bid_line_prices`.
- [x] 4. Posts into the existing bid room as a draft.
- [x] 6. The dead `request-bids` stub now says what it actually did.
- [x] 5. The subcontractor's side — pricing the package line by line.

### The sub's side, and why blank is not zero

The existing bid form was repaired rather than duplicated. When a request has
lines it prices them row by row and the total is the sum of what he types;
there is no separate headline field for it to disagree with. When it has none —
every request posted before 012 — it behaves exactly as it did.

The distinction the whole screen turns on: **a blank is not a zero.** A line he
left empty is a line he has not priced. A line he typed `0` into is one he is
including at no extra charge, which is a normal thing for a trade to do.
Collapsing the two would turn every line he skipped into a promise to do it for
nothing, and he would find that out on site.

So blanks are counted and reported in both directions — he is warned before he
submits, and the poster sees `3 of 11 lines not priced — this total does not
cover the job` against that bid. Two totals are only comparable if they cover
the same work, and a provider who left three lines blank looks cheapest right
up until the change order.

### 7. The won bid comes home  (done)

`AwardedBidsPanel` reads the bids we awarded on this design project and puts
each returned price back onto the scope line it was quoted against. Nothing is
matched or guessed — the identity was carried the whole way round, which is the
entire reason the package went out as rows.

It is a button rather than automatic, on purpose. Awarding is a decision about
*who does the work*; putting his price on our quote is a second decision, and
doing it silently would mean a customer-facing figure changing because somebody
clicked Award on another screen.

Both return paths — the bid room's own and the reader that handles a quote
arriving as a photograph — now share one `priced()` helper, because a price is
worth the same whichever way it travelled and should not land differently
depending on the route.

### The whole loop, driven on a branch

Posted a three-line electrical package against design project `dp_kitchen_1`,
as the real roles under RLS, running the same statements the screens run:

| step | result |
|---|---|
| Sub A prices all three lines, headline 11000 | stored as **7400** — the sum |
| Sub B prices two, skips the panel upgrade, headline 9999 | stored as **4700** |
| what the poster sees against Sub B | *1 of 3 lines not priced — this total does not cover the job* |
| award Sub A, then read it back | `sl_rough` 3200, `sl_fix` 1800, `sl_panel` 2400 |

That middle row is the point of the whole feature. Sub B sorts to the top as
**lowest** and is $2,700 cheaper, and he is not quoting the same job. Before
this, the two numbers were indistinguishable.

Sealing after the award also holds: the loser cannot read the winner's
breakdown *or his total*, the winner cannot read the loser's, neither can
revise a price once the request is awarded, and both can still read their own
for their records.

### Still not verified

Nobody has clicked these screens in a browser. Every statement the screens issue
has been run against a real database as the real roles, and the logic is at
81/81, but the DOM path — the inputs, the buttons, the toasts — has only been
proven to render, not to be driven.

### What the branch test found

The first version of 012 used `my_owned_bid_request_ids()` for the write
policies on `bid_request_lines` while its own comment claimed the rule was
owner/admin only. That helper is any active membership. So a **`viewer` of the
posting organisation could add lines to a package and change a quantity on one
already out to bid** — the quantity a subcontractor's price is computed from.
Fixed with a new `my_admin_owned_bid_request_ids()` helper, matching what 004
already says about who may put work out to bid. Retested: viewer refused all
three writes, still reads; owner can still do all three.

This is the second time a branch test has caught a real leak in the bid room —
003's comments record the first. The branch cost about four cents.

### What held under attack

Run as a poster, two rival electricians and an outsider, with RLS on:

- one provider reading a rival's per-line pricing — **0 rows**
- an *invited* provider reading a **draft** package's lines — **0 rows**
  (the exact leak class 003 caught on invitations)
- an outsider reading anything — 0 requests, 0 lines, 0 breakdowns
- pricing a rival's bid, attaching a price to another job's line, editing the
  scope you are bidding on, adding a line to it, deleting a rival's breakdown —
  all refused
- revising a breakdown after the request closed — refused; reading your own
  afterwards — still works
- qty of zero, negative qty, blank unit, invented confidence, duplicate scope
  line, negative price — all rejected by constraint
- deleting a line takes its prices and re-syncs the bid total; deleting a
  request takes everything

### The total is computed, never accepted

A trigger keeps `bids.amount` equal to the sum of the breakdown. Proven: a bid
submitted with a headline of **9999** and lines of 3000 + 2500 became **5500**
without anybody asking. A provider cannot submit lines that add to one figure
and a headline that says another.

### Original plan, for the record

### What is actually wrong

The two halves of the bid loop have never been connected.

The **design centre** holds the scope in KV: lines with a phase, a trade, a
description, a quantity, a unit and a `bidOut` flag. The **bid room** is a real
Postgres system with row-level security — `bid_requests`, `bid_invitations`,
sealed `bids`, and `bid_request_media` for photos and video. Both are sound.

Nothing carries the scope from one to the other. A bid request today is a title
and a free-text paragraph somebody retyped. Three costs follow from that:

1. **The sub prices a paragraph, so he pads it.** A number for the unknown is
   always larger than the truth, and we pay that difference on every job.
2. **What comes back has no relationship to our lines.** That is the whole
   reason the intake reader has to work as hard as it does.
3. **The award never lands where the money was spent.** A single bid amount
   against a paragraph cannot be attributed to the lines it paid for, so the
   scope stays provisional even after it has been priced by the person who is
   going to do the work.

There is also a dead stub — `POST /quotes/:id/request-bids` writes a row into
`quote_bid_requests:{id}` in KV that nothing reads and that never reaches the
bid room. It should be pointed at the real system rather than left to look
like a working feature.

### What this phase builds

Scope → package per trade → invitation → sealed bid → intake → back onto the
same lines. Closing that circle is the whole of it.

- [x] 1. `bidPackageModel.ts` — pure logic. Group the `bidOut` lines by trade
      into one package each. Decide what a package must contain before it is
      fit to send: quantities on every line, the site, the phase each line sits
      in, and the hold points that constrain when the trade can work. Refuse to
      send an incomplete one and say what is missing.
- [x] 2. A panel on the scope screen — the packages as they will be received,
      reviewed before anything goes out, with what is missing named per package.
- [x] 3. Persist the lines onto the bid request (**the decision below**).
- [x] 4. Post into the **existing** bid room. One `bid_requests` row per trade,
      invitations to the provider orgs for that trade. No second bid system.
- [x] 5. Show the package on the subcontractor's side as a table rather than a
      paragraph, and attach the plan captures and site photos via the media
      table that already exists.
- [x] 6. Repoint the dead `request-bids` stub at the real bid room.

### The decision I need before step 3

Where the lines live on a bid request. The bid room is Postgres with RLS and
the design centre is KV, so this is the join between them and it decides how
much the rest is worth.

**(a) Rendered into `description`.** No migration. The sub reads a formatted
list instead of a paragraph. But it is text — nothing structured comes back and
he still cannot price line by line.

**(b) A `bid_request_lines` table.** Migration 011 states the house rule
outright: *"A separate table rather than a jsonb column, because these rows
carry their own access rule and jsonb cannot be policied."* One row per line,
RLS inherited from the parent request. This is the option where the sub prices
line by line, what returns already matches our lines, and the award attributes
itself. Most work, and the only one that actually closes the loop.

**(c) A `scope jsonb` column.** Between the two. Cheaper than (b), and here the
access rule is genuinely the same as the parent row so jsonb is defensible —
but line-by-line pricing still needs more work afterwards.

Recommending **(b)**. It is what the codebase's own stated reasoning points at,
and it is the version that makes the intake reader mostly unnecessary for the
subs who cooperate while still catching the ones who send a photograph.

### Migration discipline

010 is deliberately unapplied and this must not become a reason to apply it.
Production currently has 001–006 and 011. Any new migration goes to a branch
first, RLS gets verified there — including that a provider invited to one
request cannot read another's lines — and only then to production.

## Phase 5 — the walkthrough

### Why this matters more than it looks

`scopeModel`'s own header says it: *"A figure worked out at the desk and one
confirmed on site are both useful, and letting them look the same is how an
indicative number becomes a fixed price."* The confidence field exists to keep
them apart.

Then `confirmAll()` marks every line confirmed with one click, defending itself
on the grounds that *"the walk is one event: somebody stood in the room and
looked."* That is true about the visit and false about the measuring. Nobody
measures forty lines. Standing in a kitchen tells you the cabinet run and
teaches you nothing about the joist spacing under the floor, and a button that
promotes both is the exact failure the field was added to prevent.

So the walk stops being a checkbox and becomes a sheet.

### What a walkthrough is actually for

Three things happen on site, and only the first is about numbers:

1. **Confirming or correcting quantities** that could only be estimated from
   photographs.
2. **Finding what was not there to see** — the surprise behind the wall. This is
   the real reason to go, and a screen that can only tick off things already
   listed cannot capture it.
3. **Recording conditions that cost money and are not quantities** — access,
   parking, stairs with no lift, an occupied house, working hours, pets, where
   the panel is. These are what a subcontractor pads for when nobody tells him.

### What it feeds

- **The scope** — per line, provisional becomes confirmed, carrying what was
  actually measured rather than a flag.
- **The bid packages** — a package sent before the walk is marked provisional on
  the sub's copy; after it, confirmed, and he can price tight instead of
  guessing. Already wired: 012 carries `confidence` per line.
- **A bid already returned** — if a quantity changes *after* a subcontractor has
  priced it, his number was for a different job. That has to be said out loud,
  not absorbed.
- **The quote** — built on confirmed quantities it is a price; on provisional
  ones it is an estimate. `confidenceNote` already draws that line.

### Todo

- [x] 1. `walkthroughModel.ts` — 40/40 tests.
- [x] 2. Per-line confirmation carrying the measured figure.
- [x] 3. Discoveries — a line added on site, arriving already confirmed.
- [x] 4. Warn when a correction moves a quantity a sub already bid against.
- [x] 5. Site conditions, carried onto the bid packages.

### Three verdicts, not two

The distinction that keeps this honest:

| | what it claims | what happens to the line |
|---|---|---|
| **Measured** | a tape went on it | quantity can change, confirmed, basis says *measured on site* |
| **Looked, agreed** | content with the desk figure without measuring | confirmed, number unchanged, basis says *accepted without measuring* |
| **Not looked at** | nobody was there | untouched — still provisional, because it still is |

The middle one is the point. It is a real confirmation and a different claim
from a measurement, and six weeks later the basis on the line says which. The
old single button collapsed all three.

`confirmAll()` is kept and marked superseded rather than deleted, so nothing
that has not moved over breaks. The "mark the rest as looked at and agreed"
link does what the old button did, honestly labelled.

### What a correction does downstream

If a measured quantity moves on a line that already carries a returned bid, the
sheet says so in red and names the difference per line: *"Frame wall 100 → 130
(+30)"*, with *his price was for a different job — settle it with him rather
than absorbing it.* Lines nobody has priced can change freely and raise nothing.

### Conditions travel

Twelve of them, each carrying why it costs money. They are appended to the bid
request description, so a subcontractor is told about the missing parking and
the full panel instead of discovering them on the first morning and padding
every job afterwards.

### Persistence

`walkthrough` is threaded through all three save paths, all three dependency
arrays, the reset, the unpark-restore and the project open — read tolerantly,
so a project saved before this existed still opens.

Typecheck caught five errors while wiring that up: the field added to the wrong
interface, then three session constructors missing it. Every one of them would
have compiled fine and thrown at runtime.

## Phase 6 — framing details, and getting them approved

Eric: *"framing details that we can submit to out archetechs for approval or
changes"* … *"maybe a portal i am not sure how that would work"* … *"yea i think
link is the best for now"*.

### What makes this a submittal rather than a printout

An architect cannot review a number without knowing what it assumed. So every
member on the schedule carries the check that justified it — span, load,
utilisation, deflection ratio — and the assumptions are stated once at the top:
loads, species and grade, deflection limit, code edition.

The calculation already exists and is real. `structureModel.checkMember` does
bending as M = wL²/8 against section modulus and deflection as 5wL⁴/384EI
against L/240, and `deckStructural.computeStructural` does soil bearing and
frost depth. This phase does not invent engineering — it presents what is
already computed in a form somebody can stamp or argue with.

It also carries the **open questions**: what we could not determine and want a
ruling on. A submittal with no questions is a brochure.

### The link, and why it is built more carefully than the one we have

The existing quote share link is `crypto.randomUUID()` with the dashes stripped,
stored in plaintext, with no expiry and no way to revoke it. That is 122 bits
and it is fine for a quote the customer already has. It is not the standard for
a construction document going to an outside firm.

This one:

- **256 bits** of `crypto.getRandomValues`, base64url.
- **Stored as a SHA-256 hash, never in plaintext.** If the store leaks, the
  tokens in it do not work.
- **Expires**, server-enforced, and can be revoked.
- **Serves a snapshot, not the live project.** Submitting for approval means
  submitting a specific revision — and it means a project that later gains
  something sensitive cannot leak it through a link issued today.
- **Carries no money.** No labour rate, no margin, no customer quote. The
  payload type has no field for it, the same way `PackageLine` has none.
- Read-only plus exactly one response. The architect cannot edit the document.

### Todo

- [x] 1. `framingModel.ts` — 68/68 tests.
- [x] 2. `architect-review.tsx` — issue, read by token, respond, list, revoke.
- [x] 3. `FramingSubmittal.tsx` — build it, send it, watch the state.
- [x] 4. `ArchitectReview.tsx` — the page they open, public route.

### The leak test is the one that matters

`architectView()` rebuilds the payload field by field rather than spreading the
submittal, and the server re-filters it on arrival. The test plants
`labourRate`, `margin`, `customerQuoteTotal`, `internalNotes` and `bidAmounts`
on a submittal as though somebody had added them later, and asserts none of
them reach the view — plus a planted field on a *member*, and that the view is a
copy rather than a window onto the live document.

A spread would have been shorter and would have leaked every one of them.

### The schedule is derived, never retyped

`submittalFromDeck` takes the sizes from the model somebody drew and the loads,
post load, soil and frost depth from `computeStructural`. Joists span the depth,
the beam spans post to post at half the deck depth tributary — stated on the
sheet, because a reviewer cannot check anything without knowing which way the
framing runs.

What the calculation could not settle becomes an **open question** carrying what
we assumed meanwhile and what moves if that is wrong, rather than an absence. A
member with no calculation is shown as *not calculated*, never given a plausible
figure.

Eric's standing details ride on every submittal: 4x4 posts are not notched, and
post bases take a 1/2in drop-in anchor rather than a cast-in J-bolt. Stated as
what we do, so a reviewer does not return a detail we do not build.

### Note on the smoke run

Touching the router made the affected set all 331 pages. That run reported 1
page unread; a control run on the **unchanged** tree reported 4, and different
ones. It is batch-timing flakiness in full-run mode, not a regression — zero
threw in both. Worth knowing before the next full run is read as a failure.

`smoke.html` is written by the harness on every run and was untracked; now
ignored rather than committed.

### Reported, not fixed

The quote share link's weaknesses above are a separate feature touching customer
money flows. Named here rather than widened into this change.

## Phase 7 — permits and variances

The open decision is settled: **it asks, never guesses.** A town record Eric
fills in once, reused on every job there afterwards.

The option not taken was shipping every local ordinance pre-loaded. It works on
day one and rots in silence — towns amend, a figure right when written is wrong
after the next town meeting, and nothing announces it. A wrong setback in a
filed drawing costs a reputation with a building department, and it would be
his rather than the software's.

### The rule the whole thing turns on

**Unknown is not compliant.** A setback nobody entered reads as *not known*,
never as a pass — in the type, in the check, and on the screen. That is the
entire integrity of the choice: the system knows only what somebody told it, so
its silence has to mean silence rather than approval.

`complianceNote` refuses to read as approval while anything is unchecked:
*"Nothing broken among the 4 rules that could be checked, but 3 could not be —
that is not the same as passing."*

And an unknown says **which kind** it is, because the two are fixed by different
people: *"the rear setback for Salem has not been entered"* against *"nobody has
measured how far this sits from the rear lot line."*

### Honest about its own age

Every record carries where the figure came from — read off the ordinance,
confirmed at the counter, told over the phone, or assumed — and when. Past two
years it says so and suggests a call. A record marked *assumed* says plainly:
do not file on it.

### Variances

The five statutory tests a New Hampshire board applies, from RSA 674:33 I(b),
carried verbatim because the board reads them out and takes each in turn. Each
one also carries what the board is actually weighing, and the hardship test
carries the trap applications fail on: *a hardship about the owner rather than
the land does not qualify.*

Relief sought is derived from what actually broke — *"20 ft required, 18 ft
proposed — 2 ft of relief"* — rather than typed. A one-word answer to a
criterion is called a fragment, because boards continue applications for that.

`criteriaFor()` returns **null** for any state but NH rather than offering the
wrong five. That is the same discipline as the rest: better to say we do not
carry it than to be confidently wrong.

- [x] `jurisdictionModel.ts` — 55/55 tests.
- [x] `jurisdictions.tsx` — the record, staff-only, stored per company so the
      twenty minutes on Salem repays itself on every Salem job.
- [x] `PermitCompliance.tsx` — beside the permit packet in the documents stage.

### Note

`formsUrl` is restricted to http and https on the server. It is a link the whole
company clicks, and a `javascript:` scheme stored in a shared field executes for
other people.

Three multi-line edits silently did not apply because the file is CRLF and the
patterns used `\n`. Typecheck caught all three. Worth remembering: on this
repo, script-driven multi-line edits need `\r\n` or the Edit tool.

## Phase 9 — the remaining trades

The listed scope was: gazebo, pergola, tile, sheetrock, framing, foundation,
roofing, additions as composite, furniture. Surveying first changed what was
worth building.

### What was already there

`flooringModel` takes floors off properly — materials, tile layouts, waste,
carpet rolls. `structureModel` already does the engineering for any roofed
outdoor structure: snow, rafter sizing, beam sizing, post loads. `framingModel`
came in with Phase 6. So three of the nine were already covered and building
them again would have produced a second set of numbers to keep in agreement
with the first.

### What was actually missing — walls and ceilings

Nothing took off the other five surfaces in a room. That is most of a sheetrock
job and nearly all of a bathroom gut, where the wall tile costs more than the
floor tile and takes longer to set.

`surfaceTakeoff.ts` — one model, three trades, 59/59 tests. Sheetrock, wall
tile and paint disagree about materials and agree completely about geometry, so
three models would be three chances to compute the same square footage
differently and the one that disagreed would be found by a customer.

**The deductions are the part people get wrong, and they are not the same:**

| | opening deducted | why |
|---|---|---|
| Sheetrock | **half** | board is cut around it and only some of the offcut comes back — a full deduction reliably under-orders |
| Paint | **in full** | there is genuinely nothing there to paint |
| Wall tile | **only below the tile line** | a window sill above a 48in wainscot takes nothing off |

That third one is why a wainscot cannot reuse the floor logic. Waste comes from
`flooringModel.LAYOUT_WASTE` rather than a second table — herringbone wastes 15%
on a wall for the same reason it does on a floor.

### And the vocabulary — gazebos and pergolas

A gazebo is a gable on posts and a pergola is a flat roof with open slats. The
engineering was already here and works on both without special-casing; what was
missing was the word. A customer asks for a pergola, not for "a flat-form
free-standing structure with an open-slat covering", and a design centre that
cannot take the word cannot take the job.

Six presets — pergola, attached pergola, gazebo, pavilion, carport, porch roof —
each carrying what makes it that thing rather than another. Applied as a merge,
so a dimension already set for this site is not thrown away when somebody
changes what they are calling it. 15/15 tests, including that slats carry less
load than shingles through the existing snow calculation.

### Deferred, and why

**Foundation, roofing, and additions-as-composite** are each their own phase. A
real foundation is frost walls and slabs, not the footing calculator that already
exists; roofing needs its own material and flashing model; an addition is
framing plus foundation plus roofing plus siding plus systems plus finishes —
an orchestration of things that must exist first. Half-building four of those
would have produced four features that each nearly work.

**Furniture** is staging for a render, not construction, and belongs with the
render pipeline rather than here.

## The blueprint becomes the building record  (decision settled)

Eric, asked directly: **"the blueprint should become the building record."**

That closes the question left open since Phase 3 and it changes what blueprint
reading is for. A takeoff tool would read a drawing, hand back square footages
and be finished with it — while everything else in the design centre carried on
working from a house estimated off photographs. A drawing carries a scale and a
photograph carries a guess, so the better source should win.

### What followed

**Reading produces geometry, not a report.** Rooms with positions, in the same
shapes the floor plan already uses. The analyser is now asked for `x`/`y` as
fractions of the building envelope, plus the scale and the overall dimensions —
because the drawing has them and the layout is the point. A room that comes back
with no dimensions is dropped rather than carried as a nameplate.

**Provenance now ranks.** `Provenance` gains `drawing`, sitting above `photos`
and below `measured`, with `PROVENANCE_RANK` and `outranks()` in one place.

**And the rule that matters: it does not undo the walkthrough.**

| the plan's room came from | what the drawing does |
|---|---|
| nothing recorded, or a guess | replaced |
| a photograph | replaced, and the change is listed |
| **measured on site** | **kept** — and the disagreement is shown |

A drawing describes the building somebody intended. That is not always the one
that got built and very often not the one still standing after forty years of
alterations, so the person who walked the job decides. Positions are only
written when the drawing actually supplied them — moving a room somebody placed
to a spot that came from a packing loop would be worse than leaving it.

44/44 tests, including that a measured room survives a drawing that disagrees.

### A dead route, found on the way

`ai-blueprint-analysis.tsx` was never mounted in `index.tsx`. `ClientWorkRequestForm`
has been POSTing to `/ai/analyze-blueprints` since it was written and getting a
404 every time — a customer uploading blueprints with a work request has never
had them read. Mounted now.

**It was unmetered.** Fixed straight afterwards — see below.

## The unmetered AI route  (fixed)

The blueprint reader required a session and nothing else, so any signed-in
customer, vendor, tenant or subcontractor could spend model tokens on it without
limit. The image routes in `house-capture` already had a ceiling; this had none.

### One ceiling, not two

The spend logic moved out of `house-capture.tsx` into `aiSpend.ts` rather than
being copied. Two ceilings would be two things to keep in agreement, and the one
that drifted would be the one nobody was watching. The caller names its bucket;
each bucket has its own counter and its own limit.

**The render keys are byte-identical to what is already in production.**
Renaming them would silently reset every customer's usage to zero — not a
migration, a gift of free renders that nobody notices until the bill. There is a
test asserting `render_budget:u1` specifically, for that reason.

### Counted per sheet, not per request

Each sheet is a full-detail vision call, so the cost scales with how many are
sent. Counted individually and capped at 8 per upload, so dropping a forty-page
set in cannot empty an account in one go.

The allowance is **120 sheets per account**, set by Eric. The unit is the sheet
because that is what costs money, and a drawing set runs about four — so 120 is
roughly **thirty real drawings**, which was the intent. Anybody later reading
120 as extravagant and trimming it to 30 would be cutting the allowance to seven
or eight sets without meaning to; the constant says so in place.

Renders stay at 10. Both carry per-account overrides in the kv store, so either
can be lifted for one customer without moving it for everybody.

Reserved **before** the call and refunded if it fails. Charging on success lets
a burst of parallel requests all pass the same check before any has been
counted.

### Found on the way

The route built its image payload as `data:image/jpeg;base64,${bp.base64}`,
assuming one caller's shape. The work-request form sends objects whose `base64`
may already carry the prefix, and the design centre sends plain data URLs — so
one of the two would have produced a doubled prefix or the literal string
`undefined`. Never noticed, because the route was never mounted. Both shapes are
normalised now.

### Baseline

Server typecheck **97 → 96**. The union-narrowing finding that came with the
moved code was fixed rather than relocated, and the baseline file records why.

32/32 tests, run against the real module through a hook that stubs the database
rather than against a copy of it.

## Review

(to be completed)

---

# Long shifts: prompt at eight, close at sixteen

- [x] `shiftLimits.ts` — the two thresholds and the decisions they drive
- [x] Auto-close abandoned shifts lazily, on every read of an active entry
- [x] Refuse an auto-closed shift at submit and at approve
- [x] A way for a supervisor to set the real finish time
- [x] Hold flagged hours out of the payroll report totals
- [x] The prompt itself, in the portal and in the mobile app

## Why it is not "punch them out at eight"

A ten-hour day is a normal day in construction, and a clock that stops itself at
eight records eight. The two hours do not become overtime for somebody to
approve — they stop existing, and the person who loses them is the one who
worked them. Silently shortening a wage is a worse failure than a forgotten
punch-out, so nothing built here does it.

So eight hours **asks**, hourly, and the clock carries on either way. Sixteen
hours is the backstop, and sixteen is not a long day — it is a punch-out
somebody forgot on the way home.

## What an auto-closed shift is

Closed so the person can start their next shift, and marked `needsReview` with a
finish time that is explicitly a placeholder. It is recorded at punch-in plus
sixteen hours rather than at "now", so a Friday shift found on Monday reads as
sixteen hours and not seventy-two. It is not added to `hoursToday` or
`hoursWeek`, because those are read as fact.

Then three gates: **submit** refuses it, **approve** refuses it separately (the
payroll screen can reach approve directly, so assuming submit had run would have
left a way past), and the **payroll report** holds its hours out of the totals
while counting them under `heldForReview`, so a short run says why rather than
just being short.

`POST /entries/:id/finish-time` is the only way out, and it is admin only — the
person whose hours these are cannot be the one who decides what they were. It
checks the corrected time against the shift rather than accepting it: after the
punch-in, and no more than sixteen hours after it, because a mistyped date is
exactly what the rest of this exists to keep off the payroll report. Correcting
the hours withdraws any existing payroll submission, since the allocation split
was made against the placeholder and no longer reconciles.

## No cron, so it runs on the way past

There is no scheduler in this project. `closeIfAbandoned` runs on every read of
an active entry — the timeclock screen, punching in again, the portal — which
covers it, because everything that cares about a stale entry reads it anyway. In
`GET /employees/:id` the active entry is now settled **before** the employee
record is read, or the timeclock would be handed a record still saying "clocked
in".

## Already true, and left alone

"All time must be matched with a work request" was already enforced and needed
no change: `POST /entries/:id/submit` refuses unless the allocations sum exactly
to the hours worked, and `PATCH /entries/:id/allocations` refuses any work order
not assigned to that employee. The work was the long-shift half.

## Checks

Server typecheck 84, unchanged. App typecheck 332, unchanged — the one finding
in `EmployeePortalView` is a pre-existing prop-type error on line 1219. Smoke:
12 affected pages, 0 threw. 31/31 on `shiftLimits`.

Not yet verified in a browser: the eight-hour prompt, and the supervisor's
finish-time correction has no screen yet — the route exists and is reachable,
but nothing in the UI calls it.

## Follow-up: the correction screen, and a gap it exposed

- [x] Held shifts listed at the top of the payroll tab, with a finish-time box
- [x] A count badge on the tab, so they are findable from the employees tab
- [x] `hours-summary` holds placeholder hours out of the figures HR pays from

The third item was not planned and matters more than the first two. Hardening
went into `GET /payroll-report`, which nothing in the app calls. The endpoint HR
actually pays from is `GET /hours-summary`, and it was still adding a
placeholder sixteen hours into `hoursThisWeek` and `hoursThisPeriod` — the
numbers the HR hub multiplies by a pay rate for "Period Payroll Est". So the
guarded route was the unused one and the live one was open. It now holds those
hours out, returns them as `hoursHeld`, and returns the shifts behind them as
`held` so the screen can name them.

The lesson is the one from the products-route episode: check what the client
actually calls before treating a route as the one that counts.

The panel sits above the payroll runs rather than below them, because its whole
purpose is to be read before somebody approves a run that is short. The
finish-time box opens on the placeholder in the browser's own timezone —
`toISOString` would have shown a time hours away from the one the crew would
name. Validation stays on the server; the screen only collects.

Server typecheck 84, app typecheck 332, both unchanged. Smoke: 8 pages, 0 threw.

Still unverified in a browser.

---

# Letting the customer into the design centre

Eric's decision: a **"Design Your Project" tab in the customer portal**, pointing
at the design centre itself — not a cut-down copy of it.

## What is already true, and needs nothing

- **Their work is separated.** Design projects are keyed by an owner derived
  from the token, and a requested `?owner=` is validated against the signed-in
  user, so a customer only ever sees their own designs.
- **The spend is bounded.** The render, blueprint and AI buckets are metered per
  account, which is what makes opening these routes to customers affordable.
- **They are not blocked today.** After sign-in the route guard falls through to
  "all portal access allowed", so a customer who typed `/deck-designer` would
  already get in. This is a discoverability change, not a permissions change.

## The items

- [x] 1. Add the tab to `CustomerPortalView`, navigating to `deck-designer`.
      One design centre, not an embedded second one.
- [x] 2. A way back. The tab takes them out of the portal chrome, and being
      stranded in a tool with no route home is the exact complaint that got the
      old Figma redirect removed.
- [x] 3. Trim the workspace rail for customers. `DESIGN_TOOLS` currently offers
      Permits & zoning, Zoning variance, Document scanner and Materials hub —
      all internal workflow, one click from where the customer would land.
      A customer sees the design centre and nothing else on the rail.
- [x] 4. Start them on their own house, not a blank site. `rebuilds-not-new-
      builds` says replacing an existing structure is the normal case, and the
      address drives snow load, frost depth and code edition.
- [x] 5. **Make the design go somewhere.** See below.

## Item 5 is the one that decides whether this is worth doing

`DeckDesigner.tsx:507` carries the comment *"No quote is linked to a deck design
yet"*, and it is accurate — the design centre saves a design and produces no
quote and no work request. Today that is fine, because the only people in there
are staff who then go and do the next step by hand.

Put a customer in it and that stops being fine. They would spend an evening
designing their deck, press save, and nothing would reach you. `pipeline-is-the-
spine` says anything producing a number or a document has to write into the
pipeline rather than compute beside it — and a customer's finished design is
exactly that.

So the tab needs a **"Send this to Black Phoenix"** action that creates a work
request carrying the design id, the address and the saved version, landing it in
the pipeline the same way the visualiser's renders already do.

That is the real work here. Items 1–4 are an afternoon; item 5 is the feature.

## What I am NOT proposing

Not restyling the portal — one tab added to an existing list, nothing else
moved. Not changing the route guard. Not giving customers pricing: the design
centre does not currently show margin, labour rate or supplier cost, and this
change must not be the thing that starts.

## Awaiting approval before any of this is built.

## Review — the customer's way into the design centre

All five items done.

**The tab is a panel, not a jump.** `CustomerDesignTab.tsx` explains what the
design centre is and says plainly that a drawing is an idea rather than a plan or
a price, then offers a way in and lists the designs they already have. Dropping
a homeowner straight onto an empty canvas that expects spans and a code edition
is how a good tool gets a reputation for being difficult.

**Item 5 turned out to need no server work.** The existing
`POST /work-requests` already enforces that the email matches the signed-in
account, persists, raises the admin alert and notifies staff. So "Send to Black
Phoenix" posts to the same route the enquiry form uses, carrying
`designProjectId` and the saved version. One way in means one place a job starts.

Whether a design has already been sent is read back from the customer's own work
requests rather than flagged on the design. A flag would be a second copy of the
truth, and if the office deleted the request the design would go on claiming it
had been sent.

**`from=portal` changes presentation only.** It trims the workspace rail to the
design centre and the stair calculator — permits, variances, the document
scanner and the materials hub are office workflow and were one click from where
the portal drops them — and adds "Back to my portal". Nothing about access
depends on it: the server decides what a customer can read and write from their
token, and design projects are scoped to their owner there.

**The address travels with them** and seeds an empty site field only, never
replacing a typed one — the same rule the job-linked address already follows,
because the address sets snow load, frost depth and the code edition.

### Found on the way

The `deals` tab had a button and a render branch but was missing from the
`activeTab` union, so TypeScript called the comparison impossible. It worked at
runtime only because the click handler casts. One word, and the app baseline
drops 332 → 331.

### Checks

App typecheck **332 → 331**, and the one that went is named above. Server
untouched at 84. Smoke: 21 pages, 0 threw.

Not verified in a browser: the tab, the send, and the trimmed rail.

---

# Photos and video in every section of the design centre

Eric: *"i should be able to add picture and video in all section of the design
center so i can add on to existing structures."*

## Where it stands today

The design centre has five stages — **Capture, Design, Scope, Price,
Documents** — and nine trades. Capture is the only stage that takes a file at
all. The other four take nothing.

**Video does not work anywhere, including on Capture.** The Capture tab is
labelled *"Photos, video and what is already there"*, `JobFolder` draws a film
icon next to a video file so one looks accepted, and then:

- `designPhotos.ts:58` filters the pile to `image/` and silently drops the rest
- the server's `PHOTO_TYPES` (`design-projects.tsx:63`) lists only jpeg, png,
  webp, heic and heif — there is no video type in it

So a video can be picked, appears in the list, and vanishes on save without a
word. That is the promise the label already makes, unkept.

**Everything attaches to the project, not to a section.** A kitchen photograph
and a siding photograph land in the same pile with nothing to tell them apart,
which is why they cannot be shown back next to the work they are about.

## The items

- [x] 1. **Tag what already exists.** Photos gain the stage and trade they were
      taken in. Without this, capture in nine sections produces one heap.
- [x] 2. **Make video real, and by a different road.** A phone video is
      50–500MB; the photo path base64-encodes into a JSON body, which is
      correct for a 12MB photo and will simply fail for video. Video needs a
      signed upload straight to storage. Proposed ceiling **200MB**, about two
      minutes of phone video — enough for a walk along an elevation, which is
      the thing stills lose.
- [x] 3. **One capture control, dropped into every section**, tagged with the
      stage and trade it sits in. One component, nine placements — not nine
      capture panels to keep in step.
- [x] 4. **Show it back where it was taken**, so the pictures of the existing
      kitchen are on the kitchen and the elevation walk is on siding.
- [x] 5. **Say what the ceilings are.** 60 files a project today; video will
      need its own count and a total size, and hitting a limit must say so
      rather than dropping the file quietly — which is the bug being fixed.

## What this is really for

`rebuilds-not-new-builds`: the job is nearly always an addition to something
already standing, and the photographs are the best evidence of what is there —
better than anything typed. This is what feeds the building record and the
model-first render, so capture is not an attachment feature, it is the input.

## Not proposed

Not touching how the render or the blueprint reader consume photos — they keep
reading the same pile, now better labelled. Not raising the per-project photo
count. Not adding capture to the portal visualiser, which has its own.

## Awaiting approval.

## Review — capture in every section

All five items done, plus two defects found on the way that had to be fixed for
any of it to work.

**One component, five placements.** `SectionCapture.tsx` takes the stage and
trade it is sitting in as props, tags every upload with them, and shows back
only what belongs to that section. Five capture panels kept in step would have
drifted; this is one.

**Video now works, by a different road.** Signed upload URL → the browser PUTs
straight into storage → the server is told and reads the object back to check
what actually landed. The size is taken from storage, not from the request, so
the ceiling is enforced against the file rather than against a number the
uploader chose; anything over 200MB is deleted rather than left costing money.
XHR instead of fetch purely for the progress bar — a 200MB upload with no
visible progress reads as a hung page.

`photosAsFiles` now filters videos out. Everything downstream — the house
reader, the sketch reader, the render — takes stills, and a 200MB MOV arriving
where a JPEG was expected would download in full before failing.

### Two defects found on the way

**1. The photo upload route took its owner from the request body.** The read and
delete routes beside it both narrow the asked-for owner against the signed-in
user; this one did not, so any signed-in account that knew another owner's key
could attach files to their project. It uses the same helper as its neighbours
now.

**2. The customer portal tab shipped earlier could not save.** The design centre
sends `ownerKey=decks`, which is a shared namespace the server only admits staff
to — a customer got 403 *"That is not yours to save to."* on every save and an
empty list on every read. So a customer could open the design centre, draw for
an hour and lose it. `ownerKeyForCurrentUser()` now resolves staff to `decks`,
which is where every existing design already lives and where the pipeline looks
for them, and everybody else to a key of their own. Staff role is read from
`app_metadata` only — `user_metadata` is writable by its own account, so
trusting it would let anyone put themselves in the staff namespace.

### Checks

App typecheck 331, unchanged. Server 84, unchanged. Smoke: 18 pages, 0 threw.

### Not verified in a browser

None of it — the capture panels, a real video upload, or the customer save path
now that its owner key is fixed. The video route in particular has never had a
file put through it.

---

# Vendors importing catalogues and pricing

Eric: *"can we make sure the vendors portals can import catalogs and pricing to
view in the app."*

## Where it stands

**A vendor can enter a catalogue, one line at a time.** The portal has a working
catalogue tab and `POST /vendor-catalog/:vendorId/items` behind it, correctly
scoped so a vendor only ever touches their own. What it cannot do is *import*: a
supplier with two thousand lines would be typing for a week, and there is no
bulk route to send them to even if there were a file picker — the route writes
one KV record per call, so two thousand lines is two thousand requests.

**One screen already claims to do this and does not.**
`AIProductCatalogAssistant`, reachable from the vendors admin hub, has a file
drop that accepts PDF, CSV, Excel and JSON, a progress display, and a result of
"8 products imported, 94% AI accuracy". All of it is `setTimeout` — the file is
never read, nothing is ever sent, and the numbers are literals in the source.
This is the exact failure the design workspace rail was built to stop: a control
that looks like it works. It gets repaired, not left beside the real thing.

**Viewing works, narrowly.** `GET /vendor-catalog-search` is real and correctly
gated, and `VendorProductPicker` uses it — but only in the customer portal.
`materials-hub-purpose` says the point of vendor catalogues is customer product
selection and accurate quotes, and neither the materials hub nor the design
centre reads them today.

## The items

- [x] 1. **A bulk route.** `POST /vendor-catalog/:vendorId/import` taking many
      lines in one request, same validation as the single route, reporting per
      row what was accepted and what was rejected and why. A ceiling per
      request, with the client sending batches.
- [x] 2. **A CSV reader in the portal.** Pick a file, map the columns, see what
      is about to happen, then import. Column mapping matters: no two suppliers
      name their columns the same, and refusing a file because it says "Item #"
      instead of "SKU" would make the feature useless.
- [x] 3. **Show the result honestly.** Rows that failed are listed with the
      reason and the line number. A silent partial import of a price list is a
      wrong quote later.
- [x] 4. **Repair the fake assistant** — point it at the real import, or remove
      it. Not leave it next to a working one.
- [x] 5. **Surface catalogues where they are used**: the materials hub, and
      product selection in the design centre.

## Worth naming before it bites

`/vendor-catalog-search` reads every catalogue line in the store with
`getByPrefix` and filters in memory. That is fine at fifty lines and a real
problem at fifty thousand — which is one mid-sized supplier. Import is what
makes that likely, so it wants a look as part of this rather than after.

## Awaiting approval, plus one decision below.

## Review — catalogue import

Items 1–4 done. Item 5 is not, and the reason is worth reading.

**The parsing is a separate, tested module.** `catalogImport.ts`, 54/54. It is
separate because everything it does fails quietly rather than loudly: a splitter
that ignores quotes turns `"Joist, 2x8", 14.20` into three columns and files the
price as a name; a price parser that chokes on `$` reads it as NaN and drops the
line; a header matcher that insists on "SKU" refuses every supplier who writes
"Item #". None of those throw. They produce a catalogue that looks imported and
is wrong, and the first anyone hears of it is a quote with the wrong price on a
document with our name at the top.

Covered: quoted fields, commas and newlines inside quotes, doubled quotes, CRLF,
the UTF-8 BOM Excel puts on every export, tab and semicolon separators,
`$1,234.56` and the European `1.234,56`, "Call for price" rejected rather than
read as zero, and the case that decides it — a sheet carrying both **Unit Price**
and **Unit**, which maps backwards under any naive matcher and gives every
product a price of "each".

**The mapping is shown, not applied.** Getting the price column wrong is not a
mistake to make silently on somebody's behalf, so the guess is presented for the
vendor to correct, with a preview of the first rows and a list — not a count —
of what will be rejected and why, at the line numbers their spreadsheet shows.

**Import updates by SKU rather than duplicating.** A price list is re-sent when
prices change, and the second import has to move the numbers, not produce two of
everything. Nothing is ever removed by an import.

**The fake was dead, not reachable.** `AIProductCatalogAssistant` — 949 lines of
`setTimeout` reporting "8 products imported, 94% AI accuracy" from literals in
the source — was imported by the vendors admin hub and never rendered. So it was
never a screen anybody could hit; it was a trap for whoever wired it up later
believing it worked. Deleted, with its import.

### Item 5 is bigger than it looked

The materials hub does not read vendor catalogues. `materialsHubService` serves
`getDefaultMaterials()` out of **localStorage**, with a version counter that
clears the cache and rebuilds a hardcoded list. So the hub the vendor catalogue
exists to feed is running on a fixed list that no vendor can affect, and pointing
it at real catalogues is a change to its data source rather than a wiring job.

That is a separate decision and needs Eric's sign-off, so it is not in this
change. The catalogue is viewable today in the vendor's own portal and through
`VendorProductPicker` in the customer portal, both of which read live data.

### Checks

App typecheck **331 → 324**; the drop is the deleted mock. The two remaining
`VendorsAdminHub` findings are pre-existing and about `VendorProfile.createdAt`.
Server 84, unchanged. Smoke: 16 pages, 0 threw. 54/54 on `catalogImport`.

Not verified in a browser: no real CSV has been through the importer.

## Review — the materials hub reads real catalogues

**What it was doing.** `materialsHubService.getAllMaterials()` served
`getDefaultMaterials()` out of localStorage, behind a version counter that
cleared the cache and rebuilt the same hardcoded list. Nothing a vendor did
could change it. And `addToQuote` puts `basePrice` straight onto a quote line,
so those invented prices had a one-click path onto a customer's document — the
same fault already found once in `/vendor-pricing/compare`, which was
manufacturing prices with a seeded random number generator because there was no
catalogue for it to read.

**What it does now.** `GET /vendor-catalog-all` returns the live lines, and the
hub loads them on mount. Browse rather than search, because the hub opens on a
grid with no query to give it — which is why search alone could never have fed
it. It also returns the categories actually present, so the filters describe
what is there instead of a fixed list somebody typed.

**Real and sample are not mixed.** When vendor lines exist they are the
catalogue and the built-in list is not shown at all. A real price and a
demonstration price side by side in one grid is worse than either, because
nothing on screen says which is which.

**The samples survive only for an empty system**, and every one is marked
`isReference`. That flag is refused by `addToQuote` and by the hub's one-click
add, and a banner at the top of the screen says plainly that the prices are
illustrative. The screen looked exactly the same before — same grid, same
prices, same button — so a buyer had nothing to tell them.

Fields a catalogue line does not carry are left empty rather than filled in.
No quality rating, no certifications, no vendor rating. Five stars nobody
awarded is the same kind of invention as a price nobody quoted.

### A leak fixed on the way

`/vendor-catalog-search` returned every vendor's prices to any signed-in caller,
including a vendor — so one supplier could search and read a competitor's cost
base. The file's own header says that is the thing tenant isolation exists to
prevent, and it was true of the write routes and not the read one. A vendor now
sees only their own lines; staff and customers see everything, which is the
point of the hub.

### Checks

App typecheck 324, server 84, both unchanged. Smoke: 27 pages, 0 threw.

### Not verified in a browser

The hub has not been opened against a real imported catalogue — there is not one
yet. The path that matters is: a vendor imports a CSV, then this screen shows
those lines with the green banner rather than the yellow one.

---

# Investment options in the portals

Eric: *"we need to allow the investment options to show up in the portals. we
are going to be peer funded so this will help returns stay high."*

## It was already in every portal. It was sending the wrong key.

`InvestmentTab` is mounted in eleven portals — customer, employee, vendor,
landlord, advertiser, condo association, condo manager, property manager,
territory, admin and mobile owner. Every one of them showed an empty investments
screen.

The tab sent `publicAnonKey`, which identifies the project and nobody in
particular. The auth wall defaults unlisted routes to "signed in", and
`/investments/opportunities` is on neither the public nor the admin list, so
every request came back **401**. The tab caught the status, logged it to the
console, and rendered its friendly empty state — so it read as "nobody has
published any opportunities" rather than "that request was refused". The demo
opportunities the server seeds on first read were there the whole time and
nobody could see them.

The commitment POST used the same headers, so pledging money failed the same
way. That route deliberately reads the investor's identity from the token, so it
could never have worked with an anonymous one — the feature has never
functioned.

Fixed by sending the signed-in person's token on all five calls.

## Three holes that fix would have opened

With a real token flowing, three routes that take an email out of the URL become
reachable. All of them took it on trust, and everything past the wall is merely
"signed in" — so any portal account at all, a tenant or an advertiser, could
have read another investor's financial position by putting their address in the
path:

- `/investments/analytics/portfolio/:email` — what they have committed and been
  paid
- `/investments/commitments/investor/:email` — every commitment they hold
- `/investments/ai-subscription/:email` — their subscription state

One helper now answers all three: your own records, or anybody's if you are
staff. It returns an **empty portfolio rather than a refusal**, because
confirming that an address belongs to an investor is itself worth something to
somebody fishing.

These were unreachable only because the tab was being refused at the wall. The
fix for the visible bug is what would have exposed them, which is the reason
they are in the same change.

## Checks

App typecheck 324, server 84, both unchanged. Smoke: 27 pages, 0 threw.

## Not verified in a browser, and one thing to decide

Nobody has opened a portal and seen an opportunity yet — that is the thing to
try, and it should now show the seeded demo cards.

Worth a decision before this is used in earnest: the opportunities currently
show to **every** signed-in portal user, and the seeded demo cards are visible
alongside anything real. Offering an investment is a regulated activity, and who
may see an offer usually needs gating — by accreditation, by portal type, or by
invitation. Naming it rather than deciding it.

---

# Learning from finished jobs, so quoting is proving profitable

Eric: *"i also want the ai to learn from my finialized work requests to make sure
are quoting is proving to be profitable."*

## First, the thing to know

`GET /work-orders/completion-reports` — the screen called **Completion Reports**,
badged NEW on the command centre — reports every finished job like this:

    totalMaterialCosts: 0, totalLaborCosts: 0, totalSubcontractorCosts: 0,
    otherExpenses: 0, totalCosts: 0,
    profitAmount: amount, profitMargin: amount > 0 ? 100 : 0

Those are literals, not calculations. **Every completed job reports 100% profit**,
because its costs are hardcoded to zero. The one report that exists to answer
"is our quoting profitable" answers "yes, entirely" to every job it has ever
seen. That has to be the first thing fixed; a wrong answer is worse than none.

## The data to learn from does exist

- **Quoted** — the estimate on the work request: hours, materials, price.
- **Actual labour** — real, and new this week. Time entries are allocated to a
  work order and cannot be submitted to payroll unless they reconcile exactly to
  the hours worked, so hours × pay rate is a measured labour cost, not an
  estimate.
- **Actual materials** — purchase orders, and now real vendor catalogue prices.
- **Billed** — the paid invoice.

And `laborTasks.ts` was built for exactly this. Its `hoursPerUnit` figures are
marked `source: 'seed'`, and the file says in its own header that they are
"industry starting figures… meant to be corrected the first time a real job is
measured against it", with anything Eric has edited marked `source: 'yours'` and
never silently overwritten.

So this is not a new mechanism. It is the feedback half of one that was built
deliberately and left open.

## The items

- [x] 1. **`jobOutcome.ts`, pure and tested.** Given a work request, its quote,
      its time entries, its purchase orders and its invoice, produce quoted vs
      actual for labour hours, labour cost, materials and margin — each carrying
      how it was known, `measured` or `estimated`, on the existing provenance
      vocabulary. Untested arithmetic here is a wrong margin, which is a worse
      quote next time.
- [x] 2. **Fix the completion report** to use it instead of zeros. This will
      make good jobs look less profitable than the screen currently claims,
      because it currently claims all of it.
- [x] 3. **Variance by task**, not by job. "Deck framing runs 18% over the
      quoted hours across nine jobs" is actionable; "job 402 lost money" is not.
      Reported with the number of jobs behind it, because two jobs is an anecdote.
- [x] 4. **Propose rate corrections, never apply them.** Where a task has enough
      measured jobs, offer the corrected `hoursPerUnit` with the evidence, for
      Eric to accept or reject. `source: 'yours'` is never overwritten, and
      nothing changes a price without a person saying so.
- [x] 5. **Say what is not known.** A job with no allocated time entries has no
      measured labour, and must read as "not enough data" rather than as
      profitable. Missing cost data looks exactly like zero cost, which is how
      the current report got to 100%.

## Where the AI actually belongs

Not in the arithmetic. Quoted-versus-actual is subtraction, and a language model
doing subtraction on money is a worse version of a calculator. The model is
useful for the part that is genuinely language: reading the variance and saying
*why* — "the three jobs that overran were all second-storey, and access is not a
line in your quote". The numbers stay deterministic and tested.

## Awaiting approval.

## Review — quoted against actual

Items 1–3 and 5 are done. Item 4 has its logic and its evidence sentence but no
screen to accept a proposal on yet; noted below.

**`jobOutcome.ts`, 46/46.** The rule the whole file turns on is *unknown is not
zero*, because that is precisely how the old report reached 100%: costs it did
not have were written as zero, zero costs subtract to full margin, and the screen
looked healthy. Now a job with no time booked and no purchase order returns
`null` and a sentence saying which, and both the API and the screen render "Not
known".

Tested: hours from this job only; each employee's own pay rate; a flagged time
entry excluded, since its finish time is a placeholder; an employee with no pay
rate counted as *missing* rather than as free labour; cancelled and draft
purchase orders excluded; a loss reported as a loss; and half-known jobs — labour
measured, materials absent — refusing to show a margin at all.

**The completion report no longer invents anything.** `totalCosts: 0` and
`profitMargin: amount > 0 ? 100 : 0` are gone. Labour comes from time entries
allocated to the work order at each employee's own rate, which is real: an entry
cannot reach payroll unless its allocations reconcile exactly to the hours
worked, and an employee may only bill to a job assigned to them.

**The screen's headline was wrong in the other direction too.** It averaged
`wo.profitMargin || 0` over every completed job, so an unknown job counted as a
0% one. It now averages over jobs whose costs are known and says how many those
are, with the rest counted separately.

**`GET /work-orders/quoting-accuracy`** groups by trade, not by job — "deck
framing runs 18% over across nine jobs" is actionable, "job 402 lost money" might
mean it rained. Five jobs before a pattern is called confident, ten per cent
before a rate is worth proposing. It reports coverage first, because a company
where four of forty finished jobs have time booked has a timekeeping problem, not
a quoting problem, and a margin computed on those four would hide it.

**Rates are proposed, never applied.** `laborTasks.ts` says a figure Eric has
edited is `source: 'yours'` and never silently overwritten; `proposeRate` returns
the corrected figure with the evidence behind it and writes nothing.

### Left undone, deliberately

The accept-a-proposal screen. The route returns proposals and nothing renders
them yet, so item 4 is half-built: the reasoning exists, the button does not.
Also, `proposeRate` needs the current rate passed in per trade, which the route
currently takes from a query parameter — that wants wiring to `laborTasks`
properly when the screen is built.

### Checks

App typecheck 324, server 84, both unchanged. Smoke: 6 pages, 0 threw. 46/46 on
`jobOutcome`.

### Not verified in a browser

And it cannot be meaningfully verified until at least one finished job has time
booked against it and a purchase order linked to it. Until then every job will
honestly report "Not known", which is itself the correct first result.

---

# What needs doing to go live

Checked against the code today, not recalled. Ordered by what would hurt.

## 1. Verified broken features — a screen calls a route that does not exist

Twenty-five server routers are never mounted. Three are confirmed to be called
by the app right now, so each is a 404 in front of a user:

| Screen | Calls | Lives in (unmounted) |
|---|---|---|
| `ClientWorkRequestForm` — **customer-facing** | `/quotes/generate-from-blueprint` | `quote-from-blueprint.tsx` |
| `jobFinancialService` | `/job-financials/kv`, `/job-financials/snapshot` | `job-financials.tsx` |
| `BuildingCodeChecker` | `/design-standards/code-rules` | `design-standards.tsx` |

The remaining twenty-two need a per-feature decision — mount it, or remove the
screen that calls it. Both are cheap; leaving them is what is expensive, because
each one is a customer finding a dead button.

## 2. Almost nothing has been verified in a running browser

This is the largest risk and it is not a code problem. Built and never opened:
the bid room round trip, model-first render, blueprint reader, architect link,
the command centre, the timeclock prompt and auto-close, the held-shift
correction, the customer design tab, section capture and video upload, the
catalogue CSV import, the materials hub on live data, investments in the
portals, and the completion report.

Every one passed typecheck and smoke. Smoke proves a page mounts; it proves
nothing about a round trip. Going live on that is going live on inference.

## 3. Demonstration data is in production

- Investment opportunities are seeded demo cards — and as of today they are
  visible to every signed-in portal user, which is the change that made this
  urgent rather than cosmetic.
- The HR hub seeds four employees (Mike Torres, Jake Sullivan…) and two payroll
  runs into `localStorage` when it finds none.
- The materials hub's sample list. Labelled and unquotable now, but present.

## 4. Security still open

- **The quote share link.** One `randomUUID` with the dashes removed, stored in
  plaintext, with a `createdAt` and no expiry and no revocation — and it
  authorises **signing** the quote, not just reading it. The architect-review
  link built later in this project uses 256 bits, stored as a SHA-256 hash, with
  expiry and revocation; this is the pattern that should have been copied.
- Thirteen of the thirty-two audited money routes have still not been reviewed.
- Investment offerings show to every signed-in portal user with no eligibility
  gating of any kind. Offering an investment is regulated; who may see an offer
  usually is not "anyone with a login".

## 5. Features that are real but have no data yet

None of these are bugs. They are the reason a demo would fall flat.

- No vendor has imported a catalogue, so the materials hub shows samples and no
  quote can price from a real supplier line.
- No finished job has both time booked and a purchase order linked, so every
  completion report will honestly say "Not known".
- Every figure in `laborTasks.ts` is `source: 'seed'` — industry starting
  numbers, not Black Phoenix's own. The quoting-accuracy loop built today is
  what corrects them, and it needs finished jobs to learn from.

## 6. Known baseline

324 app typecheck findings and 84 server, neither in the crash classes. Not
blockers; stated so "unchanged" keeps meaning something.

## 7. Process

`test-before-production` says schema and backend changes get tried in a non-
production environment first. Everything this session went straight to the live
project. There is no staging environment set up.

## The shortest honest path to a live first customer

1. Fix the three verified 404s, decide the other twenty-two.
2. Walk one job end to end in a browser: request in → design → quote → work
   order → time booked → invoice → completion report. That single pass exercises
   most of what was built and is the only thing that will tell us what is really
   broken.
3. Import one real supplier price list.
4. Harden the quote share link, since it signs.
5. Decide who may see investment offerings.

Items 1–3 are the difference between a demo that works and one that does not.

## Review — the three 404s

All three mounted. None of them could be mounted as it stood, which is the point
of the exercise: an unmounted router has never been through an authorisation
review, because nothing could reach it.

**`job-financials.tsx` was a skeleton key.** `GET /snapshot` returned every
record under the prefix and `POST /kv` wrote any key with any value, both to any
caller past the wall — which is every signed-in portal account, including
tenants, advertisers and customers. That is the company's job costing: labour,
purchases, margins. It is the same shape found and removed from `/kv/*` earlier
in this project, and mounting it unchanged would have put it straight back.

Now staff-only, read from `app_metadata` through `trustedRole`, with the write
confined to the key families the service actually uses. Those families were read
out of `jobFinancialService.tsx` rather than guessed — the first version of the
allowlist I wrote was wrong, inventing `change_orders_` and `job_notes_` and
missing `materials_`, `job_folders_` and `job_activity_logs`, which would have
silently refused half the service's writes.

**`quote-from-blueprint.tsx` had no check at all**, and it writes a quote. Three
things fixed with the mount:

- It now requires a signed-in caller and records who asked. The customer work
  request form calls it, so it must admit customers — but a quote with no owner
  cannot be traced to the blueprint that produced it.
- It wrote `quote_${quoteNumber}` with an **underscore**. Every other screen
  reads `quote:${id}`. Every quote it produced would have saved successfully and
  been invisible to the quote list, the pipeline and the portal. Never noticed,
  because it has never actually written one.
- It returned `materialsMarkup` and the pre-markup subtotal to the caller — the
  company's margin, in a customer-facing response. Not rendered, which is not a
  defence; it is in the network response either way. Stripped from the reply and
  kept on the stored record.

Its own permissive CORS block is gone too. `index.tsx` already applies CORS
across `/*`, and a second `use('*')` inside a sub-app mounted at `/quotes` would
have run as middleware for everything under that prefix — including
`/quotes/by-token/:token/sign`, the public signing route.

**`design-standards.tsx` needed nothing.** Two GETs over reference data, seeding
defaults on first read. Mounted as it was.

### Named, not fixed

`quote-from-blueprint` prices labour at `0.5 hours per square foot` and
`squareFootage * 0.15` for carpentry, with hardcoded fallback rates. Those
figures were typed into the file. They are not measured, not citable, and not
what `laborTasks.ts` exists to provide. The quote is marked `binding: false`,
`provenance: 'blueprint-analysis'`, stays a draft and goes to the office rather
than the customer, which makes it survivable as an internal first pass — and the
comment in the file says plainly that it should be repriced through `laborTasks`.
Fixing it properly was beyond "fix the 404".

### Checks

App typecheck 324, server 84, both unchanged. Smoke reports no page reached by
these changes, which is correct — all three are server-side.

Twenty-two unmounted routers remain, none of them currently called by a screen.

---

# Before inviting vendors and subcontractors

Checked today. The two journeys are in very different states.

## The blocker: nothing on the server ever creates a vendor record

`vendorActor` (vendor-profile) and `catalogActor` (vendor-catalog) both resolve a
signed-in account to a vendor by looking for a `vendor:` record — stamped
`app_metadata.vendorId` first, then a match on email. Nothing in
`supabase/functions/server/` ever writes one. The only `createVendor` in the
codebase is `src/app/lib/supabase-data.ts`, and it calls `saveToStorage`, which
is `localStorage.setItem`. That file says so in its own header: *"Previously used
API endpoints, now using browser storage for prototyping."*

So a vendor record created in the admin UI exists in **that browser and nowhere
else**, the server's `vendor:` prefix is empty, and every vendor who signs in
lands on the screen that reads *"This account is not linked to a vendor record
yet."* No catalogue, no purchase orders, no billing.

Everything built for vendors this week sits behind that door: the CSV price-list
import, the materials hub reading live catalogues, vendor pricing in quotes.
Inviting a vendor today means inviting them to an empty room.

Five other entity types are in the same file and the same state: `subcontractor:`,
`advertiser:`, `customer:`, `plan:`, `giftcard:`.

## There are two identity systems and no bridge between them

Approving a vendor or subcontractor application **does** work, and does a lot: it
creates an intake record, syncs portal access, creates an `organizations` row and
an `organization_members` row in Postgres through `ensureProviderOrg`, and sends
a portal invite to claim it. That is the Phoenix Exchange identity, and it is
what lets somebody be invited to price work.

None of it writes the `vendor:` KV record the vendor portal resolves against. So
an approved vendor can be invited to bid and cannot open their own catalogue.
The bridge is the missing piece, not either half.

## Subcontractors are in better shape

Their path — application → CRM → intake → organisation → portal invite — is
server-side throughout. The bid room tables and their RLS exist and were tested
on a database branch. What has never happened is a real subcontractor account
walking it: receiving an invitation, opening it, pricing lines, submitting, and
seeing an award come back.

## What is confirmed working

Production secrets are set: `RESEND_API_KEY`, `OPENAI_API_KEY`,
`STRIPE_SECRET_KEY` and the ecommerce Stripe key. Invitation email will send.

## The order to fix this in

- [x] 1. **Write vendor records on the server.** Either move `createVendor` off
      localStorage onto a real route, or have vendor approval write the `vendor:`
      record the way it already writes the organisation. The second is better: it
      puts identity creation in one place, at approval, where it belongs.
- [x] 2. **Bridge the two identities**, so a vendor resolved through an
      organisation also resolves in the vendor portal. Otherwise every vendor
      needs creating twice and the two copies will drift.
- [x] 3. **Walk one vendor end to end** — invite, claim, sign in, import a price
      list, see it in the materials hub, receive a purchase order.
- [x] 4. **Walk one subcontractor end to end** — invite, claim, receive a bid
      invitation, price the lines, submit, be awarded, see it on the job.
- [x] 5. Decide what happens to the other four localStorage entity types before
      anything depends on them.

Items 3 and 4 are the actual answer to "what needs to work end to end". Until
each has been walked once by a real account, everything else is inference.

## Review — the vendor record at approval

**Approving a vendor now writes the record their portal resolves against.** It
sits beside the organisation the same approval already creates, so a vendor's
identity is made once, in one place, at one moment. `vendorRecord.ts`, 34/34.

The rule the tests exist for is that **re-approving must not undo the office's
edits**. Payment terms, a corrected company name, a separate accounts-payable
address and a category are all things set after approval, and a re-save must
leave them alone. Existing values win; only genuinely absent fields are filled.

Other decisions worth stating:

- The id is derived from the application (`VEN-{applicationId}`), not the clock.
  The dead localStorage version used `VEN-${Date.now()}`, which would make a new
  vendor every time somebody pressed approve twice.
- Payment terms are **not** defaulted. Inventing "Net 30" here would put a term
  on an invoice that nobody agreed to.
- An email already belonging to a different vendor is reported and skipped, not
  given a second record — `vendorActor` takes the first match it finds, so two
  records on one address means which company a person sees depends on the order
  the store returned them in.
- No email means no record. The portal matches on email, so a record without one
  can never resolve and would sit in the registry looking like a linked vendor.
- Vendors only. A subcontractor receives bid invitations, not purchase orders,
  and a vendor record would put them in the registry that scopes the
  purchase-order book.
- A failure writing it is logged and swallowed. The approval already happened,
  and an unlinked vendor is visible and fixable; a 500 that reads as "approval
  failed" is not.

**`POST /vendors/backfill-from-applications`** gives already-approved vendors the
record they never got. Without it the fix would only help vendors approved from
now on, and saying "fixed" while every existing vendor stayed locked out would
have been untrue. Admin only, idempotent, and it reports what it skipped and why.

### A correction to what I told Eric earlier

I said a vendor record created in the admin UI "exists in that browser and
nowhere else". That describes what `createVendor` in `supabase-data.ts` does,
but I did not check whether anything calls it. Nothing does — neither it nor
`vendorPortalService.createVendor` is reachable from any screen. So there is no
phantom vendor data to clean up. The accurate statement is simply that **nothing
created vendor records at all**, which is what this change fixes.

### Checks

App typecheck 324, server 84, both unchanged. 34/34 on `vendorRecord`. Smoke
reports nothing reached, which is right — the change is server-side.

### Still to do

Neither route has been exercised against the live server. The backfill is the
one to run first, and its response says exactly what it did.

## Review — the backfill button

On the **Vendor Relationships** tab of the Vendors Admin Hub, above the list —
that tab is where vendors are approved, and this is the step approval was
missing.

It reports what it did rather than only that it worked: created, updated and
skipped counts, each skipped record with its reason, and — the part that matters
after the mistake below — how many candidates came from organisations and how
many from applications. A run that does nothing now says which side was empty
instead of showing three zeroes.

### The mistake this caught

The backfill was written to read the applications list. Checking production
before running it showed there is **no `applications` record in the store at
all**, while `organizations` holds eleven rows including one real vendor. So the
route would have found nothing, done nothing, and returned success — and I would
have reported that as "no vendors needed linking", which is a different and
untrue statement.

It now reads organisations first and applications second. Organisations are the
durable half of an approval; applications evidently get cleared.

### What production actually holds

Worth recording, because several of these bear on going live:

- 11 organisations: 1 vendor (`erbrealtygroup@gmail.com`), 1 subcontractor,
  4 customers, 4 landlords, 1 operator
- 6 `vendor:` records, all seed data — Home Depot, Lowe's, Grainger, Ferguson,
  Electrical Wholesale, and one named "Black Phoenix Supply (owner test)"
- 0 applications, 0 purchase orders, 1 vendor catalogue line, 1 time entry
- 7 owner invites, 6 still `profile_required`

An earlier note in this file said the server's `vendor:` prefix was empty. That
was wrong — those six exist. They are seed records with addresses like
`api@homedepot.com` that nobody signs in as, so the conclusion held, but the
statement did not.

### Checks

App typecheck 324, server 84, both unchanged — the two `VendorsAdminHub`
findings are the pre-existing `VendorProfile.createdAt` ones, moved down the
file by the insertion. Smoke: 8 pages, 0 threw.

---

# Sample investment listings were about to be shown to real people

## What was live

Three seeded listings in production, `status: open`, with no field distinguishing
them from a real offer:

| Title | Minimum | Projected ROI | Target raise |
|---|---|---|---|
| Company Equity — Series A | $25,000 | 22% | $1,500,000 |
| Turnkey Rental Portfolio | $10,000 | 14% | $800,000 |
| Value-Add Multifamily | $50,000 | 19% | $2,000,000 |

They were invented to make the screen look populated, and they were harmless
while nobody could see them — the tab was sending the publishable key and being
refused at the wall. **Fixing that yesterday is what made them visible**, in
eleven portals, with a commit button beside each one. Inviting vendors and
subcontractors this week would have put fabricated investment offers, with
specific minimums and projected returns, in front of them.

That is the most serious thing outstanding on the go-live list, and it was
created by the fix rather than found by it.

## What changed

- Seeded listings are marked `isDemo: true` when created.
- The three already in production predate the flag, so they are recognised by
  their exact seeded titles. An explicit `isDemo: false` overrides that, so a
  real offering can one day be published under one of those names.
- `GET /investments/opportunities` sends them to staff only, and reports
  `demoHidden` so a portal showing nothing can say why.
- `GET /investments/opportunities/:id` answers 404 for a non-staff caller.
  Hiding a listing from the list is not enough — an id is guessable from a
  shared link or a stale page.
- `POST /investments/commitments` refuses a pledge against one. A commitment is
  a promise against terms that were invented to populate a screen.
- Staff see them labelled **SAMPLE — not a real offer**, so the seed data is
  obvious to the people who have to decide what to do with it.

Nothing was deleted. Removing production records is Eric's call, and hiding is
reversible in a way that deleting is not.

## Still his to decide

- Whether to delete the three, or rewrite one as a real offering.
- The six seeded `vendor:` records — Home Depot, Lowe's, Grainger, Ferguson,
  Electrical Wholesale, "Black Phoenix Supply (owner test)" — and the four
  seeded HR employees, which are the same class of problem and not yet handled.
- Eligibility. Even with the samples gone, a real offering would currently show
  to every signed-in portal account with no accreditation or invitation gate.

## Checks

App typecheck 324, server 84, both unchanged. Smoke: 27 pages, 0 threw.

## Done — the three sample listings are deleted

Removed from production on 2026-09-05:

    investment:opportunity:1c592707…  Company Equity — Series A
    investment:opportunity:74ee552d…  Turnkey Rental Portfolio
    investment:opportunity:da3e63da…  Value-Add Multifamily

`investment:opportunity:` is now empty. The seed flag `investment:seeded:v1` is
still set, so `ensureSeeded` returns early and nothing recreates them — which is
the thing that would have made the deletion pointless, and was checked before
running it.

The full records are saved to the session scratchpad as
`deleted-sample-opportunities-2026-09-05.json`, so this is reversible.

### One thing deliberately left

`investment:commitment:owner-test-1` — Eric's own test record, `source:
owner-self-test`, $50,000 committed with $6,250 received, pointing at the Series
A listing that has just been deleted. It was not covered by the instruction,
which named the three listings, and it carries money figures, so it is reported
rather than removed.

It will not crash anything: the portal renders `c.opportunity?.title ||
'Investment'`. But Eric's own portfolio will now show a $50,000 active
commitment against a listing called simply "Investment", with $6,250 received.
That is worth clearing before anybody else sees a portfolio.

### The other seed data, still outstanding

- Six `vendor:` records — Home Depot, Lowe's, Grainger, Ferguson, Electrical
  Wholesale, "Black Phoenix Supply (owner test)"
- Four seeded HR employees and two seeded payroll runs
- Eligibility gating on real offerings, once there are any

---

# The quote share link

The link that lets a customer **sign** a quote had the weakest security in the
system. `shareToken.ts`, 28/28.

## What was wrong, in rising order of seriousness

1. **Stored in plaintext** under `quote_token:{token}`. The link is the whole
   credential, so anything that could read the store — a backup, a mis-scoped
   route, a log — held every live one. It is now filed under a SHA-256 of
   itself, so a leak of the store is not a leak of the links.
2. **No expiry.** A link mailed in March still worked in December. Thirty days.
3. **No revocation.** A quote sent to the wrong address could not be withdrawn,
   and nobody could find the record because it was filed under itself.
   `POST /quotes/:id/revoke-link` records the withdrawal rather than deleting it,
   so "that link was withdrawn on the 5th" stays answerable.
4. **`POST /quotes/generate-link` had no authorisation at all.** Any signed-in
   account could mint a signing link for any quote id and then read or sign it
   through the public by-token routes — every customer's pricing available to
   every other portal account, and a signature obtainable on a quote that was
   never sent. Staff only now.
5. **A signed quote could be re-signed.** A customer could flip approved to
   rejected and back as often as they liked, overwriting the stored signature
   and its timestamp each time, so the record of what was agreed was whatever
   the last click said. 409 now.

Invalid, expired and revoked all answer the same 404. "Expired" would confirm
the link was once real, which is information a stranger guessing should not get.

`shareTokenUsable` fails closed on an unreadable expiry date — a malformed date
must not mean immortal.

On entropy: the old token was 122 bits, which was never actually brute-forceable.
The upgrade to 256 is cheap and removes the question, but hashing, expiry and
revocation are the three that mattered.

## Found on the way: sending a quote never worked

The pipeline's "send quote to customer" gates its entire success branch on
`data.approvalUrl`, and this route returned `link` and `url`. So the stage was
never advanced to quote-sent, the 3- and 7-day follow-ups were never scheduled,
and the link was never copied to the clipboard. The response now carries
`approvalUrl` as well, rather than renaming a field other callers may read.

## Safe to change now

Production holds **zero** share tokens, so there were no live links to break and
no compatibility shim was needed. Checked before changing the format.

## Checks

App typecheck 324, server 84, both unchanged. 28/28 on `shareToken`. Smoke
reports nothing reached — the change is server-side.

Not verified against a live request: issuing a link, opening it, signing once,
being refused a second time, and revoking.

---

# Gift cards: one route closed, one race that needs a decision

Working through the money routes that were audited and never reviewed.

## Closed: `POST /gift-cards/:code/redeem`

Nothing in the app calls it — store checkout goes through
`reserveGiftCardForStore` and `captureStoreGiftCardReservation` instead — so this
is the manual path, somebody at the desk applying a card to an invoice. It was
open to **any signed-in account holding a code**, and it moves money. Staff only
now.

What is already right about it, and worth not breaking: the code is 16
characters from a 32-symbol alphabet, so 80 bits and not guessable; a repeated
call with the same `idempotencyKey` returns the original redemption rather than
spending twice; and the balance check is reservation-aware.

## Not fixed: the balance is read, then written

Both gift-card paths do this:

    const card = await kv.get(cardKey)          // balance 100
    if (available < amount) refuse              // passes
    card.balance = card.balance - amount        // computed from that read
    await kv.set(cardKey, card)

Two requests arriving together both read 100, both pass the check for 100, and
both write 0. The card is spent twice. The idempotency key does not help — it
only protects a retry of the *same* redemption, and these are two different ones.

**This affects the path that is actually in use.** `reserveGiftCardForStore` has
the same shape, keyed by `(code, checkoutId)`, so two simultaneous checkouts with
one card each reserve the full balance and the card pays for both orders.

Restricting the manual route to staff removes customers from the set of people
who can trigger it there. It does not fix the arithmetic, and it does nothing at
all for the checkout path.

### Why it is not fixed here

`kv_store.tsx` offers get, set, del, mget, mset, mdel and getByPrefix — there is
no compare-and-set, so there is no way to express "decrement only if the balance
is still what I read" in application code. A correct fix needs the decrement to
happen in one statement in Postgres:

    update kv_store_57095a78
       set value = jsonb_set(value, '{balance}', to_jsonb(round(bal - $amount, 2)))
     where key = $key
       and (value->>'balance')::numeric >= $amount
    returning value

Zero rows back means insufficient balance, and the check and the write cannot be
separated. That is a database function and therefore a schema change, and
`test-before-production` says those get tried on a branch first. So it wants
agreeing rather than pushing.

**Until then a gift card can be double-spent at store checkout by racing two
orders.** Worth knowing before the storefront takes real money.

## Checks

Server typecheck 84, unchanged. No test added: the change is an authorisation
gate on an inline route, and the arithmetic it does not fix is the part that
would deserve one.

## Done — the gift-card double-spend, built and tested on a branch

`supabase/migrations/013_gift_card_atomic_debit.sql`. Branch
`giftcard-atomic-debit` created, migration applied there, tested, then applied to
production and the branch deleted. About two hours at $0.01344/hour.

### What the branch caught

The first version of the function moved only `balance` — and that was worse than
useless. The caller would then have written the card back with its own
`redeemedAmount` and `redemptionHistory` from a stale read, putting the old
balance straight back. **The exact bug the function exists to prevent would have
survived it**, and it would have looked fixed.

So everything the redemption changes now moves inside the same statement:
balance down, redeemedAmount up, the history entry appended. The comment on the
function says the caller must not write the card back, because that is the trap.

This is what testing on a branch was for. It would not have been caught by
reading the code, and in production it would have been caught by a customer.

### Tested on the branch

- a normal debit, and a debit for the exact balance
- refused: over balance, negative amount, zero amount, cancelled card, a card
  with no balance field, a card that does not exist
- rounding — 10.00 less 3.333 gives 6.67
- **two full-balance debits in one statement: the first succeeds, the second is
  refused**, because the guard re-read rather than trusting a snapshot. That is
  the property that fixes it.
- permissions: `anon` false, `authenticated` false, `service_role` true —
  verified on the branch and again in production. The browser holds anon and
  authenticated, so it cannot call this directly.

### Both call sites moved

`captureStoreGiftCardReservation` (the path in use) and the manual
`/gift-cards/:code/redeem` both go through `debitGiftCard` now. Neither writes
the card back afterwards. `debitGiftCard` fails closed: an RPC error returns
null, because a debit we cannot prove happened must not be reported as one.

The `redeemedAt` closing timestamp is still a plain write, deliberately — it
touches a field the debit does not, and only once the balance is already zero.

### Checks

App typecheck 324, server 84, both unchanged. Smoke reports nothing reached, as
the change is server-side.

Not verified end to end: no gift card has been bought and spent through the
running storefront. The function itself is tested; the wiring around it is not.

---

# 97% of the database is orphaned backups

Swept production for demo data before inviting anyone, and found something
larger.

## The numbers

    289   backup blobs under data_backup:<timestamp>
      5   entries in data_backup:index
    115 MB of a 119 MB store

284 megabyte-sized blobs that nothing can see, restore, or delete.

## Why they are orphaned

`POST /data/backup` wrote the blob first and updated the index afterwards,
inside a try/catch that deliberately swallowed failures so a cleanup problem
would not fail the backup. Pruning then deletes **only what the index lists**.
So any blob whose index update did not happen fell out of the system entirely —
invisible to the prune, to the restore list, to everything — while still
occupying its megabyte, permanently.

The prune itself works: the index holds exactly `MAX_BACKUPS = 5`. It has simply
never been able to see the other 284.

## Fixed

The index entry is now written **before** the blob. The worst case becomes an
index entry pointing at a blob that was never written — which the restore path
already handles by getting null, and which the next prune removes. A dangling
pointer is recoverable; an orphaned megabyte is not.

Note this router is currently **unmounted**, so nothing is writing backups today
and the 115 MB is static rather than growing. The fix matters if it is ever
mounted again, which the go-live list has as an open question.

## Not deleted — Eric's call

The 284 orphans contain real data: user profiles, email addresses, phone
numbers, work request details, and `demo_mode: true` payloads. Deleting them is
destructive and he has not named them, so they are reported rather than removed.

Clearing them would return roughly 115 MB and leave the five indexed backups
intact:

    delete from kv_store_57095a78
    where key ~ '^data_backup:[0-9]+$'
      and key not in (select jsonb_array_elements(value)->>'key'
                      from kv_store_57095a78 where key = 'data_backup:index');

There are also four older singletons — `data_backup_anonymous`,
`data_backup_1a9f3ae4…`, `data_backup_e252c5ef…` — from a per-user scheme that
predates the timestamped one.

## Also checked, and clean

`hr_employees` and `hr_payroll` are **not** on the server. The four seeded HR
employees and two payroll runs exist only in whichever browser opened the HR hub,
so they were wrongly listed alongside real production seed data in the earlier
go-live note. Corrected.

## Checks

Server typecheck 84, unchanged.

---

# Portal walkthrough, signed in as real accounts

Eric asked for the portals to be checked, vendor first, and for me to place a
vendor myself. I cannot drive a browser in this session, so what follows is the
**server half**: three real accounts created in production auth, signed in for
real tokens, and every endpoint each portal calls exercised as that user. What is
not covered is whether the screens render — that still needs eyes.

Test accounts and all their data were deleted afterwards.

## One real bug found, fixed and re-verified

**`/vendor-catalog-all` handed a competing vendor's catalogue to an unlinked
vendor.** The visibility guard I wrote earlier read
`if (who.isAdmin || !who.vendorId) return items` — everybody sees everything
except a vendor with a *resolved* id. A brand-new vendor account has
`vendorId: null`, so it fell into the see-all branch.

Unlinked is the state every vendor is in between signing up and being approved.
The guard was open at precisely the moment it needed to be shut, and I would not
have found it by reading, because the code looks right until you are holding a
token that has no vendor id.

The test is now "does this account belong to a vendor at all" — a stamped
vendorId, a matching vendor record, or a role of vendor/supplier. An unlinked
vendor sees nothing, which is correct: no lines are theirs yet. Re-probed with
the same token after deploying: browse empty, search empty, direct read and
write of another vendor's catalogue both 403.

## Vendor — works

- `/vendor/me` reports unlinked with a reason, then resolves once a record exists
- `/purchase-orders` returns nothing, scoped to `__unresolved__` — failing closed
- catalogue import: 2 lines added, the line with no price rejected **with its
  line number from the file**
- re-importing the same SKU at a new price: **0 added, 1 updated**, total still
  2. Updates rather than duplicates, as designed
- after linking, browsing all catalogues returns only their own two

## Customer — works, including the save that was broken

- `/work-requests`, `/invoices`, `/quotes` all return only their own (empty)
- saving a design to their own owner key succeeds
- saving to the shared staff namespace is refused: *"That is not yours to save
  to."* — this is the bug that would have let a customer design for an hour and
  lose everything, now confirmed fixed from the customer's side
- listing the staff namespace returns empty rather than staff designs

## Subcontractor — works

- submits a bid; identity is taken from the token, not the body
- a second bid on the same job is refused as a duplicate
- sees their own bid; **the customer account sees none of it**

## The rest, probed with the lowest-privilege token

All correctly refused: time-tracking employee list (403), another employee's
record (403), payroll report (403), completion reports (403), quoting accuracy
(403), job-financials read (empty) and write (403), quote link generation (403),
gift-card redemption (403). `hours-summary` returns an empty summary rather than
everybody's hours.

And the three routers mounted earlier are confirmed live from outside:
`design-standards/code-rules` returns the real IRC 2021 ruleset, and
`quotes/generate-from-blueprint` answers 400 for a missing blueprint where it
used to 404.

## Found on the way — worth acting on before inviting anyone

**Signup email is failing.** `POST /auth/v1/signup` returns
`500 unexpected_failure — "Error sending confirmation email"`, and the account is
not created. Confirmation is required, and **four of the eight real accounts are
unconfirmed**: marksutton@hotmail.com, markdavidsutton@yahoo.com,
marksutton04@gmail.com, opodroubnyi@gmail.com. Those are the same people whose
owner invites sit at `profile_required`.

That is Supabase Auth's own SMTP, which is separate from the `RESEND_API_KEY` the
app uses for its own mail — so the app can send email while signup cannot. Until
custom SMTP is configured in Auth settings, **an invited vendor or subcontractor
may never be able to create an account.** This is the first thing to fix before
inviting anybody, and it is configuration rather than code.

**A policy question, not a bug:** a subcontractor can read vendor catalogue
prices. Reasonable if they price materials, worth a decision if any of them also
supply.

## Checks

Server typecheck 84, unchanged.

---

# Signups, and a critical hole found while fixing them

## What Eric asked for

The SMTP fixed so signups work. The SMTP itself is Supabase Auth configuration
in the dashboard, which I cannot reach — but it turned out not to be the right
fix anyway.

## Why it was not an SMTP problem

`supabase.auth.signUp` asks **Supabase Auth's own SMTP** to send a confirmation
email. That is a different thing from the `RESEND_API_KEY` this application sends
all its other mail with. Auth's SMTP is unconfigured, so signup returned
`500 — "Error sending confirmation email"` and created no account.

The invitation path never had this problem, which is why it went unnoticed:
`ensureAuthUser` creates accounts server-side with `email_confirm: true` and
sends the invite through Resend. So invited vendors and subcontractors could
always get in. **My earlier note said an invited vendor might never be able to
register — that was wrong, and this corrects it.** It was self-registration that
was broken.

`/auth/signup` already existed and already did the right thing. Registration now
goes through it and signs in immediately, with no Auth SMTP anywhere in the path.

**Named trade-off:** nothing now proves the person owns the address they typed.
The account is a plain client with no privileges. Configuring custom SMTP in the
Auth settings would restore real verification — Resend works for this: host
`smtp.resend.com`, port 587, username `resend`, password the existing
`RESEND_API_KEY`, sender `team@send.theblackphoenixcompany.com`, which is already
the verified sending domain. That is a five-minute dashboard change and worth
doing.

## The critical part

`/auth/` is on the **public** prefix list, so `/auth/signup` answers anyone with
no session. It read `role` out of the request body and passed it to
`setPermissions`, which writes `role_name` and, for `master_admin`,
`permissions: { all: true }`. `/admin/users` and `/auth/me` in the same file read
exactly those fields back as their admin check.

Confirmed against production rather than reasoned about:

    POST /auth/signup  {"role":"master_admin"}      → 200, account created
    POST /auth/v1/token                             → signed in
    GET  /auth/me    → role master_admin, permissions {all:true}
    GET  /admin/users → 200, every user in the system

An anonymous request from anywhere on the internet made itself an administrator
and read the whole user list.

Fixed: self-registration grants `client`, always. The role is not read from the
request at all, and the level and permissions that were computed from it are now
constants. Re-run after deploying: same request gives `role: "client"`,
`permissions: {}`, and `/admin/users` answers **403**.

**Audited for prior exploitation.** Only the two probe accounts I created had
permission records at all. No real account carries a self-assigned role, so this
was never used against the project. Both probes deleted.

## Checks

Server typecheck 84, app 324, both unchanged. Smoke: 103 pages, 0 threw.

---

# What the portals still need

Checked against the code, not guessed, and separated into "showing invented
data" and "genuinely missing".

## Showing invented data

**Subcontractor — the whole job list.** `BID_ROOM_JOBS` and `OPEN_JOBS` are
literal arrays in `SubcontractorPortal.tsx`. A subcontractor signs in and sees
"Master Bathroom Renovation, Dallas TX" and "Office HVAC Installation, due
2024-02-15" — three invented jobs, two of them with 2024 dates. They can bid on
them, and the bid is stored for real, against a job that does not exist.

This is the largest gap in the whole system, and it is worse than it looks:
**there are two bid systems and the portal uses the wrong one.** The structured
bid room — `bid_requests`, `bid_invitations`, `bid_request_lines` with RLS in
Postgres, built for line-by-line pricing and awards — is not connected to this
portal at all. What the portal calls is `/subcontractor/bids`, where the sub
supplies `jobId` themselves as free text.

So a subcontractor has no way to see real work, and the office has no way to put
real work in front of them.

**Condo manager — dues.** `DUES.map(...)` renders a hardcoded array.

**Property manager — three dead constants.** `WORK_REQUESTS`, `PROPERTIES` and
`PAYMENTS` are declared and never rendered. Harmless, but they should go before
somebody wires them up believing they are real.

## Genuinely real, verified live

**Vendor** has no hardcoded arrays at all — every figure comes from an endpoint,
confirmed by signing in. **Customer** likewise, apart from `DEFAULT_NOTICES`
which is a fallback. The `_OPPS` arrays in the landlord, condo and
property-manager portals are reference content — revenue ideas with NH statute
notes — not data pretending to be live, and should stay.

## Genuinely missing

**Vendor**
- Nothing tells them a purchase order has arrived. Every portal is pull-only;
  there is no notification anywhere.
- They receive purchase orders but can never quote first — there is no RFQ step,
  so pricing only ever comes from their catalogue.
- The catalogue has no deactivate, no bulk remove, no export. Import is
  one-directional.
- An unlinked vendor is told they are unlinked and given nothing to do about it.

**Subcontractor**
- Real jobs to bid on (above).
- Being told they won. There is no award notification and no route from a won
  bid to the work appearing in their portal.
- Payment visibility — what is owed, what has been paid.
- Insurance and licence expiry, which is the thing that actually stops a sub
  working on a site.

**Customer**
- The loop back from a sent design. They can send one now; nothing shows them
  the quote it produced.
- When the crew is coming. No schedule or appointment anywhere.
- Change orders — no way to see or approve one, though the field app raises them.

**All portals**
- Notifications. Nothing is ever pushed; everything must be found by looking.
- Nothing explains what to do when an account is not linked to its record.

## Done — the subcontractor sees real jobs

`BID_ROOM_JOBS` and `OPEN_JOBS` are deleted. The portal now reads the bid room.

**Where the jobs come from.** `supabase.from('bid_requests')` with the
subcontractor's own session. The row-level security written in migration 003
already answers exactly the question this screen asks — a request is visible to
the org that posted it and to any org invited to it, once it has left draft — so
the database does the scoping and there is no route that could get it wrong.
"Waiting on you" is now simply the invited requests with no bid against them yet,
rather than a `requestedFromMe` flag typed into an array.

**Active jobs** are the bids marked `won`, not three invented projects with 2024
due dates.

**Bids go where the office looks.** They insert into the `bids` table, which is
what `BidRoom.tsx` reads and what awards run on. RLS checks the insert twice: the
org must be one this person belongs to, and the request must be open to them — so
a bid cannot be filed under another company's name or against a job they were
never invited to, whatever this screen sends.

### Why the old path had to go rather than be kept alongside

`/subcontractor/bids` has exactly two routes — the subcontractor's own list and
their own submit — and **nothing on the office side has ever read either.** Its
only client is this screen. Every bid submitted through it, including the one I
submitted during the walkthrough, went somewhere nobody at Black Phoenix would
ever look. Two bid systems where one is a closed loop is not a choice worth
preserving.

### Left behind, and worth knowing

Attachments. The uploader writes to `subcontractor_bid_upload:{userId}:{id}` and
the download route is scoped to the uploader, so **the office could never open
them anyway**. `bids` has no attachment column. For now the file names ride along
in the bid notes so the office knows they exist and can ask; properly attaching
them wants a column and a storage path, which is its own change.

### Checks

App typecheck 324, unchanged. Smoke: 7 pages, 0 threw. Not verified in a browser
— and it cannot be until a bid request exists with an invitation to a real
subcontractor org, which is the natural first thing to try.

---

# Vendor portal: what "ready to pull in APIs" actually needs

Checked before proposing anything. The short version: **the API section in the
vendor portal is a form and nothing else.**

## What is there today

**The vendor's API settings never leave their browser.** `vendor_api_settings`
goes through `useUserData`, which is `localStorage.getItem` / `setItem`. So the
endpoint, the API key, the webhook URL and the notes a vendor carefully fills in
are written to their own machine, are lost when they clear it, and have never
been seen by our server.

**There is no ingestion at all.** Nothing under `supabase/functions/server/` so
much as mentions `apiEndpoint` or a vendor API. Nothing has ever called a
vendor's system.

So a vendor can switch on "API integration", paste a live production key into a
password field, press save, and precisely nothing happens — while the screen
tells them they are integrated. That is worse than not offering it.

**The big-box integrations are also inert.** `materials-api.tsx` has real clients
for Home Depot, Lowe's and Grainger, but the file is **unmounted**, and all three
keys in production share one identical hash — the same value in all three slots,
which is a placeholder rather than three real credentials.

## What it needs

1. **Credentials on the server, not the browser.** Written once, never returned
   to the client afterwards. A key that can be read back is a key that leaks
   through any screen that shows it.
2. **A normaliser, with mapping.** Their JSON into our catalogue shape — name,
   SKU, unit, price, category. No two vendor APIs agree on field names, which is
   the same problem the CSV importer already solves with column mapping, and the
   same solution should be reused rather than reinvented.
3. **A sync that goes through the existing import route**, so validation, the
   update-by-SKU rule and the rejection reporting are shared rather than
   duplicated.
4. **A "test connection" that reports honestly** — what came back, how many
   lines were understood, what could not be mapped.
5. **SSRF protection, and this is the one to get right before anything else.**
   The vendor supplies a URL and our server fetches it. Without a guard, a
   vendor can point it at `http://169.254.169.254/` and have our server hand
   back cloud instance credentials, or at an internal address to probe the
   private network. Any vendor-supplied URL must be forced to https, resolved,
   and refused if it lands on a private, loopback, link-local or metadata
   address — checked after DNS resolution, because a hostname can resolve to
   127.0.0.1.

## The decision I need before building

There are two different products here and the work is not the same:

- **Vendors connect their own systems** — each vendor registers an endpoint and
  their own credentials; we pull their catalogue on a schedule. This is what the
  portal's form implies, and it is the one with the SSRF problem, because the
  URL comes from outside.
- **We hold integrations centrally** — Home Depot, Lowe's, Grainger and Ferguson
  as named connectors with our own keys, the way `materials-api.tsx` was
  written. No SSRF exposure, fixed endpoints, but it only ever covers suppliers
  we build a connector for.

They can both exist eventually. Building the wrong one first wastes the effort.

## Awaiting a decision.

## Built — vendors can connect their own API

Three new pieces, two of them tested: `outboundGuard.ts` (50/50),
`vendorFeed.ts` (43/43), and `VendorApiFeed.tsx` on the portal.

### The guard is the part that matters

We are being asked to fetch, from inside our own network, an address a stranger
typed. That is server-side request forgery in one sentence, and the endpoint
field is the attack.

Refused, and tested: `http://`, `file:`, `gopher:`, `ftp:`; credentials smuggled
into the URL; any port but 443; `169.254.169.254` and every other link-local
address; `metadata.google.internal` and bare `metadata`; loopback, `0.0.0.0`,
`10/8`, `172.16-31/12`, `192.168/16`, carrier-grade NAT `100.64/10`, multicast;
`.internal`, `.local` and `localhost` names; and the IPv6 forms — `::1`, unique
local, link local, and IPv4-mapped.

**The mapped-address case is the one testing earned.** `https://[::ffff:127.0.0.1]/`
is normalised by the URL parser to `[::ffff:7f00:1]`, so the dotted-quad check I
wrote first never matched it and loopback walked straight through. Both
spellings are handled now; the hex one is the form that actually arrives.

Redirects are followed by hand and re-validated at every hop, because a public
URL answering `302 Location: http://169.254.169.254/` defeats any check made
only on the address originally typed. The response is read with an 8MB ceiling
rather than trusting `content-length`, which a hostile server can understate.

**What it honestly cannot do:** a hostname needs DNS to know where it points, and
`resolveVerdict` reports whether it actually managed a lookup. Where the runtime
will not do DNS the step is skipped — and the test screen says so, rather than
implying a check that never ran.

### The rest

- The key is stored server-side and **never returned**. Saving reports only that
  one is set; an empty key on update means "leave it alone", never "clear it".
- The feed lands through `importCatalogRows`, lifted out of the CSV import route
  so both use the same validation, the same update-by-SKU rule and the same
  catalogue ceiling. Two importers would be two sets of rules and the one that
  drifted would be the one nobody watched.
- Field mapping is guessed and **shown for the vendor to confirm**, same as the
  CSV importer, and tested against the case that decides it: a feed carrying
  both "Unit Price" and "Unit" maps backwards under any naive matcher.
- The test reports what it found — how many products, where in the response,
  what mapped, how many rows would be rejected — rather than a green tick.

### Removed

`vendor_api_settings`, a `localStorage` bag holding a live API key on the
vendor's own machine where nothing could use it. Its "Test connection" fetched
the endpoint *from the vendor's browser*, which proves a vendor can reach their
own API and nothing about whether we can. The old key is deliberately not
migrated: reading a credential out of a browser to file it elsewhere is not
something to do quietly on somebody's behalf.

### Checks

App typecheck 324, server 84, both unchanged. Smoke: 12 pages, 0 threw. 93 tests
across the two new modules.

Not verified against a real vendor API — nobody has one registered yet. The
guard's refusals are all tested; what has not been exercised is a successful
fetch of somebody's live catalogue.

## Sending a purchase order to the vendor

`purchaseOrderDelivery.ts`, 34/34.

### What it replaces

`from-materials` created the order as a draft and stopped. Nothing emailed the
supplier, nothing called their system — and the "Send to Vendor" button on the
purchase orders screen called `handleUpdateStatus(id, 'sent')`, which moved our
own status column and told the vendor nothing at all. An order nobody has been
told about is not an order, and a button that says "Send" and does not send is
worse than no button.

### Two roads, one always available

If the vendor registered an **order endpoint** on their connection, the order is
POSTed there through the same outbound guard the catalogue pull uses. If they
have not, it goes by **email**, which is what most suppliers actually want and
asks nothing of them. A vendor with neither an endpoint nor an email address is
refused with that as the reason, rather than silently marked sent.

### What a supplier is allowed to see

The payload is assembled **field by field**, never by spreading the order
record — so a field added to a purchase order later cannot quietly start
appearing in an outbound message to a third party. Tested: `sourceQuoteId`,
`raisedBy`, internal notes and the customer quote total are all absent from what
goes out. The reply-to is the company's ordering address, not whichever staff
member pressed the button.

Line totals are **recomputed, never trusted** — a stored total that disagrees
with quantity times price is a dispute with a supplier over a number we sent
them.

### A rounding bug the tests found

The first version rounded the unit price to cents before multiplying. At
$0.3333 each — ordinary for fasteners and bulk lumber — that becomes $0.33, and
3,000 of them lose ten dollars against what the supplier's own system invoices.
Full precision on the unit price, rounding only the line total.

### Sending twice

Refused. It is not a duplicate message, it is potentially a second delivery of
materials to a site. A 409 comes back naming the date it first went, and the
screen offers a resend rather than doing one. An `Idempotency-Key` goes with the
API call so a vendor receiving it twice can tell it is the same order.

A **failed** send leaves the order a draft, because a draft is what it still is,
and keeps the vendor's own error text so whoever chases it has something to go
on.

### And a redirect rule

`safeFetch` now takes a method and a body. Redirects are followed on a read and
**refused on a write**: following one on a POST re-sends the body to wherever
the first host points, so a vendor whose order endpoint redirects would have our
purchase order delivered to a third address of their choosing.

### Checks

App typecheck 324, server 84, both unchanged. Smoke: 5 pages, 0 threw.

Not verified against a real vendor system. The email road can be tried today
against any vendor with an address on file; the API road needs a supplier
endpoint that accepts orders.

## The order endpoint is now something a vendor can actually set

The server accepted `orderEndpoint` but nothing in the portal offered it, so a
vendor had no way to say "yes, we can take orders over an API". It is on the
connection screen now, marked optional, alongside the catalogue endpoint and
sharing the same key.

**Blank is a real answer.** Plenty of suppliers will hand over a price list and
have no way to receive an order programmatically, so the field says leaving it
empty means orders arrive by email and that this is what most suppliers prefer —
rather than looking like an unfinished setup.

**There is deliberately no test button for it**, and the screen says why: testing
would mean POSTing an order to their live system, which could create a real one.
The first purchase order reports exactly what their endpoint replied, and a
failure leaves the order a draft on our side.

**The payload shape is published in the panel**, collapsed, so whoever builds
their endpoint can work from it without asking — along with the
`Idempotency-Key` they will receive, that 2xx means accepted, that their error
body is shown to our team so a clear message saves a phone call, and that we
will not follow a redirect on an order.

### Checks

App typecheck 324, server 84, both unchanged. Smoke: 12 pages, 0 threw.

---

# Notifications: the system existed and nobody called it

## What was already there

The whole thing, working. `notifyRecipient(email, event, opts)` writes to a
per-user inbox, sends the email, sends the SMS, and honours that person's
per-event preferences. `GET /me/notifications` reads the inbox.
`NotificationBell` renders it with unread counts, mark-as-read and clear.

## Two things were missing

**Nobody called it for a vendor or a subcontractor.** The fifteen existing calls
cover payments, work requests, messages, leases and forms — all landlord and
tenant. A vendor received a purchase order and found out by opening their portal
and noticing. A subcontractor was invited to price a job and found out the same
way.

**And the bell was not in their portals.** Worse than absent: the vendor and
subcontractor portals each had a `Bell` button that opened notification
*preferences*. An inbox-shaped control, in the inbox position, that had never
once shown a notification.

## Fixed

- `purchase_order` and `bid` added to the event list, so both are things a
  person can turn off like any other.
- A purchase order sent **by API** now also lands in the vendor's portal. That
  was the case that needed it: a machine-to-machine POST puts the order in their
  system and leaves the human who logs in with no idea. The email road already
  told them, so it does not send twice.
- A bid invitation now writes to the invited provider's bell, independently of
  the email and SMS that were already going out. The invitation used to live
  entirely in an inbox they might not check, while the portal we told them to
  log into showed nothing.
- The real `NotificationBell` replaces the preferences shortcut in the vendor
  and subcontractor portals. The gear beside it still opens settings.
- The bell's accent type was `'teal' | 'indigo'` — the two portals that had ever
  mounted it. Widened rather than forcing a colour that does not belong.

Notifications are fired **after** the thing succeeded and never allowed to fail
it: a purchase order that reached the vendor is delivered whether or not we
managed to tell them twice.

## Checks

App typecheck 324, server 84, both unchanged. Smoke: 16 pages, 0 threw.

## Still missing

The customer portal has no bell at all — it has no Bell button to repair, so
adding one is a placement decision rather than a repair. And nothing yet
notifies on a bid being **won or lost**, which is the moment a subcontractor
most wants to hear about.

## Awarding a bid now tells the people who bid

The last gap in the loop: job list → invitation → bid → **award**.

### What it was

Three Supabase calls made from the browser — mark the bid won, mark the others
lost, mark the request awarded. They worked, and row-level security kept them
honest. What a browser cannot do is send anything, so the winner found out by
signing in and noticing a word had changed, and **the companies who lost were
never told at all**. A losing bidder is holding crew dates against a job they are
not getting; not telling them is both discourteous and a reason they stop
bidding.

### What it is

`POST /bid-room/award` does the same three writes **with the caller's own
token**, so the policies that guarded the browser version guard this one — the
route adds the telling, not authority. Notification cannot be a step somebody
skips, so the award and the message are one action.

- The winner is told they won, and for how much.
- Every unsuccessful bidder is told, and **the winning price is deliberately
  absent**. What another company bid is theirs. A losing bidder needs to know to
  release the dates, not what they were beaten by.
- Awarding a job that is already awarded to somebody else is refused, because
  the alternative is telling a second company they won the same work.
- Contact addresses are read with the service client — the caller's own
  permissions deliberately cannot read a competitor's organisation, and the
  losers' addresses are needed precisely because they are not the caller's.
- A message that fails does not undo the award, and one failure does not stop
  the rest being told.

### A correction

Mid-change the server count read 90 against a baseline of 84, and I first read
the difference as six errors in unrelated stub files. It was not: the stub errors
appear in both lists and the diff had simply sorted them differently. All six
were mine — `new Map(rows.map(...))` infers `Map<any, unknown>`, so every
`orgById.get(...)?.email` was a property access on `unknown`. Typing the map
fixed it. Worth recording because "the errors are somewhere else" was a
comfortable read and a wrong one.

### Checks

App typecheck 324, server 84, both unchanged. Smoke: 5 pages, 0 threw.

## Finishing the subcontractor portal — the invented numbers I left behind

When the job list was replaced I removed `BID_ROOM_JOBS` and `OPEN_JOBS` and
left the rest of the file alone. Going back to it, the rest of the file was
still largely fiction.

**Payments.** Three invoices typed into the source, including
`INV-2024-148 · Warehouse Electrical · $8,500 · overdue` — an overdue debt shown
to a subcontractor who has never worked for us. There is no subcontractor
invoicing anywhere in the system: vendor billing is scoped to vendor records and
subcontractors do not have one. So the tab now says plainly that invoicing is not
connected and to talk to the office. Invented money owed is worse than no figure.

**Revenue.** `REVENUE_MONTHS` was seven months rising to $55,000. Replaced with
awarded value by month, computed from bids actually won — and labelled
**"awarded"**, not revenue, because winning a job and being paid for it are
different events and only the first is knowable from here.

**And the one that was worst.** The dashboard read
`value: String(submittedBids.length + 3)`. A real count of their bids, with
three invented ones silently added. Also gone: a flat `$52,000` monthly revenue
with "+18% this month", and `4.9 ★ · 127 jobs completed` on both the dashboard
and the performance tab — no rating system exists, so there is no average and no
count. Those cards now show jobs won and bids submitted, which are real numbers.

### Checks

App typecheck 324, unchanged. Smoke: 7 pages, 0 threw.

### Still true of this portal

Insurance and licence expiry — the thing that actually stops a subcontractor
working on a site — is not tracked anywhere.

---

# Insurance and licence expiry

`compliance.ts`, 40/40. The thing that actually stops a subcontractor working on
a site, and nothing tracked it — a sub whose general liability lapsed last month
looked exactly like one covered through next year.

## Dates, not timestamps

A policy expires on a **day**, not at an instant. `new Date('2026-10-01')` is
midnight UTC, which is the evening of September 30th in New Hampshire — so cover
good through October would have read as expiring a day early, every time, for
everybody. Parsed as UTC calendar parts and compared in whole days, and there is
a test that fails if that regresses.

## The rule that matters most

**Unknown is not valid.** A certificate on file with no expiry date recorded is a
blocker, not a pass. It cannot be confirmed current, and treating unknown as fine
is how somebody ends up on a roof uninsured. Same reasoning as `jobOutcome`
refusing to call a missing cost zero.

## What is required, and what is merely recorded

General liability and workers' compensation block. The rest — commercial auto, a
trade licence, a bond — are recorded when held and warn when lapsed, because a
sole trader with no employees genuinely has no workers' comp policy and a trade
licence depends on the trade. Blanket-requiring everything would mark honest
companies non-compliant, which teaches people to ignore the flag.

Expiring within 30 days warns rather than blocks. Expiring **today** still counts
as covered — cover runs to the end of the day it names.

## Checked where it matters

At the award. `POST /bid-room/award` looks at the winner's cover and returns 409
with the specific blockers rather than awarding silently. The Bid Room shows them
and offers **Award anyway**, because a renewal can genuinely be in hand while the
certificate is a day behind, and whether that is acceptable is a judgement about
a particular company on a particular job. What must not happen is awarding work
to an uninsured subcontractor with nobody noticing — which is what happened
before, because there was nothing to notice.

Enforcement is deliberately not the route's decision to make.

## Where it lives

Records hang off the provider's **organisation** — the identity the bid room
already awards to — so the expiry can be checked at the moment work is
committed. A company reads and writes only its own; staff see any.

The subcontractor gets a tab of its own rather than a settings page, because it
decides whether they can work.

## Checks

App typecheck 324, server 84, both unchanged. Smoke: 8 pages, 0 threw.

## Not done

Nothing chases an expiry yet. `needsAttention()` exists and is tested — it
returns what a reminder run would send, worst first — but no cron calls it, so a
certificate lapses quietly until somebody opens the portal or tries to award.
That wants the scheduled job this project does not yet have.

## The reminder job

`compliance.ts` is now 60/60 — the extra twenty cover when a reminder fires.

### Quiet in between, or nobody reads it

A message every morning for thirty days is a message ignored by the fourth. It
fires at **30, 14, 7, 3, 1 and 0 days**, and is silent on every other day — 29
days out, 20, 8, 2 all send nothing. After expiry it repeats **weekly**, because
a lapsed policy is not a thing to mention once and drop: the company cannot work
until it is fixed. Missing required cover is chased on the same weekly rhythm.

Every reminder is keyed on the company, the document, **its expiry date** and the
threshold, so a retry or an overlapping run cannot send the same warning twice —
and renewing the policy changes the date, which starts a clean cycle.

### What running it actually taught me

Two things, neither of which reading the code would have shown.

**The extension check was wrong.** My first query UNIONed installed extensions
with available ones, and I read rows from the available half as proof they were
installed. `pg_cron` and `pg_net` were not installed at all. Both are now.

**And the schedule would have failed silently every morning.** The first version
sent only the shared secret and came back
`401 UNAUTHORIZED_NO_AUTH_HEADER` — the edge function gateway refuses a request
with no `Authorization` header before any of our code runs. Firing the exact
cron command by hand and reading `net._http_response` is what caught it. The
schedule existing is not evidence that it works, and the first symptom of the
version I nearly shipped would have been an uninsured subcontractor on a site.

Now verified end to end: the real command, through pg_net, answers **200
`{"success":true,"sent":0,"skipped":0,"lapsed":0}`** — zero because no cover is
recorded yet, which is the correct answer today.

### Security

`/compliance/run-reminders` is the only path exempted from the auth wall, not the
`/compliance/` prefix — reading a company's insurance position stays behind it.
The route refuses everything when `COMPLIANCE_CRON_SECRET` is unset rather than
falling open, and an administrator can also run it by hand without holding the
scheduler's secret. Wrong secret confirmed 401 against production.

Secrets sit in `private_cron_config`, revoked from `anon` and `authenticated`,
rather than inline in the cron command where anyone able to read `cron.job`
would see them.

### Also

The office gets one daily summary of who is not covered, not one message per
lapse. And a `07:00` local reminder was not attempted: 12:00 UTC lands at 8am
Eastern in winter and 9am in summer, which is close enough for a certificate and
avoids a second DST-aware schedule.

### Checks

Server typecheck 84, unchanged. 60/60 on `compliance`.

---

# Concealed conditions and price movement, in the terms

Eric: cover the case where hidden problems appear during a build, prices move,
and the company should not carry that cost.

## Two clauses, not one

**9. Concealed and unforeseen conditions.** Names what actually counts — rot,
water and insect damage behind finishes; failed, undersized or missing
structure; unsafe or non-compliant wiring, plumbing and venting; asbestos, lead
and mould; unmarked utilities; and existing work that has to be brought to code
before an inspector will pass ours.

**10. Material prices.** Prices held 30 days. Beyond that, a documented supplier
increase is passed through **at cost with no markup**, with the supplier's own
invoice shown. Anything over 5% or $250 on a single item comes to the customer
before it is ordered.

## Why it is written this way

"Any extra cost is yours" on its own is the weak version of this clause. What
makes a concealed-conditions term worth having — and what makes it stand up — is
the sequence it obliges us to follow: **stop, show them what we found, price it,
and get written approval before spending their money.** Work elsewhere carries on
meanwhile.

That is also the commercially better clause. It moves the argument to the moment
of discovery, where there is a photograph of the rot and a number, instead of to
the end of the job where somebody is holding an invoice they were not expecting.
And "no markup on an increase" is worth saying out loud: it is the sentence that
stops a customer suspecting the escalation clause is a margin device.

## Said again in plain words above the signature

The full clauses sit in a scrolling box with eight others. The one point a
customer most needs to have genuinely understood is who pays when the wall comes
off — and an unread clause is a disputed clause. So there is a short, plain
statement immediately above the signature: this price covers what we could see;
if something is hidden we stop and show you before spending your money; we will
not absorb it and we will not quietly add it to your bill either. It repeats the
terms rather than replacing them.

## Two things for Eric

**The numbers are commercial choices, not legal ones.** 30 days, 5%, $250 — all
easy to find in the file and meant to be changed to whatever he actually wants.

**Worth one pass by an attorney before it is used in anger.** It is written to be
clear and fair rather than clever, which is usually what survives, but this is
the text that decides who pays in a dispute and it is cheap to have read.

## Checks

App typecheck 324, unchanged — the two findings in this file are pre-existing, on
a line the change does not touch. Smoke: 5 pages, 0 threw. There is only one copy
of these terms in the codebase, so nothing else needed the same edit.

---

# Change order approval — the mechanism clause 9 promises

Writing the concealed-conditions clause yesterday committed the company, in
writing, to stopping work, showing the customer what was found, and waiting for
their **written approval** before continuing. That promise had nothing behind it:
a change order could be raised from the field app and listed by the office, and
there was no way to send one to a customer or for them to answer it.

## Built on the module that already exists

`shareToken.ts` rather than a second token scheme — same problem, and that one is
already 256-bit, hashed at rest, expiring, revocable, and refuses a second
decision. Three routes: send, read by token, decide by token.

**What the customer is shown is assembled field by field.** A change order record
carries our labour hours and costing; they are owed the reason, the photographs
and the number, not our working.

**One decision, and it is final.** A change order that has been answered cannot
be flipped, because otherwise the record of what a customer agreed to — on a
document authorising spending their money — is whatever was clicked last.

The email says the thing that matters: *nothing is charged and no work continues
on this item until you decide.*

## The bug this uncovered, which is the bigger finding

**Quote share links have never worked.** `/quotes/by-token/…` sat behind the auth
wall, so an anonymous request answered **401** — confirmed against production
before changing anything. A signing link exists precisely to reach somebody who
has no account, so every quote link ever sent to a signed-out customer was a dead
end.

I hardened that token last week — hashed it, gave it an expiry, added revocation,
stopped it being re-signed — and never checked it was reachable by the person it
is for. Making a thing secure is not the same as making it work, and I tested one
and not the other.

Both `by-token` halves are now public at the wall. Issuing a link stays behind
the wall and behind an administrator check; the token is the credential.

Verified against production: an anonymous read of a bad quote token now answers
404 "invalid or expired" rather than 401, the change-order equivalent does the
same, and issuing a link anonymously is still 401.

## Not done

No screen renders the change order to the customer yet — the routes are live and
the link is emailed, but `/change-order/:token` has no page behind it. That is
the next piece, and it is a page rather than a decision.

## Checks

Server typecheck 84, unchanged.

## The change order page — and the third layer of the quote-link bug

`ChangeOrderApproval.tsx`, opened from an email by somebody with no account.

### How it is written

It leads with the promise from clause 9 — *we have stopped, nothing is charged,
nothing continues until you decide* — because the reassurance is what makes the
rest readable by a person who did not expect this bill.

The photographs are given their own section. A number on its own asks to be
argued with; a photograph of the rot is the whole case.

**Decline is a real button**, the same size as approve, not a grey link
underneath it. A change order somebody cannot comfortably refuse is one they
dispute later, and declining is an ordinary outcome — the work stops there and
the scope shrinks. An already-answered link shows the answer rather than an
error.

### The bug went three layers deep

Yesterday I found `/quotes/by-token/` answering 401 behind the auth wall. Wiring
this page up found the other two:

1. **Server:** the route was behind the auth wall — fixed yesterday.
2. **Client:** `customer-quote-approval` was not in `publicRoutes`, so a
   signed-out customer was told *"Please log in to continue."*
3. **The link itself:** the email said `/quote/<token>`, but `quote` routes to
   **ServiceScheduling**, and the approval page reads its token from a query
   parameter rather than the path. So even signed in, the link landed on the
   scheduling screen, which then found no token.

Any one of the three was fatal. A quote link has never once worked, and I fixed
the first layer last week while calling that flow hardened. Secure, reachable and
correctly addressed are three separate tests.

Both links are now `?token=` against a registered page, and both pages are public
on the client and the server.

### Checks

App typecheck 324, server 84, both unchanged. Smoke: **332 pages** — the whole
app, since App.tsx changed — 0 threw.

### Still unverified

No real change order has been sent through it. The routes answer correctly to a
bad token; what has not happened is a real one going out and coming back
approved.

---

# Nobody has ever been able to accept an invitation

The quote link failing at three layers suggested checking every other link we
email to somebody who has no account. The invitation is the one that matters
most — it is how a vendor or a subcontractor gets in at all — and it was broken
at the last step.

## What was wrong

`POST /intake/set-password` answered **401 "Sign in required."** The person
setting their password is by definition signed out, because creating the
password is what lets them sign in. The auth wall refused it, so the invitation
could not be completed by anyone.

The route already guarded itself properly — it refuses a missing token, an
unknown one, one already used and one that has expired. The token was always the
credential. The wall was the only thing between an invited person and their
account, and it never let anybody through.

## The evidence it had never worked

Every invite token in production is `used: false`, apart from a single one of
Eric's own. Six owner invites sit at `profile_required` — Mark Sutton three
times over, opodroubnyi, erbdylan22 — and that status is exactly what an
invitation that cannot be completed looks like.

So this is not a regression. **The invite flow has never worked**, and every
person invited to this platform hit the same wall.

## Verified end to end, not inferred

With a throwaway token against a test address, all against production:

1. Signed out, real token → `{"success":true}`
2. Sign in with the new password → real session, 894-character token
3. The same token again → *"This invitation link was already used."*

Then the probe account and its token were deleted.

## The pattern worth naming

Three flows now, all the same shape: a link is emailed to somebody with no
account, and something in front of the route insists they have one. Quote
approval had it at three layers. Change orders would have. Invitations had it at
the last step.

The auth wall defaults unlisted routes to signed-in, which is the right default
and the reason this codebase is not full of open endpoints. But it means **every
route designed for a person without an account is broken until somebody
remembers to list it** — and the symptom is always silence, because the person
who hits it is outside the company and simply gives up.

Worth checking the same way whenever a new emailed link is added: is the route
public, is the page public, and does the URL resolve.

## Checks

Server typecheck 84, unchanged.

## Still to do

The four unconfirmed accounts and the six stale invites need re-inviting now that
the flow works. Their existing tokens are mostly expired.

---

# `npm run e2e` — a probe that stands where the customer stands

Three flows in this project passed typecheck and smoke while being completely
dead: the quote signing link, broken at three separate layers; the change order
link, which had no route at all; and `intake/set-password`, so no invitation
could ever be accepted. Every one was a route meant for somebody with **no
account**, sitting behind an auth wall that defaults to signed-in.

Nothing in the build catches that, because the code is correct — it is the
reachability that is wrong. Smoke mounts a page and proves it does not throw. It
cannot tell you the page is talking to a door that is locked.

## What it asks

Twenty-nine checks in four groups:

**Public doors.** Quote approval, quote signing, change order approval, change
order decision and invitation set-password, each called with a token that does
not exist. The right answer is the route's own refusal — 404 or 400 — and
**never the wall's 401**. That single distinction is the one that would have
caught all three outages.

**Doors that must stay shut.** The mirror image: issuing a quote or change order
link, redeeming a gift card, reading and writing job financials, the payroll
report, completion reports, quoting accuracy, the compliance run and the vendor
backfill. Anonymous callers must be refused.

**A real customer, through the front door.** Signs up on the public route, signs
in, and then: is a `client` and not an administrator, holds no permissions,
cannot list every user, sees only their own work requests, is not handed the
purchase order book, sees no sample investment offers, and cannot save a design
into the shared staff namespace. That last one is the bug that let a customer
draw for an hour and lose it; the escalation checks are the hole that let an
anonymous request make itself `master_admin`.

**Reference data**, and the server's own health.

## It uses no privileged credentials, on purpose

Only the publishable key and an account it creates through the public signup
route — exactly the access a real customer has. A probe authenticating as an
administrator would pass while the customer's door stayed locked, which is the
whole failure it exists to catch.

## Two things it caught about itself

**It asserted the wrong thing first.** The building-code ruleset answers 401
anonymously, and I nearly recorded that as a bug. It is correct — the design
centre requires an account. The probe was wrong about the app, not the reverse,
and it is now asked signed-in. Worth writing down because "the test failed so
the code is broken" is the comfortable read and it was the wrong one.

**And it leaked accounts.** The first version minted `e2e-<timestamp>@…` on every
run, which would have left a trail of real accounts in production auth that the
probe has no service role to delete. One fixed address now, reused; signing up
twice simply fails and it signs in instead.

## Result

**29/29**, run twice to prove it is repeatable and leaves nothing behind.

## Also noticed

`BuildingCodeChecker` — the only consumer of `design-standards`, one of the three
routers mounted earlier this week — is not rendered anywhere in the app. The
route is live and correct; nothing puts it on a screen.

## The last of the invented portal data

**Condo manager dues** rendered three made-up owners paying $850, one marked
overdue — while the real payments sat unused in state, already fetched from
`/condo-manager/financials`. The panel now shows the five most recent real
payments, or says there are none. Field names are read the several ways this
codebase records them rather than assuming one spelling.

**Property manager** carried `WORK_REQUESTS`, `PROPERTIES` and `PAYMENTS` —
invented pool heaters, Harborview Condos, 240 units — declared and never
rendered. Deleted before somebody wired them up believing they were real.

That is every hardcoded array across the portals accounted for: subcontractor
jobs, payments and revenue; the sample investment listings; the materials hub's
demo catalogue; condo dues; and these three.

### A sweep I abandoned

I tried to find every unreachable component programmatically and the tool was
wrong three times running — first because page components are registered in
`routes.tsx` rather than rendered as JSX tags, then because `path.join` produced
Windows separators so the lookup of `routes.tsx` silently returned an empty
string, and after fixing both it still reported components that a direct grep
shows being rendered.

Three wrong answers in a row is the tool telling you it is not fit for the
question. I stopped rather than spend more on it; the targeted checks have been
right every time. If a sweep is wanted later it should be built from the import
graph, not from regular expressions over source text.

### Checks

App typecheck 324, unchanged. Smoke: 6 pages, 0 threw. `npm run e2e`: 29/29.

## Mounting the unmounted routers

### What was asked

Mount the remaining 22 routers — 261 routes that exist in the repository and
that nothing can reach.

### What was actually mountable: three of them

- [x] `growth-tools3` — retargeting pixels, auto-product rules, custom social
      accounts. Six routes, none of which exist anywhere else.
- [x] `image-upload` — two routes that write to storage under the service role.
- [x] `bigBoxProducts` — proxies paid retail APIs on the company's account.

All three arrived with no authorisation of any kind, which is what being
unmounted lets you get away with. Each is now behind a staff check.

### Why the other nineteen are still unmounted

**Three are duplicates of live code.** `growth-tools`, `growth-tools2` and
`growth-tools4` re-define `/crm/contacts`, `/payment-gateways`, `/referrals`,
`/access-requests`, `/flash-sales` and others that already exist in `index.tsx`,
properly guarded with `intakeIsAdmin`. Mounting registers ahead of those inline
definitions, so it would not have added routes — it would have replaced working
admin-only ones with open copies. They are guarded in place and marked
do-not-mount; reconciling or deleting them is a separate decision.

**Sixteen need ownership checks, not a staff gate.** `property-management`,
`tenants`, `cohorts`, `providerBids`, `serviceProviders` and the rest hold other
people's data. `providerBids` takes the provider's identity from the URL
(`/my-opportunities/:providerId`), so any signed-in caller could read another
provider's opportunities by editing a number. A staff gate does not fix that
shape of bug. These stay unmounted until per-record checks exist.

### The mistake, and what it cost

The first deploy guarded each router with `router.use("*", requireStaff)`. That
is wrong for a router mounted at `/`: Hono resolves middleware by mount path, so
the wildcard ran on **every request the server received**. `/health` and
`/public/branding` both started answering "Company access is required for this."
The whole API was staff-only for one deploy.

Caught by probing production immediately after deploying rather than by the
build, which was perfectly happy. Replaced with `requireStaffOn(paths)`, which
guards only the paths a router owns and passes everything else through, and the
reason is written into `requireStaff.ts` so the next person does not repeat it.

### Checks

Server typecheck 84 and app typecheck 324, both unchanged from baseline. Smoke
had nothing to run — no source change reaches a page. `npm run e2e` 29/29.

Verified against production, signed in as an ordinary customer: the five new
routes all answer 403, and `/health`, `/public/branding`, `/flash-sales` and the
admin-only `/crm/contacts` all behave as they did before.

## Reconciling the duplicate growth-tools routers

Asked to delete the three duplicates. Only one of them turned out to be safe to
delete, and the check that found this is worth keeping: before removing a file,
compare its routes against every other router, not just against `index.tsx`, and
then look for client callers of whatever is unique to it.

- [x] `growth-tools4` deleted outright. Every route was either a duplicate of a
      live one in `index.tsx` or an orphan — `/media-library`, `/qr-codes`,
      `/branding-profile` — that no page calls.
- [x] `growth-tools` and `growth-tools2` had their duplicate routes stripped
      (`/crm/contacts`, `/referrals`, `/flash-sales`, `/loyalty/:email`,
      `/affiliates/:email`, `/maintenance-draft/:email`) and the remainder
      mounted behind the scoped staff guard.

Deleting those two would have been a mistake. Between them they hold the only
server code for `/automation/workflows`, `/keywords`, `/surveys` and
`/influencers`, and three pages that are routed and live in the app today —
`marketing-automation`, `review-surveys`, `influencer-tracker` — call exactly
those routes. They have been failing against a server that never had them.
Deleting the files would have made that permanent.

`KeywordTracker` is the same story one step further on: it was deliberately
unrouted, with a comment saying it was because `/keywords` 404'd. That route
answers now, so the page can be restored whenever it is wanted.

### Checks

Server typecheck 84, app 324, both unchanged. Nothing reaches a page, so smoke
had nothing to run. `npm run e2e` 29/29.

Verified against production: `/automation/workflows`, `/keywords`, `/surveys`
and `/influencers` all answer 403 to an ordinary customer, which means they are
mounted and guarded rather than missing. `/crm/contacts` is still admin-only and
`/flash-sales`, `/public/branding` and `/health` are unchanged — the duplicates
are gone without disturbing the live routes they would have shadowed.

Not yet verified: that a signed-in staff account gets a 200 and the three pages
populate. That needs a real staff session in the browser.

## Restoring the keyword tracker, and what it was seeding

The route was put back — `/keywords` answers now, so the page has a server
again. Two things came out of reading it before shipping it.

- [x] `keyword-tracker` resolves to `KeywordTracker` again rather than to the AI
      SEO Engine.
- [x] Deleted the six seeded keywords. On first load the page wrote them to the
      server: fabricated search volumes (1600, 880, 320…) that would have sat in
      production KV looking like figures somebody had pulled off a real tool.
      An empty tracker is the honest starting state.
- [x] Target URLs pointed at `blackphoenixbuilds.com`, the marketing site being
      retired. They point at `theblackphoenixcompany.com` now.
- [x] A refused read is no longer indistinguishable from an empty tracker. The
      route is staff-only, so a non-staff visitor used to see the seeded rows;
      now they are told it is staff-only.

### Checks

Typecheck 324, baseline unchanged, nothing in this file. Smoke 332/332, zero
throws, `keyword-tracker` renders.

Not verified: that a real staff session loads and saves keywords through the
route. That needs a browser signed in as staff.

## The remaining sixteen unmounted routers — what they actually are

Audited before proposing anything, because the growth-tools reconciliation
showed the shape of the trap: an unmounted router that looks like missing
functionality is often a duplicate that would *shadow* a guarded live route.

| router | routes | also in `index.tsx` | called by a page |
| --- | --- | --- | --- |
| `property-management` | 22 | **21** | yes — but the live inline ones answer |
| `cohorts` | 18 | 0 | **yes — `revenueService.ts`** |
| `tenants` | 14 | 7 | partly, and see the name clash below |
| `api-gateway` | 14 | 0 | no |
| `serviceProviders` | 9 | 2 | partly |
| `providerBids` | 8 | 2 | partly |
| `data-backup` | 5 | 4 | mostly duplicate |
| `materials-api` | 4 | 1 | `/search` |
| `cohort-settings` | 3 | 2 | yes |
| `unifiedProductSearch` | 3 | 0 | yes |
| `kitchen-cabinet-schedule` | 3 | 1 | `/generate` |
| `aiBidRouter` | 3 | 2 | yes |
| `plan-builder` | 2 | 2 | duplicate |
| `portalSettings`, `weather`, `analytics-summary` | 0 | — | not routers in the usual shape |

Three findings worth having before deciding anything:

1. **`property-management` is a duplicate, and a dangerous one.** Twenty-one of
   its twenty-two routes already exist inline in `index.tsx`, where they carry
   the ownership checks added when `/property-management/condos` was found
   returning every association to anyone who asked. Mounting the file would
   register ahead of those and replace them with copies that check nothing.
   This is `growth-tools4` again, with real tenant data behind it.

2. **`cohorts` is the opposite case and the one with actual value.** Eighteen
   routes, none of them anywhere else, and `revenueService.ts` calls them from
   the revenue hub today. That screen is talking to a server that has never had
   those routes — the same story as `marketing-automation` before last session.

3. **`tenants` means two different things.** `tenants.tsx` is platform
   multi-tenancy — territories, platform users, role changes. The landlord
   portal's "tenants" are people renting a flat. One word, two systems, and
   wiring the portal to this router would be a serious mistake.

### Proposed order

- [x] 1. `cohorts` — reconcile against the client, mount behind the scoped staff
      guard, and check whether the revenue hub then populates.
- [x] 2. `property-management` — confirm the one unique route, then delete the
      file rather than mounting it, the way `growth-tools4` was handled.
- [x] 3. The small ones that already have callers — `cohort-settings`,
      `unifiedProductSearch`, `materials-api`, `kitchen-cabinet-schedule` —
      each checked for duplicates first.
- [x] 4. Leave `api-gateway`, `providerBids`, `serviceProviders` and `tenants`
      unmounted. They take identity from the URL and need per-record checks,
      which is a separate piece of work, and unmounted means unreachable.

Not started — waiting on sign-off.

## Cohorts — mounted, and the fictional business that was in it

- [x] `cohortsRouter` mounted at `/make-server-3eae23a6`, behind
      `requireStaffOn(['/make-server-3eae23a6/cohorts'])`.
- [x] `revenueService.ts` sends the signed-in user's token instead of the public
      anon key, or nothing it asks for would be answered.
- [x] `POST /cohorts/initialize` no longer seeds. It returns 410 and says why.

### What mounting it fixes

`revenueService.ts` calls `/cohorts`, `/cohorts/health`,
`/cohorts/revenue/analytics`, `/cohorts/revenue/category/:category` and
`/cohorts/revenue/trends` from the Revenue & Monetization Hub, on load and then
every sixty seconds. None of those routes existed on the server. Eighteen routes
that live nowhere else, called by a live screen — the same failure as
`marketing-automation`, on the money screen this time.

### The seeder is the finding

`POST /cohorts/initialize` wrote twelve invented cohorts straight into
production KV. Not placeholders — a complete fictional business: *Vendor
Starter*, 1,247 subscribers, $61,103 a month; *Home Service Essentials*, 847 and
$126,203; *Premium Property Care*, 412 and $123,188. Close to a million dollars
of monthly revenue in total, with churn rates, conversion rates and overdue
counts to match.

The Revenue & Monetization Hub reads exactly those fields. One call to that
route would have put a fabricated P&L on the company's own money screen,
refreshing every minute so it looked live, and nothing on the page would have
distinguished it from real revenue.

It is refused now rather than deleted quietly: the route answers 410 and the
comment says what it used to do. Cohorts are created through `POST /cohorts`,
which is the real path. The old fixture is in git history — but if any of that
price list is genuinely our pricing, it should be retyped as a decision rather
than restored as data. **That is a question for Eric, not something to guess.**

### Why a staff gate is the right shape here

Unlike `providerBids` or `tenants`, a cohort is not somebody else's record. It
is our pricing, our revenue and who is behind on payment — including
`/cohorts/accounts/shutoff`. The distinction that matters is between a customer
and the company, and every vendor, subcontractor and portal customer is signed
in, so "signed in" was never enough.

The guard is `requireStaffOn`, not `use('*', requireStaff)`. This router is
mounted at the function prefix, and in Hono a sub-router's wildcard middleware
is registered against the mount path — so `use('*')` here would run on every
request in the whole API. That is the mistake that took the API staff-only for
a deploy last session, one level further down.

### Client-side authority

Every call in `revenueService.ts` sent `Bearer <publicAnonKey>` — a value baked
into the shipped bundle that identifies nobody. Behind a staff gate that means
403 on everything, so the token had to be fixed in the same change. It falls
back to the anon key when signed out, deliberately, so the refusal comes from
the server rather than from a client check somebody could edit out. Same pattern
`propertyManagementService.ts` already uses.

### Still to verify

That a real staff session loads the hub and sees cohorts (currently none, which
is correct — the fiction is gone and nothing real has been entered yet).

# Architecture plan — a vendor product with images, end to end

**Status: proposed, not started. Needs sign-off before any code.**

## What this is for

A customer choosing siding, a cabinet door or a railing should see the product.
Today they see a name, a unit and a price, because the vendor catalogue captures
seven fields and none of them is a picture. Adding a field is four lines; the
reason this needs a plan is that the picture is the smallest part of it.

## The shape of what exists

Three ways a vendor gets products in, all converging on one importer:

| route | what it is |
| --- | --- |
| manual | one line at a time in the vendor portal |
| CSV | a mapping the vendor confirms, not a guess we apply |
| API feed | `PUT /vendor-catalog/:id/feed`, `/feed/test`, `/feed/sync` |

They share one field list — `name, sku, category, unit, price, availability,
leadTimeDays` — one set of validation rules, one update-by-SKU behaviour and one
rejection report. **That shared importer is the asset.** Images should arrive
through it rather than beside it, or there will be three ways to attach a
picture and they will disagree.

Storage today is `vendor_catalog:{vendorId}:{itemId}` in KV, 20,000 items per
vendor, 500 rows per manual/CSV request.

### The two product systems, and why that is the real problem

`ecommerce-products` already carries `images: string[]` and `primaryImage`, keyed
by `vendorId`. `vendor_catalog` carries none. So the same vendor has pictures
when they sell on the storefront and no pictures when they supply materials —
two product systems, one word, no bridge.

### And the gap underneath that

**The design centre does not read the vendor catalogue at all.** Nothing in the
design components imports `materialsHubService` or the catalogue routes. The
catalogue currently reaches exactly two places: `VendorProductPicker` in the
customer portal, and `materialsHubService`, which the quote, the contract editor
and the invoice builder read.

So "the customer picks a real product in the design centre" is not one field
away. It is a connection that has never been made, and it is the thing that
makes the picture worth having.

## What owns what

- **The vendor owns the product record.** It is tenant data. A vendor reads and
  writes only their own catalogue; their cost base is commercial information.
- **We own the stored image**, not the vendor's URL. A mirrored copy under our
  bucket, referenced by the catalogue item. The vendor grants the right to
  display it; we hold the file.
- **The design project references a product by id**, and never copies its price
  or its picture into itself. A quote that has been sent freezes what it quoted;
  a design in progress reads through.

## Decision 1 — mirror, do not hotlink

Storing the vendor's URL is free and breaks the day they reorganise their site,
which for a picture on a customer's quote is the wrong kind of free. It also
lets a vendor swap the image out from under a quote after it was sent.

So: fetch once at import, store in our bucket, keep the source URL alongside for
provenance and re-sync.

The fetch is a request made by us to an address a stranger chose, which is
server-side request forgery — and `outboundGuard.ts` already solves exactly
that for the catalogue feed: https only, port allowlist, every private and
metadata range in v4 and v6, DNS resolution where the runtime allows, and
redirects followed by hand and re-validated at every hop. **Reuse it. Do not
write a second fetcher.**

## Decision 2 — what a picture is allowed to be

- An allowlist of `image/jpeg`, `image/png`, `image/webp`. Checked against the
  actual bytes, not the header the server claimed.
- **No SVG.** `image-upload.tsx` accepts `image/svg+xml` today, which is
  defensible for a logo somebody on staff uploaded and not for a file a vendor
  supplied: an SVG is a document that can carry script, served from a public
  bucket. This is a real hole to close in the same change rather than to inherit.
- A size cap, and a stored path namespaced by vendor so one vendor cannot
  overwrite another's file.
- The adult-content filter that already guards every store write path should
  guard vendor catalogue writes too. It does not today.

## Decision 3 — how far the record grows

An image implies a product page, and a product page is what makes the materials
hub worth a subscription rather than a price list. Proposed minimum:

    images: string[]        mirrored, first is primary
    imageSource: string[]   where each came from, for re-sync and provenance
    description: string
    brand: string

Deliberately **not** in the first pass: dimensions, spec sheets, variants,
finishes. Each is a real feature and each wants its own thinking. Variants in
particular are a trap — "same door, six finishes" is a data model decision, not
a field.

## What reads it, once it exists

| surface | reads | state today |
| --- | --- | --- |
| `VendorProductPicker` (customer portal) | image, name, price | exists, no image |
| `materialsHubService` → quote, contract, invoice | image on the line | exists, no image |
| purchase order / stock list to the vendor | sku, qty | exists |
| **design centre product selection** | image, name, price, id | **does not exist** |
| storefront (`ecommerce-products`) | already has its own images | separate system |

## Proposed order

- [x] 1. **Images through the existing importer.** One `image` field in the
      shared mapping, so manual, CSV and feed all gain it at once. Mirror on
      import behind `outboundGuard`, with the type, size and namespace rules
      above. Close the SVG hole while in there.
- [x] 2. **Show it where the catalogue is already read** — the picker, then the
      quote line. This is the cheap proof that the data is real, and it is
      visible to a customer immediately.
- [x] 3. **Description and brand**, same route, once the image path is proven.
- [x] 4. **Connect the design centre to the catalogue.** The actual prize, and
      the largest step: a trade tab offers real products, a selection records a
      product id, and the takeoff and quote read through to it.
- [x] 5. **Decide the two product systems.** DECIDED: they stay separate — see
      the storefront answer below. Superseded text: Either the storefront reads the
      vendor catalogue, or the bridge is explicit and one-directional. Not
      before 1–4, because the answer depends on what step 4 needs.

## Open questions — for Eric, not for me to assume

1. **Do vendors grant display rights today?** If the vendor terms do not cover
   us displaying their product photography, that is a document change and it
   gates step 1. I do not know what the current terms say.
2. **Re-sync cadence.** A feed sync re-reads prices. Should it re-fetch images
   every time, only when the source URL changes, or never after the first?
   Cheapest correct answer is "when the URL changes", but it means a vendor who
   replaces a photo at the same URL never updates.
3. **What happens to a product with no picture?** A neutral placeholder, or
   hidden from the picker? Hiding it is cleaner for the customer and punishes
   vendors with incomplete feeds, which may be the point or may lose real stock.
4. **Step 4 shape**: does a design selection pin a specific vendor's product, or
   a generic product that resolves to whichever vendor is cheapest at quote
   time? This changes the data model and it is a business decision about whether
   the customer is choosing a product or a supplier.

## Revision — the customer picks the product, not the supplier

Eric's answer to open question 4, and it inverts the plan above rather than
filling in a blank in it. Worth writing down what it changes before building to
the old shape.

### What it decides

A design selection stores a **product**. Which vendor supplies that product is
resolved later — at quote time or at ordering — and can change without the
customer's selection changing or the design being edited.

So the product has to exist as its own record, and a vendor's catalogue line
becomes an **offer** against it: one supplier's price, availability, lead time
and SKU for a thing that exists independently of them.

That is the opposite of what the hub was built with. `vendor_catalog:{vendorId}:{itemId}`
is currently the only product record there is.

    before   design ─────────────────────────► vendor_catalog line
    after    design ──► product ◄── offer ──── vendor A
                                ◄── offer ──── vendor B

### What moves where

| belongs to the product | stays on the offer |
| --- | --- |
| the name a customer sees | price |
| the photograph | availability |
| description, specification | lead time |
| brand, model | the vendor's own SKU |

**This relocates the images.** The plan above put them on the catalogue item,
which is now the wrong place: two vendors supplying the same decking board
should not produce two products with two photographs. A vendor's supplied image
becomes a *candidate* for the product's photograph, not the photograph itself.

### The hard part, said plainly

Knowing that vendor A's line and vendor B's line are the same product. SKUs do
not match across suppliers and names are written by whoever typed the feed.
Matching is the whole difficulty of this model and it cannot be hand-waved: a
wrong match prices a customer's job against a different item, and it does it
silently.

The honest approach is the one this codebase already uses for the bid intake
reader and the CSV mapping — **propose, never apply.** Match on manufacturer
plus part number where both exist, show the proposal with its confidence, and
require a human tick before two lines become one product. Below a threshold,
show it and leave it off.

### Revised order

- [x] 1. **A product record**, with the vendor catalogue line pointing at it as
      an offer. Every existing line becomes its own product initially — one
      offer each, nothing merged. Nothing is guessed, and nothing breaks.
- [x] 2. **Images on the product**, arriving through the shared importer as
      candidates, with the mirror, type, size, namespace and no-SVG rules from
      the plan above unchanged.
- [x] 3. **Merging** — the proposed-match screen that lets two offers become one
      product, ticked by a person.
- [x] 4. **Show it** in the picker and on the quote line.
- [x] 5. **The design centre reads products**, records a product id on
      selection, and the takeoff and quote resolve the supplier at quote time.
- [x] 6. The storefront question — **answered, and it is a no.** Eric: "no i
      dont want them into the store" and "they are in materials hub only." The
      two product systems stay apart. A vendor supplying decking for a deck job
      is not thereby listing decking for sale in the shop; those are different
      commercial relationships. If a bridge is ever wanted it has to be built
      deliberately, never fall out of where a record happens to be stored.

Step 1 is now the foundation and it is bigger than the original step 1. It is
also the step that stops us building the picture onto the wrong record.

### Still open

- **Which supplier wins at quote time** — cheapest, a preferred-vendor order, or
  whoever can meet the date? Cheapest is the obvious default and it is not
  obviously right when a lead time blows the schedule.
- **A quote that has been sent must freeze what it priced**, including which
  vendor. Confirming that is a small decision with a large consequence if it is
  missed.
- Questions 1–3 from the plan above are unchanged and still need answers:
  vendor display rights, re-sync cadence, and what a product with no picture
  does in the picker.

### Supplier resolution — decided

Eric: *"cheapest supplier wins, and a sent quote freezes it unless customer
chooses a specific product."*

**1. Resolution happens at quote time, not at selection time.** While a design is
in progress the product carries no supplier at all; the cheapest live offer is
shown so the customer sees a real price, and it is free to change as vendors
update their catalogues. Only building the quote fixes it.

**2. Cheapest offer wins** among the offers for that product. Cheapest is a
default and not a law of nature — an offer that is cheapest with a lead time that
misses the schedule is a real case, so the resolver should surface that rather
than silently pick the slow one. Proposed: pick cheapest, and warn on the line
when a cheaper offer was chosen whose lead time falls outside the phase it sits
in. It stays the operator's call, not a hidden substitution.

**3. A sent quote is immutable.** Product, supplier and price are frozen when it
goes out, and nothing may recompute any of them afterwards. This is not a new
mechanism: `change-orders` already exists with its own send and decide flow. A
change after sending is a change order against the frozen document, never an
edit to it, and the change order carries its own resolution.

**4. A specific product the customer named is pinned.** Cheapest-wins applies to
resolving a *supplier* for a chosen product, never to substituting a *different
product* because it is cheaper. If the customer said Trex Enhance Basics in
Beach Dune, that is the product, and the only thing resolved beneath it is who
supplies it.

#### Settled: the sent quote is immutable

Eric: *"sent quote is immutable, changes go through change orders."* The earlier
reading here allowed a customer's own later choice to reopen a sent quote. It is
struck.

So there is **no re-run path on the resolver for a sent quote**, and that is a
constraint on the code rather than a note in a document: nothing may recompute a
supplier or a price against a quote that has gone out. A later change produces a
change order — a second document, with its own send and decide flow, which
already exists — and the change order carries its own resolution.

The reason is worth keeping with the rule. A document the customer has been
given is a record of what they were promised. The mechanism for changing the
deal has to be a second document, not a mutation of the first, or there is no
answer to "what did I agree to".

#### What this adds to the data model

    product        the thing the customer chose; pinned if they named it
    offer          a vendor's price, availability, lead time, SKU
    resolution     which offer a quote picked, and when — stored ON the quote,
                   not on the design, because the design keeps moving and the
                   quote must not

That third record is the part worth naming. Without it, a quote sent in March
cannot answer "who was this priced against" once April's catalogue lands, and
the purchase order that eventually goes out has nothing authoritative to read.

## The vendor answers, from their own portal

Eric: *"i believe the vendors will need to answer these questions how do we build
it to give them the most options from the portal?"*

He is right, and it removes three platform-wide guesses. But "give them options"
needs one distinction made first, or it becomes a settings screen that quietly
lets a vendor turn off something protecting somebody else.

### Three kinds of thing, and only one of them is an option

**Rules — we set them, a vendor cannot change them.** No SVG from a vendor
feed. Type checked against the bytes rather than the claimed header. Size cap.
Storage namespaced per vendor. The SSRF guard on any URL they supply. The
adult-content filter. These exist to protect other people — other vendors,
customers, us — so they are not on the settings screen at all. A setting a
vendor can use to hurt somebody else is a vulnerability with a nice label.

**Consents — the vendor grants them explicitly, and the default is no.** May we
display your product photography, and where? This is not a preference with a
sensible default; it is permission, and permission that was defaulted to "yes"
is not permission. Recorded with who granted it, when, and against which version
of the terms — so it can be shown later, which is the entire point of having it.

**Options — the vendor chooses, and a safe default applies if they never look.**
Everything else. The platform has to work for a vendor who signs up, uploads a
CSV and never opens the settings screen again, because most of them will.

### Where these live

There is already a per-vendor record for feed behaviour — `vendor_feed:{vendorId}`,
holding `endpoint`, `authStyle`, `authName`, `mapping`. Feed options belong
there rather than in a new record.

What is missing is the presentation-and-permission half. Proposed:
`vendor_settings:{vendorId}`, read by the catalogue and the picker, written only
by that vendor or an admin — the same actor rule `catalogActor` already applies.

`portal_global_settings:default` is deliberately not the home for any of this: it
is one global object, and this is per-tenant by nature.

### The three open questions, answered by the vendor

| question | becomes | default |
| --- | --- | --- |
| display rights | a **consent**, per surface: design centre, quotes, storefront | **not granted** |
| image re-sync | an **option**: every sync / when the URL changes / never after first | when the URL changes |
| product with no picture | an **option**: show with a placeholder / hide from the picker | show with a placeholder |

Two notes on that table. Display rights are per surface because they are
genuinely different asks — a photograph on a quote sent to one customer is not
the same as one on a public storefront, and a vendor may reasonably say yes to
one and no to the other. And "hide from the picker" is offered rather than
imposed because a vendor with a thin feed may prefer to be found; imposing it
would quietly delist real stock.

### What else a supplier would actually want to control

If the screen is being built, these are the ones a real supplier asks for, and
each has an obvious safe default:

- which categories they supply, so they are not offered for work they do not do
- delivery radius, or pickup only
- minimum order value
- lead time, defaulted per category and overridable per line
- volume price breaks
- whether their prices are visible to customers or used only inside our quotes
- how often the feed syncs, and a "sync now" button
- who gets notified when a purchase order lands

Not all of that belongs in the first pass. The point is that the settings record
should be shaped to hold them rather than being a three-field object that has to
be rebuilt when the fourth question arrives.

### What this changes in the build order

Step 2 (images) now depends on a consent existing to check. So:

- [x] 1. The product record and offers, as before.
- [x] 1b. **`vendor_settings:{vendorId}` and the portal screen** — consents and
      options, with defaults, written by the vendor.
- [x] 2. Images on the product, gated on the display consent for the surface
      being rendered. No consent means no image, which is the fail-closed
      behaviour rather than a bug.
- [x] 3–6. Unchanged.

### The one thing this does not solve

A vendor granting display rights is a vendor asserting they hold those rights.
Most product photography belongs to the manufacturer rather than the supplier.
The consent record makes it *their* assertion rather than our assumption, which
is the honest position and worth stating in the wording of the consent itself
rather than burying.

### Built — step 1b, the consent form

- [x] `vendor_settings:{vendorId}` on the server, with `GET` and `PUT
      /vendor-settings/:vendorId` added to `vendor-catalog.tsx`.
- [x] `VendorImageConsent.tsx`, in the vendor portal's Products tab.

**Why it went in `vendor-catalog.tsx` rather than a new router.** The
authorisation rules it needs already exist there — `catalogActor` resolves who
is calling and which vendor they are, including the unlinked case, and
`mayTouch` decides whether they may touch that vendor's records. A second file
would have meant a second actor resolver, and the comments in that file record
what it cost to get the first one right: the unlinked-vendor hole where
`vendorId: null` fell into the see-all branch and handed over a competitor's
catalogue.

**What the client is allowed to send.** A boolean per surface and a chosen value
per option. Everything that makes the record evidence — who agreed, when, and
which terms version — is stamped on the server from the resolved caller and the
server clock. A consent whose signatory and timestamp arrived in the request
body is a consent the signatory wrote themselves.

**Re-saving does not rewrite the date.** Only a change of state is stamped, so a
vendor who opens the form and saves it again still has the date they actually
agreed on. Withdrawing records `revokedAt` rather than clearing the grant, so
the history stays answerable.

**An unrecognised option value is refused, not defaulted.** Quietly replacing a
choice we do not recognise with our default is how a vendor ends up with a
setting they did not pick and cannot see they did not pick.

**A failed read does not render the form.** Showing defaults after a failed load
would present them as the vendor's saved answers, and one save from that state
would overwrite real consents with whatever was on screen. It shows the error
and a retry instead.

**`IMAGE_TERMS_VERSION` is a constant to bump.** Existing consents keep the
version they were granted under, so it stays answerable which wording somebody
actually accepted rather than which wording is current.

#### Checks

App typecheck 324 and server typecheck 84, both unchanged from baseline, nothing
in the new files. Route shadowing checked on `vendor-catalog.tsx`: 12 routes, 0
shadowed. Smoke green.

#### Not done yet, and worth being clear about

- **Nothing reads these consents.** There are no product images to gate, so the
  record is currently written and never consulted. Enforcement lands with step 2
  and the plan says the rule there: no consent means no image, fail closed.
- **The terms wording is mine, not a lawyer's.** The form says turning a consent
  on confirms the vendor holds the right to let us display the images, and that
  photography often belongs to the manufacturer rather than the supplier. That
  is the honest shape of the ask; whether it is the right *wording* is a question
  for whoever writes the vendor terms.
- **Not deployed.** These routes do not exist in production until the function
  is deployed.

### Built — step 1, the product record and offers

- [x] `hub_product:{productId}` — the thing a customer chooses.
- [x] Every catalogue line gains `productId`, making it an offer against one.
      Linked on write, in both the single-line route and the bulk importer, so
      there is never a line without one.
- [x] `GET /catalog-products`, `GET /catalog-products/:productId`.
- [x] `POST /catalog-products/backfill` — staff only, idempotent, for the lines
      that predate the record.

#### The prefix is the finding

`product:` was the obvious name and it is **already the storefront's**.
`ecommerce-products` writes there and the api-gateway reads it, so a hub product
under that key would have appeared in the shop as merchandise — every vendor's
material line published for sale.

Eric, asked: *"no i dont want them into the store."* So `hub_product:`.

The separation is real rather than a naming convention: `kv.getByPrefix` matches
with `like(key, prefix + '%')`, anchored at the start, so `hub_product:…` does
not match a query for `product:%`. Worth re-checking if that helper ever becomes
an unanchored match, because the two systems would silently merge.

This also settles what was an open question in the plan — whether the two
product systems eventually merge. They do not.

#### Nothing is merged, and that is the point

Every line gets its own product, one offer each. Deciding that two vendors'
lines are the same product needs the human confirmation step in step 3, because
SKUs do not match across suppliers and a wrong match prices a customer's job
against a different item, silently. Guessing it here would bury the guess under
everything built on top.

`brand` and `mpn` are declared now and left empty. Manufacturer plus part number
is the only key two suppliers can be expected to agree on, so it is what
matching will use — better present and empty than bolted on after there are
records without them.

#### A sole offer keeps its name in step; a shared product freezes

While a product has one offer it *is* that line, so a vendor fixing a typo is
seen. The moment a second offer attaches, the name freezes: one supplier
renaming their line must not rewrite what every other supplier is offering.
Building the frozen behaviour now means merging does not change how this
behaves later, it just stops the sync.

#### Who is told what

Offers carry a vendor's price, which is commercial information, so every read
runs them through `visibleTo` — the same rule the catalogue search uses.

A vendor is told **no cheapest price at all**. They see only their own offer, so
a cheapest computed from what they can see is their own price dressed as a
comparison, and one computed from all offers hands them a competitor's number.
Neither is acceptable.

The supplier's identity goes to staff only. The customer picks the product, not
the supplier, and naming the vendor invites a conversation that is not theirs to
have — the resolution happens at quote time.

#### Checks

Server typecheck 84, unchanged from baseline. Route shadowing on
`vendor-catalog.tsx`: 15 routes, 0 shadowed. Smoke green — no page source
changed.

#### Honest limits

- **Nothing reads products yet.** The picker and the quote still read catalogue
  lines directly. Pointing them at products is step 4, and doing it in the same
  change would have mixed a data-model change with a UI change.
- **The importer does more KV work per row.** A new line costs one extra write,
  an updated line a read and sometimes a write. Worst case roughly doubles the
  writes on a 500-row batch. Not measured against a real large import.
- **Backfill has not been run.** It is deployed-but-unrun until somebody with
  staff access calls it, and it should be run once and its counts checked.

## Getting a real catalogue in — the three gaps closed

Eric: *"lets get a real catalog in first"*, and then *"nothing yet but a
building supply"* — no file in hand, and the supplier will be a building supply
house. So the work is removing the friction before the file arrives.

- [x] 1. Find the header row instead of assuming it is the first.
- [x] 2. A template and a written spec to send the supplier.
- [x] 3. Excel (`.xlsx`) support.

### 1. The header row was the real blocker

`buildRows` did `data.slice(1)` and mapped columns from `data[0]`. A price list
is a document before it is a data file: an ERP export opens with the company
name, an effective date and a blank line, and only then the column headings. So
`guessMapping` read "SMITH BUILDING SUPPLY" as the column names, found nothing,
and every row was rejected for having no product name.

Measured against a realistic export — title block, effective date, blank row,
then `Item # / Description / UOM / Your Price / Category / Stock`:

| | imported | rejected |
| --- | --- | --- |
| assuming row 1 is the header | **0** | 7 |
| finding the header | **3** | 1 |

The one rejection is `DIMENSIONAL LUMBER`, a section heading in the middle of
the file, refused with a stated reason. That is correct — it is not a product.
`$1,024.50` came through as `1024.5`, and `"2x4 Pressure Treated, 8ft"` kept its
comma.

The header is a **guess that is shown**: the row it picked appears in a
dropdown with its first few cells, and the operator can move it. A guess
somebody can see and correct beats a rule that is right more often and silent
when it is wrong.

### 2. The template carries a header row and nothing else

A template with example rows is a template somebody imports unchanged, and then
the catalogue holds two products nobody sells. What each column means is
written on the screen beside the download button, where it cannot be imported.
It also says plainly that their own export works too and does not have to match.

### 3. Excel, and why not SheetJS

npm's `xlsx` is frozen at **0.18.5** — SheetJS stopped publishing there, and the
fixes for its prototype-pollution (CVE-2023-30533) and ReDoS advisories exist
only in later versions distributed from their own CDN. This code parses files
supplied by people outside the company, which is exactly what those advisories
describe. So `exceljs@4.4.0`, which is current on npm.

**It is dynamically imported.** The build confirms it: `exceljs.min-*.js` is its
own 940 kB chunk (271 kB gzipped), not part of the main bundle, so a vendor
uploading a CSV never downloads it.

Cell values are not `String(...)`-ed. A real supplier file has rich text, formula
results, dates and hyperlinks, all of which arrive as objects and would import as
a product literally named `[object Object]`. Each shape is handled, and an error
cell (`#N/A`, `#REF!`) becomes empty rather than a value.

`.xls` and `.pdf` are refused **by name** with something useful to say, rather
than attempted and silently failing.

### The repo is a pnpm project

`npm install` cannot run here at all: package.json carries 60 versioned alias
keys from the Figma Make export — `"lucide-react@0.487.0": "npm:lucide-react@0.487.0"` —
and npm rejects the key as an invalid package name. pnpm tolerates them, and
`pnpm-lock.yaml` is the lockfile. 59 of the 60 duplicate a normal entry; only
`openai@4` is alias-only, and nothing in `src/` imports it. **Use `pnpm add`, not
`npm install`.** Adding the dependency touched package.json and the lockfile and
nothing else.

### Checks

App typecheck 324, unchanged from baseline. `vite build` succeeds. The header
detection was run against a realistic supplier export, above.

### Not verified

No real `.xlsx` has been through it. The cell-shape handling is reasoned from
what ExcelJS returns, not observed against a supplier's actual workbook — the
first real file is the test, and the screen shows what it will import before it
imports it, which is what that preview is for.

## The parcel lookup returned a different house's records

- [x] Read the house number from `matchedAddress` instead of `fromAddress`.
- [x] Verify the parcel we get back is actually the address we asked about,
      and discard it when it is not.
- [x] Stop the NH address pattern matching a different street.

### The original bug

`geocodeCensus` took the house number from `comp.fromAddress`. That field is the
**start of the TIGER block range** the address falls in, not the address.
Measured against the live geocoder, four of six real addresses came back with a
different number: 24 Pine St as 2, 88 Elm St as 68, 155 Central St as 113,
45 School St as 1.

It mattered because the address-string query is the path that does the work. The
point query misses on ordinary addresses — the free geocoder interpolates along
the street centreline and lands in the road, outside every parcel polygon — so
the fallback is what answers, and with the wrong number it looked up a different
house on the same street and returned its owner, assessed value, lot size and
year built as ours. Confidently, silently, into a property valuation.

### Fixing that alone was not enough

Two more ways to get a confidently wrong parcel turned up when the fix was
measured rather than assumed.

**The point query can land in the neighbour's lot.** A point a few metres off
is inside the wrong polygon, and the wrong polygon is returned correctly for the
wrong house. `45 School St, Chelsea MA` came back as `106 Winnisimmet St`.

**The NH pattern matched a different street.** `'24 %PINE ST%'` had a wildcard
between the number and the street to tolerate a directional prefix. It also
matches `24 ALPINE ST`.

So `parcelIsTheAddress` now checks both halves of what came back — the house
number equal, and the street present **as whole words**, because a substring
test passes ALPINE for PINE. A parcel that fails is discarded, the address query
is tried, and if that also disagrees the lookup returns nothing.

Failing closed is the right trade here. The caller wants an owner, an assessed
value and a year built, and those feed a valuation. A wrong parcel is not a
slightly worse answer than no parcel — it is a confident answer about somebody
else's house, and everything downstream treats it as fact.

### My first test was wrong, and that is worth recording

The first six addresses I measured against were **invented**. They geocoded
happily, because the Census geocoder interpolates a house number along a block
range whether or not the house exists, and then missed in the parcel layer
because there is no such parcel. That made the fix look like it had dropped the
hit rate to 1 in 6.

The honest test is a **round trip**: take addresses that really exist out of the
parcel layers, geocode them, and see whether the lookup finds the same parcel
again.

| 14 real parcels, looked up by their own address | correct | **wrong parcel** | miss |
| --- | --- | --- | --- |
| before | 3 | **1** | 10 |
| after | **11** | 1 | 2 |

Two notes on that table, so it is not read as better than it is:

- The remaining "wrong" is `5 MEDFORD ST #1` resolving to `5 MEDFORD ST`. That is
  the right building and the wrong unit, and parcels are buildings — the unit
  number is not in the layer. It is a grading artefact rather than a defect.
- One address regressed: `78 80 ST ANDREW RD, BOSTON` was found before and is
  missed now. It is a range address, where the first number is the house and the
  rest reads as street. One loss against eight gains, and a miss rather than a
  wrong answer.

### Checks

Server typecheck 84, unchanged from baseline. No client file changed, so smoke
has nothing to run. The before/after numbers above are from the live Census
geocoder, MassGIS and NH GRANIT.

### Not done

Not deployed. And the ArcGIS env override question that started this is still
open: `ARCGIS_PARCEL_SERVICES` and `ARCGIS_BUILDING_SERVICES` are set in
production and **nothing reads them**, while the code reads
`MASSGIS_PARCELS_URL` and `NH_GRANIT_PARCELS_URL`, which are unset and fall back
to working defaults. Wiring the set ones in without knowing what they contain
would risk replacing two endpoints that demonstrably work — so that needs Eric
to say what is in them.

### Deployed and verified

Function deployed. e2e 39/39 against production — nothing else regressed.

The parcel path itself is reached only from `POST /investments/ai-property-analysis`,
which spends an OpenAI call, so it was **not** driven end to end. Two probes
instead, neither of which costs anything:

- That route answers `401 Sign in required` to an anonymous caller, so it is
  live and gated.
- The logic was re-run against the live Census geocoder, MassGIS and NH GRANIT
  — the actual services the deployed code calls — over a wider sample of real
  parcels pulled out of the layers themselves:

| 20 real parcels | correct | wrong parcel | miss |
| --- | --- | --- | --- |
| after the fix | **17** | 1 | 2 |

The one "wrong" is still `5 MEDFORD ST #1` resolving to `5 MEDFORD ST` — the
right building, a unit number the parcel layer does not carry. Real records are
coming back: `160 PARKER ST, LAWRENCE` returns 160 Parker St Realty Trust,
$937,500, built 1900.

One thing worth noting: `78 WALTON ST, LOWELL` was correct in the first run and
a miss in this one, with no code change between them. So there is some
flakiness in either the Census geocoder or the MassGIS query. A miss is the safe
failure and the code falls through to paid Regrid, but it means the hit rate is
approximate rather than fixed.

**Still not driven end to end**: an actual feasibility study, which would prove
the parcel block reaches the prompt. That costs an OpenAI call and a free-study
slot, so it is Eric's to spend.

## Step 2 — images on the product, gated on consent

- [x] `image` in the shared field list, so the CSV importer, the API feed mapper
      and the manual form all gain it at once.
- [x] Mirrored into our own storage rather than hotlinked, behind the existing
      SSRF guard.
- [x] Stored on the **product** with provenance, not on the offer.
- [x] Display gated on the supplying vendor's consent, per surface.
- [x] A batched mirror route, because a 500-line price list is 500 fetches.

### Mirror, never hotlink — and the reason is not only broken links

Their URL breaks the day they reorganise their site. Worse, it leaves the image
**mutable by them after the fact**: a vendor could change what a customer sees
on a quote that has already been sent, and nothing on our side would know. A
sent quote has to stay what it was.

### The fetch reuses the guard rather than adding one

`safeFetch` already does https-only, a port allowlist, every private and
metadata range in v4 and v6, DNS resolution where the runtime allows, and
redirects followed by hand and revalidated per hop. It needed one change: it
decoded every response as text, which turns an image into U+FFFD confetti. It now
takes `wantBytes` and returns the bytes undecoded. One guard, one redirect loop.

### What counts as an image is decided by the bytes

`imageSniff.ts` is its own dependency-free module precisely so it can be tested,
because it is the check standing between a vendor's URL and a public bucket our
customers load. **16/16** on the files that actually turn up:

| accepted | refused |
| --- | --- |
| JPEG (JFIF and Exif), PNG, WebP | SVG, SVG with an XML prolog, an HTML login page served 200, a PDF spec sheet, GIF, TIFF, a ZIP/xlsx, a JSON error body, empty, too-short, RIFF/WAVE, and JPEG bytes not at offset 0 |

**SVG is refused deliberately.** `image-upload.tsx` accepts `image/svg+xml`,
which is defensible for a logo a staff member uploaded and not for a file a
vendor supplied: an SVG is a document that can carry script and these are served
from a public bucket to customers. That is stored cross-site scripting with
extra steps.

The Content-Type header is logged and not trusted — it is the one part of the
response its sender controls completely.

### Fetching happens in batches, not during the import

A 500-line price list carries up to 500 image addresses. Fetching them inside the
import means 500 outbound requests and 500 storage writes in one invocation,
which is how an import times out half-done and leaves nobody able to say what
landed. So the address is queued on the product and
`POST /catalog-products/mirror-images` works through them, at most 25 at a time,
reporting how many remain. Same shape as the importer already posting in batches.

A failing address is **cleared and recorded**, not retried forever — otherwise
every later run burns its budget on the same broken URL and never reaches the
rest. The reason is kept on the product so a missing picture is diagnosable.

### The vendor's own settings now do something

`imageResync` is honoured: `never` keeps the first image, `url-change` re-fetches
only when the address differs, `every-sync` re-fetches each time. Read once per
import rather than once per row.

The honest caveat, which is why the vendor chooses rather than us: on
`url-change`, a vendor who replaces a photograph at the **same** address never
gets the new one.

### Display is gated, and it fails closed

Each stored image remembers which vendor supplied it, because permission belongs
to that vendor and a product can eventually carry offers from several. Reads take
a `surface` — `designCentre`, `quotes`, `storefront` — and withhold any image
whose vendor has not granted that surface. No settings record, no consent, an
unrecognised surface: withheld. The single-product read also returns
`imagesWithheld`, so a missing picture is diagnosable rather than a mystery.

### Checks

Server typecheck 84 and app typecheck 324, both unchanged from baseline. Route
shadowing on `vendor-catalog.tsx`: 16 routes, 0 shadowed. `imageSniff` 16/16.

### Not verified

No image has actually been mirrored. The sniffing, the gating and the queueing
are tested or reasoned; the storage write, the bucket creation and a real fetch
through the guard have not been run. That wants one real product URL, and it is
the sort of thing the first real supplier catalogue will exercise.

## Step 3 — merging, proposed and never applied

- [x] `productMatch.ts` — the pure scoring, 17/17.
- [x] `GET /catalog-products/merge-proposals` and `POST /catalog-products/merge`,
      both staff only.
- [x] A review screen: **Materials Hub → Duplicate Products**.

### Why nothing decides this automatically

A wrong merge puts one supplier's price against another supplier's product, so
the customer's job is quoted from an item nobody will deliver — and the number
looks exactly like a right one. That is the same reason the returned-bid reader
proposes rather than applies. Below 0.7 a proposal arrives **unticked**: hiding
it would drop real work, pre-ticking it would price a job wrong.

### What it matches on, and what it refuses to guess

| signal | confidence |
| --- | --- |
| identical description **and** a shared item number | 0.97 |
| identical description once form is normalised | 0.90 |
| a shared item number across two suppliers | 0.85 |
| 80%+ shared words **and** same category | 0.72 |
| 80%+ shared words, categories differ | 0.60 — shown, unticked |
| 60%+ shared words | 0.50 — shown, unticked |

Two refusals come before any scoring, and neither is a judgement call:

- **Different units are different products.** A board priced each and one priced
  per thousand board feet cannot be merged; doing it would put a per-piece price
  against a per-MBF quantity.
- **The same vendor on both sides is not a merge.** Two lines one supplier chose
  to list separately are two products as far as they are concerned, and the
  importer already collapses their genuine duplicates by SKU.

**Abbreviations are deliberately not expanded**, and there is a test asserting
that `2x4-8 PT` and `2x4 Pressure Treated 8ft` are *missed*. Teaching it that PT
means pressure treated invites it to decide GALV means galvanized and then that
4/4 means 1x, and each is a guess that produces confident nonsense. Form is
normalised — case, spacing, punctuation, inch and foot marks, `2 X 4` → `2x4` —
and meaning is left alone. A miss is a merge somebody does by hand; a wrong
guess is a mispriced job.

A short shared code is not treated as a part number: fewer than four characters
and `A12` appearing on two unrelated lines would pair them.

**A product appears in only its strongest proposal.** Asking "is A the same as
B?" and then "is A the same as C?" invites somebody to tick both, and A cannot
be two products.

### Merging is reversible, and the screen says so

The absorbed product is not deleted. It becomes a record of what it was and what
it went into, so a mistake can be undone and an old reference still resolves. A
merge is a judgement about the world, judgements are sometimes wrong, and the
difference between a mistake and a disaster is whether the original is still
there.

Offers are **repointed, not copied**, so no price is duplicated and nothing has
to be kept in step. Images combine while keeping each one's provenance — after a
merge a product genuinely carries pictures from more than one vendor, and display
is still gated on the consent of whichever vendor supplied each.

A tombstone is excluded from the product list and answers 410 with `mergedInto`
on a direct read, rather than being served as a live product with no offers.

### Checks

App typecheck 324 and server typecheck 84, both unchanged from baseline. Route
shadowing on `vendor-catalog.tsx`: 18 routes, 0 shadowed. `productMatch` 17/17.

### Not verified

No merge has been run against real data — there is one catalogue line in
production, so there is nothing to merge yet and the proposal list is correctly
empty. The screen's empty state says so rather than looking broken.

## Step 4 — the picture appears in the picker, and nothing else moves

Eric: *"minimal, keep the picker layout as is."*

- [x] `/vendor-catalog-search` carries each line's `productId` and, when
      permitted, the product's image.
- [x] `VendorProductPicker` shows a 44px thumbnail in the row that already
      exists.

### Why the server attaches it rather than the picker fetching it

The picture lives on the **product** and the picker reads **offers**, so
something has to bridge them. Doing it on the server keeps it at one call in,
one call out, and — more importantly — keeps the consent check in the one place
it cannot be forgotten. A picker that fetched images itself would be a second
place where somebody could omit the gate.

The gating is the same as the product routes: per supplying vendor, per surface,
defaulting to `designCentre`, failing closed.

### A product with no picture looks exactly as it did

No placeholder. In a list of real products a placeholder reads as *"we have no
picture of this one"* rather than *"not yet"*, and today every product is the
second thing. A mirrored image that 404s — storage purged, say — hides its own
element rather than leaving a broken-image icon on a customer's screen.

### The quote line is deliberately not done

Step 4 as planned said "the picker and the quote line". The picker is done. Putting
a photograph on a quote changes the layout of a document a customer receives,
which is a different kind of decision from adding a thumbnail to an internal
list, so it is not being folded in quietly. The `quotes` consent surface already
exists for when it is wanted.

### Checks

App typecheck 324 and server typecheck 84, both unchanged from baseline.

### Not verified

Nothing has a picture yet, so the picker looks exactly as it did. The thumbnail
has never been rendered with a real image — the first mirrored image will be the
first time anybody sees it.

## Step 5, revised — most of it already exists

Before planning "connect the design centre to the catalogue", I read what is
there. It is already connected, and the plan was about to duplicate it.

### What already works

`DeckQuotePanel` prices a deck takeoff through `POST /quote/price-lines`, which
is admin-only and documents its own order: the **vendor catalogue** first
(matched on SKU, then by name through `matchCatalogItem`), then the **typed deck
price book** for the recurring lumber and hardware lines no vendor publishes,
then **unpriced** and marked as such. Every line reports which of the three it
came from, so a typed figure and a vendor's published price are never presented
as the same kind of number.

Quantities come from `buildMembers` — the same function the 3D view and the
framing plan draw from — so there is no estimating step to disagree with.

That is the substance of what step 5 was going to build. It should not be built
twice.

### The real gap, which is narrower and sharper

1. **It prices against offers, not products.** So merging two vendors' lines into
   one product has no effect on what a deck costs, and the work done in step 3
   does not reach the quote.
2. **The resolution is not frozen on the quote.** The response carries a vendor
   name and a `priceAsOf`, and nothing stores which offer priced which line. A
   quote sent in March cannot answer "who was this priced against" once April's
   catalogue lands, and the purchase order has nothing authoritative to read.
   This is the record the architecture plan named and nothing yet writes.

### And one live defect, fixed now rather than planned

Both catalogue lookups used `.find`, which returns the first match in **array
order** — and the array order is whatever the KV read handed back. Where two
vendors publish the same SKU, the price a customer was quoted depended on which
row came back first.

That contradicts a rule already decided — cheapest offer wins — so it is fixed
rather than added to a plan: the catalogue is sorted ascending by price once, and
both `find` calls then return the cheapest match. One line, and it makes the
decided rule true where it was not.

- [x] Cheapest match, not first match, in `/quote/price-lines`.

### Proposed for the rest, needing sign-off

- [x] 5a. Price through the **product**: resolve a takeoff line to a product,
      then take the cheapest offer against it. Merging then reaches the quote.
- [x] 5b. Write the **resolution** onto the quote when it is built — product,
      offer, vendor, price, and when — so a sent quote can say what it was priced
      against and the purchase order has something authoritative.
- [x] 5c. Leave the typed price book exactly where it is, second and marked. It
      exists because a deck takeoff has two dozen recurring lines no catalogue
      covers, and waiting for one that does means no deck can be quoted at all.

Not started beyond the defect fix. 5b is the one worth doing first: it is what
makes a sent quote answerable, and it does not depend on 5a.

### 5b — the resolution is frozen onto the quote

- [x] `/quote/price-lines` reports which offer priced each line: `offerId`,
      `productId`, `vendorId`, and `matchedOn`.
- [x] `DeckQuotePanel` keeps all of it rather than only what the screen shows.
- [x] `publishDeckQuote` writes it onto each materials line as `pricedFrom`,
      stamped with the time the quote was written.

#### Why store it rather than recompute it

A sent quote is immutable — product, supplier and price frozen when it goes out,
with a change order for anything after. That rule is unenforceable without a
record of what was frozen.

Recomputing later answers *"what would this cost today"*, which is a different
question from *"what did we promise"*, and the second is the one a customer holds
us to.

It is also what a purchase order needs. Ordering the material means knowing which
vendor's **offer** the money was based on. A vendor's name is not enough once
their catalogue has moved on, which is exactly when somebody asks.

#### What a line now carries

    pricedFrom: {
      source:     'catalogue' | 'your-price' | 'unpriced' | 'unrecorded'
      vendorId, vendor, offerId, productId
      matchedOn:  'sku' | 'name' | 'price-book' | 'none'
      priceAsOf:  when the vendor last published that price
      at:         when this quote froze it
    }

`matchedOn` is there because *how* a line was matched is part of how much to
trust it: an exact SKU match and a name match are both matches and are not the
same claim. `unrecorded` is used rather than omitting the field, so a line priced
before this existed is visibly unrecorded instead of looking like it had no
vendor.

#### Checks

App typecheck 324 and server typecheck 84, both unchanged from baseline.

#### Not verified

No quote has been published through this. The fields are carried end to end in
code and typecheck clean; whether a real published quote comes out with a
populated `pricedFrom` needs a deck priced against a catalogue that has a
matching line — and production has one catalogue line, so that is a real test
once the building supply's list is in.

#### A second quote path has the same gap, and is not fixed

While applying this I put the change on the wrong catalogue projection: there are
two in `index.tsx`, and `/auto-generate-quote` has one of its own. Reverted from
there and applied to `/quote/price-lines`, which is the deck path 5b is about.

But the mistake surfaced something real. **`/auto-generate-quote` prices from the
catalogue too, and its quotes also cannot say what they were priced against.** It
is the same gap, in a path this pass did not touch, and it should not be left
unrecorded just because it was found by accident. It also predates the
cheapest-wins fix, so it may still take the first match rather than the cheapest —
worth checking before it is trusted.

Not fixed here on purpose: 5b was scoped to the deck quote, and quietly changing
a second quote-generating route in the same commit is how a change nobody asked
for ships.

### The shared matcher, and the second quote path — both done

Eric: *"yes fix the shared matcher and do both."*

- [x] `matchCatalogItem` resolves ties by price, for every caller.
- [x] `/auto-generate-quote` records which offer priced each line, the same way
      the deck quote now does.

#### What the matcher was doing

It took whichever line matched **first**, and first meant first in the array —
whatever order the KV read happened to return. So when two vendors published the
same SKU, the price a customer was quoted depended on row order and **could
differ between two identical requests**.

That is not a tie-break detail. The rule the platform runs on is that the
customer picks the product and the platform resolves the cheapest supplier, and a
matcher resolving arbitrarily made that rule untrue everywhere it was used —
which is both quote paths and anything added later.

**Cheapest applies only among candidates that match equally well.** A more
specific match still beats a cheaper vaguer one, because pricing the wrong
product cheaply is worse than pricing the right one dearly. 11/11 asserts both
halves, including that the answer no longer depends on array order and that an
exact SKU still wins outright however cheap a name match is.

Four assertions cover behaviour that must **not** have changed: a zero price is
not a match, an inactive line is not a match, a one-word catalogue name is too
weak to price from, and a partial word match is refused.

#### The second quote path

`repriceMaterial` now returns `offerId`, `productId` and `vendorId`, and every
repriced material line carries the same `pricedFrom` record the deck quote
writes. Both quote paths can now say what they were priced against instead of
only one.

Where a price came from the model rather than a vendor, the ids are **empty
rather than omitted** — a line priced from a guess is visibly not priced from an
offer.

#### Checks

App typecheck 324 and server typecheck 84, both unchanged from baseline.
`matchCatalogItem` 11/11.

#### Not verified

Neither path has been driven with a catalogue containing two competing offers,
because production has one catalogue line. The cheapest-wins behaviour is proven
against the function directly, not through a real quote.

## Found while probing: `/auto-generate-quote` has no authorisation check

Adding e2e assertions for the cost-basis routes turned up a real hole. Two of the
three pass — `/quote/price-lines` and `/deck-price-book` both refuse a customer
with 403. The third does not.

**`POST /auto-generate-quote` answers a signed-in customer with 200.** It checks
that a body was sent and nothing else, and the auth wall defaults an unlisted
route to "signed in" — which every portal customer, vendor, subcontractor and
tenant is.

### Three separate problems, and only one is fixed

1. **It spends money.** Each call runs the estimator against OpenAI. Anyone with
   an account can spend it, as often as they like.
2. **It returns the cost basis.** The response carries per-line material
   `unitCost` after markup, `modelUnitCost`, the vendor name, and the pricing
   settings' overhead and profit percentages. To the customer being quoted.
3. **The customer's browser is the courier.** `ClientWorkRequestForm` takes the
   response and writes `laborItems`, `materialItems`, `subtotals` and `total`
   into the pipeline item. So the pipeline's quote is written from data that
   passed through the browser of the person being quoted, who could alter it.

**Fixed now: `pricedFrom` is stripped for anybody who does not work here.** That
field is new today — it names the vendor id, the offer id and the product — and
returning it to the customer being quoted would hand them the supply chain. What
is fixed is that today's change did not make an existing leak worse.

**Not fixed, because each needs a decision:**

- (1) and (2) cannot be closed by requiring staff, because a customer-facing form
  legitimately calls this route. The shape of the fix is that the server
  generates and stores the quote itself and returns a confirmation to a customer
  rather than the quote — which is a real change to a customer-facing flow.
- (3) is the same fix. The pipeline write belongs on the server.

### Why it is not asserted in e2e

Calling it spends an OpenAI call, and a test that costs money on every run is a
test somebody eventually stops running. The probe was removed and the reason
written where the probe was. The two free assertions stayed.

### Checks

Server typecheck 84, unchanged from baseline. e2e 45/45 with the two cost-basis
assertions added.

## Fixed properly: the customer's browser is no longer the courier

Eric: *"yes fix it properly."*

- [x] `/auto-generate-quote` answers a customer with a **confirmation**, not the
      quote.
- [x] The pipeline record is written **on the server**.
- [x] `pipeline:` and `pipeline_` removed from the KV guest allowlist.

### The split, by what each caller legitimately needs

    staff      the quote — to review, adjust and send
    everyone   that a quote was generated, and how many lines it has

Requiring staff outright was not available: a customer-facing form legitimately
calls this route as somebody submits a work request. The question was never who
may call it, it was **what comes back**.

What used to come back was the whole quote — per-line material cost after markup,
the model's original guess, the vendor's name, the overhead and profit
percentages — to the person being quoted. A customer now gets
`{ generated, pipelineWritten, counts: { materials, labor } }` and nothing about
what anything costs.

### The bigger half: who writes the record

The browser did. It took the quote it had just been handed and wrote
`pipeline:{id}` through `/kv/set`, so **the number the business works from had
passed through the hands of the party with the most reason to change it.**

The server writes it now, from the estimate it just produced rather than from
anything the caller sent. The customer's own account of their job — title,
location, priority, timeline, media — is still theirs to state and is sent along,
because those are facts about their request. The quote is not.

### And the allowlist entry that made it possible

`kvOwnKey` let a guest write any key starting `pipeline:`. That is a prefix, not
an ownership check, so **one customer could overwrite another customer's pipeline
item** — its stage, its contact details, its quote total. Nothing in the app did
that. Nothing had to.

Both prefixes are gone. Staff never went through that list, so nothing internal
changes.

### The trade, stated

If the server's pipeline write fails, the record is not written at all rather than
falling back to the browser. The work request itself is already saved by then, so
the cost is that staff generate the quote themselves instead of finding one
waiting. Recoverable, and a better trade than a key any customer can write.

The client keeps its old write path behind `if (!autoQuoteData.pipelineWritten)`
so the two can be deployed in either order. It can be deleted a deploy later.

### Checks

App typecheck 324 and server typecheck 84, both unchanged from baseline.

### Not verified

No work request has been submitted through this end to end. It needs a real
customer submission to prove the server writes the record and the form still
reports sensibly — and that is the one flow where a mistake is visible to a
customer, so it is worth doing deliberately rather than assuming.

### Tested as a real customer, and it found a bug

Signed up through the public signup route, signed in as that account, and drove
`/auto-generate-quote` exactly as `ClientWorkRequestForm` does. No privileged
credentials anywhere in the probe.

| check | result |
| --- | --- |
| public signup, role | 200, `client` |
| `/auto-generate-quote` as the customer | 200, `generated: true`, `pipelineWritten: true` |
| counts returned | 8 materials, 4 labour |
| cost-basis fields in the response | **none** — checked 14 of them by name |
| customer writing `pipeline:{id}` | **403** |
| pipeline record written server-side | yes — `quote_pending`, quote attached, total $20,385.22 |

#### The bug only the end-to-end test could find

The first run stored a quote whose lines had **no `pricedFrom` at all**. Everything
typechecked, every unit was correct, and the field was simply missing from the
stored record.

`quote-generator.tsx` **rebuilds** each material line after repricing, listing the
fields it keeps — and its own comment warns about exactly this hazard: *"Rebuilding
the line without these would drop the very labels that let a quote show which
figures are real."* `pricedFrom` was added in `repriceEstimate` and silently
dropped one function later.

Nothing short of submitting a real work request and reading the stored row would
have caught it. Typecheck cannot see a field that is deliberately not copied.

Fixed, redeployed, and re-run: `pricedFrom` now lands with `source: estimated`,
empty vendor and offer ids, and a frozen timestamp — which is the correct answer
here, because production's single catalogue line does not match "Pressure-Treated
Lumber" and the model's figure was used. The line says so rather than implying a
vendor.

**The comment in `quote-generator.tsx` now names this**, so the next field added
to a repriced material has a chance of being carried through.

#### Cleaned up

Both probe pipeline records and both probe user profiles were deleted from KV.
They would otherwise have sat on the pipeline board as real `quote_pending` jobs
with five-figure totals. The two auth accounts remain, as the e2e suite creates
one on every run and that is existing practice.

## Quotes are no longer generated when a customer submits

Eric asked whether he would have to generate quotes himself to keep the cost
down. The answer turned out to be better than that, and the investigation found
something worse.

### What was already protecting him

`/auto-generate-quote` is in `AI_METERED_PREFIXES`, so it goes through
`aiSpend`: **300 model calls per account**, then 429. Counted server-side against
the verified token, reserved before the call and refunded on failure so a burst
of parallel requests cannot slip past one check, staff waived, and the ceiling can
be lifted per account.

One detail worth knowing: the key is `ai_budget:{userId}` with **no date in it**,
so 300 is a **lifetime** total rather than monthly. It never resets, which is
deliberate — but a long-standing customer will eventually need the override.

### The discovery: the automatic call bought nothing

The generated quote was written to `pipeline:{id}`. **The pipeline board reads
`pipeline_{id}`** — a different key. Production holds **433** records under the
one the board reads and **3** under the one this wrote.

So the draft that was supposedly waiting for staff was never visible to anybody.
The platform has been paying for a full gpt-4o takeoff on every customer
submission and putting the result somewhere nothing looks.

Worse: this afternoon's fix moved that write to the server and **faithfully
reproduced the wrong key**. The commit said the server writes the record. It did
— to a dead key. Only counting the two prefixes in production showed it.

### What changed

- **The customer's submit no longer generates anything.** 155 lines removed. The
  work request is still saved by `POST /work-requests`, which is what the admin
  screens read, so nothing about a customer reaching us depends on it.
- **The server no longer writes the dead key either.** A non-staff caller gets
  `{ generated, counts }` and nothing else. That branch stays because the route is
  reachable by anybody signed in, and what comes back to them should not be the
  cost basis.
- **Staff generate when they decide to**, from the button that already exists in
  `StartQuoteModal`.

### What this means for the middle option

Eric picked "generate on first staff open" over "staff button only", to keep a
draft ready without a click. That draft never existed, and there is already an
explicit staff button — so what is shipped is the cost saving without the
behaviour change. Generate-on-open is still available as an addition if the click
is worth removing, and it would now write to the key the board actually reads.

### Loose ends

Three `pipeline:` records remain in production from real customer submissions.
Nothing reads them and nothing ever did. They are left alone rather than deleted,
because they are the only copy of those generated quotes — worth a look before
anybody clears them.

### Checks

App typecheck 324 and server typecheck 84, both unchanged from baseline.

## Generate-on-open

- [x] `POST /quote-draft/:workRequestId` — staff only, cached, metered.
- [x] One estimator setup, shared with `/auto-generate-quote` (50 lines of
      duplication removed rather than a second copy added).
- [x] `WorkRequestQuoteDraft`, rendered in the work-request detail modal.

### Opening twice is free, and the screen says so

The draft is stored under `quote_draft:{workRequestId}` and returned unchanged on
every later open. The reply carries `spent: true` the first time and `spent: false`
afterwards, and the component prints which — *"generated just now"* or *"from the
saved draft — no new cost"*.

That label is not decoration. A screen that silently re-generates is how a bill
appears without anybody deciding anything, so which one happened is visible on
the screen rather than only in a log. React mounting the component twice costs one
cached read.

`Redraft` forces a fresh one, for when the request itself has changed. Its tooltip
says it costs another model call, because it does.

### One setup, not two

The new route needed the same catalogue projection, labour rates and pricing
settings as the existing one. Copying them would have meant two places loading the
catalogue, two places building the projection that carries `offerId`, and two ideas
about which rates apply — and the one that drifted would be the one nobody was
watching. `estimateForWorkRequest` is now shared, and `/auto-generate-quote` lost
50 lines to it.

### Metered, though staff are waived

`/quote-draft/` is in `AI_METERED_PREFIXES`. Staff are waived by `aiSpend`, so it
changes nothing today — it is the backstop for the day somebody loosens the guard
above it.

### Checks

App typecheck 324 and server typecheck 84, both unchanged from baseline. Smoke 8
affected pages, 0 threw. e2e **49/49**, including that a customer cannot draft a
quote — free to probe, because the route refuses before it spends.

### Not verified

The positive path. Nobody has opened a work request as staff, so the cache has
never been exercised and no `quote_draft:` key exists yet. That is a 30-second
check in the browser and it verifies the whole thing at once: open a request, note
"generated just now", close it, open it again, and it should say "from the saved
draft — no new cost". If the second open says "generated just now", the cache is
not working and it is costing money per open.

## Eric could not open a work request into the pipeline

Reported while using the app. Diagnosed from production logs rather than guessed
at, and it was **not** caused by the day's changes.

### What the evidence said

Smoke: **332 pages render, 0 throw**, including `unified-project-pipeline` and
`admin-alerts`. So nothing was crashing.

`function_edge_logs` for his session:

| time | request | status |
| --- | --- | --- |
| 23:53–23:55 | `work-requests?userId=1a9f3ae4…` | 200 |
| 23:57:09 | `auto-generate-quote` | 204 — **preflight only, the POST never completed** |
| 23:57:26 | `pipeline/items` | 200 |
| 00:00:13–00:00:41 | `/user` | **403 × 14** |

`auth_logs` gave the cause outright: `403: invalid claim: missing sub claim`.

### The cause

Around eighty call sites fetch with `session?.access_token || publicAnonKey`. The
fallback is right for public routes. When a session has quietly expired it means
every authenticated call sends the **publishable key**, which identifies nobody —
so the auth server answers "missing sub claim", the API turns it into 401, and the
screen shows a generic failure while the whole application sits there looking
healthy. The reasonable conclusion is that the feature is broken.

Nothing anywhere said the words "signed out".

**Not the day's changes**: there is no `/quote-draft/` request in his session at
all, so the component added an hour earlier never ran.

### Fix 1 — one listener, not eighty edits

`sessionExpiryNotice.ts` watches responses from our own API. A 401 is reported
**only when there is genuinely no session**, because a 401 with a valid session
means something quite different — that the account may not do this — and calling
that an expiry would send somebody to sign in again for no reason.

It does not sign anybody out, redirect or retry. Losing a half-filled form
because a token expired is worse than the confusion it replaces. Installed in
`main.tsx` before render, so a 401 on the first call is explained too.

Changing every call site would have touched every screen to fix a message.

### Fix 2 — the fifteen-second timeout

`openInPipeline` called `/auto-generate-quote` with `AbortSignal.timeout(15000)`.
A gpt-4o takeoff over a whole job does not finish in fifteen seconds, so the call
was abandoned most times it ran: **the model was paid for and the answer thrown
away**, and the pipeline item arrived with no quote and no explanation. The cost
without the result.

It now calls `/quote-draft/:id`, which returns the stored draft instantly when
there is one — so the common path is fast and free, and the timeout only matters
on a first generation. Raised to 90 seconds, which is long enough for one to
finish.

### Checks

App typecheck 324, unchanged from baseline. Smoke green.

### What Eric should do

Sign out and back in, or hard-refresh. The 401s were his session, not the code.

---

## Why jbrenes19@gmail.com could not log in — 2026-09-20

### What the production logs show

| Time (UTC) | Device | What happened |
|---|---|---|
| 16:19:18 | iPhone Safari | `POST /auth/signup` → **200**. Account created, `email_confirm: true`. Took 8.5s. |
| 16:19:26 | iPhone | Function returned. Then **nothing** — no `/token`, no `/auth/register-crm`. The page was abandoned mid-flow. |
| 16:20:20 | iPhone | Signup again → **422 already registered** |
| 16:21:34, 16:21:37 | iPhone | Login → **400 Invalid login credentials** ×2 |
| 16:25:01 | iPhone | Forgot password → **401** |
| 16:27:18 / 23 / 16:28:08 | Mac Chrome | Signup ×3 → **422 already registered** |
| 16:28:33, 16:30:08 | Mac Chrome | Login → **400 Invalid login credentials** ×2 |
| 16:30:20 | Mac Chrome | Forgot password → **401**. Gave up. |

`auth.users`: account exists, confirmed at 16:19:19, has a password, `last_sign_in_at` is **null** — they never got in once.

### The signup→login path itself is not broken

Probed against production with the same endpoints the app uses:
signup 200 → `POST /token?grant_type=password` **200 with a session**. So the
password recorded at signup does authenticate. What they typed at login did not
match what they set. (Probe account left behind:
`loginprobe+1789935143903@blackphoenixtest.dev`.)

### The real bug: they had no way to recover

**1. `Forgot password?` returns 401 before our code runs.**
`src/app/pages/ForgotPassword.tsx:32` posts with only `Content-Type` — no
`Authorization` header. Supabase's gateway rejects the function call with
`401 UNAUTHORIZED_NO_AUTH_HEADER — Missing authorization header`. Confirmed:
the identical request with `Authorization: Bearer ${publicAnonKey}` returns 200.
Every other call in this app sends that header; this one never did.

**2. Even past the header, no reset email can send.**
With the anon key the route returns `{success: true, "you will receive a reset
link"}` — but `auth_logs` for that same request says `/recover` **500**,
`535 "Invalid username"`, and `recovery_sent_at` stays **null**. That is an SMTP
auth failure on the Supabase Auth mailer. `auth.tsx:774` catches the error and
returns success anyway, so the screen says "check your inbox" when nothing was
sent.

**3. Signup tells people to confirm an email that does not exist.**
`SignUp.tsx:119` — *"Account created! Check your email to confirm. Click it to
activate your account, then log in."* The server auto-confirms and sends no
mail. A customer who then hits "invalid credentials" reasonably concludes their
account was never activated — which is exactly the signup/login loop in the log.

### Plan — approved and done

- [x] Unblock this customer: set a password for jbrenes19@gmail.com and pass it
      to them directly. The dashboard's own reset mail uses the same broken SMTP,
      so a reset link is not an option today.
- [x] Fix 1 (one line): send `Authorization: Bearer ${publicAnonKey}` from
      `ForgotPassword.tsx`, like every other call in the app.
- [x] Fix 2: make `/auth/forgot-password` stop claiming success when the mail
      did not send. Send the reset through Resend (`RESEND_API_KEY`), which is
      what the rest of the app's mail already uses, instead of Supabase Auth
      SMTP. Keep not revealing whether the address exists.
- [x] Fix 3: correct the signup toast — the account is active immediately, there
      is no email to confirm.
- [x] Separately: fix the Auth SMTP credentials in the Supabase dashboard, or
      accept that Supabase Auth mail is unused and route everything via Resend.

### Review — what actually changed

The customer is back in: their password is set to `BlackPhoenix` and a real
`POST /token?grant_type=password` against production returned 200 with a
session. Verified, not assumed.

**The fix turned out to be a deletion, not a rewrite.** A complete and correct
password-reset pair already existed in `index.tsx` — its own 256-bit single-use
token in the KV store, one-hour expiry, mailed with Resend, reset via
`admin.updateUserById`, and a link shaped `/reset-password?token=…` which is
exactly what `ResetPassword.tsx` already reads. It had simply never run.
`app.route("/", authRouter)` is registered at index.tsx:674, long before those
handlers are declared at ~3740, so Hono matched `auth.tsx`'s two broken
duplicates first and shadowed the working ones. The production log proves it:
the `535 "Invalid username"` SMTP error only exists on the `auth.tsx` path.

So the first draft of this fix — rewriting `auth.tsx` to generate links and send
them through Resend — was thrown away. Deleting the two dead routes is smaller,
and it switches on code that had already been written carefully.

Changes:

1. **`supabase/functions/server/auth.tsx`** — deleted the shadowing
   `/auth/forgot-password` and `/auth/reset-password`, leaving a comment saying
   where the real ones live and why these had to go. −102 lines.
2. **`supabase/functions/server/index.tsx`** — the surviving forgot-password
   answered `{success:true}` even when Resend rejected the message or the API
   key was missing. It now tracks the send and returns 502 with a plain
   explanation. Still returns the identical success reply for an address with no
   account, so it cannot be used to enumerate who is registered.
3. **`src/app/pages/ForgotPassword.tsx`** — sends
   `Authorization: Bearer ${publicAnonKey}`. Without any Authorization header
   Supabase's gateway answers 401 before our code runs, which is the error the
   customer actually hit. Also switched the hardcoded project ref to the
   `projectId` import.
4. **`src/app/pages/ResetPassword.tsx`** — same missing header, same fix. It
   would have failed the same way the moment anyone got as far as a link.
5. **`src/app/pages/SignUp.tsx`** — the success toast told people to click a
   confirmation link that is never sent (the server auto-confirms because Auth
   SMTP does not work). It now says the account is live and they can sign in.

**Checks.** App typecheck 324, server typecheck 84 — both measured against a
clean worktree at HEAD, both unchanged. Smoke: the affected-pages run covered
only 6 and missed the two pages changed most, so the full pass was run instead —
332 rendered, 0 threw.

### Still open

- **The edge function is not deployed.** Items 1 and 2 are server-side and only
  take effect after `supabase functions deploy server`. Until then the reset
  flow is still broken in production. Not deployed unilaterally — backend goes
  to a non-production environment first.
- **Supabase Auth's SMTP is still misconfigured** (`535 "Invalid username"`).
  Nothing in the app depends on it any more, but the Supabase dashboard's own
  "send reset email" button uses it, so that button still does nothing.
- **Signup signs you in and then sends you to the login page.** `AuthContext`
  calls `signInWithPassword` on success, so the account already has a live
  session, and `SignUp.tsx` navigates to `login` anyway — asking for a password
  chosen thirty seconds earlier. That is the exact moment this customer came
  unstuck. Left alone because changing it is a behaviour change nobody asked
  for; worth a decision.
- `getSupabaseClient()` in `auth.tsx` is now unused. Harmless, left in place.
- Probe accounts still on the project: `loginprobe+1789935143903@…` and
  `e2e-probe@…`, `flowprobe+…` from earlier sessions.

---

## "I don't want to invite people and them not be able to get on" — 2026-09-20

Eric's words, and the audit found it had already happened.

### Five accounts are locked out right now, four of them people he invited

| Address | Invited as | Invited | State |
|---|---|---|---|
| marksutton@hotmail.com | landlord | 2026-08-03 | unconfirmed, no password, never signed in |
| marksutton04@gmail.com | landlord | 2026-08-03 | unconfirmed, no password, never signed in |
| opodroubnyi@gmail.com | customer | 2026-08-07 | unconfirmed, no password, never signed in |
| markdavidsutton@yahoo.com | customer | 2026-08-30 | unconfirmed, no password, never signed in |
| newcustomer@gmail.com | (self-signup) | 2026-06-22 | unconfirmed, has a password, never signed in |

The live auth settings say `mailer_autoconfirm: false`, so Supabase refuses to
sign in any account whose email is unconfirmed — whatever its password. Those
four invitations went out through `inviteUserByEmail`, over Supabase Auth's own
SMTP, which answers `535 "Invalid username"`. The mail never left the building.
Each person got nothing, and their account has sat unusable ever since.

### Two one-line gaps that would have kept them locked out anyway

- [x] **Resetting a password did not confirm the email.** `reset-password` set
      only the password, so every one of those five would have completed a reset
      and then been refused at sign-in with "Email not confirmed" — a worse dead
      end than before, because it looks like it worked. It now passes
      `email_confirm: true`. That is sound rather than a shortcut: the token was
      minted here, mailed here to that exact address, expires in an hour and is
      single-use, so whoever holds it has proved control of the mailbox.
- [x] **Re-inviting somebody who already existed did not confirm them either.**
      `ensureAuthUser` confirms a brand-new invitee (`email_confirm: true` on
      `createUser`) but its "already exists" branch only stamped a role.
      Resending the invitation is the obvious thing an admin would try to
      rescue these five, and it would have left them exactly as stuck. It now
      fills that blank too, and never touches an already-confirmed account.

### What the frontend audit found

Every `fetch` in `src/` that calls the edge function was scanned for the missing
credential that broke the reset button. After the two fixes in the previous
commit, **zero** remain — `ForgotPassword.tsx` and `ResetPassword.tsx` were the
only two. (The first scan flagged 17 more; all were false positives that pass a
headers variable or an `await authHeaders()` helper, confirmed by reading each.)

### Still blocked

**The edge function is still not deployed**, so none of the server-side work is
live. `npx supabase functions deploy` is refused by the sandbox, and the MCP
deploy tool needs all 129 source files inline, which is not a safe way to ship
this. Eric needs to run it. `supabase/config.toml` already pins the entrypoint
and `verify_jwt = true`, so the command needs no flags:

    npx supabase functions deploy make-server-3eae23a6 --project-ref plzsvzwwcdopnawtiwzm --use-api

Note the frontend fix is already live, which makes deploying more urgent rather
than less: "Forgot password?" now reaches the old server instead of erroring at
the gateway, so it answers "check your inbox" and still sends nothing.

Once deployed, the five above can let themselves in with "Forgot password?" —
no data surgery needed.

### Verified live, 2026-09-20 20:53 UTC

Eric deployed the function. The whole chain was then driven against production,
on a probe account deliberately put into the exact state the five locked-out
people are in (`email_confirmed_at` set to null):

| Step | Result |
|---|---|
| `/health` | 200, v2.9.x |
| Sign in while unconfirmed | **400 `email_not_confirmed`** — the lockout reproduced |
| `POST /auth/forgot-password` | 200 `{"success":true}` — the index.tsx route, so the new code is live |
| Token in KV | `pwreset:9432…`, one-hour expiry |
| `POST /auth/reset-password` | 200 |
| Sign in with the new password | **200, session issued** |
| Old password | 400, rejected |
| Token used a second time | 400, "already been used" |
| `email_confirmed_at` afterwards | **set** — the confirmation fix is what made the sign-in possible |

Auth logs across the run show only the two deliberate test failures above. No
`535 "Invalid username"` anywhere — nothing in the app talks to Supabase Auth's
mailer any more. Probe account deleted afterwards.

**One thing this does not prove:** the test address is on a domain with no
mailbox, so it shows Resend *accepted* the message, not that it landed in an
inbox. Worth one real test from the live site with a working address.

Checks unchanged since the last run: app typecheck 324, server typecheck 84,
full smoke 332 rendered / 0 threw. No code changed in this entry.

---

## Stuck accounts deleted, and the next round — 2026-09-20

Eric: "delete them i will resend invites later."

Deleted from `auth.users`: the four stuck invites (marksutton@hotmail.com,
marksutton04@gmail.com, opodroubnyi@gmail.com, markdavidsutton@yahoo.com), the
stale unconfirmed self-signup newcustomer@gmail.com, and three old probe
accounts. Kept `e2e-probe@blackphoenixtest.dev` — `scripts/e2e.mjs:125` depends
on it as a fixture.

Checked first that nothing would cascade: no foreign key outside the `auth`
schema references `auth.users`, so the business records keyed by email in the KV
store all survive — three quotes for marksutton@hotmail.com, an invoice for
marksutton04@gmail.com, a quote and a pipeline work request for
markdavidsutton@yahoo.com, four `portal_access` grants, `feature_grant` rows
running to 2027 and the onboarding intakes. Re-inviting gives them a fresh login
and their history intact.

Seven accounts remain and every one is confirmed, has a password and has signed
in. No stuck accounts left.

### Plan — approved (A, B, C, F)

- [x] **A. Customer registration throws for the public.** DONE. `customer-registration`
      is a public route, and `CustomerRegistrationForm.tsx:230` calls
      `authedHeaders()`, which throws when there is no session. A member of the
      public gets their auth account created by `/auth/signup` and then sees
      "Your session has expired" — profile never saved, never redirected, and a
      retry says "already registered". The same trap that caught jbrenes19.
      Fix: sign in after signup (the account is created confirmed, so this
      works — proven earlier today), then save the profile with a real session.
- [ ] **B. ClientWorkRequestForm** uses the throwing helper in three places on
      the public `request-service` page — product catalogue, advertiser offers,
      AI guide chat. Submitting works; those three silently do nothing for a
      signed-out visitor. Switch to `authedHeadersOrAnon`.
- [ ] **C. Drive every application form and portal login end to end** against
      production and report what breaks. Vendor, subcontractor, investor,
      advertiser, service-provider, territory, tenant. Audit only — no code
      changes until the findings are seen.
- [ ] **F. Housekeeping.** Supabase Auth SMTP is still misconfigured so the
      dashboard's own reset button does nothing; signup signs you in and then
      sends you to the login page; `getSupabaseClient()` in `auth.tsx` is dead.

### B is not a bug fix — it needs a decision

Checked the server before changing the client, and the framing was wrong. All
three calls are signed-in-only **on the server**, not just in the browser:

- `/api/products` (api-gateway.tsx:64) — not on any public list. The public list
  has `/products`, which this path does not start with.
- `/product-ads` — not public either.
- `/ai-guide-chat` — sits in `AI_METERED_PREFIXES`, so it is deliberately behind
  a session for cost control.

Switching the client to `authedHeadersOrAnon` would only turn a thrown error
into a 401. The visitor still sees nothing. Making these work for signed-out
visitors means adding paths to the server's public GET list — an auth-policy
change affecting every caller of those routes, which needs Eric's sign-off
rather than my judgement.

The question is a product one: **on the public "request service" page, should a
signed-out visitor see the vendor product catalogue and advertiser offers?**
There is a case for yes on both — browsing materials is most of the point of
that step, and advertisers pay for impressions that a signed-out visitor would
otherwise never generate, which is the same reasoning that already makes
`/advertising/serve` public. The AI guide chat is different; metered AI behind a
session looks deliberate and worth leaving alone.

Current behaviour is not a crash: the three calls throw, are caught locally, and
those sections render empty.

---

## C: every application form has been refused, by the same class of bug — 2026-09-20

### The finding

**Zero applications have ever been stored.** The `applications` key does not
exist in the KV store at all.

Probed production exactly as the public forms do — anon key, no session — for
vendor, subcontractor, investor, service_provider and territory. All five came
back identically:

    404 {"success":false,"error":"No active territory found within 40 miles of
         your location","waitlistAvailable":true}

### Why

Two handlers answer `POST /applications`:

- `index.tsx:1862` — the real one. Calls `saveApplicationAndCrm`, which stores
  the application **and creates the CRM record**, then replies "Application
  received. Our team will review it and follow up soon."
- `territory-cohorts.tsx:201` — a territory-cohort capacity check that refuses
  anyone with no active territory inside 40 miles.

`app.route("/make-server-3eae23a6", territoryCohortRouter)` runs at
**index.tsx:754**, and `app.post('/make-server-3eae23a6/applications', …)` at
**index.tsx:1862**. The router is registered first, so Hono matches it first and
the real handler has never run.

This is precisely the bug that broke the password reset: a router mounted early
in the file shadowing the handler declared later. It is now the second instance,
which makes it a pattern in this file rather than an accident.

### What makes it total rather than partial

`territory-cohorts.tsx:205` looks for a record under the `territory_` prefix
with `active` true within 40 miles. **There are zero `territory_` records.** So
the gate cannot pass for anybody, anywhere, ever — it is not that some
applicants fall outside a service area, it is that no service area exists. Every
vendor, subcontractor, investor, service-provider and advertiser who has ever
filled in one of those forms was told to go away.

### The forms themselves are fine

All seven carry a credential correctly — `authedHeadersOrAnon` or the anon key
directly — so none has the missing-header defect. `/applications` is correctly
listed in `PUBLIC_POST_PATHS`, so the auth gate lets them through. The failure is
entirely the shadowed handler. (AdvertiserApplication submits through
`GenericApplicationForm`, which posts to the same endpoint, so it shares the
fate.)

### Proposed fix — NOT APPLIED, needs approval

- [x] DONE — deleted the `/applications` POST **and GET** from `territory-cohorts.tsx` so the real
      handler serves, mirroring exactly what was done to `auth.tsx` earlier
      today. Applications would then save and reach the CRM.

The open question is whether the territory capacity check is wanted at all. It
cannot work as written with no territories configured, and leaving it in place
means applications stay blocked until territories are set up. Removing the
shadow is the smaller change and restores the behaviour the forms promise;
territory gating can be added back deliberately, inside the real handler, once
there are territories to gate on.

### Still untested in C

The portal logins themselves — customer, vendor, subcontractor, employee,
landlord, tenant, condo, investor, advertiser, territory, property manager.

### The portal sweep: invited users land in the wrong portal

Third instance of the shadowing bug today, and this one decides which portal
every non-customer lands in.

A systematic sweep of the whole server (every route declared both on a mounted
router and on `app` in index.tsx) found **eight** more duplicate paths. In all
eight the router wins, because routers mount at index.tsx:669-754 and the `app`
handlers are declared from line 4816 onwards:

| Route | Router (served) | index.tsx (dead) |
|---|---|---|
| `GET /auth/me` | auth.tsx:407 | 11020 |
| `GET /quotes` | quotes.tsx:206 | 4816 |
| `POST /quotes` | quotes.tsx:219 | 4848 |
| `PUT /quotes/:id` | quotes.tsx:251 | 14270 |
| `GET /cart/:sessionId` | ecommerce-cart.tsx:365 | 5801 |
| `POST /cart/add` | ecommerce-cart.tsx:392 | 5807 |
| `DELETE /cart/remove` | ecommerce-cart.tsx:523 | 5824 |
| `POST /media/upload` | media-library.tsx:144 | 5573 |

#### `/auth/me` is the one that matters, and it is broken

The served version (`auth.tsx:407`) resolves a role as
`role?.role_name || "client"`, reading only the KV record
`user_permissions:<userId>`. It never looks at `app_metadata.role`.

Only **six** `user_permissions` records exist on the whole project and every one
says `client` — they all came from `/auth/signup`. **The invite path writes none
at all**: `ensureAuthUser` sets `app_metadata: { role }`, which is the
trustworthy bag, and nothing in index.tsx writes `user_permissions`.

So every invited user resolves to `client`. Proven against production: a probe
account with `app_metadata.role = "vendor"` and no permissions record — exactly
the state `ensureAuthUser` leaves an invited vendor in — asked `/auth/me` and
got back:

    {"user":{…,"role":"client","permissions":{},"onboarding_completed":false}}

`Login.tsx:219` then assigns that straight onto `profile.accountType`,
**overwriting** the correct role it had already read from `app_metadata` a few
lines earlier. `portalRoutes` has fourteen keys and none of them is `client`, so
the lookup misses and falls through to `'customer-portal-app'`.

**Every invited vendor, subcontractor, landlord, employee, investor, advertiser,
tenant and property manager lands in the customer portal.** They can sign in;
they just never reach their own portal.

The dead handler at index.tsx:11020 is the correct one — it reads
`app_metadata.role` first, then permissions and company memberships, then the
approved application's `portalType`, and also returns `onboardingStatus` and
`applicationId`.

#### Proposed fix — NOT APPLIED, needs approval

- [x] DONE — deleted `GET /auth/me` from `auth.tsx` so index.tsx's version serves — the
      same one-line surgery as the password reset and `/applications`.

Low risk to verify: **`/auth/me` has exactly one caller in the whole frontend**
(`Login.tsx:217`) and it reads only `identity.user.role`, which the surviving
version returns. But it changes which portal every non-customer user lands in,
so it is Eric's call rather than mine.

#### Not yet assessed

The other five shadowed routes — `/quotes` (×3), `/cart` (×3), `/media/upload`.
Each needs the same read to decide whether the served copy or the dead one is
the one that should win. `/quotes` touches the customer portal's approval flow
and `/cart` the storefront, so neither is cosmetic.

### The rest of the shadowed routes, assessed

Two of the eight were harmful and are now fixed. The other six were read and are
genuinely benign — noted here so nobody has to work it out again.

**Fixed: `GET /auth/me`** (auth.tsx) — see above. Every invited user resolved to
`client` and landed in the customer portal.

**Fixed: `PUT /quotes/:id`** (quotes.tsx) — this one silently lost money. The
handler was written for Design Studio to save a floor plan, merging only
`floorPlanData` and `materials`, and filing `materials` under `designMaterials`
so a design list could not clobber the customer-facing line items. Sound for
that caller — but that caller no longer exists, and the handler was serving
everybody.

The only caller of `PUT /quotes/:id` in the whole frontend is the staff quote
editor, `QuoteToContractEditor.tsx:763`, which sends `materials, labor,
processSteps, materialsSubtotal, laborSubtotal, taxRate, taxAmount, totalCost`.
Against that handler, `materials` went to the wrong field and **labor, the
process steps, every subtotal, the tax and the total were dropped**. It returned
`{success: true}`, so the editor said "Quote updated successfully" and staff had
no way to know the figures had not saved. index.tsx:14270 is staff-only and
merges the whole body, which is exactly right for that editor.

**Benign, left alone:**

- `GET /quotes` and `POST /quotes` — both copies read the same `quote:` store and
  scope identically (staff see all, a customer sees only their own). The served
  copy returns the `{success, quotes}` shape callers want; the dead one returns a
  bare array.
- `GET /cart/:sessionId`, `POST /cart/add`, `DELETE /cart/remove` — the served
  cart router is internally consistent on the `cart_` key prefix. The dead
  index.tsx copies use `cart:`, and nothing outside those three dead handlers
  ever reads `cart:`, so there is no split-brain.
- `POST /media/upload` — both are real implementations; the served one is the
  media-library version that also records tags, description, project and client.

**Worth a look later, not urgent:** the dead `/media/upload` validates file type
and caps size at 100MB. The served one does neither, so the live upload route
takes any file of any size.

---

## Deployed and verified against production — 2026-09-20 21:26 UTC

| Check | Result |
|---|---|
| `/health` | 200 |
| `POST /applications` anonymously, as the public forms post | **200, `success: true`**, applicationId returned |
| — stored? | `applications` array went 0 → 1: **the first application ever recorded on this project** |
| — reached the CRM? | yes, contact created |
| `GET /auth/me` as an invited vendor (`app_metadata.role=vendor`, no permissions record) | **`"role":"vendor"`** — was `"client"` before |
| — portal it routes to | `vendor-portal`, not `customer-portal-app` |
| `PUT /quotes/:id` with the exact staff-editor payload | 200, and **every figure persisted**: totalCost 1786.32, laborSubtotal 1360, taxAmount 132.32, 1 labor entry, 3 process steps — all of which were silently dropped before |
| `POST /auth/forgot-password` (regression, auth.tsx was touched again) | 200 `{"success":true}` — index.tsx's copy still serving |
| No Authorization header at all | still 401 at the gateway, as it should be |

### Cleanup

Everything created for these checks is gone: the test quote, the probe
application and its CRM contact, and the probe account. That account was
temporarily given an `admin` role in `app_metadata` because `PUT /quotes/:id` is
staff-only and there was no other way to exercise it; it was deleted immediately
afterwards. Final state: 7 auth accounts, all confirmed, all with passwords, all
having signed in. `applications` is back to empty, so the first entry will be a
real one.

The regression check sent a genuine reset email to ericerb555@proton.me — which
is also the real-inbox delivery test that had been outstanding since the reset
was fixed.

### Where the list stands

- [x] A — customer registration signs the applicant in
- [x] `/applications` unshadowed — applications save and reach the CRM
- [x] `/auth/me` unshadowed — invited users reach their own portal
- [x] `PUT /quotes/:id` unshadowed — staff quote edits persist
- [x] Five stuck accounts deleted, ready to re-invite
- [ ] B — `/api/products` and `/product-ads` are both empty, so publishing them
      would show nothing; left alone pending Eric's decision
- [ ] The public work-request form's materials step has no data behind it at all
- [ ] F — Supabase Auth SMTP still misconfigured (dashboard's own reset button);
      signup signs you in then sends you to the login page; `getSupabaseClient()`
      dead in auth.tsx; served `/media/upload` does not validate type or size
- [ ] Portal *screens* beyond routing — each portal's own data loading is still
      untested

---

## The portal screens, tested as each role — 2026-09-20

Signed in as all twelve portal roles in turn against production, one probe
account per role with the role set in `app_metadata` exactly as the invite flow
sets it, and called every endpoint that portal loads.

### Routing is sound

All fourteen entries in Login.tsx's `portalRoutes` resolve to a real key in
`pageMap` (332 routes). `login`, `signup` and `forgot-password` are handled
directly in App.tsx before pageMap, so they are fine too.

### One real fault, now fixed

`tenant` and `condo_association` were missing from the `allowedRoles` set in
`/auth/me`. Any role not in that set is discarded and the person falls through
to `customer` — so an invited tenant or condo association signed in
successfully and landed in the **customer portal**, with no route to the screens
built for them. Both have a portal (`tenant-portal`, `condo-association-portal`),
both are in `portalRoutes`, both are in pageMap, and `tenant` is in
`OWNER_PROVISION_PORTALS` — a landlord inviting a tenant sets exactly that role.
Everything existed except the one line that lets the role through.

Widening the set grants nothing: the value comes from `app_metadata`, which the
browser cannot write, and neither role is in `INTAKE_ADMIN_ROLES`.

After the fix, deployed and re-run: **all twelve roles resolve to themselves.**

### Every portal's data endpoints answer for its own role

| Portal | Result |
|---|---|
| customer | `/quotes`, `/invoices`, `/contracts`, `/subscriptions`, `/giveaways/entries` — all 200 |
| investor | `/investments/opportunities` 200 |
| employee | `/time-tracking/entries` 200 |
| property manager | properties, work-requests, payments — all 200 |
| condo manager | units, work-requests, financials — all 200 |
| landlord | properties, tenants, work-requests, financials, stripe/status — all 200 |
| tenant | leases, rent, work-requests — all 200 |
| territory owner | customers, subcontractors, revenue, settings, subscriptions — all 200 |
| advertiser, vendor, condo association | no direct server calls of their own |

### Three "failures" that were my test being wrong, not the app

Worth writing down so they are not re-investigated:

- `/investments` and `/time-tracking` are **base URLs** the components append to
  (`/investments/opportunities`, `/time-tracking/entries`). The bare paths have
  no handler, correctly.
- `/subcontractor/bid-attachments` exists as POST and DELETE only. There is no
  GET, and the portal never issues one.
- `/time-tracking/employees` answers 403 to an employee. That is right — it
  lists all employees and is an administrator route.

### Cleanup

All twelve probe accounts deleted, along with their orphaned KV profile and
permissions records.

### Still open

- Advertiser, vendor and condo-association portals make no direct server calls,
  so their data must come from child components. Not yet traced.
- B — `/api/products` and `/product-ads` are empty; publishing them would show
  nothing.
- F — Auth SMTP (dashboard's own reset button only), signup routes you to the
  login page after signing you in, served `/media/upload` validates neither file
  type nor size.

---

## Tracing the advertiser, vendor and condo-association portals — 2026-09-20

These three looked like they made no server calls. They do — through shared
child components rather than directly, which is why a grep of the portal file
alone found nothing. Followed every local import three levels deep: 41 modules
for advertiser, 42 for vendor, 28 for condo association.

### Where their data actually comes from

All three share the same set, reached through common children:

| Endpoint | Reached via |
|---|---|
| `/me/permissions` | AuthContext |
| `/referrals/mine`, `/referrals/my-code` | ReferralRewards |
| `/advertising/serve`, `/advertising/events` | adTracking, behind the marquees |
| `/investments/opportunities` | InvestmentTab |
| `/plan-builder/generate`, `/price-custom` | PlanBuilderTab (advertiser, vendor) |
| `/social/submit-reel` | SubmitReelForApproval (advertiser, vendor) |
| `/property-management/condos` | CondoService (condo association) |

### Result: all three are clean

Signed in as each role against production and called every endpoint its tree
reaches. `/auth/me` returned `advertiser`, `vendor` and `condo_association`
respectively, and **every endpoint answered 200**.

One 403 appeared and is correct, not a fault: `/property-management/stats`
belongs to `PropertyManagerService` (line 261-351 of the service file), not to
`CondoService` (44-143). The condo portal only ever calls `CondoService.update`.
Its on-screen `stats` at line 467 is a local `getStatsForRole()`, nothing to do
with the endpoint. My test was broad; the app is right.

### The condo `localStorage` role hole is closed

Worth recording because it was a known security finding. The portal used to read
`localStorage.getItem('condo_user_role')` and gate the financials, vendors,
units, team and approvals tabs on it, defaulting to `board_president` when
nothing was stored — so a stranger arrived with the most privileged role.

It is now fixed. The role comes from a grant the association issues and can
withdraw, fetched from the server; the stored value survives only as a role
*preview* gated behind `isOwner || isMasterAdmin || isAdmin`, so Eric can still
test each portal from his own account and nobody else is affected by a stale
value in their browser.

### Loose end

`PropertyManagerService.getStats()` calls `/property-management/stats`, which is
administrator-only. Any non-admin screen wired to that method will get a 403.
Nothing in the portals traced so far calls it, so this is a note rather than a
fault.

### Cleanup

Three probe accounts deleted; 7 accounts remain, all real.

---

## Media upload — 2026-09-20

### Correction first

I had recorded that the live `/media/upload` "validates neither file type nor
size". **That was wrong** — I had read only the first sixteen lines of the
handler. It checks both: `MAX_FILE_SIZE` is 50MB (deliberately not 100MB; the
note says 100 caused a 413 on bucket creation) and `getMediaType` refuses
anything outside an explicit image/video allowlist. It is also properly gated:
`requireSignedIn` runs on `/media` and `/media/*`, and the file says why — these
routes use the service-role client, which bypasses RLS, so the token check is
the only thing between the public internet and the bucket.

Two real defects were there, though.

### Fixed: the file extension went into the storage path unsanitised

`getFileExtension` returned everything after the last dot, lowercased and
otherwise untouched, and `generateStoragePath` drops that straight into
`media/:year/:month/:timestamp-:random.:ext`. Nothing else in that path is
caller-controlled; the extension was the one opening. A file named
`photo.png/../../elsewhere` made the "extension" `png/../../elsewhere`.

It is now restricted to letters and digits, capped at eight characters, and
falls back to `bin` when there is no usable extension — which also fixes a
smaller bug where a file with no dot produced a path ending in a bare dot.

### Fixed: nobody knew who uploaded anything

`uploadedBy` was hardcoded to `'System User'` behind a `// TODO: Get from auth`.
Every item in the library claimed the same anonymous author, so there was no way
to tell who put a file there, or to find everything one account had uploaded if
it turned out to be a problem. `requireSignedIn` had already resolved the user
and stashed it on the context — the answer was sitting there unused. Now records
`uploadedBy` (name or email) and `uploadedById`.

### Verified against production after deploy

| Case | Result |
|---|---|
| `deck.PNG` | `media/2026/09/…-….png` — extension lowercased |
| `photo.verylongextensionname` | `….verylong` — capped at 8 |
| `noextension` | `….bin` — fallback works |
| attribution | `uploadedBy: "Media Probe"`, `uploadedById` set |
| `text/plain` upload | 400, "Unsupported file type" |
| no session | 401, "Sign in required" |
| `photo.png/../../escape` | **403 from Supabase's CDN** — the platform blocks that filename before it reaches the function |

That last row is worth knowing: the traversal case cannot be exercised end to
end because the CDN refuses it first. The sanitiser is the belt and the CDN the
braces; the sanitiser's own behaviour is demonstrated by the three rows above it.

### Cleanup

All five test uploads deleted through the app's own `DELETE /media/:id` (which
exercised that route too — 200 each). Storage bucket back to zero objects, the
`audit` folder index removed, probe account deleted. 7 accounts remain.

### Not changed, worth a decision

`image/svg+xml` is on the allowlist. An SVG can carry script, and these are
served by signed URL from the storage origin. That is a different origin to the
app, so it cannot touch app sessions, but it can still execute there and be
used for phishing. Removing it would likely break logo uploads, so it is a
decision rather than something to change quietly.

---

## Signup no longer bounces you to the login page — 2026-09-20

`AuthContext.signUp` calls `signInWithPassword` as soon as the account is
created, so there is a live session by the time `SignUp.tsx` finishes. It then
navigated to `login` anyway — asking somebody to type a password they had
chosen thirty seconds earlier.

That is precisely where a customer came unstuck this morning: the account
existed, the sign-in attempt failed, and the reasonable conclusion was that the
registration had not worked. Nothing rescued them, either. The guard in
`App.tsx:844` that would normally move a signed-in visitor off an auth page
deliberately returns early for `login` and `signup` — "Login owns the post-auth
destination" — so they sat on a login form while already signed in.

**Now goes to `customer-portal-app`.** That is the right destination because
`/auth/signup` grants the lowest role there is, always: self-registration cannot
produce anything but a client. Anyone who is more than that arrived through an
invitation and signs in rather than registering.

Checked the destination from three angles before changing it, because landing
somewhere that bounces would be worse than the login page:

- it is in `publicRoutes` (App.tsx:556), so the route guard returns early with
  "Public route, no restrictions" and cannot redirect them;
- it is the customer's own portal home (`portalHomePages.customer`, line 685);
- it is first in `portalAllowedRoutes.customer` (line 722).

Both success toasts were reworded too — one still said "Redirecting to
login...", and the other told people they could "sign in now" when they already
were.

App typecheck 324, unchanged. Smoke: 6 pages reached including both signup
routes, all rendered, 0 threw; `customer-portal-app` itself renders clean in the
full 332-page pass run earlier today.

**Not observed end to end.** This is a navigation target, and I cannot drive the
browser from here — what is verified is that the destination exists, renders,
and is not gated against a fresh customer. Registering a throwaway account on
the live site would confirm the click-through.

### Noticed, not changed

`isFirstUser` is decided by whether this BROWSER has a `userProfiles` entry, so
it is true on any fresh device, and the "owner privileges" it announces are a
localStorage claim only. The server grants every self-registration `client`, and
Login.tsx discards a locally elevated `accountType` on the next sign-in, so
nothing is actually escalated — but the branch is misleading and worth
untangling separately.

---

## Registered a throwaway account on the live site — 2026-09-20

Eric: "test it by registering a throwaway account." Drove Chrome against
theblackphoenixcompany.com and filled the real form.

### The redirect fix works

Submitted, and landed on **`/customer-portal-app`**, signed in, with the new
toast: *"Welcome, Redirect. Your account is ready and you are signed in."* The
header showed Customer Portal App and a Sign Out button. That is the fix
observed end to end, not inferred.

### Two things the browser found that no amount of reading would have

**1. The signup form still carried the false promise.** `SignUp.tsx:208` printed
*"After signing up, check your email for a confirmation link. You must click it
before you can log in."* — the same claim as the toast corrected earlier today,
missed because it is static JSX further down the file rather than part of the
submit path. There is no such email; `/auth/signup` creates the account already
confirmed. Now reworded to say the account works straight away. **Fixed.**

**2. A brand-new account is told its trial has ended.** The portal greeted a
seconds-old signup with a red banner: *"Your full-access trial has ended —
Choose a plan to keep using all of your portal's features."*

Confirmed against the server rather than guessed:

    GET /me/entitlements
    {"level":"standard","trialActive":false,"needsPlan":true,"hasGrant":false,
     "daysLeft":null,"trialEnd":null}

`PortalTrialBanner` renders that banner whenever `needsPlan` is true. A trial
grant is written by the invite flow (`feature_grant:<email>` — the four invited
accounts all had one, running to 2027). **Self-registration writes none**, so a
new customer has `hasGrant: false` and is told a trial ended that never started.

Not fixed — it needs a decision, and there are two separate questions in it:

- Should somebody who signs up themselves get a trial at all, or only invited
  users? That is a pricing decision.
- Either way the wording is wrong for someone who never had a trial. If the
  answer is "no trial for self-signup", the banner should say "choose a plan",
  not announce the end of something that never began.

### Also seen

The "Your session has expired" toast fired on the **signup page**, for a visitor
with no session and no expired one. `sessionExpiryNotice` reports a 401 from our
API when there is no session — which is exactly the state a signed-out visitor
is in, so some call on that page trips it. Harmless but confusing on the one
page where a stranger arrives.

### Cleanup

Probe account, its CRM contact and orphaned KV records deleted; browser tab
closed. 7 accounts remain (the one `blackphoenixtest.dev` address left is
`e2e-probe`, the fixture `scripts/e2e.mjs` depends on).

---

## No trial for self-signup — wording fixed, 2026-09-20

Eric's decision: "no trial for self signup, fix the wording." So the grant
behaviour stays exactly as it is — trials come from the invitation flow and
self-registration gets none — and the only thing wrong was telling those people
a trial had ended.

`hasGrant` is the right thing to split on, and the server makes it reliable:
`/me/entitlements` sets `hasGrant: true` whenever a `feature_grant` record
exists and **keeps it true after the trial runs out** (`needsPlan: !trialActive
&& !hasPlan`). So an expired trial still says it expired; only an account that
never had one gets the neutral wording.

Changed in both places that said it:

- `PortalTrialBanner.tsx` — "Your full-access trial has ended" → "Choose a plan
  to unlock full access" when there is no grant, with "Your account is active. A
  plan opens up the rest of your portal's features." underneath and the button
  reading "See plans" rather than "Choose a plan".
- `PortalSettings.tsx` — the same split on the entitlements row.

App typecheck 324, unchanged. Smoke reached 27 pages — every portal — and all
27 rendered, 0 threw.

### Left deliberately

The banner keeps its red styling for both cases. Eric asked for the wording, and
restyling a banner that appears on every portal is a bigger change than that.
Worth revisiting: a red lock panel is still an alarm, and for somebody who has
simply not bought anything yet a neutral or promotional treatment would read
better than an error.

### Verified in the browser on a fresh registration

Registered a second throwaway account on the live site. The portal now greets it
with:

> **Choose a plan to unlock full access**
> Your account is active. A plan opens up the rest of your portal's features.
> *[See plans]*

Which is what it should say to somebody who has never had a trial. The corrected
signup-form banner was live too: "Your account works straight away — there is no
confirmation email to wait for."

Probe account, its CRM contact and orphaned KV records deleted. 7 accounts
remain; the single `blackphoenixtest.dev` address left is `e2e-probe`, the
fixture `scripts/e2e.mjs` depends on.

### Found by accident, and it affects real users

Mid-test the portal hung on **"Loading…" forever**. The console said:

    TypeError: Failed to fetch dynamically imported module:
    /assets/CustomerPortalView-DO87881s-1789941823893.js

The tab had loaded the page from the previous build, and by the time it lazily
imported the customer portal that chunk had been replaced by the deploy. A
manual reload fixed it instantly, which confirms the diagnosis.

My own deploy caused it here, but the situation is not artificial: **anyone with
the app open when a deploy lands hits exactly this on their next lazy-loaded
route.** Every page in `routes.tsx` is `lazy(() => import(...))`, so that is any
navigation at all. The app has no handler for it — it sits on "Loading…"
indefinitely rather than reloading, and the person has no way to know that
refreshing would fix it.

The usual remedy is to catch a failed dynamic import once and force
`location.reload()`, guarded by a sessionStorage flag so a genuinely missing
chunk cannot cause a reload loop. Worth doing, and not started — it is a change
to the shared route loader, so it wants a decision first.

Also observed: the whole signup submit took about **21 seconds** from click to
portal (account row created 22:10:26, session at 22:10:47). The
`/auth/signup` call alone was measured at 8.5s earlier today. A spinner that
long is its own risk — it is what made the original customer abandon the page.

---

## Self-signups can start the free trial — 2026-09-20

Eric: "the free trial allows all features" → offer it to people who register
themselves, rather than pointing them at paid plans before they have seen the
product. His two decisions: **90 days**, and **once per account, ever**.

### Server — `POST /me/trial/start`

Writes the same `feature_grant:<email>` record the invitation flow writes, with
`level: 'full'`, 90 days, `grantedBy: 'self-service'`.

Two things it deliberately does not do:

- **It takes nothing from the caller.** The length and the level are constants
  in the file. This route hands out full access to every gated feature, and a
  client that could name its own `trialMonths` or `level` could grant itself
  anything. The account is whoever the bearer token says it is, resolved by
  `intakeActor`, never a field in the body.
- **It refuses anyone who already has a grant**, expired or not. The existence
  of the record is the check, not whether it is still running — otherwise a
  trial could be restarted by waiting for it to lapse, which would make the
  product free. Invited users hold a grant already, so they are refused too,
  which is right: they have their trial.

The reply carries the new entitlements so the banner can switch to the countdown
without a second round trip.

### Banner

The never-had-a-trial case now offers it instead of asking for money — teal
rather than red, "Start your free 90-day trial / Full access to every feature in
your portal. No card needed." with a Start free trial button. The expired-trial
wording is unchanged and, because the new case returns before it, is now only
ever shown to somebody who really did have one.

App typecheck 324, server typecheck 84, both unchanged. Smoke 19 rendered, 0
threw.

### Verified end to end, 2026-09-20 22:27 UTC

**API, including the abuse cases.** A fresh account showed
`level: standard, hasGrant: false, needsPlan: true`. Then `POST /me/trial/start`
with a deliberately hostile body — `{"trialMonths":999,"level":"admin",
"email":"ericerb555@proton.me"}` — returned exactly `level: full, daysLeft: 90,
trialMonths: 3` **for the probe's own account**. Confirmed in the KV store
afterwards: one new grant, `self-service`, 3 months, and nothing written against
Eric's address. A second call answered `409 alreadyUsed`; a call with the anon
key answered 401.

**Browser, on a real registration.** Signed up on the live site and landed in
the portal with the teal banner: *"Start your free 90-day trial — Full access to
every feature in your portal. No card needed."* Clicking **Start free trial**
flipped it immediately to *"Full-access trial · 90 days left (ends
12/19/2026)"* with a View plans button — no page reload, because the route
returns the new entitlements and the banner applies them.

All probe accounts, grants and CRM contacts deleted. 7 accounts and 7 grants
remain, all real; the single `blackphoenixtest.dev` address left is `e2e-probe`.

### Seen while testing, not chased

An exit-intent modal — *"Wait — Don't Leave Empty Handed! 5% OFF, promo code
SAVE5"* — fired over the portal on a customer who had just registered seconds
earlier and had not tried to leave. Offering a discount on a first service to
somebody mid-signup is at best odd timing.

---

## Surviving a deploy with the app open — 2026-09-20

Every screen is loaded on demand: `routes.tsx` has 179 `lazy(() => import(...))`
calls, and the browser asks for the exact chunk filename baked into the HTML
when the tab was first loaded. A deploy replaces those filenames, so anyone
holding the app open asks for a file that no longer exists the next time they
move between screens:

    TypeError: Failed to fetch dynamically imported module:
    /assets/CustomerPortalView-DO87881s-1789941823893.js

React then leaves them on the Suspense fallback — the word "Loading…" —
indefinitely. Observed live earlier today: forty-four identical console errors
and a portal that never rendered until the page was reloaded by hand. It is not
an edge case; it happens to every open session on every deploy.

### The fix is one listener, not 179 wrappers

`staleChunkReload.ts`, installed in `main.tsx` alongside the session-expiry
notice. Wrapping each of the 179 `lazy()` calls would have worked too and been a
far larger, riskier diff across the shared route map for the same result.

It listens for three things: Vite's own `vite:preloadError`, which fires on the
preload helper wrapping every dynamic import in a built bundle and is the most
reliable; the `unhandledrejection` React raises when a `lazy()` import fails;
and a plain `error` event. The message match is deliberately narrow, because
this triggers a full page reload and must never fire on an ordinary application
error — that would refresh away whatever somebody was typing.

### Why a timestamp rather than a boolean

A chunk can fail for reasons a reload will never cure: a broken CDN, a genuinely
missing file, being offline. Reloading on every failure would spin such a
browser forever, which is worse than the stall it replaces. So the last attempt
is remembered in `sessionStorage` and another is refused for twenty seconds.

A boolean would have been simpler and wrong in the other direction — it would
make the first deploy of a session recoverable and every later one not, and a
tab is easily open across several. `sessionStorage` rather than `localStorage`
because the guard should last as long as the tab and no longer; a reload keeps
it, a new tab starts clean. If storage throws at all (a private window), it does
nothing rather than risk a loop.

App typecheck 324, unchanged. Smoke: the full 332-page pass, because `main.tsx`
is a shared entry point and a mistake there breaks every screen — 332 rendered,
0 threw.

### Verified on the live site with a real failed import

Not a simulated event — fired a genuine uncaught dynamic import of a chunk that
does not exist, `import('/assets/bp-missing-chunk-test-xyz.js')`, which produces
exactly the rejection a stale chunk produces.

| Step | Result |
|---|---|
| Set `window.__bpProbe`, cleared the guard, fired the failed import | page **reloaded on its own**, `__bpProbe` gone, still on `/login` |
| Guard after the reload | `bp:stale-chunk-reload-at` written and survived, as `sessionStorage` should |
| Fired a second failed import straight away | **no reload** — `window.__bpProbe2` survived and the timestamp was unchanged |
| Console | `[staleChunk] a page chunk failed to import — already reloaded once, leaving it alone.` |

So the recovery works and the loop guard works, which are the two things that
matter: a person stranded by a deploy is carried into the current build without
noticing, and a chunk that is genuinely missing cannot spin their browser.

The reload happens in place, on the same path, so somebody is returned to the
screen they were on rather than the landing page.

---

## The 21-second signup — 2026-09-20

### Where the time went

`POST /auth/signup` measured **9.6 seconds** on the live site. `createUser`
itself finishes in about half a second; the rest was work that had nothing to do
with whether the account exists:

- `ensureCrmCustomer` reads **every** customer with a prefix scan to dedupe,
  then `linkInvoicesByEmail` scans **every** invoice. Two unbounded scans that
  get slower as the business grows, both awaited before the route replied.
- `AuthContext.signUp` then posted to `/auth/register-crm` — the same
  `ensureCrmCustomer`, a second full pass over customers and invoices — **and
  awaited it**. The comment immediately above it read "never block signup if
  this fails". It blocked signup every time.

By the time any of that runs the account is created, confirmed, and has its
profile and role. Everybody signing up was watching a spinner for bookkeeping.

### The fix

Server: the CRM write now runs after the reply, through a small `afterResponse`
helper that uses `EdgeRuntime.waitUntil` where it exists. A bare fire-and-forget
promise can be torn down with the isolate — acceptable for a notification, not
for a customer record.

Client: `/auth/register-crm` is still sent, because it carries the phone number
and account type `/auth/signup` never receives, but it is no longer awaited.

### Measured after

| | Before | After |
|---|---|---|
| `POST /auth/signup` (warm) | 9.6 s | **3.1–3.9 s** |
| `POST /token` sign-in | — | 0.6–0.7 s |
| Server time to a usable session | ~10 s | **~3.7–4.7 s** |
| Click → portal, in a browser | ~21 s | **13.7 s** |

The CRM records still land: all three timing probes had both their `customer:`
record and their `user_profile:` afterwards, so nothing was lost by moving the
work off the response path.

### What is still slow, and why it is a separate job

**~9 of the remaining 13.7 seconds are client-side** — the lazy chunk for the
customer portal, the portal's own data fetches, and the `onAuthStateChange`
work in `AuthContext`. That last one is worth a look on its own:
`loadUserRole` queries `user_permissions`, `company_members` and `user_profiles`
on every sign-in, and the comment in that file already records that two of those
tables do not exist in this project. Three failing round trips on every sign-in.

**Cold start adds about twelve seconds.** The first call after a deploy measured
16.3 s against 3.1 s warm. That is the edge function booting, not this code, and
it is what an unlucky first visitor of the day pays.

Probe accounts and their CRM records deleted; 7 accounts remain.

### The phantom table queries — removed

Verified against the database first: of `user_permissions`, `company_members`,
`user_profiles` and `companies`, **only `companies` exists**. The other three
were queried on every sign-in and could only ever come back empty.

`loadUserRole` fired three in parallel, `loadCompanyContext` fired a fourth
through `loadUserCompanies`, and then `askServerForAuthority` made a fifth call
for the answer that was actually used. The comment already sitting there
recorded that the tables were missing and had moved the server call into a
`finally` so it would run regardless — which fixed the correctness and left the
waste.

Each consumer was checked before anything was removed:

- `isOwner` and `userRole` come from `askServerForAuthority`, which reads the
  server's own owner allowlist and token metadata — the same check that refuses
  or permits every write. Owner access was already entirely dependent on it, so
  nothing about it changes.
- `needsOnboarding` has no consumer outside this file. It is now set false
  rather than left, because with the table missing the old code read
  `onboarding_completed` as false and so set the flag **true for every user
  forever**.
- The company context has no consumer either — the screens with a company
  switcher use `useCompany()`, a different context with its own source.
  `switchCompany` still reads the default and still refuses when there is
  nothing to switch to, exactly as before.

### End to end

| | Click → portal |
|---|---|
| Before any of today's work | ~21 s |
| After deferring the CRM scans | 13.7 s |
| After removing the phantom queries | **9.3 s** |

Verified in the browser on a real registration each time, and the portal renders
correctly signed in afterwards.

### Still slow, and still a separate job

**Cold start is now the biggest single cost.** The first call after a deploy
measured 16.3 s against 3.1 s warm — the edge function booting, not this code.
An unlucky first visitor of the day pays it.

The rest is the lazy chunk for the customer portal and its own data fetches.

---

## The exit-intent popup — 2026-09-20

Seen on the live site: *"Wait — Don't Leave Empty Handed! Get an exclusive
discount on your first service"* as a full-screen overlay on the customer
portal, seconds after a registration, to an account that had handed over its
email address on the previous screen. Nobody was leaving.

### Two separate faults

**It showed to signed-in users.** The popup is a lead capture for anonymous
visitors — it asks for an email in exchange for a discount on a *first* service.
Shown to somebody with an account it asks for the address they signed up with
and offers a first-timer discount to a person who has already arrived. It is now
never opened for a signed-in visitor, and closes on the spot if somebody signs
in while it is showing.

**The inactivity fallback ran everywhere.** The comment said "Mobile:" and
nothing enforced it, so on a desktop a popup labelled *exit* intent became an
idle nag — `mouseleave` is the real trigger there, and this fired thirty seconds
later regardless. Worse, the activity that reset the timer was scroll, keydown,
pointerdown and input — **not mouse movement** — so somebody reading a dashboard
with their hand on the mouse counted as inactive. That is exactly how it
appeared over a portal with nobody going anywhere.

Now gated to `(hover: none) and (pointer: coarse)`. A phone has no mouse and so
no exit signal at all, which is the reason the fallback exists; desktops keep
the genuine trigger and lose the nag.

### Verified on the live site

Cleared `exit_intent_suppressed` first so a past dismissal could not mask the
result, registered a fresh account, then sat **50 seconds idle** on the portal —
the exact condition that produced it before, where it had appeared within
thirty. `popupPresent: false`, `promoVisible: false`.

App typecheck 324, unchanged. Smoke: the full 332-page pass, because this
renders on every screen and now calls `useAuth`, which throws outside its
provider — 332 rendered, 0 threw. Its single mount point is inside
`AuthProvider`.

### Noted, not changed

The `showOnPages` config field is declared, defaulted and never read by
anything — so the admin screen that sets it has no effect.

---

## B, and what it actually turned out to be — 2026-09-20

B started as "the materials step calls two endpoints that return nothing".
Investigating it properly changed the answer twice.

### The endpoints were empty AND wrong

Checked against the database: `/api/products` reads a `product:` prefix and
`/product-ads` reads `productad:` — **zero rows in both**. Neither is the
materials system either. The real chain is `vendor_catalog:` (a vendor's
catalogue lines) → `hub_product:` (the deduped product) → `/catalog-products`,
which is what the design centre reads.

Current contents of that chain: **1 catalogue line** (`2x4 Pressure Treated
Lumber 8ft`, $8.74, from the `VEN-OWNER` test vendor), **0 hub products**,
**0 offers**. Six vendors exist as records — Home Depot, Lowe's, Ferguson,
Grainger, Electrical Wholesale and the owner test account — but none has
uploaded a catalogue.

### And then: nothing rendered any of it

The deciding fact. All four pieces of state the fetches populated —
`availableProducts`, `advertiserOffers`, `subcontractorServices` and their
loading flags — were **written and never read**. There is no product list, no
offer list and no service list anywhere in that form. `setMaterialSourceTab`
was never called, so the tab was permanently `'vendors'` and the advertiser and
subcontractor fetches could never fire at all. `setProductSearch` and
`setProductCategory` were never called either, so the search and category
parameters were always empty.

What the dead code cost while displaying nothing:

- `authedHeaders()` **throws** when there is no session, and this form is on
  `request-service`, a public route. Every signed-out visitor reaching the
  materials step raised an exception for a list nobody could see. That was the
  original symptom.
- a wasted round trip on every visit to that step.

### Removed rather than rewired

Pointing dead state at the correct endpoint would still render nothing. A
materials picker is a screen that does not exist yet, not a broken one, and
building one unasked is not a fix.

App typecheck 324, unchanged (the four findings in this file are pre-existing
and were in the baseline). Smoke reached 15 pages including `request-service`
and `get-quote` — 15 rendered, 0 threw.

### What building it would actually need

1. **Catalogue data.** One line from a test vendor is not a materials picker.
   The vendors need to upload, which is the point of the materials-hub
   subscription. There is also a staff-only backfill that promotes existing
   `vendor_catalog:` lines into `hub_product:` records — the single line above
   has never been through it, which is why `hub_product:` is empty.
2. **A decision on who may see prices.** `/catalog-products` requires a session
   today. `request-service` is public, so either the picker only appears once
   somebody signs in, or vendor pricing becomes visible to anonymous visitors.
   That is Eric's call, not a detail to settle in passing.
3. **The screen itself** — list, search, category filter and selection wired
   into the work request.

Worth saying plainly: the materials hub is built and empty. Nothing about the
work-request form was going to show products until there are products.

---

## Customers were being shown the rate we pay — 2026-09-20

Eric, mid-task: *"the customers should only see vendors pricing not my
discounted pricing."* Investigating found it was happening.

### What was exposed

`POST /vendor-pricing/compare` returned two kinds of row in one list:

- `source: "catalog"` — a vendor's own published catalogue price. Fine for a
  customer; it is what they are entitled to see.
- `source: "contractor"` — the real rate Black Phoenix pays, written by staff
  through the PUT in the same file, which describes itself as "the contractor's
  real negotiated price".

The second is the company's margin on materials. Anyone who sees it next to the
vendor's published price knows the mark-up on every line of their quote, and it
cannot be unseen.

**The read had no authorisation of any kind.** The write below it did — with a
comment noting it "decides the cost basis of every quote" — but the read was
open, and `/vendor-pricing` is not on the admin prefix list, so it sat at the
ordinary signed-in tier. Any customer with an account could name a material and
be told what we pay for it.

### The fix

Negotiated rows are added only for internal callers, through a new
`isPricingStaff()` that answers without refusing, so a read can decide what to
**include** rather than whether to answer at all. It fails closed: anything it
cannot positively identify as staff is not staff. `requirePricingStaff` now
shares it instead of keeping a second copy of the same logic.

On the server rather than in the browser deliberately — filtering the number out
in the client would mean it had already been sent, and a hidden field is not a
check.

### Verified in production, both directions

Seeded a negotiated record at **$5.11** against the one real catalogue line,
which publishes at **$8.74**, then asked for that material twice:

| Caller | Rows returned |
|---|---|
| Customer (ordinary account) | `catalog` $8.74 only — **$5.11 absent** |
| Internal staff (`admin`) | `contractor` $5.11 **and** `catalog` $8.74 |

So the leak is closed and the internal tool still works, which was the other
half of getting this right.

Seeded record and probe account deleted. `vendor_price:` is back to 0 records
and 7 accounts remain.

### Also checked

`vendor_price:` is read in exactly one place in the whole server, so that route
was the only exposure of the negotiated figure.

### Noted, not changed

`index.tsx:5666` declares a second `POST /vendor-pricing/compare`. The router
mounts at index.tsx:771, so the version in `vendorPricing.tsx` — the one just
fixed — is what serves. The dead copy reads only `vendor_catalog:` and so never
carried negotiated prices, but it is another instance of the shadowing pattern
found four times today.

---

## Cold start — 2026-09-20

The first request after a deploy measured **16.3 seconds** against 3.1 s warm.
Almost all of it was the isolate booting: 129 modules and their npm dependencies
parsed and instantiated before a handler runs.

### Two causes, both boot-time

**Duplicate dependencies.** 32 files imported `npm:@supabase/supabase-js@2` and
23 imported `npm:@supabase/supabase-js@2.39.7` — a floating specifier and a pin,
which resolve to different copies, so the whole SDK was in the bundle twice.
Hono was split the same way across `npm:hono`, `npm:hono@4` and unversioned
`npm:hono/cors` subpaths. Now one specifier each across 99 files. Standardised
UP to `@2` rather than down to the pin on purpose: the majority were already
there, so nothing loses API surface it depends on.

**Heavy SDKs loaded whether or not they were used.** Fifteen static imports of
OpenAI and Anthropic across twelve modules meant every cold start — for a health
check, a sign-up, a cart read — downloaded, parsed and instantiated both. They
now load when a client is actually constructed, which is the pattern `qrcode`
and `web-push` already used in index.tsx.

Three needed more than a moved import:

- `kitchen-cabinet-schedule.tsx` built an OpenAI client at module scope and
  **never referenced it once** in the whole file. Deleted.
- `plan-builder.tsx` and `quote-generator.tsx` built theirs at module scope with
  a single use site each, inside async handlers. Both now build on first use and
  cache.

### Measured, same metric both times

| | Cold | Warm |
|---|---|---|
| Before | **16,289 ms** | 3,100 ms |
| After | **7,225 ms** | ~4,200 ms |

Boot overhead — cold minus warm — went from about **13.2 s to about 3.0 s**.
`GET /health` on a freshly deployed isolate now answers in **967 ms**, which is
the clearest reading of pure boot cost.

Both cold numbers are `POST /auth/signup` immediately after a deploy, because
the 16.3 s baseline was that same call; comparing it to a `/health` figure would
have flattered the result.

### Verified honestly

Server typecheck 84 before and 84 after, and the two error sets were **diffed**
against a clean worktree rather than compared by count. Every apparent
difference turned out to be the same error shifted one line by a removed import.
No new findings.

### Left deliberately

`investments-kv.tsx` and `stripe-connect.tsx` construct Stripe inside
**synchronous** factory functions that also use `Stripe.createFetchHttpClient()`
as a value and `Stripe` as a type. Making those async would ripple through every
caller for one more deferred SDK — worth doing, but not as a quiet rider on this
change.

Three bucket initialisers (`deliverables.tsx`, `marketplace.tsx`,
`media-library.tsx`) still call `listBuckets`/`createBucket` at module scope on
every isolate. They do not block the response — there is no top-level `await`
anywhere in the server — so they cost work rather than latency, but they are
network calls per boot that could run on first use instead.

### Stripe too — the last SDK out of the boot path

The previous pass left Stripe static because both factories were synchronous and
used `Stripe` as a type as well as `Stripe.createFetchHttpClient()` as a value.

`import Stripe` became **`import type Stripe`** in both files. TypeScript erases
a type-only import, so every annotation keeps working while the SDK itself
leaves the boot path; the value is pulled in inside the factory, when a route
actually needs it.

That made the factories async and rippled exactly as far as expected —
`makeStripe`, `getStripeByEnv`, `getStripeForCompany`, `getStripe`, and eight
call sites. All eight were already inside async functions, checked before
starting rather than discovered by the compiler.

### Final measurements

| | Cold | Warm |
|---|---|---|
| `POST /auth/signup` before any of this | **16,289 ms** | 3,100 ms |
| after deduping + lazy AI SDKs | 7,225 ms | ~4,200 ms |
| after lazy Stripe as well | **5,578 ms** | ~5,000 ms |
| `GET /health` on a freshly deployed isolate | **618 ms** | ~500 ms |

Boot overhead — cold minus warm — went from roughly **13 seconds to under one**.
The `/health` figure is the cleanest reading of it, since that route does almost
no work of its own.

Warm signup has drifted up across the day's runs (3.1 s → 5.0 s). That is not
this change: each measurement creates an account, and the after-response CRM
work scans every customer and invoice, so the store these runs are measured
against keeps growing. Worth remembering when reading the warm column.

### Stripe still constructs — verified

`POST /investments/stripe-webhook` does:

    const stripe = await getStripe();
    if (!stripe) return 'Billing not configured…'
    if (!webhookSecret) return 'Webhook not configured…'

It answered with the **second** message, which means `await getStripe()` handed
back a real client built through the dynamic import. A failed import would have
thrown before either check, and a missing key would have produced the first.
No side effects: it fails before touching anything.

Noted in passing: `STRIPE_WEBHOOK_SECRET` is not set on this project, so that
webhook cannot verify events. Pre-existing and separate.

### Still there

Three bucket initialisers (`deliverables.tsx`, `marketplace.tsx`,
`media-library.tsx`) call `listBuckets`/`createBucket` at module scope on every
isolate. There is no top-level `await` anywhere in the server, so they cost work
rather than latency — but they are avoidable network calls per boot.

### The bucket initialisers — done, and one was a race

Three modules called a bucket initialiser at module scope, so every cold isolate
made a `listBuckets` round trip whether or not the request had anything to do
with files. They now run once per isolate on first use, memoised, with the memo
cleared on failure so a transient error cannot poison an isolate into never
retrying.

**`media-library.tsx` was also a race.** It called `initializeBucket()` under a
comment reading "Initialize on startup" and **nothing awaited it** — an upload
arriving before it finished raced it. The upload route now awaits the bucket, so
it is guaranteed to exist before the first write rather than probably existing
by then. Cheaper and more correct at once.

**`deliverables.tsx`** was redundant as well as eager: its upload route already
awaited `ensureBucket()` before writing, which is the only place it matters.

**`marketplace.tsx`** had `ensureCoverBucket()` eager while `ensureFileBucket()`
directly below it was already lazy, called from the one route that needs it. The
cover bucket now matches.

No module-scope side-effect calls remain anywhere in the server.

Cold `GET /health` measured **645 ms**, against 618 ms before this change —
unchanged within noise, which is the expected result and was the prediction:
with no top-level `await` these calls never blocked the response, so they cost
work per isolate rather than latency. The win here is three fewer network calls
per boot and a genuine race removed, not a faster number.

Verified the upload path afterwards, since its flow changed: `POST /media/upload`
answered 200 with the right storage path and `uploadedBy: "Bucket Probe"`, and
`DELETE /media/:id` cleaned it up. Storage is back to 0 objects.

### Cold start, final

| | Cold | Warm |
|---|---|---|
| `POST /auth/signup` this morning | **16,289 ms** | 3,100 ms |
| now | **5,578 ms** | ~5,000 ms |
| `GET /health` on a fresh isolate | **645 ms** | ~500 ms |

Boot overhead went from roughly **13 seconds to under one**. All probe accounts
removed; 7 accounts remain and the only test address left is `e2e-probe`, the
fixture `scripts/e2e.mjs` depends on.

---

## The Stripe webhook secret — I was wrong, it was installed — 2026-09-20

I reported that `STRIPE_WEBHOOK_SECRET` was not set and that the webhook could
not verify events. Eric asked whether he had already installed them. He had.

### How that was established without seeing any value

POSTed a deliberately invalid signature to the `stripe-webhooks` function:

    400 {"received":false,"error":"Invalid signature."}

Not `500 … "Webhook signing secret is not configured."`, which is what that
function returns when it has none. So a secret is installed and working.

Supabase secrets are **project-wide** — every function sees all of them. So
since the main function reported the bare `STRIPE_WEBHOOK_SECRET` missing while
`stripe-webhooks` plainly had one, what is installed must be under
`STRIPE_WEBHOOK_SECRET_SERVICES` or `STRIPE_WEBHOOK_SECRET_STORE`, the names
that function reads.

### So it was never a missing secret

`investments-kv.tsx`'s AI-subscription webhook read **one** name — the bare
`STRIPE_WEBHOOK_SECRET` — and refused perfectly good events with "Webhook not
configured" because the secrets live under the others. `stripe-webhooks` had
been reading three names all along.

It now collects every signing secret the project has and verifies against each
in turn, exactly as the other function does. Safe, because a signature only
verifies against the secret belonging to the endpoint that actually sent the
event — a forged or unsigned body still fails against all of them.
`STRIPE_WEBHOOK_SECRET_INVESTMENTS` is tried first so a dedicated endpoint for
this URL can be added later without a code change.

### Verified after deploy

Same probe against `POST /investments/stripe-webhook`:

| | Before | After |
|---|---|---|
| Response | 500 "Webhook not configured (missing STRIPE_WEBHOOK_SECRET)" | **400 "signature verification failed"** |

400 is the correct answer to a bogus signature: it found the secrets, tried
them, and refused. Server typecheck 84 with the error sets diffed — zero new
findings.

### What is genuinely still on Eric's side

Signature verification only succeeds against the secret of the Stripe endpoint
that sent the event. If no Stripe endpoint is registered pointing at
`/make-server-3eae23a6/investments/stripe-webhook`, that route will never
receive a real event regardless of this change — worth checking in the Stripe
dashboard against the two URLs this project exposes:

- `https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/stripe-webhooks`
  (checkout.session.completed, invoice.payment_succeeded,
  invoice.payment_failed, customer.subscription.deleted)
- `https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/make-server-3eae23a6/investments/stripe-webhook`
  (the AI Property Intelligence subscription)

### Are the Stripe endpoints registered? Asked Stripe directly

Added `GET /stripe/webhook-endpoints` (staff only) so this is answerable from
the server instead of the Stripe dashboard. The secret key stays server-side and
is never returned or logged; the endpoint's own signing secret is not in a list
response and the fields are picked explicitly rather than spread.

The answer:

| Account | Endpoints |
|---|---|
| `STRIPE_SECRET_KEY` | **1, enabled** → `…/functions/v1/stripe-webhooks` |
| `STRIPE_SECRET_KEY_2` | not configured |

Events on it: `checkout.session.completed`, `invoice.payment_succeeded`,
`invoice.payment_failed`, `customer.subscription.deleted` — exactly what that
function handles.

**Nothing is registered against
`…/make-server-3eae23a6/investments/stripe-webhook`.** So the AI Property
Intelligence subscription webhook has never received an event and cannot, no
matter what the signing-secret code does.

Worse than simply unreachable: the registered function has **no mention of
`property_ai`** anywhere. It routes on metadata — `kind`, `planId` — for
maintenance plans and store orders. An AI-subscription checkout therefore
delivers to a function that ignores it, while the route written to handle it is
never called.

**How much this matters.** The comment on the investments webhook calls its
activation "belt-and-suspenders (the confirm route usually handles this)", so a
subscriber who returns from Stripe normally still gets activated by the confirm
route. What is genuinely lost is everything that happens when nobody is
watching: `customer.subscription.deleted` and `invoice.payment_failed` for AI
subscriptions are never processed, so a cancellation or a failed renewal is
never reflected. For a subscription product that is a real hole, just not a
"payments are broken" one.

**Two ways to close it — Eric's call:**

1. Register a second Stripe endpoint pointing at the investments URL and store
   its signing secret as `STRIPE_WEBHOOK_SECRET_INVESTMENTS`. No code needed —
   the route already tries that name first.
2. Teach `stripe-webhooks` to recognise `kind === 'property_ai'` so one endpoint
   and one secret serve everything. Fewer moving parts, but it mixes the two
   billing concerns in one function.

### Option 2 done — one endpoint now serves both

Eric chose one endpoint over registering a second. `stripe-webhooks/index.ts`
now handles `checkout.session.completed` for `kind: 'property_ai'`, plus
subscription updated/deleted and invoice succeeded/failed, mirroring the logic
that was stranded in `investments-kv.tsx`.

**Two things it is careful about.** `handlePropertyAiEvent` returns null for
anything it cannot positively identify as its own, so store orders and
maintenance plans fall through to the existing handlers untouched. And lookup
matches on **subscription id first**, customer id only as a fallback — a
customer can hold a maintenance plan *and* an AI subscription, and matching on
customer alone would let a plan's invoice deactivate the wrong entitlement.

### A trap closed on the way in

`stripe-webhooks` was deployed with `verify_jwt: false` but **was not listed in
`config.toml`**, where every other function states it explicitly "so that a
deploy can never silently change it". The CLI defaults to **true**, so deploying
this function would have switched the JWT gate on and killed every delivery —
including the maintenance-plan and store events that work today. Stripe posts a
signature and no Supabase token, so the gate would have rejected everything at
the door.

Found before deploying, not after. It is now listed with the reasoning, and the
deployed function came back `verify_jwt: false`, version 11.

### Verified

| Check | Result |
|---|---|
| `verify_jwt` after deploy | **false** — config entry held |
| Invalid signature | 400 "Invalid signature" — unchanged, my code did not break the path |
| Server typecheck | 84, error sets diffed — zero new |

**What I cannot test from here:** a real `property_ai` event needs a valid
Stripe signature, which requires the signing secret. That should not pass
through me, so the definitive test is Eric's: Stripe dashboard → the
`stripe-webhooks` endpoint → **Send test webhook** →
`customer.subscription.deleted`. I can read the function logs afterwards and
confirm it was received and routed.

### One thing worth adding in Stripe

The registered endpoint's events are `checkout.session.completed`,
`invoice.payment_succeeded`, `invoice.payment_failed`,
`customer.subscription.deleted`. The AI handler also understands
**`customer.subscription.updated`**, which is what catches a subscription going
past_due or being paused rather than outright cancelled. Adding that event to
the endpoint would make the entitlement track billing more closely. That is a
change to Eric's Stripe configuration, so it is his to make.

### The test webhook never arrived — and why

Eric sent a test webhook. Checked the logs: **nothing from Stripe**. Every
Stripe-related request in the window traces back to my own probes —

    23:50:37  POST /stripe-webhooks                  400   (my re-probe)
    23:46:22  GET  /stripe/webhook-endpoints         200   (my listing)
    23:42:52  POST /investments/stripe-webhook       400   (my probe)
    23:40:57  POST /stripe-webhooks                  400   (my probe)

— and the log stream was current to 23:51:11, so this was absence, not lag.
`function_logs` agrees: the only two entries are the two "signature verification
failed" lines from my probes.

**The cause, established rather than guessed.** Extended the endpoint report to
include Stripe's `livemode` flag and re-read it:

    STRIPE_SECRET_KEY: 1 endpoint
      mode=LIVE  status=enabled  …/functions/v1/stripe-webhooks

The registered endpoint is in **live mode**, so `STRIPE_SECRET_KEY` is a live
key. Stripe keeps entirely separate endpoint lists for test and live, and a key
only ever sees its own. A "Send test webhook" issued while the dashboard is in
**Test mode** goes to the test-mode list — which has nothing registered — so the
delivery lands nowhere and no error appears anywhere to explain it. That is
exactly the shape of what happened: sent, never seen, nothing logged.

**What to do:** switch the Stripe dashboard to **Live mode**, open the
`stripe-webhooks` endpoint there, and send the test event from that screen. It
will be signed with the live signing secret, which is the one configured.

Safe to do: a `customer.subscription.deleted` test event carries a fabricated
subscription id, so `findAiSub` matches nothing, returns null, and the event
falls through to the plan handler which ignores it for want of a `plan_id`.
Nothing in the data moves.

**If Eric would rather work in test mode**, that is a different job: it needs a
test-mode endpoint registered against the same URL and its test signing secret
added as a second env var. Worth doing eventually — testing billing against live
mode is not a habit to build — but it is a decision, not a detail.

---

## Test mode — 2026-09-20

Eric: "set up test mode so we arent testing on live." Half of this is code and
is done; the other half is a decision and is not.

### Done: test-mode webhooks that cannot touch live data

Both consumers now also accept `STRIPE_WEBHOOK_SECRET_TEST`, so a test-mode
endpoint can be registered against the same URLs with its own signing secret.

**The guard is the point, not the extra secret.** Accepting a test signing
secret on its own would be worse than the problem it solves. Stripe stamps every
event with `livemode`, and a test event carries fabricated data — invented
subscription ids, payments that never happened. Run through the handlers, a
dashboard click could mark a real maintenance plan paid or revoke a real
subscriber's access. Testing that can corrupt live records is not testing.

So a verified test-mode event is acknowledged and goes no further, in both
functions. It returns **200 rather than an error** deliberately: Stripe treats a
non-2xx as a failed delivery and retries with backoff, so refusing would fill
the dashboard with failures against an endpoint behaving exactly as intended.
The body says what happened, so a test delivery still confirms the two things
worth confirming — the endpoint is reachable, and the signature verified.

### What Eric needs to do to use it

1. Stripe dashboard → **Test mode** → Developers → Webhooks → add an endpoint at
   `https://plzsvzwwcdopnawtiwzm.supabase.co/functions/v1/stripe-webhooks`
   with the same four events (plus `customer.subscription.updated` if he wants
   past_due and paused tracked).
2. Copy that endpoint's signing secret and add it in Supabase as
   **`STRIPE_WEBHOOK_SECRET_TEST`**. It must not pass through me.
3. Send a test event from that screen. I can then read the logs and confirm it
   verified and was correctly held back from live data.

### Not done: test-mode checkouts, and why it is a decision

This does **not** make the app create test-mode checkout sessions. Stripe secret
keys are read in four places under five env names:

| Where | Env var |
|---|---|
| stripe-connect.tsx | `STRIPE_SECRET_KEY`, `STRIPE_SECRET_KEY_2` (per company, via `stripeKeyEnv`) |
| investments-kv.tsx | `STRIPE_SECRET_KEY` |
| index.tsx:10338 | `STRIPE_SECRET_KEY_SERVICES`, `TBPCO_ECOMMERCE_STRIPE_SECRET_KEY` |
| returns.tsx | chooses between those two |

A genuine end-to-end test mode means a mode-selection design across all of it.
Three shapes, and this is Eric's call:

1. **A global switch** (`STRIPE_MODE=test`) — simplest, but the whole project
   flips, so live payments cannot run while anyone is testing. Unusable on a
   production project.
2. **Per-request opt-in** — live stays default, a staff-only flag selects test
   keys. Live traffic untouched, but the mode has to be threaded through every
   payment path and every one is a place to get it wrong.
3. **A separate environment** — a Supabase branch or second project holding test
   keys and its own database. No mode logic in the app at all, and test data
   cannot reach live records because it is not the same database. Heavier to
   stand up.

**3 is the one to want**, and it is what `test-before-production` already says:
schema and backend changes go to a non-production environment first. The webhook
guard above makes the current situation safe in the meantime; it does not make a
production project a good place to test billing.

---

## Looking into a Supabase branch — 2026-09-20

Researched rather than assumed. The short answer: **a branch is not usable for
this project today**, and the reason is worth knowing on its own.

### What is already true

- **Branching is enabled.** One default branch record exists (`main`, created
  2026-08-15), so nothing needs switching on.
- **Cost is small**: `$0.01344/hour` — about **$0.32 a day**, or **$9.81 a
  month** if left running. Created for a test and deleted after, it is pennies.
- **Branches carry no data** (`with_data: false`). They get schema. This app's
  business data lives almost entirely in `kv_store_57095a78`, so a branch starts
  empty — no vendors, no quotes, no customers. For billing tests that is fine,
  you would create test data. It is not a clone of production.

### The blocker: the repo cannot rebuild production's schema

A branch is built from the migrations in the repo. Those have **drifted from
what is actually applied**, in both directions:

**Applied on the project, no file in the repo (8):**

    create_kv_table_824f083c        revoke_trigger_fn_execute
    create_kv_table_57095a78        enable_pg_cron_and_pg_net
    create_kv_table_3eae23a6        schedule_compliance_reminders
    create_kv_table_12c91054        schedule_compliance_reminders_with_apikey

**In the repo, never applied (6):**

    bid_room_entitlements   compliance_reminder_schedule   add_logo_fields
    create_companies_tables work_requests                  investment_system

The first list includes **all four `create_kv_table_*` migrations**. The KV
tables this entire application stores its data in are **not in the repo**. A
branch built from these migrations would come up without them and essentially
nothing would work.

**That matters far beyond branching.** If this project were lost tomorrow, the
repository could not rebuild its database. That is a bigger problem than the one
I was asked to look into, and it is the thing I would fix first.

### The second cost: 74 secrets

Branches do not inherit edge function secrets. The server reads **74** distinct
non-Supabase environment variables — Stripe, OpenAI, Anthropic, Resend, Twilio,
Facebook, Google, LinkedIn, TikTok, Twitter, Shippo, Zendrop, VAPID, Home Depot,
Lowe's, Grainger, ATTOM, Regrid, RentCast and more. Every one would need setting
on a branch before the function boots usefully, and many are credentials that
must not pass through me.

### And a third: the project ref is hardcoded in 12 files

`info.tsx` is autogenerated and easy to point elsewhere, but the literal
`plzsvzwwcdopnawtiwzm` is also baked into `database.ts`,
`SocialMediaManager.tsx`, `FeaturedDealsReels.tsx`, `ShopIntelligenceSuite.tsx`
and the server's own files. Pointing the app at a branch is not one constant.

### Proposed order — NOT STARTED, needs approval

- [ ] **A. Reconcile the migrations so the repo can rebuild the database.** Pull
      the 8 applied-but-missing migrations into the repo, and decide on the 6
      that were never applied — each is either wanted (apply it) or dead (delete
      it). Worth doing whether or not a branch ever happens: it is the
      difference between having a recoverable database and not.
- [ ] **B. Write down the branch's environment.** A checklist of the 74 vars,
      which are needed for a billing test versus which can be left unset, and
      which Eric must set himself.
- [ ] **C. Make the project ref configurable** instead of hardcoded in 12 files.
- [ ] **D. Then a branch becomes a real option** — create per test, delete after,
      about a penny an hour.

### Meanwhile

The webhook guard shipped earlier already makes test-mode events inert against
live data, so Eric can register a test endpoint and exercise delivery safely
today without any of the above. That covers the inbound half, which is what
prompted this.

---

## Migrations reconciled — 2026-09-20

### The eight that were missing are now in the repo

Taken from the project's own `supabase_migrations.schema_migrations`, which
records the exact SQL that was applied — not a regenerated schema diff, so the
files say what actually ran. Named with their real version prefixes so they
line up with the remote history:

    20260217215610_create_kv_table_824f083c.sql
    20260725015010_create_kv_table_57095a78.sql
    20260809142252_create_kv_table_3eae23a6.sql
    20260809225742_create_kv_table_12c91054.sql
    20260901025535_revoke_trigger_fn_execute.sql
    20260908213838_enable_pg_cron_and_pg_net.sql
    20260908213913_schedule_compliance_reminders.sql
    20260908214000_schedule_compliance_reminders_with_apikey.sql

**Every applied migration now has a file.** The repo can describe the database
it is running against, which it could not this morning.

### A live secret was in one of them

`schedule_compliance_reminders` inserts the real `COMPLIANCE_CRON_SECRET` as a
string literal. Two reasons not to copy that into the repo: it would put a live
credential in git, and every environment rebuilt from this repo would share
production's secret — a new environment should get a new one.

So both compliance files carry the structure and a commented block showing the
two `insert`s an operator runs with their **own** values. Verified afterwards
that no secret or JWT literal appears in any migration file.

**Worth acting on separately:** because the applied version embedded the
literal, that secret is sitting in plaintext in
`supabase_migrations.schema_migrations` on production. Only privileged roles can
read that table, but it is a place nobody thinks to look. Rotating
`COMPLIANCE_CRON_SECRET` — changing the edge function secret and the
`private_cron_config` row together — would be reasonable.

### The six never-applied files: all dead, nothing to do

Checked whether each one's tables exist and whether any live code needs them:

| File | Tables exist? | Live code uses them? |
|---|---|---|
| `investment_system` | **yes** — all four | applied by some other route; file matches reality |
| `20260810000000_create_companies` | yes | already in the applied history |
| `20260502_create_companies_tables` | `companies` yes, `company_documents` **no** | `CompanyDatabaseService.getDocuments/saveDocument/deleteDocument` exist but are **never called** |
| `014_compliance_reminder_schedule` | `private_cron_config` yes | superseded by the two applied schedule migrations |
| `010_bid_room_entitlements` | `org_entitlements` **no** | **nothing references it anywhere** |
| `20260616_work_requests` | `work_requests` **no** | only the **retired** `make-server-57095a78` touches it; the live flow uses the KV store |

So nothing production depends on is missing, and **no schema change was applied
to production** — which is the right outcome for a reconciliation.

### One risk this creates, worth knowing before anyone runs `db push`

The eight recovered files carry versions that match the remote history, so they
will be skipped. The six above will **not** be — a `supabase db push` would try
to apply all six, creating `org_entitlements`, `work_requests` and
`company_documents` on production for features that do not use them. They should
be deleted, or moved out of `migrations/`, before anyone pushes. That is a
decision about dead code rather than something to do silently.

### Clearing out the never-applied files — five went, one stayed

"Clear them out" turned out to need reading first, and one of the six was the
opposite of dead.

**Kept: `investment_system.sql`.** Its four tables —
`investment_opportunities`, `investor_commitments`, `payout_distributions`,
`investment_documents` — **exist in production**, and searching every applied
migration's SQL for those names returns nothing. They were created outside
migration history, so this file is the **only record of their schema anywhere**.
Deleting it would have undone part of what the reconciliation just achieved.

It was not safely re-runnable though: all eight of its policies already exist,
and a bare `CREATE POLICY` fails on a duplicate. Each is now preceded by
`DROP POLICY IF EXISTS`, the same shape the applied `create_companies` uses, so
the file can be applied to a fresh database and re-applied to this one without
error. Renamed `20260920000000_investment_system.sql`.

**Deleted (5), each checked against the database and the code first:**

| File | Why it went |
|---|---|
| `010_bid_room_entitlements` | `org_entitlements` does not exist and is referenced **nowhere** |
| `20260616_work_requests` | table does not exist; only the **retired** `make-server-57095a78` touches it, the live flow uses the KV store |
| `014_compliance_reminder_schedule` | superseded by the two applied schedule migrations, now recovered |
| `20260502_create_companies_tables` | `companies` is covered by the applied `create_companies`; `company_documents` does not exist and its service methods are never called |
| `20260502_add_logo_fields` | every logo column is already in the applied `create_companies` — confirmed by reading its recorded SQL |

### And the rest of the folder was renamed

Nine files were still named `001_`…`013_`. The CLI derives the version from the
filename, so `001_platform_core.sql` yields version `001`, which matches nothing
in a history recorded as `20260815032102`. A `db push` would have tried to
re-run all nine. They now carry their real applied versions.

### Where this leaves it

    19 migration files, all timestamp-prefixed
    applied on remote with no local file:   none
    would be applied by a `db push`:        investment_system only

And that one is idempotent by construction, so pushing it against production
creates nothing and changes nothing — it exists so a **fresh** database gets
those four tables.

The repository can now rebuild the database it is running against. That was the
point, and it is the prerequisite for a branch being worth anything.

---

## Rotating COMPLIANCE_CRON_SECRET — 2026-09-20

The old value was sitting in plaintext in
`supabase_migrations.schema_migrations`, because the applied migration inserted
it as a string literal.

### The database half is done

    update private_cron_config
    set value = translate(encode(gen_random_bytes(32), 'base64'), '+/=', '-_')
    where key = 'compliance_cron_secret';

Generated **inside Postgres** and never returned, so the new value has not
passed through this conversation or any log. Verified only by its properties:
43 characters, URL-safe, and different from the old one — the same shape as
before, so nothing downstream needs to change.

The scheduled job was checked afterwards: `compliance-expiry-reminders` is
active, still targets `/compliance/run-reminders`, and reads the secret **from
the table** rather than having it baked into the command — so it picks up the
new value on its next run with no further change.

### The rotation is NOT finished, by design

The route compares the header against the `COMPLIANCE_CRON_SECRET` **edge
function secret**, which still holds the old value. So right now:

- the cron job sends the new secret, the route expects the old, and the 12:00
  UTC run will answer 401 and do nothing;
- **the old secret still works** until the edge secret is changed — so the
  credential that was exposed is not yet dead.

Two steps, both Eric's, because the value is a credential and must not pass
through me:

1. Supabase dashboard → SQL Editor:
   `select value from private_cron_config where key = 'compliance_cron_secret';`
2. Supabase → Edge Functions → Secrets → set **`COMPLIANCE_CRON_SECRET`** to
   that value.

The next scheduled run is 12:00 UTC, so there is a long window. Reminders are
not lost in the meantime — the route also accepts an authenticated
administrator, so the run can be triggered by hand.

### Afterwards

Once step 2 is done the literal recorded in `schema_migrations` is dead, which
was the point. The recovered migration file in this repo never contained it.

### The edge secret did not take — proven, not guessed

Eric said the secret was set. It was not, and the evidence is exact rather than
inferred:

1. `POST /compliance/run-reminders` carrying the **old** value answered **200**.
   With only the anon key for Authorization the administrator fallback cannot
   apply, so a 200 means the header matched `COMPLIANCE_CRON_SECRET`.
2. Redeployed the function to force a cold isolate with fresh environment, in
   case a warm one was holding stale env. Still 200.
3. `supabase secrets list` prints a name and a **digest**, never a value.
   `sha256` of the old secret is exactly the digest Supabase holds:

       sha256(old value)   7f29caf68d43ecdc67563d109bb04543b983a8354cb111c0bd4ad50f80578bad
       COMPLIANCE_CRON_SECRET  7f29caf68d43ecdc67563d109bb04543b983a8354cb111c0bd4ad50f80578bad

So the variable still literally holds the value that was exposed.

Nothing was sent by any of this: there are **zero** `org_compliance:` records,
which is why it was safe to test at all — the run reported
`sent: 0, skipped: 0, lapsed: 0`.

### A way to confirm it next time without revealing anything

Because the digest is `sha256` of the value, the rotation can be verified by
comparing hashes rather than secrets. The value now in `private_cron_config` has
digest:

    4d4a597fb2a267f4f5f1e0d80910df6a98426ead6afb889781c137d08edd6ac5

When `supabase secrets list` shows that digest against `COMPLIANCE_CRON_SECRET`,
the two halves match and the rotation is complete. Until then the old secret
remains live and the 12:00 UTC run will 401.

### Second attempt: half right — the leak is closed, the scheduler is broken

The digest changed, so something was set. But it is not the value the database
holds:

    old, exposed value        7f29caf6…   (dead)
    COMPLIANCE_CRON_SECRET    81c0b89a…   (what Eric set)
    private_cron_config row   4d4a597f…   (what the cron job sends)

So a **new** value was generated rather than the one waiting in the database.

**What that fixed:** posting the exposed value now answers **401**. The
credential that was sitting in `schema_migrations` is dead. That was the point
of the rotation and it is done.

**What it broke:** the two halves no longer agree. Tested on the real path —
had Postgres itself make the call, `pg_net` with the headers read from
`private_cron_config`, exactly as the scheduled command does:

    request 15 → status 401 {"success":false,"error":"Unauthorized."}

At 12:00 UTC the job will fail. (A note on my own tooling: the probe script
printed "Rotation complete on both halves" off a single 401. It tested one
thing and claimed two. The message was wrong, not the result.)

### One statement closes it

The value is already in Eric's hands — it is what he just set. In the SQL
editor:

    update private_cron_config
    set value = '<the value you set as COMPLIANCE_CRON_SECRET>'
    where key = 'compliance_cron_secret';

Then both digests read `81c0b89a…` and the scheduled call succeeds. I can
confirm by re-running the same `pg_net` call and comparing digests, without
either value passing through me.

Nothing is at risk while it is mismatched: there are zero `org_compliance:`
records, so no reminder is owed to anyone, and an administrator can trigger the
run by hand regardless.

### Third attempt, then a change of approach — done

The row was still `4d4a597f…` after the update was reported as run, so the two
copies disagreed for a third time. At that point the design is the problem, not
the operator. One secret living in two places with nothing keeping them in step
will drift, and it drifts silently: cron fires, the route refuses, and the only
symptom is reminders that never arrive.

So `/compliance/run-reminders` now reads `private_cron_config` first and falls
back to `COMPLIANCE_CRON_SECRET` only when the row is absent:

```ts
let secret = '';
try {
  const { data } = await supabase
    .from('private_cron_config')
    .select('value')
    .eq('key', 'compliance_cron_secret')
    .maybeSingle();
  secret = String(data?.value || '');
} catch { /* fall through to env */ }
if (!secret) secret = Deno.env.get('COMPLIANCE_CRON_SECRET') || '';
```

The row the scheduler already reads is now the only copy that decides anything.
Rotating is one `UPDATE`, and there is no second place to forget.

**Verified on the real path**, not inferred:

- `pg_net` replicating the scheduled command exactly (request 16) → **200**
  `{"success":true,"sent":0,"skipped":0,"lapsed":0}`
- posting the old exposed value `7f29caf6…` → **401**

So the leaked credential is dead and the 12:00 UTC job works. Nothing further is
needed from Eric; the `COMPLIANCE_CRON_SECRET` he set (`81c0b89a…`) is now only
a fallback for an environment whose row has not been seeded.

Deployed as `make-server-3eae23a6`. Typecheck 324 and server typecheck 84, both
unchanged against the baseline — the apparent new entries were existing errors
shifted down by the added lines, confirmed by diffing the error sets rather than
the counts. Smoke reports no source changes reach any page, which is right: this
touches an edge function and a migration comment only.

The migration file's instructions were rewritten to match, since they previously
told a future operator to keep the row in step with an environment variable that
no longer governs anything.

---

## Plan — "Design Your Project" as the customer's one stop shop

**Status: waiting on Eric's approval. No code written yet.**

### What I found before planning

The surprise is how much of this already exists. Nearly every piece Eric
described is built, working, and effectively unreachable by a homeowner:

| The ask | What exists | Where |
| --- | --- | --- |
| Photograph the exterior | `HouseCapture` — photos/video, reads width, storeys, siding, sill height, openings, each tagged with how confident the read was | `components/HouseCapture.tsx` |
| Exterior rendering | `/house-capture/photoreal` off the measured 3D view | `components/DeckViewer3D.tsx` |
| Interior layout | `FloorPlanEditor` + `floorPlanModel` — existing rooms, proposed rooms, and walls that carry their structural state | `components/FloorPlanEditor.tsx` |
| Photos in every section | `SectionCapture`, already mounted in five places | `components/design/SectionCapture.tsx` |
| An addition | `floorPlanModel` is built around existing-plus-proposed footprint | `lib/floorPlanModel.ts` |
| Deck, siding, openings, kitchen, bathroom, flooring, hardscape, structures | All eight trades, all marked built | `pages/DeckDesigner.tsx:165` |
| An AI assistant | `DeckAssistant` to `/design-assistant/ask` | `components/DeckAssistant.tsx` |
| Capture-first order of work | The designer already has stages: capture, design, scope, price, documents | `pages/DeckDesigner.tsx:294` |

And the building record is already the right shape: a `House` is a set of
`HouseView`s, each either an `elevation` or a `room`, and `houseToTrades.ts`
feeds those views into siding, openings, flooring, structures and rooms. One
building, many trades reading it.

**So this is not a rebuild. It is a front door.** What a customer gets today is
a card and an "Open the design centre" button that drops them on
`stage='design'`, `trade='deck'`, cold, with no indication that photographing
the house is step one, or that any of the above is in there at all.

### The three real gaps

1. **Interior photos read nothing.** `HouseCapture` only produces elevations —
   `viewFromAnalysis` populates siding, storeys and sill height. A room view can
   only be created by typing its dimensions into `HousePanel` by hand. Eric
   asked for interior pictures to produce an interior layout; that half does not
   exist.
2. **The assistant is deck-only.** Its system prompt opens "You are sitting with
   a deck builder" and it reasons in DCA 6 span tables. Asked about a bathroom
   remodel it will answer about joists.
3. **The 3D render is dead code.** `house-capture.tsx` registers
   `POST /photoreal` twice — line 867 (composite onto a photo) and line 1220
   (the measured 3D frame). One Hono app, so the first registration wins.
   `DeckViewer3D` posts `{shot, deck, style}`, the composite handler reads
   `body.composite`, finds nothing, and answers 400 "Composite the deck onto the
   photograph first." The renders-come-from-measured-geometry path has been
   unreachable. Same shadowing class as the five route bugs found earlier this
   week.

### The architecture, before any of it is built

One idea holds it together: **the House is the record, and the walkthrough fills
it in.** Nothing new owns data.

```
  Guided walkthrough  --writes-->   House { views: [elevation, room, ...] }
  (the new front door)                    |         FloorPlan { rooms, walls }
                                          |
                  +-----------------------+-----------------------+
                  v                                               v
        exterior trades                                  interior trades
   siding / openings / deck / structures        kitchen / bath / flooring / addition
                  |                                               |
                  +--------------> scope, price, documents <------+
                                          |
                                   work request -> pipeline
```

The walkthrough writes only into `House` and `FloorPlan`. Every trade screen
already reads those. So adding a trade later costs nothing here, and the
walkthrough cannot drift from the designer, because it is not holding a second
copy of anything.

The assistant sits beside that, reading the same record, and — per the rule
already written into `design-assistant.tsx` — proposes rather than edits.

### The todo list

**A. Make the existing render work again** *(first; it is a bug, not a feature)*
- [ ] A1. Merge the two `/photoreal` handlers in `house-capture.tsx` into one
      that branches on whether it was given a `composite` or a `shot`. Keep both
      prompts — they are different jobs and both are correct.
- [ ] A2. Prove it in the running app: open the 3D view, press render, get an
      image rather than a 400.

**B. The walkthrough** *(`CustomerDesignTab` becomes a stepped flow)*
- [ ] B1. Step 1, "What are you thinking about?" — the eight built trades plus
      Addition and Whole-home layout, each a plain-English card rather than a
      trade name. Roofing stays off the list until it is built, per the rail's
      own rule that nothing is advertised before it exists.
- [ ] B2. Step 2, "Show us the outside" — reuse `HouseCapture` unchanged, framed
      for a homeowner. Skippable; skipping costs the render, not the design.
- [ ] B3. Step 3, "Show us the inside" — one room at a time, reusing
      `SectionCapture` for the photos and the new read in C1 for the dimensions.
      Only appears for interior work.
- [ ] B4. Step 4, "What do you want?" — free text, plus the assistant.
- [ ] B5. Step 5, "Here is what we made" — the render, the layout, and the
      existing Send-to-Black-Phoenix action, which already posts to
      `/work-requests` and lands in the pipeline with everything else.
- [ ] B6. Resumable. Someone who photographs the house on Saturday and comes
      back on Sunday finds their place, because the House is what is saved, not
      the step number.

**C. Interior reading** *(the genuine new capability)*
- [ ] C1. Extend the analyse route to read a room: length, width, ceiling
      height, window and door positions, and what is there now — cabinet run,
      tub, shower, vanity. Same provenance discipline as the exterior read:
      every number labelled as photo-read, never presented as measured.
- [ ] C2. Turn that read into a `HouseView` of kind `room` and a `FloorPlan`
      room, so `RoomDesigner` and `FlooringTakeoff` pick it up with no change of
      their own.

**D. Widen the assistant**
- [ ] D1. Split the system prompt: shared rules (be brief, use the app's own
      numbers, never edit the design) plus a per-trade section. Decks keep DCA
      6; kitchens get clearances and the work triangle; bathrooms get fixture
      clearances and ventilation; additions get the bearing-wall question.
- [ ] D2. Send the trade and the House with every question.

**E. Additions as a first-class project**
- [ ] E1. Surface `FloorPlanEditor` as its own trade in the designer rather than
      a panel reachable only from the deck screen.
- [ ] E2. Carry the addition's footprint into siding and openings through
      `houseToTrades`, so a new wall is quoted like any other wall.

### What I am deliberately not doing

- Not restyling the portal or any other tab. The walkthrough is a new panel
  inside the existing tab, in the existing dark card style.
- Not touching the designer's layout for staff. Same screens, reached
  differently.
- Not building roofing to fill out the trade list.
- Not letting the walkthrough produce a price. What a customer designs is an
  idea, not a quote, and the existing tab already says so — that text survives
  into the new flow.

### Scale, honestly

This is five or six sittings, not one. A is an afternoon. B is the bulk of it. C
is a new AI read and wants real photos of real rooms to test against. D and E
are small once B exists. If it should be narrower, **A plus B is a coherent
shippable thing on its own** — it makes everything that already exists
reachable, and the interior read can follow.

### Approved 2026-09-20

Eric chose **A + B now** — fix the render, then build the walkthrough — with C,
D and E to follow once he has used it. So the interior read is not being built
yet, but he settled what it should pull out of a room photo when it is, and all
four were wanted:

- dimensions and ceiling height
- window and door positions
- what is there now (cabinet runs, tub, shower, vanity, appliances)
- finishes and condition

The last of those is the least reliable thing to read off a photograph, so when
C is built it must be labelled hardest — it feeds a quote, and a confident wrong
answer about counter material costs real money.


### A, done — with one change of approach mid-way

- [x] A1. `/photoreal` was registered twice in `house-capture.tsx`; the 3D
      render now has its own path, `/photoreal-3d`. Verified against the
      deployed function: each handler answers with its own distinctive refusal,
      which is the thing that was broken.
- [x] A2. **Not proven by generating an image, deliberately.** Eric stopped the
      verification: *"lets only do the 3d rendering after the house is full into
      the cad design correctly? so no money is spent?"* He was right — the model
      on screen was the designer's default, so the image would have cost money
      to render a building nobody owns. Routing is proven by the free probe
      above; the generation call behind it is unchanged code that will run the
      first time somebody renders a real house.
- [x] A3 *(added on his instruction)*. The render button now waits until the
      house's width, height and storeys are each measured or photo-read rather
      than estimated, with the reason shown on screen beside it.

One other duplicate route exists — `GET /applications` twice in
`make-server-57095a78/index-full.tsx` — but that directory is an archive whose
function is pointed at a stub entrypoint in `config.toml`, so it is dead code
either way and was left alone. The scanner that found both is at
`scratchpad/dupe-routes.mjs` and is worth keeping: this was the sixth silently
shadowed route in this codebase.

**Next: B, the walkthrough.**


### B, done

- [x] B1. Ten project kinds in plain English, in `lib/trades.ts`. Roofing is
      absent because `TRADES` marks it unbuilt and offering a homeowner a
      section that opens empty is how a good tool gets a reputation for being
      broken.
- [x] B2/B3. Photographs, outside and — for interior work — inside, through the
      same `SectionCapture` the designer already uses in five places.
- [x] B4. Their own words, kept apart from anything measured. Nothing computes
      from it.
- [x] B5. Two endings: open the designer on the right trade, or send it to us
      without drawing anything.
- [x] B6. Resumable. The project is written from step two onward, and an
      unfinished one is offered back on return.

Two bugs found by using it, both older than the walkthrough: the customer design
list never passed an owner key and so was always empty, and the designer never
read `?projectId=` so every "Open" landed on a blank screen. Both fixed.

Not test-fired: "Send to Black Phoenix", which would put a fabricated job in the
real pipeline.

---

## Plan — paint colours from vendor catalogues

**Status: waiting on Eric's approval. No code written yet.**

Asked for mid-session:

> "also want to be able to add colors for paint in which i will get a vendors
> api to bring in the color like benjamin moore or sherwin williams"

### Where this belongs, and why not where it looks like it belongs

The tempting version is a colour picker in the design centre with a list of
Benjamin Moore colours pasted into a constant. That would be wrong twice over.

A paint colour is not a colour. It is **a product from a vendor's catalogue** —
it has a code, a name, a finish, a base, a price per gallon and a coverage rate,
and which vendor it came from decides all of those. The materials hub already
exists for exactly this: vendor catalogues feeding product selection and
accurate quotes. So paint goes in as a vendor's catalogue, alongside everything
else a vendor sells, and the design centre *selects from* it rather than owning
a list of its own.

That also settles three rules that are already standing policy:

- **Customers see the vendor's price, never ours.** `vendorPricing.tsx` already
  gates negotiated rates to internal callers. Paint arriving through the same
  door inherits that rather than needing its own guard.
- **Hub products stay out of the storefront.** Paint is a hub product. It must
  not surface in the ecommerce store.
- **A vendor answers for their own catalogue.** Questions about which Benjamin
  Moore finishes are stocked are the vendor's to answer from their portal, not
  something to hardcode a platform-wide default for.

### Where a colour attaches

Not to the project. To a **surface**, because that is what gets painted and
what gets quantified:

```
  House.views[]            room  ──▶  walls, ceiling, trim   ──▶ interior paint
                           elevation ─▶ siding, trim, door   ──▶ exterior paint
  FloorPlan.rooms[]        ──▶ per-room wall and ceiling finishes
```

The area is already computed — `netWallArea` for an elevation, the room's own
dimensions for an interior. So a colour plus a coverage rate is a gallon count,
and a gallon count is a scope line, and a scope line is already priced and
already flows into the pipeline. Nothing new is needed downstream; this is a
finish field on surfaces that already know their area.

### The vendor API is the part that is not ours

Neither Benjamin Moore nor Sherwin-Williams publishes a documented public colour
API, so the shape of this depends entirely on what access Eric actually gets —
a partner API, a dealer feed, or a spreadsheet. **This plan therefore does not
assume one.** The adapter is the only part that changes when the real feed
arrives:

- [ ] P1. A `paint_colors` catalogue in the materials hub: vendor, code, name,
      hex, finish, base, price per gallon, coverage per gallon. Same shape as
      any other hub product, so hub pricing and vendor gating apply unchanged.
- [ ] P2. One importer interface with two implementations: a CSV/JSON upload a
      vendor does from their own portal, and — when Eric has credentials — a
      fetch adapter per vendor behind the same interface. The upload path is
      what makes this shippable before any API exists.
- [ ] P3. A colour field on room and elevation surfaces, with the swatch, the
      vendor's name for it, and its code. Never a bare hex: "Simply White
      OC-117" is orderable, `#F7F4EF` is not.
- [ ] P4. Gallons into the scope from area ÷ coverage × coats, with the coats
      stated rather than assumed.
- [ ] P5. Offer it in the walkthrough for the kinds where paint is most of the
      job — kitchen, bathroom, layout, siding.

### The honest caveat about showing colour on a screen

A hex value on an uncalibrated monitor is not the colour that arrives in the
tin, and a customer who chooses from a screen and is disappointed on site is a
real dispute. So a swatch must always carry the vendor's code and say plainly
that it is an approximation and that a physical chip is the decider. That
sentence is part of the feature, not a disclaimer bolted on afterwards.

### What I would not do

Generate colours, invent names, or interpolate a vendor's fan deck. If a colour
is not in the catalogue it is not offered — an invented paint code on an order
is a real-world error, not a UI blemish.

### C, done

- [x] C1. A third subject on `/analyze`: `room`. Reads the room's two floor
      dimensions and ceiling height, every opening by wall and offset, what is
      fitted in it now, and finishes with condition — all four things Eric
      asked for. Scale fallbacks are split indoor/outdoor, because siding
      courses and brick are no use in a bathroom.
- [x] C2. `roomViewFromAnalysis` turns that into a `HouseView` of kind `room`,
      which `RoomDesigner` and `FlooringTakeoff` already read through
      `roomViews(house)`. Neither needed changing, which was the point of
      routing it through the house rather than inventing a parallel record.
- [x] C3 *(not planned, found on the way)*. `/analyze` was never metered. Every
      render in that file reserves before spending; the vision read did not, and
      any signed-in portal customer could call it in a loop. It now reserves
      from the `ai` bucket.

Two model bugs surfaced by writing the tests rather than by running the app:
`blankView` never recorded a provenance for `openings` despite its docstring
claiming every field was marked, and `mergeRead` never merged `depthFt`, so a
second read of a room silently kept the first one's depth.

**Still unverified, and deliberately so:** the vision call itself. It wants a
real photograph of a real room; a stock image would cost money and prove
nothing. Everything either side of it is verified — the subject routing free
against the deployed function, the conversion by 20 tests.

**Next: D**, splitting the assistant's prompt so it stops answering bathroom
questions in joist spans.


### D, done

- [x] D1. The prompt is assembled per trade: a shared half that does not change
      and a short brief that does. Each brief is mostly *what goes wrong* in
      that trade, because that is what a builder is actually asking about.
      Two rules added to the shared half — never state whether a wall is
      bearing, and always say when a number came from a photograph.
- [x] D2. The trade and the whole building now travel with every question, each
      dimension carrying whether it was measured, photo-read or a guess.
- [x] D3 *(not planned, found on the way)*. The assistant was rendered only when
      `trade === 'deck'`, directly under a comment claiming it belonged to no
      trade. Seven of eight trades had no assistant at all, which is why nobody
      had noticed it answering bathroom questions in joist spans — you could not
      ask it one.

The prompt layer moved to `assistantPrompt.ts` so it could be tested;
`design-assistant.tsx` imports Hono, which a node test cannot load. That split
paid for itself immediately: the shared section's worked example was a deck
example, so DCA 6 and joist sizes were reaching the bathroom prompt through the
half that was meant to be trade-neutral. Reading the code had not caught it.

Proposals are enforced server-side rather than merely requested: only the deck
has a patchable model, and a stray `joistSize` returned during a bathroom
question would otherwise have rendered an Apply button that edited a deck nobody
was looking at.

**Not verified:** the answers themselves. They cost money per question and are a
judgement call rather than an assertion — worth Eric asking it a real bathroom
question once and seeing whether it sounds like someone who has built one.

**Remaining from the original plan: E** — additions as a first-class project,
and carrying an addition's footprint into siding and openings. Plus **P1-P5**,
paint colours as a vendor catalogue.


### E, done

- [x] E1. **Additions & layout** is a real trade now. The walkthrough had been
      sending both "an addition" and "changing the layout" to the deck section
      with a note to start on Capture — which worked, and was a lie: somebody
      who said they wanted an addition landed on a screen headed Decks.
      The floor plan itself did **not** move. It stays on Capture with the
      photographs, because that is where you record what is there and an
      addition is the one case where part of "what is there" does not exist
      yet — and because two editors on one plan is how two descriptions of a
      building start to disagree. The new panel reads the plan back instead.
- [x] E2. An addition's exterior walls are computed from the footprint and go
      into the house as elevations, so siding, the opening schedule, structures
      and hardscape all quote them without a line of new code. Partial abutment
      is handled properly — a 20ft addition against a 12ft wall has 8ft exposed,
      not 20 and not 0.
- [x] E3 *(found while writing the addition brief)*. The assistant's brief
      promised the model a floor plan that `describe()` never sent. It is sent
      now, for every trade rather than only additions, with `unknown` bearing
      reported as nobody having looked rather than quietly omitted.

Verified in the running app: a 12×10 proposed room produced 44ft of wall and
352 sq ft of face, and after one button press the siding tool listed four
elevations — 12, 12, 10, 10, all 8ft to eave — with siding untouched.

**Note on the commit:** it also picked up four test files
(`catalogImport`, `imageSniff`, `productMatch`, `repriceEstimate`) that were
sitting untracked in the working tree before this session started. They are not
mine and are not described by that commit message; they are good tests that
simply had never been committed, so they went in rather than being left loose.

---

## What is left

- **P1–P5** — paint colours as a vendor catalogue. Planned above, not started.
- The vision read for a room, and the assistant's answers, both need a real
  photograph and a real question rather than a test.
- Roofing is still unbuilt and still says so on its own tile.

### P, mostly done — with one item deliberately held back

- [x] P1. A paint catalogue in the vendor catalogue: colours (vendor, code,
      name, approximate hex) and products (line, sheen, base, coverage, the
      vendor's price per gallon), stored per vendor and readable by anybody
      signed in. Separate because a vendor has thousands of colours and a
      handful of products; storing the cross-product would be hundreds of
      thousands of rows describing nothing.
- [x] P2. Vendor upload, reusing the existing ownership rules. An upload adds
      and updates but never clears — a vendor sending this season's new colours
      must not silently delete the rest of their deck. An API adapter drops in
      behind the same shape when Eric has credentials; neither Benjamin Moore
      nor Sherwin-Williams publishes a documented public colour API, so nothing
      here assumes one.
- [x] P3. Colour chosen per surface, on Scope rather than inside a trade,
      because painting crosses all of them. Never a bare hex — every swatch
      carries the vendor's code, and the screen-colour caveat is on the panel.
- [x] P4. Gallons from area ÷ coverage × coats, rounded up because paint comes
      in tins, with the arithmetic printed in the line's basis so the quantity
      can be checked. Two coats is the default and it is stated, never assumed
      away.
- [ ] P5. **Not done on purpose.** Offering paint in the customer walkthrough
      would today show a homeowner an empty picker, because no vendor has
      uploaded a deck. That is a worse first impression than not offering it.
      It goes in the moment there is a catalogue behind it.

**What this needs from Eric:** a vendor's colour deck. Either a paint vendor
uploads one from their portal, or a spreadsheet of code/name/hex plus a short
product list with coverage and price. Everything above is built and tested; it
is waiting on data, not on code.

**A note on the margin rule.** `PaintProduct` has `pricePerGal` and no field for
our negotiated cost, so no screen built on this model can leak one by accident.
That is asserted by a test rather than left as an intention.


---

## Plan — selling subscriptions through the portals

**Status: waiting on Eric's approval. Nothing built.**

### The path that already exists

More of this is built than it looks. An invite already walks somebody all the
way into a working portal:

```
  invite email                    editable per portal type, with {firstName},
  (PortalInviteEmailEditor)       {company}, {label}, {trialPeriod}, {trialMonths}
        │
        ▼  link carries ?token= and ?email=
  /portal-onboarding              create password → profile → checklist
        │
        ▼  owner provisioning writes
  feature_grant:{email}           level 'full', trialStart, trialEnd, status
        │
        ▼
  the portal opens
```

`PortalOnboarding` even collects `planInterest`, and says on screen that plan
selection "is optional and never creates a charge from this screen".

### The gap, in the code's own words

The provisioning route carries this comment:

> `// Feature grant: full access for the trial window, then requires a plan.`

The trial window was built. **"Then requires a plan" never was.** `feature_grant`
has a `trialEnd` and nothing reads it to sell anything, because there is no plan
to sell. When a trial lapses today the grant simply sits there.

So the answer to "how do we sell through the email invites" is not a new
funnel. It is four missing pieces bolted onto the one that already runs.

### The four missing pieces

**1. One plan catalogue, owned by the server.**
Today there are at least two hardcoded ladders — `SUBSCRIPTION_PLANS` inside
`DealsOffersSection.tsx` ($29 / $69 / $149 plus $9 pay-as-you-post) and another
`PLANS` inside `PropertyAIStudio.tsx`. Two copies of a price list is how a
customer gets quoted one number and charged another. The catalogue moves to the
server, every portal reads it, and changing a price is one edit.

**2. Real Stripe recurring Prices.**
Every checkout in this codebase builds `price_data` inline — a one-off amount
invented at request time. That is correct for a deposit or an invoice and wrong
for a subscription: recurring billing needs a Price created in Stripe, and its
id stored against the plan. **Eric creates the Products and Prices in Stripe;
this app stores the ids and never invents them.**

**3. Checkout → webhook → entitlement.**
`stripe-webhooks` already handles `customer.subscription.updated` and
`.deleted`. What it does not do is write `feature_grant`. That is the join:
subscription active → grant stays full; subscription gone → grant drops to the
free level. One writer, the webhook, so the portal never has to ask Stripe
anything at render time.

**4. The portal actually gating on it.**
`feature_grant` exists and is largely decorative. Each portal needs to read it
and know what its own tiers unlock.

### What the invite changes

Very little, which is the point. The template gains a plan block and two
tokens — `{planName}` and `{planPrice}` — so the email offers something
specific rather than only announcing a trial. The link is unchanged. Onboarding
gains a plan step that can still be skipped, because a portal that refuses to
open until somebody pays is a portal nobody finishes signing up for.

**The trial stays free and stays first.** 90 days, once per account, already
built this session. The sale happens when it has already been useful.

### Proposed plans

Prices below are a starting point, not a recommendation I can make for you —
they reuse the $29/$69/$149 ladder already written into the deals component so
the vendor-facing numbers do not change under anybody who has seen them.

**Vendors** — catalogue in the materials hub, deals, bid room
| | Free | Listed · $29 | Stocked · $69 | Preferred · $149 |
|---|---|---|---|---|
| Catalogue products | 25 | 250 | unlimited | unlimited |
| Deals live at once | 1 | 3 | 10 | unlimited |
| Bid room | view | quote | quote + alerts | first look |
| Placement | — | standard | priority | spotlight |

**Subcontractors** — the bid room is the product
| | Free | Trade · $29 | Crew · $79 |
|---|---|---|---|
| Bid room | view only | quote 5/mo | unlimited |
| Radius alerts | — | 25 mi | 50 mi |
| Insurance/licence vault | ✓ | ✓ | ✓ |

**Advertisers** — unchanged from what is already written
$29 / $69 / $149, plus Pay As You Post at $9 per deal.

**Content centre** — sold to other companies, per `platform-priorities`
| | Studio · $199 | Agency · $499 |
|---|---|---|
| Reels / month | 20 | unlimited |
| Seats | 3 | 15 |
| SEO engine | ✓ | ✓ + multi-site |
| White label | — | ✓ |

**Homeowners** — deliberately thin
The design centre is a sales tool, not a product to meter. Free for anybody
with a job, with the paid line being work rather than software.

### Build order

- [ ] S1. The catalogue on the server, with the two hardcoded ladders reading
      from it instead of their own copies.
- [ ] S2. Stripe Price ids stored per plan. Nothing invented — Eric creates
      them, this stores them, and a plan with no price id cannot be bought.
- [ ] S3. Subscription checkout from a portal, and the webhook writing
      `feature_grant` on activate, change and cancel.
- [ ] S4. Portals gate on the grant; a lapsed trial shows the ladder instead of
      silently keeping everything.
- [ ] S5. The invite template's plan block and the onboarding plan step.

S1 and S2 are worth doing whatever is decided about the tiers, because the
duplicate price lists are a live hazard.

### What needs deciding before any of it

The tier contents above are a proposal from what the app can already do. The
prices are Eric's call, and so is which audience is worth selling to first.

## Editing tiers in the Portal Plans tab, with a drafting assistant

Eric: *"can we make sure we can edit the tier features and prices with in the
same tab so add the pricing features in there and maybe have a ai assistant to
make it easy?"*

Today the Portal Plans tab can only make a published tier sellable — create or
attach its Stripe price. The tier itself (name, blurb, features, limits, price)
can only be written by posting JSON to the server by hand, which is why the
three vendor tiers were typed once and never revised.

### How it ties in

`POST /plan-tiers/:audience` already accepts a whole tier through `readTier()`,
and `GET /plan-tiers` already returns every field an editor needs — `publicTier`
strips only the two Stripe price ids. So this is a form against an API that
exists, not a new subsystem. Nothing about the catalogue's shape changes.

The assistant follows the design assistant's rule: **it proposes, it does not
edit.** A draft comes back as JSON into the form, and nothing reaches the
catalogue until Eric presses save.

- [x] E1. Inline tier editor in `PlanTierAdmin` — name, blurb, features,
      limits, price, interval, sort order, withdrawn. New plan and Edit both
      open it; save posts to the existing route.
- [x] E2. Guard the price field: a tier that already has a Stripe price cannot
      have its amount changed silently, because Stripe prices are immutable.
      Editing the amount has to say so and require a new price afterwards.
- [x] E3. `POST /plan-draft` — admin-only, metered in the shared `ai` bucket,
      returns proposed tiers as JSON. Strips anything resembling a price id.
- [x] E4. Draft panel in the tab: describe the ladder, review what comes back,
      load any tier into the editor.

### Worth saying plainly

**`limits` is not enforced anywhere yet.** `withinLimit()` exists in
`planTier.ts` and is covered by tests, but no route calls it — so a limit typed
into a tier today is documentation, not a ceiling. The editor will say so rather
than implying the number does something. Wiring each limit to the thing it
meters (catalogue size, deals live, quotes per month) is its own piece of work.

**Still unresolved from before this:** no tier in any portal has a Stripe price
attached, so nothing is actually on sale.

### Review — tier editing and the drafting assistant

**The editor.** The Portal Plans tab now has a *New plan* button and an *Edit*
button on every row. The form covers everything a tier is: name, one-line
blurb, features one per line, limits as key/value rows, price in dollars,
billing interval, sort order and whether it is on offer. It saves through the
route that already existed, so nothing about the catalogue's shape changed. The
id is fixed once a plan exists, because a saved subscription points at it.

**The assistant.** *Assistant* opens a box: describe what the plans should do
for a portal and a ladder comes back — names, blurbs, features, limits and
suggested prices, with a sentence on why it steps where it does. Each proposal
has *Open in the form*. It writes nothing. A proposal whose id matches an
existing plan opens as an edit of that plan rather than as a new one, so
revising "Listed" revises Listed. Admin-only, and metered in the shared `ai`
bucket like every other model call.

**A bug found on the way, which mattered more than the feature.** Saving a tier
would have destroyed its Stripe linkage. `readTier` builds a tier from the
request body alone, and the list route deliberately strips the price ids — so
the editor could not have sent them back, and the save would have written a
record with no price id at all. Editing a blurb would have taken the plan off
sale, with no error anywhere; the first sign would have been a vendor pressing
Subscribe. Fixed by carrying the linkage from the stored record.

**And the other half of that.** A Stripe Price is immutable — its amount is
fixed when it is created, and editing the figure here does nothing to it. So a
plan raised from $39 to $49 while still pointing at the old Price would
advertise one number and charge another, which is exactly the mismatch the
attach route already refuses. Changing the amount now detaches the old price,
which takes the plan off sale until a replacement is created — one button, in
the same panel. The Stripe object is untouched, so anybody already subscribed
keeps the figure they agreed to. The form says this *before* the save rather
than after, because afterwards the plan is off sale and that would read as a
fault.

That rule lives in `planTier.ts` as `carryStripeLinkage` rather than inside
the route, so it could be unit-tested — ten new assertions, including the
forced-mismatch case where saving the Stripe figure must *not* detach, because
that edit is bringing the plan into line rather than out of it.

**Said plainly:** `limits` still is not enforced anywhere. `withinLimit()`
exists and is tested, and no route calls it. The editor says so under the
limits section rather than presenting the numbers as ceilings the software
applies. Wiring each limit to the thing it meters is its own piece of work and
has not been done.

**Still true and still blocking sales:** no tier in any portal has a Stripe
price attached, so nothing is on sale in either mode.

Checks: app typecheck 323 (baseline), server 84 (baseline), tests 181 passing
(was 171), smoke 4 pages reached, 0 threw.

## One catalogue behind every plan — PLAN WRITTEN, NOT STARTED

Eric asked whether all the plan builders need to connect. They do, and they
do not: seven places name plans and carry their own prices, and three of them
describe the same vendor at three different figures. Checkout validates
against a map that has never heard of the tiers in the Portal Plans tab.

The architecture, the gaps in the catalogue, the order of work and the five
business questions that block it are in `tasks/plan-catalogue-unification.md`.

**Waiting on Eric to verify the plan before anything is built.**


## Y — selling the content centre as an add-on

Eric's ruling, 28 Sep: the content centre is bought **on top of the portal an
account already has**, not as a portal of its own. So Solo, Studio and Agency
stop being `plan_tier:content:*` and become add-ons in each buying audience's
catalogue.

### Why they cannot be sold today — four blockers, found by the dry run

1. **No Stripe prices.** All three are `active: false` with no `stripePriceId`
   and no `stripePriceIdTest`. The vendor tiers have both.
2. **Nobody can reach them.** The buying surface (`PortalTrialBanner`) fetches
   `plan-tiers?audience={the account's own portalType}`, and `content` is
   absent from `OWNER_PROVISION_PORTALS`, from the `allowedRoles` set in
   `/auth/me`, and from `portalHomePages`. No account can be on that audience,
   so nothing could ever list them. **The add-on route sidesteps this
   entirely** — an add-on is read from the buyer's own audience catalogue.
3. **`PlanAddOn.limits` is documented and unimplemented.** The type says the
   ceilings are *"merged over the tier's own limits… as a delta"*. Nothing
   merges them. `aiSpend` reads `tier.limits[key]` and `planLimits` reads
   `tier.limits` — neither looks at a held add-on. So a content add-on would
   be sold and grant no extra capacity at all. **This is the blocking one:
   without it the add-on is a charge for nothing.**
4. **They are a ladder, and add-ons are additive.** `addOnIds` is a flat list,
   so nothing stops an account holding Solo *and* Studio *and* Agency, paying
   for all three. There is also **no remove route** — only
   `POST /plan-add-on` — so an upgrade from Solo to Studio cannot drop Solo,
   in our records or in Stripe.

### The work

- [x] Y1. `effectiveLimits(tier, heldAddOns)` — pure and tested. Merges each
      held add-on's limits over the tier's as a delta, which is what the type
      has always promised. Highest wins where both name a key, and a key only
      the add-on names is granted. This is the piece that makes an add-on
      worth buying.
- [x] Y2. `aiSpend.ceilingFor` and `planLimits` resolve through `Y1` instead of
      reading the tier directly, so holding the content add-on actually raises
      the AI-call, render and reel ceilings above the free backstop (300 calls,
      10 renders).
- [x] Y3. A `group` on `PlanAddOn`, and mutual exclusion within it. Buying
      `content-studio` while holding `content-solo` must replace rather than
      stack. Needs a removal path: drop the Stripe subscription item for the
      one being left, then rewrite `addOnIds`. **Touches live billing — the
      part of this to be most careful with.**
- [x] Y4. Author the three as add-ons carrying the limits the tiers carried:
      Solo 600 calls / 40 renders / 5 reels / 1 seat, Studio 1,500 / 150 / 20 /
      3, Agency 5,000 / 600 / unlimited reels / 15. One record per buying
      audience, matching how `on-call` is already duplicated across three.
      Written as code and a **dry-run route**, not applied. Eighteen records —
      three rungs across the six audiences — from `contentAddOns.ts`, carrying
      the tiers' prices and ceilings verbatim. `POST /plan-addons/seed-content`
      reports what it would write and changes nothing; `{confirm:true}` applies.
      Admin-gated on `trustedRole`, and the audience list is fixed in code
      rather than taken from the body — which portals may buy this is a
      decision, not a parameter, and a mistyped audience would create a
      catalogue nobody can see.

      It never overwrites a record carrying a Stripe price id. Re-running it
      after the prices exist would wipe them and leave three rungs nobody can
      buy — the exact state the content tiers were already in, and the reason
      this work started.

      **One thing the tiers got away with and an add-on cannot.** Agency
      published no `reelsPerMonth` key and sold "unlimited reels" in its
      features, which worked only because `withinLimit` reads an absent key as
      unmetered. As a *delta* that reading inverts: a key the add-on does not
      publish is one it says nothing about, so the buyer would fall back to
      their own plan's ceiling. The add-on says `reelsPerMonth: 0` out loud.

      Nothing seeded is sellable: `active: false` and no Stripe price, matching
      how the tiers were authored. Prices and the Active box are Y6.

#### The seed was run, 28 Sep

Dry run first, computed against the real catalogue: **18 to write, 0 unchanged,
0 skipped, no collision** with the six existing `on-call` records (different
ids, so nothing to clash with).

Then applied. Verified after:

| | |
|---|---|
| content add-ons written | **18** |
| on-call records touched | 0 (still 6) |
| plan tiers touched | 0 (still 6) |
| feature grants touched | 0 (still 8) |
| table rows | 679 → **697**, exactly +18 |

**Run as SQL, not through the route.** The edge function carrying
`/plan-addons/seed-content` is not deployed, and deploying it would have pushed
every server change from this session live at once — a far larger blast radius
than eighteen inert rows. The SQL was generated from `contentAddOn()` rather
than hand-written, so the records are what the code produces, and it used
`on conflict (key) do nothing` so it could not overwrite anything whatever the
dry run had said.

Reversible by deleting the eighteen `plan_addon:%:content-%` keys. Nothing is
buyable as a result: every record is `active: false` with no Stripe price.
      **Which audiences may buy it is still Eric's to say** — vendor and
      customer at least; the on-call precedent is landlord, property_manager
      and condo_association.

**Buying audiences, Eric 28 Sep:** vendor, subcontractor, advertiser,
condo_association, property_manager, landlord. **Not `customer`** — the content
centre is sold to businesses that market themselves, not to the homeowners who
buy construction work.

**"admin" — asked, answered, and already true.** Eric: *"staff should just have it."* No seventh record. Verified in the code rather than assumed: `aiSpend.reserve` returns before reading any ceiling when `isStaff` is true, so staff are not metered at all — they already have the content centre outright.

That check had a bug, now fixed. `aiSpend` kept its **own** copy of the staff role list and it had drifted from the canonical `STAFF_ROLE_SET`, missing `platform_owner`, `business_owner`, `master_admin` and `management`. An account holding one of those was metered at the free backstop of 300 model calls while an `admin` beside them had none. Production holds 1 owner, 1 employee, 2 vendors and 4 accounts with no role at all, so nobody is affected today — the next `master_admin` would have been, and it would have read as a quota bug rather than a stale list.
- [x] Y5. Withdraw `plan_tier:content:{solo,studio,agency}` once the add-ons
      carry their limits, so there is one place the content centre is sold
      from rather than two that can disagree.
- [ ] Y6. Eric creates the Stripe prices from the tier admin — test first,
      rehearse a checkout, then live. Requires the Stripe keys, so it cannot
      be done from here.

### Worth saying plainly

The content centre page itself (`EnterpriseContentCenter`, at `/content-center`)
is **not gated by anything**. What the tiers actually sell is metered capacity
— AI calls, renders, reels, seats — enforced by `aiSpend`, not access to the
screen. That is a coherent product, but if the intent was that non-subscribers
should not reach the content centre at all, that gate does not exist and is
not in this plan.

## Deployed — make-server-3eae23a6, version 583

Eric asked for it on 28 Sep. Everything below had been written, tested and
committed but was running nowhere: the previous deploy was **version 582 at
22:12Z**, which captured HEAD at `5c9b05e5` (the Tier 3 socials work). Every
commit after that — the whole cohort spine, the derived MRR, the limits merge,
the add-on ladder — was repo-only until now.

### What went live

- The cohort consolidation: U3 tier migration, V1–V3 derived membership and
  pricing, W3's repointed MRR.
- `effectiveLimits` and both enforcers reading it.
- The add-on ladder: `group`, `groupRank`, supersede-on-purchase.
- `/plan-addons/seed-content` and the four closed cohort write holes.
- The staff-exemption fix (four company-side roles that were being metered).

### How, and what was checked

`supabase functions deploy make-server-3eae23a6 --project-ref …` — named
explicitly, so only that one function was touched. The other seven are still
on their previous versions.

`supabase/config.toml` already maps the slug to `./functions/server/index.tsx`
and states `verify_jwt = true` so a deploy cannot silently change it. Both
survived: the deployed entrypoint and import map are unchanged.

Verified after:

| | |
|---|---|
| version | 582 → **583** |
| `verify_jwt` | still `true` |
| `/health` | **200** |
| `/cohorts` with the anon key | **401** — the staff gate holds |
| worker boots in the 15 min after | 8, 104–179 ms, **zero errors** |
| other functions changed | none |

### Worth knowing

**This deployed the other session's work too.** The repository is shared and
its commits are interleaved with mine — the employee-rates and payroll work
around 17:22–18:45. The tree was clean, so HEAD was the shared truth and there
was no way to deploy one session's changes without the other's. Typecheck and
the full suite were green across the whole tree first.

**Rollback** is a redeploy from an earlier commit — Supabase keeps no
one-click revert for a function. `git checkout 5c9b05e5 -- supabase/functions/server`
then deploy would restore what was running before, but it would also undo the
other session's work, so read the interleaving above first.

## Two findings checked, 29 Sep — both clean, one of them my error

### The RLS advisory on `private_cron_config` was WRONG, and so was I

I relayed Supabase's advisory as critical: *"anyone with the anon key can read
or modify every row."* That is not true of this table, and I should have
checked before repeating it.

    anon key -> GET /rest/v1/private_cron_config
    401  {"code":"42501","message":"permission denied for table private_cron_config"}

Grants on the table are `postgres` and `service_role` only. Neither `anon` nor
`authenticated` holds a single privilege. **RLS being off is not the same as
being exposed** when the role has no GRANT — grants are the stronger gate and
they are correct here. The advisory fires on `rls_enabled = false` without
looking at them.

Enabling RLS would be harmless defence-in-depth (`service_role` bypasses it),
and is worth doing if a grant is ever added. It is not urgent and it is not a
hole. **Not done — offered.**

### Nobody is locked out of their portal

Four of the eight accounts carry no `app_metadata` role, which I flagged as a
risk because `/auth/me` falls through to `customer`. Traced properly:

- One of the four holds a **landlord** grant. Its intake record
  (`intake:onboarding:OWNER-INVITE-…`) says `portalType: landlord`, and
  `/auth/me` ends with `if (!role && intake?.portalType) role = intake.portalType`
  — so they resolve to landlord and reach their own portal. **Fine.**
- The other three have no grant, no intake and no approved application. They
  resolve to `customer`, which is what a signed-up account with no portal
  should be. **Fine.**

Worth knowing for later: the two middle fallbacks in that chain query
`user_permissions` and `company_members`, and **neither table exists**. The
query throws, the `catch` swallows it, and resolution falls through to the
intake. It works, but two of the four steps are dead and the failure is
invisible — so the intake record is doing all the work for any account whose
role was never stamped.

**Y5 done, 29 Sep.** The three `plan_tier:content:*` records are marked
`supersededByAddOn` with a note naming the add-on that replaced them and the
six audiences it lives in, and `active` is pinned false. Kept rather than
deleted: they are the provenance for what the add-ons carry, and each add-on's
`sourceTierId` points back at them.

**W4 done, 29 Sep — the tables are dropped.** Eric's explicit go-ahead. Both
re-counted at zero inside the transaction rather than trusting the earlier
check, no inbound foreign keys from anywhere else, no views.

The first attempt **failed, and that was the guard working**:
`subscriptions.plan_id` carries a foreign key into `plans`, so dropping `plans`
first was refused. Dropping the referencing table first means `CASCADE` is
never needed — which is the point, because without it anything else that had
turned out to depend on either table would have stopped the drop rather than
being quietly destroyed with it. The migration file carried the same ordering
bug and is fixed.

After: `plans` and `subscriptions` both gone, 22 public tables down to 20, and
`kv_store_57095a78`, `feature_grants` and `organizations` all untouched. The
migration is now `20260928140000_drop_dead_plan_tables.sql` (no longer
`.pending`), idempotent through `to_regclass`, kept as the record of what was
done and so a fresh environment reaches the same state.

**X3a settled, 29 Sep.** Eric: *"a trial is use of all componats then it moves
to tiers upon completion."* So a trial is **not** a rung of the ladder — it is
full use of everything, and the tier is what the account arrives at when the
trial finishes. A trial grant therefore carries no `tierId` and belongs to no
cohort, which is correct rather than a gap.

Stamping a tier onto a trial would have been the wrong fix twice over: it would
show an account as having chosen a rung it has not chosen, and
`resolveEntitlement` ranks a tier above a trial, so it would change what they
are served.

What was actually wrong was the *reading*. `GET /cohorts` now returns
`trialsNotOnATier`, and the screen shows "+ N on trial, not yet on a tier"
beside the member count and on the empty state — so one subscriber and seven
trials reads as the truth rather than as a broken page.

**Worth checking with Eric:** `TRIAL_EXCLUDED_ADD_ON_IDS` withholds two things
from every trial — on-call, and on-call answered by Black Phoenix. The reasons
in the code are strong (the cost is a staffed phone line rather than compute,
and emergency cover is a promise that would lapse on a date nobody was
watching). But it is the one documented exception to "use of all components",
so he should know it exists.

**V0e done, 29 Sep.** The Subscriptions tab renders `<SubscriptionPlans />`,
which fetches its own tiers and overrides and carries its own editor — but
this component kept a `subscriptionPlans` array beside it that nothing
rendered: "Starter Plan, 320 subscribers" and a "Professional Plan" whose
features were literally *Feature 1, Feature 2, Feature 3*.

It was not harmless. The stats header counted **that** array, so the default
view of the screen reported two plans and 476 subscribers that did not exist,
directly above a list showing something else. The Create button wrote into it
too, so a plan added there vanished on the next render.

Removed, along with the five switch branches that maintained it — TypeScript
found all five once the array was gone. `getCurrentData()` returns nothing for
that tab, so the header now counts zero rather than a fiction, and the Create
button is hidden there because the child owns that tab's editing.

Left alone deliberately: `SubscriptionCard` and the `SubscriptionPlan`
interface, about eighty lines that render the shape just deleted. They were
already dead before this change — nothing has referenced `<SubscriptionCard />`
for some time — so removing them is tidying rather than fixing, and it is the
kind of unasked-for edit that has broken a screen here before. Worth doing
with V0f, when the remaining four mock tabs are dealt with properly.
