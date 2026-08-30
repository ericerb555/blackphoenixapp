/**
 * The window and door schedule — the form a purchase order comes off.
 *
 * WHY IT LOOKS LIKE THIS
 *
 * A row per opening, collapsed to the six things you scan for — mark, type,
 * size, quantity, supplier, price — and expanding to the full specification.
 * A schedule is read far more often than it is written, and a form that shows
 * forty fields per opening cannot be read at all.
 *
 * WHAT IT REFUSES TO LET PAST
 *
 * The checks are not decoration. A door without handing, a unit larger than its
 * hole, or a bedroom window whose style cannot make the clear opening are
 * blocking: the order should not be placed, because the units would arrive
 * wrong or would not fit. Everything else is a prompt for a person to judge.
 *
 * Both are shown while the schedule is being written rather than at the moment
 * somebody presses order, because that is when they are cheap to fix.
 */

import { useMemo, useState } from 'react';
import {
  Plus, Trash2, Copy, ChevronDown, ChevronRight, AlertTriangle, Info,
  ClipboardList, Building2, Home,
} from 'lucide-react';
import {
  checkSchedule, clearOpening, groupForOrdering, isDoor, WINDOW_STYLES,
  type Market, type OpeningSpec, type OpeningType, type WindowStyle,
  type FrameType, type Handing, type DoorSwing, type GridPattern,
} from '../lib/openingSpec';
import type { DimensionSource } from '../lib/exteriorModel';

const field = 'w-full rounded-lg border border-[#2a2a2a] bg-[#0a0a0a] px-2 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#ea580c]';
const label = 'text-[10px] font-semibold text-gray-500';
const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';
const money = (n: number) => `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const TYPES: Array<{ id: OpeningType; label: string }> = [
  { id: 'window', label: 'Window' },
  { id: 'entry-door', label: 'Entry door' },
  { id: 'patio-door', label: 'Patio / slider' },
  { id: 'interior-door', label: 'Interior door' },
  { id: 'storefront', label: 'Storefront' },
];

const FRAME_TYPES: Array<{ id: FrameType; label: string; hint: string }> = [
  { id: 'nailing-fin', label: 'Nailing fin', hint: 'New construction and full-frame replacement.' },
  { id: 'block-frame', label: 'Block frame', hint: 'No fin — sits in a finished opening.' },
  { id: 'retrofit-flange', label: 'Retrofit flange', hint: 'Over the existing frame, exterior flange.' },
];

const GRIDS: Array<{ id: GridPattern; label: string }> = [
  { id: 'none', label: 'None' },
  { id: 'colonial', label: 'Colonial' },
  { id: 'prairie', label: 'Prairie' },
  { id: 'diamond', label: 'Diamond' },
  { id: 'custom', label: 'Custom' },
];

const SOURCES: Array<{ id: DimensionSource; label: string; hint: string }> = [
  { id: 'measured', label: 'Measured', hint: 'A tape was on it.' },
  { id: 'scaled', label: 'Scaled', hint: 'From a photo with something of known size in it.' },
  { id: 'estimated', label: 'Estimated', hint: 'A guess. A window is made to the size you give.' },
];

let seq = 1;
const blankSpec = (market: Market, n: number): OpeningSpec => ({
  id: `spec-${seq++}`,
  mark: `W${n}`,
  location: '',
  quantity: 1,
  type: 'window',
  roughWidthIn: 0,
  roughHeightIn: 0,
  unitWidthIn: 0,
  unitHeightIn: 0,
  source: 'measured',
  style: 'double-hung',
  frameType: market === 'residential' ? 'nailing-fin' : undefined,
  fit: 'insert',
  grids: 'none',
  screens: true,
  tempered: false,
});

export default function OpeningScheduleForm({ specs, onChange, market, onMarket }: {
  specs: OpeningSpec[];
  onChange: (next: OpeningSpec[]) => void;
  market: Market;
  onMarket: (m: Market) => void;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const patch = (id: string, p: Partial<OpeningSpec>) =>
    onChange(specs.map(s => (s.id === id ? { ...s, ...p } : s)));

  const problems = useMemo(() => checkSchedule(specs, market), [specs, market]);
  const blocking = problems.filter(p => p.severity === 'blocking');
  const checks = problems.filter(p => p.severity === 'check');
  const orders = useMemo(() => groupForOrdering(specs), [specs]);

  const problemsFor = (mark: string) => problems.filter(p => p.mark === (mark || '(unmarked)'));

  return (
    <div className="space-y-4">
      {/* Residential or commercial. One form; the field set differs. */}
      <div className={card}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={label}>This job is</span>
          {([['residential', 'Residential', Home], ['commercial', 'Commercial', Building2]] as const).map(([id, text, Icon]) => (
            <button key={id} onClick={() => onMarket(id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                market === id ? 'bg-[#ea580c] text-white' : 'border border-white/10 text-gray-400 hover:bg-white/5'
              }`}>
              <Icon className="h-3.5 w-3.5" /> {text}
            </button>
          ))}
          <div className="grow" />
          <button
            onClick={() => onChange([...specs, blankSpec(market, specs.length + 1)])}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-gray-300 hover:bg-white/5">
            <Plus className="h-3.5 w-3.5" /> Add an opening
          </button>
        </div>
      </div>

      {/* ── the schedule ─────────────────────────────────────────────── */}
      <div className="space-y-2">
        {specs.map(s => {
          const mine = problemsFor(s.mark);
          const blocked = mine.some(p => p.severity === 'blocking');
          const expanded = open[s.id];
          const door = isDoor(s.type);
          const clear = s.type === 'window' ? clearOpening(s) : null;

          return (
            <div key={s.id}
              className={`rounded-xl border bg-[#0d0d0d] ${blocked ? 'border-red-500/40' : 'border-[#242424]'}`}>
              {/* Collapsed: the six things you scan for. */}
              <div className="flex flex-wrap items-end gap-2 p-3">
                <button onClick={() => setOpen(o => ({ ...o, [s.id]: !o[s.id] }))}
                  className="mt-4 text-gray-500 hover:text-white">
                  {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>

                <label className="block w-16">
                  <span className={label}>Mark</span>
                  <input value={s.mark} onChange={e => patch(s.id, { mark: e.target.value })}
                    className={`${field} mt-0.5 font-bold`} />
                </label>

                <label className="block min-w-[8rem] flex-1">
                  <span className={label}>Location</span>
                  <input value={s.location} onChange={e => patch(s.id, { location: e.target.value })}
                    placeholder="front bedroom" className={`${field} mt-0.5`} />
                </label>

                <label className="block w-32">
                  <span className={label}>Type</span>
                  <select value={s.type} onChange={e => patch(s.id, { type: e.target.value as OpeningType })}
                    className={`${field} mt-0.5`}>
                    {TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </label>

                <label className="block w-20">
                  <span className={label}>Unit W</span>
                  <input value={String(s.unitWidthIn || '')} inputMode="decimal"
                    onChange={e => patch(s.id, { unitWidthIn: Number(e.target.value) || 0 })}
                    className={`${field} mt-0.5`} />
                </label>
                <label className="block w-20">
                  <span className={label}>Unit H</span>
                  <input value={String(s.unitHeightIn || '')} inputMode="decimal"
                    onChange={e => patch(s.id, { unitHeightIn: Number(e.target.value) || 0 })}
                    className={`${field} mt-0.5`} />
                </label>

                <label className="block w-16">
                  <span className={label}>Qty</span>
                  <input value={String(s.quantity || '')} inputMode="numeric"
                    onChange={e => patch(s.id, { quantity: Number(e.target.value) || 0 })}
                    className={`${field} mt-0.5`} />
                </label>

                <label className="block w-28">
                  <span className={label}>Supplier</span>
                  <input value={s.supplier || ''} onChange={e => patch(s.id, { supplier: e.target.value })}
                    placeholder="who" className={`${field} mt-0.5`} />
                </label>

                {/*
                  Typed, not looked up. A window is quoted per unit by a
                  supplier against this exact specification — pricing it by type
                  would be pretending every double-hung costs the same.
                */}
                <label className="block w-24">
                  <span className={label}>Price each</span>
                  <input value={String(s.unitPrice || '')} inputMode="decimal"
                    onChange={e => patch(s.id, { unitPrice: Number(e.target.value) || 0 })}
                    placeholder="0.00" className={`${field} mt-0.5 text-right`} />
                </label>

                <div className="mt-4 flex gap-1">
                  <button onClick={() => onChange([...specs, { ...s, id: `spec-${seq++}`, mark: `${s.mark}a` }])}
                    title="Duplicate — a house has six of the same window"
                    className="text-gray-600 hover:text-white"><Copy className="h-4 w-4" /></button>
                  {specs.length > 1 && (
                    <button onClick={() => onChange(specs.filter(x => x.id !== s.id))}
                      className="text-gray-600 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                  )}
                </div>
              </div>

              {/* Problems on this row, where they can be acted on. */}
              {mine.length > 0 && (
                <div className="border-t border-white/5 px-3 py-2">
                  {mine.map((p, i) => (
                    <p key={i} className={`flex gap-1.5 text-[11px] ${p.severity === 'blocking' ? 'text-red-400' : 'text-amber-500/80'}`}>
                      {p.severity === 'blocking'
                        ? <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                        : <Info className="mt-0.5 h-3 w-3 shrink-0" />}
                      {p.message}
                    </p>
                  ))}
                </div>
              )}

              {expanded && (
                <div className="space-y-3 border-t border-white/5 p-3">
                  {/* The hole in the wall, kept beside what gets ordered. */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <label className="block">
                      <span className={label}>Rough opening W</span>
                      <input value={String(s.roughWidthIn || '')} inputMode="decimal"
                        onChange={e => patch(s.id, { roughWidthIn: Number(e.target.value) || 0 })}
                        className={`${field} mt-0.5`} />
                    </label>
                    <label className="block">
                      <span className={label}>Rough opening H</span>
                      <input value={String(s.roughHeightIn || '')} inputMode="decimal"
                        onChange={e => patch(s.id, { roughHeightIn: Number(e.target.value) || 0 })}
                        className={`${field} mt-0.5`} />
                    </label>
                    <label className="block">
                      <span className={label}>Product line</span>
                      <input value={s.productLine || ''} onChange={e => patch(s.id, { productLine: e.target.value })}
                        className={`${field} mt-0.5`} />
                    </label>
                    <label className="block">
                      <span className={label}>Jamb depth in</span>
                      <input value={String(s.jambDepthIn || '')} inputMode="decimal"
                        onChange={e => patch(s.id, { jambDepthIn: Number(e.target.value) || 0 })}
                        className={`${field} mt-0.5`} />
                    </label>
                  </div>

                  {s.type === 'window' && (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <label className="block">
                        <span className={label}>Style</span>
                        <select value={s.style || ''} onChange={e => patch(s.id, { style: e.target.value as WindowStyle })}
                          className={`${field} mt-0.5`}>
                          <option value="">—</option>
                          {WINDOW_STYLES.map(w => <option key={w.id} value={w.id}>{w.label}</option>)}
                        </select>
                      </label>
                      <label className="block">
                        <span className={label}>Frame type</span>
                        <select value={s.frameType || ''} onChange={e => patch(s.id, { frameType: e.target.value as FrameType })}
                          className={`${field} mt-0.5`}
                          title={FRAME_TYPES.find(f => f.id === s.frameType)?.hint}>
                          <option value="">—</option>
                          {FRAME_TYPES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                        </select>
                      </label>
                      <label className="block">
                        <span className={label}>Frame material</span>
                        <input value={s.frameMaterial || ''} onChange={e => patch(s.id, { frameMaterial: e.target.value })}
                          placeholder="vinyl, clad, fibreglass" className={`${field} mt-0.5`} />
                      </label>
                      <label className="block">
                        <span className={label}>Grids</span>
                        <select value={s.grids || 'none'} onChange={e => patch(s.id, { grids: e.target.value as GridPattern })}
                          className={`${field} mt-0.5`}>
                          {GRIDS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                        </select>
                      </label>
                    </div>
                  )}

                  {door && (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {/* Handing and swing are required, not optional. A door
                          hung the wrong way round cannot be fitted. */}
                      <label className="block">
                        <span className={label}>Handing <span className="text-[#ea580c]">required</span></span>
                        <select value={s.handing || ''} onChange={e => patch(s.id, { handing: e.target.value as Handing })}
                          className={`${field} mt-0.5`}>
                          <option value="">—</option>
                          <option value="left">Left hand</option>
                          <option value="right">Right hand</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className={label}>Swing <span className="text-[#ea580c]">required</span></span>
                        <select value={s.swing || ''} onChange={e => patch(s.id, { swing: e.target.value as DoorSwing })}
                          className={`${field} mt-0.5`}>
                          <option value="">—</option>
                          <option value="inswing">Inswing</option>
                          <option value="outswing">Outswing</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className={label}>Lock prep</span>
                        <input value={s.lockPrep || ''} onChange={e => patch(s.id, { lockPrep: e.target.value })}
                          className={`${field} mt-0.5`} />
                      </label>
                      <label className="block">
                        <span className={label}>Threshold</span>
                        <input value={s.threshold || ''} onChange={e => patch(s.id, { threshold: e.target.value })}
                          className={`${field} mt-0.5`} />
                      </label>
                    </div>
                  )}

                  {market === 'commercial' && (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <label className="block">
                        <span className={label}>Framing series</span>
                        <input value={s.framingSeries || ''} onChange={e => patch(s.id, { framingSeries: e.target.value })}
                          className={`${field} mt-0.5`} />
                      </label>
                      <label className="block">
                        <span className={label}>Framing finish</span>
                        <input value={s.framingFinish || ''} onChange={e => patch(s.id, { framingFinish: e.target.value })}
                          placeholder="anodised, Kynar" className={`${field} mt-0.5`} />
                      </label>
                      <label className="block">
                        <span className={label}>Fire rating</span>
                        <input value={s.fireRating || ''} onChange={e => patch(s.id, { fireRating: e.target.value })}
                          className={`${field} mt-0.5`} />
                      </label>
                      <div className="flex flex-col justify-end gap-1 text-[11px] text-gray-300">
                        <Check label="Panic hardware" on={!!s.panicHardware} set={v => patch(s.id, { panicHardware: v })} />
                        <Check label="Closer" on={!!s.closer} set={v => patch(s.id, { closer: v })} />
                        <Check label="ADA threshold" on={!!s.adaThreshold} set={v => patch(s.id, { adaThreshold: v })} />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <label className="block">
                      <span className={label}>Exterior colour</span>
                      <input value={s.exteriorColour || ''} onChange={e => patch(s.id, { exteriorColour: e.target.value })}
                        className={`${field} mt-0.5`} />
                    </label>
                    <label className="block">
                      <span className={label}>Interior finish</span>
                      <input value={s.interiorFinish || ''} onChange={e => patch(s.id, { interiorFinish: e.target.value })}
                        className={`${field} mt-0.5`} />
                    </label>
                    <label className="block">
                      <span className={label}>Glass package</span>
                      <input value={s.glassPackage || ''} onChange={e => patch(s.id, { glassPackage: e.target.value })}
                        placeholder="Low-E, argon" className={`${field} mt-0.5`} />
                    </label>
                    <div className="flex flex-col justify-end gap-1 text-[11px] text-gray-300">
                      <Check label="Tempered" on={!!s.tempered} set={v => patch(s.id, { tempered: v })} />
                      <Check label="Egress required" on={!!s.egressRequired} set={v => patch(s.id, { egressRequired: v })} />
                      <Check label="Screens" on={!!s.screens} set={v => patch(s.id, { screens: v })} />
                    </div>
                  </div>

                  {market === 'residential' && s.type === 'window' && (
                    <div className="flex flex-wrap gap-4 text-[11px] text-gray-300">
                      <Check label="Capping" on={!!s.capping} set={v => patch(s.id, { capping: v })} />
                      <Check label="Extension jambs" on={!!s.extensionJambs} set={v => patch(s.id, { extensionJambs: v })} />
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex gap-1.5">
                      {(['insert', 'full-frame'] as const).map(f => (
                        <button key={f} onClick={() => patch(s.id, { fit: f })}
                          className={`rounded-md px-2 py-1 text-[10px] font-bold transition ${
                            s.fit === f ? 'bg-[#ea580c] text-white' : 'border border-white/10 text-gray-400 hover:bg-white/5'
                          }`}>
                          {f === 'insert' ? 'Insert' : 'Full frame'}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      {SOURCES.map(src => (
                        <button key={src.id} onClick={() => patch(s.id, { source: src.id })} title={src.hint}
                          className={`rounded-md px-2 py-1 text-[10px] font-bold transition ${
                            s.source === src.id ? 'bg-white/15 text-white' : 'border border-white/10 text-gray-500 hover:bg-white/5'
                          }`}>
                          {src.label}
                        </button>
                      ))}
                    </div>
                    {/* Shown because it is the number egress is judged on, and
                        it is not the unit size. */}
                    {clear && clear.sqFt > 0 && (
                      <span className="text-[10px] text-gray-500">
                        clear opening {clear.widthIn}″ × {clear.heightIn}″ · {clear.sqFt} sq ft
                      </span>
                    )}
                  </div>

                  <input value={s.notes || ''} onChange={e => patch(s.id, { notes: e.target.value })}
                    placeholder="Notes for the supplier" className={field} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── what would go wrong ──────────────────────────────────────── */}
      <div className={card}>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
          <ClipboardList className="h-4 w-4 text-[#ea580c]" /> Before ordering
        </h3>
        {blocking.length === 0 && checks.length === 0 ? (
          <p className="text-xs text-gray-500">Nothing outstanding. This schedule can be ordered from.</p>
        ) : (
          <div className="space-y-1">
            {blocking.length > 0 && (
              <p className="text-xs font-semibold text-red-400">
                {blocking.length} {blocking.length === 1 ? 'thing stops' : 'things stop'} this being ordered.
              </p>
            )}
            {checks.length > 0 && (
              <p className="text-xs text-amber-500/90">
                {checks.length} {checks.length === 1 ? 'thing needs' : 'things need'} a decision from you.
              </p>
            )}
            <p className="pt-1 text-[11px] text-gray-600">
              Each is shown on its own row above, where it can be fixed.
            </p>
          </div>
        )}
      </div>

      {/* ── the orders this schedule makes ───────────────────────────── */}
      {orders.length > 0 && (
        <div className={card}>
          <h3 className="mb-2 text-sm font-bold text-white">Purchase orders</h3>
          <p className="mb-3 text-[11px] text-gray-600">
            One order per supplier. A job taking windows from one house and doors from another is two
            orders off this one schedule.
          </p>
          <div className="space-y-2">
            {orders.map(o => (
              <div key={o.supplier} className="flex items-baseline justify-between gap-3 border-b border-white/5 pb-2 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{o.supplier}</p>
                  <p className="truncate text-[11px] text-gray-600">
                    {o.lines.length} {o.lines.length === 1 ? 'line' : 'lines'} · {o.units} units ·{' '}
                    {o.lines.map(l => l.mark).filter(Boolean).join(', ')}
                  </p>
                </div>
                <span className={`shrink-0 text-sm font-bold ${o.priced ? 'text-[#ea580c]' : 'text-gray-600'}`}>
                  {o.priced ? money(o.total) : 'unpriced'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Check({ label: text, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-1.5">
      <input type="checkbox" checked={on} onChange={e => set(e.target.checked)}
        className="h-3.5 w-3.5 accent-[#ea580c]" />
      {text}
    </label>
  );
}
