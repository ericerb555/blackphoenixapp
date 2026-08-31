/**
 * Flooring, room by room.
 *
 * A room carries its own material, because a job is rarely one covering — tile
 * in the kitchen, plank through the living space, carpet in the bedrooms — and
 * each of those is bought and laid by different rules.
 *
 * The order quantity is shown beside the area on every row, because they are
 * not the same number and the difference is where flooring estimates go wrong.
 * A carpeted room wider than the roll needs a second drop, which costs a whole
 * further length rather than a percentage.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Layers, Info, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import {
  buildFlooringQuote, FLOOR_MATERIALS, LAYOUT_WASTE, roomArea,
  type FloorRoom, type FloorMaterial, type TileLayout,
} from '../lib/flooringModel';
import type { DimensionSource } from '../lib/exteriorModel';
import { DEFAULT_QUOTE_OPTIONS, type QuoteOptions } from '../lib/deckQuote';
import { tradeRatesFrom, type TradeRates } from '../lib/sidingPricing';
import { publishDeckQuote } from '../lib/publishQuote';
import ProjectLinkPanel, { type DesignLink } from './ProjectLinkPanel';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import HouseImportBanner from './HouseImportBanner';
import type { House } from '../lib/houseModel';
import { flooringOffer, roomsFromHouse } from '../lib/houseToTrades';
import type { DesignStage } from '../lib/designStage';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

async function headers() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || publicAnonKey}`,
  };
}

const SOURCES: Array<{ id: DimensionSource; label: string; hint: string }> = [
  { id: 'measured', label: 'Measured', hint: 'A tape was on it.' },
  { id: 'scaled', label: 'Scaled', hint: 'From a photo with something of known size in it.' },
  { id: 'estimated', label: 'Estimated', hint: 'A guess. Flooring is bought by the square foot.' },
];

const field = 'w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#ea580c]';
const lbl = 'text-[10px] font-semibold text-gray-500';
const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';
const money = (n: number) => `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

let seq = 1;
const blankRoom = (): FloorRoom => ({
  id: `room-${seq++}`,
  name: '',
  lengthFt: 0,
  widthFt: 0,
  material: 'lvp',
  layout: 'straight',
  transitions: 1,
  removeExisting: true,
  underlayment: false,
  source: 'measured',
});

export default function FlooringTakeoff({ stage, link: linkProp, onLink, initialRooms, house }: {
  stage?: DesignStage;
  /** The captured building — its room views become rooms here. */
  house?: House | null;
  link?: DesignLink;
  onLink?: (next: DesignLink) => void;
  /**
   * Rooms already known, so a capture can seed them rather than making somebody
   * retype what has been measured. Nothing passes it yet; it is the seam a room
   * capture plugs into.
   */
  initialRooms?: FloorRoom[];
} = {}) {
  const [rooms, setRooms] = useState<FloorRoom[]>(initialRooms?.length ? initialRooms : [blankRoom()]);
  const [rates, setRates] = useState<TradeRates>({});
  const [opts, setOpts] = useState<QuoteOptions>(DEFAULT_QUOTE_OPTIONS);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [ownLink, setOwnLink] = useState<DesignLink>({ customerId: '', customerName: '', jobId: '', jobTitle: '' });
  const [publishing, setPublishing] = useState(false);
  const [quoteId, setQuoteId] = useState<string | null>(null);

  const link = linkProp ?? ownLink;
  const setLink = onLink ?? setOwnLink;
  const embedded = Boolean(stage);
  const at = (s: string) => !stage || stage === s;

  const patch = (id: string, p: Partial<FloorRoom>) =>
    setRooms(rs => rs.map(r => (r.id === id ? { ...r, ...p } : r)));

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
              lines: [
                ...FLOOR_MATERIALS.map(m => ({ sku: m.sku, description: m.label })),
                { sku: 'floor:transition', description: 'Transitions and thresholds' },
                { sku: 'disposal:flooring', description: 'Skip and disposal' },
              ],
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
        setPrices(next);
      } catch { /* the takeoff is still worth having without prices */ }
    })();
  }, []);

  const quote = useMemo(
    () => buildFlooringQuote(rooms, prices, rates, opts),
    [rooms, prices, rates, opts],
  );

  const publish = useCallback(async () => {
    setPublishing(true);
    try {
      const result = await publishDeckQuote({
        link, lines: quote.lines, totals: quote.totals,
        unpricedCount: quote.unpricedCount,
        designId: null, designVersion: null,
        kind: 'flooring', fallbackTitle: 'Flooring',
        existingQuoteId: quoteId,
      });
      if (!result.ok) { toast.error(result.error || 'Could not create the quote.'); return; }
      setQuoteId(result.quoteId || null);
      if (result.error) toast.warning(result.error);
      else toast.success('Flooring quote created — on the pipeline and in their portal.');
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
        offer={flooringOffer(house)}
        noun="rooms"
        replacing={rooms.length}
        onApply={() => {
          const next = roomsFromHouse(house);
          setRooms(next);
          toast.success(`${next.length} room${next.length === 1 ? '' : 's'} brought in — add the second dimension to each.`);
        }}
      />
      {!embedded && (
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Layers className="h-6 w-6 text-[#ea580c]" /> Flooring
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Measure each room and choose its covering. What to order follows.
          </p>
        </div>
      )}

      {/* ── the rooms — Design ────────────────────────────────────────── */}
      <div className={`space-y-2 ${at('design') ? '' : 'hidden'}`}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">The rooms</h2>
          <button onClick={() => setRooms(rs => [...rs, blankRoom()])}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-gray-300 hover:bg-white/5">
            <Plus className="h-3.5 w-3.5" /> Add a room
          </button>
        </div>

        {rooms.map(r => {
          const spec = FLOOR_MATERIALS.find(m => m.id === r.material)!;
          const t = quote.takeoff.rooms.find(x => x.id === r.id);
          const isWood = r.material === 'hardwood-solid' || r.material === 'hardwood-engineered';

          return (
            <div key={r.id} className="rounded-xl border border-[#242424] bg-[#0d0d0d] p-3">
              <div className="mb-2 flex items-center gap-2">
                <input value={r.name} onChange={e => patch(r.id, { name: e.target.value })}
                  placeholder="Which room?"
                  className="flex-1 bg-transparent text-sm font-bold text-white placeholder:text-gray-600 focus:outline-none" />
                {rooms.length > 1 && (
                  <button onClick={() => setRooms(rs => rs.filter(x => x.id !== r.id))}
                    className="text-gray-600 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <label className="block">
                  <span className={lbl}>Length ft</span>
                  <input value={String(r.lengthFt || '')} inputMode="decimal"
                    onChange={e => patch(r.id, { lengthFt: Number(e.target.value) || 0 })}
                    className={`${field} mt-0.5`} />
                </label>
                <label className="block">
                  <span className={lbl}>Width ft</span>
                  <input value={String(r.widthFt || '')} inputMode="decimal"
                    onChange={e => patch(r.id, { widthFt: Number(e.target.value) || 0 })}
                    className={`${field} mt-0.5`} />
                </label>
                <label className="block">
                  {/* For a room that is not a rectangle, measured on site. */}
                  <span className={lbl}>or area sq ft</span>
                  <input value={String(r.areaSqFt || '')} inputMode="decimal"
                    onChange={e => patch(r.id, { areaSqFt: Number(e.target.value) || undefined })}
                    placeholder="if L-shaped" className={`${field} mt-0.5`} />
                </label>
                <label className="block sm:col-span-2">
                  <span className={lbl}>Covering</span>
                  <select value={r.material} onChange={e => patch(r.id, { material: e.target.value as FloorMaterial })}
                    className={`${field} mt-0.5`} title={spec.note}>
                    {FLOOR_MATERIALS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </label>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                {r.material === 'tile' && (
                  <div className="flex gap-1.5">
                    {(Object.keys(LAYOUT_WASTE) as TileLayout[]).map(l => (
                      <button key={l} onClick={() => patch(r.id, { layout: l })}
                        title={`+${LAYOUT_WASTE[l].extraPct}% waste, ${LAYOUT_WASTE[l].hoursFactor}× hours`}
                        className={`rounded-md px-2 py-1 text-[10px] font-bold transition ${
                          (r.layout || 'straight') === l ? 'bg-[#ea580c] text-white' : 'border border-white/10 text-gray-400 hover:bg-white/5'
                        }`}>
                        {LAYOUT_WASTE[l].label}
                      </button>
                    ))}
                  </div>
                )}

                <label className="flex items-center gap-1.5 text-[11px] text-gray-300">
                  <span className={lbl}>Doorways</span>
                  <input value={String(r.transitions ?? 0)} inputMode="numeric"
                    onChange={e => patch(r.id, { transitions: Number(e.target.value) || 0 })}
                    className="w-12 rounded border border-[#2a2a2a] bg-[#0a0a0a] px-1.5 py-1 text-center text-white" />
                </label>

                <Check label="Take up existing" on={r.removeExisting} set={v => patch(r.id, { removeExisting: v })} />
                <Check label="Underlayment" on={r.underlayment} set={v => patch(r.id, { underlayment: v })} />
                {isWood && <Check label="Sand and finish on site" on={!!r.siteFinish} set={v => patch(r.id, { siteFinish: v })} />}

                <div className="flex gap-1.5">
                  {SOURCES.map(s => (
                    <button key={s.id} onClick={() => patch(r.id, { source: s.id })} title={s.hint}
                      className={`rounded-md px-2 py-1 text-[10px] font-bold transition ${
                        r.source === s.id ? 'bg-white/15 text-white' : 'border border-white/10 text-gray-500 hover:bg-white/5'
                      }`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/*
                Area and order quantity side by side, because they are not the
                same number. On a carpeted room wider than the roll the gap is
                large, and it is the thing that comes up short on site.
              */}
              {t && t.areaSqFt > 0 && (
                <p className="mt-2 text-[11px] text-gray-500">
                  {t.areaSqFt} sq ft laid → <span className="font-semibold text-[#ea580c]">order {t.orderSqFt} sq ft</span>
                  {' · '}{t.hours} hrs · {t.note}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── the quote — Price ─────────────────────────────────────────── */}
      {quote.takeoff.totalAreaSqFt > 0 && at('price') && (
        <>
          <div className={card}>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-sm font-bold text-white">Materials and labour</h2>
              <span className="text-xs text-gray-500">{quote.takeoff.totalAreaSqFt} sq ft over {quote.takeoff.rooms.length} rooms</span>
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

function Check({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-1.5 text-[11px] text-gray-300">
      <input type="checkbox" checked={on} onChange={e => set(e.target.checked)}
        className="h-3.5 w-3.5 accent-[#ea580c]" />
      {label}
    </label>
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
