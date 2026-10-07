/**
 * Asking before a quote with no real prices goes to a customer.
 *
 * WHAT THIS IS AND IS NOT
 *
 * It is not a block. Eric asked for "the option to send or not to", so the
 * quote is sendable and this is where the decision gets made with the reason
 * in front of him.
 *
 * It is also not the enforcement. `POST /quotes/:id/send-to-customer` refuses
 * an unpriced send that arrives without an explicit acknowledgement and
 * answers 409 `UNPRICED_QUOTE_NEEDS_ACKNOWLEDGEMENT`; this dialog is how that
 * acknowledgement is given. A dialog alone would be a prompt that anything
 * reaching the route could skip.
 *
 * WHY THE REASON IS A PROP RATHER THAN WRITTEN HERE
 *
 * The server knows which basis priced the quote and says so in its own words.
 * Composing a second sentence here would put two wordings of the same fact in
 * the product, and the one on the screen is the one nobody maintains. Same
 * decision as `QuotePricingBasisBanner`.
 *
 * Padding is inline: `p-*` computes to 0px application-wide, which is a
 * deliberate decision — see the note at the top of globals.css.
 */

import { AlertTriangle } from 'lucide-react';

interface Props {
  /** The server's own explanation of why this quote is not priced. */
  reason: string;
  customerName?: string;
  customerEmail?: string;
  /** True while the acknowledged send is in flight. */
  sending?: boolean;
  onCancel: () => void;
  onSendAnyway: () => void;
}

export function UnpricedSendDialog({
  reason,
  customerName,
  customerEmail,
  sending = false,
  onCancel,
  onSendAnyway,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-sm flex items-center justify-center"
      style={{ padding: '16px' }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="unpriced-send-heading"
    >
      <div
        className="w-full rounded-2xl border border-amber-500/50 bg-[#141414] shadow-2xl"
        style={{ maxWidth: '520px', padding: '20px' }}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" style={{ marginTop: '2px' }} />
          <div className="flex-1" style={{ minWidth: 0 }}>
            <h3 id="unpriced-send-heading" className="text-lg font-bold text-white">
              Send this without real prices?
            </h3>
            <p className="text-sm text-gray-300" style={{ marginTop: '8px' }}>
              {reason}
            </p>
            <p className="text-xs text-gray-500" style={{ marginTop: '8px' }}>
              {customerName ? `It will go to ${customerName}` : 'It will go to the customer'}
              {customerEmail ? ` at ${customerEmail}` : ''} as a quote they can approve. Who sent it
              and that it was unpriced will be recorded on the quote.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3" style={{ marginTop: '20px' }}>
          <button
            onClick={onCancel}
            className="rounded-lg border border-[#2A2A2A] text-sm font-bold text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
            style={{ padding: '10px 16px' }}
          >
            Don&apos;t send — let me price it
          </button>
          <button
            onClick={onSendAnyway}
            disabled={sending}
            className="rounded-lg bg-amber-600 hover:bg-amber-500 text-sm font-bold text-white transition-colors disabled:opacity-50"
            style={{ padding: '10px 16px' }}
          >
            {sending ? 'Sending…' : 'Send anyway'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UnpricedSendDialog;
