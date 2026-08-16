/**
 * DeckFinishPicker — the finishes, laid out the way the conversation goes.
 *
 * Material family first, then colour within it, because that is the order a
 * customer actually decides in: what it costs and how long it lasts, and only
 * then what shade of brown. Grouping by family also puts the price conversation
 * where it belongs — every colour inside a group costs about the same, so the
 * expensive decision is which row you are looking at, not which swatch.
 *
 * Every change lands in the 3D view immediately. That is the whole point: the
 * customer says "what about the grey one" and sees the grey one on their deck,
 * rather than holding a four-inch sample against a photograph.
 */
import { Layers, Fence, Info } from 'lucide-react';
import {
  DECKING_FINISHES, RAIL_FINISHES, deckingFinish, railFinish,
  type DeckingFinish,
} from '../lib/deckFinishes';
import type { DeckModel } from '../lib/deckModel';

interface Props {
  model: DeckModel;
  onChange: (patch: Partial<DeckModel>) => void;
}

export default function DeckFinishPicker({ model, onChange }: Props) {
  const deck = deckingFinish(model.deckingFinish);
  const rail = railFinish(model.railFinish);

  // Families in the order they are usually priced, cheapest first.
  const families = ['Pressure-treated', 'Cedar', 'Composite', 'PVC', 'Hardwood'] as const;
  const byFamily = families
    .map(f => ({ family: f, items: DECKING_FINISHES.filter(d => d.family === f) }))
    .filter(g => g.items.length > 0);

  return (
    <div className="rounded-2xl border border-[#2A2A2A] bg-[#111] p-4 space-y-5">
      <div>
        <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
          <Layers className="w-4 h-4 text-[#ea580c]" /> Decking
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          Changes the 3D view as you pick, so a customer sees the finish on their own deck.
        </p>

        <div className="space-y-3">
          {byFamily.map(group => (
            <div key={group.family}>
              <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1.5">
                {group.family}
              </div>
              <div className="flex flex-wrap gap-2">
                {group.items.map(f => (
                  <Swatch key={f.id} finish={f}
                    on={f.id === model.deckingFinish}
                    onPick={() => onChange({ deckingFinish: f.id })} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="flex items-start gap-2 text-xs text-gray-400 mt-3">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#ea580c]" />
          <span><strong className="text-white">{deck.label}</strong> — {deck.note}</span>
        </p>
      </div>

      <div className="pt-4 border-t border-[#2A2A2A]">
        <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
          <Fence className="w-4 h-4 text-[#ea580c]" /> Railing
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          Cable and glass are built differently, not just coloured differently — the view rebuilds
          the railing to match.
        </p>

        <div className="grid grid-cols-2 gap-2">
          {RAIL_FINISHES.map(r => {
            const on = r.id === model.railFinish;
            return (
              <button key={r.id} onClick={() => onChange({ railFinish: r.id })}
                aria-pressed={on}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition"
                style={{
                  background: on ? 'rgba(234,88,12,0.14)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${on ? '#ea580c' : '#2A2A2A'}`,
                }}>
                {/* A miniature of the railing itself rather than a colour dot:
                    the difference between cable, glass and balusters is the
                    thing being chosen. */}
                <RailIcon frame={r.frameHex} infill={r.infillHex}
                  kind={r.infill} opacity={r.infillOpacity} />
                <span className="text-xs font-semibold text-white leading-tight">{r.label}</span>
              </button>
            );
          })}
        </div>

        <p className="flex items-start gap-2 text-xs text-gray-400 mt-3">
          <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#ea580c]" />
          <span><strong className="text-white">{rail.label}</strong> — {rail.note}</span>
        </p>

        <label className="flex items-start gap-2.5 mt-3 cursor-pointer">
          <input type="checkbox" checked={model.innerHandrail}
            onChange={e => onChange({ innerHandrail: e.target.checked })}
            className="mt-0.5 accent-[#ea580c] w-4 h-4" />
          <span className="text-xs">
            <span className="text-white font-semibold">Extra handrail inside the stairs</span>
            <span className="block text-gray-500">
              The stair railing above is already the graspable one. Tick this only when a second
              rail is wanted on the inside — some inspectors ask for it on a wide flight.
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}

function Swatch({ finish, on, onPick }: { finish: DeckingFinish; on: boolean; onPick: () => void }) {
  return (
    <button onClick={onPick} title={finish.note} aria-pressed={on}
      className="rounded-xl overflow-hidden transition"
      style={{
        border: `2px solid ${on ? '#ea580c' : 'transparent'}`,
        outline: on ? 'none' : '1px solid #2A2A2A',
      }}>
      {/* Board lines on the swatch, so it reads as decking rather than paint. */}
      <span className="block w-16 h-9 relative" style={{ background: finish.hex }}>
        <span className="absolute inset-0" style={{
          backgroundImage:
            'repeating-linear-gradient(180deg, rgba(0,0,0,0.16) 0 1px, transparent 1px 7px)',
        }} />
      </span>
      <span className="block px-1.5 py-1 text-[10px] font-semibold text-white bg-black/40 text-center leading-tight">
        {finish.label}
      </span>
    </button>
  );
}

function RailIcon({ frame, infill, kind, opacity }: {
  frame: string; infill: string; kind: string; opacity: number;
}) {
  return (
    <svg width="26" height="22" viewBox="0 0 26 22" className="shrink-0" aria-hidden="true">
      {/* Posts */}
      <rect x="1" y="2" width="3" height="19" fill={frame} rx="0.5" />
      <rect x="22" y="2" width="3" height="19" fill={frame} rx="0.5" />
      {/* Top and bottom rails */}
      <rect x="1" y="2" width="24" height="2.4" fill={frame} rx="0.6" />
      <rect x="1" y="17" width="24" height="2" fill={frame} rx="0.5" />
      {kind === 'glass' && (
        <rect x="4.5" y="5" width="17" height="12" fill={infill} opacity={opacity} rx="0.5" />
      )}
      {kind === 'cable' && [6, 9, 12, 15].map(y => (
        <rect key={y} x="4.5" y={y} width="17" height="1" fill={infill} rx="0.5" />
      ))}
      {kind === 'baluster' && [6, 9.5, 13, 16.5, 20].map(x => (
        <rect key={x} x={x - 0.7} y="5" width="1.4" height="12" fill={infill} rx="0.4" />
      ))}
    </svg>
  );
}
