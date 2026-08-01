import { useState } from 'react';
import { X, Download, Mail, Printer } from 'lucide-react';
import CompanyHeader from '../branding/CompanyHeader';
import { companyInfo } from '../../lib/config/companyInfo';
import { PDFService, type InvoicePDFData } from '../../lib/services/pdfService';
import type { Invoice } from '../../lib/services/invoiceService';
import EmailInvoiceModal from './EmailInvoiceModal';
import { toast } from 'sonner@2.0.3';

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
}

export default function InvoicePreviewModal({ isOpen, onClose, invoice }: InvoicePreviewModalProps) {
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  if (!isOpen) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const convertInvoiceToPDFData = (): InvoicePDFData => {
    const inv: any = invoice;
    const rawItems: any[] = inv.line_items ?? inv.items ?? [];
    return {
      invoiceNumber: inv.invoice_number ?? inv.invoiceNumber ?? '',
      date: formatDate(inv.issue_date ?? inv.date),
      dueDate: formatDate(inv.due_date ?? inv.dueDate),
      status: inv.status,
      customer: {
        name: inv.customer_name ?? inv.customerName ?? '',
        email: inv.customer_email ?? inv.customerEmail ?? '',
        phone: inv.customer_phone ?? inv.customerPhone,
        address: inv.customer_address ?? inv.customerAddress,
      },
      project: (inv.project_name ?? inv.projectName) ? {
        name: inv.project_name ?? inv.projectName,
        number: inv.project_id ?? inv.projectId ?? '',
      } : undefined,
      items: rawItems.map((item: any) => {
        const quantity = Number(item.quantity) || 0;
        const rate = Number(item.unit_price ?? item.rate) || 0;
        return {
          description: item.description ?? '',
          quantity,
          rate,
          amount: Number(item.amount) || quantity * rate,
        };
      }),
      subtotal: Number(inv.subtotal) || 0,
      tax: Number(inv.tax_amount ?? inv.tax) || 0,
      total: Number(inv.total_amount ?? inv.total) || 0,
      notes: inv.notes,
      terms: inv.terms,
    };
  };

  const handleDownload = () => {
    try {
      const pdfData = convertInvoiceToPDFData();
      PDFService.downloadInvoicePDF(pdfData);
      toast.success('PDF downloaded successfully!');
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleEmail = () => {
    setEmailModalOpen(true);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header Actions */}
        <div className="sticky top-0 bg-[#1A1A1A] border-b border-[#2A2A2A] px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-white">Invoice Preview</h2>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
            )}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-[#0A0A0A] hover:bg-[#2A2A2A] border border-[#2A2A2A] text-gray-300 rounded-lg transition"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <button
              onClick={handleEmail}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition"
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-[#2A2A2A] flex items-center justify-center transition"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Invoice Content - Print Friendly */}
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
              </div>
            </div>
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
              <tbody>
                {invoice.line_items?.map((item: any, index: number) => (
                  <tr key={index} className="border-b border-[#2A2A2A] print:border-gray-200">
                    <td className="py-3 px-4 text-sm text-gray-400 print:text-gray-600">{index + 1}</td>
                    <td className="py-3 px-4 text-sm text-white print:text-gray-900">{item.description}</td>
                    <td className="py-3 px-4 text-sm text-gray-400 print:text-gray-600 text-right">{item.quantity}</td>
                    <td className="py-3 px-4 text-sm text-gray-400 print:text-gray-600 text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="py-3 px-4 text-sm text-white print:text-gray-900 font-semibold text-right">
                      {formatCurrency(item.quantity * item.unit_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
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
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-content, #invoice-content * {
            visibility: visible;
          }
          #invoice-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>

      {/* Email Modal */}
      <EmailInvoiceModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        invoice={convertInvoiceToPDFData()}
        defaultEmail={(invoice as any).customer_email ?? (invoice as any).customerEmail}
      />
    </div>
  );
}
