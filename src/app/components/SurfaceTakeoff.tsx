/**
 * Walls and ceilings, taken off the rooms already drawn.
 *
 * The floor plan knows the rooms and their ceiling heights. Nothing was turning
 * that into board, tile and paint — which is most of a sheetrock job and nearly
 * all of a bathroom gut, where the wall tile costs more than the floor tile and
 * takes longer to set.
 *
 * WHY THE THREE SIT ON ONE SCREEN
 *
 * They disagree about materials and agree completely about geometry. Splitting
 * them into three panels would be three places the same square footage gets
 * computed, and the one that disagreed would be found by a customer.
 *
 * They do NOT agree about openings, and the screen says so where it matters: a
 * doorway comes off paint in full because there is nothing there to paint, and
 * off board at half because board is cut around it and only some of the offcut
 * comes back.
 */
import { useMemo, useState } from 'react';
import { LayoutGrid, ListPlus, Info, Ruler } from 'lucide-react';
import { toast } from 'sonner';
import {
  type SurfaceRoom, type SurfaceLine,
  BOARD_SIZES, sheetrockTakeoff, wallTileTakeoff, paintTakeoff,
  surfaceScopeLines, surfaceNote,
} from '../lib/surfaceTakeoff';
import { LAYOUT_WASTE, type TileLayout } from '../lib/flooringModel';

const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';
const tiny = 'px-2 py-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-xs focus:outline-none focus:border-[#ea580c]';

export default function SurfaceTakeoffPanel({ rooms, onAddToScope }: {
  rooms: SurfaceRoom[];
  onAddToScope?: (lines: SurfaceLine[]) => void;
}) {
  const [boardId, setBoardId] = useState('4x12');
  const [ceilings, setCeilings] = useState(true);
  const [coats, setCoats] = useState(2);
  const [primer, setPrimer] = useState(true);
  const [tileRooms, setTileRooms] = useState<string[]>([]);
  const [tileHeight, setTileHeight] = useState(0);
  const [layout, setLayout] = useState<TileLayout>('straight');
  const [backer, setBacker] = useState(true);

  const board = useMemo(
    () => sheetrockTakeoff(rooms, { boardId, ceilings }),
    [rooms, boardId, ceilings],
  );
  const tile = useMemo(
    () => wallTileTakeoff(rooms, {
      roomIds: tileRooms, heightFt: tileHeight || undefined, layout, backer,
    }),
    [rooms, tileRooms, tileHeight, layout, backer],
  );
  const paint = useMemo(
    () => paintTakeoff(rooms, { coats, ceilings, primer }),
    [rooms, coats, ceilings, primer],
  );

  const noCeiling = rooms.filter(r => !(r.ceilingFt > 0));

  if (!rooms.length) return null;

  const add = () => {
    const lines = surfaceScopeLines({
      sheetrock: board,
      tile: tileRooms.length ? tile : undefined,
      paint,
    });
    if (!lines.length) { toast.error('Nothing to add.'); return; }
    onAddToScope?.(lines);
    toast.success(`${lines.length} lines added, each carrying the working behind it.`);
  };

  return (
    <div className="space-y-4">
      <div className={card}>
        <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
          <LayoutGrid className="w-4 h-4 text-[#ea580c]" /> Walls and ceilings
        </h2>
        <p className="text-xs text-gray-500">{surfaceNote(rooms)}</p>

        {noCeiling.length > 0 && (
          <p className="mt-2 text-[11px] text-amber-200/85 flex items-start gap-1.5">
            <Ruler className="w-3 h-3 shrink-0 mt-0.5" />
            {noCeiling.map(r => r.name).join(', ')} {noCeiling.length === 1 ? 'has' : 'have'} no
            ceiling height on the floor plan, so {noCeiling.length === 1 ? 'its walls count' : 'their walls count'} as
            nothing here. Set it before this is quoted from.
          </p>
        )}
      </div>

      {/* ── sheetrock ── */}
      <div className={card}>
        <h3 className="text-sm font-bold text-white mb-2">Sheetrock</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          <select value={boardId} onChange={e => setBoardId(e.target.value)} className={tiny}>
            {BOARD_SIZES.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
          <label className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <input type="checkbox" checked={ceilings} onChange={e => setCeilings(e.target.checked)}
              className="w-4 h-4 accent-[#ea580c]" />
            Board the ceilings too
          </label>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat l="Sheets" v={String(board.sheets)} sub={`${board.totalSqFt} sq ft net`} />
          <Stat l="Compound" v={`${board.compoundBuckets}`} sub="buckets" />
          <Stat l="Tape" v={`${board.tapeFt}`} sub="lf" />
          <Stat l="Screws" v={`${board.screwsLb}`} sub="lb" />
        </div>

        {board.notes.map((n, i) => (
          <p key={i} className="text-[10px] text-gray-500 flex items-start gap-1.5 mt-2">
            <Info className="w-3 h-3 shrink-0 mt-0.5 text-gray-600" />{n}
          </p>
        ))}
      </div>

      {/* ── wall tile ── */}
      <div className={card}>
        <h3 className="text-sm font-bold text-white mb-1">Wall tile</h3>
        <p className="text-xs text-gray-500 mb-3">
          Pick the rooms — tiling every wall in the house is not what anybody means. A height
          stops it at a wainscot, and only the part of an opening below that line is deducted.
        </p>

        <div className="flex flex-wrap gap-1.5 mb-2">
          {rooms.map(r => {
            const on = tileRooms.includes(r.id);
            return (
              <button key={r.id}
                onClick={() => setTileRooms(p => on ? p.filter(x => x !== r.id) : [...p, r.id])}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${
                  on ? 'border-[#ea580c] text-white bg-[#ea580c]/15' : 'border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
                {r.name}
              </button>
            );
          })}
        </div>

        {tileRooms.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2 mb-3">
              <label className="text-[11px] text-gray-500">
                Stops at (ft, 0 = ceiling)
                <input type="number" step="0.5" value={tileHeight}
                  onChange={e => setTileHeight(Number(e.target.value) || 0)}
                  className={`${tiny} w-20 ml-1`} />
              </label>
              <select value={layout} onChange={e => setLayout(e.target.value as TileLayout)} className={tiny}>
                {(Object.keys(LAYOUT_WASTE) as TileLayout[]).map(l => (
                  <option key={l} value={l}>{LAYOUT_WASTE[l].label}</option>
                ))}
              </select>
              <label className="text-[11px] text-gray-400 flex items-center gap-1.5">
                <input type="checkbox" checked={backer} onChange={e => setBacker(e.target.checked)}
                  className="w-4 h-4 accent-[#ea580c]" />
                Backer board (wet area)
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat l="Tiled" v={`${tile.tiledSqFt}`} sub="sq ft" />
              <Stat l="Order" v={`${tile.orderSqFt}`} sub={`${tile.wastePct}% waste`} />
              <Stat l="Thinset" v={`${tile.thinsetBags}`} sub="bags" />
              <Stat l="Grout" v={`${tile.groutLb}`} sub="lb" />
            </div>

            {tile.notes.map((n, i) => (
              <p key={i} className="text-[10px] text-gray-500 flex items-start gap-1.5 mt-2">
                <Info className="w-3 h-3 shrink-0 mt-0.5 text-gray-600" />{n}
              </p>
            ))}
          </>
        )}
      </div>

      {/* ── paint ── */}
      <div className={card}>
        <h3 className="text-sm font-bold text-white mb-2">Paint</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          <label className="text-[11px] text-gray-500">
            Coats
            <input type="number" min={1} max={4} value={coats}
              onChange={e => setCoats(Math.max(1, Number(e.target.value) || 1))}
              className={`${tiny} w-16 ml-1`} />
          </label>
          <label className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <input type="checkbox" checked={primer} onChange={e => setPrimer(e.target.checked)}
              className="w-4 h-4 accent-[#ea580c]" />
            Primer over new board
          </label>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat l="Walls" v={`${paint.wallGallons}`} sub={`gal · ${paint.wallSqFt} sq ft`} />
          <Stat l="Ceilings" v={`${paint.ceilingGallons}`} sub="gal" />
          <Stat l="Primer" v={`${paint.primerGallons}`} sub="gal" />
          <Stat l="Trim" v={`${paint.trimFt}`} sub="lf of base and casing" />
        </div>

        {paint.notes.map((n, i) => (
          <p key={i} className="text-[10px] text-gray-500 flex items-start gap-1.5 mt-2">
            <Info className="w-3 h-3 shrink-0 mt-0.5 text-gray-600" />{n}
          </p>
        ))}
      </div>

      {onAddToScope && (
        <button onClick={add}
          className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <ListPlus className="w-4 h-4" /> Add these to the scope
        </button>
      )}
    </div>
  );
}

function Stat({ l, v, sub }: { l: string; v: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-2.5">
      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{l}</p>
      <p className="text-sm font-bold text-white mt-0.5">{v}</p>
      {sub && <p className="text-[10px] text-gray-600 truncate">{sub}</p>}
    </div>
  );
}
