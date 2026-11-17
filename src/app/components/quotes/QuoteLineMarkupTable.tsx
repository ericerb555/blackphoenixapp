/**
 * Where the overhead and contingency went, line by line.
 *
 * Eric: "once i set my overhead and contingency prices in the quote builder
 * section i should be able to save it to the quote and then at that point
 * destributed over all the line item as equal as possible."
 *
 * The distribution already happened — `applyMargins` put it on the quote and
 * every customer-facing document apportions it across the lines. What did not
 * exist was any way to SEE it. Three totals at the bottom of a quote do not
 * answer "what is the overhead on the tile", which is the question asked when
 * somebody is deciding whether a line is worth doing.
 *
 * OURS ONLY, AND SAID SO ON SCREEN
 *
 * These are cost-and-margin figures. The panel carries the label because the
 * screen it sits on is one keyboard shortcut from a customer-facing preview,
 * and a reader who does not know which copy they are looking at is how an
 * internal margin ends up read out on a phone call.
 *
 * PADDING IS INLINE, DELIBERATELY
 *
 * `globals.css` zeroes every Tailwind padding and margin utility across this
 * app. A `p-3` here renders flush against the border and looks broken, so the
 * spacing is written as style props — the same thing every other recently
 * built panel in this codebase does.
 */
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { quoteLineMarkup } from '../../lib/quoteLineMarkup.ts';

const money = (n: number) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function QuoteLineMarkupTable({ quote }: { quote: any }) {
  const [open, setOpen] = useState(false);
  const breakdown = useMemo(() => quoteLineMarkup(quote), [quote]);

  // Nothing to show on a quote with no lines, and nothing worth showing on one
  // carrying no markup — an all-zero table reads as a fault rather than as a
  // deliberate decision not to charge any.
  if (!breakdown.lines.length || !breakdown.hasMarkup) return null;

  const { lines, totals, rates } = breakdown;

  return (
    <div
      className="rounded-lg border border-white/10 bg-black/40"
      style={{ padding: '12px' }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
          <Layers className="h-3.5 w-3.5 text-cyan-400" />
          Markup per line — ours only
        </span>
        {open
          ? <ChevronDown className="h-4 w-4 text-gray-500" />
          : <ChevronRight className="h-4 w-4 text-gray-500" />}
      </button>

      {!open && (
        <p className="text-[11px] text-gray-500" style={{ marginTop: '6px' }}>
          {money(totals.markup)} across {lines.length} line{lines.length === 1 ? '' : 's'}
          {rates.total > 0 ? ` · ${Math.round(rates.total * 1000) / 10}% of cost` : ''}
        </p>
      )}

      {open && (
        <div style={{ marginTop: '10px' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-gray-500">
                  <th className="text-left font-medium" style={{ paddingBottom: '6px' }}>Line</th>
                  <th className="text-right font-medium" style={{ paddingBottom: '6px' }}>Cost</th>
                  <th className="text-right font-medium" style={{ paddingBottom: '6px' }}>O/H</th>
                  <th className="text-right font-medium" style={{ paddingBottom: '6px' }}>Profit</th>
                  <th className="text-right font-medium" style={{ paddingBottom: '6px' }}>Cont.</th>
                  <th className="text-right font-medium" style={{ paddingBottom: '6px' }}>Price</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {lines.map((line) => (
                  <tr key={`${line.kind}-${line.index}`} className="border-t border-white/5">
                    <td className="text-gray-300" style={{ paddingTop: '5px', paddingBottom: '5px', paddingRight: '8px' }}>
                      <span className="text-gray-600">
                        {line.kind === 'labor' ? 'L' : line.kind === 'credit' ? 'C' : 'M'}
                      </span>{' '}
                      {line.label}
                    </td>
                    <td className="text-right text-gray-400">{money(line.directCost)}</td>
                    <td className="text-right text-gray-300">{money(line.overhead)}</td>
                    <td className="text-right text-gray-300">{money(line.profit)}</td>
                    <td className="text-right text-gray-300">{money(line.contingency)}</td>
                    <td className="text-right font-bold text-white">{money(line.price)}</td>
                  </tr>
                ))}
              </tbody>
              {/*
                The totals row is the point of the table, not decoration.

                Each column is allocated to the quote's own stored figure, so
                these are the SAME numbers as the margin control above and the
                ones `totalCost` was built from. If they ever disagree, the
                breakdown is wrong and this row is where it shows.
              */}
              <tfoot>
                <tr className="border-t border-white/20 font-bold tabular-nums">
                  <td className="text-gray-400" style={{ paddingTop: '6px' }}>Total</td>
                  <td className="text-right text-gray-300" style={{ paddingTop: '6px' }}>{money(totals.directCost)}</td>
                  <td className="text-right text-cyan-300" style={{ paddingTop: '6px' }}>{money(totals.overhead)}</td>
                  <td className="text-right text-cyan-300" style={{ paddingTop: '6px' }}>{money(totals.profit)}</td>
                  <td className="text-right text-cyan-300" style={{ paddingTop: '6px' }}>{money(totals.contingency)}</td>
                  <td className="text-right text-white" style={{ paddingTop: '6px' }}>
                    {money(totals.directCost + totals.markup)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="text-[10px] leading-relaxed text-gray-600" style={{ marginTop: '8px' }}>
            Spread in proportion to each line's cost, and allocated so every column adds up to the
            figure on the quote exactly. A customer sees one price per line with its share already
            inside it — never this breakdown.
          </p>
        </div>
      )}
    </div>
  );
}
