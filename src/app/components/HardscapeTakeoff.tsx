/**
 * Patios, walkways, granite steps and retaining walls.
 *
 * WHAT THIS SCREEN INSISTS ON SHOWING
 *
 * The pavers, and then everything under them. On a patio in New Hampshire the
 * base and the excavation together usually cost more than the surface, and they
 * are the lines most often left off an estimate — so they are given the same
 * prominence as the thing the customer actually sees, rather than being folded
 * into a subtotal.
 *
 * Granite steps sit apart from the area entirely, because they are units with a
 * weight rather than square footage. A six foot tread is the better part of
 * nine hundred pounds, and knowing that before the day is what decides whether
 * a machine turns up.
 */
import { useMemo, useState } from 'react';
import { Layers3, Plus, Trash2, AlertTriangle, Truck, Weight } from 'lucide-react';
import {
  type Surface, type GraniteStep, type RetainingWall,
  type SurfaceUse, type PaverMaterial, type PatternId,
  USES, PAVERS, PATTERNS, BEDDING_IN,
  computeHardscape, stepWeightLb, needsMachine,
} from '../lib/hardscapeModel';

const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';
const field = 'w-full px-2 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c]';
const tiny = 'w-full px-2 py-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-xs focus:outline-none focus:border-[#ea580c]';
const label = 'block text-[11px] font-semibold text-gray-400 mb-1';

let seq = 0;
const nid = (p: string) => `${p}-${++seq}-${Math.random().toString(36).slice(2, 6)}`;

const blankSurface = (n: number): Surface => ({
  id: nid('SF'), name: `Area ${n}`, use: 'patio', material: 'concrete-paver',
  pattern: 'running-bond', lengthFt: 20, widthFt: 15, beddingIn: BEDDING_IN,
});

const blankStep = (): GraniteStep => ({
  id: nid('GS'), lengthFt: 5, depthIn: 18, riseIn: 7, quantity: 1, finish: 'thermal',
});

const blankWall = (): RetainingWall => ({
  id: nid('RW'), lengthFt: 20, heightFt: 3, blockLengthIn: 12, blockHeightIn: 8, hasCap: true,
});

export default function HardscapeTakeoff() {
  const [surfaces, setSurfaces] = useState<Surface[]>([blankSurface(1)]);
  const [steps, setSteps] = useState<GraniteStep[]>([]);
  const [walls, setWalls] = useState<RetainingWall[]>([]);

  const t = useMemo(() => computeHardscape(surfaces, steps, walls), [surfaces, steps, walls]);

  const patchSurface = (id: string, p: Partial<Surface>) =>
    setSurfaces(s => s.map(x => (x.id === id ? { ...x, ...p } : x)));

  return (
    <div className="space-y-4">
      {/* ── the areas ── */}
      <div className={card}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers3 className="w-4 h-4 text-[#ea580c]" /> Paved areas
          </h2>
          <button onClick={() => setSurfaces(s => [...s, blankSurface(s.length + 1)])}
            className="px-2 py-1 rounded-lg text-[11px] font-semibold border border-dashed border-[#2A2A2A] text-gray-400 hover:text-white flex items-center gap-1">
            <Plus className="w-3 h-3" /> area
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Patios, walkways, driveways and landings. What goes under them is worked out from
          what they carry.
        </p>

        {surfaces.length === 0 ? (
          <p className="text-[11px] text-gray-600">No areas yet.</p>
        ) : (
          <ul className="space-y-3">
            {surfaces.map(s => {
              const use = USES.find(u => u.id === s.use)!;
              const paver = PAVERS.find(p => p.id === s.material)!;
              return (
                <li key={s.id} className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <input value={s.name} onChange={e => patchSurface(s.id, { name: e.target.value })}
                      className={`${tiny} flex-1`} />
                    <button onClick={() => setSurfaces(x => x.filter(y => y.id !== s.id))}
                      className="text-gray-600 hover:text-red-400 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <select className={tiny} value={s.use}
                      onChange={e => patchSurface(s.id, { use: e.target.value as SurfaceUse })}>
                      {USES.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
                    </select>
                    <select className={tiny} value={s.material}
                      onChange={e => patchSurface(s.id, { material: e.target.value as PaverMaterial })}>
                      {PAVERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                    <select className={tiny} value={s.pattern}
                      onChange={e => patchSurface(s.id, { pattern: e.target.value as PatternId })}>
                      {PATTERNS.map(p => <option key={p.id} value={p.id}>{p.label} · {p.wastePct}%</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <NumTiny v={s.lengthFt} t="Length (ft)" on={v => patchSurface(s.id, { lengthFt: v })} />
                    <NumTiny v={s.widthFt} t="Width (ft)" on={v => patchSurface(s.id, { widthFt: v })} />
                    <NumTiny v={s.areaSqFt ?? 0} t="Or area (sq ft)"
                      on={v => patchSurface(s.id, { areaSqFt: v > 0 ? v : undefined })} />
                    <NumTiny v={s.beddingIn} t="Bedding (in)" on={v => patchSurface(s.id, { beddingIn: v })} />
                  </div>

                  <p className="text-[10px] text-gray-600 mt-1.5">
                    {use.baseDepthIn}in base · {paver.thicknessIn}in units · {use.note}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── granite ── */}
      <div className={card}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Weight className="w-4 h-4 text-[#ea580c]" /> Granite steps
          </h3>
          <button onClick={() => setSteps(s => [...s, blankStep()])}
            className="px-2 py-1 rounded-lg text-[11px] font-semibold border border-dashed border-[#2A2A2A] text-gray-400 hover:text-white flex items-center gap-1">
            <Plus className="w-3 h-3" /> step
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Priced and handled as units, not area. Weight decides whether it is a crew or a machine.
        </p>

        {steps.length === 0 ? (
          <p className="text-[11px] text-gray-600">None on this job.</p>
        ) : (
          <ul className="space-y-2">
            {steps.map(s => {
              const w = stepWeightLb(s);
              return (
                <li key={s.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto_auto] gap-1.5 items-center">
                  <NumTiny v={s.lengthFt} t="Length (ft)" on={v => setSteps(x => x.map(y => y.id === s.id ? { ...y, lengthFt: v } : y))} />
                  <NumTiny v={s.depthIn} t="Depth (in)" on={v => setSteps(x => x.map(y => y.id === s.id ? { ...y, depthIn: v } : y))} />
                  <NumTiny v={s.riseIn} t="Rise (in)" on={v => setSteps(x => x.map(y => y.id === s.id ? { ...y, riseIn: v } : y))} />
                  <NumTiny v={s.quantity} t="Qty" on={v => setSteps(x => x.map(y => y.id === s.id ? { ...y, quantity: v } : y))} />
                  <span className={`text-[11px] font-semibold shrink-0 ${needsMachine(s) ? 'text-amber-500' : 'text-gray-500'}`}>
                    {w} lb
                  </span>
                  <button onClick={() => setSteps(x => x.filter(y => y.id !== s.id))}
                    className="text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── walls ── */}
      <div className={card}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-white">Retaining walls</h3>
          <button onClick={() => setWalls(w => [...w, blankWall()])}
            className="px-2 py-1 rounded-lg text-[11px] font-semibold border border-dashed border-[#2A2A2A] text-gray-400 hover:text-white flex items-center gap-1">
            <Plus className="w-3 h-3" /> wall
          </button>
        </div>
        {walls.length === 0 ? (
          <p className="text-[11px] text-gray-600">None on this job.</p>
        ) : (
          <ul className="space-y-2">
            {walls.map(w => (
              <li key={w.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto_auto] gap-1.5 items-center">
                <NumTiny v={w.lengthFt} t="Length (ft)" on={v => setWalls(x => x.map(y => y.id === w.id ? { ...y, lengthFt: v } : y))} />
                <NumTiny v={w.heightFt} t="Height (ft)" on={v => setWalls(x => x.map(y => y.id === w.id ? { ...y, heightFt: v } : y))} />
                <NumTiny v={w.blockLengthIn} t="Block length (in)" on={v => setWalls(x => x.map(y => y.id === w.id ? { ...y, blockLengthIn: v } : y))} />
                <NumTiny v={w.blockHeightIn} t="Block height (in)" on={v => setWalls(x => x.map(y => y.id === w.id ? { ...y, blockHeightIn: v } : y))} />
                <label className="flex items-center gap-1 text-[11px] text-gray-400 shrink-0">
                  <input type="checkbox" checked={w.hasCap} className="w-3 h-3 accent-[#ea580c]"
                    onChange={e => setWalls(x => x.map(y => y.id === w.id ? { ...y, hasCap: e.target.checked } : y))} />
                  cap
                </label>
                <button onClick={() => setWalls(x => x.filter(y => y.id !== w.id))}
                  className="text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── the takeoff ── */}
      <div className={card}>
        <h3 className="text-sm font-bold text-white mb-1">The takeoff</h3>
        <p className="text-xs text-gray-500 mb-3">
          Worked out from the hole up, because on a patio here the base and the digging
          usually cost more than the surface.
        </p>

        <p className="text-[11px] font-semibold text-gray-400 mb-1.5">What you see</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <Stat l="Laid area" v={`${t.areaSqFt} sq ft`} />
          <Stat l="Order" v={`${t.paversToOrderSqFt} sq ft`} s={`${t.wastePct}% for cuts`} />
          <Stat l="Edge restraint" v={`${t.edgeRestraintFt} ft`} />
          <Stat l="Polymeric sand" v={`${t.polySandBags} bags`} />
        </div>

        <p className="text-[11px] font-semibold text-gray-400 mb-1.5 flex items-center gap-1.5">
          <Truck className="w-3.5 h-3.5 text-gray-600" /> What you do not
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <Stat l="Dig depth" v={`${t.digDepthIn} in`} />
          <Stat l="Excavate" v={`${t.excavationCuYd} cy`} s={`${t.disposalCuYd} cy to haul`} />
          <Stat l="Gravel base" v={`${t.baseTons} tons`} s={`${t.baseCuYd} cy`} />
          <Stat l="Bedding" v={`${t.beddingTons} tons`} s={`${t.beddingCuYd} cy`} />
        </div>

        {(t.stepCount > 0 || t.wallFaceSqFt > 0) && (
          <>
            <p className="text-[11px] font-semibold text-gray-400 mb-1.5">Units</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {t.stepCount > 0 && <Stat l="Granite steps" v={`${t.stepCount}`} s={`${t.stepWeightLb} lb total`} />}
              {t.wallFaceSqFt > 0 && <Stat l="Wall face" v={`${t.wallFaceSqFt} sq ft`} s={`${t.wallBlocks} blocks`} />}
              {t.wallCapFt > 0 && <Stat l="Wall cap" v={`${t.wallCapFt} ft`} />}
              {t.machineNeeded && <Stat l="Setting" v="Machine" s="too heavy by hand" />}
            </div>
          </>
        )}

        {t.notes.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-[#2A2A2A]">
            {t.notes.map((n, i) => (
              <p key={i} className="text-[11px] text-gray-400 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500/70 shrink-0 mt-px" />{n}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NumTiny({ v, t, on }: { v: number; t: string; on: (n: number) => void }) {
  return (
    <input type="number" step={0.5} min={0} value={v} title={t} placeholder={t} className={tiny}
      onChange={e => {
        const n = Number(e.target.value);
        if (Number.isFinite(n)) on(n);
      }} />
  );
}

function Stat({ l, v, s }: { l: string; v: string; s?: string }) {
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-2.5">
      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{l}</p>
      <p className="text-sm font-bold text-white mt-0.5">{v}</p>
      {s && <p className="text-[10px] text-gray-600">{s}</p>}
    </div>
  );
}
