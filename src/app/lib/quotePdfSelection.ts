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
  /**
   * WHAT THE LINE ACTUALLY COMES TO, which is not always quantity x rate.
   *
   * MEASURED 2026-11-13 on Q-2026-0002: a plywood line read 6 x $38.40 and
   * was stored at $253.44, because the estimator folds a 10% WASTE FACTOR
   * into the line total and leaves the unit rate at what the supplier
   * charges. The PDF printed quantity x rate, so the column came to
   * $12,643.09 under a total of $12,666.13 — out by exactly the waste, on
   * one line out of sixteen.
   *
   * Eric found it by adding the column up, which is the only way anyone was
   * ever going to. Every subtotal in the system already uses the stored
   * figure; the document was the one place computing its own.
   */
  amount: number;
  phase?: string;
  /** Hidden from the customer: the amount prints, the quantity and rate do not. */
  detailWithheld?: boolean;
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
 * What a withheld line is called on the customer's copy.
 *
 * It keeps its row and its amount — "the line item should stay with a total
 * only" — and gives up its name, which is the thing hiding exists to
 * protect. A row reading "Skip hire" with the price beside it would be no
 * hiding at all, and `tests/quotePdfSelection.test.ts` has asserted that
 * since the flag was introduced.
 *
 * Deliberately says nothing about what it is. A customer can see that the
 * phase contains work at that price, which is what they are paying for, and
 * nothing about how it was bought.
 */
export const WITHHELD_LABEL = 'Additional work';

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

/**
 * The line’s own total when it has one, quantity x rate when it does not.
 *
 * The stored figure WINS, because it is the one every subtotal in the
 * system already sums: the quote total, the phase total, the draw, the
 * invoice. Recomputing it here is how the document ended up disagreeing
 * with its own footer.
 */
export function amountOfLine(line: any, quantity: number, rate: number): number {
  const stored = Number(line?.totalCost);
  if (Number.isFinite(stored) && stored > 0) return round2(stored);
  return round2(quantity * rate);
}

/**
 * Say so when a line comes to more than its own quantity times its rate.
 *
 * Without this the fix trades one unanswerable question for another: the
 * column would add up, and a customer multiplying 6 x $38.40 would get
 * $230.40 against a printed $253.44 and have no way to know why. Waste is a
 * real and ordinary cost — you buy ten sheets to cut nine — and naming it
 * is better than hiding it in a rate nobody can check.
 */
export function describeLine(description: string, line: any, quantity: number, rate: number): string {
  const amount = amountOfLine(line, quantity, rate);
  const bare = round2(quantity * rate);
  if (!(amount > bare + 0.01) || bare <= 0) return description;

  const stated = Number(line?.wasteFactor);
  const pct = Number.isFinite(stated) && stated > 0
    ? stated * 100
    : ((amount - bare) / bare) * 100;
  if (!(pct > 0.5)) return description;
  return `${description} (incl. ${Math.round(pct)}% waste)`;
}

export function selectQuoteLines(quote: any, forCustomer: boolean): QuoteSelection {
  const sections = forCustomer
    ? sectionsOf(quote)
    : { materials: true, labor: true, processDetail: true };
  // The office copy always shows rates — the controls exist to manage what
  // the CUSTOMER sees, not to blind the person who priced the job.
  const rates = forCustomer
    ? rateVisibilityOf(quote)
    : { materials: true, labor: true };

  /*
   * EXCLUDED IS GONE; HIDDEN IS QUIET.
   *
   * `included: false` means the work is not on the quote and is not charged,
   * so it is dropped unconditionally — that is not a customer-facing rule.
   *
   * `visible: false` used to drop the line from the customer's copy too,
   * which left its money in the phase subtotal and the total with nothing on
   * the page accounting for it. On Q-2026-0002 that silently priced
   * $2,633.19 of work the customer could not see.
   *
   * Eric: "things can be hidden but totals can not… the line item should
   * stay with a total only." So a hidden line is KEPT and marked. It prints
   * its description and its amount; `detailWithheld` stops the quantity and
   * rate from being drawn, which is the part that was worth withholding.
   */
  const keep = (l: any) => isIncluded(l);
  const withheld = (l: any) => forCustomer && l?.visible === false;
  const mark = (desc: string, l: any) =>
    !forCustomer && l?.visible === false ? `${desc}  (hidden from customer)` : desc;

  /*
   * WHERE THE LINES LIVE, WHICH IS NOT ALWAYS `materials` AND `labor`.
   *
   * Some quotes keep everything in `items` instead — Q-2026-0006 is one, with
   * seventeen fully formed rows worth $7,308.70, every one phased and priced,
   * and `materials`/`labor` both absent. Reading only the two named arrays
   * produced a PDF of phase headings with no lines under them and a $0.00
   * total, which is the "i just see a total at the bottom of the pdf" state.
   *
   * The named arrays win where they exist: on a quote carrying both, `items`
   * is a stale copy from an earlier save and the stored subtotals reconcile
   * with `materials`/`labor` rather than with it.
   *
   * THE STALE COPIES ARE GONE FROM THE DATA as of 2026-11-14. Q-2026-0002,
   * -0003 and -0004 each carried one — Q-2026-0002's priced 2x4s at $3.75
   * against $4.38 in `materials`, a month apart — and `items` was removed
   * from those three, backed up first under
   * `quote_items_backup_20261114:<quote id>` with the original array intact.
   * Each carries `itemsRemovedAt` and `itemsRemovedWhy` saying so.
   *
   * The precedence stays regardless. It costs nothing, it is what made the
   * removal safe to do, and a quote written by an older path could carry
   * both again tomorrow.
   *
   * Splitting by SHAPE rather than by a flag, because that is what the rows
   * actually carry: an hourly rate and a role is labour, a quantity and a
   * unit cost is material. A row that says neither is treated as material,
   * which prices it from the same two fields it would have used anyway.
   */
  const looksLikeLabour = (r: any) =>
    r?.hours != null || r?.hourlyRate != null || (r?.role != null && r?.unitCost == null);

  const declaredMaterials = Array.isArray(quote?.materials) ? quote.materials : [];
  const declaredLabour = Array.isArray(quote?.labor) ? quote.labor : [];
  const fallbackItems = (declaredMaterials.length || declaredLabour.length)
    ? []
    : (Array.isArray(quote?.items) ? quote.items : []);

  const materialRows = declaredMaterials.length || declaredLabour.length
    ? declaredMaterials
    : fallbackItems.filter((r: any) => !looksLikeLabour(r));
  const labourRows = declaredMaterials.length || declaredLabour.length
    ? declaredLabour
    : fallbackItems.filter(looksLikeLabour);

  const lines: SelectedLine[] = [];
  if (sections.materials) {
    for (const m of materialRows) {
      if (!keep(m)) continue;
      lines.push({
        description: withheld(m) ? WITHHELD_LABEL : describeLine(
          mark([m?.name, m?.description].filter(Boolean).join(' — ') || 'Material', m),
          m, Number(m?.quantity) || 0, Number(m?.unitCost) || 0,
        ),
        quantity: Number(m?.quantity) || 0,
        unit_price: Number(m?.unitCost) || 0,
        amount: amountOfLine(m, Number(m?.quantity) || 0, Number(m?.unitCost) || 0),
        phase: String(m?.phase || '').trim() || undefined,
        detailWithheld: withheld(m) || undefined,
        kind: 'material',
      });
    }
  }
  if (sections.labor) {
    for (const l of labourRows) {
      if (!keep(l)) continue;
      lines.push({
        description: withheld(l) ? WITHHELD_LABEL : mark([l?.role, l?.description].filter(Boolean).join(' — ') || 'Labour', l),
        quantity: Number(l?.hours) || 0,
        unit_price: Number(l?.hourlyRate) || 0,
        amount: amountOfLine(l, Number(l?.hours) || 0, Number(l?.hourlyRate) || 0),
        phase: String(l?.phase || '').trim() || undefined,
        detailWithheld: withheld(l) || undefined,
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
      description: withheld(a)
        ? WITHHELD_LABEL
        : mark([a?.name, a?.description].filter(Boolean).join(" — ") || "Additional cost", a),
      quantity: 0,
      unit_price: 0,
      amount: round2(Number(a?.amount) || 0),
      phase,
      detailWithheld: withheld(a) || undefined,
      kind: "material",
    });
  }

  /**
   * ONE "Additional work" ROW PER PHASE, NOT ONE PER HIDDEN LINE.
   *
   * Eric, 2026-11-19: *"i am really getting aggrivated with the view quote in
   * the quote builder not hidding the items i have hidden"*.
   *
   * He had hidden every line on Q-2026-0006 — all eighteen — and the customer
   * copy printed eighteen rows, every one of them reading "Additional work",
   * each with a different number beside it. Two of them inside the same
   * phase. That is not hiding anything: it discloses exactly how many pieces
   * of work there are and what each costs, while refusing to say what they
   * are. The worst of both.
   *
   * His instruction all along was *"the line item should stay with a total
   * only"*, which reads correctly as ONE line carrying the withheld money,
   * not one per thing withheld.
   *
   * So the withheld rows in a phase collapse into a single row with their
   * combined amount. The money is untouched — `phaseCost` below counts every
   * line regardless, and this only changes how many rows the same sum is
   * drawn across.
   *
   * Order is preserved by rebuilding in place: the collapsed row takes the
   * position of the FIRST withheld line in its phase, so a phase that begins
   * with hidden work still reads top to bottom.
   */
  if (forCustomer) {
    const mergedAmount = new Map<string, number>();
    for (const l of lines) {
      if (!l.detailWithheld) continue;
      const key = String(l.phase || '');
      mergedAmount.set(key, round2((mergedAmount.get(key) || 0) + (Number(l.amount) || 0)));
    }
    if (mergedAmount.size) {
      const placed = new Set<string>();
      const collapsed: typeof lines = [];
      for (const l of lines) {
        if (!l.detailWithheld) { collapsed.push(l); continue; }
        const key = String(l.phase || '');
        if (placed.has(key)) continue;
        placed.add(key);
        collapsed.push({
          ...l,
          description: WITHHELD_LABEL,
          quantity: 0,
          unit_price: 0,
          amount: mergedAmount.get(key) || 0,
          detailWithheld: true,
        });
      }
      lines.length = 0;
      lines.push(...collapsed);
    }
  }

  /*
   * A STEP IS NOT A LINE. Hiding a process step removes it outright — it
   * carries no money of its own, so there is no total to keep on the page
   * and nothing to account for. Only priced rows get the keep-the-row
   * treatment.
   */
  const steps = (Array.isArray(quote?.processSteps) ? quote.processSteps : [])
    .filter((s: any) => isIncluded(s) && (forCustomer ? s?.visible !== false : true));

  /**
   * Phase cost counts EVERY line in the phase, drawn or not.
   *
   * Hiding a line, or a whole section, removes the detail and keeps the
   * money — so a total summed from the drawn lines is wrong the moment
   * anything is withheld, and wrong in the direction that undercharges.
   */
  const phaseCost = new Map<string, number>();
  for (const l of [
    // The same rows the lines above were built from, so a quote that keeps
    // everything in `items` gets phase subtotals as well as lines. Reading
    // the named arrays here while the lines came from `items` would print
    // every phase at zero beneath its own priced rows.
    ...materialRows,
    ...labourRows,
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
