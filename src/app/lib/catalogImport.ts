/**
 * Reading a supplier's price list.
 *
 * WHY THIS IS ITS OWN FILE, WITH TESTS
 *
 * Because everything it does is quietly wrong rather than loudly wrong. A CSV
 * splitter that does not understand quotes turns `"Joist, 2x8", 14.20` into
 * three columns and files the price as a product name. A price parser that does
 * not strip a currency symbol reads `$14.20` as NaN and drops the line. A header
 * matcher that insists on the word "SKU" refuses every supplier who writes
 * "Item #".
 *
 * None of those throw. They produce a catalogue that looks imported and is
 * wrong, and the first anybody hears of it is a quote with the wrong price on
 * it — which is money, someone else's, on a document with our name at the top.
 *
 * So the parsing is separate from the screen and covered by tests, and the
 * screen shows what it is about to do before it does it.
 */

/** One line as it will be sent to the server. */
export interface CatalogRow {
  name: string;
  sku: string;
  category: string;
  unit: string;
  price: number;
  availability: string;
  leadTimeDays: number | null;
  /** The supplier's address for the product photograph. Never the image itself. */
  image: string;
}

/** A row that could not be used, and why — reported, never dropped in silence. */
export interface RejectedRow {
  /** 1-based, counting the header, so it matches what the spreadsheet shows. */
  line: number;
  reason: string;
  raw: string[];
}

/** Our columns, and what a supplier might plausibly call each one. */
export type CatalogField = 'name' | 'sku' | 'category' | 'unit' | 'price' | 'availability' | 'leadTimeDays' | 'image';

export const REQUIRED_FIELDS: CatalogField[] = ['name', 'price'];

export const FIELD_LABELS: Record<CatalogField, string> = {
  name: 'Name',
  sku: 'SKU',
  category: 'Category',
  unit: 'Unit',
  price: 'Price',
  availability: 'Availability',
  leadTimeDays: 'Lead time (days)',
  image: 'Image address',
};

/**
 * Header names seen in the wild, lowercased and stripped of punctuation.
 *
 * Ordered most specific first: 'unit price' has to be tried before 'unit', or a
 * column called "Unit Price" would be mapped to the unit of measure and the
 * price column would go unfound.
 */
const FIELD_ALIASES: Array<[CatalogField, string[]]> = [
  ['price', ['unitprice', 'listprice', 'yourprice', 'netprice', 'price', 'cost', 'unitcost', 'list', 'net', 'rate']],
  ['sku', ['sku', 'itemnumber', 'item', 'itemno', 'itemcode', 'partnumber', 'partno', 'partcode', 'productcode', 'mpn', 'modelnumber', 'model', 'code']],
  ['name', ['name', 'description', 'productname', 'itemdescription', 'itemname', 'product', 'title', 'desc']],
  ['unit', ['unit', 'uom', 'unitofmeasure', 'units', 'each', 'measure', 'per']],
  ['category', ['category', 'productcategory', 'group', 'productgroup', 'class', 'department', 'type']],
  ['availability', ['availability', 'available', 'stock', 'stockstatus', 'instock', 'status']],
  ['leadTimeDays', ['leadtime', 'leadtimedays', 'leaddays', 'daystoship', 'shipsin', 'lead']],
  // A picture is a URL in the file, not the picture. The server fetches it,
  // checks it and keeps its own copy — see productImages.tsx for why.
  ['image', ['image', 'imageurl', 'imagelink', 'imagehref', 'photo', 'photourl', 'picture', 'pictureurl', 'img', 'imgurl', 'thumbnail', 'thumbnailurl', 'productimage', 'imageaddress']],
];

const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Split CSV text into rows of cells.
 *
 * Handles quoted fields, commas and newlines inside quotes, doubled quotes as an
 * escape, both line ending conventions, and a UTF-8 byte order mark — which
 * Excel puts at the front of every file it exports and which would otherwise
 * become part of the first column's name, so nothing matches it.
 *
 * Tabs are accepted as well as commas: a "CSV" exported from Excel on a machine
 * with European locale settings is frequently tab or semicolon separated, and
 * refusing it would be refusing a file the vendor believes is correct.
 */
export function parseDelimited(text: string): string[][] {
  const body = text.replace(/^﻿/, '');
  if (!body.trim()) return [];

  const delimiter = guessDelimiter(body);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];

    if (inQuotes) {
      if (ch === '"') {
        // A doubled quote inside a quoted field is one literal quote.
        if (body[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') { inQuotes = true; continue; }
    if (ch === delimiter) { row.push(cell); cell = ''; continue; }
    if (ch === '\r') continue;
    if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
    cell += ch;
  }
  row.push(cell);
  rows.push(row);

  // Trailing blank lines are an artefact of every export, not data.
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

/**
 * Which character separates the columns.
 *
 * Counted on the first line only, and outside quotes is not attempted — a
 * heuristic that is right on every real export beats a parser that is right in
 * theory and unreadable.
 */
function guessDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const counts: Array<[string, number]> = [
    [',', (firstLine.match(/,/g) || []).length],
    ['\t', (firstLine.match(/\t/g) || []).length],
    [';', (firstLine.match(/;/g) || []).length],
  ];
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ',';
}

/**
 * A first guess at which column is which.
 *
 * A guess, deliberately — it is shown to the vendor to correct rather than
 * applied. Getting the price column wrong is not the sort of mistake to make
 * silently on somebody's behalf.
 *
 * Returns a map of our field to the column index, with anything unrecognised
 * left out rather than guessed at by position.
 */
export function guessMapping(header: string[]): Partial<Record<CatalogField, number>> {
  const cols = header.map(h => normalise(h));
  const out: Partial<Record<CatalogField, number>> = {};
  const taken = new Set<number>();

  for (const [field, aliases] of FIELD_ALIASES) {
    // Exact match first, then a contained match, so "price" beats "pricegroup".
    let idx = cols.findIndex((c, i) => !taken.has(i) && aliases.includes(c));
    if (idx === -1) {
      idx = cols.findIndex((c, i) => !taken.has(i) && c.length > 2 && aliases.some(a => c === a || c.startsWith(a)));
    }
    if (idx !== -1) { out[field] = idx; taken.add(idx); }
  }
  return out;
}

/**
 * A price from whatever the supplier wrote.
 *
 * Currency symbols, thousands separators and trailing notes are stripped.
 * Parentheses mean a negative in accounting exports and a negative price is
 * never right on a price list, so it is rejected rather than turned positive.
 *
 * Returns null when there is no number to be had, which the caller reports as a
 * rejected row. Returning zero would put a free product in the catalogue.
 */
export function parsePrice(raw: string): number | null {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (/^\(.*\)$/.test(s)) return null;

  // Everything except digits, separators and a leading minus.
  const cleaned = s.replace(/[^0-9.,-]/g, '');
  if (!cleaned || !/[0-9]/.test(cleaned)) return null;

  // "1.234,56" is European; "1,234.56" is not. Whichever separator appears last
  // is the decimal point.
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  let normalised = cleaned;
  if (lastComma > -1 && lastDot > -1) {
    normalised = lastComma > lastDot
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(/,/g, '');
  } else if (lastComma > -1) {
    // A lone comma is a decimal point when it separates exactly two digits from
    // the end, and a thousands separator otherwise: "14,20" against "1,400".
    normalised = /,\d{2}$/.test(cleaned) ? cleaned.replace(',', '.') : cleaned.replace(/,/g, '');
  }

  const n = Number(normalised);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

/** Lead time in days, or null when the column is absent or unreadable. */
export function parseLeadTime(raw: string): number | null {
  const m = /(\d+)/.exec(String(raw ?? ''));
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 0 && n <= 3650 ? n : null;
}

export interface ParsedCatalog {
  rows: CatalogRow[];
  rejected: RejectedRow[];
  /** Rows dropped as exact repeats of an earlier SKU in the same file. */
  duplicates: number;
}

/**
 * Turn the sheet into lines, given the mapping the vendor confirmed.
 *
 * Every row that cannot be used is returned with its line number and a reason.
 * Nothing is dropped quietly: a price list that imports 1,830 of 1,842 lines
 * without saying so becomes twelve quotes with a missing material.
 */
/**
 * Which row is the header.
 *
 * WHY THIS IS NOT ALWAYS ROW ONE
 *
 * Because a price list is a document before it is a data file. A building
 * supply's export from their ERP opens with the company name, an effective
 * date, sometimes a customer number and a blank line, and only then the column
 * headings. Assuming row one means `guessMapping` reads "SMITH BUILDING SUPPLY"
 * as the column names, finds nothing, and every single line is then rejected
 * for having no product name — a file that is perfectly good, refused in full.
 *
 * HOW IT DECIDES
 *
 * The header is the row that looks most like column headings, scored by how
 * many of our fields `guessMapping` can recognise in it. A row naming both a
 * product and a price beats a row naming neither, which is the whole test.
 * Ties go to the earliest row, because a data row can coincidentally score as
 * well as a header and the header comes first.
 *
 * It is a guess, and it is shown to the operator with the row it picked so
 * they can move it. A guess somebody can see and correct is worth far more
 * than a rule that is right more often and silent when it is wrong.
 */
export function findHeaderRow(data: string[][], maxScan = 15): number {
  let best = 0;
  let bestScore = -1;
  const limit = Math.min(data.length, maxScan);

  for (let i = 0; i < limit; i++) {
    const row = data[i] || [];
    // A row of one filled cell is a title, not a heading, however it scores.
    if (row.filter((c) => String(c ?? '').trim() !== '').length < 2) continue;

    const mapping = guessMapping(row);
    const found = Object.keys(mapping).length;
    // Required fields carry the decision: a header that names neither a product
    // nor a price is not the header, whatever else it happens to match.
    const required = REQUIRED_FIELDS.filter((f) => mapping[f] !== undefined).length;
    const score = required * 10 + found;

    if (score > bestScore) { bestScore = score; best = i; }
  }

  return bestScore <= 0 ? 0 : best;
}

export function buildRows(
  data: string[][],
  mapping: Partial<Record<CatalogField, number>>,
  hasHeader = true,
  headerRow = 0,
): ParsedCatalog {
  const rows: CatalogRow[] = [];
  const rejected: RejectedRow[] = [];
  const seenSku = new Set<string>();
  let duplicates = 0;

  // Everything above the header is preamble — a supplier's title block, an
  // effective date, a blank row — and is neither data nor a rejection worth
  // reporting. `headerRow` is 0 for a file whose first line is the header,
  // which is what every caller did before this existed.
  const body = hasHeader ? data.slice(headerRow + 1) : data.slice(headerRow);
  const offset = (hasHeader ? headerRow + 2 : headerRow + 1); // 1-based, past the header

  const at = (r: string[], f: CatalogField) => {
    const i = mapping[f];
    return i === undefined ? '' : String(r[i] ?? '').trim();
  };

  body.forEach((raw, i) => {
    const line = i + offset;
    const name = at(raw, 'name').slice(0, 200);
    if (!name) {
      rejected.push({ line, reason: 'No product name in the name column.', raw });
      return;
    }

    const price = parsePrice(at(raw, 'price'));
    if (price === null) {
      rejected.push({
        line,
        reason: `No usable price — the price column reads "${at(raw, 'price') || '(empty)'}".`,
        raw,
      });
      return;
    }

    const sku = at(raw, 'sku').slice(0, 60);
    // Same SKU twice in one file is a supplier's export artefact, not two
    // products. The first wins, because the later one is usually the repeat.
    if (sku) {
      const key = sku.toLowerCase();
      if (seenSku.has(key)) { duplicates++; return; }
      seenSku.add(key);
    }

    rows.push({
      name,
      sku,
      category: at(raw, 'category').slice(0, 80),
      unit: at(raw, 'unit').slice(0, 24) || 'each',
      price,
      availability: at(raw, 'availability').slice(0, 80),
      leadTimeDays: parseLeadTime(at(raw, 'leadTimeDays')),
      // Capped generously: a real product URL with a signed query string is long.
      image: at(raw, 'image').slice(0, 2000),
    });
  });

  return { rows, rejected, duplicates };
}

/** What is still missing before an import can run. */
export function missingRequired(mapping: Partial<Record<CatalogField, number>>): CatalogField[] {
  return REQUIRED_FIELDS.filter(f => mapping[f] === undefined);
}
