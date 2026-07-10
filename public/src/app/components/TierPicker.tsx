/**
 * TierPicker — used inside portal work request flows and the plan tracker log-hours modal.
 * Fetches tier config from server and lets the user pick a tier level.
 * Shows tier label, rate, and description. Calls onChange with selected tier ID + rate.
 */
import { useState, useEffect } from 'react';
import { TIER_STYLES, type TechTier } from './TechRosterManager';
import { projectId, publicAnonKey } from '../utils/supabase/info';

const SERVER = `https://${projectId}.supabase.co/functions/v1/make-server-57095a78`;

// Fallback if server unavailable
const FALLBACK_TIERS: TechTier[] = [
  { id: 'A', label: 'Tier A — Elite Master',       description: 'Licensed master tradesperson, 10+ yrs, all certifications', hourlyRate: 125, color: 'gold' },
  { id: 'B', label: 'Tier B — Senior Journeyman',  description: 'Journeyman license, 5–10 yrs, specialty-certified',        hourlyRate: 95,  color: 'silver' },
  { id: 'C', label: 'Tier C — Standard Tech',      description: 'Experienced tradesperson, 2–5 yrs',                        hourlyRate: 75,  color: 'blue' },
  { id: 'D', label: 'Tier D — Apprentice',          description: 'Entry-level, supervised work only',                        hourlyRate: 55,  color: 'green' },
];

interface Props {
  value?: string;             // selected tier ID
  onChange: (tierId: string, hourlyRate: number) => void;
  hours?: number;             // if provided, shows cost preview
  label?: string;             // override label above picker
  compact?: boolean;          // compact mode — pills instead of cards
}

export default function TierPicker({ value, onChange, hours, label, compact = false }: Props) {
  const [tiers, setTiers] = useState<TechTier[]>(FALLBACK_TIERS);

  useEffect(() => {
    fetch(`${SERVER}/tech-tiers/config`, { headers: { Authorization: `Bearer ${publicAnonKey}` } })
      .then(r => r.json())
      .then(d => { if (d.tiers?.length) setTiers(d.tiers); })
      .catch(() => {});
  }, []);

  const selected = tiers.find(t => t.id === value);

  if (compact) {
    return (
      <div className="space-y-2">
        {label && <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</label>}
        <div className="flex flex-wrap gap-2">
          {tiers.map(tier => {
            const styles = TIER_STYLES[tier.id] || TIER_STYLES.C;
            const sel = value === tier.id;
            return (
              <button key={tier.id} onClick={() => onChange(tier.id, tier.hourlyRate)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                  sel
                    ? `${styles.border} ${styles.bg} ring-2 ring-offset-1 ring-offset-[#1A1A1A] ring-orange-500`
                    : 'border-[#2A2A2A] bg-[#0A0A0A] text-gray-500 hover:border-gray-600 hover:text-gray-300'
                }`}>
                <span className={`font-black ${sel ? styles.text : ''}`}>{tier.id}</span>
                <span className={sel ? styles.text : ''}>${tier.hourlyRate}/hr</span>
              </button>
            );
          })}
        </div>
        {selected && (
          <p className="text-xs text-gray-500">{selected.label} — {selected.description}</p>
        )}
        {selected && hours && hours > 0 && (
          <p className="text-xs font-semibold text-orange-400">
            Estimated: {hours}h × ${selected.hourlyRate}/hr = <span className="text-white">${(hours * selected.hourlyRate).toFixed(2)}</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {label && <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</label>}
      <div className="grid grid-cols-2 gap-3">
        {tiers.map(tier => {
          const styles = TIER_STYLES[tier.id] || TIER_STYLES.C;
          const sel = value === tier.id;
          return (
            <button key={tier.id} onClick={() => onChange(tier.id, tier.hourlyRate)}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                sel
                  ? `${styles.border} ${styles.bg} ring-2 ring-offset-1 ring-offset-[#1A1A1A] ring-orange-500`
                  : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-gray-600'
              }`}>
              <div className="flex items-center justify-between mb-2">
                <div className={`w-9 h-9 rounded-lg ${styles.bg} border ${styles.border} flex items-center justify-center`}>
                  <span className={`text-base font-black ${styles.text}`}>{tier.id}</span>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-black ${sel ? styles.text : 'text-white'}`}>${tier.hourlyRate}</p>
                  <p className="text-xs text-gray-500">per hour</p>
                </div>
              </div>
              <p className={`text-xs font-semibold mb-1 ${sel ? styles.text : 'text-gray-300'}`}>
                {tier.label}
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">{tier.description}</p>
              {sel && hours && hours > 0 && (
                <div className={`mt-2 pt-2 border-t ${styles.border}`}>
                  <p className={`text-xs font-semibold ${styles.text}`}>
                    {hours}h × ${tier.hourlyRate} = ${(hours * tier.hourlyRate).toFixed(2)}
                  </p>
                </div>
              )}
            </button>
          );
        })}
      </div>
      {!value && (
        <p className="text-xs text-gray-600 text-center">Select a tier to see estimated cost</p>
      )}
    </div>
  );
}
