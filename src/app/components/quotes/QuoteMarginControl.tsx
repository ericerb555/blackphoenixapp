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
import { Percent, LoaderCircle, Check, HardHat } from 'lucide-react';
import { applyMargins } from '../../../../supabase/functions/server/quoteMargins.ts';
import {
  burdenFor, describeBurden, burdenOnSubtotal,
  type BurdenSettings,
} from '../../../../supabase/functions/server/laborBurden.ts';

/** A stored fraction (0.15) or a typed percentage (15), shown as a percentage. */
const asPercent = (v: unknown): number => {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  // Same rule as `asFraction` in quoteCustomerPrice: above 1 is already a
  // percentage, at or below 1 is a fraction. A real rate above 100% is not a
  // thing and a 1% rate is written 0.01, so this is unambiguous either way.
  return n > 1 ? n : n * 100;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

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
  /**
   * null means inherit the company rate; a number is this job's own, and 0 is
   * a real decision rather than an absence. See the note on `burdenText`.
   */
  laborBurdenPercent: number | null;
}

export default function QuoteMarginControl({ quote, onApply, companyBurden, accent = 'cyan' }: {
  quote: any;
  /** Given the computed patch to merge into the quote and persist. */
  onApply: (patch: QuoteMarginPatch) => Promise<void> | void;
  /** The company's configured burden, when there is one. */
  companyBurden?: BurdenSettings | null;
  accent?: 'cyan' | 'orange' | 'teal';
}) {
  const [overhead, setOverhead] = useState(() => asPercent(quote?.overheadPercent));
  const [profit, setProfit] = useState(() => asPercent(quote?.profitPercent));
  const [contingency, setContingency] = useState(() => asPercent(quote?.contingencyPercent));
  /**
   * EMPTY STRING IS NOT ZERO, and that distinction is the whole of this field.
   *
   * Empty means "inherit the company rate, and keep inheriting it when that
   * changes". A typed 0 means "this job carries no burden, deliberately" and
   * must not quietly regain one when somebody edits the company settings.
   *
   * It is held as a STRING for exactly that reason: a number state cannot tell
   * the two apart without a second flag, and `Number('') === 0` is how they
   * would have been collapsed. Every other money field in the quote record
   * reads `Number(x) || 0`; doing that here would stamp an explicit zero onto
   * every quote ever saved and the company rate would reach nothing — a
   * failure indistinguishable from the burden never having been built.
   */
  const [burdenText, setBurdenText] = useState<string>(() => {
    const raw = quote?.laborBurdenPercent;
    return raw === null || raw === undefined || raw === '' ? '' : String(asPercent(raw) || 0);
  });
  const [saving, setSaving] = useState(false);

  const tone = accent === 'orange' ? 'text-orange-400' : accent === 'teal' ? 'text-teal-400' : 'text-cyan-400';
  const button = accent === 'orange'
    ? 'bg-orange-600 hover:bg-orange-500'
    : accent === 'teal' ? 'bg-teal-600 hover:bg-teal-500' : 'bg-cyan-600 hover:bg-cyan-500';

  /** The wage bill. Never burdened in storage — see the note below. */
  const wages = Number(quote?.laborSubtotal) || 0;

  /**
   * The burden this quote is costed at, and where that figure came from.
   *
   * The override is fed in as the quote's own field so `burdenFor` answers
   * `source` and `overridden` for the live edit rather than for what was last
   * saved — a screen that says "company rate" while showing a number somebody
   * has just typed is worse than one that says nothing.
   */
  const burden = useMemo(
    () => burdenFor(
      { ...quote, laborBurdenPercent: burdenText === '' ? null : (Number(burdenText) || 0) / 100 },
      companyBurden ?? null,
    ),
    [quote, burdenText, companyBurden],
  );

  const burdenAmount = useMemo(() => burdenOnSubtotal(wages, burden), [wages, burden]);

  const result = useMemo(() => applyMargins({
    materialsSubtotal: Number(quote?.materialsSubtotal) || 0,
    /**
     * Wages PLUS burden — what the labour actually costs us, which is the base
     * every margin should sit on. A margin on a bare wage is a margin on an
     * understated cost, and that is wrong in the direction nobody notices: the
     * quote looks profitable and the job is thinner in the bank.
     *
     * The burdened figure is computed here and never written back into
     * `laborSubtotal`, which keeps meaning the wage bill everywhere. That is
     * what makes this idempotent: recomputing always starts from wages, so
     * pressing save twice cannot burden an already-burdened number.
     */
    laborSubtotal: round2(wages + burdenAmount),
    additionalCostsSubtotal: Number(quote?.additionalCostsSubtotal) || 0,
    creditsSubtotal: Number(quote?.creditsSubtotal) || 0,
    overheadPercent: overhead / 100,
    profitPercent: profit / 100,
    contingencyPercent: contingency / 100,
    taxRatePercent: Number(quote?.taxRate) || 0,
  }), [quote, overhead, profit, contingency, wages, burdenAmount]);

  const current = Number(quote?.totalCost) || 0;
  /**
   * The total moving is the usual signal, but not the only one.
   *
   * Setting a deliberate 0 on a quote whose company rate is already 0 changes
   * no figure and is still a decision worth recording — it is what stops the
   * job picking up a burden later when the company rate is set. So the
   * override's own presence is compared too.
   */
  const storedOverride = quote?.laborBurdenPercent;
  const storedText = storedOverride === null || storedOverride === undefined || storedOverride === ''
    ? '' : String(asPercent(storedOverride) || 0);
  const changed = Math.abs(result.totalCost - current) >= 0.01 || burdenText !== storedText;

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
        /**
         * null when the field was left empty, a fraction otherwise — INCLUDING
         * zero, which is a decision about this job and not an absence.
         */
        laborBurdenPercent: burdenText === '' ? null : (Number(burdenText) || 0) / 100,
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
        {/*
          Labour burden, above the margins because it is a COST and they are
          not. What the hour pays, then what it costs, then what is earned on
          it — in that order, so nobody reads the burden as part of the margin.
        */}
        {wages > 0 && (
          <div className="space-y-1.5 border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <label className="flex-1 text-xs text-gray-400">
                <HardHat className="mr-1 inline h-3 w-3 text-gray-500" />
                Labour burden
              </label>
              <div className="relative">
                <input
                  type="text" inputMode="decimal" value={burdenText}
                  placeholder={companyBurden ? 'company' : 'none'}
                  onChange={e => {
                    const v = e.target.value.trim();
                    // Empty stays EMPTY — it is "inherit", not zero.
                    if (v === '') { setBurdenText(''); return; }
                    const n = Number(v.replace('%', ''));
                    if (Number.isFinite(n) && n >= 0 && n <= 100) setBurdenText(v.replace('%', ''));
                  }}
                  className="w-20 rounded-md border border-white/10 bg-black/40 px-2 py-1 pr-6 text-right text-sm tabular-nums text-white outline-none focus:border-white/30"
                />
                <Percent className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-600" />
              </div>
              <span className="w-24 text-right text-sm tabular-nums text-gray-300">{money(burdenAmount)}</span>
            </div>
            {/*
              Which number this is. An inherited rate moves when the company
              settings move; an overridden one does not, and somebody will ask
              which they are looking at.
            */}
            <p className="text-[11px] text-gray-600">
              {burden.overridden
                ? <>This job&rsquo;s own rate. <button type="button" onClick={() => setBurdenText('')} className="underline hover:text-gray-400">use the company rate</button></>
                : burden.configured
                  ? <>Inherited — {describeBurden(burden)}</>
                  : <>No burden set. Wages are being costed bare, which understates what labour costs.</>}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between border-b border-white/5 pb-2 text-xs">
          <span className="text-gray-500">Direct cost{burdenAmount > 0 ? ' (burdened)' : ''}</span>
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
