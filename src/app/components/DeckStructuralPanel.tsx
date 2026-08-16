/**
 * Loads and footings.
 *
 * The three site values are entered, not guessed. Ground snow load, frost depth
 * and soil bearing are published by the authority having jurisdiction, they vary
 * between neighbouring towns, and a plausible number here would be believed and
 * built on. The panel refuses to produce a footing size until it has them, and
 * says which one is missing rather than showing a confident zero.
 *
 * Every figure shows its own arithmetic, so a plans examiner can follow the
 * calculation rather than trusting the output.
 */
import { useMemo } from 'react';
import { Calculator, AlertTriangle, ShieldAlert, Printer, Info, CheckCircle2 } from 'lucide-react';
import {
  computeStructural, nextStandardTube, SOIL_CLASSES,
  type SiteLoads, type SoilId,
} from '../lib/deckStructural';
import type { DeckModel } from '../lib/deckModel';

export default function DeckStructuralPanel({
  model,
  site,
  loads,
  onLoadsChange,
}: {
  model: DeckModel;
  site?: { town?: string; state?: string; address?: string };
  loads: SiteLoads;
  onLoadsChange: (l: SiteLoads) => void;
}) {
  const r = useMemo(() => computeStructural(model, loads), [model, loads]);
  const tube = r.computable ? nextStandardTube(r.roundFootingDiameterIn) : null;

  const input = 'w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-sm focus:outline-none focus:border-[#ea580c]';
  const label = 'block text-xs font-semibold text-gray-400 mb-1';

  return (
    <div className="rounded-2xl border border-[#2A2A2A] bg-[#111] p-5 print:bg-white print:border-0">
      <div id="deck-structural">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #deck-structural, #deck-structural * { visibility: visible; }
            #deck-structural { position: absolute; left: 0; top: 0; width: 100%;
                               color: #000 !important; background: #fff !important; }
            #deck-structural .no-print { display: none !important; }
            #deck-structural * { color: #000 !important; border-color: #999 !important; }
          }
        `}</style>

        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-[#ea580c]" /> Loads &amp; footings
            </h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {site?.town ? `${site.town}${site.state ? `, ${site.state}` : ''}` : 'Enter the town on the project panel'}
            </p>
          </div>
          {r.computable && (
            <button onClick={() => window.print()}
              className="no-print flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <Printer className="w-4 h-4" /> Print
            </button>
          )}
        </div>

        {/* Inputs. Deliberately empty by default — see the module header. */}
        <div className="no-print grid sm:grid-cols-3 gap-3 mb-4">
          <div>
            <span className={label}>Ground snow load (psf)</span>
            <input type="number" min={0} className={input} value={loads.groundSnowPsf || ''}
              placeholder="from building dept"
              onChange={e => onLoadsChange({ ...loads, groundSnowPsf: Number(e.target.value) || 0 })} />
          </div>
          <div>
            <span className={label}>Frost depth (inches)</span>
            <input type="number" min={0} className={input} value={loads.frostDepthIn || ''}
              placeholder="from building dept"
              onChange={e => onLoadsChange({ ...loads, frostDepthIn: Number(e.target.value) || 0 })} />
          </div>
          <div>
            <span className={label}>Soil bearing</span>
            <select className={input} value={loads.soil}
              onChange={e => onLoadsChange({ ...loads, soil: e.target.value as SoilId })}>
              {SOIL_CLASSES.map(s => (
                <option key={s.id} value={s.id}>{s.label} — {s.psf} psf</option>
              ))}
            </select>
          </div>
        </div>

        <label className="no-print flex items-start gap-2 text-xs text-gray-300 mb-4">
          <input type="checkbox" className="accent-[#ea580c] mt-0.5" checked={loads.verified}
            onChange={e => onLoadsChange({ ...loads, verified: e.target.checked })} />
          <span>
            I took the snow load and frost depth from the building department for this address —
            not from a default or a nearby town.
          </span>
        </label>

        {!r.computable ? (
          <div className="rounded-xl p-4 flex items-start gap-2"
            style={{ background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.3)' }}>
            <Info className="w-5 h-5 text-blue-300 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-200">
              <div className="font-semibold mb-1">Need {r.missing.join(' and ').toLowerCase()} first.</div>
              <p>
                Both are published by the building department for this address and vary between
                neighbouring towns. Nothing is calculated from a guess, so the footing size stays
                blank until they are entered.
              </p>
            </div>
          </div>
        ) : (
          <>
            {r.failures.length > 0 && (
              <div className="rounded-xl p-4 mb-4"
                style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)' }}>
                <div className="flex items-center gap-2 font-bold text-red-300 mb-2">
                  <ShieldAlert className="w-5 h-5" /> Outside prescriptive tables
                </div>
                <ul className="list-disc pl-5 space-y-1 text-sm text-red-200">
                  {r.failures.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}

            <section className="mb-5">
              <h3 className="font-bold text-white border-b border-[#2A2A2A] pb-1 mb-2">Design load</h3>
              <div className="space-y-1.5 text-sm">
                <Row k="Live load" v={`${r.designLivePsf} psf`}
                  note={r.snowGoverns
                    ? `Snow (${loads.groundSnowPsf} psf) exceeds the 40 psf residential deck live load, so snow governs.`
                    : `40 psf residential deck live load governs; ground snow is ${loads.groundSnowPsf} psf.`} />
                <Row k="Dead load" v={`${r.deadLoadPsf} psf`} note="Framing, decking and rail." />
                <Row k="Total design load" v={`${r.totalLoadPsf} psf`} strong />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                A deck is designed for the greater of its live load or the snow on it — people and a
                full snow load are not assumed to arrive together. IRC R301.5.
              </p>
            </section>

            <section className="mb-5">
              <h3 className="font-bold text-white border-b border-[#2A2A2A] pb-1 mb-2">Load on each post</h3>
              <div className="space-y-1.5 text-sm">
                <Row k="Tributary area" v={`${r.tributaryAreaSqFt} sq ft`}
                  note={`${model.postSpacingFt}ft post spacing × (half the ${(r.tributaryAreaSqFt / model.postSpacingFt * 1).toFixed(1)}ft joist reach)`} />
                <Row k="Load per post" v={`${r.postLoadLbs.toLocaleString()} lbs`}
                  note={`${r.tributaryAreaSqFt} sq ft × ${r.totalLoadPsf} psf`} strong />
              </div>
            </section>

            <section className="mb-5">
              <h3 className="font-bold text-white border-b border-[#2A2A2A] pb-1 mb-2">Footings</h3>
              <div className="space-y-1.5 text-sm">
                <Row k="Soil bearing" v={`${r.soilPsf} psf`}
                  note={SOIL_CLASSES.find(s => s.id === loads.soil)?.label} />
                <Row k="Required bearing area" v={`${r.requiredFootingAreaSqFt} sq ft`}
                  note={`${r.postLoadLbs.toLocaleString()} lbs ÷ ${r.soilPsf} psf`} />
                <Row k="Round footing" v={`${r.roundFootingDiameterIn}" diameter`} strong />
                <Row k="Square footing" v={`${r.squareFootingSideIn}" × ${r.squareFootingSideIn}"`} />
                {tube && (
                  <Row k="Next standard form" v={`${tube}" tube`}
                    note="Nearest size concrete forms are actually sold in." strong />
                )}
                <Row k="Minimum depth" v={`${r.frostDepthIn}" below grade`}
                  note="Bottom of footing must bear below the frost line." strong />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {model.postSize} posts on {r.roundFootingDiameterIn}" footings, one per post
                ({model.postSpacingFt}ft on centre). IRC Table R401.4.1 · R403.1.4.
              </p>
            </section>

            {r.cautions.length > 0 && (
              <div className="space-y-1.5 mb-4">
                {r.cautions.map((c, i) => (
                  <p key={i} className="flex items-start gap-2 text-sm text-yellow-400">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {c}
                  </p>
                ))}
              </div>
            )}

            {loads.verified && r.failures.length === 0 && (
              <p className="flex items-start gap-2 text-sm text-green-400 mb-4">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                Within prescriptive tables, using values confirmed for this address.
              </p>
            )}
          </>
        )}

        <p className="text-xs text-gray-500 mt-4 pt-3 border-t border-[#2A2A2A]">
          Prescriptive sizing per IRC R301.5, IRC Table R401.4.1 and AWC DCA 6. Not an engineered
          design and not a substitute for one. Snow load, frost depth and soil values must come from
          the authority having jurisdiction for this address, and the local code edition may differ
          from the references above.
        </p>
      </div>
    </div>
  );
}

function Row({ k, v, note, strong }: { k: string; v: string; note?: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[#1f1f1f] pb-1">
      <div>
        <span className={strong ? 'text-white font-semibold' : 'text-gray-300'}>{k}</span>
        {note && <div className="text-xs text-gray-500">{note}</div>}
      </div>
      <span className={`tabular-nums shrink-0 ${strong ? 'text-[#ea580c] font-bold' : 'text-white'}`}>{v}</span>
    </div>
  );
}
