/**
 * Reading a supplier's price list when it arrives as a spreadsheet.
 *
 * WHY THIS IS SEPARATE FROM `catalogImport.ts`
 *
 * That file is pure: text in, rows out, no dependencies, which is what lets it
 * be reasoned about and tested. Spreadsheet parsing needs a library, and the
 * library is large. Keeping it here means `catalogImport` stays dependency-free
 * and the library is loaded only when somebody actually picks an `.xlsx` — a
 * dynamic import, so a vendor uploading a CSV never downloads it at all.
 *
 * WHY EXCELJS RATHER THAN SHEETJS
 *
 * SheetJS is the usual answer and its npm package is frozen at 0.18.5: the
 * project stopped publishing there, and the fixes for its prototype-pollution
 * and ReDoS advisories exist only in later versions distributed elsewhere. This
 * code parses files supplied by people outside the company, which is precisely
 * the threat those advisories describe, so the stale package is not an option.
 *
 * WHAT IT WILL NOT READ
 *
 * Legacy `.xls` (the pre-2007 binary format) and `.pdf`. Both are refused by
 * name rather than attempted and failed, so the vendor is told what to send
 * instead of watching an upload do nothing.
 */

/** What the file picker accepts, and what `isSpreadsheet` recognises. */
export const SPREADSHEET_EXTENSIONS = ['.xlsx', '.xlsm'];

/** Refused explicitly, with something useful to say about each. */
const UNREADABLE: Array<[string, string]> = [
  ['.xls', 'That is the older Excel format. Open it in Excel and save as .xlsx, or export it as CSV.'],
  ['.pdf', 'A PDF cannot be read as a price list. Ask them for the spreadsheet or CSV it was printed from.'],
  ['.doc', 'A Word document cannot be read as a price list. Ask for a spreadsheet or CSV.'],
  ['.docx', 'A Word document cannot be read as a price list. Ask for a spreadsheet or CSV.'],
];

/** A cap, because the whole file is read into the browser's memory at once. */
export const MAX_WORKBOOK_BYTES = 25 * 1024 * 1024;

/** A ceiling on rows read out of a sheet, matching the catalogue's own. */
const MAX_SHEET_ROWS = 25000;

const extensionOf = (name: string) => {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot).toLowerCase();
};

export function isSpreadsheet(fileName: string): boolean {
  return SPREADSHEET_EXTENSIONS.includes(extensionOf(fileName));
}

/** The reason we cannot read this file, or null if we can try. */
export function unreadableReason(fileName: string): string | null {
  const ext = extensionOf(fileName);
  const known = UNREADABLE.find(([e]) => e === ext);
  return known ? known[1] : null;
}

/**
 * One cell as text.
 *
 * ExcelJS returns whatever the cell holds, which for a real supplier file
 * includes rich text (a part number with one word bolded), formula results (a
 * price computed from a list price and a discount), dates, and hyperlinks. Each
 * arrives as an object, and `String(value)` on any of them yields
 * "[object Object]" — which then imports as a product named exactly that.
 */
function cellText(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);

  // Rich text: { richText: [{ text }, ...] }
  if (Array.isArray(value.richText)) {
    return value.richText.map((r: any) => String(r?.text ?? '')).join('').trim();
  }
  // A formula cell carries both the formula and what it evaluated to. The
  // result is the price; the formula is how they got there and is not data.
  if (value.result !== undefined) return cellText(value.result);
  // Hyperlink: { text, hyperlink }
  if (typeof value.text === 'string') return value.text.trim();
  // An error cell — #N/A, #REF! — is not a value and must not become one.
  if (value.error) return '';

  return '';
}

export interface WorkbookGrid {
  grid: string[][];
  sheetName: string;
  /** Every sheet in the file, so the operator can pick a different one. */
  sheetNames: string[];
  truncated: boolean;
}

/**
 * Read a sheet out of an xlsx file as a plain grid, the same shape
 * `parseDelimited` produces, so everything downstream is unchanged.
 *
 * `sheetName` selects a sheet; omitted, the first non-empty one is used. A
 * supplier's workbook often opens on a cover sheet, and defaulting to sheet one
 * regardless would read a logo and a phone number.
 */
export async function readWorkbookGrid(file: File, sheetName?: string): Promise<WorkbookGrid> {
  const refusal = unreadableReason(file.name);
  if (refusal) throw new Error(refusal);
  if (file.size > MAX_WORKBOOK_BYTES) {
    throw new Error(`That file is larger than ${Math.round(MAX_WORKBOOK_BYTES / 1024 / 1024)}MB. Export it as CSV instead.`);
  }

  // Loaded only now, so a CSV upload never pays for the library.
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());

  const sheetNames = workbook.worksheets.map((w) => w.name);
  if (!sheetNames.length) throw new Error('That workbook has no sheets in it.');

  const chosen = sheetName
    ? workbook.worksheets.find((w) => w.name === sheetName)
    : workbook.worksheets.find((w) => w.actualRowCount > 1) || workbook.worksheets[0];
  if (!chosen) throw new Error(`That workbook has no sheet called "${sheetName}".`);

  const grid: string[][] = [];
  let truncated = false;
  chosen.eachRow({ includeEmpty: false }, (row) => {
    if (grid.length >= MAX_SHEET_ROWS) { truncated = true; return; }
    const cells: string[] = [];
    // `row.values` is 1-based with a hole at index 0, which is why this is a
    // manual loop rather than a map over it.
    const width = row.cellCount;
    for (let c = 1; c <= width; c++) cells.push(cellText(row.getCell(c).value));
    if (cells.some((v) => v !== '')) grid.push(cells);
  });

  return { grid, sheetName: chosen.name, sheetNames, truncated };
}

/**
 * The file to send a supplier who has not sent one yet.
 *
 * Header row only, deliberately. A template carrying example rows is a template
 * somebody imports unchanged, and then the catalogue holds two products nobody
 * sells. What each column means belongs on the screen beside the download,
 * where it cannot be imported.
 */
export function catalogTemplateCsv(): string {
  return 'Name,SKU,Category,Unit,Price,Availability,Lead time (days)\n';
}
