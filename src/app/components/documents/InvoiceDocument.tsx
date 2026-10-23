/**
 * The invoice, laid out as the customer will actually see it.
 *
 * WHY IT IS ITS OWN COMPONENT
 *
 * It was the body of `InvoicePreviewModal`, reachable only from the staff
 * invoices page. The customer portal had no way to view, print or save an
 * invoice at all — the people who most need a copy could not get one.
 *
 * Pulled out so ONE layout serves every surface: the portal, the pipeline's
 * invoice tab, and the staff preview. The alternative — a customer rendering
 * and an office rendering — means "what does the invoice say" has two answers,
 * and they drift the moment one is edited.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 *
 * Actions. No print button, no download, no email, no modal chrome. It renders
 * a document and nothing else, so it can sit inside a modal, a tab, or a print
 * view without carrying assumptions about any of them. The actions live in
 * `DocumentPreviewModal`.
 *
 * `id="invoice-content"` is load-bearing: the print stylesheet hides everything
 * on the page except this element and its children.
 */
import { Edit2 } from 'lucide-react';
import { companyInfo } from '../../lib/config/companyInfo';
import type { Invoice } from '../../lib/services/invoiceService';
import { groupLinesByPhase, hasPhaseStructure, lineAmount } from '../../lib/invoicePhases';
import { selectInvoiceLines, isLineShown } from '../../lib/invoiceLineSelection';

const formatDate = (dateString?: string) => {
  if (!dateString) return 'Not set';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const formatCurrency = (amount: number) =>
  `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface InvoiceDocumentProps {
  invoice: Invoice;
  /**
   * The one action that lives INSIDE the document rather than in the chrome
   * around it, because it belongs beside the line items it edits.
   *
   * Optional, and that is the whole point: the staff preview passes it and
   * keeps the button it has always had, while the customer portal passes
   * nothing and never sees it. It is already `print:hidden`, so it has never
   * appeared on a printed copy.
   */
  onEdit?: () => void;
  /**
   * Draw the customer's copy rather than the office's.
   *
   * Mostly belt and braces. A customer's invoice arrives through
   * `customerInvoiceView`, which has already removed the withheld lines
   * server side — a hidden line is not in their browser to be drawn. This
   * flag governs the other direction: on the OFFICE copy it is false, and
   * withheld lines are drawn and visibly marked, so whoever is reading a
   * printout knows which lines the customer never saw. Discussing a line
   * the customer has never heard of is its own kind of expensive.
   */
  forCustomer?: boolean;
}

export default function InvoiceDocument({ invoice, onEdit, forCustomer = false }: InvoiceDocumentProps) {
  /**
   * The lines, gathered under the phase of the job each belongs to.
   *
   * `process_steps` is the ordering authority when the invoice carries the
   * job's phases — it comes across from the quote — so the sections read in
   * the order the work actually happens rather than the order the lines were
   * typed. Without it the groups fall back to first-appearance order, which
   * is the best guess available.
   *
   * Lines with no phase, and invoices with no phases at all, come back as a
   * single group labelled "Line Items" with `phase: null`. `showPhaseHeadings`
   * is false in that case, so an old invoice renders exactly as it always did
   * rather than growing a pointless heading over its only section.
   */
  const allLines = (invoice as any)?.line_items || [];
  const selection = selectInvoiceLines(allLines, forCustomer);

  const phaseGroups = groupLinesByPhase(
    selection.lines,
    (invoice as any)?.process_steps || (invoice as any)?.processSteps || [],
  );
  const showPhaseHeadings = hasPhaseStructure(phaseGroups);

  /**
   * A PHASE SUBTOTAL COUNTS THE LINES THAT ARE NOT SHOWN.
   *
   * `groupLinesByPhase` sums whatever it was handed, which is the drawn
   * lines — so on a copy with anything hidden every phase would be short by
   * exactly the hidden amount, and the sections would stop adding up to the
   * total the customer is being asked to pay. People add up invoices, and
   * they query the difference.
   *
   * `phase_costs` comes down from the server projection, computed from every
   * line before the withheld ones were removed. Where it is absent — the
   * office copy, or an old record — the selection computes the same figure
   * locally from the lines still present. Both count hidden lines; neither
   * sums only what is drawn.
   */
  const serverPhaseCosts = (invoice as any)?.phase_costs as Record<string, number> | undefined;
  const phaseSubtotal = (phase: string | null, fallback: number) => {
    const key = phase ?? '';
    if (serverPhaseCosts && Object.prototype.hasOwnProperty.call(serverPhaseCosts, key)) {
      return Number(serverPhaseCosts[key]) || 0;
    }
    const local = selection.phaseCost.get(key);
    return local === undefined ? fallback : local;
  };

  return (
<div className="p-8 bg-[#0A0A0A] text-white print:bg-white print:text-black print:p-0" id="invoice-content">
  {/* Company Header with Full Branding */}
  <div className="mb-8 pb-6 border-b-2 border-[#2A2A2A] print:border-gray-200">
    <div className="flex items-start justify-between mb-6">
      {/* Company Info */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-14 h-14 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {companyInfo.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white print:text-gray-900">{companyInfo.name}</h1>
            <p className="text-sm text-orange-400 print:text-orange-600 font-semibold">{companyInfo.tagline}</p>
          </div>
        </div>
        <div className="text-xs text-gray-400 print:text-gray-600 space-y-1">
          <p>{companyInfo.address.line1}{companyInfo.address.line2 ? `, ${companyInfo.address.line2}` : ''}</p>
          <p>{companyInfo.address.city}, {companyInfo.address.state} {companyInfo.address.zipCode}</p>
          <p className="flex items-center gap-3 mt-2">
            <span>{companyInfo.contact.phone}</span>
            <span>•</span>
            <span>{companyInfo.contact.email}</span>
          </p>
          <p>{companyInfo.contact.website}</p>
          <p className="mt-2 font-semibold">{companyInfo.tax.taxLabel}: {companyInfo.tax.taxId}</p>
          {companyInfo.legal.licenseNumber && (
            <p>License: {companyInfo.legal.licenseNumber}</p>
          )}
        </div>
      </div>

      {/* Invoice Title and Details */}
      <div className="text-right">
        <div className="inline-block px-8 py-4 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-xl mb-4 shadow-lg">
          <h2 className="text-3xl font-bold tracking-wider">INVOICE</h2>
        </div>
        <div className="text-sm space-y-1">
          <p className="font-bold text-lg text-white print:text-gray-900">{invoice.invoice_number}</p>
          <p className="text-gray-400 print:text-gray-600">Issue Date: {formatDate(invoice.issue_date)}</p>
          <p className="text-gray-400 print:text-gray-600">Due Date: {formatDate(invoice.due_date)}</p>
          <p className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-2 ${
            invoice.status === 'paid'
              ? 'bg-green-100 text-green-700'
              : invoice.status === 'overdue'
              ? 'bg-red-100 text-red-700'
              : 'bg-blue-100 text-blue-700'
          }`}>
            {invoice.status.toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  </div>

  {/* Bill To Section */}
  <div className="grid grid-cols-2 gap-8 mb-8">
    <div>
      <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Bill To</h3>
      <div className="text-sm">
        <p className="font-bold text-white print:text-gray-900 text-lg mb-1">{invoice.customer_name}</p>
        <p className="text-gray-400 print:text-gray-600">{invoice.customer_email}</p>
        {invoice.customer_address && (
          <p className="text-gray-400 print:text-gray-600 whitespace-pre-line">{invoice.customer_address}</p>
        )}
      </div>
    </div>
    {invoice.service_address && (
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Address of Service</h3>
        <div className="text-sm text-gray-400 print:text-gray-600 whitespace-pre-line">
          {invoice.service_address}
        </div>
      </div>
    )}
    {invoice.project_id && (
      <div>
        <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Project</h3>
        <div className="text-sm text-gray-400 print:text-gray-600">
          <p>Project ID: {invoice.project_id}</p>
        </div>
      </div>
    )}
  </div>

  {/* Line Items Table */}
  <div className="mb-8">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-xs font-bold text-gray-500 uppercase">Line Items</h3>
      {onEdit && (
        <button
          onClick={onEdit}
          className="print:hidden flex items-center gap-2 px-3 py-1.5 text-xs bg-[#1A1A1A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-gray-300 rounded-lg transition"
        >
          <Edit2 className="w-3.5 h-3.5" />
          Edit line items
        </button>
      )}
    </div>
    <table className="w-full">
      <thead>
        <tr className="bg-[#1A1A1A] print:bg-gray-100 border-b-2 border-[#2A2A2A] print:border-gray-300">
          <th className="text-left py-3 px-4 text-xs font-bold text-gray-300 print:text-gray-700 uppercase">#</th>
          <th className="text-left py-3 px-4 text-xs font-bold text-gray-300 print:text-gray-700 uppercase">Description</th>
          <th className="text-right py-3 px-4 text-xs font-bold text-gray-300 print:text-gray-700 uppercase">Qty</th>
          <th className="text-right py-3 px-4 text-xs font-bold text-gray-300 print:text-gray-700 uppercase">Unit Price</th>
          <th className="text-right py-3 px-4 text-xs font-bold text-gray-300 print:text-gray-700 uppercase">Amount</th>
        </tr>
      </thead>
      {/*
        Grouped by the phase of the job each line belongs to, with a subtotal
        per phase — "seperate the sections by the proccess".

        An invoice whose lines carry no phase produces exactly one group
        labelled "Line Items", and the phase heading row is suppressed, so it
        renders identically to the flat table this replaced. Every invoice
        raised before phases existed is in that state, and none of them should
        look different.

        Numbering runs across the whole invoice rather than restarting per
        phase: line 7 has to mean one thing when somebody rings up about it.
      */}
      {(() => {
        let n = 0;
        return phaseGroups.map((group) => (
          <tbody key={group.phase ?? '__unassigned__'}>
            {showPhaseHeadings && (
              <tr className="bg-[#141414] print:bg-gray-50">
                <td colSpan={4} className="px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-orange-400 print:text-orange-700">
                  {group.label}
                  {group.duration && (
                    <span className="ml-2 font-normal normal-case tracking-normal text-gray-500 print:text-gray-500">
                      · {group.duration}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right text-xs font-bold text-gray-400 print:text-gray-600">
                  {formatCurrency(phaseSubtotal(group.phase, group.subtotal))}
                </td>
              </tr>
            )}
            {group.lines.map((item: any, index: number) => {
              n += 1;
              return (
                <tr key={index} className="border-b border-[#2A2A2A] print:border-gray-200">
                  <td className="py-3 px-4 text-sm text-gray-400 print:text-gray-600">{n}</td>
                  <td className="py-3 px-4 text-sm text-white print:text-gray-900">
                    {item.description}
                    {/*
                      Only ever on the office copy — a line the customer was
                      not shown is not in their payload at all, so this cannot
                      render for them even if the flag were wrong.
                    */}
                    {!forCustomer && !isLineShown(item) && (
                      <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-400 print:bg-amber-50 print:text-amber-700">
                        hidden from customer
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-400 print:text-gray-600 text-right">{item.quantity}</td>
                  <td className="py-3 px-4 text-sm text-gray-400 print:text-gray-600 text-right">{formatCurrency(item.unit_price)}</td>
                  <td className="py-3 px-4 text-sm text-white print:text-gray-900 font-semibold text-right">
                    {formatCurrency(lineAmount(item))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        ));
      })()}
    </table>
  </div>

  {/* Totals Section */}
  <div className="flex justify-end mb-8">
    <div className="w-80">
      <div className="space-y-2">
        <div className="flex justify-between py-2 text-sm">
          <span className="text-gray-400 print:text-gray-600">Subtotal</span>
          <span className="font-semibold text-white print:text-gray-900">{formatCurrency(invoice.subtotal)}</span>
        </div>
        {invoice.tax_amount > 0 && (
          <div className="flex justify-between py-2 text-sm">
            <span className="text-gray-400 print:text-gray-600">Tax ({invoice.tax_rate}%)</span>
            <span className="font-semibold text-white print:text-gray-900">{formatCurrency(invoice.tax_amount)}</span>
          </div>
        )}
        {invoice.discount_amount > 0 && (
          <div className="flex justify-between py-2 text-sm">
            <span className="text-gray-400 print:text-gray-600">Discount</span>
            <span className="font-semibold text-red-600">-{formatCurrency(invoice.discount_amount)}</span>
          </div>
        )}
        <div className="flex justify-between py-3 border-t-2 border-[#2A2A2A] print:border-gray-300">
          <span className="text-lg font-bold text-white print:text-gray-900">Total</span>
          <span className="text-2xl font-bold text-orange-600">{formatCurrency(invoice.total_amount)}</span>
        </div>
        {invoice.paid_amount > 0 && (
          <>
            <div className="flex justify-between py-2 text-sm">
              <span className="text-gray-400 print:text-gray-600">Paid</span>
              <span className="font-semibold text-green-600">-{formatCurrency(invoice.paid_amount)}</span>
            </div>
            <div className="flex justify-between py-3 border-t border-[#2A2A2A] print:border-gray-300">
              <span className="text-lg font-bold text-white print:text-gray-900">Balance Due</span>
              <span className="text-2xl font-bold text-orange-600">{formatCurrency(invoice.balance_due)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  </div>

  {/* Notes Section */}
  {invoice.notes && (
    <div className="mb-6 p-4 bg-[#1A1A1A] print:bg-gray-50 rounded-lg border border-[#2A2A2A] print:border-gray-200">
      <h3 className="text-xs font-bold text-gray-400 print:text-gray-700 uppercase mb-2">Notes</h3>
      <p className="text-sm text-gray-300 print:text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
    </div>
  )}

  {/* Payment Terms */}
  {invoice.terms && (
    <div className="mb-8 p-4 bg-orange-950/30 print:bg-orange-50 rounded-lg border border-orange-800/50 print:border-orange-200">
      <h3 className="text-xs font-bold text-orange-400 print:text-orange-700 uppercase mb-2">Payment Terms & Conditions</h3>
      <p className="text-xs text-gray-300 print:text-gray-700 whitespace-pre-wrap leading-relaxed">{invoice.terms}</p>
    </div>
  )}

  {/* Banking Information */}
  {companyInfo.banking && (
    <div className="mb-8 p-4 bg-blue-950/30 print:bg-blue-50 rounded-lg border border-blue-800/50 print:border-blue-200">
      <h3 className="text-xs font-bold text-blue-400 print:text-blue-700 uppercase mb-2">Payment Information</h3>
      <div className="grid grid-cols-2 gap-4 text-xs text-gray-300 print:text-gray-700">
        <div>
          <p className="font-semibold">Bank Name</p>
          <p>{companyInfo.banking.bankName}</p>
        </div>
        <div>
          <p className="font-semibold">Account Name</p>
          <p>{companyInfo.banking.accountName}</p>
        </div>
        <div>
          <p className="font-semibold">Account Number</p>
          <p>{companyInfo.banking.accountNumber}</p>
        </div>
        <div>
          <p className="font-semibold">Routing Number</p>
          <p>{companyInfo.banking.routingNumber}</p>
        </div>
      </div>
    </div>
  )}

  {/* Footer */}
  <div className="text-center pt-8 border-t-2 border-[#2A2A2A] print:border-gray-200">
    <p className="text-sm font-semibold text-white print:text-gray-900 mb-2">Thank you for your business!</p>
    <p className="text-xs text-gray-400 print:text-gray-600">
      Questions about this invoice? Contact us at {companyInfo.contact.email} or {companyInfo.contact.phone}
    </p>
    <p className="text-xs text-gray-500 mt-2">{companyInfo.contact.website}</p>
  </div>
</div>
  );
}
