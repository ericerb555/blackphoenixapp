/**
 * A siding job, counted.
 *
 * WHY THE ELEVATIONS ARE TYPED IN
 *
 * Siding is sold by the square and a fifteen percent error in facade area is
 * real money, so the quantities have to come from somewhere trustworthy. A
 * photograph is not that: the analysis in the design centre reads one wall of a
 * house and reports its own confidence about the numbers it took from it.
 *
 * So this asks for the walls. Four numbers a wall — how long, how tall, how far
 * the gable rises, how many storeys — is a few minutes with a tape and produces
 * an order somebody can actually place. Each wall records where its numbers came
 * from, and the takeoff is only ever as good as its weakest one.
 */

import { useMemo, useState } from 'react';
import { Plus, Trash2, Home, Info } from 'lucide-react';
import type { Elevation, ExteriorModel, SidingMaterial, DimensionSource } from '../lib/exteriorModel';
import { DEFAULT_EXTERIOR } from '../lib/exteriorModel';
import { buildSidingQuote, DEFAULT_SIDING_OPTIONS } from '../lib/sidingQuote';

const MATERIALS: Array<{ id: SidingMaterial; label: string }> = [
  { id: 'vinyl', label: 'Vinyl' },
  { id: 'fibre-cement', label: 'Fibre cement' },
  { id: 'wood', label: 'Cedar' },
  { id: 'engineered-wood', label: 'Engineered wood' },
];

const SOURCES: Array<{ id: DimensionSource; label: string; hint: string }> = [
  { id: 'measured', label: 'Measured', hint: 'Someone put a tape on it.' },
  { id: 'scaled', label: 'Scaled', hint: 'Taken from a photo with a known-size object in it.' },
  { id: 'estimated', label: 'Estimated', hint: 'Assumed from typical construction. Not an order.' },
];

const blankWall = (n: number): Elevation => ({
  id: `wall-${n}`,
  label: ['Front', 'Back', 'Left', 'Right'][n - 1] || `Wall ${n}`,
  widthFt: 0,
  heightFt: 9,
  gableRiseFt: 0,
  openings: [],
  storeys: 1,
  source: 'measured',
});

const field = 'w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-2.5 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#ea580c]';
const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';

/**
 * `initial` exists so a capture can seed the walls rather than making somebody
 * type what has already been read off a photograph. Nothing passes it yet; it
 * is the seam the interior and exterior captures plug into.
 */
export default function SidingTakeoff({ initial }: { initial?: Partial<ExteriorModel> } = {}) {
  const [model, setModel] = useState<ExteriorModel>({
    ...DEFAULT_EXTERIOR,
    elevations: [blankWall(1), blankWall(2), blankWall(3), blankWall(4)],
    ...initial,
  });
  const [includeTearOff, setIncludeTearOff] = useState(true);

  const patch = (i: number, p: Partial<Elevation>) =>
    setModel(m => ({ ...m, elevations: m.elevations.map((e, n) => (n === i ? { ...e, ...p } : e)) }));

  const quote = useMemo(
    () => buildSidingQuote(model, { ...DEFAULT_SIDING_OPTIONS, includeTearOff }),
    [model, includeTearOff],
  );

  // Nothing is worth showing until at least one wall has a size.
  const ready = model.elevations.some(e => Number(e.widthFt) > 0 && Number(e.heightFt) > 0);

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Home className="h-6 w-6 text-[#ea580c]" /> Siding takeoff
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Measure each wall once. Quantities and hours come out the other side.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          {/* ── the walls ─────────────────────────────────────────────── */}
          <div className={card}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">The walls</h2>
              <button
                onClick={() => setModel(m => ({ ...m, elevations: [...m.elevations, blankWall(m.elevations.length + 1)] }))}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-gray-300 hover:bg-white/5">
                <Plus className="h-3.5 w-3.5" /> Add a wall
              </button>
            </div>

            <div className="space-y-3">
              {model.elevations.map((e, i) => (
                <div key={e.id} className="rounded-xl border border-[#242424] bg-[#0d0d0d] p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <input value={e.label} onChange={ev => patch(i, { label: ev.target.value })}
                      className="flex-1 bg-transparent text-sm font-bold text-white focus:outline-none" />
                    {model.elevations.length > 1 && (
                      <button onClick={() => setModel(m => ({ ...m, elevations: m.elevations.filter((_, n) => n !== i) }))}
                        className="text-gray-600 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {([
                      ['widthFt', 'Length ft', e.widthFt],
                      ['heightFt', 'To eave ft', e.heightFt],
                      ['gableRiseFt', 'Gable rise ft', e.gableRiseFt || 0],
                      ['storeys', 'Storeys', e.storeys || 1],
                    ] as const).map(([key, label, value]) => (
                      <label key={key} className="block">
                        <span className="text-[10px] font-semibold text-gray-500">{label}</span>
                        <input value={String(value)} inputMode="decimal"
                          onChange={ev => patch(i, { [key]: Number(ev.target.value) || 0 } as any)}
                          className={`${field} mt-0.5`} />
                      </label>
                    ))}
                  </div>

                  {/* Openings, kept simple: how many and what size. Trim follows
                      every one of them; only the big ones come off the area. */}
                  <div className="mt-2 flex items-end gap-2">
                    <label className="flex-1">
                      <span className="text-[10px] font-semibold text-gray-500">Windows &amp; doors — count</span>
                      <input value={String(e.openings[0]?.count ?? 0)} inputMode="numeric"
                        onChange={ev => patch(i, {
                          openings: [{
                            kind: 'window',
                            widthFt: e.openings[0]?.widthFt || 3,
                            heightFt: e.openings[0]?.heightFt || 4,
                            count: Number(ev.target.value) || 0,
                          }],
                        })}
                        className={`${field} mt-0.5`} />
                    </label>
                    <label className="flex-1">
                      <span className="text-[10px] font-semibold text-gray-500">each, ft wide</span>
                      <input value={String(e.openings[0]?.widthFt ?? 3)} inputMode="decimal"
                        onChange={ev => patch(i, {
                          openings: [{ kind: 'window', widthFt: Number(ev.target.value) || 0, heightFt: e.openings[0]?.heightFt || 4, count: e.openings[0]?.count || 0 }],
                        })}
                        className={`${field} mt-0.5`} />
                    </label>
                    <label className="flex-1">
                      <span className="text-[10px] font-semibold text-gray-500">ft tall</span>
                      <input value={String(e.openings[0]?.heightFt ?? 4)} inputMode="decimal"
                        onChange={ev => patch(i, {
                          openings: [{ kind: 'window', widthFt: e.openings[0]?.widthFt || 3, heightFt: Number(ev.target.value) || 0, count: e.openings[0]?.count || 0 }],
                        })}
                        className={`${field} mt-0.5`} />
                    </label>
                  </div>

                  <div className="mt-2 flex gap-1.5">
                    {SOURCES.map(s => (
                      <button key={s.id} onClick={() => patch(i, { source: s.id })} title={s.hint}
                        className={`rounded-md px-2 py-1 text-[10px] font-bold transition ${
                          e.source === s.id ? 'bg-[#ea580c] text-white' : 'border border-white/10 text-gray-400 hover:bg-white/5'
                        }`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── the job ───────────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className={card}>
              <h2 className="mb-3 text-sm font-bold text-white">The job</h2>

              <div className="mb-3 grid grid-cols-4 gap-1.5">
                {MATERIALS.map(m => (
                  <button key={m.id} onClick={() => setModel(v => ({ ...v, material: m.id }))}
                    className={`rounded-lg px-2 py-2 text-[11px] font-bold transition ${
                      model.material === m.id ? 'bg-[#ea580c] text-white' : 'border border-white/10 text-gray-300 hover:bg-white/5'
                    }`}>
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {([
                  ['outsideCorners', 'Outside corners'],
                  ['insideCorners', 'Inside corners'],
                  ['cornerHeightFt', 'Corner height ft'],
                  ['wasteFactorPct', 'Waste %'],
                  ['minDeductSqFt', 'Deduct over sq ft'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="block">
                    <span className="text-[10px] font-semibold text-gray-500">{label}</span>
                    <input value={String((model as any)[key])} inputMode="decimal"
                      onChange={ev => setModel(m => ({ ...m, [key]: Number(ev.target.value) || 0 }))}
                      className={`${field} mt-0.5`} />
                  </label>
                ))}
              </div>

              <div className="mt-3 flex flex-col gap-2">
                <label className="flex items-center gap-2 text-xs text-gray-300">
                  <input type="checkbox" checked={model.includeWrap}
                    onChange={e => setModel(m => ({ ...m, includeWrap: e.target.checked }))}
                    className="h-4 w-4 accent-[#ea580c]" />
                  House wrap
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-300">
                  <input type="checkbox" checked={includeTearOff}
                    onChange={e => setIncludeTearOff(e.target.checked)}
                    className="h-4 w-4 accent-[#ea580c]" />
                  Strip the existing siding and skip it
                </label>
              </div>
            </div>

            {ready && (
              <>
                <div className={card}>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <Stat label="Gross wall" value={`${quote.takeoff.grossSqFt} sq ft`} />
                    <Stat label="Openings out" value={`${quote.takeoff.deductedSqFt} sq ft`} />
                    <Stat label="Covered" value={`${quote.takeoff.netSqFt} sq ft`} />
                    <Stat label="Order" value={`${quote.takeoff.squares} squares`} accent />
                  </div>
                  {/*
                    The note travels with the numbers, because a quote is exactly
                    where somebody forgets the walls were never measured.
                  */}
                  <p className={`mt-3 flex gap-2 text-[11px] ${
                    quote.basis === 'measured' ? 'text-gray-500' : 'text-amber-500/90'
                  }`}>
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {quote.note}
                  </p>
                </div>

                <div className={card}>
                  <div className="mb-2 flex items-baseline justify-between">
                    <h2 className="text-sm font-bold text-white">Materials and labour</h2>
                    <span className="text-xs text-gray-500">{quote.totalHours} hours</span>
                  </div>
                  <div className="space-y-1.5">
                    {quote.lines.map(l => (
                      <div key={l.sku} className="flex items-baseline justify-between gap-3 border-b border-white/5 pb-1.5 last:border-0">
                        <div className="min-w-0">
                          <p className="truncate text-xs text-white">{l.description}</p>
                          <p className="truncate text-[10px] text-gray-600">{l.basis}</p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-[#ea580c]">
                          {l.qty} {l.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] text-gray-600">
                    Quantities and hours only. Prices come from the vendor catalogue and your trade
                    rates, the same as every other quote.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${accent ? 'text-[#ea580c]' : 'text-white'}`}>{value}</p>
    </div>
  );
}
