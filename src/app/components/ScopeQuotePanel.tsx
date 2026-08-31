/**
 * The whole job, priced — and sent into the pipeline.
 *
 * WHY THIS EXISTS SEPARATELY FROM THE TRADE PANELS
 *
 * Each trade prices its own takeoff, which is right when the job is one trade.
 * A kitchen is not: it has demolition, electrical, tile, cabinets and paint in
 * it, and five separate totals is not an answer to "what does the job cost".
 * The scope is the one thing that knows the whole job, so the whole job is
 * priced here.
 *
 * WHAT IT WILL NOT DO
 *
 * Send a quote that is short. A line out to a subcontractor with no number back
 * is not a zero, and a total that quietly treats it as one is worse than no
 * total — the customer sees a number, agrees to it, and the difference comes
 * out of the job. The button refuses, and says which lines are the problem.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Receipt, Loader2, Send, AlertTriangle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { projectId } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';
import type { Scope } from '../lib/scopeModel';
import { priceScope, skusToPrice, quoteConfidence, type PricedScopeLine } from '../lib/scopePricing';
import { tradeRatesFrom, type TradeRates } from '../lib/sidingPricing';
import { DEFAULT_QUOTE_OPTIONS, type QuoteOptions } from '../lib/deckQuote';
import { publishDeckQuote, quoteRefusalReason } from '../lib/publishQuote';
import type { DesignLink } from './ProjectLinkPanel';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';

async function headers() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || ''}`,
  };
}

export default function ScopeQuotePanel({ scope, link, designId, designVersion, projectName }: {
  scope: Scope;
  link: DesignLink;
  designId: string | null;
  designVersion: number | null;
  projectName?: string;
}) {
  const [rates, setRates] = useState<TradeRates>({});
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [opts, setOpts] = useState<QuoteOptions>(DEFAULT_QUOTE_OPTIONS);
  const [sending, setSending] = useState(false);
  const [quoteId, setQuoteId] = useState<string | null>(null);

  // Your rates and your margin, from the same place every other trade reads
  // them. A scope priced off different numbers than a deck is two price books.
  useEffect(() => {
    (async () => {
      try {
        const h = await headers();
        const [r, c] = await Promise.all([
          fetch(`${SERVER}/labor-rates/get`, { headers: h }).then(x => x.json()).catch(() => ({})),
          fetch(`${SERVER}/pricing-config/get`, { headers: h }).then(x => x.json()).catch(() => ({})),
        ]);
        setRates(tradeRatesFrom(r?.laborRates || []));
        const cfg = c?.config || {};
        setOpts(o => ({
          ...o,
          marginPct: Number(cfg.profitMargin ?? 0) || 0,
          taxRatePct: Number(cfg.taxRate ?? 0) || 0,
        }));
      } catch { /* the scope still prices what it can */ }
    })();
  }, []);

  // Only the material lines, and only the ones in this scope.
  useEffect(() => {
    const want = skusToPrice(scope);
    if (!want.length) { setPrices({}); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${SERVER}/quote/price-lines`, {
          method: 'POST', headers: await headers(), body: JSON.stringify({ lines: want }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        const next: Record<string, number> = {};
        for (const l of data?.priced || []) if (Number(l.unitPrice) > 0) next[l.sku] = Number(l.unitPrice);
        setPrices(next);
      } catch { /* leaves them unpriced, which is reported */ }
    })();
    return () => { cancelled = true; };
  }, [scope]);

  const q = useMemo(() => priceScope(scope, rates, prices, opts), [scope, rates, prices, opts]);

  const refusal = useMemo(
    () => quoteRefusalReason(link, q.lines.length, q.unpricedCount),
    [link, q.lines.length, q.unpricedCount],
  );

  const send = useCallback(async () => {
    if (refusal || sending) return;
    setSending(true);
    try {
      const res = await publishDeckQuote({
        link, lines: q.lines, totals: q.totals, unpricedCount: q.unpricedCount,
        designId, designVersion, projectName,
        existingQuoteId: quoteId,
        kind: 'scope',
        fallbackTitle: 'Scope of work',
      });
      if (!res.ok) { toast.error(res.error || 'The quote was not sent.'); return; }
      setQuoteId(res.quoteId || null);
      toast.success(
        q.provisionalCount > 0
          ? `Quote sent. ${q.provisionalCount} quantities are still provisional — firm them after the walkthrough.`
          : 'Quote sent to the pipeline and the customer\'s portal.',
      );
    } catch (err: any) {
      toast.error(err?.message || 'The quote was not sent.');
    } finally {
      setSending(false);
    }
  }, [refusal, sending, link, q, designId, designVersion, projectName, quoteId]);

  return (
    <div className={card}>
      <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
        <Receipt className="w-4 h-4 text-[#ea580c]" /> The job, priced
      </h3>
      <p className="text-xs text-gray-500 mb-3">{quoteConfidence(q)}</p>

      {q.lines.length === 0 ? (
        <p className="text-[11px] text-gray-600">Nothing in the scope to price yet.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b border-[#2A2A2A]">
                  <th className="py-1.5 pr-2 font-semibold">Phase</th>
                  <th className="py-1.5 pr-2 font-semibold">Item</th>
                  <th className="py-1.5 pr-2 font-semibold text-right">Qty</th>
                  <th className="py-1.5 pr-2 font-semibold text-right">Total</th>
                  <th className="py-1.5 font-semibold">From</th>
                </tr>
              </thead>
              <tbody>
                {q.lines.map(l => (
                  <tr key={l.sku + l.description} className="border-b border-[#1A1A1A]">
                    <td className="py-1.5 pr-2 text-gray-600 whitespace-nowrap">{l.phase}</td>
                    <td className="py-1.5 pr-2 text-gray-300">
                      {l.description}
                      {l.confidence === 'provisional' && (
                        <span className="ml-1.5 text-[10px] text-amber-500/80">provisional</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-2 text-right text-gray-400 whitespace-nowrap">
                      {l.qty} {l.unit}
                    </td>
                    <td className="py-1.5 pr-2 text-right text-white font-semibold">
                      {l.unpriced ? '—' : `$${l.total.toFixed(2)}`}
                    </td>
                    <td className="py-1.5"><Source s={l.source} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 pt-3 border-t border-[#2A2A2A] space-y-1">
            <Row l="Materials" v={q.totals.materials} />
            <Row l="Labour and subs" v={q.totals.labour} />
            {q.totals.margin > 0 && <Row l={`Margin ${opts.marginPct}%`} v={q.totals.margin} />}
            {q.totals.tax > 0 && <Row l={`Tax ${opts.taxRatePct}%`} v={q.totals.tax} />}
            <div className="flex items-center justify-between pt-1.5 border-t border-[#2A2A2A]">
              <span className="text-sm font-bold text-white">Total</span>
              <span className="text-lg font-black text-[#ea580c]">${q.totals.total.toFixed(2)}</span>
            </div>
          </div>

          {refusal ? (
            <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200/90">{refusal}</p>
            </div>
          ) : (
            <button onClick={send} disabled={sending}
              className="mt-3 w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ background: '#ea580c' }}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {quoteId ? 'Send the revised quote' : 'Send this to the customer'}
            </button>
          )}

          {quoteId && (
            <p className="mt-2 text-[11px] text-emerald-300/90 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              In the pipeline and in their portal. Sending again revises it rather than duplicating.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Source({ s }: { s: PricedScopeLine['source'] }) {
  if (s === 'catalogue') return <span className="text-[10px] font-semibold text-emerald-400">vendor</span>;
  if (s === 'your-rate') return <span className="text-[10px] font-semibold text-sky-400">your rate</span>;
  if (s === 'sub-bid') return <span className="text-[10px] font-semibold text-violet-400">sub bid</span>;
  return <span className="text-[10px] font-semibold text-red-400">no price</span>;
}

function Row({ l, v }: { l: string; v: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-400">{l}</span>
      <span className="text-xs text-gray-200 font-semibold">${v.toFixed(2)}</span>
    </div>
  );
}
