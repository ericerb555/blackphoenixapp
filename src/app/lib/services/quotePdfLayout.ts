/**
 * The quote, as a PDF that looks like the quote.
 *
 * WHY THIS IS NOT `generateInvoicePDF` WITH DIFFERENT WORDING
 *
 * It was. `generateQuotePDF` called the invoice generator with the word
 * "ESTIMATE" swapped in, and that layout is nothing like the quote people
 * actually read on screen: an orange banner across the top, the company name
 * set as text, no logo anywhere, and one flat table of lines. So the Print
 * button produced the document and the Download button produced something
 * else, from the same screen, with the same data.
 *
 * Eric asked for the printable PDF to look like his quotes — logo and company
 * details top left, the customer, the job title and description, the figures,
 * and only the sections he has chosen to show.
 *
 * WHY A REWRITE RATHER THAN A SCREENSHOT
 *
 * html2canvas is already a dependency and would have matched the on-screen
 * document for free. It was rejected deliberately: it produces a raster
 * image, so the text cannot be selected, searched or copied, the file is an
 * order of magnitude larger to email, and the document is dark-themed — the
 * capture would need the print styles forced onto it anyway. A quote is
 * printed, filed, quoted back at you and read on a phone. It should be real
 * text.
 *
 * The cost is a second layout that can drift from the component. That is
 * managed by this file taking a FINISHED payload — it makes no decisions
 * about what a quote contains or what the customer may see. Those live in
 * `customerQuoteView` and `invoicePhases`, and this draws what it is handed.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface QuotePdfLine {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface QuotePdfPhase {
  /** Null for the lines that belong to no phase. */
  title: string | null;
  label: string;
  duration?: string;
  /** Written account of the phase. Omitted when process detail is withheld. */
  description?: string;
  lines: QuotePdfLine[];
  subtotal: number;
}

export interface QuotePdfData {
  company: {
    name: string;
    tagline?: string;
    addressLines: string[];
    email?: string;
    phone?: string;
    website?: string;
    /** A data: URL. A remote URL cannot be drawn synchronously. */
    logoDataUrl?: string;
    primaryColor: { r: number; g: number; b: number };
  };
  heading: string;
  number: string;
  date: string;
  validUntil?: string;
  status: string;
  customer: { name: string; email?: string; phone?: string; address?: string };
  job: { title?: string; description?: string };
  phases: QuotePdfPhase[];
  /** False when the breakdown is withheld — phase totals are shown instead. */
  showLines: boolean;
  subtotal: number;
  tax: number;
  taxRate?: number;
  total: number;
  notes?: string;
  terms?: string;
}

const money = (n: number) =>
  `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MARGIN = 16;

export function buildQuotePdf(data: QuotePdfData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const right = pageWidth - MARGIN;
  const brand = data.company.primaryColor;
  let y = MARGIN;

  /* ── Header: the mark and the company, top left ─────────────────────────
     Left column is the business, right column is the document. That is the
     arrangement on screen and the one people scan for a reference number. */
  const headerTop = y;
  let leftY = y;

  if (data.company.logoDataUrl) {
    try {
      // Drawn at a fixed height with the width left to the image's own ratio
      // would need its dimensions; a square box is predictable and a logo
      // that is not square simply letterboxes inside it.
      doc.addImage(data.company.logoDataUrl, 'PNG', MARGIN, leftY, 18, 18);
      leftY += 22;
    } catch {
      // A logo that will not decode must not take the whole document with it.
    }
  }

  doc.setTextColor(17, 17, 17);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(data.company.name, MARGIN, leftY + 4);
  leftY += 9;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(90, 90, 90);
  for (const lineText of [
    ...data.company.addressLines,
    data.company.phone,
    data.company.email,
    data.company.website,
  ].filter(Boolean) as string[]) {
    doc.text(lineText, MARGIN, leftY);
    leftY += 4.2;
  }

  /* ── Header right: what this document is ────────────────────────────── */
  let rightY = headerTop + 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(brand.r, brand.g, brand.b);
  doc.text(data.heading.toUpperCase(), right, rightY, { align: 'right' });
  rightY += 8;

  doc.setFontSize(11);
  doc.setTextColor(17, 17, 17);
  if (data.number) { doc.text(data.number, right, rightY, { align: 'right' }); rightY += 6; }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(90, 90, 90);
  if (data.date) { doc.text(`Issued ${data.date}`, right, rightY, { align: 'right' }); rightY += 4.2; }
  if (data.validUntil) { doc.text(`Valid until ${data.validUntil}`, right, rightY, { align: 'right' }); rightY += 4.2; }
  if (data.status) { doc.text(data.status.toUpperCase(), right, rightY, { align: 'right' }); rightY += 4.2; }

  y = Math.max(leftY, rightY) + 4;
  doc.setDrawColor(220, 220, 220);
  doc.line(MARGIN, y, right, y);
  y += 8;

  /* ── Who it is for ──────────────────────────────────────────────────── */
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.text('PREPARED FOR', MARGIN, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 17, 17);
  doc.text(data.customer.name || '—', MARGIN, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  for (const lineText of [data.customer.email, data.customer.phone, data.customer.address].filter(Boolean) as string[]) {
    for (const wrapped of doc.splitTextToSize(lineText, 90) as string[]) {
      doc.text(wrapped, MARGIN, y);
      y += 4.4;
    }
  }
  y += 5;

  /* ── The job, and what it is ────────────────────────────────────────── */
  if (data.job.title) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(17, 17, 17);
    for (const wrapped of doc.splitTextToSize(data.job.title, right - MARGIN) as string[]) {
      doc.text(wrapped, MARGIN, y);
      y += 6;
    }
    y += 1;
  }

  if (data.job.description) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(70, 70, 70);
    for (const wrapped of doc.splitTextToSize(data.job.description, right - MARGIN) as string[]) {
      y = pageBreak(doc, y);
      doc.text(wrapped, MARGIN, y);
      y += 4.8;
    }
    y += 4;
  }

  /* ── The work, phase by phase ───────────────────────────────────────────
     Each phase is its own table so the heading row can carry the phase name,
     how long it runs and what it costs — which is the whole point of the
     grouping, and the only thing shown at all when the breakdown is withheld. */
  for (const phase of data.phases) {
    y = pageBreak(doc, y, 30);

    doc.setFillColor(248, 248, 248);
    doc.rect(MARGIN, y, right - MARGIN, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(brand.r, brand.g, brand.b);
    const heading = phase.duration ? `${phase.label}  ·  ${phase.duration}` : phase.label;
    doc.text(heading.toUpperCase(), MARGIN + 3, y + 6);
    doc.setTextColor(17, 17, 17);
    doc.text(money(phase.subtotal), right - 3, y + 6, { align: 'right' });
    y += 12;

    if (phase.description) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      for (const wrapped of doc.splitTextToSize(phase.description, right - MARGIN - 4) as string[]) {
        y = pageBreak(doc, y);
        doc.text(wrapped, MARGIN + 3, y);
        y += 4.4;
      }
      y += 3;
    }

    if (data.showLines && phase.lines.length) {
      autoTable(doc, {
        startY: y,
        margin: { left: MARGIN, right: MARGIN },
        head: [['Description', 'Qty', 'Rate', 'Amount']],
        body: phase.lines.map((l) => [l.description, String(l.quantity), money(l.rate), money(l.amount)]),
        theme: 'plain',
        styles: { fontSize: 8.5, cellPadding: 1.8, textColor: [60, 60, 60] },
        headStyles: { fontStyle: 'bold', textColor: [130, 130, 130], fontSize: 7.5 },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { halign: 'right', cellWidth: 16 },
          2: { halign: 'right', cellWidth: 24 },
          3: { halign: 'right', cellWidth: 26 },
        },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    } else {
      y += 2;
    }
  }

  /* ── Totals ─────────────────────────────────────────────────────────── */
  y = pageBreak(doc, y, 40) + 2;
  doc.setDrawColor(220, 220, 220);
  doc.line(right - 80, y, right, y);
  y += 6;

  const totalRow = (label: string, value: string, bold = false, size = 9.5) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(bold ? 17 : 90, bold ? 17 : 90, bold ? 17 : 90);
    doc.text(label, right - 80, y);
    doc.text(value, right, y, { align: 'right' });
    y += bold ? 7 : 5.4;
  };

  totalRow('Subtotal', money(data.subtotal));
  if (data.tax) {
    totalRow(data.taxRate ? `Tax (${(data.taxRate * 100).toFixed(2)}%)` : 'Tax', money(data.tax));
  }
  doc.setDrawColor(brand.r, brand.g, brand.b);
  doc.line(right - 80, y - 2, right, y - 2);
  y += 3;
  totalRow('Total', money(data.total), true, 12);

  /* ── Notes and terms ────────────────────────────────────────────────── */
  for (const [label, body] of [['Notes', data.notes], ['Terms', data.terms]] as Array<[string, string | undefined]>) {
    if (!body) continue;
    y = pageBreak(doc, y, 24) + 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text(label.toUpperCase(), MARGIN, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(70, 70, 70);
    for (const wrapped of doc.splitTextToSize(body, right - MARGIN) as string[]) {
      y = pageBreak(doc, y);
      doc.text(wrapped, MARGIN, y);
      y += 4.4;
    }
  }

  return doc;
}

/**
 * Start a new page when the next block will not fit.
 *
 * Returns the y to carry on at, so callers read as `y = pageBreak(doc, y)`
 * rather than having to remember to reset it themselves — forgetting that is
 * how a quote ends up writing its totals off the bottom of page one.
 */
function pageBreak(doc: jsPDF, y: number, needed = 12): number {
  const limit = doc.internal.pageSize.getHeight() - MARGIN;
  if (y + needed <= limit) return y;
  doc.addPage();
  return MARGIN;
}
