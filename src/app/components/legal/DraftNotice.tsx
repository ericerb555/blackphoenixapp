/**
 * The banner that stops a draft being mistaken for a contract.
 *
 * Eric asked for a Master Service Agreement and a Data Processing Agreement.
 * Both are real contracts with liability and statutory consequences, and both
 * were written here by software rather than by a lawyer. That is useful — a
 * solicitor reviewing a draft grounded in what this platform actually does is
 * far cheaper and faster than one starting from a blank page — and it is only
 * safe while nobody can mistake the one for the other.
 *
 * SO IT IS LOUD, AND IT IS AT THE TOP
 *
 * Not a footnote, not grey text at the bottom. The failure this prevents is
 * somebody in a hurry sending the page to a client who signs it, and that
 * person will not scroll to find a disclaimer.
 *
 * Shared between both documents so the two cannot drift — one of them
 * quietly losing its warning is exactly how this goes wrong.
 */
import { AlertTriangle } from 'lucide-react';

interface Props {
  /** What this document is, in a few words. */
  what: string;
  /** What specifically needs a qualified eye on it. */
  review: string[];
}

export default function DraftNotice({ what, review }: Props) {
  return (
    <div
      className="rounded-xl"
      style={{ padding: '18px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.45)' }}
    >
      <p className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-red-400">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" /> Draft — not in force
      </p>
      <p className="mt-2 text-sm leading-relaxed text-gray-200">
        This {what} has <strong className="text-white">not been reviewed by a lawyer</strong> and
        is not a contract. Do not send it to a client, do not sign it, and do not rely on it.
        It exists so that a qualified reviewer has something concrete and accurate to work from
        instead of a blank page.
      </p>
      <p className="mt-3 text-xs font-bold text-red-300">Particularly needing a qualified eye:</p>
      <ul className="mt-1 list-disc pl-5 space-y-1">
        {review.map((item) => (
          <li key={item} className="text-xs leading-relaxed text-gray-400">{item}</li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        The factual parts — what the software does, who receives data, how estimates and change
        orders work — are accurate as of the date below and were taken from the code rather than
        assumed. The legal consequences of saying so are what needs checking.
      </p>
    </div>
  );
}
