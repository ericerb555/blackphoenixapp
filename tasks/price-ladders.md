# The price ladders — Basic, Advanced, Professional

A table to edit, not a question to answer. Eric settled the names on 2026-10-03
("Basic, Advanced, Professional") and the basis on the same day: **the market
average for New Hampshire, plus ten percent.** So every figure here is researched
market pricing with 10% added. The prices this platform published before are kept
in the tables only for comparison, because the gap between them and the market
turned out to be the most useful thing in this document.

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
Stocked $79 / Preferred $199. Both are "published", and **real subscribers may
be paying the catalogue's figures right now.**

The market basis settles it: seller and storefront platforms charge $39 / $105 /
$399, so market+10% is $43 / $116 / $439. The live $49 entry is already above
that and should simply stay, so nobody's bill moves at the bottom of the ladder.
The four-rung $99 / $199 / $399 / $799 list is superseded — it was never wired to
Stripe and cannot be bought.

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

## 3. The basis: market average, plus ten percent

Eric's instruction, which replaces the basis the first draft used: *"what is the
average for new hampshire and add ten percent."* So every figure below is
researched market pricing with 10% added, not a figure anchored on what this
platform published before. The published prices are kept in the table only as a
comparison, because the gap between them and the market is itself a finding.

The position matches what the platform already said in code before it was said
out loud — the custom-pricing prompt in `index.tsx` quotes "MID-TO-HIGH market
rates for Southern New Hampshire and Northern Massachusetts."

### One honest caveat about "for New Hampshire"

**Software is not priced by state.** Property management software, HOA software
and field service software cost the same in Nashua as in Houston. So for those
audiences the average below is the **national** average, which is what an NH
buyer actually pays — it is labelled rather than dressed up as a local figure.

Three things here do have genuinely regional rates, and those are NH figures:
property management fees (**8–11% of monthly rent in NH**, against 8.49%
nationally), residential maintenance agreements, and local advertising spend.

Two audiences have no usable comparable at all — **territory owner** and the
**content centre** add-on. Those are marked as needing a figure from you rather
than given a derived one, because a number invented here would look exactly as
confident as a researched one and it should not.

### Research summary

| Audience | What the market charges | Source shape |
|---|---|---|
| Customer | residential maintenance agreements $19–29/mo standard, $25–45 premium; tiers $100–200 / $200–350 / $300–500 a year | regional + national |
| Landlord | small-landlord software $20–69/mo; NH management fee 8–11% of rent | national software, NH service |
| Property manager | $1.00–$1.49/unit entry, $3.20 mid, $5.00 top, with $160–$400 monthly minimums; flat plans $62–$400 | national |
| Condo association | flat $45–$67.50 entry for <50 units, $100–300 mid-sized; per-unit $1.00–$2.50 with $280–$400 minimums | national |
| Condo manager | the per-unit platforms' minimums: $160, $298, $400 | national |
| Investor | $99–$100 entry, ~$200–300 mid, $650–$749 top, $1,500+ institutional | national |
| Vendor | seller/storefront platforms $39 / $105 / $399 | national |
| Subcontractor | Jobber $39 / $129 / $249; Housecall Pro $59 / $149 / $299, plus $40–149 of add-ons most buyers need | national |
| Advertiser | Yelp Enhanced $300–1,000, Yelp Ads $150–1,000, Angi $300–500, local Meta budget $300–2,000 | NH-relevant local |
| Territory owner | no comparable found | — |

---

## 4. The ladders at market average + 10%

### The flat ladders

| Audience | Basic | Advanced | Professional | Market average it came from | Published before |
|---|---|---|---|---|---|
| **Customer** | **$14** | **$25** | **$39** | $12.50 / $23 / $35 maintenance agreements | 29 / 79 / 149 |
| **Vendor** | **$43** | **$116** | **$439** | $39 / $105 / $399 seller platforms | 49 / 79 / 199 live |
| **Subcontractor** | **$54** | **$153** | **$301** | $49 / $139 / $274 Jobber + Housecall Pro | 49 / 99 / 199 |
| **Advertiser** | **$289** | **$806** | **$2,933** | $263 / $733 / $2,667 Yelp, Angi, local Meta | 199 / 499 / 999 |
| **Territory owner** | — | — | — | **no comparable — needs your figure** | 299 / 599 / 1,199 (proposed) |

**Three of those five move a long way, and in both directions.**

The **customer** ladder was 2–4× the market. A homeowner does not buy a portal;
what a homeowner buys monthly is a maintenance agreement, and those average $23.
Charging $149 to a homeowner was never going to convert, and $39 for the top rung
is what the market will actually bear. If that feels too low for what the
Professional tier contains, the answer is that the *maintenance plan* is the
product a homeowner pays real money for — the builder already prices that — and
the portal subscription is the smaller half.

The **advertiser** ladder was far below market, and that is the expensive mistake
of the two. Yelp charges $300–1,000 for a single enhanced placement and Angi
$300–500 for a basic listing; we were asking $199 for an entry tier that puts a
business in front of the same local audience. Ad inventory also costs almost
nothing to serve, so this is the highest-margin audience on the platform and the
one that was most underpriced.

**Vendor Professional** more than doubles, from $199 to $439, which is what the
market charges for a full storefront with inventory sync.

### The banded ladders

The market prices these per unit with a monthly minimum, so these follow the same
shape rather than inventing bands: **a floor, plus a per-unit rate above the
units the floor includes.** Every rate is the market average plus 10%.

**Landlord** — by units owned

| Rung | Floor (includes 4 units) | Per unit above 4 | Market average it came from |
|---|---|---|---|
| Basic | **$28** | $1.40 | $25 small-landlord software, $1.25/unit |
| Advanced | **$92** | $2.20 | $84 mid plans, $2.00/unit |
| Professional | **$220** | $3.30 | $200 top plans, $3.00/unit |

**Property manager** — by doors under management

| Rung | Floor (includes 24 doors) | Per door above 24 | Market average it came from |
|---|---|---|---|
| Basic | **$72** | $1.35 | $65 entry flat plans, $1.23/unit |
| Advanced | **$199** | $3.20 | $181 mid plans, $2.90/unit |
| Professional | **$335** | $5.50 | $305 top plans, $5.00/unit |

At 100 doors that is $175 Basic, $442 Advanced, $753 Professional. At 400 doors,
$580 / $1,402 / $2,403. Both sit inside what AppFolio, Buildium and Yardi charge
at those sizes, which is the check that matters.

**Condo association** — by units in the building

| Rung | Floor (includes 24 units) | Per unit above 24 | Market average it came from |
|---|---|---|---|
| Basic | **$59** | $1.20 | $53.83 of PayHOA, ManageCasa, Condo Control |
| Advanced | **$102** | $1.95 | $93 mid plans, $1.75/unit |
| Professional | **$194** | $2.75 | $176 top plans, $2.50/unit |

**Condo manager** — by total units across the associations managed

| Rung | Floor (includes 100 units) | Per unit above 100 | Market average it came from |
|---|---|---|---|
| Basic | **$315** | $1.65 | $286 average of the $160 / $298 / $400 platform minimums |
| Advanced | **$450** | $3.50 | $3.20/unit mid rate |
| Professional | **$675** | $5.50 | $5.00/unit top rate |

**Investor** — by properties in the portfolio

| Rung | Floor (includes 4 properties) | Per property above 4 | Market average it came from |
|---|---|---|---|
| Basic | **$109** | $12 | $99 Cash Flow Portal, InvestNext, Homebase |
| Advanced | **$256** | $25 | $233 mid tiers |
| Professional | **$770** | $45 | $700 of AppFolio IM $650 and Agora $749 |

The published $299 investor plan sits between Advanced and Professional, so it
was roughly right — the gap was that it had no entry rung, and $109 is now the
market-anchored way in.

### Why the per-unit shape rather than bands

The first draft used bands. The market does not: it charges a monthly minimum
plus a rate per unit, and every platform researched works that way. Matching the
market's shape as well as its level means a buyer can compare us directly, which
is the whole point of sitting 10% above rather than somewhere else entirely.

Two protections still apply, and they are what stop a per-unit price becoming an
argument:

- **The count comes from our own records, never from the customer.** Anyone who
  types their own door count sets their own price. `PlanAddOn` already does this
  correctly for on-call. An account whose count cannot be established falls to
  the floor and is flagged, rather than quietly getting the cheapest price.
- **A count rising takes effect at the next renewal; a count falling takes
  effect at once.** Adding a property should never produce a surprise charge,
  and losing one should reduce the bill immediately. The asymmetry costs a
  little revenue and buys every argument away.

### Sources

- [Property Management Software Pricing 2026 — AppFolio vs Buildium vs RentRedi vs DoorLoop](https://www.stackscored.com/pricing/property-management/)
- [Buildium vs DoorLoop 2026: Pricing, Features & Verdict](https://www.leasense.com/blog/buildium-vs-doorloop-features-pricing-comparison-2025)
- [HOA Software Pricing: What It Really Costs (2026)](https://effortlesshoa.com/blog/hoa-software-pricing-guide)
- [PayHOA pricing](https://www.payhoa.com/pricing/)
- [HOA Management Software Reviews 2026: Pricing & Hidden Costs](https://logicarticles.com/hoa-management-software-reviews/)
- [Housecall Pro Pricing 2026](https://costbench.com/software/field-service-management/housecall-pro/)
- [Field Service Software Pricing Index 2026](https://fieldservicetools.com/research/field-service-software-pricing-index/)
- [HVAC Maintenance Agreement Pricing 2026](https://www.builtontenth.com/hvac-research/hvac-membership-pricing-maintenance-agreements)
- [HVAC Membership Plans: Pricing and Inclusions 2026](https://serviceagent.ai/blogs/hvac-membership-plans/)
- [Average rental property ownership costs in New Hampshire](https://www.steadily.com/blog/rental-property-costs-new-hampshire)
- [How Much Do Property Managers Charge? 2026 Fee Breakdown](https://www.leaserunner.com/blog/how-much-do-property-managers-charge)
- [Local Advertising Cost Guide 2026](https://adwave.com/resources/local-advertising-cost-guide-2026)
- [Paid Advertising Services Cost: 2026 Local Guide](https://clicksgeek.com/paid-advertising-services-cost/)
- [10 best investor reporting software for real estate 2026](https://agorareal.com/compare/best-investor-reporting-software/)
- [Best Real Estate Syndication Software 2026](https://raises.com/best-real-estate-syndication-software-2026)

---

## 5. What each rung buys

Deliberately expressed as the axes the catalogue can actually enforce
(`limits: Record<string, number>`), not as marketing bullets. A rung that
promises something nothing measures is a rung that gets argued about.

| Axis | Basic | Advanced | Professional |
|---|---|---|---|
| Seats / users | 1 | 5 | unlimited (0) |
| Units / doors / listings | the floor's included count, then metered | same, higher rate | same, highest rate |
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

## 6. Which part of the catalogue holds a band

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

## 7. What I need from Eric

1. **The two figures the research moved hardest.** Customer Professional falls
   from $149 to $39 and Advertiser Professional rises from $999 to $2,933. Both
   follow the market+10% rule as instructed, and both are big enough moves that
   I would rather hear you confirm them than assume. The advertiser one is the
   money: ad inventory costs nothing to serve, so every dollar of that increase
   is margin.
2. **A territory figure.** No comparable exists for a territory licence —
   franchise territory fees vary too widely to average honestly. Tell me what
   you think a territory is worth and what it is counted in (zips? towns?
   population?) and I will build to it.
3. **A content centre figure,** for the same reason. It is an add-on rather than
   a ladder, and I did not research social and content management tools, so I
   have no average to add 10% to yet. Say the word and I will.
4. **Whether the per-unit shape replaces bands everywhere.** The market charges
   a monthly minimum plus a rate per unit, and matching that shape is what lets
   a buyer compare us directly. It also means the monthly figure moves when a
   door count moves, which is a support question you will have to answer — the
   renewal asymmetry in section 4 is my proposal for making that painless.
5. **Whether the $99 / $199 / $399 maintenance trio becomes per-unit add-ons.**
   Unchanged from the last draft, still open.
6. **Anything you want different.** I will not argue with a number you set. The
   point of the research was that none of these should be a guess.

Nothing here is built yet. P5 writes the flat ladders into the catalogue as
`plan_tier` records, P4 writes the per-unit ones as cohorts, and P6 creates the
Stripe prices. All three wait on this table.
