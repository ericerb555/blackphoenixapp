# The AI estimating engine — audit, and the plan

Eric's brief, 2026-11-12: every distinct construction process becomes its own
individually editable, fully costed line item — materials, labour, equipment,
subcontractors, overhead, contingency and profit — producing a professional
customer quote while internal cost and margin stay internal.

**Phase 1 of that brief is an audit, and this is it. No code has been changed.**

---

## The headline

**Most of this is already built, and the expensive parts are the ones that
exist.** The estimator already decomposes a job into ordered construction
phases; every material and labour line is already tagged to its phase; the
customer/internal split is already enforced server-side and tested; and the
whole chain from quote to schedule to draw to invoice already runs off those
phases.

What is missing is narrower than the brief implies, and it is mostly **four
things**: the process is not itself a costed object, there is no equipment or
subcontractor cost at line level, there is no labour burden, and markup is a
single job-level cost-plus number rather than per-category with a margin mode.

The risk is not building it. The risk is **double-counting money** while
building it, in a system where five modules already apply markup correctly to
each other's output.

---

## What exists, and must be preserved

### The decomposition already happens

`quote-generator.tsx` asks the model for the job as phases **in build order**,
and its prompt already insists on the three phases estimators forget:

> 1. SET-UP / MOBILISATION — always first … It is real billable work and it is
>    the phase most often left off.
> 2. DEMOLITION / PREPARATION
> 3. THE TRADE PHASES OF THIS PARTICULAR JOB, in build order — structure before
>    rough-in, rough-in before close-up, close-up before finishes
> 4. FINISHES AND COMMISSIONING
> 5. CLEAN-UP AND HAND-OVER — always last.

It emits 8–25 material lines and 4–10 labour lines, each tagged with a `phase`,
plus `additionalCosts` (Permit / Disposal / Equipment / Mobilization / Testing)
and the four margin percentages. The brief's Phase 2 is, in substance, done.

### The per-line fields already go further than the editor admits

| on a material line | on a labour line |
|---|---|
| `quantity`, `unit`, `unitCost`, `totalCost` | `hours`, `hourlyRate`, `totalCost` |
| `supplier`, `category`, `manufacturer` | `role`, `trade`, `crewSize` |
| **`wasteFactor`** (clamped 0–0.5) | **`productivityNote`** |
| `phase`, `visible`, `included` | `phase`, `visible`, `included` |

`wasteFactor`, `crewSize` and `productivityNote` are produced by the model and
survive storage, because `quoteDoc.ts` keeps the line arrays wholesale. But
`MaterialItem`/`LaborItem` in the editor do not declare them, so the editor
neither shows nor protects them. **That is the cheapest win in this whole
document** — the data is already there and nothing displays it.

### The money rules, and the modules that own them

| module | owns | tested |
|---|---|---|
| `quoteMargins.applyMargins` | overhead, profit, contingency on direct cost; the tax base | yes |
| `quoteCustomerPrice` | spreading job markup into the prices a customer sees | yes |
| `quoteTotal` | which stored field is a quote's total | yes |
| `quoteDoc` | which fields survive being saved | yes |
| `customerQuoteView` | what reaches a customer at all — an allowlist | yes |
| `quotePdfSelection` | what reaches the PDF | yes |
| `drawToInvoice` / `paymentSchedule` | phase → draw → invoice, to the cent | yes |
| `discounts` | the labour-only discount and its cap | yes |

31 of the 167 test files are quote, pricing, invoice or margin tests. This is
the best-covered part of the codebase and the plan must stay inside it.

### The customer/internal boundary is real

Two independent toggles per line — `included` (charged or not) and `visible`
(itemised or not) — with hidden money folded into the phase total rather than
dropped. `customerQuoteView` is an allowlist, so a field added to a quote is
invisible to customers by default. The brief's Phase 9 and Phase 11 are largely
satisfied already; they need extending, not inventing.

---

## What is genuinely missing

### 1. A process is not a costed object — it is a narrative plus a sum

Today a phase is a `processStep` (name, description, duration, trade) and its
cost is *derived* by summing the lines tagged to it. There is no row that owns
a process, so a process cannot carry its own scope, inclusions, exclusions,
assumptions, dependencies, inspection requirement, equipment, subcontractor, or
its own markup.

**This is the central structural change in the brief**, and everything else in
it hangs off this one decision.

### 2. No equipment and no subcontractor at line level

`additionalCosts` has an `Equipment` category — a flat amount, no duration, no
transport, no markup of its own. `subQuotes` exists but is a quote-level
internal record, not a costed line inside a process.

### 3. No labour burden. None.

`grep -ri burden` across the server and the pricing libraries returns nothing.
`hourlyRate` is a bare wage. Payroll taxes, workers' comp, liability insurance
and employer-paid benefits are not modelled anywhere, which means **every
labour figure in the system understates its true cost by roughly 25–40%**.

Of everything in the brief, this is the one most likely to be losing real money
today, and it is also the easiest to get subtly wrong — a burden applied twice
is indistinguishable from a healthy margin until the year end.

### 4. Markup is one job-level number, cost-plus only

`applyMargins` puts overhead, profit and contingency on *total direct cost*.
The brief asks for independent markups per cost category (materials, labour,
equipment, subcontractors, disposal, delivery, permits) **and** a target gross
margin mode, and is explicit about the distinction:

```
markup   selling = cost × (1 + markup)
margin   selling = cost ÷ (1 − margin)
```

The company settings already hold per-category intent — `materialsMarkup`,
`laborMarkup`, `overheadPercentage`, `targetProfitMargin` — and the engine
ignores all but overhead and profit. Note `targetProfitMargin` is *named* a
margin and *used* as a markup. That is exactly the confusion the brief warns
about, and it is live.

### 5. Takeoff stops at a waste factor

`wasteFactor` exists and is applied. Packaging does not: drywall is quoted by
square foot rather than by sheet count, and there is no coverage, cut or
layout reasoning. The brief's example is precisely this case.

### 6. No price provenance, no versioning, no override audit

A unit cost is a number with no source, effective date or verification status.
A quote has no revision history, and a manual override of an AI figure is
indistinguishable from the AI's own figure a week later.

---

## The plan

Six stages. Each is shippable alone, each is useful alone, and they are ordered
so that **the money-critical arithmetic lands before anything is built on top
of it**.

### Stage 0 — Surface what is already there (no schema change)

Declare `wasteFactor`, `crewSize`, `productivityNote`, `trade` and `supplier`
on the editor's interfaces and show them. Nothing new is computed; the
estimator's own reasoning becomes visible and editable.

*Why first:* it is a day, it has no migration, it cannot break a total, and it
immediately answers "where did these hours come from" — which is the question
the brief's Phase 6 exists to answer.

### Stage 1 — Labour burden

One tested function, one company setting, applied at the point a labour line is
costed. Internally a labour line gains `wage`, `burdenPercent` and
`burdenedCost`; `hourlyRate` keeps its current meaning so nothing downstream
shifts.

*Why here:* it changes what a job costs, so it must land before any margin work
that would otherwise be computed on an understated base. **The one invariant
that matters: burden is applied exactly once, and never inside a markup that is
also applied to the burdened figure.**

### Stage 2 — The pricing engine: per-category markup and a margin mode

Extend `quoteMargins` rather than replace it, keeping `applyMargins` as the
cost-plus path it is today so every existing quote prices identically. Add
category markups and a target-margin mode beside it, with the two formulas
written out and tested against each other.

*Why before the process object:* a process that owns its own markup needs a
markup engine that can express one. Building them in the other order means
writing the engine twice.

### Stage 3 — The process as a first-class costed line

The structural change. A process row owning its scope, sequence, inclusions,
exclusions, assumptions, dependencies and inspection requirement, with
materials, labour, equipment, subcontractor and other costs beneath it, and its
own financial summary.

Existing quotes migrate by promoting each `processStep` to a process and
attaching the lines already tagged to it — the tagging is what makes this a
migration rather than a rewrite. **`quoteDoc.ts`'s whitelist must name every
new field** or it will be silently dropped, which is the fault this repository
has now had seven times.

### Stage 4 — Equipment, subcontractors, and the rest of the cost types

Now cheap, because stage 3 gave them somewhere to live and stage 2 gave them
their own markups.

### Stage 5 — Provenance, versioning and audit

Price source and effective date on a cost; a quote revision when an approved
quote changes; an audit row when a human overrides an AI figure. This is what
makes the engine defensible six months later, and it is deliberately last
because it records the other five.

### Not in this plan

Live supplier price feeds (the brief says do not activate paid APIs without
approval), and regional cost indices beyond the location reasoning the prompt
already does.

---

## Risks, named

1. **Double-counting.** Five modules already apply markup to each other's
   output correctly. The worst pricing fault this project has had — 40%
   overhead and 40% profit on every repriced quote — was two modules
   disagreeing about whether a rate was 10 or 0.10. Every stage above adds one
   tested function and changes no other.
2. **The whitelist.** Any field added to a quote must be named in
   `quoteDoc.ts`. Seven features have been lost to this.
3. **The downstream chain.** `paymentSchedule` → `drawToInvoice` → the invoice
   total is pinned to the cent by tests. Stage 3 changes what a phase *is*, and
   those tests are the contract it must not break.
4. **Existing quotes.** Three live quotes, all drafts. Every stage must leave a
   quote that has not been reopened priced exactly as it is today.
5. **Three sessions are editing this repository.** `quote-generator.tsx`,
   `UnifiedProjectPipeline.tsx` and `quoteToPdfDocument.ts` are owned by
   another session as this is written. Stage 1 onwards touches files that
   session holds, and ownership has to be settled before any of it starts.

---

## What I need from Eric before stage 1

1. **The burden rate.** Payroll tax, workers' comp, liability and benefits as a
   percentage of wage — or the components, and the engine adds them up. There
   is no sensible default; a wrong one silently misprices every job.
2. **Markup or margin, per category.** `targetProfitMargin: 20` is currently
   applied as a markup. Which did you mean? They differ by a fifth of the
   profit on every job: 20% markup on $10,000 of cost is $2,000; a 20% gross
   margin on the same cost is $2,500.
3. **Which stages, and in what order.** The plan is cheapest-and-safest first,
   not most-valuable first. If burden matters more than everything else, say so
   and stage 1 goes first alone.
