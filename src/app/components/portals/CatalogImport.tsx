/**
 * Importing a supplier's price list into their catalogue.
 *
 * WHY IT SHOWS THE MAPPING BEFORE IT RUNS
 *
 * Because no two suppliers name their columns the same way, and the one that
 * matters most is the one most easily got wrong: a sheet with both "Unit Price"
 * and "Unit" on it will map backwards under any naive matcher, and the result is
 * a catalogue where every product costs "each". Nothing about that looks broken
 * until a quote goes out.
 *
 * So the columns are guessed, the guess is shown, and the vendor corrects it.
 * Then the rows are built and counted — kept, rejected and why — and only then
 * is anything sent.
 *
 * WHY THE REJECTED ROWS ARE LISTED RATHER THAN COUNTED
 *
 * A price list that imports 1,830 of 1,842 lines and says "1,830 imported" is
 * twelve materials that will be missing from a quote, discovered on site. The
 * line numbers match the vendor's spreadsheet so they can go and look.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { Download, Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  parseDelimited, guessMapping, buildRows, missingRequired, findHeaderRow,
  FIELD_LABELS, REQUIRED_FIELDS,
  type CatalogField, type ParsedCatalog,
} from '../../lib/catalogImport';

/** Matches the server's per-request ceiling. */
const BATCH = 500;

interface Props {
  vendorId: string;
  /** Authorised headers, supplied by the portal so there is one auth story. */
  headers: () => Record<string, string>;
  apiBase: string;
  /** Called after a successful import so the catalogue list refreshes. */
  onImported: () => void | Promise<void>;
}

import {
  isSpreadsheet, unreadableReason, readWorkbookGrid, catalogTemplateCsv,
  SPREADSHEET_EXTENSIONS,
} from '../../lib/catalogWorkbook';

const FIELDS: CatalogField[] = ['name', 'sku', 'price', 'unit', 'category', 'availability', 'leadTimeDays'];

export default function CatalogImport({ vendorId, headers, apiBase, onImported }: Props) {
  const [fileName, setFileName] = useState('');
  const [grid, setGrid] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Partial<Record<CatalogField, number>>>({});
  const [hasHeader, setHasHeader] = useState(true);
  // Which row holds the column names. Guessed, then shown, because a supplier's
  // export usually opens with a title block and an effective date.
  const [headerRow, setHeaderRow] = useState(0);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheetName, setSheetName] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ added: number; updated: number; rejected: Array<{ line: number; reason: string }> } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const header = grid[headerRow] || [];

  const parsed: ParsedCatalog | null = useMemo(
    () => (grid.length && missingRequired(mapping).length === 0
      ? buildRows(grid, mapping, hasHeader, headerRow)
      : null),
    [grid, mapping, hasHeader, headerRow],
  );

  /** Apply a grid however it was produced, and guess where its header is. */
  const useGrid = useCallback((rows: string[][], name: string) => {
    const at = findHeaderRow(rows);
    setFileName(name);
    setGrid(rows);
    setHeaderRow(at);
    setMapping(guessMapping(rows[at] || []));
    setHasHeader(true);
  }, []);

  const take = useCallback(async (file: File, pickSheet?: string) => {
    setResult(null);
    const refusal = unreadableReason(file.name);
    if (refusal) { toast.error(refusal); return; }

    setReading(true);
    try {
      if (isSpreadsheet(file.name)) {
        const wb = await readWorkbookGrid(file, pickSheet);
        if (!wb.grid.length) { toast.error('That sheet has no rows in it.'); return; }
        setPendingFile(file);
        setSheetNames(wb.sheetNames);
        setSheetName(wb.sheetName);
        if (wb.truncated) toast.warning('Only the first 25,000 rows were read.');
        useGrid(wb.grid, file.name);
      } else {
        const rows = parseDelimited(await file.text());
        if (!rows.length) { toast.error('That file has no rows in it.'); return; }
        setPendingFile(null);
        setSheetNames([]);
        setSheetName('');
        useGrid(rows, file.name);
      }
    } catch (err: any) {
      toast.error(err?.message || 'That file could not be read.');
    } finally {
      setReading(false);
    }
  }, [useGrid]);

  /** Download the file to send a supplier who has not sent one yet. */
  const downloadTemplate = useCallback(() => {
    const blob = new Blob([catalogTemplateCsv()], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'catalogue-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const reset = () => {
    setGrid([]); setMapping({}); setFileName(''); setResult(null); setProgress(0);
    setHeaderRow(0); setSheetNames([]); setSheetName(''); setPendingFile(null);
  };

  const run = useCallback(async () => {
    if (!parsed || !parsed.rows.length || !vendorId) return;
    setImporting(true);
    setProgress(0);
    setResult(null);

    // The line number travels with each row so a server-side rejection can be
    // pointed at the vendor's spreadsheet rather than at our batch position.
    const withLines = parsed.rows.map((r, i) => ({ ...r, line: i + (hasHeader ? 2 : 1) }));

    const totals = { added: 0, updated: 0, rejected: [...parsed.rejected.map(r => ({ line: r.line, reason: r.reason }))] };
    try {
      for (let i = 0; i < withLines.length; i += BATCH) {
        const slice = withLines.slice(i, i + BATCH);
        const res = await fetch(`${apiBase}/vendor-catalog/${encodeURIComponent(vendorId)}/import`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ items: slice }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.success) throw new Error(json?.error || `The server responded ${res.status}`);
        totals.added += Number(json.added) || 0;
        totals.updated += Number(json.updated) || 0;
        if (Array.isArray(json.rejected)) totals.rejected.push(...json.rejected);
        setProgress(Math.min(i + BATCH, withLines.length) / withLines.length);
      }
      setResult(totals);
      toast.success(`${totals.added} added, ${totals.updated} updated.`);
      await onImported();
    } catch (e: any) {
      // Partial progress is reported rather than hidden: some of the list did
      // land, and a vendor who re-runs the whole file needs to know it will
      // update rather than duplicate.
      setResult(totals);
      toast.error(e?.message || 'The import stopped partway.');
    } finally {
      setImporting(false);
    }
  }, [parsed, vendorId, headers, apiBase, hasHeader, onImported]);

  const missing = missingRequired(mapping);
  const input = 'w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-2 py-1.5 text-xs text-white';

  return (
    <div className="rounded-2xl border border-[#2A2A2A] bg-[#111] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <FileSpreadsheet className="h-4 w-4 text-[#ea580c]" /> Import a price list
          </h3>
          <p className="mt-0.5 text-[11px] text-gray-500">
            Export from whatever system you use and drop the file here. CSV, or anything
            saved as one — tabs and semicolons are fine too.
          </p>
        </div>
        {grid.length > 0 && (
          <button onClick={reset} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white">
            <X className="h-3.5 w-3.5" /> Start over
          </button>
        )}
      </div>

      {grid.length === 0 ? (
        <>
          <button
            onClick={() => fileInput.current?.click()}
            disabled={!vendorId || reading}
            className="mt-3 flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-[#2A2A2A] px-4 py-8 text-sm text-gray-400 transition hover:border-orange-500/40 hover:text-white disabled:opacity-40"
          >
            <Upload className="h-6 w-6 text-[#ea580c]" />
            {reading ? 'Reading the file…' : 'Choose a file'}
            <span className="text-[11px] text-gray-600">
              Excel (.xlsx) or CSV. Whatever their system exports.
            </span>
          </button>

          {/* What to ask a supplier for, when there is no file yet.
              The template carries the header row and nothing else — a template
              with example rows is a template somebody imports unchanged, and
              then the catalogue holds two products nobody sells. What each
              column means is written here instead, where it cannot be
              imported. */}
          <div className="mt-3 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-4">
            <p className="text-xs font-semibold text-white">Haven't got their price list yet?</p>
            <p className="mt-1 text-xs text-gray-400">
              Send them this and ask them to fill it in from their system. Only <span className="text-white">Name</span>{' '}
              and <span className="text-white">Price</span> are required — everything else improves the quote and
              nothing is refused for missing it.
            </p>
            <ul className="mt-2 space-y-0.5 text-[11px] text-gray-500">
              <li><span className="text-gray-300">Name</span> — what the product is called on their invoice</li>
              <li><span className="text-gray-300">SKU</span> — their own item number, exactly as it appears on a purchase order</li>
              <li><span className="text-gray-300">Category</span> — lumber, fasteners, roofing, and so on</li>
              <li><span className="text-gray-300">Unit</span> — each, LF, sheet, box: what the price is per</li>
              <li><span className="text-gray-300">Price</span> — our price, not list</li>
              <li><span className="text-gray-300">Availability</span> — stocked, special order, discontinued</li>
              <li><span className="text-gray-300">Lead time</span> — days, for anything not on the shelf</li>
            </ul>
            <button
              onClick={downloadTemplate}
              className="mt-3 flex items-center gap-2 rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-xs text-gray-300 transition hover:border-orange-500/40 hover:text-white"
            >
              <Download className="h-3.5 w-3.5" />
              Download the template
            </button>
            <p className="mt-2 text-[11px] text-gray-600">
              Their own export works too — it does not have to match this. Column names are matched on the way in,
              and you confirm the match before anything is saved.
            </p>
          </div>
          <input
            ref={fileInput} type="file" className="hidden"
            accept={['.csv', '.tsv', '.txt', ...SPREADSHEET_EXTENSIONS,
                     'text/csv', 'text/plain', 'text/tab-separated-values'].join(',')}
            onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void take(f); }}
          />
        </>
      ) : (
        <div className="mt-3 space-y-4">
          <p className="text-xs text-gray-400">
            <span className="font-semibold text-white">{fileName}</span>
            {' · '}{Math.max(0, grid.length - headerRow - (hasHeader ? 1 : 0))} row
            {Math.max(0, grid.length - headerRow - (hasHeader ? 1 : 0)) === 1 ? '' : 's'}
          </p>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <input type="checkbox" checked={hasHeader} onChange={e => {
                setHasHeader(e.target.checked);
                // Re-guess against whichever row is now the header, or clear the
                // guess when there is no header to guess from.
                setMapping(e.target.checked ? guessMapping(grid[headerRow] || []) : {});
              }} />
              The file has column headings
            </label>

            {/* Which row they are on.
                A supplier's export opens with a title block and an effective
                date, so this is a guess. It is shown with the row it picked
                because a guess somebody can see and move is worth more than a
                rule that is silent when it is wrong. */}
            {hasHeader && grid.length > 1 && (
              <label className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                <span>Headings are on row</span>
                <select
                  className="rounded border border-[#2A2A2A] bg-[#0A0A0A] px-2 py-1 text-xs text-white"
                  value={String(headerRow)}
                  onChange={e => {
                    const at = Number(e.target.value);
                    setHeaderRow(at);
                    setMapping(guessMapping(grid[at] || []));
                  }}
                >
                  {grid.slice(0, 15).map((row, i) => (
                    <option key={i} value={String(i)}>
                      {i + 1}: {row.filter(Boolean).slice(0, 4).join(' | ').slice(0, 60) || '(blank)'}
                    </option>
                  ))}
                </select>
                {headerRow > 0 && (
                  <span className="text-gray-500">
                    — the {headerRow} row{headerRow === 1 ? '' : 's'} above are ignored
                  </span>
                )}
              </label>
            )}

            {/* Which sheet, when the workbook has more than one. A supplier's
                file often opens on a cover sheet. */}
            {sheetNames.length > 1 && pendingFile && (
              <label className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                <span>Sheet</span>
                <select
                  className="rounded border border-[#2A2A2A] bg-[#0A0A0A] px-2 py-1 text-xs text-white"
                  value={sheetName}
                  disabled={reading}
                  onChange={e => { void take(pendingFile, e.target.value); }}
                >
                  {sheetNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            )}
          </div>

          {/* ── The mapping ────────────────────────────────────────────────
              Shown rather than applied. Getting the price column wrong is not
              a mistake to make silently on somebody's behalf. */}
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-wide text-gray-500">Match your columns to ours</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {FIELDS.map(field => (
                <label key={field} className="flex items-center gap-2">
                  <span className="w-32 shrink-0 text-xs text-gray-400">
                    {FIELD_LABELS[field]}
                    {REQUIRED_FIELDS.includes(field) && <span className="text-orange-400"> *</span>}
                  </span>
                  <select
                    className={input}
                    value={mapping[field] === undefined ? '' : String(mapping[field])}
                    onChange={e => setMapping(m => {
                      const next = { ...m };
                      if (e.target.value === '') delete next[field];
                      else next[field] = Number(e.target.value);
                      return next;
                    })}
                  >
                    <option value="">— not in this file —</option>
                    {header.map((h, i) => (
                      <option key={i} value={i}>
                        {hasHeader ? (h || `Column ${i + 1}`) : `Column ${i + 1}`}
                        {!hasHeader && grid[0]?.[i] ? ` (${String(grid[0][i]).slice(0, 20)}…)` : ''}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            {missing.length > 0 && (
              <p className="mt-2 text-xs text-yellow-400">
                Still need {missing.map(f => FIELD_LABELS[f]).join(' and ')} before this can be imported.
              </p>
            )}
          </div>

          {/* ── What is about to happen ────────────────────────────────── */}
          {parsed && (
            <div className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-3">
              <p className="text-xs text-gray-300">
                <span className="font-bold text-green-400">{parsed.rows.length}</span> line
                {parsed.rows.length === 1 ? '' : 's'} ready
                {parsed.duplicates > 0 && <> · {parsed.duplicates} repeated SKU{parsed.duplicates === 1 ? '' : 's'} in the file, first kept</>}
                {parsed.rejected.length > 0 && <> · <span className="font-bold text-yellow-400">{parsed.rejected.length}</span> cannot be used</>}
              </p>

              {parsed.rows.length > 0 && (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead className="text-gray-500">
                      <tr><th className="py-1 pr-3">Name</th><th className="pr-3">SKU</th><th className="pr-3">Unit</th><th>Price</th></tr>
                    </thead>
                    <tbody className="text-gray-300">
                      {parsed.rows.slice(0, 5).map((r, i) => (
                        <tr key={i} className="border-t border-[#1a1a1a]">
                          <td className="py-1 pr-3">{r.name}</td>
                          <td className="pr-3 text-gray-500">{r.sku || '—'}</td>
                          <td className="pr-3 text-gray-500">{r.unit}</td>
                          <td className="tabular-nums">${r.price.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsed.rows.length > 5 && (
                    <p className="mt-1 text-[11px] text-gray-600">…and {parsed.rows.length - 5} more.</p>
                  )}
                </div>
              )}

              {parsed.rejected.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] text-yellow-400">
                    Show the {parsed.rejected.length} that cannot be used
                  </summary>
                  <ul className="mt-1 max-h-40 space-y-0.5 overflow-y-auto text-[11px] text-gray-400">
                    {parsed.rejected.slice(0, 100).map((r, i) => (
                      <li key={i}>Line {r.line} — {r.reason}</li>
                    ))}
                    {parsed.rejected.length > 100 && <li className="text-gray-600">…and {parsed.rejected.length - 100} more.</li>}
                  </ul>
                </details>
              )}
            </div>
          )}

          {importing && (
            <div>
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>Importing…</span><span className="tabular-nums">{Math.round(progress * 100)}%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#0A0A0A]">
                <div className="h-full bg-[#ea580c] transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
            </div>
          )}

          {result && (
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3 text-xs">
              <p className="flex items-center gap-1.5 font-semibold text-green-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {result.added} added, {result.updated} updated.
              </p>
              {result.rejected.length > 0 && (
                <p className="mt-1 flex items-start gap-1.5 text-yellow-400">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {result.rejected.length} line{result.rejected.length === 1 ? '' : 's'} were not imported.
                  Fix them in your file and import it again — matching SKUs update rather than duplicate.
                </p>
              )}
            </div>
          )}

          <button
            onClick={run}
            disabled={importing || !parsed || parsed.rows.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-[#ea580c] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-500 disabled:opacity-40"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {importing
              ? 'Importing…'
              : parsed
                ? `Import ${parsed.rows.length} line${parsed.rows.length === 1 ? '' : 's'}`
                : 'Import'}
          </button>

          <p className="text-[11px] text-gray-600">
            Lines with a SKU that is already in your catalogue have their price updated.
            Nothing is removed by an import.
          </p>
        </div>
      )}
    </div>
  );
}
