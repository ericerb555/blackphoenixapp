/**
 * The floor plan — trace what is there, draw what is not.
 *
 * Two jobs on one drawing, and keeping them on one drawing is the point. An
 * addition is new footprint attached to an old building, so the room that
 * exists and the room that does not have to sit beside each other at the same
 * scale, or nobody can see whether the new one lines up.
 *
 * WHAT IT INSISTS ON
 *
 * That a wall marked to come out says whether it is holding anything up — and
 * that "we do not know yet" is a legitimate answer which the price then has to
 * live with. The gap between a partition and a bearing wall is thousands of
 * dollars, and a plan that lets the question go unasked is how the cheap
 * version gets quoted for the expensive job.
 */
import { useMemo, useState } from 'react';
import {
  LayoutGrid, Plus, Trash2, AlertTriangle, ShieldAlert, ListPlus, Ruler,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  type FloorPlan, type PlanRoom, type PlanWall, type Existence, type Bearing,
  blankRoom, blankWall, planTotals, readPlan, planNote, planScopeLines,
  roomArea, wallLength, INTERIOR_WALL_IN, EXTERIOR_WALL_IN,
} from '../lib/floorPlanModel';
import type { ScopeLine } from '../lib/scopeModel';

const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';
const tiny = 'px-2 py-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-xs focus:outline-none focus:border-[#ea580c]';
const label = 'block text-[11px] font-semibold text-gray-400 mb-1';

const STATE_STYLE: Record<Existence, string> = {
  existing: 'border-[#2A2A2A] text-gray-300',
  proposed: 'border-[#ea580c]/50 text-[#ea580c] bg-[#ea580c]/10',
  removed: 'border-red-500/40 text-red-300 bg-red-500/10',
};

const BEARING_STYLE: Record<Bearing, string> = {
  unknown: 'border-amber-500/40 text-amber-400 bg-amber-500/[0.08]',
  bearing: 'border-red-500/40 text-red-300 bg-red-500/10',
  'non-bearing': 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
};

export default function FloorPlanEditor({ plan, onChange, onAddToScope }: {
  plan: FloorPlan;
  onChange: (p: FloorPlan) => void;
  onAddToScope?: (lines: Array<Omit<ScopeLine, 'id'>>) => void;
}) {
  const [sel, setSel] = useState<string | null>(null);

  const t = useMemo(() => planTotals(plan), [plan]);
  const findings = useMemo(() => readPlan(plan), [plan]);

  const patchRoom = (id: string, p: Partial<PlanRoom>) =>
    onChange({ ...plan, rooms: plan.rooms.map(r => (r.id === id ? { ...r, ...p } : r)) });
  const patchWall = (id: string, p: Partial<PlanWall>) =>
    onChange({ ...plan, walls: plan.walls.map(w => (w.id === id ? { ...w, ...p } : w)) });

  const addRoom = (state: Existence) => {
    const n = plan.rooms.length + 1;
    // Placed to the right of everything so far, so a new room never lands on
    // top of an existing one and immediately reads as a drawing error.
    const right = plan.rooms.reduce((m, r) => Math.max(m, r.x + r.widthFt), 0);
    onChange({
      ...plan,
      rooms: [...plan.rooms, { ...blankRoom(state === 'proposed' ? `Addition ${n}` : `Room ${n}`, state), x: right + 2 }],
    });
  };

  const addWall = () => {
    onChange({ ...plan, walls: [...plan.walls, { ...blankWall({ x: 0, y: 0 }, { x: 12, y: 0 }), label: `wall ${plan.walls.length + 1}` }] });
  };

  /* ── the drawing ── */
  const extent = useMemo(() => {
    const xs = plan.rooms.flatMap(r => [r.x, r.x + r.widthFt]);
    const ys = plan.rooms.flatMap(r => [r.y, r.y + r.depthFt]);
    plan.walls.forEach(w => { xs.push(w.a.x, w.b.x); ys.push(w.a.y, w.b.y); });
    return {
      w: Math.max(20, ...xs.map(v => v + 2)),
      h: Math.max(16, ...ys.map(v => v + 2)),
    };
  }, [plan]);

  return (
    <div className="space-y-4">
      <div className={card}>
        <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
          <LayoutGrid className="w-4 h-4 text-[#ea580c]" /> The floor plan
        </h2>
        <p className="text-xs text-gray-500 mb-3">{planNote(plan)}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <Stat l="Existing" v={`${t.existingSqFt} sq ft`} />
          <Stat l="Proposed" v={`${t.proposedSqFt} sq ft`} />
          <Stat l="Finished" v={`${t.finishedSqFt} sq ft`} />
          <Stat l="Walls out" v={String(t.wallsRemoved)}
            sub={t.removedUnknown ? `${t.removedUnknown} unanswered` : undefined} />
        </div>

        {/* A drawing rather than a table, because a table cannot show that the
            addition does not line up with the house. */}
        {plan.rooms.length > 0 || plan.walls.length > 0 ? (
          <svg viewBox={`0 0 ${extent.w} ${extent.h}`} className="w-full rounded-xl border border-[#2A2A2A] bg-[#0A0A0A]"
            style={{ maxHeight: 320 }}>
            <defs>
              <pattern id="ft" width="1" height="1" patternUnits="userSpaceOnUse">
                <path d="M1 0 L0 0 0 1" fill="none" stroke="#1c1c1c" strokeWidth="0.03" />
              </pattern>
            </defs>
            <rect width={extent.w} height={extent.h} fill="url(#ft)" />

            {plan.rooms.map(r => (
              <g key={r.id} onClick={() => setSel(r.id)} style={{ cursor: 'pointer' }}>
                <rect x={r.x} y={r.y} width={r.widthFt} height={r.depthFt}
                  fill={r.state === 'proposed' ? 'rgba(234,88,12,0.12)' : 'rgba(255,255,255,0.05)'}
                  stroke={r.state === 'proposed' ? '#ea580c' : '#3a3a3a'}
                  strokeWidth={sel === r.id ? 0.28 : 0.14}
                  strokeDasharray={r.state === 'proposed' ? '0.6 0.4' : undefined} />
                <text x={r.x + r.widthFt / 2} y={r.y + r.depthFt / 2} fill="#9aa0a6"
                  fontSize={Math.min(1.1, r.widthFt / 8)} textAnchor="middle" dominantBaseline="middle">
                  {r.name}
                </text>
              </g>
            ))}

            {plan.walls.map(w => (
              <line key={w.id} x1={w.a.x} y1={w.a.y} x2={w.b.x} y2={w.b.y}
                onClick={() => setSel(w.id)} style={{ cursor: 'pointer' }}
                stroke={w.state === 'removed' ? '#ef4444' : w.bearing === 'bearing' ? '#f59e0b' : '#6b7280'}
                strokeWidth={sel === w.id ? 0.5 : 0.35}
                strokeDasharray={w.state === 'removed' ? '0.8 0.5' : undefined} />
            ))}
          </svg>
        ) : (
          <p className="text-[11px] text-gray-600">
            Nothing drawn. Trace the rooms that are there, then draw what is going in.
          </p>
        )}

        <div className="flex flex-wrap gap-1.5 mt-3">
          <button onClick={() => addRoom('existing')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-dashed border-[#2A2A2A] text-gray-400 hover:text-white flex items-center gap-1">
            <Plus className="w-3 h-3" /> Existing room
          </button>
          <button onClick={() => addRoom('proposed')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-dashed border-[#ea580c]/40 text-[#ea580c] hover:brightness-125 flex items-center gap-1">
            <Plus className="w-3 h-3" /> Proposed room
          </button>
          <button onClick={addWall}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-dashed border-[#2A2A2A] text-gray-400 hover:text-white flex items-center gap-1">
            <Plus className="w-3 h-3" /> Interior wall
          </button>
        </div>
      </div>

      {/* ── rooms ── */}
      {plan.rooms.length > 0 && (
        <div className={card}>
          <h3 className="text-sm font-bold text-white mb-2">Rooms</h3>
          <ul className="space-y-2">
            {plan.rooms.map(r => (
              <li key={r.id}
                className={`rounded-xl border bg-[#0A0A0A] p-2.5 ${sel === r.id ? 'border-[#ea580c]/50' : 'border-[#2A2A2A]'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <input value={r.name} onChange={e => patchRoom(r.id, { name: e.target.value })}
                    className={`${tiny} flex-1 min-w-0`} />
                  <button onClick={() => patchRoom(r.id, { state: r.state === 'existing' ? 'proposed' : 'existing' })}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold border ${STATE_STYLE[r.state]}`}>
                    {r.state}
                  </button>
                  <button onClick={() => onChange({ ...plan, rooms: plan.rooms.filter(x => x.id !== r.id) })}
                    className="text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  <Num v={r.widthFt} t="Width (ft)" on={v => patchRoom(r.id, { widthFt: v })} />
                  <Num v={r.depthFt} t="Depth (ft)" on={v => patchRoom(r.id, { depthFt: v })} />
                  <Num v={r.ceilingFt} t="Ceiling (ft)" on={v => patchRoom(r.id, { ceilingFt: v })} />
                  <Num v={r.x} t="X" on={v => patchRoom(r.id, { x: v })} />
                  <Num v={r.y} t="Y" on={v => patchRoom(r.id, { y: v })} />
                </div>
                <p className="text-[10px] text-gray-600 mt-1">{Math.round(roomArea(r))} sq ft</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── walls ── */}
      {plan.walls.length > 0 && (
        <div className={card}>
          <h3 className="text-sm font-bold text-white mb-1">Walls</h3>
          <p className="text-xs text-gray-500 mb-2">
            A wall marked to come out has to say whether it is holding anything up. “Not yet”
            is a real answer — the price just cannot be firm until it changes.
          </p>
          <ul className="space-y-2">
            {plan.walls.map(w => (
              <li key={w.id}
                className={`rounded-xl border bg-[#0A0A0A] p-2.5 ${sel === w.id ? 'border-[#ea580c]/50' : 'border-[#2A2A2A]'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <input value={w.label || ''} placeholder="what this wall is"
                    onChange={e => patchWall(w.id, { label: e.target.value })}
                    className={`${tiny} flex-1 min-w-0`} />
                  <span className="text-[10px] text-gray-600 shrink-0">{Math.round(wallLength(w) * 10) / 10}ft</span>
                  <button onClick={() => onChange({ ...plan, walls: plan.walls.filter(x => x.id !== w.id) })}
                    className="text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>

                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  <Num v={w.a.x} t="from X" on={v => patchWall(w.id, { a: { ...w.a, x: v } })} />
                  <Num v={w.a.y} t="from Y" on={v => patchWall(w.id, { a: { ...w.a, y: v } })} />
                  <Num v={w.b.x} t="to X" on={v => patchWall(w.id, { b: { ...w.b, x: v } })} />
                  <Num v={w.b.y} t="to Y" on={v => patchWall(w.id, { b: { ...w.b, y: v } })} />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(['existing', 'removed'] as Existence[]).map(st => (
                    <button key={st} onClick={() => patchWall(w.id, { state: st })}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold border ${
                        w.state === st ? STATE_STYLE[st] : 'border-[#2A2A2A] text-gray-500'}`}>
                      {st === 'removed' ? 'coming out' : 'staying'}
                    </button>
                  ))}
                  <span className="w-2" />
                  {(['unknown', 'non-bearing', 'bearing'] as Bearing[]).map(b => (
                    <button key={b} onClick={() => patchWall(w.id, { bearing: b })}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold border ${
                        w.bearing === b ? BEARING_STYLE[b] : 'border-[#2A2A2A] text-gray-500'}`}>
                      {b === 'unknown' ? 'not yet known' : b}
                    </button>
                  ))}
                  <button onClick={() => patchWall(w.id, {
                    thicknessIn: w.thicknessIn === INTERIOR_WALL_IN ? EXTERIOR_WALL_IN : INTERIOR_WALL_IN,
                  })}
                    className="px-2 py-1 rounded-lg text-[10px] font-semibold border border-[#2A2A2A] text-gray-500 hover:text-white">
                    {w.thicknessIn}in
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── what the plan says ── */}
      {findings.length > 0 && (
        <div className={card}>
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" /> What this plan means
          </h3>
          <div className="space-y-2">
            {findings.map((f, i) => (
              <div key={i} className={`rounded-xl p-2.5 border ${
                f.severity === 'blocking' ? 'border-red-500/30 bg-red-500/[0.06]'
                  : f.severity === 'structural' ? 'border-amber-500/30 bg-amber-500/[0.06]'
                  : 'border-[#2A2A2A] bg-[#0A0A0A]'}`}>
                <p className={`text-xs ${
                  f.severity === 'blocking' ? 'text-red-300'
                    : f.severity === 'structural' ? 'text-amber-200/90' : 'text-gray-400'}`}>
                  {f.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── into the scope ── */}
      {onAddToScope && (plan.walls.some(w => w.state === 'removed') || plan.rooms.some(r => r.state === 'proposed')) && (
        <button
          onClick={() => {
            const lines = planScopeLines(plan).map(l => ({
              phase: l.phase as any, trade: l.trade, description: l.description,
              qty: l.qty, unit: l.unit,
              confidence: 'provisional' as const, origin: 'trade-tool' as const,
              basis: l.basis,
            }));
            onAddToScope(lines);
            toast.success(`${lines.length} lines added to the scope from the plan.`);
          }}
          className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <ListPlus className="w-4 h-4" /> Add the structural work to the scope
        </button>
      )}
    </div>
  );
}

function Num({ v, t, on }: { v: number; t: string; on: (n: number) => void }) {
  return (
    <input type="number" step={0.5} value={v} title={t} placeholder={t} className={tiny}
      onChange={e => {
        const n = Number(e.target.value);
        if (Number.isFinite(n)) on(n);
      }} />
  );
}

function Stat({ l, v, sub }: { l: string; v: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-2.5">
      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{l}</p>
      <p className="text-sm font-bold text-white mt-0.5">{v}</p>
      {sub && <p className="text-[10px] text-amber-500/90">{sub}</p>}
    </div>
  );
}
