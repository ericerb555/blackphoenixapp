import { useState } from 'react';
import { Edit2 } from 'lucide-react';
import { PDFService, type InvoicePDFData } from '../../lib/services/pdfService';
import type { Invoice } from '../../lib/services/invoiceService';
import EmailInvoiceModal from './EmailInvoiceModal';
import InvoiceDocument from '../documents/InvoiceDocument';
import DocumentPreviewModal from '../documents/DocumentPreviewModal';
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
    <>
      <DocumentPreviewModal
        isOpen={isOpen}
        onClose={onClose}
        title="Invoice Preview"
        printElementId="invoice-content"
        onDownload={handleDownload}
        onEmail={handleEmail}
        actions={onEdit ? (
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
        ) : undefined}
      >
        <InvoiceDocument invoice={invoice} onEdit={onEdit} />
      </DocumentPreviewModal>

      {/*
        Outside the preview rather than inside it, because it is a second modal
        and nesting one inside the other puts it under the preview's backdrop.
      */}
      <EmailInvoiceModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        invoice={convertInvoiceToPDFData()}
        defaultEmail={(invoice as any).customer_email ?? (invoice as any).customerEmail}
      />
    </>
  );
}
