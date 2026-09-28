/**
 * The control that asks a technician what he is actually good at.
 *
 * WHY TRADE, LEVEL, YEARS AND TASKS ARE ONE CONTROL AND NOT TWO STEPS
 *
 * The plan had the named tasks as their own step after the trade ratings. That
 * cannot work: `GenericApplicationForm` renders each field in isolation and a
 * field is never handed another field's value, so a separate task step would
 * have had no way of knowing which trades the applicant had just claimed — it
 * would have had to show all sixty-odd tasks across twelve trades to everybody.
 *
 * Folding them together is also the better form. A trade opens, and its level,
 * its years and its tasks are answered while that trade is the thing being
 * thought about. Nothing is shown for a trade that was not claimed, so the form
 * grows to fit the person filling it in — which is what makes "every trade he
 * claims" (Eric's answer) affordable rather than a wall of checkboxes.
 *
 * WHAT IS STORED
 *
 * A map of tradeId to `TradeRating`, with the level under `declared`. Never
 * under a bare `level`: the name is the reminder that this is a claim awaiting
 * probation, and a reviewer writes `confirmed` separately.
 */

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  SKILL_LEVELS, TRADE_IDS, tradeLabel, tasksForTradeId, levelDisagreesWithYears,
  type SkillLevelId, type TradeRating,
} from '../lib/technicianSkills';

interface TradeRatingSelectorProps {
  value: Record<string, TradeRating> | undefined;
  onChange: (value: Record<string, TradeRating>) => void;
}

export default function TradeRatingSelector({ value, onChange }: TradeRatingSelectorProps) {
  const [ratings, setRatings] = useState<Record<string, TradeRating>>(value || {});

  const commit = (next: Record<string, TradeRating>) => {
    setRatings(next);
    onChange(next);
  };

  const toggleTrade = (tradeId: string, checked: boolean) => {
    const next = { ...ratings };
    if (checked) next[tradeId] = { tradeId, declared: 'beginner', years: 0, tasks: [] };
    else delete next[tradeId];
    commit(next);
  };

  const update = (tradeId: string, patch: Partial<TradeRating>) => {
    if (!ratings[tradeId]) return;
    commit({ ...ratings, [tradeId]: { ...ratings[tradeId], ...patch } });
  };

  const toggleTask = (tradeId: string, taskId: string) => {
    const current = ratings[tradeId];
    if (!current) return;
    const tasks = current.tasks || [];
    update(tradeId, {
      tasks: tasks.includes(taskId) ? tasks.filter((id) => id !== taskId) : [...tasks, taskId],
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Tick every trade you have worked in. For each one, tell us how long you have
        done <em>that</em> trade and which jobs you can take on your own.
      </p>

      {TRADE_IDS.map((tradeId) => {
        const rating = ratings[tradeId];
        const isChecked = Boolean(rating);
        const tasks = tasksForTradeId(tradeId);
        const mismatch = isChecked && levelDisagreesWithYears(rating.declared, rating.years);

        return (
          <div
            key={tradeId}
            className={`border rounded-xl p-4 transition-all ${
              isChecked ? 'border-[#ea580c] bg-[#ea580c]/5' : 'border-white/10 bg-black/30'
            }`}
          >
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(event) => toggleTrade(tradeId, event.target.checked)}
                className="w-5 h-5 mt-0.5 rounded border-white/20 bg-black/50 text-[#ea580c] focus:ring-[#ea580c] focus:ring-offset-0"
              />
              <div className="flex-1">
                <div className="font-medium text-white">{tradeLabel(tradeId)}</div>
                <div className="text-sm text-gray-400 mt-1">
                  {tasks.length} {tasks.length === 1 ? 'job type' : 'job types'} we price under this trade
                </div>
              </div>
            </label>

            {isChecked && (
              <div className="ml-8 mt-4 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor={`level-${tradeId}`}>
                      Level in {tradeLabel(tradeId)} <span className="text-[#ea580c]">*</span>
                    </label>
                    <select
                      id={`level-${tradeId}`}
                      value={rating.declared}
                      onChange={(event) => update(tradeId, { declared: event.target.value as SkillLevelId })}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ea580c]"
                    >
                      {SKILL_LEVELS.map((level) => (
                        <option key={level.id} value={level.id}>
                          {level.label} ({level.yearsLabel})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor={`years-${tradeId}`}>
                      Years in this trade <span className="text-[#ea580c]">*</span>
                    </label>
                    <input
                      id={`years-${tradeId}`}
                      type="number"
                      min={0}
                      max={60}
                      step={1}
                      value={Number.isFinite(rating.years) ? rating.years : 0}
                      onChange={(event) => update(tradeId, { years: Number(event.target.value) })}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ea580c]"
                    />
                  </div>
                </div>

                {/*
                  Not an error, and deliberately not blocking. Somebody with two
                  years who is genuinely quick may still be the right call, and
                  it is not this form's job to argue. It IS worth flagging while
                  he can still correct a slip, and worth surfacing to whoever
                  reads the application.
                */}
                {mismatch && (
                  <p className="flex items-start gap-2 text-sm text-amber-300">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>
                      The level and the years do not line up. Check both — we review
                      what you can actually do during probation either way.
                    </span>
                  </p>
                )}

                {tasks.length > 0 && (
                  <fieldset>
                    <legend className="block text-sm font-medium text-gray-300 mb-2">
                      Which of these can you do on your own?
                    </legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {tasks.map((task) => (
                        <label key={task.id} className="flex items-start gap-2 cursor-pointer text-sm">
                          <input
                            type="checkbox"
                            checked={(rating.tasks || []).includes(task.id)}
                            onChange={() => toggleTask(tradeId, task.id)}
                            className="w-4 h-4 mt-0.5 rounded border-white/20 bg-black/50 text-[#ea580c] focus:ring-[#ea580c] focus:ring-offset-0"
                          />
                          <span className="text-gray-200">{task.name}</span>
                        </label>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Leave a box unticked if you have only helped with it. Nobody is
                      expected to tick them all.
                    </p>
                  </fieldset>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** The trades actually claimed, for validation and for reading back. */
export function claimedTrades(value: any): TradeRating[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.values(value).filter((rating: any): rating is TradeRating => Boolean(rating?.tradeId));
}
