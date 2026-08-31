/**
 * Anything with posts, beams and a roof on it.
 *
 * A lean-to over a row of coolers, a pavilion, a carport, a porch roof, an
 * overhang, a gazebo, a pergola — the same structure with four switches. Six
 * separate screens would be the same arithmetic six times, free to drift apart.
 *
 * WHAT IT SHOWS AND WHY
 *
 * The member sizes are the answer, but the assumptions behind them are the part
 * that gets checked. Ground snow, whether the space is heated, how exposed it
 * is and the slope factor each move the load by twenty percent or more, so they
 * are printed beside the result rather than buried. An architect reviewing this
 * needs to see what it assumed as much as what it concluded.
 *
 * It refuses rather than invents. When nothing up to a 2x12 spans the run it
 * says so and suggests what to change — closing the rafter spacing, adding a
 * mid-span beam — rather than quietly proposing a member that will not do.
 */
import { useMemo, useState } from 'react';
import {
  Warehouse, AlertTriangle, ShieldCheck, Info, Ruler,
} from 'lucide-react';
import {
  type StructureModel, type StructureForm, type Support, type Covering,
  COVERINGS, DEFAULT_STRUCTURE, computeStructure, pitchDegrees, RAFTER_SIZES,
} from '../lib/structureModel';

const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';
const field = 'w-full px-2 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#ea580c]';
const label = 'block text-[11px] font-semibold text-gray-400 mb-1';

const FORMS: Array<{ id: StructureForm; label: string; blurb: string }> = [
  { id: 'lean-to', label: 'Lean-to', blurb: 'Single slope, high side on the building.' },
  { id: 'shed', label: 'Shed roof', blurb: 'Single slope, standing on its own posts.' },
  { id: 'gable', label: 'Gable', blurb: 'Two slopes off a ridge. Pavilion or carport.' },
  { id: 'flat', label: 'Flat', blurb: 'Pitched only enough to drain.' },
  { id: 'overhang', label: 'Overhang', blurb: 'Cantilevered off the wall, no outer posts.' },
];

const SUPPORTS: Array<{ id: Support; label: string }> = [
  { id: 'ledger-and-posts', label: 'Ledger + posts' },
  { id: 'free', label: 'Free-standing' },
  { id: 'ledger', label: 'Ledger only' },
];

export default function StructureDesigner({ groundSnowPsf = 60, townName }: {
  /** From the building department, via the site address. */
  groundSnowPsf?: number;
  townName?: string;
}) {
  const [m, setM] = useState<StructureModel>({ ...DEFAULT_STRUCTURE });
  const [heated, setHeated] = useState(false);
  const [exposure, setExposure] = useState<'sheltered' | 'partial' | 'exposed'>('partial');
  const [snow, setSnow] = useState(groundSnowPsf);

  const set = <K extends keyof StructureModel>(k: K, v: StructureModel[K]) =>
    setM(prev => ({ ...prev, [k]: v }));

  const r = useMemo(
    () => computeStructure(m, snow, { heated, exposure }),
    [m, snow, heated, exposure],
  );

  const covering = COVERINGS.find(c => c.id === m.covering)!;
  const sheds = r.snow.cs < 1;

  return (
    <div className="space-y-4">
      {/* ── what it is ── */}
      <div className={card}>
        <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
          <Warehouse className="w-4 h-4 text-[#ea580c]" /> The structure
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          Roofs over things — a cover for coolers, a pavilion, a carport, a porch, a pergola.
        </p>

        <label className={label}>Form</label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 mb-1">
          {FORMS.map(f => (
            <button key={f.id} onClick={() => set('form', f.id)}
              className={`px-2 py-2 rounded-lg text-xs font-semibold border transition ${
                m.form === f.id
                  ? 'border-[#ea580c] text-white bg-[#ea580c]/15'
                  : 'border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-600 mb-3">
          {FORMS.find(f => f.id === m.form)?.blurb}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className={label}>How it is held up</label>
            <select className={field} value={m.support}
              onChange={e => set('support', e.target.value as Support)}>
              {SUPPORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Covering</label>
            <select className={field} value={m.covering}
              onChange={e => set('covering', e.target.value as Covering)}>
              {COVERINGS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        </div>
        {covering.note && (
          <p className="text-[11px] text-gray-500 mb-3 flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0 mt-px text-gray-600" />{covering.note}
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Num label="Width (ft)" value={m.widthFt} onChange={v => set('widthFt', v)} />
          <Num label={m.form === 'gable' ? 'Full span (ft)' : 'Out from wall (ft)'}
            value={m.projectionFt} onChange={v => set('projectionFt', v)} />
          <Num label="Eave height (ft)" value={m.eaveHeightFt} onChange={v => set('eaveHeightFt', v)} />
          <div>
            <label className={label}>Pitch (rise per 12)</label>
            <input type="number" step={0.5} min={0} className={field} value={m.pitch}
              onChange={e => set('pitch', Number(e.target.value) || 0)} />
            <p className="text-[10px] text-gray-600 mt-0.5">
              {pitchDegrees(m.pitch).toFixed(0)}°{sheds ? ' — sheds snow' : ' — holds snow'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-3">
          <div>
            <label className={label}>Rafters at (in)</label>
            <select className={field} value={m.rafterSpacingIn}
              onChange={e => set('rafterSpacingIn', Number(e.target.value))}>
              {[12, 16, 19.2, 24].map(s => <option key={s} value={s}>{s}in</option>)}
            </select>
          </div>
          <Num label="Post spacing (ft)" value={m.postSpacingFt} onChange={v => set('postSpacingFt', v)} />
          <div>
            <label className={label}>Posts</label>
            <select className={field} value={m.postSize}
              onChange={e => set('postSize', e.target.value as StructureModel['postSize'])}>
              {['4x4', '6x6', '8x8'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── the site ── */}
      <div className={card}>
        <h3 className="text-sm font-bold text-white mb-1">Where it is going</h3>
        <p className="text-xs text-gray-500 mb-3">
          Snow is the load that sizes a roof, and all three of these move it by a fifth or more.
          {townName ? ` Ground snow taken from ${townName}.` : ' Confirm the ground snow with the building department.'}
        </p>
        <div className="grid grid-cols-3 gap-3">
          <Num label="Ground snow (psf)" value={snow} onChange={setSnow} step={5} />
          <div>
            <label className={label}>Exposure</label>
            <select className={field} value={exposure}
              onChange={e => setExposure(e.target.value as any)}>
              <option value="sheltered">Sheltered</option>
              <option value="partial">Partial</option>
              <option value="exposed">Exposed</option>
            </select>
          </div>
          <div>
            <label className={label}>Heated below?</label>
            <select className={field} value={heated ? 'yes' : 'no'}
              onChange={e => setHeated(e.target.value === 'yes')}>
              <option value="no">No — open cover</option>
              <option value="yes">Yes — conditioned</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── what it needs ── */}
      <div className={card}>
        <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <Ruler className="w-4 h-4 text-[#ea580c]" /> What it takes to stand
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          Computed, not looked up. Bending and deflection both checked, SPF No.2, simple spans.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <Stat label="Snow on the roof" value={`${r.snow.slopedPsf} psf`} />
          <Stat label="Total design load" value={`${r.totalPsf} psf`} />
          <Stat label="Rafter span" value={`${r.rafterSpanFt} ft`} />
          <Stat label="Posts" value={r.posts ? `${r.posts} × ${r.postLoadLb} lb` : 'none'} />
        </div>

        <Member title="Rafters" check={r.rafter} at={`${m.rafterSpacingIn}in centres`}
          none={`Nothing up to ${RAFTER_SIZES[RAFTER_SIZES.length - 1].label} spans this.`} />
        {m.form !== 'overhang' && m.support !== 'ledger' && (
          <Member title="Beam" check={r.beam} at={`${r.beamSpanFt}ft between posts`}
            none="Nothing up to (4) 2x12 spans this. Bring the posts closer." />
        )}

        {r.warnings.length > 0 ? (
          <div className="mt-3 space-y-2">
            {r.warnings.map((w, i) => (
              <div key={i} className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-2.5 flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200/90">{w}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] p-2.5 flex items-start gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-200/90">
              Every member works with room to spare, and nothing here breaks a rule of thumb.
            </p>
          </div>
        )}
      </div>

      {/* ── what it assumed ── */}
      <div className={card}>
        <h3 className="text-sm font-bold text-white mb-1">What this assumed</h3>
        <p className="text-xs text-gray-500 mb-2">
          The part an architect checks. Each of these moves the answer.
        </p>
        <ul className="space-y-1">
          {r.snow.assumptions.map((a, i) => (
            <li key={i} className="text-[11px] text-gray-400 flex items-start gap-1.5">
              <span className="text-gray-600 mt-px">·</span>{a}
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-gray-600 mt-3">
          Sized here so an architect is checking work rather than doing it. Anything carrying
          load over a public way, or a structure your town wants stamped, still needs one.
        </p>
      </div>
    </div>
  );
}

function Member({ title, check, at, none }: {
  title: string; check: ReturnType<typeof computeStructure>['rafter']; at: string; none: string;
}) {
  if (!check) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/[0.07] p-3 mb-2">
        <p className="text-xs font-semibold text-red-300">{title} — nothing fits</p>
        <p className="text-[11px] text-red-200/80 mt-0.5">{none}</p>
      </div>
    );
  }
  const tight = check.utilisation > 0.9;
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-3 mb-2">
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-gray-400">{title}</p>
        <p className="text-sm font-bold text-white">{check.size}</p>
      </div>
      <p className="text-[11px] text-gray-500 mt-0.5">
        {at} over {check.spanFt}ft, carrying {check.loadPlf} lb/ft
      </p>
      <p className={`text-[11px] mt-0.5 ${tight ? 'text-amber-500/90' : 'text-gray-500'}`}>
        {Math.round(check.utilisation * 100)}% of capacity, deflects L/{check.deflectionRatio}
        {tight ? ' — tight. The next size up would be easier to stand behind.' : ''}
      </p>
    </div>
  );
}

function Num({ label: l, value, onChange, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void; step?: number;
}) {
  return (
    <div>
      <label className={label}>{l}</label>
      <input type="number" step={step} min={0} className={field} value={value}
        onChange={e => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }} />
    </div>
  );
}

function Stat({ label: l, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-2.5">
      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{l}</p>
      <p className="text-sm font-bold text-white mt-0.5">{value}</p>
    </div>
  );
}
