/**
 * Devices and fixtures over the floor plan.
 *
 * WHAT A SUB ACTUALLY NEEDS
 *
 * Two things, and the second is the one usually missing. Where the new work
 * goes — and where the services already are. An electrician who can see the
 * panel and what circuits exist quotes what the job costs; one who cannot adds
 * a number for the unknown, and that number is always bigger than the truth.
 *
 * So everything here has a state, existing sits beside proposed, and the count
 * reports them separately. Photographs of the open panel and under the sink
 * belong with the job's site photos and are worth more to a plumber than any
 * drawing.
 *
 * IT IS A SCOPE PLAN, NOT ENGINEERING
 *
 * No load calculations, no panel schedules, no fixture units. We say what we
 * want and what is there; the licensed trade says whether it works. That is
 * worth real money to them and carries none of the liability of designing the
 * system.
 */
import { useMemo, useState } from 'react';
import { Zap, Plus, Trash2, AlertTriangle, ShieldAlert, ListPlus, Clock } from 'lucide-react';
import { toast } from 'sonner';
import {
  type Placement, type Discipline,
  CATALOGUE, DISCIPLINES, itemById, itemsFor, placeItem,
  countByDiscipline, readSystems, systemsScopeLines, systemsNote,
} from '../lib/systemsModel';
import type { FloorPlan } from '../lib/floorPlanModel';
import type { ScopeLine } from '../lib/scopeModel';

const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';
const tiny = 'px-2 py-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-xs focus:outline-none focus:border-[#ea580c]';

const STATE_STYLE: Record<Placement['state'], string> = {
  existing: 'border-sky-500/40 text-sky-300 bg-sky-500/10',
  proposed: 'border-[#ea580c]/50 text-[#ea580c] bg-[#ea580c]/10',
  removed: 'border-red-500/40 text-red-300 bg-red-500/10',
};

export default function SystemsLayer({ placements, onChange, plan, onAddToScope }: {
  placements: Placement[];
  onChange: (p: Placement[]) => void;
  plan?: FloorPlan;
  onAddToScope?: (lines: Array<Omit<ScopeLine, 'id'>>) => void;
}) {
  const [discipline, setDiscipline] = useState<Discipline>('electrical');
  const [state, setState] = useState<Placement['state']>('proposed');

  const counts = useMemo(() => countByDiscipline(placements), [placements]);
  const findings = useMemo(() => readSystems(placements), [placements]);
  const mine = useMemo(
    () => placements.filter(p => itemById(p.itemId)?.discipline === discipline),
    [placements, discipline],
  );

  const extent = useMemo(() => {
    const xs = (plan?.rooms || []).flatMap(r => [r.x, r.x + r.widthFt]);
    const ys = (plan?.rooms || []).flatMap(r => [r.y, r.y + r.depthFt]);
    return { w: Math.max(20, ...xs.map(v => v + 2)), h: Math.max(16, ...ys.map(v => v + 2)) };
  }, [plan]);

  const add = (itemId: string) => {
    // Dropped into the middle of the plan rather than at the origin, so it
    // lands somewhere visible and gets dragged from there.
    onChange([...placements, placeItem(itemId, Math.round(extent.w / 2), Math.round(extent.h / 2), state)]);
  };

  const patch = (id: string, p: Partial<Placement>) =>
    onChange(placements.map(x => (x.id === id ? { ...x, ...p } : x)));

  return (
    <div className="space-y-4">
      <div className={card}>
        <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-[#ea580c]" /> Devices and fixtures
        </h2>
        <p className="text-xs text-gray-500 mb-3">{systemsNote(placements)}</p>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {DISCIPLINES.map(d => {
            const n = placements.filter(p => itemById(p.itemId)?.discipline === d.id).length;
            return (
              <button key={d.id} onClick={() => setDiscipline(d.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                  discipline === d.id
                    ? 'border-[#ea580c] text-white bg-[#ea580c]/15'
                    : 'border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
                {d.label}{n > 0 && <span className="ml-1 text-gray-500">{n}</span>}
              </button>
            );
          })}
        </div>

        {/* Over the plan, so a device has somewhere to be rather than being a
            row in a list that happens to mention a room. */}
        {plan && plan.rooms.length > 0 && (
          <svg viewBox={`0 0 ${extent.w} ${extent.h}`}
            className="w-full rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] mb-3" style={{ maxHeight: 300 }}>
            {plan.rooms.map(r => (
              <g key={r.id}>
                <rect x={r.x} y={r.y} width={r.widthFt} height={r.depthFt}
                  fill={r.state === 'proposed' ? 'rgba(234,88,12,0.08)' : 'rgba(255,255,255,0.04)'}
                  stroke="#2f2f2f" strokeWidth={0.12} />
                <text x={r.x + 0.4} y={r.y + 1} fill="#4a4a4a" fontSize={0.8}>{r.name}</text>
              </g>
            ))}
            {mine.map(p => {
              const item = itemById(p.itemId);
              if (!item) return null;
              const colour = p.state === 'existing' ? '#38bdf8' : p.state === 'removed' ? '#ef4444' : '#ea580c';
              return (
                <g key={p.id}>
                  <circle cx={p.x} cy={p.y} r={0.7} fill="#0A0A0A" stroke={colour} strokeWidth={0.16} />
                  <text x={p.x} y={p.y} fill={colour} fontSize={0.6} textAnchor="middle" dominantBaseline="middle">
                    {item.symbol}
                  </text>
                </g>
              );
            })}
          </svg>
        )}

        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-[11px] text-gray-500">Adding as</span>
          {(['existing', 'proposed', 'removed'] as const).map(st => (
            <button key={st} onClick={() => setState(st)}
              className={`px-2 py-1 rounded-lg text-[10px] font-semibold border ${
                state === st ? STATE_STYLE[st] : 'border-[#2A2A2A] text-gray-500'}`}>
              {st}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {itemsFor(discipline).map(i => (
            <button key={i.id} onClick={() => add(i.id)} title={i.note || i.label}
              className="px-2 py-1.5 rounded-lg text-[11px] font-semibold border border-dashed border-[#2A2A2A] text-gray-400 hover:text-white flex items-center gap-1">
              <Plus className="w-3 h-3" /> {i.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── what is placed ── */}
      {mine.length > 0 && (
        <div className={card}>
          <h3 className="text-sm font-bold text-white mb-2">
            {DISCIPLINES.find(d => d.id === discipline)?.label} — {mine.length} placed
          </h3>
          <ul className="space-y-1.5">
            {mine.map(p => {
              const item = itemById(p.itemId)!;
              return (
                <li key={p.id} className="grid grid-cols-[1.4fr_auto_auto_auto_auto] gap-1.5 items-center">
                  <span className="text-xs text-gray-300 truncate">{item.label}</span>
                  <input type="number" step={0.5} value={p.x} title="X (ft)" className={`${tiny} w-14`}
                    onChange={e => patch(p.id, { x: Number(e.target.value) || 0 })} />
                  <input type="number" step={0.5} value={p.y} title="Y (ft)" className={`${tiny} w-14`}
                    onChange={e => patch(p.id, { y: Number(e.target.value) || 0 })} />
                  <button onClick={() => patch(p.id, {
                    state: p.state === 'existing' ? 'proposed' : p.state === 'proposed' ? 'removed' : 'existing',
                  })}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold border ${STATE_STYLE[p.state]}`}>
                    {p.state}
                  </button>
                  <button onClick={() => onChange(placements.filter(x => x.id !== p.id))}
                    className="text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ── the count a sub prices from ── */}
      {counts.length > 0 && (
        <div className={card}>
          <h3 className="text-sm font-bold text-white mb-1">The count</h3>
          <p className="text-xs text-gray-500 mb-3">
            What a sub prices from. Existing shown beside proposed, because seeing what is
            already there is what lets them quote tight instead of padding.
          </p>
          {counts.map(c => (
            <div key={c.discipline} className="mb-3">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs font-bold text-white">{c.label}</span>
                <span className="text-[10px] text-gray-500">
                  {c.roughInCount} before the walls close
                </span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-600 border-b border-[#2A2A2A]">
                    <th className="py-1 font-semibold">Item</th>
                    <th className="py-1 font-semibold text-right">Existing</th>
                    <th className="py-1 font-semibold text-right">New</th>
                  </tr>
                </thead>
                <tbody>
                  {c.rows.map(r => (
                    <tr key={r.itemId} className="border-b border-[#1A1A1A]">
                      <td className="py-1 text-gray-300">
                        {r.label}
                        {r.roughIn && <Clock className="w-3 h-3 text-gray-600 inline ml-1" />}
                      </td>
                      <td className="py-1 text-right text-sky-400">{r.existing || '—'}</td>
                      <td className="py-1 text-right text-white font-semibold">{r.proposed || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* ── what it means elsewhere ── */}
      {findings.length > 0 && (
        <div className={card}>
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" /> What this means
          </h3>
          <div className="space-y-2">
            {findings.map((f, i) => (
              <div key={i} className={`rounded-xl p-2.5 border ${
                f.severity === 'code' ? 'border-red-500/30 bg-red-500/[0.06]'
                  : f.severity === 'sequence' ? 'border-amber-500/30 bg-amber-500/[0.06]'
                  : 'border-[#2A2A2A] bg-[#0A0A0A]'}`}>
                <p className={`text-xs ${
                  f.severity === 'code' ? 'text-red-300'
                    : f.severity === 'sequence' ? 'text-amber-200/90' : 'text-gray-400'}`}>
                  {f.message}
                </p>
                <p className="text-[10px] text-gray-600 mt-0.5">
                  {f.severity === 'code' ? 'code' : f.severity === 'sequence' ? 'sequence — it has to happen earlier than you think' : 'worth checking'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {onAddToScope && placements.some(p => p.state === 'proposed') && (
        <button
          onClick={() => {
            const lines = systemsScopeLines(placements).map(l => ({
              phase: l.phase as any, trade: l.trade, description: l.description,
              qty: l.qty, unit: l.unit, bidOut: l.bidOut,
              confidence: 'provisional' as const, origin: 'trade-tool' as const,
              basis: l.basis,
            }));
            onAddToScope(lines);
            toast.success(`${lines.length} lines added to the scope, including the blocking framing owes.`);
          }}
          className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <ListPlus className="w-4 h-4" /> Add the systems work to the scope
        </button>
      )}
    </div>
  );
}
