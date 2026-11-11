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
  /**
   * What this phase costs, present only when the quote is set to show phase
   * totals instead of the line breakdown. Undefined in `full` mode, where the
   * customer can add the lines up themselves.
   */
  cost?: number;
}

/**
 * Something the home owner is supplying themselves.
 *
 * ALWAYS SENT, never gated behind a section switch. The visibility controls
 * exist to stop a customer working backwards to our rates and our margin;
 * this is the opposite — it is money coming OFF their bill for something
 * they are providing. Withholding it would mean a customer seeing a
 * deduction in the total with nothing on the page explaining it, which is
 * the one thing guaranteed to generate a phone call.
 */
export interface CustomerCredit {
  description: string;
  amount: number;
  note: string;
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
  /** What the home owner is supplying. Deducted from the materials figure. */
  credits: CustomerCredit[];
  creditsSubtotal: number;
  /** Materials at the customer's price — markup spread in, tax not. */
  materialsSubtotal: number;
  /** Labour at the customer's price. */
  laborSubtotal: number;
  /** Soft costs — permits, skips, plant hire — at the customer's price. */
  otherCostsSubtotal: number;
  taxRate: number;
  taxAmount: number;
  totalCost: number;
  generatedAt: string;
  validUntil: string;
  notes: string;
  scopeOfWork: string;
}

import {
  customerPricingOf, preTaxTotalOf, allocate, atCustomerPrice, spreadCustomerPrices,
} from "./quoteCustomerPrice.ts";

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

/**
 * Is this line on the quote at all?
 *
 * A DIFFERENT QUESTION FROM `isVisible`, and the difference is money.
 * Hidden means charged but not itemised; excluded means not charged. An
 * excluded line is filtered before anything else and never travels, because
 * it is not part of the job the customer is being quoted for.
 *
 * Absent means included, so no quote written before this field changes.
 */
const isIncluded = (line: any) => line?.included !== false;

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Which sections of the quote the customer is shown.
 *
 * Eric: "i want to be able to view whatever i want on the quote and invoice
 * if i want see material, labor and process detail." Three independent
 * switches rather than one all-or-nothing setting, because the useful
 * combinations are not on a single axis — showing the materials while hiding
 * the labour rate is a normal thing to want, and so is a quote that is
 * nothing but phases and prices.
 *
 * Phase totals are NOT one of the switches. They are the structure the quote
 * hangs on; turning everything off leaves the phases and what each costs,
 * which is the minimum a customer can be asked to agree to.
 *
 * Every switch defaults ON, so existing quotes show exactly what they always
 * have. Hiding is an act, not a state somebody drifts into.
 */
export interface CustomerSections {
  materials: boolean;
  labor: boolean;
  /** The written account of each phase, as opposed to just its name. */
  processDetail: boolean;
}

/**
 * How much of a section the customer gets.
 *
 * "even if i dont want the material and labor rates on the quote i want to
 * see the line item and the entire process details." The switch was a
 * boolean — every line with its rate, or no lines — and the useful middle
 * state had no way to be expressed.
 *
 *   full      the line, its quantity, its rate, its amount
 *   no-rates  the line and its amount, with NO quantity and NO rate sent
 *   off       the section is not sent at all
 */
export type SectionMode = 'full' | 'no-rates' | 'off';

const modeOf = (value: unknown): SectionMode => {
  if (value === false || value === 'off') return 'off';
  if (value === 'no-rates') return 'no-rates';
  return 'full';
};

const sectionModes = (quote: any): { materials: SectionMode; labor: SectionMode } => {
  const s = quote?.customerSections;
  if (!s && String(quote?.lineDetail || '').trim() === 'phase-totals') {
    return { materials: 'off', labor: 'off' };
  }
  return { materials: modeOf(s?.materials), labor: modeOf(s?.labor) };
};

const sectionsOf = (quote: any): CustomerSections => {
  const s = quote?.customerSections;
  /**
   * Backwards compatibility with the two-value `lineDetail` this replaced.
   * A quote saved as 'phase-totals' meant "no lines at all", which is both
   * line switches off with the phase text left alone.
   */
  if (!s && String(quote?.lineDetail || '').trim() === 'phase-totals') {
    return { materials: false, labor: false, processDetail: true };
  }
  const m = sectionModes(quote);
  return {
    // 'no-rates' is still SHOWN — just without its figures. See the mapper
    // below, which is where the figures are actually withheld.
    materials: m.materials !== 'off',
    labor: m.labor !== 'off',
    processDetail: s?.processDetail !== false,
  };
};

/**
 * What each phase costs, from the lines assigned to it.
 *
 * Counts every INCLUDED line, visible or not, and that distinction is the
 * one subtlety worth stating twice. A line marked `visible: false` is still
 * charged — hiding removes the detail, not the money — so its cost belongs
 * in its phase's total even though the line itself never travels. That is
 * exactly what makes phase totals safe to show when the lines are not.
 *
 * A line marked `included: false` is NOT charged, so its cost must not be
 * here. Treating the two the same way would bill the customer for work
 * somebody had explicitly taken off the quote, in a figure they cannot
 * itemise and therefore cannot dispute.
 */
function phaseCosts(quote: any): Map<string, number> {
  const totals = new Map<string, number>();
  const add = (phase: any, amount: number) => {
    const key = String(phase || '').trim();
    if (!key) return;
    totals.set(key, round2((totals.get(key) || 0) + amount));
  };
  for (const m of Array.isArray(quote?.materials) ? quote.materials : []) {
    if (isIncluded(m)) add(m?.phase, Number(m?.totalCost) || 0);
  }
  for (const l of Array.isArray(quote?.labor) ? quote.labor : []) {
    if (isIncluded(l)) add(l?.phase, Number(l?.totalCost) || 0);
  }
  return totals;
}

export function customerQuoteView(quote: any): CustomerQuote {
  const sections = sectionsOf(quote);
  const modes = sectionModes(quote);
  /**
   * Phase costs are emitted whenever either line section is held back.
   *
   * With both showing, the customer can add the lines up and a phase total
   * would just be a second copy of the same number. With either hidden the
   * total is the only thing standing between them and a price they cannot
   * see the basis for — so it appears.
   */
  const needPhaseCosts = modes.materials !== 'full' || modes.labor !== 'full';
  const costs = needPhaseCosts ? phaseCosts(quote) : null;
  /**
   * WITHHELD MEANS NOT SENT, NOT "SENT AND NOT DRAWN".
   *
   * In 'no-rates' the quantity, the unit and the unit cost are ZERO in the
   * payload — the customer's browser never receives them, so there is
   * nothing in a devtools tab, a saved copy of the page or a future
   * renderer to find. Emitting the real figures with a flag saying "do not
   * display these" is exactly the mistake the `visible` checkbox made for
   * months, and it is why a labour rate was one keystroke from being
   * public.
   *
   * `totalCost` still travels, because what a line COSTS is the thing
   * being shown. One number cannot be divided into an hourly rate.
   */
  /**
   * EVERY FIGURE BELOW IS A PRICE, NOT A COST.
   *
   * The stored line carries what the work costs us; overhead, profit and
   * contingency sit on top of the whole job and land only in `totalCost`.
   * Sending the costs down and the total with the markup in it is what made
   * a customer's quote fail to add up — the lines came to about 80% of the
   * figure at the bottom and nothing on the page accounted for the rest.
   *
   * `quoteCustomerPrice` spreads the markup back across the lines it came
   * from, so what travels is what the customer pays for each part of the
   * job. Allocation rather than multiplication: the lines are made to sum to
   * their section, the sections to the quote's own `preTaxTotal`, and that
   * plus tax less credits IS `totalCost`. Every sum on the page comes out.
   *
   * A quote with no margin on it is unchanged, to the penny.
   */
  const pricing = customerPricingOf(quote);

  /**
   * Priced across the INCLUDED lines, drawn for the VISIBLE ones.
   *
   * The hidden line is charged for — hiding removes the detail, not the
   * money — so it has to take its share of the markup here, or the share
   * belonging to it would be redistributed onto the lines the customer can
   * see and inflate every one of them.
   */
  const includedMaterials = (Array.isArray(quote?.materials) ? quote.materials : []).filter(isIncluded);
  const includedLaborLines = (Array.isArray(quote?.labor) ? quote.labor : []).filter(isIncluded);

  /**
   * The stored subtotal first, the lines when there is none.
   *
   * A record written by the estimator carries both; one assembled by hand,
   * and every fixture in the tests, carries lines alone. Reading only the
   * stored figure priced those quotes at nothing — a column of noughts under
   * a real total, which is a worse answer than the one being fixed.
   */
  const sumOf = (lines: any[], field: string) =>
    round2(lines.reduce((sum: number, l: any) => sum + num(l?.[field]), 0));
  const materialsCost = num(quote?.materialsSubtotal) || sumOf(includedMaterials, 'totalCost');
  const laborCost = num(quote?.laborSubtotal) || sumOf(includedLaborLines, 'totalCost');
  const otherCost = num(quote?.additionalCostsSubtotal)
    || sumOf((Array.isArray(quote?.additionalCosts) ? quote.additionalCosts : []).filter(isIncluded), 'amount');
  const directCost = round2(materialsCost + laborCost + otherCost);

  /**
   * The quote's own pre-tax total when it has one, because that is the
   * figure `totalCost` was built from and the only one guaranteed to close
   * the arithmetic. Falling back to direct cost times the rates covers the
   * records that predate `applyMargins`; falling back to direct cost itself
   * covers a quote with no margin, which must come through unchanged.
   */
  const storedPreTax = preTaxTotalOf({ ...quote, directCost }, pricing);
  const preTax = storedPreTax > 0 ? storedPreTax : directCost;

  const [pricedMaterials, pricedLabor, pricedOther] = directCost > 0
    ? allocate([materialsCost, laborCost, otherCost], preTax)
    : [materialsCost, laborCost, otherCost];

  /**
   * Scaled by the markup, NOT allocated to the section subtotal.
   *
   * Allocating would force the lines to sum to `pricedMaterials` — right
   * when the stored subtotal is the sum of these lines, and badly wrong when
   * it is not. A record whose subtotal counts something the line list does
   * not would see every line inflated to close the gap, turning a bookkeeping
   * discrepancy into a dozen wrong prices on the customer's copy. Scaling
   * carries each line's own share of the markup and nothing else.
   */
  const materialPrices = spreadCustomerPrices(includedMaterials.map((m: any) => num(m?.totalCost)), pricing);

  const materials = includedMaterials
    .map((m: any, i: number) => ({ line: m, price: materialPrices[i] ?? 0 }))
    .filter(({ line }: any) => isVisible(line))
    .map(({ line: m, price }: any): CustomerMaterial => {
      const quantity = modes.materials === 'full' ? num(m?.quantity) : 0;
      return {
        id: str(m?.id),
        name: str(m?.name),
        description: str(m?.description),
        quantity,
        unit: modes.materials === 'full' ? str(m?.unit) : '',
        /**
         * Back out of the priced line rather than scaled on its own, so
         * quantity x unit price lands on the amount beside it. Scaling the
         * stored unit cost separately rounds twice and leaves a line whose
         * own three numbers do not multiply — the same complaint as the
         * total, one row further down.
         */
        unitCost: quantity > 0 ? round2(price / quantity) : 0,
        totalCost: price,
        category: str(m?.category),
      };
    });

  const laborPrices = spreadCustomerPrices(includedLaborLines.map((l: any) => num(l?.totalCost)), pricing);

  const labor = includedLaborLines
    .map((l: any, i: number) => ({ line: l, price: laborPrices[i] ?? 0 }))
    .filter(({ line }: any) => isVisible(line))
    .map(({ line: l, price }: any): CustomerLabor => {
      // Hours and the rate are the two numbers that reveal pricing, and
      // either one alone is enough with the total beside it. Both go.
      const hours = modes.labor === 'full' ? num(l?.hours) : 0;
      return {
        id: str(l?.id),
        role: str(l?.role),
        description: str(l?.description),
        hours,
        /**
         * The CHARGE-OUT rate, which is what an hour of this trade costs the
         * customer. The stored `hourlyRate` is what it costs us to put
         * somebody there, and sending that out both understated the line and
         * handed over our cost base — the thing the 'no-rates' mode exists
         * to withhold. Derived from the priced line so hours x rate is the
         * amount printed next to it.
         */
        hourlyRate: hours > 0 ? round2(price / hours) : 0,
        totalCost: price,
      };
    });

  const processSteps = (Array.isArray(quote?.processSteps) ? quote.processSteps : [])
    .filter(isIncluded).filter(isVisible)
    .map((s: any, i: number): CustomerProcessStep => {
      const title = str(s?.title || s?.step);
      const step: CustomerProcessStep = {
        id: str(s?.id),
        // Renumbered over the VISIBLE steps. Passing the stored stepNumber
        // through would leave a customer reading "1, 2, 4" and asking what
        // happened to 3 — which is the one question hiding it was meant to
        // avoid raising.
        stepNumber: i + 1,
        title,
        /**
         * The phase NAME always travels; only the written account of it is
         * switchable. A customer has to know the job has a framing stage
         * costing £3,900 — that is what they are agreeing to. Whether they
         * get the paragraph about dust and water being off is a choice.
         */
        description: sections.processDetail ? str(s?.description) : '',
        estimatedDuration: str(s?.estimatedDuration),
      };
      // Priced like everything else on this document. A phase total at cost,
      // under a grand total carrying the markup, is the same arithmetic hole
      // one level down — and this figure is the ONLY one a customer gets when
      // the lines are withheld.
      if (costs) step.cost = atCustomerPrice(costs.get(title) ?? 0, pricing);
      return step;
    });

  return {
    id: str(quote?.id),
    quoteNumber: str(quote?.quoteNumber || quote?.number),
    customerName: str(quote?.customerName || quote?.clientName),
    customerEmail: str(quote?.customerEmail || quote?.clientEmail),
    customerPhone: str(quote?.customerPhone || quote?.clientPhone),
    projectTitle: str(quote?.projectTitle || quote?.title),
    projectDescription: str(quote?.projectDescription),
    address: str(quote?.address || quote?.clientAddress),
    /**
     * In `phase-totals` mode the breakdown is NOT SENT, not merely unrendered.
     *
     * The customer gets the phases and what each costs, and there is nothing
     * underneath for a devtools tab, a saved copy of the page, or a future
     * renderer to find. Emitting the lines with a flag saying "do not draw
     * these" is precisely the mistake the `visible` checkbox made for months,
     * and it is the reason a labour rate was one keystroke from being public.
     *
     * The totals below are untouched either way, so the quote still adds up —
     * the customer simply cannot work backwards from it to our rates.
     */
    materials: sections.materials ? materials : [],
    labor: sections.labor ? labor : [],
    processSteps,
    /**
     * Not gated by `sections.materials`, deliberately — see the type.
     *
     * The note travels too. It is the customer's own record of what they
     * agreed to bring, and six months later it is the difference between a
     * conversation and an argument.
     */
    credits: (Array.isArray(quote?.credits) ? quote.credits : []).filter(isIncluded).map((credit: any) => ({
      description: str(credit?.description),
      amount: Math.abs(num(credit?.amount)),
      note: str(credit?.reason),
    })),
    creditsSubtotal: Math.abs(num(quote?.creditsSubtotal)),
    /**
     * The sections at the customer's price, summing to `preTaxTotal`.
     *
     * Still never recomputed — `totalCost` below is the stored figure and
     * the authority, and these are apportioned FROM it rather than added up
     * into it. What changed is that they are no longer the cost of the work
     * sitting under a total that includes the markup on it.
     */
    materialsSubtotal: pricedMaterials,
    laborSubtotal: pricedLabor,
    /**
     * Permits, skips, plant hire — real money that reached `totalCost` and
     * appeared on nothing the customer could read. Emitted only when there is
     * some, so a quote without soft costs is unchanged.
     */
    otherCostsSubtotal: pricedOther,
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

/**
 * What a signed-in customer gets from `GET /quotes`.
 *
 * Eric: "make sure what i block never ends up in there portal."
 *
 * THE HOLE THIS CLOSES
 *
 * `customerQuoteView` above was written for the share link, and the comment
 * on that route is emphatic about why: the public by-token handler used to
 * answer with `stripBase64(quote)` — the entire stored record — so every
 * line marked `visible: false` was already in the customer's browser while
 * the editor politely declined to draw it.
 *
 * That was fixed for the LINK and not for the LIST. `GET /quotes` returns
 * `kv.getByPrefix("quote:")` filtered by `quoteBelongsTo` and nothing else,
 * so a customer with an account — reading their own quote in
 * `CustomerPortalView` — received the raw document: hidden lines, excluded
 * lines, the repricing summary and its margin, what subcontractors quoted,
 * the estimator's context, and every unit cost and hourly rate even on a
 * quote set to show no rates at all.
 *
 * Same bug, different door. Ownership was checked; disclosure was not.
 *
 * WHY IT IS BUILT, NOT STRIPPED
 *
 * Listing what to remove means a field added next year is disclosed by
 * default and nobody finds out. Building the answer from an allowlist means
 * it is absent by default, and the worst case is a portal missing something
 * rather than a customer holding our costings.
 */
export function customerQuoteSummary(quote: any) {
  const view = customerQuoteView(quote);
  return {
    ...view,
    /*
     * The list-level fields `CustomerPortalView` reads that are not part of
     * the document itself. Each one is either the customer's own fact or a
     * figure already on the quote they were sent.
     */
    status: String(quote?.status || 'draft'),
    title: String(quote?.title || quote?.projectTitle || view.projectTitle || ''),
    project_name: String(quote?.project_name || quote?.projectName || ''),
    total: num(quote?.total ?? view.totalCost),
    amount: num(quote?.amount ?? view.totalCost),
    createdAt: String(quote?.createdAt || view.generatedAt || ''),
    expiryDate: String(quote?.expiryDate || view.validUntil || ''),
    workRequestId: String(quote?.workRequestId || ''),
    deposit_paid: quote?.deposit_paid === true,
    quote_approved: quote?.quote_approved === true,
    approvalUrl: String(quote?.approvalUrl || ''),
  };
}
