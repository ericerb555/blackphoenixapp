/**
 * What a customer holding a share link is allowed to see of a quote.
 *
 * WHY THIS EXISTS
 *
 * `/quotes/by-token/:token` answered with `quoteData: stripBase64(quote)` —
 * the entire stored record. `stripBase64` removes image blobs and nothing
 * else, so everything else on the quote went to anybody holding the link:
 * the repricing summary, what subcontractors quoted, the estimator's context,
 * the intake, and every line item including the ones marked not visible.
 *
 * `visible: false` has existed on materials, labour and process steps for a
 * while and was therefore decorative: the editor stopped drawing the line,
 * and the line was still in the JSON the customer's browser had already been
 * sent. One devtools tab away.
 *
 * The rule this answers is recorded in `customers-never-see-our-discounted-
 * pricing`, and it is unusually explicit about the mechanism:
 *
 *   "Filtering a discounted price out in the browser is not enough, because
 *    the figure has already been sent; the decision about which price a
 *    caller may see belongs on the server, in the route that assembles the
 *    response, keyed on who is asking. A hidden field is not a check."
 *
 * AN ALLOWLIST, NOT A DENYLIST
 *
 * This builds the customer's quote field by field from what the customer view
 * actually reads. A denylist — strip `priceSummary`, strip `subQuotes` — is
 * one forgotten field away from a leak every time somebody adds something to
 * the record, and the leak is silent. With an allowlist the failure mode of
 * forgetting is a missing field on the customer's screen, which somebody
 * notices, rather than a disclosed margin, which nobody does.
 *
 * HIDDEN LINES KEEP THEIR COST
 *
 * Eric's choice, asked explicitly: hiding a line removes the DETAIL, not the
 * money. So the stored totals are passed through untouched and the hidden
 * lines are simply absent from the arrays. The visible lines will not sum to
 * the total, and that is intended — it is how a contractor avoids itemising
 * every dump run without giving the work away.
 *
 * Subtotals are passed through for the same reason. Recomputing them from the
 * visible lines would quietly contradict the total and make the quote look
 * wrong rather than summarised.
 */

/** A line the customer may see. Anything not named here does not travel. */
export interface CustomerMaterial {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  category: string;
}

export interface CustomerLabor {
  id: string;
  role: string;
  description: string;
  hours: number;
  hourlyRate: number;
  totalCost: number;
}

export interface CustomerProcessStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  estimatedDuration: string;
}

export interface CustomerQuote {
  id: string;
  quoteNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  projectTitle: string;
  projectDescription: string;
  address: string;
  materials: CustomerMaterial[];
  labor: CustomerLabor[];
  processSteps: CustomerProcessStep[];
  materialsSubtotal: number;
  laborSubtotal: number;
  taxRate: number;
  taxAmount: number;
  totalCost: number;
  generatedAt: string;
  validUntil: string;
  notes: string;
  scopeOfWork: string;
}

const str = (v: any) => (v === null || v === undefined ? '' : String(v));
const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * Hidden means hidden; absent means shown.
 *
 * `visible` is optional and most existing lines do not carry it. Treating a
 * missing flag as hidden would blank every quote raised before the field
 * existed, so only an explicit `false` hides a line. The flag is the
 * exception, not the default.
 */
const isVisible = (line: any) => line?.visible !== false;

export function customerQuoteView(quote: any): CustomerQuote {
  const materials = (Array.isArray(quote?.materials) ? quote.materials : [])
    .filter(isVisible)
    .map((m: any): CustomerMaterial => ({
      id: str(m?.id),
      name: str(m?.name),
      description: str(m?.description),
      quantity: num(m?.quantity),
      unit: str(m?.unit),
      unitCost: num(m?.unitCost),
      totalCost: num(m?.totalCost),
      category: str(m?.category),
    }));

  const labor = (Array.isArray(quote?.labor) ? quote.labor : [])
    .filter(isVisible)
    .map((l: any): CustomerLabor => ({
      id: str(l?.id),
      role: str(l?.role),
      description: str(l?.description),
      hours: num(l?.hours),
      hourlyRate: num(l?.hourlyRate),
      totalCost: num(l?.totalCost),
    }));

  const processSteps = (Array.isArray(quote?.processSteps) ? quote.processSteps : [])
    .filter(isVisible)
    .map((s: any, i: number): CustomerProcessStep => ({
      id: str(s?.id),
      // Renumbered over the VISIBLE steps. Passing the stored stepNumber
      // through would leave a customer reading "1, 2, 4" and asking what
      // happened to 3 — which is the one question hiding it was meant to
      // avoid raising.
      stepNumber: i + 1,
      title: str(s?.title || s?.step),
      description: str(s?.description),
      estimatedDuration: str(s?.estimatedDuration),
    }));

  return {
    id: str(quote?.id),
    quoteNumber: str(quote?.quoteNumber || quote?.number),
    customerName: str(quote?.customerName || quote?.clientName),
    customerEmail: str(quote?.customerEmail || quote?.clientEmail),
    customerPhone: str(quote?.customerPhone || quote?.clientPhone),
    projectTitle: str(quote?.projectTitle || quote?.title),
    projectDescription: str(quote?.projectDescription),
    address: str(quote?.address || quote?.clientAddress),
    materials,
    labor,
    processSteps,
    // Passed through, never recomputed — see the note at the top.
    materialsSubtotal: num(quote?.materialsSubtotal),
    laborSubtotal: num(quote?.laborSubtotal),
    taxRate: num(quote?.taxRate),
    taxAmount: num(quote?.taxAmount),
    totalCost: num(quote?.totalCost || quote?.total),
    generatedAt: str(quote?.generatedAt || quote?.createdAt),
    validUntil: str(quote?.validUntil || quote?.dueDate),
    notes: str(quote?.notes),
    /**
     * The estimator's narrative. Customer-facing by design — it is the part
     * written for them — and distinct from `internalNotes`, which is written
     * about them and never leaves this building.
     */
    scopeOfWork: str(quote?.aiSummary),
  };
}
