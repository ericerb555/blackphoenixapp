# The price ladders — Basic, Advanced, Professional

A table to edit, not a question to answer. Eric settled the names on 2026-10-03
("Basic, Advanced, Professional"); this proposes the figures that go with them,
and every one is anchored on a price this platform has already published rather
than on a number invented here.

Feeds **P5** and **P6** of `tasks/marketing-and-monetisation.md`, and **U6/U8**
of `tasks/plan-catalogue-unification.md`, which is the same consolidation
approached from the catalogue side. Read that file too — U1, U2, U2b and U3 are
already done, so the add-on model and the Stripe plumbing for add-ons exist.

---

## 1. There are ten ladders, not eleven

The eleven subscriber-facing portals do not map to eleven ladders.

| Audience | Ladder? | Why |
|---|---|---|
| Customer | yes | subscribes like everybody else — `subscription-shape-three-tiers-plus-addons` |
| Landlord | yes | |
| Vendor | yes | the only ladder live in the catalogue today |
| Subcontractor | yes | |
| Advertiser | yes | |
| Property manager | yes | |
| Condo association | yes | buys exterior and common-area work — `condo-revenue-split` |
| Condo manager | yes | a manager runs several associations; a different buyer |
| Investor | yes | **the catalogue has no `investor` audience yet** |
| Territory owner | yes | **the catalogue has no `territory_owner` audience yet** |
| Content centre | **no** | sold as an add-on on top of a portal — `content-centre-is-an-addon` |
| Employee | no | staff, not a sales audience. The published $5 is an internal line |
| Tenant / sub-tenant | no | invited by the landlord, not sold to — `who-invites-which-portal` |

So: **ten ladders, thirty rungs**, plus the add-on layer.

---

## 2. Four conflicts to settle before any of this is published

**1. Vendor has two live price lists that disagree.** `PORTAL_UPGRADE_PRICES`
says $99 / $199 / $399 / $799 — four rungs. The catalogue record
`plan_tier:vendor`, which is the one wired to Stripe, says Listed $49 /
Stocked $79 / Preferred $199. Both are "published". This is the four-price-list
problem in its sharpest form, and it needs a ruling rather than a merge: **real
subscribers may be paying the catalogue's figures right now.**

Proposal: keep the catalogue's $49 entry, because anybody already on it is
paying it, and take the middle from the published $99. Nobody's bill moves.

**2. Every audience has an identical $99 / $199 / $399 "maintenance" trio.**
Forty-two rows of it in `PORTAL_UPGRADE_PRICES`. A landlord with four units and
a property manager with four hundred doors paying the same $99 cannot be right,
and the file's own comment says these were always a separate product sold
alongside the portal plan. They should become **add-ons priced per unit or
banded by unit count** — which `PlanAddOn` already supports — not rungs.

**3. Condo manager and condo association are different buyers.** Both portals
exist; only `condo_association` exists as a catalogue audience. A manager pays
for a portfolio, an association pays for one building.

**4. Vendor's rung names.** The live ladder reads Listed / Stocked / Preferred,
which are better words for what a vendor actually buys. Eric's ruling is one
naming scheme platform-wide, so they get renamed — but the old names should
survive as the subtitle on the rung so an existing vendor recognises their plan.

---

## 3. A rung is a base, not a price

Eric's correction to the first draft of this table: *"some of those number will
be based on doors and features wanted."* So the figure an account pays is

    monthly  =  the rung's price at that account's band  +  the add-ons chosen

and a ladder of thirty flat numbers was wrong on its face for any audience whose
work scales with units. Two consequences before the tables:

**The band is resolved from our records, never from the customer.** A customer
who types their own door count picks their own price. `PlanAddOn` already does
this correctly for on-call — the count comes from the platform's own unit
records — and the tier has to work the same way. An account whose door count
cannot be established falls to the smallest band and is flagged, rather than
being given the cheapest price silently.

**"Some" means some.** Only five audiences scale on doors or properties. The
others scale on something, but not that, and each needs its own axis named:

| Audience | Quantity axis | Banded? |
|---|---|---|
| Landlord | units owned | yes |
| Property manager | doors under management | yes |
| Condo association | units in the building | yes |
| Condo manager | total units across associations | yes |
| Investor | properties in the portfolio | yes |
| Customer | one property | **no** — flat, add-ons do the rest |
| Vendor | catalogue listings / locations | later; flat for now |
| Subcontractor | crew seats | later; flat for now |
| Advertiser | impressions / placements | later; flat for now |
| Territory owner | territory size | needs Eric — zips? population? |

Annual is **ten months** (two free) on every figure below.

### The flat ladders

Unchanged from the published prices, and these are complete prices — the
add-ons a subscriber chooses are what moves them.

| Audience | Basic | Advanced | Professional |
|---|---|---|---|
| **Customer** | $29 | $79 | $149 |
| **Vendor** | $49 | $99 | $199 |
| **Subcontractor** | $49 | $99 | $199 |
| **Advertiser** | $199 | $499 | $999 |
| **Territory owner** | $299 | $599 | $1,199 |

### The banded ladders

The smallest band is the price that was already published, so no existing
account's bill moves. Each band up is roughly 1.7× the one below, which keeps
the **per-door** cost falling as an account grows — that is deliberate, and it
is what makes the big accounts winnable.

**Landlord** — by units owned

| Units | Basic | Advanced | Professional |
|---|---|---|---|
| 1–4 | $29 | $79 | $179 |
| 5–14 | $59 | $149 | $329 |
| 15–49 | $119 | $279 | $599 |
| 50+ | $229 | $499 | $1,049 |

**Property manager** — by doors under management

| Doors | Basic | Advanced | Professional | ≈ per door at the top of the band |
|---|---|---|---|---|
| 1–24 | $149 | $299 | $599 | $25.00 |
| 25–99 | $249 | $449 | $799 | $8.07 |
| 100–399 | $449 | $799 | $1,399 | $3.51 |
| 400+ | $799 | $1,399 | $2,399 | $6.00 at 400, $2.40 at 1,000 |

The per-door column is there to be argued with. A 24-door manager paying $25 a
door for Professional is paying for a floor rather than for volume, which is
normal at that size but is also the figure most likely to lose that account —
it is the one I would most want a real quote compared against.

**Condo association** — by units in the building

| Units | Basic | Advanced | Professional |
|---|---|---|---|
| 1–24 | $99 | $249 | $499 |
| 25–99 | $199 | $449 | $849 |
| 100+ | $349 | $749 | $1,399 |

**Condo manager** — by total units across the associations managed

| Units | Basic | Advanced | Professional |
|---|---|---|---|
| 1–99 | $199 | $399 | $799 |
| 100–399 | $399 | $749 | $1,399 |
| 400+ | $699 | $1,299 | $2,399 |

**Investor** — by properties in the portfolio

| Properties | Basic | Advanced | Professional |
|---|---|---|---|
| 1–4 | $99 | $299 | $599 |
| 5–19 | $199 | $549 | $999 |
| 20+ | $349 | $899 | $1,599 |

### What this means for the band boundaries

A band boundary is a price cliff, and a cliff is where an account argues. Two
protections worth building rather than discovering:

- **A band change never takes effect mid-cycle.** The new band applies at the
  next renewal, so adding a property does not produce an immediate charge.
- **A band only ever rises on a renewal, and falls immediately.** Losing doors
  should reduce the bill at once; gaining them should not surprise anybody. That
  asymmetry costs a little revenue and buys every argument away.

---

## 4. What each rung buys

Deliberately expressed as the axes the catalogue can actually enforce
(`limits: Record<string, number>`), not as marketing bullets. A rung that
promises something nothing measures is a rung that gets argued about.

| Axis | Basic | Advanced | Professional |
|---|---|---|---|
| Seats / users | 1 | 5 | unlimited (0) |
| Units / doors / listings | the band, enforced | the band, enforced | the band, enforced |
| Documents & storage | core set | full vault | full vault + export |
| Reporting | standard | advanced | advanced + API |
| Support | email | priority | named contact |
| Content centre | — | — | included (otherwise an add-on) |
| On-call | never included | never included | never included — see below |

Two rules that are not negotiable, both already decided:

- **On-call is never bundled into any rung and never included in a trial.** The
  deliverable is a person answering a phone at 3am; a rung that quietly includes
  it staffs a rota nobody agreed to (`subscription-shape-three-tiers-plus-addons`).
  It is an add-on, priced by call, by hours and by units covered
  (`on-call-is-priced-by-call-hours-and-units`).
- **Anything with labour in it must clear the employee bill rate.** That is the
  floor the price watcher enforces (`employees-have-a-pay-rate-and-a-bill-rate`).

### The features-wanted half

The ladder is the smaller half of the price. The add-on layer is where "features
wanted" lives, and it already exists in the catalogue — 24 `plan_addon` records,
all currently `active: false` with no Stripe price, which is P6's job. Three
things follow from Eric's correction:

- the **$99 / $199 / $399 maintenance trio** repeated across every audience
  becomes per-unit or banded add-ons, not rungs (section 2, conflict 2);
- an add-on that covers units — on-call above all — is priced **per unit from
  our own count**, so it bands with the tier rather than against it;
- a Professional rung that includes an add-on uses `includedAddOns`, which
  already exists, rather than a separate price.

---

## 5. Which part of the catalogue holds a band

Worth stating because it changes the order of work. `PlanTier.priceCents` is a
single number — the tier record cannot express a band. A **cohort** can:
`basePrice` plus `pricingTiers` banded on `minUsers`/`maxUsers`, which is exactly
the shape the five banded ladders need, and `planTier.ts` already has the adapter
that turns a cohort into a tier at a given count.

So the banded audiences are the concrete reason cohorts have to be the store of
record rather than a reporting layer — it is not an abstract preference. And it
reorders the plan: **P4 (populate cohorts) comes before P5/P6 for Landlord,
Property manager, Condo association, Condo manager and Investor.** The five flat
ladders can go straight into `plan_tier` records and do not have to wait.

---

## 6. What I need from Eric

1. **The vendor conflict** — keep $49 as Basic, or move the whole ladder up to
   the published $99 / $199 / $399 and migrate existing vendors? Keeping $49 is
   my recommendation and it is the only option that moves nobody's bill.
2. **The band boundaries, more than the prices.** 1–4 / 5–14 / 15–49 / 50+ for
   landlords and 1–24 / 25–99 / 100–399 / 400+ for property managers are guesses
   at where your actual accounts sit. If most of your landlords hold six units,
   the first boundary is in the wrong place and that matters more than any figure
   in the table.
3. **The property-manager floor.** $599 Professional at 24 doors is $25 a door.
   It is defensible as a floor and it is the number most likely to lose a small
   manager. Worth checking against a real quote.
4. **What a territory is counted in** — zip codes? population? towns? It is the
   one axis I could not infer from the code.
5. **Whether the $99 / $199 / $399 maintenance trio becomes per-unit add-ons**
   as proposed, or stays flat for now.
6. **Anything in the tables you want different.** I will not argue with a number
   you set; anchoring them on published prices was so that none of them would be
   a surprise.

Nothing here is built yet. P5 writes the flat ladders into the catalogue as
`plan_tier` records, P4 writes the banded ones as cohorts, and P6 creates the
Stripe prices. All three wait on this table.
