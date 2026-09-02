/**
 * What the town requires, and whether this design meets it.
 *
 * WHY IT ASKS INSTEAD OF KNOWING
 *
 * The alternative was shipping every local ordinance pre-loaded. It would work
 * on day one and rot in silence: towns amend, and a figure that was right when
 * it was written is wrong two years later with nothing to announce it. A wrong
 * setback in a filed drawing costs a reputation with a building department, and
 * it would be Eric's rather than the software's.
 *
 * So a town is filled in once and reused on every job there afterwards. The
 * record says who entered it, where they got it, and how old it is — because a
 * rule read off an ordinance in 2023 deserves a phone call before a filing
 * rests on it.
 *
 * THE ONE THING THIS SCREEN MUST NEVER DO
 *
 * Show a green tick for a rule nobody entered. Unknown is its own state, drawn
 * differently from both pass and fail, and the summary line refuses to read as
 * approval while anything is unchecked.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Landmark, Check, X, HelpCircle, AlertTriangle, Loader2, Save, Scale, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { projectId as supabaseProjectId } from '../utils/supabase/info';
import {
  type Jurisdiction, type Proposal, type Finding, type VarianceApplication,
  type RuleSource,
  SOURCE_LABEL, blankJurisdiction, checkProposal, complianceNote, jurisdictionNote,
  isStale, ageInDays, violations, unknowns, criteriaFor, reliefFrom, varianceGaps,
} from '../lib/jurisdictionModel';

const SERVER = `https://${supabaseProjectId}.supabase.co/functions/v1/make-server-3eae23a6`;
const card = 'rounded-2xl border border-[#2A2A2A] bg-[#111] p-4';
const tiny = 'px-2 py-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-xs focus:outline-none focus:border-[#ea580c]';

const NUM_FIELDS: Array<[keyof Jurisdiction, string, string]> = [
  ['frontSetbackFt', 'Front setback', 'ft'],
  ['rearSetbackFt', 'Rear setback', 'ft'],
  ['sideSetbackFt', 'Side setback', 'ft'],
  ['maxHeightFt', 'Height limit', 'ft'],
  ['maxLotCoveragePct', 'Lot coverage', '%'],
  ['permitExemptUnderSqFt', 'No permit under', 'sq ft'],
];

export default function PermitCompliance({ town, state, proposal, onProposalChange }: {
  town?: string;
  state?: string;
  proposal: Proposal;
  onProposalChange: (p: Proposal) => void;
}) {
  const [juris, setJuris] = useState<Jurisdiction | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [variance, setVariance] = useState<VarianceApplication | null>(null);

  const townKey = (town || '').trim();
  const stateKey = (state || 'NH').trim().toUpperCase();

  /**
   * Load whatever we already know about this town.
   *
   * Keyed by town and state rather than by project, which is the whole point —
   * the twenty minutes spent on Salem is spent once and repays itself on every
   * Salem job after it.
   */
  const load = useCallback(async () => {
    if (!townKey) { setJuris(null); return; }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${SERVER}/jurisdictions/${encodeURIComponent(stateKey)}/${encodeURIComponent(townKey)}`,
        { headers: { Authorization: `Bearer ${session?.access_token || ''}` } },
      );
      const data = await res.json().catch(() => null);
      setJuris(res.ok && data?.jurisdiction
        ? data.jurisdiction
        : blankJurisdiction(townKey, stateKey));
    } catch {
      setJuris(blankJurisdiction(townKey, stateKey));
    } finally {
      setLoading(false);
    }
  }, [townKey, stateKey]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!juris) return;
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const record: Jurisdiction = {
        ...juris,
        enteredBy: juris.enteredBy || session?.user?.email || undefined,
        enteredOn: new Date().toISOString().slice(0, 10),
      };
      const res = await fetch(`${SERVER}/jurisdictions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
        body: JSON.stringify({ jurisdiction: record }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) { toast.error(data?.error || 'That could not be saved.'); return; }
      setJuris(record);
      toast.success(`${record.town} saved. Every job here is checked against it from now on.`);
    } catch (err: any) {
      toast.error(err?.message || 'That could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const findings: Finding[] = useMemo(
    () => (juris ? checkProposal(juris, proposal) : []),
    [juris, proposal],
  );
  const broken = violations(findings);
  const unchecked = unknowns(findings);
  const criteria = criteriaFor(stateKey);

  const patch = (k: keyof Jurisdiction, v: any) =>
    setJuris(j => (j ? { ...j, [k]: v } : j));

  const patchProposal = (k: keyof Proposal, v: string) =>
    onProposalChange({ ...proposal, [k]: v === '' ? undefined : Number(v) });

  if (!townKey) {
    return (
      <div className={card}>
        <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <Landmark className="w-4 h-4 text-[#ea580c]" /> Town rules
        </h3>
        <p className="text-xs text-gray-500">
          Set the town on the site details and this will check the design against its
          setbacks, coverage and height — at design time rather than at the counter.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── the town record ── */}
      <div className={card}>
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Landmark className="w-4 h-4 text-[#ea580c]" /> {townKey}, {stateKey}
          </h3>
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" />}
        </div>
        <p className="text-xs text-gray-500 mb-3">
          {juris ? jurisdictionNote(juris) : 'Loading…'}
        </p>

        {juris && isStale(juris) && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-2.5 mb-3 flex items-start gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-200/90">
              These figures are {Math.floor((ageInDays(juris) || 0) / 365)} years old. Towns amend
              ordinances between filings and nothing announces it — worth a call before this
              decides a submission.
            </p>
          </div>
        )}

        {juris && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
              {NUM_FIELDS.map(([key, label, unit]) => {
                const v = juris[key] as number | undefined;
                return (
                  <label key={String(key)} className="text-[11px] text-gray-500">
                    {label} <span className="text-gray-600">({unit})</span>
                    <input type="number" step="any"
                      value={v === undefined || v === null ? '' : String(v)}
                      placeholder="not entered"
                      onChange={e => patch(key, e.target.value === '' ? undefined : Number(e.target.value))}
                      className={`${tiny} w-full mt-0.5 ${
                        v === undefined || v === null ? 'border-amber-500/30' : ''}`} />
                  </label>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
              <label className="text-[11px] text-gray-500">
                Where this came from
                <select value={juris.source}
                  onChange={e => patch('source', e.target.value as RuleSource)}
                  className={`${tiny} w-full mt-0.5`}>
                  {(Object.keys(SOURCE_LABEL) as RuleSource[]).map(s => (
                    <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
                  ))}
                </select>
              </label>
              <label className="text-[11px] text-gray-500">
                Fee
                <input value={juris.feeNote || ''} placeholder="$75 + $6 per $1000"
                  onChange={e => patch('feeNote', e.target.value)} className={`${tiny} w-full mt-0.5`} />
              </label>
              <label className="text-[11px] text-gray-500">
                How they take it
                <input value={juris.submissionNote || ''} placeholder="in person, 3 sets"
                  onChange={e => patch('submissionNote', e.target.value)} className={`${tiny} w-full mt-0.5`} />
              </label>
            </div>

            <button onClick={save} disabled={saving}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 disabled:opacity-40"
              style={{ background: '#ea580c' }}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save {townKey} — every job here uses it
            </button>
          </>
        )}
      </div>

      {/* ── this design's numbers ── */}
      <div className={card}>
        <h3 className="text-sm font-bold text-white mb-1">This design, measured</h3>
        <p className="text-xs text-gray-500 mb-3">
          Distances from the finished structure to each lot line. Anything left blank is
          reported as unchecked, never as passing.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {([
            ['toFrontFt', 'To front line (ft)'],
            ['toRearFt', 'To rear line (ft)'],
            ['toSideFt', 'To side line (ft)'],
            ['heightFt', 'Height (ft)'],
            ['lotSqFt', 'Lot area (sq ft)'],
            ['existingCoverageSqFt', 'Existing footprint'],
            ['addedCoverageSqFt', 'This adds (sq ft)'],
          ] as Array<[keyof Proposal, string]>).map(([k, label]) => (
            <label key={String(k)} className="text-[11px] text-gray-500">
              {label}
              <input type="number" step="any" placeholder="—"
                value={proposal[k] === undefined ? '' : String(proposal[k])}
                onChange={e => patchProposal(k, e.target.value)}
                className={`${tiny} w-full mt-0.5`} />
            </label>
          ))}
        </div>
      </div>

      {/* ── the verdict ── */}
      {findings.length > 0 && (
        <div className={card}>
          <h3 className="text-sm font-bold text-white mb-1">Against the ordinance</h3>
          <p className={`text-xs mb-3 ${broken.length ? 'text-red-300' : unchecked.length ? 'text-amber-200/85' : 'text-emerald-300/90'}`}>
            {complianceNote(findings)}
          </p>
          <ul className="space-y-1.5">
            {findings.map(f => (
              <li key={f.rule} className={`rounded-xl border p-2.5 ${
                f.status === 'violates' ? 'border-red-500/30 bg-red-500/[0.06]'
                  : f.status === 'passes' ? 'border-emerald-500/25 bg-emerald-500/[0.04]'
                  : 'border-amber-500/25 bg-amber-500/[0.04]'}`}>
                <div className="flex items-start gap-2">
                  {f.status === 'violates' ? <X className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    : f.status === 'passes' ? <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    : <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-semibold text-white">{f.rule}</span>
                      {f.required && (
                        <span className="text-[10px] text-gray-500 shrink-0">
                          requires {f.required}{f.actual ? ` · ${f.actual}` : ''}
                        </span>
                      )}
                    </div>
                    {f.remedy && <p className="text-[11px] text-red-200/90 mt-0.5">{f.remedy}</p>}
                    {f.needs && <p className="text-[11px] text-amber-200/80 mt-0.5">Not checked — {f.needs}.</p>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── the variance ── */}
      {broken.length > 0 && juris && (
        <div className={card}>
          <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#ea580c]" /> A variance, if you are not reducing it
          </h3>

          {!criteria ? (
            <p className="text-xs text-amber-200/85">
              We carry the statutory tests for New Hampshire only. {stateKey} boards apply
              different criteria and this will not invent them — get the list from the board
              rather than working from the wrong five.
            </p>
          ) : !variance ? (
            <>
              <p className="text-xs text-gray-500 mb-3">
                A {stateKey} board applies five tests from RSA 674:33 and takes each in turn.
                An application answering all five gets heard; one that misses any gets continued.
              </p>
              <button
                onClick={() => setVariance({
                  jurisdictionId: juris.id,
                  reliefSought: reliefFrom(findings),
                  answers: criteria.map(c => ({ criterionId: c.id, answer: '' })),
                })}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                style={{ background: '#ea580c' }}>
                Start the variance application
              </button>
            </>
          ) : (
            <>
              <div className="rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] p-2.5 mb-3">
                <p className="text-[11px] font-semibold text-gray-400 mb-1">Relief sought</p>
                {variance.reliefSought.map((r, i) => (
                  <p key={i} className="text-[11px] text-gray-300">{r}</p>
                ))}
              </div>

              <div className="space-y-2.5">
                {criteria.map((c, i) => (
                  <div key={c.id}>
                    <p className="text-xs font-semibold text-white">{i + 1}. {c.test}</p>
                    <p className="text-[10px] text-gray-500 mb-1">{c.plain}</p>
                    <textarea rows={2}
                      value={variance.answers.find(a => a.criterionId === c.id)?.answer || ''}
                      onChange={e => setVariance(v => v && ({
                        ...v,
                        answers: v.answers.map(a =>
                          a.criterionId === c.id ? { ...a, answer: e.target.value } : a),
                      }))}
                      className="w-full px-2.5 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-xs focus:outline-none focus:border-[#ea580c] resize-y" />
                  </div>
                ))}
              </div>

              {(() => {
                const gaps = varianceGaps(variance, criteria);
                return gaps.length > 0 ? (
                  <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.05] p-2.5">
                    {gaps.map((g, i) => (
                      <p key={i} className="text-[11px] text-amber-200/85 flex items-start gap-1.5">
                        <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />{g}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-[11px] text-emerald-300/90 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> All five answered. Ready to type onto the town's form.
                  </p>
                );
              })()}
            </>
          )}
        </div>
      )}
    </div>
  );
}
