/**
 * StairCalculator — for use standing on the site with a tape measure.
 *
 * Built for a phone in one hand: large numeric inputs, results the moment there
 * is enough to compute, and no save step before an answer appears. Anything
 * that would make someone stop and think about the app rather than the stairs
 * has been left out.
 *
 * The two measurements it asks for are the two that get taken wrong. Total rise
 * must be finished surface to finished surface — decking to landing pad, not
 * joist to grade — and the available run is to the far edge of the pad, not to
 * where the pad currently ends. Both are said on screen rather than assumed.
 */
import { useMemo, useState } from 'react';
import {
  Ruler, AlertTriangle, CheckCircle2, Printer, ArrowDownRight, Info,
} from 'lucide-react';
import {
  calcStairs, asFeetInches, DEFAULT_STAIR,
  MAX_RISER_IN, MIN_TREAD_IN, MAX_RISER_VARIATION_IN,
  type StairInput,
} from '../lib/stairCalc';
import DesignWorkspaceNav from '../components/DesignWorkspaceNav';

export default function StairCalculator() {
  const [input, setInput] = useState<StairInput>(DEFAULT_STAIR);
  const r = useMemo(() => calcStairs(input), [input]);

  const set = <K extends keyof StairInput>(k: K, v: number) =>
    setInput(s => ({ ...s, [k]: v }));

  const field = 'w-full px-4 py-4 bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl text-white text-2xl font-bold tabular-nums focus:outline-none focus:border-[#ea580c]';
  const label = 'block text-sm font-semibold text-gray-300 mb-1';
  const hint = 'block text-xs text-gray-500 mb-2';

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-4 pb-24">
      <div className="max-w-lg mx-auto space-y-4" id="stair-sheet">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #stair-sheet, #stair-sheet * { visibility: visible; }
            #stair-sheet { position:absolute; left:0; top:0; width:100%;
                           color:#000 !important; background:#fff !important; }
            #stair-sheet .no-print { display:none !important; }
            #stair-sheet * { color:#000 !important; border-color:#999 !important; }
          }
        `}</style>

        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <ArrowDownRight className="w-5 h-5 text-[#ea580c]" /> Stair calculator
            </h1>
            <p className="text-sm text-gray-400">Two measurements. Everything else is worked out.</p>
          </div>
          {r.computable && (
            <button onClick={() => window.print()}
              className="no-print p-3 rounded-xl text-white shrink-0"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
              aria-label="Print">
              <Printer className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* The two measurements that get taken wrong. */}
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#111] p-4 space-y-4 no-print">
          <div>
            <span className={label}>Total rise</span>
            <span className={hint}>
              Finished deck surface down to the finished landing pad — decking to pad, not joist to
              dirt.
            </span>
            <div className="flex items-center gap-2">
              <input type="number" inputMode="decimal" step="0.125" className={field}
                value={input.totalRiseIn || ''} placeholder="0"
                onChange={e => set('totalRiseIn', Number(e.target.value) || 0)} />
              <span className="text-gray-400 font-semibold">in</span>
            </div>
            {input.totalRiseIn > 0 && (
              <span className="text-xs text-gray-500 mt-1 block">{asFeetInches(input.totalRiseIn)}</span>
            )}
          </div>

          <div>
            <span className={label}>Room to run out</span>
            <span className={hint}>
              Deck edge to the far side of the landing pad. Leave blank if it is open ground.
            </span>
            <div className="flex items-center gap-2">
              <input type="number" inputMode="decimal" step="0.5" className={field}
                value={input.availableRunIn || ''} placeholder="optional"
                onChange={e => set('availableRunIn', Number(e.target.value) || 0)} />
              <span className="text-gray-400 font-semibold">in</span>
            </div>
            {input.availableRunIn > 0 && (
              <span className="text-xs text-gray-500 mt-1 block">{asFeetInches(input.availableRunIn)}</span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {([
              ['treadDepthIn', 'Tread', 0.5],
              ['treadThicknessIn', 'Tread thk', 0.125],
              ['stairWidthIn', 'Width', 1],
            ] as [keyof StairInput, string, number][]).map(([k, l, step]) => (
              <div key={k}>
                <span className="block text-xs font-semibold text-gray-400 mb-1">{l} (in)</span>
                <input type="number" inputMode="decimal" step={step}
                  className="w-full px-2 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-base tabular-nums focus:outline-none focus:border-[#ea580c]"
                  value={input[k] as number}
                  onChange={e => set(k, Number(e.target.value) || 0)} />
              </div>
            ))}
          </div>
        </div>

        {!r.computable ? (
          <p className="flex items-start gap-2 text-sm text-gray-500 px-1">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            Enter the total rise and the numbers appear.
          </p>
        ) : (
          <>
            {/* The answer, big enough to read at arm's length. */}
            <div className="rounded-2xl border-2 p-5"
              style={{ borderColor: r.failures.length ? 'rgba(239,68,68,0.5)' : '#ea580c', background: '#111' }}>
              <div className="grid grid-cols-2 gap-5">
                <Big label="Risers" value={String(r.riserCount)} />
                <Big label="Each riser" value={`${r.riserHeightIn}"`} accent />
                <Big label="Treads" value={String(r.treadCount)} />
                <Big label="Total run" value={asFeetInches(r.totalRunIn)} />
              </div>
              <div className="mt-4 pt-4 border-t border-[#2A2A2A] space-y-1.5 text-sm">
                <Line k="Stringer length (point to point)" v={asFeetInches(r.stringerLengthIn)} />
                <Line k="Stringers needed" v={`${r.stringerCount} at ${input.stairWidthIn}" wide`} />
                <Line k="Cut off bottom of stringer" v={`${r.bottomRiserCutIn}"`} strong />
              </div>
              <p className="text-xs text-gray-500 mt-3">
                That bottom cut is the one people miss. The stringer sits on the pad, so without
                taking exactly one tread thickness off the bottom, the first step ends up taller
                than the rest — a trip hazard and a failed inspection on riser variation.
              </p>
            </div>

            {r.failures.length > 0 && (
              <div className="rounded-2xl p-4"
                style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)' }}>
                {r.failures.map((f, i) => (
                  <p key={i} className="flex items-start gap-2 text-sm text-red-200 mb-1 last:mb-0">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {f}
                  </p>
                ))}
              </div>
            )}

            {r.cautions.map((c, i) => (
              <p key={i} className="flex items-start gap-2 text-sm text-yellow-400 px-1">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {c}
              </p>
            ))}

            {r.failures.length === 0 && (
              <p className="flex items-start gap-2 text-sm text-green-400 px-1">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                Within IRC limits: riser under {MAX_RISER_IN}", tread at least {MIN_TREAD_IN}".
              </p>
            )}

            {/* Other riser counts, because on site the pad is where it is. */}
            {r.options.length > 1 && (
              <div className="rounded-2xl border border-[#2A2A2A] bg-[#111] p-4">
                <h2 className="text-sm font-bold text-white mb-2">Other ways to divide it</h2>
                <div className="space-y-1.5">
                  {r.options.map(o => {
                    const chosen = o.riserCount === r.riserCount;
                    const legal = o.riserHeightIn <= MAX_RISER_IN;
                    return (
                      // Read-only: these show what the other divisions would
                      // give. A button that does nothing when tapped is worse
                      // than plain text, especially on a phone.
                      <div key={o.riserCount}
                        className="w-full flex items-center justify-between text-sm px-3 py-2 rounded-xl border"
                        style={{
                          borderColor: chosen ? '#ea580c' : '#2A2A2A',
                          background: chosen ? 'rgba(234,88,12,0.10)' : 'transparent',
                          opacity: legal ? 1 : 0.45,
                        }}>
                        <span className="text-gray-200">
                          {o.riserCount} risers @ <strong className="text-white">{o.riserHeightIn}"</strong>
                        </span>
                        <span className="text-gray-400">
                          {asFeetInches(o.totalRunIn)}
                          {!legal ? ' · over max' : o.fits ? '' : ' · too long'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-[#2A2A2A] bg-[#111] p-4 text-sm text-gray-300 space-y-1.5">
              <h2 className="text-sm font-bold text-white mb-1">On site</h2>
              <p>· All risers must be within {MAX_RISER_VARIATION_IN}" of each other — that is what gets measured.</p>
              <p>· Landing at least 36" deep in the direction of travel, top and bottom.</p>
              {r.handrailRequired && <p>· Graspable handrail required, 34"–38" above the tread nosings.</p>}
              <p>· Stringers bear on a pad or footing, never on soil.</p>
              <p>· Open risers must not pass a 4" sphere.</p>
            </div>
          </>
        )}

        <p className="text-xs text-gray-600 px-1">
          Prescriptive layout per IRC R311.7 and R507.10. Verify against the code edition your
          jurisdiction has adopted.
        </p>

        {/* Below the answer, not above it: on site the numbers are why you
            opened this, and navigation should not be in the way of them. */}
        <div className="no-print pt-2">
          <DesignWorkspaceNav current="stairs" />
        </div>
      </div>
    </div>
  );
}

function Big({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`text-3xl font-black tabular-nums ${accent ? 'text-[#ea580c]' : 'text-white'}`}>
        {value}
      </div>
    </div>
  );
}

function Line({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-gray-400">{k}</span>
      <span className={`tabular-nums shrink-0 ${strong ? 'text-[#ea580c] font-bold' : 'text-white font-semibold'}`}>{v}</span>
    </div>
  );
}
