/**
 * Turning a work request into the pipeline item staff actually work from.
 *
 * WHY THIS IS A FILE AND NOT A COMPONENT
 *
 * This ran in the browser. `AdminAlertsPanel.openInPipeline` fetched the work
 * request, called the quote draft, assembled the item and wrote
 * `pipeline_{id}` itself — so the handoff happened only if somebody clicked an
 * alert, only on the device they clicked it on, and the record the business
 * works from was assembled by a page. `index.tsx:4619` records that a
 * server-side handoff used to exist and was removed.
 *
 * Eric, 2026-11-20, after a real customer filed a deck rebuild: "the work
 * request did not automativally generate a quote and when i go into the
 * project details i donthave an option to generate it myself".
 *
 * Both of those are the same missing thing: one place, reachable by a route,
 * that takes a work request and produces the item. A button can call it, the
 * alert panel can call it, and intake can call it automatically — without
 * three ideas about what a pipeline item looks like.
 *
 * This half is pure so it can be asserted in a test. The kv writes live in the
 * route.
 */

/** The field spellings a work request arrives with, in one place. */
function pick(record: any, ...names: string[]): string {
  for (const name of names) {
    const v = record?.[name];
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return "";
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * `WR-20261110-1815`, the shape already in production.
 *
 * Derived from the request's own date and id rather than from the clock, so
 * regenerating an item does not renumber it.
 */
export function itemNumberFor(record: any): string {
  const created = pick(record, "created_at", "createdAt") || new Date().toISOString();
  const day = created.slice(0, 10).replace(/-/g, "");
  const id = pick(record, "id");
  // The last four digits of the id, which is a timestamp in every shape we
  // store, so it is stable and distinct within a day.
  const digits = id.replace(/\D/g, "");
  const tail = digits.slice(-4) || "0000";
  return `WR-${day || "00000000"}-${tail}`;
}

/**
 * The draft quote, in the shape the quote editor reads.
 *
 * NO QUOTE NUMBER IS MINTED HERE, deliberately. `mintQuoteNumber` in
 * `quotes.tsx` claims a sequential `Q-2026-NNNN` against a unique index, and
 * burning one on a draft that may never be sent leaves a hole in the series
 * that looks like a deleted quote. The browser version invented
 * `Q-${year}-001` instead, which is worse: it is the same wrong number on
 * every draft.
 *
 * So `quoteNumber` gets the estimator's own non-sequential form — the same
 * `QT-<date>-<rand>` already on live quotes — and `number` stays absent until
 * the quote is really created.
 */
export function draftQuoteFrom(draft: any, workRequestId: string, now: string): any {
  const q = draft?.quote || {};
  const day = now.slice(0, 10).replace(/-/g, "");
  return {
    id: `qt-${workRequestId}`,
    quoteNumber: `QT-${day}-${String(workRequestId).replace(/\D/g, "").slice(-4) || "0000"}`,
    materials: Array.isArray(q.materialItems) ? q.materialItems : [],
    labor: Array.isArray(q.laborItems) ? q.laborItems : [],
    processSteps: Array.isArray(q.processSteps) ? q.processSteps : [],
    additionalCosts: Array.isArray(q.additionalCosts) ? q.additionalCosts : [],
    materialsSubtotal: num(q.subtotals?.materials),
    laborSubtotal: num(q.subtotals?.labor),
    taxAmount: num(q.subtotals?.tax),
    /*
     * The rate is NOT assumed. The browser copy hard-coded 0.08, which then
     * rode into the editor as though somebody had chosen it — and
     * `customerPricingOf` now treats a recorded rate as a decision. An absent
     * rate goes on being absent, and the estimator's own figure is used when
     * it has one.
     */
    taxRate: q.taxRate === null || q.taxRate === undefined ? undefined : num(q.taxRate),
    totalCost: num(q.total),
    total: num(q.total),
    pricingBasis: "estimator",
    priceSummary: draft?.priceSummary ?? null,
    aiConfidence: draft?.confidence ?? null,
    aiAssumptions: draft?.assumptions ?? null,
    generatedAt: draft?.generatedAt || now,
    approvalStatus: "pending",
    status: "draft",
    workRequestId,
  };
}

/**
 * The pipeline item, built from the request and whatever draft we have.
 *
 * `existing` is merged UNDER the new values for the fields this derives and
 * kept for everything else, so regenerating a quote on an item somebody has
 * already moved does not drag it back to `quote-draft` or lose their edits.
 */
export function pipelineItemFrom(
  workRequest: any,
  draft: any | null,
  existing: any | null,
  now: string,
): any {
  const customerName = pick(workRequest, "client_name", "clientName", "customer_name", "customerName") || "Customer";
  const serviceType = pick(workRequest, "serviceType", "service_type", "project_type") || "General Service";
  const title = pick(workRequest, "project_name", "projectName", "title")
    || `${serviceType} — ${customerName}`;

  const quote = draft ? draftQuoteFrom(draft, String(workRequest?.id || ""), now) : (existing?.quote ?? undefined);

  const estimatedValue = num(quote?.totalCost)
    || num(workRequest?.budget_range?.max)
    || num(workRequest?.budget_range?.min)
    || num(existing?.estimatedValue);

  return {
    ...(existing || {}),
    id: String(workRequest?.id || existing?.id || ""),
    itemNumber: existing?.itemNumber || itemNumberFor(workRequest),
    // A stage somebody has already advanced is theirs to keep.
    stage: existing?.stage || "quote-draft",
    customerName,
    customerEmail: pick(workRequest, "client_email", "clientEmail", "email"),
    customerPhone: pick(workRequest, "client_phone", "clientPhone", "phone"),
    serviceType,
    title,
    description: pick(workRequest, "description") || existing?.description || "",
    location: pick(workRequest, "site_address", "siteAddress", "address", "city") || existing?.location || "",
    estimatedValue,
    priority: pick(workRequest, "priority_level", "priority") === "urgent" ? "high" : (existing?.priority || "medium"),
    jobId: pick(workRequest, "jobId", "job_id") || existing?.jobId || "",
    workRequestId: String(workRequest?.id || ""),
    createdDate: existing?.createdDate || pick(workRequest, "created_at", "createdAt") || now,
    createdAt: existing?.createdAt || pick(workRequest, "created_at", "createdAt") || now,
    lastModified: now,
    updatedAt: now,
    ...(quote ? { quote } : {}),
  };
}
