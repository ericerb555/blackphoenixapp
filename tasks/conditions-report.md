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

**C1 to C6 are built. C7 onward is not started.**

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

- [x] **C1. `conditionDiff.ts` — the comparison and the classification.** Pure,
      on the server, tested hard: the scale ordering, wear against damage, the
      landlord override, and the case where the two sides disagree. This is the
      file that decides what a tenant is charged, so it is the one with the
      tests.
- [x] **C2. `depositMath.ts` — parsing a deposit and the arithmetic.** Deposit
      less deductions, what is returned, what is still owed, the refusal to guess
      at an unreadable figure, and the refusal to total anything while pricing is
      outstanding.
- [x] **C3. The report record and its routes.** Generate from a move-in and a
      move-out form the landlord owns, keyed by landlord email so tenant
      isolation is structural rather than a filter somebody remembers. Status
      through the four states above; totals recomputed server-side on every
      write.
- [x] **C4. The report in the leases tab.** A new panel beside the forms, not a
      new tab and no restyling. Per-line wear-or-damage override, recorded as the
      landlord's decision.
- [x] **C5. Send to Black Phoenix for pricing.** Raises a work request through
      `persistWorkRequest` onto that property's job, carrying the damage lines as
      its scope. This is the step that makes the report a job rather than a
      document.
- [x] **C6. The quote's numbers back onto the report.** Per-area totals from the
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

---

## 8. C1 and C2, as built — 2 Oct

`conditionDiff.ts` (29 tests) and `depositMath.ts` (23 tests). Both pure, both on
the server, neither touching a store or a screen. Four things settled while
writing them that the plan had left implicit.

**The signed record governs.** The comparison runs on `tenantResponses.areas` —
what the tenant put their name to — and the landlord's own reading is carried
onto the line only where it DIFFERS. A landlord recording Fair-to-Damaged while
the tenant signed Poor-to-Poor produces an unchanged line with the disagreement
stated, not a two-step drop. Preferring the landlord's figure silently would
have made the document worthless as evidence at exactly the moment it is needed.

**An override moves a line between wear and damage and nothing else.** It cannot
charge for an area that is unchanged or better than on arrival, and it cannot
manufacture a baseline. Those are not judgement calls, they are the absence of
anything to judge — and an override that could reach them would be a way to
charge for anything at all.

**Evidence from both accounts travels onto the line, deduplicated.** A photograph
the landlord took and one the tenant took are both evidence and neither
supersedes the other.

**Tenancy length is reported and not applied.** A one-step drop is wear at three
months and at four years. One rule plus a stated fact is easier to defend than
two rules interacting, and the override is there for the case that needs it.

### The bug the tests caught, which is worth recording

`settleDeposit` read a line with `cost: null` as costing ZERO, because
`Number(null)` is 0 and 0 is finite and not negative. An unpriced damaged area
would have become a priced area costing nothing, the settlement would have read
as `ready`, and the report would have gone out stating a damaged floor was
quoted at zero — the precise failure the module was written to prevent, inside
the module written to prevent it. Absent is not zero; it is now explicit.

### Still true, and still needing a decision later

The deposit field is free text and `parseDeposit` refuses "one month" and "1
month rent" rather than reading the latter as one dollar. That refusal is
correct, but it means a real lease can block a real report, so C4 should let the
landlord enter the figure rather than only reporting that it could not be read.

Deposit INTEREST is deliberately absent. Massachusetts requires it, and getting
it right needs the state, the account and the dates, none of which are on these
records. A wrong interest figure on a statutory statement is worse than none.

---

## 9. C3, as built — 2 Oct

`conditionsReport.ts` (35 tests) holds the record and its life; the routes are in
`index.tsx` beside the landlord forms, because they read those forms and share
their auth. Three decisions worth recording.

**Half of it freezes.** A report that has been sent out must not change
underneath the people holding it, so the FINDINGS freeze the moment it leaves the
landlord's hands — edit a move-out checklist afterwards and the issued statement
is unaffected. The MONEY does not freeze, because it does not exist at that
moment: Black Phoenix prices the damage after the report is sent, so the
settlement is always derived from the frozen findings plus whatever has since
been priced. Freezing both would have meant freezing a report with no figures on
it.

**No total is ever stored.** Not the deductions, not what is returned, not what
is owed. All of it is derived on read from the findings, the costs and the
deposit, because a stored total is a number that can disagree with the lines
above it.

**Each timestamp is written once.** A retried request must not restamp "sent on
the 2nd" as the 9th, or redo the freeze. Caught by a test that originally
asserted the wrong thing — the right behaviour is an idempotent no-op, not an
error.

### The security shape

Reports are keyed `conditions_report:{landlordEmail}:{id}`, so one prefix read
returns everything a landlord owns and no request can reach another landlord's
tenancy. Ownership of BOTH checklists is checked before either is read, so naming
a form id is not enough to compare two of them. A tenant's index is written only
when a report is SHARED, and the read checks the status as well as the index —
two gates, because this is somebody else's money being accounted for.

Only staff may post costs. A landlord may post the wear-or-damage override and a
deposit figure, and the override records WHO from the session rather than from
the body: the report says a person made that call and it has to be the real one.

A report cannot be deleted or reopened once shared, and there is one report per
move-out checklist — a second would be a second statement about the same deposit
with nothing to say which was real.

### What C6 still has to do

The costs route exists and is staff-only, so a report can be priced today by
posting figures to it. What it does NOT yet do is take those figures FROM a
quote. That is C6, and until then a `quoteId` on a line is a label rather than a
link.

---

## 10. C4, as built — 2 Oct

`ConditionsReports.tsx`, mounted as a third panel in the leases tab under the
lease builder and the forms manager. No restyling, no new tab, and the existing
panels are untouched.

**The deposit is typed on the report, and that is not a fallback.** The lease
draft form asks for a security deposit, feeds it to the prompt that drafts the
lease, and stores only the resulting prose — so the figure exists as a sentence
in a document and NOWHERE as a number. The plan assumed a free-text lease field
to parse; there is not even that. Parsing it back out of lease text would be
guessing at the most consequential figure on the statement, so the report asks
for it. That also works for a tenancy predating the forms entirely.

**Conditions are shown side by side rather than as a verdict.** Each line gives
the arrival condition, the departure condition, the finding, and — where the two
accounts differed — "you recorded X" under the signed figure. A single "Damaged,
$820" would read better and be impossible to check, and this document exists to
be checked.

**The move-in checklist is matched automatically**, on the tenant, taking the
latest completed one at or before the departure. No picker, because that is the
pairing anybody would make by hand. Where there is none, the panel says so
before the report is made rather than after.

### What is clickable and what it does

Mark damage / not damage per line, while the findings are live. Send to Black
Phoenix for pricing, which freezes the findings. Reopen, which thaws them.
Give to tenant, disabled with the reason on hover until the report is priced.
A shared report shows no destructive controls at all.

### Not verified in the browser

Typecheck, the full suite, smoke and a production build all pass, and smoke
mounts the landlord portal without throwing. None of that exercises the leases
tab with a real session, real forms and a real tenant — Eric has to click it.

---

## 11. C5, as built — 2 Oct

Sending a report raises ONE work request through persistWorkRequest, not one per
area: a turnover is one visit, one crew and one quote, and three requests for
three damaged areas would put three jobs on the pipeline for a single departure.
It lands on the same job identity as everything else about that address.

The description carries, per area, both conditions, both inspections notes, the
photo count, and any disagreement between the two accounts — because whoever
prices it has not been in the flat. Wear is named explicitly as NOT to be quoted,
since pricing a wear line would put work on a deposit statement that has no
business being there. It asks for a price per area rather than one total.

**Re-sending rescopes the existing job rather than raising a second one.** Two
crews at one flat is the obvious failure; the quieter one is somebody quoting
against findings the landlord has since corrected.

Caught by the tests: two join calls had a real newline inside their quotes rather
than an escape, which made the whole module unparseable. Found in seconds because
the module is pure and imported by a test.
