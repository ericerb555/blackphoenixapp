import { useState } from 'react';
import { X, Download, Mail, Printer, Edit2 } from 'lucide-react';
import { PDFService, type InvoicePDFData } from '../../lib/services/pdfService';
import type { Invoice } from '../../lib/services/invoiceService';
import EmailInvoiceModal from './EmailInvoiceModal';
import InvoiceDocument from '../documents/InvoiceDocument';
import { toast } from 'sonner@2.0.3';

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  onEdit?: () => void;
}

export default function InvoicePreviewModal({ isOpen, onClose, invoice, onEdit }: InvoicePreviewModalProps) {
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  if (!isOpen) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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
        <InvoiceDocument invoice={invoice} onEdit={onEdit} />
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
