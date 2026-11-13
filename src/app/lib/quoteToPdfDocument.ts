/**
 * A quote, turned into the payload the PDF layout draws.
 *
 * THE ONE PLACE THAT DECIDES WHAT GOES ON THE PDF
 *
 * `quotePdfLayout` draws what it is handed and decides nothing. This decides
 * everything and draws nothing. Keeping that line sharp is what stops the
 * PDF and the on-screen document disagreeing: there is one answer to "what
 * is on this quote", and both consumers read it from here.
 *
 * It honours the same two visibility controls the customer-facing projection
 * does, for the obvious reason — a PDF emailed to a customer is exactly as
 * public as the share link, and a section withheld from one that appears in
 * the other is worse than no control at all.
 *
 *   per-line `visible: false`   that line is not drawn, and its cost stays
 *                               folded into the phase total
 *   customerSections            materials, labour and process detail, each
 *                               switchable; off means the section is not
 *                               built into the payload at all
 *
 * `forCustomer` is what connects them. An internal copy — the one Eric
 * prints for himself or hands a site manager — ignores both and shows
 * everything, because the controls exist to manage what the CUSTOMER sees,
 * not to blind the person who priced the job.
 */
import { groupLinesByPhase } from './invoicePhases';
import { selectQuoteLines } from './quotePdfSelection';
import { markupRatesOf, markupOn, hasMarkup, describeRates } from './quoteMarkup';
import {
  customerPricingOf, preTaxTotalOf, atCustomerPrice, allocate,
} from '../../../supabase/functions/server/quoteCustomerPrice.ts';
import { companyInfo } from './config/companyInfo';
import type { QuotePdfData, QuotePdfPhase, QuotePdfLineGroup } from './services/quotePdfLayout';


const hexToRgb = (hex: string) => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(hex || ''));
  return m
    ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
    : { r: 234, g: 88, b: 12 };
};

export interface QuotePdfOptions {
  /** Apply the customer visibility rules. False builds the full internal copy. */
  forCustomer?: boolean;
  /** Already-decoded logo. Fetching is the caller's job — this stays pure. */
  logoDataUrl?: string;
  workRequest?: { title?: string; description?: string; location?: string; customerName?: string; customerEmail?: string; customerPhone?: string };
}

export function quoteToPdfDocument(quote: any, options: QuotePdfOptions = {}): QuotePdfData {
  const { forCustomer = true, logoDataUrl, workRequest } = options;
  /**
   * Every decision about what appears lives in `selectQuoteLines`, which is
   * dependency-free and tested. This file only assembles the result into the
   * shape the layout draws — the split exists so the rules that decide what a
   * customer sees can be asserted in a test rather than reasoned about.
   */
  const { sections, lines, steps, phaseCost: trueCost, phaseText: describe, showLines, credits, rates: rateVisibility } =
    selectQuoteLines(quote, forCustomer);
  /**
   * THE CUSTOMER'S COPY IS PRICED; OURS IS COSTED.
   *
   * Eric: "on the quotes the line items are not adding up to the total on the
   * bottom." They did not. The lines carried what the work costs us, the
   * total at the foot of the page carried the markup as well, and the
   * difference — a fifth of the job on the standard 10/10/5 — appeared
   * nowhere. A customer adding the column up got a different answer from the
   * one they were being asked to sign.
   *
   * The markup is spread back into the line prices rather than given a row of
   * its own. A contractor's quote says what each part of the job costs the
   * customer, margin included; a line reading "profit" invites a negotiation
   * about the wrong number.
   *
   * The office copy is untouched and stays at cost — it is read beside the
   * "of which ours" annotations below, which only make sense against costs.
   */
  const pricing = customerPricingOf(quote);
  if (forCustomer && pricing.markup > 0) {
    /**
     * Rates are scaled, not re-derived. `toPdfLine` multiplies quantity by
     * rate for the amount, so lifting the rate lifts the amount with it and
     * the line still multiplies out for anyone who checks it.
     */
    for (const line of lines) {
      line.unit_price = line.unit_price * pricing.factor;
      /* The amount is the authoritative figure, so it is priced too — not
         left behind at cost while the rate beside it moves. */
      if (Number.isFinite((line as any).amount)) {
        (line as any).amount = Math.round((line as any).amount * pricing.factor * 100) / 100;
      }
    }
    for (const [name, cost] of trueCost) trueCost.set(name, atCustomerPrice(cost, pricing));

    /**
     * AND THEN THE ROUNDING REMAINDER IS PLACED, OR THE COLUMN STILL MISSES.
     *
     * Scaling each rate and rounding each amount independently leaves the
     * column a cent or two from the footer: on Sherry Ducharme's quote,
     * twenty-one lines came to 15,474.17 under a subtotal of 15,474.15. Two
     * cents is not a pricing error, but it is the same sentence from the
     * customer either way — "your lines do not add up to your total" — and
     * this document exists to stop that sentence.
     *
     * `allocate` apportions the printed subtotal across the printed lines and
     * puts the remainder on the largest one, which is what
     * `customerQuoteView` already does on the web copy. That agreement is the
     * real reason to do it here: the PDF and the page a customer approves
     * from must show the same figures, and before this they could differ by
     * the rounding alone.
     *
     * The cost of it: one line's amount may sit a cent off its own rate times
     * quantity. That is the lesser of the two, and it is the line most able to
     * absorb it.
     */
    const printedSubtotal = preTaxTotalOf(quote, pricing);
    const amounts = allocate(
      lines.map((l: any) => (Number(l.quantity) || 0) * (Number(l.unit_price) || 0)),
      printedSubtotal,
    );
    lines.forEach((line: any, i: number) => { line.priced_amount = amounts[i]; });
  }

  const grouped = groupLinesByPhase(lines, steps);

  /**
   * Markup is OURS ONLY — it is computed for the office copy and not at all
   * for the customer's.
   *
   * Guarding at the point of CALCULATION rather than the point of drawing is
   * deliberate. A customer's `QuotePdfPhase` simply has no `markup` on it,
   * so there is no field for a future renderer, a debug dump or a copied
   * block to put on their document. "Present but not drawn" is how the
   * `visible` flag came one keystroke from publishing a labour rate.
   */
  const rates = forCustomer ? null : markupRatesOf(quote);
  const showMarkup = !!rates && hasMarkup(rates);
  const rateLabel = rates ? describeRates(rates) : '';

  const round2 = (n: number) => Math.round(n * 100) / 100;


  /**
   * What one line's amount IS — resolved once, because two callers need it.
   *
   * `toPdfLine` draws it and the per-kind group subtotal below sums it. When
   * those two disagreed the group subtotal was right about rate x quantity and
   * wrong about the column printed underneath it, which is the same complaint
   * in a smaller box.
   */
  const amountOf = (l: any) => {
    if (Number.isFinite(l?.priced_amount)) return l.priced_amount as number;
    /**
     * The selection now carries the line’s OWN total, which is not always
     * quantity x rate — a waste factor lives in the stored figure and not
     * in the unit price. Recomputing it here is what put Q-2026-0002’s
     * column $23.04 under its own footer.
     */
    if (Number.isFinite(l?.amount)) return round2(l.amount as number);
    return round2(l.quantity * l.unit_price);
  };

  const toPdfLine = (l: any) => ({
    description: l.description,
    quantity: l.quantity,
    rate: l.unit_price,
    amount: amountOf(l),
  });

  const phases: QuotePdfPhase[] = grouped.map((g) => {
    const lines = g.lines.map(toPdfLine);
    const subtotal = g.phase && trueCost.has(g.phase)
      ? round2(trueCost.get(g.phase) as number)
      : g.subtotal;

    /**
     * Materials and labour, split and subtotalled inside the phase.
     *
     * The phase SUBTOTAL above is the true cost and counts withheld lines;
     * these groups can only count the ones actually drawn. So they will not
     * add up whenever anything is held back — which was already true of the
     * flat list, but printing per-kind subtotals puts the sum right under
     * the reader's eye, and a column that visibly does not add up reads as
     * an error in the quote rather than a deliberate omission.
     *
     * The balance is therefore carried as its own row. It names no line, no
     * quantity and no rate — it says only that the phase contains further
     * work at that price, which is exactly what withholding a line means
     * and the least that can be said while keeping the arithmetic honest.
     */
    const groups: QuotePdfLineGroup[] = [];
    for (const [kind, label] of [['material', 'Materials'], ['labor', 'Labour']] as const) {
      const of = g.lines.filter((l: any) => l.kind === kind);
      if (!of.length) continue;
      const groupSubtotal = round2(of.reduce((sum: number, l: any) => sum + amountOf(l), 0));
      groups.push({
        label,
        lines: of.map(toPdfLine),
        subtotal: groupSubtotal,
        /* The subtotal sums the SAME amounts the lines print — see `amountOf`.
           What changes is whether the quantity and rate are DRAWN. */
        showRates: kind === 'material' ? rateVisibility.materials : rateVisibility.labor,
        markup: showMarkup
          ? { total: markupOn(groupSubtotal, rates!).total, label: rateLabel }
          : undefined,
      });
    }

    const drawn = round2(groups.reduce((sum, grp) => sum + grp.subtotal, 0));
    const balance = round2(subtotal - drawn);
    // A penny either way is rounding, not withheld work.
    if (groups.length && Math.abs(balance) > 0.01) {
      groups.push({
        label: 'Other work in this phase',
        lines: [],
        subtotal: balance,
        balancing: true,
      });
    }

    return {
      title: g.phase,
      label: g.label,
      duration: g.duration,
      description: sections.processDetail && g.phase ? describe.get(g.phase) : undefined,
      lines,
      groups,
      /**
       * The phase's markup is taken on its TRUE subtotal, not on the drawn
       * lines. Withholding a line from the customer does not stop us earning
       * on it, and an office copy that said otherwise would under-report
       * what the job is actually worth — on the one document whose whole
       * purpose is to tell the truth about that.
       */
      markup: showMarkup
        ? { total: markupOn(subtotal, rates!).total, label: rateLabel }
        : undefined,
      subtotal,
    };
  });

  /**
   * With every line withheld there are no groups to render, so the phases
   * are built from the job's own steps instead — otherwise turning both
   * sections off produces a PDF with a total and nothing above it.
   */
  if (!phases.length && steps.length) {
    for (const s of steps) {
      const t = String(s?.title || s?.step || '').trim();
      phases.push({
        title: t || null,
        label: t || 'Scope of work',
        duration: s?.estimatedDuration ? String(s.estimatedDuration) : undefined,
        description: sections.processDetail && s?.description ? String(s.description) : undefined,
        lines: [],
        subtotal: round2(trueCost.get(t) || 0),
        markup: showMarkup ? { total: markupOn(trueCost.get(t) || 0, rates!).total, label: rateLabel } : undefined,
      });
    }
  }

  /**
   * And when the job has no written steps either, the phases the LINES name.
   *
   * The fallback above only knew about `processSteps`. A quote whose lines
   * are tagged "Demo" and "Framing" but which carries no written process —
   * a hand-built one, or one whose steps were switched off — fell through
   * both branches and produced a document with a grand total and nothing
   * whatsoever above it. That is the state that was reported: "i just see a
   * total at the bottom of the pdf."
   *
   * `phaseCost` already knows every phase the lines mention and what each
   * one comes to, in the order the lines introduced them. Showing the phase
   * and its price is explicitly the minimum a customer can be asked to
   * agree to, so this is the same floor the step fallback provides, reached
   * from the only other place the information lives.
   */
  if (!phases.length && trueCost.size) {
    for (const [name, cost] of trueCost) {
      phases.push({
        title: name,
        label: name,
        description: sections.processDetail ? describe.get(name) : undefined,
        lines: [],
        subtotal: round2(cost),
        markup: showMarkup ? { total: markupOn(cost, rates!).total, label: rateLabel } : undefined,
      });
    }
  }

  /**
   * If there is STILL nothing, say so — on our copy only.
   *
   * A quote that prints a grand total over a blank page is indistinguishable
   * from a broken renderer, and that ambiguity cost a round of guessing. The
   * office copy now names the reason instead. The customer's does not: a
   * note explaining which switches are off is an internal matter, and by
   * this point the two fallbacks above mean an empty customer copy only
   * happens when the quote genuinely has no priced work on it.
   */
  const emptyReason = phases.length || forCustomer
    ? undefined
    : 'No priced lines on this quote yet — add materials or labour, and they will appear here grouped by phase.';

  return {
    company: {
      name: companyInfo.name,
      tagline: companyInfo.tagline,
      addressLines: [
        [companyInfo.address?.line1, companyInfo.address?.line2].filter(Boolean).join(', '),
        [companyInfo.address?.city, companyInfo.address?.state, companyInfo.address?.zipCode].filter(Boolean).join(' '),
      ].filter(Boolean) as string[],
      email: companyInfo.contact?.email,
      phone: companyInfo.contact?.phone,
      website: companyInfo.contact?.website,
      logoDataUrl,
      primaryColor: hexToRgb(companyInfo.branding?.primaryColor || '#ea580c'),
    },
    heading: 'Estimate',
    number: String(quote?.quoteNumber || quote?.number || ''),
    date: String(quote?.generatedAt || quote?.createdAt || '').slice(0, 10),
    validUntil: quote?.validUntil ? String(quote.validUntil).slice(0, 10) : undefined,
    status: String(quote?.status || 'draft'),
    customer: {
      name: String(workRequest?.customerName || quote?.clientName || quote?.customerName || ''),
      email: workRequest?.customerEmail || quote?.clientEmail || undefined,
      phone: workRequest?.customerPhone || quote?.clientPhone || undefined,
      address: workRequest?.location || quote?.clientAddress || undefined,
    },
    job: {
      title: workRequest?.title || quote?.title || undefined,
      // The estimator's narrative is the job description on the document.
      description: quote?.aiSummary || workRequest?.description || undefined,
    },
    phases,
    emptyReason,
    showLines,
    credits,
    /**
     * What the job comes to before tax and the customer's own credits.
     *
     * On the customer's copy this is the PRICED figure — the quote's own
     * `preTaxTotal`, which is materials, labour and soft costs with the
     * markup on, and exactly `total` less tax plus credits. It used to be
     * materials plus labour AT COST, which is why the column never reached
     * the total: the markup and the soft costs were both missing from it.
     *
     * The office copy keeps the cost figure, which is the one that belongs
     * beside the per-phase "of which ours" lines.
     */
    subtotal: forCustomer
      ? preTaxTotalOf(quote, pricing)
      : Number(quote?.materialsSubtotal || 0) + Number(quote?.laborSubtotal || 0)
        || Number(quote?.totalCost || 0) - Number(quote?.taxAmount || 0),
    tax: Number(quote?.taxAmount) || 0,
    taxRate: Number(quote?.taxRate) || undefined,
    total: Number(quote?.totalCost || quote?.total) || 0,
    notes: quote?.notes || undefined,
  };
}
