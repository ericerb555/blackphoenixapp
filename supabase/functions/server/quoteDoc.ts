/**
 * The stored shape of a quote — and the whitelist that decides what survives.
 *
 * WHY IT IS A WHITELIST, AND WHY THAT KEEPS COSTING
 *
 * This rebuilds the record field by field, so anything not named here is
 * dropped on the way in, silently. That is a deliberate and good property —
 * a field added to a record later is absent by default rather than stored by
 * default — and it has now cost this project seven separate times. Read the
 * comments below: `workRequestId`, `jobId`, `status`, `signature`,
 * `pricingBasis` and the estimator’s own narrative each went missing the
 * same way, each discovered after a customer or Eric noticed something gone.
 *
 * THE SEVENTH WAS THE MONEY.
 *
 * MEASURED 2026-11-11: not one quote in production carried `overheadAmount`,
 * `profitAmount`, `contingencyAmount` or `preTaxTotal`, although the saved
 * company rates are 15/20/10/20 and `quote-generator.tsx` has stamped all of
 * them through `applyMargins` since 9 October. They were not missing because
 * nothing computed them. They were computed, sent, and dropped here — on the
 * POST that CREATES the quote, which is the only save a generated quote gets
 * before anybody opens it.
 *
 * So every quote this company has sent was priced at cost: no overhead, no
 * profit, no contingency. The line items came back afterwards because the
 * editor saves through index.tsx’s merging PUT handler, which is why the
 * loss was invisible — a quote with lines and subtotals and no margin looks
 * like a quote somebody chose not to mark up.
 *
 * It also explains `total` drifting from `totalCost`: `total` was on this
 * list and `totalCost` was not, so creation kept one and discarded the
 * other, and every later edit wrote the one this file had thrown away.
 *
 * WHY IT LIVES HERE NOW
 *
 * `quotes.tsx` imports `npm:hono@4`, so nothing in it can be loaded by the
 * test runner — the function deciding which parts of a quote are allowed to
 * exist could not be asserted at all. Same move as `quoteMargins`,
 * `invoiceDraft`, `quoteCustomerPrice` and `quoteTotal` before it: pure,
 * dependency-free, and pinned by `tests/quoteDoc.test.ts`.
 *
 * ADDING A FIELD TO A QUOTE? ADD IT HERE TOO, or it will not be there
 * tomorrow.
 */
export function normalizeQuoteDoc(input: any) {
  return {
    id: String(input.id || `Q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`),
    type: input.type === "invoice" ? "invoice" : "estimate",
    number: String(input.number || ""),
    // Embedded client fields (may be empty — an unassigned quote).
    clientName: String(input.clientName || ""),
    clientEmail: String(input.clientEmail || ""),
    clientPhone: String(input.clientPhone || ""),
    clientAddress: String(input.clientAddress || ""),
    // Real link to a CRM customer, if one has been assigned.
    customerId: input.customerId ? String(input.customerId) : "",
    issueDate: String(input.issueDate || ""),
    dueDate: String(input.dueDate || ""),
    items: Array.isArray(input.items) ? input.items : [],
    // Subcontractor quotes folded into this quote — kept on OUR side (internal record).
    subQuotes: Array.isArray(input.subQuotes) ? input.subQuotes : [],
    // Design Studio round-trip: floor plan + design-extracted materials.
    floorPlanData: input.floorPlanData ?? null,
    designMaterials: Array.isArray(input.designMaterials) ? input.designMaterials : [],
    // Buildable plans & renderings (stored in Storage; metadata only here).
    deliverables: Array.isArray(input.deliverables) ? input.deliverables : [],
    notes: String(input.notes || ""),
    taxRate: Number(input.taxRate) || 0,
    /**
     * Where this quote came from.
     *
     * The pipeline has always sent `workRequestId` when it saves a quote, and
     * this function has always dropped it, because it rebuilds the record field
     * by field and that field was never listed. So "this quote came from that
     * request" was recorded nowhere, and every quote in the store has an empty
     * one. Keeping it costs a line.
     */
    workRequestId: input.workRequestId ? String(input.workRequestId) : "",
    /**
     * The job this quote belongs to.
     *
     * Listed here rather than attached afterwards because this function
     * rebuilds the record field by field, so anything not named is dropped on
     * the next save. A `jobId` that survives creation and vanishes on the first
     * edit is worse than never having one — the quote silently detaches from
     * the invoice raised against it.
     */
    jobId: input.jobId ? String(input.jobId) : "",
    /** Also sent by the pipeline and also silently discarded until now. */
    total: Number(input.total) || 0,
    /**
     * `approved` and `rejected` are the customer's decision, written by the
     * public signing route in index.tsx. They were missing from this list, so
     * the first save after an approval — a pipeline update, an edit in the
     * invoice builder — rewrote the quote as a draft and the approval vanished
     * with no error. A customer's signature is not something to lose quietly.
     */
    status: ["draft", "sent", "viewed", "approved", "rejected", "paid"].includes(input.status)
      ? input.status : "draft",
    /** The signature that goes with an approval, preserved for the same reason. */
    signature: input.signature ?? null,

    /**
     * WHAT PRICED THIS QUOTE, AND WHAT THE SERVER SAID ABOUT IT.
     *
     * Listed here for the same reason as `jobId` and `workRequestId` above:
     * this function rebuilds the record field by field, so anything unnamed is
     * dropped on the next save. That matters more than usual for these two,
     * because `send-to-customer` reads `pricingBasis` to decide whether a send
     * needs Eric's explicit acknowledgement. A basis that survived creation
     * and vanished on the first edit would silently switch that gate off, and
     * the quote most likely to be edited before sending is the one somebody is
     * fixing up.
     *
     *   estimator         the model's takeoff, repriced against the catalogue
     *   server-heuristic  the server's deterministic fallback, not repriced
     *   offline-demo      the local demo generator; demo figures
     *
     * Absent is a real and permitted value: every quote saved before this
     * existed has none, and absence means unknown rather than unpriced.
     */
    pricingBasis: ["estimator", "server-heuristic", "offline-demo"].includes(input.pricingBasis)
      ? input.pricingBasis
      : "",
    priceSummary: input.priceSummary ?? null,

    /**
     * What the estimator SAID, as opposed to what it costed.
     *
     * `normalizeDoc` is a whitelist — anything not named here is dropped on
     * the way in, silently — and none of this was named. So the estimator
     * produced a full account of the job and a phase-by-phase plan on every
     * single generate, the editor was handed them in memory, and the moment
     * the quote was saved and reopened they were gone.
     *
     * That is why "the description is not detailed enough" survived a prompt
     * rewrite: the text being judged was from the one place it still existed
     * — a freshly generated quote — and anything reopened had none at all.
     * Two different bugs wearing the same symptom.
     *
     *   aiSummary        the narrative scope, shown as "Scope of Work"
     *   processSteps     the phases, which the editor has always rendered and
     *                    which therefore vanished between sessions
     *   aiAssumptions    already rendered in "How this quote was built"
     *   intake           what it was priced FROM, so a quote reopened
     *                    tomorrow can still be regenerated rather than
     *                    restarted
     */
    /**
     * Notes for the crew, which the customer must never see.
     *
     * "a spot to add notes for my techs that only viewable from my side and
     * can never been seen buy the customer." The "never" is load-bearing and
     * is NOT enforced here — this field is stored like any other. What makes
     * it safe is `customerQuoteView`, the allowlist the share-link route
     * projects through: this field is not on it, so it cannot travel.
     *
     * Stated plainly because the temptation on reading this line is to assume
     * the secrecy lives with the storage. It does not. If anything ever
     * returns a raw quote record to an unauthenticated caller again, this
     * leaks with everything else, which is exactly what happened to the
     * `visible` flag before the projection existed.
     */
    internalNotes: String(input.internalNotes || ""),
    /**
     * Which sections the customer is shown — materials, labour, and the
     * written account of each phase, each switchable on its own.
     *
     * Enforced in `customerQuoteView`, not here: this only records the
     * choice. Every switch defaults ON so an existing quote shows exactly
     * what it always has, and only an explicit `false` withholds anything —
     * a missing or malformed value must never silently hide a customer's
     * line items from them.
     *
     * `lineDetail` was the two-value version of this and is read as a
     * fallback by the projection for quotes saved under it.
     */
    customerSections: {
      materials: input?.customerSections?.materials !== false,
      labor: input?.customerSections?.labor !== false,
      processDetail: input?.customerSections?.processDetail !== false,
    },
    aiSummary: String(input.aiSummary || ""),
    aiAssumptions: Array.isArray(input.aiAssumptions) ? input.aiAssumptions : [],
    aiRegionalNote: String(input.aiRegionalNote || ""),
    aiConfidence: String(input.aiConfidence || ""),
    processSteps: Array.isArray(input.processSteps) ? input.processSteps : [],
    intake: input.intake ?? null,
    /**
     * What the home owner is supplying themselves.
     *
     * THIS WAS BEING THROWN AWAY. The editor had the field, recalculated the
     * total with it, and posted it — and `normalizeDoc` is a whitelist, so
     * the server dropped it on the floor. Reload the quote and the owner's
     * own flooring had vanished and the total had sprung back up by the
     * amount of it. The feature looked finished and persisted nothing.
     *
     * The amount is forced POSITIVE and absolute. Being a credit is the
     * record type, not the sign of a number somebody typed; a negative here
     * would be subtracted twice by anything that already knows these come
     * off the materials figure.
     */
    credits: Array.isArray(input.credits)
      ? input.credits.slice(0, 100).map((credit: any, i: number) => ({
          id: String(credit?.id || `credit-${i + 1}`).slice(0, 120),
          description: String(credit?.description || '').slice(0, 300),
          amount: Math.abs(Number(credit?.amount)) || 0,
          reason: String(credit?.reason || '').slice(0, 500),
          // Absent means included; only an explicit false takes it off.
          ...(credit?.included === false ? { included: false } : {}),
        }))
      : [],
    creditsSubtotal: Math.abs(Number(input.creditsSubtotal)) || 0,
    /**
     * The payment schedule: the deposit and the per-phase draws this job is
     * billed in. Invoices are raised against these, so this is the record of
     * what the customer agreed to pay and when.
     *
     * STORED, NOT RECOMPUTED. The schedule is generated from the quote's
     * phases, but once it has gone to a customer it is a commitment and must
     * not drift because somebody later edited a line item. A regenerate is an
     * explicit action in the editor, not a side effect of saving.
     *
     * Every field is coerced rather than trusted. An administrator may legit-
     * imately set any amount here — it is their contract — but a malformed
     * draw that reaches the invoice builder as a string or a NaN turns into
     * an invoice for "$NaN", and that is a document somebody sends.
     *
     * `status` is clamped to the three it can be, so a client cannot invent
     * a state the schedule panel has no rendering for.
     */
    paymentSchedule: Array.isArray(input.paymentSchedule)
      ? input.paymentSchedule.slice(0, 60).map((draw: any, i: number) => ({
          id: String(draw?.id || `draw-${i + 1}`).slice(0, 120),
          type: ['deposit', 'phase', 'balance'].includes(String(draw?.type))
            ? String(draw.type)
            : 'phase',
          phase: draw?.phase == null ? null : String(draw.phase).slice(0, 200),
          label: String(draw?.label || '').slice(0, 200),
          amount: Number.isFinite(Number(draw?.amount)) ? Number(draw.amount) : 0,
          phaseValue: Number.isFinite(Number(draw?.phaseValue)) ? Number(draw.phaseValue) : undefined,
          depositCredit: Number.isFinite(Number(draw?.depositCredit)) ? Number(draw.depositCredit) : undefined,
          trigger: String(draw?.trigger || '').slice(0, 300),
          status: ['pending', 'invoiced', 'paid'].includes(String(draw?.status))
            ? String(draw.status)
            : 'pending',
          invoiceId: draw?.invoiceId ? String(draw.invoiceId).slice(0, 120) : undefined,
        }))
      : [],

    /**
     * That somebody chose to send this knowing it was not priced from real
     * figures.
     *
     * Always null here, and restored from the STORED record by the caller
     * below. `normalizeDoc` is handed `{...existing, ...input}`, so a value
     * read off its argument could have come from the request body — and this
     * field is the record of a decision an administrator made, which a client
     * must never be able to assert for itself. Written only by
     * `send-to-customer`.
     */
    unpricedSendAcknowledged: null as null | { by: string; at: string; basis: string },

    /**
     * THE LINE ITEMS AND WHAT THEY COME TO.
     *
     * None of this was named, so the POST that creates a quote stored it
     * without its materials, its labour, any subtotal, the tax or the total.
     * The editor’s first save put the lines back through a different route,
     * which is the only reason the loss was survivable and the only reason
     * nobody saw it.
     */
    materials: Array.isArray(input.materials) ? input.materials : [],
    labor: Array.isArray(input.labor) ? input.labor : [],
    additionalCosts: Array.isArray(input.additionalCosts) ? input.additionalCosts : [],
    materialsSubtotal: Number(input.materialsSubtotal) || 0,
    laborSubtotal: Number(input.laborSubtotal) || 0,
    additionalCostsSubtotal: Number(input.additionalCostsSubtotal) || 0,
    taxAmount: Number(input.taxAmount) || 0,
    /**
     * `totalCost` is the maintained total — the one the editor recomputes on
     * every edit and the one `quoteTotal` believes first. `total` above is
     * the legacy spelling, and it was the only one of the two this list kept.
     */
    totalCost: Number(input.totalCost) || 0,

    /**
     * THE MARGIN. The reason the company was quoting at cost.
     *
     * Percentages and amounts both, because they answer different questions
     * and the second cannot always be recovered from the first: the PDF’s
     * per-phase markup reads the percents, "How this quote was built" reads
     * the amounts, and `quoteCustomerPrice` spreads the markup into what the
     * customer is shown using the rates. A quote that kept the amounts and
     * lost the rates would show a price nothing on the page could explain.
     *
     * ABSENT STAYS ABSENT — zero, not a default. `applyMargins` defaults a
     * missing rate to 10/10/5 when it PRICES a job, which is a decision made
     * once at pricing time. Reinstating it here would invent margin on a
     * hand-built quote that never had any, every time it was saved.
     */
    directCost: Number(input.directCost) || 0,
    overheadPercent: Number(input.overheadPercent) || 0,
    overheadAmount: Number(input.overheadAmount) || 0,
    profitPercent: Number(input.profitPercent) || 0,
    profitAmount: Number(input.profitAmount) || 0,
    contingencyPercent: Number(input.contingencyPercent) || 0,
    contingencyAmount: Number(input.contingencyAmount) || 0,
    preTaxTotal: Number(input.preTaxTotal) || 0,

    /**
     * What the customer signed for, stamped by the signing route.
     *
     * Named here for the same reason as `signature` above: a save after an
     * approval would otherwise drop the agreed price and the discount that
     * produced it, and every invoice raised afterwards would quietly go back
     * to the list price.
     */
    agreedTotal: Number(input.agreedTotal) || 0,
    agreedAt: String(input.agreedAt || ""),
    agreedDiscount: input.agreedDiscount ?? null,
    createdAt: String(input.createdAt || new Date().toISOString()),
    updatedAt: new Date().toISOString(),
  };
}
