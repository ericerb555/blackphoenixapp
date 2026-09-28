/**
 * The contract, laid out as a document rather than as a field dump.
 *
 * WHAT IT REPLACES
 *
 * In the customer portal a contract was `contract.terms` dropped into a `<p>`
 * with `whitespace-pre-wrap` — raw text in a box, no parties, no reference, no
 * signature block, no way to print it. It is the document people most need a
 * copy of, precisely because they signed it.
 *
 * WHY THE SIGNATURE BLOCK IS THE POINT
 *
 * Everything above it is what was agreed; the block is the evidence that it was
 * agreed, and by whom. It states the name, the address it was signed from, the
 * moment, and HOW — a typed name in the portal is a real signature but a
 * particular kind, and anybody relying on this later should see what was
 * actually captured rather than have to assume.
 *
 * WHY EVERY FIELD IS GUARDED
 *
 * The create route stores whatever it is sent, with no schema, and there were
 * zero contracts in production when this was written — so there is no real
 * example to generalise from. Anything absent is omitted rather than rendered
 * as "undefined" on a document somebody files.
 */
import { companyInfo } from '../../lib/config/companyInfo';
import { formatDate, money } from './quoteMath';
import {
  type ContractDoc,
  isSigned, signerName, signerEmail, signedDate, signatureMethodLabel,
  contractParty, contractAmount, contractBody, contractTitle, contractReference,
} from './contractMath';

export type { ContractDoc } from './contractMath';

export default function ContractDocument({ contract }: { contract: ContractDoc }) {
  const party = contractParty(contract);
  const amount = contractAmount(contract);
  const body = contractBody(contract);
  const signed = isSigned(contract);
  const reference = contractReference(contract);
  const created = formatDate(contract.createdAt);
  const signedOn = formatDate(signedDate(contract));
  const method = signatureMethodLabel(contract);

  return (
    <div
      className="p-8 bg-[#0A0A0A] text-white print:bg-white print:text-black print:p-0"
      id="contract-content"
    >
      <div className="mb-8 border-b-2 border-[#2A2A2A] pb-6 print:border-gray-200">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-white print:text-black">{companyInfo.name}</h1>
            <p className="mt-2 text-sm text-gray-400 print:text-gray-600">{companyInfo.legalName}</p>
            <p className="text-sm text-gray-400 print:text-gray-600">{companyInfo.contact.email}</p>
            <p className="text-sm text-gray-400 print:text-gray-600">{companyInfo.contact.phone}</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold tracking-wide text-orange-500">CONTRACT</h2>
            {reference && (
              <p className="mt-1 text-sm font-semibold text-white print:text-black">{reference}</p>
            )}
            <span
              className={`mt-3 inline-block rounded-full border px-3 py-1 text-xs font-bold uppercase ${
                signed
                  ? 'border-green-500/40 bg-green-500/10 text-green-400'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-400'
              }`}
            >
              {signed ? 'Signed' : 'Awaiting signature'}
            </span>
          </div>
        </div>
      </div>

      <h3 className="mb-6 text-xl font-bold text-white print:text-black">{contractTitle(contract)}</h3>

      <div className="mb-8 grid gap-6 sm:grid-cols-2">
        <div>
          <h4 className="mb-2 text-xs font-bold uppercase text-gray-500">Between</h4>
          <p className="font-semibold text-white print:text-black">{companyInfo.legalName}</p>
          <p className="text-sm text-gray-400 print:text-gray-600">{companyInfo.address.line1}</p>
          <p className="text-sm text-gray-400 print:text-gray-600">
            {companyInfo.address.city}, {companyInfo.address.state} {companyInfo.address.zipCode}
          </p>
        </div>
        <div>
          <h4 className="mb-2 text-xs font-bold uppercase text-gray-500">And</h4>
          <p className="font-semibold text-white print:text-black">{party.name || 'Customer'}</p>
          {party.email && <p className="text-sm text-gray-400 print:text-gray-600">{party.email}</p>}
          {party.address && (
            <p className="whitespace-pre-wrap text-sm text-gray-400 print:text-gray-600">{party.address}</p>
          )}
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {created && (
          <div>
            <p className="text-xs font-bold uppercase text-gray-500">Dated</p>
            <p className="text-sm text-white print:text-black">{created}</p>
          </div>
        )}
        {amount !== null && (
          <div>
            <p className="text-xs font-bold uppercase text-gray-500">Contract value</p>
            <p className="text-sm font-bold text-orange-500">{money(amount)}</p>
          </div>
        )}
        {contract.quoteId && (
          <div>
            <p className="text-xs font-bold uppercase text-gray-500">From quote</p>
            <p className="text-sm text-white print:text-black">{contract.quoteId}</p>
          </div>
        )}
      </div>

      <div className="mb-8">
        <h4 className="mb-3 text-xs font-bold uppercase text-gray-500">Terms of agreement</h4>
        {body ? (
          <div className="whitespace-pre-wrap rounded-lg border border-[#2A2A2A] bg-white/[0.02] p-4 text-sm leading-7 text-gray-200 print:border-gray-300 print:bg-white print:text-black">
            {body}
          </div>
        ) : (
          /*
            Said rather than left blank. A contract with no terms is a fault
            worth seeing on the page, not an empty space a reader might take
            for a formatting problem.
          */
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-300 print:border-gray-300 print:bg-white print:text-black">
            No terms have been recorded on this contract.
          </p>
        )}
      </div>

      <div className="mb-8 grid gap-6 border-t-2 border-[#2A2A2A] pt-6 sm:grid-cols-2 print:border-gray-200">
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase text-gray-500">For {companyInfo.name}</h4>
          <div className="h-12 border-b border-[#2A2A2A] print:border-gray-400" />
          <p className="mt-2 text-xs text-gray-500">Authorised signature</p>
        </div>
        <div>
          <h4 className="mb-3 text-xs font-bold uppercase text-gray-500">Customer</h4>
          {signed ? (
            <>
              <p className="border-b border-[#2A2A2A] pb-2 text-lg font-semibold text-white print:border-gray-400 print:text-black">
                {signerName(contract) || party.name || 'Signed'}
              </p>
              <div className="mt-2 space-y-0.5 text-xs text-gray-400 print:text-gray-600">
                {signerEmail(contract) && <p>{signerEmail(contract)}</p>}
                {signedOn && <p>{signedOn}</p>}
                {method && <p className="italic">{method}</p>}
              </div>
            </>
          ) : (
            <>
              <div className="h-12 border-b border-[#2A2A2A] print:border-gray-400" />
              <p className="mt-2 text-xs text-gray-500">Not yet signed</p>
            </>
          )}
        </div>
      </div>

      <div className="border-t-2 border-[#2A2A2A] pt-6 text-center print:border-gray-200">
        <p className="text-xs text-gray-400 print:text-gray-600">
          {companyInfo.legalName} · {companyInfo.contact.email} · {companyInfo.contact.phone}
        </p>
        <p className="mt-1 text-xs text-gray-500">{companyInfo.contact.website}</p>
      </div>
    </div>
  );
}
