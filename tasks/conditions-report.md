# The property conditions report

Eric, 2026-10-02:

> "can we look into the landlord portal and see if we can create a property
> conditions report once a tenant moves out and a new inspection has been
> documented?"

and, on who sees it and whether it carries money:

> "landlord controls but when the report shows damage and costs will come out of
> security deposit they will be able to share with tenant"

and, on where the costs come from:

> "they should be able to send me the report and i will put a cost to it"

**Nothing is built. This is the plan, awaiting his word.**

---

## 1. The inputs already exist, and they are better than expected

The move-in and move-out checklists are **two-sided records**, which is the
thing that makes this worth building rather than guessing at.

`LandlordFormsManager` creates a form with the landlord's own assessment in
`data.areas` — thirteen dwelling areas, an Excellent-to-Damaged scale, and
photos and video attached per area. The tenant opens it in `SubTenantForms`,
their draft is **seeded from the landlord's version**, they adjust what they
disagree with, and they sign. That lands in `tenantResponses.areas` with a
signature and a `completedAt`.

So for any tenancy there are up to four accounts of every area: what the
landlord said on the way in, what the tenant signed on the way in, and the same
two on the way out. In a disagreement that is the whole argument, already
recorded, already with evidence hanging off the right areas.

Both forms use the same `DEFAULT_AREAS` from `ConditionAreas`, deliberately, so
they line up. That is why the comparison is move-in against move-out, which is
what Eric chose.

**Whole-property inspections are NOT part of this.** They use `PROPERTY_AREAS` —
roof, foundation, electrical panel — which is a building, not a unit, and the
two lists do not overlap. Attaching one would put an unrelated area list beside
the comparison.

---

## 2. The hard part, and it is not technical

**Normal wear and tear is not chargeable against a deposit. Damage is.** Every
state makes that distinction and this report exists to act on it, so the
classification is the single most consequential thing in the design.

A one-step drop after a four-year tenancy is somebody living in a flat. A drop
to Damaged is damage. Getting this backwards in either direction has a real
cost: under-charging takes money off the landlord, and over-charging is both
unfair to the tenant and the thing that loses a deposit case.

**Proposed: the report classifies conservatively and the landlord escalates
deliberately.**

    improved or unchanged      nothing on the report
    one step down              WEAR  — listed, not charged
    two or more steps down     DAMAGE — listed, chargeable
    anything to Damaged        DAMAGE — chargeable
    landlord override          either way, per line, recorded as their decision

Defaulting to wear rather than damage is the deliberate choice. It means the
automated step never makes the accusation — a person does, per line, and the
report records that they did. A document that charged a tenant because a scale
moved one notch would not survive being handed to them, and this one is built to
be handed to them.

**Where the two sides disagree, the report says so rather than picking.** If the
landlord recorded Poor on the way out and the tenant signed Fair, that conflict
is the most important line on the page. Resolving it silently in the landlord's
favour would make the whole document worthless as evidence.

---

## 3. Black Phoenix prices it, which gives the report a life

The landlord documents the damage and sends the report to Black Phoenix. Black
Phoenix puts the cost on it. The priced report is what goes against the deposit
and what the tenant is shown. **The landlord never types the figure.**

This is better than the alternative on both counts. As evidence, "the contractor
quoted $820" is a different claim from "the landlord reckons $820" — strong
enough to survive being challenged, where a typed number is not. And it is the
business: every damage report is remediation work arriving from a portal we
already sold them.

It also settles something the first draft of this plan had wrong. The report is
not generated once; it has a **lifecycle**, and each step has a different
audience:

    documented    landlord has both records and the comparison. Private.
    sent          with Black Phoenix for pricing. Lands as a work request on
                  that property's job, so it is the same job identity as
                  everything else about that address.
    priced        our quote's line totals are on the report. Deposit
                  arithmetic now has real numbers.
    shared        the tenant sees it, when the landlord chooses.

**The deposit arithmetic cannot complete before pricing comes back, and the
report should say so plainly rather than showing a total of zero.** There is no
real number before then, and a report showing "$0 deducted" while pricing is
outstanding would be read as "nothing owed".

**How the pricing gets back onto the lines.** The work request carries the damage
lines as its scope, and it is quoted the way every other job is — through the
catalogue, on the pipeline, with the same rates. The quote's per-line totals map
back to the report's areas. Nothing new prices anything: this is the existing
quoting path with a conditions report as its input, which is why it is worth
doing this way rather than adding a costing field.

**Totals are recomputed on the server** from the stored lines and the linked
quote. A posted total is never trusted — this one decides how much of somebody's
money is returned.

## 4. The deposit field is not a number

`LandlordLeaseManager` stores `securityDeposit` as free text with a placeholder
of "$1,800". It can hold "1800", "$1,800.00", or "one month".

A report that subtracts from a deposit needs a number, and the failure mode here
is severe: an unparseable deposit read as zero would show the entire cost as
owed by the tenant. So an unreadable deposit **blocks the arithmetic and says
so** rather than defaulting. Parsing handles the ordinary money formats; anything
else asks the landlord to confirm the figure.

---

## 5. Order of work

- [ ] **C1. `conditionDiff.ts` — the comparison and the classification.** Pure,
      on the server, tested hard: the scale ordering, wear against damage, the
      landlord override, and the case where the two sides disagree. This is the
      file that decides what a tenant is charged, so it is the one with the
      tests.
- [ ] **C2. `depositMath.ts` — parsing a deposit and the arithmetic.** Deposit
      less deductions, what is returned, what is still owed, the refusal to guess
      at an unreadable figure, and the refusal to total anything while pricing is
      outstanding.
- [ ] **C3. The report record and its routes.** Generate from a move-in and a
      move-out form the landlord owns, keyed by landlord email so tenant
      isolation is structural rather than a filter somebody remembers. Status
      through the four states above; totals recomputed server-side on every
      write.
- [ ] **C4. The report in the leases tab.** A new panel beside the forms, not a
      new tab and no restyling. Per-line wear-or-damage override, recorded as the
      landlord's decision.
- [ ] **C5. Send to Black Phoenix for pricing.** Raises a work request through
      `persistWorkRequest` onto that property's job, carrying the damage lines as
      its scope. This is the step that makes the report a job rather than a
      document.
- [ ] **C6. The quote's numbers back onto the report.** Per-area totals from the
      quote, so the deposit arithmetic is backed by a real priced job and the
      report can say which quote each figure came from.
- [ ] **C7. View and print.** Itemised per area with both sides' evidence, dated,
      the deposit arithmetic shown, each cost naming the quote behind it. Reuses
      `DocumentPreviewModal` and its `printElementId`.
- [ ] **C8. Share with the tenant.** Landlord-triggered, never automatic, and only
      once priced — an unpriced report shared with a tenant makes a claim with no
      number behind it. Once shared, the tenant sees exactly what the landlord
      sees.
- [ ] **C9. Tests, typecheck, smoke, build, deploy.**

C1 and C2 first and on their own, because they can be fully tested before any
screen exists and everything else is presentation over them.

---

## 6. Why the shape satisfies the statute, deliberately

`LandlordLeaseManager` already encodes the state rules. New Hampshire (RSA
540-A) and Massachusetts (G.L. c.186 s.15B) both require the deposit returned
within thirty days; California and New York require an **itemised statement** of
deductions. Black Phoenix works in southern New Hampshire and northern
Massachusetts.

So this is built as that itemised statement — per area, dated, evidence from
both records attached, arithmetic shown — rather than a summary with a figure at
the bottom. Not a disclaimer and not advice to go and get one drawn up: the
document itself should be the one that holds up.

---

## 7. What this does not do

- It does not decide whether to keep a deposit. It produces the itemised basis
  for that decision and shows the arithmetic; a person decides.
- It does not restyle the landlord portal or the tenant portal.
- It does not touch `LandlordFormsManager`. The forms are the input and are
  unchanged.
- It does not share anything automatically. Landlord-controlled, per Eric.
- It does not compare whole-property inspections. Different area list, different
  question.
- It does not let the landlord enter a cost. Black Phoenix prices it, per Eric,
  and a typed figure would undercut the only reason the number is worth having.
- It does not share an unpriced report. The claim and the number travel together
  or not at all.
