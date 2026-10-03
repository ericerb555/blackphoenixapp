/**
 * Typesetting, so the ebooks read like books rather than printed web pages.
 *
 * WHY AN ENGINE AND NOT jsPDF CALLS PER DOCUMENT
 *
 * Five ebooks, four templates, two maintenance packages and three generated
 * reports all need the same things: a cover, a contents page with real page
 * numbers, running heads, chapter openings, body text that wraps on a sensible
 * measure, and tables that survive a page break. Written per document that is
 * fourteen slightly different layouts, and the differences would all be
 * accidents. Written once it is one layout, and a buyer who owns two of these
 * can see they came from the same company.
 *
 * HOW THE CONTENTS PAGE GETS REAL PAGE NUMBERS
 *
 * Two passes. The first renders into a throwaway document purely to learn
 * which page each heading lands on; the second renders for real, with the
 * contents page inserted and every number offset by however many pages the
 * contents itself takes. jsPDF can insert pages, but the running heads and
 * footers are drawn as each page is created, so inserting afterwards would
 * leave them numbered wrongly. Measuring first is simpler than repairing
 * after.
 *
 * WHAT IT WILL NOT DO
 *
 * Images, and hyphenation. There are no illustrations in these documents, and
 * jsPDF has only the standard PDF fonts, so Times for body and Helvetica for
 * furniture is the whole palette — which is enough: a book is judged on its
 * measure, its spacing and its hierarchy long before its typeface.
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN_X = 72;
const MARGIN_TOP = 78;
const MARGIN_BOTTOM = 72;
const COL_W = PAGE_W - MARGIN_X * 2;

const INK = [28, 25, 23];
const INK_SOFT = [87, 83, 78];
const AMBER = [180, 83, 9];
const RULE = [231, 229, 228];
const WASH = [254, 243, 199];

/** Leading as a multiple of type size. Comfortable for a long read. */
const LEADING = 1.42;

class Book {
  constructor(spec, { collecting = false, tocPages = 0 } = {}) {
    this.spec = spec;
    this.collecting = collecting;
    this.tocPages = tocPages;
    this.doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true });
    this.y = MARGIN_TOP;
    this.pageIndex = 1;
    this.headings = [];
    this.runningHead = spec.title;
    this.bodyStarted = false;
  }

  // ── Page furniture ──────────────────────────────────────────────────────

  newPage() {
    this.doc.addPage();
    this.pageIndex += 1;
    this.y = MARGIN_TOP;
    this.furniture();
  }

  /** Running head and footer. Drawn as the page opens, never retrofitted. */
  furniture() {
    if (!this.bodyStarted) return;
    const d = this.doc;
    d.setFont('helvetica', 'normal');
    d.setFontSize(8);
    d.setTextColor(...INK_SOFT);
    d.text(this.runningHead, MARGIN_X, 46, { maxWidth: COL_W * 0.7 });
    d.setDrawColor(...RULE);
    d.setLineWidth(0.5);
    d.line(MARGIN_X, 54, PAGE_W - MARGIN_X, 54);

    const shown = this.pageIndex + this.tocPages;
    d.text(String(shown), PAGE_W - MARGIN_X, PAGE_H - 44, { align: 'right' });
    d.text('The Black Phoenix Company', MARGIN_X, PAGE_H - 44);
  }

  /** Room for `height` more points, or a new page. */
  need(height) {
    if (this.y + height <= PAGE_H - MARGIN_BOTTOM) return;
    this.newPage();
  }

  // ── Blocks ──────────────────────────────────────────────────────────────

  cover() {
    const d = this.doc;
    const { title, subtitle, blurb, audience } = this.spec;

    d.setFillColor(...INK);
    d.rect(0, 0, PAGE_W, 250, 'F');
    d.setFillColor(...AMBER);
    d.rect(0, 250, PAGE_W, 5, 'F');

    d.setFont('helvetica', 'bold');
    d.setFontSize(30);
    d.setTextColor(255, 255, 255);
    const titleLines = d.splitTextToSize(title, COL_W);
    d.text(titleLines, MARGIN_X, 112);

    d.setFont('helvetica', 'normal');
    d.setFontSize(12.5);
    d.setTextColor(214, 211, 209);
    d.text(d.splitTextToSize(subtitle || '', COL_W), MARGIN_X, 112 + titleLines.length * 34 + 10);

    let y = 320;
    if (blurb) {
      d.setFont('times', 'normal');
      d.setFontSize(12);
      d.setTextColor(...INK);
      const lines = d.splitTextToSize(blurb, COL_W);
      d.text(lines, MARGIN_X, y);
      y += lines.length * 12 * LEADING + 24;
    }

    if (audience?.length) {
      d.setFont('helvetica', 'bold');
      d.setFontSize(8.5);
      d.setTextColor(...AMBER);
      d.text('WRITTEN FOR', MARGIN_X, y);
      d.setFont('helvetica', 'normal');
      d.setFontSize(10);
      d.setTextColor(...INK_SOFT);
      d.text(audience.join('   ·   '), MARGIN_X, y + 14);
    }

    d.setFont('helvetica', 'normal');
    d.setFontSize(9);
    d.setTextColor(...INK_SOFT);
    d.text('The Black Phoenix Company', MARGIN_X, PAGE_H - 72);
    d.text('theblackphoenixcompany.com', MARGIN_X, PAGE_H - 58);
    if (this.spec.edition) {
      d.text(this.spec.edition, PAGE_W - MARGIN_X, PAGE_H - 58, { align: 'right' });
    }
  }

  contents(headings) {
    const d = this.doc;
    d.addPage();
    this.pageIndex += 1;
    d.setFont('helvetica', 'bold');
    d.setFontSize(17);
    d.setTextColor(...INK);
    d.text('Contents', MARGIN_X, MARGIN_TOP + 6);

    let y = MARGIN_TOP + 38;
    for (const entry of headings) {
      if (y > PAGE_H - MARGIN_BOTTOM - 20) {
        d.addPage();
        this.pageIndex += 1;
        y = MARGIN_TOP;
      }
      const chapter = entry.level === 1;
      d.setFont('helvetica', chapter ? 'bold' : 'normal');
      d.setFontSize(chapter ? 10.5 : 9.5);
      d.setTextColor(...(chapter ? INK : INK_SOFT));
      const indent = chapter ? 0 : 16;
      const label = d.splitTextToSize(entry.text, COL_W - 50 - indent)[0];
      d.text(label, MARGIN_X + indent, y);
      d.text(String(entry.page), PAGE_W - MARGIN_X, y, { align: 'right' });
      // Leaders, so the eye tracks across to the number.
      const labelWidth = d.getTextWidth(label);
      const from = MARGIN_X + indent + labelWidth + 6;
      const to = PAGE_W - MARGIN_X - 18;
      if (to > from) {
        d.setDrawColor(...RULE);
        d.setLineWidth(0.4);
        d.setLineDashPattern([0.6, 2.4], 0);
        d.line(from, y - 2.5, to, y - 2.5);
        d.setLineDashPattern([], 0);
      }
      y += chapter ? 19 : 15;
    }
  }

  /** A chapter opening. Always a fresh page: that is what makes it a chapter. */
  chapter(text) {
    if (this.bodyStarted) this.newPage();
    else {
      this.doc.addPage();
      this.pageIndex += 1;
      this.bodyStarted = true;
      this.y = MARGIN_TOP;
      this.furniture();
    }
    this.runningHead = text;
    this.headings.push({ level: 1, text, page: this.pageIndex });

    const d = this.doc;
    d.setFillColor(...AMBER);
    d.rect(MARGIN_X, this.y + 2, 34, 3, 'F');
    this.y += 24;
    d.setFont('helvetica', 'bold');
    d.setFontSize(21);
    d.setTextColor(...INK);
    const lines = d.splitTextToSize(text, COL_W);
    d.text(lines, MARGIN_X, this.y);
    this.y += lines.length * 24 + 16;
  }

  section(text) {
    // A heading with nothing under it is an orphan; take it to the next page.
    this.need(66);
    this.headings.push({ level: 2, text, page: this.pageIndex });
    const d = this.doc;
    this.y += 8;
    d.setFont('helvetica', 'bold');
    d.setFontSize(13);
    d.setTextColor(...INK);
    const lines = d.splitTextToSize(text, COL_W);
    d.text(lines, MARGIN_X, this.y);
    this.y += lines.length * 16 + 8;
  }

  subsection(text) {
    this.need(48);
    const d = this.doc;
    this.y += 6;
    d.setFont('helvetica', 'bold');
    d.setFontSize(10.5);
    d.setTextColor(...AMBER);
    d.text(d.splitTextToSize(text, COL_W), MARGIN_X, this.y);
    this.y += 14;
  }

  /** Body text. Times, because this is meant to be read at length. */
  para(text, { size = 11, italic = false, color = INK, indent = 0 } = {}) {
    const d = this.doc;
    d.setFont('times', italic ? 'italic' : 'normal');
    d.setFontSize(size);
    d.setTextColor(...color);
    const lines = d.splitTextToSize(String(text), COL_W - indent);
    const lineHeight = size * LEADING;
    for (const line of lines) {
      this.need(lineHeight);
      d.setFont('times', italic ? 'italic' : 'normal');
      d.setFontSize(size);
      d.setTextColor(...color);
      d.text(line, MARGIN_X + indent, this.y);
      this.y += lineHeight;
    }
    this.y += 7;
  }

  list(items, { glyph = '•', numbered = false, checks = false } = {}) {
    const d = this.doc;
    const size = 10.5;
    const lineHeight = size * 1.36;
    items.forEach((item, i) => {
      const marker = checks ? '☐' : numbered ? `${i + 1}.` : glyph;
      const text = typeof item === 'string' ? item : item.text;
      const lines = d.splitTextToSize(String(text), COL_W - 26);
      this.need(lineHeight * lines.length + 4);
      d.setFont('helvetica', 'normal');
      d.setFontSize(size - 0.5);
      d.setTextColor(...(checks ? INK_SOFT : AMBER));
      d.text(marker, MARGIN_X + 2, this.y);
      d.setFont('times', 'normal');
      d.setFontSize(size);
      d.setTextColor(...INK);
      lines.forEach((line, n) => {
        if (n > 0) this.need(lineHeight);
        d.text(line, MARGIN_X + 26, this.y);
        this.y += lineHeight;
      });
      this.y += 3;
    });
    this.y += 5;
  }

  /** A boxed aside. For the thing a reader must not skim past. */
  callout(heading, body) {
    const d = this.doc;
    d.setFont('times', 'normal');
    d.setFontSize(10.5);
    const lines = d.splitTextToSize(String(body), COL_W - 36);
    const height = 30 + lines.length * 10.5 * 1.38;
    this.need(height + 12);

    d.setFillColor(...WASH);
    d.setDrawColor(...AMBER);
    d.setLineWidth(0.8);
    d.rect(MARGIN_X, this.y - 10, COL_W, height, 'FD');
    d.setFillColor(...AMBER);
    d.rect(MARGIN_X, this.y - 10, 3.5, height, 'F');

    d.setFont('helvetica', 'bold');
    d.setFontSize(9.5);
    d.setTextColor(...AMBER);
    d.text(String(heading).toUpperCase(), MARGIN_X + 16, this.y + 4);

    d.setFont('times', 'normal');
    d.setFontSize(10.5);
    d.setTextColor(...INK);
    let ty = this.y + 20;
    for (const line of lines) {
      d.text(line, MARGIN_X + 16, ty);
      ty += 10.5 * 1.38;
    }
    this.y += height + 12;
  }

  table(head, rows, widths) {
    const d = this.doc;
    this.need(70);
    autoTable(d, {
      head: [head],
      body: rows,
      startY: this.y,
      margin: { left: MARGIN_X, right: MARGIN_X },
      styles: { font: 'helvetica', fontSize: 8.6, cellPadding: 5, textColor: INK, lineColor: RULE, lineWidth: 0.4 },
      headStyles: { fillColor: INK, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.4 },
      alternateRowStyles: { fillColor: [250, 250, 249] },
      columnStyles: widths
        ? Object.fromEntries(widths.map((w, i) => [i, { cellWidth: COL_W * w }]))
        : undefined,
      // Each new page the table spills onto still needs its furniture.
      didAddPage: () => {
        this.pageIndex += 1;
        this.y = MARGIN_TOP;
        this.furniture();
      },
    });
    this.y = (d.lastAutoTable?.finalY || this.y) + 16;
  }

  /** Label and value rows, for a form or a summary. */
  fields(pairs) {
    const d = this.doc;
    for (const [label, value] of pairs) {
      this.need(24);
      d.setFont('helvetica', 'bold');
      d.setFontSize(9);
      d.setTextColor(...INK_SOFT);
      d.text(String(label), MARGIN_X, this.y);
      d.setDrawColor(...RULE);
      d.setLineWidth(0.6);
      d.line(MARGIN_X + 150, this.y + 2, PAGE_W - MARGIN_X, this.y + 2);
      if (value) {
        d.setFont('times', 'normal');
        d.setFontSize(10.5);
        d.setTextColor(...INK);
        d.text(String(value), MARGIN_X + 154, this.y);
      }
      this.y += 22;
    }
    this.y += 6;
  }

  rule() {
    this.need(16);
    this.doc.setDrawColor(...RULE);
    this.doc.setLineWidth(0.6);
    this.doc.line(MARGIN_X, this.y, PAGE_W - MARGIN_X, this.y);
    this.y += 14;
  }

  /** Render every block of a chapter. */
  blocks(blocks) {
    for (const block of blocks) {
      if (!block) continue;
      switch (block.t) {
        case 'h2': this.section(block.text); break;
        case 'h3': this.subsection(block.text); break;
        case 'p': this.para(block.text, block.opts); break;
        case 'bullets': this.list(block.items); break;
        case 'numbers': this.list(block.items, { numbered: true }); break;
        case 'checks': this.list(block.items, { checks: true }); break;
        case 'callout': this.callout(block.heading, block.body); break;
        case 'table': this.table(block.head, block.rows, block.widths); break;
        case 'fields': this.fields(block.pairs); break;
        case 'rule': this.rule(); break;
        case 'break': this.newPage(); break;
        default: throw new Error(`pdfBook: unknown block type "${block.t}"`);
      }
    }
  }
}

/**
 * Render a book.
 *
 * `spec` is { title, subtitle, blurb, audience, edition, chapters: [{ title,
 * blocks }] }. Returns { buffer, pages, headings } — `pages` is the real page
 * count, which is what the listing should say rather than a number somebody
 * invented.
 */
export function renderBook(spec) {
  // Pass one: learn where the headings fall.
  const probe = new Book(spec, { collecting: true });
  probe.cover();
  for (const chapter of spec.chapters) {
    probe.chapter(chapter.title);
    probe.blocks(chapter.blocks);
  }

  // The contents page needs the room its own entries take.
  const perPage = Math.floor((PAGE_H - MARGIN_TOP - MARGIN_BOTTOM - 38) / 17);
  const tocPages = Math.max(1, Math.ceil(probe.headings.length / perPage));

  // Pass two: for real, with every page number shifted past the contents.
  const book = new Book(spec, { tocPages });
  book.cover();
  book.contents(probe.headings.map((h) => ({ ...h, page: h.page + tocPages })));
  for (const chapter of spec.chapters) {
    book.chapter(chapter.title);
    book.blocks(chapter.blocks);
  }

  const doc = book.doc;
  doc.setProperties({
    title: spec.title,
    subject: spec.subtitle || '',
    author: 'The Black Phoenix Company',
    keywords: spec.keywords || '',
  });

  return {
    buffer: Buffer.from(doc.output('arraybuffer')),
    pages: doc.getNumberOfPages(),
    headings: probe.headings,
  };
}

export const PDF_MIME = 'application/pdf';
