/**
 * The walkthrough sheet — what you carry round the building.
 *
 * WHY IT IS NOT ONE BUTTON ANY MORE
 *
 * It used to be. One click marked every line confirmed, on the reasoning that
 * the walk is a single event. That is true about the visit and false about the
 * measuring: nobody puts a tape on forty lines, and standing in a kitchen
 * teaches you nothing about the joist spacing under the floor. Promoting both
 * with one press makes an estimate look like a measurement, which is exactly
 * what the confidence field was added to prevent.
 *
 * So each line gets its own verdict, and there are three, not two:
 *
 *   measured   — somebody put a tape on it. The number can change.
 *   accepted   — somebody looked and was content with the desk figure.
 *   not looked — left alone entirely, still provisional, because it still is.
 *
 * The middle one is what keeps this honest. It is a real confirmation and it is
 * a different claim from a measurement, and the basis on the line says which.
 *
 * WHAT THE VISIT IS ACTUALLY FOR
 *
 * Finding what was not on the list. The cut joist, the full panel, the wall
 * that turned out to be bearing. So discoveries are added here rather than
 * being something to remember to type in afterwards.
 */
import { useMemo, useState } from 'react';
import {
  MapPin, Ruler, Eye, Minus, Plus, AlertTriangle, ClipboardCheck, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  type Walkthrough, type LineVerdict,
  SITE_CONDITIONS, sheetFor, progressOf, walkNote, applyWalkthrough,
  bidsAffectedBy, bidImpactNote, checkFor,
} from '../lib/walkthroughModel';
import { type Scope, type PhaseId, PHASES, addLine, phaseOf } from '../lib/scopeModel';

const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';
const tiny = 'px-2 py-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-xs focus:outline-none focus:border-[#ea580c]';

const VERDICTS: Array<{ id: LineVerdict; label: string; icon: any; hint: string }> = [
  { id: 'measured', label: 'Measured', icon: Ruler, hint: 'A tape went on it. The number can change.' },
  { id: 'accepted', label: 'Looked, agreed', icon: Eye, hint: 'Content with the desk figure without measuring.' },
  { id: 'unvisited', label: 'Not looked at', icon: Minus, hint: 'Left alone. Stays provisional, because it is.' },
];

export default function WalkthroughSheet({ scope, walkthrough, onChange, onApply }: {
  scope: Scope;
  walkthrough: Walkthrough;
  onChange: (w: Walkthrough) => void;
  onApply: (s: Scope) => void;
}) {
  const [newDesc, setNewDesc] = useState('');
  const [newQty, setNewQty] = useState(1);
  const [newUnit, setNewUnit] = useState('ea');
  const [newPhase, setNewPhase] = useState<PhaseId>('demolition');

  const rows = useMemo(() => sheetFor(scope, walkthrough), [scope, walkthrough]);
  const progress = useMemo(() => progressOf(scope, walkthrough), [scope, walkthrough]);
  const impacts = useMemo(() => bidsAffectedBy(scope, walkthrough), [scope, walkthrough]);

  const setVerdict = (lineId: string, verdict: LineVerdict) => {
    const existing = checkFor(walkthrough, lineId);
    onChange({
      ...walkthrough,
      checks: [
        ...walkthrough.checks.filter(c => c.lineId !== lineId),
        { lineId, verdict, measuredQty: verdict === 'measured' ? existing?.measuredQty : undefined },
      ],
    });
  };

  const setMeasured = (lineId: string, qty: number) => {
    onChange({
      ...walkthrough,
      checks: [
        ...walkthrough.checks.filter(c => c.lineId !== lineId),
        { lineId, verdict: 'measured', measuredQty: qty },
      ],
    });
  };

  const toggleCondition = (id: string) => {
    const on = walkthrough.conditionIds.includes(id);
    onChange({
      ...walkthrough,
      conditionIds: on
        ? walkthrough.conditionIds.filter(c => c !== id)
        : [...walkthrough.conditionIds, id],
    });
  };

  /**
   * Something found on site that was never scoped.
   *
   * It arrives already confirmed, because somebody is standing in front of it —
   * which is a stronger claim than anything worked out at the desk.
   */
  const addDiscovery = () => {
    if (!newDesc.trim()) { toast.error('Say what was found.'); return; }
    onApply(addLine(scope, {
      phase: newPhase,
      trade: '',
      description: newDesc.trim(),
      qty: newQty > 0 ? newQty : 1,
      unit: newUnit.trim() || 'ea',
      confidence: 'confirmed',
      origin: 'manual',
      basis: 'found on site during the walkthrough',
    }));
    setNewDesc('');
    setNewQty(1);
    toast.success('Added to the scope, confirmed — you were standing in front of it.');
  };

  const apply = () => {
    if (!progress.measured && !progress.accepted) {
      toast.error('Nothing has a verdict yet.');
      return;
    }
    onApply(applyWalkthrough(scope, walkthrough));
    toast.success(
      `${progress.measured + progress.accepted} lines confirmed`
      + (progress.corrected ? `, ${progress.corrected} quantity corrected.` : '.'),
    );
  };

  /** Escape hatch: what the single button used to do, but only for the rest. */
  const acceptRest = () => {
    const untouched = rows.filter(r => !r.check || r.check.verdict === 'unvisited');
    if (!untouched.length) { toast.error('Every line already has a verdict.'); return; }
    onChange({
      ...walkthrough,
      checks: [
        ...walkthrough.checks.filter(c => !untouched.some(r => r.line.id === c.lineId)),
        ...untouched.map(r => ({ lineId: r.line.id, verdict: 'accepted' as LineVerdict })),
      ],
    });
    toast.success(`${untouched.length} lines marked as looked at and agreed, not measured.`);
  };

  if (!scope.lines.length) return null;

  return (
    <div className="space-y-4">
      <div className={card}>
        <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
          <MapPin className="w-4 h-4 text-[#ea580c]" /> The walkthrough
        </h2>
        <p className="text-xs text-gray-500 mb-3">{walkNote(scope, walkthrough)}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          <Stat l="Measured" v={String(progress.measured)} />
          <Stat l="Agreed" v={String(progress.accepted)} />
          <Stat l="Not looked at" v={String(progress.unvisited)} />
          <Stat l="Corrected" v={String(progress.corrected)}
            sub={progress.corrected ? 'the walk paid for itself' : undefined} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <label className="text-[11px] text-gray-500">
            Walked on
            <input type="date" value={walkthrough.walkedOn || ''}
              onChange={e => onChange({ ...walkthrough, walkedOn: e.target.value })}
              className={`${tiny} w-full mt-0.5`} />
          </label>
          <label className="text-[11px] text-gray-500">
            Walked by
            <input value={walkthrough.walkedBy || ''}
              onChange={e => onChange({ ...walkthrough, walkedBy: e.target.value })}
              placeholder="Who was there" className={`${tiny} w-full mt-0.5`} />
          </label>
          <label className="text-[11px] text-gray-500 flex items-end gap-1.5 pb-1">
            <input type="checkbox" checked={walkthrough.withCustomer === true}
              onChange={e => onChange({ ...walkthrough, withCustomer: e.target.checked })}
              className="w-4 h-4 accent-[#ea580c]" />
            <span className="text-gray-400">Customer was there</span>
          </label>
        </div>
      </div>

      {/* ── a correction that moves somebody's price ── */}
      {impacts.length > 0 && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.06] p-4">
          <h3 className="text-sm font-bold text-red-300 flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4" /> This moves a price somebody already gave
          </h3>
          <p className="text-xs text-red-200/90 mb-2">{bidImpactNote(impacts)}</p>
          <ul className="space-y-1">
            {impacts.map(i => (
              <li key={i.lineId} className="text-[11px] text-red-200/80 flex justify-between gap-2">
                <span className="truncate">{i.description}</span>
                <span className="shrink-0 font-semibold">
                  {i.wasQty} → {i.nowQty} ({i.delta > 0 ? '+' : ''}{i.delta})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── the sheet ── */}
      <div className={card}>
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-sm font-bold text-white">Line by line</h3>
          <button onClick={acceptRest} className="text-[11px] text-gray-500 hover:text-white">
            Mark the rest as looked at and agreed
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Three verdicts, not two. Measuring and agreeing are both confirmations and they
          are different claims — the line records which, so nobody has to remember in six
          weeks whether a number came off a tape or off a photograph.
        </p>

        <ul className="space-y-1.5">
          {rows.map(r => {
            const verdict = r.check?.verdict || 'unvisited';
            return (
              <li key={r.line.id} className={`rounded-xl border p-2.5 ${
                verdict === 'measured' ? 'border-emerald-500/30 bg-emerald-500/[0.05]'
                  : verdict === 'accepted' ? 'border-sky-500/25 bg-sky-500/[0.04]'
                  : 'border-[#2A2A2A] bg-[#0A0A0A]'}`}>
                <div className="flex items-baseline justify-between gap-2 mb-1.5">
                  <span className="text-xs text-gray-300 truncate">{r.line.description}</span>
                  <span className="text-[10px] text-gray-600 shrink-0">
                    {phaseOf(r.line.phase).label}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {VERDICTS.map(v => (
                    <button key={v.id} onClick={() => setVerdict(r.line.id, v.id)} title={v.hint}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold border flex items-center gap-1 ${
                        verdict === v.id
                          ? 'border-[#ea580c] text-white bg-[#ea580c]/15'
                          : 'border-[#2A2A2A] text-gray-500 hover:text-white'}`}>
                      <v.icon className="w-3 h-3" /> {v.label}
                    </button>
                  ))}

                  <span className="text-[10px] text-gray-600 ml-auto">
                    on paper {r.line.qty} {r.line.unit}
                  </span>

                  {verdict === 'measured' && (
                    <input type="number" step="any"
                      value={r.check?.measuredQty ?? ''}
                      placeholder={String(r.line.qty)}
                      onChange={e => setMeasured(r.line.id, Number(e.target.value))}
                      className={`${tiny} w-20 text-right`} />
                  )}
                </div>

                {r.delta !== undefined && (
                  <p className={`text-[10px] mt-1 ${r.delta > 0 ? 'text-amber-400' : 'text-sky-400'}`}>
                    {r.delta > 0 ? 'More' : 'Less'} than the desk figure by {Math.abs(r.delta)} {r.line.unit}
                    {r.line.bidAmount !== undefined && ' — and somebody has already priced this'}
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        <button onClick={apply}
          className="mt-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
          style={{ background: '#ea580c' }}>
          <ClipboardCheck className="w-4 h-4" />
          Write the walk onto the scope
        </button>
      </div>

      {/* ── what was found ── */}
      <div className={card}>
        <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#ea580c]" /> Found on site
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          The reason the visit was worth making. Anything added here arrives confirmed,
          because you are standing in front of it — which beats anything worked out at a desk.
        </p>
        <div className="flex flex-wrap gap-1.5">
          <input value={newDesc} onChange={e => setNewDesc(e.target.value)}
            placeholder="Cut joist under the tub…" className={`${tiny} flex-1 min-w-[12rem]`} />
          <input type="number" value={newQty} onChange={e => setNewQty(Number(e.target.value) || 0)}
            className={`${tiny} w-16`} />
          <input value={newUnit} onChange={e => setNewUnit(e.target.value)}
            className={`${tiny} w-16`} />
          <select value={newPhase} onChange={e => setNewPhase(e.target.value as PhaseId)}
            className={`${tiny} min-w-[8rem]`}>
            {PHASES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <button onClick={addDiscovery}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5"
            style={{ background: '#ea580c' }}>
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </div>

      {/* ── conditions ── */}
      <div className={card}>
        <h3 className="text-sm font-bold text-white mb-1">Site conditions</h3>
        <p className="text-xs text-gray-500 mb-3">
          These are not quantities and they cost real money. A subcontractor who is not told
          prices them as risk, and his guess is always worse than the truth — so they travel
          with the bid package.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {SITE_CONDITIONS.map(c => {
            const on = walkthrough.conditionIds.includes(c.id);
            return (
              <button key={c.id} onClick={() => toggleCondition(c.id)} title={c.why}
                className={`text-left px-2.5 py-2 rounded-lg text-xs border transition ${
                  on
                    ? 'border-amber-500/40 text-amber-200/90 bg-amber-500/[0.07]'
                    : 'border-dashed border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
                {on ? <Check className="w-3 h-3 inline mr-1" /> : '+ '}{c.label}
              </button>
            );
          })}
        </div>
        <textarea value={walkthrough.notes || ''}
          onChange={e => onChange({ ...walkthrough, notes: e.target.value })}
          rows={2} placeholder="Anything the boxes have no room for…"
          className="mt-2 w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#ea580c] resize-y" />
      </div>
    </div>
  );
}

function Stat({ l, v, sub }: { l: string; v: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-2.5">
      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{l}</p>
      <p className="text-sm font-bold text-white mt-0.5">{v}</p>
      {sub && <p className="text-[10px] text-emerald-400/80 truncate">{sub}</p>}
    </div>
  );
}
