# PLAN — a real quote from the Command Center

Eric, 2026-10-13:

> *"i want to be able to create a quote from the command center that will give
> me all the options of a work request so i can get a ai generated quote and
> detailed labor and materials."*
>
> *"i should be able to tell ai what i want in detail."*

Not started; waiting on him to verify the plan.

---

## The finding that changes what this job is

**The estimating engine is already what he is asking for. The Command Center is
wired to the weaker of two ways into it.**

There are two paths, and they are not equivalent:

    index.tsx:3981   estimateForWorkRequest(workRequest)
                     resolves the company's pricing settings, the vendor
                     CATALOGUE, the company's LABOUR RATES, and the MEASURED
                     HOURS published from finished jobs — then passes
                     repriceEstimate so the company's real prices replace the
                     model's invented unit costs BEFORE anything is totalled.
                     Used when staff open a work request (4089, 4132).

    quote-generator.tsx:515   POST /auto-generate-quote
                     calls runEstimator with NO repricer and NO measured
                     factors. Used by StartQuoteModal — the Command Center.

So a quote started from the Command Center today is priced at **the model's
guessed unit costs**: no catalogue, no company labour rates, none of the
productivity the rate-learning pass measured from real finished jobs. It looks
like a detailed quote and it is a plausible invention.

That is the heart of the request and it is not a form problem. The engine
already does per-material waste factors, crew-size productivity, location-aware
rates and tax, the soft costs amateurs forget, and overhead/profit/contingency
broken out. **The Command Center just is not getting any of it.**

### Why it ended up that way

`estimateForWorkRequest` lives in `index.tsx` and `/auto-generate-quote` lives
in `quote-generator.tsx`. A route in one module could not call a helper in the
other, so the thin path was the only one available where the route happened to
be. Nobody decided this.

- [ ] **Fix the wiring first, before any new fields.** Even with today's four
      inputs, routing the Command Center through the rich path changes a
      quote from invented prices to the company's own. That is the single
      biggest improvement available and it is a day's work at most.
- [ ] Either add `POST /quotes/from-brief` in `index.tsx` beside
      `estimateForWorkRequest`, or lift the pricing resolution into a shared
      module both can import. The second is tidier and touches more; the first
      is smaller and I would start there.
- [ ] Leave `/auto-generate-quote` answering, because `AdminAlertsPanel`
      references it — but have it delegate, so there is one estimator path and
      not two that drift.

---

## Then: everything a work request captures

`EstimatorInput` takes six fields — `title`, `serviceType`, `description`,
`location`, `estimatedValue`, and `extra`. `extra` is a free-text block of
structured context, and it is already how blueprint analysis reaches the model.

**That is the right seam and it should not be widened.** Adding fifteen named
fields to the type means the prompt builder, the heuristic fallback and the
repricer all learn about each one. Composing them into `extra` means the model
gets everything and the engine's contract stays as it is.

- [ ] The modal grows to capture what a work request does, and the server
      composes it into `extra` as labelled lines rather than as prose.

What to capture, grouped as he would fill it in:

    THE JOB          trade / service type, title, property type,
                     new work or a rebuild of something existing
    THE PLACE        address, unit count, access notes, storey count
    THE SIZE         square footage or linear footage, room count,
                     ceiling height — the numbers a takeoff needs
    THE CONDITIONS   occupied or vacant, parking, stairs or lift,
                     working hours restrictions
    THE TIMING       urgency, preferred window, hard deadline
    THE MONEY        budget if there is one, who is paying
    THE BRIEF        a long free-text field — see below

Not all of it will be known, and the form must not insist. A blank field should
be absent from the prompt rather than sent as "unknown", which reads to a model
as a fact about the job.

---

## "I should be able to tell AI what I want in detail"

This is the part worth getting right, and it is not just a bigger textarea.

- [ ] **A brief field with no length limit worth hitting**, placed last and
      labelled as the most useful thing on the form. The engine's accuracy
      comes from the methodology in its system prompt; what the brief adds is
      the specifics only he knows — "the deck is 16x20, pressure-treated frame,
      composite surface, existing footings are sound, the slider is being
      replaced at the same time".
- [ ] **The brief goes in verbatim**, not summarised and not reworded. If it is
      paraphrased before it reaches the model, the detail he took the trouble to
      type is the thing that gets lost.
- [ ] **Exclusions as their own field.** "Do not include demolition", "the
      customer is supplying the tile". A model told what to leave out produces a
      quote that does not have to be corrected afterwards, and an exclusion
      buried in a paragraph gets missed.
- [ ] **Show him what was sent.** A collapsed "what the estimator was told"
      panel on the result, containing the composed prompt context. When a number
      looks wrong, the first question is always what the model was told, and
      today that is unanswerable without reading logs.

---

## What the result must show

The engine already returns materials, labour, process steps, additional costs,
confidence and whether AI was used. The current modal shows a fraction of that.

- [ ] Materials as a table with quantity, unit, waste and unit cost — and
      **where each price came from**: the vendor catalogue, the company's own
      rate, or the model. That last distinction is the difference between a
      quote he can send and one he has to check.
- [ ] Labour by trade with hours, crew size and rate, and a mark on any line
      the measured-hours pass corrected.
- [ ] Soft costs, overhead, profit and contingency as their own visible lines,
      because that is what makes the total defensible to a customer.
- [ ] `usedAI: false` said plainly. The engine falls back to a heuristic
      estimate with no API key, and a heuristic presented as an AI quote is the
      worst of both.

---

## Deliberately not in this plan

**No scope-of-work engine.** `tasks/architecture.md` describes a phased scope
with inspection hold points and consumables attached to tasks, and says it does
not exist in the codebase. It is the right long-term home for "detailed labour
and materials", and building it inside a quote modal would be the wrong place
to start it.

**No blueprint upload here.** The blueprint path already exists and already
feeds `extra`. Starting a quote from a plan set is a different entry point, not
a field on this form.

**No change to `EstimatorInput`.** See above: `extra` is the seam.

---

## Order of work

1. Wire the Command Center to the rich path. Nothing else is worth doing first,
   because everything after it is a better brief fed to the wrong pricer.
2. The brief and exclusions fields, composed into `extra` verbatim.
3. The rest of the work-request fields.
4. The result view, including where each price came from.
5. "What the estimator was told".

Each step is useful on its own and shippable on its own.

## Review

*(To be completed when the work is done.)*
