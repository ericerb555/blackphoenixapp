/**
 * Shared workbook styling for the digital products we sell.
 *
 * WHY THIS IS SHARED
 *
 * Four calculators, two maintenance planners and three bundles all ship
 * spreadsheets, and the three AI reports render a workbook alongside their PDF.
 * If each one styles itself, a customer who buys two of them gets two products
 * that look like different companies made them — which is exactly the thing a
 * $29 download is judged on. One palette, one set of formats, one header.
 *
 * Everything here is presentation only. No product's arithmetic lives in this
 * file: the formulas belong to the product, because that is the part a buyer is
 * actually paying for and it has to be readable in one place.
 */

/** Charcoal and amber — the store's own palette, not Excel's defaults. */
export const INK = 'FF1C1917';
export const INK_SOFT = 'FF57534E';
export const AMBER = 'FFF59E0B';
export const AMBER_PALE = 'FFFEF3C7';
export const PAPER = 'FFFFFFFF';
export const RULE = 'FFE7E5E4';
export const INPUT_FILL = 'FFFFFBEB';
export const GOOD = 'FF15803D';
export const WARN = 'FFB45309';
export const BAD = 'FFB91C1C';

export const MONEY = '$#,##0';
export const MONEY_CENTS = '$#,##0.00';
export const PERCENT = '0.0%';
export const NUMBER = '#,##0';
export const YEAR = '0';

const FONT = 'Calibri';

/** A product's workbook, with the metadata a buyer sees in file properties. */
export function newWorkbook({ title, subject, keywords }) {
  return {
    creator: 'The Black Phoenix Company',
    lastModifiedBy: 'The Black Phoenix Company',
    created: new Date(),
    title,
    subject,
    keywords,
  };
}

export function applyWorkbookMeta(wb, meta) {
  Object.assign(wb, meta);
  wb.calcProperties = { fullCalcOnLoad: true };
}

/**
 * The band across the top of every sheet: product name, then the sheet's own
 * job in a sentence. The sentence matters more than it looks — a spreadsheet
 * people have paid for should never need a covering email to explain it.
 */
export function sheetHeader(ws, { title, blurb, lastColumn = 'H' }) {
  ws.mergeCells(`A1:${lastColumn}1`);
  const band = ws.getCell('A1');
  band.value = title;
  band.font = { name: FONT, size: 15, bold: true, color: { argb: PAPER } };
  band.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK } };
  band.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(1).height = 30;

  ws.mergeCells(`A2:${lastColumn}2`);
  const sub = ws.getCell('A2');
  sub.value = blurb;
  sub.font = { name: FONT, size: 10, italic: true, color: { argb: INK_SOFT } };
  sub.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };
  ws.getRow(2).height = 26;
  ws.getRow(3).height = 6;
}

/** A section title inside a sheet. */
export function sectionTitle(ws, row, text, lastColumn = 'H') {
  ws.mergeCells(`A${row}:${lastColumn}${row}`);
  const cell = ws.getCell(`A${row}`);
  cell.value = text;
  cell.font = { name: FONT, size: 11, bold: true, color: { argb: INK } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AMBER_PALE } };
  cell.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(row).height = 22;
}

/** Column headings for a table. */
export function tableHead(ws, row, headings, widths) {
  headings.forEach((text, i) => {
    const cell = ws.getRow(row).getCell(i + 1);
    cell.value = text;
    cell.font = { name: FONT, size: 10, bold: true, color: { argb: PAPER } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INK_SOFT } };
    cell.alignment = { vertical: 'middle', horizontal: i === 0 ? 'left' : 'center', wrapText: true };
    cell.border = { bottom: { style: 'thin', color: { argb: INK } } };
  });
  ws.getRow(row).height = 30;
  if (widths) widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
}

/**
 * Mark a cell as something the buyer is meant to type in.
 *
 * Pale amber fill and a border, used consistently across every product, so the
 * rule "if it is shaded, change it; if it is not, it is calculated for you" can
 * be stated once on the first sheet and hold everywhere.
 */
export function inputCell(cell, { numFmt, bold = false } = {}) {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INPUT_FILL } };
  cell.font = { name: FONT, size: 10, bold, color: { argb: INK } };
  cell.border = {
    top: { style: 'thin', color: { argb: RULE } },
    left: { style: 'thin', color: { argb: RULE } },
    bottom: { style: 'thin', color: { argb: RULE } },
    right: { style: 'thin', color: { argb: RULE } },
  };
  if (numFmt) cell.numFmt = numFmt;
  return cell;
}

/** A calculated cell: never shaded, so it reads as "do not type here". */
export function calcCell(cell, { numFmt, bold = false, color = INK } = {}) {
  cell.font = { name: FONT, size: 10, bold, color: { argb: color } };
  if (numFmt) cell.numFmt = numFmt;
  return cell;
}

/** A label in the left column of a form. */
export function labelCell(cell, text, { bold = false, indent = 0 } = {}) {
  cell.value = text;
  cell.font = { name: FONT, size: 10, bold, color: { argb: INK } };
  cell.alignment = { vertical: 'middle', wrapText: true, indent };
  return cell;
}

/** Explanatory text under a figure — the "why this number" line. */
export function noteCell(ws, range, text) {
  ws.mergeCells(range);
  const cell = ws.getCell(range.split(':')[0]);
  cell.value = text;
  cell.font = { name: FONT, size: 9, italic: true, color: { argb: INK_SOFT } };
  cell.alignment = { vertical: 'top', wrapText: true, indent: 1 };
  return cell;
}

/** A headline figure, for a results sheet. */
export function bigNumber(ws, cellRef, { numFmt, color = INK } = {}) {
  const cell = ws.getCell(cellRef);
  cell.font = { name: FONT, size: 20, bold: true, color: { argb: color } };
  cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  if (numFmt) cell.numFmt = numFmt;
  return cell;
}

/**
 * A label / value / explanation row — the shape every setup sheet is made of.
 *
 * Extracted because four calculators were each writing the same six lines, and
 * because the explanation column is the part that is easiest to skip and does
 * the most work: a buyer who has to guess what "effective age" means has been
 * sold a grid, not a tool.
 */
export function field(ws, row, label, opts = {}) {
  const {
    value, formula, numFmt, input = false, bold = false, note, indent = 0,
    valueColumn = 'B', noteColumn = 'D',
  } = opts;
  labelCell(ws.getCell(`A${row}`), label, { bold, indent });
  const cell = ws.getCell(`${valueColumn}${row}`);
  if (input) inputCell(cell, { numFmt, bold });
  else calcCell(cell, { numFmt, bold });
  if (formula) cell.value = { formula };
  else if (value !== undefined) cell.value = value;
  if (note) noteCell(ws, `${noteColumn}${row}:${noteColumn}${row}`, note);
  return cell;
}

/**
 * The Guide sheet every product opens with.
 *
 * Each product ships one, they all read the same way, and the content is the
 * product's own: `blocks` is [heading, [paragraph, ...]]. A download that needs
 * a covering email to explain it is not finished.
 */
export function guideSheet(wb, { title, blurb, blocks, tabColor = INK, width = 104 }) {
  const ws = wb.addWorksheet('Guide', { properties: { tabColor: { argb: tabColor } } });
  ws.getColumn(1).width = 4;
  ws.getColumn(2).width = width;
  sheetHeader(ws, { title, blurb, lastColumn: 'B' });

  let row = 5;
  for (const [heading, lines] of blocks) {
    sectionTitle(ws, row, heading, 'B');
    row += 1;
    for (const line of lines) {
      const cell = ws.getCell(`B${row}`);
      cell.value = line;
      cell.font = { name: FONT, size: 10, color: { argb: INK } };
      cell.alignment = { wrapText: true, vertical: 'top' };
      ws.getRow(row).height = Math.max(16, Math.ceil(line.length / (width - 9)) * 15 + 4);
      row += 1;
    }
    row += 1;
  }

  printSetup(ws, { title: `${title} — Guide` });
  return ws;
}

/** Light horizontal rules on a data table, so long tables stay readable. */
export function zebra(ws, firstRow, lastRow, lastColumnIndex) {
  for (let r = firstRow; r <= lastRow; r += 1) {
    for (let c = 1; c <= lastColumnIndex; c += 1) {
      const cell = ws.getRow(r).getCell(c);
      cell.border = { bottom: { style: 'hair', color: { argb: RULE } } };
      if (!cell.font) cell.font = { name: FONT, size: 10, color: { argb: INK } };
    }
  }
}

/**
 * The footer every sheet carries: who made it, and that the buyer's own
 * numbers replace the starting assumptions. Printed, not just on screen.
 */
export function printSetup(ws, { landscape = false, fitToWidth = 1, title } = {}) {
  ws.pageSetup = {
    orientation: landscape ? 'landscape' : 'portrait',
    fitToPage: true,
    fitToWidth,
    fitToHeight: 0,
    margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    horizontalCentered: true,
  };
  // Only set keys we actually have: exceljs writes what is here straight into
  // the sheet XML, and an undefined header becomes a malformed file that Excel
  // offers to "repair" — which, on something somebody paid for, is fatal.
  const footer = '&L&"Calibri,Italic"&8theblackphoenixcompany.com&C&"Calibri,Regular"&9Page &P of &N&R&"Calibri,Italic"&8Your figures replace the starting assumptions';
  ws.headerFooter = title
    ? { oddHeader: `&L&"Calibri,Bold"&10${title}&R&"Calibri,Italic"&9The Black Phoenix Company`, oddFooter: footer }
    : { oddFooter: footer };
}
