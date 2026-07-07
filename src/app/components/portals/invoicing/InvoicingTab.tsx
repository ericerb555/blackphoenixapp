import React from 'react';
import { DollarSign, FileText, CheckCircle2, AlertCircle, Search, Send, Mail, Download, Edit } from 'lucide-react';

interface InvoicingTabProps {
  weeklyInvoices: any[];
  invoiceSearch: string;
  setInvoiceSearch: (search: string) => void;
  onCreateInvoice: () => void;
  onEditInvoice: (invoice: any) => void;
  onSendInvoice: (invoice: any) => void;
  onMarkPaid: (invoice: any) => void;
  onDownloadPDF: (invoice: any) => void;
}

export default function InvoicingTab({
  weeklyInvoices,
  invoiceSearch,
  setInvoiceSearch,
  onCreateInvoice,
  onEditInvoice,
  onSendInvoice,
  onMarkPaid,
  onDownloadPDF
}: InvoicingTabProps) {
  const filteredInvoices = weeklyInvoices.filter(invoice =>
    invoice.id.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
    invoice.customer.name.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
    invoice.customer.contact.toLowerCase().includes(invoiceSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Weekly Emergency Services Invoicing</h2>
              <p className="text-gray-400">Manage and edit weekly invoices for emergency calls</p>
            </div>
          </div>
          <button 
            onClick={onCreateInvoice}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-xl text-white font-bold transition"
          >
            <FileText className="w-5 h-5" />
            Create New Invoice
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <p className="text-sm text-gray-400">Total Invoices</p>
          </div>
          <p className="text-2xl font-bold text-white">{weeklyInvoices.length}</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            <p className="text-sm text-gray-400">Total Billed</p>
          </div>
          <p className="text-2xl font-bold text-white">
            ${weeklyInvoices.reduce((sum, inv) => sum + inv.total, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <p className="text-sm text-gray-400">Paid</p>
          </div>
          <p className="text-2xl font-bold text-white">
            ${weeklyInvoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-sm text-gray-400">Outstanding</p>
          </div>
          <p className="text-2xl font-bold text-white">
            ${weeklyInvoices.filter(inv => inv.status !== 'paid').reduce((sum, inv) => sum + inv.total, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search invoices by ID, customer, or contact..."
            value={invoiceSearch}
            onChange={(e) => setInvoiceSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-green-500/50 focus:outline-none"
          />
        </div>
      </div>

      {/* Invoices List */}
      <div className="space-y-4">
        {filteredInvoices.map((invoice) => {
          const statusConfig = {
            draft: { color: 'gray', label: 'DRAFT', icon: FileText },
            sent: { color: 'blue', label: 'SENT', icon: Send },
            paid: { color: 'green', label: 'PAID', icon: CheckCircle2 },
            overdue: { color: 'red', label: 'OVERDUE', icon: AlertCircle }
          };
          const config = statusConfig[invoice.status as keyof typeof statusConfig];
          const StatusIcon = config.icon;

          return (
            <div key={invoice.id} className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-6 hover:border-green-500/30 transition">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                    <DollarSign className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white">{invoice.id}</h3>
                      <span className={`px-3 py-1 rounded-lg bg-${config.color}-500/20 text-${config.color}-400 text-xs font-bold border border-${config.color}-500/30 flex items-center gap-1`}>
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-white">{invoice.customer.name}</p>
                      <p className="text-sm text-gray-400">{invoice.customer.contact} • {invoice.customer.email}</p>
                      <p className="text-sm text-gray-400">{invoice.customer.phone}</p>
                      <p className="text-sm text-gray-400">{invoice.customer.address}</p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-green-400 mb-1">
                    ${invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-gray-400">{invoice.weekRange}</p>
                </div>
              </div>

              {/* Invoice Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-3">
                  <p className="text-xs text-gray-400 mb-1">Week #</p>
                  <p className="text-lg font-bold text-white">{invoice.weekNumber}</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-3">
                  <p className="text-xs text-gray-400 mb-1">Total Calls</p>
                  <p className="text-lg font-bold text-white">{invoice.totalCalls}</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-3">
                  <p className="text-xs text-gray-400 mb-1">Subtotal</p>
                  <p className="text-lg font-bold text-white">${invoice.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-3">
                  <p className="text-xs text-gray-400 mb-1">Tax (9%)</p>
                  <p className="text-lg font-bold text-white">${invoice.tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] p-3">
                  <p className="text-xs text-gray-400 mb-1">Due Date</p>
                  <p className="text-lg font-bold text-white">{invoice.dueDate}</p>
                </div>
              </div>

              {/* Line Items Preview */}
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-400 mb-2">Line Items ({invoice.lineItems.length}):</p>
                <div className="space-y-2">
                  {invoice.lineItems.slice(0, 3).map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs font-bold">{item.callId}</span>
                        <span className="text-sm text-gray-400">{item.date}</span>
                        <span className="text-sm text-white font-semibold">{item.description}</span>
                      </div>
                      <span className="text-sm font-bold text-white">${item.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                  {invoice.lineItems.length > 3 && (
                    <p className="text-xs text-gray-400 text-center">+ {invoice.lineItems.length - 3} more items</p>
                  )}
                </div>
              </div>

              {/* Notes */}
              {invoice.notes && (
                <div className="mb-4 p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
                  <p className="text-sm text-gray-400"><span className="font-semibold text-white">Notes:</span> {invoice.notes}</p>
                </div>
              )}

              {/* Payment Info */}
              {invoice.status === 'paid' && (
                <div className="mb-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <p className="text-sm text-green-400">
                    <span className="font-semibold">✓ Paid on {invoice.paidDate}</span>
                    {invoice.paymentMethod && ` via ${invoice.paymentMethod}`}
                  </p>
                </div>
              )}

              {invoice.status === 'sent' && (
                <div className="mb-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <p className="text-sm text-blue-400">
                    <span className="font-semibold">Sent on {invoice.sentDate}</span> • Awaiting payment
                  </p>
                </div>
              )}

              {invoice.status === 'overdue' && (
                <div className="mb-4 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                  <p className="text-sm text-red-400">
                    <span className="font-semibold">⚠️ OVERDUE</span> • Payment was due on {invoice.dueDate}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-[#2A2A2A]">
                <button
                  onClick={() => onEditInvoice(invoice)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-semibold transition"
                >
                  <FileText className="w-4 h-4" />
                  Edit Invoice
                </button>
                
                {invoice.status === 'draft' && (
                  <button
                    onClick={() => onSendInvoice(invoice)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white font-semibold transition"
                  >
                    <Send className="w-4 h-4" />
                    Send to Customer
                  </button>
                )}

                {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                  <button
                    onClick={() => onMarkPaid(invoice)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white font-semibold transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Mark as Paid
                  </button>
                )}

                <button
                  onClick={() => onDownloadPDF(invoice)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-semibold transition"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>

                <button 
                  onClick={() => onSendInvoice(invoice)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg text-white font-semibold transition"
                >
                  <Mail className="w-4 h-4" />
                  Resend Email
                </button>
              </div>

              {/* Timestamps */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#2A2A2A] text-xs text-gray-500">
                <span>Created: {invoice.createdDate}</span>
                <span>•</span>
                <span>Modified: {invoice.lastModified}</span>
                {invoice.sentDate && (
                  <>
                    <span>•</span>
                    <span>Sent: {invoice.sentDate}</span>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {filteredInvoices.length === 0 && (
          <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-12 text-center">
            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No invoices found matching your search</p>
          </div>
        )}
      </div>
    </div>
  );
}
