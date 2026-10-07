/**
 * What priced this quote, said on screen for as long as the quote is open.
 *
 * WHY THIS EXISTS
 *
 * A quote built from a written description can come from three places, and
 * until this banner existed all three looked identical once a toast had faded:
 *
 *   estimator         the model's takeoff, repriced by the server against the
 *                     vendor catalogue and the company's own rates
 *   server-heuristic   the server's deterministic fallback, used when the model
 *                     or its key is unavailable — not repriced
 *   offline-demo      the local demo generator, used when the server could not
 *                     be reached at all. Demo figures.
 *
 * An offline-demo quote is complete, itemised, saved to the pipeline and the
 * quotes list, and perfectly sendable. The only thing that ever said so was a
 * transient toast. That is the fault this closes.
 *
 * WHY IT RENDERS THE SERVER'S SENTENCE RATHER THAN ONE OF ITS OWN
 *
 * `repriceEstimate` already writes a note that is careful not to overclaim —
 * it distinguishes the company's own figures from standard trade rates, and
 * says outright when none of a quote is the company's own yet. Paraphrasing it
 * here would mean two wordings of the same truth, and the one on the screen
 * would be the one nobody was checking. So the note is rendered as written.
 *
 * WHY THE PADDING IS INLINE
 *
 * `p-*` and `m-*` compute to 0px application-wide — see the note at the top of
 * globals.css, which is a deliberate decision rather than a bug. `gap-*` works.
 */

import { useState } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';

export interface QuotePricingBasis {
  pricingBasis?: 'estimator' | 'server-heuristic' | 'offline-demo';
  priceSummary?: {
    note?: string;
    confidence?: number;
    onYourFigures?: number;
    settingsAreStandard?: boolean;
  } | null;
}

interface Props {
  quote?: QuotePricingBasis | null;
}

export function QuotePricingBasisBanner({ quote }: Props) {
  const [dismissed, setDismissed] = useState(false);

  const basis = quote?.pricingBasis;
  // A quote from before this field existed says nothing rather than guessing at
  // a basis it has no record of.
  if (!basis || dismissed) return null;

  const note = quote?.priceSummary?.note?.trim() || '';

  const tone =
    basis === 'offline-demo'
      ? {
          border: 'border-red-500/60',
          bg: 'bg-[#2A0A0A]',
          text: 'text-red-200',
          icon: <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />,
          heading: 'Demo figures — not priced from your catalogue or rates',
          body:
            'The estimator could not be reached, so this quote was built by the local demo generator. ' +
            'Every price in it is an example. Reprice it before it goes to a customer.',
        }
      : basis === 'server-heuristic'
      ? {
          border: 'border-amber-500/60',
          bg: 'bg-[#2A1E05]',
          text: 'text-amber-100',
          icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
          heading: 'Built by the fallback estimator',
          body:
            'The model was unavailable, so this is the server’s deterministic estimate. ' +
            'It was not repriced against your vendor catalogue or your saved rates.',
        }
      : {
          border: 'border-[#2A2A2A]',
          bg: 'bg-[#0F0F0F]',
          text: 'text-gray-300',
          icon: <Info className="w-4 h-4 text-orange-400 shrink-0" />,
          heading: 'Where these numbers come from',
          // The server's own sentence when it sent one. When repricing failed
          // the route sends none, and saying so is better than implying the
          // quote was priced from real figures.
          body:
            note ||
            'This quote was not repriced against your catalogue or rates, so its prices are the estimator’s own.',
        };

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[80] border-b ${tone.border} ${tone.bg} shadow-lg`}
      style={{ padding: '10px 16px' }}
      role={basis === 'estimator' ? 'status' : 'alert'}
    >
      <div className="flex items-start gap-3" style={{ margin: '0 auto', maxWidth: '1100px' }}>
        {tone.icon}
        <div className="flex-1" style={{ minWidth: 0 }}>
          <div className={`text-sm font-bold ${tone.text}`}>{tone.heading}</div>
          <div className="text-xs text-gray-400" style={{ marginTop: '2px' }}>
            {tone.body}
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-500 hover:text-gray-300 shrink-0"
          aria-label="Hide this notice"
          title="Hide this notice"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default QuotePricingBasisBanner;
