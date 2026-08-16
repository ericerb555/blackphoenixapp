/**
 * The build specification, on screen and on paper.
 *
 * Printing matters here: this is the sheet that goes in the truck and into the
 * permit package, and neither audience is looking at a dark web app. The print
 * stylesheet drops the chrome and prints black on white.
 *
 * Where prescriptive tables stop, the panel says so at the top rather than in a
 * footnote. Someone skimming for fastener sizes should not have to reach the
 * bottom to learn the deck needs an engineer.
 */
import { useMemo } from 'react';
import { Printer, AlertTriangle, ShieldAlert, BookOpen } from 'lucide-react';
import { buildSpec } from '../lib/deckBuildSpec';
import type { DeckModel } from '../lib/deckModel';

export default function DeckBuildSpecPanel({
  model,
  site,
}: {
  model: DeckModel;
  site?: { projectName?: string; address?: string; town?: string; state?: string; parcel?: string };
}) {
  const spec = useMemo(() => buildSpec(model), [model]);

  return (
    <div className="rounded-2xl border border-[#2A2A2A] bg-[#111] p-5 print:bg-white print:border-0 print:p-0">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #deck-build-spec, #deck-build-spec * { visibility: visible; }
          #deck-build-spec { position: absolute; left: 0; top: 0; width: 100%;
                             color: #000 !important; background: #fff !important; }
          #deck-build-spec .no-print { display: none !important; }
          #deck-build-spec * { color: #000 !important; border-color: #999 !important; }
          #deck-build-spec section { break-inside: avoid; }
        }
      `}</style>

      <div id="deck-build-spec">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Build specification</h2>
            {(site?.projectName || site?.address) && (
              <p className="text-sm text-gray-400 mt-0.5">
                {site?.projectName}
                {site?.address ? ` · ${site.address}` : ''}
                {site?.town ? `, ${site.town}` : ''}
                {site?.state ? ` ${site.state}` : ''}
                {site?.parcel ? ` · Parcel ${site.parcel}` : ''}
              </p>
            )}
            <p className="text-sm text-gray-400">
              {model.widthFt}ft × {model.depthFt}ft, {model.heightFt}ft above grade
              {model.ledgerAttached ? ', attached to house' : ', free-standing'}
            </p>
          </div>
          <button onClick={() => window.print()}
            className="no-print flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>

        {/* Stated first: someone skimming for fastener sizes should not have to
            reach the bottom to find out the deck needs an engineer. */}
        {spec.engineerRequired.length > 0 && (
          <div className="rounded-xl p-4 mb-4"
            style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)' }}>
            <div className="flex items-center gap-2 font-bold text-red-300 mb-2">
              <ShieldAlert className="w-5 h-5" /> This design needs an engineer
            </div>
            <ul className="list-disc pl-5 space-y-1 text-sm text-red-200">
              {spec.engineerRequired.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
            <p className="text-xs text-red-200/80 mt-2">
              Prescriptive tables do not cover this deck. Fastener schedules below still apply where
              relevant, but the members and connections must be designed and stamped.
            </p>
          </div>
        )}

        <div className="space-y-5">
          {spec.sections.map((s, i) => (
            <section key={i}>
              <h3 className="font-bold text-white border-b border-[#2A2A2A] pb-1 mb-2">
                {i + 1}. {s.title}
              </h3>
              {s.critical && (
                <p className="flex items-start gap-2 text-sm mb-2 rounded-lg p-2"
                  style={{ background: 'rgba(234,179,8,0.10)', color: '#facc15' }}>
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {s.critical}
                </p>
              )}
              <ul className="space-y-1.5">
                {s.lines.map((l, j) => (
                  <li key={j} className="text-sm text-gray-300 flex gap-2">
                    <span className="text-[#ea580c] shrink-0">·</span>
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
              {s.reference && (
                <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> {s.reference}
                </p>
              )}
            </section>
          ))}
        </div>

        <section className="mt-6">
          <h3 className="font-bold text-white border-b border-[#2A2A2A] pb-1 mb-2">Fastener schedule</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase tracking-wide">
                <th className="text-left py-1">Item</th>
                <th className="text-left py-1 w-20">Qty</th>
                <th className="text-left py-1">Where</th>
              </tr>
            </thead>
            <tbody>
              {spec.fasteners.map((f, i) => (
                <tr key={i} className="border-t border-[#2A2A2A]">
                  <td className="py-1.5 text-gray-200">{f.item}</td>
                  <td className="py-1.5 text-white font-semibold tabular-nums">{f.qty}</td>
                  <td className="py-1.5 text-gray-400">{f.where}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-6">
          <h3 className="font-bold text-white border-b border-[#2A2A2A] pb-1 mb-2">Lumber</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase tracking-wide">
                <th className="text-left py-1">Item</th>
                <th className="text-left py-1 w-24">Size</th>
                <th className="text-left py-1 w-16">Qty</th>
                <th className="text-left py-1">Note</th>
              </tr>
            </thead>
            <tbody>
              {spec.lumber.map((l, i) => (
                <tr key={i} className="border-t border-[#2A2A2A]">
                  <td className="py-1.5 text-gray-200">{l.item}</td>
                  <td className="py-1.5 text-white font-semibold">{l.size}</td>
                  <td className="py-1.5 text-white tabular-nums">{l.qty}</td>
                  <td className="py-1.5 text-gray-400">{l.note || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-500 mt-2">
            All framing lumber pressure-treated; posts and anything within 6" of grade rated for
            ground contact. Fasteners and connectors hot-dip galvanised or stainless — modern
            treatments eat plain steel.
          </p>
        </section>

        <p className="text-xs text-gray-500 mt-6 pt-3 border-t border-[#2A2A2A]">
          {spec.basis}
        </p>
      </div>
    </div>
  );
}
