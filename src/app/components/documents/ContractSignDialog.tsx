/**
 * Signing a contract, with the contract actually in front of you.
 *
 * WHAT THIS REPLACES
 *
 * `window.prompt('Type your full legal name to sign this contract:')`. That is
 * a browser dialog: it cannot show the terms being agreed to, cannot be styled
 * or labelled, cannot be read by a screen reader in any useful order, and some
 * browsers suppress it outright — in which case the customer simply could not
 * sign and nothing would say why.
 *
 * It also asked for a signature while the agreement was somewhere behind the
 * dialog. Somebody typing their legal name into a grey box with no terms
 * visible is being asked to sign something they are not looking at.
 *
 * WHAT MAKES THIS A SIGNATURE RATHER THAN A TEXT BOX
 *
 * Three things, and all three are deliberate:
 *
 * The whole document is rendered here, scrollable, not an excerpt. The thing
 * being agreed to is present at the moment of agreeing.
 *
 * Acceptance is a separate, explicit act from typing a name. The server
 * requires `acceptTerms: true` and refuses without it, so this is not
 * decoration — but more to the point, a name typed into a field is not
 * assent, and a tick against "I have read and accept" is.
 *
 * What will be recorded is stated BEFORE signing, not after: the name, the
 * account it is signed from, the date, and the fact that it is a typed
 * electronic signature. Somebody should know what the record will say about
 * them while they can still decide not to.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 *
 * Check the typed name against the name on the account. A record spelled
 * "Rob" and a person who signs "Robert James Smith" are the same human, and
 * refusing that teaches people to type whatever the computer wants rather than
 * their actual legal name — which is worse evidence, not better.
 */
import { useState } from 'react';
import { X, FileCheck, Loader2, AlertTriangle } from 'lucide-react';
import ContractDocument from './ContractDocument';
import { type ContractDoc, contractTitle, contractReference } from './contractMath';

export interface ContractSignDialogProps {
  contract: ContractDoc | null;
  /** The account doing the signing, shown so it is not a surprise on the record. */
  signerEmail?: string;
  busy?: boolean;
  onClose: () => void;
  /** Called with the typed legal name once terms have been accepted. */
  onSign: (signatureName: string) => void;
}

export default function ContractSignDialog({
  contract, signerEmail, busy, onClose, onSign,
}: ContractSignDialogProps) {
  const [name, setName] = useState('');
  const [accepted, setAccepted] = useState(false);

  if (!contract) return null;

  const typed = name.trim();
  // Two words is not a legal test, it is a guard against a stray keystroke
  // being recorded as somebody's signature.
  const looksLikeAName = typed.length >= 3;
  const ready = accepted && looksLikeAName && !busy;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-[#2A2A2A] bg-[#1A1A1A]">
        <div className="flex items-center justify-between border-b border-[#2A2A2A] px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">Review and sign</h2>
            <p className="text-sm text-gray-400">
              {contractTitle(contract)}
              {contractReference(contract) ? ` · ${contractReference(contract)}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close without signing"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-[#2A2A2A]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* The agreement itself, in full. */}
        <div className="flex-1 overflow-y-auto bg-[#0A0A0A]">
          <ContractDocument contract={contract} />
        </div>

        <div className="space-y-4 border-t border-[#2A2A2A] px-6 py-5">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-orange-600"
            />
            <span className="text-sm text-gray-200">
              I have read the contract above and I accept its terms.
            </span>
          </label>

          <div>
            <label htmlFor="signature-name" className="mb-1 block text-xs font-bold uppercase text-gray-500">
              Your full legal name
            </label>
            <input
              id="signature-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="As you would sign it"
              autoComplete="name"
              className="w-full rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] px-3 py-2 text-white outline-none transition focus:border-orange-500"
            />
          </div>

          {/*
            Said before signing rather than discovered afterwards. This is what
            the record will show, and it is a particular kind of signature —
            worth knowing while there is still the option not to.
          */}
          <p className="flex gap-2 rounded-lg border border-[#2A2A2A] bg-white/[0.02] p-3 text-xs leading-5 text-gray-400">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
            <span>
              Signing records your typed name{signerEmail ? <>, the account <span className="text-gray-200">{signerEmail}</span></> : null},
              and the date and time, as an electronic signature. It cannot be
              undone from here — contact us if something needs changing.
            </span>
          </p>

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-[#2A2A2A] px-4 py-2 text-sm font-semibold text-gray-300 transition hover:bg-[#2A2A2A]"
            >
              Cancel
            </button>
            <button
              onClick={() => ready && onSign(typed)}
              disabled={!ready}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing…</>
                : <><FileCheck className="h-4 w-4" /> Sign this contract</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
