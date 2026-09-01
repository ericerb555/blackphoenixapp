/**
 * The scope of work — what is actually being done, in the order it happens.
 *
 * This is the spine. A customer asks for something; this is where it becomes a
 * process that can be priced, bid out, scheduled and watched. Everything else
 * in the design centre feeds it or reads from it.
 *
 * WHY IT IS DRAWN AS PHASES RATHER THAN A TABLE
 *
 * A table of tasks is a list, and a list cannot show that the blocking for a
 * television has to go in before the sheetrock. Drawn in build order, with the
 * inspection hold points sitting between the phases as bars you cannot work
 * past, it reads as the job — and somebody scanning it can see when something
 * is in the wrong place.
 *
 * WHAT IT REFUSES TO HIDE
 *
 * How sure each line is. A quantity worked out at the desk and one confirmed on
 * site look identical in a total, and letting them look identical here is how an
 * indicative number becomes a fixed price by accident.
 */
import { useMemo, useState } from 'react';
import {
  ListChecks, Plus, Trash2, AlertTriangle, ShieldCheck, MapPin, Hammer,
  ClipboardCheck, PackageCheck,
} from 'lucide-react';
import {
  type Scope, type ScopeLine, type PhaseId, type Confidence,
  PHASES, TASKS, JOB_STANDARDS, BLANK_SCOPE,
  addLine, byPhase, findGaps, summarise, confirmAll, confidenceNote,
  consumablesFor, hoursFor, taskById, phaseOf,
} from '../lib/scopeModel';
import { STARTERS, linesFromStarter, starterFor } from '../lib/scopeStarters';
import BidIntakePanel from './BidIntakePanel';
import BidPackagePanel from './BidPackagePanel';

const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';
const tiny = 'px-2 py-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-xs focus:outline-none focus:border-[#ea580c]';

export default function ScopeOfWork({
  scope, onChange, jobTitle, serviceType, siteAddress, designProjectId,
}: {
  scope: Scope;
  onChange: (s: Scope) => void;
  /** From the linked job, so the right starter can be suggested. */
  jobTitle?: string;
  serviceType?: string;
  /** Seeds the bid packages. A sub cannot price travel and access blind. */
  siteAddress?: string;
  /** Carried onto a bid request so a returned price finds its way home. */
  designProjectId?: string;
}) {
  const suggested = starterFor(serviceType, jobTitle);
  const [taskId, setTaskId] = useState(TASKS[0].id);
  const [taskQty, setTaskQty] = useState(100);

  const groups = useMemo(() => byPhase(scope), [scope]);
  const gaps = useMemo(() => findGaps(scope), [scope]);
  const s = useMemo(() => summarise(scope), [scope]);

  const patch = (id: string, p: Partial<ScopeLine>) =>
    onChange({ ...scope, lines: scope.lines.map(l => (l.id === id ? { ...l, ...p } : l)) });

  const drop = (id: string) =>
    onChange({ ...scope, lines: scope.lines.filter(l => l.id !== id) });

  /** A template brings its own consumables in as their own lines. */
  const addTask = () => {
    const t = taskById(taskId);
    if (!t) return;
    let next = addLine(scope, {
      phase: t.phase, trade: t.trade, description: t.label,
      qty: taskQty, unit: t.unit,
      confidence: scope.walkthroughDone ? 'confirmed' : 'provisional',
      origin: 'template', taskId: t.id,
      basis: `${hoursFor(t, taskQty)} hours at ${t.hoursPer}/${t.unit}`,
    });
    for (const c of consumablesFor(t, taskQty)) {
      next = addLine(next, {
        phase: t.phase, trade: t.trade, description: c.description,
        qty: c.qty, unit: c.unit,
        confidence: scope.walkthroughDone ? 'confirmed' : 'provisional',
        // A SKU so the vendor catalogues can be asked about it later. Screws
        // and thinset are bought from somebody, and a consumable with no SKU
        // is a line nobody can price.
        origin: 'template',
        sku: `consumable:${c.description.toLowerCase().replace(/\s+/g, '-')}`,
        basis: `comes with ${t.label.toLowerCase()}`,
      });
    }
    onChange(next);
  };

  const addStandard = (id: string) => {
    const j = JOB_STANDARDS.find(x => x.id === id);
    if (!j) return;
    onChange(addLine(scope, {
      phase: j.phase, trade: j.trade, description: j.label,
      qty: 1, unit: j.unit,
      confidence: scope.walkthroughDone ? 'confirmed' : 'provisional',
      origin: 'job-standard', basis: j.why,
    }));
  };

  const alreadyStandard = (label: string) => scope.lines.some(l => l.description === label);

  /**
   * Lay a starter down.
   *
   * Only offered while the scope is empty. Dropping twenty lines into a scope
   * somebody has already built is not help, it is a mess to unpick.
   */
  const useStarter = (id: string) => {
    const st = STARTERS.find(x => x.id === id);
    if (!st) return;
    let next = scope;
    for (const l of linesFromStarter(st)) next = addLine(next, l);
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {/* ── where it stands ── */}
      <div className={card}>
        <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
          <ListChecks className="w-4 h-4 text-[#ea580c]" /> The scope of work
        </h2>
        <p className="text-xs text-gray-500 mb-3">{confidenceNote(scope)}</p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Stat l="Lines" v={String(s.lines)} />
          <Stat l="Phases" v={String(s.phases)} />
          <Stat l="Hold points" v={String(s.holdPoints)} sub="inspections" />
          <Stat l="We do" v={String(s.selfPerformed)} sub={`${s.bidOut} bid out`} />
          <Stat l="Trades" v={String(s.trades.length)} sub={s.trades.slice(0, 2).join(', ')} />
        </div>

        {s.lines > 0 && !scope.walkthroughDone && (
          <button onClick={() => onChange(confirmAll(scope))}
            className="mt-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
            style={{ background: '#ea580c' }}>
            <MapPin className="w-4 h-4" /> I have walked the job — confirm these quantities
          </button>
        )}
        {scope.walkthroughDone && (
          <p className="mt-3 text-[11px] text-emerald-300/90 flex items-center gap-1.5">
            <ClipboardCheck className="w-3.5 h-3.5" />
            Walked. Anything added from here starts provisional again.
          </p>
        )}
      </div>

      {/* ── what is missing ── */}
      {gaps.length > 0 && (
        <div className={card}>
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Before this goes out
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Not blocking. An exclusion may be deliberate — the point is that it is a
            decision rather than an accident.
          </p>
          <div className="space-y-2">
            {gaps.map((g, i) => (
              <div key={i} className={`rounded-xl p-2.5 border ${
                g.severity === 'missing'
                  ? 'border-red-500/30 bg-red-500/[0.06]'
                  : 'border-amber-500/25 bg-amber-500/[0.05]'}`}>
                <p className={`text-xs ${g.severity === 'missing' ? 'text-red-300' : 'text-amber-200/90'}`}>
                  {g.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── the process ── */}
      <div className={card}>
        <h3 className="text-sm font-bold text-white mb-1">The process</h3>
        <p className="text-xs text-gray-500 mb-3">
          In build order. An inspection bar is work that cannot start until the one
          before it has passed.
        </p>

        {groups.length === 0 ? (
          <div>
            <p className="text-[11px] text-gray-600 mb-3">
              Nothing scoped yet. Start from the shape of the job and edit it down — that
              is quicker than typing twelve phases, and nothing gets forgotten on the way.
            </p>
            {suggested && (
              <button onClick={() => useStarter(suggested.id)}
                className="w-full mb-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-white text-left"
                style={{ background: '#ea580c' }}>
                Start from “{suggested.label}”
                <span className="block text-[11px] font-normal opacity-80">{suggested.blurb}</span>
              </button>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {STARTERS.filter(st => st.id !== suggested?.id).map(st => (
                <button key={st.id} onClick={() => useStarter(st.id)}
                  className="text-left px-2.5 py-2 rounded-lg text-xs border border-dashed border-[#2A2A2A] text-gray-400 hover:text-white">
                  {st.label}
                  <span className="block text-[10px] text-gray-600">{st.blurb}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-600 mt-2">
              Everything arrives provisional with no real quantities — the shape is right,
              the numbers come from the trade tools and the walkthrough.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map(({ phase, lines }) => (
              <div key={phase.id}>
                <div className="flex items-baseline gap-2 mb-1.5">
                  <span className="text-xs font-bold text-white">{phase.label}</span>
                  <span className="text-[10px] text-gray-600">{lines.length} line{lines.length === 1 ? '' : 's'}</span>
                </div>

                <ul className="space-y-1.5">
                  {lines.map(l => (
                    <li key={l.id} className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-2.5">
                      <div className="flex items-start gap-2">
                        <input value={l.description} onChange={e => patch(l.id, { description: e.target.value })}
                          className={`${tiny} flex-1 min-w-0`} />
                        <input type="number" value={l.qty} step={0.5}
                          onChange={e => patch(l.id, { qty: Number(e.target.value) || 0 })}
                          className={`${tiny} w-16 shrink-0`} />
                        <span className="text-[11px] text-gray-500 w-12 shrink-0">{l.unit}</span>
                        <button onClick={() => drop(l.id)} className="text-gray-600 hover:text-red-400 shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <select value={l.trade} onChange={e => patch(l.id, { trade: e.target.value })}
                          className={`${tiny} w-28`}>
                          {['carpentry', 'laboring', 'electrical', 'plumbing', 'hvac', 'tile',
                            'drywall', 'flooring', 'painting', 'masonry', 'roofing', 'siding']
                            .map(t => <option key={t} value={t}>{t}</option>)}
                        </select>

                        <button onClick={() => patch(l.id, { bidOut: !l.bidOut })}
                          className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition ${
                            l.bidOut
                              ? 'border-sky-500/50 text-sky-300 bg-sky-500/10'
                              : 'border-[#2A2A2A] text-gray-500 hover:text-white'}`}>
                          {l.bidOut ? 'bid out' : 'we do it'}
                        </button>

                        <button onClick={() => patch(l.id, {
                          confidence: (l.confidence === 'confirmed' ? 'provisional' : 'confirmed') as Confidence,
                        })}
                          className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition ${
                            l.confidence === 'confirmed'
                              ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
                              : 'border-amber-500/30 text-amber-400/90 bg-amber-500/[0.06]'}`}>
                          {l.confidence}
                        </button>

                        {l.basis && <span className="text-[10px] text-gray-600 truncate">{l.basis}</span>}
                      </div>
                    </li>
                  ))}
                </ul>

                {phase.holdPoint && (
                  <div className="mt-2 rounded-xl border border-sky-500/30 bg-sky-500/[0.06] px-3 py-2 flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <p className="text-[11px] text-sky-200/90">
                      <span className="font-semibold">{phase.holdPoint}</span>
                      {' '}— nothing after this starts until it passes.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── add a task ── */}
      <div className={card}>
        <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <Hammer className="w-4 h-4 text-[#ea580c]" /> Add a task
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          A task brings its own consumables in with it — screws, thinset, shims — so they
          are quoted by construction rather than by memory.
        </p>
        <div className="flex flex-wrap gap-2">
          <select value={taskId} onChange={e => setTaskId(e.target.value)} className={`${tiny} flex-1 min-w-[10rem]`}>
            {TASKS.map(t => (
              <option key={t.id} value={t.id}>
                {t.label} · {phaseOf(t.phase).label}
              </option>
            ))}
          </select>
          <input type="number" value={taskQty} onChange={e => setTaskQty(Number(e.target.value) || 0)}
            className={`${tiny} w-20`} />
          <span className="text-[11px] text-gray-500 self-center">
            {taskById(taskId)?.unit}
          </span>
          <button onClick={addTask}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5"
            style={{ background: '#ea580c' }}>
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
        {taskById(taskId) && (
          <p className="text-[10px] text-gray-600 mt-2">
            Brings: {consumablesFor(taskById(taskId)!, taskQty).map(c => c.description).join(', ')}
          </p>
        )}
      </div>

      {/* ── the lines nobody owns ── */}
      <div className={card}>
        <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <PackageCheck className="w-4 h-4 text-[#ea580c]" /> Protection, safety and site
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          These belong to the job rather than to any trade, which is exactly why they get
          left off — there is nobody whose job it obviously is.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {JOB_STANDARDS.map(j => {
            const on = alreadyStandard(j.label);
            return (
              <button key={j.id} onClick={() => !on && addStandard(j.id)} disabled={on}
                title={j.why}
                className={`text-left px-2.5 py-2 rounded-lg text-xs border transition ${
                  on
                    ? 'border-emerald-500/30 text-emerald-300/80 bg-emerald-500/[0.06] cursor-default'
                    : 'border-dashed border-[#2A2A2A] text-gray-400 hover:text-white'}`}>
                {on ? '✓ ' : '+ '}{j.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── the scope goes out ──
          Sits above the intake, because that is the order the loop runs in:
          the package goes out, and what comes back lands on the same lines. */}
      <BidPackagePanel
        scope={scope}
        jobTitle={jobTitle}
        siteAddress={siteAddress}
        designProjectId={designProjectId}
      />

      {/* ── a sub's quote comes back ──
          Only once something is actually out to bid. Before that there is
          nothing for their lines to land on, and the panel is just noise. */}
      {s.bidOut > 0 && (
        <BidIntakePanel
          scope={scope}
          onApply={amounts => {
            onChange({
              ...scope,
              lines: scope.lines.map(l =>
                amounts[l.id] === undefined ? l : {
                  ...l,
                  bidAmount: amounts[l.id],
                  // A returned bid is a real number from the person doing the
                  // work, so the line stops being provisional — but the basis
                  // says where it came from, because a bid is a price and not
                  // a measurement.
                  confidence: 'confirmed' as Confidence,
                  basis: 'a subcontractor’s returned quote, accepted by the office',
                }),
            });
          }}
        />
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
