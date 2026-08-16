/**
 * The permit packet — one printable set for the building department.
 *
 * Cover sheet, the three drawings, structural calculations, fastener schedule
 * and materials list, headed with the address and parcel on every page. Each
 * sheet is a page; nothing is split across a page break, because a fastener
 * schedule cut in half is a rejected submission.
 *
 * The drawings are captured from the live WebGL views rather than redrawn, so
 * the set that gets submitted is the geometry that was designed. Redrawing for
 * print is how a permit set ends up disagreeing with the model it came from.
 *
 * Where the design falls outside prescriptive tables, the cover sheet says so
 * before anything else. A packet that looks complete and quietly needs an
 * engineer is worse than one that is obviously incomplete — the first gets
 * submitted.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { FileText, Loader2, Printer, ShieldAlert, Camera } from 'lucide-react';
import DeckViewer3D, { type ViewMode } from './DeckViewer3D';
import { buildSpec } from '../lib/deckBuildSpec';
import { computeStructural, nextStandardTube, SOIL_CLASSES, type SiteLoads } from '../lib/deckStructural';
import { takeoff, type DeckModel } from '../lib/deckModel';

interface Site { projectName?: string; address?: string; town?: string; state?: string; parcel?: string }

const VIEWS: { mode: ViewMode; title: string; caption: string }[] = [
  { mode: 'plan', title: 'Sheet 2 — Plan', caption: 'Dimensioned plan, viewed from above.' },
  { mode: 'framing', title: 'Sheet 3 — Framing plan', caption: 'Structure only. Decking, rail and stairs omitted for clarity.' },
  { mode: '3d', title: 'Sheet 4 — Perspective', caption: 'Illustrative view of the completed structure.' },
];

export default function DeckPermitPacket({
  model, site, loads,
}: {
  model: DeckModel; site: Site; loads: SiteLoads;
}) {
  const spec = useMemo(() => buildSpec(model), [model]);
  const struct = useMemo(() => computeStructural(model, loads), [model, loads]);
  const bom = useMemo(() => takeoff(model), [model]);
  const tube = struct.computable ? nextStandardTube(struct.roundFootingDiameterIn) : null;

  const captures = useRef<Partial<Record<ViewMode, () => string | null>>>({});
  const [images, setImages] = useState<Partial<Record<ViewMode, string>>>({});
  const [building, setBuilding] = useState(false);

  const generate = useCallback(async () => {
    setBuilding(true);
    try {
      // Let the renderer paint at least one frame per view before reading the
      // buffer — a capture taken in the same tick comes back blank.
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
      const next: Partial<Record<ViewMode, string>> = {};
      for (const v of VIEWS) {
        const url = captures.current[v.mode]?.();
        if (url && url.length > 1000) next[v.mode] = url;
      }
      setImages(next);
    } finally {
      setBuilding(false);
    }
  }, []);

  const ready = VIEWS.every(v => images[v.mode]);
  const heading = `${site.projectName || 'Deck'} · ${site.address || 'address not set'}${site.town ? `, ${site.town}` : ''}${site.state ? ` ${site.state}` : ''}`;

  return (
    <div className="rounded-2xl border border-[#2A2A2A] bg-[#111] p-5">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #permit-packet, #permit-packet * { visibility: visible; }
          #permit-packet { position:absolute; left:0; top:0; width:100%;
                           color:#000 !important; background:#fff !important; }
          #permit-packet .no-print { display:none !important; }
          #permit-packet * { color:#000 !important; border-color:#666 !important; }
          #permit-packet .sheet { break-after: page; page-break-after: always; }
          #permit-packet .sheet:last-child { break-after: auto; page-break-after: auto; }
          #permit-packet .keep { break-inside: avoid; page-break-inside: avoid; }
          #permit-packet img { max-width: 100%; height: auto; }
          @page { margin: 0.6in; }
        }
      `}</style>

      <div className="no-print flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#ea580c]" /> Permit packet
          </h2>
          <p className="text-sm text-gray-400">
            Cover sheet, three drawings, calculations, schedules — one set, one print.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={generate} disabled={building}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
            style={{ background: 'rgba(234,88,12,0.9)' }}>
            {building ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            {ready ? 'Recapture drawings' : 'Capture drawings'}
          </button>
          <button onClick={() => window.print()} disabled={!ready}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
            title={ready ? 'Print the packet' : 'Capture the drawings first'}>
            <Printer className="w-4 h-4" /> Print packet
          </button>
        </div>
      </div>

      {/* Live views, kept small on screen. They must stay mounted and rendered
          for the capture to work — a display:none canvas produces nothing. */}
      <div className="no-print grid grid-cols-3 gap-2 mb-4">
        {VIEWS.map(v => (
          <div key={v.mode}>
            <DeckViewer3D
              model={model}
              mode={v.mode}
              hideTabs
              height={150}
              onCaptureReady={fn => { captures.current[v.mode] = fn; }}
            />
            <p className="text-[10px] text-gray-500 mt-1 text-center capitalize">{v.mode}</p>
          </div>
        ))}
      </div>

      {!ready && (
        <p className="no-print text-sm text-gray-500 mb-4">
          Capture the drawings, then print. They are grabbed from the live views so the submitted
          set is the geometry that was designed.
        </p>
      )}

      {/* ── The packet ───────────────────────────────────────────────────── */}
      <div id="permit-packet" className={ready ? '' : 'hidden'}>
        {/* Sheet 1 — cover */}
        <section className="sheet">
          <div className="border-b-2 border-black pb-3 mb-4">
            <h1 className="text-2xl font-bold">Deck construction — permit set</h1>
            <p className="text-sm mt-1">{heading}</p>
          </div>

          {(struct.failures.length > 0 || spec.engineerRequired.length > 0) && (
            <div className="keep border-2 border-black p-3 mb-4">
              <div className="flex items-center gap-2 font-bold mb-2">
                <ShieldAlert className="w-5 h-5" /> ENGINEERED DESIGN REQUIRED
              </div>
              <ul className="list-disc pl-5 text-sm space-y-1">
                {[...spec.engineerRequired, ...struct.failures].map((f, i) => <li key={i}>{f}</li>)}
              </ul>
              <p className="text-xs mt-2">
                This set is prescriptive documentation only. The items above fall outside the
                referenced tables and must be designed and sealed by a licensed professional before
                submission.
              </p>
            </div>
          )}

          <table className="w-full text-sm mb-4">
            <tbody>
              {[
                ['Project', site.projectName || '—'],
                ['Address', site.address || '—'],
                ['Town / State', `${site.town || '—'}${site.state ? `, ${site.state}` : ''}`],
                ['Parcel / Map-Lot', site.parcel || '—'],
                ['Structure', `Wood deck, ${model.widthFt}ft × ${model.depthFt}ft`],
                ['Deck area', `${bom.deckAreaSqFt} sq ft`],
                ['Height above grade', `${model.heightFt} ft`],
                ['Attachment', model.ledgerAttached ? 'Ledger-attached to existing dwelling' : 'Free-standing'],
                ['Date', new Date().toLocaleDateString()],
              ].map(([k, v]) => (
                <tr key={k} className="border-b border-gray-400">
                  <td className="py-1.5 font-semibold w-48">{k}</td>
                  <td className="py-1.5">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="font-bold border-b border-black pb-1 mb-2">Design criteria</h2>
          <table className="w-full text-sm mb-4">
            <tbody>
              {[
                ['Live load', struct.computable ? `${struct.designLivePsf} psf` : 'pending'],
                ['Dead load', `${struct.deadLoadPsf} psf`],
                ['Total design load', struct.computable ? `${struct.totalLoadPsf} psf` : 'pending'],
                ['Ground snow load', loads.groundSnowPsf ? `${loads.groundSnowPsf} psf` : 'NOT SUPPLIED'],
                ['Frost depth', loads.frostDepthIn ? `${loads.frostDepthIn} in` : 'NOT SUPPLIED'],
                ['Soil bearing', `${struct.soilPsf} psf — ${SOIL_CLASSES.find(s => s.id === loads.soil)?.label}`],
              ].map(([k, v]) => (
                <tr key={k} className="border-b border-gray-400">
                  <td className="py-1.5 font-semibold w-48">{k}</td>
                  <td className="py-1.5">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="font-bold border-b border-black pb-1 mb-2">Sheet index</h2>
          <ol className="text-sm list-decimal pl-5 space-y-0.5">
            <li>Cover, project data and design criteria</li>
            <li>Dimensioned plan</li>
            <li>Framing plan</li>
            <li>Perspective view</li>
            <li>Structural calculations</li>
            <li>Connection details and fastener schedule</li>
            <li>Materials list</li>
          </ol>

          <p className="text-xs mt-6 pt-2 border-t border-gray-400">{spec.basis}</p>
        </section>

        {/* Sheets 2–4 — drawings */}
        {VIEWS.map(v => images[v.mode] && (
          <section key={v.mode} className="sheet">
            <div className="flex items-baseline justify-between border-b border-black pb-2 mb-3">
              <h2 className="font-bold">{v.title}</h2>
              <span className="text-xs">{heading}</span>
            </div>
            <img src={images[v.mode]} alt={v.title} className="w-full border border-gray-400" />
            <p className="text-sm mt-2">{v.caption}</p>
            {v.mode === 'plan' && (
              <p className="text-xs mt-1">
                {model.widthFt}ft × {model.depthFt}ft. Joists {bom.joistSize} at {bom.joistSpacing}in
                on centre spanning {bom.joistSpanFt}ft. Beam {bom.beam} on {bom.posts} {model.postSize} posts
                at {model.postSpacingFt}ft on centre.
              </p>
            )}
            {v.mode === '3d' && (
              <p className="text-xs mt-1">
                Illustrative only. Refer to the plan and framing sheets for dimensions.
              </p>
            )}
          </section>
        ))}

        {/* Sheet 5 — calculations */}
        <section className="sheet">
          <div className="flex items-baseline justify-between border-b border-black pb-2 mb-3">
            <h2 className="font-bold">Sheet 5 — Structural calculations</h2>
            <span className="text-xs">{heading}</span>
          </div>
          {struct.computable ? (
            <table className="w-full text-sm">
              <tbody>
                {[
                  ['Design live load', `${struct.designLivePsf} psf`, struct.snowGoverns ? 'Ground snow governs over the 40 psf deck live load' : 'Deck live load governs, IRC R301.5'],
                  ['Dead load', `${struct.deadLoadPsf} psf`, 'Framing, decking, rail'],
                  ['Total', `${struct.totalLoadPsf} psf`, ''],
                  ['Tributary area per post', `${struct.tributaryAreaSqFt} sq ft`, `${model.postSpacingFt}ft post spacing × half the joist reach plus cantilever`],
                  ['Load per post', `${struct.postLoadLbs.toLocaleString()} lbs`, `${struct.tributaryAreaSqFt} × ${struct.totalLoadPsf}`],
                  ['Soil bearing', `${struct.soilPsf} psf`, 'IRC Table R401.4.1'],
                  ['Required bearing area', `${struct.requiredFootingAreaSqFt} sq ft`, `${struct.postLoadLbs.toLocaleString()} ÷ ${struct.soilPsf}`],
                  ['Footing — round', `${struct.roundFootingDiameterIn} in dia`, tube ? `Use ${tube}in form` : ''],
                  ['Footing — square', `${struct.squareFootingSideIn} × ${struct.squareFootingSideIn} in`, ''],
                  ['Footing depth', `${struct.frostDepthIn} in min`, 'Bottom of footing below frost line'],
                  ['Footing count', String(bom.footings), 'One per post'],
                ].map(([k, v, note]) => (
                  <tr key={k} className="border-b border-gray-400">
                    <td className="py-1.5 font-semibold w-52">{k}</td>
                    <td className="py-1.5 w-40 font-bold">{v}</td>
                    <td className="py-1.5 text-xs">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm border-2 border-black p-3">
              Calculations cannot be completed: {struct.missing.join(' and ')} not supplied. These
              are published by the authority having jurisdiction for this address and must be
              entered before this sheet is valid.
            </p>
          )}
          {struct.cautions.length > 0 && (
            <div className="mt-3 text-xs">
              <div className="font-semibold">Notes</div>
              <ul className="list-disc pl-5">
                {struct.cautions.map((c, i) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}
        </section>

        {/* Sheet 6 — connections */}
        <section className="sheet">
          <div className="flex items-baseline justify-between border-b border-black pb-2 mb-3">
            <h2 className="font-bold">Sheet 6 — Connections and fastener schedule</h2>
            <span className="text-xs">{heading}</span>
          </div>
          {spec.sections.map((s, i) => (
            <div key={i} className="keep mb-3">
              <h3 className="font-bold text-sm">{i + 1}. {s.title}</h3>
              {s.critical && <p className="text-xs font-semibold mt-0.5">{s.critical}</p>}
              <ul className="list-disc pl-5 text-sm mt-1 space-y-0.5">
                {s.lines.map((l, j) => <li key={j}>{l}</li>)}
              </ul>
              {s.reference && <p className="text-xs mt-0.5">Ref: {s.reference}</p>}
            </div>
          ))}
          <table className="w-full text-sm mt-4 keep">
            <thead><tr className="border-b-2 border-black">
              <th className="text-left py-1">Fastener / connector</th>
              <th className="text-left py-1 w-20">Qty</th>
              <th className="text-left py-1">Location</th>
            </tr></thead>
            <tbody>
              {spec.fasteners.map((f, i) => (
                <tr key={i} className="border-b border-gray-400">
                  <td className="py-1.5">{f.item}</td>
                  <td className="py-1.5 font-bold">{f.qty}</td>
                  <td className="py-1.5 text-xs">{f.where}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Sheet 7 — materials */}
        <section className="sheet">
          <div className="flex items-baseline justify-between border-b border-black pb-2 mb-3">
            <h2 className="font-bold">Sheet 7 — Materials</h2>
            <span className="text-xs">{heading}</span>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="border-b-2 border-black">
              <th className="text-left py-1">Item</th>
              <th className="text-left py-1 w-24">Size</th>
              <th className="text-left py-1 w-16">Qty</th>
              <th className="text-left py-1">Note</th>
            </tr></thead>
            <tbody>
              {spec.lumber.map((l, i) => (
                <tr key={i} className="border-b border-gray-400">
                  <td className="py-1.5">{l.item}</td>
                  <td className="py-1.5 font-bold">{l.size}</td>
                  <td className="py-1.5">{l.qty}</td>
                  <td className="py-1.5 text-xs">{l.note || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs mt-3">
            All framing lumber pressure-treated; posts and members within 6in of grade rated for
            ground contact. Fasteners and connectors hot-dip galvanised or stainless.
          </p>
          <p className="text-xs mt-4 pt-2 border-t border-gray-400">{spec.basis}</p>
        </section>
      </div>
    </div>
  );
}
