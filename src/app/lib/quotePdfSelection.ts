/**
 * What goes on a quote PDF, and what is held back.
 *
 * WHY THIS IS SEPARATE FROM `quoteToPdfDocument`
 *
 * This decides; that assembles. The split is not tidiness — it is so this
 * half can be tested. The assembler pulls in `companyInfo`, which pulls in
 * the branding service and a chain of browser-shaped modules that Node's
 * test runner cannot follow. Every other security-relevant module in this
 * codebase (`safeFetch`, `ipReputation`, `customerQuoteView`) is
 * dependency-free for the same reason, and this one earns the same
 * treatment: a mistake here emails a customer the lines that were hidden
 * from them.
 *
 * THE THREE RULES IT APPLIES
 *
 *   per-line `included: false`  the line is not ON THE QUOTE AT ALL and its
 *                               money is out of every total
 *   per-line `visible: false`   the line is charged for, but not itemised
 *                               to the customer; its cost stays in the phase
 *   customerSections            materials, labour and process detail, each
 *                               switchable
 *
 * INCLUDED AND VISIBLE ANSWER DIFFERENT QUESTIONS, and conflating them is
 * the mistake worth guarding against. "Not included" is a decision about
 * what the job IS — the contingency we decided not to charge for. "Not
 * visible" is a decision about what the customer is TOLD — the dump run we
 * charge for without itemising. One changes the price; the other does not.
 *
 * Excluded wins over hidden, and over everything else. An excluded line is
 * filtered before any other rule runs, on the internal copy too, because an
 * office printout listing work that is not being charged for is how
 * somebody quotes a figure that is not the figure.
 *
 * Both are applied ONLY when building the customer's copy. The internal copy
 * shows everything, with withheld lines marked, because the controls exist
 * to manage what the customer sees — not to blind the person who priced it.
 */

export interface CustomerSections {
  materials: boolean;
  labor: boolean;
  processDetail: boolean;
}

/**
 * How much of a section the customer is shown.
 *
 * Eric: "even if i dont want the material and labor rates on the quote i
 * want to see the line item and the entire process details."
 *
 * The switch was a boolean, so the only choices were EVERY line with its
 * quantity and unit price, or no lines at all. The thing he actually wants
 * sits between them and is the normal way a contractor quotes: tell the
 * customer what the work consists of and what each part comes to, without
 * handing over the rate card they could price a competitor against.
 *
 *   full      the line, its quantity, its rate, its amount
 *   no-rates  the line and its amount. No quantity, no rate — nothing to
 *             divide one by the other and recover what we charge an hour
 *   off       the section is not sent at all
 */
export type SectionMode = 'full' | 'no-rates' | 'off';

/**
 * Read a stored switch, in any of the shapes it has had.
 *
 * `true`/`false` are what every quote written before this used, and they
 * still mean exactly what they meant. Absent means full, for the same
 * reason absent has always meant shown: defaulting the other way would
 * quietly empty every existing quote.
 */
export function sectionModeOf(value: unknown): SectionMode {
  if (value === false || value === 'off') return 'off';
  if (value === 'no-rates') return 'no-rates';
  return 'full';
}

/** Per-section modes, before they are flattened to "is it shown". */
export function sectionModesOf(quote: any): { materials: SectionMode; labor: SectionMode; processDetail: boolean } {
  const s = quote?.customerSections;
  if (!s && String(quote?.lineDetail || '').trim() === 'phase-totals') {
    return { materials: 'off', labor: 'off', processDetail: true };
  }
  return {
    materials: sectionModeOf(s?.materials),
    labor: sectionModeOf(s?.labor),
    processDetail: s?.processDetail !== false,
  };
}

export interface SelectedLine {
  description: string;
  quantity: number;
  unit_price: number;
  phase?: string;
  /**
   * Material or labour, carried so the document can split a phase into the
   * two and subtotal each.
   *
   * "all the labor materials ... per section so they can see how the money
   * is broken up per process." The lines were already grouped by phase, but
   * inside a phase they were one undifferentiated list — a customer could
   * see that Framing costs £4,390 and not what of that was timber and what
   * was the carpenter. The grouping already knew; it just was not saying.
   */
  kind: 'material' | 'labor';
}

export interface QuoteSelection {
  sections: CustomerSections;
  lines: SelectedLine[];
  /** Visible process steps, in order. */
  steps: any[];
  /** Phase name → true cost, counting withheld lines. */
  phaseCost: Map<string, number>;
  /** Phase name → its written account, when process detail is shown. */
  phaseText: Map<string, string>;
  /** False when both line sections are withheld — only totals are drawable. */
  showLines: boolean;
  /**
   * Whether each section's quantities and rates may be drawn.
   *
   * Separate from `sections`, which says only whether the section appears
   * at all. A section can be shown WITHOUT its rates, and that combination
   * is the common one — the customer sees what the job consists of and what
   * each part costs, and cannot work back to an hourly rate.
   */
  rates: { materials: boolean; labor: boolean };
  /**
   * What the customer is supplying themselves.
   *
   * NOT subject to the section switches or the per-line flag. Those exist to
   * stop a customer working backwards to our rates; this is money coming off
   * their bill for something they are providing, and hiding it would leave a
   * deduction in the total with nothing explaining it.
   */
  credits: Array<{ description: string; amount: number; note?: string }>;
}

/**
 * Is this line on the document at all?
 *
 * ABSENT MEANS INCLUDED. Every quote written before this field existed has
 * no such flag, and defaulting the other way would empty them.
 */
export const isIncluded = (line: any): boolean => line?.included !== false;

/**
 * Is each section shown at all?
 *
 * Deliberately still boolean, and deliberately true for 'no-rates'. Every
 * existing caller asks this question to decide whether to render a section,
 * and "shown without rates" is still shown — changing what this returns
 * would have silently emptied those sections instead of de-rating them.
 * Whether the RATES may be drawn is a second question, answered by
 * `rateVisibilityOf`.
 */
export function sectionsOf(quote: any): CustomerSections {
  const m = sectionModesOf(quote);
  return {
    materials: m.materials !== 'off',
    labor: m.labor !== 'off',
    processDetail: m.processDetail,
  };
}

/** Whether each section's quantities and rates may be drawn. */
export function rateVisibilityOf(quote: any): { materials: boolean; labor: boolean } {
  const m = sectionModesOf(quote);
  return { materials: m.materials === 'full', labor: m.labor === 'full' };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function selectQuoteLines(quote: any, forCustomer: boolean): QuoteSelection {
  const sections = forCustomer
    ? sectionsOf(quote)
    : { materials: true, labor: true, processDetail: true };
  // The office copy always shows rates — the controls exist to manage what
  // the CUSTOMER sees, not to blind the person who priced the job.
  const rates = forCustomer
    ? rateVisibilityOf(quote)
    : { materials: true, labor: true };

  // Excluded first and unconditionally — it is not a customer-facing rule.
  const keep = (l: any) => isIncluded(l) && (forCustomer ? l?.visible !== false : true);
  const mark = (desc: string, l: any) =>
    !forCustomer && l?.visible === false ? `${desc}  (hidden from customer)` : desc;

  const lines: SelectedLine[] = [];
  if (sections.materials) {
    for (const m of Array.isArray(quote?.materials) ? quote.materials : []) {
      if (!keep(m)) continue;
      lines.push({
        description: mark([m?.name, m?.description].filter(Boolean).join(' — ') || 'Material', m),
        quantity: Number(m?.quantity) || 0,
        unit_price: Number(m?.unitCost) || 0,
        phase: String(m?.phase || '').trim() || undefined,
        kind: 'material',
      });
    }
  }
  if (sections.labor) {
    for (const l of Array.isArray(quote?.labor) ? quote.labor : []) {
      if (!keep(l)) continue;
      lines.push({
        description: mark([l?.role, l?.description].filter(Boolean).join(' — ') || 'Labour', l),
        quantity: Number(l?.hours) || 0,
        unit_price: Number(l?.hourlyRate) || 0,
        phase: String(l?.phase || '').trim() || undefined,
        kind: 'labor',
      });
    }
  }

  /**
   * Soft costs that belong to a phase are drawn under it.
   *
   * Trash removal is the reason. Eric: "trash removal should be its own
   * process for every job." It lives in `additionalCosts`, and nothing
   * customer-facing has ever read that array — not this selection, not the
   * PDF, not the portal payload. So the $125 minimum was CHARGED on every
   * quote and shown on none of them: it was in the total and nowhere else,
   * which is the one combination a customer can reasonably object to.
   *
   * Only PHASED soft costs are included. An unphased one stays exactly as
   * invisible as it was — widening this to every soft cost would start
   * printing overheads nobody decided to show, which is a different change
   * and not this one.
   *
   * Quantity and unit price are zero: a skip is a charge, not a rate times
   * an amount, and inventing "1 x $125" would imply a unit nobody quoted.
   */
  for (const a of Array.isArray(quote?.additionalCosts) ? quote.additionalCosts : []) {
    if (!keep(a)) continue;
    const phase = String(a?.phase || "").trim();
    if (!phase) continue;
    lines.push({
      description: mark([a?.name, a?.description].filter(Boolean).join(" — ") || "Additional cost", a),
      quantity: 0,
      unit_price: 0,
      phase,
      kind: "material",
    });
  }

  const steps = (Array.isArray(quote?.processSteps) ? quote.processSteps : []).filter(keep);

  /**
   * Phase cost counts EVERY line in the phase, drawn or not.
   *
   * Hiding a line, or a whole section, removes the detail and keeps the
   * money — so a total summed from the drawn lines is wrong the moment
   * anything is withheld, and wrong in the direction that undercharges.
   */
  const phaseCost = new Map<string, number>();
  for (const l of [
    ...(Array.isArray(quote?.materials) ? quote.materials : []),
    ...(Array.isArray(quote?.labor) ? quote.labor : []),
    // Phased soft costs carry real money and a real milestone. Leaving them
    // out would make the phase subtotal disagree with the lines printed
    // under it, and would short the draw that releases on that phase.
    ...(Array.isArray(quote?.additionalCosts) ? quote.additionalCosts : []),
  ]) {
    // Hidden lines count here; EXCLUDED ones do not. The phase total is what
    // the customer pays for that phase, and an excluded line is not charged.
    if (!isIncluded(l)) continue;
    const key = String(l?.phase || '').trim();
    if (!key) continue;
    // `totalCost` on a material or labour line; `amount` on a soft cost.
    // Reading only the first would silently count a phased skip as zero and
    // make the phase subtotal disagree with the line printed under it.
    const value = Number(l?.totalCost ?? (l as any)?.amount) || 0;
    phaseCost.set(key, round2((phaseCost.get(key) || 0) + value));
  }

  const phaseText = new Map<string, string>();
  if (sections.processDetail) {
    for (const s of steps) {
      const t = String(s?.title || s?.step || '').trim();
      if (t && s?.description) phaseText.set(t, String(s.description));
    }
  }

  return {
    sections,
    lines,
    steps,
    phaseCost,
    phaseText,
    showLines: sections.materials || sections.labor,
    rates,
    credits: (Array.isArray(quote?.credits) ? quote.credits : []).filter(isIncluded).map((c: any) => ({
      description: String(c?.description || '').trim() || 'Supplied by you',
      amount: Math.abs(Number(c?.amount)) || 0,
      note: String(c?.reason || c?.note || '').trim() || undefined,
    })),
  };
}
