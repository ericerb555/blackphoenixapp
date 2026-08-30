/**
 * Kitchens and bathrooms.
 *
 * ONE COMPONENT FOR BOTH, ON PURPOSE
 *
 * A bathroom is a smaller, more constrained kitchen as far as this machinery
 * goes: a room, runs of cabinetry against its walls, fixtures that occupy part
 * of those runs, a worktop over the base units and a schedule at the end. The
 * differences are which fixtures exist and which rules are checked, and those
 * are data rather than structure. Two components would be the same code twice,
 * free to drift apart.
 *
 * THE ROOM COMES FROM THE HOUSE
 *
 * Its dimensions are read from the captured room view rather than typed again,
 * because the house is the record of the building and a kitchen measured a
 * second time is a second set of numbers to disagree. Where nothing has been
 * captured the fields are still editable — a phone call about a bathroom should
 * not require a site visit first — but they are marked as guesses until
 * somebody measures.
 *
 * WHAT IT REFUSES TO DO
 *
 * It does not invent cabinet sizes. Runs are filled from the real width ladder
 * and whatever is left is filler, because a drawing that cannot be ordered is
 * worse than no drawing.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChefHat, Bath, Plus, Trash2, AlertTriangle, ShieldCheck, Ruler, Wind, BadgeDollarSign,
} from 'lucide-react';
import {
  type CabinetRun, type CabinetFamily, fillRun, buildSchedule, cabinetTotals,
  counterTakeoff, cabinetCode, wallCabinetFits, wallCabinetHeadroomIn,
  COUNTER_HEIGHT_IN,
} from '../lib/cabinetModel';
import {
  type PlacedFixture, type Finding, fixturesFor, checkBathroom, checkKitchen,
  codeFailures, bathVentCfm,
} from '../lib/roomFixtures';
import type { House } from '../lib/houseModel';
import { roomViews } from '../lib/houseToTrades';
import type { DesignLink } from './ProjectLinkPanel';
import { projectId } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';
import {
  type CabinetGrade, type CounterMaterial, GRADES, COUNTER_MATERIALS,
  priceKitchen, skusToPrice, confidenceNote,
} from '../lib/cabinetPricing';
import { tradeRatesFrom, type TradeRates } from '../lib/sidingPricing';
import { DEFAULT_QUOTE_OPTIONS, type QuoteOptions } from '../lib/deckQuote';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

async function headers() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token || ''}`,
  };
}

type RoomKind = 'kitchen' | 'bathroom';

interface Props {
  kind: RoomKind;
  house?: House | null;
  stage?: 'capture' | 'design' | 'price' | 'documents';
  link?: DesignLink;
  onLink?: (next: DesignLink) => void;
}

const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';
const input = 'w-full px-2 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c]';
const tiny = 'w-full px-2 py-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-xs focus:outline-none focus:border-[#ea580c]';
const label = 'block text-[11px] font-semibold text-gray-400 mb-1';

let seq = 0;
const nid = (p: string) => `${p}-${++seq}-${Math.random().toString(36).slice(2, 6)}`;

export default function RoomDesigner({ kind, house, stage = 'design' }: Props) {
  const captured = useMemo(() => roomViews(house), [house]);
  const [viewId, setViewId] = useState<string | null>(captured[0]?.id ?? null);
  const room = captured.find(v => v.id === viewId) || captured[0] || null;

  // Falls back to a typical room so the tool is usable before a site visit.
  const [manualLengthFt, setManualLengthFt] = useState(kind === 'kitchen' ? 14 : 8);
  const [manualWidthFt, setManualWidthFt] = useState(kind === 'kitchen' ? 12 : 5);
  const [ceilingFt, setCeilingFt] = useState(8);

  const lengthFt = room ? room.widthFt : manualLengthFt;
  const widthFt = manualWidthFt;
  const ceilingIn = (room ? room.heightFt : ceilingFt) * 12;
  const fromHouse = Boolean(room);

  const [runs, setRuns] = useState<CabinetRun[]>([]);
  const [fixtures, setFixtures] = useState<PlacedFixture[]>([]);
  const [wallCabHeightIn, setWallCabHeightIn] = useState(30);
  const [aisleIn, setAisleIn] = useState(kind === 'kitchen' ? 42 : 0);
  const [cooks, setCooks] = useState<1 | 2>(1);
  const [fullSplash, setFullSplash] = useState(false);

  // ── pricing ──
  const [grade, setGrade] = useState<CabinetGrade>('semi-custom');
  const [counterMaterial, setCounterMaterial] = useState<CounterMaterial>('quartz');
  const [rates, setRates] = useState<TradeRates>({});
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [quoteOpts, setQuoteOpts] = useState<QuoteOptions>(DEFAULT_QUOTE_OPTIONS);

  const specs = fixturesFor(kind);

  const addRun = useCallback((family: CabinetFamily) => {
    const n = runs.filter(r => r.family === family).length + 1;
    const lengthIn = Math.round(lengthFt * 12);
    const sink = kind === 'bathroom' && family === 'vanity' && n === 1
      ? { widthIn: 30 } : undefined;
    setRuns(prev => [...prev, fillRun(
      `${family === 'wall' ? 'Wall' : family === 'tall' ? 'Tall' : family === 'vanity' ? 'Vanity' : 'Base'} ${n}`,
      lengthIn, family,
      { heightIn: family === 'wall' ? wallCabHeightIn : undefined, sink },
    )]);
  }, [runs, lengthFt, wallCabHeightIn, kind]);

  const refill = useCallback((id: string, lengthIn: number) => {
    setRuns(prev => prev.map(r => r.id === id
      ? { ...fillRun(r.label, lengthIn, r.family, { heightIn: r.family === 'wall' ? wallCabHeightIn : undefined }), id: r.id }
      : r));
  }, [wallCabHeightIn]);

  const addFixture = useCallback((specId: string) => {
    const spec = specs.find(s => s.id === specId);
    if (!spec) return;
    setFixtures(prev => [...prev, {
      id: nid('FX'), specId, label: spec.label,
      widthIn: spec.widthIn, depthIn: spec.depthIn,
      runId: runs[0]?.id, offsetIn: 0,
    }]);
  }, [specs, runs]);

  const schedule = useMemo(() => buildSchedule(runs), [runs]);
  const totals = useMemo(() => cabinetTotals(runs), [runs]);
  const counter = useMemo(
    () => counterTakeoff(runs, { fullHeightSplash: fullSplash }),
    [runs, fullSplash],
  );

  /**
   * Your rates and your margin, from the same places every other trade reads
   * them. A kitchen priced off different numbers than a deck is two price
   * books, and the gap between them only shows up in the accounts.
   */
  useEffect(() => {
    (async () => {
      try {
        const h = await headers();
        const [rateRes, cfgRes] = await Promise.all([
          fetch(`${SERVER}/labor-rates/get`, { headers: h }),
          fetch(`${SERVER}/pricing-config/get`, { headers: h }),
        ]);
        const r = await rateRes.json().catch(() => ({}));
        const cfg = await cfgRes.json().catch(() => ({}));
        setRates(tradeRatesFrom(r?.laborRates || []));
        const config = cfg?.config || {};
        setQuoteOpts(o => ({
          ...o,
          marginPct: Number(config.profitMargin ?? 0) || 0,
          taxRatePct: Number(config.taxRate ?? 0) || 0,
        }));
      } catch { /* the ballpark still works without them */ }
    })();
  }, []);

  /**
   * Ask the vendor catalogues about exactly the cabinets in THIS kitchen.
   *
   * The same route siding and flooring use, so when a cabinet supplier is
   * attached their prices arrive here without a line of this file changing.
   * Until then nothing comes back and every line falls to the grade ballpark,
   * which is marked as such.
   */
  useEffect(() => {
    if (!schedule.length) { setPrices({}); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${SERVER}/quote/price-lines`, {
          method: 'POST',
          headers: await headers(),
          body: JSON.stringify({ lines: skusToPrice(schedule, counterMaterial) }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        const next: Record<string, number> = {};
        for (const line of data?.priced || []) {
          if (Number(line.unitPrice) > 0) next[line.sku] = Number(line.unitPrice);
        }
        setPrices(next);
      } catch { /* leaves the ballpark in place */ }
    })();
    return () => { cancelled = true; };
  }, [schedule, counterMaterial]);

  const quote = useMemo(() => priceKitchen({
    schedule, runs, grade, counterMaterial, prices, rates, opts: quoteOpts,
    fullHeightSplash: fullSplash,
    cooktops: fixtures.filter(f => f.specId === 'cooktop' || f.specId === 'range').length,
  }), [schedule, runs, grade, counterMaterial, prices, rates, quoteOpts, fullSplash, fixtures]);

  const findings: Finding[] = useMemo(() => {
    if (kind === 'bathroom') {
      return checkBathroom({
        roomWidthIn: Math.round(lengthFt * 12),
        roomLengthIn: Math.round(widthFt * 12),
        fixtures,
      });
    }
    return checkKitchen({
      aisleIn, cooks, fixtures,
      runLengthIn: Math.round(lengthFt * 12),
    });
  }, [kind, lengthFt, widthFt, fixtures, aisleIn, cooks]);

  const failures = codeFailures(findings);
  const advice = findings.filter(f => f.severity === 'recommended');
  const roomAreaSqFt = Math.round(lengthFt * widthFt);
  const hasWet = fixtures.some(f => f.specId === 'shower' || f.specId === 'tub');
  const cabsFit = wallCabinetFits(ceilingIn, wallCabHeightIn);

  const Icon = kind === 'kitchen' ? ChefHat : Bath;

  return (
    <div className="space-y-4">
      {/* ── the room ── */}
      <div className={card}>
        <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
          <Icon className="w-4 h-4 text-[#ea580c]" /> {kind === 'kitchen' ? 'The kitchen' : 'The bathroom'}
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          {fromHouse
            ? 'Taken from the captured room, so it agrees with the rest of the house.'
            : 'Nothing captured for this room yet — these are working numbers until somebody measures.'}
        </p>

        {captured.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {captured.map(v => (
              <button key={v.id} onClick={() => setViewId(v.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  v.id === room?.id ? 'border-[#ea580c] text-white bg-[#ea580c]/15'
                                    : 'border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
                {v.name}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={label}>Length (ft)</label>
            <input type="number" step={0.5} className={input}
              value={fromHouse ? Number(lengthFt.toFixed(2)) : manualLengthFt}
              disabled={fromHouse}
              onChange={e => setManualLengthFt(Number(e.target.value) || 0)} />
          </div>
          <div>
            <label className={label}>Width (ft)</label>
            <input type="number" step={0.5} className={input} value={manualWidthFt}
              onChange={e => setManualWidthFt(Number(e.target.value) || 0)} />
          </div>
          <div>
            <label className={label}>Ceiling (ft)</label>
            <input type="number" step={0.5} className={input}
              value={fromHouse ? Number((ceilingIn / 12).toFixed(2)) : ceilingFt}
              disabled={fromHouse}
              onChange={e => setCeilingFt(Number(e.target.value) || 0)} />
          </div>
        </div>
        <p className="text-[11px] text-gray-500 mt-2">
          {roomAreaSqFt} sq ft. Worktop height {COUNTER_HEIGHT_IN}in.
          {fromHouse && ' The captured room owns the length and ceiling — change them in The house.'}
        </p>
        {!fromHouse && captured.length === 0 && (
          <p className="text-[11px] text-amber-500/90 mt-1 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
            Add a room in The house panel and these come from the real measurements.
          </p>
        )}
      </div>

      {/* ── what has to fit ── */}
      <div className={card}>
        <h3 className="text-sm font-bold text-white mb-1">
          {kind === 'kitchen' ? 'Appliances' : 'Fixtures'}
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          {kind === 'kitchen'
            ? 'A range or a dishwasher is a gap in the cabinetry, not a cabinet — nothing is ordered for it.'
            : 'Checked against the clearances an inspector measures, as they are placed.'}
        </p>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {specs.map(s => (
            <button key={s.id} onClick={() => addFixture(s.id)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-dashed border-[#2A2A2A] text-gray-400 hover:text-white flex items-center gap-1">
              <Plus className="w-3 h-3" /> {s.label}
            </button>
          ))}
        </div>

        {fixtures.length === 0 ? (
          <p className="text-[11px] text-gray-600">Nothing placed yet.</p>
        ) : (
          <ul className="space-y-2">
            {fixtures.map(f => {
              const spec = specs.find(s => s.id === f.specId);
              return (
                <li key={f.id} className="grid grid-cols-[1.3fr_1fr_1fr_1fr_auto] gap-1.5 items-center">
                  <span className="text-xs text-gray-300 truncate">{f.label}</span>
                  {spec?.widthsIn ? (
                    <select className={tiny} value={f.widthIn}
                      onChange={e => setFixtures(p => p.map(x => x.id === f.id ? { ...x, widthIn: Number(e.target.value) } : x))}>
                      {spec.widthsIn.map(w => <option key={w} value={w}>{w}in</option>)}
                    </select>
                  ) : (
                    <input type="number" className={tiny} value={f.widthIn} title="Width (in)"
                      onChange={e => setFixtures(p => p.map(x => x.id === f.id ? { ...x, widthIn: Number(e.target.value) || 0 } : x))} />
                  )}
                  <input type="number" className={tiny} value={f.depthIn} title="Depth (in)"
                    onChange={e => setFixtures(p => p.map(x => x.id === f.id ? { ...x, depthIn: Number(e.target.value) || 0 } : x))} />
                  <input type="number" className={tiny} value={f.offsetIn} title="From the left of the wall (in)"
                    onChange={e => setFixtures(p => p.map(x => x.id === f.id ? { ...x, offsetIn: Number(e.target.value) || 0 } : x))} />
                  <button onClick={() => setFixtures(p => p.filter(x => x.id !== f.id))}
                    className="text-gray-600 hover:text-red-400" title="Remove">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {kind === 'kitchen' && (
          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-[#2A2A2A]">
            <div>
              <label className={label}>Aisle between runs (in)</label>
              <input type="number" className={input} value={aisleIn}
                onChange={e => setAisleIn(Number(e.target.value) || 0)} />
            </div>
            <div>
              <label className={label}>Cooks</label>
              <select className={input} value={cooks}
                onChange={e => setCooks(Number(e.target.value) === 2 ? 2 : 1)}>
                <option value={1}>One</option>
                <option value={2}>Two</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ── what the rules say ── */}
      {(failures.length > 0 || advice.length > 0) && (
        <div className={card}>
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            {failures.length > 0
              ? <><AlertTriangle className="w-4 h-4 text-red-400" /> This would not pass</>
              : <><ShieldCheck className="w-4 h-4 text-amber-500" /> Worth changing</>}
          </h3>
          {failures.map((f, i) => (
            <div key={`c${i}`} className="rounded-xl border border-red-500/30 bg-red-500/[0.07] p-2.5 mb-2">
              <p className="text-xs text-red-300">{f.message}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{f.rule} — this fails inspection.</p>
            </div>
          ))}
          {advice.map((f, i) => (
            <div key={`r${i}`} className="rounded-xl border border-amber-500/25 bg-amber-500/[0.05] p-2.5 mb-2">
              <p className="text-xs text-amber-200/90">{f.message}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{f.rule} — guidance, not code. Your call.</p>
            </div>
          ))}
        </div>
      )}

      {failures.length === 0 && fixtures.length > 0 && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] p-3 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-200/90">
            Nothing here breaks a clearance rule.
            {kind === 'bathroom' && ` Specify a ${bathVentCfm(roomAreaSqFt, hasWet)} CFM extract fan.`}
          </p>
        </div>
      )}

      {/* ── cabinetry ── */}
      <div className={card}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-white">Cabinet runs</h3>
          <div className="flex gap-1.5">
            {(kind === 'kitchen'
              ? (['base', 'wall', 'tall'] as CabinetFamily[])
              : (['vanity', 'wall', 'tall'] as CabinetFamily[])
            ).map(fam => (
              <button key={fam} onClick={() => addRun(fam)}
                className="px-2 py-1 rounded-lg text-[11px] font-semibold border border-dashed border-[#2A2A2A] text-gray-400 hover:text-white">
                + {fam}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Filled from real cabinet widths, largest first. Whatever is left over is filler.
        </p>

        {runs.length === 0 ? (
          <p className="text-[11px] text-gray-600">
            No runs yet. Add one and it is filled to the wall length above.
          </p>
        ) : (
          <ul className="space-y-2">
            {runs.map(r => (
              <li key={r.id} className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-2.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-semibold text-white flex-1 truncate">{r.label}</span>
                  <input type="number" className={`${tiny} w-20`} value={Math.round(r.lengthIn)}
                    title="Run length (in)"
                    onChange={e => refill(r.id, Number(e.target.value) || 0)} />
                  <span className="text-[10px] text-gray-500">in</span>
                  <button onClick={() => setRuns(p => p.filter(x => x.id !== r.id))}
                    className="text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <p className="text-[11px] text-gray-400">
                  {r.cabinets.map(c => cabinetCode(c.type, c.widthIn, c.heightIn)).join(' · ') || 'nothing fits'}
                </p>
                {r.fillerIn > 0 && (
                  <p className={`text-[11px] mt-1 ${r.fillerIn > 6 ? 'text-amber-500/90' : 'text-gray-500'}`}>
                    {r.fillerIn}in filler
                    {r.fillerIn > 6 && ' — wide enough that another cabinet probably belongs here'}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-[#2A2A2A]">
          <div>
            <label className={label}>Wall cabinet height (in)</label>
            <select className={input} value={wallCabHeightIn}
              onChange={e => setWallCabHeightIn(Number(e.target.value))}>
              {[12, 15, 18, 24, 30, 36, 42].map(h => <option key={h} value={h}>{h}in</option>)}
            </select>
          </div>
          <label className="flex items-end gap-2 pb-1.5 cursor-pointer select-none">
            <input type="checkbox" checked={fullSplash} onChange={e => setFullSplash(e.target.checked)}
              className="w-4 h-4 accent-[#ea580c]" />
            <span className="text-xs text-gray-300">Full-height splash</span>
          </label>
        </div>
        {!cabsFit && (
          <p className="text-[11px] text-red-400 mt-2 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
            {wallCabHeightIn}in wall cabinets do not fit under a {(ceilingIn / 12).toFixed(1)}ft ceiling —
            short by {Math.abs(Math.round(wallCabinetHeadroomIn(ceilingIn, wallCabHeightIn)))}in.
          </p>
        )}
        {cabsFit && wallCabinetHeadroomIn(ceilingIn, wallCabHeightIn) === 0 && (
          <p className="text-[11px] text-amber-500/90 mt-2">
            They land exactly at the ceiling — no room for crown.
          </p>
        )}
      </div>

      {/* ── the schedule ── */}
      <div className={card}>
        <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <Ruler className="w-4 h-4 text-[#ea580c]" /> Cabinet schedule
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          Supplier codes and quantities. This is what gets ordered.
        </p>

        {schedule.length === 0 ? (
          <p className="text-[11px] text-gray-600">Nothing to schedule yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b border-[#2A2A2A]">
                  <th className="py-1.5 pr-2 font-semibold">Mark</th>
                  <th className="py-1.5 pr-2 font-semibold">Code</th>
                  <th className="py-1.5 pr-2 font-semibold">Item</th>
                  <th className="py-1.5 pr-2 font-semibold text-right">Qty</th>
                  <th className="py-1.5 pr-2 font-semibold text-right">W×H×D</th>
                  <th className="py-1.5 font-semibold">Where</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map(l => (
                  <tr key={l.mark} className="border-b border-[#1A1A1A]">
                    <td className="py-1.5 pr-2 font-bold text-[#ea580c]">{l.mark}</td>
                    <td className="py-1.5 pr-2 font-mono text-gray-200">{l.code}</td>
                    <td className="py-1.5 pr-2 text-gray-400">{l.label}</td>
                    <td className="py-1.5 pr-2 text-right text-white font-semibold">{l.quantity}</td>
                    <td className="py-1.5 pr-2 text-right text-gray-500">
                      {l.widthIn}×{l.heightIn}×{l.depthIn}
                    </td>
                    <td className="py-1.5 text-gray-600 truncate">{l.locations.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {schedule.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-[#2A2A2A]">
            <Stat label="Boxes" value={String(totals.boxes)} />
            <Stat label="Doors + drawers" value={String(totals.hardware)} sub="handles to order" />
            <Stat label="Worktop" value={`${counter.sqFt} sq ft`} sub={`${counter.linearFt} lin ft`} />
            <Stat label="Splash" value={`${counter.backsplashSqFt} sq ft`} />
          </div>
        )}
        {counter.sinkCutouts > 0 && (
          <p className="text-[11px] text-gray-500 mt-2">
            {counter.sinkCutouts} sink cutout{counter.sinkCutouts === 1 ? '' : 's'} and{' '}
            {counter.edgeLinearFt} linear feet of finished edge for the fabricator.
          </p>
        )}
      </div>

      {/* ── the money ──────────────────────────────────────────────────
          Shown on the Price stage, or whenever there is something to price. */}
      {schedule.length > 0 && (
        <div className={card}>
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <BadgeDollarSign className="w-4 h-4 text-[#ea580c]" /> The quote
          </h3>
          <p className="text-xs text-gray-500 mb-3">{confidenceNote(quote)}</p>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className={label}>Cabinet grade</label>
              <select className={input} value={grade}
                onChange={e => setGrade(e.target.value as CabinetGrade)}>
                {GRADES.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
              </select>
              <p className="text-[10px] text-gray-600 mt-1">
                {GRADES.find(g => g.id === grade)?.note}
              </p>
            </div>
            <div>
              <label className={label}>Worktop</label>
              <select className={input} value={counterMaterial}
                onChange={e => setCounterMaterial(e.target.value as CounterMaterial)}>
                {COUNTER_MATERIALS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b border-[#2A2A2A]">
                  <th className="py-1.5 pr-2 font-semibold">Item</th>
                  <th className="py-1.5 pr-2 font-semibold text-right">Qty</th>
                  <th className="py-1.5 pr-2 font-semibold text-right">Each</th>
                  <th className="py-1.5 pr-2 font-semibold text-right">Total</th>
                  <th className="py-1.5 font-semibold">Price from</th>
                </tr>
              </thead>
              <tbody>
                {quote.lines.map(l => (
                  <tr key={l.sku + l.description} className="border-b border-[#1A1A1A]">
                    <td className="py-1.5 pr-2 text-gray-300">{l.description}</td>
                    <td className="py-1.5 pr-2 text-right text-gray-400">
                      {l.qty}{l.unit === 'ea' ? '' : ` ${l.unit}`}
                    </td>
                    <td className="py-1.5 pr-2 text-right text-gray-400">
                      {l.unpriced ? '—' : `${l.unitPrice.toFixed(2)}`}
                    </td>
                    <td className="py-1.5 pr-2 text-right text-white font-semibold">
                      {l.unpriced ? '—' : `${l.total.toFixed(2)}`}
                    </td>
                    <td className="py-1.5"><PriceSourceTag source={l.source} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {quote.unpricedCount > 0 && (
            <p className="text-[11px] text-red-400 mt-2 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
              {quote.unpricedCount} line{quote.unpricedCount === 1 ? '' : 's'} could not be
              priced. The total below is short by whatever they cost — it is not a quote yet.
            </p>
          )}

          <div className="mt-3 pt-3 border-t border-[#2A2A2A] space-y-1">
            <Row label="Materials" value={quote.totals.materials} />
            <Row label="Labour" value={quote.totals.labour} />
            {quote.totals.margin > 0 && <Row label={`Margin ${quoteOpts.marginPct}%`} value={quote.totals.margin} />}
            {quote.totals.tax > 0 && <Row label={`Tax ${quoteOpts.taxRatePct}%`} value={quote.totals.tax} />}
            <div className="flex items-center justify-between pt-1.5 border-t border-[#2A2A2A]">
              <span className="text-sm font-bold text-white">Total</span>
              <span className="text-lg font-black text-[#ea580c]">
                ${quote.totals.total.toFixed(2)}
              </span>
            </div>
          </div>

          <p className="text-[10px] text-gray-600 mt-2">
            Cabinet prices are looked up per code in your vendor catalogues. Anything a
            vendor has not published falls back to a grade figure and is labelled.
          </p>
        </div>
      )}

      {kind === 'bathroom' && hasWet && (
        <div className={card}>
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <Wind className="w-4 h-4 text-[#ea580c]" /> Ventilation
          </h3>
          <p className="text-xs text-gray-500">
            {bathVentCfm(roomAreaSqFt, true)} CFM extract, ducted outside. The code minimum is 50;
            a wet room gets one CFM per square foot because the minimum keeps the inspector
            happy and does not keep the moisture out of the framing.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Where a price came from, said out loud on every line.
 *
 * A vendor's price and an industry ballpark look identical in a total. Labelling
 * them is what stops a conversation number becoming a signed number by
 * accident.
 */
function PriceSourceTag({ source }: { source: string }) {
  if (source === 'catalogue') return <span className="text-[10px] font-semibold text-emerald-400">vendor</span>;
  if (source === 'your-rate') return <span className="text-[10px] font-semibold text-sky-400">your rate</span>;
  if (source === 'standard') return <span className="text-[10px] font-semibold text-amber-500/90">ballpark</span>;
  return <span className="text-[10px] font-semibold text-red-400">no price</span>;
}

function Row({ label: l, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-400">{l}</span>
      <span className="text-xs text-gray-200 font-semibold">${value.toFixed(2)}</span>
    </div>
  );
}

function Stat({ label: l, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-2.5">
      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{l}</p>
      <p className="text-sm font-bold text-white mt-0.5">{value}</p>
      {sub && <p className="text-[10px] text-gray-600">{sub}</p>}
    </div>
  );
}
