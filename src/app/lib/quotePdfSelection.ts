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
 * THE TWO RULES IT APPLIES
 *
 *   per-line `visible: false`   that line is not drawn, and its cost stays
 *                               in the phase total
 *   customerSections            materials, labour and process detail, each
 *                               switchable
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

export interface SelectedLine {
  description: string;
  quantity: number;
  unit_price: number;
  phase?: string;
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
}

export function sectionsOf(quote: any): CustomerSections {
  const s = quote?.customerSections;
  // The two-value `lineDetail` this replaced: 'phase-totals' meant no lines.
  if (!s && String(quote?.lineDetail || '').trim() === 'phase-totals') {
    return { materials: false, labor: false, processDetail: true };
  }
  return {
    materials: s?.materials !== false,
    labor: s?.labor !== false,
    processDetail: s?.processDetail !== false,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function selectQuoteLines(quote: any, forCustomer: boolean): QuoteSelection {
  const sections = forCustomer
    ? sectionsOf(quote)
    : { materials: true, labor: true, processDetail: true };

  const keep = (l: any) => (forCustomer ? l?.visible !== false : true);
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
      });
    }
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
  ]) {
    const key = String(l?.phase || '').trim();
    if (!key) continue;
    phaseCost.set(key, round2((phaseCost.get(key) || 0) + (Number(l?.totalCost) || 0)));
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
  };
}
