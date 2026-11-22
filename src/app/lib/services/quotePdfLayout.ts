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
/**
 * The NAMED export, deliberately.
 *
 * `import jsPDF from 'jspdf'` works in the browser only because the bundler
 * applies CJS interop to the default. Outside a bundler the default is the
 * module namespace OBJECT, so `new jsPDF()` throws "not a constructor" — which
 * made this layout impossible to render in a test or a script, and cost an
 * afternoon chasing a phantom bug that was really the import. The named export
 * is the constructor in both worlds.
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CARD_FEE_NOTICE } from '../cardFee.ts';

export interface QuotePdfLine {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  /**
   * Withheld from the customer: the row and its amount are printed, the
   * quantity and rate are not.
   *
   * Eric: "things can be hidden but totals can not… the line item should
   * stay with a total only." Hiding a line used to remove it from the page
   * entirely, which left its money in the total with nothing above it
   * saying so. The line stays; what it cost to do stops being anybody's
   * business but ours.
   */
  detailWithheld?: boolean;
}

/**
 * One kind of cost inside a phase — its lines and what they come to.
 *
 * "all the labor materials ... per section so they can see how the money is
 * broken up per process." A phase used to be one undifferentiated list, so a
 * customer could read that Framing costs $4,390 and still not know what of
 * that was timber and what was the carpenter.
 */
export interface QuotePdfLineGroup {
  label: string;
  lines: QuotePdfLine[];
  subtotal: number;
  /**
   * What of this group's money is ours — overhead, profit and contingency.
   *
   * OFFICE COPY ONLY. The assembler leaves it undefined on a customer's
   * document, so there is nothing here for a renderer to draw by accident.
   */
  markup?: { total: number; label: string };
  /**
   * Whether this group's quantity and rate columns may be drawn.
   *
   * Absent means yes, so every existing caller is unchanged. False draws
   * the line and its amount and nothing else — the customer sees what the
   * work consists of and what each part costs, with no two numbers to
   * divide into an hourly rate.
   */
  showRates?: boolean;
  /**
   * True for the balancing row, not a real group.
   *
   * When lines are withheld the drawn ones no longer account for the phase
   * total. That was already so — the flat list did not add up either — but
   * printing per-kind subtotals puts the arithmetic right under the reader's
   * nose, and a column that visibly does not add up reads as a mistake in
   * the quote. This carries the remainder so it does.
   */
  balancing?: boolean;
}

export interface QuotePdfPhase {
  /** Null for the lines that belong to no phase. */
  title: string | null;
  label: string;
  duration?: string;
  /** Written account of the phase. Omitted when process detail is withheld. */
  description?: string;
  lines: QuotePdfLine[];
  /** The same lines split by kind, each subtotalled. Drawn in preference. */
  groups?: QuotePdfLineGroup[];
  /** The phase's own markup. Office copy only, same as the group's. */
  markup?: { total: number; label: string };
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
  /**
   * What that date is CALLED.
   *
   * A quote is valid until a date; an invoice is DUE on one. The row is the
   * same shape and the word is not, and "Valid until 2026-11-22" printed on
   * an invoice is the kind of wrong a customer reads twice and then rings
   * about. Defaulted so the quote says nothing and keeps its wording.
   */
  validUntilLabel?: string;
  status: string;
  customer: { name: string; email?: string; phone?: string; address?: string };
  job: { title?: string; description?: string };
  phases: QuotePdfPhase[];
  /**
   * What the customer is supplying themselves, deducted from the work.
   *
   * Drawn as its own block above the totals rather than folded silently
   * into the subtotal. A deduction the customer cannot see itemised is a
   * deduction they ring up about — and it is the one figure on the document
   * that is in their favour, so burying it is the wrong way round.
   */
  credits?: Array<{ description: string; amount: number; note?: string }>;
  /** False when the breakdown is withheld — phase totals are shown instead. */
  showLines: boolean;
  /** Office copy only: why there is nothing above the totals. */
  emptyReason?: string;
  subtotal: number;
  tax: number;
  taxRate?: number;
  /**
   * What the customer's discount takes off, already deducted from `total`.
   *
   * Drawn AFTER the tax so the column reads subtotal + tax − discount =
   * total, which is how the approval page computes it. `itemised` false means
   * the discount applies and the row is not shown — the office copy says so,
   * the customer's copy simply carries the net total.
   */
  discount?: { percent: number; amount: number; label: string; itemised: boolean };
  /**
   * Hours spent from the customer's maintenance plan, already deducted from
   * `total`. Always drawn when present, never switchable — hours leaving
   * their bank are their property, and a deduction with nothing explaining it
   * is the one that generates a phone call.
   */
  planHours?: { planName: string; hours: number; rate: number; amount: number } | null;
  total: number;
  /**
   * How the total gets paid: the deposit and the draws.
   *
   * Drawn BELOW the totals, because it is an answer to the figure above it,
   * and above the notes, because it is a term of the deal rather than an
   * aside. Absent on a quote with no schedule, which is most of them.
   */
  paymentSchedule?: {
    draws: Array<{ label: string; trigger: string; amount: number; status: 'pending' | 'invoiced' | 'paid' }>;
    total: number;
    /** Office copy only: the schedule exists and the customer is not shown it. */
    withheld: boolean;
  };
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
  if (data.validUntil) {
    doc.text(`${data.validUntilLabel || 'Valid until'} ${data.validUntil}`, right, rightY, { align: 'right' });
    rightY += 4.2;
  }
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
  /**
   * WHAT THE PHASES ADD UP TO, counted as they are drawn.
   *
   * Eric added the phase subtotals up and got 10,032.94 against a total of
   * 12,666.13. Nothing was missing from the document — but two phases had no
   * matching process step, so they were appended AFTER the six that did and
   * landed past a page break. Six phases on page one come to exactly the
   * figure he reported.
   *
   * The document was right and unprovable, which on a quote is the same as
   * being wrong: a customer who cannot follow the arithmetic does not pay
   * more carefully, they ring up and ask. So the totals block now states
   * what the work above comes to, and a reader who stopped at a page break
   * can see at once that they have not seen all of it.
   */
  let phasesDrawn = 0;
  let phaseTotal = 0;

  for (const phase of data.phases) {
    y = pageBreak(doc, y, 30);
    phasesDrawn += 1;
    phaseTotal = Math.round((phaseTotal + (Number(phase.subtotal) || 0)) * 100) / 100;

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

    if (data.showLines && (phase.groups?.length || phase.lines.length)) {
      /* Materials, then labour, each subtotalled under the phase they belong
         to. Falls back to the flat list for any caller still building the
         old shape — the breakdown is an addition, not a replacement. */
      const groups: QuotePdfLineGroup[] = phase.groups?.length
        ? phase.groups
        : [{ label: '', lines: phase.lines, subtotal: phase.subtotal }];

      for (const group of groups) {
        if (!group.lines.length && !group.balancing) continue;

        if (group.label) {
          y = pageBreak(doc, y, 14);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(120, 120, 120);
          doc.text(group.label.toUpperCase(), MARGIN + 3, y);
          doc.setTextColor(60, 60, 60);
          doc.text(money(group.subtotal), right - 3, y, { align: 'right' });
          y += 3;
          // A hairline under the sub-heading, so the eye can tell a group
          // apart from the phase heading above it without another colour.
          doc.setDrawColor(225, 225, 225);
          doc.setLineWidth(0.2);
          doc.line(MARGIN + 3, y, right - 3, y);
          y += 3;

          /* Ours, not theirs. Italic and grey so it never reads as a charge
             the customer is being shown — and absent entirely from their
             copy, because the assembler does not populate it there. */
          if (group.markup && group.markup.total > 0) {
            y = pageBreak(doc, y, 10);
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);
            doc.text(`of which ours: ${group.markup.label}`, MARGIN + 5, y + 1);
            doc.text(money(group.markup.total), right - 3, y + 1, { align: 'right' });
            y += 5;
          }
        }

        if (!group.lines.length) continue;

        /* Two shapes, one table. With rates withheld the quantity and rate
           columns are not drawn at all — not blanked, not zeroed. A PDF
           contains only what is drawn into it, so an omitted column is
           genuinely absent from the file rather than hidden in it. */
        const rated = group.showRates !== false;
        autoTable(doc, {
          startY: y,
          margin: { left: MARGIN, right: MARGIN },
          head: rated
            ? [['Description', 'Qty', 'Rate', 'Amount']]
            : [['Description', 'Amount']],
          // A withheld line prints its description and its amount, and leaves
          // the quantity and rate columns empty rather than printing a zero
          // — "3 × $0.00" beside $1,050.00 would read as a broken quote.
          body: group.lines.map((l) => (rated
            ? [
                l.description,
                l.detailWithheld ? '' : String(l.quantity),
                l.detailWithheld ? '' : money(l.rate),
                money(l.amount),
              ]
            : [l.description, money(l.amount)])),
          theme: 'plain',
          styles: { fontSize: 8.5, cellPadding: 1.8, textColor: [60, 60, 60] },
          headStyles: { fontStyle: 'bold', textColor: [130, 130, 130], fontSize: 7.5 },
          columnStyles: rated
            ? {
              0: { cellWidth: 'auto' },
              1: { halign: 'right', cellWidth: 16 },
              2: { halign: 'right', cellWidth: 24 },
              3: { halign: 'right', cellWidth: 26 },
            }
            : {
              0: { cellWidth: 'auto' },
              1: { halign: 'right', cellWidth: 26 },
            },
        });
        y = (doc as any).lastAutoTable.finalY + 5;
      }

      if (phase.markup && phase.markup.total > 0) {
        y = pageBreak(doc, y, 10);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(140, 140, 140);
        doc.text(`OURS ON THIS PHASE  ·  ${phase.markup.label}`, MARGIN + 3, y);
        doc.text(money(phase.markup.total), right - 3, y, { align: 'right' });
        y += 5;
      }
      y += 1;
    } else {
      y += 2;
    }
  }

  /* Nothing to show, and the reason why — see `emptyReason`. Drawn in the
     space the phases would have occupied, so it reads as the explanation for
     the gap rather than as a footnote. */
  if (!data.phases.length && data.emptyReason) {
    y = pageBreak(doc, y, 20);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    for (const wrapped of doc.splitTextToSize(data.emptyReason, right - MARGIN - 6) as string[]) {
      y = pageBreak(doc, y);
      doc.text(wrapped, MARGIN + 3, y);
      y += 4.6;
    }
    y += 4;
  }

  /* ── What the customer is supplying ─────────────────────────────────── */
  if (data.credits?.length) {
    y = pageBreak(doc, y, 24) + 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text('SUPPLIED BY YOU', MARGIN, y);
    y += 5;

    for (const credit of data.credits) {
      y = pageBreak(doc, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(70, 70, 70);
      doc.text(String(credit.description || 'Supplied by you'), MARGIN, y);
      doc.text(`-${money(credit.amount)}`, right, y, { align: 'right' });
      y += 4.4;
      if (credit.note) {
        doc.setFontSize(8);
        doc.setTextColor(130, 130, 130);
        for (const wrapped of doc.splitTextToSize(String(credit.note), right - MARGIN - 30) as string[]) {
          y = pageBreak(doc, y);
          doc.text(wrapped, MARGIN + 3, y);
          y += 3.8;
        }
      }
      y += 1.2;
    }
    y += 2;
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

  /**
   * Only when there is more than one phase, and only when it actually
   * matches the subtotal. A document that asserts its own sum and gets it
   * wrong is worse than one that stays quiet — and the two differ whenever
   * a line is withheld from the customer, which is a deliberate feature and
   * not something to advertise a discrepancy about.
   */
  if (phasesDrawn > 1 && Math.abs(phaseTotal - data.subtotal) < 0.02) {
    totalRow(`The ${phasesDrawn} stages above`, money(phaseTotal));
  }
  totalRow('Subtotal', money(data.subtotal));
  /**
   * The deduction, restated in the totals so the sum can be followed.
   *
   * The itemised block above says WHAT the customer is supplying; without
   * this row the figures jump from a subtotal that excludes the deduction
   * to a total that includes it, and the reader has to work out for
   * themselves where several thousand pounds went. A total somebody cannot
   * follow is a total somebody queries.
   */
  const suppliedTotal = (data.credits || []).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  if (suppliedTotal > 0) {
    totalRow('Supplied by you', `-${money(suppliedTotal)}`);
  }
  if (data.tax) {
    totalRow(data.taxRate ? `Tax (${(data.taxRate * 100).toFixed(2)}%)` : 'Tax', money(data.tax));
  }
  /*
   * THE DISCOUNT, AFTER THE TAX, BECAUSE THAT IS WHAT MAKES THE COLUMN ADD UP.
   *
   * The approval page takes the discount off the stored total without
   * recomputing the tax, and `data.total` here is already net of it. Drawing
   * the row anywhere else would leave subtotal + tax − discount ≠ total, and
   * a customer checking the arithmetic is exactly who this is for.
   *
   * `itemised` is false when the quote is set to apply the discount without
   * showing it. The money has already come off `data.total` either way — the
   * row is the only thing the switch governs, and on the office copy it is
   * drawn with a note saying the customer did not see it.
   */
  /*
   * The hours before the discount row, because they are a quantity of work
   * already paid for rather than a reduction in its price — and because that
   * is the order they come off in, which `planHoursOnQuote.ts` states: the
   * percentage first, then hours against the labour that is left.
   */
  if (data.planHours && data.planHours.amount > 0) {
    const h = data.planHours;
    totalRow(
      `${h.hours} hour${h.hours === 1 ? '' : 's'} from ${h.planName}`,
      `-${money(h.amount)}`,
    );
  }
  if (data.discount && data.discount.amount > 0) {
    if (data.discount.itemised) {
      totalRow(data.discount.label, `-${money(data.discount.amount)}`);
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(150, 90, 20);
      y = pageBreak(doc, y);
      doc.text(
        `Includes ${money(data.discount.amount)} discount, not shown to the customer`,
        right, y, { align: 'right' },
      );
      doc.setTextColor(17, 17, 17);
      y += 4;
    }
  }
  doc.setDrawColor(brand.r, brand.g, brand.b);
  doc.line(right - 80, y - 2, right, y - 2);
  y += 3;
  totalRow('Total', money(data.total), true, 12);

  /*
   * THE CARD SURCHARGE, UNDER THE TOTAL AND ON BOTH DOCUMENTS.
   *
   * Eric: "add a disclaimer that 3percent will be added when using a card to
   * process payment checks and cash are accepted as well", and then
   * "yes add it to the invoices and quote approval too".
   *
   * One layout draws the quote and the invoice — an invoice is mapped onto
   * `QuotePdfData` and comes through here — so this puts it on both.
   *
   * IT IS NOT ADDED TO THE TOTAL ABOVE, and that is the important part. The
   * total is what the work costs; the surcharge is a cost of one way of
   * paying for it. Adding it here would overcharge every customer who pays
   * cash or by check, which are the two this notice exists to offer them.
   * The 3% goes on at the moment a card is actually used — see
   * `src/app/lib/cardFee.ts` and the checkout.
   */
  y += 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(110, 110, 110);
  for (const wrapped of doc.splitTextToSize(CARD_FEE_NOTICE, 80) as string[]) {
    y = pageBreak(doc, y);
    doc.text(wrapped, right, y, { align: 'right' });
    y += 3.2;
  }
  doc.setTextColor(17, 17, 17);
  y += 2;

  /* ── Payment schedule ───────────────────────────────────────────────── */
  /**
   * Eric: "can we add the payment schedule to the quote please maybe give me
   * the option to add or hide".
   *
   * The editor has built a real schedule for a while — a deposit and a draw
   * per phase, summing to the contract total to the cent — and no document
   * ever printed it. A customer's only written payment terms were whatever
   * the approval page worked out for itself.
   *
   * THE SUM IS CHECKED AND STATED. The draws must come to the total above;
   * `buildPaymentSchedule` guarantees it with integer-cent arithmetic, but a
   * draw can be edited by hand afterwards and a line can be unticked from the
   * quote underneath it. A schedule that silently misses the contract total
   * by a cent is exactly the thing a customer finds, so when the two disagree
   * the document says so instead of printing two numbers and hoping.
   */
  const schedule = data.paymentSchedule;
  if (schedule && (schedule.draws.length || schedule.withheld)) {
    y = pageBreak(doc, y, 30) + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text('PAYMENT SCHEDULE', MARGIN, y);
    y += 5;

    if (schedule.withheld) {
      // Office copy only — `selectPaymentSchedule` never sets this on the
      // customer's. Says which of "no schedule" and "switched off" it is.
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(150, 90, 20);
      doc.text('Not shown on the customer copy of this quote.', MARGIN, y);
      doc.setTextColor(17, 17, 17);
      y += 5;
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      for (const draw of schedule.draws) {
        y = pageBreak(doc, y);
        doc.setTextColor(60, 60, 60);
        /*
         * The trigger is what makes a draw defensible — "Structural, on
         * completion" is a thing the customer can check against work they
         * can see, where "25% on the 14th" is the one they dispute. It is
         * wrapped under the label rather than truncated beside it.
         */
        doc.text(draw.label, MARGIN, y);
        doc.setTextColor(17, 17, 17);
        doc.text(money(draw.amount), right, y, { align: 'right' });
        y += 4.4;
        if (draw.trigger) {
          doc.setFontSize(7.5);
          doc.setTextColor(130, 130, 130);
          for (const wrapped of doc.splitTextToSize(draw.trigger, right - MARGIN - 34) as string[]) {
            y = pageBreak(doc, y);
            doc.text(wrapped, MARGIN + 3, y);
            y += 3.4;
          }
          doc.setFontSize(9);
          doc.setTextColor(17, 17, 17);
        }
        y += 1.2;
      }

      y = pageBreak(doc, y) + 1;
      doc.setDrawColor(210, 210, 210);
      doc.line(MARGIN, y, right, y);
      y += 4.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Scheduled', MARGIN, y);
      doc.text(money(schedule.total), right, y, { align: 'right' });
      y += 5;

      const off = Math.round((schedule.total - data.total) * 100) / 100;
      if (off !== 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(150, 90, 20);
        for (const wrapped of doc.splitTextToSize(
          `The scheduled payments differ from the quote total by ${money(Math.abs(off))}. `
          + 'Rebalance the schedule in the editor before this goes out.',
          right - MARGIN,
        ) as string[]) {
          y = pageBreak(doc, y);
          doc.text(wrapped, MARGIN, y);
          y += 3.4;
        }
        doc.setTextColor(17, 17, 17);
        y += 1.5;
      }
    }
  }

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
