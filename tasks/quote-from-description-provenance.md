# A description-built quote must say where its numbers came from

## What prompted this

Eric asked whether he can get a quote by writing up a description. He can —
**Create Quote** on the Command Center opens `StartQuoteModal`, which takes a
free-text description and runs the estimator. Looking at how trustworthy the
result is turned up two faults.

## Fault 1 — an offline quote is indistinguishable from a real one

`StartQuoteModal` calls `/auto-generate-quote`. If that call throws OR returns
non-OK, it falls back to `generateDemoQuote` — a local demo generator — and
still produces a complete, itemised, sendable-looking quote which it saves to
the pipeline and the quotes list.

The only thing that ever says so is a transient toast reading "Estimate ready
(offline mode)". Nothing is persisted: the stored quote carries no field
distinguishing a real estimate from demo figures, so once the toast fades the
two are identical on every screen that shows them. Miss the toast and demo
numbers can be sent to a customer.

## Fault 2 — the honest note is produced and thrown away

This one is better and worse than I first thought.

I first read `quote-generator.tsx` and concluded material prices come from the
model rather than the catalogue. **That was wrong**: the `quoteRouter` in that
file is never mounted — only `runEstimator` is imported from it. The live route
is `index.tsx:4084`, and it does reprice through `estimateForWorkRequest` →
`repriceEstimate`, which replaces the model's prices with the vendor
catalogue's, labour rates with the company's, and marks every line `catalogue`,
`your-rate` or `estimated`. It then writes a carefully worded `summary.note`
that never overclaims, and the route returns it as `priceSummary`.

`StartQuoteModal` does not read that field. It keeps `confidence`,
`projectSummary`, `assumptions` and `regionalNote`, and drops `priceSummary` on
the floor. `WorkRequestQuoteDraft` declares it in its props and renders it
nowhere. So the one sentence that tells the truth about a quote's figures
reaches no screen.

That matters most right now because of what production holds:

    vendor_catalog items        0
    vendors                     0
    labor_rates:global          absent
    pricing_config:global       absent
    labor_tasks:trade_factors   absent

With nothing stored, every material line falls back to the model's price, every
labour line to a standard trade rate, and nothing corrects the hours. The
repricer knows this and says so — `"…none of it is your own figures yet. Save
your rates and vendor prices to make this quote yours."` — and that sentence is
exactly what is being discarded. The code is right and the data is absent, and
the screen hides both.

## Plan

- [x] 1. Record the pricing basis on the quote: `estimator` or `offline-demo`,
      persisted with the quote rather than living only in a toast.
- [x] 2. Carry `priceSummary` through from the response onto the quote.
- [x] 3. Show both when the editor opens — a warning for an offline quote, and
      the server's own note otherwise. Never write a reassuring sentence of my
      own: the server already words this honestly, so render its words.
- [x] 4. Render the note in `WorkRequestQuoteDraft`, where the field already
      arrives and is already declared.
- [x] 5. Typecheck both halves, smoke, commit, push.

## Scope

Two frontend components. No change to the estimator, the repricer or any
pricing figure — the numbers are not touched, only what the screen admits about
them. No schema change.

## Deliberately not done

**Blocking send for an offline quote.** An offline-mode quote can still be sent
after this change; it just says plainly what it is. Refusing to send is a
bigger change into `QuoteToContractEditor`'s send path, and a client-side
refusal would not be an enforcement anyway — the server would have to reject
it. Worth doing, needs its own decision.

## Review

Three files touched, plus fixtures. No pricing figure changed — the numbers are
untouched; only what the screen admits about them.

**`QuotePricingBasisBanner.tsx` (new).** A fixed strip above the quote editor
saying which of three engines priced the quote. It renders `priceSummary.note`
**as written** rather than paraphrasing it: the server already words this
carefully, and a second wording of the same truth would mean the one on screen
is the one nobody maintains. Padding is inline, because `p-*` computes to 0px
application-wide and that is a decision rather than a bug.

**`StartQuoteModal.tsx`.** Carries `priceSummary` through instead of dropping
it, and records `pricingBasis` on the quote so the basis is persisted with the
record rather than living in a toast.

The basis is **not** derived from `usedAI`, which was the trap here.
`runEstimator` answers `usedAI: false` both when the model is unavailable — and
it falls back to `heuristicEstimate`, the server's own deterministic estimate —
and never when the local demo generator runs, because that happens in the
browser after the fetch fails. Deriving the basis from `usedAI` would have
labelled a legitimate server estimate as demo figures. So a separate
`fromServer` flag is set where the response is actually accepted, giving three
honest values: `estimator`, `server-heuristic`, `offline-demo`.

The offline-demo toast is also no longer a success toast. It is a warning that
says "Demo figures" and "Do not send this to a customer before repricing it".

**`WorkRequestQuoteDraft.tsx`.** Renders the note in place of its generic
"real prices where we have them" line, keeping the generic line only for when
repricing failed and no note was sent. The field was already declared here and
already arriving from `/quote-draft/:id`; it was rendered nowhere.

### Verified by rendering it, not by inference

Five fixtures added to `smokeModals.tsx`, each carrying the basis and nothing
else — a quote whose repricing failed has a basis and a null summary, and
reading `.note` off that is exactly the shape of failure the harness exists to
catch. Driven in a real browser via `?only=`:

    quote-basis-demo       "Demo figures — not priced from your catalogue or rates"
    quote-basis-heuristic  "Built by the fallback estimator"
    quote-basis-no-note    "…not repriced…, so its prices are the estimator's own."
    quote-basis-estimator  the server's own sentence, verbatim
    quote-basis-legacy     renders nothing

Typecheck app 316 / server 87, unchanged. Smoke 357 rendered (352 before, plus
the five fixtures), 0 threw.

### The thing this exposes rather than fixes

Production holds no vendor catalogue, no saved labour rates, no pricing config
and no trade factors. The repricer is wired correctly and has nothing to work
with, so every quote is currently priced from standard trade rates and the
model's own material prices. That was true before this change and invisible;
it is now stated on the quote in the server's own words. Filling those in is
what moves a quote from defensible to Eric's own figures, and it is data entry
rather than code.
