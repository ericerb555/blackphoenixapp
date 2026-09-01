/**
 * The house, as something you can correct.
 *
 * Every number here shows where it came from, because a figure read off a
 * photograph and a figure somebody measured with a tape are not the same kind
 * of thing, and the moment they look the same on screen a guess can end up in a
 * permit set. Typing over a field marks it measured, and a later photo read
 * will then leave it alone — having stood at the house with a tape once, nobody
 * should have to do it again because the software forgot.
 *
 * Views accumulate. A deck job needs one wall; a siding job needs all of them.
 * Adding a view later extends the house that is already there rather than
 * starting a second description of the same building.
 */
import { useCallback } from 'react';
import { Home, Plus, Trash2, Ruler, Camera, AlertTriangle } from 'lucide-react';
import {
  type House, type HouseView, type Opening, type OpeningKind,
  blankView, viewFromAnalysis, setMeasured, mergeRead, upsertView, removeView,
  activeView, deckHeightFromSill, netWallArea, guessCount,
} from '../lib/houseModel';

interface Props {
  house: House;
  onChange: (house: House) => void;
  /** The most recent photo read, if the capture step has produced one. */
  analysis?: any;
  /** Offered when an elevation knows its sill height. */
  onUseDeckHeight?: (heightFt: number) => void;
}

const SIDINGS = [
  'unknown', 'vinyl lap', 'wood clapboard', 'fiber cement', 'brick',
  'stucco', 'stone', 'shingle', 'board and batten',
];

const OPENING_KINDS: OpeningKind[] = ['door', 'slider', 'window', 'garage'];

const field = 'w-full px-2 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c]';
const tiny = 'w-full px-2 py-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-xs focus:outline-none focus:border-[#ea580c]';

/** Says plainly whether a number was measured, read off a photo, or guessed. */
function Source({ of }: { of: string | undefined }) {
  if (of === 'measured') return <span className="text-[10px] text-emerald-400 font-semibold">measured</span>;
  if (of === 'photos') return <span className="text-[10px] text-sky-400 font-semibold">from photos</span>;
  return <span className="text-[10px] text-amber-500/90 font-semibold">estimated</span>;
}

export default function HousePanel({ house, onChange, analysis, onUseDeckHeight }: Props) {
  const view = activeView(house);

  const update = useCallback((next: HouseView) => onChange(upsertView(house, next)), [house, onChange]);

  const addView = useCallback((kind: 'elevation' | 'room') => {
    const n = house.views.filter(v => v.kind === kind).length + 1;
    const name = kind === 'elevation' ? `Elevation ${n}` : `Room ${n}`;
    onChange(upsertView(house, blankView(name, kind)));
  }, [house, onChange]);

  /**
   * Take what the photo read found. Merged rather than assigned, so anything
   * already measured by hand stays exactly as it was typed.
   */
  const readPhotos = useCallback(() => {
    if (!analysis) return;
    const fresh = viewFromAnalysis(analysis, view?.name || 'Back elevation');
    onChange(upsertView(house, view ? mergeRead(view, fresh) : fresh));
  }, [analysis, house, onChange, view]);

  const setOpening = useCallback((id: string, patch: Partial<Opening>) => {
    if (!view) return;
    update({ ...view, openings: view.openings.map(o => (o.id === id ? { ...o, ...patch } : o)),
      source: { ...view.source, openings: 'measured' } });
  }, [view, update]);

  const addOpening = useCallback(() => {
    if (!view) return;
    update({
      ...view,
      openings: [...view.openings, {
        id: `OP-${Date.now().toString(36)}-${view.openings.length}`,
        kind: 'window', widthFt: 3, heightFt: 4, offsetFt: 2, sillFt: 3,
      }],
      source: { ...view.source, openings: 'measured' },
    });
  }, [view, update]);

  return (
    <div className="rounded-2xl border border-[#2A2A2A] bg-[#111] p-4">
      <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
        <Home className="w-4 h-4 text-[#ea580c]" /> The house
      </h2>
      <p className="text-xs text-gray-500 mb-3">
        Read from the photos, then corrected by hand. Every trade in the design centre
        works off this, so a wall measured here is measured for siding and windows too.
      </p>

      {/* Which view */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {house.views.map(v => (
          <button key={v.id} onClick={() => onChange({ ...house, activeViewId: v.id })}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
              v.id === view?.id
                ? 'border-[#ea580c] text-white bg-[#ea580c]/15'
                : 'border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
            {v.name}
          </button>
        ))}
        <button onClick={() => addView('elevation')} title="Add an elevation"
          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-dashed border-[#2A2A2A] text-gray-500 hover:text-white flex items-center gap-1">
          <Plus className="w-3 h-3" /> Wall
        </button>
        <button onClick={() => addView('room')} title="Add a room"
          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-dashed border-[#2A2A2A] text-gray-500 hover:text-white flex items-center gap-1">
          <Plus className="w-3 h-3" /> Room
        </button>
      </div>

      {!view ? (
        <div className="rounded-xl border border-dashed border-[#2A2A2A] bg-[#0A0A0A] p-4 text-center">
          <p className="text-xs text-gray-500">
            Nothing captured yet. Add a wall or a room, or take a photo read in Capture
            and pull it in here.
          </p>
          {analysis && (
            <button onClick={readPhotos}
              className="mt-3 px-3 py-2 rounded-xl text-sm font-semibold text-white inline-flex items-center gap-2"
              style={{ background: '#ea580c' }}>
              <Camera className="w-4 h-4" /> Use the photo read
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-3">
            <input value={view.name} onChange={e => update({ ...view, name: e.target.value })}
              className={field} placeholder="What this view is — back elevation, kitchen" />
            <button onClick={() => onChange(removeView(house, view.id))} title="Remove this view"
              className="p-2 rounded-lg border border-[#2A2A2A] text-gray-500 hover:text-red-400 shrink-0">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {guessCount(view) > 0 && (
            <p className="text-[11px] text-amber-500/90 mb-3 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
              {guessCount(view)} value{guessCount(view) === 1 ? ' is' : 's are'} still a guess.
              Type a real measurement over anything that matters.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 mb-3">
            <Num label={view.kind === 'room' ? 'Room length (ft)' : 'Wall width (ft)'}
              value={view.widthFt} src={view.source.widthFt}
              onChange={v => update(setMeasured(view, 'widthFt', v))} />
            <Num label={view.kind === 'room' ? 'Ceiling height (ft)' : 'Wall height (ft)'}
              value={view.heightFt} src={view.source.heightFt}
              onChange={v => update(setMeasured(view, 'heightFt', v))} />
            {/* The second floor side. A room recorded one length and a ceiling
                and nothing else, so flooring imported a zero and the kitchen
                tool asked again for a width already given. */}
            {view.kind === 'room' && (
              <Num label="Room width (ft)" value={view.depthFt ?? 0} src={view.source.depthFt}
                onChange={v => update(setMeasured(view, 'depthFt', v))} />
            )}
            <Num label="Storeys" value={view.storeys} src={view.source.storeys} step={1}
              onChange={v => update(setMeasured(view, 'storeys', v))} />
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-gray-400">Siding</label>
                <Source of={view.source.sidingType} />
              </div>
              <select value={view.sidingType} className={field}
                onChange={e => update(setMeasured(view, 'sidingType', e.target.value))}>
                {SIDINGS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {view.kind === 'elevation' && (
            <div className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-3 mb-3">
              <Num label="Door threshold above grade (in)" value={view.sillHeightInches}
                src={view.source.sillHeightInches}
                onChange={v => update(setMeasured(view, 'sillHeightInches', v))} />
              {/*
                The relationship the old code had backwards. The threshold is a
                fact about the house; the deck height follows from it, because
                the surface has to sit just below the door.
              */}
              <p className="text-[11px] text-gray-500 mt-2">
                A deck on this wall sits about{' '}
                <span className="text-gray-300 font-semibold">
                  {deckHeightFromSill(view.sillHeightInches).toFixed(2)}ft
                </span>{' '}
                above grade — just below the threshold, so water runs away from the door.
              </p>
              {onUseDeckHeight && (
                <button onClick={() => onUseDeckHeight(deckHeightFromSill(view.sillHeightInches))}
                  className="mt-2 w-full px-3 py-2 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <Ruler className="w-3.5 h-3.5" /> Set the deck to this height
                </button>
              )}
            </div>
          )}

          {/* Openings */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-white">
              Openings <span className="text-gray-500 font-normal">{view.openings.length}</span>
            </h3>
            <div className="flex items-center gap-2">
              <Source of={view.source.openings} />
              <button onClick={addOpening} className="text-[#ea580c] text-xs font-semibold hover:underline">
                add
              </button>
            </div>
          </div>

          {view.openings.length === 0 ? (
            <p className="text-[11px] text-gray-600 mb-3">
              None recorded. Windows and doors are deducted from siding and become the
              window schedule, so they are worth putting in.
            </p>
          ) : (
            <ul className="space-y-2 mb-3">
              {view.openings.map(o => (
                <li key={o.id} className="grid grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto] gap-1.5 items-center">
                  <select value={o.kind} className={tiny}
                    onChange={e => setOpening(o.id, { kind: e.target.value as OpeningKind })}>
                    {OPENING_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                  <NumTiny value={o.widthFt} title="Width (ft)" onChange={v => setOpening(o.id, { widthFt: v })} />
                  <NumTiny value={o.heightFt} title="Height (ft)" onChange={v => setOpening(o.id, { heightFt: v })} />
                  <NumTiny value={o.offsetFt} title="From the left end (ft)" onChange={v => setOpening(o.id, { offsetFt: v })} />
                  <NumTiny value={o.sillFt} title="Sill above grade (ft)" onChange={v => setOpening(o.id, { sillFt: v })} />
                  <button onClick={() => update({ ...view, openings: view.openings.filter(x => x.id !== o.id) })}
                    className="text-gray-600 hover:text-red-400" title="Remove">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="text-[11px] text-gray-500">
            Net wall area <span className="text-gray-300 font-semibold">{Math.round(netWallArea(view))} sq ft</span>
            {' '}after openings — what siding is priced on.
          </p>

          {analysis && (
            <button onClick={readPhotos}
              className="mt-3 w-full px-3 py-2 rounded-xl text-xs font-semibold text-gray-300 flex items-center justify-center gap-2 border border-[#2A2A2A] hover:text-white">
              <Camera className="w-3.5 h-3.5" /> Re-read from the photos
              <span className="text-gray-600">— measured values are kept</span>
            </button>
          )}
        </>
      )}
    </div>
  );
}

function Num({ label, value, src, onChange, step = 0.5 }: {
  label: string; value: number; src?: string; step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-semibold text-gray-400">{label}</label>
        <Source of={src} />
      </div>
      <input type="number" step={step} value={value} className={field}
        onChange={e => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }} />
    </div>
  );
}

function NumTiny({ value, title, onChange }: { value: number; title: string; onChange: (v: number) => void }) {
  return (
    <input type="number" step={0.5} value={value} title={title} className={tiny}
      onChange={e => {
        const n = Number(e.target.value);
        if (Number.isFinite(n)) onChange(n);
      }} />
  );
}
