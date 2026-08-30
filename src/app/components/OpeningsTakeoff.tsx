/**
 * Doors and windows, as a trade in the design centre.
 *
 * A schedule rather than a drawing. The work of quoting these is counting them
 * accurately, getting the sizes right, and knowing which are a straight insert
 * and which mean opening the wall up — so that is what the screen asks for and
 * nothing else.
 *
 * Stage-aware for the same reason the siding component is: the design centre
 * drives it through the same rail, and one component means one schedule rather
 * than two that can disagree.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, DoorOpen, Info, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { buildOpeningsQuote, OPENING_KINDS, specAsRow } from '../lib/openingsModel';
import OpeningScheduleForm from './OpeningScheduleForm';
import { isOrderable, type Market, type OpeningSpec } from '../lib/openingSpec';
import type { DimensionSource } from '../lib/exteriorModel';
import { DEFAULT_QUOTE_OPTIONS, type QuoteOptions } from '../lib/deckQuote';
import { tradeRatesFrom, type TradeRates } from '../lib/sidingPricing';
import { publishDeckQuote } from '../lib/publishQuote';
import ProjectLinkPanel, { type DesignLink } from './ProjectLinkPanel';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import HouseImportBanner from './HouseImportBanner';
import type { House } from '../lib/houseModel';
import { openingsOffer, specsFromHouse } from '../lib/houseToTrades';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

async function headers() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || publicAnonKey}`,
  };
}

const SOURCES: Array<{ id: DimensionSource; label: string; hint: string }> = [
  { id: 'measured', label: 'Measured', hint: 'Someone put a tape on it.' },
  { id: 'scaled', label: 'Scaled', hint: 'Taken from a photo with a known-size object in it.' },
  { id: 'estimated', label: 'Estimated', hint: 'A guess. Never order from it.' },
];

const field = 'w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#ea580c]';
const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';
const money = (n: number) => `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

let nextId = 1;
const blankSpec = (): OpeningSpec => ({
  id: `o-${nextId++}`,
  mark: 'W1',
  location: '',
  quantity: 1,
  type: 'window',
  roughWidthIn: 0,
  roughHeightIn: 0,
  unitWidthIn: 36,
  unitHeightIn: 60,
  source: 'measured',
  style: 'double-hung',
  frameType: 'nailing-fin',
  fit: 'insert',
  grids: 'none',
  screens: true,
  tempered: false,
});

export default function OpeningsTakeoff({ stage, link: linkProp, onLink, house }: {
  stage?: 'capture' | 'design' | 'price' | 'documents';
  /** The captured building — its openings become this schedule. */
  house?: House | null;
  link?: DesignLink;
  onLink?: (next: DesignLink) => void;
} = {}) {
  /**
   * One schedule, read two ways.
   *
   * The specification is the record — it is what a supplier is sent — and the
   * quote is a narrow reading of it. Keeping a separate pricing schedule
   * alongside would be two lists of the same windows, and a customer would
   * eventually be quoted from one while the order went off the other.
   */
  const [specs, setSpecs] = useState<OpeningSpec[]>([blankSpec()]);
  const [market, setMarket] = useState<Market>('residential');
  const rows = useMemo(() => specs.map(specAsRow), [specs]);
  const [rates, setRates] = useState<TradeRates>({});
  const [opts, setOpts] = useState<QuoteOptions>(DEFAULT_QUOTE_OPTIONS);
  const [materialPrices, setMaterialPrices] = useState<Record<string, number>>({});
  const [ownLink, setOwnLink] = useState<DesignLink>({ customerId: '', customerName: '', jobId: '', jobTitle: '' });
  const [publishing, setPublishing] = useState(false);
  const [quoteId, setQuoteId] = useState<string | null>(null);

  const link = linkProp ?? ownLink;
  const setLink = onLink ?? setOwnLink;

  const embedded = Boolean(stage);
  const at = (s: string) => !stage || stage === s;

  useEffect(() => {
    (async () => {
      try {
        const h = await headers();
        const [rateRes, cfgRes, priceRes] = await Promise.all([
          fetch(`${SERVER}/labor-rates/get`, { headers: h }),
          fetch(`${SERVER}/pricing-config/get`, { headers: h }),
          fetch(`${SERVER}/quote/price-lines`, {
            method: 'POST', headers: h,
            body: JSON.stringify({
              lines: [...OPENING_KINDS.map(k => ({ sku: k.sku, description: k.label })),
                { sku: 'opening:trim', description: 'Exterior trim and flashing' }],
            }),
          }),
        ]);
        const r = await rateRes.json().catch(() => ({}));
        const cfg = await cfgRes.json().catch(() => ({}));
        const p = await priceRes.json().catch(() => ({}));
        setRates(tradeRatesFrom(r?.laborRates || []));
        const config = cfg?.config || {};
        setOpts(o => ({
          ...o,
          marginPct: Number(config.profitMargin ?? 0) || 0,
          taxRatePct: Number(config.taxRate ?? 0) || 0,
        }));
        const next: Record<string, number> = {};
        for (const line of p?.priced || []) if (Number(line.unitPrice) > 0) next[line.sku] = Number(line.unitPrice);
        setMaterialPrices(next);
      } catch { /* the schedule is still worth having without prices */ }
    })();
  }, []);

  const quote = useMemo(
    () => buildOpeningsQuote(rows, materialPrices, rates, opts),
    [rows, materialPrices, rates, opts],
  );

  const publish = useCallback(async () => {
    setPublishing(true);
    try {
      const result = await publishDeckQuote({
        link, lines: quote.lines, totals: quote.totals,
        unpricedCount: quote.unpricedCount,
        designId: null, designVersion: null,
        kind: 'openings', fallbackTitle: 'Doors and windows',
        existingQuoteId: quoteId,
      });
      if (!result.ok) { toast.error(result.error || 'Could not create the quote.'); return; }
      setQuoteId(result.quoteId || null);
      if (result.error) toast.warning(result.error);
      else toast.success('Quote created — on the pipeline and in their portal.');
    } finally {
      setPublishing(false);
    }
  }, [link, quote, quoteId]);

  const Shell = embedded
    ? ({ children }: { children: any }) => <div className="space-y-4">{children}</div>
    : ({ children }: { children: any }) => (
        <div className="min-h-screen bg-[#0A0A0A] p-4 md:p-8">
          <div className="mx-auto max-w-5xl space-y-4">{children}</div>
        </div>
      );

  return (
    <Shell>
      <HouseImportBanner
        offer={openingsOffer(house)}
        noun="openings"
        replacing={specs.length}
        onApply={() => {
          const next = specsFromHouse(house);
          setSpecs(next);
          toast.success(`${next.length} opening${next.length === 1 ? '' : 's'} brought in. Check the rough sizes before ordering.`);
        }}
      />
      {!embedded && (
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <DoorOpen className="h-6 w-6 text-[#ea580c]" /> Doors and windows
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Schedule every opening once. The quote follows from it.
          </p>
        </div>
      )}

      {/* ── the schedule — Design ──────────────────────────────────────
          The full specification, because this is the record a purchase order
          comes off and not merely a list of sizes to price. */}
      <div className={at('design') ? '' : 'hidden'}>
        <OpeningScheduleForm specs={specs} onChange={setSpecs} market={market} onMarket={setMarket} />
      </div>

      {/* ── the quote — Price ─────────────────────────────────────────── */}
      {quote.takeoff.units > 0 && at('price') && (
        <>
          <div className={card}>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-sm font-bold text-white">Materials and labour</h2>
              <span className="text-xs text-gray-500">
                {quote.takeoff.units} units · {quote.takeoff.fullFrame} full frame
              </span>
            </div>
            <div className="space-y-1.5">
              {quote.lines.map(l => (
                <div key={l.sku} className="flex items-baseline justify-between gap-3 border-b border-white/5 pb-1.5 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate text-xs text-white">{l.description}</p>
                    <p className="truncate text-[10px] text-gray-600">{l.qty} {l.unit} · {l.basis}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-semibold ${l.unpriced ? 'text-gray-600' : 'text-[#ea580c]'}`}>
                    {l.unpriced ? '—' : money(l.total)}
                  </span>
                </div>
              ))}
            </div>
            <p className={`mt-3 flex gap-2 text-[11px] ${quote.takeoff.basis === 'measured' ? 'text-gray-500' : 'text-amber-500/90'}`}>
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {quote.takeoff.note}
            </p>
          </div>

          <div className={card}>
            <div className="space-y-1.5 text-sm">
              <Row label="Materials" value={money(quote.totals.materials)} />
              <Row label="Labour" value={money(quote.totals.labour)} />
              <Row label={`Margin ${opts.marginPct}%`} value={money(quote.totals.margin)} />
              <div className="mt-2 flex items-baseline justify-between border-t border-white/10 pt-2">
                <span className="text-sm font-bold text-white">Total</span>
                <span className="text-xl font-bold text-[#ea580c]">{money(quote.totals.total)}</span>
              </div>
            </div>

            {quote.unpricedCount > 0 && (
              <p className="mt-3 text-[11px] text-amber-500/90">
                {quote.unpricedCount} {quote.unpricedCount === 1 ? 'line has' : 'lines have'} no price, so this
                total is short by whatever they cost.
              </p>
            )}

            {/* A schedule that cannot be ordered from can still be quoted —
                the two are different documents — but saying so here saves
                somebody discovering it at the supplier. */}
            {!isOrderable(specs, market) && (
              <p className="mt-2 text-[11px] text-amber-500/90">
                This schedule is not ready to order from yet. The quote is fine; the specification
                has gaps, listed on the Design stage.
              </p>
            )}

            <button onClick={publish} disabled={publishing}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#ea580c] px-4 py-3 font-bold text-white transition hover:bg-orange-500 disabled:opacity-50">
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {quoteId ? 'Update the quote' : 'Create the quote'}
            </button>
            <p className="mt-2 text-[11px] text-gray-600">
              {link.customerEmail
                ? <>Goes to the pipeline{link.jobId ? ' against this job' : ''} and to {link.customerName || 'the customer'}&apos;s portal.</>
                : <span className="text-amber-500/90">Pick a customer — without their email a quote never reaches their portal.</span>}
            </p>
          </div>

          {!embedded && <ProjectLinkPanel designId={null} link={link} onLink={setLink} />}
        </>
      )}
    </Shell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}
