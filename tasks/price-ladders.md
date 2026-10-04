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

## 3. The proposal

Monthly, before add-ons. **Annual = ten months** (two free), which is simple to
say and close to the 28% the maintenance builder already offers at annual
frequency.

| Audience | Basic | Advanced | Professional | Anchored on |
|---|---|---|---|---|
| **Customer** | **$29** | **$79** | **$149** | 29 / 79 published; a third rung added above |
| **Landlord** | **$29** | **$79** | **$179** | 29 / 79 published; Professional is the multi-property rung |
| **Vendor** | **$49** | **$99** | **$199** | 49 live (nobody's bill moves), 99 published, 199 in both |
| **Subcontractor** | **$49** | **$99** | **$199** | unchanged — already three rungs |
| **Advertiser** | **$199** | **$499** | **$999** | unchanged — already three rungs |
| **Property manager** | **$149** | **$299** | **$599** | unchanged, but see the per-door note below |
| **Condo association** | **$99** | **$249** | **$499** | nothing published; banded by units |
| **Condo manager** | **$199** | **$399** | **$799** | 199 / 399 published; Professional is the portfolio rung |
| **Investor** | **$99** | **$299** | **$599** | the published 299 becomes the middle rung |
| **Territory owner** | **$299** | **$599** | **$1,199** | nothing published; exclusivity is what is being sold |

Three things to notice about the shape:

- **No price falls.** Every figure is at or above what was published for that
  audience, so no existing subscriber's bill moves and nothing has to be
  grandfathered on day one.
- **Two audiences gain an entry rung** (investor at $99, condo association at
  $99). A ladder whose bottom rung is $299 has no way in, and the trial has to
  land somewhere when it ends.
- **Three audiences gain a top rung** (customer $149, landlord $179, condo
  manager $799). A two-rung ladder has nowhere for a good account to grow,
  which is the commonest way a subscription business leaves money on the table.

### Where the real money is, and it is not the ladder

Property management and condo work scale with **doors**, not with features. A
flat $599 is wrong in both directions: too much for a 12-unit manager and far
too little for 400 doors. That is what the cohort system's `minUsers`/`maxUsers`
bands are for, and `PlanAddOn` already supports `perUnit` with the count taken
from our own records rather than the customer's word.

Proposal: the Professional rung for Property manager, Condo association and
Condo manager is a **base plus a per-door band**, with the figures above as the
base at the smallest band. The bands are a separate decision and want real door
counts in front of them.

---

## 4. What each rung buys

Deliberately expressed as the axes the catalogue can actually enforce
(`limits: Record<string, number>`), not as marketing bullets. A rung that
promises something nothing measures is a rung that gets argued about.

| Axis | Basic | Advanced | Professional |
|---|---|---|---|
| Seats / users | 1 | 5 | unlimited (0) |
| Properties / units / listings | entry cap | raised | unlimited (0) |
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

---

## 5. What I need from Eric

1. **The vendor conflict** — keep $49 as Basic, or move the whole ladder up to
   the published $99 / $199 / $399 and migrate existing vendors? Keeping $49 is
   my recommendation and it is the only option that moves nobody's bill.
2. **Any figure in section 3 you want different.** Edit the table; I will not
   argue with a number you set, and the whole point of anchoring them on
   published prices is that none of them should be surprising.
3. **Whether the $99 / $199 / $399 maintenance trio becomes per-unit add-ons**
   as proposed, or stays as flat add-ons for now.
4. **Door bands for property management and condo work** — or tell me to draft
   them and you will correct the numbers.

Nothing here is built yet. P5 writes these into the catalogue as `plan_tier`
records and P6 creates the Stripe prices; both wait on this table.
