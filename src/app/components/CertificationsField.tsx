/**
 * Licences and tickets, with dates rather than as a paragraph.
 *
 * WHY THIS IS NOT A TEXTAREA
 *
 * It was one: "Certifications (if any)", placeholder "EPA 608, OSHA 10, etc.".
 * That tells a reviewer which words the applicant typed and nothing about
 * whether any of them is still valid — and for several of these, sending
 * somebody to do the work on a lapsed ticket is a compliance problem, not an
 * administrative one. A licence number and an expiry date are the two facts
 * that make the claim checkable, so they are asked for as fields.
 *
 * Anything not on the list is still capturable: "Something else" takes a free
 * text name and keeps the number and expiry alongside it, so an unusual ticket
 * is recorded properly instead of being squeezed into a notes box.
 */

import { useState } from 'react';
import { Plus, Trash2, AlertTriangle, Clock } from 'lucide-react';
import {
  CERTIFICATION_TYPES, isLapsed, expiresSoon, certificationLabel,
  type CertificationEntry,
} from '../lib/technicianSkills';

const OTHER = '__other__';

interface CertificationsFieldProps {
  value: CertificationEntry[] | undefined;
  onChange: (value: CertificationEntry[]) => void;
}

export default function CertificationsField({ value, onChange }: CertificationsFieldProps) {
  const [entries, setEntries] = useState<CertificationEntry[]>(value || []);

  const commit = (next: CertificationEntry[]) => {
    setEntries(next);
    onChange(next);
  };

  const add = () => commit([...entries, { typeId: '', number: '', state: '', expiresOn: '' }]);
  const remove = (index: number) => commit(entries.filter((_, i) => i !== index));
  const update = (index: number, patch: Partial<CertificationEntry>) =>
    commit(entries.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Add every licence, certification or ticket you hold. Leave the expiry blank
        if it does not expire.
      </p>

      {entries.length === 0 && (
        <p className="text-sm text-gray-500">
          None added. If you hold none, that is a perfectly normal answer — leave this empty.
        </p>
      )}

      {entries.map((entry, index) => {
        const known = CERTIFICATION_TYPES.find((type) => type.id === entry.typeId);
        const lapsed = isLapsed(entry);
        const soon = expiresSoon(entry);

        return (
          <div
            key={index}
            className={`border rounded-xl p-4 ${lapsed ? 'border-red-500/40 bg-red-500/5' : 'border-white/10 bg-black/30'}`}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor={`cert-type-${index}`}>
                  Certification <span className="text-[#ea580c]">*</span>
                </label>
                <select
                  id={`cert-type-${index}`}
                  value={entry.typeId}
                  onChange={(event) => update(index, { typeId: event.target.value, otherLabel: '' })}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ea580c]"
                >
                  <option value="">Select…</option>
                  {CERTIFICATION_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                  <option value={OTHER}>Something else…</option>
                </select>
                {known?.note && <p className="mt-1 text-xs text-gray-500">{known.note}</p>}
              </div>
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label="Remove this certification"
                className="mt-8 p-2 text-gray-400 hover:text-red-300 hover:bg-white/5 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {entry.typeId === OTHER && (
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor={`cert-other-${index}`}>
                  What is it called? <span className="text-[#ea580c]">*</span>
                </label>
                <input
                  id={`cert-other-${index}`}
                  type="text"
                  value={entry.otherLabel || ''}
                  onChange={(event) => update(index, { otherLabel: event.target.value })}
                  placeholder="e.g. Manufacturer boiler certification"
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ea580c]"
                />
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor={`cert-number-${index}`}>
                  Number
                </label>
                <input
                  id={`cert-number-${index}`}
                  type="text"
                  value={entry.number || ''}
                  onChange={(event) => update(index, { number: event.target.value })}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ea580c]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor={`cert-state-${index}`}>
                  Issuing state
                </label>
                <input
                  id={`cert-state-${index}`}
                  type="text"
                  value={entry.state || ''}
                  onChange={(event) => update(index, { state: event.target.value })}
                  placeholder="NH"
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ea580c]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor={`cert-expiry-${index}`}>
                  Expires
                </label>
                <input
                  id={`cert-expiry-${index}`}
                  type="date"
                  value={entry.expiresOn || ''}
                  onChange={(event) => update(index, { expiresOn: event.target.value })}
                  disabled={Boolean(known?.neverExpires)}
                  className={`w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ea580c] ${known?.neverExpires ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                {known?.neverExpires && <p className="mt-1 text-xs text-gray-500">Does not expire.</p>}
              </div>
            </div>

            {lapsed && (
              <p className="mt-3 flex items-start gap-2 text-sm text-red-300">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  {certificationLabel(entry)} has expired. Add the renewal date if you have
                  renewed it — we cannot count a lapsed ticket.
                </span>
              </p>
            )}
            {soon && (
              <p className="mt-3 flex items-start gap-2 text-sm text-amber-300">
                <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Expires within 90 days.</span>
              </p>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={add}
        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-semibold transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add a certification
      </button>
    </div>
  );
}

/** The entries that actually name something, for validation and reading back. */
export function namedCertifications(value: any): CertificationEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry: any) => entry && (entry.typeId && entry.typeId !== OTHER ? true : Boolean(entry.otherLabel)));
}
