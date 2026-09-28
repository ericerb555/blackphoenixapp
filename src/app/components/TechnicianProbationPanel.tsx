/**
 * Where a technician's claimed ability becomes a found one.
 *
 * WHAT THIS IS FOR
 *
 * The application asks what somebody is good at, trade by trade, and every
 * answer on it is a claim. Eric settled how the claim gets tested: *"probation
 * period to review actual skills"* — ninety days, an administrator signing it
 * off, rather than a quiz before approval.
 *
 * So this is the other half of the trade profile. Without it the declared
 * levels would sit on the record forever looking like facts.
 *
 * WHY EACH TRADE IS JUDGED SEPARATELY
 *
 * Because a person is not one rating. A technician can come out Advanced in
 * carpentry and Beginner in the plumbing he claimed Novice at, and a single
 * pass/fail on the whole person throws away precisely the detail the redesign
 * was for. Each row is confirmed on its own, and raising or lowering a claim is
 * the normal case rather than an exception.
 *
 * WHY THE DECLARED VALUE STAYS ON SCREEN
 *
 * So the two can be compared. A technician who consistently claims one level
 * above what he is found at is telling you something useful about every future
 * application he sends, and that is only visible if the claim is not overwritten.
 */

import { useCallback, useEffect, useState } from 'react';
import { Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../utils/supabase/info';
import { supabase } from '../lib/supabase';
import { SKILL_LEVELS, tradeLabel, type SkillLevelId } from '../lib/technicianSkills';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-3eae23a6`;

interface ProbationTrade {
  tradeId: string;
  declared: string;
  declaredYears: number;
  declaredTasks: string[];
  confirmed: string | null;
  confirmedAt: string | null;
  confirmedBy: string | null;
  notes: string;
}

interface ProbationRecord {
  applicationId: string;
  technicianName: string;
  startedOn: string;
  reviewDueOn: string;
  outcome: 'in_progress' | 'passed' | 'extended' | 'not_passed';
  trades: ProbationTrade[];
  closedOn: string | null;
  closedBy: string | null;
  notes: string;
}

const OUTCOME_LABELS: Record<string, string> = {
  in_progress: 'In progress',
  passed: 'Passed',
  extended: 'Extended',
  not_passed: 'Not passed',
};

export default function TechnicianProbationPanel({ applicationId }: { applicationId: string }) {
  const [probation, setProbation] = useState<ProbationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const headers = useCallback(async (withContentType = false) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Sign in with an administrator account.');
    return {
      Authorization: `Bearer ${session.access_token}`,
      ...(withContentType ? { 'Content-Type': 'application/json' } : {}),
    };
  }, []);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const response = await fetch(`${API_BASE}/probation/${applicationId}`, { headers: await headers() });
        const data = await response.json().catch(() => ({}));
        if (!live) return;
        if (!data.success) throw new Error(data.error || 'Could not load the probation record.');
        setProbation(data.probation);
      } catch (loadError: any) {
        if (live) setError(loadError?.message || 'Could not load the probation record.');
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, [applicationId, headers]);

  const patch = async (body: any, successMessage: string) => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE}/probation/${applicationId}`, {
        method: 'PATCH',
        headers: await headers(true),
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || 'The change was not saved.');
      setProbation(data.probation);
      toast.success(successMessage);
    } catch (saveError: any) {
      toast.error(saveError?.message || 'The change was not saved.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-4 text-sm text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading probation…
      </div>
    );
  }

  if (error || !probation) {
    return (
      <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-4">
        <h3 className="text-lg font-semibold text-white mb-2">Probation</h3>
        <p className="text-sm text-gray-500">{error || 'No probation record for this application yet.'}</p>
        <p className="mt-2 text-xs text-gray-600">
          A probation record opens automatically when a technician application is approved.
        </p>
      </div>
    );
  }

  const overdue = probation.outcome === 'in_progress'
    && Boolean(probation.reviewDueOn)
    && new Date(probation.reviewDueOn).getTime() < Date.now();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="text-lg font-semibold text-white">Probation</h3>
        <span className={`rounded px-2 py-0.5 text-xs font-bold uppercase tracking-wide border ${
          probation.outcome === 'passed' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
            : probation.outcome === 'not_passed' ? 'border-red-500/40 bg-red-500/10 text-red-200'
            : probation.outcome === 'extended' ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
            : 'border-sky-500/40 bg-sky-500/10 text-sky-200'
        }`}>
          {OUTCOME_LABELS[probation.outcome] || probation.outcome}
        </span>
      </div>

      <div className="rounded-lg border border-[#2A2A2A] bg-[#0F0F0F] p-4">
        <p className="text-sm text-gray-400">
          Started {probation.startedOn} · Review due {probation.reviewDueOn}
          {probation.closedOn && <> · Closed {probation.closedOn} by {probation.closedBy}</>}
        </p>
        {overdue && (
          <p className="mt-2 flex items-start gap-2 text-sm text-amber-300">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>The review date has passed and probation is still open.</span>
          </p>
        )}

        <div className="mt-4 space-y-3">
          {probation.trades.length === 0 && (
            <p className="text-sm text-gray-500">
              This technician claimed no trades, so there is nothing to confirm. That
              usually means the application predates the trade profile.
            </p>
          )}

          {probation.trades.map(trade => (
            <div key={trade.tradeId} className="rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] p-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold text-white">{tradeLabel(trade.tradeId)}</span>
                <span className="text-sm text-gray-400">
                  claimed <strong className="text-gray-200">{levelName(trade.declared)}</strong>
                  {' '}· {trade.declaredYears} {trade.declaredYears === 1 ? 'year' : 'years'}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-gray-500">Confirmed:</span>
                {SKILL_LEVELS.map(level => (
                  <button
                    key={level.id}
                    type="button"
                    disabled={saving}
                    onClick={() => patch(
                      { trade: { tradeId: trade.tradeId, confirmed: level.id } },
                      `${tradeLabel(trade.tradeId)} confirmed as ${level.label}.`,
                    )}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition disabled:opacity-50 ${
                      trade.confirmed === level.id
                        ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
                        : 'border-[#2A2A2A] bg-[#0F0F0F] text-gray-400 hover:border-[#ea580c]/50'
                    }`}
                  >
                    {level.label}
                  </button>
                ))}
                {trade.confirmed && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => patch(
                      { trade: { tradeId: trade.tradeId, confirmed: null } },
                      `${tradeLabel(trade.tradeId)} set back to unconfirmed.`,
                    )}
                    className="rounded-lg border border-[#2A2A2A] px-3 py-1.5 text-sm text-gray-500 hover:text-gray-300 disabled:opacity-50"
                  >
                    Clear
                  </button>
                )}
              </div>

              {trade.confirmed
                ? (
                  <p className="mt-2 flex items-center gap-2 text-sm text-emerald-300">
                    <ShieldCheck className="w-4 h-4" />
                    {levelName(trade.confirmed)}
                    {trade.confirmed !== trade.declared && (
                      <span className="text-amber-300">
                        — {rankOf(trade.confirmed) > rankOf(trade.declared) ? 'better than' : 'below'} what he claimed
                      </span>
                    )}
                  </p>
                )
                : <p className="mt-2 text-sm text-amber-300/90">Not yet confirmed on real work.</p>}
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => patch({ outcome: 'passed' }, 'Probation closed as passed.')}
            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            Close as passed
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => patch({ outcome: 'extended' }, 'Probation extended by another 90 days.')}
            className="rounded-lg border border-amber-500/40 px-3 py-2 text-sm font-bold text-amber-200 disabled:opacity-50"
          >
            Extend 90 days
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => patch({ outcome: 'not_passed' }, 'Probation closed as not passed.')}
            className="rounded-lg border border-red-500/40 px-3 py-2 text-sm font-bold text-red-200 disabled:opacity-50"
          >
            Close as not passed
          </button>
          {probation.outcome !== 'in_progress' && (
            <button
              type="button"
              disabled={saving}
              onClick={() => patch({ outcome: 'in_progress' }, 'Probation reopened.')}
              className="rounded-lg border border-[#2A2A2A] px-3 py-2 text-sm font-semibold text-gray-400 disabled:opacity-50"
            >
              Reopen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const levelName = (id: string | null) => SKILL_LEVELS.find(level => level.id === id)?.label || 'Unrated';
const rankOf = (id: string | null) => ({ beginner: 1, novice: 2, advanced: 3 }[String(id) as SkillLevelId] || 0);
