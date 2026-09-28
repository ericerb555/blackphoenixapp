/**
 * The quote, laid out as the customer will see it.
 *
 * WHAT A CUSTOMER MUST NEVER SEE ON THIS PAGE
 *
 * A quote record carries `subQuotes` — the subcontractor and vendor quotes
 * folded into it — and each holds `baseAmount`, described in its own type as
 * "what THEY quoted us (raw, unmarked)", alongside `markupPct`. That is the
 * company's cost and the company's margin on a single line.
 *
 * It is deliberately NOT rendered, and this comment exists so nobody adds it
 * later thinking the document looks incomplete. Eric's rule is that a customer
 * sees a vendor's own pricing and never the rate we negotiated, because that
 * rate reveals the margin. `designMaterials` is left out for the same reason —
 * an internal extract from the design tool, not a priced line anyone agreed to.
 *
 * What the customer agreed to is `items`, and that is what this shows. A test
 * in `tests/quoteMath.test.ts` asserts neither figure reaches the PDF payload.
 *
 * CREDITS ARE SHOWN, NOT NETTED AWAY
 *
 * A line can be a credit — the homeowner bought their own flooring and we
 * installed it. The record models that as `kind: 'credit'` rather than a
 * negative rate, so it reads as a credit a year later instead of looking like
 * a typo. The document keeps that distinction visible.
 */
import { companyInfo } from '../../lib/config/companyInfo';
import {
  type QuoteDoc,
  formatDate, money, lineAmount, isCredit, quoteTotals,
} from './quoteMath';

export type { QuoteDoc, QuoteLine } from './quoteMath';
export { quoteTotals, quoteToPDFData } from './quoteMath';

const STATUS_STYLE: Record<string, string> = {
  approved: 'border-green-500/40 bg-green-500/10 text-green-400',
  rejected: 'border-red-500/40 bg-red-500/10 text-red-400',
  sent: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
  viewed: 'border-blue-500/40 bg-blue-500/10 text-blue-400',
  paid: 'border-green-500/40 bg-green-500/10 text-green-400',
  draft: 'border-gray-500/40 bg-gray-500/10 text-gray-400',
};

export default function QuoteDocument({ quote }: { quote: QuoteDoc }) {
  const items = Array.isArray(quote.items) ? quote.items : [];
  const { subtotal, tax, total } = quoteTotals(quote);
  const status = String(quote.status || 'draft');
  const issued = formatDate(quote.issueDate) || formatDate(quote.createdAt);
  const validUntil = formatDate(quote.dueDate);
  const heading = quote.type === 'invoice' ? 'INVOICE' : 'ESTIMATE';

  return (
    <div
      className="p-8 bg-[#0A0A0A] text-white print:bg-white print:text-black print:p-0"
      id="quote-content"
    >
      <div className="mb-8 border-b-2 border-[#2A2A2A] pb-6 print:border-gray-200">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-white print:text-black">{companyInfo.name}</h1>
            <p className="mt-2 text-sm text-gray-400 print:text-gray-600">{companyInfo.contact.email}</p>
            <p className="text-sm text-gray-400 print:text-gray-600">{companyInfo.contact.phone}</p>
            <p className="text-sm text-gray-400 print:text-gray-600">{companyInfo.contact.website}</p>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-bold tracking-wide text-orange-500">{heading}</h2>
            {quote.number && (
              <p className="mt-1 text-lg font-semibold text-white print:text-black">{quote.number}</p>
            )}
            <span
              className={`mt-3 inline-block rounded-full border px-3 py-1 text-xs font-bold uppercase ${
                STATUS_STYLE[status] || STATUS_STYLE.draft
              }`}
            >
              {status}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase text-gray-500">Prepared for</h3>
          <p className="font-semibold text-white print:text-black">{quote.clientName || 'Not assigned'}</p>
          {quote.clientEmail && <p className="text-sm text-gray-400 print:text-gray-600">{quote.clientEmail}</p>}
          {quote.clientPhone && <p className="text-sm text-gray-400 print:text-gray-600">{quote.clientPhone}</p>}
          {quote.clientAddress && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-400 print:text-gray-600">{quote.clientAddress}</p>
          )}
        </div>
        <div className="sm:text-right">
          {issued && (
            <div className="mb-2">
              <p className="text-xs font-bold uppercase text-gray-500">Issued</p>
              <p className="text-sm text-white print:text-black">{issued}</p>
            </div>
          )}
          {validUntil && (
            <div>
              <p className="text-xs font-bold uppercase text-gray-500">Valid until</p>
              <p className="text-sm text-white print:text-black">{validUntil}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mb-8">
        <h3 className="mb-3 text-xs font-bold uppercase text-gray-500">Scope of work</h3>
        {items.length === 0 ? (
          <p className="rounded-lg border border-[#2A2A2A] p-4 text-sm text-gray-500 print:border-gray-300">
            No line items on this quote yet.
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-[#2A2A2A] bg-[#1A1A1A] print:border-gray-300 print:bg-gray-100">
                <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-300 print:text-gray-700">#</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-300 print:text-gray-700">Description</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-300 print:text-gray-700">Qty</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-300 print:text-gray-700">Rate</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase text-gray-300 print:text-gray-700">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((line, index) => (
                <tr key={line.id || index} className="border-b border-[#2A2A2A] print:border-gray-200">
                  <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                  <td className="px-4 py-3 text-sm text-white print:text-black">
                    {line.description || '—'}
                    {isCredit(line) && (
                      <span className="ml-2 rounded border border-green-500/40 bg-green-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-green-400">
                        Credit
                      </span>
                    )}
                    {line.reason && <span className="block text-xs text-gray-500">{line.reason}</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-300 print:text-gray-700">
                    {Number(line.qty) || 0}
                  </td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums text-gray-300 print:text-gray-700">
                    {money(Number(line.rate) || 0)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-white print:text-black">
                    {isCredit(line) ? `−${money(lineAmount(line))}` : money(lineAmount(line))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mb-8 flex justify-end">
        <div className="w-full sm:w-72">
          <div className="flex justify-between border-b border-[#2A2A2A] py-2 text-sm print:border-gray-200">
            <span className="text-gray-400 print:text-gray-600">Subtotal</span>
            <span className="tabular-nums text-white print:text-black">{money(subtotal)}</span>
          </div>
          {Number(quote.taxRate) > 0 && (
            <div className="flex justify-between border-b border-[#2A2A2A] py-2 text-sm print:border-gray-200">
              <span className="text-gray-400 print:text-gray-600">Tax ({Number(quote.taxRate)}%)</span>
              <span className="tabular-nums text-white print:text-black">{money(tax)}</span>
            </div>
          )}
          <div className="flex justify-between py-3 text-lg font-bold">
            <span className="text-white print:text-black">Total</span>
            <span className="tabular-nums text-orange-500">{money(total)}</span>
          </div>
        </div>
      </div>

      {quote.notes && (
        <div className="mb-8">
          <h3 className="mb-2 text-xs font-bold uppercase text-gray-500">Notes</h3>
          <p className="whitespace-pre-wrap rounded-lg bg-white/[0.03] p-3 text-sm leading-6 text-gray-300 print:bg-gray-50 print:text-gray-700">
            {quote.notes}
          </p>
        </div>
      )}

      {/*
        The acceptance, shown because it is what makes this a record of an
        agreement rather than a price list. A customer who approved a quote and
        later asks what they agreed to should find it on the document.
      */}
      {quote.signature && (
        <div className="mb-8 rounded-lg border border-green-500/30 bg-green-500/5 p-4 print:border-gray-300 print:bg-gray-50">
          <h3 className="mb-1 text-xs font-bold uppercase text-green-400">Accepted</h3>
          <p className="text-sm text-white print:text-black">
            {String(quote.signature?.name || quote.signature?.signedBy || 'Signed')}
          </p>
          {formatDate(quote.signature?.signedAt || quote.signature?.date) && (
            <p className="text-xs text-gray-400 print:text-gray-600">
              {formatDate(quote.signature?.signedAt || quote.signature?.date)}
            </p>
          )}
        </div>
      )}

      <div className="border-t-2 border-[#2A2A2A] pt-8 text-center print:border-gray-200">
        <p className="mb-2 text-sm font-semibold text-white print:text-gray-900">
          Thank you for the opportunity to quote this work.
        </p>
        <p className="text-xs text-gray-400 print:text-gray-600">
          Questions about this estimate? Contact us at {companyInfo.contact.email} or {companyInfo.contact.phone}
        </p>
        <p className="mt-2 text-xs text-gray-500">{companyInfo.contact.website}</p>
      </div>
    </div>
  );
}
