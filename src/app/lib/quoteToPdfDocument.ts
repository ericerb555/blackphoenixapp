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
import { companyInfo } from './config/companyInfo';
import type { QuotePdfData, QuotePdfPhase } from './services/quotePdfLayout';


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
  const { sections, lines, steps, phaseCost: trueCost, phaseText: describe, showLines, credits } =
    selectQuoteLines(quote, forCustomer);
  const grouped = groupLinesByPhase(lines, steps);

  const phases: QuotePdfPhase[] = grouped.map((g) => ({
    title: g.phase,
    label: g.label,
    duration: g.duration,
    description: sections.processDetail && g.phase ? describe.get(g.phase) : undefined,
    lines: g.lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      rate: l.unit_price,
      amount: Math.round(l.quantity * l.unit_price * 100) / 100,
    })),
    subtotal: g.phase && trueCost.has(g.phase)
      ? Math.round((trueCost.get(g.phase) as number) * 100) / 100
      : g.subtotal,
  }));

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
        subtotal: Math.round((trueCost.get(t) || 0) * 100) / 100,
      });
    }
  }

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
    showLines,
    credits,
    subtotal: Number(quote?.materialsSubtotal || 0) + Number(quote?.laborSubtotal || 0)
      || Number(quote?.totalCost || 0) - Number(quote?.taxAmount || 0),
    tax: Number(quote?.taxAmount) || 0,
    taxRate: Number(quote?.taxRate) || undefined,
    total: Number(quote?.totalCost || quote?.total) || 0,
    notes: quote?.notes || undefined,
  };
}
