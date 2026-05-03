/**
 * Invoice Viewer Component
 * 
 * Displays detailed invoice information:
 * - Invoice header with numbers and dates
 * - Line items and pricing
 * - Payment status and history
 * - Download and email options
 * - Print functionality
 */

import { useState } from 'react';
import {
  FileText, Download, Mail, Printer, X, CheckCircle, Clock,
  AlertCircle, Calendar, DollarSign, Hash, Building, User,
  CreditCard, Phone, MapPin, Tag, Package, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { DataTable } from './ui/table/DataTable';
import type { DataTableColumn } from './ui/table/DataTable';

interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxable?: boolean;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  
  // Billing info
  billTo: {
    name: string;
    company?: string;
    email: string;
    phone?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      zip: string;
    };
  };
  
  // Company info
  billFrom: {
    name: string;
    company: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
    };
  };
  
  // Line items
  lineItems: InvoiceLineItem[];
  
  // Pricing
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount?: number;
  discountReason?: string;
  total: number;
  
  // Payment info
  paymentMethod?: string;
  paidDate?: string;
  paidAmount?: number;
  
  // Additional
  notes?: string;
  terms?: string;
  subscriptionId?: string;
  subscriptionName?: string;
}

interface InvoiceViewerProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  onPayNow?: () => void;
}

export default function InvoiceViewer({
  isOpen,
  onClose,
  invoice,
  onPayNow
}: InvoiceViewerProps) {
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Invoice line items table columns
  const lineItemColumns: DataTableColumn<InvoiceLineItem>[] = [
    {
      header: 'Description',
      accessorKey: 'description',
      cell: (row) => (
        <div>
          <div className="text-white font-medium">{row.description}</div>
          {row.taxable && (
            <div className="text-xs text-gray-500 mt-1">Taxable</div>
          )}
        </div>
      ),
    },
    {
      header: 'Qty',
      accessorKey: 'quantity',
      cell: (row) => <span className="text-gray-300">{row.quantity}</span>,
      headerClassName: 'text-center',
    },
    {
      header: 'Unit Price',
      accessorKey: 'unitPrice',
      cell: (row) => <span className="text-gray-300">${row.unitPrice.toFixed(2)}</span>,
      headerClassName: 'text-right',
    },
    {
      header: 'Amount',
      accessorKey: 'amount',
      cell: (row) => <span className="text-white font-medium">${row.amount.toFixed(2)}</span>,
      headerClassName: 'text-right',
    },
  ];

  async function handleEmailInvoice() {
    setSending(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/invoices/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            invoiceId: invoice.id,
            email: invoice.billTo.email
          })
        }
      );

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Invoice sent to ${invoice.billTo.email}`);
      } else {
        toast.error('Failed to send invoice');
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
      toast.error('Failed to send invoice');
    } finally {
      setSending(false);
    }
  }

  async function handleDownloadInvoice() {
    setDownloading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-57095a78/invoices/${invoice.id}/pdf`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice-${invoice.invoiceNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Invoice downloaded');
      } else {
        toast.error('Failed to download invoice');
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    } finally {
      setDownloading(false);
    }
  }

  function handlePrintInvoice() {
    window.print();
  }

  function getStatusConfig() {
    const configs = {
      paid: {
        label: 'PAID',
        color: 'text-green-400',
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
        icon: CheckCircle
      },
      pending: {
        label: 'PENDING',
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        icon: Clock
      },
      overdue: {
        label: 'OVERDUE',
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        icon: AlertCircle
      },
      cancelled: {
        label: 'CANCELLED',
        color: 'text-gray-400',
        bg: 'bg-gray-500/10',
        border: 'border-gray-500/30',
        icon: X
      }
    };
    return configs[invoice.status];
  }

  if (!isOpen) return null;

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6 overflow-y-auto">
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#1a1a1a] border-b border-gray-800 p-6 z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-[#ea580c] to-[#c2410c] rounded-xl">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Invoice Details</h2>
                <p className="text-sm text-gray-400">Invoice #{invoice.invoiceNumber}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#2a2a2a] rounded-lg transition"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadInvoice}
              disabled={downloading}
              className="flex-1 px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] text-white rounded-lg transition flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              {downloading ? 'Downloading...' : 'Download PDF'}
            </button>
            <button
              onClick={handleEmailInvoice}
              disabled={sending}
              className="flex-1 px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] text-white rounded-lg transition flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              {sending ? 'Sending...' : 'Email Invoice'}
            </button>
            <button
              onClick={handlePrintInvoice}
              className="flex-1 px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] text-white rounded-lg transition flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            {invoice.status !== 'paid' && onPayNow && (
              <button
                onClick={onPayNow}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-[#ea580c] to-[#c2410c] hover:from-[#c2410c] hover:to-[#9a3412] text-white rounded-lg transition flex items-center justify-center gap-2 font-medium"
              >
                <CreditCard className="w-4 h-4" />
                Pay Now
              </button>
            )}
          </div>
        </div>

        {/* Invoice Content */}
        <div className="p-8 print:p-12" id="invoice-content">
          {/* Company Header */}
          <div className="flex items-start justify-between mb-8 pb-8 border-b border-gray-800">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{invoice.billFrom.company}</h1>
              <div className="text-sm text-gray-400 space-y-1">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {invoice.billFrom.address.street}
                </div>
                <div className="ml-6">
                  {invoice.billFrom.address.city}, {invoice.billFrom.address.state} {invoice.billFrom.address.zip}
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {invoice.billFrom.phone}
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {invoice.billFrom.email}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg mb-4 ${statusConfig.bg} ${statusConfig.border} border`}>
                <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
                <span className={`font-bold ${statusConfig.color}`}>{statusConfig.label}</span>
              </div>
              <div className="text-sm text-gray-400 space-y-1">
                <div className="flex items-center gap-2 justify-end">
                  <span>Invoice #</span>
                  <span className="text-white font-mono">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <Calendar className="w-4 h-4" />
                  <span>Date:</span>
                  <span className="text-white">{new Date(invoice.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <Clock className="w-4 h-4" />
                  <span>Due:</span>
                  <span className="text-white">{new Date(invoice.dueDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bill To / Subscription Info */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3">BILL TO</h3>
              <div className="bg-[#2a2a2a] border border-gray-700 rounded-lg p-4">
                <div className="text-white font-semibold mb-2">{invoice.billTo.name}</div>
                {invoice.billTo.company && (
                  <div className="text-sm text-gray-400 mb-2">{invoice.billTo.company}</div>
                )}
                {invoice.billTo.address && (
                  <div className="text-sm text-gray-400 mb-2">
                    <div>{invoice.billTo.address.street}</div>
                    <div>{invoice.billTo.address.city}, {invoice.billTo.address.state} {invoice.billTo.address.zip}</div>
                  </div>
                )}
                <div className="text-sm text-gray-400">{invoice.billTo.email}</div>
                {invoice.billTo.phone && (
                  <div className="text-sm text-gray-400">{invoice.billTo.phone}</div>
                )}
              </div>
            </div>

            {invoice.subscriptionName && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3">SUBSCRIPTION</h3>
                <div className="bg-gradient-to-br from-[#ea580c]/10 to-[#c2410c]/5 border border-[#ea580c]/20 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Package className="w-5 h-5 text-[#ea580c]" />
                    <div className="text-white font-semibold">{invoice.subscriptionName}</div>
                  </div>
                  <div className="text-sm text-gray-400">
                    Subscription payment for billing period
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">INVOICE ITEMS</h3>
            <DataTable
              columns={lineItemColumns}
              data={invoice.lineItems}
              emptyMessage="No line items"
              containerClassName="bg-[#2a2a2a] border-gray-700"
              headerClassName="border-gray-700"
              rowClassName={(_, index) => index !== invoice.lineItems.length - 1 ? 'border-b border-gray-800' : ''}
            />
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-80">
              <div className="bg-[#2a2a2a] border border-gray-700 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Subtotal</span>
                  <span className="text-white font-medium">${invoice.subtotal.toFixed(2)}</span>
                </div>
                
                {invoice.discount && invoice.discount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-400">
                      Discount {invoice.discountReason && `(${invoice.discountReason})`}
                    </span>
                    <span className="text-green-400 font-medium">-${invoice.discount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Tax ({(invoice.taxRate * 100).toFixed(1)}%)</span>
                  <span className="text-white font-medium">${invoice.taxAmount.toFixed(2)}</span>
                </div>
                
                <div className="pt-3 border-t border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-white">Total</span>
                    <span className="text-2xl font-bold text-[#ea580c]">${invoice.total.toFixed(2)}</span>
                  </div>
                </div>

                {invoice.status === 'paid' && invoice.paidAmount && (
                  <>
                    <div className="pt-3 border-t border-gray-700">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Amount Paid</span>
                        <span className="text-green-400 font-medium">${invoice.paidAmount.toFixed(2)}</span>
                      </div>
                      {invoice.paidDate && (
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-gray-500">Payment Date</span>
                          <span className="text-gray-400">{new Date(invoice.paidDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {invoice.paymentMethod && (
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-gray-500">Payment Method</span>
                          <span className="text-gray-400">{invoice.paymentMethod}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                      <span className="font-semibold text-white">Balance Due</span>
                      <span className="text-xl font-bold text-green-400">$0.00</span>
                    </div>
                  </>
                )}

                {invoice.status !== 'paid' && (
                  <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                    <span className="font-semibold text-white">Balance Due</span>
                    <span className="text-xl font-bold text-red-400">${invoice.total.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes and Terms */}
          {(invoice.notes || invoice.terms) && (
            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-800">
              {invoice.notes && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">NOTES</h3>
                  <div className="text-sm text-gray-300 whitespace-pre-wrap">{invoice.notes}</div>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">PAYMENT TERMS</h3>
                  <div className="text-sm text-gray-300 whitespace-pre-wrap">{invoice.terms}</div>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-800 text-center text-xs text-gray-500">
            <p>Thank you for your business!</p>
            <p className="mt-1">Questions? Contact us at {invoice.billFrom.email} or {invoice.billFrom.phone}</p>
          </div>
        </div>
      </div>
    </div>
  );
}