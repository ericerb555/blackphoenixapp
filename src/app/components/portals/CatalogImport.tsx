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
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  parseDelimited, guessMapping, buildRows, missingRequired,
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

const FIELDS: CatalogField[] = ['name', 'sku', 'price', 'unit', 'category', 'availability', 'leadTimeDays'];

export default function CatalogImport({ vendorId, headers, apiBase, onImported }: Props) {
  const [fileName, setFileName] = useState('');
  const [grid, setGrid] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Partial<Record<CatalogField, number>>>({});
  const [hasHeader, setHasHeader] = useState(true);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ added: number; updated: number; rejected: Array<{ line: number; reason: string }> } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const header = grid[0] || [];

  const parsed: ParsedCatalog | null = useMemo(
    () => (grid.length && missingRequired(mapping).length === 0
      ? buildRows(grid, mapping, hasHeader)
      : null),
    [grid, mapping, hasHeader],
  );

  const take = useCallback(async (file: File) => {
    setResult(null);
    try {
      const text = await file.text();
      const rows = parseDelimited(text);
      if (!rows.length) { toast.error('That file has no rows in it.'); return; }
      setFileName(file.name);
      setGrid(rows);
      setMapping(guessMapping(rows[0]));
      setHasHeader(true);
    } catch {
      toast.error('That file could not be read.');
    }
  }, []);

  const reset = () => {
    setGrid([]); setMapping({}); setFileName(''); setResult(null); setProgress(0);
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
            disabled={!vendorId}
            className="mt-3 flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-[#2A2A2A] px-4 py-8 text-sm text-gray-400 transition hover:border-orange-500/40 hover:text-white disabled:opacity-40"
          >
            <Upload className="h-6 w-6 text-[#ea580c]" />
            Choose a file
          </button>
          <input
            ref={fileInput} type="file" className="hidden"
            accept=".csv,.tsv,.txt,text/csv,text/plain,text/tab-separated-values"
            onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void take(f); }}
          />
        </>
      ) : (
        <div className="mt-3 space-y-4">
          <p className="text-xs text-gray-400">
            <span className="font-semibold text-white">{fileName}</span>
            {' · '}{grid.length - (hasHeader ? 1 : 0)} row{grid.length - (hasHeader ? 1 : 0) === 1 ? '' : 's'}
          </p>

          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input type="checkbox" checked={hasHeader} onChange={e => {
              setHasHeader(e.target.checked);
              // Re-guess against whichever row is now the header, or clear the
              // guess when there is no header to guess from.
              setMapping(e.target.checked ? guessMapping(grid[0] || []) : {});
            }} />
            The first row is column headings
          </label>

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
