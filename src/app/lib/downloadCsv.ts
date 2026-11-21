/**
 * Hand the browser a CSV of rows a screen is already showing.
 *
 * WHY THIS EXISTS
 *
 * The November 2026 audit's C1 bucket — "the whole handler is a message,
 * nothing happens" — included three Export buttons on the portals an
 * advertiser, a vendor and an investor log into:
 *
 *   Campaign Performance  → toast.success('Downloading report...')
 *   Revenue Trends        → toast.success('Downloading report...')
 *   Portfolio Performance → toast.success('Downloading report...')
 *
 * Nothing downloaded. The toast even said "Downloading", so the only possible
 * reading was that a file was on its way and the browser had lost it.
 *
 * All three charts are drawn from real server data — ad impressions, purchase
 * orders, paid distributions — so there was nothing to build but the download
 * itself. That makes these three a completion rather than something to
 * disable: a vendor reconciling their own revenue is the whole reason the
 * button is there.
 *
 * WHY CSV AND NOT A PDF
 *
 * The export is for reconciling against someone's own books, which means a
 * spreadsheet. A PDF of a chart is a picture of the numbers.
 */

/**
 * A spreadsheet treats a cell opening with `=`, `+`, `-` or `@` as a formula,
 * so a value from a customer-supplied name could execute on open. Prefixing an
 * apostrophe is the standard defence and keeps the text readable.
 */
const FORMULA = /^[=+\-@\t\r]/;

function cell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let text = String(value);
  if (FORMULA.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Rows as CSV text.
 *
 * `columns` fixes the order and leaves out anything the screen does not show —
 * the vendor rows carry a `sort` key used only for ordering, and shipping it
 * would put an internal field in a customer's download.
 */
export function toCsv(rows: Array<Record<string, unknown>>, columns?: string[]): string {
  const cols = columns?.length
    ? columns
    : Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const head = cols.map(cell).join(',');
  const body = rows.map((row) => cols.map((col) => cell(row[col])).join(','));
  // CRLF: Excel on Windows is where these land.
  return [head, ...body].join('\r\n');
}

/**
 * Save `rows` as `filename`. Returns false — and downloads nothing — when
 * there are no rows, so the caller can say "there is nothing to export yet"
 * instead of handing over an empty file and calling it a report.
 */
export function downloadCsv(
  filename: string,
  rows: Array<Record<string, unknown>>,
  columns?: string[],
): boolean {
  if (!Array.isArray(rows) || rows.length === 0) return false;

  // The BOM is what makes Excel read the file as UTF-8 rather than as the
  // local codepage, which otherwise mangles any name with an accent in it.
  const blob = new Blob(['﻿', toCsv(rows, columns)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  /*
   * Revoked late, not in the same tick. This app is used on an iPhone, and
   * Safari there reads the blob after the click returns — revoking
   * immediately cancels the download and looks exactly like the bug this
   * function was written to fix.
   */
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}

/** `campaign-performance-2026-11-21.csv` */
export function datedFilename(stem: string): string {
  return `${stem}-${new Date().toISOString().slice(0, 10)}.csv`;
}
