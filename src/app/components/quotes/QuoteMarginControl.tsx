/**
 * QuoteMarginControl — overhead, profit and contingency, on this quote.
 *
 * WHY PER QUOTE AND NOT ONLY IN SETTINGS
 *
 * Eric: "make it adjustable on the quotes them selves." The company settings
 * hold what a new quote starts from; a particular job is a particular risk, and
 * the contingency on a salon fit-out with the electrics already exposed is not
 * the contingency on a bathroom nobody has opened up yet. So the quote carries
 * its own three rates and this is where they are set.
 *
 * THE ARITHMETIC IS NOT REIMPLEMENTED HERE
 *
 * It calls `applyMargins`, the same tested module the server prices with. The
 * worst pricing fault this project has had was two modules agreeing about the
 * field names and disagreeing about whether a `10` meant ten per cent or ten
 * times — each was internally consistent and the contract between them was
 * wrong. A screen that did its own version of this arithmetic to draw a preview
 * would be a third opinion, and the one a person reads before deciding.
 *
 * PERCENTAGES IN, FRACTIONS OUT
 *
 * A person types 15. `applyMargins` is explicit that its inputs are FRACTIONS,
 * and the stored quote fields are fractions. The conversion happens once, at
 * this boundary, and is the only division by a hundred in this file.
 *
 * NOTHING SAVES UNTIL IT IS PRESSED
 *
 * Every keystroke here changes what a customer is charged, so the preview moves
 * live and the quote does not. The button says what the total will become, so
 * the number is read before it is committed rather than after.
 */
import { useMemo, useState } from 'react';
import { Percent, LoaderCircle, Check } from 'lucide-react';
import { applyMargins } from '../../../../supabase/functions/server/quoteMargins.ts';

/** A stored fraction (0.15) or a typed percentage (15), shown as a percentage. */
const asPercent = (v: unknown): number => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  // Same rule as `asFraction` in quoteCustomerPrice: above 1 is already a
  // percentage, at or below 1 is a fraction. A real rate above 100% is not a
  // thing and a 1% rate is written 0.01, so this is unambiguous either way.
  return n > 1 ? n : n * 100;
};

const money = (n: number) =>
  `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export interface QuoteMarginPatch {
  overheadPercent: number;
  profitPercent: number;
  contingencyPercent: number;
  overheadAmount: number;
  profitAmount: number;
  contingencyAmount: number;
  directCost: number;
  preTaxTotal: number;
  taxAmount: number;
  totalCost: number;
  total: number;
}

export default function QuoteMarginControl({ quote, onApply, accent = 'cyan' }: {
  quote: any;
  /** Given the computed patch to merge into the quote and persist. */
  onApply: (patch: QuoteMarginPatch) => Promise<void> | void;
  accent?: 'cyan' | 'orange' | 'teal';
}) {
  const [overhead, setOverhead] = useState(() => asPercent(quote?.overheadPercent));
  const [profit, setProfit] = useState(() => asPercent(quote?.profitPercent));
  const [contingency, setContingency] = useState(() => asPercent(quote?.contingencyPercent));
  const [saving, setSaving] = useState(false);

  const tone = accent === 'orange' ? 'text-orange-400' : accent === 'teal' ? 'text-teal-400' : 'text-cyan-400';
  const button = accent === 'orange'
    ? 'bg-orange-600 hover:bg-orange-500'
    : accent === 'teal' ? 'bg-teal-600 hover:bg-teal-500' : 'bg-cyan-600 hover:bg-cyan-500';

  const result = useMemo(() => applyMargins({
    materialsSubtotal: Number(quote?.materialsSubtotal) || 0,
    laborSubtotal: Number(quote?.laborSubtotal) || 0,
    additionalCostsSubtotal: Number(quote?.additionalCostsSubtotal) || 0,
    creditsSubtotal: Number(quote?.creditsSubtotal) || 0,
    overheadPercent: overhead / 100,
    profitPercent: profit / 100,
    contingencyPercent: contingency / 100,
    taxRatePercent: Number(quote?.taxRate) || 0,
  }), [quote, overhead, profit, contingency]);

  const current = Number(quote?.totalCost) || 0;
  const changed = Math.abs(result.totalCost - current) >= 0.01;

  const apply = async () => {
    setSaving(true);
    try {
      await onApply({
        // Fractions, matching what the server stores and reads.
        overheadPercent: result.overheadPercent,
        profitPercent: result.profitPercent,
        contingencyPercent: result.contingencyPercent,
        overheadAmount: result.overheadAmount,
        profitAmount: result.profitAmount,
        contingencyAmount: result.contingencyAmount,
        directCost: result.directCost,
        preTaxTotal: result.preTaxTotal,
        taxAmount: result.taxAmount,
        totalCost: result.totalCost,
        /**
         * The legacy field, written with the same number.
         *
         * `quoteTotal` reads `totalCost` first and `total` only as a last
         * resort, so this is belt and braces — but a PDF, an export or a
         * browser running yesterday's bundle may still read `total`, and two
         * fields on one quote disagreeing about the price is how a contract
         * got written six thousand dollars over its quote.
         */
        total: result.totalCost,
      });
    } finally {
      setSaving(false);
    }
  };

  const Row = ({ label, pct, set, amount }: {
    label: string; pct: number; set: (n: number) => void; amount: number;
  }) => (
    <div className="flex items-center gap-2">
      <label className="flex-1 text-xs text-gray-400">{label}</label>
      <div className="relative">
        <input
          type="number" min={0} max={200} step={0.5} value={pct}
          onChange={e => set(Math.max(0, Math.min(200, Number(e.target.value) || 0)))}
          className="w-20 rounded-md border border-white/10 bg-black/40 px-2 py-1 pr-6 text-right text-sm tabular-nums text-white outline-none focus:border-white/30"
        />
        <Percent className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-600" />
      </div>
      <span className="w-24 text-right text-sm tabular-nums text-gray-300">{money(amount)}</span>
    </div>
  );

  return (
    <div className="rounded-lg border border-white/10 bg-black/30 p-3">
      <p className={`mb-2 text-[10px] font-bold uppercase tracking-[0.18em] ${tone}`}>
        Overhead, profit &amp; contingency
      </p>
      <p className="mb-3 text-xs text-gray-500">
        Spread across every line item on the customer's copy — there is no row naming them.
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between border-b border-white/5 pb-2 text-xs">
          <span className="text-gray-500">Direct cost</span>
          <span className="tabular-nums text-gray-300">{money(result.directCost)}</span>
        </div>
        <Row label="Overhead" pct={overhead} set={setOverhead} amount={result.overheadAmount} />
        <Row label="Profit" pct={profit} set={setProfit} amount={result.profitAmount} />
        <Row label="Contingency" pct={contingency} set={setContingency} amount={result.contingencyAmount} />
        <div className="flex items-center justify-between border-t border-white/5 pt-2 text-xs">
          <span className="text-gray-500">Before tax</span>
          <span className="tabular-nums text-gray-300">{money(result.preTaxTotal)}</span>
        </div>
        {result.taxAmount > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Tax on materials</span>
            <span className="tabular-nums text-gray-300">{money(result.taxAmount)}</span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-white/10 pt-2">
          <span className="text-xs font-bold text-white">Quote total</span>
          <span className="text-base font-bold tabular-nums text-white">{money(result.totalCost)}</span>
        </div>
      </div>

      {/* The number is read before it is committed, not after. */}
      <button
        onClick={apply}
        disabled={saving || !changed}
        className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg ${button} px-3 py-2 text-xs font-bold text-white transition disabled:opacity-40`}
      >
        {saving
          ? <><LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Saving…</>
          : changed
            ? <>Set the quote to {money(result.totalCost)}</>
            : <><Check className="h-3.5 w-3.5" /> Quote matches these rates</>}
      </button>
      {changed && current > 0 && (
        <p className="mt-1.5 text-center text-[11px] text-gray-500">
          currently {money(current)} — {result.totalCost > current ? 'up' : 'down'}{' '}
          {money(Math.abs(result.totalCost - current))}
        </p>
      )}
    </div>
  );
}
